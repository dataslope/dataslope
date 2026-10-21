import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";
import { INTRO_LEAD_IN } from "../../editorial/intro.ts";

/**
 * Narration for "Distributions" (16:9), Unit 4 of the Statistics course. It
 * merges the plan's four Unit 4 videos into one argument in four parts, each
 * leading into the next:
 *
 *   1. Counting distributions, and choosing one ("hook" to "whole"), after
 *      discrete-distributions.mdx: Bernoulli, binomial and its assumptions,
 *      Poisson and its simulation check, geometric, and the questions that
 *      pick one. It opens on Unit 3's bridge (a mean and a variance sum up
 *      one random variable; the shapes have names) and ends on counting
 *      against measuring.
 *   2. Probability is area ("exact" to "cutoff"), after
 *      continuous-distributions.mdx: an exact value has probability zero,
 *      area under the curve, height as density, and the quantile.
 *   3. The normal ("bell" to "check"), after the-normal-distribution.mdx:
 *      many small effects adding up, the two parameters, 68-95-99.7, the
 *      z-score as a position, and skewed data that a normal misfits.
 *   4. Fitting, and where to stop trusting it ("fit" to "next"), after
 *      working-with-distributions.mdx: .fit, the Q-Q plot, and the far tail
 *      as extrapolation. It ends on Unit 5's first video, SamplingBias: a fit
 *      is only as good as how its sample was drawn.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every number is the output of the lessons' own code blocks, re-run
 * with their seeds by measure.py (python 3.13, numpy 2.5.3, scipy 1.18.1,
 * pandas 3.0.5) into measurements.json, which data.ts reads.
 *   - discrete-distributions, Bernoulli block: p = 0.3, "point three", and
 *     its ten simulated visitors (random_state=0), three of them 1.
 *   - Binomial blocks: 200 visitors at 0.03; the pmf peaks at 6 (0.1631,
 *     "the likeliest number"); sf(9) = 0.0808, ten or more "about eight
 *     percent of the time". The assumptions (each decides independently,
 *     the same p) and the TV ad's correlated burst, which makes the binomial
 *     understate the variability, are the lesson's "Misconception" callout.
 *   - Poisson worked example: three tickets an hour; sf(7) = 0.0119, which
 *     the block prints as "roughly 1 hour out of 84"; the simulation block
 *     (seed 0, 100,000 hours) gives 0.0117 against the analytic 0.0119;
 *     mean and variance both 3; a variance far above the mean means
 *     clustered events, under which the Poisson understates the spikes
 *     ("When NOT to use a Poisson").
 *   - Geometric block: each call closes with p = 0.2, "one time in five";
 *     mean 1/p = 5; pmf(1) = 0.2 is the largest; sf(10) = 0.1074, "eleven
 *     percent". The four questions are the lesson's decision flowchart, and
 *     "if 2.7 is meaningful, the quantity is continuous" its closing callout.
 *   - continuous-distributions, Exponential block: a mean wait of 5 minutes;
 *     cdf(8) - cdf(2) = 0.4684, "forty-seven percent"; the exact value's
 *     zero probability is the page's opening.
 *   - Uniform block: Uniform(0, 10) has density 0.1 and P(3 < X < 7) = 0.4;
 *     "Misconception #1": Uniform(0, 0.5) has density 2 and area 1.
 *   - Quantiles block: exponential response times with mean 200 ms;
 *     ppf(0.95) = 599.1, "five hundred and ninety-nine".
 *   - the-normal-distribution, penguins block: 151 Adelie flipper lengths,
 *     mean 190.0 mm, std 6.5 mm.
 *   - Empirical rule block: 68.27%, 95.45% and 99.73% of the standard normal
 *     within one, two and three SDs; exam scores with mean 100 and SD 15, 95%
 *     between 70 and 130, and "a score of 145 (3σ out) is genuinely rare".
 *   - z-score block: (130 - 100) / 15 = 2, and norm.cdf(2) = 97.7%; "a
 *     z-score is a position, not a probability" is the lesson's callout.
 *   - "When the data is NOT normal" block (seed 0): 5,000 lognormal incomes,
 *     mean 43,285, "forty-three thousand", median 35,718, "under thirty-six
 *     thousand"; the normal fitted to their mean and SD gives
 *     P(income < 0) = 0.061, "six percent".
 *   - working-with-distributions, fitting block (seed 42): 500 values from
 *     Normal(72, 6); norm.fit returns loc 71.921 and scale 5.754, "seventy-one
 *     point nine" and "five point seven five"; ppf(0.95) = 81.39, "eighty-one
 *     point four". "Fitting always returns parameters, even for a
 *     distribution that's completely wrong" is the lesson's.
 *   - Q-Q block (seed 7): 400 normal values fitted by a normal (Q-Q
 *     correlation 0.9984) and 400 lognormal values fitted by a normal
 *     (0.9413), which bend away at the tails.
 *   - Extrapolation block (seed 0): 400 values from Normal(80, 12) run from
 *     34.7 to 116.8, "about thirty-five to a hundred and seventeen"; the
 *     fitted sf(100) = 0.0435, "four percent", with 16 of the 400 values above
 *     100; sf(200) = 3.19e-24, which written out is "zero point", twenty-three
 *     zeros and then 319.
 *   - There are no historical or real-world claims to source: every example
 *     is one of the lessons' own, and every number is one of their outputs.
 *
 * Written for the ear: short spoken sentences, no symbols or parentheses,
 * numbers as words, contractions, questions the next sentence answers, an
 * ellipsis where a speaker would hold, and two capitalised stresses.
 */
export const script: NarrationScript = {
  id: "distributions",
  voice: "hope",
  // The series intro plays first; its lead-in lives in editorial/intro.ts.
  leadIn: INTRO_LEAD_IN,
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Part 1. Counting distributions, and choosing one ─────────────────
    {
      id: "hook",
      scene: true,
      text: "A mean and a variance sum up one random variable. But the random variables you'll meet keep taking the same few shapes... and those shapes have names.",
      pauseAfter: 0.5,
    },
    {
      id: "bernoulli",
      text: "Start with the smallest. One visitor either signs up or doesn't, with a chance of, say, point three. One yes or no is a Bernoulli trial.",
      pauseAfter: 0.4,
    },
    {
      id: "binomial",
      text: "Now show the page to two hundred visitors, who each sign up with a chance of three in a hundred, and count the yeses.",
      pauseAfter: 0.3,
    },
    { id: "six", text: "That count is binomial. Six is the likeliest number, and the chances fall away on either side.", pauseAfter: 0.35 },
    { id: "ten", text: "Ten or more? That happens about eight percent of the time.", pauseAfter: 0.5 },
    {
      id: "alone",
      text: "But it only holds if every visitor decides alone, with the same chance. A crowd sent by one TV ad, all behaving alike, makes the count swing far wider.",
      pauseAfter: 0.5,
    },
    { id: "poisson-in", text: "And some counts have no fixed number of tries at all. Just a rate." },
    {
      id: "poisson",
      scene: true,
      text: "Say a help desk gets three tickets an hour, on average, each arriving on its own. The count in any one hour is Poisson.",
      pauseAfter: 0.35,
    },
    {
      id: "spike",
      text: "So how often does an hour bring eight or more, a spike worth staffing for? About one hour in eighty-four.",
      pauseAfter: 0.45,
    },
    {
      id: "simulate",
      text: "Simulate a hundred thousand hours to check, and spikes come up one point one seven percent of the time. Close to the formula's one point one nine.",
      pauseAfter: 0.45,
    },
    {
      id: "same",
      text: "A Poisson's mean and variance are the same number, here three. So if real counts vary far more than their average, events are clumping... and the Poisson will understate the spikes.",
      pauseAfter: 0.5,
    },
    { id: "geometric-in", text: "One more kind of count is worth a name." },
    {
      id: "geometric",
      scene: true,
      text: "Count the tries until the first success. If each sales call closes one time in five, the calls until the first sale are geometric.",
      pauseAfter: 0.35,
    },
    {
      id: "five",
      text: "On average, that's five calls. But the likeliest number is one... and eleven percent of the time, it takes more than ten.",
    },
    { id: "choose", scene: true, text: "So picking a model comes down to what you're counting.", pauseAfter: 0.35 },
    {
      id: "leaves",
      text: "One yes or no is Bernoulli. Successes in a fixed number of tries, binomial. Tries until the first success, geometric. Events at a steady rate, with no fixed number, Poisson.",
      pauseAfter: 0.5,
    },
    { id: "whole", text: "All four count in whole numbers. If two point seven makes sense, you're measuring, not counting." },

    // ── Part 2. Probability is area ─────────────────────────────────────
    {
      id: "exact",
      scene: true,
      text: "Measurements work differently. Take waiting times, which are often exponential: short waits are common, and long ones rare.",
      pauseAfter: 0.35,
    },
    { id: "five-min", text: "Say they average five minutes. What's the chance a wait is EXACTLY five?", pauseAfter: 0.6 },
    {
      id: "zero",
      text: "Not five and a bit. Exactly five... and the answer is zero. A single point has no width, so it holds no probability.",
      pauseAfter: 0.45,
    },
    {
      id: "area",
      text: "Probability lives on ranges, as area under the curve. Waits between two and eight minutes take up forty-seven percent of it.",
      pauseAfter: 0.4,
    },
    { id: "cdf", text: "In code, that's the area left of eight, minus the area left of two.", pauseAfter: 0.5 },
    { id: "height-in", text: "Which means the curve's height can't be a probability." },
    {
      id: "uniform",
      scene: true,
      text: "Spread a value evenly from zero to ten, and its curve is flat, a uniform, at a height of point one.",
      pauseAfter: 0.3,
    },
    {
      id: "slice",
      text: "Three to seven covers four tenths of the width, so it holds four tenths of the probability.",
      pauseAfter: 0.4,
    },
    {
      id: "squeeze",
      text: "Now squeeze all of it into half a unit. To keep the area at one, the height has to climb to two.",
      pauseAfter: 0.45,
    },
    {
      id: "density",
      text: "Two isn't a two hundred percent chance. It's a density, probability per unit of width. Only the area has to come to one.",
      pauseAfter: 0.5,
    },
    { id: "quantile-in", text: "Often, though, you need the question the other way round." },
    {
      id: "quantile",
      scene: true,
      text: "Say response times average two hundred milliseconds, and you want the time that ninety-five percent of requests beat.",
      pauseAfter: 0.35,
    },
    {
      id: "across",
      text: "Plot the share finished by each moment. Go across from ninety-five percent, then down... five hundred and ninety-nine milliseconds.",
      pauseAfter: 0.45,
    },
    {
      id: "cutoff",
      text: "That's a quantile, the area read backwards. It's how you set a cutoff, or a promise to customers.",
      pauseAfter: 0.5,
    },
    { id: "normal-in", text: "And of all these shapes, one turns up more than any other." },

    // ── Part 3. The normal, 68-95-99.7, z-scores ─────────────────────────
    {
      id: "bell",
      scene: true,
      text: "The normal. It's what you get when many small, independent effects add up.",
      pauseAfter: 0.35,
    },
    {
      id: "penguins",
      text: "Take the flippers of a hundred and fifty-one Adelie penguins. Each is the sum of countless small nudges... and together they come out close to a bell.",
      pauseAfter: 0.4,
    },
    { id: "center", text: "Two numbers set it. The mean puts the center, at a hundred and ninety millimeters.", pauseAfter: 0.3 },
    { id: "spread", text: "The standard deviation sets the spread, here six and a half.", pauseAfter: 0.5 },
    { id: "rule-in", text: "And with those two numbers, every normal shares one fact." },
    {
      id: "rule",
      scene: true,
      text: "About sixty-eight percent of it lies within one standard deviation of the mean.",
      pauseAfter: 0.3,
    },
    { id: "two", text: "Ninety-five percent lies within two. And ninety-nine point seven within three.", pauseAfter: 0.45 },
    {
      id: "scores",
      text: "So if test scores average a hundred, with a spread of fifteen, ninety-five percent land between seventy and a hundred and thirty.",
      pauseAfter: 0.35,
    },
    { id: "rare", text: "And a hundred and forty-five, three out, is genuinely rare.", pauseAfter: 0.5 },
    { id: "z-in", text: "That ruler works on any normal, once a value is measured in standard deviations." },
    {
      id: "z",
      scene: true,
      text: "That's its z-score. A score of a hundred and thirty sits thirty points above the mean, two standard deviations. Its z is two.",
      pauseAfter: 0.4,
    },
    {
      id: "position",
      text: "But a z of two isn't a two percent chance. It's a position. Look up the area to its left, and ninety-seven point seven percent of scores fall below it.",
      pauseAfter: 0.5,
    },
    { id: "skew-in", text: "That only works when the data really is normal, though." },
    {
      id: "incomes",
      scene: true,
      text: "Here are five thousand incomes, with a long tail of high earners. The mean is forty-three thousand, but the median is under thirty-six thousand.",
      pauseAfter: 0.35,
    },
    { id: "force", text: "Force a normal onto them anyway, with the same mean and spread...", pauseAfter: 0.2 },
    { id: "below", text: "and it puts six percent of people below zero, earning less than nothing.", pauseAfter: 0.45 },
    { id: "check", text: "So don't assume normal. It's something you check, with a plot.", pauseAfter: 0.5 },
    { id: "fit-in", text: "And checking a model starts with fitting one." },

    // ── Part 4. Fitting a distribution, and where to stop trusting it ────
    {
      id: "fit",
      scene: true,
      text: "With real data, you don't know the parameters. You estimate them from the sample.",
      pauseAfter: 0.3,
    },
    {
      id: "fitted",
      text: "Hand these five hundred measurements to a normal fit, and it returns a mean of seventy-one point nine, with a spread of five point seven five.",
      pauseAfter: 0.35,
    },
    {
      id: "use",
      text: "Now the model answers questions the raw data can't, like a ninety-fifth percentile of eighty-one point four.",
      pauseAfter: 0.45,
    },
    {
      id: "always",
      text: "But a fit ALWAYS returns numbers, even for the wrong shape. Getting an answer doesn't mean it fits.",
    },
    {
      id: "qq",
      scene: true,
      text: "So look. A Q-Q plot lines up the data's quantiles against the model's. When the model is right, the points fall on the line.",
      pauseAfter: 0.4,
    },
    {
      id: "bend",
      text: "Fit a normal to skewed data, and they bend away at the ends... right where the tails are, and where the costly mistakes live.",
    },
    {
      id: "extent",
      scene: true,
      text: "Even a good fit only knows where its data was. These four hundred values run from about thirty-five to a hundred and seventeen.",
      pauseAfter: 0.35,
    },
    { id: "inside", text: "Above a hundred? The model says four percent, and there's data there to back it up.", pauseAfter: 0.4 },
    { id: "outside", text: "Above two hundred? It says zero point... then twenty-three zeros, then a three.", pauseAfter: 0.5 },
    { id: "shape", text: "Nothing out there was ever observed. That number is the assumed shape, talking.", pauseAfter: 0.7 },
    {
      id: "next",
      text: "And a fit can only be as good as the data behind it... which depends on how the sample was drawn.",
    },
  ],
};
