# Analytics Engineer interview prep: video series plan

**Asked for** by the owner on 2026-11-20 ("create the analytics engineer
interview series", images on GPT Image 2.6, quality low, transparent
background). Built to the same pipeline as the Data Engineer and Backend
Engineer series: scripts and facts first, then one builder per video
(scenes, art, voice, checks), then registration in the series list, the
openers and the thumbnails.

## What the series is for

The source is the site's track, `content/interview/analytics-engineer/`
(seven topic pages and an overview, about 19,000 words, 146 questions).
Every claim and number in a video comes from those pages or from a run, as
in the other four interview series.

An analytics engineer owns the **transformation layer**: raw warehouse
tables in, tested and documented models out, usually with dbt. So the
series argues **modeling decisions and their failure modes**: what one row
means, what a join does to a sum, when a rebuild is safe to repeat, what a
test proves and what it doesn't, why two dashboards disagree, and why an
assistant writing SQL over raw tables is confidently wrong. SQL and dbt
code appear on screen where reading them is the point (a deduplication, an
incremental filter, a join that fans out), short, and as evidence; never as
a line-by-line walkthrough.

## The parts

Ten videos, about eight to eleven minutes each, plus a short overview.
Composition ids `AnalyticsEngineer-<n>-<Name>`, folders `ae-*`, in an
`Interview-Analytics-Engineer` Studio folder, merged for YouTube like the
other tracks.

| # | Composition | Folder | Title (opener) | Hero | Chars (cap 9,500) |
| --- | --- | --- | --- | --- | --- |
| 0 | AnalyticsEngineer-0-Interview | ae-interview | The interview, now | platypus | ~2,000 |
| 1 | AnalyticsEngineer-1-FactsAndGrain | ae-facts-and-grain | Facts, dimensions and grain | sparrow | ~9,000 |
| 2 | AnalyticsEngineer-2-ChangingDimensions | ae-changing-dimensions | Dimensions that change | hermit crab | ~7,000 |
| 3 | AnalyticsEngineer-3-Dbt | ae-dbt | How dbt builds a project | weaver bird | ~8,500 |
| 4 | AnalyticsEngineer-4-Incremental | ae-incremental | Incremental models | snail | ~7,000 |
| 5 | AnalyticsEngineer-5-AdvancedSql | ae-advanced-sql | Advanced SQL | giraffe | ~8,500 |
| 6 | AnalyticsEngineer-6-Warehousing | ae-warehousing | Warehouses and what they cost | camel | ~7,500 |
| 7 | AnalyticsEngineer-7-Testing | ae-testing | Testing and data quality | woodpecker | ~8,500 |
| 8 | AnalyticsEngineer-8-Metrics | ae-metrics | Metrics and the semantic layer | pelican | ~8,500 |
| 9 | AnalyticsEngineer-9-AiSemanticLayer | ae-ai-semantic-layer | AI and the semantic layer | dolphin | ~7,000 |
| | | | | **Total** | **~73,500** |

Every hero is a creature no earlier video or thumbnail drew (checked
against every `illustrations.json` on 2026-11-20). The platypus, an animal
that is half one thing and half another, is the overview's hero and the
track's YouTube thumbnail animal: the role sits between data engineering
and analytics. The others carry their part's idea where one fits: the
sparrow and grain, the hermit crab that moves into a new shell and leaves
the old one (a Type 2 history), the weaver bird whose nest is built strand
by strand on the strands before it (a DAG of refs), the snail that only
ever adds a little, the giraffe at a window, the camel that carries the
load and charges for it, the woodpecker that taps every trunk, the pelican
that holds one catch for everyone, the dolphin for the assistant.

Each follows the house interview format (`src/editorial/interview.tsx`): a
question on screen, the answer argued through figures, a rapid round of
the shorter questions, and a "Next" line into the following part. The
overview has no question cards.

## Which video answers which question

Each of the pages' 146 questions is answered once, by its heading. Several
are asked twice in near-identical words on two pages; those are answered
together, in the video named below, and the pair counts once.

- **0, The interview, now** (index, and ai-and-the-semantic-layer's "How has
  the Analytics Engineer interview changed with AI?"): what interviewers
  probe, how AI changed the interview, the map of the series, the
  practice on the site. No question cards; a narrated overview.
- **1, Facts, dimensions and grain** (dimensional-modeling, 22): fact and
  dimension tables; the grain; star vs snowflake; surrogate keys; the three
  types of fact tables; additive, semi-additive and non-additive measures;
  conformed; degenerate; role-playing; junk; factless fact; bridge table;
  Kimball vs Inmon; 3NF and why dimensions avoid it; the many-to-many
  customers and accounts in a bank; the date dimension; periodic snapshot
  vs transaction fact; drilling across; hash vs sequence surrogate keys;
  grain vs level of aggregation; why not store ratios in a fact; confirmed
  vs conformed.
- **2, Dimensions that change** (dimensional-modeling, 8, and dbt's "What is
  `dbt snapshot`, and what SCD type does it implement?"): SCD Types 0, 1, 2
  and 3; late-arriving dimension records; late-arriving facts; the
  mini-dimension; a slowly changing measure; dbt snapshots.
- **3, How dbt builds a project** (dbt, 18; dimensional-modeling's "How do
  staging, intermediate, and mart layers differ?"; data-warehousing's
  "Compare the materializations: view vs table vs incremental.", answered
  with dbt's "Compare the materializations: view, table, incremental,
  ephemeral."): what dbt does; `ref()` and `source()`; the lineage DAG and
  how it is built; documentation and lineage; the layers; materializations;
  ephemeral models; `dbt run`, `test` and `build`; selecting a subset;
  seeds; macros; packages; variables; exposures; environments and
  targets; environment-specific schemas; `dbt_project.yml`; versioning a
  model; `dbt debug`.
- **4, Incremental models** (dbt, 5; data-warehousing, 5; advanced-sql's "How
  do you select new rows since the last load (incremental filtering)?"):
  when incremental and what's the catch, and when incremental over a full
  rebuild (together); how an incremental model filters new rows (dbt's,
  the warehousing page's and advanced-sql's, together); `{{ this }}`;
  `unique_key`; an idempotent rebuild; `MERGE` and idempotent upserts;
  `--full-refresh` against a normal run, and why periodic full refreshes
  are still needed (together).
- **5, Advanced SQL** (advanced-sql, 19): window functions vs `GROUP BY`; the
  three parts of `OVER`; `ROW_NUMBER`, `RANK`, `DENSE_RANK`; latest record per
  key; `QUALIFY`; CTEs; recursive CTEs; running totals and the frame; `ROWS`
  vs `RANGE`; period-over-period; the date spine and generating dates in
  Postgres (together); pivot; unpivot; divide-by-zero; ratios from summed
  components; a window and an aggregate in one query; top N per group;
  `COUNT(DISTINCT)`.
- **6, Warehouses and what they cost** (data-warehousing, 13;
  dimensional-modeling's "What is a wide (one-big-table) approach, and when
  is it appropriate?", answered with the warehousing page's "Why is a wide,
  denormalized one big table sometimes preferred?"): cloud vs traditional;
  Snowflake, BigQuery and Redshift; columnar storage; `SELECT *`;
  partitioning and pruning; clustering; OLTP vs OLAP; virtual warehouses
  and slots; controlling cost; the result cache; distribution and sort
  keys; when partitioning or clustering hurts; one big table.
- **7, Testing and data quality** (testing-and-data-quality, 19; dbt, 7, of
  which 5 pair with the testing page's): what "asserts" means; the four
  built-in generic tests (both pages); generic vs singular (both); what a
  failing uniqueness test surfaces; source vs model tests; source
  freshness and how it differs from a test (both pages' three questions);
  data contracts (both); severity; compound keys; `dbt_utils` and
  `dbt_expectations`; unit vs data tests; `store_failures`; CI (both); a
  failure in CI vs in production; where tests live; alert fatigue;
  testing vs observability; testing that a metric is correct; fixing
  upstream; and dbt's "How do dbt tests work?".
- **8, Metrics and the semantic layer** (metrics-and-semantic-layer, 18): what
  a semantic layer is; a single source of truth; metric drift; the dbt
  Semantic Layer and MetricFlow; LookML; the fan trap and avoiding it; the
  chasm trap; measure vs metric; what a metric definition contains;
  additive, semi-additive and non-additive metrics; why pre-aggregated
  distinct counts and ratios can't be summed; ratio metrics; two
  dashboards that disagree; governance; entities, dimensions and
  measures; cumulative metrics; when a wide mart beats the semantic layer.
- **9, AI and the semantic layer** (ai-and-the-semantic-layer, 6): why
  text-to-SQL over raw tables is confidently wrong; what a semantic layer
  changes for an assistant; an AI-ready dbt project; evaluating an
  analytics assistant; how assistants connect to the warehouse and
  governed metrics; reviewing a dbt model an assistant wrote.

Counted: 1 + 22 + 9 + 20 + 11 + 19 + 14 + 26 + 18 + 6 = 146.

## How the videos join up

- **0 → 1:** every round starts from the model, and every model from its
  grain.
- **1 → 2:** the star is drawn; then a customer moves house.
- **2 → 3:** those models have to be built in order, every day: that is
  dbt.
- **3 → 4:** rebuilding a billion-row table every night is the cost that
  incremental models cut.
- **4 → 5:** the SQL inside the models: windows, deduplication, spines.
- **5 → 6:** where that SQL runs, and what it costs to scan.
- **6 → 7:** a cheap model that is wrong costs more: tests.
- **7 → 8:** every test passes and two dashboards still disagree.
- **8 → 9:** and now the reader is a language model.
- **9** closes the series.

## Reuse

The track overlaps earlier series: dimensional modeling and history
(Data Engineer 3 and 4), warehousing (Data Engineer 9), window functions
and deduplication (Data Analyst 4, Data Engineer 1), the fan-out join
(Data Analyst, Database Design). Where a question here is near-identical to
one an earlier video answers, its scene, its table or its measured
`results.json` may be reused (imported, or copied into the folder and
re-cued), so the cost of the question is its narration and the series'
numbers agree with each other. Each video is still self-contained: never
"as we saw", never "in the last video".

## Look, voice, art

- The editorial style every video uses, with every rule in
  `video/README.md` "What goes on screen" from the first draft: one size
  and one family per line; no cards (badges stay, borderless); diagram
  boxes outlined in ink, not filled; hairlines between columns; red
  kickers; nothing under 19px.
- **Voice:** Drew, `eleven_v4_turbo`, in takes of about 1,800 characters.
  About 73,500 characters, about 16,000 credits at the 0.22 a character
  measured on earlier series; the account had 162,141 available on
  2026-11-20.
- **Initialisms:** written as people write them. The lexicon gets YAML
  ("yammel"); dbt, SCD, OLTP, CTE, KPI and LookML's "ML" are read letter
  by letter, which a test take on 2026-11-20 confirmed for dbt. SQL
  keywords are written in lowercase words in the narration ("qualify",
  "merge", "row number"), as the Data Engineer series wrote them; the
  screen keeps their capitals. Expand on first use only what a beginner may
  not know (SCD, OLTP, OLAP, CTE, DAG, BI).
- **Art:** GPT Image 2.6 (`gpt-image-2.6-flare`), quality `low`,
  transparent background, the watercolor style every video file carries.
  Each video: its hero and a few small spots, only where the layout has
  room. About $0.02 an image.
- **Thumbnail:** `Thumb-AnalyticsEngineer`, green interview scheme, the
  platypus hung top-right.

## Phases

1. **Scripts and facts**: five writers, one per pair of videos that share
   pages (0 and 9, 1 and 2, 3 and 4, 5 and 6, 7 and 8), to
   `20261120-ae-interview-build/BRIEF-SCRIPTS.md`. The coordinator reads
   every script before anything is built on it.
2. **Build**: one builder per video (scenes, art, voice, checks), to
   `20261120-ae-interview-build/BRIEF-BUILD.md`, each on a private entry.
3. **Registration**: `Root.tsx`, `series.ts` (openers), the thumbnail track,
   the lexicon; then the package's checks with all ten in.
