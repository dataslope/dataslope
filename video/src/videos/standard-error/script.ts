import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Standard error and the square-root-of-n law" (16:9), after
 * content/courses/statistics-for-data-science-python/standard-error.mdx, all
 * of it, in its order: standard deviation against standard error, both
 * computed on one sample, the one-sample estimate checked against ten
 * thousand samples, the square-root law, and the standard error as the ruler
 * intervals and tests are built from. It is embedded at "Standard deviation
 * vs. standard error". Unit 5's earlier videos end where this one starts:
 * SamplingDistributions names the sampling distribution's width "the
 * standard error", and CentralLimitTheorem ends on "four times the data
 * halves it", so here that law is what precision costs, not the reveal.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts, every one from re-running the lesson's own code blocks with their own
 * seeds (measure.py, numpy 2.5 and scipy 1.18; measurements.json is its
 * output, and the page's prepopulated outputs print the same numbers):
 *   - 200 ages, normal(41, 12), seed 42: standard deviation 10.58 ("about ten
 *     and a half years"), standard error 10.58 / root 200 = 10.58 / 14.14 =
 *     0.75 ("less than a year"); the ages run from 15 to 76 ("over decades");
 *   - other samples of 200 from the same population have different averages
 *     (the six on screen run from 40.18 to 41.24), "it moves";
 *   - a population of a million, mean 100 and spread 25, seed 7: the means of
 *     10,000 samples of 50 have a standard deviation of 3.504 ("three point
 *     five"), and one sample's s / root 50 is 25.97 / 7.07 = 3.673 ("three
 *     point seven"); the lesson calls that s "your estimate of sigma", which
 *     is the "standing in for the population's" of the beat "divide";
 *   - spread 20: the standard error is 20 / root n, so 2 at n = 100, 1 at 400,
 *     0.5 at 1,600, and 0.2 (a tenth of 2) at 10,000, a hundred times 100;
 *   - 120 conversion times, normal(8, 2.5), seed 0: mean 8.203 s, standard
 *     error 0.219 ("zero point two two"), and the lesson's rough interval,
 *     mean plus or minus 1.96 standard errors ("about two"), is 7.774 to
 *     8.632 ("seven point eight to eight point six"); the value the test
 *     on screen tries, 8 s (the lesson draws its sample around it), is
 *     (8.203 - 8) / 0.219 = 0.93 standard errors away, "less than one".
 *
 * The lesson's prose under its first block says the SD comes out "around 12"
 * and the SE "around 0.85"; its code prints 10.58 and 0.75, which is what the
 * page shows and what this video uses.
 *
 * Written for the ear, for a voice that reads it in one take: short spoken
 * sentences, no symbols, no parentheses, numbers as words, contractions, a
 * question the next sentence answers, an ellipsis where a speaker would hold,
 * one capitalised stress and one [curious] tag. The voice is left to the lead.
 */
export const script: NarrationScript = {
  id: "standard-error",
  voice: "hope",
  leadIn: 0.5,
  minPause: COURSE_MIN_PAUSE,
  tail: 2.4,
  beats: [
    {
      id: "hook",
      text: "The standard deviation and the standard error get mixed up all the time. Both measure a spread... just not of the same thing.",
      pauseAfter: 0.45,
    },
    {
      id: "sd",
      text: "Take two hundred customers' ages. Their standard deviation is the spread of the data: about ten and a half years.",
      pauseAfter: 0.45,
    },
    {
      id: "move",
      text: "But their average came from one sample. Ask two hundred different people... and it moves.",
      pauseAfter: 0.35,
    },
    {
      id: "se",
      text: "How far it moves is the standard error: the spread of the estimate, the width of its sampling distribution.",
      pauseAfter: 0.5,
    },
    {
      id: "one",
      scene: true,
      text: "[curious] So how can you measure that, when you've only ever seen one average?",
      pauseAfter: 0.35,
    },
    {
      id: "divide",
      // The sample's s stands in for the population's sigma, which is never
      // seen: that is what makes the one-sample shortcut work.
      text: "Divide the sample's standard deviation, standing in for the population's, by the square root of the sample size.",
      pauseAfter: 0.35,
    },
    {
      id: "numbers",
      text: "Ten point five eight, over the square root of two hundred, gives zero point seven five.",
      pauseAfter: 0.45,
    },
    {
      id: "contrast",
      text: "The ages spread over decades. Their average wobbles by less than a year.",
      pauseAfter: 0.5,
    },
    {
      id: "check",
      scene: true,
      text: "That's a bold claim from one sample, so let's check it.",
      pauseAfter: 0.3,
    },
    {
      id: "pop",
      text: "Here's a population with a spread of twenty-five. Draw fifty values, and average them.",
      pauseAfter: 0.3,
    },
    { id: "repeat", text: "Then do it again... ten thousand times.", pauseAfter: 0.2 },
    { id: "pile", text: "The averages pile up, with a spread of three point five.", pauseAfter: 0.4 },
    {
      id: "match",
      text: "From one sample, the shortcut said three point seven. Close, without repeating anything.",
      pauseAfter: 0.5,
    },
    { id: "cost", scene: true, text: "Now, what does that square root cost?", pauseAfter: 0.3 },
    {
      id: "curve",
      text: "When data spreads by twenty, a hundred people give a standard error of two.",
      pauseAfter: 0.3,
    },
    { id: "four", text: "Halving it takes four hundred. Halving it again, sixteen hundred.", pauseAfter: 0.45 },
    {
      id: "hundred",
      text: "A tenth of the error takes a HUNDRED times the data. Precision gets expensive, fast.",
      pauseAfter: 0.5,
    },
    {
      id: "ruler",
      scene: true,
      text: "So why does this number matter so much? It's the ruler the rest of inference measures with.",
      pauseAfter: 0.35,
    },
    {
      id: "times",
      text: "A hundred and twenty conversion times average eight point two seconds, with a standard error of zero point two two.",
      pauseAfter: 0.9,
    },
    {
      id: "interval",
      text: "Step about two standard errors either way, and you get seven point eight to eight point six. That's a confidence interval.",
      pauseAfter: 0.9,
    },
    {
      id: "test",
      text: "And a test counts how many standard errors an estimate sits from the value it's testing.",
      pauseAfter: 0.55,
    },
    // Voiced on its own after the take: the tested value on screen, spoken.
    { id: "eight", text: "Test eight seconds, and it's less than one standard error away.", pauseAfter: 1.0 },
    { id: "next", text: "Next, we'll build that interval properly." },
  ],
};
