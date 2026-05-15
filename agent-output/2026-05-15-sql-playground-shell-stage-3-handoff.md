# Stage 3 Handoff — SQL Playground Shell Extraction

**Date:** 2026-05-15
**Predecessor PR:** [#304 — DuckDB perf hot-fixes, lazy bundles, and dedup pass](https://github.com/subwaymatch/dataslope-playground/pull/304)
**Branch the predecessor work merged from:** `claude/audit-playgrounds-performance-AYvzX`

This document hands off Stage 3 of the playgrounds audit/refactor plan. Stages 1, 2, and 5 are already landed (or in PR #304). Stage 3 is the largest, riskiest piece — the SQL playground shell extraction — and was deliberately deferred to its own PR sequence so it can be reviewed and validated incrementally.

---

## 1 — What's already done (context for the next agent)

These shipped in PR #304 — start from `main` after that merges.

### Perf hot-fixes (DuckDB)
- `persistTabs` now debounces `saveTabs` to localStorage (500 ms trailing edge; flushed on tab/db switch, `visibilitychange`, `pagehide`, unmount). The CodeMirror updateListener no longer pays a synchronous `JSON.stringify(tabs)` + `localStorage.setItem` per keystroke. `app/_components/duckdb/DuckDbPlayground.tsx:1265–1335`.
- The schema-reconfigure effect now skips its `view.dispatch(...)` when the structural completion-schema hash is unchanged. Previously fired after every query and CSV import because `refreshSchema()` always built fresh `columnsByEntity` / `foreignKeysByEntity` objects. Same file, around L1879.
- `SELECT COUNT(*)` per table dropped from `refreshSchema`; row counts fetched lazily on first sidebar use, cached, in-flight de-duplicated. `listColumns` + `listForeignKeys` fan-out capped at concurrency 6.

### Bundle wins (all three SQL playgrounds)
- `ErDiagramPane` → `next/dynamic` (defers `@xyflow/react` + `elkjs/lib/elk.bundled.js`).
- `sql-formatter` (~150 KB) moved to call-site dynamic import in the Format button handler.
- `next.config.ts`: enabled `experimental.optimizePackageImports` for `lucide-react` and `react-icons`.

### Dedup pass
- `app/_components/sql/utils/importUtils.ts` now owns the RFC-4180 CSV parser, `tableNameFromFilename`, and the parquet-wasm loader / `readParquetFile`. Dialect import modules re-export from there.
- `app/_components/sql/stores/createSchemaSettingsStore.ts` is the factory for the DuckDB + Postgres settings stores (SQLite has its own with PRAGMA integration and different theme defaults — left untouched).
- `app/_components/sql/shared/editorSetup.ts` owns the canonical CodeMirror extension list + reconfigure helpers. All three playgrounds mount their editor through `createSqlEditorExtensions({...})` and reconfigure their lang / completion compartments via `makeSqlLangExtension` / `makeSqlAutocompletionExtension`.
- `SqlPlayground.tsx`: 245 lines of dead inline exporter copies (already-shared in `sql/utils/exportUtils.ts`) removed.

### Net diff so far in PR #304
- `+317 / -668` for the editor-setup commit alone.
- Total branch diff: ~700 new lines / ~1,150 deleted across editor setup, schema settings, CSV/Parquet helpers, perf hot-fixes, and bundle plumbing.

### File sizes after PR #304
| File | Lines |
|---|---|
| `app/_components/sql/SqlPlayground.tsx` | 4,549 |
| `app/_components/postgres/PostgresPlayground.tsx` | 5,877 |
| `app/_components/duckdb/DuckDbPlayground.tsx` | 6,401 |
| `app/_components/sql/shared/editorSetup.ts` | 223 |

The shell extraction has to chip away at the three monoliths.

---

## 2 — Target architecture

The three SQL playgrounds share ~80% of their shell. The end state is a single `SqlPlaygroundShell` component parameterized by a `SqlEngineAdapter` interface. Each `app/playground/{sqlite,postgres,duckdb}/page.tsx` (or a tiny wrapper file under `_components/*`) becomes a ~50-line file that constructs an adapter and renders `<SqlPlaygroundShell adapter={…} />`.

### 2.1 Proposed adapter interface

Put this in `app/_components/sql/shared/SqlEngineAdapter.ts`. The shapes below are what the shell needs to be dialect-agnostic; refine against the real engine APIs as you go.

```ts
import type { QueryExecResult } from "sql.js";
import type { Extension } from "@codemirror/state";
import type {
  SqlDialect,
  SqlCompletionSchema,
} from "../sqlCompletion";

export interface SqlSample {
  id: string;
  label: string;
  filename: string;
  defaultTabs?: ReadonlyArray<{ title: string; code: string }>;
  // anything else the dialect-specific sample list needs
}

export interface SqlColumnInfo {
  name: string;
  type: string;
  notNull?: boolean;
  defaultValue?: string | null;
  pk?: number;
}

export interface SqlForeignKeyInfo {
  from: string;
  to_table: string;
  to_column: string;
  on_delete?: string;
  on_update?: string;
}

/** Result of a single SQL statement run. Mirrors sql.js's QueryExecResult
 *  for sqlite; postgres/duckdb adapters convert their native shape into
 *  this. */
export interface SqlRunResult {
  sets: QueryExecResult[];
  elapsedMs: number;
  error?: string;
  // optional dialect-specific payloads (e.g. EXPLAIN plan rows)
}

export interface SqlEntityRef {
  name: string;
  kind: "table" | "view" | "index" | "trigger";
  schema?: string;
}

/** Lifecycle + queries for a live engine instance. Implementations:
 *  sqlite → wraps SqliteEngine from runtime/sqlite.ts
 *  postgres → wraps PostgresEngine from runtime/postgres.ts
 *  duckdb → wraps DuckDbEngine from runtime/duckdb.ts */
export interface SqlEngineHandle {
  exec(sql: string): Promise<QueryExecResult[]>;
  execParams?(sql: string, params: unknown[]): Promise<QueryExecResult[]>;
  listTables(schema?: string): Promise<string[]>;
  listViews(schema?: string): Promise<string[]>;
  listIndexes(schema?: string): Promise<string[]>;
  listTriggers(): Promise<string[]>;
  listColumns(name: string, schema?: string): Promise<SqlColumnInfo[]>;
  listForeignKeys(name: string, schema?: string): Promise<SqlForeignKeyInfo[]>;
  listSchemas?(showSystem: boolean): Promise<string[]>;
  destroy(): Promise<void> | void;
}

export interface SqlEngineAdapter {
  // ─── Static identity ─────────────────────────────────────────────
  dialect: SqlDialect; // "sqlite" | "postgres" | "duckdb"
  displayName: string; // "SQLite" | "PostgreSQL" | "DuckDB"
  storagePrefix: string; // "sqlite" | "pgplayground" | "duckdb"
  defaultPageSize: number; // existing per-dialect constant

  // ─── Engine + samples ────────────────────────────────────────────
  createEngine(sampleId: string): Promise<SqlEngineHandle>;
  listSamples(): SqlSample[];
  findSample(id: string): SqlSample | undefined;

  // ─── SQL conventions ─────────────────────────────────────────────
  quoteIdent(name: string): string;
  // Whether the dialect has a schema selector (postgres + duckdb yes, sqlite no).
  supportsSchemas: boolean;
  // Whether the playground exposes a PRAGMA tab (sqlite only).
  supportsPragmas: boolean;

  // ─── Capabilities the shell delegates back to the adapter ────────
  /** Build the SET statement / DDL for column-type changes etc. */
  generateAddColumnSql?(opts: {…}): string;
  /** Render the dialect-specific "Add Table" / "Modify Structure"
   *  dialog. The shell mounts this in a portal when needed. */
  renderAddTableDialog?: React.ComponentType<{…}>;
  renderModifyStructureDrawer?: React.ComponentType<{…}>;
}
```

The interface should grow as you migrate, not be designed all up front. Start with the smallest surface that lets you mount the shell and have it render a working SQLite playground.

### 2.2 What the shell owns

These are the truly dialect-agnostic concerns that should move into `SqlPlaygroundShell`:

- Tab list state (`tabs`, `activeTabId`, `tabHistoryRef`, drag-reorder via `@dnd-kit`).
- Tab persistence (the debounced `persistTabs` from PR #304's perf work).
- CodeMirror mount via `createSqlEditorExtensions(...)` and reconfigure plumbing.
- Settings panel (font size, theme, word wrap, clear-before-run).
- Run controls (Run / Run Selection split button, status indicator, schema-change overlay).
- Query history pane (already shared as `<QueryHistoryPane>`).
- ER diagram pane (already shared as `<ErDiagramPane>`).
- Schema sidebar wrapper that delegates to existing `<SchemaSection>`. Lazy row-count plumbing.
- Results panel wrapper that delegates to existing `<ResultView>`.
- Generic dialogs: Drop Confirm, Truncate Confirm, View DDL.
- CSV/JSON/Parquet import wizard shell (uses the dialect-agnostic `parseCsv` + `readParquetFile` already extracted in PR #304). Calls back into `adapter.importRows(...)`.

### 2.3 What stays per-dialect

- Engine lifecycle (`createSqliteEngine`, `createPostgresEngine`, `createDuckDbEngine`).
- Sample database list (chinook, ecommerce, …) — see Stage 4 in the plan for consolidating these.
- PRAGMA tab and pragma application (SQLite only).
- Schema selector dropdown + system-schemas toggle (Postgres + DuckDB).
- "Add Table" / "Modify Structure" / "Add Row" dialog forms — dialect-specific column types, FK semantics, generated columns, etc.
- Sample-data import logic for the "Load sample" path (each engine has its own `loadSample()`).
- SQL identifier quoting (`adapter.quoteIdent`).
- Row-insert SQL building (VARCHAR for DuckDB, TEXT for Postgres, `INSERT … VALUES (...)` strategy differences).

---

## 3 — Suggested sub-PR sequence

Do **not** try to land Stage 3 in one PR. The recommended sequence:

### Sub-PR A — Adapter interface + shell scaffold (no behavior change)
- Add `app/_components/sql/shared/SqlEngineAdapter.ts` with the interface from §2.1.
- Add `app/_components/sql/shared/SqlPlaygroundShell.tsx` with the bare skeleton: accepts `adapter`, renders the editor host + a `<pre>`-style debug panel showing `dialect`/`sample.id`/the active tab's code.
- Add `app/_components/sql/shared/SqlPlaygroundShell.test.tsx` (Vitest) covering the shell's tab management + persistence in isolation.
- Do not modify the three existing playgrounds. Build is green; nothing is wired in.
- **Goal:** a foundation other PRs can build on without touching any user-facing behavior.

### Sub-PR B — Migrate SQLite
- Implement `createSqliteAdapter()` in `app/_components/sql/sqliteAdapter.ts` that wraps `SqliteEngine`, returns SQLite samples, etc.
- Move SQLite-specific dialogs (Add Table, Modify Structure, Add Row, Pragmas) into their own files under `app/_components/sql/dialogs/`, exported as components. The shell receives them via adapter props (or via a `children`/`slots` pattern).
- Replace `app/_components/sql/SqlPlayground.tsx`'s body with `<SqlPlaygroundShell adapter={sqliteAdapter} />` — the whole file shrinks to ~50 lines plus dialog wiring.
- E2E: run the SQLite Playwright spec. Diff-check the rendered HTML against `main` for the major UI states (initial load, sample switch, query run, CSV import, ER tab).
- **Goal:** SQLite playground works exactly as before, but on the shell.

### Sub-PR C — Migrate Postgres
- Same shape as B, but for `PostgresEngine`. Postgres adds `listSchemas` + system-schemas toggle — refine the shell's schema-selector slot.
- Decide whether to also lazy-load `@codemirror/lang-sql` here (the per-dialect dialect data — `SQLite`, `PostgreSQL` — is currently dragged into every SQL playground bundle; once each adapter provides its own dialect, this becomes possible). See Stage 5 item 3 in the original audit plan.

### Sub-PR D — Migrate DuckDB
- Largest playground (6,401 lines). Migrate last so any rough edges in the shell are sanded down by the time you tackle the most complex case.
- DuckDB's `Combobox` column-type selector, `SET` statements vs SQLite PRAGMAs, and Parquet-import-into-table flow all need adapter hooks. Add them as needed; don't try to anticipate all of them up front.

### Sub-PR E (optional, follow-up) — Stage 4 sample consolidation
- After all three playgrounds are on the shell, the parallel `runtime/sqliteSamples.ts` / `runtime/postgresSamples.ts` / `runtime/duckdbSamples.ts` files are clear candidates for a single `runtime/sqlSamples.ts` with a schema template + per-dialect emitter. The shell only depends on `adapter.listSamples()`, so this is a per-adapter internal refactor by then.

---

## 4 — Specific code locations to attack

### Tab bar (Sub-PR A or B, low-risk warmup)
- `app/_components/sql/SqlPlayground.tsx:4168–4250` — the SQLite tabbar JSX, plus `SqlTab` and `SqlTabDragOverlay` defined elsewhere in the file.
- `app/_components/postgres/PostgresPlayground.tsx:5127` and `app/_components/duckdb/DuckDbPlayground.tsx:5651` — the same tabbar shape with slightly renamed components (`PgTab`, `DuckTab`).
- Extract a generic `<SqlTabBar tabs={...} activeId={...} onActivate onClose onRename onDuplicate onCloseOthers onCloseAll onAdd dragSensors />` into `sql/shared/SqlTabBar.tsx`. Each playground can adopt this independently — does not require the full shell.

### Run controls + status indicator (Sub-PR A or B)
- `app/_components/sql/SqlPlayground.tsx` around L4100–4160, `PostgresPlayground.tsx` ~L5060–5120, `DuckDbPlayground.tsx` ~L5580–5650. The Run / Run Selection split-button + status pill is duplicated.
- Extract into `sql/shared/SqlRunControls.tsx` taking `{statusState, hasSelection, loaded, onRun, onRunSelection}`.

### Settings panel (Sub-PR B)
- `SettingsPanel` is already shared from `playgroundShared`. Each playground passes a dialect-specific list of "extra" toggles. The shell can pass `adapter.extraSettingsItems` (or render via children).

### Schema sidebar wrapper (Sub-PR B)
- `<SchemaSection>` is already shared. The wrapper logic — section collapse state, "show system schemas" toggle, schema-selector dropdown — is currently inlined per playground. Extract this into `sql/shared/SqlSchemaSidebar.tsx`.

### Drop/Truncate/View-DDL dialogs (Sub-PR B)
- Same `<AlertDialog>` shape in all three playgrounds. Pull into `sql/shared/DropEntityDialog.tsx`, `TruncateEntityDialog.tsx`, `ViewDdlDialog.tsx`. Each takes `{adapter, entity, open, onClose}`.

### Settings hydration on mount (Sub-PR A scaffold work)
- The localStorage-keyed hydration of font/theme/wrap/clear-before-run lives in three places; lift into a `useSqlPlaygroundSettings(adapter.storagePrefix)` hook in `sql/shared/`.

---

## 5 — Risk areas and pitfalls

1. **Tab persistence keying.** Each playground uses a different `storageKey` prefix (`sqlite`, `pgplayground`, `duckdb`). The shell must thread `adapter.storagePrefix` through `saveTabs` / `loadTabs`. Make sure no key collisions when both playgrounds are visited in the same session.

2. **Pragma application order (SQLite only).** `applyPragmasToEngine(engine, pragmaSettingsRef.current)` runs after the engine is created but before the first schema refresh. Preserve that ordering in the shell — easiest is to expose `adapter.afterEngineCreated(engine)` and have the SQLite adapter run pragmas there.

3. **Cancellation guards.** `let cancelled = false;` + `if (cancelled) { void engine.destroy(); return; }` patterns are scattered throughout each playground's bootstrap effect. The shell needs an identical pattern, and every adapter's `createEngine` must return a destroyable handle that's safe to call even after a cancelled bootstrap.

4. **Refs threaded into CodeMirror callbacks.** The editor's keymap closures call `runSelectionRef.current(...)` / `runActiveTabRef.current()`. The shell owns the editor, but the actual run functions are constructed from adapter behavior (the shell calls `adapter.run(sql)` and threads results back). Keep the indirection-via-ref pattern PR #304 already established — don't tear down/rebuild the editor on tab change.

5. **The schema-reconfigure debounce fix from PR #304** lives in `DuckDbPlayground.tsx` only. Port the same `lastReconfigureKeyRef` pattern into the shell so SQLite and Postgres also benefit. (See `DuckDbPlayground.tsx` post-PR-304 around L1850–1890.)

6. **`activeDbIdRef` vs `selectedSchemaRef`.** DuckDB and Postgres distinguish "active database" from "active schema" within a database. SQLite has only one DB at a time. The shell should default to the simpler SQLite model and let `adapter.supportsSchemas = true` switch on schema-selector UI.

7. **Tests.** The repo has Vitest unit tests in `__tests__/`. Add shell-level tests for tab management, persistence, and editor-mount lifecycle. Playwright specs in `e2e/` exist for each dialect — re-run them after each sub-PR.

---

## 6 — Plan-of-record verification per sub-PR

For every sub-PR:
1. `npm run lint` — no new errors vs `main`.
2. `npx tsc --noEmit` — clean.
3. `npx vitest run` — all tests pass; add tests for new shared modules.
4. `npm run build` — all 12 playground routes green.
5. `npm run test:e2e -- --grep <dialect>` (Playwright) for the migrated dialect.
6. Manual smoke (golden path):
   - Initial load with default sample.
   - Switch sample → tabs reset / persist correctly.
   - Run query (Mod-Enter + button).
   - Run Selection (highlight + Mod-Enter).
   - Open ER diagram tab.
   - Open query history tab.
   - CSV import (small file).
   - Toggle settings (font / wrap / theme).
   - Drag-reorder tabs.
   - Close tab / close others / close all.
   - DevTools Performance recording during typing — confirm no long tasks > 50 ms per keystroke.

---

## 7 — References

- Original audit + refactor plan: `/root/.claude/plans/can-you-audit-the-snoopy-pony.md` (Stages 1–5 detailed there).
- PR #304: https://github.com/subwaymatch/dataslope-playground/pull/304 — Stages 1, 2, 5 (in part).
- Already-shared modules to leverage:
  - `app/_components/sql/components/ResultView.tsx`
  - `app/_components/sql/components/SchemaSection.tsx`
  - `app/_components/sql/components/QueryHistoryPane.tsx`
  - `app/_components/ErDiagramPane.tsx`
  - `app/_components/sql/utils/importUtils.ts`
  - `app/_components/sql/utils/exportUtils.ts`
  - `app/_components/sql/shared/editorSetup.ts`
  - `app/_components/sql/stores/createSchemaSettingsStore.ts`
  - `app/_components/cmExtensions.ts` (themeFor)

---

## 8 — Suggested first commit on the new branch

Start small. Open Sub-PR A with just these files:

```
app/_components/sql/shared/SqlEngineAdapter.ts        (~120 lines, type-only)
app/_components/sql/shared/SqlPlaygroundShell.tsx     (~200 lines, scaffold)
__tests__/sqlPlaygroundShell.test.tsx                 (~100 lines)
```

No production code paths change. Tests prove the shell can mount, manage tabs, and dispatch through the adapter interface. Reviewing this PR is fast; landing it unlocks the migration PRs.

Sub-PR B then ships `createSqliteAdapter` and rewrites `SqlPlayground.tsx`. Plan for that PR to be ~1,500 lines of net diff (mostly deletions from the 4,549-line monolith) and budget reviewer time accordingly.
