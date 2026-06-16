/// <reference lib="webworker" />
export {};

// PhpWeb is an Emscripten build compiled for ENVIRONMENT=web. It reads
// `document` and `window` during module evaluation — before any async code
// runs. Stub them here at module-level, before any imports, so the checks
// pass in a worker context. Our `locateFile` override makes the fake
// currentScript irrelevant; PHP execution never touches the real DOM.
//
// Simple assignment (`self.window = self`) is unreliable here: browsers may
// define `window` on WorkerGlobalScope.prototype as non-configurable, making
// the write a silent no-op. Object.defineProperty on globalThis forces the
// property onto the own-properties of the global object, where a direct
// identifier lookup will find it.
{
  function defineGlobalIfMissing(name: string, value: unknown): void {
    if (typeof (globalThis as Record<string, unknown>)[name] !== "undefined") return;
    try {
      Object.defineProperty(globalThis, name, {
        value,
        writable: true,
        configurable: true,
        enumerable: false,
      });
    } catch {
      // Already defined and non-configurable — nothing we can do; PhpWeb will
      // fail to init if the value is wrong, and the error message will say why.
    }
  }

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

  defineGlobalIfMissing("document", docStub);
  defineGlobalIfMissing("window", globalThis);
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

const PHP_WASM_VERSION = "0.1.0";
// php-wasm 0.1.0 exceeds jsDelivr's 150 MB package limit, so jsDelivr returns
// 403 for every file in the package — see seanmorris/php-wasm#103. unpkg has
// no such limit and is the upstream-recommended CDN until that's resolved.
const PHP_WASM_CDN = `https://unpkg.com/php-wasm@${PHP_WASM_VERSION}/`;

// PhpWeb is loaded from the CDN at runtime rather than bundled. Its
// constructor uses dynamic `import('./phpX.Y-web.mjs')` to pull in the
// chosen PHP build, and the bundler can't rewrite those relative specifiers
// correctly into the worker chunk. Loading the entry point straight from the
// CDN keeps the whole module graph (and its sibling `.wasm`/`.mjs` files)
// on unpkg, where `locateFile` and the built-in relative imports agree on
// the base URL. The webpack/turbopack ignore comments stop the bundler from
// trying to resolve the URL string.
const PHP_WASM_ENTRY = `${PHP_WASM_CDN}PhpWeb.mjs`;

interface PhpOutputEvent extends Event {
  detail: string[];
}

type OutputCellType = "stdout" | "stderr" | "html";
interface OutputCellMessage {
  type: OutputCellType;
  content: string;
}

type InMessage =
  | { kind: "init" }
  | { kind: "run"; id: number; code: string }
  | { kind: "prepare-fs"; id: number; files: Array<[string, Uint8Array]> };

type OutMessage =
  | { kind: "loading"; message: string }
  | { kind: "ready" }
  | { kind: "init-error"; message: string }
  | { kind: "output"; id: number; cell: OutputCellMessage }
  | { kind: "done"; id: number }
  | { kind: "error"; id: number; message: string }
  | { kind: "prepare-fs-done"; id: number }
  | { kind: "prepare-fs-error"; id: number; message: string };

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

type PhpWebClass = typeof import("php-wasm/PhpWeb").PhpWeb;

let php: InstanceType<PhpWebClass> | null = null;
let initPromise: Promise<void> | null = null;

async function initPhp(): Promise<void> {
  post({ kind: "loading", message: "Loading PHP runtime…" });
  const mod = (await import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */ PHP_WASM_ENTRY
  )) as { PhpWeb: PhpWebClass };

  post({ kind: "loading", message: "Initialising PHP runtime…" });
  php = new mod.PhpWeb({
    // Return undefined for paths php-wasm handles internally — most
    // importantly `libxml2.so`, which PhpBase suppresses with a data: URL
    // when no sharedLib supplies it (PhpBase.mjs in v0.1.0). If we resolve
    // it to a CDN URL the request 404s on every init.
    locateFile: (path: string) =>
      path === "libxml2.so" ? undefined : PHP_WASM_CDN + path,
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

  if (stdout) {
    // PHP frequently produces HTML output (e.g. phpinfo(), header tags,
    // templated pages). Render it as an "html" cell when it looks like a
    // real HTML document or has multiple HTML elements, to avoid
    // misclassifying incidental angle brackets (e.g. in error messages).
    const looksLikeHtml =
      /<!doctype\s+html/i.test(stdout) ||
      /<html[\s>]/i.test(stdout) ||
      (/<[a-z][a-z0-9]*[\s>/]/i.test(stdout) && /<\/[a-z][a-z0-9]*>/i.test(stdout));
    const cellType: OutputCellType = looksLikeHtml ? "html" : "stdout";
    post({ kind: "output", id, cell: { type: cellType, content: stdout } });
  }
  if (stderr) post({ kind: "output", id, cell: { type: "stderr", content: stderr } });
}

// Serialise run requests — Emscripten PHP is not reentrant.
let workQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = workQueue.then(task, task);
  workQueue = next.catch(() => {});
  return next;
}

// ─── Multi-file VFS staging ────────────────────────────────────────────
// Files supplied to `prepareFs` are written to PHP's Emscripten MEMFS at
// `/` (the default working directory) so user code can `require`,
// `include`, and open files with relative paths.

interface PhpFS {
  writeFile(path: string, data: Uint8Array | string): void;
  unlink(path: string): void;
  mkdir(path: string): void;
}

interface PhpBinary {
  FS: PhpFS;
}

// Staging root matches PHP's default Emscripten CWD so that
// `require 'math_utils.php'` resolves to `/math_utils.php`.
const stagedPaths = new Set<string>();

function joinStagedPath(relPath: string): string {
  const trimmed = relPath.replace(/^\/+/, "");
  if (!trimmed) throw new Error("Invalid empty file path");
  return `/${trimmed}`;
}

function ensureDirs(FS: PhpFS, absFilePath: string): void {
  const idx = absFilePath.lastIndexOf("/");
  if (idx < 0) return;
  const parent = absFilePath.slice(0, idx);
  const parts = parent.split("/").filter(Boolean);
  let cur = "";
  for (const part of parts) {
    cur += `/${part}`;
    try {
      FS.mkdir(cur);
    } catch {
      // Directory already exists -- ignore.
    }
  }
}

async function prepareFs(files: Array<[string, Uint8Array]>): Promise<void> {
  if (!php) return;
  // FS lives on the resolved Emscripten module, not on the PhpWeb instance.
  // See PhpBase.mjs: `this.binary = phpBinLoader.then(...).then(async php => { ... return php; })`
  // and PhpWeb.mjs refresh(): `const php = await this.binary; php.FS.syncfs(...)`
  const phpModule = await (php as unknown as { binary: Promise<PhpBinary> }).binary;
  const FS = phpModule.FS;

  const nextPaths = new Set<string>();
  for (const [relPath, bytes] of files) {
    const abs = joinStagedPath(relPath);
    nextPaths.add(abs);
    ensureDirs(FS, abs);
    try {
      FS.writeFile(abs, bytes);
    } catch (err) {
      throw new Error(
        `Failed to write ${relPath}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Remove paths from a previous run that are no longer in the snapshot.
  for (const prev of stagedPaths) {
    if (!nextPaths.has(prev)) {
      try {
        FS.unlink(prev);
      } catch {
        /* file may already be gone -- ignore */
      }
    }
  }
  stagedPaths.clear();
  for (const p of nextPaths) stagedPaths.add(p);
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

  if (msg.kind === "prepare-fs") {
    const { id } = msg;
    enqueue(async () => {
      try {
        if (initPromise) await initPromise;
        await prepareFs(msg.files);
        post({ kind: "prepare-fs-done", id });
      } catch (err) {
        post({
          kind: "prepare-fs-error",
          id,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    });
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
