"use client";

import { memo } from "react";
import { Popover } from "@base-ui/react/popover";
import { ContextMenu } from "@base-ui/react/context-menu";
import { FunctionSquare, Hash, ListOrdered, Zap } from "lucide-react";

// ────────────────────────────────────────────────────────────────────────
// SchemaLeafItem, sidebar row for indexes, triggers, sequences and
// functions. These have no per-column metadata so the row is
// non-expandable; the row is just a name + context menu (View DDL /
// Copy Name / Drop).
// ────────────────────────────────────────────────────────────────────────

export type SchemaLeafKind = "index" | "trigger" | "sequence" | "function";

const LEAF_ICON = {
  index: Hash,
  trigger: Zap,
  sequence: ListOrdered,
  function: FunctionSquare,
} as const;

const LEAF_DROP_LABEL = {
  index: "Index",
  trigger: "Trigger",
  sequence: "Sequence",
  function: "Function",
} as const;

/** Generic over the kind so each playground keeps its own narrower union:
 *  SQLite has no sequences or functions, and its `onDrop` must not be asked to
 *  accept kinds its engine can't drop. */
export interface SchemaLeafItemProps<K extends SchemaLeafKind = SchemaLeafKind> {
  name: string;
  kind: K;
  onCopy: (name: string) => void;
  onViewDDL: (name: string, kind: K) => void;
  onDrop: (name: string, kind: K) => void;
}

// `memo` erases the generic, so the parameter is re-applied on the way out.
export const SchemaLeafItem = memo(SchemaLeafItemImpl) as <
  K extends SchemaLeafKind,
>(
  props: SchemaLeafItemProps<K>,
) => React.ReactElement;

function SchemaLeafItemImpl({
  name,
  kind,
  onCopy,
  onViewDDL,
  onDrop,
}: SchemaLeafItemProps) {
  const Icon = LEAF_ICON[kind];
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
                      <span className="sql-tree-popover-name">
                        <Icon size={12} aria-hidden="true" />
                        <strong>{name}</strong>
                      </span>
                      <span className="sql-tree-popover-hint">{itemHint}</span>
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
                <div className="ex-title">Drop {LEAF_DROP_LABEL[kind]}</div>
              </ContextMenu.Item>
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>
    </div>
  );
}
