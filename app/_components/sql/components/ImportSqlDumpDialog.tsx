"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { CircleAlert, TriangleAlert, Upload } from "lucide-react";
import { useImportProgress } from "../hooks/useImportProgress";
import {
  formatFileSize,
  readFileAsText,
  type ImportStepReporter,
} from "../utils/importProgress";
import { ImportProgressPanel } from "./ImportProgressPanel";

export interface ImportSqlDumpDialogProps {
  open: boolean;
  dragging: boolean;
  onClose: () => void;
  onDraggingChange: (dragging: boolean) => void;
  /** Called with the file's text content and its original filename. Return
   *  the import's promise so the dialog keeps its progress panel up until
   *  the engine is done; `report` names the step the engine is on, which is
   *  the only feedback a multi-second replay has to offer. */
  onImport: (
    sql: string,
    filename: string,
    report: ImportStepReporter,
  ) => void | Promise<unknown>;
  /** True when the playground persists its database in this browser, which
   *  decides whether the warning promises the import survives a reload. */
  persists?: boolean;
  /** Import into a brand-new workspace instead of replacing the current
   *  database. Omit to offer only the replace path. */
  onImportInNewWorkspace?: (
    sql: string,
    filename: string,
    report: ImportStepReporter,
  ) => void | Promise<unknown>;
}

/** The picked file, held until the user chooses where it should land. */
interface PickedDump {
  sql: string;
  filename: string;
  sizeBytes: number;
}

export function ImportSqlDumpDialog({
  open,
  dragging,
  onClose,
  onDraggingChange,
  onImport,
  persists = false,
  onImportInNewWorkspace,
}: ImportSqlDumpDialogProps) {
  // With a "new workspace" option available, picking a file no longer commits
  // to anything: the dump is held here until the user says where it goes.
  const [picked, setPicked] = useState<PickedDump | null>(null);
  const { progress, readError, working, startRead, startWork, cancelRead, reset } =
    useImportProgress();

  const pickFile = (file: File) => {
    startRead(file, readFileAsText, (sql, report) => {
      // Reading is the only phase so far when the dump still needs a target:
      // hold it and let the user choose, which drops the progress panel.
      if (onImportInNewWorkspace) {
        setPicked({ sql, filename: file.name, sizeBytes: file.size });
        return;
      }
      return onImport(sql, file.name, report);
    });
  };

  /** Run one of the two target choices, with the panel back up: the dump is
   *  already read, so this is engine work from the first frame. The held dump
   *  is dropped once the import settles, so a success the importer closed the
   *  dialog on cannot leave a stale "where should it go?" behind, and a
   *  failure (which leaves the dialog open) lands back on the dropzone. */
  const runPicked = (
    dump: PickedDump,
    run: (
      sql: string,
      filename: string,
      report: ImportStepReporter,
    ) => void | Promise<unknown>,
  ) => {
    startWork(dump.filename, dump.sizeBytes, (report) =>
      Promise.resolve(run(dump.sql, dump.filename, report)).finally(() =>
        setPicked(null),
      ),
    );
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        // Escape and backdrop clicks are ignored once the engine has the
        // dump: the import cannot be called off, and an accidental dismiss
        // would put the reader right back to guessing whether anything is
        // running. The footer button below is the deliberate way out.
        if (working) return;
        onClose();
        onDraggingChange(false);
        reset();
        setPicked(null);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup sql-import-popup">
          <Dialog.Title className="confirm-title">Import SQL Dump</Dialog.Title>
          <Dialog.Description className="confirm-desc">
            Open a local <code>.sql</code> dump file as the database for this
            workspace.
          </Dialog.Description>
          <div className="sql-import-warning">
            <TriangleAlert
              size={14}
              className="sql-import-warning-icon"
              aria-hidden="true"
            />
            <span>
              Your file is never uploaded. It is read in your browser and{" "}
              {persists
                ? "stored in the workspace, so it is still here after a reload."
                : "held in browser memory only, so it is gone on reload."}
            </span>
          </div>
          {progress ? (
            <ImportProgressPanel progress={progress} />
          ) : picked ? (
            <div className="sql-import-target-choice">
              <p className="sql-import-target-file">
                <strong>{picked.filename}</strong>
                {picked.sizeBytes > 0 && ` · ${formatFileSize(picked.sizeBytes)}`}
              </p>
              <p className="sql-import-target-hint">
                Where should it go? Overwriting replaces this workspace&apos;s
                database and closes its query tabs.
              </p>
            </div>
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
              <Upload
                size={28}
                className="sql-dropzone-icon"
                aria-hidden="true"
              />
              <span>Drop a SQL file here</span>
              <span className="sql-dropzone-hint">or click to browse, .sql</span>
              <input
                type="file"
                accept=".sql"
                aria-label="Choose SQL dump file"
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
          <div
            className={`confirm-actions${picked && !progress ? " confirm-actions-stack" : ""}`}
            style={{ marginTop: 16 }}
          >
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
              <>
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                {picked && onImportInNewWorkspace && (
                  <button
                    type="button"
                    className="confirm-btn confirm-btn-secondary"
                    onClick={() => runPicked(picked, onImportInNewWorkspace)}
                  >
                    Open in new workspace
                  </button>
                )}
                {picked && (
                  <button
                    type="button"
                    className="confirm-btn confirm-btn-danger"
                    onClick={() => runPicked(picked, onImport)}
                  >
                    Overwrite this workspace
                  </button>
                )}
              </>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
