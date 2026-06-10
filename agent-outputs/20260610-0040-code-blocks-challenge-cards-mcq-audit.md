# Code Blocks, Challenge Cards & MCQ — Code-Quality & UX Audit

**Date:** 2026-06-10
**Scope:** The MDX lesson components: `CodeBlock` / `ChallengeCard` (9 WASM language runtimes), `SqlCodeBlock` / `SqlChallengeCard` (SQLite / DuckDB / PostgreSQL in-browser engines, incl. the shared `useSqlTableViewer` hook), and `MultipleChoiceQuestion` (+ `parseQuestion`). Companion to the 2026-06-09 playgrounds audit on the same branch/PR.
**Method:** Two parallel code-review passes verified line-by-line against the source (several reported findings were rejected — §3), plus a live Playwright walkthrough on the kitchen-sink demo pages (`/learn/code-blocks-javascript`, `/learn/challenge-cards-javascript`, `/learn/sql-code-blocks-sqlite`, `/learn/sql-challenge-cards-sqlite`, `/learn/multiple-choice`) at desktop **1600×1000** and mobile **390×844** (touch emulation), with console-error capture and horizontal-overflow probes at every step.

---

## 1. UX walkthrough verdict

Both viewports are in strong shape — no blocking findings:

| Surface | Desktop | Mobile (390px) |
|---|---|---|
| CodeBlock run/output/Reset/Format/Copy | ✅ polished (badge + ready dot, kbd hint, timing) | ✅ Run collapses to icon, 0 overflow |
| ChallengeCard submit/tests/solution modal | ✅ split-button, per-test verdicts, pass/fail banner, solution modal with Copy + Load-into-editor | ✅ fits, split-button collapses, 0 overflow |
| SqlCodeBlock tables viewer + results | ✅ tabs above editor (documented design), seeded-table browser, timing | ✅ tables scroll within card, 0 overflow |
| SqlChallengeCard submit/tests | ✅ result tab + per-test details with expected/got | ✅ 0 overflow |
| MultipleChoice | ✅ select-to-submit (documented design), per-choice explanations | ✅ 0 overflow |

Console errors across every page and interaction, both viewports: **0**.

## 2. What was fixed

1. **Stale-run races in all four block components (high).** `ChallengeCard.run()/check()`, `SqlChallengeCard.run()/check()`, and `SqlCodeBlock.run()` updated state after `await` without checking whether a newer run superseded them. The Run/Submit buttons are disabled while busy, but the **⌘/Ctrl+Enter keymap is not gated** — two quick presses start two concurrent executions whose final `setOutputs`/`setTestResults`/`setStatus` interleave, so the slower (older) run could overwrite the newer run's results. Fixed by hoisting the run-sequence capture (`++runSeqRef.current`) from the internal `execute`/`executeSql` helpers into the callers (the helpers now take `mySeq` as a parameter) and guarding every post-await state update — the exact pattern `CodeBlock.run()` already used. The `finally` spinner cleanup is sequence-guarded too, so a superseded run can't re-enable Submit mid-flight of its successor; `reset()` now clears `activeAction` itself since a superseded run deliberately skips that cleanup.
2. **Table-viewer refresh race (SQL blocks, medium).** `useSqlTableViewer.refresh()` had no in-flight guard: Reset destroys the engine and refreshes against the fresh one, but a slower refresh already in flight (e.g. the mount-time boot on DuckDB, whose WASM download widens the window) could land last and show the pre-reset rows. Added a refresh sequence ref checked before `setEntries`; `clear()` (called by Reset) also invalidates in-flight refreshes. Covers both `SqlChallengeCard` and `SqlCodeBlock` (shared hook).
3. **`valueEquals('' , 0)` was true (SQL test framework, medium).** The numeric-string coercion used `Number(b) === a`, and `Number("")` is `0` — an empty-string cell passed a test expecting `0`. Blank/whitespace-only strings are now excluded from numeric coercion. (The deliberate `"42" == 42` looseness across engines is kept and documented.)
4. **`loadLanguage` chunk-load rejections (low).** A failed dynamic `import()` of a CodeMirror language package (flaky network on a deployed site) rejected through five un-caught call sites in CodeBlock/ChallengeCard as unhandled promise rejections. The loader now catches internally and resolves `null` (= plain-text rendering), covering every caller at once.
5. **MCQ feedback order + screen-reader announcement (UX/a11y).** The card rendered *Try again* **above** the verdict banner and explanation — action before feedback. Reordered to choices → verdict banner → explanation → *Try again* (see → understand → act), and the banner now carries `role="status"` so the verdict is announced to assistive tech when it appears. Verified live on desktop + mobile.
6. **`cmThemeNameRef` sync effect missing its dependency array (lint-level).** Ran on every render; now `[cmThemeName]`.

## 3. Reviewed and rejected (verified against the code — do not "re-fix")

- **"SqlCodeBlock Reset leaks the engine worker on rapid clicks"** — `reset()` swaps the promise ref and queues `oldEngine.then(e => e.destroy())`, which also covers boots still in flight; nothing leaks.
- **"`valueEquals` makes `0` equal `false`"** — booleans never enter the numeric-coercion branches; `valueEquals(0, false)` is `false`. (The real gap was the empty-string case — fixed, §2.3.)
- **"`fetchTablePage` interpolates unvalidated LIMIT/OFFSET"** — `pageSize` is `Math.max(1, Math.floor(...))` at the hook boundary and `offset` is an array length; both are always safe integers.
- **"`expectedColumnsInclude` should be case-insensitive"** — deliberate: expected values are authored against actual engine output, the failure message shows expected vs got verbatim, and loosening comparison semantics could silently change the strictness of existing course tests.
- **"Cap `VirtualizedResultTable` rows"** — rows are already materialized by `engine.exec()` before rendering and the DOM is virtualized; a display cap wouldn't reduce peak memory.
- **O(n²) order-independent row comparison** — documented teaching-scale trade-off; result sets here are seeded small.

## 4. Verification

- `tsc --noEmit` clean; ESLint clean on every touched file; `vitest run` **468/468**.
- e2e against the live dev server: `code-blocks-run` (every block on the 9 language pages), `sql-code-blocks-run` (every SQL block × 3 dialects), `csv-examples` (4 external-network tests auto-skip), and the `challenge-solutions` sweep for JavaScript, TypeScript, SQLite, DuckDB, PostgreSQL — **all passing** through the modified run/check paths.
- Live re-verification: rapid double ⌘/Ctrl+Enter on a JS challenge and a SQL block — no stuck spinner, single coherent result; MCQ answer flow on desktop + mobile with `role="status"` present and 0 overflow.
