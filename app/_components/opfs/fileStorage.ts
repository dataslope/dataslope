/**
 * OPFS file storage for workspace editor files (code tabs).
 *
 * Each file lives at:
 *   opfs root / workspaces / {workspaceId} / files / {fileId}
 *
 * Writes are coalesced via an async write queue (mirroring the
 * `persistedStorage.ts` pattern for localStorage) and flushed:
 *  1. On `requestIdleCallback` / `setTimeout` (deferred, idle-time I/O).
 *  2. Eagerly on `pagehide` / `visibilitychange` so no edits are lost when
 *     the user closes the tab.
 *
 * `readFile` always reads directly from OPFS (no caching here — callers
 * maintain their own in-memory dirty buffers in Zustand).
 *
 * No UI changes are made in Phase 1; this file is infrastructure only.
 */

import { isOpfsSupported } from "./featureDetect";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PendingFileWrite {
  workspaceId: string;
  fileId: string;
  content: string;
}

// ---------------------------------------------------------------------------
// Async write queue (module-level singleton)
// ---------------------------------------------------------------------------

/** Map key: `${workspaceId}/${fileId}` — newer writes overwrite older ones. */
const pending = new Map<string, PendingFileWrite>();
let scheduled = false;

/** The WHATWG spec defines FileSystemDirectoryHandle as async-iterable but
 *  the TypeScript DOM lib types don't yet include [Symbol.asyncIterator]. */
type IterableDir = AsyncIterable<[string, FileSystemHandle]>;

type IdleCallback = (deadline: {
  didTimeout: boolean;
  timeRemaining: () => number;
}) => void;
interface IdleWindow {
  requestIdleCallback?: (cb: IdleCallback, opts?: { timeout?: number }) => number;
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
      const fDir = await wDir.getDirectoryHandle("files", { create: true });
      const fh = await fDir.getFileHandle(w.fileId, { create: true });
      const writable = await fh.createWritable();
      await writable.write(w.content);
      await writable.close();
    } catch {
      // OPFS write failed; content is still in the caller's dirty buffer.
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
 * Queues an asynchronous write of `content` to the workspace file identified
 * by `(workspaceId, fileId)`. Returns immediately; the actual I/O happens on
 * the next idle callback (or `pagehide`).
 *
 * Falls back gracefully when OPFS is unavailable — the write is silently
 * dropped (callers must maintain their own in-memory dirty buffer).
 */
export function writeFile(
  workspaceId: string,
  fileId: string,
  content: string,
): void {
  pending.set(`${workspaceId}/${fileId}`, { workspaceId, fileId, content });
  schedule();
}

/**
 * Reads the content of a workspace file from OPFS.
 * Returns `null` when OPFS is unavailable or the file does not exist.
 */
export async function readFile(
  workspaceId: string,
  fileId: string,
): Promise<string | null> {
  if (!isOpfsSupported()) return null;
  try {
    const root = await navigator.storage.getDirectory();
    const wsDir = await root.getDirectoryHandle("workspaces", {
      create: false,
    });
    const wDir = await wsDir.getDirectoryHandle(workspaceId, { create: false });
    const fDir = await wDir.getDirectoryHandle("files", { create: false });
    const fh = await fDir.getFileHandle(fileId, { create: false });
    const file = await fh.getFile();
    return file.text();
  } catch {
    return null;
  }
}

/**
 * Deletes a workspace file from OPFS.
 * Safe to call when the file does not exist.
 */
export async function deleteFile(
  workspaceId: string,
  fileId: string,
): Promise<void> {
  // Also cancel any pending queued write for this file.
  pending.delete(`${workspaceId}/${fileId}`);
  if (!isOpfsSupported()) return;
  try {
    const root = await navigator.storage.getDirectory();
    const wsDir = await root.getDirectoryHandle("workspaces", {
      create: false,
    });
    const wDir = await wsDir.getDirectoryHandle(workspaceId, { create: false });
    const fDir = await wDir.getDirectoryHandle("files", { create: false });
    await fDir.removeEntry(fileId);
  } catch {
    // File or directory may not exist; ignore.
  }
}

/**
 * Lists all file IDs (OPFS entry names) inside a workspace's `files/`
 * directory. Returns an empty array when OPFS is unavailable or the workspace
 * directory does not exist.
 */
export async function listFiles(workspaceId: string): Promise<string[]> {
  if (!isOpfsSupported()) return [];
  const names: string[] = [];
  try {
    const root = await navigator.storage.getDirectory();
    const wsDir = await root.getDirectoryHandle("workspaces", {
      create: false,
    });
    const wDir = await wsDir.getDirectoryHandle(workspaceId, { create: false });
    const fDir = await wDir.getDirectoryHandle("files", { create: false });
    for await (const [name] of fDir as unknown as IterableDir) {
      names.push(name);
    }
  } catch {
    // Directory may not exist; return empty.
  }
  return names;
}

/**
 * Force-flushes all pending file writes. Safe to call before page unload or
 * after a tab switch when you need the OPFS state to be fully up to date.
 */
export async function flushFileWrites(): Promise<void> {
  await flush();
}
