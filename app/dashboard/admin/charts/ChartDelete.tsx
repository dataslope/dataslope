"use client";

/**
 * Per-figure "request deletion" control. It deletes nothing — a chart is a
 * git file, so removal is a commit; this records the decision in
 * `chart_regen_marks.delete_requested_at` (see migrations/illustrations/0004_…).
 * The request is a toggle; withdrawal skips the confirmation dialog since only
 * the destructive direction is worth interrupting.
 */
import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Loader2, Trash2, TriangleAlert, Undo2 } from "lucide-react";
import type { ChartDeletePayload } from "@/app/api/admin/charts/route";
import styles from "./charts.module.css";

interface ChartDeleteProps {
  slug: string;
  /** Lesson titles the chart is currently placed in, for the warning. */
  usedBy: string[];
  /** Whether a request is already outstanding, from the queue fetch. */
  requested: boolean;
  /** ISO-8601 of the outstanding request, for the "asked for on" line. */
  requestedAt: string | null;
  /** Whether the queue is reachable; without it the control is inert rather
   *  than absent. */
  available: boolean;
  /** What to say when unreachable. Passed in: this control cannot tell a
   *  missing binding from a missing table. */
  unavailableReason: string;
  onChange: (slug: string, requestedAt: string | null) => void;
}

/** "3 Aug 2026", matching the queue's other date chip. */
function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function ChartDelete({
  slug,
  usedBy,
  requested,
  requestedAt,
  available,
  unavailableReason,
  onChange,
}: ChartDeleteProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function send(next: boolean) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/charts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, requested: next }),
      });
      const data = (await res.json()) as ChartDeletePayload & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Couldn't record that request.");
        return;
      }
      onChange(slug, data.mark.deleteRequestedAt);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={`${styles.deleteBtn} ${requested ? styles.deleteBtnOn : ""}`}
        onClick={() => (requested ? send(false) : setOpen(true))}
        disabled={saving || !available}
        aria-pressed={requested}
        title={
          available
            ? requested
              ? "Withdraw the deletion request"
              : "Ask for this chart to be deleted from the repository"
            : unavailableReason
        }
      >
        {saving ? (
          <Loader2 size={14} className={styles.spin} aria-hidden="true" />
        ) : requested ? (
          <Undo2 size={14} aria-hidden="true" />
        ) : (
          <Trash2 size={14} aria-hidden="true" />
        )}
        {requested ? "Withdraw deletion request" : "Request deletion"}
      </button>

      {requested && requestedAt ? (
        <span className={styles.deleteChip}>Queued for deletion {shortDate(requestedAt)}</span>
      ) : null}

      {error ? (
        <span className={styles.deleteError} role="status">
          {error}
        </span>
      ) : null}

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className={styles.confirmBackdrop} />
          <Dialog.Popup className={styles.confirmPopup} role="alertdialog">
            <Dialog.Title className={styles.confirmTitle}>
              Request deletion of <code>{slug}</code>?
            </Dialog.Title>
            <Dialog.Description className={styles.confirmDesc} render={<div />}>
              <p>
                This does not delete anything. It records the decision in the
                review database, and <code>charts/{slug}.mjs</code> stays where
                it is until someone removes it in the repository and commits.
              </p>
              {usedBy.length > 0 ? (
                <p className={styles.confirmWarn}>
                  <TriangleAlert size={15} aria-hidden="true" />
                  <span>
                    It is placed in {usedBy.length} lesson
                    {usedBy.length === 1 ? "" : "s"}: <strong>{usedBy.join(", ")}</strong>.
                    Those tags have to go with it, or the pages will show a
                    missing-chart notice.
                  </span>
                </p>
              ) : (
                <p className={styles.confirmQuiet}>
                  It is not placed in any lesson, so the spec file is the only
                  thing to remove.
                </p>
              )}
              <p className={styles.confirmQuiet}>
                You can withdraw the request from the same button afterwards.
              </p>
            </Dialog.Description>
            <div className={styles.confirmActions}>
              <Dialog.Close className={styles.confirmCancel}>Cancel</Dialog.Close>
              <button type="button" className={styles.confirmDanger} onClick={() => send(true)}>
                Request deletion
              </button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
