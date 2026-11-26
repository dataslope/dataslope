# MachineLearningEngineer-4-Statistics (10:42)

## Verdict
- The statistics hold up. Every number on screen matches `results.json`, the confidence interval and the p-value are defined the textbook way, and the misreadings are ruled out. The one-decision arc (91.0% against 90.5% on the same 2,000 examples) is a strong spine.
- The worst defect is the video making a classic p-value misreading itself. The unpaired test's p = 0.62 is called "Nothing there", aloud and on screen. That is the "absence of evidence" reading which question nine warns against 70 s later ("finds nothing, hasn't shown the models are equal").
- Three figures contradict or misstate what they show:
  - The standard error equation reads "0.29 / √2,000 = 0.64 points".
  - The maximum likelihood chart keeps its "4 clicks in 5 views" heading and its "Maximum likelihood" tag on the 80% peak after the narration moves to 3 in 3 peaking at 100%.
  - In the stratified sampling panel, the rare class's sampled dots turn the same purple as the unsampled ones, so the panel never shows the rare class making it into the sample.
- Two answers stop one step short. The hook's "Ship it?" never gets a verdict. The log-likelihood is justified only by underflow, never by the log keeping the same maximizer.
- Pacing is comfortable (2.2 to 3.0 words/s, 1.6 s scene holds). One near-empty page lasts 4.3 s (bootstrap follow-up), and a few unnarrated lines flash for about a second.

## Findings

### 1. [P1] accuracy: a non-significant p-value is read as "nothing there"
- When: 305.5-306.4 s spoken, beat `q8-models`; on screen 305.4-328.5 s (element-306.jpeg, element-327.jpeg)
- What: The narrator says "and p is point six two. Nothing there." and the page writes "p = 0.62: nothing there" under the unpaired null. That line stays beside the paired test's "p = 0.03 < α: reject the null" until the scene ends.
- Why it matters: A large p-value is no evidence of a difference. It is not evidence of no difference, and that is exactly what an interviewer probes. The video says so itself at 382 s ("a test that small, which finds nothing, hasn't shown the models are equal"), and the paired test then finds the gap. A viewer repeating "p = 0.62, so nothing there" gives the wrong answer.
- Cause: `video/src/videos/mle-statistics/script.ts:417` ("Nothing there."); `PermScene.tsx:204` (": nothing there").
- Fix: Drop the sentence from the narration. Split it off and recut, so the beat ends "p is point six two." and the next beat's "But they answered…" carries the contrast at no cost. Change the screen text to "p = 0.62: no evidence of a gap".

### 2. [P2] accuracy: the standard error equation is wrong as written
- When: 49-66 s, beats `q1-se`, `q1-n` (element-052.jpeg)
- What: "SE = σ / √n = 0.29 / √2,000 = 0.64 points". The quotient 0.29 / √2,000 is 0.0064. The jump to "0.64 points" is a silent unit change from a proportion to percentage points, set as an equality.
- Why it matters: A viewer who checks the arithmetic gets 0.0064 and either distrusts the figure or learns that SE comes out in different units from σ.
- Cause: `SeScene.tsx:183-187`
- Fix: Show the step: "= 0.29 / √2,000 = 0.0064, or 0.64 points" (`SE.se.toFixed(4)`).

### 3. [P2] confusion: the likelihood chart contradicts the small-sample point
- When: 476-492 s, beat `q11-small` (element-490.jpeg)
- What: The heading still reads "Likelihood of 4 clicks in 5 views" when the red 3-in-3 curve is added under it. The yellow "Maximum likelihood" tag and its dashed line stay on the green curve's 80% peak, while the narration says the likelihood of what was seen (3 in 3) peaks at 100%. The green curve is the prior-smoothed one, not the maximum likelihood.
- Why it matters: The chart labels the prior-adjusted estimate "Maximum likelihood", which is the opposite of the point being made. A viewer can come away thinking the MLE for 3 in 3 is 80%.
- Cause: `MleScene.tsx:83-93` (the heading, tag and dashed line have no exit or change at `q11-small`).
- Fix: On "The catch is small samples", cross-fade the heading to "Likelihood by click rate". Fade the "Maximum likelihood" tag and dashed line on "Three clicks in three views", and put a red "MLE: 100%" tag at the red curve's end on "a hundred percent". The two lines under the chart already name both curves.

### 4. [P2] answer: "Ship it?" is never answered
- When: asked 0-10 s (`hook`); the decision lands at 307-327 s (`q8-paired`) without a verdict
- What: The video opens on "Ship it?" and says the first nine questions run on that decision. The paired test ends "at five percent it rejects the null", and question nine moves on to errors and power. Nobody says what the evidence means for the decision. The next mention of the models is "Whether users notice is an online test", 40 s later.
- Why it matters: The interviewer's own question at the end of this chain is "so, do you ship?" The pieces are all here: one model's SE (0.64) is larger than the gap, yet the paired test rejects, and an online test is still needed. But the answer is left for the viewer to assemble.
- Cause: `script.ts:420-424`; no closing beat before `q9`.
- Fix: Add one short beat after `q8-paired`, on the finished page: "So, ship it? Offline, it passes. Users get the final say." (about 60 characters). Its last clause sets up `q9-online`'s "Whether users notice is an online test". Avoid "the gap is real", the misreading the script header deliberately steers around.

### 5. [P2] answer: the log-likelihood is justified only by underflow
- When: 447.9-463.2 s, beat `q11-log` (element-461.jpeg)
- What: "You maximize the log of the likelihood, because the product underflows." The page says the same. Nothing says why maximizing the log gives the same answer.
- Why it matters: "Doesn't taking the log change the estimate?" is the follow-up an interviewer asks. The answer is that the log is increasing, so the peak does not move, and it turns the product into a sum.
- Cause: `MleScene.tsx:112-130`
- Fix: Add a soft note under the log line, visible for the rest of the scene (about 30 s): "The log is increasing, so the peak doesn't move". No narration needed.

### 6. [P2] confusion: the stratified panel loses the rare class from the sample, and "sampled" is green
- When: 582.7-613 s, beat `r-sample` (element-594.jpeg)
- What: In "Stratified", the two sampled dots of the rare class turn purple on "a rare class", the same purple as its unsampled dots. So the band shows four purple dots and no sampled ones, which contradicts "so each one shows up, like a rare class in every test set". Across all four panels, sampled units are drawn green, and green means the right answer in this series.
- Why it matters: The stratified panel's one point (the rare class is guaranteed a place in the sample) is the one thing it fails to show. Green for "picked" spends the series' answer color on data.
- Cause: `RapidScene.tsx:229` and `:267` (a picked dot with its own color is drawn in that color, and every other pick in `OK` green); `:246` (green cluster outlines).
- Fix: Draw picked units in blue (data) in every panel, unpicked ones grey, and the rare stratum's band purple-tinted with grey unpicked and blue picked dots. Then the rare band visibly holds two picks. Outline the picked clusters in blue.

### 7. [P2] spacing: a near-empty page for 4.3 s at the bootstrap follow-up
- When: 204.8-209.1 s, beat `q5-unit` (element-207.jpeg)
- What: On "resample the unit" the whole bootstrap figure fades. The heading "2,000 test rows from 200 users" appears at once, before it is said, over an otherwise blank page. The user grid waits for "two hundred users" (209.1 s).
- Why it matters: The page sits nearly empty while the narration states the follow-up's rule. The bootstrap result ("95% interval: 101 to 120 ms") is cleared to make room for nothing.
- Cause: `BootScene.tsx:76` (`out = unitAt - 6`), `:280` (heading on `unitAt`), `:287` (grid on `usersAt`).
- Fix: Keep the bootstrap figure until "If two thousand test rows" (207.2 s). Bring the heading in on "two thousand test rows" and start the user grid on "test rows", so the blank stretch drops to about half a second.

### 8. [P3] accuracy: "No formula" overstates it for the median and p95
- When: 102.2-107.2 s, beat `q2-limit` (element-106.jpeg)
- What: The chip row reads "No formula: median, p95 latency". Sample quantiles do have an asymptotic standard error, but it needs the unknown density at the quantile. The page's own wording is "the analytic SE is hard or unknown". The narration's "no such formula" (no σ/√n) is fine.
- Cause: `CltScene.tsx:194`
- Fix: "No simple formula".

### 9. [P3] answer: correlation without causation gives only the confounder
- When: 613.7-630.4 s, beat `r-cause` (element-639.jpeg)
- What: The page's answer names three reasons two variables correlate: one causes the other, a confounder drives both, or chance. The video gives only the confounder.
- Cause: `script.ts:542`; `RapidScene.tsx:466-468`.
- Fix: Insert one sentence after "…ice cream sales and drownings.": "It can also run backwards, or be chance." (about 40 characters). Add a soft line "Or reversed, or chance" under "Correlation isn't causation".

### 10. [P3] pacing: unnarrated lines that leave before they can be read, and new questions after short gaps
- When: "Both read it backwards" is visible 241.4-242.4 s (`q6-not`, element-242.jpeg); "Its spread needs another method" is visible about 105.4-107.2 s (`q2-limit`)
- What: The first is three words inked in for under a second, then cleared for question seven. The second is five words visible for under 2 s. In both places the next question starts 0.6 to 0.7 s after the last word.
- Cause: `TestScene.tsx:177` (`notEnd - 10`); `script.ts:341`, `:395` (`pauseAfter` 0.6 and 0.7).
- Fix: Cue "Both read it backwards" on "your result is a fluke" plus 24 frames. Raise `pauseAfter` to 1.2 on `q2-limit` and `q6-not`, which also gives a breath before each new question.

### 11. [P3] visual: the θ̂ hats sit after the subscript
- When: 186-204 s, beats `q5`, `q5-p95` (element-202.jpeg)
- What: "→ θ̂₁" renders with the combining circumflex floating to the right of θ, over the subscript.
- Cause: `BootScene.tsx:198` (`<I>θ̂</I>` followed by `<sub>`; the combining mark lands wrongly in the serif italic).
- Fix: Draw the hat as its own element over θ, or write "→ stat 1" in Inter.

### 12. [P3] visual: hyphens for minus signs on the permutation axis
- When: 295-299 s, beat `q8` (element-297.jpeg)
- What: The ticks read "- 10" and "- 5": a hyphen set a digit wide by the tabular feature. The axes in `q8-models` use "−" correctly.
- Cause: `PermScene.tsx:163`
- Fix: `v < 0 ? \`−${-v}\``.

### 13. [P3] spacing: "5,000 per arm: 20%" grazes the 20% gridline
- When: 375.1-391 s, beat `q9-null` (element-384.jpeg)
- What: The dotted 20% gridline runs about 3 px above the red label's cap height.
- Cause: `PowerScene.tsx:262` (`y={at5[1] - h(4)}`).
- Fix: Move the label down about 12 px (`at5[1] + h(8)`).

### 14. [P3] spacing: "A point" runs into the column rule
- When: 163-177 s, beat `q4-slice` (element-176.jpeg)
- What: The red "A point" label ends about 7 px from the vertical hairline at x ≈ 1062.
- Cause: `CiScene.tsx:248`, `:252`
- Fix: Move the rule right by 30 px. The right column starts at 1100, so it still clears the text by 24 px.

### 15. [P3] visual: a stray 2 px speck on the confidence interval page
- When: 122-157 s, beats `q4`, `q4-sim` (element-152.jpeg, at about 1700, 520)
- What: The slice panel's dashed truth line is drawn at zero length from the start of the scene, which leaves a grey dot in the empty right column.
- Cause: `CiScene.tsx:280`
- Fix: Render that line only once `ease(frame, acrossAt, 12) > 0`.

### 16. [P3] visual: the unpaired null histogram is cut off at ±2 points
- When: 300-328 s, beats `q8-models`, `q8-paired` (element-327.jpeg)
- What: The pooled-shuffle null has a standard deviation of about 0.92 points, and it is binned only over ±2 points. Its edge bars stop abruptly at about a tenth of the peak height, so the distribution looks sliced off.
- Cause: `check.mjs:193` (`range=(-0.02, 0.02)`); `PermScene.tsx:195`.
- Fix: Bin over ±3 points in `check.mjs` and draw both test panels on the same ±3 axis.

### 17. [P3] explanation: Bayes' formula is never tied to the fraud example
- When: 496-535 s, beats `q12` to `q12-shift` (element-533.jpeg)
- What: The page shows "P(A | B) = P(B | A) P(A) / P(B)" in the abstract, then counts dots. It never says which term the 99%, the 1 in 1,000 and the 9% are.
- Cause: `BayesScene.tsx:100-117` (the formula line).
- Fix: Write the formula in the example's terms: "P(fraud | flag) = P(flag | fraud) P(fraud) / P(flag)".
