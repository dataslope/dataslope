/// <reference lib="webworker" />

// Web Worker that executes TypeScript code via almostnode. .ts/.tsx
// files are first transpiled to JavaScript with the official TypeScript
// compiler (already a build dependency), then staged into almostnode's
// VirtualFS under .js paths so CommonJS resolution picks them up
// (almostnode's resolver tries .js/.json/.node, not .ts).
//
// Protocol mirrors javascript-worker.ts exactly so the adapter code can
// share the same message shapes.

import { AlmostNodeRunner, normalizeVfsPath } from "./almostnode-worker-shared";
// Shared with scripts/check-js-blocks.mjs so the sweep transpiles with the
// same compiler options this worker does.
import { isTsPath, transpileTs, tsToJsPath } from "./tsTranspile";

declare const self: DedicatedWorkerGlobalScope;

type InMessage =
  | { kind: "prepare-fs"; id: number; files: Array<[string, Uint8Array]> }
  | { kind: "run"; id: number; code: string; entryPath: string };

type OutMessage =
  | { kind: "loading"; message: string }
  | { kind: "ready" }
  | { kind: "prepare-fs-done"; id: number }
  | { kind: "prepare-fs-error"; id: number; message: string }
  | { kind: "stdout"; id: number; content: string }
  | { kind: "stderr"; id: number; content: string }
  | { kind: "done"; id: number };

function post(msg: OutMessage): void {
  self.postMessage(msg);
}


// One runner shared across messages. It hands each run a VirtualFS that
// reflects only that run's files (see AlmostNodeRunner), so neither the
// transpiled entry nor the staged modules from one block's run leak into
// the next on this long-lived worker.
const runner = new AlmostNodeRunner();
// Pending diagnostics from the most recent prepare-fs, replayed as
// stderr on the next run so the user sees compile errors next to the
// failed execution rather than in a void.
let pendingDiagnostics: string[] = [];

async function handlePrepareFs(
  id: number,
  files: Array<[string, Uint8Array]>,
): Promise<void> {
  try {
    pendingDiagnostics = [];
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    runner.stage(files, (path, bytes) => {
      if (!isTsPath(path)) return [[path, bytes]];
      const source = decoder.decode(bytes);
      const { outputText, diagnostics } = transpileTs(source, path);
      if (diagnostics.length > 0) {
        for (const d of diagnostics) pendingDiagnostics.push(`TS (${path}): ${d}`);
      }
      // Write the transpiled JS under the .js-suffixed path. Keep the
      // original .ts file out of the VFS, almostnode's resolver
      // wouldn't use it anyway, and dropping it avoids two competing
      // copies of the same module under different extensions.
      return [[tsToJsPath(path), encoder.encode(outputText)]];
    });
    post({ kind: "prepare-fs-done", id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    post({ kind: "prepare-fs-error", id, message });
  }
}

async function handleRun(
  id: number,
  code: string,
  entryPath: string,
): Promise<void> {
  // Translate the workspace-relative entry path (e.g. "index.ts") to
  // the on-disk VFS path of the transpiled output (e.g. "/index.js").
  const entryVfsPath = normalizeVfsPath(
    isTsPath(entryPath) ? tsToJsPath(entryPath) : entryPath,
  );

  // Flush any diagnostics gathered during prepare-fs first so the user
  // sees them alongside (and before) the run's runtime output.
  for (const msg of pendingDiagnostics) {
    post({ kind: "stderr", id, content: msg });
  }
  pendingDiagnostics = [];

  await runner.run(
    entryVfsPath,
    (vfs) => {
      // Prefer the staged + transpiled copy of the entry file (multi-
      // file). Fall back to transpiling `code` inline when this run
      // wasn't staged (single-file). The runner hands us an empty VFS in
      // the single-file case, so `existsSync` can't pick up a stale entry
      // left by a previous block's run.
      if (vfs.existsSync(entryVfsPath)) {
        return new TextDecoder().decode(vfs.readFileSync(entryVfsPath));
      }
      const { outputText, diagnostics } = transpileTs(code, entryPath);
      for (const d of diagnostics) {
        post({ kind: "stderr", id, content: `TS: ${d}` });
      }
      return outputText;
    },
    {
      stdout: (content) => post({ kind: "stdout", id, content }),
      stderr: (content) => post({ kind: "stderr", id, content }),
    },
  );

  post({ kind: "done", id });
}

let queue: Promise<unknown> = Promise.resolve();
function enqueue(task: () => Promise<void>): void {
  queue = queue.then(task, task).catch(() => {});
}

post({ kind: "ready" });

self.addEventListener("message", (ev: MessageEvent<InMessage>) => {
  const data = ev.data;
  if (data.kind === "prepare-fs") {
    enqueue(() => handlePrepareFs(data.id, data.files));
  } else if (data.kind === "run") {
    enqueue(() => handleRun(data.id, data.code, data.entryPath));
  }
});
