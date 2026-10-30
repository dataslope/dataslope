# DataScientist-4-MlModels: P2 fixes

Review: `agent-outputs/20261029-ds-interview-video-review/DataScientist-4-MlModels.md`
(1 P1, fixed in `53eda7cd`; 6 P2s; 12 P3s). Folder `video/src/videos/ds-ml-models/`.

## P2s

| # | Finding | Result | What changed |
| --- | --- | --- | --- |
| 2 | k-means centers finish moving before the narration describes the move | fixed | The moves are cued to the sentence about this run: `moves = [jumpAt, settleAt - 20]`, `recolor = [assignAt + 2, jumpAt + 16, settleAt - 4]` (the whooshes follow). The centers now sit in the ringed blob through "These three centers all start in one group", jump on "two of them jump" (pass 2), and settle on "it settles" (pass 3). So that the recipe sentence does not play over a still frame, each center's target (the mean of its pass-1 points) is drawn as a dashed ring on "move each center to the mean" and goes when the center lands on it. |
| 3 | "fits each new tree to the gradient of the loss" | fixed | `ada` was split at its sentence breaks into `ada` (the question), `gb` and `adaboost`. Only `gb` was re-voiced: "Gradient boosting fits each new tree to the negative gradient of the loss, called the pseudo-residuals. For squared error, they're just the residuals, but any differentiable loss will do." On screen: "each new tree fits the **negative gradient** of the loss" (yellow mark on the words), "the pseudo-residuals; for squared error, the residuals", "but any differentiable loss will do". |
| 4 | the gradient-boosting half of question 6 plays over an empty frame | fixed | From "Gradient boosting fits" the left box draws question 4's sine wave: its 60 points, the blue fit after one tree, and the red residual sticks (`ENS.fit1`) on "the negative gradient", titled "question 4's sine wave: the fit after one tree" and labelled under the box "red: the negative gradient, what the next tree is fitted to". It fades out 8 frames before "AdaBoost", whose points pop into the same box. |
| 5 | the forest's accuracy bars start at 85% | fixed | Each score is a dot (r 13) on the 85-100% axis with its value beside it, no bar and no track. All three print to one decimal: 90.6%, 93.0%, 95.3%. |
| 6 | SHAP offered as the cure for impurity bias; permutation importance never shown | fixed | New beat `shap-perm` after `shap-values`: "It still gives the ID thirteen percent, because SHAP explains the model, and this forest does use the ID. To ask whether a feature helps on new customers, shuffle it on held-out rows and measure how much accuracy drops. That's permutation importance, and it gives the ID seven percent, the plan fifty-three." On screen the SHAP bar's "13%" for the ID is marked on "thirteen percent", and a line under the shares panel arrives on "permutation importance": "permutation importance, on held-out rows: plan 53% · region 22% · tenure 19% · ID 7%", shares of `SHAP.permutation` (already in `results.json`) like the bars above it, with "ID 7%" and "plan 53%" marked as they are said. |
| 7 | questions 3 and 8 skip the standard follow-ups | fixed | Q3: `tree-gini` split before "Then the tree repeats" (`tree-stop`), and a new beat `tree-measures` between them: "Entropy, the measure behind information gain, picks the same cut here. A regression tree picks the cut that shrinks the variance most." `check.mjs` now runs the same sweep scored by entropy: it bottoms out at 1.75 (weighted entropy 0.310 bits, gain 0.69), and scikit-learn's own entropy stump over all four measurements also picks petal width 1.75. A 22px line under the Gini chart: "entropy (information gain) also picks 1.75; a regression tree cuts variance" (the number from `TREE.entropy`). Q8: `kmeans-k` split before "And run several starts" (`kmeans-starts`), and a new beat `kmeans-limits` between them: "It assumes round clusters of similar size, and outliers drag the means toward them." Under the plot, two 22px lines of their own: "assumes round clusters of similar size; outliers drag the means", then "run several starts, or k-means++: a bad start can settle wrong". |

### P3s fixed on the way

- **#13, second half** (the k-means++ note ran on from the pass counter as one line): fixed by #7's layout. The counter "300 points · pass 3 · settled" now heads the plot, and the two caveats each have a line under it. The first half ("all three start here" straddling the plot's border) is left.

## Voice

- **711 characters re-voiced**, four beats, each on its own: `tree-measures` (134), `gb` (187), `kmeans-limits` (83), `shap-perm` (307). No take re-recorded, no `--force`.
- Three splits at sentence breaks cost nothing: `tree-gini` → `tree-gini` + `tree-stop`, `ada` → `ada` + `gb` + `adaboost`, `kmeans-k` → `kmeans-k` + `kmeans-starts`. `narrate --recut` refuses this video (its takes 3-6 predate earlier per-beat edits, such as "I D" → "ID", so they no longer match the script), so each split was cut from the beat's own voiced file by `narrate.mjs`'s own cutter, run unchanged on a scratch root whose one "take" is that file (`$S/DataScientist-4-MlModels/tools/split.mjs`). `gb` was then re-voiced over its cut.

## Length and checks

- **10:24 (624.2 s)**, from 9:41 (581.3 s): 40 beats, 1,484 words, 143 wpm. The four new sentences are 2.5 to 2.8 words a second.
- Facts: `check.mjs` re-run (Pyodide 314.0.7, scikit-learn 1.8.0); `results.json` is byte-identical apart from the new `tree.entropy`.
- typecheck and eslint: no errors in `src/videos/ds-ml-models/`.
- `npm test`: 59/59.
- `check:cues`: nothing in ds-ml-models (its 9 failures are all in `ds-probability`, mid-edit by its fixer).
- `check:sync`: pass, 40 beats, worst +0.04 s (`gb`).
- `check:mix`: pass. Effects 29.1 LU under the narration; where both sound, speech a median 28.8 dB above them, closest 9.5 dB (3:16.0, unchanged scenes).
- `check:motion`: pass, 10:24.3 checked; nothing still for 3 s (seven holds of 2.0 to 2.5 s; the one in a changed stretch is 2.0 s, 5:28.5 in k-means' recipe, before the target rings arrive).
- `check:frames`: not run (no arrow, illustration or ERD changed).
- Stills, each looked at: 145, 154 (tree, entropy line, finished frame), 235 (forest dots), 246, 252, 255, 270 (gradient boosting figure, the cross-fade, AdaBoost finished), 336, 341, 344.5, 347.5, 381.5 (k-means targets, start, jump, settled, finished with caveats), 513, 530.5 (SHAP 13% mark, finished with permutation line).

## Noticed, left

- The page (`machine-learning.mdx`, "bagged feature importance and SHAP values") does not mention permutation importance; the video now adds it as the follow-up. The page is not wrong, only shorter.
- On the first stills the forest's full-width track ran through each score's label and the Gini chart shrunk for the entropy line put "0.11, the lowest" on the chart's base line; both were redone (no track; the Gini chart moved up about 14 px instead of shrinking) and checked again.
- Remaining P3s untouched: 1-decimal/rounding (#8), AdaBoost's green ring (#9), kNN circle (#10), tumors on the z axis (#11), the forest grid's flicker (#12), "all three start here" on the border (#13, first half), 18px text (#14), the tree's hanging cut line (#15), PCA loadings and the curse's empty frame (#16), boosting's noise claim (#17), the churn table's early arrival (#18), the smaller page gaps (#19).
- Kit suggestion: `narrate --recut` could cut one beat's own file into pieces when the takes no longer match the script (what `tools/split.mjs` does here), since several videos in this series have stale takes.
