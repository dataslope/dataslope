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

// Python and R adapters import from "webr" / reference workers; we test
// their exports separately once we have a proper mocking story.

const ADAPTERS = [
  { name: "JavaScript", adapter: javascriptAdapter },
  { name: "TypeScript", adapter: typescriptAdapter },
  { name: "PHP", adapter: phpAdapter },
  { name: "C", adapter: cAdapter },
  { name: "C++", adapter: cppAdapter },
  { name: "Java", adapter: javaAdapter },
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

  it("hello-world example uses cstdio and main()", () => {
    // The default Hello World example deliberately avoids <iostream>
    // so the very first run is fast even before browsercc's prebuilt
    // libc++ PCH has finished downloading — see the file-header note
    // in `app/_components/runtime/cpp.tsx`. iostream-using examples
    // still appear further down the list.
    const hello = cppAdapter.examples.find((e) => e.key === "hello");
    expect(hello).toBeTruthy();
    expect(hello!.code).toContain("#include <cstdio>");
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
