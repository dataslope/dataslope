/**
 * Ask AI widget snapshot formatters: the plain-text blocks each widget kind
 * packs for the model, plus the SQL schema summary.
 */
import { describe, it, expect } from "vitest";
import {
  describeChallenge,
  describeCodeBlock,
  describeMcq,
  describeSqlSurface,
} from "../app/_components/ai/widgetSnapshots";
import { formatSqlSchemaText } from "../app/_components/ai/sqlSchemaText";

describe("describeChallenge", () => {
  it("packs instructions, code, output, and test results", () => {
    const out = describeChallenge({
      instructions: "Print the numbers 1..3.",
      files: [
        { filename: "main.py", code: "print(1)", initCode: "import sys" },
      ],
      outputs: ["1"],
      tests: [
        { name: "prints 1", state: "pass" },
        { name: "prints 2", state: "fail", detail: "expected 2, got nothing" },
      ],
      banner: "fail",
    });
    expect(out).toContain("Print the numbers 1..3.");
    expect(out).toContain("Read-only setup code for `main.py`");
    expect(out).toContain("print(1)");
    expect(out).toContain("Latest output:");
    expect(out).toContain("1/2 tests passed");
    expect(out).toContain("[fail] prints 2 — expected 2, got nothing");
  });

  it("notes when Check Answer hasn't run", () => {
    const out = describeChallenge({
      files: [{ filename: "main.py", code: "x = 1" }],
      tests: [{ name: "t", state: "pending" }],
      banner: null,
    });
    expect(out).toContain('has not run "Check Answer"');
  });
});

describe("describeCodeBlock", () => {
  it("packs each file and skips empty output", () => {
    const out = describeCodeBlock({
      files: [
        { filename: "a.js", code: "let a = 1" },
        { filename: "b.js", code: "let b = 2" },
      ],
      outputs: [],
    });
    expect(out).toContain("`a.js`");
    expect(out).toContain("let b = 2");
    expect(out).not.toContain("Latest output");
  });
});

describe("describeMcq", () => {
  it("marks the correct choice and the user's pick after submit", () => {
    const out = describeMcq({
      body: "What is 2+2?",
      choices: [
        { text: "3", correct: false, selected: true },
        { text: "4", correct: true, selected: false },
      ],
      submitted: true,
      explanation: "Basic arithmetic.",
    });
    expect(out).toContain("1. 3 [selected by the user]");
    expect(out).toContain("2. 4 [correct answer]");
    expect(out).toContain("answered incorrectly");
    expect(out).toContain("Basic arithmetic.");
  });

  it("asks for a nudge before the user answers", () => {
    const out = describeMcq({
      body: "Pick one",
      choices: [{ text: "a", correct: true, selected: false }],
      submitted: false,
      explanation: "hidden until submit",
    });
    expect(out).toContain("nudge, don't reveal");
    expect(out).not.toContain("hidden until submit");
  });
});

describe("describeSqlSurface", () => {
  it("prefers the error over the result summary", () => {
    const out = describeSqlSurface({
      dialect: "sqlite",
      sqlLabel: 'tab "Query 1"',
      sql: "SELEC * FROM t",
      error: 'near "SELEC": syntax error',
      resultSummary: "3 row(s)",
    });
    expect(out).toContain("SQL dialect: sqlite");
    expect(out).toContain('tab "Query 1"');
    expect(out).toContain("syntax error");
    expect(out).not.toContain("3 row(s)");
  });
});

describe("formatSqlSchemaText", () => {
  it("renders tables, views, types, and foreign keys on one line each", () => {
    const text = formatSqlSchemaText({
      entities: [
        {
          name: "users",
          kind: "table",
          columns: [
            { name: "id", type: "INTEGER" },
            { name: "team_id", type: "INTEGER" },
          ],
          foreignKeys: [
            { column: "team_id", refEntity: "teams", refColumn: "id" },
          ],
        },
        {
          name: "v_active",
          kind: "view",
          columns: [{ name: "name" }],
        },
      ],
    });
    expect(text).toContain(
      "Table users (id INTEGER, team_id INTEGER -> teams.id)",
    );
    expect(text).toContain("View v_active (name)");
  });

  it("returns undefined for an empty or missing schema", () => {
    expect(formatSqlSchemaText(null)).toBeUndefined();
    expect(formatSqlSchemaText({ entities: [] })).toBeUndefined();
  });
});
