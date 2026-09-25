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

  // A callout body is markdown, not a template literal, so the escape that is
  // required inside `markdown={`…`}` prints the backtick here instead.
  it("flags an escaped backtick in a callout body", () => {
    const src = [
      '<Callout type="info" title="T">',
      "Flask uses \\`@app.route\\` for this.",
      "</Callout>",
    ].join("\n");
    expect(lintSource(src, "x.mdx", "mdx").map((v: { rule: string }) => v.rule)).toEqual([
      "escaped-backtick",
    ]);
  });

  // The rules that keep the linter useful rather than noisy.
  it("flags an em dash used as punctuation in prose", () => {
    expect(lintSource("A clause — an aside.", "x.mdx", "mdx")).toHaveLength(1);
  });

  it("allows an unspaced en dash, which is correct in ranges and compounds", () => {
    expect(lintSource("Boole (1815–1864) and the bias–variance trade-off.", "x.mdx", "mdx")).toEqual([]);
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

  it("allows a blockquote that quotes terms rather than wrapping the whole body", () => {
    expect(lintSource('> "Dense" describes the rank sequence, not "sparse"', "x.mdx", "mdx")).toEqual([]);
    expect(lintSource("> Take `mpg` and draw a point for each row.", "x.mdx", "mdx")).toEqual([]);
  });

  // Mermaid labels are reader-visible prose inside a fenced block the other
  // rules skip. Reaching inside the fence means telling a label from mermaid's
  // own link syntax, which is made of the same hyphens.
  describe("mermaid labels", () => {
    const mermaid = (...body: string[]) => ["```mermaid", ...body, "```"].join("\n");
    const rules = (src: string) => lintSource(src, "x.mdx", "mdx").map((v) => v.rule);

    it("flags `--` used as a dash in a label, which mermaid renders verbatim", () => {
      const src = mermaid("flowchart LR", '  Q -->|"the PAST"| FF["ffill -- safe as a live feature"]');
      expect(rules(src)).toEqual(["mermaid-dash"]);
    });

    // Each of these is a link or a cardinality marker, and each one held real
    // hyphen runs in the corpus before the rule existed.
    it("allows mermaid's own link syntax, which is made of the same hyphens", () => {
      expect(rules(mermaid("flowchart TD", '  P["prev"] -- "before" --> A["[ A | * ]"] --> B["[ B | * ]"]'))).toEqual([]);
      expect(rules(mermaid("flowchart LR", "  A ----> B ---- C", "  D <--> E"))).toEqual([]);
      expect(rules(mermaid("erDiagram", "  CUSTOMER }|--|{ ORDER : places"))).toEqual([]);
      expect(rules(mermaid("classDiagram", "  Animal -- Dog", "  Duck --|> Animal"))).toEqual([]);
      expect(rules(mermaid("stateDiagram-v2", "  [*] --> Still", "  Still --> [*]"))).toEqual([]);
    });
  });
});
