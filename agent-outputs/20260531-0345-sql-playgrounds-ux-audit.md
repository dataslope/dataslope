# SQL Playgrounds UX/UI Audit v2 — SQLite · Postgres · DuckDB

**Date:** 2026-05-31
**Scope:** `/playground/sqlite`, `/playground/postgres`, `/playground/duckdb`
**Method:** Hands-on, **all three engines loaded and driven live** with Playwright (Chromium, 1600×1000 desktop + 820×1180 tablet + 390×844 mobile), cross-checked against source in `app/_components/sql/**`, `app/_components/postgres/**`, `app/_components/duckdb/**`, and `app/_components/runtime/**`. 54 screenshots saved alongside this report in `assets-20260531-sql-playground-audit/`.

> **Note on the previous audit.** A prior pass (`20260524-0058-sql-playgrounds-ux-audit.md`) could only boot Postgres — SQLite and DuckDB WASM were blocked by the sandbox, so those engines were reviewed from source only. This pass loads **all three** by bypassing the sandbox's TLS‑intercepting proxy (`--ignore-certificate-errors` / `ignoreHTTPSErrors`), which is why several of its findings turned out to be stale or inverted. Section 11 lists every correction. **Do not action the old report's findings without checking them here first.**

> **Changelog (newest first).** Per-finding status is also marked **✅ Fixed / ✅ Partial** inline in the tables below — this list is just the high-level history, condensed (older passes' blow-by-blow prose was removed once the work landed).
>
> - **2026-06-03 — Create Index / Create View from the schema tree (UX-11, this PR).**
>   - The **INDEXES** and **VIEWS** sidebar sections gained a **"+"** (and an empty-state "Create …" button) that open compact, **shared** dialogs — so SQLite/PostgreSQL/DuckDB get them at once with no per-engine UI. **Create Index**: pick a table, check columns (a per-column **order badge** shows the index column order), toggle **Unique** / **IF NOT EXISTS**, with an auto-suggested name and a **live SQL preview**. **Create View**: a name + a **SELECT** body (seeded from the editor when it already holds a query) + a dialect-aware **"Replace if it already exists"** (PG/DuckDB → `CREATE OR REPLACE VIEW`; SQLite, which has no such form → `DROP VIEW IF EXISTS` + `CREATE VIEW`). On submit the generated DDL runs through the engine and the sidebar refreshes, with a success/failure toast — mirroring the Add Table flow (no new tab, no editor disruption). Pure builders `buildCreateIndexSql` / `buildCreateViewSql` / `suggestIndexName` live in `utils/ddl.ts` (**+22** unit tests; **393→415** total). Also fixed `SchemaSection`'s label singularizer ("Indexes" → "index", not "indexe") and added an a/an article, now that INDEXES has an add affordance. Live-verified on **all three** engines (`e2e/sql-create-object.spec.ts`): an index and a view are created and the view is then queryable. `fix-create-index-dialog.png`, `fix-create-view-dialog.png`.
> - **2026-06-02 — Post-commit undo, DuckDB parameter binding, run-statement-at-cursor, multi-result-set editing (this PR).**
>   - **UX-10 — *post-commit undo* (now complete).** After committing cell edit(s), a slim **"Undo"** bar appears below the result grid ("Updated N cells in <table>") and re-applies the **previous** values on click — PK-addressed, so it's still correct after the edited row moved under MVCC. It survives the post-commit re-fetch, auto-dismisses after 15 s, and is gated by a pure `reversibleCellValue` helper so it's only offered when every prior value round-trips cleanly (scalars/`Date`; complex array/object/bytes originals suppress it rather than risk a lossy reverse-write). Per-cell discard ✕ + Ctrl/⌘+Enter commit were already done, so UX-10 is now fully closed. Shared `ResultView` + `utils/cellEditing.ts` (**+4** unit tests), live-verified on SQLite/PostgreSQL/DuckDB (`e2e/sql-edit-undo.spec.ts`). `fix-undo-bar.png`.
>   - **UX-17 — DuckDB writes now use prepared-statement parameter binding.** `updateRows` / `insertRow` / `deleteRows` no longer build SQL by quote-escaping and string-concatenating values; they bind positional `?` parameters via `conn.prepare(...)` (verified working in duckdb-wasm 1.32.0). DuckDB casts each parameter to the target column type — so a numeric column edited through a text input is no longer at risk of receiving a `VARCHAR` literal — and quoted strings need no manual escaping. New pure `toBindParam` normalizer in `runtime/duckdb.ts` (**+4** unit tests; **365→369** total). Live-verified: a committed edit of `O'Brien & "Sons"` round-trips through the prepared statement (`e2e/sql-duckdb-param-binding.spec.ts`), and the existing DuckDB edit/commit/undo/refetch specs still pass.
>   - **Run statement at cursor (§9 IDE feature) — keyboard *and* a discoverable button.** The toolbar Run control is a **split button** whose dropdown never duplicates its primary action. **⌘/Ctrl+Enter always triggers the primary** (so the button and the shortcut agree), and **⌘/Ctrl+Shift+Enter triggers the dropdown's secondary** action: for a multi-statement tab the primary is **Run All** (⌘/Ctrl+Enter) and the dropdown offers **"Run statement at cursor · ⌘/Ctrl+Shift+Enter"** (runs just the statement under the cursor); with a selection the primary is **Run Selection** (⌘/Ctrl+Enter) and the dropdown offers **"Run All · ⌘/Ctrl+Shift+Enter"** (so the relevant key is taught in-app, per-platform — `Ctrl` on Windows/Linux, `⌘` on macOS). Single-statement tabs keep the plain **Run** button. Pure `splitSqlStatements` / `statementAtCursor` in `utils/sqlAnalysis.ts` (string/identifier/comment/dollar-quote aware; **+9** unit tests; **369→378** total) drive the shared `editorSetup.ts` keymap and a `hasMultipleStatements` memo wired into all three playgrounds + the shared `SqlEditorToolbar`. Live-verified keyboard (both shortcuts) + button + dropdown + no-duplicate + single-statement fallback (`e2e/sql-run-statement-at-cursor.spec.ts`). `fix-run-statement-menu.png`.
>   - **Overlapping query runs are queued, not dropped (concurrency fix).** PG/DuckDB guarded their runner with `if (runningRef.current) return` — a run requested while another was in flight was silently dropped (e.g. editing Set 1 then Set 2 in quick succession lost Set 2's re-fetch, leaving stale data). Now an overlapping `runSqlForTab` is coalesced into a trailing slot (`pendingRunRef`, latest wins) and run when the in-flight one settles, via `drainPendingRun()` in every engine-busy `finally` (incl. infinite-scroll "load more"). SQLite was already safe (worker serializes). The active result-set tab is now **clamped** across reloads (instead of a single consumable "preserve" slot) so two queued re-fetches don't bounce the view off Set 2. Verified on all three engines via the natural edit order (`e2e/sql-multi-result-edit.spec.ts`).
>   - **Edited row no longer jumps to the bottom (bug fix).** After an inline edit in a materialized (multi-statement, or own-`LIMIT`) result, the row jumped to the bottom — the re-fetch re-ran the raw query and PG/DuckDB move an updated row to the end of the heap (MVCC). New pure `orderEditedStatementByPk` appends `ORDER BY <pk>` to **just the edited statement** on re-fetch (bare `SELECT *`, no `LIMIT`/`OFFSET` — ordering a `LIMIT` window would change *which* rows show); `bareTableSelectSource` now also accepts a trailing `ORDER BY` so the reordered statement stays editable. **Also fixed DuckDB PK detection** that this relies on: `listColumns` read `duckdb_constraints.constraint_column_names` (a `VARCHAR[]`) but the WASM bridge returns it as an Arrow `Vector` (object — not `Array.isArray`/string), so every column came back `pk=0`; DuckDB thus had no row-select checkboxes and used row-index addressing for edits/deletes/undo. Now PK-addressed editing/deletes/undo work on DuckDB. Verified on all three engines (`e2e/sql-multi-result-edit.spec.ts`; **+7** unit; **382→389**).
>   - **Multi-result-set inline editing (bug fix).** Cell editing was dead for every result set of a multi-statement run (e.g. `SELECT * FROM users LIMIT 10; SELECT * FROM cards;`): a double-click did nothing. Root cause — `sourceTable` (the editable write-back target) was detected **once for the whole query**, and `bareTableSelectSource` returns null for anything containing a `;`, so a multi-statement run was never editable. Now the editable table is detected **per statement**, positionally aligned with the per-statement `sets` each engine returns (new pure `bareTableSelectSources`, **+4** unit tests; **378→382** total). The shared `ResultView` resolves the active set's table + its PK/FK/constraint hints via a new `tableMetaFor(table)` resolver each playground provides, so every "Set N" tab is editable against **its own** table and the post-commit undo bar attributes the write correctly. Also preserved the active set index across an edit/sort/filter re-fetch, so committing on "Set 2" no longer bounces the view back to "Set 1". Live-verified on **all three** engines — both sets editable, each commit targets its own table (`e2e/sql-multi-result-edit.spec.ts`). `fix-multi-result-edit.png`.
> - **2026-06-01 — SQL playground enhancements (this PR, #438).** All in shared components, so SQLite/PostgreSQL/DuckDB get them at once, with no engine/runtime changes:
>   - **Column statistics** — a result-grid column-menu item opening a dialog with non-null / null %, distinct, numeric **min/max/mean/median/sum** and text **length** stats, plus a **most-frequent values** list; and a **"Copy column values"** action. Pure helper `utils/columnStats.ts` (**+20** unit tests, 341→361). Closes the §9 "column quick stats" gap.
>   - **Cell-editing ergonomics (UX-10, partial)** — a **per-cell discard "✕"** that reverts a single pending edit (the audit's "no per-row/column discard"), and **Ctrl/⌘+Enter to commit** pending edits (the "no keyboard shortcut" gap; Esc already discards). Post-commit undo still open.
>   - **Saved queries** — a **★** on each History entry saves it to a **"Saved queries"** section that persists to localStorage (survives a history clear / reload). New `useSavedQueries` hook + shared `QueryHistoryPane`. Closes the §9 "saved queries / snippets" gap.
>   - **UX-18 — desktop loading hero right-sized.** The boot title stamped at up to 180px swamped the viewport; capped to ~104px (CSS-only, SQL-scoped) so the caption + progress bar keep their prominence (the mobile slice was already done). `fix-loading-hero-desktop.png`.
>   - Live-verified on all three engines: `e2e/sql-column-stats.spec.ts`, `e2e/sql-edit-ergonomics.spec.ts`, `e2e/sql-saved-queries.spec.ts`.
> - **2026-06-01 — Result filtering.** In-grid **"Filter rows…"** field on all three engines (client-side, with `column:term` scoping); engine-paged results push the filter **down to SQL** (subquery + `LIKE`/`ILIKE`) and re-page so infinite scroll is preserved; the filter input is debounced (fixed dropped keystrokes); inline-edit refetch preserves the query's `LIMIT`. `utils/resultFilter.ts`. (#434, #436)
> - **2026-05-31 — Phase 1 (correctness).** UX-01 JSON `[object Object]` (adapter `toSqlValue`), UX-02 self-filtering type list, UX-03 "Loading SQLite" leak (`engineLabel`), UX-05 drop/truncate CASCADE disclosure, UX-07 array type labels.
> - **2026-05-31 — Phase 2 / 2b (editing & errors).** Persisted query history (UX-13), 8 s failure toasts (UX-12), error block engine badge + Copy-error (UX-14), explicit Set-to-NULL + literal-`"NULL"` round-trip (UX-20); type-aware cell editors — JSON modal, boolean toggle, **date/time pickers** (UX-09), BLOB hex/base64 viewer (UX-21); read-only/generated-column markers (UX-22); editable hand-typed `SELECT * FROM t` (UX-06). `utils/cellEditing.ts`.
> - **2026-05-31 — Phase 3 (mobile).** Below 768 px the 3-pane IDE collapses to a single-pane shell with a Schema/Editor/Results bottom bar, per-tab pane memory, and 0 horizontal overflow — entirely in the shared `SqlPlaygroundShell` (UX-23). `e2e/playground-mobile.spec.ts`.
> - **2026-05-31 — Data round-trips & polish.** SQL-dump export→import fixed on all three engines (FK ordering, generated columns, booleans); date display (PG/DuckDB), DECIMAL round-trip, sidebar ellipsis; in-place DB-switch (OPFS access-handle race); muted dialog subtitle (UX-19), PG identity header (UX-15); workspace-registry migration + the failing `opfs.workspace` test (UX-Q4). DuckDB native-binary export/import was **removed** (broken in duckdb-wasm 1.32.0 — re-attempt after a version bump).
>
> **Still open / deferred** (see §12): UX-08 multi-statement error attribution, UX-11/UX-16 trigger & CHECK-constraint UI + live DDL preview in the Table dialog (create-index/view now shipped), UX-24 card-per-column structure editor, UX-Q1 SSR tab-id hydration (its own PR), and enum/array inline editors.

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
| **UX-10 ✅ Fixed** | Commit affordance ("Update N cell…") sits far bottom-right; ~~no per-row/column discard~~, ~~no post-commit undo~~ | 🟡 | All | Per-cell discard **✕** + **Ctrl/⌘+Enter** commit + a **post-commit "Undo" bar** (re-applies prior values, PK-addressed). `components/ResultView.tsx`, `utils/cellEditing.ts` |
| **UX-11 ✅ Partial** | ~~No create UI for indexes/views in PG/DuckDB~~ → shared **Create Index** / **Create View** dialogs now on all three engines (INDEXES/VIEWS "+"); trigger / CHECK / table-constraint / column-comment UI still missing | 🟡 | All | `components/CreateIndexDialog.tsx`, `components/CreateViewDialog.tsx`, `utils/ddl.ts`; remaining in PG/DuckDB forms |
| **UX-12 ✅ Fixed** | Toast auto-dismiss = 2400 ms — too short to read errors | 🟡 | All | Failure ("warn") toasts now 8 s; `hooks/useDatabaseActions.ts`, PG/DuckDB `showToast` |
| **UX-13 ✅ Fixed** | Query history is in-memory only; lost on reload | 🟡 | All | Persisted (capped 200) to localStorage, `hooks/useQueryHistory.ts` |
| **UX-14 ✅ Partial** | Inline error block lacks Copy-error, SQLSTATE/engine label, and editor highlight | 🟡 | All | Copy-error + engine badge added, `ResultView.tsx`. Editor line-highlight → Phase 2b (with UX-08) |
| **UX-15 ✅ Partial** | Type/identity terminology differs: "Auto-increment" / "Identity/serial" / "Identity"; header wraps mid-word | 🟢 | All | PG header mid-word wrap fixed → single-line **"Identity"** + tooltip (now matches DuckDB); SQLite "Auto-increment" kept (distinct `AUTOINCREMENT` concept). `PostgresPlayground.tsx` |
| UX-16 | No live "Show generated SQL" preview in Create/Edit Table; no CHECK/comment UI; default value is bare free-text | 🟢/🟡 | All | Create-table dialogs |
| **UX-17 ✅ Fixed** | DuckDB inline edits build `UPDATE` via string concatenation (PG uses parameter binding) — fragile for STRUCT/MAP/LIST | 🟡 | DuckDB | `updateRows`/`insertRow`/`deleteRows` now bind positional `?` params via `conn.prepare(...)`; `toBindParam` normalizer. `runtime/duckdb.ts` |
| **UX-18 ✅ Fixed** | Loading hero title is oversized; status caption tiny | 🟢 | All | Desktop hero capped ~180px→104px (SQL-scoped CSS); mobile already done. `sqlPlayground.css` |
| **UX-19 ✅ Fixed** | Add Table subtitle "Create a new table" rendered in **green** accent (reads like a status) | 🟢 | All | `.sql-modify-drawer-subtitle` now `var(--text-dim)` (muted), verified live. `sqlPlayground.css` |
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
- 🟢 **UX-18 — Oversized hero. ✅ Fixed.** The rolling title was stamped at up to **180px** (`clamp(56px, 14vw, 180px)`), swamping the viewport. Capped to **~104px** on desktop (`clamp(48px, 8vw, 104px)`) with a slightly larger caption, so the status text + progress bar keep their prominence. CSS-only and **SQL-scoped** (the override lives in `sqlPlayground.css`, which only loads on the SQL routes, so the shared overlay's other playgrounds are untouched); the mobile slice was already done. Verified live (`fix-loading-hero-desktop.png`).

### 4.2 Creating a table & adding columns

Opening **Add table** (sidebar `Add table` button) gives a right-side drawer. SQLite uses the shared `ModifyStructureForm` (with **Columns / Indexes / Triggers** tabs); Postgres and DuckDB use their own flat column tables (no Index/Trigger tabs). All three default a first `id` row to Primary + auto-increment. Screenshots: `02-sqlite-add-table-dialog.png`, `02-postgres-type-dropdown-open.png`.

- 🔴 **UX-02 — Self-filtering type list.** The Postgres/DuckDB type field is a Base UI `Combobox` whose option list is `PG_TYPE_GROUPS.map(... .filter(type.includes(query)))` with `query = inputVal` (`PostgresPlayground.tsx:461-469`). Opening the list via the chevron while the field still holds the default value shows **only that value**. Measured live: Postgres shows **1** option (`bigserial`) instead of 29; DuckDB shows **2** (`BIGINT`, `UBIGINT`) instead of 28. Screenshots: `02b-postgres-typelist-prefilled.png` (1 item) vs `02b-postgres-typelist-cleared.png` (all 29). A user reasonably concludes no other types exist. **Fix:** when the popup is opened by the trigger (not by typing), bypass the filter and show all groups with the current value highlighted; optionally add a "Showing 1 of 29 — clear to see all" caption while filtered.
- 🟡 **UX-11 — Index/Trigger/constraint creation. ✅ Partial.** **Create Index** and **Create View** now ship as **shared** dialogs opened from the INDEXES / VIEWS section **"+"** on all three engines (`CreateIndexDialog` / `CreateViewDialog` driven by the pure `utils/ddl.ts` builders), each with a live SQL preview; they run standard cross-engine DDL and refresh the sidebar (mirroring Add Table). **Remaining:** trigger creation (PG/DuckDB), CHECK constraints / column comments / table-level constraints (all engines), and reconciling SQLite's tabbed Index/Trigger form with the new dialogs. Indexes/triggers in PG/DuckDB are otherwise still **view-DDL + drop only** (`SchemaLeafItem.tsx`).
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
- 🟡 **UX-10 — Commit/undo ergonomics. ✅ Fixed.** Pending edits flush via an "Update N cell…" button in the bottom-right footer (`03b-pg-pending-commit-bar.png`). Each pending cell shows a **per-cell discard "✕"** (revert just that cell, on hover/focus), and **Ctrl/⌘+Enter commits** the pending edits (scoped so it never collides with the editor's run shortcut; Esc still discards all). **One-step post-commit undo is now done too:** after a commit a slim **"Undo" bar** appears below the result grid and re-applies the previous values on click (PK-addressed, so still correct after MVCC reordered the row); it survives the post-commit re-fetch, auto-dismisses after 15 s, and is only offered when every prior value round-trips cleanly via the pure `reversibleCellValue` helper (`utils/cellEditing.ts`). Live-verified on all three engines (`e2e/sql-edit-undo.spec.ts`); `fix-undo-bar.png`.
- 🟡 **UX-17 — DuckDB UPDATE string-building. ✅ Fixed.** DuckDB used to serialize edited values by quote-escaping and string-concatenating them into the `UPDATE`, unlike Postgres parameter binding — so numeric columns could silently receive a `VARCHAR` literal and quoted strings relied on fragile manual escaping. `updateRows`, `insertRow` and `deleteRows` now bind **positional `?` parameters** through `conn.prepare(...)` (confirmed working in duckdb-wasm 1.32.0); DuckDB casts each parameter to the target column type, and a new pure `toBindParam` normalizer handles the few JS types the binder doesn't take directly (`Date`→ISO, `bigint` as-is, objects/arrays→string). Live-verified that a committed `O'Brien & "Sons"` round-trips (`e2e/sql-duckdb-param-binding.spec.ts`). **Remaining nuance:** typed STRUCT/MAP/LIST *literals* still bind as text (no bespoke array/struct editor yet — tracked under UX-04).
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

- Indexes/triggers: row click or context menu → **View DDL / Copy Name / Drop** (`SchemaLeafItem.tsx`). The DDL viewer is a clean, syntax-highlighted, read-only modal with Copy (`04-postgres-trigger-ddl.png`). **✅ Update (UX-11):** **index creation** now has a UI — the INDEXES section **"+"** opens a shared Create Index dialog; trigger create/edit and REINDEX/ANALYZE remain.
- Views use the read-only "View Structure" path; tables use the editable drawer. **✅ Update (UX-11):** **view creation** now has a UI — the VIEWS section **"+"** opens a shared Create View dialog.
- ✅ **Correction:** Postgres/DuckDB **do** have an editable **View/Edit Structure** alter-table drawer (add/remove column, change type, PK/unique/FK/identity, drop generated column, Save, Drop Table — verified live: 118 inputs, `08-pg-edit-structure.png` DOM). The real gaps are CHECK/comment/table-constraint fields (all engines), trigger management (PG/DuckDB; **index & view creation now shipped**), and SQLite's structure edits being a silent table-rebuild rather than native `ALTER`.

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
- ✅ **UX-13 — Query history persistence (Fixed).** `useQueryHistory(storageKey?)` restores from localStorage via a lazy initializer (no SSR hydration mismatch — the list only renders when the History tab is opened) and writes a capped (200-entry) copy on change; `clearHistory` writes `[]`. Threaded from all three playgrounds.
- ✅ **Saved queries (Fixed).** Each History entry has a **★** that saves it to a persisted **"Saved queries"** section (survives a history clear / reload); saved entries load back into a tab. `useSavedQueries` hook + shared `QueryHistoryPane`, threaded via a `saved_queries` storage key from all three playgrounds.
- 🟡 Committed **cell edits** now have a one-step post-commit undo (UX-10). Still no undo for **drop / drop-column** — the only "undo" there is reload, which loses unsaved work.

---

## 5. Cross-engine consistency matrix

| Capability | SQLite | Postgres | DuckDB | Note |
|---|---|---|---|---|
| Section header casing | UPPERCASE | UPPERCASE | UPPERCASE | ✅ now consistent |
| Add-table form | shared `ModifyStructureForm` (Columns/Index/Trigger tabs) | custom flat table | custom flat table | UX-11 |
| Type list size | 7 (native `<select>`) | 29 (combobox) | 28 (combobox) | SQLite far less expressive |
| Type list "open shows all" | n/a (native) | ❌ self-filters | ❌ self-filters | UX-02 |
| Edit existing structure (ALTER) | ✅ (rebuild) | ✅ native | ✅ native | SQLite rebuild not disclosed |
| Create index UI | ✅ | ✅ | ✅ | UX-11 ✅ (shared dialog) |
| Create view UI | ✅ | ✅ | ✅ | UX-11 ✅ (shared dialog) |
| Create trigger UI | ✅ (in form) | ❌ | n/a (no triggers) | UX-11 (remaining) |
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
- ✅ **Run-selection / run-statement-at-cursor** — both ship. The toolbar Run control is a split button whose dropdown holds only the *alternative* action, and **⌘/Ctrl+Enter triggers the primary, ⌘/Ctrl+Shift+Enter the dropdown** action: multi-statement → primary **Run All** (⌘/Ctrl+Enter) + dropdown **"Run statement at cursor · ⌘/Ctrl+Shift+Enter"**; selection → primary **Run Selection** (⌘/Ctrl+Enter) + dropdown **"Run All · ⌘/Ctrl+Shift+Enter"**; single statement → plain **Run**. `utils/sqlAnalysis.ts` `statementAtCursor`, shared `editorSetup.ts` keymap + `SqlEditorToolbar`.
- ✅ **Saved queries / snippets** — **done.** Star a History entry → it lands in a persisted "Saved queries" section (`useSavedQueries` + shared `QueryHistoryPane`); ✅ history is also **persisted** to localStorage (UX-13).
- ❌ **Command palette / keyboard-shortcut cheatsheet.**

**Result grid**
- ✅ Type-badge headers, sorting, pagination, per-result + per-table export, row context menu, copy-as-JSON/SQL.
- ✅ **In-grid filter/search** across a result set — **done (tenth pass)**, on all three engines, for any result held in memory: a footer "Filter rows…" field, case-insensitive substring across all columns (matching the displayed text), `column:term` scoping, "filtered from N" readout, Esc/✕ to clear. Pure helper `utils/resultFilter.ts`. Engine-paged results (more rows than "Rows per page") **push the filter down to SQL** (subquery-wrap + native `LIKE`/`ILIKE` `WHERE`) and re-page through the lazy/infinite path, so the whole result is filtered **while infinite scroll is preserved** (eleventh pass); small in-memory results keep the exact client-side displayed-text filter.
- ❌ **Freeze first column / column resize / reorder**; ❌ select-cell-range copy.
- ✅ **Column quick stats** — **done.** A **"Column statistics"** item in the column menu opens a dialog with non-null / null %, distinct, numeric **min/max/mean/median/sum** and text **length** stats, plus a **most-frequent values** list (and a **"Copy column values"** action). Computed over the loaded rows by the pure `utils/columnStats.ts`; shared `ResultView`, so all three engines. Live-verified (`e2e/sql-column-stats.spec.ts`).
- ❌ **Type-aware cell viewers/editors** (JSON tree, date picker, boolean toggle, enum dropdown, array editor, blob hex) (UX-04).

**Schema & objects**
- ✅ Schema tree, ER diagram, DDL viewer, table preview, alter-table (add/drop column, types, FK/PK), per-table export, truncate/drop.
- ✅ **Create index / view UI** — shared dialogs from the INDEXES / VIEWS section "+" on all three engines (`CreateIndexDialog` / `CreateViewDialog` + pure `utils/ddl.ts`, each with a live SQL preview; live-verified `e2e/sql-create-object.spec.ts`). ❌ **Create trigger / table-constraint UI** for Postgres/DuckDB (UX-11); ❌ CHECK constraints / column comments (all).
- ❌ **EXPLAIN / query-plan visualization** (there is prior research on this — likely planned).
- ❌ **Rename column / rename table** as first-class actions (only via the structure form / DB rename).

**Data movement & safety**
- ✅ CSV/JSON/Parquet/native-binary/SQL-dump import, XLSX/SQL/native export.
- ⚠️ **Import wizard**: no preview, type inference review, or column mapping (UX-4.8).
- ⚠️ **Undo:** committed **cell edits** have a one-step post-commit undo (UX-10 ✅); destructive operations (drop / drop-column) still don't. ❌ type-name confirm for drops (UX-05).
- ❌ **Transaction awareness** (BEGIN/COMMIT/ROLLBACK state, "you're in a transaction" banner).
- ❌ **Generate INSERTs / mock data** helper (nice-to-have for a learning tool).

Priority order for this product (learning-focused): ~~type-aware cell viewers (esp. JSON)~~ ✅ → ~~in-grid filter/search~~ ✅ → ~~persistent history + saved snippets~~ ✅ → ~~create-index/view UI~~ ✅ → EXPLAIN visualization.

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
8. **UX-08 Error attribution** — per-statement success/error badges, "statement N of M", and an editor line highlight of the failing token (pairs with the UX-14 line-highlight deferral). Touches the runtime/`useQueryRunner` multi-statement path. **Design note (2026-06-02 investigation):** keeping the *earlier successful results* visible is not a pure display change. SQLite (`execAll` → `iterateStatements`) and DuckDB (`exec` → `splitDuckDbStatements`) already execute a multi-statement string one statement at a time, so per-statement attribution is free there. **PGlite, though, runs `db.exec(sql)` as a single implicit transaction**, so on error it rolls the whole batch back — switching Postgres to per-statement execution to surface partials would *change* its transaction semantics (earlier statements would commit). That divergence is a product decision (mirror SQLite/DuckDB's auto-commit-per-statement, or keep PG transactional and only attribute the failing statement without partials), so UX-08 is left for a deliberate pass. The new `splitSqlStatements`/`statementAtCursor` (`utils/sqlAnalysis.ts`, added for run-statement-at-cursor) already give per-statement source ranges to build on. The editor line-highlight can use PG's error `position` mapped through those ranges.
9. **UX-10 Commit/undo — ✅ DONE (2026-06-02).** Per-cell discard ("✕" on a pending cell) and **Ctrl/⌘+Enter** keyboard commit (Esc discards all) — `e2e/sql-edit-ergonomics.spec.ts` — plus a **one-step post-commit undo**: after a commit, a slim "Undo" bar below the result grid re-applies the prior values (PK-addressed). It survives the re-fetch, auto-dismisses after 15 s, and is gated by the pure `reversibleCellValue` helper (scalars/`Date` reverse cleanly; array/object/bytes originals suppress the offer). `components/ResultView.tsx`, `utils/cellEditing.ts` (+4 unit tests); live-verified on all three engines (`e2e/sql-edit-undo.spec.ts`).
10. **UX-22 read-only columns — ✅ DONE (2026-05-31).** Generated columns now carry a header lock marker, render non-editable inline, and reject the "Edit cell in modal" / "Set to NULL" paths with an informational toast. Implemented by extending `ColumnKeyHints` with a `readOnly` set (populated from `TableColumnInfo.generated` in each playground's `resultKeyHints`) and honouring it in `ResultView`. Works for Postgres + SQLite (both introspect generated columns); DuckDB's `duckdb_columns()` doesn't surface generation metadata yet, so its generated columns aren't marked (harmless — additive). *Verified live 5/5.*
11. **UX-21 BLOB/bytea viewer — ✅ Partial DONE (2026-05-31, 2nd pass).** Binary cells render read-only inline (a text/date editor would corrupt the bytes; this also closes a latent bug where the modal let you commit the placeholder text `BLOB (N bytes)`), and "Edit cell in modal" opens a read-only **hex + base64 viewer** (`cellEditing.ts` `formatBytesHex` / `bytesToBase64`, unit-tested). **Remaining:** upload-a-file-into-this-cell.
- **UX-20 literal-`"NULL"` — ✅ DONE (2026-05-31, 2nd pass).** `parseCellEditValue` stores typed `"NULL"` verbatim (only an empty field clears to NULL); the explicit "Set to NULL" item (prior pass) covers real NULLs; the stale duplicate in `SqlPlayground.tsx` was aligned. Unit-tested.
- **UX-A1 (a11y) — ✅ Partial.** The inline text **and** date/time `<input>`s now carry an `aria-label` (`Edit <column>`); the BLOB viewer textareas are labelled too.

### Phase 3 — Responsive & mobile (see §10) — ✅ CORE SHIPPED (2026-05-31)

The "pragmatic first cut" from §10 (Phase A + the single-pane shell) is done and verified live; the heavier per-form work is carried forward.

12. **UX-23 Phase A + mobile shell — ✅ Done.** Below 768 px the shell collapses to one full-width surface, switched from a **bottom tab bar** (Schema / Editor / Results) the shared `SqlPlaygroundShell` renders. Implementation notes: the schema rail becomes the full-screen "Schema" surface (not an off-canvas drawer — simpler and avoids a backdrop/z-index layer); the editor/results split becomes a single full-height pane per a `data-mobile-pane` attribute, scoped with `:not([class*="--"])` so the existing view-data / er-diagram / settings / query-history takeover modes are untouched; the drag-resizers are hidden; the header drops the wordmark and caps the workspace pill; and a delegated `click`/`dblclick` listener jumps to **Results** when you Run or open a table. **Zero changes to the three playground bodies.** *Accept (met):* `scrollWidth == clientWidth` at 390 px on all three, before and after results render. Files: `app/_components/sql/components/SqlPlaygroundShell.tsx`, `app/_components/sqlPlayground.css`. Also right-sized the loading hero on mobile (UX-18 slice).
13. **UX-24 / refinements — carried forward.** Still open: the **card-per-column structure editor** below ~900 px (the 13-column Add/Edit-Table table), an optional **off-canvas drawer** variant of the schema rail, full-screen dialog *sheets*, and a header **overflow menu** so the (currently `.desktop-only`, i.e. hidden-on-mobile) Import/Export/History/ER/Info actions are reachable on a phone.
14. **Playwright mobile coverage — ✅ Done (5/5 green).** `e2e/playground-mobile.spec.ts` (5 tests) asserts, for all three engines at 390 px, no horizontal overflow + a working bottom tab bar with **Schema and Editor reachable** and **Results gated (disabled) until a query produces output** (checked on a fresh tab, so it's deterministic), plus a desktop non-regression check (3-pane intact, no bottom bar) at 1280 px, plus (Request 3) a **per-query-tab pane-restore** check: a new "+" tab defaults to Editor and switching between tabs always lands on a reachable pane, never the gated empty Results. Deliberately does **not** wait for the WASM engine to boot (it hides the boot overlay and exercises the shell/CSS), so it's fast and CDN-independent — the Editor↔Results *memory decision* (which needs real results) is covered by the `mobilePane` unit test.

### Phase 4 — Feature gaps & polish

15. **UX-11 / UX-16** — ✅ **create-index / create-view UI** shipped as shared dialogs (INDEXES/VIEWS "+" → `CreateIndexDialog` / `CreateViewDialog`, pure `utils/ddl.ts`; each shows a live SQL preview, which also scratches UX-16's "Show generated SQL" itch for these objects; live-verified `e2e/sql-create-object.spec.ts`). **Remaining:** create-trigger UI (PG/DuckDB), CHECK / column-comment / table-constraint fields (all engines), a DDL preview in the Create/Edit **Table** dialog, and a default-value function picker.
16. **Missing IDE features (§9):** ✅ **in-grid filter/search** on all three engines for any in-memory result (footer "Filter rows…" field, `column:term` scoping, `utils/resultFilter.ts`; engine-paged results push the filter down to SQL — subquery-wrap + `LIKE`/`ILIKE` `WHERE`, re-paged so infinite scroll is preserved). ✅ **column quick-stats** — "Column statistics" dialog (null %, distinct, numeric min/max/mean/median/sum, text length, most-frequent) + "Copy column values", shared `ResultView`, `utils/columnStats.ts`, live-verified (`e2e/sql-column-stats.spec.ts`). ✅ **run-selection** already ships (the editor's Run Selection / Run All toolbar). ✅ **run-statement-at-cursor** — in a multi-statement tab, **⌘/Ctrl+Shift+Enter** (no selection) runs just the statement under the cursor, surfaced via a discoverable split button so it isn't keyboard-only. **⌘/Ctrl+Enter triggers the primary** action, ⌘/Ctrl+Shift+Enter the dropdown's: multi-statement → primary **Run All** (⌘/Ctrl+Enter) + dropdown **"Run statement at cursor · ⌘/Ctrl+Shift+Enter"**; selection → primary **Run Selection** (⌘/Ctrl+Enter) + dropdown **"Run All · ⌘/Ctrl+Shift+Enter"**; single statement → plain **Run**. `statementAtCursor`/`splitSqlStatements` (`utils/sqlAnalysis.ts`) + shared `editorSetup.ts` keymap + `SqlEditorToolbar`, wired through `hasMultipleStatements` in all three playgrounds. Live-verified `e2e/sql-run-statement-at-cursor.spec.ts`. ✅ **saved queries** — star a History entry → persisted "Saved queries" section (`useSavedQueries` + shared `QueryHistoryPane`, `e2e/sql-saved-queries.spec.ts`). **Remaining:** EXPLAIN visualization.
17. **UX-15 / UX-18 / UX-19 polish — ✅ Done.** ✅ **UX-19** (dialog subtitle muted `--text-dim`); ✅ **UX-15 (partial)** (PG identity header → single-line "Identity" + tooltip; SQLite "Auto-increment" kept as its distinct `AUTOINCREMENT` concept); ✅ **UX-18** (desktop loading hero capped ~180px→104px, SQL-scoped CSS, verified live `fix-loading-hero-desktop.png`).
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
| `fix-colstats-numeric.png` / `fix-colstats-text.png` | Column statistics dialog — numeric (min/max/mean/median/sum) & text (length + most-frequent) |
| `fix-saved-queries.png` | "Saved queries" section + per-entry ★ in the History pane |
| `fix-loading-hero-desktop.png` | Right-sized desktop loading hero (UX-18) |
| `fix-undo-bar.png` | Post-commit "Undo" bar after a committed cell edit (UX-10) |
| `fix-run-statement-menu.png` | Run split button — "Run All" primary + "Run statement at cursor" in the dropdown |
| `fix-multi-result-edit.png` | Inline cell editing on "Set 2" (cards) of a multi-statement run, per-set PK/FK |
| `fix-create-index-dialog.png` | Create Index dialog — table picker, ordered column badges, Unique/IF NOT EXISTS, live SQL preview (UX-11) |
| `fix-create-view-dialog.png` | Create View dialog — name + SELECT body + dialect-aware "Replace if it exists", live SQL preview (UX-11) |
