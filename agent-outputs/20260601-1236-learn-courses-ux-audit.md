# Dataslope · Learn — Courses UX/UI Audit

**Date:** 2026-06-01
**Scope:** The `/learn` route — 27 Fumadocs-powered courses (781 MDX pages) plus the component showcase/demo pages. Evaluated from a learner's perspective.
**Method:** Live Playwright walkthrough of a 24-page representative sample (interacting with MCQs, code blocks, challenge cards, Mermaid diagrams, and SQL components the way a learner would) + static analysis of all 2,354 multiple-choice questions and 781 pages. Evidence screenshots and raw logs are in `assets-20260601-learn-courses-ux-audit/`.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Severity legend](#2-severity-legend)
3. [Top findings at a glance](#3-top-findings-at-a-glance)
4. [Detailed findings](#4-detailed-findings)
   - 4.1 [Navigation & information architecture](#41-navigation--information-architecture)
   - 4.2 [Systemic rendering issues (every page)](#42-systemic-rendering-issues-every-page)
   - 4.3 [Multiple-choice question correctness](#43-multiple-choice-question-correctness)
   - 4.4 [Multiple-choice content polish](#44-multiple-choice-content-polish)
   - 4.5 [Code blocks & runtime/loading UX](#45-code-blocks--runtimeloading-ux)
   - 4.6 [Challenge cards](#46-challenge-cards)
   - 4.7 [Mermaid diagrams](#47-mermaid-diagrams)
   - 4.8 [SQL components & challenge-coverage gap](#48-sql-components--challenge-coverage-gap)
   - 4.9 [Curriculum & pedagogy](#49-curriculum--pedagogy)
   - 4.10 [Accessibility](#410-accessibility)
   - 4.11 [Mobile / responsive](#411-mobile--responsive)
5. [What's working well](#5-whats-working-well)
6. [Phased implementation plan](#6-phased-implementation-plan)
7. [Appendix — methodology, data, screenshot index](#7-appendix)

---

## 1. Executive summary

The course **content components are excellent**. Code blocks, challenge cards, multiple-choice cards, and Mermaid diagrams are polished, consistent, well-themed (light & dark), and work on mobile. Code execution is real and fast where native (JavaScript ≈ 280 ms) and works from CDN runtimes (Pyodide cold-boot + run ≈ 10.7 s). The challenge-card grading UX — pass/fail banners, a precise expected-vs-got diff, and a "Reference solution" modal — is genuinely best-in-class. SQLite queries return real result grids. Within a single course, chapter navigation is clean.

The problems are concentrated in **two areas that sit *around* the good content**:

1. **The `/learn` landing page contains dead links.** The `/learn` landing page — the destination of the homepage's primary "Browse Learn" CTA — contains **9 dead links** (`/learn/python`, `/learn/r`, … all 404). A learner who follows the obvious path and clicks one lands on a bare 404. (The course catalog lives at the site root `/`, which correctly lists all 27 courses, each linking to `/learn/<slug>`.)

2. **A class of multiple-choice content bugs makes some questions unwinnable or misleading.** One Java question can never be answered correctly (no option is marked correct). Four questions contain two *verbatim-identical* options where only one is marked correct, so a learner who picks the identical-but-unmarked option is told they are wrong. ~270 explanations open with an affirmation ("Yes.", "Right.", "Exactly.") in violation of the project's own `AGENTS.md` rule — confusing when shown to a learner who answered incorrectly.

Additionally, **every page emits two console errors** (a React `key` warning from the sidebar and a hydration mismatch).

None of these require touching the content components themselves — they are navigation wiring, a finite set of content fixes, and rendering hygiene. The phased plan in §6 is ordered so a coding agent can resolve "learner gets stranded / misled" first, then discoverability, then polish.

> **Note on MCQ auto-submit:** single-answer questions commit on first click by design. This audit treats that as intended and recommends **no change** to it.

---

## 2. Severity legend

| Badge | Meaning |
|---|---|
| 🔴 **P0 — Blocker** | Learner is stranded or actively misled; dead links; unwinnable questions. |
| 🟠 **P1 — Major** | Significant friction or confusion; discoverability; systemic console errors. |
| 🟡 **P2 — Minor** | Polish, consistency, content quality at scale. |
| 🔵 **P3 — Enhancement** | New features / pedagogy improvements; nice-to-have. |

---

## 3. Top findings at a glance

| # | Severity | Area | Finding | Evidence |
|---|---|---|---|---|
| 1 | 🔴 P0 | Nav | All 9 "Languages" links on `/learn` landing 404 (`/learn/python`, `/learn/r`, …) | `06-broken-link-404.png` |
| 2 | 🔴 P0 | MCQ | Java "role of `main`" question has **no** correct option marked — unwinnable | `your-first-java-program.mdx:121` |
| 3 | 🔴 P0 | MCQ | 4 questions have two **identical** options, only one marked correct | `13-mcq-submitted-explanations.png` |
| 4 | 🟠 P1 | Rendering | React duplicate-`key` warning in `Sidebar` on **every** page | `interact-log.txt` |
| 5 | 🟠 P1 | Rendering | Hydration mismatch on **every** page | `interact-log.txt` |
| 6 | 🟠 P1 | Nav | Bare 404 (no header/nav/links) — no recovery path | `06-broken-link-404.png` |
| 7 | 🟡 P2 | MCQ | ~270 explanations open with an affirmation (violates `AGENTS.md`) | `mcq-lint.mjs` output |
| 8 | 🟡 P2 | Consistency | `code-blocks-c.mdx` title uses a hyphen vs. em-dash on all 8 siblings | `code-blocks-c.mdx:2` |
| 9 | 🟠 P1 | Loading | First-run cold boot (~10.7 s for Python) has weak progress affordance | `40-python-codeblock-after.png` |
| 10 | 🔵 P3 | Curriculum | SQL/viz courses have ~0 challenge cards (vs. 60+ in others) | per-course table, §4.8 |
| 11 | 🔵 P3 | Curriculum | 7/27 courses open with a non-interactive (history/prose) chapter | §4.9 |

---

## 4. Detailed findings

### 4.1 Navigation & information architecture

This is the highest-impact cluster: the `/learn` landing page ships dead links.

**The site root `/` is a real catalog (good).** It lists all 27 courses alphabetically, each linking correctly to `/learn/<slug>` (e.g. `/learn/python-basics`). See `05-home-catalog.png`. Source: `app/page.tsx` reads each course's `meta.json` and includes those with `root: true` (all 27 qualify).

**The `/learn` landing page is a developer explainer, and its "Languages" list is broken.**

- 🔴 **#1 — Nine dead links.** `content/learn/index.mdx` has a "Languages" list linking to `/learn/python`, `/learn/r`, `/learn/javascript`, `/learn/typescript`, `/learn/php`, `/learn/c`, `/learn/cpp`, `/learn/java`, `/learn/csharp`. **All nine return HTTP 404** (verified via direct requests). None of those slugs exist — the demo pages are `code-blocks-<lang>` and the courses are e.g. `python-basics`. A learner clicking "Python" on the landing page hits a dead end.
- 🟠 **#6 — No recovery from 404.** The dead links land on a bare Next.js `404 — This page could not be found.` with no header, no nav, no link back to `/learn` or the catalog (`06-broken-link-404.png`). The browser back button is the only escape.
- 🟡 **No cross-course navigation.** On a course page the sidebar correctly shows that course's chapters (`04-course-sidebar.png`), but there is no "back to all courses", breadcrumb, or link to any other course. Once inside a course, the catalog is unreachable without editing the URL.

**Net learner experience:** Homepage → "Browse Learn" → `/learn`, where the "Languages" links are dead ends. The working catalog at `/` lists every course and is the intended front door.

---

### 4.2 Systemic rendering issues (every page)

Both errors below fired on **every one of the 24 pages** walked (full text captured in `interact-log.txt`).

- 🟠 **#4 — Duplicate React `key` warning.**
  > `Each child in a list should have a unique "key" prop. … Check the render method of `Sidebar`. It was passed a child from `LearnLayout`.`

  `app/learn/layout.tsx` passes `tree={source.pageTree}` and `sidebar={{ banner: … }}` into Fumadocs's `DocsLayout`. The `"---"` separators were the initial suspect, but in `fumadocs-ui@16.9.0` the page-tree renderer keys every node by index — the real cause is the **`sidebar.banner` element**, which Fumadocs renders in *both* the desktop sidebar and the mobile drawer, so the shared keyless node collides. **Resolved** by giving the banner a stable `key` in `app/learn/layout.tsx`.

- 🟠 **#5 — Hydration mismatch.**
  > `A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up.`

  Confirmed cause: `next-themes` (via `RootProvider`) and the `/playground` theme-bootstrap script both set `<html>`'s `class`/`style`/`data-theme` before hydration, so the server-rendered `<html>` can't match the client. **Resolved** by adding `suppressHydrationWarning` to `<html>` in `app/layout.tsx` — the documented next-themes fix, scoped to the one element whose attributes are intentionally set client-side.

These are dev-mode warnings but indicate real issues (a duplicate key can drop/duplicate sidebar items; a hydration mismatch discards server HTML for the affected subtree).

---

### 4.3 Multiple-choice question correctness

Static analysis parsed **2,354** `<MultipleChoice>` blocks. The following are unambiguous bugs.

- 🔴 **#2 — Unwinnable question (no correct answer).**
  `content/learn/java-programming-for-beginners/your-first-java-program.mdx:121` — *"What is the role of the `main` method in a Java program?"*. The intended answer ("It is the method called automatically by the JVM when the program starts") is **missing its `[o]` marker** (its explanation even reads "`main` is the agreed-upon entry point"). No option is flagged correct, so the card returns "Not quite — try again" for every selection. The learner can never pass it.

- 🔴 **#3 — Two identical options, only one marked correct (4 questions).** In each, two choices are *verbatim* identical but only the second carries `[o]`. A learner who selects the first (identical) option is marked **wrong for choosing the correct answer**. `13-mcq-submitted-explanations.png` shows the effect: two identical `print("Hello", end="")` rows, one green-correct and one not.

  | File:line | Duplicated option |
  |---|---|
  | `python-basics/hello-world.mdx:258` & `:260` | `` `print("Hello", end="")` `` |
  | `python-basics/loops.mdx:492` & `:494` | `` `3` `` |
  | `python-basics/comprehensions.mdx:377` & `:379` | `` `[11, 21, 12, 22]` `` |
  | `typescript-from-scratch/structural-typing.mdx:348` & `:350` | `` `Dog` is assignable to `Pet`… `` |

  The pattern (a correct answer duplicated in place of a distractor) looks like a systematic authoring/generation artifact — a fix-pass plus a lint guard (Phase 4) is the right response.

- 🔴 **Misleading hint compounds the hello-world bug.** In `hello-world.mdx:258` the *first* duplicate option's explanation is *"This works! But there is another correct answer too."* — but the question is single-answer with only one `[o]`. It tells the learner there are multiple right answers while the UI only accepts one, and it opens with "This works!" (see §4.4).

> Static analysis also flagged 8 "another correct answer"-style hints, but on inspection 7 are correct content (explanations on *wrong* options that legitimately discuss "more than one", e.g. complexity-analysis O(1), or "Both results are correct" explaining why a distractor is wrong). Only the hello-world case above is a genuine bug.

---

### 4.4 Multiple-choice content polish

- 🟡 **#7 — Affirmative-opening explanations (~270 instances, 112 files).** `AGENTS.md` explicitly forbids starting a choice explanation with an affirmation because explanations render for **all** choices after submit — so a learner who answered *wrong* still sees "Yes." / "Right." / "Exactly." under the correct option, which reads as false praise. The linter found:

  | Opening word | Count |
  |---|---|
  | `Yes` / `Yes!` / `Yes,` | 130 |
  | `Right` | 121 |
  | `Exactly` | 17 |
  | `This` ("This works…") | 3 |
  | `Correct` | 2 |
  | `True` (see note) | 7 |

  268 of these sit on the *correct* choice. **Exclusion:** the 7 `True` cases are legitimate — they're "select the statement that is **false**" questions where "True;" labels each *true* (wrong-to-pick) statement's truth value (e.g. `from-zero-to-cpp/pointers-and-references.mdx`, `python-basics/data-types.mdx`). The lint in Phase 4 should treat `True`/`False` openers in "which is false/incorrect" questions as allowed.

- 🟡 **Empty per-choice explanations: 2,133 choices across 273 files.** Not a defect (the overall explanation often suffices), but per-choice explanations are where MCQs teach. High-value distractors with no explanation are a missed teaching opportunity; consider backfilling on the most-trafficked courses.

---

### 4.5 Code blocks & runtime/loading UX

Code execution works and the output UI is clean (`30/31-js-codeblock-*.png`, `40-python-codeblock-after.png`): a "CODE BLOCK" header with runtime + version + status dot, a Run button with the `Ctrl/⌘+↵` hint, Reset/Format/Copy, and an output cell with elapsed time.

- ✅ JavaScript (native) ran in ~**280 ms**; output rendered correctly.
- ✅ Python (Pyodide, CDN) cold-boot + first run completed in ~**10.7 s** and printed `Hello, World!`. Subsequent runs reuse the shared worker.
- 🟠 **#9 — Weak first-run affordance for slow runtimes.** A learner's *first* Run on a Python page is a ~10 s wait (heavier runtimes — WebR, CheerpJ/Java, .NET/C#, browsercc/C/C++ — are typically longer). The Run button shows "Running…", but there's no progress, no size/time expectation, and nothing communicating "this first run downloads the runtime; later runs are instant." For a learner this can read as "broken." Recommend: a determinate/àindeterminate boot indicator with copy like *"Downloading the Python runtime (first run only)…"*, and consider warming the shared runtime when the first code block scrolls into view. **Resolved:** `<CodeBlock>` now renders a labeled boot notice while the runtime loads — the live progress message (e.g. "Loading Pyodide…") plus, on a cold start, *"Downloading the Python runtime — this happens once; later runs are instant"* — and the Run button reads "Loading…" vs "Running…". Both `<CodeBlock>` and `<ChallengeCard>` also warm the shared runtime via an IntersectionObserver as they scroll into view, so the first Run reuses an already-initialised runtime.
- 🟡 The `<CodeBlock>` Run button has no stable `data-testid`/`aria-label` (it's a class-hashed button whose accessible name is "RunCtrl+↵"). Minor, but it complicates automated testing and screen-reader labeling vs. the challenge card's `data-testid="challenge-submit"`. **Resolved:** the Run button now has `data-testid="codeblock-run"` and `aria-label="Run code"` (the card carries `data-testid="code-block"`, the boot notice `data-testid="codeblock-boot"`).

---

### 4.6 Challenge cards

Among the strongest parts of the platform. Verified end-to-end by driving the card's solution and a wrong answer:

- ✅ **Pass state** (`41-python-challenge-pass.png`): "Passed" badge, output, "TEST RESULTS 1/1 passed", green per-test rows, "All tests passed! Great work — your solution is correct."
- ✅ **Fail state** (`42-python-challenge-fail.png`): "0/1 tests", a precise diff — `Line 1 mismatch. expected: "Hello, Grace!" got: "wrong output"` — and "1 test failed — review the details and try again." This is exactly the actionable feedback a learner needs.
- ✅ **Reference solution modal** (`43-python-solution-modal.png`): read-only, syntax-highlighted, copyable, with the honest subtitle *"One valid answer — there may be others."*
- ✅ Multi-file workspaces, init-code panels, Reset, and Format all present.
- 🔵 Possible enhancement: per-test "description" / hint reveal after N failed attempts, and a "show solution" nudge after repeated failures.

---

### 4.7 Mermaid diagrams

1,505 diagrams across 671 pages. Spot-checked the showcase and several course pages.

- ✅ Diagrams render cleanly inline (`20-mermaid-inline.png`) with the serif theme, in both light and dark.
- ✅ Full-screen modal works (`21-mermaid-fullscreen.png`) with zoom in/out/reset and pan; crisp vector zoom.
- ✅ No render/parse errors observed across the 24-page sample (the extensive Mermaid syntax rules in `AGENTS.md` appear to be paying off).
- 🟡 The expand affordance only appears on hover; on touch devices it should be persistently visible (mobile users can't hover). Verify the expand button is reachable on touch.

---

### 4.8 SQL components & challenge-coverage gap

- ✅ SQLite code blocks execute and return real, paginated result grids with row counts and timing (`51-sql-after-run.png`), including a 10,000-row infinite-scroll example.
- 🔵 **#10 — SQL & visualization courses barely use challenge cards.** Despite a working `<SqlChallengeCard>` component, the actual SQL/viz *courses* are almost entirely code-blocks + MCQs with no graded practice:

  | Course | Code blocks | Challenges | MCQs |
  |---|--:|--:|--:|
  | `intro-sql-postgres` | 67 | **0** | 102 |
  | `database-design-postgresql` | 44 | **0** | 189 |
  | `sql-analytics-duckdb` | 75 | **1** | 74 |
  | `sqlite-for-beginners` | 118 | **2** | 161 |
  | `intro-data-viz-plotly` | 101 | **0** | 135 |
  | `mastering-ggplot2` | 101 | **0** | 65 |

  By contrast `python-basics` has 69, `statistics-for-data-science-python` 59, `mastering-dsa-cpp` 59. Visualization is genuinely hard to auto-grade, but SQL is not — `<SqlChallengeCard>` exists and is demoed. This is the biggest *consistency* gap between courses.

---

### 4.9 Curriculum & pedagogy

- 🔵 **#11 — History-first openings (7/27 courses).** Seven courses open with a chapter that has **zero** executable components (e.g. `beginners-javascript/story-of-programming`, `data-analysis-python-pandas/history-of-data`, `from-zero-to-cpp/a-brief-history`, `practical-r-for-beginners/the-age-of-data`). Narrative framing is valuable, but a learner who came to *write code* doesn't touch any for one or more chapters. Consider an early "try it" hook even inside narrative chapters (a tiny runnable snippet or a 1-question check).
- 🟡 Component density varies enormously (e.g. `python-basics` ≈ 13 code blocks/page vs. narrative SQL/viz chapters with mostly prose+Mermaid+MCQ). Not wrong, but worth a consistency pass on "every chapter ends with a check / a challenge."

---

### 4.10 Accessibility

- ✅ MCQ uses real `role="radiogroup"`/`role="group"` with `<input>`s; challenge controls use a `role="toolbar"`; Mermaid modal uses `role="dialog"` + `aria-modal` + Esc.
- 🟡 The duplicate-`key`/hydration warnings (§4.2) can desync server/client a11y attributes (e.g. `aria-expanded` on the sidebar).
- 🟡 Mermaid SVGs lack a text alternative/`<title>`; screen-reader users get no description of the diagram. Consider an author-supplied `alt`/caption.
- 🟡 The Mermaid expand button is hover-only (no persistent focusable affordance on touch / keyboard discoverability).
- 🟡 Verify focus management when the challenge "Reference solution" modal and Mermaid full-screen modal open/close (focus trap + return focus).

---

### 4.11 Mobile / responsive

Checked at 390×844 (`60/62/63-mobile-*.png`).

- ✅ Lessons reflow well; a mobile top bar with search + sidebar toggle and a per-page TOC dropdown appear.
- ✅ The challenge card is usable on mobile (`62-mobile-challenge.png`): header, instructions, collapsible init code, line-numbered editor, and the Submit split-button + utility icons all fit.
- ✅ SQL result grids and code blocks are horizontally scrollable as expected.
- 🟡 Code editors require horizontal scrolling on narrow screens (inherent to code), and the challenge action bar's utility icons (Reset/Solution/Format/Copy) are small touch targets — verify they meet the 44px hit-area guideline.

---

## 5. What's working well

So the rewrite phases don't accidentally regress strengths:

- **Component design & theming** — code blocks, challenge cards, MCQ cards, and Mermaid are consistent, attractive, and fully dark-mode aware (`07-dark-lesson.png`).
- **Challenge grading** — pass/fail banners, expected-vs-got diffs, and the solution modal are excellent (`41/42/43`).
- **Real in-browser execution** — JS/TS native, Pyodide/WebR/SQLite/etc. from CDN; shared worker reuse across a page.
- **Within-course navigation** — sidebar chapter tree + on-page TOC are clean.
- **The `/` catalog** — a good, complete list of all 27 courses, each linking to `/learn/<slug>`.
- **Mobile** — the heavy interactive components degrade gracefully.

---

## 6. Phased implementation plan

Each phase is self-contained and can be handed to a coding agent independently, in order. Severity-ordered: unblock/de-mislead first, then discoverability, then hygiene, then quality/features.

### Phase 1 — Critical correctness: stop stranding & misleading learners 🔴

**Goal:** no dead links from the learn entry point; every MCQ is winnable and has no contradictory options.

1. **Remove the 9 broken landing links.** In `content/learn/index.mdx`, drop the broken `/learn/<lang>` links from the "Languages" list (the catalog at `/` is the front door, so the list now reads as a plain inventory of supported runtimes). Two further dead language links elsewhere are repointed to real targets: `code-blocks-typescript.mdx` → `/learn/code-blocks-javascript`, and `beginners-javascript/next-steps.mdx` → `/learn/typescript-from-scratch`. Verify every link returns 200.
2. **Fix the unwinnable Java MCQ.** `your-first-java-program.mdx:125` — add the `[o]` marker to *"It is the method called automatically by the JVM when the program starts."*
3. **Fix the 4 duplicate-option MCQs** (replace the unmarked duplicate with a real distractor):
   - `python-basics/hello-world.mdx:258` (also remove the misleading *"This works! But there is another correct answer too."* and reword the now-unique distractor)
   - `python-basics/loops.mdx:492`
   - `python-basics/comprehensions.mdx:377`
   - `typescript-from-scratch/structural-typing.mdx:348`

**Acceptance:** crawl every link on `/learn` → no 404s; each of the 5 questions has exactly one intended correct set and no two identical choices; manual submit of each correct answer shows the pass state.

---

### Phase 2 — Navigation recovery & cross-linking 🟠

**Goal:** a learner never lands in a bare 404, and can always get back to the course catalog at `/`.

1. **Add cross-course navigation.** A persistent "← All courses" link / breadcrumb in the course sidebar banner (the `SidebarCourseTitle` slot is a natural home) linking back to the catalog at `/`.
2. **Custom 404.** Add `app/not-found.tsx` (or a learn-scoped `not-found`) with the Dataslope header and links to the catalog + `/learn`, so a mistyped or stale `/learn/*` URL has a recovery path.
3. **Link `/learn` → catalog.** The `/learn` landing is a developer explainer; add a prominent link from it to the catalog at `/` so a learner who lands there can reach the courses.

**Acceptance:** every course page has a one-click path back to the catalog; hitting a nonexistent `/learn/*` URL shows a branded page with recovery links.

---

### Phase 3 — Rendering hygiene (clean console on every page) 🟠 — ✅ implemented

**Goal:** `/learn` pages render with no React warnings.

1. **Duplicate-`key` warning — fixed.** Not the `"---"` separators (the `fumadocs-ui@16.9.0` page-tree keys every node by index); the cause was the `sidebar.banner`, which Fumadocs renders in both the desktop sidebar and the mobile drawer. Gave the banner element a stable `key` in `app/learn/layout.tsx`.
2. **Hydration mismatch — fixed.** `next-themes` (via `RootProvider`) and the `/playground` theme-bootstrap script both set `<html>`'s `class`/`style`/`data-theme` on the client; added `suppressHydrationWarning` to `<html>` in `app/layout.tsx`.

**Acceptance (met):** 10 representative learn pages (the index, demo/showcase pages, and course chapters across several courses) load with zero console errors/warnings — excluding the sandbox-only CDN cert noise — verified via Playwright.

---

### Phase 4 — MCQ content quality at scale + regression guard 🟡

**Goal:** explanations read neutrally for all learners; the bug classes from Phase 1 can't reappear.

1. **Ship an MCQ linter in CI.** Productize `scripts/audit/mcq-lint.mjs`: fail the build on (a) no `[o]` correct answer, (b) verbatim-duplicate choices (case-sensitive), (c) fewer than 2 choices, and (d) affirmative-opening explanations — with an allowlist for `True`/`False` openers in "which is false/incorrect/NOT true" questions. (Wire into `npm test` / the existing vitest or a `scripts/` check.)
2. **Rewrite the ~270 affirmative openers** to neutral statements (per `AGENTS.md`), excluding the ~7 legitimate `True` select-the-false cases. Mechanical but should be reviewed (some "Right"/"Yes" may be mid-sentence false positives — the linter pinpoints exact file:line).
3. *(Optional)* Backfill empty per-choice explanations on the highest-traffic courses (`python-basics`, `statistics-for-data-science-python`, `data-analysis-python-pandas`).

**Acceptance:** linter passes repo-wide and is enforced in CI; no explanation in the corpus opens with a disallowed affirmation outside the documented exception.

---

### Phase 5 — Runtime & loading UX for code execution 🟡 — ✅ implemented

**Goal:** the first Run on a heavy runtime feels intentional, not broken.

1. **First-run boot affordance — done.** `<CodeBlock>` renders a labeled boot notice while `status === "loading"`: the live progress message (e.g. "Loading Pyodide…") and, on a cold start, *"Downloading the Python runtime — this happens once; later runs are instant."* The Run button now differentiates **"Loading…"** (runtime) from **"Running…"** (your code).
2. **Warm-up — done.** Both `<CodeBlock>` and `<ChallengeCard>` warm the shared runtime via an `IntersectionObserver` (200 px rootMargin) when they scroll into view, so the learner's first click reuses an already-initialised runtime instead of triggering a cold download. The registry dedupes warm-ups per language, tracks a `ready` flag (for accurate cold-vs-warm copy), and swallows warm-up failures so a real Run can still retry and report errors.
3. **Run button testability/a11y — done.** Added `data-testid="codeblock-run"` + `aria-label="Run code"` (plus `data-testid="code-block"` on the card and `data-testid="codeblock-boot"` on the boot notice).

**Acceptance (met):** verified via Playwright on a Python lesson — the labeled boot indicator appears on a cold Run with the "first run only" copy, the run completes (status → ready), a warm second run shows no cold hint, and the scroll-into-view warm-up pre-loads the runtime so a delayed first Run is already warm.

---

### Phase 6 — Curriculum consistency & engagement features 🔵 — partially implemented

**Goal:** close cross-course gaps and tighten consistency across courses.

1. **Add challenges to SQL/viz courses** that currently have ~0 (`intro-sql-postgres`, `database-design-postgresql`, `sql-analytics-duckdb`, `sqlite-for-beginners` for SQL via `<SqlChallengeCard>`; evaluate feasible auto-grading for `intro-data-viz-plotly`/`mastering-ggplot2`). **`intro-sql-postgres` ✅ done** — six verified practice challenges (select-basics, filtering-rows, sorting-and-limiting, aggregate-functions, grouping-data, inner-joins), each with its own schema + reference solution + tests, verified both via PGlite in Node and by driving the live card in Playwright ("All tests passed"). `<SqlChallengeCard>` also gained `data-testid="sql-challenge-card"`. *(Remaining: `database-design-postgresql` (also 0 challenges), topping up `sql-analytics-duckdb` (1) and `sqlite-for-beginners` (2), and evaluating viz auto-grading.)*
2. **Early engagement hook** for the 7 history-first courses: a small runnable snippet or single check question within the narrative opener. *(Remaining — content authoring.)*
3. **Polish — title consistency ✅ done.** Fixed `code-blocks-c.mdx` (`Code Blocks - C` → `Code Blocks — C`) and added `__tests__/contentTitles.test.ts` enforcing the em-dash convention under `npm test`. *(Mermaid `alt`/caption support remains; diagrams are authored as fenced blocks, so it needs an authoring path as well as the component prop.)*

**Acceptance:** title-consistency lint — **met**; `intro-sql-postgres` now has practice challenges. Cross-course SQL/viz challenges (a challenge in every course's first half) and the engagement hooks — remaining.

---

## 7. Appendix

### 7.1 Methodology

- **Environment:** `npm install` (with the `almostnode`/worker postinstall) + `npx next dev -p 3457`; Playwright Chromium with `ignoreHTTPSErrors: true` (mirrors `playwright.config.ts`, since the sandbox trips on jsDelivr's cert chain that real browsers accept — required for CDN runtimes).
- **Live walkthrough** (`scripts/audit/walkthrough.mjs`, `interact.mjs`, `nav.mjs`, `capture.mjs`, `mcq-shot.mjs`): 24-page representative sample spanning every runtime (Python/JS/TS/SQL exercised; R/C/C++/Java/C#/PHP surveyed) and every component type. Interactions performed: ran JS & Python code blocks, solved a Python challenge via the `window.__dsChallenges` test handle and submitted a wrong answer, answered MCQs (single & multi), opened the Mermaid full-screen modal, ran SQLite queries, and inspected light/dark + mobile (390 px).
- **Static analysis** (`scripts/audit/mcq-lint.mjs`): extracted and parsed all 2,354 `<MultipleChoice>` blocks (template-literal aware) and tallied components across all 781 pages.
- **Server diagnostics:** captured console errors/warnings, page errors, failed requests, and 404s per page.

### 7.2 Corpus scale

781 MDX pages · 2,947 `<CodeBlock>` · 337 `<SqlCodeBlock>` · 611 `<ChallengeCard>` · 30 `<SqlChallengeCard>` (only 6 files) · 2,355 `<MultipleChoice>` · 1,505 Mermaid diagrams · 1,000 `<Callout>`.

### 7.3 Screenshot index (`assets-20260601-learn-courses-ux-audit/`)

| File | Shows |
|---|---|
| `01-learn-index.png`, `03-sidebar-full.png` | `/learn` landing + sidebar |
| `04-course-sidebar.png` | Within-course chapter sidebar (works) |
| `05-home-catalog.png` | The course catalog at `/` (lists all 27 courses) |
| `06-broken-link-404.png` | Bare 404 from a dead `/learn/python` link |
| `07-dark-lesson.png` | Dark-mode lesson (polished) |
| `10/13-mcq-*.png` | MCQ initial + submitted state (duplicate-option bug visible) |
| `20/21-mermaid-*.png` | Mermaid inline + full-screen modal |
| `30/31-js-codeblock-*.png` | JS code block before/after run (~280 ms) |
| `40-python-codeblock-after.png` | Python run (~10.7 s cold boot) |
| `41/42-python-challenge-*.png` | Challenge pass + fail (with diff) |
| `43-python-solution-modal.png` | Reference-solution modal |
| `50/51-sql-*.png` | SQLite code block + result grid |
| `60/62/63-mobile-*.png` | Mobile lesson, challenge card, SQL |

### 7.4 Audit scripts

Reusable, committed under `scripts/audit/`: `walkthrough.mjs`, `interact.mjs`, `nav.mjs`, `capture.mjs`, `mcq-shot.mjs`, `inspect.mjs`, `mcq-lint.mjs`. The `mcq-lint.mjs` linter is the recommended basis for the Phase 4 CI guard.
