# DataScientist-1-Statistics: P3 fixes

Report: `agent-outputs/20261029-ds-interview-video-review/DataScientist-1-Statistics.md`.
P2 fix report: `agent-outputs/20261029-ds-interview-video-review/fixes/DataScientist-1-Statistics.md`.
Built on the committed P2 pass. Nothing committed. Times below are the new ones (the video is 3.7 s longer than after the P2 pass).

## P3s

| # | Finding | Result | What changed |
| --- | --- | --- | --- |
| 9 | Two-sidedness drawn but never named | fixed | Q10: the two small curves are labelled "2.5% each side" and "5% on one side" (the page's "5% in one tail against 2.5% in each"). Q11: `pvalue` split before "A fair coin"; the new `pvalue-fair` is re-voiced as "...lands sixty-two or more, or, since the test is two-sided, thirty-eight or fewer, two point one percent of the time. That's the p-value." On screen, on "since the test is two-sided", "two-sided: / both tails count" over the "38 or fewer" label. Q12: the note now reads "the 95% cutoffs, two-sided". |
| 10 | Red carries the data being explained | fixed | p-value: both tails are full data blue over the rest of the runs faded to 40% (was red over 65%); "62 or more", "38 or fewer" and "2.1% of runs" in blue; the observed "62 heads" line and its label in ink. Red is now only the two struck misreadings. Chi-square: 103 is blue under the yellow mark (was red under a red mark). Q10's rejection tails: blue (were red), matching the p-value's. |
| 11 | Unlabelled axes and series | fixed | MLE: y title "likelihood"; 12 in 40 now drawn in grey (line, fill, its width bar, its name) and 120 in 400 in blue, each name keyed by a line swatch, so the two curves no longer share one blue; the peak dot and its note in ink. LLN: the line is named in place, "the running mean" in blue beside where it starts falling (a y title sat 16 px under the answer line above the chart and on the line's first point, so I used a direct label instead); the bell is ink (was green) with a centre tick and the caption "the spread of the mean around μ". Effect size: x title "score (SD 15)" (15 is the SD `check.mjs` draws both groups with, now one `SD` constant that also draws the curves); the inset reads "mean of A" and "mean of B, +0.14". |
| 12 | Bayesian definition crowds the curve labels | fixed | Curves `c.h(225)` (was 250), labels at `base - c.h(258)` (was 282): about 39 px under the definition now. |
| 13 | "the page's A B test" | already done | Fixed in the P2 pass ("Take an A B test: ..."). |
| 14 | `TABULAR` spaces out hyphens | fixed (the rest) | The two rapid-round spans were done in the P2 pass. Now also "= the p-value" (`PvalueScene`) and "10 t-tests," (`AnovaScene`), and the z/t note, which gained a hyphen ("two-sided"). |
| 15 | Step numbers 1 and 2 dark grey on blue | fixed | `color` now follows the `...label(24)` spread: white on the filled blue, blue on the outlined 3 and 4. |
| 16 | Parameter line runs through the "5" tick | fixed | Two `VLine`s: population top to its baseline (with the label), then from below the tick row to the pile's baseline, the second drawn 10 frames later so it reads as one line continuing. |
| 17 | Right 40% empty for Q3 | fixed | "2,000 sample means...", "a narrow bell around 5" and "its spread is the SE: / 0.70 simulated · 0.71 by the formula" moved out of the chart into the right-hand column Q2 used, beside the pile (the SE line broken in two to keep the margin). |

**Also fixed on the way** (small, in this folder):
- SVG text drawn black because it carried only a CSS color (the P3 brief's warning): the effect inset's tick labels (100.0, 100.1, 100.2), the MLE scene's "n = 2 … n = 30" labels and the ranks figure's "//" break mark now have `fill`.
- The z/t axis ticks read "- 4", "- 2": the shared `Axes` ticks are tabular, which sets a hyphen a digit wide. Local fix: `xFormat` writes a real minus sign ("−4").
- Two stills that `check:motion` found on the first pass after these edits (see below).

## Voice

- **187 characters** re-voiced (the `narrate --dry-run` count), one beat on its own: `pvalue-fair`. No take recorded, nothing `--force`d.
- The split itself cost nothing. `pvalue` was split before "A fair coin" and the first half re-cut from the **kept take 4**, which still holds the beat's text. `narrate --recut` refuses the real folder (beats were re-voiced alone after the takes), so `$S/DataScientist-1-Statistics/tools/recut-take4.mjs` (after the Interview fixer's `recut-take.mjs`) runs narrate's own `--recut` on a scratch root whose script is take 4's own text split into the current beats. It reproduced the untouched `steps` and `zt` byte for byte, alignment entries identical.
- I first cut the piece from the beat's own file with a copy of `split.mjs` (validated on the untouched `chi-five`: same length and identical alignment, audio a second MP3 generation). On the coordinator's note I replaced it with the take cut; the two `pvalue` alignment entries are identical, so `alignment.json` changes only in `pvalue` (shorter text) and the new `pvalue-fair`.
- `pvalue` now runs at 2.6 words/s, `pvalue-fair` at 2.4.

## Length and checks

- Length (`npm run cues -- ds-statistics`): **11:38** (697.7 s, 47 beats), up 3.7 s from 694.0 s. The extra time is the new clause and the pause where `pvalue` splits.
- Typecheck for `src/videos/ds-statistics/`: no errors. `eslint src/videos/ds-statistics`: clean.
- `npm run check:cues`: no failures at all on the final run. (An earlier run had failures only in `ds-deep-learning`, `ds-probability` and `ds-ml-evaluation`, other fixers' videos mid-edit.)
- `npm test`: 59 of 59 pass.
- `check:sync`: passes, 47 beats, worst +0.04 s (`unbiased-mse`); `pvalue-fair` +0.01. Run on the final audio (the take-cut `pvalue`) and once before it, same result.
- `check:mix`: passes. Effects 28.9 LU under the narration (-48.8 against -19.9 LUFS); where both sound, speech is a median 29.2 dB above the effects (5th percentile 14.3 dB), closest 11.4 dB at 0:17.8.
- `check:motion`: passes, longest still 2.8 s. The first run after these edits found two: 3.0 s at the end of `sampling` (the SE line finished drawing 3 s before the cut) and 3.3 s across `r-bayes` into `r-bayes-ab` (likely the shorter Bayes curves of #12 putting less change on screen when the axes start). Fixed with word-cued motion: "by the formula" now fades in on its own words, and "a prior" and "a posterior" in the Bayesian definition take the yellow mark as they are said, as "fixed" and "random" already do in the frequentist line.
- `check:frames`: not run. No arrow, illustration or ERD changed.
- Stills at every changed place, each opened: 60, 119, 187.5, 218, 342, 367.5, 395.5, 406.5, 437, 471, 518, 556, 629.5 s, then 187.5, 437 and 556 again after follow-up tweaks (the LLN label, the minus signs, the effect line moved clear of the new axis title), and 118.6 and 616.4 s for the two motion fixes.

## Shared-kit recommendations

- **`Axes` ticks**: `tickText` sets `fontVariantNumeric: "tabular-nums"`, so a negative tick prints "- 2". Format negative ticks with U+2212 inside `Axes` (or drop tabular figures on ticks), so no video has to pass its own `xFormat`. Any `Axes` with negative ticks in another video has the same defect.
- **`Axes` y title**: it is drawn 26 px above the plot's top, which lands on whatever note sits above the plot (here, the LLN chart's one-line answer, "as a sample grows..."). An option to put it inside the plot's top-left, or a `yTitleGap`, would let a video use it there.
- **`narrate --recut --take N`** (repeated from the P2 report): the take-4 recut here, the Interview fixer's tool and the P2 pass's recut are all the same scratch-root workaround.

## Noticed, left

- Q3's green bell (`SampleScene`, the pile's normal curve) is still green, the "right answer" color the reviewer objected to in the LLN figure (#11). It was not in the finding and reads as "the bell the CLT promised", so I left it; a one-word change (`OK` → `INK`) if the coordinator wants the two bells to match.
- The render queue ran about 1.5 h deep this afternoon. My first `check:sync` + `check:mix` job hit the 2 h background limit: `check:mix` had waited most of it in the queue and was killed 20% into rendering its audio. I re-queued `check:mix` detached (`setsid nohup ... out/render-slot.sh ...`), so the wait could not kill it. It still went through the queue, and it passed.
- In the MLE scene's Q7 half, `÷ n` is red as "the wrong estimator". Left: after the P2 pass the scene says it is the MLE and has the lower MSE at n = 5, so red is arguable, but the reviewer did not raise it.
