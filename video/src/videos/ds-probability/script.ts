import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Probability" (16:9), Part 2 of the Data Scientist interview
 * prep videos (agent-outputs/20261022-0445-data-scientist-interview-video-plan.md),
 * after content/interview/data-scientist/probability.mdx. It answers the
 * fourteen questions the plan gives this page: twelve worked through with
 * numbers, numbered aloud, then two that take a sentence each (13 and 14, on
 * screen only). The page's Law of Large Numbers and Central Limit Theorem
 * questions are answered in Part 1, Statistics; Part 1's normal, Poisson and
 * binomial questions are answered here, in question 8.
 *
 *   1. conditional probability; 2. Bayes' theorem ("cond").
 *   3. the rare-disease test ("test").
 *   4. independence; 5. independent vs. mutually exclusive ("indep").
 *   6. expectation and variance; 7. linearity of expectation ("expect").
 *   8. the distributions to know ("dist"); 9. memoryless ("memory");
 *   10. Poisson vs. binomial ("pois").
 *   11. Monty Hall ("monty"); 12. the birthday problem ("bday"), which the
 *   opening poses and leaves open.
 *   Quickly ("rapid-in"): covariance vs. correlation; the expected value of a
 *   bet.
 *
 * Written fresh rather than in any Data Analyst part's words (asked for on
 * 2026-10-22): it opens on a puzzle the viewer answers in their head and
 * closes it at question 12, deals the questions as cards, and has its own
 * line into the last two.
 *
 * No series intro yet, as in the Data Analyst videos: the first scene opens
 * at frame 0.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts, all from check.mjs (Pyodide 314.0.7, NumPy 2.4.6, SciPy 1.18.0, the
 * runtime the page's blocks run) into results.json, which data.ts reads.
 * Exact answers are worked in fractions:
 *   - one die: a six is 1/6, and 1/3 given an even roll.
 *   - the page's test (1% prevalence, 99% sensitivity, 5% false positives) on
 *     10,000 people, the population the BaseRate course video walks: 100 sick,
 *     99 caught; 9,900 healthy, 495 flagged; 99 of 594 positives, exactly
 *     1/6, the page's "near 17%" and its block's 0.167. (BaseRate itself runs
 *     1 in 1,000 at 99% both ways and gets 9%; different inputs, same method.)
 *   - the Statistics course's 1,000 users: 30 of 500 paid and 120 of 500 free
 *     users churned, 6% and 24%, 15% overall.
 *   - a fair die: mean 3.5, squared distances 6.25, 2.25 and 0.25, variance
 *     35/12 = 2.917 (the page's block prints the same).
 *   - the video's own ten hats, 100,000 shuffles at seed 2026: 0.997 fixed
 *     points on average against the exact 1, "a hundred thousand shuffles
 *     agree".
 *   - the normal's 68.27%, 95.45% and 99.73% within one, two and three
 *     standard deviations.
 *   - waits averaging 12 minutes, as the page's memoryless chart: ten more
 *     minutes has chance e^(-10/12) = 0.4346, "forty-three percent"; a
 *     million seeded draws give 0.435, 0.434 and 0.436 after 0, 10 and 30.
 *   - Binomial(1,000, 0.003) against Poisson(3): at most 0.0003 apart.
 *   - Monty Hall, the page's block (seed 7, 100,000 games): stay 0.334,
 *     switch 0.666.
 *   - 23 people make 253 pairs (23 x 22 / 2); no shared birthday is
 *     364/365 x 363/365 x ... x 343/365 = 0.4927, "forty-nine point three
 *     percent", so a shared one is 0.5073 exact, 0.507 in the page's 50,000
 *     rooms (seed 1); 57 people pass 99%.
 *   - the video's own 200 people (seed 23): covariance 42.0 in centimeter
 *     kilograms and 0.42 in meter kilograms, correlation 0.49 both ways; y =
 *     x squared on a symmetric grid has r = 0.
 *   - the bet: 0.2 x 10 + 0.8 x (-3) = 2 - 2.4 = -0.4.
 *
 * Written for Drew's ear: numbers as they are said, "lambda" for the rate.
 */
export const script: NarrationScript = {
  id: "ds-probability",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Twenty-three people walk into a room. Is it more likely than not that two of them share a birthday? Most people say no, because twenty-three is tiny next to three hundred and sixty-five. Hold on to your answer. We'll settle it near the end.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "Probability rounds run on puzzles like that, where the first answer is usually wrong, and on definitions you have to state exactly. There are fourteen questions here. Twelve get worked through with numbers, and the last two take a sentence each.",
      pauseAfter: 0.7,
    },
    { id: "cond-in", text: "Start with the idea every other answer leans on." },

    // ── 1, 2. Conditional probability, Bayes' theorem ─────────────────────
    {
      id: "cond",
      scene: true,
      text: "Question one. What is conditional probability? It's the probability of A, given that B has happened.",
      pauseAfter: 0.6,
    },
    {
      id: "cond-die",
      text: "Roll a die, and someone tells you it came up even.",
      pauseAfter: 0.5,
    },
    {
      id: "cond-six",
      text: "Three faces are left, so the chance of a six is now one in three, not one in six.",
      pauseAfter: 0.6,
    },
    {
      id: "cond-rule",
      text: "In symbols, the probability of A and B, divided by the probability of B. You shrink the world to where B is true, and measure again inside it.",
      pauseAfter: 0.8,
    },
    {
      id: "bayes",
      text: "Question two. State Bayes' theorem, and say when you'd use it. It turns the probability of B given A around, into A given B: the likelihood times the prior, over the total probability of the evidence.",
      pauseAfter: 0.7,
    },
    {
      id: "bayes-when",
      text: "Use it when you know how a test behaves given a disease, but you want the chance of the disease given the test.",
      pauseAfter: 0.7,
    },
    {
      id: "bayes-base",
      text: "The bottom line adds the positives among the sick to the positives among the healthy, each weighted by how common its group is. Those weights are the base rate, and that's where intuition breaks.",
      pauseAfter: 0.7,
    },
    { id: "test-in", text: "So here's that test, with numbers." },

    // ── 3. The rare-disease test ──────────────────────────────────────────
    {
      id: "test",
      scene: true,
      text: "Question three. Why can a sensitive test for a rare disease still give mostly false positives?",
      pauseAfter: 0.6,
    },
    {
      id: "test-sick",
      text: "Take ten thousand people. One percent are sick, so a hundred, and the test catches ninety-nine of them.",
      pauseAfter: 0.5,
    },
    {
      id: "test-healthy",
      text: "It also flags five percent of the nine thousand nine hundred who are healthy. That's four hundred and ninety-five false alarms.",
      pauseAfter: 0.6,
    },
    {
      id: "test-share",
      text: "So of five hundred and ninety-four positives, ninety-nine are sick. One in six, about seventeen percent.",
      pauseAfter: 0.8,
    },
    {
      id: "test-words",
      text: "Ninety-nine percent was the sensitivity, measured only on the sick. To read a positive, you also need the false-positive rate on the healthy, and the base rate.",
      pauseAfter: 0.7,
    },
    { id: "indep-in", text: "Next, two ideas that are easy to mix up." },

    // ── 4, 5. Independence, mutually exclusive ────────────────────────────
    {
      id: "indep",
      scene: true,
      text: "Question four. What does it mean for two events to be independent? Knowing one tells you nothing about the other: the probability of A given B is just the probability of A.",
      pauseAfter: 0.6,
    },
    {
      id: "indep-bars",
      text: "Split a thousand users by plan. If churn didn't depend on the plan, both bars would break at the same height, fifteen percent. These break at six and twenty-four, so plan and churn are dependent.",
      pauseAfter: 0.7,
    },
    {
      id: "indep-claim",
      text: "So treat independence as a claim to justify. Repeat visits by the same user, or network effects, break it.",
      pauseAfter: 0.7,
    },
    {
      id: "excl",
      text: "Question five. How is that different from mutually exclusive? Mutually exclusive events can't happen together, so the probability of both is zero.",
      pauseAfter: 0.6,
    },
    {
      id: "excl-die",
      text: "Roll a one, and you didn't roll a two. Knowing the first drops the second from one in six to zero, which is as far from independent as it gets.",
      pauseAfter: 0.6,
    },
    {
      id: "excl-never",
      text: "So two exclusive events that can each happen are never independent.",
      pauseAfter: 0.7,
    },
    { id: "expect-in", text: "Then the two numbers that sum up a random variable." },

    // ── 6, 7. Expectation, variance, linearity ────────────────────────────
    {
      id: "expect",
      scene: true,
      text: "Question six. Define expectation and variance.",
      pauseAfter: 0.6,
    },
    {
      id: "expect-mean",
      text: "Expectation is the probability-weighted average. For a fair die, it's three and a half: the point where the faces balance, though no face shows it.",
      pauseAfter: 0.7,
    },
    {
      id: "expect-var",
      text: "Variance is the expected squared distance from that mean: six and a quarter for a one or a six, a quarter for a three or a four. Averaged, about two point nine two.",
      pauseAfter: 0.7,
    },
    {
      id: "linear",
      text: "Question seven. What is linearity of expectation, and why is it so useful? The expectation of a sum is the sum of the expectations, even when the parts depend on each other.",
      pauseAfter: 0.6,
    },
    {
      id: "linear-hats",
      text: "So split a hard count into easy pieces. Ten people get their hats back at random. Each has a one in ten chance of getting their own, so on average, exactly one does. A hundred thousand shuffles agree.",
      pauseAfter: 0.6,
    },
    {
      id: "linear-var",
      text: "Variance only adds up like that when the parts are uncorrelated.",
      pauseAfter: 0.7,
    },
    { id: "dist-in", text: "Now the shapes you'll be asked to name." },

    // ── 8. The distributions ──────────────────────────────────────────────
    {
      id: "dist",
      scene: true,
      text: "Question eight. Walk through the distributions a data scientist should know.",
      pauseAfter: 0.6,
    },
    {
      id: "dist-counts",
      text: "A Bernoulli is one yes or no trial. A binomial counts the successes in n of them, with mean n times p. A Poisson counts events in an interval, and its mean and variance are both its rate, lambda.",
      pauseAfter: 0.6,
    },
    {
      id: "dist-curves",
      text: "The normal is the symmetric bell, with sixty-eight, ninety-five and ninety-nine point seven percent of values within one, two and three standard deviations of the mean. And the exponential is the wait between Poisson events.",
      pauseAfter: 0.7,
    },

    // ── 9. Memoryless ─────────────────────────────────────────────────────
    {
      id: "memory",
      scene: true,
      text: "Question nine. What does memoryless mean for the exponential? Time already spent waiting changes nothing about the time still to come.",
      pauseAfter: 0.6,
    },
    {
      id: "memory-wait",
      text: "Say waits average twelve minutes.",
      pauseAfter: 0.55,
    },
    {
      id: "memory-more",
      text: "The bar is everyone still waiting, and the darker part waits ten more. That's forty-three percent of the bar, whether they've waited zero minutes, ten, or thirty.",
      pauseAfter: 0.55,
    },
    {
      id: "memory-other",
      text: "No other continuous distribution does that.",
      pauseAfter: 0.7,
    },

    // ── 10. Poisson or binomial ───────────────────────────────────────────
    {
      id: "pois",
      scene: true,
      text: "Question ten. When would you use a Poisson instead of a binomial?",
      pauseAfter: 0.6,
    },
    {
      id: "pois-which",
      text: "A binomial needs a fixed number of trials, each with the same chance: a thousand impressions, each clicked or not. A Poisson counts events with no natural ceiling, like arrivals per minute.",
      pauseAfter: 0.6,
    },
    {
      id: "pois-limit",
      text: "And the two meet. A thousand trials at point three percent is almost exactly a Poisson with a rate of three.",
      pauseAfter: 0.7,
    },
    { id: "monty-in", text: "Then two puzzles, and the room from the start." },

    // ── 11. Monty Hall ────────────────────────────────────────────────────
    {
      id: "monty",
      scene: true,
      text: "Question eleven. Explain the Monty Hall problem.",
      pauseAfter: 0.6,
    },
    {
      id: "monty-setup",
      text: "Three doors, and a car behind one. You pick a door. The host, who knows where the car is, opens another one onto a goat, and offers you the switch.",
      pauseAfter: 0.6,
    },
    {
      id: "monty-switch",
      text: "Take it. Your first pick was right one time in three.",
      pauseAfter: 0.8,
    },
    {
      id: "monty-host",
      text: "The host never opens the car, so the other two thirds all land on the one door he left shut.",
      pauseAfter: 0.8,
    },
    {
      id: "monty-sim",
      text: "A hundred thousand games: staying wins thirty-three percent, switching sixty-seven.",
      pauseAfter: 0.7,
    },

    // ── 12. The birthday problem ──────────────────────────────────────────
    {
      id: "bday",
      scene: true,
      text: "Question twelve, the room from the start. Twenty-three people: is a shared birthday more likely than not?",
      pauseAfter: 0.6,
    },
    {
      id: "bday-pairs",
      text: "Yes, just. People don't collide, pairs do, and twenty-three people make two hundred and fifty-three pairs.",
      pauseAfter: 0.6,
    },
    {
      id: "bday-exact",
      text: "Work it through the complement. Each new person has to miss everyone before them: three sixty-four out of three sixty-five, then three sixty-three, down to three forty-three. Multiply them, and no match at all is forty-nine point three percent.",
      pauseAfter: 0.55,
    },
    {
      id: "bday-match",
      text: "So a match is fifty point seven percent, and fifty thousand simulated rooms say the same.",
      pauseAfter: 0.55,
    },
    {
      id: "bday-curve",
      text: "By fifty-seven people, it's over ninety-nine.",
      pauseAfter: 0.8,
    },

    // ── The last two ──────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "That's every puzzle. Two definitions left.",
      pauseAfter: 0.6,
    },
    {
      id: "r-cov",
      text: "Covariance tracks how two variables move together, but its size depends on their units: the same people give forty-two in centimeters and point four two in meters. Correlation divides by both standard deviations, so it stays between minus one and one. And zero correlation rules out a straight line, not a relationship.",
    },
    {
      id: "r-bet",
      text: "Last, the expected value of a bet that pays ten dollars one time in five, and loses three otherwise. Two dollars, minus two forty: it loses forty cents a play, though its likeliest outcome is losing three.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "A model's output is a probability too. The next round asks whether it holds up on data the model hasn't seen, and how you'd score it. Next: machine learning, training and evaluating.",
    },
  ],
};
