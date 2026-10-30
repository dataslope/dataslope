# DataEngineer-2-SqlPerformance (de-sql-performance): report

**Length** 7:08.6 (428.6 s, `npm run cues`), 43 beats, 10 scenes. **Voiced** with Drew on eleven_v4_turbo in 4 takes, 5,951 characters (1,363 + 1,531 + 1,677 + 1,380). There were no re-voices. Plan figure ~5,400; the script is 5,937.

**Questions.** All ten are deep dives, numbered aloud and read word for word. There is no rapid round, as the plan allows.
1. A query is slow. What do you check first? 2. How do you read an EXPLAIN plan? (one scene)
3. What is an index, and when does it help (or hurt)? 4. What is a covering index?
5. What is the difference between a clustered and a non-clustered index? 6. What is partition pruning?
7. What is a correlated subquery, and why can it be slow? 8. How do you join two large tables efficiently at scale?
9. What are transaction isolation levels? 10. What is a materialized view, and when would you use one? This one also answers data-warehousing.mdx's "What is a materialized view, and when is it worth it?".
Every question is answered.

**Facts.** All facts come from `check.mjs`, which writes `results.json` for `data.ts`. They ran on PGlite 0.5.8 (PostgreSQL 18.3) through `scripts/lib/sql-engines.mjs`, plus one DuckDB 1.4.3 plan, on the video's own seeded tables: 1M orders (20 per customer for 50,000 customers), 50k customers and 10k employees. Every setup sets `default_statistics_target = 10000`, so ANALYZE reads every row. Two full runs gave byte-identical results. Without it, ANALYZE sampling moved the estimates between runs. Plans are shown as printed under EXPLAIN (ANALYZE, TIMING OFF); only `cost=` and `width=` are trimmed, and no milliseconds are shown. The twelve-partition Append is shown to its first two scans, with a note giving the count. Each question also covers the follow-up an interviewer would ask next:
- Q1: the `Rows Removed by Filter: 999980` scan.
- Q2: the stale-statistics nested loop (estimate 1, actual 50,000, 50,000 index lookups), which becomes a hash join after ANALYZE.
- Q3: 20 of 7,360 pages read. `status='shipped'` stays a Seq Scan. Write cost: 10,000 against 40,291 WAL records.
- Q4: Index Only Scan with Heap Fetches 0, at an index of 30 MB against 7,600 kB.
- Q5: CLUSTER moves customer 42's rows from 20 pages to page 6, and a later order lands on the last page.
- Q6: 1 against 12 partitions, with the same sum.
- Q7: SubPlan runs with loops=10000 (100M rows read). The CTE rewrite returns the same rows (0 differ), and DuckDB decorrelates the query itself.
- Q8: the filter cuts the join input to 84,699 rows. Sort-merge, broadcast and bucketing are drawn.
- Q9: drawn as a two-lane timeline plus the standard's table. The Postgres default and its stricter levels are cited from the docs, not run.
- Q10: the view is 366 rows; it reads 2,732 until REFRESH, then 3,232.

**Reuse.**
- Q5 opens on Data Analyst Part 1's clustered and non-clustered answer, in the same words. Its IndexFigure is copied into `ClusterScene.tsx` and re-cued. The users table and email index are read from `da-sql/results.json`.
- Q3's last beat takes over DA Part 1's "indexes slow writes" point, now with a measured count.
- The result table, headings, marks and KeyArrow come from `da-sql/parts`, and the column helpers from `da-advanced-sql/parts`, through ds-sql's re-export pattern. The hero is `de-sql-performance-cheetah.webp`, shown in the hook at 620x457.

**Checks, on the voiced cut.**
- Typecheck, lint and `check:cues`: clean for my folder.
- `npm test`: 2 failures, neither mine. de-orchestration "A DAG" and de-sql-patterns "A CTE" break the article rule, and de-sql-patterns writes "MySQL".
- `check:motion`: 0 still stretches of 2 s or more.
- `check:sync`: all 43 beats within tolerance, worst +0.04 s (join-hash).
- `check:mix`: effects at -48.2 against -20.0 LUFS, so 28.2 LU under the voice, peaking at -32.1 dBFS. Speech is a median 29.0 dB above the effects; the closest moment is 11.2 dB, at 6:45.6. The levels follow ds-sql's (-32 to -36), which makes them quieter than the README's examples.
- `check:frames`: hero stretch 0.93, 6 arrows at 0.0° bend, no tabular hyphens.
- Stills: checked on estimated timing and again on voiced timing (86 frames). Fixed from them: plan text running into the right column (Q3, Q4), the Q4 bars falling off the page, the "Postgres default" badge sitting on the Q9 arrow, the Q10 notes overlapping, and the Q8 stream crossing a label.

**Where the page is imprecise** (evidence in `results.json`, `index.returnedPlan`):
- The index answer says a full scan wins "for low-cardinality columns". In the run it is the selectivity of the value that decides, not the column's cardinality. On the same two-value `status` column, 'returned' (10%) used the index (Bitmap Index Scan) and 'shipped' (90%) was a Seq Scan. The video says "when most rows match".
- The clustered answer never says that Postgres has none (CLUSTER is one-time). The video adds it.
- data-warehousing.mdx calls a materialized view "auto-refreshing"; in Postgres it is stale until REFRESH. The video follows sql.mdx and the run.

**Shared kit.**
- da-sql's `Listing` tokenizer has no DDL or EXPLAIN keywords (CREATE, INDEX, EXPLAIN, ANALYZE, INCLUDE, CLUSTER, MATERIALIZED, VIEW, REFRESH, INSERT), so I copied it locally.
- A shared `PlanBox` (psql "QUERY PLAN" output, with marks that find a line or a span by its text) would help any plan video. Mine is in `parts.tsx`, alongside `RowGrid`, `PageStrip` and `Bar`.
- A background render job's 30-minute default timeout counts the time it waits in the queue. One of my check jobs was killed in the queue that way; pass a long `timeout`.

**Left undone.** None. The hero appears only in the hook, and I generated no extra spots.
