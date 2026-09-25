/**
 * The pure half of challenge-progress sync, shared by the browser store
 * (lib/challenges/progress.ts) and the API route (app/api/challenges/progress).
 *
 * Progress only moves forward, so two copies of it never conflict: they
 * merge. `passedSteps` is a union, `solved` and `attempted` are sticky. That
 * one rule is what lets a browser upload whatever it has without first
 * asking what the server has, and lets the server accept an upload without
 * trusting it to be newer.
 */

import type { ChallengeProgress, ProgressMap } from "./progress";

/** Step numbers are zero-padded ("01"); challenges stay well under 1000. */
const STEP_RE = /^\d{1,3}$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;
const MAX_STEPS = 50;
/** Per request. The catalog is a few hundred challenges. */
export const MAX_PROGRESS_ENTRIES = 1000;

function byStepNumber(a: string, b: string): number {
  return Number(a) - Number(b) || a.localeCompare(b);
}

/** One record, merged. Returns `a` itself when `b` adds nothing to it. */
export function mergeProgress(
  a: ChallengeProgress,
  b: ChallengeProgress,
): ChallengeProgress {
  const extra = b.passedSteps.filter((s) => !a.passedSteps.includes(s));
  const solved = a.solved || b.solved;
  const attempted = a.attempted || b.attempted;
  if (extra.length === 0 && solved === a.solved && attempted === a.attempted) {
    return a;
  }
  return {
    passedSteps: [...a.passedSteps, ...extra].sort(byStepNumber),
    solved,
    attempted,
  };
}

/** Every record of both maps, merged. Returns `a` itself when unchanged. */
export function mergeProgressMaps(a: ProgressMap, b: ProgressMap): ProgressMap {
  let out: ProgressMap | null = null;
  for (const [slug, theirs] of Object.entries(b)) {
    const ours = a[slug];
    const merged = ours ? mergeProgress(ours, theirs) : theirs;
    if (merged !== ours) {
      out ??= { ...a };
      out[slug] = merged;
    }
  }
  return out ?? a;
}

/** Whether `have` already contains everything `want` records. */
export function coversProgress(
  have: ChallengeProgress | undefined,
  want: ChallengeProgress,
): boolean {
  if (!have) return false;
  return mergeProgress(have, want) === have;
}

/**
 * Validate an untrusted progress map (a request body, a stored row set).
 * Malformed entries are dropped rather than failing the whole map, and
 * `knownSlug` lets the server refuse slugs that are not challenges, so an
 * account cannot be used as free key-value storage.
 */
export function sanitizeProgressMap(
  value: unknown,
  knownSlug: (slug: string) => boolean = () => true,
): ProgressMap {
  const out: ProgressMap = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  let count = 0;
  for (const [slug, raw] of Object.entries(value as Record<string, unknown>)) {
    if (count >= MAX_PROGRESS_ENTRIES) break;
    if (!SLUG_RE.test(slug) || !knownSlug(slug)) continue;
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Partial<Record<keyof ChallengeProgress, unknown>>;
    const steps = Array.isArray(r.passedSteps)
      ? r.passedSteps.filter((s): s is string => typeof s === "string" && STEP_RE.test(s))
      : [];
    out[slug] = {
      passedSteps: [...new Set(steps)].slice(0, MAX_STEPS).sort(byStepNumber),
      solved: r.solved === true,
      attempted: r.attempted === true,
    };
    count++;
  }
  return out;
}
