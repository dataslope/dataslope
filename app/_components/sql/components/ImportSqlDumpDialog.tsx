"use client";

import { Dialog } from "@base-ui-components/react/dialog";
import { TriangleAlert, Upload } from "lucide-react";

export interface ImportSqlDumpDialogProps {
  open: boolean;
  dragging: boolean;
  onClose: () => void;
  onDraggingChange: (dragging: boolean) => void;
  /** Called with the file's text content and its original filename. */
  onImport: (sql: string, filename: string) => void;
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
}: ImportSqlDumpDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
          onDraggingChange(false);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup sql-import-popup">
          <Dialog.Title className="confirm-title">Import SQL Dump</Dialog.Title>
          <Dialog.Description className="confirm-desc">
            Open a local <code>.sql</code> dump file as a new in-memory
            database.
          </Dialog.Description>
          <div className="sql-import-warning">
            <TriangleAlert
              size={14}
              className="sql-import-warning-icon"
              aria-hidden="true"
            />
            <span>
              This will replace the current database with the contents of the
              file. Your file will <strong>not</strong> be uploaded or persisted
              — it is only loaded into browser memory and will be gone on
              reload.
            </span>
          </div>
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
              readFileAsText(file, (text) => onImport(text, file.name));
            }}
          >
            <Upload size={28} className="sql-dropzone-icon" aria-hidden="true" />
            <span>Drop a SQL file here</span>
            <span className="sql-dropzone-hint">or click to browse — .sql</span>
            <input
              type="file"
              accept=".sql"
              aria-label="Choose SQL dump file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                readFileAsText(file, (text) => onImport(text, file.name));
                e.target.value = "";
              }}
            />
          </div>
          <div className="confirm-actions" style={{ marginTop: 16 }}>
            <Dialog.Close className="confirm-btn confirm-btn-secondary">
              Cancel
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
