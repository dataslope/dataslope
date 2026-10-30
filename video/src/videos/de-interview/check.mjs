// Counts what the de-interview overview says about the Data Engineer track, on
// the track's own pages (content/interview/data-engineer/), and writes it to
// results.json, which data.ts reads. No runtime is needed: the counts are of
// the headings and component tags the pages are built from. From the repo
// root:
//
//   node video/src/videos/de-interview/check.mjs
//
// - the bank: the <MultipleChoice> blocks in multiple-choice-questions.mdx;
// - the topic pages: every other page but the index, in the track's order
//   (meta.json), each with how many questions its Q&A asks (its `###`
//   headings), how many concept checks (<MultipleChoice>) and how many
//   runnable challenges (<ChallengeCard> or <SqlChallengeCard>) it carries.
//
// The questions the pages ask (182) are more than the series answers (157):
// a question asked on two pages is answered once, in one video (the plan's
// table). That 157 is the sum of data.ts's PARTS, not a count made here.
/* global console, process, URL */
import { readFileSync, writeFileSync } from "node:fs";

const dir = new URL("../../../../content/interview/data-engineer/", import.meta.url);
const count = (text, re) => (text.match(re) ?? []).length;
const tag = (name) => new RegExp(`<${name}\\b`, "g");
const read = (file) => readFileSync(new URL(file, dir), "utf8");

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
  conceptChecks: pages.reduce((a, p) => a + p.conceptChecks, 0),
  conceptCheckPages: pages.filter((p) => p.conceptChecks > 0).length,
  challenges: pages.reduce((a, p) => a + p.challenges, 0),
  challengePages: pages.filter((p) => p.challenges > 0).length,
  pages,
};

const out = new URL("./results.json", import.meta.url);
writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify({ ...results, pages: undefined }));

// The narration says these numbers in words, so a count that moves (a builder
// moving a question changes PARTS in data.ts) must move the words with it.
// Node strips the types from script.ts and data.ts.
const { script } = await import(new URL("./script.ts", import.meta.url).href);
const { QUESTIONS, PARTS } = await import(new URL("./data.ts", import.meta.url).href);
const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const below100 = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ""));
const said = (n) => (n < 100 ? below100(n) : `a hundred${n % 100 ? ` and ${below100(n % 100)}` : ""}`);
const text = (id) => script.beats.find((b) => b.id === id).text.toLowerCase();
const claims = [
  ["series", `${below100(PARTS.length)} videos`],
  ["series", `${said(QUESTIONS)} questions`],
  ["practice", "every topic page has concept checks"],
  ["practice", `${said(results.challengePages)} add challenges`],
  ["practice", `${said(bank)} multiple-choice`],
];
const wrong = claims.filter(([id, words]) => !text(id).includes(words));
if (results.conceptCheckPages !== results.topicPages) wrong.push(["practice", "not every page has concept checks"]);
if (wrong.length) {
  console.error(`the narration no longer says what the counts make:\n${wrong.map(([id, w]) => `  ${id}: "${w}"`).join("\n")}`);
  process.exit(1);
}
console.log(`narration agrees: ${claims.map(([, w]) => w).join(", ")}`);
