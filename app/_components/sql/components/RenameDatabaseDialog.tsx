"use client";

import { Dialog } from "@base-ui/react/dialog";

export interface ExtensionOption {
  value: string;
  /** Displayed in the dropdown. Defaults to `value` if omitted. */
  label?: string;
}

export interface RenameDatabaseDialogProps {
  open: boolean;
  name: string;
  ext: string;
  /** Extension options for the dropdown. Pass strings or `{ value, label }` pairs. */
  extensionOptions: Array<string | ExtensionOption>;
  onNameChange: (name: string) => void;
  onExtChange: (ext: string) => void;
  onClose: () => void;
  /** Called with the assembled filename: `${name.trim()}${ext}`. */
  onConfirm: (newFilename: string) => void;
  /** Overrides the default description text. */
  description?: string;
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
  description = "Choose a new display name for the current database.",
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
            {description}
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
                {extensionOptions.map((o) => {
                  const val = typeof o === "string" ? o : o.value;
                  const label = typeof o === "string" ? o : (o.label ?? o.value);
                  return (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  );
                })}
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
