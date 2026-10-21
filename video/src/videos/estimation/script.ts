import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";
import { INTRO_LEAD_IN } from "../../editorial/intro.ts";

/**
 * Narration for "Estimation" (16:9), Unit 6 of the Statistics course, one
 * video for the whole unit like Unit 1's ThinkingStatistically. It covers the
 * plan's three Unit 6 videos as three parts of one argument:
 *
 *   1. What "95% confident" means (beats "hook" to "safer"), after
 *      confidence-intervals.mdx: building an interval from an estimate, its
 *      standard error and a critical value; the coverage simulation; and the
 *      misreadings (a 95% chance for this interval, 95% of the data, wider is
 *      safer). It opens on Unit 5's last line, StandardError's "Next, we'll
 *      build that interval properly", by building it.
 *   2. What makes an interval wide ("wide" to "formula-in"), after
 *      confidence-intervals.mdx: the three levers, a CI for a proportion, and
 *      intervals and tests as two views of one thing, which carries the last
 *      misreading ("includes zero, so no effect").
 *   3. The bootstrap ("bootstrap" to "next"), after the-bootstrap.mdx:
 *      resampling with replacement, the bootstrap mean checked against the
 *      formula, the median that has no easy formula, and the two cautions. It
 *      ends on Unit 7's first question, the logic of a test.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every number is the output of the lessons' own code blocks, re-run
 * with their seeds by measure.py (python 3.13, numpy 2.5.3, scipy 1.18.1)
 * into measurements.json, which data.ts reads. The page's prepopulated
 * outputs print the same.
 *   - confidence-intervals, "Building a confidence interval for a mean"
 *     (seed 42): 50 users, mean 49.28 ("forty-nine dollars twenty-eight"),
 *     standard error 1.52 ("about a dollar fifty"), t critical value 2.0096 at
 *     49 degrees of freedom ("two point oh one") against the normal's 1.96,
 *     margin 3.06, interval 46.22 to 52.33. The same sample: 11 of the 50
 *     values fall inside the interval, and 48 inside x-bar plus or minus 2 s
 *     (27.77 to 70.79), the lesson's "range that holds ~95% of individual
 *     values".
 *   - confidence-intervals, "The canonical simulation" (seed 7): 100 samples
 *     of 40 from a population with mean 100 and spread 15; 94 intervals
 *     cover 100 and 6 miss, the page's "94 of 100 intervals covered mu".
 *   - confidence-intervals, "What controls the width" (seed 0): one sample of
 *     200 at 80, 90, 95 and 99%, widths 2.10 to 4.25 ("two point one to four
 *     point two five"); samples of 25, 100, 400 and 1,600 at 95%, widths
 *     11.25, 5.22, 2.30 and 1.18. The lesson's third lever (spread) is shown
 *     on that same sample of 200, every value moved twice as far from the
 *     mean: s goes from 11.56 to 23.13 and the width from 3.22 to 6.45.
 *   - confidence-intervals, "A CI for a proportion": 540 of 3,000 is 18%,
 *     standard error 0.0070 ("seven tenths of a point"), 1.96 of them either
 *     way gives 16.6% to 19.4%.
 *   - confidence-intervals, "CIs and hypothesis tests are two views of one
 *     thing": its callout's difference CI of -0.5 to 8.0 ("minus a half to
 *     eight"); the interval that leaves out zero is the difference interval
 *     of the lesson's chart overlapping-cis-are-not-a-test, 2.40 to 19.60.
 *   - the-bootstrap, "Bootstrapping a mean" (seed 42): 60 Gamma(2, 4) waits,
 *     5,000 resamples; the first resample draws 10 values twice, 6 three
 *     times and 22 not at all; bootstrap standard error 0.482 against the
 *     formula's 0.493; percentile interval 6.132 to 8.006 ("six point one to
 *     eight point oh") against the t-interval's 6.054 to 8.027.
 *   - the-bootstrap, "The payoff" (seed 7): 120 lognormal incomes, median
 *     34,109; 5,000 resampled medians take only 189 distinct values ("a little
 *     lumpy"); percentile interval 30,808 to 37,093 ("about thirty thousand
 *     eight hundred to thirty-seven thousand one hundred").
 *   - The two cautions are the lesson's ("The bootstrap cannot create
 *     information", and the maximum under "When to use the bootstrap"); the
 *     figures under them are the video's own, measured in measure.py: 60 of
 *     the lesson's Gamma(2, 4) waits recorded only when under ten minutes
 *     (seed 6) bootstrap to 4.13 to 5.45 around a true mean of 8; and the
 *     bootstrapped maximum of the lesson's 60 waits (seed 9) lands on the
 *     sample's largest value in 63.3% of resamples, the lesson chart
 *     bootstrap-fails-for-max's "about 63%".
 *   - There are no historical or real-world claims to source: every example
 *     is one of the lessons' own.
 *
 * Written for the ear: short spoken sentences, no symbols or parentheses,
 * numbers as words, contractions, questions the next sentence answers, an
 * ellipsis where a speaker would hold, one capitalised stress and one audio
 * tag.
 */
export const script: NarrationScript = {
  id: "estimation",
  voice: "hope",
  // The series intro plays first; its lead-in lives in editorial/intro.ts.
  leadIn: INTRO_LEAD_IN,
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Part 1. What "95% confident" means ───────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "An interval needs just two numbers from the data: an estimate, and its standard error.",
      pauseAfter: 0.35,
    },
    {
      id: "users",
      text: "Fifty users spend an average of forty-nine dollars twenty-eight a month. That's the estimate.",
      pauseAfter: 0.35,
    },
    {
      id: "wobble",
      text: "Another fifty would average something else, and the standard error says by how much: about a dollar fifty.",
      pauseAfter: 0.4,
    },
    {
      id: "margin",
      text: "Multiply it by a critical value, two point oh one, and you get the margin of error: three dollars and six cents.",
      pauseAfter: 0.35,
    },
    {
      id: "interval",
      text: "Step that far either way, and the interval runs from forty-six twenty-two to fifty-two thirty-three.",
      pauseAfter: 0.45,
    },
    { id: "why", text: "Why not the usual one point nine six?", pauseAfter: 0.8 },
    {
      id: "why-t",
      text: "The spread was estimated from the same fifty people, and the t-distribution widens the band a little to pay for that.",
      pauseAfter: 0.7,
    },
    { id: "means-in", text: "Building one is easy. Saying what it means is where people slip." },
    {
      id: "coverage",
      scene: true,
      text: "So play god for a moment. Here's a population whose true mean you know: a hundred.",
      pauseAfter: 0.3,
    },
    { id: "draw", text: "Draw forty values, build an interval... then do it again, a hundred times.", pauseAfter: 0.4 },
    { id: "hits", text: "Ninety-four intervals catch the true mean. Six miss it.", pauseAfter: 0.4 },
    { id: "unlucky", text: "The misses used the same correct recipe. They just drew unlucky samples.", pauseAfter: 0.4 },
    {
      id: "recipe",
      text: "So the ninety-five percent describes the recipe: run it again and again, and about ninety-five in a hundred catch the truth.",
      pauseAfter: 0.45,
    },
    {
      id: "yours",
      text: "Your interval is just ONE of these lines. It holds the truth or it doesn't... and you can't see which.",
      pauseAfter: 0.6,
    },
    { id: "wrong-in", text: "That's the sentence almost everyone gets wrong." },
    {
      id: "misread",
      scene: true,
      text: "The usual version: there's a ninety-five percent chance the true mean is in this interval.",
      pauseAfter: 0.35,
    },
    {
      id: "fixed",
      text: "But the true mean never moves. Once your interval is drawn, nothing is random any more. It's in, or it's out.",
      pauseAfter: 0.45,
    },
    {
      id: "data",
      text: "Another misreading: ninety-five percent of the data falls inside. Back to the fifty users.",
      pauseAfter: 0.3,
    },
    {
      id: "eleven",
      text: "Only eleven of the fifty spend inside it. The interval pins down their average, not any one person.",
      pauseAfter: 0.45,
    },
    { id: "safer", text: "And a wider interval isn't safer. It's just less precise." },

    // ── Part 2. What makes an interval wide ───────────────────────────────
    { id: "wide", scene: true, text: "So what makes an interval wide? Three things.", pauseAfter: 0.3 },
    {
      id: "level",
      text: "First, the confidence you ask for. Take one sample of two hundred, and build its interval at eighty, ninety, ninety-five and ninety-nine percent.",
      pauseAfter: 0.3,
    },
    {
      id: "costs",
      text: "Each is wider than the last, from two point one to four point two five. More confidence costs precision.",
      pauseAfter: 0.45,
    },
    {
      id: "size",
      text: "Second, the sample size. Hold the level at ninety-five, and grow the sample from twenty-five to sixteen hundred.",
      pauseAfter: 0.3,
    },
    {
      id: "halves",
      text: "Each time the data quadruples, the width roughly halves: eleven, five, two point three, one point two.",
      pauseAfter: 0.45,
    },
    { id: "noise", text: "And third, the spread of the data. Double it, and the width doubles too.", pauseAfter: 1.2 },
    { id: "rate-in", text: "The same recipe works for a rate." },
    {
      id: "rate",
      scene: true,
      text: "Say five hundred and forty of three thousand visitors convert. That's eighteen percent.",
      pauseAfter: 0.35,
    },
    {
      id: "rate-se",
      text: "A rate's standard error comes from the rate itself, and here it's seven tenths of a point.",
      pauseAfter: 0.7,
    },
    {
      id: "rate-z",
      text: "There's no separate spread to estimate, so there's no t to pay for: the usual choice is the normal's value.",
      pauseAfter: 0.6,
    },
    {
      id: "rate-ci",
      text: "Step one point nine six of those either way, and you get sixteen point six to nineteen point four percent.",
      pauseAfter: 0.6,
    },
    { id: "test-in", text: "And an interval can answer a question you might think needs a test." },
    {
      id: "test",
      scene: true,
      text: "Build an interval for a difference. If it leaves out zero, the difference is significant at the five percent level.",
      pauseAfter: 0.6,
    },
    {
      id: "pair",
      text: "Ninety-five and five go together: a test at the five percent level rejects exactly the values a ninety-five percent interval leaves out.",
      pauseAfter: 0.8,
    },
    {
      id: "straddle",
      text: "This one runs from minus a half to eight. It includes zero, so you can't rule out no effect.",
      pauseAfter: 0.7,
    },
    { id: "eight", text: "But it includes eight as well, a big effect you can't rule out either.", pauseAfter: 0.7 },
    { id: "proof", text: "That isn't proof of nothing. It's a call for more data.", pauseAfter: 0.6 },
    {
      id: "views",
      text: "An interval and a test are two views of one thing, and only the interval shows how big the effect might be.",
      pauseAfter: 0.8,
    },
    { id: "formula-in", text: "Every interval so far leaned on a formula for the standard error." },

    // ── Part 3. The bootstrap ─────────────────────────────────────────────
    {
      id: "bootstrap",
      scene: true,
      text: "[curious] But what's the standard error of a median? Or a correlation? The formula is ugly, or doesn't exist.",
      pauseAfter: 0.4,
    },
    { id: "trick", text: "The bootstrap's answer is bold: treat your sample as if it were the population.", pauseAfter: 0.35 },
    { id: "waits", text: "Here are sixty customer wait times, skewed, not normal.", pauseAfter: 0.3 },
    {
      id: "resample",
      text: "Draw sixty from them, with replacement. Some come up twice, or three times... and some not at all.",
      pauseAfter: 0.4,
    },
    { id: "again", text: "Average that resample. Then do it all again, five thousand times.", pauseAfter: 0.35 },
    {
      id: "pile",
      text: "The averages pile up into a bootstrap distribution. Its spread is the standard error, zero point four eight, where the formula says zero point four nine.",
      pauseAfter: 0.35,
    },
    {
      id: "middle",
      text: "And its middle ninety-five percent, six point one to eight point oh, is almost exactly the t-interval.",
      pauseAfter: 0.5,
    },
    { id: "payoff-in", text: "For a mean, that's the long way round. The payoff is everything else." },
    {
      id: "median",
      scene: true,
      text: "Take a hundred and twenty incomes, skewed enough that the median is the honest summary.",
      pauseAfter: 0.3,
    },
    { id: "word", text: "Run the same loop, and change one word: median, instead of mean.", pauseAfter: 0.4 },
    {
      id: "lumpy",
      text: "The medians pile up a little lumpy, because a median can only land near values you actually saw.",
      pauseAfter: 0.35,
    },
    {
      id: "range",
      text: "Their middle ninety-five percent runs from about thirty thousand eight hundred to thirty-seven thousand one hundred. No formula needed.",
    },
    {
      id: "limits",
      scene: true,
      text: "But the bootstrap can't create information. It only reuses the data you have.",
      pauseAfter: 0.35,
    },
    {
      id: "biased",
      text: "Resample a biased sample, and every resample carries the bias: a confident interval... around the wrong center.",
      pauseAfter: 0.45,
    },
    {
      id: "edge",
      text: "And it fails at the edges. A resample can never beat the largest value you saw, so it can't say much about a maximum.",
      pauseAfter: 0.4,
    },
    { id: "precision", text: "It measures how much an estimate wobbles, not whether it's aimed at the truth.", pauseAfter: 0.7 },
    {
      id: "next",
      text: "So an interval says which values are plausible. A test asks about one value in particular... could the effect be zero?",
    },
  ],
};
