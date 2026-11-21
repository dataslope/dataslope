# AnalyticsEngineer-4-Incremental (8:01, 481.4 s)

## Verdict
- A strong, evidence-led video. Every count I checked matches `results.json` and the narration: 10 rows after the watermark, `>` finds only 27, `>=` 26 of 27, the overlap 7 read and 27 of 27, append 31 then 38, merge and delete+insert 27 and 27, 28 rows for 27 events and Postgres's own `MERGE command cannot affect row a second time`, 12 then 24, one md5 fingerprint, 7 blind rows, 25 rows and 3 wrong, 26 after the refresh, and 6,040,000 / 755x / 5,960,000 / 39,840,000 of 45,584,000 = 87%. The answers mostly go past the pages, for example the tie and the late row taken apart one fix at a time, and the duplicate key that inserts silently and then fails the next run.
- One wrong statement a viewer would repeat: "What a merge can't do is delete." `MERGE` has a `DELETE` action, in Postgres 15+ (this video's own engine), Snowflake and BigQuery. The real point is that this merge never sees the delete. The video also stops before the follow-up an interviewer asks: how you catch deletes without a full refresh (the source sends them as flagged rows).
- Three figures contradict their own data or narration. In Q3 the watermark still reads 2024-01-24 while the table it points at holds 27 at Jan 25. The microbatch lookback band cuts event 26 in half, so you can't tell whether the late row is caught. In Q4, "No key: append" is shown while the config on screen still sets `unique_key`.
- Q2 and Q3 hold up. The coordinator's two fixes hold: the overlap band spans Jan 21 to the watermark and covers exactly the 7 rows read, and the model listing changes in step with the compiled SQL (`>=`, then `- INTERVAL '3 days'`, then back to `>` for Q3).
- Pacing is comfortable, mostly 2.3 to 2.9 w/s. The only tight spot is the blind-insert result in Q5, about 1.8 s before it clears. The rest is polish: listings that keep showing what microbatch or the first run sets aside, a deleted row drawn struck through inside a batch that never held it, an unlabeled red line in Q7's chart, and one crowded label.

## Findings

### 1. [P1] accuracy: "A merge can't delete" is false, and the follow-up on catching deletes is missing
- When: 381.7-389.1 s, beat `merge-delete` (element-389.jpeg)
- What: The narration says "What a merge can't do is delete." The red note on screen says "A merge can't delete". `MERGE` has `WHEN MATCHED ... THEN DELETE`. Postgres has supported it since 15, and this video runs on PostgreSQL 18.6, which also has `WHEN NOT MATCHED BY SOURCE`. Snowflake, BigQuery and SQL Server support it too. The second sentence states the real point: a deleted row never reaches the batch, so this merge never sees it. The video never says how deletes do get caught. Q7 offers only the full refresh.
- Why it matters: "MERGE can't delete" is a factual error that a viewer would repeat. "How do you handle hard deletes in an incremental model?" is the standard follow-up. The expected answer is that the source sends deletes as rows (a CDC tombstone or a deleted flag) that the merge can act on, with a full refresh as the fallback.
- Cause: `video/src/videos/ae-incremental/script.ts:411` (merge-delete text); `MergeScene.tsx:152-154` (the note).
- Fix: Split `merge-delete` at its sentence break. Reword the first sentence to "What this merge never sees is a delete." Recut the second sentence from the take ("A row removed from the source never reaches the batch, so the target keeps it."). Add a beat after it: "To catch one, the source has to send each delete as a row, flagged, for the merge to act on. Otherwise, it takes a full refresh." That beat also leads into Question 7. On screen: "This merge never sees a delete" in red, then a second line, "Unless deletes arrive as flagged rows; otherwise, a full refresh".

### 2. [P2] confusion: Q3's watermark contradicts the table it is the maximum of
- When: 198.4-210.6 s, beats `this`, start of `this-first` (element-206.jpeg)
- What: For Q3 the listing goes back to `>` and the watermark rule comes back. Its label still reads "watermark 2024-01-24", and it stands right of 24. But fct_events now holds the overlap run's 27 rows, with 27 at Jan 25 in the table's own lane, right of the rule. The narration says `{{ this }}` is "the one the filter takes its maximum from", and `MAX(event_at)` is highlighted. That maximum is 2024-01-25, not the date on the rule.
- Why it matters: The figure contradicts its own data at the exact moment it explains where the maximum comes from.
- Cause: `video/src/videos/ae-incremental/FilterScene.tsx:213-225` (the rule's last step is the overlap's `AFTER(WM_DAY)`), `:227` (ruleP returns on `thisAt`), `:239` (wmText).
- Fix: On `thisAt`, move the rule to after the latest event the table holds (27's day, from `LATE.arrived`), and switch the label to that event's date (2024-01-25).

### 3. [P2] confusion: The microbatch lookback band cuts the late event in half
- When: 193.2-198 s, beat `filter-micro` (element-196.jpeg)
- What: "lookback, 2 batches here" is drawn from Jan 23 to Jan 25. Event 26 (Jan 22, 12:00) sits on the band's left edge, half inside it. With a lookback of 2 before the Jan 25 batch, dbt re-runs Jan 23 and 24, and 26's Jan 22 batch is not among them. So the figure suggests the late row is caught when, at the lookback it labels, it isn't.
- Why it matters: The beat is about re-processing batches "for late rows", and the one late row on screen is ambiguous.
- Cause: `video/src/videos/ae-incremental/FilterScene.tsx:64` (`LOOKBACK = 2`, chosen by hand), `:389-405`.
- Fix: Set `LOOKBACK = WINDOW_DAYS` (3, the overlap's own width from the run's SQL). The band then covers Jan 22 to Jan 25 and holds 26 whole: "lookback, 3 batches here".

### 4. [P2] confusion: "No key: append" sits under a config that still sets `unique_key`
- When: 232.8-246.7 s, beat `key-append` (element-245.jpeg)
- What: The narration says "Without it, rows are appended". The label reads "No key: append". The config listing above both still shows `unique_key='event_id'`, at full strength and unmarked, until "Set the unique key".
- Why it matters: The picture shows the key set while the words and the result (31, then 38) describe a model without one.
- Cause: `video/src/videos/ae-incremental/KeyScene.tsx:218-226` (the config is static).
- Fix: Swap the config line to `config(materialized='incremental')` on "rows are appended". Swap it back on "Set the unique key", where the existing highlight lands on the restored `unique_key='event_id'`.

### 5. [P2] pacing: The blind-insert result clears about 1.8 s after it appears
- When: 304.6-306.4 s, beats `idem-blind` to `idem-rebuild` (element-305.jpeg)
- What: "24 rows for 12 customers" turns red on "twenty-four rows" (304.6 s). The whole figure fades at `rebuildAt - 6` (306.4 s), 0.7 s after the beat ends. It is the scene's failure case, and the result is gone before it can be read against the run above it.
- Why it matters: A result shown for about a second before it clears is one of this review series' recurring defects.
- Cause: `video/src/videos/ae-incremental/script.ts:369` (`pauseAfter: 0.7`); `IdemScene.tsx:68` (`blindOut`).
- Fix: Change idem-blind's `pauseAfter` from 0.7 to 1.6 (timing only). The result then holds about 2.7 s.

### 6. [P3] confusion: Microbatch "writes the filter for you" while both listings keep the hand-written filter
- When: 180.4-197.6 s, beat `filter-micro` (element-187.jpeg)
- What: The narration says microbatch "takes the filter out of your hands". The model on the left still shows the `is_incremental()` guard and the overlap `WHERE` at full strength, and so does the compiled SQL on the right. The page itself says microbatch leaves "no `is_incremental()` branch to get wrong".
- Why it matters: The listing shows the very thing the narration says goes away.
- Cause: `video/src/videos/ae-incremental/FilterScene.tsx:332-336` (dims only on `skippedAt`); `:341-354` (no dims).
- Fix: Dim the guard, the `WHERE`, the interval and `{% endif %}` in the model, and the `WHERE` and interval lines in the compiled SQL, from `microAt` until `thisAt`.

### 7. [P3] confusion: On the first run the compiled SQL keeps its `WHERE`
- When: 213.7-218.4 s, beat `this-first` (element-217.jpeg)
- What: The guard's lines grey out ("the guard is skipped"), but "What it runs, compiled" still prints `WHERE event_at > (SELECT MAX(event_at) FROM fct_events)`, against a table that is "Not there yet".
- Why it matters: The right-hand listing claims to be what runs, and on this run it isn't.
- Cause: `video/src/videos/ae-incremental/FilterScene.tsx:341-354`.
- Fix: Dim the compiled `WHERE` line at `skippedAt + 3`, as the model's own line is dimmed.

### 8. [P3] confusion: The deleted row is drawn struck through inside the batch it never reached
- When: 384.4-390.7 s, beat `merge-delete` (element-389.jpeg)
- What: Cy's row is added to `staged_customers` and a red line is drawn through it, labeled "Deleted at the source, so not in the batch". The batch never held Cy. Drawing the row inside it, then striking it, says the opposite of the label, and it puts a line through a row's text.
- Why it matters: The table that stands for "the batch" briefly shows a row the batch never had.
- Cause: `video/src/videos/ae-incremental/MergeScene.tsx:82-87` (the ghost row with `strikeAt`), `:170-175`.
- Fix: Drop the ghost row. Under `staged_customers`, in red: "Cy, deleted at the source: not in the batch". dim_customer's Cy row keeps its red band and "kept".

### 9. [P3] confusion: Q7's chart has an unlabeled red line whose end dot sits beside "Last refresh, 5,960,000"
- When: 439-481 s, beats `refresh-cost` to `next` (element-478.jpeg)
- What: The hook's chart comes back with the full-rebuild line redrawn in red, but without its "Full rebuild: 6,040,000" label. Its red end dot at day 730 sits just under "Last refresh, day 720 / 5,960,000 rows", which belongs to the yellow-lit spike to its left. The chart is about the incremental model's own refreshes, so the red line adds nothing here.
- Why it matters: A viewer can read 5,960,000 as the red line's value, or the red dot as the last refresh.
- Cause: `video/src/videos/ae-incremental/RefreshScene.tsx:313` (`fullAt` passed to `CostChart`).
- Fix: Leave `fullAt` off, so only the incremental line and its spikes are drawn.

### 10. [P3] spacing: The uniqueness test's label crowds "and no error"
- When: 279.2-282.4 s, beat `key-test` (element-281.jpeg)
- What: "A unique test on event_id finds it" ends at x about 1508, 15 px left of "and no error" (x 1523). The two lines overlap vertically by a few pixels and sit on a diagonal.
- Why it matters: Two unrelated labels read as one block.
- Cause: `video/src/videos/ae-incremental/KeyScene.tsx:181` and `:327` (x 1160).
- Fix: Move the test's label and table to x 980, clear of both the error box (which ends at 860) and the count.

### 11. [P3] explanation: Why a change sequence avoids late rows is left implicit
- When: 172.6-180.4 s, beat `filter-seq` (element-178.jpeg)
- What: The on-screen line reads "Or: a change sequence that only grows, so nothing lands behind the watermark". The mechanism is left out: the sequence is stamped when a row lands, not when the event happened, so a late event still gets a new, higher number.
- Why it matters: Without that, "a sequence" sounds like another timestamp with the same problem.
- Cause: `video/src/videos/ae-incremental/FilterScene.tsx:606-611`.
- Fix: On screen only: "Or: a change sequence stamped as each row lands, so nothing lands behind the watermark".

### 12. [P3] confusion: "Compiled" shows a different select list from the model beside it
- When: 92-218 s, beats `filter` to `this-first` (element-117.jpeg)
- What: The model says `SELECT *`, while "What it runs, compiled" says `SELECT event_id, event_at`. dbt compiles `SELECT *` to `SELECT *`.
- Why it matters: A dbt user notices that the "compiled" listing isn't the model compiled.
- Cause: `video/src/videos/ae-incremental/FilterScene.tsx:254-259` (the compiled listing's first line is the warehousing block's).
- Fix: Take the compiled listing's select line from the model's own (`SELECT *`). raw_events has exactly those two columns, so what runs is unchanged.

### 13. [P3] confusion: The wider window keeps the 3-day interval highlighted
- When: 162.9-180.4 s, beats `filter-width`, `filter-seq` (element-178.jpeg)
- What: The band widens to six days (from Jan 18) while both listings keep `- INTERVAL '3 days'` lit in yellow, as if the yellow band were that interval.
- Why it matters: The highlight points at a value the band no longer shows.
- Cause: `video/src/videos/ae-incremental/FilterScene.tsx:326` and `:352` (`out: microAt`).
- Fix: End both interval highlights at `wideAt`.

### 14. [P3] answer: `{{ this }}` stops before "why not `ref()`?"
- When: 198.4-207.6 s, beat `this` (element-206.jpeg)
- What: The answer is right: the model's own table, and the first run. It stops before the usual follow-up, which is why the model doesn't just `ref()` itself. A model can't depend on itself: dbt rejects the cycle.
- Why it matters: It is a one-line follow-up an interviewer asks, and the answer explains why the variable exists.
- Cause: `video/src/videos/ae-incremental/script.ts:321`.
- Fix: Add a beat after `this`: "It isn't a ref, because a model can't depend on itself." On screen, add a line under `{{ this }} is fct_events`: "not `ref('fct_events')`: a model can't depend on itself".

### 15. [P3] pacing: The window-width trade-off runs straight into the next idea
- When: 162.9-172.6 s, beats `filter-width` into `filter-seq`
- What: `filter-width` carries a new trade-off at 3.07 w/s, the fastest long beat in the video. A new technique follows after 0.6 s.
- Why it matters: Two distinct ideas arrive with almost no air between them.
- Cause: `video/src/videos/ae-incremental/script.ts:307` (`pauseAfter: 0.6`).
- Fix: Change filter-width's `pauseAfter` from 0.6 to 1.0 (timing only).
