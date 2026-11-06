// Counts what the be-interview overview says about the Backend / Software
// Engineer track, on the track's own pages
// (content/interview/backend-engineer/), and writes it to results.json,
// which data.ts reads. No runtime is needed: the counts are of the headings
// and component tags the pages are built from. From the repo root:
//
//   node video/src/videos/be-interview/check.mjs
//
// - the questions: every page's `###` headings, in the track's order
//   (meta.json); the seven pages the series keeps, and the one it leaves
//   out (python, the syntax page);
// - the practice: <MultipleChoice> concept checks and runnable challenges
//   (<ChallengeCard> or <SqlChallengeCard>) on each topic page, and the bank
//   in multiple-choice-questions.mdx.
//
// Then it fails (exit 1) if:
// - a kept page's question count stops matching the parts that answer it
//   (data.ts PARTS, plus the one question this overview answers and the one
//   Part 4 answers together with its twin);
// - a page stops saying what the narration quotes from it (the companies,
//   the survey's numbers, the round's sixty minutes);
// - the narration stops saying, in words, the numbers counted here.
/* global console, process, URL */
import { readFileSync, writeFileSync } from "node:fs";

const dir = new URL("../../../../content/interview/backend-engineer/", import.meta.url);
const read = (file) => readFileSync(new URL(file, dir), "utf8");
const count = (text, re) => (text.match(re) ?? []).length;
const tag = (name) => new RegExp(`<${name}\\b`, "g");

const LEFT_OUT = "python";
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
const kept = pages.filter((p) => p.page !== LEFT_OUT);
const left = pages.find((p) => p.page === LEFT_OUT);

const results = {
  bank,
  topicPages: pages.length,
  conceptCheckPages: pages.filter((p) => p.conceptChecks > 0).length,
  challengePages: pages.filter((p) => p.challenges > 0).length,
  challengePageNames: pages.filter((p) => p.challenges > 0).map((p) => p.page),
  challenges: pages.reduce((a, p) => a + p.challenges, 0),
  keptPages: kept.length,
  keptQuestions: kept.reduce((a, p) => a + p.questions, 0),
  leftOut: { page: LEFT_OUT, questions: left.questions },
  pages,
};

writeFileSync(new URL("./results.json", import.meta.url), `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify({ ...results, pages: undefined }));

// Node strips the types from script.ts and data.ts.
const { script } = await import(new URL("./script.ts", import.meta.url).href);
const { PARTS, QUESTIONS, ANSWERED_HERE, ANSWERED_TOGETHER, CHALLENGE_LABELS } = await import(new URL("./data.ts", import.meta.url).href);
const problems = [];
// The practice line names the challenge pages on screen: every one, and no other.
const named = Object.keys(CHALLENGE_LABELS);
if (named.join() !== results.challengePageNames.join()) problems.push(`challenge pages are ${results.challengePageNames.join(", ")}; the screen names ${named.join(", ")}`);

// Every kept page's questions are answered once, by the parts that take it.
for (const p of kept) {
  const byParts = PARTS.filter((x) => x.page === p.page).reduce((a, x) => a + x.questions, 0);
  const extra = (ANSWERED_HERE.page === p.page ? ANSWERED_HERE.questions : 0) + (ANSWERED_TOGETHER.page === p.page ? ANSWERED_TOGETHER.questions : 0);
  if (byParts + extra !== p.questions) problems.push(`${p.page}.mdx asks ${p.questions}; the parts answer ${byParts} + ${extra}`);
}
if (PARTS.some((x) => x.page === LEFT_OUT)) problems.push("a part answers from the page the series leaves out");

// What the narration quotes, still on the pages.
const quotes = [
  ["ai-assisted-coding.mdx", "Since 2025 the coding interview has split in two"],
  ["ai-assisted-coding.mdx", "expected to use their usual AI tools"],
  ["ai-assisted-coding.mdx", "One of the two onsite coding rounds became a 60-minute AI-enabled round"],
  ["ai-assisted-coding.mdx", '"code comprehension" round where candidates read, debug, and optimize existing code'],
  ["ai-assisted-coding.mdx", "Using unapproved generative AI during an interview can disqualify a candidate"],
  ["ai-assisted-coding.mdx", "No AI in take-homes or live interviews unless the interviewer says otherwise"],
  ["ai-assisted-coding.mdx", "At least one round is back in person"],
  ["ai-assisted-coding.mdx", "because an assistant can complete them and the reviewer\ncannot see how"],
  ["ai-assisted-coding.mdx", "Karat's 2026 survey of 400 engineering leaders, 71% said AI\nmakes technical skills harder to assess, and 62% of organizations still\nprohibited AI in technical interviews"],
  ["ai-assisted-coding.mdx", "sells interviewing services, so read the figures as one vendor's survey"],
  ["ai-assisted-coding.mdx", "Ask the recruiter, for every round, whether AI is allowed."],
  ["index.mdx", "multi-file projects to extend"],
  ["index.mdx", "streaming, retries, cost measured in tokens, and prompt injection"],
  ["index.mdx", "**Fewer take-homes**"],
  ["index.mdx", 'more live design discussion with "why?" follow-ups'],
  ["index.mdx", "usually in a live coding setting. Backend roles add API/system design and\ndatabase questions on top."],
  // "series-python": the left-out page's design questions, and the
  // concurrency page's questions that cover them.
  ["python.mdx", "### What is the GIL, and when does it bite?"],
  ["python.mdx", "### How does threading differ from multiprocessing in Python?"],
  ["python.mdx", "### What is `asyncio` and when should you use it?"],
  ["concurrency.mdx", "### What is the GIL and why does it exist?"],
  ["concurrency.mdx", "### Processes vs threads, how do they differ?"],
  ["concurrency.mdx", "### When do you choose threads vs multiprocessing vs async?"],
];
for (const [file, phrase] of quotes) if (!read(file).includes(phrase)) problems.push(`${file} no longer says: ${phrase}`);
// The two follow-ups the hook asks, in the AI page's words.
if (!read("ai-assisted-coding.mdx").includes('"why this\napproach?" and "what breaks under load?"')) problems.push("the AI page no longer quotes the hook's two follow-ups");

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
  ["series-parts", `${below100(PARTS.length)} videos`],
  ["series-parts", `${said(QUESTIONS)} of the track's questions`],
  ["practice", results.conceptCheckPages === results.topicPages ? "every topic page has concept checks" : "(not every page has concept checks)"],
  ["practice", `${below100(results.challengePages)} add challenges`],
  ["practice", `${said(bank)} multiple-choice questions`],
  ["ai-survey", "four hundred engineering leaders"],
  ["ai-survey", "which sells interviewing services"],
  ["ai-survey-data", "seventy-one percent"],
  ["ai-survey-data", "sixty-two percent"],
  ["ai-allowed-who", "sixty-minute"],
  ["ai", "since 2025"],
];
for (const [id, phrase] of claims) if (!text(id).includes(phrase)) problems.push(`script.ts "${id}" no longer says "${phrase}"`);

for (const p of problems) console.error(p);
if (problems.length) process.exit(1);
console.error(`ok: ${kept.length} kept pages, ${results.keptQuestions} questions, ${QUESTIONS} answered by the nine topic videos`);
