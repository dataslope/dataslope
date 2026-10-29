// Run with `npm test` (node --test; Node strips the types).
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * An SVG <text> takes its color from `fill`, not CSS `color`, so one styled
 * with label(), note() or another text style draws black whatever color the
 * style names. It reached the frames twice in the Data Scientist series (a
 * P1 in Statistics, every hat number in Probability) and 28 times in all
 * before svgText() existed. Every such <text> sets `fill` or wraps its style
 * in svgText() (src/editorial/style.ts).
 */
const SRC = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TEXT_STYLE = /\.\.\.(label|note|noteText|labelText|math|headline)\(/;

function* sources(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sources(path);
    else if (path.endsWith(".tsx")) yield path;
  }
}

/** Each <text …> opening tag in a file, with the line it starts on. */
function* textTags(source: string): Generator<{ tag: string; line: number }> {
  for (const match of source.matchAll(/<text\b/g)) {
    let i = match.index + match[0].length;
    let depth = 0;
    for (; i < source.length; i++) {
      const c = source[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    yield { tag: source.slice(match.index, i), line: source.slice(0, match.index).split("\n").length };
  }
}

test("SVG text styled with a text style carries its color in fill", () => {
  const bare: string[] = [];
  for (const file of sources(SRC)) {
    const source = readFileSync(file, "utf8");
    for (const { tag, line } of textTags(source)) {
      const colored = /\bfill=/.test(tag) || tag.includes("fill:") || tag.includes("svgText(");
      if (TEXT_STYLE.test(tag) && !colored) bare.push(`${relative(SRC, file)}:${line}`);
    }
  }
  assert.deepEqual(bare, [], `SVG <text> that will draw black; wrap its style in svgText():\n  ${bare.join("\n  ")}`);
});
