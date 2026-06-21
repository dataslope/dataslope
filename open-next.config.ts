import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

// OpenNext (Cloudflare) build configuration.
//
// DataSlope is fully static (no ISR, no `revalidate`): the ~800 lessons and
// the home page are prerendered at build time. They must be SERVED from that
// prerendered output, though — and that's what the incremental cache does.
//
// Without a working `incrementalCache`, OpenNext falls back to re-rendering
// every page on demand. That re-render runs our React server components inside
// workerd, whose Node compatibility layer (unenv) has no filesystem — so any
// page that touches `node:fs` at request time throws `fs.readdir/readFile is
// not implemented` and returns a 500. That hits the home page (course listing
// via `readdir`) and all `/learn/*` lessons (Fumadocs `dynamic` mode reads
// each MDX body from disk via `page.data.load()`).
//
// We use the R2-backed incremental cache rather than the read-only
// `staticAssetsIncrementalCache`: the static-assets cache can only resolve
// prerendered pages on the *production* deployment, so Cloudflare preview
// URLs (the per-commit / per-branch `*.workers.dev` Workers Builds previews)
// fall through to a re-render and 500 on exactly those `node:fs` pages. R2 is
// read from identically on production and preview deployments, so previews
// render correctly too. For this traffic it stays comfortably inside R2's
// free tier (a few MB of HTML/RSC; ~1 object per page written per deploy via
// the populate step; reads are rare behind the edge `s-maxage` cache).
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
  incrementalCache: r2IncrementalCache,
  enableCacheInterception: true,
});
