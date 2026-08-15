/**
 * OPFS file storage for workspace editor files, at
 * `workspaces/{workspaceId}/files/{fileId}`. Writes coalesce in a queue
 * flushed on idle and eagerly on pagehide/visibilitychange so edits survive
 * tab close. Reads are uncached; callers keep their own dirty buffers.
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

/** Map key: `${workspaceId}/${fileId}`, newer writes overwrite older ones. */
const pending = new Map<string, PendingFileWrite>();
let scheduled = false;

/** FileSystemDirectoryHandle is async-iterable per spec, but the TS DOM lib
 *  types don't include [Symbol.asyncIterator] yet. */
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
 * Queues an async write; I/O happens on the next idle callback or pagehide.
 * Silently dropped when OPFS is unavailable (callers keep their own buffer).
 */
export function writeFile(
  workspaceId: string,
  fileId: string,
  content: string,
): void {
  pending.set(`${workspaceId}/${fileId}`, { workspaceId, fileId, content });
  schedule();
}

/** Reads a workspace file. Null when OPFS is unavailable or the file is missing. */
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

/** Deletes a workspace file. Safe when the file does not exist. */
export async function deleteFile(
  workspaceId: string,
  fileId: string,
): Promise<void> {
  // Cancel any pending queued write for this file.
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

/** Lists file IDs in a workspace's `files/` directory; empty when OPFS or
 *  the directory is unavailable. */
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

/** Force-flushes all pending file writes. */
export async function flushFileWrites(): Promise<void> {
  await flush();
}

/** Recursively sums file sizes under a workspace's OPFS directory, in bytes.
 *  0 when OPFS is unavailable or the workspace has no backing directory. */
export async function estimateWorkspaceSize(
  workspaceId: string,
): Promise<number> {
  if (!isOpfsSupported()) return 0;
  try {
    const root = await navigator.storage.getDirectory();
    const wsDir = await root.getDirectoryHandle("workspaces", {
      create: false,
    });
    const wDir = await wsDir.getDirectoryHandle(workspaceId, { create: false });
    return await sumDirectory(wDir);
  } catch {
    return 0;
  }
}

async function sumDirectory(dir: FileSystemDirectoryHandle): Promise<number> {
  let total = 0;
  for await (const [, handle] of dir as unknown as IterableDir) {
    if (handle.kind === "directory") {
      total += await sumDirectory(handle as FileSystemDirectoryHandle);
    } else {
      try {
        const file = await (handle as FileSystemFileHandle).getFile();
        total += file.size;
      } catch {
        // Unreadable file, skip.
      }
    }
  }
  return total;
}
