# AnalyticsEngineer-1-FactsAndGrain (674.7 s, 11:15)

## Verdict
- A solid, careful video. Every number on screen checks out against `results.json` and the page: the 15.00 fee and its 2.46 + 0.69 + 1.85 split, Electronics 1,345.74 to Books 137.75, md5 of 42, the 2.26 MB and 7.82 MB indexes (0.29, "under a third"), 1,600.00 and 4,800.00, 60/30/14 percent, 6.7 and 9 days, 4,900.00 and 11,505.00 with every per-promotion row summing to both, 11 rows and 3 products, 366 days, 1,400.00 and 2,400.00. No overlaps, no clipping, no text under 19px, and no scene clears to an empty page while the narrator talks.
- Two answers stop at the wrong place. Question 8 gives a non-reason for keeping one date table ("Kept once, it answers what no single role can: order to delivery…"), which any three date keys would answer. Question 5 says a hashed natural key needs no lookup, one question after Question 4 gave customer 42 two versions that `md5(42)` cannot tell apart; "how do hash keys work with SCD Type 2?" is the follow-up an interviewer asks next.
- One color contradicts the narration. Question 9's per-promotion "touched" sums turn red while the voice says they "still answer one question".
- Pacing is comfortable in the worked questions (2.3 to 3.0 words/s, gaps 0.55 s or more). The quick round is where it hurts: most answers' last line, often the evidence or the unread note, lands 1.5 to 2 s before it clears. In Question 5 the "under a third" verdict appears before the bar it compares, and the comparison clears 1.7 s after it is complete.
- The rest is polish: page two of the rapid round drops its headline and the list jumps up; a few colors against their meanings; "weighs" for "weights"; semi-additive is the one kind without its rule; "or genuinely shared" is never explained.

## Findings

### 1. [P2] answer: Question 8's reason for one date table is a non sequitur
- When: 349.2-357.4 s, beat `role-why` (element-351.jpeg, element-355.jpeg)
- What: "Kept once, it answers what no single role can: order to delivery took six point seven days on average, nine at most." On screen, "Kept once, it answers across roles", then the 6.7 and 9-day verdicts. Order to delivery needs two date keys on the fact. It would come out the same from three separate date tables, so it says nothing about why the dimension is kept once. The real reason is that one table is one calendar: every role gets the same attributes (holidays, fiscal periods), maintained in one place and conformed across roles.
- Why it matters: "why not three date tables?" is the follow-up, and a viewer would answer it with the wrong reason.
- Cause: `video/src/videos/ae-facts-and-grain/script.ts:362` (beat `role-why`), drawn at `RoleScene.tsx:179-183`.
- Fix: Replace `role-why` with two beats. `role-why`: "One table means one calendar: every role reads the same holidays and fiscal periods." `role-span`: "Together, the roles answer what no single role can: order to delivery took six point seven days on average, nine at most." On screen, add "One calendar for every role" under "One physical table, three roles" (persistent). Make the bottom note "Together, they answer across roles", cued to `role-span`. Move `tookAt`/`mostAt` to `role-span`.

### 2. [P2] answer: "no lookup" for a hash key is true only while the dimension has one row per customer
- When: 179.6-198.2 s, beat `hash` (element-197.jpeg), against 152.4-178.0 s, beats `sk-versions`/`sk-why` (element-178.jpeg)
- What: Question 4 shows customer 42 as two versions, 1001 and 1002, and says "each load can look up which surrogate a new fact gets". Question 5 then says "The MD5 of forty-two is the same string … so a fact can compute it without a lookup", with "A fact computes its key: no lookup" in green. For the versioned `dim_customer` just shown, `md5(42)` gives both versions the same key. A fact still needs the as-of lookup to find its version. dbt's own snapshots hash the key together with the version's timestamp.
- Why it matters: a viewer who applies the green line to the SCD Type 2 table they just saw builds a dimension with duplicate keys. "How do hash keys work with SCD Type 2?" is the obvious follow-up.
- Cause: `script.ts:292` (beat `hash`), `HashScene.tsx:160-162`.
- Fix: Add a beat `hash-versions` after `hash`: "With versions, hash the ID together with the version's start date, and a fact still finds its version by date." Under the green line, at `sameTop + 3*h(46) + h(62)`, add "With versions: hash `customer_id` with `valid_from`, found by date" (ink, 24px). It clears with the left column on `leftOut`.

### 3. [P2] confusion: the "touched" sums turn red while the narration says they are a valid answer
- When: 410.5-419 s, beat `bridge-touched` (element-418.jpeg)
- What: "The unweighted sums still answer one question, how much revenue each promotion touched. Just never total them." The six touched values are lit yellow and then, on "never total them", every one turns red. Red is the trap or wrong answer. The values are correct, and only their total is the trap, which "never add these" in red already says.
- Why it matters: the screen contradicts the voice on which numbers are wrong.
- Cause: `BridgeScene.tsx:220` (the `MARK_BAD` swap on the touched column at `neverAt + 2`).
- Fix: Drop that line, so the touched column stays yellow (pointed at). Keep the red "never add these" note and the green allocated column.

### 4. [P2] confusion: "Under a third the size" appears before the bar it compares, and the comparison is gone 1.7 s after it is complete
- When: 201-207 s, beat `hash-size` (element-204.jpeg, element-206.jpeg)
- What: The integer index bar (2.3 MB) appears at 201 s. "Under a third the size" appears at 203.2 s, on the words "under a third". The md5 bar (7.8 MB) it is compared with only starts at 204.6 s, on "the same number of hashes", and the whole right side clears at 207.0 s on `hash-trap`. The finished comparison is on screen for about 1.7 s.
- Why it matters: the verdict lands before its evidence, and the evidence is gone before it can be read.
- Cause: `HashScene.tsx:193` (md5 bar at `hashesAt`) and `:199` (note at `thirdAt`); `script.ts:298` (`hash-size` `pauseAfter: 0.6`).
- Fix: Draw the md5 bar at `thirdAt - 2` and the note at `hashesAt + 6`. Raise `hash-size` `pauseAfter` to 1.4 (timing only).

### 5. [P2] pacing: the quick round clears most answers 1.5 to 2 s after their last line lands
- When: `r-periodic` 458.3 to 460.3 s ("His February balance, still a row 500.00"). `r-degen` 488.6 to 490.9 s (the grouped result table, element-489.jpeg). `r-date` 525.1 to 527.1 s ("fiscal_year, fiscal_quarter", element-526.jpeg). `r-confirmed` 548.9 to 550.8 s ("Not a dimensional modeling term", unread). `r-drill` 567.9 to 570.0 s (the full-outer-join box and "Joined row to row first, the facts would multiply", element-569.jpeg). `r-agg` 590.8 to 593.2 s ("The fact keeps every order"). `r-bank` 610.6 to 612.1 s ("The bank's own total, again"). `r-3nf` 636.4 to 638.7 s. On each page's last answer (`r-conformed`, `r-kimball`) the body fades about 0.6 s before the scene cut, leaving the right half empty at 538 s and 660.6 s.
- Why it matters: in a round of one-sentence answers, the evidence is the last thing drawn, and it leaves about as soon as it is complete. That is the "result shown for about a second" pattern.
- Cause: `script.ts:413-461`, every rapid beat at `pauseAfter: 0.8`. RapidFire clears a body at the next beat minus 2 frames (`editorial/interview.tsx:197`). `RapidOneScene.tsx:378` and `RapidTwoScene.tsx:402` end the last body at `to + 30`, about 16 frames before the cross-fade.
- Fix: `pauseAfter: 1.4` on `r-periodic`, `r-degen`, `r-date`, `r-confirmed`, `r-drill`, `r-agg` (or its last beat), `r-bank` and `r-3nf` (timing only, about 5 s in all). End both pages at `to + 44` so the last body holds until the cross-fade.

### 6. [P3] spacing: page two of the rapid round drops the headline, and the list jumps up 50px
- When: 538.6-661 s, scene `r-confirmed` (element-549.jpeg, element-578.jpeg)
- What: Page one has the kicker, the headline "Thirteen quick ones, a sentence or two each." and the list at y=300. At the cut, page two keeps the kicker, loses the headline, and starts the list at y=250, so every row shifts up. For two minutes, the band between the kicker and the list is empty and so is the bottom quarter of the frame. The Backend series' page two (`be-algorithms/RapidTwoScene.tsx:801`) keeps a headline.
- Why it matters: the jump at the page turn and the top-heavy layout read as a layout slip.
- Cause: `RapidTwoScene.tsx:17-18` (`LIST_TOP = 250`, `BODY_TOP = 270`) and no `Headline` at `:431`.
- Fix: Set `LIST_TOP = 300` and `BODY_TOP = 300`. Add page one's headline, already inked at the cut (`at`/`turnAt` before `from - 8`), so the cross-fade changes only the rows.

### 7. [P3] pacing: Question 19's answer panel is empty while the grain is defined
- When: 575.8-579.3 s, beat `r-agg` (element-578.jpeg)
- What: Through "The grain is the finest detail a fact stores", the right side shows only "fact_orders: 24 rows". The 24 squares pop in on "one row per order", at 579.3 s. The panel was empty from 570 s; tiles.txt shows a 9 s hold at 571.
- Why it matters: the definition is spoken over an empty panel, and the figure arrives late.
- Cause: `RapidTwoScene.tsx:153` (squares at `orderAt`).
- Fix: Pop the squares from `grainAt` (`grainAt + Math.floor(i / 2)`), and keep "Grain: one row per order" on `orderAt + 6`.

### 8. [P3] answer: Question 19 stops before why the distinction matters
- When: 570.1-592.5 s, beat `r-agg`
- What: The answer defines both terms. The page's answer ends with the stakes: "Confusing the two leads to double-counting when joining at the wrong level." The video never says it.
- Why it matters: "why does it matter?" is the follow-up to a definitional question.
- Cause: `script.ts:454`.
- Fix: Add a beat `r-agg-why`: "Join the mart back to the orders, and each category's total is counted once per order." On screen, add a red note under "Its own grain: one row per category": "Joined back to the orders: each total counted once per order".

### 9. [P3] explanation: semi-additive is the one kind with no rule under its name
- When: 253-286 s, beats `semi` to `nonadd` (element-285.jpeg)
- What: "Additive revenue" carries "Sums across every dimension" and "Non-additive" carries "Sums across nothing". "Semi-additive a balance" carries nothing. Its rule (across accounts, not across time) is spread over the right-hand panel, which is the one definition the question asks for.
- Why it matters: the three-way comparison is incomplete at the point where it is most specific.
- Cause: `AdditiveScene.tsx:168` (no `note` on the middle `Kind`).
- Fix: Give it `note={… "Sums across accounts, not time"}` in ink, at `noteAt={timeAt}`.

### 10. [P3] other: "A ratio of sums weighs each order by its revenue"
- When: 311-323.5 s, beat `ratio-fix` (element-324.jpeg)
- What: The narration and the green on-screen line say "weighs". The term is "weights": a ratio of sums is a revenue-weighted average.
- Why it matters: a small slip in the sentence that states the principle.
- Cause: `script.ts:344`, `RatioScene.tsx:136`.
- Fix: Split `ratio-fix` at its sentence breaks into `ratio-fix`, `ratio-weight` and `ratio-forgot`. Re-voice only `ratio-weight` as "A ratio of sums weights each order by its revenue." (50 characters) and change the line on screen to match.

### 11. [P3] pacing: "Rows one read has and the other lacks: 0" is up for 1.4 s
- When: 121.6-123.0 s, beat `snow` (element-122.jpeg)
- What: The note proving that the star and snowflake reads agree appears at 121.6 s and fades out at 123.0 s, before "Default: a star".
- Why it matters: this is the evidence behind "the same six rows come back", and it is gone before it can be read.
- Cause: `StarScene.tsx:203` (`out={defaultAt - 4}`, placed where the verdict goes).
- Fix: Move it to the caption line, `y = rg.top - h(40)`, `x = rg.right + 40` (clear of both listings), and drop `out`.

### 12. [P3] explanation: "or genuinely shared" is never explained
- When: 132-137 s, beat `star-pick` (element-136.jpeg)
- What: "Snowflake a dimension only when it's huge, or genuinely shared." Shared by what? The intended case is a sub-dimension used by several dimensions, such as one geography table under both customer and store.
- Why it matters: half of the exception is left to guesswork.
- Cause: `StarScene.tsx:226-229`.
- Fix: Change the on-screen line to "Snowflake: only when huge, or shared by several dimensions" (still on `sharedAt`; it fits by x≈1290).

### 13. [P3] confusion: colors against their meanings
- When: 17-24 s, beat `plan` (element-024.jpeg). 650-661 s, beat `r-kimball` (element-660.jpeg). 662-674 s, beat `next` (element-672.jpeg).
- What: In the plan, "13 quick ones" is green beside a blue "9", a count marked as a right answer. In Question 22, Kimball's "Value comes fast" is green while Inmon's "More consistent" is ink, so one side of a trade-off reads as the right answer. In the closing, "except one" is data blue on a phrase.
- Why it matters: one meaning per color is the series' rule, and a green-on-Kimball reads as a verdict that the page does not give.
- Cause: `HookScene.tsx:137`, `RapidTwoScene.tsx:357`, `ClosingScene.tsx:51`.
- Fix: "13" in `BLUE_INK`. "Value comes fast" in ink at the same weight as "More consistent". "except one" in ink, weight 500.

### 14. [P3] pacing: two remedies at 3.57 words/s, then 0.6 s to the next idea
- When: 85.3-91.2 s, beat `grain-fix` (element-091.jpeg)
- What: "Move it to a fact at order grain, or split it across the lines so the shares add back to five." This builds a second table and a three-way split in 5.9 s, then "Nothing errors" follows after 0.6 s.
- Why it matters: the split's sum (2.46 + 0.69 + 1.85 = 5.00) lands as the next idea starts.
- Cause: `script.ts:244` (`pauseAfter: 0.6`).
- Fix: `pauseAfter: 1.0` (timing only).
