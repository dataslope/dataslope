#!/usr/bin/env node
/**
 * Apply `lib/generated/search-seed.sql` to the search database, but only when
 * the indexed content actually changed.
 *
 * Used as the deploy-time seed step:
 *
 *   npm run db:seed:search           # local miniflare D1
 *   npm run db:seed:search:remote    # the real database
 *   node scripts/seed-search.mjs --remote --force   # re-seed regardless
 *
 * ── Why gate it ────────────────────────────────────────────────────────────
 *
 * Re-seeding is a `DELETE` of every row followed by a re-`INSERT` of every row,
 * and on an FTS5 table those rows are not the ~9k logical ones: the shadow
 * tables hold ~20k, and D1 meters deletes as writes too. So an unconditional
 * seed spends roughly 40k written rows on every deploy, including the many
 * deploys that touch a component or a stylesheet and no lesson at all. Skipping
 * those also removes a pointless failure surface from the deploy path.
 *
 * The comparison is a hash of the corpus, carried in the seed file and echoed
 * into `docs_meta.content_hash` by the seed itself. Because the seed writes the
 * hash last, a partial or failed apply cannot leave a hash claiming to be
 * current, so the next deploy retries instead of skipping.
 *
 * Any uncertainty seeds. If the remote hash cannot be read — first ever deploy,
 * an empty table, a transport error — the seed runs. A redundant seed costs
 * some written rows; a wrongly skipped one leaves the site searching stale
 * content, and only one of those is worth defaulting to.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SEED_FILE = join(ROOT, "lib", "generated", "search-seed.sql");
const DB_NAME = "dataslope-search";

const args = new Set(process.argv.slice(2));
const remote = args.has("--remote");
const force = args.has("--force");
const target = remote ? "--remote" : "--local";

if (!existsSync(SEED_FILE)) {
  console.error(
    "[seed-search] no lib/generated/search-seed.sql; run `npm run build:search-corpus` first",
  );
  process.exit(1);
}

/** The hash of the seed we are holding, read from the file we would apply. */
function localHash() {
  // The marker is on the third line; read a slice rather than the whole 12 MB.
  const head = readFileSync(SEED_FILE, "utf8").slice(0, 512);
  return head.match(/^-- content-hash: ([0-9a-f]{64})$/m)?.[1] ?? null;
}

function wrangler(extra, { quiet = false } = {}) {
  return execFileSync(
    "npx",
    ["wrangler", "d1", "execute", DB_NAME, target, "-y", ...extra],
    { cwd: ROOT, encoding: "utf8", stdio: quiet ? "pipe" : ["ignore", "pipe", "inherit"] },
  );
}

/** The hash the database believes it holds, or null if it cannot be read. */
function remoteHash() {
  let out;
  try {
    out = wrangler(
      ["--json", "--command", "SELECT value FROM docs_meta WHERE key = 'content_hash'"],
      { quiet: true },
    );
  } catch {
    return null; // unseeded, unreachable, or no docs_meta yet — all mean "seed".
  }
  try {
    // `--json` still prints wrangler's banner on some versions, so parse from
    // the first bracket rather than trusting the whole stream to be JSON.
    const start = out.indexOf("[");
    if (start < 0) return null;
    const parsed = JSON.parse(out.slice(start));
    const results = (Array.isArray(parsed) ? parsed : [parsed]).flatMap((r) => r?.results ?? []);
    return results[0]?.value ?? null;
  } catch {
    return null;
  }
}

const local = localHash();
if (!local) {
  console.error("[seed-search] seed file carries no content-hash marker; regenerate it");
  process.exit(1);
}

if (!force) {
  const current = remoteHash();
  if (current && current === local) {
    console.log(
      `[seed-search] ${DB_NAME} ${target} already holds ${local.slice(0, 12)}…, nothing to seed`,
    );
    process.exit(0);
  }
  console.log(
    `[seed-search] content changed (${current ? `${current.slice(0, 12)}…` : "no hash on record"}` +
      ` → ${local.slice(0, 12)}…), seeding`,
  );
} else {
  console.log(`[seed-search] --force, seeding ${local.slice(0, 12)}… unconditionally`);
}

wrangler([`--file=${relative(ROOT, SEED_FILE)}`]);
console.log(`[seed-search] seeded ${DB_NAME} ${target}`);
