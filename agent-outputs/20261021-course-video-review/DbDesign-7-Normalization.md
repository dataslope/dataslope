# DbDesign-7-Normalization (0-273.4 s, whole video)

## Verdict
- A well-built argument that follows the unit's five lessons closely. Every table, tag and error is real PGlite output, figure numbering runs cleanly from Fig. 1 to Fig. 11, and the narration is mostly a comfortable 2.4-3.3 w/s.
- One factual slip a listener will hear: Drew says "five five five, two thousand" while the screen searches for 555-2200.
- The recurring weakness is that each demonstration's payoff is flashed. Postgres errors and the "one row" results arrive in the last second of a beat and are faded or cut 1-1.5 s later: the unique-constraint error, the fourth-phone error, Home's three tags, UPDATE 2, and Fig. 9.
- Between those payoffs the layout has the opposite problem. The page sits empty for 5 s under "Fig. 2", and the right half of the frame is blank for about 25 s in 2NF and 18 s in 3NF while the table is squeezed into the left half.
- The 3NF dependency drawing is split above and below the table, and its "fact about the customer" note sits under the wrong arrow.

## Findings

### 1. [P1] accuracy: Narration says 555-2000, the screen searches for 555-2200
- When: 80.3-86.2 s, beat `search` (element-163.jpeg, element-170.jpeg)
- What: Drew says "Ask who has five five five, two thousand..." (alignment.json confirms it was voiced as "two thousand"). The listing on screen reads `WHERE phones = '555-2200'` and the note says "555-2200 is in Ada's cell, inside one string". A listener hears a search for a number that appears nowhere on screen.
- Why it matters: the number spoken and the number shown disagree, right at the point where the demonstration's logic depends on that exact value.
- Cause: `video/src/videos/db-normalization/script.ts:135` (beat text). The SQL comes from results.json `listSearch`.
- Fix: change the line to "Ask who has five five five, twenty-two hundred..." and re-voice `search` only. All three cue words ("five five five", "nobody", "buried") survive the change.

### 2. [P1] pacing: Both 1NF errors are on screen for about a second
- When: 106.5-108.2 s, beat `plain` (element-213.jpeg, element-215.jpeg, element-216.jpeg); 92.4-93.9 s, beat `columns` (element-184.jpeg, element-186.jpeg)
- What: The 23505 box (5 lines, about 25 words) inks in on "twice" at 106.5 s. The whole right column (listing, "Ada" reply, error) fades out on `depend-in` at 107.7 s, and that half of the frame then stays empty until 110.5 s. The 42601 box ("INSERT has more expressions than target columns") inks in at 92.4 s, after the beat's last word "fit", and the scene cuts at 93.7 s.
- Why it matters: each box is the evidence for its spoken claim ("a unique constraint stops Ada's number going in twice", "a fourth number won't fit"), and neither can be read in that time.
- Cause: `ChildScene.tsx:167` (`<Fade out={dependFrom}>` wraps the ErrorBox at :182-189, which is cued `at={twiceAt - 2}`); `CellScene.tsx:202` (`at={fitAt + 2}`), with the cut set in `Video.tsx:55-58`.
- Fix:
  - ChildScene: change the Fade's `out` to `n.word("depend-in", "depend")` (about 110.4 s). Move the "Every cell holds one value" note (:191) to sit below the error box, at about `y(BODY_Y) + listH + 260`. Raise `plain` pauseAfter from 0.6 to 1.2.
  - CellScene: cue the ErrorBox at `fourthAt + 4` (about 91.5 s), together with the struck-out number. Set `columns` pauseAfter to 2.2 so the finished figure holds for at least 2 s.

### 3. [P2] pacing: The "one row" payoffs of the cure, 2NF and 3NF are cleared within 1-1.5 s
- When:
  - 60.8-65.9 s, beats `once` → `join` (element-128.jpeg, element-129.jpeg, element-131.jpeg). UPDATE 1 appears at 60.8 s, INSERT 0 1 at 61.7 s, and Grace's order is struck at 63.4 s and collapsed by 64.6 s. All three data tables fade on "wide view" at 65.6 s, so the finished three-result state lasts about 1 s.
  - 138.9-140.6 s, beats `partial` → `move` (element-279.jpeg, element-281.jpeg). "UPDATE 2 / one name, 2 rows" is up for about 1.3 s before Fig. 6 slides out. The UPDATE 1 that answers it arrives on a different figure 4 s later, so the two tags are never on screen together.
  - 172.8-177.8 s, beat `extract` (element-348.jpeg, element-354.jpeg). The whole of Fig. 9 (2 entities, a relation, a 3-line listing, a tag and a note) builds in 3.7 s and holds for 1.6 s.
- Why it matters: "one row instead of many" is the unit's whole point, and the contrast passes faster than a viewer can compare the two states.
- Cause: `HomeScene.tsx:157` (`<Fade out={wideAt}>`) with `script.ts:119-122` (`once` pauseAfter 0.45); `PairScene.tsx:149` (`Fade out={moveFrom}`) with `script.ts:170-174` (`partial` pauseAfter 0.5); `ChainScene.tsx:213-243` with `script.ts:198` (`extract` pauseAfter 0.6).
- Fix:
  - Set `once` pauseAfter to 1.2 and `partial` pauseAfter to 1.2.
  - In PairScene, carry the bad table's `UPDATE 2` into Fig. 7 next to the new `UPDATE 1` (under the listing, `:254`), labelled "before".
  - Set `extract` pauseAfter to 2.4.

### 4. [P2] confusion: 3NF's chain is drawn in two halves, and its note sits under the wrong arrow
- When: 157.8-172.6 s, beats `chain` → `moves` (element-330.jpeg, element-344.jpeg)
- What:
  - The order_id → customer_id leg is drawn *below* the table. Directly under it sits "customer_city is a fact about the customer", which appeared at 158 s, before the arrow existed. The note therefore reads as the caption of order_id → customer_id.
  - The customer_id → city leg, plus an unnarrated customer_id → customer_name arrow, leave from two dots 28 px apart *above* the table.
  - "a transitive dependency" labels only the second leg.
  - "the key" over order_id has no bracket, unlike Fig. 6.
- Why it matters: the "detour" the narration describes never reads as one path, so it is unclear what "transitive" refers to.
- Cause: `ChainScene.tsx:164-168` (note at `bottom + 92`), `:171` (first leg at `bottom + 56`), `:172-180`, `:181-183`.
- Fix:
  - Draw the first leg above the titles too: from `center(K.order)` to `center(K.customer) - 14` at level `g.top - 44`.
  - Move the customer_name arrow below the table, or drop it.
  - Hang the transitive label over the full span from order_id to customer_city.
  - Move the note to the right column (`RIGHT`, `g.top`) until the listing replaces it at `adaAt`.

### 5. [P2] spacing: 5 s of empty page under "Fig. 2"
- When: 48.3-53.3 s, beat `home` (element-097.jpeg, element-105.jpeg)
- What: Only the headline and "Fig. 2 The same facts, each stored once" are on screen. The caption labels nothing for 5 s while Drew says "The cure is one rule. Every fact gets exactly one home." The scene also has no spot illustration.
- Why it matters: the cure is stated over a blank figure, and the caption points at nothing.
- Cause: `HomeScene.tsx:124` (the Fig appears at `from`), while the first entity waits for `customersAt - 4` (:129).
- Fix: keep Fig. 1's flat table on screen, dimmed, during `home`. On "one home", wash its columns in three groups (order_id / customer_name and email / product_name and price), which then become the three entities on "tables". At minimum, cue the caption at `customersAt - 6`.

### 6. [P2] spacing: The right half of the frame is empty through most of 2NF and 3NF
- When: 113.6-138.4 s, beats `pair` to `partial` (element-240.jpeg, element-272.jpeg); 149.5-167.5 s, beats `chain` to `detour` (element-310.jpeg, element-330.jpeg)
- What: A 730-760 px table and its arrows fill x = 115-880. Everything right of x ≈ 1000 is blank for about 25 s and 18 s, during the most abstract ideas in the video (composite key, partial and transitive dependency). Neither scene has a spot illustration.
- Why it matters: the figure is squeezed small while half the frame goes unused, at exactly the moments that most need a second visual.
- Cause: `PairScene.tsx:29-32` (`RIGHT` is used only from `renameAt`); `ChainScene.tsx:26-28` (the listing arrives only at `adaAt`).
- Fix: use the right column to write each dependency in notation as it is spoken.
  - PairScene: `(order_id, product_id) → quantity` at `wholeAt`, then `product_id → product_name` at `halfAt` (label 26 px, at `RIGHT`, `g.top`). The lesson draws exactly this (second-normal-form.mdx:80).
  - ChainScene: build `order_id → customer_id → customer_city` one leg at a time, on `givesAt` and `cityToo`.
  - Push each scene's listing down about 120 px to make room.

### 7. [P2] explanation: The normal-form ladder is flashed with terms nothing has explained yet
- When: 70.7-74.2 s, beat `forms-in`, which at 3.52 w/s is the densest beat in the video (element-142.jpeg, element-146.jpeg)
- What:
  - "UNF repeating groups → 1NF one value per cell → 2NF the whole key → 3NF nothing but the key" is 16 words, none of them spoken. UNF is never named anywhere in the video.
  - The ladder inks in at 70.7-71.3 s and the scene cuts at 74.2 s.
  - "the whole key" and "nothing but the key" are not explained until 178 s.
  - The gaps between steps are uneven (40, 13 and 75 px), and the arrow into the 1NF box touches its edge.
- Why it matters: the viewer is shown unexplained jargon for 3 s, with no time to read it.
- Cause: `HomeScene.tsx:20-29` (a fixed 310 px stride, whatever each item's width), `:225-248`, and `HighlightStep` (width 276, :256); `script.ts:124` (no pauseAfter).
- Fix: show only "1NF 2NF 3NF" here, with the 1NF gloss alone, and leave the other glosses to the oath scene. Alternatively, have Drew say them ("one value per cell, then the whole key, then nothing but the key"). Either way, lay the items out with flex and a fixed gap instead of a fixed stride.

### 8. [P3] spacing: The DELETE 1 chip sits on the orders table's moving bottom rule
- When: 63.7-64.3 s, beat `once` (element-128.jpeg)
- What: The chip is positioned for the table *after* its row collapses (`og.bottom(2) + 16`), but it inks in before the struck row has closed up. For about 0.5 s the bottom rule runs through the chip.
- Why it matters: a visible collision, though brief.
- Cause: `HomeScene.tsx:203-205` (Reply at `outlivesAt - 2`) against `:187` (`collapseAt: graceAt + 18`, after which the height eases for 12 more frames).
- Fix: cue the Reply at `graceAt + 34`, after the collapse finishes.

### 9. [P3] confusion: Stale "ada@old.test, on 2 rows" after the update
- When: 23.0-33.3 s, beats `rushed` and `disagree` (element-064.jpeg)
- What: After the swap, ada@old.test is on only one row. The note beside the table still says "on 2 rows".
- Why it matters: the note contradicts the table right next to it.
- Cause: `OpenScene.tsx:149-153` (the Note has no `out`).
- Fix: dim both "twice" notes at `rushedAt`.

### 10. [P3] spacing: The constraint row and Postgres's reply share one baseline
- When: 22.8-33.3 s (element-064.jpeg)
- What: "✓ 6 constraints, every row passes" ends at x ≈ 1219, and "UPDATE 1  No error, no warning." starts at x ≈ 1262 on the same line. The two read as one sentence.
- Why it matters: two unrelated statements run together.
- Cause: `OpenScene.tsx:89` (the third check's text) and `:138` (stride `k * 360` at `CHECKS_Y`) land on the same y as the Reply at `:171` (`listTop + listH + 18`).
- Fix: shorten the third check to "{FLAT_CONSTRAINTS} constraints, all pass". The row then ends near x = 1100, about 160 px clear of the reply. Narrowing the stride instead would collide items 2 and 3.

### 11. [P3] other: psql's error message breaks mid-word as "not-" / "null"
- When: 38.6-42.5 s, beat `insert` (element-082.jpeg)
- What: In the 560 px ERROR box, "violates not-null constraint" wraps after "not-".
- Why it matters: the term is split in two across lines.
- Cause: `AnomalyScene.tsx:127-134` (width 560); ErrorBox uses `whiteSpace: "pre-wrap"` (`kit.tsx:714`).
- Fix: in ErrorBox, render "not-null" with a non-breaking hyphen (U+2011).

### 12. [P3] confusion: Fig. 4's refused row gives Grace four phones she didn't have in Fig. 3
- When: 91.4-93.7 s (element-186.jpeg)
- What: Fig. 3 shows Grace with one number (555-1100). Fig. 4, captioned "The same phones, as numbered columns", then tries to insert Grace with 555-1100, 2300, 3400 and 3500. The narration says only "A fourth number won't fit."
- Why it matters: the caption says "the same phones", but the data changed without comment.
- Cause: `CellScene.tsx:65-67, 148` (FOURTH.row from check.mjs `fourth`).
- Fix: change the beat's last sentence from "A fourth number won't fit." to "Give Grace a fourth, and it won't fit." and re-cue `CellScene.tsx:58` from "fourth number" to "fourth". Alternatively, add a Note at `fourthAt` beside the refused row: "Grace, with four numbers".

### 13. [P3] confusion: The same yellow marks "being read" and "the half"; some highlights go stale
- When: 123-140 s (element-272.jpeg); 103-113 s (element-225.jpeg)
- What: In Fig. 6, quantity 2 and 1 stay yellow from the `whole` beat while product_id 10 and Notebook turn yellow for "half". The two dependencies the arrows keep apart (blue "whole pair", red "half") end up sharing one cell colour. In Fig. 5, Linus's band stays lit through `depend-in`.
- Why it matters: colour is doing two jobs at once.
- Cause: `PairScene.tsx:162-163` (the qty marks have no `out`); `ChildScene.tsx:138`.
- Fix: give the qty marks `out: nameAt` and the Linus band `out: dependFrom`.

### 14. [P3] explanation: Northwind and Fig. 11's columns are not introduced
- When: 232.4-256.8 s (element-510.jpeg)
- What:
  - "Northwind stores a price on each product..." never says that Northwind is a sample database; the lesson calls it "Microsoft's demo store".
  - The `order_lines` column (12, 3, 13, ...) is never mentioned.
  - Prices print as 39 / 31.2 / 8 / 62.5, unlike every other price in the video (8.00, 32.50).
- Why it matters: a viewer meets an unfamiliar name and an unexplained column in the closing argument.
- Cause: `script.ts:237-241`; `PriceScene.tsx:60-72`.
- Fix: say "The Northwind sample shop stores...". Format columns 1-2 to two decimals when rendering. Caption `order_lines` ("lines at that price") or drop it.

### 15. [P3] other: Fig. 9 states a result it doesn't show, in awkward wording
- When: 176.2-177.8 s (element-354.jpeg)
- What: "and all 2 of her orders show Oxford" reads like an unfilled template. The orders that now show Oxford (CITY_JOIN, imported only for its count) are never drawn, so the 3NF payoff is asserted rather than shown, unlike Figs. 2 and 7.
- Why it matters: the conclusion of the 3NF section has no visual support.
- Cause: `ChainScene.tsx:239-243`.
- Fix: change the text to "and both of her orders now show Oxford". Better still, draw CITY_JOIN's rows (order_id, name, city) at `RIGHT`.

### 16. [P3] other: Headlines hang on a comma for 15-25 s
- When: "Valid rows," at 4.6-29.8 s (element-033.jpeg); "The whole key," at 113.6-128.9 s; "A dependency" at 149.5-163.8 s; "Same name," at 232.4-248.6 s
- What: The lead half of each headline sits alone, with its trailing comma, until the turn word is spoken near the end of the scene.
- Why it matters: for most of each scene, the page title looks unfinished.
- Cause: the `turnAt` cues at `OpenScene.tsx:105`, `PairScene.tsx:145`, `ChainScene.tsx:119` and `PriceScene.tsx:53`.
- Fix: if this is the intended device, bring the turn in on the scene's second beat (for example `twice`, `whole`, `detour`, `history`) rather than its last.

### 17. [P3] other: The oath's underlines cut through descenders
- When: 186-203 s (element-394.jpeg)
- What: The blue and red underlines cross the "y" of "key," and the "g" and "y" of "nothing but the key."
- Why it matters: a typographic flaw at the video's largest headline size.
- Cause: `OathScene.tsx:31` (`top: "1.02em"`).
- Fix: change to `top: "1.2em"`.

### 18. [P3] explanation: The summary table's build query is never shown
- When: 208-232 s (element-463.jpeg)
- What: Fig. 10 links the source tables to `daily_sales_summary` with only "derived →" and an `INSERT 0 2` tag. The viewer never sees that the summary is a GROUP BY over orders and order_items, which is what makes it a *derived* copy.
- Why it matters: "derived copy" is asserted rather than shown.
- Cause: `SummaryScene.tsx:127-151`.
- Fix: replace the tag with a two-line listing (`INSERT INTO daily_sales_summary` / `SELECT order_date, COUNT(...), SUM(amount) ... GROUP BY order_date`) above the arrow, at 21 px, cued on "store the answer".

### 19. [P3] confusion: "a plain equals" is shown as a four-line JOIN
- When: 99.8-104 s, beat `plain` (element-204.jpeg)
- What: The narration promises "a plain equals". The listing is SELECT / FROM / JOIN / WHERE, which looks harder than Fig. 3's two-line query, and the whole WHERE line is washed rather than just the comparison.
- Why it matters: the screen seems to contradict the claim of simplicity.
- Cause: `ChildScene.tsx:168-178`.
- Fix: say "a plain equals, with one join". Alternatively, give `LineMark` an optional character range (today's marks span the whole line, `kit.tsx:203-222`) and mark only `p.phone_number = '555-2200'`.

### 20. [P3] other: The closing "Next" line ends with a full stop, then continues in lowercase
- When: 267-273.4 s (element-543.jpeg)
- What: "Next: designing a schema, start to finish." is followed underneath by a lowercase "and changing it once it's live".
- Why it matters: the second line reads as a fragment after a finished sentence.
- Cause: `CloseScene.tsx:96-101`.
- Fix: change the first line's text to "designing a schema, start to finish," so the second line continues it.
