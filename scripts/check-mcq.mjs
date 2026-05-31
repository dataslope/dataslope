// Audits <MultipleChoice> blocks in the given MDX files for two hard rules:
//   1. Single-answer only — exactly one `- [o]` correct option per question.
//   2. No choice explanation (`> ...`) may start with an affirmative word,
//      because explanations are shown to ALL learners regardless of choice.
// Heuristic but reliable for this course's authored format. Exits non-zero
// if any violation is found.
import { readFileSync } from "node:fs";

const BANNED = [
  "correct", "right", "yes", "yep", "yeah", "exactly", "perfect", "great",
  "well done", "indeed", "absolutely", "nailed", "spot on", "bingo",
  "that's right", "thats right", "good job", "you got it", "true!",
];

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: node scripts/check-mcq.mjs <file.mdx> ...");
  process.exit(2);
}

// Pull out each <MultipleChoice ... /> element's inner text.
function extractMcqBlocks(src) {
  const blocks = [];
  const re = /<MultipleChoice\b/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    // Find the matching markdown={` ... `} template literal.
    const start = src.indexOf("markdown={`", m.index);
    if (start === -1) continue;
    const contentStart = start + "markdown={`".length;
    // Find the closing backtick that is not escaped.
    let i = contentStart;
    while (i < src.length) {
      if (src[i] === "`" && src[i - 1] !== "\\") break;
      i++;
    }
    blocks.push(src.slice(contentStart, i));
  }
  return blocks;
}

let violations = 0;
let questionCount = 0;

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const blocks = extractMcqBlocks(src);
  for (const block of blocks) {
    questionCount++;
    const lines = block.split("\n");
    const correct = lines.filter((l) => /^-\s+\[[oOxX]\]\s+/.test(l.trim()));
    if (correct.length !== 1) {
      violations++;
      console.error(
        `\n✗ ${file}: a MultipleChoice has ${correct.length} correct options (must be exactly 1, single-answer only).`,
      );
      console.error(`   stem: ${lines.find((l) => l.trim())?.slice(0, 80) ?? ""}`);
    }
    for (const line of lines) {
      const q = line.match(/^\s*>\s?(.*)$/);
      if (!q) continue;
      const text = q[1].trim().toLowerCase();
      if (!text) continue;
      if (BANNED.some((w) => text === w || text.startsWith(w + " ") || text.startsWith(w + ",") || text.startsWith(w + ".") || text.startsWith(w + "!") || text.startsWith(w + "—") || text.startsWith(w + " —"))) {
        violations++;
        console.error(`\n✗ ${file}: choice explanation starts with an affirmative word:`);
        console.error(`   "> ${q[1].trim().slice(0, 90)}"`);
      }
    }
  }
}

if (violations > 0) {
  console.error(`\n${violations} MCQ violation(s) across ${questionCount} question(s).`);
  process.exit(1);
}
console.log(`✓ all ${questionCount} MCQ block(s) pass (single-answer + neutral explanations)`);
