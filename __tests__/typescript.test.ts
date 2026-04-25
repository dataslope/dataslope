/**
 * Tests for the TypeScript playground runtime.
 *
 * The TypeScript runtime transpiles code with the TypeScript compiler API
 * (loaded from npm) then executes it via AsyncFunction — both available in
 * Node, so these tests run without any browser APIs.
 */
import { describe, it, expect } from "vitest";
import tsModule from "typescript";

type OutputCell = { type: "stdout" | "stderr"; content: string };

interface TsCompilerModule {
  transpileModule(
    input: string,
    options: {
      compilerOptions: Record<string, unknown>;
      reportDiagnostics?: boolean;
      fileName?: string;
    },
  ): {
    outputText: string;
    diagnostics?: Array<{
      messageText: string | { messageText: string };
      category: number;
    }>;
  };
  ScriptTarget: { ES2022: number };
  ModuleKind: { ESNext: number };
  flattenDiagnosticMessageText(
    diag: string | { messageText: string } | undefined,
    newLine: string,
  ): string;
}

const ts = (tsModule as unknown as { default?: TsCompilerModule } & TsCompilerModule).default ?? tsModule as unknown as TsCompilerModule;

async function runTS(code: string): Promise<OutputCell[]> {
  const cells: OutputCell[] = [];
  const emit = (cell: OutputCell) => cells.push(cell);

  // 1. Transpile
  let outputText: string;
  try {
    const result = ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        isolatedModules: true,
        esModuleInterop: true,
        allowJs: true,
        strict: false,
        removeComments: false,
      },
      reportDiagnostics: true,
      fileName: "playground.ts",
    });

    const errors = (result.diagnostics ?? [])
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"))
      .filter(Boolean);
    if (errors.length > 0) {
      emit({ type: "stderr", content: errors.map((m) => `TS: ${m}`).join("\n") });
    }
    outputText = result.outputText;
  } catch (err) {
    emit({ type: "stderr", content: `TypeScript transpile error: ${err instanceof Error ? err.message : String(err)}` });
    return cells;
  }

  // 2. Execute transpiled JS
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

  const sandboxConsole = {
    log: (...args: unknown[]) => { stdoutBuf += args.map(String).join(" ") + "\n"; },
    info: (...args: unknown[]) => { stdoutBuf += args.map(String).join(" ") + "\n"; },
    debug: (...args: unknown[]) => { stdoutBuf += args.map(String).join(" ") + "\n"; },
    warn: (...args: unknown[]) => { stderrBuf += args.map(String).join(" ") + "\n"; },
    error: (...args: unknown[]) => { stderrBuf += args.map(String).join(" ") + "\n"; },
  };

  const AsyncFn = Object.getPrototypeOf(async function () {}).constructor as new (
    ...args: string[]
  ) => (...params: unknown[]) => Promise<unknown>;

  try {
    const fn = new AsyncFn("console", outputText);
    await fn(sandboxConsole);
    flushStdout();
    flushStderr();
  } catch (err) {
    flushStdout();
    flushStderr();
    emit({ type: "stderr", content: err instanceof Error ? (err.stack ?? err.message) : String(err) });
  }

  return cells;
}

describe("TypeScript runtime", () => {
  it("transpiles and runs a typed hello-world", async () => {
    const code = `
const greet = (name: string): string => \`Hello, \${name}!\`;
console.log(greet("TypeScript Playground"));
`;
    const cells = await runTS(code);
    const stdout = cells.filter((c) => c.type === "stdout").map((c) => c.content).join("\n");
    expect(stdout).toContain("Hello, TypeScript Playground!");
  });

  it("strips type annotations without runtime errors", async () => {
    const code = `
interface Point { x: number; y: number; }
const p: Point = { x: 3, y: 4 };
const dist: number = Math.sqrt(p.x ** 2 + p.y ** 2);
console.log(dist);
`;
    const cells = await runTS(code);
    const stdout = cells.filter((c) => c.type === "stdout").map((c) => c.content).join("\n");
    expect(stdout).toContain("5");
    expect(cells.find((c) => c.type === "stderr" && c.content.includes("error"))).toBeFalsy();
  });

  it("supports generics", async () => {
    const code = `
function first<T>(arr: T[]): T | undefined { return arr[0]; }
console.log(first([10, 20, 30]));
console.log(first(["a", "b"]));
`;
    const cells = await runTS(code);
    const stdout = cells.filter((c) => c.type === "stdout").map((c) => c.content).join("\n");
    expect(stdout).toContain("10");
    expect(stdout).toContain("a");
  });

  it("supports top-level await after transpilation", async () => {
    const code = `
const result: number = await Promise.resolve(99);
console.log(result);
`;
    const cells = await runTS(code);
    const stdout = cells.filter((c) => c.type === "stdout").map((c) => c.content).join("\n");
    expect(stdout).toContain("99");
  });

  it("captures runtime errors as stderr", async () => {
    const code = `throw new Error("ts boom");`;
    const cells = await runTS(code);
    const errCell = cells.find((c) => c.type === "stderr");
    expect(errCell).toBeTruthy();
    expect(errCell!.content).toContain("ts boom");
  });

  it("runs the discriminated-union example from the adapter", async () => {
    const code = `
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.radius ** 2;
    case "rect":   return s.width * s.height;
  }
}

console.log(area({ kind: "circle", radius: 1 }).toFixed(5));
console.log(area({ kind: "rect", width: 3, height: 4 }));
`;
    const cells = await runTS(code);
    const stdout = cells.filter((c) => c.type === "stdout").map((c) => c.content).join("\n");
    expect(stdout).toContain("3.14159");
    expect(stdout).toContain("12");
  });
});
