# Nlp-1-WhyTextIsHard: report

**Composition** `Nlp-1-WhyTextIsHard`, folder `video/src/videos/nlp-why-text-is-hard/`. Natural Language Processing with Python, Unit 1 (what-is-nlp, the-nlp-pipeline). Narrator Hope. Intro title kept: "Why text is hard".

## Length, voice

- **Length:** 5:17.8 (317.8 s, 9,526 frames) from `npm run cues` on the voiced timeline. That is about 50 s over the 4.5-minute target; the cap was met on paper (estimate 4:34), but Hope reads this script at 129 words a minute, slower than the estimate's 147. No beats were cut after voicing, so no voiced character went to waste; cutting to 4.5 minutes would mean dropping about six beats.
- **Characters voiced:** 3,863 of the 4,000 cap, in **3 takes** (1,409 + 1,709 + 745), each recorded once. Nothing re-voiced, no `--force`.

## Checks

| Check | Result |
| --- | --- |
| typecheck (my folder) | clean |
| eslint `src/videos/nlp-why-text-is-hard` | clean |
| `check:cues` | clean for my folder (other folders' failures are theirs) |
| `npm test` | 59/59 pass |
| `check:frames` | PASS_FRAMES |
| `check:sync` | pass, worst +0.06 s (`real`, 2:34.7); 49 beats |
| `check:motion` | PASS_MOTION |
| `check:mix` | PASS_MIX |

## Scenes

1. **Intro**: `<SeriesIntro>` "Natural Language Processing with Python, Unit 1 / Why text is hard".
2. **HookScene**: the lesson's opening sentence (Fig. 1) with its three questions hung under "can't", "Dr." and "$2.5M,"; the same sentence as 62 character cells (Fig. 2) with the three characters flagged; word_tokenize's 16 tokens set under the characters they came from (Fig. 3). Ribbon watercolor.
3. **AmbiguityScene**: Fig. 4, three rows (lexical "bank", structural telescope sentence, referential trophy sentence), each named on its word, two readings each. Telescope and trophy watercolors.
4. **MessScene**: Fig. 5, the lesson's five kinds of mess with an example each and the later step each needs.
5. **SplitScene**: Fig. 6, the lesson's sentence: `.split()` gives 8 pieces (can't glued, punctuation attached), `word_tokenize()` 12 tokens, each drawn under the piece it came from.
6. **LayersScene**: Fig. 7, the lesson's layers (characters, tokens, normalized, tagged, counts) on three words of the pipeline sentence, then "understands" struck out for "counts, matches, transforms" and the spam filter.
7. **RulesScene**: Fig. 8, rules against learning as the lesson's table, NLTK's stopword list as the example rule, the course's side marked.
8. **PipelineScene**: Fig. 9, the lesson's sentence through its five printed steps, every token kept in its column (13, 13, 11, 6, 6), drops struck, changes highlighted, step 2 as its one line of Python.
9. **HalvesScene**: Fig. 10, cleaning (conveyor watercolor, five step pills, optional ones dashed) against analysis (counting, tagging, building features), the goal's arrow back to cleaning; two steps trade places on "order".
10. **OrderScene**: Fig. 11, "The The THE end is near" lowercased-then-filtered (end, near) against filtered-then-lowercased (the, the, the, end, near), NLTK's stopword card, "no error, just wrong", and the bridge: `<NextLine>` "Next: cutting text into tokens", with a cursor hopping between the tokens to the end.

**Illustrations** (batch, all four accepted first time, no redraws): `nlp-why-text-is-hard-ribbon`, `nlp-why-text-is-hard-telescope`, `nlp-why-text-is-hard-trophy`, `nlp-why-text-is-hard-conveyor`. Largest stretch at 4K 0.91.

## Facts

Everything on screen comes from `measure.py` (NLTK 3.9.4, the pinned data in `$S/nltk_data`, no extra package fetched) through `measurements.json` and `data.ts`. `measure.py` rebuilds each printed line of the lessons' four code blocks and checks it against `lib/generated/block-outputs.json`; all four match the site's Pyodide output exactly. `data.ts` also refuses to load if any number the narration speaks (62, 8, 12, 13, 11, 5 dropped, 6) stops matching the measurement.

Things computed by the video rather than printed by a lesson block, all in `measure.py`: the opening sentence's 62 characters and its 16 word_tokenize tokens (the lesson asks "how many words" and runs nothing on it); the three-word layers example (pos_tag on the lowercased tokens: noun, verb, verb; the sentence's most common cleaned words); NLTK's stopword count (198) and first words.

One wording choice: the lesson's lexical example is "lead"; the video uses the lesson's other example, "bank", because spoken aloud "lead" (the metal) and "lead" (to guide) are pronounced differently, so the narrator would have resolved the ambiguity the scene is showing. Noted in the script header.

The lemmatized row shows "running" unchanged (the lemmatizer reads every word as a noun unless told otherwise, as the lesson's output shows); the narration does not comment, since that is Unit 2's subject.

## Lesson discrepancies (not fixed)

1. `content/courses/natural-language-processing-python/the-nlp-pipeline.mdx:278`: the figure caption says "Lowercase before removing stopwords and all three thes go; reverse it and one survives." The block below it prints `Order B (filter then lowercase): ['the', 'the', 'the', 'end', 'near']` (site output in block-outputs.json, and measure.py): all three survive, because none of "The", "The", "THE" matches the lowercase stopword list.
2. Same file, lines 271-273: "The block below runs the *same three operations*, lowercase, remove stopwords, keep alphabetic". The block runs two (lowercase, remove stopwords); there is no `isalpha()` step in it.
3. Same file, lines 331-334: "Order B leaves "The" and "THE" behind". It leaves all three tokens, and the printed list shows them lowercased ('the' three times), not as "The" and "THE".
4. Same file, line 481 (a quiz explanation): "filtering stopwords before lowercasing leaves capitalized variants like "The" and "THE" in the output." The output is lowercased afterwards; what survives is three 'the's.

## Kit suggestions

- `parts.tsx` `Chip`: a token as a program holds it (monospace in a rounded box), with pop-in, red/green states, strike-to-ghost, highlight sweep, partial red characters, plus `chipWidth`/`rowXs`. Every NLP and LLM video draws tokens; one shared chip would keep them consistent.
- `parts.tsx` `CurvedArrow`: a cubic arrow drawn on from its start, head from `arrowHead()` on the full samples, shown as the line completes.
- `parts.tsx` `Count`: a number inked on its word in tabular figures with a unit after it (the review's "counter that shows nothing until it is true").
- `parts.tsx` `Py` / `CodeStrip`: a one-line Python highlighter and listing strip (db-why-design has the SQL equivalent).
- `out/Nlp-1-WhyTextIsHard-stills.mjs` (after Llm-1's): many stills from one bundle; worth a `scripts/stills.mjs` honouring `VIDEO_ENTRY`.

## Left undone

LEFT_UNDONE
