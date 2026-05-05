"use client";

import React, { useCallback, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS as DndCSS } from "@dnd-kit/utilities";
import { Dialog } from "@base-ui-components/react/dialog";
import { Popover } from "@base-ui-components/react/popover";
import { ContextMenu } from "@base-ui-components/react/context-menu";
import { Network, Table, X } from "lucide-react";
import type { QueryTab } from "../../sqlitePlaygroundTabs";

export interface SqlTabProps {
  tab: QueryTab;
  active: boolean;
  onActivate: () => void;
  onClose: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onCloseOthers: () => void;
  onCloseAll: () => void;
}

export function SqlTab({
  tab,
  active,
  onActivate,
  onClose,
  onRename,
  onDuplicate,
  onCloseOthers,
  onCloseAll,
}: SqlTabProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState(tab.title);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const titleRef = useRef<HTMLSpanElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const dragStyle: React.CSSProperties = {
    transform: DndCSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    zIndex: isDragging ? 10 : undefined,
  };

  const openRename = useCallback(() => {
    setDraftTitle(tab.title);
    setRenameOpen(true);
  }, [tab.title]);

  const submitRename = useCallback(() => {
    onRename(draftTitle);
    setRenameOpen(false);
  }, [draftTitle, onRename]);

  return (
    <>
      <Dialog.Root open={renameOpen} onOpenChange={setRenameOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="confirm-backdrop" />
          <Dialog.Popup className="confirm-popup sql-rename-popup">
            <Dialog.Title className="confirm-title">
              Rename query tab
            </Dialog.Title>
            <Dialog.Description className="confirm-desc">
              Choose a short name for this query tab.
            </Dialog.Description>
            <form
              className="sql-rename-form"
              onSubmit={(e) => {
                e.preventDefault();
                submitRename();
              }}
            >
              <input
                className="sql-rename-input"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                autoFocus
              />
              <div className="confirm-actions">
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                <button
                  type="submit"
                  className="confirm-btn confirm-btn-primary"
                >
                  Rename
                </button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <ContextMenu.Root>
        <ContextMenu.Trigger
          render={(props) => (
            <button
              type="button"
              {...props}
              {...attributes}
              {...listeners}
              ref={setNodeRef}
              style={dragStyle}
              className={`sql-tab${active ? " active" : ""}${tab.kind === "view-data" ? " sql-tab-view-data" : ""}${tab.kind === "er-diagram" ? " sql-tab-er-diagram" : ""}`}
              onClick={onActivate}
              aria-selected={active}
              role="tab"
              onMouseEnter={() => {
                const el = titleRef.current;
                if (el && el.scrollWidth > el.clientWidth) {
                  setPopoverOpen(true);
                }
              }}
              onMouseLeave={() => setPopoverOpen(false)}
            >
              {tab.kind === "view-data" && (
                <Table size={11} className="sql-tab-kind-icon" aria-hidden="true" />
              )}
              {tab.kind === "er-diagram" && (
                <Network size={11} className="sql-tab-kind-icon" aria-hidden="true" />
              )}
              <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
                <Popover.Trigger
                  nativeButton={false}
                  render={<span ref={titleRef} className="sql-tab-title" />}
                >
                  {tab.title}
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Positioner
                    side="top"
                    sideOffset={6}
                    align="center"
                    className="sql-tab-name-positioner"
                  >
                    <Popover.Popup className="bui-popup sql-tab-name-popover">
                      {tab.title}
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>
              <span
                role="button"
                tabIndex={-1}
                className="sql-tab-close"
                aria-label={`Close ${tab.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                  }
                }}
              >
                <X size={10} aria-hidden="true" />
              </span>
            </button>
          )}
        />
        <ContextMenu.Portal>
          <ContextMenu.Positioner sideOffset={6}>
            <ContextMenu.Popup className="bui-popup">
              {tab.kind !== "view-data" && tab.kind !== "er-diagram" && (
                <ContextMenu.Item className="example-item" onClick={openRename}>
                  <div className="ex-title">Rename</div>
                </ContextMenu.Item>
              )}
              {tab.kind !== "er-diagram" && (
                <ContextMenu.Item className="example-item" onClick={onDuplicate}>
                  <div className="ex-title">Duplicate</div>
                </ContextMenu.Item>
              )}
              <ContextMenu.Item className="example-item" onClick={onClose}>
                <div className="ex-title">Close</div>
              </ContextMenu.Item>
              <ContextMenu.Item
                className="example-item"
                onClick={onCloseOthers}
              >
                <div className="ex-title">Close Others</div>
              </ContextMenu.Item>
              <ContextMenu.Item className="example-item" onClick={onCloseAll}>
                <div className="ex-title">Close All</div>
              </ContextMenu.Item>
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>
    </>
  );
}
