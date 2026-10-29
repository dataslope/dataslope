# DataScientist-2-Probability (7:44, 464.4 s)

## Verdict
- A solid video. Every number said or shown checks out against `results.json` and `probability.mdx`: 1/3, 99 of 594 (17%), 6% and 24% against 15%, 3.5 and 35/12, 0.997, 68/95/99.7, 43%, Poisson(3), 33/67, 253 pairs, 50.7%, 57 people, 42.0 and 0.42 with r = 0.49, and minus 40 cents. All twelve question cards are read word for word, and the bridge into Part 3 matches how Part 3 opens.
- The one obvious visual defect is in the hats figure (Q7). The green "average" line runs straight through the "37%" label, and the green match ring cuts through the person number "5" beneath it.
- Four answers stop short of what the page gives and an interviewer would press on:
  - The birthday answer never shows how 50.7% is computed.
  - Independent vs. mutually exclusive never puts P(A and B) = P(A)P(B) beside P(A and B) = 0.
  - The memoryless chart's shrinking shaded windows are never tied to the constant 43%.
  - Q1 and Q5 strike out the unconditional probability ("P(six) = ~~1/6~~"), which says on screen that P(six) is no longer 1/6.
- Pacing is comfortable overall: about 2.6 words/s, with no gaps under 0.55 s. Three beats run above 3.2 words/s, and two of them carry the hardest ideas: `bayes-when` and `monty-switch`.
- Much of the small text sits at 20 to 23 px. The hat numbers are 15 px, though they are the figure's whole point. A few axis and scale labels are 16 to 18 px.

## Findings

### 1. [P1] spacing: two overlaps in the hats figure
- When: 248-261 s, beats `linear-hats`, `linear-var`, `dist-in` (frames element-253.jpeg, element-258.jpeg).
- What:
  - The green "average 0.997" line is drawn at x = 0.997, which is the centre of bar 1. It runs up through that bar's "37%" label, which then reads as "3|7%".
  - The green ring around person 5 (the one match) crosses the person number "5" printed below it.
- Why it matters: this is the finished state of the scene, it is held for about 8 s, and the struck-through label is the number the line is meant to be compared with.
- Cause:
  - `video/src/videos/ds-probability/ExpectScene.tsx:244-250`: the mean line runs from the baseline to 0.47 x unit at `HATS.mean * HIST.pitch + HIST.w / 2`. That is the same x where `:259-263` centres bar 1's percent label, 32 px above the bar top.
  - `ExpectScene.tsx:208` draws the ring at r = 44 around `py - 6`, so it reaches py + 38. `:217` sets the 20 px person number on a baseline at py + 50, which puts its top at about py + 35.
- Fix:
  - Put the bar percentages inside the bar tops (white `label(20, PAPER)`, 28 px below each top) so the line crosses no text. Alternatively, keep them outside but shift bar 1's label 34 px left.
  - Move the person numbers to py + 64 and the 1/10 notes from `HATS_ROW.y + 70` to `+ 84`.

### 2. [P2] confusion: the unconditional probability is struck out, as if conditioning changed it
- When:
  - 51-64 s, `cond-die` "not one in six" through `cond-rule` (element-062.jpeg).
  - 192-199 s, `excl-die` "to zero" (element-197.jpeg).
- What: the screen reads "P(six) = ~~1/6~~" above "P(six | even) = 1/3", and "P(two) = ~~1/6~~" above "P(two | one) = 0". Taken literally, the notation says P(six) is no longer 1/6. Keeping P(A) and P(A | B) apart is the very distinction Q1 exists to teach.
- Why it matters: a viewer who copies the picture learns that conditioning changes P(A). A candidate who writes it that way on a whiteboard gets corrected.
- Cause: `video/src/videos/ds-probability/CondScene.tsx:125` (`<Strike at={notAt} color={ACCENT}>1/6</Strike>`) and `IndepScene.tsx:217` (`<Strike at={toZeroAt}>`).
- Fix: drop both `Strike`s. Dim "P(six) = 1/6" to `INK_SOFT` and add a small arrow labelled "given even" down to the conditional line. Do the same with "given one" in Q5. The narration can stay as it is.

### 3. [P2] answer: the birthday answer asserts 50.7% without showing how it is computed
- When: 390-409 s, beats `bday-pairs`, `bday-curve` (element-407.jpeg).
- What: the narration says "twenty-three people make two hundred and fifty-three pairs", then "The exact chance is fifty point seven percent". Neither 23 x 22 / 2 nor the complement product appears. The page gives both: $\binom{23}{2}$ and $1 - \frac{365}{365}\cdot\frac{364}{365}\cdots\frac{343}{365}$. The step from "253 pairs" to "about a half" is missing.
- Why it matters: "explain the birthday problem" in an interview means "compute it". The complement trick is the answer being tested, and the video gives only its result.
- Cause: `video/src/videos/ds-probability/script.ts` beats `bday-pairs` and `bday-curve`; `BdayScene.tsx:98-153` shows only "Yes, just.", the pair count and the curve.
- Fix:
  - Add "twenty-three times twenty-two, halved" to `bday-pairs`.
  - Open `bday-curve` with: "Work it through the complement: the chance nobody matches is 365 over 365, times 364 over 365, down to 343 over 365. That's forty-nine point three percent, so a match is fifty point seven."
  - Ink that product under "Yes, just." at `RING.cx`, y(870), cued to "complement".

### 4. [P2] answer: independent and mutually exclusive are never set side by side as P(A)P(B) against 0
- When: 141-199 s, beats `indep` to `excl-die` (element-174.jpeg, element-197.jpeg).
- What:
  - Q4 states independence only as P(A | B) = P(A).
  - Q5 shows only "P(A and B) = 0", because Q4's whole panel is cleared at "Question five". The two conditions are never on screen together.
  - The page's actual answer is "independent: P(A∩B) = P(A)P(B); exclusive: P(A∩B) = 0; two exclusive events with non-zero probability are never independent". The video only implies it ("as far from independent as it gets").
- Why it matters: the product rule and the "never independent" line are what an interviewer is listening for on this question.
- Cause: `video/src/videos/ds-probability/IndepScene.tsx:92-104` (conditional form only); `:56` (`out4 = q5At - 4` clears it); `:207-214` (the exclusive side only).
- Fix:
  - Add an Ink line "equivalently P(A and B) = P(A) P(B)" at X0, y(460) on "the probability of A given B is just the probability of A", and keep it into Q5 (give it `out={clearAt}`).
  - Set "P(A and B) = 0" at y(380) directly opposite it.
  - End `excl-die` with: "So two exclusive events that can each happen are never independent."

### 5. [P2] explanation: the memoryless chart shows shrinking windows beside a constant 43%, unexplained
- When: 306-319 s, beat `memory-wait` (element-318.jpeg).
- What: three shaded windows step down from full height, to 43% high, to 8% high, while the table beside them repeats "43%" three times. Nothing shows that 43% is the curve's height at each window's right edge as a share of its left edge. Read as shapes, the chance looks like it is shrinking. The formula's s and t are never named either.
- Why it matters: the chart seems to contradict the claim it illustrates, and the narration never says how to read it.
- Cause: `video/src/videos/ds-probability/MemoryScene.tsx:84-99` draws each window at height `survive(s)`, with only a dashed line at `survive(s + 10)` and no ratio marked. The formula is at `:62-67`, with no labels for s and t.
- Fix:
  - In each window, fill the part below `survive(s + 10)` in `ds("yellow", 500)` and the rest at 35%, and label the darker part "43% of the bar".
  - Put "already waited" and "more" under s and t.
  - Change the narration to: "Of whoever is still waiting, forty-three percent wait ten more, whether they've waited zero minutes, ten, or thirty."

### 6. [P2] pacing: the crux beats of Bayes and Monty Hall run above 3.2 words/s
- When:
  - `bayes-when` 79.1-90.5 s, 3.25 w/s.
  - `monty-setup` 355.0-364.3 s, 3.20 w/s, then `monty-switch` 364.9-374.5 s, 3.23 w/s.
  - `cond-die` 43.4-52.3 s, 3.39 w/s.
- What:
  - `bayes-when` brings in "you know / you want", the base rate and "that bottom line" in one breath. Meanwhile the total-probability expansion inks in at about 88 s and is never read aloud.
  - `monty-switch` carries the whole argument (1/3 for your pick, the host never opens the car, 2/3 onto one door) with only a 0.6 s gap after it. Both 1/3 and 2/3 brackets animate inside it, at about 366 s and 371 to 373 s.
- Why it matters: these are the two places viewers most often fail to follow, and they are the fastest narration in the video.
- Cause: `video/src/videos/ds-probability/script.ts`, beats `bayes-when`, `monty-switch` and `cond-die`.
- Fix:
  - Split `bayes-when` after "the disease given the test." (pauseAfter 0.6). Make the second half read the formula: "The bottom line is positives among the sick plus positives among the healthy, each weighted by how common they are. That's where the base rate comes in, and where intuition breaks."
  - Split `monty-switch` after "right one time in three." (pauseAfter 0.6).
  - Split `cond-die` after "came up even." (pauseAfter 0.5).

### 7. [P2] spacing: text under 19 px
- When: 244-261 s (hats, element-258.jpeg); 268-297 s (Bernoulli, element-296.jpeg); 413-435 s (covariance, element-434.jpeg).
- What:
  - The hat numbers are 15 px. They are the information the figure exists to show: who got whose hat, and that hat 5 landed on person 5.
  - The Bernoulli "no / yes" labels are 18 px.
  - The scatter's tick labels are 18 px.
  - The correlation scale's "−1 0 1" is 18 px.
  - The parabola's axes are sized at 16 px.
- Why it matters: the house rule is nothing under 19 px at 1080p, and the hat numbers are the figure's evidence.
- Cause: `video/src/videos/ds-probability/ExpectScene.tsx:211-213` (hat rect 44 x 22, `label(15)`); `DistScene.tsx:173` (`label(18)`); `RapidScene.tsx:47` (`size={18}`); `RapidScene.tsx:70` (`label(18)`); `RapidScene.tsx:78` (`size={16}`).
- Fix: make the hat rect 54 x 28 with `label(21)` and raise the hat group 6 px. Use 21 px for "no / yes", the scatter ticks and the scale labels.

### 8. [P3] confusion: the "base rate" label arrives before its formula and sits under the wrong term
- When: 86.5-94.6 s, `bayes-when` and `test-in` (tile at 87 s, element-093.jpeg).
- What:
  - "the base rate" appears at about 86.8 s, floating alone at the bottom right, about 1.4 s before the expansion it labels inks in.
  - Once the expansion is drawn, the label sits under "P(B) = P(B | A)" rather than under the highlighted P(A) and P(not A), and it runs straight into "where intuition breaks" as if they were one phrase.
  - The same P(A) in the numerator is labelled "prior", and nothing connects the two names.
  - A and B are never mapped to disease and positive, and "you know P(positive | disease)" is blue while the matching P(B | A) is highlighted yellow.
- Why it matters: the scene's point is where the base rate enters, and the labels scatter it.
- Cause: `video/src/videos/ds-probability/CondScene.tsx:261` (`at={baseAt + 10}`, x = 900) against `:232` (`Ink at={bottomAt - 4}`); `:191` (the "prior" label); `:212` (`BLUE_INK`).
- Fix:
  - Cue the note at `bottomAt + 14` and centre it under the first P(A) highlight (about x = 1150), with "where intuition breaks" on its own line at y(790).
  - Change the "prior" label to "prior: the base rate".
  - Add "A = disease, B = positive" in `note(24, INK_SOFT)` at X0, y(600).

### 9. [P3] confusion: the independence chart's legend and reference line lose their meaning
- When: 154-175 s, `indep-bars` and `indep-claim` (element-161.jpeg, element-174.jpeg).
- What:
  - The legend swatch "■ churned" is grey, while the churned segments are blue.
  - The dashed line's "15%" label leaves at "These break at" (about 162 s). The dashed line, which is the comparison the argument rests on, then stays unlabelled for 13 s.
- Why it matters: the legend points at the wrong colour, and the reference line becomes an unexplained rule.
- Cause: `video/src/videos/ds-probability/IndepScene.tsx:153` (the ■ inherits `INK_SOFT`); `:155` (`out={theseAt}`).
- Fix: colour the ■ with `DATA`. Change the note to `out={out4}` with the text "15% if independent".

### 10. [P3] confusion: colours against the series' meanings
- When: 192-199 s (element-197.jpeg); 342-350 s (`pois-limit`).
- What: "P(two | one) = 0" and "as far from independent as it gets" are the correct conclusion but are set in red (the trap). The Poisson series dots and their legend dot are green (the right answer), although they are just a second data series.
- Why it matters: red tells the viewer the line is the error, and green suggests the Poisson is the "right" one of the two models.
- Cause: `video/src/videos/ds-probability/IndepScene.tsx:221` and `:231` (`ACCENT_INK`); `PoisScene.tsx:162` and `:173` (`fill={OK}`).
- Fix: set the two Q5 lines in `INK`, with the yellow `Mark` kept on the last one. Draw the Poisson dots in `ds("blue", 700)` against the `DATA_LIGHT` bars.

### 11. [P3] explanation: the conditional-probability formula is never tied to the die
- When: 52.9-63.1 s, `cond-rule` (element-062.jpeg).
- What: the formula P(A | B) = P(A and B) / P(B) inks in beside the die, but the die's own numbers never go into it: (1/6) / (1/2) = 1/3. The intuition (count the faces) and the rule stay separate.
- Why it matters: plugging the example into the rule is the obvious follow-up question, and the example is right there on screen.
- Cause: `video/src/videos/ds-probability/CondScene.tsx:140-165`.
- Fix: add a `math(40)` line "= (1/6) / (1/2) = 1/3" at RULE_X, y(600), cued to "measure again". Add to the narration: "A six that's even is one in six; even is one in two; one in three."

### 12. [P3] answer: variance gets no formula, and linearity never names its tool
- When: 216-258 s, `expect-var`, `linear`, `linear-hats` (element-227.jpeg, element-258.jpeg).
- What:
  - E[X] gets "Σ x P(x)", but variance only gets "Var(X) = 35/12 ≈ 2.92". Neither E[(X − E[X])²] nor E[X²] − E[X]² appears, though both are on the page.
  - Q7 never says "indicator variable" and never points out that the hat matches depend on each other, which is why "even when the parts depend" matters here.
  - The "2.25" labels sit about 5 px under the dashed variance line.
- Why it matters: "define variance" is answered with a number, and the standard follow-ups are missing.
- Cause: `video/src/videos/ds-probability/ExpectScene.tsx:166-173` (the Var note); `:156-164` (labels at s x unit − 34) against `:143-149` (the dashed line at 2.92).
- Fix:
  - Ink "Var(X) = E[(X − E[X])²] = E[X²] − E[X]²" in `math(36)` at X0, y(800), cued to "expected squared distance".
  - Put the bar labels 40 px above their bars, or drop the "2.25" labels to inside the bars.
  - In `linear-hats`, change "Each has" to "Each person is an indicator, one or zero, with a one in ten chance... The matches aren't independent, and it doesn't matter:".

### 13. [P3] explanation: the binomial and Poisson panels look identical and carry no parameters
- When: 268-297 s, `dist-counts` and `dist-curves` (element-296.jpeg).
- What:
  - Binomial(10, 0.3) and Poisson(3) are drawn as nearly the same histogram, with no n, p or λ printed. The one panel meant to tell them apart cannot.
  - Bernoulli's mean p and the binomial variance np(1 − p), both on the page, are missing.
  - The normal's "within one, two and three standard deviations" ends about 10 px from the exponential caption.
- Why it matters: "walk through the distributions" invites "and its variance?", and two near-identical unlabelled shapes invite confusion.
- Cause: `video/src/videos/ds-probability/DistScene.tsx:143-170`; `results.json` dists (binomial n 10, p 0.3; Poisson λ 3).
- Fix: caption the panels "n = 10, p = 0.3" and "λ = 3". Make the binomial caption "mean np, variance np(1 − p)", and add "mean p" under Bernoulli. Set the normal's note width to `PANEL.w`.

### 14. [P3] explanation: Q10's figure is mislabelled, and its conditions are incomplete
- When: 325-350 s, `pois-which` and `pois-limit` (element-337.jpeg).
- What:
  - The caption "1,000 impressions, each clicked or not" sits under 40 boxes, 3 of them clicked (7.5%). Ten seconds later the narration uses 0.3%.
  - The binomial's independence condition and the Poisson's constant rate are never said.
  - The limit is given as one example, not as the rule the page states (n large, p small, λ = np).
  - The limit chart's y axis (probability) has no title.
  - The bottom 45% of the frame is empty through `pois-which`.
- Why it matters: "when would you use which" is answered by the conditions, and the picture's 7.5% click rate contradicts the 0.3% example.
- Cause: `video/src/videos/ds-probability/PoisScene.tsx:14-16` (`CLICKED` holds 3 of 40); `:115` (caption); `:145-153` (no `yTitle`).
- Fix:
  - Caption "40 of 1,000 impressions" and click one box.
  - Say "a fixed number of independent trials".
  - Say "...at point three percent, so n times p is three, is almost exactly a Poisson with a rate of three".
  - Add `yTitle="probability"`.

### 15. [P3] answer: "specificity" is never named
- When: 125.9-136.0 s, `test-words` (element-139.jpeg).
- What: the video says "the false-positive rate on the healthy". The page's bar is "sensitivity, specificity, and the base rate", and "sensitivity vs. specificity" is the pairing an interviewer uses.
- Why it matters: a candidate should be able to name the other half of the pair.
- Cause: `video/src/videos/ds-probability/script.ts` beat `test-words`; `TestScene.tsx:178`.
- Fix: say "...you also need the specificity, the ninety-five percent of healthy people it clears, and the base rate". Label "false-positive rate = 1 − specificity".

### 16. [P3] other: the hook gives away its own answer at 20 s
- When: about 20-21.5 s, beat `plan` ("usually wrong"; tile at 21 s).
- What: "Most people say no." is struck through six seconds after "Hold on to your answer. We'll settle it near the end", which settles it about six minutes early.
- Why it matters: the strike undoes the open question that the whole video is built around.
- Cause: `video/src/videos/ds-probability/HookScene.tsx:110` (`<Strike at={wrongAt}>`).
- Fix: drop the `Strike`. Pulse the note at `wrongAt` instead.

### 17. [P3] spacing: a person token touches the room's border
- When: 6-21 s, beat `hook` (element-014.jpeg).
- What: in the second row, the right-most person's shoulder reaches x ≈ 675, which is on or just past the box edge at 672.
- Why it matters: it is a small but visible collision in the opening frame.
- Cause: `video/src/videos/ds-probability/HookScene.tsx:29`. The odd-row +30 offset plus ±17 jitter puts column 5 at up to x = 659, with a shoulder half-width of about 15.
- Fix: clamp x to `ROOM.x + ROOM.w - 32`, or cut the column pitch from 88 to 84.

### 18. [P3] other: "Two definitions left" and "a sentence each" misdescribe the last round
- When: 15-30 s (`plan`); 409-449 s (`rapid-in`, element-434.jpeg).
- What: question 14 (the bet) is a calculation, not a definition. Question 13 runs 21 s and three sentences, not "a sentence".
- Why it matters: it is a small promise the video then breaks.
- Cause: `video/src/videos/ds-probability/script.ts` beats `plan` and `rapid-in`; the `RapidScene` headline.
- Fix: change the headline and narration to "That's every puzzle. Two quick ones left." and the plan line to "the last two are quick".

### 19. [P3] explanation: the bet's bars show the products without the products' parts
- When: 438-449 s, `r-bet` (element-448.jpeg).
- What: "+$2.00" and "−$2.40" appear with no "1/5 x $10" or "4/5 x −$3", and the narration says only "Two dollars, minus two forty". The page's whole method is to weight each payoff by its probability.
- Why it matters: the method is the answer, more than the minus 40 cents.
- Cause: `video/src/videos/ds-probability/RapidScene.tsx:111-112` (row texts).
- Fix: label the bars "1/5 × $10 = +$2.00" and "4/5 × −$3 = −$2.40". Say "A fifth of ten is two dollars; four fifths of minus three is minus two forty."
