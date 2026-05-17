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
}

/**
 * Thin vertical icon sidebar rendered inside `.sql-sidebar`, below
 * `.sql-db-selector-wrap`.  Each button shows a Base UI hover-popover
 * label and highlights when `isActive` is true.
 *
 * Reuses the `.pg-icon-sidebar` / `.pg-icon-sidebar-btn` CSS from
 * `playground.css` so the visual treatment stays consistent with the
 * language playground (Python, R, etc.) activity bars.
 *
 * Used by the DuckDB playground today; the same component can be dropped
 * into the SQLite / Postgres `SqlPlayground` sidebar without any changes.
 */
export function SqlIconSidebar({ buttons }: SqlIconSidebarProps) {
  return (
    <nav className="pg-icon-sidebar" aria-label="Panel navigation">
      {buttons.map((btn) => (
        <React.Fragment key={btn.label}>
          <IconSidebarButton btn={btn} />
        </React.Fragment>
      ))}
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
            className={`pg-icon-sidebar-btn${btn.isActive ? " active" : ""}`}
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
          className="pg-icon-sidebar-popover-positioner"
        >
          <Popover.Popup className="bui-popup pane-btn-popover">
            {btn.label}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
