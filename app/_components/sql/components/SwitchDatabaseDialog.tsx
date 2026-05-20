"use client";

import { Dialog } from "@base-ui-components/react/dialog";

export interface SwitchDatabaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Name of the current workspace (shown in the description). */
  currentWorkspaceName: string;
  /** Filename of the database the user is switching to. */
  newDbFilename: string;
  /** Called when the user chooses to overwrite the current workspace. */
  onOverwrite: () => void;
  /** Called when the user chooses to open the new database in a new workspace. */
  onCreateNew: () => void | Promise<void>;
}

export function SwitchDatabaseDialog({
  open,
  onOpenChange,
  currentWorkspaceName,
  newDbFilename,
  onOverwrite,
  onCreateNew,
}: SwitchDatabaseDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup">
          <Dialog.Title className="confirm-title">
            Switch to <strong>{newDbFilename}</strong>?
          </Dialog.Title>
          <Dialog.Description className="confirm-desc">
            Choose how to open this database in workspace{" "}
            <strong>{currentWorkspaceName}</strong>.
          </Dialog.Description>
          <div className="confirm-actions">
            <Dialog.Close className="confirm-btn confirm-btn-secondary">
              Cancel
            </Dialog.Close>
            <Dialog.Close
              className="confirm-btn confirm-btn-secondary"
              onClick={() => { void onCreateNew().catch(console.error); }}
            >
              Open in new workspace
            </Dialog.Close>
            <Dialog.Close
              className="confirm-btn confirm-btn-danger"
              onClick={onOverwrite}
            >
              Overwrite this workspace
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
