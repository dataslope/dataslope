"use client";

/**
 * The per-figure delete control on the chart gallery.
 *
 * What it deletes is `charts/<slug>.mjs` in the working tree, which is the
 * only thing a chart actually *is*: the SVG on this page and the entry in
 * `lib/generated/charts.js` are both outputs of that file. So the button
 * exists only under `next dev`, where the app is running from a checkout and
 * the file is reachable; the page hides it otherwise and the route 404s. See
 * the header comment in app/api/admin/charts/route.ts for why a production
 * version of this could not do anything real.
 *
 * Two things make the confirmation more than a speed bump:
 *
 *   • It names the file, so it is obvious the action is a filesystem
 *     operation on your own tree rather than a change to some record.
 *   • It lists the lessons the chart is placed in, because that is what the
 *     deletion breaks. A `<Chart slug="…">` tag whose spec has gone renders
 *     the dev-only "no chart with this slug" notice instead of a figure, and
 *     nothing fails the build, so an unplaced-first deletion is quiet and a
 *     placed-first one is a job half done. The count is the difference
 *     between "go ahead" and "edit two lessons first".
 *
 * After a successful delete the section is collapsed to a short receipt in
 * place rather than removed, because the gallery is a static server component
 * sliced by route segment: dropping the node would leave a hole in a
 * twelve-item page and a reload would still show the chart until
 * `build:charts` runs again. Saying so is more useful than pretending.
 */
import { useState } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Loader2, Trash2, TriangleAlert } from "lucide-react";
import type { ChartDeletePayload } from "@/app/api/admin/charts/route";
import styles from "./charts.module.css";

interface ChartDeleteProps {
  slug: string;
  /** Lesson titles the chart is currently placed in, for the warning. */
  usedBy: string[];
}

type Status = "idle" | "deleting" | "deleted" | "error";

export function ChartDelete({ slug, usedBy }: ChartDeleteProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function remove() {
    setStatus("deleting");
    setMessage("");
    try {
      const res = await fetch("/api/admin/charts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = (await res.json()) as ChartDeletePayload & {
        error?: string;
      };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Couldn't delete that spec file.");
        return;
      }
      setStatus("deleted");
      setMessage(data.removed);
    } catch {
      setStatus("error");
      setMessage("Couldn't reach the server.");
    } finally {
      setOpen(false);
    }
  }

  if (status === "deleted") {
    return (
      <p className={styles.deleteDone}>
        Deleted <code>{message}</code>. Run <code>npm run build:charts</code> to
        drop it from the manifest
        {usedBy.length > 0 ? (
          <>
            , and remove the{" "}
            <code>&lt;Chart slug=&quot;{slug}&quot; /&gt;</code> tag from{" "}
            {usedBy.length} lesson{usedBy.length === 1 ? "" : "s"}
          </>
        ) : null}
        .
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        className={styles.deleteBtn}
        onClick={() => setOpen(true)}
        disabled={status === "deleting"}
        aria-label={`Delete the spec for ${slug}`}
      >
        {status === "deleting" ? (
          <Loader2 size={14} className={styles.spin} aria-hidden="true" />
        ) : (
          <Trash2 size={14} aria-hidden="true" />
        )}
        Delete spec
      </button>

      {status === "error" ? (
        <span className={styles.deleteError} role="status">
          {message}
        </span>
      ) : null}

      <AlertDialog.Root open={open} onOpenChange={setOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className={styles.confirmBackdrop} />
          <AlertDialog.Popup className={styles.confirmPopup}>
            <AlertDialog.Title className={styles.confirmTitle}>
              Delete <code>charts/{slug}.mjs</code>?
            </AlertDialog.Title>
            <AlertDialog.Description
              className={styles.confirmDesc}
              render={<div />}
            >
              <p>
                This removes the spec file from your working tree. The figure
                stays on this page until you run{" "}
                <code>npm run build:charts</code>, which regenerates the
                manifest.
              </p>
              {usedBy.length > 0 ? (
                <p className={styles.confirmWarn}>
                  <TriangleAlert size={15} aria-hidden="true" />
                  <span>
                    It is placed in {usedBy.length} lesson
                    {usedBy.length === 1 ? "" : "s"}:{" "}
                    <strong>{usedBy.join(", ")}</strong>. Those pages will show
                    a missing-chart notice until you remove the tags.
                  </span>
                </p>
              ) : (
                <p className={styles.confirmQuiet}>
                  It is not placed in any lesson, so nothing else needs editing.
                </p>
              )}
              <p className={styles.confirmQuiet}>
                Nothing is committed, so <code>git restore</code> brings it
                back.
              </p>
            </AlertDialog.Description>
            <div className={styles.confirmActions}>
              <AlertDialog.Close className={styles.confirmCancel}>
                Cancel
              </AlertDialog.Close>
              <button
                type="button"
                className={styles.confirmDanger}
                onClick={remove}
              >
                Delete spec
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
