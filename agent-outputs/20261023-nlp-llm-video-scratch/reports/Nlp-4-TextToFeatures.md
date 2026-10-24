# Nlp-4-TextToFeatures: report

Composition `Nlp-4-TextToFeatures`, folder `video/src/videos/nlp-text-to-features/`. Natural Language Processing with Python, Unit 4, "From text to features" (the plan's title, kept). Narrator Hope. I committed nothing; the coordinator's snapshot commits already carry the folder.

## Length and voice

- **Length:** 410.4 s (6:50), 49 beats, 927 words, 136 wpm overall (`npm run cues`).
- **Voiced:** 5,016 characters (cap 6,200), 4 takes (1,286 / 1,589 / 1,512 / 629 characters), all on `eleven_v4_turbo`, voice `hope`. No `--force`, no beat voiced twice.
- One seam fix, free: the take ran "It is not good... positive." together, so the cutter left the spoken "positive." at the end of `naive`, and `check:sync` heard speech 0.49 s before `wrong`'s cue. I moved "positive." from the start of `wrong` to the end of `naive`. The joined take text is unchanged, so `narrate --recut` re-cut the kept takes with no API call.

## Checks

All run on my private entry through the render queue, on the final code.

| Check | Result |
| --- | --- |
| Typecheck (my folder) | clean |
| Lint (my folder) | clean |
| `check:cues` | clean |
| `npm test` | 59/59 pass (no failures anywhere at the last run) |
| `check:frames` | pass: 4 illustrations, largest stretch 0.69 (none drawn past its pixels); 9 arrows, 0.0° bend |
| `check:sync` | pass: worst +0.03 s (`binary`, 2:29.7) |
| `check:motion` | pass: longest still 2.8 s (`tie`, `rule`, `blind`); 19 stretches of 2 s or more, 43.0 s in all. The first run failed with 11 stills of 3 s or more; I fixed each with cued motion (a reading underline under the review, chips swelling as they are named, cell and column glows, panels stepping back for a turn, the lexicon filling the page and then stepping aside, the first flag review built during the rule's own beat) |
| `check:mix` (informational) | narration −24.7 LUFS, effects −45.8 LUFS: **21.2 LU under**; effects peak −21.1 dBFS at 0:00.6 (the intro's logo); speech a median 25.1 dB above the effects where both sound (5th percentile 10.8 dB); closest moment 4:50.0 at 8.6 dB (the gauge's `el-pop` under "describe") |

Preview with sound: `video/out/Nlp-4-TextToFeatures-preview.mp4`.

## Scenes (13, Fig. 1 to 18)

1. **MenuScene** (Part 1, opens on Unit 3's line "a model wants numbers, not lists of words"): Fig. 1, the first bag-of-words document as a token list and as its count row; Fig. 2, tokenize then four optional steps as a menu; the lesson's one question, with "noise, drop it / signal, keep it". Spot: toolbox.
2. **TwoPipelinesScene**: Fig. 3, the lesson's review through the topic pipeline (stopwords struck and dropped, leaving plot, good, acting, brilliant; "how it feels: good") and the sentiment pipeline (keeps not and but, adds five bigrams, (not, good) marked).
3. **TasksScene**: Fig. 4, four rows of the lesson's task table, the spoken cell marked in each; Fig. 5, an ablation (change one step, with it / without it, measure on your own task); the lesson's safe default.
4. **BagScene** (Part 2): Fig. 6, one document's chips tipped into the bag, the bag shakes, its tally comes out (mid-page, then slides right); Fig. 7, the three documents, the sorted 9-word vocabulary as columns, the document-term matrix row by row. Spot: bag.
5. **BinaryScene**: Fig. 8, the lesson's spam as count vector (1 3 0 0 1) and binary vector (1 1 0 0 1).
6. **BlindScene**: Fig. 9, what the bag throws away: order (dog bites man = man bites dog, computed), mostly zeros, no meaning; then the turn to TF-IDF ("the": 2 in every row).
7. **CountsScene** (Part 3, kicker "Weighting words"): Fig. 10, the TF-IDF lesson's three documents and their counts; the "the" column framed.
8. **IdfScene**: Fig. 11, idf = ln(N/df) with each symbol said and glossed; the = 0, cat = 1.10, bars. Spot: balance.
9. **MorphScene**: Fig. 12, Fig. 10's table turning into TF-IDF in place; worked cat (1/6 x 1.10 = 0.18) and the (2/6 x 0 = 0); Doc 1's four-way tie, "on" included; headline turns into "Frequent here, rare elsewhere."
10. **DefaultScene**: Fig. 13, textbook idf against scikit-learn's `TfidfVectorizer()` default (the 1.00, cat 1.69; Doc 1 bars, the 0.51 against 0.43); the turn to Part 4. Spot: gauge.
11. **LexiconScene** (Part 4): Fig. 14, the lesson's 7 + 7 lexicon; Fig. 15, the naive counter on the lesson's three reviews, "It is not good" positive, struck, "never read" under "not".
12. **FlagScene**: Fig. 16, the negation rule (flag on: not, no, never, n't; flag off: . ! ? , ; but); Fig. 17, three reviews token by token: "it is not good" built as the rule is described, then −1 negative, +1 positive (flipped signs shown), 0 neutral.
13. **LimitsScene**: Fig. 18, sarcasm ("oh great, another delay" scores +1, struck), context (unpredictable in brakes / in a thriller), missing words (0, neutral); the baseline's three virtues; what learned models keep; the bridge: "IDF, 1972 · counting word pairs, 1948", then `NextLine` "how the field got here". Spot: gauge.

**Illustrations** (`illustrations.json`, watercolor, `video-icon`): `nlp-text-to-features-toolbox`, `nlp-text-to-features-bag`, `nlp-text-to-features-balance`, `nlp-text-to-features-gauge`. All four looked right first time; no redraws. The Batch API job (`batch_6adafb18a3888190ab08f5f3194bcb90`, submitted 06:13) sat at 0 of 4 for an hour, so I cancelled it at 07:15 and generated with `sync` (about $0.02), then `--import`.

## Facts

Everything on screen comes from `measure.py` (Python 3.13, NLTK 3.9.4, NumPy 2.4.6, scikit-learn 1.8.0, NLTK data from the scratch folder: punkt_tab and stopwords only, nothing new fetched) → `measurements.json` → `data.ts`. `measure.py` runs each lesson block's code as written and compares its printed text with `lib/generated/block-outputs.json`; all eight blocks agree (pipeline features; bag-of-words vocabulary, the DataFrame's cells, count and binary vectors; tf-idf idf values and Doc 1's ranking; both sentiment blocks). The TF-IDF table is also checked against scikit-learn to 1e-12, as in the TfIdf video's `measure.py`.

- Computed beyond the printed blocks, from the lessons' own code: "dog bites man" against "man bites dog" (the lesson's limitations list, counted with its Counter), and "Oh great, another delay." and "The brakes were unpredictable" through the lesson's negation-aware `sentiment()` (+1 positive, 0 neutral). The sarcasm line is the lesson's; the brakes sentence is the video's own, built from the lesson's "unpredictable is bad for a car's brakes".
- Not computed, and shown as text the lesson states: the task table's cells (lesson prose), "tens of thousands of words" (the lesson's limitations list; panel b of Fig. 9 draws doc1's real row against a schematic strip of empty columns with no number on it), and the bridge's dates (the history lesson's footnotes: Spärck Jones 1972, Shannon 1948).
- The bag-of-words lesson prints its matrix through pandas, which the pinned environment lacks; `measure.py` builds the same rows with Counter and checks them cell by cell against the page's HTML table.

## Lesson discrepancies (not fixed)

1. `content/courses/natural-language-processing-python/rule-based-sentiment.mdx:478` (quiz explanation) and `:413` (test description) say the RESET set "stops 'not great, but terrible' from having the 'not' wrongly flip 'terrible'". Under the lesson's own code the flip of "great" already sets `negate = False`, so that sentence scores −2 with or without any reset tokens; `measure.py` records it (`sentiment.resetCheck`: withReset −2, withoutReset −2). The reset only changes a score when a negation meets no sentiment word before the boundary (for example "Not really, it was good": +1 with the reset, −1 without). The test still passes; its stated reason is wrong. The video states the rule without using that example.
2. `rule-based-sentiment.mdx:235` says "good" and "phenomenal" both score +1, but "phenomenal" is in neither of the lesson's lexicons, so its classifier scores it 0. Minor (the sentence reads as hypothetical); not used in the video.

## Kit suggestions

Built locally in `parts.tsx` / `tfidf.tsx`, likely useful to the other NLP and LLM videos:

- **Token chips** (`Chip`, `ChipRow`, `TokenRow`, `TokenCol`): a word token that can be struck, dropped (its gap closes by flex), highlighted or tinted by polarity, and a row of chip columns with a centred badge under each, laid out by flex so nothing depends on measured text widths.
- **`NumCell`**: a number in a cell tinted by its value, with an optional outline.
- **`tableGeo` / `DocTable`**: the TfIdf video's document-term table with its vertical position as a parameter, so it can sit under a kicker and a two-line head.
- **`Reveal`**: words inside a line that fade in on a cue while holding their place (estimation's `Slot` is the same idea), and the `Kicker` / two-ink `Headline` pair, now copied into at least three video folders.

## Left undone

Nothing required. Two small things a reviewer might pick up:

- Fig. 17's flag scene and Fig. 15's naive rows leave the right quarter of the page empty beside the verdicts.
- `check:mix`'s closest moment (8.6 dB at 4:50.0) is the gauge's pop under "describe". I left it at −30 dBFS; turning it down to about −33 would be a one-number change.
