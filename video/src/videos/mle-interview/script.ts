import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "The interview, now" (16:9), Part 0 of the Machine Learning
 * Engineer interview prep videos
 * (agent-outputs/20261120-1400-machine-learning-engineer-interview-video-plan.md,
 * "0, The interview, now"), after
 * content/interview/machine-learning-engineer/index.mdx and
 * llm-systems-and-evals.mdx's "How has the ML Engineer interview changed with
 * LLMs?", which it answers ("llm" to "llm-ask"), with the page's intro
 * ("ML system design rounds used to mean ...") as the hook: the rounds and
 * what they probe, what LLMs added, the map of the series, the practice, and
 * the bridge into Part 1.
 *
 * An overview: no question cards. Its own opening, unlike the capybara's two
 * follow-ups or the Data Scientist route: the system design prompt then and
 * now, in the page's words, "Design a fraud detection system" above "Design
 * an assistant over our documents" and "This LLM feature is too slow and too
 * expensive. Fix it.", with the red panda beside them, because the second
 * pair is what Parts 9 and 10 answer and the first is what Parts 1 to 8 do.
 *
 * On screen, scene by scene (for phase 2; nothing is built yet): plain text
 * grouped by spacing and hairlines, no cards, the red panda plus two spots
 * (an open coin purse, for "too expensive", and a whiteboard marker for the
 * rounds; Part 3 already has a stopwatch, so "too slow" is left to the
 * words). Colors keep the series' meanings: yellow is what the narration
 * points at, blue is data, and nothing here is a trap or an answer, so
 * nothing is red or green.
 *   - "hook", "hook-now": the classic prompt, "Design a fraud detection
 *     system.", inked in the serif as said; then the two new prompts below
 *     it, "Design an assistant over our documents." and "This LLM feature is
 *     too slow and too expensive. Fix it.", each on its words, the coin purse
 *     beside the second, small. The red panda at the right.
 *     The classic prompt stays in full ink: it is still asked ("just as
 *     often"), so it is not struck or faded. "hook-both" lights the classic
 *     prompt and then the two new ones, on "still asks" and "added".
 *   - "rounds" to "rounds-more": the three rounds as three columns with
 *     hairlines between, "Coding", "ML concepts", "ML system design", the
 *     marker spot beside the third; then,
 *     on "four areas", a ruled list under them, the page's four probes, each
 *     name lit yellow as said and its topics as a line of words after it
 *     ("supervised vs unsupervised, over/underfitting, regularization,
 *     metrics, leakage"; "data structures and algorithms, NumPy, pandas";
 *     "training and serving pipelines, feature stores, batch vs online
 *     inference, monitoring and drift"; "reproducibility, versioning data and
 *     models, CI/CD, latency and cost"). Each row carries, small and
 *     right-aligned, the parts that answer it (data.ts PROBES): "Parts 1 and
 *     2", "Part 3", "Parts 7 and 8" (monitoring and drift are Part 8's),
 *     "Parts 7 and 8" (latency and cost are Part 7's). So the map starts
 *     here. The first two rows ink in on
 *     "rounds-probe", the last two on "rounds-ops".
 *     "rounds-more" adds one more row under a hairline, set apart, "Also on
 *     the track: statistics, deep learning, NLP and LLMs", with "Parts 4,
 *     5 and 6".
 *   - "llm" to "llm-ask": "Classical ML didn't leave" as the headline; under
 *     it the page's four additions as a numbered list, the four names inking
 *     on "four things" and each lit, with its part right-aligned (data.ts
 *     ADDED) and its topics, on its own beat: application design,
 *     "Parts 6 and 10" (retrieval in 6, tool use and agents in 10);
 *     inference economics, "Part 9", its topics in the index's words (the
 *     KV cache; batching, quantization and speculative decoding); evaluation,
 *     "Part 10"; when not to use an LLM, "Part 10", with the cases
 *     "llm-not-when" names. "llm-ask" sets "Ask the recruiter about each round"
 *     under the list, with "AI-on coding rounds at some companies" above it.
 *   - "series" to "next": "Decisions, and how you'd know" as the headline,
 *     with the four phrases of "series" as a line of words under it, each lit
 *     as said; then the ten topic videos as a bar chart of the page
 *     questions each answers (data.ts PARTS, 13 to 31 a bar, 4 and 6 for the
 *     LLM parts), each bar topped by its own small hero, in series order,
 *     rising as "series-parts" names them; the total "166 + 1 = 167" in
 *     blue on "a hundred and sixty-seven", with "questions two pages share:
 *     answered once" as a small note under it on "share"; the practice line
 *     beneath (concept checks on all 8 topic pages, 5 challenges on 3 of
 *     them, 110 in the bank); <NextLine> "Next: generalization and
 *     evaluation" on "Next", with Part 1's bar lit.
 *
 * Facts, all from the pages or counted (check.mjs into results.json, which
 * data.ts reads; check.mjs fails if a page stops saying what the narration
 * quotes, if a page's question count stops matching the parts that answer
 * it, or if the narration stops saying what was counted):
 *   - "hook", "hook-now": llm-systems-and-evals.mdx's intro ("ML system
 *     design rounds used to mean "design a recommender" or "design fraud
 *     detection" ... just as often "design an assistant over our documents"
 *     or "this LLM feature is too slow and too expensive; fix it"").
 *   - "rounds": index.mdx, "Expect a coding/DSA round, an ML-concepts round,
 *     and an ML system design round". The page names three rounds and four
 *     areas probed across them; the plan's "the four rounds" is the four
 *     areas, and the narration says it the page's way.
 *   - "rounds-probe", "rounds-ops": index.mdx, "What interviewers probe",
 *     the four bullets, two to a beat.
 *     "rounds-more": the index's "Topics" list, whose statistics, deep
 *     learning and NLP pages are none of the four probes; the plan gives
 *     each a part (4, 5 and 6).
 *   - "hook-both": the video's own framing of the plan's two halves (Parts 1
 *     to 8, and 9 and 10).
 *   - "llm" to "llm-not": llm-systems-and-evals.mdx, "How has the ML Engineer
 *     interview changed with LLMs?" ("Classical ML did not leave: expect bias
 *     and variance, leakage, metrics, and a coding round"; the four bold
 *     items, nearly verbatim). On screen, "llm-econ"'s topics take the
 *     index's wording of the same item ("where GPU memory goes (the KV
 *     cache), and what batching, quantization, and speculative decoding
 *     buy").
 *   - "llm-not-when": the same answer's "which is the question that
 *     separates candidates who have shipped from those who have only
 *     prototyped", and the cases from the page's "When should you not use an
 *     LLM?" ("When a smaller model or a rule does the job better ...: tabular
 *     prediction, strict latency or cost budgets, ... or a task a regular
 *     expression solves").
 *   - "llm-ask": index.mdx, "AI-on coding rounds at some companies. Ask the
 *     recruiter about each round."
 *   - "series": the plan's "What the series is for" ("why a model fails on
 *     new data, which model and loss fit a problem, what a serving system
 *     costs, and how you would know it broke").
 *   - "series-count", "series-parts": the track's eight topic pages ask 167
 *     questions (check.mjs counts their `###` headings). This overview
 *     answers one (the LLM page's "How has the ML Engineer interview changed
 *     with LLMs?"), and the ten topic videos the other 166, each once: the
 *     plan's "Which video answers which question", held in data.ts (PARTS,
 *     by page), and its "Check" line, which check.mjs reads from the plan
 *     and compares with PARTS term by term. Nineteen of the 166 are asked on
 *     two pages and answered once for both (the plan's "together"; PARTS
 *     `together`), so 147 answers cover them.
 *   - "practice": counted by check.mjs: concept checks on all 8 topic pages,
 *     5 runnable challenges on 3 of them (ml-fundamentals 1, coding 3,
 *     statistics 1), and a bank of 110 multiple-choice questions.
 *   - "next": the plan's bridge into Part 1 ("classical ML did not leave,
 *     and the first thing every ML round tests is whether a model works on
 *     data it has not seen").
 *
 * Written for Drew's ear: ML, LLM, AI, GPU and NLP in plain caps (LLM is
 * expanded once, in "hook-both", the first time it is said outside the
 * quoted prompt: expanding it inside "hook-now" would break the prompt's
 * own words); MLOps is in the lexicon ("em-el-ops"); CI/CD is written "CI
 * CD" in the narration only (two plain-caps initialisms, so the voice reads
 * the letters and no slash, as Part 8 does), and stays "CI/CD" on screen
 * and in check.mjs's page quote; NumPy and pandas as written; no sentence opens with
 * "A" before an initialism; numbers as they are said.
 */
export const script: NarrationScript = {
  id: "mle-interview",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    {
      id: "hook",
      scene: true,
      text: "Design a fraud detection system. That's the classic machine learning system design prompt.",
      pauseAfter: 0.6,
    },
    {
      id: "hook-now",
      text: "Now it's just as often: design an assistant over our documents. Or: this LLM feature is too slow and too expensive. Fix it.",
      pauseAfter: 0.8,
    },
    {
      id: "hook-both",
      text: "These videos cover both kinds: what every ML round still asks, and what large language models, LLMs, added.",
      pauseAfter: 0.8,
    },
    {
      id: "rounds",
      scene: true,
      text: "Expect three rounds: coding, ML concepts, and ML system design. Across them, interviewers probe four areas.",
      pauseAfter: 0.6,
    },
    {
      id: "rounds-probe",
      text: "ML fundamentals: supervised and unsupervised learning, over- and underfitting, regularization, metrics and leakage. Coding: data structures and algorithms, plus NumPy and pandas.",
      pauseAfter: 0.5,
    },
    {
      id: "rounds-ops",
      text: "System design: training and serving pipelines, feature stores, batch or online inference, monitoring and drift. And MLOps: reproducibility, versioning data and models, CI CD, latency and cost.",
      pauseAfter: 0.6,
    },
    {
      id: "rounds-more",
      text: "The track adds pages on statistics, deep learning, and NLP and LLMs, and each of those gets a part too.",
      pauseAfter: 0.8,
    },
    {
      id: "llm",
      scene: true,
      text: "Classical ML didn't leave when LLMs arrived: bias and variance, leakage, metrics and a coding round are all still asked. What LLMs added is four things.",
      pauseAfter: 0.6,
    },
    {
      id: "llm-design",
      text: "Application design: retrieval, prompting, tool use, guardrails and fallbacks, drawn as a system with budgets for latency and cost.",
      pauseAfter: 0.5,
    },
    {
      id: "llm-econ",
      text: "Inference economics: why generation is slow, where the GPU memory goes, and which lever buys what.",
      pauseAfter: 0.5,
    },
    {
      id: "llm-eval",
      text: "Evaluation with no single right answer: building a test set, trusting or distrusting an automated judge, and tying offline scores to online outcomes.",
      pauseAfter: 0.5,
    },
    { id: "llm-not", text: "And judgment about when not to use an LLM at all.", pauseAfter: 0.55 },
    {
      // Added in review (2026-11-26): the page's own reason for asking it, and
      // the cases from its "When should you not use an LLM?", so the answer
      // survives "so when wouldn't you?".
      id: "llm-not-when",
      text: "It's the question that separates candidates who've shipped from those who've only prototyped. Often a smaller model or a rule does the job better: tabular prediction, a strict latency or cost budget, or a task a regular expression solves.",
      pauseAfter: 0.7,
    },
    {
      id: "llm-ask",
      text: "Some companies also run coding rounds with an AI assistant allowed, so ask the recruiter about each round.",
      pauseAfter: 0.8,
    },
    {
      id: "series",
      scene: true,
      text: "This series argues the decisions behind the answers: why a model fails on new data, which loss fits a problem, what serving costs, and how you'd know it broke.",
      pauseAfter: 0.6,
    },
    {
      id: "series-count",
      text: "The track's pages ask a hundred and sixty-seven questions. This video answers one. Ten more answer the rest, each once, and a question two pages share is answered once for both.",
      pauseAfter: 0.6,
    },
    {
      id: "series-parts",
      text: "First generalization, then the models and how they learn, coding, statistics, deep learning, and NLP. Then system design, and shipping and monitoring models. Last, the two LLM parts: serving them, and evaluating them.",
      pauseAfter: 0.6,
    },
    {
      id: "practice",
      text: "Every topic page has concept checks, five challenges run in the browser, and a hundred and ten multiple-choice questions cover the whole track.",
      pauseAfter: 0.8,
    },
    {
      id: "next",
      text: "So the first thing an ML round still tests is whether a model works on data it hasn't seen. Next: generalization and evaluation.",
    },
  ],
};
