/// <reference lib="webworker" />

// Web Worker that executes JavaScript code via AsyncFunction so that
// user-code execution is off the main thread and can't block the UI.
//
// Protocol
//   Main → Worker  { kind: "run"; id: number; code: string }
//   Worker → Main  { kind: "ready" }
//                  { kind: "stdout"; id: number; content: string }
//                  { kind: "stderr"; id: number; content: string }
//                  { kind: "done";   id: number }

type InMessage = { kind: "run"; id: number; code: string };

type OutMessage =
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

async function runCode(id: number, code: string): Promise<void> {
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
    const fn = new AsyncFunction("console", `"use strict";\n${code}`);
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

// Serialise concurrent run requests so async user code can't interleave.
let workQueue: Promise<unknown> = Promise.resolve();
function enqueue(task: () => Promise<void>): void {
  workQueue = workQueue.then(task, task).catch(() => {});
}

// No async init — JS runs natively, signal readiness immediately.
post({ kind: "ready" });

self.addEventListener("message", (ev: MessageEvent<InMessage>) => {
  if (ev.data.kind === "run") {
    const { id, code } = ev.data;
    enqueue(() => runCode(id, code));
  }
});
