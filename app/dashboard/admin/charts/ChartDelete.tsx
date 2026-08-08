"use client";

/**
 * The per-figure "request deletion" control on the chart gallery.
 *
 * It does not delete anything, and could not: a chart is `charts/<slug>.mjs`,
 * a file in git compiled into the deployed bundle at build time, so removing
 * one is a commit. What this records is the *decision*, taken by the person
 * actually looking at the figure, into `chart_regen_marks.delete_requested_at`
 * for whoever is next in the repository. Reading the queue back and clearing a
 * request is documented in `migrations/illustrations/0004_…`.
 *
 * Two things make the confirmation worth a dialog rather than a second click:
 *
 *   • It says plainly that nothing is deleted yet, so nobody goes looking for
 *     a file that is still there, and nobody assumes the job is done.
 *   • It lists the lessons the chart is placed in, because that is the work the
 *     request implies. A `<Chart slug="…">` tag whose spec has gone renders the
 *     dev-only "no chart with this slug" notice and fails no build, so deleting
 *     a placed chart without editing its lessons is a job half done. The count
 *     is the difference between "go ahead" and "two lessons to edit first".
 *
 * The request is a toggle: withdrawing is the same button, so a misclick is
 * undone here rather than with a hand-written UPDATE. Withdrawal skips the
 * dialog, because the destructive direction is the one worth interrupting.
 */
import { useState } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
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
  /** Whether the queue is reachable at all (ILLUSTRATIONS_DB bound, admin
   *  session present). Without it the control is inert rather than absent, so
   *  the page does not silently lose a feature. */
  available: boolean;
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
            : "Review queue unavailable (ILLUSTRATIONS_DB not bound)"
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

      <AlertDialog.Root open={open} onOpenChange={setOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className={styles.confirmBackdrop} />
          <AlertDialog.Popup className={styles.confirmPopup}>
            <AlertDialog.Title className={styles.confirmTitle}>
              Request deletion of <code>{slug}</code>?
            </AlertDialog.Title>
            <AlertDialog.Description className={styles.confirmDesc} render={<div />}>
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
            </AlertDialog.Description>
            <div className={styles.confirmActions}>
              <AlertDialog.Close className={styles.confirmCancel}>Cancel</AlertDialog.Close>
              <button type="button" className={styles.confirmDanger} onClick={() => send(true)}>
                Request deletion
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
