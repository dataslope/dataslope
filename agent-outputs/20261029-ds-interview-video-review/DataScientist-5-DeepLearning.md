# DataScientist-5-DeepLearning (9:55, 594.9 s)

## Verdict
- The answers are accurate. I recomputed every number on screen by hand against `results.json`, and all of them agree: the neuron (1.4, 0.802), the matrix collapse (1, -8 and 3, -6), the softmax (66/24/10), the backprop chain (-0.538 x 0.197 x 1.5 = -0.159), 0.25^10 and 1.5^10, the weight-decay step, the dropout totals, the batch-norm stats, all four attention rows, and 313 iterations. Every question card matches what is read, and the bridges into and out of the video line up with Parts 4 and 6.
- The biggest problems are figures that contradict what is being said. The narration says momentum "damps the zigzag" while its path swings wider than plain SGD. The struck-out sigmoid still feeds a green 0.802. And SGD's end point, "three units from the bottom", is hidden under RMSProp's path at the moment that number is read.
- Some answers stop just short of what an interviewer would ask next: what a layer's gradient factor is made of (Q5), why Adam breaks the equivalence between weight decay and L2 (Q9), which axis batch norm averages over (Q10), and where q, k and v come from (Q12).
- Pacing is comfortable. Content beats run at 1.8 to 3.0 words per second, no gap between beats is under 0.55 s, and every scene cut gets 1.6 s. The densest beats are `opt-result` (3.20 w/s, three numbers) and `backprop-page` (2.97 w/s, a formula and five numbers).
- The polish issues are small: a color swap between Q5 and Q14, mis-centred labels, 18 px ticks, three loops running at once in Q11, and an overfitting minimum squeezed into the first 4% of its axis.

## Findings

### 1. [P2] confusion: momentum's path contradicts "damps the zigzag"
- When: 251.1-258 s, beat `opt-rest` (frames element-256.jpeg, element-286.jpeg)
- What: The narration says "Momentum keeps a running velocity, so it builds speed along the floor and damps the zigzag." On screen, through steps 10-20 the blue momentum path swings across the valley by about ±0.5, while plain SGD's red zigzag has already shrunk to ±0.1-0.35. Visibly, momentum is the wider oscillation. Adam does the same thing and overshoots the bottom to x = 1.4.
- Why it matters: the one figure meant to show the claim shows the opposite.
- Cause: `video/src/videos/ds-deep-learning/check.mjs:105,110,117` runs heavy-ball momentum at β = 0.9, lr 0.05. In this ravine that is underdamped, so the steep-direction swing decays by only √0.9 ≈ 0.95 a step, against SGD's 0.9. `OptScene.tsx:109-138` draws the path as computed.
- Fix: re-voice `opt-rest` (`npm run narrate -- ds-deep-learning --only opt-rest`) to say "...so it builds speed along the floor: it swings in slow waves instead of flipping every step, and covers far more ground." Change `OptScene.tsx:65` `what` to "a running velocity: speed along the floor".

### 2. [P2] confusion: SGD's end point is hidden when "three units from the bottom" is read
- When: 275.2-286.5 s, beat `opt-result` (element-286.jpeg)
- What: From about 258 s, RMSProp's orange path runs along the valley floor on top of SGD's red dots. When the narration says plain descent "is still three units from the bottom", nothing marks where it stopped (x = -3.07, about 678 px). Adam's last point (-0.28) is lost inside its own overshoot loop. The distances exist only as numbers in the legend. Separately, the legend calls SGD "a step per mini-batch", but these are full-gradient steps on a formula.
- Why it matters: the comparison the scene ends on cannot be seen in the figure.
- Cause: `OptScene.tsx:109-138` draws the runs in the order sgd, momentum, rmsprop, adam, all with 3.6 px dots and no end marker. The legend text is at `OptScene.tsx:178`.
- Fix: at `threeAt`, draw a ringed end dot (r 10, in the run's color) on each path's last point, plus a red bracket from SGD's end to the × labelled "3.07". Draw the SGD group last so it sits on top. Change `OptScene.tsx:178` to "plain gradient steps".

### 3. [P2] confusion: the struck-out sigmoid still outputs 0.802
- When: about 49-51.7 s, beat `neuron` (element-050.jpeg)
- What: On "Leave out the activation, and the neuron is just linear regression", the sigmoid box is struck through. The green 0.802 output (the sigmoid's value) stays, still joined to the struck box by its arrow. Without the activation the output would be 1.4.
- Why it matters: the frame shows a linear neuron producing a sigmoid's output, in "right answer" green.
- Cause: `NeuronScene.tsx:171`. The 0.802 `Cells` has no dim keyed to `leaveAt`, while `NeuronScene.tsx:167` strikes the box.
- Fix: give that `Cells` `dim={leaveAt + 4}` and add a "1.4" cell in INK at the same position from `regAt - 2`.

### 4. [P2] explanation: Q5 never says what a layer's factor is, so "factors above one" come from nowhere
- When: 185.0-212.9 s, beat `vanish` (element-227.jpeg)
- What: The narration says "The sigmoid's slope is a quarter at most, so ten sigmoid layers shrink the gradient by a quarter to the tenth... Factors above one compound the other way." Having just made each factor a slope of at most 0.25, the video then draws a × 1.5 line without saying where 1.5 could come from: the weight that multiplies each slope. The quarter-to-the-tenth is also stated as the shrink, when it only holds for weights near one.
- Why it matters: "How can a sigmoid net explode if its slope is at most 0.25?" is the obvious follow-up, and the video's model cannot answer it. The page frames the factors as layer Jacobians.
- Cause: `script.ts:155`; `VanishScene.tsx:93-95` ("so × 0.25 a layer") and `146-148` ("× 1.5 a layer").
- Fix: reword to "Each layer multiplies the gradient by its weight times its activation's slope. The sigmoid's slope is a quarter at most, so with weights near one, ten layers shrink it to a quarter to the tenth... Large weights push the factor above one: one and a half, ten times over...". Relabel the lines "× 0.25 a layer (weights near 1)" and "× 1.5 a layer (large weights)".

### 5. [P2] answer: Q9 says Adam breaks the equivalence but not why, or what the L2 penalty is
- When: 351.1-381.9 s, beats `decay`, `decay-adam` (element-382.jpeg)
- What: "adding an L two penalty to the loss" never says the penalty is λ/2 times the sum of squared weights, whose gradient is λw. "With Adam the two differ, so AdamW applies the decay separately" names the fix but gives no reason. λ appears only as "λ = 0.5" in 21 px grey text.
- Why it matters: "why does Adam need AdamW?" is the follow-up this question exists for.
- Cause: `script.ts:207,212`; `DropScene.tsx:163-171, 205-212`.
- Fix: add to `decay`: "an L two penalty, lambda over two times the squared weights, whose gradient is lambda times w". Change `decay-adam` to "Adam divides every gradient, the penalty's included, by that weight's recent gradient size, so weights with big gradients are barely decayed. AdamW subtracts the decay from the weights directly." On screen, put "penalty λ/2·‖w‖², gradient λw" under the L2 row, and "Adam rescales λw too" after "with Adam, the two differ:".

### 6. [P3] answer: batch norm never says it normalizes each unit across the batch, and its normalized row ends empty
- When: 387.2-425.8 s, beats `bn`, `bn-why` (element-429.jpeg)
- What: Row 1 is labelled only "one mini-batch, as it arrives". Nothing says its eight dots are one unit's input across eight examples, so the later contrast with layer norm ("across the features of each example") has nothing to contrast with. "spread 1.75" is never defined (it is the standard deviation). Once gamma and beta are applied, the dots leave the middle line, so the finished frame shows "normalized: mean 0, variance 1" over an empty axis.
- Why it matters: which axis each norm averages over is the standard follow-up on batch norm vs. layer norm.
- Cause: `BnScene.tsx:98, 146-148`. In `BnScene.tsx:135-136`, the dots travel on to row 3, and ghost dots are left only on row 0 (`BnScene.tsx:140`).
- Fix: label row 1 "one unit's input, across a mini-batch of eight". Rename "spread 1.75" to "standard deviation 1.75". Narrate "For each unit, over the mini-batch, it shifts and scales...". Add ghost dots on row 1 at `0.25 * toOut`.

### 7. [P3] confusion: the same two outcomes in opposite colors
- When: 185-231 s (`vanish`) vs. 544-563 s (`r-init`); also 72-84 s (`linear-fix`) (element-227, element-561, element-084)
- What: In Q5 red is the gradient that vanishes and orange the one that explodes. In question 14 red is the signal that blows up and orange the one that shrinks to nothing. In Q2, the ReLU zeroing (the fix) is red: "zero the negatives", with -2 tinted red.
- Why it matters: it breaks one meaning per color, on the same idea, within one video.
- Cause: `VanishScene.tsx:58-59` vs. `RapidScene.tsx:76-77`; `NeuronScene.tsx:255`.
- Fix: swap the colors at `RapidScene.tsx:76-77` (spread 1 WARM, spread 0.01 ACCENT). Set "zero the negatives" and its cell tint to INK_SOFT or the yellow mark.

### 8. [P3] confusion: three animations loop while the transformer is explained
- When: 465.9-477.0 s, beat `arch-tf` (element-476.jpeg; tiles 466-477 change every second)
- What: The CNN filter keeps sweeping the grid and the RNN keeps re-reading t1 to t5 while the narration has moved on to the transformer, whose arcs are pulsing too.
- Cause: `ArchScene.tsx:65-66` (`visits % 25` never stops), `81` (the RNN loops `% (TOKENS + 3)`), `83` and `227` (the glow).
- Fix: stop the filter after its first pass (`Math.min(visits, OUT * OUT - 1)`), and freeze the RNN on its last step from `tfAt`.

### 9. [P3] spacing: the overfitting chart squeezes its key moment against the axis
- When: 292.2-325.3 s, beats `overfit`, `overfit-fix`; also 377-382 s (element-325, element-382)
- What: On the 0-4,000 epoch axis, the narrated minimum at epoch 160 sits 34 px from the y-axis, and "stop here" lies almost on top of the axis. Both curves have unexplained spikes near epochs 2,550, 2,950, 3,400 and 3,850 (full-batch Adam), and the Q9 chart repeats them.
- Why it matters: "bottoms out at epoch 160" is a dot jammed against the axis, and the spikes raise a question the video never answers.
- Cause: `OverfitScene.tsx:51, 82`; `DropScene.tsx:73`; the overfitting run in `check.mjs`.
- Fix: use a log epoch axis from 20 to 4,000 (ticks 20, 100, 1,000, 4,000). Either lower the Adam rate in that run until the spikes go, or add a 20 px note: "spikes: Adam steps overshooting".

### 10. [P3] spacing: centred labels are centred on the left edge of their figures
- When: 125-136 s (`act-soft`) and 492-508 s (`attn`, `attn-grid`) (element-131, element-507)
- What: "scores" sits left of its bracket. "sum: 100%" is centred on the left edge of the percentage cells. "weights: how much each token takes from each" spans 324-776 px under a grid that runs from 560 to 1024 px.
- Cause: `Tagline` treats `x` as the centre (`parts.tsx:183`), but `ActScene.tsx:136, 139` and `AttnScene.tsx:132, 135` pass the left edge.
- Fix: `x={LEG_X + 3 * 96 + 112 + 165}`, `x={LEG_X + 144}` and `x={GX + 2 * GW}` respectively.

### 11. [P3] spacing: text under 19 px
- When: 377-382 s, 544-563 s, 501-508 s (element-382, element-561, element-507)
- What: The tick labels on the Q9 validation chart and the question 14 chart are 18 px. On the question 14 chart the y ticks use Unicode superscripts (10¹⁰), so the exponents render at about 10 px. In the attention blend, "(the)", "(cat)" and the rest are 18 px.
- Cause: `DropScene.tsx:225`, `RapidScene.tsx:92, 96`, `AttnScene.tsx:181`.
- Fix: drop `size={18}` so both axes use the default 20. Draw the exponents as an SVG `<tspan>` at 15 px on a 21 px base. Use `label(20, ...)` in `AttnScene.tsx:181`.

### 12. [P3] explanation: self-attention leaves out where q, k and v come from, and what d is
- When: 478.0-494.0 s, beat `attn` (element-507.jpeg)
- What: "Each token makes a query, a key and a value" never says these are the token's vector times three learned matrices. "Score" is never said to be a dot product. d appears in the formula and is only "their length" aloud, which can be heard as the vectors' norm. "Saturate", used here and in `r-loss`, is never defined.
- Why it matters: the learned projections are what an interviewer probes next.
- Cause: `script.ts:251`; `AttnScene.tsx:78-87`.
- Fix: "Each token's vector is multiplied by three learned matrices into a query, a key and a value. Score every query against every key with a dot product, divide by the square root of their dimension, d, so the softmax doesn't pile all its weight onto one key..." Add "d = 4, the length of q and k" at 20 px beside the formula.

### 13. [P3] explanation: Q3 describes the curves' shapes without saying why they matter
- When: 85.5-136 s, beats `act`, `act-relu`, `backprop-in` (element-131.jpeg)
- What: "Goes flat at both ends" is not tied to a near-zero slope until Q5. "Centered on zero" gets no reason. The dying-ReLU problem is described but never named. GELU, which is on the page and standard in transformers, is missing. The legend and softmax leave on "one more idea", so the last 3 s before the cut show three unlabelled curves.
- Cause: `script.ts:120,125`; `ActScene.tsx:60` (`legendOut`).
- Fix: "...goes flat at both ends, where its slope, and so the gradient, is nearly zero"; "...the dying ReLU problem, so leaky ReLU or GELU keeps a small slope there". Remove `legendOut` so the legend holds until the cut.

### 14. [P3] pacing: the page-check beat is dense and a detour from the answer
- When: 170.7-183.4 s, beat `backprop-page` (element-183.jpeg)
- What: The beat runs at 2.97 w/s with a new formula and five numbers, then goes straight into a scene cut. The narration says "sigma times one minus sigma" while the screen shows "s(1 − s)". "The page's code" means nothing outside the lesson. Also, the forward-pass arrows are 20 px stubs that read as glyphs ("b ]•→ z = 1.0").
- Cause: `script.ts:149`; `BackpropScene.tsx:198, 152`.
- Fix: cut the beat to "The middle slope is the sigmoid's own, sigma times one minus sigma, a quarter at most." Show `σ(z)(1 − σ(z))`, and keep only the 0.25 column of the table. Move `VALS` 40 px right so the first arrows are at least 60 px long.

### 15. [P3] confusion: a stray green line in the list of fixes
- When: 225-230 s, beat `opt-in` (element-227.jpeg)
- What: "the step size: the machine learning round" appears in green under the five ticked fixes for vanishing gradients, where it reads as a sixth fix. The beat also points at a round from another video.
- Cause: `VanishScene.tsx:164-166`; `script.ts:165`.
- Fix: delete that Note. Let the spoken bridge carry the turn on its own.

### 16. [P3] pacing: the bridges end on a blank page
- When: about 290.4-292.2 s, 385.8-387.2 s and 430.7-432.1 s; beats `overfit-in`, `bn-in`, `arch-in` (tiles 291, 386, 431)
- What: These three scenes clear on the bridge's last word, so the 1.6 s scene gap shows an empty white page in silence before the next question card types in. Every other scene holds its finished figure through the gap.
- Cause: `OptScene.tsx:69` (`out = tooMuchAt - 2`), `DropScene.tsx:66`, `BnScene.tsx:54`.
- Fix: drop these early exits and let each scene end at its cut, as the other scenes do.

### 17. [P3] explanation: 313 iterations, without the round-up
- When: 563.2-580.6 s, beat `r-epoch` (tiles 575, 590)
- What: 10,000 ÷ 32 is 312.5, but the screen just says "= 313" with no note that the last batch is partial. The line "the examples behind one update, and the update itself" reads as a fragment. The green "one batch" box is 14 px wide, where a batch is about 5 px of the bar.
- Cause: `RapidScene.tsx:155, 166-168, 169-177`.
- Fix: "10,000 ÷ 32 = 312.5, so 313 iterations: the last batch holds 16". Replace the fragment with "batch: the examples behind one update; iteration: the update".

### 18. [P3] answer: Q2 shows the collapse but not what non-linearity buys
- When: 71.2-81.5 s, beat `linear-fix` (element-084.jpeg)
- What: The answer ends on "Now depth adds something". The page's point, that non-linear layers can bend the decision boundary and approximate any function, is never made.
- Cause: `script.ts:111`.
- Fix: "Now depth adds something: the network can bend its boundary, and with enough units approximate almost any function."

### 19. [P3] other: the plan overclaims
- When: 16.6-29 s, beat `plan` (tiles 019-029)
- What: The narration and the on-screen text both say "twelve get opened up on networks small enough to show every number". But Q3 (curves), Q5 (powers), Q6 (a formula valley) and Q11 (schematics) are not networks with numbers.
- Cause: `script.ts:92`; `HookScene.tsx:207`.
- Fix: "twelve get worked through, with every number computed by hand in NumPy", and the same on screen.
