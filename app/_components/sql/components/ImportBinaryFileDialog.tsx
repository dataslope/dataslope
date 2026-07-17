"use client";

import { Dialog } from "@base-ui/react/dialog";
import { TriangleAlert, Upload } from "lucide-react";
import type { ReactNode } from "react";

export interface ImportBinaryFileDialogProps {
  open: boolean;
  dragging: boolean;
  onClose: () => void;
  onDraggingChange: (dragging: boolean) => void;
  /** Called with file bytes and the original filename. */
  onImport: (data: Uint8Array, filename: string) => void;
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

function readFileAsUint8Array(
  file: File,
  onLoad: (data: Uint8Array) => void,
): void {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const buf = ev.target?.result;
    if (buf instanceof ArrayBuffer) onLoad(new Uint8Array(buf));
  };
  reader.readAsArrayBuffer(file);
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
              readFileAsUint8Array(file, (data) => onImport(data, file.name));
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
                if (!file) return;
                readFileAsUint8Array(file, (data) => onImport(data, file.name));
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
