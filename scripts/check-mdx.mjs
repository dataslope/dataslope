// Compiles each MDX file with the same core plugins fumadocs uses, so
// authoring-time JSX/expression errors (unescaped `{`/`}`, stray `<`,
// unterminated template literals, malformed component props) surface
// here instead of during a full Next build. Exits non-zero on the first
// file that fails to compile.
import { readFileSync } from "node:fs";
import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: node scripts/check-mdx.mjs <file.mdx> ...");
  process.exit(2);
}

// Strip a leading YAML frontmatter block (--- ... ---) so the MDX
// compiler doesn't choke on it; we only care about body compilation.
function stripFrontmatter(src) {
  if (src.startsWith("---")) {
    const end = src.indexOf("\n---", 3);
    if (end !== -1) {
      const after = src.indexOf("\n", end + 1);
      return src.slice(after + 1);
    }
  }
  return src;
}

let failed = 0;
for (const file of files) {
  const src = stripFrontmatter(readFileSync(file, "utf8"));
  try {
    await compile(src, {
      remarkPlugins: [remarkGfm, remarkMath, remarkMdxMermaid],
    });
  } catch (e) {
    failed++;
    const line = e?.line != null ? `:${e.line}:${e.column ?? ""}` : "";
    console.error(`\n✗ ${file}${line}`);
    console.error(`  ${e?.reason ?? e?.message ?? String(e)}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} file(s) FAILED to compile.`);
  process.exit(1);
}
console.log(`✓ all ${files.length} MDX file(s) compiled OK`);
