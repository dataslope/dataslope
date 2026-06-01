# SQL Playgrounds UX/UI Audit v2 — SQLite · Postgres · DuckDB

**Date:** 2026-05-31
**Scope:** `/playground/sqlite`, `/playground/postgres`, `/playground/duckdb`
**Method:** Hands-on, **all three engines loaded and driven live** with Playwright (Chromium, 1600×1000 desktop + 820×1180 tablet + 390×844 mobile), cross-checked against source in `app/_components/sql/**`, `app/_components/postgres/**`, `app/_components/duckdb/**`, and `app/_components/runtime/**`. 54 screenshots saved alongside this report in `assets-20260531-sql-playground-audit/`.

> **Note on the previous audit.** A prior pass (`20260524-0058-sql-playgrounds-ux-audit.md`) could only boot Postgres — SQLite and DuckDB WASM were blocked by the sandbox, so those engines were reviewed from source only. This pass loads **all three** by bypassing the sandbox's TLS‑intercepting proxy (`--ignore-certificate-errors` / `ignoreHTTPSErrors`), which is why several of its findings turned out to be stale or inverted. Section 11 lists every correction. **Do not action the old report's findings without checking them here first.**

> **✅ Update — code-quality sweep (2026-06-01, seventh pass).** Working down the remaining `§8` items. Status checklist:
> - **[done] UX-Q4 — failing test + workspace-data migration gap.** `opfs.workspace.test.ts > "filters out invalid entries"` was failing on a clean tree because it seeded the **pre-#409 key `pg_workspaces`** while the registry reads the renamed `playground_workspaces`. Root finding: the #409 storage rename moved `REGISTRY_KEY` **without a migration**, so a user's saved **workspace list** was orphaned on upgrade. Fixed `getWorkspaceRegistry()` to fall back to the legacy key and **migrate it forward** (mirroring `getStoredEditorTheme`); test seeds the current key; **+2 tests** (migration + precedence). Suite green (**290**). `opfs/workspace.ts`.
> - **[done] UX-Q2 — invalid HTML nesting (hardened).** `DndContext`/`SortableContext` now wrap the whole Add-Table `<table>` instead of splitting `<thead>`/`<tbody>`, so @dnd-kit's inline live-region `<div>`s can't nest in `<table>`. The dev warning **didn't reproduce** under React 19 + Next 16 (verified: 0 in browser console + 0 in server log), so this is a latent-correctness fix; **column drag-reorder verified still working**. `ModifyStructureForm.tsx`.
> - **[verified-stale → marked done] UX-12 (toast 8 s) & UX-13 (history persistence)** were already implemented in Phase 2 but the §4.9 detail bullets still read "open"; corrected to ✅ to keep the report honest.
> - **[investigated — deferred] UX-Q1 — SSR hydration mismatch (React #418).** Root-caused: `newTabId()` is non-deterministic (`Date.now()`+`Math.random()`) and the `useState(() => loadTabs(...))` initializer runs on **both** server (build/SSR of these `"use client"` pages) and client, so `data-tab-id`/DnD `aria-describedby` differ → mismatch on every load (12 `hydrat` hits in the dev log). The clean fixes — wrap each playground in `next/dynamic({ ssr:false })`, **or** seed deterministic default tab ids and reconcile localStorage in a post-mount effect — are a **cross-cutting rendering-boundary change** best landed as its own deliberate PR (it touches all playgrounds' load path), not bundled into this UX work. React recovers (it's a console-only warning), so it stays 🟡. Documented in §8 for a dedicated follow-up.
>
> **✅ Update — review follow-ups (2026-06-01, sixth pass).** Each reproduced and verified live with Playwright. Status checklist:
> - **[done] Removed DuckDB native-binary export/import.** The fifth pass found the `.duckdb` binary export/import to be unfixable in duckdb-wasm 1.32.0 (the `copyFileToBuffer` read-back is broken at the WASM-FS level). Rather than ship a dead menu item, the **"DuckDB Binary" export** option and the **"from DuckDB" import** option were removed, along with all the now-dead plumbing: `exportDuckDbBinary` / `performImportDuckDb` and the `ImportBinaryFileDialog` wiring in `DuckDbPlayground.tsx`, and the `exportAsBinary` / `importFromBinary` methods on the engine surface in `runtime/duckdb.ts` (interface + impl + the `MUTATING_METHODS` snapshot list). **Kept** the internal `exportAsBinaryInternal` / `restoreFromOpfs` pair (that's the OPFS persistence snapshot, which round-trips fine because it never leaves the WASM FS) and the shared `ImportBinaryFileDialog` component (SQLite's `.sqlite` import still uses it). The **SQL Dump** export and **from SQL dump** import remain the reliable whole-DB paths; CSV/JSON/Parquet/Excel are untouched. Re-attempt the native binary feature after a duckdb-wasm bump. *Verified live:* the DuckDB Export menu now shows only **SQL Dump / Excel Workbook** (no "DuckDB Binary"), and the Import menu shows **from SQL dump / CSV / JSON / Parquet** (no "from DuckDB"). `tsc`/ESLint: 0 errors; no orphaned references remain.
> - **[done] Mobile: new query tab activates the Editor.** On phones the bottom tab bar already jumped to **Results** when you ran a query or opened a table; now tapping the query-tab **"+"** jumps to the **Editor** (where you'll start typing the new query) instead of leaving you on whatever pane you were on. One line added to the shared shell's event-delegation handler — the three playground bodies stay untouched. *Verified live 3/3:* tapping "+" from the Results pane switches `data-mobile-pane` to `editor`.
> - **[done] Mobile: Results tab disabled until there's something to show.** The **Results** bottom-bar tab is now **greyed out and non-interactive** until the active query tab has produced output (a table, an error, or a "statement executed" notice), so you can't tab into the bare "Run a query to see results" placeholder. Detected from the rendered DOM: `ResultView` tags both its loading/idle placeholders with `data-result-empty`, and a `MutationObserver` in `SqlPlaygroundShell` flips a `hasResults` flag — no prop threaded through the playgrounds. The active pane is never disabled (so mid-run, with the run overlay up, Results stays tappable). *Verified live 3/3:* Results starts disabled, enables after a query runs (and the view auto-jumps to it), and disables again for a freshly-created empty tab; tapping it while disabled is a no-op. `SqlPlaygroundShell.tsx`, `ResultView.tsx`, `sqlPlayground.css`.
> - **[noted] Pre-existing unit-test failure (unrelated).** `__tests__/opfs.workspace.test.ts > "filters out invalid entries"` fails on a clean tree (confirmed by stashing this pass's changes) — `getWorkspaceRegistry()` returns `[]` instead of keeping the one valid entry. Not caused by this work; flagged for a dedicated fix (see §8).
>
> **✅ Update — interactive review follow-ups (2026-05-31, fifth pass).** A second batch of reviewer-reported issues, each reproduced and verified live with Playwright. Status checklist:
> - **[done] Cell editor remounted every keystroke.** Two linked symptoms: (a) the value re-selected as you typed (the user couldn't append), and (b) the inline editor *widened its column*. Root cause: the result table's `columns` memo depended on `pendingEdits`/`activeEditCell`/inline callbacks/`originalIndices` — all of which churn each render — so TanStack rebuilt the columns and the `<input>` **remounted on every keystroke** (re-firing autofocus+select and resetting the caret). Fixed by reading those via refs and dropping them from the memo deps, so the editor is mounted once per edit. Verified the input is the *same element* after typing, value accumulates, and the edit still commits/round-trips (all 3 engines). `components/ResultView.tsx`.
> - **[done] Editing widened the column (no-scroll tables).** Independently, the `<input>`'s intrinsic width (default `size=20`) inflated the auto-laid-out column when the result had no horizontal scroll. Fixed with `size={1}` + `min-width:0` (width:100% still fills the cell). Verified the `name` column stays the same width on edit in all 3 playgrounds. `ResultView.tsx`, `sqlPlayground.css`.
> - **[done] Postgres DB-switch hang (e.g. → Chinook).** Choosing a sample DB → "Open in new workspace" hung on "Loading PostgreSQL engine…" with `InvalidStateError`/`createSyncAccessHandle ... already an open access handle`. Root cause: that path did `createWorkspace` + `switchActiveWorkspace` (a full `window.location.reload()`), and PGlite's OPFS access-handle pool is shared per-origin — so the reloaded page raced the outgoing page's still-open worker for the pool and hung. Fixed by switching **in-place** (new `performNewWorkspaceSwitch`): close the old engine to free the pool, then create the new engine on the new workspace — no reload, no race. Verified live 3/3 (Chinook loads, correct workspace/db, **0 OPFS errors, no hang**); "Overwrite this workspace" (in-place reset) also verified. (The separate React #418 in the console is the pre-existing non-deterministic tab-id hydration mismatch — UX-Q1 — not the cause of the hang.) `PostgresPlayground.tsx`.
> - **[done] Import/export sweep (Playwright).** Verified live across SQLite/Postgres/DuckDB: **SQL-dump** export→re-import (the reported bug — ✅ all 3), **CSV import** (✅ all 3, "Imported N rows"), **JSON import** (✅ all 3), and **SQLite `.sqlite` native-binary** export→import (✅). ⚠️ **DuckDB `.duckdb` native-binary export** produced no download within 30 s and no error/toast — `exportAsBinary()` appears to stall in the WASM build (its own code notes binary export "isn't available in the in-memory build (the common case in WASM)"); flagged for a closer look. Parquet round-trip + XLSX export not yet swept (Parquet needs the hover-based per-table export submenu).
> - **[investigated — duckdb-wasm limitation, reverted] DuckDB `.duckdb` native-binary export.** On `main` it fails with `IO Error: The file "_playground_export_tmp.duckdb" exists, but it is not a valid DuckDB database file!`. Root-caused **three** layered bugs in duckdb-wasm 1.32.0: (1) the export registers a *0-byte read* buffer (`registerFileBuffer(name, new Uint8Array())`) which `ATTACH` rejects as invalid — fixable with `registerEmptyFileBuffer`; (2) `COPY FROM DATABASE` inserts rows in catalog order, violating inline FK constraints (`order_items` before `products`) — fixable with a topo-ordered schema-then-data copy (verified the data *does* copy correctly: order `customers, orders, products, order_items`, 0 FK errors); but (3) even then, **`copyFileToBuffer` cannot read back the bytes written via ATTACH** in 1.32.0 (it reports the file "missing"/empty), so the round-trip is broken at the WASM-FS level regardless of attach/detach/CHECKPOINT order. Since (3) is unfixable from app code (it also affects the OPFS snapshot, which shares the code) and a partial fix would only destabilise the snapshot/import paths, the change was **reverted**; the **SQL-dump export is the reliable whole-DB export**. Needs a duckdb-wasm version bump or a different read-back mechanism — flagged for a dedicated follow-up.
> - **[carried]** Same DB-switch in-place fix for DuckDB/SQLite "open in new workspace" if they show the same OPFS race.
>
> **✅ Update — post-merge review follow-ups (2026-05-31, fourth pass).** A batch of reviewer-reported issues, each verified live with Playwright. Status checklist:
> - **[done] Date display (PG + DuckDB).** Postgres `date` columns rendered as `2024-12-30T00:00:00.000Z` and DuckDB `Date32<DAY>` columns as raw epoch integers (`1704412800000`); both now show a plain `2024-12-30` calendar date like other SQL IDEs. New shared `runtime/valueFormat.ts` (`toDateOnlyString`), wired into both adapters' result mapping.
> - **[done] DuckDB DECIMAL round-trip.** A `DECIMAL(10,2)` cell displayed its unscaled integer (`2999` not `29.99`) and an edit that added decimals round-tripped to the wrong magnitude (`1875.05` → `187505`). Arrow hands duckdb-wasm the value as a `Decimal` *object* (not a `BigInt`), so the prior scale code skipped it; now re-scaled. Postgres `numeric` (decimal strings) and SQLite `REAL` (floats) never had the bug — all three verified to round-trip a numeric edit on a clean table.
> - **[done] Cell-editing ergonomics.** (a) The inline editor no longer grows the row on entering edit mode — the input fills the cell's existing box and draws its highlight with a box-shadow ring (no layout box), so the row height is stable. (b) The cell's value is now **selected on double-click** so you can type to replace immediately. (c) Pending edits can be **cancelled**: a **Cancel** button next to "Update N cells", **Esc reverts the active cell**, and **Esc again (not editing) discards all** pending edits. `ResultView.tsx`, `sqlPlayground.css`. Screenshot: `fu-editing-cancel.png`.
> - **[done] Sidebar long-name overlap.** A long column name (e.g. `debt_to_income_pct`) overflowed and overlapped the right-aligned type label; `.sql-tree-column-name` now truncates with an ellipsis (`debt_to_incom…`). Screenshot: `fu7-sidebar-ellipsis.png`.
> - **[done] SQL-dump export→import (all 3 engines).** Exporting the sample DB as a SQL dump and re-importing it failed. Three independent bugs, each verified fixed with a live export→import round-trip: (1) **FK ordering** — tables were dumped alphabetically with inline `FOREIGN KEY … REFERENCES`, so `cards`/`transactions` were created before `users`/`vendors` ("relation \"users\" does not exist"); now topologically sorted (referenced tables first). (2) **Generated columns** — INSERTs included computed columns (e.g. `debt_to_income_pct`, `amount_category`), rejected on import; now omitted. (3) **Booleans** — emitted as integer `0`/`1` (Postgres: "is of type boolean but expression is of type integer"); now `TRUE`/`FALSE` by column type. Plus SQLite-only: duplicate `CREATE INDEX` (already in each table's DDL) removed, and the `BEGIN TRANSACTION;`/`COMMIT;` wrapper dropped (the OPFS worker's own transaction made the wrapped import fail with "no such table"). New `utils/exportOrder.ts` (`topoSortByForeignKeys`, `formatSqlDumpValue`) used by both Postgres & DuckDB exports; `useDatabaseActions.ts` for SQLite.
> - **[done] Read-only column feedback.** Double-clicking a generated/read-only column (the lock-marked ones, e.g. `debt_to_income_pct`) previously did nothing; it now shows an info toast explaining the value is computed and can't be edited. `ResultView.tsx`. Screenshot: `fu8-readonly-toast.png`.
> - **[done] Export/import sweep (all file types × all 3 engines).** Beyond the SQL dump, verified live: per-table **CSV / JSON / Parquet / Excel** export produce valid files (signatures `csv` / `json` / `PAR1` / `PK`); **CSV / JSON / Parquet import** each add a new table with no error; and **native binary** (`.sqlite` / `.duckdb`) export → re-import with no error. No regressions found in those paths — the SQL-dump bugs were unique to that serializer.
> - New unit tests: `valueFormat.test.ts` (**11**), `exportOrder.test.ts` (**10**); editing/read-only checks verified live (10/10); SQL-dump + CSV/JSON/Parquet/native round-trips verified live on all 3 engines. `tsc`/ESLint: 0 errors.
>
> **✅ Update — Phases 1 & 2 implemented (2026-05-31).**
> - **Phase 1** (UX-01, UX-02, UX-03, UX-05, UX-07) — fixed & verified live (**12/12 checks**). See [§12 Phase 1](#12-implementation-phases).
> - **Phase 2** (UX-12, UX-13, UX-14, UX-20, and the modal slice of UX-04) — fixed & verified live (**7/7 checks**). The larger UX-04 work (bespoke inline editors), UX-06, UX-08, and UX-22 are carried into **Phase 2b**. See [§12 Phase 2](#12-implementation-phases).
>
> Fixed findings are marked **✅ Fixed** (or **✅ Partial**) in the tables below.

> **✅ Follow-up fixes (from hands-on testing).** Three additional issues found while testing, fixed & verified live (**6/6 checks**):
> 1. **CodeMirror active-line highlight removed on the GitHub Light/Dark themes** (the palette themes already suppressed it; the `@uiw` GitHub themes didn't). `cmExtensions.ts`.
> 2. **Edited row no longer jumps to the bottom of the grid, and stays correct across multiple edits.** Postgres & DuckDB move an updated row to the end of the heap (MVCC). The post-commit re-fetch is ordered by the table's primary key when no user sort is applied, **and** the `UPDATE` now identifies the target row by its primary-key value(s) instead of a display-order-dependent ctid/rowid offset (PK-less tables keep the offset fallback). This matches the existing PK-based delete path and is robust to rows moving position between edits. `ResultView.tsx` (`commitEdits`) + `runtime/{postgres,duckdb,sqlite-core}.ts` (`updateRows`).
> 3. **GitHub Light is now the default editor/playground theme** (was Lucario). `playgroundShared.tsx`, `useSettingsStore.ts`, `SqlPlayground.tsx`.

> **✅ Update — Phase 3 mobile/responsive shipped (2026-05-31, third pass).** The playgrounds are now **usable and comfortable on phones** (UX-23, the last remaining 🔴). Below 768px the desktop 3-pane IDE collapses to a **single full-width surface at a time**, switched from a **bottom tab bar** (Schema / Editor / Results); the 270px rail no longer eats the screen, the header no longer overflows, and running a query (or opening a table) auto-jumps to **Results**. All of it lives in the **shared `SqlPlaygroundShell` + `sqlPlayground.css`** (driven by a `data-mobile-pane` attribute), so the three 5k-line playground bodies were **not touched** and desktop/tablet are **byte-for-byte unchanged**.
> - **Verified live with Playwright (this session the WASM CDN *is* reachable):** **27/27** mobile checks across all three engines at 390×844 (0 horizontal overflow before *and* after rendering results, every pane reachable, Run→Results auto-switch with real rows), plus **12/12** desktop+tablet non-regression checks. A new **committed e2e spec** (`e2e/playground-mobile.spec.ts`, **4 tests**) locks in the no-overflow + pane-switching guarantees without depending on the CDN. `tsc`/ESLint: **0 errors**.
> - **Carried forward:** UX-24 (card-per-column structure editor) and the off-canvas-drawer refinement of the schema rail — see §12 Phase 3.
>
> **✅ Follow-up — date/time picker now lets you edit the time, not just the date (2026-05-31, third pass).** The temporal picker was chosen purely from the column's declared SQL type: a `date` column always got a date-only `<input type="date">`. But a value with a real time-of-day can land in a `date`-typed column (flexibly-typed SQLite, or a `2024-03-15 14:30:00` value), and the date-only picker then **hid and silently dropped the time**. Now the editor is **value-aware**: a `date` column whose value carries a non-midnight clock time opens a **`datetime-local` picker so the hours/minutes are editable** too, while pure dates (and true SQL `date`s at midnight) stay date-only and `timestamp(tz)`/`time` are unchanged. New pure helpers `hasTimeOfDay` / `resolveTemporalEditorKind` (`utils/cellEditing.ts`), wired into `ResultView`; **+8 unit tests (36 total)**. *Verified live (CDN reachable this pass):* Postgres `timestamptz`/`timestamp` open a datetime picker pre-filled with the time; a SQLite `DATE` column holding `2024-03-15 14:30:00` now opens a datetime picker and a **full edit→commit→re-fetch round-trip changed the time to `16:45` and persisted it** (preserving the original space separator). Screenshot: `datetime-time-editable.png`.
>
> **✅ Update — Phase 2b cell-editing continued (2026-05-31, second pass).** Type-aware editing extended beyond the boolean toggle and JSON modal:
> - **UX-04 / UX-09 — date & time pickers.** `date` / `timestamp(tz)` / `time` columns now open a **native `<input type="date|datetime-local|time">`** on double-click (across all three engines, driven by `set.columnTypes`). The committed value reconstructs the original string by substituting only its date/time substrings, so it **preserves the separator (`T`/space), fractional seconds and timezone suffix** and round-trips exactly like the existing free-text editor. Non-temporal stored values (e.g. an epoch integer) fall back to the text editor — never mangled.
> - **UX-20 — literal-`"NULL"` escape hatch (now complete).** `parseCellEditValue` no longer coerces the typed text `"NULL"` to SQL NULL (an empty field still clears to NULL, and the explicit **Set to NULL** menu item remains for real NULLs). The stale duplicate in `SqlPlayground.tsx` was aligned.
> - **UX-21 — BLOB/bytea (now partial).** Binary cells are **read-only inline** (a text editor would corrupt the bytes — this also closes a latent bug where the modal let you commit the placeholder text `BLOB (N bytes)`), and "Edit cell in modal" opens a **read-only hex + base64 viewer**. (File upload into a cell is still future work.)
> - Plus inline-editor `aria-label`s (**UX-A1** partial) and defensive `formatCellValue` hardening (arrays → `[a, b, c]`, `Date` → ISO).
> - **Files:** `app/_components/sql/utils/cellEditing.ts` (new, pure helpers), `utils/cellUtils.ts`, `components/ResultView.tsx`, `SqlPlayground.tsx`, `sqlPlayground.css`, `__tests__/cellEditing.test.ts` (new).
> - **Verification (this pass):** **28 new unit tests** (`cellEditing.test.ts`) covering type classification, date round-tripping and the NULL/array logic — all green; `tsc --noEmit` and ESLint report **0 errors**. ⚠️ Unlike the original pass, **this session's network policy denies the WASM CDN** (`cdn.jsdelivr.net` → `403 host_not_allowed`), so the engines can't boot here and live Playwright verification wasn't possible. The changes are deliberately confined to the shared `ResultView` plus the pure, unit-tested `cellEditing`/`cellUtils` helpers, and follow the already-verified boolean-toggle pattern, to keep that risk contained.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Severity legend](#2-severity-legend)
3. [Top findings at a glance](#3-top-findings-at-a-glance)
4. [Detailed findings](#4-detailed-findings)
5. [Cross-engine consistency matrix](#5-cross-engine-consistency-matrix)
6. [Accessibility findings](#6-accessibility-findings)
7. [Responsiveness findings](#7-responsiveness-findings)
8. [Code-quality / correctness issues observed](#8-code-quality--correctness-issues-observed)
9. [Missing features for a basic SQL IDE](#9-missing-features-for-a-basic-sql-ide)
10. [Mobile-compatibility strategy](#10-mobile-compatibility-strategy)
11. [Corrections to the 2026-05-24 audit (do not re-implement)](#11-corrections-to-the-2026-05-24-audit)
12. [Implementation phases (for a coding agent)](#12-implementation-phases)
13. [Appendix — methodology & screenshot index](#appendix--methodology--screenshot-index)

---

## 1. Executive summary

The three SQL playgrounds share an impressive, genuinely polished core: a CodeMirror editor with autocomplete/find/format, a virtualized result grid with **type-badge headers, per-result timing, pagination and download**, a rich schema tree with per-table export submenus, an ER-diagram tab, a query-history tab, a settings tab, workspace management with OPFS persistence, and a comprehensive import/export surface (CSV/JSON/Parquet/native-binary/SQL-dump/XLSX) that is now **consistent across all three engines**. Most of the previous audit's "missing parity" complaints have been resolved.

The remaining problems cluster into five themes:

1. **Complex/non-scalar values are broken at display and edit time.** A JSON/JSONB value renders as the literal string `[object Object]` in the grid, in the inline editor, **and** in the "Edit in modal" textarea — so the data is both unreadable and uneditable, and committing would write garbage. Arrays are mislabeled as `text`. There is no type-aware editor for dates, JSON, arrays, blobs, or enums. (§4.3 — highest-impact cluster.)

2. **Type discoverability is actively misleading.** Opening the column-type list in the Create/Edit-Table dialog shows **only the value already in the field** (1 option for Postgres `bigserial`, 2 for DuckDB `BIGINT`) and hides the other ~28–29 types, because the combobox filters its own option list by the current input. (§4.2.)

3. **Destructive actions hide their real effect.** Postgres silently issues `DROP … CASCADE` and `TRUNCATE … RESTART IDENTITY CASCADE`; DuckDB's "Truncate" is actually `DELETE FROM` and its drop omits `CASCADE`. The confirmation dialogs disclose none of this and there is no "type the name to confirm" guard. (§4.4.)

4. **Engine identity leaks.** The shared result pane hard-codes "Loading SQLite engine…", which appears **on the Postgres and DuckDB pages** during a database switch (reproduced live). (§4.1.)

5. ~~**Not usable on mobile.**~~ **✅ Fixed (Phase 3).** Was: at 390 px the desktop layout overflowed horizontally, the fixed 270 px sidebar ate 70 % of the screen, and the editor/results were crushed into a thin strip with no responsive mode. Now: below 768 px the playground is a single-pane app with a Schema / Editor / Results bottom tab bar, 0 horizontal overflow, verified live on all three engines. (§7, §10, §12 Phase 3.)

Everything here is fixable inside the shared components — most fixes land in `ResultView.tsx`, the per-engine type-selector components, `SchemaActionDialogs.tsx`, and the layout CSS.

---

## 2. Severity legend

| Symbol | Meaning |
|---|---|
| 🔴 **High** | User is misled, can lose/garble data, or is blocked from a basic IDE task. |
| 🟡 **Medium** | Achievable but inefficient, inconsistent, or confusing for non-experts. |
| 🟢 **Low** | Visual polish, terminology, minor inconsistency. |
| ♿ | Accessibility issue. |

Each finding carries an ID (`UX-NN`) for cross-reference from the phased plan in §12.

---

## 3. Top findings at a glance

| ID | Finding | Sev | Engines | Primary code reference |
|---|---|---|---|---|
| **UX-01 ✅ Fixed** | JSON/JSONB renders as `[object Object]` in grid **and** both editors; commit would write the literal string | 🔴 | All (PG/DuckDB JSON) | `runtime/postgres.ts` `toSqlValue` (origin); `utils/cellUtils.ts:17-23` |
| **UX-02 ✅ Fixed** | Type list filters itself on open → shows only the current value, hides ~28–29 other types | 🔴 | PG, DuckDB | `postgres/PostgresPlayground.tsx` `PgTypeSelector`; `duckdb/DuckDbPlayground.tsx` `DuckDbTypeSelector` |
| **UX-03 ✅ Fixed** | "Loading **SQLite** engine…" shown on Postgres/DuckDB pages (e.g. during DB switch) | 🔴 | PG, DuckDB | `components/ResultView.tsx` `engineLabel` prop; wired in all 3 playgrounds |
| **UX-04 ✅ Partial** | Inline edit = single-line `<input type=text>` for every type; modal = plain `<textarea>`; neither is type-aware | 🔴 | All | JSON-aware modal **+** inline **boolean toggle** + inline **date/time pickers** (UX-09) done in `ResultView.tsx`/`cellEditing.ts`. Remaining inline editors (enum/array) → Phase 2b |
| **UX-05 ✅ Fixed** | Drop/Truncate hide CASCADE / RESTART IDENTITY; DuckDB "truncate"=`DELETE` | 🔴 | PG, DuckDB | `components/SchemaActionDialogs.tsx` (`dropDetail`/`truncateDetail`); disclosures in PG/DuckDB playgrounds (type-name guard deferred — see §12) |
| **UX-06 ✅ Fixed** | Inline editing only works on **sidebar-opened** table previews, not hand-typed `SELECT * FROM t` | 🟡 | All | A bare `SELECT * FROM <table>` (optional LIMIT/OFFSET, single real table — not a view) is now auto-flagged editable via `bareTableSelectSource` in `utils/sqlAnalysis.ts`, wired into each `runSqlForTab` |
| **UX-07 ✅ Fixed** | Array columns (`integer[]`, `text[]`) shown with type **`text`** in the result header | 🟡 | PG, DuckDB | `runtime/postgres.ts` `PG_TYPE_NAMES` (array OIDs added) |
| UX-08 | Multi-statement error discards earlier successful results; no "statement N of M", no line highlight | 🟡 | All | `hooks/useQueryRunner.ts:115-160`; `components/ResultView.tsx:908-913` |
| **UX-09 ✅ Fixed** | `timestamptz`/date/time edited as raw UTC ISO text; no picker | 🟡 | All | Native date/datetime-local/time picker on double-click; format-preserving commit. `components/ResultView.tsx`, `utils/cellEditing.ts` |
| UX-10 | Commit affordance ("Update N cell…") sits far bottom-right; no per-row/column discard, no post-commit undo | 🟡 | All | `components/ResultView.tsx` (footer) |
| UX-11 | No create/edit UI for indexes, triggers, views, CHECK/table constraints in PG/DuckDB; SQLite's table form **has** Index/Trigger tabs → inconsistent | 🟡 | All | `components/ModifyStructureForm.tsx` vs PG/DuckDB custom forms |
| **UX-12 ✅ Fixed** | Toast auto-dismiss = 2400 ms — too short to read errors | 🟡 | All | Failure ("warn") toasts now 8 s; `hooks/useDatabaseActions.ts`, PG/DuckDB `showToast` |
| **UX-13 ✅ Fixed** | Query history is in-memory only; lost on reload | 🟡 | All | Persisted (capped 200) to localStorage, `hooks/useQueryHistory.ts` |
| **UX-14 ✅ Partial** | Inline error block lacks Copy-error, SQLSTATE/engine label, and editor highlight | 🟡 | All | Copy-error + engine badge added, `ResultView.tsx`. Editor line-highlight → Phase 2b (with UX-08) |
| UX-15 | Type/identity terminology differs: "Auto-increment" / "Identity/serial" / "Identity"; header wraps mid-word | 🟢 | All | `ModifyStructureForm.tsx`; `PostgresPlayground.tsx` header; `DuckDbPlayground.tsx` header |
| UX-16 | No live "Show generated SQL" preview in Create/Edit Table; no CHECK/comment UI; default value is bare free-text | 🟢/🟡 | All | Create-table dialogs |
| UX-17 | DuckDB inline edits build `UPDATE` via string concatenation (PG uses parameter binding) — fragile for STRUCT/MAP/LIST | 🟡 | DuckDB | `runtime/duckdb.ts:827` |
| UX-18 | Loading hero title is oversized; status caption tiny | 🟢 | All | `components/SqlPlaygroundShell.tsx:95-109` |
| UX-19 | Add Table subtitle "Create a new table" rendered in **green** accent (reads like a status) | 🟢 | All | `PostgresPlayground.tsx:3758-3759`; `sqlPlayground.css:1529-1532` |
| **UX-20 ✅ Fixed** | Cannot enter the literal string `"NULL"`; "NULL" is coerced to SQL NULL; no explicit Set-NULL affordance | 🟢 | All | Explicit "Set to NULL" context-menu item **+** typed `"NULL"` now stored verbatim (`parseCellEditValue`, `cellUtils.ts` + aligned `SqlPlayground.tsx`) |
| **UX-21 ✅ Partial** | BLOB shown as `BLOB (N bytes)`; modal editor mangles binary; no hex/base64/upload | 🟡 | All | Binary cells now read-only inline (closes a commit-corruption bug) + **hex/base64 viewer** in the modal. Upload-into-cell still TODO. `components/ResultView.tsx`, `utils/cellEditing.ts` |
| **UX-22 ✅ Fixed** | Generated/read-only columns not visually distinguished; edits fail only on commit | 🟡 ♿ | PG, SQLite | Generated columns now carry a header lock marker, are non-editable inline, and the modal/Set-to-NULL paths are blocked with a toast. `ColumnKeyHints.readOnly` (from `TableColumnInfo.generated`) → `ResultView.tsx`. (DuckDB doesn't yet surface generation metadata.) |
| **UX-23 ✅ Fixed** | Not mobile-responsive: horizontal overflow at 390 px, 270 px sidebar dominates | 🔴 (mobile) | All | Single-pane mobile shell (Schema/Editor/Results bottom tab bar) below 768 px; 0 overflow, verified live. `components/SqlPlaygroundShell.tsx`, `sqlPlayground.css` |
| UX-24 | Add Table 13-column table never collapses; horizontal scroll hides most fields on narrow widths | 🟡 ♿ | All | `sqlPlayground.css` (table wrapper) — carried into Phase 3 follow-up |

---

## 4. Detailed findings

### 4.1 Engine boot & loading

The boot overlay (`SqlPlaygroundShell.tsx:85-110`) stamps the playground title 3–4× at huge size with the real status caption ("Bribing the WebAssembly elves with cookies…") tiny at the bottom (`assets…/00-sqlite-loading.png`).

- 🔴 **UX-03 — "Loading SQLite engine…" leaks onto Postgres/DuckDB.** `ResultView.tsx:887-893` hard-codes `<h3>Loading SQLite engine…</h3>` whenever its `loading` prop is true. Postgres and DuckDB pass `loading={statusState === "loading"}` (`PostgresPlayground.tsx:4716`, `DuckDbPlayground.tsx:5316`). When the full-screen overlay isn't covering the pane — e.g. **switching the active database** — the user on the Postgres page sees "Loading SQLite engine…". **Reproduced live:** `assets…/07-pg-loading-sqlite-leak.png`. Fix: pass an engine label (or read it from context) into `ResultView`; also fix the two `SqlPlayground.tsx:1183,1669` strings if that shell is ever reused.
- 🟢 **UX-18 — Oversized hero.** The repeated title swamps the viewport; the status text and progress bar deserve more prominence. Consider a centered logo + single title + a clearer step caption.

### 4.2 Creating a table & adding columns

Opening **Add table** (sidebar `Add table` button) gives a right-side drawer. SQLite uses the shared `ModifyStructureForm` (with **Columns / Indexes / Triggers** tabs); Postgres and DuckDB use their own flat column tables (no Index/Trigger tabs). All three default a first `id` row to Primary + auto-increment. Screenshots: `02-sqlite-add-table-dialog.png`, `02-postgres-type-dropdown-open.png`.

- 🔴 **UX-02 — Self-filtering type list.** The Postgres/DuckDB type field is a Base UI `Combobox` whose option list is `PG_TYPE_GROUPS.map(... .filter(type.includes(query)))` with `query = inputVal` (`PostgresPlayground.tsx:461-469`). Opening the list via the chevron while the field still holds the default value shows **only that value**. Measured live: Postgres shows **1** option (`bigserial`) instead of 29; DuckDB shows **2** (`BIGINT`, `UBIGINT`) instead of 28. Screenshots: `02b-postgres-typelist-prefilled.png` (1 item) vs `02b-postgres-typelist-cleared.png` (all 29). A user reasonably concludes no other types exist. **Fix:** when the popup is opened by the trigger (not by typing), bypass the filter and show all groups with the current value highlighted; optionally add a "Showing 1 of 29 — clear to see all" caption while filtered.
- 🟡 **UX-11 — Index/Trigger/constraint creation is inconsistent.** SQLite's form has Index and Trigger sub-tabs; Postgres/DuckDB's do not, and no engine offers CHECK constraints, column comments, or table-level constraints in the UI. Indexes/triggers in PG/DuckDB are **view-DDL + drop only** (`SchemaLeafItem.tsx:80-99`). Pick one model and apply it across engines.
- 🟢 **UX-15 — Identity terminology drift.** Column header reads "Auto-increment" (SQLite), "Identity/serial" (PG), "Identity" (DuckDB); the PG header wraps mid-word ("Identity/" / "serial"). Choose one user label, put the SQL keyword in a tooltip, and use a non-breaking slash or a wider column.
- 🟡 **UX-16 — No DDL preview / constraint helpers.** No "Show generated SQL" pane; default-value is bare free-text with no `now()`/`gen_random_uuid()`/`nextval()` helper; no CHECK/comment fields.
- 🟢 **UX-19 — Green subtitle.** "Create a new table" uses `color: var(--accent1)` (`sqlPlayground.css:1532`), which reads like a success message. Use a muted subtitle color.

### 4.3 Inline cell editing & complex types (highest-impact cluster)

Set-up used live: `CREATE TABLE … (id serial pk, doc jsonb, ts timestamptz, nums integer[], data bytea, gen … GENERATED)`, then opened from the sidebar so the grid is editable. Screenshots: `03-pg-complex-types-result.png`, `03b-pg-jsonb-inline-input.png`, `03b-pg-edit-cell-modal.png`, `03b-pg-pending-commit-bar.png`.

- 🔴 **UX-01 — JSON is `[object Object]` everywhere.** `formatCellValue` (`cellUtils.ts:17-23`) does `String(v)` for non-primitives, so a JSONB object becomes `"[object Object]"`: in the grid cell, in the inline `<input>` (its `defaultValue` is `formatCellValue(rawValue)`), and in the modal `<textarea>`. **Verified live:** the inline editor for the `doc` cell contains the literal text `[object Object]` (`03b-pg-jsonb-inline-input.png`); the modal shows the same. The user cannot read or edit the JSON, and committing persists the string. **Fix:** detect object/array values and `JSON.stringify` them (pretty-print in the modal); on commit, parse JSON columns back.
- 🟡 **UX-07 — Arrays mislabeled & flattened.** `integer[]` renders as `10,20,30` with a header type badge of **`text`** (`03-pg-complex-types-result.png`). Surface the real array type and consider a bracketed display (`[10, 20, 30]`).
- 🔴 **UX-04 — No type-aware editors.** Every type shares one single-line text input (`ResultView.tsx:1803-1830`); the only "advanced" path is an 8-row plain `<textarea>` (`:2200`). No JSON editor/validator, date picker, boolean toggle, enum dropdown, array editor, or blob viewer. **✅ Update:** JSON modal, boolean toggle, **date/time pickers** (UX-09) and a **BLOB viewer** (UX-21) are now done; **enum dropdown** and **array editor** remain (Phase 2b).
- 🟡 **UX-09 — Date/time editing is opaque.** `timestamptz` is shown as `2026-05-31T03:35:51.558Z` (raw UTC ISO). No picker; no indication the stored value will be normalized to UTC. **✅ Fixed:** a native date/datetime-local/time picker now opens on double-click; the commit preserves the original value's exact format (separator/fraction/zone) so it round-trips. Non-string temporal values fall back to text. **✅ Refined (third pass):** the picker is now **value-aware** — a `date`-typed column whose value actually carries a time-of-day opens a **datetime-local** picker so the **hours/minutes are editable** (previously the date-only picker hid and dropped the time); pure dates stay date-only. Verified with a live time-edit round-trip (`datetime-time-editable.png`).
- 🟡 **UX-21 — BLOB/bytea.** Shown as `BLOB (4 bytes)`; the modal textarea will corrupt non-UTF-8 bytes on save; there is no hex/base64 view and no "upload file into this cell". **✅ Partial:** binary cells are now read-only inline (this also closes the corruption path — the modal previously let you commit the literal text `BLOB (N bytes)`), and "Edit cell in modal" opens a **read-only hex + base64 viewer**. Upload-into-cell still TODO.
- 🟡 **UX-06 — Editability is invisible & inconsistent.** A result is editable only when `sourceTable` is set, which happens **only** when a table is opened from the sidebar (`useQueryRunner.ts:93,143`). A hand-typed `SELECT * FROM users` is read-only — double-click does nothing and the row context menu drops "Edit cell in modal" — with no tooltip explaining why. Either detect single-table selects and enable editing, or show "Open this table from the sidebar to edit cells."
- 🟡 **UX-10 — Commit/undo ergonomics.** Pending edits flush via an "Update N cell…" button in the bottom-right footer with "N cell edited" bottom-left (`03b-pg-pending-commit-bar.png`). There is no per-row/column discard, no keyboard shortcut, and no post-commit undo (the delete dialog even warns the action "cannot be reversed within this session").
- 🟡 **UX-17 — DuckDB UPDATE string-building.** DuckDB serializes edited values by quote-escaping and string-concatenating into the `UPDATE` (`runtime/duckdb.ts:827`), unlike Postgres parameter binding. STRUCT/MAP/LIST literals typed by a user will mis-parse, and numeric columns can silently receive `VARCHAR`.
- 🟢 **UX-20 — NULL round-trip.** `parseCellEditValue` (`cellUtils.ts:39-44`) maps both `""` and the text `"NULL"` to SQL NULL — so you **cannot** store the literal string `"NULL"`, and there is no explicit "Set to NULL" menu item (only typing). Add an explicit Set-NULL action and an escape hatch for the literal. **✅ Fixed:** the explicit "Set to NULL" item exists (prior pass) **and** typed `"NULL"` is now stored verbatim (only an empty field clears to NULL); the stale duplicate in `SqlPlayground.tsx` was aligned.
- 🟡 ♿ **UX-22 — No read-only column signal.** Generated columns, view columns, and join columns look editable; the engine only rejects the `UPDATE` at commit time.

### 4.4 Destructive actions (drop / truncate)

Dialog copy (`SchemaActionDialogs.tsx:30-82`): Drop → "This will permanently drop **X** from the in-memory database. Reload the page to restore the sample." Truncate → "…deletes every row but keeps the schema. The change is in-memory only…". Screenshots: `04-postgres-drop-dialog.png`, `04-postgres-truncate-dialog.png`.

- 🔴 **UX-05 — Hidden cascade semantics.**
  - Postgres drop = `DROP … CASCADE` (`postgres.ts:713`); truncate = `TRUNCATE … RESTART IDENTITY CASCADE` (`postgres.ts:718`). The dialog mentions neither cascade nor dependent objects nor identity reset.
  - DuckDB drop = no `CASCADE` (`duckdb.ts:1291`); "Truncate" = `DELETE FROM` (`duckdb.ts:1295`) — i.e. the same button does something materially different from Postgres.
  - **Fix:** disclose the exact clause and (ideally) preview dependent objects; align DuckDB/Postgres semantics or label the difference; for tables above a row threshold, require typing the table name to confirm.
- 🟡 The DB-switch confirmation is a good model to mirror here — it already offers an explicit choice ("Open in new workspace" / "Overwrite this workspace", `07-pg-db-selector-open.png`).

### 4.5 Triggers, indexes, views, constraints

- Indexes/triggers: row click or context menu → **View DDL / Copy Name / Drop** only (`SchemaLeafItem.tsx`). The DDL viewer is a clean, syntax-highlighted, read-only modal with Copy (`04-postgres-trigger-ddl.png`). No create/edit/REINDEX/ANALYZE.
- Views use the read-only "View Structure" path; tables use the editable drawer.
- ✅ **Correction:** Postgres/DuckDB **do** have an editable **View/Edit Structure** alter-table drawer (add/remove column, change type, PK/unique/FK/identity, drop generated column, Save, Drop Table — verified live: 118 inputs, `08-pg-edit-structure.png` DOM). The real gaps are CHECK/comment/table-constraint fields (all engines), index/trigger management (PG/DuckDB), and SQLite's structure edits being a silent table-rebuild rather than native `ALTER`.

### 4.6 Invalid queries & error states

Single-statement errors render well: red "Query failed", boxed message, and a **helpful hint** ("Table/view "X" does not exist. Check the Tables pane…") — and the error **persists** until the next run (`04-postgres-error-single.png`).

- 🟡 **UX-08 — Multi-statement attribution.** `SELECT 1; SELECT * FROM nope; SELECT 2;` shows only the error; the successful `SELECT 1` result is gone, with no "statement 2 of 3" label and no editor line highlight (`04-postgres-error-multi.png`). Surface per-statement success/error and highlight the failing line/column.
- 🟡 **UX-14 — Error affordances.** The inline error block has no "Copy error" button (the warn-toast does, `ToastList.tsx:42-53`), no SQLSTATE/engine label. Add them.
- ✅ The hint helper `getSqliteErrorHint` is actually multi-engine (handles SQLite/DuckDB/Postgres patterns, `ResultView.tsx:69-114`); only the name is misleading — rename it.

### 4.7 Schemas, databases, workspaces, connections

- Schema selector cleanly separates user **SCHEMAS** from **SYSTEM CATALOGS** (`05-postgres-schema-dropdown.png`) — good.
- Database selector bundles New / Import SQL Dump / Rename + sample DBs with descriptions (`05-postgres-db-selector.png`).
- Workspace switcher lists workspaces with size + last-opened (e.g. "38 MB · just now") (`05-postgres-workspace.png`).
- Switching DB prompts a thoughtful workspace-choice dialog (no accidental overwrite).
- 🟢 Two header controls can read as "database pickers" (the playground switcher vs the workspace pill); a divider/label would help. Switching schema does not warn that open query tabs may still reference the old schema (low priority for a learning tool).

### 4.8 Import / export

Now strong and **consistent** (`05b-*` screenshots):

| | Import | Export DB |
|---|---|---|
| SQLite | `.sqlite`, SQL dump, CSV, JSON, Parquet | `.sqlite`, SQL dump, XLSX |
| Postgres | SQL dump, CSV, JSON, Parquet | SQL dump, XLSX |
| DuckDB | SQL dump, CSV, JSON, Parquet | SQL dump, XLSX |

Plus per-table export submenus (CSV/JSON/SQL/Parquet/XLSX) with live row counts (`SchemaItem.tsx:445-528`).

> **Sixth pass:** DuckDB's native-binary `.duckdb` **import + export were removed** — `copyFileToBuffer` can't read back an ATTACH-written file in duckdb-wasm 1.32.0, so the round-trip was broken (see fifth-pass investigation). SQL Dump is now DuckDB's whole-DB export/import; SQLite keeps its working `.sqlite` native binary. Re-attempt after a duckdb-wasm bump.

- 🟢 Remaining gaps: drag-and-drop import validates by extension only (no preview / row-count / column mapping); failed imports surface as warn-toasts with raw messages (no "first N parse errors" panel); no file-size guard before exporting very large result sets to XLSX.

### 4.9 Notifications, history, undo

- ✅ **UX-12 — Toast timeout (Fixed).** Failure (`warn`) toasts now use an **8 s** per-toast timeout while transient `info` notices keep the 2.4 s default, in all three `showToast` helpers. `.toast-warn` already carries the red stripe + Copy button. (A distinct hard-`error` style remains a possible future polish.)
- ✅ **UX-13 — Query history persistence (Fixed).** `useQueryHistory(storageKey?)` restores from localStorage via a lazy initializer (no SSR hydration mismatch — the list only renders when the History tab is opened) and writes a capped (200-entry) copy on change; `clearHistory` writes `[]`. Threaded from all three playgrounds. ("Saved queries" / named snippets remain a future feature.)
- 🟡 No global undo for drop/drop-column/commit. The only "undo" is reload, which loses unsaved work.

---

## 5. Cross-engine consistency matrix

| Capability | SQLite | Postgres | DuckDB | Note |
|---|---|---|---|---|
| Section header casing | UPPERCASE | UPPERCASE | UPPERCASE | ✅ now consistent |
| Add-table form | shared `ModifyStructureForm` (Columns/Index/Trigger tabs) | custom flat table | custom flat table | UX-11 |
| Type list size | 7 (native `<select>`) | 29 (combobox) | 28 (combobox) | SQLite far less expressive |
| Type list "open shows all" | n/a (native) | ❌ self-filters | ❌ self-filters | UX-02 |
| Edit existing structure (ALTER) | ✅ (rebuild) | ✅ native | ✅ native | SQLite rebuild not disclosed |
| Create index/trigger UI | ✅ (in form) | ❌ | ❌ (no triggers) | UX-11 |
| CHECK / column-comment UI | ❌ | ❌ | ❌ | UX-16 |
| Live DDL preview | ❌ | ❌ | ❌ | UX-16 |
| Inline edit type-awareness | ⚠️ bool/date/time/JSON | ⚠️ bool/date/time/JSON | ⚠️ bool/date/time/JSON | UX-04 (enum/array remain) |
| JSON display/edit | n/a | ❌ `[object Object]` | ❌ `[object Object]` | UX-01 |
| Drop = CASCADE | n/a | ✅ silent | ❌ no cascade | UX-05 |
| Truncate | `DELETE` | `TRUNCATE … RESTART IDENTITY CASCADE` silent | `DELETE` | UX-05 |
| Import CSV/JSON/Parquet | ✅ | ✅ | ✅ | ✅ resolved |
| Native binary import/export | ✅ `.sqlite` | n/a (SQL dump) | ✅ `.duckdb` | ✅ |
| Whole-DB SQL dump export | ✅ | ✅ | ✅ | ✅ resolved |
| Per-table export submenu | ✅ | ✅ | ✅ | ✅ |
| Error hint | ✅ | ✅ | ✅ | ✅ (helper misnamed) |
| Error persistence | ✅ until next run | ✅ | ✅ | ✅ |
| Loading-pane engine label | "SQLite" | **"SQLite"** (bug) | **"SQLite"** (bug) | UX-03 |
| Triggers section when unsupported | n/a | n/a | suppressed | ✅ |
| Query-history persistence | localStorage (200) | localStorage (200) | localStorage (200) | ✅ UX-13 |
| Pre-populated tabs | Query 1–4 | Query 1–4 (+`*.pg` preview) | "Top customers"/"Sales by category"/"Order totals view" | DuckDB ships pedagogical samples; others don't |

---

## 6. Accessibility findings

- ♿ **UX-A1** — Inline edit `<input>` (`ResultView.tsx:1803-1830`) and modal `<textarea>` (`:2200`) have no `aria-label`; a screen-reader user gets no column context on entering edit mode.
- ♿ **UX-A2** — Color-only cues: pending-edit highlight, NULL styling, the green dialog subtitle, the red error title. Add icons/text.
- ♿ **UX-A3** — No keyboard path to enter edit mode (double-click only); add `Enter`/`F2` from a focused cell, and a key to commit/discard pending edits.
- ♿ **UX-A4** — Add Table table forces horizontal scroll at small widths / high zoom (see UX-24).
- ♿ **UX-A5** — The sortable tab list and DnD column rows announce DnD instructions but the SSR/CSR id mismatch (§8) can confuse AT; stabilize ids.

---

## 7. Responsiveness findings

Measured live (`06-*` screenshots, DOM metrics):

| Viewport | Horizontal overflow | Sidebar | Verdict |
|---|---|---|---|
| 1600×1000 desktop | none | 270 px | ✅ good |
| 820×1180 tablet | none (scrollW 820) | 270 px | 🟡 usable, cramped (unchanged) |
| 390×844 mobile | **none** (was scrollW 458 > 390) | off-canvas | ✅ **now usable** |

- ✅ **UX-23 — Fixed.** Below 768 px the 3-pane IDE collapses to a **single full-width surface at a time**, switched from a bottom tab bar (Schema / Editor / Results). The 270 px rail becomes the full-screen "Schema" surface instead of a permanent strip; the header drops the wordmark and caps the workspace pill so it stops overflowing; the drag-resizers are hidden; and running a query (or double-clicking a table) auto-jumps to **Results**. Measured live: `documentElement.scrollWidth == clientWidth` at 390 px on all three engines, before and after rendering results. Before: `06-mobile-postgres-initial.png` (the broken 270 px-rail layout). After: `mobile-after-{sqlite,postgres,duckdb}-{editor,schema,results}.png` (this pass) — the full-width editor, full-screen schema tree, and full-width results grid with the Schema/Editor/Results bottom bar.
- 🟡 **UX-24 — Carried forward.** The Create/Edit Table 13-column table still scrolls horizontally inside its (portaled, full-height on mobile) drawer; the card-per-column layout below ~900 px is the next slice of Phase 3.

See §10 for a concrete mobile strategy.

---

## 8. Code-quality / correctness issues observed

These showed up in the console / dev overlay during normal use (the bottom-left "N Issues" badge). They're not user-facing in production but are worth fixing.

- 🟡 **UX-Q1 — SSR hydration mismatch (investigated; deferred to a dedicated PR).** React logs a hydration mismatch (React #418) on the tab bar on every load. **Root cause:** `newTabId()` = `` `t_${Date.now().toString(36)}_${Math.random()...}` `` (non-deterministic), and `loadTabs()` is called from the `useState(() => …)` initializer, which runs on **both** the server (Next still build/SSR-prerenders these `"use client"` pages) and the client — so `data-tab-id` / DnD `aria-describedby="DndDescribedBy-*"` differ between the two renders. Confirmed live: 12 `hydrat`ion-warning hits in the dev-server log; none from any other source. **Recommended fix (own PR):** either (a) load each playground via `next/dynamic(() => import(...), { ssr:false })` so the interactive body is client-only (simplest; the boot overlay already covers the brief mount gap), or (b) seed **deterministic** default tab ids for the initial render and reconcile the localStorage-restored tabs in a post-mount `useEffect` (mirrors how `useQueryHistory` already avoids the mismatch by only rendering restored data after the History tab is opened). Both touch all playgrounds' load path, so they belong in a separate, deliberately-tested change rather than this UX PR. React recovers by re-rendering on the client, so it's non-fatal.
- ✅ **UX-Q2 — Invalid HTML nesting (hardened).** The Add Table structure editor nested `<DndContext>`/`<SortableContext>` *between* `<thead>` and `<tbody>`; `@dnd-kit` 6.3.1 renders its hidden a11y live-region as inline `<div>`s (it only portals when given a `container`, which wasn't set), so after mount those `<div>`s land directly inside `<table>`. **Note:** the warning **did not reproduce** in the current React 19 + Next 16 build (0 in the browser console *and* 0 in the dev-server log — only the UX-Q1 tab-id `hydrat`ion mismatches appear), because React 19 renders @dnd-kit's live region only after client mount and no longer surfaces this as a dev warning here. It was fixed anyway as a latent-correctness improvement: `DndContext`/`SortableContext` now **wrap the whole `<table>`** (the idiomatic dnd-kit-with-tables structure), so the live-region `<div>`s can never nest inside `<table>`. *Verified live:* Add Table opens with **0** nesting errors **and column drag-reorder still works** (`alpha, bravo, charlie` → `bravo, charlie, alpha`). `ModifyStructureForm.tsx`.
- 🟢 **UX-Q3 — Dev overlay overlaps Settings gear.** The Next.js dev badge sits over the bottom-left Settings gear (dev-only); harmless in prod but consider moving the gear up a few px so it never collides.
- ✅ **UX-Q4 — Pre-existing failing unit test (now fixed) + workspace-data migration gap.** `__tests__/opfs.workspace.test.ts > registry > "filters out invalid entries"` failed on a clean tree because it seeded the **pre-#409 key `pg_workspaces`** while `getWorkspaceRegistry()` reads the renamed `playground_workspaces` (so it returned `[]`). Two trivially-`[]`-expecting tests masked it. **Root finding:** the #409 `pg_` → `playground_` storage rename moved `REGISTRY_KEY` **without a migration**, so any user who had created workspaces on the old build lost their **workspace list** on upgrade — even though the same commit deliberately added a legacy-key fallback for the editor theme and kept other prefixes verbatim "so users' existing localStorage state is preserved." **Fixed:** `getWorkspaceRegistry()` now reads `playground_workspaces`, and when absent falls back to the legacy `pg_workspaces` and **migrates it forward** (one-time write), mirroring `getStoredEditorTheme`'s pattern. Test updated to seed the current key; **+2 unit tests** (legacy migration + current-key-precedence). Full suite green (**290**). `app/_components/opfs/workspace.ts`, `__tests__/opfs.workspace.test.ts`.

---

## 9. Missing features for a basic SQL IDE

Things a "basic" SQL IDE is generally expected to have. ✅ = already present (don't rebuild), ❌ = missing, ⚠️ = partial.

**Editing & running**
- ✅ Syntax highlighting, autocomplete (`@codemirror/lang-sql` + `sqlCompletion.ts`), find/replace (`searchKeymap`), SQL format (`sql-formatter`), run shortcut, multi-result tabs.
- ❌ **Query cancellation / timeout** for long-running queries (no AbortController/worker-terminate; no elapsed indicator beyond final timing). High value.
- ❌ **Run-selection / run-statement-at-cursor** (today runs the whole tab).
- ❌ **Saved queries / snippets**; ✅ history is now **persisted** to localStorage (UX-13).
- ❌ **Command palette / keyboard-shortcut cheatsheet.**

**Result grid**
- ✅ Type-badge headers, sorting, pagination, per-result + per-table export, row context menu, copy-as-JSON/SQL.
- ❌ **In-grid filter/search** across a result set.
- ❌ **Freeze first column / column resize / reorder**; ❌ select-cell-range copy.
- ❌ **Column quick stats** (min/max/null %/distinct) and quick aggregations.
- ❌ **Type-aware cell viewers/editors** (JSON tree, date picker, boolean toggle, enum dropdown, array editor, blob hex) (UX-04).

**Schema & objects**
- ✅ Schema tree, ER diagram, DDL viewer, table preview, alter-table (add/drop column, types, FK/PK), per-table export, truncate/drop.
- ❌ **Create index / trigger / view / constraint UI** for Postgres/DuckDB (UX-11); ❌ CHECK constraints / column comments (all).
- ❌ **EXPLAIN / query-plan visualization** (there is prior research on this — likely planned).
- ❌ **Rename column / rename table** as first-class actions (only via the structure form / DB rename).

**Data movement & safety**
- ✅ CSV/JSON/Parquet/native-binary/SQL-dump import, XLSX/SQL/native export.
- ⚠️ **Import wizard**: no preview, type inference review, or column mapping (UX-4.8).
- ❌ **Undo** for destructive operations / committed edits (UX-10); ❌ type-name confirm for drops (UX-05).
- ❌ **Transaction awareness** (BEGIN/COMMIT/ROLLBACK state, "you're in a transaction" banner).
- ❌ **Generate INSERTs / mock data** helper (nice-to-have for a learning tool).

Priority order for this product (learning-focused): type-aware cell viewers (esp. JSON) → in-grid filter/search → query cancellation → persistent history + saved snippets → create-index/view UI → EXPLAIN visualization.

---

## 10. Mobile-compatibility strategy

**Goal:** make the playgrounds *usable* (read, run, view results, browse schema) on phones, and *comfortable* on tablets — without forking the desktop UI. The desktop is a 3-pane IDE (icon-sidebar + schema sidebar + editor/results split); the phone needs a single-pane, tab-switched app shell.

**Phase A — stop the overflow & make it touch-safe (small, high ROI)**
1. Add the viewport meta if missing and make the app root `width:100vw; overflow-x:hidden`; convert the fixed `270px` sidebar and the editor/results split to `min-width:0` flex children so nothing forces `scrollWidth > clientWidth` (fixes UX-23's overflow).
2. Introduce breakpoints: `≥1100px` = current 3-pane; `768–1099px` = collapsible sidebar (off-canvas) + stacked editor/results; `<768px` = single pane with a bottom tab bar.
3. Ensure all interactive targets are ≥44 px and that the row hover-only actions (View data / Add row) have a tap-equivalent (the context menu already works on long-press).

**Phase B — single-pane mobile shell (the real work)**
4. Replace the always-on 270 px sidebar with an **off-canvas drawer** toggled from a header "hamburger"/database icon; the existing icon-sidebar becomes the drawer's section switcher (Schema / Files).
5. Add a **bottom tab bar** to switch the main pane between **Editor**, **Results**, and **Schema** (and Settings/History as a "More" sheet). This replaces the desktop vertical split, which is unusable on a phone.
6. Make the **header** collapse: keep the playground switcher + Run; move Import/Export/History/ER/Info into an overflow "⋯" menu below ~768 px (today they wrap/overflow off-screen).
7. Make **dialogs/drawers full-screen sheets** on mobile (Add Table, Edit Structure, DDL viewer, settings). For the structure editor, switch the 13-column table to a **card-per-column** layout below ~900 px (fixes UX-24): each column = a small form card (name, type, flags as chips, FK as a sub-section), with drag handles preserved.

**Phase C — input & ergonomics**
8. Give the CodeMirror editor a mobile config: larger touch font, a compact accessory toolbar (Run, Format, undo/redo, `;`), and avoid features that fight the on-screen keyboard.
9. Make the result grid horizontally scrollable **within its pane** (not the page), enable momentum scroll, and consider a "card view" toggle for very wide rows on phones.
10. Verify pointer-vs-touch for the click/double-click disambiguation in `SchemaItem` (`SINGLE_CLICK_DELAY_MS`) and the tab DnD — long-press should open context menus, not start a drag, on touch.

**Phase D — verification**
11. Add Playwright mobile projects (e.g. Pixel 7 / iPhone 14) asserting **no horizontal overflow** (`scrollWidth ≤ clientWidth`), that the sidebar is off-canvas, and that Editor/Results/Schema are reachable via the bottom bar — at `/playground/{sqlite,postgres,duckdb}`.

A pragmatic first cut is **Phase A + items 4–6**: that alone turns "unusable" into "usable" on a phone with relatively contained CSS/layout work.

---

## 11. Corrections to the 2026-05-24 audit

Verified **fixed or inaccurate** this pass — do **not** spend effort re-implementing these:

| Old claim | Reality now |
|---|---|
| F-12 Escape doesn't close Add Table | **Fixed** — Escape closes on all three engines. |
| F-15 Header casing inconsistent ("Tables" vs "TABLES") | **Fixed** — uppercase everywhere. |
| F-24 DuckDB type chevron missing `aria-label` | **Fixed** — both PG & DuckDB expose `aria-label="Open type list"`. |
| DuckDB still shows an empty Triggers section | **Fixed** — section suppressed for DuckDB. |
| F-14 Import/export parity poor (PG lacks CSV/Parquet; DuckDB hand-writes `read_csv`) | **Resolved** — all three have CSV/JSON/Parquet import, native binary, SQL dump, XLSX, and per-table export submenus. |
| "No per-table export from the sidebar" | **Inaccurate** — per-table export submenu with row counts exists (`SchemaItem.tsx:445`). |
| "Postgres lacks pg_dump-style whole-DB SQL export" | **Inaccurate** — Export DB → SQL Dump + Excel Workbook. |
| F-06/F-07 "Errors auto-dismiss after ~3 s" | **Inaccurate** — the inline error persists until the next run. |
| "`getSqliteErrorHint` is SQLite-only; PG/DuckDB get raw text" | **Inaccurate** — it handles all three engines (just misnamed); PG hint verified live. |
| F-22 'Typing "NULL" stores the string "NULL"' | **Inverted** — `"NULL"` is coerced to SQL NULL; the real gap is you *can't* store the literal string. |
| "Postgres & DuckDB have no alter-in-place structure affordance" | **Inaccurate** — both have an editable View/Edit Structure drawer (native `ALTER`). |

Still valid from the old audit (re-confirmed here): self-filtering type list, single-line cell editor, silent CASCADE/RESTART IDENTITY, "Loading SQLite engine…" leak, 2.4 s toast timeout, in-memory history, non-responsive Add Table table, green subtitle, identity terminology drift, oversized loading hero.

---

## 12. Implementation phases

Grouped for a coding agent. Each item lists its `UX-ID`, the main file(s), and a one-line acceptance check.

### Phase 1 — Correctness & "don't mislead the user" — ✅ COMPLETED (2026-05-31)

All five items implemented and verified live with Playwright (**12/12 checks pass**, `tmp` suite). ESLint: 0 new errors; all three routes compile clean.

1. **UX-01 JSON display/edit — ✅ Done.** Root cause was in the **adapter**, not display: `toSqlValue` in `runtime/postgres.ts` used `String(value)`, turning JSON objects into `"[object Object]"` and arrays into comma-joined text *before* they reached the grid. Fixed by JSON-serializing arrays/plain objects there (mirroring DuckDB's existing `toSqlValue`, which already did this — so DuckDB was unaffected). *Verified:* a `jsonb` cell now shows `{"a":1,"b":[2,3]}` in grid + inline input + modal; editing to `{"a":99,"edited":true}` and committing round-trips (success toast + re-fetched JSON object; a `jsonb` column rejects invalid JSON, confirming it stored as real jsonb). Before/after: `03b-pg-jsonb-inline-input.png` → `fix-01-postgres-jsonb-grid.png`, `fix-01-postgres-jsonb-roundtrip.png`.
2. **UX-02 Type list — ✅ Done.** In `PgTypeSelector` and `DuckDbTypeSelector`, `visibleGroups` now shows **all** groups when the field is empty *or* already holds a known type (i.e. the user opened the list rather than typing a search fragment); it only filters on a non-matching partial. *Verified:* opening the list with `bigserial`/`BIGINT` prefilled now shows **29 / 28** types (was 1 / 2). `fix-02-postgres-typelist-allshown.png`.
3. **UX-03 Engine label — ✅ Done.** Added an `engineLabel` prop to `ResultView` (default `"SQLite"`), passed `"PostgreSQL"` / `"DuckDB"` / `"SQLite"` from the three playgrounds, and used it in the loading placeholder. *Verified:* switching DB on `/playground/postgres` now shows "Loading **PostgreSQL** engine…". `fix-03-postgres-loading-label.png`.
4. **UX-05 Destructive disclosure — ✅ Done (type-name guard deferred).** Added optional `dropDetail`/`truncateDetail` slots to the shared `SchemaActionDialogs` (rendered as a muted amber-accented note via new `.confirm-desc-note` CSS) and wired engine-specific copy: Postgres discloses `CASCADE` and `TRUNCATE … RESTART IDENTITY CASCADE`; DuckDB discloses "not cascaded" and `DELETE FROM`. SQLite's inline truncate dialog now notes it runs as `DELETE`. *Verified:* `fix-05-postgres-drop-dialog.png`, `fix-05-postgres-truncate-dialog.png`, `fix-05-duckdb-drop-dialog.png`, `fix-05-duckdb-truncate-dialog.png`. **Deferred:** the "type the table name to confirm" guard — for an in-memory learning tool where everything is restored on reload, a blocking type-to-confirm step adds friction with little safety upside. Flagged for a product decision before adding.
5. **UX-07 Array type label — ✅ Done.** Added common Postgres array OIDs (`1007 integer[]`, `1009 text[]`, `1016 bigint[]`, …) to `PG_TYPE_NAMES` so array columns no longer fall back to the misleading `text` label. *Verified:* the `integer[]` column header now reads `integer[]` (was `text`) and values render as `[10,20,30]`. `fix-01-postgres-jsonb-grid.png`.

**Files changed (Phase 1):** `app/_components/runtime/postgres.ts`, `app/_components/postgres/PostgresPlayground.tsx`, `app/_components/duckdb/DuckDbPlayground.tsx`, `app/_components/sql/components/ResultView.tsx`, `app/_components/sql/components/SchemaActionDialogs.tsx`, `app/_components/sql/SqlPlayground.tsx`, `app/_components/playground.css`.

### Phase 2 — Editing ergonomics & error attribution — ✅ COMPLETED (2026-05-31)

Shipped the contained, low-risk, high-value slice of Phase 2 and verified live with Playwright (**7/7 checks pass**; ESLint 0 new errors; all routes compile). The larger inline-editor and runtime-touching items are carried into **Phase 2b** below.

1. **UX-13 History persistence — ✅ Done.** `useQueryHistory(storageKey?)` now restores from localStorage via a lazy initializer (no SSR hydration mismatch) and writes a capped (200-entry) copy on change via the existing idle-deferred `persistAsync`; `clearHistory` writes `[]`. Threaded `storageKey("query_history")` from all three playgrounds. *Verified:* run a query → reload → the query is still in the History tab. `p2-sqlite-history-persisted.png`.
2. **UX-12 Toasts — ✅ Done.** Failure ("warn") toasts now use an 8 s per-toast timeout (info stays at the 2.4 s default) in all three `showToast` helpers (`useDatabaseActions.ts` + PG/DuckDB). `.toast-warn` already had the red stripe + Copy button. *Verified:* a failed import toast is still visible after 4 s (old timeout was 2.4 s) and has Copy. `p2-warn-toast.png`.
3. **UX-14 Error block — ✅ Partial.** Added an engine badge ("SQLite"/"PostgreSQL"/"DuckDB", reusing the Phase-1 `engineLabel`) and a "Copy error" button to the result error block, and renamed the (already multi-engine) `getSqliteErrorHint` → `getEngineErrorHint`. *Verified:* `p2-sqlite-error-block.png`. **Deferred:** editor line/column highlight of the failing token (lands with UX-08 in Phase 2b).
4. **UX-20 NULL — ✅ Partial.** Added an explicit "Set to NULL" item to the cell context menu (sets a pending `null` edit). *Verified:* `p2-postgres-set-null.png`, `p2-postgres-context-menu.png`. **Deferred:** an escape hatch for storing the literal string `"NULL"`.
5. **UX-04 (modal slice) — ✅ Done.** The "Edit cell in modal" editor is now JSON-aware: validates JSON-looking values on Apply (blocks malformed input with a clear message), adds a "Format JSON" pretty-printer, uses a larger monospace textarea, and shows the column name. *Verified:* invalid JSON is blocked with `Invalid JSON: …`; Format pretty-prints. `p2-postgres-modal-invalid-json.png`, `p2-postgres-modal-formatted.png`.

**Files changed (Phase 2):** `app/_components/sql/hooks/useQueryHistory.ts`, `app/_components/sql/hooks/useDatabaseActions.ts`, `app/_components/sql/components/ResultView.tsx`, `app/_components/sql/SqlPlayground.tsx`, `app/_components/postgres/PostgresPlayground.tsx`, `app/_components/duckdb/DuckDbPlayground.tsx`, `app/_components/sqlPlayground.css`.

### Phase 2b — remaining editing/attribution work (carried forward)

6. **UX-04 inline type-aware editors** — **✅ boolean toggle DONE (2026-05-31)**: boolean columns render as a tri-state checkbox (true/false/NULL) instead of `0`/`1`, with engine-correct commit (PG boolean param, DuckDB `TRUE`/`FALSE` literal, SQLite coerced to `0`/`1` — verified it stores `typeof=integer`, not text). Verified round-trip 6/6 on all engines. **✅ date/time pickers DONE (2026-05-31, 2nd pass):** `date`/`timestamp(tz)`/`time` columns open a native `<input type="date|datetime-local|time">` on double-click; `classifyCellEditor` (in the new pure `utils/cellEditing.ts`) maps each engine's `columnTypes` string, and `from/toDateEditorValue` convert without JS-`Date` timezone math, preserving the original value's separator/fraction/zone so the commit round-trips like the text editor (falls back to text for non-string temporals). 28 unit tests; live engine boot was not possible this pass (CDN denied — see top note). **Remaining:** enum dropdown, array editor (BYTEA/BLOB now handled under UX-21) — all driven by `set.columnTypes`; the modal already covers JSON.
7. **UX-06 Editable hand-typed selects — ✅ DONE (2026-05-31).** `bareTableSelectSource` (`utils/sqlAnalysis.ts`) detects a bare `SELECT * FROM <table>` (optional LIMIT/OFFSET; rejects WHERE/JOIN/ORDER/GROUP/aggregate/subquery/multi-statement — 16/16 unit cases). Each `runSqlForTab` auto-sets `sourceTable` only when the name is an actual **table** (not a view), so edits never fail on commit. Safe because `SELECT *` guarantees the PK is present and the unfiltered order matches the table; the PK-based update path (above) handles identification. *Verified live:* `SELECT * FROM users` is editable and commits/round-trips; `SELECT name …`, `SELECT * … WHERE …`, and views stay read-only.
8. **UX-08 Error attribution** — per-statement success/error badges, "statement N of M", and an editor line highlight of the failing token (pairs with the UX-14 line-highlight deferral). Touches the runtime/`useQueryRunner` multi-statement path.
9. **UX-10 Commit/undo** — per-row/column discard of pending edits, keyboard commit/discard, and a one-step post-commit undo.
10. **UX-22 read-only columns — ✅ DONE (2026-05-31).** Generated columns now carry a header lock marker, render non-editable inline, and reject the "Edit cell in modal" / "Set to NULL" paths with an informational toast. Implemented by extending `ColumnKeyHints` with a `readOnly` set (populated from `TableColumnInfo.generated` in each playground's `resultKeyHints`) and honouring it in `ResultView`. Works for Postgres + SQLite (both introspect generated columns); DuckDB's `duckdb_columns()` doesn't surface generation metadata yet, so its generated columns aren't marked (harmless — additive). *Verified live 5/5.*
11. **UX-21 BLOB/bytea viewer — ✅ Partial DONE (2026-05-31, 2nd pass).** Binary cells render read-only inline (a text/date editor would corrupt the bytes; this also closes a latent bug where the modal let you commit the placeholder text `BLOB (N bytes)`), and "Edit cell in modal" opens a read-only **hex + base64 viewer** (`cellEditing.ts` `formatBytesHex` / `bytesToBase64`, unit-tested). **Remaining:** upload-a-file-into-this-cell.
- **UX-20 literal-`"NULL"` — ✅ DONE (2026-05-31, 2nd pass).** `parseCellEditValue` stores typed `"NULL"` verbatim (only an empty field clears to NULL); the explicit "Set to NULL" item (prior pass) covers real NULLs; the stale duplicate in `SqlPlayground.tsx` was aligned. Unit-tested.
- **UX-A1 (a11y) — ✅ Partial.** The inline text **and** date/time `<input>`s now carry an `aria-label` (`Edit <column>`); the BLOB viewer textareas are labelled too.

### Phase 3 — Responsive & mobile (see §10) — ✅ CORE SHIPPED (2026-05-31)

The "pragmatic first cut" from §10 (Phase A + the single-pane shell) is done and verified live; the heavier per-form work is carried forward.

12. **UX-23 Phase A + mobile shell — ✅ Done.** Below 768 px the shell collapses to one full-width surface, switched from a **bottom tab bar** (Schema / Editor / Results) the shared `SqlPlaygroundShell` renders. Implementation notes: the schema rail becomes the full-screen "Schema" surface (not an off-canvas drawer — simpler and avoids a backdrop/z-index layer); the editor/results split becomes a single full-height pane per a `data-mobile-pane` attribute, scoped with `:not([class*="--"])` so the existing view-data / er-diagram / settings / query-history takeover modes are untouched; the drag-resizers are hidden; the header drops the wordmark and caps the workspace pill; and a delegated `click`/`dblclick` listener jumps to **Results** when you Run or open a table. **Zero changes to the three playground bodies.** *Accept (met):* `scrollWidth == clientWidth` at 390 px on all three, before and after results render. Files: `app/_components/sql/components/SqlPlaygroundShell.tsx`, `app/_components/sqlPlayground.css`. Also right-sized the loading hero on mobile (UX-18 slice).
13. **UX-24 / refinements — carried forward.** Still open: the **card-per-column structure editor** below ~900 px (the 13-column Add/Edit-Table table), an optional **off-canvas drawer** variant of the schema rail, full-screen dialog *sheets*, and a header **overflow menu** so the (currently `.desktop-only`, i.e. hidden-on-mobile) Import/Export/History/ER/Info actions are reachable on a phone.
14. **Playwright mobile coverage — ✅ Done.** `e2e/playground-mobile.spec.ts` (4 tests) asserts, for all three engines, no horizontal overflow + a working bottom tab bar (Schema/Editor/Results reachable) at 390 px, plus a desktop non-regression check (3-pane intact, no bottom bar) at 1280 px. Deliberately does **not** wait for the WASM engine to boot (it hides the boot overlay and exercises the shell/CSS), so it's fast and CDN-independent.

### Phase 4 — Feature gaps & polish

15. **UX-11 / UX-16** — create-index/trigger/view UI for PG/DuckDB (or port SQLite's tabbed form); CHECK/comment/table-constraint fields; "Show generated SQL" preview; default-value function picker.
16. **Missing IDE features (§9):** query cancellation + elapsed timer; in-grid filter/search; run-selection; saved snippets; column quick-stats; EXPLAIN visualization.
17. **UX-15 / UX-18 / UX-19 polish** — unify identity terminology + fix mid-word wrap; right-size the loading hero; mute the dialog subtitle color.
18. **UX-Q1/Q2/Q3 code quality** — deterministic tab ids (kill hydration mismatch); fix `<div>`-in-`<table>` nesting; nudge Settings gear off the dev-badge corner.

---

## Appendix — methodology & screenshot index

**Environment.** Repo at `/home/user/dataslope`, branch `claude/loving-wright-Irx7i`. `npm install` + `npm run dev` (Next.js 16, port 3000). Playwright Chromium, launched with `--ignore-certificate-errors` and `ignoreHTTPSErrors:true` to traverse the sandbox's TLS-intercepting proxy — this is what allowed **all three** WASM engines (SQLite `@sqlite.org/sqlite-wasm`, DuckDB `@duckdb/duckdb-wasm`, Postgres PGlite `@electric-sql/pglite`) to load from `cdn.jsdelivr.net`. Viewports: 1600×1000 (desktop), 820×1180 (tablet), 390×844 (mobile). Boot times observed: SQLite ~13 s, Postgres ~11 s, DuckDB ~3.5 s.

**What was driven live.** Boot of all three; Create-Table dialog + type combobox (filtered vs cleared); inline + modal cell editing of `jsonb`/`timestamptz`/`integer[]`/`bytea`/generated columns; pending-edit commit bar; single- and multi-statement errors (+ persistence); drop/truncate dialogs; trigger DDL viewer; View/Edit Structure (alter table); schema/database/workspace switching (+ the "Loading SQLite" leak); import & export menus for all three; query-history, ER-diagram, runtime-info, and settings tabs; mobile/tablet layouts.

**Selected screenshots** (`agent-outputs/assets-20260531-sql-playground-audit/`):

| File | Shows |
|---|---|
| `01-{sqlite,postgres,duckdb}-loaded.png` | Loaded state per engine |
| `00-sqlite-loading.png` | Oversized loading hero (UX-18) |
| `02-sqlite-add-table-dialog.png` | Add Table (Columns/Index/Trigger tabs, green subtitle) |
| `02b-postgres-typelist-prefilled.png` / `…-cleared.png` | Self-filtering type list: 1 vs 29 options (UX-02) |
| `03-pg-complex-types-result.png` | `[object Object]` JSON + `text`-labeled array + UTC ts (UX-01, UX-07, UX-09) |
| `03b-pg-jsonb-inline-input.png` | Inline editor literally contains `[object Object]` (UX-01) |
| `03b-pg-edit-cell-modal.png` | Modal editor also `[object Object]` |
| `03b-pg-pending-commit-bar.png` | "Update 1 cell…" commit affordance (UX-10) |
| `04-postgres-drop-dialog.png` / `…-truncate-dialog.png` | Dialogs hide CASCADE/RESTART IDENTITY (UX-05) |
| `04-postgres-error-single.png` / `…-error-multi.png` | Good single error; multi-statement loses partials (UX-08) |
| `04-postgres-trigger-ddl.png` | Read-only DDL viewer |
| `05-postgres-schema-dropdown.png` | Schema vs System Catalogs grouping (good) |
| `05-postgres-import.png` / `05b-*-import-menu.png` / `…-export-menu.png` | Import/export parity across engines |
| `05-postgres-er-diagram.png` | ER diagram tab |
| `05b-postgres-history.png` / `…-settings.png` | History & Settings tabs |
| `06-mobile-postgres-initial.png` / `06-mobile-postgres-add-table.png` | Mobile overflow + non-collapsing structure table (UX-23/24) |
| `07-pg-loading-sqlite-leak.png` | "Loading SQLite engine…" on the Postgres page (UX-03) |
| `08-pg-edit-structure.png` | Editable View/Edit Structure (alter table) |
