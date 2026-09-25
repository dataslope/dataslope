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
  signatureLine,
} from "../app/_components/completion/docText";

describe("signatureLine", () => {
  it("cuts a definition off at the docstring that follows it", () => {
    const jediDescription =
      'def iloc(self) -> _iLocIndexer: """ Purely integer-location based ' +
      'indexing for selection by position. .. versionchanged:: 3.0 ' +
      "Callables which return a tuple are deprecated as input.";
    expect(signatureLine(jediDescription)).toBe("def iloc(self) -> _iLocIndexer");
  });
});

describe("docBody", () => {
  it("clamps a pathological docstring at a line boundary", () => {
    const doc = `${"a line of documentation\n".repeat(600)}`;
    const body = docBody(doc);
    expect(body.length).toBeLessThanOrEqual(MAX_DOC_CHARS + 2);
    expect(body.endsWith("\n…")).toBe(true);
    // The last kept line is whole.
    const lines = body.split("\n");
    expect(lines[lines.length - 2]).toBe("a line of documentation");
  });
});
