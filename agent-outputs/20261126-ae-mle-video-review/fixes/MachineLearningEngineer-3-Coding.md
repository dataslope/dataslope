# MachineLearningEngineer-3-Coding: fixes

Review: `agent-outputs/20261126-ae-mle-video-review/MachineLearningEngineer-3-Coding.md` (1 P1, 7 P2, 5 P3).

## Findings

| # | Sev | Finding | Status | What was done |
| --- | --- | --- | --- | --- |
| 1 | P1 | "0 / 0 = 0" after the guard | fixed | Once guarded, the line reads "0 / (0 + 10⁻¹²) = 0", with the guard green like the formula's (`CosineScene.tsx`). |
| 2 | P2 | "roughly thirty" said over ×38 | fixed | `q1-row` split in three at its sentence breaks. The two unchanged sentences were cut from take-1 for free. The middle one was re-voiced as "Still roughly forty times slower, …". `check.mjs` now checks that phrase, and its range is 30 to 55. |
| 3 | P2 | Broadcasting: no shape rule, no fix | fixed | On "along its size-one dimensions": "Shapes line up from the right; a missing dimension counts as 1". Then "(2,) → (1, 2) → (3, 2)" as the row is stamped. Over the labels bar, on "a thousand by a thousand", a red "read as (1, 1000)". The two MSEs are attributed to code: "2.29 `pred - y`: the (1000, 1000) square" and "0.24 `pred.ravel() - y`: each row against its own label" (the expression check.mjs computes it with). |
| 4 | P2 | Log-softmax "computed directly", never how | fixed | Two math lines under it: log p = (z − max) − log Σ e^(z − max), and 100 − 1000 − log(e⁰ + e⁻⁹⁰⁰) = −900 (from SOFTMAX.z2 and logSoftmax). "A loss should take the raw scores" moved down. Set at 26 px, so the superscripts stay above 19 px. |
| 5 | P2 | Reservoir: 1/j asserted, factors unlinked | fixed | Under "knocks it out: 1 / j", a soft continuation: "it gets in with k / j, then takes that slot with 1 / k". On "Multiply it through": "So item i survives each one: (j − 1) / j". The chain moved down to make room. |
| 6 | P2 | Metrics: no accuracy, no mask | fixed | Added "accuracy `(y_pred == y_true).mean()`". The mask line is now "each count a mask, summed, no loop: `TP = ((y_pred == 1) & (y_true == 1)).sum()`" (the page's own lines). Each line inks on the word that names it. The empty case moved down a row, and the block now dims to 65% rather than 50%. |
| 7 | P2 | argmax axis 0 turns right answers red | fixed | Axis 0 no longer recolors any cell. The four row answers stay green, and axis 0's answers are the red ↓ under each column, as before. A red band per column was tried first and dropped: it tinted the whole matrix pink. |
| 8 | P2 | "for every single user" left beside the fixed list | fixed | `dim` became `out`, so it leaves as the guard lands. |
| 9 | P3 | Heap kind not said | fixed | The heap is labelled "min-heap of k", with "smallest on top" under it. |
| 10 | P3 | Trees offered for 64-dimensional rows | fixed | Under the badges: "trees: low dimensions" (on "ball tree") and, under HNSW, "approximate: embeddings". `r-knn`'s `pauseAfter` went from 0.9 to 1.5 s, so the second label holds 2.6 s. |
| 11 | P3 | Two rows keep their own label under "every row" | fixed | The apart permutation's seed went from 23 to 10, a derangement relative to the together order. All eight joins now cross. It is a drawing; nothing measured changes. |
| 12 | P3 | "five to fifteen" is the middle 90% | fixed (screen) | "Each line kept with p = 1%, in 9 runs of 10: 5 to 15 lines, not 10". The narration's "anywhere from" was left as voiced: not worth re-voicing a P3. |
| 13 | P3 | Hook listing has the unguarded norm | fixed | On "where they break", the red band (MARK_BAD) lands behind the `E /= np.linalg.norm(E, …)` line, which question 2 pays off. |

13 of 13 fixed.

## Voice

82 characters re-voiced, one beat, on `eleven_v4_turbo` (Drew):

- `q1-row` (old): "The follow-up: what about calling NumPy once per row? Still roughly thirty times slower, because the interpreter still runs once per row. Put the whole step in one array operation, and keep loops for steps that depend on the step before."
- Now three beats:
  - `q1-row`, "The follow-up: what about calling NumPy once per row?" was cut from take-1 for free.
  - `q1-row-ratio`, "Still roughly forty times slower, because the interpreter still runs once per row." was voiced on its own (82 characters).
  - `q1-row-rule`, "Put the whole step in one array operation, and keep loops for steps that depend on the step before." was cut from take-1 for free.

No other beat changed words. One timing change: `r-knn` `pauseAfter` went from 0.9 to 1.5.

## Images

None generated.

## Length

537.6 s (8:58) before, 539.4 s (8:59) after. The split beat's own pauses add 1.2 s, and the k-NN hold adds 0.6 s.

## results.json

`check.mjs` was rerun with the new phrase and range: "ok: the page and the narration agree with the run". Every deterministic value came back identical. The timings came back different, as they do run to run (loop ×122.8 against the committed ×119.8, per row ×37.5 against ×38, top-k ×18.5 against ×14.2, the k-NN ms). All of them sit inside the ranges the narration's words allow. The committed `results.json` (the build's run) was put back, so every number on screen is unchanged. A coordinator snapshot (10:13) briefly captured the rerun's file. The next snapshot has the original again; HEAD's results.json now matches the pre-review one byte for byte.

## Checks

(filled in below)

## Comparisons

(filled in below)
