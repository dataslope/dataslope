#!/usr/bin/env node
/**
 * Delete the superseded illustration candidates from R2: a prompt id
 * accumulates a run prefix per redraw, and only one of them is the art the
 * site serves.
 *
 * The rule is "keep the run each served illustration was made from" — NOT
 * "keep the newest run": redraws are generated before they are judged, so a
 * later run prefix routinely sits on top of live art (wrong for ~38% of ids
 * when measured). The live run is never inferred here; it is read from
 * `data/illustration-sources.json`, which `build-illustration-sources.mjs`
 * establishes by comparing pixels. Run that first — a stale map is refused
 * rather than trusted.
 *
 * Never touched: any object under a live run; every object of an
 * `unresolved` id (not verified is not the same as not needed); every object
 * of an id absent from the map, including unserved ids
 * (`--include-unserved` opts in); anything not shaped like
 * `illustrations/<run>/<id>/v<n>/<kind>.png` (reported instead); any
 * `--keep-run` run.
 *
 * The default is a dry run; `--delete` is required to act, and R2 has no
 * undelete — for never-promoted candidates these are the only copies.
 *
 * Usage:
 *   node scripts/prune-illustration-candidates.mjs             # dry run
 *   node scripts/prune-illustration-candidates.mjs --delete
 *
 * Options:
 *   --delete              Actually delete. Without it, nothing is removed.
 *   --keep-run <id[,..]>  Never touch these runs, whatever the map says
 *   --include-unserved    Also prune ids that are in R2 but not served
 *   --limit <n>           Delete at most n objects (a cautious first pass)
 *   --concurrency <n>     Deletes in flight at once (default: 8)
 *   -h, --help            Show this help
 *
 * R2 credentials: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 * R2_BUCKET (see scripts/lib/r2.mjs).
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createR2Client, credentialsFromEnv } from "./lib/r2.mjs";
import { CANDIDATE_KEY } from "./lib/cutouts.mjs";
import { readSources, SOURCES_FILE } from "./build-illustration-sources.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const gb = (n) => `${(n / 1e9).toFixed(2)} GB`;
const IMAGES_DIR = join(ROOT, "public", "images");
const CUTOUT_SUFFIX = "-cutout";

function parseArgs(argv) {
  const opts = {
    delete: false,
    keepRuns: [],
    includeUnserved: false,
    limit: Infinity,
    concurrency: 8,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const next = () => argv[++i];
    switch (argv[i]) {
      case "--delete": opts.delete = true; break;
      case "--keep-run": opts.keepRuns.push(...next().split(",").map((s) => s.trim()).filter(Boolean)); break;
      case "--include-unserved": opts.includeUnserved = true; break;
      case "--limit": opts.limit = Math.max(0, Number(next()) || 0); break;
      case "--concurrency": opts.concurrency = Math.max(1, Number(next()) || 8); break;
      case "-h":
      case "--help": opts.help = true; break;
      default: console.error(`Unknown argument: ${argv[i]}`); process.exit(1);
    }
  }
  return opts;
}

function printHelp() {
  const src = readFileSync(fileURLToPath(import.meta.url), "utf8");
  console.log(
    src.slice(src.indexOf("/**"), src.indexOf("*/") + 2)
      .replace(/^\/\*\*?|\*\/$|^ \* ?/gm, "")
      .trim(),
  );
}

/**
 * Refuse a map that no longer describes the images on disk. A mapping is a
 * statement about specific bytes, and re-promoting or re-trimming can
 * silently invalidate it — the failure mode is deleting a live source. Each
 * entry carries the sha256 of the file it was established from, and every one
 * is re-checked here (mtime cannot be used: the map is byte-stable, so its
 * timestamp never advances).
 */
function assertMapIsCurrent(sources) {
  if (!existsSync(SOURCES_FILE)) {
    console.error(
      `No ${SOURCES_FILE.replace(`${ROOT}/`, "")}. Run:\n` +
        "  node scripts/build-illustration-sources.mjs",
    );
    process.exit(1);
  }
  const stale = [];
  for (const [id, entry] of Object.entries(sources)) {
    const file = join(IMAGES_DIR, `${id}${CUTOUT_SUFFIX}.webp`);
    if (!existsSync(file)) { stale.push(`${id} (no longer promoted)`); continue; }
    if (!entry.servedSha) { stale.push(`${id} (mapped before hashes were recorded)`); continue; }
    const sha = createHash("sha256").update(readFileSync(file)).digest("hex");
    if (sha !== entry.servedSha) stale.push(`${id} (bytes changed)`);
  }
  if (stale.length) {
    console.error(
      `${stale.length} mapping(s) no longer match the file on disk ` +
        `(e.g. ${stale.slice(0, 3).join(", ")}).\n` +
        "Deleting on a stale map is how a live source is lost. Re-run:\n" +
        `  node scripts/build-illustration-sources.mjs --only ${stale.slice(0, 3).map((s) => s.split(" ")[0]).join(",")}`,
    );
    process.exit(1);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) return printHelp();

  const { sources, unresolved } = readSources();
  assertMapIsCurrent(sources);
  const keepRuns = new Set(opts.keepRuns);

  const served = new Set(
    readdirSync(IMAGES_DIR)
      .filter((f) => f.endsWith(".webp"))
      .map((f) => f.replace(/\.webp$/, "").replace(/-cutout$/, "")),
  );

  const client = createR2Client(credentialsFromEnv());
  // Detailed listing: the same requests carry each object's size, so the dry
  // run can weigh what it is proposing instead of only counting it.
  const objects = await client.listDetailed("illustrations/");
  const sizeOf = new Map(objects.map((o) => [o.key, o.size]));
  const keys = objects.map((o) => o.key);
  console.log(
    `${keys.length} object(s), ${gb(objects.reduce((n, o) => n + o.size, 0))}, ` +
      `under illustrations/ in r2://${client.bucket}\n` +
      `${Object.keys(sources).length} id(s) with a verified live run, ` +
      `${Object.keys(unresolved).length} unresolved\n`,
  );

  const doomed = [];
  const kept = { live: 0, unresolved: 0, unmapped: 0, keepRun: 0, unrecognised: 0 };
  const unrecognised = [];

  for (const key of keys) {
    const m = CANDIDATE_KEY.exec(key);
    if (!m) {
      kept.unrecognised++;
      unrecognised.push(key);
      continue;
    }
    const [, run, id] = m;
    if (keepRuns.has(run)) { kept.keepRun++; continue; }
    if (unresolved[id]) { kept.unresolved++; continue; }

    const source = sources[id];
    if (!source) {
      // Not in the map at all. Either an id R2 knows and the site does not, or
      // one the resolver never saw; both mean "no evidence", so both are kept
      // unless the caller opts in for the unserved case.
      if (!served.has(id) && opts.includeUnserved) doomed.push(key);
      else kept.unmapped++;
      continue;
    }
    if (run === source.run) { kept.live++; continue; }
    doomed.push(key);
  }

  const byRun = new Map();
  for (const key of doomed) {
    const run = CANDIDATE_KEY.exec(key)[1];
    const at = byRun.get(run) ?? { n: 0, bytes: 0 };
    at.n++;
    at.bytes += sizeOf.get(key) ?? 0;
    byRun.set(run, at);
  }
  const doomedBytes = doomed.reduce((n, k) => n + (sizeOf.get(k) ?? 0), 0);

  console.log("kept:");
  console.log(`  ${kept.live} object(s) in a live run`);
  console.log(`  ${kept.unresolved} in an id whose source could not be verified`);
  console.log(`  ${kept.unmapped} in an id absent from the map${opts.includeUnserved ? "" : " (incl. ids not served)"}`);
  if (kept.keepRun) console.log(`  ${kept.keepRun} in a --keep-run run`);
  if (kept.unrecognised) {
    console.log(`  ${kept.unrecognised} not shaped like a candidate:`);
    for (const k of unrecognised.slice(0, 5)) console.log(`      ${k}`);
  }

  console.log(`\nsuperseded, by run:`);
  for (const [run, at] of [...byRun].sort((a, b) => b[1].bytes - a[1].bytes)) {
    console.log(`  ${String(at.n).padStart(5)}  ${gb(at.bytes).padStart(8)}  ${run}`);
  }
  console.log(`\n${doomed.length} object(s), ${gb(doomedBytes)}, would be deleted.`);

  if (!opts.delete) {
    console.log(
      "\nDry run — nothing was deleted. Re-run with --delete to remove them.\n" +
        "R2 has no undelete: for candidates that were never promoted, these are " +
        "the only copies.",
    );
    return;
  }

  const targets = doomed.slice(0, opts.limit);
  if (targets.length < doomed.length) {
    console.log(`\n--limit ${opts.limit}: deleting the first ${targets.length}.`);
  }
  console.log(`\nDeleting ${targets.length} object(s)…`);

  let removed = 0;
  let failed = 0;
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(opts.concurrency, targets.length) }, async () => {
      while (next < targets.length) {
        const key = targets[next++];
        try {
          await client.delete(key);
          removed++;
          if (removed % 100 === 0) console.log(`  … ${removed}/${targets.length}`);
        } catch (err) {
          failed++;
          console.error(`  ✗ ${key}: ${err.message}`);
        }
      }
    }),
  );
  console.log(`\n${removed} deleted · ${failed} failed`);
  if (failed) process.exitCode = 1;
}

const invokedDirectly =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
