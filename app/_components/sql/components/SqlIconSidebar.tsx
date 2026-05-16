"use client";

import { Popover } from "@base-ui-components/react/popover";
import type { ReactNode } from "react";

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
 * Thin horizontal icon strip rendered inside `.sql-sidebar`, just below
 * `.sql-db-selector-wrap`.  Each button shows a Base UI hover-popover
 * label and highlights when `isActive` is true.
 *
 * Used by the DuckDB playground today; the same component can be dropped
 * into the SQLite / Postgres `SqlPlayground` sidebar without any changes.
 */
export function SqlIconSidebar({ buttons }: SqlIconSidebarProps) {
  return (
    <div className="sql-icon-sidebar">
      {buttons.map((btn) => (
        <Popover.Root key={btn.label}>
          <Popover.Trigger
            openOnHover
            delay={150}
            closeDelay={100}
            render={(triggerProps) => (
              <button
                {...triggerProps}
                type="button"
                className={`sql-icon-sidebar-btn${btn.isActive ? " active" : ""}`}
                aria-label={btn.label}
                onClick={btn.onClick}
              >
                {btn.icon}
              </button>
            )}
          />
          <Popover.Portal>
            <Popover.Positioner sideOffset={6} side="bottom">
              <Popover.Popup className="bui-popup pane-btn-popover">
                {btn.label}
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ))}
    </div>
  );
}
