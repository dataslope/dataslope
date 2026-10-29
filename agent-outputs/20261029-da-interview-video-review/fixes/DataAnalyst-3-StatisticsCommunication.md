# DataAnalyst-3-StatisticsCommunication: fixes

Folder `video/src/videos/da-statistics-communication`. Report:
`agent-outputs/20261029-da-interview-video-review/DataAnalyst-3-StatisticsCommunication.md`
(1 P1, 5 P2, 13 P3). All 19 findings are fixed. `parts.tsx` is untouched, and
so is `CORR` in `data.ts`, which is only read.

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P1 variance 200 vs 250 | fixed | `r-var` split at the sentence break (cut free). New beat `r-var-n`: squared distances add to 1,000; ÷ 5 = 200; pandas treats the data as a sample and divides by n − 1 = 4, giving 250, because a sample's mean sits closer to its own points than the true mean does; √250 = 15.81. On screen, one line each: "squared: 400 + 100 + 0 + 100 + 400 = 1,000", "1,000 ÷ 5 = 200: the average, dividing by n", "1,000 ÷ 4 = 250: pandas' `.var()` treats it as a sample, n − 1", the reason in soft ink, and "standard deviation: √250 = 15.81". The deviations figure moved up to make room. The new values (`squares`, `sumSquares`, `varPop`, `n`) come from `check.mjs`. |
| 2 | P2 true statements struck | fixed | Corr: no strike. At "Hold temperature fixed", "r = 0.57" cross-fades to a soft "raw r = 0.57" above the 0.08. Present: no strike. The interval is labelled "jargon:" in soft ink, and the green sentence is prefixed "say:". The scratch sound that went with the strike is gone. |
| 3 | P2 Q5 has no driver | fixed | New beat `metric-driver`: sessions fell by 2,000 and orders by only 12, so the traffic that left was barely buying; the likeliest driver is low-intent traffic dropping away (a paused campaign, newly filtered bots); check sessions by channel next, and say plainly that orders fell. On screen: "(+0.6 points)" under the +20% cell, "lost: 2,000 sessions, only 12 orders (0.6%)", "likeliest: low-intent traffic dropped away" with the two examples under it, and "check next: sessions by channel; say orders fell". `points` and `lost` come from `check.mjs`. The table rows are 62 instead of 70 to fit them. |
| 4 | P2 Q7 never says which rule | fixed | New beat `outlier-which`: "That's called masking. So reach for the IQR rule, or a z-score built on the median: quartiles don't move when the outliers do." The note now reads "the outliers hide themselves: **masking**", with a green line under it: "so use the IQR rule, or a z-score built on the median: quartiles don't move". |
| 5 | P2 normal: no "why it matters" | fixed | New beat `r-normal-why`: a big sample's average comes out close to normal even when the data isn't (like Q1's orders), and confidence intervals and A/B tests lean on that, so skewed raw data doesn't break them by itself. Three lines above the bell, which is drawn a little lower to make room. |
| 6 | P2 three samples all above the truth | fixed | `samples` now draws twenty means (the same seed; the first three are 52.1, 51.8 and 51.1 as before), drawn as a dot plot: 7 below 50.2 and 13 at or above it, from 47.8 to 53.1. Axis title "each dot: one sample's average order value, $", the two extremes labelled, and "that scatter: **sampling error**". `r-pop` split (first two sentences cut free). New beat `r-pop-many`: "Twenty samples of fifty average anywhere from forty-seven point eight to fifty-three point one, on both sides of the population's mean, fifty point two. That scatter is sampling error." |
| 7 | P3 68.1 / 95.5 | fixed | `normal.within` is now the exact areas, `erf(k/√2)`: 68.3%, 95.4%, 99.7%. "in 100,000 draws" is gone. |
| 8 | P3 Spearman on the "Pearson's r" scale; U unrevisited | fixed | The scale is labelled "coefficient", with "Pearson's r: how close to a straight line" at its right end. "Spearman: −0.01" appears in red inside the U, with "plot the data first" in green under it. `coef-curve` split in three (the first two cut free). New beat `coef-plot`: "Ordinal means ranked categories, like a one-to-five rating. And neither coefficient sees the U, which is why you plot the data first." |
| 9 | P3 four terms unexplained | fixed | `corr-fixed`: "Hold temperature fixed, comparing only days equally hot". Ordinal: `coef-plot`, plus "(ranked categories, like a 1-to-5 rating)" on screen. Stratified: `bias-fix`, "a set share from each group, like new and long-time users", plus a screen line. p90: new beat `quantile-interp`, "Pandas goes eighty percent of the way from fourteen to one ninety", with "80% of the way from 14 to 190" under "not in the data:". The 80% and the two neighbours come from a new `p90at` step (position 10.8). |
| 10 | P3 Q9 and Q10 run into their answers | fixed | `plain` split into `plain` and `plain-anchor`, both cut free from the take, with 0.6 s after the question. `uncertain` re-voiced as the card reads it ("…uncertainty in a data finding?"), with 0.6 s after it, and `uncertain-rests` cut free. Cues moved to the new beats. (The take really had 0.36 s and 0.30 s of silence at those breaks. The 0.04 s in the review came from ElevenLabs' character times.) |
| 11 | P3 one element for 13 s and 16 s | fixed | `coef-r`: at "a number for it", question 2's 200 days appear small in the lower right, and "question 2: r = 0.57" is marked on the scale; both clear as the U arrives. `bias-who`: at "the unhappiest", two strips of 40 satisfaction scores each (churned in red, stayed in blue) on a 0 to 10 axis under the bar. They come from a new `strips` step with its own generator (seed 22), so the surveys draw exactly as before. They clear before the survey axis draws. |
| 12 | P3 blank page before Q8; bridge static | fixed | The quantile scene's fade-out wrapper is removed, so the figure holds until the cross-fade (still at 411.5 s shows it). "Next: advanced SQL" draws at "Back to SQL", and "rankings, running totals, the latest row per customer" type in beside it as each is named. |
| 13 | P3 orphaned "12%" | fixed | The slide title is now "New design lifts purchases by about 12%", on one line. The title, the anchor quote and the green sentence set `textWrap: "balance"`. |
| 14 | P3 "Appendix" touches the border | fixed | The back card sits 52px lower (it was 36px), so its label has its own strip under the slide. |
| 15 | P3 zero-drowning dots under the axis | fixed | Zeros are nudged upward only (`CorrScene` `JITTER`, and the same in the new miniature). |
| 16 | P3 "the fix" runs into the axis row | fixed | Moved into the plot's empty lower right (x 1060 to 1500), three short lines that build with `bias-fix`, all well above the tick row. The suggested width of 400 at NOTE_X would have ended 20px past the frame. |
| 17 | P3 red on correct results | fixed | Fences, fence labels, and the p90 marker and label are in INK. "because the traffic dropped" is INK bold. The −20% cell keeps its red mark. |
| 18 | P3 "two modes" over a one-mode chart | fixed | `r-mode` split (first sentence cut free). New beat `r-modes`: "Two peaks in a distribution, like a cluster of small baskets and one of large ones, are a reason to look for two groups." On screen: "two peaks in a distribution? check for two groups". |
| 19 | P3 smaller follow-ups | fixed | `median-both` split. New beat `median-report`: "…the mean when you need a total, like revenue…", plus "the mean for a total: revenue = mean order × orders" on screen. `corr-fixed`: "Other correlations are pure chance, or the cause runs the other way", plus "other links: pure chance, or a cause that runs backwards". `bias-fix`: "For those who left, run an exit survey", plus a screen line. I used an exit survey rather than the suggested weighting: weighting respondents cannot stand in for users who are missing from the frame altogether, unless what drove them away is something you observe. |

## Voice

- **Re-voiced, each beat on its own: 2,091 characters.** P1 and P2 used 1,226:
  `r-var-n` 406, `metric-driver` 281, `r-normal-why` 229, `r-pop-many` 184,
  `outlier-which` 126. P3s used 865 (limit 1,000): `corr-fixed` 174,
  `bias-fix` 171, `median-report` 134, `coef-plot` 133, `r-modes` 120,
  `uncertain` 67, `quantile-interp` 66.
- **Cut free from the kept takes with `narrate --recut`:** `median-both`,
  `coef-curve`, `coef-use`, `bias-bigger`, `quantile-p90`, `quantile-rules`,
  `plain`, `plain-anchor`, `uncertain-rests`, `r-var`, `r-mode`, `r-pop`.
- **`corr-cause`** ("To argue a cause…") was cut from `corr-fixed`'s own file
  with the Data Scientist split tool, because `corr-fixed` had been voiced alone
  and no take says it. To check the tool, I re-split `quantile-cuts`: it gives
  the same audio (lag 0, 0.14% residual, the file re-encoded at VBR), and I
  restored the committed file.
- The recut left the alignment entries of the 42 untouched beats byte-identical.

## Length and checks

- **New length:** 609.1 s (10:09), up from 8:17. 65 beats, 1,454 words,
  143 wpm overall (`npm run cues -- da-statistics-communication`).
- Typecheck and ESLint for the folder: clean. `check:cues`: clean.
  `npm test`: 69 of 69 pass.
- CHECKS_PLACEHOLDER

## `results.json`

Re-run with the private Pyodide 314.0.7 (pandas 3.0.2):

- 42 existing steps are byte-identical, and so is the runtime string.
- Two values changed, each the subject of a finding:
  - `normal.within`, from 68.1/95.5/99.7 simulated to 68.3/95.4/99.7 exact (#7).
  - `population.samples`, from 3 means to 20 (#6). The first three are
    unchanged.
- Ten steps were added: `bias.strips`, `metric.points`, `metric.lost`,
  `outliers.p90at`, `variance.squares`, `variance.sumSquares`,
  `variance.varPop`, `variance.n`, `population.range` and `population.below`.

## Other notes

- The page is consistent with every fix. It defines variance with 1/n as "the
  average squared deviation" and then says pandas uses n − 1, which is now
  exactly what the video shows.
- ElevenLabs' character times put "language?" and "Anchor" 0.04 s apart, but
  the take has 0.36 s of silence there. Finding #10's gap was real only as a
  pause shorter than the series' 0.6 s, not as run-on speech.
- No shared change needed.
