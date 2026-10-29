# DataAnalyst-1-Sql (8:02)

## Verdict
- A clean, accurate pilot. Every number shown or spoken matches `results.json`, and I re-derived the ones that can be checked by hand:
  - region totals 840.75 / 798.75 / 541.50 / 418.00; 11 rows, 4 groups, 2 kept (700.50, 475.75)
  - joins of 6 / 7 / 7 / 8 rows; 350 against 150; AVG 7.5 against 5
  - SUM(DISTINCT) 150 against 200; averages 80 / 55 / 50 and 61.67; ROLLUP 12 + 4 + 1 = 17 rows; 2 rows deleted

  I found no overlaps, no clipping and no text under 19px. The tables are large and cued to their words.
- The biggest problems are answers that stop one step short of what an interviewer presses on, and two places where a step is skipped:
  - Question 2 says "actually run" for what is only the logical order.
  - Question 6 never says that COUNT(1) is no faster, and never mentions COUNT(DISTINCT).
  - Question 9 never gives the rule for choosing a CTE or a subquery, and its conclusion plays under Question 10's card.
  - Question 8 jumps from SELECT DISTINCT, which is correct here, to SUM(DISTINCT), and never says why.
  - "The grain" is used but never defined.
- The left-join trap never says what the query was meant to return. Question 7 then filters the right-hand table in WHERE, which the trap had just warned against, and nothing reconciles the two.
- Pacing is comfortable: a median of 2.62 words a second, pauses of 0.6 to 0.8 s, and about 7 s a question in the rapid round. The fastest beats are the ones that carry definitions: `r-dedupe` (3.23 w/s, ROW_NUMBER), `r-index` (3.18) and `cte-what` (3.08).
- Polish: every null is painted in the series' error red, including nulls that are the correct output. The hook promises "ten traps", but four of the ten questions have no trap. DuckDB's internal column names (`count_star()`, `Count`) appear unexplained.

## Findings

### 1. [P2] answer: Question 2 presents the logical order as the order the engine "actually" runs
- When: 54.1-80.1 s, beats `order`, `order-list`, `order-demo` (element-055.jpeg, element-080.jpeg)
- What: The card and the narration both say "In what order does a query actually run?", and "Watch twenty-four orders go through" then animates the clauses running in sequence. The page calls this the "logical execution order". Neither the video nor the screen says that the optimizer is free to do the work in another order (push filters into the scan, use an index), as long as the result is the same.
- Why it matters: "Is that really how the database executes it?" is the standard follow-up. A viewer who has learned "actually" will answer it wrongly.
- Cause:
  - `video/src/videos/da-sql/OrderScene.tsx:90-92` (card text)
  - `video/src/videos/da-sql/script.ts:136` and `:141`
- Fix:
  - Change the card and `order` to "In what order does a query run, logically?"
  - End `order-list` with "That's the logical order. The engine can do the work differently, but the answer has to match it." (pauseAfter 0.8)

### 2. [P2] answer: Question 6 leaves out both follow-ups the page gives
- When: 210.2-222.0 s, beat `nulls-count` (element-216.jpeg, element-220.jpeg)
- What: The answer stops at "count star and count of one both count all six rows; count of discount counts only the four". It leaves out two things the page's answer includes:
  - COUNT(1) is not faster than COUNT(*) ("identical performance in modern engines"). This myth is the reason the question is asked.
  - COUNT(DISTINCT col) counts distinct non-null values.
- Why it matters: "So is COUNT(1) faster?" is the next question in nearly every screen that asks this one.
- Cause: `video/src/videos/da-sql/script.ts:237` (`nulls-count`)
- Fix: Append "Count of one isn't any faster: engines treat the two the same. And count distinct counts the different values, nulls left out." to `nulls-count`, or put it in a new beat with pauseAfter 0.8. Say it aloud only: in this data, COUNT(DISTINCT discount) is also 4, so a column for it would not show the difference.

### 3. [P2] answer: Question 9 never says when to choose which, and its conclusion lands under Question 10's card
- When:
  - 307.3-320.7 s, beats `cte`, `cte-what` (element-316.jpeg)
  - 349.1-357.9 s, beat `cte-same` (element-357.jpeg)
- What:
  - Before Question 10 starts, Question 9 gets only a definition, at 3.08 w/s.
  - From 314 to 321 s the screen shows the full CTE query (`WITH avgs ... JOIN avgs ... WHERE o.amount > avgs.avg_amount`). The problem it solves, orders above their customer's own average, is not posed until 327 s.
  - The narration says "use it as often as you like", but the listing uses it once.
  - The recommendation, "Easier to read, and easier to check", comes at 355 s, under the heading "Question 10 / What's a correlated subquery?".
  - The page's rule is never said: a subquery for a one-off inline filter, a CTE when a step is reused or chained, or when it has to recurse through a hierarchy, which a subquery cannot do.
- Why it matters: The viewer hears what a CTE is, but never hears the answer to the question on the card.
- Cause:
  - `video/src/videos/da-sql/CteScene.tsx:87-92`: Question 9's card leaves at `q10At - 4` and does not come back.
  - `video/src/videos/da-sql/CteScene.tsx:127-136`: the whole CTE listing inks on "named step".
  - `video/src/videos/da-sql/script.ts:304` and `:324`
- Fix:
  - Split `cte-what` into "Think of a CTE as a named step, written once at the top, with WITH." (pauseAfter 0.5) and "Use a subquery for a one-off filter. Use a CTE when you need a step twice, chain several, or walk a hierarchy, which only a recursive CTE can."
  - During `cte-what`, show only lines 0 to `cteEnd` of the listing.
  - Open `cte-same` with "Back to question nine:", and bring the Question 9 card back on those words, with Question 10's card going `out` at the same cue.

### 4. [P2] explanation: Question 8 switches from SELECT DISTINCT to SUM(DISTINCT) without saying why
- When: 276.7-294.2 s, beats `distinct-rows`, `distinct-sum` (element-285.jpeg, element-288.jpeg, element-301.jpeg)
- What:
  - `SELECT DISTINCT o.order_id, o.amount` returns 1/100, 2/50 and 3/50, and the narration rightly says the orders "look right again". Summed, those three rows give 200, the correct total.
  - The next beat swaps in a different query, `SUM(DISTINCT o.amount)`, with "But sum of distinct amount gives one fifty". Nothing says that someone now wants the total and puts DISTINCT inside the SUM.
  - The page's actual warning, that DISTINCT masks a bad join instead of fixing it, comes only as the closing one-liner.
- Why it matters: A viewer can come away believing that the SELECT DISTINCT above collapsed the two fifty-dollar orders, which it did not.
- Cause:
  - `video/src/videos/da-sql/script.ts:280-290`
  - `video/src/videos/da-sql/DistinctScene.tsx:131-149`: the row listing goes `out` at `sumAt - 4`, and the SUM listing replaces it in the same place.
- Fix:
  - Re-voice `distinct-sum` as "Now they want the total, so they write sum of distinct amount. One fifty: orders two and three both cost fifty, and DISTINCT kept that amount once."
  - End `distinct-truth` with "DISTINCT hid the fan-out instead of fixing it. Aggregate the items first, as in question four."

### 5. [P2] explanation: "The fix is the grain" is never defined, and the reason to join the items at all is never given
- When: 182.2-183.7 s, beat `fanout-fix` (element-183.jpeg, element-194.jpeg)
- What:
  - "Grain" is said once and never explained, either aloud or on screen.
  - The fixed query selects revenue and an item count together. The narration never says that this is the goal, so "why join the items at all?" goes unanswered.
- Why it matters: "Grain" is the word an interviewer listens for, and an undefined word cannot be repeated with confidence.
- Cause:
  - `video/src/videos/da-sql/script.ts:219`
  - `video/src/videos/da-sql/FanoutScene.tsx:192-196` (the note "items has one row per order, then the join")
- Fix:
  - Re-voice as "The fix is the grain: what one row stands for. We want revenue and an item count, so count the items per order first, in a CTE, a common table expression, then join."
  - Change the note to "items: one row per order, the orders' grain. Then the join."

### 6. [P2] answer: The left-join trap never states its requirement, and Question 7 then does what it warned against
- When:
  - 139.1-156.5 s, beats `trap-where` to `trap-on` (element-141.jpeg, element-154.jpeg)
  - 261.1-266.6 s, beat `anti-fix` (element-269.jpeg)
- What:
  - "Ask for orders over fifty dollars, and put that filter in WHERE. Di disappears" presents the WHERE version as a bug. For the request as worded, though, WHERE is correct: Di has no order over fifty.
  - The ON version is only right if the request is every customer with their orders over fifty. That is never said, and the video never says when each version is the one to use.
  - Two minutes later, Question 7's left-join answer filters the right-hand table in WHERE (`WHERE o.customer_id IS NULL`). Nothing says why that is the one WHERE test that keeps unmatched rows.
- Why it matters: The takeaway "never filter the right table in WHERE" is an overcorrection that an interviewer will test, and Question 7 contradicts it on screen.
- Cause:
  - `video/src/videos/da-sql/script.ts:189` (`trap-where`), `:197` (`trap-on`), `:266` (`anti-fix`)
- Fix:
  - `trap-where`: "Ask for every customer and their orders over fifty dollars, and put that filter in WHERE."
  - Add to `trap-on`: "If you only want the big orders, WHERE is fine. To keep every customer, filter in ON."
  - `anti-fix`: "...or a left join where the order comes back null. IS NULL is the one test in WHERE that keeps the unmatched rows."

### 7. [P2] pacing: Deleting duplicates rests on an undefined window function, at the video's fastest pace
- When: 462.1-467.7 s, beat `r-dedupe`, 3.23 w/s, gap 0.55 (element-465.jpeg, element-467.jpeg)
- What:
  - "Number each copy with row number, and delete everything after the first" introduces ROW_NUMBER. It is a window function, which this series teaches only in Part 4.
  - The two clauses that make the answer work are never said: PARTITION BY email (what counts as a copy) and ORDER BY id (which copy survives). Only line 1 of the listing is marked.
  - The struck rows and the "Count 2" result are on screen for about 1.5 s before the cut.
- Why it matters: "Which copy do you keep?" is the immediate follow-up, and the viewer has only the listing's 20px text to answer it from.
- Cause:
  - `video/src/videos/da-sql/script.ts:373`
  - `video/src/videos/da-sql/RapidScene.tsx:513` (marks only `line: 1`)
- Fix:
  - Re-voice as "To delete them but keep one, number the copies of each email with row number, oldest first, and delete every copy numbered over one." (pauseAfter 0.8)
  - Mark line 2 (`PARTITION BY email ORDER BY id`) on "each email".

### 8. [P3] confusion: The aggregate half of Question 5 plays under Question 6's card
- When: 222.8-233.2 s, beat `nulls-avg` (element-226.jpeg, element-236.jpeg)
- What: "Other aggregates skip nulls too ... coalesce, and it drops to five" belongs to the page's Question 5 ("How do NULLs behave in comparisons and aggregates?"). It is spoken under the heading "Question 6 / COUNT(*), COUNT(1), or COUNT(column)?", and its AVG lines sit in the COUNT listing.
- Why it matters: A viewer who jumps to Question 5 gets half its answer.
- Cause:
  - `video/src/videos/da-sql/NullsScene.tsx:89-94` (Question 5's card leaves at `q6At - 4`) and `:136-160`
  - `video/src/videos/da-sql/check.mjs:167` (one query for both questions)
- Fix: Order the beats `nulls`, `nulls-equals`, `nulls-avg`, `nulls-count`:
  - Split the query into `SELECT AVG(discount), AVG(COALESCE(discount, 0))` under Question 5 and the three COUNTs under Question 6.
  - Start `nulls-avg` with "Aggregates skip nulls." (drop "too").

### 9. [P3] confusion: Every null is drawn in the series' error red, including the correct ones
- When:
  - 113-134 s: Di's nulls in the LEFT and FULL join (element-117.jpeg, element-133.jpeg)
  - 368-371 s: Mona's manager in the self join (element-370.jpeg)
  - 406-412 s: NULLIF's `per_session`, the very result NULLIF exists to produce (element-406.jpeg)
  - 449-453 s: ROLLUP's subtotal markers (element-449.jpeg)
- What: Every "null" cell is red, which in this series means the trap, the wrong answer or the error. Most of these nulls are the right output.
- Why it matters: It tells the viewer that the left join, NULLIF and ROLLUP went wrong exactly where they worked.
- Cause: `video/src/videos/da-sql/parts.tsx:569` (`text === "null" ? ACCENT_INK`)
- Fix: Paint "null" in `INK_SOFT` italic by default. Keep red only where the null is the trap, through a cell mark: Di's amount in the trap scene and order 107's `customer_id` in Question 7, which already carry `MARK_BAD`.

### 10. [P3] confusion: The joins scene ends on the FULL JOIN table while the tell says LEFT JOIN
- When: 126.8-134.0 s, beat `joins-tell` (element-133.jpeg)
- What: The closing line reads "Every customer, including the ones who never ordered: LEFT JOIN", and the LEFT Venn mark is relit. The result table beside it is still headed "FULL JOIN 8 rows" and still shows the stray `null 125 64.00` row.
- Why it matters: The figure contradicts the sentence the scene ends on.
- Cause:
  - `video/src/videos/da-sql/JoinsScene.tsx:161`: the FULL label has no `out`.
  - `video/src/videos/da-sql/JoinsScene.tsx:175`: the stray row never collapses.
- Fix:
  - Give the FULL label `out: leftJoinAt - 4`, and re-ink "LEFT JOIN 7 rows" at `leftJoinAt`.
  - Add `collapseAt: leftJoinAt` to the stray row.

### 11. [P3] other: DuckDB's internal column names appear unexplained
- When:
  - 203-236 s, beats `nulls-equals` to `nulls-avg` (element-209.jpeg, element-236.jpeg)
  - 466-468 s, beat `r-dedupe` (element-467.jpeg)
- What:
  - The listing says `COUNT(*)`, but the result is headed `count_star()`, a name the viewer has never seen.
  - The DELETE result is headed `Count`.
- Why it matters: A viewer stops to decode a header that has nothing to do with the answer.
- Cause:
  - `video/src/videos/da-sql/check.mjs:163-167` (unaliased COUNTs)
  - `video/src/videos/da-sql/RapidScene.tsx:514` (the dedupe result table)
- Fix:
  - In `data.ts`, relabel the columns with the expressions as written (`COUNT(*)`, `COUNT(1)`, `COUNT(discount)`, ...).
  - Head the DELETE result "rows deleted".

### 12. [P3] explanation: Rapid-fire answers that drop the reason the page gives
- When:
  - 372.1-377.8 s, `r-union` (element-377.jpeg)
  - 404.3-412.2 s, `r-coalesce` (element-406.jpeg)
  - 446.4-456.9 s, `r-rollup` (element-449.jpeg, element-454.jpeg)
- What:
  - UNION ALL "is faster" with no reason given (it skips the duplicate check).
  - NULLIF is introduced "like a zero you're about to divide by", but nothing says that dividing by zero is an error in most engines. On DuckDB it is not: `results.json` `divideByZero` returns null without NULLIF.
  - "Seventeen rows" has no derivation (12 pairs + 4 subtotals + 1 total), and its "17 rows" note is up for only 1.4 s (451.7-453.0).
  - "GROUP BY ALL groups by every column you didn't aggregate" omits "in the SELECT", and the page's warning that the shorthand is dialect-specific.
- Why it matters: Each of these is the "why?" an interviewer asks next.
- Cause:
  - `video/src/videos/da-sql/script.ts:339`, `:351`, `:368`
  - `video/src/videos/da-sql/RapidScene.tsx:437-441` (the "17 rows" note goes `out` at `allAt - 4`)
- Fix:
  - `r-union`: "...and it's faster, because it skips the duplicate check."
  - `r-coalesce`: "...like a zero you're about to divide by. In most databases dividing by zero is an error, and dividing by null just gives null."
  - `r-rollup`: "Twelve region and category rows, four subtotals and a grand total: seventeen. Where it's supported, GROUP BY ALL groups by every selected column you didn't aggregate." Set the note to "12 + 4 + 1 = 17 rows".

### 13. [P3] other: The hook promises ten traps, but four of the ten have none
- When:
  - 9.7-17.2 s, beat `plan` (element-010.jpeg, element-016.jpeg)
  - 359.5-364.3 s, beat `rapid-in` (element-362.jpeg)
- What:
  - "Ten of them hide a trap", the red tiles 1 to 10 and the legend "Ten hide a trap, taken slowly" all promise ten traps, and "That's the ten traps" repeats the claim.
  - Questions 2 (clause order), 3 (join types), 9 (CTE or subquery) and 10 (correlated subquery) are explanations, not traps. The one scene that is labelled a trap ("Question 3: the trap") is not one of the ten numbered questions.
- Why it matters: A promise the video visibly does not keep.
- Cause:
  - `video/src/videos/da-sql/script.ts:108` and `:332`
  - `video/src/videos/da-sql/HookScene.tsx:100-105`
- Fix:
  - `plan`: "Ten of them need a picture, so we'll take those slowly."
  - `rapid-in`: "That's the ten."
  - Change the legend to "Ten, taken slowly".

### 14. [P3] confusion: The index figure's labels say the opposite of what is meant, and the new row gets no pointer
- When: 430.6-445.8 s, beats `r-index` (3.18 w/s), `r-writes` (element-436.jpeg, element-445.jpeg)
- What:
  - "the rows, stored in id order: one per table" reads as if the rows were one per table, when it is the clustered index that is one per table.
  - The inserted `di@example.com` row appears in both tables, but no arrow joins it, which is the very update "each insert has to update it too" refers to.
  - Two definitions arrive in a single 8.5 s beat at 3.18 w/s, followed by a 0.55 s gap.
- Why it matters: This is the one figure in the round that has to show a mechanism, and its label garbles that mechanism.
- Cause:
  - `video/src/videos/da-sql/RapidScene.tsx:340`
  - `video/src/videos/da-sql/RapidScene.tsx:355-357`: arrows only for the original five rows.
  - `video/src/videos/da-sql/script.ts:363`
- Fix:
  - Change the labels to "clustered: the rows themselves, in id order (one per table)" and "non-clustered: a separate lookup (many per table)".
  - Draw an arrow for the inserted index row (row `n`) at `insertAt + 16`.
  - Split `r-index` after "a table gets one." with pauseAfter 0.4.

### 15. [P3] other: Narration and screen disagree in two small places
- When:
  - 70.4-80.1 s, `order-demo` (element-080.jpeg)
  - 201.5-209.4 s, `nulls-equals` (element-209.jpeg)
- What:
  - The narration says "the eleven over a hundred dollars", while the listing says `WHERE amount >= 100`.
  - "Zero rows" is said over a query that returns one row with `count_star() = 0`.
- Why it matters: An attentive viewer notices both, and `>=` against "over" is exactly the off-by-one an interviewer checks.
- Cause:
  - `video/src/videos/da-sql/check.mjs:109` and `:113`, against `video/src/videos/da-sql/script.ts:146`
  - `video/src/videos/da-sql/script.ts:232`
- Fix:
  - Use `amount > 100` in check.mjs. No amount in the data is exactly 100.00, so the count stays 11.
  - Say "Zero matches."

### 16. [P3] answer: Three deep dives stop one step short
- When:
  - 48.3-52.5 s, `where-fix` (element-050.jpeg)
  - 261.1-266.6 s, `anti-fix` (element-269.jpeg)
  - 341.0-348.4 s, `cte-plain` (element-345.jpeg)
- What:
  - Question 1 never says to keep row filters in WHERE, where they shrink the input before grouping, even though Question 2's query uses both clauses.
  - Question 7 never mentions the other common fix for NOT IN, `WHERE customer_id IS NOT NULL` inside the subquery.
  - Question 10 implies the cost ("runs again for every order") but never says that this is why correlated subqueries can be slow on large tables, as the page does.
- Why it matters: Each is a one-sentence follow-up.
- Cause: `video/src/videos/da-sql/script.ts:131`, `:266`, `:319`
- Fix:
  - `where-fix`: "...East and North. Keep row filters in WHERE, though: they shrink the table before grouping."
  - `anti-fix`: "...Both find Di. Or keep NOT IN and filter the nulls out of the subquery."
  - `cte-plain`: "An uncorrelated subquery runs once, which is why correlated ones get slow on big tables."

### 17. [P3] other: Each question opens on a near-empty page for about a second
- When: about 53.9-55.0 s, 92.4-93.6 s and 272.0-273.5 s (element-054.jpeg, element-093.jpeg, element-272.jpeg)
- What: At these cuts, the previous scene is gone and only the "Question N" kicker is on the white page while "Question N" is spoken. The card text inks in only on its own first word.
- Why it matters: A brief flash of empty page at every question, the pattern the Data Scientist review flagged.
- Cause:
  - `video/src/editorial/interview.tsx:87`: the card text waits for `textAt`.
  - `video/src/videos/da-sql/Video.tsx:53-63`: the outgoing scene overlaps by only 6 frames.
- Fix: In OrderScene, JoinsScene and DistinctScene, do one of the following:
  - Bring the first figure in at `from + 2`, as NullsScene and AntiScene already do.
  - Pass `textAt={qAt + 6}`, so the text inks while "Question N" is being said.
