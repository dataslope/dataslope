import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import brotliR2IncrementalCache from "./lib/cache/brotliR2IncrementalCache";

// OpenNext (Cloudflare) build configuration.
//
// The site is fully static; the incremental cache is what SERVES the
// prerendered output. Without it OpenNext re-renders on demand inside
// workerd, whose unenv layer has no filesystem, so every `node:fs`-touching
// page (home course listing, all `/courses/*` lessons) 500s.
//
// R2-backed cache, not the read-only `staticAssetsIncrementalCache`: that one
// only resolves prerenders on the *production* deployment, so Workers Builds
// preview URLs would 500 on exactly those pages; R2 reads identically on
// both. Each deploy's populate writes a full copy under a new build ID
// (~0.14 GiB brotli-framed; see below); stale build folders are pruned by
// .github/workflows/r2-cache-cleanup.yml. Note `segmentData` cannot be turned
// off on this Next version (no such experimental flag despite what older
// notes claimed), so compression is the lever for its bulk, not omission.
//
// Reads are NOT rare: the Worker runs ahead of Cloudflare's CDN cache and its
// responses aren't stored there, so every visitor costs one Worker invocation
// plus one R2 GET. `withRegionalCache` fronts R2 with the per-colo Cache API;
// it does not remove the Worker invocation (only an origin-side Cache Rule
// can — dashboard config, see README.md "Incremental cache cleanup").
//
// Both non-default options are safe because the regional key is scoped by
// build ID (the deployed commit SHA), making entries immutable per deploy:
//   - `long-lived` + 24 h TTL: nothing revalidates, so no staleness to
//     expose; colo eviction is what actually bounds an entry's life.
//   - `shouldLazilyUpdateOnCacheHit: false`: write-once entries have no
//     out-of-band changes to catch, and the default background re-fetch
//     would re-pay the R2 read this wrapper avoids.
//
// IMPORTANT: the R2 cache must be POPULATED at deploy time — the deploy
// command must be `opennextjs-cloudflare deploy` (cf:deploy / cf:preview do
// this), never a bare `wrangler deploy`. Bucket binding
// (`NEXT_INC_CACHE_R2_BUCKET`) is declared in wrangler.jsonc.
//
// `enableCacheInterception` resolves cache hits ahead of the Next handler.
// No queue/tag cache because nothing revalidates; add one only when a
// revalidating server feature is introduced.
//
// The store is `brotliR2IncrementalCache`, not OpenNext's stock
// `r2IncrementalCache`: same bucket and keys, but entries are brotli-framed
// (~17x smaller — the raw entries are repetitive JSON, and `segmentData`
// duplicates `rsc` byte-for-byte). Read side in
// lib/cache/brotliR2IncrementalCache.ts; the deploy-time populate compresses
// via scripts/compress-cache.mjs, not this override.
//
// Layering order matters: `withRegionalCache` wraps the store, so a colo hit
// never touches it and a colo miss caches the DECOMPRESSED value —
// decompression is paid once per colo per deploy, on a request already paying
// the R2 round trip (brotli decompress is cheaper than the JSON.parse that
// follows it).
const config = defineCloudflareConfig({
  incrementalCache: withRegionalCache(brotliR2IncrementalCache, {
    mode: "long-lived",
    defaultLongLivedTtlSec: 24 * 60 * 60,
    shouldLazilyUpdateOnCacheHit: false,
  }),
  enableCacheInterception: true,
});

// `node:zlib` must be external: the Cloudflare CLI compiles this config twice,
// and the edge pass (`platform: "browser"`) cannot resolve `node:` builtins —
// the build dies with `Could not resolve "node:zlib"`. External leaves the
// import in place; workerd with `nodejs_compat` provides `node:zlib` natively
// (brotliDecompressSync verified there). Same mechanism the framework uses
// for `node:crypto` — PRESERVE the existing entries, `ensure-cf-config`
// fails if `node:crypto` is dropped.
export default {
  ...config,
  edgeExternals: [...(config.edgeExternals ?? []), "node:zlib"],
};
