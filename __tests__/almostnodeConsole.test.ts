/**
 * The console the JS/TS playgrounds hand to user code. `console.table`,
 * `group`, `count`, `time` and `assert` used to be bound to the worker's own
 * console and produced nothing in the output pane; these assert they land in
 * the sink, and that the table matches the one Node draws.
 */
import { Console } from "node:console";
import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";

import {
  createPlaygroundConsole,
  formatDuration,
  formatTable,
  type ConsoleSink,
} from "../app/_components/runtime/almostnodeConsole";

/** Node's own `console.table`, drawn into a stream we can read back. */
function nodeTable(data: unknown, columns?: string[]): string {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(String(chunk));
      callback();
    },
  });
  new Console({ stdout: stream }).table(data, columns);
  return chunks.join("").replace(/\n$/, "");
}

function makeConsole() {
  const written: Array<[string, string]> = [];
  const sink: ConsoleSink = {
    write: (channel, text) => written.push([channel, text]),
  };
  const playground = createPlaygroundConsole({ sink: () => sink });
  return {
    console: playground.console,
    /** The console installed as the worker's global: streaming methods are
     *  inert there, because they arrive through `onConsole` instead. */
    global: playground.global,
    onConsole: playground.onConsole,
    stdout: () => written.filter(([c]) => c === "stdout").map(([, t]) => t).join(""),
    stderr: () => written.filter(([c]) => c === "stderr").map(([, t]) => t).join(""),
    all: () => written.map(([, t]) => t).join(""),
  };
}

describe("formatTable", () => {
  const CASES: Array<[string, unknown, string[] | undefined]> = [
    ["array of objects", [{ a: 1, b: 2 }, { a: 3, b: 4 }], undefined],
    ["ragged rows", [{ a: 1 }, { b: "two" }], undefined],
    ["primitives", ["x", "y", 3], undefined],
    ["object of objects", { first: { n: 1 }, second: { n: 2 } }, undefined],
    ["objects mixed with primitives", [{ a: 1 }, "plain"], undefined],
    ["nested arrays", [[1, 2], [3, 4]], undefined],
    ["selected columns", [{ a: 1, b: 2, c: 3 }], ["a", "c"]],
  ];

  for (const [label, data, columns] of CASES) {
    it(`draws ${label} the way Node does`, () => {
      expect(formatTable(data, columns)).toBe(nodeTable(data, columns));
    });
  }

  it("falls back to normal formatting for a primitive", () => {
    expect(formatTable(42)).toBe("42");
  });
});

describe("playground console", () => {
  it("routes log/info/debug to stdout and warn/error to stderr", () => {
    const c = makeConsole();
    c.console.log("a");
    c.console.info("b");
    c.console.debug("c");
    c.console.warn("d");
    c.console.error("e");
    expect(c.stdout()).toBe("a\nb\nc\n");
    expect(c.stderr()).toBe("d\ne\n");
  });

  it("indents inside a group and prints the group label", () => {
    const c = makeConsole();
    c.console.group("LABEL");
    c.console.log("inside");
    c.console.group();
    c.console.log("deeper");
    c.console.groupEnd();
    c.console.groupEnd();
    c.console.log("outside");
    expect(c.stdout()).toBe("LABEL\n  inside\n    deeper\noutside\n");
  });

  it("counts labels", () => {
    const c = makeConsole();
    c.console.count("hits");
    c.console.count("hits");
    c.console.count();
    c.console.countReset("hits");
    c.console.count("hits");
    expect(c.stdout()).toBe("hits: 1\nhits: 2\ndefault: 1\nhits: 1\n");
  });

  it("times labels and warns about unknown ones", () => {
    const c = makeConsole();
    c.console.time("work");
    c.console.timeEnd("work");
    c.console.timeEnd("work");
    expect(c.stdout()).toMatch(/^work: \d+\.\d{3}(ms|s)\n$/);
    expect(c.stderr()).toContain("No such label 'work'");
  });

  it("reports a failed assertion on the error channel", () => {
    const c = makeConsole();
    c.console.assert(true, "not shown");
    c.console.assert(false, "8 console.assert failed");
    c.console.assert(0);
    expect(c.stdout()).toBe("");
    expect(c.stderr()).toBe("Assertion failed: 8 console.assert failed\nAssertion failed\n");
  });

  it("prints a table", () => {
    const c = makeConsole();
    c.console.table([{ a: 1, b: 2 }]);
    expect(c.stdout()).toContain("│ (index) │ a │ b │");
  });

  it("prints a trace with frames", () => {
    const c = makeConsole();
    c.console.trace("here");
    expect(c.stderr()).toContain("Trace: here");
    expect(c.stderr().split("\n").length).toBeGreaterThan(2);
  });

  it("has dirxml, which used to be undefined", () => {
    const c = makeConsole();
    expect(typeof c.console.dirxml).toBe("function");
    c.console.dirxml("x");
    expect(c.stdout()).toBe("x\n");
  });

  it("inspects with console.dir at the requested depth", () => {
    const c = makeConsole();
    c.console.dir({ deep: { nested: { deeper: 1 } } });
    expect(c.stdout()).toBe("{ deep: { nested: { deeper: 1 } } }\n");
    c.console.dir({ a: { b: { c: 1 } } }, { depth: 0 });
    expect(c.stdout()).toContain("{ a: [Object] }");
  });

  it("drops output when no run is in flight", () => {
    const playground = createPlaygroundConsole({ sink: () => null });
    expect(() => playground.console.log("nobody listening")).not.toThrow();
  });

  // almostnode logs its own diagnostics through `console.log`; only user
  // code reaches the runtime's `onConsole` hook.
  it("keeps the runtime's own logging out of the output pane", () => {
    const c = makeConsole();
    c.global.log("[process] cwd() called");
    c.global.warn("[runtime] intercepted something");
    expect(c.all()).toBe("");
    c.global.table([{ a: 1 }]);
    expect(c.stdout()).toContain("(index)");
  });

  it("hands the console back to the host between runs", () => {
    const seen: string[] = [];
    const playground = createPlaygroundConsole({
      // No run in flight.
      sink: () => null,
      hostConsole: { log: (...args) => seen.push(args.join(" ")) },
    });
    playground.global.log("host logging still works");
    expect(seen).toEqual(["host logging still works"]);
  });

  it("routes user-code console calls through onConsole", () => {
    const c = makeConsole();
    c.onConsole("log", ["from user code"]);
    c.onConsole("error", ["and an error"]);
    expect(c.stdout()).toBe("from user code\n");
    expect(c.stderr()).toBe("and an error\n");
  });
});

describe("formatDuration", () => {
  it("matches Node's units", () => {
    expect(formatDuration(1.2345)).toBe("1.234ms");
    expect(formatDuration(1500)).toBe("1.500s");
    expect(formatDuration(62_000)).toBe("1:02.000 (m:ss.mmm)");
  });
});
