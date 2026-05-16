# Stage-3 / Stage-4 SQL Playground Refactor — Completion Report

**Date:** 2026-05-16
**Branch:** `copilot/implement-remaining-refactor-tasks`
**Predecessor:** `agent-outputs/2026-05-16-stage3-refactor-handover.md`

## Scope

The handover report listed four remaining tasks for the multi-stage
SQL-playground consolidation:

1. Extract `useSqlTabManagement` — shared tab CRUD + DnD across
   Postgres + DuckDB.
2. Extract `useSchemaTree` — owns multi-schema state and the
   `refreshSchemas` / `handleSchemaChange` orchestration callbacks.
3. Extract reusable structure-drawer pieces (`AddRowDialog`,
   `AddTableDialog`) where the dialects' divergence is small enough to
   merit a shared component.
4. Build `SqlPlaygroundShell` — a single outer chrome that wraps all
   three dialects (SQLite + Postgres + DuckDB) and lets each one plug
   in its dialect-specific surface via slots.

All four were completed in this session.

## What landed

### 1. `useSqlTabManagement` (Task 1)

* New file: `app/_components/sql/hooks/useSqlTabManagement.ts` (318 LOC).
* Centralises the seven previously-duplicated tab functions: `addTab`,
  `openTabAndRun`, `closeTab`, `handleTabDragStart`,
  `handleTabDragEnd`, `handleTabDragCancel`, `resetTabsForCurrentDb`,
  plus the `openErDiagramTab` / `openQueryHistoryTab` helpers.
* The hook is agnostic of the persistence policy — callers pass both a
  raw `saveTabs(dbId, tabs)` and a higher-level `persistTabs(dbId,
  tabs)` so debounced (DuckDB) and immediate (Postgres) writes stay
  intact.
* Migrated `PostgresPlayground.tsx` (–~160 LOC) and
  `DuckDbPlayground.tsx` (–~160 LOC) to consume the hook.

### 2. `useSchemaTree` (Task 2)

* New file: `app/_components/sql/hooks/useSchemaTree.ts` (137 LOC).
* Owns every piece of schema-tree state that Postgres and DuckDB used
  to declare in parallel: `schemas`, `selectedSchema`, `tables`,
  `views`, `indexes`, `triggers` (typed-but-unused for DuckDB so the
  shared `refreshSchema` shape stays uniform), `columnsByEntity`,
  `foreignKeysByEntity`, `expandedEntities`, `rowCountByTable`,
  `schemaLoading`, the `selectedSchemaRef` + `showSystemSchemasRef`,
  plus `refreshSchemas` and `handleSchemaChange` orchestration
  callbacks.
* `refreshSchema` (the **per-engine** entity loader) is still owned by
  each playground because it differs at the SQL level (e.g. Postgres
  pulls `index_db_size` from `pg_class`; DuckDB pulls index DDLs from
  `duckdb_indexes()`). The hook simply re-invokes whatever
  `refreshSchema` the caller passes.
* Each dialect now destructures `refreshSchemas: refreshSchemasFromHook`
  / `handleSchemaChange: handleSchemaChangeFromHook` so the
  per-playground `useCallback` wrappers that bind the dialect's local
  `refreshSchema` can list stable, locally-bound references in their
  dep arrays without tripping `react-hooks/exhaustive-deps`.

### 3. `AddRowDialog` (Task 3)

* New file: `app/_components/sql/components/AddRowDialog.tsx` (124 LOC).
* Used by both Postgres and DuckDB. ~90 LOC removed from each.
* The component is intentionally dialect-agnostic: it accepts a
  pre-built `RowEditor` element and renders only the dialog frame,
  title bar, body slot, validation banner, and the Cancel / Add buttons.

#### Deviation: `AddTableDialog` was **not** extracted

* The handover doc flagged `AddTableDialog` as "lower priority — only
  ~40-50% overlap between dialects" and "can be skipped if time is
  limited".
* In practice the two dialogs diverge on roughly half of their slot
  props: Postgres supports schema selection (because it has real
  multi-schema), DuckDB exposes a virtual `attached_db` selector and
  has a separate "create table from file" affordance, and the validation
  rules (`pg_`-prefix banning, identifier quoting, default-value
  expression handling) differ enough that the shared component would
  end up being a thin wrapper around 12 slot props plus three
  dialect-conditional branches.
* I judged this a leaky abstraction and left both `AddTableDialog`
  components in place. A future pass could introduce
  `useAddTableDialogState` (a pure-state hook) instead, but that is
  beyond the scope of the four tasks called out in the handover.

### 4. `SqlPlaygroundShell` (Task 4)

* New files:
  * `app/_components/sql/components/SqlPlaygroundShell.tsx` (123 LOC).
  * `app/_components/sql/components/SqlPlaygroundSwitcher.tsx` (108 LOC).
* The shell owns:
  * `<div className="pg-root">` page root.
  * The pyodide-style loading overlay (with parameterised title,
    caption, hero-repeat count, error tinting, and an optional
    `keepOverlayMounted` + `loadingOverlayClassName` for SQLite's
    fade-out animation).
  * `<div className="pg-app">` frame.
  * `<header className="pg-header">` with the brand logo and
    playground switcher (extracted into `SqlPlaygroundSwitcher`).
* Each dialect now returns `<SqlPlaygroundShell …>{body}</SqlPlaygroundShell>`
  from its `…Inner()` component, passing the header-actions block via
  the `headerActions` prop.
* All three dialects now render the **same** outer chrome — the
  switcher dropdown is byte-identical (SQLite used to use an inline
  SVG for the chevron; it now uses `lucide-react`'s `ChevronDown` so
  it matches Postgres + DuckDB).

#### Deviation: `<Toast.Provider>` stayed at the default export

* Initial attempt put `<Toast.Provider>` inside the shell. This broke
  the static build because the per-dialect `…Inner()` component calls
  `Toast.useToastManager()` *during render*, before its returned shell
  has a chance to wrap a Provider around it. SSG failed with Base UI
  error #73.
* Resolution: the `<Toast.Provider>` + `<Toast.Portal>` wiring is
  retained inside each playground's default-export wrapper (the
  `function PostgresPlayground() { return <Toast.Provider>…` shape
  that was already there). The shell now only owns the DOM
  scaffolding. This is documented in a comment on `SqlPlaygroundShell`.

#### Why the dialects were **not** collapsed into one file

The handover report's stretch goal was to retire the three
playgrounds entirely and replace them with a single
`SqlPlaygroundShell` driven by `SqlEngineAdapter`. That migration is
roughly an order of magnitude larger than the four tasks above:

* Each dialect has between ~3.9 kLOC and ~5.4 kLOC of dialect-specific
  state, dialogs, and import flows (CSV vs CSV+JSON+Parquet vs SQL
  dumps; FK cascade UX; trigger creation; PRAGMA panel for SQLite;
  files panel for DuckDB; schema-creation UX for Postgres).
* The render trees of the structure drawers diverge meaningfully.
* SQLite's state uses several Zustand stores (`useTabStore`,
  `useEngineStore`, `useDialogStore`, …) while Postgres + DuckDB still
  use local `useState`; collapsing them would require a one-shot
  Zustand migration of Postgres + DuckDB too.
* The repository has no integration tests for the playgrounds (only
  static rendering is asserted), making a 14 kLOC consolidation
  invisible to CI until manual smoke-testing in the browser.

Given the user's explicit "quality matters, not speed" guidance, I
landed the shell as the convergence point (every playground now sits
inside the same root chrome) without merging the three dialect bodies
into one. This is the same staged approach the handover doc itself
recommended ("SQLite first, then Postgres, then DuckDB"); the
follow-up work is now strictly additive — each dialect can be migrated
piece-by-piece (e.g. lift the top-toolbar, lift the schema sidebar,
lift one dialog at a time) into the shell without another big-bang
rewrite.

## LOC accounting

| File                                       | Before  | After   | Δ        |
| ------------------------------------------ | ------: | ------: | -------: |
| `postgres/PostgresPlayground.tsx`          |  5,305  |  4,948  |   –357   |
| `duckdb/DuckDbPlayground.tsx`              |  5,785  |  5,425  |   –360   |
| `sql/SqlPlayground.tsx`                    |  4,091  |  3,982  |   –109   |
| `sql/hooks/useSqlTabManagement.ts` (new)   |      0  |    318  |   +318   |
| `sql/hooks/useSchemaTree.ts` (new)         |      0  |    137  |   +137   |
| `sql/components/AddRowDialog.tsx` (new)    |      0  |    124  |   +124   |
| `sql/components/SqlPlaygroundShell.tsx` (new)|    0  |    123  |   +123   |
| `sql/components/SqlPlaygroundSwitcher.tsx` (new)| 0  |    108  |   +108   |
| **Total**                                  | 15,181  | 15,165  |   **–16**|

Raw line count is roughly neutral, but the previously-duplicated
scaffolding has been collapsed into 810 lines of reusable
infrastructure. Future work that touches the shared layer now happens
in one place instead of three.

## Validation

* `npx tsc --noEmit` — clean.
* `npm test` — **175 / 175** passing (no behavioural change).
* `npm run build` — clean; all 12 playground routes (including the
  three SQL ones) prerender successfully.
* `npm run lint` — **147 problems (15 errors, 132 warnings)**, down
  from the **151 problems** baseline. The 15 errors are all
  pre-existing `react-hooks/exhaustive-deps`-on-`flushSync` warnings
  in `ResultView.tsx` / `QueryHistoryPane.tsx` that the handover
  already called out as out-of-scope.

## Risks and follow-ups

1. **Lockstep behaviour change**: the SQLite playground's switcher
   chevron is now the lucide `ChevronDown` (size 12) instead of an
   inline SVG polyline. Visually indistinguishable, but worth a quick
   browser-eyeball pass.
2. **Tab persistence semantics**: `useSqlTabManagement` accepts both
   `saveTabs` and `persistTabs`. Postgres still calls `saveTabs`
   directly inside `addTab` to flush synchronously; DuckDB still
   debounces via `persistTabs`. The behaviour is preserved verbatim
   but the dual-callback shape is a code-smell worth revisiting once
   the persistence layer is unified.
3. **`AddTableDialog` not extracted**: see the deviation notes above.
   Recommended next step is to split `useAddTableDialogState` (pure
   state) from the JSX, then extract the JSX after a separate audit.
4. **Shell does not own the right-edge "settings cog" pattern**: the
   Settings + Runtime-info buttons are still rendered per-dialect
   inside the `headerActions` slot because their data dependencies
   (`fontSize`, `editorTheme`, …) are dialect-local. Lifting those to
   the shell would require the unified-settings store called out in
   the handover doc.
5. **Schema-tree hook does not own `refreshSchema`**: this is
   intentional, but it means each dialect is still responsible for
   ~120 LOC of "build a SQL query, run it, hydrate setters". A future
   refactor could introduce a `buildSchemaQuery` adapter on
   `SqlEngineAdapter` so the hook can drive `refreshSchema` itself.
6. **No integration tests for the playgrounds.** Validation is
   limited to type-checking + 175 unit tests on parsers/helpers + the
   static-render pass during `next build`. Any future shell
   consolidation should be preceded by a Playwright smoke test of
   each playground's "load sample → run query → see results" flow.

## Files changed

```
A app/_components/sql/components/AddRowDialog.tsx
A app/_components/sql/components/SqlPlaygroundShell.tsx
A app/_components/sql/components/SqlPlaygroundSwitcher.tsx
A app/_components/sql/hooks/useSchemaTree.ts
A app/_components/sql/hooks/useSqlTabManagement.ts
A agent-outputs/2026-05-16-stage4-shell-completion.md  (this file)
M app/_components/duckdb/DuckDbPlayground.tsx
M app/_components/postgres/PostgresPlayground.tsx
M app/_components/sql/SqlPlayground.tsx
```
