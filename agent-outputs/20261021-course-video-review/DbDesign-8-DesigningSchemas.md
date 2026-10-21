# DbDesign-8-DesigningSchemas (0-272.6 s, whole video)

## Verdict
- The video is solid and accurate. The store's diagram builds step by step against a rail that tracks the eight steps, every number matches PGlite and the lessons, and the narration mostly runs at 2.3-3.0 words per second with full 1.6 s scene gaps.
- The biggest problems:
  - The wide-table close (243-252 s) under-delivers. It opens on a near-empty page under a headline the narration hasn't reached yet, then crams five table chips into overlapping, truncated labels. It only shows column-name collisions, not the "tangled rules" the narration claims.
  - The two totals in Fig. 2 print a wrong "= 0.00" for up to 1.6 s.
  - The case study shows keys long before "Step five, keys", so step five adds nothing new.
  - The duplicate-key error and the zero-quantity line are muddled: no tried row is shown for the duplicate, its error sits under step six, and the zero line reuses the exact (1, 1) key just refused.
- Pacing is comfortable except in two places. The relate block (pairs → hidden → items: 2.94, 3.24 and 3.12 w/s with 0.35/0.30 s gaps) leaves product_categories about 1 s before the next idea. Expand → move → contract (0.3 s gaps, a 2.4 s "move" beat) holds the contracted schema for only about 1 s before the cut.
- Smaller visual glitches: a ping ring on an empty slot, a 5 px kink in the "owns" line, leftover washes from one step bleeding into the next, and multiply-blended washes turning olive.

## Findings

### 1. [P1] accuracy: Totals print "= 0.00" before they count up
- When: 153.5-154.2 s and 157.2-158.8 s, beat `history` (frames element-307.jpeg, element-316.jpeg)
- What: Each total line inks in with its result already showing as 0.00. "From its lines 2 × 10.00 + 1 × 24.00 = 0.00" shows for about 0.7 s. "From today's prices 2 × 12.00 + 1 × 24.00 = 0.00" shows in bold red for about 1.6 s, while Drew says "Total it from today's prices…". The values only count up on "forty-four" and "forty-eight". The count-up also passes through false partial sums (5.77, 43.36).
- Why it matters: For over a second the screen shows a false equation beside the true formula.
- Cause: `video/src/videos/db-designing-schemas/ErdScenes.tsx:266` and `:274` ink each line at `linesAt - 4` / `todayAt - 4`. The results at `:270` and `:278` use `count()` (`:163-166`), which reads 0 until `fortyFourAt - 6` / `fortyEightAt - 6`.
- Fix: Give the result span `opacity: ease(frame, fortyFourAt - 6, 6)` (and the same with `fortyEightAt`), so no number shows before its count starts. Better, drop the count-up and ink the final value on the word.

### 2. [P1] spacing / explanation: The wide-table segment: empty page, overlapping chips, and a claim the visual doesn't show
- When: 243.3-252.5 s, beats `scale` and `apart` (frames element-488.jpeg, element-494.jpeg, element-496.jpeg, element-503.jpeg)
- What:
  - (a) From 243.3 to 246.1 s the page holds only the headline "One wide table,". Drew is saying "And clear design keeps paying off as you grow", and doesn't say "one wide table" until 248.3 s.
  - (b) The five table chips arrive on "grow." (246.1-246.6 s) and start cramming on "Cram" at 246.6 s. Each reads for about 0.5 s before collapsing into overlapping, truncated chips ("cust", "orde", "orde", "prod"). At 248.0 s those chips sit on top of the strip's header as it fades in.
  - (c) The strip shows only column names. It starts panning at once, so the customers columns leave within about 1 s. The only "tangle" shown is "18 columns, and 4 of them called id". The narration says "every rule gets tangled together", and design-and-scale.mdx:40-43 says god-tables have "many nullable columns, repeated groups, and confusing rules". None of that is shown.
- Why it matters: The closing argument rests on this figure, and for 9 s it is an empty page, then a pile of clipped labels, then a list of names.
- Cause:
  - `video/src/videos/db-designing-schemas/ScaleScene.tsx:76`: the headline is at `scaleFrom - 6`.
  - `:87-99`: the chips arrive at `growAt - 4 + k*4`, cram at `crammAt - 2` over 18 frames, and only leave at `wideAt - 6`.
  - `:55-58`: the pan starts at `wideAt - 6`.
- Fix:
  - Cue the headline to `crammAt`.
  - Bring the five chips in spread out from `scaleFrom + 10`, so they read for about 3 s. Fade them fully before `stripIn` (`gone` at `wideAt - 14`).
  - Hold the strip still for about 1.5 s before panning.
  - Add two data rows under it (Ana's two order lines, with her email and the category columns repeated or null), and mark the repeated email and the nulls when Drew says "tangled".

### 3. [P2] accuracy / confusion: The zero-mugs line reuses the key just refused as a duplicate, with no column names
- When: 120.1-124.4 s (duplicate error), then 126.7-131.6 s, beat `rules` (frames element-244.jpeg, element-256.jpeg, element-262.jpeg)
- What:
  - At 120.1 s the screen says "Key (order_id, product_id)=(1, 1) already exists". Six seconds later the "zero mugs" line is "A new line for order_items (1, 1, 0, 12.00)", which is the same (1, 1) pair.
  - In the store on screen, that row would break the primary key as well as the CHECK. It was only refused cleanly because `check.mjs` ran it in a separate, empty database.
  - The tuple also has no column names, so the viewer has to guess that the third value is quantity.
- Why it matters: A careful viewer will wonder whether the line was refused for the zero or for the duplicate.
- Cause: `video/src/videos/db-designing-schemas/check.mjs:230` inserts `(1, 1, 0, 12.00)` into `QUANTITY_SETUP` (`:91`), not into the store's data (`:86-88`, where order 1 already holds product 1). `ErdScenes.tsx:105-116` prints the tuple from the DETAIL line (`:123`).
- Fix: Insert into the store's database with a pair it doesn't hold. Add an order 2 for Ben in check.mjs and try `(2, 1, 0, 12.00)`. Draw the tried row as a one-row `DbTable` with the `ITEM_COLS` headers, rather than a bare tuple.

### 4. [P2] pacing / explanation: The duplicate-key error comes with no tried row, isn't read, and stays on into step six
- When: 120.1-124.4 s, beats `keys` → `rules` (frames element-241.jpeg, element-244.jpeg, element-246.jpeg)
- What:
  - The ERROR and DETAIL box (about 16 words of mono) appears on "twice" at 120.2 s, the last word of `keys`.
  - After a 0.35 s gap, Drew starts "Step six turns rules into constraints", and the rail switches to "6 Add constraints" at 120.7 s.
  - The primary-key error stays on screen until 124.4 s.
  - Unlike the zero-mugs case, the row that was tried is never shown.
- Why it matters: The viewer has to read a primary-key error while hearing about the next step, and the rail labels it "Add constraints".
- Cause: `video/src/videos/db-designing-schemas/ErdScenes.tsx:95-103` (`at={twiceAt - 2}`, `out` at `rules` "quantity" - 4); `StepsLayer.tsx:43` turns the rail at `beat("rules").from`; `script.ts` gives `keys` a `pauseAfter` of 0.35.
- Fix: Show the tried row `(1, 1, 1, 12.00)` (check.mjs:221) under the diagram on "same product" (118.2 s). Bring the error in on "twice". Set `pauseAfter: 1.2` on `keys`, and take the error out at `beat("rules").from - 6`.

### 5. [P2] confusion: Keys appear long before "Step five, keys"
- When: PK badges from 64.9 s (`entities`), UK email at 71.8 s (`facts`), FK customer_id at 78.8 s (`pointer`), PK, FK pairs at 98.2 s and 108.9 s. Step five is 113.1-120.5 s (frames element-148.jpeg, element-224.jpeg, element-236.jpeg).
- What: Every box arrives in step two with "PK id", and step three adds "UK email" and "UK name". order_items arrives in step four already marked "PK, FK" on both columns. So when Drew says "Step five, keys. Order items is keyed by the pair", nothing new appears; the only change is a blue wash over badges that have been there for 5-50 s. The video also never says PK or UK aloud.
- Why it matters: The point of the segment is "ask the questions in order". Here the diagram answers step five during steps two to four, so the step reads as empty.
- Cause: `video/src/videos/db-designing-schemas/data.ts:61-74` puts the key badges on the columns. `video/src/editorial/erd.tsx:207` draws a badge with its row (`opacity: c.key ? 1 : 0`) and has no separate cue for it.
- Fix: Add a `keyAt` prop to `Entity` that eases the badge's opacity in. In `StoreErd.tsx`, cue the PK and UK badges to `keysAt + i*4` and the order_items and product_categories "PK" half to `pairAt`. Leave the FK on `customer_id` at "points", where the pointer beat introduces it.

### 6. [P2] pacing: Relate block: the junction table gets about 1 s, and the key idea is delivered at over 3 w/s
- When: 93.1-111.5 s, beats `pairs` (2.94 w/s, gap 0.35), `hidden` (3.24 w/s, gap 0.30) and `items` (3.12 w/s) (frames element-197.jpeg, element-199.jpeg, element-212.jpeg)
- What:
  - product_categories lands on its own name at 98.2-98.8 s.
  - The headline "Many to many: a table of pairs." is replaced by "A link" at 99.4 s, so the new table and its explanation share the screen for about 1 s.
  - Next comes the case study's main move: a relationship with facts of its own becomes a table. It is delivered as two dense beats with 0.30 s between them.
- Why it matters: Two kinds of many-to-many are contrasted back to back with no time to absorb the first.
- Cause: `video/src/videos/db-designing-schemas/script.ts` sets `pauseAfter: 0.35` on `pairs` and `0.3` on `hidden`. `ErdScenes.tsx:67` takes the headline out at `hiddenFrom - 6`.
- Fix: `pauseAfter: 0.9` on `pairs` and `0.7` on `hidden`.

### 7. [P2] pacing: Expand → move → contract is rushed and the finished schema holds about 1 s
- When: 228.9-243.2 s, beats `widen`, `move` and `contract` (gaps 0.30 s each) (frames element-471.jpeg, element-484.jpeg, element-486.jpeg)
- What:
  - The whole "Move the data across, then the code" phase is a 2.4 s beat. Its only visual is two dots that each travel for 26 frames (235.3-236.4 s), with no rows; "the code" is just a highlight.
  - On "remove" the tasks box is swapped for a fresh box that rebuilds itself. At 242.0 s (element-484) its "title" row is half-clipped by the growing box, and the "||" end of the tasks → task_assignees line floats about 20 px below the box.
  - The finished state (tasks with id and title only) completes at about 242.3 s, and the scene starts fading at about 243.2 s.
- Why it matters: The three phases come too fast to separate, and the end state, which is the point, barely reads.
- Cause: `video/src/videos/db-designing-schemas/ExpandScene.tsx:77` sets `swapAt = removeAt + 14`; `:103-111` remounts `tasksAfter`, which re-runs its build; `:135` gives each dot 26 frames; `script.ts` sets `pauseAfter: 0.3` on `widen` and `move`.
- Fix: `pauseAfter: 0.7` on `widen` and `move`; dots at 45 frames each. Collapse the struck owner_id row in place (shrink the existing box at `removeAt + 6`) instead of remounting, so the end state lands at about 241.5 s and holds about 1.7 s.

### 8. [P2] other: A ping ring fires on an empty slot
- When: 190.1-190.6 s, beat `risky` (frame element-380.jpeg)
- What: The five "leans on its shape" rings fire on "shape" (189.7 s). The fifth ring draws an empty circle below "Tests and fixtures", because "People's workflows" doesn't arrive until "habits" (190.6 s). The other rings are drawn across the chip text.
- Why it matters: It is a stray mark on empty paper, and it reads as a glitch.
- Cause: `video/src/videos/db-designing-schemas/ChangeScene.tsx:177` uses `<Ping … at={shapeAt + i * 3} …>` for all five dependents.
- Fix: Ping only `i < 4` on "shape", and ping the fifth at `leanAt[4] + 8`. Centre the rings on the leader dots (`depX - 12`) rather than at `depX + 90` over the text.

### 9. [P3] confusion: Step six's red "refused" marks stay on through step seven
- When: 131.9-138.1 s, beat `copy` (frames element-264.jpeg, element-272.jpeg)
- What: The quantity row's red outline, red wash and "> 0" from step six stay on screen for 6 s into "Step seven, normalize: every fact in one place", while the rail already shows "7 Normalize".
- Why it matters: The previous step's error colour sits over the normalize step.
- Cause: `video/src/videos/db-designing-schemas/StoreErd.tsx:260` (`QuantityMark out={copiesAt}`) and `:274` (`RowWash … out={copiesAt}`).
- Fix: Take both out at `n.beat("copy").from - 6`.

### 10. [P3] spacing: The orders box has a blank row for 9 s
- When: 69.6-78.8 s, beats `facts` and `pointer` (frame element-148.jpeg)
- What: "status" arrives under an empty row slot that customer_id fills only on "points". The orders box looks like it has a double-height id row.
- Why it matters: It reads as a layout bug.
- Cause: `video/src/videos/db-designing-schemas/StoreErd.tsx:167` cues `status` at `eachFactAt + 10`, ahead of `customer_id` at `pointsAt - 2`. The box grows to its last arrived row.
- Fix: Cue `status` to `pointsAt + 6`, after customer_id.

### 11. [P3] confusion: Leftover pointer washes turn olive under the "how many" washes
- When: 84.2-89.0 s, beat `relate` (frame element-174.jpeg)
- What: During "how many connect to how many?", the pointer arrow from the previous beat and its blue washes (customers id, orders customer_id) are still up. The yellow multiply washes over them produce olive-green rows, a colour that appears nowhere else.
- Why it matters: It adds a third, meaningless colour, and the pointer stays up under a new question.
- Cause: `video/src/videos/db-designing-schemas/StoreErd.tsx:168` (customer_id mark `out: placesAt + 10`), `:173` (arrow `out={placesAt}`), `:266` (wash `out={placesAt - 6}`), under the washes at `:268-269`.
- Fix: End all three at `n.beat("relate").from - 6`.

### 12. [P3] explanation: The crow's-foot ends are never tied to the words
- When: 87.9-92.5 s, beat `relate` (frame element-182.jpeg)
- What: "One customer places many orders… each order has exactly one customer" washes the whole orders and customers boxes. The "||" and "o<" ends, which encode exactly those words, are never pointed at. The "o" (zero or many) is never mentioned.
- Why it matters: The notation is the lasting takeaway of step four, and it is left for the viewer to decode.
- Cause: `video/src/videos/db-designing-schemas/StoreErd.tsx:187-189` wash rows instead of marking the line ends.
- Fix: Put a `Ping` on `lines.places`' last point at "many orders" and on its first point at "exactly one", alongside or instead of the box washes.

### 13. [P3] pacing: The v4 and v5 version chips flash, and the schema stops at v3
- When: 177.1-178.7 s, beat `change` (frame element-380.jpeg)
- What: The "v3 projects", "v4 labels" and "v5 history" chips arrive 0.4 s and 1.2 s apart. The schema below grows only for v2 (due_on) and v3 (projects); labels and history are never drawn.
- Why it matters: Two of the five versions have nothing behind them.
- Cause: `video/src/videos/db-designing-schemas/ChangeScene.tsx:55-61` (chips) and `:150-162` (only tasks and projects).
- Fix: Add a `labels` box and a `task_history` box on "labels" and "history", or drop v4 and v5 from the narration and the chips.

### 14. [P3] confusion: Yellow means "fact" in the sentences and "connect" in the key
- When: 54.0-61.6 s, beats `contains` and `nouns` (frame element-120.jpeg)
- What: Yellow marks "quantity" and "the price charged". Then the key line under the sentences puts yellow on "connect" ("verbs become how they connect"), so the only yellow in the key labels the verbs. "a name and a price", the product's facts, are never marked.
- Why it matters: The key gives yellow the wrong meaning.
- Cause: `video/src/videos/db-designing-schemas/RequirementsScene.tsx:119` (`<Mark at={connectAt}>connect</Mark>`, default yellow) and `:42` (name and price as plain text).
- Fix: Drop the Mark on "connect". Add a third key item in yellow, "facts become columns", and mark "name" and "price" as facts too.

### 15. [P3] spacing: Kink in the "owns" line
- When: 222.9-241.4 s, beats `expand` through `contract` (frame element-468.jpeg)
- What: The users → tasks line steps about 5 px halfway across (x≈570), because users.id and tasks.owner_id aren't level.
- Why it matters: It looks like a drawing error.
- Cause: `video/src/videos/db-designing-schemas/ExpandScene.tsx:40-41`: users at `y(380)`, tasks at `y(330)`. The row midpoints differ by `h(50) - h(46)`.
- Fix: Put users at `y(376)`, which is 330 plus `ENTITY.row` (46).

### 16. [P3] confusion: The "facts of the link" box floats free
- When: 103.4-108.8 s, beat `hidden` (frame element-212.jpeg)
- What: The orders ↔ products many-to-many line is removed at the same moment the dashed "facts of the link" box appears. For 5 s the box connects to nothing.
- Why it matters: The "link" it describes is no longer drawn.
- Cause: `video/src/videos/db-designing-schemas/StoreErd.tsx:217` (`out={ownAt - 4}`) and `:219-247` (box from `ownAt - 4`).
- Fix: Keep the `ordProd` line until `itemsAt - 2`, so the box sits on the line it describes.

### 17. [P3] explanation: Rail wording doesn't match the narration
- When: 25-36 s (`steps`) and 67.9-84.0 s (`facts` and `pointer`) (frames element-078.jpeg, element-148.jpeg)
- What: Drew says "Find the entities, and their facts" and "test it with real rows". The rail says "Identify attributes" and "Review with examples". "Attribute" is never said, even while step 3 is lit and the narration talks about facts.
- Why it matters: The viewer has to map "facts" onto "attributes" unaided.
- Cause: `video/src/videos/db-designing-schemas/parts.tsx:441-450` (lesson labels) against `script.ts` `steps` and `facts`.
- Fix: Change the narration to "Find the entities, and their attributes, the facts about them", or relabel step 3 "Identify attributes (facts)".

### 18. [P3] explanation: "See what breaks" lights a total the design doesn't produce
- When: 159.0-169.8 s, beats `history` and `review` (frame element-337.jpeg)
- What: Drew says "History WOULD quietly rewrite itself", but the label reads "history, rewritten", in the past tense. On "see what breaks", the whole "From today's prices … 48.00" line is washed red, although this design keeps unit_price precisely so that nothing breaks. The counterfactual (without the copy, 48 is the only answer) is never said.
- Why it matters: It can read as if the finished schema itself fails review.
- Cause: `video/src/videos/db-designing-schemas/ErdScenes.tsx:275` and `:280` (labels) and `:250-263` (red band).
- Fix: Relabel the line "Without the copy" and the note "would rewrite history". Add "Without that copy, forty-eight is all it could say" to `history`.

### 19. [P3] spacing: Half-empty pages while the narration explains
- When: 193.3-208.4 s, beats `priority` and `why` (frame element-410.jpeg); also 4.6-25 s, beats `open` to `steps` (frame element-024.jpeg)
- What: In the required-column scene everything sits left of x≈1120 for 15 s, and the right half is bare until the step list arrives. The opening scene's right half is empty for 20 s until the steps start.
- Why it matters: Space goes unused while the figure stays small.
- Cause: `video/src/videos/db-designing-schemas/RequiredScene.tsx:14` puts `STEPS_X = 900` content in only from `emptyAt`. The scene has no spot illustration.
- Fix: Put the ALTER that was tried (`ADD COLUMN priority TEXT NOT NULL`) at `STEPS_X` on "required" and remove it at `stepsAt`.

### 20. [P3] other: Fig. 2 layout and figure numbering
- When: 147.2-169.8 s (frame element-324.jpeg)
- What:
  - The order_items table ends at x≈746 and the products table at x≈648, so the two tables don't share an edge.
  - The order_items and products ERD boxes from Fig. 1 stay beside Fig. 2 with no label, so they read as part of Fig. 2.
  - Part 3's figures (the tasks table, the tracker ERD, the assignees ERD, the wide table, and the returning store ERD) have no figure labels at all, after Part 2 numbered two figures.
- Why it matters: The tables look misaligned and the figure labelling is inconsistent.
- Cause: `video/src/videos/db-designing-schemas/parts.tsx:589-591` (columns sized to their content); `ErdScenes.tsx:151-159`.
- Fix: Pad the products table's `current_price` column so both tables end at the same x. Either number the Part 3 figures or drop the numbers from Fig. 1 and Fig. 2.
