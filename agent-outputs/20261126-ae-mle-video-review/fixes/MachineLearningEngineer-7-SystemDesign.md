# MachineLearningEngineer-7-SystemDesign: fixes

The review is `../MachineLearningEngineer-7-SystemDesign.md` (0 P1, 2 P2, 7 P3). All nine findings are fixed. None needed new words or new numbers.

## Findings

| # | Sev | Finding | Status | What changed |
| --- | --- | --- | --- | --- |
| 1 | P2 | Schema passes a column the figure calls new | fixed | `RapidScene.tsx`: schema now fails on the null column with completeness. Each check carries its own cross cue, so all four checks catch something. |
| 2 | P2 | The queue empties before the narration says it holds the spike | fixed | `RapidScene.tsx`: the spike moved from 0.42 to 0.60 of the beat and widened from 0.11 to 0.12, and the queue drawing scale went from 9 to 14. The third replica comes up on "instead of being dropped". The queue now fills from about 635 s, holds about 15 requests under "Request queue" during "lets a spike wait", and drains once the replica joins. |
| 3 | P3 | The corner map loses its store for three questions | fixed | `ServingScene.tsx`, `QuantScene.tsx` and `LoopScene.tsx` pass `store` to `MiniMap`. |
| 4 | P3 | Quantization's benefits sit on the precision rows | fixed | `QuantScene.tsx`: one line under the bars, "Fewer bits: smaller, less data through memory, usually faster", each part on its word. It sits where the 3-bit and 2-bit rows arrive later, and leaves before they do. |
| 5 | P3 | The fraud model's input arrow starts under one chip | fixed | `FraudScene.tsx`: a blue bracket under the whole chip row, with the arrow dropping from it into the model. It inks in on "The model is gradient boosting". |
| 6 | P3 | "Batch suits a heavy model" has nothing on the batch side | fixed | `BatchScene.tsx`: "So it suits a heavy model" in soft ink under "Lookup: fast", on the same phrase. |
| 7 | P3 | The teacher is labelled "large" after question 7 called it small | fixed | `RapidScene.tsx`: the teacher reads "here, our digit network" and the student "smaller". |
| 8 | P3 | "Only nine" is up for under a second | fixed | `script.ts`: `r-distill` `pauseAfter` changed from 0.6 to 1.5. The finished hard-label panel now stays fully drawn from about 608.9 to 610.0 s; before, it had started fading by 609.2 s. This is a pause, not a re-voice. |
| 9 | P3 | "Some exposure" fills almost the whole new column | fixed | `RecScene.tsx`: exposure now goes to 3 of 7 users (`v < 0.35`), the same users the item-metadata fallback guessed, instead of 6 of 7. |

## Voice and images

- **Characters re-voiced: 0.** No words changed. Finding 8 is a pause change only. `public/narration/mle-system-design/` is byte-identical to the frozen copy, so `check:sync` and `check:mix` were not needed.
- **Images generated: none.**

## Length

The length was 655.9 s (10:55.9) and is now 656.8 s (10:56.8). The extra 0.9 s is the longer pause after `r-distill`. Every beat from `r-latency` on starts 0.9 s later, and every cue follows.

## Checks (final code, private entry, through the queues)

- `tsc --noEmit`: no errors in `src/videos/mle-system-design/`.
- `eslint src/videos/mle-system-design`: clean.
- `npm run check:cues`: passed ("every word cue names a phrase its beat says, and says which one").
- `npm test`: 79 tests, 79 passed, 0 failed.
- `CHECK_SCALE=1 npm run check:frames -- MachineLearningEngineer-7-SystemDesign`: passed. It checked 5 illustrations and 39 arrows (bend up to 0.0°), found no tabular hyphens, kept a space between every pair of words, set every line in one size and family, and every word cue names its occurrence.
- `npm run check:motion -- MachineLearningEngineer-7-SystemDesign`: see below.
- `check:sync` and `check:mix`: not run, because nothing was re-voiced.
- Stills were rendered and checked at every changed moment: 74, 243, 303.5, 392, 441, 461, 536, 573, 609.6, 609.9, and 635.2 to 640.4 s.

## Data

`results.json`, `data.ts`, `check.mjs` and `illustrations.json` are byte-identical to the frozen copy, so every existing value came back identical. No new number was introduced.

## Comparisons

All in `$S/compare/MachineLearningEngineer-7-SystemDesign/` (`$S` = the session scratchpad), from `compare.json` there:

- `01-schema-now-fails-on-the-new-null-column.png` (finding 1)
- `02-the-queue-holds-the-spike-while-the-narration-sa.png` (finding 2)
- `04-quantization-s-benefits-as-one-line-the-map-keep.png` (findings 4 and 3)
- `05-every-feature-feeds-the-fraud-model.png` (finding 5)
- `06-the-batch-row-says-what-a-fast-lookup-buys.png` (finding 6)
- `07-teacher-and-student-labels-only-nine-held-longer.png` (findings 7 and 8)
- `09-some-exposure-not-almost-all-of-it.png` (finding 9)

## Shared kit

Nothing needs changing. One note for whoever times an exit near a cut in a `RapidFire` quick round: in the rendered frames, an answer's body is already fading about 0.6 s before the next item's first word, earlier than `during(item.at - 6, next - 2, 8)` suggests. Finding 8 measured its hold from the frames, not the formula.
