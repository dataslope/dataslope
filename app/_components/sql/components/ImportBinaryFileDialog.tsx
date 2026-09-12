"use client";

import { Dialog } from "@base-ui/react/dialog";
import { CircleAlert, TriangleAlert, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { useImportProgress } from "../hooks/useImportProgress";
import { readFileAsBytes, type ImportStepReporter } from "../utils/importProgress";
import { ImportProgressPanel } from "./ImportProgressPanel";

export interface ImportBinaryFileDialogProps {
  open: boolean;
  dragging: boolean;
  onClose: () => void;
  onDraggingChange: (dragging: boolean) => void;
  /** Called with file bytes and the original filename. Return the import's
   *  promise so the dialog keeps its progress panel up until the engine is
   *  done; `report` names the step the engine is on, which is the only
   *  feedback a multi-second restore has to offer. */
  onImport: (
    data: Uint8Array,
    filename: string,
    report: ImportStepReporter,
  ) => void | Promise<unknown>;
  title: string;
  /** JSX rendered in the description slot (e.g. file extensions). */
  description: ReactNode;
  /** Warning body text (sentence explaining persistence behaviour). */
  warningText: ReactNode;
  /** Primary label inside the drop zone ("Drop a SQLite file here"). */
  dropText: string;
  /** Secondary hint inside the drop zone ("or click to browse, .sqlite, .db"). */
  browseHint: string;
  /** `accept` attribute on the hidden file input. Omit to accept any
   *  file, useful when the import sniffs the content rather than
   *  trusting the extension. */
  accept?: string;
  /** `aria-label` for the hidden file input. */
  inputAriaLabel: string;
}

export function ImportBinaryFileDialog({
  open,
  dragging,
  onClose,
  onDraggingChange,
  onImport,
  title,
  description,
  warningText,
  dropText,
  browseHint,
  accept,
  inputAriaLabel,
}: ImportBinaryFileDialogProps) {
  const { progress, readError, working, startRead, cancelRead, reset } =
    useImportProgress();

  const pickFile = (file: File) => {
    startRead(file, readFileAsBytes, (bytes, report) =>
      onImport(bytes, file.name, report),
    );
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        // Escape and backdrop clicks are ignored once the engine has the
        // bytes: the import cannot be called off, and an accidental dismiss
        // would put the reader right back to guessing whether anything is
        // running. The footer button below is the deliberate way out.
        if (working) return;
        onClose();
        onDraggingChange(false);
        reset();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup sql-import-popup">
          <Dialog.Title className="confirm-title">{title}</Dialog.Title>
          <Dialog.Description className="confirm-desc">
            {description}
          </Dialog.Description>
          <div className="sql-import-warning">
            <TriangleAlert
              size={14}
              className="sql-import-warning-icon"
              aria-hidden="true"
            />
            <span>{warningText}</span>
          </div>
          {progress ? (
            <ImportProgressPanel progress={progress} />
          ) : (
            <div
              className={`sql-dropzone${dragging ? " dragging" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                onDraggingChange(true);
              }}
              onDragLeave={() => onDraggingChange(false)}
              onDrop={(e) => {
                e.preventDefault();
                onDraggingChange(false);
                const file = e.dataTransfer.files[0];
                if (file) pickFile(file);
              }}
            >
              <Upload size={28} className="sql-dropzone-icon" aria-hidden="true" />
              <span>{dropText}</span>
              <span className="sql-dropzone-hint">{browseHint}</span>
              <input
                type="file"
                accept={accept}
                aria-label={inputAriaLabel}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) pickFile(file);
                  e.target.value = "";
                }}
              />
            </div>
          )}
          {readError && (
            <p className="sql-import-error" role="alert">
              <CircleAlert size={14} aria-hidden="true" />
              {readError}
            </p>
          )}
          <div className="confirm-actions" style={{ marginTop: 16 }}>
            {progress ? (
              // A read can be dropped. An import already inside the engine
              // cannot, so the button offers the only thing it can honestly
              // do there: put the dialog away and let it finish.
              <button
                type="button"
                className="confirm-btn confirm-btn-secondary"
                title={
                  working
                    ? "The import can't be stopped, it keeps running in the background"
                    : undefined
                }
                onClick={() => {
                  if (working) {
                    onClose();
                    onDraggingChange(false);
                  } else {
                    cancelRead();
                  }
                }}
              >
                {working ? "Hide" : "Cancel"}
              </button>
            ) : (
              <Dialog.Close className="confirm-btn confirm-btn-secondary">
                Cancel
              </Dialog.Close>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
