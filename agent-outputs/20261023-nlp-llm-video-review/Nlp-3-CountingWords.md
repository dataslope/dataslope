# Nlp-3-CountingWords (0-393.9 s, whole video)

## Verdict
- The video is solid and accurate. Every number said or shown matches `measurements.json`, all 15 figures are numbered, nothing is clipped, and the smallest text is 20px. Every motion fix the builder lists is visible in the frames (the Fig. 3 labels lit as read, hapax squares turning one by one, the tail wash, figures stepping back on "tell", "Still", "Over" and "But", the engineer words gliding off as each is named).
- **Biggest problem: Fig. 5 shows the "long, thin tail" as the shortest thing on screen.** Ranks 21 to 7,079 are squeezed into 256 px, a sliver next to 880 px of top-20 bars, so the "shape of language" this part promises never appears.
- **Two conclusions are asserted rather than shown:**
  - The "sweet spot" (Fig. 15 shows only the cost side, and trigrams already sit at 90% one-offs).
  - Why bigrams beat single words. The pair chosen, "not good" against "good", is one that the single-word set already tells apart by "not".
- **Pacing is comfortable overall** (130 wpm, mostly 0.6-0.9 s breaths). It is rushed in two places:
  - The tail scene: five quantities in 38 s, with `giants` at 3.57 w/s.
  - The trigram window: three positions in about 1 s.
- **Smaller defects:**
  - Three scene openings sit nearly empty for 3.5-5 s.
  - A bigram chip appears before its words do.
  - Two glides pass under other tiles.
  - Red means "repeated word" in Figs. 1-2, then "used only once" in Fig. 4.

## Deep-dive candidates
1. **Zipf's law and the long tail.**
   - Lesson: frequency-distributions, "The long tail: language is lopsided".
   - Where the unit rushes it: 86.9-129.3 s, beats `book`, `giants`, `hapax`, `zipf`, `grows`. That is five quantities (vocabulary size, the top-ten share, hapaxes, Zipf's law, vocabulary growth) in 38 s, on one screen with three figures. The tail is squeezed out of sight, the law itself (frequency falls roughly as 1/rank) is never stated, and vocabulary growth gets 7.5 s.
   - Why the unit can't slow down: Part 1 already takes 165 of the 394 s.
   - What a 2-minute video would show:
     - Emma's rank-frequency curve on linear axes, scrolled out to all 7,079 ranks so the tail's length is felt.
     - The same data on log-log axes, where it becomes a near-straight line: that line is the law.
     - A rank × frequency column. In Emma the top two (to 5,239, the 5,201) are nearly tied, which also corrects the lesson's "twice the second".
     - Hapaxes as about 39% of the vocabulary in any text.
     - The growth curve, and what it means for any fixed vocabulary: new words will turn up later in the text.
2. **Sparsity, and why bigger n stops helping.**
   - Lesson: ngrams, "The trade-off: bigger n is not better" and the "Two costs of large n" callout.
   - Where the unit rushes it: 348.4-384.5 s, beats `bigger-in`, `sparse`, `shares`, `sparsity`, `sweet`. One chart shows only the cost. "A count of one tells you almost nothing" is asserted with no reason. The lesson's second cost, the explosion in distinct n-grams, is not shown, though `measurements.json` already holds it: 7,079, then 65,867, 130,864, 155,176 and 160,226 distinct n-grams for n = 1 to 5.
   - Why the unit can't slow down: this is the last 40 s before the bridge, and the explanation needs a second figure.
   - What a 2-minute video would show:
     - Emma split in half: for each n, the share of the second half's n-grams never seen in the first half. This is what sparsity costs a model.
     - The distinct-count explosion.
     - A count of 1 against a count of 50 as evidence.
     - Then why bigrams and trigrams are the balance point.
3. **How a tagger decides from context, and how tags feed the lemmatizer.**
   - Lessons: pos-tagging, "Why context decides the tag" (averaged perceptron, hand-tagged corpus) and "POS tagging makes lemmatization accurate".
   - Where the unit rushes it: 178.5-194.7 s (`tagging`, `tagger`) and 261.9-271.6 s (`tagfirst`). "Judged from the words around it" and "learned from text that people tagged by hand" are two assertions with no mechanism. The Penn Treebank is never identified as that hand-tagged text. The Penn-to-WordNet first-letter mapping is skipped.
   - What a 2-minute video would show:
     - The cues the tagger reads: "a big ___" suggests a noun, "We ___ on" a verb, the "-ly" suffix an adverb.
     - Training on hand-tagged Penn Treebank sentences.
     - One mis-tag, and why it happens.
     - Each tag cut to its first letter, which is the part of speech WordNet takes.

## Findings

### 1. [P1] confusion — Fig. 5 draws the "long tail" as the short end of the chart
- When: 99.1-125.0 s, beats `hapax`, `zipf`, `grows` (frames element-212.jpeg, element-224.jpeg, element-250.jpeg).
- What: the top 20 words get 44 px each (880 px in all). The other 7,059 words are a 256-px sliver: one spike, then a line on the baseline, labelled "the other 7,059, squeezed in". When "a long, thin tail" is said, the pink wash lands on the shortest part of the figure. The 20 bars only fall 3.9× (5,239 to 1,347), so they read as a gentle slope rather than "a few giants".
- Why it matters: the scene exists to show the shape, and the figure shows the opposite of what is said.
- Cause: `video/src/videos/nlp-counting-words/TailScene.tsx:24-25` (`TAIL_X0 = X0 + 20*44 + 14`, `TAIL_X1 = 1790`) and `:77-79` (the tail polygon squeezed into that span).
- Fix: put rank on a log x axis from 1 to 7,079 across the full 1,150 px, with ticks at 1, 10, 100, 1,000 and 7,079. The tail then fills about three quarters of the width at near-zero height, and the top-ten bracket still fits. If the linear bars stay, replace "squeezed in" with "at this spacing the tail runs on for 160 screen widths" (7,059 × 44 px / 1,920).

### 2. [P2] explanation — The "sweet spot" is asserted from a chart that only shows the cost
- When: 360.1-384.5 s, beats `shares`, `sparsity`, `sweet` (element-740.jpeg, element-780.jpeg).
- What:
  - Fig. 15 brackets bigrams and trigrams as "the sweet spot", but trigrams stand at 90%, much nearer the 99% of five-grams than the 39% of single words. Nothing on screen shows the "enough order to help" side.
  - "39% of Emma's n-grams appear only once" reads as a share of the text. It is a share of distinct n-grams: by occurrence, only 1.7% of Emma's words are one-offs.
  - "A count of one tells you almost nothing" is given without a reason.
- Why it matters: the closing conclusion of the unit rests on a picture that seems to argue against it.
- Cause: `SparseScene.tsx:70` and `:100-113` plot `EMMA.sparsity[i].share` (once ÷ distinct). The bracket is at `:131-136`, the note at `:150-154`, the text in `script.ts:241-247`.
- Fix:
  - Plot, or add beside each bar, the share of the text's own n-grams that come back, computed as 1 − once ÷ grams from the same JSON fields: 98%, 70%, 27%, 7%, 1.5%.
  - Narrate: "Of the bigrams you actually read, seven in ten come back; trigrams, about one in four; five in a row, almost none."
  - Retitle the chart "Share of Emma's different n-grams seen only once".
  - Give "a count of one" its reason in a clause: "one sighting can't tell a pattern from an accident".

### 3. [P2] explanation — The bigram argument uses a pair the single-word set already separates
- When: 317.5-329.0 s, beats `sets`, `bigram` (element-640.jpeg, element-658.jpeg).
- What: the screen first says "as sets of single words, the only difference: not", then shows "not good" as the feature a model can learn. A viewer can reasonably ask why "not" on its own isn't enough. The lesson's own answer, that a lone "not" doesn't say what it negates, is never given. "Feature" is also used here before Unit 4 defines it.
- Why it matters: the step that makes n-grams worth having is skipped.
- Cause: `OrderScene.tsx:96-147` and `script.ts:217-221`.
- Fix: add one row, "the food was not bad", and one beat (about 4 s): "But not is in praise too: not bad. As single words, not can't be learned as negative; not good and not bad can." Change "feature" to "a pair a sentiment model can learn is negative".

### 4. [P2] confusion — A bigram appears before its words, and the window frames an empty slot
- When: about 296.8-298.9 s, beat `slide` (element-594.jpeg, element-596.jpeg).
- What: the red window opens around "the" plus blank space, and the bigrams row already shows "the quick" while "quick", "brown", "fox" and "jumps" are not yet on screen.
- Why it matters: the output appears before its input, in the one figure about how the window reads its input.
- Cause: `WindowScene.tsx:54` (`biSteps[0] = windowAt + 4`) and `:88` (the first chip at `ats[0] + 4`). Meanwhile tiles 1-4 enter at `quickAt - 6 + i*3` (`:135`).
- Fix: bring all five tiles in from `windowAt - 6` with the 3-frame stagger, or start `biSteps[0]` at `quickAt + 6`.

### 5. [P2] pacing — The trigram window crosses the sentence in about one second
- When: 306.0-307.0 s, beat `formula` (element-612.jpeg, element-613.jpeg, element-614.jpeg).
- What: three window positions and three trigram chips in 20 frames, while the narrator is already on "the number of words, minus n". The bigram pass got about 2.5 s. The yellow overlap marks on "quick", "the quick" and "quick brown" stay lit throughout and no longer mean anything.
- Why it matters: the trigram count is meant to come from watching the window, and the viewer has no time to do that.
- Cause: `WindowScene.tsx:55` (`triSteps = [threeAt - 6, threeAt + 4, threeAt + 14]`) and the overlap marks at `:135` and `:150`, which have no `out`.
- Fix: set `triSteps` to `[threeAt - 6, threeAt + 14, threeAt + 34]`. Split `formula` into "Five words give four bigrams, and three trigrams." with `pauseAfter: 0.8`, then "That's the number of words, minus n, plus one." Give the overlap marks `out: triSteps[0] - 6`.

### 6. [P2] pacing — `giants` builds Fig. 5 at 3.57 w/s, then `hapax` sends the eye across the frame
- When: 93.6-105.9 s, beats `giants`, `hapax` (element-188.jpeg, element-196.jpeg, element-206.jpeg).
- What: ranking, a 20-bar build (about 1 s), the top-ten bracket and "22%" all arrive in 4.7 s, the densest beat of the video, with only 0.8 s before the next idea. "At the other end" then points at the tail of Fig. 5 on the right, while the 2,739 count and the red squares land on Fig. 4 at the far left, about 1,100 px away.
- Why it matters: two new quantities in under 12 s, on two figures at once.
- Cause: `script.ts:119`; `TailScene.tsx:75` (`barAt`, 1.4 frames per bar), `:130` (hapax squares on Fig. 4), `:173-181` (tail on Fig. 5).
- Fix:
  - Split `giants` into "Rank them by count." (`pauseAfter: 0.6`, bars at 3 frames each) and "The top ten alone make up over a fifth of the book." (`pauseAfter: 0.9`).
  - Add "2,739 used once" under "the other 7,059" in Fig. 5, so the count appears where "the other end" points.

### 7. [P2] confusion — Red means "repeated word" in Figs. 1-2, then "word used only once" in Fig. 4
- When: 37-86 s (element-076.jpeg, element-170.jpeg) against 101-130 s (element-212.jpeg).
- What: in Figs. 1 and 2, repeated tokens are washed pink and tied to "this text repeats itself" and "common words keep coming back". About 50 s later, Fig. 4 colours the hapaxes, the words that never repeat, in the same red family.
- Why it matters: within one argument the colour flips meaning, and the viewer has just learned "red = repeat".
- Cause: `CountScene.tsx:101` and `DiversityScene.tsx:134` (`MARK_BAD` on repeats), `TailScene.tsx:139` (`ACCENT` for hapaxes).
- Fix: mark repeats in Figs. 1-2 with the neutral grey wash FishScene uses (`color-mix(INK_SOFT 16%)`, `FishScene.tsx:78`) and keep red for the hapaxes.

### 8. [P3] other — Three scene openings sit nearly empty for 3.5-5 s
- When and what:
  - 86.9-91.5 s (`book`, element-176.jpeg, element-182.jpeg): only "161,600 words," is on screen.
  - 196.3-199.7 s (`penn`, element-394.jpeg, element-398.jpeg): "Those labels are Penn Treebank tags" is said just after the cut removed the NN and VBP labels. Only the Fig. 9 title shows.
  - 356.5-361.5 s (`sparse`, element-720.jpeg): empty axes.
- Why it matters: the narrator refers to things the screen doesn't hold.
- Cause:
  - `TailScene.tsx:86`: squares start at `differentAt - 6`.
  - `PennScene.tsx:114`: tiles start at `tallAt - 6`.
  - `SparseScene.tsx:101`: bars only start on their share words.
- Fix:
  - Start Fig. 4's squares on "sixty-one thousand".
  - Open PennScene with "I caught a big fish" and its NN chip, plus "We fish" and VBP, for the first beat, then fade them on "tall".
  - In SparseScene, ink the five category names and ghost bar outlines on "n-grams" (`sparse` beat).

### 9. [P3] explanation — The Penn Treebank is named but not connected to "text that people tagged by hand"
- When: 184.5-198 s, beats `tagger`, `penn` (element-390.jpeg, element-394.jpeg).
- What: the tagger "learned from text that people tagged by hand", and "Those labels are Penn Treebank tags". The video never says these are the same thing, so "Penn Treebank" is an unexplained proper noun.
- Why it matters: it is the headline of a 50-s scene.
- Cause: `script.ts:158` and `script.ts:164`.
- Fix: change the penn beat to "Those labels come from the Penn Treebank, the hand-tagged text it learned from."

### 10. [P3] explanation — Fig. 3 never names the novel, and its rows arrive before Emma is said
- When: 59.0-63.2 s, beats `length`, `emma-length` (element-120.jpeg, element-124.jpeg).
- What: the title is "One novel, scored on more and more of it". The rows "first 100 words … all 161,600 words" appear on "grows", about 3 s before "Jane Austen's Emma".
- Why it matters: the rows read as unexplained for 3 s, and the figure stays anonymous afterwards.
- Cause: `DiversityScene.tsx:164` (the title) and `:178` (rows at `growsAt`).
- Fix: title the figure "Emma, scored on more and more of it" and ink the rows from `r100Said - 4`.

### 11. [P3] spacing — Gliding word tiles pass under the tag chips and the nouns row
- When: 236.0 s ("system" slides under the VBD and DT chips, element-472.jpeg) and 239.0 s ("talented" slides under the "engineer" tile, element-478.jpeg).
- Why it matters: words visibly collide mid-flight in the scene's payoff animation.
- Cause: `PennScene.tsx:171-194`. The moving copies are drawn in sentence order, before later tiles and before the `TagChip` map, on a straight path through the chip row and the nouns row.
- Fix: render the gliding copies in their own map after line 194. Route each glide in two legs: down below `sortedY(3)` first, then across and up into its row.

### 12. [P3] accuracy — VBZ is glossed "present-tense verb", which also describes the VBP just shown
- When: 207.0-212.5 s, beat `meanings` (element-424.jpeg).
- What: "reads" (VBZ) is called "a present-tense verb" about 15 s after "fish" in "we fish" (VBP, also present tense) was just "a verb". The lesson's table calls VBZ "3rd-person".
- Cause: `PennScene.tsx:23` and `script.ts:167`.
- Fix: gloss it "verb, he/she/it form" and narrate "a present-tense verb for he, she or it".

### 13. [P3] explanation — "Hand each word its tag" skips the step that makes it work
- When: 261.9-271.6 s, beat `tagfirst` (element-530.jpeg, element-552.jpeg).
- What: Penn tags (VBD, VBG, VBN) appear to go straight into WordNet. The lesson's recipe converts each tag to WordNet's noun, verb, adjective or adverb by its first letter. The first-letter legend from 50 s earlier would pay off here and isn't used.
- Cause: `LemmaScene.tsx:134-138` and `script.ts:197`.
- Fix: on "hand", shrink each chip in the tags row to its first letter (V, N, R), and narrate "hand each word its tag's first letter".

### 14. [P3] other — Fig. 10's title says nothing, and the first-letter legend is drawn twice in two orders
- When: 224.0-246.0 s, beats `extract` to `adjectives` (element-490.jpeg).
- What: "Keep the tags that start with a letter" (every tag does). The right column lists N, V, J, R, and the sorted rows below use N, J, V, R.
- Cause: `PennScene.tsx:170` (the title) and `:76-81` (`ROW_ORDER`).
- Fix: retitle the figure "Sort the words by their tag's first letter", and put the rows in N, V, J, R order. Reorder the narration to match: "V gives designed, J gives …".

### 15. [P3] pacing — The four-in-a-row bar (97%) arrives unnarrated, 0.3 s before the last bar
- When: 367.0-368.5 s, beat `shares` (element-734.jpeg, element-736.jpeg).
- What: the bar rises with no narration and is followed at once by the five-in-a-row bar.
- Cause: `SparseScene.tsx:40` and `:47` (`"five in a row" - 10` / `- 12`).
- Fix: narrate "Four in a row, ninety-seven. Five, ninety-nine.", or start the bar on "Trigrams, ninety" + 20 frames.

### 16. [P3] confusion — Fig. 14's two panels use different bar scales, and the three lines are never shown
- When: 330.0-348.0 s, beats `phrases`, `cast` (element-704.jpeg).
- What: "×3" is a 230-px bar and "×299" a 300-px bar, side by side under one figure title. "Three short lines about machine learning" are counted, but the lines themselves never appear.
- Cause: `OrderScene.tsx:75-76` (`mlUnit = 230/3`, `castUnit = 300/299`) and `:153-155`.
- Fix: show the three lines as one-line 22px tiles under "three lines about machine learning", and print the left panel's counts without bars, or give both panels a shared scale label.

### 17. [P3] spacing — The Zipf note crowds the tops of bars 11-12
- When: 111.0-130.0 s (element-250.jpeg).
- What: "and almost every text has it" sits about 15-18 px above the tops of bars 11 and 12. The note starts at x 1090, directly over bar 11.
- Cause: `TailScene.tsx:213` (`x = X0 + 10*PITCH + 10`, `y = bracketY + 44`, three lines).
- Fix: move the note to `x = TAIL_X0 - 40` above the empty tail region, or raise it by 30 px.

### 18. [P3] pacing — FreqDist tallies all 30 tokens in 1.6 s, and its rows pop in out of order
- When: about 19.6-21.4 s, beat `tally` (element-040.jpeg, element-042.jpeg).
- What: one token every 1.6 frames. Rows appear at their final rank as words are first seen, so "too" (row 8) shows up while rows 5-7 are still empty.
- Cause: `CountScene.tsx:62` (`step = 1.6`) and `:139-143`.
- Fix: set `step = 3` (about 3 s, ending on "thirteen"). The beat is 10.4 s at 1.91 w/s, so there is room.
