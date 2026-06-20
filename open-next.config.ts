import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// OpenNext (Cloudflare) build configuration.
//
// DataSlope is fully static (no ISR, no `revalidate`, Writes = 0): the ~800
// lessons and the home page are prerendered at build time. They must be
// SERVED from that prerendered output, though — and that's what the
// incremental cache does.
//
// Without an `incrementalCache`, OpenNext falls back to the "dummy" cache,
// which stores nothing, so the Worker re-renders every page on demand. That
// re-render runs our React server components inside workerd, whose Node
// compatibility layer (unenv) has no filesystem — so any page that touches
// `node:fs` at request time throws `fs.readdir/readFile is not implemented`
// and returns a 500. That hits the home page (course listing via `readdir`)
// and all `/learn/*` lessons (Fumadocs `dynamic` mode reads each MDX body
// from disk via `page.data.load()`).
//
// `staticAssetsIncrementalCache` is a read-only cache that serves the
// prerendered pages straight from the Workers Static Assets we already
// upload (see wrangler.jsonc `assets`) — no R2 or KV binding required. With
// it in place the prerendered HTML/RSC is returned without ever re-rendering,
// so the filesystem is never touched at request time. `enableCacheInterception`
// resolves those hits in the routing layer ahead of the full Next.js handler,
// which also improves cold starts.
//
// Revalidation is not supported by this cache, which is fine: nothing here
// revalidates. When a server feature that DOES revalidate is added later
// (e.g. saved workspaces, an "Ask AI" route), switch to the R2-backed cache:
//
//   import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
//   export default defineCloudflareConfig({ incrementalCache: r2IncrementalCache });
//
// and add the matching R2 bucket binding to wrangler.jsonc.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
