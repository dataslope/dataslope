import { describe, expect, it } from "vitest";
import { highlight, type HighlightedLine } from "@/app/challenges/_components/highlight";
import {
  getChallenge,
  getChallengeSlugs,
  type CodeLanguage,
} from "@/lib/challenges";

/** Rebuild the source text from its tokens. */
function detokenize(lines: HighlightedLine[]): string {
  return lines.map((tokens) => tokens.map((t) => t.text).join("")).join("\n");
}

/**
 * `highlight` drops one trailing newline on purpose, so a file ending in a
 * newline does not render a phantom last line number. Round-trip comparisons
 * measure against that same form.
 */
const withoutTrailingNewline = (s: string) => s.replace(/\n$/, "");

/** Kinds assigned to each identifier in a line, for spot-checks. */
function kindOf(lines: HighlightedLine[], text: string): string | undefined {
  for (const tokens of lines) {
    for (const token of tokens) {
      if (token.text === text) return token.kind;
    }
  }
  return undefined;
}

describe("challenge editor highlighter", () => {
  it("never loses or reorders source text", () => {
    const cases: [string, CodeLanguage][] = [];
    for (const slug of getChallengeSlugs()) {
      const challenge = getChallenge(slug);
      if (!challenge) throw new Error(`missing challenge: ${slug}`);
      const editorLanguage = challenge.languages[0]!.id;
      for (const step of challenge.steps) {
        cases.push([step.starterCode, editorLanguage]);
        cases.push([step.solutionCode, editorLanguage]);
      }
      for (const lang of challenge.languages) {
        cases.push([lang.starterCode, lang.id]);
        cases.push([lang.solutionCode, lang.id]);
      }
    }

    expect(cases.length).toBeGreaterThan(0);
    for (const [source, language] of cases) {
      expect(detokenize(highlight(source, language))).toBe(
        withoutTrailingNewline(source),
      );
    }
  });

  it("keeps the gutter and the code in lockstep, blank lines included", () => {
    const python = getChallenge("top-k-frequent-words")?.languages.find(
      (l) => l.id === "python",
    );
    if (!python) throw new Error("missing python challenge");

    const lines = highlight(python.solutionCode, "python");
    // One entry per source line, including the blank line after the import.
    expect(lines).toHaveLength(
      withoutTrailingNewline(python.solutionCode).split("\n").length,
    );
    expect(lines[1]).toEqual([]);
  });

  it("colors SQL the way the design does", () => {
    const step = getChallenge("top-products-by-month")?.steps[1];
    if (!step) throw new Error("missing step 2");
    const lines = highlight(step.solutionCode, "sql");

    expect(kindOf(lines, "SELECT")).toBe("keyword");
    expect(kindOf(lines, "GROUP BY")).toBe("keyword");
    expect(kindOf(lines, "PARTITION BY")).toBe("keyword");
    expect(kindOf(lines, "SUM")).toBe("builtin");
    expect(kindOf(lines, "RANK")).toBe("builtin");
    expect(kindOf(lines, "'completed'")).toBe("string");
    // Scalar functions and column names stay in the body color.
    expect(kindOf(lines, "strftime")).toBeUndefined();
    expect(kindOf(lines, "revenue_rank")).toBeUndefined();
  });

  it("treats bare literals as values, not control flow", () => {
    const python = getChallenge("top-k-frequent-words")?.languages.find(
      (l) => l.id === "python",
    );
    if (!python) throw new Error("missing python challenge");
    // `None`/`True`/`False` are literals, so they take the number color
    // rather than the keyword color, matching the prototypes.
    const lines = highlight("x = None\ny = True\n# note", "python");

    expect(kindOf(lines, "None")).toBe("number");
    expect(kindOf(lines, "True")).toBe("number");
    expect(kindOf(lines, "# note")).toBe("comment");
    expect(kindOf(highlight(python.solutionCode, "python"), "def")).toBe("keyword");
  });

  it("leaves chained JavaScript methods uncolored", () => {
    const js = getChallenge("top-k-frequent-words")?.languages.find(
      (l) => l.id === "javascript",
    );
    if (!js) throw new Error("missing javascript fixture");
    const lines = highlight(js.solutionCode, "javascript");

    expect(kindOf(lines, "Map")).toBe("builtin");
    expect(kindOf(lines, "const")).toBe("keyword");
    expect(kindOf(lines, "sort")).toBeUndefined();
    expect(kindOf(lines, "slice")).toBeUndefined();
  });
});
