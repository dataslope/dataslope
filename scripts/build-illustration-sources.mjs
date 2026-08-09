#!/usr/bin/env node
/**
 * Record which pristine PNG in R2 each served illustration was made from.
 *
 * Writes `data/illustration-sources.json` (committed), mapping every promoted
 * `<id>-cutout.webp` to the run that produced it.
 *
 * ── Why this is written down ────────────────────────────────────────────────
 *
 * The answer is recoverable at any time — `scripts/lib/cutouts.mjs` finds it by
 * comparing pixels — but recovering it costs a download of every candidate for
 * every id, tens of minutes and a couple of gigabytes of egress. Anything that
 * needs to reason about *all* of the bucket at once therefore wants it as data,
 * not as a search: `prune-illustration-candidates.mjs` cannot decide what is
 * safe to delete without it, and a re-promote at a different quality wants to
 * know which run to pull from without guessing.
 *
 * ── Why not just take the newest run ────────────────────────────────────────
 *
 * Because it is wrong for over a third of the artwork. A redraw is generated
 * before it is judged, and plenty were never promoted, so a later run prefix
 * routinely sits on top of the art the site actually serves. Measured across
 * 284 ids, "newest run" disagreed with the pixel-verified answer for 107 of
 * them — `c-functions` serves from `2026-08-batch75` while `2026-08-unify-v1`
 * sorts later. A prune built on run recency would delete live sources.
 *
 * ── What "unresolved" means, and why it is recorded ─────────────────────────
 *
 * An id whose source cannot be identified is listed under `unresolved` with the
 * best score seen, rather than dropped. Consumers must treat those as "keep
 * everything" — the difference between "verified as superseded" and "not
 * verified" is the whole safety of the prune, and silence would erase it.
 *
 * Reads R2. Never writes to it. Byte-stable output (sorted keys, no
 * timestamps), so re-running on an unchanged bucket produces no diff.
 *
 * Usage:
 *   node scripts/build-illustration-sources.mjs [options]
 *
 * Options:
 *   --only <id[,id..]>  Resolve only these ids, keeping the rest of the file
 *   --concurrency <n>   Images in flight at once (default: 8)
 *   -h, --help          Show this help
 *
 * R2 credentials: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 * R2_BUCKET (see scripts/lib/r2.mjs).
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CANDIDATE_KEY, contentSignature, createCandidateIndex } from "./lib/cutouts.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const IMAGES_DIR = join(ROOT, "public", "images");
export const SOURCES_FILE = join(ROOT, "data", "illustration-sources.json");
const CUTOUT_SUFFIX = "-cutout";

function parseArgs(argv) {
  const opts = { only: null, concurrency: 8, help: false };
  for (let i = 0; i < argv.length; i++) {
    const next = () => argv[++i];
    switch (argv[i]) {
      case "--only": opts.only = next().split(",").map((s) => s.trim()).filter(Boolean); break;
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

/** The committed map, or an empty one. Exported for the prune script. */
export function readSources(file = SOURCES_FILE) {
  if (!existsSync(file)) return { sources: {}, unresolved: {} };
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    return { sources: parsed.sources ?? {}, unresolved: parsed.unresolved ?? {} };
  } catch {
    return { sources: {}, unresolved: {} };
  }
}

/** Sorted keys, no timestamps: re-running an unchanged bucket writes the same
 *  bytes, so this file only ever appears in a diff when something moved. */
function render({ sources, unresolved }) {
  const sortKeys = (o) =>
    Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  return `${JSON.stringify({ sources: sortKeys(sources), unresolved: sortKeys(unresolved) }, null, 2)}\n`;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) return printHelp();

  const ids = readdirSync(IMAGES_DIR)
    .filter((f) => f.endsWith(`${CUTOUT_SUFFIX}.webp`))
    .map((f) => f.slice(0, -`${CUTOUT_SUFFIX}.webp`.length))
    .filter((id) => !opts.only || opts.only.includes(id))
    .sort();
  if (!ids.length) {
    console.error("No promoted cut-outs found.");
    process.exit(1);
  }

  const index = createCandidateIndex();
  // Every candidate key, so the paired original.png can be recorded next to the
  // cut-out that identified the run — the prune reasons about whole run
  // directories, not single objects.
  const allKeys = new Set(await index.allKeys());

  // Keep entries for ids outside this run (so --only is a partial update).
  const prior = readSources();
  const sources = { ...prior.sources };
  const unresolved = { ...prior.unresolved };

  console.log(`Resolving ${ids.length} illustration(s) against ${index.describe}\n`);
  let resolved = 0;
  let missed = 0;
  let done = 0;

  async function resolveOne(id) {
    const served = readFileSync(join(IMAGES_DIR, `${id}${CUTOUT_SUFFIX}.webp`));
    // The bytes this mapping was established from. Consumers re-hash the
    // served file and refuse to act when it no longer matches — a re-promote
    // or a re-trim can move an id to a different run, and acting on a mapping
    // that predates that is how a live source gets deleted. A hash rather
    // than the file's mtime: mtime is per-clone, and the map is byte-stable
    // on purpose, so an unchanged answer never rewrites the file and its
    // timestamp would stop advancing exactly when it was relied on.
    const servedSha = createHash("sha256").update(served).digest("hex");
    const { hit, bestDb } = await index.sourceFor(id, await contentSignature(served));
    done++;
    if (!hit) {
      delete sources[id];
      unresolved[id] = { bestDb: bestDb === null ? null : Math.round(bestDb) };
      missed++;
      console.log(
        `  ? ${id.padEnd(48)} unresolved (${bestDb === null ? "no candidate in R2" : `best ${bestDb.toFixed(0)}dB`})`,
      );
      return;
    }
    const [, run, , variant] = CANDIDATE_KEY.exec(hit.key);
    const original = `illustrations/${run}/${id}/v${variant}/original.png`;
    delete unresolved[id];
    sources[id] = {
      run,
      variant: Number(variant),
      cutout: hit.key,
      // Recorded only when it exists: a few ids were promoted cut-out-only.
      ...(allKeys.has(original) ? { original } : {}),
      matchDb: Math.round(hit.db),
      servedSha,
    };
    resolved++;
    if (done % 50 === 0) console.log(`  … ${done}/${ids.length}`);
  }

  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(opts.concurrency, ids.length) }, async () => {
      while (next < ids.length) {
        const id = ids[next++];
        try {
          await resolveOne(id);
        } catch (err) {
          missed++;
          unresolved[id] = { error: err.message };
          console.error(`  ✗ ${id}: ${err.message}`);
        }
      }
    }),
  );

  mkdirSync(dirname(SOURCES_FILE), { recursive: true });
  const next_ = render({ sources, unresolved });
  const current = existsSync(SOURCES_FILE) ? readFileSync(SOURCES_FILE, "utf8") : null;
  if (next_ !== current) writeFileSync(SOURCES_FILE, next_);

  console.log(
    `\n${resolved} resolved · ${missed} unresolved` +
      `\n${Object.keys(sources).length} illustration(s) mapped in data/illustration-sources.json` +
      (next_ === current ? " (unchanged)" : ""),
  );
}

const invokedDirectly =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
