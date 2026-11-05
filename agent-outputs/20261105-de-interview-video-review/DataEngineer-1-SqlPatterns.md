# DataEngineer-1-SqlPatterns (9:50, 590.3 s)

## Verdict
- A strong video overall. Every number on screen matches `results.json` and the page: rank 13 then 17, dense rank 10 then 11, 10 of 24 events kept, the moving averages 152.1 / 166.3 / 95.0, islands of 3, 2 and 4 days, NOT IN returning nothing, 6/7/7/8 join rows. The deep dives often go a step past the page: ROWS over missing days, a duplicate login breaking the islands key, the NOT IN null trap, and EXCEPT.
- The biggest problems are two wrong statements in the rapid round. CUME_DIST is defined as "rows at or tied with this one", which gives 0.5 for the 20s where the table shows 0.75. "To see every copy, keep the numbers over one" drops the first copy of each duplicate. In both cases the note that corrects the narration is on screen for about a second.
- Also: the LAG answer marks a default of 0 green inside a delta, which turns day one into a fake +100 change. In the islands scene a highlight band floats over an empty listing line for about a second before its code is typed.
- Pacing is comfortable almost everywhere (2.2 to 2.9 w/s, with 1.6 s bridges between scenes). The exception is Q6: the frame definition runs at 3.62 w/s next to a frame that is two-thirds empty, and the rest of that scene runs at about 3.0 w/s.
- As interview answers the deep dives hold up. The follow-ups an interviewer would press on are mostly missing: ROWS is only deterministic with a tiebreaker (the listing quietly adds `id`), the first six days of a moving average are an incomplete window, when to choose DENSE_RANK, and DuckDB's PIVOT finding unknown values by itself.

## Findings

### 1. [P1] accuracy: CUME_DIST is defined as "rows at or tied with it", which gives 0.5 where the table shows 0.75
- When: 547-556 s, beat `r-percent` (frames element-547.jpeg, element-554.jpeg, element-555.jpeg)
- What: The narration says "Cume dist is the share of rows at or tied with this one", and the note reads `cume_dist = rows at or tied with it / rows`. For the two 20s that is 2 of 4 = 0.5, but the table beside it shows 0.75. The correct reading, "the 20s: rank 2 of 4, and 3 of 4 rows at or below", first appears at about 554.3 s. The body fades by about 555.3 s, so it is visible for about one second (frame 554 does not have it, frame 555 does, frame 556 has moved on to COALESCE).
- Why it matters: the definition is what a viewer will repeat in an interview, and as worded it is wrong. The page says rows that sort before **or** tie with the current row.
- Cause: `video/src/videos/de-sql-patterns/script.ts:386` (the beat text); `RapidScene.tsx:525` (the note); `RapidScene.tsx:528` (the corrective note at `quartersAt + 8`, with only `pauseAfter: 0.8` at `script.ts:387`).
- Fix: Narration: "Cume dist is the share of rows at or before this one, ties included." Note: `cume_dist = rows at or before it (ties included) / rows`. Cue the "the 20s" note at `valuesAt + 4` and raise r-percent's `pauseAfter` to 1.6 so the derivation stays up for about 3 s.

### 2. [P1] accuracy: "To see every copy, keep the numbers over one" leaves out each original
- When: 448-454 s, beat `r-dupes` (frames element-448.jpeg, element-452.jpeg)
- What: The narration says "To see every copy, number them, and keep the numbers over one." The figure marks only the rows numbered 2 (ids 3 and 5), and its note correctly says "`rn > 1`: every extra copy, whole rows". `rn > 1` never returns ids 1 and 2, the first ada and bo rows. The note appears at `keepAt + 6` (about 452.5 s) and is fading by about 453.4 s, so the narration's wrong version is the one that sticks.
- Why it matters: a viewer asked to list all duplicate rows would give a query that misses half of them, and here the narration contradicts its own figure.
- Cause: `script.ts:351` (beat text; the page's "full duplicate rows" means whole rows, not every copy); `RapidScene.tsx:108-112` (the note at `keepAt + 6`); r-dupes has no `pauseAfter`.
- Fix: Narration: "To get the extra copies as whole rows, the ones you'd delete, number them and keep the numbers over one." Add `pauseAfter: 1.0` to r-dupes so the note can be read.

### 3. [P2] answer: LAG's default of 0 is marked green inside a delta, so day one shows a +100 "change"
- When: 485-493 s, beat `r-lag` (frame element-492.jpeg)
- What: "Revenue minus lag is the change since yesterday ... null, unless you pass a default, like this zero." On "like this zero" the `prev` cell's 0 gets the green right-answer mark. Beside it the `delta` for 2024-01-01 reads 100, a change measured from a day that has no data.
- Why it matters: a viewer will copy `revenue - LAG(revenue, 1, 0)`, and the obvious interviewer follow-up is why the first day jumped by 100. A default belongs where 0 is a true value, and a difference is not such a place. (The page's own query has the same flaw.)
- Cause: `RapidScene.tsx:243` (`MARK_OK` on row 0 of `prev`); `RapidScene.tsx:228` (listing); `script.ts:363`.
- Fix: Either compute `delta` with plain `LAG(revenue)` so the first delta is null (re-run check.mjs), or add to the narration: "...like this zero. Leave it null in a delta, or day one reads as a jump of a hundred." Mark the first `delta` cell MARK_BAD, and take the green off the 0.

### 4. [P2] pacing: Q6's definition is read at 3.62 w/s while two-thirds of the frame is empty
- When: 187-197 s, beats `frame-def` (189.4-193.2, 3.62 w/s) and `frame-peers` (3.14 w/s) (frame element-196.jpeg)
- What: "The frame is the set of rows the function sees for the current one" is the fastest beat in the video, and it is half the answer to Q6. All the screen shows is four payments, a bracket, and the definition in soft grey (`INK_SOFT`) under the table. The function the bracket belongs to only arrives with the listing at `frame-rows` (about 197 s), so the right two-thirds of the frame is empty for about 10 s. `frame-range` (3.01) and `frame-pick` (3.05) then keep the scene above 3 w/s.
- Why it matters: the key definition is rushed, it has no function on screen to attach to, and the room to show one is going unused.
- Cause: `script.ts:207-211` (frame-def); `FrameScene.tsx:81` (the definition note in `INK_SOFT`); `FrameScene.tsx:103` (listing `at={rowsAt0 - 4}`).
- Fix: Split frame-def into "The frame is the set of rows the function sees." and "For a running total, that's every row up to the current one.", with `pauseAfter: 0.8` after each. Bring the ROWS listing in at `setAt`, unhighlighted. Set the definition note in `INK` at 25px.

### 5. [P2] spacing: a highlight band floats over an empty listing line in the islands scene
- When: 308.6-310 s, beat `islands-key` (frame element-309.jpeg)
- What: Only three lines of the page's query have been typed, but a yellow band already sits on the empty tenth line (y about 663) for about a second before `login_date - ROW_NUMBER() OVER (` is typed under it.
- Why it matters: it is an obvious glitch at the moment the scene's key line is introduced.
- Cause: `IslandsScene.tsx:159-161`. The listing starts at `numberAt - 4`, so line index 9 inks at about `numberAt + 36`. `lineOf(Q.lines, "ROW_NUMBER() OVER (")` finds that same line 9, and its mark is at `numberAt + 4`.
- Fix: Delete the first mark, since the second (`login_date - ROW_NUMBER`, at `subtractAt + 2`) already covers that line. Alternatively, move the first mark to `numberAt + 52`.

### 6. [P3] accuracy: DuckDB's PIVOT sits directly above "values not known ahead: dynamic SQL"
- When: 512-518 s, beat `r-pivot` (frame element-517.jpeg)
- What: The clause on screen, `PIVOT traffic ON device USING SUM(sessions)`, has no `IN` list, so DuckDB looks up the distinct values itself. That is exactly the unknown-values case. Placing "values not known ahead: dynamic SQL" right under it, after "DuckDB also has a pivot clause", suggests the clause needs dynamic SQL too.
- Why it matters: a careful viewer, or an interviewer at a DuckDB or Snowflake shop, would correct it.
- Cause: `RapidScene.tsx:353-361`; `script.ts:373`.
- Fix: Narration: "If the values aren't known in advance, the case version takes dynamic sequel; DuckDB's pivot looks them up itself." Note: "values not known ahead: dynamic SQL (DuckDB's `PIVOT` finds them)".

### 7. [P3] answer: "Rows is the predictable one" holds only because the listing quietly adds a tiebreaker
- When: 197-220 s, beats `frame-rows` and `frame-pick` (frames element-203.jpeg, element-223.jpeg)
- What: The ROWS listing orders by `day, id` and the RANGE listing by `day` alone. The `id` is never mentioned. With `ORDER BY day`, ROWS would put the two peers in arbitrary order, and payment 2 could total 175 instead of 350.
- Why it matters: "ROWS with ties is non-deterministic" is the standard follow-up, and Q2 already makes this point for ROW_NUMBER.
- Cause: `script.ts:225` (frame-pick text); `FrameScene.tsx:138` (the note "physical rows, predictable"); the `, id` in the ROWS listing is never marked.
- Fix: frame-pick: "Rows is predictable once the order by breaks ties, like this ID." Mark `, id` in the ROWS listing on that cue, and change the note to "physical rows, predictable with a tiebreaker".

### 8. [P3] confusion: "Put a sum in WHERE instead" uses 600, while the pipeline beside it still shows the old query
- When: 162.7-183 s, beats `where-try` and `where-early` (frame element-182.jpeg)
- What: The refused query is `WHERE SUM(amount) > 600` (da-sql's WhereScene). The written query just walked through used `HAVING SUM(amount) > 400`, and the right-hand column still shows that query's "11 rows over 100" and "2 over 400" to the end of the scene. "Instead" implies that very condition was moved into WHERE.
- Why it matters: a viewer checking the numbers finds two thresholds and a pipeline that no longer matches the listing on screen.
- Cause: `OrderScene.tsx:283` (listing of `WHERE.aggregate`); `data.ts:127` (`daSql` `whereAggregate`, `> 600`).
- Fix: Run the refusal in this video's check.mjs as `WHERE SUM(amount) > 400` (the error text is the same) and use that. Alternatively, drop "instead" from the narration.

### 9. [P3] confusion: DENSE_RANK's ties are painted in the "right answer" green
- When: 54-58 s, beat `rank-three` (frame element-056.jpeg)
- What: The ROW_NUMBER and RANK marks are yellow, but DENSE_RANK's 10s and 11 are `MARK_OK` green. Q1 has no single right function, and the very next question says ROW_NUMBER is the one to use.
- Why it matters: it uses green against the series' meaning, and it hints at the wrong function a beat before Q2.
- Cause: `RankScene.tsx:162` (`color: MARK_OK` on the `dr` marks).
- Fix: Drop `color: MARK_OK` so the marks take the default yellow, like the other two.

### 10. [P3] confusion: Q2's tie figure stays up under Q3's question
- When: 87.6-92 s, beat `qualify` (frame element-089.jpeg)
- What: "What is QUALIFY, and which engines support it?" sits over user 3's tie table and the "RANK keeps both / ROW_NUMBER keeps one" notes for about 5 s. This is deliberate (`tieOut` is held so the last note can be read), but the result is a stale figure under a new question.
- Why it matters: content from the previous question is left under the current one.
- Cause: `RankScene.tsx:116` (`tieOut = filtersAt - 6`).
- Fix: Raise latest-tie's `pauseAfter` from 0.8 to 1.8 (`script.ts:151`) and set `tieOut = q3At - 4`.

### 11. [P3] explanation: the EXCEPT note gives a true fact as the reason, but it is not the reason
- When: 386-398 s, beat `anti-except` (frame element-396.jpeg)
- What: "A set difference: NULL matches NULL, so the guest order can't block it." The actual reason is that EXCEPT removes a left row only when an equal row exists on the right. The guest order's NULL can only cancel a NULL on the left, and no customer's id is null. "NULL matches NULL" reads as the cause, and it does not explain why Di survives.
- Why it matters: it is a likely interviewer probe ("why doesn't the null break EXCEPT?"), and the screen's version would not convince anyone.
- Cause: `AntiScene.tsx:197-200`.
- Fix: Note: "A set difference: a row is removed only if an equal row is on the right. The guest order's `NULL` equals no customer's id."

### 12. [P3] pacing: reveals on the last word are cut short (recursive cap, CTE result)
- When: 434-437.3 s, beat `recursive-stop` (frame element-436.jpeg); 465-467 s, beat `r-cte` (frames element-465.jpeg, element-466.jpeg)
- What: `WHERE t.depth < 10` and "on a three-node loop, it stops at depth 10" arrive at about 435 s, and the scene cuts at 437.0 s: about 2 s for 13 words that are not read aloud. In r-cte, "both return", the three result rows and "the page's orders, totals over 700" land on "the same three users" (about 465.5 s) and fade by about 466.8 s.
- Why it matters: neither can be read while the narration moves on, and the 700 threshold (the page uses 1000) goes by unexplained.
- Cause: `RecursiveScene.tsx:179-190` (notes at `loopAt` and `capAt + 6`; `pauseAfter: 2.2` at `script.ts:339`); `RapidScene.tsx:138-145` with no `pauseAfter` on r-cte (`script.ts:354`).
- Fix: Raise recursive-stop's `pauseAfter` to 3.5, or bring the `WHERE t.depth < 10` line in at `loopAt`. Give r-cte `pauseAfter: 1.0` and say "...the same three users, totals over seven hundred."

### 13. [P3] answer: the moving average stops before the incomplete-window follow-up
- When: 224.9-264.9 s, beats `moving` to `moving-zero` (frame element-264.jpeg)
- What: Nothing says that for the first six days `ROWS 6 PRECEDING` averages fewer than seven values but still labels the result a 7-day average. The standard follow-up asks for null there.
- Why it matters: this is the commonest finding in the series: the answer stops one step before the question an interviewer asks next.
- Cause: `script.ts:248-250` (moving-zero is the last beat on Q7).
- Fix: Add one beat: "And the first six days have short windows: return null until the window holds seven." Add a note: `CASE WHEN COUNT(*) OVER w = 7 THEN AVG(daily_value) OVER w END`.

### 14. [P3] explanation: the query behind 95.0 is never shown
- When: 282.6-298 s, beat `spine-avg` (frame element-296.jpeg)
- What: The table gains a row "spine, then ROWS ... 95.0", but the listing stops once the gaps are filled. The step that runs the ROWS window over the filled spine is never on screen.
- Why it matters: the conclusion is asserted rather than shown, and the step a viewer needs to write is the missing one.
- Cause: `MovingScene.tsx:242` (`SPINE.filled` lines only); `MovingScene.tsx:108` (the table row).
- Fix: Add a note under the listing on "seven rows are seven days again": "then `AVG(daily_value) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` over these rows".

### 15. [P3] answer: Q1 shows the differences but not when to reach for each
- When: 44-58 s, beat `rank-three` (frame element-056.jpeg)
- What: The ties behavior is shown well, but not the uses: DENSE_RANK for "the Nth highest distinct value" (the classic second-highest-salary follow-up), RANK for top-N with ties kept, ROW_NUMBER for exactly one per key (which Q2 covers).
- Why it matters: "so which would you use for the second-highest salary?" is the usual next question.
- Cause: `script.ts:139` (rank-three).
- Fix: Add one sentence and note: "So dense rank answers 'second-highest score', rank keeps ties in a top N, and row number gives exactly one."

### 16. [P3] other: the hook's "the SQL round of a data engineering interview" floats on its own
- When: 17-22 s, beat `hook-ask` (frame element-019.jpeg)
- What: A grey fragment is set 560px to the right of the three questions, on the second question's line. It has no subject and reads like a stray caption.
- Why it matters: the opening's layout looks unfinished.
- Cause: `HookScene.tsx:130-131`.
- Fix: Drop it, or set it as a full lead-in line above the three questions: "Questions like these fill the SQL round of a data engineering interview."
