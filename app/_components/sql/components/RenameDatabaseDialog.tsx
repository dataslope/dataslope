"use client";

import { Dialog } from "@base-ui-components/react/dialog";

export interface RenameDatabaseDialogProps {
  open: boolean;
  name: string;
  ext: string;
  /** Extension `<option>` values, e.g. `[".pg", ".sql", ".dump"]`. */
  extensionOptions: string[];
  onNameChange: (name: string) => void;
  onExtChange: (ext: string) => void;
  onClose: () => void;
  /** Called with the assembled filename: `${name.trim()}${ext}`. */
  onConfirm: (newFilename: string) => void;
}

export function RenameDatabaseDialog({
  open,
  name,
  ext,
  extensionOptions,
  onNameChange,
  onExtChange,
  onClose,
  onConfirm,
}: RenameDatabaseDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup sql-rename-db-popup">
          <Dialog.Title className="confirm-title">Rename Database</Dialog.Title>
          <Dialog.Description className="confirm-desc">
            Choose a new display name for the current database.
          </Dialog.Description>
          <div className="sql-rename-db-form">
            <div className="sql-rename-db-name-row">
              <input
                className="sql-rename-input sql-rename-db-name-input"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="database name"
                aria-label="Database name"
                autoFocus
              />
              <select
                className="sql-rename-db-ext-select"
                value={ext}
                onChange={(e) => onExtChange(e.target.value)}
                aria-label="File extension"
              >
                {extensionOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="confirm-actions">
            <Dialog.Close className="confirm-btn confirm-btn-secondary">
              Cancel
            </Dialog.Close>
            <button
              type="button"
              className="confirm-btn confirm-btn-primary"
              disabled={!name.trim()}
              onClick={() => onConfirm(`${name.trim()}${ext}`)}
            >
              Rename
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
