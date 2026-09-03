/// <reference lib="webworker" />
export {};

// browsercc (clang + lld + WASI sysroot) runs in a dedicated Web Worker so
// C/C++ compilation doesn't block the main thread; both playgrounds share
// this worker file, with `language` picking the path. Singletons here are
// worker-level, separate from browsercc.ts's main-thread ones (the browser
// caches the ~95 MB toolchain across both). Protocol: see In/OutMessage.

import {
  cleanBuildOutput,
  composeTranslationUnit,
  describeExit,
  describeTrap,
  FLAG_PROBE_SOURCE,
  OPTIONAL_FLAGS,
  STDIN_FILENAME,
  type CFamilyLanguage,
} from "./browserccBuild";
import {
  cc1ArgsFromDriverOutput,
  identifierStart,
  parseClangCompletions,
  tarEntries,
} from "./clangCompletion";

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

/** Emscripten module for the clang binary, from browsercc's `Clang`
 *  factory (exported beside `compile`). */
interface ClangModule {
  FS: {
    writeFile(path: string, data: string | Uint8Array): void;
    mkdirTree(path: string): void;
    analyzePath(path: string): { exists: boolean };
  };
  callMain(args: string[]): number;
}
type ClangFactory = (options: Record<string, unknown>) => Promise<ClangModule>;

interface BrowserccApi {
  compile(job: BrowserccCompileJob): Promise<BrowserccCompileResult>;
  getPrecompiledHeader(flags: string[]): Promise<ArrayBuffer | null>;
  Clang?: ClangFactory;
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

// Mirrors the subset of OutputCellType in ../types these playgrounds use.
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
      language: CFamilyLanguage;
      /** Workspace path of the file Run targets. */
      entryPath?: string;
      /** Extra workspace files (path → text) so `#include "dog.h"` and
       *  multi-source builds work. */
      files?: Array<[string, string]>;
    }
  | {
      kind: "complete";
      id: number;
      language: CFamilyLanguage;
      /** The editor's document (with any read-only init code prepended). */
      doc: string;
      entryPath?: string;
      files?: Array<[string, string]>;
      /** 1-based line and 0-based column of the cursor within `doc`. */
      lineNumber: number;
      column: number;
    };

/** Mirrors `CompletionItemDetail` in ../types. */
interface CompletionItemMessage {
  label: string;
  type?: string;
  detail?: string;
  info?: string;
  apply?: string;
  boost?: number;
}

type OutMessage =
  | { kind: "loading"; message: string }
  | { kind: "ready" }
  | { kind: "init-error"; message: string }
  | { kind: "run-status"; id: number; message: string; preparing: boolean }
  | {
      kind: "output";
      id: number;
      cell: OutputCellMessage;
      /** Position within the run's output. Posted as produced, so one
       *  `seq` can arrive repeatedly while its cell grows (see `append`). */
      seq: number;
      /** True when `cell.content` extends the cell already sent for `seq`. */
      append: boolean;
    }
  | { kind: "done"; id: number }
  | { kind: "error"; id: number; message: string }
  | {
      kind: "complete-result";
      id: number;
      completions: CompletionItemMessage[];
      replaceLength: number;
    };

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

  // Background-download the 19 MB PCH so it's ready by the first C++ Run.
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

// ─── WASI runner ─────────────────────────────────────────────────────────

interface WasiRunResult {
  exitCode: number;
  /** Set when the instance trapped rather than exiting. */
  trap: string | null;
}

/**
 * Run the compiled module, streaming its output.
 *
 * Both descriptors write into one ordered stream. stdout and stderr used
 * to be collected into separate buffers and concatenated at the end, so a
 * `std::cerr` line printed between two `std::cout` lines came out after
 * both, and a message split across the two channels ran together with no
 * newline. Streaming also means output survives: a program that loops
 * forever, or traps, has already delivered everything it printed.
 */
async function runWasiModule(
  module: WebAssembly.Module,
  shim: WasiShim,
  stdin: string,
  write: (channel: OutputCellType, text: string) => void,
): Promise<WasiRunResult> {
  const decoder = new TextDecoder("utf-8");

  const stdinFd = new shim.OpenFile(
    new shim.File(new TextEncoder().encode(stdin)),
  );
  const stdoutFd = new shim.ConsoleStdout((data: Uint8Array) => {
    write("stdout", decoder.decode(data, { stream: true }));
  });
  const stderrFd = new shim.ConsoleStdout((data: Uint8Array) => {
    write("stderr", decoder.decode(data, { stream: true }));
  });

  const wasi = new shim.WASI([], [], [stdinFd, stdoutFd, stderrFd]);
  const instance = await WebAssembly.instantiate(module, {
    wasi_snapshot_preview1: wasi.wasiImport,
  });

  try {
    const result = wasi.start(instance);
    return { exitCode: typeof result === "number" ? result : 0, trap: null };
  } catch (err) {
    // A clean `exit(n)` arrives as an exception carrying the status.
    const code = (err as { code?: unknown })?.code;
    if (typeof code === "number") return { exitCode: code, trap: null };
    // Anything else is a trap: a failed assert(), abort(), a stack
    // overflow, or a standard-library check that cannot throw. The run
    // used to report `Done` for these.
    return {
      exitCode: 1,
      trap: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Optional build flags ────────────────────────────────────────────────

/** Flags this toolchain accepts, learned once per language. */
const acceptedFlags = new Map<CFamilyLanguage, string[]>();

/**
 * Keep only the optional flags this build understands.
 *
 * The toolchain is a pinned CDN download this code cannot inspect, so
 * rather than assume, each candidate set is compiled against a trivial
 * program once. A flag the build rejects costs one probe; assuming
 * wrongly would break every compile.
 */
async function resolveOptionalFlags(
  api: BrowserccApi,
  language: CFamilyLanguage,
  baseFlags: string[],
): Promise<string[]> {
  const known = acceptedFlags.get(language);
  if (known) return known;

  const candidates = OPTIONAL_FLAGS[language];
  const probe = {
    source: FLAG_PROBE_SOURCE[language],
    fileName: language === "c" ? "probe.c" : "probe.cpp",
  };
  let accepted: string[] = [];
  try {
    const all = await api.compile({
      ...probe,
      flags: [...baseFlags, ...candidates],
    });
    if (all.module) {
      accepted = candidates;
    } else {
      // Narrow it down: one bad flag should not cost the others.
      for (const flag of candidates) {
        try {
          const one = await api.compile({
            ...probe,
            flags: [...baseFlags, ...accepted, flag],
          });
          if (one.module) accepted.push(flag);
        } catch {
          // Rejected; leave it out.
        }
      }
    }
  } catch {
    accepted = [];
  }
  acceptedFlags.set(language, accepted);
  return accepted;
}

// ─── Compile + run ───────────────────────────────────────────────────────

async function runCode(
  id: number,
  code: string,
  language: CFamilyLanguage,
  entryPath: string,
  files: Array<[string, string]>,
): Promise<void> {
  if (!browserccApi || !wasiShim) throw new Error("Runtime not initialised");

  const baseFlags =
    language === "cpp" ? [...CPP_COMPILE_FLAGS] : [...C_COMPILE_FLAGS];
  const extraFiles: Record<string, string | ArrayBuffer> = {};

  if (language === "cpp") {
    // The PCH may still be downloading on a fast first run; surface the
    // boot notice for the wait (debounced upstream).
    post({
      kind: "run-status",
      id,
      message: "Preparing the C++ standard library…",
      preparing: true,
    });
    const pch = await pchPromise;
    post({ kind: "run-status", id, message: "Compiling…", preparing: false });
    if (pch) {
      baseFlags.push("-include-pch", PCH_VFS_PATH);
      extraFiles[PCH_VFS_PATH] = pch;
    }
  }

  const unit = composeTranslationUnit({
    language,
    entryPath,
    entryCode: code,
    files,
  });
  for (const [path, content] of Object.entries(unit.extraFiles)) {
    extraFiles[path] = content;
  }

  const optional = await resolveOptionalFlags(browserccApi, language, baseFlags);
  const flags = [...baseFlags, ...optional];

  // Output is addressed by position, and consecutive text on one channel
  // coalesces, so the pane reads as one stream in the order it happened.
  let seq = -1;
  let channel: OutputCellType | null = null;
  const write = (next: OutputCellType, text: string) => {
    if (!text) return;
    const append = next === channel;
    if (!append) {
      channel = next;
      seq += 1;
    }
    post({ kind: "output", id, cell: { type: next, content: text }, seq, append });
  };

  const { compileOutput, module } = await browserccApi.compile({
    source: unit.source,
    fileName: unit.fileName,
    flags,
    extraFiles: Object.keys(extraFiles).length > 0 ? extraFiles : undefined,
  });

  const diagnostics = cleanBuildOutput(compileOutput, entryPath, language)
    .replace(/\n+$/, "");
  if (diagnostics) write("stderr", diagnostics + "\n");
  if (!module) {
    // A build that produced nothing is a failed run, not a quiet one.
    throw new Error("Compilation failed.");
  }

  const stdin = files.find(([path]) => path === STDIN_FILENAME)?.[1] ?? "";
  const { exitCode, trap } = await runWasiModule(module, wasiShim, stdin, write);

  if (trap) write("stderr", `${describeTrap(trap)}\n`);
  const exit = describeExit(exitCode);
  if (exit.message) write("stderr", `${exit.message}\n`);
  if (trap || exit.failed) {
    // The run status should say the program did not succeed; the lines
    // above already explain why.
    const err = new Error(trap ? describeTrap(trap) : (exit.message ?? "Run failed."));
    err.name = "ProgramFailed";
    throw err;
  }
}

// ─── Code completion (clang's own completer) ─────────────────────────────
// Each request is a fresh clang instance over a module compiled once
// (~60 ms to instantiate, measured) plus one cc1 run with
// `-code-completion-at` (~0.1–0.4 s for C, ~0.1 s for C++ with the PCH).
// The driver's `-###` dry run, which only turns flags into the cc1 vector,
// is cached per language since only the position argument changes. No
// download beyond what Run already fetched: clang.wasm, the sysroot's
// headers, and (for C++) the PCH.

const COMPLETION_AT_PLACEHOLDER = "-code-completion-at=@@";

let clangModulePromise: Promise<WebAssembly.Module | null> | null = null;
let sysrootHeadersPromise: Promise<Array<[string, Uint8Array]> | null> | null =
  null;
const cc1ArgsCache = new Map<string, Promise<string[] | null>>();
/** The newest completion request; older ones still queued answer empty
 *  rather than spend a clang run on a cursor that has moved on. */
let latestCompleteId = 0;

function ensureClangModule(): Promise<WebAssembly.Module | null> {
  clangModulePromise ??= (async () => {
    try {
      const res = await fetch(new URL("clang.wasm", BROWSERCC_URL).href);
      if (!res.ok) throw new Error(`clang.wasm: HTTP ${res.status}`);
      return typeof WebAssembly.compileStreaming === "function"
        ? await WebAssembly.compileStreaming(res)
        : await WebAssembly.compile(await res.arrayBuffer());
    } catch (err) {
      console.warn(
        "[browsercc-worker] clang module cache failed; completion instantiates per request.",
        err,
      );
      return null;
    }
  })();
  return clangModulePromise;
}

/** The sysroot's headers, as (path, bytes). Only headers: the libraries
 *  are for linking, which `-fsyntax-only` never does. */
function ensureSysrootHeaders(): Promise<Array<[string, Uint8Array]> | null> {
  sysrootHeadersPromise ??= (async () => {
    try {
      const res = await fetch(new URL("sysroot.tar", BROWSERCC_URL).href);
      if (!res.ok) throw new Error(`sysroot.tar: HTTP ${res.status}`);
      const headers: Array<[string, Uint8Array]> = [];
      for (const entry of tarEntries(await res.arrayBuffer())) {
        if (entry.name.endsWith("/")) continue;
        if (!/(^|\/)include\//.test(entry.name)) continue;
        headers.push([entry.name, entry.content]);
      }
      return headers;
    } catch (err) {
      console.warn("[browsercc-worker] sysroot headers unavailable; no completion.", err);
      return null;
    }
  })();
  return sysrootHeadersPromise;
}

async function makeClang(
  api: BrowserccApi,
  options: Record<string, unknown>,
): Promise<ClangModule> {
  if (!api.Clang) throw new Error("browsercc exposes no Clang factory");
  const compiled = await ensureClangModule();
  if (!compiled) return api.Clang(options);
  return api.Clang({
    ...options,
    instantiateWasm: (
      imports: WebAssembly.Imports,
      done: (instance: WebAssembly.Instance, mod: WebAssembly.Module) => void,
    ) => {
      void WebAssembly.instantiate(compiled, imports).then((instance) =>
        done(instance, compiled),
      );
      return {};
    },
  });
}

function mountFiles(
  clang: ClangModule,
  files: Iterable<[string, string | Uint8Array | ArrayBuffer]>,
): void {
  for (const [name, content] of files) {
    const dir = name.split("/").slice(0, -1).join("/");
    if (dir && !clang.FS.analyzePath(dir).exists) clang.FS.mkdirTree(dir);
    clang.FS.writeFile(
      name,
      content instanceof ArrayBuffer ? new Uint8Array(content) : content,
    );
  }
}

/** The cc1 vector for `flags`, position argument left as a placeholder. */
function cc1ArgsFor(
  api: BrowserccApi,
  unitName: string,
  flags: string[],
): Promise<string[] | null> {
  const key = `${unitName}\0${flags.join("\0")}`;
  let pending = cc1ArgsCache.get(key);
  if (!pending) {
    pending = (async () => {
      let stderr = "";
      const clang = await makeClang(api, {
        thisProgram: "clang++",
        printErr: (line: string) => {
          stderr += line + "\n";
        },
      });
      clang.FS.writeFile(unitName, "");
      // The driver looks for the sysroot's runtime objects; empty
      // stand-ins satisfy it, as in browsercc's own driver step.
      mountFiles(clang, [
        ["/lib/wasm32-wasi/crt1-command.o", new Uint8Array(0)],
        ["/lib/wasm32-wasi/crt1-reactor.o", new Uint8Array(0)],
      ]);
      clang.FS.mkdirTree("/include/c++/v1");
      const code = clang.callMain([
        unitName,
        ...flags,
        "-fsyntax-only",
        "-Xclang",
        COMPLETION_AT_PLACEHOLDER,
        "-Xclang",
        "-code-completion-macros",
        "-###",
      ]);
      return code === 0 ? cc1ArgsFromDriverOutput(stderr) : null;
    })().catch(() => null);
    cc1ArgsCache.set(key, pending);
    // A failure is not cached: the next request retries.
    void pending.then((args) => {
      if (!args) cc1ArgsCache.delete(key);
    });
  }
  return pending;
}

async function completeCode(
  id: number,
  language: CFamilyLanguage,
  doc: string,
  entryPath: string,
  files: Array<[string, string]>,
  lineNumber: number,
  column: number,
): Promise<void> {
  const empty = () =>
    post({ kind: "complete-result", id, completions: [], replaceLength: 0 });
  const api = browserccApi;
  if (!api?.Clang || id !== latestCompleteId) return empty();
  const headers = await ensureSysrootHeaders();
  if (!headers) return empty();

  const flags =
    language === "cpp" ? [...CPP_COMPILE_FLAGS] : [...C_COMPILE_FLAGS];
  const extra: Array<[string, string | ArrayBuffer]> = [];
  if (language === "cpp") {
    const pch = pchPromise ? await pchPromise : null;
    if (pch) {
      flags.push("-include-pch", PCH_VFS_PATH);
      extra.push([PCH_VFS_PATH, pch]);
    }
  }
  const unit = composeTranslationUnit({
    language,
    entryPath,
    entryCode: doc,
    files,
  });
  const template = await cc1ArgsFor(api, unit.fileName, flags);
  if (!template || id !== latestCompleteId) return empty();

  const lineText = doc.split("\n")[lineNumber - 1] ?? "";
  const { column1, prefixLength } = identifierStart(lineText, column);
  const args = template.map((arg) =>
    arg === COMPLETION_AT_PLACEHOLDER
      ? `-code-completion-at=${entryPath}:${lineNumber}:${column1}`
      : arg,
  );

  let stdout = "";
  const clang = await makeClang(api, {
    thisProgram: "clang++",
    print: (line: string) => {
      stdout += line + "\n";
    },
    printErr: () => {},
  });
  clang.FS.writeFile(unit.fileName, unit.source);
  mountFiles(clang, headers);
  mountFiles(clang, Object.entries(unit.extraFiles));
  mountFiles(clang, extra);
  try {
    clang.callMain(args);
  } catch {
    // A parse that traps still printed what it completed first.
  }
  const completions = parseClangCompletions(stdout, {
    typedPrefix: lineText.slice(column - prefixLength, column),
  });
  post({ kind: "complete-result", id, completions, replaceLength: prefixLength });
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

  if (msg.kind === "complete") {
    const { id, language, doc, files = [], lineNumber, column } = msg;
    const entryPath = msg.entryPath || (language === "c" ? "main.c" : "main.cpp");
    latestCompleteId = id;
    enqueue(async () => {
      try {
        if (initPromise) await initPromise;
        await completeCode(id, language, doc, entryPath, files, lineNumber, column);
      } catch {
        // Best-effort: a completion that fails shows nothing.
        post({ kind: "complete-result", id, completions: [], replaceLength: 0 });
      }
    });
    return;
  }

  if (msg.kind === "run") {
    const { id, code, language, files = [] } = msg;
    const entryPath = msg.entryPath || (language === "c" ? "main.c" : "main.cpp");
    enqueue(async () => {
      try {
        if (initPromise) await initPromise;
        await runCode(id, code, language, entryPath, files);
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
