"use client";

import { Dialog } from "@base-ui/react/dialog";

export interface SqlSettingsConfirmDialogsProps {
  dialectDisplayName: string;
  restoreOpen: boolean;
  onRestoreOpenChange: (open: boolean) => void;
  onRestoreConfirm: () => void;
  clearStorageOpen: boolean;
  onClearStorageOpenChange: (open: boolean) => void;
  onClearStorageConfirm: () => void;
  /** Confirm dialog for the nuclear "Clear all local data" action.
   *  Optional so callers can opt in. */
  clearAllDataOpen?: boolean;
  onClearAllDataOpenChange?: (open: boolean) => void;
  onClearAllDataConfirm?: () => void;
}

export function SqlSettingsConfirmDialogs({
  dialectDisplayName,
  restoreOpen,
  onRestoreOpenChange,
  onRestoreConfirm,
  clearStorageOpen,
  onClearStorageOpenChange,
  onClearStorageConfirm,
  clearAllDataOpen,
  onClearAllDataOpenChange,
  onClearAllDataConfirm,
}: SqlSettingsConfirmDialogsProps) {
  return (
    <>
      <Dialog.Root open={restoreOpen} onOpenChange={onRestoreOpenChange}>
        <Dialog.Portal>
          <Dialog.Backdrop className="confirm-backdrop" />
          <Dialog.Popup className="confirm-popup" role="alertdialog">
            <Dialog.Title className="confirm-title">
              Restore default settings?
            </Dialog.Title>
            <Dialog.Description className="confirm-desc">
              This will reset {dialectDisplayName}&apos;s editor font size, word
              wrap, run/result preferences, and the shared editor theme to their
              built-in defaults. Your saved queries are not affected.
            </Dialog.Description>
            <div className="confirm-actions">
              <Dialog.Close className="confirm-btn confirm-btn-secondary">
                Cancel
              </Dialog.Close>
              <Dialog.Close
                className="confirm-btn confirm-btn-danger"
                onClick={() => {
                  onRestoreConfirm();
                  onRestoreOpenChange(false);
                }}
              >
                Restore defaults
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {onClearAllDataConfirm && onClearAllDataOpenChange && (
        <Dialog.Root
          open={!!clearAllDataOpen}
          onOpenChange={onClearAllDataOpenChange}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop" />
            <Dialog.Popup className="confirm-popup" role="alertdialog">
              <Dialog.Title className="confirm-title">
                Delete everything saved in this browser?
              </Dialog.Title>
              <Dialog.Description className="confirm-desc">
                This will permanently delete every saved setting, query,
                {" "}<strong>workspace</strong>, persisted{" "}
                <strong>database</strong>, and uploaded{" "}
                <strong>data file</strong> across{" "}
                <strong>all Dataslope playgrounds</strong>, along with the
                downloads this site has cached. The page will reload
                immediately. This cannot be undone.
              </Dialog.Description>
              <div className="confirm-actions">
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                <Dialog.Close
                  className="confirm-btn confirm-btn-danger"
                  onClick={onClearAllDataConfirm}
                >
                  Clear &amp; reload
                </Dialog.Close>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      <Dialog.Root
        open={clearStorageOpen}
        onOpenChange={onClearStorageOpenChange}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="confirm-backdrop" />
          <Dialog.Popup className="confirm-popup" role="alertdialog">
            <Dialog.Title className="confirm-title">
              Clear saved settings and code?
            </Dialog.Title>
            <Dialog.Description className="confirm-desc">
              Settings, saved queries, and per-database state for every
              Dataslope playground will be erased. The page reloads
              immediately afterwards, and this can&rsquo;t be undone.
            </Dialog.Description>
            <div className="confirm-actions">
              <Dialog.Close className="confirm-btn confirm-btn-secondary">
                Cancel
              </Dialog.Close>
              <Dialog.Close
                className="confirm-btn confirm-btn-danger"
                onClick={onClearStorageConfirm}
              >
                Clear &amp; reload
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
