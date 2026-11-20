import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Models and how they learn" (16:9), Part 2 of the Machine
 * Learning Engineer interview prep videos
 * (agent-outputs/20261120-1400-machine-learning-engineer-interview-video-plan.md,
 * "2, Models and how they learn"), after
 * content/interview/machine-learning-engineer/ml-fundamentals.mdx. It answers
 * the page's eighteen questions on models, learning and features, and
 * deep-learning.mdx's "How do you choose and schedule the learning rate?"
 * together with the page's own: thirteen worked through, numbered aloud and
 * read in the page's words, then five quickly (14 to 18, numbered on screen
 * only).
 *
 *   1. "How does gradient descent work?" ("gd").
 *   2. "What is the difference between batch gradient descent, SGD, and
 *      mini-batch GD?" ("batch").
 *   3. "How do you choose the learning rate?" with the deep-learning page's
 *      "How do you choose and schedule the learning rate?" ("lr"; read as one
 *      question, "…choose the learning rate, and how do you schedule it?").
 *   4. "How does logistic regression work?" ("logit").
 *   5. "What is cross-entropy loss and why is it preferred over MSE for
 *      classification?" ("ce").
 *   6. "What is the difference between a parametric and a non-parametric
 *      model?" ("param").
 *   7. "How does k-nearest neighbours (kNN) work?" ("knn").
 *   8. "How does a support vector machine (SVM) work?" ("svm").
 *   9. "What is feature scaling and why does it matter?" ("scale").
 *   10. "What is PCA and what does it do?" ("pca").
 *   11. "What are ensembles? Explain bagging and boosting." ("bag").
 *   12. "How does a Random Forest differ from a single decision tree?"
 *       ("forest").
 *   13. "What is gradient boosting?" ("gb").
 *   Quickly ("rapid-in"): 14. "Supervised vs unsupervised vs reinforcement
 *   learning?" ("r-types"); 15. "What loss functions are used for regression
 *   vs classification?" ("r-loss"); 16. "What is k-means clustering?"
 *   ("r-kmeans"); 17. "What is one-hot encoding?" ("r-onehot"); 18. "What is
 *   feature engineering?" ("r-fe").
 *
 * The page asks them in another order. Here they run as one argument: how a
 * model's numbers are found (1 to 3), one model and the loss it learns from
 * (4, 5), models that keep their data instead, and what that costs (6 to 8),
 * what features need before any of it works (9, 10), and many models instead
 * of one (11 to 13). The quick round holds the definitions with no mechanism
 * worth drawing, and k-means, whose trap is one picture.
 *
 * Opening and bridge. It opens fresh on the plan's 1 → 2 idea, the models
 * themselves: one trained model that is eleven numbers beside one that is its
 * whole training set, the split that decides how a model learns, what it costs
 * to serve and how it fails. It never says "in the last video". It closes on
 * the plan's 2 → 3 bridge: each model is a few lines of NumPy, and the coding
 * round asks you to write them fast and safely.
 *
 * Overlap. The Data Scientist series' ds-ml-models and ds-ml-evaluation
 * answer several of these questions; none of their worked examples is reused
 * (they drew borders on the moons, fitted the tumor radius, split iris,
 * bagged a sine, scaled the wine set, ran PCA on iris, the x² learning-rate
 * chart, and one point's cross-entropy). This video uses the page's own rows
 * and blocks, handwritten digits, two noisy rings, Friedman #1 and its own
 * simulations, and argues the engineer's side: steps and rows read, what a
 * model costs to store and to serve, a scaler shipped with the model, a
 * learning rate and a tree count as latency and accuracy budgets. Part 5
 * takes the optimizers (SGD, momentum, RMSProp, Adam) and softmax with
 * cross-entropy; "lr-adam" and "ce" stop at what this page asks.
 *
 * On screen, beat by beat (for phase 2; nothing is built yet). Colors keep the
 * series' meanings (interview.tsx): red the trap or the error, green the right
 * answer, yellow what the narration points at, blue data. The toucan hero
 * stands beside the opening and the close; the three spots are things the
 * narration names: a stack of coins ("scale-gd", dollars and cents), a stand
 * of three trees ("forest") and three paint pots ("r-onehot", the colours).
 *   hook: two columns under one rule. Left, "Logistic regression": its eleven
 *     numbers (logit.weights and bias) set as a short column of values, in
 *     blue. Right, "Nearest neighbours": a block of 160 × 10 small cells, the
 *     training rows, in blue. A vertical hairline between them.
 *   hook-why: three words under the columns, lit in turn: "learns", "serves",
 *     "fails".
 *   plan: the five groups as a ruled list with their numbers: "Finding the
 *     numbers" (1 to 3), "One model, one loss" (4, 5), "Models that keep the
 *     data" (6 to 8), "What features need" (9, 10), "Many models" (11 to 13);
 *     "Quick: 14 to 18" in grey.
 *   gd: question card; a bowl of loss contours over (θ1, θ2), a dot at the
 *     origin, the gradient as an arrow uphill (ink) and the step as an arrow
 *     the other way (yellow), "× learning rate" on the step.
 *   gd-run: the page's run as a path of dots on those contours (gd.lossPage
 *     for the loss beside it), "true: 1, 2, −1" and "after 500 steps: 0.99,
 *     1.93, −0.94", the gap to the least-squares answer (1.99, −1.00) left
 *     open, "still moving" in yellow.
 *   batch: question card; a stack of 100 rows, one step's rows lit: all of
 *     them for batch, ten for mini-batch, one for SGD, as each is named.
 *   batch-each, batch-mini: three paths on the contours, thirty steps each at
 *     one rate (batch.runs): batch smooth, mini-batch a little wobbly, single
 *     rows wandering, each drawn as it is named; "32 to 512 rows" under
 *     mini-batch, which is ringed green as the default.
 *   batch-run: beside each path, "rows read: 3,000", "300", "30".
 *   lr: question card (both pages' headings read as one question).
 *   lr-band: the loss against steps (log scale) for three rates: 0.01 (the
 *     page's, crawling), 0.9 (settled in 9) in green, 2.5 (gd.lossDiverge,
 *     climbing) in red; "limit ≈ 2" as a dashed line on a small rate axis
 *     beneath, the three rates placed on it.
 *   lr-range: the range test (lr.range): loss against a log rate axis, one
 *     run; the flat bottom from about 0.5 to 1.7 shaded green, the turn at 2
 *     marked yellow, the climb after it red.
 *   lr-sched: the schedule's shape (lr.schedule): a short ramp, "warmup", then
 *     a cosine to zero, "decay". Then two bars, the distance left after twenty
 *     passes of single-row SGD: constant 0.03 (ink), cosine 0.001 (green).
 *   lr-adam: one line, "Adam: a step size per weight; still tune the base
 *     rate".
 *   logit: question card; a score line (weights × features, plus a bias) into
 *     the sigmoid curve, the output on the 0 to 1 axis; "log loss" under it.
 *   logit-run: the page's printed lines in mono (logit.printed): "Accuracy:
 *     0.750" and the five probabilities, 0.962 and 0.193 lit.
 *   logit-prod: three short lines, "One dot product to serve", "Weights you
 *     can read", "Threshold: set by the cost of each error".
 *   ce: question card; −log p against p, rising without bound as p → 0, a
 *     confident wrong answer marked red at the steep end.
 *   ce-grad: the two gradients on the score against the score, for a true
 *     label of 1: cross-entropy's p − 1 staying near −1 far on the wrong
 *     side; squared error's, carrying σ'(z), sinking to zero there (red).
 *   ce-run: accuracy against step from the confidently wrong start (14%):
 *     cross-entropy (green) crossing 85% at step 24, squared error (red) at
 *     step 234 (ce.ceAccuracy, ce.mseAccuracy), the 85% line dashed.
 *   param: question card; the hook's two columns again, "parametric" over the
 *     eleven numbers and "non-parametric" over the rows; the page's examples
 *     under each.
 *   param-cost: the rows block grows to "10,000,000 rows" (400 MB as float32,
 *     a small note) while the eleven numbers stay eleven; "10,000,000
 *     distances per prediction" in red.
 *   knn: question card; the simulated customers in standardized age and
 *     income (knn.z), two classes in two blues; a new point (knn.vote.q), its
 *     fifteen nearest ringed, "11 : 4" as the vote.
 *   knn-trade: "No training", "Slow inference", "High dimensions: every point
 *     about equally far" as a short list; then "k: by cross-validation" and
 *     "At scale: approximate nearest-neighbour index" in green.
 *   svm: question card; the rings (svm.x, svm.y) with the RBF boundary
 *     (svm.gridRbf) and its margin, support vectors (svm.support) ringed in
 *     yellow on "support vectors".
 *   svm-kernel: the linear boundary (svm.gridLinear), "54%" in red, beside
 *     the RBF boundary, "89%" in green.
 *   svm-cost: support vectors against rows: 90 of 200, 590 of 2,000, 5,308 of
 *     20,000 (svm.supportVectors) as three bars, the last lit; then the
 *     three fit times as bars, the ratios ("× 3.x" from svm.doubling) over
 *     them, "measured once, browser Python" as a note.
 *   scale: question card; the customers' raw axes, age 20 to 70 years and
 *     income 20,000 to 150,000 dollars, drawn to scale: a flat smear.
 *   scale-knn: three bars, raw 74.5% (red), income alone 74.5% (ink),
 *     standardized 89.1% (green).
 *   scale-gd: the coins spot; "× 100 on one column": steps to settle, 8
 *     against 79,315 (scale.asIs, scale.times100), the second in red.
 *   scale-prod: "Needs it: distances, penalties, gradients · Trees: no", then
 *     "Fit on training data, ship with the model" in green.
 *   pca: question card; a cloud with its two component arrows, the first
 *     long, the second short.
 *   pca-run: the page's ten variance shares as bars (pca.full): 29.7% and
 *     12.7% lit, "42.4%" (pca.printed), the last two bars at zero, yellow.
 *   pca-trap: the simulated cloud (pca.trap), coloured by label, which splits
 *     across the short axis; the first component "97% of variance, 54.5%
 *     accuracy" in red, the second "3% of variance, 91% accuracy" in green.
 *   bag: question card; two small diagrams,
 *     models side by side into an average (bagging) and models in a chain
 *     (boosting), outlined boxes, each lit as named.
 *   bag-floor: the page's formula as its chart draws it (ensemble.formula):
 *     the variance of an average against models averaged, at correlations
 *     0.6 and 0.3, each flattening onto its floor (dashed), "the page's
 *     formula, not a fit" as a note.
 *   forest: question card; the trees spot; one 8 × 8 digit, eight of its
 *     pixels lit yellow for one split.
 *   forest-run: accuracy against trees averaged, 1 to 300 (ensemble
 *     baggedCurve and forestCurve): the forest starting below (73% against
 *     78% at one tree) and finishing above (97.8% against 95.9%); "one tree:
 *     84%" as a dashed line; "single trees: 76% forest, 82% bagged" as a
 *     note on "weaker".
 *   gb: question card; residuals as bars shrinking as trees are added, each
 *     new small tree fitted to the last residuals (a schematic of the
 *     mechanism, no numbers).
 *   gb-rate: validation error against trees (boost.runs), rate 1.0 bottoming
 *     at 12 trees and rising (red past its best), rate 0.1 falling to 784
 *     (green); 0.3 thin in ink; the two minima marked, 4.68 and 1.95.
 *   gb-prod: "12 trees or 784: each runs on every prediction", a latency
 *     note, in ink.
 *   rapid-in: RapidFire, rows 14 to 18.
 *   r-types: three small labels, "labels", "no labels", "reward".
 *   r-loss: a two-column list, regression and classification, with ranking
 *     under them.
 *   r-kmeans: the stretched clusters (kmeans): true clusters as shapes,
 *     k-means' assignment as colours, the 19% assigned wrong ringed red;
 *     "round clusters: 100%" as a note.
 *   r-onehot: the paint-pots spot; the page's block: "red, green, blue,
 *     red" → its encoded rows (onehot.encoded), columns blue, green, red;
 *     then "purple → 0 0 0" in green.
 *   r-fe: the examples as a line of words.
 *   next: the five groups, all lit, the toucan returning; <NextLine> "Next:
 *     coding for machine learning" on "Next".
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. check.mjs runs every one in Pyodide 314.0.7 (Python 3.14.2,
 * scikit-learn 1.8.0, NumPy 2.4.6), the runtime the page's blocks run in, into
 * results.json, which data.ts reads, and fails if a page stops saying what is
 * quoted or the narration stops saying what was measured. Seeded throughout:
 *   - hook, logit: the page's block (make_classification, 200 rows, 10
 *     features; 160 train, 40 test, scaled): accuracy 0.750, first
 *     probabilities 0.962 and 0.193; 10 weights and a bias, eleven numbers;
 *     kNN stores the 160 training rows (1,600 values).
 *   - gd, lr: the page's rows (seed 42, true weights 1, 2, −1, noise sd
 *     0.1) and its function: after 500 steps at 0.01, 0.99, 1.933, −0.944;
 *     least squares 0.994, 1.986, −0.999. Within 0.001 of it after 1,170
 *     steps at 0.01 ("nearly twelve hundred"), 9 at 0.9. The loss's largest
 *     curvature, 1.016, puts the limit at 2 / 1.016 = 1.97 ("past about
 *     two"); at 2.0 and above it never settles. The range test (batches of
 *     ten, the rate rising from 0.0001 to 10 over a hundred steps): lowest
 *     near 0.55, flat to about 1.75, up at 1.96 and climbing after. Single-row
 *     SGD at 0.1 for twenty passes, twenty seeds: 0.030 from the least-squares
 *     answer at a constant rate, 0.0013 decayed on a cosine. Warmup and decay
 *     shapes: the deep-learning page ("ramp up over the first few hundred
 *     steps to avoid early instability"; "step, cosine, or linear"); Adam
 *     reducing but not removing tuning: its "Adaptive optimizers reduce but
 *     don't eliminate the need to tune the base rate".
 *   - batch: the page's definitions and "32–512"; one row's noise shaking a
 *     run out of a shallow minimum is the page's "can help escape local
 *     minima". Thirty steps each at 0.1 from zero; rows read is arithmetic
 *     (30 × 100, 30 × 1).
 *   - ce: the page's answer ("larger gradients when the model is wrong and
 *     confident"). The squared error's gradient on the score is 2(p − y)
 *     σ'(z); cross-entropy's, p − y: calculus. The run: the page's model
 *     started at minus twice its fitted weights (14.4% right on the 160
 *     training rows), full-batch steps at 0.5: cross-entropy reaches 85% at
 *     step 24, squared error at step 234.
 *   - param: the page's definitions and examples. Ten million rows, ten
 *     features, eleven numbers against every row checked per prediction:
 *     arithmetic from stated assumptions.
 *   - knn: the page's answer. The simulation: 1,000 customers, age 20 to 70,
 *     income 20,000 to 150,000 dollars, the label driven by both equally;
 *     standardized, the first swept point whose fifteen neighbours split
 *     11 to 4. Approximate nearest-neighbour indexes are the standard answer
 *     to the page's "scales poorly at inference", named without a product.
 *   - svm: the page's answer. Two noisy rings (make_circles, noise 0.2,
 *     factor 0.5, 2,000 points, half held out): linear 54.3%, RBF 88.7%.
 *     Support vectors when fitted on 200, 2,000 and 20,000 points: 90, 590,
 *     5,308. Fit times on 4,000, 8,000 and 16,000 points, measured once in
 *     Pyodide: each doubling more than tripled it (svm.doubling; check.mjs
 *     asserts both ratios exceed 3, and the narration says only that).
 *   - scale: the page's list of what needs scaling, and that trees don't.
 *     The simulated customers: kNN (k = 15, five-fold) 74.5% raw, 74.5% on
 *     income alone, 89.1% standardized. The page's rows with one column
 *     multiplied by 100: at each one's best rate, 8 steps to settle against
 *     79,315 ("nearly eighty thousand"); the curvature ratio goes from 1.6 to
 *     11,770. Fitting the scaler on training data and shipping it: the page's
 *     own block and note ("the discipline that prevents leakage").
 *   - pca: the page's block: 29.7% and 12.7%, "Total variance captured:
 *     42.4%"; the full spectrum ends in two zeros (make_classification's two
 *     redundant columns are combinations of the informative ones). The
 *     simulation: 600 points, a long axis of noise and a short one carrying
 *     the label, turned 30°: the first component holds 97.3% of the variance
 *     and scores 54.5% ("barely better than a coin flip"), the second 2.7%
 *     and 90.8% ("ninety-one").
 *   - bag: the page's answer and its chart's formula (the variance of an
 *     average of n models with correlation ρ is ρ + (1 − ρ) / n of one
 *     model's), drawn at the chart's 0.6 and 0.3.
 *   - forest: digits (1,797 images, 64 pixels; 30% held out): one tree
 *     84.3%; 300 bagged trees 95.9%; a forest of 300 trying eight pixels a
 *     split (the square root of 64, scikit-learn's default) 97.8%. Its trees
 *     average 75.8% alone, bagged trees 82.4%. "Their mistakes overlap less"
 *     is the page's own explanation ("the randomness decorrelates the
 *     trees"), which is what lets weaker trees make a stronger average.
 *   - gb: the page's answer and its list of what XGBoost, LightGBM and
 *     CatBoost add. Friedman #1 (1,000 rows each to train, validate and
 *     test), depth-3 trees: at a rate of 1.0, validation error lowest at 12
 *     trees (4.68); at 0.1, at 784 (1.95, "less than half"). That every tree
 *     is evaluated per prediction is how an additive ensemble predicts.
 *   - quick: the page's answers. k-means on scikit-learn's three blobs
 *     (seed 170): 100% agreement round, 81.2% once stretched ("about one
 *     point in five" wrong). The page's one-hot block: categories blue,
 *     green, red; purple, unseen, encodes as all zeros. Feature engineering's
 *     examples and "good features often matter more than choice of
 *     algorithm": the page.
 *
 * Written for Drew's ear: SGD, GD, MSE, MAE, SVM, PCA, kNN and NumPy as people
 * write them (kNN and the SVM expanded the first time); XGBoost, LightGBM and
 * CatBoost, Adam and Huber as names (for the lexicon: XGBoost and LightGBM);
 * "L one" and "L two" as words; no sentence opening "A" before an
 * initialism; numbers as they are said.
 */
export const script: NarrationScript = {
  id: "mle-models",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Here's a trained logistic regression, all of it: eleven numbers. And here's a trained nearest-neighbours model: every one of its hundred and sixty training rows.",
      pauseAfter: 0.7,
    },
    {
      id: "hook-why",
      text: "Squeezing the data into a fixed set of numbers, or keeping it, decides how a model learns, what it costs to serve, and how it fails.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "Eighteen questions: thirteen worked through, then five quick ones.",
      pauseAfter: 0.6,
    },
    { id: "gd-in", text: "First, how the numbers are found." },

    // ── 1. Gradient descent ───────────────────────────────────────────────
    {
      id: "gd",
      scene: true,
      text: "Question one. How does gradient descent work? The gradient of the loss points uphill, so step each weight the other way, scaled by the learning rate, and repeat.",
      pauseAfter: 0.6,
    },
    {
      id: "gd-run",
      text: "The page's run: a hundred noisy rows made from three weights, one, two and minus one, and a start at zero. Five hundred steps at a rate of point oh one reach point nine nine, one point nine three and minus point nine four: close, and still moving.",
      pauseAfter: 0.8,
    },

    // ── 2. Batch, stochastic and mini-batch ───────────────────────────────
    {
      id: "batch",
      scene: true,
      text: "Question two. What's the difference between batch gradient descent, SGD, and mini-batch GD? How many rows each step averages.",
      pauseAfter: 0.5,
    },
    {
      id: "batch-each",
      text: "Batch uses all of them: an exact gradient and a smooth path, but every step reads the whole dataset. Stochastic gradient descent, SGD, uses one row: cheap, noisy steps that can shake loose from a shallow minimum, but never quite settle.",
      pauseAfter: 0.6,
    },
    {
      id: "batch-mini",
      text: "Mini-batch, typically thirty-two to five hundred and twelve rows, is the default: less noise, and one matrix multiply that keeps the hardware busy.",
      pauseAfter: 0.6,
    },
    {
      id: "batch-run",
      text: "Thirty steps each: batch's path is smooth, and reads three thousand rows. Single rows wander, and read thirty.",
      pauseAfter: 0.8,
    },

    // ── 3. The learning rate ──────────────────────────────────────────────
    {
      id: "lr",
      scene: true,
      text: "Question three. How do you choose the learning rate, and how do you schedule it?",
      pauseAfter: 0.5,
    },
    {
      id: "lr-band",
      text: "Too small and training crawls: the page's point oh one needs nearly twelve hundred steps to settle. Too large and each step overshoots, so the loss climbs, here past about two. At point nine, it settles in nine.",
      pauseAfter: 0.7,
    },
    {
      id: "lr-range",
      text: "A real network's limit is unknown, so run a range test: one short run with the rate rising across orders of magnitude. Here the loss bottoms out from about point five, and turns up at two. Pick a rate on the flat stretch.",
      pauseAfter: 0.6,
    },
    {
      id: "lr-sched",
      text: "Then schedule it: a short warmup, because early updates are large and unstable, then decay toward zero, so noisy steps can settle. Single-row SGD at a constant rate ends about point oh three from the best answer; decayed on a cosine, about point oh oh one.",
      pauseAfter: 0.7,
    },
    {
      id: "lr-adam",
      text: "Adaptive optimizers like Adam scale each weight's step, but the base rate still needs tuning.",
      pauseAfter: 0.8,
    },
    { id: "logit-in", text: "Now one model, and the loss it learns from." },

    // ── 4. Logistic regression ────────────────────────────────────────────
    {
      id: "logit",
      scene: true,
      text: "Question four. How does logistic regression work? It weights the features into a score, the log odds, and the sigmoid squeezes that into a probability. Training minimizes binary cross-entropy, or log loss.",
      pauseAfter: 0.6,
    },
    {
      id: "logit-run",
      text: "On the page's data, it scores seventy-five percent on forty held-out rows, with probabilities like point nine six and point one nine.",
      pauseAfter: 0.6,
    },
    {
      id: "logit-prod",
      text: "It's a classifier despite its name, and a strong baseline: one dot product to serve, weights you can read, and a threshold set separately, from the cost of each error.",
      pauseAfter: 0.8,
    },

    // ── 5. Cross-entropy ──────────────────────────────────────────────────
    {
      id: "ce",
      scene: true,
      text: "Question five. What is cross-entropy loss, and why is it preferred over MSE for classification? It's minus the log of the probability given to the true class, so a confident wrong answer costs without limit.",
      pauseAfter: 0.6,
    },
    {
      id: "ce-grad",
      text: "Behind a sigmoid, squared error's gradient is multiplied by the sigmoid's slope, which is nearly zero exactly when the model is confidently wrong. Cross-entropy's gradient is just the error.",
      pauseAfter: 0.7,
    },
    {
      id: "ce-run",
      text: "Start the page's model confidently wrong, right on fourteen percent of rows. Cross-entropy reaches eighty-five percent in twenty-four steps. Squared error, at the same rate, takes two hundred and thirty-four.",
      pauseAfter: 0.8,
    },
    { id: "param-in", text: "That model kept eleven numbers. Not every model keeps a summary." },

    // ── 6. Parametric and non-parametric ──────────────────────────────────
    {
      id: "param",
      scene: true,
      text: "Question six. What's the difference between a parametric and a non-parametric model? Parametric models learn a fixed set of numbers and predict from those alone, like linear models and neural networks. Non-parametric ones use the training data to predict, and grow with it, like kNN or a kernel SVM.",
      pauseAfter: 0.6,
    },
    {
      id: "param-cost",
      text: "That's a serving decision. At ten million rows, the logistic model is still eleven numbers. Nearest neighbours keeps all ten million, and checks every one for each prediction.",
      pauseAfter: 0.8,
    },

    // ── 7. k-nearest neighbours ───────────────────────────────────────────
    {
      id: "knn",
      scene: true,
      text: "Question seven. How does k-nearest neighbours, kNN, work? It finds the k training rows closest to a new point, usually by straight-line distance, and takes their majority class, or their mean. Here, fifteen neighbours vote eleven to four.",
      pauseAfter: 0.6,
    },
    {
      id: "knn-trade",
      text: "There's no training step, but inference is slow, and in high dimensions every point ends up about equally far away. Pick k by cross-validation. At scale, approximate nearest-neighbour indexes trade a little accuracy for a lot of speed.",
      pauseAfter: 0.8,
    },

    // ── 8. Support vector machines ────────────────────────────────────────
    {
      id: "svm",
      scene: true,
      text: "Question eight. How does a support vector machine, an SVM, work? It finds the boundary with the widest margin between the classes. The points on the margin's edge are the support vectors, and they alone fix it.",
      pauseAfter: 0.6,
    },
    {
      id: "svm-kernel",
      text: "The kernel trick bends that boundary without building new features. On two noisy rings, a straight boundary scores fifty-four percent; a radial basis function kernel, eighty-nine.",
      pauseAfter: 0.6,
    },
    {
      id: "svm-cost",
      text: "The follow-up is cost. Where classes overlap, many rows become support vectors, here five thousand three hundred of twenty thousand, and every prediction checks them all. Doubling the rows more than tripled the fit time, measured once in the browser's Python.",
      pauseAfter: 0.8,
    },
    { id: "scale-in", text: "Distances, margins and gradients all take a feature's units at face value." },

    // ── 9. Feature scaling ────────────────────────────────────────────────
    {
      id: "scale",
      scene: true,
      text: "Question nine. What is feature scaling, and why does it matter? It puts features on comparable ranges, by standardizing or min-max scaling. Simulate customers whose age, in years, and income, in dollars, matter equally.",
      pauseAfter: 0.5,
    },
    {
      id: "scale-knn",
      text: "Unscaled, kNN scores seventy-four and a half percent, exactly what income alone scores: next to a dollar, a year is nothing. Standardized, eighty-nine.",
      pauseAfter: 0.7,
    },
    {
      id: "scale-gd",
      text: "Multiply one of the page's columns by a hundred, as if dollars became cents, and gradient descent goes from eight steps to nearly eighty thousand.",
      pauseAfter: 0.7,
    },
    {
      id: "scale-prod",
      text: "Distance models, regularized models and gradient training need it; trees don't. And fit the scaler on training data only, then ship it with the model.",
      pauseAfter: 0.8,
    },

    // ── 10. PCA ───────────────────────────────────────────────────────────
    {
      id: "pca",
      scene: true,
      text: "Question ten. What is PCA, and what does it do? Principal component analysis finds the directions of greatest variance, each at right angles to the last, and projects the data onto the first few, to compress, plot or decorrelate it.",
      pauseAfter: 0.6,
    },
    {
      id: "pca-run",
      text: "On the page's ten scaled features, two components keep forty-two percent of the variance, and the last two keep none: two of the columns are combinations of others.",
      pauseAfter: 0.6,
    },
    {
      id: "pca-trap",
      text: "The trap is that variance isn't signal. In this simulation, the first component holds ninety-seven percent of the variance, and predicts the label barely better than a coin flip. The other three percent predicts it at ninety-one. PCA never sees the label.",
      pauseAfter: 0.8,
    },
    { id: "bag-in", text: "One model only goes so far. Next, many." },

    // ── 11. Bagging and boosting ──────────────────────────────────────────
    {
      id: "bag",
      scene: true,
      text: "Question eleven. What are ensembles? Explain bagging and boosting. Bagging trains models independently, each on a bootstrap sample, and averages them, mainly cutting variance. Boosting trains them in sequence, each correcting the last, mainly cutting bias, and it overfits unless regularized.",
      pauseAfter: 0.6,
    },
    {
      id: "bag-floor",
      text: "Averaging has a floor: adding models cuts the variance only down to a level set by how correlated their errors are.",
      pauseAfter: 0.8,
    },

    // ── 12. Random forests ────────────────────────────────────────────────
    {
      id: "forest",
      scene: true,
      text: "Question twelve. How does a random forest differ from a single decision tree? It bags trees, and at each split lets a tree consider only a random few features: here, eight of the sixty-four pixels of handwritten digits.",
      pauseAfter: 0.6,
    },
    {
      id: "forest-run",
      text: "One tree scores eighty-four percent. Each forest tree is weaker than a plain bagged tree, seventy-six percent against eighty-two, but their mistakes overlap less, so together they score ninety-eight against ninety-six.",
      pauseAfter: 0.8,
    },

    // ── 13. Gradient boosting ─────────────────────────────────────────────
    {
      id: "gb",
      scene: true,
      text: "Question thirteen. What is gradient boosting? It adds shallow trees one at a time, each fitted to the negative gradient of the loss: for squared error, the residuals. XGBoost, LightGBM and CatBoost add sampling, L one and L two penalties, and histogram splits for speed.",
      pauseAfter: 0.6,
    },
    {
      id: "gb-rate",
      text: "The follow-up is how many trees. On a synthetic benchmark, with each tree scaled by a learning rate of one, validation error is lowest after twelve trees, then climbs. At point one, it keeps falling until seven hundred and eighty-four, to less than half the error.",
      pauseAfter: 0.7,
    },
    {
      id: "gb-prod",
      text: "Early stopping on validation picks the count, and every tree runs again for each prediction, so the count is also a latency budget.",
      pauseAfter: 0.8,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Five quick ones.",
      pauseAfter: 0.5,
    },
    {
      id: "r-types",
      text: "Supervised learning maps inputs to labels. Unsupervised finds structure without them, as in clustering. Reinforcement learning has an agent learn by trial and error, maximizing reward.",
      pauseAfter: 0.6,
    },
    {
      id: "r-loss",
      text: "For regression, MSE, or MAE for robustness to outliers, or Huber, which blends them. For classification, binary cross-entropy, or categorical cross-entropy with softmax. For ranking, hinge, contrastive or triplet loss.",
      pauseAfter: 0.6,
    },
    {
      id: "r-kmeans",
      text: "k-means assigns each point to the nearest centroid, moves each centroid to its points' mean, and repeats to a local minimum, so run several starts, and pick k by the elbow or the silhouette. It assumes round clusters: on stretched ones, about one point in five lands wrong.",
      pauseAfter: 0.6,
    },
    {
      id: "r-onehot",
      text: "One-hot encoding gives each category its own column of zeros and ones, implying no order: red, green and blue become three columns. Purple, unseen in training, becomes all zeros, not an error at serving time. For thousands of values, use hashing or embeddings.",
      pauseAfter: 0.6,
    },
    {
      id: "r-fe",
      text: "Feature engineering turns raw data into useful inputs: interactions, the hour or weekday, logs of skewed values, bins, rolling aggregates. Good features often matter more than the algorithm.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "Each of these is a few lines of NumPy, and the coding round asks you to write them, fast and safely. Next: coding for machine learning.",
    },
  ],
};
