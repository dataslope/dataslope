# Playgrounds Code-Quality & Workflow Audit — SQL + non-SQL

**Date:** 2026-06-09
**Scope:** Code review of both playground families (`app/_components/sql/**`, `app/_components/postgres/**`, `app/_components/duckdb/**`, `app/_components/runtime/**`, `app/_components/Playground.tsx` + shared chrome), plus a live Playwright walkthrough of the SQL IDE workflows: create database → create table → insert → edit cell (commit/undo) → alter structure (add column) → create/drop index → create view → truncate → drop table → multi-statement runs.
**Method:** Two parallel code-review passes over the sources, findings *verified against the code before acting* (several agent-reported "high severity" findings turned out to be false positives and were dropped — see §4), then a hands-on Chromium walkthrough with console-error capture on `/playground/{sqlite,postgres,duckdb,javascript}`. All fixes below were re-verified live and against the unit + e2e suites.

> **Relationship to earlier audits.** The 2026-05-31 SQL UX audit and 2026-06-06 non-SQL UX audit closed most user-facing gaps. This pass is the code-quality/correctness sweep on top: everything it found was invisible to a quick glance but shows up in the console, in invalid HTML, or in IDE-fidelity details.

---

## 1. What was fixed (all verified live)

### 1.1 Hydration mismatch on every Postgres/DuckDB load (UX-Q1 — previously deferred) 🔴
React #418 fired on every load of `/playground/postgres` and `/playground/duckdb` ("2 Issues"/"1 Issue" dev overlay; a discarded SSR tree in prod). Root cause (already diagnosed in the 05-31 audit): `loadTabs()` runs in `useState` initializers with non-deterministic `newTabId()`s and render-time `localStorage` reads, so server and client markup never match. **Fix:** the three SQL playground pages now load their body with `next/dynamic(…, { ssr: false })` (option (a) from the audit). There is nothing meaningful to server-render in an IDE whose state lives in localStorage/OPFS; first client paint now renders the persisted tabs directly instead of flashing defaults and re-rendering. Page `<title>`/`description` metadata stays in the (still server-rendered) layouts. Files: `app/playground/{sqlite,postgres,duckdb}/page.tsx`.

### 1.2 Invalid HTML from the result grid's row context menu 🔴
Right-clicking a result row injected Base UI's hidden focus-guard `<span>`s as direct children of `<tbody>` (a `<span> cannot be a child of <tbody>` hydration-hazard error in the console — reproduced live). Each row also mounted its own `<ContextMenu.Root>` (N menu instances per grid). **Fix:** one delegated `ContextMenu.Root` now wraps the table-wrap `<div>`; rows are plain `<tr>`s whose `onContextMenu` records `{absoluteRow, values}` as the event bubbles to the wrap-level trigger, and the trigger only forwards right-clicks that landed on a real data row (headers keep their own menu; the virtualizer's spacer rows and empty space keep the native browser menu). The focus guards now land in a `<div>` (valid), and there is exactly one menu instance per result table. Verified: `tbody` children are only `<tr>`s with the menu open; row menu + header menu + "Copy row as JSON" all still work. File: `app/_components/sql/components/ResultView.tsx`.

### 1.3 Base UI "not a native button" console error 🔴
Running any query on a table with a PK logged `Base UI: A component that acts as a button was not rendered as a native <button>…`. `Popover.Trigger` defaults to a native button; seven hover-tooltip triggers render `<span>`/`<div>` without declaring it. **Fix:** `nativeButton={false}` on all seven (PK/FK header icons and disabled-Duplicate row in `ResultView`, history timestamps in `QueryHistoryPane`, truncated names in `SchemaItem`, PK/FK icons in `ErDiagramPane` ×2).

### 1.4 Every toast logged a React `flushSync` error 🔴
Common workflows (create table, commit a cell edit, save structure, drop) each logged `flushSync was called from inside a lifecycle method` — 12 errors in one walkthrough session. Root cause: the **RC** Base UI package (`@base-ui-components/react@1.0.0-rc.0`) calls `ReactDOM.flushSync` from a layout effect in `ToastRoot`; the stable rename (`@base-ui/react@1.5.0`, already a dependency) fixed it upstream. **Fix:** migrated all 11 Toast imports (one shared toast context) to `@base-ui/react/toast`. Verified: full create/edit/drop walkthrough now logs **0** console errors; toasts render on SQL and non-SQL playgrounds. (The other Base UI components stay on the RC package — migrating them wholesale is a separate, riskier change.)

### 1.5 SQLite engine worker leaked OPFS access handles 🔴
`createSqliteEngine` spawned a dedicated Worker that was **never terminated** — the boot effect's cleanup destroyed the editor but not the engine. A leftover worker keeps the workspace's exclusive `opfs-sahpool` access handles open, so the next boot (dev StrictMode remount; client-side route change away and back) failed acquisition with a burst of `NoModificationAllowedError`s + `removeVfs() failed with no recovery strategy`. **Fix:** the worker proxy now exposes `dispose()` (rejects in-flight calls, terminates the worker — which releases its OPFS handles); the boot effect's cleanup calls it; and `createSqliteEngine` defensively terminates a still-tracked predecessor before spawning (covers a boot still in flight at cleanup time). `SqliteEngine.dispose` is optional so the in-process engine used by /learn code blocks is unaffected. Verified: repeated mounts boot cleanly with 0 OPFS errors. Files: `app/_components/runtime/sqlite.ts`, `sqlite-core.ts`, `app/_components/sql/SqlPlayground.tsx`.

### 1.6 Structure editor leaked `__tmp_rebuild` names into constraints (Postgres) 🟡
Adding a column via View/Edit Structure rebuilds the table through `books__tmp_rebuild_1`; sequences were already renamed back, but **constraints weren't** — the sidebar then showed `books__tmp_rebuild_1_pkey` under INDEXES (looks broken, compounds on every edit). Postgres's `RENAME TO` does not rename constraints. **Fix:** after the rename, `rebuildTable` now renames every constraint carrying the temp prefix (`ALTER TABLE … RENAME CONSTRAINT`, which also renames the backing index), mirroring the existing sequence handling. Verified live: after an add-column rebuild the sidebar shows `books_pkey`. File: `app/_components/runtime/postgres.ts`. (DuckDB/SQLite were checked: neither surfaces auto-named constraint objects in the sidebar, so neither leaks.)

### 1.7 DuckDB result headers showed raw Arrow type notation 🟡
The DuckDB grid's type badges leaked Arrow's `toString()`: `decimal[38e+2]`, `int64`, `utf8`, `list<int32>`, `dictionary<…>` — not SQL. A SQL IDE should show `DECIMAL(38,2)`, `BIGINT`, `VARCHAR`, `INTEGER[]`, `ENUM`. **Fix:** new pure `arrowTypeToSqlName` maps Arrow notation (ints/floats/utf8/bool/binary/decimal/date/time/timestamp±tz/interval/list→`[]` recursively/dictionary→ENUM/struct/map) with unknown notations passing through. Downstream consumers were audited first: `classifyCellEditor` (matches `[]`, `timestamp`, `date`, `blob`, … — all compatible; `list<…>` kept as fallback), `DataTypeIcon` (now also gives VARCHAR a text icon — `utf8` previously matched nothing), and the array-editor write path (keys off `Array.isArray`, not the label). Bonus: a `STRUCT<{ts:TIMESTAMP}>` column no longer mis-classifies as a datetime editor. **+7 unit tests** (`__tests__/duckdbSplit.test.ts`). Verified live: headers read `VARCHAR / BIGINT / DECIMAL(38,2)`.

### 1.8 Multi-statement runs landed on "no result set returned" 🟡
`INSERT …; SELECT …;` (the most common script shape: setup, then query) opened with **Set 1** active — the INSERT's "Statement executed successfully — no result set returned" notice — hiding the data the user just queried. **Fix:** a fresh run now lands on the **first set that returned a result table**; reloads (edit/sort/filter re-fetches — including queued re-fetches that arrive without a preserve slot, detected via the new pure `sameResultShape`) keep the user's set, clamped, exactly as before. Verified live (`CREATE; INSERT; SELECT` lands on Set 3 with rows) and against `e2e/sql-multi-result-edit.spec.ts` (the queued-re-fetch stay-on-Set-2 behavior is asserted there and passes). **+5 unit tests** (`__tests__/resultShape.test.ts`).

### 1.9 Error-state timer raced a quick re-run (all 9 non-SQL playgrounds) 🟡
After a failed run, a 3-second timer flipped status `error → ready`. Re-running within those 3 s let the stale timer fire **mid-run**, flipping the status to "ready" (run button re-enabled, spinner gone) while code was still executing. **Fix:** the timer id is tracked in a ref, cancelled at the start of every run and on unmount. File: `app/_components/Playground.tsx`.

### 1.10 Stale metadata 🟢
`/playground/postgres`'s layout description still read "Mock PostgreSQL playground shell for future browser-based query execution" — updated to describe the real PGlite playground.

---

## 2. Workflow walkthrough results (the requested IDE flows)

All driven live on Postgres (plus SQLite/DuckDB for engine-specific checks), screenshots in the session log. Verdicts after the fixes above:

| Workflow | Verdict | Notes |
|---|---|---|
| Create database (DB selector → New Database) | ✅ solid | Clean menu (New / Import SQL Dump / Rename + samples with descriptions); workspace-choice dialog prevents accidental overwrite |
| Create table (Add table drawer) | ✅ solid | Default `id` PK column, type combobox, FK columns, toast + sidebar refresh; auto `books_pkey` appears |
| Insert + multi-statement run | ✅ fixed | Now lands on the SELECT's result set (was "no result set returned") |
| Update a cell (double-click → commit → undo) | ✅ solid | Pending-edit highlight, "Update 1 cell…" commit, post-commit Undo bar re-applies prior values (verified round-trip) |
| Add a column (View/Edit Structure → Save) | ✅ fixed | Works; no longer leaves `__tmp_rebuild` constraint names behind |
| Create index (INDEXES "+") | ✅ solid | Whole row toggles the checkbox, order badge, auto-name, live SQL preview, disabled-until-valid |
| Drop index (right-click → Drop) | ✅ solid | Clear confirm dialog; sidebar refreshes |
| Create view (VIEWS "+") | ✅ solid | Name + SELECT body + dialect-aware replace + live SQL preview, disabled-until-valid |
| Truncate | ✅ solid | Dialog disclosed `TRUNCATE … RESTART IDENTITY CASCADE` semantics (UX-05 fix holding) |
| Drop table | ✅ solid | Dialog disclosed `CASCADE` ("objects that depend on it … are dropped too") |
| Add row (sidebar "+") | ✅ solid | Per-column typed inputs, "Keep open to add another row" |
| Run / Run All / error display | ✅ solid | Split Run button, Explain, engine-badged error block with Copy + hint |
| Row/header context menus | ✅ fixed | Single delegated menu, valid HTML; View Data / Add Row / Structure / Count / DDL / Copy / Export / Truncate / Drop all present |

Console errors across the whole walkthrough after fixes: **0** (was: hydration error + Base UI button error + 12 flushSync errors + 7 OPFS errors per comparable session).

---

## 3. Verification

- `npx tsc --noEmit` — clean.
- `npx vitest run` — **468/468** (463 before + 12 new − 7 superseded… net: 24 files, all green; new: `resultShape.test.ts` ×5, `arrowTypeToSqlName` ×7).
- ESLint on every touched file — 0 errors (3 pre-existing warnings in untouched regions of ResultView).
- e2e (against the live dev server): `sql-multi-result-edit` (3 engines — exercises the active-set change), `sql-edit-undo`, `sql-create-object`, `sql-edit-ergonomics`, `sql-edit-refetch`, `sql-result-filter`, `sql-explain`, `sql-run-statement-at-cursor`, `sql-saved-queries`, `sql-column-stats`, `sql-array-editor`, `sql-enum-editor`, `sql-duckdb-param-binding`, `playground-mobile` — all green.
- Live Playwright re-walkthrough of the §2 flows on all three SQL engines + the JavaScript playground (toast + run + files + settings) — 0 console errors.

---

## 4. Reviewed and rejected (verified false positives — do not "re-fix")

The parallel code-review agents reported these as high severity; each was checked against the actual code and dropped:

- **"Autocomplete schema effect lacks cancellation"** — it has a `cancelled` flag checked before every dispatch (`SqlPlayground.tsx:1378-1427`).
- **"DuckDB snapshot timer races destroy()"** — `destroy()` clears the timer and `takeSnapshot` checks `destroyed` (`duckdb.ts:1676-1681`, `:792`).
- **"Workspace-id race in runCode/syncCreatedFiles"** — workspace switches do a full `window.location.reload()` (`WorkspaceBadge.tsx:667`); the race cannot occur.
- **"Resizer listeners leak on unmount"** — cleanup removes all three listeners; only a cosmetic `document.body.style.cursor` could persist if unmounted mid-drag (not worth touching three files).
- **"postgres importSqlDump destroy race"** — PG workers die with the page; the import dialog blocks conflicting actions; no user-reachable path.

## 5. Known-good observations & remaining (deliberately untouched)

- The structure editor's **rebuild strategy drops user-created indexes/triggers** on the rebuilt table (PG `DROP TABLE CASCADE` + recreate). Pre-existing product behavior, bigger than this pass; flagged for a future slice (recreate user indexes after rebuild, or switch to native `ALTER` for additive changes).
- `UX-08` (multi-statement error attribution / partial results) remains deferred pending the PG transaction-semantics product decision documented in the 05-31 audit.
- The remaining Base UI components still import from the RC package; a wholesale migration to `@base-ui/react` should be its own PR with visual regression checks.
- Tab close affordances are `<span role="button" tabIndex={-1}>` inside the tab `<button>` — deliberate (nested interactive elements are invalid HTML); keyboard users close via the context menu, mirroring VS Code.
