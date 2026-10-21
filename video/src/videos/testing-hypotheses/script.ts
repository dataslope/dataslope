import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";
import { INTRO_LEAD_IN } from "../../editorial/intro.ts";

/**
 * Narration for "Testing hypotheses" (16:9), Unit 7 of the Statistics course.
 * The plan had seven videos for this unit; this is one argument in seven
 * parts, each opening on a kicker and each change of idea turned in one
 * spoken sentence:
 *
 *   1. The logic of a test ("hook" to "early"), after hypothesis-testing.mdx:
 *      the question a test asks, the null, the courtroom, the five steps on
 *      the lesson's worked example, one- against two-sided. It opens on Unit
 *      6's bridge: an interval gives plausible values, a test asks about one.
 *   2. The p-value ("coin" to "same"), after p-values.mdx: the tail area of a
 *      simulated null distribution, then what it is not: the chance the null
 *      is true, or the size of an effect.
 *   3. Looking many times ("uniform" to "bonferroni"), after p-values.mdx and
 *      statistical-fallacies.mdx: uniform p-values under the null, twenty
 *      tests of nothing, sixty-four percent, peeking, and the cure.
 *   4. Errors and power ("grid" to "inflate"), after errors-and-power.mdx and
 *      ab-testing.mdx: the two errors, power by simulation, the tradeoff that
 *      only more data escapes, sizing an A/B test, the winner's curse.
 *   5. t-tests ("ratio" to "own"), after t-tests.mdx: signal over noise, the
 *      three designs, pairing.
 *   6. ANOVA and chi-square ("groups" to "related"), after
 *      anova-and-chi-square.mdx.
 *   7. Correlation and nonparametric tests ("corr" to "next"), after
 *      correlation-and-nonparametric.mdx. It ends on Unit 8's question: a test
 *      says whether there is an effect, not how big it is.
 *
 * Left on the page: the lady tasting tea, the Fisher and ASA history, the
 * prosecutor's-fallacy screening arithmetic (Unit 3 tells that story), the
 * forking paths, Welch against Student, the CLT and normality, goodness of
 * fit, Anscombe's quartet, regression, Wilcoxon, and every code mechanic.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every number is the output of the lessons' own code blocks, re-run
 * with their seeds by measure.py (python 3.13, numpy 2.5.3, scipy 1.18.1,
 * pandas 3.0.5) into measurements.json, which data.ts reads.
 *   - hypothesis-testing opening: checkout 11.4% against 10.1% (prose).
 *   - hypothesis-testing worked example (seed 11): forty users average
 *     7,452.7 steps against a claimed 8,000; t = -2.243, p = 0.0306, reject.
 *   - the one-vs-two-sided chart: cutoffs 1.96 and 1.645 (scipy norm.ppf).
 *   - p-values tail area (seed 0): 100,000 runs of 100 fair flips; 62 heads
 *     is 12 from 50; p = 0.0211, "two point one percent" (exact test 0.0210).
 *   - p-values fixed effect (seed 7): 0.1 effect; p prints 0.8271 at 20 per
 *     group, 0.0004 at 1,000 and 0.0000 at 100,000.
 *   - errors-and-power Type I block (seed 3): 5,000 null p-values, flat over
 *     twenty bins, 4.76% at or under 0.05.
 *   - p-values twenty tests (seed 123): one under 0.05, test 14 at 0.033;
 *     1 - 0.95^20 = 0.642; Bonferroni 0.05 / 20 = 0.0025.
 *   - errors-and-power power block (seed 0): effect 0.5, 30 per group, 2,000
 *     runs, 950 reject, power 0.475; power by n (seed 1): 0.61 at 40, 0.90
 *     at 80; the 0.80 design target.
 *   - ab-testing: 10% to 12% at 80% power needs 3,841 per arm; the same
 *     formula for 10% to 11% needs 14,751, 3.84 times as many.
 *   - errors-and-power winner's curse (seed 4): effect 0.3, 15 per group,
 *     12% significant, those average 0.852, all runs 0.295.
 *   - t-tests paired block (seed 42): 25 patients, mean change 7.09; Welch on
 *     the columns p = 0.115; paired t = 10.22, p = 3.2e-10.
 *   - anova-and-chi-square pairwise block (seed 0): ten pairwise tests of five
 *     identical groups fire in 32% of 800 trials; warehouses (seed 11) give
 *     F = 12.2; device and churn (seed 5): 103 mobile churners against 86.7
 *     expected, desktop 41 against 58.9, chi-square 11.9, p = 0.0026.
 *   - correlation-and-nonparametric (seeds 2, 3, 6): Pearson 0.874 and
 *     Spearman 0.986 on the curve; r = -0.025 on the U; Welch p = 0.72 and
 *     Mann-Whitney p = 0.033 on the queues with three monster tickets each.
 *   - The claims without a number are the lessons' own: the courtroom
 *     mapping and "not guilty is not innocent"; alpha set in advance; the
 *     one-sided cutoff being nearer; uniform p-values under the null;
 *     peeking (the ab-test-peeking chart's own seeded run, which dips under
 *     0.05 twice and ends at 0.19); pre-registration; the alpha-beta tradeoff and only more data
 *     shrinking both; t as gap over standard error; the three designs;
 *     ANOVA's F as between over within and not naming the group; chi-square
 *     on counts; Pearson linear, Spearman on ranks; ranks ignoring how far
 *     out an outlier is.
 *
 * Written for the ear: short spoken sentences, no symbols or parentheses,
 * numbers as words, contractions, questions the next sentence answers, an
 * ellipsis where a speaker would hold, two capitalised stresses and no audio
 * tag.
 */
export const script: NarrationScript = {
  id: "testing-hypotheses",
  voice: "hope",
  // The series intro plays first; its lead-in lives in editorial/intro.ts.
  leadIn: INTRO_LEAD_IN,
  minPause: COURSE_MIN_PAUSE,
  tail: 2.0,
  // A touch over the default 1.6, so each finished figure holds a moment longer.
  sceneGap: 1.7,
  beats: [
    // ── Part 1. The logic of a test ───────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "An interval tells you which values are plausible. A test asks about one value in particular... usually, could the effect be zero?",
      pauseAfter: 0.45,
    },
    {
      id: "checkout",
      text: "Say a new checkout converts at eleven point four percent, and the old one at ten point one.",
      pauseAfter: 0.35,
    },
    {
      id: "free",
      text: "But noise makes gaps for free. So the real question is this. If there were no difference at all, how often would chance alone hand you a gap this big?",
    },
    {
      id: "null",
      scene: true,
      text: "A test starts from the boring answer: nothing is going on. That's the null hypothesis. The alternative says there's a real effect.",
      pauseAfter: 0.35,
    },
    {
      id: "surprise",
      text: "Then it asks one thing. If the null were true, would data like mine be surprising?",
      pauseAfter: 0.35,
    },
    {
      id: "verdict",
      text: "Very surprising, and you reject the null. Ordinary, and you fail to reject it.",
      pauseAfter: 0.4,
    },
    { id: "court-in", text: "If that sounds like a trial, it is one." },
    {
      id: "court",
      scene: true,
      text: "The null is the defendant, presumed innocent until the evidence says otherwise.",
      pauseAfter: 0.35,
    },
    {
      id: "bar",
      text: "Beyond reasonable doubt becomes alpha, the bar the evidence has to clear. Usually five percent, and set before the trial begins.",
      pauseAfter: 0.35,
    },
    { id: "guilty", text: "Clear the bar, and the verdict is guilty: reject the null. Fall short, and it's not guilty.", pauseAfter: 0.35 },
    {
      id: "innocent",
      text: "And not guilty never means innocent. Failing to reject the null doesn't prove it. The evidence just wasn't strong enough.",
      pauseAfter: 0.4,
    },
    { id: "steps-in", text: "Here's the whole procedure, once." },
    {
      id: "steps",
      scene: true,
      text: "An app claims its users walk eight thousand steps a day. Forty of them average seven thousand, four hundred and fifty-three.",
      pauseAfter: 0.35,
    },
    {
      id: "set",
      text: "The null says the true mean is eight thousand. Alpha is five percent, fixed now, before anything is computed.",
      pauseAfter: 0.35,
    },
    {
      id: "tstat",
      text: "The test statistic measures the gap in units of noise. Here, t is minus two point two four.",
      pauseAfter: 0.35,
    },
    {
      id: "pval",
      text: "If the claim were true, a gap at least this big would turn up three percent of the time. That's the p-value.",
      pauseAfter: 0.35,
    },
    {
      id: "reject",
      text: "Three is under five, so we reject the claim. Not because we know the true mean, but because eight thousand is hard to believe.",
      pauseAfter: 0.4,
    },
    { id: "sides-in", text: "And notice: at least this big, in either direction." },
    {
      id: "sides",
      scene: true,
      text: "Higher or lower would both count, so surprise lives in both tails. A five percent test puts two and a half percent in each, beyond one point nine six.",
      pauseAfter: 0.35,
    },
    {
      id: "onesided",
      text: "A one-sided test spends all five percent in one tail, so its cutoff is nearer, at one point six four five.",
      pauseAfter: 0.35,
    },
    {
      id: "early",
      text: "That's an easier bar to clear... which is exactly why the side has to be chosen before you see the data.",
    },
    { id: "coin-in", text: "So what is that three percent, exactly?" },

    // ── Part 2. The p-value ───────────────────────────────────────────────
    {
      id: "coin",
      scene: true,
      text: "Take a simpler case. A friend's coin lands heads sixty-two times in a hundred flips.",
      pauseAfter: 0.35,
    },
    {
      id: "fair",
      text: "Assume it's fair, and simulate a hundred flips, a hundred thousand times over. That pile is the null distribution.",
      pauseAfter: 0.35,
    },
    {
      id: "far",
      text: "Sixty-two sits twelve from the middle. So does thirty-eight. Now count every run at least that far out.",
      pauseAfter: 0.35,
    },
    {
      id: "area",
      text: "Two point one percent of them. That's all a p-value is: the share of the null world at least as extreme as what you saw.",
      pauseAfter: 0.35,
    },
    { id: "verdict-not", text: "An area, not a verdict.", pauseAfter: 0.4 },
    { id: "isnt-in", text: "And that tells you what it can't be." },
    {
      id: "isnt",
      scene: true,
      text: "A p-value is NOT the chance the null is true. It was computed by assuming the null.",
      pauseAfter: 0.35,
    },
    {
      id: "swap",
      text: "The chance of the data, given the null, isn't the chance of the null, given the data. Swap them, and you've made the prosecutor's fallacy.",
      pauseAfter: 0.4,
    },
    { id: "size", text: "Nor is it the size of an effect. Hold a tiny effect fixed, and only grow the sample.", pauseAfter: 0.3 },
    {
      id: "collapse",
      text: "Twenty per group, p is point eight three. A thousand, point zero zero zero four. A hundred thousand, and it prints as zero.",
      pauseAfter: 0.35,
    },
    { id: "same", text: "The effect never changed. Only how much data could see it." },
    { id: "hack-in", text: "Which leads to the easiest way to fool yourself." },

    // ── Part 3. Looking many times ────────────────────────────────────────
    {
      id: "uniform",
      scene: true,
      text: "When the null is true, a p-value is just a random number. Every value from zero to one is equally likely.",
      pauseAfter: 0.35,
    },
    {
      id: "twenty",
      text: "So run twenty tests where nothing is real, and you should expect one under point zero five.",
      pauseAfter: 0.3,
    },
    { id: "fourteen", text: "Here, it's test fourteen, at point zero three three.", pauseAfter: 0.35 },
    {
      id: "hacked",
      text: "Report only that one, and you've turned luck into a discovery. That's p-hacking.",
      pauseAfter: 0.45,
    },
    {
      id: "odds",
      scene: true,
      text: "Across twenty tests, the chance that at least one fires is sixty-four percent.",
      pauseAfter: 0.35,
    },
    {
      id: "peek",
      text: "Peeking at a running experiment, and stopping when p dips under point zero five, does the same thing, one look at a time.",
      pauseAfter: 0.35,
    },
    {
      id: "cure",
      text: "The cure is deciding before you look: the question, the sample and the analysis, all fixed in advance.",
      pauseAfter: 0.3,
    },
    {
      id: "bonferroni",
      text: "Or raise the bar for every test. Twenty tests sharing five percent means each one needs point zero zero two five.",
    },
    { id: "errors-in", text: "But even a test played fairly can be wrong, in two ways." },

    // ── Part 4. Errors and power ──────────────────────────────────────────
    {
      id: "grid",
      scene: true,
      text: "Cross what's true with what you decide, and you get four outcomes.",
      pauseAfter: 0.35,
    },
    {
      id: "typeone",
      text: "Reject a null that's true, and that's a false alarm, a Type One error. Its rate is alpha.",
      pauseAfter: 0.35,
    },
    { id: "typetwo", text: "Miss an effect that's real, and that's a Type Two error, with rate beta.", pauseAfter: 0.35 },
    { id: "power", text: "The cell beside it is power: the chance of catching an effect that's really there." },
    {
      id: "sim",
      scene: true,
      text: "Power is easiest to see by counting. Plant a real effect of half a standard deviation, test thirty per group, and repeat two thousand times.",
      pauseAfter: 0.35,
    },
    {
      id: "coinflip",
      text: "Forty-seven and a half percent of the runs reject. Finding an effect that's really there is a coin flip.",
      pauseAfter: 0.4,
    },
    {
      id: "trade",
      text: "Lower alpha to cut false alarms, and you miss even more. With the sample fixed, pushing one error down pushes the other up.",
      pauseAfter: 0.35,
    },
    {
      id: "more",
      text: "Only more data shrinks both. Forty per group catches this effect sixty-one percent of the time. Eighty catches ninety.",
      pauseAfter: 0.35,
    },
    { id: "target", text: "Studies are usually designed for at least eighty percent." },
    {
      id: "ab",
      scene: true,
      text: "That's why an A-B test is sized before it starts. To catch a lift from ten percent to twelve, with eighty percent power, takes three thousand, eight hundred and forty-one users in each arm.",
      pauseAfter: 0.35,
    },
    {
      id: "halve",
      text: "Halve the lift, to eleven, and it takes fourteen thousand, seven hundred and fifty-one. Nearly four times as many.",
      pauseAfter: 0.45,
    },
    {
      id: "curse",
      scene: true,
      text: "And low power does worse than miss. Test a real effect of point three with fifteen per group, and only twelve percent of runs reach significance.",
      pauseAfter: 0.35,
    },
    {
      id: "inflate",
      text: "Those winners average point eight five, nearly three times the truth. Only the runs that noise exaggerated made it through.",
    },
    { id: "t-in", text: "Every test in those simulations was a t-test." },

    // ── Part 5. t-tests ───────────────────────────────────────────────────
    {
      id: "ratio",
      scene: true,
      text: "Its statistic is a ratio: the gap you observed, over the noise in that gap, its standard error.",
      pauseAfter: 0.35,
    },
    {
      id: "big",
      text: "A big t means the gap dwarfs the noise. A small one means it's the size of an ordinary wobble.",
      pauseAfter: 0.35,
    },
    {
      id: "designs",
      text: "It comes in three designs: one group against a target, two separate groups, or the same units measured twice.",
    },
    {
      id: "pairs",
      scene: true,
      text: "That last one matters more than it looks. Twenty-five patients' blood pressure, before and after a program.",
      pauseAfter: 0.35,
    },
    {
      id: "unpaired",
      text: "Compare the two columns as separate groups, and the differences between people drown the change. p is point one one five.",
      pauseAfter: 0.35,
    },
    {
      id: "paired",
      text: "Test each patient's own change instead, and the noise collapses. t is ten, and p is under one in a billion.",
      pauseAfter: 0.35,
    },
    { id: "own", text: "Same data. Each patient just became their own control." },
    { id: "groups-in", text: "With more than two groups, the tempting move is a t-test for every pair." },

    // ── Part 6. ANOVA and chi-square ──────────────────────────────────────
    {
      id: "groups",
      scene: true,
      text: "Five groups make ten pairs. Draw all five from the same process, and some pair comes up significant in thirty-two percent of trials.",
      pauseAfter: 0.35,
    },
    {
      id: "once",
      text: "That's the many-looks problem again. ANOVA asks once: do any of the means differ?",
      pauseAfter: 0.35,
    },
    {
      id: "ftest",
      text: "Its F statistic is the spread between the group means, over the spread within the groups.",
      pauseAfter: 0.35,
    },
    {
      id: "warehouses",
      text: "Three warehouses' delivery times give an F of twelve. At least one of them differs... but ANOVA won't say which.",
    },
    {
      id: "chi",
      scene: true,
      text: "When the data are categories, not numbers, a test compares counts instead. Here's device against churn, for six hundred users.",
      pauseAfter: 0.35,
    },
    {
      id: "expected",
      text: "If device made no difference, about eighty-seven mobile users would have churned.",
      pauseAfter: 0.3,
    },
    { id: "observed", text: "A hundred and three did. Desktop came in well under its share.", pauseAfter: 0.35 },
    {
      id: "related",
      text: "Chi-square adds up how far every cell strays from what was expected. Here it's about twelve, with a p of point zero zero three.",
    },
    { id: "corr-in", text: "And when both columns are numbers, you ask whether they move together." },

    // ── Part 7. Correlation, and when to go nonparametric ─────────────────
    {
      id: "corr",
      scene: true,
      text: "A correlation runs from minus one to one. Pearson's r measures how close the points sit to a straight line.",
      pauseAfter: 0.3,
    },
    {
      id: "curve",
      text: "On a curve that always rises, it says point eight seven. Spearman's rho works on ranks, so it only asks whether y keeps rising. Point nine nine.",
      pauseAfter: 0.4,
    },
    {
      id: "ushape",
      text: "And an r near zero isn't the same as no relationship. On this U-shape, r is minus point zero three, though y depends entirely on x.",
    },
    {
      id: "ranks",
      scene: true,
      text: "Ranks rescue tests, too. Two support queues, each with three monster tickets that dragged on for hours.",
      pauseAfter: 0.35,
    },
    {
      id: "welch",
      text: "Those outliers swell the noise, and Welch's t-test sees nothing. p is point seven two.",
      pauseAfter: 0.35,
    },
    {
      id: "mwu",
      text: "Mann-Whitney ranks the values instead, and finds the shift. p is point zero three three.",
      pauseAfter: 0.35,
    },
    { id: "line", text: "A rank doesn't care how far out an outlier is, only where it stands in line.", pauseAfter: 0.7 },
    {
      id: "next",
      text: "Every test here answers one narrow question: could the effect be zero? Not how big it is... or whether it means what it seems to.",
    },
  ],
};
