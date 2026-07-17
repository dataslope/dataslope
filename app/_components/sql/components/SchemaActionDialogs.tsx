"use client";

import type { ReactNode } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";

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
      <AlertDialog.Root
        open={dropEntityPending !== null}
        onOpenChange={onDropEntityOpenChange}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="confirm-backdrop" />
          <AlertDialog.Popup className="confirm-popup">
            <AlertDialog.Title className="confirm-title">
              Drop {dropEntityPending?.kind ?? "entity"}?
            </AlertDialog.Title>
            <AlertDialog.Description className="confirm-desc">
              This will permanently drop{" "}
              <strong>{dropEntityPending?.name ?? ""}</strong> from the
              in-memory database. Reload the page to restore the sample.
            </AlertDialog.Description>
            {dropDetail && <p className="confirm-desc-note">{dropDetail}</p>}
            <div className="confirm-actions">
              <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
                Cancel
              </AlertDialog.Close>
              <AlertDialog.Close
                className="confirm-btn confirm-btn-danger"
                onClick={onDropEntityConfirm}
              >
                Drop
              </AlertDialog.Close>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      <AlertDialog.Root
        open={truncatePending !== null}
        onOpenChange={onTruncateOpenChange}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="confirm-backdrop" />
          <AlertDialog.Popup className="confirm-popup">
            <AlertDialog.Title className="confirm-title">
              Truncate table?
            </AlertDialog.Title>
            <AlertDialog.Description className="confirm-desc">
              Truncate table <strong>{truncatePending}</strong>? This deletes
              every row but keeps the schema. The change is in-memory only and
              will be undone next page load.
            </AlertDialog.Description>
            {truncateDetail && (
              <p className="confirm-desc-note">{truncateDetail}</p>
            )}
            <div className="confirm-actions">
              <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
                Cancel
              </AlertDialog.Close>
              <AlertDialog.Close
                className="confirm-btn confirm-btn-danger"
                onClick={onTruncateConfirm}
              >
                Truncate
              </AlertDialog.Close>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
