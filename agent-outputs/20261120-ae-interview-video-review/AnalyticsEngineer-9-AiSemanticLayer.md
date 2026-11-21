# AnalyticsEngineer-9-AiSemanticLayer (8:20)

## Verdict
- A strong closer with one thread that pays off: the page's eight orders give 1,450, 1,190 and 440 in Question 1 and come back as the governed metric, the cut description, the scored candidates and the duplicate revenue. Every number on screen matches `results.json` (1450.00 / 1190.00 / 440.00, 3.3, the tests' 0 failing rows, the 10 and 7 rows, Oct 30 to Nov 4, 7 of 7, 3 of 7, 110). No text under 19px, no clipping, no scene clears to an empty page.
- The worst defect is visual, on the exact point the page's #746 revision and its third concept check exist to correct: in Question 3 a padlock pops up under the "private" staging model, beside the red-crossed arrow to `int_orders`, so the picture says "private locks the assistant out" while the narration says private stops `ref()`, not queries.
- One answer does not survive an interviewer: Question 3's caution says an assistant that "follows [the description] to the letter" reports 1,190, but the description tells it to use the `net_revenue` metric, which returns 440 whatever the gloss says. Only an assistant that writes its own SQL from the description gets 1,190.
- Pacing is comfortable (2.3 to 2.9 words/s almost everywhere). The problems are two results that are on screen for about a second: the test account in Question 1 (marked for about 0.6 s, then rows dim at "not from the test account" with nothing saying why) and the strict filter's "missed" in Question 5's incremental strip (about 1 s before the lookback window replaces it). `t2s-past` (3.63 w/s) rushes the question's conclusion.
- As interview answers, Q1, Q2, Q5 and Q6 hold up well; Q2's refusal and drift and Q5's "the two only work as a pair" run are the best moments. Q4 stops one step short of the follow-up on execution accuracy's own blind spot, and Q5's grain item is drawn against the config line, which blurs `unique_key` and a `unique` test.

## Findings

### 1. [P1] confusion: the padlock puts "private" on the wrong side of the access lesson
- When: 219.8-260 s, beats `ready-access` to `ready-review` (element-221.jpeg, element-240.jpeg)
- What: The grant is drawn first: a green "SELECT granted" arrow to `fct_orders` and a red arrow toward `int_orders` stopped by a cross (217.6 s, "the public marts only"). Then on "Marking staging models private" (219.8 s) both staging boxes turn grey with "private" chips and a large padlock pops up under `stg_orders`, next to the crossed arrow. It stays for the rest of the scene section. The only correction is the soft grey tail "· private stops ref(), not queries" in the heading at 224 s.
- Why it matters: The picture reads "private = locked away from the assistant", which is the misconception the page rewrote this answer to remove and that its third concept check tests ("A dbt access modifier alone restricts ref(), not queries"). A viewer who remembers the image will say "mark staging private so the assistant can't query it".
- Cause: `video/src/videos/ae-ai-semantic-layer/ReadyScene.tsx:249` (`Spot ... padlock at={markAt + 6}` placed under `modelX(0)`, the private staging model).
- Fix: Make the padlock the warehouse role's: place it beside the Assistant box and the refused arrow's cross, popping with the cross (`martsAt + 26`), so the lock belongs to the grant. Leave the "private" chips as they are, and under the two private models add a small soft note "ref() only, not queries" on "not queries".

### 2. [P2] answer: "follows it to the letter" would use the metric and get 440, not 1,190
- When: 242.2-253.6 s, beat `ready-input` (element-251.jpeg, element-258.jpeg)
- What: The description says "For revenue, use the net_revenue metric, which excludes refunded and cancelled orders [and test accounts]." With "and test accounts" struck, the narration says "an assistant that follows it to the letter reports eleven hundred ninety", and the label reads "Net revenue, followed to the letter". But following it to the letter means calling `net_revenue`, whose definition lives in the semantic layer and still returns 440. 1,190 is what an assistant gets when it ignores that instruction and writes its own SQL against `fct_orders` from the gloss (`results.json` `ready.withoutCut.sql`).
- Why it matters: The example is the video's own illustration of the page's caution, and an interviewer would point out the contradiction at once.
- Cause: `script.ts` beat `ready-input`; `video/src/videos/ae-ai-semantic-layer/ReadyScene.tsx:275` (label "Net revenue, followed to the letter").
- Fix: Split `ready-input` after "One caution: documentation is now an input." (recut free) and re-voice the second sentence as "Drop the words and test accounts from the end of this description, and an assistant writing its own SQL from it reports eleven hundred ninety." Change the label to "Net revenue, in SQL written from the description".

### 3. [P2] pacing: the strict filter's miss is on screen for about a second
- When: 391.7-393.0 s, beat `review-pair` (element-391.jpeg, element-392.jpeg, element-393.jpeg)
- What: The red ring and the red "missed" on late order 7 appear on "misses it" (391.7 s) and go when "A three-day lookback" starts (392.6 s); the "After Nov 3" window is replaced by the lookback window in the same moment. The whole run (late order, strict filter, lookback, re-read, append, merge) is one 22 s beat.
- Why it matters: The miss is half of "the two only work as a pair"; a viewer who blinks sees only the lookback, and the whole argument is carried by a single breathless beat.
- Cause: `video/src/videos/ae-ai-semantic-layer/ReviewScene.tsx:245,264,296` (strict window `out={lookAt}`, ring until `lookAt + 10`, label fades from `lookAt`); `script.ts` beat `review-pair` (one beat, no pause after "misses it").
- Fix: Split `review-pair` at its sentence breaks into `review-pair` ("The two only work as a pair. Here, one order arrives late, dated two days before the newest row loaded."), `review-strict` ("A filter for dates after the newest one loaded misses it.", `pauseAfter` 0.9) and `review-look` (the rest), all recut free. Keep the red ring and "missed" until "catches it", then turn the ring yellow (re-read colour) as the lookback window covers it.

### 4. [P2] confusion: the grain check is drawn on the config line, blurring `unique_key` and a `unique` test
- When: 358.6-363.3 s, beat `review-grain` (element-362.jpeg), then 371.5-381 s, `review-incr`
- What: On "Grain: what is one row, and is there a unique test proving it?" the yellow band lights `{{ config(materialized='incremental') }}`. Thirteen seconds later `unique_key='order_id'` is written into that same line for the incremental fix. A `unique` test lives in the model's YAML, not its config, and `unique_key` (how a rerun merges) is not a test of the grain.
- Why it matters: The screen invites "add unique_key to the config" as the answer to the grain question, which is a confusion an interviewer would probe (a merge key does not prove one row per order; a `unique` test does).
- Cause: `video/src/videos/ae-ai-semantic-layer/ReviewScene.tsx:196` (`{ line: lines[configAt], at: grainAt + 6, out: refsAt }`).
- Fix: Light `order_id` in the `select order_id, order_date, amount` line instead (one row per `order_id`?), and under the listing add a red note on "a unique test proving it": "no unique test on order_id in its YAML".

### 5. [P2] pacing: the test account is marked for about half a second, then used unexplained
- When: 56.8-57.6 s, beat `t2s-rows`; 64.4-66.3 s, beat `t2s-run` (element-057.jpeg, element-067.jpeg)
- What: "one customer is a test account" lights customer 4's `true` and the two `4` cells in `orders` at 57.0 s; both marks go at 57.6 s when `t2s-run` starts, and the customers table clears with them. At "Completed, and not from the test account" (65.7 s) rows 104 and 108 dim with nothing on screen saying why those two.
- Why it matters: The third reading is the one the rest of the video calls governed; its one non-obvious step is shown for less time than it takes to find it.
- Cause: `video/src/videos/ae-ai-semantic-layer/T2sScene.tsx:100` (`testMarks ... out: runFrom`), `:171` (customers `Clear at={runFrom - 4}`); `script.ts` `t2s-rows` `pauseAfter: 0.5`.
- Fix: Keep the two `customer_id` 4 marks in `orders` until `nameAt` (light them again at `notTestAt` if they have faded), and raise `t2s-rows` `pauseAfter` to 1.0 so the two tables hold before the query replaces the customers table.

### 6. [P3] pacing: `t2s-past`, the question's conclusion, is the fastest beat in the video
- When: 84.8-93.6 s, beat `t2s-past` (element-093.jpeg)
- What: 3.63 words/s for "And no query can find the right one in the rows. Which reading counts as revenue is a company decision, so it has to be written down where the assistant reads it." Both sentences are new claims and the headline "Revenue is a decision, not a column" builds under them.
- Why it matters: It is the line Question 2 is built on, said faster than anything else.
- Cause: `script.ts` beat `t2s-past`.
- Fix: Split after "in the rows." into `t2s-past` and `t2s-decision` (recut free), `pauseAfter` 0.6 between them; move the `decisionAt` and `writtenAt` cues to the new beat.

### 7. [P3] answer: Question 4 stops before execution accuracy's own blind spot
- When: 301.5-315.1 s, beat `eval-score` (element-314.jpeg)
- What: Execution accuracy is presented as the answer, with no limit. The obvious follow-up ("what can it still get wrong?") has an answer in the video's own data: on rows with no completed test-account orders, the "completed only" query C returns the same 440 as the reference and would pass.
- Why it matters: An interviewer who hears "compare result sets" asks next how a wrong query can still match; the answer is "verify on data that tells the readings apart".
- Cause: `script.ts` after `eval-score`; `video/src/videos/ae-ai-semantic-layer/EvalScene.tsx:257`.
- Fix: Have `check.mjs` run A and C on the orders without customer 4's rows and record both (440.00 each) in `results.json`. Add a beat after `eval-score`: "One catch: a wrong query can match by luck. Without the test account's orders, the third one returns four hundred forty too, so check on data that tells the readings apart." and a soft line under the grid with the computed values.

### 8. [P3] confusion: "it won't ask." stays highlighted for 75 seconds, beside two other highlights
- When: 191.2-260 s, beats `ready` to `ready-review` (element-201.jpeg, element-258.jpeg)
- What: The yellow band on "it won't ask." never clears. At 197-202 s three yellow highlights are on screen at once ("it won't ask.", "One row per order.", "use the net_revenue metric"), and later it sits beside "access: public" and "Review descriptions like code".
- Why it matters: Yellow is "what the narration points at"; a band left on for the whole scene dilutes the ones that move with the words.
- Cause: `video/src/videos/ae-ai-semantic-layer/ReadyScene.tsx:123` (`<Mark at={askAt}>` with no `out`).
- Fix: `out={describeAt}`.

### 9. [P3] confusion: "Duplication" is crossed on a model that computes no revenue
- When: 404.6-417.8 s, beat `review-dup` (element-408.jpeg, element-423.jpeg)
- What: The checklist marks "Duplication · revenue exists already" with a red cross against "The model an assistant wrote", an incremental copy of orders with no revenue in it. The duplicate (`revenue 1190.00`) is a separate example drawn under the listing.
- Why it matters: The cross claims a defect the listing on screen does not have.
- Cause: `video/src/videos/ae-ai-semantic-layer/ReviewScene.tsx:138` (`markAt: nameAt`).
- Fix: Drop the cross from Duplication (as Tests and docs has none), keep its question as the note ("· does it exist already?"), and put a small label "For example" above the two metric chips.

### 10. [P3] explanation: the golden set's three kinds of question are bare tags
- When: 273.3-285 s, beats `eval-mix`, `eval-store` (element-284.jpeg)
- What: The golden set holds one row ("What was net revenue?") and the three kinds appear only as chips: "easy lookup", "multi-step comparison", "ambiguous phrasing". No example says what a multi-step or ambiguous question looks like.
- Why it matters: "Mix the difficulty" is advice an interviewer hears often; an example of each is what makes it concrete.
- Cause: `video/src/videos/ae-ai-semantic-layer/EvalScene.tsx:170-178`.
- Fix: Under each chip, a 20px soft example on the chip's cue: "Net revenue last month?", "Which region grew fastest this quarter?", "How are sales doing?".

### 11. [P3] spacing: "logged" floats far from anything it belongs to
- When: 465-471 s, beat `r-connect-design` (element-469.jpeg)
- What: The "logged" badge and "For audit, and the golden set" sit at y 840 to 900 under the MCP column, 300px below the MCP box, in the same row as the warehouse's "read-only" and "cost and timeout limits", so they read as a fourth badge of the warehouse row rather than as a property of the path.
- Why it matters: Each badge is meant to sit on the part of the path it governs.
- Cause: `video/src/videos/ae-ai-semantic-layer/RapidScene.tsx:133,138` (`top: whTop + whH + h(26)`).
- Fix: Move "logged" and its note under "dbt Labs publishes an MCP server" (about `mcpTop + boxH + h(110)`), where every request passes.

### 12. [P3] other: four labels that say slightly the wrong thing
- When: 70-95 s (element-076.jpeg), 387-404 s (element-391.jpeg)
- What: (a) "3.3× apart" under the result: a ratio is not a distance; the narration says "more than three times the smallest". (b) "Every query runs: no error" over one query with three readings. (c) "Order 7 is dated Nov 1, 2 days before" ends before saying what it is before. (d) "The model an assistant wrote" still heads the listing after the review has written `unique_key`, the lookback and `source()` into it, while the strip below shows the strict filter.
- Why it matters: Small, but each one makes the viewer stop and reread.
- Cause: `T2sScene.tsx:212,216`; `ReviewScene.tsx:300,184`.
- Fix: (a) "1450.00 is 3.3× 440.00" (from `READINGS`); (b) "Each reading runs: no error"; (c) "Order 7 is dated Nov 1, 2 days before Nov 3"; (d) the heading gains " · reviewed" on "a lookback window", in green.
