# DataAnalyst-7-AbTesting: fixes

Folder `video/src/videos/da-ab-testing/`. Report:
`agent-outputs/20261029-da-interview-video-review/DataAnalyst-7-AbTesting.md` (0 P1,
8 P2, 11 P3). The fixer's report, saved by the coordinator (the fixer could not
write files outside its folder).

All 19 findings fixed. The hook's fox (14) was redrawn by the coordinator after
this report, with the prompt below and sharp loaded from a scratch copy. The work went in with the work-in-progress snapshots; compare against
`8de9f413` (#715), the last commit before this pass that touched the folder.

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P2 | fixed | The p-value figure: the grey fill under the whole null curve is gone, and so are the invisible red tails past ±3.64. The tails past ±1.96 fill yellow, cued to "the usual cutoff", with "yellow: past ±1.96, where 5% of do-nothing gaps land" and "**p = 0.0003**: the area past ±3.64, too thin to see" in ink. The marker reads "ours: 3.64 / standard errors out". p is no longer in trap red. `pvalue-gap`: "If the change did nothing, a gap of three point six four standard errors or more would turn up about three times in ten thousand." 1.96 is `EXPERIMENT.zc`, 5% is `ERRORS.alpha`. |
| 2 | P2 answer | fixed | `pvalue-gap` continues: "That's far below the usual cutoff of point oh five, so we treat the lift as real." On screen: "**0.0003 < 0.05**, the usual cutoff: treat the lift as real". 0.05 is now introduced in Q7, before Q8 draws its line. |
| 3 | P2 answer | fixed | New beat `peek-why`: "Every look is another chance for noise to cross the line, so a team that checks this often ships a false winner far more than five percent of the time." Re-voiced `peek-fix`: "Fix the sample size in advance and look once, or use a sequential test, which sets a stricter line for every look." Matching red and green notes, each clause cued to its words. |
| 4 | P2 answer | fixed | New beat `signif-size`: "Here it's a fifth of a standard deviation. Whether that matters is a business call: compare the effect and its range with the smallest lift worth shipping." Every dot is `A_COLOR` and the p labels are in ink, so green is left to "report the effect and its range". The effect note gains ": *d* = 0.2", now from a `check.mjs` step (`practical.d`) rather than typed into `data.ts`. |
| 5 | P2 answer | fixed | New beat `ratio-fix`: "So add up the numerator and the denominator first, and divide once." Green note: "sum, then divide once: 610,590 revenue / 11,790 customers = 51.8" (new step `ratio.totals`). 51.8 is `OK_INK`; the Islands note stays up about 7 s instead of 2.4 s. |
| 6 | P2 | fixed, different label | A dashed line at `-crit`, "or a loser past here" (20px). Each red tail carries its own half of α, "2.5%", placed from the moving line. The Type I row reads "(α = 5%, half in each tail)". `errors-alpha` re-voiced: "Its rate is alpha, usually five percent, split evenly between a false winner and a false loser." The suggested single label collided with the alternative curve. |
| 7 | P2 | fixed | "only more data shrinks both" is folded into the row above. The α and β labels are placed from `at(zs, crit)`, so the moving line no longer cuts through "β". |
| 8 | P2 | fixed | All eight 18px labels are 20px. |
| 9 | P3 | fixed | The peeking line is drawn piecewise through 800, 2,000, 4,600 and 8,000, each on its words. The empty-axes stretch is about 1.5 s shorter. |
| 10 | P3 answer | fixed | All five: Q4's per-step conversion defined ("each step's users over the step before"); Q10's MDE as "the smallest lift worth the cost of shipping" (its own beat, since the take says "M D E" and `power-mde` cannot be cut from it for free); Q14 "Treatment A is still the better one."; Q17 "check that the lift holds for users who never saw the old version"; Q18 why one blended retention number hides it. |
| 11 | P3 | fixed, two worded differently | "the usual flag" for the 0.1 balance line; a new `ci-se` beat defining the standard error; the power panel titled "power to catch a lift from 10%" with 0% and 100% ticks (spelling each curve "10% → 15%" made the labels collide); "In one test" (not "one real test": the experiment is simulated, `rng(42)`). |
| 12 | P3 | fixed | `ci-wide`: "And if the range were wide, running from a loss to a big win, we'd need more data before deciding." No −1 to +5 band drawn: those numbers would be invented. |
| 13 | P3 | fixed | The drift chart drops its 600 tick; the week-2 label sits clear of both gridlines. |
| 14 | P3 | fixed (fox redrawn afterwards) | 51.8 is `OK_INK`; the 10% → 11% bar and 14,751 are blue 800, matching the 11% curve. **The fox is not redrawn**: `npm run illustrations` imports the repo root's `sharp`, which is not installed. To do it: set the prompt in `illustrations.json` to "a red fox sitting between two plain doors standing side by side, one door painted blue and the other teal, the fox sitting between them looking at the viewer", then `npm run illustrations -- da-ab-testing --only da-ab-testing-fox --force` from `video/`. |
| 15 | P3 | fixed | The funnel and peek scenes have content at their first frame; `power-def` holds 1.4 s. |
| 16 | P3 | fixed | The power panel draws in Q10 and stays through Q12; `BARS.max` 620 keeps the 14,751 bar clear of it. |
| 17 | P3 | fixed | Each row reads users, LAG(users), step conversion. |
| 18 | P3 | fixed | `BAL.pitch` 40; the legend reads "● a coin: only Age over, at 0.102" and ends near y 975. |
| 19 | P3 | fixed | `pvalue-not` and a new `pvalue-size` beat; the two strikes land about 3.3 s apart. |

No finding was judged wrong, and the page needed no correction.

## Voice

1,646 characters re-voiced, each beat on its own: 793 for P2s (`pvalue-gap`
211, `signif-size` 155, `peek-why` 151, `peek-fix` 114, `errors-alpha` 95,
`ratio-fix` 67) and 853 for P3s (`abtest-balance` 128, `ci-wide` 98,
`pvalue-test` 96, `funnel-step` 91, `r-cohort-why` 89, `ci-se` 80,
`power-worth` 74, `r-novelty-check` 70, `pvalue-size` 48, `pvalue-not` 43,
`simpson-better` 36). Cut free from the kept takes: `funnel-steps`,
`abtest-coin`, `pvalue`, `ci-margin`, `ci-cover`, `errors`, `errors-beta`,
`simpson-why`, `simpson-segment`. Every other beat is byte-identical.

## Length and checks

- 631.4 s (10:31), 63 beats; was 546.1 s.
- Typecheck and lint clean; `npm test` 69/69; `check:cues` clean.
- `check:motion` passes (longest still 2.0 s); `check:sync` passes (worst
  +0.04 s); `check:mix` passes (effects 27.9 LU under the narration);
  `check:frames` passes.
- Stills at every changed moment, in all nine scenes.

## Facts

`check.mjs` ran with the brief's Pyodide and DuckDB copies and a resolver hook
that stubs `@observablehq/plot` and `linkedom` (`charts/_theme.mjs` imports
them at load; `check.mjs` calls only `normalSamples` and `mean`). A baseline run
reproduced `results.json` byte for byte. Three values were added
(`sql.ratio.steps.totals`, `py.practical.steps.d`, `charts.power.from`); every
existing value came back identical.
