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
 * The compression itself costs build time — 27 s single-threaded on 1,081
 * entries, which is added to every build. Brotli is CPU-bound and every entry
 * is independent, so the work is split across `availableParallelism() - 1`
 * worker threads (capped at 8), staying on the main thread below 64 entries
 * where worker startup would not pay for itself. The cost is printed on every
 * run, threads included, so the trade stays visible rather than assumed.
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
import { globSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { join } from "node:path";
import { isMainThread, parentPort, Worker, workerData } from "node:worker_threads";
import { brotliCompressSync, brotliDecompressSync, constants } from "node:zlib";

// Kept in sync with lib/cache/brotliCacheFormat.ts, which the Worker reads.
// Duplicated as literals here rather than imported because this script runs
// under plain Node before any TypeScript build step exists to resolve it.
const MAGIC = Uint8Array.from([0x00, 0x42, 0x52, 0x31]);
const QUALITY = 5;

const CACHE_DIR = process.argv[2] ?? join(process.cwd(), ".open-next", "cache");

const hasMagic = (buf) =>
  buf.length >= MAGIC.length && MAGIC.every((byte, i) => buf[i] === byte);

/**
 * Compress one entry in place. Returns what it did, so the caller can total up.
 *
 * The round-trip check before writing is the point of the function: this
 * replaces the only copy of these bytes, and an entry that does not decompress
 * back to itself is a page the Worker cannot serve — which on this deployment
 * is a 500, not a slow render. Verifying costs a fraction of the compression
 * and turns that into a failed build instead.
 */
function compressEntry(file) {
  const raw = readFileSync(file);
  // Already done on an earlier run; leave it alone.
  if (hasMagic(raw)) return { compressed: false, before: raw.length, after: raw.length };

  const body = brotliCompressSync(raw, {
    params: { [constants.BROTLI_PARAM_QUALITY]: QUALITY },
  });
  if (!brotliDecompressSync(body).equals(raw)) {
    throw new Error(
      `round-trip mismatch on ${file} — the compressed entry does not ` +
        "decompress to its original bytes, which would ship a cache entry the " +
        "Worker cannot serve.",
    );
  }

  const framed = Buffer.concat([Buffer.from(MAGIC), body]);
  writeFileSync(file, framed);
  return { compressed: true, before: raw.length, after: framed.length };
}

/** Compress a batch, accumulating totals. Throws on the first bad entry. */
function compressBatch(files) {
  const totals = { compressed: 0, skipped: 0, before: 0, after: 0 };
  for (const file of files) {
    const r = compressEntry(file);
    if (r.compressed) totals.compressed++;
    else totals.skipped++;
    totals.before += r.before;
    totals.after += r.after;
  }
  return totals;
}

// ── Worker entry ────────────────────────────────────────────────────────────
//
// This file is its own worker script (`new Worker(import.meta.url)`), the same
// shape scripts/build-search-corpus.mjs uses, so there is no second module to
// keep in step with the magic bytes above.
if (!isMainThread) {
  parentPort.postMessage(compressBatch(workerData.files));
} else {
  let files;
  try {
    files = globSync(join(CACHE_DIR, "**/*"), { withFileTypes: true })
      .filter((f) => f.isFile())
      .map((f) => join(f.parentPath ?? f.path, f.name));
  } catch {
    files = [];
  }

  if (files.length === 0) {
    console.error(
      `[compress-cache] no cache entries under ${CACHE_DIR}.\n` +
        "Run `npx opennextjs-cloudflare build` first. Refusing to report success " +
        "on an empty run: a silent no-op here means the deploy ships an " +
        "uncompressed cache while everything downstream reports fine.",
    );
    process.exit(1);
  }

  // Brotli is CPU-bound and every entry is independent, so this is the same
  // trade as the corpus builder: worth threading once there is enough work to
  // amortise ~0.5 s of worker startup, and not before. Single-threaded this
  // step measured 27 s on 1,081 entries, which is time added to every build.
  const POOL = Math.min(Math.max(1, availableParallelism() - 1), 8);
  const workers = files.length >= 64 ? POOL : 1;

  // Round-robin rather than contiguous slices: entries are walked in directory
  // order and a course's pages resemble each other in size, so contiguous
  // chunks hand one thread a run of 3 MB lessons and another a run of small
  // ones. Order is irrelevant here (each file is rewritten in place), so this
  // is purely about the threads finishing together.
  const chunks = Array.from({ length: workers }, () => []);
  files.forEach((file, i) => chunks[i % workers].push(file));

  const runWorker = (chunk) =>
    new Promise((resolve, reject) => {
      const worker = new Worker(new URL(import.meta.url), { workerData: { files: chunk } });
      worker.once("message", resolve);
      worker.once("error", reject);
      worker.once("exit", (code) => {
        if (code !== 0) reject(new Error(`[compress-cache] worker exited with code ${code}`));
      });
    });

  const started = Date.now();
  let results;
  try {
    results =
      workers > 1
        ? await Promise.all(chunks.map(runWorker))
        : [compressBatch(chunks[0])];
  } catch (err) {
    // A bad entry in any thread fails the build, not just that thread. The
    // others may have written by now; that is fine, the run is idempotent and
    // re-running skips what already carries the magic.
    console.error(`[compress-cache] ${err.message}`);
    process.exit(1);
  }

  const totals = results.reduce(
    (acc, r) => ({
      compressed: acc.compressed + r.compressed,
      skipped: acc.skipped + r.skipped,
      before: acc.before + r.before,
      after: acc.after + r.after,
    }),
    { compressed: 0, skipped: 0, before: 0, after: 0 },
  );

  const mib = (b) => (b / 1048576).toFixed(1);
  const gib = (b) => (b / 1073741824).toFixed(3);
  const ratio = totals.after > 0 ? totals.before / totals.after : 0;
  const elapsed = (Date.now() - started) / 1000;

  console.log(
    `[compress-cache] ${totals.compressed} compressed, ${totals.skipped} already done ` +
      `(${files.length} entries) — ${gib(totals.before)} GiB → ${gib(totals.after)} GiB, ` +
      `${ratio.toFixed(1)}× smaller, ${mib(totals.before - totals.after)} MiB less to upload, ` +
      `in ${elapsed.toFixed(1)}s on ${workers} thread${workers === 1 ? "" : "s"}`,
  );

  // A sanity floor rather than a target. These entries are repetitive JSON and
  // have measured ~17×; anything under 2× means they are not what this script
  // thinks they are (already-compressed input, a format change upstream), and
  // the build should say so rather than quietly shipping a worse cache.
  if (totals.compressed > 0 && ratio < 2) {
    console.error(
      `[compress-cache] compression ratio ${ratio.toFixed(2)}× is far below the ` +
        "~17× these entries have measured. Something about the cache format has " +
        "changed; investigate before trusting this build.",
    );
    process.exit(1);
  }

  // The populate step reads exactly these files, so leave a marker of what it
  // is about to upload. `statSync` on one entry is enough to prove the rewrite
  // landed on disk rather than in a buffer somewhere.
  if (totals.compressed > 0) {
    console.log(`[compress-cache] e.g. ${files[0]} is now ${statSync(files[0]).size} bytes`);
  }
}
