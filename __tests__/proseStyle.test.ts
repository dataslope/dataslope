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
});
