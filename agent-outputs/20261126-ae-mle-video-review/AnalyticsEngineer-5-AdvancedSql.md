# AnalyticsEngineer-5-AdvancedSql (10:58, 657.5 s)

Second review. The first pass is `agent-outputs/20261120-ae-interview-video-review/AnalyticsEngineer-5-AdvancedSql.md`, and its fixes are in `.../fixes/AnalyticsEngineer-5-AdvancedSql.md`.

## Verdict
- All fourteen earlier fixes hold on screen. The P1 holds: customer 3's tie numbers c4@x.com as row 1 and c3@x.com as 2, which matches the `tie.rowNumber` run, under "`ROW_NUMBER`: 12 rows, but which of the pair is 1?" (element-176). The rest also hold:
  - Q3's error has no yellow band (element-125), and the step notes sit level with their own lines (element-118).
  - Q4's email title has no strike (element-156). Q12's aov column fades rather than being struck (element-503).
  - Q13 keeps its null (element-522). The top-N excerpt shows `PARTITION BY category` (element-560). Q8 has its 385, 100 and 145, the expression that ran, and "-45, should be -100" beside March 2024 (element-337, element-325, element-351).
  - "outside `MIN` to `MAX`" (element-419), the `r-depth` sentence and its note (element-605), "a few dozen rows at most", "`RANK`: 5 rows, the tie kept", and the longer pauses (timeline) are all in place.
- Every number on screen matches `results.json` and the narration, and the answers hold up against the page. I checked: the six sales and their three windows, 39.9 and 60.1, 24 to 12 rows, 13 against 12 on the tie, 411, the trailing counts 1 to 6, 100/350/425/605 against 100/425/425/605, -285, -45, the eight wrong months and -45 against -100, 10 and 15 rows, the 1s against 0s, 23 against 12, 6 users and 11 extra counts, 962,761 (3.7% low), 125.00 against 50.01, 150.00/null/150.00, the ranking trio, 4 against 5 rows, the six CTE rows, 1 to 5, 1/3/6/11/3, the pivot and the eight unpivoted rows.
- What the first pass missed is small and all on screen, not in the words. The one real defect is a timing one: Postgres's "window functions are not allowed in `WHERE`" is on screen for about 1.6 s. That is on the very sentence that says "Postgres says so". Two error boxes also wrap badly, and Q11 leaves a stray label beside its sum.
- Pacing is otherwise comfortable. Every beat over 3.2 w/s is a one-line turn, or is followed by 1.2 s or more.

## Findings

### 1. [P2] pacing: The `WHERE` error leaves about 1.6 s after it appears
- When: 149.4-151.1 s, beat `latest-where` (element-150.jpeg; element-149 has no box yet, and element-151 is already fading)
- What: The error "window functions are not allowed in WHERE" inks in on "Postgres says so". Those are the last three words of the beat. The stage clears for `GROUP BY` with `MAX` when `latest-max` starts, 0.6 s after the sentence ends. Inside its 640 px box, the message also wraps its last word, "WHERE", onto a second line by itself.
- Why it matters: The narration points at Postgres's own words as the evidence. They are gone before they can be read, which is the "result shown for about a second" pattern. Because of the orphaned word, it also takes two lines to read.
- Cause: `video/src/videos/ae-advanced-sql/LatestScene.tsx:275` (`ErrorBox ... at={saysAt} width={640}`, inside the stage that ends at `maxAt - 4`, `:273`); `script.ts:375` (`pauseAfter: 0.6` on `latest-where`).
- Fix: This is timing only. Ink the error on "where can't see a window function" (`cantAt + 14`, just after the red band reaches the `WHERE` line), so it is up while the reason is given and stays through "Postgres says so". Widen the box to 660 so the message fits on one line. Set `pauseAfter` to 1.0 on `latest-where`. The error then holds for about 4 s.

### 2. [P3] spacing: Q3's error splits `GROUP BY` across two lines
- When: 122-127 s, beat `mix-trap` (element-125.jpeg)
- What: The message wraps as "...must appear in the GROUP" / "BY clause or be used in an aggregate function". The keyword is broken at the line end, so its second word starts the next line.
- Why it matters: The keyword is the subject of the error. Split across lines, it reads as two words.
- Cause: `video/src/videos/ae-advanced-sql/WindowScene.tsx:375` (`width={680}`, so the 53-character first line exactly fits the 636 px of text room).
- Fix: Set the width to 664. That leaves 620 px of text room at 20 px, so the first line breaks before "GROUP", and the 51-character "GROUP BY clause or be used in an aggregate function" fits on the second line.

### 3. [P3] confusion: A stray "101: 5 days" under the sum
- When: 435.5-441 s, beats `distinct-why`, `distinct-fix` (element-436.jpeg, element-438.jpeg)
- What: On "Six of them came back", a grey "101: 5 days" appears directly under the red "= 23". It stays until the flow starts. User 101's own highlight leads the other five by about half a second, so for the whole time the label is up, all six returning users are lit together. The narration never names user 101.
- Why it matters: Set under the sum, the label reads as a footnote to 23. It also singles out one person from a group of six that the narration treats as one.
- Cause: `video/src/videos/ae-advanced-sql/DistinctScene.tsx:193-197` (the `Note` at `sixAt + 2`, `x={sumX}`, `y={countY + h(36)}`).
- Fix: Remove the note, and the `days101` it needs. "6 came back on other days: 11 extra counts" already says what the lit IDs show.
