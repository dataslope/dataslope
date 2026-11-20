"use client";

import { Dialog } from "@base-ui/react/dialog";

/** "Close this tab?" for a query tab whose text was edited. Shared by the
 *  Postgres and DuckDB playgrounds; the wording matches the SQLite one. */
export function CloseTabConfirmDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup" role="alertdialog">
          <Dialog.Title className="confirm-title">Close this tab?</Dialog.Title>
          <Dialog.Description className="confirm-desc">
            The query in this tab will be discarded. This can&rsquo;t be undone.
          </Dialog.Description>
          <div className="confirm-actions">
            <Dialog.Close className="confirm-btn confirm-btn-secondary">
              Cancel
            </Dialog.Close>
            <button
              type="button"
              className="confirm-btn confirm-btn-danger"
              onClick={onConfirm}
            >
              Discard &amp; close
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
