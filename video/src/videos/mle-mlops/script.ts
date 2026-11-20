import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Shipping and monitoring models" (16:9), Part 8 of the
 * Machine Learning Engineer interview prep videos
 * (agent-outputs/20261120-1400-machine-learning-engineer-interview-video-plan.md,
 * "8, Shipping and monitoring models"), after content/interview/
 * machine-learning-engineer/mlops.mdx and the fourteen ml-system-design.mdx
 * questions the plan answers here. The two pages ask many of the same
 * things in two wordings; each is answered once, under the number below.
 * Twelve numbers worked through, read aloud in the page's words, then five
 * quick ones (13 to 17, numbered on screen only). The three mlops.mdx
 * questions about batch inference, feature stores and training-serving skew
 * are Part 7's.
 *
 *   1. "What is MLOps, and how does it differ from traditional DevOps?"
 *      (mlops) ("q1").
 *   2. "What do you need to version to reproduce a model?" (mlops), with
 *      ml-system-design's "How do you ensure reproducibility of ML
 *      experiments?"; 3. "How do you version training data?" (both pages)
 *      ("q2").
 *   4. "How do you design a CI/CD pipeline for ML?" (ml-system-design),
 *      with mlops' "What are the stages of a CI/CD pipeline for models?";
 *      5. "What is an evaluation gate, and why is it essential?" (mlops)
 *      ("q4").
 *   6. "How do you monitor a model in production?" (both pages) ("q6").
 *   7. "Data drift vs concept drift vs performance degradation?" (mlops,
 *      read "versus"), with ml-system-design's "What is drift, and what do
 *      you do about it?"; 8. "How do you detect and respond to concept
 *      drift?" (ml-system-design) ("q7").
 *   9. "What is population stability index (PSI)?" (ml-system-design);
 *      10. "How do you detect drift when labels are delayed or unavailable?"
 *      (mlops) ("q9").
 *   11. "How do you roll out a new model version safely?"
 *       (ml-system-design), with "What is shadow deployment?" / "What is a
 *       shadow deployment?", "What is a canary deployment?" (both pages)
 *       and "How do you do rollback for a model?" / "How do you roll back a
 *       model safely?", each answered in its own beat ("q11").
 *   12. "What is A/B testing for models and how does it differ from shadow
 *       testing?" (ml-system-design, "A B" aloud), with mlops' "What is a
 *       champion/challenger setup?" ("q12", "q12-champ").
 *   Quick ("rapid-in"): 13. "What is a model registry?" (both pages)
 *   ("r-registry"); 14. "How do you trigger model retraining?"
 *   (ml-system-design) with mlops' "What is continuous training (CT)?"
 *   ("r-retrain"); 15. "How does blue/green deployment apply to models?"
 *   ("r-bluegreen"); 16. "What tools support experiment tracking, and why
 *   does it matter?" ("r-tracking"); 17. "How do you package a model for
 *   deployment?" ("r-package").
 *
 * The pages ask them in another order. Here they follow a model's life after
 * training: what makes it different to ship, pinning down what made it, the
 * pipeline and the gate that let it through, watching it, the two kinds of
 * drift and the score that measures one of them, then the rollout and the
 * comparison that replace it safely. The quick round is the machinery around
 * that loop.
 *
 * Opening and bridge. It opens on the plan's bridge from Part 7 (once the
 * model is live, the world it learned from keeps changing) in its own words,
 * a model that decays with its code frozen, never "in the last video", so
 * it plays on its own. It closes on the plan's bridge into Part 9: large
 * language models bring a serving problem of their own.
 *
 * Overlap. No Data Scientist or Backend video asks these questions; the
 * Data Scientist experiment videos test product changes, not models, and
 * this video's A B answer stays on what a shadow test cannot measure. Part 7
 * (mle-system-design) owns the fraud model, batching and quantization; none
 * of its runs is reused here.
 *
 * On screen, beat by beat (for phase 2; nothing is built yet). Colors keep
 * the series' meanings (interview.tsx): red the trap or the error, green the
 * right answer, yellow what the narration points at, blue data. A model's
 * life is a loop in a corner of each deep dive (version, gate, ship, watch,
 * retrain), the stage the question is about lit yellow.
 *   hook: a model box with a padlock on its code ("code frozen"); beside it
 *     an accuracy line that sags across four quarters, drawn as said; three
 *     small labels arrive at the input side on "new customers", "new
 *     tactics", "a sensor" (the thermometer spot). The walrus at the right.
 *   plan: twelve numbered chips in blue and five in grey, lit on "Twelve"
 *     and "five"; the loop drawn once, small, its five stages inking in as
 *     the plan names versioning, testing, shipping, watching.
 *   q1: question card. Two stacks side by side with a hairline: "DevOps:
 *     code + config" and "MLOps: code + data + model", the extra two lit
 *     yellow on "data".
 *   q1-three: under the ML stack, "versioned · tested · reproducible" as
 *     three badges; then the hook's sagging line returns small, "decays
 *     with code frozen", and "monitor" and "retrain" join the loop.
 *   q2: question card. q2-four: four labelled boxes in a row, inking in as
 *     named, "Code (git)", "Data (snapshot)", "Config (hyperparameters,
 *     features, seeds)", "Artifact"; a container outline drawn round all
 *     four on "container image" (the container spot).
 *   q2-data: under "Data", three ways as a short list, each lit as said:
 *     "snapshots beside commits (DVC)", "time travel: as of a date",
 *     "immutable, date-stamped paths".
 *   q2-seed: twenty dots, one per seed, on an accuracy axis from 96% to
 *     98%, dropping in one by one (results.json seeds), the lowest and
 *     highest labelled "96.1%" and "97.8%" in blue; a "simulation" note is
 *     not needed (a real run on real digits), but "same data, same code,
 *     seeds 0 to 19" is. Then two dots for seed 0 landing on the same spot,
 *     "identical" in green.
 *   q2-why: a "+1 point" arrow drawn across the spread of the twenty dots,
 *     in yellow: it fits inside the noise; "Judge a change over several
 *     seeds" in green on "several seeds". "Same code + data + config →
 *     same artifact" under it.
 *   q4: question card. The page's pipeline (its mermaid flowchart) as
 *     outlined boxes left to right: validate data, test transforms, train
 *     on versioned data, evaluation gate, register and promote, staged
 *     rollout (shadow, canary, full), monitor, with the drift arrow back to
 *     train; each box inks in as named.
 *   q4-gate: three trigger arrows arrive at "train" ("code", "data",
 *     "schedule"); the gate box lit yellow, "beat production on a fixed
 *     holdout"; a red regression arrow stopped at it on "quietly ship".
 *   q4-slice: two bars per model, overall and "one group (1 in 20)", the
 *     incumbent's and the candidate's side by side (results.json gate):
 *     overall 75% and 77%, the candidate's ticked by the gate; on the
 *     group, 79% and 46%, the 46% red, a dashed line at 50% labelled "coin
 *     flip" (the coin spot). A "simulation" note: "retrained on last
 *     month: 11 of 4,000 rows from the group".
 *   q4-floor: the gate box gains a second check, "floor on every slice",
 *     in green, and the candidate's tick turns into a stop.
 *   q6: question card. Two columns with a hairline, "Operational" (latency
 *     at p50, p95, p99; error rate; throughput; resources), inking in on
 *     "q6", and "Model" (input distributions; prediction distribution;
 *     accuracy, precision, recall once labels arrive) on "q6-model", each
 *     line inking in as said, the last with a small clock ("once labels
 *     arrive").
 *   q6-wire: a log feeding "debug and replay"; every alert's arrow ending
 *     on "retrain" or "roll back" in the loop.
 *   q6-first: the "once labels arrive" clock stretches into a long arrow
 *     ("weeks"); the input and prediction lines in the model column light
 *     yellow on "move first", and the drift panel of q7 starts to slide in.
 *   q7: question card. q7-defs: two small panels, "Data drift: P(x)
 *     moves" (a histogram sliding right) and "Concept drift: P(y given x)
 *     moves" (the same histogram, its boundary line turning);
 *     "Degradation: the drop either can cause" under both.
 *   q7-data: a simulation note ("logistic regression, two features, 5,000
 *     training rows, windows of 2,000"). The first feature's training
 *     histogram and the next quarter's, shifted right; "PSI 0.91" in yellow
 *     (an alarm, not an error); then "accuracy 80% → 84%" in blue beside
 *     it on "q7-rises", and "this time, the learned rule still holds there"
 *     under it on "This time" (data drift can hurt; here it did not).
 *   q7-concept: the third quarter's histograms lying on the training ones,
 *     "PSI < 0.02" on each feature and on the predictions, in grey; the
 *     boundary turns; "accuracy 80% → 61%" in red.
 *   q7-respond: a two-by-two, "inputs alarm" against "accuracy fell":
 *     data drift in the alarm-but-fine cell, concept drift in the
 *     silent-but-worse cell, red; "labels confirm it: accuracy and
 *     calibration over time" under the grid in green; then three responses
 *     as badges, "alert", "retrain on recent data", "redesign features",
 *     lit in turn. (No separate time-sliced chart here: with the grid and
 *     the badges, one more chart would crowd the page; the words carry it.)
 *   q9: question card. q9-how: ten training buckets of equal share as ten
 *     bars at 10%; the current window's shares as bars beside them; the
 *     formula in words under them, "sum over buckets: (current − training)
 *     × ln(current / training)", each term lit as said.
 *   q9-example: the bars for the slight shift (results.json psi
 *     stableShares) and the large one (driftedShares), "0.01" and "1.4"
 *     under them; then a scale from 0 to 0.3 with ticks at 0.1 ("stable")
 *     and 0.2 ("needs action"), labelled "conventions".
 *   q9-labels: per-feature monitors in a column, "PSI · KS" beside each and
 *     one for "predictions"; "warning, not proof" in yellow; then three
 *     badges under it, "delayed labels", "audits", "randomized slice", in
 *     green on "measure outcomes".
 *   q9-noise: a strip of PSI values from 2,000 tries with no drift
 *     (results.json psiNoise), one strip for a window of 100 and one for
 *     1,000, the 0.1 line through both; the 100 strip's values over it red
 *     ("46% false alarms"), the 1,000 strip all under it.
 *   q9-edges: the ten buckets with the last bucket's right edge drawn as a
 *     wall at the training maximum; a fifth of the window's dots arrive
 *     beyond it and vanish, "closed edges: 0.03" in red; the wall opens
 *     into an arrow to infinity and the dots land in the last bucket, "open
 *     edges: 0.25" in green (results.json psiEdges).
 *   q11: question card; "In stages" writes the loop's ship stage as three
 *     steps. q11-shadow: traffic as a band of arrows into the current
 *     model, "returned to users"; on "shadow", a mirrored copy of the band
 *     goes to the new model, whose outputs go into a log, never back.
 *   q11-canary: the band splits: a thin slice (labelled "1–5%") to the new
 *     version, the rest to the incumbent; two guardrail gauges, "business"
 *     and "model health"; the slice widens on "Ramp up" and snaps back on
 *     "straight back".
 *   q11-rollback: the registry shelf with the previous artifact and its
 *     config, "traffic weights" as a dial flipping back (the lever spot),
 *     green; then three small boxes left behind by the new model,
 *     "feature-store writes", "A B assignment logs", "caches", in yellow,
 *     "rehearse it".
 *   q12: question card. Two panels with a hairline. Shadow: users see only
 *     the champion's list; the challenger's list goes to a log, "parity:
 *     outputs, latency" in blue; one of the challenger's picks, faded, with
 *     "never shown, so never clicked" beside it in yellow.
 *   q12-ab: A B: users split, each half seeing one model's list,
 *     "click-through, conversion" compared; "impact" in green and
 *     "exposure" in yellow.
 *   q12-champ: a crown on the champion; two challengers beside it, one on
 *     a shadow line and one on a canary slice; one challenger takes the
 *     crown on "beating it on live traffic".
 *   rapid-in: the quick round's five numbered rows (RapidFire), 13 to 17.
 *   r-registry: a shelf of versioned artifacts, each with a tag of data
 *     version, hyperparameters, metrics and history; "staging →
 *     production" as two shelf labels; "rollback = lookup" in green.
 *   r-retrain: four trigger icons (a calendar, a drift alarm, a falling
 *     line, a stack of new labels), each lit as named, all feeding one
 *     arrow through the gate from q4.
 *   r-bluegreen: two environments as ink outlines labelled "Blue
 *     (current)" and "Green (new)": the names are words, not colors, since
 *     green means the answer and blue means data in this series; traffic
 *     flipping in one switch and flipping back; a canary slice drawn small
 *     beside it, "the gradual version".
 *   r-tracking: a table of runs (run, hyperparameters, metric, commit),
 *     one row linked by a line to "in production".
 *   r-package: artifact, pinned runtime and dependencies, a container
 *     around them (the container spot again, small), "ONNX" as a badge and
 *     an arrow to "faster runtimes"; "container + versioned artifact" as
 *     the unit.
 *   close: the loop from the corner drawn large, all five stages lit in
 *     turn on "Versioned, gated, watched and reversible". The walrus.
 *   next: <NextLine> "Next: serving LLMs" on "Next".
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. check.mjs computes every number into results.json, which data.ts
 * reads; it fails if the pages stop saying what the narration quotes, or if
 * the narration's numbers stop matching:
 *   - q1: the definition, code plus data plus a trained model, versioned,
 *     tested and reproducible, decay with frozen code: mlops.
 *   - q2: the four things, the container image, seeds in the config, the
 *     three ways to version data, "the exact training set": both pages.
 *     The run (scikit-learn 1.8.0 in Pyodide): a 50-tree random forest on
 *     the 1,797 digits, 30% held out (seed 0 for the split), seeds 0 to 19:
 *     held-out accuracy from 96.1% to 97.8%; seed 0 twice gives identical
 *     probabilities on every held-out digit. "Reproducible means the same
 *     code, data and config give back the same artifact": the
 *     ml-system-design page. Judging a change over several seeds is the
 *     standard follow-up the spread argues for (the page logs seeds; it does
 *     not say this).
 *   - q4: the stages, the triggers, the gate on a fixed holdout, slices,
 *     "silently ship a regression": both pages. The simulation (seed 3):
 *     last year's 20,000 rows (one group in twenty with its own rule) train
 *     a gradient-boosted incumbent; last month's 4,000 rows (11 from the
 *     group; the rest's rule has moved) train the candidate; on today's
 *     10,000-row holdout the candidate scores 76.6% overall against 74.7%,
 *     and 45.6% against 79.3% on the group's 474 rows, whose labels are
 *     half and half (a coin flip scores about 50%).
 *   - q6: the two layers, logging for debugging and replay, alerts wired to
 *     retraining and rollback: mlops. Percentiles said as "the median and
 *     the tail" (p50, p95, p99 on screen). Labels "can take weeks": the
 *     chargebacks and purchases the pages name as delayed labels; inputs and
 *     predictions as the leading signal: mlops' "Observable input or
 *     prediction drift can be a leading indicator before labels arrive".
 *   - q7: the three definitions and their examples: mlops; "cannot
 *     distinguish concept drift from harmless covariate shift", time-sliced
 *     performance and calibration against stable cohorts, the range of
 *     responses: ml-system-design. The simulation (seed 0): a logistic
 *     regression on 5,000 rows (label from 2 x1 + x2), windows of 2,000:
 *     the same quarter scores 79.9%; x1's mean up by one gives PSI 0.91 on
 *     x1 and 84.0% (the true rule is linear, so the logistic regression
 *     still holds where x1 moved: "this time", since drift into a region
 *     the model learned badly would hurt); the rule changed to
 *     2 x1 - 1.5 x2 - 1 with no input
 *     moved gives PSI under 0.02 on both inputs and the predictions, and
 *     60.7% (said "sixty-one").
 *   - q9: the definition, buckets on the reference, the formula,
 *     conventions not significance levels, sample size: ml-system-design;
 *     PSI, KL or Kolmogorov-Smirnov per feature and on predictions,
 *     calibrated thresholds, "cannot by themselves prove", "delayed labels,
 *     audits, or randomized outcome measurement": mlops. The
 *     numbers: the page's own draws (seed 42), with open outer buckets:
 *     0.014 and 1.41 (said "a simulation"; the page's compute_psi prints
 *     the same, 0.0143 and 1.4101, since the fix below; with closed edges
 *     it printed 1.1276). No drift, 2,000 tries
 *     against a reference of 1,000: a window of 100 scores over 0.1 in 46%
 *     of tries, a window of 1,000 in none. The edges: a window of 1,000
 *     with 200 values beyond the reference's maximum scores 0.03 with
 *     closed edges and 0.25 with open ones.
 *     The page's compute_psi used to bin the current values on the
 *     reference's percentiles, from its minimum to its maximum, and
 *     np.histogram drops values outside that range: in the page's own
 *     drifted demo, 143 of the 1,000 values fall above the reference's
 *     maximum and were not counted. The page opens its outer buckets since
 *     2026-11-20 (found by this video's writer), and check.mjs fails if it
 *     stops doing so or stops agreeing with the video's own PSI.
 *   - q11: shadow (logged, never returned, outputs, latency and errors
 *     under real traffic), canary (1 to 5%, guardrails, ramp or shift
 *     back), rollback (the previous artifact and its config in the
 *     registry, a config change, downstream state, rehearsal): both pages.
 *   - q12: A B against shadow, parity against impact: ml-system-design;
 *     champion and challenger: mlops. "Nobody can click a recommendation
 *     they were never shown" is the page's "users only see the champion's
 *     predictions" applied to a recommender.
 *   - quick: the pages' answers.
 *
 * Written for Drew's ear: ML, A B, DVC, PSI, CI/CD and LLMs in plain caps,
 * with MLOps, CI/CD, MLflow and ONNX listed in the report for the lexicon
 * (people say "em-el-ops", "see-eye see-dee", "em-el-flow" and "onyx"); no
 * sentence opens "A" before an initialism; DevOps, Kolmogorov-Smirnov and
 * Weights and Biases as words; numbers as they are said.
 */
export const script: NarrationScript = {
  id: "mle-mlops",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Freeze a model's code, and it still gets worse. Nothing in the repository moved. The world it learned from did: new customers, new tactics, a sensor swapped for one that reports in other units.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "This round is everything after training: versioning, testing, shipping, and watching a model in production. Twelve questions are worked through here, and five go quickly.",
      pauseAfter: 0.7,
    },

    // ── 1. MLOps and DevOps ───────────────────────────────────────────────
    {
      id: "q1",
      scene: true,
      text: "Question one. What is MLOps, and how does it differ from traditional DevOps? It brings DevOps practices to machine learning: automation, monitoring, and continuous integration and delivery, or CI CD. But it adds a moving part: data.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-three",
      text: "A traditional app is code plus config. An ML system is code, plus data, plus the trained model they produce, and all three must be versioned, tested and reproducible. And because a model decays while its code stays frozen, monitoring and retraining are part of the job from day one.",
      pauseAfter: 0.8,
    },

    // ── 2, 3. Versioning and reproducibility ──────────────────────────────
    {
      id: "q2",
      scene: true,
      text: "Questions two and three. What do you need to version to reproduce a model? And how do you version training data?",
      pauseAfter: 0.6,
    },
    {
      id: "q2-four",
      text: "Four things: the code, in git; the data, as a snapshot; the config, meaning hyperparameters, feature definitions and random seeds; and the trained artifact. A container image pins the libraries underneath.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-data",
      text: "Data is the awkward one. Track snapshots beside each commit with a tool like DVC, data version control; query a warehouse with time travel, as of a past date; or write to immutable, date-stamped paths. The goal is the exact training set behind any past model.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-seed",
      text: "Why log the seed? Train a random forest on handwritten digits twenty times, changing nothing but the seed, and held-out accuracy runs from ninety-six point one to ninety-seven point eight percent. Fix the seed, and every prediction matches, run after run.",
      pauseAfter: 0.7,
    },
    {
      id: "q2-why",
      text: "So a one-point gain may just be a lucky seed: judge a change over several seeds, not one. And reproducible means the same code, data and config give back the same artifact.",
      pauseAfter: 0.8,
    },

    // ── 4, 5. CI/CD and the evaluation gate ───────────────────────────────
    {
      id: "q4",
      scene: true,
      text: "Questions four and five. How do you design a CI CD pipeline for ML? And what is an evaluation gate, and why is it essential? The pipeline validates the new data, tests the feature transforms, trains on a versioned dataset, gates the result, promotes it in the registry, and rolls it out in stages: shadow, canary, full.",
      pauseAfter: 0.6,
    },
    {
      id: "q4-gate",
      text: "Code, data or a schedule can trigger it, so new models arrive with nobody looking. The gate looks for you: the candidate must beat the production model on a fixed holdout set, or the build fails. Without it, a retrain can quietly ship a regression.",
      pauseAfter: 0.6,
    },
    {
      id: "q4-slice",
      text: "The follow-up is what beat means. Simulate a retrain on last month's data, which held almost none of one customer group. The candidate wins overall, seventy-seven percent to seventy-five. On that group, one customer in twenty, it falls from seventy-nine percent to forty-six, worse than a coin flip.",
      pauseAfter: 0.8,
    },
    {
      id: "q4-floor",
      text: "So the gate also sets a floor on every slice that matters, not just the total.",
      pauseAfter: 0.8,
    },

    // ── 6. Monitoring ─────────────────────────────────────────────────────
    {
      id: "q6",
      scene: true,
      text: "Question six. How do you monitor a model in production? In two layers. Operational health: latency at the median and the tail, error rate, throughput and resources.",
      pauseAfter: 0.6,
    },
    {
      id: "q6-model",
      text: "Model health: the input feature distributions, the distribution of predictions, and once labels arrive, live accuracy, precision and recall.",
      pauseAfter: 0.6,
    },
    {
      id: "q6-wire",
      text: "Log inputs and predictions, so you can debug and replay, and wire every alert to an action: retrain, or roll back.",
      pauseAfter: 0.6,
    },
    {
      id: "q6-first",
      text: "Labels can take weeks, so the inputs and the predictions are what you'll see move first. That's where drift comes in.",
      pauseAfter: 0.8,
    },

    // ── 7, 8. Drift ───────────────────────────────────────────────────────
    {
      id: "q7",
      scene: true,
      text: "Questions seven and eight. Data drift versus concept drift versus performance degradation? And how do you detect and respond to concept drift?",
      pauseAfter: 0.6,
    },
    {
      id: "q7-defs",
      text: "Data drift is the inputs shifting: a new kind of customer, a sensor's new units. Concept drift is the link from input to label shifting: fraud tactics evolve, so the same features mean something new. Degradation is the drop in quality either can cause.",
      pauseAfter: 0.6,
    },
    {
      id: "q7-data",
      text: "Simulate a model trained on two features. Next quarter, the first one shifts. Its drift score, the population stability index or PSI, reads point nine one: a loud alarm.",
      pauseAfter: 0.6,
    },
    {
      id: "q7-rises",
      text: "Yet accuracy rises, from eighty percent to eighty-four. This time, the rule the model learned still held where the inputs moved.",
      pauseAfter: 0.7,
    },
    {
      id: "q7-concept",
      text: "Another quarter, and no input moves at all. Every PSI, on both features and on the predictions, stays under point oh two. But the relationship changed, and accuracy falls to sixty-one.",
      pauseAfter: 0.8,
    },
    {
      id: "q7-respond",
      text: "The inputs rang for the harmless shift and stayed silent for the harmful one. Confirming concept drift takes labels: as they arrive, track accuracy and calibration over time, against stable cohorts where you can. Then respond in proportion: an alert, a retrain on recent data, or new features if the change is structural.",
      pauseAfter: 0.8,
    },

    // ── 9, 10. PSI, and drift without labels ──────────────────────────────
    {
      id: "q9",
      scene: true,
      text: "Questions nine and ten. What is the population stability index? And how do you detect drift when labels are delayed or unavailable?",
      pauseAfter: 0.6,
    },
    {
      id: "q9-how",
      text: "PSI compares one feature's distribution now with its distribution in training. Cut the training values into ten buckets of equal share, then add up, over the buckets, the difference in share times the log of their ratio.",
      pauseAfter: 0.6,
    },
    {
      id: "q9-example",
      text: "In a simulation, a slight shift scores point oh one, and a large one, one point four. Under point one is called stable, and over point two needs action, but those are conventions, not significance tests.",
      pauseAfter: 0.6,
    },
    {
      id: "q9-labels",
      text: "With labels late, PSI or a Kolmogorov-Smirnov test on each input, and on the predictions, is your early warning. It can show that something moved; it can't prove the model got worse. For that, measure outcomes: delayed labels, audits, or a small randomized slice.",
      pauseAfter: 0.6,
    },
    {
      id: "q9-noise",
      text: "Calibrate the threshold to your traffic, because PSI is noisy on small samples. With no drift at all, a window of a hundred values scores over point one almost half the time. A window of a thousand: never, in two thousand tries.",
      pauseAfter: 0.7,
    },
    {
      id: "q9-edges",
      text: "And leave the outer buckets open. Edges cut at the training minimum and maximum drop anything beyond them from the count. Simulate a fifth of values arriving past anything seen in training: closed edges read point oh three, stable. Open ones read point two five.",
      pauseAfter: 0.8,
    },

    // ── 11. Rolling out ───────────────────────────────────────────────────
    {
      id: "q11",
      scene: true,
      text: "Question eleven. How do you roll out a new model version safely? In stages, with a way back from each.",
      pauseAfter: 0.6,
    },
    {
      id: "q11-shadow",
      text: "First, shadow: mirror live traffic to the new model, log its predictions, and return none of them. You compare outputs, latency and errors under real load, with no user exposed.",
      pauseAfter: 0.6,
    },
    {
      id: "q11-canary",
      text: "Then a canary: send one to five percent of traffic to the new version, and watch the business and model guardrails. Ramp up while they hold, and send traffic straight back the moment they don't.",
      pauseAfter: 0.6,
    },
    {
      id: "q11-rollback",
      text: "That's the rollback, and it should be a config change, not a redeploy: the previous artifact and its serving config stay in the registry, and the traffic weights flip back. The catch is state. Feature store writes, A B assignment logs and caches the new model touched don't flip back with it, so rehearse it.",
      pauseAfter: 0.8,
    },

    // ── 12. A B tests, shadows and challengers ────────────────────────────
    {
      id: "q12",
      scene: true,
      text: "Question twelve. What is A B testing for models, and how does it differ from shadow testing? A shadow test can check parity, in outputs and latency, but never impact, because users only see the current model's predictions. Nobody can click a recommendation they were never shown.",
      pauseAfter: 0.6,
    },
    {
      id: "q12-ab",
      text: "An A B test serves each variant to real users and compares business metrics, like click-through or conversion. It measures impact, at the price of exposure.",
      pauseAfter: 0.6,
    },
    {
      id: "q12-champ",
      text: "Champion and challenger names the routine: the champion serves production, challengers run beside it, in shadow or on a canary slice, and one takes over only by beating it on live traffic, not just on an offline benchmark.",
      pauseAfter: 0.9,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    { id: "rapid-in", scene: true, text: "Five more, quickly.", pauseAfter: 0.5 },
    {
      id: "r-registry",
      text: "A model registry versions trained artifacts with their metadata: the data version, hyperparameters, evaluation metrics and deployment history. It enforces promotion from staging to production, and turns a rollback into a lookup rather than a rebuild.",
      pauseAfter: 0.6,
    },
    {
      id: "r-retrain",
      text: "Retraining has four triggers: a schedule, a drift alert, live accuracy or a proxy falling below a threshold, and enough new labeled data. Continuous training automates them, and every version it produces goes through the same gate and staged rollout.",
      pauseAfter: 0.6,
    },
    {
      id: "r-bluegreen",
      text: "Blue-green keeps two full environments. Blue serves while green gets the new model and warms up; traffic flips in one switch, and flips back if anything breaks. Near-zero downtime and instant rollback, for the cost of running both. A canary is the gradual version.",
      pauseAfter: 0.6,
    },
    {
      id: "r-tracking",
      text: "Experiment tracking, with tools like MLflow or Weights and Biases, logs every run's hyperparameters, metrics, code version and artifacts. Without it, nobody can say which run made the model in production.",
      pauseAfter: 0.6,
    },
    {
      id: "r-package",
      text: "And to package a model, serialize the artifact, pin the runtime and dependencies, and build a container so serving matches training. Exporting to ONNX, a framework-neutral format, frees it from the training library and opens faster runtimes.",
      pauseAfter: 0.9,
    },
    {
      id: "close",
      scene: true,
      text: "Versioned, gated, watched and reversible: that's a model you can leave running.",
      pauseAfter: 0.7,
    },
    {
      id: "next",
      text: "Large language models bring a serving problem of their own: generation is slow and memory-hungry. Next: serving LLMs.",
    },
  ],
};
