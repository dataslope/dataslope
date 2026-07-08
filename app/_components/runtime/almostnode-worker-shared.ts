/// <reference lib="webworker" />

// Helpers shared by the JavaScript and TypeScript almostnode-backed
// workers. Both spawn their own Worker instance via `new Worker(new
// URL(...))`, so this file is imported once into each worker bundle.
//
// almostnode provides:
//   - VirtualFS: in-memory POSIX-style filesystem
//   - Runtime  : CommonJS executor with 40+ shimmed Node.js modules
//
// We use almostnode directly (not `createRuntime`) because we're already
// inside a same-origin Web Worker, the existing security model, so
// adding another layer of isolation (worker-inside-worker or a cross-
// origin sandbox) buys nothing here.

import { VirtualFS, Runtime } from "almostnode";

// ─── Console arg formatting ─────────────────────────────────────────
//
// Mirrors the formatter from the legacy javascript-worker.ts so output
// in the playground UI is byte-compatible with the previous runtime,
// no migration surprises for existing snippets.

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return `${value.toString()}n`;
  if (typeof value === "function")
    return `[Function: ${value.name || "anonymous"}]`;
  if (typeof value === "undefined") return "undefined";
  return value;
}

export function formatArg(value: unknown): string {
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

// ─── VFS path helpers ───────────────────────────────────────────────

/** Convert a workspace-relative path (e.g. `index.js`, `data/sales.csv`)
 *  into an absolute VFS path (`/index.js`). almostnode's resolver works
 *  exclusively in absolute terms. */
export function normalizeVfsPath(p: string): string {
  return p.startsWith("/") ? p : `/${p}`;
}

/** Stage the given files into a freshly-created VirtualFS, returning the
 *  new VFS. Recreating per `prepare-fs` cleanly mirrors deletions and
 *  renames that happened in the UI, no stale entries linger. */
export function stageFiles(
  files: Array<[string, Uint8Array]>,
  transformFile?: (
    path: string,
    bytes: Uint8Array,
  ) => Array<[string, Uint8Array]>,
): VirtualFS {
  const vfs = new VirtualFS();
  const write = (path: string, bytes: Uint8Array) => {
    const vfsPath = normalizeVfsPath(path);
    const lastSlash = vfsPath.lastIndexOf("/");
    if (lastSlash > 0) {
      vfs.mkdirSync(vfsPath.slice(0, lastSlash), { recursive: true });
    }
    vfs.writeFileSync(vfsPath, bytes);
  };
  for (const [path, bytes] of files) {
    const outputs = transformFile ? transformFile(path, bytes) : [[path, bytes] as [string, Uint8Array]];
    for (const [outPath, outBytes] of outputs) write(outPath, outBytes);
  }
  return vfs;
}

// ─── Entry-file wrapping ────────────────────────────────────────────
//
// almostnode wraps each module in a CommonJS shell, so top-level `await`
// (which the previous AsyncFunction-based runtime supported and which
// several of the canonical examples rely on) is a syntax error.
//
// We solve this by rewriting the *entry* file so its body executes
// inside an async IIFE assigned to `module.exports`. The runtime then
// returns the promise via `result.exports`, which the caller awaits
// before reporting `done`, guaranteeing console writes flush in order.

const WRAP_PROLOGUE = "module.exports = (async () => {\n";
const WRAP_EPILOGUE = "\n})();";

export function wrapEntryAsAsyncIIFE(source: string): string {
  return WRAP_PROLOGUE + source + WRAP_EPILOGUE;
}

// ─── Runtime execution ──────────────────────────────────────────────

export interface ConsoleSink {
  stdout(content: string): void;
  stderr(content: string): void;
}

/** Run the entry file in a fresh almostnode Runtime tied to the given
 *  console sink, awaiting the wrapper IIFE's promise so async work
 *  completes before this function resolves. */
export async function runEntry(
  vfs: VirtualFS,
  entryVfsPath: string,
  sink: ConsoleSink,
): Promise<void> {
  const runtime = new Runtime(vfs, {
    onConsole: (method, args) => {
      const text = args.map(formatArg).join(" ");
      const isErr = method === "error" || method === "warn";
      if (isErr) sink.stderr(text);
      else sink.stdout(text);
    },
  });

  try {
    const result = await runtime.runFileAsync(entryVfsPath);
    const exp = result.exports;
    // The wrapper assigns `(async () => {...})()` to module.exports.
    // Await the resulting promise so user-level top-level `await` is
    // observed by the host, and so any thrown error surfaces here
    // rather than going unhandled in the worker.
    if (
      exp !== null &&
      typeof exp === "object" &&
      typeof (exp as { then?: unknown }).then === "function"
    ) {
      await exp;
    }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.stack || `${err.name}: ${err.message}`
        : String(err);
    sink.stderr(message);
  } finally {
    runtime.clearCache();
  }
}

// ─── Per-run isolation ──────────────────────────────────────────────
//
// The JavaScript and TypeScript workers are long-lived: every
// `<CodeBlock>` and `<ChallengeCard>` on a /learn page (and every run in
// a `<Playground>`) shares ONE worker instance per language via the
// runtime registry. That means the worker's VirtualFS would, if reused,
// persist files, including the entry file, from one block's run into
// the next. A single-file block that doesn't stage its own files would
// then execute whatever entry the *previous* block left behind, so
// running block B right after block A printed block A's output. (See the
// regression test in __tests__/almostnodeRunner.test.ts.)
//
// `AlmostNodeRunner` closes that hole: each run executes against a
// VirtualFS that contains ONLY that run's files. Multi-file callers call
// `stage()` immediately before `run()` (recreating the FS from their
// current workspace snapshot); single-file callers skip `stage()` and
// get a brand-new empty FS. Either way the staged snapshot is consumed
// by the run, so nothing leaks into a subsequent un-staged run.

export class AlmostNodeRunner {
  // Files staged by the most recent `stage()` call, awaiting their run.
  // `null` once a run consumes them (or if `stage()` was never called),
  // so a run that isn't preceded by its own staging starts from a clean,
  // empty filesystem and can't observe the previous run's files or entry.
  private stagedVfs: VirtualFS | null = null;

  /** Stage a complete workspace snapshot into a freshly-created
   *  VirtualFS for the NEXT run. Rebuilt from scratch each call so
   *  deletions/renames in the UI propagate. `transformFile` lets the
   *  TypeScript worker transpile `.ts` sources to `.js` as they're
   *  staged (see `stageFiles`). */
  stage(
    files: Array<[string, Uint8Array]>,
    transformFile?: (
      path: string,
      bytes: Uint8Array,
    ) => Array<[string, Uint8Array]>,
  ): void {
    this.stagedVfs = stageFiles(files, transformFile);
  }

  /** Execute the entry file against a VirtualFS holding only this run's
   *  files, the freshly-staged snapshot if `stage()` was called since
   *  the last run, otherwise a brand-new empty FS.
   *
   *  `resolveEntrySource` is handed that VFS and returns the entry's
   *  source text: the JavaScript worker returns its inline `code`
   *  verbatim (always the authoritative entry source); the TypeScript
   *  worker prefers the staged, already-transpiled copy and falls back to
   *  transpiling inline code. The returned source is wrapped (so
   *  top-level `await` works) and written at `entryVfsPath` before
   *  execution. The staged snapshot is consumed up front so the next
   *  un-staged run is fully isolated even if this one throws. */
  async run(
    entryVfsPath: string,
    resolveEntrySource: (vfs: VirtualFS) => string,
    sink: ConsoleSink,
  ): Promise<void> {
    const vfs = this.stagedVfs ?? new VirtualFS();
    this.stagedVfs = null;
    const entrySource = resolveEntrySource(vfs);
    vfs.writeFileSync(entryVfsPath, wrapEntryAsAsyncIIFE(entrySource));
    await runEntry(vfs, entryVfsPath, sink);
  }
}
