# SQL Playground Feature Comparison Report

**Date:** 2026-05-15  
**Scope:** SQLite, DuckDB, and PostgreSQL in-browser playgrounds  
**Files reviewed:**
- `app/_components/sql/SqlPlayground.tsx` (SQLite)
- `app/_components/duckdb/DuckDbPlayground.tsx` (DuckDB)
- `app/_components/postgres/PostgresPlayground.tsx` (PostgreSQL)
- `app/_components/sql/components/ResultView.tsx` (shared)
- `app/_components/runtime/duckdb.ts`
- `app/_components/runtime/postgres.ts`

---

## Executive Summary

The three playgrounds share a solid core — multi-tab editor, schema sidebar, result table with export, and import dialogs — but have drifted in several areas. **DuckDB is the most behind**: it is missing a schema selector (DuckDB supports multiple schemas), row duplication in the result view, three CodeMirror quality-of-life extensions, and uses the wrong SQL dialect for autocomplete. **PostgreSQL** is also missing row duplication and the same CodeMirror extensions. **SQLite** contains one piece of dead code. None of these gaps are blocking, but they degrade consistency and ergonomics.

---

## Feature Comparison Matrix

| Feature | SQLite | DuckDB | PostgreSQL | Notes |
|---|:---:|:---:|:---:|---|
| **Schema selector (sidebar)** | — | ❌ | ✅ | SQLite has no schemas; DuckDB has `main` + user schemas but no UI |
| **Create schema button** | — | ❌ | ✅ | |
| **"Show system schemas" setting** | — | ❌ | ✅ | Setting is in the "Database" tab of Settings |
| **Triggers sidebar section** | ✅ | — | ✅ | DuckDB intentionally omits (no trigger support) |
| **Indexes sidebar section** | ✅ | ✅ | ✅ | All match |
| **Pragma settings tab (Settings)** | ✅ | — | — | SQLite-only; correct |
| **Row duplication in result view** | ✅ | ❌ | ❌ | `onDuplicateRow` not wired in DuckDB/Postgres |
| **Database-level binary import** | ✅ `.sqlite` | ❌ | ❌ | DuckDB/Postgres have no native binary format in-browser |
| **Database export: binary/SQL dump** | `.sqlite` | `.sql` | `.sql` | All export to `.xlsx` too; SQLite exports binary, others export SQL dump |
| **Table import: CSV** | ✅ | ✅ | ✅ | All match |
| **Table import: JSON** | ✅ | ✅ | ✅ | All match |
| **Table import: Parquet** | ✅ | ✅ | ✅ | All match |
| **Import menu sections** | ✅ Grouped | ❌ Flat | ❌ Flat | SQLite groups into "Database" and "Tables"; DuckDB/Postgres have a flat list |
| **CodeMirror `closeBrackets()`** | ✅ | ❌ | ❌ | Auto-closes `(`, `[`, `'`, `"` |
| **CodeMirror `rectangularSelection()`** | ✅ | ❌ | ❌ | Alt+drag column selection |
| **CodeMirror `tooltips()` override** | ✅ | ❌ | ❌ | Anchors tooltips to `document.body` to prevent clipping |
| **SQL dialect for autocomplete** | `SQLite` ✅ | `PostgreSQL` ⚠️ | `PostgreSQL` ✅ | DuckDB should use generic `sql()` or a DuckDB dialect |
| **Add table from sidebar ("+" button)** | ✅ | ✅ | ✅ | All match |
| **Modify Structure dialog (tables)** | ✅ | ✅ | ✅ | All match |
| **View DDL dialog** | ✅ | ✅ | ✅ | All match |
| **Truncate table** | ✅ | ✅ | ✅ | All match |
| **Drop entity** | ✅ | ✅ | ✅ | All match |
| **Count rows** | ✅ | ✅ | ✅ | All match |
| **Copy entity name** | ✅ | ✅ | ✅ | All match |
| **Export entity to CSV/JSON/SQL/Parquet/XLSX** | ✅ | ✅ | ✅ | All match |
| **Add row dialog** | ✅ | ✅ | ✅ | All match |
| **ER Diagram tab** | ✅ | ✅ | ✅ | All match |
| **Query History tab** | ✅ | ✅ | ✅ | All match |
| **Reset query tabs action** | ✅ | ✅ | ✅ | All match |
| **Tab close/close others/close all** | ✅ | ✅ | ✅ | All match (implementation differs — see issues) |
| **Tab drag-to-reorder** | ✅ | ✅ | ✅ | All match |
| **Tab rename / duplicate** | ✅ | ✅ | ✅ | All match |
| **SQL formatter (Wand button)** | ✅ | ✅ | ✅ | All match |
| **Runtime info popover** | ✅ | ✅ | ✅ | All match |
| **Theme / dark mode** | ✅ | ✅ | ✅ | All match |
| **Generated columns** | `VIRTUAL`+`STORED` | `STORED` only | `STORED` only | Correct per-engine behavior |

---

## Detailed Findings

### 1. DuckDB is Missing a Schema Selector

**Severity: Medium**

PostgreSQL has a full schema workflow: a selector dropdown in the sidebar, a "+" create-schema button, and a "Show system schemas" toggle in Settings → Database. All engine operations (list tables, list columns, truncate, drop, insert row, etc.) are schema-qualified using `selectedSchemaRef`.

DuckDB supports multiple schemas — users can `CREATE SCHEMA analytics` and query across schemas. The engine (`app/_components/runtime/duckdb.ts`) hardcodes `schema_name = 'main'` in every query:

```ts
// duckdb.ts:737
`SELECT table_name FROM duckdb_tables() WHERE schema_name = 'main' AND NOT internal ...`
```

The UI has no selector, no create button, and no system-schema toggle. Any user-created schema is invisible in the sidebar and cannot be targeted via the UI.

**Recommendation:** Add a schema selector and "Create schema" button to DuckDB's sidebar, mirroring the Postgres implementation. The DuckDB engine already has access to `duckdb_schemas()` for enumeration. A "Show system schemas" toggle in Settings would also be consistent.

---

### 2. Row Duplication Missing in DuckDB and PostgreSQL

**Severity: Low–Medium**

SQLite's `ResultView` receives `onDuplicateRow={duplicateRowInTable}` (`SqlPlayground.tsx:4890`), enabling the user to duplicate an existing row via the result table's row context menu.

DuckDB and PostgreSQL do not pass `onDuplicateRow` to `ResultView` at all. The prop is simply absent from both `DuckDbPlayground.tsx` and `PostgresPlayground.tsx`, so the duplicate-row action never appears.

Both engines already support `insertRow()` in their runtime, so the plumbing exists — the hook handler and the prop just need to be wired up.

**Recommendation:** Implement `duplicateRowInTable` in both `DuckDbPlayground.tsx` and `PostgresPlayground.tsx` and pass it as `onDuplicateRow` to `ResultView`, matching the SQLite pattern.

---

### 3. Three CodeMirror Extensions Missing in DuckDB and PostgreSQL

**Severity: Low**

SQLite initialises three CodeMirror extensions that DuckDB and Postgres do not (`SqlPlayground.tsx:1881–1896`):

| Extension | Effect | Present in DuckDB/Postgres? |
|---|---|---|
| `closeBrackets()` | Auto-close `(`, `[`, `'`, `"` on typing | ❌ |
| `rectangularSelection()` | Alt+drag selects a rectangular column range | ❌ |
| `tooltips({ parent: document.body })` | Anchors completion/hover tooltips to `<body>` to prevent clipping inside overflow containers | ❌ |

DuckDB and Postgres do include `closeBracketsKeymap` (the keyboard mapping), but not `closeBrackets()` itself — the keymap without the extension has no effect.

**Recommendation:** Add these three extensions to the CodeMirror setup in both `DuckDbPlayground.tsx` and `PostgresPlayground.tsx`.

---

### 4. DuckDB Autocomplete Uses PostgreSQL SQL Dialect

**Severity: Low**

All three playgrounds import `@codemirror/lang-sql` for syntax highlighting and autocomplete. SQLite uses the bundled `SQLite` dialect. Postgres uses `PostgreSQL`. DuckDB also uses `PostgreSQL` (`DuckDbPlayground.tsx:53`):

```ts
import { sql as sqlLang, PostgreSQL } from "@codemirror/lang-sql";
```

DuckDB's SQL has meaningful differences from PostgreSQL (e.g. `HUGEINT`, `UBIGINT`, `MAP`, `STRUCT`, `LIST`, `QUALIFY`, `PIVOT`/`UNPIVOT`, `EXCLUDE`/`REPLACE` in `SELECT *`). The PostgreSQL dialect will suggest Postgres-specific keywords and miss DuckDB-specific ones.

`@codemirror/lang-sql` does not ship a dedicated DuckDB dialect, so the best available option is the generic `sql()` call without a dialect argument — that way no wrong keywords are injected. A custom DuckDB keyword list could also be supplied via the `dialect` option's `keywords` field.

**Recommendation:** Change DuckDB's CodeMirror dialect from `PostgreSQL` to the generic `sql()` (no dialect), or supply a custom DuckDB keyword set.

---

### 5. Dead Code: `getSqliteErrorHint` Duplicated in `SqlPlayground.tsx`

**Severity: Low (code quality)**

`getSqliteErrorHint` is defined twice:

- `app/_components/sql/components/ResultView.tsx:68` — the live implementation, called at line 867
- `app/_components/sql/SqlPlayground.tsx:254` — a dead copy, never called anywhere in that file

The copy in `SqlPlayground.tsx` is never imported or invoked. It should be deleted to avoid confusion.

---

### 6. Error Hints in `ResultView` are SQLite-Specific for All Three Playgrounds

**Severity: Low**

The shared `ResultView.tsx` component uses `getSqliteErrorHint()` (named explicitly for SQLite) to display plain-English hints below raw error messages. The regex patterns match SQLite error strings:

```ts
error.match(/^near "(.+)": syntax error$/i)     // SQLite syntax error format
error.match(/^no such table: (.+)$/i)            // SQLite missing table format
error.match(/^no such column: (.+)$/i)           // SQLite missing column format
```

DuckDB errors look like: `Catalog Error: Table with name "foo" does not exist!`  
PostgreSQL errors look like: `relation "foo" does not exist`

These patterns will never match DuckDB or PostgreSQL error strings, so users of those playgrounds never see the hint text. The function name reinforces that it was written for SQLite only.

**Recommendation:** Either extend the function with dialect-aware branches (passing the current `playgroundId` into `ResultView`), or replace it with a more general regex set that covers common error patterns across all three engines.

---

### 7. Tab Close/Duplicate Logic is Inlined in DuckDB and PostgreSQL

**Severity: Low (code quality)**

SQLite delegates `closeOtherTabs`, `closeAllTabs`, and `duplicateTab` to a shared `useTabManagement` hook (`SqlPlayground.tsx:1578–1583`). DuckDB and PostgreSQL implement equivalent logic inline inside the component body. This leads to subtle divergences (e.g. DuckDB's duplicate uses `flushSync`; SQLite's hook does not) and makes future changes harder to keep consistent.

**Recommendation:** Extract the tab close/duplicate logic from `DuckDbPlayground.tsx` and `PostgresPlayground.tsx` into the shared `useTabManagement` hook (or a new dedicated hook in `app/_components/sql/hooks/`), matching the SQLite pattern.

---

### 8. Import Menu Lacks Section Labels in DuckDB and PostgreSQL

**Severity: Cosmetic**

SQLite's Import menu groups entries under two headings: **"Database"** (for `.sqlite` binary import) and **"Tables"** (for CSV/JSON/Parquet). The grouping makes the intent of each option immediately clear.

DuckDB and PostgreSQL have no "Database"-level import option, so their menus are flat with no section labels. While functionally fine today, adding a **"Tables"** section label would visually align them with SQLite and be a useful place to add future database-level import options (e.g. a DuckDB `.duckdb` binary if that becomes supported in-browser).

---

## Summary of Recommended Changes

| Priority | Issue | Files Affected |
|---|---|---|
| **Medium** | Add schema selector + create button to DuckDB sidebar | `DuckDbPlayground.tsx`, `runtime/duckdb.ts` |
| **Medium** | Add "Show system schemas" toggle to DuckDB Settings | `DuckDbPlayground.tsx`, `stores/useDuckDbSettingsStore.ts` |
| **Medium** | Wire up `onDuplicateRow` in DuckDB and PostgreSQL | `DuckDbPlayground.tsx`, `PostgresPlayground.tsx` |
| **Low** | Add `closeBrackets()`, `rectangularSelection()`, `tooltips()` to DuckDB and Postgres editor setup | `DuckDbPlayground.tsx`, `PostgresPlayground.tsx` |
| **Low** | Fix DuckDB autocomplete dialect (use generic `sql()` instead of `PostgreSQL`) | `DuckDbPlayground.tsx` |
| **Low** | Remove dead `getSqliteErrorHint` copy from `SqlPlayground.tsx:254` | `SqlPlayground.tsx` |
| **Low** | Make error hints in `ResultView` dialect-aware (or extend patterns) | `ResultView.tsx` |
| **Low** | Extract tab close/duplicate logic from DuckDB/Postgres into shared hook | `DuckDbPlayground.tsx`, `PostgresPlayground.tsx` |
| **Cosmetic** | Add "Tables" section label to DuckDB and PostgreSQL import menus | `DuckDbPlayground.tsx`, `PostgresPlayground.tsx` |
