/**
 * Pure-logic tests for the TS language-service worker's helpers
 * (kind mapping, prefix measurement, lib-reference scanning).
 */
import { describe, it, expect } from "vitest";
import {
  cmTypeForTsKind,
  completionPrefixLength,
  referencedLibFiles,
} from "../app/_components/runtime/tsCompletionKinds";

describe("cmTypeForTsKind", () => {
  it("maps the common ScriptElementKind values", () => {
    expect(cmTypeForTsKind("method")).toBe("method");
    expect(cmTypeForTsKind("function")).toBe("function");
    expect(cmTypeForTsKind("const")).toBe("constant");
    expect(cmTypeForTsKind("let")).toBe("variable");
    expect(cmTypeForTsKind("property")).toBe("property");
    expect(cmTypeForTsKind("class")).toBe("class");
    expect(cmTypeForTsKind("interface")).toBe("interface");
    expect(cmTypeForTsKind("enum")).toBe("enum");
    expect(cmTypeForTsKind("module")).toBe("namespace");
    expect(cmTypeForTsKind("keyword")).toBe("keyword");
  });

  it("falls back to variable for unknown kinds", () => {
    expect(cmTypeForTsKind("JSX attribute")).toBe("variable");
    expect(cmTypeForTsKind("")).toBe("variable");
  });
});

describe("completionPrefixLength", () => {
  it("measures the identifier fragment before the cursor", () => {
    const text = "const value = win";
    expect(completionPrefixLength(text, text.length)).toBe(3);
  });

  it("stops at member-access dots", () => {
    const text = "console.lo";
    expect(completionPrefixLength(text, text.length)).toBe(2);
  });

  it("is zero right after a dot or at start of doc", () => {
    expect(completionPrefixLength("console.", 8)).toBe(0);
    expect(completionPrefixLength("abc", 0)).toBe(0);
  });

  it("includes $ and _ as identifier characters", () => {
    const text = "let x = $_ab";
    expect(completionPrefixLength(text, text.length)).toBe(4);
  });
});

describe("referencedLibFiles", () => {
  it("extracts lib reference directives", () => {
    const src = [
      '/// <reference lib="es2021" />',
      '/// <reference lib="es2022.array" />',
      "interface Foo {}",
      '/// <reference path="other.d.ts" />',
    ].join("\n");
    expect(referencedLibFiles(src)).toEqual([
      "lib.es2021.d.ts",
      "lib.es2022.array.d.ts",
    ]);
  });

  it("returns empty for files without references", () => {
    expect(referencedLibFiles("declare const x: number;")).toEqual([]);
  });
});
