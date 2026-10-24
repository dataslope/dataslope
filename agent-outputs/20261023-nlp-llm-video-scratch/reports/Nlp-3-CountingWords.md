# Nlp-3-CountingWords ("What counting reveals"): report

Unit 3 of Natural Language Processing with Python, folder `video/src/videos/nlp-counting-words/`, narrated by Hope. Nothing committed or pushed.

## Length, voice, takes

- **Length:** 6:33.9 (393.9 s, from `npm run cues`), 54 beats, 856 words, 130 wpm overall. Target was about 6 min; the voice ran slower than the estimate (330 s).
- **Characters voiced:** 4,778 (cap 5,300), in **3 takes** (1,648 / 1,755 / 1,375 characters), every beat voiced once. No `--force`, no re-voicing: the script was final before the first recording.
- Voice `hope`, model `eleven_v4_turbo`. `narrate` placed 18 beats' first words from the sound rather than the character times (moves of 0.09 to 0.41 s, its normal onset placement) and warned of no boundary without a pause; `check:sync` confirms the result.

## Checks

| Check | Result |
| --- | --- |
| `tsc --noEmit` (my folder) | clean |
| `eslint src/videos/nlp-counting-words` | clean |
| `npm run check:cues` | clean for my folder |
| `npm test` | 59/59 pass (at the last run) |
| `check:sync` | pass, all 54 beats within ±0.12 s; **worst +0.05 s** (`together`, at 4:42.9) |
| `check:motion` | pass, **longest still 2.8 s** (19 stretches of 2 s+, 42 s in all). The first voiced run found 14 stretches of 3 s or more (worst 5.0 s); each now has a word-cued change (see below) |
| `check:frames` | pass: 4 illustrations, largest stretch 0.90 at 2x; no arrows; every cue names its occurrence |
| `check:mix` (informational) | effects **20.4 LU under** the narration (-45.1 against -24.7 LUFS); effects' peak -21.1 dBFS at 0:00.6 (the series intro's logo, nothing under it); where both sound (14.2 s), speech a median 23.8 dB above the effects, 5th percentile 10.0 dB. Closest: 9.1 dB at 3:12.6, the VBP chip's pop on the spoken "VBP" (it was 5.1 dB at -29 dBFS; both tag pops are now -33) |

Motion fixes after voicing (all cued to spoken words): Fig. 3's row labels arrive together and each is highlighted as it is read; the 39 hapax squares turn one at a time while "two thousand seven hundred" is said; "a long, thin tail" washes the tail; the Zipf note builds in three cued lines; Fig. 6 starts on "tail"; the 10,000-word segment pulses on "before"; finished figures step back on "tell" / "book", "Still", "Over" and "But"; the engineer sentence's words arrive as they are read and each leaves for its row as it is named; the WordNet note's second half arrives on "otherwise"; Fig. 14's rows build on "machine learning"; the longer n-gram bars swell on "every word you add"; and the closing chart steps back after the bridge so the last 2.8 s still holds `NextLine`.

## Scenes (10, 15 figures, every one numbered)

1. **CountScene** (Part 1, "Counting words"): the lesson's fox-and-dog text as 30 tiles; FreqDist tallies them into 13 rows, each bar growing as its tokens are counted (Fig. 1); `most_common(5)` and its printed result; "13 different out of 30 in all".
2. **DiversityScene**: distinct over total, built as said; the lesson's 0.29 and 1.0 texts (Fig. 2); Emma's diversity on the first 100, 1,000, 10,000 words and the whole book, 0.73 to 0.04 (Fig. 3); "Only compare texts of the same length."
3. **TailScene**: Emma's 7,079 words as 100 squares, the 39 hapax squares turning red (Fig. 4); the 20 most common words with the top ten's 22% bracketed and the other 7,059 squeezed into a tail, "Zipf's law" (Fig. 5); vocabulary growth with +188 new words in the last 10,000 (Fig. 6).
4. **StopScene**: Emma's top six with every word (to, the, and, of, i, a) against stopwords removed (mr, emma, could, would, mrs, miss), one scale (Fig. 7); "Raw frequency rewards the commonplace."
5. **FishScene** (Part 2, "Tagging words"): "fish" as NN and VBP in the lesson's two sentences, the neighbours the tagger reads, a definition of part-of-speech tagging (Fig. 8), fisherman watercolor.
6. **PennScene**: "The tall man reads books." tagged DT JJ NN VBZ NNS with each meaning (Fig. 9); the first-letter legend; the engineer sentence's words gliding into noun, adjective, verb and adverb rows (Fig. 10).
7. **LemmaScene**: the runners sentence, its lemmas without tags (running, eaten untouched), its tags, and its lemmas with them (be, run, have, eat) (Fig. 11); "Tag, then lemmatize."
8. **WindowScene** (Part 3, "Counting word pairs"): New York / machine learning / not good; what an n-gram is; a red window sliding over "the quick brown fox jumps" into 4 bigrams and 3 trigrams; words − n + 1 (Fig. 12).
9. **OrderScene**: "the food was good" against "the food was not good" as sets and as bigrams (Fig. 13); the lesson's machine-learning bigrams and Emma's cast, Mr Knightley 299, Mrs Weston 256, Mr Elton 229 (Fig. 14), hats watercolor.
10. **SparseScene**: the share of Emma's distinct n-grams seen once, 39 / 73 / 90 / 97 / 99% for n = 1 to 5, the sweet spot bracketed (Fig. 15); sparsity; the bridge and `NextLine` "Next: turning text into features".

Opens on `<SeriesIntro course="Natural Language Processing with Python" unit="Unit 3" title="What counting reveals" />` (the plan's title, kept). Bridge in: "Once your words are clean, the next thing to do is count them." Bridge out: "But a model wants numbers, not lists of words. So next, we'll turn text into features."

**Illustrations** (`illustrations.json`, watercolor, `gpt-image-2.5-flare`, Batch API, quality low, transparent; one batch, all four accepted first time, no redraws): `nlp-counting-words-tally` (video-icon), `nlp-counting-words-novel`, `nlp-counting-words-fish` (the model added an anonymous, featureless fisherman, which shows "fish" as both verb and noun; kept), `nlp-counting-words-hats`.

## Facts

Every count, ratio, tag and n-gram on screen comes from `measure.py` → `measurements.json` → `data.ts`, run with `$S/pyenv` (NLTK 3.9.4) and the scratch NLTK data (punkt_tab, stopwords, wordnet, averaged_perceptron_tagger_eng, gutenberg; nothing else fetched). `measure.py` executes each lesson block the video shows **verbatim** and exits non-zero unless its stdout equals what the site's Pyodide printed for that block in `lib/generated/block-outputs.json` (all 12 blocks match, plus interesting-discussions' Emma block). Emma is loaded exactly as interesting-discussions.mdx loads it; everything else on Emma is the lessons' own calls applied to it (FreqDist, distinct/total, `hapaxes()`, `stopwords.words("english")`, `ngrams`). Two things the lessons do not compute, both stated in the script header: bigrams over Emma are counted only where both words are not stopwords (so no pair is joined across a removed word), and n-gram sparsity is measured on Emma because the lesson's own sparsity block does not show it (below).

Nothing on screen is typed by hand. The narration rounds where a speaker would (161,600 as "a hundred and sixty-one thousand", 7,079 as "about seven thousand", 2,739 as "more than two thousand seven hundred", 22.1% as "over a fifth", 38.7% as "nearly two in five", 0.286 said and shown as 0.29, the sparsity shares to whole percents); the screen shows the measured values.

## Lesson discrepancies (not fixed)

1. **`frequency-distributions.mdx:344-347`**: "With stopwords, the most frequent word is "the" (7 times), with "a" close behind". The block prints `[('the', 7), ('text', 4), ('a', 3), ('words', 3), ('user', 3)]` (page and local run agree): "text" is second with 4, and "a" is tied third with 3. The next sentence lists the content words as "text", "words", "search", "user", "engine"; the output's order is text 4, words 3, user 3, search 2, engine 2.
2. **`ngrams.mdx:297-299`**: "Watch the "that repeat" column collapse as `n` grows ... By `n=4` almost every window is unique". The block prints 7, 9, 8, 7 n-grams "that repeat" for n = 1 to 4 (at n = 4, 7 of 14 distinct 4-grams repeat): no collapse, because its four lines are near-copies of each other. On Emma the claim holds (39% of distinct unigrams seen once, 73% of bigrams, 90% of trigrams, 97% of 4-grams, 99% of 5-grams), which is what the video shows.
3. **`interesting-discussions.mdx:178` and `:233-234`** (Unit 5's lesson, found because its Emma block is the one this video loads): "The most frequent word tends to be about twice as common as the second" and "The most common word is roughly twice the second". Its own block prints `to` 5,239 and `the` 5,201 (ratio 1.01), and the rank × freq column it asks readers to watch runs 5,239, 10,402, 14,688, 17,164 over the first four ranks rather than staying level.
4. Minor, **`frequency-distributions.mdx:202`**: "The single most frequent word ("the") often accounts for ~7% of all tokens". True of the Brown corpus the zipf-law chart uses (69,971 of about a million), but in the course's own Gutenberg text, Emma, the top word is "to" and "the" is 3.2% of tokens. The video does not repeat the 7%.

## Kit suggestions (built locally in `parts.tsx`)

- **`Tile`, `flow`, `columns`**: a token on a mono card (marks, tint, dim, glide to a new place), with row-wrapping and column-aligned layout. Every NLP and LLM video draws tokens; the kit has nothing for them.
- **`TagChip` and `FAMILY`**: a Penn tag chip coloured by first letter (N teal, V purple, J orange, R green, other grey), with an optional gloss.
- **`CodePanel`**: a Python listing on gray-50 with per-line ink-in (db-why-design's `Listing` is SQL-only).
- The usual per-video re-implementations: `Kicker`, two-ink `Headline` (em gap), `Marked`, `Bracket`, `Drift`, `Spot`, `Count`, `HBar`. They differ only cosmetically between videos and could live in `editorial/ui.tsx`.
- A `--words` option for `npm run cues` (I used a scratch `words.mjs`) to print each word's voiced time: it is what fixing a `check:motion` stretch needs.

## Left undone

Nothing required. Scratch files are in `$S/Nlp-3-CountingWords/` (logs, `stills.sh`, `checks.sh`, `words.mjs`); renders in `video/out/Nlp-3-CountingWords-*` (stills, `-preview.mp4`, `-dry.wav`, mix WAVs).
