# AnalyticsEngineer-2-ChangingDimensions: fixes (second review)

Review: `../AnalyticsEngineer-2-ChangingDimensions.md` (0 P1, 1 P2, 3 P3). All ten fixes from the 2026-11-20 pass were confirmed holding before anything changed.

| # | Sev | Finding | Status | What changed |
| --- | --- | --- | --- | --- |
| 1 | P2 | Question 5's load joins the dimension on the customer ID alone, the trap Question 2 names | fixed | `check.mjs`: the Question 5 `dim_customer` now holds both of Acme's versions (1001 East, not current; 1002 West, current) and an `is_current` column. The inner-join lookup, the left-join load and the correction job each gain `AND d.is_current`. The drawn table reads `WHERE is_current` and is titled "dim_customer, current rows" (`LateScene.tsx`). A new expectation in `check.mjs` pins that 42 has two versions, so the predicate does real work. |
| 2 | P3 | Two different "Run 2"s in the snapshot answer | fixed | The table's note now reads "Next run: the source now says West". The gap figure is titled "Customer 42 in the source, moving twice between runs" (`SnapScene.tsx`). |
| 3 | P3 | "Rebuilt: the order lands in May" leans on the video's word for arrival | fixed | The caption now reads "Rebuilt: May, the month of its order date" (`LateFactScene.tsx`). The narration is not re-voiced: with the caption, "the period the order lands in" reads as the order date's period, so new audio would only change the wording. |
| 4 | P3 | The three flow boxes start their text at three heights | fixed | A small `Top` wrapper in `SnapScene.tsx` starts each box's lines at the same top padding. The three titles now share y 697 (they were at 736, 716 and 697). `parts.tsx` `Box` is untouched. |

Counts: 4 fixed, 0 partly, 0 moot, 0 not fixed.

## Voice

Nothing re-voiced: 0 of 400 characters. Every fix is on screen or in the data, and no beat, cue or pause changed. The after timeline's `beats.json` is identical to the before one.

## Images

None generated.

## Length

484.5 s (8:04.5), unchanged.

## Data

`check.mjs` re-run (PGlite 0.5.16, PostgreSQL 18.6). Comparing the old and new `results.json` step by step:
- Every row of every step comes back identical: staged 700.00 of 1,110.00, the loaded rows, `fact_orders` before and after, both region reports, 1 row re-keyed, 0 left on -1, the `dim` and `dimAfter` rows (-1, 1002, 1003, then 1025), and every figure outside Question 5.
- The comparisons with de-modeling-history's `results.json` (staged rows, inner-join sum, mini-dimension count) still pass.
- What changed is the Question 5 setup and the SQL text of `dim`, `load`, `loadSum`, `loadUnknown`, `arrive`, `dimAfter` and `correct`, which is the finding. There is also one new step, `versions42` (2), checked by a new `expect`.
- `pages` (the dbt.mdx quotes and YAML) is identical.

## Checks (final code, through `out/entries/AnalyticsEngineer-2-ChangingDimensions.tsx` and the queues)

CHECKS_TABLE

Stills looked at, all from the final code (`$S/after/AnalyticsEngineer-2-ChangingDimensions/`): 231 (the "Next run" note), 249.5 (the gap figure's title), 278.5 (the flow boxes top-aligned), 297.5 (the lookup with `AND d.is_current`, "dim_customer, current rows"), 307.5 (the left-join load), 318 (the correction job; its 6-line listing clears the row above), 330.5 (the late-watch chart, unchanged) and 375.5 (the new caption).

## Comparisons

`/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/compare/AnalyticsEngineer-2-ChangingDimensions/`:
- `01-the-unknown-member-load-said-which-version-it-me.png` (finding 1, 5:07.5)
- `01-the-correction-job-also-picks-the-current-versio.png` (finding 1, 5:18.0)
- `02-the-table-s-run-is-no-longer-run-2.png` (finding 2, 3:51.0)
- `02-the-gap-figure-says-it-is-a-different-history.png` (finding 2, 4:09.5)
- `03-the-rebuilt-month-is-named-by-its-order-date.png` (finding 3, 6:15.5)
- `04-the-three-flow-boxes-titles-share-one-line.png` (finding 4, 4:38.5)

## Shared kit

Nothing needed. `Box` in `parts.tsx` always centres its content vertically. That file belongs to this folder, but the top alignment is done with a local wrapper in `SnapScene.tsx`, so the other boxes in the video are unchanged.
