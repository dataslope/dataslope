# DataScientist-3-MlEvaluation: P2 fixes

Folder `video/src/videos/ds-ml-evaluation/`. Review report:
`agent-outputs/20261029-ds-interview-video-review/DataScientist-3-MlEvaluation.md`.
Built on the P1 fix in `53eda7cd` (the rebalanced PR-AUC in ink).

## P2s

| # | Finding | Result | What changed |
| --- | --- | --- | --- |
| 2 | Cross-entropy vs MSE never answers, and paints the right loss red | fixed | New beat `r-xent-use`: "So use cross-entropy. Behind a sigmoid, its gradient stays strong when the model is confidently wrong, where MSE's goes flat and learning stalls." Cross-entropy's curve, dot and value are green, squared error stays blue, red only on "more confidently wrong" and ": flat". On screen, "so use cross-entropy" and the two gradients on the logit at 0.01, from `check.mjs`: cross-entropy 0.99, squared error 0.02. |
| 3 | Learning curves give bias no remedy | fixed | `learn-bias` (split off and re-voiced): "That's bias: more data won't help, but a more flexible model or better features will." The red note gains "; a more flexible model will" in green on that phrase. |
| 4 | Ridge's panel shows every coefficient going to zero | fixed | Both path panels plot asinh(v / 0.3): linear near zero, logarithmic beyond, ticks at −10, −1, 0, 1, 10 and a y title "coefficient, scale stretched near 0" (also P3 #19's missing title). Ridge's ten paths now stay visibly off the line to the right edge while lasso's sit on it. At "At this strength", a dot on every path (ridge: ten, none on the line; lasso: seven blue, the zeros red on the line); the yellow marker is 4 px, not 10. Under ridge, on "keeping every one": "all ten shrink, and none stays at 0" (three ridge paths cross zero, so "never reaches" would be wrong). The axis runs to 100 so the notes sit clear of the top paths. |
| 5 | Elastic net's "steadier" is asserted, and its numbers undercut it | fixed | `check.mjs` now fits elastic net at l1_ratio 0.9 (it was 0.5, where s1 sat at −0.24, on the edge of zero) and refits lasso and elastic net on 50 bootstrap resamples. The table shows s1, s2 and age: lasso −4.84, 0, 0 ("drops s2"); elastic net −2.00, −2.44, 0 ("keeps the pair"). Then "age at exactly 0 under both: elastic net still selects", two rows of 50 cells (lasso keeps both s1 and s2 in 5 of 50, elastic net in 37), and "selects like lasso, steadier when features are correlated". `enet-both` re-voiced to say all of that. "here 90% L1 and 10% L2" under the mix note. |
| 6 | The recalibrated curve is drawn over the wrong model | fixed | The red class-weighted curve itself moves, bin by bin, onto its recalibrated values (`calRecal`) from "Fit a calibration" to "back on the line", red blending to green; the ring at its 0.85 bin fades as it starts. The separate green curve is gone; the key reads "class-weighted, recalibrated on held-out data". |
| 7 | SGD, mini-batch and Adam sit under the three learning-rate outcomes | fixed | The bowls, their titles, outcomes and "loss = x²" clear half a second into `gd-sgd` (the last outcome has been up about 3 s by then), and the three variants come in as rows of a list under "three ways to take each step", each with its gloss beside it, none under any bowl. |
| 8 | Q9 never gives PR's chance level and never shows the "flattering" | fixed | `auc-pr` (split off, re-voiced): "...its area here is point four five. Chance on it is the positive rate: only point oh two." A dotted chance line at 0.02 on the PR plot ("chance: 0.02, the positive rate"), and one at 0.5 when the balanced curve comes in. Under the false-positive-rate formula, on "a flood of easy ones ... flatters": "at 75% recall it is only 6.8%, / but that is 13,402 false alarms / against 3,017 catches" (`CLS.alarms`, from `check.mjs`). |
| 9 | The CV figure never shows why five folds beat one split | fixed | `check.mjs` repeats the five-fold CV on 200 reshuffles (RepeatedStratifiedKFold). The ±1.4 band is gone; the 200 five-fold averages pile up in green in front of the dimmed single splits, visibly narrower, labelled "that average on 200 reshuffles: 96.7% to 98.6%" (sd 0.36 points against 1.25 for one split). `cv-mean` re-voiced: "Here, the five average ninety-seven point nine. Repeat that on two hundred reshuffles, and those averages pile up far tighter than single splits do." |
| 10 | "MAE stays in the target's units" implies RMSE does not | fixed | `r-mae` re-voiced: "MAE, mean absolute error, counts every unit of miss the same, so outliers sway it less. Both are in the target's units; use RMSE when one big miss costs more than several small ones." New beat `r-r2-units`: "It has no units, so it compares across datasets." On screen: "both in the target's units: RMSE when big misses cost more", and "no units, so it compares across datasets" under R². |
| 11 | The forward-chaining diagram is gone about 2 s after it appears | fixed | The blocks draw on "For time series" (now the beat `cv-time`, with pauseAfter 1.2): up about 6.9 s before Question six, from about 2. |
| 12 | The cross-entropy notes run to 27 px from the right edge | fixed | `box.right = R_X + 580`: the notes start at 1390 and the widest ends near 1760. |

P3s fixed on the way:

- **#13** both halves: `auc` split at "The PR curve" (pauseAfter 0.7, so the ROC result lands), and `imbalance` split at "Weight the rare class" (pauseAfter 0.6).
- **#15**: the two Reg notes ("elastic net: a mix…", "ten measurements…") and GD's "each step" / "loss = x²" no longer outlive their figures.
- **#18**, in the spans these fixes rewrote: the Reg table's numbers use U+2212 with tabular figures on digits only; "squared error 0.98" and "cross-entropy 4.61" take tabular figures on the number only. AucScene's "ROC-AUC"/"PR-AUC" readouts still carry TABULAR on the whole span (not touched).
- **#19**, the path panels' y title only.

Not fixed (P3): #14, #16, #17, #19 (the rest), #20, #21, #22, #23, #24.

## Voice

997 characters re-voiced, seven beats, each on its own: `enet-both` (253), `cv-mean` (148), `learn-bias` (85), `auc-pr` (136), `r-mae` (182), `r-r2-units` (48, new), `r-xent-use` (145, new).

Six beats were split at sentence breaks at no cost: `learn-shapes` → +`learn-bias`, `learn-nine`; `cv-folds` → +`cv-mean`, `cv-time`; `enet` → +`enet-both`; `auc` → +`auc-pr`; `imbalance` → +`imbalance-fix`; `r-metrics` → +`r-mae`, `r-r2`, `r-values`.

**`narrate --recut` cannot cut this video.** Takes 4 and 5 were recorded with the old letter-spaced initialisms ("S G D", "R M S E", and "ROC-AUC" not yet respelled), and `auc`, `auc-balance`, `imbalance`, `gd-sgd`, `r-metrics` and `r-xent` were re-voiced alone afterwards, so those takes no longer match the script and `--recut` refuses the whole video. The splits were cut with a scratch copy of narrate's own cutter (`/tmp/claude-0/-home-user-dataslope/88cfe488-c05f-574c-9944-997241c528bb/scratchpad/DataScientist-3-MlEvaluation/splitbeat.mjs`: same cut point, onset, lead, tail and fade), from take 2 and take 3 for the `enet`, `cv-folds` and `learn-shapes` splits (their beats matched the take to the millisecond) and from each beat's own file for `auc`, `imbalance` and `r-metrics`. Every split fell in a pause of 0.39 to 0.62 s. Only the split beats were written.

## Length and checks

8:33 (512.9 s) → 9:31 (570.9 s), 47 beats.

All on the final code, through `out/entries/DataScientist-3-MlEvaluation.tsx` and the queue:

- `tsc --noEmit`: no errors (none anywhere in the package). `eslint src/videos/ds-ml-evaluation`: clean.
- `npm test`: 59/59. `npm run check:cues`: pass.
- `check:motion`: pass, nothing still for 3 s (five stretches of 2.0 to 2.8 s, all at scene openings: `bias`, `reg`, `cv` twice, `auc`). Its bundle predates four layout-only tweaks made after the first stills (headroom over the path panels, narrower resample cells, the ridge note's wording, the 0.5 chance line's dash); none moves anything in time.
- `check:sync`: pass, 47 beats, worst +0.03 s (`gd`); the re-voiced and split beats are all within ±0.03 s.
- `check:mix`: narration −19.6 LUFS, effects 28.5 LU under it, speech a median 29.9 dB over the effects where both sound (closest 9.0 dB, 50 ms at 4:04).
- `check:frames`: not run (no arrow, illustration or ERD changed).
- Stills at every change, cropped and looked at: 116.5, 123.5/124 (both path panels, dots, notes), 145, 150.5, 156/156.5 (the Q4 table and resamples), 198.5 (CV averages pile), 205 (forward chaining), 252 (bias remedy), 343, 366.5/366.6 (PR chance lines, the false-alarm counts), 423.5, 427.5 (calibration mid-morph and landed), 461.5, 471.5 (GD outcomes, then the list), 499, 516 (metrics), 545.5 (cross-entropy). The first stills caught three things, fixed and re-checked: "keeps 7 of 10" sat on lasso's two top paths once the axis was stretched (the axis now has headroom to 100), "37 of 50" touched lasso's −10 tick label, and "none reaches exactly 0" was wrong for the three ridge paths that cross zero (now "none stays at 0").

## Notes

- **Pyodide is not installed** (`node_modules/` at the repo root is missing, and the brief rules out `npm install`). `check.mjs` was run as its header says, with `NODE_PATH` pointing at `pyodide@314.0.7` unpacked by `npm pack` into my scratch folder. Every number already in `results.json` came back identical; only elastic net's changed, on purpose.
- **Elastic net's mix** is now 0.9 L1 / 0.1 L2. At 0.5 its s1 was −0.24 and the bootstrap had it zero in 8 of 30 resamples, so the old "keeps both" was true by a hair and not robust. 0.9 is on the grid scikit-learn's documentation suggests for ElasticNetCV (.1, .5, .7, .9, .95, .99, 1) and shows both halves of the page's answer: the pair kept at near-equal weight, age still zeroed. The page names no mix.
- **The coefficient axis is nonlinear now.** asinh is the cleanest way to show "small but never zero" next to "exactly zero"; the ticks (−10, −1, 0, 1, 10) and the y title say so on screen.
- **Kit suggestion:** `narrate --recut` could cut the takes that still match and leave the rest, instead of refusing the whole video when one take is stale; and a `--split-beat` that cuts a beat already voiced alone at its own sentence breaks would make "split before you re-voice" work for beats re-voiced after the take, which is every video that has had a fix pass.
