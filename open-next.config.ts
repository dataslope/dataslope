import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";

// OpenNext (Cloudflare) build configuration.
//
// DataSlope is fully static (no ISR, no `revalidate`): the ~800 lessons and
// the home page are prerendered at build time. They must be SERVED from that
// prerendered output, though, and that's what the incremental cache does.
//
// Without a working `incrementalCache`, OpenNext falls back to re-rendering
// every page on demand. That re-render runs our React server components inside
// workerd, whose Node compatibility layer (unenv) has no filesystem, so any
// page that touches `node:fs` at request time throws `fs.readdir/readFile is
// not implemented` and returns a 500. That hits the home page (course listing
// via `readdir`) and all `/courses/*` lessons (Fumadocs `dynamic` mode reads
// each MDX body from disk via `page.data.load()`).
//
// We use the R2-backed incremental cache rather than the read-only
// `staticAssetsIncrementalCache`: the static-assets cache can only resolve
// prerendered pages on the *production* deployment, so Cloudflare preview
// URLs (the per-commit / per-branch `*.workers.dev` Workers Builds previews)
// fall through to a re-render and 500 on exactly those `node:fs` pages. R2 is
// read from identically on production and preview deployments, so previews
// render correctly too. Each deploy's populate step writes a full copy of the
// cache under a new build ID, ~2.5 GB (one `.cache` object per prerendered
// page, ~1,080 of them averaging ~2.3 MB), so stale build folders are pruned on
// a schedule by .github/workflows/r2-cache-cleanup.yml.
//
// That figure read "~1–1.4 GB" until 2026-08-14 and was measured at 2.504 GB.
// Each entry now carries a `segmentData` map next to `html` and `rsc` — Next
// 16's client segment cache, on by default, nothing here opts in — and it is
// ~40% of every object. Half of that is `segmentData["/_full"]`, byte-identical
// to `rsc` in 40/40 sampled objects, so ~20% of the bucket is a duplicate of
// bytes already stored one key over. Setting `experimental.clientSegmentCache:
// false` in next.config.ts would take the bucket to ~60% of its current size;
// it is left ON because the segment cache is load-bearing for prefetching here
// and the interaction with `prefetchInlining: false` (see the long note in
// next.config.ts) has not been tested on a preview deploy. Measure before
// trusting either number again.
//
// Reads are NOT rare, which this comment used to claim. Next sets
// `s-maxage=31536000` on the prerendered responses, but a Worker runs *ahead*
// of Cloudflare's CDN cache and its response is not stored there unless the
// Worker or a Cache Rule puts it there: page responses come back with no
// `cf-cache-status` header at all, while `/_next/static/*` (served by the
// assets binding) reports `cf-cache-status: HIT` (measured 2026-08-09). So
// every visitor to a lesson costs one Worker invocation and one R2 GET, and
// nothing is shared between two readers of the same page.
//
// `withRegionalCache` is the fix that lives in this repo: it fronts R2 with
// the per-data-centre Cache API, so the first reader in a colo pays the R2
// round trip and everyone behind them is served locally. It does not remove
// the Worker invocation — only an origin-side Cache Rule on `/courses/*` can
// do that, which is dashboard configuration rather than code (see the
// "Incremental cache cleanup" section of README.md).
//
// The two non-default options are both safe *because* the regional key is
// scoped by build ID (`getCacheUrlKey` prefixes `OPEN_NEXT_BUILD_ID`, i.e. the
// deployed commit SHA), which makes an entry immutable for the life of a
// deploy and unreachable from the next one:
//   - `long-lived` + a 24 h TTL: nothing here revalidates, so there is no
//     staleness for a long TTL to expose. Colo eviction, not this number, is
//     what actually bounds an entry's life.
//   - `shouldLazilyUpdateOnCacheHit: false`: the default re-fetches from R2 in
//     the background on every regional hit to catch out-of-band changes. With
//     build-ID-scoped, write-once entries there is nothing to catch, and
//     leaving it on would keep paying the R2 read this wrapper exists to
//     avoid.
//
// IMPORTANT: the R2 cache must be POPULATED at deploy time. `npm run cf:deploy`
// (`opennextjs-cloudflare deploy`) and `npm run cf:preview` do this; if you
// deploy via Cloudflare Workers Builds, the project's deploy command must run
// `opennextjs-cloudflare deploy` (not a bare `wrangler deploy`) so the
// prerendered pages are written to the bucket. The bucket binding
// (`NEXT_INC_CACHE_R2_BUCKET`) is declared in wrangler.jsonc.
//
// `enableCacheInterception` resolves cache hits in the routing layer ahead of
// the full Next.js handler, which also improves cold starts. No queue or tag
// cache is configured because nothing here revalidates; add one alongside this
// only when a server feature that revalidates is introduced.
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, {
    mode: "long-lived",
    defaultLongLivedTtlSec: 24 * 60 * 60,
    shouldLazilyUpdateOnCacheHit: false,
  }),
  enableCacheInterception: true,
});
