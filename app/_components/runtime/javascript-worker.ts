/// <reference lib="webworker" />

// Web Worker executing JavaScript via almostnode: multi-file workspaces
// stage into VirtualFS and the entry runs with CommonJS semantics.
// Protocol: see In/OutMessage below.

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

// One runner shared across messages; each run gets a VFS with only that
// run's files, so state can't leak between blocks on this long-lived worker.
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

  // `code` is always the authoritative entry source; using it directly
  // guarantees a single-file run never executes a leftover entry file.
  await runner.run(entryVfsPath, () => code, {
    stdout: (content) => post({ kind: "stdout", id, content }),
    stderr: (content) => post({ kind: "stderr", id, content }),
  });

  post({ kind: "done", id });
}

// Serialise requests so async user code can't interleave across runs.
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
