import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Generalization and evaluation" (16:9), Part 1 of the Machine
 * Learning Engineer interview prep videos
 * (agent-outputs/20261120-1400-machine-learning-engineer-interview-video-plan.md,
 * "1, Generalization and evaluation"), after
 * content/interview/machine-learning-engineer/ml-fundamentals.mdx. It answers
 * the page's twelve questions on generalization and evaluation, and
 * statistics-and-probability.mdx's "Explain the bias–variance decomposition."
 * together with the first: ten worked through, numbered aloud and read in the
 * page's words, then two quickly (11 and 12, numbered on screen only).
 *
 *   1. "Explain the bias–variance trade-off." with the statistics page's
 *      "Explain the bias–variance decomposition." ("bias"; read as one
 *      question, "…trade-off, and its decomposition").
 *   2. "What is overfitting and how do you combat it?" ("fit").
 *   3. "What is underfitting?" ("under").
 *   4. "L1 vs L2 regularization?" ("reg"; read "L one versus L two").
 *   5. "Why split data into train / validation / test?" ("split").
 *   6. "What is data leakage, and how do you prevent it?" ("leak").
 *   7. "What is k-fold cross-validation and when do you use it?" ("cv").
 *   8. "What are precision, recall, and F1-score?" ("pr").
 *   9. "What is ROC-AUC and when does PR-AUC matter more?" ("auc").
 *   10. "What is class imbalance and how do you handle it?" ("imb").
 *   Quickly ("rapid-in"): 11. "Explain early stopping." ("r-early");
 *   12. "What is the difference between RMSE, MAE, and R²?" ("r-metrics").
 *
 * The page asks them in another order. Here they run as one argument in three
 * movements: why a model fails on data it hasn't seen (1 to 4), how to measure
 * that honestly (5 to 7), and which number to report (8 to 10). Early stopping
 * goes to the quick round because Part 5 argues it again, with dropout and L2,
 * as a neural network's regularizer.
 *
 * Opening and bridge. It opens on the plan's 0 → 1 idea (language models did
 * not retire classical ML, and every ML round first tests whether a model
 * works on unseen data), shown rather than said first: a model of pure noise
 * that cross-validates at 85%. Question six comes back to it and finds the
 * leak. It never says "in the last video". It closes on the plan's 1 → 2
 * bridge into the models themselves.
 *
 * Overlap with the Data Scientist series (ds-ml-evaluation answers several of
 * the same questions): none of its worked examples is reused. It used a sine
 * and polynomials for bias and variance, the diabetes set for L1 and L2, the
 * breast cancer set for folds and two Gaussian classes at 2% for the metrics.
 * This video measures the decomposition itself with trees,
 * uses the page's own blocks and data, Friedman #1, and its own simulations,
 * and argues the engineer's side: what ships, what it costs at serving time,
 * what a fold must not split, what a review queue can hold, and what class
 * weights do to probabilities something downstream reads.
 *
 * On screen, beat by beat (for phase 2; nothing is built yet). Colors keep the
 * series' meanings (interview.tsx): red the trap or the error, green the right
 * answer, yellow what the narration points at, blue data. The flamingo hero
 * stands beside the opening and the close; the three spots are things the
 * narration names: the coin ("hook", "split-sim"), the target with its darts
 * ("bias-dart") and the payment card ("pr-cost").
 *   hook: a block of tiny cells, "200 rows × 10,000 columns" in blue, with a
 *     label column of 0s and 1s and the coin spot beside it; "Cross-validated
 *     accuracy" over a large "85%" in ink. hook-why: a dashed line "50%: a
 *     coin flip" under it, and the 85% turns red on "Nothing". hook-round:
 *     "Does it work on data it hasn't seen?" as the headline, the flamingo
 *     beside it.
 *   plan: three ruled groups with their numbers, each lit as named: "Why
 *     models fail on new data" (1 to 4), "Measuring it honestly" (5 to 7),
 *     "Which number to report" (8 to 10); "Quick: 11, 12" in grey.
 *   bias: question card. bias-def: one equation in words, built term by term:
 *     "Expected error = bias² + variance + noise", "noise" in grey (nothing
 *     removes it).
 *   bias-sim: the curve (ink) with one training set's fifty points (blue), a
 *     stump's two-step fit and a depth-6 tree's jagged fit drawn over it.
 *   bias-dart: at x = 0.25, where the curve is 1, a number line from 0 to 2
 *     with the target marked: sixty stumps' predictions (bias.dart["1"].first)
 *     as a tight cluster near 0.65, a yellow bracket from their mean to the
 *     target on "bias"; sixty depth-6 trees' predictions (dart["6"]) spread
 *     around 0.97, a yellow span over their spread on "variance". The
 *     target spot beside the line.
 *   bias-sum: depth 1 to 12 on the x axis: bias² falling, variance rising
 *     (dashed), noise a flat grey band at 0.09, their sum solid; depth 3, the
 *     minimum, ringed green. Beside it depth 1's stacked bar, 0.07 + 0.04 +
 *     0.09 = 0.20, labelled as said; the measured error dotted over the sum
 *     (they agree to within 0.002, check.mjs).
 *   bias-data: two pairs of bars, n = 50 and n = 500: depth 6's variance 0.08
 *     → 0.03 (green), the stump's bias 0.07 → 0.08 (ink: not an error, just
 *     unmoved). "More data cures variance, not bias".
 *   bias-real: "What you can see: training error and validation error", the
 *     bridge to the next figure.
 *   fit: question card. fit-curves: Friedman #1 learning curves for an
 *     unpruned tree: training error flat at 0 (blue), validation (ink) falling
 *     from 25.6 at 30 rows to 7.7 at 2,000. fit-gap: the gap shaded yellow,
 *     "variance", an arrow on its right end, "still closing". Noise floor
 *     dashed at 1.0.
 *   fit-fix: the remedies as a ruled list, each inking on its words.
 *   under: question card swaps to 3. under-line: the straight line's two
 *     curves beside the tree's, meeting by a few hundred rows and flattening
 *     near 7, the level bracketed yellow, "bias".
 *   under-fix: the remedies; then the line's error as two bars, 6.9 → 4.6
 *     (green), labelled "+ x1·x2, + x3²".
 *   reg: question card. reg-run: the page's block, twenty coefficients as two
 *     rows of bars: ridge (twenty bars, the five informative tall in blue, the
 *     fifteen useless as slivers under 0.25, grey) and lasso (the same five
 *     blue, fifteen "0" marks). reg-why: two small penalty curves, |w| and w²,
 *     with the pull at a small weight drawn as an arrow: L2's shrinking to
 *     nothing at zero, L1's the same length all the way; a weight dot sliding
 *     onto 0 on L1's. reg-prod: "5 features to compute at serving time, not
 *     20" in green; then two correlated features, lasso keeping one, elastic
 *     net both.
 *   measure-in: the plan's three groups again, the second lit.
 *   split: question card; one bar split 60 / 20 / 20, "Train 120",
 *     "Validation 40", "Test 40" (the page's block), each inking as named; a
 *     lock on Test, "touched once".
 *   split-sim: the coin spot; the label column becomes coin flips; fifty
 *     settings as fifty dots on a validation-accuracy line, the best ringed
 *     (split.first).
 *   split-result: two histograms of the 200 repeats: winners' validation
 *     scores (red, centred near 64%) and the same winners' test scores
 *     (blue, near 50%); a dashed "50%: a coin flip".
 *   split-prod: "Reported: 64%" (red) and "In production: 50%"; then a
 *     timeline, past → future, cut into train, validation, test in that order.
 *   leak: question card. leak-hook: the opening's block: twenty columns lit
 *     yellow down every row, including the fold held out (those cells red),
 *     "85%" red. leak-fold: the selection redrawn inside one fold's training
 *     rows only (green), "54%", beside "54.5%: always guess the commoner
 *     label".
 *   leak-forms: a small row, "Scaler fitted on all rows: 80% / 80%" (ink).
 *   leak-fix: the fixes as a list: "One pipeline, fitted on the training
 *     split", "Audit for proxies of the label" with a refund flag in a fraud
 *     model, and a total computed from later data (both red, the leaks).
 *   cv: question card; five outlined fold boxes rotating, the held-out one
 *     yellow. cv-run: each fold's score appears as it is held out, 75, 77.5,
 *     87.5, 77.5, 80; then "79.5% ± 4.3", the page's printed line in mono
 *     (cv.printed), set as the block's output.
 *   cv-when: two short lines, "Scarce data, model comparison" (green) and
 *     "A training run that takes days: one hold-out" (green too: both are
 *     right, each in its case).
 *   cv-groups: sixty users as sixty short columns of eight dots; shuffled
 *     folds colour a user's dots both train and validation (red), "97%";
 *     grouped folds keep each column whole (green), "50%".
 *   cv-keep: a time series with forward folds (train left, validate to its
 *     right), under "User, session, patient: one fold each".
 *   score-in: the plan's third group lit.
 *   pr: question card; the page's confusion matrix, TP 3, FN 1, FP 1, TN 3,
 *     with precision (the TP over the predicted-positive column) and recall
 *     (the TP over the actually-positive row) traced as named.
 *   pr-page: "F1 = harmonic mean", then "Precision 0.75 · Recall 0.75 · F1
 *     0.75".
 *   pr-thresh: the fraud model's precision and recall against the threshold
 *     (fraud.sweep), two lines crossing; markers at 0.5 (84% / 24%) and at
 *     0.1 (35% / 54%), each lit as said.
 *   pr-cost: "Precision: when false alarms cost", "Recall: when misses
 *     cost"; then the card spot, "False alarm: a good customer blocked" and
 *     "Miss: the money lost" beside it, neither green.
 *   pr-capacity: "Top 1,000 alerts a day: 466 of 995 caught" in green, the
 *     top 1,000 scores lit on the threshold line.
 *   auc: question card (read "ar-oh-see ay-you-see" and "pee-ar ay-you-see";
 *     the screen says ROC-AUC and PR-AUC); the fraud model's ROC curve
 *     (fraud.roc) over the diagonal, its area shaded blue, "0.91".
 *   auc-fraud: a marker at a false positive rate of 1%: "1,012 false alarms
 *     · 534 frauds caught" in red.
 *   auc-pr: the PR curve (fraud.pr) beside it, "0.46", with a dashed chance
 *     line at 0.01, "the fraud rate"; "Report PR-AUC" in green.
 *   imb: question card; "Call everything legitimate: 99.0% accurate, 0
 *     caught" in red.
 *   imb-fix: the remedies as a ruled list, each inking as named.
 *   imb-trap: a small table, plain against balanced weights: recall at 0.5,
 *     24% → 84% (yellow); average predicted probability, 1% → 22% (red, the
 *     true rate 1% beside it); PR-AUC, 0.46 → 0.32 (red).
 *   imb-prod: "Recalibrate" and "Resample training only; test keeps 1%" in
 *     green.
 *   rapid-in: RapidFire, rows 11 and 12.
 *   r-early: the small network's training and validation loss by epoch
 *     (early.train, early.validation), "patience" as a bracket of epochs after
 *     the best so far.
 *   r-early-plateau: patience 20's stop at epoch 68, keeping epoch 48, in red
 *     ("stopped on a plateau"); the best epoch, 168, in green (a patience of
 *     50 reaches it).
 *   r-metrics: the page's chart redrawn from errors.sweep: MAE and RMSE as one
 *     residual of fifty grows from 0 to 40 (RMSE 2.7 → 6.3, MAE 2.2 → 3.0).
 *   r-r2: "R² = 0: the mean's own score" and "Below 0: worse than the mean";
 *     "a share of variance explained" struck in red on "no share" (the page's
 *     caution: misleading out of sample).
 *   next: the plan's three groups, all lit, the flamingo returning;
 *     <NextLine> "Next: models and how they learn" on "Next".
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. check.mjs runs every one in Pyodide 314.0.7 (Python 3.14.2,
 * scikit-learn 1.8.0, NumPy 2.4.6), the runtime the page's blocks run in, into
 * results.json, which data.ts reads, and fails if a page stops saying what is
 * quoted or the narration stops saying what was measured. Seeded throughout:
 *   - hook, leak-hook, the video's own simulation: 200 rows of 10,000 random
 *     columns, labels drawn at random (109 ones). Picking the 20 columns most
 *     related to the label on all 200 rows, then cross-validating (stratified
 *     five-fold, ten repeats) scores 85.3% ("eighty-five"); the same pick
 *     made inside each fold scores 54.0%, about the 54.5% that always
 *     guessing the commoner label gets. Over twenty other draws (plain
 *     five-fold), leaky 76.5% to 88%, honest 45% to 60.5% (leak.draws).
 *   - leak-forms: the page's own example, a scaler fitted on every row, on the
 *     page's own data and five folds: 80.0% leaked and 80.0% in a pipeline.
 *     The refund flag and the total from later data are the video's own
 *     examples of the page's "a feature that's a proxy for the label".
 *   - bias: the page's definitions and the statistics page's formula (noise
 *     "you can't remove"). The simulation: sin(2πx), noise sd 0.3, five
 *     hundred training sets of fifty points, trees of depth 1 to 12. Depth 1:
 *     bias² 0.068, variance 0.039, noise 0.09, sum 0.197 ("point two oh",
 *     said with its parts rounded to two places: 0.07 + 0.04 + 0.09); depth
 *     3 lowest at 0.143; the measured error matches the sum within 0.002 at
 *     every depth. At x = 0.25 (truth 1), stumps predict 0.65 on average (sd
 *     0.09). Ten times the data (500 points, 200 sets): depth 6's variance
 *     0.082 → 0.026 ("point oh eight to point oh three"); the stump's bias²
 *     0.068 → 0.079 ("doesn't fall").
 *   - fit, under: Friedman #1 (3,000 rows, noise sd 1), ten shuffles a size,
 *     30% held out. Unpruned tree: training error 0 at every size, validation
 *     25.6 at 30 rows to 7.7 at 2,000, still falling. Straight line: 6.9 and
 *     6.8 at 2,000 (from 6.4 and 7.6 at 120: "met by a few hundred rows").
 *     Trained on 2,000 and tested on 1,000, the line scores 6.89, and 4.61
 *     with x1·x2 and x3² added. Remedies: the page's lists.
 *   - reg: the page's block. Ridge keeps 20 of 20 (the fifteen uninformative
 *     at most 0.22 in size, median 0.03: "below a quarter"); lasso keeps 5,
 *     exactly the five informative columns (make_regression's coef=True,
 *     checked). L2's pull is proportional to the weight (the derivative of
 *     w² is 2w) and L1's is constant (of |w|, ±1), the standard reason lasso
 *     lands on exact zeros, which the page calls its "geometry". Elastic net:
 *     the page. Lasso keeping one of a correlated group arbitrarily is the
 *     standard behaviour, said without a number.
 *   - split: the page's block prints 120 / 40 / 40. The simulation: coin-flip
 *     labels on the page's 200 rows and the same split, fifty trees with
 *     random settings, the best kept on validation; over 200 repeats the
 *     winner averages 64.3% on validation and 50.1% on test. Splitting by
 *     time is the standard practice for time-ordered data, said as advice.
 *   - cv: the page's block prints "CV accuracy: 0.795 ± 0.043", folds 75,
 *     77.5, 87.5, 77.5 and 80. The page's "when". The simulation: sixty
 *     users, eight rows each, the label the user's own coin flip; a forest
 *     scores 97.1% with shuffled folds and 50.4% grouped by user. "k folds
 *     cost k runs" is arithmetic.
 *   - pr, pr-page: the page's definitions and block (TP 3, FP 1, FN 1, TN 3;
 *     all three 0.75). pr-thresh to imb, the video's own simulation:
 *     200,000 transactions (make_classification, 20 features, 1% positive,
 *     no label noise), logistic regression trained on half, scored on the
 *     other 100,000 (995 frauds). At 0.5, precision 84.4% and recall 24.4%;
 *     at 0.1, 34.5% and 53.7%, a false positive rate of 1.02%: 1,012 false
 *     alarms against 534 caught ("nearly twice"). The top 1,000 scores hold
 *     466 frauds. ROC-AUC 0.907, PR-AUC (average precision) 0.461, chance
 *     0.01. Everything legitimate: 99.0% accurate. Balanced class weights:
 *     recall at 0.5 84.3%, mean predicted probability 22.1% (plain 0.96%),
 *     PR-AUC 0.322. "A thousand alerts a day" is the video's assumption,
 *     said as one ("if reviewers can check").
 *   - auc: the page's definition (TPR against FPR; the AUC as the chance a
 *     random positive outranks a random negative; "FPR stays low even with
 *     many false positives"). A random ranking's PR-AUC is the positive rate,
 *     so it moves with the base rate: arithmetic.
 *   - imb: the page's remedies, SMOTE among them (glossed: it makes synthetic
 *     minority rows between neighbours; not run here, imbalanced-learn is not
 *     in Pyodide). Recalibrating after reweighting, and resampling only the
 *     training set, are standard practice, said as advice.
 *   - r-early: the page's definition (patience, best weights restored). The
 *     video's own small network: one hidden layer of 300 units, no penalty,
 *     150 rows of Friedman #1, 1,000 validation rows, 400 epochs. Patience
 *     20 stops at epoch 68 keeping 48 (loss 8.0, a plateau); the best epoch
 *     is 168 (6.3), which a patience of 50 finds.
 *   - r-metrics: the page's definitions, its R² caution ("most natural for
 *     ordinary least squares with an intercept"; "can be negative"), and its
 *     chart's sweep, redrawn with this video's own seed: MAE 2.2 → 3.0, RMSE
 *     2.7 → 6.3. Training on squared error predicts the conditional mean, on
 *     absolute error the median: the standard result, said without a number.
 *
 * Written for Drew's ear: ML, ROC (the curve), RMSE and MAE in plain caps, read
 * as letters; SMOTE said as a word ("smote", for the lexicon); ROC-AUC and
 * PR-AUC respelled as the README asks, "ar-oh-see ay-you-see" and "pee-ar
 * ay-you-see", which the cue phrases quote; "L one", "L two" and "F one" as
 * words, R² as "R squared"; no sentence opening "A" before an initialism;
 * numbers as they are said.
 */
export const script: NarrationScript = {
  id: "mle-generalization",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Two hundred rows, ten thousand columns of random numbers, and a label that's a coin flip. Cross-validated, this model scores eighty-five percent.",
      pauseAfter: 0.8,
    },
    {
      id: "hook-why",
      text: "Nothing in it can predict anything. Question six finds where the eighty-five came from.",
      pauseAfter: 0.6,
    },
    {
      id: "hook-round",
      text: "Language models didn't retire classical machine learning, and the first thing an ML round still tests is whether a model works on data it hasn't seen.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "Twelve questions. Ten are worked through: why models fail on new data, how to measure that honestly, and which number to report. Two are quick.",
      pauseAfter: 0.7,
    },

    // ── 1. Bias and variance ──────────────────────────────────────────────
    {
      id: "bias",
      scene: true,
      text: "Question one. Explain the bias-variance trade-off, and its decomposition.",
      pauseAfter: 0.5,
    },
    {
      id: "bias-def",
      text: "Bias is error from a model too simple for the pattern; variance, from fitting one training sample's quirks. With noise no model can remove, the three sum to the expected squared error on new data.",
      pauseAfter: 0.7,
    },
    {
      id: "bias-sim",
      text: "A simulation can measure all three. Draw five hundred training sets of fifty points from a known curve, and fit a tree to each.",
      pauseAfter: 0.5,
    },
    {
      id: "bias-dart",
      text: "At one point on the curve, the stumps' predictions bunch together, off target: that's bias. Trees six deep centre on the target, and scatter: that's variance.",
      pauseAfter: 0.7,
    },
    {
      id: "bias-sum",
      text: "Averaged along the curve, a stump's error is point two oh: point oh seven bias, point oh four variance, point oh nine noise. Depth three is lowest, at point one four, and deeper trees climb back up, almost all of it variance.",
      pauseAfter: 0.8,
    },
    {
      id: "bias-data",
      text: "The follow-up is what fixes each. Give the depth-six tree ten times the data, and its variance falls from point oh eight to point oh three. The stump's bias doesn't fall at all.",
      pauseAfter: 0.7,
    },
    {
      id: "bias-real",
      text: "On a real problem there's one dataset and no known curve, so you read the two from training and validation error.",
      pauseAfter: 0.7,
    },

    // ── 2, 3. Overfitting and underfitting ────────────────────────────────
    {
      id: "fit",
      scene: true,
      text: "Question two. What is overfitting, and how do you combat it? It's a model that has memorized its training data: low training error, high validation error.",
      pauseAfter: 0.5,
    },
    {
      id: "fit-curves",
      text: "Learning curves show it. On a standard benchmark with ten inputs, five of them noise, an unpruned tree has zero training error at every size, and its validation error is still falling at two thousand rows.",
    },
    {
      id: "fit-gap",
      text: "The gap is variance, and a gap still closing says more data will help.",
      pauseAfter: 0.6,
    },
    {
      id: "fit-fix",
      text: "So get more data, cut capacity, regularize with L one, L two or dropout, augment the data, or stop early.",
      pauseAfter: 0.7,
    },
    {
      id: "under",
      text: "Question three. What is underfitting? Both errors high, and close together.",
      pauseAfter: 0.5,
    },
    {
      id: "under-line",
      text: "A straight line on the same data has two curves that meet within a few hundred rows, both near seven, and more rows won't move them.",
      pauseAfter: 0.6,
    },
    {
      id: "under-fix",
      text: "It needs more capacity, longer training, less regularization, or better features. Add a product of two inputs and a square, and its error falls from six point nine to four point six.",
      pauseAfter: 0.8,
    },

    // ── 4. L1 and L2 ──────────────────────────────────────────────────────
    {
      id: "reg",
      scene: true,
      text: "Question four. L one versus L two regularization? Both add a penalty on the weights to the loss. They differ in what happens to a small weight.",
      pauseAfter: 0.5,
    },
    {
      id: "reg-run",
      text: "The page's run has twenty features, five of them informative. Ridge, the L two penalty, keeps all twenty: the useless ones shrink below a quarter, but none reaches zero. Lasso, the L one penalty, keeps exactly the five.",
      pauseAfter: 0.7,
    },
    {
      id: "reg-why",
      text: "L two pulls in proportion to the weight, so the pull fades as the weight shrinks. L one pulls just as hard all the way down, so a weight that isn't earning its keep lands on zero.",
      pauseAfter: 0.7,
    },
    {
      id: "reg-prod",
      text: "In production that's a saving: five features to compute at serving time, not twenty. With correlated features, lasso keeps one arbitrarily, and elastic net, which mixes both penalties, keeps the group.",
      pauseAfter: 0.8,
    },
    {
      id: "measure-in",
      text: "Every fix so far was judged on validation data. Next, how to keep that judgement honest.",
    },

    // ── 5. Train, validation, test ────────────────────────────────────────
    {
      id: "split",
      scene: true,
      text: "Question five. Why split data into train, validation and test? Train fits the parameters, validation chooses between models and settings, and test is touched once, for an honest final estimate.",
      pauseAfter: 0.6,
    },
    {
      id: "split-sim",
      text: "Choosing is what makes a score optimistic. Make the labels coin flips, so every model is worth fifty percent. Try fifty settings, and keep the best on the forty validation rows.",
    },
    {
      id: "split-result",
      text: "Over two hundred repeats, the winner averages sixty-four percent on validation, and fifty on the test set.",
      pauseAfter: 0.8,
    },
    {
      id: "split-prod",
      text: "Tune on the test set, and you report sixty-four and ship fifty. And when the data has time in it, split by time: train on the past, and test on what came after.",
      pauseAfter: 0.8,
    },

    // ── 6. Leakage ────────────────────────────────────────────────────────
    {
      id: "leak",
      scene: true,
      text: "Question six. What is data leakage, and how do you prevent it? It's information the model won't have at prediction time getting into training, so offline scores rise, and production ones collapse.",
      pauseAfter: 0.5,
    },
    {
      id: "leak-hook",
      text: "Here's the eighty-five from the opening. Before cross-validating, it picked the twenty columns most related to the label using every row, including the ones each fold then held out.",
    },
    {
      id: "leak-fold",
      text: "Make that pick inside each fold, on its training rows, and it scores fifty-four, about what always guessing the commoner label gets.",
      pauseAfter: 0.8,
    },
    {
      id: "leak-forms",
      text: "The page's example, a scaler fitted on every row, changes nothing on its own data: eighty percent either way. What leaks hard is anything that saw the label.",
      pauseAfter: 0.6,
    },
    {
      id: "leak-fix",
      text: "So fit every transform inside the training split, as one pipeline, and audit features for proxies, like a refund flag in a fraud model, or a total computed with data from after the prediction.",
      pauseAfter: 0.8,
    },

    // ── 7. k-fold cross-validation ────────────────────────────────────────
    {
      id: "cv",
      scene: true,
      text: "Question seven. What is k-fold cross-validation, and when do you use it? Split the data into k folds, train on all but one, validate on that one, and rotate until each fold has been held out once.",
      pauseAfter: 0.5,
    },
    {
      id: "cv-run",
      text: "The page's five folds score from seventy-five to eighty-seven and a half percent, and any one could have been your only validation set. Their mean, seventy-nine and a half, give or take four, is steadier.",
      pauseAfter: 0.7,
    },
    {
      id: "cv-when",
      text: "Use it when data is too scarce to set a validation set aside, or to compare models reliably. When a training run takes days, k folds cost k runs, and one hold-out wins.",
      pauseAfter: 0.6,
    },
    {
      id: "cv-groups",
      text: "The follow-up is what a fold must not split. Simulate sixty users, eight rows each, the label belonging to the user. Shuffled folds put every user on both sides, and a random forest scores ninety-seven percent by recognizing them. Grouped by user, it scores fifty.",
      pauseAfter: 0.7,
    },
    {
      id: "cv-keep",
      text: "So keep each user, session or patient inside one fold, and with time series, validate only forward.",
      pauseAfter: 0.8,
    },
    {
      id: "score-in",
      text: "Honest scores, then. Next, which score.",
    },

    // ── 8. Precision, recall, F1 ──────────────────────────────────────────
    {
      id: "pr",
      scene: true,
      text: "Question eight. What are precision, recall, and F one score? Precision: of everything flagged, the share that was right. Recall: of everything that was there, the share you caught.",
      pauseAfter: 0.5,
    },
    {
      id: "pr-page",
      text: "F one is their harmonic mean, high only when both are. In the page's eight examples, three caught, one missed and one false alarm: all three come to point seven five.",
      pauseAfter: 0.6,
    },
    {
      id: "pr-thresh",
      text: "On a real model they trade off along the threshold. Simulate a fraud model on a hundred thousand transactions, one percent fraud. At a threshold of point five, precision is eighty-four percent and recall twenty-four. At point one, thirty-five and fifty-four.",
      pauseAfter: 0.6,
    },
    {
      id: "pr-cost",
      text: "Favor precision when false alarms are costly, recall when misses are: here, a false alarm blocks a good customer's card, and a miss loses the money. F one weighs them equally, which a business rarely does.",
      pauseAfter: 0.6,
    },
    {
      id: "pr-capacity",
      text: "Often capacity decides: if reviewers can check a thousand alerts a day, flag the top thousand. That catches four hundred and sixty-six of the nine hundred and ninety-five frauds.",
      pauseAfter: 0.8,
    },

    // ── 9. ROC-AUC and PR-AUC ─────────────────────────────────────────────
    {
      id: "auc",
      scene: true,
      text: "Question nine. What is ar-oh-see ay-you-see, and when does pee-ar ay-you-see matter more? The ROC curve plots the true positive rate against the false positive rate at every threshold. Its area is the chance that a random positive is scored above a random negative.",
      pauseAfter: 0.6,
    },
    {
      id: "auc-fraud",
      text: "The fraud model's area is point nine one, which sounds strong. But the false positive rate divides by ninety-nine thousand legitimate transactions. At one percent, that's a thousand false alarms, nearly twice the frauds caught.",
      pauseAfter: 0.7,
    },
    {
      id: "auc-pr",
      text: "The precision-recall curve never counts true negatives, so its area is what reviewers live with: point four six, against a chance level of point oh one, the fraud rate. When positives are rare, report pee-ar ay-you-see, and remember its baseline moves with the base rate.",
      pauseAfter: 0.8,
    },

    // ── 10. Class imbalance ───────────────────────────────────────────────
    {
      id: "imb",
      scene: true,
      text: "Question ten. What is class imbalance, and how do you handle it? When one class dominates, accuracy stops meaning anything: calling every transaction legitimate scores ninety-nine percent, and catches nothing.",
      pauseAfter: 0.6,
    },
    {
      id: "imb-fix",
      text: "Judge by precision, recall or pee-ar ay-you-see. Then weight the rare class in the loss, oversample it with SMOTE's synthetic rows or undersample the majority, move the threshold, or at the extreme, treat it as anomaly detection.",
      pauseAfter: 0.6,
    },
    {
      id: "imb-trap",
      text: "The follow-up is what reweighting does. With balanced class weights, recall at point five jumps from twenty-four percent to eighty-four. But the model now calls the average transaction twenty-two percent likely to be fraud, when one percent is, and its pee-ar ay-you-see falls from point four six to point three two.",
      pauseAfter: 0.7,
    },
    {
      id: "imb-prod",
      text: "So if anything downstream reads those as probabilities, recalibrate. And resample only the training set: the test set keeps production's one percent.",
      pauseAfter: 0.8,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Two more, quickly.",
      pauseAfter: 0.5,
    },
    {
      id: "r-early",
      text: "Early stopping halts training once validation loss hasn't improved for a set number of epochs, the patience, and restores the best epoch's weights.",
    },
    {
      id: "r-early-plateau",
      text: "Set the patience too short, and it stops on a plateau: this small network, with a patience of twenty, stops at epoch sixty-eight, though its best is epoch one sixty-eight.",
      pauseAfter: 0.7,
    },
    {
      id: "r-metrics",
      text: "RMSE squares errors before averaging, so one big miss dominates it. MAE weighs every error alike, so it shrugs off outliers. Trained on squared error, a model predicts the mean; on absolute error, the median.",
      pauseAfter: 0.6,
    },
    {
      id: "r-r2",
      text: "R squared compares your squared error with always predicting the mean: one is perfect, zero is the mean's own score, and on new data it can go negative, which no share of variance explained could.",
      pauseAfter: 0.7,
    },
    {
      id: "next",
      text: "You can now tell whether a model will generalize. Next: the models themselves, and how they learn.",
    },
  ],
};
