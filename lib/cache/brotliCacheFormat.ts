/**
 * Framing for brotli-compressed incremental-cache entries: `\0BR1`, then the
 * brotli stream. Written by scripts/compress-cache.mjs (Node, build time) and
 * brotliR2IncrementalCache `set()` (workerd); read by its `get()` — a
 * writer/reader mismatch is not a build error, it is a site that 500s on
 * every lesson.
 *
 * Brotli has no magic number of its own, hence the explicit prefix. The
 * leading NUL is load-bearing: JSON can never begin with 0x00, so "carries
 * the magic" and "is uncompressed JSON" can't both be true — which is what
 * lets the reader accept both formats. The `1` is a format version: if the
 * codec or framing changes, bump it and teach the reader both.
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

/** 4, not the library default of 11, and not the 5 this shipped with.
 *  Compression time is paid on every build — 38.9 s on the Workers Builds
 *  runner at q5, against a populate that then finishes in 15 s. Benchmarked
 *  over 121 real entries: q4 is 16.4x at ~43% less CPU than q5's 17.9x, and
 *  the difference in what actually uploads is 0.143 GiB vs 0.135 GiB. Below
 *  q4 the ratio falls off a cliff (q3 is 12.2x) for no further time saving.
 *  Decompression cost is independent of write quality, so the read path is
 *  unaffected and old entries stay readable. */
export const BROTLI_CACHE_QUALITY = 4;
