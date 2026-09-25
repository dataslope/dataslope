/**
 * Adapter behaviour that runs in Node with no WASM runtime: the packages
 * drawer's "already imported?" checks, React entry-file detection, and the
 * web/react challenge harness shape.
 */
import { describe, it, expect, vi } from "vitest";

// Adapters reference React JSX (packagesFooter); stub React so they import
// in Node without a renderer.
vi.mock("react", () => ({
  default: {
    createElement: () => null,
  },
}));

// Only static properties are accessed, so WASM dynamic imports never fire.
import { javaAdapter } from "../app/_components/runtime/java";
import { csharpAdapter } from "../app/_components/runtime/csharp";
import { reactAdapter } from "../app/_components/runtime/react";

describe("Java adapter specifics", () => {
  it("hasImport detects existing wildcard imports", () => {
    expect(javaAdapter.hasImport("import java.util.*;", "java.util")).toBe(true);
  });

  it("hasImport detects existing single-class imports", () => {
    expect(
      javaAdapter.hasImport("import java.util.HashMap;", "java.util"),
    ).toBe(true);
  });

  it("hasImport tolerates extra whitespace", () => {
    expect(
      javaAdapter.hasImport("import   java.util  .  * ;", "java.util"),
    ).toBe(true);
  });

  it("hasImport returns false when the package is not imported", () => {
    expect(javaAdapter.hasImport("// no import", "java.util")).toBe(false);
  });

  it("hasImport does not match unrelated packages with the same prefix", () => {
    // A substring false positive would silently skip inserting `java.util`
    // after `import java.util.concurrent.*;`.
    expect(
      javaAdapter.hasImport("import java.util.concurrent.*;", "java.util"),
    ).toBe(false);
    // Sanity check: the same-package query still matches.
    expect(
      javaAdapter.hasImport("import java.util.concurrent.*;", "java.util.concurrent"),
    ).toBe(true);
  });
});

describe("C# adapter specifics", () => {
  it("hasImport detects existing using directives", () => {
    expect(csharpAdapter.hasImport("using System.Linq;", "System.Linq")).toBe(
      true,
    );
    expect(
      csharpAdapter.hasImport("using   System.Linq  ;", "System.Linq"),
    ).toBe(true);
  });

  it("hasImport detects `using static`", () => {
    expect(
      csharpAdapter.hasImport("using static System.Math;", "System.Math"),
    ).toBe(true);
  });

  it("hasImport detects aliased usings", () => {
    expect(
      csharpAdapter.hasImport("using Math = System.Math;", "System.Math"),
    ).toBe(true);
  });

  it("hasImport returns false when the namespace is not imported", () => {
    expect(csharpAdapter.hasImport("// no import", "System.Linq")).toBe(false);
  });

  it("hasImport does not match unrelated namespaces with the same prefix", () => {
    // Substring matching would confuse the packages drawer's
    // "already imported?" check.
    expect(
      csharpAdapter.hasImport(
        "using System.Linq.Expressions;",
        "System.Collections.Generic",
      ),
    ).toBe(false);
  });
});

describe("React adapter specifics", () => {
  it("seeds fresh workspaces with the main/App/styles trio in the regular tabbed layout", () => {
    // The React playground uses the standard tabbed editor + files pane
    // (like JS/TS), the split panes and hidden files rail are web-only.
    expect(reactAdapter.splitEditors).toBeUndefined();
    expect(reactAdapter.hideFilesPane).toBeUndefined();
    const names = (reactAdapter.defaultWorkspace ?? []).map((f) => f.filename);
    expect(names).toEqual(["main.tsx", "App.tsx", "styles.css"]);
    const main = reactAdapter.defaultWorkspace![0].content;
    // The trio wires itself together with real imports.
    expect(main).toContain('from "./App"');
    expect(main).toContain('import "./styles.css"');
    // The mount lives in main.tsx, so the Run button resolves there.
    const entries = reactAdapter.findEntryFiles!(
      reactAdapter.defaultWorkspace!.map((f) => ({
        filename: f.filename,
        content: f.content,
      })),
    );
    expect(entries.map((e) => e.filename)).toEqual(["main.tsx"]);
  });

  it("classifies mounting files (createRoot/hydrateRoot) as entry points", () => {
    const entries = reactAdapter.findEntryFiles!([
      {
        filename: "main.tsx",
        content: `import { createRoot } from "react-dom/client";
createRoot(document.getElementById("root")!).render(<App />);`,
      },
      {
        filename: "App.tsx",
        content: `export function App() { return <h1>hi</h1>; }`,
      },
      { filename: "styles.css", content: "h1 { color: red; }" },
      {
        filename: "legacy.jsx",
        content: `ReactDOM.render(<App />, document.getElementById("root"));`,
      },
    ]);
    expect(entries.map((e) => e.filename).sort()).toEqual([
      "legacy.jsx",
      "main.tsx",
    ]);
    expect(entries.every((e) => e.kind === "main")).toBe(true);
  });
});

describe("web/react challenge harnesses", () => {
  it("wraps the web harness in a <script> element with the sentinel protocol", async () => {
    const { buildHarness, HARNESS_BEGIN } = await import(
      "../app/_components/challengeHarness"
    );
    const harness = buildHarness("web", [
      { id: "t1", name: "t", code: "if (1 !== 1) throw new Error('no');" },
    ]);
    expect(harness.trimStart().startsWith("<script>")).toBe(true);
    expect(harness.trimEnd().endsWith("</script>")).toBe(true);
    expect(harness).toContain(HARNESS_BEGIN);
    expect(harness).toContain("__DSTEST__");
    expect(harness).toContain("__dsPreviewHarnessDone");
  });

  it("emits the react harness as plain module-appendable JS", async () => {
    const { buildHarness, HARNESS_BEGIN } = await import(
      "../app/_components/challengeHarness"
    );
    const harness = buildHarness("react", [
      { id: "t1", name: "t", code: "void 0;" },
    ]);
    expect(harness).not.toContain("<script>");
    expect(harness).toContain(HARNESS_BEGIN);
    expect(harness).toContain("__dsPreviewHarnessDone");
    // Everything must live inside the IIFE, top-level await would
    // delay module evaluation and therefore the load event the harness
    // itself waits for (a deadlock).
    expect(harness.trim().startsWith(";(function () {")).toBe(true);
    expect(harness.trim().endsWith("})();")).toBe(true);
  });
});
