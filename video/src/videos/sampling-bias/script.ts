import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Bigger and biased is still biased" (16:9), after
 * content/courses/statistics-for-data-science-python/sampling-and-bias.mdx:
 * "Why the sampling method is everything", "The bad one: convenience
 * sampling", "The punchline: a bigger biased sample does not help" (where it
 * is embedded) and "Bias vs. variance: the central distinction".
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts, measured by measure.py (python 3.13, numpy 2.5.3) into
 * measurements.json, which data.ts reads. The population is the lesson's first
 * code block: 200,000 scores from Normal(70, 12) clipped to 0..100, seed 42,
 * with that block's own samples of 500. Its printed output, and that of the
 * lesson's other two blocks, comes out exactly as the site records it.
 *   - the true average is 69.97, "seventy";
 *   - the random sample of 500 averages 69.64, "sixty-nine point six";
 *   - the lesson's weights are 1.1 above 75 and 0.1 below, so a happy
 *     customer is "eleven times as likely to be picked";
 *   - the convenience sample averages 80.52, "eighty and a half", 10.55
 *     points high, "more than ten";
 *   - 100 samples of 500 by each method: 51 random averages above 69.97 and
 *     49 below; every convenience average between 79.04 and 80.95;
 *   - 400 samples by each method at 50 to 20,000: the spread of the averages
 *     falls 22-fold for random and 20-fold for convenience, "about the same
 *     pace"; at 20,000, one in ten of the 200,000, the convenience average is
 *     79.65, 9.69 high, "almost ten points".
 *
 * The 1936 poll:
 *   - "in the neighborhood of 10 million" ballots mailed, "nearly 2.4 million
 *     were returned": D. Lusinchi, "'President' Landon and the 1936 Literary
 *     Digest Poll: Were Automobile and Telephone Owners to Blame?", Social
 *     Science History 36:1 (2012), p. 26;
 *   - respondents leaned to Landon, and Landon's supporters were "much more
 *     likely to return their straw ballots than Roosevelt's" (Lusinchi 2012,
 *     p. 40; P. Squire, "Why the 1936 Literary Digest Poll Failed", Public
 *     Opinion Quarterly 52:1 (1988), pp. 125-133);
 *   - the Digest's final returns, Landon 1,293,669 and Roosevelt 972,897
 *     (Literary Digest, 31 October 1936), give Landon 57.1% and Roosevelt
 *     42.9% of the two, "fifty-seven to forty-three";
 *   - Gallup forecast 55.7% of the two-party vote for Roosevelt (G. Gallup,
 *     The Gallup Poll: Public Opinion 1935-1971, 1972, p. 215, quoted in
 *     Lusinchi 2012, p. 44), from a quota sample built to match the
 *     electorate, "chosen to mirror the voters", and far smaller than the
 *     Digest's (50,000 in most accounts, 125,000 in Robinson 1937);
 *   - Roosevelt took 27,747,636 votes to Landon's 16,679,543, 62.5% of the
 *     two, and 46 of the 48 states, all but Maine and Vermont (Wikipedia,
 *     "1936 United States presidential election"; 62.5 is also Lusinchi's).
 *
 * Written for the ear: short spoken sentences, no symbols or parentheses,
 * numbers as words, contractions, questions the next sentence answers, an
 * ellipsis where a speaker would hold, and two capitalised stresses.
 */
export const script: NarrationScript = {
  id: "sampling-bias",
  voice: "hope",
  leadIn: 0.5,
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    {
      id: "hook",
      text: "Here are two hundred thousand customers, each with a satisfaction score out of a hundred.",
      pauseAfter: 0.3,
    },
    {
      id: "truth",
      text: "Their true average is seventy. But say you can only ask five hundred of them.",
      pauseAfter: 0.35,
    },
    { id: "question", text: "Does it matter WHICH five hundred?", pauseAfter: 1.1 },
    {
      id: "random",
      text: "Pick them at random, and their average comes out at sixty-nine point six. A little low... but close.",
      pauseAfter: 0.6,
    },
    {
      id: "easy",
      text: "Now take the five hundred who are easiest to reach. Happy customers answer surveys, so say anyone above seventy-five is eleven times as likely to be picked.",
      pauseAfter: 0.3,
    },
    { id: "high", text: "This sample averages eighty and a half. That's more than ten points too high.", pauseAfter: 0.6 },
    {
      id: "again",
      scene: true,
      text: "Was that just bad luck? Draw again... and again, a hundred times each.",
      pauseAfter: 0.3,
    },
    {
      id: "both",
      text: "The random averages land on both sides of seventy, about half above and half below.",
      pauseAfter: 0.25,
    },
    { id: "every", text: "The easy ones land near eighty, every single time.", pauseAfter: 0.45 },
    { id: "name", text: "A miss that always points the same way has a name. It's bias.", pauseAfter: 0.6 },
    {
      id: "bigger",
      scene: true,
      text: "So here's the obvious fix. Ask more people. Grow both samples from fifty customers to twenty thousand.",
      pauseAfter: 0.3,
    },
    { id: "steadier", text: "Both get steadier as they grow, and at about the same pace.", pauseAfter: 0.3 },
    { id: "closing", text: "But only the random one is closing in on seventy.", pauseAfter: 0.25 },
    {
      id: "wrong",
      text: "The easy sample just becomes a sharper and sharper estimate of the WRONG number.",
      pauseAfter: 0.35,
    },
    {
      id: "steady",
      text: "At twenty thousand, one customer in ten, it's rock steady... and still almost ten points high.",
      pauseAfter: 0.6,
    },
    {
      id: "digest",
      scene: true,
      text: "This went wrong for real in nineteen thirty-six. The Literary Digest mailed out ten million ballots for the presidential race.",
      pauseAfter: 0.3,
    },
    {
      id: "back",
      text: "Nearly two point four million came back. A huge sample... but the people who chose to reply leaned toward the challenger, Alf Landon.",
      pauseAfter: 0.35,
    },
    { id: "call", text: "So the Digest called it for Landon, fifty-seven to forty-three.", pauseAfter: 0.35 },
    {
      id: "gallup",
      text: "George Gallup asked far fewer people, chosen to mirror the voters, and put Roosevelt on fifty-six.",
      pauseAfter: 0.35,
    },
    { id: "result", text: "Roosevelt got sixty-two and a half, and won every state but two.", pauseAfter: 0.45 },
    { id: "lesson", text: "Two point four million answers couldn't fix who was answering.", pauseAfter: 0.6 },
    { id: "two", scene: true, text: "So every estimate can miss in two ways.", pauseAfter: 0.3 },
    { id: "variance", text: "Variance is the scatter from one sample to the next.", pauseAfter: 0.7 },
    { id: "squeeze", text: "More data shrinks it.", pauseAfter: 0.9 },
    {
      id: "bias",
      text: "Bias is where the scatter is centered, and more data leaves it right where it was.",
      pauseAfter: 0.8,
    },
    { id: "method", text: "Only a better method moves the center.", pauseAfter: 0.7 },
    {
      id: "next",
      text: "And some data is biased before you ever sample it... because it only kept what survived.",
    },
  ],
};
