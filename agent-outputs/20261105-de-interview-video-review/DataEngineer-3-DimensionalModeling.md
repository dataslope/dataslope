# DataEngineer-3-DimensionalModeling (8:48)

## Verdict
- A solid, accurate video. Every number checks out against `results.json` and the page: 15.00 for a 5.00 fee, 690 against 270, 1,600 and 4,800, 7 and 9 days, the fiscal-quarter revenues, 186.04 and 163.44. The ERD figures build on their cues and nothing overlaps or clips. Text stays at or above 19px, and every question card is read as written.
- The biggest problems are what the figures say through color and position, not the numbers. In Question 9, "pick by the question:" heads a line that is not one of the picks. In Question 6, red marks the star's deliberate break of third normal form and green marks snowflaking, which reverses the video's own Question 2 verdict. The closing bridge says no answer dealt with a changing dimension, though Question 8 did, with the same Boston to Austin example.
- The answers are correct as definitions. Two stop one step before the obvious follow-up: Question 5 never says why a warehouse can afford denormalized copies, and Question 10 gives a ratio remedy for a distinct-count example. Smaller gaps: allocating a header-level fee, the cost of a surrogate-key lookup, normal forms building on each other, and naming the semantic layer.
- The pacing is comfortable: 1.9 to 3.0 words/s, gaps of 0.55 to 1.0 s inside scenes, and every finished scene held about 1.9 s before its cut. The page sits nearly empty in only three short stretches (Questions 1, 3 and 7). Only two definition beats run just over 3 words/s.

## Findings

### 1. [P2] confusion: "pick by the question:" heads a line that is not one of the picks
- When: 352.9-366 s, beats `accum`, `types-pick` (frame element-365.jpeg)
- What: At "The row is updated" (352.9 s), a blue note "updated in place, stage by stage" appears to the right of the loan row. At "Pick by the question" (359.3 s), a gray label "pick by the question:" appears directly above it, and "how long each step took" lands under it. The finished frame reads as a list headed "pick by the question:" whose first item is "updated in place, stage by stage". The other two picks ("what happened", "where things stood") sit far away, beside their own tables.
- Why it matters: the viewer has just been told there are three questions to pick by, and the list shows a property of the accumulating snapshot as one of them.
- Cause: `video/src/videos/de-dimensional-modeling/TypesScene.tsx:205` puts the label at `ag.right + 40`, `ag.rowTop(0) - h(56)`. That is the same column as the `updatedAt` note at `:197` (`ag.rowTop(0) + 8`) and the `longAt` note at `:202`.
- Fix: delete the label at `:205-207`, because each green pick already sits beside its table. Or give the blue note `out={pickAt}` and move the label to `ag.rowTop(0) + 8`, so that only "how long each step took" follows it.

### 2. [P2] confusion: Question 6 colors the rule and the star's deliberate choice as the trap, and snowflaking as the answer
- When: 219.1-241 s, beats `nf-3`, `nf-star` (frame element-240.jpeg)
- What: The label "Third normal form, 3NF" and the underline of "Nothing but the key." are red, while 1NF and 2NF are blue. In the star's `dim_product`, the `department` row turns red, "not 3NF, on purpose" is red, and "Snowflaking puts it back." is bold green. Question 2 closed 150 s earlier on a green "The default: a star.", and the narration here says the break is "on purpose".
- Why it matters: the series uses red for the trap and green for the right answer. Read that way, this frame calls the star's denormalization the mistake and snowflaking the fix, the opposite of the answer to Question 2.
- Cause: `NfScene.tsx:177` passes `ACCENT_INK` as the third form's color. `:205` marks `department` with tone `"warn"`. `:214` sets "not 3NF, on purpose" in `ACCENT_INK`, and `:218` sets "Snowflaking puts it back." in `OK_INK`.
- Fix: at `:177`, use `BLUE_INK` like the other two forms. At `:205`, use tone `"note"` (yellow: what the narration points at). Set "on purpose" in `INK`. Set "Snowflaking puts it back." in `INK_SOFT` and append ", at the cost of joins", so that neither choice reads as the verdict.

### 3. [P2] answer: the non-additive remedy fits ratios, but the worked example is a distinct count
- When: 400.0-413.4 s, beat `nonadd` (frame element-413.jpeg)
- What: The figure works through a distinct count: 3 users on Monday and 3 on Tuesday are 4 people. Then the green verdict appears: "Store the parts; compute the ratio in the query." No ratio is shown, and storing "parts" does not rescue a distinct count, because two daily counts cannot be combined into a two-day count at all.
- Why it matters: "so how do you get weekly unique users?" is the next thing an interviewer asks, and the only advice given does not answer it.
- Cause: `script.ts:299` and `AdditiveScene.tsx:220-226` carry only the page's remedy for ratios.
- Fix: narration: "...are four people, not six. So count distinct users from the detail rows for each period you report, and for a ratio, store its two parts and divide in the query." Show two verdict lines, one under each example: "distinct counts: recount from the detail rows" and "ratios: store the parts, divide in the query".

### 4. [P2] answer: Question 5 recommends denormalizing the warehouse straight after showing the anomaly, without saying why the warehouse can afford it
- When: 176.4-197.9 s, beats `denorm`, `norm-where` (frame element-198.jpeg)
- What: The scene builds to "Ada now has two emails." in red, then concludes "Denormalize: reads dominate, like a warehouse." Nothing says why the warehouse does not end up with Ada's two emails.
- Why it matters: "then doesn't your warehouse get update anomalies?" is the obvious follow-up. The answer is that the copies are written in bulk by one load from the normalized source, and nobody edits a row by hand. That answer is what makes the recommendation hold up.
- Cause: `script.ts:188` stops at the rule. `NormScene.tsx:166-172` shows only the rule.
- Fix: append to `norm-where`: "A warehouse can afford the copies because one pipeline rebuilds them from the normalized source; nobody edits a row by hand." Add a third line under "like a warehouse" at `warehouseAt + 20`: "copies rebuilt by the load, not edited".

### 5. [P2] other: the bridge says no answer dealt with a changing dimension, but Question 8 did
- When: 514.3-524.9 s, beat `next` (frame element-526.jpeg)
- What: The narration says "Every answer here treated a dimension as fixed. But customers move...", with "Customers move Boston → Austin" on screen. Question 8 (306.4-327.3 s) already showed customer 42 moving from Boston to Austin as two rows, 1001 and 1087, and named that "a slowly changing dimension".
- Why it matters: a viewer who watched Question 8 hears a claim that the video disproved three minutes earlier, with the same example.
- Cause: `script.ts:337`; `RapidScene.tsx:449-454`.
- Fix: "Most answers here treated a dimension as fixed. Question eight's two rows for customer forty-two were the exception, and keeping history like that is the next video." On screen at `:449`: "Most answers treated a dimension as fixed." At `:453`: "Question 8's two rows for customer 42 were the start."

### 6. [P3] confusion: the page waits while the narrator defines a term
- When: 95.6-102.9 s `grain`; 248.9-253.3 s `oltp` (frame element-251.jpeg); 38.9-42.8 s `dims` (frame element-040.jpeg)
- What: In Question 3, the narration says "The grain is what one row means", but for 7 s the screen shows only "Grain: one row per order line / declared first". The definition never appears. In Question 7, the word "OLTP" sits alone under the card for 4.4 s while the narrator expands it. The expansion appears at "runs the app" (252.1 s), 2 s after "online transaction processing" is said (250.1 s). In Question 1, "The dimension tables hold the context you filter and group by" plays over an unchanged fact table for 3.9 s, and that definition is never written.
- Why it matters: in each case the screen is nearly empty at the moment a viewer most needs the definition to look back at.
- Cause: `GrainScene.tsx:95-100`; `OltpScene.tsx:204` (`subAt={appAt}`); `StarScene.tsx:254-257` (the first dimension appears at "the date").
- Fix: at `GrainScene.tsx:95`, add a first line "grain = what one row means" at `meansAt` and move "Grain: one row per order line" below it at `lineAt`. At `OltpScene.tsx:204`, use `subAt={oltpAt + 10}`. In `StarScene.tsx`, add a Note at `contextAt`, right of the fact table: "dimensions: the context you filter and group by".

### 7. [P3] spacing: "App databases: third normal form" leaves "form" alone on a line
- When: 228.5-241 s, beat `nf-star` (frame element-240.jpeg)
- What: The green phrase wraps after "normal", so "form" sits alone under "third normal".
- Why it matters: it is a one-word orphan, the defect the series has removed from question cards.
- Cause: `NfScene.tsx:194` sets `width={360}` for a 24px line that needs about 400px.
- Fix: `width={420}`, or break after the colon: `App databases:<br />third normal form`.

### 8. [P3] confusion: the non-additive verdict sits under the semi-additive table, and "not 6" strikes a number it already negates
- When: 401.9-413.4 s, beat `nonadd` (frame element-413.jpeg)
- What: "ratios and distinct counts don't sum" and "Store the parts; ..." appear in the left column under `fact_balance`, the balance example, while the Monday/Tuesday demo is on the right. "not 6" also draws a red strike through the 6, which makes a double negative.
- Why it matters: the verdict reads as a comment on the balance table, and a struck number after "not" reads as "not (not 6)".
- Cause: `AdditiveScene.tsx:217-226` (`x={X0}`, under `bg`); `:214` (`not <Strike>`).
- Fix: move both notes to `x={R_X}` at `y(732) + 3 * h(54) + h(20)`, under the "both" row. Render "not 6" without `Strike`.

### 9. [P3] answer: the normal forms are given without "non-key" and without each one building on the last
- When: 209.8-227.8 s, beats `nf-2`, `nf-3`
- What: The narration says "Second: every column depends on the whole key" and "Third: nothing but the key". The page says "1NF plus every non-key column depends on the entire primary key (relevant when the key is composite)" and "2NF plus no non-key column depends on another non-key column".
- Why it matters: "is a 3NF table always in 2NF?" and "when can 2NF fail?" are the standard follow-ups.
- Cause: `script.ts:202`, `:207`.
- Fix: `nf-2`: "Second: first, plus every non-key column depends on the whole key, which only matters when the key has two columns." `nf-3`: "Third: second, plus nothing but the key."

### 10. [P3] answer: the grain answer gives one home for the shipping fee and not the other
- When: 118.0-124.6 s, beat `grain-fix` (frame element-125.jpeg)
- What: The fee moves to an order-grain fact. The other standard treatment, allocating the 5.00 across the three lines (for example by amount) so that it sums correctly by product, is not mentioned.
- Why it matters: "what if finance wants shipping cost by product?" is the usual next question.
- Cause: `script.ts:152`.
- Fix: append: "Or, if it's needed by product, split it across the lines so that they add back to five."

### 11. [P3] answer: the surrogate key answer leaves out its cost
- When: 298.5-320.6 s, beats `surrogate`, `versions` (frame element-327.jpeg)
- What: `customer_id` is kept and tagged "natural" in `dim_customer`, but the video never says why. Each load has to look up an incoming natural key, and for the Type 2 versions its date, to find the surrogate key a new fact should carry.
- Why it matters: "how does a new order get the right key?" follows directly from "each order points at the version that was true when it was placed".
- Cause: `script.ts:243-248`.
- Fix: add to `versions`: "The natural key stays as a column, so each load can look up which surrogate a new order should point at."

### 12. [P3] explanation: the 4,800 has no visible derivation
- When: 385.8-392.6 s, beat `semi`
- What: All six balance cells turn red and the struck 4,800 appears. The three month-end totals that make it up (1,500, 1,700, 1,600) are never shown. A viewer who adds up Ada's column gets 3,100.
- Why it matters: it is the number the whole semi-additive argument rests on.
- Cause: `AdditiveScene.tsx:165` (marks every row), `:170` (shows only the total).
- Fix: label the verdict "1,500 + 1,700 + 1,600 =" before the struck 4,800.00, or bracket the three month pairs in the table with their totals.

### 13. [P3] explanation: the date-dimension example's fiscal quarters are just calendar quarters
- When: 472.5-489.8 s, beat `r-date` (frame element-489.jpeg)
- What: The page's `dim_date` puts January to March in Q1, April to June in Q2, and so on, so `QUARTER(order_date)` would group these rows identically. Only the holiday flag actually needs the table. The narration says "revenue by fiscal quarter without holidays is one join and no date math", which implies both did.
- Why it matters: an interviewer can point out that this query never needed the table for its quarters.
- Cause: `script.ts:327`; `RapidScene.tsx:306`.
- Fix: narration: "...is one join and no date math: no function knows which days were holidays, or where a fiscal year starts." Add a note under the result: "holidays: no date function computes these".

### 14. [P3] confusion: the bus matrix highlights two shared dimensions when there are three
- When: 468.7-472 s, beat `r-bus` (frame element-471.jpeg)
- What: On "The shared dimensions let two marts be combined", the Date and Product columns light up for Sales and Inventory, but Store is ticked for both rows too.
- Why it matters: a careful viewer will wonder what disqualifies Store.
- Cause: `RapidScene.tsx:180` (`const shared = ["Date", "Product"]`).
- Fix: `["Date", "Product", "Store"]`.

### 15. [P3] confusion: green and blue used off their meanings
- When: 274.4-283 s `olap` and `oltp-move` (frame element-282.jpeg); 228.5-241 s `nf-star`
- What: Question 7 draws the appended fact rows as green lines and "mostly appended to" in green, although neither is a right answer. "third normal form" is green in Question 6 and blue in Question 7.
- Why it matters: it dilutes "green = the right answer", which Question 6 (finding 2) already strains.
- Cause: `OltpScene.tsx:115` (`stroke={fresh ? OK : BAR}`), `:253` (`OK_INK`); `NfScene.tsx:196` (`OK_INK`) against `OltpScene.tsx:221` (`BLUE_INK`).
- Fix: draw appended lines in `BAR` at full opacity and 3px, set "mostly appended to" in bold `INK`, and use `BLUE_INK` at `NfScene.tsx:196`.

### 16. [P3] other: Question 5's on-screen wording collides with the rest of the video
- When: 170-190 s, beats `norm`, `denorm` (frame element-198.jpeg)
- What: "each fact stored once" appears under "Normalized" in a video that has just defined fact tables, so "fact" reads as a fact row. The update is printed as `UPDATE … SET email = ...`, but the table's column is `customer_email`.
- Why it matters: both are small stumbles for a careful viewer, and the second is code that would not run against the table shown.
- Cause: `NormScene.tsx:88` and `script.ts:178` ("stores each fact once"); `NormScene.tsx:63` (`.replace("customer_email", "email")`).
- Fix: "each piece of data stored once" (and "stores each piece of data once" in the narration). Drop the `customer_email` replace.

### 17. [P3] confusion: the narrow model's crow's feet say one customer has many cities and many plans
- When: 445-454 s, beat `r-wide` (frame element-453.jpeg)
- What: `customers` joins to `customer_city` and `customer_plan` with zero-or-many ends. That reads as a customer having several cities and plans at once, not one attribute moved into its own table.
- Why it matters: the figure is meant to show the same attributes as the wide row, only split.
- Cause: `RapidScene.tsx:141-142` (`to="zero-or-many"`).
- Fix: `to="zero-or-one"` (or `"exactly-one"`) on both relations.

### 18. [P3] pacing: two definition beats run just over 3 words/s with short gaps
- When: 298.5-305.8 s `surrogate` (3.01 w/s, 0.6 s on either side); 339.2-345.2 s `periodic` (3.02 w/s, 0.55 s on either side, between two other definitions)
- What: each beat introduces a new term, and the next definition follows in about half a second. Question 9 delivers its three fact-table types in 30 s.
- Why it matters: these are the lines a viewer will repeat to an interviewer, and they get the least room to land.
- Cause: `script.ts:239`, `:244`, `:262`, `:267` (`pauseAfter` 0.5 to 0.6).
- Fix: `pauseAfter: 0.8` on `keys`, `surrogate`, `types` and `periodic`.

### 19. [P3] answer: "one shared place" for metric definitions is never named
- When: 490.4-513.1 s, beat `r-metric`
- What: "Define each metric once, in one shared place." The page says that metrics live in the semantic or BI layer, or in documented SQL.
- Why it matters: "where would you define it?" is the follow-up, and "a semantic layer" is the expected answer.
- Cause: `script.ts:332`; `RapidScene.tsx:397`.
- Fix: "Define each metric once, in a semantic layer every dashboard reads." On screen: "Define each metric once, in the semantic layer."
