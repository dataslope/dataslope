"use client";

import { Popover } from "@base-ui-components/react/popover";
import { ContextMenu } from "@base-ui-components/react/context-menu";
import { Hash, Zap } from "lucide-react";

// ────────────────────────────────────────────────────────────────────────
// SchemaLeafItem — sidebar row for indexes and triggers. These have
// no per-column metadata so the row is non-expandable; the row is just
// a name + context menu (View DDL / Copy Name / Drop).
// ────────────────────────────────────────────────────────────────────────

export interface SchemaLeafItemProps {
  name: string;
  kind: "index" | "trigger";
  onCopy: (name: string) => void;
  onViewDDL: (name: string, kind: "index" | "trigger") => void;
  onDrop: (name: string, kind: "index" | "trigger") => void;
}

export function SchemaLeafItem({
  name,
  kind,
  onCopy,
  onViewDDL,
  onDrop,
}: SchemaLeafItemProps) {
  const Icon = kind === "index" ? Hash : Zap;
  const itemHint = `View DDL for ${kind} ${name}`;
  return (
    <div className="sql-tree-entity">
      <ContextMenu.Root>
        <ContextMenu.Trigger
          render={(props) => (
            <div {...props} className="sql-tree-entity-trigger">
              <Popover.Root>
                <Popover.Trigger
                  openOnHover
                  delay={180}
                  closeDelay={80}
                  render={(triggerProps) => (
                    <button
                      type="button"
                      {...triggerProps}
                      className="sql-tree-item sql-tree-item-leaf"
                      onClick={() => onViewDDL(name, kind)}
                    >
                      <span className="sql-tree-chevron" aria-hidden="true" />
                      <Icon size={12} aria-hidden="true" />
                      <span className="sql-tree-item-name">{name}</span>
                    </button>
                  )}
                />
                <Popover.Portal>
                  <Popover.Positioner
                    className="sql-tree-popover-positioner"
                    sideOffset={6}
                    side="right"
                    align="start"
                  >
                    <Popover.Popup className="bui-popup sql-tree-popover">
                      <strong>{name}</strong>
                      <span>{itemHint}</span>
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>
            </div>
          )}
        />
        <ContextMenu.Portal>
          <ContextMenu.Positioner sideOffset={6}>
            <ContextMenu.Popup className="bui-popup examples-dropdown">
              <ContextMenu.Item
                className="example-item"
                onClick={() => onViewDDL(name, kind)}
              >
                <div className="ex-title">View DDL</div>
              </ContextMenu.Item>
              <ContextMenu.Item
                className="example-item"
                onClick={() => onCopy(name)}
              >
                <div className="ex-title">Copy Name</div>
              </ContextMenu.Item>
              <ContextMenu.Item
                className="example-item"
                onClick={() => onDrop(name, kind)}
              >
                <div className="ex-title">
                  Drop {kind === "index" ? "Index" : "Trigger"}
                </div>
              </ContextMenu.Item>
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>
    </div>
  );
}
