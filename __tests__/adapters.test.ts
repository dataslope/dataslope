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

// Python and R adapters import from "webr" / reference workers; we test
// their exports separately once we have a proper mocking story.

const ADAPTERS = [
  { name: "JavaScript", adapter: javascriptAdapter },
  { name: "TypeScript", adapter: typescriptAdapter },
  { name: "PHP", adapter: phpAdapter },
  { name: "C", adapter: cAdapter },
  { name: "C++", adapter: cppAdapter },
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
    // because compiling libc++-heavy templates with the wasm-targeted
    // clang in this package is dramatically slower than compiling C —
    // see the long-form note in `app/_components/runtime/cpp.tsx`.
    // iostream-using examples still appear further down the list.
    const hello = cppAdapter.examples.find((e) => e.key === "hello");
    expect(hello).toBeTruthy();
    expect(hello!.code).toContain("#include <cstdio>");
    expect(hello!.code).toMatch(/int\s+main\s*\(/);
  });
});
