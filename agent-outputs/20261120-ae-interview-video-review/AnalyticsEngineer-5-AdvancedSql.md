# AnalyticsEngineer-5-AdvancedSql (10:51, 650.6 s)

## Verdict
- A strong, evidence-led video. Every number I checked on screen matches `results.json` and the narration (425/640, 1065, 39.9, 24 updates to 12, RANK 13, 411, 100/350/425 against 100/425/425, -285, -45, -45 instead of -100, 10 then 15 days, 23 against 12, 1,000,000 against 962,761, 125.00 against 50.01, the ranking trio, 4 against 5 rows, 1 3 6 11 3). The answers hold up against `advanced-sql.mdx` and often go one step past it (the tie RANK keeps twice, the frame nobody wrote, LAG counting rows, COUNT(*) saying one on an empty day, the report's range for spine bounds).
- The one figure that contradicts its data is the tie in Question 4: the table numbers c3@x.com as row 1, but the run kept c4@x.com, on the very beat that says the pick is the engine's choice.
- Several drawn details work against the series' rules: red lines through correct per-day order values and through two column titles (Q4, Q12), a coalesced 0 marked green under a listing that has no COALESCE (Q13), and a yellow highlight that stops short of "BY" in the Q3 error.
- Pacing is comfortable (most beats 2.2 to 2.9 w/s, every gap at least 0.55 s). The tight spots are the two beats that define the default frame (3.2 w/s) and the org-chart table in Q17, which leaves after about 2.5 s.
- Smaller gaps in explanation: the top-N listing shows only the filter, not the ranking window inside each group; Q8's chart has no values for the -285 and -45 it labels; "when do you need a recursive CTE?" is answered with an example rather than the reason.

## Findings

### 1. [P1] accuracy: The tie table numbers the wrong row first
- When: 166-178 s, beats `latest-tie`, `latest-break` (element-170.jpeg, element-176.jpeg)
- What: customer 3's tied pair shows row_number 1 for c3@x.com and 2 for c4@x.com, under "ROW_NUMBER: 12 rows, but which of the pair is 1?". In the run (`tie.rowNumber` in `results.json`), ROW_NUMBER kept c4@x.com. The screen's numbering is just the order of the `three` listing (`ORDER BY updated_at DESC, email`), so it shows the alphabetically first email as the winner.
- Why it matters: the figure contradicts its own data, and on the one beat whose point is that the pick is arbitrary it shows a definite, plausible-looking rule ("the first row wins"), which is exactly the wrong lesson.
- Cause: `video/src/videos/ae-advanced-sql/data.ts:229-236` (`CUSTOMER3.tie` sets row_number to `i + 1`, the listing position); drawn at `LatestScene.tsx:300-315`.
- Fix: read the pair's row numbers from the `tie.rowNumber` run: the email it kept for customer 3 gets 1, the other 2. The column then reads 2, 1, 3, 4 with c4@x.com as 1, the row listed second, which shows the arbitrariness instead of hiding it. Keep the question note as it is.

### 2. [P2] spacing: The yellow highlight on the Q3 error stops short of "BY"
- When: 122-127 s, beat `mix-trap` (element-124.jpeg)
- What: on "no single amount left to add up", the error message gets a yellow band. The message wraps inside an inline-block, and the band ends before the last word of its first line, so "GROUP" is highlighted and "BY" sits outside it. Yellow over the red error box also mixes two meanings for no gain.
- Why it matters: a visible defect on the scene's last frame.
- Cause: `video/src/videos/ae-advanced-sql/WindowScene.tsx:371` (`markAt` on `ErrorBox`, which wraps the message in `Mark`, an inline-block, in `da-sql/parts.tsx`).
- Fix: drop `markAt`. The bare listing's red band on the window line already points at the cause.

### 3. [P2] confusion: Red lines through correct values and through column titles
- When: 497-504 s, beat `ratio-store` (element-502.jpeg); 153-157 s, beat `latest-max` (element-156.jpeg)
- What: in Q12 the "aov" column title and both per-day values, 200.00 and 50.00, are struck in red. Those values are each day's true order value; the point is only that a model should not store the ratio. In Q4 a red bar runs through the "email" title of the empty column added to the GROUP BY result.
- Why it matters: a struck value reads as "this was wrong", so a viewer may remember the per-day ratios as incorrect; and a line through a title is one of the series' rules ("no line through a label").
- Cause: `video/src/videos/ae-advanced-sql/RatioScene.tsx:106-109` (`StrikeBar` over the header and both cells); `LatestScene.tsx:289` (`StrikeBar` over the email title).
- Fix: in Q12, fade the aov column (title and values) back to about 35% on `keepsAt` instead of striking it, so the kept numerator and denominator stand out in green and the ratio visibly drops out of the model. In Q4, drop the strike; the empty column under its title and the red note beside it already say the email is gone.

### 4. [P2] confusion: The coalesced 0 is green, under a listing with no COALESCE
- When: 520-523 s, beat `r-zero` (element-521.jpeg)
- What: on "coalesce can turn that into zero", the null in the NULLIF result is swapped for 0 and marked green. The listing above it is still the NULLIF query, which returns null, and green is the series' "right answer".
- Why it matters: the table now shows a result its own listing does not produce, and the green suggests zero is the better answer, when the page's own wording is "if a numeric default is wanted" (an average order value of zero for a day with no orders is not true, and drags any average down).
- Cause: `video/src/videos/ae-advanced-sql/RapidScene.tsx:104-108` (the `swaps` entry and the green `MARK_GREEN` mark).
- Fix: drop the swap and the green mark: keep the null, marked yellow, and let the existing note, "COALESCE(…, 0) turns the null into zero", carry the option.

### 5. [P2] explanation: The top-N listing leaves out the ranking it is about
- When: 546-560 s, beat `r-topn` (element-559.jpeg)
- What: the only code on screen is `SELECT * FROM ranked WHERE rn <= 2`. The window that does the work, `ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC) AS rn`, is never shown, though the narration says "Rank inside each group".
- Why it matters: PARTITION BY the group is the whole answer to "per group"; an interviewer expects to see it, and the viewer gets only the filter half.
- Cause: `video/src/videos/ae-advanced-sql/RapidScene.tsx:193` (`filter` keeps only the `WHERE rn <= 2` line of DA Part 4's listing).
- Fix: show the ranking lines of the same listing above the filter (`ROW_NUMBER() OVER (PARTITION BY category` / `ORDER BY revenue DESC) AS rn`, then the WHERE line), mark `PARTITION BY category` on "inside each group" and `WHERE rn <= 2` on "keep N or fewer", and move the two result tables down by the added lines.

### 6. [P3] explanation: Q8's chart labels -285 and -45 with nothing to subtract
- When: 325-337 s, beat `lag-season` (element-332.jpeg, element-336.jpeg)
- What: the line has no y axis and no values. The arrows read -285 and -45, and the narration says "December's peak", but 385, 100 and 145 never appear.
- Why it matters: the two numbers the answer rests on cannot be checked against the picture.
- Cause: `video/src/videos/ae-advanced-sql/LagScene.tsx:150-170` (points only, month ticks, no values).
- Fix: on `fallsAt`, label December 2023's and January 2024's points with their revenue (385, 100), and on `twelveAt` January 2023's (145), all read from `LAG.yoy`, clearing with the arcs on `takeAt`.

### 7. [P3] confusion: Q8's breakdown partitions by a region the chart does not have
- When: 313-336 s, beats `lag-how`, `lag-season` (element-324.jpeg)
- What: the breakdown reads `OVER (PARTITION BY region ORDER BY month)`, "back within this region, by month", over a single line of months with no region; the query that ran is `LAG(revenue) OVER (ORDER BY month)`. "No self join" sits alone at the right in the data blue.
- Why it matters: a viewer looks for regions that are not there, and blue is the series' color for data.
- Cause: `video/src/videos/ae-advanced-sql/LagScene.tsx:126-130` (the page's breakdown), `:228-230` (`BLUE_INK`).
- Fix: break down the expression that ran (`LAG.mom`): `revenue -`, `LAG(revenue)` "the value one period back", `OVER (ORDER BY month)` "the order it reaches back in". Set "No self join" in ink.

### 8. [P3] confusion: Q8's "-45, should be -100" floats over the wrong arrow
- When: 347-352 s, beat `lag-gap` (element-350.jpeg)
- What: the label sits at the top of the bundle of eight crossing arcs; the arrowhead nearest it lands on December 2023, while the bold arc it belongs to lands on March 2024, far to the right and below.
- Why it matters: the one comparison the narration names is hard to tie to its number.
- Cause: `video/src/videos/ae-advanced-sql/LagScene.tsx:220-224` (label at the March arc's apex, above every arc).
- Fix: put the label to the right of the bold arc's head, beside March 2024 (x about `px(mar24) + 24`, y above April to June's points), where no arc runs.

### 9. [P3] confusion: Q3's two step notes sit far from the lines they name
- When: 106-119 s, beat `mix-run` (element-118.jpeg)
- What: "1. Group: one row per region" and "2. Window: summed over the groups" sit at the top right, level with SELECT, while GROUP BY is the sixth line and SUM(SUM(amount)) the third.
- Why it matters: the order of evaluation is the point, and the eye has to match each note to its line by color alone.
- Cause: `video/src/videos/ae-advanced-sql/WindowScene.tsx:354-359` (both notes at `y(TOP) + h(6)` and `+ h(52)`).
- Fix: place each note beside its own line, using `listingLineMid` for the GROUP BY line and the SUM(SUM(amount)) line.

### 10. [P3] confusion: "outside the spine" still in red once the report's range includes May 16
- When: 414-420 s, beat `series-bounds` (element-418.jpeg)
- What: the red note says May 16 is "outside the spine", and then the green bracket, the report's range, takes May 16 in.
- Why it matters: the two notes disagree about the same cell.
- Cause: `video/src/videos/ae-advanced-sql/SpineScene.tsx:350`.
- Fix: say which spine: "An empty last day: outside MIN to MAX".

### 11. [P3] accuracy: "These tables held a few dozen rows each"
- When: 637-641 s, beat `next` (element-648.jpeg)
- What: the closing line, spoken and on screen ("These tables: a few dozen rows each"). Many tables held far fewer: six sales, four payments, four books, two days of orders, three daily summaries.
- Why it matters: a small false statement in the last line.
- Cause: `video/src/videos/ae-advanced-sql/script.ts:619`; `RapidScene.tsx` (the closing note).
- Fix: split `next` at its first sentence and re-voice "These tables held a few dozen rows at most." (43 characters); on screen "These tables: a few dozen rows at most".

### 12. [P3] answer: "When do you need a recursive CTE?" is answered by example only
- When: 595-601 s, beat `r-recursive` (element-600.jpeg)
- What: "Here it counts to five; on an org chart, it walks twenty-four people down five levels." The reason you need recursion, that the depth is not known in advance (a fixed depth is a chain of self joins), is not said.
- Why it matters: "why not just self-join?" is the follow-up.
- Cause: `video/src/videos/ae-advanced-sql/script.ts:604`.
- Fix: split `r-recursive` before "Here it counts to five" and re-voice the tail: "Here it counts to five. You need one when the depth isn't known in advance: on an org chart, it walks twenty-four people down five levels." On screen, add "depth not known in advance" under the org-chart note.

### 13. [P3] pacing: The default frame is defined at 3.2 w/s, and the org chart leaves fast
- When: 86.4-95.4 s `over-default` (3.22 w/s); 288.8-297.4 s `frame-default` (3.25 w/s); 598.5-601 s, the org-chart table in `r-recursive` (element-599.jpeg, element-601.jpeg)
- What: the two beats that say what an unwritten frame does are among the fastest in the video and are followed by 0.8 s and 0.7 s. The org-chart depth table (1, 3, 6, 11, 3) is on screen about 2.5 s before Question 18 clears it.
- Why it matters: the default frame is the subtle point of Questions 2 and 7, and the table is unreadable in its time.
- Cause: `video/src/videos/ae-advanced-sql/script.ts:338, 455, 605` (`pauseAfter` 0.8, 0.7, 0.7).
- Fix: timing only: `pauseAfter` 1.2 on `over-default` and `frame-default`, 1.4 on `r-recursive`.

### 14. [P3] spacing: "The tie, kept" runs past the page's right margin
- When: 559-561 s, beat `r-topn` (element-559.jpeg)
- What: the note beside the RANK table ends at about x = 1876, past the 1824 margin every other element keeps.
- Why it matters: it crowds the frame edge.
- Cause: `video/src/videos/ae-advanced-sql/RapidScene.tsx:251` (`kg.right + 30`).
- Fix: set the note under the RANK table, at `kg.x`, a line below its last row.
