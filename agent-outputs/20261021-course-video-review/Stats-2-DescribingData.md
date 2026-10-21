# Stats-2-DescribingData (0-440 s, whole video)

## Verdict
- The video is strong overall. The argument holds together across its four parts, and every number on screen matches `measurements.json` and the lessons: 53.7/53.5 to 139.7/55.0, $23.11/$26.58, SD 1.15 and 17.9, 404.6/543.5, 80.5/100.6, IQR 14, MAD 8, 1 vs 127, fences 6 vs z 2, the Datasaurus stats. Most beats run at 2.2-3.0 words/s, and every scene holds about 1.3 s before its cut.
- The biggest problems are three places where the picture fails the narration:
  - In the n-1 argument, the "any other number" line moves while it is still labelled "sample mean -5.3".
  - In the outlier scene, the outlier is defined over a chart that has no outlier, and the rings pulse on empty paper.
  - The variance working (distance sticks, then squares) is drawn but hidden under the stacked steady dots.
- Several terms are used without being explained: box-plot fences, the z-score rule, n, quartile, ECDF. "The SD leaps" has no starting value, and "the middle half stays put" is said but never shown moving.
- Pacing is mostly comfortable. It is too fast in three places:
  - The Datasaurus cycle shows each of the other nine datasets complete for about 4 frames.
  - The variance and the SD are both introduced in one beat.
  - The outlier "what to do" lines are never read aloud and stay up for about 4.6 s.
- A handful of spacing defects: a label drawn over histogram bars, two rows of text 8-11 px apart, and a label sitting on the reference line.

## Findings

### 1. [P1] accuracy: The n-1 demonstration moves the line but keeps the "sample mean -5.3" label
- When: 163.3-165.5 s, beat `closest` (element-326.jpeg to element-331.jpeg; element-328.jpeg shows it clearly).
- What: On "than any other number", the red center line swings to about -8.3. It is still labelled "sample mean -5.3", and the panel reads "Sum of the squares 455.0, measured from the sample mean". The sum around the sample mean is 404.6. The screen claims the opposite of the point being made.
- Why it matters: This is the key step of the n-1 argument, and the labels say the sample mean gives 455.
- Cause: `video/src/videos/describing-data/DivisorScene.tsx:70-73` adds `wiggle` to `c`. The label at `:186-188` is pinned to `cx` and always prints `DIVISOR.fiveMean`. `:216` switches only on `toTruth`, so it still says "the sample mean".
- Fix:
  - Leave a fixed ghost line at -5.3 with its label.
  - Draw the wiggling line as a second marker labelled "another center" while `wig > 0.05`.
  - Switch `:216` to "measured from another center" during the wiggle.
  - Keep "404.6 at the sample mean" as a fixed reference under the live number, so the viewer sees the live sum rise above it.

### 2. [P1] confusion: "An outlier is far from the rest" is said over a chart with no outlier, and rings pulse on empty space
- When: 300.2-320 s, beats `outlier` and `kinds` (element-604.jpeg, element-626.jpeg, element-628.jpeg).
- What: Fig. 10 promises "two genuine high earners", but only the 200 bulk incomes (5-62) are drawn. On "far", on "real" and on "biggest customer", a blue ring swells at x=200, where there is no dot. The two high earners only drop in at "genuine" (about 320 s).
- Why it matters: The definition and the "something real" example point at nothing, and an empty pulsing circle reads as a glitch.
- Cause: `video/src/videos/describing-data/OutlierScene.tsx:140` fades the planted values in at `genuineAt`. The pulses at `:155-156` and `:225` target `sx(X, 200)` from `farAt`, `kindAt[2]` and `egAt[2]`.
- Fix: Show the planted 120 and 200 from `outlierFrom + 28` (`:140`), so the definition has its far points. In the `flag` beat, pulse them on "genuine" instead of dropping them in.

### 3. [P1] confusion: The variance working is invisible: distance sticks and squares hide under the stacked dots
- When: 127.0-139.7 s, beats `deviations` and `square` (element-264.jpeg, element-276.jpeg, element-278.jpeg).
- What: The axis runs 0-60 over 1,370 px, which is 23 px per minute. The steady deliveries are a 10-dot pyramid 92 px wide.
  - The ±1 and ±2 sticks from the mean are drawn under r=10 dots, so almost nothing shows. Zoomed crops show only 2-3 px pink slivers.
  - The squares are faint 23-46 px tiles behind the dots.
  - The only visible working is the "Distance −2 −1 0 0 +1 +2 0 −1 +1 0" row. It is in raw data order, so no number can be matched to a dot.
- Why it matters: "Take each delivery's distance from the mean" and "square them" is how variance is built, and the figure shows none of it.
- Cause: `video/src/videos/describing-data/DeliveryScene.tsx:13` sets the scale. The sticks and squares Svg (`:165-192`) is painted before, and so under, the dots Svg (`:194-197`). The cells at `:245-273` follow `DELIVERY.deviations` order.
- Fix:
  - On `deviations`, morph the steady row into a zoomed inset (26-34 min over about 900 px, about 110 px/min), one dot per row.
  - Draw the sticks and squares after the dots.
  - Sort the cells and put each one under its dot.
  - Bring the full axis back on `erratic`.

### 4. [P1] spacing: The "most orders" label is printed across the histogram bars
- When: 62.0-64.6 s, beat `orders` (element-124.jpeg to element-129.jpeg; element-126.jpeg).
- What: The grey "most orders" label sits inside the bar block, with "orders" crossing the tallest ($12-14) bar.
- Why it matters: It is an obvious overlap, and the label is hard to read against the blue.
- Cause: `video/src/videos/describing-data/SkewScene.tsx:179` places it at `base - h(150) - 70`, which is below the peak (`peak*unit` is about 290 px).
- Fix: Put it above the peak at `y = base - peak * unit - h(60)`, centred on `sx(X, 14)`. It already fades before the median label needs that space.

### 5. [P2] explanation: Box-plot fences and the z-score rule are never defined
- When: 316.9-339.1 s, beats `flag`, `ordinary` and `verdict` (element-644.jpeg, element-685.jpeg).
- What: The narration says "The box-plot fences flag six points. The z-score rule flags just two." The screen shows "box-plot fence, 43.0" and "z of 3, at 73.2". Neither rule, nor the reason they disagree on skewed data, is explained. The lesson defines both (shape-and-outliers.mdx:271-286).
- Why it matters: Without the definitions, "a flag is a question" rests on two black boxes.
- Cause: `video/src/videos/describing-data/script.ts:269` (the `flag` beat) and the tags at `OutlierScene.tsx:125-135`.
- Fix: Add one sentence after "two genuine high earners": "The fences sit one and a half IQRs past the quartiles. The z-score rule flags anything three standard deviations from the mean." Relabel the tags "Q3 + 1.5 × IQR = 43.0" and "mean + 3 SD = 73.2".

### 6. [P2] explanation: n appears without ever being defined
- When: 173.8-204 s, beats `small`, `measured` and `libs` (element-358.jpeg, element-394.jpeg).
- What: "Divide by n" is the first time the letter is used. The delivery scene said "nine, one less than the count", and the screen then shows "Divided by n, too small", "Divide by n", "by n − 1" and "divides by n − 1".
- Why it matters: A beginner has to infer that n means the number of values, in the densest argument of the video.
- Cause: `video/src/videos/describing-data/script.ts:184` (the `small` beat).
- Fix: Change the line to "Divide by n, the number of values, and you'd underestimate the spread." Or name n in the `variance` beat: "one less than the count, n".

### 7. [P2] explanation: "The SD leaps" has no starting value, and "the middle half stays put" is asserted, not shown
- When: 204.5-224.4 s, beats `incomes`, `sd` and `iqr` (element-425.jpeg, element-432.jpeg, element-448.jpeg).
- What:
  - The tenth income simply appears at 9,000, and the SD counts up from 0. Nothing shows what it leaps from.
  - The IQR is drawn once, so "It's fourteen, whatever the top earner makes" is never demonstrated.
  - The "SD 2,828.4" readout sits over the 9,000 dot, as if it belonged to that point.
- Why it matters: The scene's thesis (one value moves the SD, not the IQR) is told rather than shown.
- Cause: `video/src/videos/describing-data/RobustScene.tsx:64-65` (the tenth dot drops in), `:172-174` (the SD counts from 0), `:101-114` (a static box).
- Fix:
  - Start the tenth income at 130. With it there, SD is 33.1, IQR 14.0 and MAD 8.0.
  - On "nine thousand", slide it out past the axis break while the SD counts 33.1 → 2,828.4 and the IQR box and "IQR 14.0" visibly stay still.
  - Move the SD readout into a fixed stats column, not over the dot.

### 8. [P2] accuracy: Count-up animations show wrong values while the right one is being spoken
- When:
  - 13.9-15.4 s, `centers`: "Mean 42.0k…45.6k…" (element-028.jpeg).
  - 67.8-68.4 s, `mean`: "Mean $23.11", the median's value (element-136.jpeg).
  - 212.0-213.3 s, `sd`: "SD 0.0" for about 1.3 s (element-424.jpeg, element-425.jpeg).
- What: Statistic labels appear first with a placeholder value (the first salary, the median, zero) and then count to the real number.
- Why it matters: "SD 0.0" in particular is a false statement on screen, and it implies the SD was zero before the outlier.
- Cause:
  - `SalaryScene.tsx:80` lerps from `SALARIES.values[0]`.
  - `SkewScene.tsx:112-113` and `:197-199` start at `ORDERS.median`.
  - `RobustScene.tsx:172-174` makes the label visible at `sdAt - 4` but starts the count from 0 at `leapsAt - 4`.
- Fix: Keep the value hidden until the slide or count finishes, then print the final number. For the SD, either count from the pre-outlier 33.1 (see finding 7), or fade the tag in at `leapsAt + 40`.

### 9. [P2] confusion: The band labelled "SD 17.9 min" is two SDs wide
- When: 147-154.4 s, beats `variance` and `erratic` (element-300.jpeg, element-307.jpeg).
- What: The pink band spans mean ± 1 SD (12.1 to 47.9, about 36 min). It is labelled only "SD 17.9 min" at its right end. The steady band works the same way.
- Why it matters: Viewers will read the band's width as the SD and come away thinking the erratic SD is about 36 minutes.
- Cause: `video/src/videos/describing-data/DeliveryScene.tsx:118-141` (the rect from mean−SD to mean+SD) and `:234-236` (the label).
- Fix: Relabel the band "±1 SD: 12 to 48 min", or draw a one-sided bracket from 30 to 47.9 labelled "SD 17.9 min" and drop the band.

### 10. [P2] pacing: The Datasaurus cycle flashes shapes too fast to see
- When:
  - 355.5-359.5 s, beat `plot`: the star is complete for about 0.5 s, the circle and the lines for about 1 s each (element-711.jpeg to element-719.jpeg).
  - 365-372 s, beats `credit` and `lossy`: nine datasets (element-730.jpeg to element-744.jpeg; element-735.jpeg is mid-morph mush labelled "dataset 7 of 13: slant up").
- What: Each of the other nine datasets gets 20 frames, 16 of them morphing, so each is complete for about 4 frames. Most sampled frames show points in transit. The dataset names under the chips are 21 px and change every 0.67 s.
- Why it matters: "Different pictures" is the payoff of the part, and the viewer mostly sees scrambling dots.
- Cause: `video/src/videos/describing-data/DinoScene.tsx:17` (`MORPH = 16`) and `:67` (`restStep = max(MORPH + 4, …)`, which resolves to 20 frames).
- Fix: Replace the nine-step cycle with a 13-panel small-multiples grid on "built the other twelve", with each panel about 160 px and labelled. If the cycle stays, use `restStep ≥ 45` and give the named shapes ≥ 1.2 s each. That needs `script.ts`'s `plot` beat split, with about a 0.5 s pause after "a star".

### 11. [P2] layout: The opening shape panel sits alone at the right edge for 10 s
- When: 244.1-254.4 s, beats `shape` and `right-tail` (element-501.jpeg).
- What: Only the 480 px right-skewed panel is drawn, at x 1270-1750. The left two-thirds of the frame is empty while the narration explains tail versus peak and mean versus median on this one small chart.
- Why it matters: The concept is taught on the smallest figure in the video while most of the frame is empty.
- Cause: `video/src/videos/describing-data/ShapeScene.tsx:14` (fixed `PANEL_X`). The right panel enters at `shapeAt` (`:150`), the other two only at `leftAt` and `symAt` (`:144-145`).
- Fix: Show the right-skewed panel large and centred (about 1,000 px wide) for `shape` and `right-tail`. On "left", shrink it into its triptych slot as the other two arrive.

### 12. [P2] spacing: Rows of text 8-11 px apart, and a label sitting on the true-variance line
- When:
  - 112-154 s: the Fig. 3 title ends at y=361 and "both average 30.0" starts at y=369, an 8 px gap (element-307.jpeg).
  - 285-300 s: "5 more past −12, out to −26" and "3 more past +12, out to +17" end at y=950, and the tick labels start at y=962 (element-597.jpeg).
  - 186-204 s: "80.5, about 20% low" straddles the dashed "true variance 100" line, whose knockout cuts the reference line exactly where the comparison is read (element-394.jpeg).
- Why it matters: The house rule is about 25 px between rows of text. The last case hides the truth marker behind its own label.
- Cause:
  - `DeliveryScene.tsx:199` (tag at `y(STEADY - 80) - 34`).
  - `TailScene.tsx:93-102` (labels at `base + 14`) against `:148-152` (ticks at `heavy + 44`).
  - `DivisorScene.tsx:273-276`.
- Fix:
  - Move the "both average" tag up to `y(330) + 50`, or shift the whole figure down by 20 px.
  - Put the "N more past" labels below the ticks (`base + 76`).
  - Draw a red bracket from the end of the "by n" bar to the dashed line, labelled "about 20% low", left of x=1370, and keep "80.5" alone at the bar end.

### 13. [P2] pacing: Variance and standard deviation are introduced in one beat
- When: 140.0-149.5 s, beat `variance`, followed after 0.40 s by `erratic`.
- What: In 9.5 s the beat delivers the n-1 divisor, the term "variance", "square minutes", the square root and the term "standard deviation", while three on-screen lines build.
- Why it matters: These are the two most important new terms in Part 2, with no breath between them.
- Cause: `video/src/videos/describing-data/script.ts:166`.
- Fix: Split the beat after "that's the variance." with `pauseAfter: 0.6`, and make "Its square root…" its own beat. Raise `pauseAfter` on the second half to 0.6 before `erratic`.

### 14. [P2] pacing: The three "what to do" lines are never narrated and are up for about 4.6 s
- When: 338.5-343.7 s, beats `verdict` and `plot-in` (element-678.jpeg, element-685.jpeg).
- What: "Fix it, or drop it and say why" / "Treat it as missing" / "Keep it, and use robust statistics" (17 words) appear while the narrator says other words, then the scene cuts.
- Why it matters: At about 2 words/s these need about 8.5 s, so most viewers will not finish them.
- Cause: `video/src/videos/describing-data/OutlierScene.tsx:73-74` and `:217-219` (cued at `decideAt`). The script never says them.
- Fix: Either voice them ("…and then decide: fix an error, treat a placeholder as missing, keep what's real.") or bring the action lines in on "kinds" beside each card, where the 11 s beat gives time to read them.

### 15. [P3] confusion: "To compare groups, box plots" is shown with a single box
- When: 411.7-418.4 s, beat `box` (element-852.jpeg).
- What: The panel is subtitled "groups side by side", but there is one box.
- Cause: `video/src/videos/describing-data/WhichScene.tsx:190-215`.
- Fix: Change the subtitle to "a five-number summary", or add a second, offset group box.

### 16. [P3] accuracy: The headline "Square, average, root." contradicts dividing by n-1
- When: 127-154 s (element-307.jpeg).
- What: The working divides by 9, not 10, and the next scene is titled "Why nine, and not ten?".
- Cause: `video/src/videos/describing-data/DeliveryScene.tsx:108-110`.
- Fix: "Square, sum, divide, root." or "Square them, then root."

### 17. [P3] accuracy: "About one point two" is spoken while the screen shows 1.15
- When: 145-154 s, beat `variance` (element-307.jpeg).
- Cause: `DeliveryScene.tsx:232` and `:304` use `fmt(steadySd, 2)`. The script says "about one point two".
- Fix: Print 1.15 → "1.2" (one decimal, as the lesson's pandas output does), or say "about one point one five".

### 18. [P3] explanation: "Q1/Q3", "quartile" and "ECDF" are not defined
- When: 216-224 s (`iqr`) and 404-411 s (`ecdf`).
- What: "First quartile to the third" is not explained beyond "the middle half". "ECDF" is never expanded.
- Cause: `script.ts` beats `iqr` and `ecdf`.
- Fix: Add "the values a quarter and three quarters of the way up" to `iqr`. Subtitle the ECDF panel "empirical cumulative distribution" (`WhichScene.tsx:161`).

### 19. [P3] confusion: The IQR label disappears before "a median goes with the IQR", and no mean is ever drawn
- When: 226-238 s, beats `mad` and `pair` (element-484.jpeg).
- What: "Q1/Q3/IQR 14.0" and the axis ticks fade on "typical distance", leaving an unlabelled box and axis. "Mean with standard deviation / Median with IQR" float unanchored at x=1000, and Fig. 6 has no mean to pair.
- Cause:
  - `RobustScene.tsx:177-186` (out at `typicalAt`).
  - `:138` (ticks × `(1 - sticks)`).
  - `:222-248`.
- Fix: Keep "IQR 14.0" through `pair`, re-show the ticks after the sticks finish, and set the pair lines under the SD and IQR readouts they refer to.

### 20. [P3] other: Leftovers in the salary balance animation
- When: 40-58 s, beats `balance` and `middle` (element-088.jpeg, element-092.jpeg, element-113.jpeg).
- What:
  - The yellow "nobody earns anything near here" band stays to the end of the scene after its label has gone, unexplained.
  - At 43-45 s the dimmed median tick runs down beside the fulcrum triangle.
  - At 46 s the tilted CEO plank crosses the fading "1,000" label.
- Cause: `SalaryScene.tsx:151-162` (the band never exits), `:242-246` and `:262-266`, and `:207-209`.
- Fix:
  - Fade the band out with its label (`out` at `balanceAt - 6`).
  - Hide the median tick while `tilt > 0`.
  - Fade the tick labels fully (`level` to 0) before the tilt starts.

### 21. [P3] typography: Hyphens render spaced in chart labels, and one negative uses a hyphen-minus
- When: 246-344 s: "Left - skewed", "Right - skewed", "Heavy - tailed", "box - plot fence", "z - score: 2 flagged" (element-519.jpeg, element-597.jpeg, element-685.jpeg). Also "sample mean -5.3" at 160-181 s (element-328.jpeg).
- Cause:
  - Most likely `video/src/videos/describing-data/parts.tsx:247`. `fontVariantNumeric: "tabular-nums"` on every `Tag` also gives Inter's hyphen a tabular width. Hyphens in non-Tag text render normally.
  - `DivisorScene.tsx:187` uses `fmt` with ASCII "-", where `TailScene.tsx:95` and `DinoScene.tsx:28` use "−".
- Fix: Apply `tabular-nums` only to numeric tags (a `numeric` prop), and print the sample mean with "−".

### 22. [P3] explanation: "The same ten values, two answers" refers to data the video never shows
- When: 190-204 s, beat `libs` (element-394.jpeg).
- What: `np.std(x)` and `pd.Series(x).std()` act on an unseen x. The previous figures had five values (Fig. 4) or 4,000 samples (Fig. 5).
- Cause: `DivisorScene.tsx:315`.
- Fix: Use the steady deliveries, which are on screen two scenes earlier: numpy 1.10 versus pandas 1.15. Or label it "x = ten values from the lesson".

### 23. [P3] confusion: The Datasaurus table says "the same for all thirteen" while its last digits flicker
- When: 353-373 s (element-716.jpeg, element-735.jpeg).
- What: Values switch between 54.26/54.27, 26.94/26.93 and −0.06/−0.07 as datasets change. The "all thirteen agree to within 0.01" note that explained this fades at "plot".
- Cause: `DinoScene.tsx:191-193`.
- Fix: Keep the "agree to within 0.01" note visible through `credit`, or print the table to one decimal.

### 24. [P3] layout: The "Which plot, when?" scene opens on an almost empty frame
- When: 398.0-401.5 s, beat `plots` (element-800.jpeg).
- What: There is only the headline and "Histogram the shape of one variable". Faint paper-coloured vertical stripes (bin separators drawn before any bar) are visible on the empty paper. The same stripes show above the bars in the bin scene (element-793.jpeg).
- Cause: `WhichScene.tsx:73` (bars at `histAt`, late in the beat) and `:152-154` (separators always drawn). `BinScene.tsx:48-55` draws separators at full `TALLEST` height.
- Fix: Grow the histogram from `plotsFrom + 10`. Clip the separators to each bar's height, or skip them while bars are under 0.05 grown. Re-check after the white-background change.

### 25. [P3] other: Figure-label inconsistencies
- What:
  - The four-plot summary has no Fig. number, although every other figure (1-12) has one.
  - Fig. 7 and Fig. 9 sit 10 px higher than the rest.
  - Fig. 12's label arrives about 3 s after its histogram (378 versus 381 s).
  - "12 ÷ 9 not 12 ÷ 10" stays beside the five-value Fig. 4, where the divisor would be 4.
- Cause:
  - `WhichScene.tsx` has no `FigLabel`.
  - `ShapeScene.tsx:142` and `TailScene.tsx:128` use `y(320)`, not `y(330)`.
  - `BinScene.tsx:132` is cued at `sameAt`.
  - `DivisorScene.tsx:112-115`.
- Fix:
  - Add "Fig. 13 The same thousand values, four ways".
  - Use `y(330)` throughout.
  - Cue Fig. 12 at `histAt - 4`.
  - Fade the "12 ÷ 9" line on "five values".
