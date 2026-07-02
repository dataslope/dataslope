import { readdirSync } from "node:fs";
import path from "node:path";
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
    // NOTE: this option is a NO-OP for this project's builds. It is only
    // wired into Next's webpack/rspack pipeline (CssChunkingPlugin), and Next
    // 16 builds with Turbopack by default — which `next dev`/`next build`
    // use here. It's kept solely so a `next build --webpack` fallback keeps
    // deterministic CSS chunk ordering; do NOT rely on it for the
    // segment-CSS reorder bugs (#528/#541). The real, bundler-independent
    // mitigations are CSS-level: the shared @source list in
    // app/tailwind.shared.css (both Tailwind roots emit identical utility
    // layers, so stylesheet order can't flip base/variant winners) and the
    // layer/unlayered re-assertions in app/docs.css + app/home.css.
    cssChunking: "strict",
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
  },
  redirects: async () => [
    {
      source: "/_dotnet/:path*",
      destination: `${CDN_BASE_URL}/_dotnet/:path*`,
      permanent: false,
    },
    // ── Route restructuring (courses-page redesign) ──────────────────────
    // The old public URLs moved:
    //   /learn/<course>/…  →  /courses/<course>/…   (all courses)
    //   /learn/<dev page>  →  /fumadocs-dev/<dev page>  (loose demo pages)
    //   /learn             →  /courses              (the index)
    //   /interview/…       →  /interview-prep/…
    // The dev-page entries are generated from the files actually present in
    // content/fumadocs-dev/ and MUST precede the /learn/:path* catch-all —
    // Next.js applies redirects in order, first match wins.
    ...fumadocsDevSlugs().map((slug) => ({
      source: `/learn/${slug}`,
      destination: `/fumadocs-dev/${slug}`,
      permanent: true,
    })),
    { source: "/learn", destination: "/courses", permanent: true },
    { source: "/learn/:path*", destination: "/courses/:path*", permanent: true },
    { source: "/interview", destination: "/interview-prep", permanent: true },
    {
      source: "/interview/:path*",
      destination: "/interview-prep/:path*",
      permanent: true,
    },
  ],
  // Expose every `/courses` lesson (and `/fumadocs-dev` demo page) as raw
  // Markdown at `${page.url}.md`, served by the route handlers under
  // `app/llms/`. The page-action buttons (Copy Markdown / View as Markdown)
  // point at these URLs. Using `beforeFiles` guarantees the `.md` suffix is
  // intercepted before the catch-all page routes get a chance to match it.
  // The bare `/fumadocs-dev.md` entry covers that section's index page
  // (content/fumadocs-dev/index.mdx); `/courses` has no root MDX page — its
  // index is the course-catalog page — so there is no bare `/courses.md`.
  rewrites: async () => ({
    beforeFiles: [
      { source: "/courses/:path*.md", destination: "/llms/courses/:path*" },
      { source: "/fumadocs-dev.md", destination: "/llms/fumadocs-dev" },
      {
        source: "/fumadocs-dev/:path*.md",
        destination: "/llms/fumadocs-dev/:path*",
      },
    ],
  }),
};

/** Top-level demo-page slugs under content/fumadocs-dev/ (the pages that used
 *  to live loose under /learn), for the one-time redirect table above. Read at
 *  config-load time — Node's fs is available here, and the list only changes
 *  when a dev page is added or removed. */
function fumadocsDevSlugs(): string[] {
  return readdirSync(path.join(process.cwd(), "content", "fumadocs-dev"))
    .filter((name) => name.endsWith(".mdx") && name !== "index.mdx")
    .map((name) => name.replace(/\.mdx$/, ""))
    .sort();
}

const withMDX = createMDX();

export default withMDX(nextConfig);

