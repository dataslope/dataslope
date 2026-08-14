"use client";

/**
 * Cloud-backup state + actions for the unified workspace menu. Cloud saves
 * and local workspaces share the same id, so a cloud row matching a local
 * workspace IS its backup, and unmatched cloud rows are "on your account,
 * not on this device". WorkspaceBadge presents one list with per-row status.
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
  // Cloud storage not configured on the server (503): render no cloud UI.
  const [unavailable, setUnavailable] = useState(false);
  // Server said 401 while the client session cookie still looks valid;
  // without this flag the menu would sit on "Checking backups…" forever.
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

  // Initial fetch once the session resolves, so the badge shows a backup dot
  // without the menu ever opening.
  useEffect(() => {
    if (!session || unavailable || !isCloudSupported()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the list lands async in refresh(), after the fetch resolves
    void refresh();
  }, [session, unavailable, refresh]);

  // Re-read on menu open so other tabs'/devices' changes show up. Separate
  // effect so the initial fetch doesn't refire on every open/close flip.
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

/** True when the workspace was opened after its last backup was written —
 *  the backup may be missing changes (registry tracks opens, not edits). */
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
  // A backup is the owner's own copy, so it carries query history/stars;
  // `createShare` builds without these so strangers never see them.
  const bundle = await buildBundle({ includePersonal: true });
  if (!bundle) {
    throw new Error("The playground is still loading, try again in a moment.");
  }
  return saveCloudWorkspace(workspaceId, bundle);
}

/**
 * Opens a cloud save on this device: SQL bundles replay into the session
 * database after a reload; code bundles materialize into a local workspace
 * under the cloud id. Never resolves on success — both paths navigate.
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
