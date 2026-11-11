# BackendEngineer-4-Databases: fixes

All 19 findings fixed (9 P2, 10 P3). New length **12:09.3** (729.3 s, was 11:06): seven new beats, 922 characters re-voiced.

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P2 answer | fixed | `anomalies-serial` split at its sentence break into `anomalies-serial` and `anomalies-abort` (both cut from take 5, free). New beat `anomalies-skew` between them: "That stops write skew, which repeatable read allows: two transactions each check a rule, then each change a different row, and together they break it." The drawn timeline is now a write skew. It has the rule ("rule: one doctor stays on call"), BEGIN on both lanes, `SELECT → 2 on call` on both, `UPDATE doctor A` and `UPDATE doctor B`, and a red line "under repeatable read, both commit: nobody on call". Then B commits, A gets the serialization failure, and A retries. The repeatable read level is banded red while "which repeatable read allows" is spoken. The right-hand note adds "also stops write skew, which repeatable read allows". |
| 2 | P2 | fixed | The strike and its `<line>` are gone. The standard's "possible" stays in red, with a yellow `Badge` "Postgres: no" beside it (sans, 20px, no border) on read uncommitted / dirty read and repeatable read / phantom. I kept "Postgres: no" rather than "Postgres: prevented" because the longer badge would run into the non-repeatable column (270 px columns). This one ends 24 px clear of it. |
| 3 | P2 | fixed | The ring is removed. `created_at::date` gets a red `MARK_RED` band in the statement listing, as the filter line below already has. |
| 4 | P2 | fixed | The label now reads "one day, scattered across runs:". Customer 42's `lit42`, `read` and yellow outline fade out on `dayAt`. |
| 5 | P2 answer | fixed | New beat `nosql-scale`: "Relational scales further than people think, with replicas and sharding, so decide on the access pattern and the consistency you need, not on size alone." On screen: "scales too: replicas, sharding" under the SQL cylinder, and "decide by access pattern / and consistency, not size" between the two stores. The SQL note clears when the join arrives, so it no longer crowds the join row. |
| 6 | P2 | fixed | New beat `plan-gap`: "Postgres picks its plan from that estimate, so a big gap means a bad choice, like a nested loop over far more rows than it guessed." It has a three-line note under "threw away". This also covers the page's nested-loop red flag without changing "three things". `plan-sarg` is split (its first sentence is cut from the take, free). New beat `plan-fixes`: "The other usual fixes: an index on the expression itself, or fresh statistics when the estimates are stale." On screen: "an index on `created_at::date`, or `ANALYZE` when estimates are stale". |
| 7 | P2 answer | fixed | New beat `lock-cost`: "Pessimistic makes others wait, which costs throughput and risks deadlocks. And across two requests, with no transaction held open, only optimistic works: send the version back with the write." The NOWAIT listing and its error fade once they have made their point, and their space holds "Its price: **others wait** (red), and locks can deadlock" and "Across two requests: **only optimistic**", plus a soft line "no transaction stays open; the version goes back with the write". |
| 8 | P2 | fixed | `composite-prefix` `pauseAfter` changed from 0.7 to 1.4. `bookOut` is now `runAt + 4`. The strip, the CREATE INDEX listing and the strip note now start at `runAt + 14`, so they never overlap the book. "every Ada" stays up about 2.7 s past its words, up from about 0.7 s. The Lovelace/Ada row has a split band (red fill, green outline), so the green "Ada Lovelace" label still points at a green-marked row. |
| 9 | P2 | fixed | The panel now uses the same example as the scene: a new `keys` figure in `check.mjs` (`customers` and `orders`, with `orders.customer_id REFERENCES customers`). `pg_indexes` lists only `customers_pkey` and `orders_pkey`. The caption is cut to "**no index on** `customer_id`". New beat `r-keys-fix` (pauseAfter 1.2): "Index it yourself, or finding a customer's orders, or deleting a customer, scans the whole orders table." On screen: "index it yourself" and "or lookups and deletes scan all orders". The panel now stays up about 13 s, up from about 4. |
| 10 | P3 | fixed | The equality bucket fades on `rangeAt`. The range's dashed red buckets stay marked to the scene's end. |
| 11 | P3 | fixed | The retry curve now ends at `[beginX + 30, laneA - 62]` (controls at `laneA - 96`), clear of BEGIN. "retry" moved to `laneA - 106`. The foot now reads "may abort: catch it and retry" and no longer wraps. |
| 12 | P3 | fixed | `ONE_DAY` is now `>= '2024-12-31' AND < '2025-01-01'`. `check.mjs` was rerun. The two listings mark both lines. |
| 13 | P3 | fixed | On screen only: "end" over the fifth arrow, and the line "5 searches: 4 statuses + the end" in the skip-scan note. |
| 14 | P3 | fixed | Account 2's row is gone from both accounts tables, since it is a bystander. The note now reads "moving 30 from account 1 / to account 99, **which doesn't exist**". The second line appears on "recording the transfer fails". |
| 15 | P3 | fixed | `fanout-check` split. Its second sentence is cut from the take, and the first is re-voiced as `fanout-grow`: "The error grows with the items per order, so a test on single-item orders can hide it." (86 characters, the only P3 voicing). On screen: "`SUM(items)` = **48**, each order's count kept" under the green SUM. The value is `FANOUT.fixedItems`, summed from the fixed query's rows and asserted equal to the joined row count. |
| 16 | P3 | fixed | On screen, not voiced: the note under the WAL bars now reads "one record per change written to disk; an insert changes every index". |
| 17 | P3 | fixed | Timing only: `plan-why` and `plan-fix` `pauseAfter` changed from 0.6 to 1.0, and the new `plan-gap` beat sits before `plan-why`. Splitting `plan-fix` at its comma was tried, but `narrate --dry-run` could not cut the second half from the take and would have voiced it, so I reverted the split. |
| 18 | P3 | fixed | "join items" moved to `X0 + leftW + 22`, above the arrow. "bigger" is now part of the 67 MB value's own span, so it shares the value's line and size. The lit page in index-scan is now a 36 px yellow page square under the grid, with a yellow leader up the grid's left edge to page 1, and the note sits beside it. |
| 19 | P3 | fixed | There are three new watercolors (`illustrations.json`, gpt-image-2.6-flare, quality low, transparent, about $0.07). `steps` (four blocks in the four primaries) is in Question 8 under the grid. `padlock` is left of the pessimistic panel until the optimistic panel arrives. `padlocks` (two locks hooked through each other) is in the deadlock scene, bottom right. In Question 8, the three anomaly headings come in grey on "defined by the anomalies it rules out", and the grid's rules widen to them. |

## Voice

- **922 characters re-voiced** (budget 1,000; P3 86 of 300). Seven new beats, each voiced alone with `--only`:
  - `nosql-scale` (153)
  - `plan-gap` (131)
  - `plan-fixes` (107)
  - `fanout-grow` (86)
  - `anomalies-skew` (150)
  - `lock-cost` (191)
  - `r-keys-fix` (104)
- Free recuts from the kept takes:
  - `plan-sarg` (split)
  - `fanout-check` (split)
  - `anomalies-serial` and `anomalies-abort` (split)
- Every other beat's mp3 is byte-identical to before. `git diff --stat` on `public/narration/be-databases` against the pre-fix commit lists only the beats above and `alignment.json`. `takes/` is untouched.

## Facts

`check.mjs` was rerun.

- **Changed, by finding 12 (the day query's SQL):** `composite.dayCount`, `dayPlan` and `skipPlan`.
  - The day's count is still 2,656. Rows Removed is 997,344, Index Searches is 5 and Heap Fetches is 0, all as before.
  - The Seq Scan's estimate moved from rows=2657 to rows=2656. With both bounds given, the estimate is now exact.
- **Added, by finding 9:** the `keys` figure.
- **Everything else in `results.json` came back identical.** That is every other step of every figure, including all spoken numbers. The `data.ts` assertions pass.

## Checks

- tsc (folder) and eslint (folder): clean.
- `npm run check:cues`: pass.
- `npm test`: 79 pass, 0 fail.
- `check:sync`: pass. 68 beats, worst +0.03 s.
- `check:motion`: pass. 0 stretches still for 2 s or more.
- `check:mix`: pass (closest: speech 8.9 dB above the effects at 8:56.5)
- `check:frames`: pass (8 images, 28 arrows up to 8.8°, spacing, one size per line, no tabular hyphens)
- Stills taken at 30 moments, covering every change, and looked at. The badge font was caught in the first pass (it inherited the serif) and fixed.

## Noticed

- `parts.tsx` in this folder is the video's own, so the three new `ART` entries live there. No shared file was touched.
- The ghost "104 / 9" row in the keys panel is struck through by `DataTable`'s `strikeAt`. That strike sits on a refused (red) row, so it reads as the error rather than as a correct statement struck. I left it.
