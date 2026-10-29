# DataScientist-6-ExperimentDesign: P3 fixes

All nine open P3s fixed; 15 was already done in the P2 pass. Nothing committed.

| # | Result | What changed |
| --- | --- | --- |
| 7 | fixed | All seven scenes (Hook, Design, Unit, Errors, Size, Sides, SPRT) now stay up through the 1.6 s pause and clear into the cut: `clearAt = n.beat(<next scene>).from - 14`, with each `Drift` running to the same frame. The next scene cross-fades in over the finished page. Stills in every pause (30.9, 91.8, 149.9, 205.3, 262.9, 341.3, 463.8 s) show the full figure where there used to be an empty page. The only blank left is the 0.2 s or so between the old scene's fade and the new question card's first ink (31.5 s still). |
| 8 | fixed | At "Double the users", the design's "= 20%" (β line) and "= 80%" (power line) fade to 28%; "β" and "power = 1 − β" stay. The shifted curve gets its own green "98% power" inside its area, from `POWER.levers[0].power`. The curve as drawn computes to 97.7%, so the label matches the picture. The axis is named "where the test statistic lands", right-aligned one row under "threshold, z = 1.96" so the two never read as one line. |
| 9 | fixed (size), partly (design) | **Size:** the empty axes ("users per arm" against "MDE, points of conversion") now arrive at "From four inputs", so the frame is up while the inputs are named. **Design:** the suggested 1.2x scale does not fit. The card already runs from y 290 to about 970 of 1080, so 1.2x would end near 1,150. Instead the card sits centered while it is the only thing on the page, then slides left as Question 2 arrives (`q2At - 4`, 18 frames). The page is balanced now, but it is still one card with white either side for those 26 s. |
| 10 | fixed | As suggested: `CHIP_W = 188`, `CHIP_GAP = 8`, `LAUNCH_X = 1110`, `DOTS_X = 1170`. "how many users" has room inside its chip, the launch tick is clear of the last chip, and the dots stop short of the heron (25 s still). |
| 11 | fixed | The line now reads "a coin puts 5 or 6 in one arm about 1 time in 5 (21.9%)". |
| 12 | fixed | `noninf` is split at its sentence breaks into `noninf`, `noninf-big` and `noninf-end`, cut from take 3. Two new beats are voiced. `noninf-rule`: "The null is that it's worse by more than that. You reject it when the lower end of the ninety-five percent interval clears the margin." `noninf-small` replaces the "reaches past minus one" sentence: "At six thousand, it also contains zero, but its lower end crosses the margin, so non-inferiority can't be claimed." On screen, a rule line sits under the checkout note: "H₀: worse by more than the margin · rejected when the 95% interval's lower end clears it". Its second half builds on "You reject it", and "95% interval's lower end" is highlighted on its words. The 6,000 verdict now reads "contains 0, but crosses the margin". |
| 13 | fixed | The axis titles now read "**X**: each user before the test" and "**Y**: the same user during it". Y cross-fades to "**Y_adj**: during it, adjusted" once the cloud flattens, and the letters are set in the formula's mono so they match it. The titles are drawn locally, since the shared `Axes` takes only a string. "slope θ = 0.705" dims instead of vanishing. New beat `cuped-r`: "The share of the variance it removes is the squared correlation between before and during: point seven five squared here, a little over half." It shows "share removed = r², with r(X, Y) = 0.75" from `CUPED.corr` (0.752, already in `results.json`); 0.752² = 0.566 = 1 − `cuped.share` (0.435). |
| 14 | fixed | The verdicts now read "fails 1: easy to inflate" and "fails 3: arrives after the test ends". The matching chip pulses on each verdict, and all three pulse on "passes all three". |
| 15 | done in P2 | (`sprt-cost` split, with 0.6 s before `sprt-pairs`.) |
| 16 | fixed | Two new voiced beats. `r-sensitive-gain`: "So the capped metric can detect a smaller effect, and a few big spenders no longer swing it." On screen, in green: "capped: more sensitive, and more robust". `r-strata-var`: "It also lowers variance when the groups differ, and it matters most in small tests." On screen: "also: lower variance when groups differ, most useful in small tests". Both follow the page's own wording: capping improves sensitivity; stratifying reduces variance when strata differ and matters most in small experiments. |

**Also changed:** `check:motion` failed once on the new timing. The opening of Question 3 held still for 3.3 s at 1:34.3 (2.3 s before this pass). "why does it matter" in the Question 3 card is now highlighted on its words (the series' `Mark`-in-a-question pattern), and the highlight clears at "Randomize each request".

## Voice

**564 characters re-voiced** (the count `narrate --dry-run` printed), each beat on its own: `noninf-rule`, `noninf-small`, `cuped-r`, `r-sensitive-gain`, `r-strata-var`. No new take, no `--force`.

The one split (`noninf` into three pieces) was cut **from kept take 3**, not from the beat's own file. I used the P2 fixer's scratch copy of narrate's `cutTake` (`$S/DataScientist-6-ExperimentDesign/p3/p3cut.mjs`). Before using it, I cut the unsplit `noninf` from take 3 with `sides` and `peek-in` as context. The result was byte-identical to the committed `noninf.mp3`, and its alignment entry matched exactly. The three pieces are first-generation encodes. The old "reaches past minus one" span is cut out and not written.

## Length and checks

New length: **596.0 s (9:56)**, from 559.2 s. 45 beats, 1,471 words, 148 wpm.

- `check.mjs` was not re-run. No new number came in: r = 0.75 was already `cuped.corr`, and 98% is `power.levers[0].power`.
- Typecheck (this folder): clean. ESLint (this folder): clean.
- `check:cues`: no failures at all.
- `npm test`: 59/59 pass.
- `check:sync`: passed. 45 beats, all within ±0.12 s; the worst is +0.03 s (`cuped-in`), and the five new beats are within ±0.02 s.
- `check:mix`: passed. Narration −19.9 LUFS; effects 28.7 LU under it; speech a median 29.9 dB over the effects where both sound (5th percentile 13.1 dB).
- `check:motion`: MOTION_RESULT
- `check:frames`: not run. No arrow, illustration or ERD changed.
- Stills, each looked at: 25, 30.9, 31.5 (hook and its cut); 50, 64, 75.3, 78.3, 82, 87.5, 91.8 (design); 96.6 (Q3 highlight); 149.9, 165, 200.6, 203.5 (errors); 205.3, 214 (size); 262.9, 313, 333, 336, 341.3 (sides); 463.8 (SPRT into CUPED); 477, 488, 507 (CUPED); 541, 557, 566 (rapid).

## Shared kit

Nothing required. One optional suggestion: the shared `Axes` (`da-statistics-communication/parts.tsx`) takes `xTitle`/`yTitle` as plain strings. A `ReactNode`, or a second title to cross-fade to, would have let CUPED name X and Y without drawing its own titles.
