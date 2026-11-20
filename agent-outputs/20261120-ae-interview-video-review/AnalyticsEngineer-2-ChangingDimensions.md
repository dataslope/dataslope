# AnalyticsEngineer-2-ChangingDimensions (8:03)

## Verdict
- A strong, coherent video. Customer 42's timeline carries Types 1, 2 and 3 and the late fact as one figure. Every number I checked matches `results.json` and the page's data, and I re-derived the hard ones by hand: the four region pairs of 2022 revenue, 24 rows becoming 44, +76%, 700.00 of 1,110.00, and 50,000 growing to 122,000.
- The worst defect is in the bridge. "Every table here is rebuilt each day, in order: the snapshot first" contradicts what the snapshot answer said two and a half minutes earlier: "It can't be rebuilt from the source, so protect it like source data." Rebuilding a snapshot is how its history gets lost.
- The dbt snapshot answer has two smaller accuracy problems in its figures. First, versions are stamped "run 1" and "run 2" beside a YAML that sets `strategy: timestamp`, but with that strategy dbt stamps each version with the source's `updated_at`. Second, the model step maps `dbt_valid_to` straight onto `valid_to`, leaving the null the video argued against in Question 2. That breaks the BETWEEN join, and it is the obvious follow-up question.
- Pacing is comfortable: 2.0 to 3.2 words a second, at least 0.6 s between beats, and every scene holds 1.3 s or more before its cut. Results stay up long enough, except Type 2's load result, which gets about 2.3 s.
- As interview answers they hold up and follow the page, and several go past it: per-column types, the join trap, the arrival-based load window, and the rows to watch on -1. Apart from the snapshot model, none of them stops short of the obvious follow-up.

## Findings

### 1. [P1] accuracy: the bridge says every table, the snapshot first, is "rebuilt each day"
- When: 466.2-474.0 s, beat `next` (element-467.jpeg, element-475.jpeg)
- What: the narration says "Every table here is rebuilt each day, in order: the snapshot first, then the dimensions, then the facts that look them up." The screen heads the three boxes "Rebuilt every day, in order", with Snapshot as the first box. At 260-270 s (`snap-keep`) the same video said the snapshot "can't be rebuilt from the source, so protect it like source data". A Type 2 dimension kept incrementally can't be rebuilt either.
- Why it matters: a viewer leaves with "snapshots are rebuilt daily". That is the mistake (a full refresh) that wipes a snapshot's history, and the video contradicts itself.
- Cause: `video/src/videos/ae-changing-dimensions/script.ts:414-415` (the `next` text); `RapidScene.tsx:236` ("Rebuilt every day, in order").
- Fix: split `next` at "Running that order", so the second half is cut from the take for free. Reword the first sentence to "Every table here is updated each day, in order: the snapshot first, then the dimensions, then the facts that look them up." and re-voice only that sentence (about 122 characters). On screen, use "Updated every day, in order".

### 2. [P2] accuracy: the snapshot's versions are stamped by run, under the timestamp strategy
- When: 216-242 s, beats `snap`, `snap-strategy` (element-231.jpeg, element-241.jpeg); and 263-278 s, `snap-keep` and `snap-model` (element-277.jpeg)
- What: `snap_customers` shows East `dbt_valid_from` "run 1", `dbt_valid_to` "run 2", and West "run 2", null. This sits beside the page's YAML with `strategy: timestamp` and `updated_at: updated_at` highlighted. With the timestamp strategy, dbt sets a new version's `dbt_valid_from` to the source row's `updated_at` and closes the old version at that same value. A run time is what the check strategy stamps, and what a hard-delete invalidation stamps. The flow box later repeats the run framing: "42 · East · run 1 to run 2", "42 · North · run 2 to run 3".
- Why it matters: the figure teaches that a version's window is only as fine as the run schedule. "What does `dbt_valid_from` hold?" is a common follow-up, and the answer this figure gives is wrong for the strategy on screen.
- Cause: `SnapScene.tsx:18-24` (the drawn `SNAP` rows); `SnapScene.tsx:226-227` (the snapshot box's two lines).
- Fix: stamp the cells with the source's timestamps: East "East's updated_at" / "West's updated_at", West "West's updated_at" / null. Move the table left (TX 900 to 800) so the wider cells clear the camera. In the flow box, write "42 · East · closed by North" and "42 · North · closed at run 3". The second is correct as written, because `invalidate` stamps the run's time. No narration changes: "stamped with dbt valid from and dbt valid to" stays true.

### 3. [P2] answer: the dimension model renames `dbt_valid_to` as is, and brings back the null Question 2 argued against
- When: 270.5-278.5 s, beat `snap-model` (element-277.jpeg)
- What: the model box reads "dbt_valid_from → valid_from" and "dbt_valid_to → valid_to", and the note under it says "Each version's window". The snapshot's current row has `dbt_valid_to` null; the table showed it at 228-242 s, and the page says so ("The current version of a row is the one whose `dbt_valid_to` is NULL"). At 113-122 s the video argued for 9999-12-31 "rather than a null", so that "one between test" covers every version. Renamed as drawn, `order_date BETWEEN valid_from AND valid_to` matches no current version, so every order since a customer's last change falls out of an inner join.
- Why it matters: "how do you turn the snapshot into the dimension" is the natural next question, and the figure answers it with the bug the video itself warned about.
- Cause: `SnapScene.tsx:250-252` (two mapping lines, `boxH = h(150)` at `:84`).
- Fix: add a third line to the model box, "null → 9999-12-31", in the yellow highlight, and raise `boxH` so the three boxes and the notes under them keep their spacing. The narration ("its two timestamps become each version's window") then holds as said.

### 4. [P2] confusion: Type 0's "ignored for this column" ends up captioning the Type 2 region row
- When: 434.3-441 s, beat `r-t0` (element-435.jpeg, element-440.jpeg)
- What: "Later loads: ignored for this column" appears on "ignore whatever later loads say", well below the `first_channel` band. Four seconds later the region's two versions and the year axis grow into the gap. The note ends up under the region row, the Type 2 column whose later loads are not ignored.
- Why it matters: the one sentence that defines Type 0 reads as a caption for the column that does the opposite.
- Cause: `RapidScene.tsx:77` (the note's `y` is `axisTop + c.h(56)`, under the region timeline), with `fixedTop`/`verTop` at `:50-51`.
- Fix: put the note directly under the `first_channel` band (`fixedTop + bandH + c.h(18)`), and move the region band and its axis down to make room (`verTop` about `c.y(640)`).

### 5. [P3] pacing: Type 2's second statement and its result clear after about 2 s
- When: 138.9-142.1 s, beats `t2-load` to `t2-trap` (element-139.jpeg, element-141.jpeg)
- What: the INSERT listing starts typing on "then insert the new version" (138.9 s). Its "1 row" badge and the green "= the page's table (0 rows differ)" land at 139.7 s, and all of it starts clearing at 142.1 s, 0.5 s into the trap beat. That is the scene's proof that the two statements rebuild the page's table.
- Why it matters: the result of the "how is it implemented" half of the question is on screen for less time than it takes to read.
- Cause: `script.ts:261-264` (`t2-load`, `pauseAfter: 0.7`); `Type2Scene.tsx:120` (`loadOut = trapAt + 14`).
- Fix: `pauseAfter: 1.4` on `t2-load`. This is timing only, so nothing is re-voiced.

### 6. [P3] confusion: the trap's red dots look like two more orders
- When: 145.6-153.4 s, beat `t2-trap` (element-150.jpeg)
- What: each order is linked by a red dashed line to a red dot on the other version's top edge. 5001's dot lands in late 2023 in the West band, and 5002's in late 2022 in the East band. Both look like order pins at dates no order has.
- Why it matters: the picture should say "this order also matches that version", but it reads as two extra orders.
- Cause: `Type2Scene.tsx:263-270` (the circles at `l.x1`, 30% and 78% along the bands).
- Fix: drop the dots, and end each dashed line under the other version's label, inside its band, so the line points at the version rather than at a date.

### 7. [P3] confusion: "Today's total: 800.00" is left under the restatement lines
- When: 411-420.5 s, beat `measure-restate` (element-419.jpeg)
- What: when the INSERT listing clears for "When the rules change", the green "Today's total: 800.00" stays where it was. It now sits under "Version the fact" and "Or keep a restated column", as if it were their result.
- Why it matters: a result from one answer is shown as the outcome of a different answer.
- Cause: `MeasureScene.tsx:117` (the note has no `out`; the listing beside it leaves at `rulesAt - 4`).
- Fix: `out={rulesAt - 4}` on the note, so it leaves with the listing whose sum it is.

### 8. [P3] explanation: "the page's" on screen refers to a page the viewer has not seen
- When: 124-132 s, beat `t2-join` (element-131.jpeg); 139.7-142.1 s, beat `t2-load` (element-141.jpeg)
- What: the listing title reads "The page's point-in-time join", and the load's result reads "= the page's table (0 rows differ)". A viewer watching the video alone has no page.
- Why it matters: both labels point at something off screen.
- Cause: `Type2Scene.tsx:330`, `:384`.
- Fix: "The point-in-time join"; "= the two versions above (0 rows differ)". The timeline above shows 1001 East and 1002 West.

### 9. [P3] explanation: Question 1's legend names Type 2 a question early
- When: 60-67 s, beat `t1-history` (element-066.jpeg)
- What: the paired bars are labelled "as it was (Type 2)" and "as it is (Type 1)". Type 2 is not introduced until Question 2, at 93 s, and the narration here never says "Type 2".
- Why it matters: it is a small forward reference, at the one point where the viewer is learning what Type 1 loses.
- Cause: `Type1Scene.tsx:241`.
- Fix: "as it was (history kept)".

### 10. [P3] spacing: the join listing's title sits 8 px above its result table's title
- When: 124-132 s, beat `t2-join` (element-131.jpeg)
- What: "The page's point-in-time join" is set at y 544 and "Its rows for Acme" at y 552. The two titles and their top rules sit side by side but do not line up. The trap pair later in the same scene lines up to within 3 px.
- Why it matters: it is a visible misalignment in a two-column layout that is otherwise on one line.
- Cause: `Type2Scene.tsx:108` (`listTop = y(LOW - 10)`, while the table is at `low`).
- Fix: `listTop = low`, as the trap's listing has.
