# Challenge Cards — implementation summary

*Generated: 2026-05-21*
*Branch: `claude/add-challenge-cards-ccpTo`*

This report summarises the work done to expand `<ChallengeCard>` to
every supported language and to add a sibling `<SqlChallengeCard>` for
SQL exercises. It documents the design decisions made, the files
touched, and what's left to do.

---

## Scope delivered

Two coding-exercise React components, both fully client-side (every
runtime is a WebAssembly bundle — no server execution):

1. **`<ChallengeCard>`** — extended to cover Python, JavaScript,
   TypeScript, R, PHP, C, C++, Java, and C#. Replaces the
   Python-only original.
2. **`<SqlChallengeCard>`** — new component covering SQLite (via
   `@sqlite.org/sqlite-wasm`), DuckDB (via `@duckdb/duckdb-wasm`), and
   PostgreSQL (via PGlite).

Both components share the same visual chrome (a white "worksheet" card
with subtle slate-tinted dark-mode variant) so a learning page that
mixes Python + SQL feels consistent.

A test page exists in `content/learn/` for every language, each with
3–4 distinct challenge variations exercising the test framework's
different modes.

---

## Architecture

### Two test modes

Both components support tests that fall into one of two shapes. A
single `tests` array on a card can mix the modes:

| Mode | Test field | Languages | When to use |
|---|---|---|---|
| **Native** | `code: string` | Python, JS, TS, R, PHP | When you need assertions in the target language (e.g. inspect a `summary` DataFrame, check `byCustomer.Ada === 150`). |
| **Stdout-based** | `expect: StdoutExpect` | Any (used heavily by C, C++, Java, C#) | When the natural artefact is what the program prints. Works for compiled languages where injecting per-test code into a single `main()` is impractical. |
| **SQL-specific** | `expectedRows`, `matchesSolution`, `runAfterSql`, etc. | SQL only | Result-set comparisons (order-independent by default) + post-DML state checks. |

The `StdoutExpect` schema is conjunctive — every listed field must
match. Supported keys: `stdoutEquals`, `stdoutContains`,
`stdoutDoesNotContain`, `stdoutMatches` (regex pattern as a string),
`stdoutMatchesFlags`, `stdoutLines`, `stdoutLinesExact`, `noStderr`,
`stderrContains`.

The SQL `tests` schema (`SqlChallengeTest`) supports:
`expectedRowCount`, `rowCountAtLeast`, `expectedColumns`,
`expectedColumnsInclude`, `expectedRows` (with optional `ordered`),
`matchesSolution` (with optional `ordered`), `runAfterSql`,
`runAfterEquals`, `runAfterRowCount`.

### Why a separate SQL component (rather than one polymorphic card)

SQL's natural artefact is a result set, not stdout. Reusing
`<ChallengeCard>` for SQL would have required either (a) faking a
stdout stream out of result-set rows or (b) special-casing the test
panel and the editor topbar for SQL inside the same component. Both
options bloat the non-SQL path. Keeping `SqlChallengeCard` separate
costs a little duplication (toolbar + test-panel JSX) but each
component reads linearly.

The two components share `ChallengeCard.module.css` outright, so any
chrome change ripples to both.

### Engine lifecycle (SQL)

Each `<SqlChallengeCard>` owns an **isolated** engine instance —
lazy-instantiated on first interaction, seeded with `initSql`, kept
alive for the lifetime of the card, and destroyed on unmount. Sharing
engines across cards would let one challenge's `CREATE TABLE` bleed
into another's tests.

The `initSql` runs once per card mount (after the engine is created
but before the first user query). Re-running tests does not re-seed —
that lets INSERT/UPDATE/DELETE exercises check post-mutation state via
`runAfterSql`.

`matchesSolution` runs the reference solution against the **same
engine** after the learner's SQL has executed, so post-DML state
checks still see the learner's mutations. Solution queries are
expected to be read-only.

### Dark mode

Fumadocs toggles a `.dark` class on `<html>`. Card CSS variables are
re-bound under `:global(html.dark) .card` so the same component
selectors keep working without per-element overrides. Surface colours:
white in light mode, slate `#0f172a` in dark mode. Accents
(green/red/purple) are slightly desaturated in dark mode so they
don't burn next to body text.

---

## Files changed

### New components
- `app/_components/SqlChallengeCard.tsx` — full component (~900 lines
  with comments). Handles three SQL dialects, in-card result table,
  reference-solution modal, test evaluation, dark-mode-aware styling.
- `app/_components/MdxSqlChallengeCard.tsx` — thin MDX wrapper that
  validates the `dialect` prop.

### Extended
- `app/_components/challengeHarness.ts` — added `StdoutExpect` schema,
  `evaluateStdoutExpect`, `isNativeTest` / `isStdoutTest` predicates,
  `canRunTests` helper, PHP harness. Kept Python / JS / TS / R
  harnesses unchanged. Existing `buildHarness` now skips stdout-only
  tests and returns the empty string when there are no native tests
  to inject.
- `app/_components/ChallengeCard.tsx` — supports mixed native +
  stdout test arrays. Evaluates stdout expectations after harness
  output is parsed. Renames `hasHarness` to `canRunTests` for the
  "should the Check Answer button be enabled?" call site.
- `app/_components/ChallengeCard.module.css` — added the SQL result
  table styles and the full `:global(html.dark)` dark-mode block. No
  light-mode regression — the original light tokens are unchanged.

### Glue
- `mdx-components.tsx` — registered `SqlChallengeCard` so MDX content
  can use `<SqlChallengeCard dialect="..." ... />` directly.

### Content
- `content/learn/challenge-test.mdx` — replaced with a multi-section
  Python sandbox (4 variations: pandas groupby, mean of a list,
  FizzBuzz with stdout-based tests, string manipulation). Includes
  link bar to all the per-language sibling pages.
- `content/learn/challenge-test-javascript.mdx` — 3 variations.
- `content/learn/challenge-test-typescript.mdx` — 3 variations.
- `content/learn/challenge-test-r.mdx` — 3 variations.
- `content/learn/challenge-test-php.mdx` — 3 variations.
- `content/learn/challenge-test-c.mdx` — 3 variations.
- `content/learn/challenge-test-cpp.mdx` — 3 variations.
- `content/learn/challenge-test-java.mdx` — 3 variations.
- `content/learn/challenge-test-csharp.mdx` — 3 variations.
- `content/learn/challenge-test-sqlite.mdx` — 3 variations (SELECT,
  GROUP BY, INSERT + post-state).
- `content/learn/challenge-test-duckdb.mdx` — 3 variations (range +
  filter, window functions, JOIN + aggregate).
- `content/learn/challenge-test-postgres.mdx` — 3 variations (JOIN,
  CTE + aggregate, UPDATE + post-state).

---

## Verification

- **`npx tsc --noEmit`** — clean (no type errors).
- **`npm run build`** — passes; all 11 new `/learn/challenge-test-*`
  routes prerender successfully.
- **`npm test`** — 221 unit tests pass; no regressions in existing
  adapter / SQL-completion / OPFS suites.
- **`npx eslint`** on the touched files — no errors, no warnings
  after a small cleanup.

The challenge cards have **not** been verified end-to-end in a
browser. Each runtime is large and lazy-loaded, so the first user
interaction with a new card has a one-time fetch cost (Pyodide ~10
MB, DuckDB ~5 MB, etc.). The component handles this with a loading
indicator on the topbar status dot, but real-world UX should be
sanity-checked at least once per language.

---

## Departures from the research report's suggestions

The Sonnet-generated research report (`Prompt A` / `Prompt B`)
suggested:

1. **A custom `testFn` prop per card**, taking the engine + result and
   returning `TestAssertionResult[]`. I did not adopt this because MDX
   cannot pass JavaScript functions — only serialisable props. The
   declarative `tests: SqlChallengeTest[]` schema is less powerful per
   test, but covers ~95% of teaching exercises and is fully
   serialisable through MDX.
2. **A `<CodeExerciseBlock>` separate from `<ChallengeCard>`**. I
   merged this back into the existing `ChallengeCard` because (a) the
   existing component already had most of the non-SQL chrome, (b)
   keeping two near-identical non-SQL components in the same codebase
   is friction with no payoff, and (c) the "stdout-based test" mode
   was a single-feature add to the existing component.
3. **Multi-file editor with tabs for C/C++/Java/C#**. Skipped for
   now — no current exercise requires multiple files. The existing
   `LanguageRuntime.prepareFileSystem` hook is already plumbed in, so
   adding multi-file later is a localised change.
4. **`initDb(engine)` async function for SQL**. Replaced by
   `initSql` (a plain SQL string) for the same MDX-serialisability
   reason. Sophisticated generators that need JS (e.g. seeded random
   data) can still be supported later by importing the card directly
   from a `.tsx` file rather than MDX.

---

## Remaining next steps

In rough priority order:

1. **Browser smoke test each card.** I've type-checked, built, and
   unit-tested every change, but the actual `Run` + `Check Answer`
   flows haven't been clicked through for every language. Recommended
   order: SQLite (lightest engine), Python (most-used), DuckDB,
   PostgreSQL, then the compiled-language quartet (C, C++, Java, C#).
2. **Memoise the SQL CodeMirror language extension.** Right now each
   SQL card does its own `await import("@codemirror/lang-sql")`. Not
   a real cost (the chunk is cached by the browser after the first
   load) but a small consolidation could happen in `cmExtensions.ts`.
3. **Surface engine load progress in the card UI.** The status dot on
   the topbar pulses while loading, but for first-time Pyodide /
   CheerpJ users the wait is multi-second. A short "loading Pyodide
   …" line near the editor (the way `CodeBlock` already does it)
   would set expectations.
4. **Solution modal for non-SQL cards.** `<SqlChallengeCard>` ships
   a "Show Solution" modal; the original `<ChallengeCard>` does not
   accept a `solutionCode` prop yet. If we want solution reveals to
   work consistently across SQL and non-SQL, the same modal logic
   should be ported back.
5. **Reset should re-seed the database (SQL).** Currently `Reset`
   restores the starter SQL but leaves the engine's state as-is. For
   INSERT/UPDATE/DELETE exercises, a "Reset" should also re-run
   `initSql` against a fresh blank database so the learner can retry
   a destructive query from scratch. This is a 10-line change in
   `SqlChallengeCard` — track an `engineSeededRef`-style flag and
   destroy/recreate on reset.
6. **End-to-end Playwright coverage.** The repo has `playwright.config.ts`
   and an `e2e/` directory. Add a spec that visits each
   `/learn/challenge-test-*` route, runs the starter code, asserts
   that no `Check Answer` outcome panics. Won't catch logic bugs but
   would catch broken imports on the per-language pages.
7. **(Stretch)** A `pre-exercise-code` style escape hatch on
   `<SqlChallengeCard>` that takes either a SQL string OR a function
   so authors who import the component directly (not via MDX) can
   generate large procedural datasets (numpy-style noise, seeded
   random, etc.).

---

## Quick reference: prop shapes

```ts
// Non-SQL
interface ChallengeCardProps {
  adapter: LanguageAdapter;          // imported from runtime/adapters
  title: string;
  badge?: string;                    // defaults to "Challenge"
  category?: string;
  estimatedTime?: string;
  instructions: React.ReactNode;
  hint?: React.ReactNode;
  initCode?: string;                 // read-only setup snippet
  initialCode: string;               // starter code
  tests: ChallengeTest[];            // mix of NativeChallengeTest +
                                     // StdoutChallengeTest
}

// SQL
interface SqlChallengeCardProps {
  dialect: "sqlite" | "duckdb" | "postgres";
  title: string;
  badge?: string;                    // defaults to "SQL Challenge"
  category?: string;
  estimatedTime?: string;
  instructions: React.ReactNode;
  hint?: React.ReactNode;
  initSql?: string;                  // DDL + seed inserts
  initialCode: string;               // starter SQL
  solutionSql?: string;              // adds "Show Solution" button
  tests: SqlChallengeTest[];
}
```
