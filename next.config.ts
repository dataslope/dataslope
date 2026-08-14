import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { courseAliasRedirects } from "./lib/courseAliasRedirects";

// Give `next dev` access to the Cloudflare bindings/env declared in
// wrangler.jsonc when developing against the OpenNext adapter. It's a no-op
// during the production build and on non-Cloudflare hosts, so it's safe to
// leave in regardless of where the app is deployed.
initOpenNextCloudflareForDev();

// The C# .NET runtime bundle (cdn-assets/_dotnet/) is served from
// jsDelivr CDN (see app/_components/runtime/cdn.ts) so the app origin never
// handles those large files. PGlite (@electric-sql/pglite) is also
// served from jsDelivr CDN via dynamic imports (see postgres.ts and
// postgres-worker.ts). Java's tools.jar is published as the
// `dataslope-tools-jar` npm package and fetched from unpkg (see
// TOOLS_JAR_CDN in app/_components/runtime/cdn.ts), since jsDelivr does
// not serve .jar files.
const nextConfig: NextConfig = {
  // Treat MDX files under content/ as page sources via fumadocs-mdx.
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  // Name the OpenNext build ID after the deployed commit SHA when building on
  // Cloudflare Workers Builds. The R2 incremental cache keys every object as
  // `incremental-cache/<buildId>/…` (see open-next.config.ts), so this makes a
  // cache folder's name equal to the commit it was built from. That's what lets
  // the scheduled cleanup workflow map each folder back to a commit, and via
  // the GitHub API to the open pull request (branch) it belongs to, so it can
  // keep only the latest commit per active branch and drop merged/closed ones
  // (.github/workflows/r2-cache-cleanup.yml). `WORKERS_CI_COMMIT_SHA` is the
  // full commit SHA injected by Workers Builds; off-CI (local `next build` /
  // `next dev`) it's unset, so we return null and Next falls back to its default
  // random build ID, no behavior change outside CI.
  generateBuildId: async () => process.env.WORKERS_CI_COMMIT_SHA || null,
  // Resolve the bare `shiki` specifier to the slim registry in
  // lib/shiki-slim.ts. Fumadocs boots its request-time MDX highlighter
  // (dynamic-mode courses compile in the Worker) via `import("shiki")`,
  // whose full bundle statically references all ~250 grammars in
  // @shikijs/langs — ~1.3 MiB of the Worker's gzipped 10 MiB ceiling for
  // languages the content never fences. Subpath imports (`shiki/core`,
  // `shiki/wasm`) are untouched, only the bare specifier is aliased; see
  // lib/shiki-slim.ts for what to do when content adds a new language.
  turbopack: {
    resolveAlias: {
      shiki: "./lib/shiki-slim.ts",
    },
  },
  // The llms/fumadocs-dev route (and the dynamic-mode docs source) read
  // lessons with `path.join(process.cwd(), "content", …)`, which makes
  // Next's output file tracing sweep broad repo globs into the server
  // output. Most of that is only dead weight in .open-next, but cdn-assets/
  // is actively harmful: it contains the ~3 MB dotnet.native.wasm, and
  // OpenNext's bundler turns any traced .wasm into an attached Worker
  // module (~1.2 MiB of the gzipped 10 MiB budget). All of cdn-assets is
  // served from jsDelivr at runtime (see app/_components/runtime/cdn.ts),
  // never from the Worker, so exclude the whole tree (plus other
  // never-read-at-request-time repo dirs the trace picks up: raster image
  // sources consumed only by build-images.mjs, logo source files, tests,
  // and wrangler-applied D1 migrations). content/ stays traced on purpose:
  // it is read at prerender time and by a Node `next start`, and excluding
  // it saves little compared to the risk.
  outputFileTracingExcludes: {
    "*": [
      "./cdn-assets/**",
      "./e2e/**",
      "./scripts/**",
      "./agent-outputs/**",
      "./tools-jar/**",
      "./assets/**",
      "./brand-assets/**",
      // Chart specs are build-time only: scripts/build-charts.mjs renders them
      // into lib/generated/charts.js, and that module is what the app imports.
      "./charts/**",
      "./__tests__/**",
      // D1 schema, applied with `wrangler d1 migrations apply` and never read
      // by the Worker. One entry covers all three databases now that each has
      // a subfolder here; as sibling top-level `migrations-*` directories the
      // illustration and search schema were being traced into the deployment.
      "./migrations/**",
      // Generated static assets read via lib/serverAssets.ts (chart SVGs,
      // the illustration-gallery JSON). Served by the ASSETS binding at
      // request time; nft's fs-call analysis must not trace them into the
      // server function, they'd be dead weight beside the bundle.
      "./public/chart-svgs/**",
      "./public/_gen/**",
    ],
  },
  // Tell Next.js to rewrite barrel imports from these icon packages
  // into deep specifier-level imports so we don't pull whole index
  // graphs into every page's chunk.
  experimental: {
    optimizePackageImports: ["lucide-react", "react-icons"],
    // `cssChunking: "strict"` used to sit here. It was already a NO-OP for
    // this project (it only feeds Next's webpack/rspack CssChunkingPlugin,
    // and `next dev`/`next build` run Turbopack), and as of Next 16.3 setting
    // it at all is a hard build error under Turbopack, so it's gone. Nothing
    // is lost: it was never what protected us from the segment-CSS reorder
    // bugs (#528/#541). Those mitigations are CSS-level and bundler-
    // independent, the shared @source list in app/tailwind.shared.css (both
    // Tailwind roots emit identical utility layers, so stylesheet order can't
    // flip base/variant winners, enforced by __tests__/cssCascadeParity) and
    // the layer/unlayered re-assertions in app/docs.css + app/home.css.
    // Keep prefetched/visited route payloads reusable in the client router
    // cache so re-hovers and back/forward navigations don't re-fetch the same
    // payload from the edge. (Historically this also mattered to avoid billed
    // ISR Reads on Vercel; on Cloudflare those payloads are free static
    // assets, but reusing them still trims redundant requests.) Lessons are
    // fully static and only change on deploy, so long client-side staleness
    // is safe. `dynamic` applies to links without an explicit `prefetch`
    // prop, `static` to `prefetch={true}` links.
    staleTimes: {
      dynamic: 300,
      static: 1800,
    },
    // Off, and load-bearing: the default flipped to `true` in Next 16.3.0
    // (#623 picked that up on 2026-08-06), and on this deployment it produced
    // a client-side request storm — ~150 requests/second per open tab, ~7.5M
    // requests in the week it was live (traffic dashboard, Aug 6-9).
    //
    // The chain, each link verified against the deployed preview:
    //
    //  1. With inlining enabled, a page prerendered at build time WITHOUT
    //     `prefetch-hints.json` is stamped `PrefetchHint.InliningHintsStale`
    //     (bit 512 in the router state's 5th tuple slot). On Workers Builds
    //     that manifest is missing at prerender time, so every deployed page
    //     carries the bit; a local build of the same commit produces the
    //     hints and does not. (The deployed home payload reads 4608/4624
    //     where a local build reads 4224/4112 — that one row is the ONLY
    //     byte difference between the two.)
    //  2. Next's client contract for the bit: write the route entry into the
    //     prefetch cache ALREADY EXPIRED and immediately re-fetch, expecting
    //     a live server to answer with fresh hints.
    //  3. This origin has no live server for prerendered routes: the assets
    //     binding and the R2 incremental cache serve the same frozen,
    //     variant-blind snapshot — with the same stale bit — for every
    //     re-fetch. Pre-expired entry, re-fetch, same answer, no backoff:
    //     the loop cycles every prefetchable link on the page forever.
    //
    // With inlining disabled the stale bit is unreachable (`else if
    // (prefetchInliningEnabled)` guards it), which is exactly the 16.2.6
    // behavior this site ran without incident until Aug 6. Nothing else about
    // prefetching changes: links still viewport-prefetch, the segment cache
    // still works, and `staleTimes` above still govern reuse.
    //
    // Do NOT remove this when bumping Next until BOTH halves are fixed
    // upstream: the client re-fetching stale-hint routes without backoff
    // (Next), and prerendered payloads being served identically for every
    // prefetch variant (OpenNext on Cloudflare).
    prefetchInlining: false,
  },
  // Expose every `/fumadocs-dev` demo page as raw Markdown at
  // `${page.url}.md`, served by the route handler under `app/llms/`. The
  // `/courses` lessons' raw-Markdown mirrors are NOT rewrites: they are
  // emitted as plain static assets into `public/courses/` at build time by
  // scripts/build-course-md.mjs (the assets layer serves them before any
  // route matching), which keeps ~780 route-handler prerenders out of
  // `next build` and out of the per-deploy R2 cache populate. The
  // page-action buttons (Copy Markdown / View as Markdown) point at these
  // `.md` URLs either way. Using `beforeFiles` guarantees the `.md` suffix
  // is intercepted before the catch-all page routes get a chance to match
  // it. The bare `/fumadocs-dev.md` entry covers that section's index page
  // (content/fumadocs-dev/index.mdx).
  // `/dashboard` (the shell segment root) has no page of its own; land it on
  // the create hub. The create/account/admin sections now live under
  // /dashboard and internal links point there directly; the project is
  // pre-launch, so no redirects from the old top-level paths are kept.
  //
  // The flat `/courses/<lesson>` shape 404s even when the lesson exists two
  // segments deep; see lib/courseAliasRedirects.ts for where those links come
  // from, why ambiguous slugs are deliberately left 404ing, and why this is
  // computed from the content tree instead of a generated manifest. Redirects
  // are the first routing phase, so a flat lesson link never reaches the
  // catch-all route (which now refuses unknown params outright).
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

