# Nlp-1-WhyTextIsHard (whole video, 0-317.5 s)

## Verdict
- Solid, clean video. Every number on screen matches the narration and the lessons. There is no overlap or clipping in any finished state, all text is 19px or larger, and figure numbering runs 1-11 in order. The builder's scene list and counts (62, 16, 8/12, 13/13/11/6/6) match the frames.
- The biggest problems are about meaning, not layout. Fig. 5 pairs "Apple the company / apple the fruit" with "lowercasing", which is the step that erases that distinction. The final state of Fig. 9 strikes each dropped token on the row before the step that drops it, so "3. cleaned" looks as if cleaning removed the stopwords. The lemmatizer leaves "running" alone, 140 s after Fig. 5 promised that lemmatizing joins run/runs/running/ran. Fig. 7's "Counts" box counts words ("the 2") that are not among the three words it follows.
- Jargon goes by with no explanation. The Fig. 5 tags (stemming, lemmatizing, n-grams) and the Fig. 7 glosses (part of speech, n-grams) are on screen for 2-3 s and nobody says them aloud. The hook asks "how many words?", and Fig. 3 answers it (16 tokens) without a word of narration. Fig. 6 then teaches the same thing 100 s later.
- Pacing is comfortable, not fast: about 2.5 words/s on average, 0.6-0.9 s between beats, 1.6 s at scene changes. Only the Layers scene (five layers in 10.5 s) and the rules/readable pair feel rushed. The video runs 5:18, about 48 s over the 4.5-minute target (the builder flagged this). The fixes below add at most a few seconds.

## Deep-dive candidates
1. **The goal chooses the cleaning steps** (the-nlp-pipeline.mdx, "The two families of steps: cleaning vs. analysis" and "Second, most steps are optional").
   - Where the unit rushes it: one sentence at 261.6-271.8 s (`analysis`), straight after `cleaning` (256.6-260.9 s) called the same steps "much the same in every project". There is no example of a goal changing a step.
   - Why the unit can't slow down: this is the bridge between the pipeline walk-through and the order demo, and the video is already 48 s over.
   - What a 2-minute video would show: one review, "This movie was not good at all", through two pipelines.
     - For topic counting, removing stopwords is harmless.
     - For sentiment, NLTK's list (which contains "not", shown in Fig. 11's card) deletes the negation, and the review now reads positive.
     - It ends on the lesson's three goals (search counts, autocomplete builds n-grams, a classifier builds features), each with a different set of dashed steps switched on.
2. **Ambiguity: context decides** (what-is-nlp.mdx, "Why this is hard: ambiguity everywhere").
   - Where the unit rushes it: three kinds in about 33 s (`lexical` 49.5 s to `answer` 82.0 s). Structural and referential ambiguity get one example and two readings each, with no picture of *why* both readings are valid.
   - Why the unit can't slow down: ambiguity is one of four "why text is hard" strands, each held to a single scene.
   - What a 2-minute video would show:
     - "I saw the man with the telescope" as two bracketings, with the phrase attached to "saw" in one and to "man" in the other.
     - The trophy sentence with "big", then with "small": the referent flips from trophy to case, so resolving "it" needs world knowledge.
     - "bank" in two sentences, where the neighbouring words settle it.
3. **Structure in layers, and processing is not understanding** (what-is-nlp.mdx, the layers diagram and the "count, match, transform" callout).
   - Where the unit rushes it: five layers in 10.5 s (`layers` 165.2-169.4 s, `layers-up` 170.0-175.7 s), then the spam-filter claim in one sentence (`understand` 176.6-185.6 s). Part-of-speech tagging and n-grams are named but never shown doing anything.
   - What a 2-minute video would show: one short message ("FREE money, claim now") through characters, tokens, normalized tokens, tags and counts. Then a toy spam scorer that adds up word weights: it flags the message correctly, and it also flags "Are you free for lunch?". Counting works without meaning, and this is where it breaks.

## Findings

### 1. [P2] accuracy: "Casing" row says lowercasing is the fix for Apple vs apple
- **When:** 97.5-100.6 s `casing`; tag at 110.9-114.1 s `reasons` (frames element-200.jpeg, element-228.jpeg)
- **What:** The row reads "Apple *the company* / apple *the fruit*" with "lowercasing" as the step it needs. The narration says "Apple, the company, isn't apple, the fruit", then "Each of these is the reason a later step exists." Lowercasing is exactly what turns the company into the fruit. The lesson's real motivation for case folding is the other half of its bullet, "a word capitalized only because it starts a sentence", and the video dropped it.
- **Why it matters:** A viewer learns the opposite of what case folding does, and Fig. 9 and Fig. 11 later rely on lowercasing being helpful.
- **Cause:** `video/src/videos/nlp-why-text-is-hard/MessScene.tsx:145-157` (example) with `:58` (TAGS[2] = "lowercasing"); `script.ts:128`.
- **Fix:** Make the example "The cat / the cat" with the gloss *same word*, and change the beat to "The at the start of a sentence is still the." This sets up Fig. 9's "The Cats" and Fig. 11's "The The THE". If the Apple pair stays, add the gloss "lowercasing merges them".

### 2. [P2] confusion: Fig. 9's final state strikes each drop on the wrong row
- **When:** 231.7-240.8 s `cleaned`/`stopped`; held through `list` to 256.6 s (frames element-478.jpeg, element-510.jpeg)
- **What:** A token that a step drops is struck in the row *above*, the previous step's output. In the final hold, "2. lowercased" shows "," and "!" struck, and "3. cleaned" shows the/are/and/the/are struck. Read as a table, cleaning appears to have removed the stopwords and lowercasing the punctuation. The narration says the opposite: "Cleaning drops the comma and the exclamation mark".
- **Why it matters:** The table is held for 10 s as the summary of the pipeline, and it attributes two of the four drops to the wrong step.
- **Cause:** `video/src/videos/nlp-why-text-is-hard/PipelineScene.tsx:148-150` (`struck = next && !next.cols.includes(c) ? strikeAt(k + 1, c)`: the strike is drawn on row k for step k+1).
- **Fix:** Keep the strike as the animation. Once the next row has landed (rowAt[k+1] + 12), fade the struck chips in row k to opacity 0, and draw a faint dashed empty slot in row k+1 where the token went. The drop then belongs to the step that made it.

### 3. [P2] explanation: The lemmatizer leaves "running" alone, after Fig. 5 promised it would not
- **When:** 241.4-246.0 s `lemmatized` (element-490.jpeg); the promise is at 101.2-105.9 s `forms` and the tag at 113 s (element-228.jpeg)
- **What:** Fig. 5 says "run runs running ran / one idea → stemming, lemmatizing". In Fig. 9, "5. lemmatized" changes cats→cat and dogs→dog, but "running" and "barking" stay as they were, and nothing on screen or in the narration says why. The builder chose not to comment.
- **Why it matters:** An attentive viewer reads this as the video, or the lemmatizer, being wrong. It is the one place where Fig. 5's promise is tested on screen, and it fails silently.
- **Cause:** `video/src/videos/nlp-why-text-is-hard/PipelineScene.tsx:77-81` (only changed columns get a mark); `script.ts:184`.
- **Fix:** Add a note under the "running" chip in row 5, "read as a noun: unchanged", inked at the end of the beat. Extend `lemmatized` to "...and dogs into dog. Running stays, because the lemmatizer was not told it's a verb." That adds about 3 s. Unit 2 picks it up.

### 4. [P2] confusion: Fig. 7's "Counts" box counts words the figure never showed
- **When:** 175.0-187.2 s `layers-up`/`understand` (frames element-350.jpeg, element-370.jpeg)
- **What:** The figure is captioned "on three words of one sentence", and the boxes carry "Cats are RUNNING" through four layers. Then "Counts" shows "the 2, are 2, cats 1". "the" is not among the three words, "running" is missing, and "are 2" cannot come from a single "are". The counts come from the full pipeline sentence, which is not on screen until 223 s.
- **Why it matters:** The number appears with no context, and it breaks the one-input, layer-by-layer reading the figure sets up.
- **Cause:** `video/src/videos/nlp-why-text-is-hard/LayersScene.tsx:181-201` (renders `LAYERS.counts`, counted over `m.pipeline.text`).
- **Fix:** Count the three words themselves ("cats 1, are 1, running 1"), or caption the box "counts over the whole sentence" and show the full sentence in the Characters box. The first is simpler and keeps the caption true.

### 5. [P2] explanation: Step names flashed and never said (Fig. 5 tags, Fig. 7 glosses)
- **When:**
  - 111.9-116.0 s, `reasons`/`split-in` (frames element-226.jpeg, element-228.jpeg, element-232.jpeg).
  - 170.0-175.7 s, `layers-up` (element-350.jpeg).
- **What:**
  - Fig. 5's five tags hold six terms: tokenizing ×2, lowercasing, "stemming, lemmatizing", n-grams. They ink in over about 2.2 s while the narrator says only "Each of these is the reason a later step exists". The bottom three rows are dimmed about 2 s later (at "split"), so "stemming, lemmatizing" is readable for about 2.7 s and "n-grams" for about 2.1 s.
  - None of these words is defined anywhere in the video. "Lemmatizing" gets an example at 241 s; "n-grams" and "stemming" never do.
  - Fig. 7 adds the glosses "part of speech" and "frequencies, n-grams", and the narration says "tagged with their part of speech" without showing what a tag is for.
- **Why it matters:** These are the course's core terms, and on first contact they are on-screen-only text shown for less time than it takes to read them while listening.
- **Cause:**
  - `video/src/videos/nlp-why-text-is-hard/MessScene.tsx:55` (tagAt spreads five tags across "reason…exists").
  - `MessScene.tsx:57` and `:205-215` (dim veil at "split").
  - `LayersScene.tsx:175-181` (glosses).
- **Fix:** Have the narration read the tags. Split `reasons` into "Contractions and punctuation are why we tokenize. Casing is why we lowercase. Word forms are why we stem and lemmatize, and multi-word units are why we count n-grams." That is about 8 s, so give it pauseAfter 0.9 and move the dim from "split" to the end of that beat. Drop "n-grams" from Fig. 7's gloss (it already appears in Fig. 5).

### 6. [P2] explanation: The hook's question is answered silently, and Fig. 3 repeats Fig. 6 ahead of time
- **When:** 35.0-44.0 s `nlp`/`ambig-in` (frames element-078.jpeg, element-086.jpeg)
- **What:** Fig. 3 inks word_tokenize's 16 tokens under the string, with "16 tokens", "ca | n't", "Dr." kept whole and "$" alone. Together these answer all three questions in Fig. 1, but the narration never mentions them and moves on to ambiguity. The "ca"/"n't" split goes unexplained until 146.6 s. At 138.8-153.9 s Fig. 6 then teaches the same tokenizer behaviour on a different sentence, with the same chip-under-source layout.
- **Why it matters:** The opening question ("How many words are in this sentence?") is never closed aloud, and the payoff a viewer could see is spent before it is explained.
- **Cause:** `video/src/videos/nlp-why-text-is-hard/HookScene.tsx:190-198` (Fig. 3 on "structure… compute with"); `script.ts:95-100`.
- **Fix:** Add one beat after `nlp`: "One tokenizer's answer is sixteen: can't becomes two, Doctor keeps its period, and the dollar sign stands alone." That is about 5 s, with the three relevant chips flashed in order. If time is the constraint, cut Fig. 3 instead and let Fig. 6 carry the idea.

### 7. [P2] explanation: Fig. 10 says "much the same in every project" next to "dashed: optional" on four of the five steps
- **When:** 256.6-271.8 s `cleaning`/`analysis` (frames element-518.jpeg, element-543.jpeg)
- **What:** `cleaning` says the steps are "much the same in every project", and that caption stays under the pills. Ten seconds later `analysis` says "so should the cleaning, because most of its steps are optional", and four pills turn dashed. Nothing reconciles the two claims. The "depends on your goal" arrow also lands on the "lemmatize" pill alone, which implies only lemmatizing depends on the goal.
- **Why it matters:** Two contradicting claims sit side by side in the frame, and the arrow points at the wrong scope.
- **Cause:**
  - `video/src/videos/nlp-why-text-is-hard/HalvesScene.tsx:136-138` (caption).
  - `HalvesScene.tsx:154-163` (arrow ends at `LEM_MID`, line 31).
  - `script.ts:190-194`.
- **Fix:** Change the beat and caption to "the same kinds of steps in every project" / "the same toolbox in every project". End the arrow on a bracket spanning the four dashed pills (lowercase…lemmatize) instead of on LEM_MID.

### 8. [P3] other: "Cleaning" names both step 3 and the whole first half
- **When:** 231.7-236.0 s `cleaned` (row "3. cleaned"); 256.6-262 s `cleaning` (Fig. 10 title "Cleaning" over pills that include "clean") (element-470.jpeg, element-543.jpeg)
- **What:** In one minute, "cleaning" means "drop punctuation" and then "all five steps".
- **Why it matters:** "Those are the cleaning steps" can be heard as "the step called cleaning".
- **Cause:** `video/src/videos/nlp-why-text-is-hard/HalvesScene.tsx:128` and `:15`; `script.ts:182`, `:190`.
- **Fix:** Use the lesson's own word for the half: the title becomes "Preprocessing", the beat becomes "Those are the preprocessing steps", and the kicker becomes "Preprocessing, then analysis".

### 9. [P3] spacing: The step-swap animation tangles three pills over the caption
- **When:** 272.7-273.5 s `order-in` (element-546.jpeg)
- **What:** "lowercase" and "stopwords" trade places with only ±26 px of lift. Both pass over "clean" (the pill between them stays put), and "stopwords" runs into the caption "much the same in every project". For several frames it reads as a jumble.
- **Cause:** `video/src/videos/nlp-why-text-is-hard/HalvesScene.tsx:98` (18-frame swap) and `:109` (lift 26 px; the pill is about 42 px tall).
- **Fix:** Set the lift to 60 px (one pill height plus a gap) and the swap to 24 frames, and fade the caption to 0.3 opacity during the swap.

### 10. [P3] confusion: No headline for 5 s while NLP is defined
- **When:** 29.6-34.8 s `nlp` (element-060.jpeg to element-068.jpeg)
- **What:** "How many words are in this sentence?" exits as the beat starts. "NLP turns text" only arrives on "turns", in the second sentence. The headline slot is blank while the narrator says "Natural language processing, NLP for short, closes that gap", the course's defining sentence. Smaller version: at 154.7-157 s nothing is shown between "Split it on the spaces?" and "A real problem,".
- **Cause:**
  - `video/src/videos/nlp-why-text-is-hard/HookScene.tsx:121` (`out={nlpFrom - 10}`).
  - `HookScene.tsx:122` (`at={turnsAt - 4}`).
  - `SplitScene.tsx:117-118`.
- **Fix:** Bring the new headline in at `nlpFrom - 4` with the lead "Natural language processing", and swap in "NLP turns text into structure." on "turns". In SplitScene, start the new headline at `realFrom - 4`.

### 11. [P3] pacing: The rules and readable beats come back-to-back at more than 3.1 words/s
- **When:** 187.2-194.2 s `rules` (3.11 w/s), gap 0.6 s, then 194.8-199.9 s `readable` (3.16 w/s) (frames element-374.jpeg to element-400.jpeg)
- **What:** The first beat introduces "stopwords" while Fig. 8's sub-line "like NLTK's stopword list, 198 words: a, about, above, after, …" inks in. The second makes a separate point (no training data, readable reasons). There is no breath between them.
- **Cause:** `video/src/videos/nlp-why-text-is-hard/script.ts:163-168` (`pauseAfter: 0.6`).
- **Fix:** Set `pauseAfter: 1.0` on `rules`.

### 12. [P3] spacing: Empty ruled frames held while the narrator explains
- **When:**
  - 44.5-49.5 s `ambiguity`: three empty rows (element-095.jpeg).
  - 216.6-220.5 s `pipeline`: five empty rules under a half headline (element-438.jpeg).
- **What:** The figure's scaffold is drawn about 5 s before any content. During `pipeline` ("a fixed sequence of steps, where each step's output is the next step's input"), nothing shows a step.
- **Cause:**
  - `video/src/videos/nlp-why-text-is-hard/AmbiguityScene.tsx:90` and `:110-123`.
  - `PipelineScene.tsx:123-138` (rules on "sequence").
  - `PipelineScene.tsx:70` (step labels arrive only with each step's beat).
- **Fix:** In the pipeline, ink the five step labels ("1. tokenized" … "5. lemmatized") down the left on "sequence" (`sequenceAt + k*5`), so the sequence is visible. In the ambiguity scene, draw each row's rule with that row's gist (`gistAt`), not on the opening sentence.

### 13. [P3] spacing: Fig. 7's "Tagged" chips sit 18 px above the chips in every other box
- **When:** 172.5-187.2 s (element-370.jpeg)
- **What:** The chips in Tokens and Normalized sit at y≈531, and those in Tagged at y≈513 to make room for the tags. The row of examples steps up and back down across the arrows.
- **Cause:** `video/src/videos/nlp-why-text-is-hard/LayersScene.tsx:179` (`top={exTop - 18}`).
- **Fix:** Use `top={exTop}`. The tags then sit at exTop+46, about 205 px inside a 232 px box, so they still fit.

### 14. [P3] confusion: The highlight on the sentence never comes off
- **When:** 121-165 s, through the whole Split scene (element-306.jpeg)
- **What:** The read-along highlight on `sentence = "..."` stays fully yellow until the cut. From `fixed` (146.6 s) onwards, yellow also marks the tokens the tokenizer fixed (ca, n't, ",", "!", "Mr."), so two meanings of yellow compete.
- **Cause:** `video/src/videos/nlp-why-text-is-hard/SplitScene.tsx:124-135` (width follows `readP`; there is no fade-out).
- **Fix:** Multiply the highlight's opacity by `1 - ease(frame, cutsAt, 12)`, so it clears when `.split()` starts cutting.

### 15. [P3] explanation: NLTK is used but never introduced
- **When:** 138.8 s `tokens` ("NLTK's word tokenizer"); later on screen in Fig. 8 and Fig. 11 (element-278.jpeg)
- **What:** The library the whole course uses is named as if the viewer already knows it.
- **Cause:** `video/src/videos/nlp-why-text-is-hard/script.ts:141`.
- **Fix:** Change the line to "NLTK, Python's natural language toolkit, gives twelve tokens instead…" (adds about 1.5 s).
