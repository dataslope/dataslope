import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { CDN_BASE_URL } from "./app/_components/runtime/cdn";

// Give `next dev` access to the Cloudflare bindings/env declared in
// wrangler.jsonc when developing against the OpenNext adapter. It's a no-op
// during the production build and on non-Cloudflare hosts, so it's safe to
// leave in regardless of where the app is deployed.
initOpenNextCloudflareForDev();

// The C# .NET runtime bundle (cdn-assets/_dotnet/) is served from
// jsDelivr CDN (see app/_components/runtime/cdn.ts) so Vercel never
// handles those large files. PGlite (@electric-sql/pglite) is also
// served from jsDelivr CDN via dynamic imports (see postgres.ts and
// postgres-worker.ts). Java's tools.jar is published as the
// `dataslope-tools-jar` npm package and fetched from unpkg (see
// TOOLS_JAR_CDN in app/_components/runtime/cdn.ts), since jsDelivr does
// not serve .jar files.
//
// The /_dotnet/ redirect below is no longer required for the C#
// metadata reference flow — Runner.cs now fetches DLLs directly from
// the jsDelivr CDN base URL. It is kept here only as a safety net for
// any stale cached requests or third-party links pointing at the old
// app-origin /_dotnet/ path.
const nextConfig: NextConfig = {
  // Treat MDX files under content/ as page sources via fumadocs-mdx.
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  // Tell Next.js to rewrite barrel imports from these icon packages
  // into deep specifier-level imports so we don't pull whole index
  // graphs into every page's chunk.
  experimental: {
    optimizePackageImports: ["lucide-react", "react-icons"],
    // Load each route's CSS in the exact order it was imported, and keep that
    // order stable across client-side navigations. The /learn (and /interview)
    // segment layers Tailwind's preflight, Fumadocs UI, and the app's overrides
    // into shared cascade layers (`base`, `utilities`); their default 'loose'
    // chunking lets the App Router merge/reorder those chunks on a soft nav,
    // which flips same-layer source-order winners and produces intermittent,
    // refresh-fixed glitches (black borders — see #528 — and the mobile navbar
    // leaking onto desktop, slicing the top of the page). 'strict' preserves
    // import order so the cascade is deterministic, fixing the whole class at
    // the source. It can yield more, smaller CSS chunks, which is fine here.
    // The scoped re-assertions in app/learn/learn.css remain as defense in depth.
    cssChunking: "strict",
    // Keep prefetched/visited route payloads reusable in the client router
    // cache so re-hovers and back/forward navigations don't re-hit the edge
    // (every edge-cache miss is a billed ISR Read on Vercel). Lessons are
    // fully static and only change on deploy, so long client-side staleness
    // is safe. `dynamic` applies to links without an explicit `prefetch`
    // prop, `static` to `prefetch={true}` links.
    staleTimes: {
      dynamic: 300,
      static: 1800,
    },
  },
  redirects: async () => [
    {
      source: "/_dotnet/:path*",
      destination: `${CDN_BASE_URL}/_dotnet/:path*`,
      permanent: false,
    },
  ],
  // Expose every `/learn` lesson as raw Markdown at `${page.url}.md`, served
  // by the route handler in `app/llms/learn/[[...slug]]/`. The page-action
  // buttons (Copy Markdown / View as Markdown) point at these URLs. Using
  // `beforeFiles` guarantees the `.md` suffix is intercepted before the
  // `/learn/[[...slug]]` page route gets a chance to match it. The bare
  // `/learn.md` entry covers the course index (content/learn/index.mdx).
  rewrites: async () => ({
    beforeFiles: [
      { source: "/learn.md", destination: "/llms/learn" },
      { source: "/learn/:path*.md", destination: "/llms/learn/:path*" },
    ],
  }),
};

const withMDX = createMDX();

export default withMDX(nextConfig);

