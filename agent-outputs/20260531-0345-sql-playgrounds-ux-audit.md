# SQL Playgrounds UX/UI Audit v2 — SQLite · Postgres · DuckDB

**Date:** 2026-05-31
**Scope:** `/playground/sqlite`, `/playground/postgres`, `/playground/duckdb`
**Method:** Hands-on, **all three engines loaded and driven live** with Playwright (Chromium, 1600×1000 desktop + 820×1180 tablet + 390×844 mobile), cross-checked against source in `app/_components/sql/**`, `app/_components/postgres/**`, `app/_components/duckdb/**`, and `app/_components/runtime/**`. 54 screenshots saved alongside this report in `assets-20260531-sql-playground-audit/`.

> **Note on the previous audit.** A prior pass (`20260524-0058-sql-playgrounds-ux-audit.md`) could only boot Postgres — SQLite and DuckDB WASM were blocked by the sandbox, so those engines were reviewed from source only. This pass loads **all three** by bypassing the sandbox's TLS‑intercepting proxy (`--ignore-certificate-errors` / `ignoreHTTPSErrors`), which is why several of its findings turned out to be stale or inverted. Section 11 lists every correction. **Do not action the old report's findings without checking them here first.**

> **✅ Update — Phases 1 & 2 implemented (2026-05-31).**
> - **Phase 1** (UX-01, UX-02, UX-03, UX-05, UX-07) — fixed & verified live (**12/12 checks**). See [§12 Phase 1](#12-implementation-phases).
> - **Phase 2** (UX-12, UX-13, UX-14, UX-20, and the modal slice of UX-04) — fixed & verified live (**7/7 checks**). The larger UX-04 work (bespoke inline editors), UX-06, UX-08, and UX-22 are carried into **Phase 2b**. See [§12 Phase 2](#12-implementation-phases).
>
> Fixed findings are marked **✅ Fixed** (or **✅ Partial**) in the tables below.

> **✅ Follow-up fixes (from hands-on testing).** Three additional issues found while testing, fixed & verified live (**6/6 checks**):
> 1. **CodeMirror active-line highlight removed on the GitHub Light/Dark themes** (the palette themes already suppressed it; the `@uiw` GitHub themes didn't). `cmExtensions.ts`.
> 2. **Edited row no longer jumps to the bottom of the grid, and stays correct across multiple edits.** Postgres & DuckDB move an updated row to the end of the heap (MVCC). The post-commit re-fetch is ordered by the table's primary key when no user sort is applied, **and** the `UPDATE` now identifies the target row by its primary-key value(s) instead of a display-order-dependent ctid/rowid offset (PK-less tables keep the offset fallback). This matches the existing PK-based delete path and is robust to rows moving position between edits. `ResultView.tsx` (`commitEdits`) + `runtime/{postgres,duckdb,sqlite-core}.ts` (`updateRows`).
> 3. **GitHub Light is now the default editor/playground theme** (was Lucario). `playgroundShared.tsx`, `useSettingsStore.ts`, `SqlPlayground.tsx`.

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

5. **Not usable on mobile.** At 390 px the desktop layout overflows horizontally; the fixed 270 px sidebar eats 70 % of the screen and the editor/results are crushed into a thin strip. There is no responsive mode at all. (§7, §10.)

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
| **UX-04 ✅ Partial** | Inline edit = single-line `<input type=text>` for every type; modal = plain `<textarea>`; neither is type-aware | 🔴 | All | Modal now JSON-aware (validate + Format + monospace + column shown), `ResultView.tsx`. Bespoke **inline** editors (date/enum/boolean/blob/array) → Phase 2b |
| **UX-05 ✅ Fixed** | Drop/Truncate hide CASCADE / RESTART IDENTITY; DuckDB "truncate"=`DELETE` | 🔴 | PG, DuckDB | `components/SchemaActionDialogs.tsx` (`dropDetail`/`truncateDetail`); disclosures in PG/DuckDB playgrounds (type-name guard deferred — see §12) |
| **UX-06 ✅ Fixed** | Inline editing only works on **sidebar-opened** table previews, not hand-typed `SELECT * FROM t` | 🟡 | All | A bare `SELECT * FROM <table>` (optional LIMIT/OFFSET, single real table — not a view) is now auto-flagged editable via `bareTableSelectSource` in `utils/sqlAnalysis.ts`, wired into each `runSqlForTab` |
| **UX-07 ✅ Fixed** | Array columns (`integer[]`, `text[]`) shown with type **`text`** in the result header | 🟡 | PG, DuckDB | `runtime/postgres.ts` `PG_TYPE_NAMES` (array OIDs added) |
| UX-08 | Multi-statement error discards earlier successful results; no "statement N of M", no line highlight | 🟡 | All | `hooks/useQueryRunner.ts:115-160`; `components/ResultView.tsx:908-913` |
| UX-09 | `timestamptz`/date/time edited as raw UTC ISO text; no picker, no timezone hint | 🟡 | All | `components/ResultView.tsx:1803-1830` |
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
| **UX-20 ✅ Partial** | Cannot enter the literal string `"NULL"`; "NULL" is coerced to SQL NULL; no explicit Set-NULL affordance | 🟢 | All | Explicit "Set to NULL" context-menu item added, `ResultView.tsx`. Literal-`"NULL"` escape hatch → Phase 2b |
| UX-21 | BLOB shown as `BLOB (N bytes)`; modal editor mangles binary; no hex/base64/upload | 🟡 | All | `utils/cellUtils.ts:21`; `components/ResultView.tsx:2200` |
| UX-22 | Generated/view/read-only columns not visually distinguished; edits fail only on commit | 🟡 ♿ | All | `components/ResultView.tsx:1833-1848` |
| UX-23 | Not mobile-responsive: horizontal overflow at 390 px, 270 px sidebar dominates | 🔴 (mobile) | All | layout CSS (see §10) |
| UX-24 | Add Table 13-column table never collapses; horizontal scroll hides most fields on narrow widths | 🟡 ♿ | All | `sqlPlayground.css` (table wrapper) |

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
- 🔴 **UX-04 — No type-aware editors.** Every type shares one single-line text input (`ResultView.tsx:1803-1830`); the only "advanced" path is an 8-row plain `<textarea>` (`:2200`). No JSON editor/validator, date picker, boolean toggle, enum dropdown, array editor, or blob viewer.
- 🟡 **UX-09 — Date/time editing is opaque.** `timestamptz` is shown as `2026-05-31T03:35:51.558Z` (raw UTC ISO). No picker; no indication the stored value will be normalized to UTC.
- 🟡 **UX-21 — BLOB/bytea.** Shown as `BLOB (4 bytes)`; the modal textarea will corrupt non-UTF-8 bytes on save; there is no hex/base64 view and no "upload file into this cell".
- 🟡 **UX-06 — Editability is invisible & inconsistent.** A result is editable only when `sourceTable` is set, which happens **only** when a table is opened from the sidebar (`useQueryRunner.ts:93,143`). A hand-typed `SELECT * FROM users` is read-only — double-click does nothing and the row context menu drops "Edit cell in modal" — with no tooltip explaining why. Either detect single-table selects and enable editing, or show "Open this table from the sidebar to edit cells."
- 🟡 **UX-10 — Commit/undo ergonomics.** Pending edits flush via an "Update N cell…" button in the bottom-right footer with "N cell edited" bottom-left (`03b-pg-pending-commit-bar.png`). There is no per-row/column discard, no keyboard shortcut, and no post-commit undo (the delete dialog even warns the action "cannot be reversed within this session").
- 🟡 **UX-17 — DuckDB UPDATE string-building.** DuckDB serializes edited values by quote-escaping and string-concatenating into the `UPDATE` (`runtime/duckdb.ts:827`), unlike Postgres parameter binding. STRUCT/MAP/LIST literals typed by a user will mis-parse, and numeric columns can silently receive `VARCHAR`.
- 🟢 **UX-20 — NULL round-trip.** `parseCellEditValue` (`cellUtils.ts:39-44`) maps both `""` and the text `"NULL"` to SQL NULL — so you **cannot** store the literal string `"NULL"`, and there is no explicit "Set to NULL" menu item (only typing). Add an explicit Set-NULL action and an escape hatch for the literal.
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
| DuckDB | SQL dump, `.duckdb`, CSV, JSON, Parquet | `.duckdb`, SQL dump, XLSX |

Plus per-table export submenus (CSV/JSON/SQL/Parquet/XLSX) with live row counts (`SchemaItem.tsx:445-528`).

- 🟢 Remaining gaps: drag-and-drop import validates by extension only (no preview / row-count / column mapping); failed imports surface as warn-toasts with raw messages (no "first N parse errors" panel); no file-size guard before exporting very large result sets to XLSX.

### 4.9 Notifications, history, undo

- 🟡 **UX-12 — Toast timeout 2400 ms** on all three (`SqlPlayground.tsx:700`, `PostgresPlayground.tsx:5096`, `DuckDbPlayground.tsx:5694`). Bump errors/warnings to ≥ 8 s. Toasts have two kinds (`info`, `warn`); warn carries a Copy button (`ToastList.tsx`). Consider a distinct `error` style — hard failures currently use the amber `warn` style.
- 🟡 **UX-13 — Query history is in-memory** (`useQueryHistory.ts:20`, plain `useState`, capped at 1000). The history tab itself is nice (timing, relative time, "Open in query tab", Clear — `05b-postgres-history.png`), but a reload wipes it. Persist (capped) to localStorage; consider "Saved queries".
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
| Inline edit type-awareness | ❌ | ❌ | ❌ | UX-04 |
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
| Query-history persistence | in-memory | in-memory | in-memory | UX-13 |
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
| 820×1180 tablet | none (scrollW 820) | 270 px | 🟡 usable, cramped |
| 390×844 mobile | **yes** (scrollW 494 > 390) | 270 px (70 % of screen) | 🔴 unusable |

- 🔴 **UX-23** — At 390 px the desktop layout is rendered as-is: header actions and query tabs overflow off-screen, the sidebar dominates, and the editor/results are a thin right strip needing horizontal scroll (`06-mobile-postgres-initial.png`). No hamburger, no collapsible sidebar, no panel switching.
- 🟡 **UX-24** — The Create/Edit Table 13-column table never collapses; on mobile only Name/Type/Not-null are visible and the rest require horizontal scroll inside the drawer (`06-mobile-postgres-add-table.png`). Needs a card-per-column layout below ~900 px.

See §10 for a concrete mobile strategy.

---

## 8. Code-quality / correctness issues observed

These showed up in the console / dev overlay during normal use (the bottom-left "N Issues" badge). They're not user-facing in production but are worth fixing.

- 🟡 **UX-Q1 — SSR hydration mismatch.** React logs a hydration mismatch on the tab bar because tab ids are generated with time/random values (`data-tab-id`, `aria-describedby="DndDescribedBy-*"` differ server vs client). Generate ids deterministically or render tabs client-only.
- 🟡 **UX-Q2 — Invalid HTML nesting.** Opening Add Table logs `<table> cannot contain a nested <div>` (validateDOMNesting) — the structure editor puts non-`<td>`/`<tr>` elements inside the table. Use a CSS grid / `display:contents`, or move the offending wrappers out of the `<table>`.
- 🟢 **UX-Q3 — Dev overlay overlaps Settings gear.** The Next.js dev badge sits over the bottom-left Settings gear (dev-only); harmless in prod but consider moving the gear up a few px so it never collides.

---

## 9. Missing features for a basic SQL IDE

Things a "basic" SQL IDE is generally expected to have. ✅ = already present (don't rebuild), ❌ = missing, ⚠️ = partial.

**Editing & running**
- ✅ Syntax highlighting, autocomplete (`@codemirror/lang-sql` + `sqlCompletion.ts`), find/replace (`searchKeymap`), SQL format (`sql-formatter`), run shortcut, multi-result tabs.
- ❌ **Query cancellation / timeout** for long-running queries (no AbortController/worker-terminate; no elapsed indicator beyond final timing). High value.
- ❌ **Run-selection / run-statement-at-cursor** (today runs the whole tab).
- ❌ **Saved queries / snippets**; ⚠️ history exists but is **not persisted** (UX-13).
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

6. **UX-04 inline type-aware editors** — boolean toggle, date/time picker (UX-09), enum dropdown, array editor, and a BYTEA/BLOB hex viewer + upload (UX-21), driven by `set.columnTypes`. Larger/new-component work; the modal already covers JSON.
7. **UX-06 Editable hand-typed selects — ✅ DONE (2026-05-31).** `bareTableSelectSource` (`utils/sqlAnalysis.ts`) detects a bare `SELECT * FROM <table>` (optional LIMIT/OFFSET; rejects WHERE/JOIN/ORDER/GROUP/aggregate/subquery/multi-statement — 16/16 unit cases). Each `runSqlForTab` auto-sets `sourceTable` only when the name is an actual **table** (not a view), so edits never fail on commit. Safe because `SELECT *` guarantees the PK is present and the unfiltered order matches the table; the PK-based update path (above) handles identification. *Verified live:* `SELECT * FROM users` is editable and commits/round-trips; `SELECT name …`, `SELECT * … WHERE …`, and views stay read-only.
8. **UX-08 Error attribution** — per-statement success/error badges, "statement N of M", and an editor line highlight of the failing token (pairs with the UX-14 line-highlight deferral). Touches the runtime/`useQueryRunner` multi-statement path.
9. **UX-10 Commit/undo** — per-row/column discard of pending edits, keyboard commit/discard, and a one-step post-commit undo.
10. **UX-22 read-only columns** — a lock/italic marker on generated/view/join columns, blocking the edit gracefully (needs generated-column metadata threaded into `ResultView`).

### Phase 3 — Responsive & mobile (see §10)

12. **UX-23 Phase A** layout/overflow fixes + breakpoints. *Accept:* `scrollWidth ≤ clientWidth` at 390 px on all three playgrounds.
13. **UX-24 / mobile shell** — off-canvas sidebar, bottom tab bar, header overflow menu, full-screen sheets, card-per-column structure editor below ~900 px.
14. Add Playwright mobile projects asserting no overflow + reachable panes.

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
