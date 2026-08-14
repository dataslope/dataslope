#!/usr/bin/env node
/**
 * Brotli-compress the incremental-cache entries in `.open-next/cache/`, in
 * place, after the OpenNext build and before the deploy populates R2.
 *
 * Why here and not in the cache override:
 *
 * All ~1,081 objects are written by the deploy-time populate step, which globs
 * `.open-next/cache/**` and streams each file to R2 byte-for-byte
 * (`getCacheAssets` in @opennextjs/cloudflare). It never calls the configured
 * `incrementalCache`. So the only place to compress the bulk of the cache is
 * the files themselves — compress them here and the populate uploads the
 * compressed bytes with no change to OpenNext at all.
 *
 * Filenames are left exactly as they are. `getCacheAssets` derives each R2 key
 * from the path and *requires* the `.cache` suffix, so renaming to `.cache.br`
 * would make the populate throw "Invalid path for a Cache Asset file". The
 * compression is recorded in the bytes (a magic prefix, see
 * lib/cache/brotliCacheFormat.ts), not in the name.
 *
 * ── Measured on this repo ───────────────────────────────────────────────────
 *
 * 2.34 GiB across 1,081 objects → ~0.14 GiB, about 17x, at quality 5. The
 * populate uploads that much less on every deploy, production and preview, and
 * R2 stores that much less for every retained build. The object *count* is
 * unchanged, so this shrinks bytes rather than round trips: it composes with
 * `--cacheChunkSize` (which raises concurrency) rather than replacing it.
 *
 * The compression itself costs build time. That cost is real and is printed
 * below on every run, so the trade stays visible rather than assumed.
 *
 * ── Safety ──────────────────────────────────────────────────────────────────
 *
 * Idempotent: an entry that already carries the magic prefix is skipped, so
 * running twice (or resuming a half-finished run) is a no-op rather than a
 * double-compression.
 *
 * Every entry is verified by decompressing it and comparing against the
 * original bytes before the file is replaced. That check is cheap next to the
 * compression, and the failure it guards against is expensive: an entry that
 * does not round-trip is a page that cannot be served, and on this deployment a
 * cache miss falls through to a re-render that touches `node:fs` and 500s. A
 * mismatch fails the build.
 *
 * Reading the compressed bytes back is lib/cache/brotliR2IncrementalCache.ts,
 * wired up in open-next.config.ts. That reader also accepts *uncompressed*
 * entries, so a deploy where this script did not run still serves — see the
 * note there.
 */
import { globSync } from "node:fs";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { brotliCompressSync, brotliDecompressSync, constants } from "node:zlib";

// Kept in sync with lib/cache/brotliCacheFormat.ts, which the Worker reads.
// Duplicated as literals here rather than imported because this script runs
// under plain Node before any TypeScript build step exists to resolve it.
const MAGIC = Uint8Array.from([0x00, 0x42, 0x52, 0x31]);
const QUALITY = 5;

const CACHE_DIR = process.argv[2] ?? join(process.cwd(), ".open-next", "cache");

const hasMagic = (buf) =>
  buf.length >= MAGIC.length && MAGIC.every((byte, i) => buf[i] === byte);

const files = globSync(join(CACHE_DIR, "**/*"), { withFileTypes: true })
  .filter((f) => f.isFile())
  .map((f) => join(f.parentPath ?? f.path, f.name));

if (files.length === 0) {
  console.error(
    `[compress-cache] no cache entries under ${CACHE_DIR}.\n` +
      "Run `npx opennextjs-cloudflare build` first. Refusing to report success " +
      "on an empty run: a silent no-op here means the deploy ships an " +
      "uncompressed cache while everything downstream reports fine.",
  );
  process.exit(1);
}

let compressed = 0;
let skipped = 0;
let bytesBefore = 0;
let bytesAfter = 0;
const started = Date.now();

for (const file of files) {
  const raw = readFileSync(file);
  bytesBefore += raw.length;

  if (hasMagic(raw)) {
    // Already done on an earlier run; leave it alone.
    skipped++;
    bytesAfter += raw.length;
    continue;
  }

  const body = brotliCompressSync(raw, {
    params: { [constants.BROTLI_PARAM_QUALITY]: QUALITY },
  });

  // Round-trip before replacing the only copy of these bytes.
  const check = brotliDecompressSync(body);
  if (!check.equals(raw)) {
    console.error(
      `[compress-cache] round-trip mismatch on ${file} — refusing to write.\n` +
        "The compressed entry does not decompress to its original bytes, which " +
        "would ship a cache entry the Worker cannot serve.",
    );
    process.exit(1);
  }

  const framed = Buffer.concat([Buffer.from(MAGIC), body]);
  writeFileSync(file, framed);
  compressed++;
  bytesAfter += framed.length;
}

const mib = (b) => (b / 1048576).toFixed(1);
const gib = (b) => (b / 1073741824).toFixed(3);
const ratio = bytesAfter > 0 ? bytesBefore / bytesAfter : 0;
const elapsed = (Date.now() - started) / 1000;

console.log(
  `[compress-cache] ${compressed} compressed, ${skipped} already done ` +
    `(${files.length} entries) — ${gib(bytesBefore)} GiB → ${gib(bytesAfter)} GiB, ` +
    `${ratio.toFixed(1)}× smaller, ${mib(bytesBefore - bytesAfter)} MiB less to upload, ` +
    `in ${elapsed.toFixed(1)}s`,
);

// A sanity floor rather than a target. These entries are repetitive JSON and
// have measured ~17x; anything under 2x means they are not what this script
// thinks they are (already-compressed input, a format change upstream), and
// the build should say so rather than quietly shipping a worse cache.
if (compressed > 0 && ratio < 2) {
  console.error(
    `[compress-cache] compression ratio ${ratio.toFixed(2)}× is far below the ` +
      "~17× these entries have measured. Something about the cache format has " +
      "changed; investigate before trusting this build.",
  );
  process.exit(1);
}

// The populate step reads exactly these files, so leave a marker of what it is
// about to upload. `statSync` on one entry is enough to prove the rewrite
// landed on disk rather than in a buffer somewhere.
if (compressed > 0) {
  const sample = files[0];
  console.log(`[compress-cache] e.g. ${sample} is now ${statSync(sample).size} bytes`);
}
