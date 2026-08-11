"use client";

import type { ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";

export interface SchemaActionDialogsProps {
  dropEntityPending: { kind: string; name: string } | null;
  onDropEntityOpenChange: (open: boolean) => void;
  onDropEntityConfirm: () => void;
  truncatePending: string | null;
  onTruncateOpenChange: (open: boolean) => void;
  onTruncateConfirm: () => void;
  /** Engine-specific disclosure of what Drop actually does (e.g. that it
   *  cascades to dependent objects). Rendered as a muted note. */
  dropDetail?: ReactNode;
  /** Engine-specific disclosure of what Truncate actually does (e.g. that
   *  it resets identity sequences, or runs as a plain DELETE). */
  truncateDetail?: ReactNode;
}

export function SchemaActionDialogs({
  dropEntityPending,
  onDropEntityOpenChange,
  onDropEntityConfirm,
  truncatePending,
  onTruncateOpenChange,
  onTruncateConfirm,
  dropDetail,
  truncateDetail,
}: SchemaActionDialogsProps) {
  return (
    <>
      <Dialog.Root
        open={dropEntityPending !== null}
        onOpenChange={onDropEntityOpenChange}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="confirm-backdrop" />
          <Dialog.Popup className="confirm-popup" role="alertdialog">
            <Dialog.Title className="confirm-title">
              Drop {dropEntityPending?.kind ?? "entity"}?
            </Dialog.Title>
            <Dialog.Description className="confirm-desc">
              This will permanently drop{" "}
              <strong>{dropEntityPending?.name ?? ""}</strong> from the
              in-memory database. Reload the page to restore the sample.
            </Dialog.Description>
            {dropDetail && <p className="confirm-desc-note">{dropDetail}</p>}
            <div className="confirm-actions">
              <Dialog.Close className="confirm-btn confirm-btn-secondary">
                Cancel
              </Dialog.Close>
              <Dialog.Close
                className="confirm-btn confirm-btn-danger"
                onClick={onDropEntityConfirm}
              >
                Drop
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={truncatePending !== null}
        onOpenChange={onTruncateOpenChange}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="confirm-backdrop" />
          <Dialog.Popup className="confirm-popup" role="alertdialog">
            <Dialog.Title className="confirm-title">
              Truncate table?
            </Dialog.Title>
            <Dialog.Description className="confirm-desc">
              Truncate table <strong>{truncatePending}</strong>? This deletes
              every row but keeps the schema. The change is in-memory only and
              will be undone next page load.
            </Dialog.Description>
            {truncateDetail && (
              <p className="confirm-desc-note">{truncateDetail}</p>
            )}
            <div className="confirm-actions">
              <Dialog.Close className="confirm-btn confirm-btn-secondary">
                Cancel
              </Dialog.Close>
              <Dialog.Close
                className="confirm-btn confirm-btn-danger"
                onClick={onTruncateConfirm}
              >
                Truncate
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
