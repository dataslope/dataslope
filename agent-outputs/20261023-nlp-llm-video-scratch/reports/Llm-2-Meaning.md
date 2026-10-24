# Llm-2-Meaning ("From ids to meaning"): report

Composition `Llm-2-Meaning`, folder `video/src/videos/llm-meaning/`. Unit 2 of
How Large Language Models Work, after embeddings, similarity,
attention-intuition and the-shape-of-a-transformer. Voiced by Drew. Nothing
committed or pushed.

## Length, voice, takes

- **Length:** 391.6 s voiced (6:32; `npm run cues`: 58 beats, 890 words, 136 wpm overall), against the plan's "about 6 minutes". Estimate was 355 s.
- **Characters voiced:** 5,054 of the 5,300 cap, one run, no re-voicing, no `--force`.
- **Takes:** 3 (`takeChars: 1900`, so the two closing beats join take 3 instead of a 169-character take of their own): hook to order-in (1,447 chars, 96.2 s), ruler to weights (1,756), real to next (1,851, 123.1 s). Every boundary cut cleanly; no "no pause" warnings.

## Checks

- Typecheck (`tsc`, folder filtered): clean. ESLint `src/videos/llm-meaning`: clean.
- `check:cues`: clean (the whole package passed at the last run).
- `npm test`: 59 pass, 0 fail (an earlier run failed only on another builder's nlp-history cue, never on this folder).
- `check:sync`: pass, 58 beats, worst +0.04 s (toy, 0:44.4).
- `check:frames`: pass (final run after every edit). 4 illustrations, largest stretch 0.92 at 2x; 12 arrows, worst 0.0 degrees of bend under a head. A pre-voice run failed on two curved arrows (22.6 and 15.4 degrees); they became `PathArrow`s.
- `check:motion`: pass, nothing still for 3 s; longest still 2.5 s (over `set`, `key`/`value` and `top`/`next`). The first run found 12 stretches of 3 to 4.8 s; each now has motion cued to a spoken word (a ring on both dogs at "closeness", the ruler thickening when it is named again, the question outlined at "question", the two figures stepping back at the turn, highlights on "hand over" and "picked", the other weights dimming at "trophy", the query pulsing at "query" and "question", the empty parameter bar drawn at "parameters", and so on). Preview kept as `out/Llm-2-Meaning-preview.mp4`.
- `check:mix` (informational): effects 25.5 LU under the narration (-45.5 against -20.0 LUFS); effects' peak -21.1 dBFS at 0:00.6, the series intro's logo, with nothing under it; speech a median 27.1 dB above the effects where both sound (5th percentile 11.6 dB). Closest moment 6.5 dB at 1:32.3, a tap landing as the order-blind sums appear, a 50 ms reading between words.

## Scenes (14) and figures (23, numbered in order of first appearance)

1. IdsScene: Fig. 1, berry 19772, teeth 19770 and cherry 60225 on o200k_base's number line, with a zoom showing "2 apart" against "40,453 apart"; Fig. 2, the embedding table, one row per id, berry's row as "a few thousand numbers". Watercolor: strawberry and cherries.
2. SpaceScene: Fig. 3, the lesson's five three-number vectors with distance from cat; Fig. 4, the same words as points in a slowly turning cube; the cat/dog sentence; the axis names fade to "?" and "dimension 1,847: no name".
3. OrderScene: Fig. 5, dog bites man and man bites dog as cards, the shuffle, both sums 1.5, 1.5, then the lesson's position signal added slot by slot (dog first 0.9, 0.2; dog last 0.9, 0.4).
4. CosineScene: Fig. 6, short, long, other and opposite from one origin, the ruler's 5.657 against cosine 1.0, the right angle; Fig. 7, the minus-one-to-one scale. Watercolor: compass.
5. SearchScene: Fig. 8, the lesson's five documents on four themes, sorted by cosine to the finance query; top hit 0.998, no shared word.
6. BlindScene: Fig. 9, "the drug is effective" landing on "not effective"; Fig. 10, a second pass reads the top hits; the turn to "it".
7. TrophyScene: Fig. 11, the trophy and suitcase sentences with "it" resolved each way; the definition of attention. Watercolor: trophy and suitcase.
8. QkvScene: Fig. 12, query, key and value; Fig. 13, the lesson's hand-set weights from "it" (trophy 0.722, total 1.0).
9. BlendScene: Fig. 14, the lesson's keys, values and query, scores and weights (0.461), which swap when the query turns to suitcase; Fig. 15, the new vector as a point between the values, moving from 4.849, 3.214 to 3.168, 4.910.
10. HeadsScene: Fig. 16, heads side by side and layers stacked; Fig. 17, 10 tokens as 100 scores growing to 20 tokens as 400.
11. PathScene: Fig. 18, "the cat sat on the mat" as o200k ids, embedding plus position, one block (attention, feed-forward, residuals), then a tower of blocks, x32.
12. ParamsScene: Fig. 19, the mid-sized model's 6.95 billion parameters as one bar (feed-forward 54%); Fig. 20, width and depth.
13. ExpertsScene: Fig. 21, sixteen experts, two lit per passing token; Fig. 22, DeepSeek-V3's 671 billion stored and 37 billion per token. Watercolor: chest of drawers.
14. TopScene: Fig. 23, the last token's vector scored against the vocabulary: four example scores and "128,000 scores"; `NextLine` "choosing the next token".

Illustration ids: `llm-meaning-fruit`, `llm-meaning-compass`, `llm-meaning-trophy`, `llm-meaning-drawers` (all kept on the first draw). The batch sat at 0/4 for an hour, so it was cancelled (`POST /v1/batches/<id>/cancel`, status "cancelling", 0 completed) and the four were generated with the generator's `sync` command, then imported, as the brief allows.

## Facts

Everything on screen comes from `measure.py` (NumPy 2.4.6, tiktoken 0.12.0 o200k_base) via `measurements.json` and `data.ts`, and agrees with the lessons' prepopulated outputs in `lib/generated/block-outputs.json` (checked: distances from cat, both order sums, cosine 5.657 / 1.0 / 0.0, the search's 0.998 / 0.993 / 0.053, the weights 0.722 and 0.461 / 0.297 / 0.242 and output 4.849, 3.214, the parameter split 0.52 / 2.15 / 3.76 / 0.52 = 6.95, 54%).

- Cited, not computed: DeepSeek-V3's 671 billion and 37 billion are the lesson's figures, cited there to the DeepSeek-V3 Technical Report (arXiv:2412.19437); `measure.py` records them as such and computes only the 5.5% share.
- Example, labelled: the four closing scores (cat 3.2, dog 2.1, bird 1.5, rock -0.4) are sampling.mdx's example logits, the next unit's lesson. The figure says so; no real model's scores are shown.
- Drawn without numbers: the embedding-table rows, the "real model's vector", the score grid and the heads' mini patterns are schematic cells with no values, because no real model's weights are on screen. The heads' patterns and the experts' routing are fixed schematic choices, commented as such in the code.
- Not shown, on purpose: the lesson's position-added sums (see below).
- "ID" is written in capitals in the narration so Drew spells it; the screen keeps the lessons' lowercase "id".

## Lesson discrepancies (not fixed)

1. `content/courses/how-llms-work/embeddings.mdx:128-135` ("Position has to be added", second code block). `positioned()` adds `[0.0, 0.1 * i]` to each word and then **sums** the result, so both sentences print the same `[1.5 1.8]`; the page's own prepopulated output (block `232d906d`) shows the two identical lines under "With position added:". A sum of word-plus-slot vectors is the sum of the words plus the sum of the slots, whatever the order, so the demonstration shows the opposite of the prose around it ("the model does not get order for free" and the fix it is meant to illustrate). The video shows the positioned vectors one by one instead (dog first 0.9, 0.2; dog last 0.9, 0.4), which is where the sentences really differ, and never shows the second sum. `measure.py` asserts both sums are equal.
2. Minor: `embeddings.mdx:6-7` calls token 11241 `" token"`. In o200k_base, the course's tokenizer, `" token"` is 6602 and 11241 is `" />"`; 11241 is `" token"` in r50k/p50k (GPT-2/GPT-3). It matches tokens.mdx's "hand-built vocabulary" (line 52), so it is consistent inside the course, but a reader checking it in tiktoken's o200k_base would not find it. Not used in the video.
3. Note, not an error: the-shape-of-a-transformer.mdx's mid-sized model (vocab 128,000, width 4,096, 32 layers, feed-forward 14,336) is Llama-3-8B's shape, but the lesson counts two feed-forward matrices and full-size key/value projections, so its 6.95 billion is a simplified count, not that model's 8.0 billion. The video calls it "the lesson's mid-sized model" and names no real model.

## Kit suggestions

- `PathArrow` (parts.tsx): an arrow along a rounded polyline that draws itself and shows its head only once the tip is on the straight last segment. A drawing curved arrow otherwise trips `check:frames` while the tip is inside a corner (it did here, 15 to 35 degrees, before this). Belongs beside `arrowHead` in `components/arrow.ts` or the editorial kit.
- `VectorCells` / `TokenChip` (parts.tsx): a vector as a row of tabular number cells, and a token chip that shows a leading space as a faint dot. Every LLM and NLP video draws these.
- `Swap` (AttentionScenes.tsx): a number that inks its new value in place with a brief flash, for a value that changes on a word (avoids a counter showing false intermediate values).

## Left undone

Nothing required. The video runs about 30 s past the plan's 6-minute target at 5,054 characters (Drew read at 136 wpm against the estimate's 150); shortening it would mean cutting narration and re-voicing, which I did not do. The intro title is the plan's, unchanged. `measure.py` needs `TIKTOKEN_CACHE_DIR` pointed at a cache holding o200k_base (as the brief sets it); no extra NLTK data was fetched.
