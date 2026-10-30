# DataAnalyst-7-AbTesting (9:06, 546.1 s)

## Verdict
- The video is accurate. Every number spoken or shown matches `results.json` and the page: x3.1 (664/351/214), 9.3%, 14,500 lost, 51.6%, 579 and 702 of 6,000, z 3.64 and p 0.0003, p 0.65/0.046/≈0 at d = 0.2, 2.05 points from 0.95 to 3.15 (SE 0.56), 4 of 100 miss, 3,841 and 14,751 (3.84x), α 5% and β 20%, 0.19 at 8,000, 78.0 against 82.6, 68 against 51.8, 0.4 against 0.6, 14% against 4%, 26%/52%, 31%/2%. All fifteen question cards match what is read. The bridges from Part 6 and into Part 8 line up.
- As definitions the answers hold up. Four of them stop one step before the interviewer's follow-up. Q7 gives the p-value but never the 0.05 decision, and 0.05 then turns up in Q8 without an introduction. Q8 gives no test for "big enough to matter". Q13 shows one A/A run but never says that every look is another chance for a false positive. Q15 names the trap but not the fix (sum, then divide).
- Two figures fight their own narration. In the p-value figure the whole null curve is grey and the red tails at z = 3.64 are too thin to see, so the "area" the definition is about never appears. In the Type I/II figure a red left tail is shaded that the narration ("declaring a winner") and the one "declare a winner" line never explain. The power scene also has six labels at 18px and two notes that run together on one row.
- Pacing is comfortable: 1.58 to 3.47 words/s, and no gap between beats is under 0.55 s. Only `pvalue-not` (3.47) and `peek-fix` (3.16) are dense. The peeking line is drawn 2.5 to 3 s ahead of the words that name its crossings. The two scenes cut on a bridge beat (`funnel-in`, `peek-in`) each open on an all-white page for about 1 s. Q10 leaves the lower half of the frame empty for 23 s.

## Findings

### 1. [P2] confusion: the p-value figure never shows the area the definition is about, and paints p in the trap red
- When: 212.8-228.3 s, beats `pvalue`, `pvalue-not` (element-213.jpeg, element-227.jpeg)
- What: The null curve is filled grey all the way under (`fill={INK_SOFT} opacity 0.12`). The two red tails past ±3.64 are drawn, but at that z each holds 0.014% of the area, so in element-227 there is no red anywhere under the curve. The viewer sees one grey hill, a teal line off its right shoulder, "ours: z = 3.64" and "p = 0.0003" in ACCENT red. The narration never says "z", never says "standard errors" and never says that p is an area. The page's own point is "The p-value is the shaded area under the null, not the height of the curve at the observation."
- Why it matters: the one picture of a p-value in the series shades the wrong area and leaves the right one invisible. The red p also reads as "bad" under the series' colors.
- Cause: `video/src/videos/da-ab-testing/AbtestScene.tsx:255` (grey fill under the whole curve), `:265-266` (tails past ±3.64, invisible), `:273-275` (z in teal, p in `ACCENT_INK`).
- Fix: delete the grey fill at `:255`. At `nothingAt + 10`, shade both tails past ±1.96 in `MARK` (yellow) with a 22px label under the right one: "5% of do-nothing results land out here". Then draw ours at 3.64 with the label "ours: 3.64 standard errors out" and, under it in INK, "p = 0.0003: the area past ±3.64, too thin to see". In `pvalue` (`script.ts:163`), after "a gap that big", add "three point six four standard errors".

### 2. [P2] answer: Question 7 gives the definition but never the decision, so 0.05 arrives unexplained in Question 8
- When: 196.0-223.9 s, beats `pvalue`, `pvalue-not`; then 249.6 s, beat `signif-n` (element-227.jpeg, element-260.jpeg)
- What: Q7 ends on "a gap that big would turn up about three times in ten thousand", followed by what p is not. It never says what to do with 0.0003. The page's answer: "A small p-value (commonly < 0.05) means the data would be surprising under 'no effect', so you have evidence of a real difference." The cutoff is first heard in Q8 ("it slips under point oh five") and drawn there as an unlabelled red dashed line. Alpha is defined only in Q11, 130 s later.
- Why it matters: "so is it significant, and what do you tell the PM?" is the follow-up to every p-value answer.
- Cause: `video/src/videos/da-ab-testing/script.ts:163` (beat `pvalue` stops at the number).
- Fix: append to `pvalue`: "That's far below the usual cutoff of point oh five, so we treat the lift as real." Add a note under the definition at `AbtestScene.tsx:248` (`tableTop + h(260)`): "under 0.05, the usual cutoff: a real difference", in INK, cued to "usual cutoff".

### 3. [P2] answer: Question 13 shows one A/A run but never says why peeking inflates false positives, and "sequential test" is never explained
- When: 383.3-412.3 s, beats `peek`, `peek-run`, `peek-fix` (element-402.jpeg, element-410.jpeg)
- What: The narration says the p-value dips under 0.05 at 800 and from 2,000 to 4,600, that "a team watching would have stopped and shipped", and that the planned reading is 0.19. It never gives the reason (each look is one more chance for noise to cross 0.05) or the consequence (the false-positive rate climbs well past 5%). The page's answer is exactly that sentence. "A sequential test, which is built to be watched" is said at 3.16 words/s with no hint of how it is built.
- Why it matters: the question is "why is it a problem?", and an interviewer's next question is "how does a sequential test fix it?". The video leaves both to inference.
- Cause: `video/src/videos/da-ab-testing/script.ts:235` (`peek-run` ends on the number), `:240` (`peek-fix`). `PeekScene.tsx:146-150` (the fix note).
- Fix: end `peek-run` with "Every look is another chance for noise to cross the line, so a team that checks this often ships a false winner far more than five percent of the time." Make `peek-fix`: "Fix the sample size in advance and look once, or use a sequential test, which sets a stricter line for every look." with `pauseAfter: 0.8`. Change the note at `PeekScene.tsx:148-149` to "fix the sample size first, or use a sequential test: a stricter line per look".

### 4. [P2] answer: Question 8 gives no test for "big enough to matter", never sizes the effect, and colors the significant dots green
- When: 228.6-260.8 s, beats `signif`, `signif-n` (element-255.jpeg, element-260.jpeg)
- What: "Hold one small effect fixed, and grow the sample" never says how big the effect is (d = 0.2, a fifth of a standard deviation, `results.json` `py.practical`). On screen it is only "the same small effect at every size". Nothing says how to decide whether an effect is practically significant. The page's example is "a 0.1% lift can be statistically significant yet worthless", and the decision is the effect against the smallest lift worth shipping, which Q10 calls the MDE. Every dot under 0.05 is filled green, and "p 0.046" and "p ≈ 0" are labelled in green ink. Green is the series' "right answer", here used on the result the question warns against reading as a win.
- Why it matters: "so how would you decide if it's practically significant?" is the obvious follow-up, and the green dots say that significance is the goal.
- Cause: `video/src/videos/da-ab-testing/script.ts:182` (`signif-n`); `SignifScene.tsx:137` (`fill={p < 0.05 ? OK : A_COLOR}`), `:74-75` (callouts in `OK_INK`), `:159` (the effect unnamed).
- Fix: in `signif-n`, after "The effect never changed.", insert "It's a fifth of a standard deviation. Whether that matters is a business call: compare the effect and its range with the smallest lift worth shipping." Change the note at `SignifScene.tsx:159` to "the same small effect at every size: d = 0.2". Fill every dot `A_COLOR` and set the two callouts in INK, so green is left only for "report the effect and its range".

### 5. [P2] answer: Question 15 names the ratio trap but never gives the fix, and its key note is up for 2.4 s
- When: 442.3-466.2 s, beat `ratio` (element-460.jpeg, element-465.jpeg)
- What: The narration says to watch numerator and denominator together, and that an average of averages (68) isn't the per-customer figure (52). It never says what to compute instead. The page's answer: "aggregate the numerator and denominator separately, then divide". The mechanism is on screen only, in a 13-word note ("the Islands' 131 counts as much as North's 52, for 40 customers") cued at "forty" (463.3 s), and the scene cuts at 465.9 s. That gives the viewer 2.4 s to read a sentence the narration does not say.
- Why it matters: "so how do you compute it?" is the follow-up, and the reason the averages differ goes past too fast to read.
- Cause: `video/src/videos/da-ab-testing/script.ts:264` (beat `ratio`); `SimpsonScene.tsx:167-171` (the unread note, cued to `fortyAt + 4`).
- Fix: end `ratio` with "...because the Islands' average of a hundred thirty-one counts as much as North's fifty-two, for only forty customers. So add up the numerator and the denominator first, and divide once." Add a note under the Islands line, cued to "add up": "sum, then divide: 610,590 / 11,790 = 51.8" (`results.json` `sql.ratio.weighted`), and recolor 51.8 `OK_INK` (`SimpsonScene.tsx:165`, now `BLUE_INK`).

### 6. [P2] confusion: the Type I/II figure shades a left tail that the narration and the "declare a winner" line never explain
- When: 338.5-377.8 s, beats `errors`, `power-def` (element-348.jpeg, element-377.jpeg)
- What: α is two-sided (`alphaNow = 2 * (1 - Phi(crit))`), so both tails of the "no effect" curve are red. Only the right one has a dashed line ("declare a winner past here") and a label ("α 5.0%", next to a tail that holds 2.5%). The far-left red wedge has no line, no label and no mention: the narration's Type I error is "declaring a winner when there's no effect". When the line moves at 372-376 s, the left wedge grows to 7% with a hard vertical edge and nothing marking it.
- Why it matters: a viewer counting areas sees 5% printed beside half of it and a red region that the definition just given does not cover.
- Cause: `video/src/videos/da-ab-testing/PowerScene.tsx:192` (left tail drawn), `:196` (one line only), `:203-205` (one-sided label), `:219-221` (α label on the right tail).
- Fix: draw a matching dashed line at `-crit` and label it "or a loser past here" (20px). Change the α label to "α 5.0%: 2.5% in each tail". In `errors` (`script.ts:216`), change "declaring a winner when there's no effect" to "declaring a difference, a winner or a loser, when there's no effect".

### 7. [P2] spacing: "only more data shrinks both" runs into "declare a winner past here" on one row, and the moving line cuts through the β label
- When: 375.2-378.0 s, beat `power-def` (element-375.jpeg, element-377.jpeg)
- What: The note "only more data shrinks both" (y ≈ 459) shares a baseline with the curve label "declare a winner past here" (y ≈ 455). At 375 s the line has moved 42 px left and the two are 17 px apart, so they read as one sentence. In the finished frame the gap is 48 px. Separately, the α and β labels stay at the resting line position while the line wobbles. At 375 s the dashed line runs through "β 9.3%".
- Why it matters: the closing takeaway of Q12 is jammed against a chart label, and a number is struck through by a line.
- Cause: `video/src/videos/da-ab-testing/PowerScene.tsx:234` (note at `y(TOP + 92)`), `:203` (label at `base - height - 24`), `:219` and `:222` (labels placed at `ERRORS.crit`, not `crit`).
- Fix: fold the last note into the one above it. At `:231-236`, render "moving the line trades one error for the other<span cued to onlyAt>; only more data shrinks both</span>" at `y(TOP + 48)`. At 25px it ends near x = 1020, clear of the power panel at 1170. Place the α and β labels from `at(zs, crit)` rather than `at(zs, ERRORS.crit)`.

### 8. [P2] spacing: eight labels are set at 18px, under the 19px floor
- When: 186-197 s (balance chart) and 339-378 s (errors and power) (element-195.jpeg, element-377.jpeg)
- What: In the power scene: "declare a winner past here", "80%", the x ticks "100 / 1,000 / 10,000", "users per arm (log scale)", "power" and the three curve labels "→ 15% / → 12% / → 11%". In the balance chart: the "0.1" threshold label and the "0 / 0.5 / 1" ticks.
- Why it matters: house rule (nothing under 19px at 1080p). These are the axis and threshold labels the narration leans on ("the line", "eighty percent").
- Cause: `video/src/videos/da-ab-testing/PowerScene.tsx:203, 242, 246, 250, 253` (`fontSize: 18`), `:264` (`label(18, ...)`); `AbtestScene.tsx:183, 193` (`fontSize: 18`).
- Fix: set all eight to 20, the size of the scene's other chart labels.

### 9. [P3] pacing: the peeking line is drawn about 3 s ahead of the words that name its crossings, after 12 s of empty axes
- When: 379.5-406.1 s, beats `peek-in`, `peek`, `peek-run` (element-389.jpeg, element-396.jpeg, element-398.jpeg)
- What: The axes and the 0.05 line are up from "once the test is running" (379.5 s). The p-value line starts only at "Check the p-value" (392.1 s), so the frame shows empty axes for 12.5 s. The line then runs at a constant rate to the planned 8,000. It reaches 800 at 393.2 s, three seconds before "at eight hundred" (396.3 s), and 2,000 at 394.8 s, 2.6 s before "again from two thousand". When the narrator says "eight hundred", the viewer is already looking at the long red run past 2,000.
- Why it matters: the eye is on the second crossing while the ear is on the first.
- Cause: `video/src/videos/da-ab-testing/PeekScene.tsx:50` (`drawTo` linear from `checkAt` to `plannedAt`).
- Fix: make `drawTo` piecewise-linear through (0, `identicalAt`), (800, `eightHundredAt`), (2,000, `againAt + 6`), (4,600, the word "four thousand six hundred") and (8,000, `plannedAt`). The line then starts about 3 s earlier, which shortens the empty axes, and meets each crossing as it is named.

### 10. [P3] answer: five more answers stop one sentence short of the follow-up
- When: Q4 114.4-128.1 s (`funnel-steps`); Q10 304.3-321.3 s (`power-mde`); Q14 435.2-441.5 s (`simpson-why`); Q17 487.0-504.7 s (`r-novelty`); Q18 505.2-518.6 s (`r-cohort`)
- What and fix, one line each:
  - Q4 asks "how do you measure conversion at each step?", and its answer never says how. The definition only arrives as Q5, while a "step conversion" column appears at 125 s with no explanation. In `script.ts:129` change "Per-step conversion shows where the rest drop off" to "Per-step conversion, each step's users over the step before, shows where the rest drop off."
  - Q10 never says how to choose the MDE. After "the smallest lift you want to be able to catch" (`script.ts:206`) add ": the smallest one worth the cost of shipping".
  - Q14 never says which treatment wins. After "the hard cases" (`script.ts:259`) add "So A is the better treatment."
  - Q17 drops the page's check. After "long enough to see it settle" (`script.ts:281`) add ", and check the lift holds for users who never saw the old version".
  - Q18 never says what a cohort reveals. After "fifty-two for May" (`script.ts:285`) add ". A single blended retention number hides this, because it moves whenever acquisition does."
- Why it matters: each is the line an interviewer asks for next, and each is in the page's own answer.

### 11. [P3] explanation: notation and sources used without a word of explanation
- When: 186-196 s (the 0.1 line), 274.8-292.8 s (`ci-margin`), 368-378 s (power curves), 205.9 s (`pvalue`) (element-195.jpeg, element-296.jpeg, element-377.jpeg, element-227.jpeg)
- What: Q6: "only one edges over the line, barely". The line is a standardized gap of 0.1, the usual imbalance flag, and it is never named. Q9: "plus or minus one point nine six standard errors", with "2.05 ± 1.96 × 0.56" on screen. Standard error is never defined, here or in Q10 ("Bigger samples shrink the standard error"). Q12: the three power curves are labelled "→ 15%", "→ 12%", "→ 11%" with no "from 10%", and the y axis has no 0% or 100%. Q7: "In the course's test" means nothing to a viewer who arrives from the interview page.
- Why it matters: each is a term or number an interviewer can ask about.
- Cause: `script.ts:158`, `:192`, `:163`; `AbtestScene.tsx:183-185`, `:235`; `SignifScene.tsx:211-215`; `PowerScene.tsx:245-265`.
- Fix: `abtest-balance`: "...and all ten of these traits differ by more than a tenth of a standard deviation, the usual flag." `ci-margin`: after "standard errors" add ", the standard error being how much the lift would wobble from run to run". Relabel the curves "10% → 15%" and so on, and add "0%" and "100%" ticks at `:245`. Say "In one real test" for "In the course's test", and change the label at `AbtestScene.tsx:235` to "a real test, 6,000 per arm".

### 12. [P3] confusion: "a wide interval: we need more data" sits under an interval the stakeholder line has just called decisive
- When: 290.2-297.8 s, beat `ci-margin` (element-296.jpeg)
- What: The note appears directly under "estimate ± 1.96 standard errors: 2.05 ± 1.96 × 0.56", beside the drawn 0.95-to-3.15 band. It reads as a verdict on this interval, which is narrow enough to clear zero and to support "we're confident the true lift is between one and three".
- Why it matters: the viewer can come away thinking this result needs more data.
- Cause: `video/src/videos/da-ab-testing/SignifScene.tsx:216-218`; `script.ts:192`.
- Fix: narration: "And if the range were wide, say from minus one to five, we'd need more data before deciding." Note: "if it were wide (−1 to +5): we'd need more data". Optionally draw that band in `INK_SOFT` under the real one, cued to "wide".

### 13. [P3] spacing: gridlines run through two labels
- When: 50.3-61.4 s, beat `metric-drift` (element-060.jpeg); 525-546 s, beats `r-retention`, `next` (element-545.jpeg)
- What: The third legend entry "Signed in and acted" sits on the dotted 600 gridline. The label "week 2: 51% and 51%" sits on the dotted 100% gridline.
- Why it matters: a line through a label, the defect the brief lists as recurring.
- Cause: `video/src/videos/da-ab-testing/MetricScene.tsx:203` (`y={y(CHART.top) - h(10) + i * h(32)}`); `RapidScene.tsx:309` (`labelY={c.y(PLOT.top) - c.h(4)}`).
- Fix: drop the 600 tick (`yTicks={[0, 200, 400]}` at `MetricScene.tsx:196`). The lines carry their own end values (664, 351, 214), so the gridline adds nothing, and the legend has no room to move up without hitting the "active users" title. Set the week-2 label at `labelY={at(y, 88)}`, in the empty band between the 100% and 75% gridlines to the right of the dashed line, where both curves have already fallen below 75%.

### 14. [P3] other: three colors against the series' meanings
- When: 460-466 s (`ratio`), 329-338 s (`power-n`), 0-32 s (`hook`) (element-465.jpeg, element-336.jpeg, element-031.jpeg)
- What: In Q15 the right figure, 51.8 per customer, is blue (data) while the trap, 68, is red. It should be green. In Q10 the "10% → 11%" bar is teal, which is B's arm color everywhere else in the video, although it is a sample size and not an arm. In the hook the fox turns toward a green door, which pre-judges B as the winner. `HookScene.tsx:13` makes B teal precisely "so neither arm reads as right or wrong".
- Why it matters: one meaning per color is the series' rule, and the hook's art contradicts the code's own intent.
- Cause: `video/src/videos/da-ab-testing/SimpsonScene.tsx:165`; `PowerScene.tsx:72` (`color: B_COLOR`) and `:170`; `illustrations.json` (prompt "one door painted blue and the other green, its head turned toward the green door").
- Fix: use `OK_INK` at `SimpsonScene.tsx:165`. Use `ds("blue", 800)` and `BLUE_INK` for the second bar. Re-prompt the spot as "one door painted blue and the other teal, the fox sitting between them looking at the viewer".

### 15. [P3] other: the two scenes cut on a bridge beat open on an all-white page, and Q12 is cut 0.6 s after its last word
- When: 104.2-105.3 s (`funnel-in`), 377.8-378.8 s (`peek-in`) (element-105.jpeg, element-378.jpeg are white)
- What: Every other scene keeps its bridge line and cuts to the next question. `FunnelScene` and `PeekScene` start on their bridge beats instead, then show nothing until a word cue ("where users drop out" at 105.3 s, "once the test is running" at 378.8 s). The previous scene is already gone, so the narrator says "Next," and "Then," over a blank page. The peek cut also lands 0.6 s after "Only more data shrinks both" (377.2 s), because the power scene has no bridge beat of its own to hold through.
- Why it matters: a blank flash reads as a dropped frame, and Q12's takeaway is snatched away.
- Cause: `video/src/videos/da-ab-testing/Video.tsx:37-38` (cuts at `funnel-in`, `peek-in`); `FunnelScene.tsx:42` (`namesAt`); `PeekScene.tsx:78` (`runningAt`); `script.ts:222` (`power-def` `pauseAfter: 0.7`).
- Fix: cue the funnel stage names from `from + 4` and the peek axes from `from + 4`, so each scene has content at its first frame. Raise `power-def`'s `pauseAfter` to 1.4.

### 16. [P3] spacing: Q10 leaves the lower 55% of the frame empty for 23 s
- When: 299.0-322.0 s, beats `power`, `power-mde` (element-305.jpeg, element-317.jpeg)
- What: Three lines of text build at the top while the narration explains why bigger samples detect smaller effects. The bars arrive only at "rising to twelve" (322 s). The scene already holds the picture that shows this claim: power against users for three lifts, drawn only at 368 s for Q12. Q1 (36-50 s, the right 60% empty while the checklist builds) and the peek axes (finding 9) are milder cases of the same thing.
- Why it matters: the claim that motivates Q10 is asserted over empty space, and the figure that supports it appears 50 s later.
- Cause: `video/src/videos/da-ab-testing/PowerScene.tsx:94` (`powerPanelP` cued at `risesAt`), `:17` (`BARS.max: 1000`, which runs into the panel's x range).
- Fix: cue `powerPanelP` at `shrinkAt`, so the panel is drawn for Q10 and stays through Q12. Set `BARS.max` to 620 so the 14,751 bar and its label end near x = 1100, clear of the panel's left edge at 1170, where the "→ 15%" curve starts at bar height.

### 17. [P3] confusion: in Q5 the step conversion column comes before the LAG column it is computed from
- When: 151-162 s, beat `lag` (element-158.jpeg)
- What: Columns read users | step conversion | LAG(users), but the narration and the highlighted SQL compute step conversion as users / LAG(users). The input is to the right of its result.
- Why it matters: "LAG puts the previous stage's count on the same row, so each step is one division" is easiest to see as users, LAG, users ÷ LAG, read left to right.
- Cause: `video/src/videos/da-ab-testing/FunnelScene.tsx:20-21` (`STEP_X = 1150`, `SIDE_X = 1390`), `:234` (LAG takes the lost column's slot).
- Fix: at `q5At`, slide the step conversion column to x = 1630 and draw LAG(users) at `STEP_X`. Widen the row band at `:111` to reach `1630 + COL_W / 2`. Each row then reads users, LAG(users), step conversion.

### 18. [P3] spacing: the balance chart's legend sits 44 px from the bottom edge and its second line is cryptic
- When: 191.5-196.0 s, beat `abtest-balance` (element-195.jpeg)
- What: "● a coin: 1, Age at 0.102" ends at y ≈ 1036 on a 1080 frame. "1" means "one trait over the line", which the line does not say.
- Why it matters: tight to the frame edge, and the legend needs decoding.
- Cause: `video/src/videos/da-ab-testing/AbtestScene.tsx:29` (`pitch: 46`), `:227-230`.
- Fix: set `BAL.pitch` to 40, which lifts both legend lines by about 60 px. Word it "● a coin: only Age over, at 0.102".

### 19. [P3] pacing: the two misconceptions in `pvalue-not` are the densest beat in the video
- When: 218.8-223.9 s, beat `pvalue-not` (3.47 w/s) (element-220.jpeg, element-223.jpeg)
- What: "It isn't the chance that there's no effect, and it says nothing about how big the effect is" is the most-asked p-value trap. It goes by in 4.8 s, and its two strikes land 2.3 s apart.
- Why it matters: this is the half of the answer an interviewer listens for.
- Cause: `video/src/videos/da-ab-testing/script.ts:167-169`.
- Fix: split it into `pvalue-not` ("It isn't the chance that there's no effect.", `pauseAfter: 0.5`) and `pvalue-size` ("And it says nothing about how big the effect is."). Re-cue `sizeAt` (`AbtestScene.tsx:72`) to the new beat.
