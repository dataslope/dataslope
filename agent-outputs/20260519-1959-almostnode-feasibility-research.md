# almostnode Feasibility Research
## Replacing the JS/TS Playground Runtimes with almostnode for Multi-File Module Resolution

**Date:** 2026-05-19  
**Status:** Research Complete — Implementation-Ready  
**Repo context:** `subwaymatch/dataslope-playground`

---

## Executive Summary

almostnode is a **viable replacement** for the current JavaScript and TypeScript playground runtimes, and the upgrade is highly recommended for any scenario that requires multi-file editing, npm package installation, or Node.js API access. The migration is low-risk for the JS/TS playgrounds specifically because:

1. The existing `LanguageRuntime` interface already has a `prepareFileSystem?` hook designed exactly for this use case.  
2. almostnode's `~250 KB` gzip footprint is smaller than the `~10 MB` TypeScript compiler bundle already loaded by the TS playground.  
3. No breaking changes are required in the `LanguageAdapter` contract — almostnode slots into the existing `init() → run()` lifecycle.

The main costs are: a mandatory service worker (for dev-server features), a cross-origin sandbox deployment (for user-safety), and non-trivial migration work around the OPFS↔VirtualFS bridge.

---

## 1. Multi-File Module Resolution

### 1.1 ES Modules

almostnode's `Runtime` class executes code via CommonJS only. It does **not** natively run ESM (`import`/`export` syntax at the module level). Two mechanisms bridge the gap:

| Scenario | How almostnode handles it |
|---|---|
| User writes `import x from './x.js'` in source | The TypeScript transpiler (or esbuild-wasm) compiles it to `const x = require('./x.js')` before execution. |
| npm package is pure ESM | `PackageManager` runs esbuild-wasm to transform ESM → CJS before writing to `/node_modules/`. This can be disabled per-package with `{ transform: false }`. |
| Framework dev servers (`NextDevServer`, `ViteDevServer`) | Redirect bare imports (`import React from 'react'`) to `https://esm.sh/react@version` for browser-native ES module loading. This path bypasses the `Runtime` entirely. |

**Impact for this codebase:** The current TS worker already calls `ts.transpileModule` with `module: ModuleKind.ESNext` and then runs the output through `AsyncFunction`. almostnode would replace that `AsyncFunction` call with `runtime.runFile()`, and the `require()` calls produced by `transpileModule` will resolve correctly through almostnode's CommonJS resolution chain.

**Dynamic imports (`import()`):** The `Runtime` shims the `module` built-in but `import()` is a browser-native async expression that is evaluated by the JS engine, not by almostnode's module resolver. Dynamic imports will only work if the target is a URL (e.g., `esm.sh`) — they will **not** resolve VirtualFS paths. For user code that needs dynamic requires, the pattern `const m = require(variable)` works because almostnode handles it at runtime.

### 1.2 CommonJS

Full support. The runtime follows Node.js CJS resolution order exactly:

1. Built-in module (`require('fs')`, `require('node:path')`)
2. Relative path (`require('./utils')`) — auto-appends `.js`, `.ts`, `.json`, `/index.js` in that order
3. npm package lookup (`require('lodash')`) — walks up `/node_modules/` directories

`module.exports`, `exports`, `__dirname`, `__filename`, and `require.resolve` are all shimmed correctly.

### 1.3 npm Package Resolution

`PackageManager` fetches directly from `registry.npmjs.org` and `cdn.npmjs.com`. Steps:

1. Resolve semver against the npm registry metadata API.
2. Recursively build the full dependency tree (handles version de-duplication).
3. Download `.tgz` tarballs from the npm CDN.
4. Decompress and extract into `/node_modules/{name}/` inside VirtualFS.
5. Optionally run esbuild-wasm to convert ESM-only packages to CJS.
6. Write `.package-lock.json`.

**CORS requirement:** The npm registry (`registry.npmjs.org`) serves packages with `Access-Control-Allow-Origin: *`. No proxy is needed for standard npm packages.

**Private registries:** Not natively supported. Would need a custom `PackageManager` subclass or CORS-enabled proxy.

**Native modules (`.node` binaries):** Stubbed only. Packages like `bcrypt`, `node-gyp`, `canvas`, `sharp`, or `better-sqlite3` will either fail or return stubs. Pure-JS alternatives (e.g., `bcryptjs` instead of `bcrypt`) work.

**Binary CLI tools:** Packages with `bin` entries work — `npm install` creates stubs in `/node_modules/.bin/`. This means `vitest`, `eslint`, `tsc`, `prettier`, etc. all execute via `container.run()`.

### 1.4 tsconfig Path Aliases

Path aliases (e.g., `@/*` → `./src/*`) are supported in two ways:

- **Framework dev servers:** `NextDevServer` reads `next.config.js` with `experimental.paths`. `ViteDevServer` reads `vite.config.ts` aliases.
- **Raw Runtime:** No tsconfig alias resolution is built in. Aliases would need to be pre-processed by the TypeScript compiler before the resulting JS hits the runtime. Since the existing TS worker already calls `ts.transpileModule`, any `paths` defined in `compilerOptions` will be resolved at transpile time (output paths become relative requires) — no extra plumbing required.

### 1.5 Circular Dependencies

The Runtime follows Node.js circular dependency semantics for CJS: when module A requires B which requires A, B receives A's partially-initialized `exports` object. This is identical to Node.js behavior and is fully functional for all common circular-dep patterns.

### 1.6 Filesystem Integration Requirements

| Requirement | almostnode behavior |
|---|---|
| In-memory VirtualFS | Yes — `new VirtualFS()` is purely in-memory |
| Persistence across reloads | Not built-in — VirtualFS is wiped on page reload unless serialized |
| OPFS integration | **Not provided** — requires a bridge (see §4.4 and §6.4) |
| File watching for HMR | Built-in via `vfs.watch()` — used by `NextDevServer.start()` |
| Binary file support | Yes — `readFileSync` / `writeFileSync` accept `Uint8Array` |
| Snapshots | `vfs.toSnapshot()` / `VirtualFS.fromSnapshot()` — JSON-serializable |

**Key gap:** The existing playground uses OPFS (`FileSystemDirectoryHandle`) as the persistence layer, while almostnode VirtualFS is in-memory. A bridge is required (see §6.4).

---

## 2. Remote Network Access

### 2.1 HTTP/HTTPS Requests

The almostnode `Runtime` shims both the Node.js `http` and `https` modules. Internally, these shims are backed by the browser's `fetch` API. This means:

- `http.get()`, `https.get()`, `http.request()`, `https.request()` all work.
- Standard `fetch()` is available as a browser global inside the runtime.
- **CORS applies.** Requests to third-party APIs that don't set `Access-Control-Allow-Origin: *` will be blocked by the browser. This is unavoidable without a proxy.
- **SSL/TLS is handled by the browser.** The `tls` and `net` modules are stubbed (no real TCP socket support).
- `axios`, `node-fetch`, `got`, `ky` — all work because they ultimately call `http`/`https` or the browser's `fetch`.

### 2.2 CORS Proxy

For APIs that don't send permissive CORS headers, a CORS proxy is the only viable workaround. Options:

1. **Deploy a proxy endpoint** (e.g., `/api/proxy?url=...`) as a Next.js route handler. The playground's runtime code would call `fetch('/api/proxy?url=...')` instead of the target URL directly.
2. **Third-party proxies** (`corsproxy.io`, `allorigins.win`) — acceptable for non-sensitive public APIs but unsuitable for authenticated or private endpoints.
3. **User-supplied proxy** — expose a setting where users specify a proxy URL. Similar to the BYOK AI pattern already in this codebase.

### 2.3 CORS Proxy via Service Worker

> **New research (2026-05-19):** Can a single service worker provide transparent CORS proxying for all playground runtimes, and would this create conflicts between competing service workers?

#### Feasibility: Yes — a single root-scope SW is the right approach

A service worker registered at the root scope (`/`) can intercept `fetch()` calls from both the main page and from every **dedicated Web Worker** the page spawns. All current runtimes in this codebase run in dedicated Web Workers:

| Runtime | Execution context | SW can intercept user fetches? |
|---|---|---|
| JavaScript | `javascript-worker.ts` (Web Worker) | ✅ Yes |
| TypeScript | `typescript-worker.ts` (Web Worker) | ✅ Yes |
| Python (Pyodide) | `pyodide-worker.ts` (Web Worker) | ✅ Yes |
| R (WebR) | Web Worker | ✅ Yes |
| PHP | Web Worker | ✅ Yes |
| C / C++ / C# / Java | Web Worker | ✅ Yes |
| SQLite / PostgreSQL / DuckDB | Web Worker / WASM | ✅ Yes (if any user fetch is made) |

Browser support for SW interception of Worker `fetch()` events:
- **Chrome** 68+ ✅
- **Firefox** 84+ ✅
- **Safari** 14.1+ ✅ (SW interception of worker fetches was a known gap in older Safari versions)

First-load caveat: a dedicated worker created during the first page load before the SW has activated may not be controlled by the SW. This is a one-time issue on the very first visit; subsequent loads have all workers controlled.

#### No conflicts between service workers — IF implemented as a single merged SW

The Service Worker specification guarantees that **a client (page) is controlled by exactly one SW** — the one with the most specific matching scope. Consequences:

1. **Two SWs at the same root scope (`/`)** cannot co-exist. When a new SW registers at the same scope, it enters the "waiting" state and takes over on the next page load, replacing the old SW. Having both an almostnode virtual-server SW and a separate CORS-proxy SW registered at `/` would cause them to fight for control on every update cycle.

2. **Two SWs at different sub-scopes** (e.g., `/playground/python/` and `/playground/javascript/`) are isolated from each other — each only controls its own scope's clients. However, this approach conflicts with almostnode's requirement that its SW lives at the root scope (to intercept `/__virtual__/{port}/` requests).

3. **Conclusion: merge both responsibilities into one SW file.** A single root-scope SW can simultaneously handle almostnode's `/__virtual__/` routing AND CORS proxy interception. There is no inherent conflict once they are co-located in the same SW.

#### Implementation pattern for the merged SW

The CORS proxy logic intercepts outbound cross-origin fetches from worker contexts and rewrites them to pass through a server-side route handler (e.g., `/api/cors-proxy`):

```js
// __sw__.js  (merged almostnode + CORS proxy)

// --- almostnode virtual-server routing (unchanged) ---
import { createServiceWorkerHandler } from 'almostnode/sw';
const almostnodeHandler = createServiceWorkerHandler();

// --- CORS proxy routing ---
const PROXY_ENDPOINT = '/api/cors-proxy';

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. almostnode virtual paths (highest priority)
  if (url.pathname.startsWith('/__virtual__/')) {
    event.respondWith(almostnodeHandler(request));
    return;
  }

  // 2. Transparent CORS proxy for opted-in cross-origin requests
  //    Runtimes set the X-Cors-Proxy header to signal proxy intent.
  if (
    request.headers.has('X-Cors-Proxy') &&
    url.origin !== self.location.origin
  ) {
    event.respondWith(
      fetch(
        `${PROXY_ENDPOINT}?url=${encodeURIComponent(request.url)}`,
        {
          method: request.method,
          headers: (() => {
            // Strip the sentinel header before forwarding
            const h = new Headers(request.headers);
            h.delete('X-Cors-Proxy');
            return h;
          })(),
          body: request.method === 'GET' || request.method === 'HEAD'
            ? undefined : request.body,
          duplex: 'half',
        },
      ),
    );
    return;
  }
  // 3. All other requests: pass through normally
});
```

The server-side route handler at `app/api/cors-proxy/route.ts`:

```ts
// Very minimal — add auth / allowlist / rate-limit as needed
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');
  if (!target) return new Response('Missing url', { status: 400 });
  const upstream = await fetch(target, {
    headers: { 'User-Agent': 'dataslope-cors-proxy/1.0' },
  });
  const body = await upstream.arrayBuffer();
  return new Response(body, {
    status: upstream.status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/octet-stream',
    },
  });
}
```

#### Distinguishing runtime-internal fetches from user-code fetches

The tricky problem is that runtimes themselves make many cross-origin fetches that work fine without proxying (Pyodide loading from `cdn.jsdelivr.net`, WebR loading from `webr.r-wasm.org`, DuckDB loading WASM from jsDelivr, etc.). Proxying all cross-origin fetches would be wasteful and potentially break CDN caching.

**Recommended approach: opt-in via a request header from the runtime adapter**

Each runtime adapter that supports user-driven HTTP requests (JS, TS, Python, R) wraps the user's `fetch` global (or the `http`/`https` shim) to inject an `X-Cors-Proxy: 1` header before the request leaves the worker. The SW only proxies requests carrying this header. Runtime-internal fetches (loading WASM, loading packages) never set this header and are not affected.

For Python specifically, since Pyodide patches `XMLHttpRequest` and `fetch` internally, the adapter can monkey-patch the patched version to inject the header on requests made from user Python code (after `pyodide.runPythonAsync` begins execution).

**Alternative approach: passive retry on opaque/failure**

The SW attempts the original request. If the response is `type === 'opaque'` (no-cors mode) or a network error, it retries via the proxy. This requires no changes to the runtime adapters but doubles round-trips for proxied requests and adds latency. Not recommended as the primary strategy.

#### Security considerations for the CORS proxy

- **Authentication headers in proxied requests:** The proxy route on the server strips cookies and `Authorization` headers by default to prevent credential forwarding. User code that needs to send auth must use an allowed list configured in the route handler.
- **Open proxy risk:** The `/api/cors-proxy` route must validate or restrict the `url` parameter. A rate-limit and/or domain allowlist (configurable per-workspace) prevents abuse as an open public proxy.
- **Sandbox isolation:** When the cross-origin iframe sandbox is active (almostnode Phase 4), user code runs on a different origin. The SW at the host origin does **not** control a cross-origin iframe. In that mode, the iframe's own almostnode environment handles CORS differently (requests appear to originate from the sandbox domain). The CORS proxy SW is therefore most applicable to the Web Worker execution mode (Phases 1–3).

### 2.4 Fetch / XHR / WebSocket

| API | Status | Notes |
|---|---|---|
| `fetch` | ✅ Full support | Browser native, available as global |
| `XMLHttpRequest` | ✅ Full support | Browser native |
| `WebSocket` | ✅ Full support | Browser native; `wss://` requires TLS at the target |
| `EventSource` (SSE) | ✅ Full support | Browser native |
| `node:http` | ✅ Shimmed via fetch | CORS still applies |
| `node:net` (raw TCP) | ❌ Stubbed only | No real TCP socket in browser |
| `node:tls` | ❌ Stubbed only | Same as above |
| `node:dgram` (UDP) | ❌ Stubbed only | No UDP in browser |

### 2.5 Security Implications

- **Cross-origin sandbox (recommended):** User code in a sandboxed iframe cannot read the host page's cookies, localStorage, or DOM. Network requests from the iframe still go through the browser's normal CORS policy. This is the correct threat model for user-supplied code.  
- **Same-origin Worker:** Code can access IndexedDB and make arbitrary network requests. Cannot touch the main thread's DOM. Acceptable if user code is trusted (e.g., course content authored by the platform).  
- **Main thread (current status quo for both JS and TS workers):** The existing codebase runs user code in a Web Worker via `new Worker(new URL(...))`, which is comparable to the "Same-origin Worker" security level. Moving to almostnode does not regress this.

---

## 3. Future Playground Support

### 3.1 Next.js Playground

| Dimension | Assessment |
|---|---|
| **Feasibility** | ✅ High — `NextDevServer` is built in and tested |
| **App Router** | ✅ Supported — `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, dynamic routes, route groups |
| **Pages Router** | ✅ Supported — `/pages/` directory, API routes |
| **CSS Modules** | ✅ Supported — scoped class names work |
| **HMR / React Refresh** | ✅ Supported — `devServer.start()` + `devServer.setHMRTarget(iframe.contentWindow)` |
| **API routes** | ✅ Supported (both App Router `route.ts` and Pages Router `/pages/api/`) |
| **Server Components (RSC)** | ❓ Unknown — docs do not mention RSC support; likely unsupported given it requires a Node.js rendering server |
| **Middleware** | ❓ Unknown — not mentioned in docs |
| **Image optimization** | ❌ Unlikely — requires native binaries (`sharp`) |
| **Required browser capabilities** | Service worker (mandatory), `postMessage` for HMR delivery, `<iframe>` for preview |
| **Filesystem requirements** | VirtualFS with `/app` or `/pages` directories; service worker serves `/__virtual__/{port}/` |
| **Blockers** | 1) Service worker deployment; 2) Cross-origin sandbox deployment for secure user code; 3) RSC likely unsupported |

**HMR viability:** Fully viable. The pattern is:
```ts
devServer.start();                          // enables VFS file watching
devServer.setHMRTarget(iframe.contentWindow); // delivers updates via postMessage
```
File changes written to VirtualFS trigger HMR automatically. React state is preserved for component-level updates.

### 3.2 Express Server Playground

| Dimension | Assessment |
|---|---|
| **Feasibility** | ✅ High — Express runs in the Runtime via the `http` shim + ServerBridge |
| **Routing** | ✅ Full Express routing (app.get, app.post, middleware, router) |
| **Static files** | ✅ `express.static()` reads from VirtualFS |
| **Middleware** | ✅ All pure-JS middleware works |
| **WebSockets** | ✅ Basic WebSocket upgrade is shimmed (via `ws` package) |
| **Database access** | ✅ Any pure-JS DB driver (e.g., `pg` over fetch, `better-sqlite3` JS port) |
| **Serving in browser** | Via `ServerBridge` — requests to `/__virtual__/3000/` are intercepted by the service worker and forwarded to the Express instance |
| **HMR / dev reload** | ❌ No automatic HMR for Express — would need a custom `nodemon`-like file watcher in VFS |
| **Required capabilities** | Service worker (mandatory for URL access), VirtualFS |
| **Blockers** | 1) Service worker; 2) No native modules; 3) CORS applies to outbound requests from within the Express handlers |

**Implementation approach:**
```ts
const { vfs, npm, runtime, serverBridge } = createContainer();
await npm.install('express');
await serverBridge.initServiceWorker();

vfs.writeFileSync('/server.js', userExpressCode);
runtime.runFile('/server.js'); // starts server on virtual port

serverBridge.registerServer(expressVirtualServer, 3000);
// iframe.src = serverBridge.getServerUrl(3000);
```

The key challenge is that `ServerBridge.registerServer()` expects an object with a `handleRequest()` method — a thin adapter wrapping Express's `IncomingMessage`/`ServerResponse` API is needed.

### 3.3 Vite Playground

| Dimension | Assessment |
|---|---|
| **Feasibility** | ✅ High — `ViteDevServer` is built in |
| **JSX/TSX** | ✅ Transformed via esbuild-wasm |
| **React Refresh (HMR)** | ✅ Full support — state preserved across hot updates |
| **npm packages** | ✅ Resolved from `/node_modules/` in VirtualFS |
| **CSS** | ✅ Style injection (no reload) |
| **Vite plugins** | ❓ Unknown — standard plugins may not work since the dev server is a shim, not real Vite |
| **SSR** | ❌ Not supported |
| **Required capabilities** | Service worker, `<iframe>` for preview |
| **Blockers** | 1) Service worker; 2) Vite plugins likely unsupported; 3) PostCSS/Tailwind require build step compatibility |

**HMR viability:** Identical to Next.js — `devServer.start()` + `devServer.setHMRTarget()`. CSS changes inject without reload; JSX/TSX changes use React Refresh to preserve state.

---

## 4. Runtime Architecture

### 4.1 How almostnode Works Internally

```
┌───────────────────────────────────────────────────────────┐
│                   Browser Tab / iframe                     │
│                                                           │
│  ┌─────────────┐   ┌────────────────────┐  ┌──────────┐  │
│  │  VirtualFS  │◄──│  Runtime (CJS)     │  │   npm    │  │
│  │  (in-memory)│   │  40+ Node shims    │  │  PackMgr │  │
│  │             │──►│  esbuild-wasm      │  │          │  │
│  └─────────────┘   └────────────────────┘  └──────────┘  │
│         │                                                  │
│         │         ┌────────────────────┐                  │
│         └────────►│  NextDevServer /   │                  │
│                   │  ViteDevServer     │                  │
│                   └──────────┬─────────┘                  │
│                              │                            │
│  ┌───────────────────────────▼─────────────────────────┐  │
│  │              ServerBridge                           │  │
│  │   registers virtual servers on virtual ports        │  │
│  └───────────────────────────┬─────────────────────────┘  │
└──────────────────────────────│────────────────────────────┘
                               │  intercepts /__virtual__/{port}/
┌──────────────────────────────▼────────────────────────────┐
│              Service Worker (__sw__.js)                    │
│   Routes browser requests to registered virtual servers   │
└───────────────────────────────────────────────────────────┘
```

Execution model:
- `createContainer()` → main thread execution (no isolation).
- `createRuntime({ dangerouslyAllowSameOrigin: true, useWorker: true })` → Web Worker.
- `createRuntime({ sandbox: 'https://sandbox.example.com' })` → cross-origin iframe.

Module execution:
1. User writes code or files are staged into VirtualFS.
2. `runtime.runFile(path)` reads the file from VFS.
3. The runtime wraps the file content in a CJS module wrapper (similar to Node.js's own wrapper).
4. Calls to `require()` are intercepted — built-ins return shims, relative paths read from VFS, npm packages read from `/node_modules/` in VFS.
5. TypeScript files are transpiled via esbuild-wasm on first require.
6. Module cache prevents double-execution (same as Node.js `require` cache).

### 4.2 Service Worker Requirements

The service worker (`__sw__.js`) is **only required** when using `ServerBridge` for URL-accessible dev servers. For a basic JS/TS REPL replacement (no iframe preview, no dev server), no service worker is needed.

| Feature | Needs SW? |
|---|---|
| `runtime.execute()` / `runtime.runFile()` | ❌ No |
| npm package installation | ❌ No |
| CORS proxy for user-code HTTP requests | ✅ Yes (optional, see §2.3) |
| Express server accessible via URL in an `<iframe>` | ✅ Yes |
| Next.js / Vite dev server in an `<iframe>` | ✅ Yes |

The SW intercepts requests to `/__virtual__/{port}/{path}`, forwards them to the registered virtual server's `handleRequest()` method, and streams the response back. It does not intercept any other requests **unless the CORS proxy feature is enabled** (see §2.3 for the merged SW design).

**Merged SW: one file, two responsibilities.** If the CORS proxy feature is enabled alongside almostnode, both routing rules live in a single `__sw__.js` file. This is required because only one SW can control a given scope — having two separate SW files fighting over the root `/` scope causes them to alternate on each update cycle.

**Conflict with Next.js App Router:** The existing app already runs under Next.js. Adding the almostnode service worker requires registering it via a Next.js App Router route handler:

```ts
// app/__sw__.js/route.ts
import { getServiceWorkerContent } from 'almostnode/next';
export async function GET() {
  return new Response(getServiceWorkerContent(), {
    headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-cache' },
  });
}
```

This is documented and supported.

### 4.3 Web Worker Usage

- **`createContainer()`** runs on the main thread. Suitable for trusted code only.
- **`createRuntime({ useWorker: true })`** offloads execution to a Web Worker. UI stays responsive. Recommended for untrusted user code where the cross-origin iframe sandbox is too complex to deploy.
- **`createRuntime({ sandbox: '...' })`** uses an iframe + `postMessage` protocol. The iframe loads almostnode from a different origin and executes code there.

The existing JS/TS workers are `new Worker(new URL('./javascript-worker.ts', import.meta.url))` instances. These would be replaced by almostnode's built-in worker support.

### 4.4 OPFS Compatibility

almostnode VirtualFS is **entirely in-memory**. It has no OPFS integration out of the box.

The existing playground persistence model:
- OPFS `workspaces/{id}/files/` — user code files (one per tab)
- OPFS `workspaces/{id}/db/` — database binaries

**Bridge strategy (required):** At runtime init and on every file change:
1. Read OPFS files via `opfsReadFile()`.
2. Write them into almostnode VirtualFS via `vfs.writeFileSync()`.
3. After execution, if user code writes new files via `require('fs').writeFileSync`, they must be mirrored back to OPFS via `vfs.on('change', ...)` or a post-run snapshot diff.

The `VirtualFS.toSnapshot()` API provides a JSON-serializable snapshot of the entire VFS. This can be persisted to OPFS on save and rehydrated on load via `VirtualFS.fromSnapshot()`.

### 4.5 Sandboxing / Security Model

| Security level | Mechanism | Suitable for |
|---|---|---|
| Cross-origin sandbox | iframe at different origin | User-entered code (playground default) |
| Same-origin Web Worker | `useWorker: true` | Authored course content |
| Main thread | `dangerouslyAllowSameOrigin: true` | Internal tooling only |

**Current status:** Both the JS and TS workers run in same-origin Web Workers (via `new Worker()`). almostnode's same-origin worker mode is equivalent. The upgrade path for increased isolation is to add a cross-origin sandbox deployment.

### 4.6 Performance Implications

| Metric | Current | almostnode |
|---|---|---|
| JS startup time | ~0ms (no compilation) | ~0ms (no init needed for CJS execution) |
| TS startup time | ~2–4s (loads 10MB TypeScript compiler) | ~same (TypeScript compiler still needed unless replaced with esbuild-wasm) |
| npm install (first time) | N/A — no package support | ~1–5s per package (network + decompress) |
| npm install (cached) | N/A | ~0ms (lockfile + VFS snapshot) |
| Runtime overhead | AsyncFunction overhead only | CJS module wrapper overhead (~1ms per require) |
| Bundle size added | 0 (worker uses only TypeScript) | ~250 KB gzipped |

almostnode explicitly uses `esbuild-wasm` internally (for ESM→CJS transformation and TypeScript transpilation within the package manager). If the TS playground adopts almostnode, the `typescript` npm package currently loaded in `typescript-worker.ts` could be replaced by `esbuild-wasm`, reducing the worker's cold-start from ~4s to ~1s.

### 4.7 Memory / Runtime Overhead

- VirtualFS is entirely in-memory. Large npm packages (e.g., `lodash`: ~1.5MB unpacked, `react` + `react-dom`: ~5MB) will consume browser heap proportionally.
- A full Next.js project with all dependencies could easily consume 50–200MB of in-memory VFS storage.
- The module cache in the Runtime holds all loaded modules in memory until `runtime.clearCache()` is called.
- Worker threads: each almostnode container/runtime is self-contained; multiple concurrent playground tabs each have their own VFS + Runtime.

### 4.8 Compatibility with Existing Editor / Workspace Architecture

The existing `LanguageAdapter` + `LanguageRuntime` contract is a clean integration point:

```ts
// app/_components/types.ts
export interface LanguageRuntime {
  run(code: string, emit: EmitOutput): Promise<void>;
  complete?(line: string, column: number): Promise<CompletionResult>;
  prepareFileSystem?(files: Map<string, Uint8Array>): Promise<void>; // ← key hook
}
```

The `prepareFileSystem?` hook was explicitly designed for runtimes that need multi-file staging before `run()`. almostnode maps cleanly:

```ts
async prepareFileSystem(files: Map<string, Uint8Array>) {
  // Mirror OPFS workspace files into almostnode VirtualFS
  for (const [relativePath, bytes] of files) {
    vfs.writeFileSync(`/${relativePath}`, bytes);
  }
}

async run(code: string, emit: EmitOutput) {
  // code is the entry file's content, already staged
  const result = await runtime.runFileAsync('/index.js');
  // stream console output via emit
}
```

No changes to the `LanguageAdapter` interface, `Playground.tsx`, or the tab/workspace infrastructure are required. The adapter is a self-contained drop-in.

---

## 5. Technical Risks and Challenges

### 5.1 Unsupported Node APIs

| Module | Status | Mitigation |
|---|---|---|
| `child_process.execSync` | ❌ Not supported | Use async `exec()` or `container.run()` |
| `net` / `tls` (raw TCP) | ❌ Stubbed only | Use `http`/`https` shims instead |
| `dns` | ❌ Stubbed only | Resolve via fetch-based DNS APIs |
| `worker_threads` | ❌ Stubbed only | Cannot spawn Node.js worker threads in browser |
| `cluster` | ❌ Stubbed only | No multi-process in browser |
| `vm` | ❌ Stubbed only | Cannot eval in different V8 context |
| `fs.watch` (non-VFS) | N/A | VirtualFS `watch()` works correctly |
| Native addons (`.node`) | ❌ Not possible | Pure-JS alternatives required |
| `os.cpus()`, `os.totalmem()` | Simulated | Returns browser-spoofed values |

### 5.2 Browser Limitations

- **Service worker scope:** The SW must be registered at the root scope (`/`) to intercept `/__virtual__/*` requests. If the Next.js app already registers a service worker (e.g., for PWA), there will be a conflict. The current app does not appear to use a SW.
- **SW interception of Web Workers:** Dedicated Web Workers inherit their controlling SW from the parent page in Chrome 68+, Firefox 84+, and Safari 14.1+. First-load timing caveat: workers created before the SW activates (first page visit) are not controlled — this clears on the next reload. All runtime workers in this codebase are dedicated workers, so SW interception works transparently for the CORS proxy feature across all playgrounds.
- **Cross-Origin Isolation headers (`COOP`/`COEP`):** Required if using `SharedArrayBuffer` or `Atomics`. almostnode does not require these for its base use case; they are only needed for WebAssembly threads. The current app does not set COOP/COEP headers.
- **Safari:** Service workers in Safari have had historically poor reliability but are supported in Safari 16+. Testing required.
- **`iframe` `sandbox` attribute conflicts:** If the preview iframe uses `sandbox="allow-scripts"` without `allow-same-origin`, the service worker cannot intercept its fetch requests. The SW interception only works with `allow-same-origin` in the iframe's sandbox attribute.
- **Tab sleep / throttling:** Chromium throttles timers in background tabs. Long-running Node scripts that rely on `setTimeout` precision may behave differently in backgrounded tabs.

### 5.3 npm Compatibility Edge Cases

- **Conditional exports (`exports` field in package.json):** almostnode's package manager may not respect all `exports` map conditions (e.g., `"node"` vs. `"browser"` vs. `"default"`). This can cause the wrong entry point to be loaded for some packages.
- **ESM-only packages:** Packages that ship only ESM (no CJS fallback) are transformed by esbuild-wasm. This transformation can fail or produce incorrect output for packages that rely on top-level `await` or dynamic `import.meta` expressions.
- **Binary packages:** Any package with a postinstall script that compiles native code (e.g., `node-gyp`) will fail silently (no native build capability in browser).
- **Large packages:** Installing heavy packages like `webpack`, `typescript`, `next` into VirtualFS may succeed but will consume tens of MB of memory and take 10–30 seconds to download and extract.
- **Scoped packages:** Supported (`@hono/node-server` is mentioned in docs).
- **Monorepo packages:** `workspace:*` protocol in package.json is not handled.

### 5.4 Service Worker Complexity

- The SW must be served from the same scope as the app (root `/`).
- The SW must survive app restarts — if the SW is updated (new almostnode version), old SW may be cached and serve stale virtual server responses.
- In SSR/RSC environments (like the current Next.js app), the SW only runs client-side. This is correct behavior but must not be confused with server-side routing.
- Workspace isolation: multiple playground tabs all share the same SW. The SW routes based on port numbers — two tabs using port `3000` will conflict. Port numbers should be randomly assigned per workspace instance.
- **Only one SW per scope.** If both almostnode dev-server routing and CORS proxy interception are needed, they **must** be merged into a single `__sw__.js` file. Two separate SW registrations at root scope will alternate control on each update, causing one to overwrite the other. The merge approach (see §2.3) fully resolves this: both features share one fetch event handler with priority-ordered routing rules.
- **CORS proxy SW does not help cross-origin iframe mode.** Once almostnode runs inside a cross-origin iframe (Phase 4, `sandbox.dataslope.io`), the host page's SW does not control the iframe. In that mode, CORS proxy must be handled either by the sandbox's own SW or by having user code target the proxy URL directly. The SW-based proxy is therefore best suited to Web Worker execution mode (Phases 1–3).

### 5.5 Security Concerns

- **User code with `require('fetch')` / XHR:** Can make arbitrary cross-origin network requests subject to CORS. This is the same risk as the current `AsyncFunction` execution model.
- **DOM access from Worker:** The same-origin Worker mode cannot access the DOM but can access IndexedDB, which stores app data (OPFS metadata, localStorage via the Workers API). Consider using the cross-origin sandbox for all user-provided code.
- **VirtualFS poisoning:** If the host app and the almostnode runtime share a VirtualFS instance, malicious user code could overwrite host files. Mitigation: create a separate VirtualFS per execution context with only the user's workspace files.
- **Service worker hijacking:** If user code can somehow influence the SW registration (e.g., via `navigator.serviceWorker.register()`), it could intercept requests to the main app. Mitigation: sandbox via cross-origin iframe.

### 5.6 Multi-Tab / Workspace Synchronization

The existing architecture already uses the Web Locks API (`acquireWorkspaceLock()`) to prevent two tabs from writing to the same OPFS workspace simultaneously. almostnode VirtualFS instances are per-tab and in-memory, so they are naturally isolated. The risk is:

1. Tab A modifies a file in OPFS.
2. Tab B has the same workspace open and has already loaded its VirtualFS from OPFS.
3. Tab B's VirtualFS is now stale.

This is an existing problem in the OPFS architecture, not introduced by almostnode. The Web Lock exclusion ensures only one tab can actively use a workspace, making this a non-issue in practice.

### 5.7 Build / Runtime Performance

- **Cold start (first load):** almostnode itself is `~250KB` gzipped. No additional startup overhead beyond this download. If dev servers are used, esbuild-wasm (~7MB uncompressed) is also loaded.
- **npm install performance:** Installing a package tree of 50 packages (e.g., Express + common middleware) takes roughly 5–15 seconds on a fast connection. This is a one-time cost per workspace; subsequent loads restore from VFS snapshot.
- **HMR latency:** Measured at ~50–200ms from file write to browser update based on the almostnode documentation. Comparable to local Vite development.
- **TypeScript transpilation:** esbuild-wasm is significantly faster than the TypeScript compiler for transpile-only operations (~10x). Replacing the TS compiler with esbuild-wasm for the TypeScript playground would improve reload speed.

---

## 6. Integration Plan

### 6.1 Recommended Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                       Next.js App (host)                               │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                   Playground.tsx (unchanged)                     │  │
│  │   LanguageAdapter contract → almostnode adapter implementations  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────┐  ┌──────────────────────────────────────┐ │
│  │  AlmostnodeJsAdapter    │  │  AlmostnodeTsAdapter                 │ │
│  │  implements LanguageAdapter  (same pattern)                       │ │
│  │                         │  │                                      │ │
│  │  init() → createRuntime()  │  init() → createRuntime()           │ │
│  │  prepareFileSystem()    │  │  prepareFileSystem()                 │ │
│  │  run() → runtime.runFileAsync()  run() → runtime.runFileAsync()  │ │
│  └─────────────────────────┘  └──────────────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              almostnode Runtime Layer                            │  │
│  │   VirtualFS ← OPFS Bridge → OPFS workspace files               │  │
│  │   Runtime (CJS, TS via esbuild-wasm)                           │  │
│  │   PackageManager (npm registry)                                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Service Worker Route: app/__sw__.js/route.ts                   │  │
│  │  (almostnode/next → getServiceWorkerContent())                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Cross-Origin Sandbox (separate Vercel deployment)              │  │
│  │  sandbox.dataslope.io or similar                                │  │
│  │  generateSandboxFiles() → index.html + __sw__.js + vercel.json  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Migration Strategy

The migration should be **additive and opt-in** to avoid disrupting existing users:

1. Introduce `almostnode-javascript` and `almostnode-typescript` as new playground IDs alongside the existing `javascript` and `typescript` IDs.
2. Route the new IDs through the almostnode adapters; existing adapters remain untouched.
3. Once the new adapters are stable and feature-parity is confirmed, switch the existing route (`/playground/javascript`) to use the new adapter via the `runtimeRegistry.ts` or adapter selection logic.
4. Remove the legacy workers once migration is complete.

### 6.3 Runtime Abstraction Layer Design

Create two new files that implement the `LanguageAdapter` interface:

**`app/_components/runtime/almostnode-javascript.tsx`**
```ts
// Mirrors the shape of javascript.tsx but replaces the Worker with almostnode.
// Key differences:
//   - init() creates an almostnode Runtime (or container)
//   - prepareFileSystem() stages workspace files into VirtualFS
//   - run() calls runtime.runFileAsync('/index.js') 
//     and pipes onConsole callbacks into emit()
//   - importSnippet() generates `const x = require('x');` instead of import
//   - packages: expose npm packages (lodash, axios, dayjs, etc.) with require snippets
```

**`app/_components/runtime/almostnode-typescript.tsx`**
```ts
// Same as above but entryPoint is 'index.ts'
// almostnode Runtime natively handles .ts files via esbuild-wasm
// No need to load the TypeScript compiler package separately
// Dramatically reduces cold-start time
```

**Console output bridging:**
```ts
const container = createContainer({
  onConsole: (level, ...args) => {
    const content = args.map(formatArg).join(' ');
    emit({ type: level === 'error' || level === 'warn' ? 'stderr' : 'stdout', content });
  },
});
```

### 6.4 Filesystem Integration Approach

Two-phase approach:

**Phase A — VFS-only (no persistence):**
- At `prepareFileSystem(files)`: iterate the map and call `vfs.writeFileSync()` for each entry.
- At the end of `run()`: scan VFS for new/changed files (using snapshot diff) and report them back.
- Workspace persistence continues to use the existing OPFS layer — almostnode is only used for execution.

**Phase B — VFS snapshot persistence (optional):**
- After each successful run (or on debounced file changes), call `vfs.toSnapshot()` and store the result in OPFS as `workspace/{id}/vfs-snapshot.json`.
- On next workspace load, restore via `VirtualFS.fromSnapshot()` — avoids re-downloading npm packages.
- This makes npm install results persistent across page reloads.

```ts
// Pseudo-code for VFS ↔ OPFS bridge
async function initVfsFromWorkspace(workspaceId: string): Promise<VirtualFS> {
  const snapshot = await opfsReadFile(workspaceId, 'vfs-snapshot.json');
  if (snapshot) {
    return VirtualFS.fromSnapshot(JSON.parse(new TextDecoder().decode(snapshot)));
  }
  return new VirtualFS();
}

async function persistVfsSnapshot(workspaceId: string, vfs: VirtualFS) {
  const json = JSON.stringify(vfs.toSnapshot());
  await opfsWriteFile(workspaceId, 'vfs-snapshot.json', new TextEncoder().encode(json));
}
```

### 6.5 Dependency / Package Management Strategy

For the JS/TS playground, present an **npm install panel** in the packages drawer:

1. User opens the packages drawer (already exists in `Playground.tsx`).
2. The drawer shows installed packages (from `npm.list()`) and allows typing a package name.
3. Clicking "Install" calls `await npm.install(packageName, { onProgress: ... })` and shows progress.
4. After install, the `node_modules/` directory in VirtualFS is populated.
5. A `require()` snippet is inserted into the editor (updating `importSnippet()` to return `const x = require('x');` or `const { foo } = require('x');`).
6. The VFS snapshot is saved to OPFS so packages persist across reloads.

**Pre-bundled packages (optional):** For common packages (lodash, axios, dayjs), pre-stage their VFS data at workspace creation time to avoid the install wait for new users.

### 6.6 Suggested Milestones / Phases

#### Phase 0: CORS Proxy for All Runtimes (independent of almostnode, 1–2 days)

This phase is **independent of almostnode** and can be shipped now. It benefits all 12 existing playgrounds immediately (JS, TS, Python, R, PHP, C, C++, Java, C#, SQLite, PostgreSQL, DuckDB).

> **Architecture decision (2026-05-19):** The server-side proxy endpoint is implemented as a **Cloudflare Worker** (`cloudflare-cors-proxy/`) rather than a Next.js route handler. This keeps the proxy independently deployable, edge-native (zero cold starts), and decoupled from the Next.js app. The playground calls the worker via `?url=<encoded>` query parameter. See `cloudflare-cors-proxy/README.md` for deployment steps.

**Completed**

- [x] Create `cloudflare-cors-proxy/` Cloudflare Worker package:
  - [x] `src/index.ts` — full proxy logic: Origin allowlist enforcement, SSRF protection (private/loopback IP blocking), hop-by-hop and credential header stripping, `redirect: "follow"` upstream, CORS headers injected on response.
  - [x] `wrangler.toml` — worker name, compatibility date, `ALLOWED_ORIGINS` var (localhost, dataslope.com, www.dataslope.com, dataslope-playground.vercel.app).
  - [x] `package.json` — wrangler 4.x + `@cloudflare/workers-types`, `ws` overridden to ≥8.20.1 (advisory GHSA-58qx-3vcg-4xpx).
  - [x] `tsconfig.json` — strict TypeScript targeting the Workers runtime.
  - [x] `README.md` — explains the proxy, security model, setup, deployment, and how to wire `NEXT_PUBLIC_CORS_PROXY_URL` into the playground.
  - [x] TypeScript type-checks clean (`tsc --noEmit`), zero npm audit vulnerabilities.

**Remaining**

- [ ] Deploy the worker to Cloudflare (`npx wrangler deploy` from `cloudflare-cors-proxy/`) and note the deployed URL.
- [ ] Set `NEXT_PUBLIC_CORS_PROXY_URL` in Vercel environment variables and `.env.local`.
- [ ] Add `app/__sw__.js` root-scope service worker that:
  - Intercepts fetch events carrying the `X-Cors-Proxy: 1` header.
  - Rewrites cross-origin requests through the Cloudflare Worker URL.
  - Passes all other requests through unchanged.
- [ ] Register the SW in the root layout (`app/layout.tsx`) with `navigator.serviceWorker.register('/__sw__.js')` on mount.
- [ ] In each existing runtime worker (JS, TS, Python, R), wrap `fetch` / `XMLHttpRequest` to inject `X-Cors-Proxy: 1` on cross-origin requests made within user code execution. For Pyodide, patch the `js.fetch` shim after user code begins.
- [ ] Run `npm run test` and `npm run build` to confirm no regressions.
- [ ] Test manually: Python `requests.get("https://httpbin.org/get")` returns a result; direct CDN fetches (pyodide, WebR) are not intercepted.

#### Phase 1: Basic almostnode JS/TS Runtime (2–3 days)

- [ ] Install `almostnode` npm package.
- [ ] **Merge almostnode SW into the CORS proxy SW** already created in Phase 0: update `app/__sw__.js` to include both routing rules (almostnode `/__virtual__/` first, then `X-Cors-Proxy` rewrite to the Cloudflare Worker URL, then pass-through).
- [ ] Create `almostnode-javascript.tsx` adapter:
  - `init()` creates `createContainer()` with `onConsole` callback.
  - `run()` calls `runtime.execute(code)` and flushes console output.
  - No multi-file, no npm yet.
- [ ] Create `almostnode-typescript.tsx` adapter:
  - Same as JS but writes code to `/index.ts` and calls `runtime.runFileAsync('/index.ts')`.
- [ ] Wire adapters into `playgrounds.ts` as new `playground-id` values (e.g., `javascript-v2`).
- [ ] Validate against all existing example snippets.
- [ ] Run `npm run test` and `npm run build` to confirm no regressions.

#### Phase 2: Multi-File Support (2–3 days)

- [ ] Implement `prepareFileSystem(files)` in both adapters.
- [ ] Change `run()` to execute from the entry point file (already at `/index.js` or `/index.ts`) rather than raw `code` string.
- [ ] Add VFS ↔ OPFS bridge (Phase A — per-run staging).
- [ ] Test with the multi-file workspace feature (existing tab system).

#### Phase 3: npm Package Support (3–4 days)

- [ ] Update the packages drawer to show an "Install npm package" input field.
- [ ] Wire into `npm.install()` with `onProgress` → loading toast.
- [ ] Update `importSnippet()` to return `require()`-style snippets.
- [ ] Add VFS snapshot persistence (Phase B) to OPFS.
- [ ] Pre-seed common packages (lodash, axios, dayjs) in the example snippets.

#### Phase 4: Security Hardening (2–3 days)

- [ ] Deploy cross-origin sandbox (`generateSandboxFiles()`) to a separate subdomain (e.g., `sandbox.dataslope.io` on Vercel).
- [ ] Switch both adapters to `createRuntime({ sandbox: 'https://sandbox.dataslope.io' })`.
- [ ] Verify that existing console output streaming works over `postMessage` cross-origin protocol.
- [ ] Update CSP headers if needed.
- [ ] For the cross-origin sandbox mode: CORS proxy SW does not control the iframe; the sandbox's user code should call the Cloudflare Worker URL directly (`NEXT_PUBLIC_CORS_PROXY_URL?url=...`) instead.

#### Phase 5: Dev Server Playgrounds (Optional, 1–2 weeks)

- [ ] Create `almostnode-nextjs.tsx` adapter:
  - `init()` instantiates `NextDevServer`.
  - `run()` starts the server and updates the preview iframe.
- [ ] Create `almostnode-vite.tsx` adapter:
  - `init()` instantiates `ViteDevServer`.
- [ ] Create `almostnode-express.tsx` adapter:
  - `init()` creates container.
  - `run()` executes user's Express code and registers with `ServerBridge`.
- [ ] Add preview iframe pane to `Playground.tsx` (new output cell type `"preview"`).

#### Phase 6: Legacy Cleanup (1 day)

- [ ] Switch `/playground/javascript` and `/playground/typescript` routes to use new almostnode adapters.
- [ ] Remove `javascript-worker.ts` and `typescript-worker.ts`.
- [ ] Remove the `typescript` npm dependency from the browser worker bundle (still needed for the existing TS adapter until Phase 6).
- [ ] Update `runtimeInfo` in adapters to reflect new engine.

### 6.7 Recommended Proof-of-Concept Order

1. **Bare almostnode execute:** Write a minimal HTML page (outside the Next.js app) that loads almostnode, runs `console.log('hello')`, and displays the output. Confirms the library works.
2. **almostnode in a Web Worker:** Replicate the above but inside a `new Worker()`. Confirms worker compatibility.
3. **Multi-file require:** Stage two files in VFS where `index.js` requires `./utils.js`. Confirms CJS resolution.
4. **npm install:** Install `lodash` and call `_.chunk([1,2,3,4], 2)`. Confirms package manager + registry access.
5. **Service worker in Next.js:** Add the `app/__sw__.js/route.ts` handler and verify it serves the SW script. Confirm registration in DevTools.
6. **NextDevServer preview:** Create a minimal Next.js page in VFS and display it in an iframe. Confirms the full server + SW pipeline.

### 6.8 Testing Strategy

**Unit tests (`__tests__/`):**
- Test `almostnode-javascript.tsx` adapter's `init()`, `run()`, and `prepareFileSystem()` in JSDOM by mocking the almostnode module.
- Test VFS ↔ OPFS bridge with a mock OPFS.
- Test `importSnippet()` / `hasImport()` for `require()`-style detection.

**Integration tests (`e2e/` with Playwright):**
- Add a Playwright test that opens `/playground/javascript`, types a multi-line script with `require('./utils.js')`, and verifies stdout output.
- Add a test that installs a package (lodash) and verifies `_.chunk` works.
- Test persistence: reload the page and verify the VFS snapshot is restored.

**Existing tests:**
- All existing `npm run test` unit tests must pass without modification.
- All existing Playwright e2e tests must pass — the new adapters use a different `playground-id` until Phase 6, so they cannot break existing tests.

---

## 7. Conclusion and Recommendation

| Criterion | Verdict |
|---|---|
| Multi-file module resolution | ✅ Fully supported via CJS + VirtualFS |
| npm package resolution | ✅ Full npm registry access |
| tsconfig path aliases | ✅ Via TypeScript transpiler pre-processing |
| Dynamic imports | ⚠️ URL-based only; VFS paths not resolvable |
| Remote network access | ✅ Via `http`/`https` shims (CORS applies) |
| **CORS proxy via single SW — feasible?** | **✅ Yes — see §2.3** |
| **Multiple SW conflicts?** | **✅ No conflict if merged into one root-scope SW** |
| **SW intercepts all runtime Web Workers?** | **✅ Chrome 68+, Firefox 84+, Safari 14.1+** |
| Next.js playground support | ✅ Built-in `NextDevServer` |
| Express playground support | ✅ Via Runtime + ServerBridge |
| Vite playground support | ✅ Built-in `ViteDevServer` |
| Service worker required | ⚠️ For dev servers; not for basic execution |
| OPFS integration | ⚠️ Requires bridge (see §6.4) |
| Security for user code | ✅ Cross-origin sandbox recommended and supported |
| Bundle size | ✅ ~250KB gzipped (smaller than current TS compiler) |
| Migration risk | 🟢 Low — additive adapter approach, existing contract unchanged |

**Recommendation:** Proceed with almostnode integration in Phases 0–4.

**Phase 0 (CORS proxy) is the highest-priority quick win** — it benefits all 12 existing playgrounds immediately, independent of almostnode. The server-side proxy is implemented as a **Cloudflare Worker** (`cloudflare-cors-proxy/`) rather than a Next.js route handler for edge performance, independent deployability, and future-proofing. The remaining Phase 0 work is:
1. Deploy the worker to Cloudflare and set `NEXT_PUBLIC_CORS_PROXY_URL` in Vercel.
2. `app/__sw__.js` — root-scope service worker that rewrites `X-Cors-Proxy: 1` requests through the Cloudflare Worker URL.
3. Thin `X-Cors-Proxy` header injection in each runtime worker (JS, TS, Python, R).

No conflicts between service workers exist as long as all routing logic is co-located in the single root-scope `__sw__.js`. The almostnode SW (added in Phase 1) is merged into that same file, not registered separately.

The basic JS/TS runtime replacement (Phases 1–3) is low-risk, high-value, and directly enables multi-file module resolution and npm package support that the current `AsyncFunction`-based workers fundamentally cannot provide. Phases 5–6 (dev server playgrounds) should be treated as separate feature work once the core runtime migration is proven stable.

The most important prerequisite before Phase 1 begins is: **deploy the cross-origin sandbox** (`generateSandboxFiles()` → Vercel or equivalent). This is a one-time infrastructure task that unblocks the secure execution path for all future phases.
