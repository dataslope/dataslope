// jsDelivr CDN configuration for large static assets (C# .NET runtime
// bundle and Java tools.jar) that are committed under cdn-assets/ but
// intentionally kept out of Next.js's public/ folder so Vercel does
// not serve — and charge bandwidth for — those files.
//
// After merging any PR that changes files under cdn-assets/, create a
// new Git tag matching CDN_ASSETS_TAG and push it so jsDelivr can
// resolve the files:
//
//   git tag v1.0.0-cdn-assets && git push origin v1.0.0-cdn-assets

export const CDN_ASSETS_TAG = "v1.0.0-cdn-assets";

export const CDN_BASE_URL = `https://cdn.jsdelivr.net/gh/subwaymatch/dataslope-playground@${CDN_ASSETS_TAG}/cdn-assets`;
