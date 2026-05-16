"use client";

import { AlertDialog } from "@base-ui-components/react/alert-dialog";

export interface SchemaActionDialogsProps {
  dropEntityPending: { kind: string; name: string } | null;
  onDropEntityOpenChange: (open: boolean) => void;
  onDropEntityConfirm: () => void;
  truncatePending: string | null;
  onTruncateOpenChange: (open: boolean) => void;
  onTruncateConfirm: () => void;
}

export function SchemaActionDialogs({
  dropEntityPending,
  onDropEntityOpenChange,
  onDropEntityConfirm,
  truncatePending,
  onTruncateOpenChange,
  onTruncateConfirm,
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
