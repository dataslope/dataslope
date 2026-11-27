# MachineLearningEngineer-4-Statistics: fixes

Review: `agent-outputs/20261126-ae-mle-video-review/MachineLearningEngineer-4-Statistics.md` (17 findings: 1 P1, 6 P2, 10 P3).

## Findings

| # | Sev | Finding | Status | What was done |
| --- | --- | --- | --- | --- |
| 1 | P1 | p = 0.62 read as "nothing there" | fixed | "Nothing there." cut from the narration by a free recut. The screen now reads "p = 0.62: no evidence of a gap" (`script.ts`, `PermScene.tsx`) |
| 2 | P2 | SE equation "0.29 / √2,000 = 0.64 points" | fixed | Now "= 0.0064, or 0.64 points", from `SE.se` (`SeScene.tsx`) |
| 3 | P2 | Likelihood chart labels the prior's 80% "Maximum likelihood" | fixed | Heading turns to "Likelihood by click rate" on the small-sample beat. The tag and dashed line leave on "Three clicks in three views". A red dot marks the 100% peak and a green dot the 80% peak (`MleScene.tsx`) |
| 4 | P2 | "Ship it?" never answered | fixed | New beat `q8-ship`: "So, ship it? Offline, the new model passes; an online test gets the final say." "reject the null" is highlighted on "passes" (`PermScene.tsx`) |
| 5 | P2 | Log-likelihood justified only by underflow | fixed | New beat `q11-log-peak`: "The log only ever rises, so the peak stays put." The same words appear as a note under the heading (`MleScene.tsx`) |
| 6 | P2 | Stratified panel loses the rare class from the sample; picks drawn green | fixed | Picks are blue (data) in all four panels. The rare band keeps its purple tint, with grey unpicked dots and blue picked ones, so two of its four are visibly sampled (`RapidScene.tsx`) |
| 7 | P2 | 4.3 s near-empty page at the bootstrap follow-up | fixed | The bootstrap figure stays up until "If two thousand test rows". The heading follows on that phrase and the user grid on "test rows come". The blank stretch is now about 0.8 s (`BootScene.tsx`) |
| 8 | P3 | "No formula" overstated | fixed | Now "No simple formula" (`CltScene.tsx`) |
| 9 | P3 | Correlation and causation gives only the confounder | fixed | New beat `r-cause-other`: "Or the cause runs the other way, or it's chance." A soft line reads "Or reverse causation, or chance" (`RapidScene.tsx`) |
| 10 | P3 | Unnarrated lines leave too soon; new questions after short gaps | fixed | "Both read it backwards" is now cued on "fluke" + 24 frames. `pauseAfter` rose from 0.6 to 1.2 on `q2-limit` and from 0.7 to 1.2 on `q6-not` (`TestScene.tsx`, `script.ts`) |
| 11 | P3 | θ̂ hat lands after the subscript | fixed | Local `Hat` draws the hat as a small SVG chevron over θ, so the page audit reports no glyph overlap (`BootScene.tsx`) |
| 12 | P3 | Hyphens for minus signs on the permutation axis | fixed | "−10", "−5" (`PermScene.tsx`) |
| 13 | P3 | "5,000 per arm: 20%" grazes the gridline | fixed | Label moved down about 12 px (`PowerScene.tsx`) |
| 14 | P3 | "A point" 7 px from the column rule | fixed | Label 4 px closer to its dot. The rule is centred at 1080: about 30 px from the label and 20 px from the right column (`CiScene.tsx`) |
| 15 | P3 | 2 px speck on the confidence interval page | fixed | The zero-length dashed line is no longer drawn before it has length (`CiScene.tsx`) |
| 16 | P3 | Pooled null histogram cut at ±2 points | fixed | `check.mjs` bins it over ±3 points (61 bins), and both test panels share a ±3 axis (`check.mjs`, `PermScene.tsx`) |
| 17 | P3 | Bayes' formula never tied to the example | fixed | On "Say a fraud model" the abstract formula cross-fades to "P(fraud \| flag) = P(flag \| fraud) P(fraud) / P(flag)" (`BayesScene.tsx`) |

17 of 17 fixed. Nothing in the shared kit needed a change. The θ̂ problem (a combining circumflex after an italic letter in the serif) could recur in other videos that write `<I>x̂</I>`. Here it is worked around locally.

## Voice

174 characters re-voiced, in three new sentences, each voiced on its own with `--only`. That is within the 800 budget, and 48 of them are for a P3.

| Beat | Old words | New words | Characters |
| --- | --- | --- | --- |
| `q8-ship` (new, after `q8-paired`) | none: the video cut from "...it rejects the null." to question nine | "So, ship it? Offline, the new model passes; an online test gets the final say." | 78 |
| `q11-log-peak` (new, split out of `q11-log`) | none | "The log only ever rises, so the peak stays put." | 47 |
| `r-cause-other` (new, split out of `r-cause`) | none | "Or the cause runs the other way, or it's chance." | 48 |

Free, cut from the kept takes by `--recut`:
- `q8-models` now ends "...and p is point six two." ("Nothing there." dropped).
- `q11-log` / `q11-log-zero` are the two halves of the old `q11-log`.
- `r-cause` / `r-cause-act` are the two halves of the old `r-cause`.

`check.mjs`'s claim on the log-likelihood moved to the beat `q11-log-zero`.

## Images

None generated.

## Length

642.0 s (10:42) → 659.7 s (10:59.7), +17.7 s. The three new beats account for about 16.5 s with their pauses, the two longer pauses for 1.1 s and the two splits for 1.1 s. Dropping "Nothing there." saves about 1.0 s.

## results.json

Re-run in Pyodide (`node video/src/videos/mle-statistics/check.mjs`: "ok: the page and the narration agree with the run"). Only `permModels.unpairedNull.counts` and `.edges` changed, because finding 16 widened the bins to ±3 points. Every other value came back identical, including `permModels.unpaired` = 0.619.

## Checks

All checks ran on the final code, through my entry and the queues:

- Typecheck (`tsc --noEmit`, my folder) and `eslint src/videos/mle-statistics`: clean.
- `npm run check:cues`: pass ("every word cue names a phrase its beat says").
- `npm test`: pass (79 of 79).
- `node video/src/videos/mle-statistics/check.mjs`: pass ("the page and the narration agree with the run").
- `CHECK_SCALE=1 npm run check:frames -- MachineLearningEngineer-4-Statistics`: pass, with no audit warnings. An earlier run flagged the first drawn hat (a "ˆ" glyph over "θ") as `[overlap]`. The hat is now an SVG chevron, and the re-run is clean.
- `npm run check:sync`: pass, 49 beats, worst +0.04 s (`rapid-in`). The three new beats are at +0.01, +0.00 and +0.01.
- `npm run check:mix`: narration −19.9 LUFS, effects 29.7 LU under it. Where both sound, the speech is a median 29.8 dB above the effects (5th percentile 13.4 dB).
- `npm run check:motion`: pass. 10:59.8 checked, with no stretch still for 2 s or more. The preview MP4 is deleted.

Stills at every changed place were rendered and looked at (`$S/after/MachineLearningEngineer-4-Statistics/`). The WAVs from `check:sync` and `check:mix` are deleted.

## Comparisons

`/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/compare/MachineLearningEngineer-4-Statistics/`. The 16 PNGs are listed below. Finding 16 shares the first PNG with finding 1.

- 01-a-p-of-0-62-is-no-longer-read-as-nothing-there.png (findings 1 and 16)
- 02-the-standard-error-equation-shows-its-step.png
- 03-the-likelihood-chart-stops-calling-the-prior-s-8.png
- 04-ship-it-gets-its-answer.png
- 05-why-the-log-keeps-the-same-answer.png
- 06-the-stratified-panel-shows-the-rare-class-in-the.png
- 07-the-bootstrap-follow-up-no-longer-opens-on-a-bla.png
- 08-no-formula-becomes-no-simple-formula.png
- 09-correlation-without-causation-the-other-two-reas.png
- 10-both-read-it-backwards-stays-long-enough-to-read.png
- 11-the-theta-hats-sit-on-the-theta.png
- 12-minus-signs-on-the-permutation-axis.png
- 13-the-20-label-clears-its-gridline.png
- 14-a-point-no-longer-touches-the-column-rule.png
- 15-the-stray-speck-on-the-interval-page-is-gone.png
- 17-bayes-formula-in-the-example-s-terms.png
