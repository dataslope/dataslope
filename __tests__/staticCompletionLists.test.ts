/**
 * Sanity checks over the curated static completion lists, no duplicate
 * labels (CodeMirror would render both rows), well-formed entries, and
 * a few spot checks that the lists carry what learners reach for.
 * Snippet entries (which carry an `apply` function) may intentionally
 * shadow a keyword of the same label, VS Code shows both too.
 */
import { describe, it, expect } from "vitest";
import type { Completion } from "@codemirror/autocomplete";
import { C_COMPLETIONS } from "../app/_components/completion/staticLists/c";
import { CPP_COMPLETIONS } from "../app/_components/completion/staticLists/cpp";
import { JAVA_COMPLETIONS } from "../app/_components/completion/staticLists/java";
import { PHP_COMPLETIONS } from "../app/_components/completion/staticLists/php";
import { CSHARP_COMPLETIONS } from "../app/_components/completion/staticLists/csharp";
import { R_COMPLETIONS } from "../app/_components/completion/staticLists/r";
import {
  JS_KEYWORDS,
  TS_KEYWORDS,
} from "../app/_components/completion/staticLists/javascript";

const LISTS: Array<[string, readonly Completion[]]> = [
  ["c", C_COMPLETIONS],
  ["cpp", CPP_COMPLETIONS],
  ["java", JAVA_COMPLETIONS],
  ["php", PHP_COMPLETIONS],
  ["csharp", CSHARP_COMPLETIONS],
  ["r", R_COMPLETIONS],
  ["js-keywords", JS_KEYWORDS],
  ["ts-keywords", TS_KEYWORDS],
];

describe.each(LISTS)("%s completions", (_name, list) => {
  it("has no duplicate labels among plain (non-snippet) entries", () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const c of list) {
      if (typeof c.apply === "function") continue; // snippet
      if (seen.has(c.label)) dupes.push(c.label);
      seen.add(c.label);
    }
    expect(dupes).toEqual([]);
  });

  it("has well-formed entries", () => {
    for (const c of list) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.type).toBeTruthy();
    }
  });

  it("is non-trivial", () => {
    expect(list.length).toBeGreaterThan(30);
  });
});

describe("spot checks", () => {
  const labels = (list: readonly Completion[]) => list.map((c) => c.label);

  it("C carries printf with a signature", () => {
    const printf = C_COMPLETIONS.find((c) => c.label === "printf");
    expect(printf?.type).toBe("function");
    expect(printf?.detail).toContain("fmt");
  });

  it("C++ includes both the C surface and std::", () => {
    expect(labels(CPP_COMPLETIONS)).toContain("malloc");
    expect(labels(CPP_COMPLETIONS)).toContain("std::vector");
    expect(labels(CPP_COMPLETIONS)).toContain("std::cout");
  });

  it("Java includes dotted statics reachable from a bare prefix", () => {
    expect(labels(JAVA_COMPLETIONS)).toContain("System.out.println");
    expect(labels(JAVA_COMPLETIONS)).toContain("ArrayList");
  });

  it("PHP keeps language constructs as keywords, not functions", () => {
    const echo = PHP_COMPLETIONS.find((c) => c.label === "echo");
    expect(echo?.type).toBe("keyword");
    const list = PHP_COMPLETIONS.filter((c) => c.label === "list");
    expect(list).toHaveLength(1);
    expect(list[0].type).toBe("keyword");
  });

  it("TS keywords are a superset of JS keywords", () => {
    const js = new Set(labels(JS_KEYWORDS));
    const ts = new Set(labels(TS_KEYWORDS));
    for (const k of js) expect(ts.has(k), k).toBe(true);
    expect(ts.size).toBeGreaterThan(js.size);
  });

  it("R marks base functions with signatures", () => {
    const readCsv = R_COMPLETIONS.find((c) => c.label === "read.csv");
    expect(readCsv?.type).toBe("function");
    expect(readCsv?.detail).toContain("file");
  });
});
