import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";
import { INTRO_LEAD_IN } from "../../editorial/intro.ts";

/**
 * Narration for "Thinking statistically" (16:9), Unit 1 of the Statistics
 * course, the course's first video. It merges the plan's three Unit 1 videos
 * into one argument in three parts, each leading into the next:
 *
 *   1. Signal and noise (beats "hook" to "slice"), after
 *      why-statistics-matters.mdx and statistical-thinking.mdx: random
 *      variation makes gaps and trends out of nothing, and what you see is a
 *      process's signal plus noise. It ends on the numbers being a slice of
 *      something bigger.
 *   2. Population and sample ("survey" to "kind"), after
 *      populations-and-samples.mdx: population and sample, parameter and
 *      statistic, and a statistic as a random variable. It stops short of how
 *      the wobble shrinks with n, which Unit 5 teaches, and ends on needing to
 *      know what kind of number you hold.
 *   3. What kind of data ("flavors" to "next"), after types-of-data.mdx: the
 *      flavor codes, categorical and numerical, the zip-code trap, and type
 *      deciding the summary and the test. It ends on Unit 2's first question,
 *      mean against median.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every number is the output of the lessons' own code blocks, re-run
 * with their seeds by measure.py (python 3.13, numpy 2.5.3, pandas 3.0.5) into
 * measurements.json, which data.ts reads.
 *   - why-statistics-matters, "Why randomness matters" (seed 0): two groups
 *     of forty from Normal(50, 10); the first draw has B ahead by 3.62, "more
 *     than three and a half points"; the next four have A ahead by 1.72, 2.12,
 *     2.96 and 1.08, "one point seven", then "about two, three and one".
 *   - statistical-thinking, "Signal vs. noise" (seed 3): 24 months of
 *     100 + Normal(0, 8); the last six months go from 107.7 to 96.0, the
 *     lesson's printed "-11.7", "almost twelve points".
 *   - why-statistics-matters, "Why uncertainty exists": "You surveyed 500 of
 *     300,000 customers", one in 600.
 *   - populations-and-samples, "Seeing it in code" (seed 42): a sample of
 *     fifty from Normal(100, 15) has mean 101.37, "a hundred and one point
 *     four". The twenty rows are that sample and the first nineteen of the
 *     "A statistic is a random variable" block (seed 7), same population.
 *   - types-of-data: the opening's 1 = vanilla, 2 = chocolate,
 *     3 = strawberry and its mean of 1.8, from ten answers of the video's own
 *     (five vanilla, two chocolate, three strawberry), whose mode is vanilla;
 *     the "Encoding traps" block's four zip codes, stored by pandas as int64,
 *     with mean 48,755.25, "forty-eight thousand, seven hundred and
 *     fifty-five"; its $42.50 price doubled is $85.00. On screen only:
 *     that frame's price median, $14.12, beside its mean of $18.93, and the
 *     ordered-categorical block's plan sizes, S/L/M/M/L/S/M, median M.
 *   - The claims without a number are the lessons' own: nominal data has no
 *     order and ordinal data has uneven gaps; a dtype is storage, not
 *     meaning; labels get counts and the mode, ranks a median, quantities a
 *     mean; two categorical variables call for a chi-square test and a
 *     numerical outcome across two groups for a t-test ("Why type also
 *     decides which tests are valid"). The population as "every checkout a
 *     design will ever see" is populations-and-samples' "all checkout sessions
 *     this flow could ever produce".
 *   - There are no historical or real-world claims to source: every example
 *     is one of the lessons' own, and every number is one of their outputs.
 *
 * Written for the ear: short spoken sentences, no symbols or parentheses,
 * numbers as words, contractions, questions the next sentence answers, an
 * ellipsis where a speaker would hold, and two capitalised stresses. No voice
 * is set: the course's narrator is chosen when it is recorded.
 */
export const script: NarrationScript = {
  id: "thinking-statistically",
  voice: "hope",
  // The series intro plays first; its lead-in lives in editorial/intro.ts.
  leadIn: INTRO_LEAD_IN,
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Part 1. Signal and noise ──────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Here are two groups of forty people, and group B scores more than three and a half points higher.",
      pauseAfter: 0.3,
    },
    { id: "better", text: "So is B better?", pauseAfter: 0.9 },
    {
      id: "same",
      text: "Here's the catch. Both groups came from the SAME process. There's no real difference at all.",
      pauseAfter: 0.45,
    },
    {
      id: "again",
      text: "So draw both groups again... and this time, A comes out ahead, by one point seven.",
      pauseAfter: 0.3,
    },
    { id: "more", text: "Again, and again. By about two, then three, then one.", pauseAfter: 0.45 },
    {
      id: "free",
      text: "Five draws, and the gap is never zero. Randomness makes differences for free.",
      pauseAfter: 0.4,
    },
    { id: "luck", text: "So before you believe any gap, ask one question... could this just be luck?" },
    { id: "trend-in", text: "And it isn't only gaps between groups." },
    {
      id: "trend",
      scene: true,
      text: "Noise makes trends, too. Here are two years of a monthly metric.",
      pauseAfter: 0.3,
    },
    {
      id: "fell",
      text: "Over the last six months, it fell almost twelve points. Something must have happened... right?",
      pauseAfter: 0.6,
    },
    {
      id: "flat",
      text: "Nothing did. Every month is a hundred, plus random noise. The trend was never there.",
      pauseAfter: 0.6,
    },
    {
      id: "process",
      text: "Behind every dataset is a process like this one. Customers deciding, machines running, demand rising and falling.",
      pauseAfter: 0.7,
    },
    {
      id: "output",
      text: "You never see the process itself. You only see what comes out of it... signal, plus noise.",
      pauseAfter: 0.7,
    },
    {
      id: "signal",
      text: "The signal is the stable part, here that flat hundred. The noise is everything that wobbles around it.",
      pauseAfter: 0.7,
    },
    { id: "job", text: "Statistics is how you find the signal through the noise.", pauseAfter: 0.7 },
    { id: "slice", text: "And the numbers you get are only ever a slice... of something much bigger." },

    // ── Part 2. Population and sample ─────────────────────────────────────
    {
      id: "survey",
      scene: true,
      text: "Say you survey five hundred of your three hundred thousand customers.",
      pauseAfter: 0.3,
    },
    {
      id: "exact",
      text: "That tells you exactly what those five hundred said. But your question is about all three hundred thousand.",
      pauseAfter: 0.4,
    },
    {
      id: "names",
      text: "Everyone you care about is the population. The part you saw is the sample... here, one customer in six hundred.",
      pauseAfter: 0.45,
    },
    {
      id: "list",
      text: "And often, the population isn't even a list. It's every checkout a design will ever see, and most of them haven't happened yet.",
    },
    { id: "parameter-in", text: "So it helps to name the numbers on each side." },
    {
      id: "parameter",
      scene: true,
      text: "A number that describes the population is a parameter. It's fixed... but you can't see it.",
      pauseAfter: 0.7,
    },
    {
      id: "statistic",
      text: "A number you compute from the sample is a statistic. You can see it, but it moves.",
      pauseAfter: 0.7,
    },
    {
      id: "letters",
      text: "Parameters get Greek letters, like mu for a mean. Statistics get Latin ones, like x-bar.",
      pauseAfter: 0.6,
    },
    {
      id: "cheat",
      text: "In code, we can cheat and know the truth. Build a population with a mean of a hundred, and sample fifty.",
      pauseAfter: 0.35,
    },
    { id: "miss", text: "Their average is a hundred and one point four. Close, but not on it.", pauseAfter: 0.35 },
    // The lesson's name for the miss, said as the screen shows it.
    { id: "price", text: "That miss, the estimation error, isn't a mistake. It's the price of seeing only part." },
    { id: "twenty-in", text: "So how big is that miss, usually? One sample can't tell you." },
    {
      id: "twenty",
      scene: true,
      text: "Now draw fifty more, and fifty more. Twenty samples give twenty different answers.",
      pauseAfter: 0.4,
    },
    { id: "moves", text: "The parameter never moved. Only the statistic did.", pauseAfter: 0.4 },
    {
      id: "variable",
      text: "That makes a statistic a random variable, with a center and a spread of its own.",
      pauseAfter: 0.7,
    },
    {
      id: "points",
      text: "So think in distributions, not points. Any one average is a single draw from that spread.",
      pauseAfter: 0.7,
    },
    {
      id: "kind",
      text: "But before you summarize a sample at all... you need to know what KIND of number you're holding.",
      // Part 3 turns here: a breath before the bridge into it.
      pauseAfter: 0.8,
    },
    { id: "flavors-in", text: "Here's what goes wrong when you don't." },

    // ── Part 3. What kind of data ─────────────────────────────────────────
    {
      id: "flavors",
      scene: true,
      text: "Take a survey that stores favorite ice cream flavors as numbers. One is vanilla, two is chocolate, three is strawberry.",
      pauseAfter: 0.35,
    },
    { id: "average", text: "Ten people answer. Average the column, and you get one point eight.", pauseAfter: 0.6 },
    {
      id: "none",
      text: "There is no flavor one point eight. The math ran fine... but those numbers were labels, not quantities.",
      pauseAfter: 0.4,
    },
    { id: "mode", text: "The honest summary is the most common answer. Vanilla." },
    { id: "kinds-in", text: "The computer couldn't tell a label from a quantity. That part is up to you." },
    {
      id: "kinds",
      scene: true,
      text: "So every column is one of two kinds. Categorical data says which group. Numerical data says how much, or how many.",
      pauseAfter: 0.4,
    },
    {
      id: "labels",
      text: "Labels split again. Nominal ones have no order, like countries. Ordinal ones do, like shirt sizes, but the gaps between them can be uneven.",
      pauseAfter: 0.4,
    },
    // The leaves' names, discrete and continuous, said as they appear.
    {
      id: "numbers",
      text: "Numbers split into discrete counts, like logins, and continuous measurements, like price.",
    },
    { id: "trap-in", text: "Most columns tell you plainly which kind they are. A few don't." },
    {
      id: "trap",
      scene: true,
      text: "The dangerous columns look numerical, but aren't. Take four zip codes.",
      pauseAfter: 0.3,
    },
    {
      id: "pandas",
      text: "pandas stores them as integers, and averages them without a word. Forty-eight thousand, seven hundred and fifty-five.",
      pauseAfter: 0.45,
    },
    { id: "place", text: "That isn't a place. It's the average of four labels.", pauseAfter: 0.45 },
    {
      id: "double",
      text: "One test catches it. Would doubling the value mean anything? Double a price, and it costs twice as much. Double a zip code... and you get nonsense.",
      pauseAfter: 0.4,
    },
    { id: "dtype", text: "The data type only says how a number is stored. What it means is your call." },
    {
      id: "decides",
      scene: true,
      text: "And that call decides what you're allowed to do. Labels get counts and the most common value. Ranks get a median. Quantities get a mean.",
      pauseAfter: 0.4,
    },
    {
      id: "tests",
      text: "Later, it picks the test, too. Two categorical columns call for a chi-square test. A number compared across two groups, a t-test.",
      pauseAfter: 0.7,
    },
    {
      id: "next",
      text: "And even a real quantity can mislead. Is its average the typical value? Not always... skew can pull it off center.",
    },
  ],
};
