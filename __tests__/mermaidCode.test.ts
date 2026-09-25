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

  // The `>` closing every `-->` sits after a hyphen; reading it as the opener
  // of an asymmetric `A>text]` node swallows the rest of the line.
  it("does not mistake a link arrow for an asymmetric node", () => {
    expect(mermaidLabels('D -->|Ok| E([Final result])', "flowchart")).toEqual([
      "Final result",
      "Ok",
    ]);
  });

  // --- what counts as code ------------------------------------------------

  it("flags a call, a qualified name and a snake_case identifier", () => {
    expect(unmarkedCode("call println(x)").map((c) => c.token)).toEqual(["println("]);
    expect(unmarkedCode("hand over Main.class").map((c) => c.token)).toEqual(["Main.class"]);
    expect(unmarkedCode("read_csv").map((c) => c.token)).toEqual(["read_csv"]);
  });

  it("honours an opt-out above the fence", () => {
    const body = ["```mermaid", "flowchart LR", "  A[read_csv] --> B[done]", "```"].join("\n");
    expect(lintSource(body, "x.mdx")).not.toEqual([]);
    expect(lintSource(`{/* allow-unmarked-code: why */}\n${body}`, "x.mdx")).toEqual([]);
  });
});
