/**
 * Finds Markdown tables whose rows do not line up, which GFM renders as a
 * paragraph of pipes rather than a table.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 * `booleans-and-logic` teaches `a || b`, and wrote its truth table header as
 *
 *     | `a` | `b` | `a || b` |
 *     | :---: | :---: | :---: |
 *
 * A pipe is a cell delimiter *even inside a code span* — GFM splits the row
 * first and parses inline content second, which is the opposite of what the
 * backticks suggest. So that header is five cells against a three-cell
 * delimiter row, the table is not a table, and the reader gets a wall of
 * `| false | false | false ||` run together as prose. It renders fine in most
 * editors' preview panes, which is why it survived.
 *
 * The fix is `\|`, which GFM unescapes back to a literal pipe inside the cell.
 *
 * ── What it checks ──────────────────────────────────────────────────────
 * A table's delimiter row fixes its column count. Every other row of that
 * table must agree. Rows *may* legitimately end without a trailing pipe, and
 * a cell may contain an escaped `\|`, so both are accounted for before
 * counting.
 *
 * Usage:
 *   node scripts/check-mdx-tables.mjs [--filter <substr>[,<substr>…]]
 */
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { collectFiles } from "./lib/build-cache.mjs";
import { matchesFilter, parseFilter } from "./lib/mdx-blocks.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = join(ROOT, "content");

const args = process.argv.slice(2);
const filter = parseFilter(
  args.includes("--filter") ? args[args.indexOf("--filter") + 1] : null,
);

/** A delimiter row: `| :---: | --- |`, at least one column. */
const DELIMITER = /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/;

/**
 * Cells in one table row, split the way GFM splits them.
 *
 * `\|` is an escaped pipe and stays inside its cell; every other pipe is a
 * delimiter, including one inside backticks. The leading and trailing pipes
 * are optional in GFM and are stripped before counting so `| a | b |` and
 * `a | b` both count two.
 */
function cells(line) {
  const parts = [];
  let current = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "\\" && line[i + 1] === "|") {
      current += "\\|";
      i++;
      continue;
    }
    if (ch === "|") {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  if (parts.length && parts[0].trim() === "") parts.shift();
  if (parts.length && parts[parts.length - 1].trim() === "") parts.pop();
  return parts;
}

const files = collectFiles(CONTENT, (f) => f.endsWith(".mdx"))
  .map((rel) => (rel.startsWith("/") ? rel : join(CONTENT, rel)))
  .filter((abs) => !filter || matchesFilter(filter, relative(ROOT, abs)));

const problems = [];
let tables = 0;

for (const abs of files) {
  const lines = readFileSync(abs, "utf8").split("\n");
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) inFence = !inFence;
    if (inFence) continue;
    if (!DELIMITER.test(lines[i])) continue;
    const header = lines[i - 1];
    if (!header || !header.includes("|")) continue;

    tables++;
    const width = cells(lines[i]).length;
    const check = (line, n) => {
      const got = cells(line).length;
      if (got === width) return;
      problems.push({
        file: relative(ROOT, abs),
        line: n + 1,
        want: width,
        got,
        text: line.trim().slice(0, 110),
      });
    };
    check(header, i - 1);
    for (let j = i + 1; j < lines.length; j++) {
      const row = lines[j];
      if (!row.trim() || !row.includes("|")) break;
      if (/^\s*(```|~~~)/.test(row)) break;
      check(row, j);
    }
  }
}

if (problems.length === 0) {
  console.log(`✓ ${tables} Markdown table(s) in ${files.length} file(s): every row lines up`);
  process.exit(0);
}

console.error(
  `✗ ${problems.length} table row(s) do not match their delimiter row, so GFM ` +
    `renders the table as a paragraph of pipes.\n` +
    `  An unescaped "|" is a cell delimiter even inside a code span; write "\\|".\n`,
);
for (const p of problems.slice(0, 40)) {
  console.error(`  ${p.file}:${p.line}  ${p.got} cell(s), expected ${p.want}`);
  console.error(`    ${p.text}`);
}
if (problems.length > 40) console.error(`  …and ${problems.length - 40} more`);
process.exit(1);
