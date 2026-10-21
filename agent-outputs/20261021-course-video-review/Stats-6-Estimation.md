# Stats-6-Estimation (0-360 s, whole video)

## Verdict
- A strong, well-argued video. Every number on screen matches the narration and measurements.json (94/6, 2.10 to 4.25, 11.25/5.22/2.30/1.18, 0.48 against 0.49, $30,808 to $37,093, 4.13 to 5.45 and so on), and most scenes end on a clean, readable figure.
- There is one systemic defect: the two-part headline in every scene has almost no word space ("needstwo", "god:the", "describesthe", "ofone"). It is caused by an `em` gap measured against the wrong font size.
- Two text collisions: the Misreading 2 caption is cut by the divider line, and the bootstrap resample labels sit on top of a dot stack.
- Four conceptual slips undercut the point being made:
  - the only interval built slowly in the coverage demo misses the true mean;
  - the mean's own SE formula is struck through when the narration means the median has none;
  - Fig. 2's sampling bell sits at x̄ but is labelled "where another 50 might average";
  - the bootstrap SE is drawn as a paper-coloured line that looks like a glitch.
- Pacing is comfortable in Part 1 and in the bootstrap. 183.7-236.8 s (rate SE, rate CI, test, straddle, two views) runs at about 3.0 w/s for 53 s with 0.35-0.6 s gaps, and it is where "significant at the 5% level" and the return to 1.96 go unexplained.

## Findings

### 1. [P1] spacing: no word space between the two halves of every headline
- When: every scene. 5-8 s "An interval needs**two** numbers" (element-013); 55-66 s "Play god:the truth is known." (element-124); 77-96 s "describesthe recipe"; 178-197 s "A rate getsan interval too." (element-392); 205-238 s "two views ofone thing." (element-474); 240-294 s "standard errorof a median?", "Treat the sample asthe population." (element-492, -580); 300-321 s "loop,one word"; 321-360 s "information:it only…" (element-714).
- What: the gap between the ink phrase and the italic accent phrase measures 5-7 px at 64 px type. A normal space here would be about 16 px. The two halves read as one run-together word.
- Why it matters: the largest text in every scene looks like a typo.
- Cause: `video/src/videos/estimation/parts.tsx:344`. The flex container sets `gap: "0.32em"` but has no `fontSize`. The size is applied only to the `Ink` children, so the `em` resolves against the inherited ~16 px and gives about 5 px.
- Fix: add `fontSize: size` to that container's style, so 0.32em is about 20 px. Alternatively, use `gap: Math.round(size * 0.28)`.

### 2. [P1] spacing: the divider runs through the "where the people are" caption
- When: 123.5-130.0 s, beats `eleven` and `safer` (element-248, element-257)
- What: "where the people are: x̄ ± 2s holds 48 of 50" sits on the hairline that separates Misreading 2 from Misreading 3. The line crosses the descenders ("p", "p", "le"). There is no clear space under the label.
- Why it matters: this is visible text-on-rule overlap on the finished frame, which holds for about 6 s.
- Cause: `video/src/videos/estimation/MisreadScene.tsx:195` puts the note at `y(ROWS[1] + 194)`. The divider at `MisreadScene.tsx:201` is at `y(ROWS[2] - 26)` = y(624), which is inside the note's line box. `ROWS` is at `:17`.
- Fix: set `ROWS = [170, 400, 670]`. That leaves about 24 px between the note and the divider, and row 1's tick labels still clear the first divider.

### 3. [P1] spacing: bootstrap labels sit on the data (Fig. 7)
- When: 255-264 s, beats `waits`, `resample` and `again` (element-526, element-536)
- What:
  - "never drawn: 22, hollow above" is printed across the three-dot stack of the 15.2-minute wait. The middle dot sits on the colon.
  - "drawn twice: 10, three times: 6" sits directly above the same stack.
  - In the strip above, the 15.2-minute dot touches the "l" of "a long tail to the right".
- Why it matters: this is an overlap, at the moment the narration asks the viewer to look at repeats.
- Cause:
  - `video/src/videos/estimation/ResampleScene.tsx:179` and `:185` start both notes at x = 1240, but `sx(X, 15.2)` ≈ 1376.
  - `ResampleScene.tsx:168` places the tail note at `sx(X, 14)`, `y(STRIP) - 44`, directly over that dot.
- Fix: move both resample notes to x = 1420. That is clear of the stack, and the 18.9 value is never drawn in resample 1. Raise the tail note to `y(STRIP) - 60`, or start it at `sx(X, 15.6)`.

### 4. [P2] confusion: the mean's correct SE formula is struck through
- When: 243.5-248 s, beat `bootstrap` ("The formula is ugly, or doesn't exist") (element-492)
- What: the label "a mean's standard error" sits over "s ÷ √n", and that formula gets a red strike and fades on "exist". The narration means that a median or a correlation has no formula. The screen crosses out the mean's formula, which is correct. The same formula is then used as the reference at 279 s ("0.49 the formula, s ÷ √60").
- Why it matters: viewers are told visually that s ÷ √n is wrong or nonexistent, just before the video relies on it.
- Cause: `video/src/videos/estimation/ResampleScene.tsx:139-144`, `<Strike at={existAt - 2}>` on the mean's formula.
- Fix: keep "a mean's standard error: s ÷ √n" unstruck, and on "median" add a second line under it: "a median's: ?". Put the strike or fade on the "?" line on "exist", or just let it stand.

### 5. [P2] confusion: the single interval built step by step misses the true mean
- When: 62.5-64.5 s, beat `draw` ("Draw forty values, build an interval...") (element-127)
- What: the 40 dots collapse into the first interval, which stands alone on screen for about 1.5 s. It spans 90.1 to 98.0 and clearly misses the dashed "true mean" line at 100. Nothing comments on it, and it is not marked as a miss until 70 s.
- Why it matters: the one worked example of "an interval" contradicts the premise ("Here's a population whose true mean you know") before the idea of misses exists. An attentive viewer is left wondering what went wrong.
- Cause: `video/src/videos/estimation/CoverageScene.tsx:76` and `:84` draw `COVERAGE.intervals[0]` and its sample (`first`) slowly. In measurements.json, interval 0 is a miss: `missRows` starts with 0.
- Fix: in `measure.py`, export `first` from the first covering sample and draw that interval first. Rotate `intervals` so a hit is row 0, and keep the six misses elsewhere in the stack.

### 6. [P2] accuracy: Fig. 2's bell "where another 50 might average" is centred on x̄, not the truth
- When: 17-54 s, beats `wobble` through `means-in` (element-092)
- What: the sampling-distribution bell is centred on $49.28 and labelled "where another 50 might average". At 105 s the video reveals that the true mean is $48 ("here μ is $48: fixed"). Other samples would average around $48, not around this sample's $49.28.
- Why it matters: the video's central lesson is that the truth stays put while intervals move. Centring the wobble on the estimate is exactly the intuition the misreadings scene then corrects.
- Cause: `video/src/videos/estimation/BuildScene.tsx:88-97` (bell built around `USERS.xBar`) and `:233-235` (the note text).
- Fix: keep the shape but relabel it as width, not location: "how much an average wobbles: 1 SE = $1.52". Or centre the bell on a dashed "true mean (unknown)" line at `USERS.mu` and keep x̄ as the red rule.

### 7. [P2] confusion: Fig. 3 and Fig. 4 share a frame and a truth line but not a scale
- When: 54-97 s, whole `coverage` scene (element-124, element-168)
- What: the population bell (Fig. 3) is drawn over 55-145 with no axis. The only axis on screen is Fig. 4's 86-114, directly under it, and the dashed true-mean line joins the two figures. Read against that axis, the population appears to span about 86-114, so each interval (about ±5) seems to cover a third of the population. In fact it covers about a fifth of one standard deviation either side. The 40 sample dots are plotted on the 55-145 scale, and their interval then jumps about 165 px when it lands on the 86-114 scale.
- Why it matters: an unlabelled change of scale blurs "interval for the mean" against "spread of the data". That is the very confusion Misreading 2 then addresses.
- Cause: `video/src/videos/estimation/CoverageScene.tsx:14` (`XP` 55-145) against `:19` (`XI` 86-114). Only `XI` gets an `<Axis>` (`:152`).
- Fix: add `<Axis scale={XP} base={y(POP_BASE)} ticks={[55, 70, 85, 100, 115, 130, 145]} />` under Fig. 3. Retitle Fig. 4 "A 95% interval from each sample of 40, zoomed to 86 to 114".

### 8. [P2] confusion: the bootstrap SE is drawn as a white line through the histogram
- When: 274-294 s, beat `pile` ("Its spread is the standard error, zero point four eight") (element-580)
- What: a paper-coloured bracket from 6.56 to 7.52 cuts horizontally across the bars at about 55% height. It has no label, and it reads as a rendering glitch or a gap in the bars, not as "1 SE". The narration's key number has no mark on the chart.
- Why it matters: the scene's main claim (the pile's spread is the SE) has no legible visual.
- Cause: `video/src/videos/estimation/ResampleScene.tsx:225`, `<Bracket … color={PAPER} />` at `seY`, with no note.
- Fix: draw it in `INK`, width 2.4, below the axis at `y(HIST_BASE) + 40` with `up`. Add a note "±1 SE = 0.48" at its right end, cued at `fourEightAt`.

### 9. [P2] pacing / confusion: the `why` beat moves four things in four places, and the change it shows on Fig. 2 is invisible
- When: 38.1-47.5 s, beat `why` (3.11 w/s, gap 0.60) (element-084, element-092)
- What: within 9 s, several things appear in three places:
  - the inset axis, a "normal 1.96" tick and a "t, 49 df: 2.01" tick (right);
  - the s bracket and "s = $10.76, from the same 50" (Fig. 1);
  - a dashed "with 1.96" bar, while the main interval narrows and widens back (Fig. 2).

  The t and normal widths differ by $0.075 per side, about 10 px on Fig. 2, so the narrowing cannot be seen. While the bar is narrowed, its end labels still read $46.22 and $52.33 (the t values).
- Why it matters: a new concept (the t-distribution paying for an estimated spread) arrives at the video's fastest rate so far, with the eye pulled three ways.
- Cause:
  - `video/src/videos/estimation/BuildScene.tsx:82-84` (narrow/widen lerp);
  - `:263-276` (dashed 1.96 bar and note);
  - `:209-222` (s bracket);
  - `:288-301` (inset).
- Fix: drop the narrow/widen and the dashed "with 1.96" bar, and let the inset carry 1.96 against 2.01. Split `why` (`script.ts:115`) after "one point nine six?" with `pauseAfter: 0.6`.

### 10. [P2] pacing: 53 s of 3.0 w/s from the rate SE to the formula hand-off
- When: 183.7-236.8 s. Beats:
  - `rate-se` 3.01 w/s, gap 0.35
  - `rate-ci` 3.01 w/s, gap 0.60
  - `test-in` 3.22 w/s
  - `test` 2.90 w/s, gap 0.40
  - `straddle` 3.03 w/s, gap 0.35
  - `eight` 3.03 w/s, gap 0.45
  - `views` 3.14 w/s, gap 0.60
  - `formula-in` 3.02 w/s
- What: the densest stretch of the video. Part 1 averages about 2.5 w/s. Each beat carries a distinct idea: the SE of a rate, the 1.96 step, significance, straddling zero, "can't rule out eight", and two views of one thing. Most get a 0.35-0.45 s breath.
- Why it matters: Part 2's hardest ideas get the least time.
- Cause: `video/src/videos/estimation/script.ts:194-225` (pauseAfter values and beat lengths).
- Fix:
  - set `pauseAfter: 0.7` on `rate-se`, `test` and `straddle`;
  - split `eight` (`script.ts:216`) after "rule out either." with `pauseAfter: 0.6`;
  - re-voice the eight beats in this stretch at Part 1's pace.

### 11. [P2] explanation: "significant at the five percent level" is asserted, never connected to 95%
- When: 202.6-209.5 s, beat `test` (element-416)
- What: the narration and the label "leaves out zero: significant at the 5% level" use "significant" and "5% level" for the first time in the course arc (tests are next unit). The video never says why 5% goes with a 95% interval. The lesson does: "A 95% CI for a difference contains exactly the values you would **not** reject at the 5% level."
- Why it matters: the claim reads as a rule to memorise rather than as something that follows from what was just built.
- Cause: `video/src/videos/estimation/script.ts:205-209`; on screen `TestScene.tsx:132-139`.
- Fix: change the beat to "If it leaves out zero, a test would reject 'no difference' at the five percent level: the five percent a ninety-five percent interval leaves outside."

### 12. [P2] explanation: the rate interval quietly goes back to 1.96 after the video argued for 2.01
- When: 189.7-196.3 s, beat `rate-ci` (element-392)
- What: Part 1 spent a beat on "Why not the usual one point nine six?". Here the narration says "Step one point nine six of those either way" with no reason, and the label reads "1.96 standard errors either way".
- Why it matters: a viewer who followed Part 1 will wonder why the t-correction no longer applies.
- Cause: `video/src/videos/estimation/script.ts:199-202`; on screen `RateScene.tsx:157-161`.
- Fix: put a new beat before `rate-ci`, with `pauseAfter: 0.4`: "For a rate there's no separate spread to estimate, so the normal's one point nine six is the usual choice." This is the lesson's Wald interval.

### 13. [P2] pacing: an unread 16-word line gets about 3 s
- When: 174.5-177.5 s, beat `rate-in` (element-352)
- What: "Every lever moves one part of estimate ± critical value × standard error, for a rate too." inks in on "recipe" and the scene cuts about 3 s later. The narration says only "The same recipe works for a rate."
- Why it matters: at about 2 words/s it needs 8 s, so most viewers will not finish it.
- Cause: `video/src/videos/estimation/LeversScene.tsx:175-181` (`at={recipeAt - 6}`).
- Fix: either shorten it to "Same recipe: estimate ± critical value × standard error" and cue it at `doublesAt + 20`, which gives about 5 s, or raise `noise`'s `pauseAfter` to 1.2.

### 14. [P2] spacing: "median $34,109" is jammed under the Fig. 9 label
- When: 299-321 s, beats `median` through `range` (element-639)
- What: the red "median $34,109" note sits about 7 px below "Fig. 9 120 incomes, in thousands of dollars". The house rule is about 25 px between rows of text.
- Why it matters: the two lines read as one cramped block.
- Cause: `video/src/videos/estimation/MedianScene.tsx:102` (`y={y(STRIP) - 52}`, with the figure label at `y(262)`, `:89`).
- Fix: put the note under the strip, beside the rule: `x={sx(X, K(MEDIAN.median)) + 12}`, `y={y(STRIP) + 30}`, left-aligned. Alternatively, raise the FigLabel to `y(240)`.

### 15. [P3] confusion: "the true mean is hidden" while the screen still shows it
- When: 89.5-97 s, beats `yours` and `wrong-in` (element-190)
- What: on "you can't see which", the dashed truth line fades and "in real life, the true mean is hidden" appears. But the Fig. 3 title still reads "A population whose true mean is 100", and Fig. 4's axis still marks 100, which "yours" (99-109) visibly contains.
- Why it matters: it undercuts the punchline that you cannot tell.
- Cause: `video/src/videos/estimation/CoverageScene.tsx:122` (the FigLabel never changes) and `:152` (axis ticks).
- Fix: at `seeAt`, swap the title to "A population whose true mean is ?" and fade the axis tick labels to about 0.2.

### 16. [P3] explanation: notation on screen that the narration never names
- When: "s = $10.76" (42 s), "t, 49 df: 2.01" (44 s), "here μ is $48" (105 s), "x̄ ± 2s" (123 s), "s = 11.6 / s = 23.1" (169 s), "s ÷ √n" (235 s, 243 s, 279 s), "p̂" (179 s)
- What: s, df, μ and p̂ are never said aloud. The narration says "the spread", "the true mean" and "the rate".
- Why it matters: a viewer without Unit 5 fresh meets symbols that carry the argument, for example x̄ ± 2s in Misreading 2.
- Cause:
  - `BuildScene.tsx:220`, `:300`;
  - `MisreadScene.tsx:117`, `:197`;
  - `LeversScene.tsx:99-100`;
  - `TestScene.tsx:210`;
  - `RateScene.tsx:118`.
- Fix:
  - write the words next to the first use: "s, the spread: $10.76", "here the true mean, μ, is $48", "t-distribution: 2.01" (drop "49 df");
  - in Levers use "spread 11.6" and "spread 23.1".

### 17. [P3] other: near-empty frames at three openings
- When:
  - 7.3-10.0 s: only "estimate" and "standard error", with a gap between them (element-019);
  - 248-252.5 s: only the headline "Treat the sample as the population.";
  - 321-326 s: only "No new information:" (element-644).
- What: most of the frame is blank while the narration explains. The hook also says "just two numbers", then builds a three-term formula.
- Why it matters: these are dead seconds, plus a small contradiction at the very first line.
- Cause:
  - `BuildScene.tsx:175`, `:185-191` (Fig. 1 waits for "Fifty users");
  - `ResampleScene.tsx:147` (Fig. 7 waits for "sixty");
  - `LimitsScene.tsx:96`, `:111` (Fig. 11 waits for "have").
- Fix:
  - bring Fig. 1's axis and dots in on `estimate` in `hook`, and Fig. 7's on `treat`;
  - in Limits, cue Fig. 11's label and axis at `informationAt`;
  - change the hook to "An interval is built from two numbers: …".

### 18. [P3] confusion: unlabelled ±1 SE ticks on the rate axis
- When: 189.7-202.6 s (element-392)
- What: two short extra ticks at 17.3% and 18.7% sit between the axis ticks and have no label. "1.96 standard errors either way" sits under the axis, not by them.
- Why it matters: they read as stray axis ticks.
- Cause: `video/src/videos/estimation/RateScene.tsx:144-156`.
- Fix: label one of them "1 SE" (note at `px(pHat + se)`, above the axis), or delete both.

### 19. [P3] other: "An interval can answer a test."
- When: 198-202.6 s, beat `test-in`
- What: the headline says an interval answers "a test". The narration says it answers "a question you might think needs a test".
- Why it matters: the phrasing is odd and slightly wrong.
- Cause: `video/src/videos/estimation/RateScene.tsx:83-85`.
- Fix: change it to "An interval can do the job of a test." (italic "a test.").

### 20. [P3] explanation: numbers with no unit or source in Levers and Fig. 6
- When: 134-177 s (element-352) and 202-238 s (element-474)
- What: "one sample of 200" on an unlabelled 44-56 axis, with widths 2.10 to 11.25 and no unit. Fig. 6's "difference between two groups" runs from −0.5 to 8.0 and from 2.4 to 19.6 with no unit or context, and the two intervals come from different lesson examples.
- Why it matters: the widths are comparable only relative to each other, and nothing tells the viewer what is being measured.
- Cause: `video/src/videos/estimation/LeversScene.tsx:73`, `:135`; `TestScene.tsx:93`.
- Fix: change the sub-labels to "one simulated sample of 200, values around 50". Retitle Fig. 6 "95% intervals for a difference between two groups' means (two examples)".
