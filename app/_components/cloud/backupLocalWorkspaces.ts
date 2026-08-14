"use client";

/**
 * Uploads a browser's local code workspaces to the account after sign-in
 * (pairs with `recoverOrphanWorkspaces`, which registers changed drafts).
 * SQL workspaces are skipped: their bundle carries a database image only a
 * live engine can produce.
 */

import { isSqlPlayground } from "@/lib/workspaces/types";
import type { WorkspaceEntry } from "../opfs/workspace";
import { buildCodeBundleFromOpfs } from "./backupFromOpfs";
import { saveCloudWorkspace } from "./cloudApi";

export interface BackupProgress {
  done: number;
  total: number;
}

export interface BackupLocalOptions {
  /** Every local workspace known to the caller (the registry). */
  entries: readonly WorkspaceEntry[];
  /** Ids already backed up, which are skipped. */
  cloudIds: ReadonlySet<string>;
  onProgress?: (progress: BackupProgress | null) => void;
  onError?: (message: string) => void;
  /** Checked between uploads so a unmounting caller can stop the sweep. */
  isCancelled?: () => boolean;
}

/** Workspaces this sweep would upload, in the order it would upload them. */
export function pendingBackupCandidates(
  entries: readonly WorkspaceEntry[],
  cloudIds: ReadonlySet<string>,
): WorkspaceEntry[] {
  return entries.filter(
    (e) => !cloudIds.has(e.id) && !isSqlPlayground(e.playground),
  );
}

/**
 * Uploads every local code workspace with no cloud copy; returns the number
 * uploaded. Stops at the first failure — a quota/auth error would just
 * repeat once per workspace.
 */
export async function backupLocalWorkspaces({
  entries,
  cloudIds,
  onProgress,
  onError,
  isCancelled,
}: BackupLocalOptions): Promise<number> {
  const candidates = pendingBackupCandidates(entries, cloudIds);
  if (candidates.length === 0) return 0;

  onProgress?.({ done: 0, total: candidates.length });
  let uploaded = 0;
  let processed = 0;
  for (const entry of candidates) {
    if (isCancelled?.()) return uploaded;
    try {
      const bundle = await buildCodeBundleFromOpfs(
        entry.playground,
        entry.id,
        entry.name,
      );
      // No manifest/files to rebuild from: skip silently rather than
      // uploading an empty bundle that would clobber a better copy later.
      // Skips don't count toward the return value — callers refresh the
      // cloud list only when something was actually uploaded.
      if (bundle) {
        await saveCloudWorkspace(entry.id, bundle);
        uploaded += 1;
      }
    } catch (err) {
      if (!isCancelled?.()) {
        onError?.(
          `Couldn't back up “${entry.name}”: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
      break;
    }
    processed += 1;
    if (isCancelled?.()) return uploaded;
    onProgress?.({ done: processed, total: candidates.length });
  }
  return uploaded;
}
