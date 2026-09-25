// A challenge card's `instructions` prop renders through remarkMath +
// rehypeKatex (renderMarkdownInstructions in app/_components/challengeShared.tsx).
// The risk that brings is a pair of literal dollars ("$5 off, or $10 for
// members") read as a math span, which this content guard checks against the
// real content.
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function mdxFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return mdxFiles(p);
    return e.name.endsWith(".mdx") ? [p] : [];
  });
}

/** Blank out fenced blocks and inline code, where `$` is never math. The value
 *  comes from MDX source, so backticks arrive escaped as `\`` — un-escape
 *  first so fences are findable. `\$` stays: a Markdown-escaped dollar. */
function stripCode(value: string): string {
  return value
    .replace(/\\`/g, "`")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]*`/g, "");
}

const INSTRUCTIONS = /\binstructions=\{`([\s\S]*?)`\}|\binstructions="([^"]*)"/g;

describe("instructions props are safe for remark-math", () => {
  it("never pairs two literal dollars in prose", () => {
    const offenders: string[] = [];

    for (const file of mdxFiles("content")) {
      const src = fs.readFileSync(file, "utf8");
      for (const match of src.matchAll(INSTRUCTIONS)) {
        const value = stripCode(match[1] ?? match[2] ?? "");
        // `\$` is an escaped literal; remark-math leaves it as text.
        const bare = [...value.matchAll(/(^|[^\\])\$/g)].length;
        if (bare === 0) continue;

        // A math span needs an opening `$` immediately followed by non-space.
        // Anything left over after removing well-formed spans is prose, and
        // prose with an even number of dollars is a pair waiting to be eaten.
        const leftover = value.replace(/\$(?!\s)[^$\n]*?(?<!\s)\$/g, "");
        const stray = [...leftover.matchAll(/(^|[^\\])\$/g)].length;
        if (stray > 0 && stray % 2 === 0) {
          const line = src.slice(0, match.index).split("\n").length;
          offenders.push(`${file}:${line} has ${stray} unpaired literal dollars`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
