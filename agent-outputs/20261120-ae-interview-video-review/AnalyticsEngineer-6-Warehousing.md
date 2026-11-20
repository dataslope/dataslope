# AnalyticsEngineer-6-Warehousing (9:34, 574.0 s)

## Verdict
- A solid, evidence-led video. Every number on screen matches `results.json` or de-warehousing's `results.json` (5.50 MB against 380 kB for the region column; 9.4, 0.77 and 4.6 MB read; 876 and 16.8 GB, about 50 times; 2 of 9 blocks and 1.13 MB against 5.74 MB; 366 files of about 27 kB with 206 kB of footers; 380 kB per copied column, 9.36 and 9.74 MB files; 199,786 rows in all 9 row groups). The answers follow `data-warehousing.mdx`, and in several places go further with a measurement: bytes rather than column counts in Q5, and the rename cost in Q10.
- The one answer a viewer could carry wrongly into an interview is on screen, not in the narration. Q8 ends with the twelve month files labelled in green, "the grain this volume wants", at 780 kB a file. That is still more than a hundred times under the usual 128 MB to 1 GB target, which the Data Engineer video drew for this very table. Q9's auto-suspend model ("about two" minutes billed) also stops before the obvious follow-up: a warehouse waits before it suspends, and is billed for that wait.
- Visual defects are local. A fan of OLTP request arrows points from nothing to nothing for about 5 s. The day-file grid is drawn about seven times the area of the one file it equals. The column store's dictionary and row codes sit side by side, so they read as a mapping. In Q5, the three measured reads replace each other, so the two-column comparison that proves "bytes, not column count" is never on screen at once.
- Pacing is comfortable. Most beats run at 2.2 to 2.9 words a second, no gap between distinct ideas is under 0.55 s, and every scene holds its finished figure for at least 1.3 s. The quick round's answers are all read aloud and stay up long enough.

## Findings

### 1. [P1] accuracy: The month files are marked green, as the right grain for a table they still over-partition
- When: 381.8-388.9 s, beat `hurt-rule` from "match the grain to the volume" to the cut (element-387.jpeg)
- What: under the one file, "By month · 12 files of about 780 kB" inks in with its count in green (OK_INK), next to the green-ticked rule "the grain the volume needs". In this series green means the right answer. But 780 kB a file is far below the usual target of about 128 MB to 1 GB a file (de-warehousing's `small.target`, drawn in that video with the line "A million rows is small: the target is for tables far larger than this one"). The narration only says "a million rows a year is too few to split by day". The screen then supplies "so split by month", and marks it correct.
- Why it matters: "I'd partition it by month instead" is the over-partitioning answer the question is testing for. At 9.4 MB a year, the right answer is not to partition at all, or to cluster. A viewer learns the wrong grain from the color.
- Cause: `video/src/videos/ae-warehousing/HurtScene.tsx:149-152` (comment "the grain this volume wants"; `OK_INK` on the count).
- Fix: set the month label in ink and soft ink, not green. Under the month files add one line from `SMALL.target` (de-warehousing's results, through `data.ts`): "Still far under the usual 128 MB to 1 GB a file: a table this small is better left whole". Optionally add "or even by month" to the end of `hurt-rule`.

### 2. [P2] answer: Q9's "suspended when idle, about two" leaves out the wait before a warehouse suspends
- When: 422.4-425.0 s, beat `compute-model` ("Suspended when idle, about two.") (element-429.jpeg)
- What: the model bills the suspended cluster only for its two busy minutes, and the "Suspended when idle" row lights exactly the two busy ticks, "about 2 min", in green. A suspended warehouse does not stop on the second its work ends. It runs, billed, until its auto-suspend timeout passes (Snowflake's default is ten minutes), and Snowflake bills at least a minute each time a warehouse resumes. `script.ts:209-213` notes that no suspend delay is modelled, but nothing on screen or in the narration says so.
- Why it matters: "what do you set auto-suspend to, and why not zero?" is the follow-up to this exact answer. Two short bursts an hour can bill closer to twenty minutes than two.
- Cause: `video/src/videos/ae-warehousing/script.ts:465` (compute-model text); `ComputeScene.tsx:96-106` (the row's ticks and "about 2 min").
- Fix: split `compute-model` after "you pay for sixty minutes." and after "about two." (free recuts). Re-voice the middle sentence as "Suspended when idle, about two, plus the wait before each suspend: set that timeout short." On screen, change the result to "2 min, plus each suspend's wait", and paint the tick after each busy minute a lighter green as the wait.

### 3. [P2] confusion: The 366 day files are drawn about seven times the area of the one file they equal
- When: 353.5-388.9 s, beats `hurt-small` to `hurt-rule` (element-370.jpeg, element-387.jpeg)
- What: the day grid is 366 squares of 17 by 17 px on a 22 px pitch, about 670 by 330 px in all. The one file is 150 by 150 px. The two hold nearly the same bytes (9.8 MB against 9.4 MB). Each day square also draws its footer as 5 of 17 px (29%), where a day file's footer is about 2% of it, so the dark stripes look like a quarter of the data.
- Why it matters: the picture says splitting by day multiplies the data several times over. The real cost is many small files and their metadata, which is what the numbers beside it say.
- Cause: `video/src/videos/ae-warehousing/HurtScene.tsx:16-19, 90-110` (`CELL`, `PITCH`, `ONE_W`; footer width 5 against the one file's 7).
- Fix: label the day grid's total under it, "9.8 MB in all" (`SMALL.day.bytes`), beside the one file's "9.4 MB". Thin the day files' footer stripes to 2 px, so the drawing does not claim a share the numbers contradict.

### 4. [P2] confusion: The OLTP request arrows point from nothing to nothing for about 5 s
- When: 121.0-125.8 s, beat `oltp-def` from "many small reads and writes" to "an app's Postgres" (element-124.jpeg)
- What: six arrows fan out at x≈300-360 on an otherwise empty left half. The App box they come from, and the row-store table they point at, only ink in on "an app's Postgres" at 125.4 s.
- Why it matters: for 5 s the only drawing on the page is arrows with no source and no target, while the narration defines OLTP.
- Cause: `video/src/videos/ae-warehousing/OltpScene.tsx:106` (Box at `pgAt - 2`), `:109` (cells at `pgAt`), `:130` (arrows at `smallAt + 4`).
- Fix: ink the App box and the row grid in on `smallAt` ("many small reads and writes"), with the arrows after them. Keep "Postgres" as the box's subtitle, inked on `pgAt`.

### 5. [P2] confusion: The dictionary and the row codes sit side by side and read as one mapping
- When: 170.8-191.4 s, beats `cols-compress` and `cols-rows` (element-190.jpeg)
- What: "Dictionary" lists `0 East`, `1 West`, `2 North`, `3 South`. "Rows" stands 200 px to its right, on the same four lines, as 0, 0, 0, 1. Read across, East goes with 0, West with 0, North with 0 and South with 1. The codes are really the first four sales (East, East, East, West). Nothing says the Rows column is a different list of a different length.
- Why it matters: the dictionary is the mechanism behind the 380 kB, and the layout teaches a wrong mapping of it.
- Cause: `video/src/videos/ae-warehousing/ColsScene.tsx:219-238` (two columns at `DICT_X` and `DICT_X + 200`, both `h(30)` rows from the same top).
- Fix: set the row codes as one horizontal run under the dictionary, "Each row stores a code: 0 0 0 1 …", with the chips in a line. Or label each code with its sale ("sale 1"), so the two lists no longer share rows.

### 6. [P2] confusion: Q5's measured reads replace each other, so "bytes, not column count" is never shown as a comparison
- When: 217.8-246.7 s, beats `star-run` and `star-wide` (element-222.jpeg, element-235.jpeg)
- What: one listing and one "Read:" line hold one query at a time. "9.4 MB, the whole file" leaves at 221.5 s, and "0.77 MB, two thin columns" leaves at 232.6 s, as revenue by region arrives. So the scene ends on "4.6 MB, two columns again" alone. The two two-column queries (0.77 against 4.6 MB) are the proof of "bytes, not column count", and they are never on screen together. The read is also shown as "0.77 MB" beside bars labelled "380 kB", while the narration says "under eight hundred kilobytes".
- Why it matters: the scene's best point exists only in the narration. Its finished frame shows one number, and that number has nothing to compare against.
- Cause: `video/src/videos/ae-warehousing/StarScene.tsx:209-229` (the three listings and Read lines share `qTop` and `readTop`, each `out` at the next query).
- Fix: keep the listing swapping, but stack the reads as a small tally under it, each added as it is said and none removed. "Select *: 9.4 MB" (red), "units by region: 769 kB" (green), "revenue by region: 4.6 MB" (yellow), then "Bytes, not a count of columns". Show the units read in kB, to match the bars and the narration.

### 7. [P3] answer: Q5 stops before the `LIMIT` follow-up
- When: 197.0-245.1 s, beats `star-model` to `star-dbt`
- What: the answer covers the columns named. It does not cover the follow-up interviewers attach to this question: does `SELECT * ... LIMIT 10` cost less? On per-byte billing it does not. BigQuery bills the columns it scans, not the rows it returns, and its docs say a `LIMIT` does not reduce the bytes read.
- Why it matters: it is the standard trap after "why does select star cost more", and it follows directly from the scene's own point.
- Cause: `video/src/videos/ae-warehousing/script.ts:360-376`.
- Fix: one new beat after `star-wide`: "And a limit doesn't help: per-byte billing charges for the columns scanned, not the rows returned." On screen, under the tally: "`LIMIT 10`: the same scan".

### 8. [P3] spacing: The dbt comparison strikes a line through code, and the two models differ in more than the column list
- When: 238.7-246.7 s, beat `star-dbt` (element-245.jpeg)
- What: `SELECT * FROM {{ source('shop', 'sales') }}` is struck through in red, which leaves the code it warns about hard to read. The model on the right drops the `{{ config(materialized='table') }}` line, so the two listings differ by more than the select list.
- Why it matters: lines through text recur in this review series. And the comparison should change exactly one thing.
- Cause: `video/src/videos/ae-warehousing/StarScene.tsx:238-239` (`strikes`, and `dbtGood` without the config line, `:96`).
- Fix: replace the strike with a red `MARK_BAD` band on `SELECT *`. Give `dbtGood` the same config line, and widen it if needed.

### 9. [P3] color: BigQuery's slots in use are filled in data blue, and a slot is never defined
- When: 91-110 s, beat `arch-bq` (element-108.jpeg); again in Q9's question (388.9 s)
- What: the slots lent to each query fill with `BAR` blue, and "each query" is set in blue ink. In this series blue means data, and slots are compute. Q9 then asks "what is a … slot" and answers only for the three in general ("the compute that runs the queries").
- Why it matters: color against its meaning, and a term from the question card left undefined.
- Cause: `video/src/videos/ae-warehousing/ArchScene.tsx:143-144, 156`.
- Fix: fill the slots in use with the yellow highlight and outline them in yellow ink, with "each query" in ink. Change the caption to "A pool of slots, units of compute, lent to each query".

### 10. [P3] confusion: Q1's figure arrives late, and the scaled cluster has no label
- When: 36.4-44.5 s and 48.2-54 s, beat `split-new` (element-045.jpeg, element-072.jpeg)
- What: for 8 s after "Storage is separate from compute" the page holds two lines of text. Then on "scale query power" the Loading box grows 12%, which looks like a box drawn at the wrong size: its top and its larger text no longer line up with the other two boxes, and nothing says it was resized.
- Why it matters: "scale compute without moving data" is half of the answer, and its picture reads as a layout slip.
- Cause: `video/src/videos/ae-warehousing/SplitScene.tsx:124` (cylinder at `storeAt - 2`), `:91` (boxes from `startAt`), `:140` (`scale`).
- Fix: ink the cylinder in on `sepAt + 10` and the first compute box on `vendorsAt`. Under the Loading box, add a small "resized: M → L" on `scaleAt`.

### 11. [P3] confusion: 'Home' is renamed to 'Home & Garden' next to an existing 'Garden' category
- When: 474.1-491.9 s, beats `obt-cost` and `obt-where` (element-490.jpeg)
- What: `dim_category` shows "3 Home & Garden" directly above "4 Garden". A viewer can read the rename as a merge of two categories, which would change the counts the scene uses.
- Why it matters: it adds a question the scene never answers.
- Cause: `video/src/videos/ae-warehousing/check.mjs:207-216` and `ObtScene.tsx:21` (`NEW_NAME`).
- Fix: rename to 'Home & Kitchen' in `check.mjs` and `NEW_NAME`, and rerun `check.mjs`. The row counts cannot change.

### 12. [P3] explanation: "RPUs" is on screen and never defined
- When: 410-439 s, beat `compute-def` onward (element-438.jpeg)
- What: Redshift's column reads "Provisioned nodes (or serverless RPUs)". The narration says only "Redshift bills its provisioned nodes", and RPU appears nowhere else.
- Why it matters: an undefined initialism on a card a viewer reads for about 30 s.
- Cause: `video/src/videos/ae-warehousing/ComputeScene.tsx:149`.
- Fix: "Provisioned nodes, or Serverless capacity (RPUs)", or drop the parenthesis.

### 13. [P3] pacing: Q7's "5 times the bytes" is at full strength for about 2 s
- When: 328.3-330.6 s, beat `cluster-def` (element-329.jpeg)
- What: the scene's result arrives on "five times the bytes" at 328.3 s and dims to 45% at 330.6 s, as `cluster-diff` starts.
- Why it matters: it is the measured payoff of the question, and it is dimmed before it has been read.
- Cause: `video/src/videos/ae-warehousing/script.ts:415` (`pauseAfter: 0.7`); `ClusterScene.tsx:78` (`dim = coarseAt - 2`).
- Fix: raise `cluster-def`'s `pauseAfter` to 1.3 (timing only).
