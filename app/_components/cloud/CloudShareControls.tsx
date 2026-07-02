"use client";

/**
 * Header controls for playground sharing + cloud saves, shared by the code
 * playground shell (Playground.tsx) and the three SQL playgrounds.
 *
 * - **Share** works for everyone, signed in or not: it uploads an immutable
 *   snapshot of the current workspace (built by the host's `buildBundle`)
 *   and hands back a /s/<id> link. Recipients open their own copy; nobody
 *   can edit the original through a link.
 * - **Cloud** requires an account (AskAiWidget's gate-the-action pattern):
 *   push the current workspace to the account, list the playground's cloud
 *   saves, open one on this device, or delete it.
 *
 * Opening differs by family: code bundles materialize into a real local
 * workspace before a reload; SQL bundles leave a pending ref that the
 * playground replays into its engine after boot (see materialize.ts).
 *
 * Both dialogs support the same controlled-optional open state as
 * WorkspaceBadge's manager drawer so mobile menus can open them too.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog } from "@base-ui-components/react/dialog";
import {
  Check,
  CloudUpload,
  Copy as CopyIcon,
  FolderDown,
  Loader2,
  LogIn,
  Share2,
  Trash2,
} from "lucide-react";

import { useSession } from "@/lib/auth/client";
import {
  isSqlPlayground,
  type CloudUsage,
  type CloudWorkspaceMeta,
  type WorkspaceBundle,
} from "@/lib/workspaces/types";
import { GUEST_SHARE_TTL_DAYS, INACTIVITY_EXPIRY_DAYS } from "@/lib/workspaces/policy";
import {
  CloudApiError,
  createShare,
  deleteCloudWorkspace,
  fetchCloudWorkspaceBundle,
  isCloudSupported,
  listCloudWorkspaces,
  saveCloudWorkspace,
} from "./cloudApi";
import { materializeCodeWorkspace, setPendingBundleRef } from "./materialize";
import { getWorkspaceRegistry } from "../opfs/workspace";
import { switchActiveWorkspace } from "../opfs/activeWorkspace";

export interface CloudShareControlsProps {
  playgroundId: string;
  /** Active workspace id — the cloud save key, shared across devices. */
  workspaceId: string | null;
  workspaceName: string;
  /** Serializes the CURRENT playground state into a bundle. Returning null
   *  means there's nothing to share yet (e.g. engine still booting). */
  buildBundle: () => Promise<WorkspaceBundle | null>;
  /** Controlled-optional dialog state (mobile menus open these). */
  shareOpen?: boolean;
  onShareOpenChange?: (open: boolean) => void;
  cloudOpen?: boolean;
  onCloudOpenChange?: (open: boolean) => void;
  /** Hide the inline header buttons (when a host only needs the dialogs). */
  renderTriggers?: boolean;
}

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

function formatRelative(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(t).toLocaleDateString();
}

export function CloudShareControls({
  playgroundId,
  workspaceId,
  workspaceName,
  buildBundle,
  shareOpen: shareOpenProp,
  onShareOpenChange,
  cloudOpen: cloudOpenProp,
  onCloudOpenChange,
  renderTriggers = true,
}: CloudShareControlsProps) {
  const [internalShareOpen, setInternalShareOpen] = useState(false);
  const [internalCloudOpen, setInternalCloudOpen] = useState(false);
  const shareOpen = shareOpenProp ?? internalShareOpen;
  const cloudOpen = cloudOpenProp ?? internalCloudOpen;
  const setShareOpen = useCallback(
    (open: boolean) => {
      if (onShareOpenChange) onShareOpenChange(open);
      else setInternalShareOpen(open);
    },
    [onShareOpenChange],
  );
  const setCloudOpen = useCallback(
    (open: boolean) => {
      if (onCloudOpenChange) onCloudOpenChange(open);
      else setInternalCloudOpen(open);
    },
    [onCloudOpenChange],
  );

  if (!isCloudSupported()) return null;

  return (
    <>
      {renderTriggers && (
        <>
          <button
            type="button"
            className="header-btn"
            onClick={() => setShareOpen(true)}
            title="Share this playground — anyone with the link can open a copy"
          >
            <Share2 size={14} aria-hidden="true" />
            <span>Share</span>
          </button>
          <button
            type="button"
            className="header-btn"
            onClick={() => setCloudOpen(true)}
            title="Cloud saves — keep this workspace on your account"
          >
            <CloudUpload size={14} aria-hidden="true" />
            <span>Cloud</span>
          </button>
        </>
      )}
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        workspaceName={workspaceName}
        buildBundle={buildBundle}
      />
      <CloudDialog
        open={cloudOpen}
        onClose={() => setCloudOpen(false)}
        playgroundId={playgroundId}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        buildBundle={buildBundle}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Share dialog
// ---------------------------------------------------------------------------

function ShareDialog({
  open,
  onClose,
  workspaceName,
  buildBundle,
}: {
  open: boolean;
  onClose: () => void;
  workspaceName: string;
  buildBundle: () => Promise<WorkspaceBundle | null>;
}) {
  const { data: session } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      // A share is a snapshot of "now" — clear the previous link so reopening
      // the dialog never suggests an old link reflects new edits.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset synced to the open prop, same pattern as WorkspaceBadge's dialogs
      setUrl(null);
      setError(null);
      setCopied(false);
    }
  }, [open]);

  const handleCreate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const bundle = await buildBundle();
      if (!bundle) {
        setError("The playground is still loading — try again in a moment.");
        return;
      }
      const res = await createShare(bundle);
      setUrl(res.url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Sharing failed — please retry.",
      );
    } finally {
      setBusy(false);
    }
  }, [buildBundle]);

  const handleCopy = useCallback(async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — the input below stays selectable */
    }
  }, [url]);

  const retentionNote = session
    ? `Free links expire after ${INACTIVITY_EXPIRY_DAYS} days without views; Pro links don't expire. Manage links on your account page.`
    : `Guest links expire ${GUEST_SHARE_TTL_DAYS} days after creation. Sign in (free) to manage your links or keep them longer.`;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup cloud-dialog">
          <Dialog.Title className="confirm-title">
            Share “{workspaceName || "this playground"}”
          </Dialog.Title>
          <Dialog.Description className="confirm-desc">
            Creates a link to a snapshot of the current files
            {" "}and state. Anyone with the link can view it and open
            their own copy — no one can edit yours. Later edits aren&rsquo;t
            shared until you create a new link.
          </Dialog.Description>

          {!url && (
            <div className="confirm-actions">
              <Dialog.Close className="confirm-btn confirm-btn-secondary">
                Cancel
              </Dialog.Close>
              <button
                type="button"
                className="confirm-btn confirm-btn-primary"
                onClick={() => void handleCreate()}
                disabled={busy}
              >
                {busy ? (
                  <>
                    <Loader2
                      size={13}
                      aria-hidden="true"
                      className="cloud-spin"
                    />{" "}
                    Creating link…
                  </>
                ) : (
                  "Create share link"
                )}
              </button>
            </div>
          )}

          {url && (
            <div className="cloud-share-result">
              <input
                className="sql-rename-input"
                readOnly
                value={url}
                onFocus={(e) => e.target.select()}
                aria-label="Share link"
              />
              <button
                type="button"
                className="confirm-btn confirm-btn-primary"
                onClick={() => void handleCopy()}
              >
                {copied ? (
                  <>
                    <Check size={13} aria-hidden="true" /> Copied
                  </>
                ) : (
                  <>
                    <CopyIcon size={13} aria-hidden="true" /> Copy
                  </>
                )}
              </button>
            </div>
          )}

          {error && (
            <p role="alert" className="cloud-error">
              {error}
            </p>
          )}
          <p className="cloud-note">{retentionNote}</p>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// Cloud dialog
// ---------------------------------------------------------------------------

type OpenConfirm = { meta: CloudWorkspaceMeta } | null;

function CloudDialog({
  open,
  onClose,
  playgroundId,
  workspaceId,
  workspaceName,
  buildBundle,
}: {
  open: boolean;
  onClose: () => void;
  playgroundId: string;
  workspaceId: string | null;
  workspaceName: string;
  buildBundle: () => Promise<WorkspaceBundle | null>;
}) {
  const { data: session, isPending } = useSession();
  const [items, setItems] = useState<CloudWorkspaceMeta[] | null>(null);
  const [usage, setUsage] = useState<CloudUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // "save" | ws id
  const [openConfirm, setOpenConfirm] = useState<OpenConfirm>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await listCloudWorkspaces();
      setItems(res.workspaces);
      setUsage(res.usage);
      setError(null);
    } catch (err) {
      if (err instanceof CloudApiError && err.status === 401) {
        setItems(null);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }, []);

  useEffect(() => {
    if (!open || !session) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset synced to the open prop; the list itself lands async in refresh()
    setNotice(null);
    setError(null);
    void refresh();
  }, [open, session, refresh]);

  const list = useMemo(
    () => (items ?? []).filter((w) => w.playground === playgroundId),
    [items, playgroundId],
  );
  const otherCount = (items?.length ?? 0) - list.length;

  const handleSave = useCallback(async () => {
    if (!workspaceId) return;
    setBusy("save");
    setError(null);
    setNotice(null);
    try {
      const bundle = await buildBundle();
      if (!bundle) {
        setError("The playground is still loading — try again in a moment.");
        return;
      }
      const meta = await saveCloudWorkspace(workspaceId, bundle);
      setNotice(`Saved to cloud (${formatBytes(meta.sizeBytes)} compressed).`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }, [workspaceId, buildBundle, refresh]);

  const performOpen = useCallback(
    async (meta: CloudWorkspaceMeta) => {
      setBusy(meta.id);
      setError(null);
      try {
        if (isSqlPlayground(playgroundId)) {
          // SQL bundles are replayed by the playground after boot.
          setPendingBundleRef(playgroundId, { source: "cloud", id: meta.id });
          window.location.reload();
          return;
        }
        const bundle = await fetchCloudWorkspaceBundle(meta.id);
        await materializeCodeWorkspace(bundle, { id: meta.id });
        if (meta.id === workspaceId) window.location.reload();
        else switchActiveWorkspace(playgroundId, meta.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setBusy(null);
      }
    },
    [playgroundId, workspaceId],
  );

  const handleOpen = useCallback(
    (meta: CloudWorkspaceMeta) => {
      // Opening a code bundle overwrites the local copy under the same id —
      // ask first when a local copy exists that was used since the cloud
      // save was written (it may hold newer edits). SQL opens land in a
      // session database and never touch local workspaces.
      if (!isSqlPlayground(playgroundId)) {
        const local = getWorkspaceRegistry().find((e) => e.id === meta.id);
        if (local && local.lastUsedAt > Date.parse(meta.updatedAt)) {
          setOpenConfirm({ meta });
          return;
        }
      }
      void performOpen(meta);
    },
    [playgroundId, performOpen],
  );

  const handleDelete = useCallback(
    async (meta: CloudWorkspaceMeta) => {
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

  const signedOut = !isPending && !session;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup cloud-dialog">
          <Dialog.Title className="confirm-title">Cloud saves</Dialog.Title>

          {signedOut ? (
            <>
              <Dialog.Description className="confirm-desc">
                Save workspaces to your account and open them from any device.
                Cloud saves need a free account — sharing works without one.
              </Dialog.Description>
              <div className="confirm-actions">
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                <a href="/sign-in" className="confirm-btn confirm-btn-primary">
                  <LogIn size={13} aria-hidden="true" /> Sign in
                </a>
              </div>
            </>
          ) : (
            <>
              <Dialog.Description className="confirm-desc">
                Push “{workspaceName || "this workspace"}” to your account, or
                open one of your saved copies on this device.
              </Dialog.Description>

              <div className="cloud-save-row">
                <button
                  type="button"
                  className="confirm-btn confirm-btn-primary"
                  onClick={() => void handleSave()}
                  disabled={busy !== null || !workspaceId}
                >
                  {busy === "save" ? (
                    <>
                      <Loader2
                        size={13}
                        aria-hidden="true"
                        className="cloud-spin"
                      />{" "}
                      Saving…
                    </>
                  ) : (
                    <>
                      <CloudUpload size={13} aria-hidden="true" /> Save to
                      cloud
                    </>
                  )}
                </button>
                {usage && (
                  <span className="cloud-usage">
                    {formatBytes(usage.bytesUsed)} of{" "}
                    {formatBytes(usage.bytesLimit)} used
                  </span>
                )}
              </div>

              {notice && <p className="cloud-notice">{notice}</p>}
              {error && (
                <p role="alert" className="cloud-error">
                  {error}
                </p>
              )}

              <div className="cloud-list" aria-label="Cloud saves">
                {items === null && !error && (
                  <p className="cloud-note">Loading your cloud saves…</p>
                )}
                {items !== null && list.length === 0 && (
                  <p className="cloud-note">
                    No cloud saves for this playground yet.
                  </p>
                )}
                {list.map((meta) => (
                  <div key={meta.id} className="cloud-item">
                    <div className="cloud-item-main">
                      <span className="cloud-item-name">{meta.name}</span>
                      <span className="cloud-item-meta">
                        {formatBytes(meta.sizeBytes)} · saved{" "}
                        {formatRelative(meta.updatedAt)}
                        {meta.id === workspaceId ? " · this workspace" : ""}
                      </span>
                    </div>
                    <div className="cloud-item-actions">
                      <button
                        type="button"
                        className="workspace-manager-action"
                        onClick={() => handleOpen(meta)}
                        disabled={busy !== null}
                        title="Open this cloud save on this device"
                      >
                        <FolderDown size={12} aria-hidden="true" />
                        <span>Open</span>
                      </button>
                      <button
                        type="button"
                        className="workspace-manager-action danger"
                        onClick={() => void handleDelete(meta)}
                        disabled={busy !== null}
                        title="Delete this cloud save (local copies are untouched)"
                      >
                        <Trash2 size={12} aria-hidden="true" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {otherCount > 0 && (
                <p className="cloud-note">
                  {otherCount} more save{otherCount === 1 ? "" : "s"} from
                  other playgrounds — see your{" "}
                  <a href="/account">account page</a>.
                </p>
              )}
              {usage && usage.plan === "free" && (
                <p className="cloud-note">
                  Free cloud saves expire after {INACTIVITY_EXPIRY_DAYS} days
                  of inactivity (opening one resets its clock). Pro saves
                  don&rsquo;t expire.
                </p>
              )}
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>

      <OpenConfirmDialog
        confirm={openConfirm}
        onClose={() => setOpenConfirm(null)}
        onConfirm={(meta) => {
          setOpenConfirm(null);
          void performOpen(meta);
        }}
      />
    </Dialog.Root>
  );
}

function OpenConfirmDialog({
  confirm,
  onClose,
  onConfirm,
}: {
  confirm: OpenConfirm;
  onClose: () => void;
  onConfirm: (meta: CloudWorkspaceMeta) => void;
}) {
  return (
    <Dialog.Root open={confirm !== null} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup">
          <Dialog.Title className="confirm-title">
            Replace local copy?
          </Dialog.Title>
          <Dialog.Description className="confirm-desc">
            The copy of <strong>“{confirm?.meta.name}”</strong> in this browser
            was used more recently than the cloud save. Opening the cloud save
            replaces the local files on this device.
          </Dialog.Description>
          <div className="confirm-actions">
            <Dialog.Close className="confirm-btn confirm-btn-secondary">
              Cancel
            </Dialog.Close>
            <button
              type="button"
              className="confirm-btn confirm-btn-danger"
              onClick={() => confirm && onConfirm(confirm.meta)}
            >
              Replace local copy
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
