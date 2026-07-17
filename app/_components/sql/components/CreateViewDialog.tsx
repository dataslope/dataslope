"use client";

import { useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import {
  buildCreateViewSql,
  looksLikeViewBody,
  type SqlDialectId,
} from "../utils/ddl";

/**
 * Shared "Create View" dialog for the SQLite / Postgres / DuckDB
 * playgrounds. The only dialect-aware bit is replacement: Postgres and
 * DuckDB emit `CREATE OR REPLACE VIEW`, while SQLite (which has no such
 * form) emulates it with `DROP VIEW IF EXISTS` + `CREATE VIEW`. That
 * divergence lives entirely in the pure `buildCreateViewSql` builder, so
 * each playground only supplies its `dialect` and an `onSubmit` runner.
 */
export interface CreateViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dialect: SqlDialectId;
  /** Editor text to seed the body with when it looks like a query. */
  defaultBody?: string;
  /** Run the built SQL; resolve `true` on success (closes the dialog). */
  onSubmit: (sql: string, successMessage: string) => Promise<boolean>;
}

export function CreateViewDialog({
  open,
  onOpenChange,
  dialect,
  defaultBody,
  onSubmit,
}: CreateViewDialogProps) {
  const [viewName, setViewName] = useState("");
  const [body, setBody] = useState("");
  const [orReplace, setOrReplace] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset the form during the render that flips `open` to true (React's
  // "adjust state when a prop changes" pattern, done in render, not an
  // effect, so there's no cascading-render lint violation).
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setViewName("");
      setBody(
        defaultBody && looksLikeViewBody(defaultBody) ? defaultBody.trim() : "",
      );
      setOrReplace(false);
    }
  }

  const previewSql = useMemo(() => {
    try {
      return buildCreateViewSql({ viewName, selectBody: body, dialect, orReplace });
    } catch {
      return "";
    }
  }, [viewName, body, dialect, orReplace]);

  const canSubmit = !!viewName.trim() && !!body.trim() && !submitting;

  async function handleSubmit() {
    if (!previewSql || !canSubmit) return;
    setSubmitting(true);
    const ok = await onSubmit(
      previewSql,
      `Created view "${viewName.trim()}".`,
    );
    setSubmitting(false);
    if (ok) onOpenChange(false);
  }

  const showSqliteReplaceHint = orReplace && dialect === "sqlite";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup sql-create-popup">
          <div className="sql-create-header">
            <Dialog.Title className="confirm-title">Create View</Dialog.Title>
            <Dialog.Close
              className="sql-modify-drawer-close"
              aria-label="Close"
            >
              <X size={16} aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div className="sql-create-body">
            <label className="sql-create-field">
              <span className="sql-create-label">View name</span>
              <input
                className="sql-create-input"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder="active_users"
                spellCheck={false}
                aria-label="View name"
              />
            </label>

            <label className="sql-create-field">
              <span className="sql-create-label">
                SELECT statement{" "}
                <span className="sql-create-label-hint">
                  (the query the view returns)
                </span>
              </span>
              <textarea
                className="sql-create-textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="SELECT * FROM users WHERE active"
                spellCheck={false}
                rows={5}
                aria-label="View SELECT statement"
              />
            </label>

            <label className="sql-create-check">
              <input
                type="checkbox"
                checked={orReplace}
                onChange={(e) => setOrReplace(e.target.checked)}
              />
              Replace if it already exists
            </label>
            {showSqliteReplaceHint && (
              <p className="sql-create-hint">
                SQLite has no <code>CREATE OR REPLACE VIEW</code>, so this runs{" "}
                <code>DROP VIEW IF EXISTS</code> first.
              </p>
            )}

            <div className="sql-create-field">
              <span className="sql-create-label">SQL to run</span>
              <pre className="sql-create-preview">
                {previewSql || "-- name the view and write its SELECT"}
              </pre>
            </div>
          </div>

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
              {submitting ? "Creating…" : "Create View"}
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
