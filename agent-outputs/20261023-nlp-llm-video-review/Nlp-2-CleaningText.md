# Nlp-2-CleaningText (0-451.5 s, whole video)

## Verdict
- A strong, accurate unit. Every count on screen matches what the lesson's code returns (11 pieces, 16 tokens, 5 pieces against 3 sentences, 6 strings folding to 2, 198 stopwords, 5 of 12 removed). Figures are big and legible (nothing under 21 px), Figs. 1-17 run in order, and every reveal lands on its word.
- Pacing is comfortable for 7.5 minutes: about 2.5 words/s on average, 0.55-1.0 s between beats, 1.6 s at scene changes, and every scene's finished state holds well before its cut. Only the short bridge lines go above 3 words/s.
- Biggest problem: Fig. 8 shows code that does not produce what is drawn under it. Rows 2 and 3 are lowercased, but their labels leave out `.lower()`, and the narration never says the text was lowercased.
- Colour twice says the opposite of the narration. The default tokenizer's row in Fig. 5 stays red ("bad") while Hope says "Neither one is wrong". In Fig. 3, the piece " Wasn't that great?" is flagged red, although it is the same sentence Punkt returns.
- Explanations run thin in two places. The order rule ("strip after you tokenize") gets 6 s and nothing on screen shows it. "was → wa" is shown but never explained. Checking the builder's claims against the frames: the report holds up, with one exception. LemmaScene's "Dictionary spot" is the same dictionary-and-shears image as StemScene's (finding 9), and scenes 2, 3, 5 and 7 have no spot at all.

## Deep-dive candidates
1. **Lemmatizing with a part of speech** (stemming-and-lemmatization, "Lemmatization: looking up the dictionary form" and its callout "The number-one lemmatization bug").
   - Where the unit rushes it: 391.7-414.3 s, beats `noun` and `pos`. That is 22 s for "it treats every word as a noun", then "tell it the part of speech". The video never says where the part of speech comes from.
   - Why the unit cannot slow down: POS tagging has its own lesson later in the course, and this is already the longest unit.
   - What a 2-minute video would show:
     - Why the noun default exists: "the running of the race".
     - How the WordNet lookup works: suffix rules for each part of speech, then a dictionary check and an exceptions list. That is how ran → run, was → be and better → good.
     - Why "was" becomes "wa": the noun rule strips the -s, and "wa" is a WordNet entry.
     - One real sentence run through `pos_tag`, its tags (VBG, VBD, JJR) mapped to v/a/n, then lemmatized, set beside Porter's stems of the same sentence.
2. **Inside Porter's suffix rules** (stemming-and-lemmatization, "Stemming: chopping with the Porter algorithm").
   - Where the unit rushes it: 337.3-377.7 s, beats `porter` to `key`. Fig. 14 shows only inputs and outputs. "with an i where the y was" and "collapse into organ" are stated, never shown.
   - Why the unit cannot slow down: the argument has to reach lemmas. Showing each rule step would double the scene.
   - What a 2-minute video would show:
     - The rules firing in order on one word at a time: studies (-ies → -i), studying (-ing off, then y → i), happiness (-ness off), organization (-ization → -ize → off).
     - The length condition that keeps "run" or "sing" whole.
     - Why the same rules over-stem "organ" and can never reach "ran".
     - A search query "studying" matching a document word "studies" through the shared key "studi".
3. **The order of the cleaning steps** (text-normalization, "Punctuation stripping" and its callout "The order trap, again", plus tokenization's callout "The usual order: sentences first, then words").
   - Where the unit rushes it: 228.3-241.7 s, beats `look` and `order`. "Strip it after you tokenize, never before, or the sentence tokenizer loses its clues" gets one 6 s beat. It depends on Punkt, which was shown 2 minutes earlier.
   - Why the unit cannot slow down: the punctuation scene already runs 52 s, and the demonstration needs a second pass over the text.
   - What a 2-minute video would show:
     - Fig. 8's line sentence-tokenized after stripping (one run-on) against before stripping.
     - Lowercase before `[a-z]+`, or the capitals vanish.
     - Lowercase before the stoplist, because the list is lowercase and "The" would slip through.
     - Stem or lemmatize last, because stoplists hold whole words.
     - The resulting pipeline as one strip: sentences → words → case → punctuation → stopwords → stems.

## Findings
### 1. [P1] accuracy — Fig. 8's code labels don't produce the rows under them
- When: 211.0-247.2 s, beats `translate`, `regex`, `look`, `order` (frames element-424.jpeg, element-484.jpeg).
- What: the source line is "Hello, World! It's a GREAT day... isn't it?".
  - Row 2 is labelled `w.translate(table)` and shows `hello world its a great day isnt it`.
  - Row 3 is labelled `re.findall(r"[a-z]+")` and shows `hello world it s a great day isn t it`.
  - Both rows are lowercase, while row 1 (`w.isalpha()`) keeps `GREAT`. The lesson lowercases first (`text.lower()`, text-normalization.mdx:150 and :155). Neither the labels nor the narration say so.
  - Run as labelled on the line shown, `[a-z]+` would return "ello", "orld" and so on.
- Why it matters: a viewer learns that `translate()` lowercases text and that `[a-z]+` matches capitals. Part of each row's "different answer" is really the missing lowercase step, which muddies the comparison the scene exists to make.
- Cause: `video/src/videos/nlp-cleaning-text/PunctScene.tsx:156-157` (the `call` strings omit the lowercasing).
- Fix: label the rows as the lesson runs them: `w.translate(table)` with a small `on text.lower()` line inked under it on "second", and `re.findall(r"[a-z]+", text.lower())`. If you re-voice, add "lowercased first" to the `translate` beat.

### 2. [P2] confusion — Fig. 5 keeps the default tokenizer red through "Neither one is wrong"
- When: 121.5-145.7 s, red from beat `default` through `task` (133.7-139.3 s) (frames element-270.jpeg, element-282.jpeg).
- What: `#`, `NLP`, `@`, `dataslope`, `:` and `)` take the "bad" tone, the same red Figs. 1 and 3 use for broken pieces. They stay red while the narration says "Neither one is wrong. The right tokens are the ones that keep the units your task cares about."
- Why it matters: the screen calls word_tokenize wrong at the moment the narration's moral says it is not.
- Cause: `video/src/videos/nlp-cleaning-text/TweetScene.tsx:87-96` (`badA` tones are set once and never released).
- Fix: either mark the splits with the neutral yellow `marks` instead of the `bad` tone, or add a `{ at: neitherAt, tone: "plain" }` step to `tonesA`, so both rows read as valid on "Neither".

### 3. [P2] confusion — a correct sentence is flagged red in Fig. 3
- When: 98.5-114.5 s, beat `naive` ("and never notices the question mark") (frames element-198.jpeg, element-226.jpeg).
- What: the fifth split piece, " Wasn't that great?", turns red, its "?" lights up, and a tag reads "? never seen as an end". Here the "?" ends the text, so missing it costs nothing: the piece is exactly Punkt's third sentence, which sits directly below it in blue.
- Why it matters: viewers count three red pieces as failures and then see the "failure" repeated as a clean sentence. The real defect of the naive split goes unshown: the pieces lose their periods ("He smiled" against "He smiled.").
- Cause: `video/src/videos/nlp-cleaning-text/PeriodScene.tsx:132-136` (the `bad` tone and `hot` on the last piece) and `:145-147` (the tag).
- Fix: leave the last chip plain and drop the tag. Better still, tag the "He smiled" chip "period lost". If re-voicing, change "and never notices the question mark" to "and throws the periods away".

### 4. [P2] explanation — the order rule is asserted, not shown
- When: 235.7-241.7 s, beat `order`, followed by only 0.8 s before `stop-in` (frames element-480.jpeg, element-484.jpeg).
- What: "And strip it after you tokenize, never before, or the sentence tokenizer loses its clues." On screen, the "!", "..." and "?" in the source line wash blue and a sentence inks below. Nothing shows the sentence tokenizer losing anything, and "it" in "Strip it after you tokenize" has no antecedent on screen.
- Why it matters: it is a rule with a reason ("loses its clues") that the viewer has to take on trust. It also leans on Punkt from 2 minutes earlier.
- Cause: `video/src/videos/nlp-cleaning-text/PunctScene.tsx:151` (only the `CLUE` washes) and `:182-190` (the note). `script.ts:198-201`.
- Fix: on "clues", ink a two-chip inset at NOTE_Y + 70: `sent_tokenize(text)` giving its sentences, against `sent_tokenize(stripped)` giving one run-on, with the counts measured in measure.py. Make the note "Strip punctuation after you tokenize". Raise `order`'s `pauseAfter` to 1.2.

### 5. [P3] explanation — "was → wa" is unexplained and contradicts "real word"
- When: 400.5-430.9 s, beats `noun` and `choose` (frames element-804.jpeg, element-858.jpeg).
- What: "was comes back as wa" turns red with no reason given. Fig. 16 then says "Lemmatize when the root has to be a *real word*", next to a lemmatizer column that holds "wa".
- Why it matters: the viewer cannot tell why a dictionary lookup produced a non-word, and the closing rule seems to contradict the figure beside it.
- Cause: `video/src/videos/nlp-cleaning-text/LemmaScene.tsx:113` (a `bad` tone only, with no tag). `script.ts:280`.
- Fix: add a `Tag` under "wa" on the word "wa": "read as a plural noun". Add "with the right part of speech" to the Lemmatize card.

### 6. [P3] confusion — the isalpha narration names one casualty of six
- When: 199.3-210.2 s, beat `alpha` (frame element-408.jpeg).
- What: all six non-letter tokens fade on "letters": `Hello,`, `World!`, `It's`, `day...`, `isn't`, `it?`. Only `a` and `GREAT` survive. The narration and the only tag mention World alone.
- Why it matters: the scene undersells its own point (2 of 8 words survive), and the five unexplained fades look like a separate effect.
- Cause: `video/src/videos/nlp-cleaning-text/PunctScene.tsx:95` (all six go at once) and `:177-179` (one tag). `script.ts:183`.
- Fix: add a count to row 1, "2 of 8 kept", inked on "lose".

### 7. [P3] pacing — the fox sentence is gone before it can be read
- When: 263.5-266.5 s, beats `fox` and `removed` (frames element-528.jpeg, element-532.jpeg).
- What: the 12-token sentence builds at 3 frames a chip, and its stopwords start dropping on "drop" (about 266.5 s). It is fully on screen for about 2 s and never read aloud.
- Why it matters: the viewer meets "five of its twelve tokens" before having read the twelve.
- Cause: `video/src/videos/nlp-cleaning-text/StopScene.tsx:53` and `:101-103`. `script.ts:216` (`pauseAfter: 0.5`).
- Fix: raise `fox`'s `pauseAfter` to 1.5 so the row sits a beat, or have the narration read it ("Filter this one: the quick brown fox...").

### 8. [P3] confusion — Fig. 13 subtracts "never" beside "never: False"
- When: 309.5-328.6 s, beat `custom` (frame element-643.jpeg).
- What: the formula reads "NLTK's list − not no nor never but". Fig. 11, on the same screen, has just shown `never False`, which the narration called out ("Never, oddly enough, isn't"). This is the lesson's list, and the builder flagged it. The point here is that the video sets the contradiction side by side.
- Why it matters: an attentive viewer is asked to remove a word the video has just shown is not on the list.
- Cause: `video/src/videos/nlp-cleaning-text/TrapScene.tsx:249-251` (renders `CUSTOM.keep` verbatim).
- Fix: ghost the `never` chip in the formula (opacity 0.4, struck through), or render only the keep-words that are actually on the stoplist.

### 9. [P3] other — the lemma scene's spot shows shears, the stemming image
- When: 389.0-420.5 s, beats `lemma` to `know` (frame element-824.jpeg; compare element-762.jpeg).
- What: LemmaScene reuses `nlp-cleaning-text-dictionary`, the book with pruning shears from StemScene, shown large in the middle of the frame. Shears mean "chop the suffix", which is the opposite of this scene's "look the word up".
- Why it matters: the picture argues for the method the scene is contrasting.
- Cause: `video/src/videos/nlp-cleaning-text/LemmaScene.tsx:97` (same id as `StemScene.tsx:102`).
- Fix: draw a book-only spot (an open dictionary with a bookmark) for LemmaScene, keep the shears in StemScene, and use both on Fig. 17's last card.

### 10. [P3] other — Fig. 17 forgets punctuation
- When: 436.0-451.5 s, beat `close` (frame element-902.jpeg).
- What: "Normalize threw away the capitals". The unit spent 53 s (194.5-247.2 s) on punctuation under the same Normalization kicker.
- Why it matters: the summary drops the step that had the most failure cases.
- Cause: `video/src/videos/nlp-cleaning-text/CloseScene.tsx:23`. `script.ts:297`.
- Fix: change the card to "the capitals and punctuation". If re-voicing: "The capitals and commas."

### 11. [P3] spacing — headline gaps between swaps
- When: 59.6-62.0 s, beat `token` (frame element-121.jpeg); 370.6-371.8 s, beat `key` (frame element-742.jpeg).
- What: the old headline goes out and the new one comes in 1-2 s later. Only the kicker sits at the top in between.
- Why it matters: a visible hole in the page at the moment a definition is spoken.
- Cause: `video/src/videos/nlp-cleaning-text/SplitScene.tsx:129-130` (out `eachAt`, in `tokenAt - 4`) and `StemScene.tsx:100-101` (out `keyFrom`, in `keyAt - 6`).
- Fix: start each new headline on the old one's out frame (`at={eachAt}` and `at={keyFrom}`), keeping each `turnAt` as is.

### 12. [P3] spacing — the hook's first 4 s show only the kicker and the scissors
- When: 4.6-8.5 s, beat `hook` (frame element-014.jpeg).
- What: "Every text pipeline starts with one small decision" plays over a blank page. The headline arrives only on "where" (about 9 s).
- Why it matters: the opening line has nothing to look at.
- Cause: `video/src/videos/nlp-cleaning-text/SplitScene.tsx:129` (headline at `whereAt - 4`) and `:134` (Fig. 1 label at `decisionAt - 4`).
- Fix: ink the faint Fig. 1 sentence from `hookFrom + 8`, so the text being decided about is there from the first word.

### 13. [P3] spacing — the split pieces' leading spaces read as uneven padding
- When: 93.0-114.5 s, beats `naive` and `punkt` (frame element-226.jpeg).
- What: " Lee earned 2", " He smiled" and " Wasn't that great?" keep `split(".")`'s leading space, drawn as an extra blank inside the chip's left edge.
- Why it matters: it looks like a layout slip rather than part of the string.
- Cause: `video/src/videos/nlp-cleaning-text/PeriodScene.tsx:119-125` (renders `SENTENCES.naive` raw).
- Fix: draw the leading space as a faint "␣", which also makes the point that split leaves junk behind.

### 14. [P3] spacing — Fig. 15's pos labels are ragged and one arrives early
- When: 403-430.9 s, beat `pos` (frames element-824.jpeg, element-858.jpeg).
- What: the `pos="v"` and `pos="a"` labels sit at x = 660, 660, 698, 641 and 679, because each follows its chip's width. At 412 s, `pos="a"` floats in an empty slot about 1 s before "good" appears.
- Why it matters: a ragged column, and a label without its value.
- Cause: `video/src/videos/nlp-cleaning-text/LemmaScene.tsx:129` (x depends on chip width) and `:115` (`posAt` for better is `adjectiveAt`, the chip is `rightAt.better`).
- Fix: use x = COL[2] + max chip width + 14 for every label, and posAt = rightAt[l.word] + 2 for all of them.

### 15. [P3] spacing — folding chips fly over the lower() label
- When: 160.5-161.5 s, beat `fold` (frame element-322.jpeg).
- What: the travelling `THE`, `the` and `Dog` chips pass straight across the `lower()` arrow and its label, covering them mid-flight.
- Why it matters: brief clutter at the moment the operation is named.
- Cause: `video/src/videos/nlp-cleaning-text/CaseScene.tsx:116-121` (straight lerp X0 → TX through the arrow lane) and `:129-132`.
- Fix: put the label under the arrow (top: midY + 8). Or dim the arrow and label to 0.3 over `foldingAt` to `foldDone`.

### 16. [P3] explanation — code notation in figure labels is never read
- When: 264-283 s (Fig. 10, `t not in stop`, frame element-556.jpeg); 305-328.6 s (Fig. 13, `(base - keep) | add`, frame element-643.jpeg).
- What: a loop variable and Python set operators that the narration never mentions.
- Why it matters: they add notation a beginner cannot parse, and Fig. 13's formula row already says the same thing in words.
- Cause: `video/src/videos/nlp-cleaning-text/StopScene.tsx:94` and `TrapScene.tsx:231`.
- Fix: use `[t for t in tokens if t not in stop]` for Fig. 10, and drop Fig. 13's `LabelEnd`.

### 17. [P3] confusion — "a number, a symbol" with neither on screen
- When: 64.5-68.8 s, beat `token` (frame element-130.jpeg).
- What: "Usually a word, but sometimes a number, a symbol, or a punctuation mark". Only `plan`, `,` and `!` light up, because the sentence has no number or symbol.
- Why it matters: two of the four kinds named have no example.
- Cause: `video/src/videos/nlp-cleaning-text/SplitScene.tsx:105-106`. `script.ts:116`.
- Fix: cut "a number, a symbol" from the narration. Or let the next scene pay it off by lighting "2.5" in Fig. 4 as "a number token".
