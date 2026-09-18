"use client";

/**
 * Subscribe to stored progress.
 *
 * `useSyncExternalStore` rather than "read localStorage in an effect": the
 * step rail and the catalog's status column render progress, so the server
 * must be given a blank snapshot and the stored one swapped in at hydration.
 * That is exactly what the third argument is for, and it avoids both the
 * hydration mismatch and the cascading render an effect would cause.
 */

import { useSyncExternalStore } from "react";
import {
  getProgressServerSnapshot,
  getProgressSnapshot,
  NO_PROGRESS,
  subscribeToProgress,
  type ChallengeProgress,
  type ProgressMap,
} from "@/lib/challenges/progress";

export function useAllProgress(): ProgressMap {
  return useSyncExternalStore(
    subscribeToProgress,
    getProgressSnapshot,
    getProgressServerSnapshot,
  );
}

export function useProgress(slug: string): ChallengeProgress {
  return useAllProgress()[slug] ?? NO_PROGRESS;
}
