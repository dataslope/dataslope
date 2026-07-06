# Web development playgrounds on native browser capabilities & WASM — research report

- **Date:** 2026-07-06
- **Question:** What types of web-development playgrounds (HTML/CSS/JS live preview, React, Vue/Svelte/Tailwind/TypeScript-React variants) can run fully client-side using native browser capabilities and/or WASM runtimes — and which architectures fit DataSlope's existing no-server-execution model?
- **Method:** Deep-research fan-out (5 search angles → 25 primary/secondary sources fetched → 120 claims extracted → 25 top claims adversarially verified with 3-vote panels: 24 confirmed, 1 refuted), supplemented by direct codebase reconnaissance of the DataSlope repo and targeted follow-up verification of the Vue/Svelte official REPLs. All external claims verified live on 2026-07-06.
- **Audience:** DataSlope maintainer planning web-development courses.

---

## 1. Executive summary

Every playground type needed for web-dev courses can run **100% client-side with zero execution backend**, which is exactly DataSlope's existing model. The findings, in one paragraph:

A CodePen-style **HTML/CSS/JS playground** needs nothing but native primitives — a sandboxed `<iframe srcdoc>` (or blob URL) plus a console bridge over `postMessage`. A **React/TypeScript-React playground** adds one in-worker transform (esbuild-wasm or `@babel/standalone`, both officially built for this) and CDN module resolution (esm.sh / import maps) for npm packages. A **Tailwind variant** is a single script tag: Tailwind Labs ships an official in-browser v4 compiler (`@tailwindcss/browser`). **Vue** has an official MIT embeddable REPL (`@vue/repl`, the engine behind play.vuejs.org) that compiles SFCs fully client-side; **Svelte**'s official REPL is also fully in-browser (compiler + bundler in a web worker). For multi-file "real project" simulation, the **Service-Worker-as-virtual-server** pattern is production-proven by Google's playground-elements and WordPress Playground. The two things to *avoid* are also clear: **WebContainers** (StackBlitz) require site-wide COOP/COEP cross-origin isolation, which would force CORP/CORS compliance onto every CDN-loaded WASM runtime DataSlope already ships (Pyodide, CheerpJ, PGlite, …), plus commercial licensing; and **Sandpack's Nodebox-powered templates** (Next.js, all Vite templates, Astro, Node) sit under a non-open-source "Sustainable Use License" that excludes free commercial use — though Sandpack's plain browser-bundler React templates remain Apache-2.0-safe.

**Recommended build order** (detail in §8): ① hand-built HTML/CSS/JS adapter on native primitives (days); ② React/TS-React adapter via esbuild-wasm + esm.sh (≈1–2 weeks); ③ Tailwind toggle on top of ① (≈a day); ④ Vue via `@vue/repl` and/or Svelte via its compiler-in-worker pattern, or alternatively a self-hosted LiveCodes (MIT) embed for long-tail framework breadth (evaluate, ~1–3 weeks); ⑤ skip WebContainers/Nodebox entirely.

---

## 2. Constraints from the existing DataSlope codebase

These repo facts shaped the recommendations; each is a real constraint the external options were scored against.

| Constraint | Evidence in repo | Consequence |
| --- | --- | --- |
| Fully client-side execution; hosting is static + OpenNext on Cloudflare Workers | `README.md`, `wrangler.jsonc`, `open-next.config.ts` | Any option requiring a build/execution server is out. Options that are "just static files" fit as-is. |
| **No COOP/COEP headers anywhere** — the site is *not* cross-origin isolated | No `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` in `next.config.ts`, `wrangler.jsonc`, or `public/` | `SharedArrayBuffer` is unavailable → WebContainers cannot run. Turning isolation on site-wide would risk breaking every cross-origin CDN asset (see §7). |
| Heavy reliance on cross-origin CDNs | `app/_components/runtime/cdn.ts` — jsDelivr (Pyodide-adjacent assets, PGlite, Plotly, Mermaid, TypeScript compiler), unpkg (tools.jar) | Reinforces the above: COEP `require-corp` would subject all of these to CORP/CORS audit. Also: the "load heavy runtime from pinned CDN" pattern the new playgrounds should reuse is already established. |
| Editor is **CodeMirror 6**, not Monaco | `Playground.tsx`, `ts-language-worker.ts`, prior report `20260702-0325-intellisense-codemirror-wasm-feasibility.md` | Libraries that bring their own editor (Sandpack, LiveCodes, @vue/repl's Monaco variant) would introduce a second editor stack — a real UX/bundle cost to weigh against build effort saved. |
| Existing `LanguageAdapter` contract with per-scope runtime registry | `app/_components/types.ts:225`, `runtimeRegistry.ts`, `adapters.ts` | A hand-built web adapter ("html", "react") slots into existing infrastructure: tabs/VFS, examples, export, formatter (`webFmt.ts` already formats HTML/CSS/JS), boot-size messaging (`coldDownloadMB`). |
| JS/TS already run in an almostnode worker with a TS language service worker for intellisense | `javascript.tsx`, `typescript-worker.ts`, `tsLanguageService.ts` | The web playgrounds are *additive*, not a replacement: almostnode covers Node-style console programs; web playgrounds cover DOM/preview programs. The TS worker (jsDelivr-pinned `typescript@5.7.3`) can be reused for TSX intellisense. |
| No service worker is currently registered | grep across `app/`, `public/`, `lib/` | The SW-virtual-server pattern (§4.3) is net-new infrastructure — powerful but a Tier-2 step, not the starting point. |

---

## 3. Taxonomy: playground types and what each requires

All of these are achievable client-side. Sorted from cheapest to most involved:

1. **HTML/CSS/JS live preview** (CodePen/JSFiddle style) — native primitives only. Three editor panes → composed document → sandboxed iframe. No transform step at all.
2. **HTML/CSS/JS + Tailwind** — same, plus one `<script>` for `@tailwindcss/browser` inside the preview document.
3. **JS-with-modules / npm packages, no build step** — native ES modules + import maps in the preview document; bare specifiers resolved via esm.sh or an inline import map. Optionally `es-module-shims` for older-browser import-map support.
4. **React (JSX) / TypeScript-React** — adds an in-browser transform (esbuild-wasm or Babel standalone) run in a Web Worker, then executes as type-3.
5. **Vue SFC** — adds `@vue/compiler-sfc` (via the official `@vue/repl` component or its store) — fully client-side, proven by play.vuejs.org.
6. **Svelte** — adds the Svelte compiler (+ small bundling step) in a worker — fully client-side, proven by svelte.dev/playground.
7. **Multi-file "project" with real URLs** (`/about.html`, `/styles/site.css`, fetchable assets) — Service Worker virtual server pattern (playground-elements / WordPress Playground).
8. **Full Node dev-server-in-browser (Vite/Next.js actually running)** — only WebContainers/Nodebox do this; both carry licensing and/or COOP/COEP costs that conflict with DataSlope's setup (§6, §7). Not needed for the course goals above.

The refuted-claim warning that bounds this taxonomy: **esm.sh cannot act as the build step for Vue SFC or Svelte files** — a claim that it transpiles `.vue`/`.svelte` on the fly was tested and refuted (1–2 vote) during verification. Vue/Svelte need their own client-side compilers (types 5/6); only React/TS transforms can lean on generic tooling.

---

## 4. Architectures on native browser primitives

### 4.1 The preview sandbox: `iframe` + `srcdoc`/blob URLs

The core of types 1–4. Verified mechanics and best practices:

- `srcdoc` inlines a full HTML document into the iframe, overriding `src`; special characters must be HTML-escaped. Re-render by swapping `srcdoc` (debounced ~300–500 ms while typing, or on explicit Run). Blob URLs (`URL.createObjectURL(new Blob([html], {type: "text/html"}))`) are the alternative when a real URL is useful (e.g. so relative fetches and `<base>` behave predictably); revoke old blobs to avoid leaks.
- **Sandbox attribute semantics (the critical security detail):** start from bare `sandbox` (unique opaque origin, everything off) and add back only what's needed — typically `sandbox="allow-scripts allow-modals"` for a course playground. Two verified rules:
  - **Never combine `allow-scripts` with `allow-same-origin` on same-origin content.** `srcdoc` content is same-origin with the embedding page, and the HTML spec warns this combination lets the embedded script reach up and *remove its own sandbox attribute*. web.dev's canonical guidance: `allow-scripts` **without** `allow-same-origin` gives scripts a unique opaque origin that cannot touch the parent. (A popular tutorial claiming the combination is safe was flagged as spec-dubious during verification.)
  - **Origin separation for anything beyond an opaque-origin iframe** (verified verbatim from playground-elements docs): the preview must be served from "a different origin to the origin hosting the Playground components" and that origin "must not have access to any sensitive cookies" — otherwise student code could modify the host page or exfiltrate auth tokens. playground-elements defaults its sandbox origin to a CDN for exactly this reason. As DataSlope adds auth/membership, the cheapest robust move is serving preview documents from a dedicated subdomain or a separate workers.dev host with no cookies.
- **Console/error bridge:** inject a tiny script at the top of the preview document that wraps `console.*`, `window.onerror`, and `unhandledrejection`, forwarding serialized entries to the parent via `postMessage`. The parent listens and renders them in the existing playground output panel. Always specify/verify `targetOrigin` on both ends; `structuredClone`-unfriendly values need a serializer (the existing `valueFormat.ts` conventions apply).
- **Runaway-code protection:** an infinite loop in the preview freezes only the iframe, not the parent — recover by tearing down and re-creating the iframe (cheap, since state lives in the editors). A watchdog ping over `postMessage` can detect the freeze and offer a "Stop" affordance.

**Fit:** this is a new *surface* rather than a new runtime — an adapter whose `run()` composes the document and swaps it into a preview pane. The existing `outputCapabilities` concept extends naturally with a `preview` channel.

### 4.2 Module resolution without a bundler: import maps + esm.sh

- **esm.sh** (verified): "a no-build JavaScript CDN … allows you to import JavaScript modules from http URLs, no installation/build steps needed." Serves npm, JSR, and GitHub packages as ES modules — `import React from "https://esm.sh/react@18"`. This is how student code gets npm packages with zero bundling. Pin versions in generated import maps for reproducible course content (matching the repo's existing version-pinning discipline in `cdn.ts`).
- **Import maps** are native in all evergreen browsers; the playground can generate one per run mapping bare specifiers (`react`, `react-dom/client`) to pinned esm.sh URLs. `es-module-shims` (used by the Vue REPL) polyfills import maps where needed and lifts native limitations (e.g. multiple/late-inserted maps).
- **Boundary (verified + refuted-claim):** esm.sh's `/tsx` loader (~1 KB script enabling `<script type="text/tsx">` directly in HTML) compiles **at esm.sh's edge servers** in production — only its localhost dev mode transforms locally — with a 128 KB inline-source limit. For a strictly client-side platform, treat esm.sh as the *package URL* layer only and do transforms with esbuild-wasm/Babel in a worker. And per §3, it does not transpile `.vue`/`.svelte` sources.

### 4.3 Service Worker as a virtual web server (multi-file projects)

Verified 3–0 against two independent production systems:

- **playground-elements** (Google/Lit, BSD-3-Clause): "Playground never sends code to a backend server. Instead, Playground uses a Service Worker to create a virtual URL-space that runs 100% within the browser… if you can host static files, you can host a Playground."
- **WordPress Playground**: a Service Worker "intercepts all HTTP traffic on the current domain and passes it to the Worker Thread," where the WASM PHP runtime produces the response.

The pattern: student files live in an in-memory VFS; the SW intercepts `fetch` for a scoped URL namespace (e.g. `/playground-preview/<session>/...`) and answers from the VFS; the preview iframe points at a URL in that namespace, so relative links, CSS `url()`, `fetch("./data.json")`, and multi-page navigation all *just work*. This generalizes to any runtime behind the worker thread — including, potentially, almostnode serving HTTP in a future "Node server course" without WebContainers.

Costs: net-new SW lifecycle management (registration, scope, updates) in a repo that has none; and **previews fail where Service Workers are unavailable** (e.g. Firefox private browsing) — ship a fallback message. This is the Tier-2 step: adopt when courses need multi-file projects with real URLs, not for the first HTML/CSS/JS release.

---

## 5. In-browser transform toolchains (for React/JSX/TS variants)

| Tool | License | What it gives a playground | Verified caveats |
| --- | --- | --- | --- |
| **esbuild-wasm** | MIT | Official WASM build of esbuild; browser is a first-class target (`"browser": "lib/browser.js"` entry, `initialize({wasmURL})` in a worker). Transforms **and bundles** JSX/TSX/TS, minifies. The strongest primitive. | ~10× slower than native esbuild (still fast for snippet-scale code); no filesystem — bundling multi-file/npm code needs a resolver plugin that reads the VFS and fetches CDN URLs (a well-trodden pattern: resolve bare imports → unpkg/esm.sh, fetch, feed back to esbuild). v0.28.1 current (June 2026). |
| **@babel/standalone** | MIT | Official browser build, *explicitly endorsed* for "sites that compile user-provided JavaScript in real-time" — docs name JSFiddle, JS Bin, JSitor, the Babel REPL. Zero-integration mode: auto-compiles `<script type="text/babel">` with `data-presets="env,react,typescript"`. Transform-only (no bundling) — pairs with import maps/esm.sh. | ~2–3 MB bundle; slower than esbuild/SWC. The docs' "don't use in production" advice targets AOT app compilation, not playgrounds (this distinction was explicitly verified). v8.0.3 current (June 2026). |
| **@swc/wasm-web** | Apache-2.0 | Rust-based transform in WASM; speed between Babel and esbuild. | Covered by search but no claim about it survived to verification — treat as an unverified alternative; esbuild-wasm dominates it for this use case anyway (bundling included). |
| **Sucrase** | MIT | Tiny, very fast dev-only transpiler (JSX/TS → JS). | Same status: viable lightweight option, unverified in this pass; no bundling, fewer syntax guarantees. |
| **@tailwindcss/browser (v4)** | MIT (Tailwind Labs official) | One CDN script tag inside the preview document compiles utility classes fully client-side, including custom `@theme` CSS. The v3-era "Play CDN" use case, now a real published package (v4.3.2, June 2026). | Officially "designed for development purposes only, and is not intended for production" — acceptable for a learning playground (it *is* a dev context) but document it; expect runtime style-generation cost and possible flash-of-unstyled-content on first paint. |

**Recommended pairing:** esbuild-wasm in a dedicated worker as the primary transform+bundle engine (mirrors the repo's existing worker-per-runtime pattern and its jsDelivr-pinned loading), with Babel standalone as the fallback/simplest-thing-that-works if bundling is deferred in favor of import maps. Reuse the existing TS language-service worker for TSX intellisense — `jsx: react-jsx` support is already in the pinned `typescript` package.

---

## 6. Container runtimes and ready-made embeddables

### 6.1 WebContainers (StackBlitz) — avoid

- Runs real Node.js (hence real Vite/Next dev servers) in the browser via WASM. But it **requires `SharedArrayBuffer`**, which requires the embedding site to be cross-origin isolated (`COOP: same-origin` + `COEP: require-corp`) — verified against StackBlitz's own docs and MDN. §7 explains why that's disqualifying for DataSlope.
- Commercial terms: WebContainers has an enterprise/commercial licensing program (webcontainers.io/enterprise); free tiers exist for open-source/non-commercial contexts, but exact pricing/limits for an education platform were **not** verified in this pass — moot given the header conflict.

### 6.2 Sandpack + Nodebox (CodeSandbox) — usable only in its Apache-2.0 subset

Verified 3–0, including a verifier independently downloading the Nodebox tarball to read its license:

- The embeddable libraries — `@codesandbox/sandpack-react`, `sandpack-client`, and the **client-side sandpack-bundler** — are **Apache-2.0**: freely usable and self-hostable commercially. This is what react.dev uses for its interactive examples (Sandpack was built for exactly that).
- **But** every template that runs on the **Nodebox** runtime — **Next.js, all Vite-based templates, Astro, Node** — is excluded from free commercial use. Sandpack's FAQ verbatim: "For commercial usage, you can freely use all Sandpack templates except: nextjs, any vite template, astro, node… covered by the Nodebox license and a EULA," and "we are not open-sourcing Nodebox." Nodebox ships under CodeSandbox's **Sustainable Use License v1.0** (non-commercial/internal-use only; fails the OSI definition); the npm package is just a connector to a runtime served from CodeSandbox's CDN.
- Nodebox's design tradeoff (relevant context): it deliberately avoids `SharedArrayBuffer` so it runs without COOP/COEP — at the cost of no synchronous cross-process communication, no emulated Node event loop (manual `process.exit()`), missing `async_hooks`/`vm`/`worker_threads`, and higher memory with multiple processes.
- **Net for DataSlope:** the plain React/vanilla browser-bundler templates are license-safe and battle-tested; the moment a course wants Vite/Next "real project" templates inside Sandpack, it crosses into restricted territory. Also note Sandpack brings its own editor (CodeMirror-based, but its own component stack) and its bundler is a hosted iframe by default — self-hosting the bundler is supported and documented, adding a deploy artifact.

### 6.3 LiveCodes — strongest turnkey option (MIT)

Verified 3–0 across five sources:

- "Client-side code playground for React, Vue, Svelte, Solid, TypeScript, Python, Go, Ruby, PHP and 90+ languages/frameworks"; docs: "All processing and code transformations run in the browser on the client-side." **There is no server.** MIT license, no fees/ads/usage limits; commercial and self-hosted use permitted.
- Self-hosts by serving a release from **any static file server** — directly compatible with DataSlope's Cloudflare setup (could live on a subdomain, which doubles as the §4.1 origin separation). Embeds via a lightweight SDK (`npm i livecodes`, ~423 KB unpacked, React wrapper included, CDN-loadable).
- Caveats: the SDK loads the app from livecodes.io **unless `appUrl` points at a self-hosted origin** (configure this); optional features (permanent share links, broadcast, auth) need external services; runtime assets load from CDNs (same pattern as DataSlope today); language depth varies (some targets are transpile-only); bundled third-party runtimes keep their own licenses (`vendor-licenses.md`).
- Tradeoff vs. hand-built adapters: enormous breadth for near-zero build cost, but it's a full foreign IDE in an iframe — its own editor (Monaco/CodeMirror/CodeJar), theming, and layout, visually distinct from DataSlope's CodeMirror-6 playground chrome. Best fit: long-tail framework variants (Vue/Svelte/Solid) where hand-building each compiler integration isn't justified yet.

### 6.4 playground-elements (Google/Lit) — best-in-class reference, embeddable as-is

- BSD-3-Clause web components (`<playground-ide>`, `<playground-code-editor>` — CodeMirror-based, `<playground-preview>`). Compiles `.ts/.tsx/.jsx` in a **web worker with the TypeScript compiler** (target ES2021, `jsx: react`), resolves bare npm imports in-browser via Node-style resolution against a CDN (unpkg default, `cdnBaseUrl` configurable), honoring `package.json` dependencies, export conditions, and import maps; serves the result through its Service Worker virtual URL-space. v0.21.2 (Oct 2025) current.
- Verified limitations: TS is *transpiled, not bundled* (the SW + CDN resolution fills the gap); import maps support only the `imports` field — no `scopes` (issue #103), no transformation inside HTML files (#93), no application to transitive deps (#104).
- Value to DataSlope even if not embedded: it is the cleanest open reference implementation of §4.1 + §4.3 + §5 combined, in a permissive license, worth reading before hand-building.

---

## 7. The COOP/COEP fault line (why container runtimes conflict with DataSlope)

This is the decisive infrastructure finding (verified 3–0):

- `SharedArrayBuffer` — required by WebContainers — is gated behind **cross-origin isolation**: `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp` on the embedding pages.
- Under `COEP: require-corp`, **every cross-origin subresource must opt in** via CORP headers or CORS-with-`crossorigin`-attribute — or it fails to load. DataSlope's playground stack is built on cross-origin CDN assets: jsDelivr (Pyodide ecosystem assets, PGlite, Plotly, Mermaid, the TypeScript compiler), unpkg (tools.jar), plus the runtimes' own lazy-loaded chunks. Each would need auditing; any asset (or transitively-loaded chunk) without proper CORP/CORS breaks. The `COEP: credentialless` variant relaxes some of this but still requires isolation and has its own compatibility surface. *(Caveat: "DataSlope's specific CDN set would break" is a spec-grounded inference confirmed by verifiers against MDN/StackBlitz docs — not an empirical test against the deployed site.)*
- Isolation also changes popup/opener behavior (`COOP: same-origin` severs `window.opener` relationships), which can affect OAuth flows as auth/membership lands.

**Conclusion:** none of the recommended approaches (iframe+srcdoc, esbuild-wasm/Babel workers, import maps/esm.sh, SW virtual server, playground-elements, LiveCodes, Vue/Svelte REPL engines) need COOP/COEP. Do not adopt any architecture that forces site-wide isolation unless a future course track absolutely requires WebContainers — and then only after a full CDN asset audit, or by hosting that track on an isolated separate origin.

---

## 8. Framework-official playgrounds worth imitating

- **react.dev** → Sandpack (Apache-2.0 subset; browser bundler). The reference for inline-course-content React examples. If DataSlope prefers not to hand-build the React adapter, this exact stack is the proven alternative.
- **Vue → `@vue/repl`** (verified directly): MIT, the component behind play.vuejs.org. Fully client-side — virtual file system + `@vue/compiler-sfc` compiling SFCs in the browser, executed via **es-module-shims + import maps** with CDN-loaded packages (jsDelivr default, configurable). TypeScript support via Volar in its Monaco variant; also ships a CodeMirror editor variant (lighter, fewer language features). **Persists state to the URL hash via `store.serialize()`** (deflate+base64) — the pattern to copy for sharing (§10). It's a Vue 3 component: embedding into the Next/React site means mounting a small Vue island (or embedding a self-hosted page in an iframe — which §4.1 favors anyway for origin separation).
- **Svelte** (verified location; mechanism medium-confidence): the old `sveltejs/svelte-repl` repo is archived (Dec 2021); the live implementation is `packages/repl` in the `sveltejs/svelte.dev` monorepo — "the code for the REPL component that's available on https://svelte.dev/playground". It compiles fully client-side (Svelte compiler + bundling in a web worker; Rollup-in-browser historically). Less cleanly packaged for external embedding than `@vue/repl` — treat as a reference implementation, or cover Svelte via LiveCodes.
- **TypeScript Playground sandbox** (`typescriptlang.org/dev/sandbox`): Monaco-based, less directly relevant since DataSlope already has TS execution + CodeMirror intellisense; its main lesson is URL-state design (lz-string-compressed code in the hash).

---

## 9. Recommendations for DataSlope

### Tier 1 — build now, native primitives (days → ~2 weeks total)

1. **`web` (HTML/CSS/JS) LanguageAdapter** — 3 tabs (or the existing multi-file tabs with `.html/.css/.js` extensions, which `webFmt.ts` already formats), compose → sandboxed iframe (`sandbox="allow-scripts allow-modals"`, **never** `allow-same-origin`), console/error bridge over `postMessage`, debounced auto-run toggle + explicit Run, iframe teardown as the stop/reset story. Zero new dependencies, zero license cost, no COOP/COEP. Effort: days.
2. **Tailwind variant** — a per-playground toggle injecting the pinned `@tailwindcss/browser@4` script into the preview document, with a small "dev-compiler" disclaimer. Effort: ~a day on top of (1).
3. **`react` / TSX adapter** — esbuild-wasm in a dedicated worker (pinned from jsDelivr like every other runtime; add `coldDownloadMB`), VFS-resolver plugin for multi-file code, bare imports → pinned esm.sh URLs (fetch-and-bundle, or import-map passthrough to start), output executed in the same sandboxed preview. Reuse the TS language-service worker for TSX intellisense. Fallback simplification: Babel-standalone transform + import maps, no bundling. Effort: ~1–2 weeks.
4. **Origin separation, before auth ships:** serve preview documents from a cookie-less separate origin (subdomain or second workers.dev host). With bare-`sandbox` opaque origins this is defense-in-depth today; it becomes mandatory the day the main origin holds session cookies.

### Tier 2 — when courses need multi-file projects with real URLs (~1–3 weeks)

5. **Service-Worker virtual server** scoped to a preview URL namespace, backed by the playground VFS (pattern per playground-elements / WordPress Playground; read playground-elements' `playground-service-worker-proxy.ts` first). Ship a fallback notice for SW-unavailable contexts (Firefox private browsing). This also future-proofs a "Node HTTP server" course angle via almostnode without WebContainers.

### Tier 3 — framework breadth (evaluate)

6. **Vue:** embed `@vue/repl` (MIT) — as a self-hosted page in an iframe (aligns with origin separation) or a Vue island. **Svelte:** compiler-in-worker following the svelte.dev REPL, or defer to (7).
7. **LiveCodes (MIT), self-hosted on a subdomain** with `appUrl` pointed at it and external-service features disabled — one embed buys Vue/Svelte/Solid and 90+ targets at the cost of a visually foreign IDE. Prototype the SDK integration before committing (see open questions).

### Avoid

- **WebContainers** — COOP/COEP conflict with the CDN-loaded WASM stack (§7) + unverified commercial terms.
- **Sandpack Nodebox templates** (Next.js/Vite/Astro/Node) — Sustainable Use License excludes free commercial use. (Plain Apache-2.0 Sandpack React templates remain an acceptable alternative to Tier-1 item 3 if a maintained embed is preferred over a hand-built adapter.)
- **esm.sh/tsx as the transform** — production path compiles on esm.sh's edge, not client-side; and esm.sh does not transpile `.vue`/`.svelte` (refuted claim).

---

## 10. Persistence & URL sharing

(Weakest-evidence section — patterns are established practice and observed in the official REPLs, but tradeoffs weren't independently verified in this pass.)

- **Local persistence:** the playground already persists per-adapter state via localStorage keys (`LanguageAdapter.id` is documented as the localStorage key); web adapters inherit this for free.
- **Shareable URLs, serverless:** compress the full file set into the URL hash — `@vue/repl` does exactly this (`store.serialize()` → deflate+base64), the TS playground uses lz-string. Hash fragments never hit the server (good: no Workers involvement; caveat: practical URL-length ceilings ~2–8 KB compressed, fine for lesson-scale snippets).
- **If short share links are wanted later:** a tiny D1/KV-backed snippet store is the Cloudflare-native step up — but it's optional, and external share services (like LiveCodes' dpaste default) should stay disabled for a learning platform.

---

## 11. Verification caveats & open questions

**Caveats carried over from the adversarial-verification pass:**
- All findings rest on primary/vendor documentation verified live on 2026-07-06 — not on hands-on integration testing with this codebase or independent benchmarks. Performance notes (esbuild-wasm ~10× slower than native, Babel ~2–3 MB, Tailwind browser-compile cost) come from official docs, not measurements here.
- Licensing terms are vendor policy and time-sensitive (Sandpack/Nodebox restrictions, Tailwind's dev-only designation current as of July 2026). Re-check before shipping anything commercial-adjacent.
- Effort estimates in §9 are engineering inference from component complexity, not verified claims.
- playground-elements import maps: `imports` field only (no `scopes`, no transitive application). SW previews fail without Service Worker support.

**Open questions for follow-up spikes:**
1. Vue/Svelte adapter ergonomics: how cleanly does `@vue/repl` mount inside the Next.js app (Vue island vs. iframe embed), and what does a worker-hosted Svelte compiler cost in bundle size and compile latency at lesson scale?
2. LiveCodes SDK fit: iframe communication, theming to match DataSlope, disabling external share/auth features, `appUrl` on a cookie-less subdomain — worth a half-day prototype before choosing Tier 3's path.
3. esbuild-wasm resolver plugin design: import-map passthrough (fast, no bundling; each esm.sh module fetched by the browser) vs. fetch-and-bundle (single artifact, offline-friendlier, heavier) — pick per course needs.
4. WebContainers commercial terms — only worth pursuing if a Node-infrastructure course someday justifies an isolated-origin sub-site.

---

## 12. Key sources

**Primary (all verified live 2026-07-06):**
- playground-elements — https://github.com/google/playground-elements (architecture, security rules, TS-in-worker, CDN resolution)
- WordPress Playground architecture — https://wordpress.github.io/wordpress-playground/developers/architecture/browser-service-workers/ (SW virtual server)
- Babel standalone docs — https://babeljs.io/docs/babel-standalone/ (official playground endorsement)
- esbuild WASM docs / npm — https://esbuild.github.io/getting-started/#wasm, https://www.npmjs.com/package/esbuild-wasm (browser entry, MIT)
- esm.sh — https://github.com/esm-dev/esm.sh (no-build CDN; /tsx edge-compile caveat)
- Tailwind Play CDN / @tailwindcss/browser — https://tailwindcss.com/docs/installation/play-cdn
- Sandpack FAQ & repo — https://sandpack.codesandbox.io/docs/resources/faq, https://github.com/codesandbox/sandpack (Apache-2.0 core vs. Nodebox template restrictions)
- Nodebox runtime license — https://github.com/Sandpack/nodebox-runtime (Sustainable Use License)
- LiveCodes — https://github.com/live-codes/livecodes, https://livecodes.io/docs/features/self-hosting, https://livecodes.io/docs/license
- WebContainers headers/quickstart — https://webcontainers.io/guides/configuring-headers, https://webcontainers.io/guides/quickstart (COOP/COEP requirement)
- COOP/COEP — https://web.dev/articles/coop-coep; sandboxed iframes — https://web.dev/articles/sandboxed-iframes
- Vue REPL — https://github.com/vuejs/repl (MIT, es-module-shims, URL-hash serialize)
- Svelte REPL — https://github.com/sveltejs/svelte-repl (archived) → https://github.com/sveltejs/svelte.dev `packages/repl`
- TypeScript sandbox — https://www.typescriptlang.org/dev/sandbox/

**Secondary/blog (implementation walkthroughs):**
- iframe srcdoc preview walkthrough — https://mionskowski.pl/posts/iframe-code-preview/
- Compiling React in the browser with esbuild-wasm — https://cacoos.com/blog/compiling-in-the-browser
- Running esbuild in the browser — https://schof.co/running-esbuild-in-the-browser/
- es-module-shims & production import maps — https://guybedford.com/es-module-shims-production-import-maps
