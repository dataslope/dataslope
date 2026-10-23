# Nlp-2-CleaningText: report

Composition `Nlp-2-CleaningText`, folder `video/src/videos/nlp-cleaning-text/`, Unit 2 of Natural Language Processing with Python, "Cleaning text" (the plan's title, kept). Voiced by Hope. Not committed.

## Length, voice, takes

- **Length:** 7:31.5 (451.5 s by `npm run cues`; 63 beats, 1,002 words, 133 wpm overall).
- **Characters voiced:** 5,582 (cap 6,200), in **3 takes** (1,804 / 1,710 / 2,068 characters; `takeChars: 2100` so the closing scene shares the last part's take instead of a 271-character take of its own). One voicing run, nothing re-voiced, no `--force`.
- Initialisms: "U.S." and "W.H.O." are written as said (the screen keeps the lesson's `US` / `WHO`); measured in the take, "U.S.," runs 0.76 s and "W.H.O.," 1.09 s, so both were spelled out rather than read as "us" / "who".

## Checks

| Check | Result |
| --- | --- |
| `tsc` (folder) | clean |
| `eslint src/videos/nlp-cleaning-text` | clean |
| `check:cues` | clean for this folder ("every word cue names a phrase its beat says") |
| `npm test` | 59/59 pass |
| `check:frames` | CHECK_FRAMES |
| `check:sync` | pass, worst beat +0.08 s (`look`, 3:48.3); every beat within ±0.12 s |
| `check:motion` | CHECK_MOTION |
| `check:mix` | CHECK_MIX |

`out/Nlp-2-CleaningText-preview.mp4` is the half-size preview from the last `check:motion`.

## Scenes

1. **SplitScene** (Tokenization): the lesson's sentence split at the spaces (Fig. 1, 11 pieces, comma and mark stuck on, negation hidden) against `word_tokenize` (Fig. 2, 16 tokens, each piece lit with the tokens it became); "A token: one meaningful unit of text." Scissors spot.
2. **PeriodScene**: one mark, three jobs; `split(".")` breaks into 5 pieces (Fig. 3) while Punkt returns 3 sentences (Fig. 4). The line inks word by word as Hope reads it.
3. **TweetScene**: one tweet, two tokenizers (Fig. 5); "Keep the units your task cares about."
4. **CaseScene** (Normalization): six cased strings fold into two (Fig. 6, the chips slide and merge); what lowercasing throws away, US, WHO, Apple (Fig. 7); noise for counting, signal for names. Clay spot, large beside Fig. 6, then moved to the corner for Fig. 7.
5. **PunctScene**: three punctuation recipes, three answers (Fig. 8: `isalpha()`, `translate()`, the regex); strip after tokenizing.
6. **StopScene** (Stopwords): NLTK's 198 English stopwords (Fig. 9); the fox sentence filtered, 5 of 12 removed, 7 content words close ranks (Fig. 10). Sieve spot.
7. **TrapScene**: negation words on the list, `never` not (Fig. 11); the review filtered to "movie good" (Fig. 12); the lesson's custom list keeps "not good" (Fig. 13).
8. **StemScene** (Stems and lemmas): Porter's stems in three groups: run/runs/running and the missed ran, studi/happi, organ over-stemming (Fig. 14). Dictionary-and-shears spot.
9. **LemmaScene**: WordNet lemmas with and without a part of speech (Fig. 15); stem or lemmatize (Fig. 16). Dictionary spot.
10. **CloseScene**: what each step threw away, four cards with the four spots (Fig. 17); "Next: what counting words reveals" (`NextLine`).

Illustrations (`illustrations.json`, watercolor, `gpt-image-2.5-flare`, quality low, transparent, Batch API; the batch returned in about a minute, all four kept on the first draw, no redraws): `nlp-cleaning-text-scissors`, `nlp-cleaning-text-clay`, `nlp-cleaning-text-sieve` (video-icon), `nlp-cleaning-text-dictionary`.

## Facts

Every token, stem, lemma, count and filtered sentence on screen comes from `measure.py` → `measurements.json` → `data.ts` (NLTK 3.9.4, Python 3.13.16, the pinned punkt_tab, stopwords and wordnet data). `measure.py` runs each of the 13 lesson blocks' `starterCode` verbatim and exits non-zero unless its printout matches the page's prepopulated output in `lib/generated/block-outputs.json` (set printouts compared order-free, since string hashes are salted per process); all 13 match. It then makes the same calls directly.

Not printed by a lesson block, handled as follows:
- **The review against the custom stoplist** ("not good", Fig. 13): the lesson builds the custom list and prints its membership, but never filters a sentence with it. `measure.py` makes that one call with the lesson's list and the lesson's review; the script header says so.
- **Per-token stopword flags** for the fox sentence and the review: computed in `measure.py` (the blocks compute them inside a list comprehension).
- **Glosses** ("the country / the pronoun", "the health organization / the question word", "the company / the fruit") are the lesson's own words, typed in `data.ts`.
- **"Porter, 1980"** is the lesson's date ("a set of suffix-stripping rules from 1980"), a quoted constant in `data.ts`, not a computed value.
- No other NLTK data was fetched.

## Lesson discrepancies (not fixed)

1. `content/courses/natural-language-processing-python/stemming-and-lemmatization.mdx:244-248`: the prose says "mice" and "feet" defeat the stemmer "while a lemmatizer with a dictionary can" handle them, but the block it describes (lines 228-239) lemmatizes with `pos="v"`, and its own printed table (the page's prepopulated output too) shows `mice → mice` and `feet → feet` in the lemma column. They become `mouse` / `foot` only as nouns (`lemmatize("mice")`, the default). The video avoids that table.
2. `content/courses/natural-language-processing-python/tokenization.mdx:155-161` (mermaid): `"Dr. Lee earned 2.5 million. He smiled.".split(".")` is shown as four fragments; Python returns five, the last an empty string `''`. (The runnable block's text ends in "?", so its 5 pieces are right; the video uses the block.)
3. `content/courses/natural-language-processing-python/stopwords.mdx:335` and the challenge's `KEEP` (line 414) subtract `"never"` from the stoplist "so sentiment survives", but `never` is not on NLTK's English list (the lesson's own block at line 192 prints `is 'never' a stopword? False`), so that subtraction does nothing; the custom list has 197 words, not 196. Harmless; worth a clause.

## Kit suggestions (built locally in `parts.tsx`)

- **Token chips** (`Chip`, `rowLayout`, `chipWidth`): a string in the code face in a rounded box, sized from its length because JetBrains Mono's advance is a fixed 0.6 em, so rows can slide, merge and drop out without measuring the DOM. Tones (plain / bad / good) mixed over time, highlighter marks, a ghost state, strike, and a run of characters inked red. The NLP and LLM token videos could share it.
- **`RawText`**: a quoted string in the code face with highlighter boxes on character ranges (with a brief swell) and a karaoke read, each word inking from faint to full as it is spoken. A thin underline that grows while a line is read does not register as motion at `check:motion`'s sample size; the word-by-word ink does.
- **`LabelEnd`**: the right end of a figure label, the call that made the figure in the code face, then a count inked on its word.
- `Kicker`, `Headline`, `Mark`, `pulse` repeat db-why-design's `parts.tsx`; they could move to the kit with `Fade`.

## Left undone

Nothing.
