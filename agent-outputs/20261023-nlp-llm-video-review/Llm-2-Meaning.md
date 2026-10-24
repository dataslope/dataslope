# Llm-2-Meaning (0-391.6 s, whole video)

## Verdict
- A careful build overall. Every number I checked matches the lessons, layouts are mostly clean, and the pace is calm: 136 wpm, 1.6 s scene gaps, nothing under 20px. The embeddings and similarity halves land well. Figs 6/7 (cosine), Fig 8 (search) and Fig 15 (the blend point) are the strongest figures.
- One obvious visual defect: from 41.5 to 48 s, a note prints on top of the cube's "animal" axis label (Fig 4).
- Attention, the hardest idea, gets enough time to show *what* it does but not *how* a score is made. The words "dot product" never appear anywhere in the video. Scores appear with no arithmetic, and the ÷√2 is hidden. Softmax is only named. Query, key and value are three lines of text with no vectors drawn. Two different "attention on trophy" numbers (0.722, then 0.461) arrive 6 s apart, and the first comes from a token list that leaves out "suitcase".
- Smaller gaps in the argument. The order scene's test (sum the vectors) still fails after the position fix, and the video just doesn't show it. "Output layer" gets a parameter count 40 s before the video says what it is. The closing figure scores "cat" 3.2 as the next token after "the cat sat on the mat".
- Pacing is comfortable except in three places: the two core definitions (`vector`, `embedding`, 3.6 w/s, 0.55 s apart), the 8.2 s `scores` beat, and a 4 s near-empty screen at the start of the QkvScene.

## Deep-dive candidates

**Is attention given enough time and clarity? Enough time, not enough clarity.** Attention runs 196.4-296.5 s, which is 100 s, or 26% of the video, and that is a fair share. The motivation (trophy/suitcase, 23 s) is clear, and so is the blend plot (Fig 15). The mechanism is what gets squeezed:
- Q/K/V are 12 s of three spoken questions with no vectors on screen.
- "Compared with every key", "score", "softmax" and "add up to one" share one 8.2 s beat, over hand-set scores, so nothing is actually compared.
- In the "real arithmetic" scene the scores just appear: 1.0×1.0 + 0.1×0.2 = 1.02 is never shown, nor the ÷√2 that turns it into 0.721.
- Fig 16's head tiles are attention grids nobody has introduced.

A viewer leaves knowing "tokens weigh each other". They could not picture or compute a single score, and they have two conflicting weights for trophy. The unit cannot fix this by slowing down. It already runs 6:32 against a 6:00 plan, attention is one of four lessons, and a full worked score (multiply-add, scale, softmax, blend, flip) needs 90-120 s on its own.

1. **How one attention score is computed** (attention-intuition.mdx, "Query, key, value" and "Doing it properly, with real vectors").
   - Where the unit rushes it: 219.7-272.2 s, beats `query-vec`, `key`, `value`, `scores`, `weights`, `real`, `dot`, `blend`, `flip`.
   - What a 2-minute video would show:
     - The token "it" turns its embedding into three vectors (embedding × three learned matrices, drawn as three arrows out of one strip).
     - In the 2-D plane, using Fig 6's arrow style, "it"'s query 1.0, 0.1 lies almost along trophy's key 1.0, 0.2 and well away from suitcase's 0.3, 1.0.
     - The multiply-and-add written out for each key (1.02, 0.40, 0.11), then ÷√2 to 0.721, 0.283, 0.078, with one sentence on why the scale exists.
     - Softmax as two visible steps: e^x as bars, then divide by the sum to get 0.461, 0.297, 0.242. On the lesson's hand-set row, this is where 3.2 against 1.1 becomes 0.72 against 0.09.
     - The new vector as Fig 15's point, pulled by three weighted springs.
     - The query flipped to 0.2, 1.0 and the whole thing replayed.
     - Close on "a head is one set of these matrices; a model runs many".
   - It is also the natural place to name the dot product and tie it back to cosine (the cosine formula without the division).

2. **How order gets into an order-blind set** (embeddings.mdx, "Position has to be added").
   - Where the unit rushes it: 83.6-108.8 s (`order` to `order-in`). The fix itself is one 7.4 s beat (`position`), and the scene's own test (the sum) still cannot tell the sentences apart once position is added (finding 5).
   - Why the unit cannot simply slow down: the real answer depends on attention, which comes two scenes later.
   - What a 2-minute video, placed after attention, would show:
     - The bag problem.
     - The position vectors added slot by slot (dog first 0.9, 0.2; dog last 0.9, 0.4).
     - That a sum still collapses both sentences to 1.5, 1.8.
     - That a pairwise comparison does not: dog·bites is 0.27 with dog first and 0.45 with dog last. That pairwise comparison is the very thing attention does.
     - One line on the lesson's other option, relative positions encoded in the attention step itself.

3. **Inside one block: heads, the residual add, feed-forward, ×32** (the-shape-of-a-transformer.mdx, "Repeat N times: attention, then feed-forward", plus attention-intuition.mdx, "Many heads, many layers").
   - Where the unit rushes it: 273.8-283.1 s (`heads`, 9.3 s, heads and layers in one sentence) and 305.1-324.3 s (`block`, `residual`, `repeat`). The residual is asserted in 4.5 s ("so nothing gets lost"). Feed-forward "works on each token alone", with no hint of what it does, yet 50 s later it holds 54% of the parameters.
   - What a 2-minute video would show, following the vector for "it" up through two or three blocks:
     - One head pulls from "trophy" and another from "big".
     - The residual adds the old vector back, shown as the same strip plus a change.
     - Feed-forward rewrites each token alone.
     - The stack repeats, ending in "width = how much the strip holds, depth = how many rewrites".

## Findings

### 1. [P1] spacing: the note prints over the cube's "animal" axis label
- When: 41.5-48.0 s, beats `geometry` and `toy` (element-084.jpeg, element-086.jpeg, element-094.jpeg, element-095.jpeg).
- What: "Close together, or far apart." (41.5-45.4 s) and then "Three numbers per word, so three axes." (46.5-47.9 s) sit exactly on Fig 4's "animal" label at about (1170, 935). The two strings overprint each other ("Close tog~~ani~~ther", "Three~~animal~~bers").
- Why it matters: it is an obvious defect on the first view of the 3-D space, and it hides an axis name the next beats depend on.
- Cause: `video/src/videos/llm-meaning/EmbeddingScenes.tsx:626-633` places both `Note`s at x=1060, y(840). The turning cube's axis label is drawn at `P([1.12,0,0])` (`:532-545`, CX=1420, SIDE=380), which lands in the same spot.
- Fix: move both notes to the empty left column at `x={X0} y={y(800)}`. That area stays clear until `catSatAt - 6` (62 s). Alternatively, set them under the Fig 4 label at x=1060, y(355).

### 2. [P1] explanation: attention scores appear without being computed
- When: 232.3-240.5 s `scores` (Fig 13, element-466.jpeg to element-480.jpeg) and 252.3-259.2 s `dot` (Fig 14, element-506.jpeg to element-518.jpeg).
- What:
  - Fig 13: the narration says "the pronoun's query is compared with every key, for one score each". On screen, the token chips turn teal and the numbers 0.1, 3.2, 1.1… appear. No query or key is drawn, and the "Scores set by hand in the lesson" note arrives only at `weights`, after the narration has implied the scores were computed.
  - Fig 14: Score shows 0.721, 0.283, 0.078 next to the query and keys, with no multiply-and-add and no ÷√2. Anyone who multiplies query by key gets 1.02, not 0.721.
  - "Dot product" is never said or shown anywhere in the video, including the cosine scene.
- Why it matters: this is the central step of the course's hardest idea, and the screen gives the viewer no way to see how a score comes from a query and a key. A viewer who checks the arithmetic is told something false.
- Cause: `video/src/videos/llm-meaning/AttentionScenes.tsx:478` (`<Swap a={A.scores[i]} …>` shows the scaled score directly). In Fig 13, `:249-307` shows `WEIGHTS.raw` as Score, and the hand-set note is cued at `exampleAt - 2` (`:327`).
- Fix:
  - In Fig 14, add one worked line under the trophy row, cued to "against each key": `1.0×1.0 + 0.1×0.2 = 1.02` then `÷ √2 = 0.721`.
  - Rewrite `dot` as "Multiply the query by each key and add it up, scaled down a little, and that's the score. Softmax makes them weights. Point four six for trophy."
  - Move the Fig 13 note to `comparedAt`, or drop Fig 13 entirely (see finding 4).

### 3. [P2] confusion: two different weights for "it" on trophy, 6 s apart
- When: 241.3-246.5 s `weights` (0.722, element-492.jpeg), then 252.3-259.2 s `dot` (0.461, element-518.jpeg).
- What: "The pronoun puts point seven two of its attention on trophy" is followed straight away by "Point four six for trophy". Nothing says the second example has only three tokens, real vectors and much flatter scores.
- Why it matters: it reads as the same quantity with two values. The viewer cannot tell which one is "real".
- Cause: `video/src/videos/llm-meaning/script.ts` beats `weights` and `real`/`dot`. `AttentionScenes.tsx:432` gives the headline "The real arithmetic", which implies the 0.722 was not real.
- Fix: at `real`, say "Now a smaller toy: three tokens, two numbers each". Or cut Fig 13 (finding 4) so that trophy only ever has one weight on screen.

### 4. [P2] confusion: Fig 13's token list drops "suitcase" right after Fig 11 showed it
- When: 233.0-247.0 s (element-478.jpeg, element-492.jpeg).
- What: Fig 11 has just shown "The trophy didn't fit in the suitcase because it was too big." Fig 13 lists only "the, trophy, did, not, fit, because, it". There is no "suitcase", no "in the", no "was too big", and "didn't" is now split. Trophy's 0.722 never competes with the one alternative the scene was built on.
- Why it matters: the scene's question was trophy against suitcase. The figure that answers it leaves out suitcase without saying so.
- Cause: `WEIGHTS.tokens` (`video/src/videos/llm-meaning/data.ts:75-80`) is the lesson's hand-set list (attention-intuition.mdx, first code block), shown under the title "Attention from 'it', in the lesson's example" (`AttentionScenes.tsx:249`).
- Fix: cut Fig 13 and the `weights` beat (about 6 s). Spend the time on the arithmetic in finding 2, since Fig 14 does contain trophy, suitcase and it. If Fig 13 stays, add the note "the lesson's seven tokens; suitcase isn't scored".

### 5. [P2] explanation: the order scene's test still fails after the position fix
- When: 92.1-104.1 s, beats `set` and `position` (element-190.jpeg, element-206.jpeg, element-218.jpeg).
- What: `set` proves order-blindness by summing: "Add them up, and both sentences come out exactly the same", with two "= 1.5 1.5 sum" cards and an "exactly the same" bracket. `position` then says "So the model mixes in where each token sits" and removes the sums. Summed again, the positioned vectors are still identical (1.5, 1.8 for both sentences, as `measure.py` asserts). So the fix does not pass the test the scene just set up, and the video avoids showing that.
- Why it matters: a viewer who carries the sum forward concludes either that position does nothing or that summing was never the real problem. The real reason position helps (attention compares tokens pairwise) is never stated. This is the video's own argument, separate from the lesson's code discrepancy.
- Cause: `video/src/videos/llm-meaning/script.ts` beats `set` and `position`. The sum cards fade out at `sumOut = mixesAt - 4` (`EmbeddingScenes.tsx:710, 767-781`).
- Fix:
  - Reword `set` as "Treated as a bag, both sentences hold exactly the same three vectors". Keep the shuffle and drop the sum cards.
  - Or keep the sums and add to `position`: "…and since attention compares tokens one pair at a time, it can now tell them apart."

### 6. [P2] pacing: the two defining beats are the fastest in the video
- When: 26.7-32.5 s `vector` (3.62 w/s), gap 0.55 s, then 33.1-37.5 s `embedding` (3.58 w/s) (element-054.jpeg to element-076.jpeg).
- What: "vector", "a few thousand numbers", "embedding" and "a table learned in training" are the unit's core terms, and they are delivered back to back at the video's highest speech rate. Its average is 136 wpm, about 2.3 w/s.
- Why it matters: everything after this depends on these two terms, and they fly past.
- Cause: `video/src/videos/llm-meaning/script.ts` beat `vector` has no `pauseAfter`, so it gets the default minimum, and both sentences are long.
- Fix: give `vector` `pauseAfter: 0.7` and trim it to "So the model swaps each ID for a vector: a list of a few thousand numbers." Re-voice `vector` and `embedding` with `--only`.

### 7. [P2] explanation/pacing: softmax is named but not shown, and the source of Q/K/V is left out
- When: 232.3-240.5 s `scores` (8.2 s), and 219.7-231.5 s `query-vec` to `value` (element-470.jpeg to element-480.jpeg).
- What:
  - One 8.2 s beat introduces "compared", "score", "softmax" and "weights that add up to one". The weight bars grow in about 1 s, and the non-linearity (3.2 against 1.1 becoming 0.722 against 0.088) is never pointed out, so a viewer who divides 3.2 by the total gets 0.58 and is lost.
  - Where the three vectors come from (the lesson: "from its embedding") is never said.
- Why it matters: these are the two things a viewer needs to rebuild attention, and the hardest idea gets its densest beat here.
- Cause: `video/src/videos/llm-meaning/script.ts` beats `scores` and `query-vec`. `AttentionScenes.tsx:203` (`grow` starts at `softmaxAt + 6` for all seven rows within 18 frames).
- Fix:
  - Split `scores` after "one score each" (`pauseAfter: 0.8`). Make the second half "Softmax turns them into weights that add up to one, and the biggest score takes far more than its share", cued to a bracket joining the 3.2 and 0.722 rows.
  - Change `query-vec` to "every token turns its embedding into three vectors".

### 8. [P2] confusion: the QkvScene opens on a near-empty screen, and Fig 12 draws no vectors
- When: 219.4-224.0 s, beat `query-vec` (element-440.jpeg, element-444.jpeg, element-447.jpeg).
- What: for about 2.4 s only the "Attention" kicker is on screen, then for about 1.8 s only "Fig. 12 Every token makes three vectors". This plays while the narration says "every token makes three vectors". When Fig 12 fills, it is three lines of italic text; no vector ever appears.
- Why it matters: the figure is titled "three vectors" and shows none, at the moment the mechanism starts.
- Cause: `video/src/videos/llm-meaning/AttentionScenes.tsx:219-227` (the headline words ink at `cardAt[i] - 4`, Fig 12 at `threeAt - 4`, cards at `:228-247`). Nothing is cued at `from`.
- Fix: at `from + 4`, show the chip for "it" with its embedding strip. At "three", draw three arrows to three empty two-cell vectors in purple, teal and orange. Fill and label each one on "query", "key" and "value", with the question text beside it.

### 9. [P2] confusion: Fig 16's head tiles are attention grids nobody has introduced
- When: 274.0-293.2 s, beats `heads` and `square` (element-552.jpeg, element-586.jpeg).
- What: each head is a 5×5 grid with diagonal or column patterns. Nothing says that rows are "from" tokens and columns are "to" tokens, and the only earlier attention figure (Fig 13) was a bar list. All four layers repeat the exact same four patterns, which contradicts the idea that layers do different work.
- Why it matters: "each with its own idea of relevant" rests on a picture the viewer cannot read.
- Cause: `video/src/videos/llm-meaning/AttentionScenes.tsx:582-606` (`HEAD_KINDS`) and `:680` (`kind={c}`, the same for every row `r`).
- Fix: on the first tile, label the axes "from" and "to" in 20px, or draw each head as a short Fig 13-style bar row that peaks on a different token. Use `kind={(c + r) % 4}` so that layers differ.

### 10. [P2] confusion: the closing figure scores "cat" as the next token after "...the mat"
- When: 377.2-391.6 s, beats `top` and `next` (element-780.jpeg).
- What: "The last token's vector" is drawn with the chip "·mat", from Fig 18's sentence "the cat sat on the mat". It produces cat 3.2, dog 2.1, bird 1.5, rock −0.4. These are sampling.mdx's scores for an unrelated prompt, so the top "next token" after "the mat" is "cat". The marker hops evenly over all four bars, rock included, every 14 frames.
- Why it matters: the bridge to Unit 3 ends on a prediction that reads as wrong, and the uniform hopping suggests every pick is equally likely.
- Cause: `video/src/videos/llm-meaning/ShapeScenes.tsx:582` (`last = PROMPT.tokens[...]`) and `:589` (`hop` cycles through all `LOGITS.tokens`).
- Fix: drop the token chip and label the strip "the last position's vector", or use a prompt that the sampling scores fit (for example "my pet is a"). Restrict the hop to cat and dog, or remove it.

### 11. [P2] explanation: "output layer" gets a parameter count before it is introduced
- When: 331.5-337.7 s `split` ("the output layer as much again", label "Output layer 0.52 billion", element-670.jpeg). What the output layer does is first said at 377.2 s (`top`).
- What: Fig 18's full path ends at the ×32 stack with no output step, and Fig 19 then counts an "output layer" as one of four parts. The lesson's order is "Project to the vocabulary" before "What the parameters are".
- Why it matters: it is a new term with a number attached, used 45 s before its definition.
- Cause: `video/src/videos/llm-meaning/Video.tsx:69-80` (scene order Path, Params, Experts, Top). `ShapeScenes.tsx:391`.
- Fix: add a final "Output layer → a score per token" box to Fig 18 at `repeat`. Or change `split` to "…and the output layer, which turns the final vector into a score for every token, as much again."

### 12. [P3] spacing: the lower 40% of the frame is empty through the BlindScene
- When: 171.9-188.8 s (element-376.jpeg).
- What: Fig 9's two small cards and Fig 10's pipeline occupy y 300-660. Nothing appears below until the `sim-in` rule at about 830, and the "not" card's text is 32px on a 1080 frame.
- Why it matters: a 16 s idea sits small while half the frame is unused.
- Cause: `video/src/videos/llm-meaning/SimilarityScenes.tsx:527, 530` (`cardsTop = y(420)`, `PY = y(470)`).
- Fix: scale the drug cards up to about 44px type and the pipeline boxes by about 1.3×, and centre them at y(480-720).

### 13. [P3] other: Fig 4 appears before Fig 3
- When: 41.0-46.0 s (element-082.jpeg, element-092.jpeg).
- What: "Fig. 4 The same words, as points" is labelled at `geometry`, and "Fig. 3" arrives 5 s later to its left. The builder's report says the figures are "numbered in order of first appearance", which is not true here.
- Cause: `video/src/videos/llm-meaning/EmbeddingScenes.tsx:514` (`at={geometryAt}`) against `:406` (`at={tinyAt - 6}`).
- Fix: swap the numbers so the cube is Fig 3 and the table Fig 4, or cue Fig 4's label at `tinyAt`.

### 14. [P3] pacing: blank handovers between figures and headlines
- When: 27.3-28.9 s, `vector` (element-056.jpeg: only the kicker, between Fig 1 and Fig 2), and 69.0-72.8 s, `axes` (element-140.jpeg to element-146.jpeg: no headline).
- What: in the first, Fig 1 and its headline leave at "first" and the next headline arrives at "swap". In the second, the old headline goes at `catchAt - 8` and the new one comes in at `realAt - 4`.
- Cause: `video/src/videos/llm-meaning/EmbeddingScenes.tsx:235-239` and `:402-403`.
- Fix: cue Fig 1's exit and the first headline's `out` to `swapAt - 4`, so the two cross. Set the SpaceScene's first headline `out` to `realAt - 6`.

### 15. [P3] spacing: two transient overprints
- When: 134.7-135.3 s, `same` (element-270.jpeg); and 158.8-159.6 s, `hit` (element-318.jpeg).
- What:
  - In the cosine scene, "Ruler" fades in on top of the fading "Same direction; one is 5 times longer."
  - In the search re-sort, rows slide through each other and "Quarterly revenue…" and "Earnings beat…" overprint, with their 0.993 and 0.998 stacked.
- Cause:
  - Cosine: `video/src/videos/llm-meaning/SimilarityScenes.tsx:226` (`Reading` at `sevenAt - 6`, y(530)) against `:228` (`Note` out at `sevenAt - 8`, y(560)).
  - Search: `:318-319` (all rows tween at once over 22 frames).
- Fix:
  - Make the note's `out` `sevenAt - 14`.
  - Fade the moving rows to 0.25 while `0 < sort < 1`, or move the top hit first and the rest 8 frames later.

### 16. [P3] other: Fig 15 labels
- When: 260.0-273.8 s (element-528.jpeg, element-544.jpeg).
- What:
  - The label "it's value" reads as "it is value".
  - The "new vector" label sits inside the pulse ring and on the trophy line at 271.5-272.5 s.
  - The faint y = x diagonal is never explained.
- Cause: `video/src/videos/llm-meaning/AttentionScenes.tsx:567` (`{t}'s value`) and `:571` (`left: ox + 22, top: oy - 44`).
- Fix:
  - Render the labels as "value of *it*" (mono "it").
  - Offset the label to `ox + 44, oy - 60`.
  - Drop the diagonal.

### 17. [P3] confusion: position drawn two different ways
- When: 96.7-110.1 s (Fig 5, element-218.jpeg) and 302.5-305 s (Fig 18, element-648.jpeg).
- What:
  - Fig 5 adds the vectors (0, 0), (0, 0.1), (0, 0.2), but draws the "+ position" row only under row 2, although row 1 changes too (man becomes 0.5, 0.7).
  - Fig 18 writes position as "+1 … +6", which reads like adding an integer, and slot 1 has become +1 where Fig 5 added 0.
- Cause: `video/src/videos/llm-meaning/EmbeddingScenes.tsx:784-791` and `ShapeScenes.tsx:156`.
- Fix:
  - Label the Fig 5 row "+ position (added to both rows)".
  - In Fig 18, draw a small two-cell position strip with "+" in place of "+i".

### 18. [P3] accuracy: two numerical nits
- When: 283.8-293.2 s `square`; 298.1-304.6 s `path` against 377.2-386.4 s `top`.
- What:
  - "Every token scores every other one. Ten tokens make a hundred scores." Every *other* token gives 90; the 100 count includes each token scoring itself.
  - Fig 18 tokenizes with o200k_base (ids 3086, 9059… from a vocabulary of about 200k, and Fig 1's axis runs to 200,000). The same pipeline then outputs "128,000 scores", the lesson's mid-sized model's vocabulary, so one pipeline uses two vocabularies.
- Cause: `video/src/videos/llm-meaning/script.ts` beat `square`, and `data.ts` (`PROMPT` is o200k, `PARAMS.vocab` is 128,000).
- Fix: say "Every token scores every token, itself included". Label Fig 18's ids "(o200k ids, for illustration)", or say "about a hundred thousand scores" without tying it to that model.

### 19. [P3] explanation: the search's named themes clash with "real dimensions have no names"
- When: 148.8-170.3 s (element-341.jpeg).
- What: 75 s after "Real dimensions have no names", Fig 8 scores documents on "finance, weather, sport, cooking", and the narration ("each scored on four themes") never says these are hand-chosen stand-ins, as the lesson does ("minus a real embedding model").
- Cause: `video/src/videos/llm-meaning/script.ts` beat `search`.
- Fix: say "Five tiny documents, hand-scored on four themes as stand-in embeddings", and add the Tag "hand-chosen stand-ins" under the Fig 8 label.

### 20. [P3] other: Fig 2's "Learned in training" header, and the unexplained dot before tokens
- When: 36.7-38.8 s (element-076.jpeg), and token chips throughout (·cherry, ·teeth, ·cat).
- What:
  - "Learned in training" (24px regular) sits in the header row beside "Id / Token / Embedding" (21px semibold), about 3px off their baseline, and reads as a fourth column header.
  - The faint dot marking a leading space is never explained in this video, which is also embedded on its own.
- Cause: `video/src/videos/llm-meaning/EmbeddingScenes.tsx:312-314`. `TokenChip` in `parts.tsx`.
- Fix: move the note to `y={rowC + 70}` as "Every row learned in training". Add a one-time Tag "· = a leading space" beside Fig 1's first spaced chip.
