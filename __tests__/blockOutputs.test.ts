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
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect } from "vitest";

import { blockOutputKey } from "../lib/blockOutputKey";
import { toOutputCells } from "../app/_components/runtime/pythonDisplayOutputs";
import { BROWSER_ADAPTERS, TEXT_ADAPTERS } from "../scripts/lib/block-runners.mjs";

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

/**
 * Who owns which entry in the shared manifest.
 *
 * Two generators write `lib/generated/block-outputs.json`:
 * `build-block-outputs.mjs` records python and `TEXT_ADAPTERS` headlessly,
 * `capture-browser-outputs.mjs` records `BROWSER_ADAPTERS` from a real page.
 * A full headless run starts from an empty object and carries the captured
 * entries across by name, so an adapter missing from both lists is one whose
 * output the next run deletes and no workflow ever restores — which is
 * exactly what happened to r, java, csharp and php, for 689 blocks.
 *
 * Nothing about that failure is visible: the manifest is one line of JSON,
 * the capture is manual, and the site treats a missing entry as "no entry"
 * rather than an error. So the invariant is asserted here instead.
 */
describe("block-output adapter ownership", () => {
  /** The registry `<CodeBlock adapter="…">` resolves against. Read as source
   *  rather than imported: the adapter modules pull in React and the wasm
   *  workers, and this test only needs the ids. */
  const registeredAdapters = (() => {
    const src = readFileSync(
      join(__dirname, "..", "app", "_components", "runtime", "adapters.ts"),
      "utf8",
    );
    const body = src.match(/export const ADAPTERS[^{]*\{([\s\S]*?)\n\};/)?.[1];
    if (!body) throw new Error("could not find the ADAPTERS record in adapters.ts");
    return [...body.matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1]);
  })();

  it("finds the registry", () => {
    // A regex that silently matched nothing would make every assertion below
    // vacuously true, which is the one way this test could lie.
    expect(registeredAdapters.length).toBeGreaterThan(5);
    expect(registeredAdapters).toContain("python");
  });

  it("assigns every registered adapter to exactly one generator", () => {
    const owned = ["python", ...TEXT_ADAPTERS, ...BROWSER_ADAPTERS];
    const unowned = registeredAdapters.filter((id) => !owned.includes(id));
    expect(
      unowned,
      "a new adapter must be added to TEXT_ADAPTERS (if it runs under Node) " +
        "or BROWSER_ADAPTERS (if it does not), or a full run of " +
        "build-block-outputs.mjs will delete its prepopulated output",
    ).toEqual([]);
  });

  it("does not claim an adapter for both", () => {
    // An overlap is the mirror failure: the headless generator would treat a
    // captured entry as its own, fail to reproduce it, and record nothing.
    const both = TEXT_ADAPTERS.filter((id: string) => BROWSER_ADAPTERS.includes(id));
    expect(both).toEqual([]);
    expect(TEXT_ADAPTERS).not.toContain("python");
    expect(BROWSER_ADAPTERS).not.toContain("python");
  });

  it("claims no adapter the registry does not have", () => {
    // A stale name is a quieter bug: it carries nothing, so the list keeps
    // looking complete while the adapter it was meant to cover is gone.
    const unknown = [...TEXT_ADAPTERS, ...BROWSER_ADAPTERS].filter(
      (id: string) => !registeredAdapters.includes(id),
    );
    expect(unknown).toEqual([]);
  });
});
