# Stats-5-Sampling (0-279 s: SamplingBias, SurvivorshipBias, both part seams, and the SamplingDistributions hook up to the 279.1 s cut)

## Verdict
- The quality is high. Every number spoken in part 1 and part 2 matches the screen and the sources in `script.ts`/`measure.py`: 69.97, 69.64, 80.52, 51/49, 79.04-80.95, 9.69, 57/43, 55.7, 62.5, 46 of 48, 27/19 %, 39/5 %, 515, 7.65. The build goes from one sample, to 100 samples, to the size sweep, to the Digest, and it argues one point.
- The biggest content defect is in the closing "Two ways to miss" figure. A bracket drawn across the 95 % range is labelled with a standard deviation, under the heading "Variance". Later, "bias +0.01" is listed under that same "Variance" heading. This is in a unit that later teaches SD and SE as separate quantities.
- The biggest merge defect is at the two part seams (149.7-157.4 s and 255.0-263.7 s). In merged mode the spoken bridge plays over a screen that only dims, because the `NextLine` is suppressed and nothing replaces it. At the second seam, the bridge and the next part's first sentence ask the same question 1.9 s apart.
- Pacing is mostly comfortable: 2.2-3.0 w/s, with 1.3-1.6 s holds before cuts. There are two hot spots. The first is the variance and bias definitions at 136-146 s (gaps of 0.20-0.45 s at 3.1-3.3 w/s). The second is Wald's "engines" beat at 184.5-190.9 s (3.43 w/s), which brings in a legend, two bar sets and eight percentages before the focus moves on.

## Findings

### 1. [P1] accuracy: "Variance" bracket spans the 95 % range but is labelled with the SD, and "bias" is listed under "Variance"
- When: 137.5-157 s, beats `sampling-bias/variance` through `sampling-bias/next` (frames element-0277.jpeg, element-0291.jpeg, element-0299.jpeg)
- What: The bracket over the pile runs from about 78.6 to 81.3 on the axis, about 2.6 points wide. Its label reads "Variance / spread 0.68". After the squeeze the label reads "spread 0.13" over a bracket about 0.5 points wide. After the move, the block reads "Variance / spread 0.16 / bias +0.01", so bias appears as a sub-item of variance.
- Why it matters: A careful viewer will check the bracket against the axis and see a number about 4 times smaller. "Variance" is also the name of a different statistic (0.68² = 0.46). This undercuts the SD/SE distinction that this video's part 5 teaches.
- Cause: `video/src/videos/sampling-bias/CloseScene.tsx:186` draws the bracket from `s.lo` to `s.hi`, which are the 2.5 % and 97.5 % quantiles (`sampling-bias/measure.py:101-102`). Lines `:197-203` label it with `shownSpread`, which is `means.std()` (`measure.py:98`). Line `:201` puts the "bias" line inside the same block.
- Fix: Draw the bracket at center ± 1·spread so it matches the number. Alternatively, keep the 95 % bracket and label it "95 % of averages: 2.6 points wide". Retitle the block "Scatter" (or "Variance (scatter)") with "SD 0.68". Move "bias +0.01" into its own note next to the truth line, where "Bias +9.94" sat.

### 2. [P2] confusion: The spoken bridges at both part seams play over a fading screen with nothing new on it
- When: 149.7-157.4 s, beat `sampling-bias/next` (element-0302.jpeg to element-0314.jpeg), and 255.0-263.7 s, beat `survivorship-bias/next` (element-0512.jpeg to element-0526.jpeg)
- What: "And some data is biased before you ever sample it... because it only kept what survived" introduces a new idea. So does "Even a fair sample, drawn from everyone, won't hit the truth exactly". In both cases the previous scene fades to 38 % opacity piece by piece for 7-8 s, and nothing on screen refers to survival or fair samples. The standalone videos show "Next: the data that survived." and "Next: how far a fair sample can miss." here.
- Why it matters: The narrator introduces the next topic over a screen that is visibly ending, which is the "empty screen while the narrator talks" case at the exact point where a viewer needs to reorient.
- Cause: `video/src/videos/sampling-bias/CloseScene.tsx:133-137` and `video/src/videos/survivorship-bias/HabitScene.tsx:337-341` render nothing when `merged` is set. The dimming in `CloseScene.tsx:113,125,139` and `HabitScene.tsx:277,281,328` still runs. `video/src/videos/sampling/plan.ts:44` starts the next part only `HOLD` (1.4 s) after the bridge's last word.
- Fix: In merged mode, replace `NextLine` with a teaser line that has no "Next:" prefix, at the same cue and position (`CloseScene` x 1000 / y 278: "Some data only kept what survived."; `HabitScene` x 120 / y 850: "How far can a fair sample miss?"). Alternatively, give `planParts` a per-part overlap so the next part's cross-fade starts at the bridge beat's first word instead of 1.4 s after its last.

### 3. [P2] pacing: The same question is asked twice across the second seam
- When: 259.9-265.6 s, beat `survivorship-bias/next` ("So how far off can it be?", ends 261.8), then 1.9 s of silence, then `sampling-distributions/hook` ("How far can a fair sample miss?", 263.7) (element-0522.jpeg, element-0528.jpeg)
- What: The bridge and the next part's opening line are the same question in two wordings.
- Why it matters: It sounds like a stutter in the edit and costs about 4 s at the seam.
- Cause: `video/src/videos/survivorship-bias/script.ts:125-126` and `video/src/videos/sampling-distributions/script.ts:54`. Each part keeps its full narration in the merge (`video/src/videos/sampling/Video.tsx:43-58`).
- Fix: In the merged video, skip the audio and text of `survivorship-bias/next` and end part 2 on `ask`, with a 0.7 s pause plus HOLD. Part 3's hook asks the question itself. A merged-only `skip` list in `PARTS` that `planParts` honours would do this.

### 4. [P2] confusion: Counter reads "100 of 500 customers"
- When: 45.0-64.0 s, beats `sampling-bias/again` through `sampling-bias/name` (element-0094.jpeg, element-0126.jpeg)
- What: The top-right counter stacks "Samples drawn, each way" / "100" / "of 500 customers". Read top to bottom, the line under the number reads as a fraction ("47 of 500"), as if 47 out of 500 customers had been drawn.
- Why it matters: It invites the wrong model (one sample filling up) at the moment the video switches to repeated samples.
- Cause: `video/src/videos/sampling-bias/RepeatScene.tsx:115-117`.
- Fix: Change line 117 to "samples of {SAMPLE_N} customers" or "each of {SAMPLE_N} customers". Alternatively, put the label under the number as "samples drawn, each of 500".

### 5. [P2] pacing: Variance and bias are defined back to back with no breath, and the variance number is visible for about 2 s
- When: 136.0-146.5 s, beats `variance` (3.06 w/s, gap 0.20), `squeeze` (3.28 w/s, gap 0.45), `bias` (3.28 w/s, gap 0.45) (element-0274.jpeg, element-0280.jpeg, element-0290.jpeg)
- What: "spread 0.68" fades in at about 137.6 s. The squeeze morph starts at 139.4 s and the label flips to 0.13 at about 139.9 s. The bias arrow draws at 141.3 s. The unspoken note "where the averages center, right or wrong" (7 words) is on screen for about 2 s (144.5-146.5).
- Why it matters: These two definitions are the conceptual payoff of part 1, and the second starts before the first has settled.
- Cause: `video/src/videos/sampling-bias/script.ts:135-136` (pauseAfter 0.2 and 0.45). `CloseScene.tsx:74` starts the squeeze at `squeezeFrom - 2`. `CloseScene.tsx:241` removes the note at `methodFrom`.
- Fix: Set `variance` pauseAfter to 0.7 and `squeeze` pauseAfter to 0.9, and start the squeeze at `shrinksAt` instead of `squeezeFrom - 2`. Keep the "center" note until `movesAt`.

### 6. [P2] pacing: Wald's table builds two bar sets, a legend and eight percentages inside one 6.4 s beat
- When: 184.5-193.8 s, beats `survivorship-bias/engines` (3.43 w/s, gap 0.30) and `fuselage` (element-0370.jpeg, element-0376.jpeg, element-0382.jpeg)
- What: The legend appears at "two engines". The four area outlines grow, then their four % labels, then the four blue hole bars and their % labels (complete at about 189.5 s). The highlight moves to the fuselage at about 191.4 s. The engines comparison (27 % vs 19 %) is fully on screen and in focus for about 2 s.
- Why it matters: The 27-vs-19 gap is the evidence the rest of the scene rests on, and it goes past at the fastest speech rate in the half.
- Cause: `video/src/videos/survivorship-bias/script.ts:79-81` (pauseAfter 0.3). `WaldScene.tsx:150-151` grows all four rows of each set. `WaldScene.tsx:77-78` moves the focus at `fuselageAt - 6`.
- Fix: Raise `engines` pauseAfter to 0.8. Grow only the engines row's two bars on `engines`, and bring in the other three rows' bars on `fuselage` (or at `fewerAt + 20`).

### 7. [P3] confusion: Four different "how far off" numbers for the easy way
- When: 40 s "10.55 points too high" (element-0084.jpeg), 62 s "Bias +10.03" (element-0126.jpeg), 88 s "9.69 points high" (element-0184.jpeg), 142 s "Bias +9.94 points" (element-0291.jpeg)
- What: The narration says more data "leaves it right where it was", but the bias on screen drifts from 10.03 to 9.94 to 9.69. The first figure is one sample's miss, not a bias. Nothing says what +10.03 is (the mean of the 100 averages minus 69.97).
- Why it matters: A viewer comparing them sees bias shrinking with sample size, which is the opposite of the point. It actually shrinks because n = 20,000 is 10 % of the population, sampled without replacement.
- Cause: `RepeatScene.tsx:174-178`, `CloseScene.tsx:99,232-235`, `BiggerScene.tsx:210-213`, `SampleScene.tsx:336-340`.
- Fix: Round the bias labels to "about +10" in Repeat and Close, or label the first one "this sample: 10.55 too high" and the bias ones "average miss +10.0". Keep 9.69 at 20,000, which the narration calls "almost ten".

### 8. [P3] other: Figure numbering restarts twice in the merged video
- When: 132.9 s "Fig. 6" (element-0291.jpeg), 176.6 s "Fig. 1" (element-0359.jpeg), 216.3 s "Fig. 2", 264.5 s "Fig. 1" again (element-0555.jpeg)
- What: The numbering goes Fig. 1-6, then Fig. 1-2, then Fig. 1. The part-name kicker is the only signal that numbering has reset.
- Why it matters: "Fig. 1" appears three times in 4.5 minutes of one video.
- Cause: `survivorship-bias/WaldScene.tsx:111`, `survivorship-bias/FundsScene.tsx:94`, and `sampling-distributions/HookScene.tsx:105` hard-code `n`.
- Fix: Read `useMergedPart()` in `FigLabel` and prefix the part number in merged mode ("Fig. 2.1", "Fig. 3.1"), or offset `n` by the earlier parts' figure counts.

### 9. [P3] explanation: Wald's "39 %" arrives without saying how the missing hits become a probability, and the fuel row reads "15 % 15 % 15 %"
- When: 199.9-216 s, beats `estimate` and `holes` (element-0416.jpeg, element-0430.jpeg)
- What: A third column ("Wald's estimate: chance one hit downs it") is added next to two share columns. All three columns use %, and the shares add to 100 while the estimates do not. The fuel system row shows 15 %, 15 % and 15 %. Only 39 and 5 are spoken. The step from "engine hits are missing" to "39 in 100" is asserted with "In his numbers".
- Why it matters: Three columns of percentages per row invite reading the estimate as another share.
- Cause: `video/src/videos/survivorship-bias/WaldScene.tsx:199-201,236-239`.
- Fix: Write the estimate as "39 in 100" in its own boxed column, separated from the shares by a hairline. Add one clause to `estimate`, such as "the fewer of a part's hits come home, the deadlier it is". Set the unspoken fuel and "everything else" estimates in INK_SOFT so 39 and 5 stand out.

### 10. [P3] pacing: Part 2 opens on a headline fragment over a nearly empty page
- When: 157.4-162.0 s, beat `survivorship-bias/hook` (element-0316.jpeg, element-0320.jpeg)
- What: While the narrator says "In 1943, the statistician Abraham Wald took on a wartime question", the page shows only the kicker and "Which parts of a bomber", with no question mark. The question is spoken at about 163 s and the bomber illustration arrives at about 161.7 s.
- Why it matters: The first 4 s of the part are a sentence fragment on an empty page.
- Cause: `video/src/videos/survivorship-bias/HookScene.tsx:62` inks the first line at `yearAt`.
- Fix: Ink line 1 at `n.word("hook", "Which parts")` and bring the illustration in at `yearAt`. Alternatively, ink both headline lines together at "Which parts".

### 11. [P3] confusion: FundsScene: the headline arrives before the closing, the survivors' line is unlabelled for 7 s, and red means both "closed" and "still open"
- When: 216.3-242 s (element-0434.jpeg, element-0456.jpeg, element-0484.jpeg)
- What: "Close the funds that lost," inks at 216 s, while the narration is still introducing 5,000 funds averaging 6 %. "Close" is spoken at 223.7 s. From 226.5 s a solid red line slides right with the counter, with no label until "Average" at 233.6 s. The legend makes blue mean "still open", the cutoff and "515 gone" are red, and then "The 4,485 still open 7.65 %" is also red.
- Why it matters: Each of these is small, but together they make the reading order fight the narration.
- Cause: `video/src/videos/survivorship-bias/FundsScene.tsx:82` (`start - 10`), `:179-181` (line drawn from the first closed bin), `:196-197`, and `:102`.
- Fix: Ink the first headline half at `closeAt - 4`. Delay the survivors' line until `fifteenAt`, or give it a small "survivors' average" tag from the start. Label it "average of those left" so red keeps meaning "the biased number".

### 12. [P3] spacing: BiggerScene: "1 customer in 10" floats on the 85 gridline, and the axis and dot count go unstated
- When: 85.5-92.4 s, beat `steady` (element-0184.jpeg)
- What: "1 customer in 10" sits on the top (85) gridline, about 120 px above the 20,000 column it describes, and the dotted rule runs up to its first character. The same fact is repeated as "with 10 % of all customers asked". The x axis is log-spaced (50, 200, 1,000, 5,000, 20,000 evenly spaced) and is not marked as such. The title says 400 samples per size, but 60 dots are drawn.
- Why it matters: The label reads as a gridline annotation, and the information is said twice.
- Cause: `video/src/videos/sampling-bias/BiggerScene.tsx:202-206` (`y={ly(85.2)}`), `:214-216`, `:19`, `:23` (`SHOWN = 60`) against `:83`.
- Fix: Drop the "1 customer in 10" note and keep the line under "9.69 points high" (or move the note to `ly(LARGEST.convenience.hi) - 30`). Add "(log scale)" to the axis title. Change the title to "Averages of 400 samples at each size (60 shown), each way".

### 13. [P3] spacing: SampleScene: the zoom-fan rules cut through the sample dots, and raw dots take the estimate colour
- When: 19-41 s, beats `random` through `high` (element-0071.jpeg)
- What: The two dashed verticals of the zoom fan run from the Fig. 1 axis straight down through the 500-dot strip. The easy sample's customers above 75 are tinted the easy way's red, although `parts.tsx` reserves colour for estimates and keeps raw data neutral.
- Why it matters: This adds clutter in the busiest band of the frame, and red stops meaning "the biased estimate".
- Cause: `video/src/videos/sampling-bias/SampleScene.tsx:360-361` (from `y(base) + 4` to below the strip) and `:389-390`.
- Fix: Start the fan's diagonals at `STRIP_Y + STRIP_H + 10` and drop the two verticals, or fade them in only after the dots have collapsed (`steps.random.c + 14`). Tint the happy customers with HIGHLIGHT yellow, which matches the "above 75" band, instead of EASY red.

### 14. [P3] confusion: Digest figure: Landon's 57 is said but never shown, and Gallup's sample size is missing
- When: 110.3-131.3 s, beats `call` through `lesson` (element-0228.jpeg, element-0263.jpeg)
- What: The narrator says "fifty-seven to forty-three" with Landon first, while the only number drawn is "Roosevelt 42.9 %". Gallup's row says only "far fewer, matched to voters", so the size contrast that the narration and the lesson rest on (2.4 million vs about 50,000) has one side missing. The figure title and the axis title repeat the same thing in two wordings ("...votes for him and Landon" / "...two-party vote").
- Why it matters: The viewer has to convert 57/43 in their head, and "far fewer" leaves the key comparison unquantified.
- Cause: `video/src/videos/sampling-bias/DigestScene.tsx:170-190` and `:116` against `:161`.
- Fix: Change the Digest sub to "2.4 million replies: Landon 57.1 %" and the Gallup sub to "about 50,000, matched to voters" (the source is in `script.ts:47`). Shorten the axis title to "Roosevelt's share".

### 15. [P3] confusion: SamplingDistributions hook says "they look alike" while the middle panel clearly does not
- When: 263.7-279.1 s, beats `sampling-distributions/hook` and `apart` (element-0542.jpeg, element-0555.jpeg)
- What: "=" signs appear between a smooth bell, a ragged 9-bin histogram of 40 values, and a bell on a $40-60 axis. The Fig. 1 label is indented to x 150, while the kicker, headline and panel titles sit at 118-120.
- Why it matters: The claim and the picture disagree. This reads as a point about axes, but the narration never says "on their own axes" until 334.9 s.
- Cause: `video/src/videos/sampling-distributions/HookScene.tsx:62-71` (the equals signs on "alike") and `:105` (`x={150}`).
- Fix: Add "...each on its own axis" to the hook line, or cue the "=" to the bell-shaped pair only. Set the FigLabel x to 120.
