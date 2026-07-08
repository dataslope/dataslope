/**
 * AI inline completion: prompt assembly + response cleanup.
 *
 * Pure functions (no D1, no network), so they run in Node, same posture as
 * aiModels.test.ts. The endpoint's auth/tier/budget gates are exercised by
 * their own modules; here we pin the prompt contract and the defensive
 * post-processing of model replies.
 */
import { describe, it, expect } from "vitest";
import {
  COMPLETION_LIMITS,
  buildCompletionMessages,
  postProcessCompletion,
  trimContext,
} from "../lib/ai/completion";

describe("trimContext", () => {
  it("passes short context through untouched", () => {
    const { prefix, suffix } = trimContext("abc", "def");
    expect(prefix).toBe("abc");
    expect(suffix).toBe("def");
  });

  it("keeps the END of an oversized prefix and the START of an oversized suffix", () => {
    const bigPrefix = "x".repeat(10_000) + "\nlast line";
    const bigSuffix = "first line\n" + "y".repeat(10_000);
    const { prefix, suffix } = trimContext(bigPrefix, bigSuffix);
    expect(prefix.length).toBeLessThanOrEqual(
      COMPLETION_LIMITS.prefixCharBudget,
    );
    expect(suffix.length).toBeLessThanOrEqual(
      COMPLETION_LIMITS.suffixCharBudget,
    );
    expect(prefix.endsWith("last line")).toBe(true);
    expect(suffix.startsWith("first line")).toBe(true);
  });

  it("snaps a cheap cut to a line boundary", () => {
    const lines = Array.from({ length: 500 }, (_, i) => `line ${i}`).join("\n");
    const { prefix } = trimContext(lines + "\ntail", "");
    // After trimming, the prefix starts at a whole line, not mid-line.
    expect(prefix.startsWith("line ") || prefix.startsWith("tail")).toBe(true);
  });
});

describe("buildCompletionMessages", () => {
  it("marks the cursor between prefix and suffix", () => {
    const messages = buildCompletionMessages({
      language: "python",
      prefix: "def add(a, b):\n    ",
      suffix: "\nprint(add(1, 2))",
    });
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].content).toContain(
      "def add(a, b):\n    <|cursor|>\nprint(add(1, 2))",
    );
    expect(messages[1].content).toContain("Language: python");
  });

  it("includes the filename only when given", () => {
    const withFile = buildCompletionMessages({
      language: "cpp",
      filename: "main.cpp",
      prefix: "int main",
      suffix: "",
    });
    expect(withFile[1].content).toContain("File: main.cpp");
    const without = buildCompletionMessages({
      language: "cpp",
      prefix: "int main",
      suffix: "",
    });
    expect(without[1].content).not.toContain("File:");
  });

  it("pins the raw-code-only output contract in the system prompt", () => {
    const [system] = buildCompletionMessages({
      language: "r",
      prefix: "x <- ",
      suffix: "",
    });
    expect(system.content).toContain("ONLY the code");
    expect(system.content).toContain("untrusted");
  });
});

describe("postProcessCompletion", () => {
  it("passes a clean completion through", () => {
    expect(postProcessCompletion("return a + b", "def add(a, b):\n    ")).toBe(
      "return a + b",
    );
  });

  it("strips a wrapping markdown fence", () => {
    expect(postProcessCompletion("```python\nreturn a + b\n```", "")).toBe(
      "return a + b",
    );
    expect(postProcessCompletion("```\nreturn a + b\n```", "")).toBe(
      "return a + b",
    );
  });

  it("removes echoed cursor markers", () => {
    expect(postProcessCompletion("foo<|cursor|>bar", "")).toBe("foobar");
  });

  it("cuts a restated current line", () => {
    expect(
      postProcessCompletion("    total = total + x", "for x in xs:\n    total"),
    ).toBe(" = total + x");
  });

  it("returns empty for whitespace-only replies", () => {
    expect(postProcessCompletion("", "code")).toBe("");
    expect(postProcessCompletion("   \n \n", "code")).toBe("");
  });

  it("drops leading blank lines and trailing whitespace", () => {
    expect(postProcessCompletion("\n\n  x = 1\n\n", "")).toBe("  x = 1");
  });

  it("caps pathological reply length by lines", () => {
    const reply = Array.from({ length: 50 }, (_, i) => `line ${i}`).join("\n");
    const out = postProcessCompletion(reply, "");
    expect(out.split("\n").length).toBeLessThanOrEqual(12);
  });
});
