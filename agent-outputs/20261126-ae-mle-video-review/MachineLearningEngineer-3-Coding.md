# MachineLearningEngineer-3-Coding (537.6 s, 8:58)

## Verdict
- Every listing on screen is correct and does what the narration says it does: the hook's three lines, `np.argpartition(scores, -k)[-k:]`, the page's softmax, `np.maximum(d2, 0)` and `dict.fromkeys`. Every number checks against `results.json` and the page (102.4 GB, 800 MB, 409 of 1,000, 5.12 and 10.24 GB, 1,087,937, e^709.78, 9/24/67%, 95.9/52.6/62.6%, 9.9 to 10.1%). One equation on screen is false: after the guard, the new item's score reads "0 / 0 = 0" (finding 1).
- One spoken number disagrees with the screen. "Still roughly thirty times slower" plays over a bar labelled ×38 (finding 2).
- As answers, four stop one step before the follow-up, and the screen could carry each one. Broadcasting never gives the rule that makes (1000, 1) minus (1000,) a square, and never shows the fix. "Log-softmax computes minus nine hundred directly" never says how. Reservoir sampling asserts "knocks it out with chance one over j" and multiplies factors the screen never derives. The metrics answer never shows accuracy or a mask.
- Two pictures mislead. Decoding with argmax turns three correct row answers red when the axis-0 picks light (they are the same cells). Cosine leaves a faded red "for every single user" beside the corrected, green top three.
- Layout and pacing are sound. Nothing is under 19 px, nothing collides, every scene holds its finished state 1.6 s or more before the cut, and no beat runs above 3.1 words/s.

## Findings

### 1. [P1] accuracy: the guarded score is written "0 / 0 = 0"
- When: 112.1-115.0 s, beat `q2-guard` (element-113.jpeg, element-114.jpeg).
- What: Under "new item: all zeros", the line reads "0 / 0 = nan" in q2-zero. On "it scores zero instead" only the result flips to a green "0", so the screen states 0 / 0 = 0. The guarded computation is 0 / (0 + 10⁻¹²) = 0, which the formula above it now shows.
- Why it matters: it is a false equation, in green (the right-answer color), on the frame that carries the fix. A viewer can come away thinking the guard makes 0/0 equal 0 rather than removing the zero from the denominator.
- Cause: `video/src/videos/mle-coding/CosineScene.tsx:174-177`. The "0 / 0 = " prefix is fixed text; only the result switches on `fixed`.
- Fix: once `fixed`, write the denominator with its guard, "0 / (0 + 10⁻¹²) = 0", with the 10⁻¹² green like the formula's.

### 2. [P2] accuracy: "roughly thirty times" said over a bar labelled ×38
- When: 59.8-64.3 s, beat `q1-row` (element-061.jpeg to element-070.jpeg).
- What: The middle bar lands with "×38" (VECTOR.ratio.perRow = 38) on "roughly thirty times slower". The loop's ×120 is said "roughly a hundred", which is the same rounding direction, but 38 sits nearer forty than thirty.
- Why it matters: a number said that differs from the one shown, on the follow-up the scene exists for. A viewer hears one figure and reads another.
- Cause: `video/src/videos/mle-coding/script.ts:288` (the narration), against `results.json` `vector.ratio.perRow`.
- Fix: split `q1-row` at its sentence breaks and re-voice only the middle sentence as "Still roughly forty times slower, because the interpreter still runs once per row." (82 characters). Update `check.mjs`'s phrase and range (30 to 55) to match. No new number: 38 is the committed run.

### 3. [P2] answer: broadcasting never gives the shape rule, and the trap never shows the fix
- When: 151-187 s, beats `q4` and `q4-trap` (element-165.jpeg, element-186.jpeg).
- What: The screen says "The smaller array is stretched along its size-1 dimensions", but the example's smaller array is (2,), which has no size-1 dimension. The step missing is the rule: shapes line up from the right, and a missing leading dimension counts as 1, so (2,) is read as (1, 2). That same rule is what makes the trap a square. (1000,) is read as (1, 1000), so the column stretches across and the row stretches down. The scene asserts "broadcast to a thousand by a thousand" without it. "Check the shapes before you reduce" also stops short of the one-line fix, which check.mjs itself uses for the right MSE (`pred.ravel() - y`).
- Why it matters: "why did it become (1000, 1000)?" and "how do you fix it?" are the two follow-ups to this trap, and neither answer is on screen.
- Cause: `video/src/videos/mle-coding/BroadcastScene.tsx:103-106, 159-164` (no rule), `:182-187` (labels' shape), `:211-222` (the MSE lines name no code).
- Fix: screen only. In the right column of the top example, on "along its size-one dimensions", add "Shapes line up from the right; a missing dimension counts as 1", then "(2,) → (1, 2) → (3, 2)" when the row appears. Over the labels bar, on "a thousand by a thousand", add a red "read as (1, 1000)". Attribute the two MSEs to code: "2.29 `pred - y`: the (1000, 1000) square" and "0.24 `pred.ravel() - y`: each row against its own label".

### 4. [P2] answer: log-softmax "computed directly" never says how
- When: 324.5-331.3 s, beat `q7-log` (element-325.jpeg, element-330.jpeg).
- What: The green line reads "Log-softmax: −900, computed directly". Neither the screen nor the narration shows the computation, log pᵢ = (zᵢ − max) − log Σⱼ e^(zⱼ − max), which here is −900 − log(1 + e⁻⁹⁰⁰) = −900.
- Why it matters: "how does log-softmax avoid the −inf?" is the follow-up to the sentence just spoken. The answer is the same subtract-the-max trick the question is about, applied inside the log, and it is one line.
- Cause: `video/src/videos/mle-coding/SoftmaxScene.tsx:147-152`.
- Fix: screen only. Under the log-softmax line, on "computes minus nine hundred directly", add the formula in the math face, and the instance with its numbers (from SOFTMAX.z2 and logSoftmax). Move "A loss should take the raw scores" down to make room.

### 5. [P2] answer: reservoir's "one over j" is asserted, and the chain's factors are never linked to it
- When: 407.2-421.8 s, beat `q10-why` (element-414.jpeg, element-421.jpeg).
- What: The screen shows "Each later item j knocks it out: 1 / j" and then the product k/i × i/(i+1) × … × (n−1)/n. Why 1/j is not given: j gets in with k/j and then picks that slot with 1/k. Nor is the link to the chain given: the item survives j with 1 − 1/j = (j−1)/j, which is what the factors are.
- Why it matters: the beat opens "The follow-up is why that's uniform", so this derivation is the answer, and both steps are what the interviewer asks next.
- Cause: `video/src/videos/mle-coding/ReservoirScene.tsx:197-222`.
- Fix: screen only. Under "knocks it out: 1 / j", add a soft continuation line "it gets in with k / j, then picks that slot with 1 / k". Then, on "Multiply it through", add "So item i survives it: (j − 1) / j" above the chain. Move the chain down to make room.

### 6. [P2] answer: metrics from scratch never shows accuracy, or a mask
- When: 487.1-504.2 s, beat `r-metrics` (element-493.jpeg, element-503.jpeg).
- What: The narration answers accuracy, precision and recall. The screen gives only "precision TP / (TP + FP), recall TP / (TP + FN)" and "each count a mask, summed: no loop". Accuracy is never written, and neither is a mask, although the page's own lines are `(y_pred == y_true).mean()` and `TP = ((y_pred == 1) & (y_true == 1)).sum()`.
- Why it matters: the question says "from scratch", and the code is the answer. A third of what was asked is missing.
- Cause: `video/src/videos/mle-coding/RapidScene.tsx:252-257`.
- Fix: screen only. Add "accuracy `(y_pred == y_true).mean()`" above the precision line, and set the mask line as "each count a mask, summed: `TP = ((y_pred == 1) & (y_true == 1)).sum()`". Move the empty case down a row.

### 7. [P2] confusion: argmax along axis 0 turns three correct row answers red
- When: 479.5-487.1 s, beat `r-argmax` (element-484.jpeg, element-486.jpeg).
- What: On "axis one", each row's largest cell is outlined green. On "axis zero", every column's largest cell turns red. In this matrix those are 0.7, 0.6 and 0.5, which are also three of the four row answers. The finished frame shows three red cells and one green, as if only the last row decoded correctly.
- Why it matters: red means the wrong answer, and it lands on three right ones. The trap is the axis, not the cells.
- Cause: `video/src/videos/mle-coding/RapidScene.tsx:167`, where the axis-0 tone overrides the axis-1 tone.
- Fix: leave the cells green from axis 1. Show axis 0 as what it reduces over: a red dashed outline down each column, with the existing red ↓ answers under them.

### 8. [P2] confusion: "for every single user" stays, faded red, beside the corrected list
- When: 112.2-115.0 s, beat `q2-guard` (element-113.jpeg, element-114.jpeg).
- What: The red note dims to 40% rather than leaving. It now sits on row 1 of the re-ranked, green list ("1 0.99 … for every single user"), above "With the guard, it scores 0".
- Why it matters: content from the broken state left behind reads as a claim about the fixed one.
- Cause: `video/src/videos/mle-coding/CosineScene.tsx:221` (`dim={zeroAt + 4}`).
- Fix: `out={zeroAt}` so it leaves as the empty row does.

### 9. [P3] answer: the heap is not said to be a min-heap
- When: 144.0-147.1 s, beat `q3-time` (element-145.jpeg, element-147.jpeg).
- What: "keep a heap of size k" and a three-node heap labelled "k slots". The standard follow-up is which kind of heap, and why: a min-heap, so the smallest of the k kept is at the root and is the one a better score replaces.
- Why it matters: "max-heap" is the usual wrong answer, and the picture does not settle it.
- Cause: `video/src/videos/mle-coding/TopkScene.tsx:236-238`.
- Fix: screen only. Label the heap "min-heap of k", with a second line, "smallest on top", beside the root.

### 10. [P3] answer: KD-tree and ball tree offered for 64-dimensional rows
- When: 519.5-528.0 s, beat `r-knn` (element-526.jpeg).
- What: The scene's own example is "One query against 100,000 rows of 64", and the badges offer "KD-tree · ball tree · HNSW" as the index. Tree indexes pay off in a few dimensions and degrade toward brute force as dimensions grow. For embeddings the practical answer is the approximate index.
- Why it matters: "would a KD-tree help here?" is the natural press, and the frame suggests yes.
- Cause: `video/src/videos/mle-coding/RapidScene.tsx:329-337`.
- Fix: screen only. Under the two tree badges, "low dimensions"; under HNSW, "embeddings", each inked with its badge.

### 11. [P3] confusion: two rows keep their own label under "every row, another row's label"
- When: 374.5-387.2 s, beat `q9` (element-385.jpeg).
- What: The "shuffled apart" picture moves six of the eight labels. The first and last rows keep their own, joined by solid black lines, under the red caption "Shuffled apart: every row, another row's label".
- Why it matters: the picture contradicts its caption and the narration.
- Cause: `video/src/videos/mle-coding/ShuffleScene.tsx:39`. The apart permutation's seed (23) leaves two fixed points relative to the together one.
- Fix: choose a seed whose apart order moves every label (a derangement relative to `together`). The picture is a drawing; nothing measured changes.

### 12. [P3] accuracy: "five to fifteen" is the middle 90%, not the range
- When: 437.6-442.9 s, beat `q10-alt` (element-439.jpeg, element-442.jpeg).
- What: "gives anywhere from five to fifteen, not ten" and "5 to 15 lines, not 10". `coinSizes` is the 5th to 95th percentile. The runs ranged from 0 to 24, and 12.6% landed on exactly 10.
- Why it matters: small, but "anywhere" states a bound the data does not have.
- Cause: `video/src/videos/mle-coding/ReservoirScene.tsx:250-253`.
- Fix: screen only, no re-voice: "5 to 15 lines in 90% of runs, not 10".

### 13. [P3] code: the hook's listing normalizes with no guard, and nothing ties it to "where they break"
- When: 9.5-14.2 s, beat `hook` (element-012.jpeg, element-023.jpeg).
- What: The first line, `E /= np.linalg.norm(E, axis=1, keepdims=True)`, divides by a norm that is zero for an all-zero row. That is exactly the bug question 2 calls "the one people forget". The hook highlights "break" in red, but nothing on the listing says where.
- Why it matters: the video's own opening code has the bug it later warns about. A careful viewer sees the inconsistency, and a quick one copies the line.
- Cause: `video/src/videos/mle-coding/HookScene.tsx:169-172`.
- Fix: on "where they break", lay the red band (MARK_BAD) behind that line of the listing, so the break is pointed at and question 2 pays it off.
