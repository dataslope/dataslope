# DataScientist-5-DeepLearning: P2 fixes

Report: `agent-outputs/20261029-ds-interview-video-review/DataScientist-5-DeepLearning.md`
(5 P2s, #1-#5). Folder `video/src/videos/ds-deep-learning/`. Nothing committed.

| # | Finding | Status | What changed |
| --- | --- | --- | --- |
| 1 | Momentum's path contradicts "damps the zigzag" | fixed | `opt-rest` re-voiced: "...so it builds speed along the floor, and across the valley it swings in slow waves instead of flipping every step." The figure is left as computed (β = 0.9, lr 0.05 is underdamped across the ravine: the swing decays by √0.9 a step, so it is wider than tuned plain descent's, and no heavy-ball setting here both damps it visibly and reaches within a third of a unit in 50 steps). The momentum legend now reads "a running velocity: speed along, slow waves across", the second half cued to "slow waves". |
| 2 | SGD's end point hidden when "three units from the bottom" is read | fixed | Every run's last point is ringed (r 10 ring + solid dot, in its colour) on top of all four paths: SGD's at "three units from the bottom", the others' with their distances. A red bracket with dashed leaders measures SGD's end to the ×, labelled "3.07 to the bottom", drawn above the valley at y = 1.15, outside the outermost contour and clear of every path. SGD's legend line is now "here, plain steps on the exact gradient" instead of "a step per mini-batch". The SGD group was not moved to the top of the draw order: the ring alone makes the end visible, and drawing red over RMSProp's floor run would hide orange instead. |
| 3 | Struck sigmoid still outputs a green 0.802 | fixed | The 0.802 cell leaves 4 frames after "Leave out the activation", and a "1.4" cell in ink takes its place 10 frames later (`NeuronScene.tsx`), so the struck box feeds the sum itself. |
| 4 | Q5 never says what a layer's factor is | fixed | New beat `vanish-why` after `vanish`: "Each layer's factor is its weight times its activation's slope, so the quarter holds for weights near one, and large weights push the factor above one." On screen: a line "each layer: × its weight × its activation's slope" from "a long product" (marked yellow when the new beat names it); the slope line gains ", with weights near 1" and the orange label ", with large weights", each cued to its words. |
| 5 | Q9 says Adam breaks the equivalence but not why, or what L2 is | fixed | New beat `decay-why` between `decay` and `decay-adam`: "The penalty is lambda over two times the sum of squared weights. Its gradient is lambda times the weight, so a step on it is exactly that shrink. But Adam divides every gradient, the penalty's included, by that weight's recent gradient size, so weights with big gradients are barely decayed." On screen: the L2 row's label gains ", λ/2 · ‖w‖², whose gradient is λw"; λw is marked in `w − η(g + λw)`; the bottom block is now three lines: "with Adam, the two differ: it divides λw by each weight's gradient size too," / "so weights with big gradients are barely decayed" (red, the trap) / "AdamW applies the decay separately, to the weights directly" (AdamW marked). |

No new numbers: everything added on screen reads `data.ts` (`NEURON.z`,
`OPT.paths`, `OPT.dist.sgd`), so `check.mjs` was not re-run and `results.json` is
unchanged.

Files changed: `script.ts`, `NeuronScene.tsx`, `VanishScene.tsx`, `OptScene.tsx`,
`DropScene.tsx`; `public/narration/ds-deep-learning/alignment.json`,
`opt-rest.mp3`, new `vanish-why.mp3`, `decay-why.mp3`. Takes untouched.

P3s fixed on the way: none of the report's. One unlisted defect fixed in the same
edit as #4: the "× 1.5 a layer" label sat on the dotted gridline at 1; it now
sits under it, clear of both lines.

## Voice

845 characters re-voiced (`narrate --dry-run`), each beat on its own:
`vanish-why` (new, 151), `decay-why` (new, 291), `opt-rest` (whole, 403).

Splitting first was not possible: `narrate --recut` needs every take to match the
script, and takes 3, 4 and 5 no longer do, because `opt`, `opt-rest`, `decay`,
`arch` and `arch-rnn` were re-voiced alone after the acronym rewrite (the takes
say "S G D", "C N N"). So the two answers were added as new beats after the
sentence they extend rather than spliced into it, and `opt-rest` (already a solo
recording) was re-voiced whole. Nothing else in `alignment.json` changed.

## Length and checks

- New length: **629.0 s** (10:29), 42 beats, from 594.9 s (+34 s: the two new
  beats and 3 s on `opt-rest`).
- Typecheck and lint, my folder: clean.
- `npm run check:cues`, `npm test`: no failure names `ds-deep-learning` (the
  failures are other videos' cues mid-edit).
- `check:motion`: passed, nothing still for 3 s (7 stretches of 2.0 to 2.5 s, none in a changed scene's new material).
- `check:sync`: passed, 42 beats, worst +0.03 s (`neuron-in`); the new beats `vanish-why` +0.02, `decay-why` +0.03, `opt-rest` +0.00.
- `check:mix`: exit 0. Narration -19.8 LUFS, effects 29.7 LU under it; where both sound, speech a median 31.1 dB above (closest 8.9 dB at 2:43.8, in `backprop-chain`, untouched).
- `check:frames`: not run (no arrow, illustration or ERD changed).
- Stills looked at: 48.5, 50.6 (neuron), 205, 212.5, 222.5, 234 (Q5),
  272, 292.5, 300.5 (Q6), 390, 397, 410, 418 s (Q9).

## Noticed

- **The page and #1.** `deep-learning.mdx` says momentum pushes "through
  ravines and damp[s] oscillation". That holds for the every-step sign flip,
  which momentum's averaging does remove (the figure shows it: slow waves, not
  flips), but not for the size of the swing at β = 0.9, which is wider than
  tuned plain descent's. The narration now says what the figure shows; the page
  is not edited.
- The three rings at the bottom (momentum 0.13, RMSProp 0.21, Adam 0.28) sit
  within about 25 px of each other and overlap. That reads as "all three
  arrived", which is the claim, so they were left as a cluster.
- Left, as P3s: the blank page in the three bridges (#16, still
  `out = tooMuchAt - 2` and the like), the 18 px ticks on the Q9 chart (#11),
  and the green "the step size: the machine learning round" line (#15).
