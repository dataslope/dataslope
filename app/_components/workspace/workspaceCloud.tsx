"use client";

/**
 * Cloud-backup state + actions for the unified workspace menu.
 *
 * Cloud saves and local workspaces share the same id, `saveCloudWorkspace`
 * PUTs to /api/workspaces/<local workspace id>, and materializing a cloud
 * save pins the local copy to the cloud id (`createWorkspace({ id })`). So a
 * cloud row whose id matches a local workspace IS that workspace's backup,
 * and cloud rows with no matching local entry are "on your account, not on
 * this device" (saved from another browser, or the local copy was deleted).
 *
 * This hook resolves the signed-in user's cloud saves for one playground
 * into that model so WorkspaceBadge can present ONE list of workspaces with
 * a per-row backup status, instead of the separate "Cloud" dialog that used
 * to show a second, disconnected list.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "@/lib/auth/client";
import {
  isSqlPlayground,
  type CloudUsage,
  type CloudWorkspaceMeta,
  type BuildBundle,
} from "@/lib/workspaces/types";
import {
  CloudApiError,
  fetchCloudWorkspaceBundle,
  isCloudSupported,
  listCloudWorkspaces,
  saveCloudWorkspace,
} from "../cloud/cloudApi";
import {
  materializeCodeWorkspace,
  setPendingBundleRef,
} from "../cloud/materialize";
import { switchActiveWorkspace } from "../opfs/activeWorkspace";
import type { WorkspaceEntry } from "../opfs/workspace";

export interface CloudBackups {
  /** False when the browser can't gzip bundles OR the server has no cloud
   *  storage configured (503), hide all cloud UI in both cases. */
  available: boolean;
  /** Session resolved to signed-out, show the sign-in row instead. */
  signedOut: boolean;
  /** Cloud saves for this playground; empty until the first fetch lands. */
  metas: CloudWorkspaceMeta[];
  /** True once a list fetch has succeeded (distinguishes "no saves" from
   *  "not loaded yet"). */
  loaded: boolean;
  usage: CloudUsage | null;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Fetches the signed-in user's cloud saves once the session resolves, and
 * again whenever `refreshSignal` flips to true (the badge passes "menu is
 * open" so a stale list refreshes on open without polling).
 */
export function useCloudBackups(
  playgroundId: string,
  refreshSignal: boolean,
): CloudBackups {
  const { data: session, isPending } = useSession();
  const [items, setItems] = useState<CloudWorkspaceMeta[] | null>(null);
  const [usage, setUsage] = useState<CloudUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Cloud storage not configured on the server (503), treat exactly like an
  // unsupported browser and render no cloud UI at all.
  const [unavailable, setUnavailable] = useState(false);
  // Server said 401 while the *client* session cookie still looks valid
  // (expired/revoked server-side). The client session alone would keep
  // `signedOut` false, leaving the menu on "Checking backups…" forever,
  // this flag forces the sign-in row instead.
  const [authLost, setAuthLost] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await listCloudWorkspaces();
      setItems(res.workspaces);
      setUsage(res.usage);
      setError(null);
      setAuthLost(false);
    } catch (err) {
      if (err instanceof CloudApiError && err.status === 401) {
        setItems(null); // session expired mid-flight, fall back to signed-out
        setAuthLost(true);
      } else if (err instanceof CloudApiError && err.status === 503) {
        setUnavailable(true);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }, []);

  // Initial fetch once the session resolves, the badge shows a backup dot
  // without the menu ever being opened.
  useEffect(() => {
    if (!session || unavailable || !isCloudSupported()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the list lands async in refresh(), after the fetch resolves
    void refresh();
  }, [session, unavailable, refresh]);

  // Re-read on menu open so saves/deletions from other tabs or devices show
  // up. Separate effect: keying the initial fetch off `refreshSignal` too
  // would refetch on every open/close flip.
  useEffect(() => {
    if (!refreshSignal || !session || unavailable || !isCloudSupported()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the list lands async in refresh(), after the fetch resolves
    void refresh();
  }, [refreshSignal, session, unavailable, refresh]);

  const metas = useMemo(
    () => (items ?? []).filter((w) => w.playground === playgroundId),
    [items, playgroundId],
  );

  return {
    available: !unavailable && isCloudSupported(),
    signedOut: (!isPending && !session) || authLost,
    metas,
    loaded: items !== null,
    usage,
    error,
    refresh,
  };
}

/** True when the workspace was opened after its last backup was written,
 *  the backup may be missing recent changes. (Same heuristic the old Cloud
 *  dialog used for its clobber guard: the registry tracks opens, not edits.) */
export function isBackupStale(
  local: Pick<WorkspaceEntry, "lastUsedAt"> | undefined,
  meta: CloudWorkspaceMeta,
): boolean {
  return !!local && local.lastUsedAt > Date.parse(meta.updatedAt);
}

/** Serializes the live playground state and uploads it as the workspace's
 *  backup. Throws on failure (callers surface the message inline). */
export async function backUpWorkspace(
  workspaceId: string,
  buildBundle: BuildBundle,
): Promise<CloudWorkspaceMeta> {
  // A backup is the owner's own copy, so it carries their query history and
  // starred queries; `createShare` builds without this and hands a stranger a
  // workspace, never a log of what its author has run.
  const bundle = await buildBundle({ includePersonal: true });
  if (!bundle) {
    throw new Error("The playground is still loading, try again in a moment.");
  }
  return saveCloudWorkspace(workspaceId, bundle);
}

/**
 * Opens a cloud save on this device. Family-specific, same as the old Cloud
 * dialog: SQL bundles are replayed into the session database after a reload
 * (local workspaces untouched); code bundles materialize into a local
 * workspace under the cloud id and become active. Never resolves on success,
 * both paths end in a navigation.
 */
export async function openCloudSave(
  playgroundId: string,
  meta: CloudWorkspaceMeta,
  activeWorkspaceId: string | null,
): Promise<void> {
  if (isSqlPlayground(playgroundId)) {
    setPendingBundleRef(playgroundId, { source: "cloud", id: meta.id });
    window.location.reload();
    return;
  }
  const bundle = await fetchCloudWorkspaceBundle(meta.id);
  await materializeCodeWorkspace(bundle, { id: meta.id });
  if (meta.id === activeWorkspaceId) window.location.reload();
  else switchActiveWorkspace(playgroundId, meta.id);
}
