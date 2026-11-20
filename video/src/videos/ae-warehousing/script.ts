import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Warehouses and what they cost" (16:9), Part 6 of the
 * Analytics Engineer interview prep videos (composition
 * AnalyticsEngineer-6-Warehousing;
 * agent-outputs/20261120-1200-analytics-engineer-interview-video-plan.md,
 * "6, Warehouses and what they cost"), after
 * content/interview/analytics-engineer/data-warehousing.mdx. It answers the
 * thirteen questions the plan gives this video from that page, and
 * dimensional-modeling.mdx's "What is a wide (one-big-table) approach, and
 * when is it appropriate?", answered together with the warehousing page's
 * one-big-table question as the plan asks: fourteen headings, numbered
 * aloud as thirteen. Ten are worked through, read aloud in the page's words;
 * three go quickly at the end, also read aloud. By the page's headings:
 *
 *   1. What makes a modern cloud warehouse different from a traditional one?
 *      ("split")
 *   2. How do Snowflake, BigQuery, and Redshift differ architecturally?
 *      ("arch")
 *   3. What is the difference between OLTP and OLAP systems? ("oltp")
 *   4. What is columnar storage, and why does it matter for analytics?
 *      ("cols")
 *   5. Why does SELECT * cost more in a columnar warehouse? ("star")
 *   6. What is partitioning, and how does partition pruning save money?
 *      ("prune")
 *   7. What is clustering, and how does it differ from partitioning?
 *      ("cluster")
 *   8. When can partitioning or clustering hurt more than help? ("hurt")
 *   9. What is a virtual warehouse / slot / compute cluster, and how does it
 *      drive cost? ("compute"; the slashes read as "or")
 *   10. Why is a wide, denormalized "one big table" sometimes preferred in a
 *       warehouse? with dimensional-modeling.mdx's "What is a wide
 *       (one-big-table) approach, and when is it appropriate?" ("obt"). The
 *       card shows the warehousing heading with the modeling page's as a
 *       second line; the narration reads the first and adds "and when is it
 *       appropriate?".
 *   Quick ("rapid-in"): 11. How do you control warehouse cost in practice?
 *   ("r-cost"); 12. What is a result cache, and how does it help?
 *   ("r-cache"); 13. What are distribution and sort keys in Redshift?
 *   ("r-dist").
 *
 * Not here, by the plan: the materializations (Part 3), incremental builds,
 * the watermark filter, idempotent rebuilds, MERGE and full refreshes (Part
 * 4).
 *
 * Why these ten go deep: each carries a mechanism to draw (storage apart
 * from compute; rows against columns; a scan that follows the columns named;
 * files skipped by a partition or a row group's min and max; small files that
 * cost more than they hold; two billing models; one rename against two
 * hundred thousand) and a follow-up an interviewer asks next. The three quick
 * ones are lists or definitions on the page.
 *
 * Opening and bridge, per the plan's "How the videos join up": it opens on
 * 5 → 6 ("where that SQL runs, and what it costs to scan") without naming
 * Part 5, so it stands alone, and closes on 6 → 7 ("a cheap model that is
 * wrong costs more: tests"): "Next: testing and data quality."
 *
 * On screen, beat by beat (what phase 2 builds; red the trap, green the right
 * answer, yellow what the narration points at, blue data):
 *   hook: the camel (the hero) standing beside a short stack of model
 *     names (stg_, int_, fct_) feeding a warehouse box; the receipt spot
 *     printing beside it. hook-bill: the receipt's two lines, "bytes scanned" and
 *     "compute time", inked in turn. plan: ten numbered squares and three
 *     smaller ones, then a line under them: "Measured: DuckDB, 1,000,000
 *     sales (made up)" and "Model: stated assumptions", two small badges.
 *   split: QuestionCard 1; one storage cylinder ("object storage") with
 *     three compute boxes over it (loading, dashboards, ad hoc), each drawing
 *     its own line to the one copy. split-old: beside it, the traditional
 *     shape: storage and compute fused in one box, a second box added to
 *     scale both (the added storage in red, "whether you need it or not").
 *     split-catch: one compute box left lit after its work is done, a meter
 *     running beside it (yellow), "billed per second while running".
 *   arch: QuestionCard 2; three columns with hairlines between, Snowflake,
 *     BigQuery, Redshift, each line inking on its words: "virtual
 *     warehouses you size", "micro-partitions, managed"; "serverless, no
 *     clusters", "bytes scanned or reserved slots"; "provisioned nodes",
 *     "distribution and sort keys", and under it, smaller, "Serverless, RA3:
 *     toward decoupled storage".
 *   oltp: QuestionCard 3; two shapes side by side: an app's database (many
 *     short arrows, one row each, "row-stored") and a warehouse (one long
 *     arrow down a column, "column-stored"). oltp-flow: E and L arrows from
 *     the first into the second, then T inside the warehouse in yellow,
 *     labelled "the analytics engineer's part". oltp-heavy: a heavy query
 *     aimed at the app's database, its short arrows slowing (red).
 *   cols: QuestionCard 4; the same six-column table laid out as rows, then
 *     re-laid as six column strips; a query naming two columns lights only
 *     their strips. cols-compress: de-warehousing's region column, a
 *     million values: "5.50 MB as text" against "380 kB as a column"
 *     (dictionary-encoded, the four names once, a code a row).
 *     cols-rows: one row lifted out whole from the row layout (green) beside
 *     a sum down one strip (green): "row stores: one row at a time; column
 *     stores: aggregations".
 *   star: QuestionCard 5; the page's model first: 200 thin column strips,
 *     3 lit, "3 / 200 = 1.5%" and "SELECT *: all 200" (red). star-run: the
 *     million sales in Parquet, six strips drawn to their measured widths
 *     (amount and sale_id wide, the other four thin); SELECT * fills them
 *     all, "9.4 MB read"; SELECT region, SUM(units) lights two thin strips,
 *     "0.77 MB read" (green). star-wide: SELECT region, SUM(amount) lights
 *     region and the wide amount strip, "4.6 MB" (yellow): bytes, not
 *     column counts. star-dbt: a model's {{ config(materialized='table') }}
 *     over SELECT * FROM source, struck, and the named column list under it
 *     (green).
 *   prune: QuestionCard 6; the page's chart (charts/partition-pruning-scan:
 *     gigabytes scanned against days filtered, flat at 876 GB unpartitioned,
 *     rising from zero partitioned), the 7-day point marked "16.8 GB", and a
 *     "model" badge with the assumption, "365 days x 2.4 GB". prune-run:
 *     de-warehousing's twelve month folders as twelve file icons (the file
 *     boxes spot beside them); March lit,
 *     "Scanning Files: 1/12" from DuckDB's plan; a region filter lights all
 *     twelve (red). prune-not: the chart's right end, where the two lines
 *     meet, circled: "a query over all history saves nothing".
 *   cluster: QuestionCard 7; de-warehousing's nine row groups as blocks,
 *     each labelled with its min and max date, in date order: March overlaps
 *     two (green), "1.13 MB read"; shuffled, every block spans the year,
 *     none skipped, "5.74 MB" (red). cluster-diff: "partition: few large
 *     segments, often a cap on count" against "cluster: sorted inside,
 *     high-cardinality keys". cluster-rule: "Partition by date, cluster by
 *     the keys filters use".
 *   hurt: QuestionCard 8; de-warehousing's 366 day files as a field of tiny
 *     squares, "about 27 kB each", against one 9.4 MB file; footers: "206
 *     kB" against "4.7 kB" (red), and the year's scan opening 366 files
 *     against one. hurt-cluster: a cluster key on a column no filter names,
 *     a maintenance cog turning beside it, the query passing it by.
 *     hurt-rule: "Match the grain to the volume", and the twelve month files
 *     (about 780 kB each) beside the 366 day files.
 *   compute: QuestionCard 9, the stopwatch spot beside it; the three
 *     billing lines from "arch" again,
 *     each now with its lever: "credits per second while running",
 *     "bytes scanned, or reserved slots", "provisioned nodes (or serverless
 *     RPUs)". compute-model: a model badge; one hour as sixty minute ticks,
 *     two of them busy (blue); billed by time and left running, all sixty
 *     lit (red); suspended when idle, two (green); billed by bytes on
 *     demand, the idle ticks grey and the scan bar the only thing that
 *     moves. compute-lever: "less data scanned" and "less compute time", the
 *     one the billing model rewards in yellow.
 *   obt: QuestionCard 10 with the modeling page's heading as its second
 *     line; a star (fct_sales with category_id, and a five-row
 *     dim_category) collapsing into one wide table with category and
 *     department as columns. obt-cheap: the measured column sizes as bars:
 *     category_id 380 kB in the star, category name 380 kB in the wide
 *     table, department another 380 kB; the files, 9.36 MB and 9.74 MB.
 *     obt-cost: "Home" renamed: in the star, one dimension row (green); in
 *     the wide table, 199,786 rows, across all nine row groups (red).
 *     obt-where: the star upstream, an arrow down into the wide table
 *     marked "serving", and a dashboard tool reading it.
 *   rapid-in: the RapidFire list, 11 to 13. r-cost: two columns, "scan
 *     less" and "compute less", each line inking as it is said. r-cache: a
 *     query and the data's state as a key into a cache box; the same query
 *     returns from it at once (green); a changed table empties it (red).
 *     r-dist: four node boxes; a join key placing matching rows of two
 *     tables on one node (no arrows between nodes); then one key value
 *     filling a single node (red, "skew"); a sort key's blocks with a range
 *     filter skipping most of them.
 *   next: the RapidFire list complete; NextLine "Next: testing and data
 *     quality".
 *
 * Facts. No vendor warehouse runs here, and no number on screen is a
 * vendor's. Every vendor statement is the page's own (data-warehousing.mdx:
 * the separation of storage and compute; Snowflake's virtual warehouses,
 * micro-partitions and credits per second; BigQuery's serverless design,
 * bytes scanned and slots; Redshift's provisioned nodes, distribution and
 * sort keys, Redshift Serverless and RA3; the result cache, "often for free";
 * Snowflake and BigQuery hiding distribution). No price is given anywhere.
 * Two kinds of number, by check.mjs into results.json (and
 * de-warehousing/results.json, imported by data.ts):
 *   - Measured in DuckDB-Wasm 1.32.0 (DuckDB v1.4.3), said aloud as DuckDB
 *     on a million sales made up for this video. The table is Data Engineer
 *     Part 9's (de-warehousing), rebuilt here from its verbatim setup; the
 *     run fails unless its checksum (252235844.17) and Parquet size
 *     (9,355,298 bytes) match that video's results.json.
 *       - "cols-compress": de-warehousing's region column, 5,499,835 bytes
 *         of CSV text against 379,876 in Parquet.
 *       - "star-run", "star-wide": DuckDB's file statistics, on the one
 *         Parquet file: SELECT * read 9.37 MB (the whole file, read-ahead
 *         included); SELECT region, SUM(units) 0.77 MB ("under eight hundred
 *         kilobytes"); SELECT region, SUM(amount) 4.59 MB ("four point
 *         six"). The amount column is 4,205,471 bytes, 45% of the file
 *         ("nearly half").
 *       - "prune-run": de-warehousing's month folders: twelve files, March
 *         "Scanning Files: 1/12", region = 'North' all 12 read.
 *       - "cluster": de-warehousing's row groups: nine of 122,880 rows, in
 *         date order March overlaps 2 and the query read 1,133,966 bytes;
 *         shuffled, all 9 and 5,741,446 bytes ("five times the bytes").
 *       - "hurt": de-warehousing's day folders: 366 files of 26,766 to
 *         26,856 bytes ("about twenty-seven kilobytes"), footers 206,058
 *         bytes in all against one file's 4,736; a scan of the year opens
 *         366 files against 1. "Match the grain to the volume" is the page's
 *         "match granularity to data volume"; a million rows a year is the
 *         page's "by hour on low volume" case, one step coarser.
 *       - "obt-cheap": the star's category_id column 379,707 bytes; the wide
 *         table's category name 379,975 and department 379,981 ("about three
 *         hundred eighty kilobytes" each, the name within a tenth of a
 *         percent of the key); the files 9.36 MB and 9.74 MB. Both answer
 *         revenue by category identically.
 *       - "obt-cost": renaming 'Home' updates 1 dimension row in the star and
 *         199,786 rows in the wide table ("almost two hundred thousand"),
 *         in all 9 of the file's row groups.
 *   - Models, said aloud as models:
 *       - "star": the page's own "On a 200-column table, selecting 3
 *         columns reads roughly 3/200 of the data": 1.5%, every column the
 *         same width.
 *       - "prune": the page's chart, charts/partition-pruning-scan.mjs, read
 *         by check.mjs: 365 days at 2.4 GB a day, 876 GB unpartitioned, 16.8
 *         GB for a 7-day query ("sixteen point eight"), 52 times less ("about
 *         fifty times"). The page's own "the two designs converge on the
 *         query that genuinely reads all of history".
 *       - "compute-model": the video's own assumption, a dashboard keeping a
 *         cluster busy two minutes in an hour: sixty minutes billed left
 *         running, two when it suspends, no suspend delay modelled (the page
 *         gives none). On-demand bytes billing charges no idle time: the
 *         page's "pay per bytes scanned (or for reserved slots)".
 *   - Reasoning, not a run: "a model built as a table from select star reads
 *     every column of its source on every build" (a table materialization
 *     rebuilds with CREATE TABLE AS SELECT, and SELECT * names every column;
 *     a view is not claimed, since a query on a view can still prune its
 *     columns); "where compute is billed by the second, it bills the whole
 *     time" in "split-catch" is the page's "credits per second while running
 *     (so auto-suspend saves money)"; "too few to split by day" is the 366
 *     files of 27 kB above, and the page's "by hour on low volume".
 *
 * Reuse, per the plan: Data Engineer Part 9 (de-warehousing) asks the same
 * columnar, partitioning, clustering and small-files questions, so its
 * million-row table and its measurements are used: imported from its
 * results.json, and rebuilt verbatim where this video measures something
 * new on it (SELECT *, the one big table). Its PartitionScene, ClusterScene
 * and SmallFilesScene are candidates to copy and re-cue. The narration never
 * refers to that video.
 *
 * Written for Drew's ear: SQL is written SQL (the lexicon says "sequel"),
 * OLAP is "oh-lap" by the lexicon; OLTP, dbt and RA3 read letter by letter;
 * OLTP and OLAP expanded once, in question 3; no sentence opens "A" before
 * an initialism. "SELECT *" is said "select star". Product names glossed
 * once: Snowflake, BigQuery and Databricks as cloud data platforms (question
 * 1), Teradata as an on-premises warehouse, Redshift as a cluster-based
 * warehouse (question 2), DuckDB as an analytics database (the plan beat).
 * Numbers as they are said ("nine point four megabytes"), "kilobytes" and
 * "megabytes" decimal, as de-warehousing measures them.
 */
export const script: NarrationScript = {
  id: "ae-warehousing",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Every model in a dbt project runs as a query in a warehouse, and the warehouse sends a bill.",
      pauseAfter: 0.5,
    },
    {
      id: "hook-bill",
      text: "What the bill counts depends on the warehouse: the bytes a query scans, or the time its compute runs.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "Ten questions get worked through, and three come quickly at the end. No vendor's warehouse runs here. Sizes are measured in DuckDB, an analytics database, on a million sales made up for this video, and anything bigger is a model, said as one.",
      pauseAfter: 0.7,
    },

    // ── 1, 2. Storage apart from compute, and three warehouses ────────────
    {
      id: "split",
      scene: true,
      text: "Question one. What makes a modern cloud warehouse different from a traditional one?",
      pauseAfter: 0.5,
    },
    {
      id: "split-new",
      text: "Storage is separate from compute. Snowflake, BigQuery and Databricks, three cloud data platforms, keep the data in cheap object storage and start compute that reads it. So you scale query power without moving data, and run many isolated workloads over one copy.",
      pauseAfter: 0.6,
    },
    {
      id: "split-old",
      text: "A traditional warehouse, like an on-premises Teradata or classic Redshift, couples the two: they grow together, whether you need both or not.",
      pauseAfter: 0.7,
    },
    {
      id: "split-catch",
      text: "The catch: compute you can start, you can also leave running, and where compute is billed by the second, it bills the whole time.",
      pauseAfter: 0.8,
    },
    {
      id: "arch",
      text: "Question two. How do Snowflake, BigQuery, and Redshift differ architecturally?",
      pauseAfter: 0.5,
    },
    {
      id: "arch-snow",
      text: "Snowflake keeps storage apart from compute clusters you define, called virtual warehouses, and manages its micro-partitions itself.",
      pauseAfter: 0.5,
    },
    {
      id: "arch-bq",
      text: "BigQuery is serverless: no clusters to size. You pay per byte scanned, or for reserved slots, and it partitions and clusters the tables you declare.",
      pauseAfter: 0.5,
    },
    {
      id: "arch-rs",
      text: "Redshift is cluster-based: provisioned nodes, with distribution and sort keys you choose, though Redshift Serverless and RA3 nodes have moved it toward separate storage.",
      pauseAfter: 0.8,
    },

    // ── 3, 4, 5. Rows against columns, and SELECT * ───────────────────────
    {
      id: "oltp",
      scene: true,
      text: "Question three. What is the difference between OLTP and OLAP systems?",
      pauseAfter: 0.5,
    },
    {
      id: "oltp-def",
      text: "OLTP, online transaction processing, serves many small reads and writes of single rows, with strict consistency: an app's Postgres, stored by row. OLAP, online analytical processing, serves a few large scans and aggregations: the warehouse, stored by column.",
      pauseAfter: 0.7,
    },
    {
      id: "oltp-flow",
      text: "So data is extracted from the first, loaded into the second, and transformed there. That last step is the analytics engineer's.",
      pauseAfter: 0.6,
    },
    {
      id: "oltp-heavy",
      text: "Run heavy analytics on the app's own database instead, and it competes with the app, and runs badly.",
      pauseAfter: 0.8,
    },
    {
      id: "cols",
      text: "Question four. What is columnar storage, and why does it matter for analytics?",
      pauseAfter: 0.5,
    },
    {
      id: "cols-def",
      text: "It keeps each column's values together on disk, instead of each row's. An analytical query touches a few columns across many rows, so it reads only those columns.",
      pauseAfter: 0.6,
    },
    {
      id: "cols-compress",
      text: "And values of one type, side by side, compress far better. A million region names take five and a half megabytes as text, and three hundred eighty kilobytes as one encoded column.",
      pauseAfter: 0.7,
    },
    {
      id: "cols-rows",
      text: "Row stores still win at reading whole rows one at a time. Column stores win at aggregating billions of them.",
      pauseAfter: 0.8,
    },
    {
      id: "star",
      text: "Question five. Why does select star cost more in a columnar warehouse?",
      pauseAfter: 0.5,
    },
    {
      id: "star-model",
      text: "Because the scan follows the columns you name. The page's model: on a two hundred column table, three columns are one and a half percent of the data, if every column is the same width. Select star is all of it, and on per-byte billing you pay for every byte.",
      pauseAfter: 0.7,
    },
    {
      id: "star-run",
      text: "Measured in DuckDB, on the million sales: select star read the whole nine point four megabyte file. Units by region, two columns, read under eight hundred kilobytes.",
      pauseAfter: 0.6,
    },
    {
      id: "star-wide",
      text: "It's bytes, not column count. Amount, random to the cent, is nearly half the file, so revenue by region read four point six megabytes.",
      pauseAfter: 0.6,
    },
    {
      id: "star-dbt",
      text: "In a project, name the columns: a model built as a table from select star reads every column of its source on every build.",
      pauseAfter: 0.8,
    },

    // ── 6, 7. Partitions, and clustering ──────────────────────────────────
    {
      id: "prune",
      scene: true,
      text: "Question six. What is partitioning, and how does partition pruning save money?",
      pauseAfter: 0.5,
    },
    {
      id: "prune-def",
      text: "Partitioning splits a table into segments by a column, usually a date. A query that filters on that column reads only the matching segments, and skips the rest. That's pruning.",
      pauseAfter: 0.6,
    },
    {
      id: "prune-model",
      text: "The page's model: a year of data at two point four gigabytes a day. Unpartitioned, every query reads all eight hundred seventy-six gigabytes. Partitioned by day, a seven-day dashboard tile reads sixteen point eight: about fifty times less, and billed that way.",
      pauseAfter: 0.7,
    },
    {
      id: "prune-run",
      text: "In DuckDB, with the million sales in a folder per month, a query for March scans one file of twelve. Filter on region instead, and it reads all twelve: pruning only works on the partition column.",
      pauseAfter: 0.6,
    },
    {
      id: "prune-not",
      text: "And a query over all of history saves nothing, which is why the answer isn't to partition everything.",
      pauseAfter: 0.8,
    },
    {
      id: "cluster",
      text: "Question seven. What is clustering, and how does it differ from partitioning?",
      pauseAfter: 0.5,
    },
    {
      id: "cluster-def",
      text: "Clustering sorts rows inside storage, so the engine can skip blocks that can't match a filter. In the sales file, each block of rows records its first and last date. In date order, March overlaps two blocks of nine. Shuffled, every block spans the year, and the same query read five times the bytes.",
      pauseAfter: 0.7,
    },
    {
      id: "cluster-diff",
      text: "Partitions are coarse, a few large segments, often with a cap on how many. Clustering is fine-grained, and handles columns with many values.",
      pauseAfter: 0.6,
    },
    {
      id: "cluster-rule",
      text: "So partition by date, and cluster by the high-cardinality keys your filters use.",
      pauseAfter: 0.8,
    },

    // ── 8. When they hurt ─────────────────────────────────────────────────
    {
      id: "hurt",
      scene: true,
      text: "Question eight. When can partitioning or clustering hurt more than help?",
      pauseAfter: 0.5,
    },
    {
      id: "hurt-small",
      text: "When the partitions are tiny. Split the million sales by day, and you get three hundred sixty-six files of about twenty-seven kilobytes. Their footers alone come to two hundred six kilobytes, against under five for one file, and reading the year opens every file.",
      pauseAfter: 0.7,
    },
    {
      id: "hurt-cluster",
      text: "And clustering on a column no query filters buys nothing, while the sorting still costs maintenance.",
      pauseAfter: 0.6,
    },
    {
      id: "hurt-rule",
      text: "Partition and cluster on the columns filters actually use, and match the grain to the volume: a million rows a year is too few to split by day.",
      pauseAfter: 0.8,
    },

    // ── 9. Compute, and what drives its cost ──────────────────────────────
    {
      id: "compute",
      scene: true,
      text: "Question nine. What is a virtual warehouse, or slot, or compute cluster, and how does it drive cost?",
      pauseAfter: 0.5,
    },
    {
      id: "compute-def",
      text: "It's the compute that runs the queries, sized apart from the storage. Snowflake bills credits per second while a warehouse runs. BigQuery bills the bytes scanned, on demand, or reserved slots. Redshift bills its provisioned nodes.",
      pauseAfter: 0.7,
    },
    {
      id: "compute-model",
      text: "Here's a model, not a measurement. Say a dashboard keeps a cluster busy for two minutes an hour. Billed by time and left running, you pay for sixty minutes. Suspended when idle, about two. Billed by bytes on demand, idle time costs nothing, and only the scan counts.",
      pauseAfter: 0.7,
    },
    {
      id: "compute-lever",
      text: "That's why the billing model matters: it tells you which lever cuts the bill, less data scanned or less compute time.",
      pauseAfter: 0.8,
    },

    // ── 10. One big table ─────────────────────────────────────────────────
    {
      id: "obt",
      scene: true,
      text: "Question ten. Why is a wide, denormalized one big table sometimes preferred in a warehouse, and when is it appropriate?",
      pauseAfter: 0.5,
    },
    {
      id: "obt-def",
      text: "It pre-joins the dimensions into the fact: one flat table, every attribute a column. Queries skip the joins, and dashboard tools that struggle with many tables get just one.",
      pauseAfter: 0.6,
    },
    {
      id: "obt-cheap",
      text: "Columnar storage makes the copies cheap. On the million sales, the category name on every row compresses to three hundred eighty kilobytes, the same as the integer key it replaces.",
      pauseAfter: 0.7,
    },
    {
      id: "obt-cost",
      text: "The cost is maintenance. Rename one category, and the star updates one row. The wide table updates almost two hundred thousand, in every block of the file.",
      pauseAfter: 0.7,
    },
    {
      id: "obt-where",
      text: "So serve a wide table at the end, where speed matters, and keep the star upstream as the source it's rebuilt from.",
      pauseAfter: 1.0,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Three quick ones to close.",
      pauseAfter: 0.5,
    },
    {
      id: "r-cost",
      text: "Question eleven. How do you control warehouse cost in practice? Scan less: prune, name columns, store expensive repeated logic as tables rather than views, and build big append-only tables incrementally. Compute less: right-size, suspend when idle, and keep ad hoc queries off the production warehouse, so they can't starve the pipelines.",
      pauseAfter: 0.7,
    },
    {
      id: "r-cache",
      text: "Question twelve. What is a result cache, and how does it help? It returns a stored result for the exact same query over unchanged data: instantly, and often for free. So it rewards queries that don't vary, and any change to an underlying table invalidates it.",
      pauseAfter: 0.7,
    },
    {
      id: "r-dist",
      text: "Question thirteen. What are distribution and sort keys in Redshift? A distribution key decides which node holds each row: distribute on the join key, and matching rows meet without a shuffle across the network. A sort key orders rows on disk, so range filters skip blocks. Pick a key one value dominates, and one node does most of the work: skew.",
      pauseAfter: 1.0,
    },
    {
      id: "next",
      text: "Every lever here makes a model cheaper. None of them makes it right, and a cheap model that's wrong costs more than any scan. Next: testing and data quality.",
    },
  ],
};
