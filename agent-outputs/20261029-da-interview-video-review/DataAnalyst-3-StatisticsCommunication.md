# DataAnalyst-3-StatisticsCommunication (8:17)

## Verdict
- A clean, accurate video. Every spoken and shown number matches `results.json` and the page: 23.11/26.58/181, r = 0.57/0.88/0.61/0.08, 0.00/0.81/1.00, 5.98/6.56/22.6%, 3.0% to 3.6%, Q1 10, Q3 13, p90 154.8, fences 5.5/17.5, z 2.18/2.32, 250/15.81. Figures are big, nothing is under 19px, nothing overlaps, and the animations are cued to the words.
- The biggest problems:
  - The rapid round defines variance as "the average squared distance from the mean", draws deviations whose squares average 200, and then reports 250. The n - 1 that reconciles them is a grey footnote.
  - Two correct statements are struck through in red: r = 0.57 and the 95% confidence interval.
  - Questions 5 and 7 build the evidence and then stop before the conclusion an interviewer asks for: the likeliest driver of the metric, and which outlier rule to use.
- Further answer gaps: the normal distribution answer skips "why it matters for analysts", and the population/sample figure puts all three samples on one side of the truth, which is the picture question 4 taught as bias.
- Pacing is comfortable, mostly 2.3 to 2.9 w/s. The exceptions:
  - Questions 9 and 10 run from the question straight into the answer, with 0.04 s between them.
  - Two long stretches show a single element: `coef-r` and `bias-who`.
  - The page is blank for about 3 s before question 8.
- As interview answers the ten deep dives hold up and follow the page closely. What is missing is the last step each one sets up.

## Findings

### 1. [P1] accuracy: variance defined as the average squared distance, shown as 250 when that average is 200
- When: 428.3-443.1 s, beat `r-var` (element-442.jpeg)
- What:
  - Screen and narration define variance as "the average squared distance from the mean" and draw the deviations -20, -10, 0, +10, +20. Their squares average 1,000 / 5 = 200.
  - The next line reads "10 to 50: variance 250, standard deviation 15.81" (√200 is 14.14).
  - Only the grey "pandas divides by n − 1" hints at why. Nothing shows that 250 = 1,000 / 4, or says why a sample divides by n - 1.
  - "10 to 50" also reads as every integer from 10 to 50.
- Why it matters: A viewer who does the arithmetic finds that the definition and the number disagree. One who doesn't learns a wrong average. "Why n - 1?" is the follow-up every interviewer asks here.
- Cause: `video/src/videos/da-statistics-communication/script.ts:300-302` (beat text); `RapidScene.tsx:115-135` (definition at 117, number at 128, footnote at 135).
- Fix:
  - On screen: "squared distances: 400 + 100 + 0 + 100 + 400 = 1,000", then "÷ 5 = 200 (population)" and "÷ 4 = 250 (sample: pandas `.var()`, n − 1)".
  - Re-voice: "Ten, twenty, thirty, forty and fifty: the squared distances add to a thousand. Divide by five, and it's two hundred. Pandas treats it as a sample and divides by n minus one, four, for two fifty, because a sample's own mean sits closer to its points than the true mean does. The square root is fifteen point eight one."

### 2. [P2] confusion: two correct statements struck through in red
- When: from 93.2 s, beat `corr-fixed` (element-109.jpeg); from 387.6 s, beat `plain-jargon` (element-396.jpeg)
- What:
  - At "Hold temperature fixed", "r = 0.57" over the ice-cream/drownings link is struck through.
  - At "Instead of", "95% confidence interval: [8%, 16%]" is struck through.
  - Both statements are true. The raw correlation is still 0.57; 0.08 is a different quantity (with temperature held fixed). The interval is right; the green sentence only says the same thing in plain words.
- Why it matters: A strike reads as "this is wrong". The viewer can conclude that the 0.57 was miscomputed, or that the interval is false.
- Cause: `CorrScene.tsx:166` (`<Strike at={fixedAt}>`); `PresentScene.tsx:256-258` (`<Strike at={insteadAt + 4}>`).
- Fix:
  - Corr: drop the strike. At `fixedAt`, fade the label to INK_SOFT and relabel it "raw r = 0.57", keeping "0.08 / with temperature held fixed" under the line as now.
  - Plain: drop the strike. Prefix the interval with "jargon:" in INK_SOFT, and put "say:" before the green sentence.

### 3. [P2] answer: question 5 says "finish with the most likely driver" and never names one for its own example
- When: 227.8-247.0 s, beats `metric-denom` and `metric-end` (element-250.jpeg)
- What:
  - The table shows sessions 10,000 → 8,000, orders 300 → 288, conversion 3.0% → 3.6%. The narration ends on "The rate rose because the traffic dropped", then gives the generic "Finish with the most likely driver, and what you'd check next."
  - The example never does that. The 2,000 lost sessions carried only 12 orders (0.6% conversion), so low-intent traffic left, and orders, the number that pays, went down.
  - "+20%" is a relative change: 0.6 percentage points. That is the first thing an interviewer clarifies, and it sits next to a "-20%" that is a change in a count.
- Why it matters: "So what's driving it, and what would you check?" is the point of the question, and the video stops one sentence short of it.
- Cause: `script.ts:194-201`; `MetricScene.tsx:153-163`.
- Fix:
  - Extend `metric-end`: "Here, two thousand sessions left, carrying only twelve orders. The likeliest driver is low-intent traffic dropping away: a paused campaign, or bots newly filtered out. Check sessions by channel next, and say plainly that orders fell."
  - On screen under the table: "lost: 2,000 sessions, 12 orders (0.6%)" and "check next: sessions by channel". Label the conversion change "+20% (+0.6 points)".

### 4. [P2] answer: question 7 shows the z-score failing and never says what to use instead
- When: 316.4-343.3 s, beats `outlier-z`, `outlier-mask` and `outlier-look` (element-342.jpeg)
- What:
  - The figure shows the IQR fences catching 190 and 200 while |z| > 3 catches nothing ("the outliers hide themselves").
  - The narration then goes to "Either way, look before you delete" and never draws the conclusion: on small or skewed data, use the IQR rule or a median-based z-score, because quartiles don't move when the outliers do.
  - It never names the effect: masking.
- Why it matters: "So which would you use?" is the immediate follow-up, and the scene has already built the evidence for the answer.
- Cause: `script.ts:243-250`; `QuantileScene.tsx:319-321` (the "hide themselves" note).
- Fix: Insert before `outlier-look`: "That's called masking. On small or skewed data, use the IQR rule, or a z-score built on the median: quartiles don't move when the outliers do." Change the note to "the outliers hide themselves: masking".

### 5. [P2] answer: the normal distribution answer skips "why it matters for analysts"
- When: 453.4-466.1 s, beat `r-normal` (element-465.jpeg)
- What: The page asks "What is a normal distribution and why does it matter for analysts?" and gives most of its answer to the second half. Normal approximations underpin common procedures, and non-normal raw data does not automatically invalidate a test. The video gives the bell and the 68-95-99.7 rule only.
- Why it matters: Half the question goes unanswered, and "why should I care?" is what separates an analyst's answer from a definition.
- Cause: `script.ts:308-310`; `RapidScene.tsx:195-250` (`Normal`).
- Fix:
  - Append to `r-normal`: "It matters because the averages of big samples come out close to normal even when the data isn't, like the orders in question one, and that is what confidence intervals and A B tests lean on."
  - Add one line on screen: "why it matters: sample means are near-normal, so intervals and tests work".

### 6. [P2] confusion: all three samples land above the population mean, which reads as bias
- When: 466.7-496.7 s, beats `r-pop` and `next` (element-495.jpeg)
- What:
  - Samples of 50 average 52.1, 51.8 and 51.1, all to the right of the population's 50.2: 0.6 to 1.3 standard errors high (SE = 10/√50 ≈ 1.4).
  - Five minutes after question 4 drew survey results piling up on one side of the truth and called it bias, this is the same picture.
  - The axis has no title (`check.mjs` calls the values order values), and "sampling error", the page's term, is never said.
- Why it matters: The point is that samples scatter around the truth, but the drawing shows them sitting to one side of it.
- Cause: `check.mjs:245-251` (seed 5, three draws); `RapidScene.tsx:276-303`.
- Fix:
  - Pick a seed whose three means straddle 50.2, or draw 20 sample means as a dot strip, like the page's `one-population-many-samples` chart.
  - Add the axis title "average order value, $".
  - Re-voice the end of `r-pop`: "each is off by a dollar or two, in either direction. That's sampling error."

### 7. [P3] accuracy: the 68-95-99.7 rule shown as simulated 68.1% and 95.5%, read aloud as 68 and 95
- When: 453.4-466.1 s, beat `r-normal` (element-465.jpeg)
- What: Under a smooth theoretical curve, whose areas are 68.3%, 95.4% and 99.7%, the labels read "within 1 SD: 68.1%", "within 2 SD: 95.5%" and "within 3 SD: 99.7%", with "in 100,000 draws". The narration says "sixty-eight" and "ninety-five".
- Why it matters: The viewer gets two versions of the rule's numbers, and the one on screen is sampling noise around the exact values.
- Cause: `check.mjs:236-240` (random draws); `RapidScene.tsx:238-244`.
- Fix: Compute the exact areas (`math.erf(k / math.sqrt(2))`), show "68.3%, 95.4%, 99.7%", and drop "in 100,000 draws".

### 8. [P3] confusion: Spearman is marked on the "Pearson's r" scale, and the U is left looking fixable
- When: 135.4-153.3 s, beat `coef-curve` (element-152.jpeg)
- What:
  - "Spearman: 1.00" is planted on the number line labelled "Pearson's r".
  - The U is never revisited. Spearman scores it -0.01 as well (`results.json` `uSpearman`), so a viewer can leave thinking Spearman rescues any curve.
- Cause: `CoefScene.tsx:144-146` (scale label), `CoefScene.tsx:164-166` (Spearman marker).
- Fix: Relabel the scale "coefficient, −1 to 1". Add "Spearman: −0.01" under the U marker in the same red. Append to `coef-curve`: "Neither one sees the U, which is why you plot it first."

### 9. [P3] explanation: four terms used without the half-sentence that makes them usable
- When and what:
  - 93.2 s, `corr-fixed`: "Hold temperature fixed". The video never says how; it is the residual correlation after a fit on temperature.
  - 147.7 s, `coef-curve`: "ordinal" is never defined.
  - 200.0 s, `bias-bigger`: "stratified" is never defined.
  - 291.3 s, `quantile-p90`: "Pandas interpolates between fourteen and one ninety" never says why that gives 154.8. The 90th percentile sits at position 0.9 × 12 = 10.8, so it is 80% of the way from 14 to 190.
- Why it matters: These are the words an interviewer asks you to unpack.
- Cause: `script.ts:128-131`, `script.ts:151-153`, `script.ts:175-177`, `script.ts:223-226`.
- Fix:
  - "compare days of the same temperature".
  - "ordinal, ranked categories like a one-to-five rating".
  - "stratified, a fixed share from each group, say new and long-time users".
  - "eighty percent of the way from fourteen to one ninety", with an "80%" label under the bracket at `QuantileScene.tsx:246`.

### 10. [P3] pacing: questions 9 and 10 run straight from the question into the answer
- When: 378.8 s, beat `plain`; 402.8 s, beat `uncertain`
- What:
  - Each question shares a beat with its first answer. There are 0.04 s between "plain language?" and "Anchor it", and 0.04 s between "uncertainty?" and "Say what". Every other question gets a 0.6 s pause before its answer.
  - Question 10's card reads "How do you communicate uncertainty in a data finding?", but the narration stops at "uncertainty?".
- Cause: `script.ts:272-275` and `script.ts:282-285`; `PresentScene.tsx:132` (card text).
- Fix:
  - Split `plain` after "plain language?" into `plain` (pauseAfter 0.6) and `plain-anchor`.
  - Split `uncertain` after "in a data finding?", adding those words to the narration, into `uncertain` (pauseAfter 0.6) and `uncertain-rests`.
  - Move the cues `anchorAt` and `twelveAt` (`PresentScene.tsx:81-82`) and `restsAt`, `daysAt`, `pointAt` and `assumeAt` (`PresentScene.tsx:90-93`) to the new beats.

### 11. [P3] spacing: two long stretches with one element on screen while the narration explains
- When:
  - 117.0-130.6 s, `coef-r` (tiles 118, 123, 127): two lines of text and an empty number line in the top third, with the lower 60% of the frame empty for 13 s.
  - 158.9-174.6 s, `bias-who` (element-166.jpeg): only the users bar, in the top third, for 16 s.
- Cause: `CoefScene.tsx:116-149`; `BiasScene.tsx:89-130`.
- Fix:
  - `coef-r`: at "a number for it", put a miniature of the question 2 scatter in the lower right and mark r = 0.57 on the scale, so "the coefficient" has a number before the U arrives.
  - `bias-who`: at "the unhappiest", draw two short dot strips of satisfaction scores on a 0-10 axis under the bar, churned (red) left of stayed (blue). That is the evidence for "mostly the unhappiest".

### 12. [P3] other: a blank page before question 8, and a bridge with nothing new on screen
- When and what:
  - 346.8-349.9 s, `present-in`: the quantile scene fades itself out at "saying it out loud". The page is empty for about 1.6 s, then holds only "Question 8" until the question types. Every other cut keeps the previous figure up through the gap.
  - 483.4-491.8 s, `next`: the population figure holds for 8.4 s while the narration names rankings, running totals and the latest row per customer. "Next: advanced SQL" only types at "Next".
- Cause: `QuantileScene.tsx:163` (the fade wrapper); `RapidScene.tsx:359` (`NextLine at={nextAt}`).
- Fix:
  - Remove the fade at line 163 and let the Scene cross-fade.
  - Cue the NextLine at "Back to SQL", and type the three items under it as they are named.

### 13. [P3] spacing: the number that carries the finding is orphaned on its own line
- When: from 359 s (element-396.jpeg); from 389 s (element-396.jpeg)
- What:
  - The slide title breaks as "The new design lifts purchases by about / 12%". This is the slide that demonstrates "put the takeaway in the title".
  - Question 9's green quote ends "between 8% and / 16%.”".
- Cause: `PresentScene.tsx:169-173` (`headline(38)` in a 680px box); `PresentScene.tsx:261-264` (width 860).
- Fix: Add `textWrap: "balance"` to both. Better for the title: shorten it to "New design lifts purchases about 12%", which fits on one line.

### 14. [P3] spacing: "Appendix: the method" touches the front slide's bottom border
- When: from 371.5 s (element-396.jpeg)
- What: The label's cap height is about 3px under the front card's border (border at y≈832, label at ≈835).
- Cause: `PresentScene.tsx:140-151` (back card offset 36px, label `bottom: 14`).
- Fix: Offset the back card by 52px (`left: sx + 52`, `top: sy + 52`) so the label gets its own strip, or set the label to `bottom: 6`.

### 15. [P3] spacing: dots for days with no drownings are drawn below the x axis
- When: 72-110 s (element-109.jpeg)
- What: Days with 0 drownings are jittered by ±0.25, so about half of them sit up to 9px below the axis line, as negative drownings.
- Cause: `CorrScene.tsx:32-35` and `CorrScene.tsx:92`.
- Fix: Jitter zeros upward only: `drown === 0 ? Math.abs(JITTER[i]) : JITTER[i]`.

### 16. [P3] spacing: the bias scene's "the fix" note runs into the axis row
- When: 199.6-207.3 s (element-206.jpeg)
- What: The note wraps to three lines. Its last line, "everyone", sits on the tick-label row, 25px right of "7.6", and reads as part of the axis.
- Cause: `BiasScene.tsx:184-186` (y = third row + h(40), width 290).
- Fix: Width 400, so it wraps to two lines, at `y(ROWS[2].y) + h(28)`.

### 17. [P3] confusion: red used on correct results
- When and what:
  - 304-343 s: "fence 5.5" and "fence 17.5" and their lines. The IQR rule is the method that works here, and red means the trap.
  - 288-299 s: "90th percentile 154.8".
  - 240 s: "because the traffic dropped", which is the right diagnosis.
- Cause: `QuantileScene.tsx:246-250` and `QuantileScene.tsx:273-276`; `MetricScene.tsx:155`.
- Fix:
  - Draw the fences and the p90 marker in INK; the 14 and 190 cells already carry the yellow highlight.
  - Set "because the traffic dropped" in INK bold, and keep the red on the -20% cell.

### 18. [P3] explanation: "two modes" said over a chart that cannot show two modes
- When: 450.2 s, beat `r-mode` (tile 451)
- What: "two modes? a reason to split the data" sits under a bar chart of ticket types that has one mode. For categories, two modes would just be a tie. The page means a distribution with two peaks, which suggests two subpopulations.
- Cause: `script.ts:304-306`; `RapidScene.tsx:186-188`.
- Fix: Say "Two peaks in a distribution, say a cluster of small baskets and one of large, are a reason to check for two groups". On screen: "two peaks? check for two groups".

### 19. [P3] answer: smaller follow-ups left open
- When and what:
  - 51.6-60.9 s, question 1: never says when the mean is still the right number: anything that has to sum, since revenue = mean order × orders.
  - 93.2-108.9 s, question 2: the page names coincidence as the other explanation. Reverse causation is also missing.
  - 184.5-202.5 s, question 4: never says what to do when the churned users cannot be surveyed: weight the respondents, or run an exit survey.
- Cause: `script.ts:104-107`, `script.ts:128-131`, `script.ts:175-177`.
- Fix: Add one clause to each:
  - `median-both`: "and the mean when you need a total, like revenue".
  - `corr-fixed`: "or the arrow runs backwards, or it's chance".
  - `bias-bigger`: "and when you can't reach them, weight the answers you have".
