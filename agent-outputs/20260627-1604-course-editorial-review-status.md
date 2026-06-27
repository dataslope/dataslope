# Course Editorial Review — Status Audit

**Date:** 2026-06-27
**Scope:** `content/learn/*` courses (27 total)
**Result:** 15 reviewed · 12 not yet reviewed

## Background

In June 2026 a reusable "proofread & edit courses" agent prompt was introduced
(PR #486, `7829a09`, 2026-06-11) and then applied to a batch of courses over the
following day. The editorial pass focused on:

- **Compressing multi-page history/intro openers** (e.g. a 7–10 page history
  intro collapsed into 1–2 chapters), with the deep history relocated to an
  optional "Interesting discussions" section near the end.
- **Interactive welcome pages** — the welcome page now opens with a live,
  editable, runnable code block so readers hit interactivity immediately.
- **Adding verifiable "true stories" / programmer lore** where it teaches a concept.
- **Adding challenge cards / exercises** to pages that had none.
- **Accuracy and rendering fixes** (broken links, wrong claims, garbled tables,
  Mermaid syntax, test/instruction mismatches).

The five editorial PRs all landed on 2026-06-12.

## Status by course

### ✅ Editorial pass complete (15)

| Course | PR |
|--------|----|
| beginners-javascript | #487 |
| c-programming-for-beginners | #487 |
| csharp-linq-functional | #487 |
| from-zero-to-cpp | #488 |
| functional-programming-typescript | #488 |
| intro-modern-csharp | #488 |
| systems-programming-c | #489 |
| typescript-from-scratch | #489 |
| java-programming-for-beginners | #490 |
| oop-blueprint-java | #490 |
| java-collections-and-generics-deep-dive | #490 |
| mastering-dsa-cpp | #497 |
| database-design-postgresql | #497 |
| intro-sql-postgres | #497 |
| sqlite-for-beginners | #497 |

### ⬜ Not yet reviewed (12)

| Course |
|--------|
| data-analysis-python-pandas |
| intro-data-viz-plotly |
| machine-learning-scikit-learn |
| mastering-ggplot2 |
| natural-language-processing-python |
| practical-r-for-beginners |
| python-basics |
| scientific-computing-python |
| seaborn-foundations |
| sql-analytics-duckdb |
| statistics-for-data-science-python |
| time-series-analysis-python |

These 12 have only been touched by project-wide cosmetic/infra commits (SVG font
& contrast fixes, course-tag metadata, "hidden test" wording removal, mermaid
fixes) — never an editorial content pass.

**Pattern:** the completed set is the general programming-language track (JS, C,
C++, C#, TypeScript, Java) plus the relational-SQL courses (Postgres, SQLite, DB
design). What remains is almost entirely the Python data-science / R / data-viz /
DuckDB-analytics track.

## Per-PR change summary

### PR #486 — `7829a09` Reusable proofreading/editing agent prompt
Added the parameterized per-course editorial prompt that the passes below follow:
interactive welcome pages, compressing history openers, book-like prose, lean
code blocks/challenge cards via `initCode`, and expanding thin pages. *(Tooling,
not a course edit.)*

### PR #487 — `f8e8dc3` JavaScript · C · C# LINQ
- **beginners-javascript:** collapsed a 7-page history opening into 2 chapters;
  moved non-load-bearing material to a new "Interesting discussions" section;
  interactive welcome `CodeBlock`; fixed a duplicated passage and a bogus IoT
  claim; added true stories (Patriot missile float bug, FizzBuzz lore, tabs-vs-spaces).
- **c-programming-for-beginners:** merged the history intro into one chapter;
  interactive runnable welcome (compile-in-browser); fixed a `malloc` example
  that depended on empty stdin.
- **csharp-linq-functional:** collapsed a 5-page history opening into 2 chapters;
  moved deep history to an "Interesting discussions" page; cut redundant
  previews; fixed a broken link.

### PR #488 — `fb3d834` From Zero to C++ · Functional TypeScript · Intro Modern C#
- **from-zero-to-cpp:** runnable editable welcome demo up top; added true stories
  (Hopper's moth, Hoare's billion-dollar mistake, Ariane 5, RAII, etc.); added
  challenge cards to pages with none; fixed garbled prose and a diagram label.
- **functional-programming-typescript:** runnable-first welcome page; fixed broken
  links to a nonexistent page; repaired two garbled tables; added true stories
  and an IO challenge card.
- **intro-modern-csharp:** consolidated an 8-page history opening into one chapter
  ("The Road to C#"); moved four richest history pages to an optional deep-dive;
  deleted four merged-away pages; interactive welcome; fixed a contradictory
  challenge; updated `meta.json`.

### PR #489 — `97fd1a7` Systems Programming in C · TypeScript from Scratch
- **systems-programming-c:** runnable clang-in-browser welcome block; added
  verifiable lore throughout; pointer/array analogies; slimmed a `Vec` example;
  replaced unverifiable real-world claims with documented ones.
- **typescript-from-scratch:** consolidated the opening so readers run code on
  page one; moved full JS history to an appendix; repaired five broken challenges
  and wrong test matchers; corrected several inaccurate type-system claims;
  reframed sandbox "see the error" claims to match what the runner actually does.

### PR #490 — `78f3636` Three Java courses
- **java-programming-for-beginners:** collapsed a 10-page history intro into 2
  pages; new "Interesting discussions" section; fixed a factual error (Hejlsberg
  was not a Java designer); runnable welcome; added true stories.
- **oop-blueprint-java:** runnable welcome demo up front; added lore and corrected
  attributions (Brooks's law, Alan Kay, Gang of Four, Liskov, CRC cards, etc.).
- **java-collections-and-generics-deep-dive:** runnable welcome demo; added the GJ
  generics origin story and hash-flooding DoS war story; fixed a TypeScript
  generics date and a leftover authoring artifact; documented exact capstone output.

### PR #497 — `f840a73` Editorial overhaul of four courses
- **database-design-postgresql:** merged a 4-page intro into one; interactive
  welcome; added an "Interesting discussions" history section; added many
  `SqlChallengeCard` exercises and real-schema (Chinook / Northwind) blocks;
  three-valued-logic and normalization deep-dives; true stories (SSN wallet,
  Mars Climate Orbiter, Vancouver Stock Exchange).
- **intro-sql-postgres:** consolidated 8 history pages into 2; runnable-first
  welcome; relocated two pages to "Interesting discussions"; added challenge cards.
- **sqlite-for-beginners:** merged overlapping intro/Tables pages; added SQLite's
  flexible-typing origin story; runnable welcome.
- **mastering-dsa-cpp:** interactive welcome (twenty-questions / log-n demo);
  motivation-first openings, lore, and code debriefs across every chapter
  (arrays → strings → lists → stacks/queues → recursion → searching/sorting →
  hashing/trees/heaps/tries → graphs → DP/greedy/backtracking); Mermaid fixes.

## How this was determined

Identified via `git log` on `content/learn/`: the five "Editorial pass / overhaul"
commits above are the only commits that performed editorial content review. Each
course directory's history was checked to confirm the 12 unreviewed courses
received only project-wide cosmetic/infra changes, never an editorial pass.
