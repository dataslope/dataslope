"use client";

/**
 * Subscribe to stored progress.
 *
 * `useSyncExternalStore` rather than "read localStorage in an effect": the
 * step rail and the catalog's status column render progress, so the server
 * must be given a blank snapshot and the stored one swapped in at hydration.
 * That is exactly what the third argument is for, and it avoids both the
 * hydration mismatch and the cascading render an effect would cause.
 *
 * Every subscriber also reports the session to the store, which is how a
 * signed-in learner's progress gets reconciled with their account and how
 * signing out hides it (see lib/challenges/progress.ts). The store makes that
 * idempotent, so any number of subscribers on a page is fine.
 */

import { useEffect, useSyncExternalStore } from "react";
import { isSessionUnavailable, useSession } from "@/lib/auth/client";
import {
  getProgressOwner,
  getProgressServerSnapshot,
  getProgressSnapshot,
  NO_PROGRESS,
  setProgressOwner,
  subscribeToProgress,
  type ChallengeProgress,
  type ProgressMap,
} from "@/lib/challenges/progress";

function useProgressOwnerSync(): void {
  const { data: session, isPending, error } = useSession();
  const userId = session?.user.id ?? null;
  // A failed session read is not a sign-out: keep whichever copy is on
  // screen until the session can actually be read.
  const settled = !isPending && !(userId === null && isSessionUnavailable(error));
  useEffect(() => {
    if (settled) setProgressOwner(userId);
  }, [settled, userId]);
}

export function useAllProgress(): ProgressMap {
  useProgressOwnerSync();
  return useSyncExternalStore(
    subscribeToProgress,
    getProgressSnapshot,
    getProgressServerSnapshot,
  );
}

export function useProgress(slug: string): ChallengeProgress {
  return useAllProgress()[slug] ?? NO_PROGRESS;
}

const noOwner = () => "";

/**
 * Whose saved code the editor should read: "" for a guest, else the user id.
 * Changes when the session settles on someone other than the learner this
 * browser last showed, which is the workspace's cue to re-seed its buffer.
 */
export function useProgressOwner(): string {
  return useSyncExternalStore(
    subscribeToProgress,
    () => getProgressOwner() ?? "",
    noOwner,
  );
}
