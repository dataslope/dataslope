# Playgrounds Audit & Refactor Plan

## Context

The repo hosts 12 in-browser playgrounds (Python, R, JS, TS, PHP, C, C++, Java, C#, SQLite, Postgres, DuckDB). The 9 language playgrounds are thin wrappers around `app/_components/Playground.tsx` and share runtime adapters cleanly. The three SQL playgrounds, however, have grown into three ~5–6k-line monoliths that re-implement large overlapping surfaces:

- `app/_components/sql/SqlPlayground.tsx` (4,895 lines) — SQLite
- `app/_components/postgres/PostgresPlayground.tsx` (5,918 lines)
- `app/_components/duckdb/DuckDbPlayground.tsx` (6,069 lines)

The user reports the DuckDB playground gets sluggish during interaction and asked us to (a) flag redundant code across playgrounds, (b) identify DuckDB perf hot spots, and (c) call out any imports inflating the Next.js build. Goal is to produce a full refactor plan that consolidates shared SQL-playground code, fixes the highest-impact DuckDB perf issues, and shrinks the build / per-page bundle.

---

## Part 1 — Audit Findings

### A. Redundant code

| Severity | Area | Files | Notes |
|---|---|---|---|
| **Large** | SQL playground monoliths | `sql/SqlPlayground.tsx`, `postgres/PostgresPlayground.tsx`, `duckdb/DuckDbPlayground.tsx` | ~5–6k lines each. CodeMirror EditorView setup (imports + extension list at the top of each file), tab management, keystroke persistence, query history, schema sidebar wiring, and CSV/JSON/SQL export helpers (`exportResultToCsv`, `exportResultToJson`, `exportResultToSql`, `triggerDownload`, `toFileSafeName`) are duplicated three times. `sql/components/ResultView.tsx` (2,457 lines, shared) and `sql/components/SchemaSection.tsx` are correctly shared — everything else is copy-paste. |
| **Large** | CSV parser + parquet loader | `duckdb/duckdbImport.ts:14-103`, `postgres/postgresImport.ts:13-103` | `parseCsv()`, `tableNameFromFilename()`, `initParquetWasm()`, `readParquetFile()` are byte-identical (~166 vs 154 lines). A third copy is embedded in `SqlPlayground.tsx`. |
| **Medium** | Settings stores | `duckdb/stores/useDuckDbSettingsStore.ts` (46 L), `postgres/stores/usePostgresSettingsStore.ts` (39 L) | Identical Zustand shape, only the type name differs. |
| **Medium** | Sample-data loaders | `runtime/sqliteSamples.ts` (889 L), `runtime/postgresSamples.ts` (744 L), `runtime/duckdbSamples.ts` (253 L) | Parallel sample DBs (chinook, ecommerce, …) with dialect variants. |
| **Small** | Language playground pages | `app/playground/*/page.tsx` | Already thin wrappers — no action. |

### B. DuckDB performance bottlenecks

| Severity | Issue | Location | Why it's slow |
|---|---|---|---|
| **High** | localStorage write **on every keystroke** | `DuckDbPlayground.tsx:1664-1676` (the `updateListener` calls `persistTabs` → `saveTabs` → `JSON.stringify` + `localStorage.setItem`) | Synchronous I/O on the main thread on every character. With long queries this is the most visible source of typing jank. |
| **High** | Full CodeMirror reconfigure on every schema change | `DuckDbPlayground.tsx:1837-1870` (the `useEffect([tables, views, columnsByEntity])` rebuilds `completionSchema` and dispatches `langComp.reconfigure` + `completionComp.reconfigure`) | Re-parses editor state, rebuilds the autocomplete index. Triggered any time `columnsByEntity` is re-set (which happens after every import). |
| **Med-high** | 6,069-line monolith re-renders the world | `DuckDbPlayground.tsx` (whole file) | All tab/result/schema/dialog/settings state lives in one `DuckDbPlaygroundInner`. Any state change re-renders the entire subtree; no `React.memo` on the schema sidebar or results pane. |
| **Med** | Schema-refresh N+1 fan-out | `DuckDbPlayground.tsx:1298-1338` (`refreshSchema`) | For every table/view it runs `listColumns` + `listForeignKeys` + `SELECT COUNT(*)` in parallel. 50 tables ⇒ 150 queries. `COUNT(*)` on large tables is the expensive one. |
| **Med** | Result virtualization is conditional | `sql/components/ResultView.tsx:1855-1893` | Virtualization only kicks in for `isInfiniteAll` mode. A normal query returning 10k rows renders all 10k rows into the DOM. |
| **Low-med** | Settings writes are sync, undebounced | `DuckDbPlayground.tsx:964-1019, 1914` | Font size / wrap / clear-before-run each `localStorage.setItem` synchronously on each toggle. |
| **Low** | `useEffect` deps are unmemoized arrays/objects | `DuckDbPlayground.tsx:1870` | `tables`/`views`/`columnsByEntity` are new references each render, re-firing the reconfigure effect more than necessary. |

### C. Build-time / bundle inflation

Most heavy runtimes are already handled well: DuckDB-Wasm loads from jsDelivr (`runtime/duckdb.ts:89`), Pyodide via worker `importScripts`, WebR/parquet-wasm/apache-arrow via `await import(…)`, and Plotly is dynamically imported in `Playground.tsx:168`. `next.config.ts` already stubs `fs`/`path`/`crypto`.

Outstanding issues, in order of impact:

- **High — ER diagram deps eagerly bundled into every SQL playground.** `app/_components/ErDiagramPane.tsx:18-21` statically imports `@xyflow/react` and `elkjs/lib/elk.bundled.js` (the largest ELK build). `ErDiagramPane` is in turn statically imported by all three SQL monoliths (`sql/SqlPlayground.tsx:174`, `duckdb/DuckDbPlayground.tsx:105`, `postgres/PostgresPlayground.tsx:105`) even though it renders only when the user opens the ER-diagram tab.
- **Medium — `sql-formatter` (~150 KB) imported statically but used only on a button click.** `sql/SqlPlayground.tsx:134`, `duckdb/DuckDbPlayground.tsx:90`, `postgres/PostgresPlayground.tsx:90` (call site at `DuckDbPlayground.tsx:2318`).
- **Medium — `@codemirror/lang-sql` ships dead dialect data.** Static imports at the top of each SQL playground also drag in the `SQLite`/`PostgreSQL` dialect descriptors (`sql/SqlPlayground.tsx:80`, `duckdb/DuckDbPlayground.tsx:56`, `postgres/PostgresPlayground.tsx:56`, plus `sql/components/QueryHistoryPane.tsx`). DuckDB pulls SQLite dialect data it doesn't use; Postgres pulls PostgreSQL dialect even though only the SQLite variant is used elsewhere.
- **Low — no `next/dynamic` anywhere in the playground tree.** `ResultView.tsx` (2,457 LOC), the import wizards, and the dialog forms are all eagerly chunked into the page bundle.
- **Low — `lucide-react` / `react-icons` barrels.** Tree-shaking works, but adding `experimental.optimizePackageImports: ["lucide-react", "react-icons"]` to `next.config.ts` reliably shrinks dev compile time.

Already optimized (no action): Pyodide, WebR, DuckDB-Wasm (jsDelivr CDN), parquet-wasm, apache-arrow, Plotly, Mermaid, all four `@wasm-fmt/*` formatters, `php-wasm`, and the `fs/path/crypto` aliasing in `next.config.ts`.

---

## Part 2 — Refactor Plan

The refactor is staged so each step ships value independently and the highest-leverage perf wins land first.

### Stage 1 — DuckDB perf hot-fixes (small, isolated)

Target file: `app/_components/duckdb/DuckDbPlayground.tsx`.

1. **Debounce tab persistence.** Wrap `persistTabs` in a 300–500 ms trailing-edge debounce (and flush on tab switch / unload). The `updateListener` at L1664-1676 should write to in-memory `tabsRef` synchronously but defer `saveTabs` (localStorage). Use `requestIdleCallback` where available.
2. **Memoize completion-schema rebuild.**
   - `useMemo` the `completionSchema` and `schema` objects keyed on `tables`, `views`, `columnsByEntity` (line 1837-1870).
   - Skip the dispatch entirely if the structural hash hasn't changed (compare JSON of `entities` to a ref).
3. **Make schema refresh lazy.**
   - Drop the always-on `SELECT COUNT(*)` per table from `refreshSchema` (L1298-1338). Move row-count fetch to lazy on-demand (e.g. when the schema-sidebar row is expanded or hovered).
   - Cap concurrency of `listColumns` / `listForeignKeys` with a small pool (e.g. p-limit of 6) instead of unbounded `Promise.all`.
4. **Always-on virtualization for results.** In `sql/components/ResultView.tsx` (L1855-1893), enable virtualization for any result > N rows (e.g. 200), not only `isInfiniteAll`. Verify column-width measurement still works.
5. **Memoize heavy children.** Extract `SchemaSidebar`, `TabBar`, and the results panel as `React.memo` components receiving narrow props, so changing e.g. font size doesn't repaint the schema tree.
6. **Debounce settings writes.** Move `localStorage.setItem` for font/wrap/clear-before-run behind a small `persist()` helper that coalesces writes via `requestIdleCallback`.

### Stage 2 — Extract shared SQL-playground primitives

Create `app/_components/sql/shared/` with:

- `editorSetup.ts` — `createSqlEditor({ dialect, initialDoc, keymap, theme })` factory. Pulls in CodeMirror state/view/keymap/search/history/completion/lang-sql centrally so the three monoliths can drop their identical header blocks.
- `exporters.ts` — single home for `exportResultToCsv`, `exportResultToJson`, `exportResultToSql`, `triggerDownload`, `toFileSafeName`. Replace local copies in all three playgrounds.
- `csvImport.ts` — extract the RFC-4180 `parseCsv`, `tableNameFromFilename`, `initParquetWasm`, `readParquetFile` from `duckdbImport.ts:14-103` and `postgresImport.ts:13-103`. Both `duckdbImport.ts` and `postgresImport.ts` keep only the dialect-specific batch-insert logic.
- `createSettingsStore.ts` — Zustand factory taking a storage key + default settings, returning a typed store. Replace `useDuckDbSettingsStore` and `usePostgresSettingsStore`.

Critical files touched:
- `app/_components/duckdb/duckdbImport.ts`
- `app/_components/postgres/postgresImport.ts`
- `app/_components/sql/SqlPlayground.tsx`
- `app/_components/duckdb/DuckDbPlayground.tsx`
- `app/_components/postgres/PostgresPlayground.tsx`
- `app/_components/duckdb/stores/useDuckDbSettingsStore.ts`
- `app/_components/postgres/stores/usePostgresSettingsStore.ts`

### Stage 3 — Decompose the SQL playground monoliths

The three playgrounds share ~80% of their shell. Introduce a `SqlPlaygroundShell` parameterized by a `SqlEngineAdapter` interface:

```ts
interface SqlEngineAdapter {
  dialect: "sqlite" | "postgres" | "duckdb";
  createEngine(dbId: string): Promise<SqlEngine>;
  listSamples(): SampleDb[];
  importers: { csv: …; parquet?: …; };
  settingsStore: SettingsStore;
}
```

Shell owns: tabs, history, schema sidebar, results pane, editor, dialogs. Each playground page becomes a 10-line wrapper passing its adapter, mirroring the language-playground pattern. This is the largest, riskiest stage — gated behind staged migration:

1. Land Stage 2 first so the shared primitives exist.
2. Migrate `SqlPlayground` (SQLite) to the shell.
3. Migrate Postgres.
4. Migrate DuckDB last (most complex).

Already-shared `ResultView.tsx` and `SchemaSection.tsx` slot in unchanged.

### Stage 4 — Consolidate sample data

Replace the three samples files with `runtime/sqlSamples.ts` exporting a schema template + per-dialect SQL emitter. Files folded:

- `runtime/sqliteSamples.ts`
- `runtime/postgresSamples.ts`
- `runtime/duckdbSamples.ts`

### Stage 5 — Static-to-dynamic import conversions

Order by leverage:

1. **`ErDiagramPane` → `next/dynamic`** (largest win). Replace the static imports in `sql/SqlPlayground.tsx:174`, `duckdb/DuckDbPlayground.tsx:105`, `postgres/PostgresPlayground.tsx:105` with `const ErDiagramPane = dynamic(() => import("../ErDiagramPane"), { ssr: false, loading: () => <Spinner/> })`. Defers `@xyflow/react` + `elkjs/lib/elk.bundled.js` until the ER tab opens.
2. **`sql-formatter` → call-site `await import`**. Inline the dynamic import in each Format-button handler (`SqlPlayground.tsx:1680`, `DuckDbPlayground.tsx:2318`, `PostgresPlayground.tsx:2243`).
3. **`@codemirror/lang-sql` → editor setup async**. In the new `sql/shared/editorSetup.ts`, switch to `const { sql, SQLite, PostgreSQL } = await import("@codemirror/lang-sql")`. Editor creation becomes async; the playground renders a loading skeleton until the chunk arrives. Split per-dialect so DuckDB doesn't ship SQLite/Postgres dialect data.
4. **`next.config.ts` tune-up**. Add `experimental.optimizePackageImports: ["lucide-react", "react-icons"]`.
5. **Optional: lazy import wizards & dialog forms** via `next/dynamic` once the shell refactor lands.

---

## Verification

After each stage:

1. **Type-check + lint**: `npm run lint` and `tsc --noEmit` (or `npm run build`). The build itself is the gate for bundle-size work.
2. **Unit tests**: `npm test` (Vitest). Add/refresh tests for the extracted modules:
   - `sql/shared/csvImport.test.ts` — RFC 4180 cases (quoted fields, embedded newlines, escaped quotes).
   - `sql/shared/exporters.test.ts` — CSV/JSON/SQL output snapshots.
   - `sql/shared/createSettingsStore.test.ts` — persistence + defaults.
3. **E2E**: `npm run test:e2e` (Playwright) — run the DuckDB, Postgres, SQLite specs end-to-end after Stages 1–3.
4. **DuckDB perf smoke test (manual)**:
   - `npm run dev`, open `/playground/duckdb`.
   - Type ~2 KB of SQL with DevTools Performance recording open — confirm no main-thread tasks > 50 ms per keystroke (current behavior shows long tasks from localStorage).
   - Load a sample DB (or import a CSV) with 50+ tables — confirm schema refresh finishes < 1 s without freezing the tab.
   - Run `SELECT * FROM big_table` returning ≥ 10k rows — confirm results render within ~1 s and scrolling stays ≥ 30 fps (validates virtualization).
5. **Bundle-size check**: compare `.next/analyze` (or `npm run build` chunk report) before/after Stage 5 — non-SQL playground routes should no longer contain `@codemirror/lang-sql`.