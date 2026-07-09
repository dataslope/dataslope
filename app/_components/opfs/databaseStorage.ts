/**
 * OPFS database storage for workspace database files (SQLite, etc.).
 *
 * Each database lives at:
 *   opfs root / workspaces / {workspaceId} / db / {name}
 *
 * Writes are debounced: a pending write for the same `(workspaceId, name)` key
 * supersedes any earlier queued write for that key. Flushing happens:
 *  1. On `requestIdleCallback` / `setTimeout` (deferred, idle-time I/O).
 *  2. Eagerly on `pagehide` / `visibilitychange` so database state is not lost
 *     when the user closes the tab.
 *
 * `readDatabase` always reads directly from OPFS.
 *
 * Note: Phase 1 uses the async OPFS API (no synchronous access handles). This
 * means the full database byte array is serialized on each write. For large
 * databases this can be slow; Phase 3 will switch to the native OPFS VFS
 * (`@sqlite.org/sqlite-wasm`) which performs incremental page writes.
 *
 * No UI changes are made in Phase 1; this file is infrastructure only.
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
      await writable.write(w.data);
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
 * Queues an asynchronous write of `data` to the workspace database file
 * identified by `(workspaceId, name)`. Returns immediately; the actual I/O
 * happens on the next idle callback (or `pagehide`).
 *
 * Falls back gracefully when OPFS is unavailable, the write is silently
 * dropped (the database lives only in the engine's in-memory state).
 */
export function writeDatabase(
  workspaceId: string,
  name: string,
  data: Uint8Array,
): void {
  pending.set(`${workspaceId}/${name}`, { workspaceId, name, data });
  schedule();
}

/**
 * Reads the raw bytes of a workspace database file from OPFS.
 * Returns `null` when OPFS is unavailable or the file does not exist.
 */
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

/**
 * Force-flushes all pending database writes. Safe to call before page unload.
 */
export async function flushDatabaseWrites(): Promise<void> {
  await flush();
}
