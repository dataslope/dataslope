# AnalyticsEngineer-1-FactsAndGrain: fixes (second review)

All four findings were fixed (1 P2, 3 P3). Nothing was re-voiced and no image was generated. The new length is **705.8 s (11:46)**, up from 705.0 s. The only timing change is 0.8 s more pause after `r-types`.

The first pass's 14 fixes were checked on screen first, and every one holds (see the review's verdict).

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P2 pacing | fixed | `r-types` `pauseAfter` changed from 0.8 to 1.6 (timing only). The note "Approved after 7 days, funded 9 days later: the same row" is now inked in two halves. "Approved after 7 days" comes with the approved cell (`placeAt + 8`). ", funded 9 days later: the same row" comes with the funded cell (`milestoneAt + 6`). Before, the whole note came after both swaps, at `milestoneAt + 12`. The whole note is now up about 3.2 s and its first half about 4 s, against 2.2 s. `RapidOneScene.tsx`, `script.ts`. |
| 2 | P3 | fixed | The month-ends Verdict lost its `strikeAt`. 4,800.00 stays red and unstruck, with "Money nobody ever had" under it. The struck "3 + 3 = 6" became an unstruck red "not 3 + 3 = 6" beside "4 people". The two `el-scratch` sounds that went with the strikes became quieter `el-tap`s on the same words. The unused `Strike` import was dropped. The script header now describes the figure. `AdditiveScene.tsx`. |
| 3 | P3 | fixed | The caption "Joined and summed" now leaves with the unweighted listing (`out={multAt + 2}`). A new caption, "Weighted first, then summed", inks in at `multAt + 10` over the weighted listing, so the old caption has finished fading first. It matches the green verdict's label. `BridgeScene.tsx`. |
| 4 | P3 | fixed | "Together, they answer across roles" no longer fades at `tookAt - 2`. It stays as the heading over the two verdicts. It moved from `rowTop(1) + h(16)` to `+ h(22)`, so there is at least 28 px under the table's rule, and the verdicts moved from `+ h(60)` / `+ h(112)` to `+ h(68)` / `+ h(120)` to keep about 27 px between the lines. `RoleScene.tsx`. |

## Voice

- **0 characters re-voiced.** No words were wrong or missing, so every fix is on screen or in timing. The 194 characters the script was already over the series' 9,500 guideline are unchanged.

## Images

None.

## Data

`check.mjs`, `results.json` and `data.ts` were not touched, so every existing value comes back identical. No new number was added.

## Checks (final code, through `out/entries/AnalyticsEngineer-1-FactsAndGrain.tsx` and the queues)

CHECKS_TABLE

## Comparisons

`/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/compare/AnalyticsEngineer-1-FactsAndGrain/`:

- `01-question-10-s-evidence-held-long-enough-to-read.png` (finding 1)
- `02-two-correct-sums-no-longer-struck-through.png` (finding 2)
- `03-the-weighted-query-gets-its-own-caption.png` (finding 3)
- `04-question-8-s-heading-stays-over-its-numbers.png` (finding 4)
