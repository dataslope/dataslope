import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Statistics" (16:9), Part 1 of the Data Scientist interview
 * prep videos (agent-outputs/20261022-0445-data-scientist-interview-video-plan.md),
 * after content/interview/data-scientist/statistics.mdx. It answers the
 * nineteen questions the plan gives this page, in the page's own order of
 * ideas (sampling, estimation, testing): sixteen worked through and numbered
 * aloud, then three at speed (numbered 17 to 19 on screen only). The page's
 * probability questions are answered in Part 2, and its error, power,
 * one-sided, multiple-comparison and Simpson's questions in Experimentation.
 *
 *   1. parameter and statistic ("param"); 2. standard error and standard
 *      deviation ("se"); 3. the sampling distribution ("sampling").
 *   4. the Central Limit Theorem ("clt"); 5. the Law of Large Numbers, and
 *      how it differs ("lln").
 *   6. maximum likelihood ("mle"); 7. an unbiased estimator ("unbiased").
 *   8. the 95% confidence interval ("ci").
 *   9. hypothesis testing's four steps ("steps"); 10. the null and the
 *      alternative for a click-through test ("ctr"); 11. the p-value
 *      ("pvalue").
 *   12. z or t ("zt"); 13. chi-square ("chi"); 14. ANOVA ("anova").
 *   15. effect size ("effect"); 16. p-hacking ("hack").
 *   At speed ("rapid-in"): frequentist and Bayesian (with the
 *   Experimentation page's Bayesian A/B question); parametric and
 *   non-parametric; correlation and causation.
 *
 * The opening, the line into the quick round and the bridge are written
 * fresh, unlike any Data Analyst video's (the series rule since 2026-10-22).
 * No series intro yet: the first scene opens at frame 0, and adding the intro
 * later needs no re-voicing.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every number ran in Pyodide 314.0.7 with NumPy 2.4.6 and SciPy
 * 1.18.0 (the runtime the page's blocks run in), by check.mjs into
 * results.json, which data.ts reads. Where the course videos show the same
 * run, this one uses the same code and seed, so the numbers agree:
 *   - "hook": the page's interval block gives 11.43 to 14.82.
 *   - "param" to "sampling", the page's sampling block (seed 42): an
 *     exponential population of 100,000 with mean 5.02 ("five point oh two")
 *     and standard deviation 5.03 ("about five"); its first sample of 50 has
 *     mean 5.57; the standard error is 0.711 by the formula and 0.698 over
 *     the block's 2,000 sample means ("point seven one", "point seven oh");
 *     at n = 200 it is 0.3554 ("point three six").
 *   - "clt", the video's own 10,000 means at each size from that population
 *     (seed 2026): skewness 1.90 at n = 1, 0.87 at 5 ("falls by half"), 0.44
 *     at 30 ("halves again").
 *   - "lln", the video's own running average of 2,000 draws (seed 90210):
 *     5.90 after 10, 5.36 after 100, 5.11 after 2,000.
 *   - "mle", the video's own 12 clicks in 40 views and 120 in 400: both
 *     likelihoods peak at 0.30.
 *   - "unbiased", the video's own 10,000 samples at each size (seed 1234),
 *     true variance 1: dividing by n averages 0.805 at n = 5 ("about twenty
 *     percent low"), by n − 1 1.006.
 *   - "ci", the course's canonical simulation (seed 7, as Stats-6
 *     Estimation): 94 of 100 intervals cover, 6 miss.
 *   - "pvalue", the course's coin (seed 0, as Stats-7 TestingHypotheses): 62
 *     heads in 100; p = 0.0211 over 100,000 fair-coin runs.
 *   - "zt": t cutoffs 2.571 at 5 degrees of freedom and 2.042 at 30; z 1.960.
 *   - "chi", the course's device and churn (seed 5, as Stats-7): 103 mobile
 *     churners against 86.7 expected; chi-square 11.88, p = 0.0026.
 *   - "anova", the page's three groups: F = 37.9; the course's pairwise block
 *     (seed 0, as Stats-7): ten t-tests on five identical groups fire in
 *     32.4% of 800 trials, "a third of the time".
 *   - "effect", the course's challenge (seed 2024, as Stats-8
 *     InterpretingResults): 300,000 per group, B ahead by 0.142 ("a seventh
 *     of a point"), p = 0.00026, d = 0.0094.
 *   - "hack", the course's twenty tests of nothing (seed 123, as Stats-7):
 *     one under 0.05 (test 14 at 0.033); 1 − 0.95²⁰ = 0.642.
 *   - rapid: the page's A/B table (120 and 150 of 1,000) under flat priors,
 *     P(B higher) = 0.975 from 200,000 seeded draws; the course's support
 *     queues (seed 6, as Stats-7): Welch p = 0.72, Mann-Whitney p = 0.033;
 *     DA Part 3's own 200 days (its results.json): ice cream and drownings r
 *     = 0.57, 0.08 with temperature held fixed.
 *
 * Written for Drew's ear, as the Data Analyst series is: numbers as they are
 * said, and every abbreviation expanded the first time (SE, CLT, LLN,
 * MLE, CI, CTR, ANOVA).
 */
export const script: NarrationScript = {
  id: "ds-statistics",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Statistics is the round most data science candidates are rustiest on. The formulas come back quickly. What gives people away is a single sentence: a p-value read as the chance the null is true, or a ninety-five percent interval read as a ninety-five percent chance.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "Nineteen questions follow, in the order the ideas build: sampling, then estimation, then testing. Sixteen come with a figure. The last three are short.",
      pauseAfter: 0.7,
    },
    { id: "param-in", text: "Everything here crosses one bridge, from a sample to its population. Start at the two ends." },

    // ── 1, 2, 3. Sampling ─────────────────────────────────────────────────
    {
      id: "param",
      scene: true,
      text: "Question one. What's the difference between a parameter and a statistic? A parameter describes the population, like its true mean, and it's usually unknown. This population is simulated, so we can see it: five point oh two. A statistic is computed from a sample, like the mean of these fifty values, five point five seven. It estimates the parameter.",
      pauseAfter: 0.7,
    },
    {
      id: "se",
      text: "Question two. What is the standard error, or SE, and how does it differ from the standard deviation? The standard deviation is the spread of single values: about five here. The standard error is the spread of a statistic, like the mean, from one sample to the next. For independent draws, it's the standard deviation over the square root of n: about point seven, for samples of fifty.",
      pauseAfter: 0.6,
    },
    {
      id: "se-root",
      text: "Four times the data halves it: point three six at two hundred. The standard deviation needn't shrink at all.",
      pauseAfter: 0.7,
    },
    {
      id: "sampling",
      text: "Question three. What is a sampling distribution? The distribution of a statistic across every possible sample of the same size. Draw two thousand samples of fifty, and drop each mean as a dot. The data was lopsided, but the means pile up into a narrow bell around five. Its spread is the standard error: point seven oh by simulation, point seven one by the formula.",
      pauseAfter: 0.8,
    },

    // ── 4, 5. The CLT and the LLN ─────────────────────────────────────────
    {
      id: "clt",
      scene: true,
      text: "Question four. Why does the Central Limit Theorem, the CLT, matter? It says the mean of many independent draws is close to normal, whatever shape the data has, as long as its variance is finite. One draw is as lopsided as the population. Average five, and the skew falls by half. Average thirty, and it halves again.",
      pauseAfter: 0.6,
    },
    {
      id: "clt-why",
      text: "That's why one formula builds intervals and tests for almost any metric. It isn't free: heavy tails, dependence or rare extreme events can need far more data, and n of thirty is a rule of thumb, not a theorem.",
      pauseAfter: 0.7,
    },
    {
      id: "lln",
      text: "Question five. What is the Law of Large Numbers, the LLN, and how does it differ from the CLT? As a sample grows, its mean settles on the population's. One running average: five point nine after ten draws, five point three six after a hundred, five point one one after two thousand. The LLN says where the mean ends up. The CLT says what shape its uncertainty takes on the way.",
      pauseAfter: 0.7,
    },
    { id: "estimate-in", text: "With one sample in hand, the next three are about estimating from it." },

    // ── 6, 7. Maximum likelihood, and unbiased estimators ─────────────────
    {
      id: "mle",
      scene: true,
      text: "Question six. What is maximum likelihood estimation, or MLE? Choose the parameter that makes the data you saw most probable. Twelve clicks in forty views: across every possible click rate, the likelihood peaks at point three, the share you saw. Ten times the data keeps the peak and narrows the curve. Its width is the precision.",
      pauseAfter: 0.6,
    },
    {
      id: "mle-more",
      text: "For a normal mean, the MLE is just the sample mean, and logistic regression is fit the same way, by maximizing the likelihood of the labels.",
      pauseAfter: 0.7,
    },
    {
      id: "unbiased",
      text: "Question seven. What makes an estimator unbiased? Its average over many samples equals the true value. The sample mean is unbiased. Variance divided by n is not: each sample's spread is measured from its own mean, which sits closer to its data than the true mean does, so the squares come out small. With five values, it runs about twenty percent low. Dividing by n minus one fixes it.",
      pauseAfter: 0.8,
    },

    // ── 8. The confidence interval ────────────────────────────────────────
    {
      id: "ci",
      scene: true,
      text: "Question eight. What does a ninety-five percent confidence interval, or CI, actually mean? It describes the procedure, not one interval. Take a hundred samples, build an interval from each, and about ninety-five of them catch the true mean. Here, ninety-four do, and six miss.",
      pauseAfter: 0.6,
    },
    {
      id: "ci-fixed",
      text: "So it isn't a ninety-five percent chance that the mean is in this interval. The mean is fixed. The interval is what's random, and any one of them either contains the mean or it doesn't.",
      pauseAfter: 0.7,
    },
    { id: "test-in", text: "The biggest block is next: eight questions on testing." },

    // ── 9, 10, 11. Testing and the p-value ────────────────────────────────
    {
      id: "steps",
      scene: true,
      text: "Question nine. What is hypothesis testing, and what are its four steps? A way to decide whether data give enough evidence against a null hypothesis. One: state the null and the alternative. Two: choose the significance level, alpha, and size the sample. Three: collect the data, and compute the test statistic and its p-value. Four: reject the null if p is below alpha, and say what that means. The first two happen before you see any data.",
      pauseAfter: 0.7,
    },
    {
      id: "ctr",
      text: "Question ten. State the null and alternative hypotheses for an A B test on click-through rate, or CTR. The null: the two rates are equal. The alternative: they differ, for a two-sided test, or the new one is higher, for a one-sided test. Pick it before you look. Two-sided is the safer default, because it catches a change in either direction.",
      pauseAfter: 0.7,
    },
    {
      id: "pvalue",
      scene: true,
      text: "Question eleven. What exactly is a p-value? The probability of data at least as extreme as yours, if the null is true. A coin lands heads sixty-two times in a hundred. A fair coin, flipped a hundred times over and over, lands sixty-two or more, or thirty-eight or fewer, two point one percent of the time. That's the p-value.",
      pauseAfter: 0.6,
    },
    {
      id: "pvalue-not",
      text: "It isn't the chance the null is true, and it isn't the chance your result is a fluke. It's computed assuming the null holds.",
      pauseAfter: 0.7,
    },

    // ── 12, 13, 14. Choosing a test ───────────────────────────────────────
    {
      id: "zt",
      scene: true,
      text: "Question twelve. When do you use a z-test versus a t-test? A z-test when the population's variance is known, or the sample is large. A t-test when you estimate the variance from a small sample. Its curve has heavier tails to pay for that: at five degrees of freedom, the cutoff is two point five seven instead of one point nine six. At thirty, it's two point oh four. Software uses t, and t becomes z as n grows.",
      pauseAfter: 0.7,
    },
    {
      id: "chi",
      scene: true,
      text: "Question thirteen. What is the chi-square test used for? Counts in categories. It compares observed counts with expected ones: against a claimed mix, which is goodness of fit, or between two categorical variables, which is independence. Device and churn: a hundred and three mobile users churned, where about eighty-seven would if the two were independent. The squared gaps sum to eleven point nine, and p is point oh oh two six.",
      pauseAfter: 0.6,
    },
    {
      id: "chi-five",
      text: "One condition: expected counts of at least five in most cells.",
      pauseAfter: 0.7,
    },
    {
      id: "anova",
      scene: true,
      text: "Question fourteen. What is ANOVA, analysis of variance, and when do you use it? To test whether three or more group means are equal. It sets the spread between the groups against the spread within them, as an F statistic: thirty-seven point nine here. A big F says some mean differs, not which. A post-hoc test, like Tukey's, finds the pairs.",
      pauseAfter: 0.6,
    },
    {
      id: "anova-pairs",
      text: "And it beats testing every pair. Ten t-tests on five identical groups flag something about a third of the time.",
      pauseAfter: 0.7,
    },

    // ── 15, 16. Effect size and p-hacking ─────────────────────────────────
    {
      id: "effect",
      scene: true,
      text: "Question fifteen. What is effect size, and why does it matter alongside p-values? It measures how big a difference is, which a p-value doesn't. Three hundred thousand users per group, and B leads by a seventh of a point: p is under three in ten thousand. Cohen's d, the gap in standard deviations, is less than one percent of one. Significant, and too small to matter.",
      pauseAfter: 0.6,
    },
    {
      id: "effect-report",
      text: "So report the effect size, with its interval, beside every p-value.",
      pauseAfter: 0.7,
    },
    {
      id: "hack",
      scene: true,
      text: "Question sixteen. What is p-hacking, and why is it dangerous? Trying analyses, subgroups or metrics until something is significant, then reporting only that one. Twenty tests where nothing is real: one lands under point oh five. With twenty tries, the chance of at least one is sixty-four percent.",
      pauseAfter: 0.6,
    },
    {
      id: "hack-paths",
      text: "It needn't be deliberate. Five reasonable choices, about outliers, logs and cutoffs, already make thirty-two possible analyses. Pre-register the plan, correct for the number of tests, and confirm on fresh data.",
      pauseAfter: 0.8,
    },

    // ── At speed ──────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "That covers the core of the round. What's left are three either-or questions.",
      pauseAfter: 0.6,
    },
    {
      id: "r-bayes",
      text: "Frequentist or Bayesian? A frequentist treats the parameter as fixed and the data as random, and reports p-values and confidence intervals. A Bayesian updates a prior into a posterior. On the page's A B test, a hundred and twenty conversions in a thousand against a hundred and fifty, that's a distribution for each rate, and a ninety-seven and a half percent chance that B's is higher.",
    },
    {
      id: "r-param",
      text: "Parametric or non-parametric? A parametric test assumes a distribution, usually normal. A non-parametric one works on ranks. Two support queues, each with three monster tickets: the t-test sees nothing, p of point seven two. Mann-Whitney finds the shift, point oh three three.",
    },
    {
      id: "r-corr",
      text: "And correlation or causation? Correlation is two variables moving together. Causation is one changing the other. Ice cream sales and drownings correlate at point five seven. Hold temperature fixed, and it's point oh eight. A cause takes an experiment, or a careful causal design.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "Every test in this video rests on probability, and the probability round brings puzzles of its own. Next: probability.",
    },
  ],
};
