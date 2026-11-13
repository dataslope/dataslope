"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";

/** Asks before a half-finished form is thrown away.
 *
 *  The structure drawers closed on Escape, on a click outside, on the X and
 *  on Cancel, and each of those discarded whatever had been typed. Escape is
 *  the dangerous one: it is also how the type list inside the drawer is
 *  dismissed, so one keypress too many silently erased a whole table
 *  definition.
 *
 *  Route every close through `requestClose` (a Base UI dialog reports all
 *  four through `onOpenChange(false)`), and render `dialog` beside the
 *  drawer. A form with nothing to lose closes immediately. */
export function useDiscardGuard({
  isDirty,
  onDiscard,
  title = "Discard your changes?",
  description = "What you entered in this form has not been saved.",
}: {
  isDirty: boolean;
  onDiscard: () => void;
  title?: string;
  description?: string;
}): { requestClose: () => void; dialog: ReactNode } {
  const [asking, setAsking] = useState(false);

  const requestClose = useCallback(() => {
    if (isDirty) setAsking(true);
    else onDiscard();
  }, [isDirty, onDiscard]);

  const dialog = (
    <Dialog.Root
      open={asking}
      onOpenChange={(next) => {
        if (!next) setAsking(false);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop sql-discard-backdrop" />
        <Dialog.Popup className="confirm-popup sql-discard-popup" role="alertdialog">
          <Dialog.Title className="confirm-title">{title}</Dialog.Title>
          <Dialog.Description className="confirm-desc">
            {description}
          </Dialog.Description>
          <div className="confirm-actions">
            <Dialog.Close className="confirm-btn confirm-btn-secondary">
              Keep editing
            </Dialog.Close>
            <button
              type="button"
              className="confirm-btn confirm-btn-danger"
              onClick={() => {
                setAsking(false);
                onDiscard();
              }}
            >
              Discard
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );

  return { requestClose, dialog };
}
