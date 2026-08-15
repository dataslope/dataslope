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
import { isOpfsSupported } from "./featureDetect";

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

// ---------------------------------------------------------------------------
// Sign-in resume handoff
// ---------------------------------------------------------------------------
// Signing in navigates the tab away and can return without the per-tab
// sessionStorage pointer, so a guest's draft (still in OPFS) would look lost.
// A durable single-use handoff in localStorage, written just before the auth
// navigation, lets the first bootstrap after returning re-adopt the workspace.

const RESUME_STASH_KEY = "playground_signin_resume";
// Older stashes are treated as abandoned so they can't hijack a later visit.
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

/** True when localStorage is writable (false in private mode / when blocked). */
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
 * Whether guest work can survive a sign-in round trip: OPFS must hold the
 * content and localStorage must be writable for the resume handoff.
 */
export function canPersistGuestWork(): boolean {
  return isOpfsSupported() && canWriteLocalStorage();
}

/**
 * True when signing in would lose the guest's playground work (browser can't
 * persist it across the auth navigation). False when there is no active
 * workspace.
 */
export function guestWorkNeedsSignInWarning(playgroundId: string): boolean {
  if (!playgroundId) return false;
  if (getActiveWorkspaceId(playgroundId) == null) return false;
  return !canPersistGuestWork();
}

/**
 * Records a durable, single-use pointer to the active workspace so it can be
 * resumed after sign-in. Call right before navigating to the auth pages.
 * No-op when there is no active workspace or OPFS can't hold the content.
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
 * Consumes a pending sign-in resume handoff and re-adopts the stashed
 * workspace. Single-use: cleared up front so it can't hijack a later open.
 * Null when there's no valid unexpired stash or its content is gone.
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

  // Unsaved draft: resumable only while its OPFS content is still present.
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
  // A guest who just signed in resumes the workspace they left, even if the
  // per-tab pointer didn't survive the round trip.
  const resumed = await consumeResumeStash(playgroundId);
  if (resumed) return resumed;

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
