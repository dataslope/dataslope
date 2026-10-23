# Nlp-5-History: "How the field got here" (NLP with Python, Unit 5)

Folder `video/src/videos/nlp-history/`, voiced by Hope. Nothing committed.

## Length, voice
- **Length:** 311.8 s (5:12) by `npm run cues` on the voiced timeline (target was about 4.5 min; see "Left undone").
- **Characters voiced:** 4,007 (cap 4,400), 44 beats, **3 takes** (1,423 / 1,314 / 1,270 chars), `eleven_v4_turbo`, voice `hope`. One run, no 429s, no re-voicing.

## Checks
CHECKS_PLACEHOLDER

## Scenes (one line each)
0. Series intro, "How the field got here".
1. **Open** (Unit 4's bridge): three course ideas land on a timeline at 1935, 1948, 1972 (Fig. 1); today is marked and the youngest (54 years) and oldest (91 years) are measured; the figure leans in on the oldest.
2. **Zipf, 1930s:** the lesson's Emma table (Fig. 2) and every one of its 7,079 words on log scales beside a 1/rank line (Fig. 3); the top two almost tie; top 100 words = 60% of the book; 2,739 words appear once.
3. **Shannon, 1948:** the paper's first page, then a book opened at random while his second-order word sample builds word by word (Fig. 4), first ten words read aloud; then the course's next-word counts (Fig. 5): after "the", cat 3, dog 2, guess cat; "an n-gram model".
4. **Turing, 1950:** "Can machines think?" struck for a test; the imitation game (Fig. 6): judge at a terminal, slips travelling to two sealed booths, a person and a machine.
5. **Georgetown–IBM, 1954:** the demo in numbers, 250 words / 6 rules / about 60 sentences (Fig. 7); Dostert's "five, perhaps three, years hence" over 1957–59 against ALPAC 1966's "no immediate or predictable prospect of useful machine translation" (Fig. 8); "A polished demo is not a working system."
6. **ELIZA, 1966:** the course's four exchanges (Fig. 9), "I need" spotted and "a break" reflected back; "just patterns and canned replies"; the secretary quote; the ELIZA effect.
7. **Spärck Jones, 1972:** her 200-document example (Fig. 10): one match one point either way, then her weights, a word in 90 documents weighs 2, in 3 weighs 7; "inverse document frequency, the IDF in TF-IDF".
8. **word2vec, 2013:** man, woman, king, queen on one plane of the 300 dimensions (Fig. 11), the man-to-woman step taken from king lands nearest queen; the six words nearest "excellent", "great" among them (Fig. 12).
9. **Close:** Fig. 1 returns with all seven stories and the counting thread to today; what still sits underneath (tokens, IDF, the next-word guess) and the two warnings; a light runs the thread under the last line. No NextLine.

**Illustrations** (watercolor, `gpt-image-2.5-flare`, Batch API, all four kept on the first draw): `nlp-history-booths` (Turing), `nlp-history-computer` (Georgetown–IBM), `nlp-history-teletype` (ELIZA), `nlp-history-book` (Shannon).

## Facts
- Everything measured comes from `measure.py` → `measurements.json` → `data.ts`, NLTK 3.9.4 / NumPy 2.4.6: the lesson's Zipf, next-word and ELIZA blocks verbatim (each agrees with the page's `block-outputs.json`, keys 420e59ef, 3ed0a4c2, 207d9aa4), Spärck Jones's own rule f(N) − f(n) + 1 with her Cranfield example asserted (90 docs → 2, 3 docs → 7), and word2vec nearest neighbours.
- **Extra NLTK package fetched:** `models/word2vec_sample` (NLTK's pruned GoogleNews vectors, 43,981 words × 300; 49 MB zip) into `$S/nltk_data/models/`, from the same nltk_data gh-pages repo the lessons use. king − man + woman → queen 0.712 (input words excluded, gensim's convention; without excluding them, "king" itself is nearest, 0.799).
- **Not computable, copied from sources (each named in the `script.ts` header):** every date; the Georgetown–IBM counts (250 words, 6 rules, "just over 60" sentences) and Dostert's forecast (Hutchins, AMTA 2004); the ALPAC quotation (p. 32); Shannon's sample text and book-at-random method (BSTJ 1948, Part I §3, checked in the paper's text); Turing's opening question and teleprinter (Mind 1950); the secretary quote (Computer Power and Human Reason, 1976, p. 6); Spärck Jones's rule and example (her paper, read in full text). These live in `data.ts` as sourced constants.
- The word2vec plane (Fig. 11) is a real projection of the four unit vectors onto two directions defined by the words themselves (man→woman, and man→king with its man→woman part removed), labelled "one flat slice of its 300 dimensions". By construction the two arrows are parallel; where queen falls is the measured part.
- Order: chronological, not the lesson's thematic order, because the opening claim is about age; reason in the script header.

## Lesson discrepancies (not fixed)
1. **`interesting-discussions.mdx:232-234`** (and the framing at :183-184): "Read the rightmost column: rank × freq stays in the same ballpark down the list, which is exactly what Zipf's law predicts. The most common word is roughly twice the second, and so on." The block's own output (site and local, identical) is `to 5,239`, `the 5,201`: the top two nearly tie, and rank × freq runs 5,239, 10,402, 14,688, 17,164, 15,890, 18,774, 17,696, 19,752, almost ×4 over eight rows. Zipf's law holds roughly over the whole vocabulary (log–log slope −1.14 over ranks 1–1,000; rank × count 23,400 at rank 10, 25,600 at 100, 15,000 at 1,000) but not at the top of this table. The video says the top is rough and shows the law on all 7,079 words. Same caveat for :178-179 ("about twice as common as the second") as a description of real top ranks.
2. **`interesting-discussions.mdx:327-328`** (footnote): "the weighting is still in the default configuration of every search engine you use" is not verifiable as stated. What is checkable: BM25, the default ranking in Lucene, Elasticsearch and Solr, contains an IDF term. The video says only that search engines "still lean on it".
3. **`interesting-discussions.mdx:164-168`** (soft): "you used a weighting introduced by Karen Spärck Jones in 1972". Her 1972 weight is f(N) − f(n) + 1 with f(n) = ⌈log₂ n⌉, which gives a word in every document a weight of 1, not the course's log(N/df) = 0. The idea is hers; the exact formula the course used came later. The video shows her own rule and example and calls IDF her idea.
4. Minor: `:37-38` "a few dozen Russian sentences"; Hutchins counts "just over 60". Consistent enough; the video says "about sixty".

## Kit suggestions
- `parts.tsx` again copies Kicker, Headline, Mark, Strike, Spot, Wire, InlineArrow, Tick, Tag, Mono from DbDesign-9: a shared `editorial/parts` would save every video ~300 lines.
- `Quote` (parts.tsx): a sourced quotation with a rule and a wrapping credit line; history units need one.
- `timeline.tsx`: a year axis with decade ticks, a "today" mark, year dots and stems; reusable for any history unit.
- `out/Nlp-5-History-batch-stills.mjs`: renders many stills from one bundle in one browser under one queue slot (`renderStill` with a shared `openBrowser`); with ten builders on two slots, one ticket per frame was the bottleneck.

## Left undone
LEFT_PLACEHOLDER
