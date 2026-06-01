# DataSlope Codebase Review — 2026-06-01

**Scope:** Full-repository review triggered by a batch of maintenance requests
(fix Vercel build warnings, fix lint, improve low-quality / redundant code,
prune old research notes). This report records what was found, what was changed,
and what is recommended as follow-up.

**Reviewer methodology:** static inspection of `app/`, `content/`, `lib/`,
`scripts/`, and config; reproduction of the MDX → `remark-math` → `rehype-katex`
pipeline with the project's own dependencies to confirm rendering behavior
ahead of any edits; `eslint`, `tsc --noEmit`, `vitest`, and a full
`next build` for verification.

---

## 1. Executive summary

| Area | Before | After |
| --- | --- | --- |
| Vercel build warnings | npm peer-dep warning + **24** KaTeX strict warnings | **0** |
| ESLint | **57 errors / 13,020 warnings** | **0 errors / 43 warnings** |
| Broken math expressions (rendered as literal `\cdot`, `{…}`, or red errors) | **~90 across 2 courses** | **0** |
| Dead/duplicate code in `SqlPlayground.tsx` | 4,229 lines | 3,744 lines (**−485**) |
| Stale research notes in `agent-outputs/` | 16 `.md` | 2 `.md` (14 pruned) |

The single most important finding was **not** in the build log: a large amount of
lesson math was silently rendering broken on the live site (Section 3). The build
warnings were the visible tip of that iceberg.

---

## 2. Codebase overview

DataSlope is a Next.js 16 (App Router, Turbopack) site offering in-browser
language playgrounds (Python/Pyodide, R/WebR, SQLite, DuckDB/PGlite, C/C++/Java/
C#/PHP via WASM) and a Fumadocs-powered `/learn` section with ~780 MDX lessons.
Math in lessons is authored as `$…$` / `$$…$$` and rendered with
`remark-math` + `rehype-katex` (wired in `source.config.ts`).

**Strengths observed:** clear module boundaries under `app/_components/`
(runtime adapters, OPFS storage, SQL playground split into `components/`,
`hooks/`, `stores/`), good high-level explanatory comments in config files,
a healthy test suite (333 unit tests passing), and disciplined use of
Zustand stores for the SQL playground state.

---

## 3. HIGH — Lesson math rendered broken on the live site

### 3.1 Symptom
Across the **Scientific Computing with Python** course (~16 lessons) and parts of
**Machine Learning with scikit-learn**, body math rendered as raw tokens —
e.g. `(-1)^s \cdot (1+m) \cdot 2^{e-1023}` displayed literally as
“(−1)s **cdot** (1+m) **cdot** 2**{e−1023}**”. Three lessons rendered a red
KaTeX *error block* (the Lotka–Volterra system in `capstone-simulation.mdx`,
the RK4 tableau in `ordinary-differential-equations.mdx`, and a bound in
`numerical-stability.mdx`).

### 3.2 Root cause — an escaping convention that is correct in one place and wrong in another
The lessons were authored with **over-escaped LaTeX**: `\\cdot` instead of
`\cdot`, and `\{ … \}` instead of `{ … }`.

- Inside a **JS template-literal component prop** — e.g.
  `<MultipleChoice markdown={\`… $\\frac{d}{dx}$ …\`} />` — this is *correct*:
  the JS string parser unescapes `\\`→`\` and `\{`→`{` before the component's
  own ReactMarkdown/KaTeX pipeline runs.
- In the **MDX body**, `remark-math` takes the delimited content **verbatim**.
  KaTeX therefore received `\\cdot` (a display-mode newline followed by the
  text “cdot”) and `\{` (a literal brace), producing the broken output. MDX/
  fumadocs do **not** unescape math node values (verified against the installed
  `fumadocs-mdx`/`@mdx-js/mdx` pipeline — no unescaping plugin is present).

The same single convention thus works in props and breaks in the body. This is a
**latent systemic fragility**, not a one-off typo.

### 3.3 The build warnings were a subset of this
The 24 KaTeX strict warnings in the Vercel log decomposed as:
- **18× `newLineInDisplayMode`** — all from one malformed multi-line `$$ … $$`
  block in `numerical-stability.mdx` whose opening `$$` had content on the same
  line, so it parsed as multi-line *inline* math and swallowed following content.
- **6× `unknownSymbol` (— / –)** — *accidental* math. Currency in prose was
  written as `$165K … $52K` (or the doubly-broken `\\$48.20`), so two `$`
  delimited an unintended inline-math span; the en/em-dash inside tripped KaTeX.
  These were rendering as garbled italics, not dollar amounts.

### 3.4 Fix
- A position-based migration (driven by the mdast `math`/`inlineMath` node
  offsets, so **only body math is touched and props are structurally
  unreachable**) rewrote 93 body-math nodes across 15 files: `\\cmd`→`\cmd`,
  grouping `\{…\}`→`{…}`, while **preserving** row separators (`\\` in
  `aligned`) and **literal/set braces** (`\{…\}` → `\lbrace…\rbrace`, visually
  identical).
- The malformed `numerical-stability.mdx` block was reformatted to a proper
  block (`$$` on their own lines).
- Currency was escaped to `\$` **in body prose only** (props left as `\\$`,
  which is correct there).

### 3.5 Verification
Every one of the 360 body-math nodes in the repo was re-rendered with KaTeX
(MathML annotation stripped to avoid false positives) — **0 broken**, **0
`katex-error`**. The KaTeX strict pipeline now emits **0 warnings**. Props were
confirmed untouched (`multiple-choice.mdx` diff is empty; `confidence-intervals`
prop `\\$` preserved).

### 3.6 Recommendation
Math in MDX bodies and in component-prop strings need **opposite** escaping.
Consider one of:
1. A lint/CI check that renders every lesson's math and fails on `katex-error`
   or command-name leakage (the verification harness used here can be adapted).
2. An authoring guideline (and/or a remark transform) so authors write *plain*
   LaTeX everywhere and a single normalization step handles prop vs body.

---

## 4. HIGH — ESLint was linting generated build artifacts

`eslint .` reported **57 errors / 13,020 warnings**, but **53 errors and ~12,880
warnings came from two files**: `public/_workers/javascript-worker.js` and
`public/_workers/typescript-worker.js`. These are **minified bundles generated
on every build** by `scripts/build-almostnode-workers.mjs` (and gitignored,
`.gitignore:54`). Linting them is meaningless and it buried the real issues.

**Fix:** added `public/_workers/**` to the `ignores` list in
`eslint.config.mjs`. This alone reduced the report to **4 errors / 137
warnings**, which were then addressed (Section 5).

**Recommendation:** treat a non-empty lint report as a CI gate now that it is
meaningful again.

---

## 5. Build-warning + lint resolution detail (Tasks 1 & 2)

**npm peer dependency warning** (`vite`/`vitest` wanted `@types/node >= 22.12.0`,
root pinned `22.10.7`): bumped `@types/node` to `^22.12.0` (resolves to
`22.19.19`). Warning gone.

**The 4 real ESLint errors:**
- `php-worker.ts:278` — a local named `module` (reserved; `no-assign-module-variable`)
  renamed to `phpModule`.
- 3× `react-hooks/set-state-in-effect` (`Playground.tsx`, `SqlTabBar.tsx`,
  `SqlChallengeCard.tsx`) — legitimate "reset state when a prop changes"
  effects; suppressed with justified `eslint-disable-next-line` matching the
  codebase's existing convention.

**Warnings (137 → 43):**
- **87 `no-unused-vars`** removed (dead imports, helpers, types). The bulk
  (58) was leftover scaffolding in `SqlPlayground.tsx` from a refactor into
  `./components`, `./hooks`, `./stores` — removing it deleted **410 lines**
  (helpers like `compareCellValues`, `formatCellValue`, the dead
  `ColumnHeaderPopover` component, etc.).
- Removed 7 stale `eslint-disable`/`eslint-enable` directives.
- Added a conventional `no-unused-vars` config
  (`argsIgnorePattern`/`varsIgnorePattern: "^_"`, `ignoreRestSiblings: true`)
  so the idiomatic `const { seed: _seed, ...meta } = …` omit-a-field pattern
  in `sqlite-core.ts` no longer warns.

**Remaining: 43 `react-hooks/exhaustive-deps` warnings** (mostly
`DuckDbPlayground.tsx` and `PostgresPlayground.tsx`) — see Section 6.

---

## 6. MEDIUM findings

### 6.1 `react-hooks/exhaustive-deps` (43 warnings) — left intentionally
These flag `useCallback`/`useEffect` hooks missing deps such as
`selectedSchemaRef` and various store setters. They are almost certainly stable
references, so the warnings are benign — **but** "fixing" them by blindly adding
deps risks introducing re-render loops in the stateful DB playgrounds, and they
predate this review. **Recommendation:** address per-hook with author context,
or, if the team accepts the pattern, downgrade the rule deliberately rather than
leaving silent warnings. They were *not* auto-changed here.

### 6.2 Massive duplication between the DuckDB and Postgres playgrounds
This is the single biggest maintainability issue in the repo.
`PostgresPlayground.tsx` and `DuckDbPlayground.tsx` are **~89% byte-identical**
(≈4,649 of ≈5,229 trimmed lines). Whole components are clones:
- `PgGeneratedColumnRow` is **byte-identical** in both
  (`DuckDbPlayground.tsx:814`, `PostgresPlayground.tsx:788`) — and the DuckDB
  copy is misnamed with a `Pg` prefix and still threads `isPostgres`.
- `DuckDbStructureColumnRow` (`:608`) vs `PgStructureColumnRow` (`:582`): ~92%
  identical; `*TypeSelector`, `validate*Structure`, `make*Column`,
  `normalize*FkAction`, `ImportDialog` similarly cloned.

Any fix to one playground must currently be hand-mirrored to the other — a
standing source of drift and bugs. **Recommendation (large, needs design):**
extract the shared scaffolding into a generic module parameterized by a
per-dialect descriptor (type groups, validation regex, identifier labels).

### 6.3 Helpers/constants re-implemented instead of imported
Several already-exported canonical helpers are shadowed by local copies:
- `quoteIdent` (the same `` `"${name.replace(/"/g,'""')}"` ``) is reimplemented
  **~8 times** across the playgrounds, import modules, and runtimes. Worth a
  single shared util (after confirming per-dialect quoting is identical).
- `SqlPlayground.tsx:288–299` re-defines `sanitizeImportColName` /
  `normalizeImportColName` / `computeImportColComparison`, which already exist
  as exports in `sql/utils/importUtils.ts` (and the Postgres/DuckDB playgrounds
  *do* import them).
- `IMPORT_COL_STATUS_LABEL` (canonical in `sql/constants.ts:28`) is redefined in
  three playgrounds; `DROP_KIND_LABELS` (canonical `sql/constants.ts:21`) is
  redefined in `SqlPlayground.tsx`.
- Magic numbers (`MAX_EXCEL_SHEET_NAME_LENGTH=31`, `INFINITE_SCROLL_PAGE_SIZE=500`,
  `DEFAULT_PAGE_SIZE=50`, `MIN_ANIMATION_MS=300`) are redeclared across several
  files.

The `SqlPlayground.tsx` shadowing cases were de-duplicated in this pass
(Section 9); the cross-file ones are flagged for a follow-up.

### 6.4 Very large component functions
Single function bodies of extreme length: `DuckDbPlaygroundInner` ≈4,740 lines
(`DuckDbPlayground.tsx:894`), `PostgresPlaygroundInner` ≈4,361
(`PostgresPlayground.tsx:868`), `SqlPlaygroundInner` ≈3,224, `PlaygroundInner`
≈3,210. The SQL playground's `components/`+`hooks/`+`stores/` split is the model
to apply to the others.

### 6.3 `set-state-in-effect` as a recurring pattern
Several effects synchronize React state to an incoming prop. This is acceptable
but the new React rule flags it; the repo handles it with scattered disables.
A small `useSyncedState(prop)`-style helper (or deriving during render where
possible) would remove the need for the disables entirely.

---

## 7. Housekeeping

- **`agent-outputs/` pruning:** removed the 14 research notes dated
  `20260525` or earlier; kept `20260526-*` and `20260531-*`.
- **Orphaned asset folder:** `agent-outputs/assets-20260524-sql-playground-audit/`
  is the image set for the now-deleted `20260524-…-sql-playgrounds-ux-audit.md`.
  It was left in place because the request targeted *markdown files* only — flag
  for deletion if the team wants the orphan gone.

---

## 8. LOW — code-quality nits

A focused pass over `app/_components/` found the codebase otherwise
**disciplined**: no `TODO`/`FIXME`/`HACK`, no empty `catch {}` (catch blocks
carry real rationale), no stray production `console.log`, and effectively zero
`: any`. Specific items:

- **Redundant comments** (the only two that merely restate code) — *removed in
  this pass*: `opfs/workspace.ts:176` (`// Create sub-directories`) and
  `files/opfsDataStorage.ts:127` (`// Update manifest`).
- **`@ts-ignore` → `@ts-expect-error`** at `runtime/r.tsx` (the `webr` dynamic
  import) — *done*; `@ts-expect-error` fails loudly if the suppressed error ever
  disappears, and it let the redundant `ban-ts-comment` disable be dropped.
- **`Record<string, any>`** at `sql/utils/exportUtils.ts:135` (with an
  eslint-disable): the value is constrained to numeric/string field stats and is
  typeable — narrow it and drop the disable. *Follow-up (low).*

---

## 9. Changes applied in this review pass

- Build: `@types/node` bump; corrected an en-dash-in-math currency string in a
  `MultipleChoice` prop. **0** KaTeX build warnings (was 24) and the npm
  peer-dep warning is gone.
- Math: 15 lesson files corrected (93 body-math nodes), 3 red-error lessons
  fixed, currency escaping corrected in 5 lessons (body vs. prop handled
  separately).
- Lint: config fixed (ignore generated workers + `_`-convention); 4 errors
  fixed; ~90 unused bindings removed (notably **−485 lines** in
  `SqlPlayground.tsx`, incl. de-duplicating helpers/constants that already
  existed as exports in `sql/constants.ts` and `sql/utils/importUtils.ts`);
  stale disable directives removed.
- Comments/types: 2 redundant comments removed; `@ts-ignore` → `@ts-expect-error`.
- Repo: 14 stale research notes pruned.
- Validation: `eslint` **0 errors / 43 warnings**, `tsc --noEmit` clean,
  `vitest` **333/333**, `next build` green.

---

## 10. Prioritized follow-ups

1. **CI guard for lesson math** so the Section 3 class of bug cannot silently
   reship (render-and-assert on `katex-error`/token leakage).
2. **Resolve or formally accept** the 43 `exhaustive-deps` warnings.
3. **Decompose** the DuckDB/Postgres playground files along the SQL-playground
   pattern.
4. **Decide** on the orphaned `assets-20260524-*` folder.
