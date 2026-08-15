"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";

/**
 * Shared read-only "Query plan" modal: the formatted EXPLAIN output in a
 * monospace `<pre>` with a Copy action. Only the per-engine EXPLAIN run +
 * formatting lives in each playground.
 */
export interface ExplainPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The statement that was explained (shown as a subtitle). */
  querySql: string;
  /** The formatted plan text. */
  plan: string;
  onCopied: () => void;
  onCopyFailed: () => void;
  /** Postgres only: the ANALYZE / BUFFERS state of the plan on screen, plus a
   *  callback to re-run with a different combination. Omit to hide the
   *  toggles (SQLite and DuckDB have no equivalent). */
  options?: { analyze?: boolean; buffers?: boolean };
  onOptionsChange?: (options: { analyze?: boolean; buffers?: boolean }) => void;
}

export function ExplainPlanDialog({
  open,
  onOpenChange,
  querySql,
  plan,
  onCopied,
  onCopyFailed,
  options,
  onOptionsChange,
}: ExplainPlanDialogProps) {
  function handleCopy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(plan).then(onCopied).catch(onCopyFailed);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup sql-explain-popup">
          <div className="sql-create-header">
            <Dialog.Title className="confirm-title">Query plan</Dialog.Title>
            <Dialog.Close
              className="sql-modify-drawer-close"
              aria-label="Close"
            >
              <X size={16} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sql-explain-subtitle">
            {querySql}
          </Dialog.Description>
          {options && onOptionsChange && (
            <div className="sql-explain-options">
              <label className="sql-explain-option">
                <input
                  type="checkbox"
                  checked={!!options.analyze}
                  onChange={(e) =>
                    onOptionsChange({
                      analyze: e.target.checked,
                      // BUFFERS is meaningless without ANALYZE; turning
                      // ANALYZE off drops it too rather than sending a flag
                      // that reports nothing.
                      buffers: e.target.checked ? options.buffers : false,
                    })
                  }
                />
                ANALYZE
              </label>
              <label className="sql-explain-option">
                <input
                  type="checkbox"
                  checked={!!options.buffers}
                  onChange={(e) =>
                    onOptionsChange({
                      analyze: options.analyze || e.target.checked,
                      buffers: e.target.checked,
                    })
                  }
                />
                BUFFERS
              </label>
              {(options.analyze || options.buffers) && (
                <span className="sql-explain-options-note">
                  ANALYZE runs the statement, so a write really writes.
                </span>
              )}
            </div>
          )}
          <pre className="sql-explain-plan">{plan}</pre>
          <div className="confirm-actions">
            <button
              type="button"
              className="confirm-btn confirm-btn-secondary"
              onClick={handleCopy}
            >
              Copy
            </button>
            <Dialog.Close className="confirm-btn confirm-btn-primary">
              Close
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
