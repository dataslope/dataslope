# Stats-3-Probability (0-453 s, whole video)

## Verdict
- The argument is solid and well cued: five parts, each number traced to the lessons, and the 99% test, the Monty Hall cases and the retest flip are all clear. Most frames are clean and nothing is under 19px.
- One real error. In the law-of-large-numbers chart, five "H" coins land on flips that the chart's own line shows as tails, including an H sitting at a share of 0. This is the one picture of "a streak gets swamped".
- Two scenes open on a blank page for about 5 s while a key term is being defined ("reads the conditional backwards", "expected value"). Several figures carry notation or numbers that the narration never reads: Bayes' formula with P(+) = 0.01098, P(free | churn) = 80%, E[X] and Var(X).
- The variance picture contradicts its caption. It draws raw distances but is labelled "squared and weighted by its chance".
- Pacing is mostly comfortable (about 2.6 words/s). The problems are the exits and two beats. Every scene starts dimming only 0.73 s after its last word, so the content added in each bridge beat gets under 2 s. The Monty Hall crux beat (`goat`) runs at 3.3 words/s.

## Findings

### 1. [P1] accuracy: The "five heads in a row" coins land on flips that were tails
- When: 85.0-96.8 s, beats `swamp` and `table-in` (frames element-174.jpeg, element-180.jpeg, element-190.jpeg)
- What: On "paid back", the five H coins from the side panel fly onto the first five points of Fig. 1 and stay marked H. That run (seed 1) starts T,H,H,H,T (measurements.json `lln.first10` = [0,1,1,1,0,…]). So an "H" sits on the x-axis at share 0 (flip 1), and another sits where the line drops from 0.75 to 0.60 (flip 5). The scene before has just said "the first seven flips were all heads" (seed 7), and nothing says Fig. 1 is a different run, so the chart starting at 0 also contradicts that. The "Five heads in a row" label also leaves at "paid back", which strands "The next flip / still ½" with nothing to refer to.
- Why it matters: The only visual for the gambler's fallacy is self-contradictory, and an attentive viewer will see it.
- Cause: `video/src/videos/probability/LawScene.tsx:255-256` (`tx = fx(1 + i)`, `ty = fy(llnAt(1 + i))` targets flips 1-5 whatever they were); `LawScene.tsx:248` (`out={paidAt + 8}` on the label); `LawScene.tsx:127` (Fig. 1 title does not name the run).
- Fix: Have `measure.py` export the first index k where flips k..k+4 of the seed-1 run are all heads, and fly the coins to `fx(k..k+4)`. On the log axis that lands where the line barely moves, which is the "swamped" point itself. Drop `out` on the "Five heads in a row" label. Title Fig. 1 "Share of heads in a new run of 5,000 flips".

### 2. [P2] confusion: Two scenes open on an empty page while the narrator defines the idea
- When: 222.6-227.6 s, beat `inverse` (element-446.jpeg, element-452.jpeg); 353.2-359.0 s, beat `die` (element-708.jpeg, element-713.jpeg)
- What: In `inverse`, only the headline "The gut reads it backwards." is on screen for about 5 s while "The gut answer reads the conditional backwards" is spoken. In `die`, the frame is fully blank until 355 s, then shows only "Expected value:" until the axis appears at about 359 s. Meanwhile the narrator says "Its most useful summary is the expected value, the long-run average". "Its" also refers to the random variable that has just been cut away.
- Why it matters: Both definitions (the inverted conditional, the expected value) land on an empty page.
- Cause: `BayesScene.tsx:101` (first content at `sickPeopleAt - 6`); `DieScene.tsx:74` (headline at `expectedAt - 6`), `DieScene.tsx:76` and `:98` (Fig. 7 label and axis at `loadedAt - 4`), `DieScene.tsx:58` (bars).
- Fix: In BayesScene, ink both column heads ("Among the sick / P(positive | sick)", "Among the positives / P(sick | positive)") at `inverseFrom + 6` without their numbers, and keep the 99% and 9% on their own words. In DieScene, ink the headline at the beat start and the Fig. 7 label, axis and face numbers on "expected value". Or open on the two-coin X carried over from RvScene with "E[X] = 1".

### 3. [P2] pacing: Every scene starts setting back 0.73 s after its last word
- When: every cut. For example, `lln-in` ends 50.7 s and the page dims from 51.4 s (element-102.jpeg full, element-104.jpeg dimmed). The same 0.73 s applies at 170.5→171.2 s (`test-in`), 340.2→340.9 s (`rv-in`) and 400.3→401.0 s (`decide-in`).
- What: The cut comes 8 frames before the next beat and the Exit starts 36 frames before the cut. With `sceneGap` 2.2 s, that leaves 0.73 s at full opacity, against the house standard of at least 1.3 s. It hurts most on the bridge beats, which ink in new content and then fade it almost at once: "no average of these" (about 339.7 s), "worth weighing", and P(free | churn) = 80% (finding 4).
- Why it matters: The viewer loses the finished figure, and each bridge's new line, almost as soon as it lands.
- Cause: `video/src/videos/probability/Video.tsx:20` and `:24` (`LEAD = 8`, `EXIT = 36`); `script.ts:77` (`sceneGap: 2.2`).
- Fix: Set `EXIT` to 18 (hold becomes 1.33 s), or raise `sceneGap` to 2.8 s.

### 4. [P2] explanation: P(free | churn) = 80% is flashed in a bridge beat and never said
- When: 168.8-171.2 s, beat `test-in` (element-338.jpeg, element-341.jpeg)
- What: Under the split bars, "P(churn | free) = 24%   P(free | churn) = 80%" and "Same table, the other way round." ink in. The narration only says "which way round you read a conditional matters more than it looks". The 80% (120 of 150) is never derived or spoken, and it has about 2 s at full opacity before the exit for roughly 10 words of text.
- Why it matters: This is the first reversed conditional, the set-up for the whole Bayes part, and it goes by unread.
- Cause: `SplitScene.tsx:236-243`.
- Fix: Give it its own beat, for example "Twenty-four percent of free users churn. But eighty percent of churners are free.", with `pauseAfter: 0.8`, and show "= 120 / 150" beside the 80%. Otherwise delete the 80% line and let TestScene carry the reversal.

### 5. [P2] confusion: The multiplication rule is written beside a figure labelled "Dependent"
- When: 157.6-166.0 s, beat `multiply` (element-330.jpeg, element-341.jpeg)
- What: The right column stacks "Independent means P(churn | plan) = P(churn)", "Here it isn't: the gap is information." and "Independent, so multiply / Ten heads in a row / ½ × … × ½ = 0.001". Meanwhile the figure is tagged "Dependent: the split steps" and the headline reads "Plan and churn are dependent." A coin example arrives inside a churn chart with no coin anywhere on screen.
- Why it matters: "Independent" and "dependent" sit side by side with no visual break, so the rule reads as if it applied to the churn data.
- Cause: `SplitScene.tsx:189-227` (one column, nothing sets back at `multiplyAt`); headline at `SplitScene.tsx:85`.
- Fix: At `multiplyAt - 4`, dim the bars and the independence block to 0.3, change the headline to "Independent flips multiply.", and draw ten small heads `Coin`s above the ½ row. Restore the bars for `test-in`.

### 6. [P2] spacing: A dotted level runs through the "churned" label, and transient labels show 11% and 19%
- When: 152-172 s, beats `step`, `multiply` and `test-in` (element-310.jpeg, element-341.jpeg); 148.5-149.5 s, beat `step` (element-298.jpeg)
- What: Paid's dotted 6% level is carried across to the "18 points" bracket at y≈428 and strikes straight through the white "churned" label inside the Free bar. While the bars animate back from 15%, the split labels return to full opacity and read "11%" and "19%", values the narration never says. The "19%" also sits on the dashed 15% line.
- Why it matters: A line through a label, and briefly a pair of wrong numbers, on the figure that carries the dependence argument.
- Cause: `SplitScene.tsx:119-128` (dotted line from paid bar to `STEP_X` at `splitY(0)`) against `SplitScene.tsx:153-165` ("churned" at `top + 12`). `SplitScene.tsx:143`: the label opacity comes back when `whatIf` ends at `jumpsAt - 4 + 10`, while `back` runs for 22 frames.
- Fix: Start the dotted line at `BARS.x[1] + BARS.w`, so it only crosses the gap to the bracket, or move "churned" to `top + 40`. Keep the labels at 0.4 opacity until `back` reaches 1 (end `whatIf` at `jumpsAt + 18`).

### 7. [P2] explanation: Bayes' formula and its arithmetic are on screen but never explained
- When: 234.1-252.8 s, beats `bayes` and `neglect` (element-470.jpeg, element-504.jpeg)
- What: "P(sick | +) = P(+ | sick) × P(sick) ÷ P(+)" and "= 0.99 × 0.001 ÷ 0.01098 = 0.090" ink in and are never read. P(+) = 0.01098 has no source on screen (it is 1,098 / 100,000 from the tree, which has gone). The notation switches from "positive" to "+" one line down. The highlighter fires on "one" under P(sick | +) and on "the other" under P(+ | sick), 0.5 s apart. That is the reverse of the arrow above, which runs from P(positive | sick) to P(sick | positive).
- Why it matters: The base rate is the point of the beat, but the formula's other inputs look arbitrary, and the highlight order says the opposite of the arrow.
- Cause: `BayesScene.tsx:135-169` (formula and arithmetic), `BayesScene.tsx:137-138` (sweep cues).
- Fix: Spell out "positive" in the formula. Add a line on `testedAt`: "P(positive) = 1,098 / 100,000: everyone who tests positive". Swap the sweeps (P(+ | sick) on "one", P(sick | +) on "the other"), with at least 10 frames between them.

### 8. [P2] accuracy: The variance picture draws raw distances but is labelled "squared and weighted"
- When: 387.0-402.0 s, beats `spread` and `decide-in` (element-781.jpeg, element-791.jpeg)
- What: Six stacked lines run from 4.5 to each face, so they show |x − 4.5|: face 1 longest, face 6 short. The caption reads "each face's distance from 4.5, squared and weighted by its chance". The weighted squares are actually 1.225, 0.625, 0.225, 0.025, 0.025 and 1.125, so face 6 contributes almost as much as face 1 while the picture shows it as minor. The 3.25 is never derived on screen. The lines are 5px apart, and the ±1.8 band sits about 8px under "4.5, not a face".
- Why it matters: Variance is being defined, and the picture contradicts both its caption and the narration ("average squared distance").
- Cause: `DieScene.tsx:124-131` (`x2 = fxv(v)`, raw distance; pitch `i * 10`); caption at `DieScene.tsx:236-238`; band at `DieScene.tsx:112-121` (`base + h(108)`) against the label at `DieScene.tsx:175` (`base + h(60) + 26`).
- Fix: Draw each term as a segment of length p·(x − 4.5)², laid end to end into one bar of 3.25 (the mean's own sum is built the same way). Set "1.225 + 0.625 + 0.225 + 0.025 + 0.025 + 1.125 = 3.25" in the right column (`measurements.json spread.terms`). Move the band to `base + h(130)` and give the lines a 14px pitch.

### 9. [P2] pacing: The Monty Hall crux is the densest beat in the video
- When: 310.7-318.2 s, beat `goat`, 3.32 words/s, 0.35 s after `cases` (element-622.jpeg to element-636.jpeg); also `late` at 65.2-69.9 s, 3.38 words/s
- What: In 7.5 s the narration gives the whole switching argument while rows 2 and 3 build, two doors open and two switch arrows draw.
- Why it matters: This is the step most viewers have to replay, and it gets no breath.
- Cause: `script.ts:262` (one beat holds both halves of the argument).
- Fix: Split it into "The other two times, you've picked a goat..." (`pauseAfter: 0.6`) and "so the host has to open the other goat. The door he leaves shut has the car." (`pauseAfter: 0.6`), and cue row 3 and its arrow to the second half.

### 10. [P2] explanation: "The spread matters more" has no picture of the warranty's spread
- When: 429.2-439.0 s, beat `once` (element-877.jpeg)
- What: The screen adds three italic sentences ("Faced many times…", "Faced once, and ruinous, the spread does.", "Insurance is paying to avoid the spread."). Nothing shows what the spread is for this warranty: without it the buyer pays $0 85% of the time and $300 15% of the time; with it, $80 every time. `measurements.json warranty.lose` (−220) is measured but never used.
- Why it matters: The caveat that motivates insurance is asserted, not shown, right after a variance was defined.
- Cause: `WarrantyScene.tsx:178-190`.
- Fix: On "one loss", add two outcome rows on the right: "No warranty: 85% pay $0, 15% pay $300" and "Warranty: pay $80, every time". Sweep the $300 on "couldn't survive".

### 11. [P3] pacing: The closing shape names appear after the narration has ended
- When: 450.8-452.9 s, beat `next` (element-902.jpeg, element-905.jpeg)
- What: "binomial", "normal" and "exponential" ink 0.9 to 1.4 s after "distributions", and the video ends about 1.5 s later. "Many share a shape:" sits only about 0-10px above the curve peaks.
- Why it matters: The named distributions are the hand-off to Unit 4, and they are barely readable.
- Cause: `WarrantyScene.tsx:203` (`lastEnd + 26 + k * 8`); `WarrantyScene.tsx:194` (text at `y(790)`, curves peak at `SHAPES.base - h` = `y(822)`).
- Fix: Cue each name with its shape (`manyRvAt`, `shapesAt`, `namedAt`), raise `tail` to 4, and move the text line to `y(770)`.

### 12. [P3] confusion: Red means two opposed things inside one figure
- When: 358-402 s (Fig. 7), 410-441 s (Fig. 8), 287-342 s (Monty Hall)
- What: In Fig. 7, the mode bar (6), the fulcrum and E[X] = 4.5 are all red, while the narration contrasts them ("isn't the likeliest roll, either. That's six"). In Fig. 8, the store's expected profit is a red $35 on the left, the same figure is a green +$35 on the right, and the buyer's −$35 is red. The "switch?" arrow is red in DoorsScene, but switch is blue (and stay red) in CasesScene.
- Why it matters: Within each scene, colour stops telling the viewer which quantity is which.
- Cause: `DieScene.tsx:89`, `:107`, `:196`; `WarrantyScene.tsx:146`, `:165`, `:172`; `DoorsScene.tsx:140` against `CasesScene.tsx:155`, `:195`, `:264`.
- Fix: Draw the mode bar in DATA with a GOLD outline. Set the left $35 in `OK_INK`. Draw the DoorsScene switch arrow in DATA.

### 13. [P3] explanation: Log axes are not marked, and Fig. 1 writes one quantity four ways
- When: 53-96 s (Fig. 1); 319-342 s (Monty win-rate chart) (element-140.jpeg, element-663.jpeg)
- What: In Fig. 1, the x ticks 1, 10, 100, 1,000 and 5,000 are evenly spaced with no "log", so "after a thousand" looks three quarters of the way through. The figure title says "Heads so far", but the y-axis is a share. The same share is written as .75 (axis), 0.75 (label), 56% and 40% (bracket), "1.4 points of ½" and ½. The Monty chart has a log x-axis with no title at all, and y ticks of 1, ½ and 0 while its dashed guides at ⅓ and ⅔ are unlabelled.
- Why it matters: Viewers new to log scales misread how fast the share settles, and the mixed notation makes them convert in their heads.
- Cause: `LawScene.tsx:127`, `:141-148`, `:195`, `:224-231`; `CasesScene.tsx:170-189`.
- Fix: Title the x-axis "flips so far (log scale)" and Fig. 1 "Share of heads so far…". Write every Fig. 1 value in percent. Give the Monty chart the x title "games played (log scale)" and y ticks ⅓ and ⅔ instead of ½.

### 14. [P3] accuracy: Small mismatches between what is said and what is shown
- When: 164-172 s (`multiply`), 67-96 s (`late`), 297-305 s (`column`)
- What: The screen writes "½ × … × ½ = 0.001", but 0.5¹⁰ = 0.000977. The narration says "a point and a half" while the screen says "within 1.4 points of ½". "Switch. It wins two times in three." is set in quotation marks as vos Savant's words, but it is a paraphrase.
- Why it matters: Each one is small, but a careful viewer will notice it.
- Cause: `SplitScene.tsx:223`; `LawScene.tsx:231` against `script.ts:118-120`; `DoorsScene.tsx:158`.
- Fix: Write "≈ 0.001". Say "never strays more than one and a half points", or show "1.5" to match. Drop the quotation marks.

### 15. [P3] confusion: The "given" note arrives 4 s before the bar it explains
- When: 107.4-111.6 s, beat `paid` (element-216.jpeg, element-220.jpeg)
- What: "The bar reads 'given': churn, given a paid plan." is on screen with no P(· | ·) expression anywhere. The first one inks in only at "six percent".
- Why it matters: The viewer is told to read a symbol that is not there yet.
- Cause: `TableScene.tsx:255` (`conditionAt + 4`) against `TableScene.tsx:239` (chip at `c.at - 8`).
- Fix: Cue the note at `sixAt + 4`.

### 16. [P3] other: Figure numbering is inconsistent
- When: 172-453 s
- What: The Monty win-rate chart, a real data chart, has no figure number, while "Fig. 8" labels a list of text. "Fig. 4 The lesson's tree" points at a lesson the viewer may not have open.
- Why it matters: The numbering does not tell the viewer which things are figures.
- Cause: `CasesScene.tsx:169-171` (plain label); `WarrantyScene.tsx:108`; `TestScene.tsx:198`.
- Fix: Make the win-rate chart Fig. 7 and renumber the die to Fig. 8. Drop the FigLabel from the warranty text. Retitle Fig. 4 "100,000 people through the test".

### 17. [P3] explanation: E[X] and Var(X) are never named
- When: 368.5 s onwards (`weight`), 441 s (`next`)
- What: "E[X] =" appears with no spoken or written gloss. The only X defined so far is "the number of heads" in RvScene, but for the die X is the face rolled. "Var(X)" first appears in the closing line.
- Why it matters: Viewers meet new notation at the summary point.
- Cause: `DieScene.tsx:195`; `WarrantyScene.tsx:195-196`; `RvScene.tsx:50`.
- Fix: Add "X = the face rolled" under Fig. 7's title and "E[X], the expected value of X" on "expected value". Write "Variance" in words in the closing line, or gloss "Var(X)" in DieScene.

### 18. [P3] spacing: The tree and the Monty cases are squeezed into half the frame for long stretches
- When: 189-207 s, beats `walk` to `flagged` (element-410.jpeg); 306-319.5 s, beats `cases` and `goat` (element-622.jpeg)
- What: Fig. 4 occupies x 115-950 with node sub-labels at 21px, and the right half stays empty for 18 s until the line-up arrives. Fig. 6's mini doors sit on the left half for 13 s before the win-rate chart is drawn.
- Why it matters: The figures are smaller than they need to be while most of the canvas is empty.
- Cause: `TestScene.tsx:14-22` (`NODE` positions); `CasesScene.tsx` door rows at a fixed left layout.
- Fix: Draw the tree 1.3× larger and centred, then slide it to its current left position on `lineupAt - 8`. Or draw the empty dashed frame of the line-up grid on "walk" so the right half is visibly reserved.

### 19. [P3] confusion: The opened door looks closed
- When: 288-305 s, beats `host` and `column` (element-607.jpeg)
- What: The doorway behind the opened door 3 is almost the same grey as a closed leaf, with "goat" printed on it. A 1px knob dot is left at the hinge.
- Why it matters: The host's reveal reads as a label on a closed door.
- Cause: `DoorsScene.tsx:45` (room = INK at 16% on paper, close to FAINT); `DoorsScene.tsx:47` (knob `r = 8 * leaf / w` never reaches 0).
- Fix: Fill the room with INK at about 60%, set "goat" in PAPER, and hide the knob when `open > 0.5`.

### 20. [P3] spacing: Small alignment slips in the opening scene
- When: 19-52 s (element-094.jpeg); 11-16 s (element-026.jpeg)
- What: "Probability of heads" and "One flip" sit on different baselines (y≈307 and y≈318). The 120px italic "?" in the "Data you haven't seen" panel overhangs onto its bar's dashed right edge.
- Why it matters: Polish only.
- Cause: `OpenScene.tsx:170` (`y(290)`) against `OpenScene.tsx:174` (`y(300)`); `OpenScene.tsx:153` (`headline(120, true)` centred on a 71px-wide bar).
- Fix: Put both labels at `y(300)`, and set the "?" at `headline(96, true)`.
