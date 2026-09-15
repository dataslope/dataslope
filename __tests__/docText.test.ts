/**
 * Shaping a runtime's hover answer into what the tooltip shows.
 *
 * The case that prompted this: hovering `df.iloc` in the Python playground
 * put pandas' entire `iloc` getter — definition line, 3,300-character
 * docstring and all, with every newline collapsed — into the tooltip's
 * signature line, which then filled the screen. jedi does that whenever a
 * name has no signature to give, and no CSS rescues a string like that, so
 * the text is shaped before it is rendered.
 */
import { describe, expect, it } from "vitest";
import {
  docBody,
  MAX_DOC_CHARS,
  MAX_SIGNATURE_CHARS,
  signatureLine,
} from "../app/_components/completion/docText";

describe("signatureLine", () => {
  it("keeps a real signature as it is", () => {
    expect(signatureLine("read_csv(filepath: str, *, sep: str = ',') -> DataFrame")).toBe(
      "read_csv(filepath: str, *, sep: str = ',') -> DataFrame",
    );
  });

  it("cuts a definition off at the docstring that follows it", () => {
    const jediDescription =
      'def iloc(self) -> _iLocIndexer: """ Purely integer-location based ' +
      'indexing for selection by position. .. versionchanged:: 3.0 ' +
      "Callables which return a tuple are deprecated as input.";
    expect(signatureLine(jediDescription)).toBe("def iloc(self) -> _iLocIndexer");
  });

  it("handles a single-quoted docstring the same way", () => {
    expect(signatureLine("def f(x): ''' does a thing '''")).toBe("def f(x)");
  });

  it("keeps only the first line, collapsing a wrapped signature", () => {
    expect(signatureLine("def f(\n  a: int,\n  b: str,\n) -> None:")).toBe("def f(");
    expect(signatureLine("def  f(a,   b)   -> None")).toBe("def f(a, b) -> None");
  });

  it("drops a trailing definition colon or brace", () => {
    expect(signatureLine("def f(a, b):")).toBe("def f(a, b)");
    expect(signatureLine("function f(a, b) {")).toBe("function f(a, b)");
  });

  it("clamps an absurd signature at a word boundary", () => {
    const long = `def f(${"parameter, ".repeat(80)})`;
    const line = signatureLine(long);
    expect(line.length).toBeLessThanOrEqual(MAX_SIGNATURE_CHARS + 1);
    expect(line.endsWith("…")).toBe(true);
    // Cut between words, not through one.
    expect(line).not.toMatch(/paramet…$/);
  });

  it("has nothing to say about an empty title", () => {
    expect(signatureLine(undefined)).toBe("");
    expect(signatureLine("")).toBe("");
    expect(signatureLine("   \n  ")).toBe("");
  });
});

describe("docBody", () => {
  it("keeps the line structure a docstring depends on", () => {
    const doc =
      "Purely integer-location based indexing.\n\n" +
      "Parameters\n----------\nkey : int\n    The position.\n";
    expect(docBody(doc)).toBe(
      "Purely integer-location based indexing.\n\n" +
        "Parameters\n----------\nkey : int\n    The position.",
    );
  });

  it("keeps indentation but drops trailing whitespace", () => {
    expect(docBody("first   \n    indented   \n")).toBe("first\n    indented");
  });

  it("collapses runs of blank lines to one", () => {
    expect(docBody("a\n\n\n\n\nb")).toBe("a\n\nb");
  });

  it("normalises Windows line endings", () => {
    expect(docBody("a\r\nb\r\n")).toBe("a\nb");
  });

  it("clamps a pathological docstring at a line boundary", () => {
    const doc = `${"a line of documentation\n".repeat(600)}`;
    const body = docBody(doc);
    expect(body.length).toBeLessThanOrEqual(MAX_DOC_CHARS + 2);
    expect(body.endsWith("\n…")).toBe(true);
    // The last kept line is whole.
    const lines = body.split("\n");
    expect(lines[lines.length - 2]).toBe("a line of documentation");
  });

  it("leaves a docstring that fits completely alone", () => {
    const doc = "Short and sweet.";
    expect(docBody(doc)).toBe(doc);
  });

  it("has nothing to say about an empty doc", () => {
    expect(docBody(undefined)).toBe("");
    expect(docBody("\n\n  \n")).toBe("");
  });
});
