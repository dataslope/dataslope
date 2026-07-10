"use client";

/**
 * Header "Share" control shared by the code playground shell
 * (Playground.tsx) and the three SQL playgrounds.
 *
 * Share works for everyone, signed in or not: it uploads an immutable
 * snapshot of the current workspace (built by the host's `buildBundle`) and
 * hands back a /s/<id> link. Recipients open their own copy; nobody can edit
 * the original through a link.
 *
 * Sharing is deliberately its own control: it publishes a snapshot, which is
 * a different intent than saving. Cloud *backups* live in the workspace menu
 * (WorkspaceBadge + workspaceCloud.tsx), where each workspace carries its own
 * backup status.
 *
 * The dialog supports the same controlled-optional open state as
 * WorkspaceBadge's manager drawer so mobile menus can open it too.
 */

import { useCallback, useEffect, useState } from "react";
import { Dialog } from "@base-ui-components/react/dialog";
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
  /** Serializes the CURRENT playground state into a bundle. Returning null
   *  means there's nothing to share yet (e.g. engine still booting). */
  buildBundle: () => Promise<WorkspaceBundle | null>;
  /** Controlled-optional dialog state (mobile menus open the dialog). */
  shareOpen?: boolean;
  onShareOpenChange?: (open: boolean) => void;
  /** Hide the inline header button (when a host only needs the dialog). */
  renderTrigger?: boolean;
}

export function ShareControls({
  workspaceName,
  buildBundle,
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
          className="header-btn"
          onClick={() => setShareOpen(true)}
          title="Share this playground, anyone with the link can open a copy"
        >
          <Share2 size={14} aria-hidden="true" />
          <span>Share</span>
        </button>
      )}
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        workspaceName={workspaceName}
        buildBundle={buildBundle}
      />
    </>
  );
}

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
      // A share is a snapshot of "now", clear the previous link so reopening
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
        setError("The playground is still loading, try again in a moment.");
        return;
      }
      const res = await createShare(bundle);
      setUrl(res.url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Sharing failed, please retry.",
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
      // Clipboard unavailable, the input below stays selectable; tell the
      // user so the button doesn't appear to silently succeed.
      setError("Couldn't copy, select the link below and copy it manually.");
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
          <p className="cloud-note">{retentionNote}</p>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
