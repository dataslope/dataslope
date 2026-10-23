# Llm-2-1-AttentionScore ("How one attention score is computed"): report

Composition `Llm-2-1-AttentionScore`, folder `video/src/videos/llm-attention-score/`. A deep dive for How Large Language Models Work, Unit 2, made to embed at attention-intuition.mdx ("Query, key, value" and "Doing it properly, with real vectors"). Narrated by Drew. It has no series intro and no bridge. Nothing committed or pushed.

## Length, voice, takes

- **Length:** 146.9 s (2:27) from `npm run cues`: 25 beats, 334 words, 136 wpm overall. The brief asked for about 2 minutes, so this is about 27 s long. The estimate was 131.5 s.
- **Characters voiced:** 1,846 sent, under the 1,900 cap. One run; no `--force` and no re-voicing.
- **Takes:** 1. I set `takeChars: 1900` so the two recap beats did not become a 198-character take of their own. The cut was clean, with no "no pause" warnings.

## Checks (all through my entry and the render queue)

- Typecheck (`tsc`, filtered to my folder) and ESLint on `src/videos/llm-attention-score`: clean.
- `check:cues`: clean.
- `npm test`: 59 pass, 0 fail. An earlier run failed in my folder: `Math.atan2` in BlendScene tripped the arrowhead guard. It now uses `Math.atan(y / x)`.
- `check:frames`: pass. 3 illustrations, largest stretch 0.67 at 2x. 9 arrows, worst bend 0.0 degrees under a head. The first run crashed on a `-Infinity` cue default in `Cells`; that is fixed.
- `check:sync`: pass. 25 beats, worst +0.02 s (hook, 0:00.6).
- `check:motion`: pass. Nothing is still for 3 s. Longest still is 2.5 s (0:04.0 to 0:06.5, over hook and ask). Preview kept as `out/Llm-2-1-AttentionScore-preview.mp4`.
- `check:mix` (informational): narration -20.5 LUFS, effects -48.1 LUFS, so effects sit 27.6 LU under. Effects peak -23.1 dBFS at 0:48.2. Where both sound, speech is a median 26.1 dB above the effects (5th percentile 10.6 dB). Closest moment: 11.6 dB at 2:14.7, a 50 ms reading.

## Scenes (5) and figures (11, numbered in order of first appearance)

1. **QuestionScene.** Fig. 1 is the lesson's trophy sentence, with arcs from `it` to trophy and suitcase; trophy's arc turns red on "trophy should win". Fig. 2 shows `it`'s embedding (blank cells) splitting into a query, a key and a value. The vectors start as six blank cells, collapse to two on "tiny", and the lesson's numbers ink in on "Two numbers". Art: the unit's trophy (copied).
2. **DotScene.** Fig. 3 draws the query and the three keys as arrows. Fig. 4 writes out each dot product (`1.0 × 1.0 + 0.1 × 0.2 = 1.02`, then 0.40, then 0.11), lighting the matching cells as each product is spoken. The column is named "Dot product" on the word. Cosine is shown as "the same sum, on arrows shrunk to length one", with the length-one arc drawn and `it`'s short key stretched out to it and then let go ("Attention keeps the lengths"). Art: `llm-attention-score-lock`.
3. **WeightsScene.** Fig. 5 takes the dot products through ÷ √2 (0.721, 0.283, 0.078), then e to the score (2.056, 1.327, 1.081), then ÷ total (0.461, 0.297, 0.242, summing to 1.000). The rules `score = dot product ÷ √d` (d: how many numbers a vector holds) and "softmax: raise e to each score, then divide by the total" ink beside it as they are said. Fig. 6 lays the three e-powers end to end (total 4.464) and relabels the same bar as shares of 1.
4. **BlendScene.** Fig. 7 is the query and keys. Fig. 8 lists keys, dot products, scores and weights, with the blend written out: `0.461 × (10, 0) + 0.297 × (0, 10) + 0.242 × (1, 1) = (4.85, 3.21)`. Fig. 9 places the new vector among the values, each pulling by its weight. Then the query swings to 0.2, 1.0: dot products become 0.40, 1.06 and 0.12, weights become 0.293, 0.467 and 0.240, and the point moves to (3.17, 4.91).
5. **RecapScene.** Fig. 10 shows the five steps for trophy's weight (1.02, 0.721, 2.056, 0.461, then 4.85, 3.21). Fig. 11 is a 3×3 query-against-key grid with the computed cell (`it` to `trophy`, 0.461) marked, stacked into several heads. Art: `llm-attention-score-mix`.

Illustration ids: `llm-attention-score-lock` and `llm-attention-score-mix` (both kept on the first draw), plus the unit's `llm-meaning-trophy` copied into `public/images/llm-attention-score/`. The Batch job (`batch_6adb335718f08190951a0c603aacca08`) sat at 0/2 for 3.7 hours, through the container restart. I cancelled it (status "cancelling", 0 completed), generated both images with the generator's `sync` command, and imported them.

## Facts

Every number comes from `measure.py` (NumPy 2.4.6), through `measurements.json` and `data.ts`. `measure.py` checks three things:

- **The page's own output.** It asserts the lesson block's printed output in `lib/generated/block-outputs.json`: 0.721 0.283 0.078, 0.461 0.297 0.242, and 4.849 3.214.
- **The unit's numbers.** It asserts the unit's `llm-meaning/measurements.json` qkv values (query, dots, scores, weights, output, for both queries). I re-ran it after the unit's fix pass; it still matches and the output is unchanged. The video says softmax gives trophy "the biggest share" and nothing stronger, which fits the unit builder's point that softmax flattens these scores. "Nearly everything to the top one" is said only of large, unscaled sums.
- **Reproducibility from the rounded numbers on screen.** Two places needed a choice:
  - **E-powers.** The video shows e raised to the scores as displayed, so a calculator agrees with the screen: 2.056 and a total of 4.464. Unrounded, they are 2.057 and 4.465. The weights come out the same either way.
  - **Blend.** It is shown to two decimals (4.85, 3.21). The rounded weights give 4.852, 3.212, while the lesson prints 4.849, 3.214; to two decimals they agree. For the suitcase query the e-powers are not drawn, because their displayed sum would be 4.532 against 4.531 unrounded.

The script header says all of this.

Not computed, on purpose:

- The embedding strip has no numbers, because the lesson gives none.
- Fig. 11's cell shading is schematic, apart from the one 0.461 cell, because the lesson gives queries only for `it`.

"Real queries and keys hold many more numbers, so these sums get big" names no size, since it differs between models. `measure.py` backs it with a seeded random-vector check: the spread of a dot product is about 1.4 with 2 numbers and about 11 with 128, and about 1 once divided by √d. That check is not shown on screen.

## Lesson discrepancies (not fixed)

- `content/courses/how-llms-work/attention-intuition.mdx:126,130`: the block divides `scores` by √2 on line 126, then prints it as `raw scores:` on line 130. The page shows "raw scores: [0.721 0.283 0.078]", but those are the scaled scores; the raw dot products are 1.02, 0.40 and 0.11. The video labels each stage ("Dot product", "Score, ÷ √2").

## Kit suggestions

All of these live in `llm-attention-score/parts.tsx` and are copies or extensions of the unit's:

- **`Cells`:** a vector as number cells that can sit blank and ink their numbers in on a cue, and can collapse from n cells to fewer.
- **`VecArrow`:** an arrow from a plot's origin, with a filled `arrowHead()` and a glow.
- **`Swap`:** a value that changes in place with a flash, so a number never counts through false values.

The unit's `TokenChip`, `VectorCells` and `PathArrow` belong in the kit too, as its builder said.

## Process notes and anything left undone

- I voiced after reviewing scene 1's stills, tsc, lint, cues and npm test, but before reviewing the stills of scenes 2 to 5. That was to avoid sitting in a long render queue. The later review changed only layout (cues, grid position, note width), so no beat needed re-voicing.
- The video runs 2:27 against "about 2 minutes". Cutting it would mean re-voicing, and every step the review asked for is in it, so I left it.
- Nothing else is outstanding.
