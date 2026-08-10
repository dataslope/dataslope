// Records when each chart spec and each illustration first entered the
// repository, so the two admin review galleries can show a creation date and
// sort by it.
//
// ── Why git, and not the filesystem ─────────────────────────────────────────
//
// `stat` is not an answer here. A clone writes every file at clone time, so
// mtime and birthtime on a CI runner are all within a second of each other and
// say nothing about when the work was done. The commit that *added* the file
// is the only durable record, it is identical for everyone who clones, and it
// is what a person means by "when was this chart made?".
//
// ── Why a generated module, and not a request-time lookup ───────────────────
//
// Both galleries are served from a Cloudflare Worker, which has neither a
// filesystem nor a git binary. The dates therefore have to be baked in at
// build time, the same way the chart SVG and the search index are.
//
// ── Why the git answer is not enough on its own ─────────────────────────────
//
// Production is built by Cloudflare Workers Builds, which clones **shallow**.
// A shallow clone's oldest commit has had its parents cut off, so git reports
// it as a root commit — and a root commit's diff is its whole tree. Every file
// in it therefore looks *added* there, and the whole gallery came out stamped
// with the date of one commit: at depth 1, the commit being deployed. The
// symptom was every illustration claiming it was created today, changing on
// every deploy, and it is invisible locally because a development clone has
// the history to answer properly.
//
// So two things happen below. Additions attributed to a **shallow-boundary
// commit are dropped** — that commit is where the clone's knowledge stops, not
// where the file was born, and no date is far better than a wrong one. And the
// dates git *can* prove are kept in a committed snapshot,
// `data/created-at.json`, which is what a shallow build reads instead. The
// snapshot is refreshed automatically by any run with complete history (a
// development clone, `fetch-depth: 0` in CI), so it stays current by being a
// build output rather than something to maintain by hand.
//
// ── Cost ────────────────────────────────────────────────────────────────────
//
// Two `git log` passes, scoped by pathspec. That scoping is load-bearing:
// `-- public/images` (the whole directory, ~2000 files) takes about 15s
// because git has to walk the full history, while `-- 'public/images/
// *-cutout.webp'` takes 0.7s and `-- charts` takes 10ms, since a narrow
// pathspec lets git prune commits with its path bloom filters. Do not widen
// these globs without re-timing them.
//
// A missing `.git` (a tarball, a vendored copy) or a shallow clone is not an
// error: whatever neither git nor the snapshot can date simply has no date,
// and the galleries render "unknown" and sort them last.
//
// This paragraph used to end "a shallow clone gives dates for whatever it has
// and nothing for the rest, which is degraded but never wrong", and that
// sentence was the bug. A shallow clone does not fall silent about the history
// it lacks; it reports its horizon commit as the birth of everything in it.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { freshness } from "./lib/build-cache.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "lib", "generated", "created-at.js");
/** The committed record of what git has already been able to prove, and the
 *  only source a shallow build has. Written by this script; never by hand. */
const SNAPSHOT = join(ROOT, "data", "created-at.json");

/** Suffix the background-removal step writes (scripts/remove-background-kie.mjs).
 *  The cut-out is the file the site actually serves, so its birth is the
 *  illustration's birth. */
const CUTOUT_SUFFIX = "-cutout.webp";

/** One `git` invocation, trimmed; "" when git or the repository is missing. */
function git(args) {
  try {
    return execFileSync("git", args, {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

/** True when this clone's history has been cut short. */
const isShallow = () => git(["rev-parse", "--is-shallow-repository"]) === "true";

/**
 * The commits sitting on a shallow clone's horizon.
 *
 * git presents them as parentless, so their diff is their entire tree and
 * every file in it is reported as an addition. Those are not creations, they
 * are the edge of what was cloned, and taking them at face value is what
 * stamped the whole gallery with one date. A full clone has none.
 */
function horizonCommits() {
  if (!isShallow()) return new Set();
  // `.git/shallow` lists them exactly. --git-path resolves it for a worktree
  // or a separate git dir, where `.git` is a file rather than a directory.
  const path = git(["rev-parse", "--git-path", "shallow"]);
  if (path) {
    try {
      const shas = readFileSync(resolve(ROOT, path), "utf8").split("\n").filter(Boolean);
      if (shas.length) return new Set(shas);
    } catch {
      // Fall through: unreadable is not a reason to trust the boundary.
    }
  }
  // In a shallow clone, "parentless" and "grafted" are the same set, so this
  // is a safe fallback when the file cannot be read.
  return new Set(git(["rev-list", "--max-parents=0", "HEAD"]).split("\n").filter(Boolean));
}

/**
 * Map every path git records as *added* under `pathspec` to the ISO-8601 UTC
 * timestamp of the commit that added it, skipping any addition attributed to a
 * commit in `horizon`.
 *
 * `--reverse` puts the oldest commit first, so the first time a path appears
 * is the add we want and any later re-add (a delete-and-restore) does not
 * overwrite it. `\x01` prefixes the header lines so they are unambiguous
 * against a filename, which can contain almost anything else.
 */
function addedDates(pathspec, horizon) {
  let out;
  try {
    out = execFileSync(
      "git",
      [
        "log",
        "--reverse",
        "--diff-filter=A",
        "--format=\x01%H %aI",
        "--name-only",
        "--",
        pathspec,
      ],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] },
    );
  } catch {
    // No git, no repository, or no history: every path stays unknown.
    return new Map();
  }

  const dates = new Map();
  let current = null;
  for (const line of out.split("\n")) {
    if (line.startsWith("\x01")) {
      const [sha, iso] = line.slice(1).split(" ");
      // Normalise the committer's local offset to UTC, so two dates written in
      // different timezones sort against each other correctly as strings.
      const parsed = new Date(iso);
      current =
        horizon.has(sha) || Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
      continue;
    }
    if (!line || !current) continue;
    if (!dates.has(line)) dates.set(line, current);
  }
  return dates;
}

/** Files that exist *now*, so a path deleted since it was added does not leave
 *  a stale entry behind. */
function present(dir, filter) {
  try {
    return new Set(readdirSync(join(ROOT, dir)).filter(filter));
  } catch {
    return new Set();
  }
}

// ── Freshness ───────────────────────────────────────────────────────────────
//
// Unlike the other generators, this one's answer is a function of *history*,
// not of file contents: committing an unchanged file gives it a date it did not
// have. So the gate keys on the set of dated files plus `HEAD` — dates cannot
// move while HEAD is still. `git log` over ~2000 paths is the work being
// skipped, which is 2 seconds on a cold object store.
//
// A dirty tree is not a problem: an uncommitted file has no add-commit and is
// therefore undated whether this runs or not, and the commit that finally dates
// it moves HEAD.
//
// The salt also carries how much history this clone has, because that changes
// the answer at a fixed HEAD: the same commit read shallow and read whole give
// different dates, and only the second one is right.
function headCommit() {
  return git(["rev-parse", "HEAD"]) || "no-git";
}

const shallow = isShallow();
const chartFiles = present("charts", (f) => f.endsWith(".mjs") && !f.startsWith("_"));
const cutoutFiles = present("public/images", (f) => f.endsWith(CUTOUT_SUFFIX));

const cache = freshness(ROOT, "created-at", {
  inputs: [
    fileURLToPath(import.meta.url),
    SNAPSHOT,
    ...[...chartFiles].map((f) => join(ROOT, "charts", f)),
    ...[...cutoutFiles].map((f) => join(ROOT, "public", "images", f)),
  ],
  outputs: [OUT],
  salt: `${headCommit()}:${shallow ? "shallow" : "full"}`,
});
if (cache.fresh) {
  console.log("build-created-at: up to date (same commit, same files), skipping");
  process.exit(0);
}

/** The committed snapshot, or empty when it has not been written yet. */
function readSnapshot() {
  try {
    const raw = JSON.parse(readFileSync(SNAPSHOT, "utf8"));
    return {
      charts: raw.charts ?? {},
      illustrations: raw.illustrations ?? {},
    };
  } catch {
    return { charts: {}, illustrations: {} };
  }
}

/**
 * Fold what git proved into what was already on record, keyed by the files
 * that exist now.
 *
 * The **earlier** of the two wins where both know a key. They normally agree;
 * they differ when a file was deleted and later restored across a shallow
 * clone's horizon, and "created" means the first time, which is the date the
 * snapshot is holding.
 */
function merge(gitDates, recorded, presentKeys) {
  const out = {};
  for (const key of presentKeys) {
    const candidates = [gitDates[key], recorded[key]].filter(Boolean).sort();
    if (candidates.length) out[key] = candidates[0];
  }
  return out;
}

const horizon = horizonCommits();

// ── Charts: charts/<slug>.mjs ───────────────────────────────────────────────

const chartDates = {};
for (const [path, iso] of addedDates("charts", horizon)) {
  const file = path.slice("charts/".length);
  if (chartFiles.has(file)) chartDates[file.slice(0, -".mjs".length)] = iso;
}

// ── Illustrations: public/images/<id>-cutout.webp ───────────────────────────

const cutoutDates = {};
for (const [path, iso] of addedDates(`public/images/*${CUTOUT_SUFFIX}`, horizon)) {
  const file = path.slice("public/images/".length);
  if (cutoutFiles.has(file)) {
    cutoutDates[file.slice(0, -CUTOUT_SUFFIX.length)] = iso;
  }
}

const snapshot = readSnapshot();
const charts = merge(
  chartDates,
  snapshot.charts,
  [...chartFiles].map((f) => f.slice(0, -".mjs".length)),
);
const illustrations = merge(
  cutoutDates,
  snapshot.illustrations,
  [...cutoutFiles].map((f) => f.slice(0, -CUTOUT_SUFFIX.length)),
);

// Sorted keys so the output is byte-stable between runs on one commit, which
// keeps it out of diffs and out of the way of the other generators.
const sorted = (obj) =>
  Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]]));

// ── The snapshot ────────────────────────────────────────────────────────────
//
// Refreshed only from a clone that has the whole history, because only that
// run can tell "this file has no add-commit" from "this clone cannot see the
// add-commit". A shallow build reads the file and never writes it, so a
// production deploy can neither lose a date nor invent one.
//
// Written only when it would change, so the common case leaves the working
// tree clean and this stays out of every diff.
if (!shallow) {
  const next =
    JSON.stringify(
      { charts: sorted(charts), illustrations: sorted(illustrations) },
      null,
      2,
    ) + "\n";
  let current = "";
  try {
    current = readFileSync(SNAPSHOT, "utf8");
  } catch {
    // Not written yet.
  }
  if (next !== current) {
    writeFileSync(SNAPSHOT, next);
    console.log(`build-created-at: refreshed ${SNAPSHOT.slice(ROOT.length + 1)} (commit it)`);
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  `// Generated by scripts/build-created-at.mjs. Do not edit.\n` +
    `const createdAt = ${JSON.stringify({ charts: sorted(charts), illustrations: sorted(illustrations) }, null, 0)};\n` +
    `export default createdAt;\n`,
);
cache.commit();

const undated =
  chartFiles.size -
  Object.keys(charts).length +
  (cutoutFiles.size - Object.keys(illustrations).length);
console.log(
  `build-created-at: ${Object.keys(charts).length} chart(s), ` +
    `${Object.keys(illustrations).length} illustration(s) dated` +
    // Undated is normal for something added since the snapshot was last
    // refreshed. It is worth naming the shallow case, because that is the one
    // where the dates are missing rather than absent.
    (undated > 0
      ? ` (${undated} file(s) undated: ${shallow ? "shallow clone, and not in the snapshot" : "not yet committed"})`
      : ""),
);
