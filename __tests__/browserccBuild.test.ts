/**
 * The C/C++ build logic. browsercc is a ~95 MB CDN download, so the parts
 * that decide what the compiler is asked to compile, and how its output is
 * presented, are exercised here. The `#include`-per-source approach was
 * checked against a real clang before being adopted: concatenation reported
 * a warning about `main.c` line 6 as `concat.c:13`, the include unit
 * reports `main.c:6`.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  annotateUnavailableFlags,
  cleanBuildOutput,
  composeTranslationUnit,
  describeExit,
  describeTrap,
  hideTranslationUnit,
  rewriteObjectPaths,
  TRANSLATION_UNIT_NAME,
} from "../app/_components/runtime/browserccBuild";

describe("composeTranslationUnit", () => {
  it("includes each source instead of pasting them together", () => {
    // Pasting shifted every diagnostic in the entry file down by the
    // length of whatever came before it; an #include keeps the compiler's
    // own bookkeeping intact.
    const unit = composeTranslationUnit({
      language: "c",
      entryPath: "main.c",
      entryCode: "int main(void) { return 0; }\n",
      files: [
        ["other.c", "int helper(void) { return 1; }\n"],
        ["util.h", "int helper(void);\n"],
      ],
    });
    expect(unit.source).toBe('#include "other.c"\n#include "main.c"\n');
    expect(unit.fileName).toBe(TRANSLATION_UNIT_NAME.c);
  });

  it("puts the entry last, so helpers are defined before use", () => {
    const unit = composeTranslationUnit({
      language: "c",
      entryPath: "main.c",
      entryCode: "",
      files: [["b.c", ""], ["a.c", ""]],
    });
    expect(unit.includedSources).toEqual(["a.c", "b.c", "main.c"]);
  });

  it("uses the editor's buffer for the entry, not a staged copy", () => {
    const unit = composeTranslationUnit({
      language: "c",
      entryPath: "main.c",
      entryCode: "/* from the editor */\n",
      files: [["main.c", "/* stale staged copy */\n"]],
    });
    expect(unit.extraFiles["main.c"]).toBe("/* from the editor */\n");
    expect(unit.includedSources).toEqual(["main.c"]);
  });

  it("stages headers without including them", () => {
    const unit = composeTranslationUnit({
      language: "cpp",
      entryPath: "main.cpp",
      entryCode: "",
      files: [["greeter.hpp", "#pragma once\n"], ["greeter.cpp", ""]],
    });
    expect(unit.extraFiles["greeter.hpp"]).toBe("#pragma once\n");
    expect(unit.includedSources).toEqual(["greeter.cpp", "main.cpp"]);
  });

  it("ignores files that are not C or C++", () => {
    const unit = composeTranslationUnit({
      language: "c",
      entryPath: "main.c",
      entryCode: "",
      files: [["notes.md", "# hi"], ["stdin.txt", "5 7"], ["data.csv", "a,b"]],
    });
    expect(unit.includedSources).toEqual(["main.c"]);
    expect(Object.keys(unit.extraFiles)).toEqual(["main.c"]);
  });

  it("recognises every C++ source extension", () => {
    const unit = composeTranslationUnit({
      language: "cpp",
      entryPath: "main.cpp",
      entryCode: "",
      files: [["a.cc", ""], ["b.cxx", ""], ["c.cpp", ""]],
    });
    expect(unit.includedSources).toEqual(["a.cc", "b.cxx", "c.cpp", "main.cpp"]);
  });

  it("quotes a path that would otherwise end the include directive", () => {
    const unit = composeTranslationUnit({
      language: "c",
      entryPath: 'we"ird.c',
      entryCode: "",
      files: [],
    });
    expect(unit.source).toBe('#include "we\\"ird.c"\n');
  });
});

describe("build output", () => {
  it("names the entry file instead of a temp object", () => {
    expect(
      rewriteObjectPaths(
        "wasm-ld: error: /tmp/main-f0ba80.o: undefined symbol: clock",
        "main.c",
      ),
    ).toBe("wasm-ld: error: main.c: undefined symbol: clock");
  });

  it("hides the synthetic unit from diagnostics", () => {
    // Real clang output shape: the include chain is named, and paths are
    // resolved relative to the includer.
    const raw = [
      `In file included from ${TRANSLATION_UNIT_NAME.c}:2:`,
      "./main.c:6:11: warning: using the result of an assignment as a condition [-Wparentheses]",
      "    6 |     if (n = 0) { }",
    ].join("\n");
    expect(hideTranslationUnit(raw, "c")).toBe(
      [
        "main.c:6:11: warning: using the result of an assignment as a condition [-Wparentheses]",
        "    6 |     if (n = 0) { }",
      ].join("\n"),
    );
  });

  it("says a suggested flag cannot be supplied here", () => {
    const out = annotateUnavailableFlags(
      "Support for formatting long double values is currently disabled.\n" +
        "To enable it, add -lc-printscan-long-double to the link command.",
    );
    expect(out).toContain("cannot be added");
    expect(out).toContain("casting it to double");
  });

  it("explains that -fno-exceptions is not a choice the reader has", () => {
    const out = annotateUnavailableFlags(
      "main.cpp:7:9: error: cannot use 'throw' with exceptions disabled",
    );
    expect(out).toContain("-fno-exceptions");
    expect(out).toContain("std::optional");
  });

  it("leaves ordinary diagnostics alone", () => {
    const raw = "main.c:3:5: warning: unused variable 'x' [-Wunused-variable]";
    expect(cleanBuildOutput(raw, "main.c", "c")).toBe(raw);
  });
});

describe("how a run ended", () => {
  it("says nothing when the program exited cleanly", () => {
    expect(describeExit(0)).toEqual({ failed: false, message: null });
  });

  it("reports a small status as-is", () => {
    expect(describeExit(3).message).toBe("Program exited with code 3.");
  });

  it("shows what a shell would report, and the raw value", () => {
    // A shell masks the status to eight bits, so a reader comparing with
    // their own terminal saw two different numbers for one program.
    expect(describeExit(-2147483646).message).toBe(
      "Program exited with code 2 (returned -2147483646).",
    );
    expect(describeExit(256).message).toBe(
      "Program exited with code 0 (returned 256).",
    );
  });

  it("names what a trap actually was", () => {
    expect(describeTrap("call stack exhausted")).toContain("ran out of stack");
    expect(describeTrap("unreachable")).toContain("assert()");
    expect(describeTrap("out of bounds memory access")).toContain("outside its memory");
    expect(describeTrap("something else entirely")).toContain("something else entirely");
  });
});

/**
 * The claim this whole approach rests on is about clang's behaviour, not
 * about string assembly, so it is checked against a real clang when one is
 * on the machine. browsercc's clang is the same compiler built for wasm.
 */
describe("against a real clang", () => {
  const clang = (() => {
    try {
      execFileSync("clang", ["--version"], { stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  })();

  /** Compile a composed unit and return clang's diagnostics. */
  function compile(files: Array<[string, string]>, entryCode: string): string {
    const unit = composeTranslationUnit({
      language: "c",
      entryPath: "main.c",
      entryCode,
      files,
    });
    const dir = mkdtempSync(join(tmpdir(), "ds-cc-"));
    for (const [path, content] of Object.entries(unit.extraFiles)) {
      writeFileSync(join(dir, path), content);
    }
    const unitPath = join(dir, unit.fileName);
    writeFileSync(unitPath, unit.source);
    // Warnings do not fail the compile, so stderr is read either way
    // (execFileSync would hand back stdout only).
    const result = spawnSync(
      "clang",
      ["-O2", "-Wall", "-std=gnu17", "-fsyntax-only", unit.fileName],
      { cwd: dir, encoding: "utf8" },
    );
    return cleanBuildOutput(result.stderr ?? "", "main.c", "c");
  }

  it.skipIf(!clang)("reports a warning at the line it is really on", () => {
    // main.c's `if (n = 0)` is on line 6. Concatenating an 7-line other.c
    // in front of it used to report line 13, in a file 9 lines long.
    const diagnostics = compile(
      [["other.c", "static int helper(void) {\n    return 1;\n}\n\nint fromOther(void) {\n    return helper();\n}\n"]],
      [
        "#include <stdio.h>",
        "int fromOther(void);",
        "int main(void) {",
        "    int n = 1;",
        "    (void)fromOther();",
        "    if (n = 0) { }",
        "    return n;",
        "}",
        "",
      ].join("\n"),
    );
    expect(diagnostics).toContain("main.c:6:");
    expect(diagnostics).toContain("-Wparentheses");
    // And nothing names the harness or a path the reader does not have.
    expect(diagnostics).not.toContain(TRANSLATION_UNIT_NAME.c);
    expect(diagnostics).not.toContain("./main.c");
  });

  it.skipIf(!clang)("blames the right file for a redefinition", () => {
    // Both sites used to be attributed to main.c, one of them at a line
    // that belonged to the other file.
    const diagnostics = compile(
      [["other.c", "static int helper(void) {\n    return 1;\n}\n"]],
      "static int helper(void) {\n    return 2;\n}\nint main(void) { return helper(); }\n",
    );
    expect(diagnostics).toContain("main.c:1:12: error: redefinition of 'helper'");
    expect(diagnostics).toContain("other.c:1:12: note: previous definition is here");
  });
});
