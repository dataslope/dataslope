# Stats-8-InterpretingResults (0-392 s, whole video)

## Verdict
- The build is solid. Nearly every spoken number matches the lessons' seeded code and the frame. Text is 20px or larger everywhere, Fig. 1 to 12 run in order, and the scene gaps hold. Most charts read well.
- Two misattributions are the biggest problems:
  - Fig. 5's d = 0.36 is presented as the checkout button's effect size, but it comes from a different experiment.
  - The lesson's invented two-department numbers are shown under "The famous case: Berkeley, 1973".
- Some ideas are left to the screen or never said at all:
  - "Simpson's paradox" is spoken while the headline area is blank.
  - "Regression to the mean" is never spoken.
  - Nobody says why the pooled rate flips.
  - The unit-of-analysis headline claims more than the scene shows.
  - The close says "most of these traps" but boxes three.
- Pacing is mostly comfortable (2.2-3.0 w/s, 1.6 s before each cut). It gets tight in three places:
  - Berkson's rule and result come with 0.30 s gaps.
  - Admit's key `mix` beat runs at 3.17 w/s.
  - Two notes arrive about 2 s before a cut: the end's "3. Confirm" and Next line, and Cherry's unspoken note.

## Findings

### 1. [P1] accuracy: Fig. 5's d = 0.36 reads as the checkout button's effect, but it comes from another experiment
- When: 130.9-145.7 s, beats `interval`, `trio` (element-262.jpeg, element-290.jpeg)
- What: Fig. 4 (3.0% vs 4.2% conversion) stays on screen, dimmed. Fig. 5 appears directly under it and the narrator says "And give every effect size an interval. Here, a d of zero point three six...". The trio row then reports "d = 0.36 / 0.10 to 0.62 / the p-value" as the result.
  - The 0.36 is really the effect-sizes bootstrap block (seed 11, two groups of 120, Normal(100,15) vs Normal(106,15)).
  - For a 3.0% to 4.2% lift, the standardized size is tiny: Cohen's h ≈ 0.06.
  - "2,000 resampled d's" is never explained. "Bootstrap" and "resample" are never said.
  - The narration says "to zero point six" while the screen says 0.62.
- Why it matters: viewers will take the checkout lift to be a "small-to-medium" d of 0.36 with that interval, which is wrong.
- Cause: `RatesScene.tsx:218` (Fig. 5 placed under Fig. 4 with no note that the data changed); `RatesScene.tsx:67-71` (trio built from `CI`); the `interval` beat in `script.ts`.
- Fix (preferred): keep one example. Give the checkout lift its own interval: +1.2 points, 95% CI roughly +0.3 to +2.1 points, p ≈ 0.013 (normal approximation from 90/3,000 and 126/3,000; have `measure.py` compute the exact values). Draw it as an interval on the Fig. 4 axis, and fill the trio with "+1.2 points / 0.3 to 2.1 / p ≈ 0.01".
- Fix (minimum): say "Take a different experiment, two groups of a hundred and twenty: a d of zero point three six, resampled two thousand times, plausibly from zero point one to zero point six." Retitle Fig. 5 "Another experiment: d and its 95% interval".

### 2. [P1] accuracy: Invented numbers are labelled as Berkeley 1973
- When: 151.7-206.8 s, beats `admit` through `ask` (element-306.jpeg, element-376.jpeg)
- What: The subtitle "The famous case: Berkeley, 1973" and the line "Here's the pattern in two departments" introduce Fig. 6, whose 55% vs 32.9%, 600 of 700, and so on are the lesson's constructed dataset (`statistical-fallacies.mdx` "Let's build a dataset where exactly this reversal happens").
  - The real 1973 data had six large departments, with men admitted at about 44% and women at about 35%.
  - In the real data, women led in four of the six departments, not in "both".
- Why it matters: viewers will remember 55% vs 33% as Berkeley's real figures.
- Cause: `AdmitScene.tsx:107-113` (the Berkeley subtitle sits directly over Fig. 6, line 118); the `admit` beat in `script.ts`.
- Fix:
  - Narration: "Berkeley's nineteen seventy-three admissions are the famous case. Here's the same pattern, in two made-up departments."
  - Subtitle: "After Berkeley, 1973: made-up numbers".
  - Fig. 6 title: "Share admitted, two invented departments".

### 3. [P2] confusion/spacing: Sweep p-panel: unlabelled 0.05 line, non-significant points look significant, labels collide
- When: 88.0-115.0 s, beats `sweep`, `plunge` (element-186.jpeg, element-216.jpeg)
- What:
  - A dashed line at p = 0.05 runs just under "1" with no label.
  - On a 50-decade axis, 1 to 0.05 spans about 6 px, so the 0.15 and 0.095 dots sit on the line. They are indistinguishable from p = 1 and from "significant", although being non-significant is their whole point.
  - The "0.15" label stacks under the "p-value" panel title with about 2 px between them, overlapping it horizontally.
- Why it matters: the "plunge from 0.15" starts at a point the viewer cannot see as non-significant, and the threshold is a mystery line.
- Cause: `SweepScene.tsx:196` (unlabelled `Dashed` at `pY(0.05)`); `SweepScene.tsx:107` (title at `y(318)`) against `SweepScene.tsx:252` (labels at `pPts[i][1] - 34`).
- Fix:
  - Add a note "p = 0.05" at the right end of the dashed line (x `P.x1`, y `pY(0.05) - 30`).
  - Place the i=0 and i=1 labels below-right of their dots (`pPts[i][1] + 14`).
  - Raise the panel titles to `y(296)`.
  - Optional: give 1 to 10⁻² its own stretched band at the top of the axis.

### 4. [P2] explanation: Why the totals flip is never said, and the lines meant to show it arrive unexplained
- When: 182.9-206.8 s, beats `mix`, `ask` (element-376.jpeg, element-403.jpeg)
- What:
  - `mix` delivers the crux at 3.17 w/s with a 0.40 s gap. No one says the missing step: the hard department turns most applicants away, so a group that mostly applies there gets a low total.
  - At "averaging over" (≈200.5 s), the "600 of 700 ... applied here" labels exit. Four crossing lines, with width proportional to share of applicants, replace them. Nothing says what the width means.
  - About 3 s later (≈204 s), the figure starts to dim for the next scene.
  - The thin orange line runs through the men's Easy dot.
- Why it matters: viewers hear that the paradox happened but not how pooling produces it.
- Cause: `AdmitScene.tsx:311,316` (`out={overAt - 8}` removes the applicant labels); `AdmitScene.tsx:175-193` (weight lines, no legend); the `mix` beat in `script.ts`.
- Fix:
  - Add to `mix`: "...and the hard one turns three in four away, so it drags the women's total down." Then add `pauseAfter: 0.8`.
  - Cue the weight lines to that sentence and keep the applicant labels up.
  - Add a note "line width: share of each group's applicants".

### 5. [P2] explanation: "Simpson's paradox" is spoken over a blank headline area
- When: 190.0-193.0 s, beat `name` (element-383.jpeg)
- What: "Ahead in both, behind overall." exits on "Simpson's paradox", and the next headline waits for "lurking". The top of the frame is empty exactly while the scene's key term is said, and the term appears only in the small kicker.
- Why it matters: the name the viewer should remember never gets the headline.
- Cause: `AdmitScene.tsx:94` (`out={nameAt - 8}`) and `AdmitScene.tsx:103` (next headline at `lurkAt - 4`).
- Fix: insert a headline "Simpson's paradox." at `nameAt - 6`, out at `lurkAt - 6`. Or make the second headline "Simpson's paradox: a lurking department."

### 6. [P2] explanation: "Regression to the mean" is never said
- When: 243.8-286.0 s, beats `rtm` through `control` (element-562.jpeg)
- What: The narration says "luck doesn't repeat" but never names the effect, and never says both groups move toward the average. The "everyone, about 101" line appears without a word.
- Why it matters: this is the lesson section's named concept. Simpson's paradox and confounding get named, this one does not.
- Cause: `script.ts` beats `rtm` to `control`; the average line at `RtmScene.tsx:213-219` is not cued to any narration.
- Fix: rewrite `nothing` as "Nobody did anything. Both groups slid back toward the average, about a hundred. That's regression to the mean: part of every extreme score was luck, and luck doesn't repeat." Change the headline at `RtmScene.tsx:104-109` to "Regression to the mean." and cue the average line to "average".

### 7. [P2] confusion/pacing: Berkson: the admitted subset is red before the admission rule exists
- When: 329.0-341.8 s, beats `berkson`, `rule`, `inside` (element-662.jpeg, element-670.jpeg)
- What:
  - While the narrator says the scores are "unrelated", the would-be-admitted dots are already red in the upper right. The rule ("admit anyone whose two scores add up past a bar") only comes 3+ s later.
  - `rule` (3.01 w/s) is squeezed between two 0.30 s gaps, so the rule and its result (−0.56) arrive almost back to back.
- Why it matters: the colour split hints at a structure before the rule creates it, which undercuts "selection manufactures the relationship".
- Cause: `BerksonScene.tsx:159` (`fill={inside ? STAT : ...}` from the dot's first frame).
- Fix: `fill={inside && pick > 0 ? STAT : pick > 0 ? RAW : DOT}` (red only from the bar). Add `pauseAfter: 0.6` to `rule`.

### 8. [P2] accuracy/confusion: "People barely do." conflicts with a people cloud that visibly rises
- When: 361.9-377.0 s, beats `people`, `both-true` (element-750.jpeg)
- What:
  - In the right panel, the 330 people climb from lower left to upper right as a whole. Pooled across districts, person-level income and turnout are strongly correlated (about 0.8 by a back-of-envelope from the spreads in `charts/ecological-fallacy.mjs`).
  - Only the flat within-district lines carry the 0.07. The headline says people barely correlate, and the narration says "the other about people".
  - The lesson's reason (district averages differ for other reasons, like age or local campaigns) is not given.
  - "on average, across the six" floats at the top right, far from the "r = 0.07" it qualifies.
- Why it matters: the viewer sees a rising cloud under a headline that says the opposite.
- Cause: `UnitScene.tsx:111` (headline text); the note at `UnitScene.tsx:213`; the `both-true` beat in `script.ts`.
- Fix:
  - Headline: "Within a district, people barely do."
  - `both-true`: "One is about districts, the other about people inside one. Districts differ for other reasons, and that alone lines their averages up."
  - Move "averaged across the six" onto the r label line.

### 9. [P2] accuracy: The close says "Most of these traps" but boxes three
- When: 377.3-384.2 s, beat `close` (element-782.jpeg)
- What: The video covered eight traps:
  - significance vs size
  - Simpson's paradox
  - confounding
  - regression to the mean
  - cherry-picking
  - the sharpshooter
  - Berkson
  - unit of analysis

  Only three are boxed as sharing the flaw. The lesson's callout is titled "The thread connecting half of these", and it also counts p-hacking and forking paths, which the video never shows.
- Why it matters: it states a generalisation that the screen itself contradicts.
- Cause: the `close` beat in `script.ts`; `CloseScene.tsx:11` (three tags).
- Fix: "Three of these traps share one flaw."

### 10. [P3] pacing: The final "Confirm" step and Next line get about 2 s and are never said
- When: 389.4-392.1 s, beat `next` (element-780.jpeg, element-782.jpeg)
- What: "2. Look", "3. Confirm" and "Next: exploring, then confirming." all land around 389.5-390 s. The highlight moves to Confirm at about 391 s, and the video ends at 392.1. Narration stops at "before you look".
- Why it matters: the cure's third step and the bridge are barely readable.
- Cause: `CloseScene.tsx:39` (`stepAt` keyed to `lookAt ± 6`); `CloseScene.tsx:115`; `script.ts` `tail: 2.2`.
- Fix: extend `next` with "...before you look, then confirm it on fresh data." Cue Confirm to "confirm" and set `tail: 3.0`.

### 11. [P3] pacing: Cherry's "a breakout? / missing: the other 116 months" is up for about 1.8 s, unspoken
- When: 304.1-305.9 s, beat `crop` (element-608.jpeg, element-610.jpeg)
- What: The 8-word note appears on "false", the scene's last word, and the cut follows 1.8 s later. Reading it needs about 4 s.
- Why it matters: the scene's best caption goes by too fast to read.
- Cause: `CherryScene.tsx:192` (`at={falseAt - 4}`).
- Fix: cue it at `thoseAt` (≈300 s), or give `crop` `pauseAfter: 2.5`.

### 12. [P3] confusion: Confound: stale slope triangle, colours with two meanings, label on a gridline
- When: 218.3-243.8 s (element-434.jpeg, element-474.jpeg)
- What:
  - The "one hour" label and the triangle's horizontal leg are only dimmed. They sit under the blue "around 30" band among its dots and centroid ring until the cut, and the red stub reads like a fifth fit line.
  - In the causal sketch, the Exercise box uses band blue ("around 30") and Blood pressure uses band purple ("around 75").
  - The band labels "around 30/45/60/75" never say "age", and they sit beside an axis in minutes.
  - "everyone: +8.9 mmHg per weekly hour" sits on the 150 gridline.
- Why it matters: leftover marks and reused colours add noise to the scene's key reveal.
- Cause: `ConfoundScene.tsx:177-195` and `ConfoundScene.tsx:217-221` (`dim` rather than `out`); `ConfoundScene.tsx:241-242` (box colours); `ConfoundScene.tsx:16` (label text); `ConfoundScene.tsx:212` (y offset).
- Fix:
  - Fade the triangle with `* (1 - ease(frame, colorAt, 12))` and give its Note `out={colorAt}`.
  - Draw all three boxes in `INK`.
  - Make the first band label "age ~30".
  - Move the slope label to `... - 80`.

### 13. [P3] other: Spaced hyphens: "the p - value", "cherry - picking"
- When: 143-151 s (element-290.jpeg); 309-324 s (element-646.jpeg)
- What: In word labels set with `note()`, the hyphen renders with visible space around it.
- Why it matters: it looks like a typo.
- Cause: `editorial/style.ts:66`. `note()` turns on `tabular-nums`, and Inter then gives the hyphen a figure's width. The affected labels are at `RatesScene.tsx:306` (trio answers) and `SharpScene.tsx:150`.
- Fix: set those two spans in `label()`, or override with `fontVariantNumeric: "lining-nums"`.

### 14. [P3] spacing: The caliper illustration crowds the table notes
- When: 77.0-84.8 s, beats `stake`, `sweep-in` (element-166.jpeg)
- What: The caliper's red ball sits about 20 px right of "in the formula", and its jaw is level with that line.
- Why it matters: the text and the illustration collide.
- Cause: `DScene.tsx:292` (`left={1700} top={y(600)}`) against the note at `DScene.tsx:295`.
- Fix: move the caliper into the empty area below the notes, for example `left={1560} top={y(712)} height={280}`.

### 15. [P3] confusion: Fig. 1: the p-value spins through wrong values, and the shading has no label
- When: 20.0-23.0 s, beat `p` (element-040.jpeg shows "p = 0.44", element-042.jpeg "p = 0.00058"); 27.0 s on (element-054.jpeg)
- What:
  - The p-value counts down a log scale, as if the sample were growing. A still frame shows "p = 0.44".
  - On "spread", a ±1 SD band 30 points wide is shaded next to a bracket labelled "spread: about 15 points", and the band has no label.
- Why it matters: both invite a wrong reading of numbers the narrator is defining.
- Cause: `HugeScene.tsx:261` (`Count` with `pAt`); `HugeScene.tsx:161-170`.
- Fix: fade p in at 0.00026. Drop the shading, or label it "±1 SD".

### 16. [P3] explanation: Notation and axes left unexplained
- When: various (element-058.jpeg, element-216.jpeg, element-562.jpeg, element-646.jpeg)
- What:
  - "d = 0.009" appears at 29 s, but Cohen's d is defined at 47 s.
  - "no sample size in the formula" refers to a formula that is never shown.
  - "n = 500" and "moves with n" use n, which is never said.
  - Fig. 8's 50-150 axis has no title or unit.
  - "chance alone: about 2.5" has no basis given.
- Why it matters: each is a small stall for a viewer new to the notation.
- Cause: `HugeScene.tsx:291`; `DScene.tsx:297`; `SweepScene.tsx:221,271`; `RtmScene.tsx:126-130`; `SharpScene.tsx:146`.
- Fix:
  - Show "d = (B − A) / SD" under the DScene headline on "standard deviations".
  - Change "moves with n" to "moves with sample size".
  - Add the axis title "sales that month".
  - Change "chance alone" to "if the target came first: about 2.5".

### 17. [P3] spacing: Long stretches with most of the frame empty
- When:
  - 4.6-10.5 s: only the headline and two 24px labels (element-018.jpeg).
  - 46.8-59.0 s: right 40% empty (element-112.jpeg).
  - 116-131 s: bottom half empty (element-254.jpeg).
  - 326-337 s: Berkson's right panel is an empty box for 11 s (element-662.jpeg).
- Why it matters: viewers watch blank space or a blank frame while explanation continues.
- Cause: `HugeScene.tsx:77` (curves cued to "two groups"); `BerksonScene.tsx:118` (right box drawn at `relationshipAt - 4`).
- Fix:
  - Start Fig. 1's axis on "effect is there".
  - Draw Berkson's right box at `getInAt - 8`.
  - Pull Fig. 4 down toward the middle until Fig. 5 needs the space.

### 18. [P3] pacing: Sample-size labels flash past
- When: 90.0-92.5 s, beat `sweep` (element-182.jpeg)
- What: Five "n = …" labels and five dot pairs arrive in about 2 s, each label up for about 0.4 s.
- Why it matters: the sample sizes can't be read as they go by. Only the x axis carries them.
- Cause: `SweepScene.tsx:73` (`rowAt` spread between "twenty" and "fifty thousand").
- Fix: give `sweep` `pauseAfter: 0.8` and spread `rowAt` across it, about 0.6 s per row. Or drop the per-n labels and let the axis carry them.
