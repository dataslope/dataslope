# MachineLearningEngineer-5-DeepLearning: fixes

Review: `agent-outputs/20261126-ae-mle-video-review/MachineLearningEngineer-5-DeepLearning.md` (12 findings: 0 P1, 4 P2, 8 P3).

## Findings

| # | Sev | Finding | Status | What was done |
| --- | --- | --- | --- | --- |
| 1 | P2 | "Max pooling" grid kept the largest magnitude with its sign | fixed | `CnnScene.tsx`: each pooled cell is `Math.max` of its 2 × 2 window of `CNN.shiftedMap`; four cells change, two from − to + |
| 2 | P2 | Backprop's memory answer stops before the follow-up | fixed | New beat `q4-ckpt` (gradient checkpointing); on "keep only some" the kept activations of Output 10 and the second Hidden 128 fade; green line "Checkpointing: keep a few, recompute the rest"; "Serving keeps none" moved under the serving stack as "keeps none" to make room |
| 3 | P2 | "learned" touched the column rule in question 7 | fixed | The note is set at 20px; it now ends 39px before the rule (was 6px). The rule did not need to move |
| 4 | P2 | RNN, LSTM/GRU and CNN figures cleared 0.6 to 0.8 s after their beat ended | fixed | pauseAfter `q14-slow` 0.7 → 1.6, `q15-limit` 0.7 → 1.5, `q10-props` 0.7 → 1.4; the finished figures now hold 1.7, 1.5 and 1.5 s (were 0.8, 0.6 and 0.8) |
| 5 | P3 | Leaky ReLU label "slope 0.1" disagreed with the data's 0.01 | fixed | Label "Leaky: a small slope below 0"; the 0.1 drawing stays as a schematic, documented in `ActScene.tsx` |
| 6 | P3 | Batch-of-one result stated without "per feature" | fixed | On screen only: "One value per feature here, as after a dense layer" under the three batch-of-one lines (the narration's "a feature is its own mean" and "that layer" are right for the layer shown, so no re-voice) |
| 7 | P3 | ReLU outputs stayed beside the ReLU-less network for 2 s | fixed | `PerceptronScene.tsx`: the labels swap to 2, 1, 1, 0 on "Take the ReLU out" |
| 8 | P3 | Optimizer step bars did not say which parameter is which | fixed | Each bar's gradient (1, 0.01, from `OPTIM.gradientScale`) under it; subtitle "with gradients 1 and 0.01" |
| 9 | P3 | Conv chips dropped the kernel size | fixed | "Conv2d(3, 16, 3)", "Conv2d(16, 32, 3)" |
| 10 | P3 | "backprop" axis label sat on the top point | fixed | Moved to the left of the axis (`textAnchor="end"`) |
| 11 | P3 | Dropout digit not named, reads as a 9 | fixed | Caption "A test 8" from `DROPOUT.image.label` |
| 12 | P3 | Why libraries fuse softmax and cross-entropy | fixed | On screen only: ", for numerical stability" (the page's reason) |

## Voice

Re-voiced: **120 characters**, one new beat, nothing existing re-recorded (budget 800).

- `q4-ckpt` (new, after `q4-memory`): "Gradient checkpointing buys some of it back: keep only some layers' activations, and recompute the rest on the way down." (7.68 s). `q4-memory`'s pauseAfter went from 0.8 to 0.6 and the new beat carries the 0.8.
- Gradient checkpointing is standard practice rather than the page's; `script.ts`'s fact list says so.

## Images

None generated.

## Length

700.8 s (11:41) → 711.5 s (11:51): +8.2 s for the new beat and its pause, +2.4 s of longer pauses.

## Checks

CHECKS_PLACEHOLDER

## `results.json`

RESULTS_PLACEHOLDER

No new number was typed by hand: the per-bar gradients come from `OPTIM.gradientScale`, the caption from `DROPOUT.image.label`, the pooled grid is derived in the scene from `CNN.shiftedMap` (as it was before), and one hand-typed number (the leaky slope 0.1) left the screen.

## Comparisons

`/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/compare/MachineLearningEngineer-5-DeepLearning/`:

- `01-the-max-pooling-grid-is-now-max-pooling.png` (finding 1)
- `02-backprop-s-memory-answer-now-reaches-gradient-ch.png` (findings 2 and 10, with the narration diff)
- `03-batch-norm-note-clear-of-the-column-rule-and-fin.png` (findings 3 and 6)
- `04-the-rnn-figure-is-held-before-question-15-clears.png` (finding 4)
- `04-the-lstm-and-gru-figure-is-held-before-the-close.png` (finding 4, with the CNN hold described)
- `05-the-leaky-relu-label-no-longer-states-a-slope-th.png` (finding 5)
- `07-xor-s-outputs-change-the-moment-the-relu-comes-o.png` (finding 7)
- `08-each-optimizer-bar-says-which-gradient-it-had.png` (finding 8)
- `09-the-conv-chips-carry-their-kernel-size.png` (finding 9)
- `11-the-dropout-digit-is-named.png` (finding 11)
- `12-why-libraries-fuse-softmax-and-cross-entropy.png` (finding 12)

## Shared kit

Nothing needed. One note for whoever owns `compare.py`: a box's numbered tag always sits above its top-left corner, so a box under a line of text has to be widened to the left to keep the tag off the text.
