/**
 * OPFS storage for workspace database files, at
 * `workspaces/{workspaceId}/db/{name}`. Writes are debounced (newer writes
 * per key supersede older ones), flushed on idle and eagerly on
 * pagehide/visibilitychange. Uses the async OPFS API, so the full byte array
 * is serialized on each write — slow for large databases.
 */

import { isOpfsSupported } from "./featureDetect";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PendingDbWrite {
  workspaceId: string;
  name: string;
  data: Uint8Array;
}

// ---------------------------------------------------------------------------
// Async write queue (module-level singleton)
// ---------------------------------------------------------------------------

/** Map key: `${workspaceId}/${name}`, newer writes overwrite older ones. */
const pending = new Map<string, PendingDbWrite>();
let scheduled = false;

type IdleCallback = (deadline: {
  didTimeout: boolean;
  timeRemaining: () => number;
}) => void;
interface IdleWindow {
  requestIdleCallback?: (
    cb: IdleCallback,
    opts?: { timeout?: number },
  ) => number;
}

async function flush(): Promise<void> {
  scheduled = false;
  if (pending.size === 0) return;
  if (!isOpfsSupported()) {
    pending.clear();
    return;
  }

  const writes = [...pending.values()];
  pending.clear();

  const root = await navigator.storage.getDirectory();
  for (const w of writes) {
    try {
      const wsDir = await root.getDirectoryHandle("workspaces", {
        create: true,
      });
      const wDir = await wsDir.getDirectoryHandle(w.workspaceId, {
        create: true,
      });
      const dbDir = await wDir.getDirectoryHandle("db", { create: true });
      const fh = await dbDir.getFileHandle(w.name, { create: true });
      const writable = await fh.createWritable();
      await writable.write(w.data as unknown as ArrayBufferView<ArrayBuffer>);
      await writable.close();
    } catch {
      // OPFS write failed; the in-memory copy is still intact in the engine.
    }
  }
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  const w = (typeof window !== "undefined" ? window : undefined) as
    | (Window & IdleWindow)
    | undefined;
  if (w?.requestIdleCallback) {
    w.requestIdleCallback(() => void flush(), { timeout: 500 });
  } else if (typeof setTimeout !== "undefined") {
    setTimeout(() => void flush(), 100);
  } else {
    void flush();
  }
}

// Install unload listeners once so queued writes survive tab close.
if (typeof window !== "undefined") {
  const handler = () => void flush();
  window.addEventListener("pagehide", handler);
  window.addEventListener("visibilitychange", handler);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Queues an async write; I/O happens on the next idle callback or pagehide.
 * Silently dropped when OPFS is unavailable (database stays in-memory only).
 */
export function writeDatabase(
  workspaceId: string,
  name: string,
  data: Uint8Array,
): void {
  pending.set(`${workspaceId}/${name}`, { workspaceId, name, data });
  schedule();
}

/** Reads a database file's raw bytes; null when unavailable or missing. */
export async function readDatabase(
  workspaceId: string,
  name: string,
): Promise<Uint8Array | null> {
  if (!isOpfsSupported()) return null;
  try {
    const root = await navigator.storage.getDirectory();
    const wsDir = await root.getDirectoryHandle("workspaces", {
      create: false,
    });
    const wDir = await wsDir.getDirectoryHandle(workspaceId, { create: false });
    const dbDir = await wDir.getDirectoryHandle("db", { create: false });
    const fh = await dbDir.getFileHandle(name, { create: false });
    const file = await fh.getFile();
    const buf = await file.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

/** Force-flushes all pending database writes. */
export async function flushDatabaseWrites(): Promise<void> {
  await flush();
}
