# Data Engineer interview prep: video plan

**Track:** `content/interview/data-engineer/` (9 topic pages, a role overview, and a 110-question bank)
**Format:** the editorial style and interview kit the Data Analyst and Data Scientist series use (`video/README.md`; their plans are `20261021-2314-data-analyst-interview-video-plan.md` and `20261022-0445-data-scientist-interview-video-plan.md`): `<EditorialPage>`, `EDITORIAL_DEFAULTS`, `QuestionCard` and `RapidFire` from `video/src/editorial/interview.tsx`.
**Narrator:** Drew, as in the other two interview series.
**Opening:** no Dataslope series intro, as in the other two series.
**Estimate:** about **90 minutes in 12 videos**, about 69,000 characters of narration: a 2-minute overview, then 11 topic videos of 6 to 11 minutes. Together they answer every one of the track's **157 unique interview questions** once.

## What is new in this series

Three instructions from the user, 2026-10-30, that differ from the earlier series:

1. **Expand an initialism only when a beginner may not know it.** The earlier series expanded every abbreviation the first time it was said, AI included. Here, AI, SQL, API, CSV, JSON, CPU and PDF are said as they are. Expanded on first use, in each video that says them: CTE, SCD, OLTP, OLAP, CDC, ETL, ELT, DAG, SLA, RDD, ACID, ORC, UUID, RAG. Where an initialism is only an abbreviation of words that are easy to say (DLQ, ANN, MV, PK), say the words and never the letters.
2. **SQL is pronounced "sequel".** The narration writes it `sequel` (`Sequel` at the start of a sentence), as `db-relational-history` already does for its "Sequel" beat; Drew reads it as the word. On screen it stays `SQL`. The same goes for compounds: "Spark sequel", "no sequel", "my sequel"; PostgreSQL is said "Postgres". `src/narration/acronyms.test.ts` fails any `de-` script whose narration still writes `SQL`.
3. **Reuse earlier videos' content where the overlap is near-identical.** Many questions are asked in the same words on Data Analyst and Data Scientist pages that already have videos, and several course videos teach exactly one of them. Those scenes, their tables and their measured `results.json` are reused (imported, or copied and re-cued to this video's beats), so the cost of such a question is its narration, not a new figure, and the series' numbers agree with each other. See "Reuse" under each video.

Images and resolution are as before: GPT Image 2.5 (`gpt-image-2.5-flare`), quality `low`, transparent background, through the Batch API; every composition is laid out at 1920x1080 and renders at 4K with `--scale=2`, with `check:frames` confirming no illustration is drawn larger than its pixels at 4K.

## How the videos are cut

One video per topic page, in the track's order, plus a short overview. Two pages are too long for one video under the 9,500-character cap: **SQL** (32 questions) becomes patterns and performance, and **Data modeling** (30) becomes dimensional modeling and history. Every other page is one video.

Two speeds inside each video, as before: **deep dives** for the questions with a trap or a mechanism worth drawing (30 to 60 seconds each, a question card and a figure built as it is answered), then a **rapid-fire round** for the one-line answers (about 7 to 10 seconds each).

**Each question is answered once.** The Pipelines & systems page is a survey that asks, nearly word for word, most of what Streaming, Data warehousing and Orchestration & reliability ask in depth. A repeated question is answered in the video of the page whose topic it is; where two pages have an equal claim, in the first of them in track order. That takes the pages' 182 questions to 157:

| Asked on | Question | Answered in | Why |
| --- | --- | --- | --- |
| Streaming | Batch vs streaming | Pipelines | equal claim; Pipelines comes first |
| Orchestration | Why is idempotency the foundation of reliable pipelines? | Pipelines | equal claim to Pipelines' idempotency question; Pipelines comes first |
| Data warehousing | ETL vs ELT, and why ELT became the default | Pipelines | equal claim; Pipelines comes first |
| Pipelines | Exactly-once vs at-least-once; watermarks; late data; event time vs processing time (4) | Streaming | Streaming's own subject, and it asks all four |
| Pipelines | Partitioning and the partition key; Parquet over CSV; small files; Avro; ORC; the lakehouse; cost (7) | Data warehousing | storage and formats are Data warehousing's subject; its "Compare Parquet, ORC, and Avro" answers the three format questions at once |
| Pipelines | Orchestrator vs cron; DAG anti-patterns; backfills; task vs sensor; data-quality testing; circuit breakers; SLAs (7) | Orchestration | Orchestration & reliability's own subject, and it asks each |
| Pipelines | How Dagster models pipelines differently from Airflow | Orchestration | not a duplicate, but an orchestrator question; moved so it sits beside "what an orchestrator gives you" |
| Orchestration | Dead-letter handling | Streaming | equal claim to Streaming's dead-letter queue; Streaming comes first |
| Data warehousing | SCDs (the page calls it a recap); the star schema (2) | Modeling II, Modeling I | Data modeling's subject |
| Data warehousing | Materialized views | SQL II | SQL asks it first, word for word |

Data warehousing's "OLTP vs OLAP, and how does storage differ?" and Data modeling's "OLTP vs OLAP, and how does schema design differ?" are kept as two questions: they share a first clause and ask about different things, rows on disk against tables in a schema.

**No video:** the 110-question bank (it is practice), the concept checks, the runnable challenges, and code a page shows without asking about it.

## The videos

Order follows the track (`content/interview/data-engineer/meta.json`). Compositions are named `DataEngineer-<n>-<Name>` in a Studio folder `Interview-Data-Engineer`.

| # | Composition | Folder | Page | Questions | Min | Characters |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | DataEngineer-0-Interview | de-interview | index | (overview) | ~2 | ~1,600 |
| 1 | DataEngineer-1-SqlPatterns | de-sql-patterns | sql (I) | 22 | ~9.5 | ~7,300 |
| 2 | DataEngineer-2-SqlPerformance | de-sql-performance | sql (II) | 10 | ~7 | ~5,400 |
| 3 | DataEngineer-3-DimensionalModeling | de-dimensional-modeling | data-modeling (I) | 15 | ~8.5 | ~6,500 |
| 4 | DataEngineer-4-ModelingHistory | de-modeling-history | data-modeling (II) | 15 | ~8.5 | ~6,500 |
| 5 | DataEngineer-5-Python | de-python | python | 18 | ~9 | ~6,900 |
| 6 | DataEngineer-6-Pipelines | de-pipelines | pipelines | 11 | ~7 | ~5,400 |
| 7 | DataEngineer-7-DistributedProcessing | de-distributed | distributed-processing | 17 | ~9 | ~6,900 |
| 8 | DataEngineer-8-Streaming | de-streaming | streaming | 15 | ~8.5 | ~6,500 |
| 9 | DataEngineer-9-Warehousing | de-warehousing | data-warehousing | 9 | ~6.5 | ~5,000 |
| 10 | DataEngineer-10-Orchestration | de-orchestration | orchestration-and-reliability | 14 | ~8 | ~6,100 |
| 11 | DataEngineer-11-PipelinesForAi | de-pipelines-for-ai | pipelines-for-ai | 11 | ~8 | ~6,100 |
| | | | **Total** | **157** | **~90** | **~69,000** |

The minutes are the Data Scientist series' built pace (about 0.55 minutes a question with a rapid round, 0.75 for a video of deep dives only), not a target: the cap that matters is 9,500 characters a video, checked on the script before anything is voiced.

**Engines.** SQL runs in DuckDB-Wasm 1.32.0, the engine the SQL pages' `<SqlCodeBlock dialect="duckdb">` blocks run, and in the site's Postgres 18 (PGlite) where a question is about B-tree indexes, plans or partitions that DuckDB does not have, both through a `check.mjs` (`scripts/lib/sql-engines.mjs`, or the harness `da-sql/check.mjs` uses). Python runs in Pyodide 314.0.7 with pandas 3.0.2. **Spark, Kafka, Airflow, Dagster, dbt and vector databases do not run here.** Their mechanisms are drawn, and where a number helps it comes from a small, seeded simulation in Python that the video calls a simulation ("model it with eight partitions…"), never from output presented as Spark's or Kafka's. A number that cannot be computed honestly is not shown.

### 0. The Data Engineer interview (~2 min)

From `index.mdx`: what the loop asks (hard SQL, data modeling, "design a pipeline for X", systems and formats), the four things interviewers probe, what AI has changed (RAG ingestion as a design prompt, vector search trade-offs, governance for AI data, AI-written pipeline code and rounds that allow an assistant), and how the series runs: eleven videos, 157 questions, deep dives then a quick round, practice on each page (counted by `check.mjs`: concept checks, challenges, the 110-question bank).

**Hero:** a meerkat standing lookout.

### 1. SQL I: window functions and query patterns (22 questions)

**Deep dives** (numbered aloud):
1. Keeping the latest row per key: `ROW_NUMBER` in a subquery, then `QUALIFY` (2, with the ranking trio's tie behavior on the way)
2. `WHERE` against `HAVING`, and the logical order a query runs in (2)
3. Window frames, `ROWS` against `RANGE`, and a 7-day moving average over days with gaps, where `ROWS 6 PRECEDING` is not seven days (2)
4. Detecting and filling gaps in a time series with a date spine
5. Gaps-and-islands: the row-number difference that labels each streak
6. Rows in one table but not another: the anti-join, and `NOT IN` against a NULL
7. A recursive CTE (common table expression), on a small hierarchy

**Rapid-fire:** `RANK`, `DENSE_RANK` and `ROW_NUMBER` (if not taken by deep dive 1); finding duplicates; CTE against subquery; `UNION` against `UNION ALL`; `LAG` and `LEAD`; a running total; pivoting; the four joins; `NTILE`; `PERCENT_RANK` against `CUME_DIST`; `COALESCE`; `CROSS JOIN`.

**Reuse:** DA Part 4 Advanced SQL (`da-advanced-sql`: rankings, `QUALIFY`, frames, the default frame, running totals, moving averages, latest row per key, the date spine, and its rapid `LAG`/`NTILE`/recursive CTE/pivot/`PERCENT_RANK` items), DA Part 1 SQL (`da-sql`: the order a query runs, the four joins, the anti-join and `NOT IN`, CTEs and correlated subqueries, and its rapid `UNION`/`COALESCE`/duplicates/`CROSS JOIN` items), DS Part 10 SQL (`ds-sql` rapid round), and the course videos WindowFunctions and SqlNullTrap. The page's own tables (four `<SqlCodeBlock>`s) win where they exist; where the question is word for word the DA one, use the DA table and result so the series agree.

**Hero:** a koala.

### 2. SQL II: performance (10 questions)

**Deep dives:**
1. A slow query: what to check first, and reading an `EXPLAIN` plan (2), on a seeded table in Postgres
2. What an index is, when it helps, and when it hurts: `Seq Scan` becomes `Index Scan` on a selective filter and stays a scan on an unselective one; every write pays for every index
3. Covering indexes: `INCLUDE`, and the `Index Only Scan`
4. Clustered against non-clustered indexes (Postgres keeps no clustered index; `CLUSTER` sorts once)
5. Partition pruning: a table partitioned by month, and the plan that touches one partition
6. Correlated subqueries, and why they can be slow: the `SubPlan` run per row, and the join or window rewrite
7. Joining two large tables at scale: shrink both sides first, then the join strategy (hash, sort-merge, broadcast; Part 7 draws the distributed side)
8. Transaction isolation levels: the anomalies each level allows, drawn as two transactions on a timeline (PGlite is single-connection, so this one is a mechanism, not a run)
9. Materialized views: stored results, stale until refreshed (with Data warehousing's question)

No rapid round is needed; if the script runs long, the last two can go at speed.

**Reuse:** DA Part 1's rapid clustered/non-clustered and index-slows-writes items.

**Hero:** a cheetah.

### 3. Data modeling I: dimensional modeling (15 questions)

**Deep dives:**
1. Fact and dimension tables, and the star against the snowflake schema (with Data warehousing's star question) (2)
2. The grain, declared first, and a grain mismatch that double-counts (2)
3. Normalization against denormalization, and 1NF, 2NF and 3NF (2)
4. OLTP (online transaction processing) against OLAP (online analytical processing): how the schema differs
5. Surrogate keys against natural keys
6. The three types of fact table (transaction, periodic snapshot, accumulating snapshot)
7. Additive, semi-additive and non-additive measures: an account balance summed over days

**Rapid-fire:** conformed dimensions; wide against narrow tables; the bus matrix against a data mart; the date dimension; measure against metric.

**Reuse:** the Database Design course videos `db-normalization` (1NF to 3NF), `why-normalization` (the anomalies), `db-keys` (natural and surrogate keys), and the ERD kit (`src/editorial/erd.tsx`) for every schema drawn.

**Facts:** the page's three `<SqlCodeBlock>`s in DuckDB; the semi-additive and grain-mismatch numbers from small tables the video builds and labels as its own.

**Hero:** a starfish.

### 4. Data modeling II: history and special dimensions (15 questions)

**Deep dives:**
1. Preserving history when an attribute changes: SCD (slowly changing dimension) types 1, 2 and 3, with Data warehousing's recap
2. SCD Type 2 in practice: effective dates, a current flag, and the fact that joins to the version true at its time
3. SCD Type 0, and Types 4 and 6 (2)
4. Late-arriving dimension members: the placeholder row, updated when the member arrives
5. Snapshot against insert-only fact tables
6. Bridge tables, and many-to-many between facts and dimensions (2)
7. Data vault, and when to choose it over a star

**Rapid-fire:** degenerate, junk, role-playing and mini-dimensions; factless fact tables; a surrogate key sequence against a UUID (universally unique identifier).

**Reuse:** `db-relationship-patterns` (the many-to-many junction), `db-keys`, the ERD kit.

**Facts:** SCD Type 2 rows and the point-in-time join run in DuckDB on a table the video builds (or the page's, where it has one).

**Hero:** a chameleon.

### 5. Python for data engineering (18 questions)

**Deep dives:**
1. A generator against a list, and generator pipelines against intermediate lists (2), with memory measured in Pyodide (`tracemalloc` or `sys.getsizeof`)
2. Processing a file too big for memory, and a large CSV in pandas with `chunksize` (2)
3. Iterable against iterator: the iterator that is empty the second time
4. Why dict and set lookups are O(1), and when it matters
5. Deduplicating in memory, and the latest record per key in plain Python and in pandas (2)
6. Joining two datasets in memory: build a dict on the smaller side
7. Fixed-size batches
8. Retries with exponential backoff and jitter, and what not to retry
9. An idempotent transform: keyed upserts, run twice, same result
10. Cleaning messy delimited records, and parsing malformed numbers and dates (2)

**Rapid-fire:** aggregating a stream without holding the rows; pandas against plain Python; `groupby` and aggregation; common performance pitfalls.

**Reuse:** the course video ListVsSet (`999_999 in big_list` against a set: exactly question 6), DA Part 2 Pandas and DS Part 9 Python & pandas (`groupby`, keeping the latest row, vectorization).

**Facts:** Pyodide 314.0.7, the page's ten runnable blocks where they answer the question. Timings measured in WebAssembly are not a laptop's: show a ratio and say where it was measured, or say "many times faster" without a number.

**Hero:** an ant.

### 6. Pipelines & systems (11 questions)

**Deep dives:**
1. Batch against streaming, and how to choose (with Streaming's question)
2. Idempotency: a rerun that doubles a total, and the overwrite or merge that doesn't (with Orchestration's question)
3. ETL (extract, transform, load) against ELT, and why ELT became the default (with Data warehousing's question)
4. CDC (change data capture): reading the database's log instead of polling for changed rows
5. Schema evolution in Parquet and Avro, and schema changes from source systems that must not break downstream (2)
6. The medallion architecture: bronze, silver, gold
7. Lambda against Kappa

**Rapid-fire:** dbt; the fan-out problem (one upstream correction that invalidates thousands of downstream aggregates); data lineage.

**Facts:** the page's one DuckDB block (idempotent overwrite or similar), run; the rest are mechanisms.

**Hero:** a mole.

### 7. Distributed processing (17 questions)

**Deep dives:**
1. The MapReduce mental model, and how Spark differs from Hadoop MapReduce (2)
2. Transformations against actions, and why Spark is lazy (2)
3. Partitions, and why the count matters
4. Narrow against wide dependencies, the shuffle, and stages and tasks (3)
5. Data skew, and salting
6. Broadcast joins against sort-merge joins (2)
7. `groupByKey` against `reduceByKey`: what crosses the network
8. Fault tolerance through lineage, and caching (2)

**Rapid-fire:** RDD (resilient distributed dataset) against DataFrame; why not `collect()`; predicate and projection pushdown.

**Reuse:** the course video PandasGroupby (split, apply, combine on a seven-row frame) for the MapReduce idea. The page's charts `memory-latency-ladder` and `tail-latency-fanout` are the source for any latency claim.

**Facts:** no Spark here. Partition counts, shuffle sizes and the skewed key come from a seeded Python simulation, labelled as one.

**Hero:** a honeybee.

### 8. Streaming & messaging (15 questions)

**Deep dives:**
1. Kafka's topics, partitions and offsets, and why the partition count matters (2)
2. Consumer groups, and committing offsets (2)
3. At-most-once, at-least-once and exactly-once, and where the commit sits for each (with Pipelines' question)
4. Idempotent consumers, and how Kafka achieves exactly-once (2)
5. Event time against processing time, watermarks and late data (3, with Pipelines' three)
6. Window types: tumbling, sliding, session
7. Backpressure

**Rapid-fire:** log compaction; stream joins against batch joins; dead-letter queues (with Orchestration's dead-letter question).

**Facts:** no Kafka here: offsets, a rebalance and a watermark are drawn on the video's own small stream of events, with any counts from a seeded Python simulation labelled as one.

**Hero:** a salmon.

### 9. Data warehousing & storage (9 questions)

**Deep dives:**
1. OLTP against OLAP storage: rows against columns, and why columnar is faster for analytics (2)
2. Parquet, ORC (optimized row columnar) and Avro, and why Parquet beats CSV for analytics (with Pipelines' Parquet, Avro and ORC questions)
3. Why compression works better on a column
4. Partitioning and a good partition key, and clustering within a partition (2, with Pipelines' partitioning question)
5. File size and the small files problem (with Pipelines' question)
6. What drives cost in a cloud warehouse and a pipeline (with Pipelines' cost question)
7. Data lake, warehouse and lakehouse (with Pipelines' question)

**Facts:** DuckDB writes and reads Parquet; measure the same seeded table as CSV and as Parquet (bytes, and the columns a query reads) if DuckDB-Wasm in Node can write to its in-memory filesystem, or in Pyodide if it ships `pyarrow`. Probe first. The page's chart `compression-ratio-speed` and its two `<SqlCodeBlock>`s are the other sources.

**Hero:** a hamster.

### 10. Orchestration & reliability (14 questions)

**Deep dives:**
1. What an orchestrator gives you over cron, and how Dagster's assets differ from Airflow's tasks (2)
2. DAG (directed acyclic graph) anti-patterns
3. Retries: what to retry and what not to, against backfills and reruns (2)
4. Backfills, designed in from the start
5. Data-quality checks and where they go in the DAG, and the circuit breaker that stops bad data spreading (2)
6. SLAs (service level agreements) and freshness (2)
7. Sensors, and reschedule mode

**Rapid-fire:** dependencies between separate pipelines; what to monitor and alert on; making a pipeline observable and debuggable.

**Facts:** the page's charts `idempotency-retry-storm`, `incremental-vs-full-refresh` and `circuit-breaker-states`; a retry storm or backoff schedule computed in Python.

**Hero:** a border collie.

### 11. Pipelines for AI (11 questions)

**Deep dives:**
1. How the interview has changed with AI
2. The RAG (retrieval-augmented generation) ingestion pipeline: parse, chunk, embed, index, keep fresh
3. Choosing a chunking strategy
4. Keeping embeddings fresh without re-embedding everything, and switching embedding models (2)
5. Exact against approximate nearest-neighbor search
6. pgvector or a dedicated vector database
7. Why metadata filters make vector search harder
8. Hybrid search, and when embeddings alone fail
9. Access control and deletion in a RAG pipeline
10. Estimating the cost and time of an embedding backfill

**Reuse:** the course videos `llm-meaning` (embeddings as positions), `llm-tokens` (sizes in tokens) and `tf-idf` (the keyword side of hybrid search).

**Facts:** the page's one Python block; the backfill estimate is arithmetic on the page's own numbers; recall of an approximate index, if shown, from a seeded NumPy simulation labelled as one.

**Hero:** a llama. Closes the series, pointing to the 110-question bank.

## How the videos join up

Each video ends on a bridge into the next, written fresh:

- **0 → 1:** nearly every loop opens with hard SQL.
- **1 → 2:** the same queries, now on tables too big to scan.
- **2 → 3:** a fast query starts with tables shaped for it.
- **3 → 4:** dimensions change, and the model has to keep history.
- **4 → 5:** loading the model takes code.
- **5 → 6:** one script becomes a pipeline that runs every day.
- **6 → 7:** the data outgrows one machine.
- **7 → 8:** the data never stops arriving.
- **8 → 9:** where it all lands, and how it is stored.
- **9 → 10:** keeping it all running on time.
- **10 → 11:** the newest pipelines feed AI systems.
- **11** closes the series.

## What carries over from the earlier series

- **Questions are numbered, figures are not.** Deep-dive questions are numbered aloud; rapid-round numbers appear on screen only.
- **One meaning per color:** red the trap, the wrong answer or the error; green the right answer; yellow what the narration points at; blue data.
- **A figure arrives as its question finishes being read.**
- **Nothing stands still for more than 3 seconds** (`check:motion`).
- **Each opening, the turn into the quick round, its lead-in and the closing bridge are written fresh.**
- **One watercolor hero per video, a creature neither earlier interview series used**, in the order above: meerkat, koala, cheetah, starfish, chameleon, ant, mole, honeybee, salmon, hamster, border collie, llama.
- **Voice:** Drew on `eleven_v4_turbo`, in takes of about 1,800 characters. After review, re-voice only the beats whose text changed.
- **Timing:** `minPause: COURSE_MIN_PAUSE`; every animation cued to a word; then `check:cues`, `check:sync`, `check:frames`, `check:motion` and `check:mix`.
- **Facts come from the page's engine**, through a `check.mjs` that writes `results.json` for `data.ts` to read.

And what the Data Scientist review (`20261029-1040-ds-interview-video-review.md`) found most often, written into the builders' brief so it is built right the first time: answers that stop one step before the interviewer's follow-up; figures that disagree with their narration; colors against their meanings; text crossed by lines; listing highlights found by index rather than by text (`lineOf`); SVG text colored with CSS `color`; text under 19px; `TABULAR` over hyphenated words; blank pages at a cut; openings that promise more than the video delivers.

## Building order

All twelve at once, one builder agent per video, working to `20261030-de-interview-video-build/BRIEF.md`. The heroes are generated up front, in one pass, so no builder waits on a batch. Renders share four CPUs, so every heavy render goes through one queue (`video/out/render-slot.sh`).
