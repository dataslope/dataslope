/**
 * Per-playground "active workspace" bootstrap.
 *
 * Each playground (sqlite / postgres / duckdb) needs to resolve a
 * workspace ID before its engine worker spins up, so the engine knows
 * which OPFS directory to persist into. This module provides the small
 * synchronous-ish bridge:
 *
 *   1. Look up the active workspace ID for the playground in
 *      `sessionStorage` (per-tab, so two tabs of the same playground
 *      can independently target different workspaces — required for
 *      Phase 5 multi-tab support).
 *   2. If the stored ID is still in the registry, return it.
 *   3. Otherwise auto-create a default workspace
 *      ("Default <Playground>") and remember its ID in
 *      `sessionStorage`.
 *
 * When OPFS is not supported, the helper still returns a workspace
 * entry so callers have something to wire through to the engine —
 * `createWorkspace` simply records a registry-only entry in that case
 * and the engine falls back to in-memory mode.
 */

import {
  createWorkspace,
  getWorkspaceRegistry,
  openWorkspace,
  registerWorkspace,
  type WorkspaceEntry,
} from "./workspace";

const SESSION_KEY_PREFIX = "playground_active_ws_";
// Per-tab store for a *draft* (unsaved) workspace — one that has OPFS backing
// but is intentionally kept out of the saved-workspaces registry until the
// user makes a change and clicks Save. Stored as the full entry (not just the
// id) so a reload in the same tab restores the same draft instead of spawning
// a new one.
const DRAFT_KEY_PREFIX = "playground_draft_ws_";

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

// ---------------------------------------------------------------------------
// Per-workspace "dirty" latch
// ---------------------------------------------------------------------------
// A one-way flag, keyed by workspace id, recording that the user has changed a
// workspace away from its pristine default. Stored in localStorage so it
// survives reloads and SPA navigation (the OPFS content does too), which lets
// the Save affordance reappear for an unsaved draft after a refresh. Once a
// draft is saved, `saved` gates the button so the flag no longer matters.

const DIRTY_KEY_PREFIX = "playground_ws_dirty_";

/** Marks a workspace as changed from its default (idempotent). */
export function markWorkspaceDirty(workspaceId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${DIRTY_KEY_PREFIX}${workspaceId}`, "1");
  } catch {
    /* quota / private mode — ignore */
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

/** Returns the active workspace ID stored in `sessionStorage` for the
 *  given playground, or `null` when none is set / sessionStorage is
 *  unavailable. */
export function getActiveWorkspaceId(playgroundId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(sessionKey(playgroundId));
  } catch {
    return null;
  }
}

/** Persists the active workspace ID for the given playground into
 *  `sessionStorage`. Silently no-ops outside the browser. */
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
}

/**
 * Switches the active workspace for a playground and reloads the page.
 * Uses a reload (rather than tearing down + re-bootstrapping the engine
 * and editor in place) because every workspace switch needs to rebuild
 * the runtime / database state from scratch — a reload is both simpler
 * and indistinguishable from an in-place re-bootstrap from the user's
 * perspective.
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
}

function clearDraftWorkspace(playgroundId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(draftKey(playgroundId));
  } catch {
    /* ignore */
  }
}

/**
 * Resolve (or create) the active workspace for a playground.
 *
 * Returns the full entry plus a `saved` flag: `true` for a workspace in the
 * saved registry, `false` for an unsaved draft (the auto-created default, kept
 * out of the registry until the user saves it). Callers use the id when wiring
 * engines, the name in the switcher, and `saved` to decide whether to offer a
 * Save affordance.
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
      // Touch lastUsedAt and reuse.
      const opened = await openWorkspace(storedId);
      return { ...(opened ?? entry), saved: true };
    }
    // Not registered — restore the draft if it's the one this tab created.
    const draft = getDraftWorkspace(playgroundId);
    if (draft && draft.id === storedId) {
      return { ...draft, saved: false };
    }
    // Stale session pointer — fall through to create a fresh draft.
  }

  const defaultName = DEFAULT_NAMES[playgroundId] ?? `Default ${playgroundId}`;
  // Create the default as a draft: OPFS-backed (so edits persist for the
  // session) but kept out of the registry until the user saves it.
  const created = await createWorkspace(defaultName, playgroundId, {
    register: false,
  });
  setActiveWorkspaceId(playgroundId, created.id);
  setDraftWorkspace(playgroundId, created);
  return { ...created, saved: false };
}

/**
 * Promote this tab's draft workspace to a saved one: adds it to the registry
 * (optionally under a new name) and clears the per-tab draft marker. Returns
 * the saved entry, or `null` if there is no draft to save. The OPFS data is
 * already in place (drafts persist as they go), so this only makes the
 * workspace appear in the saved list.
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
