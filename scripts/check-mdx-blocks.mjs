/**
 * Guards the MDX mistakes that are invisible until deploy.
 *
 * **A component tag spliced into another component's props.** `<Chart
 * slug="…" />` dropped inside a `<CodeBlock>`'s `files={[…]}` cuts the template
 * literal in half. The file still looks like markdown, `next build` still
 * compiles, the type checker still passes, and the failure arrives at prerender
 * as `Could not parse expression with acorn` pointing at a line number inside
 * compiled output. That is an expensive way to find out.
 *
 * **A double quote inside a double-quoted attribute.** Same shape of failure,
 * found the same expensive way. A caption written as
 *
 *     caption="the imitation game turned "can machines think?" into a question"
 *
 * ends its attribute at the second quote, and everything after it is read as
 * more attribute names, so the parse dies on the `?` with a column number and
 * no file name. There is no way to write a literal `"` in a quoted JSX
 * attribute: use single quotes inside, or an expression. Sixty hand-written
 * captions produced exactly one of these, and it reached CI because nothing
 * before `next build` parses MDX as JSX.
 *
 * So: every component tag at the start of a line must be at the top level,
 * every props block must be closed, and every quoted attribute value must end
 * where it claims to. All three are cheap to check and none has a legitimate
 * exception.
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
  // True while inside the attribute part of a component tag: see the quoted
  // attribute check below.
  let attrsLive = false;
  const where = relative(ROOT, file);

  for (let i = 0; i < lines.length; i++) {
    // A self-closing component on its own line is the shape a stray insertion
    // takes. Inside a props block it is not a component at all: it is text that
    // has been dropped into somebody else's JavaScript expression. Inside a
    // fence it is a code sample, which several lessons legitimately contain.
    if (code[i] === "props" && /^<[A-Z]\w*[^>]*\/>\s*$/.test(lines[i])) {
      problems.push(`${where}:${i + 1}: component tag inside a props block: ${lines[i].trim()}`);
    }

    // A quoted attribute value that does not end where its closing quote says
    // it does.
    //
    // Only the attributes are checked, which means: from a component tag up to
    // its first `{`. Past that the props are a JavaScript expression, and the
    // template literals inside it hold whole Python and R programs whose
    // `annotation_position="top",` lines are not attributes at all and are not
    // wrong. `attrsLive` is what keeps those out.
    if (code[i] !== "props") attrsLive = false;
    else if (i === 0 || code[i - 1] !== "props") attrsLive = true;
    if (attrsLive && lines[i].includes("{")) attrsLive = false;
    const oneLineTag = !code[i] && /^<[A-Z]\w*[^>{]*\/>\s*$/.test(lines[i]);
    if (attrsLive || oneLineTag) {
      for (const m of lines[i].matchAll(/(?:\s|^)([A-Za-z_][\w:-]*)="[^"]*"/g)) {
        const after = lines[i][m.index + m[0].length];
        // Whitespace, `/>` or the end of the line all mean the value really
        // ended. Anything else is the rest of a value that got cut in half.
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

if (problems.length > 0) {
  console.error(`\n✗ ${problems.length} problem(s):\n   ` + problems.join("\n   ") + "\n");
  process.exit(1);
}

console.log(
  `✓ ${files.length} MDX file(s): component tags all at the top level, ` +
    `attribute values all closed`,
);
