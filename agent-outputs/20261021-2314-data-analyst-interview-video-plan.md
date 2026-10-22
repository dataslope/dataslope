# Data Analyst interview prep: video plan

**Track:** `content/interview/data-analyst/` (8 topic pages, a role overview, and a 110-question bank)
**Format:** the editorial style, as the Statistics and Database Design course videos (`video/README.md`; their plans are `agent-outputs/20261016-0300-statistics-course-video-plan.md` and `agent-outputs/20261016-1200-database-design-video-plan.md`).
**Narrator:** Drew.
**Opening:** no Dataslope series intro for now; it is added later (see Decisions).
**Estimate:** about **75 minutes (70 to 85) in 9 videos**, about 57,500 characters of narration. One overview of about 2 minutes, then one video per topic page of 6.5 to 11.5 minutes. Together they answer every one of the track's **156 unique interview questions** once.

## How the videos are cut

One video per topic page, in the track's own order, plus a short overview that opens the series. Each video answers every question its page asks, except those another page owns (below), so a viewer who watches the series has heard the whole track.

Two speeds inside each video:

- **Deep dives** take the questions with a trap or an idea worth drawing: a join that fans out, `NOT IN` against a NULL, averaging ratios, peeking at an A/B test, a truncated axis. Each gets a question card and a built-up figure, 30 to 60 seconds.
- **A rapid-fire round** closes each video with the questions whose answer is one line: what a CROSS JOIN is, `COUNT(*)` against `COUNT(col)`, `value_counts`, named ranges. Each takes 10 to 15 seconds. Pandas has 13 of these and SQL 14, so this is what keeps those two videos moving.

**Each question is answered once.** The pages repeat each other: both SQL pages ask about `ROW_NUMBER`, top N per group, `LAG` and running totals; the statistics page re-asks the A/B, spreadsheet, chart and dashboard questions that have their own pages. A repeated question is answered in the video of the page it belongs to (window functions in Advanced SQL, spreadsheets in Excel, charts and dashboards in Visualization, testing and metrics in A/B testing), and Statistics & communication's two testing questions that A/B testing does not ask (Type I/II errors, power) move there too. That takes 180 questions on the pages to 156 in the videos.

**No video:** the 110-question bank (it is practice), the runnable challenges, and syntax a page shows only as code.

## What the estimate is based on

Measured on 2026-10-21:

| | |
| --- | --- |
| Shipped course videos | 18 (Stats 1 to 9, DbDesign 1 to 9), 106.1 min, 81,297 characters of narration: **137 words a minute** overall, 12.8 characters a second, with the series intro and pauses included |
| Topic pages | 8 pages, 13,170 words of explanatory prose (code, quizzes and challenges stripped), 180 questions |
| Answers | 57 words at the median, 62 on average |
| Model | each question is posed (about 12 words) and answered at about 70% of its written length, plus about 10 words to read a query's or a snippet's result on screen; 0.4 min per video for the hook and the closing bridge (the series intro, 4.6 s, is not in these videos yet, so each runs about 5 s shorter than the model) |

For comparison, the course videos narrate 23 to 24% of their pages' prose (Statistics 23.8%, Database Design 23.0%); at that rate this track would be about 25 minutes, covering 3 to 5 questions a page. Answering every question is what takes it to 75.

## The videos

Order follows the track (`content/interview/data-analyst/meta.json`), so each video can be embedded on its page and still lead into the next one.

| # | Composition | Folder | Page | Questions | Min | Characters |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | DataAnalyst-0-Interview | da-interview | index | (overview) | ~2 | ~1,500 |
| 1 | DataAnalyst-1-Sql | da-sql | sql | 24 | ~10 | ~7,500 |
| 2 | DataAnalyst-2-Pandas | da-pandas | pandas | 30 | ~11.5 | ~8,800 |
| 3 | DataAnalyst-3-StatisticsCommunication | da-statistics-communication | statistics-and-communication | 14 | ~8.5 | ~6,600 |
| 4 | DataAnalyst-4-AdvancedSql | da-advanced-sql | advanced-sql | 20 | ~8 | ~6,000 |
| 5 | DataAnalyst-5-Spreadsheets | da-spreadsheets | excel-and-spreadsheets | 18 | ~7.5 | ~5,800 |
| 6 | DataAnalyst-6-Visualization | da-visualization | data-visualization | 22 | ~11.5 | ~8,900 |
| 7 | DataAnalyst-7-AbTesting | da-ab-testing | ab-testing-and-metrics | 19 | ~9.5 | ~7,400 |
| 8 | DataAnalyst-8-AiAssisted | da-ai-assisted | ai-assisted-analysis | 9 | ~6.5 | ~5,000 |
| | | | **Total** | **156** | **~75** | **~57,500** |

Every video stays under the 9,500-character cap the Statistics course set for a unit video (about 12.4 minutes); Visualization and Pandas are the closest.

### 0. The Data Analyst interview (~2 min)

From `index.mdx`: what the loop looks like (a live SQL screen or a take-home, a few spreadsheet and statistics questions, a "how would you analyze X?" discussion), the four things interviewers probe (SQL fluency, aggregation and framing, communication, tools), what AI has changed (checking beats writing, responsible use, BI tools that answer in plain language, rounds with and without AI allowed), and how the series works: deep dives, then a rapid-fire round, with practice on each page.

### 1. SQL (24 questions, ~10 min; built at 7:57)

**Deep dives**
1. `WHERE` against `HAVING`, and the order a query actually runs in (2 questions)
2. Inner, left, right and full joins
3. Why a join can make a `SUM` too large
4. How NULLs behave in comparisons and aggregates, and `COUNT(*)` against `COUNT(col)` (2)
5. Rows with no match: the anti-join, and `NOT IN` against a NULL
6. `DISTINCT`, and the bug it can hide
7. CTEs against subqueries, and correlated against non-correlated subqueries (2)

**Rapid-fire:** self join; `UNION` against `UNION ALL`; `EXCEPT`; `CASE`; NULL inside `CASE`; `COALESCE` against `NULLIF`; date functions; string functions; clustered and non-clustered indexes; when an index slows writes; `GROUP BY ALL` and `ROLLUP`; finding duplicates; deleting duplicates but keeping one; `CROSS JOIN`.

**Draws on:** LeftJoinTrap and SqlNullTrap (below).

### 2. Pandas (30 questions, ~11.5 min; built at 8:54)

**Deep dives**
1. `loc` against `iloc`, and boolean filtering (2)
2. `groupby`: split-apply-combine, `transform` against `agg`, a percentage of a group's total (3)
3. `merge`, `concat` and `join`; merging on several keys; stacking and resetting the index (3)
4. Missing data, and `ffill` / `bfill` (2)
5. Chained assignment, views and copies (2): script the copy-on-write behavior of pandas 3, which the site runs (3.0.2), and name `SettingWithCopyWarning` as the older behavior interviewers still ask about
6. Vectorization against `apply`; applying a function to rows or columns; `map`, `apply` and `DataFrame.map` (3)
7. Reshaping wide to long, and `pivot` against `pivot_table` (2)

**Rapid-fire:** categorical dtype; sorting and ranking; `value_counts`; datetimes; `resample`; method chaining; dropping duplicates; renaming columns; selecting by dtype; a `CASE`-like column; reading and writing CSV and Excel; `query`; shape, dtypes and memory.

**Draws on:** PandasGroupby.

### 3. Statistics & communication (14 questions, ~8.5 min; built at 8:02)

**Deep dives**
1. The median instead of the mean, on skewed data
2. Correlation is not causation, and what the correlation coefficient does not measure (2)
3. Sampling bias
4. A metric rose 20% week over week: how to investigate
5. Spotting outliers, with percentiles and quartiles (2)
6. Presenting to a non-technical stakeholder, explaining a finding plainly, and communicating uncertainty (3)

**Rapid-fire:** variance and standard deviation; the mode; the normal distribution; population against sample.

The Statistics course videos teach these ideas from scratch (Stats-2 DescribingData, Stats-8 InterpretingResults); this one stays at the length of an interview answer and may borrow their figures.

As built, percentiles and quartiles come before outliers, so the IQR fences are drawn on the quartiles the viewer has just seen, and the three communication questions share one finding (the page's 12% lift, 8% to 16%) on one slide. Numbers come from `check.mjs` in Pyodide with pandas 3.0.2, NumPy and SciPy; the confounder, the survey, the metric and the rapid round's draws are the video's own seeded data, and the outlier and variance figures are the page's.

### 4. Advanced SQL (20 questions, ~8 min)

**Deep dives**
1. What a window function is: `OVER` against `GROUP BY`, and `PARTITION BY` against `ORDER BY` (2)
2. `ROW_NUMBER`, `RANK` and `DENSE_RANK` on ties; the top N per group; `QUALIFY` (3)
3. Frames: `ROWS` against `RANGE`, the default frame, and the `LAST_VALUE` trap it sets (3)
4. Running totals and moving averages (2)
5. Keeping the latest row per key
6. Filling gaps with a date spine

**Rapid-fire:** `LAG` and `LEAD`; `NTILE`; why a window function can't go in `WHERE`; recursive CTEs; bucketing timestamps; pivoting; unpivoting; `PERCENT_RANK` and `CUME_DIST`.

**Draws on:** WindowFunctions.

### 5. Excel & spreadsheets (18 questions, ~7.5 min; built at 7:18)

**Deep dives**
1. Pivot tables, and building a revenue-by-region-and-month cross-tab (2)
2. VLOOKUP's limits, INDEX/MATCH, and XLOOKUP (3)
3. Exact against approximate match: the lookup that is silently wrong
4. Absolute, relative and mixed references
5. `IFERROR`, and the errors it should not hide
6. A spreadsheet or SQL, and the risks of analysis in a spreadsheet (2)

**Rapid-fire:** `SUMIF`/`SUMIFS`; `COUNTIF`/`COUNTIFS`; cleaning messy text; splitting and joining text; how dates are stored; conditional formatting; named ranges; finding and removing duplicates.

### 6. Data visualization (22 questions, ~11.5 min; built at 9:45)

**Deep dives**
1. Choosing a chart for the question
2. Line or bar, and when a pie chart works (2)
3. A histogram against a bar chart, and choosing a bin width (2)
4. Truncated axes, and when a non-zero baseline is fine (2)
5. Log scales
6. Dual-axis charts, and the other ways charts mislead (2)
7. Dashboards: what makes one work, and a dashboard against a report (2)
8. Telling a story with data, and annotations (2)
9. Color: choosing a palette, capping the categories, and accessibility (3)

**Rapid-fire:** 3D and area encodings; the data-ink ratio; Tableau, Power BI and Looker; scatter plots and overplotting; part-to-whole over time.

The longest video, and the one whose figures carry the most: every chart it argues about is drawn, good version beside bad.

### 7. A/B testing & metrics (19 questions, ~9.5 min; built at 9:05)

**Deep dives**
1. What makes a good metric: primary, guardrail and vanity metrics, and the north star (3)
2. Funnels, and step-to-step conversion (2)
3. What an A/B test is for, and the p-value at an analyst's level (2)
4. Statistical against practical significance, and explaining a confidence interval to a stakeholder (2)
5. Sample size and the minimum detectable effect, Type I and Type II errors, and power (3)
6. Peeking
7. Simpson's paradox
8. Ratio metrics that mislead

**Rapid-fire:** a conversion rate in SQL; novelty and primacy effects; cohort analysis; retention curves.

**Draws on:** SimpsonsParadox. Stats-7 TestingHypotheses and Stats-9 StatisticsInPractice teach testing and an A/B test end to end; numbers and figures should agree with theirs.

### 8. AI-assisted analysis (9 questions, ~6.5 min; built at 5:19)

**Deep dives**
1. How the interview changed: rounds with and without AI allowed
2. Checking a query an assistant wrote before the number is shared
3. The mistakes generated queries make, led by the page's date boundary: the assistant's January total of 405.50 against 840.50 with a half-open range
4. Hallucinated insights, and keeping them out of a report
5. What never goes into an AI tool
6. "Walk me through how you used AI on this take-home"

**Rapid-fire:** prompting an assistant for SQL; AI features in BI tools; categorizing survey responses with an LLM.

Closes the series, pointing to the 110-question bank.

## How the videos join up

Each ends on a bridge the next one opens with:

- **0 → 1:** almost every loop opens with SQL. "Next: the SQL screen."
- **1 → 2:** the same questions, asked of a DataFrame. "Next: pandas."
- **2 → 3:** a correct number is half an answer; the other half is what it means and how you say it. "Next: statistics and communication."
- **3 → 4:** back to SQL, for the questions that separate a pass from a strong pass. "Next: advanced SQL."
- **4 → 5:** plenty of questions still arrive as a spreadsheet. "Next: Excel and spreadsheets."
- **5 → 6:** a pivot table answers the question; a chart is how anyone else sees the answer. "Next: data visualization."
- **6 → 7:** the chart that matters most decides whether something ships. "Next: A/B testing and metrics."
- **7 → 8:** anything so far, you may now be asked to check after an assistant did it. "Next: AI-assisted analysis."
- **8** closes the series.

## What is shared

- **The course videos' rules**: narration in takes on `eleven_v4_turbo`, the ElevenLabs sound set, and every rule in the Statistics plan's "Decisions" except the series intro, which these videos leave out for now (see Decisions).
- **An interview kit**, new in `video/src/editorial/interview.tsx`, written once for all six roles:
  - `<QuestionCard>`: the interview question as the scene's headline, read aloud word for word, so it is never text nobody says.
  - `<RapidFire>`: the closing round. Each question arrives with its one-line answer and is ticked off against a count, so the picture changes every few seconds.
  - An `InterviewKit` composition under Assets that shows both, as `ErdKit` shows the ERD kit.
- **Existing videos, folded in as parts** (proposed): LeftJoinTrap and SqlNullTrap in SQL, WindowFunctions in Advanced SQL, PandasGroupby in Pandas, SimpsonsParadox in A/B testing. Each is a 65 to 81 s editorial piece with no voice yet; it is re-voiced by Drew inside the video, its numbers re-run on the engine the page uses, and its standalone composition is kept.

## Making each video

The process is the course videos' (`video/README.md`, and "Making each video" in the Statistics plan). What differs here:

- **Facts come from the page's own engine.** The SQL videos' `check.mjs` runs every query in DuckDB through `scripts/lib/sql-engines.mjs`, the engine and version (`@duckdb/duckdb-wasm` 1.32.0) the pages' `<SqlCodeBlock>`s use, and writes `results.json` for `data.ts` to read. PGlite stays with the Postgres course videos. Pandas, statistics, A/B and chart numbers come from a `measure.py` on pandas 3.0.2, the version the site's Pyodide runs, with seeded randomness. Spreadsheet results are computed the same way from the page's examples.
- **Each question beat is marked** with the question's text, so a chapter list (question and start time) can be written out for each video once embedding is decided.
- **The October review is applied from the start** (`agent-outputs/20261021-0551-course-video-review.md`): `minPause: COURSE_MIN_PAUSE` and 0.6 to 1.0 s after a beat that defines a term or lands a result; anything to be read stays at full strength for at least its word count divided by 2 seconds; no on-screen text that is not spoken; the first figure arrives on a scene's first beat; a term is said beside its symbol the first time; a counter fades in only when it starts moving; one figure-numbering rule and one meaning per color for the whole series.

## Pilot

**Video 1, SQL, first.** It is the round nearly every loop has, it draws on two existing videos, and its facts are all DuckDB queries, so it exercises the interview kit, the rapid-fire round and the DuckDB `check.mjs` together. Review its frames and timeline the way the October review did before building the other eight.

**Built (2026-10-22):** `DataAnalyst-1-Sql`, 7:57, voiced by Drew in four takes (6,148 characters), in `video/src/videos/da-sql/`. It came in under the ~10 min estimate because the rapid-fire round runs at about 7 s a question. What the pilot settled for the series:

- **The scenes draw their own figures** in the editorial kit rather than embedding LeftJoinTrap and SqlNullTrap: the trap and NULL questions are two scenes each in the same tables and colors as the rest of the video. Those videos stay as they are.
- **Questions are numbered, figures are not.** The kicker says "Question 5"; a figure is titled by its table names. A "Fig. 3" beside a "Question 5" would be two counters for one thing.
- **One meaning per color, for every role:** red is the trap, the wrong answer or the error; green is the right answer; yellow is what the narration points at; blue is data. Written down in `video/src/editorial/interview.tsx`.
- **A table arrives as the question finishes being read**, not on the first word that names it, so no scene sits on its question alone for more than a breath.
- **The rapid-fire round is one scene**: a numbered list down the left, ticked as it goes, and each answer on the right. Two questions that share a figure (clustered indexes, then indexes and writes) hold one figure across both rather than cross-fading it into a copy of itself.

## Decisions

- **No Dataslope opening animation yet** (decided 2026-10-21): it will be added later. Until then a video's first scene starts at frame 0, its first beat is `scene: true`, and its script sets no `leadIn`. Adding it later is one change per video, `<SeriesIntro course="Data Analyst Interview Prep" unit="Part N" title="…" />` (the overview with `unit="Overview"`) as the opening scene plus `leadIn: INTRO_LEAD_IN` in the script, and it needs no re-voicing: every beat plays its own cut and every animation is cued to a word, so the whole video moves 4.6 s later. `src/editorial/intro.test.ts` only checks videos whose `Video.tsx` uses `<SeriesIntro>`, so it passes before and checks the lead-in after.
- **Narrator: Drew** (decided 2026-10-21) for every Data Analyst video. Every script sets `voice: "drew"`. Narrators for the other five roles are decided when each is planned.
- **Every question, answered once** (decided 2026-10-21): about 75 minutes, against about 25 for 3 to 5 key questions a page.
- **One video per topic page, in the track's order**, with a short overview first. Prefixed names `DataAnalyst-<n>-<Name>` in a Studio folder `Interview-Data-Analyst`; the five roles to come follow the same pattern.
- **Deep dives and a rapid-fire round** in every topic video (proposed; confirm on the pilot).

## Open decisions

- **Embedding.** Still open from the course plans: where the files are hosted and how a page embeds one. An interview video sits at the top of its page; chapters per question would let a viewer jump to the one they need.
- **Length per sitting.** In a study of edX lecture videos, viewers watched a median of at most about 6 minutes, however long the video (Guo, Kim and Rubin, "How video production affects student engagement", L@S 2014). Chapters are the answer this plan assumes; splitting the two longest videos (Pandas, Visualization) in two is the alternative, at no change in total length.
- **Narration budget.** About 57,500 characters for the series, plus re-voicing only the beats that change after review.
