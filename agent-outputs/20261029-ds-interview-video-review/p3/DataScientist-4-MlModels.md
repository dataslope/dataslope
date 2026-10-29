# DataScientist-4-MlModels: P3 fixes

Review: `agent-outputs/20261029-ds-interview-video-review/DataScientist-4-MlModels.md`
(12 P3s, #8 to #19). P2 fix report: `…/fixes/DataScientist-4-MlModels.md`, which
fixed the second half of #13 on the way. Folder `video/src/videos/ds-ml-models/`.

## P3s

| # | Finding | Result | What changed |
| --- | --- | --- | --- |
| 8 | rounded numbers on screen do not add up | fixed | Screen only. The fit reads `z = −15.25 + 1.034 × radius`, both from `LOGIT.b0`/`b1` (it was typed "1.03"), so radius 15 gives the 0.26 shown. The waterfall's average is `0.503` (`fmt(base, 3)`), so 0.503 + 0.183 − 0.217 + 0.036 − 0.030 = 0.475. The scree bracket reads "96% in two", as said (73% + 22.9%). The narration's "one point oh three" and "point five oh" are left as spoken roundings of the shown values, like the "point one eight" beside them, so no voice was spent. |
| 9 | AdaBoost's most-missed point ringed in green | fixed | Ring in `ACCENT`, as the round-1 misses. The label left the plot: beside the point (either side) it hid a point and crossed a stump, so it sits under the box, in red: "ringed: 35× the weight of the lightest point". |
| 10 | kNN's "k closest" circle leaves neighbors out | fixed | An ellipse through each axis's own scale (`rx` from `bx`, `ry` from `by`), padded 12 px past the fifteenth neighbor, which sits exactly at the radius. All fifteen ringed points are inside. |
| 11 | tumors land on the "score z" axis | fixed | The tumors, their two labels and the sprinkle wait for the axis swap (`radiusAt + 6`, `+14`, `+20`). |
| 12 | the 30-feature grid reshuffles for 22 s | fixed | The lit handful stops changing at "held-out tumors", before the three scores are read. |
| 13 | k-means notes: border and run-on | fixed | Second half was done in P2. "all three start here" now sits centered above the dashed ring, inside the plot. |
| 14 | text set at 18px | fixed | All six to 19 (ticks: Gini, elbow, silhouette k labels, waterfall) or 20 ("distinct values", "exact Shapley values…"). Also the one-hot table's header row in the quick round (`RapidScene`, 18px, not in the report) to 19. No text under 19px remains in the folder. |
| 15 | the tree's cut line hangs into empty space | fixed | It stops just under the flowers' axis until "Slide a cut", then eases down to the Gini chart's floor as the chart arrives. |
| 16 | PCA's components and "space empties out" asserted, not shown | fixed | Under the projection, from "projects the data": "component 1 = 0.58 petal length + 0.57 petal width + 0.52 sepal length − 0.27 sepal width", from `PCA.loadings`. For the curse, "As dimensions grow, space empties out" now plays over its own figure on the same axes: `CURSE.shell` (the share of a cube within 0.1 of its surface, 1 − 0.8^d) drawn on "As dimensions grow", labelled on "space empties out" with "by 20 dimensions, 99% of it: the middle is empty", then cross-faded to the nearest/farthest axes as "Scatter a thousand random points" is said. |
| 17 | "test error" unnamed; the demo contradicts "boosting can overfit noise" | fixed | Screen: "test error (mean squared), on 2,000 new points; the noise alone costs 0.122" (`ENS.mse.noise`). Voice: `boost` split before its last sentence, which became `boost-noise`, re-voiced: "On this wave, the two end up about level. In general, boosting is often the more accurate, but it can overfit noisy data, where bagging holds up." The 0.180 and 0.175 are marked on "about level". |
| 18 | the churn table arrives 11 s before it is introduced | fixed | The caption "made up for this video: 1,500 customers" arrives with the table, and its words are marked on "Here's a made-up churn table". |
| 19 | smaller gaps against the page | fixed | All five, in voice. Q1: `logit` split after the question; `logit-how` re-voiced "It weights the features and adds them up into a score, …". Q2: new beat `linear-var` between `linear` and `linear-ml` (split before "Logistic regression stays inside"): "And its errors can't have the constant variance that least squares assumes.", on screen in red with "which least squares assumes". Q5: new beat `forest-sqrt` between `forest` and `forest-why` (split after "here five of thirty"): "The usual default is about the square root of the feature count.", on screen "the usual default: about √30 ≈ 5.5" (the page: √p for classification). Q12: new beat `r-gen-more`: "With plenty of labels, discriminative models usually win.", on screen under the generative lines. Q15: `r-select` split before its last sentence; `r-select-rfe` re-voiced "Asked for five of the thirty tumor features, recursive elimination keeps these.", on screen "RFE (recursive feature elimination), asked for 5 of 30, keeps:". |

### Found and fixed on the way (not in the report)

- **Tabular hyphens.** Three whole spans carried `TABULAR` over hyphenated words, which set "held-out", "k-means", "five-fold", "one-hot" and "cross-validation" with digit-wide hyphens ("held - out"): the forest's "accuracy on 171 held-out tumors", the permutation-importance line, and `RapidScene`'s `Line` (every right-column line of the quick round). `TABULAR` removed from those spans; the one number that needs it in the AdaBoost label keeps it on its own span.

## Voice

- **586 characters re-voiced**, six beats, each on its own (`narrate --only`, no `--force`, no new take): `logit-how` 166, `linear-var` 75 (new), `boost-noise` 145, `forest-sqrt` 64 (new), `r-gen-more` 57 (new), `r-select-rfe` 79.
- Five splits at sentence breaks, no voice: `logit` → `logit` + `logit-how`, `linear` → `linear` + `linear-ml`, `boost` → `boost` + `boost-noise`, `forest` → `forest` + `forest-why`, `r-select` → `r-select` + `r-select-rfe`.
- **How the kept pieces were cut: from the takes.** `narrate --recut` refuses the folder (its takes predate per-beat edits), so first each split was cut from the beat's own file with `split.mjs` (alignment and length identical on an untouched re-cut, one extra encode: `r-scale` came back the same 19.33 s and alignment, 27 dB SNR against the committed MP3). Then, per the coordinator, every kept piece was re-cut from its kept take instead, with `$S/DataScientist-4-MlModels/p3/tools/recut-takes.mjs` (after `DataScientist-0-Interview/p3/tools/recut-take.mjs`): narrate's own `--recut`, unchanged, on a scratch root per take whose script is the take's own text split into the current beats (stretches no current beat matches become throwaway fillers; a scene beat follows "\n\n" in a take, as in `takeText`). A first run with each parent unsplit proved the take is its master: `logit`, `linear`, `boost`, `forest` and `r-select`, and every other beat still cut from takes 1, 2, 3 and 6 (`hook`, `plan`, `logit-in`, `logit-fit`, `tree-in`, `tree`, `bag-in`, `bag`, `knn-in`, `knn-k`, `kmeans-in`, `rapid-in`, `r-gen`, `r-encode`, `next`), came back **byte for byte** identical, alignment included. The split run then wrote `logit`, `linear`, `linear-ml` (take 1), `boost` (take 2), `forest`, `forest-why` (take 3) and `r-select` (take 6): first-generation cuts, alignment identical to the own-file cut except `linear-ml`'s last characters, 5 ms apart.
- The P2 pass's own-file splits (`tree-gini`, `tree-stop`, `ada`, `adaboost`) are still one encode from their takes (the take run shows their MP3s differ, alignment identical except `adaboost`). Left as they are: not this pass's beats, and the coordinator accepts the extra encode. The same tool would re-cut them from takes 2 and 3 in one run if wanted.

## Length and checks

CHECKS

## Shared-kit recommendation

None needed for these P3s. One suggestion: `TABULAR` on a whole span is easy to misuse (three spans here). A `Num` wrapper in the editorial kit that applies it to a number alone would make the right use the easy one.
