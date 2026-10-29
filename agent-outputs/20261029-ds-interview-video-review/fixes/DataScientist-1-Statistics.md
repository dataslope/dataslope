# DataScientist-1-Statistics: P2 fixes

Report: `agent-outputs/20261029-ds-interview-video-review/DataScientist-1-Statistics.md`.
Built on the P1 commit (`53eda7cd`). Nothing committed.

## P2s

| # | Finding | Result | What changed |
| --- | --- | --- | --- |
| 3 | The two misreadings are the fastest beats | fixed | `ci-fixed` split into `ci-not` + `ci-fixed` (0.5 s between), `pvalue-not` split into `pvalue-not` + `pvalue-fluke` (0.4 s between), all four re-voiced with `[slowly]`. Pace: `ci-not` 2.6, `ci-fixed` 2.6, `pvalue-not` 2.4, `pvalue-fluke` 2.4 words/s (were 3.20 and 3.06). |
| 4 | Correlation never says "confounder"; orange dots unlabelled | fixed | `r-corr` split at sentence breaks (cut free from the kept take); new middle beat `r-corr-hold`: "Both climb on hot days: temperature is a confounder, a third variable behind the two. Hold it fixed, and it's point oh eight." Dots turn orange on "hot days", with a WARM_INK "hot days" label over the cluster; the side note reads "temperature, the confounder, / held fixed: 0.08". |
| 5 | Parametric vs non-parametric gives the verdict, not the reason | fixed | `r-param` split before "Mann-Whitney" (free); new beat `r-param-why`: "The monsters blow up the spread, and the shift drowns in it. On ranks, a monster is just the largest value, however large." On screen: that line under the t-test, each queue's median drawn as a tick on "finds the shift" ("median 32.4", "median 36.8", from `results.json`), and the axis titled "minutes to resolve a ticket" (the unit in the course's block). |
| 6 | Correct statements struck through | fixed | No strike on "theorem" (plain red; its scratch sound removed), on "p = 0.72" (red, no strike) or on "r = 0.57" (fades to 40% when 0.08 is said). |
| 7 | Labels under 19px | fixed | Test-tile captions `label(19)`; both rapid-round `Axes` at `size={19}`. "test 20" still fits its tile (checked). |
| 8a | Chi-square: no degrees of freedom | fixed | New beat `chi-dof`: "The p is read off a chi-square curve with two degrees of freedom: rows minus one, times columns minus one." Screen: "on 2 degrees of freedom = (3 − 1) × (2 − 1)" under the p, from `CHI.dof` and the table's shape. |
| 8b | Unbiased: no "biased but lower variance", no MSE, no link to the MLE | fixed | New beat `unbiased-mse`: "Dividing by n is still the maximum-likelihood answer: biased, but less variable, and at five values its mean squared error is lower. Unbiased isn't automatically better." `check.mjs` now also measures each divisor's MSE in the same 10,000 normal samples (n = 5: 0.359 against 0.501; nothing else in `results.json` changed). Screen: the mechanism lines give way to "÷ n is the MLE: biased, but less variable", "mean squared error = bias² + variance", "at n = 5: 0.36 for ÷ n, 0.50 for ÷ (n − 1)", "unbiased isn't automatically better". |
| 8c | Effect size: no reverse case | fixed | New beat `effect-small`: "The reverse happens too: a big effect can miss significance in a small sample." Two-line note under "significant, and too small to matter". |
| 8d | CI: how one interval is built | fixed (screen only) | Mono note "each one: x̄ ± t*·s/√n" on "build an interval from each", as the page writes it. |
| 8e | p-hacking: correction names no method | fixed | `hack-paths` split (free); `hack-fix` re-voiced: "...correct for the number of tests, with Bonferroni or Benjamini-Hochberg, and confirm on fresh data." Sub-line under that remedy: "Bonferroni, or Benjamini-Hochberg". |
| 8f | Bayesian: prior never named | fixed | `r-bayes` split (free); `r-bayes-ab` re-voiced: "Take an A B test: ... Start from flat priors, and you get a distribution for each rate, and a ninety-seven and a half percent chance that B's is higher." Note now opens "from flat priors:". |

**P3s fixed on the way**
- **#13** ("the page's A B test"): gone, in the same re-voiced sentence as 8f.
- **#14, partly**: the two rapid-round spans ("t-test:", "Mann-Whitney:") lost their whole-span `TABULAR` when the strike came off; `PvalueScene` and `AnovaScene` are untouched.

## Voice

- **1,288 characters** re-voiced (the `narrate --dry-run` count), 11 beats, each on its own:
  - 6 new: `unbiased-mse`, `ci-not`, `pvalue-fluke`, `chi-dof`, `effect-small`, `r-param-why`.
  - 5 reworded: `ci-fixed`, `pvalue-not`, `hack-fix`, `r-bayes-ab`, `r-corr-hold`.
- Cut free from the kept take 6 before rewording: `hack-paths`/`hack-fix`, `r-bayes`/`r-bayes-ab`, `r-param`/`r-param-u`, `r-corr`/`r-corr-hold`/`r-corr-cause`. No take was recorded, nothing was `--force`d.

## Length and checks

- Length (`npm run cues -- ds-statistics`): **11:34** (694.0 s, 46 beats), up from 10:36. The extra 58 s are the six new answer sentences and the slower, split misreadings.
- Typecheck for `src/videos/ds-statistics/`: no errors. `eslint src/videos/ds-statistics`: clean.
- `npm run check:cues`: no failure in this folder. All 22 failures are `ds-ml-evaluation`, another fixer's video in mid-edit.
- `npm test`: 57 of 59 pass. Both failures are the same `ds-ml-evaluation` cues.
- `check:motion`: passes, longest still 2.8 s. The first run found one 3.3 s still in `r-bayes`, in the frequentist sentence. That line is now cued to its own words, with marks on "fixed" and "random" and the second line on "reports p-values".
- `check:sync`: passes, 46 beats, worst +0.04 s (`unbiased-mse`).
- `check:mix`: passes.
  - Effects are 28.9 LU under the narration (-48.8 against -19.9 LUFS).
  - Where both sound, speech is a median 29.1 dB above the effects; the 5th percentile is 13.4 dB, and the closest moment is 8.7 dB at 8:59.9.
- `check:frames`: not run. No arrow, illustration or ERD changed.
- Stills at every changed moment, each opened: 158.5, 268.8, 289.5, 296, 304.8, 396, 403, 477, 482.5, 552.8, 592.9, 607, 626.3, 646, 656, 672 and 682.5 s.

## Noticed, and kit suggestions

- **`narrate --recut` cannot cut a split here.**
  - It refuses unless every take still matches the script, and takes 1 to 5 stopped matching when beats were re-voiced alone after recording (`se`, `clt`, `lln`, `mle`, `mle-more`, `ci`, `ctr`, `chi`).
  - So the take-6 splits were cut with a scratch copy of the recut, `video/out/DataScientist-1-Statistics-recut.mjs` (gitignored), that cuts one named take. First it re-cut the unchanged take and reproduced the committed beats byte for byte.
  - **Kit suggestion:** `narrate --recut --take N`, or a `--recut` that cuts only the takes that still match. That would keep splits free in any video that has had a single-beat re-voice.
- **The take plan changed.** The new beats regroup `planTakes` from 6 takes to 7. This does not matter until someone records takes again.
- **`check.mjs` needs Pyodide, which is not installed at the repo root.** It was run with a private copy (Pyodide 314.0.7, via `NODE_PATH`).
- **`r-bayes-ab` runs at 3.0 words/s.** It is number-dense ("a hundred and twenty conversions in a thousand..."), about the same pace as the sentence it replaced. It was not slowed because that would cost another ~220 characters.
- **P3 #12 is still there.** The Bayesian definition still sits about 12px over the curve labels.
