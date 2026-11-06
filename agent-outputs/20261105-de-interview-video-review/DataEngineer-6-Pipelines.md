# DataEngineer-6-Pipelines (7:45, 464.7 s)

## Verdict
- Accurate and visually clean. Every number said or shown matches `results.json`: blind insert 8 then 16, delete-then-insert 8 then 8, the rolled-back transaction still 8, the poll returning orders 2 and 4, the Binder Error's 3 columns and 4 values, and the `union_by_name` nulls. All eight question cards are read word for word. Nothing is under 19px, and I found no overlap, clipping or off-canvas element in any scene's finished frame.
- The weak spot is question 5, schema evolution. Parquet is labelled "an added column is fine" in green while its own demo shows the default read dropping that column with no error. The Avro half never says what makes a change compatible (defaults, reader against writer schema), and its registry figure fans one schema into all three modes with no verdict.
- Pacing is comfortable. Beats run at 2.04 to 3.27 words/s, every gap inside a scene is 0.6 s and every gap between scenes 1.6 s, and every finished scene holds 2.3 s or more before its cut. The exception is the quick round, where the fan-out problem's whole point (every aggregate stale) is on screen for about 1.2 s.
- As interview answers they meet the page's bar. The gaps are one step past it: "schema-on-read" and Kappa's "batch semantics" are never defined, and Kappa's replay is never explained as a mechanism. Smaller follow-ups are also missing: micro-batch, ETL for personal data, Debezium and its op codes, and the other meaning of "fan-out".

## Findings

### 1. [P2] answer: the Avro half never says what makes a change compatible, and the registry figure shows no verdict
- When: 262.5-281.7 s, beat `evo-avro` (frames element-272.jpeg, element-282.jpeg)
- What: The narration defines backward, forward and full, then stops. It never says how Avro actually evolves: each record's writer schema is resolved against the reader's schema, fields match by name, a missing field takes the reader's default, and a rename needs an alias. The figure shows "schema v2, new: …, amount, coupon" going into "schema registry, checks v2 against v1", then three green arrows fan out to backward, forward and full. Read with the series' colors, green arrows to all three say v2 passes all three. Added without a default, coupon passes forward only and fails backward and full. A registry also enforces one configured mode, not all three at once.
- Why it matters: "which changes are backward compatible?" is the standard follow-up, and the figure invites the wrong answer.
- Cause: `video/src/videos/de-pipelines/script.ts:199` (beat text); `video/src/videos/de-pipelines/EvoScene.tsx:229` (v2 drawn with no default); `EvoScene.tsx:233-248` (one green Flow from the registry to each rule).
- Fix: Rewrite `evo-avro` as: "Avro, a row format popular for messages, makes evolution a contract. A reader resolves each record's schema against its own: fields match by name, a missing field takes the reader's default, and a rename needs an alias. A schema registry holds each new schema to one rule: backward if new readers can read old data, forward if old readers can read new data, full if both. Add coupon with a default and it's fully compatible; without one, it fails backward. So it suits many services that must agree." On screen, set v2's sub to `…, coupon = null` (the default). Draw the three rules as a plain list in INK with a single arrow from the registry. Add a green pill "coupon with a default: passes all three", cued to "fully compatible", and a red line "no default: fails backward", cued to "fails backward". Re-voice `evo-avro` only.

### 2. [P2] confusion: Parquet is labelled "an added column is fine" while its own demo drops the column
- When: 233.4-251.3 s, beat `evo-parquet` (frames element-236.jpeg, element-246.jpeg, element-248.jpeg)
- What: At 235.8 s the narration says "Parquet ... handles an added column", and the label turns green: "Parquet, one file a day: an added column is fine". Nine seconds later the same read prints the red "by default: coupon dropped, and no error". The video never says what is actually true. Each Parquet file stores its own schema, so old files need no rewrite, but whether the new column survives depends on the reader merging the files by name (DuckDB's `union_by_name`, Spark's `mergeSchema`). check.mjs also measured that reading the same two files in the other order fails outright (`results.json` `parquet.plainReversed`, "schema mismatch in glob"). That is the strongest evidence that the default read is fragile, and it is not shown.
- Why it matters: a viewer leaves unsure whether "Parquet handles added columns" is true, and an interviewer will ask exactly that.
- Cause: `video/src/videos/de-pipelines/script.ts:189`; `video/src/videos/de-pipelines/EvoScene.tsx:174` (green "an added column is fine" on `addedAt`); `EvoScene.tsx:204-206`; `EVO.plainReversed` in `data.ts:76` is never used.
- Fix: Rewrite `evo-parquet` as: "Parquet, the columnar file format, keeps a schema in every file, so an added column needs no rewrite; the reader decides whether it survives. Day two's file gained a coupon. Read both in DuckDB, and by default it takes the first file's columns: coupon silently disappears, and with day two first, the read fails. Read them by name, and coupon appears, empty for day one." Change the label at `EvoScene.tsx:174` to "Parquet, one file a day: each file keeps its own schema" in INK. Under the default note, add a red line from `splitError(EVO.plainReversed)`: "day 2 first: schema mismatch error", cued to "the read fails". Leave the green for the `union_by_name` note at line 208.

### 3. [P2] explanation: "schema-on-read" is never defined, and it is the key defense
- When: 303.0-318.6 s, beat `src-more` (frames element-307.jpeg, element-319.jpeg)
- What: "Then land raw data in a schema-on-read layer, so ingestion never breaks." Defense 2 reads "Land raw data schema-on-read / so ingestion never breaks". Nothing says what schema-on-read means: store what arrives as it is, and apply a schema only when it is read. The page ties it to bronze ("(Bronze)"), which is the very next question, but the video does not make the link.
- Why it matters: an undefined term carries the answer's main strategy, and it fails to set up question 7.
- Cause: `video/src/videos/de-pipelines/script.ts:217`; `video/src/videos/de-pipelines/SourceScene.tsx:140-144`.
- Fix: Change the sentence to "Then land raw data in a schema-on-read layer, bronze in the next question: it stores what arrives as is and applies a schema only when it's read, so ingestion never breaks." Set defense 2's second line to "bronze: stored as it arrives, typed on read", cued to "applies a schema".

### 4. [P2] explanation: Kappa's deciding condition, "batch semantics", is undefined, and its replay is not explained as a mechanism
- When: 376.9-394.6 s, beats `kappa`, `kappa-when` (frames element-380.jpeg, element-388.jpeg, element-395.jpeg)
- What: "Kappa is simpler when the streaming engine can handle batch semantics" is the whole criterion for choosing Kappa, and the screen repeats "the engine handles batch semantics" without saying what that means. It means giving the same correct answer a batch job would, over history: event-time windows, exactly-once results, and enough throughput for a full replay. "Replay the event log through the same code" leaves out how that is done without downtime, which is the follow-up: start a second copy of the job at offset zero, write to a new table, and switch readers when it catches up. The dashed loop goes back into the same live job.
- Why it matters: without both, a viewer cannot say when Kappa is safe or how to reprocess in it.
- Cause: `video/src/videos/de-pipelines/script.ts:243,248`; `video/src/videos/de-pipelines/LambdaScene.tsx:119-137` (replay loop into the running job), `LambdaScene.tsx:142`.
- Fix: `kappa`: "Kappa keeps one streaming path. To reprocess history, start a second copy of the job at the start of the log, in Kafka say, writing a new table, and switch readers over once it catches up." `kappa-when`: "Kappa is simpler when the streaming engine gets batch-correct answers, with event-time windows and exactly-once results, and the log reaches back far enough to replay. Lambda is the fallback when it can't." On screen, below the job, add a dashed node "job v2 → new table" (`tone="plain"`, cued to "second copy"), point the replay loop at it, and change the line at `LambdaScene.tsx:142` to "the engine gets batch-correct answers".

### 5. [P3] answer: "ETL still fits" leaves out the commonest reason, personal data
- When: 162.6-167.0 s, beat `etl-when` (frame element-167.jpeg)
- What: "ETL still fits a target with little compute, or one with a strict schema." The case an interviewer most often expects is compliance: personal data has to be masked or dropped before it ever lands in the warehouse, which ELT's "keep the raw data" cannot do.
- Why it matters: "when would you still pick ETL?" is the natural follow-up to "why did ELT win".
- Cause: `video/src/videos/de-pipelines/script.ts:153`; `video/src/videos/de-pipelines/EtlScene.tsx:124-131`.
- Fix: "ETL still fits a target with little compute, one with a strict schema, or personal data that must be masked before it lands." Extend the note to "still fits: little compute, a strict schema, or masking personal data first".

### 6. [P3] explanation: the log's u, c, d codes are unexplained, and Debezium is never named
- When: 194.5-208.5 s, beat `cdc-log` (frames element-200.jpeg, element-217.jpeg)
- What: The write-ahead log entries read "u order 2: shipped", "c order 4: new", "d order 3: deleted". The narration says "insert, update and delete", so "c" for an insert is unexplained. The page's own example is a Debezium connector, the tool an interviewer expects to hear, but the video never names it. The poll's second weakness also goes unsaid: a row updated twice between polls arrives only in its last state. The log keeps both.
- Why it matters: three small follow-ups a CDC answer is usually pressed on.
- Cause: `video/src/videos/de-pipelines/CdcScene.tsx:102-106` (op letters), `CdcScene.tsx:44`; `video/src/videos/de-pipelines/script.ts:171`.
- Fix: Spell out the ops in the entries as "update", "insert" and "delete" (`note(20)` in BLUE_INK), or keep the letters and add a 20px INK_SOFT note under the log: "op codes as Debezium writes them: c create, u update, d delete". In `cdc-log`, change "often through Kafka" to "usually with Debezium, through Kafka".

### 7. [P3] answer: batch versus streaming skips micro-batch and "do both"
- When: 51.9-64.4 s, beat `choose` (frame element-064.jpeg)
- What: The choice is drawn as binary. The page ends with "Many systems do both (lambda/kappa)". The common follow-up is micro-batch: small batches every few seconds, which is how Spark Structured Streaming runs by default and the usual middle ground when seconds-level freshness is enough.
- Why it matters: an interviewer often asks "what about micro-batch?" right after this answer.
- Cause: `video/src/videos/de-pipelines/script.ts:112`.
- Fix: Insert after "Fraud detection is streaming.": "In between sits micro-batch, a small batch every few seconds, and many systems run both." Add a 24px INK note under the two choice cards, "between: micro-batch, seconds apart", cued to "micro-batch".

### 8. [P3] confusion: green used for neutral results and counts
- When: 34-64 s, beats `batch`, `stream` (frame element-064.jpeg); 22-25 s, beat `plan` (frame element-023.jpeg)
- What: Batch's "one result" box, streaming's result squares and "a result per event" are all green, the series' color for the right answer. Neither mode is the right one, and both are green. In the plan, "3 quick ones at the end" sets its 3 in green while "8 with a figure each" is blue.
- Why it matters: green is meant to mean "right", and here it means "output".
- Cause: `video/src/videos/de-pipelines/BatchScene.tsx:146` (`fill={OK}`), `BatchScene.tsx:156` (`tone="ok"`), `BatchScene.tsx:169` (OK_INK); `video/src/videos/de-pipelines/HookScene.tsx:162` (OK_INK).
- Fix: Draw both modes' results in `tone="plain"` (an output, not a verdict), with the squares in INK and the label in INK. Set the plan's 3 in BLUE_INK like the 8.

### 9. [P3] spacing: the overwrite listing holds blank lines for 25 s, and its heading stops being true
- When: 91.3-117 s, beats `idem-over`, `idem-why` (frames element-092.jpeg, element-100.jpeg, element-122.jpeg)
- What: At 92 s an empty tinted listing eight lines tall appears under "Overwrite the partition, as the page does". From 94 s to 117 s its first and last lines stay blank, reserved for BEGIN TRANSACTION and COMMIT, so the five statements float in a box with a gap above and below. Once those two lines arrive, the heading "as the page does" is no longer true: the page's block has no transaction. Separately, check.mjs ran the page's ON CONFLICT upsert twice and a MERGE (3, 3, 3 orders), but the upsert lines at the right show no count. The claim that they are idempotent goes unshown.
- Why it matters: a half-empty code box reads as a rendering fault, and a measured result is left off screen.
- Cause: `video/src/videos/de-pipelines/IdemScene.tsx:105,114` (B_LINES sized for 8 lines from the start), `IdemScene.tsx:162` (heading), `IdemScene.tsx:186-194` (upsert, no count); `IDEM.upsert` in `data.ts:56` is never used.
- Fix: Render a six-line listing (`[...del, ...blind]`) from `overAt` to `wrapAt`, then swap to the eight-line `B_LINES` at `wrapAt`, the same `at`/`out` hand-off EvoScene uses for its reads (`EvoScene.tsx:124-128`). Retitle it "Overwrite the partition: delete, then insert". Under the two upsert lines, add `note(22, OK_INK)` "run twice: {IDEM.upsert[0]} orders, then {IDEM.upsert[1]}", cued to "insert on conflict".

### 10. [P3] pacing: the quick round's key states flash by
- When: 427.0-428.2 s, beat `r-fan` (frames element-428.jpeg, element-429.jpeg); 444.4-445.8 s, beat `r-lineage` (frame element-445.jpeg)
- What: The red grid labelled "all of them stale" is the fan-out problem itself. It appears on "go stale" at 427.0 s and clears on "Recompute only" at 428.2 s, so it is on screen for about 1.2 s. The lineage back-trace for "why did this metric change?" lasts about 1.3 s before the red forward trace replaces it. In the finished fan-out frame, the green edges run through the half-transparent cells they pass, which makes the six affected cells harder to pick out.
- Why it matters: the problem state needs to register before the fix replaces it.
- Cause: `video/src/videos/de-pipelines/RapidScene.tsx:106-108` (`calm` on `onlyAt`), `RapidScene.tsx:224-226`; `RapidScene.tsx:135-158` (edges drawn under cells at 0.55 opacity); `video/src/videos/de-pipelines/script.ts:266`.
- Fix: Split `r-fan` after "go stale." into its own beat with `pauseAfter: 0.8`. In lineage, hold `backP` until `breaksAt + 6` instead of `breaksAt - 4`. End each green edge at the cell's left edge (`p.x`), not its centre, and draw unaffected cells at 0.75 opacity.

### 11. [P3] answer: "fan-out" has a second meaning in this same track
- When: 417.5-437.0 s, beat `r-fan` (frame element-436.jpeg)
- What: The video answers the page's meaning: one upstream change sets off many recomputations. The same track uses "fan-out" for a one-to-many join that repeats rows and inflates sums (`content/interview/data-engineer/data-modeling.mdx:248`, and the multiple-choice bank at line 157). That is also the meaning most interviewers intend.
- Why it matters: a viewer who knows only this meaning can answer the wrong question.
- Cause: `video/src/videos/de-pipelines/script.ts:266`.
- Fix: Append to `r-fan`: "Not to be confused with a join fan-out, where a one-to-many join repeats rows and inflates a sum."

### 12. [P3] explanation: renames are shown breaking readers, but nothing says how to rename safely
- When: 251.9-261.9 s, beat `evo-rename` (frame element-261.jpeg)
- What: "Renames and type changes are what break readers" is shown for the rename only, and no remedy follows. The answer an interviewer wants: rename through a table format that tracks columns by id (Iceberg, or Delta with column mapping), or add the new column and backfill it before dropping the old one. Type changes are asserted without an example.
- Why it matters: "so how do you rename a column?" is the obvious next question.
- Cause: `video/src/videos/de-pipelines/script.ts:194`; `video/src/videos/de-pipelines/EvoScene.tsx:210-219`.
- Fix: Append to `evo-rename`: "Table formats like Iceberg track columns by id, so a rename there is safe." Add a 24px INK line under the red notes at `tableBottom + h(170)`, cued to "Iceberg": "safe rename: a table format that tracks columns by id".

### 13. [P3] other: the bridge says every answer assumed one machine, after Kafka and elastic warehouses
- When: 451.8-462.1 s, beat `next` (frames element-454.jpeg, element-463.jpeg)
- What: "Each answer here assumed one machine could hold the data." The video itself described Kafka as "a distributed log" (CDC, Kappa), cloud warehouses with "cheap, elastic compute" (ELT), and lakehouses (medallion), none of which run on one machine. What was true is that every example ran on one machine, in DuckDB.
- Why it matters: a careful viewer hears the bridge contradict three earlier answers.
- Cause: `video/src/videos/de-pipelines/script.ts:276`; `video/src/videos/de-pipelines/RapidScene.tsx:338`.
- Fix: "Every example here ran on one machine. When a day of events outgrows it, the work has to split across many. Next: distributed processing." On screen: "Every example here ran on <b>one machine</b>." Re-cue `oneAt` to "one machine".
