/**
 * Workspace export / import as ZIP.
 *
 * Each workspace lives in its own OPFS directory under
 * `workspaces/<id>/` and contains `meta.json` plus arbitrary subtrees
 * (`files/`, `db/`, `data/`, …). The ZIP archive mirrors that directory
 * tree verbatim so users can:
 *
 *   - move a workspace between browsers/devices,
 *   - keep an offline backup,
 *   - share a curated set of files + database state.
 *
 * The archive also carries a top-level `workspace.json` that captures
 * the registry entry (name, playground, createdAt). On import we use
 * `workspace.json` rather than `meta.json` because the playground id is
 * required to register the workspace in the right list — and the rest
 * of the metadata is restored under a fresh workspace id so two
 * imports of the same archive don't clash.
 */

import JSZip from "jszip";

import { isOpfsSupported } from "./featureDetect";
import {
  createWorkspace,
  getWorkspaceRegistry,
  newWorkspaceId,
  updateWorkspaceRegistry,
  type WorkspaceEntry,
} from "./workspace";

const WORKSPACES_DIR = "workspaces";
const ARCHIVE_HEADER_FILE = "workspace.json";

interface ArchiveHeader {
  /** Schema marker — bumped if the on-disk layout changes. */
  version: 1;
  /** Registry display name at export time. */
  name: string;
  /** Playground identifier ("python", "sqlite", …). */
  playground: string;
  /** Original `createdAt` from the source registry entry. */
  createdAt: number;
  /** When the archive was produced. Informational only. */
  exportedAt: number;
}

// ---------------------------------------------------------------------------
// OPFS helpers (kept local to avoid widening the public workspace.ts API).
// ---------------------------------------------------------------------------

async function getWorkspacesDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(WORKSPACES_DIR, { create: true });
}

async function getWorkspaceDir(
  workspaceId: string,
  create: boolean,
): Promise<FileSystemDirectoryHandle> {
  const wsDir = await getWorkspacesDir();
  return wsDir.getDirectoryHandle(workspaceId, { create });
}

type DirIterable = AsyncIterable<[string, FileSystemHandle]>;

/** Recursively writes every file under `dir` into `zipFolder` at the
 *  same relative path. Directory order is unspecified — JSZip handles
 *  that on its end. */
async function addDirToZip(
  dir: FileSystemDirectoryHandle,
  zipFolder: JSZip,
): Promise<void> {
  for await (const [name, handle] of dir as unknown as DirIterable) {
    if (handle.kind === "directory") {
      const subDir = handle as FileSystemDirectoryHandle;
      const subZip = zipFolder.folder(name);
      if (subZip) await addDirToZip(subDir, subZip);
    } else {
      const fileHandle = handle as FileSystemFileHandle;
      const file = await fileHandle.getFile();
      const buf = await file.arrayBuffer();
      zipFolder.file(name, buf);
    }
  }
}

/** Recursively writes every entry under `zipFolder` into `dir`. The
 *  destination is assumed to be empty (the caller creates a fresh
 *  workspace directory before calling). */
async function extractZipIntoDir(
  zip: JSZip,
  dir: FileSystemDirectoryHandle,
  /** Slash-terminated prefix inside the zip we're currently importing. */
  prefix: string,
): Promise<void> {
  // Two passes — once to materialise directories (so out-of-order
  // entries don't try to write into a not-yet-created folder), once for
  // files. JSZip flattens nested folders into path-style entries so we
  // walk the entry table directly rather than relying on its tree.
  const entries: Array<{ path: string; entry: JSZip.JSZipObject }> = [];
  zip.forEach((path, entry) => {
    if (!path.startsWith(prefix)) return;
    const rel = path.slice(prefix.length);
    if (!rel || rel === ARCHIVE_HEADER_FILE) return;
    entries.push({ path: rel, entry });
  });

  // Pre-create directories: JSZip emits dir entries with a trailing `/`,
  // but a file entry like `files/main.py` also implies `files/` must
  // exist. We compute the set of parent dirs from every entry.
  const dirs = new Set<string>();
  for (const { path, entry } of entries) {
    if (entry.dir) {
      dirs.add(stripTrailingSlash(path));
    } else {
      const idx = path.lastIndexOf("/");
      if (idx > 0) dirs.add(path.slice(0, idx));
    }
  }
  // Sort shortest-first so parents are created before children.
  const sortedDirs = Array.from(dirs).sort((a, b) => a.length - b.length);
  for (const d of sortedDirs) {
    await ensureDir(dir, d);
  }

  // Now write file entries.
  for (const { path, entry } of entries) {
    if (entry.dir) continue;
    const bytes = await entry.async("uint8array");
    await writeFileTo(dir, path, bytes);
  }
}

function stripTrailingSlash(p: string): string {
  return p.endsWith("/") ? p.slice(0, -1) : p;
}

async function ensureDir(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<FileSystemDirectoryHandle> {
  const parts = path.split("/").filter(Boolean);
  let cur = root;
  for (const part of parts) {
    cur = await cur.getDirectoryHandle(part, { create: true });
  }
  return cur;
}

async function writeFileTo(
  root: FileSystemDirectoryHandle,
  path: string,
  bytes: Uint8Array,
): Promise<void> {
  const idx = path.lastIndexOf("/");
  const parentPath = idx > 0 ? path.slice(0, idx) : "";
  const filename = idx > 0 ? path.slice(idx + 1) : path;
  const parent = parentPath ? await ensureDir(root, parentPath) : root;
  const fh = await parent.getFileHandle(filename, { create: true });
  const writable = await fh.createWritable();
  await writable.write(
    bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer,
  );
  await writable.close();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns the suggested download filename for a workspace export.
 *  Keeps non-alphanumeric characters from the workspace name so users
 *  can recognise the file, but strips path separators / control chars
 *  to avoid producing an invalid Save-As suggestion on Windows. */
export function suggestExportFilename(entry: WorkspaceEntry): string {
  const safe = entry.name
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  const base = safe || entry.id;
  return `${base}.workspace.zip`;
}

/** Bundles the workspace's OPFS directory into a ZIP `Blob`.
 *  Returns `null` when OPFS is unavailable or the workspace has no
 *  on-disk representation (registry-only). */
export async function exportWorkspaceToZip(
  workspaceId: string,
): Promise<Blob | null> {
  if (!isOpfsSupported()) return null;
  const registry = getWorkspaceRegistry();
  const entry = registry.find((e) => e.id === workspaceId);
  if (!entry) return null;

  let wsDir: FileSystemDirectoryHandle;
  try {
    wsDir = await getWorkspaceDir(workspaceId, false);
  } catch {
    // Directory missing — nothing to export.
    return null;
  }

  const zip = new JSZip();
  await addDirToZip(wsDir, zip);

  const header: ArchiveHeader = {
    version: 1,
    name: entry.name,
    playground: entry.playground,
    createdAt: entry.createdAt,
    exportedAt: Date.now(),
  };
  zip.file(ARCHIVE_HEADER_FILE, JSON.stringify(header, null, 2));

  // DEFLATE keeps the archive small for SQLite/CSV-heavy workspaces;
  // mid-level compression avoids pinning the main thread on large
  // database dumps.
  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 5 },
  });
}

/** Triggers a browser download for the workspace ZIP. Wraps
 *  `exportWorkspaceToZip` so callers can keep the UI side terse. */
export async function downloadWorkspaceZip(
  workspaceId: string,
): Promise<boolean> {
  const blob = await exportWorkspaceToZip(workspaceId);
  if (!blob) return false;
  const registry = getWorkspaceRegistry();
  const entry = registry.find((e) => e.id === workspaceId);
  if (!entry) return false;
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestExportFilename(entry);
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Give the browser a tick to start the download before revoking.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return true;
}

export interface ImportWorkspaceOptions {
  /** Override the registered name. Defaults to the name embedded in
   *  the archive (or the archive filename when the header is missing). */
  nameOverride?: string;
  /** When supplied, the imported workspace is restricted to this
   *  playground. If the archive's header reports a different
   *  playground the import is rejected — this protects users from
   *  loading a SQLite archive into the Python playground by mistake. */
  expectedPlayground?: string;
}

export interface ImportWorkspaceResult {
  entry: WorkspaceEntry;
}

/** Reads a workspace archive (produced by `exportWorkspaceToZip`) and
 *  materialises it as a fresh workspace under a new ID. Returns the
 *  newly-registered entry. Throws on unsupported archives or
 *  playground mismatches so the caller can surface a toast. */
export async function importWorkspaceFromZip(
  file: File | Blob,
  options: ImportWorkspaceOptions = {},
): Promise<ImportWorkspaceResult> {
  if (!isOpfsSupported()) {
    throw new Error("Persistent storage isn't available in this browser.");
  }

  const zip = await JSZip.loadAsync(file);

  // Locate the archive header. We accept it at the root (`workspace.json`)
  // or nested under a single top-level folder so archives produced by
  // alternative tooling (e.g. `zip` from a shell) still import.
  let prefix = "";
  let headerEntry = zip.file(ARCHIVE_HEADER_FILE);
  if (!headerEntry) {
    // Search one level deep.
    const candidates = new Set<string>();
    zip.forEach((path) => {
      const idx = path.indexOf("/");
      if (idx > 0) candidates.add(path.slice(0, idx + 1));
    });
    for (const c of candidates) {
      const cand = zip.file(`${c}${ARCHIVE_HEADER_FILE}`);
      if (cand) {
        headerEntry = cand;
        prefix = c;
        break;
      }
    }
  }
  if (!headerEntry) {
    throw new Error(
      "Not a workspace archive — workspace.json is missing.",
    );
  }

  const headerText = await headerEntry.async("string");
  let header: ArchiveHeader;
  try {
    header = JSON.parse(headerText) as ArchiveHeader;
  } catch {
    throw new Error("Workspace archive header is corrupted.");
  }
  if (header.version !== 1) {
    throw new Error(
      `Unsupported workspace archive version (${String(header.version)}).`,
    );
  }
  if (
    options.expectedPlayground &&
    header.playground !== options.expectedPlayground
  ) {
    throw new Error(
      `This archive belongs to the ${header.playground} playground.`,
    );
  }

  const name = options.nameOverride?.trim() || header.name || "Imported workspace";
  const created = await createWorkspace(name, header.playground);

  // Drop the freshly-created `files/` and `db/` directories before
  // extraction — `createWorkspace` makes them empty, but JSZip may
  // restore alternative subtrees (e.g. `data/`) that we don't want
  // mixed with stale handles.
  let dstDir: FileSystemDirectoryHandle;
  try {
    dstDir = await getWorkspaceDir(created.id, false);
  } catch {
    // Workspace directory missing — bail out and remove the orphan
    // registry entry so the user isn't left with a half-imported
    // workspace.
    const registry = getWorkspaceRegistry().filter((e) => e.id !== created.id);
    updateWorkspaceRegistry(registry);
    throw new Error("Failed to allocate workspace directory.");
  }

  await extractZipIntoDir(zip, dstDir, prefix);

  // Re-write meta.json so the on-disk name matches the registry entry —
  // the source archive's meta still carries the original workspace's
  // name + createdAt which would otherwise be confusing.
  try {
    const metaFh = await dstDir.getFileHandle("meta.json", { create: true });
    const writable = await metaFh.createWritable();
    await writable.write(
      JSON.stringify({
        name: created.name,
        playground: created.playground,
        createdAt: created.createdAt,
      }),
    );
    await writable.close();
  } catch {
    // Registry remains authoritative for the display name.
  }

  return { entry: created };
}

// Re-export for tests / future tooling.
export const __testing = { newWorkspaceId };
