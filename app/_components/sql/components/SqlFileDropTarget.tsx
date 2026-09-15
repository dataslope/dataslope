"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Dialog } from "@base-ui/react/dialog";
import { CircleAlert, Upload } from "lucide-react";
import { useImportProgress } from "../hooks/useImportProgress";
import { formatFileSize, type ImportStepReporter } from "../utils/importProgress";
import {
  readSniffHead,
  sniffDroppedFile,
  type DroppedFileSniff,
} from "../utils/droppedFile";
import { ImportProgressPanel } from "./ImportProgressPanel";

/** One thing a playground can do with the file that was dropped. */
export interface DroppedFileAction {
  id: string;
  label: string;
  /** One line under the label: what this choice does to the workspace. */
  description: string;
  /** Replaces the open database, so it gets the destructive button style. */
  danger?: boolean;
  /** Run the import. `choice` is the selected value when the plan offers a
   *  choice (which worksheet, say), null otherwise. Return a promise to keep
   *  the dialog's progress panel up until it settles; return nothing when the
   *  action just opens the playground's own import dialog, which takes over
   *  from there. */
  run: (
    report: ImportStepReporter,
    choice: string | null,
  ) => void | Promise<unknown>;
}

/** What the confirmation should say and offer for one dropped file. */
export interface DropImportPlan {
  /** e.g. "Import chinook.db?" */
  title: string;
  /** What the file was recognised as, and what that means here. */
  summary: ReactNode;
  actions: DroppedFileAction[];
  /** An option the actions need, e.g. which worksheet to import. Rendered
   *  above them and passed to whichever one is chosen. */
  choice?: {
    label: string;
    options: { value: string; label: string }[];
  };
  /** Shown instead of actions when this playground cannot use the file. */
  unsupported?: ReactNode;
}

export interface SqlFileDropTargetProps {
  /** Build the confirmation for a dropped file. Called once per drop, with
   *  the file and what its first bytes say it is. May be async: a workbook's
   *  sheet names, for instance, are only known after reading the file. */
  planFor: (
    file: File,
    sniff: DroppedFileSniff,
  ) => DropImportPlan | Promise<DropImportPlan>;
  /** While true, drops are ignored: the engine has nothing to import into
   *  yet. */
  disabled?: boolean;
  /** Names the surface in the overlay, e.g. "SQLite playground". */
  playgroundLabel: string;
}

interface PendingDrop {
  file: File;
  /** Files beyond the first, which are not imported. */
  extraCount: number;
  plan: DropImportPlan;
}

/** Does this drag carry files, rather than text dragged inside the editor? */
function hasFiles(transfer: DataTransfer | null): boolean {
  if (!transfer) return false;
  return Array.from(transfer.types).includes("Files");
}

/** Elements that handle their own file drops: the import dialogs' dropzones
 *  and the DuckDB files panel. A drop that lands on one of those belongs to
 *  it, not to the whole-screen target. */
function handledElsewhere(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(".sql-dropzone, .playground-files-pane, [data-own-file-drop]"),
  );
}

/**
 * Makes the whole playground a drop target. Dropping a file anywhere on the
 * page opens a confirmation naming what the file is and what can be done
 * with it, rather than requiring the reader to find the matching entry in
 * the Import menu first.
 */
export function SqlFileDropTarget({
  planFor,
  disabled = false,
  playgroundLabel,
}: SqlFileDropTargetProps) {
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<PendingDrop | null>(null);
  // The name of a file whose plan is still being built: a workbook has to be
  // opened before its sheets can be offered.
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { progress, working, startWork, reset } = useImportProgress();
  // dragenter/dragleave fire for every element the pointer crosses, so the
  // overlay is driven by a depth count rather than the last event seen.
  const depth = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const clearDrag = useCallback(() => {
    depth.current = 0;
    setDragging(false);
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      if (disabled || handledElsewhere(event.target)) {
        clearDrag();
        return;
      }
      if (!hasFiles(event.dataTransfer)) return;
      event.preventDefault();
      clearDrag();
      const files = Array.from(event.dataTransfer?.files ?? []);
      const file = files[0];
      if (!file) return;
      setError(null);
      setInspecting(file.name);
      void (async () => {
        try {
          const sniff = sniffDroppedFile(file.name, await readSniffHead(file));
          const plan = await planFor(file, sniff);
          if (!mounted.current) return;
          setInspecting(null);
          setChoice(plan.choice?.options[0]?.value ?? null);
          setPending({
            file,
            extraCount: Math.max(0, files.length - 1),
            plan,
          });
        } catch (err) {
          if (!mounted.current) return;
          setInspecting(null);
          setError(
            `Couldn't read ${file.name}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      })();
    },
    [clearDrag, disabled, planFor],
  );

  useEffect(() => {
    if (disabled) return;
    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event.dataTransfer) || handledElsewhere(event.target)) return;
      depth.current += 1;
      setDragging(true);
    };
    const onOver = (event: DragEvent) => {
      if (!hasFiles(event.dataTransfer) || handledElsewhere(event.target)) return;
      // Without this the browser opens the file instead of dropping it here.
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };
    const onLeave = (event: DragEvent) => {
      if (!hasFiles(event.dataTransfer)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    // A drag that ends outside the window (Escape, or a drop on the desktop)
    // reports no dragleave for the element it started over.
    window.addEventListener("dragend", clearDrag);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragend", clearDrag);
    };
  }, [clearDrag, disabled, onDrop]);

  const close = useCallback(() => {
    setPending(null);
    setInspecting(null);
    setChoice(null);
    setError(null);
    reset();
  }, [reset]);

  const runAction = useCallback(
    (action: DroppedFileAction, file: File, selected: string | null) => {
      startWork(file.name, file.size, (report) =>
        Promise.resolve(action.run(report, selected)).finally(() => {
          if (mounted.current) setPending(null);
        }),
      );
    },
    [startWork],
  );

  const overlay =
    dragging && typeof document !== "undefined"
      ? createPortal(
          <div className="sql-drop-overlay" aria-hidden="true">
            <div className="sql-drop-overlay-card">
              <Upload size={30} aria-hidden="true" />
              <span className="sql-drop-overlay-title">Drop to import</span>
              <span className="sql-drop-overlay-hint">
                Databases, SQL dumps, CSV, JSON, Parquet and Excel files open
                in the {playgroundLabel}
              </span>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {overlay}
      <Dialog.Root
        open={pending !== null || error !== null || inspecting !== null}
        onOpenChange={(next) => {
          if (next) return;
          // The engine has the file and cannot be called off mid-import.
          if (working) return;
          close();
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="confirm-backdrop" />
          <Dialog.Popup className="confirm-popup sql-import-popup">
            {error !== null ? (
              <>
                <Dialog.Title className="confirm-title">
                  Couldn&rsquo;t read that file
                </Dialog.Title>
                <p className="sql-import-error" role="alert">
                  <CircleAlert size={14} aria-hidden="true" />
                  {error}
                </p>
              </>
            ) : pending === null ? (
              <>
                <Dialog.Title className="confirm-title">
                  Reading {inspecting}
                </Dialog.Title>
                <Dialog.Description className="confirm-desc">
                  Working out what this file is.
                </Dialog.Description>
              </>
            ) : (
              <>
                <Dialog.Title className="confirm-title">
                  {pending.plan.title}
                </Dialog.Title>
                <Dialog.Description className="confirm-desc">
                  {pending.plan.summary}
                </Dialog.Description>
                <p className="sql-drop-file">
                  <span className="sql-drop-file-name">{pending.file.name}</span>
                  {pending.file.size > 0 && (
                    <span className="sql-drop-file-size">
                      {formatFileSize(pending.file.size)}
                    </span>
                  )}
                </p>
                {pending.extraCount > 0 && (
                  <p className="sql-drop-note">
                    {pending.extraCount === 1
                      ? "One more file was dropped; only the first is imported."
                      : `${pending.extraCount} more files were dropped; only the first is imported.`}
                  </p>
                )}
                {progress ? (
                  <ImportProgressPanel progress={progress} />
                ) : pending.plan.unsupported ? (
                  <p className="sql-drop-note">{pending.plan.unsupported}</p>
                ) : (
                  <div className="sql-drop-actions">
                    {pending.plan.choice && (
                      <label className="sql-drop-choice">
                        <span className="sql-drop-choice-label">
                          {pending.plan.choice.label}
                        </span>
                        <select
                          className="sql-import-target-select"
                          value={choice ?? ""}
                          onChange={(e) => setChoice(e.target.value)}
                        >
                          {pending.plan.choice.options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {pending.plan.actions.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        className={`sql-drop-action${action.danger ? " danger" : ""}`}
                        onClick={() => runAction(action, pending.file, choice)}
                      >
                        <span className="sql-drop-action-label">
                          {action.label}
                        </span>
                        <span className="sql-drop-action-desc">
                          {action.description}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            <div className="confirm-actions" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="confirm-btn confirm-btn-secondary"
                title={
                  working
                    ? "The import can't be stopped, it keeps running in the background"
                    : undefined
                }
                onClick={() => {
                  if (working) setPending(null);
                  else close();
                }}
              >
                {working ? "Hide" : "Cancel"}
              </button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
