# MachineLearningEngineer-2-Models (11:23)

## Verdict
- A strong, dense video: eighteen answers, nearly every one carried by a measured figure, and every number on screen matches `results.json` and the narration. No P1s.
- The one answer an interviewer would push back on is how to read the learning-rate range test: the video says to pick "on the flat stretch" and rings the loss minimum, where the usual reading is a rate still on the steep part, about a tenth of where the loss turns up.
- The SVM scene never draws the margin it is about ("the widest margin", "on or inside the margin"), and its boundary is a pixel staircase from a 64 × 64 prediction grid.
- The recurring craft defects: chart labels set on gridlines (four charts), an axis label alone on the page for 3.5 s before its chart, a residual chart whose starting state is never seen, and a text line 9 px from a column hairline.
- Pacing is comfortable (most beats 2.0 to 2.9 w/s, every gap 0.5 s or more). The only dense beat, the range test (3.03 w/s), is also the one whose advice needs fixing.

## Findings

### 1. [P2] answer: the range test is read at its minimum
- When: 127.0-142.8 s, beat `lr-range` (element-140.jpeg, element-142.jpeg)
- What: "Pick a rate on the flat stretch, well short of the turn." The green ring sits on the lowest point of the curve (0.55) and the green band shades 0.5 to 1.75, so the picture says: pick the bottom. The narration has just said this is for "a real network", whose range-test curve has no long flat floor.
- Why it matters: the common reading (Smith's range test, fastai's `lr_find`) is a rate where the loss is still falling steeply, roughly a tenth of where it blows up; picking at the minimum is the textbook mistake an interviewer listens for.
- Cause: `video/src/videos/mle-models/script.ts:375` (the sentence), `LrScene.tsx:187-189` (the flat band in green), `LrScene.tsx:206-208` (the ring at `LR.lowest`), `LrScene.tsx:221-223`.
- Fix: split the beat at its sentence breaks and re-voice only the last sentence: "Pick a rate where it's still falling steeply, about a tenth of where it turns up." Ring the range-test point nearest a tenth of the turn (0.22) in green with its value; draw the floor in a neutral tint as "Bottoms out from about 0.5"; have `check.mjs` assert that point is on the steep stretch.

### 2. [P2] confusion: the SVM's margin is never drawn, and its boundary is a staircase
- When: 322-350 s, beats `svm`, `svm-kernel` (element-337.jpeg, element-347.jpeg)
- What: the narration says "the widest margin" and "the points on or inside the margin are the support vectors", but only the boundary is drawn, so the ringed points sit around a line with no margin to be on or inside. The boundary (and the straight one) is traced along grid cells and reads as a jagged pixel edge.
- Why it matters: the margin is the idea the question is about; the viewer has to take "on or inside the margin" on trust, and the staircase looks like a rendering fault.
- Cause: `SvmScene.tsx:132` draws `Regions` with `edge`, whose boundary runs along cell edges of the 0/1 prediction grid (`parts.tsx:489-545`); `check.mjs:236-247` writes predictions only, no decision function.
- Fix: have `check.mjs` also write each model's decision function on the same grid; draw the boundary as its smooth zero contour and the margin as dashed contours at ±1 (marching squares), the margin appearing on "widest margin" so the ringed support vectors visibly sit on or inside it.

### 3. [P2] spacing: chart labels sit on gridlines
- When: 216-255 s `ce`/`ce-grad` (element-235.jpeg): "No limit as p → 0" on the 5 line, "Confident and wrong: p = 0.02, loss 3.9" on the 4 line; 244-255 s `ce-run` (element-253.jpeg): "Cross-entropy: 24 steps" and "Squared error: 234 steps" on the 75% line; 566-584 s `gb-rate` (element-583.jpeg): "12 trees: 4.68" on the 4 line, its end touching the rate-0.3 curve; 503-505 s `bag-floor` (element-504.jpeg): the 0.75 line runs along the baseline of "Floors set by how correlated the errors are".
- Why it matters: a dotted rule through the tops of the letters is the "line through a label" defect.
- Cause: `CeScene.tsx:101`, `:104`, `:172`; `GbScene.tsx:164`; `BagScene.tsx:149`.
- Fix: set each label between two gridlines (loss 3.5 and 4.5 on the left chart, just under the 75% line on the run chart, between the 4 and 8 lines left of the dot for "12 trees", 0.85 for the bag-floor note).

### 4. [P2] confusion: an axis label alone on the page before its chart
- When: 28.9-32.4 s, beat `gd` (element-032.jpeg)
- What: the plot's "θ1" title is on the page from the scene's first frame, alone under the question for 3.5 s, before the axes and contours draw at "The gradient of the loss".
- Why it matters: a stray symbol on an empty page, the first thing seen of question one.
- Cause: `GdScene.tsx:81-86`: the θ1 div has no fade, unlike θ2 at `:87`.
- Fix: fade it in with θ2 and the axes, on `gradAt`.

### 5. [P2] confusion: the residuals before the first tree are never seen
- When: 539.7-542 s, beat `gb` (element-540.jpeg, element-541.jpeg)
- What: the bars sweep in from `addsAt − 4` one a frame, and Tree 1 lands at `addsAt + 10`, before the last bars have grown, so "after 0 trees" is never a finished picture; the first complete state is "after 1 tree", which looks as large as the half-drawn start.
- Why it matters: the mechanism the scene exists to show (each tree shrinks what is left) is invisible for the first and largest step.
- Cause: `GbScene.tsx:60` (tree cues), `:106` (bars).
- Fix: hold the starting residuals: trees on "one at a time", "each fitted" and "the residuals", each a few frames after the word, so the 0-tree bars hold about 1.5 s finished.

### 6. [P2] explanation: eight steps against 79,315, without "at its best rate"
- When: 404.4-424 s, beats `scale-gd`, `scale-prod` (element-412.jpeg, element-424.jpeg)
- What: the bars compare steps to settle with one column × 100, but nothing says both runs use their best learning rate, which is what makes the comparison fair.
- Why it matters: the first push from an interviewer is "then use a smaller rate"; the answer (the big column caps the rate, so the small direction crawls) is measured in `results.json` (curvature ratio 1.6 against 11,770) and not shown.
- Cause: `ScaleScene.tsx:166-180`.
- Fix: one line under the bars, from `SCALE.*.condition` and `SCALE.*.rate`: each run at its best rate; the ×100 column caps the rate, curvature ratio 1.6 → 11,770.

### 7. [P2] spacing: a column's text runs into the hairline
- When: 258-288 s, beats `param`, `param-cost` (element-286.jpeg)
- What: "A fixed set of numbers, and only those" ends 9 px from the vertical hairline between the two columns.
- Why it matters: the README asks for at least 24 px between a column rule and the text beside it.
- Cause: `ParamScene.tsx:13` (`COL_R = ROWS.x`), `:81` (rule at `COL_R − 70`).
- Fix: move the right column 40 px right and the rule with it (rule at about 48 px from the left text, 72 from the right).

### 8. [P2] answer: "What are ensembles?" is asked and never answered
- When: 476-496 s, beat `bag` (element-495.jpeg)
- What: the card reads "What are ensembles? Explain bagging and boosting." and the answer goes straight to bagging; nothing in words or on screen says what an ensemble is.
- Why it matters: the first half of the question has no answer to repeat; the page's is one clause ("Ensembles combine multiple models to reduce error").
- Cause: `BagScene.tsx:92-148`.
- Fix: a line on "What are ensembles?", before the two diagrams: "Many models, combined into one prediction". No new words needed.

### 9. [P3] confusion: "Radial basis function kernel" is titled 15 s before the kernel is mentioned
- When: 322.5-338 s, beat `svm` (element-324.jpeg)
- What: the first panel is titled with the kernel while the narration is still on the plain SVM; the kernel arrives at 338 s ("The kernel trick").
- Cause: `SvmScene.tsx:79` (`at: from + 8`).
- Fix: show that title on "The kernel trick".

### 10. [P3] spacing: the sigmoid's formula crowds the axis title under it
- When: 181-208 s, beats `logit`, `logit-run`, `logit-prod` (element-207.jpeg)
- What: "Probability: p = σ(z) = 1 / (1 + e^−z)" sits about 12 px above the chart's own "Probability" axis title.
- Cause: `LogitScene.tsx:51` (plot top `y(440)`), `:92`.
- Fix: lower the plot by about 22 px, keeping its bottom.

### 11. [P3] explanation: λmax is never named
- When: 122-127 s, beat `lr-band` (element-125.jpeg)
- What: "Limit: 2 / λmax ≈ 1.97" appears with "past about two"; nothing says what λmax is.
- Cause: `LrScene.tsx:167-173`.
- Fix: complete the label: "λmax, the loss's largest curvature".

### 12. [P3] confusion: the schedule's rate axis mixes a name with numbers
- When: 143-173 s, beats `lr-sched`, `lr-adam` (element-167.jpeg)
- What: the y ticks read "Base", "0.5", "0": 0.5 of what?
- Cause: `LrScene.tsx:228`.
- Fix: "Base", "Half", "0".

### 13. [P3] confusion: "Single trees: 76%, 82%" against curves that start at 73% and 78%
- When: 527-536 s, beat `forest-run` (element-534.jpeg)
- What: the note gives the average single tree while each curve starts at its first tree; the two disagree on screen.
- Cause: `ForestScene.tsx:131-134`.
- Fix: "Single trees, on average: forest 76%, bagged 82%".

### 14. [P3] confusion: θ1 and θ2 against "weights 1, 2, −1"
- When: 33-58 s, beats `gd`, `gd-run` (element-057.jpeg)
- What: the contours are over θ1 and θ2 with the minimum at (2, −1), beside "100 noisy rows from weights 1, 2, −1"; nothing says the first weight is the bias θ0, held at its best in the plot.
- Cause: `GdScene.tsx:80-92`, `:122-124`.
- Fix: a note under the plot: "θ0, the bias, held at its best".

### 15. [P3] confusion: k-means' shapes too small to read, and its last line up for 2 s
- When: 618-637 s, beat `r-kmeans` (element-635.jpeg)
- What: the true clusters are told apart by shape at a 3.6 px radius, so "Shape: true cluster" cannot be read; "Round clusters: 100% right", not narrated, is on screen about 2 s before the next question.
- Cause: `RapidScene.tsx:138` (r 3.6), `:165`; `script.ts:578` (`pauseAfter: 0.6`).
- Fix: radius 5; `pauseAfter` 1.2 on `r-kmeans`.

### 16. [P3] explanation: the support-vector bars are shares, unlabelled
- When: 351-374 s, beat `svm-cost` (element-366.jpeg)
- What: three bars of one length with a dark part and a count; nothing says the dark part is the share of the rows, so 5,308 sits on the shortest bar.
- Cause: `SvmScene.tsx:169-171`.
- Fix: title "Support vectors, as a share of the rows".

### 17. [P3] explanation: why PCA runs on scaled features
- When: 442.6-453 s, beat `pca-run` (element-452.jpeg)
- What: "the page's ten scaled features" is said and never explained, straight after question nine; "do you scale before PCA?" is the standard follow-up.
- Cause: `PcaScene.tsx:122-124`.
- Fix: a short note under the bars' title: scaled first, since PCA follows variance and raw units would decide it.

### 18. [P3] pacing: the range test in one breath
- When: 127.0-142.8 s, beat `lr-range`
- What: three sentences at 3.03 w/s with no pause between them carry a new procedure, a reading of the chart and the advice.
- Cause: `script.ts:373-377` (one beat).
- Fix: the split in finding 1, which puts the script's minimum pause between the three sentences at no voice cost.
