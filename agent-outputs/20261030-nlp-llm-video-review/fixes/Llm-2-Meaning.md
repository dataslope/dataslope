# Llm-2-Meaning: the decoder fix (Scene 10, and the rest of the video)

I fixed `video/src/videos/llm-meaning/` so it says what a decoder does: each token scores itself and every token before it, and never a later one. Ten tokens make 55 scores, twenty make 210, which is 3.82 times as many. All checks pass. Nothing is committed.

## Narration

| Beat | Before | After | Cost |
| --- | --- | --- | --- |
| `price` (new) | first sentence of `square` | "There's a price." (pauseAfter 0.6) | free (`--recut`, cut from take-3) |
| `square` | "There's a price. Every token scores every token, itself included." | "Each token scores itself and every token before it, never a later one." (pauseAfter 0.7) | 70 characters |
| `ten` | "Ten tokens make a hundred scores. Double the text, and it's four times the work." | "Ten tokens make fifty-five scores. Double the text to twenty, and it's two hundred and ten, nearly four times the work." | 119 characters |

- **189 characters re-voiced** (budget 300), on `square` and `ten` only, with `--only square,ten`, in Drew's voice on eleven_v4_turbo.
- **Everything else is byte-identical.** Every other MP3 is unchanged, `takes/` is unchanged, and every other beat's entry in `alignment.json` is unchanged; I compared both against copies taken before the change. The changed files are `price.mp3` (new), `square.mp3`, `ten.mp3` and three entries in `alignment.json`.

## On screen

**Fig. 16** (`AttentionScenes.tsx`, HeadsScene) is now the decoder's grid:
- **What it shows:** it only draws cells on or below the diagonal. Above the diagonal the square's outline stays drawn but empty. A label inside that empty half, at 21 px, reads "Later tokens: / never scored". The label shows on "later" and nothing crosses it.
- **How it builds:**
  - On "price": the label and the empty 10×10 square appear. This also fixes a 3.3 s still that `check:motion` caught on the first run.
  - On "itself": the diagonal fills, with red outlines.
  - On "before": the cells left of the diagonal fill, from the nearest token back to the first.
  - On "Double": the 20-token rows fill in a lighter blue.
- **Counts:** "10 tokens: 55 scores" (highlighted on "fifty-five") and "20 tokens: 210 scores" (on "two hundred").
- **Title:** "Each token scores itself and every earlier token".
- **Headlines:** "Each token scores itself / *and every token before it.*", then "Twice the text, *3.8 times the work.*" The 3.8 comes from the measured ratio.

The same claim appeared in three other places, and I fixed all three on screen only:
- **Fig. 15** (the heads grid, `HeadBox`): the cells above the diagonal used to be drawn faintly tinted, which read as "scored". They are now not drawn, matching Fig. 16. The lit patterns were already all below the diagonal.
- **Fig. 17** (`ShapeScenes.tsx`, the attention column of the transformer block): it used to draw every row connecting to every other row, later tokens included and itself left out. Each token's new vector on the right now connects only to itself and the tokens before it (`j >= i`).
- **Scene 7 headline:** "Attention: tokens weigh each other." became "Attention: tokens weigh earlier tokens."

I left two things as they are because they are correct:
- The `attention` beat ("pulls in information from the others") and its note. This is the lesson's own wording ("information from the other tokens"), which the corrected lesson keeps. It does not say "every".
- "Compared with every key". In that example the pronoun is the last of the three tokens, so every key really is itself and the keys before it.

The script header in `script.ts` and the docstring in `measure.py` now say all of this.

## measurements.json

**Every existing value came back identical.** An unchanged run first reproduced the committed file byte for byte. The final file differs from the committed one only by one added key:
- `decoder.counts`: `{n: 10, scores: 55, later: 45}` and `{n: 20, scores: 210, later: 190}`
- `decoder.ratio`: 3.82

`measure.py` computes these from a causal mask (`np.tril`), and asserts that the scores equal n(n+1)/2, that the diagonal holds n, and that the n values match `cost`. The existing `cost` key (100 and 400) is kept as-is and is now documented as the full n×n square of pairs that the figure outlines.

`data.ts` builds `COST` as `{n, pairs, scores, later}`; it throws if pairs ≠ scores + later. It also exports `COST_RATIO`.

The shared `$S/pyenv` has no tiktoken. I built a private one at `$S/Llm-2-Meaning/pyenv` (Python 3.13.17, NumPy 2.4.6, tiktoken 0.12.0), with the o200k_base encoding cached in `$S/Llm-2-Meaning/tiktoken-cache` (tiktoken checks its hash). To rerun:

```
TIKTOKEN_CACHE_DIR=$S/Llm-2-Meaning/tiktoken-cache $S/Llm-2-Meaning/pyenv/bin/python -I src/videos/llm-meaning/measure.py > src/videos/llm-meaning/measurements.json
```

## Length and checks

- **New length:** `npm run cues -- llm-meaning` gives 63 beats, 920 words, **413.2 s (6:53)**. It was 408.0 s (6:48).
- **Typecheck and eslint:** no errors in the folder.
- **`check:cues`:** pass.
- **`npm test`:** 69/69 pass.
- **`check:motion`:** passes on the final code (nothing holds still for 3 s).
- **`check:sync`:** pass, all 63 beats within ±0.12 s. Worst was +0.04 s (`docs`); `price` −0.01, `square` −0.00, `ten` +0.01.
- **`check:mix`:** narration −19.9 LUFS; effects 25.5 LU under it; median gap 27.1 dB; closest 8.0 dB at 2:48.1, which is outside the changed scenes.
- **`check:frames`:** pass. 4 illustrations, 13 arrows within 10 degrees, no hyphen in tabular figures, and every cue names its occurrence.
- **Stills looked at:** 222.5, 294, 295.4, 296, 296.3, 297.6, 298.3, 300, 302.6, 304.5, 307.5, 309.5, 311.5, 314 and 329 s, plus before-stills at 294, 299, 303, 306.5, 310, 325 and 330 s.

## Lesson or shared changes

No lesson change is needed. The corrected `attention-intuition.mdx` ("roughly n²/2 comparisons; doubling the input still quadruples the work") matches the video. 55 to 210 is 2(2n+1)/(n+1), which approaches four as n grows. No shared-kit change was needed.
