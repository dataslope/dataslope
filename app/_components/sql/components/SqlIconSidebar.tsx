"use client";

import React, { useRef, useState, type ReactNode } from "react";
import { Popover } from "@base-ui/react/popover";

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
 * Thin vertical icon sidebar inside `.sql-sidebar`; each button shows a
 * hover-popover label. Reuses `.playground-icon-sidebar*` CSS so it matches
 * the language playgrounds' activity bars.
 */
export function SqlIconSidebar({ buttons }: SqlIconSidebarProps) {
  return (
    <nav className="playground-icon-sidebar" aria-label="Panel navigation">
      <div className="playground-icon-sidebar-top">
        {buttons.map((btn) => (
          <React.Fragment key={btn.label}>
            <IconSidebarButton btn={btn} />
          </React.Fragment>
        ))}
      </div>
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
