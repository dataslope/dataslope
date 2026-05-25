# Network Access for Browser WASM Runtimes via CORS Proxy

**Date**: 2026-05-25  
**Proxy URL**: `https://dataslope-cors-proxy.subwaymatch.workers.dev`  
**Proxy format**: `GET {PROXY_BASE}/?url={encodeURIComponent(targetUrl)}`

---

## Executive Summary

All seven runtimes run entirely in the browser (or in dedicated Web Workers spawned from the browser), so every outbound HTTP request is subject to the browser's same-origin / CORS policy. The deployed Cloudflare CORS proxy resolves this at the infrastructure level.

The central UX question is: **can users write `pd.read_csv("https://myurl.com/data.csv")` without any proxy-specific wrapping?** The answer depends heavily on which networking mechanism each runtime uses internally and whether we can intercept it before it reaches the network.

The recommended architecture — a **Next.js Service Worker that transparently rewrites external fetch/XHR requests through the proxy** — makes this possible for most runtimes. Runtimes that use browser `fetch` or Emscripten's XHR-based socket emulation benefit immediately. Runtimes with their own networking stacks (WebR's service worker, CheerpJ's Java socket layer) need additional integration work.

---

## How the Proxy Works

The Cloudflare worker at `https://dataslope-cors-proxy.subwaymatch.workers.dev` accepts:

```
GET /?url=<encoded-target-url>
POST /?url=<encoded-target-url>  (body forwarded)
```

It validates the request Origin against an allowlist, blocks private IPs (SSRF protection), strips credential headers, forwards the request to the upstream server, injects CORS response headers, and returns the proxied response. Request method, headers, and body are forwarded; the browser's `Cookie` and `Authorization` headers are NOT forwarded (security).

The proxy URL is exposed to the Next.js app via the `NEXT_PUBLIC_CORS_PROXY_URL` environment variable (already set to the deployed worker URL in `.env.example`).

---

## Transparent Proxy via Service Worker (Recommended Architecture)

### Concept

A **Service Worker** registered by the Next.js app can intercept all `fetch` events — including those made from Web Workers on the same origin. When the intercepted URL is external (i.e., not the app origin and not already pointing at the proxy), the service worker rewrites it to go through the CORS proxy.

This is completely transparent to user code. The service worker lives at the network level; no runtime or user script needs to know the proxy URL exists.

```
User code: pd.read_csv("https://example.com/data.csv")
    ↓ (Emscripten XHR or browser fetch in a Web Worker)
Service Worker fetch event
    ↓ rewrites URL to: https://dataslope-cors-proxy.subwaymatch.workers.dev/?url=https%3A%2F%2Fexample.com%2Fdata.csv
Cloudflare CORS Proxy
    ↓ strips CORS restrictions, forwards to upstream
https://example.com/data.csv
    ↓ response with injected CORS headers
Browser ✅ accepts response
```

### Key Browser Compatibility Facts

- **Service workers intercept XHR**: Yes, in all modern browsers. Emscripten's networking uses `XMLHttpRequest` under the hood; the Service Worker `fetch` event is fired for XHR requests too.
- **Service workers intercept Web Worker requests**: Yes. When a Web Worker is created by a page controlled by a service worker (same origin), the service worker intercepts that worker's fetch requests too.
- **Scope**: The service worker must be registered at the root scope (`/`) to control all pages and their workers.

### Service Worker Implementation Sketch

```javascript
// public/cors-proxy-sw.js
const PROXY_BASE = 'https://dataslope-cors-proxy.subwaymatch.workers.dev';
const APP_ORIGIN = self.location.origin;
const PROXY_ORIGIN = new URL(PROXY_BASE).origin;

// Passthrough hosts that should never be proxied
const PASSTHROUGH_PATTERNS = [
  APP_ORIGIN,
  PROXY_ORIGIN,
  'cdn.jsdelivr.net',
  'unpkg.com',
  'cjrtnc.leaningtech.com',  // CheerpJ loader
];

function shouldProxy(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    if (PASSTHROUGH_PATTERNS.some(p => url.startsWith(p))) return false;
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return false;
    return true;
  } catch {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  if (!shouldProxy(event.request.url)) return; // fall through to browser default
  const proxyUrl = `${PROXY_BASE}/?url=${encodeURIComponent(event.request.url)}`;
  const proxiedRequest = new Request(proxyUrl, {
    method: event.request.method,
    headers: event.request.headers,
    body: ['GET', 'HEAD'].includes(event.request.method) ? undefined : event.request.body,
    redirect: 'follow',
  });
  event.respondWith(fetch(proxiedRequest));
});
```

### Service Worker Registration in Next.js

```typescript
// app/layout.tsx  (or a dedicated hook)
useEffect(() => {
  if ('serviceWorker' in navigator && process.env.NEXT_PUBLIC_CORS_PROXY_URL) {
    navigator.serviceWorker.register('/cors-proxy-sw.js', { scope: '/' })
      .catch(console.error);
  }
}, []);
```

The service worker file goes in `public/cors-proxy-sw.js` so Next.js serves it at the root path. The proxy base URL can be baked in at build time as a constant (it is already a `NEXT_PUBLIC_` env var). Alternatively, the registration could pass the proxy URL as a message after registration, keeping the worker file static.

### Technical Challenges with Service Worker Approach

1. **WebR already uses a service worker**: WebR registers its own service worker (`coi-serviceworker.js` or `webr-serviceworker.js`) to enable SharedArrayBuffer (cross-origin isolation). Two service workers cannot share a scope in the same origin. This requires either merging both service workers into one, or using a `ServiceWorkerContainer`-based approach where the WebR service worker also handles proxy rewrites.

2. **COOP/COEP headers for SharedArrayBuffer**: WebR and potentially other runtimes use `SharedArrayBuffer`, which requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` (or `credentialless`) response headers. These headers restrict which cross-origin resources can be loaded — they must have CORP headers. The CORS proxy must set `Cross-Origin-Resource-Policy: cross-origin` on all responses. The Cloudflare worker currently does NOT set this header and would need to be updated.

3. **Service worker + Turbopack/Next.js**: Next.js does not natively manage service worker lifecycle. The `next-pwa` package or a custom approach is needed. Registration must happen in a `useEffect` (client-side only).

4. **Streaming responses**: Some runtimes (DuckDB reading large Parquet files) benefit from streaming. The service worker approach works transparently since the Cloudflare proxy streams the response body.

5. **POST request body forwarding**: `event.request.body` is a ReadableStream. Forwarding it to the proxied request requires careful handling (it can only be consumed once). The Cloudflare worker already handles this correctly on the server side.

6. **Passthrough list maintenance**: CDN URLs (jsDelivr, unpkg, CheerpJ, Pyodide) must not be proxied — they already have permissive CORS headers. The passthrough list must be kept in sync as new CDN origins are added.

---

## Runtime-by-Runtime Analysis

### 1. Python (Pyodide) — `pyodide 0.29.4` / Python 3.13.2

**Networking internals**: Pyodide runs in a Web Worker. Its networking layer goes through Emscripten's socket emulation, which uses `XMLHttpRequest` for synchronous operations and browser `fetch` for async operations. Standard library modules like `urllib.request` work because Emscripten intercepts socket calls.

**Does `pd.read_csv("https://myurl.com/data.csv")` work transparently?**

Not by default — if the remote server lacks CORS headers, the request fails. With the service worker proxy, Emscripten's XHR call is intercepted, rewritten through the proxy, and the response (with injected CORS headers) is returned. So **yes, with the service worker approach, `pd.read_csv("https://url")` would work out of the box**.

**Important caveats**:
- The `requests` library is not available in Pyodide (requires sockets beyond what Emscripten emulates). Users must use `urllib.request`, `pyodide.http.pyfetch`, or `httpx` (if installable via micropip).
- Synchronous fetches inside the worker are blocked by browsers (no sync XHR on main thread; in workers it's still sync XHR but browsers allow it). This is already handled by Emscripten's worker-compatible XHR shim.
- `pd.read_csv`, `pd.read_parquet`, `pd.read_excel` etc. all ultimately call Python's file-open path, which Emscripten routes through XHR/fetch. All of these will work with the service worker proxy.

**Without service worker (manual proxy wrapping)**:
```python
# Using Pyodide's pyfetch (async)
from pyodide.http import pyfetch

PROXY = "https://dataslope-cors-proxy.subwaymatch.workers.dev"

async def proxied_fetch(url):
    response = await pyfetch(f"{PROXY}/?url={url}")
    return await response.string()

text = await proxied_fetch("https://example.com/data.csv")

# Or for pandas: load via bytes
import io, pandas as pd
response = await pyfetch(f"{PROXY}/?url=https://example.com/data.csv")
data = await response.bytes()
df = pd.read_csv(io.BytesIO(data))
```

This is verbose and requires users to know the proxy URL. The service worker approach eliminates this entirely.

**Recommendation**: Use the service worker approach. Users can write `pd.read_csv("https://...")` directly.

---

### 2. R (WebR) — `webr 0.6.0` / R 4.6.0

**Networking internals**: WebR is architecturally different from other runtimes here — it requires its own service worker (`webr-serviceworker.js`) to enable `SharedArrayBuffer` via cross-origin isolation, and uses it to serve R packages and intercept I/O. R's `download.file()`, `read.csv()` with URLs, and the `curl` package all ultimately go through WebR's service worker, which forwards them to `self.fetch()` inside the service worker scope.

**Does `read.csv("https://myurl.com/data.csv")` work transparently?**

Partially. WebR's service worker already intercepts R's network calls, but those calls still go out as plain `fetch()` from the service worker context. The service worker has no CORS policy (server-to-server semantics), so the target server's CORS headers are irrelevant when fetching from the service worker. **WebR can often access remote URLs directly without the proxy** — because fetch from a service worker scope is not subject to browser CORS enforcement.

However, this is only true when WebR's service worker is the one making the request. If R code uses `httr` or `curl` libraries, those also route through the service worker. But some WebR versions implement `download.file` via mounting, not fetch.

**Recommended approach**: Mount a lazy-evaluated remote filesystem via WebR's `webr::mount()`:
```r
# Mount a remote CSV file into the virtual filesystem
webr::mount(
  mountpoint = "/data",
  source = "https://myurl.com",
  type = "workerfs"
)
df <- read.csv("/data/data.csv")
```

For simpler use, `download.file` works via the service worker:
```r
download.file("https://example.com/data.csv", "data.csv")
df <- read.csv("data.csv")
```

**Technical challenge**: WebR already occupies the service worker slot. To add CORS proxy functionality, the proxy logic must be **merged into WebR's service worker**. This means modifying or wrapping WebR's service worker file — a complex undertaking. Alternative: have WebR's service worker, after handling its own routes, forward external fetch requests through the Cloudflare proxy (modifying the URL before calling `fetch()`).

**Alternative (simpler)**: Provide a helper R function that users can call:
```r
# Helper injected before user code runs (via pyodide-like bootstrap)
proxy_read_csv <- function(url, ...) {
  proxy_url <- paste0("https://dataslope-cors-proxy.subwaymatch.workers.dev/?url=", URLencode(url, reserved=TRUE))
  read.csv(proxy_url, ...)
}
```

This is less transparent but avoids the service worker conflict.

**Recommendation**: For WebR, use WebR's service worker modification approach for full transparency. As a simpler interim solution, inject proxy-aware helper functions (`proxy_read_csv`, `proxy_read_table`, etc.) at the start of every R session.

---

### 3. JavaScript/TypeScript (almostnode)

**Networking internals**: almostnode runs in a Web Worker and provides Node.js module shims (including `http`, `https`, `fetch`). The browser's global `fetch` is available in the Web Worker scope. almostnode's `http`/`https` shims are implemented on top of browser `fetch`. The service worker will intercept these calls.

**Does `fetch("https://myurl.com/data.json")` work transparently?**

With the service worker: **Yes**. almostnode uses browser `fetch` which the service worker intercepts.

Without it: Only if the target URL has permissive CORS headers.

**Node.js-style HTTP**:
```javascript
// Node.js http module (shimmed by almostnode)
const https = require('https');
https.get('https://example.com/data.json', (res) => {
  // ...
});

// Or using fetch (available as a global in almostnode)
const response = await fetch('https://example.com/data.json');
const data = await response.json();
```

Both should work with the service worker proxy. The `https.get` shim calls browser fetch internally; the service worker intercepts it.

**Without service worker (manual)**:
```javascript
const PROXY = 'https://dataslope-cors-proxy.subwaymatch.workers.dev';
const response = await fetch(`${PROXY}/?url=${encodeURIComponent('https://example.com/data.json')}`);
const data = await response.json();
```

**Alternative for worker-level interception**: Before running user code, monkey-patch `globalThis.fetch` in the almostnode Web Worker:

```typescript
// In javascript-worker.ts, before calling runEntry():
const PROXY_BASE = process.env.NEXT_PUBLIC_CORS_PROXY_URL;
if (PROXY_BASE) {
  const originalFetch = self.fetch.bind(self);
  self.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (shouldProxy(url)) {
      const proxyUrl = `${PROXY_BASE}/?url=${encodeURIComponent(url)}`;
      return originalFetch(proxyUrl, init);
    }
    return originalFetch(input, init);
  };
}
```

This worker-level monkey-patch is simpler than a full service worker and sufficient for JS/TS.

**Recommendation**: Worker-level fetch monkey-patch. This is the simplest approach for almostnode and avoids full service worker complexity.

---

### 4. PHP (php-wasm) — `php-wasm 0.1.0` / PHP 8.4

**Networking internals**: php-wasm is an Emscripten build. PHP's networking functions (`file_get_contents`, `curl_exec`, `fopen` with URLs) use Emscripten's socket emulation, which is implemented via XHR. The Web Worker running the PHP runtime is on the app origin, so the service worker controls it.

**Does `file_get_contents("https://myurl.com/data.csv")` work transparently?**

With the service worker: **Likely yes**. Emscripten's XHR is intercepted by the service worker. `file_get_contents()`, `fopen()` with URLs, `fgets()` should all work. `curl_exec()` is trickier — cURL in php-wasm uses a custom Emscripten socket layer that may or may not route through standard XHR.

**Without service worker (manual)**:
```php
<?php
$proxy = 'https://dataslope-cors-proxy.subwaymatch.workers.dev';
$url = 'https://example.com/data.csv';
$content = file_get_contents($proxy . '/?url=' . urlencode($url));
```

Users would need to know the proxy URL, which is undesirable.

**Alternative (worker-level interception)**: Inject a PHP ini configuration or a stream wrapper that redirects external URLs through the proxy before user code runs. PHP's stream wrapper API allows registering custom protocols, but modifying the built-in `https://` stream wrapper is not straightforward.

A simpler alternative: Inject a PHP helper at the start of every PHP session:

```php
// Injected before user code
define('_PROXY_BASE', 'https://dataslope-cors-proxy.subwaymatch.workers.dev');

function proxy_file_get_contents($url, $flags = 0, $context = null) {
    if (preg_match('/^https?:\/\//', $url)) {
        $url = _PROXY_BASE . '/?url=' . urlencode($url);
    }
    return file_get_contents($url, $flags, $context);
}
```

**Technical challenge**: cURL is the most problematic. php-wasm's cURL implementation depends on Emscripten's `asyncify` and may not properly route through XHR in all cases. If cURL doesn't work via the service worker, users should use `file_get_contents` instead. The service worker approach is the best bet for transparent operation.

**Recommendation**: Use service worker for basic HTTP calls. Inject PHP helper functions for common patterns. Document cURL limitations.

---

### 5. Java (CheerpJ) — `CheerpJ 4.3`

**Networking internals**: CheerpJ runs on the **main thread** (not in a Web Worker — see `cheerpj.ts` which calls `cheerpjInit()` directly on the window). CheerpJ 4.x implements Java sockets using WebSockets to a gateway server (for raw TCP), but for HTTP/HTTPS specifically, CheerpJ intercepts `java.net.HttpURLConnection` and `java.net.URL.openStream()` and executes them as browser `fetch()` calls. This is a deliberate design choice by Leaningtech to support HTTP without requiring the WebSocket gateway.

**Does `new URL("https://myurl.com/data.csv").openStream()` work transparently?**

With the service worker: **Likely yes for HTTP**. Since CheerpJ maps `HttpURLConnection` to browser `fetch`, and the service worker intercepts main-thread fetch calls, this should be intercepted.

Without it: Only if the target has CORS headers.

**Java code examples**:
```java
import java.net.URL;
import java.io.BufferedReader;
import java.io.InputStreamReader;

// This should work transparently with service worker proxy
URL url = new URL("https://example.com/data.csv");
BufferedReader reader = new BufferedReader(new InputStreamReader(url.openStream()));
String line;
while ((line = reader.readLine()) != null) {
    System.out.println(line);
}
reader.close();
```

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;

// HttpClient (Java 11+) — CheerpJ maps to fetch
HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://example.com/data.json"))
    .GET()
    .build();
HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

**Technical challenge**: CheerpJ's networking for HTTP is implemented at the Java standard library level. The actual `fetch()` call is made from CheerpJ's internal JavaScript (part of `loader.js`). Whether it goes through the service worker depends on exactly when in the page lifecycle CheerpJ makes the `fetch()` call — specifically, whether it goes through `fetch()` or through some other internal mechanism.

CheerpJ 4.3 release notes indicate that HTTP networking is supported natively. Testing is required to confirm service worker interception works.

For raw TCP sockets (e.g., database connections, SMTP), CheerpJ uses its WebSocket-to-TCP gateway (requires `cheerpjInit({ networking: { enable: true } })`), which is unrelated to the CORS proxy.

**Recommendation**: Enable service worker and test CheerpJ's HTTP behavior. Document that raw TCP sockets are not supported (unrelated to the proxy).

---

### 6. C# (Roslyn / .NET WebAssembly)

**Networking internals**: The C# runtime uses Microsoft's Mono compiled to WebAssembly (`dotnet.native.wasm`). In .NET's Blazor WebAssembly model (which this runtime follows), `HttpClient` is implemented by .NET's `BrowserHttpHandler`, which internally calls browser `fetch()`. This is documented and official Microsoft behavior. The `HttpClient` class in .NET WASM is fully async and works correctly in browser environments.

**Does `new HttpClient().GetStringAsync("https://myurl.com/data.csv")` work transparently?**

With the service worker: **Yes**. The .NET WASM runtime calls browser `fetch()` for `HttpClient`, which the service worker intercepts.

Without it: Only if the target has CORS headers.

**C# code examples**:
```csharp
using System.Net.Http;

// This works transparently with the service worker proxy
var client = new HttpClient();
var csv = await client.GetStringAsync("https://example.com/data.csv");
Console.WriteLine(csv.Split('\n')[0]); // header row

// JSON fetch
var json = await client.GetStringAsync("https://api.example.com/data");
Console.WriteLine(json);
```

**Important constraint**: The .NET WASM runtime (Roslyn scripting) runs on the main thread, not in a Web Worker. All `HttpClient` calls must be async (no synchronous HTTP). The current C# playground already wraps user code with top-level async execution, so this is compatible.

**Technical challenge**: The `ScriptRunner.dll` assembly in the runtime bundle runs the user's C# script. The script is executed in the .NET VM, which has its own event loop integrated with JavaScript's event loop. `await` in C# maps to JavaScript Promise resolution, so async HttpClient calls work correctly. No special changes are needed for C# beyond the service worker.

**Recommendation**: Service worker approach works perfectly for C#. No code changes needed in the C# runtime. Just ensure the service worker is active.

---

### 7. DuckDB (duckdb-wasm) — `@duckdb/duckdb-wasm 1.32.0`

**Networking internals**: DuckDB-WASM has a built-in `httpfs` extension that can read remote files (Parquet, CSV, JSON, etc.) directly via HTTP. In the WASM version, `httpfs` uses browser `fetch()` internally. Additionally, DuckDB-WASM's main module runs in a Web Worker (see `duckdb.ts`: it creates a blob URL worker from `bundle.mainWorker`). Fetch calls from this worker are intercepted by the service worker.

**Does `SELECT * FROM 'https://myurl.com/data.parquet'` work transparently?**

DuckDB-WASM's `httpfs` extension uses browser `fetch()` internally. With the service worker, these `fetch()` calls are intercepted and proxied. **Yes, this should work transparently.**

**DuckDB SQL examples**:
```sql
-- Read a remote CSV
SELECT * FROM read_csv_auto('https://example.com/data.csv');

-- Read a remote Parquet file
SELECT * FROM read_parquet('https://example.com/data.parquet');

-- Read from S3 (requires configuring DuckDB's httpfs secret)
-- Note: S3 requires authentication; simple https URLs work without auth
SELECT * FROM 'https://example.com/data.parquet';

-- Multiple remote files
SELECT * FROM read_parquet(['https://example.com/2024.parquet', 'https://example.com/2025.parquet']);
```

**Without service worker (manual)**: DuckDB-WASM supports `db.registerFileBuffer()` and `db.registerFileText()` to pre-load remote data:
```typescript
// In the DuckDB engine wrapper (duckdb.ts)
const response = await fetch(`${PROXY_BASE}/?url=${encodeURIComponent(url)}`);
const buffer = await response.arrayBuffer();
await db.registerFileBuffer('data.parquet', new Uint8Array(buffer));
// Then: SELECT * FROM 'data.parquet'
```

**Important DuckDB-specific issue**: When DuckDB's `httpfs` extension reads a large Parquet file, it uses HTTP Range requests (byte range fetching). The Cloudflare CORS proxy must correctly forward the `Range` header to the upstream server and forward the `206 Partial Content` response back. The current proxy implementation does forward all non-hop-by-hop headers, which includes `Range`, so this should work. **Verify that `Content-Range` and `Accept-Ranges` response headers are forwarded correctly.**

**Recommendation**: Service worker works for DuckDB. Additionally, add `registerFileBuffer` as a convenience API in the DuckDB engine wrapper for cases where users want to preload data explicitly.

---

## Summary Matrix

| Runtime | Networking Mechanism | Service Worker Works? | Direct URL in User Code? | Manual Proxy Complexity |
|---|---|---|---|---|
| Python (Pyodide) | Emscripten XHR | ✅ Yes | ✅ Yes | Medium (`pyfetch` needed) |
| R (WebR) | WebR service worker | ⚠️ Requires SW merge | ⚠️ Partial | Medium (inject helpers) |
| JavaScript (almostnode) | Browser fetch | ✅ Yes | ✅ Yes | Low (monkey-patch fetch) |
| PHP (php-wasm) | Emscripten XHR | ✅ Yes (basic) | ✅ Basic HTTP yes | Medium (inject helpers) |
| Java (CheerpJ) | CheerpJ → fetch | ✅ Likely | ✅ Likely | High |
| C# (.NET WASM) | .NET BrowserHttpHandler → fetch | ✅ Yes | ✅ Yes | Low |
| DuckDB | DuckDB httpfs → fetch | ✅ Yes | ✅ Yes | Low (registerFileBuffer) |

---

## Implementation Plan

This plan is designed for a coding agent implementing network access across all seven runtimes.

### Phase 1: Infrastructure Updates (Pre-requisites)

**1.1 — Update Cloudflare CORS Proxy**

Edit `cloudflare-cors-proxy/src/index.ts` to add the `Cross-Origin-Resource-Policy: cross-origin` header to all responses. This header is required for resources loaded by runtimes that run under COOP/COEP headers (needed for SharedArrayBuffer / WebR).

```typescript
// In buildCorsHeaders():
"Cross-Origin-Resource-Policy": "cross-origin",
```

Also ensure `Access-Control-Allow-Credentials: true` is NOT set (it conflicts with the wildcard headers and the security model).

**1.2 — Verify .env.example**

Confirm `NEXT_PUBLIC_CORS_PROXY_URL=https://dataslope-cors-proxy.subwaymatch.workers.dev` is in `.env.example` (already present). Add it to Vercel's environment variables for production.

---

### Phase 2: Service Worker Implementation

**2.1 — Create `public/cors-proxy-sw.js`**

Implement the service worker as described in the "Transparent Proxy via Service Worker" section above. Key behaviors:
- Intercept `fetch` events for external URLs
- Skip passthrough for CDN origins (jsDelivr, unpkg, CheerpJ CDN, Pyodide CDN)
- Skip passthrough for the proxy itself (avoid double-proxying)
- Rewrite external URLs to `{PROXY_BASE}/?url={encodeURIComponent(originalUrl)}`
- Forward original request method and body

The proxy base URL should be baked into the service worker at registration time, passed as a `postMessage` immediately after registration, or read from a well-known path on the app origin (e.g., `/api/config`). The simplest approach: bake it in as a constant string in the file, which is acceptable since it is already a public `NEXT_PUBLIC_` variable.

**2.2 — Register the Service Worker**

Create `app/_components/CorsProxyServiceWorker.tsx` — a client component that registers the service worker once:

```tsx
'use client';
import { useEffect } from 'react';

export function CorsProxyServiceWorker() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (!process.env.NEXT_PUBLIC_CORS_PROXY_URL) return;
    navigator.serviceWorker
      .register('/cors-proxy-sw.js', { scope: '/' })
      .catch((err) => console.warn('[cors-proxy-sw] registration failed:', err));
  }, []);
  return null;
}
```

Add `<CorsProxyServiceWorker />` to `app/layout.tsx`.

**2.3 — Handle WebR Service Worker Conflict**

WebR registers its own service worker for cross-origin isolation. Look at how WebR's service worker is currently registered in the R runtime (`r.tsx` and any associated setup). Options:

- **Option A (Recommended)**: Add the CORS proxy intercept logic directly to WebR's service worker file. If WebR's service worker handles its own routes (matching `/__webr__/`) and falls through for everything else, add the proxy rewrite logic in the fallthrough handler.
  
- **Option B**: Register the CORS proxy service worker at a different scope (e.g., `/playground/`) that doesn't conflict with WebR's scope. This limits which runtimes benefit.

- **Option C**: Use a single merged service worker that handles both WebR's functionality and the CORS proxy. This is the cleanest long-term approach but requires understanding WebR's service worker internals.

---

### Phase 3: Runtime-Specific Integration

**3.1 — JavaScript/TypeScript (almostnode) — Worker-level fetch patch**

In `app/_components/runtime/almostnode-worker-shared.ts`, before `runEntry()` is called, patch `globalThis.fetch`:

```typescript
// In runEntry() or in the worker init, before executing user code:
export function installProxyFetch(proxyBase: string): void {
  if (!proxyBase) return;
  const _origFetch = self.fetch.bind(self);
  const passthrough = ['cdn.jsdelivr.net', 'unpkg.com', 'cjrtnc.leaningtech.com', new URL(proxyBase).hostname];
  
  (self as unknown as Record<string, unknown>).fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    const hostname = (() => { try { return new URL(url).hostname; } catch { return ''; } })();
    const shouldProxy = url.startsWith('http') && !passthrough.some(p => hostname.endsWith(p));
    if (shouldProxy) {
      return _origFetch(`${proxyBase}/?url=${encodeURIComponent(url)}`, init);
    }
    return _origFetch(input, init);
  };
}
```

Pass `NEXT_PUBLIC_CORS_PROXY_URL` from the worker's init message (the main thread sends it as part of the worker protocol).

**3.2 — Python (Pyodide) — Bootstrap code injection**

In `pyodide-worker.ts`'s `initPyodide()`, after the existing Python bootstrap (the long `runPythonAsync` call at line ~124), inject additional Python bootstrap code that:

1. Patches `urllib.request.urlopen` to use the proxy (handles `pd.read_csv`, `urllib` users)
2. Provides a `fetch()` async function built on `pyodide.http.pyfetch`

```python
# Injected Python bootstrap (PROXY_URL replaced at worker init)
import urllib.request as _urllib_request
_PROXY_BASE = "https://dataslope-cors-proxy.subwaymatch.workers.dev"
_orig_urlopen = _urllib_request.urlopen

def _proxied_urlopen(url, *args, **kwargs):
    if isinstance(url, str) and url.startswith("http"):
        from urllib.parse import quote
        url = f"{_PROXY_BASE}/?url={quote(url, safe='')}"
    elif hasattr(url, 'full_url') and url.full_url.startswith("http"):
        from urllib.parse import quote
        url.full_url = f"{_PROXY_BASE}/?url={quote(url.full_url, safe='')}"
    return _orig_urlopen(url, *args, **kwargs)

_urllib_request.urlopen = _proxied_urlopen
```

Note: `PROXY_BASE` should be passed as a pyodide global set before running this bootstrap, not hardcoded — so it comes from the `NEXT_PUBLIC_CORS_PROXY_URL` environment variable read by the worker.

**3.3 — PHP (php-wasm) — PHP helper injection**

In `php-worker.ts`'s `runCode()`, prepend a PHP helper block before user code:

```php
// Prepended helper (only if PROXY_URL is set)
if (!defined('_DS_PROXY_BASE')) {
    define('_DS_PROXY_BASE', 'https://dataslope-cors-proxy.subwaymatch.workers.dev');
    
    // Wrap stream context to use proxy for all HTTP URL opens
    stream_context_set_default([
        'http' => [
            'proxy' => null, // not a traditional proxy, but we can use a wrapper
        ]
    ]);
}
```

Actually, stream context proxying in PHP requires `'proxy' => 'tcp://...'` format — it can't redirect to an HTTPS URL this way. A better approach: register a custom stream wrapper for `https://` that redirects through the CORS proxy. Alternatively, inject PHP helper functions:

```php
function fetch_url($url, $opts = []) {
    $proxy_url = _DS_PROXY_BASE . '/?url=' . urlencode($url);
    $ctx = stream_context_create(['http' => array_merge(['method' => 'GET'], $opts)]);
    return file_get_contents($proxy_url, false, $ctx);
}
```

The service worker is the primary strategy for PHP; the PHP helper is a fallback.

**3.4 — DuckDB — Engine wrapper utility**

In `app/_components/runtime/duckdb.ts`, add a helper method to `DuckDbEngine` (or as a module-level utility):

```typescript
/**
 * Fetch a remote file through the CORS proxy and register it with DuckDB.
 * After calling this, reference the file in SQL by its basename.
 *
 * Usage:
 *   await engine.registerRemoteFile('https://example.com/data.parquet');
 *   // Then in SQL: SELECT * FROM 'data.parquet'
 */
async registerRemoteFile(url: string, name?: string): Promise<string> {
  const proxyBase = process.env.NEXT_PUBLIC_CORS_PROXY_URL;
  const fetchUrl = proxyBase ? `${proxyBase}/?url=${encodeURIComponent(url)}` : url;
  const response = await fetch(fetchUrl);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  const buffer = await response.arrayBuffer();
  const fileName = name ?? url.split('/').pop() ?? 'file';
  await this.db.registerFileBuffer(fileName, new Uint8Array(buffer));
  return fileName;
}
```

This is a convenience method; the service worker approach makes `SELECT * FROM 'https://...'` work directly.

**3.5 — Java (CheerpJ) — Test and document**

CheerpJ's HTTP behavior requires empirical testing:
1. Write a test Java program that calls `new URL("https://httpbin.org/get").openStream()`
2. Verify the service worker fires a `fetch` event for that request
3. If it does, document that `java.net.URL`, `HttpURLConnection`, and `HttpClient` work transparently
4. If it doesn't (CheerpJ uses an internal path that bypasses the service worker), investigate `cheerpjInit` options for configuring a proxy

CheerpJ documentation mentions that HTTP requests go through the browser's `fetch` API — this strongly suggests service worker interception works.

**3.6 — C# (.NET WASM) — No changes required**

`HttpClient` in .NET WASM calls `fetch()` which the service worker intercepts. Verify with a simple test:

```csharp
using System.Net.Http;
var client = new HttpClient();
var response = await client.GetStringAsync("https://httpbin.org/get");
Console.WriteLine(response);
```

Document this capability in the C# playground.

---

### Phase 4: Documentation and UX

**4.1 — Runtime-specific code examples**

For each playground, add an example snippet that demonstrates fetching remote data. The example should work as-is (relying on the service worker). Examples:

- Python: `pd.read_csv("https://raw.githubusercontent.com/...")`
- R: `df <- read.csv("https://raw.githubusercontent.com/...")`
- JS: `const res = await fetch("https://api.example.com/data"); const data = await res.json();`
- PHP: `$data = file_get_contents("https://example.com/data.json");`
- Java: `URL u = new URL("https://..."); BufferedReader r = new BufferedReader(new InputStreamReader(u.openStream()));`
- C#: `var csv = await new HttpClient().GetStringAsync("https://...");`
- DuckDB: `SELECT * FROM read_csv_auto('https://...')`

**4.2 — Error messaging**

When a network request fails due to CORS (before the service worker is active, or if the service worker fails to register), show a helpful error message explaining how to manually use the proxy.

---

## Technical Challenges and Risks

### 1. WebR Service Worker Conflict (High Risk)

WebR requires a service worker for COOP/COEP headers (SharedArrayBuffer support). The two service workers can't coexist at the same scope. This is the most complex integration challenge.

**Mitigation**: Merge proxy logic into WebR's service worker. Examine WebR's service worker source at `node_modules/webr/dist/coi-serviceworker.js` or the equivalent and add the proxy intercept logic to its fetch handler.

### 2. COOP/COEP and Cross-Origin Resource Policy (Medium Risk)

Runtimes using `SharedArrayBuffer` require `COEP: require-corp` or `COEP: credentialless` headers on the page. Resources fetched through the proxy must include `Cross-Origin-Resource-Policy: cross-origin`. The Cloudflare worker must be updated to set this header.

### 3. HTTP Range Requests for DuckDB (Medium Risk)

DuckDB's `httpfs` uses HTTP range requests for efficient Parquet reading. The proxy currently forwards the `Range` header but test this explicitly. If the upstream server returns `Accept-Ranges: none` or rejects range requests when they come via the proxy's User-Agent, DuckDB will fall back to full-file download (which is slower but still correct).

### 4. Service Worker Registration Timing (Low Risk)

On first page load, there is a window between page load and service worker activation during which network requests are not intercepted. After the service worker activates for the first time, subsequent page loads are fully covered. Mitigate by calling `skipWaiting()` and `clients.claim()` in the service worker:

```javascript
self.addEventListener('install', (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
```

### 5. Streaming Responses (Low Risk)

The Cloudflare proxy uses `upstreamResponse.body` (a ReadableStream) directly for the response, so streaming works. However, some use cases (e.g., DuckDB reading a 500 MB Parquet file) may need the proxy to not buffer the entire response. The current implementation is streaming-compatible.

### 6. Pyodide Synchronous XHR in Workers (Low Risk)

Pyodide uses synchronous `XMLHttpRequest` in Web Workers for some operations. Modern browsers still support sync XHR in worker contexts (unlike the main thread). The service worker's fetch handler is always async, but it correctly responds to both sync and async XHR calls.

### 7. POST Request Bodies (Low Risk)

The CORS proxy correctly forwards POST bodies (`body = request.body` for non-GET/HEAD methods). The service worker must forward the request body too. Since `Request.body` is a ReadableStream that can only be consumed once, the service worker should pass it directly to the proxied request without reading it:

```javascript
event.respondWith(fetch(proxyUrl, {
  method: event.request.method,
  headers: event.request.headers,
  body: ['GET', 'HEAD'].includes(event.request.method) ? undefined : event.request.body,
}));
```

### 8. almostnode's Node.js HTTP Shims (Low Risk)

almostnode shims `require('https')` with a browser-compatible implementation. If the shim uses `XMLHttpRequest` instead of `fetch`, the service worker still intercepts it. If the shim uses raw TCP (unlikely in a browser environment), it won't work through the proxy at all. Testing needed.

---

## Appendix: Proxy URL in Environment Variables

The proxy URL is already configured in `.env.example`:
```
NEXT_PUBLIC_CORS_PROXY_URL=https://dataslope-cors-proxy.subwaymatch.workers.dev
```

All runtime workers (pyodide-worker, php-worker, javascript-worker, typescript-worker) run in the browser — `NEXT_PUBLIC_` vars are available at build time and inlined by Next.js. Workers created via `new Worker(new URL(...))` receive these as they are part of the bundle. However, since Web Workers don't have access to `process.env` directly (that is a Node.js concept), the proxy URL must be passed to workers via a message or baked in as a constant during bundling.

The current codebase pattern (e.g., `pyodide-worker.ts` uses `const PYODIDE_INDEX_URL = ...` as a module-level constant) suggests that baking the proxy URL into the worker bundle via a `const PROXY_BASE = process.env.NEXT_PUBLIC_CORS_PROXY_URL ?? ''` declaration is the right pattern — Next.js (Turbopack) will replace `process.env.NEXT_PUBLIC_CORS_PROXY_URL` with the literal string value during bundling.

---

*Research by Copilot coding agent. Last updated: 2026-05-25.*
