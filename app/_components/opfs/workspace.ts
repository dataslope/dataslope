/**
 * OPFS workspace management.
 *
 * A workspace is a named, isolated directory inside OPFS that holds:
 *  - `meta.json`, workspace metadata (name, playground, timestamps)
 *  - `files/`, user code files (one file per editor tab)
 *  - `db/`, database binaries (SQLite, etc.)
 *
 * The workspace registry is a lightweight list of all known workspaces stored
 * in `localStorage` so it can be read synchronously on page load. OPFS
 * directories are the authoritative source of workspace data.
 *
 * Cross-tab exclusivity is enforced via the Web Locks API: only one browser
 * tab may hold a given workspace at a time. Use `acquireWorkspaceLock()` when
 * opening a workspace and surface a warning if the lock is unavailable.
 *
 * No UI changes are made in Phase 1; this file is infrastructure only.
 */

import { isOpfsSupported, hasWebLocks } from "./featureDetect";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkspaceEntry {
  /** Stable, globally-unique identifier, also the OPFS directory name. */
  id: string;
  /** User-visible display name, e.g. "My SQLite Project". */
  name: string;
  /** Playground identifier, e.g. "sqlite" | "python" | "javascript". */
  playground: string;
  /** Unix timestamp (ms) when the workspace was first created. */
  createdAt: number;
  /** Unix timestamp (ms) updated every time the workspace is opened. */
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

const REGISTRY_KEY = "playground_workspaces";
// The registry key was `pg_workspaces` before the #409 `pg_` → `playground_`
// storage-namespace rename. Read it once as a fallback (and migrate it
// forward) so users who created workspaces on the old build don't lose their
// workspace list on upgrade, mirroring `getStoredEditorTheme`'s legacy-key
// handling.
const LEGACY_REGISTRY_KEY = "pg_workspaces";
const WORKSPACES_DIR = "workspaces";

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

/**
 * Generates a new stable, human-readable workspace ID.
 * Matches the pattern used by `newTabId()` in sqlitePlaygroundTabs.ts.
 */
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
    // One-time migration from the pre-#409 `pg_workspaces` key.
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
 * True when a workspace's OPFS directory still exists (i.e. its content is
 * available to reopen). Used by the sign-in resume path to confirm a stashed
 * draft's work is really there before re-adopting it, rather than pointing the
 * playground at an id whose files were since evicted. Returns false when OPFS
 * is unavailable (no persisted content to recover in that case).
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
 * Creates a new workspace: allocates a workspace ID, writes `meta.json` to
 * OPFS, creates the `files/` and `db/` sub-directories, and (by default) adds
 * an entry to the registry in localStorage.
 *
 * Pass `{ register: false }` to create a "draft" workspace, its OPFS backing
 * is created so the engine can persist into it, but it is NOT added to the
 * saved-workspaces registry. This backs the explicit-save model: the
 * auto-created default workspace stays a draft (it never clutters the
 * workspace list) until the user makes a change and clicks Save, at which
 * point it is promoted via `registerWorkspace`.
 *
 * If OPFS is unavailable the workspace entry is still returned (with no OPFS
 * backing) so callers can fall back to localStorage-only mode.
 *
 * Pass `{ id }` to create the workspace under a fixed identifier, used when
 * materializing a cloud copy so the local workspace keeps the cloud id and
 * the two stay paired across devices (see app/_components/cloud/).
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
      // Write meta.json
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
 * Adds a workspace entry to the registry (promoting a draft created with
 * `{ register: false }` to a saved workspace). Idempotent: if an entry with
 * the same id already exists it is updated in place. Returns the saved entry,
 * with `name` overridden when a new name is supplied.
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
 * Opens an existing workspace: reads `meta.json` from OPFS (if available),
 * updates `lastUsedAt` in the registry, and returns the full entry.
 * Returns `null` if the workspace is not found in the registry.
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
 * Deletes a workspace: removes the OPFS directory (and all its contents) and
 * removes the entry from the registry. Safe to call even when OPFS is
 * unavailable or the directory does not exist.
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
 * Renames a workspace in-place. Updates both `meta.json` (best-effort) and the
 * registry entry. Returns the updated entry, or `null` if the workspace was
 * not in the registry.
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
      // Meta write failed, registry is the authoritative name source, so the
      // rename is still effective.
    }
  }

  return updated;
}

/**
 * Duplicates a workspace's OPFS directory tree into a freshly-created
 * workspace. Both top-level subdirectories (`files/`, `db/`) and their
 * contents are copied. Returns the new workspace entry, or `null` when the
 * source workspace is not in the registry.
 *
 * When OPFS is unavailable, the new workspace is registered with no backing
 * data, callers fall back to the in-memory path just like `createWorkspace`.
 */
export async function duplicateWorkspace(
  sourceId: string,
  newName: string,
): Promise<WorkspaceEntry | null> {
  const registry = getWorkspaceRegistry();
  const source = registry.find((e) => e.id === sourceId);
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
      // Source directory missing or unreadable, leave the new workspace
      // empty (the registry entry is still valid).
    }
  }

  return created;
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
}

/** Options for {@link acquireWorkspaceLock}. */
export interface WorkspaceLockOptions {
  /**
   * Aborting this signal releases the held lock. Pass the signal from the
   * acquiring effect's cleanup so the lock is released when the playground
   * unmounts (e.g. a client-side navigation away).
   *
   * Without it the lock leaks for the whole lifetime of the document, and a
   * later remount in the *same* document, most visibly a browser
   * back-then-forward return to the playground, re-runs this acquisition and
   * collides with the document's own stale lock, reporting a spurious
   * "workspace is open in another tab" conflict.
   */
  signal?: AbortSignal;
  /**
   * How long to wait for the lock before declaring a conflict, in ms
   * (default 1500). The wait lets a just-unmounted predecessor in this
   * document, or another tab/page still tearing down, release the lock and
   * hand it over, instead of racing to a false conflict. A genuinely
   * concurrent live tab holds the lock for its whole lifetime, so the wait
   * elapses and a real conflict is still reported.
   */
  graceMs?: number;
}

/**
 * Attempts to acquire an exclusive lock for `workspaceId` using the Web Locks
 * API, holding it until `opts.signal` aborts (caller unmount) or the tab is
 * closed.
 *
 * Returns `true` if the lock was acquired (this tab may use the workspace).
 * Returns `false` if another live tab still holds the lock after the grace
 * window.
 * Returns `true` unconditionally when the Web Locks API is unavailable (no
 * enforcement possible, callers should proceed with a warning).
 */
export async function acquireWorkspaceLock(
  workspaceId: string,
  opts: WorkspaceLockOptions = {},
): Promise<boolean> {
  if (!hasWebLocks()) return true;
  const { signal: releaseSignal, graceMs = 1500 } = opts;
  if (releaseSignal?.aborted) return false;

  const locks = (navigator as unknown as { locks: LockManager }).locks;
  const lockName = `playground_workspace_${workspaceId}`;

  return new Promise<boolean>((resolve) => {
    // The *wait* is aborted when the grace window elapses or the caller
    // unmounts before the lock is ever granted. (Once granted, the lock is
    // instead held until `releaseSignal` aborts, see the callback below.) A
    // queued request, rather than `ifAvailable`, which fails instantly, lets
    // a predecessor that is mid-release hand the lock over within the window.
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
        // Hold the lock until the caller releases it (effect cleanup) or the
        // tab is destroyed, then settle so the browser frees it for the next
        // waiter, e.g. this same document's next mount after a back/forward.
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
        // The wait aborted before the lock was granted: the grace window
        // elapsed (another live tab genuinely holds it) or the caller
        // unmounted mid-wait. Either way this tab did not acquire the lock.
        endWait();
        if (!granted) resolve(false);
      });
  });
}
