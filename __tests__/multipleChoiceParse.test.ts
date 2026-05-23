import { describe, expect, it } from "vitest";
import { parseQuestion } from "../app/_components/multipleChoice/parseQuestion";

describe("parseQuestion", () => {
  it("parses the canonical Tableau example", () => {
    const src = `Which tool is commonly used to create interactive business dashboards and data visualizations?

- Microsoft Word
  > Microsoft Word is primarily used for document creation, not interactive data visualization.
- [o] Tableau
  > Correct! Tableau is widely used for creating interactive dashboards and visual analytics.
- Adobe Photoshop
- Notepad

Data visualization tools such as Tableau help analysts communicate insights
effectively by transforming raw data into interactive charts, dashboards,
and visual stories for decision-making.`;

    const q = parseQuestion(src);
    expect(q.body).toMatch(/Which tool/);
    expect(q.choices).toHaveLength(4);
    expect(q.choices.map((c) => c.text)).toEqual([
      "Microsoft Word",
      "Tableau",
      "Adobe Photoshop",
      "Notepad",
    ]);
    expect(q.choices.map((c) => c.correct)).toEqual([false, true, false, false]);
    expect(q.choices[0].explanation).toMatch(/document creation/);
    expect(q.choices[1].explanation).toMatch(/Correct!/);
    expect(q.choices[2].explanation).toBe("");
    expect(q.multiAnswer).toBe(false);
    expect(q.correctIds).toEqual(["1"]);
    expect(q.explanation).toMatch(/decision-making\.$/);
  });

  it("detects multi-answer mode when 2+ choices are marked correct", () => {
    const src = `Which of the following are valid \`justify-content\` values?

- [o] flex-start
- [o] center
- column
  > \`column\` is a \`flex-direction\` value, not \`justify-content\`.
- [o] space-between
- inline-flex
  > \`inline-flex\` is a \`display\` value.`;

    const q = parseQuestion(src);
    expect(q.multiAnswer).toBe(true);
    expect(q.correctIds).toEqual(["0", "1", "3"]);
    expect(q.explanation).toBe("");
    expect(q.choices[2].explanation).toContain("flex-direction");
  });

  it("preserves math notation in question body and choices", () => {
    const src = `What is $\\frac{d}{dx}[x^2]$?

- $x$
- [o] $2x$
  > Applying the power rule.
- $x^2$
- $2$

The power rule states that $\\frac{d}{dx}[x^n] = nx^{n-1}$.`;

    const q = parseQuestion(src);
    expect(q.body).toContain("$\\frac{d}{dx}[x^2]$");
    expect(q.choices[1].text).toBe("$2x$");
    expect(q.choices[1].correct).toBe(true);
    expect(q.explanation).toContain("nx^{n-1}");
  });

  it("treats `*` and `1.` in the question body as list markers, not choices", () => {
    const src = `Consider the following:

* Item A
* Item B
1. First
2. Second

- option one
- [o] option two`;

    const q = parseQuestion(src);
    expect(q.body).toContain("* Item A");
    expect(q.body).toContain("1. First");
    expect(q.choices).toHaveLength(2);
    expect(q.choices[1].correct).toBe(true);
  });

  it("supports multi-line choice continuations indented 2+ spaces", () => {
    const src = `Pick one.

- A long choice that wraps onto
  multiple lines for readability
- [o] another option`;

    const q = parseQuestion(src);
    expect(q.choices[0].text).toBe(
      "A long choice that wraps onto\nmultiple lines for readability",
    );
    expect(q.choices[1].text).toBe("another option");
  });

  it("handles a question with no overall explanation", () => {
    const src = `Pick one.

- A
- [o] B`;

    const q = parseQuestion(src);
    expect(q.explanation).toBe("");
    expect(q.correctIds).toEqual(["1"]);
  });

  it("handles CRLF line endings", () => {
    const src = "Q?\r\n\r\n- a\r\n- [o] b\r\n";
    const q = parseQuestion(src);
    expect(q.body).toBe("Q?");
    expect(q.choices).toHaveLength(2);
    expect(q.choices[1].correct).toBe(true);
  });
});
