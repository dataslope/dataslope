import { describe, expect, it } from "vitest";
import { parseQuestion } from "../app/_components/multipleChoice/parseQuestion";
import {
  mcqDraftFromMarkdown,
  serializeMcqMarkdown,
  type McqDraft,
} from "../lib/custom-content/mcq";
import {
  validateCodeChallengePayload,
  validateItemPayload,
  validateMcqPayload,
  validateSetInput,
  validateSqlChallengePayload,
  normalizeCustomTitle,
} from "../lib/custom-content/schema";
import {
  guestCustomExpiryIso,
  isCustomRowExpired,
  newCustomId,
  isValidCustomId,
} from "../lib/custom-content/policy";

// ---------------------------------------------------------------------------
// MCQ serializer ↔ parseQuestion round trip
// ---------------------------------------------------------------------------

describe("serializeMcqMarkdown", () => {
  const draft: McqDraft = {
    question: "Which tool is commonly used for dashboards?",
    choices: [
      { text: "Microsoft Word", correct: false, explanation: "Word is for documents." },
      { text: "Tableau", correct: true, explanation: "Tableau is built for dashboards." },
      { text: "Notepad", correct: false, explanation: "" },
    ],
    explanation: "Visualization tools turn raw data into charts.",
  };

  it("round-trips through parseQuestion", () => {
    const md = serializeMcqMarkdown(draft);
    const parsed = parseQuestion(md);
    expect(parsed.body.trim()).toBe(draft.question);
    expect(parsed.choices.map((c) => c.text)).toEqual([
      "Microsoft Word",
      "Tableau",
      "Notepad",
    ]);
    expect(parsed.choices.map((c) => c.correct)).toEqual([false, true, false]);
    expect(parsed.choices[0].explanation).toBe("Word is for documents.");
    expect(parsed.choices[1].explanation).toBe("Tableau is built for dashboards.");
    expect(parsed.choices[2].explanation).toBe("");
    expect(parsed.explanation.trim()).toBe(draft.explanation);
  });

  it("round-trips multi-line choices and code fences", () => {
    const fancy: McqDraft = {
      question: "What does this print?\n\n```python\nprint(1 + 1)\n```",
      choices: [
        { text: "```python\n2\n```", correct: true, explanation: "1 + 1 is 2." },
        { text: "An error,\nbecause + is undefined", correct: false, explanation: "" },
      ],
      explanation: "",
    };
    const parsed = parseQuestion(serializeMcqMarkdown(fancy));
    expect(parsed.choices).toHaveLength(2);
    expect(parsed.choices[0].correct).toBe(true);
    expect(parsed.choices[0].text).toContain("```python");
    expect(parsed.choices[1].text).toContain("because + is undefined");
    expect(parsed.body).toContain("print(1 + 1)");
  });

  it("mcqDraftFromMarkdown inverts the serializer", () => {
    const md = serializeMcqMarkdown(draft);
    const back = mcqDraftFromMarkdown(md);
    expect(back.question).toBe(draft.question);
    expect(back.choices.map((c) => c.text)).toEqual(
      draft.choices.map((c) => c.text),
    );
    expect(back.choices.map((c) => c.correct)).toEqual(
      draft.choices.map((c) => c.correct),
    );
    expect(back.explanation).toBe(draft.explanation);
  });
});

// ---------------------------------------------------------------------------
// MCQ payload validation
// ---------------------------------------------------------------------------

describe("validateMcqPayload", () => {
  const good = serializeMcqMarkdown({
    question: "Pick one.",
    choices: [
      { text: "A", correct: true, explanation: "" },
      { text: "B", correct: false, explanation: "" },
    ],
    explanation: "",
  });

  it("accepts serializer output", () => {
    const res = validateMcqPayload({ markdown: good });
    expect(res.ok).toBe(true);
  });

  it("rejects a question with no correct choice", () => {
    const res = validateMcqPayload({ markdown: "Q?\n\n- A\n- B" });
    expect(res.ok).toBe(false);
  });

  it("rejects a question with fewer than two choices", () => {
    const res = validateMcqPayload({ markdown: "Q?\n\n- [o] A" });
    expect(res.ok).toBe(false);
  });

  it("rejects a missing body", () => {
    const res = validateMcqPayload({ markdown: "- [o] A\n- B" });
    expect(res.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Code challenge payload validation
// ---------------------------------------------------------------------------

const codePayload = {
  adapter: "python",
  instructions: "Compute `total`.",
  files: [
    {
      filename: "main.py",
      initCode: "values = [1, 2, 3]",
      starterCode: "total = None",
      solutionCode: "total = sum(values)",
    },
  ],
  tests: [{ id: "t1", name: "total is 6", code: "assert total == 6" }],
};

describe("validateCodeChallengePayload", () => {
  it("accepts a minimal python challenge and normalizes the shape", () => {
    const res = validateCodeChallengePayload(codePayload);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.payload.kind).toBe("code");
      expect(res.payload.files[0].filename).toBe("main.py");
      expect(res.payload.tests[0]).toEqual({
        id: "t1",
        name: "total is 6",
        code: "assert total == 6",
      });
    }
  });

  it("drops unknown keys instead of storing them", () => {
    const res = validateCodeChallengePayload({
      ...codePayload,
      sneaky: "<script>",
      files: [{ ...codePayload.files[0], onClick: "alert(1)" }],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect("sneaky" in res.payload).toBe(false);
      expect("onClick" in res.payload.files[0]).toBe(false);
    }
  });

  it("rejects unknown adapters", () => {
    const res = validateCodeChallengePayload({ ...codePayload, adapter: "cobol" });
    expect(res.ok).toBe(false);
  });

  it("rejects native code tests on compiled adapters", () => {
    const res = validateCodeChallengePayload({ ...codePayload, adapter: "java" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/stdout/);
  });

  it("accepts stdout tests on compiled adapters", () => {
    const res = validateCodeChallengePayload({
      ...codePayload,
      adapter: "java",
      files: [
        {
          filename: "Main.java",
          starterCode: "",
          solutionCode: "class Main { public static void main(String[] a) { System.out.println(6); } }",
        },
      ],
      tests: [{ id: "t1", name: "prints 6", expect: { stdoutContains: "6" } }],
    });
    expect(res.ok).toBe(true);
  });

  it("rejects a challenge whose entry file has no solution", () => {
    const res = validateCodeChallengePayload({
      ...codePayload,
      files: [{ filename: "main.py", starterCode: "total = None" }],
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/solution/i);
  });

  it("rejects a test carrying both code and expect", () => {
    const res = validateCodeChallengePayload({
      ...codePayload,
      tests: [
        { id: "t1", name: "x", code: "assert True", expect: { noStderr: true } },
      ],
    });
    expect(res.ok).toBe(false);
  });

  it("rejects an invalid stdoutMatches regex at save time", () => {
    const res = validateCodeChallengePayload({
      ...codePayload,
      tests: [{ id: "t1", name: "x", expect: { stdoutMatches: "(" } }],
    });
    expect(res.ok).toBe(false);
  });

  it("rejects path separators in filenames", () => {
    const res = validateCodeChallengePayload({
      ...codePayload,
      files: [{ filename: "../evil.py", starterCode: "" }],
    });
    expect(res.ok).toBe(false);
  });

  it("rejects duplicate test ids", () => {
    const res = validateCodeChallengePayload({
      ...codePayload,
      tests: [
        { id: "t1", name: "a", code: "assert True" },
        { id: "t1", name: "b", code: "assert True" },
      ],
    });
    expect(res.ok).toBe(false);
  });

  it("requires entryFilename to match a file", () => {
    const res = validateCodeChallengePayload({
      ...codePayload,
      entryFilename: "other.py",
    });
    expect(res.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SQL challenge payload validation
// ---------------------------------------------------------------------------

const sqlPayload = {
  dialect: "sqlite",
  instructions: "Select all rows.",
  initSql: "CREATE TABLE t (x INT); INSERT INTO t VALUES (1), (2);",
  starterCode: "SELECT ",
  solutionSql: "SELECT * FROM t;",
  tests: [{ id: "t1", name: "matches", matchesSolution: true }],
};

describe("validateSqlChallengePayload", () => {
  it("accepts a minimal sqlite challenge", () => {
    const res = validateSqlChallengePayload(sqlPayload);
    expect(res.ok).toBe(true);
  });

  it("rejects a challenge without a solution SQL", () => {
    const res = validateSqlChallengePayload({
      ...sqlPayload,
      solutionSql: undefined,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/solution/i);
  });

  it("rejects unknown dialects", () => {
    const res = validateSqlChallengePayload({ ...sqlPayload, dialect: "oracle" });
    expect(res.ok).toBe(false);
  });

  it("rejects a test with no assertion", () => {
    const res = validateSqlChallengePayload({
      ...sqlPayload,
      tests: [{ id: "t1", name: "empty" }],
    });
    expect(res.ok).toBe(false);
  });

  it("rejects runAfterSql without a follow-up check", () => {
    const res = validateSqlChallengePayload({
      ...sqlPayload,
      tests: [{ id: "t1", name: "x", runAfterSql: "SELECT COUNT(*) FROM t;" }],
    });
    expect(res.ok).toBe(false);
  });

  it("accepts runAfterSql with runAfterEquals", () => {
    const res = validateSqlChallengePayload({
      ...sqlPayload,
      tests: [
        {
          id: "t1",
          name: "two rows survive",
          runAfterSql: "SELECT COUNT(*) FROM t;",
          runAfterEquals: 2,
        },
      ],
    });
    expect(res.ok).toBe(true);
  });

  it("rejects negative row counts", () => {
    const res = validateSqlChallengePayload({
      ...sqlPayload,
      tests: [{ id: "t1", name: "x", expectedRowCount: -1 }],
    });
    expect(res.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateItemPayload dispatch + set input
// ---------------------------------------------------------------------------

describe("validateItemPayload", () => {
  it("dispatches by kind", () => {
    expect(validateItemPayload("code", codePayload).ok).toBe(true);
    expect(validateItemPayload("sql", sqlPayload).ok).toBe(true);
    expect(validateItemPayload("mcq", codePayload).ok).toBe(false);
  });
});

describe("validateSetInput", () => {
  const idA = newCustomId();
  const idB = newCustomId();

  it("accepts a valid set and dedupes ids", () => {
    const res = validateSetInput({
      title: "  My quiz  ",
      description: "desc",
      itemIds: [idA, idB, idA],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.payload.title).toBe("My quiz");
      expect(res.payload.itemIds).toEqual([idA, idB]);
    }
  });

  it("rejects malformed ids", () => {
    const res = validateSetInput({ title: "x", itemIds: ["not-a-slug"] });
    expect(res.ok).toBe(false);
  });

  it("rejects an empty title or empty item list", () => {
    expect(validateSetInput({ title: "", itemIds: [idA] }).ok).toBe(false);
    expect(validateSetInput({ title: "x", itemIds: [] }).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Policy helpers
// ---------------------------------------------------------------------------

describe("custom-content policy", () => {
  it("mints valid 16-char slugs", () => {
    const id = newCustomId();
    expect(isValidCustomId(id)).toBe(true);
    expect(id).toHaveLength(16);
  });

  it("expires guest rows exactly at their expiry timestamp", () => {
    const now = Date.UTC(2026, 0, 1);
    const expiry = guestCustomExpiryIso(now);
    expect(isCustomRowExpired(expiry, now)).toBe(false);
    expect(isCustomRowExpired(expiry, now + 31 * 24 * 60 * 60 * 1000)).toBe(true);
    expect(isCustomRowExpired(null, now)).toBe(false);
  });

  it("normalizes titles", () => {
    expect(normalizeCustomTitle("  hi  ", "fallback")).toBe("hi");
    expect(normalizeCustomTitle("", "fallback")).toBe("fallback");
    expect(normalizeCustomTitle(42, "fallback")).toBe("fallback");
    expect(normalizeCustomTitle("x".repeat(300), "f")).toHaveLength(120);
  });
});
