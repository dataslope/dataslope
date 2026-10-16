import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "Interpreting results" (16:9), Unit 8 of the Statistics
 * course. One argument in four parts, after effect-sizes.mdx and
 * statistical-fallacies.mdx, opening where Unit 7 stops (a test says
 * whether, not how big):
 *
 *   1. Significant isn't important ("hook" to "part2-in"), after
 *      effect-sizes: a huge sample makes a trivial gap significant; Cohen's
 *      d and its overlap; d holds still while the p-value falls with n;
 *      absolute and relative rates; an effect size with its interval.
 *   2. Simpson's paradox and confounding ("admit" to "rtm-in"), after
 *      statistical-fallacies: the two-department admissions table, and the
 *      exercise and blood pressure scatter whose slope age reverses.
 *   3. Regression to the mean ("rtm" to "look-in"): the five hundred
 *      salespeople, and why a program aimed at the worst looks like it works.
 *   4. Sharpshooters, selection and the unit of analysis ("cherry" to
 *      "next"): the cherry-picked window, the Texas sharpshooter, Berkson's
 *      admitted applicants, and districts against people. It ends on Unit
 *      9's question: deciding what you'll test before you look.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every number is the output of the lessons' own code, re-run with its
 * seeds by measure.py (python 3.13, numpy 2.5.3, scipy 1.18.1, pandas 3.0.5)
 * into measurements.json, which data.ts reads. The charts the lessons place
 * are seeded JavaScript (charts/*.mjs); measure.py ports their generator and
 * checks its results against the charts' own captions.
 *   - effect-sizes, "Significant yet negligible" challenge (seed 2024): two
 *     groups of 300,000 from Normal(100, 15) and Normal(100.12, 15); B ahead
 *     by 0.142, "about a seventh of a point"; p = 0.00026, "under three in
 *     ten thousand"; d = 0.0094, "less than one percent of a standard
 *     deviation". The page's own demonstration of this ("Demonstrating
 *     significance", seed 0, n = 100,000) prints p = 0.0508, which is not
 *     significant, so the video uses the challenge instead (see the report).
 *   - effect-sizes, "Cohen's d" and the effect-size-overlap chart: d is the
 *     gap in standard deviations; 0.2, 0.5 and 0.8 are small, medium and
 *     large; at 0.8 the curves share 69% of their area, "more than two
 *     thirds". "What counts as big depends on what's at stake" is the
 *     callout "Context defines 'big', not a table".
 *   - effect-sizes, "Effect size does NOT depend on sample size" (seed 123):
 *     a true d of 0.30 at n = 20, 100, 500, 5,000 and 50,000 per group; p
 *     from 0.15 to 0.0 as printed (it underflows); d 0.465, 0.238, 0.353,
 *     0.284, 0.298, "settles near zero point three".
 *   - effect-sizes, risk difference and relative risk: 90 and 126 of 3,000,
 *     3.0% and 4.2%, "forty percent more" and "one point two percentage
 *     points"; the bootstrap block (seed 11): d = 0.364, 95% CI 0.101 to
 *     0.619, "zero point three six, from zero point one to zero point six";
 *     the reporting trio is the callout "The reporting standard to adopt".
 *   - statistical-fallacies, "Simpson's paradox": Berkeley 1973 is the
 *     lesson's real case; the numbers are its code block's two departments:
 *     men 360 of 600 and 25 of 100, women 65 of 100 and 165 of 600; easy
 *     65% to 60%, hard 27.5% to 25%; pooled 55.0% and 32.9%, "fifty-five"
 *     and "thirty-three".
 *   - statistical-fallacies, "Confounding" and the simpsons-paradox-trend
 *     chart (seed 9021): 104 people in four age bands; the pooled line rises
 *     8.9 mmHg per weekly hour, "about nine points"; within a band it falls
 *     2.7, "almost three"; randomizing severs the confounder's link.
 *   - statistical-fallacies, "Regression to the mean" (seed 3): 500
 *     salespeople, skill Normal(100, 10) plus monthly luck Normal(0, 15);
 *     the top tenth 131.7 then 112.9, "a hundred and thirty-two" and "a
 *     hundred and thirteen"; the bottom tenth 69.7 then 94.6; the coaching
 *     program and the control group are the lesson's own.
 *   - statistical-fallacies, cherry-picked-window (seed 2800): 120 months,
 *     no net change; the steepest four months rise 25%. The Texas
 *     sharpshooter is the lesson's; the shots on screen are a seeded layout,
 *     and the target is drawn round their densest cluster by search.
 *   - statistical-fallacies, berksons-paradox (seeds 6101 and 2357): 420
 *     applicants, correlation -0.01; admitted when the two scores sum to 112
 *     or more, 107 people, correlation -0.56; "among our customers" is the
 *     lesson's list of phrases.
 *   - statistical-fallacies, ecological-fallacy: six districts, means
 *     correlating at 0.93; within a district, 0.07 on average, "close to
 *     zero".
 *   - The close is the callout "The thread connecting half of these": the
 *     analysis was shaped by the data instead of decided in advance.
 *
 * Written for the ear: short spoken sentences, no symbols or parentheses,
 * numbers as words, contractions, an ellipsis where a speaker would hold, and
 * one capitalised stress.
 */
export const script: NarrationScript = {
  id: "interpreting-results",
  voice: "hope",
  // Room for the series intro (SeriesIntro, INTRO_SECONDS) before the first word.
  leadIn: 4.6,
  tail: 2.6,
  // One take per part: Part 1 runs a little over the default 1,800, and each
  // later part starts its own take (`take: true`).
  takeChars: 2200,
  beats: [
    // ── Part 1. Significant isn't important ───────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "A test can tell you that an effect is there. It can't tell you how big it is.",
      pauseAfter: 0.5,
    },
    {
      id: "huge",
      text: "Take two groups of three hundred thousand people, on a score that varies by about fifteen points.",
      pauseAfter: 0.3,
    },
    {
      id: "p",
      text: "Group B's average is higher by about a seventh of a point. The p-value is under three in ten thousand... highly significant.",
      pauseAfter: 0.5,
    },
    {
      id: "tiny",
      text: "But a seventh of a point, against a spread of fifteen, is less than one percent of a standard deviation.",
      pauseAfter: 0.35,
    },
    { id: "real", text: "It's real... and it's far too small to matter.", pauseAfter: 0.5 },
    {
      id: "why",
      text: "With enough data, almost any difference passes a test. So passing stops telling you whether to care.",
    },
    { id: "d-in", text: "What you need is a measure of size." },
    {
      id: "dscene",
      scene: true,
      text: "Cohen's d is the gap between two averages, counted in standard deviations.",
      pauseAfter: 0.35,
    },
    {
      id: "one",
      text: "It has no units. A d of one means the averages sit one full standard deviation apart.",
      pauseAfter: 0.4,
    },
    {
      id: "labels",
      text: "Cohen called zero point two small, zero point five medium, and zero point eight large.",
      pauseAfter: 0.4,
    },
    {
      id: "overlap",
      text: "But even large leaves a lot of overlap. At zero point eight, the two groups still share more than two thirds of their range.",
      pauseAfter: 0.4,
    },
    { id: "stake", text: "So the labels are only a start. What counts as big depends on what's at stake." },
    { id: "sweep-in", text: "And unlike a p-value, a size doesn't depend on how much data you have." },
    {
      id: "sweep",
      scene: true,
      text: "Here the true effect is fixed at zero point three. Now grow the sample, from twenty per group to fifty thousand.",
      pauseAfter: 0.4,
    },
    {
      id: "plunge",
      text: "The p-value plunges, from zero point one five to a number so small it prints as zero.",
      pauseAfter: 0.4,
    },
    { id: "settle", text: "But d just settles... near zero point three.", pauseAfter: 0.5 },
    {
      id: "world",
      text: "The effect size is a fact about the world. The p-value is a fact about the world AND your sample.",
    },
    { id: "rates-in", text: "When the outcome is yes or no, there are two ways to say the size." },
    {
      id: "rates",
      scene: true,
      text: "Say a new checkout button lifts conversion from three percent to four point two.",
      pauseAfter: 0.35,
    },
    { id: "relative", text: "That's forty percent more... or one point two percentage points.", pauseAfter: 0.4 },
    { id: "both", text: "The first sounds bigger. Report both, so a reader can judge.", pauseAfter: 0.45 },
    {
      id: "interval",
      text: "And give every effect size an interval. Here, a d of zero point three six, plausibly anywhere from zero point one to zero point six.",
      pauseAfter: 0.4,
    },
    { id: "trio", text: "How big, how precise, and whether it's there at all. Report all three." },
    { id: "part2-in", text: "But even a well measured effect can mean something other than it seems." },

    // ── Part 2. Simpson's paradox and confounding ─────────────────────────
    {
      id: "admit",
      scene: true,
      take: true,
      text: "Berkeley's graduate admissions in 1973 are the famous case. Here's the same pattern, in two departments.",
      pauseAfter: 0.35,
    },
    {
      id: "overall",
      text: "Overall, fifty-five percent of the men get in, and only thirty-three percent of the women.",
      pauseAfter: 0.45,
    },
    {
      id: "split",
      text: "Now split by department. In the easy one, women do better, sixty-five percent to sixty.",
      pauseAfter: 0.3,
    },
    { id: "hard", text: "In the hard one, women do better again, twenty-seven and a half to twenty-five.", pauseAfter: 0.45 },
    { id: "how", text: "Ahead in both departments... and behind overall. How?", pauseAfter: 0.5 },
    {
      id: "mix",
      text: "Six hundred of the seven hundred women applied to the hard department. Six hundred of the men applied to the easy one.",
      pauseAfter: 0.45,
    },
    {
      id: "name",
      text: "That's Simpson's paradox. A lurking variable, here the department, sat unevenly across the groups.",
      pauseAfter: 0.35,
    },
    { id: "ask", text: "So before you trust a total, ask what it's averaging over." },
    { id: "confound-in", text: "And a lurking variable can flip a slope, too." },
    {
      id: "confound",
      scene: true,
      text: "Here's weekly exercise against blood pressure, for a hundred and four people.",
      pauseAfter: 0.35,
    },
    {
      id: "rises",
      text: "One line through everyone rises. About nine points higher for every extra hour of exercise a week.",
      pauseAfter: 0.45,
    },
    {
      id: "bands",
      text: "Now color them by age. Inside every age band, the line falls, by almost three points an hour.",
      pauseAfter: 0.4,
    },
    {
      id: "age",
      text: "Older people here exercise more, and have higher blood pressure. Age drives both. It's a confounder.",
      pauseAfter: 0.45,
    },
    { id: "coin", text: "The cure is a randomized experiment. If a coin decides who exercises, age can't." },
    { id: "rtm-in", text: "Sometimes, though, there's no third variable at all. Just luck." },

    // ── Part 3. Regression to the mean ────────────────────────────────────
    {
      id: "rtm",
      scene: true,
      take: true,
      text: "Five hundred salespeople. Every month, each one's number is their skill, plus luck.",
      pauseAfter: 0.4,
    },
    { id: "top", text: "Take the top tenth in month one. They averaged a hundred and thirty-two.", pauseAfter: 0.3 },
    { id: "next-month", text: "The same people, the next month... a hundred and thirteen.", pauseAfter: 0.45 },
    { id: "bottom", text: "The bottom tenth went the other way, from seventy up to ninety-five.", pauseAfter: 0.45 },
    {
      id: "nothing",
      text: "Nobody did anything. Part of every extreme score was luck, and luck doesn't repeat.",
      pauseAfter: 0.5,
    },
    {
      id: "coach",
      text: "Now picture a coaching program for that bottom group. They'd improve anyway, and the program would get the credit.",
      pauseAfter: 0.4,
    },
    { id: "control", text: "To credit it, you'd need a control group, just as extreme, and left alone." },
    { id: "look-in", text: "The next traps come from choosing what you look at." },

    // ── Part 4. Sharpshooters, selection and the unit of analysis ─────────
    {
      id: "cherry",
      scene: true,
      take: true,
      text: "Here are ten years of a monthly metric. It ended right about where it started.",
      pauseAfter: 0.4,
    },
    {
      id: "window",
      text: "But somewhere in ten years, there's always a steep stretch. These four months rose twenty-five percent.",
      pauseAfter: 0.4,
    },
    { id: "crop", text: "Show just those months, and every number is real... and the story is false." },
    {
      id: "sharp",
      scene: true,
      text: "The Texas sharpshooter does it on purpose. Fire at a barn wall... then paint a target around the tightest cluster.",
      pauseAfter: 0.45,
    },
    { id: "again", text: "Now fire again, and the cluster is gone. It was never aimed at.", pauseAfter: 0.4 },
    { id: "fresh", text: "A pattern you found by looking has to hold up on fresh data." },
    {
      id: "berkson",
      scene: true,
      text: "Selection can manufacture a relationship, too. In this population, ability and interview score are unrelated.",
      pauseAfter: 0.35,
    },
    { id: "rule", text: "Now admit anyone whose two scores add up past a bar.", pauseAfter: 0.35 },
    {
      id: "inside",
      text: "Among the hundred and seven who get in, the correlation is minus zero point five six.",
      pauseAfter: 0.45,
    },
    {
      id: "why-in",
      text: "Nothing changed anyone. A weak interview just means you got in on ability. So whenever you hear among our customers, ask what got someone into the data.",
    },
    {
      id: "unit",
      scene: true,
      text: "And a correlation depends on what you're counting. Across six districts, average income and turnout correlate at zero point nine three.",
      pauseAfter: 0.4,
    },
    { id: "people", text: "But inside each district, person by person, it's close to zero.", pauseAfter: 0.4 },
    {
      id: "both-true",
      text: "Both are true. One is about districts, the other about people. Name the unit before you quote a correlation.",
    },
    {
      id: "close",
      scene: true,
      text: "Most of these traps share one flaw. The analysis was shaped by the data, instead of decided in advance.",
      pauseAfter: 0.7,
    },
    { id: "next", text: "The cure is the same each time... decide what you'll test, before you look." },
  ],
};
