# Stats-7-TestingHypotheses (0-303 s: hook through odds, sheets 00-25)

## Verdict
- Solid first half. Every number I checked against `measurements.json` and the lessons is right: 11.4/10.1, mean 7,453, SE 244, t −2.24, p 0.031, cutoffs 1.96/1.645, 2,109 of 100,000 = 2.1%, the fixed-effect table, test 14 at 0.033, 64%, 0.0025, and 2 peeking dips. Layouts are clean, and most cues land on their words.
- The biggest problem is that Fig. 11 (peeking) is removed about 2 s after it finishes drawing. The steps procedure is also crowded: test statistic, null curve, tails, p-value and verdict arrive in about 22 s with 0.35 s breaths, and Fig. 4's bell curve is never named.
- Four labels collide with lines or with each other: the hook pin cuts through "plausible values", the 38 line cuts through "the null distribution", the Fig. 10 curve runs through "one test: 5%", and "test 14" sits on top of the row label "15".
- Pacing is mostly comfortable: 2.3-3.0 w/s, with 1.7 s scene gaps. It feels rushed at 106-128 s (steps) and 207-231 s (what a p-value isn't). The second of these also shows bare notation on a frame that is two-thirds empty.

## Findings

### 1. [P2] pacing: Fig. 11 (peeking) leaves the screen right after it finishes
- When: 272.2-280.6 s, beats `peek` → `cure` (frames element-0557.jpeg, element-0560.jpeg, element-0561.jpeg)
- What: the p trace draws across the whole `peek` beat. The takeaway note "dips under 0.05: 2 times, with nothing there" shows up at "one look" (278.5 s), and the whole figure fades from 280.1 s. By 280.5 s it is gone, replaced by "Decide before you look". The 9-word note is on screen for about 1.8 s, and the finished figure for about the same.
- Why it matters: this figure is the evidence for "peeking does the same thing", and nobody can read its conclusion in under 2 s.
- Cause: `video/src/videos/testing-hypotheses/OddsScene.tsx:75` stretches the walk to the end of the beat (`max(40, peekEnd - peekAt)`). `:77` fades the figure at `cureAt - 8`. `:173` cues the note at `lookAt - 4`.
- Fix: make the walk finish at "dips" (`dur = dipsAt - peekAt`) and cue the note at `dipsAt + 10`. Then either add `pauseAfter: 1.2` to `peek` (`script.ts:258`) or keep Fig. 11 on screen through `cure`. For the second option, put the "Decide before you look" list under Fig. 10 on the left, where there is room from y≈880.

### 2. [P2] pacing: The steps procedure runs three new ideas back to back
- When: 106.4-128.4 s, beats `tstat` (2.75 w/s) → 0.35 s → `pval` (3.28 w/s, the densest beat in the half) → 0.35 s → `reject` (3.01 w/s) (frames element-0225.jpeg, element-0236.jpeg, element-0266.jpeg)
- What: in about 22 s the screen draws the SE ruler, counts t up, draws the null curve, shades both tails, adds "p = 0.031", adds step 5, swaps the headline, strikes "claimed: 8,000", adds a pink band and adds "the true mean: still unknown". Each beat carries its own new concept, and the gap between them is only 0.35 s.
- Why it matters: this is where the p-value first appears, and the viewer gets no breath between "gap in units of noise" and "three percent of the time".
- Cause: `script.ts:157-170` (`pauseAfter: 0.35` on both `tstat` and `pval`).
- Fix: change `tstat` pauseAfter to 0.8 and `pval` pauseAfter to 0.9. Better still, split `pval` after "three percent of the time." with a 0.6 s pause before "That's the p-value."

### 3. [P2] explanation: Fig. 4's bell curve is never named, and its axis has no claim mark
- When: 113.3-134.4 s, beats `pval` through `sides-in` (frames element-0236.jpeg, element-0266.jpeg)
- What: a grey curve appears under "t = −2.24" with no label, no "8,000" at its centre tick and no axis values. The −1/−2 notch labels fade to 30% and sit inside the curve's fill; the outline runs through "−2". A viewer has to work out alone that this is "averages of 40, if the claim held" and that the red slivers are the 3%. The name "null distribution" only arrives at 177 s, in the coin scene.
- Why it matters: the p-value is shown here as an area under a curve the video never explains.
- Cause: `StepsScene.tsx:291-327` draws the curve without a label. `:257-271` puts the notch labels at `y(Z_BASE) - 44` and fades them to `1 - 0.7 * curveIn`. Nothing labels `zClaim`.
- Fix: at `ifAt`, add a Note to the right of the peak, at about `x = zClaim + 150`, `y = zy(phi(0.9)) - 20`, reading "averages of 40, if 8,000 were true". Add "8,000" under the claim tick at `y(Z_BASE) + 16`. Move the −1/−2 labels below the ruler at `y(Z_BASE) + 14` at full opacity.

### 4. [P2] spacing: The hook's pin stem runs through "plausible values"
- When: 9.5-11.0 s, beat `hook` (frames element-0019.jpeg, element-0022.jpeg)
- What: the red pin lands at 1.6 on the effect axis. That is almost exactly the centre of the label "plausible values" (1.55), so the stem cuts the word "values".
- Why it matters: it is an obvious overlap in the video's first seconds.
- Cause: `OpenScene.tsx:61`, where `pinV = lerp(1.6, 0, toZero)`. The label is centred at `(CI[0]+CI[1])/2` in `:108-114`.
- Fix: start the pin at 2.3 (`lerp(2.3, 0, toZero)`). That keeps it inside the interval and clear of the label's right edge at about x 1181.

### 5. [P2] spacing: Coin figure: the 38 line cuts the curve label, and the count label touches the 62 line
- When: 182.5-201.6 s, beats `far` through `isnt-in` (frame element-0389.jpeg)
- What: the dashed 38 line (x 518) passes through the gap between "null" and "distribution", touching both words. "2,109 runs at least 12 out" starts 6 px right of the solid 62 line.
- Why it matters: these are the two labels that define the p-value in this scene, and both crowd the lines they explain.
- Cause: `CoinScene.tsx:175` right-aligns the label at `midX - 300`, which spans x 426-654 across `mirX`. `:182-186` right-aligns the count at `X.x1` (1700), and the text is wider than the 299 px between 62 and 1700.
- Fix: anchor "the null distribution" `align="left"` at `x = mirX + 22`, which clears the 41-44 bars at that height, and move the leader's start to match. Break the count onto two lines ("2,109 runs" / "at least 12 out"), or right-align it at 1760.

### 6. [P2] spacing: "test 14" sits on row label "15", and the note runs over a dot
- When: 255.5-266.3 s, beats `fourteen` and `hacked` (frames element-0516.jpeg, element-0530.jpeg)
- What: the bold "test 14" label sits directly above the faint row number "15", with about 4 px between them, so the pair reads as "test 14 / 15". "p = 0.033" and "reported as a discovery" start 11 px from the dashed 0.05 line, and "reported as a discovery" runs over row 15's dot.
- Why it matters: this is the climax of the p-hacking point, and the eye lands on clutter.
- Cause: `UniformScene.tsx:172` always prints row numbers [0,4,9,14,19], including index 14 right under `HIT` = 13 (`:186-197`). `:198-205` places both notes at `dot + 22`.
- Fix: leave `HIT ± 1` out of the row-number list. Put the two notes on the hit's own row, which has no other dot, as "p = 0.033 · reported as a discovery", starting at `sx(TX, 0.05) + 24`.

### 7. [P2] spacing: Fig. 10's curve runs through "one test: 5%"
- When: 267.5-302.7 s, beats `odds` through `errors-in` (frames element-0559.jpeg, element-0593.jpeg)
- What: the label sits just above and right of the curve's first point, so the rising line crosses "on" of "one".
- Why it matters: this label is on screen for 35 s, beside the scene's headline number.
- Cause: `OddsScene.tsx:127-131` puts the Note at `x = sx(X,1) + 14`, `y = py(0.05) - 34`, which is exactly where the curve rises through.
- Fix: put it to the left of the start point: `align="right"`, `x = sx(X,1) - 12`, `y = py(0.05) - 14`. Nothing is there, since the y labels stop at 20%.

### 8. [P2] pacing: "What a p-value isn't" packs three ideas into one breathless run
- When: 201.6-231.4 s, beats `isnt` (2.94 w/s) → 0.35 s → `swap` (3.07 w/s) → 0.40 s → `size` (3.07 w/s) → 0.30 s → `collapse` (frames element-0428.jpeg, element-0470.jpeg)
- What: "not P(H0)", the swapped conditional plus the named prosecutor's fallacy, and "not effect size" follow each other with breaths under half a second. The swap is the hardest idea in the half. It is read at 3.07 w/s, and the narration moves on 0.4 s later.
- Why it matters: P(data | H0) against P(H0 | data) is exactly the distinction viewers get wrong, and there is no beat to absorb it.
- Cause: `script.ts:214-224` (`pauseAfter: 0.4` on `swap` and 0.3 on `size`).
- Fix: change `swap` pauseAfter to 1.0 and `size` pauseAfter to 0.5.

### 9. [P2] explanation: The conditional swap is bare notation on a two-thirds-empty frame
- When: 201.6-217.0 s, beats `isnt` and `swap` (frame element-0428.jpeg)
- What: for about 15 s the screen holds only three short lines on the left: P(H0 is true) struck through, then P(data | H0) and P(H0 | data). Everything right of x 600 is blank until Fig. 7 arrives at 217 s. The prosecutor's fallacy is named with nothing to show it.
- Why it matters: the abstract claim has no picture, while space sits unused next to it.
- Cause: `IsntScene.tsx:86-116` puts everything in the left column. Fig. 7's label waits for `sizeAt - 6` (`:119`).
- Fix: use the right half from `dataAt`. Shade the tail area of the coin pile and label it "P(data | H0): computed inside the null world". Beside it, put a struck-through "P(H0 | data): needs the prior too". Then let Fig. 7 replace it at `norAt`. Or at least set the two formulas at 60px, centred on the frame.

### 10. [P2] confusion: "The true mean: still unknown" reads as a label on the sample average
- When: 124.5-134.4 s, beats `reject` and `sides-in` (frame element-0266.jpeg)
- What: the note sits at the foot of the red "average 7,453" line, right-aligned 14 px from it, so it reads as a second caption for that line.
- Why it matters: it invites the very mix-up the narration warns against, treating the sample mean as the true mean.
- Cause: `StepsScene.tsx:336-340` (Note at `meanX - 14`, `y(STRIP) + h(30)`).
- Fix: move it under the step-5 verdict line, at `left: STEP_X + 44`, `top: y(STEP_Y0 + 4*STEP_DY) + 72`, as "not because we know the true mean". Or attach it to the struck claim as "8,000: hard to believe".

### 11. [P3] spacing: Steps figure: pink band under the claim label
- When: 127.0-134.4 s, beat `reject` (frame element-0266.jpeg)
- What: the pink band around 8,000 overlaps the "cl" of "claimed: 8,000", which is now red and struck through on pink. Legibility drops.
- Cause: `StepsScene.tsx:185-189` (band from `y(STRIP) - h(64)`) and `:219` (label at `y(STRIP) - h(70) - 8`).
- Fix: start the band at `y(STRIP) - h(52)`, below the label.

### 12. [P3] spacing: Court table sub-lines are wedged against the hairlines
- When: 61-91 s, beats `court` through `steps-in` (frame element-0172.jpeg)
- What: "until the evidence says otherwise" and "set before the trial begins" sit about 2 px under the 32px label and about 5 px above the row rule. The yellow highlight touches the rule.
- Cause: `CourtScene.tsx:83` and `:143` (sub-line at `rowY + 52`), `:133` (rule at `rowY + 84`), `:17` (`ROW_STEP = 104`).
- Fix: set `ROW_STEP` to 120, put the sub-lines at `rowY + 58` and the rules at `rowY + 100`. The table still ends above y 1000.

### 13. [P3] explanation: α is "the bar, usually 5%" with no meaning attached
- When: 63.4-106.1 s, beats `bar` and `set` (frames element-0172.jpeg, element-0236.jpeg)
- What: α is introduced only as a bar. The lesson says what the 5% is: the false-alarm rate you accept if H0 is true (hypothesis-testing.mdx:152-155). The video says so only at 307 s ("Its rate is alpha"). Until then, "three is under five" compares two percentages without saying they share a unit.
- Cause: `CourtScene.tsx:58-67`, `StepsScene.tsx:173-180`.
- Fix: put the court sub-line "the false-alarm risk you accept, set before the trial begins" on screen. Or add to `bar`: "...the bar the evidence has to clear: how often you'll accept a false alarm."

### 14. [P3] confusion: Null scene: an empty start, and the same question shown twice
- When: 32.7-35.5 s and 41.8-58.2 s, beats `null` through `court-in` (frames element-0068.jpeg, element-0107.jpeg)
- What: for about 3 s only the headline is up. Later, the headline "If the null were true, would this surprise you?" and the boxed "If H0 were true, would data like mine be surprising?" say the same thing at once. The box sits empty for about 1.5 s before its text arrives. The card text and the box text each leave one word alone on a line ("same.", "surprising?").
- Cause: `NullScene.tsx:90-91` (headlines), `:115-134` (box shown at `surpriseFrom - 2`, text at `ifAt - 4`), `:14-15` (`CARD_W = 700`).
- Fix: keep the headline on "Start from the boring answer." and leave the question to the box. Fade the box and its text in together at `ifAt - 4`. Widen `CARD_W` to 760 and `FLOW_W` to 800, or shorten the copy.

### 15. [P3] other: Sides headline hangs on a comma for 11 s, and the example's t never appears
- When: 134.4-145.5 s, beat `sides` (frame element-0287.jpeg)
- What: "Two tails," stays alone until "one-sided". Fig. 5 never marks the scene's own t = −2.24, which would show the two-sided rejection directly beyond −1.96.
- Cause: `SidesScene.tsx:68` (`bAt = oneSidedAt - 6`).
- Fix: set the headline to "Surprise lives in both tails." and swap to "Two tails, or one?" at `oneSidedAt`. At `tailsAt`, add a red tick at −2.24 labelled "our t".

### 16. [P3] explanation: Fig. 7's labels: no unit, a late legend, and red with two meanings
- When: 217-240 s, beats `size` through `hack-in` (frame element-0470.jpeg)
- What: "Effect 0.1" has no unit (the lesson means 0.1 SD). The legend "bar: p from 0 to 1" arrives at 231 s, 8 s after the bars. On the same frame, red marks "P(H0 | data): not the p-value" (wrong) and also p < 0.05 in the table (significant). The narration rounds 0.8271 to "point eight three".
- Cause: `IsntScene.tsx:119`, `:198-202`, `:170`, `:181`.
- Fix: retitle the figure "A true effect of 0.1 SD, never changed". Bring the legend in with the first bar (`twentyAt`). Draw the significant p-values in the accent ink only after the swap lines have dimmed, or switch the left-hand pair to ink and grey.

### 17. [P3] explanation: The Bonferroni panel has no name, number or axis title
- When: 288.2-302.7 s, beat `bonferroni` (frame element-0593.jpeg)
- What: the only figure without a "Fig." label. Its 0-0.06 axis is unlabelled, and the method is never named on screen or aloud.
- Cause: `OddsScene.tsx:204-222`.
- Fix: add `<FigLabel n="12" title="The same test, against a raised bar">`, a "p-value" note at the axis end, and "(Bonferroni)" after "0.05 ÷ 20 = 0.0025".

### 18. [P3] explanation: "Noise makes gaps for free" is asserted without a picture
- When: 20.5-31.0 s, beat `free` (frame element-0063.jpeg)
- What: the headline makes the claim, but Fig. 2 only shows the observed 1.3-point gap. Nothing shows a gap from two identical processes. The lesson points back to Why Statistics Matters for this.
- Cause: `OpenScene.tsx:84`.
- Fix: at "noise", ghost two thin "old vs old" bar pairs under Fig. 2, with gaps of about 0.6 and 1.1 points, labelled "same checkout, two weeks". Fade them at "So".

### 19. [P3] other: p is printed three ways, and figure labels sit at varying heights
- When: 113-266 s, across the scenes (frames element-0266.jpeg, element-0389.jpeg, element-0287.jpeg)
- What: the narration says "three percent" while the screen prints "p = 0.031". The coin scene prints "p = 2.1%" to match its narration. Fig. 7 prints 4 decimals. Separately, the headline-to-figure-label gap ranges from about 47 px (Fig. 5, `y(262)`) to about 127 px (Figs 1-2, `y(330)`).
- Cause: `StepsScene.tsx:329`, `CoinScene.tsx:199`, `SidesScene.tsx:72`, `OpenScene.tsx:88/154`.
- Fix: print steps as "p = 0.031 (3.1%)". Standardise FigLabel at `y(300)` under an 80px headline.
