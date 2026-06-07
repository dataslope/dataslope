// Audit MCQ choices that have no per-choice explanation.
//
// Reuses the extractor/parser from check-mcq.mjs so the accounting matches
// the linter's view of the content.
//
// Usage:
//   node scripts/audit/missing-explanations.mjs                 # whole corpus, per-course summary
//   node scripts/audit/missing-explanations.mjs <files|dirs...> # scope to given paths
//   node scripts/audit/missing-explanations.mjs --list <paths>  # list every gap with context
//   node scripts/audit/missing-explanations.mjs --check <paths> # exit 1 if any gap remains
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { extractMcqBlocks, parseChoices, findMcqFiles } from "../check-mcq.mjs";

const argv = process.argv.slice(2);
const list = argv.includes("--list");
const check = argv.includes("--check");
const paths = argv.filter((a) => !a.startsWith("--"));

const root = path.join(process.cwd(), "content", "learn");

function collectFiles(p) {
  const s = statSync(p);
  if (s.isDirectory()) return findMcqFiles(p);
  return p.endsWith(".mdx") ? [p] : [];
}

const files = paths.length
  ? [...new Set(paths.flatMap(collectFiles))]
  : findMcqFiles(root);

let totalQ = 0;
let totalChoices = 0;
let missing = 0;
const byCourse = {};
const filesWithGaps = new Set();
const gaps = [];

for (const file of files) {
  const rel = path.relative(process.cwd(), file);
  const course = path.relative(root, file).split(path.sep)[0];
  byCourse[course] ??= { missing: 0, choices: 0, q: 0, files: new Set() };
  const src = readFileSync(file, "utf8");
  let blockIdx = 0;
  for (const md of extractMcqBlocks(src)) {
    blockIdx++;
    const { body, choices } = parseChoices(md);
    const stem = (body.split("\n").find((l) => l.trim()) || "").trim().slice(0, 80);
    totalQ++;
    byCourse[course].q++;
    for (const c of choices) {
      totalChoices++;
      byCourse[course].choices++;
      if (!(c.explanation || "").trim()) {
        missing++;
        byCourse[course].missing++;
        byCourse[course].files.add(rel);
        filesWithGaps.add(rel);
        gaps.push({ rel, blockIdx, stem, choice: c.text.slice(0, 80), correct: c.correct });
      }
    }
  }
}

if (list) {
  let lastFile = null;
  for (const g of gaps) {
    if (g.rel !== lastFile) {
      console.log(`\n${g.rel}`);
      lastFile = g.rel;
    }
    console.log(`  Q${g.blockIdx} [${g.correct ? "correct" : "wrong  "}] choice: ${g.choice}`);
    console.log(`        stem: ${g.stem}`);
  }
}

console.log(`\nFiles scanned: ${files.length}`);
console.log(`Files with >=1 gap: ${filesWithGaps.size}`);
console.log(`Questions: ${totalQ}  Choices: ${totalChoices}`);
console.log(`Choices missing explanation: ${missing}`);

if (!paths.length || Object.keys(byCourse).length > 1) {
  const rows = Object.entries(byCourse)
    .map(([course, s]) => ({ course, ...s, files: s.files.size }))
    .filter((r) => r.missing > 0)
    .sort((a, b) => b.missing - a.missing);
  if (rows.length) {
    console.log("\nPer course (missing\tfiles\tcourse):");
    for (const r of rows) console.log(`${r.missing}\t${r.files}\t${r.course}`);
  }
}

if (check && missing > 0) process.exit(1);
