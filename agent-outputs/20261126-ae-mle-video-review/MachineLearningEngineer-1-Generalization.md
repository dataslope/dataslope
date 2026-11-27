# MachineLearningEngineer-1-Generalization (11:10)

## Verdict
- The answers are right and unusually well evidenced: every number on screen and in the narration matches `results.json` and the page, and the measured simulations (the decomposition, the leaky pick, grouped folds, the fraud model) give each answer the follow-up an interviewer asks. One answer stops a step short: class weights' recall jump is shown without the precision it costs.
- One obvious layout defect in a key figure: the confusion matrix's column headers sit half a column to the left of their columns.
- Two figures argue against their own words: the single split-sim draw has most of its fifty scores well under the line labelled "every model's true worth", and the R² quick answer strikes through a statement that is true in sample.
- Pacing is mostly comfortable (145 wpm). Three results leave too fast: grouped folds' 50% (about a second after it is said), the dart figure's variance bracket (1.6 s), and reg-why's two mechanisms at 3.3 words a second with no breath between them.
- The rest is polish: a dashed box, a gridline and a gridline again running through labels, filled highlight boxes, a doubled space around `k`, and casing.

## Findings

### 1. [P1] Visual: the confusion matrix's column headers are half a column to the left
- When: 425-445 s, beats `pr`, `pr-page` (element-444.jpeg)
- What: "flagged" is centred over the left edge of the TP/FP column (x 437 against a column centred at 542), and "not flagged" straddles the boundary between the two columns (centred at 662 against 767). The figure is the definition of precision and recall, and the header that tells a viewer which column is flagged sits over the wrong place.
- Why it matters: the matrix is the evidence for both definitions; a viewer matching "not flagged" to the column under it can read FN as flagged.
- Cause: `video/src/videos/mle-generalization/PrScene.tsx:119-124`: `Say` with `align="center"` centres on `x`, but `x` is passed as the column's left edge (`CELL_X`, `CELL_X + CELL_W + 14`).
- Fix: pass each column's centre, `CELL_X + CELL_W / 2` and `CELL_X + CELL_W + 14 + CELL_W / 2`.

### 2. [P2] Answer: class weights' recall jump is shown without the precision it costs
- When: 570-605 s, beats `imb-trap`, `imb-prod` (element-604.jpeg)
- What: "With balanced class weights, recall at point five jumps from twenty-four percent to eighty-four", with 84% lit in yellow on the table. At that threshold the reweighted model flags 15,439 transactions and its precision falls from 84% to 5% (`fraud.weighted.at`: 839 caught, 14,600 false alarms). Neither the narration nor the table says so.
- Why it matters: "and what happened to precision?" is the first thing an interviewer asks about a recall jump, and it is what ties reweighting back to question 8: most of the jump is the ordinary threshold trade, flagging far more. Without it the table reads as reweighting buying recall for free, which is the misconception the follow-up exists to catch.
- Cause: `video/src/videos/mle-generalization/ImbScene.tsx:71-85` (no precision row); `script.ts:553` (no clause).
- Fix: a table row "Precision at threshold 0.5: 84% → 5%" in red, and one new sentence after the recall one, voiced on its own: "That's the usual trade: precision falls from eighty-four percent to five." Its "usual trade" makes the existing "But the model now calls…" read as the further cost. Add the claim to `check.mjs`.

### 3. [P2] Accuracy: the R² answer strikes through a statement that is true in sample
- When: 657-661 s, beat `r-r2` (element-659.jpeg)
- What: "A share of variance explained" is struck in red, followed by "out of sample". For least squares with an intercept, on its training data, R² is exactly the share of variance explained (the page says that reading is "most natural for ordinary least squares with an intercept"). The strike is the loudest mark on the page and says "R² is not a share of variance explained"; the qualifier is small and arrives later.
- Why it matters: a struck correct statement is what a viewer remembers, and an interviewer would correct "R² isn't the variance explained".
- Cause: `video/src/videos/mle-generalization/RapidScene.tsx:207-211`.
- Fix: no strike. "A share of variance explained" in ink, then ": only in sample, for least squares" in red on "no share of variance explained", which is the page's caution and what the narration's "on new data it can go negative" rests on.

### 4. [P2] Visual confusion: the one draw shown sits mostly below "every model's true worth"
- When: 260-268 s, beat `split-sim` (element-266.jpeg)
- What: the fifty settings' validation scores are repeat 0's (`split.first.val`): their mean is 43%, fifteen of them stack at exactly 35% (trees that predict one class, on a validation set that is 35% that class), and only eleven sit right of the dashed 50% line labelled "every model's true worth". The narration says "every model is worth fifty percent".
- Why it matters: the figure's job is "fifty honest coin flips, scattered around 50%, and the best one lands high by luck". This draw instead looks like most models are worse than chance, which a viewer cannot reconcile with the line and the words.
- Cause: `video/src/videos/mle-generalization/SplitScene.tsx:80-85` draws `SPLIT.first`; `check.mjs:200` records only repeat 0.
- Fix: have `check.mjs` also record the repeat whose fifty scores average closest to 50% with a winner closest to the 200-repeat mean (`split.shown`), and draw that one. The narration's numbers (64%, 50%) do not change.

### 5. [P2] Pacing: grouped folds' 50% clears about a second after it is said
- When: 403.5-406 s, beats `cv-groups` → `cv-keep` (element-404.jpeg, element-406.jpeg)
- What: "Grouped by user, it scores fifty" ends at 404.8 s; the whole users figure, both scores with it, fades at 405.8 s on "keep each user", and "User, session, patient: each inside one fold" replaces it on an empty page.
- Why it matters: 97% against 50% is the scene's result, and the conclusion line that follows is about exactly that figure.
- Cause: `video/src/videos/mle-generalization/CvScene.tsx:92` (`usersOut = keepAt - 6`), `:304` (the conclusion at the top, where the figure's title is).
- Fix: keep the two panels up through "keep each user, session or patient inside one fold", fading only their title, and put the green conclusion where the title was; clear the panels just before "with time series". The result then holds about six seconds.

### 6. [P3] Spacing: the held-out fold's dashed box runs through a label digit
- When: 310-331 s, beats `leak-hook` to `leak-forms` (element-311.jpeg, element-330.jpeg)
- What: the dashed box's top edge sits 4px inside the row above the fold, through the foot of that row's "1" in the label column.
- Cause: `video/src/videos/mle-generalization/HookScene.tsx:101` (`y0 = … - 7`).
- Fix: put the edge in the gap between the rows (`- GRID.gap / 2`).

### 7. [P3] Spacing: "both near 7, and more rows won't move them" sits on a gridline
- When: 165-175 s, beats `under-line`, `under-fix` (element-168.jpeg)
- What: the label's baseline rests on the dotted line at 10.
- Cause: `video/src/videos/mle-generalization/FitScene.tsx:322` (`at(ly, 11.8)`).
- Fix: raise it to sit between the 10 and 20 lines.

### 8. [P3] Spacing: the 54% label is crossed by the 50% gridline and reads as "50% 54%"
- When: 461-488 s, beats `pr-thresh` to `pr-capacity` (element-461.jpeg)
- What: at threshold 0.1 the recall label sits just under its dot, where the 50% gridline runs through its top, and level with the axis's own "50%" label 34px to its left.
- Cause: `video/src/videos/mle-generalization/PrScene.tsx:260` (`at(cy, recall) + 8` for both thresholds).
- Fix: at 0.1, centre the label on its dot, a little further left, with the kit's paper `halo`, so the gridline stops short of it and it no longer shares the tick's line.

### 9. [P3] Visual: "every user on both sides" over a fold where some users are not split
- When: 396-406 s, beat `cv-groups` (element-404.jpeg)
- What: the drawn shuffled fold leaves about a sixth of the users with no validation row (the gaps in the red underline), under a label that says every user is on both sides. Across all five folds the narration's "every user" is right; in the one fold drawn it is not.
- Cause: `video/src/videos/mle-generalization/CvScene.tsx:275`.
- Fix: ": users on both sides", which the picture and the narration both bear out.

### 10. [P3] Style: highlights drawn as fills, and black text on a tint
- When: 345-386 s, beats `cv` to `cv-when` (element-373.jpeg); 577-605 s, `imb-trap`, `imb-prod` (element-604.jpeg)
- What: each round's "validate" fold box is filled with yellow as well as outlined; the house rule is that a diagram box's highlight colours its outline and text, never a fill. On the imbalance table, "84%" is black on its yellow tint, where a tinted mark's text takes its hue's ink.
- Cause: `video/src/videos/mle-generalization/CvScene.tsx:150`; `ImbScene.tsx:72` (`ink: INK`).
- Fix: drop the fold box's fill (outline and text stay yellow); set the 84% in the yellow ink.

### 11. [P3] Pacing: the finished dart figure holds 1.6 s
- When: 76.2-78 s, beat `bias-dart` (element-077.jpeg)
- What: the variance bracket's label arrives on "that's variance" at 76.2 s and the figure fades at 77.9 s.
- Cause: `video/src/videos/mle-generalization/script.ts:330` (`pauseAfter: 0.7`).
- Fix: `pauseAfter: 1.4`.

### 12. [P3] Pacing: reg-why's two mechanisms run together at 3.3 words a second
- When: 208-219 s, beat `reg-why`
- What: the answer's core (L2's pull fades, L1's does not) is 37 words in 11.1 s with no pause between the L2 sentence and the L1 one, while two penalty panels animate.
- Cause: `video/src/videos/mle-generalization/script.ts:398-401`.
- Fix: split the beat at the sentence break (cut free from the take) with half a second between, and move the L1 cues to the new beat.

### 13. [P3] Spacing: doubled space around `k`, and step numbers of different widths
- When: 352-374 s, beats `cv`, `cv-run` (element-373.jpeg)
- What: "Split the data into  k  folds": the row is `inline-flex` with a 0.5em gap, which lands between every text node, so `k` gets a gap on both sides. The numbered badges "1", "2", "3" differ in width, so the step texts start 5px apart.
- Cause: `video/src/videos/mle-generalization/CvScene.tsx:202-206`.
- Fix: wrap the text in one span; tabular figures in the badges.

### 14. [P3] Layout: the time-split arrow's "past" crowds the histogram label under it
- When: 282-288 s, beat `split-prod` (element-286.jpeg)
- What: "past" sits 19px above "The winner, on validation" and reads as part of it ("past The winner, on validation").
- Cause: `video/src/videos/mle-generalization/SplitScene.tsx:91-92` (the histograms' bases), `:229`.
- Fix: move the two histograms down 30px so the arrow's labels have a row of their own.

### 15. [P3] Casing: two examples continue "such as" with a capital
- When: 337-345 s, beat `leak-fix` (element-341.jpeg)
- What: "Audit features for proxies of the label, such as" is followed by "A refund flag, in a fraud model" and "A total computed with data from after the prediction". Lines that continue the one above stay lowercase.
- Cause: `video/src/videos/mle-generalization/LeakScene.tsx:166-167`.
- Fix: "a refund flag…", "a total computed…".
