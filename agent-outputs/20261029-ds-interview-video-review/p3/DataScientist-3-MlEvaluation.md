# DataScientist-3-MlEvaluation: P3 fixes

Folder `video/src/videos/ds-ml-evaluation/`. Review report:
`agent-outputs/20261029-ds-interview-video-review/DataScientist-3-MlEvaluation.md`;
P2 fix report: `.../fixes/DataScientist-3-MlEvaluation.md`, which already fixed
#13, #15, most of #18 and #19's missing y title. Not committed.

## P3s

| # | Finding | Result | What changed |
| --- | --- | --- | --- |
| 13 | ROC result runs into the PR curve; "98% accurate" into "Weight the rare class" | done in P2 | `auc` and `imbalance` were split there, with pauses. |
| 14 | "lowest: degree 3" sits in the y-axis label column | fixed | Left-aligned at `bestX + 24` (`BiasScene.tsx`): right of the ring, in the clear band between the training line and the axis (checked zoomed: about 12 px under the line, 25 px over the axis). |
| 15 | Notes outlive their figures | done in P2 | |
| 16 | Bridge highlights land on words said long before | fixed | The test set's "once" is marked on "Touch the test set **once**" (`n.word("split", "once, at the end")`), and "more data helps" on "more data is the cure". Those highlights had been the only motion on the two bridges, so each bridge now sets its finished figure back to 55% on its own words ("a picture tells you", "scoring a classifier"), with the question card left at full strength, as `BiasScene` already dims its fixes on its bridge. |
| 17 | Text under 19px | fixed | Hook's tile numbers 18 → 20px; the RMSE/MAE share labels 18 → 20px, bar opacity 0.85 → 1. |
| 18 | `TABULAR` over whole spans | fixed | The last two: the "ROC-AUC" / "PR-AUC" readouts in `AucScene` carry tabular figures on their numbers only. (The Reg table and cross-entropy labels were done in P2; the shared `Axes` titles centrally.) |
| 19 | Terms and axes used without definition | fixed, on screen | ROC's y title is "true positive rate (recall)"; "early stopping: halt when validation error turns up"; "Platt scaling (a logistic fit on the scores) or isotonic regression"; the F1 formula, "2 × precision × recall ÷ (precision + recall)", under "the harmonic mean of the two". For the coefficient paths I did not move them to "ten measurements": that left the two panels empty for about 5 s with nothing else to move. Instead the caption "ten measurements from a diabetes study, one line each" now comes up with the first path, and "ten measurements" is highlighted when it is said. The y title was added in P2. |
| 20 | Smaller gaps against the page | fixed | (a) New beat `cal-measure`: "To measure calibration, plot a reliability diagram, like this one, or compute the Brier score: the mean squared error of the probabilities." On screen: "a reliability diagram" titles the plot, and "or the Brier score: the mean squared error of the probabilities". (b) `r-select` split; new `r-close`: "If the gap is within its noise, take the simpler one. Then score the winner once, on the untouched test set." On screen: "gap within its noise? take the simpler one", the page's "a paired bootstrap on held-out predictions measures that noise", and "then score the winner **once**, on the untouched test set". (c) New beat `imbalance-same`: "Here, moving the threshold nearly matches the weights: at point oh two, the plain model has eighty-seven percent recall and eleven percent precision." That is `cls.curve` at 0.02 in `results.json` (recall 0.866, precision 0.110, against the weighted model's 0.863 and 0.113 at 0.5), so `check.mjs` did not need re-running. On screen, a third, paler bar in each group ("unweighted, threshold 0.02"), and "move the threshold" is highlighted. (d) Cross-validation has lost its tick under "to fix it" and gets its own line below: "measure with **cross-validation**, so the estimate is honest". The narration still lists it after "To fix it", as the page does ("…early stopping, and proper cross-validation so the estimate is honest"). |
| 21 | The squared bar appears before its baseline | fixed | MAE's row ("MAE adds the misses") comes up first, on "RMSE", as the reference; RMSE's row comes on "squares each miss". MAE's row label is highlighted when MAE's own sentence starts. |
| 22 | The straight line's training error sits above validation | fixed, by the note | "both stay near 0.3, equal within sampling error". The data is unchanged: more shuffles would rewrite `learn` in `results.json` and need not remove the crossing, since the gap it should show at 420 points is about 0.003. |
| 23 | "Each a real model fitted in Python" overclaims; the data is never called simulated | fixed | `plan` split into `plan` / `plan-figures` / `plan-quick`, with `plan-figures` re-voiced: "Most figures you'll see are real models, fitted in Python." Hook: "12 with a figure, most of them a real model fitted in Python". PR panel: "200,000 simulated cases, 2% of them positive". (The narration of `pr-slide` is unchanged.) |
| 24 | The `reg-in` bridge is the fastest line | fixed | Re-voiced: "Regularization gets its own question." (now 1.8 words a second, from 4.4). The bridge's cues follow it ("Regularization" is highlighted, the other fixes dim on "its own question"). |

## Voice

**491 characters re-voiced**, in five beats, each voiced on its own: `plan-figures` (58), `reg-in` (37), `imbalance-same` (149, new), `cal-measure` (139, new), `r-close` (108).

Two beats were split at sentence breaks at no cost: `plan` → `plan`, `plan-figures`, `plan-quick` (pauses 0.45 s and 0.52 s), and `r-select` → `r-select`, `r-close` (0.32 s). As the coordinator asked, the kept pieces (`plan`, `plan-quick`, `r-select`) are **cut from the kept takes**: take 1 for `plan` and take 5 for `r-select`. The cut uses narrate's own `--recut`, unchanged, on a scratch root whose script is the take's text split into the take-era beats with the new boundaries (`$S/DataScientist-3-MlEvaluation/p3tools/recut-take.mjs`, after DataScientist-0's tool). Checked first: every untouched beat that root re-cut came back **byte for byte** identical to the committed file: `hook`, `bias-in`, `bias`, `bias-fits`, `bias-curve`, `overfit`, the old `reg-in` (take 1), and `gd`, `gd-rates`, `rapid-in`, `next` (take 5). The pieces were first cut with my P2 beat-file splitter (`splitbeat.mjs`). Its alignment entries and lengths were identical to the take cuts, so only the three MP3s were replaced, which saves an encode. Before using that splitter I checked it on an untouched beat (`bias-in` from its own file: same alignment and duration) and restored the original file.

## Length and checks

9:31 (570.9 s, 47 beats) → **10:00 (599.7 s, 52 beats)**.

All on the final code, through `out/entries/DataScientist-3-MlEvaluation.tsx` and the queue:

- `tsc --noEmit`: no errors. `eslint src/videos/ds-ml-evaluation`: clean.
- `npm test`: 59/59. `npm run check:cues`: pass.
- `check:sync`: pass, 52 beats, worst +0.03 s (`learn-bias`); the re-voiced and split beats are all within ±0.02 s.
- `check:mix`: PENDING
- `check:motion`: PENDING
- `check:frames`: not run (no arrow, illustration or ERD changed).
- Stills at every change, cropped and looked at: 24 (hook line, tile numbers), 87.5 and 90.6 (fix list, CV line, the degree-3 label; the bridge), 104 and 112 (path caption with the first paths; "ten measurements" marked), 222.5 and 231.5 (test "once"; bridge dim), 264 and 267 (learning-curve note and mark; bridge dim), 310 (F1 formula), 368.5 (readouts, ROC y title), 408.8 (the threshold bars), 449.5 (reliability diagram, Brier), 503, 507.5 and 509 (MAE row first, then RMSE, then MAE marked), 586 and 596 (model choice). The stills led to two layout changes, both re-checked on the motion preview: more space between the recall and precision bar groups, and "or the Brier score" in place of "Brier score".

## Shared-kit suggestions

None needed for these. The bridge-dim pattern (a finished figure stepping back on a bridge that names nothing on screen) is local to this video. A `dim` prop on the shared `Fade` would make it one prop rather than a wrapping `div`.
