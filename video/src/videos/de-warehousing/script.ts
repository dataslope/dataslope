import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Data warehousing & storage" (16:9), Part 9 of the Data
 * Engineer interview prep videos
 * (agent-outputs/20261030-1600-data-engineer-interview-video-plan.md), after
 * content/interview/data-engineer/data-warehousing.mdx. It answers the page's
 * nine questions that are this video's, numbered aloud in the page's words,
 * with no quick round (the plan gives this video deep dives only):
 *
 *   1. What is OLTP vs OLAP, and how does storage differ? ("rows")
 *   2. Why is columnar storage faster for analytics? ("cols")
 *   3. Compare Parquet, ORC, and Avro. ("fmt")
 *   4. Why is compression more effective in columnar formats? ("cmp")
 *   5. What is partitioning, and what makes a good partition key? ("part")
 *   6. What is clustering (or sorting) within a partition? ("cl")
 *   7. What is the tradeoff between file size and the small files problem? ("sm")
 *   8. What drives cost in a cloud data warehouse, and how do you control it? ("cost")
 *   9. What is a data lake vs a warehouse vs a lakehouse? ("lake")
 *
 * Moved here from pipelines.mdx (the plan's question table), each answered
 * inside the question that covers it rather than read aloud again:
 *   - "Why partition large tables, and what makes a good partition key?" in 5;
 *   - "Why is Parquet preferred over CSV for analytics?" in 2 (what each file
 *     makes a query read) and 3 (types, a schema, a quarter of the size);
 *   - "What is Apache Avro and when is it preferred over Parquet?" and "What
 *     is ORC and how does it compare to Parquet?" in 3, which compares all
 *     three;
 *   - "What is the small files problem and how do you fix it?" in 7;
 *   - "What is a lakehouse and how does it differ from a data warehouse?" in 9;
 *   - "What are common cost optimization strategies for cloud data
 *     pipelines?" in 8 (read less: format, columns, partitions; compute less
 *     often: incremental runs, stored results, auto-suspend, cold storage).
 * Not here, by the plan: ETL vs ELT (Part 6), the SCD recap (Part 4), the
 * star schema (Part 3), materialized views (Part 2).
 *
 * Reuse: nothing is near-identical to an earlier video's figure (the plan
 * names none for this part). The SQL listing, the table and the scene
 * furniture are DS Part 10's (ds-sql/parts.tsx, which re-exports the Data
 * Analyst SQL kit), so the series' SQL looks like one family.
 *
 * The opening is written fresh: one table saved twice, and what one query
 * reads from each. It takes up Part 8's bridge (where it all lands, and how
 * it is stored) without naming it, so it stands alone. It promises nine
 * questions and seven measured on the same rows: 2 to 8 are; 1 and 9 are
 * drawn.
 *
 * Facts. Every number ran in DuckDB v1.4.3 (DuckDB-Wasm 1.32.0, the engine
 * the page's blocks run), by check.mjs into results.json, which data.ts
 * reads. The table is the video's own, said aloud as "made up for this
 * video": a million rows with the page's six `sales` columns, 2024 in date
 * order, region, category, units and amount drawn with setseed(0.42). Sizes
 * are file lengths, and "reads" is what DuckDB's file statistics counted.
 * Megabytes and kilobytes are decimal (10^6, 10^3 bytes).
 *   - files: CSV 39,191,885 bytes; Parquet (Snappy, DuckDB's default) 9,355,298,
 *     under a quarter; zstd 6,278,819; uncompressed 13,149,627.
 *   - the page's query (revenue and units by category): DuckDB read all
 *     39.19 MB of the CSV and 4,976,846 bytes of the Parquet file. Both plans
 *     project category, amount and units.
 *   - per column, CSV text against Parquet: region (4 values) 5.50 MB against
 *     379,876 bytes, 3.04 bits a row; amount (random to the cent) 6.80 MB
 *     against 4,205,471; sale_date in date order 11.0 MB against 3,087.
 *     Sorted by region, the region column is 554 bytes.
 *   - by month: 12 files of 79,235 to 84,700 rows. March: "Scanning Files:
 *     1/12"; region = 'North': 12 files read; right(sale_month, 2) = '03':
 *     1/12 (the page says a function on the key "usually defeats pruning";
 *     DuckDB prunes through it).
 *   - row groups of 122,880 rows, 9 in all, each spanning about 45 days in
 *     date order; March overlaps 2. Shuffled, all 9 span the year. The March
 *     query read 1,133,966 bytes sorted and 5,741,446 shuffled (5.1 times).
 *   - by day: 366 files of 2,732 or 2,733 rows, 26,766 to 26,856 bytes
 *     (26,811 on average); their footers 206,058 bytes against one file's
 *     4,736. The page's target: about 128 MB to 1 GB a file.
 *   - cost: the page's query read 39.19 MB of CSV and 4.98 MB of Parquet;
 *     on March alone, from the monthly folders, 423,033 bytes.
 *   - the codec trade-off (zstd smaller, slower to decompress than Snappy;
 *     which wins depends on the link) is the page's chart,
 *     charts/compression-ratio-speed.mjs, whose speeds are approximate; the
 *     sizes are this table's.
 *
 * Written for Drew's ear: SQL is "sequel"; OLTP, OLAP, ORC and ACID are
 * expanded the first time; CSV is said as it is; Parquet and Avro get a
 * gloss the first time; numbers as they are said; no sentence opens "A"
 * before an initialism.
 */
export const script: NarrationScript = {
  id: "de-warehousing",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Every pipeline ends by writing data somewhere. Here are a million sales, made up for this video, written twice. As a CSV file, they take thirty-nine point two megabytes. As Parquet, a columnar file format, nine point four.",
      pauseAfter: 0.5,
    },
    {
      id: "hook-read",
      text: "Ask both for revenue by category. DuckDB reads every byte of the CSV, and five megabytes of the Parquet file. Same rows, same answer: only the layout differs.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "Layout is what the warehousing round asks about: nine questions, from rows and columns to formats, partitions, cost and where it all lives. Seven get measured on these same rows.",
      pauseAfter: 0.7,
    },

    // ── 1, 2. Rows against columns ────────────────────────────────────────
    {
      id: "rows",
      scene: true,
      text: "Question one. What is OLTP versus OLAP, and how does storage differ?",
    },
    {
      id: "rows-oltp",
      text: "OLTP, online transaction processing, runs the application: many small reads and writes, one order at a time. So it stores each row's fields together: one order, one place.",
      pauseAfter: 0.6,
    },
    {
      id: "rows-olap",
      text: "OLAP, online analytical processing, runs the reports: a few columns across millions of rows. So it stores each column together: every sale ID, then every date, and so on.",
      pauseAfter: 0.7,
    },
    {
      id: "cols",
      text: "Question two. Why is columnar storage faster for analytics? A query reads only the columns it names. The page's query names three of six: category, units and amount.",
      pauseAfter: 0.5,
    },
    {
      id: "cols-read",
      text: "That's why DuckDB read only five of the Parquet file's nine point four megabytes. A row format mixes those three fields in with all the rest, so the CSV was read whole.",
      pauseAfter: 0.6,
    },
    {
      id: "cols-more",
      text: "Values of one type, side by side, also compress well and run in batches.",
      pauseAfter: 0.8,
    },

    // ── 3. Parquet, ORC and Avro ──────────────────────────────────────────
    {
      id: "fmt",
      scene: true,
      text: "Question three. Compare Parquet, ORC, and Avro.",
      pauseAfter: 0.4,
    },
    {
      id: "fmt-columnar",
      text: "Parquet and ORC, optimized row columnar, are both columnar and compressed, with per-column statistics that let a reader skip data. Parquet is the default nearly every engine reads; ORC grew up around Hive, in the Hadoop world.",
      pauseAfter: 0.6,
    },
    {
      id: "fmt-avro",
      text: "Avro, a row-based binary format, writes whole records, and its files carry the schema they were written with. It suits streaming, one record at a time, often on Kafka, a distributed log, and its compatibility rules let a schema evolve.",
      pauseAfter: 0.6,
    },
    {
      id: "fmt-csv",
      text: "And over CSV, Parquet carries types and a schema, and here it's under a quarter of the size. Columnar for analytics, Avro for records in motion.",
      pauseAfter: 0.8,
    },

    // ── 4. Compression ────────────────────────────────────────────────────
    {
      id: "cmp",
      scene: true,
      text: "Question four. Why is compression more effective in columnar formats? A column holds one type, often with few distinct values.",
    },
    {
      id: "cmp-region",
      text: "Region has four. Parquet writes each one once, in a dictionary, then about three bits a row: a million regions in three hundred eighty kilobytes, against five and a half megabytes of text.",
      pauseAfter: 0.6,
    },
    {
      id: "cmp-amount",
      text: "Amount is random to the cent, so it only shrinks from six point eight megabytes to four point two.",
      pauseAfter: 0.6,
    },
    {
      id: "cmp-sort",
      text: "Sorting before writing makes long runs. In date order, a million dates take three kilobytes. Sorted by region, the region column falls to five hundred fifty-four bytes.",
      pauseAfter: 0.7,
    },
    {
      id: "cmp-codec",
      text: "Codecs trade too. Zstandard wrote this table in six point three megabytes, Snappy, the default, in nine point four, but Zstandard decompresses slower. Over a slow link the smaller file wins; on a fast disk, the faster codec.",
      pauseAfter: 0.8,
    },

    // ── 5, 6. Partitions, and clustering inside them ─────────────────────
    {
      id: "part",
      scene: true,
      text: "Question five. What is partitioning, and what makes a good partition key? Partitioning splits a table into folders by a column's value, usually a date.",
    },
    {
      id: "part-month",
      text: "Here the year goes into one folder per month: twelve files. Ask for March, and DuckDB's plan scans one file of the twelve.",
      pauseAfter: 0.6,
    },
    {
      id: "part-region",
      text: "Filter on region instead, and it reads all twelve: pruning only works on the key. So a good key is the column queries filter on most, with partitions even and not too small.",
      pauseAfter: 0.6,
    },
    {
      id: "part-fn",
      text: "On many engines, a function wrapped around the key defeats pruning. DuckDB applied it to each folder's name and still read one file, so check your engine's plan.",
      pauseAfter: 0.8,
    },
    {
      id: "cl",
      scene: true,
      text: "Question six. What is clustering, or sorting, within a partition? It orders the rows inside the files, so like values sit together.",
    },
    {
      id: "cl-stats",
      text: "Parquet keeps a minimum and a maximum for every column in each row group, here about a hundred twenty-three thousand rows. In date order, each group spans about six weeks, so a query for March reads only two groups of nine.",
      pauseAfter: 0.6,
    },
    {
      id: "cl-shuffle",
      text: "Shuffle the same rows, and every group spans the whole year. Nothing can be skipped, and DuckDB read five times the bytes. The minimum and maximum do the skipping, no index needed.",
      pauseAfter: 0.8,
    },

    // ── 7. File sizes ─────────────────────────────────────────────────────
    {
      id: "sm",
      scene: true,
      text: "Question seven. What is the tradeoff between file size and the small files problem?",
      pauseAfter: 0.4,
    },
    {
      id: "sm-day",
      text: "Partition the same year by day: three hundred sixty-six files of twenty-seven kilobytes each. Each has its own footer and must be listed and opened, so the engine spends its time on files, not data.",
      pauseAfter: 0.6,
    },
    {
      id: "sm-large",
      text: "Too large hurts too: fewer pieces to spread across workers, and coarser pruning. The usual target is about a hundred twenty-eight megabytes to a gigabyte a file.",
      pauseAfter: 0.6,
    },
    {
      id: "sm-fix",
      text: "Fix them with compaction, a job that rewrites many small files into a few large ones, or let a table format like Delta Lake or Iceberg compact them for you.",
      pauseAfter: 0.8,
    },

    // ── 8. Cost ───────────────────────────────────────────────────────────
    {
      id: "cost",
      scene: true,
      text: "Question eight. What drives cost in a cloud data warehouse, and how do you control it? Most bill for the data a query scans, like BigQuery, or for the compute time it uses, like Snowflake and Redshift.",
      pauseAfter: 0.5,
    },
    {
      id: "cost-read",
      text: "So read less. The revenue query read thirty-nine point two megabytes of CSV, and five of Parquet. Asked about March alone, from the monthly folders, it read four hundred twenty-three kilobytes.",
      pauseAfter: 0.6,
    },
    {
      id: "cost-compute",
      text: "Then compute less often: incremental models instead of full refreshes, stored results for heavy, repeated queries, warehouses that suspend when idle, and cold data on cheaper storage.",
      pauseAfter: 0.8,
    },

    // ── 9. Lake, warehouse, lakehouse ─────────────────────────────────────
    {
      id: "lake",
      scene: true,
      text: "Question nine. What is a data lake versus a warehouse versus a lakehouse? A warehouse stores structured, cleaned data in its own format, tuned for sequel.",
    },
    {
      id: "lake-lake",
      text: "A data lake keeps raw files, like Parquet and Avro, on cheap object storage: open and flexible, but with no transactions and no schema enforcement.",
      pauseAfter: 0.5,
    },
    {
      id: "lake-log",
      text: "A lakehouse puts a transaction log over those files, with a table format such as Delta Lake, Iceberg or Hudi. Each commit records which files make up the table, so every reader sees one consistent version.",
      pauseAfter: 0.5,
    },
    {
      id: "lake-gives",
      text: "That gives ACID transactions, atomic, consistent, isolated and durable, plus enforced schemas, upserts, and time travel to older versions: warehouse reliability on the lake's open, cheaper storage.",
      pauseAfter: 1.0,
    },
    {
      id: "next",
      text: "All of it assumes the data lands on time, every day. Keeping it running on time is the next round. Next: orchestration and reliability.",
    },
  ],
};
