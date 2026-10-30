# DataScientist-8-ProductSense (7:23)

## Verdict
- A clean, well-built video. Every number I checked matches `results.json` and the page: the sample sizes (14,751 and 57,763, recomputed by hand), the 8,000-user drop split, the 500,000-a-day estimate, the 2.0 to 2.4 ratio and the 24 of 56 days. No element overlaps, nothing is clipped, and no text is under 19px. Each question card is read word for word.
- The biggest problem is Question 7. The "normal band" it draws is ±2 standard deviations (about ±5.3%), but the screen and the narration only ever say "about ±3%". The test the answer depends on ("a real shift clears the band") then rests on a band the viewer has been given the wrong width for. Question 11's "lifted cooking one to three percent" is also in ambiguous units: the arithmetic only works if it means percentage points of the users the feature reaches.
- As interview answers they mostly hold up, but three stop before the part an interviewer would press on. Question 6 never gets to sizing the drop, fixing it and confirming the recovery. Question 9 names three causal methods without saying what any of them does. Question 10 says the interviewer grades "the sanity check" but never does one.
- Pacing is comfortable (2.3 to 3.1 words/s, and no dense beat introduces a new concept). The two pacing problems: two finished figures (Questions 8 and 10) clear about 1 s after their last element lands, and the page goes completely blank for about 3 s at 328 s.

## Findings

### 1. [P1] accuracy: the "normal band" is ±2 SD (about ±5%) but is labelled and narrated as "about ±3%"
- When: 230.8-249.0 s, beats `noise-band`, `noise-real` (frames element-235.jpeg, element-250.jpeg)
- What: The shaded "its normal band" runs from about 94k to 104.5k around a mean of 99,254 (±5.3%). The note beside it reads "an ordinary day: about ±3%", and the narration says "moves about three percent on an ordinary day, so a two percent dip sits well inside its band." Nothing says the band is two standard deviations wide. Two of the 56 "nothing wrong" days (day 27 at 92,450 and day 50 at 106,001) land outside the band. The very next beat then gives "clears the band" as a sign of a real shift.
- Why it matters: a viewer will take away "band = ±3%" (one SD). By that rule about a quarter of ordinary days would count as real shifts, and the figure contradicts what the narration says.
- Cause: `video/src/videos/ds-product-sense/check.mjs:80` (band = mean ± 2·sd); `NoiseScene.tsx:80-87` draws it, `:118-120` labels it only "its normal band", and `:130-137` prints "about ±3%"; `script.ts:170-172`.
- Fix: Label the band "normal band: ±2 standard deviations (about ±5%)" at `NoiseScene.tsx:119`. Change the narration to "This metric moves about three percent on an ordinary day. Its normal band, two of those swings either side, is about five percent each way, so a two percent dip sits well inside its band." (The cues "about three percent", "a two percent dip" and "well inside its band" all survive.) Open `noise-real` with "A quiet day still clears it now and then, so a real shift persists for days, …" and ring days 27 and 50 when "persists" is spoken.

### 2. [P2] accuracy: Question 11 multiplies reach by a lift whose units are ambiguous
- When: 356.8-381.7 s, beat `impact` (frames element-372.jpeg, element-382.jpeg)
- What: The screen reads "120,000 weekly users reach its screen × 1% to 3%, what similar launches lifted cooking = 1,200 to 3,600 extra weekly cooks." "Lifted cooking 3%" normally means a relative lift, which would apply to the users who already cook (for example 120,000 × 40% × 3%), not to all 120,000. The arithmetic shown only holds if the lift is 1 to 3 percentage points of reached users becoming weekly cooks.
- Why it matters: viewers will repeat the method "reach × lift %" in an interview, and applied to a relative lift it overstates the impact by a factor of 1/baseline.
- Cause: `script.ts:218-222` ("Similar launches lifted cooking one to three percent"); `SizeScene.tsx:178-186`.
- Fix: Narrate "Similar launches turned one to three in every hundred of those users into weekly cooks." On screen, show "× 1 to 3 in 100 become weekly cooks (similar launches)". Update the cue at `SizeScene.tsx:85` to match.

### 3. [P2] answer: Question 6 stops at "internal or external" and never closes the diagnosis
- When: 209.9-223.0 s, beat `drop-when` (frame element-222.jpeg)
- What: There are four steps, and the last is "Internal or external?" with two chips. Android 5.2 is found, but the answer never says what you then do: confirm the drop is the release (crash and version logs), size it, roll back or hotfix, and watch Android recover. That is the page's last box ("Isolate cause, size the impact, propose fix"). Step 1 also lists what fakes the shape but not how to rule it out (year over year, related metrics).
- Why it matters: "so what would you do now?" is the interviewer's next question in this case, and the video's answer ends before it.
- Cause: `script.ts:157-161`; `DropScene.tsx:55-60` (four steps only).
- Fix: Add a step 5, "Size it, fix it, confirm", at `y(STEPS_TOP) + 4*h(STEP_GAP)` and move the two chips to the right of steps 3-4 (there is room at x≈700). Add a beat after `drop-when`: "Then size it and act: Android is seventy-five hundred of the eight thousand, so roll back five point two and watch Android recover."

### 4. [P2] explanation: Question 9's alternatives are names with no meaning attached
- When: 311.3-324.4 s, beat `cant-instead` (tile at 323 s on sheet-12)
- What: "difference-in-differences", "a synthetic control" and "an interrupted time series" each arrive as a chip about 1.5 s apart, and "switch whole regions / or time slots" also has no explanation. None of them is glossed on screen or in the narration. The right half of the frame below y≈880 and right of x≈1400 is empty.
- Why it matters: naming a method without being able to say what it does is the answer that loses points. An interviewer will ask "how does diff-in-diff work?"
- Cause: `RecScene.tsx:233-249` (chips only); `script.ts:199-201`.
- Fix: Add a 21-22px gloss to the right of each chip (x≈1400): "regions or hours take turns", "change in treated minus change in untreated", "untreated regions weighted into a stand-in", "the trend before vs after". Narrate at least one: "difference-in-differences, which compares how much treated and untreated regions changed". Raise `cant-instead`'s pauseAfter to 1.0.

### 5. [P2] explanation: Question 10 says "the sanity check" is graded but never does one
- When: 349.0-356.7 s, beats `market`, `market-grade` (frame element-355.jpeg)
- What: The result box reads "≈ 500,000 searches a day", then "graded: ✓ the structure ✓ the sanity check ~~the number~~". No sanity check appears on screen or in the narration. The page means checks like round numbers and being within an order of magnitude.
- Why it matters: the video tells viewers that a step is graded but never shows them what the step looks like.
- Cause: `SizeScene.tsx:154-169`; `script.ts:207-216`.
- Fix: Before `market-grade`, add "Sanity check: five hundred thousand searches from five hundred thousand users is one search each a day. Plausible." Show it under the result box at `xOf(4)`, `y(CHAIN.top) + h(CHAIN.h) + h(18)`: "= 1 a feature user a day: plausible".

### 6. [P2] confusion: Question 2's connector points from "unsubscribes" to "sessions ▲", not to "people quietly leave ▼"
- When: 77.5-85.0 s, beats `guard`, `lead-in` (frame element-084.jpeg; tile at 71 s)
- What: The dashed red curve leaves the lit "unsubscribes" chip and ends on the word "sessions" (x≈1050). "people quietly leave ▼" starts at x≈1180. The "unsubscribes" chip is also red from 70.6 s, about 7 s before the narration says why it is singled out.
- Why it matters: the picture links the guardrail to the metric being gamed, not to the harm it catches, which inverts the point of guardrails.
- Cause: `NorthScene.tsx:196-204` (path endpoint `X0 + 950`); `NorthScene.tsx:181` (red ink from the moment the chip appears).
- Fix: Move the endpoint to about `X0 + 1230` so it lands on "people quietly leave", with the control point at about `X0 + 1060, y(RAIL.top) + h(100)`. Draw the chip in `INK` and switch it to `ACCENT_INK` at `leaveAt`, the same moment `lit` fires.

### 7. [P2] spacing: tracked all-caps row labels in the Save for later tree
- When: 154-180 s, beats `save-tree`, `save-not` (frame element-177.jpeg)
- What: "PRIMARY", "SECONDARY", "GUARDRAILS" and "NOT" are set in capitals with 0.06em tracking at 20px.
- Why it matters: this breaks the house rule ("No tracked capitals", sentence-case labels), and these are the only such labels in the video.
- Cause: `SaveScene.tsx:59` (`letterSpacing: "0.06em"`); the strings at `SaveScene.tsx:138, 143, 154, 165`.
- Fix: Use "Primary", "Secondary", "Guardrails" and "Not this", at `label(22, …)` weight 700 with no letterSpacing.

### 8. [P3] answer: Question 3 never says why the distinction matters
- When: 102.3-117.8 s, beat `lead-gap` (frame element-117.jpeg)
- What: The chart shows the 12-week lag, but the narration never states the conclusion the page leads with: lagging numbers tell you too late to act.
- Why it matters: the question card asks "why does the distinction matter?", and the viewer has to infer the answer from the bracket.
- Cause: `script.ts:114-117`.
- Fix: Change it to "Month-three retention doesn't show it for twelve more: twelve weeks too late to act. You steer by the leading line, …" (the cue "doesn't show it for twelve more" survives).

### 9. [P3] answer: Question 5's primary metric measures opening, while the job, and Question 1's north star, is cooking
- When: 155-170 s, beat `save-tree` (frame element-177.jpeg)
- What: The job is "bring people back to cook what they saved". The primary metric is "share of saved recipes opened again within a week". In Question 1 this same app defined value as opening a recipe "in cooking mode".
- Why it matters: an interviewer will point out that "opened" is not "cooked", and the video's own north star draws exactly that line.
- Cause: `SaveScene.tsx:139-141`, `:119`; `script.ts:134`.
- Fix: Change the metric to "share of saved recipes cooked within a week", and the narration to "the share of saved recipes cooked within a week". Update the `weekAt` cue at `SaveScene.tsx:40` and the green note at `:119`.

### 10. [P3] answer: Question 11 never states the decision
- When: 376.4-381.7 s, beat `impact-verdict` (frame element-382.jpeg)
- What: "Even the best case is under a fifth of it. The cheapest experiment is the arithmetic." The page's actual conclusion, to deprioritize before spending engineering time, is left implied.
- Why it matters: the decision is what the sizing is for, and an interviewer wants to hear it said.
- Cause: `script.ts:223-226`.
- Fix: "Even the best case is under a fifth of it, so it goes down the list. The cheapest experiment is the arithmetic."

### 11. [P3] confusion: Question 11's range bar floats for about 3 s before its axis appears
- When: 371-374 s, beat `impact` (frame element-372.jpeg)
- What: A blue rectangle sits alone mid-frame with no axis, no track and no goal while "twelve hundred to thirty-six hundred" is spoken. The axis and the light track only arrive at "against a goal of twenty thousand".
- Why it matters: the number has no scale while it is being said.
- Cause: `SizeScene.tsx:107-108` (`axis` keyed to `goalAt - 6`, `band` to `rangeAt`); `:204` (the track's width is multiplied by `axis`).
- Fix: `const axis = ease(frame, rangeAt - 8, 20)`. Keep the goal label at `goalAt + 4`.

### 12. [P3] confusion: the A/B split is drawn as strict alternation, and B is green
- When: 260-266 s, beat `rec` (tile at 262 s on sheet-10; frame element-294.jpeg)
- What: The queue is pre-colored blue, green, blue, green… and the dots are dealt alternately while the narration says "split at random". Arm B and its dots are green, the series' "right answer" color, before any result exists.
- Why it matters: alternating assignment is a classic wrong answer in an experiment-design question, and green suggests B has already won.
- Cause: `RecScene.tsx:75-85` (`arm = i % 2`); `:116` (`OK` fill for B); `:126, :129` (`OK_INK` box).
- Fix: Take the arms from a fixed seeded sequence (for example `[0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,1,0,0,1]`). Draw queue dots in `INK_SOFT` and color each one only when it lands. Draw arm B in a neutral second hue (`WARM`/`WARM_INK`) in place of green.

### 13. [P3] confusion: "not the value" is set in green
- When: 175-180 s, beat `save-not` (frame element-177.jpeg)
- What: "the interaction, **not the value**", with "not the value" in green.
- Why it matters: in this series green marks the right answer, and here it sits on a phrase that begins with "not".
- Cause: `SaveScene.tsx:182`.
- Fix: Set "the interaction" in `ACCENT_INK` (it is what is wrong with the metric) and "not the value" in `INK`.

### 14. [P3] spacing: labels sitting on chart lines or away from what they label
- When: 98-118 s, beats `lead`, `lead-gap` (frame element-117.jpeg); 419-431 s, beat `r-ratio` (frame element-430.jpeg)
- What: The dotted 20% gridline runs through "month-three retention". The "12 weeks later" bracket is drawn exactly on the 30% gridline. In the ratio, "users -20%" sits under "= 2.4" and not under "80,000 users".
- Why it matters: the labels read as struck through, and the bracket reads as part of the grid.
- Cause: `LeadScene.tsx:163` (`at(ys, 0.22) + h(18)`), `LeadScene.tsx:178` (`y={at(ys, 0.3)}`); `RapidScene.tsx:160-165`.
- Fix: Move the lagging label to `at(ys, 0.255)` (between the line and the 30% grid) and the bracket to `at(ys, 0.325)`. Place "saves -4%" to the right of "192,000 saves" and "users -20%" to the right of "80,000 users" (for example `x = R_X + 700`, at the numerator and denominator rows).

### 15. [P3] pacing: two finished figures are cleared about 1 s after they complete
- When: 294.3-295.6 s, `rec-size` into `cant` (frame element-294.jpeg); 355.6-356.7 s, `market-grade` into `impact` (frame element-355.jpeg)
- What: Question 8's weekend squares light at "so the weekends count" and the whole figure starts fading 1.3 s later. Question 10's strike through "the number" lands about 1 s before everything clears for Question 11.
- Why it matters: the last idea of each figure gets no time to settle before it goes.
- Cause: `script.ts:192` and `script.ts:215` (`pauseAfter: 0.7`); `RecScene.tsx:71` and `SizeScene.tsx:92` clear at the next question's cue.
- Fix: Set `pauseAfter: 1.3` on `rec-size` and `market-grade`.

### 16. [P3] pacing: the page empties during two transitions
- When: 327.8-330.5 s, end of `size-in` (frame element-329.jpeg: fully white); 31.7-33.4 s, end of `north-in` (tile at 32 s: kicker only)
- What: Question 9's headline is inside the `Clear` that runs at "on the spot", so for about 3 s nothing is on screen, through the 1.6 s gap and until the Question 10 card arrives. The hook's headline also leaves at "steers by", leaving only the kicker until the cut. Every other bridge keeps its headline.
- Why it matters: a blank white frame reads as a glitch.
- Cause: `RecScene.tsx:221-224` (QuestionCard 9 inside `<Clear at={spotAt}>`); `HookScene.tsx:123` (`out={steersAt}`).
- Fix: Move QuestionCard 9 outside the `Clear`, giving it `out` at the scene end, as Question 10 handles it. For the hook, use `out={end}`.

### 17. [P3] explanation: the ratio round names "the mix underneath" but shows only the denominator
- When: 413.8-430.6 s, beat `r-ratio` (frame element-430.jpeg)
- What: The example covers the bottom of the ratio only. Simpson's paradox, which the page names, is never mentioned. "Add up counts across groups rather than averaging their ratios" is stated without the reason.
- Why it matters: "the mix" is the case interviewers ask about, and the rule given has no justification.
- Cause: `script.ts:244-247`; `RapidScene.tsx:148-177`.
- Fix: Narrate "…or the mix underneath, which is Simpson's paradox." Add a 21px note under the rule: "an average of ratios weights a group of ten like a group of ten thousand".

### 18. [P3] confusion: the hook's last labels read as captions for the wrong things
- When: 26-32 s, beats `plan`, `north-in` (frame element-031.jpeg)
- What: "the number a whole team steers by" sits above the whole row of 14 squares, at its left edge, so it reads as the row's title, but it refers to the first square only. "no code in this round" shares a row with the highlighted "the one that can say something is wrong".
- Why it matters: two unrelated notes are paired, and the label meant for Question 1 reads as a caption for the whole round.
- Cause: `HookScene.tsx:198-200` (the label at `X0`, `y(SQUARES.top) - h(48)`); `HookScene.tsx:156-161`.
- Fix: Write the label as "first: the number a whole team steers by", with a 20px leader down to square 1. Move "no code in this round" up beside the made-up note at `y(TILE.top) - h(44)`, to the right of it.
