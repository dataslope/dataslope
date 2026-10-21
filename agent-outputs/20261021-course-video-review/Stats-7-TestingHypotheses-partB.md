# Stats-7-TestingHypotheses (302.7-600.6 s: grid to the end, sheets 25-50)

## Verdict
- Solid second half overall. All numbers match measurements.json and the lessons, the figures are numbered 12-20 in order, and nothing is under 19px. The weak spots are a handful of figures whose picture argues against the number on them, plus some late-scene layout slips.
- Biggest problems: the ANOVA picture shows the spread between groups as *smaller* than the spread within, yet reads F = 12.2, and F is never given a baseline. The chi-square "gaps" on screen cannot add up to 11.9. A label in the paired-test figure is crossed by a bracket. Pearson's fit line runs out of its plot box.
- The ranks section has one stale label and two result lines that nearly touch. It then cuts to an almost empty frame before the closing question appears.
- Pacing is mostly comfortable (2.3-3.0 words/s). It gets rushed where definitions are stacked: Type I, Type II and power are three new terms with 0.35 s gaps between them; Spearman arrives 0.30 s after Pearson; and the F-statistic beat runs at 3.07 words/s straight into its example.
- Several scenes leave half the frame empty for 10-16 s while the figure on the other half builds: the power grid, the five-group ring, and the first seconds of the A/B scene.

## Findings

### 1. [P1] spacing: "their own control" is struck through by the After-column bracket
- When: 460.5-468.6 s, beats `own` and `groups-in` (element-0922.jpeg)
- What: the red label "their own control" starts at x≈700. The right-hand vertical bracket ("the spread between people") runs at x≈792 straight through the "n" of "own".
- Why it matters: this is the scene's punchline label, and it is visibly defaced.
- Cause: `video/src/videos/testing-hypotheses/PairsScene.tsx:238` places the Note at `colX(1, ONE) + 20`, which is inside the bracket drawn at `COL[1] + 92` (`PairsScene.tsx:155`).
- Fix: put the label on the left of the patient's line, ending at `colX(0, ONE) - 16` with `align="right"`. Or end the bracket above that patient: set `y1` to `vy(PAIRED.after[ONE]) - 30`.

### 2. [P1] accuracy/explanation: the ANOVA figure shows "between" smaller than "within", yet says F = 12.2
- When: 489.0-498.2 s, beat `warehouses` (element-0993.jpeg)
- What: the red "between" bar runs from East's mean to South's mean (23.7 to 27.8 h, about 4 h long). Each black "within" bar is ±1 SD (7-9 h long). Read as the narration's "spread between the group means over the spread within the groups", the picture says F is below 1, but the screen says F = 12.2. F only reaches 12 because the between term is multiplied by 40 per group (179 / 14.7). The video also never says what F looks like with no difference: the lesson says "F ≈ 1", and the video jumps from "F of twelve" to "at least one differs".
- Why it matters: a careful viewer who compares the two bars will conclude that F should be small, and loses the logic of the test.
- Cause: `GroupsScene.tsx:204-213` draws within as `g.mean ± g.sd`, and `GroupsScene.tsx:219-228` draws between as the raw range of the means. `script.ts:380` (`ftest`) and the `warehouses` beat give no reference value.
- Fix: draw each group's within bar as ±SD/√40 (about ±0.6 h, the uncertainty of each mean), so the 4 h between bar visibly dwarfs it. Add one sentence to `warehouses`: "With no real difference, F hovers near one; twelve is far out."

### 3. [P2] explanation: the chi-square gaps on screen can't add up to the 11.9 shown
- When: 512.8-532.6 s, beats `observed` and `related` (element-1052.jpeg)
- What: each cell shows a signed gap (+17.9, −17.9, −16.3, +16.3, −1.6, +1.6), and the narration says chi-square "adds up how far every cell strays". These numbers sum to 0, or to 71.6 as absolute values, but the screen then shows χ² = 11.9. The real sum is of (O−E)²/E: 2.0 + 5.4 + 1.1 + 3.1 + 0.07 + 0.18.
- Why it matters: a viewer who checks the arithmetic gets a contradiction, and nothing on screen explains it.
- Cause: `ChiScene.tsx:201-206` prints `obs − exp`, and `ChiScene.tsx:214-219` prints `CHI.chi2`.
- Fix: on `strays`, turn each gap into its contribution, `(gap² / exp).toFixed(1)`, so the six visible numbers sum to 11.9. Reword the beat to "squares every gap, scales it by what was expected, and adds them up."

### 4. [P2] accuracy: the "noise" bracket measures one group's spread, not the standard error
- When: 415.5-433.6 s, beats `ratio`, `big`, `designs` (element-0832.jpeg, element-0865.jpeg)
- What: the formula reads "t = the gap you observed / its standard error", and the narration says "the noise in that gap, its standard error". The bracket labelled "noise" spans ±1 SD of the blue mound, which is the spread of the raw values in one group.
- Why it matters: it teaches that the SE is the within-group SD. That is the exact confusion the t-test exists to resolve, and it undercuts "more data shrinks the noise" two scenes earlier.
- Cause: `RatioScene.tsx:156-159` (bracket `mx(b) ± sd * UNIT`, label "noise"). The unlabelled mounds are drawn as raw group distributions (`RatioScene.tsx:133-140`).
- Fix: either label the mounds "where each group's mean could land" (sampling distributions) so their width *is* the SE, or keep them as data and label the bracket "spread within a group", with a small note "÷ √n → standard error".

### 5. [P2] spacing: Pearson's fit line runs out of the plot box, below the x-axis
- When: 537.0-546.0 s, beats `corr` and `curve` (element-1082.jpeg)
- What: the dashed red least-squares line starts at x = 0.5, where its fitted y is below the plotted y-range. It crosses under the x-axis (y≈907) and ends about 60px below it, at (220, 970).
- Why it matters: it is an obvious drawing defect on the figure that introduces Pearson's r.
- Cause: `CorrScene.tsx:174-185` draws from `C.xlo` with no clip to `BOX`.
- Fix: wrap the line in a `<clipPath>` of the box, or start it at the x where `CURVE_FIT.a + CURVE_FIT.b * x = C.ylo`.

### 6. [P2] confusion: stale "the means" label after the mean lines have gone
- When: 579.0-590.0 s, beats `mwu` and `line` (element-1176.jpeg)
- What: the red mean ticks fade on "ranks", but the red "the means" label stays at full strength beside nothing.
- Why it matters: the label points at an empty spot just as the eye is moving to the new rank line.
- Cause: the mean lines fade via `opacity={1 - ease(frame, ranksAt - 6, 12)}` (`RanksScene.tsx:145`), while the Note at `RanksScene.tsx:235-239` has no `out`.
- Fix: add `out={ranksAt - 6}` to that Note.

### 7. [P2] spacing: Welch and Mann-Whitney result lines almost touch
- When: 582.5-590.0 s, beats `mwu` and `line` (element-1176.jpeg)
- What: "Mann-Whitney, p = 0.033" (26px) sits about 6px under "means 52 and 59: Welch's t-test, p = 0.72". The two lines overlap horizontally from x 1120 to 1185, so they read as one cramped block. That block also crowds the "average ranks, A and B" label below it.
- Why it matters: these are the two numbers the scene contrasts, and they collide.
- Cause: `RanksScene.tsx:230` puts the Welch note at `y(AXIS) + 46`, and `RanksScene.tsx:240` puts the MWU note at `y(RANK_Y) - 116`, which is only about 32px lower.
- Fix: move the MWU result to the right end of the rank line (for example `x={RX1}` `align="right"` `y={y(RANK_Y) - 150}`), or move `RANK_Y` down to about 800 to open roughly 40px.

### 8. [P2] pacing: definitions stacked with 0.30-0.35 s breaths
- When: 307.3-324.4 s (`typeone` 2.73 w/s, `typetwo` 2.90, `power` 3.00, gaps of 0.35 s); 532.6-550.5 s (`corr` → `curve`, 0.30 s gap); 483.5-496.5 s (`ftest` at 3.07 w/s → `warehouses`, 0.35 s)
- What: Type I/alpha, Type II/beta and power are three new terms in 17 s, each landing as its cell fills. Spearman's rho, ranks and 0.99 arrive 0.3 s after Pearson's r is defined. The F definition runs straight into the example.
- Why it matters: these are the second half's core definitions, and there is no beat to absorb one before the next arrives.
- Cause: `script.ts:281-286` (pauseAfter 0.35 / 0.35), `script.ts:411` (pauseAfter 0.3), and the `ftest` pauseAfter 0.35 (`script.ts:380`).
- Fix: set pauseAfter to 0.7 on `typeone`, `typetwo`, `corr` and `ftest`.

### 9. [P2] pacing/confusion: the ranks figure barely holds, then the frame goes almost blank
- When: 588.4-593.3 s, beats `line` → `next` (element-1176.jpeg, element-1181.jpeg)
- What: "the six monsters: ranks 75 to 80" and the pink wash appear about 1.2 s before the whole figure fades on "Every test" (0.7 s gap). From 590 to 593 s the frame then shows only the grey italic "The one narrow question every test here answers." with no heading, until "Could the effect be zero?" arrives on "could".
- Why it matters: the key rank-line point is barely readable, and the closing opens on an empty page that refers to a question it has not yet shown.
- Cause: `RanksScene.tsx:80` (`close = ease(frame, everyAt - 6, 18)`), `RanksScene.tsx:98` (head at `couldAt - 6`), and `RanksScene.tsx:296` (subtitle at `everyAt + 4`). `script.ts:438` has pauseAfter 0.7.
- Fix: raise `line`'s pauseAfter to 1.4 (the bridge still follows a pause). Bring the closing head in at `everyAt` and the subtitle at `couldAt`.

### 10. [P2] spacing: half the frame empty for long stretches
- When: 326.1-342.7 s, beats `sim`/`coinflip` (element-0682.jpeg): the 2,000-run grid fills only the left 750px and the right half is empty for about 16 s. From 329 to 333.6 s the grid is also an empty grey slab. 468.6-483.5 s, beats `groups`/`once` (element-0957.jpeg): the five-node ring takes the left 400px and the right 60% is empty for about 15 s. 365.2-370.3 s, beat `ab`: only the head and the Fig. 14 label are on screen.
- Why it matters: while the narration explains the setup, the figure is small and the space beside it is wasted.
- Cause: `PowerScene.tsx:14-18` (GRID_X 160, 15×10.5 cells) and `PowerScene.tsx:111-113` (placeholder rect from `counting`). `GroupsScene.tsx:14` (RING at x 440, r 170). `AbScene.tsx:73` (axis waits for `lift`).
- Fix: centre the power grid at 22×15 cells until `Lower`, then slide it left. Hold the placeholder off until `repeat`. Centre the ring (x 960, r 220) and move it left on `F statistic`. Bring the A/B axis and the "10% to 12%" row in on `sized`.

### 11. [P2] confusion: the power curve's two blue washes merge into one shape
- When: 352.0-365.2 s, beats `more` and `target` (element-0727.jpeg)
- What: the area under the curve up to n = 80 and the 80-100% "target" band use the same `DATA_WASH`, so they fuse into one L-shaped blue blob. An area under a power curve has no meaning, yet it is the biggest mark on the chart. The shading edge at n = 80 cuts through "40 per group: 61%", and "80 per group: 90%" sits inside the band, about 10px above the dashed 80% line.
- Why it matters: the eye reads the blob as the result, and the two labels are hard to read.
- Cause: `PowerScene.tsx:201-224` (both rects filled with `DATA_WASH`) and `PowerScene.tsx:258` (labels at `py(p) + 4`).
- Fix: drop the under-curve shading and pulse the n = 40 and n = 80 dots instead. Render the target band as a light hatched or INK-tinted strip, and set the labels above-left of their dots.

### 12. [P3] explanation: "Only more data shrinks both" is shown with only one of the two
- When: 351.6-365.2 s, beat `more` (element-0727.jpeg)
- What: the headline claims both errors shrink, but Fig. 13 plots only power at a fixed α. The seesaw that showed α was faded out on "Only". The scene's own 30-per-group run (47.5%) is not on the curve, so the link between the two figures is lost.
- Why it matters: the claim in the headline is not shown, and the viewer gets no bridge from Fig. 12 to Fig. 13.
- Cause: `PowerScene.tsx:70` (seesaw out on `onlyAt`) and `PowerScene.tsx:237-242` (dots only at `POWER_BY_N.sizes`).
- Fix: add a hollow marker at n = 30, 47.5%, labelled "Fig. 12". Either reword the headline to "Only more data catches more" or add a note "α stays at 5% throughout".

### 13. [P3] spacing: the chi-square bridge line crowds the χ² row
- When: 528.0-532.6 s, beat `corr-in` (element-1058.jpeg, element-1062.jpeg)
- What: "Two columns of numbers: do they move together?" (36px) appears about 15px under "χ² = 11.9 p = 0.003". After the table slides up 50px, the dimmed Fig. 18 label sits about 30px under the headline's descenders.
- Why it matters: the gaps are below the house rule of about 25px between rows of text.
- Cause: `ChiScene.tsx:226` (`top: y(880)`) against `ChiScene.tsx:214` (`y(830)`), and the slide in `ChiScene.tsx:88`.
- Fix: put the bridge at `y(900)`, or start the slide (`away`) on `both columns` instead of `together`.

### 14. [P3] confusion: in the raw-minutes view of the queues, the shift can't be seen
- When: 565-578 s, beats `ranks` and `welch` (element-1152.jpeg)
- What: on a 0-420 axis, each queue's 37 ordinary tickets sit in about 120px, so B's typical ticket (median 37) does not look any longer than A's (32). The headline says "Outliers swell the noise", but no spread is drawn: only the two means are marked.
- Why it matters: neither "sees nothing" nor "finds the shift" is visible until the rank line appears.
- Cause: `RanksScene.tsx:14` (`X` from 0 to 420 over 1480px) and `RanksScene.tsx:134-148` (means only).
- Fix: break the axis at about 80 minutes (0-80 over 1000px, then a gap, then 270-420), and add each queue's ±1 SD whisker on `swell`.

### 15. [P3] other: hyphens spaced out in every `note()` string
- When: 574-590 s, for example "Welch's t - test" and "Mann - Whitney" (element-1176.jpeg)
- What: the hyphen is set at figure width, which leaves visible gaps on both sides of it.
- Why it matters: it looks like a typo.
- Cause: `video/src/editorial/style.ts:66` (`fontVariantNumeric: "tabular-nums lining-nums"` in `note()`); Inter's `tnum` widens the hyphen too.
- Fix: use `label()` for these word strings, or wrap the words in a span with `fontVariantNumeric: "normal"`.

### 16. [P3] spacing: the 16,000 gridline runs through "14,751"
- When: 381.5-387.0 s, beat `halve` (element-0771.jpeg)
- What: the faint vertical gridline at 16,000 passes between the "7" and the "5" of the end label.
- Why it matters: it is a small visual defect on the scene's key number.
- Cause: `AbScene.tsx:75-86` draws every gridline, including 16,000, from the top of row 0 down to the axis.
- Fix: stop the 16,000 line at the axis (draw only its tick), or set `X.hi` to 18,000.

### 17. [P3] spacing: label sits far from the bars it names
- When: 405.0-410.7 s, beats `inflate` and `t-in` (element-0819.jpeg)
- What: "the rest never got through" floats at x = 220, over empty space left of the histogram, well away from the pale bars it names. It also arrives only about 0.4 s before the whole figure dims for `t-in`.
- Why it matters: the label is hard to tie to its bars and is barely readable before the dim.
- Cause: `CurseScene.tsx:139-143` (`x={X.x0}`, `at={throughAt - 6}`) and `CurseScene.tsx:55` (dim at `tFrom - 4`).
- Fix: anchor the label at the left shoulder of the pale bars (about x 700, `y(BASE) - h(200)`) and cue it on `Only`.

### 18. [P3] spacing: grid polish
- When: 304.0-326.1 s, beats `grid` to `power` (element-0650.jpeg)
- What: the Power cell's tick floats about 200px right of "Power" (x 1540), while the Correct cell's tick sits under its word. "What's true" sits about 15px above the baseline of the "Fail to reject H₀" and "Reject H₀" headers it pairs with.
- Why it matters: the two ticks are placed inconsistently and the header row looks misaligned.
- Cause: `GridScene.tsx:163` (`COL_X[1] + 340`) and `GridScene.tsx:90` (`top: y(330)` against `y(340)` at line 104).
- Fix: place the second tick at `COL_X[1] + 60, cellY(1) + 36 + 52 + 22` to match the first. Set "What's true" to `top: y(340)` with the same baseline as the column headers.

### 19. [P3] confusion: the "big t" note appears 4 s before it is spoken
- When: 413.5-417.6 s, beat `ratio` (sheet-34, tiles 414-417)
- What: "big t: the gap dwarfs the noise" is on screen while the narration is still defining the ratio. The mounds don't move apart until `big` at 417.6 s.
- Why it matters: the screen gets ahead of the narration.
- Cause: `RatioScene.tsx:118` (`at={gapAt + 6}`).
- Fix: cue it at `bigAt`.

### 20. [P3] confusion: unexplained colour and missing figure numbers in the groups scene
- When: 469-473 s, beat `groups` (sheet-39, tiles 469-472); 489-498 s (element-0993.jpeg)
- What: nodes B and D are painted blue until "same process", which suggests two groups differ, but this is never explained. The ring and the warehouse strips carry no "Fig." label, while every other chart from 12 to 20 is numbered.
- Why it matters: the colour invites a reading the narration never supports, and the numbering breaks the pattern.
- Cause: `GroupsScene.tsx:123` (`i % 2 && same < 1 ? DATA : RAW`); there is no `FigLabel` in `GroupsScene.tsx`.
- Fix: draw all five nodes in `RAW` from the start. Add a `FigLabel` "Delivery hours at three warehouses" on `wareAt` and renumber 18-20 to 19-21.

### 21. [P3] explanation: jargon on screen that is never said or defined
- When: 321-324 s "1 − β" (`power`); 374-387 s "users per arm" (`ab`); 477-498 s "ANOVA" (`once`), never expanded; 507-526 s "what independence predicts" (`chi` subtitle; the narration says "no difference"); 571-590 s "Welch's" (`welch`); 532-562 s kicker "Correlation, and when to go nonparametric" ("nonparametric" is never spoken)
- What: terms and notation that appear on screen with no explanation in the narration.
- Why it matters: a beginner gets no anchor for each of these.
- Cause: `GridScene.tsx:157`, `AbScene.tsx:143`, `ChiScene.tsx:92`, `CorrScene.tsx:111`, `RanksScene.tsx:232`.
- Fix: change the chi subtitle to "dashed boxes: what we'd expect if device made no difference". Add "so power is one minus beta" to `power`. Change the kicker to "Correlation, and tests on ranks". Expand ANOVA once on screen ("analysis of variance") under the head.

### 22. [P3] explanation: axes without titles or units
- When: 437-468 s, Fig. 16 (blood pressure ticks 120/140/160 with no "mmHg", while Fig. 17 beside it has one; element-0922.jpeg); 390-410 s, Fig. 15 (x-axis has no "estimated effect, in SDs"; element-0808.jpeg); 533-562 s, Fig. 19 (no x or y on the scatter, although the narration says "y keeps rising", "depends entirely on x"; element-1123.jpeg)
- What: three figures have axes with no title or unit.
- Why it matters: the viewer has to infer what each axis measures.
- Cause: `PairsScene.tsx:92-96`, `CurseScene.tsx:76`, `CorrScene.tsx:162-163`.
- Fix: add a 21px INK_SOFT axis note to each: "mmHg", "estimated effect (SD)", and "x" / "y" at the ends of the scatter axes.

### 23. [P3] accuracy: "yet y follows x exactly" on data drawn "plus a little noise"
- When: 557-562.9 s, beat `ushape` (element-1123.jpeg)
- What: the reading's note says "exactly", but the subtitle three lines away says "y is x squared, plus a little noise", and the scatter visibly scatters around the curve.
- Why it matters: two labels on the same figure contradict each other.
- Cause: `CorrScene.tsx:145`.
- Fix: change the note to "yet y follows x closely" (or "though y depends on x").

### 24. [P3] spacing: power-grid annotations misaligned
- When: 336-351 s, beats `coinflip` and `trade` (element-0700.jpeg)
- What: "47.5% caught it: a coin flip" is indented 40px from the "rejected: 950 of 2,000 runs" line above it. "With the sample fixed" floats about 270px above the seesaw it qualifies.
- Why it matters: the left edges don't line up, and the qualifier looks detached from its chart.
- Cause: `PowerScene.tsx:137` (`x={GRID_X + 40}`) and `PowerScene.tsx:158` (`top: y(330)` against `SEE_BASE = y(760)`).
- Fix: set the Note to `x={GRID_X}`, and place the qualifier at `top: SEE_BASE - h(260)`.

### 25. [P3] confusion: one-word headline "Pair" held for 15 s
- When: 433.6-449.5 s, beats `pairs` and `unpaired` (sheet-36, sheet-37)
- What: the headline reads only "Pair" until "what's paired." arrives on "own change". Other scenes complete their headline within 1-5 s.
- Why it matters: for 15 s the headline looks like an unfinished word or a typo.
- Cause: `PairsScene.tsx:81` (`bAt={ownAt - 6}`).
- Fix: show the whole headline from the start, or use a first half that stands alone ("Before and after,") that completes to "Before and after, pair them."
