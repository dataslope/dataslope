# AnalyticsEngineer-1-FactsAndGrain (705.0 s, 11:45)

Second review. The first pass (2026-11-20, 14 findings, all fixed) is in
`agent-outputs/20261120-ae-interview-video-review/`.

## Verdict
- Every fix from the first pass holds on screen. Question 8 now gives the real reason for one date table ("One calendar for every role", over `dim_date`, persistent). Question 5 qualifies "no lookup" for a versioned dimension. Question 9's touched sums stay yellow. Question 5's size comparison draws the md5 bar before "Under a third the size" and holds about 2.6 s. Page two of the rapid round keeps page one's headline and geometry. The colors, "weights", the semi-additive rule, "shared by several dimensions" and the rapid-round holds are all as fixed.
- The answers are right and stop in the right place. Every number on screen matches `results.json` and the page, and every interviewer follow-up the page implies is answered. Nothing here needs new narration.
- What the first pass missed is small. Question 10 is the one rapid answer whose evidence was not given a longer hold. Its unread line, "Approved after 7 days, funded 9 days later: the same row", is up for about 2.2 s. Question 6 strikes through two sums that are arithmetically right. Question 9's listing keeps the caption "Joined and summed" after it becomes the weighted query. Question 8's "Together, they answer across roles" leaves just as its two numbers arrive.

## Findings

### 1. [P2] pacing: Question 10's accumulating-snapshot evidence clears about 2 s after it appears
- When: 461.8-464.0 s, beat `r-types` (element-462.jpeg, element-463.jpeg; gone at element-464.jpeg)
- What: The last thing Question 10 draws is the loan row's `funded` cell (at 461.5 s) and the note "Approved after 7 days, funded 9 days later: the same row" (at 461.8 s). The narration does not read the note: it ends on "updated in place as each milestone lands" at 463.3 s, and the body clears at 464.0 s. The note's 7 and 9 days are said nowhere. Ten words of new text are up for about 2.2 s. The first pass raised the same pattern for eight other rapid answers and lengthened their pauses to 1.4 s. `r-types` kept 0.8 s.
- Why it matters: the note is the evidence for "updated in place": one row that two milestones changed. It leaves before it can be read. This is the brief's "quick-round text that leaves before it can be read".
- Cause: `video/src/videos/ae-facts-and-grain/script.ts:427` (`r-types` `pauseAfter: 0.8`). `RapidOneScene.tsx:79` cues the whole note at `milestoneAt + 12`, after the second swap.
- Fix: `pauseAfter: 1.6` on `r-types` (timing only). Ink the note's first half, "Approved after 7 days", with the approved cell (`placeAt + 8`), and its second half, "funded 9 days later: the same row", with the funded cell (`milestoneAt + 6`). The note is then up for about 4.5 s, and each half lands on its swap.

### 2. [P3] confusion: Question 6 strikes through two sums that are correct
- When: 276-296 s, beats `semi` to `nonadd` (element-276.jpeg, element-294.jpeg)
- What: "The quarter's month-ends, 1,500.00 + 1,700.00 + 1,600.00 = 4,800.00" has the 4,800.00 struck through in red on "money nobody ever had". The voice says the three "add up to forty-eight hundred". In the distinct count, "3 + 3 = 6" is struck through beside "4 people". Both sums are arithmetically right. The trap is reading a sum as a quarter's balance or as a count of people. "Money nobody ever had" in red already says that for the 4,800, and "4 people" in green says it for the 6.
- Why it matters: this is the series' recurring "correct statement struck through". The strike says the arithmetic is wrong, and it crosses out the very number the narration is saying.
- Cause: `AdditiveScene.tsx:223` (`strikeAt={nobodyAt + 4}` on the month-ends Verdict) and `AdditiveScene.tsx:278-282` (`<Strike>` around `3 + 3 = 6`).
- Fix: Drop the `strikeAt`, so 4,800.00 stays red, unstruck, with "Money nobody ever had" under it. Replace the struck "3 + 3 = 6" with an unstruck red "not 3 + 3 = 6". The row then reads "Both … 4 people, not 3 + 3 = 6", which is true as written.

### 3. [P3] confusion: Question 9's listing keeps the caption "Joined and summed" after it becomes the weighted query
- When: 421.3-429.3 s, beat `bridge-weight` (element-428.jpeg)
- What: On "Multiply by the weight first", the listing changes from `SUM(f.amount)` to `SUM(f.amount * b.weight_factor)`, with the multiplication in green. Its caption still reads "Joined and summed". That is also the label of the red "Joined and summed 11,505.00" two lines to its right. The green query sits under the name of the red result.
- Why it matters: the caption pairs the corrected query with the wrong total. A viewer matching labels reads the weighted query as the one that gave 11,505.00.
- Cause: `BridgeScene.tsx:186-188` (one `Caption` from `joinAt` to `lowOut`, while the listing under it swaps at `multAt + 2`, `:189-197`).
- Fix: End the caption at `multAt + 2` and put a second caption, "Weighted first, then summed", on the weighted listing from `multAt + 2` to `lowOut`. It matches the green verdict's label "Weighted first".

### 4. [P3] pacing: Question 8's "Together, they answer across roles" leaves as its two numbers arrive
- When: 367.4-371.3 s, beat `role-span` (element-370.jpeg against element-375.jpeg)
- What: Under order 101's table, "Together, they answer across roles" inks in on "Together" and turns green on "what no single role can" (369.2 s). It fades at `tookAt - 2` (371.3 s), and "Order to delivery, on average 6.7 days" and "At most 9 days" appear below the empty line. The green "across roles" is up for about 2 s. The finished page shows the two numbers without the line that says why they are there.
- Why it matters: the line is the point of the beat (the roles together answer what no single one can). It goes just as the evidence for it arrives.
- Cause: `RoleScene.tsx:189` (`out={tookAt - 2}` on the note).
- Fix: Drop the `out`, so the line stays as a heading over the two verdicts. It sits at `rowTop(1) + h(16)` and the first verdict at `+ h(60)`, about 27 px of clear space, which is the README's spacing between rows of text.
