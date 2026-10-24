# Llm-2-Meaning: fix pass

All 20 findings from the review are addressed. Both P1s and 8 of the 9 P2s are fully fixed; #6 and #7 (both P2) are only partly fixed; all 9 P3s are fixed. Every check passes on the final code. Nothing committed.

## Findings

| # | P | Result | What changed |
| --- | --- | --- | --- |
| 1 | P1 | fixed | "Close together, or far apart." and "Three numbers per word…" moved to the empty left column at (X0, y(800)). The cube's "animal" label is no longer covered. |
| 2 | P1 | fixed | The arithmetic scene now walks through one score. The dot product is named and tied to cosine (narration and an on-screen note). The worked line reads `1.0 × 1.0 + 0.1 × 0.2 = 1.02 ÷ √2 = 0.721`. The Score column shows the raw dot products 1.02, 0.40, 0.11, then the scaled 0.721, 0.283, 0.078, so the numbers on screen can be reproduced by hand. |
| 3 | P2 | fixed | The lesson's hand-set example (0.722) and its `weights` beat are gone, so trophy now has one weight on screen (0.461). Fig. 13 is titled "the lesson's real vectors, three tokens of two numbers". |
| 4 | P2 | fixed | The seven-token list without "suitcase" is cut with it. |
| 5 | P2 | fixed | `set` now argues with a bag, not a sum: "Treat them as a bag of vectors, and the two sentences are identical". The sum cards are gone; dashed bags and an "identical, as bags" bracket replace them. After position is added, the bags differ (dog 0.9, 0.2 against 0.9, 0.4). The script header says the video follows the lesson's numbers, not its sum. |
| 6 | P2 | partly | `vector` is trimmed and re-voiced with `[slowly]`, with 0.8 s after it: 3.6 → 2.3 words a second. `embedding` keeps its audio (3.6 words a second), now with a clear breath before it. |
| 7 | P2 | partly | `scores` is split from `softmax` at no voice cost. `query-vec` now says "turns its embedding into three vectors". Softmax is shown as three weights adding to 1.000. I did not add "the biggest score takes far more than its share": on the lesson's real vectors softmax flattens 0.721 / 0.283 / 0.078 into 0.461 / 0.297 / 0.242, so the sentence would be false there. That point belongs in the attention-score deep dive. |
| 8 | P2 | fixed | Fig. 12 is redrawn. From the scene's first frame it shows the chip for "it" and its embedding strip. On "three", three arrows run to three two-cell vectors in purple, teal and orange. Each fills with the lesson's numbers for "it" as its name is spoken, with its question beside it. |
| 9 | P2 | fixed | The first head tile is labelled "from" and "to →", and each layer row now shows different patterns (`(c + r) % 4`). |
| 10 | P2 | fixed | The "·mat" chip is dropped; the strip is now "The last position's vector, after every block". The marker hops only between cat and dog. A note says the four bars are example scores from the sampling lesson. |
| 11 | P2 | fixed | Fig. 17's tower is capped with an "Output layer: a score per token" box at "model". `split` is re-voiced as "…the output layer, which scores every token, as much again." |
| 12 | P3 | fixed | BlindScene drug cards are set at 44px, and the pipeline boxes are larger and lower, so the lower part of the frame is used. |
| 13 | P3 | fixed | The cube is now Fig. 3 and the table Fig. 4. All 22 figures are numbered in order of first appearance. |
| 14 | P3 | fixed | Fig. 1 and its headline now leave as the next headline arrives, so the two cross. The SpaceScene headline holds until the next one arrives. |
| 15 | P3 | fixed | The cosine note leaves 14 frames before "Ruler" appears. During the search re-sort, the moving rows fade back so they no longer overprint. |
| 16 | P3 | fixed | Labels read "value of it" with the token in mono; the "new vector" label sits clear of the ring; the y = x diagonal is dropped. |
| 17 | P3 | fixed | Fig. 5's row is labelled "+ position, added to both rows". Fig. 17 draws position as a small "+ ▯▯▯" strip instead of "+1…+6". |
| 18 | P3 | fixed | `square` is re-voiced as "Every token scores every token, itself included", and the grid's diagonal is outlined on "itself". Fig. 17's ids are labelled o200k_base, and the closing note says 128,000 is the mid-sized model's vocabulary. |
| 19 | P3 | fixed | `docs` is re-voiced as "Five tiny documents, hand-scored on four themes, standing in for real embeddings", and Fig. 8 carries the tag "Hand-scored stand-ins for real embeddings". |
| 20 | P3 | fixed | The note under Fig. 2's table now reads "Every row learned in training". Fig. 1 has a one-time tag, "· marks a leading space". |

## Voice

- **Re-voiced: 785 characters** (cap 900), 9 beats, each voiced on its own: `vector`, `set`, `docs`, `query-vec`, `dot`, `scale` (new), `weights` (new text), `square`, `split`.
- **Free:** four beats were split at sentence breaks and re-cut from the kept takes with `--recut` (search/docs, scores/softmax, square/ten, split/attn-share). The 54 unchanged beats re-cut byte-identical. `real` was removed.
- No `--force` and no new take.

## Length and checks (final code)

- **Length:** 406.5 s (6:46.5), up from 391.6 s. 62 beats, 910 words, 134 wpm.
- **Typecheck and lint (folder):** clean.
- **`check:cues`:** clean for this folder. The command still fails on cues in nlp-counting-words and nlp-lemmas-and-tags.
- **`npm test`:** 59 pass, 0 fail.
- **`check:sync`:** pass. 62 beats, worst +0.03 s (`docs`).
- **`check:frames`:** pass. 4 illustrations, largest stretch 0.92; arrows 0.0° of bend.
- **`check:motion`:** pass. Longest still stretch 2.8 s (`top`/`next`).
  - The first run after the rebuild found three stretches of 3 to 4 s in the arithmetic scene.
  - Each now has a word-cued change: a mark on "divided by both vectors' lengths"; the Score column outlined on "Then"; the keys and query pulsing on "each vector"; the note arriving on "That"; the trophy row washed on "pronoun's".
- **`check:mix` (informational):**
  - Effects sit 25.6 LU under the narration; their peak is -21.1 dBFS (the logo).
  - Speech is a median 27.3 dB above the effects (5th percentile 12.0 dB).
  - Closest moment: 8.9 dB at 4:25.4, a tap as the trophy weight is named.
- **Stills:** re-taken and checked at every changed place (19 frames, then 6 more after follow-up edits).

## New, noticed and fixed or left

- **Fixed:** the score scene's new layout first overlapped "Total 1.000" with the worked line; the table was tightened and the note moved down.
- **Fixed:** the closing note ran off the right edge; it is now two lines.
- **Left:** the video is 46.5 s over the plan's 6 minutes. The fix pass added the dot-product, scaling and output-layer sentences, plus slower pacing; nothing was cut to compensate.
