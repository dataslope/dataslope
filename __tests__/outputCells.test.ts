/**
 * How emitted cells accumulate. The rule differs by runtime, and picking the
 * wrong one is silent: it produces plausible output that is subtly not what
 * the program printed, and on a `<ChallengeCard>` these cells are what
 * `stdoutEquals` grades.
 */
import { describe, it, expect } from "vitest";

import { appendOutputCell } from "../app/_components/outputCells";
import type { OutputCell } from "../app/_components/types";

/** Fold a script of emissions the way a run does. */
function run(
  emissions: Array<{
    type: OutputCell["type"];
    content: string;
    seq?: number;
    append?: boolean;
  }>,
): OutputCell[] {
  let id = 0;
  let cells: OutputCell[] = [];
  for (const e of emissions) {
    cells = appendOutputCell(
      cells,
      { type: e.type, content: e.content },
      { seq: e.seq, append: e.append, elapsed: "1ms", nextId: () => ++id },
    );
  }
  return cells;
}

describe("addressing runtimes (c, cpp, java, csharp)", () => {
  it("joins an appended write with nothing", () => {
    // The regression: one printf reaches the WASI shim as two fd_write calls,
    // and a newline invented between them chops the line in half.
    const cells = run([
      { type: "stdout", content: "You are 30", seq: 0 },
      { type: "stdout", content: " years old.\n", seq: 0, append: true },
    ]);
    expect(cells).toHaveLength(1);
    expect(cells[0].content).toBe("You are 30 years old.\n");
  });

  it("starts a new cell when the runtime says it is not appending", () => {
    const cells = run([
      { type: "stdout", content: "first\n", seq: 0 },
      { type: "stdout", content: "second\n", seq: 1 },
    ]);
    expect(cells.map((c) => c.content)).toEqual(["first\n", "second\n"]);
  });

  it("never appends across channels", () => {
    // stdout and stderr interleave in one stream; a stderr write must not be
    // glued onto the stdout cell above it even if the runtime says append.
    const cells = run([
      { type: "stdout", content: "out", seq: 0 },
      { type: "stderr", content: "err", seq: 0, append: true },
    ]);
    expect(cells.map((c) => [c.type, c.content])).toEqual([
      ["stdout", "out"],
      ["stderr", "err"],
    ]);
  });

  it("keeps a correct C answer gradeable", () => {
    // What `stdoutEquals` sees for the invoice card's single printf. Before
    // the fix this read "Item: Widget\n  Qty: 5" and failed its own test.
    const cells = run([
      { type: "stdout", content: "Item: Widget", seq: 0 },
      { type: "stdout", content: "   Qty: 5", seq: 0, append: true },
      { type: "stdout", content: "  Unit: $3.50", seq: 0, append: true },
      { type: "stdout", content: "  Total: $17.50\n", seq: 0, append: true },
    ]);
    const stdout = cells
      .filter((c) => c.type === "stdout")
      .map((c) => c.content)
      .join("\n")
      .trim();
    expect(stdout).toBe("Item: Widget   Qty: 5  Unit: $3.50  Total: $17.50");
  });
});

describe("unaddressed runtimes (python, r, js)", () => {
  it("still separates consecutive stdout with a newline", () => {
    // One cell per `console.log`, and the newline is the line the call
    // implies; without it a loop of logs runs together into one smear.
    const cells = run([
      { type: "stdout", content: "1" },
      { type: "stdout", content: "2" },
      { type: "stdout", content: "3" },
    ]);
    expect(cells).toHaveLength(1);
    expect(cells[0].content).toBe("1\n2\n3");
  });

  it("does not merge across channels", () => {
    const cells = run([
      { type: "stdout", content: "out" },
      { type: "stderr", content: "err" },
      { type: "stdout", content: "out again" },
    ]);
    expect(cells.map((c) => c.content)).toEqual(["out", "err", "out again"]);
  });
});
