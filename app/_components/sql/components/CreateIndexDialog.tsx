"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { buildCreateIndexSql, suggestIndexName } from "../utils/ddl";

/**
 * Shared "Create Index" dialog: the syntax is standard SQL across all three
 * engines, so only the `getColumns` / `onSubmit` callbacks are per-dialect.
 */
export interface CreateIndexDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tables the index can target. */
  tables: readonly string[];
  /** Pre-selected table (e.g. the one currently previewed). */
  defaultTable?: string;
  /** Fetch the column names of a table (dialect-specific). */
  getColumns: (table: string) => Promise<string[]>;
  /** Run the built SQL; resolve `true` on success (closes the dialog). */
  onSubmit: (sql: string, successMessage: string) => Promise<boolean>;
}

export function CreateIndexDialog({
  open,
  onOpenChange,
  tables,
  defaultTable,
  getColumns,
  onSubmit,
}: CreateIndexDialogProps) {
  const [table, setTable] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [unique, setUnique] = useState(false);
  const [ifNotExists, setIfNotExists] = useState(true);
  const [indexName, setIndexName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);
  const [loadingCols, setLoadingCols] = useState(false);
  const [colError, setColError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset the form during the render that flips `open` to true (the
  // "adjust state when a prop changes" pattern — in render, not an effect).
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const initial =
        defaultTable && tables.includes(defaultTable)
          ? defaultTable
          : (tables[0] ?? "");
      setTable(initial);
      setColumns([]);
      setSelected([]);
      setUnique(false);
      setIfNotExists(true);
      setIndexName("");
      setNameEdited(false);
      setColError(null);
      setLoadingCols(!!initial);
    }
  }

  // Fetch the selected table's columns. setState happens only in the
  // promise callbacks (never synchronously in the effect body), and a
  // `cancelled` guard makes the latest selected table win.
  useEffect(() => {
    if (!open || !table) return;
    let cancelled = false;
    getColumns(table).then(
      (cols) => {
        if (cancelled) return;
        setColumns(cols);
        setLoadingCols(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setColumns([]);
        setColError(err instanceof Error ? err.message : String(err));
        setLoadingCols(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, table, getColumns]);

  const suggestedName = useMemo(
    () => suggestIndexName(table, selected, unique),
    [table, selected, unique],
  );
  const effectiveName = nameEdited ? indexName : suggestedName;

  const previewSql = useMemo(() => {
    try {
      return buildCreateIndexSql({
        indexName: effectiveName,
        table,
        columns: selected,
        unique,
        ifNotExists,
      });
    } catch {
      return "";
    }
  }, [effectiveName, table, selected, unique, ifNotExists]);

  function toggleColumn(col: string) {
    setSelected((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    );
  }

  const canSubmit =
    !!table && selected.length > 0 && !!effectiveName.trim() && !submitting;

  async function handleSubmit() {
    if (!previewSql || !canSubmit) return;
    setSubmitting(true);
    const ok = await onSubmit(
      previewSql,
      `Created index "${effectiveName.trim()}".`,
    );
    setSubmitting(false);
    if (ok) onOpenChange(false);
  }

  const noTables = tables.length === 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup sql-create-popup">
          <div className="sql-create-header">
            <Dialog.Title className="confirm-title">Create Index</Dialog.Title>
            <Dialog.Close
              className="sql-modify-drawer-close"
              aria-label="Close"
            >
              <X size={16} aria-hidden="true" />
            </Dialog.Close>
          </div>

          {noTables ? (
            <p className="confirm-desc sql-create-empty">
              There are no tables to index yet. Create a table first.
            </p>
          ) : (
            <div className="sql-create-body">
              <label className="sql-create-field">
                <span className="sql-create-label">Table</span>
                <select
                  className="sql-create-select"
                  value={table}
                  onChange={(e) => {
                    setTable(e.target.value);
                    setSelected([]);
                    setNameEdited(false);
                    setColumns([]);
                    setColError(null);
                    setLoadingCols(!!e.target.value);
                  }}
                  aria-label="Table to index"
                >
                  {tables.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <div className="sql-create-field">
                <span className="sql-create-label">
                  Columns{" "}
                  <span className="sql-create-label-hint">
                    (checked order = index order)
                  </span>
                </span>
                {loadingCols ? (
                  <div className="sql-create-cols-status">Loading columns…</div>
                ) : colError ? (
                  <div className="sql-create-error">{colError}</div>
                ) : columns.length === 0 ? (
                  <div className="sql-create-cols-status">No columns found.</div>
                ) : (
                  <div className="sql-create-cols" role="group" aria-label="Columns to index">
                    {columns.map((col) => {
                      const pos = selected.indexOf(col);
                      return (
                        <label key={col} className="sql-create-col">
                          <input
                            type="checkbox"
                            checked={pos >= 0}
                            onChange={() => toggleColumn(col)}
                          />
                          <span className="sql-create-col-name">{col}</span>
                          {pos >= 0 && (
                            <span className="sql-create-col-order">
                              {pos + 1}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="sql-create-checks">
                <label className="sql-create-check">
                  <input
                    type="checkbox"
                    checked={unique}
                    onChange={(e) => setUnique(e.target.checked)}
                  />
                  Unique
                </label>
                <label className="sql-create-check">
                  <input
                    type="checkbox"
                    checked={ifNotExists}
                    onChange={(e) => setIfNotExists(e.target.checked)}
                  />
                  IF NOT EXISTS
                </label>
              </div>

              <label className="sql-create-field">
                <span className="sql-create-label">Index name</span>
                <input
                  className="sql-create-input"
                  value={effectiveName}
                  onChange={(e) => {
                    setNameEdited(true);
                    setIndexName(e.target.value);
                  }}
                  spellCheck={false}
                  aria-label="Index name"
                />
              </label>

              <div className="sql-create-field">
                <span className="sql-create-label">SQL to run</span>
                <pre className="sql-create-preview">
                  {previewSql || "-- select a table and column"}
                </pre>
              </div>
            </div>
          )}

          <div className="confirm-actions">
            <Dialog.Close className="confirm-btn confirm-btn-secondary">
              Cancel
            </Dialog.Close>
            <button
              type="button"
              className="confirm-btn confirm-btn-primary"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit || !previewSql}
            >
              {submitting ? "Creating…" : "Create Index"}
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
