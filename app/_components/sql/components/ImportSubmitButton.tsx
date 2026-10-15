"use client";

import { Loader2 } from "lucide-react";

export interface ImportSubmitButtonProps {
  importing: boolean;
  onClick: () => void;
}

/** The CSV / JSON / Parquet dialogs' Import button. While the rows are being
 *  written it is disabled and shows a spinner, so the click visibly took. */
export function ImportSubmitButton({
  importing,
  onClick,
}: ImportSubmitButtonProps) {
  return (
    <button
      type="button"
      className="confirm-btn confirm-btn-primary sql-import-submit"
      disabled={importing}
      aria-busy={importing || undefined}
      onClick={onClick}
    >
      {importing && (
        <Loader2
          size={14}
          className="sql-import-submit-spinner"
          aria-hidden="true"
        />
      )}
      {importing ? "Importing…" : "Import"}
    </button>
  );
}
