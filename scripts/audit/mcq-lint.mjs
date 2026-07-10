// Static linter for <MultipleChoice> blocks across content/learn.
// Extracts the markdown template literal from each block, parses choices,
// and flags structural problems a learner would hit.
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const files = execSync('grep -rl "<MultipleChoice" content/learn --include=*.mdx', {
  encoding: "utf8",
}).trim().split("\n");

// Extract the contents of markdown={`...`} respecting escaped backticks.
function extractMarkdownBlocks(src) {
  const blocks = [];
  const marker = "markdown={`";
  let i = 0;
  while (true) {
    const start = src.indexOf(marker, i);
    if (start === -1) break;
    let j = start + marker.length;
    let out = "";
    while (j < src.length) {
      const ch = src[j];
      if (ch === "\\") {
        out += src[j + 1];
        j += 2;
        continue;
      }
      if (ch === "`") break; // closing backtick of the template literal
      out += ch;
      j++;
    }
    blocks.push(out);
    i = j + 1;
  }
  return blocks;
}

// Lightweight choice parser mirroring parseQuestion.ts semantics.
function parse(md) {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const choices = [];
  let inFence = false;
  for (const line of lines) {
    const m = line.match(/^-\s+(?:\[(o|O| |x|X)\]\s+)?(.*)$/);
    const fence = /^(`{3,}|~{3,})/.test(line.trim());
    if (m && !inFence) {
      const marker = (m[1] || "").toLowerCase();
      choices.push({ correct: marker === "o" || marker === "x", text: m[2].trim(), explanation: "" });
      if (/^(`{3,}|~{3,})/.test(m[2].trim())) inFence = true;
      continue;
    }
    if (fence) inFence = !inFence;
    const bq = line.match(/^\s*>\s?(.*)$/);
    if (bq && choices.length && !inFence) {
      choices[choices.length - 1].explanation += (choices[choices.length - 1].explanation ? "\n" : "") + bq[1];
    }
  }
  return choices;
}

let total = 0;
const noCorrect = [];
const dupChoices = [];
const affirmExpl = [];
const hintsMultiButSingle = [];
const tooFew = [];
const emptyExpl = [];

const AFFIRM = /^(correct|right|exactly|yes|perfect|great|well done|spot on|indeed|absolutely|this works|nice|true|bingo)\b/i;

for (const file of files) {
  const src = readFileSync(file, "utf8");
  for (const md of extractMarkdownBlocks(src)) {
    total++;
    const choices = parse(md);
    const correct = choices.filter((c) => c.correct);
    if (choices.length < 2) tooFew.push({ file, n: choices.length });
    if (correct.length === 0) noCorrect.push({ file, snippet: md.slice(0, 60).replace(/\n/g, " ") });
    // duplicate choice texts (normalized)
    const seen = new Map();
    for (const c of choices) {
      // Case-SENSITIVE exact compare, `Number` vs `number` is a real,
      // intentional distinction in some questions. Skip fence-only keys.
      const key = c.text.replace(/\s+/g, " ").trim();
      if (!key || /^(`{3,}|~{3,})/.test(key)) continue;
      if (seen.has(key)) dupChoices.push({ file, text: c.text.slice(0, 50) });
      seen.set(key, true);
    }
    // affirmative explanation starts
    for (const c of choices) {
      if (AFFIRM.test(c.explanation.trim())) {
        affirmExpl.push({ file, word: c.explanation.trim().split(/\s|\./)[0], correct: c.correct });
      }
      if (!c.explanation.trim()) emptyExpl.push({ file });
      // explanation hints at multiple correct answers but only 1 is marked
      if (/another correct answer|also correct|both .* correct|more than one/i.test(c.explanation) && correct.length < 2) {
        hintsMultiButSingle.push({ file, text: c.text.slice(0, 40), expl: c.explanation.slice(0, 70) });
      }
    }
  }
}

const uniq = (arr, key) => [...new Set(arr.map(key))];

console.log("Total MCQ blocks parsed:", total);
console.log("\n## No correct answer marked ([o] missing):", noCorrect.length);
noCorrect.slice(0, 20).forEach((x) => console.log("   -", x.file, "::", x.snippet));
console.log("\n## Duplicate choice text within a question:", dupChoices.length, "in", uniq(dupChoices, (x) => x.file).length, "files");
dupChoices.slice(0, 20).forEach((x) => console.log("   -", x.file, "::", x.text));
console.log("\n## 'another correct answer' hint but only 1 marked correct:", hintsMultiButSingle.length);
hintsMultiButSingle.slice(0, 20).forEach((x) => console.log("   -", x.file, "::", x.text, "=>", x.expl));
console.log("\n## Fewer than 2 choices:", tooFew.length);
tooFew.slice(0, 15).forEach((x) => console.log("   -", x.file, "n=", x.n));
console.log("\n## Affirmative-start explanations:", affirmExpl.length, "(", uniq(affirmExpl, (x) => x.file).length, "files )");
console.log("   words:", JSON.stringify(affirmExpl.reduce((a, x) => { a[x.word] = (a[x.word]||0)+1; return a; }, {})));
console.log("   on correct choice:", affirmExpl.filter((x) => x.correct).length, "| on wrong choice:", affirmExpl.filter((x) => !x.correct).length);
console.log("\n## Choices with empty explanation:", emptyExpl.length, "in", uniq(emptyExpl, (x) => x.file).length, "files");
