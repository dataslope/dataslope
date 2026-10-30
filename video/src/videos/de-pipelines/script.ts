import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Pipelines & systems" (16:9), Part 6 of the Data Engineer
 * interview prep videos
 * (agent-outputs/20261030-1600-data-engineer-interview-video-plan.md), after
 * content/interview/data-engineer/pipelines.mdx. It answers the eleven of the
 * page's thirty questions the plan keeps here (the rest are answered in
 * Streaming, Data warehousing and Orchestration): eight worked through,
 * numbered aloud, then three quick ones (9 to 11, numbered on screen only).
 *
 *   1. "Batch vs streaming, how do you choose?" ("batch"), with Streaming's
 *      question of the same words.
 *   2. "What does it mean for a pipeline to be idempotent, and why does it
 *      matter?" ("idem"), with Orchestration's "Why is idempotency the
 *      foundation of reliable pipelines?" (answered in "idem-why").
 *   3. "What is ETL vs ELT?" with Data warehousing's "and why did ELT become
 *      the default?" ("etl"), read as the warehousing page words it.
 *   4. "What is Change Data Capture (CDC) and when do you use it?" ("cdc").
 *   5. "What is schema evolution, and how do Parquet and Avro handle it?"
 *      ("evo").
 *   6. "How do you handle schema changes from source systems without
 *      breaking downstream?" ("src").
 *   7. "What is a Medallion architecture (Bronze/Silver/Gold)?" ("medal").
 *   8. "What is a Lambda vs Kappa architecture?" ("lambda").
 *   Quick ("rapid-in"): 9. "What is dbt and where does it fit in an ELT
 *   pipeline?"; 10. "What is the 'fan-out' problem in pipelines?"; 11. "What
 *   is data lineage and why does it matter?"
 *
 * Reuse: none of these is asked on a Data Analyst or Data Scientist page or
 * taught by a course video, so every figure is new. The table and listing
 * kit is the Data Analyst SQL videos' (da-sql/parts.tsx, through the
 * re-export in parts.tsx, as ds-sql does it), so the series' SQL looks alike.
 *
 * The opening takes up Part 5's bridge (one script becomes a pipeline that
 * runs every day) without naming it, so it stands alone; the close bridges
 * into Part 7 (the data outgrows one machine).
 *
 * No series intro: the first scene opens at frame 0.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. check.mjs runs every statement in DuckDB-Wasm 1.32.0 (DuckDB
 * v1.4.3), the engine of the page's one <SqlCodeBlock dialect="duckdb">, into
 * results.json, which data.ts reads:
 *   - "idem": the page's own events table (its block's 24 rows) as the
 *     staging table, loaded through the page's statements. June 1 holds 8 of
 *     the 24. A blind INSERT of June 1, run twice: 8, then 16. The page's
 *     delete-then-insert, run twice: 8, then 8. The delete and an insert that
 *     fails, in one transaction, rolled back: still 8. The page's ON CONFLICT
 *     upsert run twice, then a MERGE, on the video's own three staged
 *     orders: 3 rows each time.
 *   - "cdc": the video's own orders 1 to 3. Between two polls order 2 ships,
 *     order 4 is placed and order 3 is deleted; the poll on updated_at finds
 *     2 and 4, and nothing of 3.
 *   - "evo": three daily Parquet files (the video's own rows), written by DuckDB
 *     and read back (in Node, DuckDB-Wasm writes them to disk, so check.mjs
 *     uses a throwaway directory). A plain read of days 1 and 2 keeps
 *     day 1's three columns (coupon is dropped; the other order of files
 *     fails outright); union_by_name keeps coupon, null for day 1; day 3's
 *     amount renamed total reads as two columns, each null where the other
 *     is set.
 *   - "src": INSERT INTO a three-column table SELECT * from a source that
 *     gained a fourth column: "Binder Error: table orders_clean has 3 columns
 *     but 4 values were supplied". Naming the columns loads all 3 rows.
 *   Batch and streaming, ETL and ELT, the write-ahead log, the schema
 *   registry, the medallion layers, Lambda and Kappa, dbt, fan-out and
 *   lineage are drawn as mechanisms from the page's own answers, with no
 *   numbers: none of Kafka, Debezium, a registry or dbt runs here, and none
 *   of their output is made up.
 *
 * Written for Drew's ear: SQL is said "sequel" (the series rule); ETL, ELT and
 * CDC are expanded once, the first time each is said; dbt, Parquet, Avro,
 * Kafka and DuckDB are product names, glossed where they matter; DAG is never
 * said (it is "the dependency graph"); no sentence starts with "A" before an
 * initialism; numbers as they are said.
 */
export const script: NarrationScript = {
  id: "de-pipelines",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "A script that cleans yesterday's orders is just a script. Run it every night, point three tables and a dashboard at what it writes, and it's a pipeline. Now it has to survive a rerun, a source that changes its columns, and data that never stops arriving.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "Eleven questions on pipelines and the systems around them. Eight get a figure each, and three go quickly at the end.",
    },

    // ── 1. Batch or streaming ─────────────────────────────────────────────
    {
      id: "batch",
      scene: true,
      text: "Question one. Batch versus streaming, how do you choose? Batch processes a bounded chunk on a schedule, say each hour of events, in one go. It's simple, cheap and easy to rerun, but its results are minutes to hours old.",
      pauseAfter: 0.6,
    },
    {
      id: "stream",
      text: "Streaming processes each event as it arrives, so its results are seconds old. The price is running state, ordering, late data and delivery guarantees.",
      pauseAfter: 0.6,
    },
    {
      id: "choose",
      text: "So choose by the latency the business really needs. An hourly dashboard is batch. Fraud detection is streaming. Don't pay for streaming's complexity unless low latency is a real requirement.",
      pauseAfter: 0.7,
    },

    // ── 2. Idempotency ────────────────────────────────────────────────────
    {
      id: "idem",
      scene: true,
      text: "Question two. What does it mean for a pipeline to be idempotent, and why does it matter? It means running it twice leaves the same final state as running it once.",
      pauseAfter: 0.6,
    },
    {
      id: "idem-blind",
      text: "Here the page's events table loads one day at a time. A blind insert loads June first: eight events. The job fails after the write, the scheduler retries, and the insert runs again. June first now has sixteen.",
      pauseAfter: 0.6,
    },
    {
      id: "idem-over",
      text: "Overwrite the partition instead: delete June first, then insert it. Run it once, eight. Run it twice, still eight. Rows with a key take an upsert: merge, or insert on conflict, update.",
      pauseAfter: 0.6,
    },
    {
      id: "idem-why",
      text: "That's why idempotency is the foundation of reliable pipelines: a retry or a backfill repairs a day instead of duplicating it, so recovery can be automated. Wrap the delete and the insert in one transaction, so a failure between them can't leave the day empty.",
      pauseAfter: 0.7,
    },

    // ── 3. ETL or ELT ─────────────────────────────────────────────────────
    {
      id: "etl",
      scene: true,
      text: "Question three. What is ETL versus ELT, and why did ELT become the default? ETL, extract, transform, load, transforms the data on its own servers before loading it into the warehouse. ELT, extract, load, transform, loads the raw data first, and transforms it inside the warehouse, in sequel, often with dbt.",
      pauseAfter: 0.6,
    },
    {
      id: "elt-why",
      text: "ELT became the default because cloud warehouses have cheap, elastic compute, so transforming in place is fast. And the raw data stays: when the logic changes, you transform again without extracting again.",
      pauseAfter: 0.6,
    },
    {
      id: "etl-when",
      text: "ETL still fits a target with little compute, or one with a strict schema.",
      pauseAfter: 0.7,
    },

    // ── 4. Change data capture ────────────────────────────────────────────
    {
      id: "cdc",
      scene: true,
      text: "Question four. What is change data capture, CDC, and when do you use it? The simple alternative is polling: select the rows whose updated at is later than the last run.",
      pauseAfter: 0.5,
    },
    {
      id: "cdc-poll",
      text: "Since the last run, order two shipped, order four was placed, and order three was deleted. The poll finds two and four. The deleted row isn't there to select, so the delete never reaches the warehouse.",
      pauseAfter: 0.6,
    },
    {
      id: "cdc-log",
      text: "CDC reads the database's write-ahead log instead, where every insert, update and delete is already recorded in order, and passes each change downstream in near real time, often through Kafka, a distributed log.",
      pauseAfter: 0.6,
    },
    {
      id: "cdc-when",
      text: "Use it for low-latency replication of transactional data without polling the source table, and whenever deletes must arrive.",
      pauseAfter: 0.7,
    },

    // ── 5. Schema evolution ───────────────────────────────────────────────
    {
      id: "evo",
      scene: true,
      text: "Question five. What is schema evolution, and how do Parquet and Avro handle it? It's changing a schema without breaking readers or rewriting old data: adding, renaming, dropping or retyping columns.",
      pauseAfter: 0.5,
    },
    {
      id: "evo-parquet",
      text: "Parquet, the columnar file format, handles an added column. Day two's file gained a coupon. Read both files in DuckDB, and by default it takes the first file's columns, so coupon silently disappears. Read them by name, and coupon appears, empty for day one.",
      pauseAfter: 0.6,
    },
    {
      id: "evo-rename",
      text: "Renames and type changes are what break readers. Day three calls amount total, and a reader matching by name sees one column end and another begin.",
      pauseAfter: 0.6,
    },
    {
      id: "evo-avro",
      text: "Avro, a row format popular for messages, makes evolution a contract. A schema registry checks each new schema against the last: backward compatible if new readers can read old data, forward if old readers can read new data, full if both. So it suits many services that must agree.",
      pauseAfter: 0.7,
    },

    // ── 6. Schema changes from a source ───────────────────────────────────
    {
      id: "src",
      scene: true,
      text: "Question six. How do you handle schema changes from source systems without breaking downstream? Here the source adds a coupon column, and a job inserting select star into a fixed table stops: three columns, four values.",
      pauseAfter: 0.6,
    },
    {
      id: "src-name",
      text: "Name the columns you need instead, and the new one is ignored.",
      pauseAfter: 0.5,
    },
    {
      id: "src-more",
      text: "Then land raw data in a schema-on-read layer, so ingestion never breaks. Give streaming sources a schema registry with enforced compatibility. And validate the schema at ingestion: alert and halt on a breaking change, rather than pass it on.",
      pauseAfter: 0.7,
    },

    // ── 7. Medallion ──────────────────────────────────────────────────────
    {
      id: "medal",
      scene: true,
      text: "Question seven. What is a medallion architecture: bronze, silver, gold? Three layers, in a lake or lakehouse. Bronze holds the raw source data, exactly as it arrived. Silver is cleaned, deduplicated and conformed, with joins applied. Gold holds business aggregates, shaped for a dashboard or a model.",
      pauseAfter: 0.6,
    },
    {
      id: "medal-why",
      text: "Each layer is rebuilt from the one below it: gold from silver, silver from bronze. So when a cleaning rule turns out wrong, fix it and rebuild: bronze still holds the original.",
      pauseAfter: 0.7,
    },

    // ── 8. Lambda or Kappa ────────────────────────────────────────────────
    {
      id: "lambda",
      scene: true,
      text: "Question eight. What is a Lambda versus Kappa architecture? Lambda runs two paths side by side: a batch layer, accurate over all of history, and a speed layer for fresh results. A serving layer merges them. The cost: every piece of logic is written twice, and kept in step.",
      pauseAfter: 0.6,
    },
    {
      id: "kappa",
      text: "Kappa keeps one streaming path. To reprocess history, replay the event log, in Kafka say, through the same code.",
      pauseAfter: 0.5,
    },
    {
      id: "kappa-when",
      text: "Kappa is simpler when the streaming engine can handle batch semantics, and the log reaches back far enough to replay. Lambda is the fallback when it can't.",
      pauseAfter: 0.7,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Three more, a sentence or two each.",
      pauseAfter: 0.5,
    },
    {
      id: "r-dbt",
      text: "dbt is a sequel transformation tool: it runs select statements in the warehouse, and saves each result as a table or a view. Its ref calls tell it what each model depends on, so it builds them in order, with tests and docs alongside. It's the T in ELT.",
      pauseAfter: 0.5,
    },
    {
      id: "r-fan",
      text: "The fan-out problem: one upstream change sets off many downstream recomputations. Correct a dimension table, and thousands of aggregates built on it go stale. Recompute only the affected partitions, let the dependency graph find the smallest scope, and use CDC so only the change travels.",
      pauseAfter: 0.5,
    },
    {
      id: "r-lineage",
      text: "Data lineage tracks where data came from and what transformed it, from source system to dashboard. It answers why a metric changed, what breaks if you drop a column, and where personal data went, for compliance.",
      pauseAfter: 1.0,
    },
    {
      id: "next",
      text: "Each answer here assumed one machine could hold the data. When a day of events outgrows it, the work has to split across many. Next: distributed processing.",
    },
  ],
};
