/**
 * Context assembly for "Ask AI": token estimate, head/tail clipping, message
 * packing order, and the lesson-markdown slug guard.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  buildMessages,
  clip,
  estimateTokens,
  fetchLessonMarkdown,
} from "../lib/ai/context";
import type { AskAiClientContext } from "../lib/ai/types";

describe("estimateTokens / clip", () => {
  it("estimates ~chars/4", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("a".repeat(400))).toBe(100);
  });

  it("leaves short text untouched", () => {
    expect(clip("hello", 100)).toBe("hello");
  });

  it("clips long text with an in-band marker and keeps head + tail", () => {
    const text = "H".repeat(1000) + "T".repeat(1000);
    const out = clip(text, 50); // ~200 chars budget
    expect(out).toContain("tokens omitted");
    expect(out.startsWith("H")).toBe(true);
    expect(out.endsWith("T")).toBe(true);
    expect(out.length).toBeLessThan(text.length);
  });
});

describe("buildMessages", () => {
  const base: AskAiClientContext = { surface: "learn" };

  it("always includes a system prompt first and the question last", () => {
    const { messages } = buildMessages({
      surface: "learn",
      question: "Why does this loop run forever?",
      lessonMarkdown: null,
      context: base,
      history: [],
      contextBudget: 8000,
    });
    expect(messages[0].role).toBe("system");
    expect(messages[messages.length - 1]).toEqual({
      role: "user",
      content: "Why does this loop run forever?",
    });
  });

  it("includes lesson markdown, files, and outputs when provided", () => {
    const { messages } = buildMessages({
      surface: "playground",
      question: "fix it",
      lessonMarkdown: "# Loops\nA loop repeats.",
      context: {
        surface: "playground",
        files: [{ filename: "main.py", content: "while True: pass" }],
        outputs: ["KeyboardInterrupt"],
      },
      history: [],
      contextBudget: 8000,
    });
    const blob = messages.map((m) => m.content).join("\n");
    expect(blob).toContain("A loop repeats");
    expect(blob).toContain("main.py");
    expect(blob).toContain("while True");
    expect(blob).toContain("KeyboardInterrupt");
  });

  it("keeps the last question even when the budget is tiny", () => {
    const { messages } = buildMessages({
      surface: "learn",
      question: "help",
      lessonMarkdown: "x".repeat(100000),
      context: base,
      history: [],
      contextBudget: 10,
    });
    expect(messages[messages.length - 1].content).toBe("help");
  });
});

describe("fetchLessonMarkdown", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns null for empty or unsafe slugs without fetching", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    expect(await fetchLessonMarkdown([], "https://x.com")).toBeNull();
    expect(await fetchLessonMarkdown(["..", "etc"], "https://x.com")).toBeNull();
    expect(await fetchLessonMarkdown(["a b"], "https://x.com")).toBeNull();
    // First segment must be an allowlisted docs base (courses/fumadocs-dev).
    expect(
      await fetchLessonMarkdown(["python-basics", "loops"], "https://x.com"),
    ).toBeNull();
    expect(
      await fetchLessonMarkdown(["courses", "a b"], "https://x.com"),
    ).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("fetches the prerendered .md asset for a valid slug", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response("# lesson", { status: 200 }) as unknown as Response,
      );
    const md = await fetchLessonMarkdown(
      ["courses", "python-basics", "loops"],
      "https://dataslope.com/api/ai/chat",
    );
    expect(md).toBe("# lesson");
    expect(spy).toHaveBeenCalledOnce();
    const url = String(spy.mock.calls[0][0]);
    expect(url).toBe("https://dataslope.com/courses/python-basics/loops.md");
  });

  it("returns null on a non-OK response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("nope", { status: 404 }) as unknown as Response,
    );
    expect(
      await fetchLessonMarkdown(["courses", "missing"], "https://x.com"),
    ).toBeNull();
  });
});
