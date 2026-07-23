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
 *      can independently target different workspaces, required for
 *      Phase 5 multi-tab support).
 *   2. If the stored ID is still in the registry, return it.
 *   3. Otherwise auto-create a default workspace
 *      ("Default <Playground>") and remember its ID in
 *      `sessionStorage`.
 *
 * When OPFS is not supported, the helper still returns a workspace
 * entry so callers have something to wire through to the engine,
 * `createWorkspace` simply records a registry-only entry in that case
 * and the engine falls back to in-memory mode.
 */

import {
  createWorkspace,
  getWorkspaceRegistry,
  openWorkspace,
  registerWorkspace,
  workspaceExistsInOpfs,
  type WorkspaceEntry,
} from "./workspace";
import { isOpfsSupported } from "./featureDetect";

const SESSION_KEY_PREFIX = "playground_active_ws_";
// Per-tab store for a *draft* (unsaved) workspace, one that has OPFS backing
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
 * the runtime / database state from scratch, a reload is both simpler
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

// ---------------------------------------------------------------------------
// Sign-in resume handoff
// ---------------------------------------------------------------------------
// The active-workspace pointer lives in per-tab `sessionStorage`, and a guest's
// auto-created workspace is an unregistered draft (kept out of the localStorage
// registry until Save). Signing in navigates the whole tab away (the Ask AI CTA
// uses `target="_top"` to escape the home page's playground iframe) and can
// return in a context where that per-tab pointer is gone — a fresh tab, a
// dropped session, or the home page re-mounting its embed — at which point
// `ensureActiveWorkspace` would spin up a blank default and the guest's work
// (still sitting in OPFS) looks lost.
//
// The fix is a durable, single-use handoff written to `localStorage` (which,
// unlike sessionStorage, survives the round trip and is visible across
// contexts) right before we leave for the auth flow. On the first bootstrap
// after returning, `ensureActiveWorkspace` consumes it and re-points the tab at
// the same workspace, so the work resumes.

const RESUME_STASH_KEY = "playground_signin_resume";
// A stash older than this is treated as abandoned (the user walked away without
// completing sign-in) and ignored, so it can't hijack an unrelated later visit.
const RESUME_STASH_TTL_MS = 24 * 60 * 60 * 1000;

interface ResumeStash {
  playground: string;
  id: string;
  name: string;
  createdAt: number;
  /** When the stash was written, for TTL expiry. */
  ts: number;
}

function writeResumeStash(stash: ResumeStash): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RESUME_STASH_KEY, JSON.stringify(stash));
  } catch {
    /* storage unavailable (private mode / quota); resume just won't happen. */
  }
}

function readResumeStash(): ResumeStash | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RESUME_STASH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResumeStash;
    if (
      parsed &&
      typeof parsed.playground === "string" &&
      typeof parsed.id === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function clearResumeStash(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RESUME_STASH_KEY);
  } catch {
    /* ignore */
  }
}

/** True when localStorage can be written (false in private mode / when blocked),
 *  a precondition for recording the resume handoff. */
function canWriteLocalStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const probe = "__ds_persist_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether the current active workspace's content can survive a sign-in round
 * trip: OPFS must hold the content, and localStorage must be writable so the
 * resume handoff (and the workspace registry) can be recorded.
 */
export function canPersistGuestWork(): boolean {
  return isOpfsSupported() && canWriteLocalStorage();
}

/**
 * True when signing in right now would lose the guest's current playground work
 * because this browser can't persist it across the auth navigation. Callers use
 * it to show a confirmation before leaving the page. Returns false when there is
 * no active workspace (nothing to lose).
 */
export function guestWorkNeedsSignInWarning(playgroundId: string): boolean {
  if (!playgroundId) return false;
  if (getActiveWorkspaceId(playgroundId) == null) return false;
  return !canPersistGuestWork();
}

/**
 * Record a durable, single-use pointer to the playground's active workspace so
 * it can be resumed after the sign-in / sign-up flow. Call this right before
 * navigating to the auth pages. No-op when there is no active workspace, or when
 * OPFS can't hold the content to return to (in which case there is nothing to
 * resume — the caller warns the user instead).
 */
export function stashActiveWorkspaceForResume(playgroundId: string): void {
  if (!playgroundId || typeof window === "undefined") return;
  const activeId = getActiveWorkspaceId(playgroundId);
  if (!activeId) return;
  if (!isOpfsSupported()) return;
  const saved = getWorkspaceRegistry().find((e) => e.id === activeId);
  const draft = getDraftWorkspace(playgroundId);
  const source = saved ?? (draft && draft.id === activeId ? draft : null);
  const name =
    source?.name ?? DEFAULT_NAMES[playgroundId] ?? `Default ${playgroundId}`;
  const createdAt = source?.createdAt ?? Date.now();
  writeResumeStash({
    playground: playgroundId,
    id: activeId,
    name,
    createdAt,
    ts: Date.now(),
  });
}

/**
 * Consume a pending sign-in resume handoff for this playground, if any, and
 * re-adopt the stashed workspace as active. Single-use: the stash is cleared up
 * front so it can never hijack a later fresh-tab open. Returns the resumed
 * workspace, or null when there's no (valid, unexpired) stash or its content is
 * gone.
 */
async function consumeResumeStash(
  playgroundId: string,
): Promise<ActiveWorkspace | null> {
  const stash = readResumeStash();
  if (!stash || stash.playground !== playgroundId) return null;
  clearResumeStash();
  if (Date.now() - (stash.ts ?? 0) > RESUME_STASH_TTL_MS) return null;

  // A saved (registry) workspace: re-point this tab at it and reuse.
  const saved = getWorkspaceRegistry().find(
    (e) => e.id === stash.id && e.playground === playgroundId,
  );
  if (saved) {
    setActiveWorkspaceId(playgroundId, saved.id);
    const opened = await openWorkspace(saved.id);
    return { ...(opened ?? saved), saved: true };
  }

  // Otherwise an unsaved draft: resumable only while its OPFS content is still
  // present (that's where the guest's work lives).
  if (await workspaceExistsInOpfs(stash.id)) {
    const entry: WorkspaceEntry = {
      id: stash.id,
      name: stash.name,
      playground: playgroundId,
      createdAt: stash.createdAt,
      lastUsedAt: Date.now(),
    };
    setActiveWorkspaceId(playgroundId, entry.id);
    setDraftWorkspace(playgroundId, entry);
    return { ...entry, saved: false };
  }
  return null;
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
  // A guest who just signed in / signed up resumes the workspace they left,
  // even if this tab's sessionStorage pointer didn't survive the round trip.
  const resumed = await consumeResumeStash(playgroundId);
  if (resumed) return resumed;

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
    // Not registered, restore the draft if it's the one this tab created.
    const draft = getDraftWorkspace(playgroundId);
    if (draft && draft.id === storedId) {
      return { ...draft, saved: false };
    }
    // Stale session pointer, fall through to create a fresh draft.
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
