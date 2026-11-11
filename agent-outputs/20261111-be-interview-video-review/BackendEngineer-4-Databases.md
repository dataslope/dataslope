# BackendEngineer-4-Databases (11:06, 666.0 s)

## Verdict
- A strong, evidence-led video. Nearly every claim is backed by a real Postgres run, the numbers on screen match `results.json` and the narration everywhere I checked (7,360 pages, 4 pages, 10,001 vs 40,187 WAL records, 58 vs 67 MB, 13 vs 1,837 pages, 2,732 rows, 304 to 912), and the answers hold up against `databases.mdx`, often going one step past it (skip scan, Postgres's read uncommitted, the aborted-transaction state).
- The biggest problems are a few answers that stop just before the interviewer's obvious follow-up: what serializable adds once Postgres's repeatable read already stops phantoms (write skew), what pessimistic locking costs, why an estimate-vs-actual gap matters (this example's misestimate is not the kind fresh statistics fix), and the "SQL can't scale writes" framing of the at-scale question.
- Visual defects are minor and local: a red ring drawn through the code it circles (Q5), the retry arrow landing on its BEGIN label (Q9), a struck-through "possible" that is correct for the standard (Q9), and a stale customer-42 highlight plus a false "in every run" label (Q4).
- Pacing is comfortable overall (most beats 2.2 to 2.9 w/s). The tight spots are the leftmost-prefix payoff ("every Ada", about 2 s on screen before the phone book goes), unnarrated text in the quick round's foreign-key and covering-index panels, and plan-why/plan-fix at 3.1 w/s carrying the scene's main idea.
- Code is on screen a lot for a "decisions, not syntax" series, but here it is query plans used as evidence, which is the skill Q5 asks about. I do not count it as a finding.

## Findings

### 1. [P2] answer: Serializable's purpose is left unexplained after the grid shows it identical to Postgres's repeatable read
- When: 449.0-471.6 s, beats `anomalies-phantom`, `anomalies-serial` (element-459.jpeg, element-472.jpeg)
- What: the phantom beat strikes repeatable read's "possible" phantom ("Postgres's repeatable read already does"). That leaves the serializable row and the repeatable read row both reading "prevented, prevented, prevented" in Postgres. The serial beat then says only "Serializable promises an outcome some one-at-a-time order could give" and that it may abort. Nothing on screen or in the narration shows an anomaly that repeatable read still allows.
- Why it matters: "then why would I ever pick serializable in Postgres?" is the obvious follow-up, and the video sets it up without answering it. The answer is write skew (two transactions each read, then write different rows, for example two on-call doctors both going off call), which snapshot isolation allows and serializable catches.
- Cause: `video/src/videos/be-databases/script.ts:471` (anomalies-serial text); the drawn serial timeline in `IsoScene.tsx` (around line 327) has two UPDATEs with no rows named.
- Fix: add one sentence to anomalies-serial, for example "It also catches what repeatable read misses: write skew, where two transactions each check a rule, then each write a different row, and together break it." Label the drawn timeline's two UPDATEs with different rows (for example "doctor A off call" and "doctor B off call") so the failure has a visible cause.

### 2. [P2] confusion: A correct cell of the standard's table is struck through
- When: 431-473 s, from `anomalies-dirty` ("even read uncommitted") and `anomalies-phantom` to the end of the scene (element-447.jpeg, element-472.jpeg)
- What: the grid is introduced as the standard's levels ("The standard names four"). Two of its "possible" cells (dirty read under read uncommitted, phantom under repeatable read) get a red strike and a green "Postgres: no". Those cells are correct for the standard, and the narration says so ("The standard stops phantoms only at serializable").
- Why it matters: a struck word reads as "this was wrong". A viewer who remembers the picture will tell an interviewer the standard prevents dirty reads at read uncommitted. Striking correct statements is one of this review series' recurring defects.
- Cause: `video/src/videos/be-databases/IsoScene.tsx:238-250` (`struck` draws a line through `word`, then appends "Postgres: no").
- Fix: keep "possible" unstruck in red. Beside it, set a small yellow-tinted badge, "Postgres: prevented", so the Postgres behaviour sits next to the standard's answer instead of replacing it. Drop the `<line>`.

### 3. [P2] spacing: The red ring around `created_at::date` cuts through the code above and beside it
- When: 285-292 s, beat `plan-why` (element-291.jpeg)
- What: the ellipse is about 52 px tall on a 38 px line pitch. It crosses the "E" of WHERE, "COUNT(*)" and "FROM" on the line above, and the "=" to the right.
- Why it matters: it is a visible overlap on the scene's key frame, and lines or rings through text recur across this review series.
- Cause: `video/src/videos/be-databases/PlanScene.tsx:125` (`ry={h(26)}`, `rx` half-width + 16).
- Fix: use the listing's own `marks` band in red on `created_at::date`, as the plan box below already does for the filter. If the ring stays, use `ry={h(17)}` and a half-width + 6 px `rx`.

### 4. [P2] accuracy: "one day, in every run" is false, and customer 42's highlight is left over from the previous beat
- When: 219.8-225.6 s, beat `composite-day` (element-224.jpeg)
- What: the label says "one day, in every run: 2,656 orders, read from the table". The day's 2,656 orders fall among 50,000 customers, so about one customer in nineteen has one, not every customer. The strip itself shows red ticks in only six of nine runs. Customer 42's run also keeps the yellow "newest ten" and blue lit state from `composite-run`, so the beat about "all customers" still points at one customer.
- Why it matters: the figure contradicts its own label, and the stale yellow suggests customer 42 matters to the one-day query.
- Cause: `video/src/videos/be-databases/CompositeScene.tsx:357` (label text); `:270-271` (`lit42` and `read` never fade at `dayAt`); `:121` (`dayGroups`).
- Fix: change the label to "one day: scattered across customers' runs". Multiply `lit42` and `read` by `(1 - ease(frame, dayAt, 10))`.

### 5. [P2] answer: The at-scale question is framed as "SQL can't scale writes"
- When: 53.1-80.0 s, beats `nosql-no`, `nosql-both` (element-070.jpeg, element-091.jpeg)
- What: "Pick NoSQL when writes must scale out across machines" and "At scale, many systems use both". The video never says that relational databases also scale, through read replicas, partitioning and sharding (Part 2's subject), or that scale alone is rarely the deciding factor.
- Why it matters: the second question on screen is specifically "SQL or NoSQL at scale". "Postgres can't scale" is the classic weak answer, and the first thing an interviewer pushes on.
- Cause: `video/src/videos/be-databases/script.ts:260-265` (nosql-no, nosql-both text).
- Fix: add one clause to nosql-both: "Relational scales further than people think, with replicas and sharding, so the deciding question is the access pattern and the consistency you need, not size alone." Optionally, show "replicas, sharding" under the SQL cylinder.

### 6. [P2] explanation: The plan's estimate gap is pointed at but never interpreted, and "fresh statistics" would not fix this one
- When: 264-308 s, beats `plan-look`, `plan-bad`, `plan-sarg` (element-291.jpeg)
- What: the video says to read "the estimated rows against the actual rows" and highlights 5,000 vs 2,732. It never says why a gap matters: the planner picks scans and join strategies from those estimates, and a gap of 10x or more points to stale statistics. Here the gap is under 2x and is caused by the function (Postgres's default guess for an expression). plan-sarg then lists "fresh statistics" as a usual fix, which a viewer will read as the fix for this estimate. Running ANALYZE would not change it; an expression index on `created_at::date` or the rewrite would. The page's other red flag, nested loops on unindexed joins, is not mentioned.
- Why it matters: "what do you do when estimates are off?" is the standard plan-reading follow-up.
- Cause: `video/src/videos/be-databases/script.ts:382` (plan-bad) and `:397` (plan-sarg).
- Fix: in plan-bad, after the numbers, add "Postgres picks its plan from that estimate, so a big gap means a bad choice." In plan-sarg, say "The other usual fixes: an index on the expression itself, or fresh statistics when the estimates are stale." Add "a nested loop over an unindexed join" as a fourth thing to watch, or drop "three things".

### 7. [P2] answer: Pessimistic locking's cost is never stated
- When: 473.2-524.9 s, beats `lock` to `lock-choose` (element-525.jpeg)
- What: the comparison says only when each strategy wins ("Pessimistic wins when they're frequent, and retries would pile up"). It never says what pessimistic costs: blocked transactions, lower throughput, locks held while the application does other work, and the deadlock risk the next question opens with. The backend-specific case is also missing: across two HTTP requests (read, user edits, write) only optimistic works, usually as a version or ETag sent back with the write.
- Why it matters: the page says "safe under high contention but reduces concurrency"; the trade-off is the answer, and the video gives only one side of it.
- Cause: `video/src/videos/be-databases/script.ts:499` (lock-choose).
- Fix: add to lock-choose: "Pessimistic makes others wait, so it costs throughput, and holding several locks can deadlock. And across two requests, where no transaction stays open, optimistic is the only choice: send the version back with the write." Add "others wait" in red under the pessimistic end of the dial.

### 8. [P2] pacing: The leftmost-prefix payoff ("every Ada") is on screen about 2 s
- When: 207.3-209.4 s, beat `composite-prefix` ("but not every Ada" at 207.3; the phone book fades at 209.4) (element-208.jpeg)
- What: the red "every Ada: scattered through the book" rows arrive on the beat's last words, then the whole phone book fades 0.7 s after the beat ends, as `composite-run` starts. The red sweep also recolours the "Lovelace Ada" row that was the green "Ada Lovelace" hit a second earlier, so the green label points at a red row.
- Why it matters: the leftmost-prefix rule is the core of the question, and its negative case is the half that gets forgotten.
- Cause: `video/src/videos/be-databases/script.ts:339-341` (pauseAfter 0.7); `CompositeScene.tsx:94` (`bookOut = runAt - 8`); the band colour at `:176`.
- Fix: raise composite-prefix's `pauseAfter` to 1.4. Set `bookOut` to `runAt + 30`, so the book stays through "An index on customer". Give the Lovelace/Ada row a split band (green outline, red fill), or leave it green and mark the other three Adas only.

### 9. [P2] pacing: Unnarrated quick-round text is gone before it can be read
- When: 639.5-643.6 s, beat `r-keys` (element-642.jpeg); 643.6-654.1 s, beat `r-cover`
- What: on "Postgres doesn't index the foreign key's column for you" (639.5), a second schema appears: "Indexes on the transfer example's tables, from pg_indexes:", a three-row table and "primary keys only: nothing on from_id or to_id, the foreign keys". That is about 25 unread words, switched from the orders/customers example to Q7's accounts/transfers. It is gone when r-cover starts at 643.6, about 4 s later (budget about 12 s). The narration also never says why the missing index matters: joins and parent deletes then scan the child table. r-cover has the same problem in milder form, with four lines of plan facts (about 30 words, partly narrated) held about 9 s.
- Why it matters: in the rapid round the screen carries the evidence, and here it cannot be read. The schema switch adds a second thing to parse.
- Cause: `video/src/videos/be-databases/RapidScene.tsx:281-292` (pg_indexes note, table, caption); `script.ts:551` (r-keys text).
- Fix: show the index list for `orders` (or "orders: orders_pkey only, nothing on customer_id"), so the example does not change. Cut the caption to "no index on customer_id". Add to the narration: "so index it yourself, or every join and every customer delete scans the orders." Raise r-keys `pauseAfter` to 1.2.

### 10. [P3] confusion: The hash index's green "equality" bucket stays lit through the range failure
- When: 134-141 s, beat `index-hash` (element-140.jpeg)
- What: after "ask it for a range", the red dashed buckets fade at `againAt`. The scene ends with a single green bucket beside "a range: scattered buckets, nothing to walk" and a red table, so the only bucket still marked says "success".
- Why it matters: the final state mixes the previous result with the current one.
- Cause: `video/src/videos/be-databases/IndexScene.tsx:322` (`eq` has no fade-out; `bad` fades at `againAt`, `:323`).
- Fix: `const eq = ... * (1 - ease(frame, rangeAt, 10))`, and keep `bad` until the scene's end instead of fading it at `againAt`.

### 11. [P3] spacing: The retry arc's arrowhead lands on the BEGIN label
- When: 467-473 s, beat `anomalies-serial` (element-472.jpeg)
- What: the green retry curve ends at `laneA - 42`, exactly where "BEGIN" is set. Its arrowhead touches the "B", and the curve runs through the label's top. The right-hand caption also wraps to a one-word line: "...catch the failure and / retry".
- Why it matters: it is a line through a label.
- Cause: `video/src/videos/be-databases/IsoScene.tsx:160-165` (last control point `[tx(0.06) + 4, laneA - 42]`); the caption width at `:346`.
- Fix: end the curve above the label, at `[tx(0.06) + 30, laneA - 66]`, with the previous point at `laneA - 96`. Shorten the foot to "may abort: catch it and retry".

### 12. [P3] accuracy: The "one day" query is an open-ended range, shown just before Q5 teaches the half-open one
- When: 219.8-251 s, beats `composite-day`, `composite-skip` (element-224.jpeg, element-251.jpeg)
- What: on screen, `WHERE created_at >= '2024-12-31'` is narrated as "one day". It is one day only because the generated data ends there. Thirty seconds later, Q5's fix writes a day as `>= '2024-06-01' AND < '2024-06-02'`.
- Why it matters: a viewer who copies the pattern gets every row after that date.
- Cause: `video/src/videos/be-databases/check.mjs:175` (`ONE_DAY`).
- Fix: `WHERE created_at >= '2024-12-31' AND created_at < '2025-01-01'`, then rerun `check.mjs` (the counts should not change).

### 13. [P3] explanation: Skip scan's "five index searches" against four visible status runs
- When: 244.9-250.8 s, beat `composite-skip` (element-251.jpeg)
- What: the narration says "five index searches". The strip shows four status runs, with a fifth arrow off the strip's right end that nothing labels.
- Why it matters: the number looks like a miscount. Explaining it teaches how skip scan works: one search per distinct leading value, plus one to find there are no more.
- Cause: `video/src/videos/be-databases/CompositeScene.tsx` (skip arrows); `script.ts:364`.
- Fix: label the fifth arrow "+1: no more statuses", or say "five index searches, one per status and one to find the end".

### 14. [P3] confusion: The transaction example shows an account that plays no part
- When: 368.9-394.8 s, beats `txn-run`, `txn-abort` (element-379.jpeg)
- What: "Here's a transfer of thirty" shows accounts 1 and 2 at 100. The code debits account 1 and records a transfer to account 99, and nothing ever credits anyone. Account 2 sits unchanged, so a viewer expects the money to go there.
- Why it matters: it is a small distraction in the scene that teaches atomicity, whose canonical example is "debit one, credit the other".
- Cause: `video/src/videos/be-databases/TxnScene.tsx` (accounts table and the "moving 30 from account 1" note, around lines 135-156).
- Fix: change the note to "moving 30 from account 1 to account 99, which doesn't exist", and drop account 2's row. Or say in the narration "to account two, mistyped as ninety-nine".

### 15. [P3] explanation: The fan-out fix and its warning are left abstract
- When: 337.7-355.6 s, beats `fanout-fix`, `fanout-check` (element-356.jpeg)
- What: "count the items per order, then join" shows the CTE but no final join, and the fixed grid shows the same 24 amounts with no item counts. A viewer cannot see that the counts survived the fix. "The error multiplies, so a small sample can hide it" is opaque on its own. The page's meaning is that a sample of mostly single-item orders shows little inflation.
- Why it matters: the fix's point is that you keep both numbers at the right grain, and the figure shows only one.
- Cause: `video/src/videos/be-databases/FanoutScene.tsx:213`; `script.ts:415-421`.
- Fix: add a small item count ("×3") to each green cell, or a second line "items: 48" under the green SUM. Reword: "The error grows with the items per order, so a test on single-item orders can hide it."

### 16. [P3] explanation: "Log records" are used as the write cost with no gloss
- When: 162.7-174.4 s, beat `hurt-writes` (element-186.jpeg)
- What: "Ten thousand inserts wrote ten thousand log records". The screen says "write-ahead log records", and neither explains why the record count measures write cost.
- Why it matters: the comparison only lands if the viewer knows each record is a change the database must write durably.
- Cause: `video/src/videos/be-databases/script.ts:316`.
- Fix: "...wrote ten thousand records to its write-ahead log, one per change, with no index, and forty thousand with three...".

### 17. [P3] pacing: The sargability beats run at 3.1 w/s
- When: 284.6-299.8 s, beats `plan-why` (3.17 w/s) and `plan-fix` (3.12 w/s), 0.6 s gaps
- What: the scene's central idea (a function on the column defeats the index; rewrite as a range) arrives at the fastest rate in the video. Meanwhile the left-hand listing clears and retypes at 293 s.
- Why it matters: this is the answer to "how do you fix a slow query?", and it deserves room.
- Cause: `video/src/videos/be-databases/script.ts:387-395` (pauseAfter 0.6 each).
- Fix: raise plan-why's `pauseAfter` to 1.0, and split plan-fix after "on the column itself".

### 18. [P3] spacing: Small labels set against their neighbours
- When: 320-357 s, `fanout-run` to `fanout-check` (element-356.jpeg); 175-187 s, `hurt-space` (element-186.jpeg); 108 s, `index-scan` (element-108.jpeg)
- What: "join items" starts 7 px from the "52.8" cell's right edge. "bigger" sits about 5 px above "67 MB"'s baseline. The one lit table page in index-scan is a 12 px ring at the grid's corner, nearly invisible at 1080p ("to keep one row").
- Cause: `video/src/videos/be-databases/FanoutScene.tsx:147-148` (`x={X0 + leftW + 6}`); `HurtScene.tsx:217`; the `lit` entry in `IndexScene.tsx:237`.
- Fix: put "join items" at `X0 + leftW + 22`, above the arrow. Align "bigger" to the 67 MB baseline. Draw the lit page as a 40 px yellow square with a leader to "the first page holds it".

### 19. [P3] other: Seven of twelve scenes have no spot art, and the levels scene is mostly empty
- When: index, hurt, plan-q, txn, levels/anomalies, lock, deadlock; most visible at 396-415 s (element-414.jpeg)
- What: watercolor art appears only in hook, nosql (the cylinders), composite (book), fanout (coins) and the close (`illustrations.json` has five images). Q8 holds a four-row list in the left third and one sentence at the far right for about 15 s, with the middle of the frame empty.
- Why it matters: the series plan asks for "as many small spot images as the whitespace allows", and Q8 has the most whitespace in the video.
- Cause: `video/src/videos/be-databases/illustrations.json`; `IsoScene.tsx` (levels phase).
- Fix: add a spot to at least the levels/anomalies, lock (a padlock) and deadlock (two locked doors) scenes. In Q8, bring the grid's three anomaly headings in, greyed, on "defined by the anomalies it rules out" (around 408 s), so the middle fills with what the narration describes.
