# AnalyticsEngineer-2-ChangingDimensions: fixes

Review: `../AnalyticsEngineer-2-ChangingDimensions.md` (1 P1, 3 P2, 6 P3).

| # | Sev | Finding | Status | What changed |
| --- | --- | --- | --- | --- |
| 1 | P1 | Bridge calls the snapshot "rebuilt each day" | fixed | `next` split at "Running that order" into `next` and `next-dbt` (cut from take-5, free). `next` reworded to "Every table here is updated each day, in order: …" and re-voiced alone. The heading on screen is now "Updated every day, in order" (`RapidScene.tsx`, cues moved to `next-dbt`). |
| 2 | P2 | Snapshot versions stamped by run under `strategy: timestamp` | fixed | The drawn `snap_customers` cells are now "East's updated_at" / "West's updated_at", West's updated_at / null, and the table moved left (TX 900 to 780) so it clears the camera. The flow box reads "42 · East · closed by North" and "42 · North · closed at run 3" (`invalidate` stamps the run's time). Narration unchanged. |
| 3 | P2 | Model renames `dbt_valid_to` as is, bringing back the null | fixed | A third line in the model box, "null → 9999-12-31", fades in after the two renames. `boxH` goes from 150 to 180, and the notes under the boxes move down with it. |
| 4 | P2 | Type 0's "ignored for this column" captions the Type 2 row | fixed | The note now sits directly under the `first_channel` band. The region's two versions and their axis moved down to `y(640)`. |
| 5 | P3 | Type 2 load result clears after about 2 s | fixed | `t2-load` `pauseAfter` 0.7 to 1.4 (timing only). The INSERT's result now holds about 3 s before the trap clears it. |
| 6 | P3 | Trap's red dots read as extra orders | fixed | The dots are gone. The dashed red lines still run from each order to the other version's band. |
| 7 | P3 | "Today's total" left under the restatement lines | fixed | The note leaves with the INSERT listing (`out={rulesAt - 4}`). |
| 8 | P3 | "the page's" in on-screen labels | fixed | "The point-in-time join"; "= the two versions above (0 rows differ)". |
| 9 | P3 | Q1 legend says "Type 2" a question early | fixed | "as it was (history kept)". |
| 10 | P3 | Join listing's title 8 px off the result table's title | fixed | `listTop = low`. The two titles now share a line. |

Counts: 10 fixed, 0 partly, 0 moot, 0 not fixed.

## Voice

- Re-voiced: `next` only, 122 characters, all for the P1. Budget: 1,000 (122 used, 0 on P3s).
- Free: `next-dbt` ("Running that order is dbt's job. Next: how dbt builds a project."), cut from take-5 by `--recut`. No other beat's audio changed: `--recut` left every committed MP3 byte for byte.

## Length

482.9 s to 484.5 s (8:04): +0.7 s from the `t2-load` pause, +0.9 s from the split bridge (its own minimum pause and a slightly slower new sentence).

## Data

No change to `check.mjs`, `results.json` or `data.ts`. `results.json` is byte-identical to the file before the fixes, so every existing value came back identical. No new numbers. The snapshot cells and the null line are drawn, as the snapshot always was: dbt does not run here.

## Checks (on the final code, through `out/entries/AnalyticsEngineer-2-ChangingDimensions.tsx` and the queue)

CHECKS_PLACEHOLDER

Stills looked at, rendered from the final code: 66 (legend), 131.5 (join titles aligned, new title), 141.5 (load result, new label), 150.5 (trap with no dots), 231.5 and 241 (snapshot stamps, table clears the camera), 277.6 (flow box and the null line), 419.5 (no "Today's total" under the restatement), 440.5 (Type 0 note under its column), 474.5 and 481 (bridge heading, NextLine). Each of them is in `video/out/review/AnalyticsEngineer-2-ChangingDimensions/`.
