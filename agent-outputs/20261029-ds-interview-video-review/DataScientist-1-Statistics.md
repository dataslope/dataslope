# DataScientist-1-Statistics (10:33)

## Verdict
- A strong, accurate video. Every number shown or spoken matches `results.json` and the page: SE 0.71/0.70 and 0.36, skew 1.90/0.87/0.44, 94 of 100 intervals, p = 0.021, the t cutoffs, chi-square 11.88 with p = 0.0026, F = 37.9, d = 0.0094, 64%, P(B higher) = 0.975. I re-derived the chi-square, F and Bayes numbers by hand. The figures are large and clean, and they are cued to the words.
- The biggest problems:
  - The chi-square statistic is defined wrongly aloud ("the squared gaps sum to eleven point nine"), which contradicts the formula on screen.
  - The three z/t cutoff labels collide with each other's lines and render all black, so the numbers the narration reads cannot be told apart.
  - Correlation vs causation never says "confounder", and the orange dots it adds have no legend.
- Pacing is comfortable (2.2 to 2.9 w/s) with one exception: the two misreadings the hook promises to fix are delivered in the two fastest beats of the video (`ci-fixed` 3.20 w/s, `pvalue-not` 3.06 w/s).
- As interview answers they hold up. What is missing is the follow-up the page supplies and an interviewer presses on: degrees of freedom for chi-square, why ranks beat the t-test when there are outliers, biased but lower MSE, and the reverse effect-size case.
- Recurring polish issues:
  - Correct numbers are struck through.
  - Red is used for the data being explained.
  - TABULAR hyphens render as "p - value".
  - Two sets of labels are under 19px.

## Findings

### 1. [P1] accuracy: chi-square statistic spoken as "the squared gaps"
- When: 441-446 s, beat `chi` (element-443.jpeg, element-452.jpeg)
- What: The narration says "The squared gaps sum to eleven point nine." The squared gaps (O - E)^2 in this table sum to about 1,182. The 11.9 is the sum of each squared gap divided by its expected count, which is what the formula on screen says (chi^2 = Σ (O - E)^2 / E). What is said and what is shown disagree.
- Why it matters: "the sum of squared differences between observed and expected" is the half-right answer an interviewer corrects, and the narration teaches it.
- Cause: `video/src/videos/ds-statistics/script.ts:211` (beat text).
- Fix: Re-voice as "Each squared gap, divided by its expected count, adds up to eleven point nine; on two degrees of freedom, p is point oh oh two six." This also gives the degrees of freedom (`results.json` dof = 2; see finding 8).

### 2. [P1] spacing: z/t cutoff labels overlap the neighbouring lines and lose their colors
- When: 403-416 s, beat `zt` (element-415.jpeg)
- What:
  - Each of 1.96, 2.04 and 2.57 is written 10px to the right of its own dashed line. The 1.96 and 2.04 lines are only about 10px apart, so the orange 2.04 line runs through the "1" of "1.96", and the blue 2.57 line runs through the "4" of "2.04".
  - All three labels render black. The code asks for blue, black and orange, so the only way to tell which cutoff belongs to which curve is the stacking order.
- Why it matters: These three numbers are the worked part of the answer, and the narration reads all of them.
- Cause: `video/src/videos/ds-statistics/ZtScene.tsx:49-60`.
  - Every label sits at `at(XS, v) + 10`, whatever the neighbouring lines are.
  - Line 57 passes the color through `noteText(24, color)`. That sets CSS `color`, which SVG `<text>` ignores (it needs `fill`).
- Fix:
  - Add `fill={color}` to the `<text>` at line 57.
  - Stack the three labels in one column at `at(XS, 2.57) + 16`, in rows h(230)/h(190)/h(150) ordered "2.57 (t, 5 df)", "2.04 (t, 30 df)", "1.96 (z)", each in its curve's color. Join each to the top of its line with a short horizontal hairline.

### 3. [P2] pacing: the two misreadings the hook promises are the fastest beats
- When:
  - 278.1-289.0 s, `ci-fixed`, 3.20 w/s (element-279.jpeg, element-287.jpeg)
  - 376.5-384.4 s, `pvalue-not`, 3.06 w/s (element-378.jpeg to element-385.jpeg)
- What:
  - The hook (0.6-18.4 s) sells the video on exactly these two sentences, yet the beats that correct them are the fastest in the video (the median is about 2.5 w/s). Neither has an internal pause.
  - `ci-fixed` carries three ideas in 10.9 s: not a 95% chance; the mean is fixed; the interval is random, and each one covers or misses.
  - `pvalue-not` carries two negations and a reason in 7.9 s.
- Why it matters: The one thing the viewer must say correctly in the interview is the most rushed line in the video.
- Cause: `video/src/videos/ds-statistics/script.ts` beats `ci-fixed` and `pvalue-not` (each one beat, `pauseAfter` 0.7 only at the end).
- Fix:
  - Split `ci-fixed` after "in this interval." into `ci-not` (pauseAfter 0.5) and `ci-fixed` ("The mean is fixed. The interval is what's random...").
  - Split `pvalue-not` after "the chance the null is true," with pauseAfter 0.4.
  - Re-voice both at the pace of `ci` (2.2 w/s).

### 4. [P2] answer: correlation vs causation never names the confounder, and the orange dots have no legend
- When: 609-621 s, beat `r-corr` (element-615.jpeg, element-620.jpeg)
- What:
  - On "Hold temperature fixed, and it's point oh eight", about thirty dots turn orange, with no legend and no label.
  - Neither the narration nor the screen says that these are the hot days, or that temperature drives both variables.
  - "Confounder" or "third variable" is never said, although the page's answer turns on it ("a lurking third variable (a confounder) can drive both").
- Why it matters: It is the word the interviewer is listening for. As things stand, the orange looks like an arbitrary highlight.
- Cause: `video/src/videos/ds-statistics/RapidScene.tsx:166` and `:187` (hot days recolored WARM, nothing labels them), and the `r-corr` text in `script.ts`.
- Fix:
  - Narration: "Both rise on hot days: temperature is a confounder. Hold it fixed, and it's point oh eight."
  - Add a WARM_INK note "hot days" beside the orange cluster at `holdAt + 2`, and change "temperature held fixed:" to "confounder held fixed:".

### 5. [P2] explanation: parametric vs non-parametric shows the outcome but not the reason
- When: 590-602 s, beat `r-param` (element-601.jpeg, element-602.jpeg)
- What:
  - The narration says "the t-test sees nothing, p of point seven two. Mann-Whitney finds the shift." It never says why.
  - The reason is that the six monster tickets swamp both means and the pooled SD, while ranks cap each monster at a single rank.
  - "The shift" is not visible. There are no median marks (32.4 vs 36.8 in `results.json`) and the axis has no title or unit, so the viewer cannot see what Mann-Whitney found.
- Why it matters: "Why do ranks help here?" is the obvious follow-up, and the viewer only has the verdict.
- Cause: `video/src/videos/ds-statistics/RapidScene.tsx:83-140` (no median marks, no axis), and the `r-param` text in `script.ts`.
- Fix:
  - Draw a short vertical tick at each queue's median, labelled "median 32" and "median 37".
  - Add an axis title giving the unit from the course's support-queue block.
  - Insert "The monsters swamp the means and the spread; ranks cap each one at a single place." before "Mann-Whitney finds the shift".

### 6. [P2] confusion: correct statements are struck through
- When:
  - 157-158 s, `clt-why` ("theorem", element-158.jpeg)
  - 599-602 s, `r-param` ("p = 0.72", element-601.jpeg)
  - 614-621 s, `r-corr` ("r = 0.57", element-620.jpeg)
- What:
  - Everywhere else in the video, a strike marks a misreading: the hook, the CI scene and the p-value scene.
  - Here it lands on things that are true. The t-test really returns 0.72, and the correlation really is 0.57.
  - Striking "theorem" in "n ≥ 30 is a rule of thumb, not a theorem" makes the line read "not a [deleted]".
- Why it matters: The visual grammar tells the viewer that 0.57 and 0.72 were mistakes.
- Cause: `video/src/videos/ds-statistics/CltScene.tsx:178`, `RapidScene.tsx:131`, `RapidScene.tsx:192`.
- Fix:
  - Remove all three `Strike`s.
  - Fade "r = 0.57" to 40% with "→ 0.08" beside it.
  - Leave "p = 0.72" in red with no strike; "sees nothing" already carries the point.
  - Leave "theorem" in plain red.

### 7. [P2] spacing: labels under 19px
- When:
  - 523-553 s, `hack`: "test 1" to "test 20" at 16px (element-552.jpeg)
  - 570-621 s, rapid round: axis ticks and titles at 18px ("10%" to "18%", "conversion rate", "ice cream sold", "drownings"; element-582.jpeg, element-620.jpeg)
- Why it matters: This breaks the house minimum. The test captions are the faintest text in the video (INK_SOFT at 16px).
- Cause: `video/src/videos/ds-statistics/HackScene.tsx:121` (`label(16, INK_SOFT)`); `RapidScene.tsx:51` and `:181` (`size={18}`).
- Fix: `label(19, INK_SOFT)` for the tile captions ("test 20" still fits a 100px tile), and `size={19}` on both `Axes`.

### 8. [P2] answer: follow-ups the page gives and the video drops
- When: beats `chi` (416-446 s), `unbiased` (230-256 s), `effect`/`effect-report` (486-516 s), `ci` (257-278 s), `hack-paths` (538-552 s), `r-bayes` (559-583 s)
- What, against the page:
  - (a) Q13 never mentions degrees of freedom, so the step from 11.9 to p = 0.0026 is unexplained. Here (rows - 1)(cols - 1) = 2.
  - (b) Q7 drops the page's "dividing by n is biased but lower-variance; MSE = bias^2 + variance", which is the interviewer's next question: is unbiased always better? It also misses the link to Q6 just before it: dividing by n is the MLE of the variance.
  - (c) Q15 gives only "significant but tiny". It drops the page's reverse case, a large effect that is not significant in a small sample.
  - (d) Q8 never shows how one interval is built (x̄ ± t*·s/√n on the page).
  - (e) Q16's "correct for the number of tests" names no method.
  - (f) The Bayesian answer never says which prior was used (flat, per the header of `script.ts`).
- Why it matters: Each is the second question an interviewer asks after the first answer lands.
- Cause: `video/src/videos/ds-statistics/script.ts`, the beats above.
- Fix: One clause each.
  - `chi`: see finding 1.
  - `unbiased`: append "Dividing by n is also the maximum-likelihood answer: biased, but a little less variable."
  - `effect-report`: append "and a big effect can miss significance in a small sample."
  - `hack-paths`: "correct for the number of tests, with Bonferroni or Benjamini-Hochberg".
  - `r-bayes`: "With flat priors, that's a distribution for each rate".
  - `ci`: optionally add the interval formula as a mono note under "a property of the procedure".

### 9. [P3] explanation: two-sidedness is drawn but never named
- When: 341-352 s `ctr` (element-352.jpeg); 368-375 s `pvalue` (element-384.jpeg); 403-414 s `zt` (element-415.jpeg)
- What:
  - Q10's small curves shade red tails (both for two-sided, one for one-sided) with no label for α or its split.
  - Q11 counts "38 or fewer" toward the p-value with no word on why the other side counts.
  - Q12's "the cutoffs, either side" never says that these are two-sided 95% cutoffs.
- Why it matters: The viewer has to infer the connection that makes the three answers one idea.
- Cause: `video/src/videos/ds-statistics/StepsScene.tsx:29-46` (`Tails`, unlabelled); `PvalueScene.tsx:117-119`; `ZtScene.tsx:118-119`.
- Fix:
  - Label the curves "2.5% each side" and "5% on one side".
  - Pvalue narration: "...or thirty-eight or fewer, as far out the other way, since the test is two-sided...".
  - zt note: "the 95% cutoffs, two-sided".

### 10. [P3] confusion: red carries the data being explained
- When: 363-385 s `pvalue` (element-384.jpeg); 434-452 s `chi` (element-452.jpeg); 341-352 s `ctr`
- What:
  - In the p-value scene, the observed "62 heads" line, both tails and "2.1% of runs = the p-value" are in the same red as the two struck misreadings beside them.
  - The observed 103 in the chi-square table is red.
- Why it matters: The series reserves red for the trap or wrong answer. Here the correct answer shares that color with the wrong ones.
- Cause: `video/src/videos/ds-statistics/PvalueScene.tsx:100-110` and `:121`; `ChiScene.tsx:116`.
- Fix: Draw the tails and "2.1% of runs" in BLUE_INK or behind a yellow `Mark` ("what the narration points at"), the observed line in INK, and 103 with a yellow mark. Keep red only for the struck readings.

### 11. [P3] explanation: unlabelled axes and series
- When: `mle` 205-228 s (element-228.jpeg); `lln` 172-188 s (element-187.jpeg); `effect` 488-516 s (element-516.jpeg)
- What:
  - MLE: the y axis has no title (the narration says "likelihood"). Both curves are the same blue, and their names sit 400px away at x 1275, with nothing tying "120 in 400" to the narrow one.
  - LLN: there is no y title. The green bell at the right has no axis and no link to the running mean, and green is the "right answer" color.
  - Effect size: the x axis has no title and the SD of 15 is not shown, so "Cohen's d = 0.0094" cannot be related to "+0.14". The zoomed inset never says it shows the two means.
- Cause: `video/src/videos/ds-statistics/MleScene.tsx:105-112`; `CltScene.tsx:185-194` and `:240`; `EffectScene.tsx:74` and `:96-103`.
- Fix:
  - MLE: yTitle "likelihood"; label the narrow curve "120 in 400" on its flank; draw the wide curve in INK_SOFT.
  - LLN: yTitle "running mean"; draw the bell in INK with the caption "the spread of the mean around μ".
  - Effect: xTitle "score (SD 15)"; inset labels "A, mean" and "B, mean +0.14".

### 12. [P3] spacing: the Bayesian definition crowds the curve labels
- When: 568-583 s, `r-bayes` (element-582.jpeg)
- What: "Bayesian: a prior, updated into a posterior" (y 424) sits about 12px above "A: 120 in 1,000" / "B: 150 in 1,000" (y 458), against the house gap of about 25px.
- Cause: `video/src/videos/ds-statistics/RapidScene.tsx:46` and `:54-58` (curve labels at `base - c.h(282)`).
- Fix: Reduce the curve height from `c.h(250)` to `c.h(225)` (lines 37 and 51), and put the curve labels at `base - c.h(258)`.

### 13. [P3] other: "the page's A B test" refers to a table the viewer never saw
- When: 570-576 s, `r-bayes`
- What: "On the page's A B test, a hundred and twenty conversions in a thousand..." The video never shows that table, and for someone watching the video on its own, "the page" means nothing.
- Cause: the `r-bayes` text in `video/src/videos/ds-statistics/script.ts`.
- Fix: "Take an A B test: a hundred and twenty conversions in a thousand against a hundred and fifty."

### 14. [P3] other: TABULAR spaces out hyphens
- When: 375-385 s ("= the p - value", element-384.jpeg); 480-485 s ("10 t - tests,", element-484.jpeg); 599-602 s ("t - test:", "Mann - Whitney:", element-601.jpeg)
- Cause: `TABULAR` is spread over whole text spans in `video/src/videos/ds-statistics/PvalueScene.tsx:126`, `AnovaScene.tsx:172`, `RapidScene.tsx:130` and `:136`. The kit warns about exactly this in `video/src/editorial/style.ts:61-63`.
- Fix: Drop `...TABULAR` from those spans. The numbers in them do not change while on screen.

### 15. [P3] other: step numbers 1 and 2 turn dark grey on solid blue
- When: 319-327 s, `steps` (element-326.jpeg)
- Cause: `video/src/videos/ds-statistics/StepsScene.tsx:144-148`. `color: PAPER` is set before `...label(24)`, and `label` resets `color` to INK_SOFT.
- Fix: Move the `color:` line after the `...label(24)` spread.

### 16. [P3] spacing: the parameter line runs through the "5" tick label
- When: 44-120 s, `param` to `sampling` (element-093.jpeg, element-120.jpeg)
- Cause: `video/src/videos/ds-statistics/SampleScene.tsx:151-157`. The VLine runs from above the population straight down to `pileBase`, across the population axis's tick row.
- Fix: Draw it in two segments that skip the tick band (`popBase - h(POP_H) - h(14)` to `popBase`, then `popBase + h(34)` to `pileBase`).

### 17. [P3] spacing: the right 40% is empty for Question 3 while the bell is squeezed
- When: 96-120 s, `sampling` (element-120.jpeg)
- What: Q2's column clears at "Question three", leaving x 1110-1920 blank for 24 s. Meanwhile the 2,000-mean bell is about 150px wide on the shared 0-30 axis, and the three Q3 notes sit inside the chart.
- Cause: `video/src/videos/ds-statistics/SampleScene.tsx:105` (`panelOut = q3At - 4` clears the column); the Q3 notes are placed at `x(9)`.
- Fix: Move "2,000 sample means...", "a narrow bell around 5" and "its spread is the SE: 0.70 · 0.71" to `RIGHT_X` at y(780)/(830)/(880), beside the pile. Or keep Q2's "n = 50: ... = 0.71" line and add "0.70 simulated" under it, so that the agreement itself becomes the picture.
