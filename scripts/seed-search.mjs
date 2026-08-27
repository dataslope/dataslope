#!/usr/bin/env node
/**
 * Apply `lib/generated/search-seed.sql` to the search database, but only when
 * the indexed content actually changed: re-seeding rewrites every row, FTS5
 * shadow tables multiply the count, and D1 meters deletes as writes — roughly
 * 40k written rows per deploy for nothing when no lesson changed.
 *
 *   npm run db:seed:search           # local miniflare D1
 *   npm run db:seed:search:remote    # the real database
 *   node scripts/seed-search.mjs --remote --force   # re-seed regardless
 *
 * The comparison is a corpus hash carried in the seed file and echoed into
 * `docs_meta.content_hash` by the seed itself — written last, so a partial
 * apply cannot leave a hash claiming to be current. Any uncertainty seeds: a
 * redundant seed costs some rows, a wrongly skipped one leaves search stale.
 *
 * The apply itself retries a resetting D1 (see `retryReason`), because this
 * runs last in the production deploy command and a reset there fails the whole
 * build after the Worker has already shipped.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SEED_FILE = join(ROOT, "lib", "generated", "search-seed.sql");
const DB_NAME = "dataslope-search";

const args = new Set(process.argv.slice(2));
const remote = args.has("--remote");
const force = args.has("--force");
const target = remote ? "--remote" : "--local";

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

// ── Applying the seed ────────────────────────────────────────────────────────

/** Failures that mean "the Durable Object behind the database went away", which
 *  D1 surfaces on an internal error, a D1 code update, an overloaded or
 *  unreachable node, or a write that ran too long. `D1_RESET_DO` is the raw
 *  code the remote import path returns for the family. */
const D1_RETRYABLE = [
  "d1_reset_do",
  "was reset",
  "caused object to be reset",
  "is overloaded",
  "transient issue on remote node",
  "network connection lost",
  "client disconnected",
];

/** Checked first, and never retried: these fail identically every attempt and
 *  want a person — more space, a plan change, or tomorrow. */
const D1_FATAL = [
  "exceeded maximum db size",
  "daily row read limit",
  "daily row write limit",
];

const APPLY_ATTEMPTS = 3;

/**
 * Why a failed apply is worth another attempt, or null to give up now.
 *
 * Retrying is safe rather than merely hopeful: the remote import is atomic, and
 * wrangler says so on the way in — "if the execution fails to complete, your DB
 * will return to its original state and you can safely retry." Even a
 * hypothetical partial apply is covered, because the content hash is the seed's
 * last statement, so the next run still sees a mismatch and re-seeds.
 *
 * D1's own automatic retries do not cover this. It retries read-only queries
 * only; anything that writes is never retried, which an import plainly is.
 */
function retryReason(output) {
  const text = String(output ?? "").toLowerCase();
  if (D1_FATAL.some((phrase) => text.includes(phrase))) return null;
  return D1_RETRYABLE.find((phrase) => text.includes(phrase)) ?? null;
}

/** Node has no synchronous sleep and this script is synchronous throughout
 *  (`execFileSync`); waiting on a throwaway shared buffer blocks without
 *  turning the whole file async for one pause between attempts. */
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** One `d1 execute --file` run, returning whatever it printed. */
function runSeedFile() {
  return execFileSync(
    "npx",
    ["wrangler", "d1", "execute", DB_NAME, target, "-y", `--file=${relative(ROOT, SEED_FILE)}`],
    {
      cwd: ROOT,
      encoding: "utf8",
      // Both streams captured rather than inherited: the retry decision is in
      // wrangler's stderr, and `execFileSync` only exposes that when it is
      // piped. Everything captured gets printed either way, so the build log
      // still shows the apply. Capturing stderr also means it now counts
      // against maxBuffer, hence the raised ceiling — the default 1 MB
      // overflowing would kill a working seed.
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

/** Apply the seed, retrying a resetting D1. Throws the last failure otherwise. */
function applySeed({ run = runSeedFile, sleep = sleepSync } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      process.stdout.write(run() ?? "");
      return;
    } catch (err) {
      const output = `${err.stdout ?? ""}${err.stderr ?? ""}`;
      process.stdout.write(output);
      const reason = retryReason(output);
      if (!reason || attempt >= APPLY_ATTEMPTS) {
        if (reason) {
          console.error(
            `[seed-search] still resetting after ${APPLY_ATTEMPTS} attempts. The import rolled back, ` +
              "so the index holds the previous corpus and the next deploy retries it. If this keeps " +
              "recurring the seed is probably too large to apply in one import and wants sharding — " +
              "see DEVELOPMENT.md, Search.",
          );
        }
        throw err;
      }
      // 5s, 10s: long enough for a Durable Object to come back, short enough
      // not to stall a deploy that is genuinely broken.
      const waitMs = 5_000 * attempt;
      console.error(
        `  … d1 execute failed (${reason}); retry ${attempt}/${APPLY_ATTEMPTS - 1} in ${waitMs / 1000}s`,
      );
      sleep(waitMs);
    }
  }
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function main() {
  if (!existsSync(SEED_FILE)) {
    console.error(
      "[seed-search] no lib/generated/search-seed.sql; run `npm run build:search-corpus` first",
    );
    process.exit(1);
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
      return;
    }
    console.log(
      `[seed-search] content changed (${current ? `${current.slice(0, 12)}…` : "no hash on record"}` +
        ` → ${local.slice(0, 12)}…), seeding`,
    );
  } else {
    console.log(`[seed-search] --force, seeding ${local.slice(0, 12)}… unconditionally`);
  }

  applySeed();
  console.log(`[seed-search] seeded ${DB_NAME} ${target}`);
}

/** Exposed for `__tests__/seedSearchRetry.test.ts`, which pins both halves of
 *  the retry contract. */
export const __testing = { applySeed, retryReason, APPLY_ATTEMPTS };

// Only drive the CLI when executed directly: the vitest suite imports
// `__testing`, and that import must not seed a database.
const invokedDirectly =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) main();
