# Stats-5-Sampling (279.0-651.0 s: SamplingDistributions from `pop`, CentralLimitTheorem, StandardError; seams at 431.2 s and 521.5 s)

## Verdict
- Solid half overall. Every number on screen matches the narration and the measured lesson output (50.02/18.01, 47.19/20.32, 2.85, the 2.78-2.87 and 5.61-0.72 tables, 40.0/33.8/132.8 and 3.69/4.01/28.73, 9.90/9.91, 4.59/1.76/0.99, 10.58/0.75, 3.50/3.67/3.54, 2/1/0.5/0.2, 8.20/0.22, 7.77-8.63, 0.93). Layouts are clean, and the cues land on their words.
- Biggest problems:
  - Fig. 6 ("Bigger samples") fills in 10 s early, so during the "more samples" beat it shows a wider pile made of smaller samples. That contradicts the scene's point.
  - The CLT part draws every pile of averages in the population's blue, between two parts that teach red = statistic.
  - The standard-error part opens most of its scenes on a near-empty page (the hook alone is 8 s), and the "Every statistic" scene shows 6 s of bare axes.
  - A leader line runs through text at 460-470 s, and "1 averages run past the right edge" is on screen.
- Pacing is comfortable (2.1-3.2 w/s, 1.6 s scene gaps, finished scenes held 1.3-1.6 s). Three spots are rushed: the population's spread in the CLT part is up for about 1.5 s and leaves before its sentence ends; ThumbScene's samples-of-300 panel (about 18 unread words) arrives in its last 2.5 s; and the final interval → test → next run has gaps of 0.35-0.45 s.
- Seams: the parts actually join at 431.2 s (5.3 → 5.4) and 521.5 s (5.4 → 5.5), not at 470/552 s. timeline.txt marks only `scene: true` beats and never a part's first beat, so its 74.3 s `sampling-distributions/any` and 58.1 s `central-limit-theorem/spread` "scenes" are artefacts. Both seams cross-fade cleanly over about 1.9 s of silence. The second one lands on the empty SE hook (finding 5).

## Findings

### 1. [P1] confusion: "Bigger samples" panel fills in during the "more samples" beat, with samples of 10 and a wider pile
- When: 368.3-378.6 s, end of beat `sampling-distributions/trap` and all of `sampling-distributions/more` (element-0737.jpeg, element-0746.jpeg)
- What: Fig. 6 "Bigger samples, 4,000 of them" draws its first state on the word "bigger" of the trap beat: 10 customers per sample, a pile ± $5.61 wide, and the table row "10 | 5.61". The narrator does not reach it until "Make each sample bigger, from ten customers" at 378.6 s. Throughout "Draw more samples… the histogram just gets smoother", the panel titled *Bigger* shows a pile twice as wide as Fig. 5's ± $2.85, built from samples smaller (10) than Fig. 5's 40, under the headline "Only one narrows the spread." Fig. 5 likewise shows its 500 row at 366.6 s, before "five hundred" (about 370 s).
- Why it matters: for 10 s the picture says bigger samples are wider, the opposite of the point, while the narration points at the other panel.
- Cause: `video/src/videos/sampling-distributions/LeversScene.tsx:65` sets `biggerOnesAt = n.word("trap", "bigger")`, which `:86` uses as `bigger.times[0]`. That cue also gates the bars (`:145`), the bracket and ± note (`:170-176`), the table head (`:179`) and row 1 (`:188`). `:64/:79` do the same for `more`.
- Fix: `times: [tenAt, ...between(tenAt + 4, sixFortyAt).slice(1)]` for `bigger` and `[fiveHundredAt, …]` for `more`. Until then, show only the two empty axes and the figure labels.

### 2. [P2] confusion: The CLT part draws averages in blue, between two parts that teach red = statistic
- When: 431.7-521.5 s, the whole CLT part (element-0906.jpeg, element-0938.jpeg, element-0960.jpeg, element-1040.jpeg)
- What: 5.3 colours the population and the sample blue and the averages red, under the red table label "A statistic, one per sample" (element-0720.jpeg). 5.5 does the same: the Fig. 4 pile is red at 588-598 s. In 5.4 every pile of averages (Figs. 2-5) is the same blue as the wait-time population, and red becomes the normal curve. The first average falls as a red block (450-453 s) and turns blue when it lands. The "Samples drawn" counter is blue too.
- Why it matters: in one video, the colour that meant "raw data" for 2.5 minutes suddenly means "averages", and it switches back 90 s later.
- Cause: `video/src/videos/central-limit-theorem/BuildScene.tsx:308-316` (Fig. 2 `<Bars>` with the default `BAR`) and `:329` (counter `BAR`); `ShapesScene.tsx:208-215` (`color={BAR}`); `ThumbScene.tsx:167-175`; `SpreadScene.tsx:113-120`. Compare `sampling-distributions/ThreeScene.tsx:395` and `standard-error/CheckScene.tsx:178`, which use `ACCENT`.
- Fix: draw the 5.4 piles in `ACCENT`, the `NormalCurve`s in `INK` (2.4 px), and the counter in `ACCENT_INK`, as 5.3 and 5.5 do.

### 3. [P2] spacing: The "centered" leader strikes through the "10" tick label and Fig. 2's title
- When: 460.3-469.9 s, beats `central-limit-theorem/bell` and `clt` (element-0938.jpeg)
- What: the red dashed line at 9.88 min runs from Fig. 2's axis up to y≈230. On the way it crosses the "1" of Fig. 1's "10" tick label, the "e" of "each" in "Fig. 2 The average wait in each sample of 30", and the population bars.
- Why it matters: the line visibly cuts through two pieces of text and stays there for about 9 s.
- Cause: `video/src/videos/central-limit-theorem/BuildScene.tsx:353-364` (one `Leader` from `MEANS_BASE` to y 236).
- Fix: draw it as two segments that skip the label bands: from `MEANS_BASE` up to y 640 (the top of the pile, below the Fig. 2 title), and from y 430 (above the tick row) up to 236. Alternatively, end it at the "Centered on 9.88 min" note (y 540).

### 4. [P2] other: "1 averages run past the right edge"
- When: 492.3-494.2 s, beat `central-limit-theorem/heavy` (element-0985.jpeg, panel c)
- What: the on-screen note reads "1 averages run past the right edge", a plural after 1.
- Why it matters: a visible grammar error on screen.
- Cause: `video/src/videos/central-limit-theorem/ThumbScene.tsx:164`: `{r.off} averages run past the right edge`.
- Fix: `{r.off} {r.off === 1 ? "average runs" : "averages run"} past the right edge`.

### 5. [P2] spacing: Standard-error scenes open on a nearly empty page
- When:
  - Hook, 521.9-530.1 s (element-1058.jpeg): two headings and two dangling "the spread of", on an otherwise blank 1920x1080. This is the first thing seen after the seam.
  - `standard-error/one`, 552.0-557.0 s (element-1111.jpeg): a headline plus a 470 px strip of 3.4 px dots squeezed into the top-right corner. The lower half stays empty until 566.6 s.
  - `standard-error/check`, 573.4-576.9 s: the headline alone.
  - `standard-error/ruler`, 619.3-625.3 s: the headline and the illustration only.
- Why it matters: about 20 of the last 130 s show almost nothing while the narration sets up each question.
- Cause:
  - `video/src/videos/standard-error/AgesScene.tsx:129-147`: the Fig. 1 axis and dots are cued to `takeAt`, the first word of beat `sd`.
  - `FormulaScene.tsx:175-208`: the `MINI` scale is 1330-1800 px with r 3.4.
  - `CheckScene.tsx:137,145,147`: the figure is cued to `checkItAt`/`popAt`.
  - `RulerScene.tsx:129,147`: the figure is cued to `timesFrom`.
- Fix:
  - AgesScene: bring the axis and the 200 dots in on `n.word("hook", "spread")` (about 527 s), keeping the brackets on their words.
  - FormulaScene: draw the one-sample strip full width on the X scale at y≈700, where Fig. 2 later sits, and collapse it to its average there.
  - CheckScene: cue the population to `checkFrom`.
  - RulerScene: cue the 120 times to `rulerFrom + 10`.

### 6. [P2] spacing: "Every statistic" scene: 6 s of bare axes, the top one unlabelled
- When: 397.7-404.0 s, beats `sampling-distributions/any` and `kinds` (element-0804.jpeg)
- What: four empty axes appear on "The mean isn't special". Three are labelled Mean/Median/Maximum; the top one has no label until "Population" and its bars arrive on "lopsided" at about 404 s. Nothing else is on screen.
- Why it matters: for 6 s the screen shows an empty scaffold with an unexplained top row while the narrator states the scene's main claim.
- Cause: `video/src/videos/sampling-distributions/AnyScene.tsx:180` (population axis at `meanFirstAt + 2`), `:198` and `:219-225` (row labels and axes at `meanFirstAt + 6/+8`), against `:167-179` (Population label and bars at `lopsidedAt - 4`).
- Fix: cue all four axes and row labels to `lopsidedAt - 6` so they arrive with the population. Until then, the heading carries the beat.

### 7. [P2] pacing: The population's spread is on screen about 1.5 s and leaves mid-sentence
- When: 444.4-446.5 s, beat `central-limit-theorem/center` (element-0889.jpeg → element-0892.jpeg)
- What: "Spread 9.91 min, one standard deviation" inks at about 444.4 s. The whole first layout (average, spread, the one-in-twenty note, the headline and the illustration) starts fading at 445.9 s, while the narrator is still saying "…about ten minutes too" (the beat ends at 446.1 s). The page then morphs during the 0.5 s gap.
- Why it matters: this σ is what the σ ÷ √n rule is built on 60 s later.
- Cause: `video/src/videos/central-limit-theorem/BuildScene.tsx:106-110` (`morphAt = sampleFrom - 14`, `p1Out = morphAt - 6`) and `:265-288` (`out={p1Out}`); `central-limit-theorem/script.ts` gives `center` a `pauseAfter` of only 0.5.
- Fix: set `pauseAfter: 1.3` on `center` and `p1Out = sampleFrom - 4`, so the finished figure holds at least 1 s after the sentence.

### 8. [P2] pacing: The samples-of-300 panel lands in the scene's last 2.5 s
- When: 491.0-493.9 s, beat `central-limit-theorem/heavy` (element-0985.jpeg)
- What: row c ("Income, samples of 300"), its curve, "Close to the bell at 300 / skewness 0.7" and the run-past note (about 18 unread words, and the scene's resolution) arrive from "HUNDREDS" onward. The cut comes about 1.6 s after the last tag, and the narration never says "300".
- Why it matters: the scene's resolution is on screen for less time than it takes to read.
- Cause: `video/src/videos/central-limit-theorem/ThumbScene.tsx:79` (`cues[2]`: `hundredsAt`, `bellAt - 8`, `bellAt`) and `:163`; `heavy` has `pauseAfter` 0.55.
- Fix: add a beat after `heavy`, such as "At three hundred, it's close to a bell.", and cue row c to it. Failing that, set `pauseAfter: 2.5` on `heavy`.

### 9. [P2] explanation: σ ÷ √n becomes s ÷ √n with no word about why
- When:
  - 509-521 s, `central-limit-theorem/rule`: "= σ ÷ √n, σ the population's spread".
  - 556.9-566.5 s, `standard-error/divide` and `numbers`: "s ÷ √n, s the standard deviation of the sample".
  - 591-597 s, `standard-error/match`: "From one sample, s ÷ √50 → 3.67" beside "Theory, 25 ÷ √50: 3.54" (element-1145.jpeg, element-1194.jpeg).
- What: 35 s apart, the same rule is written with two symbols. The narration never says that the sample's s stands in for the unknown σ. That is the actual answer to the beat's own question ("how can you measure that, when you've only ever seen one average?"), and the lesson says it (`standard-error.mdx:57`, "your estimate of σ"). In the check, the one sample's s (about 25.97) is never shown, so 3.67 has no visible derivation.
- Why it matters: the step that makes the one-sample shortcut work is skipped, and the symbol change goes unexplained.
- Cause: `video/src/videos/standard-error/script.ts` beat `divide`; `FormulaScene.tsx:94-99` (the Definitions); `CheckScene.tsx:226-240`.
- Fix:
  - Make `divide` say "Divide the sample's standard deviation, standing in for the population's, by the square root of the sample size."
  - Make the s Definition read "the standard deviation of the sample, our stand-in for σ".
  - In CheckScene, label the estimate row "From one sample: s = 25.97, ÷ √50".

### 10. [P2] pacing: Interval and test arrive back to back at the very end
- When: 625.6-648.6 s, beats `standard-error/times` (2.98 w/s), `interval` (2.88 w/s), `test` (3.19 w/s) and `next`, with gaps of 0.35, 0.40 and 0.45 s (element-1280.jpeg, element-1290.jpeg)
- What: each beat brings a new idea: the 120 times, 8.2 s and SE 0.22 with a zoom into a ruler; a confidence interval; then a test measured in standard errors. There is under half a second between them. "0.93 standard errors away" appears at about 644.8 s, 1 s before "Next" starts, and the tested value (8.0 s) is never spoken.
- Why it matters: two of the course's biggest ideas get one sentence each with no time to absorb either.
- Cause: `video/src/videos/standard-error/script.ts`, `pauseAfter` 0.35/0.4/0.45 on `times`/`interval`/`test`; `RulerScene.tsx:276-281`.
- Fix: `pauseAfter` 0.9 on `times` and `interval` and 1.0 on `test`. Extend `test` with "…here eight seconds: under one standard error away."

### 11. [P3] explanation: σ heads a column 14 s before it is defined; "n" and "skewness" are never defined
- When:
  - The "σ ÷ √n" header is up from 494.7 s; σ is defined at 509.5 s (element-0996.jpeg).
  - "the n ≥ 30 rule" appears at 483 s.
  - "skewness 0.2 / 4.4; a bell is 0 / 0.7" appears at 484-494 s.
- Why it matters: notation shows up before, or without, its definition.
- Cause: `video/src/videos/central-limit-theorem/SpreadScene.tsx:171-180` (header at `start + 14`) against `:272`; `ThumbScene.tsx:134-136` and `:82-84`.
- Fix: ink the σ ÷ √n header at `rootAt`, where `:184` already reveals the theory values. Write the rule as "the 30-or-more rule". Write the tags as "lopsidedness (skewness) 4.4; a bell is 0".

### 12. [P3] spacing: Cost-scene captions run together
- When: 602-619 s, beats `standard-error/curve` to `hundred` (element-1236.jpeg)
- What: "error 2.0" and "error 1.0" are 16 px apart and read as one line; "error 1.0" and "error 0.5" are 35 px apart.
- Why it matters: the labels for separate columns read as one run of text.
- Cause: `video/src/videos/standard-error/CostScene.tsx:82-87` (group x at 1200, 1300, 1418, 1576) with the labels at `:204-207`.
- Fix: x at 1160, 1290, 1420 and 1560. That leaves at least 45 px between captions, and the 10x10 block still ends inside 1800.

### 13. [P3] spacing: Six labels packed into 120 px above the ages' average
- When: 546-552 s, beat `standard-error/se` (element-1102.jpeg)
- What: "its sampling distribution", the bell, "average 40.63", the ±0.75 bracket, "± 0.75 years" and "one standard error" all sit between y 340 and y 460. The bell's base is about 15 px above "average 40.63", and its peak is level with the Fig. 1 title.
- Why it matters: the cluster is cramped and harder to read than the rest of the scene.
- Cause: `video/src/videos/standard-error/AgesScene.tsx:33-36` (`SE_Y` 404, `BELL_BASE` 382, `BELL_H` 50) and `:179-197`.
- Fix: fade "average 40.63" out at `howFarAt` (the number is never spoken), and move `SD_Y` to 500 and `SE_Y` to 420 so the rows keep about 25 px apart.

### 14. [P3] other: Figure numbers restart twice inside one video
- When: Fig. 7 at 402 s, then Fig. 1 again at 432 s (CLT) up to Fig. 5, then Fig. 1 again at 531 s (SE) up to Fig. 7. "Fig. 5" names three different charts, and "Fig. 1" appears three times.
- Why it matters: viewers expect figure numbers to run through one video.
- Cause: each part's `FigLabel n` is hard-coded (for example `central-limit-theorem/BuildScene.tsx:213`, `standard-error/AgesScene.tsx:129`), and `video/src/videos/sampling/merged.ts` gives the parts no figure offset.
- Fix: add `figOffset` to `MergedPart` (the running total of the earlier parts' figures; 5.3 alone uses 7 and 5.4 uses 5) and have `FigLabel` add `useMergedPart()?.figOffset ?? 0`.

### 15. [P3] confusion: "On one axis" is not a reveal: the rows have shared one axis for 22 s
- When: 334.9-340.7 s, beat `sampling-distributions/compare` (element-0666.jpeg against element-0680.jpeg)
- What: Figs. 2-4 have been on the same $0-$100 axis since 313 s. On "On one axis, the widths tell them apart", only faint gridlines and the heading change. "On their own axes, these three looked alike" refers back to Fig. 1, last seen 56 s earlier.
- Why it matters: the line promises a change the screen never makes.
- Cause: `video/src/videos/sampling-distributions/ThreeScene.tsx:387` (the Fig. 4 axis uses the shared `X` from `thirdFrom`) and `:436-458`.
- Fix: build the pile on its own zoomed $40-$60 axis during `third`/`pile`, then animate it out to $0-$100 on "one axis". That is the reveal the line promises.

### 16. [P3] confusion: CLT Figs. 3 and 4 zoom each pile of averages to fill its panel, just after "own axes look alike"
- When: 470-494 s (element-0960.jpeg, element-0985.jpeg)
- What: in panel A the waits run 0-50 min and their averages 3-17 min, yet both fill the same 500 px, so the averages look as wide as the data. Ninety seconds earlier, 5.3 called exactly this the trap. The spreads appear only as small numbers.
- Why it matters: the picture invites the misreading 5.3 just warned about.
- Cause: `video/src/videos/central-limit-theorem/ShapesScene.tsx:61-79` (`mLo`/`mHi` per column); `ThumbScene.tsx:25-33` (a range per row).
- Fix: tag each lower axis "zoomed in ×3.5" (the factor per panel), or draw panel A's and C's averages on their population's axis.

### 17. [P3] explanation: An axis without units and an ambiguous figure title
- When: 402-431 s (element-0848.jpeg) and 362-395 s
- What: AnyScene's 0-300 axis for "a lopsided population, like incomes" has no unit. "Fig. 6 Bigger samples, 4,000 of them" reads as 4,000 customers.
- Why it matters: the viewer has to guess what the numbers count.
- Cause: `video/src/videos/sampling-distributions/AnyScene.tsx:219-225` (`Axis` with no `format`); `LeversScene.tsx:120`.
- Fix: format the last tick as "300 ($k)" or "300 units". Retitle Fig. 6 "Bigger samples, 4,000 samples at each size".

### 18. [P3] spacing: Ruler: the interval splits the red "−2", and the tested-value line doubles the −1 tick
- When: 633-651 s, beats `standard-error/interval` to `next` (element-1300.jpeg)
- What: the shading and bracket start at −1.96 SE, which falls between the "−" and the "2" of the red label. The tested-value line at −0.93 SE sits 8 px from the −1 tick and reads as a doubled tick.
- Why it matters: small visual collisions on the video's final frame, which stays up for 5 s.
- Cause: `video/src/videos/standard-error/RulerScene.tsx:222-235` (from `TIMES.lo`) and `:257-265` (the upper rule segment inside the ruler).
- Fix: drop the upper segment and mark the tested value with a small triangle on the ruler's top edge. Start the shading at `rx(TIMES.mean - 2 * TIMES.se)` (the label already says "rough").

### 19. [P3] other: The fast-build sample dots are lost on the population bars
- When: 323-330 s, beats `sampling-distributions/repeat` and `pile` (element-0653.jpeg)
- What: each new sample's 40 customers flicker as dark-blue dots at 60% opacity, on top of the bright-blue population bars. Inside the bars they are barely visible.
- Why it matters: the animation that shows "each block is a sample" is hard to see.
- Cause: `video/src/videos/sampling-distributions/ThreeScene.tsx:91` (`stripY` inside the bars) and `:721-731` (`FastDots`, opacity 0.6).
- Fix: draw the strip just below the Fig. 2 axis (y≈POP_ROW.base+40), as CLT's BuildScene does with `STRIP_Y`, at full opacity with a `PAPER` stroke.
