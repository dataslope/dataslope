# MachineLearningEngineer-5-DeepLearning (11:41)

## Verdict
- A strong, well-measured video: every number said or shown matches `results.json`, the fifteen answers follow the page, and most figures are real runs (XOR, the digits networks, the twenty-layer simulation) rather than schematics. No P1 found.
- The one figure that contradicts its own label is the CNN's pooling grid: it is titled "2 × 2 max pooling" but keeps the largest magnitude with its sign, so four of sixteen cells are wrong and two flip sign.
- One answer stops a step short of the follow-up an ML engineer is asked: after "training takes far more memory than serving", nothing on how to buy that memory back (gradient checkpointing).
- Pacing is comfortable (2.0 to 2.9 words a second almost everywhere), but three figures clear within 0.6 to 0.8 s of their last word where a question changes inside a scene (RNN, LSTM/GRU, CNN).
- The rest is polish: a label touching a column rule, a hand-typed leaky slope that disagrees with the data, a few unlabelled marks.

## Findings

### 1. [P2] accuracy: the "max pooling" grid is not max pooling
- When: 522-526 s, beat `q10-props` (element-525.jpeg)
- What: the 4 × 4 grid under "2 × 2 max pooling: 8 × 8 to 4 × 4" keeps, from each 2 × 2 window, the value with the largest absolute value, sign and all. Max pooling keeps the largest value. Four cells differ from max pooling, and two flip sign: the window {0.56, −2.81, −0.88, −2.94} shows "−" where max pooling gives +0.56, and the window {0.81, −1.94, −1.19, −1.88} shows "−" where max pooling gives +0.81.
- Why it matters: the figure contradicts its own label, and a careful viewer learns that max pooling keeps the strongest response of either sign.
- Cause: `video/src/videos/mle-deep-learning/CnnScene.tsx:139-145` (`vals.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0)`).
- Fix: take the true maximum of each window (`Math.max(...vals)`), derived from the same `CNN.shiftedMap`.

### 2. [P2] answer: the backprop answer stops before the memory follow-up
- When: 173-181 s, beat `q4-memory` (element-181.jpeg)
- What: "The price is memory: kept activations grow with batch size and depth, so training takes far more memory than serving." The scene ends there.
- Why it matters: this track's angle is cost, and the next question an interviewer asks an ML engineer here is how to fit a bigger model or batch; the standard answer, gradient checkpointing (keep some activations, recompute the rest in the backward pass), is missing.
- Cause: `video/src/videos/mle-deep-learning/script.ts:410-414`, `BackpropScene.tsx:276-281`.
- Fix: a new beat after `q4-memory`: "Gradient checkpointing buys some of it back: keep only some layers' activations, and recompute the rest on the way down." with a line "Checkpointing: keep a few, recompute the rest" under "Serving keeps none".

### 3. [P2] spacing: "learned" touches the column rule in question 7
- When: 304-353 s, beats `q7-a` to `opt-in` (element-351.jpeg)
- What: the note "μ, σ across the batch; γ, β learned" ends about 6 px from the vertical hairline between the batch norm and layer norm columns (the house rule is at least 24 px).
- Why it matters: text against a line, held for 50 seconds.
- Cause: `video/src/videos/mle-deep-learning/NormScene.tsx:90, 103` (the 22px note runs 366 px from `BN_X` = 1060; the `ColumnRule` sits at 1425).
- Fix: set the note at 20px and move the rule 8 px right, or move the layer norm column right; check the gap in a still.

### 4. [P2] pacing: three figures clear within a second of their last word
- When: `q14-slow` ends 650.4 s and the RNN figure fades from 651.2 s (0.8 s); `q15-limit` ends 686.2 s and the LSTM/GRU figure fades from 686.8 s (0.6 s); `q10-props` ends 525.3 s and the CNN figure fades from 526.1 s (0.8 s, the pooled grid up 3.7 s, "Tolerates small shifts" 2.5 s) (element-651.jpeg, element-686.jpeg, element-525.jpeg).
- Why it matters: these are question changes inside one scene, so they get an ordinary beat pause instead of the 1.6 s scene gap, and the finished figure (the red "no parallel steps on a GPU", "Both still one step at a time", the pooled grid) goes before it can be taken in. A scene cut holds about 1.3 s.
- Cause: `script.ts:583-586` (`q14-slow` pauseAfter 0.7), `script.ts:598` (`q15-limit` 0.7), `script.ts:533-536` (`q10-props` 0.7); the figures leave 6 frames before the next question's first word (`RnnScene.tsx:102-103`, `CnnScene.tsx` `leaveAt`).
- Fix: pauseAfter 1.6 on `q14-slow`, 1.5 on `q15-limit`, 1.4 on `q10-props`, for holds of about 1.5 s.

### 5. [P3] accuracy: the leaky ReLU label says 0.1, the data says 0.01
- When: 116-131 s, beat `q3-fix` (element-129.jpeg)
- What: "Leaky: slope 0.1 below 0". `check.mjs` computes the leaky curve with 0.01 (`curves.leaky`), the usual default; the scene redraws it at 0.1 so it shows at this scale, with the number typed by hand.
- Why it matters: a viewer takes 0.1 as leaky ReLU's slope; the figure disagrees with its own data.
- Cause: `ActScene.tsx:20-21, 311` (`LEAKY_SLOPE = 0.1`, written into the label).
- Fix: keep the drawn exaggeration, drop the number from the label: "Leaky: a small slope below 0", which is what the narration says.

### 6. [P3] accuracy: the batch-of-one result is per feature, which the screen does not say
- When: 324-337 s, beat `q7-one` (element-337.jpeg)
- What: "Batch of one: its own mean, so 0 whatever the input" and "Left in training mode: it ignores its input". That holds for batch norm with one value per feature per example, as after a dense layer, which is what the pixel figure shows. A convolution's batch norm averages each channel over the image's own pixels as well, so a single image does not normalize to zero.
- Why it matters: an interviewer can press on the convolutional case; the screen states the dense case as general.
- Cause: `NormScene.tsx:197-205`.
- Fix: on screen only (the narration's "a feature is its own mean" and "that layer" are right for the layer shown): a soft note under the three lines, "One value per feature, as after a dense layer".

### 7. [P3] confusion: the ReLU outputs stay beside a network with no ReLU
- When: 59.7-61.8 s, beat `q2-collapse` (element-060.jpeg)
- What: on "Take the ReLU out" the boxes lose their max(0, …), but the green 0, 1, 1, 0 (the ReLU's outputs) stay for two seconds before the 2, 1, 1, 0 of the linear version replace them.
- Why it matters: for two seconds the figure shows outputs the drawn network does not produce.
- Cause: `PerceptronScene.tsx:317, 322` (the ReLU labels go out on `collapseAt`, the linear ones come in on `collapseAt + 6`).
- Fix: swap the labels on `reluOutAt`.

### 8. [P3] confusion: the optimizer step bars do not say which parameter is which
- When: 380-419 s, beat `q8-rms` (element-417.jpeg)
- What: two bars per optimizer, no label on either bar, no gradient on either; the viewer has to infer that the tall SGD bar is the parameter with the large gradient.
- Why it matters: the chart's point (Adam evens out the steps) rests on knowing which bar had the hundredfold smaller gradient.
- Cause: `OptScene.tsx:151-153, 158-176`.
- Fix: under each bar its gradient scale from `OPTIM.gradientScale` ("1", "0.01"), and the title's second line "gradients 1 and 0.01".

### 9. [P3] explanation: the layer chips drop the kernel size, so 448 cannot be checked
- When: 546-567 s, beat `q11-cost` (element-566.jpeg)
- What: "Conv2d(3, 16)" over 448. The page's listing is `Conv2d(3, 16, kernel_size=3, padding=1)`; without the 3, 3 × 16 × 9 + 16 = 448 cannot be read off the screen.
- Why it matters: the count is the answer's evidence, and the chip that explains it is missing its decisive argument.
- Cause: `CnnScene.tsx:153-157`.
- Fix: "Conv2d(3, 16, 3)" and "Conv2d(16, 32, 3)", which is valid PyTorch and fits the 260 px chip.

### 10. [P3] spacing: the "backprop" axis label sits on the top point
- When: 166-182 s, beat `q4-check` (element-181.jpeg)
- What: the y-axis label "backprop" is set at the axis top, to the right, where the highest of the twenty points lands on its baseline.
- Why it matters: a label touching a mark.
- Cause: `BackpropScene.tsx:242-244` (`x={at(sx, 0) + 10}`).
- Fix: set "backprop" to the left of the axis (`textAnchor="end"`), where the plot is empty.

### 11. [P3] confusion: the dropout digit is not named on screen, and reads as a 9
- When: 441-494 s, beats `q9-bug`, `q9-dash` (element-492.jpeg)
- What: the 8 × 8 image of the test 8 is thin and closed at the top, and nothing under it says it is an 8; the only "8" is in "Evaluation mode: 8 at 89%".
- Why it matters: the bug is "the right answer sometimes, the wrong one other times", which needs the true label in view.
- Cause: `DropScene.tsx:165`.
- Fix: a caption under the image, "A test 8" (from `DROPOUT.image.label`).

### 12. [P3] answer: why libraries fuse softmax and cross-entropy is not given
- When: 595-611 s, beat `r-softmax` (element-607.jpeg)
- What: "Libraries fuse the two, on raw logits". The page's reason, numerical stability, is not on screen or in the narration.
- Why it matters: "why do they fuse it?" is the natural follow-up, and the page answers it.
- Cause: `RapidScene.tsx:205-207`.
- Fix: on screen only: "Libraries fuse the two, on raw logits, for numerical stability".
