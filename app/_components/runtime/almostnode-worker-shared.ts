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
// inside a same-origin Web Worker — the existing security model — so
// adding another layer of isolation (worker-inside-worker or a cross-
// origin sandbox) buys nothing here.

import { VirtualFS, Runtime } from "almostnode";
import { CORS_PROXY_BASE, proxiedUrl, shouldProxyUrl } from "./corsProxy";

// ─── Console arg formatting ─────────────────────────────────────────
//
// Mirrors the formatter from the legacy javascript-worker.ts so output
// in the playground UI is byte-compatible with the previous runtime —
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
 *  renames that happened in the UI — no stale entries linger. */
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
// before reporting `done` — guaranteeing console writes flush in order.

const WRAP_PROLOGUE = "module.exports = (async () => {\n";
const WRAP_EPILOGUE = "\n})();";

export function wrapEntryAsAsyncIIFE(source: string): string {
  return WRAP_PROLOGUE + source + WRAP_EPILOGUE;
}

// ─── Runtime execution ──────────────────────────────────────────────

const PROXY_FETCH_INSTALLED = Symbol.for("dataslope.corsProxyFetchInstalled");

export function installProxyFetch(proxyBase = CORS_PROXY_BASE): void {
  const global = self as unknown as {
    fetch: typeof fetch;
    [PROXY_FETCH_INSTALLED]?: boolean;
  };
  if (!proxyBase || global[PROXY_FETCH_INSTALLED]) return;

  const originalFetch = global.fetch.bind(global);
  global.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (!shouldProxyUrl(url, proxyBase)) return originalFetch(input, init);

    const proxyUrl = proxiedUrl(url, proxyBase);
    if (typeof input === "string" || input instanceof URL) {
      return originalFetch(proxyUrl, init);
    }
    return originalFetch(new Request(proxyUrl, input), init);
  };
  global[PROXY_FETCH_INSTALLED] = true;
}

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
  installProxyFetch();
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
