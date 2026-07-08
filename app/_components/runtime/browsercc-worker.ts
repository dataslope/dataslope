/// <reference lib="webworker" />
export {};

// browsercc (clang + lld + WASI sysroot) and the WASI shim run inside a
// dedicated Web Worker so that C/C++ compilation and execution don't block
// the main thread. Both the C and C++ playgrounds share this single worker
// file; the `language` field in each `run` message picks the right path.
//
// Singletons here are worker-level, separate from those in browsercc.ts
// (which is main-thread-only). This means a C and a C++ playground open at
// the same time each get their own worker with their own browsercc instance,
// which is fine, the ~95 MB toolchain is cached by the browser across both.
//
// Protocol:
//   Main → Worker  { kind: "init" }
//                  { kind: "run"; id: number; code: string; language: "c" | "cpp" }
//   Worker → Main  { kind: "loading"; message: string }
//                  { kind: "ready" }
//                  { kind: "init-error"; message: string }
//                  { kind: "output"; id: number; cell: OutputCellMessage }
//                  { kind: "done"; id: number }
//                  { kind: "error"; id: number; message: string }

declare const self: DedicatedWorkerGlobalScope;

const BROWSERCC_VERSION = "0.1.1";
const BROWSERCC_URL = `https://cdn.jsdelivr.net/npm/browsercc@${BROWSERCC_VERSION}/dist/index.js`;

const WASI_SHIM_VERSION = "0.4.2";
const WASI_SHIM_URL = `https://esm.sh/@bjorn3/browser_wasi_shim@${WASI_SHIM_VERSION}`;

// ─── Type shims (mirrors browsercc.ts) ──────────────────────────────────

interface BrowserccCompileJob {
  source: string;
  fileName: string;
  flags: string[];
  extraFiles?: Record<string, string | ArrayBuffer>;
}

interface BrowserccCompileResult {
  compileOutput: string;
  module: WebAssembly.Module | null;
}

interface BrowserccApi {
  compile(job: BrowserccCompileJob): Promise<BrowserccCompileResult>;
  getPrecompiledHeader(flags: string[]): Promise<ArrayBuffer | null>;
}

interface WasiInstance {
  readonly wasiImport: WebAssembly.ModuleImports;
  start(instance: WebAssembly.Instance): number | undefined;
}

interface WasiShim {
  WASI: new (args: string[], env: string[], fds: unknown[]) => WasiInstance;
  File: new (data: Uint8Array | number[]) => unknown;
  OpenFile: new (file: unknown) => unknown;
  ConsoleStdout: new (cb: (data: Uint8Array) => void) => unknown;
}

// ─── Compile flags ────────────────────────────────────────────────────────

const C_COMPILE_FLAGS = ["--driver-mode=gcc", "-O2", "-Wall", "-std=gnu17"];
const CPP_COMPILE_FLAGS = ["-O2", "-std=c++20", "-fno-exceptions"];
const PCH_VFS_PATH = "/include/bits/stdc++.h.pch";

// ─── Protocol types ──────────────────────────────────────────────────────

type OutputCellType = "stdout" | "stderr";
interface OutputCellMessage {
  type: OutputCellType;
  content: string;
}

type InMessage =
  | { kind: "init" }
  | {
      kind: "run";
      id: number;
      code: string;
      language: "c" | "cpp";
      /** Extra workspace files (path → text content) to make available
       *  during compilation. Headers and additional source files from the
       *  multi-file workspace are passed here so `#include "dog.h"` and
       *  multi-translation-unit builds work correctly. */
      files?: Array<[string, string]>;
    };

type OutMessage =
  | { kind: "loading"; message: string }
  | { kind: "ready" }
  | { kind: "init-error"; message: string }
  | { kind: "run-status"; id: number; message: string; preparing: boolean }
  | { kind: "output"; id: number; cell: OutputCellMessage }
  | { kind: "done"; id: number }
  | { kind: "error"; id: number; message: string };

function post(msg: OutMessage) {
  self.postMessage(msg);
}

// ─── Worker-level singletons ─────────────────────────────────────────────

// Hide the CDN URL from Turbopack's static import analysis, identical to
// the dynamicImport trick in browsercc.ts.
const dynamicImport = new Function(
  "url",
  "return import(url);",
) as (url: string) => Promise<unknown>;

let browserccApi: BrowserccApi | null = null;
let wasiShim: WasiShim | null = null;
// Cached C++ PCH; null means either not yet loaded or load failed.
let pchPromise: Promise<ArrayBuffer | null> | null = null;
let initPromise: Promise<void> | null = null;

async function initRuntime(): Promise<void> {
  post({
    kind: "loading",
    message: "Loading the compiler…",
  });
  const [api, shim] = await Promise.all([
    dynamicImport(BROWSERCC_URL) as Promise<BrowserccApi>,
    dynamicImport(WASI_SHIM_URL) as Promise<WasiShim>,
  ]);
  browserccApi = api;
  wasiShim = shim;

  // Kick off the 19 MB PCH download in the background so it's ready by the
  // time the user clicks Run on a C++ file.
  pchPromise = api
    .getPrecompiledHeader(CPP_COMPILE_FLAGS)
    .catch((err) => {
      console.warn(
        "[browsercc-worker] PCH fetch failed; C++ will parse headers per-run.",
        err,
      );
      return null;
    });

  post({ kind: "ready" });
}

// ─── WASI runner (mirrors runWasiModule in browsercc.ts) ─────────────────

interface WasiRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function runWasiModule(
  module: WebAssembly.Module,
  shim: WasiShim,
): Promise<WasiRunResult> {
  const decoder = new TextDecoder("utf-8");
  let stdout = "";
  let stderr = "";

  const stdinFd = new shim.OpenFile(new shim.File(new Uint8Array(0)));
  const stdoutFd = new shim.ConsoleStdout((data: Uint8Array) => {
    stdout += decoder.decode(data, { stream: true });
  });
  const stderrFd = new shim.ConsoleStdout((data: Uint8Array) => {
    stderr += decoder.decode(data, { stream: true });
  });

  const wasi = new shim.WASI([], [], [stdinFd, stdoutFd, stderrFd]);
  const instance = await WebAssembly.instantiate(module, {
    wasi_snapshot_preview1: wasi.wasiImport,
  });

  let exitCode = 0;
  try {
    const result = wasi.start(instance);
    if (typeof result === "number") exitCode = result;
  } catch (err) {
    const code = (err as { code?: unknown })?.code;
    if (typeof code === "number") {
      exitCode = code;
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      stderr += `Runtime error: ${msg}\n`;
      exitCode = 1;
    }
  }

  return { exitCode, stdout, stderr };
}

// ─── Compile + run ───────────────────────────────────────────────────────

async function runCode(
  id: number,
  code: string,
  language: "c" | "cpp",
  files: Array<[string, string]>,
): Promise<void> {
  if (!browserccApi || !wasiShim) throw new Error("Runtime not initialised");

  let flags: string[];
  let fileName: string;
  const extraFiles: Record<string, string | ArrayBuffer> = {};

  // Build a combined source using the "unity build" strategy: all extra
  // source files are concatenated before the entry point so that symbols
  // defined in helper files (e.g. dog.c) are available when the entry
  // point (main.c / main.cpp) is compiled.  Headers are placed in the
  // compiler VFS via extraFiles so that #include "dog.h" resolves.
  //
  // This avoids passing additional source file paths as positional
  // arguments to clang, which is not supported by browsercc's compile()
  // API and would cause "Clang driver failed with code 1".
  let extraSource = "";

  if (language === "cpp") {
    // The ~10 MB precompiled header is fetched in the background at boot.
    // On a fast first C++ run it may still be downloading, surface the
    // boot notice for the wait (the main thread debounces it, so an
    // already-cached PCH doesn't flash anything).
    post({
      kind: "run-status",
      id,
      message: "Preparing the C++ standard library…",
      preparing: true,
    });
    const pch = await pchPromise;
    post({ kind: "run-status", id, message: "Compiling…", preparing: false });
    flags = [...CPP_COMPILE_FLAGS];
    if (pch) {
      flags.push("-include-pch", PCH_VFS_PATH);
      extraFiles[PCH_VFS_PATH] = pch;
    }
    fileName = "main.cpp";
    for (const [path, content] of files) {
      if (path.endsWith(".cpp") || path.endsWith(".cc") || path.endsWith(".cxx")) {
        extraSource += content + "\n";
      } else if (path.endsWith(".h") || path.endsWith(".hpp")) {
        extraFiles[path] = content;
      }
    }
  } else {
    flags = [...C_COMPILE_FLAGS];
    fileName = "main.c";
    for (const [path, content] of files) {
      if (path.endsWith(".c")) {
        extraSource += content + "\n";
      } else if (path.endsWith(".h")) {
        extraFiles[path] = content;
      }
    }
  }

  const combinedSource = extraSource ? extraSource + code : code;

  const { compileOutput, module } = await browserccApi.compile({
    source: combinedSource,
    fileName,
    flags,
    extraFiles: Object.keys(extraFiles).length > 0 ? extraFiles : undefined,
  });

  const trimmedDiag = compileOutput.replace(/\n+$/, "");
  if (trimmedDiag) {
    post({ kind: "output", id, cell: { type: "stderr", content: trimmedDiag } });
  }
  if (!module) return;

  const { exitCode, stdout, stderr } = await runWasiModule(module, wasiShim);
  if (stdout)
    post({ kind: "output", id, cell: { type: "stdout", content: stdout.replace(/\n+$/, "") } });
  if (stderr)
    post({ kind: "output", id, cell: { type: "stderr", content: stderr.replace(/\n+$/, "") } });
  if (exitCode !== 0)
    post({
      kind: "output",
      id,
      cell: { type: "stderr", content: `Program exited with code ${exitCode}.` },
    });
}

// Serialise requests, browsercc is not reentrant within a single worker.
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
      initPromise = initRuntime().catch((err) => {
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
    const { id, code, language, files = [] } = msg;
    enqueue(async () => {
      try {
        if (initPromise) await initPromise;
        await runCode(id, code, language, files);
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
