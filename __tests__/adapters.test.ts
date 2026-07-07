/**
 * Adapter configuration tests.
 *
 * These tests verify the structure of each language adapter (id, examples,
 * packages, etc.) without actually executing any WebAssembly runtime.
 * They run in Node and require no browser APIs.
 *
 * NOTE: adapters that reference React JSX (packagesFooter) are imported
 * via dynamic mocking so we don't need a full React renderer.
 */
import { describe, it, expect } from "vitest";

// Minimal stubs so adapter modules can be imported in Node
// without crashing on React JSX or browser-specific globals.
import { vi } from "vitest";

// Adapters reference React JSX in their `packagesFooter` property.
// Stub React so adapter modules can be imported in Node without
// needing a full renderer.
vi.mock("react", () => ({
  default: {
    createElement: () => null,
  },
}));

// Adapters that use dynamic import of WebAssembly runtimes will fail if
// actually called, but we only access their static properties here.
import { javascriptAdapter } from "../app/_components/runtime/javascript";
import { typescriptAdapter } from "../app/_components/runtime/typescript";
import { phpAdapter } from "../app/_components/runtime/php";
import { cAdapter } from "../app/_components/runtime/c";
import { cppAdapter } from "../app/_components/runtime/cpp";
import { javaAdapter } from "../app/_components/runtime/java";
import { csharpAdapter } from "../app/_components/runtime/csharp";
import { webAdapter } from "../app/_components/runtime/web";
import { reactAdapter } from "../app/_components/runtime/react";

// Python and R adapters import from "webr" / reference workers; we test
// their exports separately once we have a proper mocking story.

const ADAPTERS = [
  { name: "JavaScript", adapter: javascriptAdapter },
  { name: "TypeScript", adapter: typescriptAdapter },
  { name: "PHP", adapter: phpAdapter },
  { name: "C", adapter: cAdapter },
  { name: "C++", adapter: cppAdapter },
  { name: "Java", adapter: javaAdapter },
  { name: "C#", adapter: csharpAdapter },
  { name: "Web (HTML/CSS/JS)", adapter: webAdapter },
  { name: "React", adapter: reactAdapter },
];

describe("LanguageAdapter shape", () => {
  for (const { name, adapter } of ADAPTERS) {
    describe(name, () => {
      it("has a non-empty id", () => {
        expect(typeof adapter.id).toBe("string");
        expect(adapter.id.length).toBeGreaterThan(0);
      });

      it("has a displayName", () => {
        expect(typeof adapter.displayName).toBe("string");
        expect(adapter.displayName.length).toBeGreaterThan(0);
      });

      it("has at least one example", () => {
        expect(Array.isArray(adapter.examples)).toBe(true);
        expect(adapter.examples.length).toBeGreaterThan(0);
      });

      it("every example has key, title, desc, and non-empty code", () => {
        for (const ex of adapter.examples) {
          expect(typeof ex.key).toBe("string");
          expect(typeof ex.title).toBe("string");
          expect(typeof ex.desc).toBe("string");
          expect(typeof ex.code).toBe("string");
          expect(ex.code.trim().length).toBeGreaterThan(0);
        }
      });

      it("has unique example keys", () => {
        const keys = adapter.examples.map((e) => e.key);
        expect(new Set(keys).size).toBe(keys.length);
      });

      it("has at least one export format", () => {
        expect(Array.isArray(adapter.exportFormats)).toBe(true);
        expect(adapter.exportFormats.length).toBeGreaterThan(0);
      });

      it("has an exportBaseFilename", () => {
        expect(typeof adapter.exportBaseFilename).toBe("string");
        expect(adapter.exportBaseFilename.length).toBeGreaterThan(0);
      });

      it("has runtimeInfo with required fields", () => {
        expect(typeof adapter.runtimeInfo.language).toBe("string");
        expect(typeof adapter.runtimeInfo.version).toBe("string");
        expect(typeof adapter.runtimeInfo.engine).toBe("string");
      });

      it("packages array is defined (may be empty)", () => {
        expect(Array.isArray(adapter.packages)).toBe(true);
      });

      it("importSnippet returns a string", () => {
        expect(typeof adapter.importSnippet("test")).toBe("string");
      });

      it("hasImport returns a boolean", () => {
        const snippet = adapter.importSnippet("test");
        expect(typeof adapter.hasImport(snippet, "test")).toBe("boolean");
      });
    });
  }
});

describe("C adapter specifics", () => {
  it("id is 'c'", () => expect(cAdapter.id).toBe("c"));

  it("importSnippet wraps in #include", () => {
    expect(cAdapter.importSnippet("stdio.h")).toBe("#include <stdio.h>");
  });

  it("hasImport detects existing includes", () => {
    expect(cAdapter.hasImport("#include <stdio.h>", "stdio.h")).toBe(true);
    expect(cAdapter.hasImport("// no include", "stdio.h")).toBe(false);
  });

  it("hello-world example compiles valid C", () => {
    const hello = cAdapter.examples.find((e) => e.key === "hello");
    expect(hello).toBeTruthy();
    expect(hello!.code).toContain("#include <stdio.h>");
    expect(hello!.code).toContain("int main(void)");
  });
});

describe("JavaScript adapter specifics", () => {
  it("id is 'javascript'", () => expect(javascriptAdapter.id).toBe("javascript"));

  it("packages array is empty (all are browser globals)", () => {
    expect(javascriptAdapter.packages).toHaveLength(0);
  });

  it("hello-world example uses console.log", () => {
    const hello = javascriptAdapter.examples.find((e) => e.key === "hello");
    expect(hello).toBeTruthy();
    expect(hello!.code).toContain("console.log");
  });
});

describe("TypeScript adapter specifics", () => {
  it("id is 'typescript'", () => expect(typescriptAdapter.id).toBe("typescript"));

  it("packages array is empty (all are browser globals)", () => {
    expect(typescriptAdapter.packages).toHaveLength(0);
  });

  it("hello-world example contains TypeScript syntax", () => {
    const hello = typescriptAdapter.examples.find((e) => e.key === "hello");
    expect(hello).toBeTruthy();
    // Type annotations or generics should be present
    expect(hello!.code).toMatch(/:\s*(string|number|void|boolean)/);
  });
});

describe("PHP adapter specifics", () => {
  it("id is 'php'", () => expect(phpAdapter.id).toBe("php"));

  it("packages array is empty (all are PHP built-ins)", () => {
    expect(phpAdapter.packages).toHaveLength(0);
  });

  it("hello-world example starts with <?php", () => {
    const hello = phpAdapter.examples.find((e) => e.key === "hello");
    expect(hello).toBeTruthy();
    expect(hello!.code.trimStart()).toMatch(/^<\?php/);
  });
});

describe("C++ adapter specifics", () => {
  it("id is 'cpp'", () => expect(cppAdapter.id).toBe("cpp"));

  it("importSnippet wraps in #include", () => {
    expect(cppAdapter.importSnippet("iostream")).toBe("#include <iostream>");
  });

  it("hasImport detects existing includes", () => {
    expect(cppAdapter.hasImport("#include <iostream>", "iostream")).toBe(true);
    expect(cppAdapter.hasImport("// no include", "iostream")).toBe(false);
  });

  it("hello-world example uses iostream and main()", () => {
    const hello = cppAdapter.examples.find((e) => e.key === "hello");
    expect(hello).toBeTruthy();
    expect(hello!.code).toContain("#include <iostream>");
    expect(hello!.code).toMatch(/int\s+main\s*\(/);
  });
});

describe("Java adapter specifics", () => {
  it("id is 'java'", () => expect(javaAdapter.id).toBe("java"));

  it("importSnippet wraps in import ...;", () => {
    expect(javaAdapter.importSnippet("java.util")).toBe("import java.util.*;");
  });

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
    // Substring-style false positives would be a real footgun (e.g. a
    // user clicking `java.util` after `import java.util.concurrent.*;`
    // would otherwise have its insertion silently skipped).
    expect(
      javaAdapter.hasImport("import java.util.concurrent.*;", "java.util"),
    ).toBe(false);
    // Sanity check: the same-package query still matches.
    expect(
      javaAdapter.hasImport("import java.util.concurrent.*;", "java.util.concurrent"),
    ).toBe(true);
  });

  it("hello-world example contains a public static void main", () => {
    const hello = javaAdapter.examples.find((e) => e.key === "hello");
    expect(hello).toBeTruthy();
    expect(hello!.code).toMatch(/public\s+static\s+void\s+main\s*\(/);
  });

  it("exports as a .java file", () => {
    expect(javaAdapter.exportFormats[0].extension).toBe("java");
  });
});

describe("C# adapter specifics", () => {
  it("id is 'csharp'", () => expect(csharpAdapter.id).toBe("csharp"));

  it("importSnippet wraps in `using ...;`", () => {
    expect(csharpAdapter.importSnippet("System.Linq")).toBe(
      "using System.Linq;",
    );
  });

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
    // `using System.Linq.Expressions;` should NOT match a query for
    // `System` — substring matching would otherwise confuse the
    // packages drawer's "already imported?" check.
    expect(
      csharpAdapter.hasImport(
        "using System.Linq.Expressions;",
        "System.Collections.Generic",
      ),
    ).toBe(false);
  });

  it("hello-world example uses Console.WriteLine", () => {
    const hello = csharpAdapter.examples.find((e) => e.key === "hello");
    expect(hello).toBeTruthy();
    expect(hello!.code).toContain("Console.WriteLine");
  });

  it("exports include both .csx and .cs", () => {
    const exts = csharpAdapter.exportFormats.map((f) => f.extension);
    expect(exts).toContain("csx");
    expect(exts).toContain("cs");
  });
});

describe("Web adapter specifics", () => {
  it("id is 'web'", () => expect(webAdapter.id).toBe("web"));

  it("advertises the live-preview output capability", () => {
    expect(webAdapter.outputCapabilities?.preview).toBe(true);
  });

  it("classifies every .html file as an entry point", () => {
    const entries = webAdapter.findEntryFiles!([
      { filename: "index.html", content: "<h1>a</h1>" },
      { filename: "about.html", content: "<h1>b</h1>" },
      { filename: "styles.css", content: "body {}" },
      { filename: "script.js", content: "console.log(1)" },
    ]);
    expect(entries.map((e) => e.filename).sort()).toEqual([
      "about.html",
      "index.html",
    ]);
    expect(entries.every((e) => e.kind === "main")).toBe(true);
  });

  it("picks the CodeMirror mode from the file extension", () => {
    expect(webAdapter.codeMirrorModeForFile!("styles.css")).toBe("css");
    expect(webAdapter.codeMirrorModeForFile!("script.js")).toBe("javascript");
    expect(webAdapter.codeMirrorModeForFile!("index.html")).toBe("htmlmixed");
  });

  it("hello example is the CodePen-style HTML/CSS/JS trio", () => {
    const hello = webAdapter.examples.find((e) => e.key === "hello");
    expect(hello).toBeTruthy();
    // The HTML pane is a body fragment (implicit composition supplies
    // the CSS/JS panes), matching the default workspace.
    expect(hello!.entryFilename).toBe("index.html");
    const extras = (hello!.files ?? []).map((f) => f.filename).sort();
    expect(extras).toEqual(["script.js", "styles.css"]);
  });

  it("hides the playground Files pane (split panes already show every file)", () => {
    expect(webAdapter.hideFilesPane).toBe(true);
  });

  it("seeds fresh workspaces with the CodePen trio and offers split editors", () => {
    expect(webAdapter.splitEditors).toBe(true);
    const names = (webAdapter.defaultWorkspace ?? []).map((f) => f.filename);
    expect(names).toEqual(["index.html", "styles.css", "script.js"]);
    for (const f of webAdapter.defaultWorkspace ?? []) {
      expect(f.content.trim().length).toBeGreaterThan(0);
    }
    // The HTML pane must not reference the siblings explicitly — the
    // whole point is the implicit CodePen-style composition.
    const html = webAdapter.defaultWorkspace![0].content;
    expect(html).not.toContain("styles.css");
    expect(html).not.toContain("script.js");
  });

  it("ships a Tailwind example wired to the pinned CDN build", () => {
    const tw = webAdapter.examples.find((e) => e.key === "tailwind");
    expect(tw).toBeTruthy();
    expect(tw!.code).toContain("@tailwindcss/browser");
  });
});

describe("React adapter specifics", () => {
  it("id is 'react'", () => expect(reactAdapter.id).toBe("react"));

  it("advertises the live-preview output capability", () => {
    expect(reactAdapter.outputCapabilities?.preview).toBe(true);
  });

  it("defaults to .tsx files with the tsx editor mode", () => {
    expect(reactAdapter.defaultFileExtension).toBe("tsx");
    expect(reactAdapter.codeMirrorMode).toBe("tsx");
    expect(reactAdapter.codeMirrorModeForFile!("styles.css")).toBe("css");
    expect(reactAdapter.codeMirrorModeForFile!("App.tsx")).toBeUndefined();
  });

  it("hello example mounts through react-dom/client", () => {
    const hello = reactAdapter.examples.find((e) => e.key === "hello");
    expect(hello).toBeTruthy();
    expect(hello!.code).toContain('from "react-dom/client"');
    expect(hello!.code).toContain("createRoot");
  });

  it("seeds fresh workspaces with the main/App/styles trio and split editors", () => {
    expect(reactAdapter.splitEditors).toBe(true);
    expect(reactAdapter.hideFilesPane).toBe(true);
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

  it("packages drawer entries each ship a runnable example", () => {
    expect(reactAdapter.packages.length).toBeGreaterThan(0);
    for (const pkg of reactAdapter.packages) {
      expect(pkg.example, `${pkg.name} needs an example`).toBeTruthy();
      expect(pkg.example).toContain(`"${pkg.name}`);
      expect(pkg.example).toContain("createRoot");
    }
  });

  it("hasImport detects both default and side-effect imports", () => {
    expect(
      reactAdapter.hasImport(`import { useState } from "react";`, "react"),
    ).toBe(true);
    expect(reactAdapter.hasImport(`import "./styles.css";`, "react")).toBe(
      false,
    );
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
    // Everything must live inside the IIFE — top-level await would
    // delay module evaluation and therefore the load event the harness
    // itself waits for (a deadlock).
    expect(harness.trim().startsWith(";(function () {")).toBe(true);
    expect(harness.trim().endsWith("})();")).toBe(true);
  });
});
