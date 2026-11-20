// Computes every number the mle-llm-evals video says or shows, and writes
// results.json, which data.ts reads. No LLM, judge, retriever or agent runs
// here, and nothing below is any system's output or a benchmark. The
// numbers are arithmetic, each on inputs the page gives or on an assumption
// the narration says aloud:
//
//   - the judge (question 2): the page's third concept check, A preferred in
//     70% of pairs, then B winning 65% with B shown first. The first-shown
//     answer's win rate in each order, and the least share of pairs whose
//     verdict must have changed with the order (A's rate shown first less
//     its rate shown second: a pair that keeps its verdict adds the same to
//     both rates, so the gap can only come from pairs that changed).
//   - retrieval (question 3): the video's own three queries, one relevant
//     document each, ranked 1, 3 and not retrieved: recall@5 and MRR; and
//     the page's fourth concept check, recall@5 of 0.45.
//   - compounding (question 4): the page's 0.95^10, and the same formula at
//     0.99 over ten steps and 0.95 over five.
//   - pass@k and pass^k (question 5): one assumption said aloud, each
//     attempt succeeding 80% of the time independently, for k = 1 to 8.
//   - the practice (the close): concept checks and the question bank,
//     counted on the track's pages.
//
// Then it fails (exit 1) if the page stops saying what the narration quotes
// or a number the narration says stops matching. From the repo root:
//
//   node video/src/videos/mle-llm-evals/check.mjs
/* global console, process */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const track = join(here, "../../../../content/interview/machine-learning-engineer");
const read = (f) => readFileSync(join(track, f), "utf8");
const PAGE = "llm-systems-and-evals.mdx";
const page = read(PAGE);
const problems = [];
const check = (ok, what) => {
  if (!ok) problems.push(what);
};
const round = (v, d = 4) => Math.round(v * 10 ** d) / 10 ** d;
const R = {};

// ── 2. The judge that flips with the order ──────────────────────────────────
{
  const aWinsAFirst = 0.7; // the concept check: "prefers system A over system B in 70% of pairs"
  const bWinsBFirst = 0.65; // "B now wins 65% of them"
  const aWinsASecond = 1 - bWinsBFirst;
  R.position = {
    aWinsAFirst,
    bWinsAFirst: round(1 - aWinsAFirst),
    bWinsBFirst,
    aWinsBFirst: round(aWinsASecond),
    firstShownWins: round((aWinsAFirst + bWinsBFirst) / 2),
    flippedAtLeast: round(aWinsAFirst - aWinsASecond),
  };
}

// ── 3. Retrieval: three queries, and the concept check ──────────────────────
{
  const K = 5;
  const ranks = [1, 3, null]; // the one relevant document's rank, or not retrieved
  const recall = ranks.filter((r) => r !== null && r <= K).length / ranks.length;
  const rr = ranks.map((r) => (r === null ? 0 : 1 / r));
  const mrr = rr.reduce((a, b) => a + b, 0) / ranks.length;
  R.rag = { k: K, ranks, reciprocal: rr.map((v) => round(v)), recallAtK: round(recall), mrr: round(mrr) };
  const recallFollow = 0.45; // the page's fourth concept check
  R.recallFollow = { recallAt5: recallFollow, missing: round(1 - recallFollow) };
}

// ── 4. Reliability compounds ────────────────────────────────────────────────
{
  const run = (p, n) => ({ perStep: p, steps: n, task: round(p ** n) });
  R.chain = { page: run(0.95, 10), reliable: run(0.99, 10), shorter: run(0.95, 5) };
}

// ── 5. pass@k against pass^k ────────────────────────────────────────────────
{
  const p = 0.8; // an assumption said aloud: each attempt succeeds 4 times in 5, independently
  const ks = [1, 2, 3, 4, 5, 6, 7, 8];
  R.passK = {
    attempt: p,
    k: ks,
    passAtK: ks.map((k) => round(1 - (1 - p) ** k)),
    passHatK: ks.map((k) => round(p ** k)),
  };
}

// ── The close: practice on the track's pages, counted ───────────────────────
{
  const order = JSON.parse(read("meta.json")).pages.filter((x) => x !== "index" && x !== "multiple-choice-questions");
  const checks = order.map((x) => (read(`${x}.mdx`).match(/<MultipleChoice\b/g) ?? []).length);
  const all = JSON.parse(read("meta.json")).pages;
  check(all.at(-1) === "multiple-choice-questions", "the question bank is no longer the track's last page");
  R.practice = {
    topicPages: order.length,
    pagesWithConceptChecks: checks.filter((n) => n > 0).length,
    bank: (read("multiple-choice-questions.mdx").match(/<MultipleChoice\b/g) ?? []).length,
  };
}

// ── The page still says what the narration quotes ───────────────────────────
const quotes = [
  "### How do you evaluate an LLM application?",
  "### When can you trust an LLM as a judge?",
  "### How do you evaluate a RAG system?",
  "### What is an agent, and how does tool calling work?",
  "### How do you evaluate an agent?",
  "### When should you not use an LLM?",
  '"design an assistant over our documents"',
  "In layers, from cheap to expensive:",
  "A hundred or two well-chosen cases beat thousands of synthetic\n   ones; grow the set from real production failures.",
  "exact match or execution for\n   structured outputs (JSON, SQL, code), retrieval metrics for search, a\n   rubric-driven LLM judge for open-ended text",
  "catch what the metrics miss and to\n   check the automated judge",
  "rerun the suite on every prompt, model, or retrieval change,\n   and block regressions",
  "A/B tests on user outcomes, with guardrails on\n   latency, cost, and refusal rate",
  "many are saturated, and their\ntest items may have leaked into training data",
  "connecting offline scores to online outcomes",
  "Only after you have measured it.",
  "**position** (favoring the first answer shown),\n**verbosity** (favoring longer answers), and **self-enhancement** (favoring\ntext from their own model family)",
  "Score each pair in both orders and count a win only when the verdicts agree.",
  "Use a specific rubric with pass/fail criteria rather than a 1-to-10 score.",
  "Use a judge from a different model family than the system under test.",
  "chance-corrected (Cohen's kappa), before you rely\n  on its scores",
  "prefers system A over system B in 70% of pairs. You then rerun every comparison with B shown first, and B now wins 65% of them.",
  "Separately for each half, so a failure points at its cause:",
  "**recall@k** (did the right documents make the top k?) and **MRR**\n  (how high did the first relevant one rank?)",
  "**faithfulness** (is every claim supported by the retrieved\n  passages?), answer relevance, and citation accuracy",
  "models use information at the start and end of a\nlong context better than information in the middle",
  "a few\nwell-ranked passages often beat many loosely relevant ones, and a reranker\nearns its latency",
  "Retrieval recall@5 on your labeled queries is 0.45.",
  "more than half the time the right passage is not in the context",
  "Improve retrieval first: chunking, hybrid keyword search, or a reranker.",
  "Lengthen the context window and pass the top 50 results.",
  "Tool calling lets a model request an action instead of answering",
  "a tool name and JSON arguments), the application runs it, and\nthe result goes back into the context for the next step",
  "An **agent** is that\nloop, repeated until the model decides it is done.",
  "open standard for exposing tools and data sources to models, so one\nintegration serves many clients",
  "a step and cost budget; timeouts and\nretries per tool; idempotent tools, since a step may run twice; permissions\nscoped to the user; and a trace of every step for debugging",
  "$0.95^{10} \\approx 60\\%$",
  "Fewer, more reliable steps beat a\nclever long chain.",
  "did the ticket get filed, do the tests pass, is\nthe database in the expected state?",
  "right tool,\nvalid arguments, number of steps, cost",
  "Because runs are nondeterministic,\nrepeat each task.",
  "pass@k (at least one of k\nattempts succeeds) from pass^k (all k succeed); a customer-facing agent needs\nthe second, which falls quickly as k grows",
  "When a smaller model or a rule does the job better on the axes that matter:",
  "tabular prediction, strict latency or cost budgets, a need for calibrated\nprobabilities or explanations a regulator will accept, or a task a regular\nexpression solves",
  "use an LLM to **label data** and\ntrain a small, fast classifier on those labels, after checking the labels\nagainst a human-labeled sample",
  "the question that\n  separates candidates who have shipped from those who have only prototyped",
];
for (const q of quotes) check(page.includes(q), `${PAGE} no longer says: ${q}`);
check(page.includes("Zheng et al. documented three systematic\nbiases in LLM judges"), `${PAGE} no longer credits the judge biases to Zheng et al.`);
check(page.includes("The τ-bench authors distinguish"), `${PAGE} no longer credits pass^k to the τ-bench authors`);

// ── What the narration says, checked against the numbers ────────────────────
const { script } = await import(pathToFileURL(join(here, "script.ts")).href);
const beat = (id) => {
  const b = script.beats.find((x) => x.id === id);
  if (!b) throw new Error(`script.ts has no beat "${id}"`);
  return b.text;
};
const pct = (v) => Math.round(v * 100);
const at = (arr, k) => arr[R.passK.k.indexOf(k)];
const said = [
  ["q2-case", "in seventy percent of pairs", 70, pct(R.position.aWinsAFirst)],
  ["q2-case", "B wins sixty-five percent", 65, pct(R.position.bWinsBFirst)],
  ["q2-read", "about two thirds of the time", 2 / 3, Math.abs(R.position.firstShownWins - 2 / 3) < 0.02 ? 2 / 3 : R.position.firstShownWins],
  ["q2-read", "at least thirty-five percent of the verdicts flipped", 35, pct(R.position.flippedAtLeast)],
  ["q3-example", "Take three queries", 3, R.rag.ranks.length],
  ["q3-example", "ranks first, third, and nowhere", 1, R.rag.ranks[0]],
  ["q3-example", "ranks first, third, and nowhere", 3, R.rag.ranks[1]],
  ["q3-example", "Recall at five is two in three", 2 / 3, R.rag.recallAtK],
  ["q3-example", "point four four", 0.44, round(R.rag.mrr, 2)],
  ["q3-follow", "recall at five is point four five", 0.45, R.recallFollow.recallAt5],
  ["q3-follow", "more than half the time", 1, R.recallFollow.missing > 0.5 ? 1 : 0],
  ["q4-compound", "ninety-five percent of the time", 0.95, R.chain.page.perStep],
  ["q4-compound", "a ten-step task", 10, R.chain.page.steps],
  ["q4-compound", "about sixty percent", 60, pct(R.chain.page.task)],
  ["q4-fewer", "ninety-nine percent reliable, and ten steps reach ninety", 90, pct(R.chain.reliable.task)],
  ["q4-fewer", "cut the task to five steps, and it's seventy-seven", 77, pct(R.chain.shorter.task)],
  ["q5-numbers", "four times in five", 0.8, R.passK.attempt],
  ["q5-numbers", "Pass at four is over ninety-nine percent", 1, at(R.passK.passAtK, 4) > 0.99 ? 1 : 0],
  ["q5-numbers", "Pass hat four is forty-one", 41, pct(at(R.passK.passHatK, 4))],
  ["q5-which", "at eight attempts, seventeen percent", 17, pct(at(R.passK.passHatK, 8))],
  ["close-practice", "each page's concept checks", 1, R.practice.pagesWithConceptChecks === R.practice.topicPages ? 1 : 0],
  ["close-practice", "the hundred and ten multiple-choice questions that close the track", 110, R.practice.bank],
];
for (const [id, words, means, value] of said) {
  if (!beat(id).includes(words)) problems.push(`${id}: no longer says "${words}"`);
  else if (Math.abs(means - value) > 1e-4 * Math.max(1, Math.abs(means))) problems.push(`${id}: "${words}" is ${means}, computed ${value}`);
}
// The position-bias lower bound is a bound: check it against every split of
// 100 pairs that matches both rates.
{
  let least = Infinity;
  const aFirst = Math.round(R.position.aWinsAFirst * 100);
  const aSecond = Math.round(R.position.aWinsBFirst * 100);
  for (let both = 0; both <= 100; both++) {
    const onlyFirst = aFirst - both;
    const onlySecond = aSecond - both;
    const neither = 100 - both - onlyFirst - onlySecond;
    if (onlyFirst < 0 || onlySecond < 0 || neither < 0) continue;
    least = Math.min(least, onlyFirst + onlySecond);
  }
  check(least === Math.round(R.position.flippedAtLeast * 100), `the least share of flipped pairs is ${least}%, not ${R.position.flippedAtLeast}`);
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
R.said = said.map(([b, words, means]) => ({ beat: b, words, means: round(means) }));
writeFileSync(join(here, "results.json"), `${JSON.stringify(R, null, 2)}\n`);
console.log(JSON.stringify({ ...R, said: undefined }, null, 1));
console.error(`ok: ${quotes.length} quotes on the page, ${said.length} spoken numbers match`);
