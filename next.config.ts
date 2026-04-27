import type { NextConfig } from "next";

// The C# .NET runtime bundle (cdn-assets/_dotnet/) is served from
// jsDelivr CDN (see app/_components/runtime/cdn.ts) so Vercel never
// handles those large files. Java's tools.jar lives in public/ since
// jsDelivr does not support .jar files. No custom headers are needed.
const nextConfig: NextConfig = {};

export default nextConfig;
