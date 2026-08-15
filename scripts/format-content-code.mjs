// Idempotent formatter for the authored `starterCode` / `solutionCode` of
// `<CodeBlock>` / `<ChallengeCard>` elements with adapter "web" or "react",
// using the SAME @wasm-fmt/web_fmt the in-app "Format" button uses (2-space),
// so clicking Format on a starter stays a no-op.
//
// Safety: targets are located via the MDX estree, never a regex; template
// literals with `${…}` interpolation are skipped (reformatting would drop
// it); unknown filename extensions are skipped; every changed file is
// re-compiled with @mdx-js/mdx before writing, and a compile failure aborts
// that file.
//
// Usage:
//   node scripts/format-content-code.mjs                 # dry run, all content
//   node scripts/format-content-code.mjs --apply         # write changes
//   node scripts/format-content-code.mjs --course react-from-the-ground-up
//   node scripts/format-content-code.mjs --apply content/courses/x/y.mdx

import { readFileSync, writeFileSync } from "node:fs";
import { globSync } from "node:fs";
import path from "node:path";
import { remark } from "remark";
import remarkMdx from "remark-mdx";
import { visit } from "unist-util-visit";
import { compile } from "@mdx-js/mdx";
import { format as webFmt } from "@wasm-fmt/web_fmt/web_fmt_node.js";

const WEB_FMT_2SPACE = { indentStyle: "space", indentWidth: 2 };
const TARGET_COMPONENTS = new Set(["CodeBlock", "ChallengeCard"]);
const TARGET_ADAPTERS = new Set(["web", "react"]);
const CODE_KEYS = new Set(["starterCode", "solutionCode"]);
// Extensions web_fmt can format (markup_fmt / malva / biome). Anything else
// (datasets, .txt, .md, …) is left untouched.
const FORMATTABLE_EXT = /\.(html?|css|scss|less|jsx?|mjs|cjs|tsx?|json)$/i;

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const courseIdx = args.indexOf("--course");
const course = courseIdx >= 0 ? args[courseIdx + 1] : null;
const explicitFiles = args.filter(
  (a, i) =>
    !a.startsWith("--") && a !== course && (courseIdx < 0 || i !== courseIdx + 1),
);

function targetFiles() {
  if (explicitFiles.length > 0) return explicitFiles;
  const dir = course ? `content/courses/${course}` : "content";
  return globSync(`${dir}/**/*.mdx`);
}

/** String value of a plain `name="..."` JSX attribute, or undefined. */
function attrString(node, name) {
  const a = node.attributes?.find(
    (x) => x.type === "mdxJsxAttribute" && x.name === name,
  );
  return a && typeof a.value === "string" ? a.value : undefined;
}

/** The estree Program attached to an expression attribute (e.g. `files={…}`). */
function attrEstree(node, name) {
  const a = node.attributes?.find(
    (x) => x.type === "mdxJsxAttribute" && x.name === name,
  );
  return a?.value?.data?.estree;
}

/** Absolute [start, end) source offsets of an estree node. */
function offsetsOf(n) {
  if (typeof n.start === "number" && typeof n.end === "number") {
    return [n.start, n.end];
  }
  const p = n.loc ?? n.position;
  if (p?.start?.offset != null) return [p.start.offset, p.end.offset];
  if (Array.isArray(n.range)) return n.range;
  return null;
}

/** Collect { filename, key, start, end } for each formattable code literal in
 *  a `files` ObjectExpression array. */
function collectFromFilesEstree(estree, out, warn) {
  const array = estree?.body?.[0]?.expression;
  if (!array || array.type !== "ArrayExpression") return;
  for (const obj of array.elements) {
    if (!obj || obj.type !== "ObjectExpression") continue;
    let filename;
    const literals = [];
    for (const prop of obj.properties) {
      if (prop.type !== "Property" || prop.computed) continue;
      const key = prop.key?.name ?? prop.key?.value;
      if (key === "filename" && prop.value?.type === "Literal") {
        filename = String(prop.value.value);
      } else if (CODE_KEYS.has(key) && prop.value?.type === "TemplateLiteral") {
        literals.push({ key, node: prop.value });
      }
    }
    for (const { key, node } of literals) {
      if (node.expressions.length > 0 || node.quasis.length !== 1) {
        warn(`skipped ${key} (${filename ?? "?"}): contains \${…} interpolation`);
        continue;
      }
      if (!filename || !FORMATTABLE_EXT.test(filename)) {
        warn(`skipped ${key}: filename "${filename ?? "?"}" not formattable`);
        continue;
      }
      const o = offsetsOf(node);
      if (!o) {
        warn(`skipped ${key} (${filename}): no source offsets`);
        continue;
      }
      out.push({ filename, key, start: o[0], end: o[1] });
    }
  }
}

function cook(raw) {
  // Safe: only single-quasi literals reach here, so there is no interpolation
  // to execute. Mirrors lib/remarkPreserveCodeIndent.ts.
  return Function("return `" + raw + "`")();
}

function escapeTemplate(code) {
  return code
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

async function processFile(file, stats) {
  const src = readFileSync(file, "utf8");
  let tree;
  try {
    tree = remark().use(remarkMdx).parse(src);
  } catch (err) {
    const where = err.line ? ` (line ${err.line})` : "";
    stats.warnings.push(`${file}: SKIPPED, could not parse MDX${where}: ${err.reason ?? err.message}`);
    return { changed: false };
  }

  const targets = [];
  const warnings = [];
  const warn = (m) => warnings.push(m);
  visit(tree, (node) => {
    if (
      (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") &&
      TARGET_COMPONENTS.has(node.name)
    ) {
      const adapter = attrString(node, "adapter");
      if (!adapter || !TARGET_ADAPTERS.has(adapter)) return;
      const estree = attrEstree(node, "files");
      if (estree) collectFromFilesEstree(estree, targets, warn);
    }
  });

  // Build replacements (descending by start so earlier offsets stay valid).
  const edits = [];
  for (const t of targets) {
    const original = src.slice(t.start, t.end);
    if (!original.startsWith("`") || !original.endsWith("`")) {
      warn(`skipped ${t.key} (${t.filename}): slice is not a template literal`);
      continue;
    }
    const code = cook(original.slice(1, -1));
    let formatted;
    try {
      formatted = webFmt(code, t.filename, WEB_FMT_2SPACE);
    } catch (err) {
      warn(`skipped ${t.key} (${t.filename}): web_fmt error: ${err.message}`);
      continue;
    }
    const replacement = "`" + escapeTemplate(formatted) + "`";
    if (replacement !== original) {
      edits.push({ ...t, replacement });
    }
    stats.valuesSeen++;
  }

  for (const w of warnings) stats.warnings.push(`${file}: ${w}`);
  if (edits.length === 0) return { changed: false };

  edits.sort((a, b) => b.start - a.start);
  let next = src;
  for (const e of edits) {
    next = next.slice(0, e.start) + e.replacement + next.slice(e.end);
  }

  // Verify the rewritten file still compiles before writing anything.
  try {
    await compile(next, { jsx: true });
  } catch (err) {
    stats.warnings.push(`${file}: ABORTED, rewrite did not compile: ${err.message}`);
    return { changed: false };
  }

  if (apply) writeFileSync(file, next);
  return { changed: true, count: edits.length };
}

const files = targetFiles();
const stats = { filesChanged: 0, valuesSeen: 0, valuesFormatted: 0, warnings: [] };
const changedFiles = [];

for (const file of files) {
  const res = await processFile(file, stats);
  if (res.changed) {
    stats.filesChanged++;
    stats.valuesFormatted += res.count;
    changedFiles.push(`${path.relative(".", file)} (${res.count})`);
  }
}

console.log(`\nMode: ${apply ? "APPLY (writing)" : "DRY RUN (no writes)"}`);
console.log(`Files scanned: ${files.length}`);
console.log(`Code literals inspected (web/react starter/solution): ${stats.valuesSeen}`);
console.log(`Files ${apply ? "changed" : "that would change"}: ${stats.filesChanged}`);
console.log(`Literals reformatted: ${stats.valuesFormatted}`);
if (changedFiles.length) {
  console.log("\nChanged files:");
  for (const f of changedFiles) console.log(`  ${f}`);
}
if (stats.warnings.length) {
  console.log(`\nNotes / skips (${stats.warnings.length}):`);
  for (const w of stats.warnings.slice(0, 60)) console.log(`  ${w}`);
  if (stats.warnings.length > 60) console.log(`  … ${stats.warnings.length - 60} more`);
}
