# DataEngineer-9-Warehousing (7:25)

## Verdict
- A careful, well-measured video. Every number said or shown matches `results.json` and the page: 39.2 vs 9.4 MB, 5.0 MB read, 380 KB vs 5.5 MB, 6.8 to 4.2 MB, 3 KB, 554 bytes, 6.3 vs 9.4 MB, 1 of 12 and 12 of 12 files, 2 of 9 row groups and 5.06 times the bytes, 366 files of 27 KB, 206 KB of footers, 423 KB. Nothing on screen is under 19px, highlights find their lines by text, and every figure is cued to its words. There is no P1.
- The biggest problems are two framings a viewer could repeat wrongly. The hook's headline says the 39.2 MB vs 5.0 MB gap is "only the layout", but most of it is Parquet's binary types and compression. Q3's Parquet card lists BigQuery and Snowflake under "the default".
- Three answers stop one step before the interviewer's follow-up. Q3 never says how Avro on Kafka gets its schema (a schema ID and a registry, which the page spells out). Q4 names only dictionary encoding: no run-length, no delta, no bit-packing, and no reason why a row format defeats them. Q5 shows a function on the key and never gives the rewrite that prunes on every engine. Q7 leaves a stale "by day" label above the compacted monthly files.
- Pacing is comfortable: 1.9 to 3.1 words/s, and every gap is 0.55 to 0.70 s within a question and 1.6 s at a cut. The one rushed spot is the Q1 to Q2 handover. There, 0.7 s separates two questions while Q1's column store is still building.
- As interview answers, the definitions hold up well. The "how would you fix or choose it" halves are thinner than the measurements around them.

## Findings

### 1. [P2] accuracy: "Only the layout differs" credits the whole CSV-vs-Parquet gap to columns
- When: 26.8-41.2 s, beat `hook-read` ("Same rows, same answer: only the layout differs") (frames element-028.jpeg, element-040.jpeg).
- What: The headline reads "A million sales, written twice. Only the layout differs." in large type, beside 39.2 MB read from the CSV and 5.0 MB from Parquet. The files differ in more than layout. The CSV is uncompressed text. The Parquet file is binary, typed, dictionary-encoded and Snappy-compressed. That alone makes it 4.2 times smaller (39.2 to 9.4 MB). Reading three columns of six accounts for only the next 1.9 times (9.4 to 5.0 MB). Q3 later says as much ("types and a schema, under a quarter of the size"), but the headline and Q2's "That's why DuckDB read only five" never separate the two.
- Why it matters: A viewer will say "columnar layout made the query read eight times less". An interviewer who knows Parquet will separate projection from encoding.
- Cause: `video/src/videos/de-warehousing/script.ts:102`; `HookScene.tsx:73` (`turn="Only the layout differs."`); `script.ts:134` (`cols-read`).
- Fix: Change the hook to "Same rows, same answer: only how they're stored differs." Change the turn to "Only the storage differs." Begin `cols-read` with: "Binary types and compression already make Parquet a quarter of the CSV; reading three columns of six cuts that to five megabytes."

### 2. [P2] accuracy: Parquet's card calls it "the default" in BigQuery and Snowflake
- When: about 118-152.6 s, beat `fmt-columnar` (frames element-151.jpeg).
- What: Under Parquet: "the default: Spark, pandas, DuckDB, BigQuery, Snowflake". The narration says "the default nearly every engine reads". That is defensible. The label instead reads as Parquet being each system's default storage format. BigQuery and Snowflake store tables in their own formats and only read and write Parquet. The page lists these names as "broadest ecosystem support".
- Why it matters: "Snowflake stores tables as Parquet" is a wrong claim to repeat in an interview.
- Cause: `FormatsScene.tsx:175`.
- Fix: Change the line to "read by nearly every engine: Spark, pandas, DuckDB, BigQuery, Snowflake".

### 3. [P2] answer: Avro on Kafka never mentions the schema ID and registry
- When: 124.7-152.6 s, beat `fmt-avro` (frames element-137.jpeg, element-151.jpeg).
- What: "Its files carry the schema they were written with. It suits streaming, one record at a time, often on Kafka... and its compatibility rules let a schema evolve." On screen, "the writer's schema in the file header" sits directly above "a record at a time: streaming, Kafka". Together they suggest each Kafka message carries its schema. The page warns against exactly this: a container file includes its schema, but a single record does not, and messages usually carry a schema ID resolved through a registry. "Compatibility rules" are never explained.
- Why it matters: "How does a consumer know the schema?" and "how does Avro evolve a schema?" are the standard follow-ups to "Avro for streaming".
- Cause: `script.ts:157`; `FormatsScene.tsx:197-199`.
- Fix: Narration: "...its files carry the schema they were written with. On Kafka, a distributed log, each message carries only a schema ID, looked up in a schema registry, and rules such as a default for every new field let that schema evolve." Screen: "files: the writer's schema in the header" and "on Kafka: a schema ID per message, from a registry".

### 4. [P2] answer: Q4 names one encoding and never says why a row format loses
- When: 152.6-211.0 s, beats `cmp` to `cmp-codec` (frames element-174.jpeg, element-210.jpeg); `cmp-amount` 175.0-181.1 s at 3.14 words/s.
- What: The answer shows dictionary encoding (region) and "long runs" (dates). It never names run-length encoding, delta encoding or bit-packing, which the page lists. It never says what the question turns on: in a row format each value sits between values of other types, so none of these encodings sees two regions in a row. It also omits the page's payoff: less I/O, so scans get faster, not just storage cheaper. Every bar compares a column's CSV text with its Parquet bytes, which mixes text-vs-binary into the "columnar" effect. `results.json` holds the clean split: region is 379,814 bytes before Snappy and 379,876 after, so the encoding did all of it, while amount is 8.0 MB plain and 4.2 MB after the codec. `cmp-amount` packs the high-cardinality case into 6 s at 3.14 words/s without naming cardinality ("random to the cent"). The screen does show "49,501 distinct values".
- Why it matters: "Which encodings, and why can't a row store use them?" is the follow-up, and the vocabulary is what the interviewer listens for.
- Cause: `script.ts:170-189`; `CompressScene.tsx:122-124` (the "CSV text against its bytes in Parquet" framing).
- Fix:
  - `cmp`: append "In a row file, each region sits between a date and an amount, so no encoding ever sees two in a row."
  - `cmp-region`: "Parquet's dictionary encoding writes each one once, then a small code a row."
  - `cmp-amount`: "Amount has about fifty thousand distinct values, too many for a dictionary, so it only shrinks from six point eight megabytes to four point two." Add `pauseAfter: 0.8`.
  - `cmp-sort`: "Sorting makes long runs, and run-length encoding stores each run as one value and a count."
  - End `cmp-codec` with "Fewer bytes also means less to read, so scans get faster."

### 5. [P2] answer: A function on the partition key is shown, but not the rewrite
- When: 245.0-255.6 s, beat `part-fn` (frames element-250.jpeg, element-255.jpeg).
- What: "On many engines, a function wrapped around the key defeats pruning. DuckDB ... still read one file, so check your engine's plan." The answer stops there. The page adds the habit to keep: a filter on the raw key, or a range on it, prunes on every engine. A "good key" is also described only as "even and not too small". The usual bad key, a high-cardinality column such as a customer ID, is never named.
- Why it matters: "So how would you write it?" and "what's a bad key?" are the next two questions.
- Cause: `script.ts:206, 211`; `PartitionScene.tsx:205-211`.
- Fix:
  - `part-fn`: "...still read one file. So filter on the key itself, as the March query did, or on a range of dates: that prunes on every engine. Then check the plan."
  - `part-region`: "...with few enough values that partitions stay even and not too small: a date, not a customer ID."
  - Add a second line under the note at y(898): "safe everywhere: filter on the key itself".

### 6. [P2] confusion: "by day · one Parquet file per day" stays above the compacted monthly files
- When: 330-338.3 s, beat `sm-fix` (frame element-337.jpeg).
- What: After compaction, the 366 squares become 12 large blocks, one per month. Their heading still reads "by day · one Parquet file per day". The day-file notes on the right have left, but this label has no `out`.
- Why it matters: The heading contradicts the picture under it, at the moment the fix is being explained.
- Cause: `SmallFilesScene.tsx:113-115` (label with no `out` and no swap).
- Fix: Give the label `out={rewriteAt + 16}`. At `rewriteAt + 20`, ink in "after compaction · 12 files of about 780 KB" in the same place.

### 7. [P3] answer: Q7's fix stops at compaction and overstates the table format
- When: 316.4-337.0 s, beats `sm-large`, `sm-fix` (frame element-337.jpeg).
- What: Prevention is never mentioned: a coarser partition key, fewer writers per partition, larger streaming batches. The figure itself shows the month partitioning that avoids the problem. "Let a table format like Delta Lake or Iceberg compact them for you" (green "compacts for you") overstates what the format does. Delta's `OPTIMIZE` and Iceberg's `rewrite_data_files` are jobs someone runs or schedules. What the format adds is an atomic swap, so readers never see a half-rewritten table. `sm-fix` runs at 2.96 words/s and introduces compaction plus two table formats that Q9 only explains 80 s later. Also, the compacted files (780 KB) sit far left of the green 128 MB to 1 GB target on the same ruler.
- Why it matters: "How do you prevent it?" usually follows "how do you fix it?". "It's automatic" is the claim an interviewer will test.
- Cause: `script.ts:249`; `SmallFilesScene.tsx:189-192`.
- Fix: `sm-fix`: "Prevent them by writing fewer, larger files: a coarser key, fewer writers, bigger batches. Fix them with compaction, a job that rewrites many small files into a few large ones; a table format like Delta Lake or Iceberg commits that rewrite in one step, so readers never see it half done." Screen: replace "compacts for you" with "commits the rewrite atomically".

### 8. [P3] answer: Q6 never says what to cluster on, or how it pairs with partitioning
- When: 257.2-294.7 s, beats `cl` to `cl-shuffle` (frame element-295.jpeg).
- What: The question is about clustering within a partition. The demo clusters one unpartitioned file by date, the column Q5 just partitioned on. It never says the usual pairing: partition by date, then cluster by the next column queries filter on (region, customer). It also never names "clustering key" (BigQuery, Snowflake) or "zone maps" (the page's term for the min/max).
- Why it matters: "Partition or cluster, and on what?" is the natural next question, and the demo's choice of date invites it.
- Cause: `script.ts:217`.
- Fix: Change `cl` to: "...It orders the rows inside each partition's files, so like values sit together: partition by date, then cluster by the next column queries filter on, such as region." End `cl-shuffle` with "...no index needed; these min-max ranges are often called zone maps."

### 9. [P3] explanation: "About three bits a row" beside a four-entry dictionary, and two sort orders both shown as wins
- When: 162.2-192.8 s, beats `cmp-region`, `cmp-sort` (frame element-210.jpeg).
- What: The dictionary drawn holds codes 0 to 3, which fit in two bits. The narration and label say "about three bits a row" (the measured 3.04, DuckDB's writer). Nothing explains the extra bit. Separately, "in long runs of one date: 3 KB" and "sorted by region first: 554 bytes" are both green, as if both sort orders could hold at once. Sorting by region first breaks the date runs.
- Why it matters: Both invite an objection the video does not answer: four values need two bits, and you can only sort by one column first.
- Cause: `script.ts:174, 184`; `CompressScene.tsx:131-132, 164`.
- Fix: Narration "then a code of a few bits a row". Label "in Parquet, a few bits a row: 380 KB". In `cmp-sort`: "Sorted by region instead, the region column falls to five hundred fifty-four bytes, but you sort by one column first, so pick the one queries filter on."

### 10. [P3] accuracy: The cost answer files storage under compute and mixes compression into "read less"
- When: 338.6-379.5 s, beats `cost`, `cost-read`, `cost-compute` (frame element-380.jpeg).
- What: "Cold data on cheaper storage" sits under "Compute less often", and storage is never named as a cost driver. The read-less bars run from 39.2 MB (CSV) to 5.0 MB (Parquet). That drop mixes compression with column pruning. On BigQuery's own tables, on-demand queries are billed by the logical (uncompressed) bytes of the columns read. There, columns and partitions cut the bill and compression does not.
- Why it matters: Naming the three meters (scan, compute, storage) and which lever moves each is the crisp version of this answer.
- Cause: `CostScene.tsx:64, 129-131`; `script.ts:257, 267`.
- Fix:
  - `cost`: add "...like Snowflake and Redshift; storage is billed too, usually the smaller part."
  - Move "cold data on cheaper storage" under a third head, "Store cheaper".
  - Add a 21px note under the bars: "BigQuery bills the columns and partitions you read, not the compressed bytes".

### 11. [P3] explanation: Terms used before they are defined, or never defined
- When:
  - "DuckDB" at 16.7 s (`hook-read`)
  - "run in batches" at 96 s (`cols-more`; vectorized execution is never named)
  - "pruning" at 231.8 s (`part-region`)
  - "row group" at 267.3 s (`cl-stats`, given only a size)
  - "footer" at 302.8 s (`sm-day`)
  - "a table format" at 326.9 s (`sm-fix`, defined only at 403 s)
  - "upserts" at 417 s (`lake-gives`)
- What: Each term is said once with no gloss. The page glosses DuckDB as "a columnar engine" and pruning as skipping partitions that can't match.
- Why it matters: Viewers new to Parquet internals lose the thread at exactly the terms an interviewer uses.
- Cause: `script.ts:102, 139, 206, 221, 239, 249, 289`.
- Fix: Add short glosses:
  - "DuckDB, the engine the page's queries run in"
  - "run in batches, which engines call vectorized execution"
  - "pruning, skipping folders that can't match"
  - "each row group, a slice of rows stored column by column"
  - "its own footer, the block of schema and statistics"
  - "a table format, a log of which files make up the table"
  - "upserts, update or insert by key"

### 12. [P3] pacing: Q1 hands over to Q2 in 0.7 s while Q1's figure is still building
- When: 71.7-73.5 s, beats `rows-olap` to `cols` (frame element-071.jpeg; tiles at 72 and 73 s).
- What: At "and so on" (about 71.7 s), the column store still has only `sale_id` and `sale_date`. Region, category, units and amount land over the next 0.9 s. In the same second, the Q1 card, the table and four notes fade out, and the Q2 card starts typing at 72.9 s. Q1's finished figure is never on screen with its own question. This is the only boundary between questions with 0.7 s instead of 1.6 s.
- Why it matters: The viewer gets no beat between two questions, and about ten things move at once.
- Cause: `script.ts:125` (`pauseAfter: 0.7`); `RowsScene.tsx:91` (`groupAt` puts four blocks after `soOnAt`); `RowsScene.tsx:128, 140` (the card and table leave at `q2At - 4` and `q2At - 2`).
- Fix: Set `rows-olap` to `pauseAfter: 1.4`. Change `groupAt` to `c === 0 ? idAt : dateAt + (c - 1) * 6`, so the store is complete about 1 s before the Q1 card leaves.

### 13. [P3] spacing: In Q6, the March band washes out "Mar" and the right-hand labels crowd the edge
- When: 279-296.3 s, beats `cl-stats`, `cl-shuffle` (frame element-295.jpeg).
- What: The yellow March band (0.55 opacity) is drawn over the month labels, so "Mar" is the faintest month on the axis. "5.74 MB read, 5 times as much" ends about 40 px from the right edge (the left margin is 100 px). "Feb 14 to Mar 30" and "Mar 30 to May 14" sit about 8 px above the next row-group bar.
- Why it matters: The highlighted month is the one label the viewer needs to read.
- Cause: `ClusterScene.tsx:143-161` (the `<rect>` comes after the month `<g>`); `ClusterScene.tsx:20` (`RIGHT = 1530`); `STEP = 22` at line 18.
- Fix: Move the band's `<rect>` before the month labels, or start it at `y(MONTHS_Y) + 30`. Set `RIGHT = 1500` and put "5 times as much" on its own line. Set `STEP = 26`.

### 14. [P3] spacing: In Q9, the lakehouse's gains sit under the other two columns, and the log text and bridge overrun
- When: 417.0-444.7 s, beats `lake-gives`, `next` (frames element-431.jpeg, element-442.jpeg).
- What:
  - "ACID transactions, enforced schemas, upserts, time travel" (green checks) run under the Warehouse and Data lake columns, directly below the lake's red "no transactions, no schema enforcement". The Lakehouse column stays empty below its note.
  - "v3 remove file 1, add file 4 · an upsert" runs past the transaction log's grey paper by about 12 px.
  - The bridge line "All of it assumes..." and "Next: orchestration and reliability" share a row but sit about 14 px apart in baseline.
- Why it matters: The checks read as belonging to the column above them. The overrun and the offset baselines look unfinished in the closing frame.
- Cause: `LakeScene.tsx:273` (the row at `X0`); `LakeScene.tsx:254` (the label inside a log of `PANEL_W - 88`); `LakeScene.tsx:295-301` (`Note` at `y(852)`, `NextLine` at `y(842)`).
- Fix:
  - Set the four checks as a 2x2 list in the Lakehouse column at `px(2)`, `y(660)`, or head the row "Lakehouse adds:".
  - Widen the log to `PANEL_W - 56`, or move "an upsert" onto the file-chip row.
  - Put the `NextLine` on its own row at `y(910)`, or align the two baselines.

### 15. [P3] other: The partition folders flash white going into and out of red
- When: 232-235 s (`part-region`) and 245-247 s (`part-fn`) (frame element-246.jpeg).
- What: The folders fade from pink to pure white (sampled 254,254,254 at 246 s), then snap to their blue tint. The reverse happens when the region filter starts.
- Why it matters: A one-frame snap reads as a glitch.
- Cause: `PartitionScene.tsx:36`. The trap fill mixes `ACCENT` into `PAPER`, but at `trap = 0` the fill is `COLUMN_TINT.sale_id`.
- Fix: Mix into the folder's own tint: `color-mix(in srgb, ${ACCENT} ${26 * trap}%, ${COLUMN_TINT.sale_id})`.
