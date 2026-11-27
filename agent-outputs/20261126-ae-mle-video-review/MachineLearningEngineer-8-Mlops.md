# MachineLearningEngineer-8-Mlops (631.8 s, 10:32)

## Verdict
- No wrong claim and no wrong number. Every figure on screen matches `results.json` and the narration: 96.1% to 97.8% over 20 seeds; 77% against 75% overall and 79% against 46% on the group; PSI 0.91 with accuracy 80% to 84%; every PSI under 0.02 with accuracy 80% to 61%; 0.01 and 1.4; 46% false alarms at 100 values and 0 of 2,000 at 1,000; 0.03 closed against 0.25 open, drawn as 50 dots of 20 that add up. The answers follow the two pages closely and go one step further where an interviewer presses: a lucky seed against a one-point gain, a slice floor on the gate, harmless data drift against silent concept drift, PSI's noise and its closed edges. Nothing here needs new words.
- The real defects are figures that keep something the narration has moved past, or that leave out the half that explains them. In the rollout, the shadow caption "no user exposed" stays in full green through the canary and the rollback (33 s), while 1 to 5% of real users reach the new model. The drift definitions show blue and grey dots with no key. The concept-drift panel draws only the true boundary turning, never the model's boundary that stayed, so the reason accuracy falls is never drawn.
- Polish: blue/green shows the new environment serving for about 2 s and ends rolled back, as if that were the outcome. Question 12's shadow panel says "champion's" and "challenger's" 20 s before the narration defines them, while it says "the current model's". PSI's dependence on smoothing, which the page names beside bins and sample size, is the one part of the PSI answer the video leaves out: an empty bucket makes the log infinite.
- Layout is clean: nothing under 20 px, no clipping, every scene held finished 1.6 s or more before its cut, every gap between beats 0.55 s or more. Pacing is comfortable at 2.1 to 3.2 words/s. The three beats over 3 (`q4-floor`, `q6-first`, `q9-example`) are short and land on a figure already drawn.

## Findings

### 1. [P2] confusion: "no user exposed" stays on screen through the canary and the rollback
- When: 448.3-481.8 s, beats `q11-canary` and `q11-rollback` (element-457.jpeg, element-480.jpeg).
- What: The shadow's caption "Compare outputs, latency, errors / under real load, no user exposed" inks in on `q11-shadow`, with "no user exposed" in green. At "Then a canary", the Log box and "never returned" dim, and the new model's output arrow now runs to "Returned to users" with the branch labelled "1–5% of traffic". The caption stays at full strength, its green clause included, until the scene cuts 33 s later.
- Why it matters: green means the right answer, and on screen it sits beside a canary that sends real users to the new model. Exposure is the one thing that separates the two stages.
- Cause: `video/src/videos/mle-mlops/RolloutScene.tsx:168-173` (the two caption `Line`s carry no `dim` or `out`, unlike the Log at `:162-165`).
- Fix: take the caption off at `canaryAt` (`out={canaryAt}` on both lines), so the shadow's claim leaves with the shadow. The gauges and the canary branch carry the new stage.

### 2. [P2] confusion: the drift scatters have no key, and the concept panel never draws the model's boundary
- When: 253.7-271.1 s, beat `q7-defs` (element-270.jpeg).
- What: Each panel scatters 40 points in blue and grey, and the data panel adds a third, paler grey for where the points were. Nothing says which color is which. In the concept panel, one dashed line turns while the dots recolor, captioned "the points stay, / the boundary turns". It is the true rule turning. The model's own boundary, which stays where it was and is the reason accuracy falls, disappears with the old rule.
- Why it matters: the panel is the definition of concept drift, and a viewer can read a turning boundary as the model adapting. The 80% to 61% drop 30 s later needs the picture of an old boundary now cutting through the new labels.
- Cause: `video/src/videos/mle-mlops/DriftScene.tsx:43-82` (`Scatter` draws only the current rule; the colors are the labels under it) and `:210-221` (the notes).
- Fix: screen only. In the concept panel, keep the old boundary as a faint dashed line once the turn starts. Caption the right side "the points stay," / "the true boundary turns," / "the model's (faint) stays". Under each panel's notes, add a key in the panel's own type: a blue dot "label 1", a grey dot "label 0", and in the data panel a pale dot "before".

### 3. [P3] confusion: blue/green shows the new model serving for 2 s, then ends rolled back
- When: 566.6-584.3 s, beat `r-bluegreen` (element-583.jpeg).
- What: Traffic flips to "Green (new) serving" on "traffic flips in one switch" (573.0 s). On "flips back if anything breaks" (575.1 s), it flips back to blue. Its remaining 9 s, and the scene's finished state, read "Blue (current) serving / Green (new) new model": the new model is not deployed.
- Why it matters: the narration's flip back is conditional, but the figure makes it the outcome. The deployed state, the point of the switch, is a result shown for about two seconds.
- Cause: `video/src/videos/mle-mlops/RapidScene.tsx:146-158` (`toGreen` goes back to 0 at `backAt + 6`).
- Fix: leave traffic on green. On "flips back if anything breaks", draw the way back as a dashed blue arrow from the switch to blue, and read the note "One switch, and back if anything breaks".

### 4. [P3] explanation: the shadow and A/B panels say "champion" and "challenger" before the video defines them
- When: 488.2-510.7 s, beats `q12` and `q12-ab` (element-498.jpeg).
- What: The shadow panel reads "users only see the champion's" and "the challenger's, to a log". The A/B panel reads "half the users: champion" and "half: challenger". The narration says "the current model's predictions" and defines champion and challenger only at `q12-champ` (510.7 s).
- Why it matters: two new terms arrive on screen 20 s before their definition, and the screen disagrees with the words being spoken.
- Cause: `video/src/videos/mle-mlops/TestScene.tsx:139,144,184,189`.
- Fix: screen only, in the narration's words: "users only see the current model's", "the new model's, to a log", "half the users: current model", "half: new model". `q12-champ` then introduces the names over its own boxes.

### 5. [P3] explanation: PSI's empty bucket (smoothing) is the one dependency the video leaves out
- When: 339.8-370.0 s, beats `q9-how` to `q9-conv` (element-369.jpeg).
- What: The page says PSI "depends on bin boundaries, sample size, smoothing", and its `compute_psi` adds an `eps` to every count. The video shows the formula with `ln(c / t)` and covers bin boundaries (open edges) and sample size (noise). It never says that a bucket the window leaves empty sends the log to minus infinity.
- Why it matters: "what if a bucket is empty?" is the usual next question about the formula on screen.
- Cause: `video/src/videos/mle-mlops/PsiScene.tsx:174-229` (phase A and B carry no note).
- Fix: screen only. Under the buckets' caption, from "the log of their ratio" until the phase ends (about 18 s), add one line in the soft ink: "An empty bucket takes a tiny ε, or its log is infinite".
