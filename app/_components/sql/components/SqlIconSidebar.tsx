"use client";

import React, { useRef, useState, type ReactNode } from "react";
import { Popover } from "@base-ui-components/react/popover";

export interface SqlIconSidebarButton {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

interface SqlIconSidebarProps {
  buttons: SqlIconSidebarButton[];
  /** Buttons pinned to the bottom of the sidebar (e.g. Settings). */
  bottomButtons?: SqlIconSidebarButton[];
}

/**
 * Thin vertical icon sidebar rendered inside `.sql-sidebar`, below
 * `.sql-db-selector-wrap`.  Each button shows a Base UI hover-popover
 * label and highlights when `isActive` is true.
 *
 * Reuses the `.playground-icon-sidebar` / `.playground-icon-sidebar-btn` CSS from
 * `playground.css` so the visual treatment stays consistent with the
 * language playground (Python, R, etc.) activity bars.
 *
 * `buttons` appear at the top; `bottomButtons` are pinned to the bottom.
 */
export function SqlIconSidebar({ buttons, bottomButtons }: SqlIconSidebarProps) {
  return (
    <nav className="playground-icon-sidebar" aria-label="Panel navigation">
      <div className="playground-icon-sidebar-top">
        {buttons.map((btn) => (
          <React.Fragment key={btn.label}>
            <IconSidebarButton btn={btn} />
          </React.Fragment>
        ))}
      </div>
      {bottomButtons && bottomButtons.length > 0 && (
        <div className="playground-icon-sidebar-bottom">
          {bottomButtons.map((btn) => (
            <React.Fragment key={btn.label}>
              <IconSidebarButton btn={btn} />
            </React.Fragment>
          ))}
        </div>
      )}
    </nav>
  );
}

/** A single icon button with an auto-dismissing hover popover label. */
function IconSidebarButton({ btn }: { btn: SqlIconSidebarButton }) {
  const [open, setOpen] = useState(false);
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleOpenChange(next: boolean) {
    if (autoCloseTimer.current) {
      clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = null;
    }
    setOpen(next);
    if (next) {
      autoCloseTimer.current = setTimeout(() => {
        setOpen(false);
        autoCloseTimer.current = null;
      }, 1500);
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger
        openOnHover
        delay={150}
        closeDelay={100}
        render={(triggerProps) => (
          <button
            {...triggerProps}
            type="button"
            className={`playground-icon-sidebar-btn${btn.isActive ? " active" : ""}`}
            aria-label={btn.label}
            onClick={btn.onClick}
          >
            {btn.icon}
          </button>
        )}
      />
      <Popover.Portal>
        <Popover.Positioner
          sideOffset={6}
          side="right"
          className="playground-icon-sidebar-popover-positioner"
        >
          <Popover.Popup className="bui-popup pane-btn-popover">
            {btn.label}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
