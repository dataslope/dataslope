import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Experimentation I: designing the test" (16:9), Part 6 of the
 * Data Scientist interview prep videos
 * (agent-outputs/20261022-0445-data-scientist-interview-video-plan.md), after
 * the first half of content/interview/data-scientist/experimentation.mdx. It
 * answers the fourteen questions the plan gives this video: eleven worked
 * through on simulated experiments, numbered aloud, then three quick ones
 * (numbered 12 to 14 on screen only).
 *
 *   1. designing an A/B test; 2. choosing the primary metric ("design").
 *   3. the randomization unit ("unit").
 *   4. Type I and Type II errors; 5. power and what drives it ("errors").
 *   6. the sample size ("size").
 *   7. one- and two-sided tests; 8. non-inferiority ("sides").
 *   9. peeking ("peek"). 10. the SPRT ("sprt").
 *   11. CUPED ("cuped").
 *   Quick ("rapid-in"): a sensitive or a robust metric; stratified
 *   randomization; the A/A test.
 *
 * The opening, the line into the quick round and the bridge are written
 * fresh, unlike any other video's in either series (the series rule since
 * 2026-10-22), and the hook is a timeline rather than a figure of data.
 *
 * No series intro yet: the first scene opens at frame 0.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every number ran in Pyodide 314.0.7 with NumPy, SciPy and
 * statsmodels, by check.mjs into results.json, which data.ts reads:
 *   - the page's own code: NormalIndPower solves 392.44, so 393 per arm, for
 *     an effect of 0.2 at 80% power; the sample-size function gives 3,843 per
 *     arm for 10% and a 2-point MDE, and 14,752 for 1 point (statsmodels'
 *     arcsine version: 3,835), from z terms of 1.96 and 0.84 and a pooled
 *     rate of 11%; CUPED on 500 users takes the variance from
 *     8.09 to 3.52 with the mean unchanged; 1,000 A/A tests come out 5.0%
 *     significant.
 *   - Data Analyst Part 7's numbers, so the series agree: the two errors on
 *     a two-sided 5% test placed for 80% power, and the peeking chart, under
 *     0.05 at 800 and 2,000 visitors and 0.19 at the planned 8,000.
 *   - power at 393 per arm: 98% at double the users, 99% at an effect of
 *     0.3, 94% with the SD cut by a fifth, 88% at alpha 0.10; one-sided, 88%,
 *     and a regression of the same size is caught 0% of the time against 80%.
 *   - the video's own simulations: orders nested in 1,000 users, A/A, 20.6%
 *     significant per order and 4.3% per user (in the first, a standard
 *     error of 0.51 per order against 0.79 per user); a cheaper checkout as good as
 *     the old one, its difference -0.29 to +0.39 points at 60,000 per arm and
 *     -1.19 to +0.99 at 6,000, against a margin of 0.5; 10,000 A/A tests
 *     checked once 4.9%, weekly 12%, daily for four weeks 26.5%, every
 *     hundred visitors 34.8%; the SPRT on pairs, designed for 2.5% and 20%
 *     (boundaries log(0.80 / 0.025) and log(0.20 / 0.975)), 2.1% false
 *     positives, 80.5% power against the fixed test's 80.1%, 262 pairs on
 *     average with the effect; revenue capped at its
 *     99th percentile loses 48% of its variance; six heavy users among
 *     twenty land five or six in one arm with probability 0.219.
 *
 * Written for Drew's ear: "A B" for A/B and "A A" for A/A; every other
 * initialism in plain caps (MDE, SPRT, CUPED), which he reads as one unit,
 * and none opens a sentence after "A" (the series' acronym rule).
 */
export const script: NarrationScript = {
  id: "ds-experiment-design",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "An A B test, two versions of a product shown to users split at random, can be lost before anyone sees it. The hypothesis, the metric, who gets split, how many users, and when it stops are all settled before launch, and a mistake in any of them is hard to undo later.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "That's the design round, fourteen questions. Eleven are worked through on simulated experiments, and three brief ones come at the end.",
      pauseAfter: 0.7,
    },
    { id: "design-in", text: "Begin with the whole plan." },

    // ── 1, 2. The design, and the primary metric ──────────────────────────
    {
      id: "design",
      scene: true,
      text: "Question one. How would you design an A B test for a new feature?",
      pauseAfter: 0.5,
    },
    {
      id: "design-plan",
      text: "Write the plan before anything runs. A hypothesis: the new onboarding raises seven-day activation. One primary metric, and a guardrail or two, like page latency, that must not get worse. Randomize by user. Size the test for the smallest lift worth finding, at eighty percent power and five percent alpha. Run it for whole weeks. Then test the difference, and check the guardrails.",
      pauseAfter: 0.7,
    },
    {
      id: "metric",
      text: "Question two. How do you choose the primary metric? It should be tied to what the feature is for, sensitive enough to move with the effect you expect, and measurable inside the test window. Raw clicks are easy to inflate. Ninety-day retention won't arrive before the test ends. Seven-day activation passes all three. And agree on it before launch, so no one switches metrics after seeing the results.",
      pauseAfter: 0.7,
    },
    { id: "unit-in", text: "Next, what exactly gets split." },

    // ── 3. The randomization unit ─────────────────────────────────────────
    {
      id: "unit",
      scene: true,
      text: "Question three. What is the randomization unit, and why does it matter? It's what gets assigned to a group: usually a user, sometimes a session or a device. Randomize each request instead, and one user sees both versions, which dilutes the difference you measure.",
      pauseAfter: 0.6,
    },
    {
      id: "unit-orders",
      text: "The analysis has to respect the unit, too. A thousand users place about five orders each, in an A A test, where both groups get the same version. Treat each order as independent, and the test finds a significant difference twenty-one percent of the time. Analyze one average per user, and it's four percent, inside the five it promises.",
      pauseAfter: 0.6,
    },
    {
      id: "unit-why",
      text: "Why? One user's orders move together, so treating them as independent makes the standard error about a third too small. An average per user fixes that, and so do clustered standard errors.",
      pauseAfter: 0.7,
    },
    { id: "errors-in", text: "With the plan set, there are still two ways to be wrong." },

    // ── 4, 5. The two errors, and power ───────────────────────────────────
    {
      id: "errors",
      scene: true,
      text: "Question four. What's the difference between a Type one and a Type two error? A Type one error is a false positive: declaring a winner when nothing changed. Alpha caps its rate, usually at five percent. A Type two error is a false negative: missing an effect that's really there. Its rate is beta. The first ships features that do nothing. The second abandons features that work.",
      pauseAfter: 0.6,
    },
    {
      id: "power",
      text: "Question five. What is statistical power, and what drives it? Power is one minus beta: the chance of catching a real effect. The page's code sizes a test for an effect of point two standard deviations: three hundred ninety-three users per arm gives eighty percent. Double the users, and it's ninety-eight. A bigger effect, less variance, or a looser alpha each raise it too.",
      pauseAfter: 0.7,
    },
    { id: "size-in", text: "So how many users does a test need?" },

    // ── 6. Sample size ────────────────────────────────────────────────────
    {
      id: "size",
      scene: true,
      text: "Question six. How do you calculate the sample size for an A B test? From four inputs: the baseline rate, the MDE, or minimum detectable effect, alpha, and power. Only the baseline comes from data. The other three are choices.",
      pauseAfter: 0.6,
    },
    {
      id: "size-n",
      text: "Ten percent convert today, and you want to catch a two-point lift. The page's formula says three thousand eight hundred forty-three users per arm.",
    },
    {
      id: "size-terms",
      text: "In the formula, alpha and power become one point nine six and point eight four. The baseline enters through p times one minus p, with p at eleven percent, the average of the two rates.",
    },
    {
      id: "size-half",
      text: "Halve the lift to one point, and it's fourteen thousand seven hundred fifty-two, nearly four times as many. The sample grows with one over the MDE squared.",
      pauseAfter: 0.7,
    },
    { id: "sides-in", text: "A test also has to say which direction counts." },

    // ── 7, 8. One- and two-sided, and non-inferiority ─────────────────────
    {
      id: "sides",
      scene: true,
      text: "Question seven. What's the difference between a one-sided and a two-sided test? A two-sided test looks for a change either way, with two and a half percent in each tail. A one-sided test puts all five percent on the side you predicted. On the same users, power rises from eighty percent to eighty-eight. But a regression the same size, the other way, is never flagged. Features can hurt, so product tests are usually two-sided.",
      pauseAfter: 0.6,
    },
    {
      id: "noninf",
      text: "Question eight. What is a non-inferiority test? It asks whether a new version is worse by no more than a margin set in advance. Say a cheaper checkout may cost at most half a point of conversion. At sixty thousand users per arm, the interval for the difference runs from minus point two nine to plus point three nine, clear of the margin. At six thousand, it also contains zero, but reaches past minus one. Not significant isn't the same as not worse.",
      pauseAfter: 0.7,
    },
    { id: "peek-in", text: "Then the test goes live, and someone opens the dashboard." },

    // ── 9. Peeking ────────────────────────────────────────────────────────
    {
      id: "peek",
      scene: true,
      text: "Question nine. Why fix the sample size in advance instead of peeking? Here both arms are identical, and the p-value is recomputed every hundred visitors. It dips under point oh five at eight hundred, and again at two thousand. Stop at either, and you've shipped noise. At the planned eight thousand, it's point one nine.",
      pauseAfter: 0.6,
    },
    {
      id: "peek-rate",
      text: "Run ten thousand of these A A tests. Checked once, at the end, four point nine percent come out significant. Checked weekly, twelve. Daily for four weeks, twenty-six and a half. Every hundred visitors, thirty-five.",
      pauseAfter: 0.6,
    },
    {
      id: "peek-why",
      text: "In an A A test, every significant result is a false positive, and each extra look is one more chance for noise to cross the line. So fix the sample size in advance, or use a sequential test, built to be checked as it runs.",
      pauseAfter: 0.7,
    },

    // ── 10. The SPRT ──────────────────────────────────────────────────────
    {
      id: "sprt",
      scene: true,
      text: "Question ten. What is a sequential probability ratio test? An SPRT tracks the likelihood ratio between two hypotheses, no effect and the effect you designed for, against boundaries fixed before the start. Cross the top line, and you conclude there's an effect.",
    },
    {
      id: "sprt-bottom",
      text: "Cross the bottom, and the data favor no effect over the one you designed for, though a smaller effect may still be there. In between, you keep going.",
      pauseAfter: 0.6,
    },
    {
      id: "sprt-cost",
      text: "Run it two thousand times each way. It wrongly finds an effect two percent of the time, within the two and a half it was built for.",
      pauseAfter: 0.6,
    },
    {
      id: "sprt-pairs",
      text: "And when the effect is real, it stops after two hundred sixty-two pairs of users on average, against three hundred ninety-three for the fixed test.",
      pauseAfter: 0.6,
    },
    {
      id: "sprt-limit",
      text: "Both catch that effect eighty percent of the time, so the saving is real. But the classic SPRT holds only for two fixed hypotheses; for a live product metric, teams use a mixture SPRT or group-sequential boundaries.",
      pauseAfter: 0.7,
    },
    { id: "cuped-in", text: "One more choice makes every test cheaper to run." },

    // ── 11. CUPED ─────────────────────────────────────────────────────────
    {
      id: "cuped",
      scene: true,
      text: "Question eleven. What is CUPED, and how does it reduce variance? It stands for Controlled-experiment Using Pre-Experiment Data. What a user did before the test predicts a lot of what they do during it. So subtract the part the pre-period predicts: theta times the user's distance from the average.",
      pauseAfter: 0.6,
    },
    {
      id: "cuped-var",
      text: "On the page's five hundred users, the variance falls from eight point oh nine to three point five two. The average stays exactly where it was. Only the noise shrinks, so the same power needs less than half the users.",
      pauseAfter: 0.8,
    },

    // ── Quick round ───────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Three questions remain, and each has a short answer.",
      pauseAfter: 0.5,
    },
    {
      id: "r-sensitive",
      text: "Sensitive or robust? A sensitive metric moves reliably when the treatment works, so it can detect small effects. A robust one is hard to game and isn't thrown by outliers. Revenue per user is long-tailed: here, capping it at the ninety-ninth percentile cuts its variance by forty-eight percent.",
    },
    {
      id: "r-strata",
      text: "Stratified randomization splits users into groups first, like country or device, then randomizes inside each one. With six heavy users among twenty, a coin per user puts five or six of them in one arm about one time in five. Stratifying puts three in each.",
    },
    {
      id: "r-aa",
      text: "And an A A test gives both groups the same experience, to test the platform itself. The page's code runs a thousand of them, and five percent come out significant, as they should. Far more than that means a bug.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "A test designed this carefully can still go wrong once it's live: the split comes back uneven, the effect fades, or ten metrics get read at once. Next: experiments in practice.",
    },
  ],
};
