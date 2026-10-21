# DbDesign-6-Constraints (0-247 s, whole video)

## Verdict
- The video is solid overall. Every refusal is Postgres's own (PGlite), the argument (type, null, unique, check, then where constraints stop) moves cleanly, and cues land on their words. Narration mostly runs at 2.3-3.2 w/s, and scenes hold about 1.3 s before each cut.
- Biggest problem: the "layers" beat strikes out the Pen row the previous beat showed as stored. That suggests adding NOT NULL rejects a row that is already in the table.
- The integer number line flashes its end values (-3 and 6) red on "too big / too small" and is captioned "every whole number". Both are misleading.
- Two refusals (pair 1-10 and banana) are torn down about 1 s after they appear. The one-to-one beat packs a new ERD, an unexplained "UK" and a refusal of an insert nobody sees into 6 s.
- Smaller defects: a 2.5 s blank screen opening the null scene, a CHECK chip and bracket drawn before the columns they compare, two chips touching, and the forgetting writer's arrow landing on the wrong row. Most figures sit in a band at y 370-780 and leave the bottom third of the frame empty.

## Findings

### 1. [P1] confusion: A stored row is shown being refused after the fact
- When: 208.0-222.4 s, beats `unknown` → `layers` (element-423 vs element-443).
- What: Row "2 Pen null" is inserted and marked "stored" (it slips past the CHECK). In `layers` a NOT NULL chip appears on the same card, and that same row turns into a dashed ghost, gets struck through, and gets a NOT NULL error. The figure reads as "adding NOT NULL kicks out the row that was already stored". The error actually comes from a separate fresh database (`CHECK_AND_NOT_NULL`), and a real `ALTER ... SET NOT NULL` would fail on this table.
- Why it matters: it teaches a wrong model of how constraints apply to existing data, in the section meant to correct a misconception.
- Cause: `video/src/videos/db-constraints/UnknownScene.tsx:110` (the stored Pen row gets `ghostAt: thereAt - 2, strikeAt: thereAt + 2`) together with the ErrorBox at `:142-151`.
- Fix: at `requiredAt`, collapse the stored Pen row and the "stored" note. Then add a new ghost attempt row "Pen null" at `notNullAt` and strike it at `thereAt`. Alternatively, start a cleared table labelled "same insert, with NOT NULL".

### 2. [P2] accuracy: The integer number line shows false limits and a false caption
- When: 67.7-81.5 s, beats `nan`, `domain` (element-136, element-139, element-153).
- What: on "too big" the dot at 6 swells red, and on "too small" the dot at -3 does. Those are arbitrary display ends painted in the "bad" colour, so they look like refused values. The caption then says "integer: every whole number, and nothing else". Postgres `integer` is bounded (about ±2.1 billion), and the lesson itself points to BIGINT for values beyond the normal integer range.
- Why it matters: the screen contradicts both the narration (which concedes values can be too big) and the lesson.
- Cause: `TypeScene.tsx:156-159` (`end = big/small` sets the fill to ACCENT and the radius +5); caption at `TypeScene.tsx:190`.
- Fix: pulse the two "…" ellipses in ink (not red) on "big"/"small", and keep the dots black. Change the caption to "integer: whole numbers only (about ±2.1 billion)".

### 3. [P2] pacing: Two refusals are torn down about 1 s after they appear
- When: 169.0-170.5 s, beat `again` (element-338 → element-341); 194.3-195.5 s, beat `banana` (element-389 → element-391).
- What: the enrollments error ("…enrollments_student_id_course_id_key… (1, 10) already exists") inks in at "bounces" (≈169.0 s) and the whole figure exits at ≈169.9 s. The banana `products_status_check` error inks in at "Nope" (≈194.3 s) and the figure is gone by 195.5 s. Both beats have only a 0.4 s pause after them.
- Why it matters: the payoff of each example (Postgres naming the broken rule, which the video set up as the point at 39-46 s) is on screen for under the 1.5 s floor.
- Cause: `PairScene.tsx:133` (`outA = putAt - 2`) and `CheckScene.tsx:88` (`outA = datesFrom - 2`), with `pauseAfter: 0.4` on `again` and `banana` (`script.ts:177`, `script.ts:192`).
- Fix: set `pauseAfter: 1.4` on `again` and `banana`, so each error holds at least 1.5 s before the exit.

### 4. [P2] confusion: The null scene opens on a blank page
- When: 104.0-106.5 s, beat `null` (element-208 to element-212); also 111.5-113.6 s, beat `ask`. A milder case: 157.2-163.5 s, beat `pair`.
- What: for 2.5 s only the kicker "Required or optional" is on screen while Drew says "In a database, a missing value is null". The headline waits for the sentence's last word, and the chips wait for "zero". At 111.5 s the headline exits and the next one arrives 2 s later. The pair scene builds a new ERD for 6 s with no headline.
- Why it matters: the frame is empty while the scene's key term is being defined. The previous scene had just shown the dashed "no value" box, which could have carried over.
- Cause: `NullScene.tsx:100` (`Head … at={nullAt - 6}`, where `nullAt` is the last word of the beat) and `:101` (`at={everyRowAt - 4}` against `out={chipsOut}` at `askFrom - 2`); `PairScene.tsx:146` (`at={eachPairAt - 4}`).
- Fix: put "Null means no value." at `open - 6` and the dashed null box at the word "missing". Bring "Must every row know this?" in at `askFrom`. In the pair scene, add a head such as "Many to many: each pair once?" at `open - 6`.

### 5. [P2] explanation: The one-to-one beat is crammed, uses an undefined "UK", and refuses an insert nobody sees
- When: 170.0-176.1 s, beat `oneone` (element-344 to element-352).
- What: in one 6 s beat, the pair figure exits, a new users/profiles ERD is built, and keys labelled "UK" and "FK, UK" appear. "UK" is never said or defined, and the unique scene shows the same rule as a UNIQUE chip. An error "duplicate key… profiles_user_id_key… (user_id)=(1) already exists" appears, but no second profile row is shown and the narration never mentions an attempt.
- Why it matters: it is a new relationship type with new notation and an unexplained refusal, given 6 s and a 0.5 s pause.
- Cause: `PairScene.tsx:118` and `:128` (`key: "UK"`, `key: "FK, UK"`); `PairScene.tsx:226-236` (an ErrorBox at `mostAt + 6` with no attempt row).
- Fix: drop the "UK" key labels (the UNIQUE chip at `:214` already says it). Show a ghost row "user_id 1, 'Ada again'", struck at the error. Split the beat: "Put unique on a foreign key, and each user gets at most one profile." / "A second profile for user one bounces. That's one to one." with `pauseAfter: 0.5`.

### 6. [P2] explanation: The rule is never named before the duplicate is refused
- When: 137.8-147.5 s, beats `unique`, `dup` (element-282, element-286).
- What: Ada's second account is attempted while the email row shows only NOT NULL. The UNIQUE chip appears at the same moment as the refusal, and the narration says only "Duplicate key, refused". Email is not a key on screen, and the next beat says "the primary key already keeps rows distinct".
- Why it matters: the viewer gets "key" jargon for a non-key column, and the cause of the refusal is never said.
- Cause: `UniqueScene.tsx:91` (UNIQUE chip at `dupFrom - 2`); `script.ts:164` (`dup` text).
- Fix: show the UNIQUE chip at `open + 16`, next to NOT NULL. Rewrite `dup` as "Refused: email is marked unique. One email, one account."

### 7. [P2] confusion: The CHECK chip and its bracket appear before the columns it compares
- When: 195.6-196.6 s, beat `dates` (element-392).
- What: "CHECK (end_date > start_date)" and its bracket float below the events card while the card shows only id and name. The start_date and end_date rows grow in under it afterwards.
- Why it matters: the bracket spans empty paper, and the rule appears before its operands.
- Cause: `CheckScene.tsx:151` (Entity at `compareAt - 2`) and `:156` (chip at `columnsAt - 2`, one word later, while the card is still growing).
- Fix: show the chip at `n.word("dates", "end") - 2`, or build the events card at `datesFrom - 8` so it is complete by "columns".

### 8. [P2] spacing: The two-line status CHECK chip touches the price chip
- When: 189.6-195.5 s, beat `banana` (element-389).
- What: the two-line "CHECK (status IN ( 'draft', 'active', 'archived'))" chip (y 598-663) sits 2 px under the "CHECK (price >= 0)" chip (bottom at y 596), and rises into the price row's band.
- Why it matters: the chips touch, and the status rule visually belongs to the price row.
- Cause: `CheckScene.tsx:115` (a chip with `\n`); `parts.tsx:432-433` (RuleTags centres every chip on its row's mid with `translateY(-50%)`, whatever its height).
- Fix: in RuleTags, anchor a chip taller than the row to the row's top + 4 px, not its mid. That gives about 12 px clearance.

### 9. [P2] confusion: The forgetting writer's red arrow lands on `name`, not `price`
- When: 27.5-31.3 s, beat `forgets` (element-060).
- What: Nightly import's arrow and travelling red token hit the products card at the `name` row (y≈597), while the `price` row is the one turning red and the note says "price -3.00 is in".
- Why it matters: the one arrow the viewer is told to follow points at the wrong column.
- Cause: `HookScene.tsx:92` (`targetY` spreads the four arrow ends over header→price in h(40) steps, so index 2 lands on name); the token uses the same target (`:100`).
- Fix: use `targetY(FORGETS) = products.rows[2].mid` (and the token's `tokenTo`), or converge all four arrows on the price row.

### 10. [P2] spacing: The numeric row's note straddles the highlight band's edge
- When: 96.5-104.0 s, beats `exact`, `null-in` (element-196).
- What: "exact: the type for a price" (y≈765-790) is cut across by the bottom edge of the yellow numeric band (ends y≈781). Half the text sits inside the band and half outside.
- Why it matters: it looks like a layout slip at the moment the scene's conclusion is on screen.
- Cause: `MoneyScene.tsx:203` (note at `rowB + h(34)`) against the band height `lineH = h(100)` (`MoneyScene.tsx:46`, used at `:133-135`).
- Fix: set `lineH = h(130)` so the band contains the note, or move the note to `rowB + h(64)`, clear of the band.

### 11. [P3] confusion: The float row reads "0.1 + 0.2 =   = 0.3 false" before the result arrives
- When: 85.9-89.2 s, beats `money`, `false` (element-172 to element-178).
- What: the "= 0.3" test cell and then "false" appear before any result is typed, so for about 3 s the row is a chain of equals signs ending in "false". Once filled, "0.30000000000000004 = 0.3 false" still reads as an asserted equality.
- Why it matters: the reader has to decode notation at the punchline.
- Cause: `MoneyScene.tsx:185` (`"= 0.3"` at `thirtyAt - 2`) and `:187` (verdict at `falseAt`); the result is typed only from `pointAt` (`:52`).
- Fix: write the test cell as "0.3?" under its "equals 0.3?" header, and show the verdict at `fourAt`, after the digits.

### 12. [P3] spacing: Struck rows and error details mangle the very values being refused
- When: 43.5-61 s (element-090: the minus of "-3.00"); 201-203.7 s (element-405: "2026-06-10" and "2026-06-08").
- What: the strike line runs exactly at minus and hyphen height, so the struck "-3.00" reads as "3.00" and the dates lose their hyphens. The events DETAIL line also wraps mid-date: "2026-" / "06-10".
- Why it matters: the refused value is the thing the viewer should read.
- Cause: `parts.tsx:778` (strike at `top + hgt / 2 - 1.5`); `parts.tsx:838` (ErrorBox `whiteSpace: "pre-wrap"` lets the line break after a hyphen).
- Fix: raise the strike to about `top + hgt * 0.42`, above the minus. Render hyphens in the detail as U+2011 (non-breaking hyphen).

### 13. [P3] explanation: Status quietly gains a NOT NULL chip
- When: 128.0-137.5 s, beat `email` (element-262).
- What: Drew says "email is marked not null", and a second NOT NULL chip also appears on `status`, next to DEFAULT 'active', without a word about it.
- Why it matters: a rule appears unexplained. A careful viewer wonders why a column with a default also needs NOT NULL.
- Cause: `NullScene.tsx:170`.
- Fix: drop that chip, or add "and status too" to the beat.

### 14. [P3] accuracy: "Can't end before it starts" understates the rule shown
- When: 195.1-202.1 s, beat `dates` (element-405).
- What: the narration says an event can't end before it starts. The chip is `end_date > start_date`, which also refuses an event that ends on its start day.
- Why it matters: what is said and what is shown are two different rules.
- Cause: `script.ts:194-196` (`dates` text).
- Fix: change the narration to "An event has to end after it starts…".

### 15. [P3] spacing: Figures are crowded into the middle band with the bottom third empty
- When: most scenes, for example 116-137 s (element-244, element-274), 147-157 s (element-306), 170-182 s (element-352), 183-195 s (element-389).
- What: cards and tables start at y 370 and end by about y 780. Chips are 20 px and error text is 22 px, and the bottom ~300 px stays empty for the whole scene.
- Why it matters: the type that carries the argument (chips, errors, failing rows) is smaller than the space allows.
- Cause: `parts.tsx:44` and `:47` (`CARD_Y = TABLE_Y = 370`); `parts.tsx:63` (`TAG_SIZE = 20`).
- Fix: set `CARD_Y`/`TABLE_Y` to 420, `TAG_SIZE` to 24, and the ErrorBox font from 22 to 24. Then re-check the money, pair and bridge layouts, which already reach y≈990.

### 16. [P3] pacing: The check definition runs straight into a new example
- When: 182.8-189.5 s, beats `check` → `banana` (3.11 w/s, 0.30 s gap).
- What: the term "check" is defined and recalled ("Price zero or more was one"), and 0.3 s later a second rule with a three-item list begins.
- Why it matters: this is the scene's definition, and it gets the shortest pause in the video.
- Cause: `script.ts:187-191` (`pauseAfter: 0.3`).
- Fix: `pauseAfter: 0.6`.

### 17. [P3] confusion: The "values that are just wrong" recap is tucked into a corner
- When: 177.0-182.5 s, beat `check-in` (element-364).
- What: "NOT NULL ✓ UNIQUE ✓" and the "-3.00" / "'banana'" boxes appear small in the bottom-right corner, under the dimmed (still visible) one-to-one ERD and its error.
- Why it matters: the scene's turning point competes with leftover content.
- Cause: `PairScene.tsx:212-236` (the one-to-one figure uses `dim={coversAt}`, not `out`); recap at `:239-272` (x 1250, y(850)).
- Fix: use `out={coversAt}` on the one-to-one figure, and centre the recap at about x 700, y(560).

### 18. [P3] other: The same table names change shape between scenes
- When: 4.6-31 s versus 31-81 s.
- What: `products.id` is `integer` in the hook ERD and `serial` from the schema scene on. `order_items` is (id, product_id, quantity) in the hook and (id, sku, quantity) in the type scene.
- Why it matters: an attentive viewer sees one table silently redefined.
- Cause: `HookScene.tsx:71` and `:81-84` versus `SchemaScene.tsx:71` and `TypeScene.tsx:71-73`.
- Fix: use `serial` in the hook, and give the type scene's table its hook columns (or a different name).

### 19. [P3] other: Only two figures are numbered, and the coins illustration jumps sides at the cut
- When: Fig. 1 at 7-15 s, Fig. 2 at 81.5-104 s; coins illustration at 77-104 s (element-160 → element-164).
- What: two of a dozen figures carry "Fig. N" labels, and the rest have none. The scales/coins watercolour sits bottom-left in the type scene, then reappears bottom-right in the money scene right after the cut.
- Why it matters: inconsistent labelling, and a visible jump of the same art.
- Cause: `HookScene.tsx:121` and `MoneyScene.tsx:102` (the only FigLabels); `TypeScene.tsx:208` (`left={140}`) versus `MoneyScene.tsx:221` (`left={1470}`).
- Fix: drop both FigLabels (or label every figure), and keep the coins in one position across both scenes or only in the money scene.
