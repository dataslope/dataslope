# Llm-2-1-AttentionScore (2:27)

## Verdict
- A careful, legible walk-through. I checked every number on screen against `measurements.json` and the lesson's block: the dot products, the scaled scores, the e-powers, the total 4.464, the weights, both blends and the flipped query's 1.06 and 0.467. All of them are right, and the tables are large and well aligned.
- The worst defect is one sentence. "So it lands nearest trophy's value" is false: (4.85, 3.21) is 4.44 from the value of `it` and 6.07 from trophy's, and Fig. 9 draws it that way while the ring pulses on "nearest". The unit video's wording ("pulled toward trophy's") is right.
- In three places the explanation stops one step short. The recap calls the blend a step of "one attention weight". The case for scaling is asserted over an 8 s static three-number table, and it uses "softmax" before that word has been explained. "A weight on every token" turns into three keys, the pronoun's own among them, and nothing says why. The cosine aside ends on "Attention keeps the lengths" without saying what that changes.
- Pacing is mostly comfortable: 2.3 to 3.0 words/s, every gap 0.55 s or more, and every scene holds its finished state for at least 1.3 s. The exception is the divide step, which builds Fig. 6, shows its total and swaps it to shares in about 3 s.
- Polish: two lines run through labels and a box edge nearly touches its digits; axes and heat-map columns have no names; "score" and "short" each carry two meanings; one 16 px superscript; a half-second blank page at two cuts.

## Findings

### 1. [P1] accuracy: "lands nearest trophy's value" is false, and Fig. 9 shows it
- When: 109.8-112.2 s, beat `lands` ("nearest" at 110.7 s) (frames element-111.jpeg, element-118.jpeg; tile 109 holds 5 s)
- What: the narrator says "So it lands nearest trophy's value" while a red ring pulses round the new vector at (4.85, 3.21). On screen that point sits visibly closer to "value of `it`" (1, 1) than to "value of `trophy`" (10, 0). It is 4.44 away from the first and 6.07 from the second, and closer to `it` by angle too (11 degrees against 34). Trophy only has the biggest weight. The lesson's own words are "pulled toward trophy's value vector", and the unit video says "pulled toward trophy's" (`llm-meaning/script.ts:273`).
- Why it matters: a viewer who checks the figure sees it contradict the narration at the moment the video states its result.
- Cause: `video/src/videos/llm-attention-score/script.ts:148` (beat text); `BlendScene.tsx:112` rings the point on "nearest".
- Fix: re-voice `lands` as "So trophy's value pulls hardest." Cue the emphasis on "hardest" and put it on the trophy spring rather than the point (`BlendScene.tsx:273-282`: add `+ 6 * pulse(frame, hardestAt, 30)` to trophy's `strokeWidth`). Keep the ring for `answer` only.

### 2. [P2] accuracy: the recap calls the blend a step of "one attention weight"
- When: 129.1-136 s, beat `recap` (frames element-135.jpeg tile, element-145.jpeg)
- What: the headline reads "One attention weight, five steps." and Fig. 10 is titled "The pronoun's weight on trophy, start to finish". The narration says "So that's one attention weight. Multiply and add, scale, raise e, divide, blend." But the weight is finished at step 4 (0.461). Step 5, "Blend: weights × values, 4.85, 3.21", uses all three weights, and its output is the new vector, not a weight.
- Why it matters: it teaches that the blend is part of computing one weight, which blurs the scores-to-weights-to-output structure the video just built.
- Cause: `RecapScene.tsx:100` (headline), `RecapScene.tsx:103` (Fig. 10 title), `RecapScene.tsx:44` (step 5); `script.ts:161`.
- Fix: headline "Attention by hand, five steps."; Fig. 10 title "The pronoun's new vector, start to finish". Add a small tag under boxes 1 to 4, "its weight on trophy", ending at box 4. Narration: "So that's attention, by hand. Multiply and add, scale, raise e, divide, then blend."

### 3. [P2] explanation: the reason for scaling is asserted over a static table, and uses "softmax" before explaining it
- When: 71.4-88 s, beats `scale` and `root` (frame element-079.jpeg; tile 75 holds 8 s across `root`)
- What: "Real queries and keys hold many more numbers, so these sums get big, and softmax would hand nearly everything to the top one." For about 8 s (75 to 83 s) the screen shows only the three dot products, a one-line note ("many more numbers, so bigger sums") and a bottom half that is empty. Nothing shows a sum growing or softmax collapsing. "Softmax" is named here 17 s before the `softmax` beat says what it does, and this deep dive is meant to stand alone.
- Why it matters: this is the one step whose purpose is argued rather than computed, and it is the step with no picture.
- Cause: `script.ts:129`; `WeightsScene.tsx:218-222` is the only visual for the claim (plus the 1.22x swell at `WeightsScene.tsx:72`).
- Fix: in the empty lower half, draw the measured spreads already in `measurements.json` ("2 numbers: sums spread about 1.4; 128 numbers: about 11; divided by √d: about 1 either way"). Add to `measure.py` the lesson's weights without the division (by my arithmetic 0.515, 0.277, 0.207 against 0.461, 0.297, 0.242) and show them as a ghost column, so dividing visibly evens the shares out. Reword the beat to avoid the forward reference: "...so these sums get big, and the next step would hand nearly all the weight to the top one."

### 4. [P2] explanation: "a weight on every token" becomes three keys, the pronoun's own among them, unexplained
- When: 4.6-11.8 s `ask`, 30.0-35.1 s `arrows`, 50.4-57.7 s `others` (frames element-029.jpeg, element-070.jpeg)
- What: the narration promises "a weight on every token", and Fig. 1 draws two arcs (to trophy and suitcase) under "a weight for each" in a 12-word sentence. Fig. 3 then has "the three keys", and the third is the pronoun's own ("The pronoun's own key, point one one"). The video never says that the lesson keeps just three tokens, or that a token also scores itself.
- Why it matters: a viewer is left wondering where the other nine tokens went and why `it` is weighing itself; the unit video says "itself included", this one does not.
- Cause: `script.ts:91`, `script.ts:98`, `script.ts:104`; `QuestionScene.tsx:165-192` (two arcs only).
- Fix: re-voice `toy` as "The lesson keeps it tiny: three tokens, trophy, suitcase and the pronoun itself, and two numbers each." Add a third, small self-loop arc on `it` in Fig. 1 at `everyAt + 6`, so "a weight for each" covers three arcs.

### 5. [P2] explanation: "Attention keeps the lengths" stops one step short, and "shrunk" describes the only arrow that grows
- When: 62.1-71.1 s, beat `cosine` ("lengths" at 69.2 s) (frames element-067.jpeg, element-070.jpeg)
- What: the narration ends on "Attention keeps the lengths." The consequence appears only as the unspoken tag "short key, small score", which comes in at about 69.1 s and is gone with the cut at 71.1 s (about 2 s). The measured point, that the pronoun's own key points the right way (cosine 0.774) yet scores only 0.11 because it is short (0.141), is never said. Also, the only arrow the figure resizes is that key, which is stretched out to the circle while the narrator says "shrunk to length one".
- Why it matters: the comparison with cosine is set up and then left without its payoff, which is why the distinction matters at all.
- Cause: `script.ts:121`; `DotScene.tsx:190-194` (tag at `lengthsAt - 2`); `DotScene.tsx:163-167` (the stretched key).
- Fix: change "shrunk to length one" to "scaled to length one". Add a beat after `cosine`: "So the pronoun's own key, short but pointing the right way, scores just point one one. Cosine would give it point seven seven." Give it `pauseAfter: 1.0`, and cue the tag and the pulse on the `it` key to that beat.

### 6. [P2] pacing: the divide step builds, totals and swaps in about 3 s
- When: 94.4-97.8 s, beats `divide` and `weights` (tiles 94, 95, 96, 97, 98)
- What: within the 2.3 s `divide` beat, Fig. 6 lays the three e-powers end to end (95.3-95.6 s), shows "total 4.464" (96.5 s) and fills the weight column (96.8-97.1 s). At 97.5 s the bar labels already swap from e-powers to weights and "total 4.464" becomes "1". The total is never spoken and is on the bar for about 1 s; the e-power labels last about 2.2 s.
- Why it matters: this is the step that turns scores into weights, and it is the fastest-moving stretch of the video.
- Cause: `script.ts:138` (short beat, `pauseAfter: 0.7`); `WeightsScene.tsx:247` and `WeightsScene.tsx:264` swap at `trophyAt - 2`.
- Fix: re-voice `divide` as "Add them up, four point four six four, and divide each one by that total." with `pauseAfter: 1.2`. Move both swaps to `fourSixAt - 4`, so the e-power bar and its total hold through "Trophy takes".

### 7. [P3] spacing: lines through labels, and a box edge on its digits
- When: 66.5-69 s (element-067.jpeg); 137-147 s (element-145.jpeg); 59-71 s (element-070.jpeg)
- What: (a) the dashed "stretched to length one" line runs through the `it` key label in Fig. 3. (b) In Fig. 11 the red leader to "`it` to `trophy`, the one we computed: 0.461" runs through the other two cells of the `it` row and the edge of the head behind. (c) The red "Dot product" outline's left edge sits about 6 px from "1.02 / 0.40 / 0.11".
- Cause: (a) `DotScene.tsx:165` with the label at `DotScene.tsx:181` (`top: ty - 48`); (b) `RecapScene.tsx:203-211`; (c) `DotScene.tsx:214` (`x={L.result - 16}`) against `DotScene.tsx:250` (`gap: 18`).
- Fix: (a) set the `it` label to `top: ty - 72` and the "short key, small score" tag to `top: itTip[1] - 124`. (b) Move the label below the grid (`top: GY + 3 * CELL + 56`), with a vertical leader from the red cell's bottom edge. (c) Set `gap: 36` at line 250, which leaves about 12 px from "=" to the box and 24 px from the box to the digits.

### 8. [P3] confusion: axes, columns and value coordinates go unnamed
- When: 30-71 s Fig. 3; 104-129 s Figs. 7 and 9; 137-147 s Fig. 11 (element-070.jpeg, element-111.jpeg, element-145.jpeg)
- What: "With two numbers, they're arrows" never says that the first number runs right and the second runs up, and Fig. 3's axes have no names. In Fig. 9, "value of `trophy`" sits under the x-axis "10" tick, where an axis title would go, so it reads as one. Trophy's and suitcase's values (10, 0) and (0, 10) appear for the first time in the blend line without being introduced. Fig. 11 names its rows (queries) but not its columns, so "`it` to `trophy`" has to be inferred from the column order.
- Cause: `DotScene.tsx:133-149`; `BlendScene.tsx:298-311` (trophy label at `top: vy + 40`, `translateX(-100%)`); `RecapScene.tsx:183-199`.
- Fix: label Fig. 3's axes "first number" and "second number" (20 px). Set the value labels with coordinates, "value of `trophy` (10, 0)", and place trophy's to the right of its dot in two lines (`left: vx + 18, top: vy - 24`). Add the key names in `KEY_INK` under the front grid's columns.

### 9. [P3] explanation: "score" and "short" each mean two things
- When: 41-61 s vs 81-94 s; 12.5 s vs 69 s
- What: in scene 2 the dot product is "the score" ("To score a key... One point oh two"). In scene 3 "each score is divided by" √2 and the result is also "score", so "Raise e to the power of each score" could mean 1.02. Separately, "three short vectors" means few numbers, and "short key, small score" means a small length. The lesson prints "raw scores" and "scaled scores".
- Cause: `script.ts:94`, `script.ts:110`, `script.ts:134`, `script.ts:137`; `WeightsScene.tsx:110-112` (column headers).
- Fix: use the lesson's terms. Headers "Raw score (dot product)" and "Scaled score, ÷ √2"; narration "So each raw score is divided..." and "Raise e to the power of each scaled score." Change "three short vectors" to "three new vectors".

### 10. [P3] other: a half-second blank page at two scene cuts
- When: 30.0 s (`arrows`) and 104.0 s (`blend`) (tiles 30 and 104 show only the kicker)
- What: the outgoing scene has faded out by the time the first word is spoken, and the incoming scene's figures only start inking on that word, so the page is empty for about 0.3 to 0.5 s.
- Cause: `Video.tsx:12-14` (`LEAD = 8`, `OVERLAP = 6`); every scene's first figure is cued `at={from}`.
- Fix: set `OVERLAP` to 14, so the outgoing scene fades across the incoming one's first inking.

### 11. [P3] confusion: new weights lag the new scores during the flip
- When: about 116-121 s, beat `swap` ("wins" at 118.1 s) (element-118.jpeg)
- What: after the query turns, the Dot and Score columns update at about 116 s, but the Weight column keeps the old 0.461 / 0.297 / 0.242 until about 121 s. Trophy's 0.461 stays red while the narrator says suitcase's key wins.
- Cause: `BlendScene.tsx:99` (`weightSwap` at `takesAt - 2`); `BlendScene.tsx:185` (`hotA` stays on until that swap).
- Fix: from `runAt`, dim the Weight column and the two blend lines to 35% opacity until each swaps, and drop trophy's red at `runAt` (`hotA = 1 - ease(frame, runAt, 10)`).

### 12. [P3] accuracy: "every pair of tokens" in an LLM, drawn as a full grid
- When: 136.7-144.3 s, beat `heads` (element-145.jpeg)
- What: Fig. 11 lights every cell, including `trophy`'s query on the later `it`'s key. In a decoder-only LLM, the kind this course is about, a token scores only itself and the tokens before it. The lesson is inconsistent on this: its description and "The cost" say "every other token", while its own inline figure caption says "every earlier token".
- Cause: `RecapScene.tsx:49-54` and `RecapScene.tsx:159-176`; `script.ts:166`.
- Fix: draw the three cells above the diagonal blank, with a 20 px tag "later tokens: not scored". Narration: "...for every token against itself and every token before it, in many heads at once...". Align the lesson on "every earlier token".

### 13. [P3] spacing: one superscript under 19 px
- When: 89-104 s (element-103.jpeg)
- What: the "e^score" column header sets "score" at 0.7 of 23 px, about 16 px.
- Cause: `WeightsScene.tsx:38`.
- Fix: write the header as "e to the score" at 23 px, which matches the narration and the recap's "e to the 0.721".

### 14. [P3] confusion: "the biggest?" next to a highlighted "big", in a sentence that is not quite the lesson's
- When: 9-29 s (element-029.jpeg)
- What: the red label "the biggest?" over trophy's arc sits beside the yellow-marked "big", so it reads as being about size rather than weight. Fig. 1 is titled "The lesson's sentence", but the lesson writes "did not", not "didn't".
- Cause: `QuestionScene.tsx:193-195`; `QuestionScene.tsx:43` and `QuestionScene.tsx:156`.
- Fix: label "the biggest weight?". Either set the sentence as the lesson does ("did not") or retitle Fig. 1 "The lesson's example".
