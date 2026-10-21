# DbDesign-3-Relationships (0-188 s, whole video)

## Verdict
- A strong, well-argued video with accurate data: ids, counts, the 23505 error and "two notebooks and three pens" all match results.json. Fig. 2's build (line, then rows, then key, then "how many?", then answers at each end) is the best sequence in the unit.
- The biggest problem is the crow's-foot decoding, which is the unit's core skill. The `max` and `min` beats deliver it at 3.18 and 2.88 words/s with a 0.30 s gap between them. The finished key (Fig. 3) is then up for about 1 s before it fades, and Fig. 4 runs five mark combinations at 0.30 s gaps with no legend left on screen.
- "Read the far end" (the Fig. 4 headline) collides with "Farther out is the least" (Fig. 3), where "far" means something else.
- Smaller issues: a highlight lands on the wrong row (`name` for "Ada's id"), a label collides with a line in Fig. 5, the joins are asserted without showing the query, and the mark-to-constraint takeaway is flashed for about 3 s.
- Pacing: the first 70 s and the last 50 s are comfortable. The stretch from 77 to 115 s is too fast for new notation.

## Findings

### 1. [P1] pacing: the crow's-foot key is given in 10 s and the finished key is up for about 1 s
- When: 77.4-88.4 s, beats `max` (3.18 w/s, gap 0.30), `min` (2.88 w/s, gap 0.50) (frames element-166.jpeg, element-174.jpeg → element-177.jpeg)
- What: "Next to the box is the most. A bar means one, and a crow's foot means many. Farther out is the least. A circle means zero, and a bar means one." Each callout lands on its word. The last one ("one" over the outer bar) arrives at about 87.3 s, Fig. 3 starts fading at 87.9 s, and it is gone by 88.5 s. Fig. 4 never shows the four definitions again.
- Why it matters: This is the only place the marks are decoded, in this video or in DbDesign-1 and DbDesign-2, which both use them. Viewers get one listen and about 1 s to read the finished key.
- Cause: `video/src/videos/db-relationships/EndsScene.tsx:206` (`partOne` fades from `oneFrom - 14`) and `script.ts:123-124` (`pauseAfter: 0.3` and `0.5`). Fig. 4 (`EndsScene.tsx:302-334`) has no legend.
- Fix: Set `pauseAfter: 1.0` on `max` and `1.5` on `min`. Instead of fading Fig. 3 out, shrink it (scale 0.5) into the empty bottom-right (x≈1100-1800, y≈900-1040) and keep it there through `m2m` as a legend. Or add a 4-entry legend line at the end of the Fig. 4 label row (bar = one, foot = many, circle = zero; next to box = most).

### 2. [P2] pacing: the five mark combinations are read rapid-fire
- When: 88.4-114.7 s, beats `one` (2.13), `zero-or-one` (2.74), `one-or-many` (3.03), `zero-or-many` (3.07), `m2m` (2.43). Gaps are 0.30, 0.30, 0.30, 0.40. (element-231.jpeg)
- What: Each row adds a new glyph pair, a reading and an example sentence (12-16 words on screen). Each is narrated in about 5 s, with 0.3 s before the next.
- Why it matters: The viewer is expected to apply the rule from finding 1 to each glyph, and there is no beat to do it in.
- Cause: `script.ts:125-128` (`pauseAfter: 0.3`).
- Fix: Set `pauseAfter: 0.7` on `one`, `zero-or-one`, `one-or-many` and `zero-or-many` (about 1.5 s total).

### 3. [P2] confusion: "Read the far end" uses "far" to mean something different from "Farther out" six seconds earlier
- When: 89-116 s, headline over Fig. 4 (element-231.jpeg), after `min` at 83.1 s.
- What: In Fig. 3, "farther out" means the mark farther from the box on the same end (the minimum). The Fig. 4 headline "Read the far end as a count." means the other end of the line, away from the box you start at. The headline is never spoken.
- Why it matters: Two spatial rules use the same word, and a viewer can read the headline as "read the outer mark".
- Cause: `EndsScene.tsx:243`.
- Fix: Change the headline to "Start at one box. Read the other end." Have `one` open with "Start at a box, read the end at the other box:" so the rule is spoken once.

### 4. [P2] confusion: the highlight lands on `name`, not `id`, for "both storing Ada's id"
- When: 69.0-71.3 s, beat `one-to-many` (element-141.jpeg)
- What: On "Ada's id", the customers entity box highlights its `name` row in yellow, while the narration and the table below are about the id 1 in `customer_id`.
- Why it matters: It suggests the order stores the customer's name, which is the opposite of the scene's point.
- Cause: `RowsScene.tsx:150` (`name: { at: adaIdAt, tone: "note" }`).
- Fix: Mark `id: { at: adaIdAt, tone: "note" }`, or drop the box mark, since the table already bands Ada's row.

### 5. [P2] spacing: in Fig. 5, "assigned" touches the elbow line, and the badges line leaves from `name`
- When: 117-139.3 s, beats `schema` to `translate` (element-246.jpeg, element-277.jpeg)
- What: The italic "assigned" label ends at x≈522, on top of the line's vertical segment at x≈517-525 (its "d" sits on the line). The employees→badges line leaves the `name` row of employees, which implies `badges.employee_id` points at `name`. "receives" floats about 70 px below its line, detached from it.
- Cause: `BadgeScene.tsx:82` (elbow at x=525), `:125` (`labelPos={[438, ...]}`), `:80` (`emp.anchor("right", "name")`), `:134`.
- Fix: Move the devices elbow to x=560 or the label to `[440, e1[1] + 8]`, below the horizontal segment. Anchor the badges line at the `id` row (`emp.anchor("right", "id")`) and the devices line at the header. Put "receives" at `[440, e2[1] - 36]`.

### 6. [P2] explanation: "Each one is a join" is asserted, but the query is never shown
- When: 165.9-178.0 s, beats `joins`, `result` (element-354.jpeg)
- What: The lines turn blue and a result table appears ("The query, joined along the three keys"). The three `JOIN ... ON` clauses from the lesson (reading-er-diagrams.mdx:174-176) are not on screen, and "join" is never defined. The right side below the result (y 580-1000) is empty.
- Why it matters: The claim that "the diagram maps out the query" is the payoff of Part 3, and the viewer gets the result without seeing the mapping.
- Cause: `ShopScene.tsx:264-281` (result only). `script.ts:153`.
- Fix: Add a Listing at `TEXT_X`, y≈600 with the lesson's three lines (`JOIN orders o ON o.customer_id = c.id`, ...). Reveal each line on `herOrderAt`, `linesAt` and `productsPathAt` beside its blue path segment.

### 7. [P2] pacing: the takeaway that marks become constraints is up for about 3 s and is not spoken
- When: 136.0-139.3 s, beat `translate` (element-272.jpeg → element-278.jpeg)
- What: "Zero or many: a foreign key / Zero or one: a foreign key, and unique" (14 words) appears in the last 3 s of the scene. The narration says only "into keys and constraints".
- Cause: `BadgeScene.tsx:138-147` (on `keysAt` / `constraintsAt`). `script.ts:138`.
- Fix: Bring line 1 in on "share" (`schema` beat) and line 2 on "twice" (`badge` beat), so each is up for about 15 s. Or narrate them: "Zero or many is a foreign key. Zero or one is a foreign key that's unique."

### 8. [P3] confusion: "Ada" is an employee here, but the screen never says so
- When: 128.7-132.2 s, beat `reject` (element-261.jpeg)
- What: "Give Ada a second badge". The employees box has no rows, so the viewer knows Ada only as customer 1 from Fig. 2. `badges.employee_id = 1` is never tied to her on screen. check.mjs does insert employees (1, 'Ada').
- Cause: `BadgeScene.tsx:57-63` (an entity box with no data). `script.ts:137`.
- Fix: Add a one-row `employees` table (1, Ada) above `badges`, or label the badges row "employee 1, Ada".

### 9. [P3] explanation: "device rows can share an employee id" is said, but no device rows are shown
- When: 116.3-123.4 s, beat `schema` (element-246.jpeg)
- What: Only the FK row of `devices` is highlighted. The badges side gets a data table, but the devices side, whose point is that rows share an id, never shows two rows with the same `employee_id`.
- Cause: `BadgeScene.tsx:116`.
- Fix: Show a 2-row devices mini-table (ids 1 and 2, `employee_id` 1 and 1) at the right during `schema`. Fade it when the badges table arrives.

### 10. [P3] explanation: `order_items` appears between orders and products with no word on why, and it has two PKs
- When: 139.3-149 s, beat `shop` (element-328.jpeg). Compare 9-24 s, Fig. 1 (element-047.jpeg).
- What: Fig. 1 draws "orders contains products" as one line. Fig. 6 inserts `order_items` ("orders contains order_items", "products appears in order_items") without comment. The box carries `PK, FK` and `PK` on two rows, the first composite key a viewer has seen, also without comment.
- Cause: `VerbsScene.tsx:73` and `ShopScene.tsx:101-112`. `script.ts:144`.
- Fix: Add to `shop`: "order items, the lines that sit between an order and its products." Add a 20px note under the box: "two PKs: together they name a row (Unit 4)".

### 11. [P3] other: lines join the box headers, not the key rows
- When: 25-71 s Fig. 2 (element-091.jpeg) and 148-188 s Fig. 6 (element-354.jpeg)
- What: In this video every line meets its boxes at the header. DbDesign-2 ran its line from `customers.id` to `orders.customer_id`. This video's thesis is that the FK holds the link, and the FK row is highlighted, but the line does not touch it.
- Cause: `RowsScene.tsx:88-89` (`anchor("right")` / `anchor("left")` with no column) and `ShopScene.tsx:113-118`.
- Fix: In Fig. 2, anchor at `cust.anchor("right", "id")` and `ord.anchor("left", "customer_id")`, and raise `orders` one row so the line stays level, as `db-entities/ErdScene.tsx:126-135` does. Leave Fig. 6 as is, or do the same where the geometry allows.

### 12. [P3] other: figure numbering is used here but not in the neighbouring units
- When: throughout (Fig. 1-6)
- What: This video numbers its figures. DbDesign-2, the video just before it, uses unnumbered labels such as "The lesson's diagram: customers and orders". Of the nine `db-*` folders, only this one and `db-normalization` use `<Fig>`.
- Cause: `<Fig n=...>` in `RowsScene.tsx:141`, `EndsScene.tsx:248`, `:303`, `BadgeScene.tsx:107`, `ShopScene.tsx:168`, `VerbsScene.tsx:95`.
- Fix: Pick one convention for the DbDesign series and apply it to all nine videos.
