# Data Engineer interview videos: review

**Reviewed:** the twelve Data Engineer interview prep videos,
`DataEngineer-0-Interview` to `DataEngineer-11-PipelinesForAi` (Drew), 1:40 in
all, as built and voiced in #722
([build record](20261030-de-interview-video-build/STATE.md)). Their builders
checked them with `check:frames`, `check:motion`, `check:sync` and `check:mix`,
but they had never had an independent frame review. This is that review, done
before the initialism re-dub
([plan](20261105-1200-narration-acronym-redub-plan.md)) so that no beat is
voiced twice.

**Result:** 197 findings: **7 P1**, 65 P2, 125 P3. Each video has its own
report in [`20261105-de-interview-video-review/`](20261105-de-interview-video-review/).
Every finding gives its time, beat, frame, cause (`file:line`) and a fix.

Severity is the same as in the earlier reviews:
- **P1:** a viewer is likely to misunderstand or learn something wrong, or the
  frame has an obvious defect.
- **P2:** noticeable, and it hurts the video.
- **P3:** polish.

| Video | Length | P1 | P2 | P3 |
| --- | --- | --- | --- | --- |
| 0 Interview (overview) | 2:13 | 0 | 2 | 8 |
| 1 SQL patterns | 9:50 | 2 | 3 | 11 |
| 2 SQL performance | 7:09 | 1 | 8 | 10 |
| 3 Dimensional modeling | 8:48 | 0 | 5 | 14 |
| 4 Modeling history | 8:35 | 0 | 5 | 9 |
| 5 Python | 10:31 | 0 | 6 | 15 |
| 6 Pipelines | 7:45 | 0 | 4 | 9 |
| 7 Distributed processing | 10:04 | 1 | 6 | 7 |
| 8 Streaming | 9:28 | 2 | 9 | 10 |
| 9 Warehousing | 7:25 | 0 | 6 | 9 |
| 10 Orchestration | 8:54 | 1 | 5 | 13 |
| 11 Pipelines for AI | 8:57 | 0 | 6 | 10 |
| **Total** | **1:39:39** | **7** | **65** | **125** |

## How it was reviewed

The Data Analyst review's method and tools, adapted only for the series
(`20261105-de-interview-video-review/tools/`, with `BRIEF.md` as each
reviewer's brief). One reviewer per video read the timeline, script, scene
code, `results.json` and the page in `content/interview/data-engineer/`.

- **Frames once a second.** 5,980 frames at 1080p, rendered in about four minutes.
- **Contact sheets that drop repeats.** They kept 2,575 of the frames, on 219
  sheets.
- **A cap on full frames.** Each reviewer opened about 15 to 30, for a scene's
  finished state or a tile that looked wrong.

The brief also put **how initialisms are pronounced** out of scope (the series
writes SQL as "sequel" on purpose, and the re-dub changes DAG and OLAP). The
other new item was an expansion of an initialism everyone knows.

## What went right

- **Numbers.** In all twelve videos, every number said or shown matches
  `results.json` and the page. Most reviewers re-derived them by hand. None of
  the P1s is a wrong measurement.
- **Layout.** Almost nothing overlaps or clips, and nothing anywhere is set
  under 19px. The defects are a handful of lines through labels (below).
- **Pacing.** Comfortable in every video: content beats run at 2.0 to 3.0
  words a second, no gap between beats is under 0.55 s, and finished scenes
  hold 1.6 s or more before a cut. The fast spots are local, such as SQL
  patterns' frame definition (3.62 w/s) and Streaming's watermark sweep.
- **Figures that carry the answer.** Streaming runs all twelve questions on
  one stream of twelve clicks, so each answer builds on the last. Distributed
  processing reuses its seven salary rows across three questions. Python's
  memory figures are measured, not illustrated. Several deep dives go a step
  past the page: ROWS over missing days, the hot key's memory risk, and the
  late-arriving member per customer.

## Series-wide problems

### 1. Answers stop one step before the follow-up

As in the Data Analyst and Data Scientist sets, this is the commonest finding,
in every video. The answer is right but stops just before the question an
interviewer asks next, and the page usually answers it. Examples:

- **Orchestration:** never says where load writes before the quality gate
  (write-audit-publish), or why parse-time work hurts (the scheduler re-parses
  every DAG file about every 30 s).
- **Streaming:** draws "skip ids already seen" as an in-memory set, with no
  durable store written in the same transaction.
- **Pipelines:** never says what makes an Avro change compatible.
- **Warehousing:** never says how Avro on Kafka finds its schema (a schema ID
  and a registry).
- **Distributed processing:** salts a count, which local combining already
  handles, and never shows how to salt a join.
- **Python:** says a hash lookup is "one comparison, at any size" with no
  average-case caveat, and raises the double-charged payment without the
  idempotency key that fixes it.
- **Pipelines for AI:** never names IVF, so "HNSW or IVF?" can't be answered.
  It gives the embedding bill as a formula with no order of magnitude.
- **SQL performance:** never names an engine that has a clustered index.

### 2. A video that contradicts itself

Six videos say one thing in one question and its opposite in another. Four of
the seven P1s are of this kind:

- **Distributed processing:** Q2 draws Spark's shuffle hand-off "in memory".
  Q7 says, correctly, that map output goes to local disk (P1).
- **Streaming:**
  - Q12's second consumer drains a single partition, against Q3's rule that
    parallelism stops at the partition count (P1).
  - Q3's "never read twice" is followed by Q4 reading offsets 3 and 4 again.
- **Orchestration:** Q10 says quality checks "can't" catch missing data. Q7
  lists row counts and freshness as quality checks, behind a 500-row gate (P1).
- **Dimensional modeling:** Q6 colors snowflaking as the answer, against Q2's
  green "The default: a star." Its bridge also says no answer dealt with a
  changing dimension, after Q8 did.
- **Pipelines:** labels Parquet "an added column is fine" in green, while its
  own demo shows the default read dropping that column.

### 3. Wrong on screen, briefly

The other three P1s:

- **SQL patterns' rapid round** defines `CUME_DIST` as "rows at or tied with
  it", which gives 0.5 where the table shows 0.75.
- **SQL patterns** also says "keep the numbers over one" shows every copy of
  a duplicate. That drops each original.
- **SQL performance's B-tree** leaves its leaf unconnected, and its pointers to
  customer 42's pages come out of key 43.

In the first two, the note that corrects the narration is on screen for
about a second.

### 4. Colors against the series' meanings

`interview.tsx` gives each color one meaning: red is the trap, green the right
answer, yellow what the narration points at, blue data. Breaks:

- **SQL performance:**
  - A correct Seq Scan on a 90% filter is drawn in red.
  - The non-covering read's "20 pages" lands in red on "never read".
- **Dimensional modeling:** the Q6 reversal above.
- **SQL patterns:** LAG's default of 0 is green inside a delta, so day one
  shows a fake +100 change.
- **Pipelines and Distributed processing:** use green or red for neutral
  results.
- **Streaming:** strikes through a true statement ("not from offset 0"), in
  red (P1).

### 5. Marks that should not be there

- **Shapes drawn at zero size before they animate.** These leave stray marks
  on an empty page:
  - Orchestration: three blue dots for 13 s, from zero-length round-capped
    lines.
  - Streaming: three blue bars, from tumbling-window boxes at zero width.
- **Lines through labels.**
  - Streaming's event-time figure: window dividers through the tick labels,
    and the "now" marker and watermark bars through counts.
  - Distributed processing: "skipped" runs over its row-group box.
  - Streaming Q4: the reassignment arrow runs through "resumes here".
- **A highlight before its code.** SQL patterns' islands listing shows a band
  over an empty line for a second before the code is typed.

### 6. Pages that wait

A figure that arrives well after its question is read:

- **Pipelines for AI:** four questions show only the question card and one
  line for 6 to 12 s.
- **The overview:** its AI scene opens on a near-empty page for 9.5 s.
- **Distributed processing:** Q5 opens on two lines of text for about 7 s.
- **Python:** leaves the lower half of the frame empty for 8 to 20 s in three
  questions.

### 7. Shared code and the site

Two causes sit outside any video's folder. Neither was fixed during this
review, because the fixers may not touch shared files:

- **The strike-tilt fix misses `<Code>`.** `textOf` in
  `da-pandas/parts.tsx:181-188` reads no text from a `<Code line>` element. A
  strike over code therefore keeps its full tilt and climbs into an overline:
  Python's hook here, and the same pattern at `ds-python-pandas/HookScene.tsx:147`.
- **The latency ladder's "network round trip"** is a disk-seek figure (10 ms,
  said as 100,000 times memory). A round trip inside a data center is about
  0.5 ms. The video takes it from the site's own chart,
  `charts/memory-latency-ladder.mjs:30`, which needs the same correction.

## The fixes

**Done.** One fixer per video worked to
[`tools/FIX-BRIEF.md`](20261105-de-interview-video-review/tools/FIX-BRIEF.md),
in order: P1s, then answers, then the other P2s, then P3s. Each fixer's report,
with every finding by number and what changed, is in
[`20261105-de-interview-video-review/fixes/`](20261105-de-interview-video-review/fixes/).

| Video | Findings | Characters re-voiced | Length before → after |
| --- | --- | --- | --- |
| 0 Interview | 10 fixed (one on screen only) | 542 | 2:13 → 2:32 |
| 1 SQL patterns | 16 fixed | 719 | 9:50 → 10:35 |
| 2 SQL performance | 19 fixed | 1,071 | 7:09 → 8:18 |
| 3 Dimensional modeling | 18 fixed, 1 in part | 709 | 8:48 → 9:29 |
| 4 Modeling history | 13 fixed, 1 in part | 912 | 8:35 → 9:37 |
| 5 Python | 20 fixed, 1 done centrally | 1,137 | 10:31 → 11:35 |
| 6 Pipelines | 13 fixed (one side point of #6 left) | 1,138 | 7:45 → 9:10 |
| 7 Distributed processing | 14 fixed | 1,172 | 10:04 → 10:54 |
| 8 Streaming | 21 fixed | 1,015 | 9:28 → 10:20 |
| 9 Warehousing | 14 fixed, 1 in part | 849 | 7:25 → 8:24 |
| 10 Orchestration | 19 fixed | 860 | 8:54 → 9:29 |
| 11 Pipelines for AI | 16 fixed | 1,090 | 8:57 → 9:51 |
| **Total** | **197** | **11,214** | **1:39:39 → 1:50:16** |

- **Within budget.** Every video stayed under its 1,200-character budget.
  The pass cost 2,468 ElevenLabs credits for 11,214 characters:
  `eleven_v4_turbo` bills about a fifth of a credit a character.
- **Checks.** Every video passed typecheck, lint, `npm test`, `check:cues`,
  `check:motion`, `check:sync`, `check:mix` and `check:frames` on its final
  code. The whole package passes `npm test` (75/75) with all twelve in.
- **Untouched audio.** Beats were split at sentence breaks before any
  rewording, and the unchanged pieces were cut from the kept takes for free.
  Every beat a fixer did not mean to change is byte-identical to the pre-fix
  commit (`4bff3bc`), and no take was re-recorded.
- **What the extra 11 minutes is.** Most of it is answers carried one step
  further, plus longer holds where the review found a figure up too briefly.

**Values.** Every number still comes from a video's `check.mjs`. Every
existing value came back identical except where a finding was about that
value:

- **Streaming:** the backpressure answer is now a two-partition run of the
  same seeded traffic. Its busier partition clears in 20 s, where the old
  one-queue model said 18.
- **Distributed processing:** the latency ladder's network row is a
  data-center round trip, 500,000 ns, about 5,000 times memory, not 100,000.
- **SQL patterns:** the refused `SUM` in `WHERE` now runs at the query's own
  400.

Several fixers added new measured steps for new claims. Examples: a sorted
rebuild that shows UUIDv7 pays only for its width, a date range that prunes
to 3 of 12 files, and BM25 computed for real on the tickets.

**Partly fixed, and why.** The voice budget ran out in four places, so
each keeps its old narration and is fixed on screen only:

- **Dimensional modeling #13:** the fiscal-quarter note.
- **Modeling history #13:** "small integer" is still spoken, though a valid
  version-4 UUID is now shown.
- **Warehousing #7:** "compact them for you" is still spoken; the lesson page
  says the same.
- **Pipelines #6:** the poll's "row updated twice" weakness.

**Done centrally, after the pass.** Shared code and the site:

- **Strikes over code:** `da-pandas/parts.tsx`'s `textOf` reads a
  `<Code line>`'s text. A strike over code now tilts by its real length:
  Python's hook, and the same at `ds-python-pandas/HookScene.tsx:147`.
- **Code in small labels:** `QMono` (`src/editorial/interview.tsx`) is
  `max(19px, 0.84em)`, so code inside a 21px label no longer drops to
  17.6px. Two fixers had worked around it locally.
- **The latency chart:** `charts/memory-latency-ladder.mjs`'s network round
  trip is 500,000 ns (inside a data center), not the 10 ms disk seek. Its
  title and spread follow (six orders of magnitude, not seven), as does the
  C# lesson that introduces it ("six orders", not "ten").
- **The pages the videos answer**, where a fixer found the page wrong:
  - **`distributed-processing.mdx`:** Hadoop's map output goes to local
    disk, and Spark also writes its shuffle output to disk. The real
    difference is no HDFS write between steps. Disk and network are three
    and four orders of magnitude from memory.
  - **`orchestration-and-reliability.mdx`:**
    - Question 1's gate now sits after load, into staging.
    - The XCom listing takes `ds` as an argument rather than templating it
      inside the function body.
    - The sensor names its bucket.
  - **`streaming.mdx`:** compaction has no age limit of its own, and a topic
    that should also expire old keys sets `cleanup.policy=compact,delete`.
  - **`pipelines.mdx`:** each Parquet file carries its own schema, and the
    reader reconciles them.
- **Not needed:** a fixer asked for `EXISTS` and `EXCEPT` in
  `da-sql/parts.tsx`'s highlighter, which already has both.
