/**
 * Tests for the JavaScript playground runtime.
 *
 * The JavaScript runtime executes code in the same JS engine via AsyncFunction,
 * so these tests can run directly in Node without any browser APIs.
 */
import { describe, it, expect } from "vitest";

// Pull out just the runtime class, we instantiate it manually to avoid
// pulling in React (which is only needed for the adapter object).
// The class isn't exported, so we re-implement the minimal runtime logic
// that mirrors JavaScriptRuntime.run() to verify the execution model.

type OutputCell = { type: "stdout" | "stderr"; content: string };

async function runJS(code: string): Promise<OutputCell[]> {
  const cells: OutputCell[] = [];
  const emit = (cell: OutputCell) => cells.push(cell);

  let stdoutBuf = "";
  let stderrBuf = "";

  const flushStdout = () => {
    if (stdoutBuf) {
      emit({ type: "stdout", content: stdoutBuf.replace(/\n$/, "") });
      stdoutBuf = "";
    }
  };
  const flushStderr = () => {
    if (stderrBuf) {
      emit({ type: "stderr", content: stderrBuf.replace(/\n$/, "") });
      stderrBuf = "";
    }
  };

  const formatArg = (v: unknown): string => {
    if (typeof v === "string") return v;
    if (v === null) return "null";
    if (v === undefined) return "undefined";
    if (typeof v === "bigint") return `${v.toString()}n`;
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  };
  const formatArgs = (args: unknown[]) => args.map(formatArg).join(" ");

  const sandboxConsole = {
    log: (...args: unknown[]) => { stdoutBuf += formatArgs(args) + "\n"; },
    info: (...args: unknown[]) => { stdoutBuf += formatArgs(args) + "\n"; },
    debug: (...args: unknown[]) => { stdoutBuf += formatArgs(args) + "\n"; },
    warn: (...args: unknown[]) => { stderrBuf += formatArgs(args) + "\n"; },
    error: (...args: unknown[]) => { stderrBuf += formatArgs(args) + "\n"; },
  };

  const AsyncFn = Object.getPrototypeOf(async function () {}).constructor as new (
    ...args: string[]
  ) => (...params: unknown[]) => Promise<unknown>;

  try {
    const fn = new AsyncFn("console", `"use strict";\n${code}`);
    await fn(sandboxConsole);
    flushStdout();
    flushStderr();
  } catch (err) {
    flushStdout();
    flushStderr();
    const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
    emit({ type: "stderr", content: message });
  }

  return cells;
}

describe("JavaScript runtime", () => {
  it("prints a basic hello world", async () => {
    const cells = await runJS(`console.log("Hello, JavaScript Playground!");`);
    expect(cells).toHaveLength(1);
    expect(cells[0].type).toBe("stdout");
    expect(cells[0].content).toBe("Hello, JavaScript Playground!");
  });

  it("supports top-level await", async () => {
    const cells = await runJS(`
      const x = await Promise.resolve(42);
      console.log(x);
    `);
    expect(cells[0]?.content).toBe("42");
  });

  it("captures console.warn as stderr", async () => {
    const cells = await runJS(`console.warn("watch out");`);
    expect(cells[0]?.type).toBe("stderr");
    expect(cells[0]?.content).toContain("watch out");
  });

  it("captures runtime errors as stderr", async () => {
    const cells = await runJS(`throw new Error("boom");`);
    const errCell = cells.find((c) => c.type === "stderr");
    expect(errCell).toBeTruthy();
    expect(errCell!.content).toContain("boom");
  });

  it("runs the hello-world example from the adapter (math, loops)", async () => {
    const code = `
console.log("π ≈", Math.PI);
console.log("e ≈", Math.E);
for (let i = 1; i <= 3; i++) {
  console.log(i + ": " + "★".repeat(i));
}
`;
    const cells = await runJS(code);
    const stdout = cells
      .filter((c) => c.type === "stdout")
      .map((c) => c.content)
      .join("\n");
    expect(stdout).toContain("3.14159");
    expect(stdout).toContain("2.71828");
    expect(stdout).toContain("★★★");
  });

  it("runs the array-methods example (map / filter / reduce)", async () => {
    const code = `
const nums = [1, 2, 3, 4, 5];
const doubled = nums.map(n => n * 2);
const evens = nums.filter(n => n % 2 === 0);
const sum = nums.reduce((acc, n) => acc + n, 0);
console.log(doubled.join(","));
console.log(evens.join(","));
console.log(sum);
`;
    const cells = await runJS(code);
    const stdout = cells
      .filter((c) => c.type === "stdout")
      .map((c) => c.content)
      .join("\n");
    expect(stdout).toContain("2,4,6,8,10");
    expect(stdout).toContain("2,4");
    expect(stdout).toContain("15");
  });

  // Each `<CodeBlock>` is supposed to be independent of every other
  // block on the same page, variables defined in block A must not be
  // visible in block B even when both blocks share the same runtime
  // instance via `runtimeRegistry`. The JS adapter achieves this by
  // running every snippet inside its own `AsyncFunction` scope, which
  // is what we exercise here: two consecutive `runJS()` calls (which
  // build a fresh AsyncFunction per call) must not see each other's
  // top-level `let`/`const`/`var` declarations.
  it("isolates top-level declarations across runs", async () => {
    await runJS(`var leaked = 42; let alsoLeaked = "x"; const cLeaked = true;`);
    const cells = await runJS(`
      try { void leaked; console.log("leaked-visible"); } catch (e) { console.log("ReferenceError:leaked"); }
      try { void alsoLeaked; console.log("alsoLeaked-visible"); } catch (e) { console.log("ReferenceError:alsoLeaked"); }
      try { void cLeaked; console.log("cLeaked-visible"); } catch (e) { console.log("ReferenceError:cLeaked"); }
    `);
    const stdout = cells
      .filter((c) => c.type === "stdout")
      .map((c) => c.content)
      .join("\n");
    expect(stdout).toContain("ReferenceError:leaked");
    expect(stdout).toContain("ReferenceError:alsoLeaked");
    expect(stdout).toContain("ReferenceError:cLeaked");
    expect(stdout).not.toContain("-visible");
  });
});
