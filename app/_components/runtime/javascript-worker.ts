/// <reference lib="webworker" />

// Web Worker that executes JavaScript code via almostnode — a browser-
// native Node.js runtime. The worker accepts multi-file workspaces,
// stages them into almostnode's VirtualFS, and runs the entry file with
// CommonJS semantics (`require()`, `module.exports`, 40+ Node module
// shims like `fs`, `path`, `http`, `events`).
//
// Protocol
//   Main → Worker  { kind: "prepare-fs"; id: number;
//                    files: Array<[path, Uint8Array]> }
//                  { kind: "run"; id: number; code: string;
//                    entryPath: string }
//   Worker → Main  { kind: "ready" }
//                  { kind: "prepare-fs-done"; id: number }
//                  { kind: "prepare-fs-error"; id: number; message: string }
//                  { kind: "stdout"; id: number; content: string }
//                  { kind: "stderr"; id: number; content: string }
//                  { kind: "done"; id: number }

import { VirtualFS } from "almostnode";
import {
  normalizeVfsPath,
  runEntry,
  stageFiles,
  wrapEntryAsAsyncIIFE,
} from "./almostnode-worker-shared";

declare const self: DedicatedWorkerGlobalScope;

type InMessage =
  | { kind: "prepare-fs"; id: number; files: Array<[string, Uint8Array]> }
  | { kind: "run"; id: number; code: string; entryPath: string };

type OutMessage =
  | { kind: "ready" }
  | { kind: "prepare-fs-done"; id: number }
  | { kind: "prepare-fs-error"; id: number; message: string }
  | { kind: "stdout"; id: number; content: string }
  | { kind: "stderr"; id: number; content: string }
  | { kind: "done"; id: number };

function post(msg: OutMessage): void {
  self.postMessage(msg);
}

// Module-scope VFS so `prepare-fs` and `run` see the same state across
// messages. Recreated on every `prepare-fs` call so deletions/renames
// from the editor flow through cleanly.
let vfs: VirtualFS = new VirtualFS();

async function handlePrepareFs(
  id: number,
  files: Array<[string, Uint8Array]>,
): Promise<void> {
  try {
    vfs = stageFiles(files);
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
  const entryVfsPath = normalizeVfsPath(entryPath);

  // Prefer the staged copy of the entry file (Playground passes it via
  // prepare-fs whenever multi-file mode is in use). If the worker is
  // invoked single-file — no prepare-fs — fall back to the inline
  // `code` argument. This lets the worker work for both flows without
  // a separate code path on the caller side.
  const decoder = new TextDecoder();
  const entrySource = vfs.existsSync(entryVfsPath)
    ? decoder.decode(vfs.readFileSync(entryVfsPath))
    : code;

  // Rewrite the entry file so top-level `await` is legal. See the wrap
  // helper for the precise transform.
  vfs.writeFileSync(entryVfsPath, wrapEntryAsAsyncIIFE(entrySource));

  await runEntry(vfs, entryVfsPath, {
    stdout: (content) => post({ kind: "stdout", id, content }),
    stderr: (content) => post({ kind: "stderr", id, content }),
  });

  post({ kind: "done", id });
}

// Serialise concurrent run requests so async user code can't interleave
// across runs — matches the behaviour of the legacy worker.
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
