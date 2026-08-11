import { describe, expect, it } from "vitest";
import path from "node:path";
// Shared linter implementation also used by `npm run check:prose`.
import { lintFiles, lintSource, proseFiles } from "../scripts/check-prose.mjs";

// Guards the authored prose against the punctuation and phrasing tics that
// read as machine-written: em dashes standing in for a comma, colon or
// semicolon; the same tic spelled with a spaced en dash; and a short list of
// filler phrases. See AGENTS.md, "Prose style". Runs as part of `npm test`.
describe("authored prose style", () => {
  const files = proseFiles();

  it("locates the prose corpus", () => {
    expect(files.length).toBeGreaterThan(500);
  });

  it("has no em dashes, spaced en dashes, or filler phrases", () => {
    const violations = lintFiles(files);
    const report = violations
      .map(
        (v: { rule: string; file: string; line: number; detail: string }) =>
          `  [${v.rule}] ${path.relative(process.cwd(), v.file)}:${v.line}: ${v.detail}`,
      )
      .join("\n");
    expect(violations, `prose violations:\n${report}`).toEqual([]);
  });

  // The rules that keep the linter useful rather than noisy.
  it("flags an em dash used as punctuation in prose", () => {
    expect(lintSource("A clause — an aside.", "x.mdx", "mdx")).toHaveLength(1);
  });

  it("allows an unspaced en dash, which is correct in ranges and compounds", () => {
    expect(lintSource("Boole (1815–1864) and the bias–variance trade-off.", "x.mdx", "mdx")).toEqual([]);
  });

  it("allows a lone em dash glyph in code, which marks an empty cell", () => {
    expect(lintSource('<td>{col.type || "—"}</td>', "x.tsx", "code")).toEqual([]);
    expect(lintSource('const label = "Ready — go";', "x.tsx", "code")).toHaveLength(1);
  });

  it("ignores em dashes inside code comments", () => {
    expect(lintSource("// a note — with an aside\nconst a = 1;", "x.tsx", "code")).toEqual([]);
  });

  it("allows a padded dash as an empty markdown table cell", () => {
    expect(lintSource("| start | – | 0 |", "x.mdx", "mdx")).toEqual([]);
  });

  // The stylesheet draws quotation marks around every blockquote, so a
  // blockquote that types its own renders them doubled: ""like this"".
  it("flags a blockquote wrapped in a typed pair of double quotes", () => {
    const one = lintSource('> "Take `mpg` and draw a point for each row."', "x.mdx", "mdx");
    expect(one.map((v) => v.rule)).toEqual(["blockquote-quotes"]);

    const many = lintSource('> "Take `mpg`; map displacement to x,\n> and draw a point."', "x.mdx", "mdx");
    expect(many.map((v) => v.rule)).toEqual(["blockquote-quotes"]);
    expect(many[0].line).toBe(1);
  });

  it("flags a wrapped blockquote that also carries emphasis, and curly quotes", () => {
    expect(lintSource('> *"Always leave the code better than you found it."*', "x.mdx", "mdx")).toHaveLength(1);
    expect(lintSource("> “Always leave the code better than you found it.”", "x.mdx", "mdx")).toHaveLength(1);
  });

  it("allows a blockquote that quotes terms rather than wrapping the whole body", () => {
    expect(lintSource('> "Dense" describes the rank sequence, not "sparse"', "x.mdx", "mdx")).toEqual([]);
    expect(lintSource("> Take `mpg` and draw a point for each row.", "x.mdx", "mdx")).toEqual([]);
  });

  it("ignores an indented blockquote, which is an MCQ explanation and gets no styled quotes", () => {
    expect(lintSource('- [o] A choice.\n  > "The whole explanation, quoted."', "x.mdx", "mdx")).toEqual([]);
  });

  it("ignores a blockquote inside fenced code, which is a sample rather than a quotation", () => {
    expect(lintSource('```markdown\n> "A quoted blockquote."\n```', "x.mdx", "mdx")).toEqual([]);
  });
});
