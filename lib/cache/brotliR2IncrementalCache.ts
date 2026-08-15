/**
 * The R2 incremental cache, reading brotli-compressed entries (~17x smaller
 * than the raw JSON the stock override stores; measurements in
 * open-next.config.ts).
 *
 * The bulk compression is NOT in `set()`: the deploy-time populate streams
 * `.open-next/cache/` files to R2 byte-for-byte without calling this class,
 * so scripts/compress-cache.mjs rewrites those files after the build and this
 * module is the reader. `set()` still compresses so a future revalidating
 * route can't write a format `get()` can't read.
 *
 * `get()` MUST keep accepting uncompressed entries (magic prefix in
 * ./brotliCacheFormat): the compress step runs from the Cloudflare build
 * command — dashboard config outside this repo — and a deploy that shipped
 * the Worker without the updated command would otherwise 500 site-wide (a
 * miss falls through to a re-render that touches `node:fs`). Keys are scoped
 * by build ID, so the fallback covers that all-or-nothing case, not a mix.
 *
 * A read that throws returns a MISS (null, like the stock override): one
 * poisoned object must not take down every other page, and the error is
 * logged to the Workers log.
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
 * `name` MUST stay equal to the stock R2 cache's: `populateCache` in
 * @opennextjs/cloudflare switches on the override's name (via
 * `withRegionalCache`, which forwards the inner store's), and an unrecognized
 * name hits a `default:` that logs "Incremental cache does not need
 * populating" and populates NOTHING — build green, deploy green, empty cache,
 * site-wide 500s. That shipped once; __tests__/brotliCache.test.ts pins it.
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
