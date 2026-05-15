/// <reference lib="webworker" />

// Web Worker that transpiles TypeScript → JavaScript (via the official
// TypeScript compiler) then executes the result via AsyncFunction — keeping
// both the compilation and the execution off the main thread so the UI
// stays responsive.
//
// Protocol (mirrors javascript-worker.ts)
//   Main → Worker  { kind: "run"; id: number; code: string }  (code is TS source)
//   Worker → Main  { kind: "loading"; message: string }       (while loading ts pkg)
//                  { kind: "ready" }
//                  { kind: "stdout"; id: number; content: string }
//                  { kind: "stderr"; id: number; content: string }
//                  { kind: "done";   id: number }

import * as ts from "typescript";

declare const self: DedicatedWorkerGlobalScope;

type InMessage = { kind: "run"; id: number; code: string };

type OutMessage =
  | { kind: "loading"; message: string }
  | { kind: "ready" }
  | { kind: "stdout"; id: number; content: string }
  | { kind: "stderr"; id: number; content: string }
  | { kind: "done"; id: number };

function post(msg: OutMessage) {
  self.postMessage(msg);
}

function formatArg(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "function") return value.toString();
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, jsonReplacer, 2);
    } catch {
      try {
        return String(value);
      } catch {
        return "[object]";
      }
    }
  }
  if (typeof value === "bigint") return `${value.toString()}n`;
  return String(value);
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return `${value.toString()}n`;
  if (typeof value === "function")
    return `[Function: ${value.name || "anonymous"}]`;
  if (typeof value === "undefined") return "undefined";
  return value;
}

function formatArgs(args: unknown[]): string {
  return args.map(formatArg).join(" ");
}

async function runCode(id: number, tsSource: string): Promise<void> {
  // Step 1: Transpile TS → JS (syntactic-only, same settings as before).
  let outputText: string;
  try {
    const result = ts.transpileModule(tsSource, {
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
      post({
        kind: "stderr",
        id,
        content: errors.map((m) => `TS: ${m}`).join("\n"),
      });
    }
    outputText = result.outputText;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    post({
      kind: "stderr",
      id,
      content: `TypeScript transpile error: ${message}`,
    });
    post({ kind: "done", id });
    return;
  }

  // Step 2: Execute transpiled JS via AsyncFunction.
  let stdoutBuf = "";
  let stderrBuf = "";

  const sandboxConsole = {
    log: (...args: unknown[]) => {
      stdoutBuf += formatArgs(args) + "\n";
    },
    info: (...args: unknown[]) => {
      stdoutBuf += formatArgs(args) + "\n";
    },
    debug: (...args: unknown[]) => {
      stdoutBuf += formatArgs(args) + "\n";
    },
    warn: (...args: unknown[]) => {
      stderrBuf += formatArgs(args) + "\n";
    },
    error: (...args: unknown[]) => {
      stderrBuf += formatArgs(args) + "\n";
    },
    table: (value: unknown) => {
      stdoutBuf += formatArg(value) + "\n";
    },
    dir: (value: unknown) => {
      stdoutBuf += formatArg(value) + "\n";
    },
  };

  const AsyncFunction = Object.getPrototypeOf(
    async function () {},
  ).constructor as new (...args: string[]) => (
    console: typeof sandboxConsole,
  ) => Promise<unknown>;

  try {
    const fn = new AsyncFunction("console", `"use strict";\n${outputText}`);
    const result = await fn(sandboxConsole);
    if (stdoutBuf)
      post({ kind: "stdout", id, content: stdoutBuf.replace(/\n$/, "") });
    if (stderrBuf)
      post({ kind: "stderr", id, content: stderrBuf.replace(/\n$/, "") });
    if (result !== undefined) {
      post({ kind: "stdout", id, content: formatArg(result) });
    }
  } catch (err) {
    if (stdoutBuf)
      post({ kind: "stdout", id, content: stdoutBuf.replace(/\n$/, "") });
    if (stderrBuf)
      post({ kind: "stderr", id, content: stderrBuf.replace(/\n$/, "") });
    const message =
      err instanceof Error
        ? err.stack || `${err.name}: ${err.message}`
        : String(err);
    post({ kind: "stderr", id, content: message });
  }
  post({ kind: "done", id });
}

// Serialise concurrent run requests.
let workQueue: Promise<unknown> = Promise.resolve();
function enqueue(task: () => Promise<void>): void {
  workQueue = workQueue.then(task, task).catch(() => {});
}

post({ kind: "ready" });

self.addEventListener("message", (ev: MessageEvent<InMessage>) => {
  if (ev.data.kind === "run") {
    const { id, code } = ev.data;
    enqueue(() => runCode(id, code));
  }
});
