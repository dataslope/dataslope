/**
 * The on-disk / in-R2 framing for brotli-compressed incremental-cache entries.
 *
 * Two things write this format and one thing reads it, in different runtimes:
 *
 *   write  scripts/compress-cache.mjs   (Node, at build time — the bulk of it)
 *   write  lib/cache/brotliR2IncrementalCache.ts `set()`  (workerd, at runtime)
 *   read   lib/cache/brotliR2IncrementalCache.ts `get()`  (workerd)
 *
 * so the magic bytes live here rather than being spelled twice. A mismatch
 * between writer and reader is not a build error, it is a site that 500s on
 * every lesson, because a cache miss on this deployment falls through to a
 * re-render that touches `node:fs` (see the long note in open-next.config.ts).
 *
 * ── Why a magic prefix rather than sniffing ─────────────────────────────────
 *
 * Brotli has no magic number of its own, so a reader cannot tell a compressed
 * entry from an uncompressed one by inspection. The framing is therefore
 * explicit: four bytes, `\0BR1`, then the brotli stream.
 *
 * The leading NUL is the load-bearing part. A JSON document can begin with
 * `{`, `[`, or whitespace, and never with a 0x00 byte — so "starts with the
 * magic" and "is uncompressed JSON" cannot both be true, whatever the payload
 * contains. That is what lets the reader accept both formats safely, which in
 * turn is what makes this change survivable if the build step does not run:
 * an uncompressed object still reads, exactly as it does today. A reader that
 * assumed compression would take the whole site down the first time someone
 * deployed with the old build command.
 *
 * The `1` is a format version. If the codec or framing ever changes, bump it
 * and teach the reader both — do not silently reinterpret old bytes.
 */

/** `\0BR1` — see above for why the first byte must be 0x00. */
export const BROTLI_CACHE_MAGIC = new Uint8Array([0x00, 0x42, 0x52, 0x31]);

/** True when `bytes` carries the framing, i.e. is a compressed cache entry. */
export function hasBrotliCacheMagic(bytes: Uint8Array): boolean {
  if (bytes.length < BROTLI_CACHE_MAGIC.length) return false;
  for (let i = 0; i < BROTLI_CACHE_MAGIC.length; i++) {
    if (bytes[i] !== BROTLI_CACHE_MAGIC[i]) return false;
  }
  return true;
}

/**
 * Brotli quality for cache entries.
 *
 * 5, not the library default of 11. Measured on this repo's cache (see
 * `node scripts/analyze-cache.mjs --compress`), q5 gives ~17x on these objects
 * for a fraction of q11's compression time, and compression time is paid on
 * every build for all ~1,081 objects while the extra ratio would save a
 * one-off slice of an upload. Decompression cost is essentially independent of
 * the quality it was compressed at, so the read path does not care.
 */
export const BROTLI_CACHE_QUALITY = 5;
