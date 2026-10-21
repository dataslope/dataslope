# DbDesign-5-RelationshipPatterns (0-245 s, whole video)

## Verdict
- The video is well built. Five shapes, each argued with real rows. The ERDs are clean, the crow's-foot ends are read aloud when first used (26.8-33.9 s), and every number on screen matches the lessons.
- The two confusing pictures:
  - The one-to-one "split" moves Linus's null profile into the new table, which contradicts "zero or one profile".
  - The org tree shows `manager_id 8` and `manager_id 18` but never any employee's own id, so the chain the narration describes cannot be followed.
- A stale label: "2 orders in one cell" stays up next to a cell that now holds three orders.
- The many-to-many scene opens on 4.7 s of near-empty page, then runs five beats with 0.35-0.40 s gaps.
- Pacing is otherwise comfortable (2.1-3.3 w/s). `grade` (3.26 w/s, two ideas) and `flip` (3.24 w/s) are the tightest.

## Findings
### 1. [P2] confusion: The profile "split" keeps a null profile row for Linus
- When: 163.5-167.0 s, beat `split` (element-330.jpeg, element-331.jpeg).
- What: "its own table" slides out with all four rows, including Linus's `null | null`, while Drew says "each user has zero or one profile". The moved table also has no `user_id`, so its rows are linked to users only by position. The ERD then replaces it at about 167 s.
- Why it matters: The picture shows the opposite of the point being made. A user with no profile should have no row in the profile table.
- Cause: `video/src/videos/db-relationship-patterns/WideScene.tsx:115-128`. The profile half is the same four rows, slid by `slide` (line 55). The `empty` rows are never collapsed.
- Fix: Give the rows in `empty` a `collapseAt: ownAt + 6` in the moved DbTable. Add a `user_id` column (1, 2, 4) to the moved half at `ownAt`, so "its own table" holds three rows that each name their user.

### 2. [P2] explanation: Org-tree nodes show only manager_id, so the chain can't be read
- When: 203.0-217.9 s, beats `tree` and `deep` (element-432.jpeg).
- What: The nodes read "Grace manager_id 1", "Priya manager_id 2", "Zara manager_id 8" and "Chidi manager_id 18". No node shows its own id, so nothing on screen says that 8 is Priya or 18 is Zara. Drew says "each row stores only its own manager".
- Why it matters: The numbers that prove the self-reference look arbitrary. Ids appear only later, in the alias scene, and that scene has no Priya, Zara or Chidi.
- Cause: `video/src/videos/db-relationship-patterns/SelfScene.tsx:73` (`sub = manager_id …` with no id).
- Fix: Change `sub` to `` `id ${e.id} · manager_id ${e.managerId ?? "null"}` ``. Alternatively, show the id in the chip's name line ("8 Priya").

### 3. [P2] accuracy: "2 orders in one cell" next to a cell holding three
- When: 47.0-49.8 s, beat `cell` (element-097.jpeg).
- What: After "every new order means editing Ada's row", Ada's cell changes to "1, 25, 31". The red tag under the table still says "2 orders in one cell".
- Cause: `video/src/videos/db-relationship-patterns/ListScene.tsx:124-126`. The tag text is fixed at `OTM.adaOrders.length` and is only removed at `fkAt - 4`. The cell swaps at `newAt + 4` (line 120).
- Fix: Give the tag `out={newAt + 2}`, and add a second tag "3 orders, and Ada's row edited" at `newAt + 6`.

### 4. [P2] spacing: Many-to-many opens with 4.7 s of two captions and nothing else
- When: 65.3-70.0 s, beat `cross` (element-131.jpeg to element-139.jpeg).
- What: Only "Many on both sides," and the grey captions "students" and "courses" are on screen while Drew says "A student takes lots of courses, and a course has lots of students". The first chip, Ada, appears at about 70 s.
- Why it matters: The general claim has no picture, and the specific names then arrive fast.
- Cause: `video/src/videos/db-relationship-patterns/CrossScene.tsx:128-149`. The chips appear at `adaAt - 4`, `graceAt - 4` and on each course name.
- Fix: Bring both student chips in at `studentAt + 6` and the three course chips at `coursesAt + 6`. Leave the links cued to the names.

### 5. [P2] pacing: Many-to-many argument: five beats with 0.35-0.40 s gaps
- When: 65.3-92.5 s, beats `cross` → `tangle` → `slot` → `flip` (3.24 w/s) → `one-side` (element-154.jpeg to element-185.jpeg).
- What:
  - Each beat adds a new step: the crossing links, "no parent", a one-slot table, the flipped table, and the conclusion.
  - The `flip` table and its "Grace?" chip build in about 4 s, and the conclusion follows 0.4 s later.
- Why it matters: This is the central argument of the unit ("one foreign key forces one side to be one"). It needs a beat to land after each failed slot.
- Cause: `video/src/videos/db-relationship-patterns/script.ts:137` (`tangle`, `pauseAfter: 0.4`), `:141` (`slot`, 0.35) and `:143` (`flip`, 0.4).
- Fix: Raise `pauseAfter` on `tangle` and `slot` to 0.8 and on `flip` to 0.7.

### 6. [P2] pacing: `grade` packs the new idea and its first counter-example into one fast beat
- When: 131.4-139.7 s, beat `grade` (3.26 w/s, 0.35 s gap) (element-270.jpeg to element-278.jpeg).
- What: "The row can hold facts of its own, too, like a grade" introduces relationship attributes. "Not on students, though: Ada got a B in Math and a C in History" follows in the same breath, as the hypothetical students table builds.
- Cause: `video/src/videos/db-relationship-patterns/script.ts:175-179`.
- Fix: Split the beat after "like a grade." into its own beat, with `pauseAfter: 0.6` before "Not on students, though…".

### 7. [P3] confusion: The question "which table holds the link?" is asked with the answer already highlighted
- When: 25.5-37.0 s, beats `many` → `where-in` (element-070.jpeg, element-075.jpeg).
- What: `orders.customer_id` carries an FK badge from 23 s and is highlighted blue at "just one" (about 25.8 s). Nine seconds later Drew asks "So which table holds the link?" and the screen asks "which side stores it?".
- Cause: `video/src/videos/db-relationship-patterns/OneManyScene.tsx:48` (`key: "FK"`) and `:72` (mark at `justOneAt`).
- Fix: Drop the `customer_id` mark here and move the highlight to ListScene's `fk` beat. If the entity kit allows, also hide the FK badge until `fk`.

### 8. [P3] spacing: The "manages" label touches the self-loop
- When: 199.5-217.9 s, beats `self` through `deep` (element-432.jpeg).
- What: The italic "manages" ends about 3px from the loop's vertical line.
- Cause: `video/src/videos/db-relationship-patterns/SelfScene.tsx:107` (`labelPos={[a[0] - LOOP - 96, …]}`, where the 22px label is about 92px wide).
- Fix: Change the offset to `a[0] - LOOP - 116`.

### 9. [P3] confusion: Omitted rows are not marked
- When:
  - PairScene, 124-131 s, beat `once` (element-259.jpeg): rows (1,10)…(2,12) are followed directly by Linus's (3,10), and then "49 rows in all".
  - UniqueScene, 180-190 s, beats `unique` and `unique-fix` (element-368.jpeg): profile ids 1, 2, 3 are followed directly by 16.
- What: The tables look contiguous, so "row forty-nine" and id 16 seem to come from nowhere.
- Cause: `video/src/videos/db-relationship-patterns/PairScene.tsx:122-125` and `video/src/videos/db-relationship-patterns/UniqueScene.tsx:94-96`.
- Fix: Insert a dimmed "⋮" row (or "… 44 more rows" and "… 12 more") before the new row in both tables.

### 10. [P3] confusion: The table reads "FK, unique" while it still holds Ada's second profile
- When: 185.5-187.5 s, beat `unique-fix` (tile 186.0 s, tile 187.0 s).
- What: The column tag switches to "FK, unique" at "unique". Row 16 (Ada, a duplicate `user_id` 1) stays yellow and accepted until "bounces".
- Cause: `video/src/videos/db-relationship-patterns/UniqueScene.tsx:88` (the tag at `uniqueAt`) against `:96` and `:106` (ghost and band-out at `bouncesAt`).
- Fix: Fade the yellow band out at `uniqueAt - 4` and ghost the row at `uniqueAt + 4`. Alternatively, cue the "FK, unique" tag to `bouncesAt`.

### 11. [P3] spacing: The UPDATE listing is crammed under the alias tables
- When: 230-245 s, beats `guard`, `accepted` and `next` (element-486.jpeg).
- What: The listing's top rule sits about 13px below the two tables' bottom rules, and it runs under the "m, the manager" table, so it reads as a table footer.
- Cause: `video/src/videos/db-relationship-patterns/GuardScene.tsx:33` (`LIST_Y = 720`).
- Fix: Set `LIST_Y` to 760, and limit the listing width to the e table (about 360) or start it under the result table.

### 12. [P3] spacing: Bridge beats show nothing new, and some frames sit mostly empty
- When:
  - `one-in`, 149.4-152.4 s: the grade scene only dims.
  - `self-in`, 190.5-193.1 s: the unique scene only dims (element-384.jpeg).
  - `cross-in` (61-65 s) is the exception: it previews the next shape.
  - Alias opens with only the headline at 217.9-220.0 s (element-436.jpeg to element-439.jpeg).
  - The list table sits in the left third, with about two thirds of the frame empty, for 11 s (38-49 s, element-097.jpeg).
- Fix:
  - At "splits one thing in two", draw a header-only `users` box that splits into two.
  - At "needs only one table", draw a header-only `employees` box with the loop, as `ListScene` does for `cross-in`.
  - Draw the alias's e table headers at `from`.
  - Set the list table at x≈560 with larger rows.

### 13. [P3] explanation: "all 48 pairings, 48 rows" is a number nobody mentions
- When: 113.0-115.4 s, beat `named` (element-228.jpeg).
- What: The scene shows four pairings and four rows, and the caption under it says 48 twice. Drew never mentions 48.
- Cause: `video/src/videos/db-relationship-patterns/JunctionScene.tsx:146-148`.
- Fix: Change the caption to "one row per pairing: 48 in all", or drop it, since PairScene's "48 rows in all" (118 s) introduces the number.

### 14. [P3] confusion: In the flipped table, `student_id 1` is not named, though `course_id 10` was
- When: 85-94 s, beats `flip` and `one-side` (element-185.jpeg).
- What: The first slot table labels 10 as "Math" in green. The flipped table shows `student_id 1` with no "Ada", and the narration is about whether Grace fits beside her.
- Cause: `video/src/videos/db-relationship-patterns/CrossScene.tsx:172-174`. The Tag exists only for the slot table.
- Fix: Add a matching `<Tag … color={OK_INK}>Ada</Tag>` under `fg`'s `student_id` cell at `flipRoomAt`.

### 15. [P3] other: ERD alignment and label consistency
- What:
  - One to many (23-37 s, element-075.jpeg): the `customers` and `orders` boxes sit at different heights (y(450) and y(430)), so the tops are visibly misaligned by about 22px.
  - Shapes (12-21 s, element-040.jpeg): the Self-reference box sits about 115px under its caption, against about 68px in the other three panels.
  - The kicker says "Four shapes" while the headline says "a few shapes".
  - Tree (203-218 s, element-432.jpeg): "CEO" is grey and right of Ada's chip, while "Intern" is red and left of Chidi's.
- Cause: `video/src/videos/db-relationship-patterns/OneManyScene.tsx:32,43`, `video/src/videos/db-relationship-patterns/ShapesScene.tsx:19` (`SELF_Y = 570`) and `:95`, `video/src/videos/db-relationship-patterns/SelfScene.tsx:133-141`.
- Fix:
  - Put both entities at y(440).
  - Set `SELF_Y` to 500 so the box sits under its caption like the others.
  - Make the kicker "The shapes" (or the headline "four shapes").
  - Put both role tags on the right, in the same ink.

### 16. [P3] explanation: The self-join is described but never written
- When: 217.9-225.7 s, beat `alias` (element-449.jpeg).
- What: "join the table to itself, as employee and as manager. A left join keeps Ada". The arrows show the matching, but the join condition (`e.manager_id = m.id`) and the difference between a left join and a plain join appear nowhere.
- Cause: `video/src/videos/db-relationship-patterns/GuardScene.tsx` has no listing or label for the join.
- Fix: Add a one-line label `ON e.manager_id = m.id` over the arrows at "join". Under the result, add "a plain join would drop Ada" next to her `null` at "keeps Ada".
