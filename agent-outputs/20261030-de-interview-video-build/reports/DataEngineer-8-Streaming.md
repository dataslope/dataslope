# DataEngineer-8-Streaming (`de-streaming`): report

**Length and voice.** The video runs 9:27.8 (`npm run cues`: the last beat ends at 564.9 s, then the 2.6 s tail). It has 51 beats in 9 scenes. Drew voiced it on `eleven_v4_turbo` in 6 takes, 7,799 characters, with no re-voices. The plan figure is 6,500 ±20%, so this sits at the top of the band.

**Questions** (by the page's headings). One voiced phrasing differs from the page: "vs" is read and shown as "versus", as the DS videos do.
- **Deep dives, numbered aloud:**
  1. What are Kafka topics, partitions, and offsets?
  2. Why does the number of partitions matter in Kafka?
  3. What is a consumer group, and how does it scale consumption?
  4. What are consumer offsets and why commit them?
  5. What is the difference between at-least-once, at-most-once, and exactly-once? Merged with Pipelines' exactly-once vs at-least-once: a message deleted by retention before it is read is lost either way, and exactly-once means one effect, not one execution.
  6. How do you make a consumer idempotent?
  7. What is exactly-once processing in Kafka, and how is it achieved? Merged with Pipelines' boundary: an email, an API call or an outside database is outside the transaction.
  8. What is event time vs processing time? Merged with Pipelines' batched uploads.
  9. What is a watermark? Merged with Pipelines': progress, not proof.
  10. How do you handle late-arriving data? Merged with Pipelines' early, on-time and late results.
  11. What is windowing, and what are the main window types?
  12. What is backpressure, and how do streaming systems handle it?
- **Quick round, numbered on screen only:**
  - 13: log compaction.
  - 14: streaming join vs batch join.
  - 15: dead-letter queue, merged with Orchestration's dead-letter handling: bad rows or whole tasks, a few don't stop everything, nothing is silently dropped.
- **Not answered:** "Batch vs streaming" is answered in Part 6, as the plan says.

**Reuse.** None. No DA or DS page and no course video asks these questions, so every figure is new.
- Shared kit used unchanged: `QuestionCard`, `RapidFire`, `NextLine`, `Note`, `Num`; `Drift`, `Headline`, `Kicker`, `Strike` and `ElbowArrow` from `da-pandas`; `Axes` and `Bracket` from `da-statistics-communication`.
- Built locally in `parts.tsx`: `Cell`, `Lane`, `Box`, `Crash`, `Marker`, `Legend`, `Bar` and `Dash`.
- The salmon hero appears in the hook (360x449) and the close (340x424). The limit is 410x511 and `check:frames` measures a stretch of 0.88. No other spot illustrations.

**Facts.** `check.mjs` runs in Pyodide 314.0.7 (Python 3.14.2, NumPy 2.4.6), every random draw seeded. Nothing is shown as Kafka's output: the screen says "model" or "the video's own stream", and the narration says "model it".
- **The stream:** 12 clicks from four users (ava, ben, cam, dee), each with an event time and a processing time.
- **Partitions:** keys hashed with CRC-32 mod 3, standing in for the producer's hash. I picked the four names from a few candidates so that all three partitions get used; the hashing itself is real.
- **Adding a partition:** 7,432 of 10,000 keys (74%) move when going from 3 partitions to 4.
- **Windows:**
  - Tumbling counts are 5, 4, 3 by event time against 4, 5, 3 by processing time.
  - Sliding windows of 10 s every 5 s put every click in two windows.
  - A 5 s session gap splits ava's five clicks into 2 sessions.
- **Watermark and late data:**
  - Max seen minus 3 s closes the first window at 13.5 s with 4 clicks. dee's click (from second 8, arriving at 17.2 s) lands behind a watermark of 12.
  - Max seen minus 10 s counts it, but closes the window 7.8 s later.
  - An allowed lateness of 10 s updates the first window from 4 to 5.
- **Delivery:** a thousand messages, a commit every 50, three seeded crashes. At-most-once loses 54; at-least-once processes 96 twice. A blind insert leaves 1,096 rows, an idempotent consumer 1,000.
- **Backpressure:** Poisson arrivals at 100 a second into a consumer handling 80. Lag is 1,143 at 60 s, and a second consumer clears it in 18 s.
- **Log compaction:** 8 profile updates, 4 kept.

**Checks**, all run on the final, voiced code:
- Typecheck and lint: clean for the folder. `check:cues`: no `de-streaming` findings.
- `npm test`: 68 pass, 2 fail. Both failures are in other folders: `de-orchestration` ("A DAG") and `de-sql-patterns` ("A CTE", "MySQL").
- `check:motion`: run twice, the second time after the last layout fixes. Zero still stretches of 2 s or more.
- `check:sync`: every beat within ±0.03 s (worst +0.03 s on `idem`).
- `check:mix`: effects sit 30.5 LU under the narration (-50.4 against -19.9 LUFS), peak -33 dBFS, speech a median 29.1 dB above them (5th percentile 13.6 dB). The effect levels are the ones `ds-experiments-in-practice` uses, so the mix is quieter than the README's examples (17.5 to 18.9 LU).
- `check:frames`: 1 image, stretch 0.88. 22 arrowheads at 0.0° of bend. No tabular hyphens, and every cue says which occurrence it means.
- Stills of every scene, on the estimated timing and again from the voiced preview: looked at and fixed (overlaps, bottom margins, label clashes).

**The page.** In `streaming.mdx`, the watermark answer gives the formula as `max_seen_event_time - allowed_lateness`. Flink and Beam treat allowed lateness as a separate setting: how long a window's state stays open after the watermark has passed it. What the watermark subtracts is an out-of-orderness bound. `pipelines.mdx` gets this right ("maximum event time observed minus an allowed delay"). The video uses Pipelines' "allowed delay" for the watermark and keeps "allowed lateness" for the late-data answer. I left the page as it is.

**The kit and the queue.**
- A queued render waiting on `render-slot.sh` was killed by the background-job time limit while it waited. That killed my chained sync-then-mix run, so I reran mix and the second motion check detached.
- A shared message-cell and partition-lane primitive, like the ones in my `parts.tsx`, might suit the Pipelines and Orchestration videos.
- Nothing is left undone.
