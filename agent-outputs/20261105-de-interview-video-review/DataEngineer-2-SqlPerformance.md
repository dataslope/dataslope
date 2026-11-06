# DataEngineer-2-SqlPerformance (7:09)

## Verdict
- The numbers hold up. Every figure said or shown matches `results.json` and the page: 999,980 removed, estimate 1 against 50,000 actual and 50,000 lookups, 20 of 7,360 pages, 900,000 shipped, 10,000 against 40,291 WAL records, 7,600 kB against 30 MB, 20 pages to page 6, 84,699 in March and December, the twelve partition counts summing to 1,000,000, 10,000 loops over 10,000 rows, 366 rows, 2,732 then 3,232. Real plans on screen make this the most concrete video of the SQL pair.
- The one obvious visual defect is the B-tree in Question 3. The leaf node floats unconnected to its parent, and the fan of pointers to customer 42's twenty pages comes out of key 43, not the highlighted 42. That breaks the picture that defines an index.
- Three moments let the figure contradict the narration. The correct plan (a Seq Scan on a 90% filter) is marked red. The non-covering read ("20 pages read") appears in red exactly on "the table itself is never read", and the narration never mentions it. The correlated subquery's "100,000,000 rows read" is cleared before the fix, and the fix's own count is never shown.
- As interview answers, the ten are right but four stop short of the page. Question 2 never mentions cost or spills. Question 5 never names an engine that has a clustered index. Questions 6 and 10 present Postgres behaviour as universal where the page says it depends on the engine.
- Pacing is comfortable: 2.0 to 3.1 words/s, and no gap under 0.55 s. Only the materialized view's two one-day plans flash by, in about 2 s and 4 s, unread.

## Findings

### 1. [P1] confusion: The B-tree's leaf is unconnected, and its pointers come from key 43
- When: 105-121 s, beats `index` and `index-help` (element-119.jpeg).
- What: The root connects to the two inner nodes, but no line joins the left inner node to the leaf `41 | 42 | 43 | …`. All that is drawn there is a 60px stub along the leaf's top edge, so the leaf floats about 27px below its parent. On "the twenty pages that hold its rows", twenty gold lines fan from the leaf to the page strip. Their apex sits under `43` (x≈1411), while `42` (x≈1349) is the slot highlighted yellow.
- Why it matters: "each value points at its rows" is the definition being taught, and the drawing shows a disconnected tree whose pointer leaves from the wrong key.
- Cause: `video/src/videos/de-sql-performance/IndexScene.tsx:143`: the third edge is `[leafX + 60, leafY - 26, leafX, leafY]`, and line 145 adds 24 to every `y1`. The edge therefore starts at `leafY - 2`, which is the leaf's own top, not inside the parent. `IndexScene.tsx:97` sets `hotX = leafX - 31 + 31 = leafX`, which is the boundary between slots 1 and 2, and line 163 adds 31 more (`sx = hotX + 31`), which is the centre of slot 2 (`43`).
- Fix: third edge `[leafX + 60, leafY - 70, leafX + 20, leafY]`, so it starts inside the parent and ends on the leaf's top. `const hotX = leafX - 31;` (the centre of slot 1, `42`) and `const sx = hotX;` at line 163.

### 2. [P2] confusion: The correct plan is marked red
- When: 128-144 s, beats `index-low` and `index-writes` (element-143.jpeg).
- What: "even with an index on status, Postgres scans the table: one pass beats nine hundred thousand jumps". The `Seq Scan` it chose is banded red, the series' colour for the trap or the wrong answer. The note beside it explains why the scan is the better plan.
- Why it matters: the colour says the planner got it wrong, which is the opposite of the point. A viewer can come away thinking a Seq Scan beside an index is always a mistake.
- Cause: `IndexScene.tsx:208`, `marks={[{ line: "Seq Scan", text: "Seq Scan", at: scansAt, color: MARK_RED }]}`.
- Fix: `color: MARK_OK`, or the default yellow mark, since the narration is pointing at it.

### 3. [P2] confusion: The non-covering read lands, in red and unnarrated, on "never read"
- When: 152.5-161.5 s, beats `cover` and `cover-include` (element-155.jpeg).
- What: On "so the table itself is never read", the screen adds `Heap Blocks: exact=20` (yellow), twenty red ticks on "the table's pages" and the red note "20 pages read, to fetch 20 amounts". The narration never says that this is the plan *without* a covering index. The next beat goes straight to "This query wants customer ID and amount. Add amount to the index with include". At about 159 s the index table already shows the `amount` column while the red "20 pages read" note is still up. "Heap", in "zero heap fetches", is never defined.
- Why it matters: the definition and its counter-example arrive on the same word, so the "before" half of the before/after is something the viewer has to work out alone.
- Cause: `CoverScene.tsx:97-99` (the before plan and its `Heap Blocks` mark at `neverAt`), `:147` (red ticks at `neverAt - 6`, out at `onlyAt + 6`), `:153-157` (red note at `neverAt + 4`, out at `onlyAt`), `:132` (the amount column at `includeAt + 2`). The script line is `script.ts:180`.
- Fix: rewrite `cover-include` as "This query wants customer ID and amount. With an index on customer ID alone, Postgres still reads twenty pages of the table, its heap, to fetch the amounts. Add amount to the index with include, and the plan becomes an index only scan, with zero heap fetches." Cue the `Heap Blocks` mark, the ticks and the red note to "twenty pages of the table". End the red ticks and the note at `includeAt`, before the `amount` column opens.

### 4. [P2] answer: "How do you read an EXPLAIN plan?" leaves out cost and spills
- When: 62-92 s, beats `explain`, `explain-rows`, `explain-fix` (element-084.jpeg, element-095.jpeg).
- What: The answer covers steps, indentation, estimated against actual rows, and ANALYZE. The page's answer also lists (1) node types *and their cost estimates* and (4) sort/hash spills that indicate memory pressure. Every plan in the video has `cost=` trimmed (`data.ts:53-54`), so a viewer who opens a real plan meets `cost=0.00..19860.00` first and has never heard of it. The fresh plan on screen at 89-97 s prints `Buckets: 65536  Batches: 1  Memory Usage: 2014kB`, the spill indicator, with nothing said about it. "Statistics were last gathered" also leaves the obvious follow-up open: autovacuum normally re-analyzes, and bulk loads are what outrun it.
- Why it matters: "what does cost mean?" and "how would you see a spill?" are the two follow-ups this question gets most, and the page names both.
- Cause: `script.ts:133-144`; `SlowScene.tsx:180-211`.
- Fix: in `explain`, after "feeding the line above them", add "Each step carries the planner's cost, in its own units, and the rows it expects." Keep `cost=` on the stale plan's top line. In `explain-fix`, add "Also watch for a sort or hash that spills to disk: here one batch, in two megabytes of memory." Mark `Batches: 1` yellow on that word. Change "after statistics were last gathered" to "after the last analyze, before autovacuum ran it again".

### 5. [P2] answer: The clustered-index answer never names an engine that has one
- When: 175-209 s, beats `cluster` to `cluster-decay` (element-209.jpeg).
- What: The video defines a clustered index and then spends 18 s on Postgres, which has none. It never says where the term comes from. SQL Server keeps a clustered index ordered as rows change. MySQL's InnoDB clusters every table by its primary key, and its secondary indexes store that key, so a secondary lookup is two index searches. The page names both, plus the warehouse equivalent (`CLUSTER BY` in Snowflake and BigQuery).
- Why it matters: the question is SQL Server and MySQL vocabulary. An interviewer will ask "so what is InnoDB's clustered index?" or "how do warehouses do this?", and the video leaves the viewer with only "Postgres doesn't have one".
- Cause: `script.ts:193-205`; `ClusterScene.tsx` has no note for it.
- Fix: in `cluster-many`, add "SQL Server and MySQL's InnoDB have one: InnoDB stores each table in primary-key order, and its other indexes point at that key." Show it as a 22px note under the left figure. In `cluster-decay`, end with "Warehouses get the same effect from clustering keys."

### 6. [P2] accuracy: "Wrap the column in a function, and pruning is gone" is stated as a rule
- When: 229-239.6 s, beat `prune-fn` (element-239.jpeg).
- What: The narration and the screen state flatly that wrapping the partition column in a function disables pruning. The page says it "depends on the engine (Postgres scans every partition, DuckDB still prunes), so write a range on the raw column and confirm it in the plan". Two scenes later, the video itself says "read the plan before you rewrite" about a different optimisation.
- Why it matters: a viewer will repeat it as a universal rule, and an interviewer who works on DuckDB, Spark or a warehouse with expression pruning can correct them.
- Cause: `script.ts:222`.
- Fix: "Wrap the column in a function, extract month equals three, and Postgres loses the pruning: the same total, read from all twelve. Some engines still prune it; filter on the partition key itself, and check the plan." Add "in Postgres" to the red note at `PruneScene.tsx:172-174`: "12 of 12 partitions read, in Postgres".

### 7. [P2] explanation: The correlated subquery's cost is cleared before the fix, and the fix's cost is never shown
- When: 251-272 s, beats `corr-loop` and `corr-fix` (element-260.jpeg, element-263.jpeg, element-282.jpeg).
- What: "That's a hundred million rows read" is shown as "= 100,000,000" in red. At "Compute the averages once" the query, the plan and that number are all removed, and for about 2.5 s the left 60% of the frame is empty while the rewrite types in on the right. The rewrite's plan then shows two `Seq Scan on employees (actual rows=10000.00)`, which is 20,000 rows read. Neither the narration nor the screen says so. "The same ten thousand rows" refers to the output, which is easy to mishear as the cost.
- Why it matters: "why can it be slow" is answered by contrast, 100,000,000 against 20,000, and the video shows only one side of it.
- Cause: `CorrScene.tsx:56` (`fixOut = onceAt - 2`, applied to the "rows read" note at `:107`); `script.ts:240`.
- Fix: dim the old note at `onceAt` instead of removing it. At `sameAt`, add a green line under it: "rewrite: 2 scans × 10,000 = 20,000". Narration: "...and join: one hash join over two scans, twenty thousand rows read instead of a hundred million, and the same result."

### 8. [P2] pacing: The two one-day plans are up for about 4 s and 2 s, and the narration reads neither
- When: 393.6-397.9 s, beat `mv-fast` (element-397.jpeg).
- What: "One day, from the view" (`Seq Scan on daily_revenue`, `Rows Removed by Filter: 365`) inks in on "a dashboard reads" at about 393.6 s. "The same day, from the orders" (`GroupAggregate` over a `Seq Scan on orders`, `Rows Removed by Filter: 997268` in red) inks in on "instead of the orders" at about 395.6 s. Both leave on "The price is staleness" at 397.6 s, after a 0.60 s gap. The narration also says the dashboard "reads one of those", while the plan on screen reads all 366 and keeps one.
- Why it matters: this is the payoff of the materialized view (366 rows read against a million), and it is a seven-line plan comparison shown for less time than it takes to read.
- Cause: `MvScene.tsx:85-92` (`out={staleAt}` on both plans and labels); `script.ts:309-310` (`pauseAfter: 0.6`).
- Fix: narration "...so a dashboard's lookup reads three hundred sixty-six rows, where the same day from the orders reads all million." Set `pauseAfter: 1.5`. Move both plans' `out` to `addAt`.

### 9. [P2] answer: Staleness is presented as how every materialized view works
- When: 397.6-406.6 s, beat `mv-stale` (element-404.jpeg).
- What: "the view still says two thousand seven hundred thirty-two, until it's refreshed" is Postgres behaviour. The video says it also answers data-warehousing.mdx's "when is it worth it?" (`script.ts:22-24`). That page says "Who refreshes it depends on the engine: Postgres keeps it stale until you run `REFRESH MATERIALIZED VIEW`, while some cloud warehouses maintain it in the background". It also names refresh cost as part of the price. The video mentions neither.
- Why it matters: a data engineer is likely to be asked about warehouse materialized views, where "it goes stale until you refresh" is the wrong answer.
- Cause: `script.ts:314`.
- Fix: "The price is staleness. In Postgres, add five hundred orders on New Year's Eve, and the view still says two thousand seven hundred thirty-two until you refresh it, which reruns the whole query. Some warehouses refresh in the background, for a compute cost." Add a 22px note under the `REFRESH` listing: "some warehouses refresh it for you".

### 10. [P3] confusion: Twenty lit squares stand for twenty rows
- When: 48-61 s, beats `slow-scan` and `slow-wins` (element-061.jpeg).
- What: The grid is labelled "a thousand rows a square". On "kept twenty", a full column of 20 squares turns yellow, which reads as 20,000 rows, or 2% of the table. The rows kept are 0.002%.
- Why it matters: the picture understates exactly the waste the beat is about.
- Cause: `SlowScene.tsx:79, 130` (the `hits` squares fill yellow).
- Fix: draw a 4px yellow dot in each hit square instead of filling it. Or add "one kept row in each lit square" under "kept 20".

### 11. [P3] accuracy: "Every insert writes all of it", and sizes in two units
- When: 164-175 s, beat `cover-cost` (element-174.jpeg).
- What: The narration says "every insert writes all of it", which can be heard as rewriting the whole 30 MB index. The screen has the right version: "Every insert writes the wider index too." The two sizes are shown as `7600 kB` and `30 MB`, which have to be converted before the "four times" can be checked.
- Why it matters: it is a small inaccuracy, plus a comparison the viewer has to do in their head.
- Cause: `script.ts:185`; `CoverScene.tsx:180, 196` print `pg_size_pretty` as it is.
- Fix: "and every insert writes its amount into it too." Show `7.4 MB` and `30 MB`, computed from `bytes`.

### 12. [P3] confusion: Partition boxes from the previous state hang on, and the fix is cut off
- When: 229-241 s, beat `prune-fn` (element-239.jpeg).
- What: March stays lit green ("pruned") for about 6 s while the `EXTRACT` query, which will read all twelve, is typed under it. On "Filter on the partition key itself", the twelve red boxes go back to plain blue, which suggests something was fixed, but no result is shown. The fix is printed as `order_date >= …`, cut off.
- Why it matters: it is a small mismatch between the boxes and the query beneath them.
- Cause: `PruneScene.tsx:88` (green ends at `allAt`), `:89` (red fades at `keyAt + 6`), `:182`.
- Fix: end March's green at `wrapAt`. Keep the boxes red to the cut. Print the whole range: `order_date >= '2024-03-01' AND order_date < '2024-04-01'`.

### 13. [P3] confusion: "Shrink both sides", and a broadcast with no big table
- When: 289-329 s, beats `join` and `join-dist` (element-327.jpeg).
- What: The heading reads "Shrink both sides before the join", but only `orders` is filtered: the hash side is all 50,000 customers. During "Broadcast a small table to every machine", each machine box shows only `customers`. The orders that stay where they are, which are the point of a broadcast, are not drawn.
- Why it matters: the label claims something the plan beside it does not do, and the broadcast picture does not show why broadcasting saves anything.
- Cause: `JoinScene.tsx:111`; `JoinScene.tsx:242-248`.
- Fix: "Shrink the big side before the join". In the broadcast state, draw `orders 1`, `orders 2` and `orders 3` (ink, staying put) under each machine's `customers` copy.

### 14. [P3] explanation: "The page" and "write-ahead log" are never introduced
- When: 247-284 s, beats `corr` to `corr-duck` (element-260.jpeg, element-282.jpeg); 134-143 s, beat `index-writes` (element-143.jpeg).
- What: The labels say "The page's query" and "The page's rewrite". The narration says "DuckDB, the page's engine", and DuckDB has not appeared before. A viewer watching the video alone does not know which page is meant. The write-cost bars are titled "write-ahead log records", and the narration says "log records" without saying what the log is or why it measures write cost.
- Why it matters: these are small gaps, but they come at points that carry a claim.
- Cause: `CorrScene.tsx:78, 137`; `script.ts:245`; `IndexScene.tsx:219`; `script.ts:167`.
- Fix: "A classic example, on 10,000 employees…" and "The usual rewrite". "DuckDB, another engine, plans the same subquery as a hash join." "…wrote ten thousand records to the write-ahead log, which every change goes through first, with no index…"

### 15. [P3] pacing: Two dense beats carry new concepts
- When: 307.5-316.3 s, beat `join-merge` (3.09 w/s, gap 0.60); 186.0-189.9 s, beat `cluster-many` (3.07 w/s, gap 0.60).
- What: The sort-merge join and both of its winning conditions arrive in one 8.8 s beat at the video's fastest rate. The non-clustered index is defined in 3.9 s.
- Why it matters: both introduce a term an interviewer will push on.
- Cause: `script.ts:196, 263`.
- Fix: split `join-merge` after "walks them together" with `pauseAfter: 0.8`. Set `cluster-many` to `pauseAfter: 0.9`.

### 16. [P3] answer: "Zero heap fetches" depends on a freshly vacuumed table
- When: 161-164 s, beat `cover-include` (element-174.jpeg).
- What: `Heap Fetches: 0` holds because `check.mjs:149` runs `VACUUM ANALYZE orders` between creating the index and taking the plan. In Postgres an index-only scan checks the visibility map, and pages changed since the last vacuum still go to the table. That is the standard Postgres follow-up to this answer.
- Why it matters: the viewer may claim that an `INCLUDE` index never touches the table.
- Cause: `script.ts:180`.
- Fix: a 21px note under the plan, "0 because the table was just vacuumed: pages changed since then are still fetched".

### 17. [P3] other: The hook's caption reads as twenty orders a day
- When: 10-32 s, beats `hook-table` to `slow-in` (element-031.jpeg).
- What: "50,000 customers, 20 orders each, every day of 2024" can be parsed as 20 orders per customer per day.
- Why it matters: it is a minor misreading of the table every later number depends on.
- Cause: `HookScene.tsx:81`.
- Fix: "50,000 customers, 20 orders each, spread over 2024".

### 18. [P3] spacing: One-word orphan in the serializable note
- When: 368-381 s, beats `iso-repeat` and `iso-cost` (element-379.jpeg).
- What: "Serializable: as if A and B ran one at a" wraps, leaving "time." alone on the second line.
- Why it matters: polish.
- Cause: `IsoScene.tsx:262` (`width: 460`).
- Fix: `width: 500`, or break it deliberately after "as if".

### 19. [P3] confusion: The insert's columns are unnamed
- When: 399-428 s, beats `mv-stale` to `next` (element-404.jpeg).
- What: `INSERT INTO orders SELECT 1000000 + g, g, DATE '2024-12-31', 50.00, 'shipped'` gives no column list, so the second `g` (the customer) and `50.00` (the amount) have to be guessed. The red "the orders now hold 3,232" sits on the 2,732 cell, while the stale revenue beside it (142152.98) is left unmarked.
- Why it matters: it is a small reading cost on the figure that carries the staleness point.
- Cause: the statement at `check.mjs:255`, printed by `MvScene.tsx:95`; the mark at `MvScene.tsx:104`.
- Fix: print `INSERT INTO orders (id, customer_id, order_date, amount, status)` as the first line. Band the revenue cell red together with the orders cell.
