# DataEngineer-9-Warehousing (de-warehousing): report

**Length** 7:25 (444.7 s voiced, `npm run cues`), 37 beats, 9 scenes. **Voiced** in one run: 4 takes, 6,020 characters sent (5,982 of text, inside the plan's 5,000 ±20%); no re-voices, no `--force`.

**Questions** (9, numbered aloud in the page's words; deep dives only, no quick round, as the plan gives this part):
1. What is OLTP vs OLAP, and how does storage differ? 2. Why is columnar storage faster for analytics? (one scene: four sales as a table, then the same 24 values as a row store and a column store; the page's query, and what DuckDB read from each file)
3. Compare Parquet, ORC, and Avro. 4. Why is compression more effective in columnar formats?
5. What is partitioning, and what makes a good partition key? 6. What is clustering (or sorting) within a partition?
7. What is the tradeoff between file size and the small files problem? 8. What drives cost in a cloud data warehouse, and how do you control it? 9. What is a data lake vs a warehouse vs a lakehouse? (closes on the bridge, "Next: orchestration and reliability", hero again)
Merged from pipelines.mdx, answered inside the question that covers them (not read aloud again): partition key (5), Parquet over CSV (2 and 3), Avro and ORC (3), small files (7), lakehouse (9), cost strategies (8). Not here, per the plan: ETL vs ELT (Part 6), SCD recap (Part 4), star schema (Part 3), materialized views (Part 2).

**Facts** (check.mjs → results.json → data.ts; DuckDB-Wasm 1.32.0 / DuckDB v1.4.3, reruns byte-identical). Probe result: DuckDB-Wasm in Node can `COPY ... TO 'x.parquet'/'x.csv'`, `PARTITION_BY` included, and `copyFileToBuffer` returns the bytes; registering a copy with `collectFileStatistics` measures the bytes a query reads. One seeded table (setseed 0.42), labelled on screen and aloud as made up: a million rows in the page's six `sales` columns, 2024 in date order. Measured: CSV 39.2 MB vs Parquet 9.4 MB (zstd 6.3); the page's query reads all 39.2 MB of CSV vs 5.0 MB of Parquet (plans project category, amount, units); region 5.5 MB text vs 380 KB (~3 bits/row), amount 6.8 vs 4.2 MB, dates in order 3 KB, region sorted 554 bytes; by month 12 files, March `Scanning Files: 1/12`, region filter reads 12; 9 row groups of 122,880, March overlaps 2 sorted / 9 shuffled, 1.13 vs 5.74 MB read; by day 366 files of ~27 KB, 206 KB of footers vs 4.7 KB, a year's scan opens 366 files; March from the monthly folders reads 423 KB. No timings shown. Codec speed trade-off cited from the page's chart (approximate), not measured.

**Reused**: no scene was near-identical to an earlier video (the plan names none). The SQL listing, data table, Drift, Headline and Kicker are da-sql/da-advanced-sql's kit, re-exported as ds-sql does; `lineOf` and `Spot` follow ds-sql/parts.tsx. Header of script.ts records this.

**Checks** (final code, own entry, through the queue): typecheck and lint clean for the folder; `check:cues` clean; `npm test` 70/70. `check:sync` worst +0.03 s (rows), all within ±0.12. `check:motion` 0 stretches still for 2 s or more (7:25). `check:mix` effects 30.2 LU under the narration (-50.0 vs -19.8 LUFS), peak -32 dBFS, speech a median 30.3 dB above them (closest 10.7 dB, 50 ms at 3:58). `check:frames` 1 illustration, largest stretch 0.85 (hero 520x397 from 1226x937; 280x214 at the close), 0 arrows, no tabular hyphens. Stills: 30 on the estimate, all 223 (every 2 s) on the voiced timing, then preview frames after the fixes (read highlight moved behind the bytes, which had mixed blue and yellow into green; still gaps filled in Q1, Q3, Q5, Q6; Q7 note overlap; lake label crossing its box).

**The page**
- "Applying a function to the partition column ... usually defeats pruning", and the concept check's explanation that `YEAR(event_date)` stops pruning: in DuckDB, the page's own engine, hive-partitioned files are pruned through a function (`right(sale_month, 2) = '03'` scanned 1/12; in a probe, `month(sale_date) = 3` scanned 31/366). The video says "on many engines ... DuckDB still read one file, so check your engine's plan." The concept check's stated reason is wrong for DuckDB.
- The "Revenue per category" challenge's test says "Three categories yield three rows" but expects 5 rows (the data has five categories).

**Kit and process notes**
- DuckDB-Wasm's Node bindings write `COPY ... TO` files to the real disk relative to the working directory, not to memory. My first probes wrote test files into the repo root; I deleted all of mine. check.mjs now works in a temp directory and removes it. Another builder had left day1/day2/orders_day*.parquet at the root (gone by the end).
- Background jobs default to a 30-minute limit, and queued renders were killed while still waiting for the slot (sync and mix, motion and frames each needed re-queuing with a longer timeout). The brief could say to pass a long `timeout` for queued checks.
- A shared "bytes as a bar" piece (`FileBar`, `ReadMark`, `PlanBox` in my parts.tsx) may be worth lifting into the kit if other storage videos need it.

Nothing left undone.
