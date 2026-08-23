/**
 * OPFS workspace management. A workspace is a named OPFS directory holding
 * `meta.json`, `files/` (editor tabs), and `db/` (database binaries). The
 * localStorage registry is a synchronously-readable list of known workspaces;
 * OPFS is the authoritative data source. Web Locks enforce one tab per
 * workspace.
 */

import { isOpfsSupported, hasWebLocks } from "./featureDetect";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkspaceEntry {
  /** Stable unique identifier, also the OPFS directory name. */
  id: string;
  /** User-visible display name. */
  name: string;
  /** Playground identifier, e.g. "sqlite" | "python" | "javascript". */
  playground: string;
  /** Unix ms at creation. */
  createdAt: number;
  /** Unix ms, updated on every open. */
  lastUsedAt: number;
}

interface WorkspaceMeta {
  name: string;
  playground: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** localStorage key the workspace registry lives under. Exported so a
 *  panel can tell a `storage` event about workspaces from any other. */
export const WORKSPACE_REGISTRY_KEY = "playground_workspaces";
const REGISTRY_KEY = WORKSPACE_REGISTRY_KEY;
// Pre-rename key; read as a fallback and migrated forward so old builds'
// workspace lists survive the upgrade.
const LEGACY_REGISTRY_KEY = "pg_workspaces";
const WORKSPACES_DIR = "workspaces";

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

/** Generates a workspace ID (same pattern as `newTabId()` in sqlitePlaygroundTabs.ts). */
export function newWorkspaceId(): string {
  return `ws_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// Registry (localStorage)
// ---------------------------------------------------------------------------

/** Reads the workspace registry from localStorage. Returns an empty array when
 *  localStorage is unavailable or the stored value is corrupt. */
export function getWorkspaceRegistry(): WorkspaceEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.filter(isValidEntry) : [];
    }
    // One-time migration from the legacy key.
    const legacyRaw = localStorage.getItem(LEGACY_REGISTRY_KEY);
    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw) as unknown;
      const entries = Array.isArray(legacyParsed)
        ? legacyParsed.filter(isValidEntry)
        : [];
      if (entries.length > 0) updateWorkspaceRegistry(entries);
      return entries;
    }
    return [];
  } catch {
    return [];
  }
}

/** Persists the workspace registry to localStorage. */
export function updateWorkspaceRegistry(entries: WorkspaceEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(entries));
  } catch {
    // Quota exceeded / private mode, silently ignore.
  }
}

function isValidEntry(e: unknown): e is WorkspaceEntry {
  if (!e || typeof e !== "object") return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    typeof obj.playground === "string" &&
    typeof obj.createdAt === "number" &&
    typeof obj.lastUsedAt === "number"
  );
}

// ---------------------------------------------------------------------------
// OPFS helpers
// ---------------------------------------------------------------------------

/** Returns the root OPFS `workspaces/` directory, creating it if absent. */
async function getWorkspacesDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(WORKSPACES_DIR, { create: true });
}

/** Returns the OPFS directory for a specific workspace. */
async function getWorkspaceDir(
  workspaceId: string,
  create: boolean,
): Promise<FileSystemDirectoryHandle> {
  const wsDir = await getWorkspacesDir();
  return wsDir.getDirectoryHandle(workspaceId, { create });
}

/**
 * True when a workspace's OPFS directory still exists. Used by the sign-in
 * resume path to confirm a stashed draft's files weren't evicted before
 * re-adopting it. False when OPFS is unavailable.
 */
export async function workspaceExistsInOpfs(id: string): Promise<boolean> {
  if (!isOpfsSupported()) return false;
  try {
    const wsDir = await getWorkspacesDir();
    await wsDir.getDirectoryHandle(id, { create: false });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Workspace CRUD
// ---------------------------------------------------------------------------

/**
 * Creates a workspace: writes `meta.json`, `files/`, and `db/` to OPFS and
 * (by default) registers it. `{ register: false }` creates an unregistered
 * draft, promoted later via `registerWorkspace` on explicit save. `{ id }`
 * pins the identifier so a materialized cloud copy keeps the cloud id. If
 * OPFS is unavailable the entry is still returned with no backing.
 */
export async function createWorkspace(
  name: string,
  playground: string,
  opts: { register?: boolean; id?: string } = {},
): Promise<WorkspaceEntry> {
  const { register = true } = opts;
  const id = opts.id ?? newWorkspaceId();
  const now = Date.now();
  const entry: WorkspaceEntry = {
    id,
    name,
    playground,
    createdAt: now,
    lastUsedAt: now,
  };

  if (isOpfsSupported()) {
    try {
      const dir = await getWorkspaceDir(id, true);
      const meta: WorkspaceMeta = { name, playground, createdAt: now };
      const metaFh = await dir.getFileHandle("meta.json", { create: true });
      const writable = await metaFh.createWritable();
      await writable.write(JSON.stringify(meta));
      await writable.close();
      await dir.getDirectoryHandle("files", { create: true });
      await dir.getDirectoryHandle("db", { create: true });
    } catch {
      // OPFS write failed; proceed with registry-only entry.
    }
  }

  if (register) {
    const registry = getWorkspaceRegistry();
    registry.push(entry);
    updateWorkspaceRegistry(registry);
  }
  return entry;
}

/**
 * Adds or updates a registry entry, promoting a draft to a saved workspace.
 * Idempotent; `name` overrides the entry's name when supplied.
 */
export function registerWorkspace(
  entry: WorkspaceEntry,
  name?: string,
): WorkspaceEntry {
  const saved: WorkspaceEntry = {
    ...entry,
    name: name ?? entry.name,
    lastUsedAt: Date.now(),
  };
  const registry = getWorkspaceRegistry();
  const idx = registry.findIndex((e) => e.id === saved.id);
  if (idx === -1) registry.push(saved);
  else registry[idx] = saved;
  updateWorkspaceRegistry(registry);
  return saved;
}

/**
 * Opens a workspace: bumps `lastUsedAt` and returns the entry, or `null`
 * when it is not in the registry.
 */
export async function openWorkspace(
  id: string,
): Promise<WorkspaceEntry | null> {
  const registry = getWorkspaceRegistry();
  const idx = registry.findIndex((e) => e.id === id);
  if (idx === -1) return null;

  const entry = registry[idx];
  const now = Date.now();
  const updated: WorkspaceEntry = { ...entry, lastUsedAt: now };
  registry[idx] = updated;
  updateWorkspaceRegistry(registry);
  return updated;
}

/**
 * Deletes a workspace's OPFS directory and registry entry. Safe when OPFS is
 * unavailable or the directory is missing.
 */
export async function deleteWorkspace(id: string): Promise<void> {
  if (isOpfsSupported()) {
    try {
      const wsDir = await getWorkspacesDir();
      await wsDir.removeEntry(id, { recursive: true });
    } catch {
      // Directory may not exist; ignore.
    }
  }

  const registry = getWorkspaceRegistry().filter((e) => e.id !== id);
  updateWorkspaceRegistry(registry);
}

/**
 * Renames a workspace in the registry and (best-effort) `meta.json`.
 * Returns `null` if it is not in the registry.
 */
export async function renameWorkspace(
  id: string,
  newName: string,
): Promise<WorkspaceEntry | null> {
  const trimmed = newName.trim();
  if (!trimmed) return null;
  const registry = getWorkspaceRegistry();
  const idx = registry.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  const updated: WorkspaceEntry = { ...registry[idx], name: trimmed };
  registry[idx] = updated;
  updateWorkspaceRegistry(registry);

  if (isOpfsSupported()) {
    try {
      const dir = await getWorkspaceDir(id, false);
      const meta: WorkspaceMeta = {
        name: trimmed,
        playground: updated.playground,
        createdAt: updated.createdAt,
      };
      const metaFh = await dir.getFileHandle("meta.json", { create: true });
      const writable = await metaFh.createWritable();
      await writable.write(JSON.stringify(meta));
      await writable.close();
    } catch {
      // Registry is the authoritative name source; rename still effective.
    }
  }

  return updated;
}

/**
 * Duplicates a workspace's OPFS tree into a freshly-created workspace.
 * Returns `null` when the source is unknown to both registry and OPFS.
 */
export async function duplicateWorkspace(
  sourceId: string,
  newName: string,
): Promise<WorkspaceEntry | null> {
  // The source may be an unsaved draft absent from the registry; fall back to
  // its own metadata on disk.
  const source =
    getWorkspaceRegistry().find((e) => e.id === sourceId) ??
    (await readOpfsWorkspaceMeta(sourceId));
  if (!source) return null;

  const created = await createWorkspace(newName, source.playground);

  if (isOpfsSupported()) {
    try {
      const wsDir = await getWorkspacesDir();
      const srcDir = await wsDir.getDirectoryHandle(sourceId, {
        create: false,
      });
      const dstDir = await wsDir.getDirectoryHandle(created.id, {
        create: true,
      });
      await copyDirectoryHandle(srcDir, dstDir);
    } catch {
      // Source missing or unreadable; leave the new workspace empty.
    }
  }

  return created;
}

/** What OPFS itself knows about a workspace directory, independent of the
 *  localStorage registry. */
export interface OpfsWorkspace {
  id: string;
  name: string;
  playground: string;
  createdAt: number;
  /** True when `files/` or `db/` holds anything. An empty shell (false) is
   *  the only thing safe to delete unprompted. */
  hasContent: boolean;
}

/**
 * Every workspace directory OPFS holds, read from each one's `meta.json` so
 * unregistered drafts are included. Unreadable directories are skipped.
 * Empty when OPFS is unavailable.
 */
export async function listOpfsWorkspaces(): Promise<OpfsWorkspace[]> {
  if (!isOpfsSupported()) return [];
  type IterableDir = AsyncIterable<[string, FileSystemHandle]>;
  const out: OpfsWorkspace[] = [];
  try {
    const wsDir = await getWorkspacesDir();
    const ids: string[] = [];
    for await (const [name] of wsDir as unknown as IterableDir) ids.push(name);
    for (const id of ids) {
      try {
        const dir = await wsDir.getDirectoryHandle(id, { create: false });
        const metaFh = await dir.getFileHandle("meta.json", { create: false });
        const parsed = JSON.parse(await (await metaFh.getFile()).text()) as
          | WorkspaceMeta
          | undefined;
        if (
          !parsed ||
          typeof parsed.name !== "string" ||
          typeof parsed.playground !== "string"
        ) {
          continue;
        }
        out.push({
          id,
          name: parsed.name,
          playground: parsed.playground,
          createdAt:
            typeof parsed.createdAt === "number" ? parsed.createdAt : 0,
          hasContent: await directoryHasContent(dir),
        });
      } catch {
        // Not a workspace directory, or its metadata is unreadable.
      }
    }
  } catch {
    return out;
  }
  return out;
}

/**
 * A workspace's own `meta.json` (covers unsaved drafts the registry doesn't
 * know). Null when OPFS is unavailable or the metadata is unreadable.
 */
export async function readOpfsWorkspaceMeta(
  id: string,
): Promise<{ name: string; playground: string; createdAt: number } | null> {
  if (!isOpfsSupported()) return null;
  try {
    const dir = await getWorkspaceDir(id, false);
    const metaFh = await dir.getFileHandle("meta.json", { create: false });
    const parsed = JSON.parse(await (await metaFh.getFile()).text()) as
      | WorkspaceMeta
      | undefined;
    if (
      !parsed ||
      typeof parsed.name !== "string" ||
      typeof parsed.playground !== "string"
    ) {
      return null;
    }
    return {
      name: parsed.name,
      playground: parsed.playground,
      createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : 0,
    };
  } catch {
    return null;
  }
}

/** True when either payload subdirectory holds at least one entry. */
async function directoryHasContent(
  dir: FileSystemDirectoryHandle,
): Promise<boolean> {
  type IterableDir = AsyncIterable<[string, FileSystemHandle]>;
  for (const sub of ["files", "db"]) {
    try {
      const child = await dir.getDirectoryHandle(sub, { create: false });
      for await (const _entry of child as unknown as IterableDir) {
        void _entry;
        return true;
      }
    } catch {
      // Subdirectory absent, which counts as empty.
    }
  }
  return false;
}

/** Recursively copies the contents of `src` into `dst`. Skips `meta.json`
 *  since the destination already has its own. */
async function copyDirectoryHandle(
  src: FileSystemDirectoryHandle,
  dst: FileSystemDirectoryHandle,
): Promise<void> {
  type IterableDir = AsyncIterable<[string, FileSystemHandle]>;
  for await (const [name, handle] of src as unknown as IterableDir) {
    if (name === "meta.json") continue;
    if (handle.kind === "directory") {
      const child = handle as FileSystemDirectoryHandle;
      const dstChild = await dst.getDirectoryHandle(name, { create: true });
      await copyDirectoryHandle(child, dstChild);
    } else {
      const fileHandle = handle as FileSystemFileHandle;
      const file = await fileHandle.getFile();
      const dstFh = await dst.getFileHandle(name, { create: true });
      const writable = await dstFh.createWritable();
      await writable.write(await file.arrayBuffer());
      await writable.close();
    }
  }
}

// ---------------------------------------------------------------------------
// Web Locks, cross-tab workspace exclusivity
// ---------------------------------------------------------------------------

/** Minimal type surface for the Web Locks API used below. */
interface LockManager {
  request: (
    name: string,
    options: { mode?: "exclusive" | "shared"; signal?: AbortSignal },
    callback: (lock: unknown) => Promise<unknown> | unknown,
  ) => Promise<unknown>;
  /** Optional: absent in older browsers that still have `request`. */
  query?: () => Promise<{ held?: { name?: string }[] }>;
}

function workspaceLockName(workspaceId: string): string {
  return `playground_workspace_${workspaceId}`;
}

/**
 * Whether `workspaceId`'s lock is held (workspace open in another tab).
 * Read-only probe: never queues for or takes the lock. Best-effort `false`
 * when Web Locks/`query` is unavailable; `acquireWorkspaceLock` remains the
 * real enforcement. Sees this document's own locks too, so call only before
 * acquiring.
 */
export async function isWorkspaceLockHeld(
  workspaceId: string,
): Promise<boolean> {
  if (!hasWebLocks()) return false;
  const locks = (navigator as unknown as { locks: LockManager }).locks;
  if (typeof locks.query !== "function") return false;
  try {
    const state = await locks.query();
    const name = workspaceLockName(workspaceId);
    return (state.held ?? []).some((lock) => lock.name === name);
  } catch {
    return false;
  }
}

/** Options for {@link acquireWorkspaceLock}. */
export interface WorkspaceLockOptions {
  /**
   * Aborting this signal releases the held lock; pass the acquiring effect's
   * cleanup signal. Without it the lock leaks for the document's lifetime and
   * a remount (e.g. back/forward) collides with its own stale lock, reporting
   * a spurious "open in another tab" conflict.
   */
  signal?: AbortSignal;
  /**
   * How long to wait for the lock before declaring a conflict, in ms (default
   * 1500). Lets a tearing-down predecessor hand the lock over; a live tab
   * holds it for its whole lifetime, so a real conflict still times out.
   */
  graceMs?: number;
}

/**
 * Acquires an exclusive Web Lock for `workspaceId`, held until `opts.signal`
 * aborts or the tab closes. Returns `false` if another live tab still holds
 * it after the grace window; `true` unconditionally when Web Locks is
 * unavailable (callers proceed with a warning).
 */
export async function acquireWorkspaceLock(
  workspaceId: string,
  opts: WorkspaceLockOptions = {},
): Promise<boolean> {
  if (!hasWebLocks()) return true;
  const { signal: releaseSignal, graceMs = 1500 } = opts;
  if (releaseSignal?.aborted) return false;

  const locks = (navigator as unknown as { locks: LockManager }).locks;
  const lockName = workspaceLockName(workspaceId);

  return new Promise<boolean>((resolve) => {
    // Queued request (not `ifAvailable`) so a mid-release predecessor can
    // hand over within the window; the wait aborts on grace timeout or caller
    // unmount before grant.
    const waitController = new AbortController();
    const timer = setTimeout(() => waitController.abort(), graceMs);
    const onCallerAbort = () => waitController.abort();
    releaseSignal?.addEventListener("abort", onCallerAbort, { once: true });
    const endWait = () => {
      clearTimeout(timer);
      releaseSignal?.removeEventListener("abort", onCallerAbort);
    };

    let granted = false;
    locks
      .request(lockName, { signal: waitController.signal }, () => {
        granted = true;
        endWait();
        resolve(true);
        // Hold until the caller releases (effect cleanup) or the tab closes,
        // then settle so the browser frees the lock for the next waiter.
        return new Promise<void>((release) => {
          if (!releaseSignal) return; // hold until the tab is closed
          if (releaseSignal.aborted) release();
          else
            releaseSignal.addEventListener("abort", () => release(), {
              once: true,
            });
        });
      })
      .catch(() => {
        // Wait aborted before grant: grace elapsed (real conflict) or the
        // caller unmounted mid-wait.
        endWait();
        if (!granted) resolve(false);
      });
  });
}
