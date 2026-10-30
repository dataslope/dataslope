# Nlp-2-1-LemmasAndTags (2:27)

## Verdict
- The video is accurate and cleanly built. Every word, tag, lemma, stem and lookup step on screen matches `measurements.json` and the two lessons, and every cue lands on its word. I found no overlap, no clipping, no text under 19px, no stray black SVG text and no hyphen widening.
- The biggest gap is the payoff. Fig. 4 never shows the runners sentence lemmatized *without* tags, which is the contrast the lesson prints. So "It needed the part of speech" is asserted for this sentence rather than shown on it. "Runners becomes runner", which needs no tag, is also named first among the wins.
- The script header says the video assumes no unit video, but the jargon is left raw: the Penn Treebank tags (NNS, VBD, VBG, plus five more on screen), "J" for adjective, and WordNet, which is never described aloud.
- Pacing is comfortable: 137 wpm, and every gap between beats is 0.55 s or longer. Only `alone` (3.54 w/s) runs fast.
- The rest is polish: a label that lands before its figure, an unexplained tie, an unexplained blue, and two chips that nearly touch.

## Findings

### 1. [P2] explanation: Fig. 4 never shows the sentence lemmatized without tags
- When: 118-147 s, beats `lemmas`, `porter`, `close` (element-128.jpeg, element-135.jpeg, element-146.jpeg).
- What: Fig. 4's rows are word, Penn tag, WordNet, lemma and Porter stem.
  - The lesson's block prints two lines for this sentence, "Naive (default noun) lemmas" and "POS-aware lemmas" (`pos-tagging.mdx:298-302`). Its prose is that contrast: "Compare the two lines. Without POS, running and eaten survive unchanged" (`:308`).
  - The video drops the untagged line and sets Porter's stems in its place. Porter's stems answer a different question: stemming versus lemmatizing, not with versus without a part of speech.
  - The narration names "Runners becomes runner" first among the results. The untagged call gives runner too (`measurements.json` `sentence.naive`: The runner were running and they had eaten well .).
  - The four words the tags actually rescue (were, running, had, eaten) are never set beside their untagged result.
  - The Porter row also shows "the" against the lemma row's "The", and nothing says that Porter lowercases.
- Why it matters: this before-and-after is the point of the video. Without it, a viewer can leave believing that the tag is what turned runners into runner.
- Cause: `video/src/videos/nlp-lemmas-and-tags/SentenceScene.tsx:20` (`ROW_Y` has five rows and no untagged row; `Sentence.naive` exists in `data.ts:309` and is never drawn), `SentenceScene.tsx:190-218`, and `script.ts:165`.
- Fix:
  - Add a row labelled "no tag" drawing `S.naive`. Put it at `ROW_Y` 650 and move lemma and Porter to 736 and 822; the Porter row then ends near 885 px, clear of the tags spot.
  - Ink the new row on "Without", and mark were, running, had and eaten as they are said.
  - Re-voice `lemmas` as: "Now lemmatize with those. Without tags, were, running, had and eaten come back unchanged. With them, were becomes be, running run, had have, and eaten eat."
  - Keep `porter` after it.

### 2. [P2] explanation: Penn Treebank tags, "J" and WordNet are never glossed
- When: 97-117 s, beats `tags` and `letter` (element-100.jpeg tile, element-135.jpeg); also 59.8-67.6 s, beat `check`.
- What:
  - "It gives each word a Penn Treebank tag: NNS for runners, VBD for were, VBG for running." Neither the tagset nor any one tag is explained, and the row also shows DT, CC, PRP, VBN and RB with no gloss.
  - "J is an adjective": the sentence has no adjective, so no J tag appears anywhere, and nothing says Penn writes adjectives as JJ. J reads as arbitrary.
  - WordNet appears in the kicker at 0.6 s but is first spoken at 63.2 s ("checked against WordNet"), and nothing says it is the dictionary the lemmatizer looks words up in.
  - The script header (`script.ts:10`) says the video "assumes no unit video".
- Why it matters: the first-letter step only makes sense to a viewer who knows that NNS is a noun and VB* is a verb. Without that, it is three opaque codes cut short.
- Cause: `video/src/videos/nlp-lemmas-and-tags/script.ts:155`, `:160` and `:131`; `SentenceScene.tsx:164-176` (tag chips with no gloss).
- Fix:
  - `tags`: "It gives each word a Penn Treebank tag: NNS, a plural noun, for runners; VBD, a past-tense verb, for were; VBG, an ing form, for running."
  - `letter`: "J, as in JJ, is an adjective."
  - `check`: "checked against WordNet, the dictionary behind the lemmatizer."
  - Optionally, a 22px `Tag` under NNS, VBD and VBG as each is said ("plural noun", "past verb", "ing form"). The gap between rows leaves about 45 px for it. Take each one out at `firstAt`.

### 3. [P3] confusion: Fig. 2's "a noun" lands before its phrase, under "one word at a time, never the sentence"
- When: 24.9-26.2 s, beat `race` (element-025.jpeg, element-032.jpeg).
- What:
  - The "a noun" tag inks on "noun" at 24.94 s. The phrase chips only arrive on "the running of the race" at 26.10 s, and the gray "one word at a time, never the sentence" label leaves at about 25.8 s.
  - For about 0.8 s the screen reads "one word at a time, never the sentence / a noun". Then "a noun" floats alone over empty space.
  - Once everything is in place, "a noun" sits on the same baseline as Fig. 1's "already a dictionary form". That tag ends 26 px short of Fig. 2's first chip, so the two tags from two figures read as one line.
- Why it matters: for a moment the screen says the sentence itself is a noun, and in the finished frame the two figures' notes run together.
- Cause: `video/src/videos/nlp-lemmas-and-tags/HookScene.tsx:176` (`at={nounAgainAt}`), while the phrase inks at `raceAt` (`:170`) and the label leaves at `raceAt - 10` (`:179`); `RIGHT_X = 1090` (`:24`).
- Fix: cue the tag at `raceRunningAt` (the second "running", 26.22 s), and move `RIGHT_X` to 1140. The phrase then ends near 1700, which is still clear of the frame edge.

### 4. [P3] confusion: blue in Fig. 4's lemma row is unexplained and reads as "changed"
- When: 119-147 s, beats `lemmas` to `close` (element-135.jpeg, element-146.jpeg).
- What:
  - runner, be, run, have, eat and well turn blue; The, and, they and "." stay white.
  - well is unchanged but blue, while The is unchanged and white.
  - Blue means "WordNet has this lemma" (`FOUND`), carried over from Fig. 3's "In WordNet?" column. But Fig. 3's result column is never blue, and the narration never says what the blue means here.
  - The natural reading, that blue means the lemmatizer changed the word, is contradicted by well.
- Why it matters: a viewer reading the colors gets a rule that the figure breaks.
- Cause: `video/src/videos/nlp-lemmas-and-tags/SentenceScene.tsx:199` (`tones` on `FOUND[i]`); `data.ts:324`.
- Fix: tone only the lemmas that differ from their token (`S.aware[i] !== S.tokens[i]`), which is exactly the set the narration lists, or drop the tone and keep the yellow marks.

### 5. [P3] explanation: "the shortest one wins", but good and well tie
- When: 66.4-68.5 s, beat `check` (element-067.jpeg tile, element-088.jpeg).
- What: better's row keeps better, good and well, all blue, and the result is good. good and well are both four letters, and nothing on screen or in the narration says why good wins. `lemmatize()` takes `min(key=len)`, which keeps the first; only the script header notes this.
- Why it matters: the rule just stated seems not to decide the one row where it has to.
- Cause: `video/src/videos/nlp-lemmas-and-tags/script.ts:131`; `LookupScene.tsx:208`.
- Fix: end `check` with "the shortest one wins, and on a tie, the first one listed." Or add a 22px `Tag` "first of the two shortest" beside good in the result column at `shortestAt + 8`, which fits before the frame edge at x 1700.

### 6. [P3] spacing: "they" and "have" nearly touch in the lemma row
- When: 125-147 s, beats `lemmas` to `close` (element-135.jpeg, element-146.jpeg).
- What: each lemma is centered on its token's column. "have" is one character wider than "had", so it spreads 8.4 px to each side and leaves 5.6 px to "they", against 14 px between every other pair of chips. It reads as one chip, "they have".
- Why it matters: it is the only place where the row's even rhythm breaks, and it breaks on a word the narration is highlighting.
- Cause: `video/src/videos/nlp-lemmas-and-tags/SentenceScene.tsx:110` (`centred`), used at `:195`; `GAP = 14` (`:16`).
- Fix: in the lemma and stem rows, use `x = Math.max(cols[i].x, centred(l, i))`, so a chip wider than its token starts at the token's left edge. "have" to "eat" then keeps 14 px, because eat is centered inside the wider "eaten" column.

### 7. [P3] other: Fig. 5's legend reads "a adjective", and Fig. 4's "WordNet" row label is ambiguous
- When: 111-147 s, beats `letter` to `close` (element-135.jpeg, element-146.jpeg).
- What: the legend sets the code letter and the name side by side: "J → a adjective", "R → r adverb". The first line reads as the article "a" before "adjective". Fig. 4's third row is labelled "WordNet", but its chips are part-of-speech codes, and in Fig. 3, "In WordNet?" meant "is this an entry".
- Why it matters: it is a small reading stumble, and it sits on the step that the whole mapping depends on.
- Cause: `video/src/videos/nlp-lemmas-and-tags/SentenceScene.tsx:232-238` (bare code letter followed by the label); `:177` (`rowLabel(2, firstAt, "WordNet")`).
- Fix: draw the legend's code as the same 28px chip the WordNet row uses, so "a" is plainly a code. Relabel the row "WordNet pos", which fits the 220 px before the chips.

### 8. [P3] explanation: the fix is never shown as a call
- When: 0-35 s (Fig. 1) against 118-147 s (Fig. 4).
- What: Fig. 1 writes the default `pos="n"` into each call, which sets up `lemmatize("running", pos="v")` → run. No frame ever shows a call with a part of speech, and Fig. 4 shows only rows of data. A viewer who saw the bug as code never sees the code that fixes it: the lesson's `lemmatize(w, to_wordnet_pos(t))`, or the stemming lesson's `pos="v"`.
- Why it matters: the hook teaches the bug in code, and the takeaway leaves the viewer to work out the code themselves.
- Cause: `video/src/videos/nlp-lemmas-and-tags/SentenceScene.tsx:190` (row label "lemma"); nothing in `close` draws code.
- Fix: on `close`, ink one code line in Fig. 1's face below Fig. 4 (y about 920, which is free): `lemmatize("running", pos="v")  →  run`, cued to "part of speech".

### 9. [P3] pacing: `alone` is the fastest beat and carries the motivating idea
- When: 17.1-22.7 s, beat `alone` (element-018.jpeg to element-021.jpeg tiles).
- What: 20 words in 5.6 s (3.54 w/s), with a 0.6 s gap into `race`. This is the idea the whole video resolves: the lemmatizer sees one word, never the sentence.
- Why it matters: the premise goes by at the video's top speed.
- Cause: `video/src/videos/nlp-lemmas-and-tags/script.ts:102`.
- Fix: split the beat in two: "It sees one word at a time, never the sentence." with `pauseAfter: 0.5`, then "So it can't tell what job that word is doing." The cues on "one word" and "sentence" stay in the first beat.
