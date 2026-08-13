import { describe, expect, it } from "vitest";
import path from "node:path";
// Shared linter implementation also used by `npm run check:mermaid-code`.
import {
  diagramFiles,
  lintFiles,
  lintSource,
  mermaidLabels,
  unmarkedCode,
} from "../scripts/check-mermaid-code.mjs";

// Guards lessons against code in a diagram label that is left in the prose
// face. A `<code>` span in a label is set in JetBrains Mono, the same face the
// identifier has in the code block on the same page; without one, `System.out`
// arrives in Inter. See the header of scripts/check-mermaid-code.mjs for what
// counts as code and why the rules are narrow. Runs as part of `npm test`.
describe("mermaid diagram labels", () => {
  const files = diagramFiles();

  it("locates the lesson corpus", () => {
    expect(files.length).toBeGreaterThan(500);
  });

  it("marks the code in every mermaid label", () => {
    const violations = lintFiles(files);
    const report = violations
      .map(
        (v: { rule: string; file: string; line: number; detail: string }) =>
          `  [${v.rule}] ${path.relative(process.cwd(), v.file)}:${v.line}: ${v.detail}`,
      )
      .join("\n");
    expect(violations, `unmarked code in mermaid labels:\n${report}`).toEqual([]);
  });

  // --- what the rules read ------------------------------------------------

  it("reads a node label out of every bracket shape mermaid spells", () => {
    const line = 'A[plain] --> B([stadium]) --> C[(cylinder)] --> D{{hexagon}}';
    expect(mermaidLabels(line, "flowchart")).toEqual([
      "plain",
      "stadium",
      "cylinder",
      "hexagon",
    ]);
  });

  // The `>` closing every `-->` sits after a hyphen; reading it as the opener
  // of an asymmetric `A>text]` node swallows the rest of the line.
  it("does not mistake a link arrow for an asymmetric node", () => {
    expect(mermaidLabels('D -->|Ok| E([Final result])', "flowchart")).toEqual([
      "Final result",
      "Ok",
    ]);
  });

  // `A --- B` is an unlabelled link, and its closing `-` is the same character
  // that closes a labelled `-- text ---`.
  it("does not read a node as the label of an unlabelled link", () => {
    const line = "A((a: 1,2,3)) --- I((4,5)) --- B((b: 4,5))";
    expect(mermaidLabels(line, "flowchart")).not.toContain("I((4,5))");
  });

  it("reads a sequence message and a participant alias", () => {
    expect(mermaidLabels("    participant SO as System.out", "sequenceDiagram")).toContain(
      "System.out",
    );
    expect(mermaidLabels("    JVM->>Main: call main(args)", "sequenceDiagram")).toContain(
      "call main(args)",
    );
  });

  it("ignores style declarations, which are not labels", () => {
    expect(mermaidLabels("    style my_node fill:#f9f", "flowchart")).toEqual([]);
  });

  // --- what counts as code ------------------------------------------------

  it("flags a call, a qualified name and a snake_case identifier", () => {
    expect(unmarkedCode("call println(x)").map((c) => c.token)).toEqual(["println("]);
    expect(unmarkedCode("hand over Main.class").map((c) => c.token)).toEqual(["Main.class"]);
    expect(unmarkedCode("read_csv").map((c) => c.token)).toEqual(["read_csv"]);
  });

  it("says nothing about a span that is already marked", () => {
    expect(unmarkedCode("<code>System.out</code>")).toEqual([]);
    expect(unmarkedCode("run <code>main()</code> now")).toEqual([]);
  });

  // A parenthetical aside is how nearly every lesson label opens a paren, and
  // every one of them has a space in front of it.
  it("leaves a parenthetical aside alone", () => {
    expect(unmarkedCode("Reality (infinite detail)")).toEqual([]);
    expect(unmarkedCode("Wide form (humans love this)")).toEqual([]);
  });

  // Mermaid cannot typeset math in a label, so notation stays in the prose
  // face: a one-letter name in front of a paren is never a call in a lesson.
  it("leaves mathematical notation alone", () => {
    expect(unmarkedCode("P(A given B) = P(A)?")).toEqual([]);
    expect(unmarkedCode("first difference: y(t) - y(t-1)")).toEqual([]);
    expect(unmarkedCode("ARIMA(p, d, q)")).toEqual([]);
    expect(unmarkedCode("Poisson(lambda)")).toEqual([]);
  });

  it("leaves a full stop and a product name alone", () => {
    expect(unmarkedCode("The program ends. That is it.")).toEqual([]);
    expect(unmarkedCode("Node.js released")).toEqual([]);
  });

  // The domain half of a sample address is data, not an identifier.
  it("leaves an email address alone", () => {
    expect(unmarkedCode("ada@example.com")).toEqual([]);
  });

  it("reads no label out of a class or ER diagram, which render in mono", () => {
    const src = ["```mermaid", "classDiagram", "  class Dog {", "    +bark()", "  }", "```"].join(
      "\n",
    );
    expect(lintSource(src, "x.mdx")).toEqual([]);
  });

  it("honours an opt-out above the fence", () => {
    const body = ["```mermaid", "flowchart LR", "  A[read_csv] --> B[done]", "```"].join("\n");
    expect(lintSource(body, "x.mdx")).not.toEqual([]);
    expect(lintSource(`{/* allow-unmarked-code: why */}\n${body}`, "x.mdx")).toEqual([]);
  });
});
