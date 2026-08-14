/**
 * Guards the MDX mistakes that are invisible until deploy — the failure
 * otherwise arrives at prerender as `Could not parse expression with acorn`
 * pointing into compiled output. Checks: no component tag spliced into
 * another component's props (it cuts a template literal in half); no double
 * quote inside a double-quoted attribute (it ends the attribute early — use
 * single quotes inside, or an expression); every props block closed.
 *
 * Those are line-shape heuristics with gaps, so the last step runs the real
 * MDX parser over every lesson (~13s): the heuristics give the specific
 * diagnosis, the parse makes the check honest about whether the file
 * compiles.
 *
 *   node scripts/check-mdx-blocks.mjs
 */
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { collectFiles } from "./lib/build-cache.mjs";
import { codeRegions } from "./lib/mdx-regions.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const CONTENT = fileURLToPath(new URL("../content/", import.meta.url));

const files = collectFiles(CONTENT, (name) => name.endsWith(".mdx"));
const problems = [];

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  const code = codeRegions(lines);
  // True while inside the attribute part of a component tag: see the quoted
  // attribute check below.
  let attrsLive = false;
  const where = relative(ROOT, file);

  for (let i = 0; i < lines.length; i++) {
    // A component tag inside a props block is text dropped into somebody
    // else's JavaScript expression (inside a fence it is a legitimate code
    // sample). Both the one-line `<Chart … />` and a tag opening a props
    // block of its own count; what separates the latter from a legitimate
    // top-level opener is whether a block was *already* open above.
    const nested = code[i] === "props" && i > 0 && code[i - 1] === "props";
    if (
      /^<[A-Z]\w*/.test(lines[i]) &&
      (nested || (code[i] === "props" && /^<[A-Z]\w*[^>]*\/>\s*$/.test(lines[i])))
    ) {
      problems.push(`${where}:${i + 1}: component tag inside a props block: ${lines[i].trim()}`);
    }

    // A quoted attribute value that does not end where its closing quote says
    // it does. Only real attributes are checked — from a component tag up to
    // its first `{`; past that the props are a JavaScript expression whose
    // template literals hold whole programs. `attrsLive` keeps those out.
    if (code[i] !== "props") attrsLive = false;
    else if (i === 0 || code[i - 1] !== "props") attrsLive = true;
    if (attrsLive && lines[i].includes("{")) attrsLive = false;
    const oneLineTag = !code[i] && /^<[A-Z]\w*[^>{]*\/>\s*$/.test(lines[i]);
    if (attrsLive || oneLineTag) {
      // A quote opened and never closed on the same line swallows the tag's
      // own `/>`, and the pair-matching rule below cannot see it (no pair to
      // match). An odd quote count says so directly; no legitimate line in
      // `content/` has one.
      if (((lines[i].match(/"/g) ?? []).length & 1) === 1) {
        problems.push(
          `${where}:${i + 1}: attribute value opens a quote and never closes it: ` +
            lines[i].trim().slice(0, 90),
        );
      }
      for (const m of lines[i].matchAll(/(?:\s|^)([A-Za-z_][\w:-]*)="[^"]*"/g)) {
        const after = lines[i][m.index + m[0].length];
        // Whitespace, `/>` or end-of-line mean the value really ended;
        // anything else is a value cut in half.
        if (after !== undefined && !/[\s/>]/.test(after)) {
          problems.push(
            `${where}:${i + 1}: quote inside the "${m[1]}" attribute value ` +
              `ends it early (use single quotes inside): ${lines[i].trim().slice(0, 90)}`,
          );
        }
      }
    }
  }

  // An unterminated props block swallows the rest of the file, which shows up
  // as every later heading going missing rather than as a parse error.
  if (code[lines.length - 1] && lines[lines.length - 1].trim() !== "") {
    problems.push(`${where}: file ends inside an unclosed code region`);
  }
}

// A fence with no language renders unhighlighted and nothing says so. `text`
// is always available, so leaving it off is never intended. Fences carrying
// meta (```csharp title="x") are openers too; a closing fence is backticks
// alone.
for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  let open = null;
  lines.forEach((line, i) => {
    const close = line.match(/^\s{0,3}(`{3,})\s*$/);
    const mark = line.match(/^\s{0,3}(`{3,})[ \t]*([^\s`]*)/);
    if (open) {
      if (close && close[1].length >= open.ticks) open = null;
      return;
    }
    if (!mark) return;
    open = { ticks: mark[1].length };
    if (!mark[2]) {
      problems.push(
        `${relative(ROOT, file)}:${i + 1}: fenced block has no language, so it ` +
          `renders unhighlighted (use \`text\` if it is not code)`,
      );
    }
  });
}

// The authoritative pass: does the file parse as MDX at all? remarkMath and
// remarkGfm match source.config.ts. Frontmatter is blanked rather than
// stripped so reported line numbers still point at the file.
const mdx = unified().use(remarkParse).use(remarkMdx).use(remarkGfm).use(remarkMath);
for (const file of files) {
  const src = readFileSync(file, "utf8").replace(/^---\n[\s\S]*?\n---\n/, (m) =>
    m.replace(/[^\n]/g, ""),
  );
  try {
    mdx.runSync(mdx.parse(src));
  } catch (err) {
    const at = err.line ? `:${err.line}:${err.column ?? 0}` : "";
    problems.push(
      `${relative(ROOT, file)}${at}: does not parse as MDX: ` +
        String(err.reason ?? err.message).slice(0, 100) +
        (err.cause ? ` (${String(err.cause.message).slice(0, 60)})` : ""),
    );
  }
}

if (problems.length > 0) {
  console.error(`\n✗ ${problems.length} problem(s):\n   ` + problems.join("\n   ") + "\n");
  console.error(
    "A component placed immediately before existing prose must be followed by a\n" +
      "blank line. `/>` with text after it on the same line is a JSX element with\n" +
      "trailing content, which is the acorn error above.\n",
  );
  process.exit(1);
}

console.log(
  `✓ ${files.length} MDX file(s): component tags all at the top level, ` +
    `attribute values all closed, every fence declares a language, ` +
    `every file parses as MDX`,
);
