# OPFS & Virtual Filesystem Feasibility Research

**Date:** 2026-05-16  
**Scope:** All playgrounds in the dataslope-playground repository  
**Runtimes covered:** Python (Pyodide), R (WebR), JavaScript, TypeScript, PHP (php-wasm), C (browsercc/WASI), C++ (browsercc/WASI), Java (CheerpJ), C# (.NET WASM / Mono), SQLite (sql.js), PostgreSQL (PGlite), DuckDB (duckdb-wasm)

---

## Executive Summary

All twelve playgrounds currently operate with **ephemeral, in-memory storage only**. No playground currently persists user files, uploaded assets, or code across sessions. Adding virtual filesystem (VFS) support via OPFS or complementary mechanisms is technically feasible for every runtime, though the approach, depth of benefit, and implementation effort vary considerably. The highest-value targets are **Python**, **PostgreSQL**, **SQLite**, and **DuckDB**; the lowest-value targets are **JavaScript/TypeScript** (single-file REPLs that gain little from VFS) and **C/C++** (stateless compile-and-run model).

---

## Background: Storage APIs Compared

| API | Persistence | Multi-tab | Performance | Browser support |
|---|---|---|---|---|
| **localStorage / sessionStorage** | localStorage: yes; sessionStorage: tab-lifetime | No | Slow (sync, string-only) | Universal |
| **IndexedDB** | Yes | Yes (async) | Moderate | Universal |
| **OPFS (Origin Private File System)** | Yes | Via SAB / Atomics or single-tab | Fast (native file I/O) | Chrome 102+, Edge, Firefox 111+, Safari 15.2+ (partial) |
| **In-memory (MEMFS / Emscripten)** | No – session only | No | Fastest | Universal |

**OPFS notes:**
- Operates inside the browser sandbox; invisible to the user's real filesystem.
- Requires a Secure Context (HTTPS or localhost).
- Synchronous OPFS (`createSyncAccessHandle`) is only available inside Web Workers.
- Async OPFS is available on the main thread but is slower.
- Safari support is present from 15.2 but has known limitations (no synchronous handle in workers until Safari 16+).
- Firefox support is complete since v111.

---

## Runtime-by-Runtime Analysis

---

### 1. Python — Pyodide

**Runtime:** Pyodide (Emscripten-compiled CPython WASM), runs inside a dedicated Web Worker (`pyodide-worker.ts`).

#### Current state
- Pyodide ships Emscripten's virtual filesystem (MEMFS by default).
- Standard Python file I/O (`open()`, `os.path`, `pathlib`) works against this VFS during a session.
- All files are lost on page reload.
- No persistent storage is implemented today.

#### VFS / multi-file support
- ✅ Full POSIX-like VFS via Emscripten. Python modules can `import` other `.py` files if they are placed on the VFS path (e.g., `sys.path.append("/home/pyodide")`).
- ✅ Users can already work with multiple logical files via the VFS during a session.
- ✅ Large binary assets (CSV, Parquet, images) can be placed in the VFS and accessed via standard Python I/O.

#### OPFS feasibility
- ✅ **Directly supported.** Emscripten's OPFS backend (`FS.mount(OPFS, {}, "/home/pyodide")`) can persist `/home/pyodide` across sessions.
- Since Pyodide runs in a Worker, the synchronous OPFS `createSyncAccessHandle` API is available, which gives performance comparable to native I/O.
- Pyodide 0.22+ documentation highlights OPFS as the recommended persistence approach.

#### Implementation approach
1. In `pyodide-worker.ts`, before loading Pyodide, mount the OPFS root to `/home/pyodide`:
   ```js
   const opfsRoot = await navigator.storage.getDirectory();
   FS.mkdir("/home/pyodide");
   FS.mount(OPFS, { root: opfsRoot }, "/home/pyodide");
   ```
2. Expose a message API to the main thread for: listing files, uploading files (write to VFS path), deleting files.
3. Add a file manager UI panel that shows persisted files and allows drag-and-drop upload.
4. Optionally expose a `sync()` call after writes to flush OPFS.

#### Technical limitations / challenges
- Cold-start cost: initial mount adds ~50–200 ms overhead.
- OPFS quota (typically hundreds of MB to low GBs depending on available disk space and browser).
- Cross-tab: two Pyodide tabs sharing the same OPFS directory can cause conflicts; single-tab use is the safe model.
- Packages installed via `micropip` are not automatically persisted (they live in Pyodide's bundle, not the user VFS).

#### Browser compatibility
- Chrome 102+ / Edge: full support including synchronous handle in Worker.
- Firefox 111+: full support.
- Safari 15.2+: partial; synchronous `createSyncAccessHandle` works from Safari 16+.

#### Recommendation: **Strong fit** ⭐⭐⭐
Python is the most data-science-centric playground. Persisting uploaded CSVs, trained model weights, and helper modules across sessions is a high-value feature. OPFS integration is straightforward given the Worker-based architecture.

---

### 2. R — WebR

**Runtime:** WebR (Emscripten-compiled R WASM), runs in a Web Worker (inferred from the adapter pattern; `r.tsx` delegates to a worker).

#### Current state
- WebR uses Emscripten's MEMFS (in-memory). All files are lost on reload.
- No persistence implemented today.

#### VFS / multi-file support
- ✅ Full Emscripten VFS. R can `source()` other `.R` files placed on the filesystem.
- ✅ Data files (CSV, RData) can be read from the VFS.

#### OPFS feasibility
- ✅ WebR 0.2.0+ integrates with OPFS via Emscripten. The `webr` package documentation describes mounting OPFS to `/home/webr`.
- Since WebR runs in a Worker, synchronous OPFS handles are available.

#### Implementation approach
- Same pattern as Pyodide: mount OPFS directory before starting WebR, expose file management APIs via postMessage.
- Key path: `/home/rstudio` or `/home/webr` (match WebR defaults).

#### Technical limitations / challenges
- R packages installed via `webr::install()` are not persisted in user OPFS by default.
- Large R datasets can be slow to load from OPFS on first use.
- WebR has less ecosystem documentation around OPFS than Pyodide.

#### Browser compatibility
- Same as Pyodide: Chrome/Edge full, Firefox 111+ full, Safari 16+ for sync handles.

#### Recommendation: **Strong fit** ⭐⭐⭐
R users frequently upload CSV/Excel data. Persisting those assets across sessions is a clear UX win.

---

### 3. JavaScript

**Runtime:** JavaScript runs in a dedicated Web Worker via `AsyncFunction` (`javascript-worker.ts`). No external WASM runtime.

#### Current state
- Pure in-memory execution. No VFS.
- No persistence today.

#### VFS / multi-file support
- ❌ No native VFS concept. JavaScript is single-file in this REPL model.
- Multi-file support would require a bundling layer (e.g., in-browser Rollup/esbuild).

#### OPFS feasibility
- ⚠️ OPFS can be used from a Worker to persist user code as `.js` files, but there is no module resolution mechanism to `import` them at runtime without a bundler step.
- Code persistence (saving the editor content) is better handled by **localStorage** or **IndexedDB** — a much simpler solution.

#### Alternative: localStorage for code persistence
- Save the editor's current code to `localStorage["js:code"]` on every edit.
- Restore on page load.
- Already done conceptually for SQL playgrounds (storage prefix pattern observed in the codebase).

#### Recommendation: **Partial fit** ⭐⭐
OPFS is overkill. Persisting user code via localStorage is already valuable and trivially implementable. A multi-file / module sandbox (like CodeSandbox) would require significant bundler infrastructure that is out of scope.

---

### 4. TypeScript

**Runtime:** Identical to JavaScript but uses the TypeScript compiler (`typescript-worker.ts`) before execution.

#### Analysis
- Same as JavaScript above.
- TypeScript multi-file support is particularly interesting (types across files, barrel imports), but would require a full in-browser module bundler and is out of scope for a REPL playground.

#### Recommendation: **Partial fit** ⭐⭐
Same as JavaScript. localStorage code persistence is the right level of investment.

---

### 5. PHP — php-wasm

**Runtime:** PHP compiled to WASM, runs in a Web Worker (`php-worker.ts`), using Emscripten underneath.

#### Current state
- In-memory MEMFS only. No persistence.

#### VFS / multi-file support
- ✅ Emscripten VFS available. PHP's `require` / `include` / `require_once` work against the VFS.
- ✅ Multiple PHP files can coexist in the VFS.

#### OPFS feasibility
- ✅ Emscripten's OPFS backend can be used. Since php-wasm runs in a Worker, synchronous OPFS handles are available.
- php-wasm's GitHub shows community exploration of OPFS mounting.

#### Implementation approach
- Mount OPFS at `/persist` before loading PHP runtime.
- Expose file management APIs (upload, list, delete) via postMessage.
- PHP files placed in `/persist` can be `require`d from the main script.

#### Recommendation: **Partial fit** ⭐⭐
PHP multi-file support (include chains) is genuinely useful, especially for demonstrating OOP patterns or MVC structures. However, the PHP playground is primarily a scripting sandbox, so the marginal benefit is moderate compared to Python/R.

---

### 6. C — browsercc / WASI

**Runtime:** C is compiled at runtime in the browser via `browsercc` (clang/lld toolchain compiled to WASM), then executed as a WASI binary using `@bjorn3/browser_wasi_shim`. No persistent storage.

#### Current state
- Compilation is stateless (source-in → binary-out). The WASI shim provides a minimal in-memory filesystem for the running binary.
- No persistence of compiled artefacts or source files.

#### VFS / multi-file support
- ⚠️ The `extraFiles` field in `BrowserccCompileJob` allows injecting additional files (headers, C sources) into the compiler's VFS at compile time. This supports multi-file compilation within a single session.
- There is no ability to persist compiled `.wasm` binaries across sessions.

#### OPFS feasibility
- ⚠️ OPFS could theoretically be used to:
  - Persist user `.c` source files across sessions.
  - Cache compiled WASM binaries to speed up re-runs (the most impactful use).
- The WASI shim's in-memory FS could be seeded from OPFS before each run.

#### Technical limitations / challenges
- Compiled binary caching is complex: the cache key must include all source files + compiler flags.
- C playgrounds are primarily used for learning single-function patterns; multi-file projects would be unusual.
- browsercc itself doesn't expose OPFS mounting today.

#### Recommendation: **Not recommended** ⭐
The C playground is a compile-and-run REPL. Users don't maintain project state across sessions. localStorage for code persistence suffices. OPFS adds complexity with minimal UX benefit.

---

### 7. C++ — browsercc / WASI

**Runtime:** Identical to C but uses `clangFormat` and C++ headers. The precompiled header (PCH) for `<bits/stdc++.h>` is already cached in-memory across navigations.

#### Recommendation: **Not recommended** ⭐
Same reasoning as C. PCH caching already addresses the most painful latency issue. OPFS integration provides negligible UX improvement.

---

### 8. Java — CheerpJ

**Runtime:** CheerpJ 4.3 (full OpenJDK JVM compiled to WASM). The playground compiles user source with `javac` (via bundled `tools.jar`) and runs the output with `cheerpjRunMain`. Runs on the main thread via script injection.

#### Current state
- CheerpJ uses its own virtual filesystem with two mount points:
  - `/app`: mapped to the hosting web server (Next.js serves static assets here).
  - `/str/`: populated via `cheerpjAddStringFile()` — a read-only in-memory string filesystem used to inject the user's compiled `.class` files.
- No persistent user file storage today.

#### VFS / multi-file support
- ⚠️ **Single public class per compilation** is the current model (the playground compiles whatever is in the editor as `Main.java`).
- CheerpJ's `/str/` VFS can hold multiple class files, but the UI only supports a single-file editor.
- True multi-file Java support would require a multi-tab editor and a class resolution strategy.

#### OPFS feasibility
- ✅ CheerpJ internally uses **IndexedDB** as its primary persistence backend for its virtual filesystem (Linux overlay FS). OPFS is available as an opt-in performance enhancement in Chromium browsers.
- CheerpJ's `/files/` mount point is backed by IndexedDB by default.
- To expose user-level OPFS persistence, one approach is to mount an OPFS directory and populate it before calling `cheerpjInit`.

#### Technical limitations / challenges
- CheerpJ runs on the main thread (no Worker), so only async OPFS is available — synchronous `createSyncAccessHandle` requires a Worker context.
- Multi-file Java compilation (multiple `*.java` sources) requires changes to the compilation pipeline (`javac` invocation with a source path), not just the VFS.
- CheerpJ's startup time (~3–5 seconds) is the dominant UX pain point; VFS integration adds overhead.

#### Whether persistence already exists
- CheerpJ's own runtime data (JVM classes, JIT cache) is persisted by CheerpJ internally via IndexedDB. **User source and compiled classes are not persisted** — they are injected fresh on each run.

#### Recommendation: **Partial fit** ⭐⭐
Persisting user `.java` source and compiled `.class` files across sessions via IndexedDB (bridged through CheerpJ's own VFS) is feasible but requires moderate effort. Multi-file Java support is the bigger feature that unlocks the most value; OPFS integration alone is secondary.

---

### 9. C# — .NET WASM (Mono / Roslyn)

**Runtime:** `dotnet.ts` loads the official .NET WASM runtime (Mono compiled to WASM) plus Roslyn's C# scripting engine from a CDN. Runs on the main thread.

#### Current state
- .NET WASM runtime uses in-memory storage. No persistence.
- The playground uses C# script mode (top-level statements), which is a single-file model.

#### VFS / multi-file support
- .NET 8+ on WASM introduces the `/browserfs` virtual path, backed by OPFS on Chromium and IndexedDB on other browsers. This is accessible via standard `System.IO` APIs.
- Multi-file C# (multiple `.cs` sources compiled together) would require changes to the Roslyn invocation — currently only a single script string is compiled.

#### OPFS feasibility
- ✅ .NET 8+ WASM can map `/browserfs` to OPFS automatically. Standard `File.WriteAllText("/browserfs/data.txt", ...)` persists across sessions.
- Since .NET WASM runs on the main thread in this implementation, only async OPFS is available (synchronous would require a Worker).

#### Technical limitations / challenges
- The runtime is loaded from a CDN; CDN version dictates OPFS support availability.
- Single-file script model limits the utility of a multi-file VFS significantly.

#### Recommendation: **Partial fit** ⭐⭐
`/browserfs` persistence for assets (data files) makes sense. Multi-file C# compilation is an advanced feature with limited demand in a playground context.

---

### 10. SQLite — sql.js

**Runtime:** sql.js (SQLite compiled to WASM), runs in a dedicated Web Worker (`sqlite-worker.ts`).

#### Current state
- sql.js operates entirely in memory. The database is lost on page reload.
- No persistence today.

#### VFS / multi-file support
- SQLite is a single-file database; multi-file support means multiple `.db` files.
- Users can import a `.db` file via drag-and-drop (likely already possible given the codebase patterns).

#### OPFS feasibility
- ✅ **Two strong options:**
  1. **wa-sqlite with OPFS backend** (drop-in sql.js replacement): wa-sqlite supports OPFS via `createSyncAccessHandle` inside a Worker. The SQLite database file lives physically in OPFS, survives reloads, and performs near-native I/O speeds.
  2. **Export/import via IndexedDB:** On each "save", serialize the sql.js `Database.export()` ArrayBuffer and store it in IndexedDB. On load, restore it. Simpler but requires explicit save/load UX.

- Option 1 (wa-sqlite) would require replacing the current sql.js runtime, which is a significant change. Option 2 is additive and low-risk.

#### Implementation approach (Option 2, low risk)
1. Add a "Save Database" button that calls `db.export()` and stores the ArrayBuffer in IndexedDB under a user-named key.
2. Add a "Load Database" dropdown that restores a previously saved database.
3. Optionally auto-save on every query run.

#### Recommendation: **Strong fit** ⭐⭐⭐
SQLite users most often want to persist their schema and data across sessions. This is the clearest persistence use case. Option 2 (IndexedDB export/import) has the best risk/reward ratio; wa-sqlite migration is a longer-term option.

---

### 11. PostgreSQL — PGlite

**Runtime:** PGlite (`@electric-sql/pglite`) with `PGliteWorker`. PGlite is PostgreSQL compiled to WASM.

#### Current state
- PGlite runs in-memory. The database is lost on reload.
- No persistence today.

#### VFS / multi-file support
- PGlite manages its own filesystem (the PostgreSQL cluster directory). Users interact via SQL, not file paths.

#### OPFS feasibility
- ✅ **PGlite natively supports OPFS.** Passing `storageBackend: 'opfs'` (or `dataDir: 'idb://...'` for IndexedDB) to the `PGlite` constructor enables persistence.
- This is a first-class supported feature in PGlite 0.x and is recommended in the ElectricSQL documentation.

#### Implementation approach
1. Change the `PGlite` / `PGliteWorker` initialization in `postgres.ts` to pass `dataDir: 'opfs://pg-playground'` (OPFS) or `dataDir: 'idb://pg-playground'` (IndexedDB fallback).
2. Detect OPFS support at startup; fall back to IndexedDB if unavailable.
3. Expose a "Reset Database" action to clear the persisted data directory.
4. Show a persistence indicator in the UI.

#### Technical limitations / challenges
- PGlite's OPFS backend requires Chromium for optimal performance (synchronous access in the Worker).
- OPFS storage directory is per-origin but not per-tab; multiple tabs sharing the same `pg-playground` directory would conflict.
- First-load time increases slightly when initializing from an OPFS-backed cluster.

#### Recommendation: **Strong fit** ⭐⭐⭐
PGlite's native OPFS support makes this the easiest high-value persistence win in the entire codebase. Users working through multi-step SQL scenarios (creating schemas, inserting data, querying) gain immediately. Implementation is a 1–2 line change to the initializer.

---

### 12. DuckDB — duckdb-wasm

**Runtime:** DuckDB WASM, loaded from jsDelivr CDN at runtime, runs in a Worker. The engine is in `duckdb.ts`.

#### Current state
- DuckDB WASM operates in memory. The database is lost on reload.
- No persistence today.
- `cleanDuckDbSchema()` / `bootstrapDatabase()` reset the schema on each page visit.

#### VFS / multi-file support
- DuckDB natively supports reading from URLs, S3 paths, and local file paths. In the browser context, it can read from in-memory Parquet/CSV blobs.
- Persistent file storage would allow users to attach local `.duckdb` files.

#### OPFS feasibility
- ✅ **duckdb-wasm supports OPFS persistence** via `open({ path: 'opfs://mydb.duckdb' })` (as of duckdb-wasm 1.30+).
- This stores the entire DuckDB database file in OPFS, surviving reloads.
- The current code dynamically loads duckdb-wasm from jsDelivr. The OPFS open path must be passed during DB initialization.

#### Implementation approach
1. In `duckdb.ts`, when initializing the DuckDB instance, check for OPFS support.
2. If available, open with `path: 'opfs://duckdb-playground.duckdb'`.
3. Remove the `bootstrapDatabase` / `cleanDuckDbSchema` auto-reset behavior (or make it conditional on whether a persisted DB already exists).
4. Add a "Reset Database" action for users who want a clean slate.

#### Technical limitations / challenges
- OPFS for DuckDB requires Chromium (full support) or Firefox 111+ (limited).
- The current `cleanDuckDbSchema` approach (dropping all tables on each load) is **incompatible** with persistence — this logic must be replaced with a first-run detection pattern.
- DuckDB's OPFS backend requires `SharedArrayBuffer`, which in turn requires Cross-Origin Isolation (`COOP`/`COEP` headers). This is a significant deployment constraint if not already configured.

#### Recommendation: **Strong fit** ⭐⭐⭐ (with caveats)
DuckDB is primarily an analytics engine. Users frequently want to upload large CSV/Parquet files and run multiple queries across sessions. OPFS persistence is highly valuable. The `SharedArrayBuffer` requirement must be verified against the current deployment headers before implementation.

---

## Summary Table

| Playground | Runtime | VFS Support | OPFS Directly | Best Persistence Option | Recommendation |
|---|---|---|---|---|---|
| Python | Pyodide | ✅ Emscripten POSIX | ✅ Yes | OPFS via Emscripten mount | ⭐⭐⭐ Strong fit |
| R | WebR | ✅ Emscripten POSIX | ✅ Yes | OPFS via Emscripten mount | ⭐⭐⭐ Strong fit |
| JavaScript | Worker AsyncFn | ❌ None | ⚠️ Possible | localStorage (code only) | ⭐⭐ Partial fit |
| TypeScript | Worker AsyncFn | ❌ None | ⚠️ Possible | localStorage (code only) | ⭐⭐ Partial fit |
| PHP | php-wasm (Emscripten) | ✅ Emscripten POSIX | ✅ Yes | OPFS via Emscripten mount | ⭐⭐ Partial fit |
| C | browsercc / WASI | ⚠️ extraFiles only | ⚠️ Complex | localStorage (code only) | ⭐ Not recommended |
| C++ | browsercc / WASI | ⚠️ extraFiles only | ⚠️ Complex | localStorage (code only) | ⭐ Not recommended |
| Java | CheerpJ | ✅ /str/ + /app/ | ⚠️ IndexedDB preferred | IndexedDB via CheerpJ VFS | ⭐⭐ Partial fit |
| C# | .NET WASM (Mono) | ✅ /browserfs | ✅ Auto via /browserfs | /browserfs (OPFS or IDB) | ⭐⭐ Partial fit |
| SQLite | sql.js | ⚠️ In-memory DB | ⚠️ Needs wa-sqlite swap | IndexedDB export/import | ⭐⭐⭐ Strong fit |
| PostgreSQL | PGlite | ✅ Cluster dir | ✅ Native (dataDir param) | OPFS via PGlite config | ⭐⭐⭐ Strong fit |
| DuckDB | duckdb-wasm | ✅ In-memory DB | ✅ OPFS path param | OPFS via db path param | ⭐⭐⭐ Strong fit |

---

## Proposed Unified Architecture

### Abstraction Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     Playground UI Layer                      │
│  FileManagerPanel | PersistenceIndicator | ResetDatabaseBtn │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│              PlaygroundStorageAdapter (per runtime)          │
│  interface {                                                 │
│    listFiles(): Promise<FileEntry[]>                        │
│    readFile(path): Promise<ArrayBuffer>                     │
│    writeFile(path, data): Promise<void>                     │
│    deleteFile(path): Promise<void>                          │
│    exportDatabase?(): Promise<ArrayBuffer>   // SQL only    │
│    importDatabase?(data): Promise<void>      // SQL only    │
│    reset(): Promise<void>                                   │
│  }                                                           │
└────────────────────────────┬────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   ┌───────────┐      ┌───────────┐      ┌──────────────┐
   │ OPFSStore │      │  IDBStore │      │ LocalStorage  │
   │ (Chromium)│      │ (fallback)│      │ (code-only)  │
   └───────────┘      └───────────┘      └──────────────┘
```

### Storage Backend Selection Logic

```typescript
async function selectStorageBackend(): Promise<'opfs' | 'idb' | 'localStorage'> {
  if ('storage' in navigator && 'getDirectory' in (await navigator.storage.getDirectory?.() ?? {})) {
    return 'opfs';
  }
  if ('indexedDB' in window) {
    return 'idb';
  }
  return 'localStorage';
}
```

### Per-Runtime Adapter Mapping

| Runtime | Adapter implementation |
|---|---|
| Pyodide | `FS.mount(OPFS, {}, "/home/pyodide")` in Worker |
| WebR | `FS.mount(OPFS, {}, "/home/webr")` in Worker |
| php-wasm | `FS.mount(OPFS, {}, "/persist")` in Worker |
| PGlite | `new PGlite({ dataDir: 'opfs://pg-playground' })` |
| DuckDB | `db.open({ path: 'opfs://duckdb.duckdb' })` |
| sql.js | IndexedDB serialization of `db.export()` |
| CheerpJ | IndexedDB (CheerpJ's own `/files/` mount) |
| .NET WASM | `/browserfs` path prefix in `System.IO` |
| JS/TS | localStorage key `js:code` / `ts:code` |
| C/C++ | localStorage key `c:code` / `cpp:code` |

---

## Tradeoffs: OPFS vs IndexedDB vs In-Memory

| Factor | OPFS | IndexedDB | In-Memory |
|---|---|---|---|
| **Performance** | Best (native I/O, sync in Worker) | Moderate (async transactions) | Fastest |
| **Persistence** | Yes (until site data cleared) | Yes (until site data cleared) | No |
| **Storage quota** | Large (based on available disk) | Large (browser-managed) | Limited (RAM) |
| **API complexity** | Moderate (File handles, sync API) | High (transactions, cursors) | Zero |
| **Multi-tab safety** | Risky without lock | Safe | N/A |
| **Browser support** | Chrome 102+, FF 111+, Safari 15.2+ | Universal | Universal |
| **Worker requirement** | Sync API requires Worker | No | No |
| **Large file support** | ✅ Excellent | ⚠️ Chunking needed | ❌ RAM-limited |
| **SQL DB files** | ✅ Ideal (byte-level access) | ⚠️ Must serialize whole DB | ❌ No |

**Recommendation:** Use OPFS as the primary backend for all Emscripten-based runtimes (Python, R, PHP) and native-OPFS-supporting databases (PGlite, DuckDB). Use IndexedDB as the universal fallback, and for CheerpJ (which already layers over IndexedDB). Use localStorage only for lightweight code/text persistence (JS, TS, C, C++).

---

## Browser Compatibility Concerns

| Feature | Chrome | Firefox | Safari | Notes |
|---|---|---|---|---|
| OPFS (async) | ✅ 102+ | ✅ 111+ | ✅ 15.2+ | Broadly available |
| OPFS sync handle (Worker) | ✅ 102+ | ✅ 111+ | ✅ 16+ | Required for Emscripten runtimes |
| IndexedDB | ✅ | ✅ | ✅ | Universal fallback |
| SharedArrayBuffer (DuckDB) | ✅ (COOP/COEP) | ✅ (COOP/COEP) | ✅ (COOP/COEP) | Requires isolation headers |
| `navigator.storage.persist()` | ✅ | ✅ | ✅ | Grants durable quota |

**Key action:** Verify that the Next.js deployment sets `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers. These are required for SharedArrayBuffer (DuckDB OPFS) and also unlock OPFS synchronous handles across all browsers.

---

## Performance Considerations

1. **First-load cold start:** OPFS mounting adds 50–300 ms on first initialization. This is acceptable for data-heavy runtimes (Pyodide, WebR, PGlite) but should be hidden behind the existing loading UI.
2. **Large file uploads:** OPFS handles multi-GB files efficiently since it operates at the OS file level. IndexedDB struggles with files >100 MB due to serialization overhead.
3. **Write throughput:** OPFS synchronous handles (in Workers) achieve ~200–500 MB/s write on modern hardware. IndexedDB typically achieves ~10–50 MB/s.
4. **Quota exhaustion:** Implement a quota check UI (`navigator.storage.estimate()`) and warn users when approaching limits.
5. **DuckDB-specific:** DuckDB WASM with OPFS requires SharedArrayBuffer, which enforces Cross-Origin Isolation, potentially breaking lazy-loaded CDN resources (WASM files) unless those CDN servers send CORS headers. The current DuckDB implementation loads from jsDelivr; verify jsDelivr sends `Cross-Origin-Resource-Policy: cross-origin`.

---

## Phased Rollout Plan

### Phase 1 — Quick Wins (Low effort, high value)
1. **PostgreSQL (PGlite):** Change one or two constructor parameters to enable OPFS persistence. Add a "Reset Database" UI action. Estimated: 1–2 days.
2. **localStorage code persistence (all playgrounds):** Save editor content to localStorage on every edit; restore on mount. This applies to JS, TS, C, C++, PHP, Python, R, Java, C#. Estimated: 1 day.
3. **SQLite IndexedDB export/import:** Add "Save Database" / "Load Database" actions backed by IndexedDB serialization. Estimated: 2–3 days.

### Phase 2 — Emscripten Runtimes (Medium effort)
4. **Python (Pyodide):** Mount OPFS in the Worker. Add a file manager panel. Estimated: 3–5 days.
5. **R (WebR):** Same pattern as Pyodide. Estimated: 2–3 days.
6. **PHP (php-wasm):** Same Emscripten OPFS pattern. Estimated: 2 days.

### Phase 3 — SQL Engines (Medium-high effort)
7. **DuckDB (duckdb-wasm):** Enable OPFS path during DB open. Verify SharedArrayBuffer / Cross-Origin Isolation headers. Remove auto-reset from bootstrapDatabase. Estimated: 3–4 days (+ potential deployment header changes).

### Phase 4 — Non-Emscripten Runtimes (Highest effort, lower priority)
8. **Java (CheerpJ):** Explore CheerpJ's `/files/` IndexedDB mount for user class persistence. Investigate multi-file Java compilation. Estimated: 5–7 days.
9. **C# (.NET WASM):** Use `/browserfs` for data file persistence. Estimated: 2–3 days.

### Not recommended for VFS implementation
- **C / C++ playgrounds:** localStorage code persistence from Phase 1 is sufficient.

---

## Recommended Abstractions

### `PlaygroundPersistence` interface (new module: `app/_components/runtime/persistence.ts`)

```typescript
export interface FileEntry {
  name: string;
  path: string;
  size: number;
  lastModified: number;
  type: 'code' | 'data' | 'database';
}

export interface PlaygroundPersistence {
  /** One-time setup, called once when the runtime is ready. */
  initialize(): Promise<void>;
  /** List all files in persistent storage. */
  listFiles(): Promise<FileEntry[]>;
  /** Read a file from persistent storage. */
  readFile(path: string): Promise<ArrayBuffer>;
  /** Write or update a file in persistent storage. */
  writeFile(path: string, data: ArrayBuffer | string): Promise<void>;
  /** Delete a file from persistent storage. */
  deleteFile(path: string): Promise<void>;
  /** Clear all persisted data (factory reset). */
  reset(): Promise<void>;
  /** Estimate storage usage. */
  estimateUsage(): Promise<{ used: number; quota: number }>;
}
```

Concrete implementations:
- `OPFSPersistence` — for Emscripten runtimes in Workers
- `IDBPersistence` — universal fallback, used for sql.js and CheerpJ
- `LocalStoragePersistence` — lightweight, code-only, for JS/TS/C/C++
- `PGlitePersistence` — wraps PGlite's built-in OPFS/IDB support
- `DuckDBPersistence` — wraps duckdb-wasm's built-in OPFS path

---

## Conclusion

Virtual filesystem persistence via OPFS is **feasible and beneficial** for the majority of playgrounds in this repository. The strongest immediate opportunities are:

1. **PostgreSQL** — native PGlite OPFS support, near-zero implementation cost
2. **SQLite** — IndexedDB export/import, low risk additive approach
3. **Python / R** — Emscripten OPFS mount in Worker, highest user value

OPFS is the recommended primary backend for all Worker-based runtimes, with IndexedDB as the universal fallback. LocalStorage is appropriate only for lightweight code content persistence. A unified `PlaygroundPersistence` abstraction should be introduced to make persistence a first-class, consistent capability across all playgrounds.
