// jsDelivr CDN configuration for the C# .NET WebAssembly runtime
// bundle. The bundle's assemblies (~35 MB) are committed under
// cdn-assets/_dotnet/ but intentionally kept out of Next.js's public/
// folder so Vercel does not serve, and charge bandwidth for, those
// files. (Java's tools.jar is handled the same way, published as the
// dataslope-tools-jar npm package and fetched from unpkg, see
// TOOLS_JAR_CDN below, because jsDelivr refuses .jar files.)
//
// After merging any PR that changes files under cdn-assets/, bump
// CDN_ASSETS_TAG to a new version, then create a matching Git tag
// and push it so jsDelivr can resolve the new files:
//
//   git tag v1.0.2-cdn-assets && git push origin v1.0.2-cdn-assets

export const CDN_ASSETS_TAG = "v1.0.4-cdn-assets";

export const CDN_BASE_URL = `https://cdn.jsdelivr.net/gh/dataslope/dataslope@${CDN_ASSETS_TAG}/cdn-assets`;

// PGlite CDN configuration.
//
// IMPORTANT: keep PGLITE_VERSION in sync with the @electric-sql/pglite
// version pinned in package.json. The npm install only ships the TypeScript
// declarations; the actual runtime is fetched from jsDelivr at runtime by
// both postgres.ts (main thread) and postgres-worker.ts (web worker).
export const PGLITE_VERSION = "0.5.4";
export const PGLITE_CDN = `https://cdn.jsdelivr.net/npm/@electric-sql/pglite@${PGLITE_VERSION}/dist/index.js`;
export const PGLITE_WORKER_CDN = `https://cdn.jsdelivr.net/npm/@electric-sql/pglite@${PGLITE_VERSION}/dist/worker/index.js`;

// Java's tools.jar (~18 MB), the OpenJDK 8 javac that CheerpJ drives,
// is published as the standalone npm package `dataslope-tools-jar` and
// fetched from unpkg at runtime (see cheerpj.ts), so Vercel never serves
// it. unpkg is used rather than jsDelivr (which refuses .jar files with
// HTTP 403) and rather than GitHub release assets (which send no
// Access-Control-Allow-Origin header): unpkg serves .jar with
// `access-control-allow-origin: *` and, when the version is pinned, an
// immutable 1-year cache.
//
// To ship a new jar: replace tools-jar/tools.jar, bump the version in
// tools-jar/package.json, run `npm run publish:tools-jar`, then bump
// TOOLS_JAR_VERSION here to match (see tools-jar/README.md).
export const TOOLS_JAR_VERSION = "1.0.0";
export const TOOLS_JAR_CDN = `https://unpkg.com/dataslope-tools-jar@${TOOLS_JAR_VERSION}/tools.jar`;

// Plotly.js (~4.4 MB) is loaded from jsDelivr in the browser rather than
// bundled from npm, so it never lands in the client chunks or the server
// (OpenNext Worker) bundle. It's only fetched when a playground actually
// renders a chart (see PlotlyChart in Playground.tsx / CodeBlock.tsx), and by
// then the user already has a warm jsDelivr connection from the runtime that
// produced the figure. The package is intentionally NOT in package.json (it
// was never bundled); this constant is the single version pin.
export const PLOTLY_VERSION = "3.7.0";
export const PLOTLY_CDN = `https://cdn.jsdelivr.net/npm/plotly.js-dist-min@${PLOTLY_VERSION}/+esm`;

// Mermaid (diagram rendering) is likewise loaded from jsDelivr on demand (see
// MermaidContent in app/_components/mdx/mermaid.tsx) so it stays out of the
// bundle / Worker. Mermaid lazy-loads its per-diagram chunks from the same
// CDN base at runtime. The package is intentionally NOT in package.json (it
// was never bundled); this constant is the single version pin.
export const MERMAID_VERSION = "11.16.0";
export const MERMAID_CDN = `https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_VERSION}/+esm`;

// The TypeScript compiler (~2 MB gz) powers JS/TS intellisense inside a
// dedicated worker (see ts-language-worker.ts). Loaded from jsDelivr via
// importScripts, same rationale as Pyodide: it stays out of the client
// chunks and only downloads when a JS/TS editor first requests a
// completion. The lib.*.d.ts standard-library declarations come from the
// same pinned package. Keep TYPESCRIPT_VERSION in sync with the
// `typescript` version pinned in package.json.
export const TYPESCRIPT_VERSION = "5.9.3";
export const TYPESCRIPT_CDN_BASE = `https://cdn.jsdelivr.net/npm/typescript@${TYPESCRIPT_VERSION}`;

// esbuild-wasm powers the React/TSX playground's transform + bundle step
// inside a dedicated worker (see esbuild-worker.ts). The browser build is
// pulled with importScripts and the WASM binary streamed from the same
// pinned package, nothing lands in the client chunks; the download only
// happens when a React block/playground first boots. esbuild-wasm is NOT
// in package.json (the worker declares the small API surface it uses),
// so this pin is the single source of truth for the version.
export const ESBUILD_WASM_VERSION = "0.28.1";
export const ESBUILD_WASM_CDN_BASE = `https://cdn.jsdelivr.net/npm/esbuild-wasm@${ESBUILD_WASM_VERSION}`;

// Tailwind's official in-browser compiler (@tailwindcss/browser v4),
// injected into web-preview documents when a block/example opts in via
// `previewTailwind`. Tailwind Labs designates it a development-time
// compiler (it compiles utility classes on the fly with a
// MutationObserver), which is exactly the learning-playground use case;
// don't reuse this pin for anything that ships production pages.
export const TAILWIND_BROWSER_VERSION = "4.3.2";
export const TAILWIND_BROWSER_CDN = `https://cdn.jsdelivr.net/npm/@tailwindcss/browser@${TAILWIND_BROWSER_VERSION}`;

// esm.sh serves npm packages as native ES modules, the React preview's
// bundler rewrites bare imports (`react`, `react-dom/client`, any npm
// package) to pinned esm.sh URLs and marks them external, so the browser
// fetches them directly inside the sandboxed preview iframe. See
// esmResolve.ts for the specifier → URL mapping and the react pin.
export const ESM_SH_ORIGIN = "https://esm.sh";

// React type declarations for TSX intellisense. The TS language worker
// lazily fetches this pinned set from jsDelivr and mounts it at
// node_modules paths, so `import { useState } from "react"` resolves to
// real typings (hooks signatures, JSX prop checking) inside the React
// playground. The set is the closed dependency graph of @types/react:
// index/global/jsx-runtime + csstype, plus @types/react-dom's client
// entry. Keep the majors aligned with REACT_VERSION in esmResolve.ts.
export const REACT_TYPES_VERSION = "19.2.17";
export const REACT_DOM_TYPES_VERSION = "19.2.3";
export const CSSTYPE_VERSION = "3.2.3";
