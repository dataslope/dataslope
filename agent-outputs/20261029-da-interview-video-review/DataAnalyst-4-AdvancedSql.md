# DataAnalyst-4-AdvancedSql (6:36, 395.7 s)

## Verdict
- A clean, well-built video. Every number on screen matches `results.json` and the page: 425/640, the 8, 8, 8, 11 and 9 ranks, 100/350/425/605, 4,255, 141.67, the weeks, the pivot sums and the org levels. Tables and listings are tidy and consistently placed, and each deep dive builds on one small dataset the viewer can hold in their head.
- The biggest problem is in the frame answers (questions 6, 7 and 9). The ROWS demo orders by a non-unique `day`, so its 350 and 425 depend on which same-day payment the engine takes first. The page's whole advice is "unique ordering plus an explicit ROWS frame", and the video models the opposite. Question 7's card also asks "and why does it matter?", which is never read or answered.
- Visual defects: three spots set at 17px (the spine listing, its chart axis, the recursive CTE listing). The frame is defined over a lone table with no frame drawn. Two highlight cues never render, because `DataTable` honours only the first mark on a cell ("Both get four twenty-five", and South's rank 1 turning green).
- Pacing is comfortable: 2.0 to 3.0 words/s in the deep dives, and finished states held 2.5 s or more. `r-percent` (3.33 words/s, two definitions, no formula) is the one rushed beat. Three scene changes leave an empty page for about 1 s, then only a kicker for 1.4 s more.
- As interview answers they are correct but stop one step short in the usual places: tiebreakers for `ROW_NUMBER` (top N and latest row), ROWS counting rows rather than days, `FIRST_VALUE` and `NTH_VALUE` (the page's question names them), and the `PERCENT_RANK` formula.

## Findings

### 1. [P1] answer: the ROWS demo orders by a column that ties, so its running total is arbitrary
- When: 172-189 s, beats `frame-rows`, `frame-range`; carried into `default` (189-206 s) and `running` (229-243 s) (frames element-188.jpeg, element-201.jpeg)
- What: The ROWS listing is `SUM(amount) OVER (ORDER BY day ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`, but payments 2 and 3 share 2024-01-02. Which one gets 350 depends on the engine's internal order. It could just as well be 100, 175, 425. The outer `ORDER BY day, total` then sorts the result into the climbing order the narration reads, which hides this. The RANGE listing beside it orders by `day, id`. Question 7 then says the default frame makes `SUM OVER (ORDER BY day)` "a running total, not the total". It never adds the page's conclusion: "For predictable row-by-row behavior, specify a unique ordering and an explicit ROWS frame". Question 9 recommends the default frame with no caveat.
- Why it matters: "What happens when two rows tie on the order by?" is the first follow-up to ROWS against RANGE. A viewer who copies this query gives an answer that is not deterministic.
- Cause: `video/src/videos/da-advanced-sql/check.mjs:197` (window `ORDER BY day` only, outer `ORDER BY day, total`); narration `script.ts:165-178`.
- Fix: in `check.mjs:197`, use `OVER (ORDER BY day, id ROWS BETWEEN …)` and outer `ORDER BY day, id`, then re-run. Re-voice `frame-rows` as "Rows counts physical rows, so with id breaking the tie, the running total climbs one payment at a time: …". End `default` with "So when the order can tie, write rows and a unique order yourself." In `running`, say "an ordered sum, with the default frame, as long as each day appears once".

### 2. [P2] other: question 7's card is not what is read
- When: 189.1-206.1 s, beat `default` (element-201.jpeg)
- What: The card reads "What is the default frame, and why does it matter?". Drew reads only "What is the default frame?", and nothing answers "why it matters" beyond running total against total.
- Why it matters: the card is supposed to be read word for word, and the unread half is the half an interviewer asks.
- Cause: `FrameScene.tsx:118` against `script.ts:176`.
- Fix: re-voice `default` to read the full question and add the line from finding 1. Without re-voicing, cut ", and why does it matter" from `FrameScene.tsx:118`.

### 3. [P2] spacing: three pieces of text set at 17px
- When: 293-302 s, `spine-fix` (spine listing, element-301.jpeg); 289-302 s, `spine` and `spine-fix` (axis labels "Mar 1" to "Mar 5", element-291.jpeg); 338-353 s, `r-recursive` (11-line CTE listing, element-352.jpeg)
- What: The spine listing is visibly smaller than the 21px listing beside it. The chart's day labels are 17px. The recursive CTE is 11 lines at 17px, read in a 14 s beat.
- Why it matters: this breaks the house rule of nothing under 19px, and it hits code the viewer is meant to read.
- Cause: `LatestScene.tsx:31` (`SPINE_SIZE = 17`, used at :171), `LatestScene.tsx:150` (`label(17, …)`), `RapidScene.tsx:147` (`size={17}`).
- Fix: set the spine listing to 19 and move `SPINE_RESULT_X` from 1490 to about 1530, since the 570px listing needs about 630 at 19px. Set the axis labels to `label(19, …)`. Set the recursive listing to 19 and move the levels table from `R_X + 660` to `R_X + 700`.

### 4. [P2] confusion: the frame is defined with no frame on screen
- When: 163.4-177.6 s, beats `frame-def` and the start of `frame-rows` (element-170.jpeg)
- What: "The frame is the slice of rows the function can see, counted from the current one" plays over a four-row table and a note, "the frame: the rows the function sees for this one". There is no bracket and no current-row dot, so "this one" points at nothing. The bracket first appears on "a hundred" at 177.7 s. For 14 s about 75% of the frame is empty while the scene's central term is defined.
- Why it matters: the definition is the answer to question 6, and the bracket that would show it is already built.
- Cause: `FrameScene.tsx:142-143`. The first `RowBracket` step is at `hundredAt - 2`.
- Fix: add a first step `{ at: sliceAt + 4, from: 0, to: 1 }` (current row 2 and the row before it), then let the existing ROWS steps take over at `hundredAt - 2`.

### 5. [P2] confusion: two highlight cues never render
- When: 186.8-189 s, `frame-range` "Both get four twenty-five" (element-188.jpeg); 82.9-88 s, `partition-rank` "both come first" (element-085.jpeg)
- What: On "Both get four twenty-five", nothing in the result is marked. On "North's two fifty and South's three twenty both come first", North's 1 turns green but South's 1 stays yellow.
- Why it matters: the narration points at a result the screen does not mark. In the first case that result is the whole ROWS against RANGE contrast.
- Cause: `DataTable` renders `marks.find(...)`, only the first mark per cell (`video/src/videos/da-sql/parts.tsx:778`). In `FrameScene.tsx:201-204` the earlier `threeFiftyAt`/`fourTwentyFiveAt` marks on rows 1 and 2 shadow the `bothAt` marks. In `WindowScene.tsx:218-219` the yellow `southFirst` mark, which has no `out`, shadows the green one.
- Fix: in `FrameScene.tsx:204`, put the `bothAt` marks before the others, or give them distinct timing and make `CellText` pick the latest active mark. In `WindowScene.tsx:218`, add `out: firstAt + 6` to the yellow mark.

### 6. [P2] answer: "then keep WHERE rn = 1" sits under a query that cannot take it
- When: 274.3-282 s, beat `latest` (element-281.jpeg)
- What: The only listing is `SELECT *, ROW_NUMBER() OVER (…) AS rn FROM events ORDER BY …`, with the note "then keep WHERE rn = 1" under it. Appended to that query, `WHERE rn = 1` is exactly the error question 15 shows at 333 s. The CTE that does the filter (`LATEST.kept`, in `results.json`) is never shown. This is the one deep dive that ends without its working query.
- Why it matters: the video teaches the mistake it later warns against, on the most common take-home pattern.
- Cause: `LatestScene.tsx:125-129`; `data.ts:110` (`kept`) is unused.
- Fix: at `keepAt`, swap the listing for `LATEST.kept.lines` (the `WITH ranked AS (…) SELECT * FROM ranked WHERE rn = 1` form). Or change the note to "then keep `rn = 1` in an outer query, or `QUALIFY rn = 1`".

### 7. [P2] answer: `ROW_NUMBER` answers never mention a tiebreaker
- When: 117.0-133.5 s, beat `topn` (element-133.jpeg); 266.5-280.9 s, beat `latest`
- What: "Emma and Ulysses tie at three ten, and only one of them makes it" shows Emma kept and Ulysses struck in red, so the viewer may infer a rule. Which one survives is arbitrary. Question 11 has the same exposure with two updates at the same timestamp, and does not mention the usual alternative (`GROUP BY` plus `MAX(updated_at)` loses the other columns).
- Why it matters: "which one do you keep, and is it stable?" is the standard follow-up to both questions.
- Cause: `script.ts:136-139`, `script.ts:202-205`.
- Fix: end `topn` with "…and which one is arbitrary, unless you add a tiebreaker such as product to the order by." Add to `latest`: "Ties on the timestamp need a tiebreaker too, and group by with max would lose the plan column."

### 8. [P2] answer: ROWS counts rows, not days, and the video never says so
- When: 180.9-188.3 s, `frame-range`; 243.6-260.7 s, `moving`
- What: The page's ROWS against RANGE answer includes that RANGE with an offset is a value interval, not that many rows. The video never says it. The moving average is "the two rows before and the current one" over a table with no gaps. Two scenes later, question 12 shows a table with missing days.
- Why it matters: "your three-day average, what if a day is missing?" is what an interviewer presses on, and the video already holds the material to answer it.
- Cause: `script.ts:170-173`, `script.ts:194-197`.
- Fix: add to `moving`: "Rows counts rows, not days: if a day can be missing, use range with an interval, or fill the dates first, which is question twelve."

### 9. [P2] answer: question 8 drops `FIRST_VALUE` and `NTH_VALUE`
- When: 206.9-223.5 s, beat `last` (element-224.jpeg)
- What: The page's question is "What do FIRST_VALUE, LAST_VALUE, and NTH_VALUE return, and what's the LAST_VALUE gotcha?". The card and the narration cover only the gotcha.
- Why it matters: "does `FIRST_VALUE` have the same problem?" is the natural next question, and the answer (no, the default frame starts at the first row) confirms that the viewer has understood the frame.
- Cause: `FrameScene.tsx:120-122`, `script.ts:180-183`.
- Fix: add one sentence to `last`: "First value is safe with the default frame, which starts at the first row; nth value returns null until the frame reaches row n."

### 10. [P2] pacing: `r-percent` packs two definitions into the fastest beat, with no formula
- When: 375.0-384.7 s, beat `r-percent`, 3.33 words/s (element-394.jpeg)
- What: Two functions are defined in 9.7 s. The 0.25 and 0.75 steps on screen are never derived. The page gives `PERCENT_RANK = (rank - 1)/(n - 1)`.
- Why it matters: without the formula, "zero to one" does not explain the values, and the formula is what an interviewer asks for.
- Cause: `script.ts:254-257`; `RapidScene.tsx:227-255`.
- Fix: split the beat in two with `pauseAfter: 0.5`. The first: "Percent rank is rank minus one, over rows minus one: zero for the first row, one for the last." Show `(rank − 1) / (n − 1)` as a 22px note beside `pct_rank`. The second keeps the cume dist sentence.

### 11. [P3] confusion: colors used against the series' meanings
- When: 111-117 s, `rank-three` (element-112.jpeg); 311-315 s, `r-lag` (element-313.jpeg); 324-326 s, `r-ntile` (element-325.jpeg); 383-395 s, `r-percent` (element-394.jpeg)
- What: Several marks use red or green for things that are neither wrong nor right answers:
  - RANK's correct 11 is marked red, and "skips" is set in red.
  - The LAG `change` column is marked green, including its `null`, which is printed in red on the green mark.
  - NTILE(5)'s extra-row buckets are marked green.
  - CUME_DIST's 0.2 is marked green.
- Why it matters: red should mean the trap or the error, and green the right answer. Here RANK's skip is its correct behavior, and the green marks only point at something.
- Cause: `RankScene.tsx:144` (`MARK_BAD`), `RankScene.tsx:156` (`ACCENT_INK`), `RapidScene.tsx:62`, `RapidScene.tsx:104`, `RapidScene.tsx:247` (`MARK_OK`).
- Fix: use `MARK` (yellow) for each of these, and set "skips" at weight 650 in `INK`.

### 12. [P3] confusion: the centered frame is drawn beside trailing averages
- When: 257.3-266 s, `moving` (element-260.jpeg)
- What: On "A centered average…", the bracket moves to Jan 4 to Jan 6 with its dot on Jan 5. The value beside that dot is 191.67, the trailing average; the centered one would be 213.33. The note says "centred" where the narration and the page say "centered". The `moving_avg_3` column also mixes 100, 175, 185 and 210 with 141.67, so the decimals do not line up.
- Why it matters: a viewer reading the bracket and its row takes the wrong number for the centered average.
- Cause: `RunningScene.tsx:72` (centered step), `RunningScene.tsx:127` ("centred"); `ROUND(…, 2)` returns a DOUBLE, printed as given (`data.ts:24`).
- Fix: when the centered step lands, open a `centered_3` column from `RUNNING.centered` (`data.ts:103`), or drop that bracket step and keep the clause note only. Spell it "centered". Cast `moving_avg_3` to `DECIMAL(8,2)` in `check.mjs`.

### 13. [P3] confusion: rapid-round tables summarize queries that are not shown
- When: 320-326 s, `r-ntile` (element-325.jpeg); 349-353 s, `r-recursive` (element-352.jpeg)
- What: The NTILE listing returns one row per customer with `spend_quartile`, but the tables under it count customers per bucket. The NTILE(5) table has no listing at all. The recursive listing ends `SELECT * FROM org ORDER BY depth, id` (24 people), but the table beside it is people per depth.
- Why it matters: at speed, the viewer matches the table to the listing, and they do not match.
- Cause: `RapidScene.tsx:79-105` (`quartileSizes`, `fifthSizes`), `RapidScene.tsx:138-157` (`levels`).
- Fix: title each table with what it counts, as the NTILE(4) table half does: "rows per bucket" and "people per level". For the CTE, change the last listing line to `SELECT depth, COUNT(*) AS people FROM org GROUP BY depth`.

### 14. [P3] spacing: the gap chart is squeezed in, and its labels share a line with the note
- When: 289-302 s, `spine` and `spine-fix` (element-291.jpeg, element-301.jpeg)
- What: The line chart is 340px wide (x 520 to 860) next to the table. The red "no row for the 2nd or the 5th" (baseline about 792) and the axis labels "Mar 1 … Mar 5" (about 782) sit on one line 50px apart, so they read as one row of text. During `spine` (281.6-292.9 s) the right 1,000px of the frame is empty.
- Why it matters: the point of the chart ("draws straight over them") is made at thumbnail size.
- Cause: `LatestScene.tsx:30` (`CHART`), `LatestScene.tsx:137-139`.
- Fix: lift the chart to `base: 640, top: 470`, so its labels sit about 120px above the note.

### 15. [P3] other: three scene changes pass through an empty page
- When: about 87.6-90.1 s (`rank-in` to `rank`), 156.0-158.3 s (`frame-in` to `frame`, element-157.jpeg is blank white), 228.1-230.5 s (`running-in` to `running`)
- What: Each bridge clears its page on its last word. The next scene shows only a red kicker until the card text arrives about 1.4 s later. That gives about 1 s of blank page, then a near-empty one.
- Why it matters: this is the "clears to an empty page" pattern the DS review flagged. It reads as a dropped frame.
- Cause: `WindowScene.tsx:107`, `RankScene.tsx:109`, `FrameScene.tsx:113` (`opacity: 1 - ease(frame, clearAt, 36)` with `clearAt` at the bridge's last word).
- Fix: start the clear at the next scene's cut (`n.beat(next).from - 8 - 36`), so the outgoing figure fades as the kicker arrives.

### 16. [P3] other: the frame keywords render as plain identifiers
- When: 151 s (element-151.jpeg), 172-224 s (element-188.jpeg, element-224.jpeg), 243-266 s (element-260.jpeg), 338-353 s (element-352.jpeg)
- What: `QUALIFY`, `ROWS`, `RANGE`, `BETWEEN`, `UNBOUNDED`, `PRECEDING`, `FOLLOWING`, `CURRENT`, `ROW` and `RECURSIVE` render in plain ink. In "RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW", only `AND` is purple.
- Why it matters: these are the subject of questions 5 to 10 and 16, and the one keyword that stands out is the least important.
- Cause: `video/src/videos/da-sql/parts.tsx:243-248` (`KEYWORDS`).
- Fix: add those ten words, plus `DAY`, to `KEYWORDS`.

### 17. [P3] answer: rapid-round answers miss their one-line follow-ups
- When: 306-375 s (`r-lag`, `r-where`, `r-bucket`, `spine-fix`), and 139-151 s (`qualify`)
- What: Each answer stops before an easy extra line:
  - LAG: no mention that LAG reads the previous row, not the previous day, or of its default argument (the page mentions the default). The "nothing before day 1" null is never voiced.
  - WHERE: HAVING, which the page's question includes, is not answered.
  - DATE_TRUNC: weeks start on Monday in DuckDB, and the last bucket is a partial 3-day week (630 against about 1,200).
  - Date spine: `generate_series` is DuckDB and Postgres only; other engines use a calendar table, as the page says.
  - QUALIFY: Postgres and SQL Server lack it.
- Why it matters: each is one clause that turns a correct answer into a strong one.
- Cause: `script.ts:226-257`, `script.ts:145-148`, and the `spine-fix` beat.
- Fix: add a clause to each. For example, `r-lag`: "…and the first row gets null, unless you pass a default." `r-where`: "No, nor in having." `r-bucket`: "…four weeks, the last only three days long."

### 18. [P3] confusion: rank marks vanish on the tie bands
- When: 106.7-117 s, `rank-three` (element-112.jpeg)
- What: The yellow marks on RANK's "8, 8, 8" are drawn on rows already banded yellow, so they barely show. The 88s and the 85s share one band color, so the two tie groups read as one block of seven.
- Why it matters: the narration counts through those exact cells.
- Cause: `RankScene.tsx:133-146` (`MARK` bands and `MARK` cell marks).
- Fix: band the ties with `MARK_KEY` (pale blue) and keep the yellow cell marks, or end the bands at `rnAt`.
