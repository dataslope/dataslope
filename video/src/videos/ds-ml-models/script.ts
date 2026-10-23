import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Machine learning II: models and features" (16:9), Part 4 of
 * the Data Scientist interview prep videos
 * (agent-outputs/20261022-0445-data-scientist-interview-video-plan.md), after
 * the second half of content/interview/data-scientist/machine-learning.mdx.
 * It answers the fifteen questions Part 3 leaves: eleven worked through on
 * real fits, numbered aloud, then four quick ones (numbered 12 to 15 on
 * screen only).
 *
 *   1. logistic regression and its probabilities; 2. linear against
 *      logistic regression for a binary target ("logit").
 *   3. how a decision tree splits ("tree").
 *   4. bagging against boosting ("bag").
 *   5. random forests; 6. gradient boosting against AdaBoost ("forest").
 *   7. k-nearest neighbors ("knn").
 *   8. k-means ("kmeans").
 *   9. PCA; 10. the curse of dimensionality ("pca").
 *   11. a forest's impurity importance against SHAP values ("shap").
 *   Quick ("rapid-in"): generative against discriminative; feature scaling;
 *   encoding categorical variables; feature selection.
 *
 * Written fresh rather than in any other video's words, so the series does
 * not feel mechanical: the opening is three models drawing three borders
 * through the same points, and the split, the quick round's lead-in and the
 * bridge are this video's own.
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
 *   - "hook" and "knn", scikit-learn's moons (300 points, noise 0.3, a third
 *     held out): logistic regression scores 82% on the held-out points, a
 *     depth-4 tree 89%, fifteen nearest neighbors 93%. One nearest neighbor
 *     is 100% on its training points and 79% on the others; seventy-five,
 *     87%. The vote: the new point at (0.4, 0.1) has ten neighbors of one
 *     class and five of the other.
 *   - "logit", scikit-learn's breast cancer set (569 tumors, 212 malignant),
 *     on mean radius alone: the score is -15.25 + 1.034 per unit of radius;
 *     at 15 it is 0.26, a probability of 0.56; each unit multiplies the odds
 *     by 2.81. A straight line through the same zeros and ones goes below
 *     zero for 60 tumors and above one for 35, and predicts 1.76 at 28.
 *   - "tree", scikit-learn's iris, versicolor against virginica (100
 *     flowers): Gini 0.5 at the root; the best cut, petal width 1.75 (the
 *     one scikit-learn's own tree picks from all four measurements), leaves
 *     49 and 5 on one side, 1 and 45 on the other, a weighted 0.110.
 *   - "bag", the video's own sixty points from a sine with noise (sd 0.35),
 *     tested on 2,000 more: one deep tree's test error is 0.262; two hundred
 *     bagged trees, 0.180; boosting with depth-2 trees, 0.558 after one,
 *     0.212 after ten and 0.175 after a hundred.
 *   - "forest", the breast cancer set again, 171 tumors held out: one tree
 *     90.6%, three hundred bagged trees 93.0%, a forest of three hundred
 *     trying 5 of the 30 features at each split 95.3%. AdaBoost by hand,
 *     with stumps, on 24 moons: after three rounds the heaviest point
 *     carries 35 times the weight of the lightest.
 *   - "kmeans", the page's own three blobs (300 points): from three starting
 *     centers in one blob, Lloyd's algorithm settles on the third pass, at
 *     the page's inertia of 566.9 (from 20,402 at one cluster); the
 *     silhouette peaks at three clusters, at 0.848.
 *   - "pca", the page's own scaled iris: 73.0%, 22.9%, 3.7% and 0.5% of the
 *     variance, 95.8% in two. The curse: a thousand uniform points, twenty
 *     queries each; the nearest neighbor's distance over the farthest's is
 *     0.017 in two dimensions and 0.894 in a thousand.
 *   - "shap", the video's own made-up churn table (1,500 customers: plan,
 *     region, tenure, and a customer ID that carries nothing): a forest's
 *     impurity importance gives the ID 40% and the plan 10%; exact Shapley
 *     values (brute force over all sixteen subsets of four features, against
 *     a hundred background rows; the SHAP library is not in Pyodide) rank
 *     the plan first and the ID last. The customer shown: 0.503 on average,
 *     +0.183 for the monthly plan, -0.217 for 56 months, 0.475 in all.
 *   - quick: KNN on scikit-learn's wine set scores 69.1% unscaled and
 *     94.9% standardized (five-fold), a tree 88.8% both ways; the page's
 *     one-hot colors; RFE keeps five of the thirty tumor features.
 *
 * Written for Drew's ear: numbers as they are said, "KNN" spelled, and
 * every abbreviation spelled and expanded the first time.
 */
export const script: NarrationScript = {
  id: "ds-ml-models",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Give three models the same two hundred points, and each one draws a different border. Logistic regression draws a straight line. A decision tree cuts in steps. Nearest neighbors bends with the data. On points they haven't seen, they score eighty-two, eighty-nine and ninety-three percent.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "The model round asks how each one draws its border, and when you'd pick it. Of the fifteen questions here, eleven get a model fitted on screen, and four get a sentence each at the end.",
      pauseAfter: 0.7,
    },
    { id: "logit-in", text: "Start with the straight line." },

    // ── 1, 2. Logistic regression ─────────────────────────────────────────
    {
      id: "logit",
      scene: true,
      text: "Question one. What is logistic regression, and how does it output probabilities? It adds up the features into a score, the log odds, then passes that score through the sigmoid, which squeezes any number into the range zero to one.",
      pauseAfter: 0.6,
    },
    {
      id: "logit-fit",
      text: "Here are five hundred sixty-nine tumors, and one feature: the mean radius of their cells. The score is minus fifteen point two five, plus one point oh three for each unit of radius. At a radius of fifteen, the score is point two six, and the sigmoid turns it into a probability of fifty-six percent. Each extra unit multiplies the odds of malignancy by two point eight.",
      pauseAfter: 0.7,
    },
    {
      id: "linear",
      text: "Question two. Why not linear regression for a binary target? Fit a straight line to the same zeros and ones, and it leaves the range: below zero for sixty tumors, above one for thirty-five. At a radius of twenty-eight, it predicts one point seven six, which no probability can be. Logistic regression stays inside, and it's fitted by maximum likelihood.",
      pauseAfter: 0.7,
    },
    { id: "tree-in", text: "Next, the model that cuts in steps." },

    // ── 3. Tree splits ────────────────────────────────────────────────────
    {
      id: "tree",
      scene: true,
      text: "Question three. How does a decision tree split? It tries every threshold on every feature, and keeps the cut that leaves the two sides purest.",
      pauseAfter: 0.6,
    },
    {
      id: "tree-gini",
      text: "Here are a hundred iris flowers, two species, half and half. Gini impurity, the chance that two flowers picked at random differ, starts at point five. Slide a cut along petal width. At one point seven five, one side is forty-nine to five, the other one to forty-five, and the weighted impurity falls to point one one, the lowest of any cut. Then the tree repeats this on each side, until a stopping rule, like a maximum depth.",
      pauseAfter: 0.7,
    },
    { id: "bag-in", text: "One tree is quick to read, and quick to overreact. So, many trees." },

    // ── 4. Bagging and boosting ───────────────────────────────────────────
    {
      id: "bag",
      scene: true,
      text: "Question four. What's the difference between bagging and boosting? Bagging trains many models side by side, each on a bootstrap sample, rows drawn with replacement, and averages them. One deep tree on this noisy sine wave chases every point. Two hundred bagged trees average the noise out, and test error falls from point two six to point one eight. Bagging cuts variance.",
      pauseAfter: 0.7,
    },
    {
      id: "boost",
      text: "Boosting trains small models one after another, each fitted to what the ones before it still get wrong. After one tree the fit is crude, after ten it's close, and after a hundred, test error is point one seven five. Boosting cuts bias. It's often the more accurate of the two, but it can overfit noisy data, where bagging holds up.",
      pauseAfter: 0.7,
    },

    // ── 5, 6. Random forests, gradient boosting and AdaBoost ──────────────
    {
      id: "forest",
      scene: true,
      text: "Question five. How does a random forest work? It's bagged trees with one more twist: at every split, a tree may only look at a random handful of features, here five of thirty. The trees stop all making the same cuts, so their mistakes overlap less, and the average gains more. On a hundred seventy-one held-out tumors, one tree scores ninety point six percent, bagged trees ninety-three, and the forest ninety-five point three.",
      pauseAfter: 0.7,
    },
    {
      id: "ada",
      text: "Question six. How does gradient boosting differ from AdaBoost? Gradient boosting fits each new tree to the gradient of the loss, the residuals for squared error, so any differentiable loss will do. AdaBoost, short for adaptive boosting, re-weights the data instead: after every round, the points it got wrong count for more. After three rounds, this point carries thirty-five times the weight of the easiest ones. AdaBoost turns out to be gradient boosting with an exponential loss.",
      pauseAfter: 0.7,
    },
    { id: "knn-in", text: "Back to the border that bent with the data." },

    // ── 7. k-nearest neighbors ────────────────────────────────────────────
    {
      id: "knn",
      scene: true,
      text: "Question seven. How does k-nearest neighbors, or KNN, make predictions? It keeps every training point. For a new one, it finds the k closest, and takes a vote. Here, fifteen neighbors, ten against five. There's no training step, but prediction is slow on large data.",
      pauseAfter: 0.6,
    },
    {
      id: "knn-k",
      text: "And k sets the trade-off. At k equals one, every point owns a patch of its own: a hundred percent on the training points, seventy-nine on new ones. At fifteen, the border is smooth, and scores ninety-three. At seventy-five, it's nearly straight, and drops to eighty-seven. Small k is high variance, large k high bias, so choose it by cross-validation.",
      pauseAfter: 0.7,
    },
    { id: "kmeans-in", text: "Neighbors need labels. Without them, you cluster." },

    // ── 8. k-means ────────────────────────────────────────────────────────
    {
      id: "kmeans",
      scene: true,
      text: "Question eight. What is k-means clustering? Place k centers, assign each point to the nearest one, move each center to the mean of its points, and repeat until nothing moves. These three centers all start in one group. After one move, two of them jump toward the other groups, and on the third pass, it settles.",
      pauseAfter: 0.6,
    },
    {
      id: "kmeans-k",
      text: "It minimizes the within-cluster sum of squares, which always falls as k grows, so look for the elbow. Here it drops from twenty thousand at one cluster to five sixty-seven at three, then barely moves. The silhouette score, how much nearer each point sits to its own cluster than to the next, peaks at three as well. And run several starts, or k-means plus plus, because a bad start can settle in the wrong place.",
      pauseAfter: 0.7,
    },
    { id: "pca-in", text: "More features bring trouble of their own." },

    // ── 9, 10. PCA, and the curse of dimensionality ───────────────────────
    {
      id: "pca",
      scene: true,
      text: "Question nine. What is PCA? Principal component analysis finds the directions in which the data varies most, each at right angles to the last, and projects the data onto the first few. On the four iris measurements, scaled first, one component holds seventy-three percent of the variance, and two hold ninety-six. Four columns become two, and the species still separate. It needs centered data, and it only finds straight-line structure.",
      pauseAfter: 0.7,
    },
    {
      id: "curse",
      text: "Question ten. What is the curse of dimensionality? As dimensions grow, space empties out. Scatter a thousand random points. In two dimensions, a point's nearest neighbor is about sixty times closer than its farthest. In a thousand dimensions, the nearest is almost as far as the farthest. Distances stop telling points apart, and KNN and k-means suffer first. The fixes: fewer dimensions, through PCA or feature selection, and regularization.",
      pauseAfter: 0.7,
    },
    { id: "shap-in", text: "The last deep dive: which features mattered." },

    // ── 11. Impurity importance against SHAP ──────────────────────────────
    {
      id: "shap",
      scene: true,
      text: "Question eleven. What's the difference between a forest's built-in feature importance and SHAP values, short for Shapley additive explanations? The built-in one adds up how much each feature cut impurity, across every tree. It's fast, but it favors features with many distinct values.",
      pauseAfter: 0.6,
    },
    {
      id: "shap-id",
      text: "Here's a made-up churn table, with a customer ID that means nothing at all. Impurity importance gives the ID forty percent, four times the plan, which really does drive churn.",
      pauseAfter: 0.7,
    },
    {
      id: "shap-values",
      text: "SHAP splits each prediction fairly among the features, using game theory. This customer starts from the average, point five oh. The monthly plan adds point one eight, fifty-six months of tenure takes away point two two, and the other two bring it to point four seven five. Averaged over customers, SHAP ranks the plan first and the ID last.",
      pauseAfter: 0.8,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "The last four are quicker, and three of them are about the inputs rather than the model.",
      pauseAfter: 0.6,
    },
    {
      id: "r-gen",
      text: "A discriminative model learns the probability of the label given the input, like logistic regression. A generative model learns how the inputs are spread within each class, like naive Bayes, then classifies with Bayes' theorem. It can generate data, and it copes better with few labels.",
    },
    {
      id: "r-scale",
      text: "Scale features for anything built on distances or gradient descent: KNN, k-means, support vector machines and linear models. On the wine data, KNN goes from sixty-nine percent to ninety-five once the features are standardized. A tree scores eighty-nine either way.",
    },
    {
      id: "r-encode",
      text: "One-hot encoding gives each category its own column of zeros and ones. Ordinal encoding maps ordered categories to integers. Target encoding uses each category's mean outcome, which leaks unless it's computed inside cross-validation.",
    },
    {
      id: "r-select",
      text: "And feature selection comes in three kinds. Filters score each feature on its own. Wrappers, like recursive feature elimination, try subsets with a model. Embedded methods select while training, like the lasso. Here, recursive elimination keeps five of the thirty tumor features.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "Every model here is built from parts you can point to: a line, a cut, a distance. A neural network learns its own. Next: deep learning.",
    },
  ],
};
