/**
 * Learner progress, stored in the browser and, when signed in, in the account.
 *
 * localStorage is the working copy for everyone: it is read during render,
 * costs nothing, and works signed out. What changes with an account is whose
 * copy it is. A guest's progress lives under the bare keys; a signed-in
 * learner's lives under keys namespaced by their user id, and is mirrored to
 * `challenge_progress` in D1 (app/api/challenges/progress) so it follows them
 * to another browser. The namespacing is what keeps a shared computer honest:
 * signing out switches back to the guest keys, so the next person sees
 * neither the previous learner's verdicts nor their saved code.
 *
 * On sign-in the guest progress in this browser is adopted into the account
 * (merged into it, then cleared from the guest keys), the same "your work
 * comes with you" move the playground makes with local workspaces. Progress
 * only moves forward, so every sync is a merge and never a conflict; see
 * lib/challenges/progressSync.ts.
 *
 * Callers do not see any of this. They read and write through the same
 * functions as before; `setProgressOwner` (fed by the `useProgress` hook
 * from the session) decides which copy those functions address.
 *
 * Every accessor is defensive: localStorage throws in a private window with
 * site data blocked, returns null when cleared, and can hold anything a
 * previous version (or another tab) wrote. A read that cannot be trusted
 * degrades to "no progress" rather than throwing into a render.
 */

import type { ChallengeStatus } from "./types";
import {
  coversProgress,
  mergeProgressMaps,
  sanitizeProgressMap,
} from "./progressSync";

const KEY = "ds_challenge_progress_v1";
const CODE_KEY = "ds_challenge_code_v1";
/**
 * The user id whose progress this browser last showed. Read synchronously at
 * startup so a returning learner's progress and saved code are there on the
 * first client render, instead of the guest copy flashing first while the
 * session loads. The session always has the last word (`setProgressOwner`),
 * and an explicit sign-out clears it (`forgetProgressOwner`).
 */
const OWNER_KEY = "ds_challenge_owner_v1";
const SYNC_ENDPOINT = "/api/challenges/progress";

/** What is remembered about one challenge. */
export interface ChallengeProgress {
  /** Steps whose checks have all passed, by zero-padded step number. */
  passedSteps: string[];
  /** True once the whole challenge is accepted. */
  solved: boolean;
  /** Set on the first submit, so a started challenge reads as in progress. */
  attempted: boolean;
}

export type ProgressMap = Record<string, ChallengeProgress>;

/**
 * The blank record, frozen and shared. Returning one stable object matters:
 * `useSyncExternalStore` compares snapshots by identity, and a fresh `{}` per
 * read would re-render forever.
 */
export const NO_PROGRESS: ChallengeProgress = Object.freeze({
  passedSteps: Object.freeze([]) as unknown as string[],
  solved: false,
  attempted: false,
});

/** A fresh, unshared blank record, for callers that will mutate it. */
export function emptyProgress(): ChallengeProgress {
  return { passedSteps: [], solved: false, attempted: false };
}

// ─── Store ───────────────────────────────────────────────────────────
// Progress is read during render (the step rail, the catalog's status
// column), so it is exposed as an external store rather than copied into
// state by an effect: `useSyncExternalStore` gives the server a blank
// snapshot and swaps in the stored one after hydration, with no mismatch and
// no cascading render.

let cache: ProgressMap | null = null;
const listeners = new Set<() => void>();

/** Signed-in owner, null for a guest, undefined until first read. */
let owner: string | null | undefined;

function readOwnerHint(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY) || null;
  } catch {
    return null;
  }
}

function writeOwnerHint(userId: string | null): void {
  try {
    if (userId) localStorage.setItem(OWNER_KEY, userId);
    else localStorage.removeItem(OWNER_KEY);
  } catch {
    /* best-effort */
  }
}

function currentOwner(): string | null {
  if (owner === undefined) owner = readOwnerHint();
  return owner;
}

/** The user id whose progress is on screen, or null for a guest. */
export function getProgressOwner(): string | null {
  return typeof window === "undefined" ? null : currentOwner();
}

function progressKey(who: string | null = currentOwner()): string {
  return who ? `${KEY}:u:${who}` : KEY;
}

function codeKey(who: string | null = currentOwner()): string {
  return who ? `${CODE_KEY}:u:${who}` : CODE_KEY;
}
/** What the server sees: nobody has solved anything during a prerender. */
const SERVER_SNAPSHOT: ProgressMap = Object.freeze({});

function invalidate(): void {
  cache = null;
  for (const listener of listeners) listener();
}

export function subscribeToProgress(onChange: () => void): () => void {
  listeners.add(onChange);
  // Another tab solving a challenge updates this one too, and so does
  // another tab signing in or out.
  const onStorage = (e: StorageEvent) => {
    if (e.key === OWNER_KEY) owner = undefined;
    if (e.key === progressKey() || e.key === OWNER_KEY || e.key === null) {
      invalidate();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Identity-stable until something writes, as the store contract requires. */
export function getProgressSnapshot(): ProgressMap {
  if (cache === null) cache = readAll();
  return cache;
}

export function getProgressServerSnapshot(): ProgressMap {
  return SERVER_SNAPSHOT;
}

function isProgress(value: unknown): value is ChallengeProgress {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<ChallengeProgress>;
  return (
    Array.isArray(v.passedSteps) &&
    v.passedSteps.every((s) => typeof s === "string") &&
    typeof v.solved === "boolean" &&
    typeof v.attempted === "boolean"
  );
}

function readAll(key: string = progressKey()): ProgressMap {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    // Drop anything that does not match the current shape rather than
    // trusting it into the UI; a stale key is not worth a migration.
    const out: ProgressMap = {};
    for (const [slug, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (isProgress(value)) out[slug] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function writeAll(map: ProgressMap): void {
  try {
    localStorage.setItem(progressKey(), JSON.stringify(map));
  } catch {
    /* private window, blocked site data, or quota — progress is best-effort */
  }
  // Publish even when the write failed: the in-memory snapshot is still the
  // truth this session works from.
  cache = map;
  for (const listener of listeners) listener();
}

/** Stored progress for one challenge, or the shared blank record. */
export function readProgress(slug: string): ChallengeProgress {
  return getProgressSnapshot()[slug] ?? NO_PROGRESS;
}

/** Stored progress for every challenge the learner has touched. */
export function readAllProgress(): ProgressMap {
  return getProgressSnapshot();
}

/** Apply a change to one challenge's record and persist it. */
export function updateProgress(
  slug: string,
  change: (current: ChallengeProgress) => ChallengeProgress,
): ChallengeProgress {
  const current = getProgressSnapshot()[slug];
  const next = change(current ?? emptyProgress());
  if (next === current) return next;
  // A new map object, so the store's snapshot identity changes and
  // subscribers actually re-render.
  writeAll({ ...getProgressSnapshot(), [slug]: next });
  queuePush(slug, next);
  return next;
}

/** Record that a submit happened, whatever its outcome. */
export function markAttempted(slug: string): ChallengeProgress {
  return updateProgress(slug, (p) => (p.attempted ? p : { ...p, attempted: true }));
}

/**
 * Record a step as passed. `totalSteps` decides whether that completes the
 * challenge — passing the last remaining step is what marks it solved.
 */
export function markStepPassed(
  slug: string,
  stepNumber: string,
  totalSteps: number,
): ChallengeProgress {
  return updateProgress(slug, (p) => {
    const passedSteps = p.passedSteps.includes(stepNumber)
      ? p.passedSteps
      : [...p.passedSteps, stepNumber];
    return {
      passedSteps,
      attempted: true,
      solved: p.solved || passedSteps.length >= totalSteps,
    };
  });
}

/** Record a single-step challenge as accepted. */
export function markSolved(slug: string): ChallengeProgress {
  return updateProgress(slug, (p) => ({ ...p, attempted: true, solved: true }));
}

/**
 * Forget one challenge's progress in this browser (the workspace's Reset does
 * not do this). Local only: the account's copy only ever moves forward.
 */
export function clearProgress(slug: string): void {
  const all = { ...getProgressSnapshot() };
  delete all[slug];
  writeAll(all);
}

/** How a challenge's progress reads in the catalog's status column. */
export function statusOf(progress: ChallengeProgress): ChallengeStatus {
  if (progress.solved) return "solved";
  if (progress.attempted || progress.passedSteps.length > 0) return "attempted";
  return "new";
}

// ─── Saved editor buffers ────────────────────────────────────────────

/**
 * The learner's in-progress code, so a reload does not throw away work.
 * Keyed by challenge, then by task (step number or language id) — the same
 * granularity the editor swaps buffers at. Reset deletes the entry, which is
 * what makes the starter code come back.
 */
export function readSavedCode(slug: string, taskKey: string): string | null {
  try {
    const raw = localStorage.getItem(codeKey());
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const byTask = (parsed as Record<string, unknown>)?.[slug];
    const value = (byTask as Record<string, unknown>)?.[taskKey];
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

export function saveCode(slug: string, taskKey: string, code: string): void {
  try {
    const key = codeKey();
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    const all = (parsed && typeof parsed === "object" ? parsed : {}) as Record<
      string,
      Record<string, string>
    >;
    all[slug] = { ...(all[slug] ?? {}), [taskKey]: code };
    localStorage.setItem(key, JSON.stringify(all));
  } catch {
    /* best-effort */
  }
}

export function clearSavedCode(slug: string, taskKey: string): void {
  try {
    const key = codeKey();
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const all = JSON.parse(raw) as Record<string, Record<string, string>>;
    if (all?.[slug]) {
      delete all[slug][taskKey];
      localStorage.setItem(key, JSON.stringify(all));
    }
  } catch {
    /* best-effort */
  }
}

// ─── Whose progress, and the account copy ────────────────────────────

/** The owner whose account copy this page load has already reconciled. */
let syncedOwner: string | null = null;
let pending: ProgressMap = {};
let pushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Tell the store who is signed in, once the session has settled. Switches
 * which copy every accessor above addresses, adopts guest progress on
 * sign-in, and reconciles with the account once per page load.
 */
export function setProgressOwner(userId: string | null): void {
  if (typeof window === "undefined") return;
  const previous = currentOwner();
  if (userId !== previous) {
    if (userId && previous === null) adoptGuestProgress(userId);
    owner = userId;
    writeOwnerHint(userId);
    pending = {};
    invalidate();
  }
  if (userId && syncedOwner !== userId) {
    syncedOwner = userId;
    void syncWithServer(userId);
  }
}

/**
 * Stop showing the signed-in learner's copy, now. Called on an explicit
 * sign-out, which may happen on a page that shows no progress and so never
 * hears the session change: without this the next page load would start
 * from the previous learner's copy until its own session read landed.
 * `purge` also deletes that copy from this browser (account deletion).
 */
export function forgetProgressOwner({ purge = false } = {}): void {
  if (typeof window === "undefined") return;
  const previous = currentOwner();
  if (purge && previous) {
    try {
      localStorage.removeItem(progressKey(previous));
      localStorage.removeItem(codeKey(previous));
    } catch {
      /* best-effort */
    }
  }
  owner = null;
  syncedOwner = null;
  writeOwnerHint(null);
  pending = {};
  invalidate();
}

/** Move this browser's guest progress and saved code into `userId`'s copy. */
function adoptGuestProgress(userId: string): void {
  const guest = readAll(KEY);
  if (Object.keys(guest).length > 0) {
    const mine = readAll(progressKey(userId));
    try {
      localStorage.setItem(
        progressKey(userId),
        JSON.stringify(mergeProgressMaps(mine, guest)),
      );
      localStorage.removeItem(KEY);
    } catch {
      /* best-effort: the guest copy stays where it was */
    }
  }
  try {
    const rawGuest = localStorage.getItem(CODE_KEY);
    if (!rawGuest) return;
    const guestCode = JSON.parse(rawGuest) as Record<string, Record<string, string>>;
    const rawMine = localStorage.getItem(codeKey(userId));
    const myCode = (rawMine ? JSON.parse(rawMine) : {}) as Record<
      string,
      Record<string, string>
    >;
    // The account's own saved buffer wins where both exist: it is the one
    // that learner chose to keep.
    for (const [slug, byTask] of Object.entries(guestCode ?? {})) {
      myCode[slug] = { ...byTask, ...(myCode[slug] ?? {}) };
    }
    localStorage.setItem(codeKey(userId), JSON.stringify(myCode));
    localStorage.removeItem(CODE_KEY);
  } catch {
    /* best-effort */
  }
}

/** Pull the account's copy, merge it in, and push back whatever it lacks. */
async function syncWithServer(userId: string): Promise<void> {
  let server: ProgressMap;
  try {
    const res = await fetch(SYNC_ENDPOINT, { credentials: "same-origin" });
    // 401 (signed out meanwhile) or 503 (sync unavailable): the local copy
    // carries on and the next page load tries again.
    if (!res.ok) return;
    const body = (await res.json()) as { progress?: unknown };
    server = sanitizeProgressMap(body.progress);
  } catch {
    return;
  }
  if (currentOwner() !== userId) return;

  const local = getProgressSnapshot();
  const merged = mergeProgressMaps(local, server);
  if (merged !== local) writeAll(merged);

  const missing: ProgressMap = {};
  for (const [slug, record] of Object.entries(merged)) {
    if (!coversProgress(server[slug], record)) missing[slug] = record;
  }
  if (Object.keys(missing).length > 0) await pushToServer(missing, userId);
}

/** Batch a changed record for upload, so a burst of writes is one request. */
function queuePush(slug: string, record: ChallengeProgress): void {
  const who = currentOwner();
  if (!who || typeof window === "undefined") return;
  pending[slug] = record;
  if (pushTimer !== null) return;
  pushTimer = setTimeout(() => {
    pushTimer = null;
    const batch = pending;
    pending = {};
    if (Object.keys(batch).length > 0) void pushToServer(batch, who);
  }, 400);
}

async function pushToServer(batch: ProgressMap, userId: string): Promise<void> {
  if (currentOwner() !== userId) return;
  try {
    await fetch(SYNC_ENDPOINT, {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress: batch }),
      // A pass is often followed straight away by leaving the page.
      keepalive: true,
    });
  } catch {
    // Best-effort: the next page load's sync re-sends anything missing.
  }
}
