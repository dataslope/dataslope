import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "LLM evaluation" (16:9), Part 11 and the last of the Data
 * Scientist interview prep videos
 * (agent-outputs/20261022-0445-data-scientist-interview-video-plan.md), after
 * content/interview/data-scientist/llm-evaluation.mdx. It answers the page's
 * nine questions: seven worked through, numbered aloud, then two in a
 * sentence or two (8 and 9, numbered on screen only), and closes the series
 * by pointing to the practice on every page and the track's question bank.
 *
 *   1. how the interview changed ("changed").
 *   2. measuring an LLM feature's quality ("measure").
 *   3. how large an eval set needs to be, and pairing ("size").
 *   4. whether an LLM judge can be trusted ("judge").
 *   5. A/B testing an LLM feature ("ab").
 *   6. the share of complaints an LLM classifier finds ("prev").
 *   7. checking an analysis an assistant wrote ("check").
 *   Quickly ("rapid-in"): a thumbs-up rate as a primary metric; benchmark
 *   contamination.
 *
 * Written fresh rather than in any other part's words (asked for on
 * 2026-10-22): it opens on one question asked of a model twice, a hook figure
 * no other part uses, and has its own line into the quick round and its own
 * close. The series ends here, so there is no "Next:" bridge.
 *
 * No series intro yet, as in the other parts: the first scene opens at frame
 * 0.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. check.mjs (Pyodide, NumPy, SciPy) redoes the page's arithmetic into
 * results.json, which data.ts reads:
 *   - the page's block: an 80% pass rate on 100 items is 72.2% to 87.8%
 *     ("seventy-two to eighty-eight").
 *   - the video's own 500 paired items (A 79%, B 82%, the page's
 *     concept-check scores): 385 pass both, 80 fail both, 25 pass only B,
 *     10 only A. As two separate samples, p = 0.23; McNemar's exact test on
 *     the 35 that disagree, p = 0.017 ("point oh two").
 *   - the judge: 85 pass-pass, 5 fail-fail, 5 each way apart, so 90%
 *     agreement with both at 90% pass; chance agreement 0.82, kappa 0.08 /
 *     0.18 = 0.44. A judge that always says pass agrees 90% too, kappa 0.
 *   - Rogan–Gladen on the page's numbers: (0.20 + 0.95 − 1) / (0.90 + 0.95 −
 *     1) = 17.6%; of a million tickets, 176,471 complaints, 158,824 caught,
 *     and 41,176 false alarms from the 823,529 that aren't.
 *   - the notebook (the video's own): a join takes 10,000 rows to 6,700, a
 *     third; twenty uncorrected tests at 5% give a 64% chance of at least one
 *     false alarm.
 *   - the question bank holds 110 questions (counted in
 *     multiple-choice-questions.mdx); concept checks are on every topic page,
 *     runnable code on all but product sense ("most").
 *   Judge biases, contamination and a provider changing the model mid-test
 *   are drawn as mechanisms only: the page gives no rates, and none is made
 *   up.
 *
 * Written for Drew's ear: initialisms in plain caps (AI, LLM), "A B" and
 * "A A" as the exceptions, no sentence opening on "A" before an initialism,
 * and "p ninety-five" for the 95th percentile, said once in full first.
 */
export const script: NarrationScript = {
  id: "ds-llm-evaluation",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Ask a model the same question twice, and you can get two different answers. Both sound sure of themselves. Only one matches the refund policy. Somebody has to decide which version of the feature ships, and that's a measurement problem.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "The statistics are ones you already know: sampling error, agreement, power, bias. What's new is that the output is text, it changes from run to run, and another model often grades it. This page has nine questions.",
    },
    {
      id: "plan-seven",
      text: "Seven get worked through, four of them with real arithmetic, and two take a sentence each.",
      pauseAfter: 0.7,
    },

    // ── 1. How the interview changed ──────────────────────────────────────
    {
      id: "changed",
      scene: true,
      text: "Question one. How have data scientist interviews changed with AI, artificial intelligence? The core loop hasn't: statistics, experiments, SQL and product sense.",
      pauseAfter: 0.6,
    },
    {
      id: "changed-layer",
      text: "What's layered on top, mostly at mid and senior levels, is evaluating features built on a large language model, an LLM. Experimenting on AI features, where the treatment is itself random. Checking code and analysis an assistant wrote. And rounds where AI is allowed, or banned. Ask the recruiter, round by round.",
      pauseAfter: 0.7,
    },
    { id: "measure-in", text: "Most of what follows is about the first of those. Questions five and seven take the next two." },

    // ── 2. Measuring quality ──────────────────────────────────────────────
    {
      id: "measure",
      scene: true,
      text: "Question two. How would you measure the quality of an LLM feature, like drafted support replies? Start from the decision, not the metric. Agree on what a good reply is: correct, complete, on policy, the right tone. Then turn that into a rubric, pass or fail on each.",
      pauseAfter: 0.6,
    },
    {
      id: "measure-steps",
      text: "Sample real traffic, split by intent and difficulty, so the rare cases are in it. Have experts label a subset, with two raters on some items, to see how much humans agree. Score every version on the same items. And report the uncertainty, because a pass rate with no interval invites people to ship noise.",
      pauseAfter: 0.7,
    },
    { id: "size-in", text: "That last step is where most eval sets come up short." },

    // ── 3. How large an eval set ──────────────────────────────────────────
    {
      id: "size",
      scene: true,
      text: "Question three. How large does an eval set need to be? Large enough that the difference you care about beats the sampling error. With a hundred items, a pass rate of eighty percent means anywhere from seventy-two to eighty-eight. A prompt change worth three points can't show up.",
      pauseAfter: 0.6,
    },
    {
      id: "size-root",
      text: "The interval narrows with the square root of n, so four times the items only halves it.",
      pauseAfter: 0.6,
    },
    {
      id: "size-pair",
      text: "Two habits help more than raw size. First, pair the comparison. On five hundred items of our own, version B passes eighty-two percent and version A seventy-nine. Read as two separate samples, that's a p-value of point two three. But both ran on the same items, so only the thirty-five where they disagree carry information: twenty-five go to B, ten to A. McNemar's test on those gives point oh two.",
      pauseAfter: 0.6,
    },
    {
      id: "size-strat",
      text: "Second, stratify, so a regression on a small slice isn't averaged away.",
      pauseAfter: 0.7,
    },

    // ── 4. Trusting a judge ───────────────────────────────────────────────
    {
      id: "judge",
      scene: true,
      text: "Question four. How do you know whether an LLM judge can be trusted? Treat it as an instrument, and calibrate it against experts on the same items. Here, judge and expert each mark ninety percent of replies as a pass, and they agree on ninety percent of items.",
      pauseAfter: 0.6,
    },
    {
      id: "judge-chance",
      text: "That sounds strong, but two raters who mostly say pass agree often by chance.",
    },
    {
      id: "judge-pe",
      text: "Here, chance alone gives eighty-two percent: both pass, point nine times point nine, plus both fail, point one times point one.",
      pauseAfter: 0.6,
    },
    {
      id: "judge-kappa",
      text: "Cohen's kappa takes chance out: point oh eight above chance, out of a possible point one eight, is point four four. Moderate. A judge that never read a reply and always said pass would agree ninety percent of the time too. Its kappa is zero.",
      pauseAfter: 0.6,
    },
    {
      id: "judge-bias",
      text: "Then test its known biases: a pull toward the first answer shown, toward longer answers, and toward its own model family. And compare it with how well the experts agree with each other. A judge can't beat the humans it imitates.",
      pauseAfter: 0.7,
    },
    { id: "ab-in", text: "Offline scores only decide what's worth trying on real users." },

    // ── 5. A B testing an LLM feature ─────────────────────────────────────
    {
      id: "ab",
      scene: true,
      text: "Question five. How do you A B test an LLM feature? The usual machinery, with four adjustments. Randomize by user, and keep it sticky across sessions, so nobody sees both arms. Expect more variance: the same input gives different outputs, so the treatment is a distribution. Size the test from an A A test, both arms identical, or from a pilot.",
      pauseAfter: 0.6,
    },
    {
      id: "ab-pin",
      text: "Pin the model version. A provider can update a model under the same name mid-test, and then the treatment changes halfway through. Log the version on every request. And add guardrails: latency at the ninety-fifth percentile, called p ninety-five, cost per active user, refusals, and hand-offs to a human. Better but twice as slow can still be a loss.",
      pauseAfter: 0.7,
    },
    { id: "prev-in", text: "Next, the model as the measuring tool itself." },

    // ── 6. Correcting a classifier's count ────────────────────────────────
    {
      id: "prev",
      scene: true,
      text: "Question six. You use an LLM to sort a million support tickets. How do you report the share that are complaints? Not as the share it labels complaints, because its errors bias that number. Check it on a hand-labeled sample: it catches ninety percent of real complaints, and wrongly flags five percent of everything else.",
    },
    {
      id: "prev-terms",
      text: "So its sensitivity is ninety percent, and its specificity, the share of the rest it leaves alone, is ninety-five percent.",
      pauseAfter: 0.6,
    },
    {
      id: "prev-fix",
      text: "Twenty percent come back labeled complaints. But five percent of the large majority that aren't complaints adds up to a lot of false alarms.",
    },
    {
      id: "prev-sum",
      text: "The twenty percent is ninety percent of the true share, plus five percent of everything else.",
    },
    {
      id: "prev-correct",
      text: "Correct for both errors, and the share is about seventeen point six percent.",
    },
    {
      id: "prev-rg",
      text: "That's the Rogan-Gladen estimator. Report its interval too, since both error rates came from a sample.",
      pauseAfter: 0.7,
    },
    { id: "check-in", text: "And the last of the seven: the assistant's own work." },

    // ── 7. Checking an assistant's analysis ───────────────────────────────
    {
      id: "check",
      scene: true,
      text: "Question seven. How do you check an analysis an AI assistant wrote? The way you'd check a junior colleague's notebook, with extra suspicion where assistants slip. First, silent data loss: a join that quietly drops a third of the rows. Count rows at every step.",
      pauseAfter: 0.6,
    },
    {
      id: "check-list",
      text: "Then leakage, like a scaler fit on all the data before the split. The wrong test, like a t-test on skewed revenue, or twenty segments compared with no correction, which gives a sixty-four percent chance of at least one false alarm. Columns or functions that don't exist. And causal claims the analysis can't support. Finally, reproduce the headline number another way.",
      pauseAfter: 0.7,
    },

    // ── Quickly ───────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Two more, and both are about numbers that look better than they are.",
      pauseAfter: 0.5,
    },
    {
      id: "r-thumbs",
      text: "Why is a thumbs-up rate a weak primary metric? Few people click, the ones who do aren't typical, and it rewards a confident tone over a correct answer. Track what people do next: the ticket stays closed, the suggested code is still there a week later, nobody asks again.",
    },
    {
      id: "r-contam",
      text: "And benchmark contamination. If a public benchmark's test items were in a model's training data, its score measures memory, not skill. Don't pick a model on leaderboards alone. Keep your own eval set private, refresh it with recent cases, and never train on it.",
      pauseAfter: 0.9,
    },
    {
      id: "close",
      text: "Every round on this track came back to one question: how sure are you, and how would you know?",
      pauseAfter: 0.8,
    },
    {
      id: "close-practice",
      text: "Each page has concept checks to try, most have code you can run, and a bank of a hundred and ten multiple-choice questions closes the track, so you can find the rounds that still need work.",
    },
  ],
};
