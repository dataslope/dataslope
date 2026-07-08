/// <reference lib="webworker" />

// Web Worker that executes JavaScript code via almostnode, a browser-
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

import { AlmostNodeRunner, normalizeVfsPath } from "./almostnode-worker-shared";

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

// One runner shared across messages. It hands each run a VirtualFS that
// reflects only that run's files, so the entry/file state from one
// block's run can't leak into the next on this long-lived worker.
const runner = new AlmostNodeRunner();

async function handlePrepareFs(
  id: number,
  files: Array<[string, Uint8Array]>,
): Promise<void> {
  try {
    runner.stage(files);
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

  // The `code` argument is always the authoritative entry source: every
  // caller passes the entry file's exact bytes here, and in multi-file
  // mode stages those same bytes via prepare-fs. Using it directly (over
  // whatever happens to sit at `entryVfsPath`) is what guarantees a
  // single-file run executes its own code rather than the previous
  // block's leftover entry file.
  await runner.run(entryVfsPath, () => code, {
    stdout: (content) => post({ kind: "stdout", id, content }),
    stderr: (content) => post({ kind: "stderr", id, content }),
  });

  post({ kind: "done", id });
}

// Serialise concurrent run requests so async user code can't interleave
// across runs, matches the behaviour of the legacy worker.
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
