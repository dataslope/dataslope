import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";
import { CDN_BASE_URL } from "./app/_components/runtime/cdn";

// The C# .NET runtime bundle (cdn-assets/_dotnet/) is served from
// jsDelivr CDN (see app/_components/runtime/cdn.ts) so Vercel never
// handles those large files. Java's tools.jar lives in public/ since
// jsDelivr does not support .jar files.
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
  },
  // The previous SQLite engine (sql.js) needed Node-only `fs`/`path`/
  // `crypto` aliased to an empty stub in the client bundle. The current
  // engine (@sqlite.org/sqlite-wasm) ships a clean browser build with
  // no such gates, so no Turbopack aliases are required here.
  redirects: async () => [
    {
      source: "/_dotnet/:path*",
      destination: `${CDN_BASE_URL}/_dotnet/:path*`,
      permanent: false,
    },
  ],
};

const withMDX = createMDX();

export default withMDX(nextConfig);

