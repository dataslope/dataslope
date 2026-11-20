"use client";

import { useRef } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Select } from "@base-ui/react/select";
import { ChevronDown, X } from "lucide-react";
import type { TableColumnInfo } from "../../runtime/sqlite";
import type { AddRowDialogState } from "../types";

/**
 * Shared "Add Row" drawer for the three SQL playgrounds; only the
 * dialect-specific `submitAddRow()` lives in the per-playground module.
 */
export type AddRowDialect = "sqlite" | "postgres" | "duckdb";

export interface AddRowDialogProps {
  /** Decides what a blank primary key means and how a boolean is written. */
  dialect: AddRowDialect;
  /** Current dialog state, or `null` when the drawer is closed. */
  state: AddRowDialogState | null;
  /** State setter; the drawer uses the functional form to update
   *  per-column input values and the "keep open" checkbox. */
  setState: React.Dispatch<React.SetStateAction<AddRowDialogState | null>>;
  /** Called when the user clicks the primary "Add Row" button and every
   *  required field has a value. */
  onSubmit: () => void;
}

export type BlankMeaning = "rowid" | "identity" | "default" | "required" | "null";

/** What a blank input does for this column.
 *
 *  Only SQLite numbers a row by itself: a lone `INTEGER PRIMARY KEY` is an
 *  alias for the rowid, so NULL there means "the next id". Postgres and
 *  DuckDB give a plain integer key nothing; there only an identity column or
 *  a column with a default (`nextval(…)`, `now()`, …) fills itself in, and
 *  a NOT NULL key without one is required. Treating every integer key as
 *  SQLite's rowid is what made a blank Postgres or DuckDB id fail. */
export function blankMeaning(
  c: TableColumnInfo,
  dialect: AddRowDialect,
  columns: readonly TableColumnInfo[],
): BlankMeaning {
  if (
    dialect === "sqlite" &&
    c.pk > 0 &&
    columns.filter((col) => col.pk > 0).length === 1 &&
    /^integer$/i.test((c.type || "").trim())
  ) {
    return "rowid";
  }
  if (c.identity) return "identity";
  if (c.defaultValue !== null) return "default";
  if (c.notNull) return "required";
  return "null";
}

/** Blank required fields: what the submit button checks before sending. */
export function missingRequired(
  state: AddRowDialogState,
  dialect: AddRowDialect,
): string[] {
  return state.columns
    .filter(
      (c) =>
        !c.generated &&
        blankMeaning(c, dialect, state.columns) === "required" &&
        (state.values[c.name] ?? "") === "",
    )
    .map((c) => c.name);
}

/** Can this column hold the empty string at all? Only text does: `''` is
 *  not an integer, a date or a boolean in Postgres or DuckDB, so offering
 *  it there only sets up an error. SQLite stores anything anywhere, but
 *  only a column with text affinity (or no declared type) means it. */
export function acceptsEmptyString(
  c: TableColumnInfo,
  dialect: AddRowDialect,
): boolean {
  const type = (c.type || "").trim();
  if (dialect === "sqlite" && type === "") return true;
  return /char|text|clob|string|citext/i.test(type);
}

/** SQLite has no boolean type and stores 1 / 0; the others take the
 *  literals. */
function booleanOptions(dialect: AddRowDialect) {
  return dialect === "sqlite"
    ? [
        { value: "1", label: "true (1)" },
        { value: "0", label: "false (0)" },
      ]
    : [
        { value: "true", label: "true" },
        { value: "false", label: "false" },
      ];
}

export function AddRowDialog({
  dialect,
  state,
  setState,
  onSubmit,
}: AddRowDialogProps) {
  const fieldsRef = useRef<HTMLDivElement>(null);
  const fieldId = (name: string) => `sql-add-row-${name}`;

  const setValue = (name: string, value: string) =>
    setState((prev) =>
      prev ? { ...prev, values: { ...prev.values, [name]: value } } : null,
    );

  const submit = () => {
    if (!state) return;
    const missing = missingRequired(state, dialect);
    if (missing.length > 0) {
      setState((prev) => (prev ? { ...prev, showMissing: true } : null));
      document.getElementById(fieldId(missing[0]))?.focus();
      return;
    }
    onSubmit();
  };

  return (
    <Dialog.Root
      open={state !== null}
      onOpenChange={(next) => {
        if (!next) setState(null);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop sql-modify-backdrop" />
        <Dialog.Popup
          className="sql-modify-drawer"
          // Start in the first field, not on the close button: the drawer
          // opens to be filled in.
          initialFocus={() =>
            fieldsRef.current?.querySelector<HTMLElement>(
              "input, .sql-add-row-select-trigger",
            ) ?? true
          }
        >
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
              <div className="sql-add-row-fields" ref={fieldsRef}>
                {state.columns.map((c) => {
                  const blank = blankMeaning(c, dialect, state.columns);
                  const emptyAsText = state.emptyAsText?.[c.name] ?? false;
                  const value = state.values[c.name] ?? "";
                  const placeholder = emptyAsText
                    ? "empty string"
                    : blank === "rowid"
                      ? "auto (next rowid)"
                      : blank === "identity"
                        ? "auto (identity)"
                        : blank === "default"
                          ? `auto (${c.defaultValue})`
                          : blank === "required"
                            ? "required"
                            : "NULL if empty";
                  const invalid =
                    !!state.showMissing && blank === "required" && value === "";
                  // The empty-string toggle only resolves a real ambiguity: a
                  // blank text input that would otherwise become NULL or a
                  // default.
                  const canBeEmptyString =
                    !c.generated &&
                    (blank === "default" || blank === "null") &&
                    acceptsEmptyString(c, dialect);
                  const isBoolean = /^bool(ean)?$/i.test((c.type || "").trim());
                  return (
                    <div key={c.name} className="sql-add-row-field">
                      <label
                        className="sql-add-row-field-label"
                        htmlFor={fieldId(c.name)}
                      >
                        <span className="sql-add-row-field-name">{c.name}</span>
                        <span className="sql-add-row-field-type">
                          {c.type || "—"}
                        </span>
                      </label>
                      <span className="sql-add-row-field-input">
                        {isBoolean ? (
                          // A boolean is a choice of three, not free text.
                          <Select.Root
                            value={value}
                            onValueChange={(next) => setValue(c.name, next ?? "")}
                          >
                            <Select.Trigger
                              id={fieldId(c.name)}
                              className="sql-rename-input sql-add-row-select-trigger"
                              aria-invalid={invalid || undefined}
                            >
                              <Select.Value>
                                {(v: string) =>
                                  v === "" ? (
                                    <span className="sql-add-row-select-placeholder">
                                      {placeholder}
                                    </span>
                                  ) : (
                                    (booleanOptions(dialect).find(
                                      (o) => o.value === v,
                                    )?.label ?? v)
                                  )
                                }
                              </Select.Value>
                              <ChevronDown size={13} aria-hidden="true" />
                            </Select.Trigger>
                            <Select.Portal>
                              <Select.Positioner
                                className="sql-add-row-select-positioner"
                                sideOffset={4}
                                alignItemWithTrigger={false}
                              >
                                <Select.Popup className="bui-select-popup">
                                  <Select.Item value="" className="bui-select-item">
                                    <Select.ItemText>{placeholder}</Select.ItemText>
                                  </Select.Item>
                                  {booleanOptions(dialect).map((opt) => (
                                    <Select.Item
                                      key={opt.value}
                                      value={opt.value}
                                      className="bui-select-item"
                                    >
                                      <Select.ItemText>{opt.label}</Select.ItemText>
                                    </Select.Item>
                                  ))}
                                </Select.Popup>
                              </Select.Positioner>
                            </Select.Portal>
                          </Select.Root>
                        ) : (
                          <input
                            id={fieldId(c.name)}
                            className="sql-rename-input"
                            value={value}
                            onChange={(e) => setValue(c.name, e.target.value)}
                            placeholder={placeholder}
                            aria-invalid={invalid || undefined}
                          />
                        )}
                        {canBeEmptyString ? (
                          <button
                            type="button"
                            className={`sql-add-row-empty-toggle${emptyAsText ? " active" : ""}`}
                            aria-pressed={emptyAsText}
                            title={
                              emptyAsText
                                ? "A blank field inserts the empty string ''. Click to insert NULL or the default instead."
                                : "A blank field inserts NULL or the default. Click to insert the empty string '' instead."
                            }
                            onClick={() =>
                              setState((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      emptyAsText: {
                                        ...prev.emptyAsText,
                                        [c.name]: !emptyAsText,
                                      },
                                    }
                                  : null,
                              )
                            }
                          >
                            Empty string
                          </button>
                        ) : (
                          // Holds the toggle's column so every field ends at
                          // the same edge.
                          <span
                            className="sql-add-row-empty-slot"
                            aria-hidden="true"
                          />
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              {state.showMissing &&
                missingRequired(state, dialect).length > 0 && (
                <p className="sql-add-row-missing" role="alert">
                  Fill in the required fields to add the row.
                </p>
              )}
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
              onClick={submit}
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
