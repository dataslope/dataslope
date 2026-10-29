# DataScientist-3-MlEvaluation (512.9 s, 8:33)

## Verdict
- Every number said matches the number shown, `results.json` and the page (hook 100/84, degree 9 at 0.06/5.69, lasso keeps 7, CV 94.7 to 100 and 97.9 ± 1.4, PR 87/10 and 18/75, AUC 0.94/0.45 and 0.94/0.94, weighting 27→86 and 67→11, calibration 8.5%, GD 6.54, RMSE/MAE/R² 0.34/0.30/0.95, losses 0.98/4.61). The layout is clean: no overlaps or clipping, and only one note crowds the frame edge.
- The biggest problems are figures that contradict their own narration. The rebalanced PR-AUC 0.94 is painted green, the "right answer" colour. Ridge's paths collapse onto zero exactly as lasso's do. The recalibrated curve is drawn over the plain model while the broken weighted curve never moves. SGD, mini-batch and Adam sit under the three learning-rate outcomes, so Adam reads as "explodes".
- Two answers stop short of the answer: cross-entropy vs MSE never says which to use or why, and the learning-curve bias case says what will not help but not what will. Elastic net's "steadier" is asserted, and the numbers on screen undercut it.
- Pacing is comfortable: every concept beat runs at 2.2 to 3.0 w/s and the gaps between beats are 0.55 s or more. The exceptions are the forward-chaining diagram, which is up for about 2 s, and the ROC result, which runs straight into the PR curve.
- As interview answers they mostly hold up. The weakest are Q14 (cross-entropy), Q7 (bias remedy), Q4 (elastic net), Q13 (the RMSE/MAE units contrast) and Q9, which never gives PR's chance level.

## Findings

### 1. [P1] confusion: Q9 colours the rebalanced PR-AUC green
- When: 322-336 s, beat `auc-balance` (tile 323, element-335.jpeg)
- What: The key reads "ROC-AUC 0.94 → 0.94" in black and "PR-AUC 0.45 → 0.94" with the 0.94 in green, then "rare positives: trust PR-AUC" in green. That 0.94 comes from an artificial 50/50 test set. The honest PR-AUC for this 2% problem is 0.45.
- Why it matters: Green means "the right answer" in this series, so the summary endorses evaluating on a rebalanced test set, which is the mistake the answer is warning against.
- Cause: `video/src/videos/ds-ml-evaluation/AucScene.tsx:168` (`<b style={{ color: OK_INK }}>{fmt(CLS.apBalanced)}</b>`).
- Fix: Draw the balanced 0.94 in INK, as ROC's is, or in ACCENT_INK as the flattering number. Add "at the real 2%" after "PR-AUC 0.45" so the green "trust PR-AUC" points at the 0.45.

### 2. [P2] answer: Cross-entropy vs MSE never answers the question, and paints the right loss red
- When: 471.6-488.5 s, beat `r-xent` (element-487.jpeg)
- What: The narration gives two losses at p = 0.01 and says cross-entropy "keeps climbing the more confidently wrong you are". It never says to use cross-entropy, or the page's reason: with a sigmoid, MSE's gradient goes flat near saturation and learning stalls. The cross-entropy curve, its dot, its value and "it keeps climbing" are all red.
- Why it matters: An interviewer wants the choice and the gradient argument. Red marks the recommended loss as the trap.
- Cause: the `r-xent` text in `script.ts`. `RapidScene.tsx:128, 132, 141, 146` use ACCENT/ACCENT_INK for cross-entropy.
- Fix: Append "So use cross-entropy: it is the likelihood of the labels, and its gradient stays strong when the model is confidently wrong, where MSE's goes flat." Draw cross-entropy in OK, squared error in BAR, and keep red only for "more confidently wrong".

### 3. [P2] answer: Learning curves give bias no remedy
- When: 223.9-241 s, beat `learn-shapes` (element-238.jpeg)
- What: The narration says "That's bias, and more data won't help", and the screen shows "bias: more data won't help" in red. The bridge promised "a picture tells you what to try next". The page's answer for high bias is to add features or use a more flexible model.
- Why it matters: "So what do you do about it?" is the follow-up an interviewer asks, and the video answers it only for variance.
- Cause: the `learn-shapes` text in `script.ts`; `LearnScene.tsx:132-134`.
- Fix: "That's bias: more data won't help, but a more flexible model or better features will." Change the note to "bias: try a more flexible model". On the variance side, "more data, or regularize" matches the page.

### 4. [P2] confusion: Ridge's panel shows every coefficient going to zero
- When: 101-147 s, beats `reg`, `reg-paths` (element-123.jpeg)
- What: On the shared -30 to 35 axis, all ten ridge paths merge onto the zero line across the right third of the panel, just as lasso's do. At the marked strength, three ridge coefficients (age 1.42, s1 0.32, s2 -1.34) sit within about 7 px of zero under a 10 px yellow bar. "keeps 10 of 10" therefore cannot be checked against the picture, and it looks the same as lasso's three zeros.
- Why it matters: Q3 asks about exactly this distinction (shrinks but never exactly zero, against exactly zero). The label asserts it while the picture shows the opposite.
- Cause: `RegScene.tsx:15-16` (one LO/HI for both panels), `:151` (ridge drawn over the full logAlpha range), `:155` (10 px highlight).
- Fix: At `strengthAt`, put ten dots on the ridge paths at the marked strength and draw the highlight at 3 px. Label the ridge panel's right edge "smallest still 0.05, never 0" (`REG.ridge` last row, sex = 0.046). Alternatively, plot each path as a share of its unpenalized value so small coefficients stay visible.

### 5. [P2] explanation: Elastic net's "steadier" is asserted, and its numbers undercut it
- When: 129-147 s, beat `enet` (element-142.jpeg)
- What: The table shows lasso with s1 -4.84 and s2 0, and elastic net with s1 -0.24 and s2 -2.37, labelled "keeps both" and "steadier when features are correlated". Elastic net keeps s1 at a twentieth of lasso's value and moves the weight onto the feature lasso dropped. No path or resample shows any steadiness, and the sparsity half of the page's answer ("inherits lasso's sparsity") is never said.
- Why it matters: A careful viewer sees "keeps both" by a margin of 0.24, and the one property that answers "why elastic net" gets no support.
- Cause: `RegScene.tsx:231-243` (a two-row table only); `check.mjs:86` (one fit at one alpha).
- Fix: Compute ElasticNet over `alphas` in `check.mjs` and draw its s1/s2 paths in the left half, which is empty from `keepsOneAt`, next to lasso's orange pair, so both stay non-zero where lasso drops s2. To show steadiness directly, refit both models on 20 bootstrap samples and show lasso switching which of s1 and s2 it keeps. Add a clause saying elastic net can still zero out features, as lasso does.

### 6. [P2] confusion: The recalibrated curve is drawn over the wrong model
- When: 389-397 s, beat `cal-curve` (element-395.jpeg)
- What: On "Fit a calibration ... and it's back on the line", a green curve draws over the dimmed blue plain-model line. The red class-weighted curve, which is the model being recalibrated, stays on the floor with its ring.
- Why it matters: The picture says the plain model was recalibrated and the weighted model is still broken.
- Cause: `CalScene.tsx:109` (the plain model dims at `fitAt`), `:110` (the weighted curve never changes), `:111` (`calRecal` is a separate curve).
- Fix: Between `fitAt` and `lineAt`, move the red curve's points from `calWeighted` (pred, obs) to `calRecal`, blending ACCENT to OK. Alternatively, fade the red curve and its ring at `fitAt` and label the green line "class-weighted, recalibrated".

### 7. [P2] confusion: SGD, mini-batch and Adam sit under the three learning-rate outcomes
- When: 431-442 s, beat `gd-sgd` (element-440.jpeg)
- What: "SGD, stochastic gradient descent" sits under the 0.004 panel ("still at 6.54 after 25 steps"), "mini-batch" under 0.25, and "Adam" directly under "overshoots: the loss explodes".
- Why it matters: The column alignment pairs each variant with an outcome: SGD is slow, Adam explodes.
- Cause: `GdScene.tsx:168-177` (`x={LEFTS[i]}`).
- Fix: Dim the bowls and their notes at `sgdAt`. Set the three variants as one row at y(870), headed "three ways to take each step:", spaced by their text width rather than by panel column.

### 8. [P2] explanation: Q9 never gives PR's chance level and never shows the "flattering"
- When: 307-336 s, beats `auc`, `auc-balance` (element-335.jpeg)
- What: ROC gets "chance: 0.5". PR gets "its area here is only point four five" with no baseline. PR's chance level is the positive rate: 0.02 here and 0.5 on the balanced set, which is most of why it "jumps to 0.94". "A flood of easy ones flatters the ROC curve" then plays over a 10 s hold that shows only a text formula.
- Why it matters: "Only 0.45" reads as a weak model when it is 22 times chance, and the core claim of the answer is stated but never shown.
- Cause: `AucScene.tsx:151-153` (the PR square has no baseline); the `auc` and `auc-balance` text.
- Fix: At `prAt` draw a dotted line at precision 0.02, labelled "chance: 0.02, the positive rate", and at `jumpsAt` one at 0.5. Say "point four five, against a chance level of point oh two". Under the FPR formula, add one computed line: "at 75% recall the false positive rate is only 7%, yet that is 13,400 false alarms against 3,000 catches". The source is `CLS.thresholds` at t = 0.05: 16,419 flagged and recall 0.754, so TP 3,016, FP 13,403 and FPR 13,403/196,000 = 6.8%.

### 9. [P2] explanation: The CV figure never shows why five folds beat one split
- When: 174.5-185 s, beat `cv-folds` (element-184.jpeg)
- What: A green band of 97.9 ± 1.4 (the standard deviation of the five fold scores) is laid over the pile of 200 single splits, and it covers the same central bulk as the pile. The narration attaches that spread to the mean: "the mean is ninety-seven point nine, give or take one point four".
- Why it matters: The question is "why use it". The picture suggests CV is as uncertain as one split, and ±1.4 is the spread of a single fold, not of the mean.
- Cause: `CvScene.tsx:156-165` (band = mean ± std of the folds); the `cv-folds` text.
- Fix: In `check.mjs`, compute the 5-fold mean over 200 reshuffles (RepeatedStratifiedKFold) and pile those means in green under the blue pile, where they will be visibly narrower. Narrate "Average the five, and the estimate moves far less than any one split does. The folds themselves vary by one point four."

### 10. [P2] accuracy: "MAE stays in the target's units" implies RMSE does not
- When: 453-466 s, beat `r-metrics` (element-468.jpeg)
- What: "RMSE ... squares each miss before averaging ... MAE ... stays in the target's units and shrugs off outliers." The contrast sets RMSE up as being in other units, but the root brings it back to the target's units: 0.34 and 0.30 are both in target units. "Shrugs off" overstates, because MAE still grows linearly with an outlier. The question's "when do you use each" is also not answered (the page: RMSE when large errors are especially costly; R² is scale-free, so it compares across datasets).
- Why it matters: An interviewer will catch the units implication at once.
- Cause: the `r-metrics` text in `script.ts`.
- Fix: "MAE, mean absolute error, counts every unit of miss the same, so outliers sway it less. Both are in the target's units; use RMSE when a big miss costs more than its size. R squared ... has no units, so it compares across datasets."

### 11. [P2] pacing: The forward-chaining diagram is gone about 2 s after it appears
- When: 182.4-185.5 s, beat `cv-folds` to `split` (element-184.jpeg, then tile 186)
- What: The time-series blocks start drawing on "comes after the training data" (182.6 s) and finish around 183.3 s. The whole CV figure fades on "Question six" (185.2 s).
- Why it matters: Forward chaining is a new idea, and the one an interviewer asks about for time series, but it can be read for about 2 s.
- Cause: `CvScene.tsx:225` and `:313` (blocks cued `afterAt - 6`); `:119` (`out={q6At - 6}`).
- Fix: Cue the blocks to `timeAt` ("For time series", 179.0 s) and raise `cv-folds`' pauseAfter from 0.7 to 1.2.

### 12. [P2] spacing: The cross-entropy notes run to 27 px from the right edge
- When: 476-489 s, beat `r-xent` (element-487.jpeg)
- What: "predict 0.01 for a true positive:" ends at about x = 1893 of 1920, and the drift pushes it a little further.
- Why it matters: The text nearly touches the frame edge, far outside the page margin every other scene keeps.
- Cause: `RapidScene.tsx:109` (`box.right = R_X + 720`) and `:134-147` (notes at `box.right + 30`).
- Fix: Set `box.right = R_X + 580`, so the notes start at 1390 and end near 1755, or break "for a true positive:" onto its own line.

### 13. [P3] pacing: The ROC result runs straight into the PR curve
- When: 305.7-313 s, beat `auc`; also 347.7 s, beat `imbalance`
- What: "Here it's point nine four." ends at 307.66 s and "The PR curve plots precision against recall" starts at 307.74 s, a gap of 0.08 s inside one 29 s beat that also defines ROC and AUC. Likewise "...ninety-eight percent accurate." runs into "Weight the rare class" after 0.08 s.
- Why it matters: A second curve and its number arrive before the first result has landed.
- Cause: `script.ts`: the `auc` and `imbalance` beats.
- Fix: Split `auc` at "The PR curve" into a new beat `auc-pr` and give `auc` pauseAfter 0.7, then repoint `AucScene.tsx:81` to `n.word("auc-pr", ...)`. Split `imbalance` at "Weight the rare class" with pauseAfter 0.6.

### 14. [P3] spacing: "lowest: degree 3" sits in the y-axis label column
- When: 59-90 s, beats `bias-curve`, `overfit` (element-075.jpeg)
- What: The green label spans x ≈ 1020-1225, to the left of the axis at 1082, and sits about 13 px above the "0.00" tick label.
- Why it matters: The label crowds the axis ticks and reads as part of the y-axis.
- Cause: `BiasScene.tsx:148` (`x={bestX - 24} align="right"`).
- Fix: `x={bestX + 24}`, left-aligned at the same y, which puts it in the clear band between the training line and the x-axis.

### 15. [P3] other: Notes outlive their figures at two scene ends
- When: 146.3-147.9 s (tile 147) and 441.5-442.8 s (tile 442)
- What: "elastic net: a mix of the L1 and L2 penalties" and "ten measurements from a diabetes study" stay alone on a blank page after the paths and table fade. "each step: x ← x − rate × gradient" and "loss = x², starting at x = 8" stay after the bowls fade.
- Why it matters: For a second or more the page shows stray captions with nothing they describe.
- Cause: `RegScene.tsx:135, 140` (`dim` with no `out`); `GdScene.tsx:143, 151` (no `out`).
- Fix: Add `out={end - 8}` to all four.

### 16. [P3] confusion: Bridge highlights land on words said long before
- When: 206.4 s, beat `learn-in` (element-207.jpeg); about 239.7 s, beat `pr-in`
- What: "once" under the test set is highlighted during "a picture tells you what to try next", 9 s after "once" was said. "more data helps" is highlighted during "on a rare event", about 4 s after "more data is the cure".
- Why it matters: Yellow means "what the narration points at", and the narration has moved on.
- Cause: `CvScene.tsx:254` (`Mark at={pictureAt - 6}`); `LearnScene.tsx:145` (`Mark at={rareAt - 10}`).
- Fix: Cue them to `n.word("split", "once")` and `n.word("learn-shapes", "more data is the cure")`.

### 17. [P3] spacing: Text under 19px
- When: 15-26 s (element-023.jpeg); 446-471 s (element-468.jpeg)
- What: The question numbers under the hook's fifteen tiles are 18px. The share labels inside the RMSE/MAE bars are 18px white on blue and orange at 0.85 opacity.
- Why it matters: Both are below the 19px house floor, and the bar labels also have weak contrast.
- Cause: `HookScene.tsx:174` (`label(18, …)`); `RapidScene.tsx:71` (`label(18, PAPER)`).
- Fix: Raise both to 20px and drop the bar opacity to 1.

### 18. [P3] other: Tabular figures applied to whole labels space out the hyphens
- When: 306-336 s (element-335.jpeg), 482-489 s (element-487.jpeg), 129-147 s (element-142.jpeg)
- What: The screen shows "ROC - AUC", "PR - AUC", "cross - entropy 4.61", "- 4.84", "- 0.24" and "- 2.37".
- Why it matters: The terms read as split words and the negatives read as detached signs.
- Cause: TABULAR is spread over the whole span at `AucScene.tsx:157, 165`, `RapidScene.tsx:141` and `RegScene.tsx:285`.
- Fix: Apply TABULAR only to the number span, and write negatives with U+2212.

### 19. [P3] explanation: Terms and axes used without definition
- When: 291-300 s, 78-86 s, 391-396 s, 279-283 s, 101-109 s
- What: The "true positive rate" is never tied to Q8's recall. "Early stopping", "Platt scaling or isotonic regression" and "harmonic mean" are named but not explained. The coefficient-path panels have no y title, and the ridge paths are drawn about 8 s before "ten measurements" says what the lines are.
- Why it matters: Each is a natural follow-up an interviewer can ask.
- Cause: the `auc`, `overfit`, `cal-curve` and `pr-favor` text; `RegScene.tsx:28-45` (PathFrame has no y title) and `:151` (paths cued to `ridgeNameAt`).
- Fix: "plots the true positive rate, which is recall, against ...". "early stopping, halting when validation error turns up". "Platt scaling, a logistic fit on the scores". Put the F1 formula on screen. Give PathFrame a y title, "coefficient", and cue the paths to `tenAt`.

### 20. [P3] answer: Smaller gaps against the page
- When: 366-397 s, 489-500 s, 337-366 s, 78-86 s
- What:
  - Calibration never says how it is measured: the figure is a reliability diagram but is never named, and the Brier score is not mentioned.
  - "Choosing between two models" never says to keep the test set for the final number, or to check that a gap is bigger than its noise (a paired bootstrap) before calling the models "close".
  - Class weighting at 0.5 (86% recall, 11% precision) lands near the plain model at threshold 0.05 from Q8 (75%, 18%), which keeps its calibration. That is the insight joining Q8, Q10 and Q11, and it is left unsaid.
  - Cross-validation is ticked under "to fix it" overfitting, although it detects overfitting rather than fixing it.
- Why it matters: These are the follow-ups the page itself prepares for.
- Cause: the `cal-curve`, `r-select`, `imbalance` and `overfit` text.
- Fix: "plotted as a reliability diagram, or scored with the Brier score". "...then confirm on the untouched test set, and check the gap is bigger than its noise". "Weighting mostly moves the threshold: the plain model at point oh five gets close, and stays calibrated". Move cross-validation out of the fix list to a "measure it with" line.

### 21. [P3] confusion: The squared bar appears before the baseline it is compared with
- When: 446-454 s, beat `r-metrics` (tiles 447, 452)
- What: "RMSE squares them first" with its 42%/42% shares and "squared, the two big misses dominate" appear in the lower row while the upper MAE row (33%/33%) is still empty. The MAE row arrives at 453.3 s.
- Why it matters: "Dominate" is a comparison, and its reference is not on screen yet.
- Cause: `RapidScene.tsx:33-36` (each row on its own cue; the MAE row cued to `maeAt`).
- Fix: Show the MAE row at `rmseAt - 4` as the reference, or voice MAE first.

### 22. [P3] confusion: The straight-line learning curve shows training error above validation error
- When: 220-242 s, beat `learn-shapes` (element-238.jpeg)
- What: From 45 points on, the blue training line sits above the black validation line (0.313 against 0.306, down to 0.299 against 0.296), right next to the degree-9 panel, where training is below.
- Why it matters: It inverts the textbook picture the viewer is meant to recognise.
- Cause: `results.json` `learn["1"]`, which is shuffle noise.
- Fix: Average more shuffles in `check.mjs`, or extend "both stay near 0.3" to "both stay near 0.3, equal within noise".

### 23. [P3] other: "Each a real model fitted in Python" overclaims, and the data is never called simulated
- When: 19-26 s (element-023.jpeg); 254-366 s
- What: Q6's figure is a diagram and Q12's is gradient descent on x², not fitted models. Q8-Q11's "200,000 cases" are simulated Gaussian classes (`PrScene.tsx:27`), but neither the screen nor the narration says so, and the narration pairs them with disease screens and fraud.
- Why it matters: A viewer may take the classifier numbers for a real-world benchmark.
- Cause: `HookScene.tsx:179`, the `plan` text, `PrScene.tsx:93`.
- Fix: "12 with a figure, most of them a real model fitted in Python"; "200,000 simulated cases, 2% of them positive".

### 24. [P3] pacing: The `reg-in` bridge is the fastest line in the video
- When: 87.3-89.6 s, beat `reg-in`
- What: "One of those fixes gets a question of its own." runs at 4.39 w/s, about one and a half times the 2.4-3.0 w/s of the beats around it.
- Why it matters: The bridge carries no new concept, but it lands as a rushed aside.
- Cause: the `reg-in` take.
- Fix: Shorten it to "Regularization gets its own question." and re-voice only that beat.
