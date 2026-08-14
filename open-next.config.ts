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
// Each entry carries a `segmentData` map next to `html` and `rsc` — Next 16's
// client segment cache, on by default, nothing here opts in. Measured over a
// whole build rather than a sample (`node scripts/analyze-cache.mjs`):
//
//   html         0.731 GiB  31.2%
//   rsc          0.477 GiB  20.4%
//   segmentData  1.003 GiB  42.8%
//     of which `/_full` is 0.477 GiB / 20.4%, and byte-identical to `rsc`
//     in 1,045 of 1,045 objects
//
// So a fifth of the bucket is `rsc` stored a second time under another key.
//
// THIS COMMENT USED TO SAY that `experimental.clientSegmentCache: false` would
// take the bucket to ~60% of its size. That option does not exist. It is not a
// key Next 16.3.0 accepts: the build warns "Unrecognized key(s) in object:
// 'clientSegmentCache' at experimental", `tsc` rejects it against
// `ExperimentalConfig`, and the only occurrences of the name anywhere in
// `next/dist` are inside source maps. `segmentData` is emitted unconditionally
// — app-render.js guards `collectSegmentData(...)` on nothing but
// `renderOpts.isBuildTimePrerendering` — so on this Next version there is no
// flag that turns it off. Tried on 2026-08-14; the build fails outright.
//
// The waste is real and the lever is not here. It also turns out to be the
// smaller prize. These objects are written to R2 UNCOMPRESSED, and they are
// repetitive JSON — `node scripts/analyze-cache.mjs --compress`, sampled over
// 121 of the 1,081 objects:
//
//   gzip -6     18.6% of raw   5.4×   2.340 GiB → ~0.44 GiB
//   brotli q5    5.9% of raw  17.0×   2.340 GiB → ~0.14 GiB
//
// Compressing cache values in a custom `incrementalCache` override — this file
// already wraps one with `withRegionalCache` — subsumes the duplication problem
// entirely, because a byte-identical copy of `rsc` is exactly what a compressor
// erases. It would cut the per-deploy populate upload and the per-retained-build
// storage by the same factor. The work is the read side: whatever writes
// compressed has to decompress in the Worker, and `enableCacheInterception`
// means the routing layer reads these too. Not attempted yet; measure again
// before committing to a codec, and prefer the one whose decompress cost the
// Worker can absorb on a cache hit.
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
