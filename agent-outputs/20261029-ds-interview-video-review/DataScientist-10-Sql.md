# DataScientist-10-Sql (6:21)

## Verdict
- The numbers hold up. Every figure said or shown (100% vs 50%, users 1, 4 and 6, 0 vs 0.12, 8/6/4/3 and 100/75/50/38, gaps 95 and 205, 24 hits and 12 sessions, mean 407.1, 165 vs 150, p90 836, all nine rapid results) matches `results.json` and the page. The six worked answers are right and answer what was asked. Two pieces of wording would not survive a follow-up: "an ordered sum with no frame" for the running total, and thirty minutes stated as the definition of a session rather than a common threshold.
- The biggest problems are mechanical. Four SQL highlights land on the wrong line (`ORDER BY`, `FROM gaps`, `FROM txns`, `FROM ranked`), so in four places the yellow or green band marks boilerplate instead of the clause the narrator names. The integer-division fix ("point one two") is drawn in a near-transparent green and is barely visible. The churn query sits on top of the left join's six-row output. Code is set at 14 to 18px while space around it goes unused.
- Two explanations mislead: the staircase outline traces where each cohort's data ends, but the narration ties it to the falling shares. `NULLIF` is shown fixing the engine that does not need it (DuckDB), while the Postgres error is never shown fixed.
- Pacing is comfortable, mostly 2.1 to 2.7 words/s. Only the hook (3.04) and `r-topn` (3.08) are dense. One note ("120 / 1000 truncates to 0") flashes for about a second and never reaches full opacity.

## Findings

### 1. [P1] confusion: Four code highlights mark the wrong line
- When: 109-146 s, beats `rate-nullif` and `rate-int` (element-129.jpeg); 214-235 s, beat `session-sum` (element-232.jpeg); 330-337 s, beat `r-running` (element-337.jpeg); 343-346 s, beat `r-latest` (element-345.jpeg).
- What: At "Wrap the denominator in null if", the DuckDB listing highlights `ORDER BY variant;` in green, not the `NULLIF` line. At "a running sum of the flags is the session number", `FROM gaps` is highlighted, not the `SUM(is_new_session) OVER (...)` line. At "A running total is an ordered sum", `FROM txns` is highlighted, not the `SUM(amount) OVER (ORDER BY day)` line. At "keep row one", `FROM ranked` is highlighted, not `WHERE rn = 1`.
- Why it matters: the band is the video's pointer to the clause doing the work, and these are the four clauses each answer depends on.
- Cause: the hard-coded line indices are off by one, or written for a different layout of the query. `video/src/videos/ds-sql/RateScene.tsx:86` uses `line: 4`, but `RATE.safe` is the 5-line `firstSix` query (`data.ts:80`), where `NULLIF` is line 1. `SessionScene.tsx:179` uses `line: 11` where it should use 10. `RapidScene.tsx:191` uses `line: 2` where it should use 1. `RapidScene.tsx:223` uses `line: 6` where it should use 7.
- Fix: use lines 1, 10, 1 and 7. Better, find each index by content (`lines.findIndex((l) => l.includes("NULLIF"))`, `"SUM(is_new"`, `"SUM(amount)"`, `"rn = 1"`), so the index cannot drift when a query is reformatted.

### 2. [P1] confusion: The integer-division fix never becomes readable
- When: 130.7-146 s, beat `rate-int` (element-137.jpeg, element-141.jpeg).
- What: After "Multiply by one point oh first, and it's point one two", the Postgres result's `0` cells change to `0.1200`. The new values are drawn in a pale wash of green and stay that pale through the cut (element-141). The red note "120 / 1000 truncates to 0" appears on "is zero" and leaves on "Multiply". It is still fading in at 137 s (element-137) and is gone about a second later. The listing above still reads `conversions / sessions` while its result changes.
- Why it matters: this is the second half of the page's answer (cast before dividing), and the number it lands on can hardly be read.
- Cause: `RateScene.tsx:137` passes `color: MARK_OK`, a 24%-alpha band color, as the swap color, and `CellText` uses `swap.color` as the text ink (`video/src/videos/da-sql/parts.tsx:565`). The note at `RateScene.tsx:144` has `out={multAt}`, less than a second after `at={zeroAt + 2}`.
- Fix: pass `color: OK_INK` for the swaps. Give the note `out={twelveAt}` (or no `out`) so it stays up for at least 2 s. At `multAt`, replace the listing with one whose line 0 reads `conversions * 1.0 / sessions`, or with `RATE.pgFixed.lines`, so the SQL on screen produces the 0.1200 shown.

### 3. [P2] confusion: The churn query sits on top of the left join's output
- When: 71.5-94 s, beat `churn` (element-088.jpeg).
- What: The listing changes to `SELECT a.user_id ... WHERE b.user_id IS NULL`, but the table directly under it is still the left join's result from Question 1: six rows, two columns (`user_id`, `feb`), with the null rows banded green. The query's real output appears off to the right under "churned". A viewer who reads the listing and then the table below it sees the `IS NULL` filter return six rows. A milder case of the same thing is in the session scene (205-235 s): its step table (`gap_min`, `is_new`, `session_id`, from a different query) sits beside the page's query, which outputs none of those columns.
- Why it matters: the position of a result under its listing tells the viewer which query produced it, and here that reading is wrong.
- Cause: `JoinScene.tsx:167-174` keeps the `lg` table with no `out` and adds bands at `nullsAt`. The churn listing is placed over it at `JoinScene.tsx:180-189`, and the true result is the separate table at `JoinScene.tsx:202`. In the session scene, `SessionScene.tsx:155-181` places the `SESSION.steps` table beside `SESSION.page`.
- Fix: at `filterAt`, fade rows 2, 3 and 5 out of `lg`, drop its `feb` column, and title it "churned", then remove the separate table on the right. Alternatively, label `lg` "the left join, before the WHERE". In the session scene, add a label "user 1, step by step" above the table.

### 4. [P2] explanation: `NULLIF` is demonstrated on the engine that does not need it
- When: 100-130 s, beats `rate` and `rate-nullif` (element-129.jpeg).
- What: The left panel shows the Postgres error. The `NULLIF` query and its null rates for C and F are shown only in the right-hand DuckDB panel, and the narration then admits "DuckDB returns null there anyway". The Postgres error box never turns into a result; it fades at "Then watch integer division". Both panels are on screen from 100-104 s, but the narration does not name DuckDB, or say why two engines are shown, until about 121 s.
- Why it matters: the viewer never sees the fix work where the problem was, and the null on screen would have appeared without it.
- Cause: `RATE.pgFixed` (Postgres, `NULLIF`, with C and F null) is loaded at `data.ts:88`, but `RateScene.tsx:59-60, 137` uses only its first two values for the swap. The fix is drawn on `RATE.safe` (DuckDB) at `RateScene.tsx:79-97`.
- Fix: at `wrapAt`, replace the Postgres listing with `RATE.pgFixed.lines` and its 6-row result in place of the error box, with C and F null and marked green. Keep the DuckDB table as the page's funnel, without its own `NULLIF` demonstration, or drop it.

### 5. [P2] accuracy: "An ordered sum with no frame" is not true, and "frame" is never defined
- When: 330.4-337.4 s, beat `r-running` (element-337.jpeg).
- What: An ordered `SUM` with no frame clause still has a frame: the default `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. Under `RANGE`, rows that tie on the `ORDER BY` value are summed together, which is the usual interview follow-up. The page says "no explicit frame". The video drops "explicit" and never says what a frame is. The page itself has its own error here: it calls the default `ROWS` (`sql.mdx:244`).
- Why it matters: a viewer who repeats "it has no frame" gets corrected, and the tie behaviour is exactly what the interviewer asks next.
- Cause: the text of `video/src/videos/ds-sql/script.ts:208`. Nothing on screen at `RapidScene.tsx:183-200` mentions the default.
- Fix: narration "A running total is an ordered sum. With no frame written, it runs from the first row to this one: one hundred, three fifty, four twenty-five, six oh five." Add a 22px note under the table: "default frame: `RANGE` … `UNBOUNDED PRECEDING` to `CURRENT ROW`; tied days sum together, so write `ROWS` to avoid that." Also flag `sql.mdx:244` for correction.

### 6. [P2] explanation: The staircase outline is a different staircase from the one narrated
- When: 13-20 s, beat `hook` (element-019.jpeg); 176-188 s, beat `cohort-rate` (element-184.jpeg).
- What: The black outline is drawn on "every row steps down" and again on "That's the staircase", straight after "a hundred, seventy-five, fifty, thirty-eight percent". It traces where each cohort's data ends: April has one cell because it has had one month, not because retention fell. The narration never says why the rows get shorter, so the outline reads as the drop in retention.
- Why it matters: a viewer can mistake missing months for churn, and the incomplete recent cohorts (right-censoring) are a standard question about this chart.
- Cause: the outline follows the filled-cell edge (`CohortGrid.tsx:39-46`) and is cued to the falling-shares wording (`HookScene.tsx:41, 77`; `CohortScene.tsx:50, 146`).
- Fix: hook text "...so every row fades as it goes right. And each newer row is shorter: it has had fewer months to measure." Cue `stairAt` to "each newer row is shorter". In `cohort-rate`, end with "Shares fall along each row, and the newest cohorts have the fewest months."

### 7. [P2] spacing: Code is set well under 19px while space around it goes unused
- When: 205-235 s, session (element-232.jpeg); 156-170 s, cohort (element-169.jpeg); 109-146 s, rate; 282-381 s, rapid round.
- What: The session query is set at 14px in a 1060px-wide box, with about 190px of empty page below it. The cohort query is set at 16px, with about 370px free to its right. The DuckDB listing and every rapid-round listing are 18px. The session and percentile axis ticks, the "30 min" label and the "session N" labels are 18px.
- Why it matters: this breaks the house 19px floor, and the 14px and 16px listings are the queries the narration is walking through.
- Cause: `SessionScene.tsx:174` (`size={14}`), `CohortScene.tsx:16` (`SIZE = 16`), `RateScene.tsx:16` (`DUCK_SIZE = 18`), `RapidScene.tsx:18` (`SIZE = 18`), `SessionScene.tsx:90, 98, 111` and `PctScene.tsx:121` (`label(18, …)`).
- Fix: session listing `size={19}` with `TABLE_TOP` 470 (13 lines at 19px is about 470px and ends near y=990), or show only the `CASE` and `SUM` lines. Cohort `SIZE = 19`, `width={1000}`, with the "each user's cohort month" note moved below the listing. Set `DUCK_SIZE` and the rapid `SIZE` to 19, and the tick and session labels to `label(19, …)`.

### 8. [P3] confusion: The p90 strip carries leftovers and a count that disagrees with its label
- When: 262.3-277 s, beat `pct-tail` (element-275.jpeg).
- What: The median step's black ring (on 180) and green ring (on 150) stay on the strip after the median marker and query have gone, unexplained. The `p90_disc` ring sits on the 900 dot, right beside the 836 line, so the line seems to mark that dot, and 900 is never spoken. "9 in 10 finish within it" sits over a strip where 10 of the 12 dots (83%) are left of the line.
- Why it matters: the leftover rings make the viewer search the figure for something that no longer applies, and the visible count contradicts the label.
- Cause: the `between` and median `isDisc` rings have no exit (`PctScene.tsx:129-135`). The p90 disc ring is added at `PctScene.tsx:130`. The label is at `PctScene.tsx:174`.
- Fix: fade the median rings at `whyAt`. Drop the p90 disc ring, or label it "disc: 900". Change the note to "p90: 90% finish within it (10 of these 12)".

### 9. [P3] answer: Follow-ups an interviewer would press on are left out
- When: 302-314 s, `r-rank`; 188.8-204.4 s, `session`; 170-180 s, `cohort-rate`; 83-88 s, `churn`.
- What: Question 9 says row number "still counts one, two, three, four" but not that the order among ties is arbitrary (the page says so), and Questions 11 and 13 depend on it. Question 5 states thirty minutes as the definition of a session, where the page says "a threshold (commonly 30 minutes)". Question 4 only asserts the step that turns counts into the chart ("`retained` ÷ the cohort's month 0") and shows no SQL for it, although check.mjs ran it (`cohort.rates`, `FIRST_VALUE(retained) OVER (PARTITION BY cohort ORDER BY month_offset)`). Question 2 names `NOT EXISTS` but never shows it.
- Why it matters: these are the gaps an interviewer probes once the first answer is right.
- Cause: `script.ts:196, 145, 137`; `CohortScene.tsx:126-137`; `JoinScene.tsx:203-208` (`RETAIN.notExists` is loaded at `data.ts:73` but not drawn).
- Fix: "row number still counts one, two, three, four, in no set order among the tie." "A new session starts when the gap passes a threshold, commonly thirty minutes." Under the grid label, show the one `FIRST_VALUE` line from `cohort.rates`. Put the four-line `notExists` listing under "churned".

### 10. [P3] confusion: Session breaks are drawn in the series' error red
- When: 195-235 s, beats `session` to `session-sum` (element-232.jpeg).
- What: The 30-minute rule bar, the 95- and 205-minute arcs and their labels, and the rings on session-opening hits are red. A new session is not an error or a trap. In the next scene, red marks the misleading mean.
- Why it matters: it breaks the one-meaning-per-color rule the series keeps elsewhere.
- Cause: `ACCENT` and `ACCENT_INK` at `SessionScene.tsx:97-98, 129-132, 145`.
- Fix: draw the rule bar, the long arcs and the rings in yellow (`ds("yellow", 600)` for strokes, `HIGHLIGHT` for fills) or in ink, since the narration is pointing at them.

### 11. [P3] other: A detached colon and wide monospace spaces
- When: 86-94 s (element-088.jpeg); 36-72 s (element-060.jpeg); 292-381 s (element-301.jpeg).
- What: The note reads "`NOT EXISTS` : the same three", with a space before the colon. "`LEFT  JOIN`" in the Question 1 card and "`GROUP  BY`" in the rapid list show a full monospace space that reads as a double space next to the serif and sans text.
- Why it matters: both look like typos.
- Cause: the inline-flex `gap: 10` puts 10px between the `QMono` span and the ":" text (`JoinScene.tsx:204-205`). `QMono` keeps the font's own space width (`editorial/interview.tsx:36-40`), as used at `JoinScene.tsx:103` and `RapidScene.tsx:331`.
- Fix: wrap `<QMono>NOT EXISTS</QMono>: the same three` in a single inline span inside the flex. Add `wordSpacing: "-0.3em"` to `QMono`.

### 12. [P3] spacing: Text touches box edges
- When: 154-170 s, `cohort` (element-169.jpeg); 321.7-330 s, `r-topn` (element-329.jpeg).
- What: "each user's cohort month" starts exactly at the cohort listing's right border. The highlighted `...amount DESC) AS rn` line runs into the top-N listing's right border.
- Why it matters: both read as cramped.
- Cause: `CohortScene.tsx:106` sets x = `SQL_X + 900`, which is the listing's right edge. `RapidScene.tsx:168` sets `width={570}`.
- Fix: put the note at `SQL_X + 900 + 24` (or move it below the listing, as in finding 7). Make the top-N listing `width={610}` and put its table at `R_X + 630` (`RapidScene.tsx:161`).

### 13. [P3] explanation: Three rapid answers end without their point on screen
- When: 282-292 s, `r-having` (element-291.jpeg); 338-346 s, `r-latest` (element-345.jpeg); 354.8-381 s, `r-count` (element-379.jpeg).
- What: The correct `HAVING` query is up for about 5 s and shows no result. The item then ends, and stays, on the failing `WHERE COUNT(*)` version. "12 customers, 12 rows" does not say that 24 orders went in. "volume against reach" does not say which number is which.
- Why it matters: in a rapid round, the final frame of each item is what a viewer takes away.
- Cause: `RapidScene.tsx:42-56` (the having listing has `out={countAt}`), `RapidScene.tsx:227-233` and `RapidScene.tsx:300-302`.
- Fix: keep the `HAVING` listing and its 4-row result, and show the `WHERE` version below it, struck through, with the error. Change the note to "24 orders in, 12 rows out". Change the reach note to "8 rows: volume; 4 people: reach".

### 14. [P3] pacing: The two densest beats each carry a new structure
- When: 0.6-20.7 s, `hook` (3.04 words/s over 20 s); 321.7-329.8 s, `r-topn` (3.08 words/s, a 9-line query and an 8-row table in 8 s).
- What: The hook defines the cohort chart's rows, cells and month offsets in one continuous run. `r-topn` is the fastest beat in the round.
- Why it matters: these are the two places where the narration runs ahead of what a first-time viewer can parse.
- Cause: `script.ts:69-71` and `script.ts:204-206`, with no internal pause.
- Fix: split `hook` after "...in one month." with `pauseAfter: 0.5`. Give `r-topn` `pauseAfter: 0.8`, or trim "in an outer query" to the on-screen `WHERE rn <= 2`.

### 15. [P3] other: The opening promise covers less than half the video
- When: 0.6-31 s, beats `hook` and `plan` (element-019.jpeg).
- What: "One chart, built one question at a time" and "each of its pieces gets asked on its own". Questions 1 to 4 are pieces of the chart. Sessionization, percentiles and the nine rapid questions are not, so the later bridges have to change subject ("Months are coarse", "what counts as typical").
- Why it matters: the frame the viewer is given stops fitting from 3:08 on.
- Cause: `HookScene.tsx:65` and `script.ts:69-71`.
- Fix: narration "Building it is a classic data science SQL question. Its pieces, and the patterns around them, get asked on their own." Headline turn: "and the queries around it."
