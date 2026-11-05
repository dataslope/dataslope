# DataEngineer-7-DistributedProcessing (10:04, 603.6 s)

## Verdict
- A clean, legible video overall. All 17 of the page's questions are answered, in the page's words, and every number on screen matches `results.json` and the page: 388/172/205, 16 GB on 16 cores, 3.1 times the average, 1 GB against 2 TB, 250 times fewer, 69 tasks and 87%. Nothing on screen is under 19 px. Figures build on the spoken word, and the reuse of the seven salary rows (Q1, Q6, Q12) holds the video together well.
- The biggest problem is a self-contradiction. Q2's Spark lane says the map-to-reduce hand-off happens "in memory", and Q7 then says, correctly, that map tasks write their output to local disk. Two more things a viewer would repeat wrongly: Q3 lists `count()` as an action directly under a listing whose `.count()` is a lazy transformation, and the latency ladder's "network round trip, 100,000 times memory" uses 10 ms, which is the disk-seek figure. The ladder comes from the page's own chart, so the chart needs the same fix.
- Pacing is comfortable: 2.0 to 3.1 words a second, no gap under 0.55 s, and every finished scene holds about 1.6 s or more before its cut. The only drag is Q5's opening, about 7 s of two lines of text before the figure arrives.
- As interview answers they mostly hold up, and several go a step past the page (coalesce before writing, the fan-out math, the hot key's memory risk, lazy caching). The weakest are skew and caching. The skew model salts a count, which Q12's local combining already defuses, and it leaves out how to salt a join and that AQE's skew handling only applies to joins. The caching answer never says what `persist` adds over `cache`. "Executor" and "driver" are used but never explained.

## Findings

### 1. [P1] accuracy: Q2 says Spark's map-to-reduce hand-off stays in memory, which Q7 contradicts
- When: 90 to 101 s, beat `hadoop-spark` (element-095.jpeg, element-107.jpeg). Contradicted at 241 to 250 s, beat `shuffle` (element-270.jpeg).
- What: The Spark lane draws map → reduce → map → reduce joined by blue arrows labelled "memory", with the notes "in memory, across steps" and "spills to disk only under pressure". The narration says Spark "keeps intermediate results in memory, spilling to disk only under pressure". Two and a half minutes later Q7 says "Map tasks write their output to local disk, and reduce tasks fetch it over the network", over map tasks writing to "local disk". In Spark, every map-to-reduce boundary is a shuffle, and shuffle output always goes to local disk. The real difference from Hadoop is the reduce-to-next-map step: Hadoop writes a replicated HDFS file there, and Spark keeps the job going in memory. The green "iterate: much faster" loop also implies the speed-up is automatic, but for iterative work it comes from caching the reused dataset (Q14).
- Why it matters: The video gives both answers. A viewer who says "Spark keeps the shuffle in memory" will be corrected by any interviewer who knows shuffle files.
- Cause: `video/src/videos/de-distributed/HadoopScene.tsx:125` (a blue memory arrow between every pair of Spark steps), `:130-139` ("memory", "in memory, across steps"), `:141-145` (the spill disk), `:148-164` (the iterate loop with no cache). Also `script.ts:154`, which repeats the page's "in memory across stages".
- Fix: Redraw both lanes with what is really written:
  - Hadoop: map → "local disk" → reduce → "HDFS, replicated" → map → "local disk" → reduce → "HDFS".
  - Spark: map → grey disk "shuffle: local disk" → reduce → blue "memory" → map → "shuffle: local disk" → reduce.

  Start the green loop from a `cache()` chip. Re-voice `hadoop-spark`: "Spark, a newer cluster engine, runs the whole job without writing to HDFS between steps: only a shuffle touches local disk. Cache a dataset, and iterative work, like machine learning, reads it from memory on every pass."

### 2. [P2] confusion: `count()` is shown as an action under a listing whose `.count()` is a transformation
- When: 129 to 133 s, beat `lazy-action` (element-131.jpeg).
- What: Line 3 of the listing is `grouped = filtered.groupBy("region").count()`, which the narration has just counted among the lazy steps (the plan node "Count by region" did not run). Directly under it, "actions too:" shows a `count()` chip, and the narration says "Count, collect and write are actions too." Only `DataFrame.count()` is an action. `groupBy().count()` returns a DataFrame and runs nothing.
- Why it matters: This is the exact trap interviewers set on this question, and the screen makes a careful viewer doubt the right answer.
- Cause: `video/src/videos/de-distributed/LazyScene.tsx:19` (the listing line) and `:147` (the `count()` chip). Also `script.ts:172`.
- Fix: Make the chip `df.count()` and add a 22 px note under the chips: "`groupBy().count()` is still a transformation". Re-voice: "A count on the whole DataFrame, collect and write are actions too; the grouped count on line three is not."

### 3. [P2] accuracy: the "network round trip" on the latency ladder is a disk-seek figure
- When: 250 to 265 s, beat `shuffle-ladder` (element-252.jpeg, element-270.jpeg).
- What: "a network round trip a hundred thousand times [as long as memory] ... would take a hundred sixteen days" is drawn from a 10,000,000 ns (10 ms) bar. In the Jeff Dean latency table the chart cites, 10 ms is the disk seek. A round trip inside one data center, where a shuffle runs, is about 500,000 ns. That is 5,000 times memory, about 6 days at one second per cache hit. The beat also drops serialization, which the page names as one of the shuffle's three costs.
- Why it matters: The number is spoken as a sourced fact, so viewers will repeat it, and it overstates the network by 20 times.
- Cause: `charts/memory-latency-ladder.mjs:30` (`{ name: "Network round trip", ns: 10_000_000 }`), parsed by `video/src/videos/de-distributed/check.mjs:44-49` into `data.ts:76`. Also `script.ts:230-238`.
- Fix: In the chart, change the row to "Round trip in a data center", 500_000 ns, and re-run `check.mjs`. (The alternative is to keep 10 ms and relabel the row "Disk seek".) Re-voice: "a round trip inside the data center five thousand times. If the fastest cache took one second, that round trip would take almost six days." In `shuffle`, say "Map tasks serialize their output to local disk".

### 4. [P2] answer: the skew fix salts a count, and skips join salting and AQE's join-only scope
- When: 325 to 368 s, beats `skew-model`, `skew-salt`, `skew-steps` (element-369.jpeg).
- What:
  - The model is a count by key ("then count in two steps": 8 partials of about 37,500, then 300,079). A minute later, Q12 says a DataFrame group by "also combines locally". With local combining, a count's hot key crosses the shuffle as one partial per map task, not as 387,836 rows.
  - Skew of this shape, and salting as its fix, belongs to a join, or to an aggregation that cannot combine (such as collecting a list). For a join, salting has a second half that the video never gives: copy the other table once per salt value.
  - The last line, "adaptive query execution splits skewed partitions", drops the page's "skew-join". AQE only splits skewed join partitions, and AQE itself is never explained.
- Why it matters: "How do you salt a join?" is the standard follow-up. The video's own model is the one case where a sharp interviewer would say salting is not needed.
- Cause: `video/src/videos/de-distributed/SkewScene.tsx:212-221` (the two-step count) and `:230` (the AQE line). Also `script.ts:272-286`.
- Fix: Call the model a join on the user key (the bars are unchanged). Re-voice `skew-steps`: "In a join, copy the other table once for each suffix, so every salted row still finds its match; in an aggregation, combine by the salted key and then by the key. Or handle nulls and stand-in keys separately, or turn on adaptive query execution, which re-plans at run time and splits skewed join partitions." Change the screen line to "or: adaptive query execution splits skewed join partitions".

### 5. [P2] answer: "caching or persisting" never says how persist differs from cache
- When: 509 to 539 s, beats `cache`, `cache-when` (element-539.jpeg).
- What: The question names both, and interviewers press on the difference. `cache()` is `persist()` at the default storage level, and `persist()` takes a level (memory only, memory and disk, disk only, serialized). The answer never says this. The narration and the green "in memory" boxes also say a DataFrame's cache sits in memory, but a DataFrame's default level is memory and disk (the page says "in memory (or memory+disk)"). `unpersist()` is never mentioned, so "used once, it wastes memory" has no remedy.
- Why it matters: Half of the question goes unanswered, and that half is the obvious follow-up.
- Cause: `video/src/videos/de-distributed/script.ts:346-354`; `LineageScene.tsx:164` (the "in memory" label).
- Fix: Re-voice `cache`: "Cache keeps a DataFrame's computed partitions, in memory and spilling to disk if they don't fit, so the next action reuses them instead of replaying the lineage. Persist is the same with a storage level you choose, like memory only or disk only." Show a chip row: `cache()` = `persist(MEMORY_AND_DISK)`. Add "`unpersist()` when done" under "used once: wasted memory".

### 6. [P2] explanation: "executor" and "driver" are used but never explained
- When: First at 370 to 385 s, beat `broadcast` ("to every executor"), then `bc-model` (385 to 400 s), `lineage-lost` (495 to 508 s) and `r-collect` (562 to 574 s) (element-397.jpeg, element-573.jpeg).
- What: The hook and Q1 talk about "machines". From Q10 the narration switches to "executor" with no explanation, and the Q10 figure's green boxes, which are the executors, carry no label. "Driver" first appears in the second quick answer, glossed only as "one machine". Driver and executors (one process plans and schedules, many processes run the tasks) are the vocabulary of four of these answers, and the video glosses easier names (MapReduce, Hadoop, Parquet) but not these two.
- Why it matters: An interviewer expects this vocabulary, and a viewer meets "executor" cold in the middle of a definition.
- Cause: `video/src/videos/de-distributed/script.ts:289` (first "executor"), `:368` (the "driver" gloss); `BroadcastScene.tsx:153` (executor boxes drawn with no `name`).
- Fix: Gloss both once in Q5's `partitions` beat: "one task works on one partition, on one core of an executor, a worker process the driver hands tasks to". Name the Q10 boxes `executor 1` to `executor 4`. In `r-collect` say "to the driver, the one process that plans the job".

### 7. [P2] spacing: "skipped" runs over the right border of the third row-group box
- When: 581 to 592 s, beat `r-push` (element-591.jpeg).
- What: In "min 15 · max 260 skipped", the last letters of "skipped" sit on and past the box's right border. "min 3 · max 120 skipped" has about 10 px to spare.
- Why it matters: Text crosses a box edge in the last answer of the video.
- Cause: `video/src/videos/de-distributed/RapidScene.tsx:190` (fixed `width: 270` with 14 px padding and a 10 px gap, too narrow for the longest row) and `:183-186` (290 px step).
- Fix: Set `width: 300` and step 316 (the row then ends at x 1712), or set "skipped" at `label(19)` and drop the gap to 6.

### 8. [P3] confusion: red is used for things that are not traps
- When: 9 to 23 s, beat `hook-three` (element-023.jpeg); 124 to 156 s, beats `lazy-action` to `lazy-rewrite` (element-131.jpeg, element-155.jpeg).
- What: The hook numbers its three themes with red numerals. The Q3/Q4 plan marks "Show" with a red `action` tag for 32 s. Neither is a trap, a wrong answer or an error.
- Why it matters: It works against the series' one-meaning-per-color rule.
- Cause: `video/src/videos/de-distributed/HookScene.tsx:170,175,180` (`ACCENT_INK` numerals); `LazyScene.tsx:219` (`label(20, ACCENT_INK)`).
- Fix: Use `INK` bold for the numerals, and `BLUE_INK` bold for `action`, which also matches the blue "run".

### 9. [P3] explanation: Q4 names two rewrites that its plan cannot show
- When: 149 to 156 s, beat `lazy-rewrite` (element-155.jpeg).
- What: "3 fuse chained steps" and "4 pick the join strategy" are listed against a plan with no join and no visible fusion. Rewrites 1 and 2 are drawn (the filter folds into the scan, and the columns are pruned); 3 and 4 are only asserted.
- Why it matters: A viewer may wonder which join this is.
- Cause: `video/src/videos/de-distributed/LazyScene.tsx:93-96`; `script.ts:182`.
- Fix: Replace "picks the join strategy" with a rewrite this plan really gets, partial counts before the shuffle ("counts each partition before the shuffle", which sets up Q12). Or say "and, when the plan has a join, picks its strategy".

### 10. [P3] spacing: Q5 opens on two lines of text for about 7 s
- When: 162 to 169 s, beat `partitions` (element-167.jpeg).
- What: While "A partition is the unit of parallelism: one task works on one partition, on one core" is spoken, the screen holds only those two lines, with the rest of the frame empty. The 16-core grid arrives at "Model it with sixteen gigabytes". The second line also shows a visible double gap before "on one core".
- Why it matters: The sentence that defines the term has no picture, though the grid that shows it is two seconds away.
- Cause: `video/src/videos/de-distributed/PartitionScene.tsx:105` (the grid is cued at `modelAt`) and `:96` (`gap: 14` after a trailing comma).
- Fix: Cue the grid at `taskAt`, with one core lit and one block in it, and the 16 GB label at `modelAt`. Set the gap to 6.

### 11. [P3] answer: the broadcast threshold's default is not given, and the page's 20 MB lookup is above it
- When: 395 to 400 s, beat `bc-model` (element-397.jpeg).
- What: "Below a size threshold, Spark broadcasts by itself, and a hint forces it" follows the 20 MB lookup. The default `spark.sql.autoBroadcastJoinThreshold` is 10 MB, so this very case would not broadcast without the hint. "What's the default?" is a common follow-up.
- Cause: `video/src/videos/de-distributed/BroadcastScene.tsx:231-236`; `script.ts:295`.
- Fix: Add "default 10 MB" under the config name, and re-voice: "Below a size threshold, ten megabytes by default, Spark broadcasts by itself; this lookup is over it, so here a hint forces it."

### 12. [P3] answer: three answers stop one step before the follow-up
- When: 297 to 309 s `stage-tail`; 198 to 207 s `part-change`; 495 to 508 s `lineage-lost`.
- What:
  - The fan-out math shows why stragglers dominate but never names the fix, speculative execution (`spark.speculation`).
  - Coalesce is called "the cheap way" without the catch. It is a narrow step, so `coalesce(1)` runs the whole upstream stage as one task, and `repartition(1)` can be faster.
  - "Replays those steps for that partition alone" holds for narrow steps only. A lost partition after a shuffle needs shuffle output from every parent, which is why checkpointing long, wide lineages pays.
- Cause: `video/src/videos/de-distributed/script.ts:259`, `:210`, `:341`.
- Fix: Add one clause to each:
  - `stage-tail`: "Speculative execution reruns a slow task elsewhere."
  - `part-change`: "but coalescing to one runs the step before it as one task."
  - `lineage-lost`: "past a shuffle, it needs every parent's output."

### 13. [P3] spacing: lines and bars touch or cross box edges
- When:
  - 288 to 310 s (element-309.jpeg): the stage task tracks run flush into both stage boxes' right borders.
  - 450 to 479 s (element-478.jpeg): "120 + 140" ends about 11 px from the divider.
  - 375 to 426 s (element-425.jpeg): the lookup curves cut through the right borders of executor boxes 1 to 3.
  - 527 to 540 s (element-539.jpeg): the "with one" `write` arrow starts in empty space instead of from the "in memory" chip.
- Cause: `video/src/videos/de-distributed/StageScene.tsx:24-25` (`TRACK_X + TRACK_W` = `S_W`); `ReduceScene.tsx:144` against `:159`; `BroadcastScene.tsx:180` (curve end inside the box); `LineageScene.tsx:302` (`arrow(722, 790, 1)` on row 1).
- Fix:
  - Set `TRACK_W` to 530.
  - Move the divider to x 1030, or set the sum note at `label(19)`.
  - End the curves at the box edge (`EX_X + EX_W + 4`) and draw the copy flying in.
  - Draw the second arrow as an `Elbow` from the in-memory chip's right edge down to `write`.

### 14. [P3] accuracy: small slips between narration and screen
- When: 279 to 286 s, beat `stage`; 586 to 592 s, beat `r-push` (element-591.jpeg); 407 to 426 s, beat `smj` (element-425.jpeg).
- What:
  - "Counting shuffles counts stages" is off by one against the screen's own "1 shuffle → 2 stages".
  - Projection pushdown highlights `region` as read, but the only query shown is `WHERE amount > 500`.
  - The sort-merge figure buckets keys by range ("keys 1 to 3"), where Spark hash-partitions both sides on the key.
- Cause: `video/src/videos/de-distributed/script.ts:248`; `RapidScene.tsx:157` against `:174`; `BroadcastScene.tsx:49`.
- Fix:
  - Say "each shuffle adds a stage".
  - Show `SELECT region, amount ... WHERE amount > 500`.
  - Label the buckets "partition 1" to "partition 3" and keep the same keys in them.
