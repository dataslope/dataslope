"use client";

/**
 * Account-page management for cloud storage: every cloud-saved workspace and
 * share link on the account, across all playgrounds. The in-playground Cloud
 * dialog only shows its own playground's saves; this is the one place to see
 * (and free up) everything, which matters because the storage quota is
 * account-wide, and because revoking a share link is only possible here.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { PLAYGROUNDS } from "@/app/_components/playgrounds";
import {
  fetchCloudWorkspaceBundle,
  deleteCloudWorkspace,
  listCloudWorkspaces,
  listShares,
  revokeShare,
  CloudApiError,
} from "@/app/_components/cloud/cloudApi";
import {
  materializeCodeWorkspace,
  setPendingBundleRef,
} from "@/app/_components/cloud/materialize";
import { getWorkspaceRegistry } from "@/app/_components/opfs/workspace";
import {
  isSqlPlayground,
  type CloudUsage,
  type CloudWorkspaceMeta,
  type ShareMeta,
} from "@/lib/workspaces/types";
import { INACTIVITY_EXPIRY_DAYS } from "@/lib/workspaces/policy";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function playgroundLabel(id: string): string {
  return PLAYGROUNDS.find((p) => p.id === id)?.label ?? id;
}

const rowClass =
  "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3";
const actionClass =
  "rounded-lg border border-[var(--ds-gray-200)] px-2.5 py-1 text-xs font-medium text-[var(--ds-gray-900)] transition-colors hover:bg-[var(--ds-gray-100)] disabled:opacity-50 dark:border-white/15 dark:text-white dark:hover:bg-white/10";
const dangerActionClass =
  "rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10";

export function CloudStorageSection() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<CloudWorkspaceMeta[] | null>(
    null,
  );
  const [shares, setShares] = useState<ShareMeta[] | null>(null);
  const [usage, setUsage] = useState<CloudUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [ws, sh] = await Promise.all([listCloudWorkspaces(), listShares()]);
      setWorkspaces(ws.workspaces);
      setShares(sh.shares);
      setUsage(ws.usage);
      setError(null);
    } catch (err) {
      // 503 = the deployment hasn't configured the bucket; hide the section
      // instead of rendering a permanently-broken card.
      if (err instanceof CloudApiError && err.status === 503) {
        setUnavailable(true);
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state lands asynchronously after the fetch, not in the effect body
    void refresh();
  }, [refresh]);

  const handleOpen = useCallback(
    async (meta: CloudWorkspaceMeta) => {
      setBusy(meta.id);
      setError(null);
      try {
        if (isSqlPlayground(meta.playground)) {
          setPendingBundleRef(meta.playground, {
            source: "cloud",
            id: meta.id,
          });
          router.push(`/playground/${meta.playground}`);
          return;
        }
        const local = getWorkspaceRegistry().find((e) => e.id === meta.id);
        if (
          local &&
          local.lastUsedAt > Date.parse(meta.updatedAt) &&
          !window.confirm(
            `The copy of "${meta.name}" in this browser was used more recently than the cloud save. Replace the local copy?`,
          )
        ) {
          setBusy(null);
          return;
        }
        const bundle = await fetchCloudWorkspaceBundle(meta.id);
        await materializeCodeWorkspace(bundle, { id: meta.id });
        router.push(`/playground/${meta.playground}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setBusy(null);
      }
    },
    [router],
  );

  const handleDeleteWorkspace = useCallback(
    async (meta: CloudWorkspaceMeta) => {
      // Same confirm idiom as handleOpen's local-overwrite guard: deletion is
      // irreversible and one mis-tap away from the harmless "Open" button.
      if (
        !window.confirm(
          `Delete the cloud backup of "${meta.name}"? This can't be undone. The copy in this browser (if any) is not affected.`,
        )
      ) {
        return;
      }
      setBusy(meta.id);
      setError(null);
      try {
        await deleteCloudWorkspace(meta.id);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const handleCopyShare = useCallback(async (share: ShareMeta) => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/s/${share.id}`,
      );
      setCopiedId(share.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }, []);

  const handleRevokeShare = useCallback(
    async (share: ShareMeta) => {
      if (
        !window.confirm(
          `Revoke the share link for "${share.name}"? Anyone who has the link will lose access immediately, and it can't be re-enabled.`,
        )
      ) {
        return;
      }
      setBusy(share.id);
      setError(null);
      try {
        await revokeShare(share.id);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  if (unavailable) return null;

  return (
    <div className="mt-6 rounded-2xl border border-[var(--ds-gray-200)] bg-white p-6 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-[var(--ds-gray-900)] dark:text-white">
          Cloud storage
        </h2>
        {usage && (
          <span className="text-sm text-[var(--ds-gray-500)]">
            {formatBytes(usage.bytesUsed)} of {formatBytes(usage.bytesLimit)}{" "}
            used
          </span>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-500/[0.08] px-4 py-3 text-sm text-red-700 dark:bg-red-500/[0.12] dark:text-red-300"
        >
          {error}
        </p>
      )}

      <h3 className="mt-5 text-sm font-semibold text-[var(--ds-gray-900)] dark:text-white">
        Saved workspaces
      </h3>
      {workspaces === null ? (
        <p className="mt-2 text-sm text-[var(--ds-gray-500)]">Loading…</p>
      ) : workspaces.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--ds-gray-500)]">
          No cloud saves yet, use Back up in a playground&rsquo;s workspace
          menu.
        </p>
      ) : (
        <ul className="mt-1 divide-y divide-[var(--ds-gray-100)] dark:divide-white/5">
          {workspaces.map((meta) => (
            <li key={meta.id} className={rowClass}>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-[var(--ds-gray-900)] dark:text-white">
                  {meta.name}
                </div>
                <div className="text-xs text-[var(--ds-gray-500)]">
                  {playgroundLabel(meta.playground)} ·{" "}
                  {formatBytes(meta.sizeBytes)} · saved{" "}
                  {formatDate(meta.updatedAt)}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className={actionClass}
                  disabled={busy !== null}
                  onClick={() => void handleOpen(meta)}
                >
                  {busy === meta.id ? "Opening…" : "Open"}
                </button>
                <button
                  type="button"
                  className={dangerActionClass}
                  disabled={busy !== null}
                  onClick={() => void handleDeleteWorkspace(meta)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-6 text-sm font-semibold text-[var(--ds-gray-900)] dark:text-white">
        Share links
      </h3>
      {shares === null ? (
        <p className="mt-2 text-sm text-[var(--ds-gray-500)]">Loading…</p>
      ) : shares.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--ds-gray-500)]">
          No share links yet, use the Share button in any playground.
        </p>
      ) : (
        <ul className="mt-1 divide-y divide-[var(--ds-gray-100)] dark:divide-white/5">
          {shares.map((share) => (
            <li key={share.id} className={rowClass}>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-[var(--ds-gray-900)] dark:text-white">
                  {share.name}
                </div>
                <div className="text-xs text-[var(--ds-gray-500)]">
                  {playgroundLabel(share.playground)} ·{" "}
                  {formatBytes(share.sizeBytes)} · shared{" "}
                  {formatDate(share.createdAt)}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className={actionClass}
                  onClick={() => void handleCopyShare(share)}
                >
                  {copiedId === share.id ? "Copied!" : "Copy link"}
                </button>
                <button
                  type="button"
                  className={dangerActionClass}
                  disabled={busy !== null}
                  onClick={() => void handleRevokeShare(share)}
                >
                  Revoke
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {usage?.plan === "free" && (
        <p className="mt-5 border-t border-[var(--ds-gray-200)] pt-4 text-xs leading-relaxed text-[var(--ds-gray-500)] dark:border-white/10">
          On the Free plan, cloud saves and share links are removed after{" "}
          {INACTIVITY_EXPIRY_DAYS} days of inactivity (opening a save or a
          link being viewed resets its clock). Pro storage doesn&rsquo;t
          expire.
        </p>
      )}
    </div>
  );
}
