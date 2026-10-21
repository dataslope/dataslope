# Stats-1-ThinkingStatistically (0-334 s, whole video)

## Verdict
- Solid overall. Every spoken number matches its source (3.62, 1.72/2.12/2.96/1.08, 11.7, 1 in 600, 101.37, 1.8, 48,755.25, $85.00, 94.82-102.55), figures are clean, and nothing is under 19 px. No overlaps or clipping.
- The biggest problems are hand-offs, not scenes. Twice an exit empties the page 2+ s before the cut (45-47 s, 205-208 s). The Fig. 4 to Fig. 5 morph also leaves an unlabelled strip on screen for about 4 s (171.5-175.3 s).
- Part 3 has three terminology slips a careful viewer will trip on:
  - The narrator says "counts / measurements" while the screen says "Discrete / Continuous".
  - "Labels" means all categorical data in one scene and nominal only in the next.
  - "Median 3.5" for a 1-to-5 rating comes right after "there is no flavor 1.8".
- Pacing is mostly comfortable (2.0-2.9 w/s). The exception is Part 2's core: parameter, statistic, Greek and Latin letters and "random variable" arrive with 0.35 s breaths at 2.9-3.1 w/s. "Random variable" never appears on screen.
- Some figures are squeezed into a band while large areas sit empty: the parameter cards fill only the top 45% for 18 s.

## Findings

### 1. [P2] confusion: Unlabelled half-morph fills the Fig. 4 to Fig. 5 hand-off
- When: 171.5-175.3 s, end of beat `twenty-in` plus the scene gap (frames element-344.jpeg, element-348.jpeg)
- What: On "One sample can't tell you" the Fig. 4 label, the `μ = 100` label, the `x̄ = 101.37` label and the miss bracket all fade. The sample then shrinks to a thin strip at the top. For about 4 s the screen shows one unlabelled row of dots, a 550 px dashed line down to a bare 50-150 axis, and the old headline. Fig. 5's label and headline only arrive at 175.2 s.
- Why it matters: The narrator is asking "how big is that miss" while the miss and every label have just gone. The held "finished" frame is a half-built figure.
- Cause: `video/src/videos/thinking-statistically/ParameterScene.tsx:121-122` starts `fade` and `m` on `oneSampleAt`, and lines 200, 220 and 260 fade the labels on `oneSampleAt - 4`. The labels of `TwentyScene.tsx:158-166` only start at `twentyFrom - 4`.
- Fix: Start the fade and the morph at `n.beat("twenty").from - 48` instead of `oneSampleAt` (40-frame morph ending at the cut). This keeps the labelled Fig. 4 and its bracket up through the whole `twenty-in` beat. Also keep the `μ = 100` note riding with `muX` rather than fading it, so the hand-off is motion, not a dead frame.

### 2. [P2] confusion: Exits empty the page 2+ s before the cut, twice
- When: 44.5-47.3 s, beat `trend-in` and the gap (element-088.jpeg, element-092.jpeg). 204.6-207.6 s, beat `flavors-in` and the gap (element-410.jpeg, element-414.jpeg)
- What:
  - At 43.3 s the groups fade, and the gap panel follows on "only gaps". From about 45.0 s to the cut the page is just the headline and "Could this just be luck?", while the narrator says "it isn't only gaps between groups".
  - Fig. 5 fades on "goes wrong". From about 205.4 s to the cut only "But what kind of number is it?" remains.
- Why it matters: The figure being referred to ("gaps between groups") leaves as it is named. The 1.6 s scene gap, meant for reading the finished figure, becomes a near-blank page.
- Cause: `GapScene.tsx:95-96` (`groupsOp` fades on `turnAt`, `panelOp` on `onlyAt + 8`) and `TwentyScene.tsx:96` (`figureOp` fades on `wrongAt`).
- Fix: Delete both early fades, or cue them to `n.beat("trend").from - 14` and `n.beat("flavors").from - 14`, and let the Scene cross-fade carry the exit.

### 3. [P2] confusion: Narration says "counts" and "measurements", the screen says "Discrete" and "Continuous"
- When: 259.0-263.9 s, beat `numbers` (element-522.jpeg, element-538.jpeg)
- What: On "counts" the heading **Discrete** appears; on "measurements" the heading **Continuous** appears. Neither word is ever spoken, and "measurements" never appears on screen. The lesson (types-of-data.mdx:45-46, 57-60) uses discrete and continuous.
- Why it matters: Viewers get two new jargon headings they never hear, and the spoken term matches none of the headings.
- Cause: `KindsScene.tsx:26-27` (leaf names) cued at `KindsScene.tsx:91` to `countsAt` and `measurementsAt`; `script.ts:227`.
- Fix: Change the beat to "Numbers split into discrete counts, like logins, and continuous measurements, like price." Cue the leaves on "discrete" and "continuous".

### 4. [P2] confusion: "Labels" changes meaning between Kinds and Decide
- When: 248.7 s, beat `labels` (element-538.jpeg); 304.6-322.9 s, beats `decides` and `tests` (element-636.jpeg, element-646.jpeg)
- What:
  - In Kinds, "Labels split again" makes nominal **and** ordinal both labels, and the Categorical node reads "Labels: which group…".
  - In Decide, the rows are "Labels (nominal)", "Ranks (ordinal)" and "Quantities (numerical)".
  - On "Two categorical columns" only the Labels row is highlighted, so categorical looks like nominal only.
- Why it matters: The two-level taxonomy the video just built is redrawn with different names, and the chi-square highlight teaches the wrong scope.
- Cause: `DecideScene.tsx:52, 61` (row names) and `DecideScene.tsx:126-128` (the `twoCatAt` Mark wraps row 0 only); `script.ts:248-252`.
- Fix: Name the rows "Unordered labels (nominal)", "Ordered labels (ordinal)" and "Quantities (numerical)", and say "Unordered labels get counts…, ordered ones get a median". On `twoCatAt` light rows 0 and 1 together.

### 5. [P2] accuracy: "a 1 to 5 rating: median 3.5" undercuts the flavor lesson
- When: 309.5-313.4 s, beat `decides` (element-626.jpeg, element-646.jpeg)
- What: The ordinal row's example is "median 3.5". 3.5 is not a rating anyone can give: it is the midpoint of 3 and 4, which assumes even gaps. The video showed "There is no flavor 1.8" 90 s earlier and "gaps can be uneven" 60 s earlier. The rating column ([5, 3, 4, 2]) is never shown in the video either, so the number has no visible source.
- Why it matters: The one example of the "honest" ordinal summary looks like the same mistake the video just warned against.
- Cause: `DecideScene.tsx:64` (`ZIPS.ratingMedian`, the lesson's even-length column).
- Fix: Use the lesson's ordered-categorical block (types-of-data.mdx:327, plan S/L/M/M/L/S/M), whose median is a real rank: "plan size: median M". If you keep the rating, show the column in Fig. 7 and write "median 3.5, halfway between 3 and 4".

### 6. [P2] explanation: "Random variable" is said once at 3.1 w/s and never shown
- When: 185.8-190.9 s, beat `variable` (element-376.jpeg, element-382.jpeg)
- What:
  - "That makes a statistic a random variable, with a center and a spread of its own" is spoken while 20 blocks fly into a new histogram titled only "Where the twenty averages land".
  - The term is never on screen, and the next beat follows 0.35 s later.
  - On "center" the pulse lands on the μ = 100 line, yet the twenty averages visibly pile left of it (12 below, 8 above, mean 98.88). That reads as the center being somewhere it isn't.
- Why it matters: This is the lesson's headline idea (populations-and-samples.mdx:187, 568), and it gets one fast clause with a busy animation.
- Cause: `TwentyScene.tsx:234-236` (panel title), `TwentyScene.tsx:243` (the center pulse goes to the μ TruthLine), `script.ts:186-189` (`pauseAfter: 0.35`).
- Fix: Retitle the panel "x̄ is a random variable: where twenty averages land". Raise `pauseAfter` on `variable` to 0.7. On "center", either pulse a short red tick at the averages' own mean or say "centered on the parameter".

### 7. [P2] spacing: The spread label sits 560 px from the bracket it names
- When: 189.5-199 s, beats `variable` and `points` (element-382.jpeg, element-394.jpeg)
- What: "from 94.82 to 102.55" is printed under the panel title at y ≈ 343. Its red bracket is under the histogram axis at y ≈ 978. The label floats over empty space above the histogram, with nothing linking the two.
- Why it matters: The spread is the point of the beat, and its number reads as a subtitle rather than as the bracket's measurement.
- Cause: `TwentyScene.tsx:272-277` (Bracket at `y(BASE) + 50`, Note at `y(322)`).
- Fix: Put the Note centered under the bracket at `y(BASE) + 62` (`translateX(-50%)` at the midpoint of `sx(X2, LO)` and `sx(X2, HI)`), or move the bracket up to sit just above the tallest stack.

### 8. [P2] pacing: Three definitions and two symbols with 0.35 s breaths
- When: 132.5-151.2 s, beats `parameter` (2.90 w/s, gap 0.35), `statistic` (3.11 w/s, gap 0.35), `letters` (2.29 w/s, gap 0.45), `cheat` (3.13 w/s) (element-288.jpeg, element-302.jpeg)
- What: Parameter, statistic, μ and x̄ are each defined in one sentence, back to back. The x̄ caption "x-bar, its mean" appears about 10 frames after "x-bar" and is dimmed on "In code" about 0.6 s later. The same chain happens in Part 1 (`process` to `output` to `signal`, gaps 0.30/0.35/0.35).
- Why it matters: These are the vocabulary the whole course leans on, and there is no breath between them.
- Cause: `script.ts:155-170` (`pauseAfter: 0.35` on `parameter` and `statistic`); `ParameterScene.tsx:118` (cards dim at `codeAt - 2`) and `:190` (`symbolNoteAt={xBarAt + 10}`).
- Fix: Set `pauseAfter` to 0.7 on `parameter` and `statistic`, and 0.6 on `letters`. Show the x̄ note on `xBarAt - 2` and dim the cards on `buildAt` instead of `codeAt - 2`.

### 9. [P2] spacing: The Parameter scene opens on a bare rule, then uses only the top 45% for 18 s
- When: 132.5-151.2 s, beats `parameter` to `letters` (element-268.jpeg, element-300.jpeg)
- What:
  - For about 3 s the frame holds only a 720 px rule and "Describes the population". There is no headline and no term yet: both are cued to the word "parameter", about 3 s into the beat.
  - Once built, the two cards end at y ≈ 500 and the lower 55% of the frame stays empty until Fig. 4 arrives at 153 s.
- Why it matters: This is a large dead area during the definitions, and nothing ties them to the population and sample picture the viewer just saw.
- Cause: `ParameterScene.tsx:15` (`CARD_Y = 300`, Fig. 4 at `FIG_Y = 562` only from `cheatAt`), `:146` (headline at `parameterAt - 6`), `:157-159` (rule on "number", name on "parameter").
- Fix: Ink the headline at `n.beat("parameter").from - 4`. Under the cards, either draw a small Fig. 3 echo (a population box with μ beside it and the 10 blue sample dots with x̄ beside them) or move `CARD_Y` to about 380 and the symbols to `headline(140)`.

### 10. [P3] other: Headline slot blank for 3 s during the reveal
- When: 13.3-16.5 s, beat `same` (element-028.jpeg, element-031.jpeg)
- What: "B scores higher. Is B better?" leaves at the start of "Here's the catch", and "Same process." only inks on "SAME", leaving the headline area empty.
- Cause: `GapScene.tsx:134, 139` (`out={sameFrom - 6}`) and `GapScene.tsx:147` (`at={sameAt - 4}`).
- Fix: Use `out={sameAt - 10}` on the old line so the swap happens on "SAME".

### 11. [P3] explanation: The "slice" bracket is unlabelled
- When: 93.4-99.5 s, beat `slice` (element-198.jpeg)
- What: A grey bracket appears under the month axis and the dashed level runs off both edges as the frame pulls back 5%. Nothing says what the bracket or the run-on mean, and both are faint.
- Cause: `TrendScene.tsx:300` (Bracket, no Note); runs at `TrendScene.tsx:214-235`.
- Fix: Add a Note under the bracket, "the 24 months you saw", and one at the right run, "the process keeps going". Raise the run-on lines' opacity.

### 12. [P3] explanation: "The estimation error" is shown but never said
- When: 161.5-167.9 s, beats `miss` and `price` (element-332.jpeg)
- What: The note "off by 1.37, the estimation error" is highlighted on "mistake". The narration only says "that miss".
- Cause: `ParameterScene.tsx:299-301`; `script.ts:176`.
- Fix: Change the line to "That miss, the estimation error, isn't a mistake." The lesson names it (populations-and-samples.mdx:175).

### 13. [P3] explanation: "int64" appears 60 s before "data type" is explained
- When: 234-239 s, beat `kinds-in` (element-476.jpeg)
- What: A "stored as int64" chip appears beside the flavor codes. The narrator says "The computer couldn't tell a label from a quantity" and never says int64. "Data type" is only explained at 297.6 s.
- Cause: `FlavorScene.tsx:164-181`.
- Fix: Label it "stored as whole numbers (int64)", or drop the chip here and keep it for TrapScene.

### 14. [P3] confusion: The zip-code mean counts up through wrong values
- When: 280.8-282.8 s, beat `pandas` (element-562.jpeg, element-563.jpeg, element-564.jpeg)
- What: The red mean rolls 38567.76, then 46312.46, then 48620.48 before settling on 48755.25. The narrator says only the last value.
- Cause: `TrapScene.tsx:85` (`counted = ZIPS.zipMean * ease(...)`) rendered at `:180`.
- Fix: Reveal the final value with an Ink wipe on "Forty-eight", or count up only the thousands and keep ".25" fixed.

### 15. [P3] other: "The lesson's table" means nothing to a video viewer
- When: 271-304 s (element-606.jpeg)
- Cause: `TrapScene.tsx:113` (FigLabel title).
- Fix: Change the title to "Fig. 7  Four zip codes and prices, as pandas stores them".

### 16. [P3] spacing: The band label nearly touches the band's edge
- When: 54-61 s, beat `fell` (element-116.jpeg)
- What: "The last six months: down 11.7" ends 6 px from the band's right border.
- Cause: `TrendScene.tsx:302` (`x={bandX1 - 6}`).
- Fix: Set `x={bandX1 - 18}`.

### 17. [P3] confusion: Fig. 5's zigzag and two axes on one baseline
- When: 182-199 s, beats `moves` to `points` (element-382.jpeg)
- What:
  - A red polyline joins the twenty averages top to bottom, which reads like a time series or trend, the very reading Part 1 warned against.
  - The histogram's 94-104 axis sits on the same baseline 100 px after the 50-150 axis, so the tick row reads "…125 150 94 96 98 100…", with 100 appearing twice.
- Cause: `TwentyScene.tsx:194-203` (polyline); `TwentyScene.tsx:14, 16` (`X.x1 = 1240`, `X2.x0 = 1340`, same `BASE`).
- Fix: Drop the polyline, since the ticks already show the movement. Raise the histogram baseline about 40 px or put a short axis title under it ("each sample's average").

### 18. [P3] explanation: Fig. 1 has no axis title and an unexplained sign convention
- When: 4.6-43 s (element-020.jpeg, element-084.jpeg)
- What: The 10-90 axis has no title (score of what?). The gap panel encodes B ahead as a leftward, negative bar ("−3.62"). That convention is only in two 20 px labels and is never narrated.
- Cause: `GapScene.tsx:193` (Axis without a title); `GapScene.tsx:250-266`.
- Fix: Add a 21 px axis title "score", and make "B ahead" / "A ahead" 22 px with small arrows pointing away from zero.

### 19. [P3] other: Headline fragments dangle for 5-7 s
- When:
  - 240.0-247.0 s, "Which group," alone (element-482.jpeg).
  - 175.2-180.7 s, "Twenty samples," alone (element-354.jpeg).
  - 271-274 s, "Numbers" alone.
- What: The first half of a two-ink headline inks at the scene start, ending in a comma. Its second half waits for a word several seconds later.
- Cause: `KindsScene.tsx:117-121` (`kindsFrom - 4`, then `muchAt - 6`); `TwentyScene.tsx:126-135`.
- Fix: Ink the first half on the words that say it (`whichGroupAt - 6`, `answersAt - 30`), so the gap between halves is about 1 s.

### 20. [P3] spacing: Large empty areas while a scene builds
- When: 208-216 s, beat `flavors`, bottom 70% empty (element-424.jpeg). 271-288 s, beats `trap` to `place`, right 55% empty beside a 4-row column (element-563.jpeg)
- Cause: `FlavorScene.tsx:111` (Fig. 6 waits for "Ten"); TrapScene's doubling panel waits for the `double` beat.
- Fix: Flavors: bring the three code chips (1, 2, 3 with their flavor names) in large at `CHIP_Y` on "One is vanilla…", then fill the other seven on "Ten people answer". Trap: center the zip column until the price column arrives.

### 21. [P3] spacing: The "not a list" idea is squeezed into a corner
- When: 119.3-132.2 s, beat `list` (element-262.jpeg)
- What: The concept of every future checkout is a 23-dot strip, 450 px wide, in the bottom-right corner. Its "now / still to happen" labels end about 58 px from the frame's bottom edge, lower than any other content in the video.
- Cause: `SurveyScene.tsx:21-24` (`RUN_X = 1318`, `RUN_PITCH = 20`), strip at `y(890)` (`SurveyScene.tsx:203-227`).
- Fix: Move the strip to `y(840)` and widen `RUN_PITCH` to 26, or give the beat Fig. 3's space by dimming the grid on "isn't even a list".

### 22. [P3] pacing: The Part 3 pivot is the fastest beat in the video
- When: 198.3-203.5 s, beat `kind` (3.51 w/s, gap 0.35)
- What: "But before you summarize a sample at all... you need to know what KIND of number you're holding" opens a new part at the top speed of the script.
- Cause: `script.ts:196-198`.
- Fix: Add `pauseAfter: 0.7`, or split the beat at "at all".

### 23. [P3] explanation: The video ends on an undefined term
- When: 323.6-334.1 s, beat `next` (element-666.jpeg)
- What: "skew can pull it off center" ends the video. Skew is not defined, and the table dims to leave only "Next: where skew pulls the center." The evidence is already on screen and unused: the price column (19.99, 5.00, 42.50, 8.25) has mean $18.93 but median $14.12.
- Cause: `DecideScene.tsx:186-188`; the `next` beat at `script.ts:259`.
- Fix: On "Not always", show "median $14.12" beside "mean $18.93" in the price row (computed in measure.py), so the teaser has a picture.

### 24. [P3] spacing: Long flavor names overflow their boxes to the right
- When: 216.5-239.5 s, Fig. 6 (element-454.jpeg)
- What: "strawberry" and "chocolate" are wider than the 96 px chips. They start at the chip's left edge and hang about 15 px past its right edge instead of centering. The labels under chips 8 and 9 are about 20 px apart.
- Cause: `FlavorScene.tsx:118-160` (label div is `width: CHIP` with `textAlign: center` and `nowrap`, so wide text overflows right).
- Fix: Give the label `position: absolute; left: 50%; transform: translateX(-50%)`, or widen `CHIP_PITCH` to 140.
