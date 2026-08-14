/**
 * The R2 incremental cache, reading brotli-compressed entries.
 *
 * Why this exists:
 *
 * OpenNext's stock `r2-incremental-cache` writes and reads these entries as
 * raw JSON. On this site that is 2.34 GiB across 1,081 objects, re-uploaded in
 * full to R2 on **every** deploy — production and every preview — under a fresh
 * build-ID prefix, undiffed (see open-next.config.ts). The entries are
 * repetitive JSON and compress extremely well: brotli q5 takes them to ~5.9%
 * of raw, ~17x (`node scripts/analyze-cache.mjs --compress`). That is paid back
 * twice, in per-deploy populate bytes and in per-retained-build R2 storage.
 *
 * ── Where the compression actually happens ──────────────────────────────────
 *
 * Mostly NOT in `set()` below. Every one of the 1,081 objects is written by the
 * deploy-time populate step, which streams the files under `.open-next/cache/`
 * to R2 byte-for-byte and never calls into this class. So the bulk compression
 * is `scripts/compress-cache.mjs`, which rewrites those files in place after
 * the build; this module is the reader that makes them legible again.
 *
 * `set()` still compresses, for the entries written at request time. This site
 * does not revalidate, so that path is effectively dead — but a `set` that
 * wrote a format this `get` could not read would be a trap for whoever first
 * introduces a revalidating route.
 *
 * ── Reading both formats is deliberate ──────────────────────────────────────
 *
 * `get()` accepts compressed AND uncompressed entries, distinguished by the
 * magic prefix in ./brotliCacheFormat. This is not defensive clutter; it is
 * what makes the change safe to ship. The compression step runs from the
 * Cloudflare **build command**, which is dashboard configuration living outside
 * this repo. If a deploy ever goes out with the Worker updated and the build
 * command not, every object in that build's prefix is uncompressed — and a
 * reader that assumed otherwise would turn that into a site-wide 500, because a
 * cache miss here falls through to a re-render that touches `node:fs`. With the
 * fallback, that same mistake degrades to "the cache is merely as large as it
 * used to be".
 *
 * Note that a *mixed* bucket is not actually reachable: keys are
 * `incremental-cache/<buildId>/…` and the build ID is the deployed commit SHA,
 * so a Worker only ever reads objects its own deploy wrote. The fallback covers
 * the all-or-nothing case above, not a mixture.
 *
 * ── Failure handling ────────────────────────────────────────────────────────
 *
 * A read that throws is returned as a cache MISS (`null`), matching the stock
 * override's behaviour. On this deployment a miss is a re-render and likely a
 * 500, so it is not a soft failure — but returning null keeps one poisoned
 * object from taking down requests for every other page, and the error is
 * logged so it is visible in the Workers log rather than silent.
 */
import { error } from "@opennextjs/aws/adapters/logger.js";
import type { CacheEntryType, CacheValue } from "@opennextjs/aws/types/overrides.js";
import { IgnorableError } from "@opennextjs/aws/utils/error.js";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  BINDING_NAME,
  NAME as R2_CACHE_NAME,
  PREFIX_ENV_NAME,
} from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { computeCacheKey, debugCache } from "@opennextjs/cloudflare/overrides/internal";
import { brotliCompressSync, brotliDecompressSync, constants } from "node:zlib";
import {
  BROTLI_CACHE_MAGIC,
  BROTLI_CACHE_QUALITY,
  hasBrotliCacheMagic,
} from "./brotliCacheFormat";

/**
 * The label this override logs under. NOT its `name` — see below.
 */
export const DEBUG_NAME = "ds-brotli-r2-incremental-cache";

/**
 * `name` MUST stay equal to the stock R2 cache's, and this is not cosmetic.
 *
 * `populateCache` in @opennextjs/cloudflare dispatches on it — literally
 * `switch (await resolveCacheName(incrementalCache))`, matching against
 * `R2_CACHE_NAME` / `KV_CACHE_NAME` / `STATIC_ASSETS_CACHE_NAME`, with a
 * `default:` that logs "Incremental cache does not need populating" and does
 * nothing. `withRegionalCache` passes the inner store's name straight through
 * (`this.name = this.store.name`), so this class's name is what that switch
 * sees.
 *
 * Giving it a distinct name therefore does not rename anything, it silently
 * turns the deploy-time populate OFF. The build stays green, the deploy
 * succeeds, and the Worker ships with an EMPTY incremental cache — which on
 * this deployment means the home page and every `/courses/*` lesson 500, since
 * a miss falls through to a re-render that touches `node:fs` in workerd.
 *
 * That is exactly what happened when this override first shipped with its own
 * name: "Incremental cache does not need populating" in the build log, nothing
 * else out of place. `__tests__/brotliCache.test.ts` pins it so it cannot
 * happen twice.
 *
 * This is also the honest description of what this class is: the same R2
 * incremental cache, same bucket, same keys, differing only in how the values
 * are encoded.
 */
export const NAME = R2_CACHE_NAME;

type Entry<T extends CacheEntryType> = { value: CacheValue<T>; lastModified: number };

function bucket() {
  const r2 = getCloudflareContext().env[BINDING_NAME];
  if (!r2) throw new IgnorableError("No R2 bucket");
  return r2;
}

/** The same key the stock override computes; imported rather than reimplemented
 *  so the two can never drift apart on a prefix or build-ID change. */
function r2Key(key: string, cacheType?: CacheEntryType) {
  return computeCacheKey(key, {
    prefix: getCloudflareContext().env[PREFIX_ENV_NAME],
    buildId: process.env.OPEN_NEXT_BUILD_ID,
    cacheType,
  });
}

class BrotliR2IncrementalCache {
  readonly name = NAME;

  async get<CacheType extends CacheEntryType = "cache">(
    key: string,
    cacheType?: CacheType,
  ): Promise<Entry<CacheType> | null> {
    try {
      const object = await bucket().get(r2Key(key, cacheType));
      if (!object) return null;

      const bytes = new Uint8Array(await object.arrayBuffer());
      const isCompressed = hasBrotliCacheMagic(bytes);
      const json = isCompressed
        ? brotliDecompressSync(bytes.subarray(BROTLI_CACHE_MAGIC.length)).toString("utf8")
        : // Uncompressed: what the stock override writes, and what this bucket
          // holds for any build whose compress step did not run.
          new TextDecoder().decode(bytes);

      // `NEXT_PRIVATE_DEBUG_CACHE=1` to see these. The encoding is logged
      // because "is this deploy actually serving compressed entries?" is
      // otherwise unanswerable from outside — the two formats are designed to
      // be indistinguishable to every caller above this line.
      debugCache(DEBUG_NAME, `get ${key} (${isCompressed ? "brotli" : "raw"}, ${bytes.length}B)`);

      return {
        value: JSON.parse(json) as CacheValue<CacheType>,
        lastModified: object.uploaded.getTime(),
      };
    } catch (e) {
      error("Failed to get from cache", e);
      return null;
    }
  }

  async set<CacheType extends CacheEntryType = "cache">(
    key: string,
    value: CacheValue<CacheType>,
    cacheType?: CacheType,
  ): Promise<void> {
    try {
      const compressed = brotliCompressSync(Buffer.from(JSON.stringify(value), "utf8"), {
        params: { [constants.BROTLI_PARAM_QUALITY]: BROTLI_CACHE_QUALITY },
      });
      const framed = new Uint8Array(BROTLI_CACHE_MAGIC.length + compressed.length);
      framed.set(BROTLI_CACHE_MAGIC, 0);
      framed.set(compressed, BROTLI_CACHE_MAGIC.length);
      await bucket().put(r2Key(key, cacheType), framed);
    } catch (e) {
      error("Failed to set to cache", e);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await bucket().delete(r2Key(key));
    } catch (e) {
      error("Failed to delete from cache", e);
    }
  }
}

const brotliR2IncrementalCache = new BrotliR2IncrementalCache();
export default brotliR2IncrementalCache;
