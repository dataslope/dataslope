// Counts the practice the ds-interview overview promises, on the Data Scientist
// track's own pages (content/interview/data-scientist/), and writes what it
// found to results.json, which data.ts reads. No runtime is needed: the counts
// are of the component tags the pages are built from. From the repo root:
//
//   node video/src/videos/ds-interview/check.mjs
//
// - the bank: the <MultipleChoice> blocks in multiple-choice-questions.mdx;
// - the topic pages: every other page but the index, each with how many
//   concept checks (<MultipleChoice>) and how many challenges (<ChallengeCard>
//   or <SqlChallengeCard>) it carries.
/* global console, URL */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const dir = new URL("../../../../content/interview/data-scientist/", import.meta.url);
const count = (text, tag) => (text.match(new RegExp(`<${tag}\\b`, "g")) ?? []).length;
const read = (file) => readFileSync(new URL(file, dir), "utf8");

const bank = count(read("multiple-choice-questions.mdx"), "MultipleChoice");

const pages = readdirSync(dir)
  .filter((f) => f.endsWith(".mdx") && f !== "index.mdx" && f !== "multiple-choice-questions.mdx")
  .sort()
  .map((file) => {
    const text = read(file);
    return {
      page: file.replace(/\.mdx$/, ""),
      conceptChecks: count(text, "MultipleChoice"),
      challenges: count(text, "ChallengeCard") + count(text, "SqlChallengeCard"),
    };
  });

const results = {
  bank,
  topicPages: pages.length,
  conceptCheckPages: pages.filter((p) => p.conceptChecks > 0).length,
  challengePages: pages.filter((p) => p.challenges > 0).length,
  pages,
};

const out = new URL("./results.json", import.meta.url);
writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify({ ...results, pages: undefined }));
