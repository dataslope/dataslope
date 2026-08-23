"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { TriangleAlert, Upload } from "lucide-react";

export interface ImportSqlDumpDialogProps {
  open: boolean;
  dragging: boolean;
  onClose: () => void;
  onDraggingChange: (dragging: boolean) => void;
  /** Called with the file's text content and its original filename. */
  onImport: (sql: string, filename: string) => void;
  /** True when the playground persists its database in this browser, which
   *  decides whether the warning promises the import survives a reload. */
  persists?: boolean;
  /** Import into a brand-new workspace instead of replacing the current
   *  database. Omit to offer only the replace path. */
  onImportInNewWorkspace?: (sql: string, filename: string) => void;
}

/** The picked file, held until the user chooses where it should land. */
interface PickedDump {
  sql: string;
  filename: string;
}

function readFileAsText(
  file: File,
  onLoad: (text: string) => void,
): void {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const text = ev.target?.result as string | null;
    if (text != null) onLoad(text);
  };
  reader.readAsText(file);
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
  const acceptFile = (sql: string, filename: string) => {
    if (onImportInNewWorkspace) setPicked({ sql, filename });
    else onImport(sql, filename);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
          onDraggingChange(false);
          setPicked(null);
        }
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
          {picked ? (
            <div className="sql-import-target-choice">
              <p className="sql-import-target-file">
                <strong>{picked.filename}</strong>
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
                if (!file) return;
                readFileAsText(file, (text) => acceptFile(text, file.name));
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
                  if (!file) return;
                  readFileAsText(file, (text) => acceptFile(text, file.name));
                  e.target.value = "";
                }}
              />
            </div>
          )}
          <div
            className={`confirm-actions${picked ? " confirm-actions-stack" : ""}`}
            style={{ marginTop: 16 }}
          >
            <Dialog.Close className="confirm-btn confirm-btn-secondary">
              Cancel
            </Dialog.Close>
            {picked && onImportInNewWorkspace && (
              <button
                type="button"
                className="confirm-btn confirm-btn-secondary"
                onClick={() =>
                  onImportInNewWorkspace(picked.sql, picked.filename)
                }
              >
                Open in new workspace
              </button>
            )}
            {picked && (
              <button
                type="button"
                className="confirm-btn confirm-btn-danger"
                onClick={() => onImport(picked.sql, picked.filename)}
              >
                Overwrite this workspace
              </button>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
