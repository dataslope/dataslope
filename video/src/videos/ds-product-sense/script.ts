import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Product sense & metrics" (16:9), Part 8 of the Data Scientist
 * interview prep videos (agent-outputs/20261022-0445-data-scientist-interview-video-plan.md),
 * after content/interview/data-scientist/product-sense-and-metrics.mdx. It
 * answers the fourteen questions the plan gives this page: eleven worked
 * through on one made-up app, numbered aloud, then three in a sentence each
 * (12 to 14, numbered on screen only). The page's novelty-effect question is
 * answered in Part 7, Experimentation II; Experimentation's guardrail question
 * is answered here, in question 2.
 *
 *   1. a north-star metric; 2. guardrail metrics ("north").
 *   3. leading and lagging indicators; 4. Goodhart's law ("lead").
 *   5. success metrics for a "Save for later" button ("save").
 *   6. diagnosing an 8% drop in daily active users ("drop").
 *   7. signal or noise ("noise").
 *   8. testing a recommendation algorithm; 9. when you can't A/B test
 *      ("rec").
 *   10. an estimate on the spot; 11. a feature's impact before it's built
 *       ("size").
 *   Quickly ("rapid-in"): competing metrics; vanity metrics; ratio metrics.
 *
 * Written fresh rather than in any other part's words (asked for on
 * 2026-10-22): it opens on two numbers from one dashboard, a hook figure no
 * other part uses, and has its own line into the quick round and its own
 * bridge out.
 *
 * No series intro yet, as in the other parts: the first scene opens at frame
 * 0.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. The page has no data of its own, so every product number belongs to
 * one made-up recipe app, and the narration and the screen both say so. The
 * arithmetic on them is done by check.mjs (Pyodide, NumPy, SciPy) into
 * results.json, which data.ts reads:
 *   - the opening's tiles: 1,284,000 total signups, up 1,900 today; users
 *     still cooking four weeks in, 31% down to 29%.
 *   - an onboarding change in week 3 moves week-one cooking (42% to 36%) the
 *     next week, and month-three retention (22% to 19%) twelve weeks later,
 *     seeded weekly noise on both (seed 31).
 *   - tickets: median time to close 9 hours to 3; reopened 4% to 15%.
 *   - the drop: 100,000 daily users before, 92,000 after, so -8%. iPhone
 *     52,000 to 51,500, Android 38,000 to 30,500, web 10,000 flat: Android
 *     lost 7,500 of the 8,000.
 *   - signal or noise: 56 simulated days at 100,000 with 3% noise (seed 7):
 *     standard deviation 2.67% of the mean, so "about three percent"; a dip of
 *     2% sits at z = -0.75, inside the two-sigma band; 24 of the 56 days moved
 *     more than 2% from the mean.
 *   - the test: DA Part 7's own sample-size function (80% power, two-sided 5%):
 *     10% to 11% needs 14,751 users a group, "about fifteen thousand"; 10% to
 *     10.5% needs 57,763, 3.92 times as many, "nearly four times". (10% to 12%
 *     is DA Part 7's 3,841.)
 *   - the drop's last step: Android lost 19.7% of its 38,000, "a fifth of
 *     its users".
 *   - the estimate: 2,000,000 monthly users x 25% x half a session a day x 2
 *     searches a session = 500,000 searches a day; the sanity check, 500,000
 *     searches from 500,000 feature users, is one search a day each.
 *   - the impact: 120,000 weekly users reach the screen; 1 to 3 in every 100
 *     of them becoming weekly cooks (an absolute lift, in points) gives 1,200
 *     to 3,600 extra weekly cooks, 18% of a 20,000 goal at best.
 *   - the ratio: 200,000 saves by 100,000 users (2.0 each) to 192,000 by
 *     80,000 (2.4 each): saves down 4%, users down a fifth.
 *   - competing metrics: the page's own +5% sessions and +2% unsubscribes.
 *
 * Written for Drew's ear: initialisms in plain caps ("DAU"), "A B" as the one exception, and no sentence opening on "A" before an initialism.
 */
export const script: NarrationScript = {
  id: "ds-product-sense",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Two numbers from the same dashboard, on the same morning. Total signups: up again, the way they are every single day. Users still cooking four weeks after joining: down two points. Only one of them can tell you something is wrong.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "Product sense is that judgment, and there's no code in this round. The numbers in this video all come from one made-up recipe app. Eleven questions get a figure, and three close the round in a sentence each.",
      pauseAfter: 0.7,
    },
    { id: "north-in", text: "Begin with the number a whole team steers by." },

    // ── 1, 2. The north star, and its guardrails ──────────────────────────
    {
      id: "north",
      scene: true,
      text: "Question one. What is a north-star metric, and what makes a good one? It's the single number that best captures the value users get, the one every team pushes toward.",
      pauseAfter: 0.6,
    },
    {
      id: "north-good",
      text: "A good one moves before revenue does, reflects real value, and is something the team's work can move. For this app: weekly cooks, people who open a recipe in cooking mode. Total signups is bigger, and says nothing about whether anyone cooks.",
      pauseAfter: 0.7,
    },
    {
      id: "guard",
      text: "Question two. What are guardrail metrics, and why do you need them? They're the health checks you refuse to harm on the way: crash rate, load time, unsubscribes, revenue. Almost any single number can be gamed. Send more notifications, and sessions climb while people quietly leave.",
      pauseAfter: 0.7,
    },
    { id: "lead-in", text: "Next, two ideas about proxies: when they move, and when they lie." },

    // ── 3, 4. Leading and lagging, Goodhart ───────────────────────────────
    {
      id: "lead",
      scene: true,
      text: "Question three. Leading versus lagging indicators: why does the distinction matter? A leading indicator moves before the outcome, like cooking in the first week. A lagging one confirms it afterwards, like retention at month three.",
      pauseAfter: 0.6,
    },
    {
      id: "lead-gap",
      text: "Here an onboarding change lands in week three. Week-one cooking drops the next week. Month-three retention doesn't show it for twelve more. You steer by the leading line, as long as it actually causes the outcome, and isn't just correlated with it.",
      pauseAfter: 0.7,
    },
    {
      id: "goodhart",
      text: "Question four. What is Goodhart's law? When a measure becomes a target, it stops being a good measure. Reward support agents for closing tickets fast, and some close them before the problem is solved. Time to close falls from nine hours to three. Reopened tickets climb from four percent to fifteen. That second number is the counter-metric that catches it.",
      pauseAfter: 0.7,
    },
    { id: "save-in", text: "Now a question that hands you a feature." },

    // ── 5. Save for later ─────────────────────────────────────────────────
    {
      id: "save",
      scene: true,
      text: "Question five. How would you define success metrics for a Save for later button?",
      pauseAfter: 0.6,
    },
    {
      id: "save-tree",
      text: "Start from the job it does: bring people back to cook what they saved. So the primary metric is the share of saved recipes opened again within a week. Save rate and saves per user explain why it moved. Guardrails catch it stealing from the main flow: cooking sessions, and load time.",
      pauseAfter: 0.6,
    },
    {
      id: "save-not",
      text: "What you don't pick is clicks on the button. That measures the interaction, not the value.",
      pauseAfter: 0.7,
    },
    { id: "drop-in", text: "Then the question almost every loop includes." },

    // ── 6. The DAU drop ───────────────────────────────────────────────────
    {
      id: "drop",
      scene: true,
      text: "Question six. Walk me through diagnosing a sudden eight percent drop in daily active users, DAU. First: is it real? A logging change, a broken pipeline, or a holiday can make that shape on its own.",
    },
    {
      id: "drop-check",
      text: "Rule them out: compare the same week last year, and check whether related metrics moved with it.",
      pauseAfter: 0.6,
    },
    {
      id: "drop-split",
      text: "Then, is it broad or narrow? Say the app had a hundred thousand daily users. Split by platform, iPhone and web barely moved. Android lost seventy-five hundred of the eight thousand.",
      pauseAfter: 0.6,
    },
    {
      id: "drop-when",
      text: "Then, what changed, and when? Android release five point two went out that morning. Last, internal or external: a competitor's launch looks different from a bug of your own.",
      pauseAfter: 0.6,
    },
    {
      id: "drop-act",
      text: "That finds the cause. Then size it, fix it, and confirm: Android lost a fifth of its users, so roll back five point two, and watch Android climb back.",
      pauseAfter: 0.7,
    },

    // ── 7. Signal or noise ────────────────────────────────────────────────
    {
      id: "noise",
      scene: true,
      text: "Question seven. How do you decide whether a change is signal or noise? Measure the normal swing first.",
      pauseAfter: 0.6,
    },
    {
      id: "noise-band",
      text: "This metric moves about three percent on an ordinary day, so a two percent dip sits well inside its band. In eight simulated weeks with nothing wrong, twenty-four days moved further than that.",
      pauseAfter: 0.6,
    },
    {
      id: "noise-real",
      text: "A real shift persists for days, clears the band, and shows up in related metrics too.",
      pauseAfter: 0.7,
    },
    { id: "rec-in", text: "Next, testing a change, and what to do when you can't." },

    // ── 8, 9. A recommendation test, and when you can't test ──────────────
    {
      id: "rec",
      scene: true,
      text: "Question eight. How would you design an experiment for a new recommendation algorithm? Make it an A B test: users split at random between the old algorithm and the new one. State one primary metric, the share of users who cook a recommended recipe, with guardrails like latency and variety. And split by user, not by session, since one person's sessions aren't independent.",
      pauseAfter: 0.6,
    },
    {
      id: "rec-size",
      text: "Size it before launch. At a ten percent baseline, catching a lift to eleven takes about fifteen thousand users per group. Half that lift takes nearly four times as many. Then run whole weeks, so the weekends count.",
      pauseAfter: 0.7,
    },
    {
      id: "cant",
      text: "Question nine. When can't you run an A B test, and what do you do instead? When the change is global, like a redesign. When users affect each other, as in a marketplace. When there are too few of them, or when it would be unethical.",
      pauseAfter: 0.5,
    },
    {
      id: "cant-instead",
      text: "Then randomize whole regions, or switch the change on and off by time slot. Or compare against a baseline. Difference-in-differences takes how much the treated regions moved, minus how much the untreated ones did. A synthetic control weights untreated regions into a stand-in for the treated one. An interrupted time series looks for a break in the trend at the change.",
      pauseAfter: 0.7,
    },
    { id: "cant-trade", text: "Each trades some rigor for something you can actually run.", pauseAfter: 0.7 },
    { id: "size-in", text: "And last, the numbers you build on the spot." },

    // ── 10, 11. Estimating, and sizing a feature ──────────────────────────
    {
      id: "market",
      scene: true,
      text: "Question ten. How would you estimate the size of something on the spot? Break it into factors, and say every assumption out loud. Daily searches for a new search-by-ingredient feature: two million monthly users, a quarter of them use it, half a session a day each, two searches a session. About five hundred thousand a day.",
      pauseAfter: 0.6,
    },
    {
      id: "market-sanity",
      text: "Then sanity-check it: five hundred thousand searches from five hundred thousand users is one search a day each. Plausible.",
      pauseAfter: 0.6,
    },
    {
      id: "market-grade",
      text: "The interviewer is grading the structure and the sanity check, not the number.",
      pauseAfter: 0.7,
    },
    {
      id: "impact",
      text: "Question eleven. How do you size a feature's impact before building it? Bound it. A hundred and twenty thousand weekly users reach the screen it lives on.",
    },
    { id: "impact-lift", text: "Similar launches turned one to three in every hundred of those users into new weekly cooks." },
    {
      id: "impact-range",
      text: "That's twelve hundred to thirty-six hundred extra weekly cooks, against a goal of twenty thousand.",
      pauseAfter: 0.6,
    },
    {
      id: "impact-verdict",
      text: "Even the best case is under a fifth of it. The cheapest experiment is the arithmetic.",
      pauseAfter: 0.8,
    },

    // ── Quickly ───────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Three left, each about a number you already have.",
      pauseAfter: 0.6,
    },
    {
      id: "r-trade",
      text: "When two metrics pull apart, name which is the goal and which is the limit. A notification change that lifts sessions five percent but raises unsubscribes two is only a win if the long-run math nets out positive.",
    },
    {
      id: "r-vanity",
      text: "A vanity metric looks good and only goes up, like total signups. Ask: if it doubled, would you know what to do differently? Prefer rates and cohorts, like week-four retention.",
    },
    {
      id: "r-ratio",
      text: "And a ratio can move because of its top, its bottom, or the mix underneath. Saves per user rose from two to two point four while saves fell, because a fifth of the users left. Read both halves, and add up counts across groups rather than averaging their ratios.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "Every case in this round ends with someone pulling the numbers. In the next one, that's you, in Python. Next: Python and pandas.",
    },
  ],
};
