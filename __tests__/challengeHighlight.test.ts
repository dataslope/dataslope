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
});
