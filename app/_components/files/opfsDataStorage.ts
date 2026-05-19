/**
 * OPFS binary file storage for user-uploaded data files in non-SQL playgrounds.
 *
 * Files live at:
 *   opfs root / workspaces / {workspaceId} / data / {encodedPath}
 *
 * The path is encoded (replacing "/" with "\x00") so nested virtual paths like
 * "folder/file.csv" can be stored flat without creating real sub-directories.
 * A companion manifest ("data/__manifest.json") tracks every stored entry so
 * the panel can reconstruct the full file list (including empty folders) on
 * reload without iterating the directory.
 *
 * All operations are best-effort: when OPFS is unavailable the in-memory
 * VirtualFile list still works; it just won't survive a page refresh.
 */

import { isOpfsSupported } from "../opfs/featureDetect";
import type { VirtualFile } from "../files/FilesPanel";

// Separator used to encode "/" in a virtual path so it can be stored as a
// single OPFS filename. Must not appear in valid file/folder names.
const SEP = "\x00";

function encodePath(virtualPath: string): string {
  return virtualPath.replace(/\//g, SEP);
}

function decodePath(encoded: string): string {
  return encoded.replace(new RegExp(SEP, "g"), "/");
}

// ---------------------------------------------------------------------------
// OPFS helpers
// ---------------------------------------------------------------------------

type IterableDir = AsyncIterable<[string, FileSystemHandle]>;

async function getDataDir(
  workspaceId: string,
  create: boolean,
): Promise<FileSystemDirectoryHandle | null> {
  if (!isOpfsSupported()) return null;
  try {
    const root = await navigator.storage.getDirectory();
    const wsDir = await root.getDirectoryHandle("workspaces", { create });
    const wDir = await wsDir.getDirectoryHandle(workspaceId, { create });
    return wDir.getDirectoryHandle("data", { create });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Manifest — tracks VirtualFile metadata so empty folders survive reloads
// ---------------------------------------------------------------------------

const MANIFEST_NAME = "__manifest.json";

async function readManifest(
  dir: FileSystemDirectoryHandle,
): Promise<VirtualFile[]> {
  try {
    const fh = await dir.getFileHandle(MANIFEST_NAME, { create: false });
    const file = await fh.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[]).filter(isVirtualFile);
  } catch {
    return [];
  }
}

async function writeManifest(
  dir: FileSystemDirectoryHandle,
  entries: VirtualFile[],
): Promise<void> {
  try {
    const fh = await dir.getFileHandle(MANIFEST_NAME, { create: true });
    const writable = await fh.createWritable();
    await writable.write(JSON.stringify(entries));
    await writable.close();
  } catch {
    // OPFS write failed; manifest stays stale until next successful write.
  }
}

function isVirtualFile(v: unknown): v is VirtualFile {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.path === "string" &&
    typeof o.size === "number" &&
    typeof o.isFolder === "boolean"
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Loads all VirtualFile entries for the workspace from OPFS.
 * Returns an empty array when OPFS is unavailable or no data has been stored.
 */
export async function loadDataFiles(
  workspaceId: string,
): Promise<VirtualFile[]> {
  const dir = await getDataDir(workspaceId, false);
  if (!dir) return [];
  return readManifest(dir);
}

/**
 * Writes a binary file to the workspace's data directory and updates the
 * manifest so the entry survives reloads.
 */
export async function writeDataFile(
  workspaceId: string,
  virtualPath: string,
  bytes: Uint8Array,
): Promise<void> {
  const dir = await getDataDir(workspaceId, true);
  if (!dir) return;
  try {
    const fh = await dir.getFileHandle(encodePath(virtualPath), {
      create: true,
    });
    const writable = await fh.createWritable();
    await writable.write(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    await writable.close();

    // Update manifest
    const manifest = await readManifest(dir);
    const filtered = manifest.filter((f) => f.path !== virtualPath);
    filtered.push({ path: virtualPath, size: bytes.length, isFolder: false });
    await writeManifest(dir, filtered);
  } catch {
    // OPFS write failed; caller's in-memory state is unaffected.
  }
}

/**
 * Reads a binary file from the workspace's data directory.
 * Returns null when the file does not exist or OPFS is unavailable.
 */
export async function readDataFile(
  workspaceId: string,
  virtualPath: string,
): Promise<Uint8Array | null> {
  const dir = await getDataDir(workspaceId, false);
  if (!dir) return null;
  try {
    const fh = await dir.getFileHandle(encodePath(virtualPath), {
      create: false,
    });
    const file = await fh.getFile();
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Deletes a file (or folder marker) from the workspace's data directory.
 * If the path is a folder, all children are also removed.
 */
export async function deleteDataEntry(
  workspaceId: string,
  virtualPath: string,
): Promise<void> {
  const dir = await getDataDir(workspaceId, false);
  if (!dir) return;

  const manifest = await readManifest(dir);
  const prefix = `${virtualPath}/`;
  const toRemove = manifest.filter(
    (f) => f.path === virtualPath || f.path.startsWith(prefix),
  );

  for (const entry of toRemove) {
    if (entry.isFolder) continue;
    try {
      await dir.removeEntry(encodePath(entry.path));
    } catch {
      // File may not exist; continue.
    }
  }

  const remaining = manifest.filter(
    (f) => f.path !== virtualPath && !f.path.startsWith(prefix),
  );
  await writeManifest(dir, remaining);
}

/**
 * Renames (or moves) a virtual path within the workspace data directory.
 * Handles both files and folders (including all descendants).
 */
export async function renameDataEntry(
  workspaceId: string,
  oldPath: string,
  newPath: string,
): Promise<void> {
  const dir = await getDataDir(workspaceId, true);
  if (!dir) return;

  const manifest = await readManifest(dir);
  const oldPrefix = `${oldPath}/`;
  const newPrefix = `${newPath}/`;

  const affected = manifest.filter(
    (f) => f.path === oldPath || f.path.startsWith(oldPrefix),
  );

  for (const entry of affected) {
    if (entry.isFolder) continue;
    const dest =
      entry.path === oldPath
        ? newPath
        : `${newPrefix}${entry.path.slice(oldPrefix.length)}`;
    try {
      const srcFh = await dir.getFileHandle(encodePath(entry.path), {
        create: false,
      });
      const file = await srcFh.getFile();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const dstFh = await dir.getFileHandle(encodePath(dest), { create: true });
      const writable = await dstFh.createWritable();
      await writable.write(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
      await writable.close();
      await dir.removeEntry(encodePath(entry.path));
    } catch {
      // Skip unreadable entries; they'll be corrected on next write.
    }
  }

  const updated = manifest.map((f) => {
    if (f.path === oldPath) return { ...f, path: newPath };
    if (f.path.startsWith(oldPrefix)) {
      return { ...f, path: `${newPrefix}${f.path.slice(oldPrefix.length)}` };
    }
    return f;
  });
  await writeManifest(dir, updated);
}

/**
 * Upserts a folder marker in the manifest so empty folders survive reloads.
 */
export async function upsertDataFolder(
  workspaceId: string,
  folderPath: string,
): Promise<void> {
  const dir = await getDataDir(workspaceId, true);
  if (!dir) return;
  const manifest = await readManifest(dir);
  if (!manifest.some((f) => f.path === folderPath && f.isFolder)) {
    manifest.push({ path: folderPath, size: 0, isFolder: true });
    await writeManifest(dir, manifest);
  }
}
