/// <reference lib="webworker" />
export {};

// PhpWeb is an Emscripten build compiled for ENVIRONMENT=web. It reads
// `document` and `window` during module evaluation — before any async code
// runs. Stub them here at module-level, before any imports, so the checks
// pass in a worker context. Our `locateFile` override makes the fake
// currentScript irrelevant; PHP execution never touches the real DOM.
{
  const globals = self as unknown as Record<string, unknown>;
  if (typeof document === "undefined") {
    const docStub = {
      currentScript: null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: (tag: string) => {
        const el: Record<string, unknown> = { style: {}, tagName: tag.toUpperCase() };
        if (tag === "canvas") el.getContext = () => null;
        return el;
      },
      createElementNS: (_ns: string, tag: string) => docStub.createElement(tag),
      addEventListener: () => {},
      removeEventListener: () => {},
      body: { appendChild: () => {}, removeChild: () => {} },
    };
    globals.document = docStub;
  }
  if (typeof window === "undefined") {
    globals.window = self;
  }
}

// PHP (via php-wasm) runs inside a dedicated Web Worker so that:
//   1. PHP execution doesn't block the main thread.
//   2. The Emscripten module init is isolated from the UI loop.
//
// Protocol:
//   Main → Worker  { kind: "init" }
//                  { kind: "run"; id: number; code: string }
//   Worker → Main  { kind: "loading"; message: string }
//                  { kind: "ready" }
//                  { kind: "init-error"; message: string }
//                  { kind: "output"; id: number; cell: OutputCellMessage }
//                  { kind: "done"; id: number }
//                  { kind: "error"; id: number; message: string }

declare const self: DedicatedWorkerGlobalScope;

const PHP_WASM_VERSION = "0.0.9-alpha-32";
const PHP_WASM_CDN = `https://cdn.jsdelivr.net/npm/php-wasm@${PHP_WASM_VERSION}/`;

interface PhpWebInstance extends EventTarget {
  binary: Promise<unknown>;
  run(code: string): Promise<unknown>;
  refresh(): Promise<unknown>;
}

interface PhpOutputEvent extends Event {
  detail: string[];
}

type OutputCellType = "stdout" | "stderr";
interface OutputCellMessage {
  type: OutputCellType;
  content: string;
}

type InMessage =
  | { kind: "init" }
  | { kind: "run"; id: number; code: string };

type OutMessage =
  | { kind: "loading"; message: string }
  | { kind: "ready" }
  | { kind: "init-error"; message: string }
  | { kind: "output"; id: number; cell: OutputCellMessage }
  | { kind: "done"; id: number }
  | { kind: "error"; id: number; message: string };

function post(msg: OutMessage) {
  self.postMessage(msg);
}

// ─── Diagnostic splitter (ported from php.tsx) ──────────────────────────

const PHP_DIAGNOSTIC_RE =
  /^(PHP\s+)?(Parse error|Fatal error|Warning|Notice|Deprecated|Strict Standards|Catchable fatal error)\b/i;

function splitPhpDiagnostics(raw: string): { stdout: string; stderr: string } {
  if (!raw) return { stdout: "", stderr: "" };
  const lines = raw.split("\n");
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];
  let mode: "stdout" | "stderr" = "stdout";
  for (const line of lines) {
    if (PHP_DIAGNOSTIC_RE.test(line)) {
      mode = "stderr";
      stderrLines.push(line);
    } else if (mode === "stderr" && /^\s+\S/.test(line)) {
      stderrLines.push(line);
    } else if (mode === "stderr" && line.trim() === "") {
      mode = "stdout";
    } else {
      stdoutLines.push(line);
    }
  }
  return {
    stdout: stdoutLines.join("\n"),
    stderr: stderrLines.join("\n"),
  };
}

// ─── PHP state ───────────────────────────────────────────────────────────

let php: PhpWebInstance | null = null;
let initPromise: Promise<void> | null = null;

async function initPhp(): Promise<void> {
  post({ kind: "loading", message: "Loading PHP runtime…" });
  const mod = (await import("php-wasm/PhpWeb.mjs")) as unknown as {
    PhpWeb: new (args?: Record<string, unknown>) => PhpWebInstance;
  };

  post({ kind: "loading", message: "Initialising PHP (WebAssembly)…" });
  php = new mod.PhpWeb({
    locateFile: (path: string) => PHP_WASM_CDN + path,
  });
  await php.binary;

  post({ kind: "ready" });
}

async function runCode(id: number, code: string): Promise<void> {
  if (!php) throw new Error("PHP runtime is not initialised");

  let outputBuf = "";
  let errorBuf = "";

  const onOutput = (event: Event) => {
    const detail = (event as PhpOutputEvent).detail;
    if (detail) outputBuf += detail.join("");
  };
  const onError = (event: Event) => {
    const detail = (event as PhpOutputEvent).detail;
    if (detail) errorBuf += detail.join("");
  };

  php.addEventListener("output", onOutput);
  php.addEventListener("error", onError);

  try {
    try {
      await php.refresh();
    } catch {
      /* refresh is best-effort */
    }
    await php.run(code);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errorBuf += message + "\n";
  } finally {
    php.removeEventListener("output", onOutput);
    php.removeEventListener("error", onError);
  }

  const { stdout: splitStdout, stderr: splitStderr } =
    splitPhpDiagnostics(outputBuf);
  const stdout = splitStdout.replace(/\n+$/, "");
  const stderr = [splitStderr, errorBuf]
    .filter((s) => s)
    .join("\n")
    .replace(/\n+$/, "");

  if (stdout) post({ kind: "output", id, cell: { type: "stdout", content: stdout } });
  if (stderr) post({ kind: "output", id, cell: { type: "stderr", content: stderr } });
}

// Serialise run requests — Emscripten PHP is not reentrant.
let workQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = workQueue.then(task, task);
  workQueue = next.catch(() => {});
  return next;
}

self.addEventListener("message", (ev: MessageEvent<InMessage>) => {
  const msg = ev.data;

  if (msg.kind === "init") {
    if (!initPromise) {
      initPromise = initPhp().catch((err) => {
        post({
          kind: "init-error",
          message: err instanceof Error ? err.message : String(err),
        });
        throw err;
      });
    }
    return;
  }

  if (msg.kind === "run") {
    const { id, code } = msg;
    enqueue(async () => {
      try {
        if (initPromise) await initPromise;
        await runCode(id, code);
        post({ kind: "done", id });
      } catch (err) {
        post({
          kind: "error",
          id,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    });
    return;
  }
});
