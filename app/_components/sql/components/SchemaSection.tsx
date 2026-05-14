"use client";

import type { ReactNode } from "react";
import { ContextMenu } from "@base-ui-components/react/context-menu";
import { Popover } from "@base-ui-components/react/popover";
import {
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Grid2x2Plus,
  Table,
} from "lucide-react";

export interface SchemaSectionProps {
  label: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  emptyMessage: string;
  children?: ReactNode;
  onAdd?: () => void;
  /** When provided, shows an Expand All / Collapse All icon button.
   *  `allExpanded` drives which icon is shown; the button calls
   *  `onCollapseAll` when true, `onExpandAll` when false. */
  allExpanded?: boolean;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

export function SchemaSection({
  label,
  count,
  expanded,
  onToggle,
  emptyMessage,
  children,
  onAdd,
  allExpanded,
  onExpandAll,
  onCollapseAll,
}: SchemaSectionProps) {
  const showExpandCollapse = count > 0 && (onExpandAll || onCollapseAll);
  const toggleHint = expanded
    ? `Collapse ${label.toLowerCase()}`
    : `Expand ${label.toLowerCase()}`;
  const expandCollapseHint = allExpanded
    ? `Collapse all ${label.toLowerCase()}`
    : `Expand all ${label.toLowerCase()}`;
  const addHint = `Add ${label.toLowerCase().replace(/s$/, "")}`;
  const hasContextMenu = !!(onAdd || onExpandAll || onCollapseAll);
  const labelLower = label.toLowerCase();

  const header = (
    <div className="sql-tree-section-header">
      <Popover.Root>
        <Popover.Trigger
          openOnHover
          delay={120}
          closeDelay={80}
          render={(props) => (
            <button
              type="button"
              {...props}
              className="sql-tree-section-toggle"
              onClick={onToggle}
              aria-expanded={expanded}
            >
              <span className="sql-tree-chevron" aria-hidden="true">
                {expanded ? (
                  <ChevronDown size={12} />
                ) : (
                  <ChevronRight size={12} />
                )}
              </span>
              <span className="sql-tree-label">
                {label} ({count})
              </span>
            </button>
          )}
        />
        <Popover.Portal>
          <Popover.Positioner
            className="sql-tree-popover-positioner"
            sideOffset={6}
            align="start"
          >
            <Popover.Popup className="bui-popup sql-tree-popover">
              {toggleHint}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      {showExpandCollapse && (
        <Popover.Root>
          <Popover.Trigger
            openOnHover
            delay={120}
            closeDelay={80}
            render={(props) => (
              <button
                type="button"
                {...props}
                className="sql-tree-section-expand-toggle"
                onClick={allExpanded ? onCollapseAll : onExpandAll}
                aria-label={expandCollapseHint}
              >
                {allExpanded ? (
                  <ChevronsUp size={12} aria-hidden="true" />
                ) : (
                  <ChevronsDown size={12} aria-hidden="true" />
                )}
              </button>
            )}
          />
          <Popover.Portal>
            <Popover.Positioner
              className="sql-tree-popover-positioner"
              sideOffset={6}
              align="start"
            >
              <Popover.Popup className="bui-popup sql-tree-popover">
                {expandCollapseHint}
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      )}
      {onAdd && (
        <Popover.Root>
          <Popover.Trigger
            openOnHover
            delay={120}
            closeDelay={80}
            render={(props) => (
              <button
                type="button"
                {...props}
                className="sql-tree-section-add"
                onClick={onAdd}
                aria-label={addHint}
              >
                <Grid2x2Plus size={12} aria-hidden="true" />
              </button>
            )}
          />
          <Popover.Portal>
            <Popover.Positioner
              className="sql-tree-popover-positioner"
              sideOffset={6}
              align="start"
            >
              <Popover.Popup className="bui-popup sql-tree-popover">
                {addHint}
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      )}
    </div>
  );

  return (
    <div className="sql-tree-section">
      {hasContextMenu ? (
        <ContextMenu.Root>
          <ContextMenu.Trigger render={(props) => <div {...props}>{header}</div>} />
          <ContextMenu.Portal>
            <ContextMenu.Positioner sideOffset={6}>
              <ContextMenu.Popup className="bui-popup examples-dropdown">
                {(onExpandAll || onCollapseAll) && count > 0 && (
                  <ContextMenu.Item
                    className="example-item"
                    onClick={allExpanded ? onCollapseAll : onExpandAll}
                  >
                    <div className="ex-title">
                      {allExpanded
                        ? `Collapse all ${labelLower}`
                        : `Expand all ${labelLower}`}
                    </div>
                  </ContextMenu.Item>
                )}
                {onAdd && (
                  <ContextMenu.Item
                    className="example-item"
                    onClick={onAdd}
                  >
                    <div className="ex-title">{addHint}</div>
                  </ContextMenu.Item>
                )}
              </ContextMenu.Popup>
            </ContextMenu.Positioner>
          </ContextMenu.Portal>
        </ContextMenu.Root>
      ) : (
        header
      )}
      {expanded && (
        <div className="sql-tree-section-body">
          {count === 0 ? (
            onAdd ? (
              <button
                type="button"
                className="sql-tree-create-btn"
                onClick={onAdd}
              >
                <Table size={12} aria-hidden="true" />
                <span>Create a {label.toLowerCase().replace(/s$/, "")}</span>
              </button>
            ) : (
              <div className="sql-tree-empty">{emptyMessage}</div>
            )
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}
