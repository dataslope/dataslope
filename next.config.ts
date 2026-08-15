import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { courseAliasRedirects } from "./lib/courseAliasRedirects";

// Gives `next dev` the Cloudflare bindings/env from wrangler.jsonc; no-op in
// production builds and on non-Cloudflare hosts.
initOpenNextCloudflareForDev();

// Large runtime bundles are CDN-served, never from the app origin: the .NET
// bundle and PGlite from jsDelivr, Java's tools.jar from unpkg (jsDelivr does
// not serve .jar files). See app/_components/runtime/cdn.ts.
const nextConfig: NextConfig = {
  // Treat MDX files under content/ as page sources via fumadocs-mdx.
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  // On Workers Builds, name the build after the deployed commit SHA: the R2
  // incremental cache keys objects as `incremental-cache/<buildId>/…`
  // (open-next.config.ts), which lets r2-cache-cleanup.yml map cache folders
  // back to commits/branches. Off-CI the var is unset → null → Next's default
  // random build ID.
  generateBuildId: async () => process.env.WORKERS_CI_COMMIT_SHA || null,
  // Alias the bare `shiki` specifier (only; subpaths untouched) to the slim
  // registry: the full bundle pulls all ~250 grammars, ~1.3 MiB of the
  // Worker's gzipped 10 MiB ceiling. See lib/shiki-slim.ts for adding a
  // language when content fences a new one.
  turbopack: {
    resolveAlias: {
      shiki: "./lib/shiki-slim.ts",
    },
  },
  // cwd-relative content reads make Next's output file tracing sweep broad
  // repo globs into the server output. Most is dead weight, but cdn-assets/
  // is harmful: OpenNext turns any traced .wasm into an attached Worker
  // module (~1.2 MiB of the gzipped 10 MiB budget), and cdn-assets is served
  // from jsDelivr, never from the Worker. content/ stays traced on purpose:
  // read at prerender time and by a Node `next start`.
  outputFileTracingExcludes: {
    "*": [
      "./cdn-assets/**",
      "./e2e/**",
      "./scripts/**",
      "./agent-outputs/**",
      "./tools-jar/**",
      "./assets/**",
      "./brand-assets/**",
      // Build-time only: rendered into lib/generated/charts.js.
      "./charts/**",
      "./__tests__/**",
      // D1 schema, applied via wrangler and never read by the Worker.
      "./migrations/**",
      // Generated assets read via lib/serverAssets.ts but served by the
      // ASSETS binding at request time; must not be traced into the bundle.
      "./public/chart-svgs/**",
      "./public/_gen/**",
    ],
  },
  // Rewrite barrel imports into deep imports so icon-package index graphs
  // stay out of every page's chunk.
  experimental: {
    optimizePackageImports: ["lucide-react", "react-icons"],
    // Do NOT re-add `cssChunking`: a no-op under Turbopack and a hard build
    // error as of Next 16.3. The segment-CSS reorder mitigations (#528/#541)
    // are CSS-level: the shared @source list in app/tailwind.shared.css
    // (enforced by __tests__/cssCascadeParity) plus the re-assertions in
    // app/docs.css + app/home.css.
    //
    // Keep prefetched/visited payloads reusable in the client router cache.
    // Lessons are fully static and only change on deploy, so long staleness
    // is safe. `dynamic` covers links without an explicit `prefetch` prop,
    // `static` covers `prefetch={true}` links.
    staleTimes: {
      dynamic: 300,
      static: 1800,
    },
    // Off, and load-bearing (default flipped to `true` in Next 16.3.0; when
    // enabled here it caused a client request storm, ~150 req/s per tab):
    // Workers Builds prerenders lack `prefetch-hints.json`, so every deployed
    // page is stamped `PrefetchHint.InliningHintsStale`; the client then
    // writes the prefetch-cache entry pre-expired and re-fetches immediately,
    // but this origin serves the same frozen snapshot (same stale bit) for
    // every re-fetch — no backoff, infinite loop over every prefetchable
    // link. Disabling makes the stale bit unreachable; all other prefetch
    // behavior is unchanged. Do NOT remove when bumping Next until BOTH are
    // fixed upstream: the no-backoff client re-fetch (Next) and variant-blind
    // prerendered payloads (OpenNext on Cloudflare).
    prefetchInlining: false,
  },
  // `/fumadocs-dev` pages are exposed as raw Markdown at `${page.url}.md` via
  // the `app/llms/` route handler; `beforeFiles` ensures the `.md` suffix is
  // intercepted before the catch-all page routes. The `/courses` `.md`
  // mirrors are NOT rewrites — they're static assets emitted into
  // `public/courses/` by scripts/build-course-md.mjs, keeping ~780 prerenders
  // out of `next build` and the R2 cache populate.
  // `/dashboard` has no page of its own; land it on the create hub.
  // Flat `/courses/<lesson>` links redirect via lib/courseAliasRedirects.ts
  // (see there for why ambiguous slugs deliberately 404); redirects run
  // before the catch-all route can reject them.
  redirects: async () => [
    { source: "/dashboard", destination: "/dashboard/create", permanent: false },
    ...courseAliasRedirects(),
  ],
  rewrites: async () => ({
    beforeFiles: [
      { source: "/fumadocs-dev.md", destination: "/llms/fumadocs-dev" },
      {
        source: "/fumadocs-dev/:path*.md",
        destination: "/llms/fumadocs-dev/:path*",
      },
    ],
  }),
};

const withMDX = createMDX();

export default withMDX(nextConfig);

