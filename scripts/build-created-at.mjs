// Records when each chart spec and each illustration first entered the
// repository, so the admin review galleries can show and sort by creation
// date. Dates come from the commit that *added* the file (mtimes are
// clone-time noise), baked into a generated module because the Worker has
// neither a filesystem nor git.
//
// Production clones shallow, and git reports a shallow clone's horizon commit
// as a root commit whose diff is its whole tree — every file looks *added*
// there. So additions attributed to a shallow-boundary commit are dropped (no
// date beats a wrong one), and the dates git can prove are kept in a
// committed snapshot, data/created-at.json, which shallow builds read.
// The snapshot is refreshed by any run with complete history.
//
// Cost is two `git log` passes scoped by pathspec, and the scoping is
// load-bearing: `-- public/images` takes ~15s while the narrow cutout glob
// takes 0.7s (path bloom filters). Do not widen these globs without
// re-timing. A missing `.git` is not an error: undated files render
// "unknown" and sort last.
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

/** Suffix the generated transparent artwork carries (written by
 *  scripts/generate-illustrations.mjs, promoted by promote-illustrations.mjs).
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
 * The commits sitting on a shallow clone's horizon: git presents them as
 * parentless, so every file in them is reported as an addition. A full clone
 * has none.
 */
function horizonCommits() {
  if (!isShallow()) return new Set();
  // `.git/shallow` lists them exactly; --git-path resolves it for worktrees
  // and separate git dirs.
  const path = git(["rev-parse", "--git-path", "shallow"]);
  if (path) {
    try {
      const shas = readFileSync(resolve(ROOT, path), "utf8").split("\n").filter(Boolean);
      if (shas.length) return new Set(shas);
    } catch {
      // Fall through: unreadable is not a reason to trust the boundary.
    }
  }
  // In a shallow clone "parentless" and "grafted" are the same set.
  return new Set(git(["rev-list", "--max-parents=0", "HEAD"]).split("\n").filter(Boolean));
}

/**
 * Map every path git records as *added* under `pathspec` to the ISO-8601 UTC
 * timestamp of the adding commit, skipping commits in `horizon`. `--reverse`
 * makes the first appearance win so a delete-and-restore does not overwrite
 * it; `\x01` makes header lines unambiguous against filenames.
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
      // Normalise to UTC so dates from different timezones sort as strings.
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
// This generator's answer is a function of *history*, not file contents, so
// the gate keys on the set of dated files plus HEAD — dates cannot move while
// HEAD is still. The salt also carries shallow/full, because the same HEAD
// read shallow and read whole give different answers.
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
 * Slugs that have been renamed, keyed by their current name. `--diff-filter=A`
 * reports a rename as an addition at the rename commit (`--follow` is
 * single-path only), so a renamed chart would lose its provenance. An entry
 * only has to survive one build: `merge` writes the recovered date into the
 * snapshot under the new key.
 */
const RENAMED_FROM = {
  "color-category-limit": "colour-category-limit",
  "color-scale-families": "colour-scale-families",
  "emphasis-one-color": "emphasis-one-colour",
  "groups-by-color-one-panel": "groups-by-colour-one-panel",
};

/** Earliest date any source can prove for each key. A former name is consulted
 *  too, because a rename is not a birth. */
function merge(gitDates, recorded, presentKeys, formerName = () => undefined) {
  const out = {};
  for (const key of presentKeys) {
    const former = formerName(key);
    const candidates = [
      gitDates[key],
      recorded[key],
      former ? recorded[former] : undefined,
    ]
      .filter(Boolean)
      .sort();
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
  (slug) => RENAMED_FROM[slug],
);
const illustrations = merge(
  cutoutDates,
  snapshot.illustrations,
  [...cutoutFiles].map((f) => f.slice(0, -CUTOUT_SUFFIX.length)),
);

// Sorted keys so the output is byte-stable between runs on one commit.
const sorted = (obj) =>
  Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]]));

// ── The snapshot ────────────────────────────────────────────────────────────
//
// Refreshed only from a full-history clone — only that run can tell "no
// add-commit" from "cannot see the add-commit". Shallow builds read, never
// write. Written only when it would change, so the tree stays clean.
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
    // Undated is normal for new files; the shallow case is named because
    // there the dates are missing rather than absent.
    (undated > 0
      ? ` (${undated} file(s) undated: ${shallow ? "shallow clone, and not in the snapshot" : "not yet committed"})`
      : ""),
);
