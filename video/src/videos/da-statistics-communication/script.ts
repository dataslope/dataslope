import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Statistics & communication" (16:9), Part 3 of the Data
 * Analyst interview prep videos
 * (agent-outputs/20261021-2314-data-analyst-interview-video-plan.md), after
 * content/interview/data-analyst/statistics-and-communication.mdx. It answers
 * the fourteen questions the plan gives this page: ten that hide a trap,
 * numbered aloud, then a rapid-fire round of four (numbered 11 to 14 on
 * screen only). The page's testing, chart, dashboard and spreadsheet
 * questions are answered in the videos of the pages that own them.
 *
 *   1. the median instead of the mean ("median").
 *   2. correlation and causation ("corr"); 3. correlation and the
 *      correlation coefficient ("coef").
 *   4. sampling bias ("bias").
 *   5. a metric up 20% week over week ("metric").
 *   6. percentiles and quartiles; 7. outliers ("quantile").
 *   8. presenting to a non-technical stakeholder; 9. explaining a finding in
 *      plain language; 10. communicating uncertainty ("present").
 *   Rapid fire ("rapid-in"): variance and standard deviation; the mode; the
 *   normal distribution; population and sample.
 *
 * No series intro yet (decided 2026-10-21), as in Parts 1 and 2: the first
 * scene opens at frame 0, and adding the intro later needs no re-voicing.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every number ran in Pyodide 314.0.7 with pandas 3.0.2 and NumPy (the
 * runtime the page's blocks run in), by check.mjs into results.json, which
 * data.ts reads. Random data is drawn from seeded generators:
 *   - "median", the video's own 500 orders (lognormal, seed 7): median 23.11,
 *     mean 26.58, 181 orders above the mean, the largest 112.41.
 *   - "corr", the video's own 200 days after the page's example (seed 11):
 *     ice cream and drownings r = 0.57; temperature and each, 0.88 and 0.61;
 *     ice cream and drownings with temperature held fixed (the correlation of
 *     the two residuals after a straight-line fit on temperature), 0.08.
 *   - "coef", 41 points from -3 to 3: y = x² has Pearson r = 0.00 (Spearman
 *     -0.01); y = eˣ has r = 0.81 and Spearman 1.00.
 *   - "bias", the video's own 100,000 users (seed 21): average satisfaction
 *     5.98; 22.6% churned, the unhappiest likeliest to; those who stayed
 *     average 6.56; thirty surveys of 20 stayers range 5.84 to 7.43, of 2,000
 *     range 6.50 to 6.64.
 *   - "metric", the video's own two weeks: 10,000 sessions and 300 orders,
 *     then 8,000 and 288; conversion 3.0% to 3.6%, up 20%; orders down 4%,
 *     sessions down 20%.
 *   - "quantile", the page's thirteen amounts: Q1 10, median 12, Q3 13, IQR
 *     3; the 90th percentile interpolates between 14 and 190 to 154.8; the
 *     fences are 5.5 and 17.5 and catch 200 and 190; the mean is 39.5 and
 *     the standard deviation 69.1, so 200 is 2.32 standard deviations out
 *     and 190 is 2.18; a cutoff of 2 flags both, a cutoff of 3 flags none.
 *   - "present": the page's own example, 12% more likely to buy, the lift
 *     between 8% and 16%, and 12.37% as false precision.
 *   - rapid fire: the page's 10 to 50 (variance 250, standard deviation 15.81,
 *     ddof 1); the video's own tickets (billing three times); 100,000 normal
 *     draws (68.1%, 95.5% and 99.7% within one, two and three standard
 *     deviations); a population of 10,000 with mean 50.2 and three samples of
 *     50 averaging 52.1, 51.8 and 51.1.
 *
 * Written for Drew's ear, as in Parts 1 and 2. Numbers are written as they
 * are said; "I Q R" is spelled for the interquartile range, and "Q one" and
 * "Q three" for the quartiles.
 */
export const script: NarrationScript = {
  id: "da-statistics-communication",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Sooner or later, the interviewer stops asking for code. They hand you a number and ask what it means, and then how you'd explain it to someone who has never written a query. There are fourteen questions to be ready for.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "Ten of them hide a trap, so we'll take those slowly. The other four get one answer each, in a rapid-fire round.",
      pauseAfter: 0.7,
    },
    { id: "median-in", text: "The first is about the number every report leads with." },

    // ── 1. Median and mean ────────────────────────────────────────────────
    {
      id: "median",
      scene: true,
      text: "Question one. When would you report the median instead of the mean?",
      pauseAfter: 0.6,
    },
    {
      id: "median-skew",
      text: "When the data is skewed. Here are five hundred orders. Most are small, and a long tail runs out past a hundred dollars.",
      pauseAfter: 0.7,
    },
    {
      id: "median-pull",
      text: "The median order is twenty-three eleven. The mean is twenty-six fifty-eight, dragged to the right by the tail. Only a hundred and eighty-one of the five hundred orders are above it.",
      pauseAfter: 0.8,
    },
    {
      id: "median-both",
      text: "Income, house prices and session lengths all look like this. Report the median as the typical value, and both when the gap between them is the story.",
      pauseAfter: 0.7,
    },
    { id: "corr-in", text: "Next, two numbers that move together." },

    // ── 2. Correlation and causation ──────────────────────────────────────
    {
      id: "corr",
      scene: true,
      text: "Question two. Explain correlation does not imply causation, with an example.",
      pauseAfter: 0.6,
    },
    {
      id: "corr-ice",
      text: "Two hundred days. On days when more ice cream sells, more people drown. The correlation is point five seven.",
      pauseAfter: 0.7,
    },
    {
      id: "corr-heat",
      text: "Ice cream doesn't cause drowning. Hot weather drives both: more people buy ice cream, and more people swim. The hot days sit together, top right. Temperature is the confounder.",
      pauseAfter: 0.8,
    },
    {
      id: "corr-fixed",
      text: "Hold temperature fixed, and the link all but vanishes: point zero eight. To argue a cause, you need an experiment, like an A B test, or a careful causal design.",
      pauseAfter: 0.7,
    },

    // ── 3. The correlation coefficient ────────────────────────────────────
    {
      id: "coef",
      scene: true,
      text: "Question three. What's the difference between correlation and the correlation coefficient?",
      pauseAfter: 0.6,
    },
    {
      id: "coef-r",
      text: "Correlation is the idea: two things moving together. The coefficient is a number for it. Pearson's r measures how close the points lie to a straight line, from minus one to one.",
      pauseAfter: 0.7,
    },
    {
      id: "coef-u",
      text: "So it can miss a pattern you can see. A perfect U scores zero.",
      pauseAfter: 0.7,
    },
    {
      id: "coef-curve",
      text: "And a curve that only ever rises scores point eight one. Spearman ranks the values first, and gives it a perfect one. Use it when the relationship is monotonic but not straight, or when the data is ordinal.",
      pauseAfter: 0.7,
    },
    { id: "bias-in", text: "Then, where the data came from." },

    // ── 4. Sampling bias ──────────────────────────────────────────────────
    {
      id: "bias",
      scene: true,
      text: "Question four. What is sampling bias, and how can it distort results?",
      pauseAfter: 0.6,
    },
    {
      id: "bias-who",
      text: "Say you survey your app's users about how happy they are. You've left out everyone who already left: here, nearly a quarter of them, and the unhappiest. That's survivorship bias. A web poll that only hears from the keenest is self-selection.",
      pauseAfter: 0.8,
    },
    {
      id: "bias-truth",
      text: "Across all hundred thousand users, the average score is five point nine eight. Among the ones who stayed, it's six point five six.",
      pauseAfter: 0.7,
    },
    {
      id: "bias-bigger",
      text: "Survey twenty of them, thirty times over, and the answers scatter. Survey two thousand, and they settle, on six point five six. A bigger sample shrinks the noise. It does nothing about the bias. The fix is the design: a random or stratified sample of everyone.",
      pauseAfter: 0.7,
    },
    { id: "metric-in", text: "The next one is the classic open question." },

    // ── 5. A metric up 20% ────────────────────────────────────────────────
    {
      id: "metric",
      scene: true,
      text: "Question five. A metric went up twenty percent week over week. How do you investigate?",
      pauseAfter: 0.6,
    },
    {
      id: "metric-steps",
      text: "State your assumptions, then take it apart. Is it real, or a tracking change, bot traffic, or a deploy? Which region, platform or cohort moved? Is it the day of the week, or the season?",
      pauseAfter: 0.8,
    },
    {
      id: "metric-denom",
      text: "And did the denominator move? Here, conversion went from three percent to three point six: up twenty percent. But orders fell four percent. Sessions fell twenty. The rate rose because the traffic dropped.",
      pauseAfter: 0.8,
    },
    {
      id: "metric-end",
      text: "Finish with the most likely driver, and what you'd check next.",
      pauseAfter: 0.7,
    },
    { id: "quantile-in", text: "Two questions about the edges of the data." },

    // ── 6, 7. Percentiles, quartiles and outliers ─────────────────────────
    {
      id: "quantile",
      scene: true,
      text: "Question six. What are percentiles and quartiles?",
      pauseAfter: 0.6,
    },
    {
      id: "quantile-def",
      text: "A percentile is a cut. The ninetieth percentile is the value with about ninety percent of the data at or below it. Quartiles cut at twenty-five, fifty and seventy-five.",
      pauseAfter: 0.7,
    },
    {
      id: "quantile-cuts",
      text: "Here are thirteen amounts, in order. Q one is ten, the median twelve, Q three thirteen. Between them, the I Q R: three.",
      pauseAfter: 0.7,
    },
    {
      id: "quantile-p90",
      text: "The ninetieth percentile is a hundred fifty-four point eight, an amount nobody spent. Pandas interpolates between fourteen and one ninety. Other tools use other rules, so exact answers can differ.",
      pauseAfter: 0.8,
    },
    {
      id: "outlier",
      text: "Question seven. How do you identify outliers?",
      pauseAfter: 0.6,
    },
    {
      id: "outlier-iqr",
      text: "The I Q R rule puts a fence one and a half I Q Rs past each quartile: here, at five and a half and seventeen and a half. Two hundred and one ninety are outside.",
      pauseAfter: 0.7,
    },
    {
      id: "outlier-z",
      text: "A z-score counts standard deviations from the mean. But those two drag the mean up to thirty-nine and a half, and the standard deviation to sixty-nine. So two hundred is only two point three two out.",
      pauseAfter: 0.7,
    },
    {
      id: "outlier-mask",
      text: "With a cutoff of two, both are caught. With three, nothing is: the outliers hide themselves.",
      pauseAfter: 0.7,
    },
    {
      id: "outlier-look",
      text: "Either way, look before you delete. An outlier can be a typo, or the most important row you have.",
      pauseAfter: 0.7,
    },
    { id: "present-in", text: "The last three are about saying it out loud." },

    // ── 8, 9, 10. Presenting, explaining, and uncertainty ─────────────────
    {
      id: "present",
      scene: true,
      text: "Question eight. How do you present a finding to a non-technical stakeholder?",
      pauseAfter: 0.6,
    },
    {
      id: "present-lead",
      text: "Lead with the answer and what it means for the business, not the method. Put the takeaway in the title, and show one clear chart rather than a table.",
      pauseAfter: 0.7,
    },
    {
      id: "present-close",
      text: "Say the caveats plainly, like this excludes refunds. End with what you recommend. The method goes in the appendix.",
      pauseAfter: 0.8,
    },
    {
      id: "plain",
      text: "Question nine. How do you explain a complex statistical finding in plain language? Anchor it to one number people can picture: customers who saw the new design were twelve percent more likely to buy.",
      pauseAfter: 0.6,
    },
    {
      id: "plain-jargon",
      text: "Drop the jargon. Instead of a ninety-five percent confidence interval, say we're highly confident the true lift is between eight and sixteen percent. Then tie it to the decision it informs.",
      pauseAfter: 0.8,
    },
    {
      id: "uncertain",
      text: "Question ten. How do you communicate uncertainty? Say what the number rests on, like the last ninety days. Give a range, not just a point. Name the assumptions, and how far the answer moves if they're wrong.",
      pauseAfter: 0.7,
    },
    {
      id: "uncertain-precise",
      text: "And don't be falsely precise. Twelve point three seven percent is about twelve, when the range runs from eight to sixteen.",
      pauseAfter: 0.7,
    },

    // ── Rapid fire ────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "That's the ten traps. Now, four questions, one answer each.",
      pauseAfter: 0.6,
    },
    {
      id: "r-var",
      text: "Variance is the average squared distance from the mean. Standard deviation is its square root, back in the data's own units. Ten to fifty gives two fifty and fifteen point eight one. Pandas divides by n minus one.",
    },
    {
      id: "r-mode",
      text: "The mode is the most common value, and the center that works for categories: the most common ticket is billing. Two modes are a reason to split the data.",
    },
    {
      id: "r-normal",
      text: "A normal distribution is a symmetric bell, set by its mean and standard deviation. Sixty-eight percent falls within one standard deviation, ninety-five within two, ninety-nine point seven within three.",
    },
    {
      id: "r-pop",
      text: "And the population is everyone you care about. A sample is the part you measured, and its mean is only an estimate. Three samples of fifty give fifty-two point one, fifty-one point eight and fifty-one point one. The population's mean is fifty point two.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "Back to SQL, for the questions that turn a good screen into a great one: rankings, running totals, and the latest row per customer. Next: advanced SQL.",
    },
  ],
};
