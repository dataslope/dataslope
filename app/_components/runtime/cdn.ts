// jsDelivr config for the C# .NET WASM bundle (~35 MB), committed under
// cdn-assets/_dotnet/ but deliberately kept out of public/ so this origin
// never serves it (see the outputFileTracingExcludes note in
// next.config.ts). After merging changes under cdn-assets/, bump
// CDN_ASSETS_TAG and push a matching Git tag:
//   git tag v1.0.2-cdn-assets && git push origin v1.0.2-cdn-assets

export const CDN_ASSETS_TAG = "v1.0.4-cdn-assets";

export const CDN_BASE_URL = `https://cdn.jsdelivr.net/gh/dataslope/dataslope@${CDN_ASSETS_TAG}/cdn-assets`;

// IMPORTANT: keep PGLITE_VERSION in sync with @electric-sql/pglite in
// package.json — npm only supplies types; the runtime is fetched from
// jsDelivr.
export const PGLITE_VERSION = "0.5.4";
export const PGLITE_CDN = `https://cdn.jsdelivr.net/npm/@electric-sql/pglite@${PGLITE_VERSION}/dist/index.js`;
export const PGLITE_WORKER_CDN = `https://cdn.jsdelivr.net/npm/@electric-sql/pglite@${PGLITE_VERSION}/dist/worker/index.js`;

// Java's tools.jar (~18 MB), published as the `dataslope-tools-jar` npm
// package and fetched from unpkg — jsDelivr returns 403 for .jar files and
// GitHub release assets send no CORS header. To ship a new jar: replace
// tools-jar/tools.jar, bump tools-jar/package.json, run
// `npm run publish:tools-jar`, then bump TOOLS_JAR_VERSION to match.
export const TOOLS_JAR_VERSION = "1.0.0";
export const TOOLS_JAR_CDN = `https://unpkg.com/dataslope-tools-jar@${TOOLS_JAR_VERSION}/tools.jar`;

// Plotly.js (~4.4 MB) loads from jsDelivr on demand so it never lands in
// the client or Worker bundles. Intentionally NOT in package.json; this
// constant is the single version pin.
export const PLOTLY_VERSION = "3.7.0";
export const PLOTLY_CDN = `https://cdn.jsdelivr.net/npm/plotly.js-dist-min@${PLOTLY_VERSION}/+esm`;

// Mermaid likewise loads from jsDelivr on demand (see mdx/mermaid.tsx).
// Intentionally NOT in package.json; this constant is the single pin.
export const MERMAID_VERSION = "11.16.1";
export const MERMAID_CDN = `https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_VERSION}/+esm`;

// TypeScript compiler for JS/TS intellisense (ts-language-worker.ts),
// loaded via importScripts so it stays out of the client chunks. Keep
// TYPESCRIPT_VERSION in sync with `typescript` in package.json, and keep
// it on the 5.x/6.x line: typescript@7 on npm is the native (Go) compiler,
// shipped as platform binaries with no `lib/typescript.js` to import.
export const TYPESCRIPT_VERSION = "5.9.3";
export const TYPESCRIPT_CDN_BASE = `https://cdn.jsdelivr.net/npm/typescript@${TYPESCRIPT_VERSION}`;

// esbuild-wasm powers the React/TSX transform + bundle step (see
// esbuild-worker.ts); pulled via importScripts on first boot. NOT in
// package.json — this pin is the single source of truth.
export const ESBUILD_WASM_VERSION = "0.28.1";
export const ESBUILD_WASM_CDN_BASE = `https://cdn.jsdelivr.net/npm/esbuild-wasm@${ESBUILD_WASM_VERSION}`;

// Tailwind's in-browser compiler, injected into web previews that opt in
// via `previewTailwind`. It's a development-time compiler — don't reuse
// this pin for anything that ships production pages.
export const TAILWIND_BROWSER_VERSION = "4.3.3";
export const TAILWIND_BROWSER_CDN = `https://cdn.jsdelivr.net/npm/@tailwindcss/browser@${TAILWIND_BROWSER_VERSION}`;

// esm.sh serves npm packages as ES modules; the React preview rewrites
// bare imports to pinned esm.sh URLs (see esmResolve.ts).
export const ESM_SH_ORIGIN = "https://esm.sh";

// React type declarations for TSX intellisense, lazily fetched and mounted
// at node_modules paths by the TS language worker. Keep the majors aligned
// with REACT_VERSION in esmResolve.ts.
export const REACT_TYPES_VERSION = "19.2.18";
export const REACT_DOM_TYPES_VERSION = "19.2.4";
export const CSSTYPE_VERSION = "3.2.3";
