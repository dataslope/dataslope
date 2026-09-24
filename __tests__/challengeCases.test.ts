/**
 * The table-driven case builder and the prose helpers in `lib/challenges`.
 *
 * `challengeSolutions.test.ts` already runs every generated check for real,
 * against every reference solution, so a builder that emitted broken code
 * would fail there. What that sweep cannot see is a builder that is too
 * lenient: checks that pass whatever the function returns. These pin the
 * rendering itself, and that a wrong answer is reported as one.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildHarness, parseHarnessOutput } from "@/app/_components/challengeHarness";
import { dualChallenge, ticks } from "@/lib/challenges/authoring";
import {
  examplesFromCases,
  jsLiteral,
  pyLiteral,
  type CallCase,
} from "@/lib/challenges/cases";

describe("ticks", () => {
  it("turns backtick runs into code spans", () => {
    expect(ticks("Sort by `full_name`, then `id`.")).toEqual([
      "Sort by ",
      { code: "full_name" },
      ", then ",
      { code: "id" },
      ".",
    ]);
  });

  it("leaves text without backticks alone", () => {
    expect(ticks("No code here.")).toEqual(["No code here."]);
  });

  it("keeps an unpaired backtick literal", () => {
    expect(ticks("a ` b")).toEqual(["a ` b"]);
  });
});

describe("literals", () => {
  const value = { a: [1, -2.5, "x\ny"], "not an id": null, t: true, f: false };

  it("writes Python literals", () => {
    expect(pyLiteral(value)).toBe(
      '{"a": [1, -2.5, "x\\ny"], "not an id": None, "t": True, "f": False}',
    );
  });

  it("writes JavaScript literals", () => {
    expect(jsLiteral(value)).toBe(
      '{ a: [1, -2.5, "x\\ny"], "not an id": null, t: true, f: false }',
    );
    expect(jsLiteral({})).toBe("{}");
  });

  it("refuses numbers only one language can write", () => {
    expect(() => pyLiteral(Number.NaN)).toThrow();
    expect(() => jsLiteral(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe("examplesFromCases", () => {
  const cases: CallCase[] = [
    { id: "a", name: "A", args: [[1, 2], 3], expected: true, example: "Shown." },
    { id: "b", name: "B", args: [[], 0], expected: false },
    { id: "c", name: "C", args: ["x", 1], throws: true, example: "Raises." },
  ];

  it("turns only the marked cases into examples", () => {
    const examples = examplesFromCases(["nums", "k"], cases);
    expect(examples).toHaveLength(2);
    expect(examples[0]).toEqual({
      label: "Example 1",
      fields: [
        { name: "nums", value: "[1, 2]" },
        { name: "k", value: "3" },
        { name: "output", value: "True", emphasis: true },
      ],
      note: "Shown.",
    });
    expect(examples[1].fields.at(-1)?.value).toBe("raises an error");
  });

  it("refuses an example whose arguments do not match the parameters", () => {
    expect(() => examplesFromCases(["nums"], cases)).toThrow(/2 args for 1 params/);
  });
});

// ─── Generated checks, run for real ──────────────────────────────────

function run(lang: "python" | "javascript", source: string) {
  const dir = mkdtempSync(join(tmpdir(), "ds-cases-"));
  const file = join(dir, lang === "python" ? "main.py" : "main.mjs");
  writeFileSync(file, source);
  let stdout = "";
  try {
    stdout = execFileSync(lang === "python" ? "python3" : process.execPath, [file], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    stdout = (err as { stdout?: string }).stdout ?? "";
  }
  return new Map(parseHarnessOutput(stdout).results.map((r) => [r.id, r]));
}

describe("dualChallenge checks", () => {
  const challenge = dualChallenge({
    slug: "cases-fixture",
    title: "Cases Fixture",
    difficulty: "Beginner",
    topic: "Testing",
    description: "A fixture.",
    prompt: ["Return the `total` and the pair."],
    python: {
      fn: "summarize",
      signature: "def summarize(a: int, b: int) -> dict",
      starter: "",
      solution: `def summarize(a, b):
    if a < 0:
        raise ValueError("negative")
    return {"pair": (a, b), "third": b / 3}
`,
    },
    javascript: {
      fn: "summarize",
      signature: "function summarize(a: number, b: number): object",
      starter: "",
      solution: `function summarize(a, b) {
  if (a < 0) throw new RangeError("negative");
  return { third: b / 3, pair: [a, b] };
}
`,
    },
    cases: [
      // Key order differs between the two solutions, and Python returns a
      // tuple where the expectation says list: both must still pass.
      { id: "equal", name: "Equal", args: [1, 3], expected: { pair: [1, 3], third: 1 } },
      {
        id: "tolerance",
        name: "Within tolerance",
        args: [1, 2],
        expected: { pair: [1, 2], third: 0.6667 },
        tolerance: 1e-3,
      },
      { id: "raises", name: "Raises", args: [-1, 0], throws: { py: "ValueError" } },
      { id: "wrong", name: "Wrong on purpose", args: [1, 3], expected: { pair: [1, 4], third: 1 } },
      { id: "no-raise", name: "Should raise but does not", args: [1, 3], throws: true },
    ],
  });

  for (const lang of challenge.languages) {
    it(`grades ${lang.shortLabel} honestly`, () => {
      const harness = buildHarness(lang.id, lang.tests as never);
      const results = run(lang.id as "python" | "javascript", `${lang.solutionCode}\n${harness}`);
      expect(results.get("equal")?.pass).toBe(true);
      expect(results.get("tolerance")?.pass).toBe(true);
      expect(results.get("raises")?.pass).toBe(true);
      expect(results.get("wrong")?.pass).toBe(false);
      expect(results.get("wrong")?.detail).toMatch(/^summarize\(1, 3\) returned .*expected/);
      expect(results.get("no-raise")?.pass).toBe(false);
    });
  }
});
