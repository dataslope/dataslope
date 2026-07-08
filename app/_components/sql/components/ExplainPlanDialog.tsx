"use client";

import { Dialog } from "@base-ui-components/react/dialog";
import { X } from "lucide-react";

/**
 * Shared read-only "Query plan" modal, shows the formatted output of an
 * EXPLAIN run (the plan text) in a monospace `<pre>`, with a Copy action.
 * Used by all three SQL playgrounds; only the per-engine EXPLAIN run +
 * formatting (pure `utils/explain.ts`) lives in each playground.
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
}

export function ExplainPlanDialog({
  open,
  onOpenChange,
  querySql,
  plan,
  onCopied,
  onCopyFailed,
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
