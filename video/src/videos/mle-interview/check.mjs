// Counts what the mle-interview overview says about the Machine Learning
// Engineer track, on the track's own pages
// (content/interview/machine-learning-engineer/), and writes it to
// results.json, which data.ts reads. No runtime is needed: the counts are of
// the headings and component tags the pages are built from. From the repo
// root:
//
//   node video/src/videos/mle-interview/check.mjs
//
// - the questions: every topic page's `###` headings, in the track's order
//   (meta.json), 167 in all;
// - the practice: <MultipleChoice> concept checks and runnable challenges
//   (<ChallengeCard> or <SqlChallengeCard>) on each topic page, and the bank
//   in multiple-choice-questions.mdx.
//
// Then it fails (exit 1) if:
// - a page's question count stops matching the parts that answer it (data.ts
//   PARTS, plus the one question this overview answers);
// - PARTS stops matching the plan's "Check" line term by term (each page's
//   questions split across the parts in series order), when the plan is
//   there to read;
// - a page stops saying what the narration quotes from it;
// - the narration stops saying, in words, the numbers counted here.
// It warns (and does not fail) when a sibling video's illustrations.json
// exists and lacks the hero id PARTS gives it, since the other parts are
// written alongside this one.
/* global console, process, URL */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const dir = new URL("../../../../content/interview/machine-learning-engineer/", import.meta.url);
const read = (file) => readFileSync(new URL(file, dir), "utf8");
const count = (text, re) => (text.match(re) ?? []).length;
const tag = (name) => new RegExp(`<${name}\\b`, "g");

const order = JSON.parse(read("meta.json")).pages;
const bank = count(read("multiple-choice-questions.mdx"), tag("MultipleChoice"));
const pages = order
  .filter((p) => p !== "index" && p !== "multiple-choice-questions")
  .map((page) => {
    const text = read(`${page}.mdx`);
    return {
      page,
      questions: count(text, /^### /gm),
      conceptChecks: count(text, tag("MultipleChoice")),
      challenges: count(text, tag("ChallengeCard")) + count(text, tag("SqlChallengeCard")),
    };
  });

const results = {
  bank,
  topicPages: pages.length,
  totalQuestions: pages.reduce((a, p) => a + p.questions, 0),
  indexQuestions: count(read("index.mdx"), /^### /gm),
  conceptCheckPages: pages.filter((p) => p.conceptChecks > 0).length,
  challengePages: pages.filter((p) => p.challenges > 0).length,
  challengePageNames: pages.filter((p) => p.challenges > 0).map((p) => p.page),
  challenges: pages.reduce((a, p) => a + p.challenges, 0),
  pages,
};
writeFileSync(new URL("./results.json", import.meta.url), `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify({ ...results, pages: undefined }));

// Node strips the types from script.ts and data.ts.
const { script } = await import(new URL("./script.ts", import.meta.url).href);
const { PARTS, ANSWERED_HERE, QUESTIONS, ANSWERS, TOGETHER, questionsOf, PROBES, ALSO_ON_TRACK, ADDED } = await import(new URL("./data.ts", import.meta.url).href);
const problems = [];
const warnings = [];

// Every page's questions are answered once, by the parts that take it.
for (const p of pages) {
  const byParts = PARTS.reduce((a, x) => a + (x.from[p.page] ?? 0), 0);
  const here = ANSWERED_HERE.page === p.page ? ANSWERED_HERE.questions : 0;
  if (byParts + here !== p.questions) problems.push(`${p.page}.mdx asks ${p.questions}; the parts answer ${byParts} + ${here} here`);
}
for (const x of PARTS) for (const page of Object.keys(x.from)) if (!pages.some((p) => p.page === page)) problems.push(`Part ${x.n} answers from ${page}, which is not a topic page`);
if (results.indexQuestions !== 0) problems.push(`index.mdx now asks ${results.indexQuestions} questions of its own`);
if (QUESTIONS + ANSWERED_HERE.questions !== results.totalQuestions) problems.push(`the parts and this video answer ${QUESTIONS} + 1, the pages ask ${results.totalQuestions}`);
for (const x of PARTS) if (x.together < 0 || x.together >= questionsOf(x)) problems.push(`Part ${x.n} answers ${x.together} together out of ${questionsOf(x)}`);
// Every part a label points at exists.
for (const row of [...PROBES, ALSO_ON_TRACK, ...ADDED]) for (const n of row.parts) if (!PARTS.some((x) => x.n === n)) problems.push(`"${row.name}" points at Part ${n}, which is not in PARTS`);

// PARTS against the plan's "Check" line, when the plan is there.
const planUrl = new URL("../../../../agent-outputs/20261120-1400-machine-learning-engineer-interview-video-plan.md", import.meta.url);
if (existsSync(planUrl)) {
  const plan = readFileSync(planUrl, "utf8").replace(/\s+/g, " ");
  const line = plan.match(/Check: (.*?)\. Total (\d+)\./);
  if (!line) problems.push("the plan has no \"Check:\" line to compare with");
  else {
    if (Number(line[2]) !== results.totalQuestions) problems.push(`the plan's total is ${line[2]}, the pages ask ${results.totalQuestions}`);
    const alias = { statistics: "statistics-and-probability" };
    for (const term of line[1].split("; ")) {
      const m = term.match(/^([a-z-]+) ([\d +]+?)(?: = (\d+))?$/);
      if (!m) {
        problems.push(`can't read the plan's check term "${term}"`);
        continue;
      }
      const page = alias[m[1]] ?? m[1];
      const planned = m[2].split(" + ").map(Number);
      const ours = [ANSWERED_HERE.page === page ? ANSWERED_HERE.questions : 0, ...PARTS.map((x) => x.from[page] ?? 0)].filter((v) => v > 0);
      if (planned.join() !== ours.join()) problems.push(`the plan splits ${page} as ${planned.join(" + ")}; PARTS splits it ${ours.join(" + ")}`);
    }
  }
} else warnings.push("the plan is not there to read; PARTS was checked against the pages only");

// The heroes, against what the other parts' writers have declared so far.
for (const x of PARTS) {
  const file = new URL(`../${x.video}/illustrations.json`, import.meta.url);
  if (!existsSync(file)) {
    warnings.push(`Part ${x.n}: ${x.video}/illustrations.json not written yet; hero assumed ${x.hero}`);
    continue;
  }
  const ids = JSON.parse(readFileSync(file, "utf8")).prompts.map((p) => p.id);
  if (!ids.includes(x.hero)) warnings.push(`Part ${x.n}: ${x.video}/illustrations.json has no "${x.hero}" (it has ${ids.join(", ")})`);
}

// What the narration quotes, still on the pages.
const quotes = [
  ["llm-systems-and-evals.mdx", 'ML system design rounds used to mean "design a recommender" or "design fraud\ndetection"'],
  ["llm-systems-and-evals.mdx", "the prompt is just\nas often \"design an assistant over our documents\" or \"this LLM feature is too\nslow and too expensive; fix it\""],
  ["llm-systems-and-evals.mdx", "### How has the ML Engineer interview changed with LLMs?"],
  ["llm-systems-and-evals.mdx", "Classical ML did not leave: expect bias and variance, leakage, metrics, and\na coding round"],
  ["llm-systems-and-evals.mdx", "**LLM application design**: retrieval, prompting, tool use, guardrails, and\n  fallbacks, drawn as a system with latency and cost budgets."],
  ["llm-systems-and-evals.mdx", "**Inference economics**: why generation is slow, what the GPU memory is\n  spent on, and which lever buys what."],
  ["llm-systems-and-evals.mdx", "**Evaluation design**: building a test set, trusting or distrusting an\n  automated judge, and connecting offline scores to online outcomes."],
  ["llm-systems-and-evals.mdx", "**Judgment about when not to use an LLM**"],
  ["index.mdx", "Expect a coding/DSA round, an\nML-concepts round, and an ML system design round"],
  ["index.mdx", "- **ML fundamentals**, supervised vs unsupervised, over/underfitting, regularization, evaluation metrics, data leakage."],
  ["index.mdx", "- **Coding**, data structures & algorithms (see the [Backend track](/interview-prep/backend-engineer)), plus NumPy/pandas."],
  ["index.mdx", "- **ML system design**, training/serving pipelines, feature stores, batch vs online inference, monitoring & drift."],
  ["index.mdx", "- **MLOps**, reproducibility, versioning data & models, CI/CD, latency and cost trade-offs."],
  ["index.mdx", "plus AI-on coding rounds at some companies. Ask the recruiter about each round."],
  ["index.mdx", "**[Statistics & probability]"],
  ["index.mdx", "**[Deep learning]"],
  ["index.mdx", "**[NLP & LLMs]"],
];
for (const [file, phrase] of quotes) if (!read(file).includes(phrase)) problems.push(`${file} no longer says: ${phrase}`);

// The numbers the narration says in words.
const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const below100 = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ""));
const said = (n) => (n < 100 ? below100(n) : `a hundred${n % 100 ? ` and ${below100(n % 100)}` : ""}`);
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const text = (id) => {
  const b = script.beats.find((x) => x.id === id);
  if (!b) throw new Error(`script.ts has no beat "${id}"`);
  return b.text;
};
const claims = [
  ["series-count", `ask ${said(results.totalQuestions)} questions`],
  ["series-count", `This video answers ${said(ANSWERED_HERE.questions)}`],
  ["series-count", `${cap(below100(PARTS.length))} more answer the rest`],
  ["practice", results.conceptCheckPages === results.topicPages ? "Every topic page has concept checks" : "(not every page has concept checks)"],
  ["practice", `${below100(results.challenges)} challenges run in the browser`],
  ["practice", `${said(bank)} multiple-choice questions`],
  ["rounds", "Expect three rounds"],
  ["rounds", `probe ${below100(PROBES.length)} areas`],
  ["llm", `added is ${below100(ADDED.length)} things`],
  ["series-parts", "the two LLM parts"],
];
for (const [id, phrase] of claims) if (!text(id).includes(phrase)) problems.push(`script.ts "${id}" no longer says "${phrase}"`);
// The parts are named in series order, by the words of their titles.
{
  const spoken = text("series-parts").toLowerCase();
  const keys = ["generalization", "models", "coding", "statistics", "deep learning", "nlp", "system design", "monitoring", "serving", "evaluating"];
  const at = keys.map((k) => spoken.indexOf(k));
  if (at.some((i) => i < 0) || at.some((i, j) => j > 0 && i < at[j - 1])) problems.push(`"series-parts" no longer names the ten parts in order (${keys.filter((k, j) => at[j] < 0).join(", ") || "order"})`);
  if (keys.length !== PARTS.length) problems.push("the spoken list and PARTS differ in length");
}

for (const w of warnings) console.error(`warning: ${w}`);
for (const p of problems) console.error(p);
if (problems.length) process.exit(1);
console.error(`ok: ${pages.length} topic pages ask ${results.totalQuestions}; this video answers 1 and the ten parts ${QUESTIONS} (${ANSWERS} answers, ${TOGETHER} of the questions answered together with a twin)`);
