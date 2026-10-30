# Llm-2-1-AttentionScore: fixes for the October 30 review

Folder `video/src/videos/llm-attention-score/`, narrated by Drew. All 14 findings fixed (1 P1, 5 P2, 8 P3). Nothing committed by me (the coordinator's two WIP snapshots already hold this work).

## Findings

| # | Pri | Status | What changed |
| --- | --- | --- | --- |
| 1 | P1 | fixed | `lands` re-voiced: "So trophy's value pulls hardest." The ring on the new vector now pulses on "answer" only; on "hardest" trophy's spring (the thickest) swells by 6 px (BlendScene). measure.py now records `blendDistance` (it 4.44, trophy 6.07, suitcase 8.34) and asserts the nearest value is `it`'s, so "lands nearest" cannot come back. |
| 2 | P2 | fixed | Headline "One new vector, five steps."; Fig. 11 (was 10) "The pronoun's new vector, start to finish"; a bracket over boxes 1 to 4 tagged "its weight on trophy", and "with all three weights" over box 5; the glow on box 4 removed. `recap` split: "So that's attention, by hand." re-voiced, "Multiply and add, scale, raise e, divide, blend." (`steps`) cut free from the take. |
| 3 | P2 | fixed | `scale` split: "One adjustment first." (free) and `big` re-voiced "...so these sums get big, and the next step would hand nearly all the weight to the top one." (no forward "softmax"). New Fig. 6 fills the empty lower half during `big`/`root`: "How big the sum gets, for random vectors", 2 numbers 1.4 and 128 numbers 11.1 (bar grows on "big"), then a "÷ √d" column, 1.0 and 1.0, on "square root" (measurements.json `spread`). measure.py adds the lesson's weights without the division (0.515, 0.277, 0.207); Fig. 7 (was 6) draws them as a dashed bar under the shares, "without the ÷ √2", on a new beat `unscaled`: "Without the scaling, trophy would take point five two." |
| 4 | P2 | fixed | `toy` re-voiced: "The lesson keeps it small. Three tokens: trophy, suitcase, and the pronoun itself. And two numbers in each vector." Fig. 1: a self-loop under `it` drawn with the other arcs (everyAt + 6), so "a weight for each" covers three; the rest of the sentence dims on "Three tokens", trophy and suitcase are highlighted as named, the loop swells and an "itself" tag appears on "itself". Fig. 2's collapse to two cells moved to "two numbers". |
| 5 | P2 | fixed | `cosine` split and re-voiced with "scaled to length one" (Note text too); `keeps` ("Attention keeps the lengths.") cut free; new beat `short`: "So the pronoun's own key, short but pointing roughly the query's way, scores just point one one. Cosine would give it point seven seven." (pauseAfter 1.0). Fig. 3 tags "short key, score 0.11" and "cosine would give 0.774" (measurements.json `cosine`), the `it` key pulses on "short", Fig. 4's 0.11 rings on "point one one". I wrote "roughly the query's way" rather than "the right way": cosine 0.774 is about 39 degrees off. |
| 6 | P2 | fixed | `divide` re-voiced: "Add them up, four point four six four, and divide each one by that total." (pauseAfter 1.2). Fig. 7 builds on "Add them up", the total inks on the spoken total, the weights fill on "total", and both swaps (bar labels, total to 1) moved to fourSixAt − 4, so the e-power bar and its total hold through "Trophy takes". |
| 7 | P3 | fixed | (a) `it` key label to ty − 72 (the dashed stretch line no longer crosses it; still at 74.6 s), payoff tags above it, clear of the unit circle. (b) The leader is gone: the red callout sits on the red cell's row, and the new column names make "it to trophy" readable from the axes. (c) Dot-product gap 36: "=" 12 px from the box, digits 24 px inside. |
| 8 | P3 | fixed | Fig. 3 axes named "first number" (under x) and "second number" (top of y), 20 px. Fig. 10 values carry coordinates: "value of trophy (10, 0)" in two lines to the right of its dot (plane moved to x 1300 at 36 px a unit so it fits), "(0, 10)", "(1, 1)". Fig. 12 names its columns (keys, teal) under the front grid, slanted 50 degrees to fit a 50 px cell. |
| 9 | P3 | fixed | Fig. 5 headers in the lesson's terms: "Raw score (dot product)", "Scaled score ÷ √2", "e to the scaled score", "Weight ÷ total" (two lines each); Note "scaled = raw score ÷ √d", softmax note "each scaled score"; Fig. 9 header "Score" to "Scaled". Narration: `root` split and re-voiced "So each raw score is divided..." (`rootTwo` "Here, root two." free); `softmax` split, `raise` re-voiced "Raise e to the power of each scaled score."; `three` re-voiced "three new vectors". |
| 10 | P3 | fixed | `OVERLAP` 6 to 14 (Video.tsx): the outgoing scene fades across the incoming one's first inking; stills at 36.2, 89.7, 135.0 and 160.5 s show no blank page. |
| 11 | P3 | fixed | From "run it again" the Weight column and both blend lines dim to 35% until each swaps, and trophy's red drops at runAt (still at 150 s). |
| 12 | P3 | fixed (video) | Fig. 12 (was 11): the three cells above the diagonal are empty dashed cells in every head, tag "empty: later tokens, not scored" on "before it", title "Each query against every key up to its own, in every head"; each head's rows now add to one (the first token's only weight is on itself; the front head's last row is the lesson's 0.461, 0.297, 0.242). `heads` re-voiced: "A real model runs this for every token, against itself and every token before it, in many heads at once, each making its own queries, keys and values." Lesson change below. |
| 13 | P3 | fixed | The superscript header is now "e to the / scaled score" at 23 px. |
| 14 | P3 | fixed | "the biggest weight?"; Fig. 1 retitled "The lesson's example" (the screen keeps "didn't", as the voice says it). |

Also fixed on the way: check:motion first failed on two 3 s stills I had made (scale/big, divide/weights); the italic note now inks on "Real queries", the weights fill on "total" with trophy's turning red on "Trophy", and Fig. 11's label inks on "by hand".

## Voice

**991 characters re-voiced** (`narrate --dry-run`), within the 1,200 budget, each beat on its own: `three` 55, `toy` 114, `cosine` 88, `short` 136 (new), `big` 135, `root` 83, `raise` 42, `divide` 73, `unscaled` 54 (new), `lands` 32, `recap` 29, `heads` 150.

Five beats split at sentence breaks and cut from take-1 for free (`--recut`): `scale` "One adjustment first.", `keeps`, `rootTwo`, `softmax` "Now softmax makes weights, in two steps.", `steps`. Every other beat (hook, ask, query, key, value, arrows, along, multiply, others, dot, weights, blend, flip, swap, answer) is byte-identical to its committed MP3 and its alignment entry is unchanged (checked after the recut).

## Length and checks

- `npm run cues -- llm-attention-score`: 32 beats, 396 words, **182.6 s (3:03)**, was 146.9 s (2:27). The +35.7 s is the two new beats, the longer `toy`, `divide` and `heads`, and the pauses at the five splits.
- Typecheck and eslint: no errors in the folder. `check:cues`: pass. `npm test`: 69/69 (on the final code).
- `check:motion`: pass (longest still 2.8 s).
- `check:sync`: pass, every beat within ±0.03 s (worst `toy`, +0.03 s).
- `check:mix`: narration −20.0 LUFS, effects 28.3 LU under; closest 11.4 dB.
- `check:frames`: pass (3 illustrations, 10 arrows within 10 degrees, no hyphen in tabular figures, every cue names its occurrence).
- Stills looked at, cropped to the change: 10.5, 30.6, 34.5, 36.2, 72.5, 74.6, 87.5, 89.7, 92.3, 99.8, 106.5, 119.6, 121.8, 122.6, 125.6, 133.0, 135.0, 142.0/143.0, 150.0, 158.5, 160.5, 162.3, 168.4, 181.5 s.

## measurements.json

Every existing value came back identical (an unchanged run reproduced the committed file byte for byte; this measure.py records only the NumPy version, so there is no Python line to change). Two keys added: `unscaled` (weights 0.515, 0.277, 0.207; trophy to two decimals 0.52) and `blendDistance` (trophy 6.07, suitcase 8.34, it 4.44). data.ts exports them, the d = 2 and 128 rows of `spread`, and the cosine per key.

## Lesson change recommended (`content/courses/how-llms-work/attention-intuition.mdx`)

The video follows the decoder fact: a token scores itself and every token before it, never a later one. The lesson's figure caption (line 32, "every earlier token") already says so; the rest should agree.

1. Line 3, description: "The mechanism that lets each token look at every other token, explained without the matrix algebra." becomes "The mechanism that lets each token look at itself and every earlier token, explained without the matrix algebra."
2. Lines 48 to 51: "For each token, the model compares its query against every key, producing a relevance score per token. Those scores are turned into weights that sum to 1, and the token's new representation becomes a weighted sum of all the values." becomes "For each token, the model compares its query against its own key and the key of every token before it, producing a relevance score per token. Those scores are turned into weights that sum to 1, and the token's new representation becomes a weighted sum of those tokens' values. It never scores a later token: the model writes left to right, so those words do not exist yet."
3. Lines 163 to 164, callout: "Attention connects every token to every other token directly, in one step." becomes "Attention connects every token to every earlier token directly, in one step."
4. Lines 171 to 173, "The cost": "Every token attends to every other token, so an input of *n* tokens requires roughly *$n^2$* comparisons. Doubling the input quadruples the attention work." becomes "Every token attends to itself and every token before it, so an input of *n* tokens requires roughly *$n^2/2$* comparisons. Doubling the input still quadruples the attention work."
5. Lines 234 to 238, concept check: "- [o] Because every token computes a score against every other token." / "> With n tokens there are roughly n² pairs, so doubling the input quadruples the comparisons." becomes "- [o] Because every token computes a score against every token before it." / "> With n tokens there are roughly $n^2/2$ such pairs, so doubling the input quadruples the comparisons." The closing line "All-pairs comparison is the source of both attention's power and its cost." becomes "Comparing every token with every earlier one is the source of both attention's power and its cost."

The figure alt text on line 12 ("each connected to every other pillar") describes the drawing and can stay.

## Shared or other changes recommended (not made)

- The unit video says the same thing the lesson does: `video/src/videos/llm-meaning/script.ts:289`, "There's a price. Every token scores every token, itself included." For a decoder that should be "Every token scores itself and every token before it." Not my folder; the coordinator can route it to that video's fixer.
- No shared-kit change was needed: the self-loop, ghost bar, spread chart and slanted column names are built in this folder.
