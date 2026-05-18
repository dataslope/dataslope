# OPFS Persistence, Isolated Workspaces, Multi-Tab Editing & Zustand Standardization — Implementation Plan

**Date:** 2026-05-18  
**Target agent:** Coding agent that will implement the changes  
**Scope:** All 12 playgrounds — Python, R, JavaScript, TypeScript, PHP, C, C++, Java, C#, SQLite, PostgreSQL, DuckDB

---

## Table of Contents

1. [Current State Audit](#1-current-state-audit)
2. [OPFS Best Practices for Browser Playground Environments](#2-opfs-best-practices-for-browser-playground-environments)
3. [Isolated Workspace Architecture](#3-isolated-workspace-architecture)
4. [Multi-Tab Editing for Non-SQL Playgrounds](#4-multi-tab-editing-for-non-sql-playgrounds)
5. [Technical Challenges and Mitigations](#5-technical-challenges-and-mitigations)
6. [Zustand Standardization Evaluation](#6-zustand-standardization-evaluation)
7. [Implementation Recommendations and Rollout Strategy](#7-implementation-recommendations-and-rollout-strategy)

---

## 1. Current State Audit

### 1.1 Persistence: Who Uses localStorage and How

**Non-SQL playgrounds (`app/_components/Playground.tsx`)**  
`PlaygroundInner` uses `useState` for all settings and reads/writes `localStorage` directly:

- `pg_${adapter.id}_code` — editor contents (written synchronously on every CodeMirror doc change via an `updateListener`)
- `pg_${adapter.id}_fontsize` — font size
- `pg_${adapter.id}_editortheme` — per-playground legacy key (falls back to `pg_editor_theme` shared key)
- `pg_${adapter.id}_outputfontsize` / `pg_${adapter.id}_outputfontsize_enabled`
- `pg_${adapter.id}_wordwrap`
- `pg_${adapter.id}_clearbeforerun`
- `pg_editor_theme` — shared editor theme (from `playgroundTheme.ts`)

**SQLite playground**  
- `pg_sqlite_db` — active database id
- `pg_sqlite_db_${dbId}_tabs` — serialized `QueryTab[]` array (code + title)
- `pg_sqlite_db_${dbId}_active_tab` — active tab id
- `pg_sqlite_page_size` — pagination page size
- Various settings in `useSettingsStore` that are NOT currently persisted (they live only in Zustand memory)
- Theme via the shared `pg_editor_theme` key

**DuckDB playground**  
- Settings in `useDuckDbSettingsStore` (Zustand, in-memory only — NOT persisted to localStorage)
- Tabs and query state likely in Zustand in-memory (DuckDbPlayground.tsx manages its own tab state)
- Theme via the shared `pg_editor_theme` key

**PostgreSQL playground**  
- Settings in `usePostgresSettingsStore` (Zustand, in-memory only)
- Similar pattern to DuckDB

**Shared**  
- `playgroundTheme.ts` `getStoredEditorTheme` / `setStoredEditorTheme` read/write `pg_editor_theme` from localStorage synchronously

### 1.2 No-Tab Non-SQL Playgrounds

`Playground.tsx` provides a single CodeMirror editor with:
- A single `adapter.examples[0]?.code` default
- One saved code string per language (`pg_${adapter.id}_code`)
- No concept of files, tabs, or workspaces
- No virtual filesystem integration

### 1.3 Zustand Usage Matrix

| Playground | Zustand Used | Stores |
|---|---|---|
| SQLite | ✅ Yes | `useTabStore`, `useEngineStore`, `useSettingsStore`, `useSqlPlaygroundStore`, `useDialogStore`, `usePragmaStore` |
| DuckDB | ✅ Yes | `useDuckDbSettingsStore` (wraps `createSchemaSettingsStore`) |
| PostgreSQL | ✅ Yes | `usePostgresSettingsStore` (wraps `createSchemaSettingsStore`) |
| Python | ❌ No | Plain `useState` in `PlaygroundInner` |
| R | ❌ No | Plain `useState` in `PlaygroundInner` |
| JavaScript | ❌ No | Plain `useState` in `PlaygroundInner` |
| TypeScript | ❌ No | Plain `useState` in `PlaygroundInner` |
| PHP | ❌ No | Plain `useState` in `PlaygroundInner` |
| C | ❌ No | Plain `useState` in `PlaygroundInner` |
| C++ | ❌ No | Plain `useState` in `PlaygroundInner` |
| Java | ❌ No | Plain `useState` in `PlaygroundInner` |
| C# | ❌ No | Plain `useState` in `PlaygroundInner` |

---

## 2. OPFS Best Practices for Browser Playground Environments

### 2.1 OPFS API Surface

OPFS (`navigator.storage.getDirectory()`) exposes two interaction modes:

**Async API (main thread + workers)**
```
navigator.storage.getDirectory() → FileSystemDirectoryHandle
  ├── .getDirectoryHandle(name, { create })
  ├── .getFileHandle(name, { create })
  │     └── .getFile() → File
  │     └── .createWritable() → FileSystemWritableFileStream
  └── .removeEntry(name, { recursive })
```

**Synchronous Access Handle (workers only)**
```
fileHandle.createSyncAccessHandle() → FileSystemSyncAccessHandle
  ├── .read(buffer, { at })
  ├── .write(buffer, { at })
  ├── .truncate(size)
  ├── .getSize()
  └── .close()
```

### 2.2 Performance Model

The **synchronous access handle** is the high-performance path. It blocks the worker thread (not the main thread) while doing I/O. This is how both PGlite (PostgreSQL) and sql.js integrate with OPFS — they run in a worker and use sync access handles to give the C/WASM storage layer direct I/O without going async at every call.

**Rule:** For database engines (SQLite, PGlite, DuckDB), use OPFS sync access handles inside a worker. For file metadata and light reads (tab state, settings), use the async API from the main thread.

### 2.3 What to Store in OPFS vs What to Keep in localStorage

| Data | Store in OPFS | Keep in localStorage |
|---|---|---|
| SQLite `.db` file | ✅ | ❌ |
| PGlite data directory | ✅ | ❌ |
| DuckDB persisted database | ✅ | ❌ |
| Editor tab content (code files) | ✅ | ❌ |
| Editor settings (theme, font size) | ❌ | ✅ (cross-workspace) |
| Workspace registry (list of workspaces) | ❌ | ✅ (lightweight) |
| Active workspace ID for current tab | ❌ | ❌ (sessionStorage) |

**Rationale:**  
Settings (theme, font size) are user preferences, not workspace data. They should remain in `localStorage` and be shared across all workspaces. The workspace registry (list of workspace names + IDs) should also be in `localStorage` since it needs to be available synchronously on load to pick the right OPFS directory.

### 2.4 OPFS Directory Structure

```
opfs root  (navigator.storage.getDirectory())
└── workspaces/
    ├── ws_1748261000_abc12/          ← workspace dir named by ID
    │   ├── meta.json                 ← { name, createdAt, playground }
    │   ├── tabs.json                 ← tab list with file references
    │   ├── files/
    │   │   ├── t_1748261001_xyz1.py  ← file named by tab ID
    │   │   └── t_1748261002_uvw2.py
    │   └── db/
    │       └── sqlite.db             ← SQLite database binary
    └── ws_1748261500_def34/
        ├── meta.json
        ├── tabs.json
        └── files/
            └── t_1748261501_ghi5.sql
```

This structure isolates each workspace into its own OPFS directory. A workspace directory can be deleted atomically with `removeEntry(name, { recursive: true })`.

### 2.5 Writing to OPFS: Strategies

**Strategy A: Write-through on every change (simplest)**  
Every edit immediately writes to the corresponding OPFS file. Use the async API with debouncing (e.g., 500ms) so rapid typing doesn't thrash disk.

**Strategy B: Write-on-idle (mirrors current localStorage approach)**  
Queue writes and flush on `requestIdleCallback` or `pagehide`/`visibilitychange`. Already modeled by `app/_components/sql/utils/persistedStorage.ts` for localStorage.

**Strategy C: Journal + checkpoint (most robust)**  
Append a small diff record to a journal file on each change; write the full snapshot periodically or on unload. Complex to implement; only worthwhile if OPFS write performance is a bottleneck.

**Recommendation:** Use **Strategy B** — an async write queue with idle flushing — mirroring the existing `persistedStorage.ts` pattern. Extend the existing `ensurePersistUnloadFlush` pattern to also flush OPFS writes on `pagehide`/`visibilitychange`. This is consistent with the existing codebase and avoids thrashing.

### 2.6 SQLite + OPFS: sql.js vs wa-sqlite

**sql.js** (current): Stores the database in memory as a `Uint8Array`. There is no native OPFS VFS. Persistence currently works by calling `db.export()` on save, which returns the full DB as bytes. To migrate to OPFS:
1. After every write transaction, call `db.export()` and write the bytes to the OPFS file via the async API.
2. On load, read the bytes from OPFS and pass them to `new SQL.Database(data)`.
3. This is correct but not zero-copy — the full DB must be serialized on every save. For small development databases (< 50 MB), this is fine.

**wa-sqlite** (alternative): Has a native OPFS VFS (`OPFSCoopSyncVFS`, `OPFSPermutedVFS`) that gives SQLite real-time incremental page writes. Migration would require replacing `sql.js` with `wa-sqlite`, which is a significant refactor of `sqlite-core.ts`.

**Recommendation:** For Phase 1, use the export/import approach with sql.js (simpler, lower risk). Track wa-sqlite as a future migration if write performance becomes a concern.

### 2.7 PGlite + OPFS

PGlite (`@electric-sql/pglite`) has built-in OPFS support:
```ts
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite('opfs://my-workspace-id/postgres');
```
The path is mapped directly into OPFS. This is the most straightforward integration of any engine. The current PostgreSQL playground uses PGlite in a worker (`runtime/postgres-worker.ts`). The worker simply needs to pass the OPFS path string to `PGlite()` instead of using the in-memory default.

### 2.8 DuckDB + OPFS

DuckDB-Wasm currently stores databases in memory (OPFS support is experimental in some builds). The recommended approach is:
1. Keep using the in-memory store for the active database.
2. On save (user action or `pagehide`), export the DuckDB database to Parquet or binary, then write to OPFS.
3. On load, import from OPFS into the in-memory database.

DuckDB-Wasm does expose `duckDb.copyFileToBuffer()` and `duckDb.registerFileBuffer()` which can be used for this round-trip. An alternative is exporting to a DuckDB native binary format (`.ddb`) if the wasm build supports it.

---

## 3. Isolated Workspace Architecture

### 3.1 Core Concepts

A **workspace** is a named, isolated environment for a single session or project:
- Has its own OPFS directory
- Contains all editor files (tabs/code files)
- Contains its own database(s) (for SQL playgrounds)
- Is identified by a stable workspace ID
- Can be named by the user

A **browser tab** maps to exactly one **active workspace** at any given time. The workspace ID for each browser tab is stored in `sessionStorage` (per-tab, not shared with other tabs).

### 3.2 Workspace ID Generation

```ts
function newWorkspaceId(): string {
  return `ws_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
```

This matches the existing pattern used by `newTabId()` in `sqlitePlaygroundTabs.ts`.

### 3.3 Workspace Registry

The registry is a lightweight index of all workspaces, stored in `localStorage` so it can be read synchronously on load:

```ts
interface WorkspaceEntry {
  id: string;           // workspace directory name in OPFS
  name: string;         // user-facing name, e.g. "My SQLite Project"
  playground: string;   // "sqlite" | "python" | etc.
  createdAt: number;    // Unix timestamp (ms)
  lastUsedAt: number;   // updated on every access
}

// localStorage key:
const WORKSPACE_REGISTRY_KEY = 'pg_workspaces';
```

### 3.4 Options for Workspace Isolation

#### Option A: Explicit Workspace Manager (User-Facing UI)

Users see a workspace manager UI (a drawer or a splash screen) where they can:
- Create a new workspace
- Open an existing workspace
- Rename or delete workspaces
- Duplicate a workspace

On first visit, a default workspace is created automatically. The selected workspace ID is stored in `sessionStorage` for the browser tab.

**Pros:** Full user control; clean mental model; matches VS Code's "workspace" UX.  
**Cons:** More UI surface to build; users unfamiliar with the concept may be confused.

#### Option B: Automatic Workspace-Per-Tab (Transparent)

On each new browser tab, a fresh workspace is automatically created and assigned to that tab (`sessionStorage`). No user-facing workspace concept exists. All workspaces are ephemeral (deleted when the browser session ends) unless the user explicitly saves/exports.

**Pros:** Zero learning curve; always isolated; simplest implementation.  
**Cons:** Work is lost when the tab is closed unless auto-save is very robust. No way to revisit previous sessions. Users can't share workspaces across tabs intentionally.

#### Option C: Hybrid — Named Workspaces with Auto-Create (Recommended)

1. On first visit, create a default workspace and store its ID in `sessionStorage`.
2. On subsequent visits to the same tab (page refresh), look up the workspace ID from `sessionStorage` and re-open that workspace.
3. A workspace switcher in the header dropdown lets users create, rename, switch to, or duplicate workspaces.
4. Opening a workspace in a new tab keeps the original workspace in the current tab (isolated).
5. Workspaces persist indefinitely in OPFS until explicitly deleted.

This matches how GitHub Codespaces and browser-based IDEs like StackBlitz work.

**Pros:** Persistent work across page refreshes; isolated tabs; user control without overwhelming UI.  
**Cons:** Slightly more complex state management; requires UX for workspace selection.

### 3.5 Workspace Lifecycle

```
New browser tab opened
  │
  ▼
Read sessionStorage for 'pg_${playgroundId}_workspace_id'
  │
  ├─ Found → open that workspace from OPFS
  │
  └─ Not found
        │
        ▼
      Show workspace picker? (if workspaces exist) OR auto-create
        │
        ├─ User picks existing workspace → load it, set sessionStorage
        │
        └─ User creates new / auto-create
              │
              ▼
            newWorkspaceId() → create OPFS dir → set sessionStorage
```

### 3.6 Workspace Picker UI

The workspace picker can be a compact popover attached to the playground logo/title in the header. It shows:
- The current workspace name (click to open picker)
- A list of recent workspaces for this playground
- A "New Workspace" button
- A "Manage Workspaces" link to a full drawer

This is consistent with the existing sidebar popover patterns in `DuckDbPlayground.tsx` (DatabaseSelector).

### 3.7 Cross-Tab Communication

Since each tab has its own workspace, cross-tab communication is only needed for:
1. **Registry updates**: When one tab creates or deletes a workspace, other tabs' workspace pickers should refresh.
2. **OPFS writes from multiple tabs to the same workspace**: This is a concurrency hazard that must be prevented.

For (1), use the `BroadcastChannel` API:
```ts
const bc = new BroadcastChannel('pg_workspace_registry');
bc.postMessage({ type: 'registry_updated' });
// All other tabs listen and refresh their workspace list
```

For (2), **disallow two tabs from sharing the same workspace**. When a workspace is loaded in a tab, mark it as "locked" using a BroadcastChannel + `sessionStorage` lock. If another tab tries to open the same workspace, show a warning and offer to clone it.

Alternatively, use the Web Locks API:
```ts
navigator.locks.request(`workspace_lock_${workspaceId}`, { ifAvailable: true }, (lock) => {
  if (!lock) {
    // Another tab holds this workspace; inform the user
    return;
  }
  // We hold the lock; proceed to load and use the workspace
});
```
Web Locks are automatically released when the tab is closed, which makes this robust even against tab crashes.

---

## 4. Multi-Tab Editing for Non-SQL Playgrounds

### 4.1 What Non-SQL Playgrounds Need

Currently `Playground.tsx` has one CodeMirror instance for one file. Adding multi-tab support requires:

1. **A tab bar**: render a horizontal list of file tabs above the editor.
2. **Multiple file slots**: each tab maps to a file in the virtual filesystem (OPFS).
3. **Tab management**: add, close, rename, reorder.
4. **Persistence**: save/load the tab list and each file's content from OPFS.
5. **Active tab tracking**: remember the active tab per workspace in `sessionStorage` or OPFS metadata.

### 4.2 File Tab Data Model

Borrow the existing `QueryTab` shape from `sqlitePlaygroundTabs.ts`, adapting it for general files:

```ts
// app/_components/playgroundTabs.ts  (new shared file)
export interface PlaygroundFile {
  id: string;          // stable tab ID, used as filename in OPFS
  filename: string;    // user-visible name, e.g. "main.py" or "utils.py"
  pristineFilename: string;  // name at creation, to detect dirty state
}

export function newFileId(): string {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
```

The actual file content is NOT stored in the `PlaygroundFile` record. Each file's code is stored as a separate OPFS file: `workspaces/${workspaceId}/files/${fileId}.${ext}`.

Tab content is loaded lazily when the user switches to that tab (read from OPFS). To avoid I/O on every keystroke, in-memory dirty buffers are maintained in Zustand (or React state) and flushed to OPFS with debouncing.

### 4.3 Default Files Per Language

Each language adapter should define its default file set:

| Language | Default Files |
|---|---|
| Python | `main.py` |
| R | `script.R` |
| JavaScript | `index.js` |
| TypeScript | `index.ts` |
| PHP | `index.php` |
| C | `main.c` |
| C++ | `main.cpp` |
| Java | `Main.java` |
| C# | `Program.cs` |

For C/C++, consider adding `Makefile` as a second default tab once multi-file compilation is supported.

### 4.4 How Multi-File Execution Works Per Language

Multi-file support has different execution semantics for each language:

| Language | Multi-file execution strategy |
|---|---|
| Python (Pyodide) | Write all workspace files into Pyodide's MEMFS before running. `import` will resolve correctly from MEMFS. Run the active file (or `main.py`) as the entry point. |
| R (WebR) | Write all workspace files into WebR's VFS. Run the active file as the entry point. |
| JavaScript | Concatenate all files in tab order, OR use `importScripts`-like virtual module resolution inside the worker. Single-file execution is simplest to start. |
| TypeScript | Compile all `.ts` files together via the TypeScript compiler (already runs in a worker). The worker receives a file map `{ filename: code }`. |
| PHP | Write all files into php-wasm's VFS. Run the active file via `<?php include 'utils.php'; … ?>`. |
| C | Compile all `.c` files together (pass all source files to clang). The `browsercc` compiler already accepts multiple sources conceptually. |
| C++ | Same as C — compile all `.cpp` files together. |
| Java | Compile all `.java` files together (multiple class files can be passed to CheerpJ). |
| C# | Pass all `.cs` files to the .NET Mono/WASM compiler. |

For initial implementation, only the **active file** is executed for most languages. Full multi-file compilation can be added as a follow-up.

### 4.5 Tab Bar Component for Non-SQL Playgrounds

The non-SQL playground needs a minimal tab bar that differs from the SQL playground's:
- No "ER Diagram" or "Query History" special tabs
- File extension badges (`.py`, `.r`, `.js`) instead of SQL query icons
- "New File" button (`+`) that prompts for a filename
- Double-click to rename a tab
- Right-click context menu: Rename, Duplicate, Close, Close Others

The SQL playground's `SqlTabBar.tsx` and tab management hooks (`useTabManagement.ts`) are too SQL-specific to reuse directly, but they serve as a strong reference implementation.

### 4.6 Editor State on Tab Switch

When the user switches tabs in `Playground.tsx`:
1. Save the current CodeMirror document to the in-memory dirty buffer (Zustand).
2. Schedule an OPFS flush (debounced, 500ms).
3. Load the target tab's content from the dirty buffer (if present) or from OPFS.
4. Replace the CodeMirror document with `view.dispatch({ changes: { from: 0, to: doc.length, insert: newContent } })`.

This matches the pattern used in `editorUtils.ts:replaceDoc`.

### 4.7 Extending LanguageAdapter for Multi-File

Add optional fields to the `LanguageAdapter` interface:

```ts
export interface LanguageAdapter {
  // ... existing fields ...
  
  /** Default file extension for new files in this playground. */
  defaultFileExtension: string;   // e.g. "py", "js", "cpp"
  
  /** The filename that is treated as the entry point when running multi-file
   *  projects. If absent, the active tab's file is the entry point. */
  entryPoint?: string;             // e.g. "main.py", "Main.java"
  
  /** If true, the playground supports sending multiple files to the runtime
   *  in a single run (virtual filesystem execution). Defaults to false. */
  supportsMultiFile?: boolean;
  
  /** Prepare a multi-file run payload for the runtime. Called before run()
   *  when `supportsMultiFile` is true. */
  prepareFileSystem?(files: Map<string, string>): Promise<void>;
}
```

---

## 5. Technical Challenges and Mitigations

### 5.1 OPFS Browser Support

| Browser | OPFS Support |
|---|---|
| Chrome 102+ | Full (sync access handles in workers) |
| Edge 102+ | Full |
| Firefox 111+ | Async API only (no sync access handles as of 2025) |
| Safari 15.2+ | Partial (no sync access handles until Safari 17.2+) |

**Mitigation:**
- Detect OPFS availability with `'storage' in navigator && typeof navigator.storage.getDirectory === 'function'`.
- For browsers without sync access handles (Firefox, older Safari), fall back to the async API with `createWritable()`. For the database engines (SQLite, PGlite), this means the OPFS VFS cannot be used directly in the worker — instead, load into memory and export asynchronously on save.
- Show a non-blocking notice: "Persistent storage is using OPFS. Some older browsers may save less frequently."
- Always keep a `localStorage` fallback for editor code (the current behavior) for very old or unusual browsers.

### 5.2 Storage Quota

OPFS participates in the browser's storage quota. On most browsers, quota is ~60% of available disk space. However:
- The quota is shared with all origin storage (IndexedDB, Cache Storage, etc.).
- Storing large databases (e.g., > 100 MB SQLite files) may fail with a `QuotaExceededError`.

**Mitigation:**
- Check available quota with `navigator.storage.estimate()` before writes.
- When quota is low, show a toast warning and offer to delete old workspaces.
- Implement workspace size display in the Workspace Manager UI.

### 5.3 Concurrent Access / Race Conditions

OPFS does not provide cross-tab locking by default. If two tabs open the same workspace and both write to the same OPFS files, data corruption is possible.

**Mitigation (as described in §3.7):**
- Use `navigator.locks.request()` to acquire an exclusive lock per workspace when opening it.
- Prevent a workspace from being opened in two tabs simultaneously.
- Alternatively, use the Broadcast Channel pattern to inform other tabs when a workspace is being opened.

### 5.4 Large File Write Performance

Writing a large SQLite database to OPFS on every change is expensive. A 50 MB database calling `db.export()` → OPFS write on every query could add hundreds of milliseconds of latency.

**Mitigation:**
- Only write to OPFS on `pagehide`/`visibilitychange` (not after every query).
- For interactive use, keep the database purely in-memory and write a checkpoint only when the user explicitly saves or when the page is about to close.
- Add a "Save Now" button in the SQL playground header.
- Consider a checkpoint interval (e.g., every 60 seconds) in addition to unload-triggered saves.

### 5.5 SQLite Worker Communication for OPFS

The current SQLite worker (`sqlite-worker.ts`) creates a `createSqliteEngineInProcess()` with an in-memory database. To add OPFS persistence:
1. The worker needs access to the OPFS path to read/write the `.db` file.
2. Since OPFS sync access handles only work in workers, the export/import must happen inside the worker.
3. Add `loadFromOpfs(path)` and `saveToOpfs(path)` methods to `SqliteEngine`.

### 5.6 Initialization Sequence with OPFS

The current initialization:
1. Worker created
2. `loadSampleDatabase(id)` called — loads a bundled sample DB
3. UI is ready

With OPFS, initialization becomes:
1. Worker created
2. Workspace ID resolved (from sessionStorage or new)
3. Check OPFS for existing workspace DB
4. If found: `loadFromOpfs(workspacePath)` — load user's data
5. If not found: `loadSampleDatabase(id)` — load default sample, then save to OPFS

This adds ~50–200ms of latency for the OPFS read on startup. Show a "Loading workspace…" spinner during this phase.

### 5.7 Pyodide's Filesystem and OPFS

Pyodide uses an Emscripten MEMFS by default. Pyodide 0.25+ supports mounting OPFS directories into MEMFS via `pyodide.mountMemFS()` or `pyodide.mountRemotePackage()`. However, this is complex.

**Simpler approach:** Write workspace files to MEMFS inside the Pyodide worker using `pyodide.FS.writeFile(path, content)` before running user code. Load workspace file content from OPFS in the main thread → send to worker → write to MEMFS. This does not give persistent Pyodide FS state, but allows multi-file imports within a single run.

### 5.8 Safari Quirks

Safari 15.2–17.1 has OPFS but:
- No synchronous access handles in workers (added in 17.2)
- Storage quota may be more aggressive
- `pagehide` fires reliably; `visibilitychange` may not

**Mitigation:** For Safari versions < 17.2, use only the async OPFS API. Detect via `'createSyncAccessHandle' in FileSystemFileHandle.prototype`.

---

## 6. Zustand Standardization Evaluation

### 6.1 Why Zustand Was Adopted for SQL Playgrounds

The SQL playground is extremely complex — `SqlPlayground.tsx` manages:
- Multiple query tabs with per-tab results
- Schema tree state (tables, views, columns, FK)
- Multiple dialog states
- Settings (font size, theme, word wrap, clear-before-run, PRAGMA config)
- Engine loading/running state
- Query history

`useState` in a single component with this much state becomes unwieldy. Zustand solves the prop-drilling problem and also allows hooks to subscribe to specific slices of state, avoiding re-renders.

### 6.2 Pros of Standardizing Zustand Across All Playgrounds

1. **Architectural consistency**: Any developer familiar with the SQL playground's Zustand stores can reason about the non-SQL playground state immediately.
2. **Workspace-aware state**: A Zustand store can hold the active workspace ID and the in-memory dirty buffer for file contents, which is exactly the pattern needed for OPFS integration.
3. **Devtools**: Zustand's Redux DevTools integration makes state debugging easier as complexity grows.
4. **Selective subscriptions**: `useTabStore((s) => s.activeTabId)` avoids unnecessary re-renders when unrelated state changes.
5. **Future-proof**: As multi-tab editing is added to non-SQL playgrounds, Zustand stores will scale cleanly.

### 6.3 Cons / Migration Considerations

1. **Added complexity for simple playgrounds**: Java, C#, C, C++ are "compile and run" runtimes with very little state. A Zustand store may be overkill for them.
2. **Initialization timing**: The `readInitialActiveDbId()` pattern in `useEngineStore.ts` reads `localStorage` eagerly at module evaluation time. This must be adapted for OPFS (async). Zustand's `create` is synchronous, but async initialization can be handled by starting with a `loading: true` state and updating once OPFS resolves.
3. **React 19 compatibility**: Zustand 4.x is compatible with React 19 and Next.js 16 (already confirmed by the existing stores).
4. **Tab isolation**: A global Zustand store (singleton) is shared across the React tree. Since each browser tab is a separate page, this is fine. But within a single page, all playgrounds on the same route share the same store. Since each playground occupies a full page route, this is not a concern.

### 6.4 Recommendation: Partial Standardization

**Adopt Zustand for all non-SQL playgrounds** when adding multi-tab support. The new `usePlaygroundStore` (or per-playground `usePythonPlaygroundStore`) should manage:
- Active workspace ID
- List of playground files (tabs): `PlaygroundFile[]`
- Active file ID
- Dirty file buffer: `Map<fileId, string>` (in-memory, not persisted)
- Settings (font size, theme, word wrap, etc.) — replacing current `useState`

**Do NOT** replace the existing SQL playground Zustand stores. They are well-established and work correctly.

### 6.5 Proposed Non-SQL Zustand Store Shape

```ts
// app/_components/stores/usePlaygroundStore.ts

interface PlaygroundFile {
  id: string;
  filename: string;
  pristineFilename: string;
}

interface PlaygroundState {
  // Workspace
  workspaceId: string | null;
  workspaceName: string;
  
  // Files (tabs)
  files: PlaygroundFile[];
  activeFileId: string;
  dirtyBuffers: Map<string, string>;  // fileId → code
  
  // Status
  statusState: 'loading' | 'ready' | 'running' | 'error';
  
  // Settings (replacing useState in Playground.tsx)
  fontSize: number;
  outputFontSizeEnabled: boolean;
  outputFontSize: number;
  wordWrap: boolean;
  clearBeforeRun: boolean;
  
  // Setters
  setWorkspace: (id: string, name: string) => void;
  setFiles: (files: PlaygroundFile[]) => void;
  setActiveFileId: (id: string) => void;
  updateDirtyBuffer: (fileId: string, code: string) => void;
  clearDirtyBuffer: (fileId: string) => void;
  setStatusState: (status: PlaygroundState['statusState']) => void;
  setFontSize: (size: number) => void;
  setWordWrap: (wrap: boolean) => void;
  setClearBeforeRun: (clear: boolean) => void;
  setOutputFontSizeEnabled: (enabled: boolean) => void;
  setOutputFontSize: (size: number) => void;
}
```

However, because `PlaygroundInner` is a shared component used by all 9 non-SQL playgrounds, a **single shared store instance will not work** — all 9 adapters would share the same state. Two options:

**Option X: Per-adapter store factory (mirrors `createSchemaSettingsStore`)**
```ts
// Each playground page creates its own store:
export const usePythonPlaygroundStore = createPlaygroundStore('python');
export const useRPlaygroundStore = createPlaygroundStore('r');
// etc.
```

**Option Y: Single store with adapter-id scoping**
```ts
// Store holds state per adapter.id:
interface PlaygroundState {
  byAdapter: Record<string, AdapterState>;
  // ...
}
```

**Recommendation:** Use **Option X** — one store per language. This matches the existing pattern (`useDuckDbSettingsStore`, `usePostgresSettingsStore`). Each store is instantiated at module level for its playground page and does not interfere with others.

---

## 7. Implementation Recommendations and Rollout Strategy

### 7.1 Phased Rollout

#### Phase 1: OPFS Infrastructure (Foundational)

**Goal:** Create the shared OPFS workspace layer without changing any playground UI.

1. **Create `app/_components/opfs/workspace.ts`**:
   - `newWorkspaceId()`, `createWorkspace()`, `openWorkspace()`, `deleteWorkspace()`
   - `getWorkspaceRegistry()`, `updateWorkspaceRegistry()`
   - Uses the async OPFS API; no sync access handles in Phase 1.

2. **Create `app/_components/opfs/fileStorage.ts`**:
   - `readFile(workspaceId, fileId)` → `string`
   - `writeFile(workspaceId, fileId, content)` → `void`
   - `deleteFile(workspaceId, fileId)` → `void`
   - `listFiles(workspaceId)` → `string[]`
   - Internal: async write queue with idle flushing and `pagehide` flush.

3. **Create `app/_components/opfs/databaseStorage.ts`**:
   - `readDatabase(workspaceId, name)` → `Uint8Array | null`
   - `writeDatabase(workspaceId, name, data: Uint8Array)` → `void`
   - Debounced write with immediate flush on `pagehide`.

4. **Add OPFS feature detection** and a `localStorage`-only fallback path.

5. **No UI changes** in Phase 1.

#### Phase 2: SQLite OPFS Persistence

**Goal:** Migrate SQLite database storage from in-memory ephemeral to OPFS-persisted.

1. Add `loadFromOpfs(path: string)` and `saveToOpfs(path: string)` to the `SqliteEngine` interface.
2. Implement them in `sqlite-core.ts`: use `localStorage` to store the OPFS path; `db.export()` → write to OPFS file.
3. Modify the SQLite worker `sqlite-worker.ts` to call `loadFromOpfs` on initialization if an OPFS file exists.
4. Add a `saveToOpfs` call in the worker in response to a new `"checkpoint"` message type, invoked from the main thread on `pagehide`.
5. Add workspace ID to the SQLite playground via `sessionStorage` lookup.
6. Update `sqlitePlaygroundTabs.ts`: replace `localStorage.setItem(dbScopedKey(dbId, "tabs"), ...)` with `fileStorage.writeFile(workspaceId, "tabs.json", ...)`.

**Key concern:** Do not break the existing sample database loading flow. The fallback when no OPFS file exists must be indistinguishable from the current behavior.

#### Phase 3: PostgreSQL and DuckDB OPFS Persistence

**Goal:** Migrate PGlite and DuckDB to OPFS-backed storage.

**PostgreSQL:**
1. The `postgres-worker.ts` creates a `PGlite` instance. Change the PGlite constructor call from `new PGlite()` to `new PGlite('opfs://workspaces/${workspaceId}/postgres')`.
2. Add workspace ID passing from the main thread to the worker via a new `"init"` message that precedes any queries.
3. No other changes needed — PGlite handles OPFS internally.

**DuckDB:**
1. After each user-visible query, check if the DuckDB DB has been modified. If so, schedule an OPFS write using `duckDb.copyFileToBuffer()`.
2. On load, check for an existing OPFS file; if present, `registerFileBuffer()` before the first query.
3. Save/restore logic lives in `runtime/duckdb.ts`.

#### Phase 4: Non-SQL Playground Multi-Tab + OPFS

**Goal:** Add multi-tab file editing to all 9 non-SQL playgrounds.

1. **Create `app/_components/playgroundTabs.ts`**: shared `PlaygroundFile` type, `newFileId()`, `defaultFiles(adapter)`.
2. **Create per-language Zustand stores** using `createPlaygroundStore(adapterId)` factory.
3. **Create `PlaygroundTabBar.tsx`**: minimalist tab bar component that renders `PlaygroundFile[]` and handles add/close/rename/reorder.
4. **Modify `Playground.tsx`**:
   - Replace the `useState` settings with the Zustand store.
   - Add a `PlaygroundTabBar` above the editor.
   - On tab switch: flush current editor content to dirty buffer → load target file from dirty buffer or OPFS.
   - On editor change: update dirty buffer (Zustand) and schedule OPFS flush.
   - Replace `localStorage.setItem(storageKey("code"), ...)` with OPFS write.
   - Read initial code from OPFS (or fall back to example).
5. **Add workspace initialization** in the page component for each playground route.
6. **Extend `LanguageAdapter`** with `defaultFileExtension` and `entryPoint` fields.

#### Phase 5: Workspace Manager UI

**Goal:** Surface workspace management in the UI.

1. **Workspace badge** in the header: shows the workspace name. Clicking opens a popover.
2. **Workspace popover**: lists recent workspaces for this playground, with "New" and "Manage" actions.
3. **Workspace Manager drawer**: full list of workspaces with rename/delete/duplicate actions.
4. **Workspace size estimate**: use `fileStorage.estimateSize(workspaceId)`.
5. **Tab isolation notice**: shown once when the user opens a playground in a second tab with the same workspace.

### 7.2 File Structure Changes

```
app/
  _components/
    opfs/                            ← NEW
      workspace.ts                   ← workspace CRUD
      fileStorage.ts                 ← file read/write with async queue
      databaseStorage.ts             ← database bytes persistence
      featureDetect.ts               ← browser capability checks
    stores/                          ← NEW
      createPlaygroundStore.ts       ← Zustand factory for non-SQL
    playgroundTabs.ts                ← NEW: PlaygroundFile type + helpers
    PlaygroundTabBar.tsx             ← NEW: tab bar for non-SQL
    Playground.tsx                   ← MODIFIED: use Zustand + OPFS
    playgrounds.ts                   ← MODIFIED: add defaultFileExtension
    runtime/
      python.tsx                     ← MODIFIED: entryPoint, defaultFileExtension
      javascript.tsx                 ← MODIFIED
      r.tsx                          ← MODIFIED
      typescript.tsx                 ← MODIFIED
      php.tsx                        ← MODIFIED
      c.tsx                          ← MODIFIED
      cpp.tsx                        ← MODIFIED
      java.tsx                       ← MODIFIED
      csharp.tsx                     ← MODIFIED
      sqlite-core.ts                 ← MODIFIED: loadFromOpfs/saveToOpfs
      sqlite-worker.ts               ← MODIFIED: init message
      postgres-worker.ts             ← MODIFIED: OPFS PGlite path
      duckdb.ts                      ← MODIFIED: OPFS checkpoint
    sqlitePlaygroundTabs.ts          ← MODIFIED: OPFS-backed tab save/load
```

### 7.3 Backward Compatibility

**Existing localStorage data must be migrated or gracefully ignored:**

1. For non-SQL playgrounds: on first load after the upgrade, read the existing `pg_${adapter.id}_code` from localStorage and use it as the content of the default workspace's first file. Then delete the localStorage key.
2. For SQLite tabs: read the existing `pg_sqlite_db_${dbId}_tabs` from localStorage and write it to the new workspace's OPFS `tabs.json`. Then delete the localStorage key.
3. For settings (font size, theme, word wrap): keep these in localStorage — they are user preferences, not workspace data.

**Migration helper:**
```ts
// app/_components/opfs/migration.ts
async function migrateLocalStorageToOpfs(adapterId: string, workspaceId: string) {
  const codeKey = `pg_${adapterId}_code`;
  const code = localStorage.getItem(codeKey);
  if (code) {
    await fileStorage.writeFile(workspaceId, 'main', code);
    localStorage.removeItem(codeKey);
  }
}
```

Run this once during workspace initialization (before loading files from OPFS).

### 7.4 Testing Strategy

1. **Unit tests**: `workspace.ts`, `fileStorage.ts` — mock `navigator.storage.getDirectory()` with an in-memory implementation. Vitest already runs in the repo (`npm run test`).
2. **Integration tests**: E2E with Playwright. Add tests to `e2e/` for:
   - Workspace creation and naming
   - File persistence across page refresh
   - Tab isolation (open two tabs, confirm separate workspaces)
   - OPFS fallback when OPFS is unavailable (mock `navigator.storage.getDirectory` to throw)
3. **Manual browser testing**: Test in Chrome, Firefox, and Safari before each phase ships.

### 7.5 Performance Benchmarks to Track

Before and after each phase:
- Time from page load to "ready" state (measures OPFS init overhead)
- Time for a round-trip SQLite query (measures write-queue impact)
- Memory usage with 5 workspace files open (measures dirty buffer overhead)

### 7.6 Key Decision Points (Resolve Before Implementation)

1. **Workspace-per-tab auto-create vs user-explicit?** Recommendation: auto-create a default workspace, with optional user management (Option C from §3.4).
2. **SQLite: keep sql.js or migrate to wa-sqlite?** Recommendation: keep sql.js in Phase 2; evaluate wa-sqlite only if OPFS write performance is a measured bottleneck.
3. **Multi-file execution depth:** Phase 4 should start with active-file-only execution. Full multi-file compilation (C/C++/Java/C#) is a separate, larger effort and should be scoped separately.
4. **Workspace sharing UI:** Not in scope for the initial rollout. Can be added as "Export workspace as ZIP" in Phase 5.

---

## Appendix A: Zustand Store Factory for Non-SQL Playgrounds

```ts
// app/_components/stores/createPlaygroundStore.ts

import { create } from 'zustand';
import type { PlaygroundFile } from '../playgroundTabs';
import { DEFAULT_PLAYGROUND_SETTINGS } from '../playgroundShared';

interface PlaygroundState {
  workspaceId: string | null;
  workspaceName: string;
  files: PlaygroundFile[];
  activeFileId: string;
  dirtyBuffers: Map<string, string>;
  statusState: 'loading' | 'ready' | 'running' | 'error';
  fontSize: number;
  outputFontSizeEnabled: boolean;
  outputFontSize: number;
  wordWrap: boolean;
  clearBeforeRun: boolean;
  
  setWorkspace: (id: string, name: string) => void;
  setFiles: (files: PlaygroundFile[]) => void;
  setActiveFileId: (id: string) => void;
  updateDirtyBuffer: (fileId: string, code: string) => void;
  clearDirtyBuffer: (fileId: string) => void;
  setStatusState: (s: PlaygroundState['statusState']) => void;
  setFontSize: (n: number) => void;
  setOutputFontSizeEnabled: (b: boolean) => void;
  setOutputFontSize: (n: number) => void;
  setWordWrap: (b: boolean) => void;
  setClearBeforeRun: (b: boolean) => void;
}

export function createPlaygroundStore() {
  return create<PlaygroundState>((set) => ({
    workspaceId: null,
    workspaceName: 'Default Workspace',
    files: [],
    activeFileId: '',
    dirtyBuffers: new Map(),
    statusState: 'loading',
    fontSize: DEFAULT_PLAYGROUND_SETTINGS.fontSize,
    outputFontSizeEnabled: false,
    outputFontSize: 13,
    wordWrap: true,
    clearBeforeRun: false,
    
    setWorkspace: (workspaceId, workspaceName) => set({ workspaceId, workspaceName }),
    setFiles: (files) => set({ files }),
    setActiveFileId: (activeFileId) => set({ activeFileId }),
    updateDirtyBuffer: (fileId, code) =>
      set((state) => {
        const next = new Map(state.dirtyBuffers);
        next.set(fileId, code);
        return { dirtyBuffers: next };
      }),
    clearDirtyBuffer: (fileId) =>
      set((state) => {
        const next = new Map(state.dirtyBuffers);
        next.delete(fileId);
        return { dirtyBuffers: next };
      }),
    setStatusState: (statusState) => set({ statusState }),
    setFontSize: (fontSize) => set({ fontSize }),
    setOutputFontSizeEnabled: (outputFontSizeEnabled) => set({ outputFontSizeEnabled }),
    setOutputFontSize: (outputFontSize) => set({ outputFontSize }),
    setWordWrap: (wordWrap) => set({ wordWrap }),
    setClearBeforeRun: (clearBeforeRun) => set({ clearBeforeRun }),
  }));
}
```

---

## Appendix B: OPFS Async Write Queue (extends persistedStorage.ts pattern)

```ts
// app/_components/opfs/fileStorage.ts

type PendingWrite = { workspaceId: string; fileId: string; content: string };
const pending = new Map<string, PendingWrite>();  // key: `${workspaceId}/${fileId}`
let scheduled = false;

async function flush(): Promise<void> {
  scheduled = false;
  if (pending.size === 0) return;
  const writes = [...pending.values()];
  pending.clear();
  const root = await navigator.storage.getDirectory();
  for (const w of writes) {
    try {
      const wsDir = await root.getDirectoryHandle('workspaces', { create: true });
      const wDir = await wsDir.getDirectoryHandle(w.workspaceId, { create: true });
      const fDir = await wDir.getDirectoryHandle('files', { create: true });
      const fh = await fDir.getFileHandle(w.fileId, { create: true });
      const writable = await fh.createWritable();
      await writable.write(w.content);
      await writable.close();
    } catch {
      // OPFS write failed; silently ignore (content is still in dirty buffer)
    }
  }
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => { void flush(); }, { timeout: 500 });
  } else {
    setTimeout(() => { void flush(); }, 100);
  }
}

export function writeFileAsync(workspaceId: string, fileId: string, content: string): void {
  pending.set(`${workspaceId}/${fileId}`, { workspaceId, fileId, content });
  schedule();
}

export async function flushAllWrites(): Promise<void> {
  await flush();
}

// Install unload listeners (mirrors ensurePersistUnloadFlush):
if (typeof window !== 'undefined') {
  const handler = () => { void flush(); };
  window.addEventListener('pagehide', handler);
  window.addEventListener('visibilitychange', handler);
}
```

---

## Appendix C: Web Locks for Workspace Exclusivity

```ts
// app/_components/opfs/workspace.ts

export async function acquireWorkspaceLock(
  workspaceId: string
): Promise<boolean> {
  if (!('locks' in navigator)) return true;  // fallback: assume success
  
  return new Promise((resolve) => {
    navigator.locks.request(
      `pg_workspace_${workspaceId}`,
      { ifAvailable: true },
      (lock) => {
        if (!lock) {
          resolve(false);  // another tab holds this workspace
          return new Promise(() => {});  // never resolve — keep signaling busy
        }
        resolve(true);
        // Hold the lock indefinitely (released when tab closes)
        return new Promise(() => {});
      }
    );
  });
}
```

---

*End of report. This document is intended for a coding agent implementing the described changes. Implement phases sequentially; do not skip the foundational OPFS infrastructure in Phase 1.*
