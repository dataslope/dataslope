# DataScientist-7-ExperimentsInPractice (7:24, 443.5 s)

## Verdict
- The video is accurate and clean. Every number spoken matches `results.json` and the page: chi-square 16 with p 0.00006, 4,960/5,040 at p 0.42, intervals −3.2 to +1.8 and −0.1 to +0.4, Simpson's 10/9, 3.5/3 and 4.8/7.8, 64%, five raw hits with two false, Bonferroni keeping 2 and BH keeping 3, DiD 8.9 − 2.4 = 6.5, and 2.24×. All ten question cards are read word for word. No on-screen text is under 19px, and nothing is clipped.
- The biggest problems are figures that do not carry their own claim. The BH staircase runs straight through the three dots that decide the answer. The DiD panel prints the comparison city's +2.4 rise as "− 2.4". The meta-analysis "weighted by precision" sketch collapses into a bullseye with no axis. The 2.24× winner's-curse bar is on screen for about a second.
- As interview answers they mostly hold up, but some leave out the part an interviewer presses on. Simpson's paradox is shown but never defined in words. Parallel trends is stated, but the video never says how to check it. BH is named but not explained. Switchbacks never say why a marketplace cannot split users (interference can inflate a difference as well as shrink it), and "leave room for carryover" is vague. The novelty defence "users who arrive after it stopped being new" is imprecise.
- Pacing is comfortable: 2.1 to 3.1 words/s, no gap between beats under 0.55 s, and every scene's finished state holds 3 s or more. The two exceptions are the winner's-curse figure and the 0.7 s boundary between Q7 and Q8.

## Findings

### 1. [P2] confusion: the Benjamini-Hochberg figure cannot show what BH keeps, and the procedure is never explained
- When: 241.7-253 s, beat `many-fix` (frames element-239.jpeg, element-253.jpeg)
- What: The green staircase passes through dots 3, 4 and 5. The deciding margins are 0.0136 against 0.015, 0.0228 against 0.020 and 0.0258 against 0.025, which puts each dot centre 2 to 7 px from the line on an 11 px dot. You cannot see that rank 3 is under its step and ranks 4 and 5 are over theirs. "Keeps 3" is carried by the legend alone. The narration names BH and the false discovery rate but never says how the staircase is built. An interviewer will ask. "The share of your hits that are false" also leaves out "expected".
- Why it matters: the claim "keeps the three real ones" has no visible evidence, and the viewer cannot reproduce BH when asked.
- Cause: `video/src/videos/ds-experiments-in-practice/ManyScene.tsx:65-72,151` draws the steps at k/m × 0.05 with no marking of the kept set. `script.ts:156` has no sentence on the rule. `ManyScene.tsx:194` has the FDR label.
- Fix: At `keepsThreeAt`, ring ranks 1 to 3 in green (r 19, like the red false-alarm rings at line 163). Draw a short vertical green divider between ranks 3 and 4 labelled "BH keeps ranks 1-3". In `many-fix`, after "Benjamini-Hochberg", add: "It gives the k-th smallest p-value a bar of k tenths of five percent, and keeps everything up to the last one under its bar." Say "the expected share of your hits that are false".

### 2. [P2] confusion: the DiD arithmetic prints the comparison city's rise as "− 2.4"
- When: 352.5-371.6 s, beat `did-math` (frame element-370.jpeg)
- What: The narration says "The comparison city rose two point four". The panel reads "treated city +8.9 / comparison city − 2.4 / DID +6.5". Read as a column of changes, it says the comparison city fell 2.4, and the sum 8.9 + (−2.4) = 6.5 still checks out. That makes the wrong reading self-consistent.
- Why it matters: a viewer can come away thinking the control group's change is added rather than subtracted.
- Cause: `video/src/videos/ds-experiments-in-practice/DidScene.tsx:138` renders the second row as `− ${fixed(r.v, 1)}`.
- Fix: Show both changes signed, as "+8.9" and "+2.4". Put the subtraction in the result row: "DiD = 8.9 − 2.4 = +6.5" (`DidScene.tsx:148-154`).

### 3. [P2] answer: interference is shown only shrinking the difference, and the switchback answer skips why and how
- When: 269.7-283.1 s, beat `network`; 287.4-302.3 s, beat `switchback` (frames element-282.jpeg, element-303.jpeg)
- What: Q7 says spillover means "the difference shrinks". Q8 then says "riders and drivers share one pool, so you can't split users" without saying what goes wrong. In a marketplace the bias usually runs the other way: treated riders take drivers from control riders, so the split exaggerates the effect. "Leave room for carryover" never says what to do. The usual answers are to drop a washout window at the start of each period and to treat the period, not the user, as the unit of analysis. The hatched carryover strips are never said to be discarded.
- Why it matters: these are the exact follow-ups to a switchback question, and the viewer is left believing interference always biases toward zero.
- Cause: `video/src/videos/ds-experiments-in-practice/script.ts:164,169`; `NetworkScene.tsx:296-334` (the carryover hatch, unlabelled as dropped).
- Fix: In `switchback`, change the second sentence to "In a marketplace, riders and drivers share one pool: a treated rider who books faster takes a driver from a control rider, so a user split overstates the effect." Replace the last sentence with "Drop the first minutes of each hour as a washout, since one hour spills into the next, and count hours, not users, as the sample." Label the hatch "washout, dropped" at `carryAt + 4` (`NetworkScene.tsx:341-345`).

### 4. [P2] answer: Simpson's paradox is never defined in words
- When: 138.6-171.3 s, beats `simpson`, `simpson-pool` (frame element-171.jpeg)
- What: The question is "What is Simpson's paradox in an experiment?". The narration goes straight to the example and never states the general definition the page opens with: a result that holds in every segment and reverses in the total because the groups have a different mix. It also never says which number to trust. In a randomized test the mix should be equal, so an uneven mix is itself a randomization bug, like the SRM in Q2, and the within-segment comparison is the fair one.
- Why it matters: an interview answer that is only an anecdote does not answer "what is it", and "read the segments before the total" stops short of a decision.
- Cause: `video/src/videos/ds-experiments-in-practice/script.ts:125,130`; `SimpsonScene.tsx:207-210`.
- Fix: Add to `simpson-pool` after "the new checkout got mostly desktop": "That's Simpson's paradox: a result that holds in every segment flips in the total, because the arms have a different mix. In a randomized test the mix should match, so treat it like an SRM, and compare within each segment."

### 5. [P2] explanation: parallel trends is stated, but how to check it is not, and the pre-period highlight goes unexplained
- When: 364.3-369.3 s, beat `did-math` (tile 365 s on sheet-13, frame element-370.jpeg)
- What: On "It rests on parallel trends", a yellow band lights weeks 1 to 6 and fades about a second after the beat. The narration only describes the unobservable counterfactual ("would have kept moving together") and never says the weeks before the policy are the evidence. "How do you check parallel trends?" is the standard follow-up.
- Why it matters: the highlight points at something the narration never names, and the answer leaves out its most-asked follow-up.
- Cause: `video/src/videos/ds-experiments-in-practice/DidScene.tsx:66,91` (band shown from `parallelAt` to `togetherAt + 20`); `script.ts:188`.
- Fix: Append to `did-math`: "You can't see that after the policy, but you can check the weeks before: here the two cities rose together." Cue the band to "check the weeks before", and hold it to the beat's end.

### 6. [P2] answer: "check the users who arrive after the change has stopped being new" is too vague to repeat
- When: 205.0-208.4 s, beat `primacy` (frame element-209.jpeg)
- What: The second defence, said aloud and shown as "check users who arrive after it stopped being new", does not say which users. A change is new to each user when they first see it. The page's answer is new users who never saw the old version. The usual diagnostic is the lift plotted by days since each user's first exposure.
- Why it matters: an interviewer will ask "which users, exactly?", and this wording has no clear answer.
- Cause: `video/src/videos/ds-experiments-in-practice/script.ts:143`; `NoveltyScene.tsx:149-150`.
- Fix: In the script, write "and compare new users, who never saw the old version, with returning ones." On screen, write "compare new users (never saw the old) with returning ones".

### 7. [P2] pacing: the winner's-curse result is on screen for about a second
- When: 427.5-429.5 s, beat `r-meta` (frame element-429.jpeg; tile 430 s on sheet-15 shows it gone)
- What: The red 2.24× bar grows from 427.5 s and is full at about 428.1 s. The whole Meta panel fades at the beat's end, 429.3 s. The headline number of the rapid round is readable for about 1.1 s, and the next beat starts 0.9 s later.
- Why it matters: the one number the meta-analysis item rests on is gone before it can be read.
- Cause: `video/src/videos/ds-experiments-in-practice/RapidScene.tsx:211` (`end = n.beat("r-meta").to`, which `RapidFire` uses to fade the last body at `end - 2`); `script.ts:214` (`pauseAfter: 0.9`).
- Fix: Set `pauseAfter: 1.8` on `r-meta`, and set `end = n.beat("next").from - 4` at `RapidScene.tsx:211`, so the bar holds about 2.5 s at full. The turtle spot enters at `assumedAt`, after that.

### 8. [P2] confusion: the "weighted by precision" sketch collapses into a bullseye and shows nothing about weighting
- When: 417.3-429.3 s, beat `r-meta` (tiles 418 s and 420 s on sheet-14, frame element-429.jpeg)
- What: Three study dots of different sizes sit on no axis, merge onto one point (leaving concentric rings), and a "pooled" dot appears below. Nothing places the studies at different estimates, so the viewer cannot see the pooled result pulled toward the precise study rather than the plain average. That contrast is the whole point of "rather than averaging headlines". "Precision" is never glossed.
- Why it matters: the figure ends as an unreadable target shape, and the concept goes unillustrated.
- Cause: `video/src/videos/ds-experiments-in-practice/RapidScene.tsx:144-164`. Every study merges to the same `tx = R_X + 200`, and the pooled dot is placed at a fixed offset.
- Fix: Put the studies on a short labelled effect axis, for example the precise study (r 46) at +2 and the noisy ones (r 22, 14) at +6 and +9. Mark "average of headlines +5.7" with a red tick, and place the green "pooled" dot at the inverse-variance mean (about +3) without merging the inputs. In the script, write "weighting each by its precision, so big, tight experiments count more".

### 9. [P2] spacing: "without the policy" collides with the treated-change bracket
- When: 364.6-371.6 s, beat `did-math` (frame element-370.jpeg)
- What: The label's first letter touches the bottom of the vertical blue bracket at x ≈ 723. The label starts 2 px to the right of a 4 px stroke that ends at the label's baseline.
- Why it matters: it is visible text-on-line contact in the scene's finished state, which holds 5 s.
- Cause: `video/src/videos/ds-experiments-in-practice/DidScene.tsx:164` places the label at `at(x, split) + 12`, and the bracket is drawn at `at(x, split) + 10` (line 59).
- Fix: Move the label to `x={at(x, split) + 30}` at the same y.

### 10. [P3] confusion: "read in week one" ends up labelling a band that spans weeks 1 to 2.5
- When: 203.3-210.4 s, beat `primacy` (frame element-209.jpeg)
- What: On "run past the first weeks" the yellow week-one band is replaced by an unlabelled grey band from week 0.6 to 2.5. The "read in week one" label stays above it.
- Why it matters: the finished chart labels a two-and-a-half-week span as week one, and the grey band's meaning is never written.
- Cause: `video/src/videos/ds-experiments-in-practice/NoveltyScene.tsx:86` (grey band) and `:112-113` (label never fades).
- Fix: Fade the label with `read` (`opacity: read`). At `pastAt`, add "first weeks: run past these" above the grey band.

### 11. [P3] confusion: the long-running sketch puts its labels on the wrong things
- When: 400.4-406.5 s, beat `r-long` (frame element-405.jpeg)
- What: The green outline round boxes 1 and 2 sits directly under "freeze the scope". Its own label, "at least one full business cycle", sits 100 px lower, below the orange drift labels. The boxes have no unit, so "two boxes = a business cycle" means nothing. The "end date" flag stands before boxes 7 and 8, so the run appears to continue past its own end date.
- Why it matters: in a rapid round there is no time to untangle which label belongs to which mark.
- Cause: `video/src/videos/ds-experiments-in-practice/RapidScene.tsx:77-82,85-98`.
- Fix: Move "freeze the scope" above the strip's centre. Place "at least one full business cycle (a week or two)" directly under the outlined boxes at `top + c.h(84)`, and move the drift labels above the strip. Caption the strip "weeks". Put the flag at `x0 + 8 * wk`.

### 12. [P3] confusion: SRM labels run together, and the bad split's verdict leaves while the good one's stays
- When: 61.5-98.5 s, beats `srm`, `srm-test`, `srm-cause` (frame element-097.jpeg)
- What: "asked for: 5,000 each" and B's "5,200" share a baseline 49 px apart and read as one phrase. On `srm-cause` the formula, "p ≈ 0.00006" and the "SRM" tag all exit. The finished frame keeps the green "p = 0.42: chance" verdict for the contrast split but has none for the split the question is about.
- Why it matters: the final frame's only p-value belongs to the split that is fine.
- Cause: `video/src/videos/ds-experiments-in-practice/SrmScene.tsx:104-105,114` (label positions) and `:158-178` (`out={formulaOut}` on the p-value and the tag).
- Fix: Move "asked for: 5,000 each" to the right end of the dashed line (`x = BARS_X + 2 * BAR_W + GAP + 50`, `y = sy(5000) - 14`). Keep a single line "p ≈ 0.00006: an SRM" under the A/B labels (`y(BASE) + h(56)`) after the formula exits.

### 13. [P3] spacing: the "really moved / didn't" legend sits on the p = 1 gridline
- When: 230-255 s, beat `many-fix` (frame element-253.jpeg)
- What: The legend's baseline is the dotted p = 1 row, so the dots run through and after "didn't" and meet the rank-10 point.
- Why it matters: the key reads as part of the data.
- Cause: `video/src/videos/ds-experiments-in-practice/ManyScene.tsx:169` places it at `y(RIGHT.top) + 4`, which is the `lg(1.5)` top of the scale.
- Fix: Place it at `y(RIGHT.top) - 20`, between the panel title and the plot, or raise `ry.hi` to `lg(4)`.

### 14. [P3] spacing: the zero line runs through the "−0.1" end label
- When: 131-138 s, beat `nosig-ci` (frame element-137.jpeg)
- What: The dotted zero line passes through the "1" of "−0.1" above the 100,000-per-arm interval.
- Why it matters: it is a visible collision on the scene's finished frame.
- Cause: `video/src/videos/ds-experiments-in-practice/NullScene.tsx:95` (zero line through both rows) and `:137-150` (end labels centred on the ends, `top: y(row) - h(52)`).
- Fix: For the large-sample row only, set the end labels' `top` to `y(row) + h(18)`, below the bar.

### 15. [P3] spacing: one-word orphans in wrapped lines
- When: 164-173 s (element-171.jpeg: "desktop" alone); 279-283 s (element-282.jpeg: "touch", "cities"); 329-371 s (element-370.jpeg: headline "work?" alone)
- What: Three notes and one question card each leave a single word on their last line.
- Why it matters: these are polish defects on frames that each hold 3 to 40 s.
- Cause: `video/src/videos/ds-experiments-in-practice/SimpsonScene.tsx:204` (`width={720}`), `NetworkScene.tsx:251,254` (`width={380}`), `DidScene.tsx:78` (`size={58}`).
- Fix: Simpson note width 800; network notes width 430; DiD question card `size={54}`, which fits on one line.

### 16. [P3] pacing: Q7 to Q8 gets 0.7 s where every other question boundary gets 1.6 s
- When: 282.2-283.8 s, beats `network` → `switchback` (tiles 282 s and 284 s on sheet-09)
- What: "or whole cities" lands at 282.0 s. The Q7 graph and card leave at 283.7 s, and "Question eight" starts 0.7 s after the last word.
- Why it matters: Q7's resolution gets the shortest settle in the video, right before a full change of picture.
- Cause: `video/src/videos/ds-experiments-in-practice/script.ts:165` (`pauseAfter: 0.7`).
- Fix: `pauseAfter: 1.6`.

### 17. [P3] other: label wording does not match the narration
- When: 358-371.6 s (element-370.jpeg); 270-283 s (element-282.jpeg)
- What: The narration says "DiD", but the panel says "DID". The network bars are labelled "new" and "control" next to a legend that says "gets the sharing feature" and "control".
- Why it matters: the on-screen abbreviation differs from the one just defined, and one axis mixes two vocabularies.
- Cause: `video/src/videos/ds-experiments-in-practice/DidScene.tsx:150`; `NetworkScene.tsx:233`.
- Fix: Use "DiD", and label the bars "sharing" and "control".

### 18. [P3] spacing: the "1×" label is off-centre over its bar
- When: 423.4-429.5 s, beat `r-meta` (frame element-429.jpeg)
- What: "1×" starts 20 px into its 120 px bar and sits about 23 px left of centre, while "2.24×" looks centred.
- Why it matters: the two value labels do not align with their bars in the same way.
- Cause: `video/src/videos/ds-experiments-in-practice/RapidScene.tsx:189` (a left-aligned Note at `b.x + 20`).
- Fix: Render the value in a div with `left: b.x`, `width: 120` and `textAlign: "center"`, like the axis label at line 186.

### 19. [P3] explanation: "factorial design" is named, not explained
- When: 323.9-328.4 s, beat `concurrent` (frame element-327.jpeg)
- What: The third remedy is said and boxed, and the grid turns green, but the video never says what a factorial design does. It randomizes each test independently so all four cells fill, then estimates the interaction directly. That independent randomization is also why most platforms let tests overlap.
- Why it matters: it is the remedy an interviewer is most likely to ask about.
- Cause: `video/src/videos/ds-experiments-in-practice/script.ts:175`.
- Fix: End the beat with "...or analyze them together as a factorial design: randomize each test independently, so all four cells fill, and estimate the interaction."

### 20. [P3] explanation: the 64% rests on unstated assumptions, and Bonferroni's guarantee is never named
- When: 216-240 s, beats `many`, `many-fix` (frames element-239.jpeg, element-253.jpeg)
- What: "Read twenty metrics, and the chance that at least one of them fires is sixty-four percent" holds only if none truly moved and the tests are independent. The left chart is the family-wise error rate, but "safe" is never tied to it: Bonferroni holds that chance at 5%.
- Why it matters: "What does Bonferroni control?" is a standard follow-up.
- Cause: `video/src/videos/ds-experiments-in-practice/script.ts:151,156`.
- Fix: Change to "If none of them really moved, read twenty, and the chance..." and "Bonferroni divides the five percent by ten, which holds the chance of any false alarm at five percent, and keeps two."

### 21. [P3] answer: the winner's curse is not tied to meta-analysis
- When: 421.2-429.3 s, beat `r-meta` (frame element-429.jpeg)
- What: "Watch for the winner's curse" follows the pooling sentence without saying why it matters there. If only the experiments that won (reached significance or shipped) go into the pool, it inherits their roughly 2× overstatement. The page's fixed versus random effects distinction is also left out.
- Why it matters: the item's two halves read as unrelated facts.
- Cause: `video/src/videos/ds-experiments-in-practice/script.ts:213`.
- Fix: "...Pool every experiment you ran, not just the winners: at twenty percent power, the ones that reached significance overstate the true effect more than twofold."

### 22. [P3] answer: "A randomized test makes them match" is too absolute, and the reason to use ATT is missing
- When: 388.4-392.8 s, beat `r-ate` (frame element-392.jpeg)
- What: ATE and ATT match in a randomized test only when everyone assigned actually takes the treatment. With opt-in features or non-compliance they differ even under randomization. The round promises "a definition and a reason each", but this item never says when you want ATT: the effect on the people who would actually use the feature, as the page puts it.
- Why it matters: an interviewer can break the absolute claim with one non-compliance example.
- Cause: `video/src/videos/ds-experiments-in-practice/script.ts:201`; `RapidScene.tsx:48-49`.
- Fix: "A randomized test where everyone assigned is treated makes them match; observational data can pull them apart. ATT is the one to report when only the people who use a feature matter."
