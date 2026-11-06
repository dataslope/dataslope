# DataEngineer-4-ModelingHistory (8:35)

## Verdict
- The video is accurate. Every number said or shown matches `results.json` and the page: customer 42's Boston 2022-01-01 to 2024-03-14 and Austin from 2024-03-15, orders 101 and 102 at 350 and 200, 15 current rows and 24 history rows, 700 of 1,110 loaded, six events for two orders, 340 against 200 split 110/70/20, 12 junk rows, 20 mini-dimension rows, Friday 2024-06-07 and Monday 2024-06-10, and index sizes of 2.26, 4.42 and 3.18 MB (1.96x). The layout is clean. Nothing overlaps or clips, no text is under 19px, and every scene ends on a full, readable figure held 1.6 s.
- Several answers are thinner than an interviewer's next question. Type 0 is taught as `ON CONFLICT DO NOTHING` on a table keyed by `customer_id`, then put in the same row as a Type 2 city, which that table cannot hold. Type 4 gets only the history-table reading, although Kimball's Type 4 is the mini-dimension the video teaches four minutes later without linking the two. Type 6's "1 + 2 + 3" is never mapped to its parts. "Snapshot" means only the current-state table, which leaves out the periodic snapshot Part 3 had just defined. The UUID index bars are shown without saying why random keys cost twice as much.
- The smaller problems are listings and labels. Q2's join listing never becomes the query whose results sit beside it. "The page's" appears five times on screen for a page the viewer never saw. The vault's `_hk` keys are unexplained. The sample UUID is not a valid random (version 4) UUID.
- Pacing is comfortable. Beats run 2.0 to 3.0 words/s, apart from `hook` (3.12), `scd-end` (3.08) and `r-degen` (3.13). No gap between beats is shorter than 0.5 s. Figures build on the words that name them.
- As interview answers, most hold up and some go past the page. The late-arriving answer (an inferred member per customer, updated in place, with the shared minus-one row as the fallback) is better than the page's. The bridge weight, "never add the unweighted totals", and "vault for history, stars on top" are all interview-grade.

## Findings

### 1. [P2] answer: Type 0 is taught with a mechanism that cannot hold the Type 2 city the next beat puts beside it
- When: 151.7-165.9 s, beats `type0-run` and `type0-mix` (element-166.jpeg)
- What: Both loads run `INSERT INTO dim_customer VALUES (42, DATE ...) ON CONFLICT DO NOTHING`, and "0 rows written" proves the value stood. Then the narration says "one customer row can hold a Type zero sign-up date beside a Type two city", over the strip `customer_key` / `signup_date` "Type 0: never changes" / `city` "Type 2: a new version". The conflict fires only because `customer_id` is the table's primary key. That key is set in check.mjs and never shown on screen, so the viewer cannot see what conflicts. A dimension with a Type 2 city holds one row per version, so `customer_id` cannot be unique there. Each new version is a fresh insert that `ON CONFLICT` never stops. In that table, Type 0 means each new version copies `signup_date` from the row it closes and ignores the source.
- Why it matters: the interviewer's next question is "and in a Type 2 dimension?", and the mechanism the video taught gives the wrong answer.
- Cause: `video/src/videos/de-modeling-history/check.mjs:248` (`customer_id INTEGER PRIMARY KEY`, off screen); `Type0Scene.tsx:58-62` and `:142-181` (the per-column strip, with no mechanism for the mixed row); `script.ts:176`.
- Fix: show the key. Add the line `-- customer_id is the primary key` above "first load", or give the listing the title "first load (customer_id is the key)". Extend `type0-mix`: "Types are chosen per column, so one row can hold a Type zero sign-up date beside a Type two city. Then each new city version copies the sign-up date from the row it closes, whatever the source sends." Under the strip, add a two-row table (`1001 Boston 2022-01-01`, `1087 Austin 2022-01-01`) with both `signup_date` cells marked green on "copies".

### 2. [P2] answer: Type 4 gets only the history-table reading; Kimball's Type 4 is the mini-dimension, taught at Q13 without a link
- When: 167.5-186.3 s, beat `type46` (element-208.jpeg); 441.5-456.6 s, beat `r-mini` (element-456.jpeg)
- What: "Type four splits the table. The main dimension keeps only current values ... and the history moves to a table of its own." The page gives both readings: "offloads historical values to a separate 'mini-dimension' or history table". In Kimball's *Data Warehouse Toolkit*, the source of the numbered types, Type 4 is "add a mini-dimension": the fast-changing attributes move to a small dimension with its own key on the fact. That is exactly item 13, whose narration never mentions Type 4.
- Why it matters: an interviewer who learned the types from Kimball hears a different technique described as Type 4, and the viewer has no way to say that both readings exist.
- Cause: `script.ts:184`; `Types46Scene.tsx:91` (sub-label "split the table" only); `script.ts:324` and `RapidScene.tsx:407` (the mini-dimension item, unlinked).
- Fix: append to `type46`: "That's the common reading. Kimball's own Type four is the mini-dimension, the thirteenth question here." Change the sub-label to "split the table, or a mini-dimension (13)". Open `r-mini` with "Kimball's Type four:" and add a small "SCD Type 4" tag under `dim_demographics`.

### 3. [P2] explanation: Type 6's "1 + 2 + 3" is never mapped to its parts
- When: 186.9-208.2 s, beats `type6` and `type6-cost` (element-208.jpeg)
- What: The label reads "1 + 2 + 3" and the narration says "Type six is one, plus two, plus three". It then describes Type 2 rows plus a current column, and later the rewrite of that column on every old row. It never says that the extra column is the Type 3 part and that rewriting it is the Type 1 part. No column in the table is tagged with its type.
- Why it matters: "why is it called six?" is the standard follow-up. The viewer can recite the sum but cannot say which piece is which.
- Cause: `Types46Scene.tsx:120` (the bare "1 + 2 + 3"), `:124-141`, `:167-176`; `script.ts:189`, `:194`.
- Fix: rewrite `type6` as: "It versions rows like Type two, adds a current-value column like Type three, and keeps that column up to date by overwriting it, like Type one." Tag the table with small gray numerals: "2" over `valid_from`/`valid_to`, "3" over `current_city`, and "1" in front of "the price: a move rewrites current_city on every old row".

### 4. [P2] answer: "Snapshot" means only the current-state table, so it misses the periodic snapshot Part 3 just defined
- When: 272.1-302.5 s, beats `snap-one` to `snap-end` (element-303.jpeg)
- What: "A snapshot keeps one row per order, its state now." The page says "one row per entity (overwriting or appending periodic rows)". Part 3 taught "a periodic snapshot has one row per account per period" (`de-dimensional-modeling/script.ts:266`), and that is what "snapshot fact table" usually means in an interview: daily balances, month-end inventory. A periodic snapshot keeps some history (the state at each period end) but loses the changes inside a period. It grows by entity times periods, not by changes. The video's conclusion holds for both forms, but in consecutive videos the viewer hears "snapshot" used two ways and is never told the two are related.
- Why it matters: an interviewer who says "periodic snapshot" expects the trade-off between periodic rows and the event log, and this answer never names that form.
- Cause: `SnapScene.tsx:107-122` (one `order_snapshot`, current state only); `script.ts:235`.
- Fix: change `snap-one` to: "A snapshot keeps one row per order: its state now, overwritten, or one row per order per day, the periodic snapshot from Part 3. Both are easy to query, but order five oh two just says cancelled." Under `order_snapshot`, add a small `order_daily_snapshot` with 501 2024-06-01 paid, 501 2024-06-02 shipped, 502 2024-06-01 cancelled, labelled "periodic: still no 'paid' for 502". Retitle the existing table "order_snapshot (current state)".

### 5. [P2] explanation: The UUID index bars are shown without the reason, so "in between" explains nothing
- When: 486.0-499.5 s, beat `r-uuid-cost` (element-499.jpeg)
- What: Three bars, 2.3 MB for the sequence, 4.4 MB (1.96x) for random UUIDs and 3.2 MB for UUID v7, under "The cost shows in the index ... Time-ordered version seven UUIDs land in between." The narration never says why. The measured numbers split cleanly into two causes. The first step (2.26 to 3.18 MB, 1.41x) is width: a 16-byte key against 8, which is 28 bytes per index entry against 20. The second step (3.18 to 4.42 MB, 1.39x) is order: random keys land all over the B-tree and split its pages, leaving them part empty, while v7 keys start with a timestamp and append at the right edge as a sequence does. The page's "fragment indexes more" is this point, and the middle bar is the evidence for it.
- Why it matters: "why are random UUIDs bad for an index?" is the follow-up to this exact question, and the figure that answers it is on screen unexplained.
- Cause: `script.ts:339`; `RapidScene.tsx:311-375` (bars, plus an "in between" with no annotation).
- Fix: rewrite `r-uuid-cost`: "The cost shows in the index. In Postgres, a hundred thousand random UUIDs built a primary key index almost twice the size of the sequence's. Part of that is width, sixteen bytes against eight. The rest is order: random keys split pages all over the index. Version seven UUIDs start with a timestamp, so they arrive in order and pay only for the width." Add two brackets to the right of the bars: sequence to v7 labelled "wider key (1.4x)", v7 to random labelled "random order: split pages (1.4x)", in red.

### 6. [P3] confusion: Q2's join listing never becomes the query whose results sit beside it
- When: 110.7-137.8 s, beats `type2-join` and `type2-load` (element-138.jpeg; tile at 123 s on sheet-04)
- What: The listing is titled "the page's point-in-time join" but ends `WHERE f.customer_id = 42`, which the page's query does not have. That line is highlighted as it appears. Directly under it, "All 24 of the page's orders: 24 rows, one version each" describes a different query, the unfiltered count. At `type2-load` the listing still selects `d.city`, while the table beside it, "stored on the fact at load time", shows `customer_key` from `TYPE2.load`, a query never shown. The "All 24" note and the green "2024-03-14, then 2024-03-15: no overlap, no gap" note both leave on "that lookup runs once", about 2.7 s after the second one arrives.
- Why it matters: a viewer who reads the listing sees a filtered query that returns two rows next to a claim of 24, and a query that selects a city next to a table of keys.
- Cause: `Type2Scene.tsx:163-175` (one listing, `P`, never swapped; the `WHERE` mark at `:173`); `:156-160` and `:193-200` (`out={onceAt}`); `:206-218`; `check.mjs:222-233`.
- Fix: retitle the listing "the point-in-time join, for customer 42". At `allAt`, fade the `WHERE` line to 30%. At `storesAt`, swap line 0 to `SELECT f.order_id, f.order_date, d.customer_key` (`TYPE2.load.lines[0]`) and mark it in the key blue. Move both notes' `out` to `todayAt`.

### 7. [P3] other: "The page's" appears five times on screen for a page the viewer never saw
- When: 4-28 s, beats `hook` and `plan` (element-027.jpeg); 36-88 s, the `scd` scene (element-087.jpeg); 110-125 s, beat `type2-join` (element-138.jpeg)
- What: On screen are "customer 42, as the page's table has her", "three classic types, on the page's customer 42", "dim_customer, the page's rows", "the page's point-in-time join" and "All 24 of the page's orders". The narration also says "All twenty-four of the page's orders". The video never says what the page is. (The Data Scientist review flagged the same phrase.)
- Why it matters: it reads as a reference to something the viewer missed, and it adds nothing to the answer.
- Cause: `HookScene.tsx:86`, `HistoryScene.tsx:113`, `:183`, `Type2Scene.tsx:170`, `:195`; `script.ts:153`.
- Fix: drop the possessive: "customer 42", "on customer 42", "dim_customer", "the point-in-time join", "All 24 orders in the table". In the narration: "All twenty-four orders in the table match exactly one version".

### 8. [P3] answer: Q2 stops before change detection and atomicity
- When: 88.1-110.1 s, beats `type2` and `type2-insert` (element-109.jpeg)
- What: The answer is "two statements", an `UPDATE` that closes the row and an `INSERT` that opens the new one. It does not say how the load knows the city changed (compare the staged row with the current version, often through a hash of the tracked columns). It also does not say that the two statements run in one transaction or as one `MERGE`. A failure between them leaves customer 42 with no current row, and new orders then join to nothing. The page is silent on both points, but they are the usual follow-ups to "in practice".
- Why it matters: "what if the job dies between the update and the insert?" is a common interview probe.
- Cause: `script.ts:143-148`; `Type2Scene.tsx:99-123`.
- Fix: append to `type2-insert`: "Run both in one transaction, and only for customers whose tracked columns differ from their current row." On screen, draw a bracket around the two listings labelled "one transaction".

### 9. [P3] answer: The placeholder is hard-coded, and the minus-one row's re-keying needs a key the video does not keep
- When: 230.6-258.0 s, beats `late-fix` to `late-shared` (element-238.jpeg, element-258.jpeg)
- What: The placeholder is a literal, `INSERT INTO dim_customer VALUES (2002, 77, 'Unknown', true)`. The load step that finds 77 in the first place is neither shown nor said: before the key lookup, insert a placeholder for every staged `customer_id` the dimension lacks. Separately, "every one of those facts has to be re-keyed later" works only if the fact or the staging area kept `customer_id`, since key minus one no longer says whose order it was. The page also allows keeping minus one as the record.
- Why it matters: "how does the job know to create it?" and "how do you re-key from minus one?" are the two follow-ups to this answer.
- Cause: `check.mjs:294` (literal placeholder); `LateScene.tsx:144`; `script.ts:212`, `:222`.
- Fix: retitle the placeholder listing "for every staged customer the dimension lacks" and show `INSERT INTO dim_customer SELECT 2002, o.customer_id, 'Unknown', true FROM staged_orders o WHERE NOT EXISTS (SELECT 1 FROM dim_customer d WHERE d.customer_id = o.customer_id);`. Change `late-shared` to "... but then every one of those facts has to be re-keyed later, which only works if each kept the customer's own ID."

### 10. [P3] explanation: The vault's `_hk` keys are unexplained, and its cost is only implied
- When: 359.2-404.6 s, beats `vault` to `vault-when` (element-405.jpeg)
- What: Every primary key is a `_hk` column (`customer_hk`, `order_hk`, `link_hk`), while "Hubs hold the business keys" highlights `customer_id`. Nothing says that `_hk` is a hash of the business key, and that hash is also why separate loaders can write in parallel without looking each other's keys up. The vault's downside is only implied by "Choose a star when ... analysts query it directly": one customer is spread over a hub and a satellite per source, so every report needs a stack of joins.
- Why it matters: "what does a vault cost you?" is the other half of "when would you choose it", and `_hk` is the first unfamiliar thing on the diagram.
- Cause: `VaultScene.tsx:59-87` (the `_hk` columns), `:95-99` (`whenNotes`); `script.ts:286`, `:296`.
- Fix: add a gray note under `hub_customer`: "customer_hk: a hash of customer_id". In `vault-when`, after the first sentence, add: "The price is querying: one customer is a hub and a satellite per source, so every question is a stack of joins." Add the line "many joins per question" in red under "Choose a vault".

### 11. [P3] explanation: The snapshot scene's SQL uses unexplained dialect features, and the "then" is not what the query checks
- When: 283.2-302.5 s, beats `snap-log` and `snap-end` (element-303.jpeg)
- What: The rebuild uses `QUALIFY ROW_NUMBER() OVER (...) = 1` and the audit query uses `bool_or`. Both are DuckDB, Snowflake or Postgres specific and neither is explained; the narration says only "keeping the latest row per order". The narration says "five oh two was paid, then cancelled", but `HAVING bool_or(status = 'paid') AND bool_or(status = 'cancelled')` checks only that both statuses occurred, not their order. The highlight covers the `HAVING` line but not its `AND bool_or(status = 'cancelled')` continuation.
- Why it matters: a viewer who tries `QUALIFY` on a warehouse that lacks it gets an error, and the query on screen does not prove the "then" it is cited for.
- Cause: `SnapScene.tsx:126-151` (marks via `lineOf(Q.lines, "HAVING")` only); `check.mjs`, `snap` steps.
- Fix: retitle the rebuild listing "the log rebuilds the snapshot: latest row per order (QUALIFY filters on a window)". Mark both `HAVING` lines. Change the narration to "five oh two was paid, and later cancelled: the timestamps say so", and keep the green marks on 10:02 and 16:30 in the log.

### 12. [P3] pacing: Q10 says "invoice number" over an `order_number` column, and its result table is up about 2.5 s
- When: 410.6-419.2 s, beat `r-degen` (tiles 416 s and 417 s on sheet-14)
- What: The narration says "like an invoice number kept on the fact". The table's column is `order_number` (values `INV-1001`), and the note says "`order_number` lives on the fact". The beat is the round's densest (3.13 words/s). Its result table, "grouped by it, no join", appears about 416.5 s and is gone when item 11 starts at 419.2 s.
- Why it matters: a mismatch between the word heard and the word read, in the item with the least time to read.
- Cause: `check.mjs:361-364`; `RapidScene.tsx:45-48`; `script.ts:309-310` (`pauseAfter: 0.9`).
- Fix: rename the column `invoice_number`, or say "an order number". Raise `r-degen`'s `pauseAfter` to 1.4.

### 13. [P3] accuracy: The sample UUID is not a random UUID, and "a small integer" sits beside "a bigint, 8 bytes"
- When: 467.4-499.5 s, beats `r-uuid` and `r-uuid-cost` (element-499.jpeg)
- What: The example shown is `00003e3b-9e53-3668-5200-ae85d21b4f5e`, the smallest of 100,000 `md5()` hashes cast to `uuid`. Its version digit is 3 and its variant digit is 5, and it starts with four zeros. A random UUID from `gen_random_uuid()` reads `xxxxxxxx-xxxx-4xxx-[89ab]xxx-...`. The narration says "a small integer" while the label says "a bigint, 8 bytes", and in Postgres `smallint` is a 2-byte type.
- Why it matters: a viewer who knows UUIDs sees a malformed example under a "random UUID" label, and a careful one hears the name of a type the video did not use.
- Cause: `check.mjs:408` (`SELECT id FROM uuid_keys ORDER BY id LIMIT 1` on md5 keys); `RapidScene.tsx:324`, `:328`; `script.ts:334`.
- Fix: show one recorded `gen_random_uuid()` value as a fixed literal (the md5 table can stay for the repeatable sizes). Say "a plain integer", or "an integer, handed out in order".

### 14. [P3] answer: Q14 leaves out the coverage use, and its "keys" are names
- When: 457.4-466.4 s, beat `r-factless` (tile 465 s on sheet-16)
- What: The answer covers event tracking only (attendance, then `COUNT(*)`). The page's other use is coverage ("which products were covered by a promotion?"), and it leads to the classic follow-up "how do you find what did not happen?": the coverage table minus the event table. The note says "keys and a date, no measure column", but the cells are `Ada`, `Databases`.
- Why it matters: the "what didn't happen" query is the reason factless tables come up in interviews.
- Cause: `RapidScene.tsx:255-279`; `script.ts:329`.
- Fix: append to `r-factless`: "A coverage table, every student enrolled, minus this one tells you who didn't come." Relabel the note "names stand in for keys", or show `student_key`/`class_key` integers.
