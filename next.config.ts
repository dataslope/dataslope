import type { NextConfig } from "next";

// Static assets (_dotnet runtime bundle, tools.jar) are served from
// jsDelivr CDN (see app/_components/runtime/cdn.ts) so Vercel never
// handles those large files. No custom headers are needed here.
const nextConfig: NextConfig = {};

export default nextConfig;
