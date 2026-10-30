# DataScientist-6-ExperimentDesign: P2 fixes

All six P2s fixed, plus one P3 (15) that a split fixed for free. Nothing committed.

| # | Result | What changed |
| --- | --- | --- |
| 1 | fixed | New beat `peek-why` after the four rates: "In an A A test, every significant result is a false positive, and each extra look is one more chance for noise to cross the line. So fix the sample size in advance, or use a sequential test, built to be checked as it runs." It names the remedy right before the Question 10 card, so the SPRT now arrives as the answer to it. On screen, under the bars: "each look: one more chance at a false positive", then, in green, "fix n in advance, or test sequentially", each cued to its words. `sprt` was not reworded to "One such test: Question ten" (that would re-voice a 270-character beat; the new sentence already makes the link). |
| 2 | fixed | New beat `unit-why`: "Why? One user's orders move together, so treating them as independent makes the standard error about a third too small. An average per user fixes that, and so do clustered standard errors." On screen, each bar's label gets its standard error from `results.json` `unitExample` (now exported as `UNIT_SE`): red "standard error 0.51, too small", green "standard error 0.79". Each user's order dots rise and fall together while "move together" is spoken, and a green line adds "or keep every order, with clustered standard errors". |
| 3 | fixed | `sprt` split at "Cross the bottom"; the new `sprt-bottom` says "Cross the bottom, and the data favor no effect over the one you designed for, though a smaller effect may still be there. In between, you keep going." New beat `sprt-limit` after the pairs result: "Both catch that effect eighty percent of the time, so the saving is real. But the classic SPRT holds only for two fixed hypotheses; for a live product metric, teams use a mixture SPRT or group-sequential boundaries." On screen, the boundaries read "stop: an effect · log(0.80 / 0.025) = 3.47" and "stop: favors no effect · log(0.20 / 0.975) = −1.58". The design's 0.025 and 0.20 are new in `results.json` (`sprt.alpha`, `sprt.beta`). The bar labels gain "power 80.5%" (SPRT) and "power 80.1%" (fixed, `POWER.base`), and two lines follow: "classic SPRT: two fixed hypotheses only", then in green "live metrics: mixture SPRT, group-sequential". The narration still says "likelihood ratio", which is what an SPRT tracks. The labels now show the log explicitly, so it matches the axis. |
| 4 | fixed | The floating "800" and "2,000" are gone. The counts now go in a red line in the open space above the dip, "under 0.05 at 800, and again at 2,000", which builds up on the two spoken words and sits over the existing "stop at either: you've shipped noise". The rings still mark the two crossings, and no part of the line crosses any label (still at 346 s). |
| 5 | fixed | The pen-tip dot is drawn only from `asked + 6`, when the path starts. The still at 330 s shows an empty chart area under the question. |
| 6 | fixed | The formula is now set in Inter with real subscripts and no macron: n = (z<sub>α/2</sub> + z<sub>β</sub>)² · 2p(1 − p) / MDE². `size-n` was split at "Halve the lift", and a new beat `size-terms` sits between the halves: "In the formula, alpha and power become one point nine six and point eight four. The baseline enters through p times one minus p, with p at eleven percent, the average of the two rates." A key under the formula builds up on those words, "z<sub>α/2</sub> = 1.96 · z<sub>β</sub> = 0.84 · p = 11%, the average rate", and 2p(1 − p) is highlighted at "p times one minus p". The values are new in `results.json` (`size.zAlpha`, `zBeta`, `pPool`). The answer lines moved down about 20 design px to make room. Subscripts are 0.8em, so the key's stay at 19px. |

**P3 fixed on the way:** 15. Splitting `sprt-cost` at "And when the effect is real" (needed for 3) puts a 0.6 s pause between the false-positive check and the sample-size saving.

## Voice

**958 characters re-voiced**, each beat on its own: `unit-why` 188, `size-terms` 184, `peek-why` 222, `sprt-bottom` 149, `sprt-limit` 215. No take was recorded again, and nothing used `--force`.

The three splits (`size-n`/`size-half`, `sprt`/`sprt-bottom`, `sprt-cost`/`sprt-pairs`) cost nothing, but `narrate --recut` refuses this video. Takes 3 and 4 were recorded with "M D E" and "S P R T". `size`, `size-n` and `sprt` were later re-voiced alone in plain caps, so no take matches the script, and `--recut` needs every take to match. I cut the splits with a scratch copy of narrate's `cutTake`/cut rules (`$S/DataScientist-6-ExperimentDesign/cut.mjs`). It is validated by reproducing the committed `sprt-cost.mp3` and its alignment entry byte for byte from take 4.

- `sprt-cost` and `sprt-pairs` are cut from take 4, a first-generation encode.
- `size-n`, `size-half` and the shortened `sprt` are cut from their own solo files, so they are a second MP3 encode.

## Length and checks

New length: **559.2 s (9:19)**, from 492.8 s (8:13). 38 beats, 1,382 words, 148 wpm.

- Typecheck (this folder): clean. ESLint (this folder): clean.
- `check:cues`: no failure names this video. The failures listed are in ds-llm-evaluation, which is mid-edit.
- `npm test`: 57/59. Both failures are the word-cue tests, and they name only other videos (ds-ml-evaluation, ds-llm-evaluation). Nothing names ds-experiment-design.
- `check:motion`: passed. Nothing holds still for 3 s; the longest still stretch is 2.5 s, over `design`.
- `check:sync`: passed. All 38 beats are within ±0.12 s; the worst is +0.04 s (`cuped-in`), and the new and split beats are all within +0.02 s.
- `check:mix`: passed. Narration −20.0 LUFS; effects 28.6 LU under it; speech a median 29.8 dB over the effects where both sound (5th percentile 13.0 dB).
- `check:frames`: not run. No arrow, illustration or ERD changed.
- Stills, each looked at, cropped to the change: 135, 138.5 and 144.5 s (unit), 240, 246.5 and 257.5 s (formula and key), 330, 341, 346 and 380.5 s (peeking), 400.5, 411 and 444.5 s (SPRT).

## Facts

`check.mjs` was re-run as its header says, from the repo root. Pyodide is not installed in this container (there is no root `node_modules`, and `npm install` is off limits), so it ran with `NODE_PATH` pointing at a private unpacked `pyodide@314.0.7` in scratch. `results.json` changed only by the five added fields. Every other number reproduced exactly.

## Noticed, left alone

- **The peeking chart's y title reads "p - value".** The shared `Axes` (`da-statistics-communication/parts.tsx:113`) sets its titles with `tickText`, which spaces the hyphen as `TABULAR` does. This is the series-wide `TABULAR` problem, in a file I may not touch. Kit suggestion: titles in `label()`, not `tickText()`.
- **Kit suggestion: `narrate --recut --only <ids>`** (re-cut the takes that still match), plus a way to split a solo-voiced beat at a sentence break. Any video whose plain-caps re-voice left a take behind hits this.
- **The P3s are not fixed:** 7 (white page at scene cuts), 8, 9, 10, 11 (the 21.9% line), 12, 13, 14 and 16.
