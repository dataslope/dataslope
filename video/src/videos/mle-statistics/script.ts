import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Statistics and probability" (16:9), Part 4 of the Machine
 * Learning Engineer interview prep videos
 * (agent-outputs/20261120-1400-machine-learning-engineer-interview-video-plan.md,
 * "4, Statistics and probability"), after
 * content/interview/machine-learning-engineer/statistics-and-probability.mdx.
 * It answers seventeen of the page's eighteen questions: twelve worked
 * through, numbered aloud and read in the page's words, then five quick ones
 * (13 to 17, numbered on screen only). "Explain the bias–variance
 * decomposition." is not here: Part 1 answers it, together with
 * ml-fundamentals' bias–variance trade-off.
 *
 *   1. "What is the difference between standard deviation and standard
 *      error?" ("q1").
 *   2. "What does the Central Limit Theorem say, and why does it matter?"
 *      ("q2"); 3. "What is the Law of Large Numbers, and how is it
 *      different from the CLT?" ("q3").
 *   4. "What is a confidence interval, really?" ("q4").
 *   5. "What is bootstrapping, and when do you use it?" ("q5").
 *   6. "What exactly is a p-value?" ("q6"); 7. "What is hypothesis testing,
 *      and what are its steps?" ("q7").
 *   8. "What is a permutation test?" ("q8").
 *   9. "What are Type I and Type II errors, and what is power?" ("q9"; read
 *      "type one and type two").
 *   10. "What is selection (sampling) bias?" ("q10"; read without the
 *       bracket).
 *   11. "What is Maximum Likelihood Estimation (MLE)?" ("q11"; read
 *       "maximum likelihood estimation").
 *   12. "What is Bayes' theorem?" ("q12").
 *   Quick ("rapid-in"): 13. "What is a random variable, and what's the
 *   difference between a PMF and a PDF?" ("r-pdf"); 14. "Describe the
 *   distributions an ML engineer should know." ("r-dist"); 15. "What
 *   sampling methods should you know?" ("r-sample"); 16. "Covariance vs
 *   correlation, what's the difference?" ("r-corr"); 17. "Why does
 *   correlation not imply causation?" ("r-cause").
 *
 * The page asks them in another order. Here one decision runs through the
 * first nine: a new model scores 91.0% on the 2,000 test examples where the
 * old one scored 90.5%; ship it? Standard error, the CLT and an interval
 * say how much each score wobbles; the bootstrap covers what has no
 * formula; the p-value and the test's steps set up the decision; the
 * permutation test makes it, paired on the shared examples; power says how
 * big the online test must be. Then the data itself (selection bias), where
 * a model's number comes from (maximum likelihood), and a prior (Bayes,
 * with base rates in production). The quick round covers the definitions.
 * Opens fresh on the comparison, never on "the last video", and closes on
 * the plan's bridge into Part 5.
 *
 * Overlap with the Data Scientist series, checked: ds-statistics and
 * ds-probability use their own pages' exponential population (seed 42,
 * mean 5.02), 94 of 100 intervals, a coin's 62 heads, 1 − 0.95²⁰, a 1%,
 * 99%, 5% disease test and ice cream with temperature held fixed;
 * ds-experiment-design sizes a 10% to 12% test and measures peeking on A/A
 * tests by day; ds-llm-evaluation pairs two LLM versions on 500 items with
 * McNemar's test. None of those examples is reused. This video's are a
 * classifier's test set, a permutation test on it (the page's own
 * question), a click-rate test sized from 5% to 5.5%, labels checked as
 * they arrive, approved loans, and fraud flags. The base-rate numbers (1 in
 * 1,000, 99%, 1%) are the page's own chart's, applied to fraud.
 *
 * On screen, beat by beat (for phase 2; nothing is built yet). Colors keep
 * the series' meanings (interview.tsx): red the trap or the error, green the
 * right answer, yellow what the narration points at, blue data. The two
 * models are "old" and "new" in neutral ink throughout (neither is the
 * answer until question eight).
 *   hook: two rows, "Old model 90.5%" and "New model 91.0%", "on the same
 *     2,000 test examples" under them; "Ship it?" on "Ship". The zebra at
 *     the right.
 *   plan: seventeen numbered dots, twelve blue and five grey.
 *   q1: question card; a strip of 2,000 tiny cells, right (blue) and wrong
 *     (grey), "SD 0.29" over it, on "point two nine".
 *   q1-se: the accuracy's sampling spread, a narrow normal curve centred on
 *     91.0%, "SE = SD / √n = 0.64 points" (SE.se) under it; on "the gap",
 *     the half-point gap between the two models drawn beside it, shorter,
 *     in yellow.
 *   q1-n: the curve of SE against n (SE.curve), dots at 2,000 and 8,000, the
 *     second labelled "a third of a point" on "eight thousand"; "4× the
 *     data, ½ the error" in yellow.
 *   q2: question card; the page's skewed population histogram
 *     (CLT.population), blue; the means' histogram (CLT.means) building
 *     beside it into a bell.
 *   q2-sim: "formula 0.477" and "simulated 0.475" under the bell, each lit
 *     as said; "3,000 samples of 40" as the note.
 *   q2-limit: two chips, "mean" and "sum" (green), then "median" and "p95
 *     latency" (yellow, "no formula"), on "no such formula".
 *   q3: question card; a running mean (LLN.at) settling onto the dashed
 *     population mean, "where" labelled at the end of the line, "shape"
 *     pointing back at the bell from q2.
 *   q4: question card; "estimate ± 1.96 × SE" in one line; then a hundred
 *     horizontal intervals (CI.intervals) stacked, the true 91% as a
 *     vertical line; the four that miss outlined in yellow as "ninety-six
 *     of the hundred" is said, the rest blue (a miss is what a 95%
 *     procedure does one time in twenty, not an error, so not red).
 *   q4-sim: "The 95% belongs to the procedure" under the stack, green.
 *   q4-slice: ten slices of 40, three of them scoring "40 / 40"
 *     (SLICE.perfect); their textbook intervals collapse to a dot on 100%,
 *     red (the formula's failure, not the slice's); "Textbook interval:
 *     covers 70%" in red, "Wilson: 97%" in green, each beside an interval
 *     drawn for one perfect slice.
 *   q5: question card; a row of ten data dots, resampled with replacement
 *     three times (repeats doubled, dropouts faded); "× 5,000"; the
 *     hourglass spot beside the latency histogram on "latencies".
 *   q5-p95: simulated latencies (BOOT_P95.latency) as a skewed histogram,
 *     the p95 marked at 110 ms; then the bootstrap's 5,000 p95s
 *     (BOOT_P95.boots) as a histogram with 101 to 120 ms shaded, green; a
 *     "Simulated latencies" note.
 *   q5-unit: 200 user boxes of 10 rows each; two intervals: "resample rows"
 *     in red (a third narrower) and "resample users" in green, the true
 *     spread marked as a bracket over the green one (CLUSTER).
 *   q6: question card; the page's p-value as an area: a null curve with the
 *     tails beyond the observed value shaded, yellow, "assuming the null".
 *   q6-not: two struck misreadings in red, "P(null is true)" and "P(it's a
 *     fluke)" (the struck lines are wrong, so strikes are right here).
 *   q7: question card; four numbered steps inked in turn: state H0 and H1;
 *     fix α and n; compute the statistic and p; reject if p < α. On
 *     "Here", H0 reads "old and new equally accurate", α 5%,
 *     n the 2,000.
 *   q7-peek: a line of ten looks at 200, 400 … 2,000 labels; a note
 *     "Simulation: two equally good models, 10,000 runs"; "Stop at the first
 *     p < 0.05: 19% false positives" (PEEK.everyLook) in red, "Decide once
 *     at 2,000: 5%" (PEEK.onceAtEnd) in green.
 *   q8: question card; the page's two groups as dots, the labels shuffled
 *     once; the null histogram (PERM_PAGE.null) with the observed 5.9 marked
 *     and the tails beyond it shaded, "p = 0.024".
 *   q8-models: the two models' 4,000 answers pooled and shuffled; the null
 *     histogram (PERM_MODELS.unpairedNull) wide, the 0.5-point gap in the
 *     middle of it, "p = 0.62".
 *   q8-paired: a 2×2 table of agreement: both right 1,806, both wrong 176,
 *     only old 4, only new 14, the two off-diagonal cells lit yellow; the
 *     paired null (PERM_MODELS.pairedNull, a narrow spike train) with the
 *     gap out in its tail, "p = 0.03", green; "Same gap, different test";
 *     "Reject at α = 5%" on "rejects the null". Not "it's real": that is the
 *     p-value's own misreading, which "q6-not" has just ruled out.
 *   q9: question card; the page's two-worlds picture: the null and
 *     alternative curves, a critical line, α (red tail) and β (red area
 *     under the alternative), power (green area).
 *   q9-trade: the critical line slides right on "lowering alpha": the red α
 *     tail shrinks and the β area grows.
 *   q9-online: power against users per arm (POWER.curve), 80% dashed, the
 *     crossing at about 31,000 lit; "5% → 5.5% click rate"; "Half the lift:
 *     ×4 users" in yellow.
 *   q9-null: the curve's point at 5,000 lit, "20%" in red; "Found nothing ≠
 *     no difference" as a line under it.
 *   q10: question card; applicants as a field of dots, those approved
 *     inside an outline; outcomes visible only inside it.
 *   q10-loans: two bars, "approved: 5.3%" (blue, the only rate the lender
 *     sees) and "all applicants: 11.6%" (blue), the gap between them red;
 *     three small bars for 1,000, 10,000 and 60,000 approved loans
 *     (SELECTION.bySize), all at about 5.5%, none moving toward 11.6%.
 *     A "Simulation" note.
 *   q10-fix: a scatter of a few dots outside the outline, "approved at
 *     random: 2%", their rate "11.8%" in green beside the true 11.6%; "The
 *     price: some bad loans", grey.
 *   q11: question card; a likelihood curve over a click rate, its peak
 *     marked "maximum likelihood" (MLE.grid, MLE.curveSmoothed).
 *   q11-log: "0.5 × 0.5 × … (2,000 times) = 0.0" in red; "log: −1,386.29"
 *     in green.
 *   q11-loss: two lines: "Normal likelihood → squared error",
 *     "Bernoulli likelihood → log loss", each lit as said.
 *   q11-small: the likelihood for 3 clicks in 3 views (MLE.curve33) piling
 *     against 100%, red; the smoothed curve (4 in 5) peaking at 80%, green;
 *     "L2 = a normal prior on the weights" under it.
 *   q12: question card; the formula in words: posterior = likelihood ×
 *     prior / evidence. The credit card spot.
 *   q12-fraud: the page's base-rate grid, redrawn as fraud: 1,098 dots, one
 *     per flagged transaction, 99 fraud in blue and 999 honest in grey,
 *     "Flagged: 1,098 of 100,000"; "A flag is fraud: 9%" in yellow
 *     (BAYES.rare). The model is not at fault, so nothing is red.
 *   q12-shift: the same model at 1 in 100: 990 and 990, "50%"
 *     (BAYES.common); under both grids, "precision 9% → 50%" in yellow and
 *     "recall 99% → 99%" in ink.
 *   rapid-in: the quick round's five numbered rows (RapidFire), 13 to 17.
 *   r-pdf: a bar chart (mass) beside the page's narrow density (standard
 *     deviation 0.3), its peak reading 1.33 above a dashed line at 1, on
 *     "pass one"; the area within one standard deviation shaded, "area
 *     0.68".
 *   r-dist: five small curves with their names, each lit as said; "mean =
 *     variance" under Poisson.
 *   r-sample: four small diagrams: random dots, strata bands, picked
 *     clusters, a stream into ten slots.
 *   r-corr: covariance in cm·kg against m·kg (RAPID.covariance: 74.2
 *     against 0.742), the correlation 0.70 both times; then the U-shaped
 *     scatter, "r = 0".
 *   r-cause: three outlined boxes, "Hot weather" with arrows to "Ice cream
 *     sales" and "Drownings", the arrow between those two dashed and
 *     struck; the ice cream spot beside the first box.
 *   next: <NextLine> "Next: deep learning" on "deep learning".
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a
 * cue whose word disappears throws in the Studio rather than silently
 * drifting.
 *
 * Facts. check.mjs computes every one in Pyodide 314.0.7 (NumPy 2.4.6),
 * the runtime the page's blocks run in, into results.json, which data.ts
 * reads; every draw is seeded; it fails if the page stops saying what is
 * quoted or the narration stops saying what was computed:
 *   - hook: the video's own two models, constructed rather than drawn: of
 *     2,000 examples, 1,806 both right, 176 both wrong, 4 only the old
 *     model, 14 only the new: 90.5% and 91.0%.
 *   - q1: the definitions and SE = σ / √n: the page; "each halving of the
 *     standard error costs four times the data" is its chart's caption.
 *     Arithmetic: the SD of a right-or-wrong at 91% is √(0.91 × 0.09) =
 *     0.286; over √2,000, 0.0064 ("two thirds of a percentage point"); at
 *     8,000, 0.0032 ("a third of a point").
 *   - q2: "as long as its variance is finite" is the theorem's condition,
 *     standard rather than the page's, said because heavy-tailed latencies
 *     are where an ML engineer meets it. The page's own block (exponential,
 *     scale 3, 100,000; 3,000
 *     samples of 40, seed 42): SE 0.477 by the formula, 0.475 simulated;
 *     population skewness 2.0, the means' 0.33. "Means and sums" and the
 *     median and percentile as statistics without such a formula: the
 *     page's bootstrap answer.
 *   - q3: the page's "where" and "what shape"; the running mean drawn is
 *     the first 2,000 values of the same population.
 *   - q4: the procedure, 1.96, the misreading: the page. Simulation (seed
 *     2026): 100 test sets of 2,000 for a model 91% accurate, 96 intervals
 *     cover. The slice (seed 7, 100,000 slices of 40 at 97%): 30% score
 *     40 / 40 (0.97⁴⁰ = 0.296), and there the textbook interval has zero
 *     width; it covers 70.0%, Wilson's score interval 96.9% ("ninety-seven").
 *   - q5: the method and "no formula ... medians, ratios": the page; its own
 *     block gives 50.15 and (48.78, 51.47), and the formula (48.82, 51.49),
 *     kept in results.json, not said. Simulation (seed 95): 1,000 lognormal
 *     latencies (median 39 ms); p95 109.8 ms ("a hundred and ten"), 5,000
 *     resamples put it at 101.2 to 119.8 ("a hundred and one and a hundred
 *     and twenty"). Clustered (seed 12): 200 users × 10 rows, each user's
 *     own accuracy; resampling rows gives a standard error of 0.0083,
 *     resampling users 0.0125, the true spread over 3,000 fresh datasets
 *     0.0124: the row interval is 33% narrower ("a third too narrow").
 *   - q6, q7: the definitions, the misreadings and the steps: the page,
 *     including "fixing ... in advance is what keeps the test honest".
 *     Simulation (seed 404): two equally good models (90% each), 10,000
 *     runs, checked every 200 labels up to 2,000: stopping at the first
 *     p < 0.05 declares a difference 19% of the time; checking once at
 *     2,000, 5% (PEEK in data.ts).
 *   - q8: the page's own block (seed 1): observed 5.87 ("five point nine"),
 *     p = 0.024. The two models, 10,000 shuffles each (seed 7): pooling all
 *     4,000 answers, p = 0.62; swapping within each example (a sign flip on
 *     the difference), p = 0.029 ("point oh three"), matching the exact
 *     sign test on 14 of 18, 0.031.
 *   - q9: the definitions and what raises power: the page. Arithmetic (the
 *     two-proportion sample-size formula, two-sided 5%, 80% power, stated as
 *     assumptions on screen): 5% to 5.5% needs 31,234 per arm ("about
 *     thirty-one thousand"), 5% to 5.25% needs 122,124, 3.9 times; at 5,000
 *     per arm, power 0.20 ("one time in five"). Checked by simulation (seed
 *     8): 0.21 at 5,000, 0.80 at 31,234.
 *   - q10: the definition and "training on a population that differs from
 *     serving traffic": the page. Simulation (seed 31): 100,000 applicants,
 *     a latent risk, an old model that sees it with noise and approves the
 *     safest-looking 60%; 11.6% of all applicants default, 5.3% of the
 *     approved; samples of 1,000, 10,000 and 60,000 approved loans give
 *     5.6%, 5.7% and 5.3%; a 2% random slice (1,996 applicants) gives 11.8%.
 *     Approving a random slice regardless of score is the standard way to
 *     get unbiased labels, and its cost (some bad loans) is said.
 *   - q11: the definition, the log because products underflow, the
 *     Gaussian mean, logistic regression's objective, "can overfit small
 *     samples": the page. Measured: 0.5 to the 2,000th is 0.0 in float64
 *     (the smallest positive float64 is about 5e-324), its log −1,386.29.
 *     Three clicks in three views: the likelihood peaks at 1.0; adding one
 *     click and one skip (the posterior mean under a flat prior, Laplace's
 *     rule) gives 4 / 5 = 0.8. Maximizing a normal likelihood with fixed
 *     variance is least squares, and L2 regularization is the MAP estimate
 *     under a normal prior on the weights: standard results.
 *   - q12: the formula and the base-rate trap: the page. The numbers are
 *     the page's own chart (base-rate-grid: 100,000 people, 1 in 1,000,
 *     99% sensitivity, 1% false positives, 99 of 1,098), told as fraud:
 *     99 frauds flagged, 999 honest, precision 9.0%. At 1 in 100: 990 and
 *     990, 50%; recall 99% at both.
 *   - quick: the page's answers. The density: its chart's normal with a
 *     standard deviation of 0.3 peaks at 1.33 (1 / (0.3 √2π)); r(x, x²) on
 *     a symmetric grid of 101 points is 0 to rounding; the covariance
 *     example is the video's own (seed 23, 200 heights and weights: 74.2 in
 *     centimeter kilograms, 0.742 in meter kilograms, correlation 0.70 both
 *     ways), on screen only; ice cream, drownings and temperature are the
 *     page's.
 *   - the bridge is the plan's 4 → 5: maximum likelihood, minimized as log
 *     loss, is what training does.
 *
 * Written for Drew's ear: CLT, ML and L2 in plain caps (CLT is first said
 * in full, in question two's own words); "type one" and "type two" in
 * words; alpha and beta said as words; p95 said "ninety-fifth percentile";
 * no sentence opens with "A" before an initialism; numbers as they are
 * said. "q6-not" carries the misreading the round turns on, so it is voiced
 * [slowly], as ds-statistics voiced its own.
 */
export const script: NarrationScript = {
  id: "mle-statistics",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Your new model scores ninety-one percent on two thousand test examples. The model in production scored ninety and a half, on the same examples. Ship it?",
      pauseAfter: 0.8,
    },
    {
      id: "plan",
      text: "The statistics round asks how far to trust a number like that. Seventeen questions: twelve worked through, mostly on this decision, then five quick ones.",
      pauseAfter: 0.7,
    },

    // ── 1. Standard deviation and standard error ──────────────────────────
    {
      id: "q1",
      scene: true,
      text: "Question one. What is the difference between standard deviation and standard error? Standard deviation is the spread of single observations. Each test example is right or wrong: at ninety-one percent, a spread of point two nine.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-se",
      text: "Standard error is the spread of a statistic, like the accuracy, across repeated samples: the standard deviation over the square root of n. On two thousand examples, it's about two thirds of a percentage point, more than the gap.",
      pauseAfter: 0.7,
    },
    {
      id: "q1-n",
      text: "More data shrinks the standard error, never the standard deviation, and only at a square-root rate. Halving it, to a third of a point, takes eight thousand examples: four times the data.",
      pauseAfter: 0.8,
    },

    // ── 2, 3. The CLT and the law of large numbers ────────────────────────
    {
      id: "q2",
      scene: true,
      text: "Question two. What does the Central Limit Theorem say, and why does it matter? For a large enough sample, the sample mean is approximately normal, whatever the population's shape, as long as its variance is finite. That justifies normal intervals and tests, even on skewed data.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-sim",
      text: "The page's simulation draws three thousand samples of forty from a heavily skewed population. Their means pile up in a bell, with a spread of point four seven five, against the formula's point four seven seven.",
      pauseAfter: 0.7,
    },
    {
      id: "q2-limit",
      text: "It covers means and sums, so accuracy and average loss. For a median, or a ninety-fifth percentile latency, there's no such formula.",
      pauseAfter: 0.6,
    },
    {
      id: "q3",
      text: "Question three. What is the Law of Large Numbers, and how is it different from the CLT? The law says where the sample mean ends up: at the population mean. The CLT says what shape its error takes on the way there.",
      pauseAfter: 0.8,
    },

    // ── 4. Confidence intervals ───────────────────────────────────────────
    {
      id: "q4",
      scene: true,
      text: "Question four. What is a confidence interval, really? It's a procedure, not a probability about one interval: the estimate, plus or minus one point nine six standard errors, built on every repeat of an experiment, contains the true value about ninety-five percent of the time.",
      pauseAfter: 0.6,
    },
    {
      id: "q4-sim",
      text: "Simulate a hundred test sets for a model that's truly ninety-one percent accurate, and ninety-six of the hundred intervals cover it. Each one either does or doesn't; the ninety-five percent belongs to the procedure.",
      pauseAfter: 0.7,
    },
    {
      id: "q4-slice",
      text: "The follow-up is where it breaks. On a slice of forty examples, with a model that's ninety-seven percent right, three slices in ten score forty out of forty, and the textbook interval shrinks to a point. Across all slices, it covers the truth only seventy percent of the time. Wilson's score interval doesn't collapse, and covers ninety-seven.",
      pauseAfter: 0.8,
    },

    // ── 5. The bootstrap ──────────────────────────────────────────────────
    {
      id: "q5",
      scene: true,
      text: "Question five. What is bootstrapping, and when do you use it? Resample your data with replacement, at its own size, thousands of times, recompute the statistic, and read the interval off the percentiles. No formula needed.",
      pauseAfter: 0.6,
    },
    {
      id: "q5-p95",
      text: "Take a thousand simulated request latencies. The ninety-fifth percentile is a hundred and ten milliseconds, and five thousand resamples put it between a hundred and one and a hundred and twenty.",
      pauseAfter: 0.7,
    },
    {
      id: "q5-unit",
      text: "The follow-up: resample the unit that was sampled. If two thousand test rows come from two hundred users, resampling rows treats them as independent, and the interval comes out a third too narrow. Resample whole users.",
      pauseAfter: 0.8,
    },

    // ── 6, 7. The p-value, and the test's steps ───────────────────────────
    {
      id: "q6",
      scene: true,
      text: "Question six. What exactly is a p-value? The probability of data at least as extreme as yours, assuming the null hypothesis is true. Small means your data would be surprising if nothing were going on.",
      pauseAfter: 0.6,
    },
    {
      id: "q6-not",
      text: "[slowly] Because it assumes the null, it can't be the probability that the null is true, or that your result is a fluke.",
      pauseAfter: 0.7,
    },
    {
      id: "q7",
      text: "Question seven. What is hypothesis testing, and what are its steps? State the null and the alternative. Fix the significance level, alpha, and the sample size, before you look. Compute a test statistic and its p-value, and reject the null if p is below alpha. Here, the null is that the two models are equally accurate.",
      pauseAfter: 0.6,
    },
    {
      id: "q7-peek",
      text: "Fixing it all in advance is what keeps the test honest. Simulate two equally good models, and check after every two hundred labels: stop at the first p under five percent, and you find a difference nineteen percent of the time, not five.",
      pauseAfter: 0.8,
    },

    // ── 8. The permutation test ───────────────────────────────────────────
    {
      id: "q8",
      scene: true,
      text: "Question eight. What is a permutation test? It builds the null distribution by shuffling the group labels, which are interchangeable if there's no effect. On the page's two groups of fifty, the difference is five point nine, and ten thousand shuffles match or beat it two point four percent of the time.",
      pauseAfter: 0.6,
    },
    {
      id: "q8-models",
      text: "Now the two models. Pool their four thousand right-or-wrong answers and shuffle, and p is point six two. Nothing there.",
      pauseAfter: 0.6,
    },
    {
      id: "q8-paired",
      text: "But they answered the same two thousand examples, and disagree on only eighteen, of which the new model wins fourteen. Shuffle within each pair instead, swapping which model gave which answer, and p is point oh three. Same gap, but the paired test uses how the data was collected, and at five percent it rejects the null.",
      pauseAfter: 0.8,
    },

    // ── 9. Errors and power ───────────────────────────────────────────────
    {
      id: "q9",
      scene: true,
      text: "Question nine. What are type one and type two errors, and what is power? Type one is a false positive, rejecting a true null, at rate alpha. Type two is a false negative, missing a real effect, at rate beta. Power, one minus beta, is the chance of catching a real effect.",
      pauseAfter: 0.6,
    },
    {
      id: "q9-trade",
      text: "It rises with more data, a bigger effect, less noise, or a looser alpha. Lowering alpha trades false positives for false negatives.",
      pauseAfter: 0.6,
    },
    {
      id: "q9-online",
      text: "Whether users notice is an online test, where you choose the sample size. Catching a click rate moving from five percent to five and a half, at eighty percent power, takes about thirty-one thousand users per arm. Half that lift takes four times the users.",
      pauseAfter: 0.6,
    },
    {
      id: "q9-null",
      text: "With five thousand per arm, that lift is caught one time in five. So a test that small, which finds nothing, hasn't shown the models are equal.",
      pauseAfter: 0.6,
    },
    {
      id: "q10-in",
      text: "Every test so far trusted the sample. Next, whether it's the right one.",
      pauseAfter: 0.55,
    },

    // ── 10. Selection bias ────────────────────────────────────────────────
    {
      id: "q10",
      scene: true,
      text: "Question ten. What is selection bias? The sample doesn't represent the population you want to generalize to, so estimates stay off however much data you collect. In machine learning, it's training on a population unlike your serving traffic.",
      pauseAfter: 0.6,
    },
    {
      id: "q10-loans",
      text: "In a simulation, a lender only sees defaults on the loans it approved. Among those, five point three percent default. Across every applicant, it's eleven point six percent. Sixty times as many approved loans don't close that gap.",
      pauseAfter: 0.7,
    },
    {
      id: "q10-fix",
      text: "The fix is in how the data is collected. Approve a small random slice whatever the score, here two percent, and its default rate is eleven point eight percent. The price is some bad loans, for labels you can trust.",
      pauseAfter: 0.8,
    },

    // ── 11. Maximum likelihood ────────────────────────────────────────────
    {
      id: "q11",
      scene: true,
      text: "Question eleven. What is maximum likelihood estimation? Pick the parameters that make the observed data most probable, under your model.",
      pauseAfter: 0.5,
    },
    {
      id: "q11-log",
      text: "You maximize the log of the likelihood, because the product underflows. Give each of two thousand labels a probability of one half, and float sixty-four rounds their product to exactly zero. Its log is just minus thirteen hundred and eighty-six.",
      pauseAfter: 0.6,
    },
    {
      id: "q11-loss",
      text: "For a normal model, the likelihood peaks at the sample mean, and maximizing it is least squares. For logistic regression, it's minimizing the log loss.",
      pauseAfter: 0.6,
    },
    {
      id: "q11-small",
      text: "The catch is small samples. Three clicks in three views, and the likelihood peaks at a hundred percent. Add one pretend click and one pretend skip, a prior, and it's four in five. An L2 penalty is the same idea for weights: a normal prior on them.",
      pauseAfter: 0.8,
    },

    // ── 12. Bayes ─────────────────────────────────────────────────────────
    {
      id: "q12",
      scene: true,
      text: "Question twelve. What is Bayes' theorem? It updates a prior belief with evidence: the posterior is the likelihood times the prior, over the evidence. The classic trap is the base rate.",
      pauseAfter: 0.6,
    },
    {
      id: "q12-fraud",
      text: "Say a fraud model catches ninety-nine percent of fraud and flags one percent of honest transactions, and one in a thousand is fraud. Of a hundred thousand, it flags ninety-nine frauds and nine hundred and ninety-nine honest ones. A flag is fraud only nine percent of the time.",
      pauseAfter: 0.7,
    },
    {
      id: "q12-shift",
      text: "And precision moves with the base rate, while recall doesn't. If fraud rises to one in a hundred, the same model's flags are right half the time. Nothing in the model changed.",
      pauseAfter: 0.8,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Five quick ones, on the vocabulary.",
      pauseAfter: 0.5,
    },
    {
      id: "r-pdf",
      text: "A random variable maps outcomes to numbers. A discrete one has a mass function: each value's probability. A continuous one has a density, where probability is area, so a single point has probability zero, and the height can pass one, as a narrow normal's does.",
      pauseAfter: 0.6,
    },
    {
      id: "r-dist",
      text: "The distributions to know: Bernoulli and binomial for yes-or-no outcomes and their counts. Normal for symmetric data, and for means. Poisson for rare-event counts, where the mean equals the variance. Uniform for equal chances, exponential for waiting times. Their supports and moments say which likelihood fits.",
      pauseAfter: 0.6,
    },
    {
      id: "r-sample",
      text: "Sampling: simple random gives every unit the same chance. Stratified samples within groups, so each one shows up, like a rare class in every test set. Cluster sampling takes whole groups, to cut cost. Reservoir sampling handles a stream.",
      pauseAfter: 0.6,
    },
    {
      id: "r-corr",
      text: "Covariance says whether two variables move together, but its size depends on their units. Correlation divides by both standard deviations, landing between minus one and one, and it only sees straight lines: y equals x squared, on a symmetric range, has a correlation of zero.",
      pauseAfter: 0.6,
    },
    {
      id: "r-cause",
      text: "And correlation isn't causation: a confounder can drive both, as hot weather drives ice cream sales and drownings. A model can predict from a correlation. Deciding what to change needs a randomized experiment, or a causal method that rules confounders out.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "Minimizing log loss is maximum likelihood, and a deep network does it with millions of weights. Next: deep learning.",
    },
  ],
};
