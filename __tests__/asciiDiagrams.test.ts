import { describe, expect, it } from "vitest";
import path from "node:path";
// Shared linter implementation also used by `npm run check:diagrams`.
import {
  diagramFiles,
  lintFiles,
  lintSource,
} from "../scripts/check-ascii-diagrams.mjs";

// Guards lessons against figures "drawn" out of box-drawing characters. The
// code font's `latin` subset stops before U+2500, so every drawn glyph falls
// back to another font at another advance width and the rows stop lining up;
// see the header of scripts/check-ascii-diagrams.mjs. Runs as part of
// `npm test`.
describe("lesson diagrams", () => {
  const files = diagramFiles();

  it("locates the lesson corpus", () => {
    expect(files.length).toBeGreaterThan(500);
  });

  it("draws no diagrams out of characters", () => {
    const violations = lintFiles(files);
    const report = violations
      .map(
        (v: { rule: string; file: string; line: number; detail: string }) =>
          `  [${v.rule}] ${path.relative(process.cwd(), v.file)}:${v.line}: ${v.detail}`,
      )
      .join("\n");
    expect(violations, `drawn diagrams:\n${report}`).toEqual([]);
  });

  // The rules that keep the linter useful rather than noisy.
  it("flags a nested box drawn with box-drawing characters", () => {
    const src = [
      "```text",
      "┌──── margin ────┐",
      "│  ┌─ border ─┐  │",
      "│  └──────────┘  │",
      "└────────────────┘",
      "```",
    ].join("\n");
    expect(lintSource(src, "x.mdx").map((v) => v.rule)).toContain(
      "drawn-diagram",
    );
  });

  // `tree` output is the one drawn shape the font fallback does not break:
  // every row at a depth carries the same prefix, so siblings still align.
  it("allows a directory tree", () => {
    const src = [
      "```text",
      "my-analysis/",
      "├── README.md",
      "├── data/",
      "│   ├── raw/",
      "│   └── processed/",
      "└── src/",
      "    └── load.py",
      "```",
    ].join("\n");
    expect(lintSource(src, "x.mdx")).toEqual([]);
  });

  it("flags a box drawn with plain ASCII", () => {
    const src = ["```text", "+-----+", "|  n  |", "+-----+", "```"].join("\n");
    expect(lintSource(src, "x.mdx").map((v) => v.rule)).toContain("ascii-box");
  });

  it("flags an underbrace annotation", () => {
    const src = [
      "```",
      "SUM(amount) OVER (PARTITION BY region)",
      "└────┬────┘       └────────┬────────┘",
      "```",
    ].join("\n");
    expect(lintSource(src, "x.mdx").map((v) => v.rule)).toContain("ascii-box");
  });

  // Mermaid draws its own edges, so a drawn glyph in a label is decoration
  // imitating the arrow that is already there.
  it("flags a drawn glyph inside a mermaid label", () => {
    const src = ['```mermaid', "flowchart LR", '    A["a = ●─"] --> B[heap]', "```"].join(
      "\n",
    );
    expect(lintSource(src, "x.mdx").map((v) => v.rule)).toEqual(["mermaid-glyph"]);
  });

  it("leaves an ordinary mermaid diagram alone", () => {
    const src = [
      "```mermaid",
      "flowchart LR",
      '    A["a (a reference)"] --> B[heap]',
      "```",
    ].join("\n");
    expect(lintSource(src, "x.mdx")).toEqual([]);
  });

  // Verbatim tool output that has to keep its frame is an author's call.
  it("honours an explicit opt-out", () => {
    const src = [
      "{/* allow-drawn-diagram: verbatim mysql client output */}",
      "```text",
      "+-------+",
      "| price |",
      "+-------+",
      "```",
    ].join("\n");
    expect(lintSource(src, "x.mdx")).toEqual([]);
  });

  // An arrow in a sentence is punctuation, not a drawing.
  it("ignores arrows in prose", () => {
    const src = "The pipeline runs FROM → WHERE → GROUP BY → SELECT.\nAnd again → here.";
    expect(lintSource(src, "x.mdx")).toEqual([]);
  });
});
