# AnalyticsEngineer-1-FactsAndGrain: fixes

All 14 findings fixed (5 P2, 9 P3). New length **705.0 s (11:45)**, up from 674.7 s (11:15). That is four new beats, one beat split in three, and about 6 s of longer holds. **463 characters re-voiced.**

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P2 answer | fixed | `role-why` is replaced by two beats, both voiced on their own. `role-why`: "One table means one calendar: every role reads the same holidays and fiscal periods." `role-span`: "Together, the roles answer what no single role can: order to delivery took six point seven days on average, nine at most." On screen, "One calendar for every role" now sits over the `dim_date` box and stays up. The bottom note reads "Together, they answer across roles" (cued to `role-span`), and the 6.7 / 9-day verdicts are now cued to `role-span`. `RoleScene.tsx`. |
| 2 | P2 answer | fixed | New beat `hash-versions` after `hash`: "For a versioned dimension, hash the ID together with the version's start date, and a fact still finds its version by date." Under the green "A fact computes its key: no lookup", a line inks in by phrase: "With versions: hash `customer_id` with `valid_from`, found by date" (ink, 24px). It clears with the left column. No SQL was added on screen, since nothing new ran. `HashScene.tsx`. |
| 3 | P2 | fixed | The `MARK_BAD` swap on the touched column is removed, so the touched sums stay yellow. "never add these" stays red and allocated stays green. The unused `MARK_BAD` import is dropped. `BridgeScene.tsx`. |
| 4 | P2 | fixed | The md5 bar now draws on "under a third" (`thirdAt - 2`), with its pop moved to match. "Under a third the size" now appears on `hashesAt + 6`, after both bars. `hash-size` `pauseAfter` changed from 0.6 to 1.4, so the finished comparison holds about 2.4 s before `hash-trap` clears it. That was about 0.5 s before. |
| 5 | P2 | fixed | Timing only. `pauseAfter` changed from 0.8 to 1.4 on `r-periodic`, `r-degen`, `r-date`, `r-confirmed`, `r-drill`, `r-3nf` and the new `r-agg-why`, and to 1.6 on `r-bank`. Both pages now end their last body at `to + 44` (was `+ 30`), so `r-conformed`'s and `r-kimball`'s answers hold until the page's own cross-fade. Each last line now stays up about 2.3 to 2.7 s after it lands, against 1.5 to 2 s before. |
| 6 | P3 | fixed | Page two uses page one's geometry (`LIST_TOP = BODY_TOP = 300`) and page one's headline, already inked at the cut, so the page turn changes only the rows. Every answer body moved down 30 px. The lowest, `r-bank`'s last line, now ends at about y=870. `RapidTwoScene.tsx`. |
| 7 | P3 | fixed | The 24 squares now pop from "The grain is the finest detail" (`grainAt`), and "Grain: one row per order" stays on `orderAt + 6`. |
| 8 | P3 answer | fixed | New beat `r-agg-why` (pauseAfter 1.4): "Join the mart back to the orders, and each category's total is counted once per order." On screen, a red line below both columns at the panel's left edge reads "Joined back to the orders: each total counted once per order", with its second half on "counted once per order". |
| 9 | P3 | fixed | Semi-additive now carries "Sums across accounts, not time" (ink, 22px) on "Across time, it doesn't". `AdditiveScene.tsx`. |
| 10 | P3 | fixed | `ratio-fix` is split at its sentence breaks into `ratio-fix`, `ratio-weight` and `ratio-forgot`. The first and last are cut from take 3 for free. `ratio-weight` is voiced on its own as "A ratio of sums weights each order by its revenue." (50 characters). The green line on screen says "weights". The cues moved to the new beats. |
| 11 | P3 | fixed | "Rows one read has and the other lacks: 0" now sits on the result table's caption line (`rg.top - 38`, label 21px, the caption's own face). It stays to the scene's end instead of fading before the verdict. `StarScene.tsx`. |
| 12 | P3 | fixed | On screen only: "Snowflake: only when huge, or shared by several dimensions" (still on `sharedAt`). It ends at about x=1290. |
| 13 | P3 | fixed | The plan's "13" is now `BLUE_INK`, like the "9". Kimball's "Value comes fast" is now ink, matching Inmon's "More consistent". The closing's "except one" is ink at weight 500. The unused `OK_INK` and `BLUE_INK` imports are dropped from Hook and Closing. |
| 14 | P3 | fixed | `grain-fix` `pauseAfter` changed from 0.6 to 1.0 (timing only). |

## Voice

- **463 characters re-voiced** (budget 1,000; P3 136 of 300). Five beats, each voiced on its own with `--only`:
  - `hash-versions` (122)
  - `role-why` (84)
  - `role-span` (121)
  - `ratio-weight` (50, P3)
  - `r-agg-why` (86, P3)
- Free recuts from take 3 (`--recut`): `ratio-fix` and `ratio-forgot`.
- No `--force`. Every other beat's audio is unchanged.

## Data

`check.mjs`, `results.json` and `data.ts` are untouched, so every existing value comes back identical. No new number was added: the fixes are wording, layout, cues and timing.

## Checks (final code, through `out/entries/AnalyticsEngineer-1-FactsAndGrain.tsx` and the queue)

| Check | Result |
| --- | --- |
| typecheck (`tsc --noEmit`, errors naming the folder) | pass, none |
| lint (`eslint src/videos/ae-facts-and-grain`) | pass |
| `check:cues` | pass: every word cue names a phrase its beat says |
| `npm test` | pass (79/79) |
| `check:frames` (`CHECK_SCALE=1`) | pass: 4 illustrations within their pixels (largest stretch 0.44); 20 arrows within 10°; ERD ends straight; spacing, tabular and one-face checks clean |
| `check:motion` | pass: 11:45.0 checked; nothing still for 3 s (one 2.0 s stretch, 9:20 to 9:22, in `r-confirmed` while the question is read) |
| `check:sync` | pass: 55 beats; worst +0.05 s (`rapid-in`). The new beats sit at `hash-versions` +0.04, `role-why` −0.00, `role-span` −0.01, `ratio-weight` −0.00, `r-agg-why` +0.00 |
| `check:mix` | pass: effects −49.0 LUFS, 29.1 LU under the narration (−19.9 LUFS); speech a median 28.9 dB above the effects where both sound |

The check WAVs and the preview (`out/AnalyticsEngineer-1-FactsAndGrain-{dry,wet,fx}.wav`, `-preview.mp4`) were deleted.

Stills at every changed place (24, 122.8, 135.5, 206.5, 212.8, 215.5, 278, 334.5, 366.5, 376, 384.5, 436, 478.3, 509.5, 546.8, 557.8, 559.6, 570.9, 590.8, 599, 620.7, 640.5, 667.9, 690.4 and 700 s) were rendered and looked at. They are in `video/out/review/AnalyticsEngineer-1-FactsAndGrain/`. Two placements were corrected after looking:
- "One calendar for every role" sat tight against order 101's table, so it moved above `dim_date`.
- The `r-agg-why` line ran off the right edge from the mart's x, so it moved to the panel's left edge.

Both were re-rendered at 366.6 and 620.8 s.
