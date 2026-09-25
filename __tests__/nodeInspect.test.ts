import { inspect as nodeInspect, format as nodeFormat } from "node:util";
import { describe, expect, it } from "vitest";

import { formatConsoleArgs, inspect } from "../app/_components/runtime/nodeInspect";

describe("inspect", () => {
  it("renders primitives the way Node does", () => {
    expect(inspect("hi")).toBe("'hi'");
    expect(inspect(42)).toBe("42");
    expect(inspect(-0)).toBe("-0");
    expect(inspect(NaN)).toBe("NaN");
    expect(inspect(Infinity)).toBe("Infinity");
    expect(inspect(10n)).toBe("10n");
    expect(inspect(null)).toBe("null");
    expect(inspect(undefined)).toBe("undefined");
    expect(inspect(Symbol("s"))).toBe("Symbol(s)");
  });

  it("prints an error with its message and stack, not as {}", () => {
    const err = new TypeError("boom");
    const rendered = inspect(err);
    expect(rendered).toContain("TypeError: boom");
    expect(rendered).not.toBe("{}");
  });

  it("prints properties a program attached to an error", () => {
    const err = Object.assign(new Error("nope"), { code: "ENOENT" });
    expect(inspect(err)).toContain("code: 'ENOENT'");
  });

  it("labels functions and classes", () => {
    expect(inspect(function named() {})).toBe("[Function: named]");
    expect(inspect(() => {})).toBe("[Function (anonymous)]");
    expect(inspect(class Foo {})).toBe("[class Foo]");
  });

  it("does not run getters", () => {
    let called = false;
    const obj = {
      get trap() {
        called = true;
        return 1;
      },
    };
    expect(inspect(obj)).toBe("{ trap: [Getter] }");
    expect(called).toBe(false);
  });
});

/** The whole point of this module is to render values the way Node does, so
 *  the strongest assertion available is Node's own renderer. */
/** An array with holes: `base` densely, then `at` written by index, then
 *  stretched to `length` if given. */
function sparse(
  base: unknown[],
  at: Record<number, unknown>,
  length?: number,
): unknown[] {
  const out = [...base];
  for (const [index, value] of Object.entries(at)) out[Number(index)] = value;
  if (length !== undefined) out.length = length;
  return out;
}

/** A dense array with one element deleted, leaving a hole mid-way. */
function holed(values: unknown[], index: number): unknown[] {
  delete values[index];
  return values;
}

describe("agreement with node:util", () => {
  class Pt {
    constructor(
      public x: number,
      public y: number,
    ) {}
  }
  const circular: Record<string, unknown> = { name: "circ" };
  circular.self = circular;

  const CASES: Array<[string, unknown]> = [
    ["nested objects", { a: 1, b: { c: { d: { e: 1 } } } }],
    ["nested arrays", [1, 2, 3, [4, [5, [6]]]]],
    ["map", new Map([["k", 1], ["j", 2]])],
    ["set", new Set([1, 2, 3])],
    ["date", new Date(0)],
    ["regexp", /ab+c/gi],
    ["circular", circular],
    ["class instance", new Pt(1, 2)],
    ["typed array", new Uint8Array([1, 2, 3])],
    ["buffer", Buffer.from("hi")],
    ["long number array", Array.from({ length: 120 }, (_, i) => i)],
    ["string array", ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta"]],
    ["array of objects", [{ id: 1, name: "one" }, { id: 2, name: "two" }]],
    ["mixed object", { list: [1, 2, 3], when: new Date(0), re: /x/g, n: -0 }],
    ["empty containers", { a: [], b: {}, c: new Map(), d: new Set() }],
    ["quoted keys", { ok: 1, "not ok": 2, "3": 3 }],
    ["null prototype", Object.create(null)],
    ["sparse array", sparse([10, 999, 30, 40], { 10: "boo" })],
    ["array of only holes", sparse([], { 3: undefined }, 5)],
    ["trailing holes", sparse([1, 2, 3], {}, 8)],
    ["leading hole", sparse([], { 1: { a: 1 }, 5: [1, 2] })],
    ["hole in a grouped array", holed(Array.from({ length: 120 }, (_, i) => i), 5)],
    ["sparse array with extra keys", Object.assign(sparse([1, 2, 3], {}, 8), { extra: "x" })],
    ["grid with a trailing key", Object.assign(Array.from({ length: 40 }, (_, i) => i), { tag: "t" })],
    ["grid truncated past a hole", holed(Array.from({ length: 151 }, (_, i) => i), 100)],
    ["long typed array", new Int16Array(Array.from({ length: 130 }, (_, i) => i - 60))],
    ["a set that does not fit on one line", new Set([{ k0: "str", k1: 12345678901234 }, new Date(0)])],
    ["a deep value stays tall", { a: { b: { c: 1 } } }],
    ["empty typed array", new Uint8Array()],
  ];

  for (const [label, value] of CASES) {
    it(`renders ${label} exactly as Node does`, () => {
      expect(inspect(value)).toBe(nodeInspect(value, { breakLength: 80 }));
    });
  }

  // A fixed-seed corpus of random structures. The hand-written cases above
  // name the shapes that mattered; this one catches the layout rule nobody
  // thought to write a case for.
  it("agrees with Node across 200 generated structures", () => {
    let seed = 20260818;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const pick = <T,>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)];
    const LEAVES: unknown[] = [
      1, -0, 3.5, 1e21, 255, -17, 0.1, 12345678901234, 10n, NaN, Infinity,
      "str", "it's", "", "a longer string with spaces", "x".repeat(40),
      true, null, undefined, /re+g/gi, new Date(0),
    ];
    const make = (level: number): unknown => {
      const r = rnd();
      if (level > 1 || r < 0.4) return pick(LEAVES);
      if (r < 0.65) {
        const n = Math.floor(rnd() * 140);
        const arr: unknown[] = Array.from({ length: n }, () => make(level + 1));
        if (rnd() < 0.3 && n > 3) delete arr[Math.floor(rnd() * n)];
        if (rnd() < 0.15) arr.length = n + Math.floor(rnd() * 10);
        if (rnd() < 0.1) (arr as unknown as Record<string, unknown>).tag = "t";
        return arr;
      }
      if (r < 0.72) {
        const n = Math.floor(rnd() * 130);
        return new Int16Array(Array.from({ length: n }, () => Math.floor(rnd() * 1000) - 500));
      }
      if (r < 0.79) {
        return new Map<unknown, unknown>([["a", make(level + 1)], [2, make(level + 1)]]);
      }
      if (r < 0.86) return new Set([make(level + 1), make(level + 1)]);
      const o: Record<string, unknown> = {};
      for (let i = 0; i < Math.floor(rnd() * 8); i++) o[`k${i}`] = make(level + 1);
      return o;
    };
    for (let i = 0; i < 200; i++) {
      const value = make(0);
      expect(inspect(value), `case ${i}`).toBe(nodeInspect(value, { breakLength: 80 }));
    }
  });

  it("formats console arguments exactly as Node does", () => {
    const cases: unknown[][] = [
      ["16 fmt %s and %d and %j", "str", 42, { a: 1 }],
      ["%s!", "hi", "extra", 3],
      ["%s and %s", "one"],
      ["100%% sure"],
      ["100%% sure", "really"],
      ["%cstyled", "color: red"],
      ["count", 3, { a: 1 }],
      [new Map([["k", 1]])],
      ["%o", { a: { b: { c: 1 } } }],
      ["%i and %f", "42px", "3.5rem"],
    ];
    for (const args of cases) {
      expect(formatConsoleArgs(args), JSON.stringify(args)).toBe(
        nodeFormat(...(args as [unknown])),
      );
    }
  });
});
