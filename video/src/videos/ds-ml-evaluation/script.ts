import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Machine learning I: training and evaluating" (16:9), Part 3
 * of the Data Scientist interview prep videos
 * (agent-outputs/20261022-0445-data-scientist-interview-video-plan.md), after
 * the first half of content/interview/data-scientist/machine-learning.mdx. It
 * answers fifteen of the page's thirty questions: twelve worked through on
 * real fits, numbered aloud, then three quick ones (numbered 13 to 15 on
 * screen only). Part 4 takes the other fifteen: the models themselves.
 *
 *   1. the bias-variance trade-off; 2. detecting and fixing overfitting
 *      ("bias").
 *   3. L1 against L2; 4. elastic net ("reg").
 *   5. cross-validation; 6. the train, validation and test discipline
 *      ("cv").
 *   7. learning curves ("learn").
 *   8. precision against recall ("pr").
 *   9. ROC-AUC and PR-AUC; 10. class imbalance ("auc").
 *   11. calibration ("cal").
 *   12. gradient descent and the learning rate ("gd"), which also answers
 *       the Deep learning page's word-for-word copy of it.
 *   Quick ("rapid-in"): RMSE, MAE and R-squared; cross-entropy against MSE;
 *   choosing between two models.
 *
 * Written fresh rather than in the Data Analyst series' words, so the series
 * does not feel mechanical: the opening is one model's two scores, and the
 * split, the quick round's lead-in and the bridge are this video's own.
 *
 * No series intro yet, as in the Data Analyst videos: the first scene opens
 * at frame 0, and adding the intro later needs no re-voicing.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every number ran in Pyodide 314.0.7 with scikit-learn 1.8.0 and
 * NumPy (the runtime the page's blocks run in), by check.mjs into
 * results.json, which data.ts reads. Every random draw is seeded:
 *   - "hook": an unpruned decision tree on scikit-learn's moons (600 points,
 *     noise 0.35, half held out): 100% on its training half, 84.3% on the
 *     other.
 *   - "bias", the video's own twenty points from a sine with noise (sd 0.3),
 *     validated on 2,000 more: degree 1 has validation error 0.305, degree 3
 *     0.104 (the lowest), degree 8 0.447, degree 9 5.69; degree 9's training
 *     error is 0.058, and training error falls with every degree.
 *   - "reg", scikit-learn's diabetes set (442 patients, ten measurements,
 *     standardized): at the marked strength the lasso keeps seven (age, s2
 *     and s4 go to zero) and ridge and elastic net (half and half) keep all
 *     ten. s1 and s2, total and LDL cholesterol, correlate at 0.897: the
 *     lasso keeps s1 and zeroes s2; elastic net keeps both.
 *   - "cv", scikit-learn's breast cancer set (569 tumors): 200 random 80/20
 *     splits score 94.7% to 100%; five stratified folds score 95.6, 97.4,
 *     98.2, 100 and 98.2, a mean of 97.9 with a standard deviation of 1.4.
 *   - "learn", the video's own 600 points from the same sine, twenty
 *     shuffles at each size: a straight line's two errors meet near 0.30;
 *     degree 9's validation error falls from 1.07 at 30 points to 0.089 at
 *     420, onto its training error and the noise floor of 0.09.
 *   - "pr" to "cal", the video's own two Gaussian classes, 2% positive:
 *     trained on 20,000, tested on 200,000 (4,000 positive). Precision and
 *     recall are 87% and 10% at a threshold of 0.8, 18% and 75% at 0.05.
 *     ROC-AUC 0.937 and PR-AUC 0.45; on a balanced test set (the 4,000
 *     positives and 4,000 negatives) 0.938 and 0.94. Calling everything
 *     negative is 98.0% accurate. With balanced class weights, recall at 0.5
 *     goes from 27% to 86% and precision from 67% to 11%. Calibration bins:
 *     the plain model's 0.85 bin is 80% positive; the weighted model's is
 *     8.5% positive; recalibrated with Platt scaling, 81%.
 *   - "gd", the page's own chart: x² from 8. At 0.25 the distance halves each
 *     step; at 0.004 it is still 6.54 after 25 steps; at 1.05 each step
 *     multiplies it by 1.1 and flips its sign.
 *   - quick: the page's five predictions give RMSE 0.344, MAE 0.300 and
 *     R-squared 0.954; a prediction of 0.01 for a true positive costs 0.98 in
 *     squared error and 4.61 in cross-entropy.
 *
 * Written for Drew's ear: numbers as they are said, "L one" and "L two",
 * "F one", and every abbreviation spelled and expanded the first time.
 */
export const script: NarrationScript = {
  id: "ds-ml-evaluation",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Here's a model that gets every example it trained on right. A hundred percent. Show it examples it has never seen, and it gets eighty-four. Which of those is the model? Most of the machine learning round comes back to that gap.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "Fifteen questions in this round. Every figure you'll see is a real model, fitted in Python. The last three are quick.",
      pauseAfter: 0.7,
    },
    { id: "bias-in", text: "First, where the gap comes from." },

    // ── 1, 2. Bias, variance, overfitting ─────────────────────────────────
    {
      id: "bias",
      scene: true,
      text: "Question one. Explain the bias-variance trade-off.",
      pauseAfter: 0.5,
    },
    {
      id: "bias-fits",
      text: "Twenty noisy points from a sine wave. A straight line is too rigid to follow the curve. That's bias: error from assumptions that are too simple. A degree-nine polynomial bends through the points, noise and all. That's variance: error from fitting this one sample too closely. Degree three sits between them.",
      pauseAfter: 0.7,
    },
    {
      id: "bias-curve",
      text: "Make the model more flexible, and training error only falls. Validation error falls, bottoms out at degree three, and climbs again. The best model is at the bottom of that curve, not at its end.",
      pauseAfter: 0.7,
    },
    {
      id: "overfit",
      text: "Question two. How do you detect and fix overfitting? Look for the gap: good on training data, poor on held-out data. At degree nine, training error is point oh six, and validation error is five point seven. To fix it: more data, a simpler model, regularization, early stopping, and cross-validation, so the estimate is honest.",
      pauseAfter: 0.7,
    },
    { id: "reg-in", text: "One of those fixes gets a question of its own." },

    // ── 3, 4. L1, L2, elastic net ─────────────────────────────────────────
    {
      id: "reg",
      scene: true,
      text: "Question three. What's the difference between L one and L two regularization? Both add a penalty on the size of the coefficients. L two, called ridge, penalizes their squares. L one, called lasso, penalizes their absolute values.",
      pauseAfter: 0.6,
    },
    {
      id: "reg-paths",
      text: "Here are ten measurements from a diabetes study. Raise the penalty, and ridge shrinks all ten together, keeping every one. Lasso drives them to exactly zero, one at a time. At this strength, it keeps seven. That's feature selection.",
      pauseAfter: 0.7,
    },
    {
      id: "enet",
      text: "Question four. What is elastic net? A mix of the two penalties. Two cholesterol measures here move together, with a correlation of point nine. Lasso keeps one and drops the other. Elastic net keeps both, which makes it steadier when features are correlated.",
      pauseAfter: 0.7,
    },
    { id: "cv-in", text: "So how far can you trust a validation score?" },

    // ── 5, 6. Cross-validation, and the three sets ────────────────────────
    {
      id: "cv",
      scene: true,
      text: "Question five. What is cross-validation, and why use it? Split this tumor data into training and test sets two hundred different ways, and the same model scores anywhere from ninety-four point seven percent to a hundred. One split is one draw from that range.",
      pauseAfter: 0.6,
    },
    {
      id: "cv-folds",
      text: "K-fold cross-validation cuts the rows into five folds, trains on four, and scores the fifth, five times over, so every row is scored once. Here, the mean is ninety-seven point nine, give or take one point four. For time series, keep the order: validate only on data that comes after the training data.",
      pauseAfter: 0.7,
    },
    {
      id: "split",
      text: "Question six. What's the discipline behind training, validation and test sets? Fit on the training set. Tune and choose on the validation set, or with cross-validation. Touch the test set once, at the end, to report. Every choice made by looking at the test score makes that score flatter you.",
      pauseAfter: 0.7,
    },
    { id: "learn-in", text: "And when a model disappoints, a picture tells you what to try next." },

    // ── 7. Learning curves ────────────────────────────────────────────────
    {
      id: "learn",
      scene: true,
      text: "Question seven. What is learning curve analysis? Train on more and more data, and track both errors.",
      pauseAfter: 0.5,
    },
    {
      id: "learn-shapes",
      text: "A straight line on the sine wave: the two curves meet early and stay high. That's bias, and more data won't help. The degree-nine polynomial: the gap starts wide and closes as the data grows, down to the noise. That's variance, and more data is the cure.",
      pauseAfter: 0.8,
    },
    { id: "pr-in", text: "Now, scoring a classifier, on a rare event." },

    // ── 8. Precision and recall ───────────────────────────────────────────
    {
      id: "pr",
      scene: true,
      text: "Question eight. Precision versus recall: when do you favor each? Precision is the share of flagged cases that are real. Recall is the share of real cases you flag.",
      pauseAfter: 0.6,
    },
    {
      id: "pr-slide",
      text: "This model scores two hundred thousand cases, two percent of them positive. At a threshold of point eight, precision is eighty-seven percent and recall ten. Lower it to point oh five, and recall climbs to seventy-five while precision falls to eighteen.",
      pauseAfter: 0.6,
    },
    {
      id: "pr-favor",
      text: "Favor recall when a miss is costly, like a disease screen or fraud. Favor precision when a false alarm is, like a spam filter. F one, the harmonic mean of the two, balances them.",
      pauseAfter: 0.7,
    },

    // ── 9, 10. ROC-AUC, PR-AUC, imbalance ─────────────────────────────────
    {
      id: "auc",
      scene: true,
      text: "Question nine. What is ROC-AUC, and when is PR-AUC preferred? The ROC curve, for receiver operating characteristic, plots the true positive rate against the false positive rate at every threshold. The AUC is the area under the curve: point five is chance, one is perfect. Here it's point nine four. The PR curve plots precision against recall, and its area here is only point four five.",
      pauseAfter: 0.6,
    },
    {
      id: "auc-balance",
      text: "Same model, same scores, but keep only as many negatives as positives. ROC-AUC barely moves. PR-AUC jumps to point nine four. The false positive rate divides by every negative, so a flood of easy ones flatters the ROC curve. When positives are rare, PR-AUC is the honest one.",
      pauseAfter: 0.7,
    },
    {
      id: "imbalance",
      text: "Question ten. How do you handle class imbalance? Start by ignoring accuracy: calling every case negative is already ninety-eight percent accurate. Weight the rare class in the loss, and at a threshold of point five, recall goes from twenty-seven percent to eighty-six, while precision falls from sixty-seven to eleven. Or move the threshold, or resample, and judge the result by PR-AUC or F one.",
      pauseAfter: 0.7,
    },

    // ── 11. Calibration ───────────────────────────────────────────────────
    {
      id: "cal",
      scene: true,
      text: "Question eleven. What is model calibration? Whether a score means what it says: of the cases scored point eight, about eighty percent should be positive.",
      pauseAfter: 0.6,
    },
    {
      id: "cal-curve",
      text: "The plain model sits near the diagonal. The weighted one doesn't: of the cases it scores around point eight five, under nine percent are positive. The weights bought recall and broke the probabilities. Fit a calibration on held-out data, with Platt scaling or isotonic regression, and it's back on the line.",
      pauseAfter: 0.7,
    },

    // ── 12. Gradient descent ──────────────────────────────────────────────
    {
      id: "gd",
      scene: true,
      text: "Question twelve. What is gradient descent, and how does the learning rate affect it? It minimizes a loss by stepping against the gradient, over and over. The learning rate sets the size of each step.",
      pauseAfter: 0.6,
    },
    {
      id: "gd-rates",
      text: "Start at eight on x squared. At point two five, each step halves the distance, and it's done in about ten. At point oh oh four, twenty-five steps later it's still past six. At one point oh five, every step overshoots by more than it closes, and the loss explodes.",
      pauseAfter: 0.6,
    },
    {
      id: "gd-sgd",
      text: "Stochastic gradient descent, S G D, steps on one example at a time. Mini-batches use a few. And Adam adapts the step for each parameter.",
      pauseAfter: 0.8,
    },

    // ── Quick round ───────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "And three you can answer in a breath.",
      pauseAfter: 0.5,
    },
    {
      id: "r-metrics",
      text: "R M S E, root mean squared error, squares each miss before averaging, so big misses dominate. M A E, mean absolute error, stays in the target's units and shrugs off outliers. R squared is the share of variance explained: one is perfect, zero is no better than the mean. On the page's five predictions, they come to point three four, point three, and point nine five.",
    },
    {
      id: "r-xent",
      text: "Cross-entropy or M S E, mean squared error, for a classifier? Predict point oh one for a true positive: squared error charges point nine eight. Cross-entropy charges four point six, and keeps climbing the more confidently wrong you are.",
    },
    {
      id: "r-select",
      text: "And to choose between two models, compare them on validation data, with a metric that matches the goal. Then weigh speed, interpretability and cost. If they're close, take the simpler one.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "You can now tell a good model from a lucky one. Which model to reach for, and why, is the next round. Next: models and features.",
    },
  ],
};
