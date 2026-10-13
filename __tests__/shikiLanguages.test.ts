/**
 * The Next.js bundle highlights code with `lib/shiki-slim.ts`, which loads
 * only the grammars it lists. A fence in a language it does not list does
 * not fall back to plain text at request time: it throws `ShikiError:
 * Language "diff" not found` and the lesson renders as a 500. No content
 * checker sees that, because none of them run the highlighter, so this pins
 * every fenced language in content/ to the list.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { bundledLanguages } from "@/lib/shiki-slim";

/** Never reach a grammar: Shiki renders these as plain text, and mermaid
 *  fences are turned into diagrams before highlighting. */
const SPECIAL = new Set(["text", "txt", "plaintext", "plain", "mermaid"]);

function mdxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return mdxFiles(path);
    return name.endsWith(".mdx") ? [path] : [];
  });
}

describe("fenced code languages", () => {
  it("are all loaded by the slim highlighter", () => {
    const missing = new Map<string, string>();
    for (const file of mdxFiles(join(__dirname, "..", "content"))) {
      for (const m of readFileSync(file, "utf8").matchAll(/^\s*`{3,}([A-Za-z0-9_+-]+)/gm)) {
        const lang = m[1].toLowerCase();
        if (!SPECIAL.has(lang) && !(lang in bundledLanguages) && !missing.has(lang)) {
          missing.set(lang, file);
        }
      }
    }
    expect(
      [...missing].map(([lang, file]) => `${lang} (first used in ${file})`),
      "add each language to bundledLanguages in lib/shiki-slim.ts",
    ).toEqual([]);
  });
});
