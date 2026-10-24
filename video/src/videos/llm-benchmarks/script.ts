import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";
import { INTRO_LEAD_IN } from "../../editorial/intro.ts";

/**
 * Narration for "Is it good enough?" (16:9), Unit 5 of How Large Language
 * Models Work, the course's last video. One argument in three parts, after
 * content/courses/how-llms-work/what-benchmarks-measure.mdx,
 * benchmark-pitfalls.mdx and evaluating-for-your-task.mdx:
 *
 *   1. What benchmarks measure ("hook" to "read-in"): it opens on the last
 *      lever of Unit 4, "route to the cheapest model that passes", which needs
 *      a test to pass; a benchmark as a fixed set of questions with known
 *      answers; the four families the lesson names; and reading a score by
 *      where it sits on the scale.
 *   2. Four pitfalls ("saturation" to "own-in"): saturation, contamination,
 *      selective reporting (the harness), construct mismatch, and the four
 *      questions to ask of any row of a launch table.
 *   3. Your own evaluation ("own" to "end"): how many examples, the harness
 *      and its failure list, scoring answers with no exact match, and cost
 *      per correct answer. It closes the course on its last idea, measure
 *      your own task instead of reading leaderboards, so there is no
 *      NextLine.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every computed number on screen is the output of the lessons' own
 * code blocks, re-run by measure.py (Python 3.13, NumPy 2.4.6, the site's
 * Pyodide version) into measurements.json, which data.ts reads; measure.py
 * fails unless each block prints exactly what the page prints
 * (lib/generated/block-outputs.json). Scores the lessons quote in prose are
 * kept in measurements.json's "quoted", each with its line in the lesson.
 *   - The four tiers and their prices (Fig. 1) are the cost block's in
 *     evaluating-for-your-task, October 2026, which agree with
 *     pricing-structure.mdx's table: input from $0.10 (haiku) to $10.00
 *     (fable) a million tokens. "The cheapest model that passes" is
 *     controlling-cost.mdx's first lever.
 *   - The launch table (Fig. 2) and the scale (Fig. 4) are
 *     what-benchmarks-measure's "How to read a score" block: MMLU 92.3
 *     against 91.7 under a ceiling of 95, GPQA Diamond 96.0 against 95.4, and
 *     ARC-AGI-3 62.7 against 30.2. "Six tenths of a point" is its gap of
 *     0.006; the cap near ninety-five from "documented label errors" (said
 *     as "some of its answer keys are wrong") and "noise" are the lesson's
 *     prose. Its block now replays two equally good models to show how far
 *     luck alone separates them (seed 0): 0.63 points on MMLU's 14,042
 *     questions and 4.04 on GPQA Diamond's 198, so both 0.6-point gaps are
 *     "within luck"; 14.00 on ARC-AGI-3 at 100 tasks, against a 32.5-point
 *     gap. The video does not draw those; it agrees with them.
 *   - The families (Fig. 3) are the lesson's: MMLU, 57 subjects of multiple
 *     choice "from elementary mathematics to professional law"; GPQA
 *     Diamond, non-expert PhD holders with web access around 34%;
 *     SWE-bench Verified, real GitHub issues, passed by the repository's own
 *     tests; ARC-AGI-2's grid puzzles and ARC-AGI-3's interactive games.
 *   - Saturation (Fig. 5): every frontier system above 92% on MMLU and the
 *     ceiling near 95%, so every frontier model sits inside those three
 *     points (the band the tell's bracket spans); GPQA Diamond's leaders
 *     around 95%, saturated by 2026 per the lesson, so its row is struck too;
 *     Humanity's Last Exam under 10% at its January 2025 release and around
 *     60% by September 2026 ("twenty months later"); the three-point tell is
 *     benchmark-pitfalls'.
 *   - Contamination (Fig. 6) is benchmark-pitfalls' first block, its four
 *     situations and what the score reports for each. OpenAI stopped
 *     reporting SWE-bench Verified in February 2026 after frontier models
 *     reproduced some reference fixes from memory; the defenses are the
 *     lesson's (private holdouts, monthly refreshes, date filtering).
 *   - The harness (Fig. 7): ARC Prize's run of GPT-6 Astra on ARC-AGI-3,
 *     September 2026, benchmark-pitfalls' "Selective reporting" and its
 *     footnote: 62.7% in ARC's standard harness ($26,098), 99.9% in OpenAI's
 *     ($18,817), "for less money".
 *   - Construct mismatch and the four questions (Figs. 8, 9) are
 *     benchmark-pitfalls' section 4 ("A benchmark measures performance on
 *     the benchmark. Whether that transfers to your task depends entirely on
 *     whether your task resembles it") and "Reading a launch table well", its
 *     seven checks grouped under the four pitfalls. "Tasks like SWE-bench
 *     still predict agentic coding" is what-benchmarks-measure's "the task
 *     shape is still the right one", after the single public set lost trust.
 *   - How many examples (Figs. 10 to 12) is evaluating-for-your-task's simulation
 *     (seed 7, 2,000 sets per size): true rates 80% and 65%; 20 examples
 *     rank them right 81.3% of the time ("about four times in five"), 50
 *     examples 94.2% ("ninety-four times in a hundred"). The two histograms
 *     are that run's own 2,000 pairs of scores at n = 20: the better model
 *     ahead in 1,626, tied in 155, behind in 219. "Pick on cost" is the
 *     lesson's advice after its true_b = 0.78 variant, which Fig. 12 draws
 *     beside the main run (the same seed, re-run): a 2-point gap is ranked
 *     right 37.5% of the time at 5 examples and only 59.5% at 100. The
 *     lesson now says "about four times in five" at twenty too (it once
 *     said "almost always").
 *   - The harness (Fig. 13) is the lesson's block: ten tickets, two stand-in
 *     models; the cheap one 30%, the other 100%; every miss of the cheap one
 *     is "other".
 *   - Scoring without an exact answer (Fig. 14) is the lesson's three
 *     approaches, in its order; "a summary" with "the three facts" and "the
 *     length limit" is its example, and the judge's preference for longer
 *     answers is the lesson's.
 *   - Cost (Fig. 15) is the lesson's block: 700 tokens in, 25 out, a million
 *     requests a month; accuracies 91, 94, 95 and 95%, which the lesson calls
 *     illustrative ("say"); monthly $83, $1,650, $3,300 and $8,250. "One
 *     point for twice the money" and "two and a half times the price" are
 *     its printed lines.
 *     The verdict prices each step up per error it avoids (measure.py), as
 *     the lesson's prose now does too (it once said a minute of triage made
 *     the cheap model win, which its own table contradicts). Haiku to
 *     Sonnet removes 30,000 errors a month (9% to 6% of a million) for
 *     $1,567.50 more, about 5.2 cents an error;
 *     Sonnet to Opus removes 10,000 for $1,650, 16.5 cents; Opus to Fable
 *     none. A minute of anyone's time costs more than 5 cents, so at a
 *     minute of triage the cheap model is the expensive one ("cost-error",
 *     "cost-verdict", re-voiced and added in the fix pass).
 *   - The close is the lesson's callout "Build it once, use it forever":
 *     the harness outlives every model in it, and a new release is answered
 *     about your own task in an hour.
 *
 * Written for Drew's voice, casual and curious: short spoken sentences,
 * numbers as words, contractions, questions the next sentence answers. For
 * the ear, ARC-AGI is written "Arc AGI" and ARC Prize "Arc Prize" (captions
 * are off, so the respelling never reaches the screen), and GPT-6 "GPT six".
 */
export const script: NarrationScript = {
  id: "llm-benchmarks",
  voice: "drew",
  // The series intro plays first; its lead-in lives in editorial/intro.ts.
  leadIn: INTRO_LEAD_IN,
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Part 1. What benchmarks measure ──────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Send every request to the cheapest model that passes.",
      pauseAfter: 0.5,
    },
    { id: "passes", text: "[curious] But passes what? Somebody has to write the test.", pauseAfter: 0.7 },
    {
      id: "table",
      text: "And every model launch comes with a table of scores that looks like one.",
      pauseAfter: 0.6,
    },
    { id: "hook-in", text: "So what are those benchmarks measuring?" },

    {
      id: "families",
      scene: true,
      text: "Each is a fixed set of questions with known answers.",
      pauseAfter: 0.7,
    },
    { id: "mmlu", text: "MMLU is multiple choice across fifty-seven subjects, from elementary math to law.", pauseAfter: 0.7 },
    {
      id: "gpqa",
      text: "GPQA Diamond is graduate science: PhDs from other fields, even with the web, score about thirty-four percent.",
      pauseAfter: 0.7,
    },
    {
      id: "swe",
      text: "SWE-bench hands over a real GitHub issue, and the patch has to pass the project's own tests.",
      pauseAfter: 0.7,
    },
    {
      id: "arc",
      text: "And Arc AGI asks for the rule behind a few grid puzzles, or in version three, the rules of a game, by playing it.",
      pauseAfter: 0.6,
    },

    { id: "read", scene: true, text: "Reading a score starts with where it sits on the scale.", pauseAfter: 0.5 },
    {
      id: "mmlu-gap",
      text: "On MMLU, ninety-two point three beats ninety-one point seven. But some of its answer keys are wrong, so about ninety-five is the most anyone can score.",
      pauseAfter: 0.6,
    },
    { id: "noise", text: "Six tenths of a point, that close to the ceiling, is noise.", pauseAfter: 0.9 },
    {
      id: "arc-gap",
      text: "On Arc AGI three, sixty-two point seven against thirty point two, with room above both, is a real difference.",
      pauseAfter: 0.9,
    },
    { id: "read-in", text: "That crowded ceiling is the first of four ways a launch table misleads." },

    // ── Part 2. Four pitfalls ────────────────────────────────────────────
    {
      id: "saturation",
      scene: true,
      text: "One, saturation. Once everyone scores near the top, a test can't tell them apart.",
      pauseAfter: 0.7,
    },
    {
      id: "sat-now",
      text: "Every frontier model clears ninety-two on MMLU. GPQA Diamond, built to replace it, has its leaders around ninety-five.",
      pauseAfter: 0.7,
    },
    {
      id: "sat-fast",
      text: "And tests fill up fast. Humanity's Last Exam went from every model under ten percent to the best near sixty, in twenty months.",
      pauseAfter: 0.7,
    },
    { id: "sat-tell", text: "The tell: if every model in a row sits within three points, skip the row.", pauseAfter: 0.8 },

    {
      id: "contam",
      scene: true,
      text: "Two, contamination. Test questions get published, published text gets crawled, and crawled text becomes training data.",
      pauseAfter: 0.6,
    },
    {
      id: "memory",
      text: "So a model that memorized the answers and one that can do the work report the same high score.",
      pauseAfter: 0.9,
    },
    {
      id: "swe-drop",
      text: "That's why OpenAI stopped reporting SWE-bench Verified in February: models could recite some of its fixes.",
      pauseAfter: 0.6,
    },
    {
      id: "defense",
      text: "The defense is a test it can't have seen: kept private, or newer than its training.",
      pauseAfter: 0.6,
    },

    {
      id: "select",
      scene: true,
      text: "Three, selective reporting. A launch post picks its benchmarks, its rivals and its settings.",
      pauseAfter: 0.6,
    },
    {
      id: "astra",
      text: "Arc Prize ran GPT six Astra on Arc AGI three in two harnesses, the code wrapped around a model.",
      pauseAfter: 0.6,
    },
    {
      id: "astra-scores",
      text: "In Arc's standard one, sixty-two point seven. In OpenAI's, which kept its hidden reasoning between moves, ninety-nine point nine, for less money.",
      pauseAfter: 0.8,
    },
    { id: "astra-same", text: "Same model, same test, same week. Only the first number compares with anyone else's.", pauseAfter: 0.8 },

    {
      id: "mismatch",
      scene: true,
      text: "Four, the deepest: construct mismatch. A benchmark measures performance on the benchmark, and that only carries over if your task looks like it.",
      pauseAfter: 0.8,
    },
    {
      id: "transfer",
      text: "Tasks like SWE-bench still predict agentic coding, because they look like the job. They say almost nothing about reading your invoices.",
      pauseAfter: 0.6,
    },
    {
      id: "third",
      text: "So a model that ranks third everywhere can still be the best one for you, and no leaderboard will say so.",
      pauseAfter: 0.8,
    },
    {
      id: "checklist",
      text: "Ask four things of any row. All within three points? Could the model have seen it? Whose harness ran it? Does the task look like yours?",
      pauseAfter: 0.7,
    },
    { id: "own-in", text: "If the last answer is no, there's one way to find out." },

    // ── Part 3. Your own evaluation ──────────────────────────────────────
    {
      id: "own",
      scene: true,
      text: "So measure it yourself. Collect real examples with known answers, run each candidate, score automatically, and compare.",
      pauseAfter: 0.6,
    },
    { id: "howmany", text: "[curious] How many examples? Fewer than you'd think.", pauseAfter: 0.6 },
    {
      id: "sim",
      text: "Take one model that's right eighty percent of the time and one that's right sixty-five. Score each on twenty examples, again and again.",
      pauseAfter: 0.6,
    },
    { id: "twenty", text: "The better one comes out ahead about four times in five.", pauseAfter: 0.8 },
    { id: "fifty", text: "With fifty examples, ninety-four times in a hundred.", pauseAfter: 0.8 },
    {
      id: "close",
      text: "And if two still look close after thirty examples, they probably are. Pick on cost.",
      pauseAfter: 0.6,
    },

    {
      id: "harness",
      scene: true,
      text: "The harness is just a loop. Here are ten tickets, each with its right queue, and two stand-in models.",
      pauseAfter: 0.5,
    },
    { id: "scores", text: "The cheap one routes three of them right. Thirty percent. The other gets all ten.", pauseAfter: 0.8 },
    {
      id: "misses",
      text: "But read the misses. The cheap one sent all seven to other. Whether that hurts depends on who reads that queue.",
      pauseAfter: 0.7,
    },

    {
      id: "freetext",
      scene: true,
      text: "Free text is harder to score. First choice: make the output checkable, with fields to compare.",
      pauseAfter: 0.5,
    },
    {
      id: "props",
      text: "Next: score properties. Say it writes a summary: does it name the three facts, and stay under the limit?",
      pauseAfter: 0.6,
    },
    {
      id: "judge",
      text: "Last: have a strong model grade it on a rubric, knowing judges favor longer answers.",
      pauseAfter: 0.8,
    },

    {
      id: "cost",
      scene: true,
      text: "Then put cost beside accuracy. Say four tiers score ninety-one to ninety-five percent on a million requests a month.",
      pauseAfter: 0.6,
    },
    {
      id: "cost-gaps",
      text: "Opus buys one point over Sonnet, for twice the money. Fable buys nothing over Opus, at two and a half times the price.",
      pauseAfter: 0.8,
    },
    {
      id: "cost-error",
      text: "So price the errors. Sonnet's three points mean thirty thousand fewer a month, at about five cents each.",
      pauseAfter: 0.8,
    },
    // The lesson's own table, priced per error (see the header). Voiced in
    // the fix pass.
    {
      id: "cost-verdict",
      text: "If a mistake costs even a minute of someone's time, the cheap model is the expensive one.",
      pauseAfter: 0.9,
    },

    {
      id: "end",
      scene: true,
      text: "Build that harness once, and it outlives every model in it.",
      pauseAfter: 0.6,
    },
    {
      id: "last",
      text: "When the next one launches, skip its table. Run your examples, and in an hour you'll know if it's good enough.",
    },
  ],
};
