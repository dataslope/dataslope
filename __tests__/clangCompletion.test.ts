/**
 * The C/C++ completion tier's pure half: turning clang's `COMPLETION:`
 * lines (captured from the browsercc build) into popup items, and locating
 * the identifier clang must be pointed at.
 */
import { describe, expect, it } from "vitest";

import {
  cc1ArgsFromDriverOutput,
  identifierStart,
  parseClangCompletions,
  tarEntries,
} from "../app/_components/runtime/clangCompletion";

const VECTOR_MEMBERS = `COMPLETION: assign : [#void#]assign(<#InputIterator first#>, <#InputIterator last#>)
COMPLETION: assign : [#void#]assign(<#ForwardIterator first#>, <#ForwardIterator last#>)
COMPLETION: assign : [#void#]assign(<#size_type n#>, <#const_reference u#>)
COMPLETION: at : [#reference#]at(<#size_type n#>)
COMPLETION: back : [#reference#]back()
COMPLETION: capacity : [#size_type#]capacity()[# const#]
COMPLETION: __alloc : [#allocator_type &#]__alloc()
COMPLETION: operator= : [#vector<int> &#]operator=(<#const vector<int> &x#>)
`;

describe("parseClangCompletions", () => {
  it("maps members with signatures and counts overloads", () => {
    const items = parseClangCompletions(VECTOR_MEMBERS, { typedPrefix: "" });
    const byLabel = Object.fromEntries(items.map((i) => [i.label, i]));
    expect(byLabel.assign).toMatchObject({
      type: "function",
      detail: "(InputIterator first, InputIterator last): void (+2 overloads)",
    });
    expect(byLabel.at).toMatchObject({ type: "function", detail: "(size_type n): reference" });
    expect(byLabel.capacity.detail).toBe("() const: size_type");
    // Private and operator members stay hidden unless typed for.
    expect(byLabel.__alloc).toBeUndefined();
    expect(byLabel["operator="]).toBeUndefined();
    expect(parseClangCompletions(VECTOR_MEMBERS, { typedPrefix: "_" }).some((i) => i.label === "__alloc")).toBe(true);
  });

  it("types fields, keywords, macros and types", () => {
    const out = `COMPLETION: x : [#int#]x
COMPLETION: y : [#int#]y
COMPLETION: int
COMPLETION: return
COMPLETION: EOF
COMPLETION: point : point
COMPLETION: vector : vector<<#class _Tp#>{#, class _Allocator#}>
COMPLETION: Pattern : for(<#init#>;<#cond#>;<#inc#>){<#stmts#>}
COMPLETION: <deduction guide for vector> : [#vector<_Tp>#]<<#class _Tp#>>()
COMPLETION: printf : [#int#]printf(<#const char *#>, ...)`;
    const items = parseClangCompletions(out, { typedPrefix: "" });
    const byLabel = Object.fromEntries(items.map((i) => [i.label, i]));
    expect(byLabel.x).toMatchObject({ type: "variable", detail: "int" });
    expect(byLabel.int.type).toBe("keyword");
    expect(byLabel.return.type).toBe("keyword");
    expect(byLabel.EOF.type).toBe("constant");
    expect(byLabel.point.type).toBe("type");
    expect(byLabel.vector).toMatchObject({ type: "type", detail: "<class _Tp, class _Allocator>" });
    expect(byLabel.printf.detail).toBe("(const char *, ...): int");
    expect(byLabel.Pattern).toBeUndefined();
    expect(Object.keys(byLabel).some((k) => k.startsWith("<"))).toBe(false);
  });

  it("caps the list", () => {
    const out = Array.from({ length: 50 }, (_, i) => `COMPLETION: name${i} : [#int#]name${i}`).join("\n");
    expect(parseClangCompletions(out, { typedPrefix: "", limit: 10 })).toHaveLength(10);
  });
});

describe("identifierStart", () => {
  it("points clang at the first character of the identifier", () => {
    expect(identifierStart("  pri", 5)).toEqual({ column1: 3, prefixLength: 3 });
    expect(identifierStart("  p.", 4)).toEqual({ column1: 5, prefixLength: 0 });
    expect(identifierStart("std::vec", 8)).toEqual({ column1: 6, prefixLength: 3 });
  });
});

describe("cc1ArgsFromDriverOutput", () => {
  it("extracts the quoted cc1 vector minus the binary", () => {
    const stderr = `clang version 21\n "/usr/bin/clang" "-cc1" "-triple" "wasm32-unknown-wasi" "-fsyntax-only" "-code-completion-at=main.c:6:5" "main.c"\n`;
    expect(cc1ArgsFromDriverOutput(stderr)).toEqual([
      "-cc1", "-triple", "wasm32-unknown-wasi", "-fsyntax-only", "-code-completion-at=main.c:6:5", "main.c",
    ]);
    expect(cc1ArgsFromDriverOutput("nothing here")).toBeNull();
  });
});

describe("tarEntries", () => {
  it("walks a minimal ustar archive", () => {
    const enc = new TextEncoder();
    const block = new Uint8Array(512 * 3);
    block.set(enc.encode("include/a.h"), 0);
    block.set(enc.encode("0000006"), 124);
    block.set(enc.encode("int a;"), 512);
    const entries = [...tarEntries(block.buffer)];
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("include/a.h");
    expect(new TextDecoder().decode(entries[0].content)).toBe("int a;");
  });
});
