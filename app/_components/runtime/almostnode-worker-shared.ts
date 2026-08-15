/// <reference lib="webworker" />

// Helpers shared by the JavaScript and TypeScript almostnode workers
// (VirtualFS = in-memory POSIX FS, Runtime = CommonJS executor with shimmed
// Node modules). almostnode is used directly (not `createRuntime`): we're
// already inside a same-origin Web Worker, so another isolation layer buys
// nothing.

import { VirtualFS, Runtime } from "almostnode";

// ─── Console arg formatting ─────────────────────────────────────────
// Mirrors javascript-worker.ts so output stays byte-compatible with the
// previous runtime.

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

/** Workspace-relative path → absolute VFS path (almostnode's resolver
 *  works exclusively in absolute terms). */
export function normalizeVfsPath(p: string): string {
  return p.startsWith("/") ? p : `/${p}`;
}

/** Stage files into a freshly-created VirtualFS. Recreating per
 *  `prepare-fs` mirrors UI deletions/renames — no stale entries linger. */
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
// almostnode's CommonJS shell makes top-level `await` a syntax error, so
// the entry file's body is rewritten into an async IIFE assigned to
// `module.exports`; the caller awaits that promise before reporting done.

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
    // Await the wrapper IIFE's promise so top-level `await` completes and
    // thrown errors surface here instead of going unhandled.
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
// All blocks on a page share ONE long-lived worker per language, so a
// reused VirtualFS would leak one block's files (including the entry) into
// the next block's run (see __tests__/almostnodeRunner.test.ts).
// AlmostNodeRunner gives each run a VFS holding ONLY that run's files:
// multi-file callers stage() right before run(); single-file callers get a
// brand-new empty FS. The staged snapshot is consumed by the run.

export class AlmostNodeRunner {
  // Snapshot from the most recent stage(); null once a run consumes it, so
  // an un-staged run starts from a clean, empty filesystem.
  private stagedVfs: VirtualFS | null = null;

  /** Stage a complete workspace snapshot for the NEXT run. Rebuilt from
   *  scratch each call so UI deletions/renames propagate. `transformFile`
   *  lets the TypeScript worker transpile `.ts` to `.js` while staging. */
  stage(
    files: Array<[string, Uint8Array]>,
    transformFile?: (
      path: string,
      bytes: Uint8Array,
    ) => Array<[string, Uint8Array]>,
  ): void {
    this.stagedVfs = stageFiles(files, transformFile);
  }

  /** Execute the entry against a VFS holding only this run's files (the
   *  staged snapshot, else a new empty FS). `resolveEntrySource` returns
   *  the entry's source text, which is wrapped for top-level `await` and
   *  written at `entryVfsPath`. The snapshot is consumed up front so the
   *  next un-staged run stays isolated even if this one throws. */
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
