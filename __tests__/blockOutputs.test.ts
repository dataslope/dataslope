/**
 * Prepopulated code-block output: the key both sides agree on, and the
 * conversion both producers go through.
 *
 * These two are the seams where a silent mismatch would be worst. A key that
 * drifts between `scripts/build-block-outputs.mjs` and `<CodeBlock>` shows
 * nothing (harmless but useless); a conversion that drifts between the build
 * generator and `pyodide-worker.ts` shows the *wrong* thing, which is the
 * failure this whole feature must not have.
 */
import { describe, it, expect } from "vitest";

import { blockOutputKey } from "../lib/blockOutputKey";
import { toOutputCells } from "../app/_components/runtime/pythonDisplayOutputs";

describe("blockOutputKey", () => {
  it("is stable for the same block", () => {
    expect(blockOutputKey("python", "import x", "print(1)")).toBe(
      blockOutputKey("python", "import x", "print(1)"),
    );
  });

  it("changes when the visible code changes", () => {
    expect(blockOutputKey("python", "import x", "print(1)")).not.toBe(
      blockOutputKey("python", "import x", "print(2)"),
    );
  });

  it("changes when the hidden setup changes", () => {
    // The reason both halves are in the fingerprint: identical starter code
    // prints something different when the data above it differs.
    expect(blockOutputKey("python", "df = a", "print(df)")).not.toBe(
      blockOutputKey("python", "df = b", "print(df)"),
    );
  });

  it("changes when the runtime changes", () => {
    expect(blockOutputKey("python", undefined, "1 + 1")).not.toBe(
      blockOutputKey("javascript", undefined, "1 + 1"),
    );
  });

  it("treats a missing init and an empty init as the same block", () => {
    expect(blockOutputKey("python", undefined, "x")).toBe(
      blockOutputKey("python", "", "x"),
    );
  });

  it("does not collide across a field boundary", () => {
    // A space separator would make these two equal: "a b" + " " + "c" is the
    // same string as "a" + " " + "b c". Hence the NUL.
    expect(blockOutputKey("python", "a b", "c")).not.toBe(
      blockOutputKey("python", "a", "b c"),
    );
    expect(blockOutputKey("python", "ab", "c")).not.toBe(
      blockOutputKey("python", "a", "bc"),
    );
  });
});

describe("toOutputCells", () => {
  it("maps every wire type to its cell", () => {
    const cells = toOutputCells([
      { type: "stdout", text: "hello\n" },
      { type: "dataframe", html: "<table></table>" },
      { type: "html", html: "<b>hi</b>" },
      { type: "image", data: "AAAA" },
      { type: "stderr", text: "boom\n" },
    ]);
    expect(cells).toEqual([
      { type: "stdout", content: "hello" },
      { type: "html", content: "<table></table>" },
      { type: "html", content: "<b>hi</b>" },
      { type: "image", content: "AAAA" },
      { type: "stderr", content: "boom" },
    ]);
  });

  it("parses a plot into a figure and keeps its frames", () => {
    const json = JSON.stringify({ data: [{ x: [1] }], layout: {}, frames: [{}] });
    const [cell] = toOutputCells([{ type: "plot", json }]);
    expect(cell.type).toBe("plot");
    expect(cell.plot?.data).toHaveLength(1);
    // Without the frames an animated figure renders a play button that does
    // nothing, so they have to survive the round trip.
    expect(cell.plot?.frames).toHaveLength(1);
  });

  it("skips a malformed figure rather than rendering a broken chart", () => {
    expect(toOutputCells([{ type: "plot", json: "{not json" }])).toEqual([]);
  });

  it("drops whitespace-only text segments", () => {
    expect(toOutputCells([{ type: "stdout", text: "\n\n" }])).toEqual([]);
  });

  it("returns nothing for a non-array", () => {
    expect(toOutputCells(null)).toEqual([]);
    expect(toOutputCells(undefined)).toEqual([]);
  });
});
