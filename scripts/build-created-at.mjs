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
// error: unknown paths simply have no date, and the galleries render "unknown"
// and sort them last. A shallow clone gives dates for whatever it has and
// nothing for the rest, which is degraded but never wrong.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { freshness } from "./lib/build-cache.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "lib", "generated", "created-at.js");

/** Suffix the background-removal step writes (scripts/remove-background-kie.mjs).
 *  The cut-out is the file the site actually serves, so its birth is the
 *  illustration's birth. */
const CUTOUT_SUFFIX = "-cutout.webp";

/**
 * Map every path git records as *added* under `pathspec` to the ISO-8601 UTC
 * timestamp of the commit that added it.
 *
 * `--reverse` puts the oldest commit first, so the first time a path appears
 * is the add we want and any later re-add (a delete-and-restore) does not
 * overwrite it. `\x01` prefixes the date lines so they are unambiguous against
 * a filename, which can contain almost anything else.
 */
function addedDates(pathspec) {
  let out;
  try {
    out = execFileSync(
      "git",
      [
        "log",
        "--reverse",
        "--diff-filter=A",
        "--format=\x01%aI",
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
      // Normalise the committer's local offset to UTC, so two dates written in
      // different timezones sort against each other correctly as strings.
      const parsed = new Date(line.slice(1));
      current = Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
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
function headCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "no-git";
  }
}

const chartFiles = present("charts", (f) => f.endsWith(".mjs") && !f.startsWith("_"));
const cutoutFiles = present("public/images", (f) => f.endsWith(CUTOUT_SUFFIX));

const cache = freshness(ROOT, "created-at", {
  inputs: [
    fileURLToPath(import.meta.url),
    ...[...chartFiles].map((f) => join(ROOT, "charts", f)),
    ...[...cutoutFiles].map((f) => join(ROOT, "public", "images", f)),
  ],
  outputs: [OUT],
  salt: headCommit(),
});
if (cache.fresh) {
  console.log("build-created-at: up to date (same commit, same files), skipping");
  process.exit(0);
}

// ── Charts: charts/<slug>.mjs ───────────────────────────────────────────────

const chartDates = addedDates("charts");
const charts = {};
for (const [path, iso] of chartDates) {
  const file = path.slice("charts/".length);
  if (!chartFiles.has(file)) continue;
  charts[file.slice(0, -".mjs".length)] = iso;
}

// ── Illustrations: public/images/<id>-cutout.webp ───────────────────────────

const cutoutDates = addedDates(`public/images/*${CUTOUT_SUFFIX}`);
const illustrations = {};
for (const [path, iso] of cutoutDates) {
  const file = path.slice("public/images/".length);
  if (!cutoutFiles.has(file)) continue;
  illustrations[file.slice(0, -CUTOUT_SUFFIX.length)] = iso;
}

// Sorted keys so the output is byte-stable between runs on one commit, which
// keeps it out of diffs and out of the way of the other generators.
const sorted = (obj) =>
  Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]]));

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  `// Generated by scripts/build-created-at.mjs. Do not edit.\n` +
    `const createdAt = ${JSON.stringify({ charts: sorted(charts), illustrations: sorted(illustrations) }, null, 0)};\n` +
    `export default createdAt;\n`,
);
cache.commit();

const missingCharts = chartFiles.size - Object.keys(charts).length;
console.log(
  `build-created-at: ${Object.keys(charts).length} chart(s), ` +
    `${Object.keys(illustrations).length} illustration(s) dated` +
    (missingCharts > 0 ? ` (${missingCharts} chart(s) not yet committed)` : ""),
);
