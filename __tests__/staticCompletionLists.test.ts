/**
 * The curated static completion lists carry no duplicate labels (CodeMirror
 * would render both rows). Snippet entries (which carry an `apply` function)
 * may intentionally shadow a keyword of the same label; VS Code shows both too.
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
});
