# MachineLearningEngineer-8-Mlops: fixes

Review: `agent-outputs/20261126-ae-mle-video-review/MachineLearningEngineer-8-Mlops.md`
(0 P1, 2 P2, 3 P3). Every finding was fixed on screen; nothing needed new words.

## Findings

| # | Sev | Finding | Status | What changed |
| --- | --- | --- | --- | --- |
| 1 | P2 | "no user exposed" stays through the canary and the rollback | fixed | The shadow caption leaves on "Then a canary" (`out={canaryAt}`), with the shadow's Log (`RolloutScene.tsx:168-175`). |
| 2 | P2 | Drift scatters have no key; the concept panel never draws the model's boundary | fixed | The concept scatter keeps the learned boundary, pale (gray 400, dashed), once the true one starts to turn. Notes read "the true boundary turns; / the model's (pale) stays". Each panel has a key: blue `y = 1`, grey `y = 0` in the math face, and "before the shift" for the pale dots in the data panel (`DriftScene.tsx`, `Scatter`, `Key`, phase A). |
| 3 | P3 | Blue/green shows the new model serving for 2 s, then ends rolled back | fixed | Traffic stays on green after the flip. On "flips back if anything breaks", a dashed blue arrow back to blue draws in, and the note reads "One switch, and back / if anything breaks". The switch now turns down at x 1100, clear of the note (`RapidScene.tsx`, `BlueGreen`). |
| 4 | P3 | "champion" and "challenger" on screen before they are defined | fixed | Shadow panel: "users only see the current model's", "the new model's, to a log". A/B panel: "half the users: current", "half: new". The names first appear at `q12-champ` (`TestScene.tsx:139-190`). |
| 5 | P3 | PSI's empty bucket (smoothing) left out | fixed | New line under the buckets, from "the log of their ratio" to the end of the phase (about 18 s): "An empty bucket gets a tiny ε, or ln 0 makes PSI infinite" (`PsiScene.tsx`, phase A). |

## Voice and images

- Characters re-voiced: **0**. No beat's words were wrong or short of what an interviewer presses on; every fix is on screen.
- Images generated: **none**.

## Length

631.8 s (10:32), unchanged: no beat moved (`$S/after/frames/MachineLearningEngineer-8-Mlops/beats.json` matches the review's beat for beat).

## Checks (final code, through the entry and the queues)

- Typecheck (`tsc --noEmit`, this folder): pass, no errors.
- Lint (`eslint src/videos/mle-mlops`): pass.
- `npm run check:cues`: pass ("every word cue names a phrase its beat says").
- `npm test`: 79 of 79 pass.
- `CHECK_SCALE=1 npm run check:frames -- MachineLearningEngineer-8-Mlops`: pass (4 images, 58 arrows, spacing, one size and family per line).
- `npm run check:motion -- MachineLearningEngineer-8-Mlops`: pass (nothing still for 3 s; two 2.0 to 2.3 s holds in `r-retrain`, unchanged by this pass).
- `check:sync`, `check:mix`: not run, as nothing was re-voiced.
- Stills looked at, at every place changed: 262, 270, 356, 369, 457, 480, 498, 509, 574, 576, 583 s.

`results.json`, `data.ts` and `check.mjs` were not touched, so every existing value comes back identical. No new number was added; the new labels carry no numbers.

## Shared kit

Nothing needed. Everything was done inside `src/videos/mle-mlops/`.

## Comparisons

`/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/compare/MachineLearningEngineer-8-Mlops/`:

- `01-the-canary-no-longer-sits-beside-no-user-exposed.png` (finding 1, 7:37)
- `02-drift-scatters-a-key-for-the-colors-and-the-mode.png` (finding 2, 4:30)
- `03-blue-green-ends-deployed-with-the-way-back-ready.png` (finding 3, 9:43)
- `04-champion-and-challenger-wait-for-their-definitio.png` (finding 4, 8:29)
- `05-psi-what-an-empty-bucket-does-to-the-log.png` (finding 5, 6:09)

Before frames are the review's one-a-second frames (the timing did not change); after stills are in `$S/after/MachineLearningEngineer-8-Mlops/` and `video/out/review/MachineLearningEngineer-8-Mlops/`.
