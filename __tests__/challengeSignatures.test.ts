/**
 * JavaScript signatures must be JavaScript.
 *
 * They are authored with TypeScript annotations and rendered through
 * `jsSignature` (`lib/challenges/signatures`), which moves the types into
 * JSDoc. What a learner sees on a JavaScript tab should be something they can
 * paste into the editor, so this parses every one as JavaScript: an
 * annotation the converter did not understand is a syntax error here rather
 * than on the page.
 */

import { describe, expect, it } from "vitest";
import { getChallenge, getChallengeSlugs } from "@/lib/challenges";
import { jsSignature } from "@/lib/challenges/signatures";

/**
 * A signature is a declaration without a body, which no parser accepts, so
 * give every declaration line an empty one and let V8 judge the rest.
 */
function withBodies(signature: string): string {
  return signature
    .split("\n")
    .map((line) =>
      /^\s*(?:function\s+[\w$]+|(?:(?:static|async|get|set)\s+)*[\w$]+)\s*\([^()]*\)\s*$/.test(line)
        ? `${line} {}`
        : line,
    )
    .join("\n");
}

function parses(signature: string): string | null {
  try {
    new Function(withBodies(signature));
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

/** Every JavaScript signature a learner can see, labelled by where it is. */
function jsSignatures(): [string, string][] {
  const out: [string, string][] = [];
  for (const slug of getChallengeSlugs()) {
    const c = getChallenge(slug)!;
    for (const lang of c.languages) {
      if (lang.id === "javascript" && lang.signature) out.push([slug, lang.signature]);
    }
    if (c.languages[0]?.id !== "javascript") continue;
    for (const step of c.steps) {
      for (const block of step.instructions) {
        if (block.kind === "code") out.push([`${slug} step ${step.n}`, block.source]);
      }
    }
  }
  return out;
}

describe("jsSignature", () => {
  it("moves parameter and return types into JSDoc", () => {
    expect(jsSignature("function twoSum(nums: number[], target: number): number[]")).toBe(
      [
        "/**",
        " * @param {number[]} nums",
        " * @param {number} target",
        " * @returns {number[]}",
        " */",
        "function twoSum(nums, target)",
      ].join("\n"),
    );
  });

  it("reads a parameter list across lines, with nested types and a trailing comma", () => {
    const out = jsSignature(`function checkout(
  items: { sku: string, qty: number }[],
  discount: Discount | null,
): { total: number, tax: number }`);
    expect(out).toContain("@param {{ sku: string, qty: number }[]} items");
    expect(out).toContain("@param {Discount | null} discount");
    expect(out).toContain("@returns {{ total: number, tax: number }}");
    expect(out.endsWith("function checkout(items, discount)")).toBe(true);
  });

  it("rewrites class methods: optional, rest, getters and function-typed parameters", () => {
    const out = jsSignature(`class Emitter {
  constructor(name?: string)
  get size(): number
  on(event: string, listener: (...args: any[]) => void): this
  emit(event: string, ...args: any[]): boolean
  clear(): void
}`);
    expect(out).toContain("/** @param {string} [name] */\n  constructor(name)");
    expect(out).toContain("/** @type {number} */\n  get size()");
    expect(out).toContain("@param {(...args: any[]) => void} listener");
    expect(out).toContain("@param {...any} args");
    expect(out).toContain("emit(event, ...args)");
    // `void` says nothing a reader needs, so there is no tag at all.
    expect(out).toContain("  clear()\n}");
  });

  it("leaves JavaScript and comments alone", () => {
    const js = "/** @typedef {{ a: number }} Thing */\n\nfunction f(a, b)";
    expect(jsSignature(js)).toBe(js);
  });
});

describe("challenge JavaScript signatures", () => {
  const signatures = jsSignatures();

  it("finds the signatures it is meant to check", () => {
    expect(signatures.length).toBeGreaterThan(100);
  });

  it("parse as JavaScript", () => {
    const broken = signatures
      .map(([where, sig]) => [where, sig, parses(sig)] as const)
      .filter(([, , error]) => error !== null)
      .map(([where, sig, error]) => `${where}: ${error}\n${sig}`);
    expect(broken, broken.join("\n\n")).toEqual([]);
  });
});
