# DbDesign-1-WhyDesign (0-176 s, whole video)

## Verdict
- The argument is tight and the data is honest: every table, error and count is the lessons' own SQL as run. Layouts are mostly clean, and the ERD ends are correct (one/zero-or-many in the right places, no marker built on a corner).
- Biggest problem: the video uses two lesson datasets that share the same people and order numbers but disagree. In Fig. 1, order 103 is Grace Hopper buying a Notebook. Fig. 5 then answers "which customers bought a notebook?" with Ada only, "from orders 101 and 103". A viewer who was paying attention will think the answer is wrong.
- Both ERDs drop the UK marks (`customers.email`, `products.name`, `book_copies.barcode`), and none of the notation (PK, FK, "PK, FK", crow's-foot ends) is explained in the course's first video. As a result, the gate scene's first refusal (`customers_email_key`) enforces a rule the viewer never saw.
- Pacing is comfortable overall (2.3-2.9 w/s, 1.6 s scene gaps). The exceptions:
  - The library cluster runs above 3.1 w/s while four ERD parts build within about a second.
  - The join scene ends with four unread chores and only about 0.8 s of hold.
  - The gate scene drops three error boxes at once and flashes a counts note for 2 s.
- Four scene openings hold a near-empty page for 5-9 s. The worst is 31.7-40.5 s.

## Findings

### 1. [P1] accuracy: Fig. 5's answer contradicts Fig. 1: same names, same order ids, different data
- When: 117.8-129.6 s, beats `answer` and `sentence` (element-240.jpeg, element-258.jpeg), against Fig. 1 at 11.5-31.4 s (element-062.jpeg).
- What:
  - Fig. 1 shows `103 | Grace Hopper | Notebook | 1`, and Ada's notebook and pens as two separate orders, 101 and 102.
  - Ninety seconds later, the narrator says "One name comes back. Ada Lovelace." The note reads "One row, from orders 101 and 103", and Ada's email is now a third address, `ada@example.com`.
  - Fig. 6 is titled "The same order, as a sentence" ("2 notebooks and 5 pens" in one order).
  - All of this is true of the shop lesson's data. Nothing on screen says it is a different shop.
- Why it matters: the viewer has just watched Grace buy a notebook, so the "short walk" seems to return the wrong answer, and the payoff of Part 3 turns into a puzzle.
- Cause: `video/src/videos/db-why-design/data.ts` reads `r.flat` (what-is-database-design "Watch a shortcut go wrong") for Figs. 1-2 and `r.shop` ("The schema shapes everything") for Figs. 4-6. The note at `JoinScene.tsx:134-138` prints `NOTEBOOK.lines` order ids (101, 103), and `JoinScene.tsx:87` titles Fig. 4 "The shop, as four tables".
- Fix:
  - Retitle Fig. 4 "A new shop, as four tables" (`JoinScene.tsx:87`).
  - Replace the note at :134-138 with "One row: Ada ordered notebooks twice; Grace's order here was a backpack". This is true in the shop data (order 102 = product 30, Backpack).
  - Retitle Fig. 6 "One order, as a sentence" (:141).

### 2. [P2] explanation: Unique keys are dropped from both ERDs, so the first refusal enforces a rule that was never shown
- When:
  - Fig. 3, 91.1-106 s, `copies` ("each have their own barcode"; element-200.jpeg).
  - Fig. 4, 107.9-129.6 s (element-240.jpeg).
  - The refusal "violates unique constraint customers_email_key" at 142.8 s (element-293.jpeg).
- What: `barcode`, `customers.email` and `products.name` are UNIQUE in the DDL and in the lesson's mermaid ERD (`barcode UK`), but carry no badge on screen. QuestionsScene promised "present, unique, or limited", and the figures never show a unique column.
- Why it matters: "a customer entered twice" bounces on a rule the viewer was never shown. The barcode's uniqueness, which is the whole title-versus-copy point, is also invisible.
- Cause:
  - `data.ts:82` only produces `PK` / `FK` / `"PK, FK"`. It computes `unique` at :83, but nothing uses it.
  - `LibraryScene.tsx:17` and `JoinScene.tsx:19` map columns to `{ name, type, key }` and drop `unique`.
  - The kit supports `UK` (`erd.tsx:33`), and `db-designing-schemas/data.ts:61` marks `email` UK, so this video is the odd one out in the series.
- Fix: at `data.ts:82`, return `"UK"` (or `"FK, UK"`) when `unique && !pk`. Then mark `customers.email` in Fig. 4 at `answer` and reuse that mark in GateScene's first block.

### 3. [P2] explanation: ERD notation is never explained in Unit 1's first video
- When: Fig. 3 at 84.4-106 s (element-200.jpeg) and Fig. 4 at 107.9-129.6 s (element-240.jpeg).
- What:
  - PK, FK and the composite "PK, FK" badges, the `‖` and `o<` crow's-foot ends, the blue key tint and the yellow note tint all appear with no gloss.
  - The questions scene says "identity" and "point to which" and shows `PRIMARY KEY` / `REFERENCES`, but never links them to the PK/FK badges.
  - Fig. 4's composite key on `order_items` is a second unexplained idea.
- Why it matters: the narration says "a loan points at a copy" and "links the design already drew", and the only evidence for both claims is notation a first-time viewer cannot read.
- Cause: no legend in `LibraryScene.tsx:82-133` or `JoinScene.tsx:87-128`.
- Fix: put a one-line key at the right end of Fig. 3's label line (README: a legend goes there), cued to `copies`: "PK the row's identity · FK points at another table · ‖ exactly one · o< zero or many". In `QuestionsScene.tsx:40-41`, change "keys" / "relationships" to "keys (PK)" / "links (FK)".

### 4. [P2] spacing: Scene openings hold a near-empty page for 5-9 s while the narrator talks
- When:
  - 4.6-10.2 s, `hook`/`table`: kicker plus "Day one:" (element-012.jpeg, element-016.jpeg).
  - 31.7-40.5 s, `legal`/`design`: a headline and three short lines; 80% of the frame is blank for 9 s (element-078.jpeg).
  - 58.9-65.3 s, `what` (element-124.jpeg).
  - 129.7-134.8 s, `gate` (element-266.jpeg).
- What: at 31.4 s the cut also removes Fig. 1 and the UPDATE listing, exactly as the narrator says "nothing in *that update* was illegal".
- Why it matters: it is dead time in a 3-minute video, and the update being discussed is no longer on screen.
- Cause:
  - `CostScene.tsx:63/96`: the card waits for "one" at 40.68 s.
  - `FlatScene.tsx:96-101`: Fig. 1 is cued to `table`'s "One" and "every".
  - `QuestionsScene.tsx:52`: the column heads wait for "things".
  - `GateScene.tsx:69`: the first block waits for "customer" at 134.9 s.
- Fix:
  - In CostScene, carry the three-line UPDATE listing (`Listing` with `FLAT.update`) at X0 under "UPDATE 1" from `legal`, and bring the "one fact" card in at `design`'s "design" (38.1 s).
  - In FlatScene, bring Fig. 1's label and header in at `hook`'s "database" (5.1 s).
  - In GateScene, move the building watercolor (`Spot`, :105) to the scene start.

### 5. [P2] pacing: The library ERD builds four things in about 1 s during the densest beats
- When: 82.6-96.4 s. Beats `library` (3.23 w/s, gap 0.45), `copies` (3.16 w/s, gap 0.40) and `loan` (3.32 w/s) are the three fastest in the video and carry its central example. Between 91.8 and 92.9 s, `loans` (5 rows), the "appears in" relation, `borrowers` and the "makes" relation all build while the narrator says "and get lent out separately" (element-183.jpeg to element-186.jpeg).
- What: `borrowers` and "makes" are never mentioned in the narration.
- Why it matters: "a loan points at a copy" is the point of the scene, and the viewer is still parsing a burst of new boxes when it is said.
- Cause: `LibraryScene.tsx:109-133`. Every element is cued to `lent` or `separately` (loans at lentAt-4, the relation at lentAt+4, borrowers at separatelyAt-6, makes at separatelyAt+2).
- Fix:
  - In `script.ts:132-140`, add `pauseAfter: 0.8` to `library` and `copies`.
  - Split "and get lent out separately" into its own beat.
  - Cue `borrowers` and "makes" to `loan`'s "title" (95.9 s), or drop them, since the narration never needs them.

### 6. [P2] pacing: The join scene ends on four unread chores and a 0.8 s hold
- When: 126.7-129.6 s, `sentence` (element-254.jpeg, element-258.jpeg).
- What: "parse the text / handle misspellings / notebook or notebooks? / clean up old rows" appear 0.44 s apart from 126.7 s and are never read aloud. "A query became a project." lands at 128.0-128.6 s, and the cut is at 129.4 s, so the finished figure holds about 0.8 s against a 1.5 s minimum. Eleven unread words need about 5 s at 2 words/s.
- Why it matters: the four chores are the evidence for "becomes a project", and they are gone before anyone can read them.
- Cause: `JoinScene.tsx:170-185` (stagger of `(projectAt - questionAt + 14) / 4` ≈ 13 frames); `script.ts:152-155` sets no `pauseAfter`.
- Fix: give `sentence` `pauseAfter: 2.8` (the scene gap never shortens it), start the chores at "notebooks" (124.3 s), and space them 20 frames apart.

### 7. [P2] pacing: Gate scene: three error boxes arrive at once, and the "nothing got in" proof flashes for 2 s
- When: 142.8-147.4 s, `refused`, `building` (element-286.jpeg, element-293.jpeg, element-296.jpeg).
- What:
  - About 45 words of mono error text (three ERROR/DETAIL boxes) appear at 142.8, 143.0 and 143.2 s.
  - "Still in the tables / 3 customers / 3 orders / 4 order lines / Not one bad row got in" (15 unspoken words) shows from 145.4 to 147.4 s only. It has no "before" figure to compare against, so the counts mean nothing on their own.
  - The scene's conclusion (`building`) is then delivered at 3.11 w/s.
- Why it matters: the claim "nothing gets in" is asserted rather than shown.
- Cause: `GateScene.tsx:49` (`errAt` steps 6 frames); `GateScene.tsx:94` (`out={schemaAt - 6}`, because the building `Spot` takes the same slot at :105).
- Fix:
  - Space `errAt` 20 frames apart, or cue each box to "each", "one" and "bounces".
  - Keep the counts note to the cut by moving it under the chips, and write it as "3 customers, as before".
  - Add `pauseAfter: 0.8` to `refused` (`script.ts:162`).

### 8. [P2] explanation: The refused INSERTs are bare numbers: which one is the quantity, and which the missing customer?
- When: 134.8-153.6 s, `gate`/`refused` (element-305.jpeg).
- What: `INSERT INTO order_items VALUES (102, 10, 0)` and `INSERT INTO orders VALUES (104, 99, DATE '2025-03-04')` have no column list, so "a quantity of zero" and "a customer who isn't there" have to be decoded from position. Only the DETAIL lines name the column, and they arrive later.
- Why it matters: the viewer cannot match the narration's three examples to the code.
- Cause: `check.mjs:188-190` writes the SQL without column lists; `GateScene.tsx:75` prints it as is.
- Fix: in `check.mjs`, write `INSERT INTO order_items (order_id, product_id, quantity) VALUES (102, 10, 0);` and the same for the other two, then re-run. At 22px mono, all three fit the 1270px box (77-85 characters).

### 9. [P2] explanation: "Even a type is a rule" is never connected to the orbiter
- When: 153.9-168.2 s, `orbiter`, `factor` (element-337.jpeg).
- What: the headline claims a type is a rule, but the story is about units, and a plain numeric column would have accepted those numbers too. The video stops at "Nothing said which" and never says what a schema would have done. The lesson says it: "a type, a clear name like `total_cents` or `mass_kg`, and a constraint together say … what this number means".
- Why it matters: the headline promises a lesson that the figure does not deliver, and a viewer may conclude that `numeric` would have saved the spacecraft.
- Cause: `OrbiterScene.tsx:126-151` ends on "unit none"; `script.ts:173`.
- Fix:
  - Extend `factor`: "A column named for its unit, newton-seconds, would have said which."
  - At "which", morph the "unit none" box into a column stub such as `impulse_n_s numeric CHECK (…)`.

### 10. [P3] spacing: The "appears in" label touches its line
- When: 92.6-106 s (element-200.jpeg).
- What: the end of "appears in" sits about 5px from the blue vertical segment.
- Cause: `LibraryScene.tsx:123`: `labelPos={[jog2 - 112, …]}` against a label about 108px wide.
- Fix: use `jog2 - 128`.

### 11. [P3] other: The "makes" relation's `‖` end hangs in space while `borrowers` is still one row tall
- When: about 92.4-92.7 s (element-185.jpeg).
- What: the line and its exactly-one end are drawn at the box's final bottom, about 70px below the one-row box.
- Cause: `LibraryScene.tsx:125-133`. The Relation's `at={separatelyAt + 2}` equals the first row's default time (`erd.tsx:131`, at + 8), but `anchor("bottom")` uses the full height.
- Fix: start the Relation at `separatelyAt + 14`, or give `borrowers` `rowAt={{ name: separatelyAt - 2 }}`.

### 12. [P3] other: Fig. 4's relationships have no verbs, while Fig. 3's do
- When: 114.7-129.6 s (element-240.jpeg).
- What: Fig. 3 labels its lines "has", "appears in" and "makes". Fig. 4's three lines are bare, although the narration calls them "links the design already drew".
- Cause: `JoinScene.tsx:109-125` (no `label`).
- Fix: add `label="places"`, `"holds"` and `"appears in"`, positioned like Fig. 3's.

### 13. [P3] other: The card split overlaps text, and the "one fact" changes its value mid-split
- When: 42.0-42.4 s, `design` (element-084.jpeg).
- What: "copy on order 102" is drawn semi-transparent over the "ada@old.example" line of card 1. At split 0.5, card 1 then switches from `ada@old.example` to `ada@new.example`, so the copying seems to change the email.
- Cause: `CostScene.tsx:96-129`. Card 2 renders on top with `opacity: split`, and :123/:125 switch card 1's label and value at `split < 0.5`.
- Fix: render card 2 first (underneath) with an opaque fill, and keep both copies at OLD_EMAIL until `design`'s "step" before swapping 101 to NEW_EMAIL.

### 14. [P3] explanation: "UPDATE 1" and `order_spreadsheet` are never glossed
- When: 22.4-58 s (element-062.jpeg, element-110.jpeg).
- What: "Postgres replies UPDATE 1" is the evidence for "fixes order 101 and misses the other", but nothing says it means one row changed. The table name in the UPDATE never appears on Fig. 1. The tense also shifts between scenes ("replies", then "replied").
- Cause: `FlatScene.tsx:131-134` and :96; `CostScene.tsx:83-88`.
- Fix:
  - Add a small "(1 row changed)" note after `UPDATE 1` in both scenes.
  - Title Fig. 1 "`order_spreadsheet`: one table for everything".

### 15. [P3] pacing: "Design decides what gets in" flashes for 1.4 s, and the headline runs ahead of the narration
- When: 129.5-132.8 s, `gate` (element-260.jpeg, element-264.jpeg).
- What: "Bad data starts small." is on screen 3 s before it is said. The subtitle that matches what is actually being said appears at "gets" and leaves at "Bad" + 4 frames.
- Cause: `GateScene.tsx:61-64`.
- Fix: open with the headline "Design decides what gets in." and turn it to "Bad data starts small." at "Bad", or keep the subtitle up until the first block lands (`kinds[0].at`).

### 16. [P3] confusion: The building metaphor is never drawn
- When: 147.6-153.6 s, `building` (element-300.jpeg, element-305.jpeg).
- What:
  - The watercolor has four doors, and there are four program chips, but the chips sit 140px below the building with no link to the doors.
  - Lighting only "web app" at "one app's front door" reads as "the rule protects the web app", which is the opposite of the point.
- Cause: `GateScene.tsx:105-127` (Spot at `y(300)`, chips at `y(588 + i*60)`).
- Fix: set the four chips in a row directly under the four doors. At "door", draw a small gate on the web-app door only; at "whole building", draw it across the building.

### 17. [P3] spacing: Orbiter figure: uneven arrows, an open-bottomed file box, and 4.45 never spoken
- When: 162.8-171 s (element-337.jpeg).
- What:
  - The arrow from "One program wrote" to the file is about 18px.
  - The arrow from the file to "Another read" is about 30px, and starts from a box that has a top rule but no bottom edge.
  - "1 lbf·s = 4.45 N·s, so every value read about 4.45 times too small" (14 words) is the scene's only number. It is never said, and it is at full strength for about 4 s.
- Cause: `OrbiterScene.tsx:15-17` (gaps of 30 and 42px), :115 (`borderTop` only), :146-151.
- Fix: set `FILE_Y = 484` and leave `B_Y` at 604, which gives equal 36px gaps. Add `borderBottom` to the file box, and add "about four and a half times off" to `factor`.

### 18. [P3] pacing: The "What it decides" vocabulary is flashed, then replaced
- When: 66.6-78.8 s, `questions` → `sql` (element-150.jpeg, element-158.jpeg).
- What: tables, columns, keys, relationships and constraints are the course's core terms. They appear unspoken, and the SQL column replaces them at 78.3 s ("constraints" is up for 3 s).
- Cause: `QuestionsScene.tsx:100-102` (fades at `toSql(i)`).
- Fix: keep "What it decides" and add the SQL as a third column at x ≈ 1500 instead of swapping.

### 19. [P3] spacing: "The data stays." floats under the line web
- When: 53.6-57.5 s, `outlives` (element-110.jpeg).
- What: the line sits at x ≈ 720, under where the eight leader lines converge, attached to neither the copies nor the chips.
- Cause: `CostScene.tsx:176` (`x={X0 + CARD_W + 40}`).
- Fix: place it at `x={X0}` directly under the second copy card, and move "The update anomaly" (:162) down 70px.

### 20. [P3] explanation: Part 1's anomaly is never shown fixed
- When: 108-118 s, `walk` (element-232.jpeg).
- What: Fig. 4's `customers.email` is exactly the cure for Figs. 1-2 (Ada's email stored once). The video never points at it, so Part 1 and Part 3 never meet.
- Cause: `JoinScene.tsx:88` marks only `id` and `name` on customers.
- Fix: at `walk`'s "own tables", mark `customers.email` with a note: "Ada's email, stored once." This also helps with finding 1.
