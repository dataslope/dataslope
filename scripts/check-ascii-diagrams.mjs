// Lints content/**/*.mdx for figures "drawn" out of characters. Four rules:
//   1. drawn-diagram  2+ consecutive lines with 2+ box-drawing chars each,
//                     not all directory-tree lines.
//   2. ascii-box      2+ `+-----+` rules in a file, plus `└──┬──┘`
//                     underbraces.
//   3. mermaid-glyph  any drawn char inside a ```mermaid fence (mermaid
//                     syntax is pure ASCII, so it can only be label
//                     decoration imitating an edge mermaid already draws).
//   4. fake-table     a ```text/unlabelled fence that is really a table
//                     (header, dashed rule, rows) — pure ASCII, so rules 1-2
//                     miss it.
//
// Drawn figures are a bug, not a style call: JetBrains Mono is loaded with
// `subsets: ["latin"]` (app/layout.tsx), which ends before U+2500, so drawn
// glyphs fall back to another monospace at another advance width and aligned
// rows arrive misaligned. They also defeat screen readers, reflow, and
// theming. Replacements live in the repo: <BoxModel>, <MemoryCells>,
// <SyntaxBreakdown>, <CrcCard> (app/_components/mdx/diagrams.tsx), ```mermaid
// for graphs, markdown tables for tables.
//
// Directory trees stay: siblings share a prefix, so they survive the font
// fallback; `isTreeLine` recognizes them (drawn chars only in the leading
// connector). Anything else can opt out with
// `{/* allow-drawn-diagram: why */}` on the line above the fence.
//
// Used as a CLI (`node scripts/check-ascii-diagrams.mjs [files...]`, defaults
// to content/) and as a library by __tests__/asciiDiagrams.test.ts.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
// Shared with check-prose.mjs so the two linters agree on mermaid bounds.
import { mermaidLines } from "./check-prose.mjs";

/** Box drawing (U+2500-257F), block elements (U+2580-259F) and geometric
 *  shapes (U+25A0-25FF): the three blocks a text-drawn figure is made of.
 *  Arrows (U+2190-21FF) are deliberately out of scope — `→` in a sentence is
 *  punctuation, not a drawing. */
const DRAW_CHAR = /[─-◿]/gu;

/** A row of a directory tree: drawn characters confined to the leading
 *  connector, and none in the content after it. `│   ├── raw/` passes;
 *  `│ Responsibilities │ Collaborators │` does not, because stripping its
 *  connector still leaves a `│` behind. */
function isTreeLine(line) {
  const rest = line.replace(/^[\s│├└─┬┼┤]*/u, "");
  DRAW_CHAR.lastIndex = 0;
  return !DRAW_CHAR.test(rest);
}

function drawCount(line) {
  return (line.match(DRAW_CHAR) || []).length;
}

/** A pure ASCII box rule, `+-----+` or `+--+--+`. */
const ASCII_RULE = /^\s*\+[-+]{3,}\+\s*$/;

/** An underbrace row: only `└┬┘─` and spaces, at least one corner. Catches the
 *  "anatomy of a statement" figures that <SyntaxBreakdown> replaces. */
const UNDERBRACE = /^\s*[└┘┬─\s]*[└┘][└┘┬─\s]*$/u;

/** Authors opt one figure out with this on the line above it. */
const ALLOW = /allow-drawn-diagram/;

/** Fence languages that mean "this is not source code". A fence tagged `py`
 *  or `java` holds a listing, where aligned comments and a row of dashes are
 *  ordinary; a `text` fence holds something the author drew. */
const PROSE_FENCE = new Set(["", "text", "txt", "plain", "plaintext", "output", "console"]);

/** A rule of dashes and spaces only, with at least two separate dash runs:
 *  the column rule under a header row (`------   --------   -----`). */
const COLUMN_RULE = /^\s*-{2,}(?:\s+-{2,})+\s*$/;

/** A single run of dashes on its own line, which is a column rule when it has
 *  a header above it and rows below. */
const SINGLE_RULE = /^\s*-{3,}\s*$/;

/** A markdown delimiter row typed inside a fence (`-- | ---- | ---`). */
const PIPE_RULE = /^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|?\s*$/;

/**
 * Every ```fence in an MDX source, as `{ line, lang, body }` where `line` is
 * the 1-based line of the opening fence and `body` is its lines.
 */
function fences(lines) {
  const found = [];
  let open = null;
  lines.forEach((line, i) => {
    const mark = line.match(/^\s*(```+|~~~+)\s*(\S*)/);
    if (!mark) {
      if (open) open.body.push(line);
      return;
    }
    if (open && mark[1].startsWith(open.mark)) {
      found.push(open);
      open = null;
    } else if (!open) {
      open = { mark: mark[1], lang: (mark[2] || "").toLowerCase(), line: i + 1, body: [] };
    } else {
      open.body.push(line);
    }
  });
  if (open) found.push(open);
  return found;
}

/**
 * True when a fence body is a table wearing a code block: a rule of dashes
 * with a header above and at least one row below. The header/rows requirement
 * keeps this off legitimate dashed lines (separators, rules around output).
 * Space-separated columns with no rule are deliberately not detected — that
 * test also matches aligned trailing comments in listings.
 */
function fakeTableRule(body) {
  for (let i = 0; i < body.length; i++) {
    const line = body[i];
    const isRule = COLUMN_RULE.test(line) || PIPE_RULE.test(line) || SINGLE_RULE.test(line);
    if (!isRule) continue;
    const header = body[i - 1];
    const row = body[i + 1];
    if (header?.trim() && row?.trim() && !COLUMN_RULE.test(header) && !SINGLE_RULE.test(header)) {
      return i;
    }
  }
  return -1;
}

/**
 * Lint one MDX source. Returns `{ file, rule, line, detail }` violations.
 * Runs over the raw source, not fenced blocks only: a drawn figure hides just
 * as happily inside a JSX prop string, with the same font problem.
 */
export function lintSource(src, file) {
  const violations = [];
  const add = (rule, line, detail) => violations.push({ file, rule, line, detail });
  const lines = src.split("\n");
  const allowed = new Set();
  lines.forEach((line, i) => {
    if (ALLOW.test(line)) {
      // An opt-out covers the block that follows; a generous window is fine
      // since the comment is an explicit author decision.
      for (let j = i; j < Math.min(lines.length, i + 60); j++) allowed.add(j);
    }
  });

  // Rule 1: runs of drawn lines that are not a directory tree.
  let run = null;
  const flush = () => {
    if (run && run.lines.length >= 2 && !run.lines.every(isTreeLine)) {
      add("drawn-diagram", run.start, run.lines[0].trim().slice(0, 80));
    }
    run = null;
  };
  lines.forEach((line, i) => {
    if (drawCount(line) >= 2 && !allowed.has(i)) {
      run ??= { start: i + 1, lines: [] };
      run.lines.push(line);
    } else {
      flush();
    }
  });
  flush();

  // Rule 2: the ASCII spellings of the same idea.
  let rules = [];
  lines.forEach((line, i) => {
    if (allowed.has(i)) return;
    if (ASCII_RULE.test(line)) rules.push(i + 1);
    if (UNDERBRACE.test(line) && drawCount(line) >= 2) {
      add("ascii-box", i + 1, line.trim().slice(0, 80));
    }
  });
  if (rules.length >= 2) add("ascii-box", rules[0], "`+-----+` box rules");

  // Rule 3: any drawn glyph inside a mermaid fence.
  for (const { line, text } of mermaidLines(lines)) {
    if (!allowed.has(line - 1) && drawCount(text) >= 1) {
      add("mermaid-glyph", line, text.trim().slice(0, 80));
    }
  }

  // Rule 4: a table typed into a prose fence.
  for (const fence of fences(lines)) {
    if (!PROSE_FENCE.has(fence.lang) || allowed.has(fence.line - 1)) continue;
    const at = fakeTableRule(fence.body);
    if (at !== -1) {
      add("fake-table", fence.line + at, fence.body[at].trim().slice(0, 80));
    }
  }

  return violations;
}

// --- file discovery -------------------------------------------------------

function walk(dir, test, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, test, out);
    else if (test(entry.name)) out.push(full);
  }
  return out;
}

/** Every lesson file this linter is responsible for. */
export function diagramFiles(root = process.cwd()) {
  return walk(path.join(root, "content"), (n) => n.endsWith(".mdx"));
}

export function lintFiles(files) {
  return files.flatMap((f) => lintSource(readFileSync(f, "utf8"), f));
}

// --- CLI ------------------------------------------------------------------

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const args = process.argv.slice(2);
  const files = args.length ? args : diagramFiles();
  const violations = lintFiles(files);
  if (violations.length) {
    const byRule = {};
    for (const v of violations) (byRule[v.rule] ??= []).push(v);
    for (const [rule, list] of Object.entries(byRule)) {
      console.error(`\n✗ ${rule} (${list.length}):`);
      for (const v of list) {
        console.error(`   ${path.relative(process.cwd(), v.file)}:${v.line}: ${v.detail}`);
      }
    }
    console.error(
      `\n${violations.length} drawn diagram(s) across ${files.length} file(s).\n\n` +
        "A figure drawn out of characters does not survive the page: the code\n" +
        "font's subset stops before U+2500, so every drawn glyph falls back to\n" +
        "another font at another width and the rows stop lining up.\n\n" +
        "  geometry is the point   <BoxModel>, <MemoryCells>, <SyntaxBreakdown>,\n" +
        "                          <CrcCard> (app/_components/mdx/diagrams.tsx)\n" +
        "  it is really a graph    a ```mermaid fence, whose labels are words:\n" +
        "                          the edge it draws is the arrow you wanted\n" +
        "  it is really a table    a markdown table\n" +
        "  a directory tree        keep it, `tree` output is the exception\n\n" +
        "Verbatim tool output that has to keep its frame can opt out with\n" +
        "`{/* allow-drawn-diagram: why */}` on the line above.",
    );
    process.exit(1);
  }
  console.log(
    `✓ ${files.length} lesson file(s) draw no diagrams or tables out of ` +
      "characters (directory trees excepted)",
  );
}
