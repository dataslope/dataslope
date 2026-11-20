// Counts what the ae-interview overview says about the Analytics Engineer
// track, on the track's own pages (content/interview/analytics-engineer/),
// and writes it to results.json, which data.ts reads. No runtime is needed:
// the counts are of the headings and component tags the pages are built
// from. From the repo root:
//
//   node video/src/videos/ae-interview/check.mjs
//
// - the questions: every topic page's `###` headings, in the track's order
//   (meta.json);
// - the practice: <MultipleChoice> concept checks and runnable challenges
//   (<ChallengeCard> or <SqlChallengeCard>) on each topic page, and the bank
//   in multiple-choice-questions.mdx.
//
// Then it fails (exit 1) if:
// - a page's question count stops matching the parts that answer from it
//   (data.ts PARTS, by page), or this overview's own question leaves the AI
//   page;
// - a page stops saying what the narration quotes from it;
// - the narration stops saying, in words, the numbers counted here and the
//   ones PARTS makes.
/* global console, process, URL */
import { readFileSync, writeFileSync } from "node:fs";

const dir = new URL("../../../../content/interview/analytics-engineer/", import.meta.url);
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
  pageQuestions: pages.reduce((a, p) => a + p.questions, 0),
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
const { PARTS, QUESTIONS, ALL_QUESTIONS, TOPIC_PARTS, CHALLENGE_LABELS, partOf } = await import(
  new URL("./data.ts", import.meta.url).href
);
const problems = [];

// Every page's questions are answered once, by the parts that take from it.
for (const p of pages) {
  const byParts = PARTS.reduce((a, x) => a + (x.from[p.page] ?? 0), 0);
  if (byParts !== p.questions) problems.push(`${p.page}.mdx asks ${p.questions}; the parts answer ${byParts}`);
}
for (const x of PARTS) {
  for (const page of Object.keys(x.from)) {
    if (!pages.some((p) => p.page === page)) problems.push(`Part ${x.n} answers from ${page}, which is not a topic page`);
  }
}
if (ALL_QUESTIONS !== results.pageQuestions) problems.push(`the parts answer ${ALL_QUESTIONS}; the pages ask ${results.pageQuestions}`);
if (PARTS.map((p) => p.n).join() !== "0,1,2,3,4,5,6,7,8,9") problems.push("PARTS is not Parts 0 to 9 in order");

// The practice line names the challenge pages on screen: every one, and no other.
const named = Object.keys(CHALLENGE_LABELS);
if (named.join() !== results.challengePageNames.join()) {
  problems.push(`challenge pages are ${results.challengePageNames.join(", ")}; the screen names ${named.join(", ")}`);
}

// What the narration quotes, still on the pages.
const quotes = [
  // "hook", "hook-more"
  ["index.mdx", "Analytics Engineer sits between data engineering and analytics"],
  ["index.mdx", "turning raw warehouse tables into clean,\ntested, documented models (usually with **dbt**)"],
  // "probe" to "probe-tradeoffs", the four bullets in order
  ["index.mdx", "- **SQL & modeling**, dimensional modeling (facts & dimensions), star schemas, grain, and slowly-changing dimensions."],
  ["index.mdx", "- **dbt**, models, refs, sources, tests, materializations (view / table / incremental), and documentation."],
  ["index.mdx", "- **Software practice**, version control, CI, modularity (staging → intermediate → marts), and DRY SQL."],
  ["index.mdx", "- **Trade-offs**, when to materialize as a table vs view vs incremental model, and cost/freshness balance."],
  // "ai", "ai-why"
  ["ai-and-the-semantic-layer.mdx", "### How has the Analytics Engineer interview changed with AI?"],
  ["ai-and-the-semantic-layer.mdx", "Dimensional modeling, dbt, and SQL are still the core. Added on top:"],
  ["index.mdx", "assistants are only as reliable as the metric definitions underneath them, and those are an analytics engineer's work."],
  // "ai-sql" to "ai-review"
  ["ai-and-the-semantic-layer.mdx", "**Text-to-SQL versus a semantic layer**: why one gives confidently wrong\n  answers and how the other prevents them."],
  ["ai-and-the-semantic-layer.mdx", "**AI-ready modeling**: documentation, tests, and access rules written for a\n  reader that is a language model."],
  ["index.mdx", "**Evaluating an analytics assistant** by comparing result sets with verified answers, including questions it should decline."],
  ["index.mdx", "**AI-written dbt models** reviewed for grain, incremental logic, and duplicate metrics"],
  // "ai-ask", "ai-more"
  ["index.mdx", "some coding rounds allow an assistant. Ask the recruiter about each round."],
  ["index.mdx", "[AI & the semantic layer](/interview-prep/analytics-engineer/ai-and-the-semantic-layer) covers these questions in depth."],
  // "practice"
  ["index.mdx", "110 rapid-fire questions spanning every topic above"],
];
for (const [file, phrase] of quotes) if (!read(file).includes(phrase)) problems.push(`${file} no longer says: ${phrase}`);

// The numbers the narration says in words.
const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const below100 = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ""));
const said = (n) => (n < 100 ? below100(n) : `a hundred${n % 100 ? ` and ${below100(n % 100)}` : ""}`);
const text = (id) => {
  const b = script.beats.find((x) => x.id === id);
  if (!b) throw new Error(`script.ts has no beat "${id}"`);
  return b.text.toLowerCase();
};
const claims = [
  ["series-parts", `${below100(TOPIC_PARTS.length)} videos`],
  ["series-parts", `other ${said(QUESTIONS).replace(/^a /, "")} questions`],
  ["ai-more", `part ${below100(partOf("ae-ai-semantic-layer"))} covers all four`],
  ["ai-four", "four more topics"],
  ["practice", results.conceptCheckPages === results.topicPages ? "every topic page has concept checks" : "(not every page has concept checks)"],
  ["practice", `${below100(results.challengePages)} of them add challenges`],
  ["practice", `${said(bank)} multiple-choice questions`],
  ["next", "next: facts, dimensions and grain"],
];
for (const [id, phrase] of claims) if (!text(id).includes(phrase)) problems.push(`script.ts "${id}" no longer says "${phrase}"`);
if (QUESTIONS + 1 !== ALL_QUESTIONS) problems.push(`this overview should answer one question; PARTS gives it ${ALL_QUESTIONS - QUESTIONS}`);

for (const p of problems) console.error(p);
if (problems.length) process.exit(1);
console.error(
  `ok: ${pages.length} topic pages, ${results.pageQuestions} questions, ${QUESTIONS} answered by the nine topic videos and 1 here; ` +
    `concept checks on ${results.conceptCheckPages}, challenges on ${results.challengePages}, bank ${bank}`,
);
