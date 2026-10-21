# DbDesign-2-Entities (0-174 s, whole video)

## Verdict
- A clean, accurate video. Every table, type, error and count matches results.json and the lessons. Layouts are uncluttered and the text is legible at 1080p. Most beats run at 1.9-3.1 words/s with 1.6 s breaths at scene cuts, so the pacing feels comfortable.
- The biggest problem is the ERD close (154-162 s). The "exactly one" label and its pulse land on the customers end when the narrator says "One customer". That is 4.5 s before he says "exactly one", and he is in the middle of saying "zero or many orders". The crow's-foot marks themselves (bar, circle, foot) and the rule that each end counts the box it touches are never stated.
- PK and FK are only expanded as acronyms at 149 s, but the PK badge has been on screen since 60 s. The video never says that the FK column is what the line stands for.
- Smaller issues. The domain gloss list is flashed for about 3 s and never read aloud. Two scenes have long stretches where only the left third of the frame is used. Some loose ends a careful viewer will notice: the address attribute stays in the box after it becomes an entity, the constraint name appears from nowhere, and there are two different "fours" in one sentence.

## Findings

### 1. [P2] explanation: crow's-foot reading is cued to the wrong words, and the marks are never decoded
- When: 154.1-162.1 s, beat `line` (frames element-312.jpeg, element-316.jpeg, element-322.jpeg)
- What: The narrator says "One customer places zero or many orders". On "One customer" (about 155.5 s), the `||` end at customers gets a pulse ring and the label "exactly one" (element-312). The narrator only says "exactly one customer" at about 160 s. The `o<` label arrives at 158 s. Neither the narration nor the screen explains what a bar, a circle or a foot means, or that you read the end at the far box. The glyphs first appeared at 147 s with no comment. Decoding is deferred to DbDesign-3, 71-88 s.
- Why it matters: Labelling the near end on "One customer" teaches the opposite of the reading rule: it suggests the mark by a box describes that box's own "one".
- Cause: `video/src/videos/db-entities/ErdScene.tsx:245` (`Pulse ... at={oneAt}` on the customers end) and `:248` (`Note at={oneAt + 2}` for "exactly one"). The correct pulse at `exactlyAt` already exists at `:247`.
- Fix: On `oneAt`, pulse the customers header instead of the `||` end. Show the "exactly one" Note at `exactlyAt - 2`. Extend `line` (script.ts:165) with one sentence: "Each end counts the box it touches: two bars, exactly one; a circle and a foot, zero or many." Add `pauseAfter: 0.9`.

### 2. [P2] explanation: PK is on screen 90 s before it is named, and PK/FK are only expanded, not explained
- When: 60-70 s, beat `attributes` (element-120.jpeg, element-139.jpeg). 118-128 s, beat `entity-or` (element-247.jpeg). Named at 149.4-153.7 s, beat `keys` (element-307.jpeg).
- What: A blue "PK" badge sits on `orders.id` in AttrScene and on `customers.id` in AtomicScene, with nothing said about it. At 149 s, "PK marks a primary key, and FK a foreign key" only spells out the letters. The line runs from `customers.id` to `orders.customer_id`, but nothing says the FK column is the line. "UK" appears only as an unnarrated footnote.
- Why it matters: A newcomer gets two terms with no meaning attached, and Unit 3 builds directly on "the foreign key is how the database holds on to it".
- Cause: `AttrScene.tsx:41` passes `key` from `ORDER_COLUMNS` (`data.ts:147`). `AtomicScene.tsx:259` hard-codes `key: "PK"`. `script.ts:162` is the bare `keys` beat.
- Fix: Drop `key` in AttrScene (`columns: ORDER_COLUMNS.map(({ name }) => ({ name }))`) and in AtomicScene's `customers`. Rewrite `keys` as "PK marks the primary key, the column that names each row. FK marks a foreign key: customer_id holds a customer's id, and that's what the line draws." Pulse `orders.customer_id` and the line on "line draws".

### 3. [P2] pacing: the domain gloss (four "holds ..." rows) is flashed and never read
- When: 67.1-70.3 s, beat `domain` (element-135.jpeg, element-139.jpeg)
- What: Four rows appear 0.2 s apart on "values": "id holds whole numbers", "status holds any text at all", and two more (12 words plus column names). The scene cuts about 3 s later, 1.6 s of which is the silent gap. At the same moment, all 8 table cells get a yellow highlight, so the highlight singles out nothing.
- Why it matters: "status holds any text at all" is the setup for the next scene's "Say status is just text", and viewers will not have read it.
- Cause: `AttrScene.tsx:88-97` (`Note at={valuesAt + 2 + i * 6}`) and `:81-83` (a mark on every cell). `script.ts:112` does not mention the types.
- Fix: Extend `domain`: "...the values it's allowed to hold. Integer means whole numbers, text means any text at all." Cue the `status` row to "any text". Drop the blanket cell marks, or mark only the status column. Add `pauseAfter: 0.8`.

### 4. [P3] spacing: the two panel labels and tops in AttrScene are misaligned
- When: 60-70 s (element-139.jpeg)
- What: "The entity, its attributes" sits at y≈324 and "The table, a column each" at y≈341. The entity box top is at 360 but the table's top rule is at 376. Two side-by-side panels have visibly different baselines.
- Cause: `AttrScene.tsx:41` uses `y(350)`, but `:42` uses `top = y(364)`. The labels are at `orders.top - 46` (`:60`) and `top - 46` (`:71`).
- Fix: Put both labels at one y (`Math.min(orders.top, top) - 46`) and align the table's top rule with the box top (`top = orders.top`). Move the arrow to `headMid` afterwards.

### 5. [P3] confusion: the "4 values. The same state?" note leaves after about 1.5 s, and "four" means two things
- When: 78.5-80.2 s, beats `loose` → `narrow` (element-158.jpeg)
- What: The bracket and note arrive on "mean the same" and leave on "narrow it", 0.45 s after the question ends. Then `narrow` says "Four statuses ... Of those four spellings, only shipped gets in". The CHECK's four (pending, paid, shipped, cancelled) and the loose table's four (sent, shipped, SHIP, done) share a number in one sentence.
- Cause: `DomainScene.tsx:94-95` (`out={narrowAt - 4}`), `script.ts:117` (`pauseAfter: 0.45`), `script.ts:121`.
- Fix: Set `pauseAfter: 0.9` on `loose` and keep the note until `fourAt`. Reword: "Of the spellings we tried, only shipped gets in."

### 6. [P3] explanation: the constraint name `orders_status_check` appears from nowhere
- When: 89.5-93.3 s, beat `banana` (element-184.jpeg)
- What: "Refused, with the name of the rule it broke" highlights `orders_status_check` in the error. The CHECK listing above it is unnamed, so the viewer cannot see where the name came from.
- Cause: `DomainScene.tsx:133-142` (marks `BANANA.error.constraint`). `CHECK_SQL` has no `CONSTRAINT` clause.
- Fix: Add a 22px note under the error: "Postgres named it: table, column, check". Alternatively, pulse line 2 of the listing as the name is highlighted.

### 7. [P3] confusion: the address attribute stays after it "becomes an entity", and two customers schemas are side by side
- When: 118-128.9 s, beats `entity-or`, `erd-in` (element-247.jpeg, element-256.jpeg)
- What: `addresses` rises out of the pink `address` row, but the row stays in `customers` until the cut. The fact ends up shown as both an attribute and an entity. The left table is customers(id, name, phone_numbers) and the right box is customers(id, name, email, address), both on screen at once. The packed-phone problem is shown, but the one-number-per-row fix (results.json has it) never is.
- Cause: `AtomicScene.tsx:317` (a warn mark with no strike or exit), `:254-260` (a different column list from `PACKED.cols`).
- Fix: Strike or fade the `address` row at `savedAt + 20`. Add `phone_numbers` to the box, or rename the right box to match. Optionally, show the 2-row fixed table for 1.5 s on "searching for either".

### 8. [P3] spacing: cardinality labels hug the box borders, and the pulse ring covers "integer"
- When: 156-171 s, beats `line`, `next` (element-312.jpeg, element-345.jpeg)
- What: "exactly one" starts about 10 px right of the customers box. "zero or many" ends about 12 px left of the orders box. The 156 s pulse ring is drawn over the `integer` type label in `customers.id`.
- Cause: `ErdScene.tsx:248` (`x={a[0] + 8}`), `:253` (`x={b[0] - 8}`), `:245` (`Pulse x={a[0] + 10}`).
- Fix: Offset the labels to `a[0] + 28` and `b[0] - 28`, and center the pulse on the glyph (`a[0] + 16`) with a smaller radius.

### 9. [P3] spacing: two scenes leave the right half of the frame empty for 9-10 s
- When: 70.3-80 s, beat `loose` (element-147.jpeg, element-158.jpeg). 36-46.5 s, beats `type`, `ada` (element-074.jpeg).
- What: In `loose`, a 280 px-wide two-column table sits at the left with about 1,400 px of empty paper to its right until the CHECK listing arrives at 80 s. TableScene shows only the customers table until products arrive at 47 s.
- Cause: `DomainScene.tsx:13-16` (`LOOSE_X = 130`, listing only from `narrowAt`) and `TableScene.tsx:221-223`.
- Fix: For `loose`, scale the table up (S 1.3 → 1.7) and centre it until `narrowAt`, then glide it left as the listing enters, as AtomicScene does with its glide. This is a lower priority for TableScene.

### 10. [P3] confusion: products dims on "what do you need to remember about each one?"
- When: 52.1-56.6 s, beat `attrs-in` (element-110.jpeg)
- What: The question introduces attributes. The products table, the one that shows an extra attribute (price), fades to 40%, while the customers table stays lit.
- Cause: `TableScene.tsx:260` (`productsDim` from `rememberFrom`), `:318`.
- Fix: Keep both tables at full opacity and pulse both header rows (or the `price` column) on "remember".

### 11. [P3] pacing: two dense beats each carry a core rule, with a short gap after
- When: 34.7-40.9 s `type` (3.04 w/s, 0.35 s gap). 117.9-124.0 s `entity-or` (3.13 w/s, 0.40 s gap).
- What: "an entity is a TYPE ... each real one, a row" and "a fact with details of its own, or lots of copies ... is an entity too" are the unit's two rules. Both are the densest beats in the video and lead straight into the next point.
- Cause: `script.ts:98-99`, `script.ts:143-144`.
- Fix: Set `pauseAfter: 0.7` on both.
