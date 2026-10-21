# Course videos review: Statistics and Database Design

**Reviewed:** the 18 course unit videos in `video/`: `Stats-1` to `Stats-9` (Unit 5 as the merged `Stats-5-Sampling`) and `DbDesign-1` to `DbDesign-9`, about 100 minutes in all.
**Asked for:** spacing issues, visual confusion, pacing that runs too fast, missing explanations.
**Result:** 378 findings: **24 P1**, 156 P2, 198 P3. One report per video is in [`20261021-course-video-review/`](20261021-course-video-review/), each finding with its time, beat, frame, cause (`file:line`) and a concrete fix.

Severity: **P1** means a viewer is likely to misunderstand the point, or the frame has an obvious defect (overlap, wrong number). **P2** is noticeable and hurts the video (cramped, rushed, unexplained). **P3** is polish.

## How it was reviewed

- Every composition was rendered at 1920x1080, one frame every 0.5 s, captions off, from the build before PR #711 (so the frames show the old warm paper). The frames were tiled into labelled contact sheets, one second per tile, with the beat being spoken printed on each tile.
- Each video then got a reviewer that read its `script.ts`, timeline (every beat's start, end, words per second and the silence after it), scene code and source lessons, walked every sheet, and opened full frames for anything that looked off. Stats-5 and Stats-7 were split in two because of their length.
- Findings are only things seen in a frame or verified in code. P1s were spot-checked against frames and source: Stats-2 #1 (n-1 label), Stats-5 part B #1 (bigger-samples panel), Stats-6 #1 (headline word space), DbDesign-7 #1 (555-2000), Stats-8 #2 (Berkeley), and the series-wide hyphen issue below.
- The tools are in [`20261021-course-video-review/tools/`](20261021-course-video-review/tools/): `sample.mjs` (render the frames), `timeline.mjs` (beat timeline with pacing numbers), `sheets.py` (contact sheets). Frame numbers in the reports are `floor(t * 2)`, so any one can be re-rendered from its time.

## Already fixed (PR #711)

- **ERD entity boxes:** the last row was 4px shorter than the others. The 2px outline was drawn inside the box's fixed height and `overflow: hidden` clipped it from the last row (`video/src/editorial/erd.tsx`).
- **White page:** every video is now on plain white instead of warm paper with grain, and ERD boxes are white instead of a cream tint.

## Series-wide problems

These recur across most videos. Each is cheaper to fix as a pattern (or once, in the kit) than video by video.

### 1. No breath between ideas

Overall pace is normal (133 to 147 words a minute), but beats run almost back to back. The default silence between beats is 0.35 s (`DEFAULT_PAUSE` in `video/src/narration/timeline.ts`), and 50 to 77% of beat-to-beat gaps in every video are 0.45 s or less. So a definition, a new symbol or a result is followed 0.3 s later by the next one, often at 3+ words a second. Every report names its worst runs, for example:

- Stats-1: parameter, statistic, mu and x-bar, "random variable", all with 0.35 s breaths.
- Stats-2: variance and standard deviation defined in one beat.
- Stats-7: Type I, Type II and power within 17 s; Spearman 0.30 s after Pearson.
- DbDesign-3: the crow's-foot key given in 10 s.
- DbDesign-5: the many-to-many argument, five beats at 0.35 to 0.40 s.

**Fix:** raise `pauseAfter` to 0.6 to 1.0 s on beats that define a term or deliver a result. This costs nothing to voice. Each beat plays its own audio cut and every animation is cued to words, so the picture follows. It adds roughly 10 to 20 s per video.

| Video | Gaps of 0.45 s or less | Beats over 3 words/s |
| --- | --- | --- |
| Stats-1 ThinkingStatistically | 68% | 6 |
| Stats-2 DescribingData | 72% | 11 |
| Stats-3 Probability | 59% | 9 |
| Stats-4 Distributions | 50% | 17 |
| Stats-5 Sampling | 63% | 21 |
| Stats-6 Estimation | 63% | 11 |
| Stats-7 TestingHypotheses | 77% | 14 |
| Stats-8 InterpretingResults | 77% | 10 |
| Stats-9 StatisticsInPractice | 71% | 8 |
| DbDesign-1 WhyDesign | 52% | 4 |
| DbDesign-2 Entities | 50% | 4 |
| DbDesign-3 Relationships | 64% | 4 |
| DbDesign-4 Keys | 65% | 7 |
| DbDesign-5 RelationshipPatterns | 66% | 7 |
| DbDesign-6 Constraints | 64% | 12 |
| DbDesign-7 Normalization | 51% | 11 |
| DbDesign-8 DesigningSchemas | 71% | 6 |
| DbDesign-9 RelationalHistory | 59% | 3 |

### 2. The payoff arrives last and leaves first

A scene's evidence (a Postgres error, a result, the takeaway note) is often cued to the last word of a beat and cleared one or two seconds later, before it can be read. Examples:

- DbDesign-7: both 1NF errors, about 1 s each.
- DbDesign-6: the pair and banana refusals, about 1 s.
- DbDesign-4: the roster refusal, about 2 s.
- DbDesign-1: four "project" chores with a 0.8 s hold.
- Stats-7: Fig. 11, about 1.8 s.
- Stats-4: the seven named shapes, under 1 s.
- Stats-3: every scene starts its exit 0.73 s after its last word (`EXIT = 36` in `probability/Video.tsx`).

**Rule to apply:** anything the viewer must read either is narrated, or stays at full strength for at least its word count divided by 2 seconds.

### 3. Text on screen that nobody says

Lists, notes and errors appear unspoken, often during the fast beats in problem 1. Examples:

- the domain list in DbDesign-2
- the "what to do" lines in Stats-2
- the Sybase / Britton Lee / SQL Server chain and the closing error in DbDesign-9
- the lever line in Stats-6
- Bayes' formula with P(+) = 0.01098 in Stats-3

Either voice them or cut them to what can be read in the time.

### 4. Empty openings, half-empty middles

Many scenes open on a headline alone for 3 to 9 s, because the first figure is cued to a word deep in the first beat. Examples:

- the DbDesign-4 hook and choose scene
- the DbDesign-1 cost scene, 9 s
- the Stats-3 inverse and expected-value scenes
- the Stats-8 "Simpson's paradox" moment
- DbDesign-9's "Keep the data in tables", spoken over a blank page

Elsewhere half the frame sits empty for 10 to 25 s beside a small figure:

- DbDesign-7: 2NF and 3NF
- Stats-1: the parameter cards
- Stats-7: the power grid and the ANOVA ring
- DbDesign-9: the Postgres card

Bring the first figure in on the scene's first beat, and use the empty half for the notation the narration is speaking.

### 5. Notation and jargon before (or without) a definition

- **Statistics:** these appear unglossed or before they are defined: mu, sigma, x-bar, s, SE, n, df, p-hat, E[X], Var(X), H0, alpha, 1 - beta, ANOVA, ECDF, Cohen's h, box-plot fences, the z-score rule, and "forking paths" (taught as p-hacking). Saying the word next to the symbol at first use fixes most of them.
- **Database Design:** PK/FK badges and crow's-foot ends are used from Unit 1. The ends are only decoded in Unit 3, where the finished key is on screen for about 1 s. "UK" is never spoken. DbDesign-4 shows "PK, FK" and a "foreign key constraint" error 80 s before it defines a foreign key. Keep DbDesign-3's Fig. 3 key on screen as a legend, add one sentence on the notation to DbDesign-1 or 2, and don't badge a key before the video names it.

### 6. Count-ups that display false numbers

A counter shows its starting value, or values in between, while the right one is being spoken:

- Stats-2: "SD 0.0"; the mean shown as the median.
- DbDesign-8: "= 0.00" for 1.6 s.
- Stats-1: the zip mean.
- Stats-4: the rule percentages.
- Stats-8: "p = 0.44".

Fade a counter in only when it starts moving, or ink the final value on its word.

### 7. Spaced hyphens in every chart note (kit)

"Left - skewed", "co - founded", "p - value", "Mann - Whitney". `note()` in `video/src/editorial/style.ts` sets `fontVariantNumeric: "tabular-nums lining-nums"`, and Inter's tabular-figures feature also puts the hyphen in a figure-width slot. Confirmed by rendering Inter both ways: tabular widens the hyphen, plain lining figures and U+2011 do not. This affects every video. **Fix once:** make `note()` lining figures only, and add tabular figures where digits must not shift (counters, number columns).

### 8. Smaller patterns

- **Headline halves left dangling for 5 to 25 s:** "Pair" (15 s), "A z-score is" (13 s), "Valid rows," (25 s), "Two tails,". Each ends mid-sentence, so it reads as a typo.
- **Figure numbering:** some figures are numbered and others not. The merged Stats-5 restarts at Fig. 1 twice. Pick one rule per course.
- **Colour meanings flip inside a scene:**
  - Stats-5's CLT part draws averages blue where the parts around it use red.
  - Stats-3 uses red for the mode and for E[X].
  - DbDesign-9's Fig. 3 reverses the colours of the scenes before it.
- **Labels on lines:** a rule, bracket or curve runs through a label in most videos. Each report lists them with offsets.

## The 24 P1 findings

Only two need the narration changed, and one of those (DbDesign-7) can be fixed in the data instead. Three more would read better with a small voice change; the rest are scene-code fixes. The last column says which.

| Video | When | Problem | Where | Voice |
| --- | --- | --- | --- | --- |
| DbDesign-1 | 117.8-129.6 s | Fig. 5 says only Ada bought a notebook, but Fig. 1 showed Grace buying one: the video mixes two lesson datasets with the same names and order ids | `db-why-design/JoinScene.tsx:87,134-141`, `data.ts` | no |
| DbDesign-3 | 77-88.5 s | The crow's-foot key is given in 10 s at 3.2 words/s and the finished key is on screen about 1 s. It is the only place the notation is decoded | `db-relationships/EndsScene.tsx:206`, `script.ts` | no |
| DbDesign-6 | 208-222 s | A row shown as stored is then struck out with a NOT NULL error, as if adding the rule rejected existing data | `db-constraints/UnknownScene.tsx:110,142-151` | no |
| DbDesign-7 | 80.3-86.2 s | Narration says "five five five, two thousand", the query searches '555-2200' | `db-normalization/script.ts:135` | yes, or change the data to 555-2000 |
| DbDesign-7 | 92.4-108.2 s | Both 1NF errors are on screen for about a second | `CellScene.tsx:202`, `ChildScene.tsx:167` | no |
| DbDesign-8 | 153.5-158.8 s | Totals print "= 0.00" before counting up | `db-designing-schemas/ErdScenes.tsx:266-278` | no |
| DbDesign-8 | 243.3-252.5 s | The wide-table close: empty page, then overlapping truncated chips, and no picture of the "tangled rules" it claims | `ScaleScene.tsx:55-99` | no |
| DbDesign-9 | 133.4-137.5 s | "Who sold SQL first" gains a Berkeley lane starting 1973, so Berkeley appears to beat Oracle. Ingres spoke QUEL and was not sold | `db-relational-history/RaceScene.tsx:89,129,142-145` | no |
| Stats-2 | 163.3-165.5 s | The n-1 demo moves the center line but keeps the label "sample mean -5.3" and "455.0, measured from the sample mean" (the true sum is 404.6) | `describing-data/DivisorScene.tsx:70-73,186-188,216` | no |
| Stats-2 | 300-320 s | "An outlier is far from the rest" over a chart with no outlier, and rings pulse on empty paper | `OutlierScene.tsx:140,155-156,225` | no |
| Stats-2 | 127-139.7 s | The variance working (distance sticks, squares) is drawn under the dots and can't be seen | `DeliveryScene.tsx:13,165-197` | no |
| Stats-2 | 62-64.6 s | "most orders" label printed across the histogram bars | `SkewScene.tsx:179` | no |
| Stats-3 | 85-96.8 s | The "five heads in a row" coins land on flips that were tails, one at a share of 0 | `probability/LawScene.tsx:248,255-256` | no |
| Stats-4 | 25.7-44.4 s | The Bernoulli at p = 0.3 stays beside a binomial built on 0.03, under "count the yeses" | `distributions/CastScene.tsx:133` | optional |
| Stats-5 | 137-157 s | The "Variance" bracket spans the 95% range but is labelled with the SD, and bias is listed under "Variance" | `sampling-bias/CloseScene.tsx:186,197-203` | no |
| Stats-5 | 368-378.6 s | "Bigger samples" fills in 10 s early, showing samples of 10 with a pile twice as wide, under "Only one narrows the spread" | `sampling-distributions/LeversScene.tsx:65,86` | no |
| Stats-6 | every scene | No word space between the two halves of every headline ("Play god:the truth", "needstwo") | `estimation/parts.tsx:344` (`gap: 0.32em` resolves against 16px) | no |
| Stats-6 | 123.5-130 s | A divider runs through the "where the people are" caption | `MisreadScene.tsx:17,195,201` | no |
| Stats-6 | 255-264 s | Bootstrap labels printed on the dot stack | `ResampleScene.tsx:168,179,185` | no |
| Stats-7 | 460.5-468.6 s | "their own control" is struck through by a bracket | `testing-hypotheses/PairsScene.tsx:155,238` | no |
| Stats-7 | 489-498.2 s | The ANOVA figure draws "between" smaller than "within" yet reads F = 12.2, with no baseline for F | `GroupsScene.tsx:204-228` | optional |
| Stats-8 | 130.9-145.7 s | d = 0.36 is presented as the checkout button's effect size, but comes from another experiment | `interpreting-results/RatesScene.tsx:67-71,218` | yes, minimum one clause |
| Stats-8 | 151.7-206.8 s | The lesson's invented two-department numbers appear under "The famous case: Berkeley, 1973" | `AdmitScene.tsx:107-113` | optional (subtitle fixes most) |
| Stats-9 | 183-206.8 s | "planned 8,000" sits under "3,841 users in each arm", the number set one beat earlier | `statistics-in-practice/PeekScene.tsx:13,72,93,138-141` | no |

## Per video

| Video | Length | P1 | P2 | P3 | In short |
| --- | --- | --- | --- | --- | --- |
| [Stats-1 ThinkingStatistically](20261021-course-video-review/Stats-1-ThinkingStatistically.md) | 5:34 | 0 | 9 | 15 | Clean figures. The parameter/statistic definitions are rushed. Exits empty the page 2 s early. The narrator says counts/measurements while the screen says discrete/continuous. |
| [Stats-2 DescribingData](20261021-course-video-review/Stats-2-DescribingData.md) | 7:20 | 4 | 10 | 11 | The most P1s. The n-1 label, the outlier scene and the variance working each fail the narration. Datasaurus flashes past. |
| [Stats-3 Probability](20261021-course-video-review/Stats-3-Probability.md) | 7:33 | 1 | 9 | 10 | The coins land on tails. Every exit starts 0.73 s after the last word. The variance picture contradicts its caption. |
| [Stats-4 Distributions](20261021-course-video-review/Stats-4-Distributions.md) | 7:32 | 1 | 12 | 12 | 0.3 against 0.03. The uniform at 0.1 is a 19px sliver. CDF and Q-Q plots arrive unexplained. |
| [Stats-5 Sampling, part A](20261021-course-video-review/Stats-5-Sampling-partA.md) | 0-4:39 | 1 | 5 | 9 | The variance bracket is mislabelled. At the part seams, a new topic is introduced over a fading screen, and one question is asked twice. |
| [Stats-5 Sampling, part B](20261021-course-video-review/Stats-5-Sampling-partB.md) | 4:39-10:51 | 1 | 9 | 9 | The bigger-samples panel arrives early. The CLT part flips the colour of averages. sigma becomes s without a word. |
| [Stats-6 Estimation](20261021-course-video-review/Stats-6-Estimation.md) | 6:00 | 3 | 11 | 6 | Run-together headlines throughout. The only worked interval misses. 53 s of 3 words/s through the rate interval and the test link. |
| [Stats-7 TestingHypotheses, part A](20261021-course-video-review/Stats-7-TestingHypotheses-partA.md) | 0-5:03 | 0 | 10 | 9 | The steps procedure and "what a p-value isn't" are rushed. The null curve is never named. Labels collide with lines. |
| [Stats-7 TestingHypotheses, part B](20261021-course-video-review/Stats-7-TestingHypotheses-partB.md) | 5:03-10:01 | 2 | 9 | 14 | The ANOVA and chi-square pictures argue against their numbers. The "noise" bracket is the SD, not the SE. |
| [Stats-8 InterpretingResults](20261021-course-video-review/Stats-8-InterpretingResults.md) | 6:32 | 2 | 7 | 9 | Two misattributions (d = 0.36, Berkeley). "Regression to the mean" is never said. Nobody explains why the pooled rate flips. |
| [Stats-9 StatisticsInPractice](20261021-course-video-review/Stats-9-StatisticsInPractice.md) | 4:51 | 1 | 7 | 9 | 8,000 against 3,841. The A/B test never gets its verdict. "Forking paths" and Cohen's h are unexplained. |
| [DbDesign-1 WhyDesign](20261021-course-video-review/DbDesign-1-WhyDesign.md) | 2:56 | 1 | 8 | 11 | Two datasets with the same names. UK marks are dropped. ERD notation is never explained. |
| [DbDesign-2 Entities](20261021-course-video-review/DbDesign-2-Entities.md) | 2:54 | 0 | 3 | 8 | Clean. Crow's-foot labels are cued to the wrong words. PK is on screen 90 s before it is named. |
| [DbDesign-3 Relationships](20261021-course-video-review/DbDesign-3-Relationships.md) | 3:08 | 1 | 6 | 5 | The notation key flashes. Joins are asserted and the query is never shown. One highlight lands on the wrong row. |
| [DbDesign-4 Keys](20261021-course-video-review/DbDesign-4-Keys.md) | 3:40 | 0 | 7 | 9 | FK before it is defined. ON DELETE draws six tables before any rule is named. Key pills are 17px, under the floor. |
| [DbDesign-5 RelationshipPatterns](20261021-course-video-review/DbDesign-5-RelationshipPatterns.md) | 4:05 | 0 | 6 | 10 | The one-to-one split keeps a null profile row. The org tree has no ids. The many-to-many argument is rushed. |
| [DbDesign-6 Constraints](20261021-course-video-review/DbDesign-6-Constraints.md) | 4:07 | 1 | 9 | 9 | The stored row gets refused. The integer line shows false limits. Refusals are torn down after 1 s. |
| [DbDesign-7 Normalization](20261021-course-video-review/DbDesign-7-Normalization.md) | 4:33 | 2 | 5 | 13 | 555-2000 against 555-2200. Errors and "one row" results flash past. The 3NF chain is split in two. |
| [DbDesign-8 DesigningSchemas](20261021-course-video-review/DbDesign-8-DesigningSchemas.md) | 4:33 | 2 | 6 | 12 | "= 0.00". The wide-table close. Keys appear before "step five, keys". |
| [DbDesign-9 RelationalHistory](20261021-course-video-review/DbDesign-9-RelationalHistory.md) | 3:38 | 1 | 8 | 8 | The Berkeley lane. The pronunciation sits under the wrong card. Dates and names all check out. |

## Suggested order of work

1. **Kit, once:** lining figures in `note()` (problem 7), and a counter that shows nothing until it moves (problem 6). Both are small and fix every video.
2. **The 24 P1s.** Twenty-two are scene-code changes. DbDesign-7's phone number can be fixed in the data instead of the voice. Stats-8's d = 0.36 needs at least one spoken clause.
3. **A pacing pass:** `pauseAfter` on the beats each report names (problem 1), and a minimum hold for anything that must be read (problem 2). No voicing cost.
4. **Openings:** cue each scene's first figure to its first beat (problem 4).
5. **The P2 and P3 lists**, video by video. Re-run `npm run check:frames`, `check:motion` and `check:sync` after each video, as the README asks.
