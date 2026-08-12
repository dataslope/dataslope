// Lints lesson content for diagrams "drawn" out of characters: a figure built
// from `┌─┐│└┘`, from `+-----+` and `---->`, or from `└──┬──┘` underbraces.
//
// Three rules, all scoped to content/**/*.mdx:
//
//   1. drawn-diagram, two or more consecutive lines each carrying two or more
//                    box-drawing characters, where at least one of them is not
//                    a directory tree (see below).
//   2. ascii-box,    two or more `+-----+` rules in one file, the ASCII
//                    equivalent, plus the `└──┬──┘` underbrace shape.
//   3. mermaid-glyph, a single drawn character anywhere inside a ```mermaid
//                    fence. Mermaid's own syntax is pure ASCII, so a drawn
//                    glyph in one can only be decoration inside a label — and
//                    it is always redundant decoration, because the thing it
//                    is imitating is the edge mermaid already draws. Five node
//                    labels across the two Java courses read `s = ●─`, a
//                    reference dot with a wire, in a node that had a real
//                    arrow leaving it.
//
// ── Why a drawn figure is a bug and not a style preference ─────────────────
//
// Code on this site is set in JetBrains Mono, loaded by next/font/google with
// `subsets: ["latin"]` (app/layout.tsx). That subset ends long before U+2500,
// so every box-drawing character falls back to whatever monospace the reader's
// operating system supplies, at that font's advance width rather than
// JetBrains Mono's. A line's rendered width then depends on how many drawn
// characters it happens to contain, and rows that were aligned in the source
// arrive on the page at different widths. The CSS box-model figure on
// `modern-css-layout/box-model-and-sizing` is what surfaced this: four
// concentric boxes reached readers as a scatter of disconnected line
// fragments. Widening the font subset would not fix the rest of it either — a
// drawn figure is still an image made of text, so a screen reader spells the
// corner glyphs out one at a time, nothing reflows on a phone, and the drawing
// cannot take the page's colors or its theme.
//
// The replacements are all in the repo already: `<BoxModel>`, `<MemoryCells>`,
// `<SyntaxBreakdown>` and `<CrcCard>` (app/_components/mdx/diagrams.tsx) for a
// figure whose geometry is the point, a ```mermaid fence for anything that is
// really a graph, and a markdown table for anything that is really a table.
//
// ── The one shape that stays ───────────────────────────────────────────────
//
// A directory tree. It is the literal output format of `tree`, universal in
// READMEs and terminals, and it is the one drawn shape the font fallback does
// not break: every row at a given depth carries the same prefix, so siblings
// still line up even at a different advance width. The `isTreeLine` test below
// is what recognizes one, and it is deliberately narrow — drawn characters may
// appear only in a row's leading connector, never in its content, which is
// exactly what separates `├── data/` from `│ Class: Order │`.
//
// Anything else that genuinely has to be drawn (real `mysql` CLI output, say,
// which frames its result set in `+------+`) can opt out with a comment on the
// line above the fence:
//
//     {/* allow-drawn-diagram: verbatim mysql client output */}
//
// Used both as a CLI (`node scripts/check-ascii-diagrams.mjs [files...]`,
// defaults to all of content/) and as a library by
// __tests__/asciiDiagrams.test.ts.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
// The fence walker the mermaid-dash rule already uses. Shared rather than
// re-implemented so the two linters cannot disagree about where a mermaid
// block starts and ends.
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

/**
 * Lint one MDX source. Returns `{ file, rule, line, detail }` violations.
 *
 * Runs over the raw source rather than over fenced blocks only: a drawn figure
 * hides just as happily inside a JSX prop (the Python exception hierarchy sat
 * in a `starterCode` string for exactly that reason) as it does in a ```text
 * fence, and the font problem is the same in both places.
 */
export function lintSource(src, file) {
  const violations = [];
  const add = (rule, line, detail) => violations.push({ file, rule, line, detail });
  const lines = src.split("\n");
  const allowed = new Set();
  lines.forEach((line, i) => {
    if (ALLOW.test(line)) {
      // An opt-out covers the block that follows it, which in practice means
      // "until the next blank line after the drawing ends". Marking a generous
      // window is fine: the comment is an explicit author decision either way.
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
    `✓ ${files.length} lesson file(s) draw no diagrams out of characters ` +
      "(directory trees excepted)",
  );
}
