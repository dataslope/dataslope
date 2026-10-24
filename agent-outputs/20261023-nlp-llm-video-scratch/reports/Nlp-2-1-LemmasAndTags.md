# Nlp-2-1-LemmasAndTags: "Lemmatizing needs the part of speech"

Deep dive for Natural Language Processing with Python, Unit 2, folder
`video/src/videos/nlp-lemmas-and-tags/`. Hope reads it. There is no series intro and no
`<NextLine>`. It is voiced, and every check passes.

## Length and voice

- **Length:** 147.1 s from `npm run cues` (2:27, 4,414 frames), 336 words at 137 wpm. That is
  a little over "about 2 minutes" but under the character cap.
- **Characters voiced:** 1,784 of the 1,900 cap. 19 beats in 1 take (`takes/nlp-lemmas-and-tags/take-1.*`).
- Nothing was re-voiced and `--force` was never used. `narrate --dry-run` now reports 0 beats to voice.

## Checks

| Check | Result |
| --- | --- |
| typecheck (my folder) | clean |
| eslint `src/videos/nlp-lemmas-and-tags` | clean |
| `check:cues` | clean for my folder |
| `npm test` | 59 pass, 0 fail |
| `check:frames` | pass. 2 illustrations, largest stretch 0.76. 7 arrows, 0.0° bend under any head |
| `check:sync` | pass. Worst beat is `porter` at +0.06 s; every other beat is within ±0.03 s |
| `check:motion` | pass on the second run. Longest still is 2.5 s (at 0:40.3, 1:09.3) |
| `check:mix` | narration -24.6 LUFS. Effects -49.5 LUFS, which is **24.9 LU under**, with peak -26.1 dBFS at 1:06.3. Speech is a median 24.0 dB over the effects (5th percentile 11.1 dB) |

The first `check:motion` run failed on three stills:
- 0:01.3–0:04.3 (`hook`): fixed by inking the first call on "lemmatizer" and lighting its word on "running".
- 0:37.0–0:40.0 (`list`): fixed by inking the "part of speech" column head, highlighted, as it is said.
- 0:58.5–1:03.3 (`rules`/`check`): fixed by lighting the word chips on "the word" and the listed forms on "every guess".

Those edits added highlights only and changed no layout. `check:frames` ran just before them.

## Scenes

1. **HookScene** (`hook` to `lookup-in`).
   - Fig. 1: `lemmatize("running")`, `("ran")` and `("was")` return running, ran and wa. The default `, pos="n"` writes itself into each call on "otherwise".
   - The magnifier spot comes in with "one word at a time, never the sentence".
   - Fig. 2: "the running of the race", with running marked as a noun. Fig. 1's running turns blue: "already a dictionary form".
2. **LookupScene** (`list` to `tag-in`). Fig. 3 is a table whose columns are WordNet's steps:
   1. irregular forms,
   2. suffix rules (with "noun -s, verb -ed -ing" inked as said),
   3. "In WordNet?",
   4. result.

   It traces six lookups: ran as a verb, was as a verb, better as an adjective, was as a noun, running as a noun and ran as a noun. Words WordNet rejects become dashed ghosts. The rows show ran → run, was → be, better → good, was (noun) → wa ("Washington, the state"), running staying running, and ran coming back unchanged.
3. **SentenceScene** (`tagger` to `close`).
   - Fig. 4 is the pos-tagging lesson's sentence in five rows: words, then Penn tags (the letters after the first fade on "first letter"), then WordNet n/v/r, then lemmas, then Porter stems.
   - Fig. 5 is the first-letter legend (J → a, V → v, R → r, else → n).
   - The lemmas be, run, have and eat light up as Porter's were, had and eaten are named.
   - It closes on "Tag first, then lemmatize." with the tags spot.

**Illustrations:**
- `nlp-lemmas-and-tags-magnifier`: a magnifying glass over one yellow block.
- `nlp-lemmas-and-tags-tags`: three blank luggage tags in blue, green and red.

Both were right on the first draw.

The batch (`batch_6adb336d…`, created 10:14 UTC) sat at 0 of 2 done for 3 h 45 min. I cancelled it and ran the approved `sync` fallback (about $0.01), then `--import`.

## Facts

Every tag, lemma, stem and lookup step comes from `measure.py`, with NLTK 3.9.4 and the pinned punkt_tab, perceptron tagger and wordnet data.
- It runs two lesson blocks verbatim and checks them against `block-outputs.json`:
  - the stemming-and-lemmatization lemma block;
  - pos-tagging's "POS tagging makes lemmatization accurate" block.
- It asserts its values equal the unit videos' own: nlp-cleaning-text's default and POS lemmas, and nlp-counting-words' runners tags and lemmas.
- **The lookup is re-done step by step in `trace()`**, from NLTK's own exception map, rule table and lemma index. It is asserted against `lemmatize()` and `_morphy()` for every word traced, including all 10 tokens of the sentence.
- **Order of the steps:** the review described the lookup as "suffix rules, then a dictionary check, then an exceptions list". NLTK 3.9.4's `_morphy` checks the exception list *first*, in place of the rules, then checks the dictionary. The video follows the library, and the script header says so.
- **better → good:** the adjective list gives "good, well", and better, good and well are all WordNet adjectives. `lemmatize()` returns the shortest, and good ties well at four letters and wins because it comes first. The narration says "the shortest one wins" and the screen shows all three survivors; the tie-break is noted in the script header.
- **One extra call:** Porter's stems of the runners sentence (the lessons never stem it).
- Nothing on screen is typed by hand.

## Lesson discrepancies (not fixed)

- `content/courses/natural-language-processing-python/stemming-and-lemmatization.mdx`, lines 38 and 116–117, say the lemmatizer's result "is always a real word".
  - `lemmatize()` returns its input unchanged when WordNet has no entry: `lemmatize("xyzzy")` is "xyzzy" and `lemmatize("The")` is "The".
  - `lemmatize("was")` is "wa", which WordNet holds only as "WA", the abbreviation for Washington state.
  - The page's own block prints the wa result.

## Kit suggestions

- **`Chip` `content` prop** (my `parts.tsx`): draws a node inside a chip while the width still follows the text. I used it so a Penn tag's letters after the first can fade.
- **A code call that writes in its default argument** (`Call` in `HookScene.tsx`): the hidden `, pos="n"` widens into the call and the closing parenthesis moves out. This is useful anywhere a default argument is the point.
- **`trace()` in `measure.py`**: a reusable, asserted walk through WordNet's `_morphy`.

## Undone

Nothing.
- Scratch files: `video/out/Nlp-2-1-LemmasAndTags-stills.mjs` (renders several stills from one bundle) and the check WAVs and preview in `video/out/`.
- My kit was pruned to what the scenes use. The red "bad" tone is removed, so red is only the figure-number and headline accent.
