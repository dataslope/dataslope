import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "The three distributions to keep apart" (16:9), Unit 5,
 * video 5.3 of the Statistics course, after
 * content/courses/statistics-for-data-science-python/sampling-distributions.mdx:
 * "The three distributions you must keep separate", "Building the sampling
 * distribution by hand", "Comparing the three side by side", "More samples
 * vs. larger samples, a crucial difference" and "It works for any statistic,
 * not just the mean". It is embedded at the first of those.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every number is the output of the lesson's own code blocks, re-run
 * with their seeds by measure.py (numpy, results in measurements.json, which
 * data.ts reads); the printouts match the outputs the lesson page shows.
 *   - "Comparing the three side by side" (seed 0): a million customers'
 *     spend, normal with mean 50 and sd 18 (measured 50.02 and 18.01); one
 *     sample of forty has mean 47.19 and spread 20.32, "about twenty"; the
 *     sample means average 49.98 with spread 2.85, "under three dollars".
 *     The pile on screen is that sample's mean followed by the lesson's next
 *     4,999 means: same spread, 2.85, and same center to the second decimal.
 *   - "More samples vs. larger samples" (seed 1): with n = 40, 500, 2,000,
 *     8,000 and 32,000 samples give spreads of 2.78, 2.83, 2.87 and 2.85,
 *     "near two point eight"; with 4,000 samples, n = 10, 40, 160 and 640
 *     give 5.61, 2.82, 1.43 and 0.72, "five and a half to under one".
 *   - "It works for any statistic" (seed 5): samples of sixty from a gamma
 *     population (the lesson's "incomes, say"); the mean's sampling
 *     distribution is centered on 40.01 with spread 3.69, the median's on
 *     33.83 with 4.01, and the maximum's on 132.81 with 28.73 and a skewness
 *     of 1.19, "far out, wide and lopsided".
 *   - The claims without a number are the lesson's own: one sample is a noisy
 *     snapshot of the population, a histogram of your data is the one
 *     sample, the gap in width is why a sample of forty can estimate the
 *     mean of the population, more samples only smooth the picture, in real
 *     life you get one sample, and the width of a sampling distribution is
 *     called the standard error. "Dollars" is this video's reading of the
 *     lesson's "customer spend", which gives no unit.
 *
 * Written to be spoken: short sentences, no symbols, no parentheses, numbers
 * as words, contractions, a question the next sentence answers, an ellipsis
 * where a speaker would hold, and capitals on the one word a line leans on.
 * No voice is set here: the course's narrator is chosen when it is recorded.
 */
export const script: NarrationScript = {
  id: "sampling-distributions",
  voice: "hope",
  leadIn: 0.5,
  tail: 2.6,
  beats: [
    {
      id: "hook",
      text: "How far can a fair sample miss? Answering that takes three distributions... and side by side, they look alike.",
      pauseAfter: 0.35,
    },
    {
      id: "apart",
      text: "And mixing them up is how confidence intervals get misread. So let's pull them apart.",
    },
    {
      id: "pop",
      scene: true,
      text: "The first is the population. Here, that's what a million customers spend.",
      pauseAfter: 0.3,
    },
    {
      id: "center",
      text: "They spend fifty dollars on average, with a spread of eighteen.",
      pauseAfter: 0.4,
    },
    {
      id: "unknown",
      text: "It's wide, it's fixed... and in real life, you almost never get to see it.",
      pauseAfter: 0.6,
    },
    { id: "sample", text: "The second is one sample. Pick forty customers at random.", pauseAfter: 0.3 },
    {
      id: "snapshot",
      text: "It's a noisy snapshot of the population. Ragged, but about as wide, with a spread of about twenty.",
      pauseAfter: 0.35,
    },
    {
      id: "data",
      text: "That's what a histogram of your data shows. Raw values, one per customer.",
    },
    {
      id: "third",
      scene: true,
      text: "The third is a different kind of thing. Average those forty, and you get one number... about forty-seven dollars.",
      pauseAfter: 0.3,
    },
    { id: "block", text: "That average becomes one block in a new chart.", pauseAfter: 0.3 },
    { id: "repeat", text: "Now pick forty more, and forty more. Five thousand samples later,", pauseAfter: 0.15 },
    {
      id: "pile",
      text: "the averages have piled up right on fifty. And their spread is under three dollars.",
    },
    {
      id: "compare",
      scene: true,
      text: "On their own axes, these three looked alike. On one axis, the widths tell them apart.",
      pauseAfter: 0.4,
    },
    {
      id: "raw",
      text: "The population and the sample are raw values, spread across tens of dollars.",
      pauseAfter: 0.3,
    },
    {
      id: "statistic",
      text: "The third is a statistic, one average per sample. And it barely moves.",
      pauseAfter: 0.45,
    },
    {
      id: "why",
      text: "That gap is why forty customers can pin down the average of a million. And a histogram of your data? It's always the middle one.",
    },
    {
      id: "trap",
      scene: true,
      text: "Now, here's a trap. A simulation has two ways to get more data... more samples, or bigger ones.",
      pauseAfter: 0.4,
    },
    {
      id: "more",
      text: "Draw more samples, from five hundred up to thirty-two thousand, and the histogram just gets smoother. Its spread stays near two point eight.",
      pauseAfter: 0.45,
    },
    {
      id: "bigger",
      text: "Make each sample bigger, from ten customers up to six hundred and forty, and the spread falls, from five and a half to under one.",
      pauseAfter: 0.45,
    },
    {
      id: "real",
      text: "And in real life, you only ever get ONE sample. Its size is the lever you actually control.",
    },
    {
      id: "any",
      scene: true,
      text: "One last thing. The mean isn't special. Every statistic has a sampling distribution.",
      pauseAfter: 0.3,
    },
    {
      id: "kinds",
      text: "Take samples of sixty from a lopsided population, like incomes, and keep each sample's mean, median and maximum.",
      pauseAfter: 0.35,
    },
    {
      id: "own",
      text: "Each gets its own center, its own width, and its own shape. The maximum lands far out, wide and lopsided.",
      pauseAfter: 0.5,
    },
    {
      id: "name",
      text: "And that width, how far a statistic moves from one sample to the next, has a name... the standard error.",
      pauseAfter: 0.7,
    },
    {
      id: "next",
      text: "And the mean's shape? It holds a surprise... even when the data is lopsided.",
    },
  ],
};
