/**
 * Document symbols from the Lezer trees: what the analyzer-less languages
 * (Java, PHP) complete with, and the pre-boot tier for C/C++. Parsed with
 * the real grammars the editors load, forced to completion so a test never
 * sees the incremental parser's placeholder.
 */
import { describe, expect, it } from "vitest";
import { EditorState, type Extension } from "@codemirror/state";
import { ensureSyntaxTree } from "@codemirror/language";
import {
  CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { php } from "@codemirror/lang-php";

import {
  baseTypeName,
  documentMemberSource,
  documentSymbolSource,
  documentSymbols,
  type SymbolLanguage,
} from "../app/_components/completion/documentSymbols";

function stateFor(doc: string, ext: Extension): EditorState {
  const state = EditorState.create({ doc, extensions: [ext] });
  ensureSyntaxTree(state, doc.length, 5000);
  return state;
}

function completeAt(
  state: EditorState,
  marker: string,
  source: ReturnType<typeof documentMemberSource>,
): CompletionResult | null {
  const pos = state.doc.toString().indexOf(marker) + marker.length;
  return source(new CompletionContext(state, pos, false)) as CompletionResult | null;
}

const labels = (res: CompletionResult | null) =>
  (res?.options ?? []).map((o) => o.label);
const detailOf = (res: CompletionResult | null, label: string) =>
  res?.options.find((o) => o.label === label)?.detail;

describe("Java", () => {
  const doc = `import java.util.*;
public class Main {
  private int count = 0;
  static final String NAME = "x";
  public static void main(String[] args) {
    String s = "hi";
    List<Integer> nums = new ArrayList<>();
    Map<String, Integer> ages = new HashMap<>();
    int a = 1, b = 2;
    for (String name : args) { }
    Scanner sc = new Scanner(System.in);
    Cart cart = new Cart();
    s.
    nums.
    ages.
    System.out.
    Math.
    sc.
    cart.
    args.
    s.trim().
    Cart.
  }
  int helper(double x, String y) { return 0; }
}
class Cart {
  int total;
  static int made;
  void add(String item) {}
  static Cart make() { return new Cart(); }
}`;
  const state = stateFor(doc, java());
  const lang: SymbolLanguage = "java";
  const members = documentMemberSource(lang);
  const symbols = documentSymbolSource(lang);

  it("collects declarations with their declared types", () => {
    const syms = documentSymbols(state, lang);
    const byName = Object.fromEntries(syms.map((s) => [s.name, s]));
    expect(byName.Main.kind).toBe("class");
    expect(byName.count).toMatchObject({ kind: "property", type: "int", owner: "Main" });
    expect(byName.NAME).toMatchObject({ kind: "property", isStatic: true });
    expect(byName.main).toMatchObject({ kind: "method", detail: "(String[] args)" });
    expect(byName.s).toMatchObject({ kind: "variable", type: "String" });
    expect(byName.nums).toMatchObject({ kind: "variable", type: "List<Integer>" });
    expect(byName.a).toMatchObject({ kind: "variable", type: "int" });
    expect(byName.b).toMatchObject({ kind: "variable", type: "int" });
    expect(byName.name).toMatchObject({ kind: "variable", type: "String" });
    expect(byName.args).toMatchObject({ kind: "variable", type: "String[]" });
    expect(byName.x).toMatchObject({ kind: "variable", type: "double" });
    expect(byName.helper).toMatchObject({ kind: "method", type: "int" });
    expect(byName.add).toMatchObject({ kind: "method", owner: "Cart" });
    expect(byName.make).toMatchObject({ kind: "method", owner: "Cart", isStatic: true });
  });

  it("resolves JDK members from the declared type", () => {
    const s = completeAt(state, "    s.", members);
    expect(labels(s)).toEqual(expect.arrayContaining(["length", "charAt", "toUpperCase"]));
    expect(labels(s)).not.toContain("format"); // static, not on an instance
    expect(detailOf(s, "length")).toBe("(): int");

    const nums = completeAt(state, "    nums.", members);
    expect(labels(nums)).toEqual(expect.arrayContaining(["add", "get", "size", "stream"]));
    // Generic placeholder substituted with the receiver's argument.
    expect(detailOf(nums, "get")).toBe("(int index): Integer");

    const ages = completeAt(state, "    ages.", members);
    expect(detailOf(ages, "get")).toBe("(Object key): Integer");
    expect(detailOf(ages, "put")).toBe("(String key, Integer value): Integer");
  });

  it("walks static receivers and one call hop", () => {
    expect(labels(completeAt(state, "    System.out.", members))).toContain("println");
    const math = completeAt(state, "    Math.", members);
    expect(labels(math)).toEqual(expect.arrayContaining(["sqrt", "PI"]));
    expect(labels(completeAt(state, "    sc.", members))).toContain("nextInt");
    expect(labels(completeAt(state, "    args.", members))).toEqual(["length", "clone"]);
    expect(labels(completeAt(state, "    s.trim().", members))).toContain("toUpperCase");
    // Call arguments in the chain: `nums.get(0)` is an Integer.
    const hop = stateFor("class A { void f() { java.util.List<Integer> nums = null; nums.get(0). } }", java());
    expect(labels(completeAt(hop, "nums.get(0).", members))).toEqual(
      expect.arrayContaining(["intValue", "compareTo", "MAX_VALUE".toLowerCase() === "x" ? "" : "toString"]),
    );
    expect(labels(completeAt(hop, "nums.get(0).", members))).not.toContain("MAX_VALUE");
  });

  it("uses the document's own classes for user types", () => {
    const cart = completeAt(state, "    cart.", members);
    expect(labels(cart)).toEqual(expect.arrayContaining(["total", "add", "equals"]));
    expect(labels(cart)).not.toContain("made");
    const statics = completeAt(state, "    Cart.", members);
    expect(labels(statics)).toEqual(expect.arrayContaining(["made", "make"]));
    expect(labels(statics)).not.toContain("total");
  });

  it("offers declarations and the enclosing class's members unqualified", () => {
    const pos = doc.indexOf("    s.\n");
    const res = symbols(new CompletionContext(state, pos, true)) as CompletionResult;
    const names = labels(res);
    expect(names).toEqual(expect.arrayContaining(["s", "nums", "helper", "count", "NAME", "Cart"]));
    // Cart's members are not in scope inside Main.
    expect(names).not.toContain("total");
  });

  it("never offers the name being declared back to itself", () => {
    const partial = stateFor("class A { void f() { int coun } }", java());
    const pos = partial.doc.toString().indexOf("coun") + 4;
    const res = symbols(new CompletionContext(partial, pos, false)) as CompletionResult | null;
    expect(labels(res)).not.toContain("coun");
  });
});

describe("C", () => {
  const doc = `#include <stdio.h>
typedef struct { int id; char name[20]; } Rec;
struct point { int x; int y; };
enum Color { RED, GREEN };
int gcount = 0;
static void helper(int *p, const char *s) { int local = 1; }
int main(void) {
  Rec r;
  struct point q;
  struct point *pp = &q;
  r.
  q.
  pp->
  return 0;
}`;
  const state = stateFor(doc, cpp());
  const members = documentMemberSource("c");

  it("collects functions, globals, params and enum constants", () => {
    const syms = documentSymbols(state, "c");
    const byName = Object.fromEntries(syms.map((s) => [s.name, s]));
    expect(byName.helper).toMatchObject({ kind: "function", detail: "(int *p, const char *s)" });
    expect(byName.gcount).toMatchObject({ kind: "variable", type: "int" });
    expect(byName.p).toMatchObject({ kind: "variable" });
    expect(byName.local).toMatchObject({ kind: "variable", type: "int" });
    expect(byName.RED).toMatchObject({ kind: "constant", owner: "Color" });
    expect(byName.point).toMatchObject({ kind: "type" });
    expect(byName.Rec).toMatchObject({ kind: "type" });
  });

  it("completes struct fields through typedefs, tags and pointers", () => {
    expect(labels(completeAt(state, "  r.", members))).toEqual(["id", "name"]);
    expect(labels(completeAt(state, "  q.", members))).toEqual(["x", "y"]);
    expect(labels(completeAt(state, "  pp->", members))).toEqual(["x", "y"]);
  });

  it("strips qualifiers from type names", () => {
    expect(baseTypeName("struct point *")).toBe("point");
    expect(baseTypeName("const std::vector<int>&")).toBe("vector");
    expect(baseTypeName("unsigned int[]")).toBe("int");
    expect(baseTypeName("java.util.List<String>")).toBe("List");
  });
});

describe("C++", () => {
  const doc = `#include <vector>
class Stack {
 public:
  void push(int v) { data.push_back(v); }
  int top() const { return data.back(); }
  static Stack empty() { return Stack(); }
 private:
  std::vector<int> data;
};
int main() {
  Stack s;
  s.
  Stack::
}`;
  const state = stateFor(doc, cpp());
  const members = documentMemberSource("cpp");

  it("completes class members and statics", () => {
    const inst = completeAt(state, "  s.", members);
    expect(labels(inst)).toEqual(expect.arrayContaining(["push", "top", "data"]));
    expect(detailOf(inst, "push")).toBe("(int v)");
    expect(labels(completeAt(state, "  Stack::", members))).toEqual(["empty"]);
  });
});

describe("PHP", () => {
  const doc = `<?php
class Cart {
  public $items = [];
  private int $count = 0;
  const MAX = 3;
  public static $instances = 0;
  public function add(string $x, $y = 1): void { $this-> }
  public static function make(): Cart { return new Cart(); }
}
function total(array $rows, $tax = 0) { $sum = 0; foreach ($rows as $k => $row) { $sum += $row; } return $sum; }
$cart = new Cart();
$cart->
Cart::
`;
  const state = stateFor(doc, php());
  const members = documentMemberSource("php");
  const symbols = documentSymbolSource("php");

  it("collects classes, functions, members and typed variables", () => {
    const syms = documentSymbols(state, "php");
    const byName = Object.fromEntries(syms.map((s) => [s.name, s]));
    expect(byName.Cart.kind).toBe("class");
    expect(byName.items).toMatchObject({ kind: "property", owner: "Cart" });
    expect(byName.count).toMatchObject({ kind: "property", type: "int" });
    expect(byName.MAX).toMatchObject({ kind: "constant", isStatic: true });
    expect(byName.add).toMatchObject({ kind: "method", detail: "(string $x, $y = 1)", type: "void" });
    expect(byName.make).toMatchObject({ kind: "method", isStatic: true });
    expect(byName.total).toMatchObject({ kind: "function", detail: "(array $rows, $tax = 0)" });
    expect(byName.$rows).toMatchObject({ kind: "variable", type: "array" });
    expect(byName.$sum).toMatchObject({ kind: "variable" });
    expect(byName.$row).toMatchObject({ kind: "variable" });
    expect(byName.$cart).toMatchObject({ kind: "variable", type: "Cart" });
  });

  it("completes -> on $this and on `new`-typed variables, :: for statics", () => {
    expect(labels(completeAt(state, "{ $this->", members))).toEqual(
      expect.arrayContaining(["items", "count", "add"]),
    );
    const inst = completeAt(state, "\n$cart->", members);
    expect(labels(inst)).toEqual(expect.arrayContaining(["items", "add"]));
    expect(labels(inst)).not.toContain("make");
    const statics = completeAt(state, "\nCart::", members);
    expect(labels(statics)).toEqual(expect.arrayContaining(["make", "MAX", "$instances"]));
    expect(labels(statics)).not.toContain("add");
  });

  it("offers functions and classes at top level", () => {
    const pos = doc.indexOf("\n$cart->");
    const res = symbols(new CompletionContext(state, pos, true)) as CompletionResult;
    expect(labels(res)).toEqual(expect.arrayContaining(["total", "Cart", "$cart"]));
    expect(labels(res)).not.toContain("add");
  });
});
