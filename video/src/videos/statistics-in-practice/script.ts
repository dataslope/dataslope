import type { NarrationScript } from "../../narration/types";
import { INTRO_LEAD_IN } from "../../editorial/intro.ts";

/**
 * Narration for "Statistics in practice" (16:9), Unit 9 of the Statistics
 * course and its last video. It merges the plan's two Unit 9 videos into one
 * argument in two parts:
 *
 *   1. Exploring, then confirming (beats "hook" to "ab-in"), after
 *      exploratory-statistical-analysis.mdx: it opens on Unit 8's bridge
 *      (decide what you'll test before you look) as a puzzle, how do you know
 *      what to test without looking? A lead found by slicing the tips data,
 *      the two jobs and the wall between them, the trap of testing a lead on
 *      the data that suggested it, and the held-out slice. It ends on making
 *      fresh data on purpose.
 *   2. An A/B test, end to end ("design" to "last"), after ab-testing.mdx:
 *      one hypothesis and one metric decided in advance, randomization, the
 *      sample size up front, no peeking, the full read of one experiment, and
 *      the decision on significance and size. Power itself is Unit 7's, so it
 *      gets one beat here. It closes on the course's first question, could
 *      this just be luck? There is no bridge: it is the course's last video.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every number is the output of the lessons' own code blocks and chart
 * specs, re-run with their seeds by measure.py (python 3.13, numpy 2.5.3,
 * pandas 3.0.5, scipy 1.18.1, plotly 7.1.0) into measurements.json, which
 * data.ts reads.
 *   - exploratory-statistical-analysis, "Step 5: relationships": the tips
 *     dataset's 244 bills, tip percentage by day. Friday's mean is 16.99,
 *     "seventeen percent", Saturday's 15.32, "fifteen"; Friday has 19 bills.
 *     By median Sunday leads, 16.11 against Friday's 15.56, the same groupby's
 *     median column. The lesson's own words: "These gaps are SUGGESTIVE, not
 *     conclusive. Small groups ... wobble a lot."
 *   - The same lesson's "Exploratory vs confirmatory": exploring outputs
 *     questions and candidate hypotheses, nothing a conclusion; confirming
 *     states one pre-declared hypothesis and tests it on data not yet looked
 *     at; testing on the data that suggested it makes "your p-value ... a
 *     lie"; the hold-out tip, "explore freely on, say, 70% of the rows, and
 *     lock away the other 30% untouched ... test it once". On screen that is
 *     171 bills and 73 (measure.py draws which, for the layout only).
 *   - ab-testing: the arc (hypothesis and one primary metric, randomize, size
 *     up front, run to plan, analyze, decide); "The new checkout button
 *     increases the purchase-conversion rate"; "Tracking ten metrics and
 *     celebrating whichever one moves is the multiple-comparisons trap". The
 *     analysis's simulated experiment is told as that button's test.
 *   - charts/randomisation-balances-confounders.mjs (in ab-testing): ten
 *     covariates, all ten over the 0.1 balance line when users self-select,
 *     one (age, 0.102) when randomized; "Motivation" and "Health literacy"
 *     marked never recorded.
 *   - ab-testing's sample-size block: 10% to 12% at 80% power and alpha 0.05
 *     needs 3,841 users per arm, "about three thousand eight hundred".
 *   - charts/ab-test-peeking.mjs (in ab-testing): two identical arms, the
 *     p-value after every hundred visitors dips under 0.05 twice (at 800, and
 *     from 2,000 to 4,600), and reads 0.19 at the planned 8,000.
 *   - ab-testing's analysis block (seed 42): 579 of 6,000 against 702 of
 *     6,000, 9.65% and 11.70%, a lift of 2.05 points, "two points", relative
 *     +21.2%, "about a fifth more"; 95% CI 0.95 to 3.15 points, "about one
 *     point to three"; p = 0.0003, "three in ten thousand"; Cohen's h 0.066.
 *   - ab-testing's third quiz question: 8.00% to 8.02% with a 95% CI of
 *     0.005 to 0.035 points, significant and not worth shipping. Its
 *     "5 million users" is not said: that interval needs about 25 million per
 *     arm (measure.py), so the narration says "a big enough test".
 *   - why-statistics-matters, "Why randomness matters" (seed 0), the course's
 *     first example: two groups of forty, B ahead by 3.62.
 *
 * Written for the ear: short spoken sentences, no symbols or parentheses,
 * numbers as words, contractions, questions the next sentence answers, an
 * ellipsis where a speaker would hold, and two capitalised stresses.
 */
export const script: NarrationScript = {
  id: "statistics-in-practice",
  voice: "hope",
  // The series intro plays first; its lead-in lives in editorial/intro.ts.
  leadIn: INTRO_LEAD_IN,
  tail: 2.6,
  beats: [
    // ── Part 1. Exploring, then confirming ────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Decide what you'll test before you look at the data. Good advice... but how do you know what to test, without looking?",
      pauseAfter: 0.5,
    },
    {
      id: "bills",
      text: "Here are two hundred and forty-four restaurant bills, and the tip left on each one.",
      pauseAfter: 0.3,
    },
    {
      id: "days",
      text: "Split them by day, and one stands out. Friday tips best, at seventeen percent... against fifteen on Saturday.",
      pauseAfter: 0.45,
    },
    {
      id: "few",
      text: "But only nineteen of these bills are from a Friday. A group that small wobbles a lot.",
      pauseAfter: 0.35,
    },
    { id: "median", text: "Swap the average for the median, and Sunday wins instead.", pauseAfter: 0.45 },
    { id: "lead", text: "So this isn't a finding. It's a lead... a question worth asking properly." },
    { id: "jobs-in", text: "Which means there are two different jobs here." },
    {
      id: "jobs",
      scene: true,
      text: "Exploring is roaming the data, slicing it every way you can. What comes out is questions, never conclusions.",
      pauseAfter: 0.4,
    },
    {
      id: "confirm",
      text: "Confirming is stating ONE hypothesis in advance, and testing it once, on data nobody has looked at. What comes out is a claim.",
      pauseAfter: 0.45,
    },
    {
      id: "sin",
      text: "Keep a wall between them. The trap is crossing it, by testing a lead on the data that suggested it. Friday was picked because it looked best in these very bills... so the test is tilted its way before it runs.",
      pauseAfter: 0.35,
    },
    { id: "lie", text: "A p-value from the data that suggested the question is a lie." },
    { id: "split-in", text: "So where does the fresh data come from?" },
    {
      id: "split",
      scene: true,
      text: "If you can't collect more, split what you have before you explore. Seventy percent to roam in... and thirty locked away.",
      pauseAfter: 0.4,
    },
    { id: "carry", text: "When a lead turns up, carry the question across the wall, but not the data.", pauseAfter: 0.3 },
    { id: "once", text: "Then test it once, on bills that never had a say in the hunch.", pauseAfter: 0.4 },
    { id: "ab-in", text: "Or better still, make fresh data on purpose." },

    // ── Part 2. An A/B test, end to end ───────────────────────────────────
    {
      id: "design",
      scene: true,
      text: "That's an A/B test: an experiment where almost everything is decided before the first user arrives.",
      pauseAfter: 0.4,
    },
    { id: "hypothesis", text: "One hypothesis. The new checkout button raises the conversion rate.", pauseAfter: 0.35 },
    {
      id: "metric",
      text: "And one metric to judge it by, chosen now. Track ten and cheer whichever one moves, and you're back to forking paths.",
    },
    { id: "who-in", text: "Then comes the step that makes it an experiment." },
    {
      id: "who",
      scene: true,
      text: "Who sees which button? Let users choose, and the two groups differ before the test even starts.",
      pauseAfter: 0.35,
    },
    {
      id: "traits",
      text: "Here's how far apart they sit on ten traits. Age, income, prior use... and two that nobody recorded, like motivation.",
      pauseAfter: 0.4,
    },
    {
      id: "coin",
      text: "Flip a coin for each user instead, and every gap shrinks to noise. Even the two nobody measured.",
      pauseAfter: 0.4,
    },
    {
      id: "cause",
      text: "The coin doesn't know what it's balancing, so it balances everything. That's what lets a test say the button CAUSED the change.",
    },
    { id: "size-in", text: "Two more decisions, before anyone clicks." },
    {
      id: "size",
      scene: true,
      text: "How many users? To catch ten percent rising to twelve, with eighty percent power, you need about three thousand eight hundred per arm.",
      pauseAfter: 0.4,
    },
    { id: "peek", text: "And no peeking. Here's a test where both arms are identical. There's nothing to find.", pauseAfter: 0.3 },
    {
      id: "wander",
      text: "Recompute its p-value after every hundred visitors, and it wanders... dipping under point oh five, twice.",
      pauseAfter: 0.4,
    },
    {
      id: "stop",
      text: "Stop at the first dip, and you've shipped noise. At the planned eight thousand, it reads point one nine.",
      pauseAfter: 0.3,
    },
    { id: "result-in", text: "So set the number, and look once, at the end." },
    {
      id: "result",
      scene: true,
      text: "Here's a finished test, with six thousand users in each arm.",
      pauseAfter: 0.3,
    },
    {
      id: "counts",
      text: "Five hundred and seventy-nine bought with the old button. Seven hundred and two with the new.",
      pauseAfter: 0.35,
    },
    {
      id: "lift",
      text: "That's nine point six five percent against eleven point seven. A lift of two points... about a fifth more sales.",
      pauseAfter: 0.4,
    },
    {
      id: "interval",
      text: "Its ninety-five percent interval runs from about one point to three, and the p-value is three in ten thousand.",
      pauseAfter: 0.4,
    },
    {
      id: "four",
      text: "Report all four together: the lift, its interval, the p-value, and an effect size. Never the p-value alone.",
    },
    {
      id: "decide",
      scene: true,
      text: "Then decide, on two questions. Is it significant? Yes. The whole interval sits above zero.",
      pauseAfter: 0.35,
    },
    { id: "matter", text: "And is it big enough to matter? That one's about money, not math.", pauseAfter: 0.45 },
    {
      id: "tiny",
      text: "A big enough test makes even eight percent rising to eight point oh two significant. It's real... and worthless.",
      pauseAfter: 0.4,
    },
    {
      id: "permit",
      text: "Significance gives you permission to look at the size. It doesn't tell you to ship.",
      pauseAfter: 0.7,
    },
    {
      id: "began",
      scene: true,
      text: "This course began with two groups, a gap between them, and one question. Could this just be luck?",
      pauseAfter: 0.45,
    },
    { id: "since", text: "Everything since has been a way to answer it honestly.", pauseAfter: 0.5 },
    {
      id: "last",
      text: "So look all you like. Then decide the question... and ask it once, of data that hasn't answered it yet.",
    },
  ],
};
