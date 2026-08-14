// Pins math support in a challenge card's `instructions` prop: it is a plain
// string prop the source.config.ts pipeline never touches, and GFM-only
// parsing once printed raw LaTeX on the page. The fix (remarkMath +
// rehypeKatex) risks the mirror image — a pair of literal dollars ("$5 off,
// or $10 for members") read as a math span — which the content guard below
// checks against the real content.
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

/** The math half of renderMarkdownInstructions' plugin list, mirrored by hand
 *  (react-markdown needs a DOM; these tests run under Node). rehypeHighlight
 *  and labelBareFences are deliberately absent — covered by
 *  challengeInstructionsHighlight.test.tsx, and neither can affect a math
 *  span. The tree is inspected directly, so no HTML stringifier is needed. */
const pipeline = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype)
  .use(rehypeKatex, { throwOnError: false, errorColor: "#ef4444" });

interface Rendered {
  /** Every text node, concatenated. */
  text: string;
  /** Every class name anywhere in the tree. */
  classes: string[];
}

function render(source: string): Rendered {
  const tree = pipeline.runSync(pipeline.parse(source)) as unknown;
  const out: Rendered = { text: "", classes: [] };

  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const n = node as {
      type?: string;
      value?: string;
      properties?: { className?: unknown };
      children?: unknown[];
    };
    if (n.type === "text" && typeof n.value === "string") out.text += n.value;
    const cn = n.properties?.className;
    if (Array.isArray(cn)) out.classes.push(...cn.map(String));
    else if (typeof cn === "string") out.classes.push(cn);
    for (const child of n.children ?? []) walk(child);
  };

  walk(tree);
  return out;
}

describe("challenge instructions markdown", () => {
  it("renders inline LaTeX to KaTeX markup", () => {
    const { text, classes } = render(
      "Recall that $\\int_{-1}^{1} \\sqrt{1 - x^2}\\,dx = \\pi/2$ (a half-disk).",
    );
    expect(classes).toContain("katex");
    // Rendered glyphs, not the source: the reported symptom was the raw
    // `$\int_{-1}^{1} …$` appearing on the page.
    expect(text).toContain("\u222b");
    expect(text).toContain("\u03c0");
    expect(text).not.toContain("$");
    // KaTeX's <annotation> keeps the original TeX inside .katex (for screen
    // readers/copy), so its presence in the concatenated text is not a leak.
  });

  it("renders display LaTeX", () => {
    const { classes } = render("$$\n\\mathrm{Var}(x) = \\frac{1}{n} \\sum_i x_i^2\n$$");
    expect(classes).toContain("katex-display");
  });

  it("leaves a lone currency dollar alone", () => {
    const { text, classes } = render("`FLAT5` gives $5 off the subtotal.");
    expect(text).toContain("$5 off");
    expect(classes).not.toContain("katex");
  });

  it("does not read dollars inside code as math", () => {
    const { text, classes } = render("Plot `airquality$Ozone` against `women$weight`.");
    expect(text).toContain("airquality$Ozone");
    expect(text).toContain("women$weight");
    expect(classes).not.toContain("katex");
  });
});

// ── The content guard ────────────────────────────────────────────────────

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
