# DataScientist-6-ExperimentDesign (8:13, 492.8 s)

## Verdict
- A solid video. Every number on screen and in the narration matches `results.json` and the page: 393 per arm, 98/99/94/88%, 3,843 and 14,752, 80% to 88% one-sided, -0.29 to +0.39, 4.9/12/26.5/34.8%, 2.1% and 262 vs 393, 8.09 to 3.52, 21.9%. The question cards match what is read. The bridge into Part 7 (uneven split, fading effect, ten metrics) matches how Part 7 opens.
- The answers hold up as definitions. Three of them stop one step before what an interviewer presses on. Question 3 shows orders inflating false positives without saying why. Question 9 never says the false-positive rate climbs with each look, and never names the remedy, so the SPRT arrives with no link to it. Question 10 leaves out the page's own caveat (simple hypotheses only) and overclaims what crossing the lower line means.
- Visual defects are few but real. The p-value line runs through the "800" and "2,000" labels on the peeking chart. A lone blue dot floats with no axes for about 5 s at the start of Question 9. The sample-size formula's `p̄` renders as stray bars on the parentheses. The opening's "how many users" chip is jammed against its border.
- Pacing is comfortable, mostly 2.3 to 2.9 words/s with no tight gaps. The only dense beat is `sprt-cost` (3.20 w/s, five numbers). Seven scene changes drop to a fully white page for about 1.2 s each, roughly 8.5 s in all. Two stretches leave most of the frame empty while the narration talks: the test plan (36-62 s) and the four sample-size inputs (192-210 s).

## Findings

### 1. [P2] answer: Question 9 never states why peeking fails or what to do instead, and the SPRT is not tied to it
- When: 300.4-339.0 s, beats `peek`, `peek-rate` (element-321.jpeg, element-338.jpeg)
- What: The narration shows one A/A run dipping under 0.05 and then reads four rates ("Checked once ... four point nine percent ... Every hundred visitors, thirty-five"). It never says these are false positives, never says that each look is another chance for noise to cross 0.05, and never says "fix n or use a sequential test", which is the page's whole answer. Question 10 then starts cold ("Question ten. What is a sequential probability ratio test?") with no line saying this is the test that makes looking legitimate. The plan's section 6 frames it exactly that way.
- Why it matters: the question is "why", and the viewer is left to infer both the mechanism and the remedy from a bar chart.
- Cause: `video/src/videos/ds-experiment-design/script.ts:164` (`peek-rate` ends on the last number). There is no bridge beat between `peek-rate` and `sprt` (`script.ts:166-172`).
- Fix: end `peek-rate` with "Every look is one more chance for noise to cross the line, so the false-positive rate climbs with the looks. Fix the sample size in advance, or use a test built for looking." Then open `sprt` with "One such test: Question ten." Or add a `sprt-in` beat with that sentence and move the `PeekScene` cut to it.

### 2. [P2] answer: Question 3 shows order-level analysis inflating false positives but never says why
- When: 110.3-131.1 s, beat `unit-orders` (element-130.jpeg, element-134.jpeg)
- What: "Treat each order as independent, and the test finds a significant difference twenty-one percent of the time. Analyze one average per user, and it's four percent." The reason is never given: one user's orders move together, so the order-level standard error is too small. Nor is the page's alternative (cluster-aware standard errors). `check.mjs` already measured the evidence (`results.json` `unitExample`: SE 0.511 per order vs 0.791 per user), but nothing reads or shows it.
- Why it matters: "why does it inflate?" is the follow-up every interviewer asks here, and the page's answer ("pseudoreplication, standard errors that are too small") is the bar.
- Cause: `video/src/videos/ds-experiment-design/script.ts:108`. `UnitScene.tsx:99-100` draws the two rates only. `data.ts` never exports `unitExample`.
- Fix: insert after "twenty-one percent of the time": "because one user's five orders move together, and counting them as independent makes the standard error a third too small." Add a small line under the red bar: "standard error 0.51 per order vs 0.79 per user". Close with "or keep the orders and use clustered standard errors."

### 3. [P2] answer: the SPRT answer overclaims the lower boundary, omits the page's caveat, and leaves its numbers unexplained
- When: 339.0-378.6 s, beats `sprt`, `sprt-cost` (element-360.jpeg, element-382.jpeg)
- What: "Cross the bottom, and there isn't [an effect]." Crossing the lower line only says the data favour no effect over the one designed for. A smaller real effect is still possible. The page's answer spends most of its length on this limit: classical SPRT covers two simple hypotheses, and product metrics need mixture-SPRT, group-sequential or always-valid methods. The video says none of it. The boundaries "3.47" and "-1.58" are shown with no source. They are ln(0.80/0.025) and ln(0.20/0.975). The narration says "likelihood ratio" while the axis is the log likelihood ratio. The 262-vs-393 comparison is only fair at equal power, and the 80.5% power (`results.json` `sprt.power`) is never said.
- Why it matters: an interviewer will ask "what if the true effect isn't the one you designed for?", and this answer invites a confident wrong reply.
- Cause: `video/src/videos/ds-experiment-design/script.ts:172` and `:177`. `SprtScene.tsx:100` and `:103` print the bare log values.
- Fix: in `sprt`, change the line to "Cross the bottom, and the data favour no effect over the one you designed for." In `sprt-cost`, after "three hundred ninety-three for the fixed test", add "at the same eighty percent power. It's exact only for two fixed hypotheses; for a live product metric, teams use a mixture SPRT or group-sequential boundaries." Relabel the boundaries `stop: an effect, log(0.80 / 0.025) = 3.47` and `stop: no effect, log(0.20 / 0.975) = -1.58`.

### 4. [P2] spacing: the p-value line runs through the "800" and "2,000" crossing labels
- When: 309-339 s, beats `peek`, `peek-rate` (element-338.jpeg)
- What: Each red number is placed directly above its ringed crossing, which is where the p-value path comes down steeply into it. The blue line cuts through "800" between the 8 and the 0s, and through the "2," of "2,000". These are the two numbers the narration points at.
- Why it matters: the labels the viewer is told to look at are the least legible text on the chart.
- Cause: `video/src/videos/ds-experiment-design/PeekScene.tsx:137` (`x={at(xs, c.v) - 40} y={at(ys, pOf(c.v)) - h(64)}`, straight above each crossing).
- Fix: drop the two floating labels (`PeekScene.tsx:136-139`) and put the counts in the red note at `:141`: "stop at 800 or 2,000: you've shipped noise". The ringed circles mark the points, and the x-axis already has a 2,000 tick. If the labels stay, move each one 70 px left of its circle at `at(ys, 0.05) - h(40)`, the open space left of the descent, and check that against the path.

### 5. [P2] confusion: a lone blue dot floats on an empty page for about 5 s before the peeking chart exists
- When: 300.1-305.3 s, beat `peek` (element-304.jpeg)
- What: Under the Question 9 headline, a single 12 px blue dot sits at the left of an otherwise empty frame, with no axes, while the question is read. The axes and path only start at "Here both arms are identical".
- Why it matters: it reads as a rendering glitch, and the eye goes to it during the question.
- Cause: `video/src/videos/ds-experiment-design/PeekScene.tsx:60-63` clamps `visitors` to 100 before the path starts, so `head` exists from the first frame. `:123` draws it unconditionally.
- Fix: at `PeekScene.tsx:123`, render the head only once the path has started: `{head && frame >= asked + 6 ? <circle .../> : null}`.

### 6. [P2] explanation: the sample-size formula renders `p̄` as stray bars on the parentheses, and none of its terms are defined
- When: 217-236 s, beat `size-n` (element-232.jpeg)
- What: The formula is set in mono as `n = (z_α/2 + z_β)² · 2p̄(1 − p̄) / MDE²`. The combining macron lands on the next glyph, so the screen shows "2p(1 - p)" with a bar hooked onto each parenthesis and no bar on either p. The narration only says "The page's formula says three thousand eight hundred forty-three". It never says what p is (the average of the two rates, 11% here) or what the two z's are (1.96 and 0.84). The underscores are typed literally.
- Why it matters: "how do you calculate it" is the question, and the one formula on screen is both garbled and unexplained. It is also where the baseline rate enters (through p(1 − p)), which the video asserts ("Only the baseline comes from data") but never connects.
- Cause: `video/src/videos/ds-experiment-design/SizeScene.tsx:159` (combining U+0304 in a mono string). `script.ts:136`.
- Fix: write `2p(1 − p)` with no macron, and add a key line under it at `y(540)`: "p = average of the two rates (11%) · z_α/2 = 1.96 · z_β = 0.84". In `script.ts:136`, after "per arm" add: "That's one point nine six plus point eight four, squared, times twice the variance at the average rate, over the lift squared."

### 7. [P3] other: seven scene changes drop to a completely white page for about 1.2 s
- When: 30.2-31.5, 90.9-92.2, 135.6-136.9, 190.8-192.0, 234.7-236.0, 299.0-300.2, 382.8-384.0 s (element-031, 091, 136, 191, 235, 299, 383 are all 100% white)
- What: Each scene fades itself out 4 frames after its bridge beat ends. The next scene only cuts in 8 frames before its question. The 1.6 s pause between them is spent on an empty page, about 8.5 s across the video.
- Why it matters: a recurring blank flash reads as a dropped frame, not a breath.
- Cause: `clearAt = n.beat("<bridge>").to - 6` at `HookScene.tsx:61`, `DesignScene.tsx:51`, `UnitScene.tsx:94`, `ErrorsScene.tsx:55`, `SizeScene.tsx:50`, `SidesScene.tsx:97`, `SprtScene.tsx:48`. `Video.tsx:17` sets `LEAD = 8`.
- Fix: in each, cue the fade from the next scene's first beat, for example `clearAt = n.beat("design").from - 18`, so it finishes at the cut and `Scene`'s 6-frame crossfade hands over directly.

### 8. [P3] confusion: after "double the users", the chart shows 98% power while the labels beside it still say 20% and 80%
- When: 181-192 s, beat `power` into `size-in` (element-188.jpeg)
- What: The alternative curve slides right, now labelled "twice the users", and its orange β sliver nearly vanishes. "β = 20%: abandons features that work" and "power = 1 − β = 80%" stay at full ink beside it. The horizontal axis is also never named (it is the test statistic; only "threshold, z = 1.96" hints at it), so "0.2 SD" has nowhere to land on the chart.
- Why it matters: the picture and its legend disagree for the last 10 s of the scene.
- Cause: `video/src/videos/ds-experiment-design/ErrorsScene.tsx:150-158` (no dim on `doubleAt`). `:104-136` (no axis title).
- Fix: multiply the opacity of the β and power lines by `1 - 0.6 * ease(frame, doubleAt + 2, 12)`. Add a green "98%" label inside the shifted power area. Add an x-axis note under the baseline: "where the test statistic lands".

### 9. [P3] spacing: most of the frame is empty for 18-26 s while the narration explains something drawable
- When: 36-62 s, beat `design-plan` (element-061.jpeg). 192-210 s, beat `size` (element-208.jpeg)
- What: In `design-plan` the test-plan card fills the left 45%, and the right half stays blank for 26 s; it is only used once Question 2 starts. In `size`, four chips sit in a band at y 320-370. The lower 60% of the frame is white for 18 s while the four inputs are explained, and the chart only arrives at "Ten percent convert today".
- Why it matters: long holds on a mostly empty page, in the two scenes that most need to look like a worked answer.
- Cause: `video/src/videos/ds-experiment-design/DesignScene.tsx:13-18` (`CARD_W = 800`, right column reserved for Q2). `SizeScene.tsx:139` (`Axes at={tenAt - 4}`).
- Fix: in `DesignScene`, draw the plan card at 1.2x scale (`transformOrigin: "left top"`) during `design-plan` and ease it to 1.0 on `q2At`. In `SizeScene`, cue the empty axes at `n.word("size", "From four inputs")`, so the "users per arm vs MDE" frame is on screen while the inputs are named.

### 10. [P3] spacing: "how many users" fills its chip edge to edge, and the last chip sits on the launch tick
- When: 11-31 s, beats `hook`, `plan` (element-027.jpeg)
- What: At 21px, "how many users" is as wide as its 176 px box, so the text touches both borders. "who gets split" has about 4 px of padding. The fifth chip's right edge lands exactly on `LAUNCH_X`, so the launch tick pokes into its corner.
- Why it matters: the first figure of the video looks cramped.
- Cause: `video/src/videos/ds-experiment-design/HookScene.tsx:14-18` (`LAUNCH_X = 1040`, `CHIP_W = 176`, `CHIP_GAP = 10`; 120 + 4 × 186 + 176 = 1040).
- Fix: `CHIP_W = 188`, `CHIP_GAP = 8` (the row ends at 120 + 972 = 1092, leaving 9 px either side of "how many users"), `LAUNCH_X = 1110`, `DOTS_X = 1170`. The last dot ends near 1475, still clear of the heron at 1500.

### 11. [P3] accuracy: "5 of 6 heavy users in B ... a coin does that about 1 time in 5"
- When: 456-463 s, beat `r-strata` (element-462.jpeg)
- What: The two lines read as "5 of 6 in B happens 21.9% of the time". 21.9% (14/64) is the chance of five or six landing in either arm, which is what the narration correctly says. Five or six in B specifically is 7/64, about 11%.
- Why it matters: a small but checkable misstatement on screen.
- Cause: `video/src/videos/ds-experiment-design/RapidScene.tsx:131`.
- Fix: "a coin puts 5 or 6 in one arm about 1 time in 5 (21.9%)".

### 12. [P3] explanation: the non-inferiority answer never names the interval or the decision rule, and points at -1 rather than at the margin
- When: 276-295 s, beat `noninf` (element-296.jpeg)
- What: "the interval for the difference runs from minus point two nine ..." The interval is a 95% interval (`check.mjs:144`, 1.96 SE), but that is never said, and neither is the rule: non-inferior when the interval's lower end is above minus the margin. The page states the null ("H0: worse by more than delta"). For 6,000 per arm, the red verdict is "contains 0, but reaches past −1". What decides the case is that it crosses the -0.5 margin, which the line does not say.
- Why it matters: the follow-up "what's the null and how do you decide?" is not answered, and "past -1" points at the wrong reference line.
- Cause: `video/src/videos/ds-experiment-design/script.ts:150`, `SidesScene.tsx:107`.
- Fix: in the script, use "the ninety-five percent interval ... Its lower end clears the margin, so the new version is not worse." Then: "At six thousand, it also contains zero, but its lower end crosses the margin, so non-inferiority can't be claimed." Change the verdict to "contains 0, but crosses the margin".

### 13. [P3] confusion: CUPED's y-axis keeps saying "the same user during it" after the dots become Y_adj, and X, Y and θ are never tied to the picture
- When: 399-419 s, beats `cuped`, `cuped-var` (element-418.jpeg)
- What: Once the cloud is flattened, the plotted values are Y_adj, but the axis title is unchanged. The formula `Y_adj = Y - θ(X - X̄)` uses X and Y, which neither axis is named as. "slope θ = 0.705" disappears when the adjustment runs. Why the variance falls by this much (1 − r², with r = 0.75: 1 − 0.565 = 0.435, `results.json` `cuped.share`) is not said.
- Why it matters: "how does it reduce variance?" is answered by the bars, not by the mechanism an interviewer expects (θ is the regression slope; variance shrinks by the squared correlation).
- Cause: `video/src/videos/ds-experiment-design/CupedScene.tsx:103-104`, `:126`. `script.ts:186`.
- Fix: titles "X: each user before the test" and "Y: the same user during it", switching to "Y_adj: during it, adjusted" when `adjust > 0.5`. Keep the slope label dimmed rather than removed. In `cuped-var`, add "The variance shrinks by the squared correlation between before and during."

### 14. [P3] explanation: the metric candidates are not tied to the criterion each one fails
- When: 74-88 s, beat `metric` (element-089.jpeg)
- What: Three numbered criteria sit at the top (1 tied to the goal, 2 sensitive, 3 measurable in the window). The struck candidates' reasons, "easy to inflate" and "arrives after the test ends", never say which number they fail. "Easy to inflate" is not one of the three words on screen, so the viewer has to work out that it means not tied to the goal.
- Why it matters: the scene sets up a three-test checklist and then does not use it.
- Cause: `video/src/videos/ds-experiment-design/DesignScene.tsx:73-74`.
- Fix: verdicts "fails 1: easy to inflate" and "fails 3: arrives after the test ends". Pulse the matching chip on each `verdictAt`.

### 15. [P3] pacing: `sprt-cost` carries five numbers at 3.20 words/s
- When: 362.3-378.6 s, beat `sprt-cost` (element-366.jpeg, element-377.jpeg)
- What: "two thousand times each way", "two percent", "two and a half", "two hundred sixty-two", "three hundred ninety-three", in one 16 s beat. It is the densest content beat in the video.
- Why it matters: the false-positive check and the sample-size saving are two separate results heard as one run.
- Cause: `video/src/videos/ds-experiment-design/script.ts:177`.
- Fix: split after "the two and a half it was built for" into `sprt-cost` and `sprt-pairs`, with `pauseAfter: 0.6` on the first. That also makes room for the "at the same eighty percent power" clause in finding 3.

### 16. [P3] answer: two rapid-fire answers stop before the point
- When: 423.8-463.3 s, beats `r-sensitive`, `r-strata` (element-444.jpeg, element-462.jpeg)
- What: `r-sensitive` ends on "capping it at the ninety-ninth percentile cuts its variance by forty-eight percent" and never says what that buys: a more sensitive, more robust metric, at the cost of a little bias. `r-strata` shows only chance imbalance. It leaves out the page's other half: stratifying also cuts variance when strata differ, and matters most in small tests.
- Why it matters: each is the one line an interviewer wants after the definition.
- Cause: `video/src/videos/ds-experiment-design/script.ts:204`, `:208`.
- Fix: append to `r-sensitive` "so the capped metric is both steadier and quicker to detect a change." Append to `r-strata` "It also lowers variance when the groups differ, which matters most in small tests."
