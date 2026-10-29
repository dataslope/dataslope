# DataScientist-4-MlModels (9:41, 581.3 s)

## Verdict
- A strong, accurate video. Every number spoken or shown matches `results.json` and the page: the hook's 82/89/93%, logistic −15.25 + 1.034·radius, the 49·5 / 1·45 Gini split at 1.75 (0.110), bagging 0.262 → 0.180, the forest's 90.6/93/95.3%, AdaBoost's 35×, kNN 79/93/87%, inertia 20,402 → 567, PCA 73/22.9%, the curse's 0.017 → 0.894, and the SHAP waterfall. The figures are real fits and well chosen. No answer is wrong. One wording is imprecise: gradient boosting "fits the gradient" when it fits the negative gradient.
- The biggest visual problems: on the tree's finished frame, two green labels are struck through by lines (about 12 s). The k-means centers finish moving before the narration describes the move. The gradient-boosting half of question 6 plays over a nearly empty frame for about 10 s. The forest's accuracy bars start at 85%, which roughly doubles the visible gap.
- Pacing is comfortable. Content beats run 2.1 to 2.9 words/s, gaps are 0.6 to 0.7 s inside scenes and 1.6 s at scene bridges, and finished states hold about 2 s before each cut. The one real desync is k-means (finding 2).
- As interview answers, questions 1, 2, 4 to 7, 9 and 10 hold up. Question 3 (Gini only, no entropy or regression trees) and question 8 (no failure modes) skip the standard follow-ups. Question 11 presents SHAP as the cure for impurity bias without saying SHAP explains the model: the meaningless ID still gets 13%, and permutation importance, which was computed, is never mentioned.

## Findings

### 1. [P1] spacing: two labels on the tree's finished frame are struck through by lines
- When: 132-149 s, beats `tree-gini` and `bag-in` (frames element-135.jpeg, element-140.jpeg)
- What: The dashed lines down to the next level's "…" nodes run straight through the green "weighted: 0.11" under the left child box (its "0.11" reads as crossed out). In the Gini chart below, the rising blue curve passes through "0.11, the lowest". Both stay on screen to the cut. "weighted: 0.11" also sits under the left child alone, so it reads as that node's value, not the split's.
- Why it matters: This is the scene's key number, crossed by lines on the frame that holds longest.
- Cause: `video/src/videos/ds-ml-models/TreeScene.tsx:431` places the note at `y(560) + h(104)`, inside the span of the dashed child links drawn at `:443-457` (from `y(560) + h(92)` to `y(760)`). `TreeScene.tsx:319-322` anchors the "lowest" note at `best + 16`, `gy(0.11) - h(40)`, which is on the curve's rising side.
- Fix: Center "weighted: 0.11" under the split question, between the two child boxes (x = `COL + 320`, translateX(-50%), y = `y(560) - h(36)`), or move it below the "…" row at `y(800)`. Put the "lowest" note on the left of the dot (`align="right"`, x = `at(sx, best) - 16`, y = `at(gy, best) + h(18)`), below the curve's falling side.

### 2. [P2] confusion: the k-means centers finish moving before the narration describes the move
- When: 318-333 s, beat `kmeans` (frames element-320.jpeg, element-323.jpeg, element-328.jpeg)
- What: The centers jump during the generic recipe ("move each center to the mean", about 318 s) and settle on "repeat until nothing moves" (about 322 s, "pass 3"). Then the specific account starts: "These three centers all start in one group" at about 323.5 s, "two of them jump toward the other groups" at about 327.6 s, "on the third pass, it settles" at about 332 s. All of it plays over the finished clustering, with "all three start here" circling a blob the centers have already left.
- Why it matters: The viewer sees the converged result while hearing the start described, so the one step that makes k-means visible (the jump) is never watched with its explanation.
- Cause: `video/src/videos/ds-ml-models/KmeansScene.tsx:101-102` cue `recolor = [assignAt + 2, repeatAt, repeatAt + 22]` and `moves = [moveAt + 2, repeatAt + 12]` to the generic sentence. `startAt`, `jumpAt` and `settleAt` only drive annotations.
- Fix: Cue the moves to the specific sentence: `moves = [jumpAt, settleAt - 20]` and `recolor = [assignAt + 2, jumpAt + 10, settleAt - 8]`. The generic sentence then plays over pass 1 (the first assignment), and "all three start here" appears while the centers are still there.

### 3. [P2] accuracy: "fits each new tree to the gradient of the loss" (should be the negative gradient)
- When: 230-256 s, beat `ada` (frames element-236.jpeg, element-256.jpeg)
- What: The narration and the on-screen line both say "each new tree fits the gradient of the loss". The page says "the negative gradient of the loss function (pseudo-residuals)". The narration's own "the residuals for squared error" is the negative gradient, so the sentence contradicts itself on the sign.
- Why it matters: A viewer will repeat "fits the gradient", and "negative gradient, the pseudo-residuals" is the exact phrase an interviewer listens for.
- Cause: `video/src/videos/ds-ml-models/script.ts` beat `ada`; `ForestScene.tsx:474`.
- Fix: Narration: "Gradient boosting fits each new tree to the negative gradient of the loss, which for squared error is just the residuals, so any differentiable loss will do." On screen: "each new tree fits the negative gradient of the loss". Then "for squared error: the residuals" can stay.

### 4. [P2] spacing: the gradient-boosting half of question 6 plays over a nearly empty frame
- When: 227-240 s, beat `ada` (frame element-236.jpeg)
- What: After the forest clears, the frame holds only the question and, from about 230 s, three short lines in the right column. The left 55% stays blank until AdaBoost's points arrive at about 239 s. This covers about 10 s of the hardest sentence in the scene: gradient of the loss, residuals, any differentiable loss.
- Why it matters: The answer to "how does it differ" rests on the gradient-boosting half, and that half gets text only. The same scene gives AdaBoost a full figure.
- Cause: `video/src/videos/ds-ml-models/ForestScene.tsx`: the left box's `Frame` and points start at `adaAt - 2` (`:355-404`). Between `gbAt` and `adaAt` only the Notes at `:465-490` draw.
- Fix: From `gbAt` to `adaAt`, draw question 4's first boosting stage in the left box: the sine points, `ENS.fit1` and the red `ENS.resid1` sticks, as `BagScene.tsx:220-235` does. Label it "the next tree is fitted to these: the negative gradient". Cross-fade it to the AdaBoost points at `adaAt`.

### 5. [P2] confusion: the forest's accuracy bars start at 85%
- When: 217-226 s, beat `forest` (frame element-225.jpeg)
- What: The bars for one tree (90.6%), bagged trees (93%) and the forest (95.3%) grow from an 85% baseline. The forest's bar is about 1.9 times the single tree's, for a 4.7-point gain. The middle value is also printed "93%" next to two one-decimal values.
- Why it matters: Bar length is read as size, so the chart overstates the gain in the one place the video argues that decorrelation pays.
- Cause: `video/src/videos/ds-ml-models/ForestScene.tsx:46` (`LO = 85`), the scale at `:140`, and the bar widths at `:326-336`.
- Fix: Keep the 85-100% axis but draw a dot at each value (r ≈ 12) with the label beside it, with no bar from the left. Or keep bars and start them at 0. Print the middle value as "93.0%".

### 6. [P2] answer: question 11 implies SHAP fixes the high-cardinality bias, and omits permutation importance
- When: 465-489 s, beat `shap-values` (frame element-488.jpeg)
- What: The close is "SHAP ranks the plan first and the ID last", with a green "← last, by SHAP". But SHAP still gives the meaningless ID 13% of the importance, more than half of region's 23%. Nothing explains why: SHAP explains the model, and this forest really does split on the ID. The question an interviewer presses next is "so how do you tell whether a feature helps on new data?" The standard answer, permutation importance on held-out rows, is computed in `results.json` (`shap.permutation`: plan 0.097, ID 0.012) and never shown. The plan for this video named it as the third comparison.
- Why it matters: A viewer will say "use SHAP instead of impurity importance" and has nothing ready for the follow-up about overfit features.
- Cause: `video/src/videos/ds-ml-models/script.ts` beat `shap-values`; `ShapScene.tsx` shares panel. `SHAP.permutation` is unused.
- Fix: After "…and the ID last.", add: "It still gives the ID thirteen percent, because SHAP explains the model, and this forest leans on the ID. To ask whether a feature helps on new customers, shuffle it on held-out rows: that's permutation importance, and it puts the ID far behind." Add a third, thin bar per feature in the shares panel (or one line, "permutation, held out: plan 0.097 · ID 0.012"), cued to "permutation importance".

### 7. [P2] answer: questions 3 and 8 skip the standard follow-ups
- When: 103-141 s, beat `tree-gini` (frame element-140.jpeg); 312-361 s, beat `kmeans-k` (frame element-361.jpeg)
- What: Question 3 covers Gini only. The page also gives entropy (information gain) for classification and variance reduction for regression trees, and "Gini or entropy?" is the usual next question. Question 8 covers choosing k and bad starts, but not the page's failure modes: k-means assumes round, similar-sized clusters and is pulled by outliers.
- Why it matters: Both are the questions an interviewer asks right after these answers, and the page has them.
- Cause: `video/src/videos/ds-ml-models/script.ts` beats `tree-gini` and `kmeans-k`.
- Fix: In `tree-gini`, after "the lowest of any cut": "Entropy works the same way, and a regression tree picks the cut that cuts variance most." In `kmeans-k`, before "And run several starts": "It assumes round clusters of similar size, and outliers drag the means." Add a matching 22px line under each figure.

### 8. [P3] accuracy: rounded numbers on screen do not add up
- When: 63-74 s, beat `logit-fit` (frame element-073.jpeg); 466-489 s, beat `shap-values` (frame element-488.jpeg); 386-395 s, beat `pca` (frame element-394.jpeg)
- What: "z = −15.25 + 1.03 × radius" at radius 15 gives 0.20, not the 0.26 shown (0.26 comes from 1.034). The waterfall starts at "0.50", then +0.183 −0.217 +0.036 −0.030, which sums to 0.472, not the 0.475 shown (the base is 0.503). The scree shows 73% + 22.9% next to "95.8% in two", while the narration says ninety-six.
- Why it matters: Viewers who check the arithmetic get a different answer and lose trust in the figure.
- Cause: `video/src/videos/ds-ml-models/LogitScene.tsx:351` (hard-coded "1.03"); `ShapScene.tsx:401` (`fmt(base, 2)`); `PcaScene.tsx` cumulative label.
- Fix: Show "1.034 × radius" and say "one point oh three four". Show the base as `fmt(base, 3)` ("0.503") and say "point five oh three". Label the bracket "96% in two" to match the narration, or say "ninety-five point eight".

### 9. [P3] confusion: AdaBoost's most-missed point is ringed in green
- When: 249-257 s, beat `ada` (frame element-256.jpeg)
- What: The point that two rounds got wrong is ringed in green, with "35× the lightest" in green. Elsewhere in the series, green means the right answer. A few seconds earlier the round-1 misses were ringed in red. The label's paper background also cuts the third stump's dashed line and hides a small purple point.
- Why it matters: Green on the hardest point reads as "correct".
- Cause: `video/src/videos/ds-ml-models/ForestScene.tsx:425` (`stroke={OK}`) and `:449-457` (`OK_INK`, `background: PAPER`).
- Fix: Ring it in `ACCENT` (red, as the earlier misses) or wrap the label in `<Mark>` (yellow, what the narration points at). Place the label left of the point (`align="right"`) so it clears the stump at x ≈ 697.

### 10. [P3] confusion: kNN's "k closest" circle leaves three of the neighbors outside it
- When: 272-283 s, beat `knn` (frame element-282.jpeg)
- What: The dashed circle meant to enclose the 15 nearest points is drawn with the x-scale radius only. The plot's y-scale is about 14% denser, so the three ringed blue neighbors above the new point sit on or outside the circle.
- Why it matters: The figure's one claim, "these are the closest", is visibly off at the top.
- Cause: `video/src/videos/ds-ml-models/KnnScene.tsx:107-108` (`ringR` from `bx` alone), drawn as a `<circle>` at `:167-174`.
- Fix: Draw an `<ellipse>` with `rx = at(bx, q0 + r) - qx` and `ry = qy - at(by, q1 + r)`. Or set the box's aspect to match `MOONS.xlim`/`ylim`.

### 11. [P3] confusion: the tumors land on the "score z" axis for about 3 s
- When: 51-54 s, beat `logit-fit` (frame element-052.jpeg)
- What: The 569 tumors appear at "five hundred sixty-nine tumors" while the x-axis still reads "score z (the log odds)", −5 to 15. Malignant tumors sit at z ≈ −4 with probability 1 until the axis changes to "mean radius" on "the mean radius".
- Why it matters: For a moment the chart contradicts the curve drawn on it.
- Cause: `video/src/videos/ds-ml-models/LogitScene.tsx:215-232` fade the tumors in at `tumorsAt`; the z-axis leaves only at `radiusAt` (`:196`).
- Fix: Start the tumor `Points` at `radiusAt + 6`, after the axis swap.

### 12. [P3] confusion: the 30-feature grid reshuffles twice a second for 22 s
- When: 204-226 s, beat `forest` (frames element-204.jpeg to element-225.jpeg)
- What: The lit handful of five cells changes every 16 frames from the first split to the end of question 5. It is still flickering while the three accuracy bars are read.
- Why it matters: The motion competes with the bar chart the narration is reading.
- Cause: `video/src/videos/ds-ml-models/ForestScene.tsx:113` (`k = floor((frame - splitAt) / 16)` with no end).
- Fix: Clamp it: `k = Math.min(6, …)`, or freeze it at the word "held-out".

### 13. [P3] spacing: k-means notes collide with the frame edge and with each other
- When: 326-362 s, beats `kmeans` and `kmeans-k` (frames element-328.jpeg, element-361.jpeg)
- What: "all three start here" straddles the plot's right border, and its paper background breaks the frame line. Under the plot, "300 points · pass 3 · settled" and "run several starts, or k-means++: a bad start can settle wrong" are separate notes with a gap of about 15 px. They read as one run-on line, "…settled run several starts…", that extends past the plot to x ≈ 1070.
- Why it matters: The k-means++ advice reads as part of the pass counter.
- Cause: `video/src/videos/ds-ml-models/KmeansScene.tsx:217-232` (note at `START + h(76)`) and `:274-277` (second note at a fixed `box.left + 300`, same y).
- Fix: Put "all three start here" above the dashed circle inside the box (y = `START_y - h(96)`, centered). Move the k-means++ note to its own line at `y + h(40)`.

### 14. [P3] spacing: tick labels and two notes are set at 18px
- When: 125-149 s, 334-362 s, 443-489 s (frames element-140.jpeg, element-361.jpeg, element-488.jpeg)
- What: The Gini chart's y ticks, the elbow chart's ticks, the silhouette's k labels, the waterfall's x ticks, "distinct values" and "exact Shapley values: every subset of the 4 features, computed in NumPy" render at 18px.
- Why it matters: They are under the README's 19px floor.
- Cause: `video/src/videos/ds-ml-models/TreeScene.tsx:286`, `KmeansScene.tsx:309,444`, `ShapScene.tsx:228,387,480`.
- Fix: Change each to 19 (ticks) or 20 (notes).

### 15. [P3] spacing: the tree's cut line hangs into empty space for 15 s
- When: 108-124 s, beats `tree` and `tree-gini` (frame element-110.jpeg)
- What: The dashed cut runs from above the dot strip down to y ≈ 945, through about 280 px of blank page, because it is sized for the Gini chart that only appears at "Slide a cut".
- Why it matters: It is a stray line with nothing to meet.
- Cause: `video/src/videos/ds-ml-models/TreeScene.tsx:249-252` (`y2 = y(GINI_TOP) + h(GINI_H)` from the start).
- Fix: Use `y2 = base + h(24)` until `slideAt`, then ease it down to the Gini chart's floor.

### 16. [P3] explanation: PCA's components and the curse's "space empties out" are asserted, not shown
- When: 367-395 s, beat `pca` (frames element-371.jpeg, element-394.jpeg); 396-402 s, beat `curse`
- What: The scatter is already in component coordinates, so "finds the directions in which the data varies most… and projects the data" plays as two axis lines on rotated data. The viewer never sees what component 1 is made of. `PCA.loadings` (petal length 0.58, petal width 0.565, sepal length 0.52, sepal width −0.27) is in `results.json` and unused. In the curse, "As dimensions grow, space empties out" plays over an empty frame (398-402 s), and `CURSE.shell` (the page's "no middle left" curve) is unused.
- Why it matters: "What is a principal component?" is the natural follow-up, and the data to answer it is already computed.
- Cause: `video/src/videos/ds-ml-models/PcaScene.tsx:157-245` (projection only); `:418` axes cued to `emptyAt` with no content.
- Fix: Under "component 1: most variance", add at `projectAt` a 20px line: "≈ 0.58 petal length + 0.57 petal width + 0.52 sepal length − 0.27 sepal width". For the curse, either cut "As dimensions grow, space empties out" or draw `CURSE.shell` faintly on the same axes, labelled "share of the cube near its surface".

### 17. [P3] explanation: "test error" is never named, and the demo does not show boosting's noise weakness
- When: 167-195 s, beats `bag` and `boost` (frame element-195.jpeg)
- What: 0.262, 0.180 and 0.175 are mean squared errors, and the noise alone costs 0.122 (`ens.mse.noise`), but neither fact is shown. The beat ends "it can overfit noisy data, where bagging holds up". Yet on this noisy sine, boosting finishes slightly ahead (0.175 against 0.180), next to "holds up on noisy data" under bagging.
- Why it matters: An attentive viewer sees the demo contradict the closing sentence.
- Cause: `video/src/videos/ds-ml-models/BagScene.tsx:184,310,332`; `script.ts` beat `boost`.
- Fix: Label "test MSE, on 2,000 new points (noise alone: 0.122)". Narration: "Here, they finish level. In general boosting is often the more accurate, but it can overfit noisy data, where bagging holds up."

### 18. [P3] confusion: the churn table arrives 11 s before it is introduced
- When: 442-453 s, beat `shap` (frame element-448.jpeg)
- What: The table (plan, region, tenure, customer ID, churned) fades in on "The built-in one adds up how much each feature cut impurity", with no caption. "Here's a made-up churn table" comes at 453 s.
- Why it matters: For 11 s the viewer looks at an unexplained table while hearing about impurity, which has no picture.
- Cause: `video/src/videos/ds-ml-models/ShapScene.tsx:111` (`tableOn` at `asked - 2`); the "made up for this video" caption waits for `madeAt`.
- Fix: Fade the "made up for this video: 1,500 customers" caption in with the table at `asked + 6`. Or move `tableOn` to `distinctAt - 20`, so the table arrives with "many distinct values".

### 19. [P3] answer: smaller gaps against the page
- When: 37-49 s (`logit`), 75-98 s (`linear`), 196-226 s (`forest`), 495-513 s (`r-gen`), 549-568 s (`r-select`)
- What: Q1 says "adds up the features into a score" without the weights (the score is a weighted sum). Q2 omits the page's heteroscedastic residuals. Q5's "a random handful" never gives the default (about √p, which is why it is five of thirty). Q12 gives only the generative side of the trade-off: the page adds that discriminative models usually win with enough labels. Q15's "keeps five of the thirty" reads as RFE choosing five, but five was the requested count.
- Why it matters: Each is a one-clause addition that an interviewer may probe.
- Cause: `video/src/videos/ds-ml-models/script.ts` beats `logit`, `linear`, `forest`, `r-gen`, `r-select`.
- Fix: "It weights and adds up the features…". "…and its errors can't have constant variance, which least squares assumes." "…here five of thirty, about the square root of the feature count." "…and copes better with few labels; with plenty, discriminative models usually win." "Asked for five, recursive elimination keeps these five of the thirty."
