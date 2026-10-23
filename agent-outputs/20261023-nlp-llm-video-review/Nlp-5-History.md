# Nlp-5-History (0-311.8 s, whole video)

## Verdict
- A well-built, well-sourced closing unit. Every date and quotation I spot-checked holds up. I read the Spärck Jones paper's text: "a term occurring ninety times has weight 2, while one occurring three times has weight 7", Cranfield, 200 documents. Shannon's second-order sample matches word for word, and so do the secretary and ALPAC quotes. Dostert's "five, perhaps three" matches a secondary quotation of it; I did not see Hutchins's slides. The builder's scene list matches the frames. Type sizes are all 20px and up, and nothing overlaps worse than a touch.
- The weakest parts are the two scenes that carry numbers: Zipf and Spärck Jones. They state figures without making them readable. Fig. 3's log rank axis shades "a few words" (100 of 7,079) across half the chart and squeezes the 39% that appear once into a 47px stub. The video says "one over the rank" but never says what it predicts (the second word half as often as the first), and never says the axes are log scales. Her weights 2 and 7 are never derived, and they disagree with the log(N/df) the course taught, right before "that's the IDF in TF-IDF".
- Two visuals contradict what is said. Fig. 12 (neighbours of "excellent") builds 10 s before anyone mentions it, so it sits beside the king/queen analogy unexplained. And the Turing booths are joined by a tube passing a note between the person and the machine, which the imitation game rules out.
- Pacing is comfortable overall: mostly 2.1-3.1 words/s, 0.55-1.0 s gaps, and 1.6 s scene gaps. It rushes in three places: `law` (3.34 w/s, a new law on a new chart), `flaw` then `fix` (3.73 w/s with a 0.60 s gap: problem and fix back to back), and the word2vec analogy. A few scene openings sit nearly empty for 5-7 s.

## Deep-dive candidates
1. **Zipf's law, read off a log-log plot.** Lesson section "The quiet law: Zipf". The unit spends 30.8-53.3 s on it (`law`, `emma`, `tail`): a law, a new kind of chart and four numbers. It cannot slow down because Zipf is one of seven stories, and the video already runs 5:12 against a 4.5-minute target. A 2-minute video would:
   - plot Emma's counts on linear axes first (a cliff and a long flat tail), then switch both axes to log and watch the curve straighten;
   - show what one over the rank predicts row by row (rank 2 = half, rank 10 = a tenth) next to the real table, where "to" and "the" almost tie;
   - end on the practical consequences, with linear stacked bars: the top 100 words are 60% of the text (stopwords), 39% of the vocabulary appears once (hapaxes), and why that motivates IDF.
2. **From Spärck Jones's weight to IDF.** Lesson section "1972, Spärck Jones and IDF". The unit covers it in 218.5-245.9 s (`flaw`, `fix`, `example`, `idf`): the core idea in 10 s at up to 3.73 w/s, and weights that are given but not derived. A 2-minute video would:
   - score one query against a few documents with flat matching, and show matches on "the" swamping a rare-term match;
   - derive her rule, f(N) - f(n) + 1, by counting halvings (200, 128, 64, ...), and show that it is about log2(N/n) + 1, so 90 documents gives about 2 and 3 documents about 7;
   - set it beside the course's log(N/df), explaining why a word in every document gets 1 under her rule and 0 under the course's;
   - finish with BM25's IDF term as the modern descendant.
3. **What "a point in space" means, and why king - man + woman lands near queen.** Lesson section "2013, word2vec and meaning as geometry". The unit covers it in 257.0-278.4 s (`points`, `analogy`, `great`): three new ideas (embedding, direction, nearest neighbour) in 21 s, with the second figure arriving early. A 2-minute video would:
   - show context windows sliding over sentences, so words used in similar places end up close;
   - show cosine similarity as an angle and the nearest-neighbour list for "excellent";
   - work the analogy in full, including the caveat that king itself is nearest (0.799) unless the three input words are excluded, after which queen is nearest (0.712);
   - close on great and excellent as two unrelated bag-of-words columns versus neighbours here.

## Findings

### 1. [P1] confusion: the log rank axis inverts both "a few words" proportions
- When: 45.6-58.6 s, beats `tail` and `zipf-out` (element-096.jpeg, element-114.jpeg)
- What: Under the headline "A few words do most of the work.", the blue band labelled "top 100 words: 60% of the book" covers half of Fig. 3's width, because ranks 1-100 are 2 of the 4 log decades. Those 100 words are 1.4% of the 7,079-word vocabulary. The 2,739 words that appear once ("nearly four in ten") are a 47px yellow stub at the far right, about 5% of the width. Nothing on screen or in the narration says the axes are logarithmic.
- Why it matters: at a glance the picture says "half the words make 60%" and "the once-only words are a sliver", the opposite of the point being made.
- Cause: `video/src/videos/nlp-history/ZipfScene.tsx:18`: `lx` is log10, so the band at `:143` (`lx(1)` to `lx(100)`) is half the frame. The hapax run at `:153-162` spans `lx(4341)` to `lx(7079)`.
- Fix: keep the log plot for the law. Cued to "sixty percent" and "nearly four in ten", add two linear 100% bars under Fig. 2 (y around 880-960):
  - "Emma's 161,600 words: 60% are the top 100";
  - "its 7,079 different words: 39% appear once".
  
  Relabel the band "top 100 of 7,079 words: 60% of the book".

### 2. [P2] explanation: Zipf's law is named but its prediction and the log-log axes are never explained
- When: 30.8-44.3 s, beats `law` (3.34 w/s, the densest content beat) and `emma` (element-072.jpeg)
- What: "the counts fall off roughly as one over the rank" is the only statement of the law. The video never says what that means for rank 2 or rank 10, or why the dashed line is straight. Seven seconds later "the first two words almost tie" is offered as a deviation, but the viewer was never told the law expected the second word at about half the first.
- Why it matters: the "the top is rough" caveat has nothing to push against, and the chart's axes go unexplained.
- Cause: `video/src/videos/nlp-history/script.ts:160`; `ZipfScene.tsx:163-172` draws the guide line with no reading of it.
- Fix: rewrite `law` as "Rank them by how common they are, and the second word turns up about half as often as the first, the tenth a tenth as often. On these log scales that's a straight line: Zipf's law." Keep `pauseAfter: 0.9`. Add a ghost cell "law: ~2,620" beside 5,201 in Fig. 2, cued to "almost tie".

### 3. [P2] explanation: Spärck Jones's weights 2 and 7 have no derivation and contradict the course's IDF formula
- When: 230.0-245.9 s, beats `example` and `idf` (element-476.jpeg, element-490.jpeg)
- What: Bars "2" and "7" appear for words in 90 and 3 of 200 documents. Seconds later: "That's inverse document frequency, the IDF in TF-IDF". A learner who applies the course's log(N/df) gets 0.80 and 4.20, not 2 and 7. Nothing on screen says how her numbers arise.
- Why it matters: the numbers the viewer is told *are* IDF don't match the IDF they learned, and the step connecting them is missing.
- Cause: `video/src/videos/nlp-history/IdfScene.tsx:95-124` (each row shows only the weight); `script.ts:290`.
- Fix: her rule is about log2(N/n) + 1: log2(200/90) + 1 = 2.15 and log2(200/3) + 1 = 7.06. Add a 22px note under each bar, cued to "weighs two" and "weighs seven": "≈ log₂(200 ÷ 90) + 1" and "≈ log₂(200 ÷ 3) + 1". That shows outright that this is a log of N over n.

### 4. [P2] confusion: Fig. 12 builds 10 s before it is narrated
- When: 262.0-272.2 s, beats `points` and `analogy` (element-526.jpeg, element-542.jpeg)
- What: "Fig. 12 The six words nearest to excellent" and all six bars, with "great" already bold blue, build at "close together" (261.8 s). For the whole analogy beat they sit on the right half, unexplained. "Remember great and excellent" only arrives at 272.2 s. Separately, the four Fig. 11 dots pop in on "Mikolov", "Google", "released" and "vec", before "It gives every word a point in space".
- Why it matters: during the analogy, the most abstract step in the scene, half the frame shows something the narrator has not mentioned.
- Cause: `video/src/videos/nlp-history/VectorScene.tsx:156` (FigLabel `at={closeAt - 4}`), `:164` (`t = closeAt + i * 4`), `:171` (`great` coloured from the start); dots at `:124-127`.
- Fix: cue the Fig. 12 label and bars from `rememberAt`, and colour "great" from `columnsAt`. The two wash ellipses at `:129` already carry "close together". Cue the dots to `pointAt + i*4`, not to the names.

### 5. [P2] confusion: the Turing booths are connected to each other
- When: 108.4-138.7 s, whole Turing scene (element-249.jpeg)
- What: The watercolour shows the person's booth and the machine's booth joined by a red tube with a note sliding through it. The dashed wires correctly give the judge a separate line to each booth. The picture adds a channel between the two hidden players.
- Why it matters: the game depends on the judge being the only go-between. A viewer can read the tube as the person and machine conferring.
- Cause: `video/src/videos/nlp-history/illustrations.json`, prompt `nlp-history-booths` ("joined at waist height by a short square red tube with one folded white paper note sliding through its middle"), placed at `TuringScene.tsx:152`.
- Fix: regenerate it as "two small closed wooden booths standing apart with a clear gap between them", with no tube or note, and let the wires and slips be the only channels.

### 6. [P2] pacing: the flaw and its fix land back to back
- When: 218.5-229.1 s, beats `flaw` (3.73 w/s, gap 0.60) and `fix` (3.14 w/s)
- What: "A match on a common word counted just as much as a match on a rare one." is the fastest beat in the video, and the fix follows 0.6 s later. What "a match" is (a query word found in a document) is never shown: Fig. 10 has documents but no query.
- Why it matters: this is the problem IDF solves. It needs a breath before the solution, and the viewer needs to see what is being matched.
- Cause: `video/src/videos/nlp-history/script.ts:281` (`pauseAfter: 0.6`); `IdfScene.tsx:193-216` shows bars but no query.
- Fix: set `flaw` to `pauseAfter: 1.1`. Above the two rows at `RX`, add a query chip (two words in mono, one grey and one blue), with each row's label reading "a query word found in a document", cued to `commonAt`.

### 7. [P3] confusion: the common word's bar grows when it is weighted
- When: 233.5-237.5 s, beat `example` (element-468.jpeg, element-472.jpeg)
- What: Both bars start at 1. On "weighs two" the common word's bar doubles, under the headline "The rarer the word, the more it's worth". The 7 only arrives 3 s later.
- Why it matters: for a few seconds the rarity fix seems to raise the common word.
- Cause: `video/src/videos/nlp-history/IdfScene.tsx:89-90` (both weights animate up from 1 on the same scale).
- Fix: at `ninetyAt`, dim the 1/1 bars to 30% as "before" and draw her weights as new bars beneath them labelled "her weight". Or add "three and a half times as much" to `example`.

### 8. [P3] accuracy: "1935: Counting words" and "nearly a hundred"
- When: 5.0-25.6 s, beats `hook` and `age` (element-040.jpeg)
- What: The first card dates "Counting words" to 1935. People counted words long before that (concordances; Estoup and Condon saw the rank pattern first, as the script header admits). The opening's claim "The oldest is nearly a hundred" stands on this card, while the bracket on screen says "91 years".
- Why it matters: the hook's own example is the one a careful viewer can dispute, and the number said does not match the number shown.
- Cause: `video/src/videos/nlp-history/data.ts:40`; `script.ts:144`; `OpenScene.tsx:192`.
- Fix: card text "Ranking word counts"; narration "The oldest is over ninety."

### 9. [P3] explanation: Shannon's by-hand method is not shown, and its hook goes stale
- When: 68.5-78.3 s, beat `book` (element-148.jpeg)
- What: While the narrator says "open a book at random, find the word, copy the one after it, repeat", the book is a static watercolour. The sample grows by one word per step, but the red hook stays on THE to HEAD while AND, IN, FRONTAL and ATTACK arrive.
- Why it matters: the procedure is the memorable part of the story, and the one pointer drawn stops matching it after the first step.
- Cause: `video/src/videos/nlp-history/ShannonScene.tsx:261-273` (Wire fixed on words 0-1, `out={cameAt}`); steps at `:171`.
- Fix: redraw the hook at each `steps[i]` from word i to word i+1 (x from the running character offset × `CHAR`), so every "copy the one after it" gets its own hook.

### 10. [P3] confusion: the close's first row dates the wrong layer
- When: 286.8-311.8 s, beat `layers` (element-620.jpeg)
- What: "1972 search still leans on IDF" and "1948 language models still guess the next word" are dated by the old layer that was kept. "2013 word2vec still starts from tokens" is dated by the new idea, and the 2013 dot pulses for "tokens", which is nowhere on the timeline.
- Why it matters: it breaks the "each idea kept the one beneath it" mapping the rows are there to show.
- Cause: `video/src/videos/nlp-history/CloseScene.tsx:66` (`story: "w2v"`), year printed at `:161`.
- Fix: point the row at `story: "zipf"` (1935, counting words), so all three rows date the layer kept.

### 11. [P3] spacing: near-empty scene openings
- When: 58.6-66 s Shannon (element-128.jpeg); 138.7-146.5 s Georgetown (element-284.jpeg); 211.1-217 s Spärck Jones
- What: In Georgetown, the "Fig. 7 The demo, 7 January 1954" caption sits over empty space for 7 s before the first number. In Shannon, the paper card fills the left third and the rest stays blank for 7 s. In Spärck Jones there is no headline for 6 s, only the grid filling in.
- Why it matters: dead frame while names and dates are being said.
- Cause: `video/src/videos/nlp-history/GeorgetownScene.tsx:81` (FigLabel `at={from + 4}`, stats from `wordsAt - 2` at `:83`); `IdfScene.tsx:140` (first headline at `searchAt - 4`).
- Fix:
  - Georgetown: FigLabel at `wordsAt - 8`, and the "Russian in, English out." headline at `from + 2`.
  - Spärck Jones: put the first headline at `from + 2`.

### 12. [P3] spacing: the ELIZA panel's footer rows are 18px apart
- When: 191-211 s (element-410.jpeg)
- What: Red rule (ends y 867), then "just patterns and canned replies" (885-905), then "Reading real understanding into a simple text trick" (923-958). Each gap is 18px, under the README's ~25px. The secretary quote block beside it has a 60px gap between quote and credit.
- Cause: `video/src/videos/nlp-history/ElizaScene.tsx:151` (Tag at `PTOP + PH + 30`) and `:167` (`y(840)`).
- Fix: Tag at `PTOP + PH + 34`, italic line at `y(856)`.

### 13. [P3] accuracy: narration drops the source's qualifiers
- When: 160.5-167.4 s `alpac`; 263.6-271.2 s `analogy`
- What: "saw no prospect of useful machine translation" against the on-screen "no immediate or predictable prospect". And "the nearest word is queen", which holds only with king, man and woman excluded. The builder measured king itself as nearest otherwise (0.799 vs 0.712).
- Cause: `video/src/videos/nlp-history/script.ts:243`, `:313`; `VectorScene.tsx:148`.
- Fix: "saw no near-term prospect"; "the nearest other word is queen" (and "nearest other word: queen" on screen).

### 14. [P3] other: Fig. 1 is reused for a different figure
- When: 280.0-311.8 s vs 5.0-25.6 s
- What: The opening's Fig. 1 is "Three ideas from this course, by the year they appeared" (3 cards). The close's is "How the field got here" (7 stories, a thread, two lists). Same number, different content.
- Cause: `video/src/videos/nlp-history/CloseScene.tsx:110`.
- Fix: `n="13"`, or keep 1 and title it "Fig. 1, all seven stories".

### 15. [P3] spacing: four small touches and collisions
- When / what:
  - 270-280 s: the "queen" label's last letter touches the red ring (element-558.jpeg).
  - 52-58.6 s: the dashed 1/rank line ends inside the "7,079" tag (element-114.jpeg).
  - 117-138.7 s: the judge's lower wire starts inside the keyboard outline (element-249.jpeg).
  - 21.5-25.6 s: the lean-in pushes the axis to x 1880, a 40px right margin against 96px on the left (element-049.jpeg).
- Cause:
  - `VectorScene.tsx:127` (queen `dx={-20} dy={30}` vs ring r=30 at `:143`);
  - `ZipfScene.tsx:167` (guide runs to rank 10,000) and `:200`;
  - `TuringScene.tsx:118` (`[JX + 230, JTOP + 160]` is inside the keyboard path, whose right edge at that height is about JX + 245);
  - `OpenScene.tsx:162` (scale 1.1).
- Fix:
  - queen `dx={-42}`;
  - end the guide at `lx(ZIPF.distinct)`;
  - wire start `[JX + 258, JTOP + 160]`;
  - zoom `0.06`.
