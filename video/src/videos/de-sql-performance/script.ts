import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "SQL II: performance" (16:9), Part 2 of the Data Engineer
 * interview prep videos
 * (agent-outputs/20261030-1600-data-engineer-interview-video-plan.md, "2. SQL
 * II: performance"), after content/interview/data-engineer/sql.mdx. It
 * answers the page's ten performance questions, all as deep dives, numbered
 * aloud and read word for word (no rapid round, as the plan allows):
 *
 *   1. "A query is slow. What do you check first?" and 2. "How do you read an
 *      EXPLAIN plan?" ("slow", "explain").
 *   3. "What is an index, and when does it help (or hurt)?" ("index").
 *   4. "What is a covering index?" ("cover").
 *   5. "What is the difference between a clustered and a non-clustered
 *      index?" ("cluster").
 *   6. "What is partition pruning?" ("prune").
 *   7. "What is a correlated subquery, and why can it be slow?" ("corr").
 *   8. "How do you join two large tables efficiently at scale?" ("join").
 *   9. "What are transaction isolation levels?" ("iso").
 *   10. "What is a materialized view, and when would you use one?" ("mv"),
 *       which also answers data-warehousing.mdx's "What is a materialized
 *       view, and when is it worth it?" (moved here: SQL asks it first).
 *
 * Reuse: question 5 opens on Data Analyst Part 1's rapid answer (da-sql,
 * "r-index" and "r-index-many"), in its words, with its figure copied into
 * ClusterScene.tsx and re-cued, on its users table and email index read from
 * da-sql/results.json; its "every index slows writes" item is question 3's
 * last beat, now with a measured count. The listing, result table and error
 * kit are da-sql's, through ds-sql's parts pattern.
 *
 * The opening is written fresh: a table too big to scan, drawn as a
 * thousand squares, and the promise counted from what the video does (ten
 * questions; nine answered on a real Postgres plan or run, isolation drawn).
 * The bridge into Part 3: a fast query starts with tables shaped for it.
 *
 * Facts. Every plan, count and size ran on the site's Postgres (PGlite 0.5.8,
 * PostgreSQL 18.3) through scripts/lib/sql-engines.mjs, by check.mjs into
 * results.json, which data.ts reads; the one DuckDB plan ran in DuckDB-Wasm
 * 1.32.0, the page's engine. The tables are the video's own, seeded with
 * generate_series and fixed expressions (no random draws): orders, 1,000,000
 * rows, 20 for each of 50,000 customers, dates spread over 2024;
 * customers, 50,000; employees, 10,000 in ten departments. Plans are shown as
 * Postgres prints them under EXPLAIN (ANALYZE, TIMING OFF), with each node's
 * "cost=…" and "width=…" trimmed (its estimated rows kept); no milliseconds
 * are shown, since timings in WebAssembly are not a server's.
 *   - "slow": WHERE customer_id = 42 is a Seq Scan, 20 rows kept, "Rows
 *     Removed by Filter: 999980".
 *   - "explain": 50,000 'pending' orders inserted after the last ANALYZE;
 *     the join's plan estimates 1 row, gets 50,000, and runs a Nested Loop
 *     with 50,000 index lookups (loops=50000); after ANALYZE the estimate is
 *     exactly 50,000 and the plan a Hash Join (every setup sets
 *     default_statistics_target to 10,000, so ANALYZE reads every row and
 *     two full runs of check.mjs give identical results).
 *   - "index": with an index on customer_id the same query is a Bitmap Heap
 *     Scan reading 20 of the table's 7,360 pages (Heap Blocks: exact=20).
 *     WHERE status = 'shipped' (900,000 rows) stays a Seq Scan beside an
 *     index on status. Inserting 10,000 rows writes 10,000 WAL records with
 *     no index and about four times that with three (EXPLAIN (ANALYZE, WAL)).
 *   - "cover": INCLUDE (amount) gives an Index Only Scan, "Heap Fetches: 0";
 *     the covering index is about four times the plain one's size (B-tree
 *     deduplication shrinks the plain one; an INCLUDE index cannot use it).
 *   - "cluster": customer 42's 20 rows sit on 20 pages (ctid); after CLUSTER
 *     orders USING the customer index, on one; an order inserted afterwards
 *     lands on the table's last page. Postgres has no clustered index (docs,
 *     "CLUSTER": a one-time operation, not maintained).
 *   - "prune": orders partitioned by month, twelve partitions; March's sum
 *     scans one (84,699 rows); EXTRACT(MONTH FROM order_date) = 3 scans all
 *     twelve, and both sums agree.
 *   - "corr": the page's correlated subquery: SubPlan with loops=10000 over
 *     a 10,000-row Seq Scan; the page's CTE rewrite is one Hash Join with the
 *     same rows (EXCEPT finds none different); DuckDB plans the correlated
 *     form itself as HASH_JOIN over HASH_GROUP_BY.
 *   - "join": with December's filter, 84,699 orders enter the Hash Join
 *     instead of 1,000,000; the hash side is the 50,000 customers. Sort-merge,
 *     broadcast and bucketing are drawn (Part 7 runs the distributed side).
 *   - "iso": not run (PGlite is one connection). The anomalies are the SQL
 *     standard's; Postgres's default level (Read Committed), its Read
 *     Uncommitted behaving as Read Committed, and its Repeatable Read
 *     preventing phantoms are from the Postgres docs, "Transaction Isolation".
 *   - "mv": daily_revenue is 366 rows; a day's lookup reads 366 rows, not a
 *     million; 500 orders added on 2024-12-31 leave it at 2,732 orders until
 *     REFRESH, then 3,232.
 *
 * Written for Drew's ear: "sequel" for SQL, Postgres keywords as words
 * ("explain analyze", "sub plan"), numbers as they are said, and initialisms
 * only where a beginner knows them (CTE expanded once).
 */
export const script: NarrationScript = {
  id: "de-sql-performance",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Writing a correct sequel query is half the interview. The other half starts when the table has a million rows.",
    },
    {
      id: "hook-table",
      text: "Here is that table: a million orders from fifty thousand customers, in Postgres, generated so every plan in this video can be run again.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "Ten questions about making queries fast. Nine are answered on a real Postgres database. One, isolation levels, is drawn, because it needs two sessions at once.",
      pauseAfter: 0.7,
    },
    { id: "slow-in", text: "Start where every slow query starts." },

    // ── 1, 2. A slow query, and reading the plan ──────────────────────────
    {
      id: "slow",
      scene: true,
      text: "Question one. A query is slow. What do you check first? The plan. Put explain analyze in front of the query, and Postgres runs it and reports what each step did.",
      pauseAfter: 0.5,
    },
    {
      id: "slow-scan",
      text: "Here it's a sequential scan. It read every row, kept twenty, and threw away nine hundred ninety-nine thousand, nine hundred eighty.",
      pauseAfter: 0.7,
    },
    {
      id: "slow-wins",
      text: "That points at an index. The other usual fixes are filtering early, selecting only the columns you need, and pruning partitions.",
      pauseAfter: 0.6,
    },
    {
      id: "explain",
      text: "Question two. How do you read an explain plan? Each line is a step, and the indented steps run first, feeding the line above them.",
      pauseAfter: 0.5,
    },
    {
      id: "explain-rows",
      text: "Then compare estimated rows with actual rows. Fifty thousand pending orders arrived after statistics were last gathered. Postgres expected one row, so it picked a nested loop, and ran fifty thousand index lookups.",
      pauseAfter: 0.7,
    },
    {
      id: "explain-fix",
      text: "Analyze refreshes the statistics. The estimate becomes fifty thousand, and the plan becomes a hash join.",
      pauseAfter: 0.8,
    },
    { id: "index-in", text: "The first fix the scan pointed at: an index." },

    // ── 3. Indexes ────────────────────────────────────────────────────────
    {
      id: "index",
      scene: true,
      text: "Question three. What is an index, and when does it help, or hurt? It's a sorted structure over a column, a B-tree by default, where each value points at its rows.",
      pauseAfter: 0.5,
    },
    {
      id: "index-help",
      text: "It helps when a filter is selective. Postgres finds forty-two in the index, then reads only the twenty pages that hold its rows, out of seven thousand three hundred sixty.",
      pauseAfter: 0.7,
    },
    {
      id: "index-low",
      text: "It doesn't help when most rows match. Nine in ten orders are shipped, so even with an index on status, Postgres scans the table: one pass beats nine hundred thousand jumps.",
      pauseAfter: 0.7,
    },
    {
      id: "index-writes",
      text: "And every index costs writes. Ten thousand inserted rows wrote ten thousand log records with no index, and four times that with three.",
      pauseAfter: 0.8,
    },

    // ── 4. Covering indexes ───────────────────────────────────────────────
    {
      id: "cover",
      scene: true,
      text: "Question four. What is a covering index? One that holds every column a query needs, so the table itself is never read.",
      pauseAfter: 0.5,
    },
    {
      id: "cover-include",
      text: "This query wants customer ID and amount. Add amount to the index with include, and the plan becomes an index only scan, with zero heap fetches.",
      pauseAfter: 0.7,
    },
    {
      id: "cover-cost",
      text: "The price is size: this index is four times the plain one, and every insert writes all of it. Cover the few queries that run constantly.",
      pauseAfter: 0.8,
    },

    // ── 5. Clustered and non-clustered ────────────────────────────────────
    {
      id: "cluster",
      scene: true,
      text: "Question five. What is the difference between a clustered and a non-clustered index? A clustered index sets the order rows are stored in, so a table gets one.",
      pauseAfter: 0.4,
    },
    { id: "cluster-many", text: "A non-clustered index is a separate lookup, and you can have many.", pauseAfter: 0.6 },
    {
      id: "cluster-pg",
      text: "Postgres has no clustered index. Its cluster command sorts the table by an index once. Customer forty-two's twenty orders sat on twenty pages; after cluster, they share one.",
      pauseAfter: 0.7,
    },
    {
      id: "cluster-decay",
      text: "But the order isn't kept: the next order for forty-two lands on the table's last page.",
      pauseAfter: 0.8,
    },

    // ── 6. Partition pruning ──────────────────────────────────────────────
    {
      id: "prune",
      scene: true,
      text: "Question six. What is partition pruning? Split orders by month into twelve partitions, and a query that filters on the date reads only the months that can match.",
      pauseAfter: 0.5,
    },
    {
      id: "prune-one",
      text: "March's revenue: the plan scans one partition, nearly eighty-five thousand rows, and skips the other eleven.",
      pauseAfter: 0.7,
    },
    {
      id: "prune-fn",
      text: "Wrap the column in a function, extract month equals three, and pruning is gone: the same total, read from all twelve. Filter on the partition key itself.",
      pauseAfter: 0.8,
    },

    // ── 7. Correlated subqueries ──────────────────────────────────────────
    {
      id: "corr",
      scene: true,
      text: "Question seven. What is a correlated subquery, and why can it be slow? It reads a column of the outer row, like each employee's department average.",
      pauseAfter: 0.5,
    },
    {
      id: "corr-loop",
      text: "Postgres runs it as a sub plan, once per row: ten thousand times, each a scan of ten thousand employees. That's a hundred million rows read.",
      pauseAfter: 0.7,
    },
    {
      id: "corr-fix",
      text: "Compute the averages once, in a CTE, a common table expression, and join: one hash join, the same ten thousand rows. A window function works too.",
      pauseAfter: 0.6,
    },
    {
      id: "corr-duck",
      text: "Some optimizers do that rewrite themselves. DuckDB, the page's engine, plans the same subquery as a hash join. So read the plan before you rewrite.",
      pauseAfter: 0.8,
    },

    // ── 8. Joining two large tables ───────────────────────────────────────
    {
      id: "join",
      scene: true,
      text: "Question eight. How do you join two large tables efficiently at scale? First, make them smaller. Filter to December, and nearly eighty-five thousand orders reach the join instead of a million.",
      pauseAfter: 0.6,
    },
    {
      id: "join-hash",
      text: "Then pick the strategy. A hash join builds a hash table from the smaller side, here fifty thousand customers, and streams the orders past it. It's the usual default.",
      pauseAfter: 0.6,
    },
    {
      id: "join-merge",
      text: "A sort-merge join sorts both sides on the key and walks them together, which wins when both are already sorted, or too big to hash in memory.",
      pauseAfter: 0.6,
    },
    {
      id: "join-dist",
      text: "Across many machines, the cost is moving rows. Broadcast a small table to every machine, or bucket both tables on the join key, so matching rows already sit together.",
      pauseAfter: 0.8,
    },

    // ── 9. Isolation levels ───────────────────────────────────────────────
    {
      id: "iso",
      scene: true,
      text: "Question nine. What are transaction isolation levels? They set what one transaction can see of another's changes. Here, one reads a balance twice while another changes it.",
      pauseAfter: 0.5,
    },
    {
      id: "iso-dirty",
      text: "Read uncommitted allows a dirty read: seeing a change before it commits, which may yet roll back.",
      pauseAfter: 0.5,
    },
    {
      id: "iso-committed",
      text: "Read committed, Postgres's default, sees only committed changes. But the second read now returns fifty: a non-repeatable read.",
      pauseAfter: 0.5,
    },
    {
      id: "iso-repeat",
      text: "Repeatable read returns a hundred both times, though the standard still allows phantoms: new rows that match a filter the second time. Serializable acts as if the transactions ran one at a time.",
      pauseAfter: 0.6,
    },
    {
      id: "iso-cost",
      text: "Each level up prevents more and allows less concurrency; serializable transactions can fail and must be retried.",
      pauseAfter: 0.8,
    },

    // ── 10. Materialized views ────────────────────────────────────────────
    {
      id: "mv",
      scene: true,
      text: "Question ten. What is a materialized view, and when would you use one? It's a query's result, stored like a table.",
      pauseAfter: 0.5,
    },
    {
      id: "mv-fast",
      text: "Daily revenue from a million orders becomes three hundred sixty-six rows, so a dashboard reads one of those instead of the orders.",
      pauseAfter: 0.6,
    },
    {
      id: "mv-stale",
      text: "The price is staleness. Add five hundred orders on New Year's Eve, and the view still says two thousand seven hundred thirty-two, until it's refreshed.",
      pauseAfter: 0.6,
    },
    {
      id: "mv-when",
      text: "Use one for an expensive aggregation that's read far more often than its data changes, where some lag is fine.",
      pauseAfter: 0.8,
    },
    {
      id: "next",
      text: "Indexes, partitions, stored results: each one shapes a table around the queries it serves. A fast query starts with tables shaped for it. Next: dimensional modeling.",
    },
  ],
};
