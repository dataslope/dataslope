#!/usr/bin/env node
// Compile MDX files through (approximately) the same remark/rehype pipeline the
// site uses, to catch syntax breakage from the diagram edits. Pass file paths,
// or nothing to validate the whole content/learn tree.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins";

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".mdx")) out.push(p);
  }
  return out;
}

const args = process.argv.slice(2);
// Expand any directory args to the .mdx files within; keep file args as-is.
const files = args.length
  ? args.flatMap((a) => (statSync(a).isDirectory() ? walk(a) : [a]))
  : walk("content/learn");

let failures = 0;
for (const file of files) {
  let src = readFileSync(file, "utf8");
  // Strip leading YAML frontmatter — the real loader parses it separately, so
  // `<…>` in a description must not be compiled as MDX/JSX.
  src = src.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  try {
    await compile(src, {
      format: "mdx",
      // Match the app: gfm tables, math, and the mermaid remark transform.
      remarkPlugins: [remarkGfm, remarkMath, remarkMdxMermaid],
    });
  } catch (err) {
    failures++;
    const line = err?.line ? `:${err.line}:${err.column ?? ""}` : "";
    console.log(`✗ ${file}${line}\n    ${err.message.split("\n")[0]}`);
  }
}

if (failures === 0) console.log(`✓ ${files.length} file(s) compiled cleanly`);
else {
  console.log(`\n${failures} file(s) failed to compile`);
  process.exit(1);
}
