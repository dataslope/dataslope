// jsDelivr CDN configuration for the C# .NET WebAssembly runtime
// bundle. The bundle's assemblies (~35 MB) are committed under
// cdn-assets/_dotnet/ but intentionally kept out of Next.js's public/
// folder so Vercel does not serve — and charge bandwidth for — those
// files. (Java's tools.jar lives in public/ instead because jsDelivr
// does not support .jar files.)
//
// After merging any PR that changes files under cdn-assets/, bump
// CDN_ASSETS_TAG to a new version, then create a matching Git tag
// and push it so jsDelivr can resolve the new files:
//
//   git tag v1.0.2-cdn-assets && git push origin v1.0.2-cdn-assets

export const CDN_ASSETS_TAG = "v1.0.3-cdn-assets";

export const CDN_BASE_URL = `https://cdn.jsdelivr.net/gh/dataslope/dataslope@${CDN_ASSETS_TAG}/cdn-assets`;
