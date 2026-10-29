import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "A/B testing & metrics" (16:9), Part 7 of the Data Analyst
 * interview prep videos (agent-outputs/20261021-2314-data-analyst-interview-video-plan.md),
 * after content/interview/data-analyst/ab-testing-and-metrics.mdx, with the
 * statistics page's Type I and II errors and power. Nineteen questions:
 * fifteen in depth, numbered aloud, then four short ones (16 to 19 on screen
 * only).
 *
 *   1. a good metric; 2. primary, guardrail and vanity metrics; 3. the north
 *      star ("metric").
 *   4. funnels; 5. step-to-step conversion and LAG ("funnel").
 *   6. what an A/B test is for; 7. the p-value ("abtest").
 *   8. statistical against practical significance; 9. a confidence interval
 *      for a stakeholder ("signif").
 *   10. sample size and the minimum detectable effect; 11. Type I and Type II
 *       errors; 12. power ("power").
 *   13. peeking ("peek").
 *   14. Simpson's paradox; 15. ratio metrics that mislead ("simpson").
 *   Short ones ("rapid-in"): a conversion rate in SQL; novelty and primacy
 *   effects; cohort analysis; retention curves.
 *
 * Its opening is its own, as the series now asks of every part: no numbered
 * tiles, no trap-and-stopwatch legend, but a stream of users split at random
 * into A and B.
 *
 * No series intro yet (decided 2026-10-21): the first scene opens at frame 0,
 * and adding the intro later needs no re-voicing.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. check.mjs writes every number to results.json, which data.ts reads.
 * The experiment, its interval and the sample sizes agree with Stats-7
 * (testing-hypotheses) and Stats-9 (statistics-in-practice), because they are
 * the same course code re-run:
 *   - "metric": charts/metric-definition-drift.mjs, three definitions of an
 *     active user; December 664, 351 and 214, a factor of 3.1.
 *   - "funnel": the page's funnel chart, 42,000 landing to 3,900 purchases,
 *     9.3% overall; the first step loses the most (14,500); the weakest step
 *     is product view to cart, 51.6%, from the page's LAG query in DuckDB.
 *   - "abtest": charts/randomisation-balances-confounders.mjs, all ten traits
 *     over the 0.1 line when users choose, only age (0.102) when a coin does;
 *     the course's experiment (seed 42), 579 of 6,000 against 702 of 6,000,
 *     z = 3.64, p = 0.0003, "three in ten thousand".
 *   - "signif": charts/effect-size-independent-of-n.mjs, d = 0.2 at every n:
 *     p = 0.65 at 10 per group, 0.046 at 200, about 2.5 in ten billion at
 *     2,000; the experiment's lift 2.05 points, 95% interval 0.95 to 3.15,
 *     standard error 0.56; charts/ci-coverage.mjs, 4 of 100 intervals miss.
 *   - "power": the course's sample-size block, 3,841 per arm for 10% to 12%
 *     and 14,751 for 10% to 11%, 3.84 times; charts/power-vs-n.mjs; a 5%
 *     two-sided test with an alternative placed for 80% power (the video's
 *     own picture), beta 0.20.
 *   - "peek": charts/ab-test-peeking.mjs, identical arms, under 0.05 at 800
 *     and from 2,000 to 4,600 per arm, 0.19 at the planned 8,000.
 *   - "simpson": the page's kidney-stone counts, A 93.1% and 73.0% in the two
 *     groups against B's 86.7% and 68.8%, pooled 78.0% against 82.6%;
 *     charts/average-of-averages.mjs, 68 against 51.8 per customer, the
 *     Islands' 40 customers.
 *   - short ones: the video's own events, where a repeat purchase makes 0.6
 *     of 0.4; charts/novelty-effect-fades.mjs, week one 14.1% against 3.75%;
 *     charts/cohort-retention.mjs, week eight 26.4% (January) to 51.7% (May);
 *     charts/retention-curve-plateau.mjs, 51.0% and 50.7% at week two, 31.0%
 *     and 1.7% at week twelve.
 *
 * Written for Drew's ear: "A B test" is spelled, as are "MDE" and "AI";
 * "Type one" and "Type two"; numbers as they are said.
 */
export const script: NarrationScript = {
  id: "da-ab-testing",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Product teams run experiments constantly, and the analyst is the one who reads them. Split the users at random, show one half the old version and the other half the new one, and measure what changes. That's an A B test. This round is about measuring the right thing, and reading the result without fooling yourself.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "There are nineteen questions. Fifteen get a full answer with the numbers on screen, and the last four go quickly.",
      pauseAfter: 0.7,
    },
    { id: "metric-in", text: "It starts before any test, with what you measure." },

    // ── 1, 2, 3. Metrics ──────────────────────────────────────────────────
    {
      id: "metric",
      scene: true,
      text: "Question one. What makes a good metric?",
      pauseAfter: 0.6,
    },
    {
      id: "metric-good",
      text: "It's specific, measurable, tied to the outcome you care about, and sensitive enough to move when the product does. Prefer rates to counts, because a count also moves with traffic. And it should be hard to game.",
      pauseAfter: 0.7,
    },
    {
      id: "metric-drift",
      text: "Specific matters most. Here are three reasonable definitions of an active user, on the same events, and by December they disagree by a factor of three.",
      pauseAfter: 0.8,
    },
    {
      id: "kinds",
      text: "Question two. What's the difference between a primary, a guardrail, and a vanity metric? The primary metric is the one the change is meant to move, like checkout conversion. A guardrail must not get worse along the way: page speed, refunds, unsubscribes. A vanity metric looks good and decides nothing, like total registered users. Choose the primary and the guardrails before the test starts.",
      pauseAfter: 0.8,
    },
    {
      id: "north",
      text: "Question three. What is a north star metric? One number for the long-term value the product delivers, that every team lines up behind, like weekly active teams for collaboration software. It keeps the day-to-day metrics pointed at durable value.",
      pauseAfter: 0.7,
    },
    { id: "funnel-in", text: "Next, where users drop out." },

    // ── 4, 5. Funnels ─────────────────────────────────────────────────────
    {
      id: "funnel",
      scene: true,
      text: "Question four. What is a funnel, and how do you measure conversion at each step?",
      pauseAfter: 0.6,
    },
    {
      id: "funnel-steps",
      text: "A funnel is the ordered steps a user takes, from landing page to purchase. Overall conversion is the share who make it to the end: here, about nine percent.",
    },
    {
      id: "funnel-step",
      text: "Per-step conversion shows where the rest drop off.",
      pauseAfter: 0.7,
    },
    {
      id: "funnel-lost",
      text: "Count the people lost, and the first step looks worst, with fourteen thousand five hundred gone. But the top always loses the most, because that's where the people are.",
      pauseAfter: 0.8,
    },
    {
      id: "lag",
      text: "Question five. What is a step-to-step conversion, and how does lag help? It's each stage's users over the stage before. Lag puts the previous stage's count on the same row, so each step is one division. The weakest step is product view to cart: fifty-two percent.",
      pauseAfter: 0.7,
    },
    { id: "abtest-in", text: "Now the experiment itself." },

    // ── 6, 7. The test, and the p-value ───────────────────────────────────
    {
      id: "abtest",
      scene: true,
      text: "Question six. What is the purpose of an A B test?",
      pauseAfter: 0.6,
    },
    {
      id: "abtest-why",
      text: "It's a controlled experiment. Assign users at random to control, A, or treatment, B, change one thing, and compare a metric. Randomizing makes the groups alike, even on things you never measured, so a difference can be put down to the change. That's causation, not just correlation.",
      pauseAfter: 0.7,
    },
    {
      id: "abtest-balance",
      text: "Let users pick their own group, and all ten of these traits differ between the arms.",
    },
    {
      id: "abtest-coin",
      text: "Flip a coin, and only one edges over the line, barely.",
      pauseAfter: 0.8,
    },
    {
      id: "pvalue",
      text: "Question seven. What is a p-value, at an analyst's level? It's how likely a result at least this extreme would be, if there were really no difference.",
    },
    {
      id: "pvalue-test",
      text: "In the course's test, five hundred seventy-nine of six thousand convert in A, and seven hundred two in B.",
    },
    {
      id: "pvalue-gap",
      text: "If the change did nothing, a gap that big would turn up about three times in ten thousand.",
      pauseAfter: 0.7,
    },
    {
      id: "pvalue-not",
      text: "It isn't the chance that there's no effect, and it says nothing about how big the effect is.",
      pauseAfter: 0.7,
    },
    { id: "signif-in", text: "Which is exactly the next question." },

    // ── 8, 9. Significance, and the interval ──────────────────────────────
    {
      id: "signif",
      scene: true,
      text: "Question eight. What's the difference between statistical and practical significance? Statistical means unlikely to be noise. Practical means big enough to matter.",
      pauseAfter: 0.6,
    },
    {
      id: "signif-n",
      text: "Hold one small effect fixed, and grow the sample. At ten users per group, the p-value is point six five. At two hundred, it slips under point oh five. At two thousand, it's essentially zero. The effect never changed. So report the effect size and its range, not just the p-value.",
      pauseAfter: 0.8,
    },
    {
      id: "ci",
      text: "Question nine. How would you explain a confidence interval to a stakeholder? Give a range: the new version lifts conversion by about two points, and we're confident the true lift is between one and three.",
      pauseAfter: 0.6,
    },
    {
      id: "ci-margin",
      text: "The range is the estimate, plus or minus one point nine six standard errors.",
    },
    {
      id: "ci-cover",
      text: "Ninety-five percent means that if we ran the test many times, about ninety-five intervals in a hundred would contain the true value. In this run of a hundred, four miss.",
    },
    {
      id: "ci-wide",
      text: "And a wide interval means we need more data.",
      pauseAfter: 0.7,
    },
    { id: "power-in", text: "How much data is the next question." },

    // ── 10, 11, 12. Sample size, the two errors, power ────────────────────
    {
      id: "power",
      scene: true,
      text: "Question ten. Why does sample size matter, and what is a minimum detectable effect?",
      pauseAfter: 0.6,
    },
    {
      id: "power-mde",
      text: "Bigger samples shrink the standard error, so smaller effects become detectable. The MDE, the minimum detectable effect, is the smallest lift you want to be able to catch. Pick it before launch, along with power and significance, and the sample size follows.",
      pauseAfter: 0.7,
    },
    {
      id: "power-n",
      text: "To catch ten percent rising to twelve, with eighty percent power at five percent significance, takes three thousand eight hundred forty-one users in each arm. Halve the lift, and it's fourteen thousand seven hundred fifty-one: nearly four times as many.",
      pauseAfter: 0.8,
    },
    {
      id: "errors",
      text: "Question eleven. What are Type one and Type two errors? A Type one error is a false positive: declaring a winner when there's no effect.",
    },
    {
      id: "errors-alpha",
      text: "Its rate is alpha, usually five percent.",
    },
    {
      id: "errors-beta",
      text: "A Type two error is a false negative: missing an effect that's really there. Its rate is beta.",
      pauseAfter: 0.7,
    },
    {
      id: "power-def",
      text: "Question twelve. What is statistical power? It's one minus beta: the chance of catching a real effect. Eighty percent is the usual target. Power rises with more users, bigger effects, and a looser alpha. Moving the line trades one error for the other. Only more data shrinks both.",
      pauseAfter: 0.7,
    },
    { id: "peek-in", text: "Then, once the test is running, the urge to look." },

    // ── 13. Peeking ───────────────────────────────────────────────────────
    {
      id: "peek",
      scene: true,
      text: "Question thirteen. What is peeking, and why is it a problem?",
      pauseAfter: 0.6,
    },
    {
      id: "peek-run",
      text: "Here both arms are identical, so there's nothing to find. Check the p-value every hundred users, and it dips under point oh five at eight hundred, and again from two thousand to four thousand six hundred. A team watching would have stopped and shipped. At the planned eight thousand, it reads point one nine.",
      pauseAfter: 0.8,
    },
    {
      id: "peek-fix",
      text: "Fix the sample size in advance, or use a sequential test, which is built to be watched.",
      pauseAfter: 0.7,
    },
    { id: "simpson-in", text: "Last, two ways a total can lie." },

    // ── 14, 15. Simpson's paradox, and ratios ─────────────────────────────
    {
      id: "simpson",
      scene: true,
      text: "Question fourteen. What is Simpson's paradox?",
      pauseAfter: 0.6,
    },
    {
      id: "simpson-stones",
      text: "A trend in the total can reverse inside every group. In the kidney stone study, treatment A wins for small stones and for large ones, yet loses overall: seventy-eight percent against eighty-three.",
      pauseAfter: 0.7,
    },
    {
      id: "simpson-why",
      text: "A was given mostly to large stones, the hard cases.",
    },
    {
      id: "simpson-segment",
      text: "So segment before you conclude.",
      pauseAfter: 0.8,
    },
    {
      id: "ratio",
      text: "Question fifteen. How do you avoid a misleading ratio metric? Watch the numerator and the denominator together: revenue per session can rise because sessions fell. And an average of averages isn't the overall average. Five regional averages average sixty-eight. Per customer, it's fifty-two, because one region has only forty customers.",
      pauseAfter: 0.7,
    },

    // ── Short ones ────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Four short ones to finish.",
      pauseAfter: 0.6,
    },
    {
      id: "r-sql",
      text: "A conversion rate in SQL: count distinct converted users, times one point zero, over distinct users. Without distinct, a repeat purchase counts twice, and point four becomes point six. The one point zero stops some databases dividing whole numbers down to zero.",
    },
    {
      id: "r-novelty",
      text: "A novelty effect is a lift that comes from newness, and fades. In week one, the change that's about to vanish looks best: fourteen percent against four. A primacy effect is the reverse, when people resist a change at first. Either way, run the test long enough to see it settle.",
    },
    {
      id: "r-cohort",
      text: "A cohort analysis groups users by when they started, like their sign-up month, and follows each group. Here every cohort keeps more than the last: twenty-six percent at week eight for January, fifty-two for May.",
    },
    {
      id: "r-retention",
      text: "And a retention curve is the share of a cohort still active each week. A healthy one flattens onto a plateau. For two weeks these two match. By week twelve, one keeps thirty-one percent, and the other two.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "An assistant can now draft every one of these answers in seconds. Knowing which drafts to trust is the last round. Next: AI-assisted analysis.",
    },
  ],
};
