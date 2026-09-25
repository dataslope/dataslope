/**
 * Per-playground "active workspace" bootstrap: resolves a workspace ID before
 * the engine worker spins up. The pointer lives in sessionStorage (per-tab, so
 * tabs can target different workspaces); when it's missing or stale a default
 * draft is created. Without OPFS an entry is still returned and the engine
 * falls back to in-memory mode.
 */

import {
  createWorkspace,
  getWorkspaceRegistry,
  isWorkspaceLockHeld,
  openWorkspace,
  registerWorkspace,
  workspaceExistsInOpfs,
  type WorkspaceEntry,
} from "./workspace";

const SESSION_KEY_PREFIX = "playground_active_ws_";
// Per-tab draft (unsaved) workspace, stored as the full entry so a reload
// restores the same draft instead of spawning a new one.
const DRAFT_KEY_PREFIX = "playground_draft_ws_";
// Durable localStorage mirror of the two above, so a new session can resume
// the workspace this device last opened. See `resumeLastWorkspace`.
const LAST_KEY_PREFIX = "playground_last_ws_";
const LAST_DRAFT_KEY_PREFIX = "playground_last_draft_ws_";

/** An active workspace plus whether it is a saved (registry) workspace or a
 *  still-unsaved draft. */
export type ActiveWorkspace = WorkspaceEntry & { saved: boolean };

const DEFAULT_NAMES: Record<string, string> = {
  sqlite: "Default SQLite Workspace",
  postgres: "Default Postgres Workspace",
  duckdb: "Default DuckDB Workspace",
};

function sessionKey(playgroundId: string): string {
  return `${SESSION_KEY_PREFIX}${playgroundId}`;
}

function lastKey(playgroundId: string): string {
  return `${LAST_KEY_PREFIX}${playgroundId}`;
}

function lastDraftKey(playgroundId: string): string {
  return `${LAST_DRAFT_KEY_PREFIX}${playgroundId}`;
}

/** Records the workspace this device last opened for a playground. */
function rememberLastWorkspaceId(
  playgroundId: string,
  workspaceId: string,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(lastKey(playgroundId), workspaceId);
  } catch {
    /* quota / private mode: resume just won't happen. */
  }
}

function readLastWorkspaceId(playgroundId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(lastKey(playgroundId));
  } catch {
    return null;
  }
}

/** Durable copy of the per-tab draft entry (a draft isn't in the registry,
 *  so its name/creation time have nowhere else to live). */
function rememberLastDraft(playgroundId: string, entry: WorkspaceEntry): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(lastDraftKey(playgroundId), JSON.stringify(entry));
  } catch {
    /* ignore */
  }
}

function readLastDraft(playgroundId: string): WorkspaceEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(lastDraftKey(playgroundId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkspaceEntry;
    return parsed && typeof parsed.id === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function clearLastDraft(playgroundId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(lastDraftKey(playgroundId));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Per-workspace "dirty" latch
// ---------------------------------------------------------------------------
// One-way flag per workspace id: user changed it from its pristine default.
// In localStorage so the Save affordance survives reloads for unsaved drafts.

const DIRTY_KEY_PREFIX = "playground_ws_dirty_";

/** Marks a workspace as changed from its default (idempotent). */
export function markWorkspaceDirty(workspaceId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${DIRTY_KEY_PREFIX}${workspaceId}`, "1");
  } catch {
    /* quota / private mode, ignore */
  }
}

/** True if the workspace has been changed from its default. */
export function isWorkspaceDirty(workspaceId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(`${DIRTY_KEY_PREFIX}${workspaceId}`) === "1";
  } catch {
    return false;
  }
}

/** Clears the dirty latch (e.g. after the draft is saved). */
export function clearWorkspaceDirty(workspaceId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`${DIRTY_KEY_PREFIX}${workspaceId}`);
  } catch {
    /* ignore */
  }
}

/** Active workspace ID from sessionStorage, or `null`. */
export function getActiveWorkspaceId(playgroundId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(sessionKey(playgroundId));
  } catch {
    return null;
  }
}

/**
 * Synchronous best guess at what `ensureActiveWorkspace` will resolve to:
 * this tab's pointer, else the one this device last opened. For callers that
 * need an id before the async bootstrap runs (see `createTabScope`).
 */
export function peekActiveWorkspaceId(playgroundId: string): string | null {
  return getActiveWorkspaceId(playgroundId) ?? readLastWorkspaceId(playgroundId);
}

/** Persists the active workspace ID to sessionStorage and durably to
 *  localStorage so the next session can resume it. */
export function setActiveWorkspaceId(
  playgroundId: string,
  workspaceId: string,
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(sessionKey(playgroundId), workspaceId);
  } catch {
    /* sessionStorage may be unavailable (private mode); ignore. */
  }
  rememberLastWorkspaceId(playgroundId, workspaceId);
}

/**
 * Switches the active workspace and reloads the page. A reload is simpler
 * than an in-place engine re-bootstrap and indistinguishable to the user.
 */
export function switchActiveWorkspace(
  playgroundId: string,
  workspaceId: string,
): void {
  setActiveWorkspaceId(playgroundId, workspaceId);
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}

function draftKey(playgroundId: string): string {
  return `${DRAFT_KEY_PREFIX}${playgroundId}`;
}

/** Reads the per-tab draft workspace for a playground, or null. */
function getDraftWorkspace(playgroundId: string): WorkspaceEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(draftKey(playgroundId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkspaceEntry;
    return parsed && typeof parsed.id === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function setDraftWorkspace(playgroundId: string, entry: WorkspaceEntry): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(draftKey(playgroundId), JSON.stringify(entry));
  } catch {
    /* sessionStorage unavailable (private mode); ignore. */
  }
  rememberLastDraft(playgroundId, entry);
}

function clearDraftWorkspace(playgroundId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(draftKey(playgroundId));
  } catch {
    /* ignore */
  }
  // The workspace is registered now; a stale draft copy could only contradict it.
  clearLastDraft(playgroundId);
}

/**
 * The entry for a workspace id, saved or not.
 *
 * A playground's first workspace is a draft: real, populated, open, and
 * absent from the registry until Save promotes it. Anything that looked
 * workspaces up in the registry alone therefore reported that an open
 * two-file project did not exist — which is how a multi-file Java project
 * came to have no way to export itself.
 */
export function findWorkspaceEntry(
  workspaceId: string,
): WorkspaceEntry | null {
  const saved = getWorkspaceRegistry().find((e) => e.id === workspaceId);
  if (saved) return saved;
  if (typeof window === "undefined") return null;

  const scan = (storage: Storage, prefix: string): WorkspaceEntry | null => {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      try {
        const parsed = JSON.parse(storage.getItem(key) ?? "") as WorkspaceEntry;
        if (parsed && parsed.id === workspaceId) return parsed;
      } catch {
        /* a malformed entry is not the one we are looking for. */
      }
    }
    return null;
  };

  try {
    // This tab's drafts first; the durable mirror covers a tab that has
    // resumed one from a previous session.
    return (
      scan(window.sessionStorage, DRAFT_KEY_PREFIX) ??
      scan(window.localStorage, LAST_DRAFT_KEY_PREFIX)
    );
  } catch {
    return null;
  }
}

/**
 * Re-adopts the workspace this device last opened when this tab has no
 * pointer of its own. Deliberately declines when another tab holds the
 * workspace: two live tabs on one OPFS workspace deadlock PGlite's exclusive
 * access handle, so the second tab gets its own draft instead. Null when
 * there's nothing to resume.
 */
async function resumeLastWorkspace(
  playgroundId: string,
): Promise<ActiveWorkspace | null> {
  const lastId = readLastWorkspaceId(playgroundId);
  if (!lastId) return null;
  if (await isWorkspaceLockHeld(lastId)) return null;

  const saved = getWorkspaceRegistry().find(
    (e) => e.id === lastId && e.playground === playgroundId,
  );
  if (saved) {
    setActiveWorkspaceId(playgroundId, saved.id);
    const opened = await openWorkspace(saved.id);
    return { ...(opened ?? saved), saved: true };
  }

  // Unsaved draft: resumable only while its OPFS content is still there;
  // otherwise fall through to a fresh draft.
  const draft = readLastDraft(playgroundId);
  if (
    draft &&
    draft.id === lastId &&
    draft.playground === playgroundId &&
    (await workspaceExistsInOpfs(lastId))
  ) {
    const entry: WorkspaceEntry = { ...draft, lastUsedAt: Date.now() };
    setActiveWorkspaceId(playgroundId, entry.id);
    setDraftWorkspace(playgroundId, entry);
    return { ...entry, saved: false };
  }
  return null;
}

/**
 * Resolves (or creates) the active workspace for a playground. `saved` is
 * true for a registry workspace, false for an unsaved draft; callers use it
 * to decide whether to offer a Save affordance.
 */
export async function ensureActiveWorkspace(
  playgroundId: string,
): Promise<ActiveWorkspace> {
  const storedId = getActiveWorkspaceId(playgroundId);
  if (storedId) {
    const registry = getWorkspaceRegistry();
    const entry = registry.find(
      (e) => e.id === storedId && e.playground === playgroundId,
    );
    if (entry) {
      const opened = await openWorkspace(storedId);
      return { ...(opened ?? entry), saved: true };
    }
    // Not registered; restore the draft if it's the one this tab created.
    const draft = getDraftWorkspace(playgroundId);
    if (draft && draft.id === storedId) {
      return { ...draft, saved: false };
    }
    // Stale session pointer; fall through to create a fresh draft.
  }

  // No usable per-tab pointer: pick up where this device left off.
  const last = await resumeLastWorkspace(playgroundId);
  if (last) return last;

  const defaultName = DEFAULT_NAMES[playgroundId] ?? `Default ${playgroundId}`;
  // Default is a draft: OPFS-backed but unregistered until the user saves it.
  const created = await createWorkspace(defaultName, playgroundId, {
    register: false,
  });
  setActiveWorkspaceId(playgroundId, created.id);
  setDraftWorkspace(playgroundId, created);
  return { ...created, saved: false };
}

/**
 * Promotes this tab's draft to a saved workspace (registry entry + cleared
 * draft marker). OPFS data is already in place, so this only makes it appear
 * in the saved list. Null if there is no draft.
 */
export function saveDraftWorkspace(
  playgroundId: string,
  name?: string,
): WorkspaceEntry | null {
  const draft = getDraftWorkspace(playgroundId);
  if (!draft) return null;
  const saved = registerWorkspace(draft, name);
  clearDraftWorkspace(playgroundId);
  clearWorkspaceDirty(saved.id);
  setActiveWorkspaceId(playgroundId, saved.id);
  return saved;
}
