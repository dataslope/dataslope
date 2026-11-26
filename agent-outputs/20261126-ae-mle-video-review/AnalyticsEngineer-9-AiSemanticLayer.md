# AnalyticsEngineer-9-AiSemanticLayer (8:35)

## Verdict
- Every fix from the first review holds on screen. The padlock now sits by the Assistant and the refused arrow, with "Private stops ref(), not queries" under the private models (element-229). The re-voiced `ready-input` and its label "Net revenue, in SQL written from the description" agree. The strict filter's "missed" now holds about 2.6 s. Customer 4's marks stay through `t2s-run`, `eval-luck` gives execution accuracy its blind spot, and the five label fixes are in place. `t2s-past` is still 4.4 words/s; the first pass left it there deliberately, because only a re-voice would slow it, and this review does not raise it again.
- The worst new defect is in Question 2's own vocabulary: the video defines the assistant's request as "a metric, dimensions, filters and a time grain", then puts "last week" in the time grain slot for 34 s. Last week is a filter on time; the grain is week. An analytics engineer interviewer would catch that at once.
- In Question 3's caution, the description already has "and test accounts" struck out when a green 440.00 appears beside it (251.6 to 254.0 s). Before that, the right column holds only "Documentation is an input" for about 8 s.
- Pacing is comfortable everywhere except one result. "Real statuses: completed, refunded, cancelled" is complete for under a second before the column clears for access.
- As answers, all six hold up against the page. The rest is polish: three code identifiers are set in the prose face.

## Findings

### 1. [P2] accuracy: "last week" is drawn as the time grain
- When: 146.7-181.0 s, beats `sem-active` to `sem-trade` (element-163.jpeg, element-179.jpeg)
- What: In `sem-job` (113.5 s) the request is drawn as four slots: metric, dimensions, filters, time grain. For the executive's question, "active users last week", `active_users` fills the metric slot and "last week" fills the **time grain** slot. The filters slot stays empty. It stays like that until the scene ends.
- Why it matters: A time grain is a granularity (day, week, month). "Last week" is a time range, so it belongs in the filters, at a grain of week. The video introduces "time grain" itself and then shows it wrong, so a viewer who copies the picture into an interview gets the semantic layer's own vocabulary wrong.
- Cause: `video/src/videos/ae-ai-semantic-layer/SemScene.tsx:218-220` (`i === 3 ? [{ text: "last week", at: weekAt }]`, with nothing for `i === 2`).
- Fix: Put "last week" in the filters slot (`i === 2`) on `weekAt`, and "week" in the time grain slot (`i === 3`) at `weekAt + 6`.

### 2. [P2] confusion: the struck description shows a green 440.00 before 1190.00 arrives
- When: 242.8-256.4 s, beats `ready-caution` and `ready-input` (element-248.jpeg; sheet-08 tile 252 s)
- What: The access diagram clears at `ready-caution` (242.7 s), and until 251.3 s the right column holds only "Documentation is an input". The strike through "and test accounts" lands at 247.1 s. At "writing its own SQL from it" (251.6 s), an arrow from that struck line, the label "Net revenue, in SQL written from the description" and a green **440.00** all ink in together. Only at "eleven hundred ninety" (254.0 s) does the 440.00 swap to a red 1190.00, with "As written, 440.00" under it.
- Why it matters: For 2.4 s the picture claims that the cut description still gives the governed 440, which contradicts the point being made. Meanwhile "documentation is now an input" goes unillustrated in a near-empty column.
- Cause: `video/src/videos/ae-ai-semantic-layer/ReadyScene.tsx:278-282`: the arrow and label are cued at `letterAt - 10` and `letterAt - 6`, and `Swap showAt={letterAt}` shows `from` (440.00) after the strike at `dropAt + 8` (`:147`).
- Fix: Draw the arrow, the label and the green 440.00 (the description as written) on "documentation is now an input" (`inputAt`). That makes the input visible while it is being named. When the strike lands (`dropAt + 8`), retire the big 440.00 into the soft "As written, 440.00" line and leave the value slot empty. Bring the red 1190.00 in on "eleven hundred ninety" (`reportsAt`), as now.

### 3. [P3] pacing: the real statuses are complete for under a second
- When: 213.5-216.0 s, beat `ready-tests` (sheet-07 tiles 214 s and 215 s)
- What: "Real statuses: completed, refunded, cancelled" finishes inking on "cancelled" (214.8 s, full at about 215.2 s). The right column clears at 216.0 s, and the three value highlights in the YAML go at 216.1 s for `ready-access`.
- Why it matters: This is the payoff of the tests item: the accepted_values test passes, so the listed statuses are the real ones. It is gone about as soon as it is complete.
- Cause: `video/src/videos/ae-ai-semantic-layer/script.ts` beat `ready-tests` (`pauseAfter: 0.6`); `ReadyScene.tsx:163` (`Clear at={accessFrom - 4}`).
- Fix: Raise `ready-tests` `pauseAfter` to 1.3, so the finished line holds about 2 s before the access diagram replaces it.

### 4. [P3] other: code identifiers set in the prose face
- When: 222.3-242.7 s, `ready-access` ("Private stops ref(),"); 375.2-396 s, `review-grain` ("No unique test on order_id"); 417.8-421 s, `review-look` ("Merged on order_id") (element-229.jpeg, element-376.jpeg, element-418.jpeg)
- What: `ref()` and `order_id` are set in Inter in three notes, beside listings that set the same names in the mono face.
- Why it matters: The house rule keeps code in the mono face at 0.92em in prose. Here the same name appears in two faces a few centimetres apart.
- Cause: `video/src/videos/ae-ai-semantic-layer/ReadyScene.tsx:252`, `ReviewScene.tsx:193`, `ReviewScene.tsx:328`.
- Fix: Wrap `ref()` and `order_id` in a mono span at 0.92em (`fontFamily: MONO`).
