// Pins the delimiter rewrite the Ask AI panel runs before Markdown parsing:
// a model answering with `\[ … \]` rendered as literal brackets on screen.
// The rewrite must run before Markdown and must not touch code — `\[` is
// real syntax in regexes and shell.
import { describe, expect, it } from "vitest";

import { normalizeMathDelimiters } from "../app/_components/ai/mathDelimiters";

describe("normalizeMathDelimiters", () => {
  it("rewrites a standalone display formula to fenced $$", () => {
    // Three lines, not `$$ x $$`: the one-line form parses as INLINE math, so
    // the formula would be set at text size instead of on its own line.
    expect(
      normalizeMathDelimiters(
        "In regression:\n\n\\[ \\text{residual} = y_{\\text{actual}} - y_{\\text{predicted}} \\]\n",
      ),
    ).toBe(
      "In regression:\n\n$$\n\\text{residual} = y_{\\text{actual}} - y_{\\text{predicted}}\n$$\n",
    );
  });

  it("keeps a mid-sentence display formula on one line", () => {
    // Splitting this into a block would break the sentence around it in two.
    expect(normalizeMathDelimiters("so \\[x=1\\] holds")).toBe("so $$x=1$$ holds");
  });

  it("rewrites inline math to $", () => {
    expect(normalizeMathDelimiters("The slope \\(m\\) is fixed.")).toBe(
      "The slope $m$ is fixed.",
    );
  });

  it("keeps two formulas in a paragraph separate", () => {
    // A greedy match would swallow the prose between them into one formula.
    expect(normalizeMathDelimiters("\\(a\\) and then \\(b\\)")).toBe(
      "$a$ and then $b$",
    );
  });

  it("leaves fenced code alone", () => {
    const src = "Before\n\n```python\nre.match(r\"\\[0-9\\]\", s)\n```\n\nAfter";
    expect(normalizeMathDelimiters(src)).toBe(src);
  });

  it("leaves inline code alone", () => {
    const src = "Use `arr\\[0\\]` to index it.";
    expect(normalizeMathDelimiters(src)).toBe(src);
  });

  it("rewrites prose either side of a code block", () => {
    const src = "\\(x\\)\n\n```js\nconst re = /\\[a\\]/;\n```\n\n\\(y\\)";
    expect(normalizeMathDelimiters(src)).toBe(
      "$x$\n\n```js\nconst re = /\\[a\\]/;\n```\n\n$y$",
    );
  });

  it("leaves a half-streamed formula for a later pass", () => {
    // The answer streams in; the closing delimiter simply hasn't arrived yet.
    expect(normalizeMathDelimiters("In regression:\n\n\\[ \\text{res")).toBe(
      "In regression:\n\n\\[ \\text{res",
    );
  });

  it("returns markdown with no LaTeX delimiters untouched", () => {
    const src = "Plain **markdown** with `code` and a [link](/x).";
    expect(normalizeMathDelimiters(src)).toBe(src);
  });

  it("leaves $-delimited math as it already is", () => {
    const src = "The mean $\\bar{x}$ and $$\\sigma^2$$ are unchanged.";
    expect(normalizeMathDelimiters(src)).toBe(src);
  });
});
