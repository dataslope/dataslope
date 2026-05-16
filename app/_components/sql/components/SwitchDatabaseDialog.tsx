"use client";

import { AlertDialog } from "@base-ui-components/react/alert-dialog";

export interface SwitchDatabaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Filename of the database the user is switching away from. */
  currentDbFilename: string;
  /** Called when the user confirms the switch. */
  onConfirm: () => void;
}

export function SwitchDatabaseDialog({
  open,
  onOpenChange,
  currentDbFilename,
  onConfirm,
}: SwitchDatabaseDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="confirm-backdrop" />
        <AlertDialog.Popup className="confirm-popup">
          <AlertDialog.Title className="confirm-title">
            Switch databases?
          </AlertDialog.Title>
          <AlertDialog.Description className="confirm-desc">
            You have unsaved edits in the query tabs for{" "}
            <strong>{currentDbFilename}</strong>. They will be saved and
            restored when you switch back, but loading another database will
            replace what&rsquo;s currently in the editor.
          </AlertDialog.Description>
          <div className="confirm-actions">
            <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
              Cancel
            </AlertDialog.Close>
            <AlertDialog.Close
              className="confirm-btn confirm-btn-danger"
              onClick={onConfirm}
            >
              Switch database
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
