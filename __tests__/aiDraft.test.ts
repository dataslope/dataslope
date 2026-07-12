/**
 * "Fill with AI" draft parsing: JSON extraction (fenced / prose-wrapped) and
 * per-kind normalization + validation into the bounded shapes the builders
 * apply. Pure module, no network.
 */
import { describe, it, expect } from "vitest";
import {
  extractJsonObject,
  parseDraft,
  draftSystemPrompt,
  isDraftKind,
  type CodeDraft,
  type SqlDraft,
  type McqDraft,
  type QuizDraft,
} from "../lib/ai/draft";

describe("extractJsonObject", () => {
  it("parses a bare object", () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses a ```json fenced object", () => {
    const raw = 'Here you go:\n```json\n{"title":"X"}\n```\nHope that helps!';
    expect(extractJsonObject(raw)).toEqual({ title: "X" });
  });

  it("parses an object with prose around it", () => {
    expect(extractJsonObject('Sure! {"n": 2} done')).toEqual({ n: 2 });
  });

  it("returns null when there is no object", () => {
    expect(extractJsonObject("no json here")).toBeNull();
    expect(extractJsonObject("[1,2,3]")).toBeNull();
  });
});

describe("isDraftKind", () => {
  it("accepts the four kinds and rejects others", () => {
    expect(isDraftKind("code")).toBe(true);
    expect(isDraftKind("quiz")).toBe(true);
    expect(isDraftKind("essay")).toBe(false);
    expect(isDraftKind(3)).toBe(false);
  });
});

describe("parseDraft: code", () => {
  const good = JSON.stringify({
    title: "Group sales by category",
    language: "python",
    instructions: "Build `summary`…",
    files: [
      { filename: "main.py", setup: "sales = []", starter: "summary = {}", solution: "summary = {}" },
    ],
    tests: [{ name: "has entries", mode: "code", code: "assert summary == {}", expectedStdout: "" }],
  });

  it("normalizes a valid draft", () => {
    const d = parseDraft("code", good) as CodeDraft;
    expect(d.kind).toBe("code");
    expect(d.language).toBe("python");
    expect(d.files).toHaveLength(1);
    expect(d.files[0].filename).toBe("main.py");
    expect(d.tests[0].mode).toBe("code");
  });

  it("falls back to python for an unknown language", () => {
    const raw = JSON.stringify({
      title: "X",
      language: "cobol",
      instructions: "",
      files: [{ filename: "a", setup: "", starter: "x", solution: "x" }],
      tests: [],
    });
    expect((parseDraft("code", raw) as CodeDraft).language).toBe("python");
  });

  it("drops tests with no body and returns null when no files", () => {
    const raw = JSON.stringify({ title: "X", language: "python", files: [], tests: [] });
    expect(parseDraft("code", raw)).toBeNull();
  });
});

describe("parseDraft: sql", () => {
  const good = JSON.stringify({
    title: "Top customers",
    dialect: "duckdb",
    instructions: "…",
    setupSql: "CREATE TABLE t(a);",
    starterSql: "SELECT ",
    solutionSql: "SELECT a FROM t;",
    tests: [
      { name: "matches", check: "matchesSolution", value: "" },
      { name: "rows", check: "expectedRowCount", value: "3" },
    ],
  });

  it("normalizes a valid draft", () => {
    const d = parseDraft("sql", good) as SqlDraft;
    expect(d.dialect).toBe("duckdb");
    expect(d.tests).toHaveLength(2);
    expect(d.tests[1].check).toBe("expectedRowCount");
  });

  it("injects a matchesSolution test when none given", () => {
    const raw = JSON.stringify({
      title: "X",
      dialect: "sqlite",
      solutionSql: "SELECT 1;",
      setupSql: "",
      tests: [],
    });
    const d = parseDraft("sql", raw) as SqlDraft;
    expect(d.tests).toHaveLength(1);
    expect(d.tests[0].check).toBe("matchesSolution");
  });

  it("returns null without any SQL", () => {
    const raw = JSON.stringify({ title: "X", dialect: "sqlite", setupSql: "", solutionSql: "" });
    expect(parseDraft("sql", raw)).toBeNull();
  });
});

describe("parseDraft: mcq", () => {
  it("keeps exactly one correct answer", () => {
    const raw = JSON.stringify({
      title: "Q",
      question: "Which?",
      choices: [
        { text: "A", correct: true, explanation: "" },
        { text: "B", correct: true, explanation: "" },
        { text: "C", correct: false, explanation: "" },
      ],
      explanation: "",
    });
    const d = parseDraft("mcq", raw) as McqDraft;
    expect(d.choices.filter((c) => c.correct)).toHaveLength(1);
    expect(d.choices[0].correct).toBe(true);
  });

  it("defaults the first choice correct when none flagged", () => {
    const raw = JSON.stringify({
      title: "Q",
      question: "Which?",
      choices: [
        { text: "A", correct: false, explanation: "" },
        { text: "B", correct: false, explanation: "" },
      ],
    });
    const d = parseDraft("mcq", raw) as McqDraft;
    expect(d.choices[0].correct).toBe(true);
  });

  it("returns null with fewer than two non-empty choices", () => {
    const raw = JSON.stringify({
      title: "Q",
      question: "Which?",
      choices: [{ text: "only", correct: true, explanation: "" }],
    });
    expect(parseDraft("mcq", raw)).toBeNull();
  });
});

describe("parseDraft: quiz", () => {
  it("normalizes title + description", () => {
    const raw = JSON.stringify({ title: "Pandas quiz", description: "Three exercises." });
    const d = parseDraft("quiz", raw) as QuizDraft;
    expect(d.title).toBe("Pandas quiz");
    expect(d.description).toBe("Three exercises.");
  });

  it("returns null when both are empty", () => {
    expect(parseDraft("quiz", JSON.stringify({ title: "", description: "" }))).toBeNull();
  });
});

describe("draftSystemPrompt", () => {
  it("asks for a single JSON object per kind", () => {
    for (const kind of ["code", "sql", "mcq", "quiz"] as const) {
      expect(draftSystemPrompt(kind)).toMatch(/JSON object/i);
    }
  });
});
