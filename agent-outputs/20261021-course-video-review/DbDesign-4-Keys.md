# DbDesign-4-Keys (0-220 s, whole video)

## Verdict
- The video is solid. Every table, statement and error comes from a real run and matches the lessons. The argument flows well from identity to natural or surrogate keys, then foreign keys, then ON DELETE, and nearly every animation lands on its word.
- The biggest teaching flaw is order. The foreign key shows up as a "PK, FK" badge at 52 s and as a "foreign key constraint" error at 117 s, but it is only defined at 131 s.
- The biggest visual problems:
  - The ON DELETE scene draws all six tables before any rule is named, then runs three rules back to back.
  - Two scenes open on a blank or near-blank page: roster at 48.6 s and choose at 194.6 s.
  - The hook shows only a headline for 5.5 s.
  - Every PK/FK/UNIQUE pill is 17px, under the 19px floor.
- Pacing is comfortable overall (2.3-3.4 w/s). Three runs are tight: `pair`→`stable`→`kinds-in`, `fk`→`parent`→`many` and `restrict`→`cascade`→`setnull`. Each has 0.30-0.35 s gaps between new ideas, and on-screen errors are dimmed before they can be read.

## Findings
### 1. [P2] explanation: Foreign keys appear 80 s before they are defined
- When: 52.0-70.0 s, beats `roster`-`kinds-in` (element-114.jpeg, element-130.jpeg). Also 116.5-119.2 s, beat `email` (element-237.jpeg). The definition comes at 131.0-138.5 s, beat `fk`.
- What: The roster ERD labels `enrollments.student_id` and `course_id` "PK, FK" and draws crow's-foot lines to students and courses. The email scene's error reads `violates foreign key constraint "orders_user_email_fkey"`. The narration says "foreign key" for the first time at 138 s.
- Why it matters: A viewer meets "FK" and "foreign key constraint" as unexplained jargon in Part 1 and Part 2.
- Cause: `video/src/videos/db-keys/RosterScene.tsx:76-77` (`key: "PK, FK"`). `video/src/videos/db-keys/EmailScene.tsx:139-148` (the ErrorBox prints the full message line).
- Fix: Use `key: "PK"` for both roster columns, since `stable` already says "other tables point at it". In the email ErrorBox, drop the `message` line (or dim it to 30%) and keep only the highlighted DETAIL, "Key (email)=(ada@old.example) is still referenced from table "orders"".

### 2. [P2] pacing: ON DELETE: six tables before any rule, then three rules with no breath
- When: 167.4-194.8 s, beats `delete`, `restrict`, `cascade`, `setnull` (element-346.jpeg, element-387.jpeg).
- What: All six tables and their pointer arrows draw during "Referential integrity means every pointer points at something real" (168-172 s), before any rule is named. RESTRICT, CASCADE and SET NULL then follow with 0.35 s gaps (174.3→174.6, 179.7→180.1, 185.7→186.1), each acting on a different column. The finished frame holds 6 tables, 3 statements, an 8-line error box and 2 replies.
- Why it matters: The eye has to find the right column each time and has no pause to absorb one behaviour before the next starts. This is the densest frame in the video.
- Cause: `video/src/videos/db-keys/DeleteScene.tsx:106` (`tablesAt = [from + 2, pointerAt - 4, pointsAt]`). `video/src/videos/db-keys/script.ts:225-234` (`pauseAfter: 0.35` on `restrict` and `cascade`).
- Fix: Cue each column's tables to its own rule: `tablesAt = [restrictAt - 12, cascadeAt - 12, setNullAt - 12]`. Keep only the three "ON DELETE ?" headings up during `delete`. Raise `pauseAfter` on `restrict` and `cascade` to 0.8.

### 3. [P2] spacing: Scenes open on a blank or near-empty page
- When:
  - Choose: 194.6-196.3 s, beat `choose` (element-390.jpeg to element-392.jpeg are fully blank). "So which?" plays over an empty page, and only the root box shows until about 198 s.
  - Roster: 48.6-49.7 s, beat `roster` (element-098.jpeg, element-099.jpeg are blank).
  - Smaller cases: email at 110.3-112.7 s shows only "When the key itself" (element-222.jpeg), and kinds at 70.1-73.5 s shows only the headline and the "Natural key" label.
- Why it matters: An empty page reads as a dropped frame or a broken cut.
- Cause: `video/src/videos/db-keys/ChooseScene.tsx:65` (Headline at `askAt - 6`) and `:69` (root at `askAt`). `video/src/videos/db-keys/RosterScene.tsx:122` (Headline at `twoColsAt - 6`). Every other scene brings its headline in at `from - 6`.
- Fix: Bring the Headline in at `from - 6` in ChooseScene and RosterScene, and the ChooseScene root box at `from + 6`. In EmailScene, draw the empty `users` and `orders` headers at `from` instead of `keyAt - 6`.

### 4. [P2] spacing: The hook is 5.5 s of headline on an empty page
- When: 4.6-10.4 s, beat `hook` (element-010.jpeg to element-020.jpeg).
- What: Only "Every line ends on a row." is on screen while Drew says "Every line between two tables ends on a row. So how do you say WHICH row?". No table and no line appear until `taylors`.
- Why it matters: The opening idea (a line that lands on a row) is easy to draw, and the opening seconds are spent on blank paper.
- Cause: `video/src/videos/db-keys/IdentityScene.tsx:122-176`. Every table, the Fig. 1 label and the arrows wait for `customersAt` in `taylors`.
- Fix: Draw the empty `orders` and `customers` headers at `hookFrom + 10`, with one dashed line between them that forks at "WHICH". Let `taylors` then fill the rows.

### 5. [P2] pacing: The roster refusal is dimmed in 2 s, and "a key should never change" is rushed
- When: 62.0-66.4 s, beats `pair` → `stable` (element-124.jpeg, then element-128.jpeg already dimmed).
- What: The duplicate-key ErrorBox (17 unread words) appears at "only once" (about 62.0 s) and is dimmed at "never change" (about 64.0 s). `stable` (3.37 w/s, 0.30 s gap) introduces a new rule, and the only picture for it is the two relationship lines turning blue. `kinds-in` follows at 3.35 w/s.
- Why it matters: The refusal that proves the composite key works is never readable, and "keys must be stable" goes by as an aside.
- Cause: `video/src/videos/db-keys/RosterScene.tsx:184-191` (ErrorBox `at={onceAt + 4}`, `dim={neverAt}`). `video/src/videos/db-keys/script.ts:142-146` (`pauseAfter` 0.4 and 0.3).
- Fix: Set `pauseAfter: 1.0` on `pair` and dim the table, note and error at `pointAt` instead of `neverAt`. Set `pauseAfter: 0.6` on `stable`.

### 6. [P2] pacing: FK, parent/child and many-side arrive in three beats with 0.30 s gaps
- When: 131.0-148.7 s, beats `fk` → `parent` (3.27 w/s) → `many` (element-294.jpeg, element-298.jpeg).
- What:
  - The first beat defines foreign key. The second names parent and child within 5 s. The third covers the many side and "copies nothing else".
  - The struck `customer_name` and `customer_email` rows are visible for only about 2 s (146.2-148.2 s) before "Just customer_id…" replaces them.
- Why it matters: These are four new terms in about 17 s, and the "no copies" picture goes by before it can be read.
- Cause: `video/src/videos/db-keys/script.ts:192-202` (`pauseAfter: 0.3` on `fk` and `parent`). `video/src/videos/db-keys/PointScene.tsx:125` (copies gone at `justAt + 6`).
- Fix: Set `pauseAfter: 0.7` on `fk` and `parent`. Keep the struck rows until `n.beat("many").to` and place the "Just customer_id" note under them instead of over them.

### 7. [P2] spacing: PK/FK/UNIQUE pills in table headers are 17px
- When: Every DataTable with a key tag, from 23 s to 167 s (element-058.jpeg, element-095.jpeg, element-167.jpeg, element-258.jpeg, element-332.jpeg).
- What: The "PK", "FK" and "UNIQUE" pills next to column names are set at 17px.
- Why it matters: This breaks the house floor of 19px and is the smallest text in the video.
- Cause: `video/src/videos/db-keys/parts.tsx:690` (`<Tag color={c.tag.color ?? KEY_INK} size={17}>`).
- Fix: Change it to `size={19}`. The 50px header rows have room.

### 8. [P3] spacing: The "?" sits on the dashed arrow
- When: 17.5-23.0 s, beats `taylors` and `blink` (element-044.jpeg).
- What: The red "?" between the order and the two Taylor rows is drawn on the upper dashed curve. Its dot touches the line.
- Cause: `video/src/videos/db-keys/IdentityScene.tsx:183` (`y = customers.rowMid(0) + h(ROW_H)/2 - 26`, which is where the upper curve passes).
- Fix: Move it 34px up (`- 60`) or 40px left, so it sits clear above both curves.

### 9. [P3] explanation: Command tags are never explained, and CASCADE reports "DELETE 1" while three rows vanish
- When: "INSERT 0 1" at 21-29 s and 155-167 s, "UPDATE 1" at 123 s, "DELETE 1" at 186-194 s (element-044.jpeg, element-387.jpeg).
- What: Postgres's tags are shown as proof but never glossed. In the CASCADE column, the post and BOTH comments disappear while the reply says "DELETE 1".
- Why it matters: A viewer who counts sees "1" against three rows gone, the opposite of "BOTH its comments go too".
- Cause: `video/src/videos/db-keys/IdentityScene.tsx:143-153` and `video/src/videos/db-keys/DeleteScene.tsx:250` (Reply with only the tag).
- Fix: Add a note after the CASCADE reply: "1 post deleted; its 2 comments went with it". Gloss the first "INSERT 0 1" with "1 row in".

### 10. [P3] confusion: Wallet: a stray "⊢ 1938" mid-page and unlabelled dots
- When:
  - 85.5-88.0 s, beat `wallet` (element-174.jpeg): the timeline's start tick, a 4% stub and "1938" sit alone in the middle of an empty page until the wallet arrives.
  - 92.8-110 s, beats `real` and `broke` (element-217.jpeg): 64 dots above the timeline stand for 5,755 people, but nothing says what a dot is.
- Cause: `video/src/videos/db-keys/WalletScene.tsx:98` (start tick at `yearAt - 4`, before the Spot at `makerAt - 4` on line 84) and `:102-115` (dots with no legend).
- Fix: Bring the wallet Spot in at `yearAt - 4`. Add a 20px label "people using the number" at the left end of the dot cloud at `adoptedAt`.

### 11. [P3] accuracy: The headline says "we make up", the narration says the database does
- When: 77.3-85.1 s, beat `surrogate` (element-167.jpeg).
- What: The headline reads "or a number we make up". Drew and the subhead both say it is made up by the database (GENERATED ALWAYS AS IDENTITY).
- Cause: `video/src/videos/db-keys/KindsScene.tsx:68`.
- Fix: Change it to "or a number the database makes up."

### 12. [P3] spacing: Gap before the period in "on purpose ."
- When: 82.5-85 s (element-167.jpeg).
- What: The highlight's 4px right padding pushes the period away from "purpose".
- Cause: `video/src/videos/db-keys/KindsScene.tsx:136` (`padding: "0 4px"` on the span, with the period outside it).
- Fix: Move the period inside the span, or use `padding: "0 0 0 4px"`.

### 13. [P3] explanation: "her details" with no her on screen
- When: 148.2-150.3 s, beat `many` (element-298.jpeg).
- What: The note reads "Just customer_id: her details live in one place." The customers entity has no rows and no name.
- Cause: `video/src/videos/db-keys/PointScene.tsx:156`.
- Fix: Change it to "Just customer_id: the customer's details live in one place."

### 14. [P3] confusion: ON DELETE pointers leave from the wrong cell
- When: 168-194 s (element-346.jpeg).
- What: The arrows from invoice 100, comments 10 and 11, and ticket 500 start at the row's left edge, next to the child's own id, not at the foreign-key cell. Comment 12's arrow starts at `post_id`. Every earlier scene anchors the dot on the FK value.
- Cause: `video/src/videos/db-keys/DeleteScene.tsx:43-49` (`leftLoop` starts at `child.x - 6`).
- Fix: Start each loop from the FK column (`child.xs[fkCol]` plus its width) and route it around the table. Alternatively, list the FK column first in these three child tables.

### 15. [P3] other: "Roster" vs "enrollments", and a lone Fig. 1
- When: 48.9-56.5 s, beat `roster`. Fig. 1 at 10.5-29.9 s.
- What: Drew says "In a roster…" while the screen only says "enrollments". "Fig. 1" labels the first figure, but no other figure in the video is numbered.
- Cause: `video/src/videos/db-keys/script.ts:136-140`, `video/src/videos/db-keys/IdentityScene.tsx:122`.
- Fix: Say "In an enrollments table, a roster…", or caption the table "enrollments (the roster)". Drop the "Fig. 1" label, or number the other figures.

### 16. [P3] spacing: The dashed box on a refused row nearly touches the closing rule
- When: 38-48 s, 62-70 s and 158-167 s (element-080.jpeg, element-124.jpeg, element-332.jpeg).
- What: The ghost row's dashed box ends 4-5px above the table's bottom rule, so the two lines read as a double border.
- Cause: `video/src/videos/db-keys/parts.tsx:745-756` (box at `top + 5`, height `hgt - 10`, with the bottom rule at `bottom - 1`).
- Fix: Inset the box to `top + 7` and `hgt - 16`.
