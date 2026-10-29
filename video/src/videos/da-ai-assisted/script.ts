import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "AI-assisted analysis" (16:9), Part 8 and the last of the
 * Data Analyst interview prep videos
 * (agent-outputs/20261021-2314-data-analyst-interview-video-plan.md), after
 * content/interview/data-analyst/ai-assisted-analysis.mdx. It answers the
 * page's nine questions: six in full, numbered aloud, then three short ones
 * (numbered 7 to 9 on screen only), and closes the series by pointing to the
 * track's 110-question bank.
 *
 *   1. how the interview changed ("changed").
 *   2. checking a query an assistant wrote ("check").
 *   3. the mistakes generated queries make, led by the page's date boundary
 *      ("mistakes").
 *   4. hallucinated insights ("hallucinate").
 *   5. what never goes into an AI tool; 6. walking through AI use on a
 *      take-home ("privacy").
 *   Short ones ("rapid-in"): prompting for SQL; AI in BI tools; labeling
 *   survey responses with an LLM.
 *
 * The opening is written fresh rather than in the earlier parts' words (asked
 * for on 2026-10-22): no numbered tiles or "hide a trap", no bar of segments;
 * the assistant's own query arrives and is questioned line by line. The
 * series ends on a closing line rather than a "Next:" bridge.
 *
 * Abbreviations are spelled out the first time they are spoken (asked for on
 * 2026-10-22): AI, BI, LLM.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every query and result on screen ran in DuckDB v1.4.3 (DuckDB-Wasm
 * 1.32.0, the engine the page's blocks run), by check.mjs into results.json,
 * which data.ts reads:
 *   - "mistakes", the page's nine orders and its query verbatim: the
 *     assistant's BETWEEN total is 405.50, the half-open total 840.50, so the
 *     assistant misses 51.8% of January ("more than half"); '2026-01-31' is
 *     midnight at the start of the 31st, so orders 7 and 8 drop out. The
 *     video's own two days (5 of 10 sessions, then 20 of 1,000): the average
 *     of the two rates is 26%, the pooled rate 2.5%.
 *   - "check": 10,000 orders becoming 14,000 rows is the page's own
 *     illustration, not a query result.
 *   - "hallucinate": "signups fell 12% because of the competitor's launch" is
 *     the page's own example sentence.
 *   - the question bank holds 110 questions (counted in
 *     multiple-choice-questions.mdx).
 *
 * Written for Drew's ear: "AI", "BI", "LLM" and "SQL" as said; money as
 * "four oh five fifty".
 */
export const script: NarrationScript = {
  id: "da-ai-assisted",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Most analysts now draft queries with an AI assistant, artificial intelligence that writes code from a plain request. Interviewers know it, and it has changed what they test: less can you write this query, more can you tell whether it's right.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "Nine questions finish the series. Six get a full answer, with a query to prove it where there is one. The last three are short.",
      pauseAfter: 0.7,
    },
    { id: "changed-in", text: "First, what the loop looks like now." },

    // ── 1. How the interview changed ──────────────────────────────────────
    {
      id: "changed",
      scene: true,
      text: "Question one. How has the data analyst interview changed with AI?",
      pauseAfter: 0.6,
    },
    {
      id: "changed-core",
      text: "The live SQL screen is still the center of it, and it's usually AI off, so fluency still matters.",
      pauseAfter: 0.6,
    },
    {
      id: "changed-around",
      text: "Around it, expect questions on verifying a query, on what you would and wouldn't share with a tool, on the AI features in BI tools, business intelligence tools like Power BI, Tableau and Looker, and deeper follow-ups on take-homes.",
      pauseAfter: 0.7,
    },
    {
      id: "changed-ask",
      text: "Ask the recruiter whether AI is allowed in each round. Policies differ, and they change often.",
      pauseAfter: 0.7,
    },

    // ── 2. Checking a query ───────────────────────────────────────────────
    {
      id: "check",
      scene: true,
      text: "Question two. An assistant wrote a query, and your manager wants the number today. How do you check it?",
      pauseAfter: 0.6,
    },
    {
      id: "check-read",
      text: "Read it as if a new colleague wrote it. State the grain: what one row means. Check row counts across every join. Ten thousand orders that come out as fourteen thousand rows are fanning out.",
      pauseAfter: 0.6,
    },
    {
      id: "check-filters",
      text: "Read each filter against the business definition: does revenue drop refunds and test accounts? And look for null traps, like NOT IN against a column with nulls.",
      pauseAfter: 0.6,
    },
    {
      id: "check-trust",
      text: "Then reconcile to a total you trust, like the finance report, follow three raw rows through by hand, and sanity-check the range.",
    },
    {
      id: "check-range",
      text: "A conversion rate over a hundred percent is a bug until proven otherwise.",
      pauseAfter: 0.7,
    },

    // ── 3. The mistakes generated queries make ────────────────────────────
    {
      id: "mistakes",
      scene: true,
      text: "Question three. What mistakes do AI generated queries make most often?",
      pauseAfter: 0.6,
    },
    {
      id: "mistakes-same",
      text: "The same ones people make, delivered with more confidence. The first is the date boundary.",
      pauseAfter: 0.5,
    },
    { id: "mistakes-recall", text: "Remember the opening query." },
    {
      id: "mistakes-between",
      text: "The assistant filtered January as between the first and the thirty-first. On a timestamp, the thirty-first means midnight at its start, so the rest of that day is gone.",
      pauseAfter: 0.6,
    },
    {
      id: "mistakes-totals",
      text: "Its total is four oh five fifty. A half-open range, from the first of January up to but not including the first of February, gives eight forty fifty.",
    },
    {
      id: "mistakes-missed",
      text: "The assistant missed more than half of January's revenue, all of it from the last day, and nothing in the query looks wrong.",
    },
    {
      id: "mistakes-precision",
      text: "Use the half-open range: it's right at any timestamp precision. Ending at one second to midnight would still lose that last second.",
      pauseAfter: 0.8,
    },
    {
      id: "mistakes-ratios",
      text: "Next, averaging ratios. One day converts five of ten sessions, the next twenty of a thousand.",
    },
    {
      id: "mistakes-average",
      text: "Average the two rates, and you get twenty-six percent, because a ten-session day counts as much as a thousand-session one. Divide all conversions by all sessions, and it's two point five percent.",
      pauseAfter: 0.7,
    },
    {
      id: "mistakes-rest",
      text: "Then fan-out, and the business rules it couldn't know, like test accounts and internal traffic. Those run without an error too. Invented columns and wrong-dialect functions fail loudly, so they're the harmless kind.",
    },
    {
      id: "mistakes-silent",
      text: "The silent ones are the danger.",
      pauseAfter: 0.7,
    },

    // ── 4. Hallucinated insights ──────────────────────────────────────────
    {
      id: "hallucinate",
      scene: true,
      text: "Question four. What is a hallucinated insight, and how do you keep one out of a report?",
      pauseAfter: 0.6,
    },
    {
      id: "hallucinate-what",
      text: "It's a claim the data doesn't support: a trend that isn't there, a number nobody computed, or a cause stated as fact. A language model writes fluent text whether or not the evidence is there.",
      pauseAfter: 0.6,
    },
    {
      id: "hallucinate-example",
      text: "Signups fell twelve percent because of the competitor's launch. Your query confirms the twelve percent.",
    },
    {
      id: "hallucinate-guess",
      text: "The because is a guess until you check it: did the drop start with the launch, and is it in the segments the competitor reached?",
      pauseAfter: 0.6,
    },
    {
      id: "hallucinate-rule",
      text: "So make it a rule: every number and every claim traces to a query or a cell you can point to.",
    },
    {
      id: "hallucinate-draft",
      text: "Let the model draft words around numbers you computed, and never let it compute them itself. Cut any cause you haven't tested.",
      pauseAfter: 0.7,
    },

    // ── 5, 6. Privacy, and owning your use of AI ──────────────────────────
    {
      id: "privacy",
      scene: true,
      text: "Question five. What data should never go into an AI tool?",
      pauseAfter: 0.6,
    },
    {
      id: "privacy-never",
      text: "Anything your company hasn't approved for that tool: customer personal data, credentials, confidential financials, and anything under a contract or a regulation, like health or payments.",
      pauseAfter: 0.6,
    },
    {
      id: "privacy-instead",
      text: "Most tasks don't need real rows at all. Share the schema and a few made-up ones. One careless paste can be a reportable data breach.",
      pauseAfter: 0.7,
    },
    {
      id: "takehome",
      text: "Question six. Walk me through how you used AI on this take-home.",
      pauseAfter: 0.6,
    },
    {
      id: "takehome-answer",
      text: "Be specific, and own the result. Say what you used it for, like boilerplate SQL, a regular expression, or chart code. Say what you didn't, like the metric definitions and the conclusions.",
    },
    {
      id: "takehome-checked",
      text: "And say how you checked it, like reconciling the total and tracing three rows by hand.",
      pauseAfter: 0.6,
    },
    {
      id: "takehome-hide",
      text: "Hiding it, then failing to explain a line, goes far worse than using it openly.",
      pauseAfter: 0.7,
    },

    // ── Three short ones ──────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Three short ones to finish.",
      pauseAfter: 0.5,
    },
    {
      id: "r-prompt",
      text: "To prompt for SQL, give it what a colleague would need: the dialect, the tables, the grain, the definitions and the task. Then ask for its assumptions, and a second query to check the total.",
    },
    {
      id: "r-bi",
      text: "AI in BI tools lets anyone ask a question in plain words, but it only answers correctly on top of defined metrics, clean and documented tables, and a semantic model that says how they join. Pointed at messy raw tables, it's confidently wrong at scale.",
    },
    { id: "r-bi-job", text: "So the analyst's job moves to building and checking those." },
    {
      id: "r-llm",
      text: "And to sort five thousand survey answers with an LLM, a large language model: fix the categories first, hand-label a hundred or two to measure it, keep the settings the same for every batch, rerun a sample to confirm the labels repeat, and quote real answers, not its paraphrases.",
      pauseAfter: 0.9,
    },
    {
      id: "close-two",
      text: "Whoever wrote the query, the interview asks the same two things: what one row means, and how you know the number is right.",
      pauseAfter: 0.7,
    },
    {
      id: "close",
      text: "That's the whole data analyst track. To practice, the question bank has a hundred and ten more, each with an explanation for every answer.",
    },
  ],
};
