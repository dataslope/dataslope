# Course Editorial Review — Status Audit

**Date:** 2026-06-27
**Scope:** `content/learn/*` courses (27 total)
**Result:** 27 reviewed · 0 not yet reviewed — **all courses complete**

> **Update 2026-06-28 (PR #537):** ran the editorial pass on nine more
> courses — the entire Python data-science / R / data-viz / DuckDB-analytics
> track — and wired them onto real datasets from the companion
> `dataslope/datasets` repo (the runtime pin was bumped to a commit carrying
> the new CSV/Parquet files). First batch: `data-analysis-python-pandas`,
> `time-series-analysis-python`, `statistics-for-data-science-python`. Second
> batch: `machine-learning-scikit-learn`, `seaborn-foundations`,
> `intro-data-viz-plotly`, `mastering-ggplot2`, `scientific-computing-python`,
> `sql-analytics-duckdb`. Third batch (the remaining fundamentals / NLP
> courses): `python-basics`, `practical-r-for-beginners`,
> `natural-language-processing-python`. **All 27 courses now have an editorial
> pass.** Separately, this PR removed every fumadocs sidebar separator entry
> (`"---"` and labeled) from all 27 course `meta.json` files — they rendered as
> non-clickable dividers that hurt navigation. Tables and the per-PR log below
> reflect this.

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

### ✅ Editorial pass complete (27)

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
| data-analysis-python-pandas | #537 |
| time-series-analysis-python | #537 |
| statistics-for-data-science-python | #537 |
| machine-learning-scikit-learn | #537 |
| seaborn-foundations | #537 |
| intro-data-viz-plotly | #537 |
| mastering-ggplot2 | #537 |
| scientific-computing-python | #537 |
| sql-analytics-duckdb | #537 |
| python-basics | #537 |
| practical-r-for-beginners | #537 |
| natural-language-processing-python | #537 |

### ⬜ Not yet reviewed (0)

None — every `content/learn/*` course has now received an editorial pass.

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

### PR #537 — Python data-science / R / data-viz / DuckDB track (nine courses)
Editorial pass over the entire remaining data track. Bumped `DATASETS_REF`
in `app/_components/runtime/remoteDatasets.ts` to the `dataslope/datasets`
HEAD that carries the new CSV/Parquet files, so these courses pull real data
(penguins, diamonds, california_housing, anscombe, datasaurus, NOAA Mauna
Loa CO₂, lending-club) by repo-relative path through the `datasets` staging
prop — or, for DuckDB, by direct `read_parquet`/`read_csv_auto` on the
pinned remote URLs.

**First batch (pandas · time series · statistics):**
- **data-analysis-python-pandas:** collapsed a six-page history opener into
  two pages and added an "Interesting discussions" section (data disasters
  + a deep-history director's cut); interactive penguins welcome; migrated
  the course off the old `bdi475` HR dataset onto penguins (primary),
  diamonds (scale), and california_housing (a numeric-correlation example);
  migrated/added challenge cards with every printed statistic verified.
- **time-series-analysis-python:** interactive Keeling-curve welcome;
  replaced labeled `meta.json` separators with plain `---`; wired the NOAA
  Mauna Loa CO₂ series through resampling → rolling windows → decomposition
  → stationarity → differencing as the additive counterpoint to airline;
  added four quick-win challenge cards.
- **statistics-for-data-science-python:** Anscombe's-quartet welcome hook;
  replaced nine labeled separators with plain `---`; wired Anscombe, the
  Datasaurus dozen, and Palmer penguins into 16 code blocks across eight
  pages; added verifiable stories (German tank problem, Monty Hall sim,
  Lady Tasting Tea, the ASA 2016 p-value statement, xkcd #882, Galton).

**Second batch (ML · seaborn · plotly · ggplot2 · scientific computing · DuckDB):**
- **machine-learning-scikit-learn:** interactive Palmer-Penguins KNN welcome;
  nine labeled separators → plain `---`; migrated the whole course off
  sklearn's toy datasets onto real data matched to each task — penguins
  (classification), diamonds (regression, target = price), california_housing
  (unsupervised/scaling), lending-club (imbalanced classification) — keeping
  synthetic generators only where a known true function is required;
  re-derived every challenge card with relational asserts; stories
  (Legendre/Gauss least squares, Breiman, perceptron/AI winter, Google Flu).
- **seaborn-foundations:** runnable penguins welcome; migrated penguins/
  diamonds/anscombe usage from `sns.load_dataset` onto staged dataslope CSVs
  (kept tips/fmri/flights, not in the repo); built out the Datasaurus dozen;
  stories (matplotlib/Hunter, the "Sam Seaborn" name, grammar of graphics).
- **intro-data-viz-plotly:** collapsed a seven-page history opener into two
  chapters (keeping Florence Nightingale, plus Snow/Minard/Playfair) with an
  "Interesting discussions" overflow; replaced `px.data.iris` with penguins;
  added an "always look at the data" Anscombe/Datasaurus chapter.
- **mastering-ggplot2 (R/WebR):** runnable penguins ggplot welcome; merged the
  grammar-history pages; staged palmer-penguins via `read.csv` while keeping
  ggplot2's idiomatic built-in `mpg`/`diamonds`; stories (Wilkinson, Wickham,
  R's Ihaka/Gentleman origins).
- **scientific-computing-python:** loop-vs-vectorized welcome; collapsed a
  four-page history opener; wired the Keeling CO₂ series (curve_fit + an FFT
  peak at exactly 1 cycle/year) and california_housing (least squares /
  conditioning); stories (Backus/FORTRAN, Moler/MATLAB, Kahan/IEEE 754, the
  Patriot, Pentium FDIV, and Ariane 5 floating-point disasters).
- **sql-analytics-duckdb:** welcome that queries a remote `diamonds.parquet`
  with no download (DuckDB's signature move); merged the OLAP/OLTP opener;
  wired dataslope Parquet/CSV via `read_parquet`/`read_csv_auto` on pinned
  URLs; stories (DuckDB's CWI origins and the duck Wilbur, MonetDB/C-Store).

**Third batch (python-basics · practical-r · NLP):**
- **python-basics:** interactive welcome; deleted `installation.mdx` (a
  browser-run course needs no install) and relocated `python-history` to an
  end-of-course "Interesting discussions" deep dive; added a real penguins-CSV
  reading example to the files page; stories (Guido/CWI 1989, the Monty Python
  name, the Zen of Python, the walrus operator and the BDFL stepping down, the
  GIL).
- **practical-r-for-beginners:** interactive R welcome; moved five deep-history
  pages to the back (reader runs R by page 3–4 instead of 8); replaced every
  `data(iris)` with Palmer Penguins staged from dataslope while keeping
  idiomatic `mtcars`/`airquality`; stories (Ihaka/Gentleman, S/Chambers, CRAN,
  the `<-` arrow, Tukey/EDA).
- **natural-language-processing-python:** instant zero-download tokenize+count
  welcome; added a TF-IDF chapter and an "Interesting discussions" history page
  (Turing test, Georgetown–IBM/ALPAC, Shannon n-grams, ELIZA, Zipf, word2vec);
  kept the course's NLTK corpora; fixed two invalid `<Callout type="danger">`.

**Sidebar separator removal (whole repo):** removed every `"---"` and labeled
separator entry from the `pages` array of all 27 course `meta.json` files (243
entries total). They rendered in the fumadocs course sidebar as dividers that
looked clickable but were not; grouping is now conveyed by page titles and
order. Also bumped `DATASETS_REF` in `app/_components/runtime/remoteDatasets.ts`
so the data-track courses resolve the new `dataslope/datasets` CSV/Parquet
files.

## How this was determined

Identified via `git log` on `content/learn/`: the five "Editorial pass / overhaul"
commits above are the only commits that performed editorial content review. Each
course directory's history was checked to confirm the 12 unreviewed courses
received only project-wide cosmetic/infra changes, never an editorial pass.
