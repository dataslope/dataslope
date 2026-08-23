"use client";

/**
 * Header "Share" control shared by the code playground shell and the SQL
 * playgrounds. Works signed in or not: uploads an immutable snapshot and
 * hands back a /s/<id> link (recipients open their own copy). Deliberately
 * separate from cloud backups (WorkspaceBadge) — publishing a snapshot is a
 * different intent than saving. Dialog open state is controlled-optional so
 * mobile menus can open it too.
 */

import { useCallback, useEffect, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Check, Copy as CopyIcon, Loader2, Share2 } from "lucide-react";

import { useSession } from "@/lib/auth/client";
import type { WorkspaceBundle } from "@/lib/workspaces/types";
import {
  GUEST_SHARE_TTL_DAYS,
  INACTIVITY_EXPIRY_DAYS,
} from "@/lib/workspaces/policy";
import { createShare, isCloudSupported } from "./cloudApi";

export interface ShareControlsProps {
  workspaceName: string;
  /** Serializes current playground state; null = nothing to share yet.
   *  Deliberately takes no arguments: the wider `BuildBundle` has an option
   *  requesting the author's query history/stars, and this signature keeps
   *  anything under this component from ever asking for it. */
  buildBundle: () => Promise<WorkspaceBundle | null>;
  /** Workspace files the last `buildBundle` had to leave out (too large,
   *  too many). Reported next to the link so a snapshot is never quietly
   *  published without something the program needs. */
  excludedFiles?: () => string[];
  /** Controlled-optional dialog state (mobile menus open the dialog). */
  shareOpen?: boolean;
  onShareOpenChange?: (open: boolean) => void;
  /** Hide the inline header button (when a host only needs the dialog). */
  renderTrigger?: boolean;
}

export function ShareControls({
  workspaceName,
  buildBundle,
  excludedFiles,
  shareOpen: shareOpenProp,
  onShareOpenChange,
  renderTrigger = true,
}: ShareControlsProps) {
  const [internalShareOpen, setInternalShareOpen] = useState(false);
  const shareOpen = shareOpenProp ?? internalShareOpen;
  const setShareOpen = useCallback(
    (open: boolean) => {
      if (onShareOpenChange) onShareOpenChange(open);
      else setInternalShareOpen(open);
    },
    [onShareOpenChange],
  );

  if (!isCloudSupported()) return null;

  return (
    <>
      {renderTrigger && (
        <button
          type="button"
          className="ph-ghost-btn"
          onClick={() => setShareOpen(true)}
          title="Share a snapshot link, anyone with the link can open a copy"
        >
          <Share2 size={11} aria-hidden="true" />
          <span>Share</span>
        </button>
      )}
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        workspaceName={workspaceName}
        buildBundle={buildBundle}
        excludedFiles={excludedFiles}
      />
    </>
  );
}

function ShareDialog({
  open,
  onClose,
  workspaceName,
  buildBundle,
  excludedFiles,
}: {
  open: boolean;
  onClose: () => void;
  workspaceName: string;
  buildBundle: () => Promise<WorkspaceBundle | null>;
  excludedFiles?: () => string[];
}) {
  const { data: session } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [omitted, setOmitted] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      // Clear the previous link so reopening never suggests an old link
      // reflects new edits.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset synced to the open prop, same pattern as WorkspaceBadge's dialogs
      setUrl(null);
      setError(null);
      setCopied(false);
      setOmitted([]);
    }
  }, [open]);

  const handleCreate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const bundle = await buildBundle();
      if (!bundle) {
        setError("The playground is still loading, try again in a moment.");
        return;
      }
      const res = await createShare(bundle);
      setOmitted(excludedFiles?.() ?? []);
      setUrl(res.url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Sharing failed, please retry.",
      );
    } finally {
      setBusy(false);
    }
  }, [buildBundle, excludedFiles]);

  const handleCopy = useCallback(async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable; tell the user so the button doesn't appear to
      // silently succeed.
      setError("Couldn't copy, select the link below and copy it manually.");
    }
  }, [url]);

  // A guest share has no owner row, so there is nothing for a revoke to
  // authorise against — the link genuinely stands until its TTL runs out.
  // Say so before the link is created, not after.
  const retentionNote = session
    ? `Free links expire after ${INACTIVITY_EXPIRY_DAYS} days without views; Pro links don't expire. Manage links on your account page.`
    : `Guest links stay up for the full ${GUEST_SHARE_TTL_DAYS} days and can't be revoked early. Sign in (free) to keep links longer and be able to revoke them.`;

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
            {" "}and state. Anyone with the link can view it and open
            their own copy, no one can edit yours. Later edits aren&rsquo;t
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
          {url && omitted.length > 0 && (
            <p role="alert" className="cloud-error">
              Too large to include, so the copy won&rsquo;t have{" "}
              {omitted.length === 1
                ? omitted[0]
                : `${omitted.length} data files (${omitted.slice(0, 3).join(", ")}${omitted.length > 3 ? ", …" : ""})`}
              . Code that reads {omitted.length === 1 ? "it" : "them"} will
              fail for whoever opens the link.
            </p>
          )}
          <p className="cloud-note">{retentionNote}</p>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
