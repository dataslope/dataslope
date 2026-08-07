/**
 * Guards the one MDX mistake that is invisible until deploy: a component tag
 * spliced into the middle of another component's props.
 *
 * `<Chart slug="…" />` dropped inside a `<CodeBlock>`'s `files={[…]}` cuts the
 * template literal in half. The file still looks like markdown, `next build`
 * still compiles, the type checker still passes, and the failure arrives at
 * prerender as `Could not parse expression with acorn` pointing at a line
 * number inside compiled output. That is an expensive way to find out.
 *
 * So: every component tag at the start of a line must be at the top level, and
 * every props block must be closed. Both are cheap to check and neither has a
 * legitimate exception.
 *
 *   node scripts/check-mdx-blocks.mjs
 */
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";

import { collectFiles } from "./lib/build-cache.mjs";
import { codeRegions } from "./lib/mdx-regions.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const CONTENT = fileURLToPath(new URL("../content/", import.meta.url));

const files = collectFiles(CONTENT, (name) => name.endsWith(".mdx"));
const problems = [];

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  const code = codeRegions(lines);
  const where = relative(ROOT, file);

  for (let i = 0; i < lines.length; i++) {
    // A self-closing component on its own line is the shape a stray insertion
    // takes. Inside a props block it is not a component at all: it is text that
    // has been dropped into somebody else's JavaScript expression. Inside a
    // fence it is a code sample, which several lessons legitimately contain.
    if (code[i] === "props" && /^<[A-Z]\w*[^>]*\/>\s*$/.test(lines[i])) {
      problems.push(`${where}:${i + 1}: component tag inside a props block: ${lines[i].trim()}`);
    }
  }

  // An unterminated props block swallows the rest of the file, which shows up
  // as every later heading going missing rather than as a parse error.
  if (code[lines.length - 1] && lines[lines.length - 1].trim() !== "") {
    problems.push(`${where}: file ends inside an unclosed code region`);
  }
}

if (problems.length > 0) {
  console.error(`\n✗ ${problems.length} problem(s):\n   ` + problems.join("\n   ") + "\n");
  process.exit(1);
}

console.log(`✓ component tags in ${files.length} MDX file(s) are all at the top level`);
