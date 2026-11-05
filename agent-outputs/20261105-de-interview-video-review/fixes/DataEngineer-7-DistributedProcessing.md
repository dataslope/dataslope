# DataEngineer-7-DistributedProcessing: fixes

Folder `video/src/videos/de-distributed/`. Report:
`agent-outputs/20261105-de-interview-video-review/DataEngineer-7-DistributedProcessing.md`
(1 P1, 6 P2, 7 P3). Compare against `4bff3bc`, the last commit before this
pass (the coordinator's checkpoint `1bd4fe3` holds the voicing).

All 14 findings fixed. Four of the P3s, and part of finding 3, are fixed on
screen only, to stay inside the voice budget; the table says which. One fix
the video cannot make on its own: the site's chart
`charts/memory-latency-ladder.mjs` (finding 3, below).

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P1 | fixed | Both lanes redrawn with what is really written. Hadoop: map, grey disk "local disk", reduce, red disk "HDFS, replicated", map, "local disk", reduce, "HDFS"; the red note reads "every reduce: / HDFS, read back / by the next map". Spark: map, grey "local disk", reduce, a blue "memory" arrow, map, "local disk", reduce; green note "memory between steps, / disk only at a shuffle". The spill disk is gone. The green loop now runs back to a `cache()` chip over the first map, labelled "iterate: every pass reads the cache". `hadoop-spark` re-voiced: "Spark, a newer cluster engine, passes data between steps in memory; only a shuffle writes to local disk. Cache a dataset, and iterative work, like machine learning, reads it from memory on every pass." Each piece is cued to its words. |
| 2 | P2 answer | fixed | `lazy-action` split at its sentence break (cut free); new beat `lazy-too`: "Collect, write and count on a whole DataFrame are actions too; the grouped count is not." Chips in that order, `collect()`, `write`, `df.count()`, each on its word; a red 22px note "`groupBy().count()` is still a transformation", and listing line 3 is marked yellow on "the grouped count is not". |
| 3 | P2 | fixed in the video; the chart is not | `check.mjs` still reads the chart's levels, but replaces its last row (10 ms, the disk seek of the table the chart cites) with that table's round trip within one data center, 500,000 ns, and prints a note while the chart disagrees. The ladder's row is "Data-center round trip": 500,000 ns, 5,000 × memory, 6 days in the stretched column (`networkDays` 5.79). The title no longer says "from the page's chart" ("Latency, order of magnitude"). `shuffle-ladder` re-voiced: "An SSD read takes a thousand times as long as memory, and a round trip inside the data center five thousand times. If the fastest cache took one second, that round trip would take almost six days." Serialization is on screen only: the map side reads "serialized to local disk" (the `shuffle` beat keeps its words). |
| 4 | P2 answer | fixed | The model is titled "rows per partition by user key", and the screen no longer counts it: the two-step lines read "aggregate in two steps, if it can't combine locally" and "1 by salted key, then 2 by key", so the count that Q12 says combines locally is gone. `skew-steps` split (its first sentence cut free); new beat `skew-join`: "In a join, copy the other side's guest rows once per suffix, so every salted row still finds its match", drawn as the other side's `guest` chip copied to `guest#0` … `guest#7`, and "every salted row still finds its match". `skew-aqe` re-voiced: "… or let adaptive query execution split skewed join partitions." Screen: "or: adaptive query execution splits skewed join partitions / re-planning while the job runs". I kept the narration's order (aggregate, then join) rather than calling the model a join, so the two cases sit side by side; the join sentence costs 103 characters instead of re-voicing the whole beat. |
| 5 | P2 answer | fixed | New beat `cache-level`: "Cache is persist at its default level, memory and disk; persist lets you pick the level, like memory only." On screen: "`cache()` is `persist(MEMORY_AND_DISK)`; or pick a level: `MEMORY_ONLY`, `DISK_ONLY`". The green partition boxes and the "with one" step say "cached", not "in memory". "`unpersist()` when done" sits under "used once: wasted memory". The `cache` beat itself is unchanged. |
| 6 | P2 | fixed | `partitions` split at its last sentence (both pieces cut free); new beat `part-exec` between them: "Cores belong to executors, the worker processes; the driver plans the job and hands them tasks." Each row of the 16-core grid gets a bracket and "executor 1" to "executor 4", and a "driver / plans the job" box sends an arrow to each, cleared before the partition counts arrive. The Q10 boxes are named "executor 1" to "executor 4". `r-collect` is unchanged: the driver is now glossed in Q5, and the Q16 figure already labels the box "driver". |
| 7 | P2 | fixed | Row groups `width: 300`, step 316: the third ends at x 1712, "skipped" well inside. |
| 8 | P3 | fixed | Hook numerals 1 to 3 in `INK` bold; the plan's `action` tag in `BLUE_INK` bold. |
| 9 | P3 | fixed on screen | Rewrite 4 reads "pick the join strategy (when the plan has a join)", the bracket in soft ink. Narration unchanged. |
| 10 | P3 | fixed | The grid arrives on "one task works on one partition" with core 1 outlined yellow and one partition block in it; "A model: 16 GB on 16 cores" stays on its own words (now beat `part-model`). The gap after the comma is 6. |
| 11 | P3 | fixed on screen | Under the config name: "default 10 MB: / this 20 MB lookup needs the hint" (`BROADCAST.autoThresholdMB`, new in `check.mjs` from Spark's 10485760 bytes, and `dimOverThreshold`). Narration unchanged. |
| 12 | P3 answer | fixed | Three new beats, each with a line on screen: `stage-spec` "Speculative execution starts a copy of a slow task on another executor." (green note with `spark.speculation`); `part-one` "But coalesce to one, and the steps before it run as a single task." (red "`coalesce(1)`: the steps before it run as one task"); `lineage-wide` "Past a shuffle, that replay needs output from every parent." (the narrow replay clears, all three map partitions turn yellow, their three lines into the reduceByKey partition thicken, that partition is "lost", and the note reads "past a shuffle: needs every parent's output"). `lineage-lost` split for it (both pieces cut free). |
| 13 | P3 | fixed | `TRACK_W` 530; the Q12 divider at x 1030 ("120 + 140" ends about 40 px before it); the lookup's copies now run left from the source, down one purple trunk between the executors and the notes, and in to each executor box's edge, where the copy slides in (the suggested curves, ended at the edge, turned 34 to 62 degrees under their heads, so `check:frames` would have failed them); each executor's name sits at its top left, over its two blocks; the "with one" `write` arrow is an `Elbow` from the cached step's right edge. |
| 14 | P3 | fixed | `stage` split; `stage-cut` re-voiced: "… so each shuffle adds a stage." The pushdown query reads "`SELECT region, amount … WHERE amount > 500`". The sort-merge buckets are "partition 1" to "partition 3", same keys. |

No finding was judged wrong.

## Voice

1,172 characters re-voiced, each beat on its own, 895 for the P1 and P2s and
277 for P3s:

- P1 and P2: `hadoop-spark` 200, `shuffle-ladder` 196, `skew-aqe` 107,
  `cache-level` 106, `skew-join` 103, `part-exec` 95, `lazy-too` 88.
- P3: `stage-cut` 81, `stage-spec` 71, `part-one` 66, `lineage-wide` 59.

Cut free from the kept takes: `lazy-action`, `partitions`, `part-model`,
`stage`, `skew-steps`, `lineage-lost`, `lineage-ckpt`. No take was recorded or
changed. Against `4bff3bc`, every other beat's MP3 is byte-identical.

Left unvoiced for the budget: "serialize" in `shuffle` (on screen instead), the
join-strategy and 10 MB clauses (on screen instead), and `r-collect`'s driver
gloss (moved to Q5).

## Length and checks

CHECKS_PLACEHOLDER

## Facts

`check.mjs` was run from the repository root as its header says. Every
existing value in `results.json` came back identical except the ladder's
network row, which is finding 3: `levels[6]` (now "Data-center round trip",
500000 ns, "6 days"), `networkOverMemory` 100000 → 5000, `networkOrders`
5 → 4, and `source.ladder`. New: `ladder.networkDays` (5.79),
`broadcast.autoThresholdMB` (10), `broadcast.dimOverThreshold` (true). The
skew model's `partials` and `total` are still computed but no longer drawn.

## What the site needs (not mine to edit)

- **`charts/memory-latency-ladder.mjs:30`.** Change
  `{ name: "Network round trip", ns: 10_000_000 }` to the data-center round
  trip, `{ name: "Round trip in a data center", ns: 500_000 }` (the 10 ms
  figure is the disk seek of the table the chart cites), and the `title`
  string's "ten million nanoseconds for a network round trip, spanning seven
  orders of magnitude" to match (about six and a half orders, from 0.3 ns to
  500,000 ns; `SPREAD` recomputes itself for the caption). The domain
  `[0.2, 3e7]` can then shrink. Once it does, `check.mjs` stops printing its
  note and gives the same numbers; the video's row name stays its own.
- **`content/interview/data-engineer/distributed-processing.mdx`.**
  - Line 217-220 makes finding 1's mistake: Hadoop's map output goes to local
    disk, not HDFS, and Spark does not keep "intermediates in memory across
    stages": every stage boundary is a shuffle, written to local disk.
  - Lines 99-100 say disk and network are "three and five orders of
    magnitude" from memory; for a round trip within a data center it is
    nearer four.

## Noticed and fixed along the way

- The ladder's dotted gridlines ran through the "0.3 ns", "30 ns" and
  "100,000 ns" labels (and would have through the new row). Each gridline now
  breaks around any row whose figure is printed across it.
- The highlight band behind the ladder's last two rows starts further left,
  so "Data-center round trip" sits inside it.
