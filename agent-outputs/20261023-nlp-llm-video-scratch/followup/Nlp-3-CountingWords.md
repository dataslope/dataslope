# Nlp-3-CountingWords: follow-up pass

Both items are done. 70 characters were re-voiced, against a limit of 300. Every check passes. Nothing was committed, and `measure.py`, `measurements.json` and `data.ts` were not touched; this pass needs no new numbers.

## Items

| # | Review | Result | What changed |
| --- | --- | --- | --- |
| 1 | #6 | done | `giants` is now two beats: `rank` ("Rank them by count.", 0.6 s breath after it) and `giants` ("The top ten alone make up over a fifth of the book.", 1.0 s after it, as before). Each was voiced on its own, with no new take and no `--force`. Fig. 5's curve now draws on "Rank" in the new beat, and the breath gives it time to finish before "The top ten" brings in the callout. |
| 2 | #11 | done, by a different route | The gliding copies in Fig. 10 now travel in two straight legs. Each drops straight down its own column into its row, then slides left along that row into place. Each leg eases on its own, with no arc. In flight, a word crosses only its own tag chip, the one directly under it. |

**Why not the suggested route** (down below the sorted rows, then across and up)? The nouns are named, and land, before the adjectives. Measured against the real word times, that route would have taken "young" through the landed "engineer", "designed" through "brilliant" and "new", and "quietly" through "system". Approaching from above or below crosses the same rows, because the rows fill from the same left edge.

**What makes the new route clean:** the Fig. 10 sentence now ends at the right margin (x 569 to 1800, previously 120 to 1351). So every word's column lies to the right of everything already packed into the rows. A drop never crosses a landed word, and a slide only passes over empty row.

**Checked two ways:**
- A frame-by-frame simulation with the real word times found no overlap with another tile, another word's chip or a row label, including copies that move at the same time.
- Stills of every flight showed the same.

**Code:**
- `Tile` in `parts.tsx` takes an optional `to.via` for the two-leg path. Only PennScene uses it; single-leg glides are unchanged.
- The landing tap now sounds as a word reaches its row.

**#10** stays as it was, as agreed.

## Voice

- **Re-voiced:** 70 characters, `rank` (19) and `giants` (51), each on its own.

## Length and checks

- **Length:** 6:57.3 (417.3 s, 58 beats), up from 6:55.9.

| Check | Result |
| --- | --- |
| typecheck and lint (my folder) | clean |
| `check:cues` | clean |
| `npm test` | 59/59 |
| `check:sync` | pass, worst +0.04 s (`together`); `rank` +0.01, `giants` −0.00 |
| `check:motion` | pass, longest still 2.8 s (`sparsity`, unchanged); no still of 2 s or more in Fig. 10 |
| `check:frames` | pass, 4 illustrations, none drawn larger than its pixels |
| `check:mix` (informational) | effects 20.6 LU under the narration (-45.2 against -24.6 LUFS); speech a median 24.9 dB above the effects, 5th percentile 11.3 dB; closest 5.0 dB at 4:33.7 |

The closest mix reading went from 8.4 dB to 5.0 dB, but it is the same effect as last time, on "running becomes run". It moved about 1 s later because of the split, which shifts it against the meter's 50 ms windows. That scene's effects and levels are unchanged. Following the README ("listen before turning one down"), I left it as it is.

## Stills

- **Fig. 5:** during `rank` (f2835) and after "the top ten" (f2925).
- **Fig. 10:**
  - the sentence at its new place (f7185)
  - "system" sliding along the nouns row (f7307)
  - "brilliant" sliding along the adjectives row (f7425)
  - "designed" in place (f7515)
  - "quietly" dropping (f7550)
  - the finished table (f7580)
- All are in `video/out/Nlp-3-CountingWords-f*.png`.
- One queued still job hit its background time limit while the shared queue was busy. The five frames it had not reached were rendered in a single queued process instead (`$S/Nlp-3-CountingWords/stills.mjs`).

## Files changed

- `video/src/videos/nlp-counting-words/script.ts`: the `rank` / `giants` split
- `video/src/videos/nlp-counting-words/TailScene.tsx`: the "Rank" cue moved to the `rank` beat
- `video/src/videos/nlp-counting-words/PennScene.tsx`: the sentence placement and the two-leg glide
- `video/src/videos/nlp-counting-words/parts.tsx`: `Tile`'s `to.via`
- `video/public/narration/nlp-counting-words/`: `rank.mp3`, the new `giants.mp3`, and `alignment.json`
