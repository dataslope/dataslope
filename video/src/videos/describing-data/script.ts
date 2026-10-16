import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "Describing data" (16:9), Unit 2 of the Statistics course.
 * The plan's four Unit 2 videos as one argument in four parts, each part a
 * take of its own (`take: true` on its first beat):
 *
 *   1. Mean and median ("hook" to "spread-in"), after measures-of-center.mdx:
 *      the CEO who walks into a small company, the mean as a balance point,
 *      skew pulling it up a tail, and which center to use when. It opens on
 *      Unit 1's closing question, whether an average is the typical value.
 *   2. Spread ("delivery" to "shape-in"), after measures-of-spread.mdx: two
 *      services with one average, variance and standard deviation, why the
 *      divisor is n minus one, and the IQR and MAD that one wild value
 *      cannot move.
 *   3. Shape, tails and outliers ("shape" to "plot-in"), after
 *      shape-and-outliers.mdx: skew named for its tail, two peaks as two
 *      groups, heavy tails, and an outlier as a question rather than a
 *      verdict.
 *   4. Always plot first ("dino" to "next"), after visualizing-distributions
 *      .mdx and the "Trusting a summary without looking" section of
 *      statistical-fallacies.mdx: the Datasaurus Dozen, the bin trap, and
 *      which plot when. It ends on Unit 3's question, what a probability is.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every number is the output of the lessons' own code blocks (or, where
 * named, their own chart specs), re-run with their seeds by measure.py
 * (python 3.13, numpy 2.5.3, pandas 3.0.5, scipy 1.18.1) into
 * measurements.json, which data.ts reads.
 *   - measures-of-center, "Where the mean lies": salaries of 42 to 65
 *     thousand have mean 53.7 and median 53.5; with the CEO's 1,000 the mean
 *     is 139.7 and the median 55.0, and 10 of the 11 earn less than the mean.
 *   - measures-of-center, "Putting it together" (seed 7): 500 lognormal
 *     orders, median $23.11, mean $26.58, a gap of $3.47. The when-to-use
 *     rules are the lesson's "When each measure is the right tool".
 *   - measures-of-spread, "Same center, different spread": both services
 *     average 30.0; the steady one runs 28 to 32, the erratic one 5 to 55;
 *     pandas' std (ddof=1) is 1.2 and 17.9. The steady service's deviations
 *     are -2 to 2, sum 0, squares sum to 12, and 12 / 9 is the variance.
 *   - measures-of-spread, the chart bessel-correction.mjs (seed 1234), run in
 *     Node: over 4,000 samples of five from a population of variance 100,
 *     dividing by n averages 80.5, "about twenty percent low", and n minus
 *     one 100.6. Its first sample of five, true mean 0, has squared
 *     distances summing to 404.6 around its own mean and 543.5 around the
 *     truth. The "ddof" block: numpy's default std 7.20, pandas' 7.59.
 *   - measures-of-spread, "IQR" and "MAD": incomes 38 to 120 and 9,000; std
 *     2,828.4, "over two thousand eight hundred"; Q1 44.75, Q3 58.75, IQR
 *     14.0; MAD 8.0.
 *   - shape-and-outliers (seeds 0, 1, 3, 7): mean minus median is -3.0, +0.2
 *     and +3.9 for the left-skewed, symmetric and right-skewed samples; the
 *     two height groups center on 165 and 185 and the mixed mean is 175.0;
 *     beyond 4 SD fall 1 of 20,000 normal draws and 127 of 20,000 from
 *     Student's t with 3 degrees of freedom; on 200 lognormal incomes plus
 *     120 and 200, the 1.5 IQR fences flag 6 points and the z-score rule 2
 *     (the planted pair), so 4 of the 6 are draws from the lognormal's own
 *     tail. "Financial returns, insurance losses, network delays" are the
 *     lesson's examples of heavy tails; error, placeholder and genuine
 *     extreme are its three kinds of outlier, -999 its sentinel.
 *   - statistical-fallacies, "Trusting a summary without looking": the
 *     Datasaurus Dozen from the course's datasets repo, thirteen datasets of
 *     142 points; every mean, SD and correlation agrees across all thirteen
 *     to within 0.01. The dinosaur is Alberto Cairo's; Justin Matejka and
 *     George Fitzmaurice (Autodesk Research, "Same Stats, Different Graphs",
 *     CHI 2017) generated the other twelve from it.
 *   - visualizing-distributions, the chart histogram-bin-width.mjs (seeds 314
 *     and 271), run in Node: one thousand values in bins of 4, 1 and 0.25,
 *     which over its range of 2 to 22 is five, twenty and eighty bins. The
 *     which-plot-when rules are the lesson's "Which plot when?".
 *
 * Written for the ear: short spoken sentences, no symbols or parentheses,
 * numbers as words, contractions, questions the next sentence answers, an
 * ellipsis where a speaker would hold, two capitalised stresses and no audio
 * tag.
 */
export const script: NarrationScript = {
  id: "describing-data",
  voice: "hope",
  // Room for the series intro (SeriesIntro, INTRO_SECONDS) before the first word.
  leadIn: 4.6,
  tail: 2.6,
  // One take per part: Part 2 is just over the default 1,800 characters.
  takeChars: 1900,
  beats: [
    // ── Part 1. Mean and median ──────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "An average is meant to tell you the typical value. So take ten salaries at a small company, from forty-two to sixty-five thousand.",
      pauseAfter: 0.35,
    },
    {
      id: "centers",
      text: "Their mean is fifty-three point seven thousand. Their median, the middle value, is fifty-three and a half. Almost the same.",
      pauseAfter: 0.5,
    },
    { id: "ceo", text: "Now the CEO walks in, earning a million.", pauseAfter: 0.45 },
    {
      id: "jump",
      text: "The mean leaps to a hundred and thirty-nine point seven thousand. The median just moves to fifty-five.",
      pauseAfter: 0.45,
    },
    {
      id: "nobody",
      text: "Ten of the eleven people earn less than the mean. It describes almost nobody in the room.",
      pauseAfter: 0.45,
    },
    {
      id: "balance",
      text: "That's because the mean is a balance point. Put one heavy value far out, and the balance point slides toward it.",
      pauseAfter: 0.35,
    },
    {
      id: "middle",
      text: "The median only asks who's in the middle. It doesn't care how far out the CEO sits.",
      pauseAfter: 0.4,
    },
    { id: "tail-in", text: "And money nearly always has a tail like that." },
    {
      id: "orders",
      scene: true,
      text: "Here are five hundred customer orders. Most are modest, with a long tail stretching off to the right.",
      pauseAfter: 0.35,
    },
    { id: "median", text: "The median order is about twenty-three dollars.", pauseAfter: 0.3 },
    { id: "mean", text: "The mean is twenty-six fifty-eight. The tail drags it up.", pauseAfter: 0.45 },
    {
      id: "alarm",
      text: "So a mean above the median is a free alarm for skew. The wider the gap, the more you should lead with the median.",
      pauseAfter: 0.5,
    },
    { id: "right", text: "Which center is right? That depends on the data.", pauseAfter: 0.35 },
    { id: "symmetric", text: "Symmetric, with no wild values? The mean uses everything, and works well.", pauseAfter: 0.3 },
    {
      id: "skewed",
      text: "Skewed, like incomes, prices and wait times? The median is the honest typical value.",
      pauseAfter: 0.3,
    },
    { id: "categories", text: "Categories? Only the most common one, the mode, makes sense.", pauseAfter: 0.3 },
    { id: "peaks", text: "And two peaks? Then no single center will do.", pauseAfter: 0.5 },
    { id: "spread-in", text: "But even the right center hides how much the values move." },

    // ── Part 2. Spread ───────────────────────────────────────────────────
    {
      id: "delivery",
      scene: true,
      take: true,
      text: "Two delivery services both average thirty minutes.",
      pauseAfter: 0.3,
    },
    {
      id: "swing",
      text: "One always arrives between twenty-eight and thirty-two. The other swings from five minutes to fifty-five.",
      pauseAfter: 0.4,
    },
    { id: "same", text: "Same center, completely different experience. What differs is the spread.", pauseAfter: 0.45 },
    {
      id: "deviations",
      text: "To measure it, take each delivery's distance from the mean. For the steady service, they run from minus two to plus two, and they cancel out to zero.",
      pauseAfter: 0.4,
    },
    { id: "square", text: "So square them first. Now they add up to twelve.", pauseAfter: 0.35 },
    {
      id: "variance",
      text: "Divide by nine, one less than the count, and that's the variance. Its square root, back in minutes, is the standard deviation... about one point two.",
      pauseAfter: 0.4,
    },
    { id: "erratic", text: "For the erratic service, it's almost eighteen." },
    {
      id: "divisor",
      scene: true,
      text: "So why nine, and not ten? Because the distances are measured from the sample's own mean.",
      pauseAfter: 0.3,
    },
    { id: "closest", text: "And that mean sits closer to its own points than any other number does.", pauseAfter: 0.4 },
    {
      id: "truth",
      text: "Here are five values from a population whose true mean is zero. Measure from the truth instead, and the squares grow.",
      pauseAfter: 0.4,
    },
    {
      id: "small",
      text: "So around the sample's mean, the squares run small. Divide by n, and you'd underestimate the spread.",
      pauseAfter: 0.4,
    },
    {
      id: "measured",
      text: "Over four thousand samples of five, dividing by n comes out about twenty percent low. Dividing by n minus one lands on the truth.",
      pauseAfter: 0.45,
    },
    {
      id: "libs",
      text: "That's why numpy and pandas disagree. numpy divides by n unless you ask, and pandas by n minus one.",
      pauseAfter: 0.4,
    },
    { id: "robust-in", text: "Squares have one more weakness. A single wild value can swamp them." },
    {
      id: "incomes",
      scene: true,
      text: "Take ten incomes. Nine fall between thirty-eight and a hundred and twenty. The tenth is nine thousand.",
      pauseAfter: 0.4,
    },
    { id: "sd", text: "The standard deviation leaps to over two thousand eight hundred.", pauseAfter: 0.45 },
    {
      id: "iqr",
      text: "The interquartile range only measures the middle half, from the first quartile to the third. It's fourteen, whatever the top earner makes.",
      pauseAfter: 0.4,
    },
    {
      id: "mad",
      text: "Its cousin, the median absolute deviation, takes the typical distance from the median. Here, eight.",
      pauseAfter: 0.45,
    },
    {
      id: "pair",
      text: "So pair them. A mean goes with a standard deviation, and a median goes with the IQR.",
      pauseAfter: 0.45,
    },
    { id: "shape-in", text: "Still, a center and a spread can't tell you what the data looks like." },

    // ── Part 3. Shape, tails and outliers ────────────────────────────────
    {
      id: "shape",
      scene: true,
      take: true,
      text: "For that, you need its shape. And skew is named for the long tail, not for the peak.",
      pauseAfter: 0.35,
    },
    { id: "right-tail", text: "A tail to the right drags the mean above the median.", pauseAfter: 0.3 },
    {
      id: "left-tail",
      text: "A tail to the left drags it below. Symmetric data keeps the two together.",
      pauseAfter: 0.45,
    },
    {
      id: "two-peaks",
      text: "Two peaks usually mean two groups in one column. Mix the heights of two groups, and the mean lands in the valley between them.",
      pauseAfter: 0.35,
    },
    { id: "neither", text: "It describes neither group.", pauseAfter: 0.5 },
    { id: "tails-in", text: "And the tails matter as much as the middle." },
    {
      id: "tails",
      scene: true,
      text: "Draw twenty thousand values from a normal distribution, and just one lands beyond four standard deviations.",
      pauseAfter: 0.4,
    },
    { id: "heavy", text: "From a heavy-tailed one, a hundred and twenty-seven do.", pauseAfter: 0.45 },
    {
      id: "routine",
      text: "Heavy tails make rare events routine. Financial returns, insurance losses and network delays all live out there.",
      pauseAfter: 0.4,
    },
    { id: "outlier-in", text: "So a value far out isn't automatically a mistake." },
    {
      id: "outlier",
      scene: true,
      text: "An outlier is a value far from the rest. That's all the word means.",
      pauseAfter: 0.35,
    },
    {
      id: "kinds",
      text: "It might be an error, like a typo. It might be a placeholder, like minus nine ninety-nine for missing. Or it might be real... your biggest customer, or a fraud.",
      pauseAfter: 0.45,
    },
    {
      id: "flag",
      text: "Here are two hundred skewed incomes, plus two genuine high earners. The box-plot fences flag six points. The z-score rule flags just two.",
      pauseAfter: 0.4,
    },
    { id: "ordinary", text: "Four of those six are simply the long tail of ordinary incomes.", pauseAfter: 0.45 },
    {
      id: "verdict",
      text: "So a flag is a question, not a verdict. Find out why a point is out there, and then decide.",
      pauseAfter: 0.45,
    },
    { id: "plot-in", text: "And the surest way to find out is to look." },

    // ── Part 4. Always plot first ────────────────────────────────────────
    {
      id: "dino",
      scene: true,
      take: true,
      text: "Here are thirteen datasets. They share their means, their standard deviations and their correlation, to within a hundredth.",
      pauseAfter: 0.45,
    },
    {
      id: "plot",
      text: "Now plot them. One is a dinosaur. Others are a star, a circle, and a set of lines.",
      pauseAfter: 0.45,
    },
    {
      id: "credit",
      text: "Alberto Cairo drew the dinosaur. In twenty seventeen, Justin Matejka and George Fitzmaurice built the other twelve to match its numbers.",
      pauseAfter: 0.4,
    },
    { id: "lossy", text: "A summary is a lossy copy. The plot keeps what it threw away.", pauseAfter: 0.4 },
    { id: "bins-in", text: "But a plot makes choices too." },
    {
      id: "bins",
      scene: true,
      text: "A histogram's bin width is a knob. Here are the SAME thousand values in five bins, then twenty, then eighty.",
      pauseAfter: 0.45,
    },
    {
      id: "wide",
      text: "Wide bins blur the shape into a few blocks. Narrow ones turn every wobble into a peak.",
      pauseAfter: 0.4,
    },
    { id: "believe", text: "Nothing in the data says which to believe. So look at more than one." },
    {
      id: "plots",
      scene: true,
      text: "Which plot, when? For the shape of one variable, a histogram, at a few bin widths.",
      pauseAfter: 0.35,
    },
    {
      id: "ecdf",
      text: "To read off percentiles with nothing to tune, an ECDF: the share of values at or below each point.",
      pauseAfter: 0.4,
    },
    {
      id: "box",
      text: "To compare groups, box plots. But a box only knows its quartiles, so it can't show a second peak.",
      pauseAfter: 0.35,
    },
    { id: "violin", text: "A violin can. It draws the shape the box leaves out.", pauseAfter: 0.45 },
    { id: "habit", text: "Whatever you pick, plot FIRST, and summarize second.", pauseAfter: 0.7 },
    {
      id: "next",
      text: "A summary and a plot describe the data you have. To reason about data you haven't seen, you need probability... starting with what a probability even means.",
    },
  ],
};
