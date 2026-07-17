"use client";

import { Dialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";
import { DdlViewer } from "./DdlViewer";

export interface DdlViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  sql: string;
  theme: string;
  isPostgres?: boolean;
  /** Overrides the default description rendered under the title. */
  description?: ReactNode;
  onCopied: () => void;
  onCopyFailed: () => void;
}

export function DdlViewerDialog({
  open,
  onOpenChange,
  title,
  sql,
  theme,
  isPostgres,
  description = (
    <>
      Read-only view of the reconstructed <code>CREATE</code> statement(s).
    </>
  ),
  onCopied,
  onCopyFailed,
}: DdlViewerDialogProps) {
  function handleCopy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(sql).then(onCopied).catch(onCopyFailed);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup sql-ddl-popup">
          <Dialog.Title className="confirm-title">DDL: {title}</Dialog.Title>
          <Dialog.Description className="confirm-desc">
            {description}
          </Dialog.Description>
          <DdlViewer sql={sql} theme={theme} isPostgres={isPostgres} />
          <div className="confirm-actions">
            <button
              type="button"
              className="confirm-btn confirm-btn-secondary"
              onClick={handleCopy}
            >
              Copy
            </button>
            <Dialog.Close className="confirm-btn confirm-btn-primary">
              Close
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
