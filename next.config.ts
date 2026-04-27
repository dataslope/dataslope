import type { NextConfig } from "next";
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
  redirects: async () => [
    {
      source: "/_dotnet/:path*",
      destination: `${CDN_BASE_URL}/_dotnet/:path*`,
      permanent: false,
    },
  ],
};

export default nextConfig;
