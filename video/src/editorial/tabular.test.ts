// Run with `npm test` (node --test; Node strips the types).
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Inter's tabular figures give a hyphen a digit's width too, so TABULAR (or
 * tabular-nums) over a phrase sets "p-value" as "p - value". The review of the
 * Data Scientist videos found it in most of them. Tabular figures belong on
 * the number alone (<Num>, src/editorial/ui.tsx). This fails on an element
 * whose style spreads TABULAR and whose own text has a hyphenated word.
 */
const SRC = join(fileURLToPath(new URL(".", import.meta.url)), "..");

function* sources(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sources(path);
    else if (path.endsWith(".tsx")) yield path;
  }
}

test("tabular figures never cover a hyphenated word", () => {
  const found: string[] = [];
  for (const file of sources(SRC)) {
    const source = readFileSync(file, "utf8");
    for (const m of source.matchAll(/<(span|div|b|text|tspan)\b[^>]*?(\.\.\.TABULAR|tabular-nums)[^>]*?>/gs)) {
      const close = source.indexOf(`</${m[1]}>`, m.index + m[0].length);
      if (close < 0) continue;
      const text = source
        .slice(m.index + m[0].length, close)
        .replace(/\{[^{}]*\}/g, " ")
        .replace(/<[^>]*>/g, " ");
      if (/[A-Za-z]-[A-Za-z]/.test(text)) found.push(`${relative(SRC, file)}:${source.slice(0, m.index).split("\n").length}`);
    }
  }
  assert.deepEqual(found, [], `TABULAR over a hyphenated word; put it on the number (<Num>):\n  ${found.join("\n  ")}`);
});
