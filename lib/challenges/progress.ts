/**
 * Learner progress, stored in the browser.
 *
 * Deliberately not a database. Progress is per-learner and changes on every
 * submit, which is exactly the shape of data that would cost a D1 write per
 * interaction; localStorage costs nothing, works signed-out, and needs no
 * migration. The trade is that progress is per-browser and does not follow a
 * device change — acceptable while the feature finds its shape, and the whole
 * module is small enough to back with a `challenge_progress` table later
 * without touching its callers.
 *
 * Every accessor is defensive: localStorage throws in a private window with
 * site data blocked, returns null when cleared, and can hold anything a
 * previous version (or another tab) wrote. A read that cannot be trusted
 * degrades to "no progress" rather than throwing into a render.
 */

import type { ChallengeStatus } from "./types";

const KEY = "ds_challenge_progress_v1";

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
/** What the server sees: nobody has solved anything during a prerender. */
const SERVER_SNAPSHOT: ProgressMap = Object.freeze({});

function invalidate(): void {
  cache = null;
  for (const listener of listeners) listener();
}

export function subscribeToProgress(onChange: () => void): () => void {
  listeners.add(onChange);
  // Another tab solving a challenge updates this one too.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) invalidate();
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

function readAll(): ProgressMap {
  try {
    const raw = localStorage.getItem(KEY);
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
    localStorage.setItem(KEY, JSON.stringify(map));
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
  const next = change(getProgressSnapshot()[slug] ?? emptyProgress());
  // A new map object, so the store's snapshot identity changes and
  // subscribers actually re-render.
  writeAll({ ...getProgressSnapshot(), [slug]: next });
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

/** Forget one challenge's progress (the workspace's Reset does not do this). */
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

const CODE_KEY = "ds_challenge_code_v1";

/**
 * The learner's in-progress code, so a reload does not throw away work.
 * Keyed by challenge, then by task (step number or language id) — the same
 * granularity the editor swaps buffers at. Reset deletes the entry, which is
 * what makes the starter code come back.
 */
export function readSavedCode(slug: string, taskKey: string): string | null {
  try {
    const raw = localStorage.getItem(CODE_KEY);
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
    const raw = localStorage.getItem(CODE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    const all = (parsed && typeof parsed === "object" ? parsed : {}) as Record<
      string,
      Record<string, string>
    >;
    all[slug] = { ...(all[slug] ?? {}), [taskKey]: code };
    localStorage.setItem(CODE_KEY, JSON.stringify(all));
  } catch {
    /* best-effort */
  }
}

export function clearSavedCode(slug: string, taskKey: string): void {
  try {
    const raw = localStorage.getItem(CODE_KEY);
    if (!raw) return;
    const all = JSON.parse(raw) as Record<string, Record<string, string>>;
    if (all?.[slug]) {
      delete all[slug][taskKey];
      localStorage.setItem(CODE_KEY, JSON.stringify(all));
    }
  } catch {
    /* best-effort */
  }
}
