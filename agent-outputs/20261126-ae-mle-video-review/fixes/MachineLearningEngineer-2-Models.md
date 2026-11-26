# MachineLearningEngineer-2-Models: fixes

Review: `agent-outputs/20261126-ae-mle-video-review/MachineLearningEngineer-2-Models.md` (18 findings: 0 P1, 8 P2, 10 P3).

## Findings

| # | Sev | Finding | Status | What changed |
| --- | --- | --- | --- | --- |
| 1 | P2 | Range test read at its minimum | fixed | Last sentence re-voiced; ring moved to the step nearest a tenth of the turn (0.19, `lr.tenth` from `check.mjs`), the bottom shaded neutral, the advice reworded on screen; `check.mjs` asserts the pick is on the steep stretch (`LrScene.tsx`, `script.ts`, `check.mjs`) |
| 2 | P2 | SVM margin never drawn; staircase boundary | fixed | `check.mjs` now writes each model's decision function on the grid; new `Contours` (marching squares, `parts.tsx`) draws the boundary smooth and the margin dashed at ±1 (`SvmScene.tsx`) |
| 3 | P2 | Chart labels on gridlines | fixed | Four charts' labels set between gridlines (`CeScene.tsx`, `GbScene.tsx`, `BagScene.tsx`) |
| 4 | P2 | θ1 alone on the page before its chart | fixed | Fades in with the axes (`GdScene.tsx`) |
| 5 | P2 | Residuals before the first tree never seen | fixed | Trees land on later words; the 0-tree state holds about a second (`GbScene.tsx`) |
| 6 | P2 | 8 vs 79,315 steps without "at its best rate" | fixed | On-screen line: each at its best rate, which the ×100 column caps; condition number 1.6 → 11,770 from `results.json` (`ScaleScene.tsx`) |
| 7 | P2 | Text 9 px from the column hairline | fixed | Right column 40 px right, hairline centred in the gap (`ParamScene.tsx`) |
| 8 | P2 | "What are ensembles?" unanswered | fixed | On-screen line "Ensembles combine many models into one prediction" (the page's own clause); diagrams moved down 42 px (`BagScene.tsx`) |
| 9 | P3 | RBF title 15 s before the kernel | fixed | Title appears on "The kernel trick" (`SvmScene.tsx`) |
| 10 | P3 | Sigmoid formula crowds the axis title | fixed | Plot top 22 px lower (`LogitScene.tsx`) |
| 11 | P3 | λmax never named | fixed | Label adds "λmax the loss's largest curvature" (`LrScene.tsx`) |
| 12 | P3 | Rate axis "Base, 0.5, 0" | fixed | "Base, Half, 0" (`LrScene.tsx`) |
| 13 | P3 | "Single trees" disagrees with the curves' start | fixed | "Single trees, on average" (`ForestScene.tsx`) |
| 14 | P3 | θ1, θ2 against "weights 1, 2, −1" | fixed | Rows line names θ0, θ1, θ2; note "θ0, the bias, held at its best" under the plot (`GdScene.tsx`) |
| 15 | P3 | k-means shapes unreadable; last line up 2 s | fixed | Points 33% larger; `pauseAfter` 0.6 → 1.2 on `r-kmeans` (`RapidScene.tsx`, `script.ts`) |
| 16 | P3 | Support-vector bars are unlabelled shares | fixed | Title "Support vectors, as a share of the rows" (`SvmScene.tsx`) |
| 17 | P3 | Why PCA runs on scaled features | fixed | Note "Scaled first: raw, the widest unit would take the 1st component" (`PcaScene.tsx`) |
| 18 | P3 | Range test in one breath (3.03 w/s) | fixed | Split into `lr-range`, `lr-range-read`, `lr-range-pick` with 0.55, 0.7 and 0.8 s pauses (free recut) |

18 fixed, 0 partly, 0 moot, 0 not fixed.

## Voice

81 characters re-voiced, one beat, through `out/voice-slot.sh` (budget 800):

- `lr-range` split at its sentence breaks into `lr-range` and `lr-range-read`, both cut free from take 2 (`--recut`); only `lr-range-pick` voiced (`--only`).
- Old: "Pick a rate on the flat stretch, well short of the turn."
- New: "Pick a rate where it's still falling steeply, about a tenth of where it turns up."

No other words changed. `alignment.json` changed only for `lr-range` (now shorter) and the two new beats.

## Images

None generated.

## Length

682.9 s (11:23) → 686.6 s (11:27): the split's two pauses, the re-voiced sentence and the longer pause after `r-kmeans`.

## Numbers

`check.mjs` was rerun in full (Pyodide, through `out/cpu-slot.sh`) and passed ("every quoted phrase is on the page, and every measured number is said"). Every value already in `results.json` came back identical, checked key by key against a copy taken before the run. Four keys were added: `lr.turn`, `lr.tenth` (the pick: rate 0.1918, loss 0.3067, 28 times the bottom's), `svm.decisionLinear` and `svm.decisionRbf` (64 × 64 decision functions). So that a rerun reproduces the file, `check.mjs` now keeps the three SVM fit times, measured once and said only as a ratio, from the existing `results.json` (`RETIME=1` measures them again); the claim list follows the split beats, and a new fact asserts the pick is on the steep stretch.

## Checks

All on the final code, through the private entry and the queues:

- Typecheck (`tsc --noEmit`, filtered to `src/videos/mle-models/`): no errors.
- ESLint on `src/videos/mle-models`: clean.
- `check:cues`: pass ("every word cue names a phrase its beat says").
- `npm test`: 79 tests, 0 failures.
- `CHECK_SCALE=1 check:frames`: pass (spacing, one size and family per line, no tabular hyphens, arrows straight under their heads, illustrations not upscaled).
- `check:sync`: pass, 55 beats, worst +0.03 s (`batch-each`); the three `lr-range` pieces +0.00, +0.01, +0.01.
- `check:mix`: pass, effects 30.0 LU under the narration, speech a median 29.7 dB above them. WAVs deleted.
- `check:motion`: MOTION
- `check.mjs`: pass.
- Stills at every changed place rendered and looked at (in `$S/after/MachineLearningEngineer-2-Models/`).

## Shared kit

Nothing needed. The smooth contours are local (`Contours` and `contour` in `parts.tsx`).

## Comparisons

`/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/compare/MachineLearningEngineer-2-Models/`, 20 PNGs plus `compare.json`:

- `01-the-range-test-is-read-on-its-steep-stretch-not-.png`
- `02-the-svm-s-margin-is-drawn-and-its-boundary-is-sm.png`
- `02-both-svm-boundaries-drawn-smooth.png`
- `03-cross-entropy-labels-moved-off-the-gridlines.png`
- `03-run-chart-labels-moved-off-the-75-gridline.png`
- `03-12-trees-4-68-moved-off-the-4-gridline.png`
- `03-the-floor-note-lifted-off-the-0-75-gridline.png`
- `04-no-stray-axis-label-before-the-gradient-descent-.png`
- `05-the-residuals-before-the-first-tree-are-seen-who.png`
- `06-steps-to-settle-each-at-its-best-rate.png`
- `07-the-left-column-s-text-clears-the-hairline.png`
- `08-what-are-ensembles-answered-on-screen.png`
- `10-the-sigmoid-s-formula-clears-the-axis-title.png`
- `11-max-named.png`
- `12-the-schedule-s-rate-axis.png`
- `13-single-trees-on-average.png`
- `14-the-plot-s-1-and-2-tied-to-the-three-weights.png`
- `15-k-means-shapes-readable-and-the-round-result-hel.png`
- `16-the-support-vector-bars-say-they-are-shares.png`
- `17-why-pca-ran-on-scaled-features.png`

Findings 9 and 18 share comparisons 02 (the title) and 01 (the split); every other finding has its own.
