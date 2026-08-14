import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";

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
// both. Each deploy's populate writes a full copy (~2.5 GB) under a new build
// ID; stale build folders are pruned by .github/workflows/r2-cache-cleanup.yml.
// (`experimental.clientSegmentCache: false` would shrink entries ~40%, but is
// left ON: the segment cache is load-bearing for prefetching and its
// interaction with `prefetchInlining: false` is untested on preview.)
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
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, {
    mode: "long-lived",
    defaultLongLivedTtlSec: 24 * 60 * 60,
    shouldLazilyUpdateOnCacheHit: false,
  }),
  enableCacheInterception: true,
});
