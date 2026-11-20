# AnalyticsEngineer-8-Metrics: fixes

All 13 findings fixed (1 P1, 3 P2, 9 P3). New length **10:45.4** (645.4 s, was 10:33.4): one new beat, 148 characters re-voiced.

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P1 accuracy | fixed | Question 9's three revenues (`SUM(amount)`, `SUM(amount - tax)`, `SUM(amount - refunds)`) are all in ink now: three answers, none marked right or wrong. On "the same answer everywhere" (was: the beat's last frame, as the panel faded) each expression fades out and then, with no overlap, all three boxes read "the layer's revenue" in green and tone to green. No SQL is crowned, so nothing says gross revenue is right and net revenue wrong (Part 9 governs net revenue). The overprint during the old crossfade is gone (the two lines share a grid cell and never show together). Question 10's drift chain keeps its red, which marks the copies that changed from their source. |
| 2 | P2 | fixed | Question 15's ticks and crosses are hidden until their own cue (`opacity: ease(frame, at, 3)` on each wrapper), so the six dots no longer stand in the empty panel. Checked at 529 s and 536 s. |
| 3 | P2 answer | fixed | New beat `fan-test` after `fan-tell`, voiced alone: "Every test passed because each one checked an input table. Run a unique test on order ID against the joined rows, and it fails: eight orders repeat." `check.mjs` gains `testJoinedUnique` (the joined rows grouped by `order_id`, `HAVING COUNT(*) > 1`), asserted at 8 rows; `data.ts` reads it as `FAN.joinedRepeats`. On screen under "24 rows out": "Every test ran on an input table" (soft), then `unique` on the joined rows with a red "fail" badge in the hook's badge style, then "8 orders repeat" in red. `fan-tell`'s `pauseAfter` went from 0.8 to 0.7. |
| 4 | P2 | fixed | No label is struck any more. Q3: "**not `SUM(o.amount)`**: it repeats per item" (red, then soft). Q7: "not a rate column" in red under "Store". Q8: "never a stored, pre-divided rate" and "never an average of daily rates" in red, the second moved 50 px right so they keep a clear gap. The scratch effects that went with the strikes became taps. |
| 5 | P3 | fixed | Question 5's rows are named "BI tools" and "models" (soft, beside the boxes, in the column "defined once" already uses), and each request names its asker: "Dashboard: completed revenue by month", "Spreadsheet: completed revenue by region". |
| 6 | P3 | fixed | The two drift lines are labelled at their ends, "definition A" above the upper one and "definition B" under the lower one, on "they drift apart". The heading stays the narration's own words, "Left alone, the gap grows". |
| 7 | P3 | fixed | The filters line now reads "refunds, tax, cancelled orders: one counts them". |
| 8 | P3 | fixed | A blue bracket gathers Mon to Sun in Question 8, and both "sum first" arrows leave its middle. |
| 9 | P3 | fixed | Question 7's week has a legend on the heading's line, at the chart's right: "a dot: one user active that day". |
| 10 | P3 | fixed | Question 6's two semantic-model boxes come in with the definitions (orders with "entity order", order_items with its entity, then "dimension item" on Dimensions, the two measures on Measures), so the lower half is filled from about 272 s instead of 296 s. They light blue on "revenue lives on orders" and "units on items", where the old pop sound became two taps. |
| 11 | P3 | fixed | Each side of Question 4's comparison keeps its evidence under its caption: "1,949.25 became **4,555.25**" under the fan trap, "180.00 became **360.00**, 30.00 became **90.00**" under the chasm trap (red), from `FAN` and `CHASM` in `data.ts`. The hairline between them was lengthened to cover the new line. |
| 12 | P3 | fixed | "In dbt today: inside a simple metric" and "A ratio adds a numerator and a denominator" are in ink, not the data blue. |
| 13 | P3 | fixed | Under "completed revenue" in Question 13: `SUM(amount)` (in the measure column's blue) "where status = 'completed'". `r-measure`'s `pauseAfter` went from 1.2 to 1.8 (timing only) so it stays up about 3.5 s. |

Housekeeping, not findings: stale comments now say nineteen questions and eleven quick ones (`Video.tsx`, `HookScene.tsx`, `RapidScene.tsx`, the script header), and the script header no longer says the page's fan-trap block is wrong about itself (the 2026-11-20 review fixed it; `check.mjs` still reports a `pageNote` if the old wording returns).

## Voice

- **148 characters re-voiced** (budget 1,000; none on P3s): `fan-test`, voiced alone with `--only fan-test` (10.72 s).
- Timing-only changes, free: `fan-tell` `pauseAfter` 0.8 to 0.7, `r-measure` 1.2 to 1.8.
- Every other beat's mp3 is byte-identical to before: `git diff --stat` on `public/narration/ae-metrics` against the pre-fix commit lists only `fan-test.mp3` (new) and `alignment.json` (additions only). `takes/ae-metrics` is untouched.

## Facts

`check.mjs` was rerun ("every value matches the script"). The only change to `results.json` is the added step `figures.fan.steps.testJoinedUnique` (8 rows: orders 1, 3, 4, 6, 8, 10, 11, 12). Every existing value came back identical (a key-by-key comparison against the pre-fix copy found no changed or missing entry).

## Checks

All on the final code, through `out/entries/AnalyticsEngineer-8-Metrics.tsx` and the render queue.

| Check | Result |
| --- | --- |
| `tsc --noEmit` (errors in `ae-metrics`) | none |
| `eslint src/videos/ae-metrics` | clean |
| `check:cues` | pass ("every word cue names a phrase its beat says") |
| `npm test` | 79 of 79 pass |
| `check:frames` (`CHECK_SCALE=1`) | pass: 4 illustrations, 28 arrows (0.0° bend), ERD ends straight, no word collisions, one size and family per line |
| `check:motion` | pass: nothing still for 3 s (longest 2.8 s, in the quick round) |
| `check:sync` | pass: 52 beats, worst +0.04 s (`r-where`); `fan-test` +0.00 |
| `check:mix` | pass: effects 29.0 LU under the narration, median 29.9 dB below the voice |

Stills were rendered and looked at for every change (46, 74, 131, 137.3, 166, 174, 211, 218, 227, 245, 262, 271, 275, 280, 294, 311, 341, 348, 370, 394, 405, 415, 422, 426.5, 506.5, 524, 529, 536 s, in `video/out/review/AnalyticsEngineer-8-Metrics/`). The grain-test lines were moved once after the first still (they sat too close to "24 rows out") and checked again at 137.3 s. The WAVs and preview the checks left in `video/out/` are deleted.
