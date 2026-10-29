import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Experimentation II: experiments in practice" (16:9), Part 7
 * of the Data Scientist interview prep videos
 * (agent-outputs/20261022-0445-data-scientist-interview-video-plan.md), after
 * the second half of content/interview/data-scientist/experimentation.mdx. It
 * answers the fourteen questions the plan gives this video: ten worked
 * through, numbered aloud, then four quick ones (numbered 11 to 14 on screen
 * only).
 *
 *   1. common A/B testing pitfalls ("pitfalls").
 *   2. a sample ratio mismatch ("srm").
 *   3. what "no significant difference" tells you ("nosig").
 *   4. Simpson's paradox in an experiment ("simpson").
 *   5. novelty and primacy effects ("novelty").
 *   6. multiple comparisons, Bonferroni and Benjamini-Hochberg ("many").
 *   7. network effects and interference ("network"). 8. switchback
 *   experiments ("switchback"). 9. interference between concurrent
 *   experiments ("concurrent").
 *   10. quasi-experiments and difference-in-differences ("did").
 *   Quick ("rapid-in"): ATE against ATT; long-running experiments; holdbacks;
 *   meta-analysis and the winner's curse.
 *
 * The opening, the line into the quick round and the bridge are written
 * fresh, unlike any other video's in either series (the series rule since
 * 2026-10-22). The hook is a readout taken apart: three of its rows are the
 * questions this video answers.
 *
 * No series intro yet: the first scene opens at frame 0.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every number below ran in Pyodide 314.0.7 with NumPy, SciPy and
 * statsmodels (check.mjs into results.json, which data.ts reads):
 *   - "srm": the page's own block, chisquare on 4,800 against 5,200: chi-square
 *     16.00, p = 0.000063 (about one in sixteen thousand); the video's own
 *     4,960 against 5,040: p = 0.42.
 *   - "nosig": two simulated A/A tests on a 10% rate: 1,000 per arm gives a
 *     difference of -0.70 points, interval -3.24 to 1.84; 100,000 per arm gives
 *     0.14, interval -0.12 to 0.41. Half a point is the video's own bar.
 *   - "simpson": the video's own counts. Mobile 720 of 8,000 (9%) against 200
 *     of 2,000 (10%); desktop 60 of 2,000 (3%) against 280 of 8,000 (3.5%);
 *     pooled 7.8% against 4.8%.
 *   - "novelty": charts/novelty-effect-fades.mjs, as DA Part 7 drew it (and
 *     checked against its results.json): week one 14.1% against 3.75%, week
 *     eight 0.68% against 4.19%.
 *   - "many": the page's curve, 1 - 0.95^20 = 64%; ten simulated metrics with
 *     three real effects: five under 0.05 (two false), Benjamini-Hochberg
 *     keeps the three real ones (rank 3's p of 0.0136 is under its bar of
 *     0.015; ranks 4 and 5 miss 0.020 and 0.025), Bonferroni keeps two.
 *   - "did": two simulated cities: the treated city +8.91, the comparison
 *     city +2.38, difference 6.53 (statsmodels OLS agrees); the true effect
 *     is 6. Before the policy the gap between the cities drifted -0.07 a
 *     week: the parallel-trends check.
 *   - "r-meta": the video's own three experiments of one change, lifts of 2,
 *     6 and 9 points with standard errors 1, 2 and 3: the headlines average
 *     5.67, the inverse-variance pool is 3.31 (statsmodels agrees).
 *   - "r-curse": the winner's-curse chart's question, computed exactly: at 20%
 *     power the significant estimates average 2.24 times the truth.
 *
 * Written for Drew's ear: "A B test" is spelled; every other initialism is
 * written in plain caps (SRM, SUTVA, DiD, ATE, ATT), never letter-spaced, and
 * no sentence starts with "A" right before one; numbers as they are said.
 */
export const script: NarrationScript = {
  id: "ds-experiments-in-practice",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "The A B test is live, its users split at random between the old checkout and a new one, and the readout says the new one won. Someone wants to ship it today. Look closer first. The two groups aren't the size you asked for. It's only week one. And this was the best of ten metrics. Any one of those can turn a win into nothing.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "This round is about experiments once they're running: fourteen questions. Ten get a figure each. The other four are short enough to take in passing.",
      pauseAfter: 0.7,
    },

    // ── 1. The pitfalls ───────────────────────────────────────────────────
    {
      id: "pitfalls",
      scene: true,
      text: "Question one. What are the common A B testing pitfalls? Five come up again and again: a split that isn't the one you set, segments that disagree with the total, a lift that fades once it isn't new, metrics read until one of them moves, and users who affect each other. Each gets a question of its own here.",
      pauseAfter: 0.7,
    },

    // ── 2. Sample ratio mismatch ──────────────────────────────────────────
    {
      id: "srm",
      scene: true,
      text: "Question two. What is a sample ratio mismatch, and what causes it? You asked for fifty-fifty, and got four thousand eight hundred against five thousand two hundred.",
      pauseAfter: 0.5,
    },
    {
      id: "srm-test",
      text: "A chi-square test asks whether chance could do that. Here chi-square is sixteen, and p is about one in sixteen thousand. That's a sample ratio mismatch, an SRM. Four thousand nine hundred sixty against five thousand forty would be chance: p is point four two.",
      pauseAfter: 0.6,
    },
    {
      id: "srm-cause",
      text: "A mismatch means something treats the arms differently: bots filtered from one arm, a redirect that loses slow page loads, a logging bug. Find it before you read a single result.",
      pauseAfter: 0.7,
    },

    // ── 3. No significant difference ──────────────────────────────────────
    {
      id: "nosig",
      scene: true,
      text: "Question three. The test shows no significant difference. What can you conclude? Only that you didn't detect one. The confidence interval says how much that's worth.",
      pauseAfter: 0.5,
    },
    {
      id: "nosig-ci",
      text: "Here are two simulated tests of a change that does nothing, on a ten percent conversion rate. Say half a point is the smallest lift worth having. With a thousand users per arm, the interval runs from minus three point two points to plus one point eight, far wider than that, so the test can't tell. With a hundred thousand per arm, it runs from minus point one to plus point four. That one does support no meaningful effect.",
      pauseAfter: 0.7,
    },

    // ── 4. Simpson's paradox ──────────────────────────────────────────────
    {
      id: "simpson",
      scene: true,
      text: "Question four. What is Simpson's paradox in an experiment? Say a new checkout rolls out unevenly: most of its users are on desktop, and most of control's are on mobile. On mobile, the new checkout converts ten percent against nine. On desktop, three and a half against three. It wins on both.",
      pauseAfter: 0.5,
    },
    {
      id: "simpson-pool",
      text: "Pool them, and it loses, four point eight against seven point eight, because desktop converts less and the new checkout got mostly desktop.",
    },
    {
      id: "simpson-def",
      text: "That's Simpson's paradox: a result that holds in every segment flips in the total, because the arms have a different mix. In a randomized test the mix should match, so check it in each arm: a gap is a bug, like an SRM, and the fair comparison is the one within each segment.",
      pauseAfter: 0.7,
    },

    // ── 5. Novelty and primacy ────────────────────────────────────────────
    {
      id: "novelty",
      scene: true,
      text: "Question five. What are novelty and primacy effects, and how do you handle them? People click on something because it's new. That lift is real, and it doesn't last. Here one change is up fourteen percent in week one, and under one percent by week eight, while a plainer change holds at about four. Read in week one, you'd ship the wrong one.",
      pauseAfter: 0.6,
    },
    {
      id: "primacy",
      text: "Primacy runs the other way: a redesign people resist at first, until they learn it.",
    },
    {
      id: "primacy-fix",
      text: "For both, run past the first weeks, and compare new users, who never saw the old version, with returning ones.",
      pauseAfter: 0.7,
    },

    // ── 6. Multiple comparisons ───────────────────────────────────────────
    {
      id: "many",
      scene: true,
      text: "Question six. What is the multiple comparisons problem? Each test at a five percent level has a one in twenty chance of a false alarm. Read twenty metrics, and the chance that at least one of them fires is sixty-four percent.",
      pauseAfter: 0.6,
    },
    {
      id: "many-fix",
      text: "Here are ten simulated metrics, and three of them really moved. Five come in under point oh five, and two of those are false alarms. Bonferroni divides the five percent by ten, and keeps two: safe, but it drops a real one.",
    },
    {
      id: "many-bh",
      text: "Benjamini-Hochberg controls the false discovery rate, the expected share of your hits that are false. It gives the smallest p-value a bar of one tenth of five percent, the next two tenths, and so on, and keeps everything up to the last one under its bar: here, the three real ones.",
    },
    {
      id: "many-end",
      text: "Better still, name one primary metric before the test starts.",
      pauseAfter: 0.7,
    },

    // ── 7, 8, 9. Interference ─────────────────────────────────────────────
    {
      id: "network",
      scene: true,
      text: "Question seven. What are network effects and interference? A standard test assumes one user's treatment can't change another user's outcome. That's SUTVA, the stable unit treatment value assumption. Give a sharing feature to half the users, and what they share reaches the other half: control gets treated too, and the difference shrinks. So randomize groups that rarely touch: clusters of friends, or whole cities.",
      pauseAfter: 0.7,
    },
    {
      id: "switchback",
      text: "Question eight. What is a switchback experiment?",
    },
    {
      id: "sb-pool",
      text: "In a marketplace, riders and drivers share one pool, so you can't split users: a treated rider who books faster takes a driver from a control rider, and the split overstates the effect.",
    },
    {
      id: "sb-time",
      text: "Split time instead: the whole city gets the new version for an hour, then the old one, switching at random.",
    },
    {
      id: "sb-carry",
      text: "One hour spills into the next, so drop the first minutes of each hour as a washout, and count hours, not users, as the sample.",
      pauseAfter: 0.7,
    },
    {
      id: "concurrent",
      scene: true,
      text: "Question nine. How do you detect interference between experiments running at once? Compare the users who are in both with those in only one. If a pricing test's lift changes for users who also see new recommendations, the two interact. Then separate their users, run them one after the other, or analyze them together as a factorial design.",
      pauseAfter: 0.7,
    },

    // ── 10. Quasi-experiments and difference-in-differences ───────────────
    {
      id: "did",
      scene: true,
      text: "Question ten. What is a quasi-experiment, and how does difference-in-differences work? Sometimes you can't randomize: a policy starts in one city and not in another. A quasi-experiment makes use of that natural split.",
      pauseAfter: 0.5,
    },
    {
      id: "did-math",
      text: "In this simulation, the treated city's weekly sign-ups rose eight point nine after the policy. The comparison city rose two point four over the same weeks, with no policy at all. The difference of those differences, DiD for short, is six point five, close to the true effect of six. It rests on parallel trends: without the policy, the two lines would have kept moving together.",
    },
    {
      id: "did-check",
      text: "You can't see that after the policy, but you can check the weeks before it: here the two cities rose together.",
      pauseAfter: 0.8,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Four left. Each one is a definition and a reason.",
      pauseAfter: 0.5,
    },
    {
      id: "r-ate",
      text: "The average treatment effect, ATE, is averaged over everyone. The average treatment effect on the treated, ATT, only over those who actually got it. A randomized test makes them match. Observational data can pull them apart.",
    },
    {
      id: "r-long",
      text: "Long-running experiments drift: seasons turn, and other launches land on the same users. Freeze the scope, run at least one full business cycle, and set the end date in advance.",
    },
    {
      id: "r-holdback",
      text: "A holdback keeps a few percent of users on the old version after launch, to check months later that the win lasted.",
    },
    {
      id: "r-meta",
      text: "And a meta-analysis pools many experiments. Rather than averaging their headlines, it weights each by its precision, so big, tight experiments count more.",
    },
    {
      id: "r-curse",
      text: "Watch for the winner's curse: at twenty percent power, the results that reached significance overstate the true effect more than twofold.",
      pauseAfter: 1.8,
    },
    {
      id: "next",
      text: "Every answer here assumed someone had already chosen what to test and what to count. Making that choice is the product-sense round. Next: product sense and metrics.",
    },
  ],
};
