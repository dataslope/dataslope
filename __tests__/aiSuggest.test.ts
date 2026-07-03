/**
 * Ask AI suggested questions: reply parsing (JSON, fenced, or list-shaped)
 * and the prompt builders' output contract.
 */
import { describe, it, expect } from "vitest";
import {
  SUGGEST_LIMITS,
  parseSuggestedQuestions,
  suggestInstruction,
  suggestSystemPrompt,
} from "../lib/ai/suggest";

describe("parseSuggestedQuestions", () => {
  it("parses a plain JSON array", () => {
    const raw = '["Why does my loop never stop?","What does range(3) return?","How do I fix the IndexError?"]';
    expect(parseSuggestedQuestions(raw)).toEqual([
      "Why does my loop never stop?",
      "What does range(3) return?",
      "How do I fix the IndexError?",
    ]);
  });

  it("parses a fenced / prose-wrapped JSON array", () => {
    const raw =
      'Here are the questions:\n```json\n["What is a JOIN?", "Why use a foreign key?", "How do I list all tables?"]\n```';
    expect(parseSuggestedQuestions(raw)).toHaveLength(3);
    expect(parseSuggestedQuestions(raw)[0]).toBe("What is a JOIN?");
  });

  it("falls back to bulleted / numbered lines", () => {
    const raw =
      "- Why does my query return zero rows?\n2) What does GROUP BY do here?\n• How can I test the edge case?";
    expect(parseSuggestedQuestions(raw)).toEqual([
      "Why does my query return zero rows?",
      "What does GROUP BY do here?",
      "How can I test the edge case?",
    ]);
  });

  it("drops junk, dedupes, and caps at the configured count", () => {
    const raw = JSON.stringify([
      "Why?", // too short
      "A".repeat(200), // too long
      "What is recursion?",
      "What is recursion?", // duplicate
      "How does the base case work?",
      "When should I use iteration instead?",
      "One question too many?",
    ]);
    const out = parseSuggestedQuestions(raw);
    expect(out).toEqual([
      "What is recursion?",
      "How does the base case work?",
      "When should I use iteration instead?",
    ]);
    expect(out).toHaveLength(SUGGEST_LIMITS.count);
  });

  it("returns [] for garbage", () => {
    expect(parseSuggestedQuestions("")).toEqual([]);
    expect(parseSuggestedQuestions("I cannot help with that.".slice(0, 7))).toEqual([]);
  });
});

describe("prompt builders", () => {
  it("system prompt pins the JSON-array output contract per surface", () => {
    for (const surface of ["learn", "playground"] as const) {
      const p = suggestSystemPrompt(surface);
      expect(p).toContain("JSON array");
      expect(p).toContain(String(SUGGEST_LIMITS.count));
      expect(p).toContain("DATA");
    }
    expect(suggestSystemPrompt("learn")).toContain("lesson");
    expect(suggestSystemPrompt("playground")).toContain("playground");
  });

  it("instruction differs for fresh vs mid-conversation suggestions", () => {
    expect(suggestInstruction(false)).not.toContain("conversation");
    expect(suggestInstruction(true)).toContain("conversation");
  });
});
