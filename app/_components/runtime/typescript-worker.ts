/// <reference lib="webworker" />

// Web Worker executing TypeScript via almostnode: .ts/.tsx files are
// transpiled then staged under .js paths (almostnode's resolver tries
// .js/.json/.node, not .ts). Protocol mirrors javascript-worker.ts.

import {
  AlmostNodeRunner,
  BufferedOutput,
  installRejectionReporting,
  normalizeVfsPath,
  type OutputChunk,
} from "./almostnode-worker-shared";
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
  | ({ kind: "output"; id: number } & OutputChunk)
  | {
      kind: "done";
      id: number;
      /** Message for a run that ended in an uncaught error, else null. */
      error: string | null;
      /** Files the program wrote, for the Files panel. */
      createdFiles: Array<[string, Uint8Array]>;
    };

function post(msg: OutMessage): void {
  self.postMessage(msg);
}


// One runner shared across messages; each run gets a VFS with only that
// run's files (see AlmostNodeRunner).
const runner = new AlmostNodeRunner();
// Diagnostics from the last prepare-fs, replayed as stderr on the next run
// so compile errors appear next to the failed execution.
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
      // Only the transpiled .js goes in the VFS; keeping the .ts too would
      // leave two competing copies of the same module.
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
  // Entry path ("index.ts") → transpiled VFS path ("/index.js").
  const entryVfsPath = normalizeVfsPath(
    isTsPath(entryPath) ? tsToJsPath(entryPath) : entryPath,
  );
  const output = new BufferedOutput((chunk) => post({ kind: "output", id, ...chunk }));

  // Flush prepare-fs diagnostics before the run's runtime output.
  for (const msg of pendingDiagnostics) output.write("stderr", `${msg}\n`);
  pendingDiagnostics = [];

  const result = await runner.run(
    entryVfsPath,
    (vfs) => {
      // Prefer the staged transpiled entry (multi-file); fall back to
      // transpiling `code` inline (single-file, where the runner hands us
      // an empty VFS so a stale entry can't be picked up).
      if (vfs.existsSync(entryVfsPath)) {
        return new TextDecoder().decode(vfs.readFileSync(entryVfsPath));
      }
      const { outputText, diagnostics } = transpileTs(code, entryPath);
      for (const d of diagnostics) output.write("stderr", `TS: ${d}\n`);
      return outputText;
    },
    output,
  );
  output.flush();

  post({
    kind: "done",
    id,
    error: result.error,
    createdFiles: result.createdFiles,
  });
}

let queue: Promise<unknown> = Promise.resolve();
function enqueue(task: () => Promise<void>): void {
  queue = queue.then(task, task).catch(() => {});
}

installRejectionReporting();
post({ kind: "ready" });

self.addEventListener("message", (ev: MessageEvent<InMessage>) => {
  const data = ev.data;
  if (data.kind === "prepare-fs") {
    enqueue(() => handlePrepareFs(data.id, data.files));
  } else if (data.kind === "run") {
    enqueue(() => handleRun(data.id, data.code, data.entryPath));
  }
});
