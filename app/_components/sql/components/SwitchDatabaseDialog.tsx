"use client";

import { useRef } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { FolderPlus, Replace, X } from "lucide-react";

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
  onCreateNew: () => Promise<void>;
}

export function SwitchDatabaseDialog({
  open,
  onOpenChange,
  currentWorkspaceName,
  newDbFilename,
  onOverwrite,
  onCreateNew,
}: SwitchDatabaseDialogProps) {
  // Cancel sits at the bottom of the stack, so it is no longer the first
  // tabbable button Base UI would focus by default. Keep it focused on open
  // so a reflexive Enter still dismisses rather than acting.
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup" initialFocus={cancelRef}>
          <Dialog.Title className="confirm-title">
            Switch to <strong>{newDbFilename}</strong>?
          </Dialog.Title>
          <Dialog.Description className="confirm-desc">
            Choose how to open this database in workspace{" "}
            <strong>{currentWorkspaceName}</strong>.
          </Dialog.Description>
          <div className="confirm-actions confirm-actions-stack">
            <Dialog.Close
              className="confirm-btn confirm-btn-secondary"
              onClick={() => { void onCreateNew().catch(console.error); }}
            >
              <FolderPlus size={15} aria-hidden="true" />
              Open in new workspace
            </Dialog.Close>
            <Dialog.Close
              className="confirm-btn confirm-btn-danger"
              onClick={onOverwrite}
            >
              <Replace size={15} aria-hidden="true" />
              Overwrite this workspace
            </Dialog.Close>
            <Dialog.Close
              ref={cancelRef}
              className="confirm-btn confirm-btn-secondary"
            >
              <X size={15} aria-hidden="true" />
              Cancel
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
