# DataEngineer-7-DistributedProcessing (`de-distributed`): build report

**Length** 10:03.6 (603.6 s, `npm run cues -- de-distributed`), 49 beats, 13 scenes. **Voiced** 8,273 characters in 6 takes (Drew, `eleven_v4_turbo`), no re-voices. Plan figure 6,900 ±20%: 8,273 is just inside the 8,280 bound.

**Questions** (all 17 on the page, none moved in; deep dives numbered aloud in the page's words):
1 What is the MapReduce mental model? · 2 How is Spark different from classic Hadoop MapReduce? · 3 What is the difference between a transformation and an action in Spark? · 4 Why does Spark use lazy evaluation? · 5 What is a partition in Spark, and why does partition count matter? · 6 What is the difference between narrow and wide dependencies? · 7 What is a shuffle, and why is it expensive? · 8 What is a stage and a task in Spark's execution model? · 9 What is data skew, and how do you fix it? · 10 What is a broadcast join and when should you use it? · 11 What is a sort-merge join, and how does it differ from a broadcast join? · 12 What is `groupByKey` vs `reduceByKey`, and why does it matter? (read "group by key versus reduce by key") · 13 How does Spark achieve fault tolerance? · 14 What does caching/persisting do, and when is it worth it? (read "caching or persisting").
Rapid (on screen only): 15 RDD vs DataFrame · 16 Why avoid `collect()` · 17 Predicate and projection pushdown. None left out.
Each deep dive ends one step past the page's answer where it has one: coalesce vs repartition before writing; the stage waits for its slowest task (fan-out chart); the average partition never moves under salting, only the largest; the broadcast threshold and the hint; the hot-key memory risk of `groupByKey`; checkpointing; caching is lazy.

**Reused**
- Course video PandasGroupby: its seven-row frame (its `measurements.json`), department colors and the row-card/flight pieces (copied from its `kit.tsx` into `parts.tsx`, re-cued). Q1 runs a MapReduce on it (3 splits, map, shuffle, reduce) and `check.mjs` stops unless the reduce equals PandasGroupby's agg (388, 172, 205). Q6 and Q12 return to the same rows.
- Page furniture from `da-pandas/parts` (Drift, Kicker, Headline, Listing), `lineOf` copied from `ds-sql`, `Axes` from `da-statistics-communication`.
- The page's charts `memory-latency-ladder` (Q7) and `tail-latency-fanout` (Q8) are redrawn from their own source: `check.mjs` parses their LEVELS / RATES and recomputes the chart's own "if L1 took one second" column and 1-0.99^n. `bar-hides-distribution`'s point (the mean says nothing) is the skew scene's "the average never moved".

**Facts** (`check.mjs` → `results.json` → `data.ts`, Pyodide 314.0.7, plain Python, seeded). No Spark: each number is said and shown as a model. groupByKey vs reduceByKey on the frame 7 vs 6 pairs; model 1,000,000 clicks / 1,000 products / 4 partitions: 1,000,000 vs 4,000 (250×). Skew model, 1,000,000 rows / 8 partitions / "guest" on 30.0%: largest 387,836 = 3.1× the 125,000 mean; salted 0–7, largest 125,402 (1.0×), two-step count 8 partials of about 37,500 = 300,079. Latency: SSD 1,000× memory, network 100,000×, 116 days at L1 = 1 s. Fan-out: 69 tasks slow half the time (0.5002), 200 tasks 87%. Partition arithmetic: 16 GB on 16 cores: 4 × 4 GB (12 idle), 100,000 × 160 KB, 64 × 250 MB (4 per core). Broadcast: the page's concept-check 2 TB / 20 MB on 50 executors = 1 GB vs about 2 TB shuffled.

**Checks** (final code, own entry, through the queue)
- Typecheck, lint, `check:cues`, `npm test`: no failures in `de-distributed` (npm test 70/70 at the last run).
- `check:motion`: pass, 0 still stretches of 2 s or more over 10:03.8.
- `check:sync`: SYNC
- `check:mix`: MIX
- `check:frames`: FRAMES
- Stills every 3 s on the estimate (two passes) and on the voiced timing, looked at; fixed z-order (row cards under machine boxes), overlaps (latency title on the shuffle labels, repartition diagram on a case row, chart titles on `Axes`' own titles, the lookup arrows on the join ticks), a bottom-edge overflow, and earlier first marks where a question left the page bare.

**Page and kit**
- Page error: "a shuffle turns memory access into disk and network access, and those are four and five orders of magnitude further away" (distributed-processing.mdx, under the shuffle question). Its own chart has main memory 100 ns and an NVMe SSD read 100,000 ns: three orders, not four (network 10 ms is five). The video follows the chart ("a thousand times as long as memory").
- Kit: there is no shared "cluster" vocabulary (machine/executor box, partition block, disk cylinder, many-to-many shuffle lines); built locally in `parts.tsx` (`Machine`, `Block`, `Disk`, `Curve`, `Elbow`, `Chip`), which Parts 8 to 11 could share. `Axes` (da-statistics-communication) draws its y-title 26 px above the plot, where it collided with a chart heading; this video drew its own axis titles instead. The da-pandas `Listing` takes highlight lines by index; wrapped with `lineOf`.
- Left undone: nothing required. The broadcast threshold's default (10 MB) is not stated, since the page does not give it.
