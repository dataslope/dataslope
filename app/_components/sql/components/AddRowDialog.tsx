"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type { AddRowDialogState } from "../types";

/**
 * Shared "Add Row" drawer for the Postgres and DuckDB playgrounds; only the
 * dialect-specific `submitAddRow()` lives in the per-playground module.
 */
export interface AddRowDialogProps {
  /** Current dialog state, or `null` when the drawer is closed. */
  state: AddRowDialogState | null;
  /** State setter; the drawer uses the functional form to update
   *  per-column input values and the "keep open" checkbox. */
  setState: React.Dispatch<React.SetStateAction<AddRowDialogState | null>>;
  /** Called when the user clicks the primary "Add Row" button. */
  onSubmit: () => void;
}

export function AddRowDialog({ state, setState, onSubmit }: AddRowDialogProps) {
  return (
    <Dialog.Root
      open={state !== null}
      onOpenChange={(next) => {
        if (!next) setState(null);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop sql-modify-backdrop" />
        <Dialog.Popup className="sql-modify-drawer">
          <header className="sql-modify-drawer-header">
            <div className="sql-modify-drawer-heading">
              <Dialog.Title className="sql-modify-drawer-title">
                Add Row
              </Dialog.Title>
              <Dialog.Description className="sql-modify-drawer-subtitle">
                {state?.tableName ?? ""}
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="sql-modify-drawer-close"
              aria-label="Close"
            >
              <X size={16} aria-hidden="true" />
            </Dialog.Close>
          </header>
          {state && (
            <div className="sql-modify-body">
              <div className="sql-add-row-fields">
                {state.columns.map((c) => {
                  const hasDefault = c.defaultValue !== null;
                  const placeholder = hasDefault
                    ? `auto (${c.defaultValue})`
                    : c.notNull
                      ? "required"
                      : "NULL if empty";
                  return (
                    <label key={c.name} className="sql-add-row-field">
                      <span className="sql-add-row-field-label">
                        <span className="sql-add-row-field-name">{c.name}</span>
                        <span className="sql-add-row-field-type">
                          {c.type || "—"}
                        </span>
                      </span>
                      <input
                        className="sql-rename-input"
                        value={state.values[c.name] ?? ""}
                        onChange={(e) =>
                          setState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  values: {
                                    ...prev.values,
                                    [c.name]: e.target.value,
                                  },
                                }
                              : null,
                          )
                        }
                        placeholder={placeholder}
                        aria-label={c.name}
                      />
                    </label>
                  );
                })}
              </div>
              <label className="sql-add-row-another">
                <input
                  type="checkbox"
                  checked={state.addAnother}
                  onChange={(e) =>
                    setState((prev) =>
                      prev ? { ...prev, addAnother: e.target.checked } : null,
                    )
                  }
                />
                Keep open to add another row
              </label>
            </div>
          )}
          <footer className="sql-modify-drawer-footer">
            <Dialog.Close className="confirm-btn confirm-btn-secondary">
              Cancel
            </Dialog.Close>
            <button
              type="button"
              className="confirm-btn confirm-btn-primary"
              onClick={() => onSubmit()}
              disabled={!state}
            >
              Add Row
            </button>
          </footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
