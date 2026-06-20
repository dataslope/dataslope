import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// OpenNext (Cloudflare) build configuration.
//
// No `incrementalCache` is wired up: DataSlope is fully static today (no ISR,
// no `revalidate`, Writes = 0), so there is nothing to cache incrementally.
// The ~800 lessons are prerendered at build time and served as free static
// assets (see wrangler.jsonc `assets`).
//
// When a server feature that revalidates is added later (e.g. saved
// workspaces, an "Ask AI" route), back the incremental cache with R2:
//
//   import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
//   export default defineCloudflareConfig({ incrementalCache: r2IncrementalCache });
//
// and add the matching R2 bucket binding to wrangler.jsonc.
export default defineCloudflareConfig({});
