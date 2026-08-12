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

  // Mermaid labels are prose the reader sees, but they live in a fenced block,
  // so every rule above skips them. This rule reaches inside the fence, which
  // means it has to tell a label from mermaid's own link syntax: nearly every
  // way of drawing a link is made of the same hyphens the rule is looking for.
  describe("mermaid labels", () => {
    const mermaid = (...body: string[]) => ["```mermaid", ...body, "```"].join("\n");
    const rules = (src: string) => lintSource(src, "x.mdx", "mdx").map((v) => v.rule);

    it("flags `--` used as a dash in a label, which mermaid renders verbatim", () => {
      const src = mermaid("flowchart LR", '  Q -->|"the PAST"| FF["ffill -- safe as a live feature"]');
      expect(rules(src)).toEqual(["mermaid-dash"]);
    });

    it("flags any non-ASCII dash in a label, quoted or not", () => {
      expect(rules(mermaid("flowchart LR", '  NF[".NET (2002–2019)"] --> W[Windows]'))).toEqual(["mermaid-dash"]);
      expect(rules(mermaid("flowchart LR", "  R1[Bug is in 16–30] --> E[done]"))).toEqual(["mermaid-dash"]);
      expect(rules(mermaid("flowchart TD", '  A["x"] -->|"z = (x − mu) / s"| B["z"]'))).toEqual(["mermaid-dash"]);
    });

    // A label can trip both halves of the rule at once. The fix is the same
    // either way, so it is reported once, against the line it sits on.
    it("reports one violation per line and points at the source line", () => {
      const src = mermaid("flowchart LR", "  A --> B", '  B --> C["16–30 -- see below"]');
      const found = lintSource(src, "x.mdx", "mdx");
      expect(found.map((v: { rule: string }) => v.rule)).toEqual(["mermaid-dash"]);
      expect(found[0].line).toBe(4);
    });

    // Everything below is a link, a cardinality marker or a code sample. Each
    // one held real hyphen runs in the corpus before the rule existed.
    it("allows mermaid's own link syntax, which is made of the same hyphens", () => {
      expect(rules(mermaid("flowchart TD", '  P["prev"] -- "before" --> A["[ A | * ]"] --> B["[ B | * ]"]'))).toEqual([]);
      expect(rules(mermaid("flowchart LR", "  A ----> B ---- C", "  D <--> E"))).toEqual([]);
      expect(rules(mermaid("erDiagram", "  CUSTOMER }|--|{ ORDER : places"))).toEqual([]);
      expect(rules(mermaid("classDiagram", "  Animal -- Dog", "  Duck --|> Animal"))).toEqual([]);
      expect(rules(mermaid("stateDiagram-v2", "  [*] --> Still", "  Still --> [*]"))).toEqual([]);
    });

    it("allows a hyphen run that is code rather than punctuation", () => {
      expect(rules(mermaid("flowchart LR", '  A["npm i --save-dev vitest"] --> B["done"]'))).toEqual([]);
      expect(rules(mermaid("flowchart LR", '  A["SELECT 1 --comment"] --> B["ok"]'))).toEqual([]);
      expect(rules(mermaid("flowchart LR", '  A["i--"] --> B["loop"]'))).toEqual([]);
    });

    // A colon runs to end-of-line as label text in a sequence diagram, but in a
    // flowchart it is just a character inside a node, and reading the rest of
    // the line as its label picks up the link that follows it.
    it("reads text after a colon only where a colon introduces a label", () => {
      expect(rules(mermaid("sequenceDiagram", "  Alice->>Bob: parse it -- then render"))).toEqual(["mermaid-dash"]);
      expect(rules(mermaid("flowchart LR", "  A((a: 1,2,3)) --- I((3)) --- B((b: 3,4))"))).toEqual([]);
      expect(rules(mermaid("flowchart LR", '  A["ratio: x:y"] --> B["ok"]'))).toEqual([]);
    });

    it("ignores mermaid comments and non-mermaid fences", () => {
      // A `%%` comment never reaches the rendered diagram. (An em dash would
      // still trip rule 1, which reads the whole file; an unspaced en dash is
      // the dash those rules allow, so it isolates this rule.)
      expect(rules(mermaid("flowchart LR", "  %% spans 2002–2019, not drawn", "  A --> B"))).toEqual([]);
      expect(rules("```python\nx = 1 -- 2  # not a diagram\n```")).toEqual([]);
      expect(rules("```\nffill -- safe\n```")).toEqual([]);
    });

    it("leaves the same dash alone outside a fence, where other rules own it", () => {
      expect(rules("The fill reads only the past -- so it is safe.")).toEqual([]);
    });
  });
});
