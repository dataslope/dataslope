# Stage 3 Refactor Handover — 2026-05-16

Branch: `claude/five-stage-playground-refactor-6jEAd` → merged to `main` via PR #309

## Context

This document tracks the four remaining tasks from the Stage 3 bottom-up playground refactor. The three SQL playground monoliths are:

- `app/_components/sql/SqlPlayground.tsx` (~4,091 lines — SQLite)
- `app/_components/postgres/PostgresPlayground.tsx` (~5,305 lines — PostgreSQL/PGlite)
- `app/_components/duckdb/DuckDbPlayground.tsx` (~5,785 lines — DuckDB-Wasm)

### What has already been extracted (merged in PR #309)

All files live under `app/_components/sql/components/` unless otherwise noted.

| Artifact | Type | Notes |
|---|---|---|
| `DatabaseSelector` | Component | DB picker dropdown, dialect-agnostic |
| `SqlSettingsPanel` | Component | Settings panel wrapper |
| `SqlSettingsConfirmDialogs` | Component | Restore-defaults + clear-storage dialogs |
| `DdlViewerDialog` | Component | DDL popup with copy-to-clipboard |
| `SwitchDatabaseDialog` | Component | "Switch databases?" confirmation |
| `SchemaActionDialogs` | Component | Drop entity + truncate table dialogs |
| `ImportSqlDumpDialog` | Component | SQL text import with drag-and-drop |
| `RenameDatabaseDialog` | Component | Rename with configurable extension picker |
| `ImportBinaryFileDialog` | Component | Binary file import dropzone |
| `SqlEditorToolbar` | Component | Run/run-selection split button |
| `SqlTabBar` | Component | Full DnD tab bar (DnDContext + tabs + add button) |
| `sql/shared/tabStorageUtils.ts` | Utility | `createTabStorage(prefix)` factory, `tabsAreDirty` |
| `sql/shared/engineAdapter.ts` | Interface | `SqlEngineAdapter` + concrete adapters |
| Import-safety patches | Bug fix | Postgres sandbox worker, DuckDB restore-on-failure, SQLite safe binary load |

---

## All Four Remaining Tasks (Single Agent Session)

All four tasks below are intended to be completed in **one agent session**. They are ordered by dependency: Tasks 1 and 2 are prerequisites for Task 4. Task 3 is independent but reduces Task 4's scope. Completing all four in sequence is feasible in a single long-running session.

---

## Task 1 — Tab Management Hook (`useSqlTabManagement`)

### Status
Not started.

### Problem
`PostgresPlayground.tsx` and `DuckDbPlayground.tsx` each contain ~150 lines of near-identical tab management logic:

- `addTab` (~22 lines each) — identical in both
- `closeTab` (~22 lines each) — identical in both
- `openTabAndRun` (~12 lines each) — identical in both
- `handleTabDragStart` / `handleTabDragEnd` / `handleTabDragCancel` (~19 lines each) — identical in both
- `resetTabsForCurrentDb` (~8 lines each) — differs only in `findPostgresSampleDatabase` vs `findDuckDbSampleDatabase`
- `persistTabs` — **key difference**: Postgres saves synchronously; DuckDB uses a 500 ms trailing-edge debounce with `pendingSaveRef` + `saveTimerRef` + `flushPendingSave` flushed on `visibilitychange`/`pagehide`/unmount

### Files to touch
- Create: `app/_components/sql/hooks/useSqlTabManagement.ts`
- Modify: `app/_components/postgres/PostgresPlayground.tsx`
- Modify: `app/_components/duckdb/DuckDbPlayground.tsx`

### Recommended design
Accept a caller-supplied `persistTabs` callback so the hook stays free of save-strategy knowledge:

```typescript
export function useSqlTabManagement(options: {
  dbId: string;
  samples: readonly SqlSampleDatabase[];
  storageUtils: TabStorageUtils;
  persistTabs: (nextTabs: QueryTab[], dbId?: string) => void;
}) { ... }
```

Postgres passes a synchronous `persistTabs`; DuckDB passes its debounced version. The debounce logic itself stays in `DuckDbPlayground.tsx` (or a tiny helper) and is passed in.

### DuckDB debounced `persistTabs` (preserve exactly)
```typescript
const pendingSaveRef = useRef<{ dbId: string; tabs: QueryTab[] } | null>(null);
const saveTimerRef = useRef<number | null>(null);
const flushPendingSave = useCallback(() => {
  if (saveTimerRef.current !== null) {
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
  }
  const pending = pendingSaveRef.current;
  if (pending) {
    pendingSaveRef.current = null;
    saveTabs(pending.dbId, pending.tabs);
  }
}, []);
useEffect(() => {
  const handler = () => flushPendingSave();
  window.addEventListener("visibilitychange", handler);
  window.addEventListener("pagehide", handler);
  return () => {
    window.removeEventListener("visibilitychange", handler);
    window.removeEventListener("pagehide", handler);
    flushPendingSave();
  };
}, [flushPendingSave]);

const persistTabs = useCallback(
  (nextTabs: QueryTab[], dbId = activeDbIdRef.current) => {
    tabsRef.current = nextTabs;
    setTabs(nextTabs);
    pendingSaveRef.current = { dbId, tabs: nextTabs };
    if (saveTimerRef.current === null) {
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        const pending = pendingSaveRef.current;
        if (pending) {
          pendingSaveRef.current = null;
          saveTabs(pending.dbId, pending.tabs);
        }
      }, 500);
    }
  },
  [],
);
```

### Postgres synchronous `persistTabs`
```typescript
const persistTabs = useCallback(
  (nextTabs: QueryTab[], dbId = activeDbIdRef.current) => {
    tabsRef.current = nextTabs;
    setTabs(nextTabs);
    saveTabs(dbId, nextTabs);
  },
  [],
);
```

### Reference: existing SQLite hook
`app/_components/sql/hooks/useTabManagement.ts` — already exists for SQLite. Use it as a structural template for the new hook.

---

## Task 2 — Schema Sidebar Orchestration Hook (`useSchemaTree`)

### Status
Not started.

### Problem
Both `PostgresPlayground.tsx` and `DuckDbPlayground.tsx` contain ~200–300 lines each of near-identical schema-tree wiring around the already-extracted `SchemaSection` / `SchemaItem` / `SchemaLeafItem` components. `SqlPlayground.tsx` also has this code but without the multi-schema dimension.

### Key structural difference
- **SQLite**: no schema namespace; tables live in one flat namespace
- **Postgres & DuckDB**: `selectedSchema` / `schemas` / `schemaLoading` + `refreshSchemas()` + `handleSchemaChange()`; supports multiple pg schemas (`public`, `private`, `information_schema`, etc.)

A shared hook needs an `supportsSchemas: boolean` (or `multiSchema`) flag, or the schema-selector UI stays dialect-specific and only the rest of the state is shared.

### State to extract (Postgres/DuckDB)
```typescript
const [selectedSchema, setSelectedSchema] = useState("public");
const [schemas, setSchemas] = useState<string[]>(["public"]);
const [schemaLoading, setSchemaLoading] = useState(false);
const [tables, setTables] = useState<string[]>([]);
const [views, setViews] = useState<string[]>([]);
const [indexes, setIndexes] = useState<string[]>([]);
const [triggers, setTriggers] = useState<string[]>([]);
const [columnsByEntity, setColumnsByEntity] = useState<Record<string, TableColumnInfo[]>>({});
const [foreignKeysByEntity, setForeignKeysByEntity] = useState<Record<string, ForeignKeyInfo[]>>({});
const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
const [rowCountByTable, setRowCountByTable] = useState<Record<string, number>>({});
```

### Files to touch
- Create: `app/_components/sql/hooks/useSchemaTree.ts`
- Modify: `app/_components/postgres/PostgresPlayground.tsx`
- Modify: `app/_components/duckdb/DuckDbPlayground.tsx`
- Possibly modify: `app/_components/sql/SqlPlayground.tsx`

---

## Task 3 — Structure Drawers Extraction

### Status
Not started. **Lower priority** — only ~40–50% overlap between dialects. Can be done after Tasks 1 and 2, or skipped until Task 4 if time is limited.

### What can be shared
- Drawer layout / form chrome (labels, button placement)
- `ModifyStructureForm` is already extracted
- Basic column name / nullability inputs
- Add Row dialog (row insertion logic is nearly identical between dialects)

### What stays dialect-specific
- Column type pickers (pg type list vs DuckDB type list)
- Structure validation functions (`validatePgStructure` vs `validateDuckDbStructure`)
- Constraint definitions (DuckDB has limited FK support compared to Postgres)
- Generated column semantics (DuckDB has no VIRTUAL generated columns)

### Files to touch
- Potentially create: `app/_components/sql/components/AddRowDialog.tsx`
- Potentially create: `app/_components/sql/components/AddTableDialog.tsx`
- Modify: `app/_components/postgres/PostgresPlayground.tsx`
- Modify: `app/_components/duckdb/DuckDbPlayground.tsx`

---

## Task 4 — `SqlPlaygroundShell` + Dialect Migrations

### Status
Not started. **Largest effort** — requires Tasks 1 and 2 to be done first. Completing all four tasks in sequence in the same session is the intended approach.

### Goal
A unified `SqlPlaygroundShell` component that all three dialects plug into via the `SqlEngineAdapter` interface. This eliminates all three monoliths.

### The `SqlEngineAdapter` interface (already defined)
```typescript
// app/_components/sql/shared/engineAdapter.ts
export interface SqlEngineAdapter<
  TSample extends SqlSampleDatabase,
  TEngine,
> {
  playgroundId: string;
  storagePrefix: SqlPlaygroundStoragePrefix;
  samples: readonly TSample[];
  blankSample?: TSample;
  // ... engine factory, import methods, etc.
}
```

### Migration sequence (within the session)
1. **SQLite first** (smallest; most hook infrastructure already in `sql/hooks/`) — migrate `SqlPlayground.tsx` → `SqlPlaygroundShell` + SQLite adapter config
2. **Postgres second** — wire `SqlPlaygroundShell` with `postgresAdapter`; handle multi-schema UI
3. **DuckDB last** — wire `SqlPlaygroundShell` with `duckdbAdapter`; handle DuckDB-specific features (Files panel, parquet/json import, schema browser)

### Prerequisites within this session
- Tasks 1, 2, and 3 reduce the delta between what `SqlPlaygroundShell` must absorb and what's already shared. Complete them first before starting Task 4.
- Any remaining dialect-specific code in the shell should be gated via adapter flags or render props.

### Files to create
- `app/_components/sql/SqlPlaygroundShell.tsx` — the unified shell
- `app/_components/sql/stores/` — shared Zustand stores (tab state, engine state, dialog state already exist for SQLite; Postgres/DuckDB adopt them)

### Files to delete (after migration verified)
- `app/_components/postgres/PostgresPlayground.tsx`
- `app/_components/duckdb/DuckDbPlayground.tsx`
- (SQLite's `SqlPlayground.tsx` becomes `SqlPlaygroundShell` itself or a thin wrapper)

---

## Branch / PR Conventions

- Develop on a feature branch named `claude/<description>-<id>`
- Stack commits; do not squash until merge
- Run `npx tsc --noEmit && npm test` before pushing — all 175 tests must pass
- PR target: `main` in `subwaymatch/dataslope-playground`
- After pushing, always open a PR (ready for review, not draft)
