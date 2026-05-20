# Single Database per Workspace — SQL Playgrounds

**Date:** 2026-05-20  
**Task:** Update SQLite, Postgres, and DuckDB SQL playgrounds so that each workspace stores a single database. When a user switches databases, a dialog is shown offering "Overwrite this workspace" or "Open in new workspace".

---

## Summary of Changes

### 1. `SwitchDatabaseDialog.tsx` (redesigned)

**File:** `app/_components/sql/components/SwitchDatabaseDialog.tsx`

Replaced the old `AlertDialog`-based confirmation dialog (which only appeared when query tabs were "dirty") with a new `Dialog`-based component that:

- **Always appears** when the user tries to switch databases.
- Shows the name of the incoming database (`newDbFilename`) in the title.
- Shows the name of the current workspace (`currentWorkspaceName`) in the description.
- Offers three choices:
  - **Cancel** — dismiss the dialog, no change.
  - **Open in new workspace** — create a fresh workspace, write the pending DB ID to `localStorage` so the new workspace loads the correct database, then reload the page into the new workspace.
  - **Overwrite this workspace** — load the new database inside the current workspace (same as the previous "Switch database" action).

**Props changed:**
| Old prop | New prop | Notes |
|---|---|---|
| `currentDbFilename: string` | `currentWorkspaceName: string` | Name of the workspace being overwritten |
| `onConfirm: () => void` | `onOverwrite: () => void` | Called when user picks "Overwrite" |
| *(new)* | `newDbFilename: string` | Filename of the incoming database |
| *(new)* | `onCreateNew: () => void \| Promise<void>` | Creates a new workspace |

---

### 2. SQLite Playground

#### `app/_components/sql/hooks/useDatabaseActions.ts`

- **`requestDbSwitch`** — Removed the `tabsAreDirty` guard; the dialog is now **always** shown when switching databases (including when the user's query tabs are clean). Now simply calls `setPendingDbId(nextId)`.
- **`performDbSwitch`** — Added handling for the `"__blank__"` sentinel ID: when `nextId === "__blank__"`, it calls `engine.loadBlankDatabase()` and resets the custom-filename entry (previously only done in the now-removed `performBlankLoad`). This allows the "New Database" action to route through the same dialog flow.
- **`performBlankLoad`** — Removed from the exported return value (no longer consumed by `SqlPlayground.tsx`).
- Removed unused imports: `tabsAreDirty`, `findSampleDatabase`.

#### `app/_components/sql/SqlPlayground.tsx`

- **`__new_db__` handler** — Changed from calling `performBlankLoad()` to calling `requestDbSwitch("__blank__")`, routing new-blank-database creation through the same dialog flow.
- **`SwitchDatabaseDialog` usage** — Updated to pass the new props:
  - `currentWorkspaceName` from `activeWorkspace?.name`
  - `newDbFilename` computed from the pending DB ID (looks up sample metadata or uses `"blank.sqlite"` for the blank sentinel)
  - `onOverwrite` — calls `performDbSwitch(pendingDbId)`
  - `onCreateNew` — writes `storageKey("db")` to localStorage, creates a new workspace via `createWorkspace(label, PLAYGROUND_ID)`, then calls `switchActiveWorkspace(PLAYGROUND_ID, newWorkspace.id)` to reload into the new workspace
- Added imports: `switchActiveWorkspace` (from `activeWorkspace.ts`), `createWorkspace` (from `workspace.ts`).
- Removed unused imports: `tabsAreDirty`, `performBlankLoad`.

---

### 3. DuckDB Playground

**File:** `app/_components/duckdb/DuckDbPlayground.tsx`

- **`requestDbSwitch`** — Removed `tabsAreDirty` guard; now always calls `setPendingDbId(nextId)`. The blank-database shortcut is also detected here (skip only if the current db already equals the requested db, except for blank).
- **`__new_db__` handler** — Changed from `void performDbSwitch(DUCKDB_BLANK_DATABASE.id)` to `requestDbSwitch(DUCKDB_BLANK_DATABASE.id)`.
- **`SwitchDatabaseDialog` usage** — Updated to new prop API: `currentWorkspaceName`, `newDbFilename` (via `findDuckDbSampleDatabase(pendingDbId).filename`), `onOverwrite`, and `onCreateNew` (creates workspace, reloads into it).
- Added imports: `switchActiveWorkspace`, `createWorkspace`.
- Removed unused import: `tabsAreDirty`.

---

### 4. Postgres Playground

**File:** `app/_components/postgres/PostgresPlayground.tsx`

- **`requestDbSwitch`** — Removed `tabsAreDirty` guard; now always calls `setPendingDbId(nextId)`.
- **`__new_db__` handler** — Changed from `void performDbSwitch(POSTGRES_BLANK_DATABASE.id)` to `requestDbSwitch(POSTGRES_BLANK_DATABASE.id)`.
- **`SwitchDatabaseDialog` usage** — Updated to new prop API: `currentWorkspaceName`, `newDbFilename` (via `findPostgresSampleDatabase(pendingDbId).filename`), `onOverwrite`, and `onCreateNew` (creates workspace, reloads into it).
- Added imports: `switchActiveWorkspace`, `createWorkspace`.
- Removed unused import: `tabsAreDirty`.

---

## Technical Approach

### How "Open in new workspace" works

1. The pending database ID is written to `localStorage` under the playground's `storageKey("db")` key before the page reloads.
2. `createWorkspace(name, playgroundId)` creates a new workspace entry (OPFS metadata + registry).
3. `switchActiveWorkspace(playgroundId, newWorkspaceId)` stores the new workspace ID in `sessionStorage` and calls `window.location.reload()`.
4. On reload, the playground reads `storageKey("db")` from `localStorage` to restore the last-used database — which is now the one the user selected.

### SQLite "New Database" sentinel

SQLite's blank database does not have a constant ID in the `SQLITE_SAMPLE_DATABASES` array. The existing `loadBlankDatabase()` engine call returns an object with `id: "__blank__"`. We route `"__blank__"` through `requestDbSwitch` as a sentinel; `performDbSwitch` detects this and calls `engine.loadBlankDatabase()` instead of `engine.loadSampleDatabase()`.

---

## Known Limitations / Remaining Tasks

1. **Import flows not covered by dialog** — Importing a database file (SQLite bytes, SQL dump, CSV, JSON, Parquet) does not trigger the switch dialog. These imports still load into the current workspace directly. A future iteration could present the same choice for imports.

2. **localStorage database key is shared across workspaces** — The `storageKey("db")` key is not namespaced per workspace. When "Open in new workspace" is used, the key is updated to point to the new database. If the user then returns to the original workspace in a new tab, that workspace will also try to load the new database. True per-workspace database persistence would require either storing the database ID in the workspace's OPFS `meta.json` or adding a separate sessionStorage lookup.

3. **Workspace name derivation is simple** — The new workspace name is `"${databaseLabel} Workspace"`. This could collide with existing workspaces of the same name. A future improvement could append a counter or timestamp.

4. **No UI feedback during workspace creation** — The `onCreateNew` callback is async; there is no spinner or loading state while the workspace is created before the page reloads. In practice this is fast (a few milliseconds), so the UX impact is minimal.

5. **Imports still bypass the dialog** — Actions like `__import_sqlite__`, `__import_sql_dump__`, `__import_csv__`, etc. currently proceed without triggering the dialog. This is intentional for now, as the user explicitly selects a file to import (making the intent clear), but consistency could be improved.
