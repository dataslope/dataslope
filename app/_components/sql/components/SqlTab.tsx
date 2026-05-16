"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS as DndCSS } from "@dnd-kit/utilities";
import { Dialog } from "@base-ui-components/react/dialog";
import { Popover } from "@base-ui-components/react/popover";
import { ContextMenu } from "@base-ui-components/react/context-menu";
import { History, Network, Table, X } from "lucide-react";
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

export const SqlTab = memo(SqlTabImpl);

function SqlTabImpl({
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
  const [isClosing, setIsClosing] = useState(false);
  // Mount Base UI's Popover.Root only after a confirmed hover. Mounting
  // it sooner (e.g. eagerly, or on the very first mouseenter) makes the
  // popover's setup work run right when a new tab is added — the +
  // button shifts under the cursor so mouseenter fires on the fresh tab
  // without any real mouse movement, and the resulting popover work
  // blocks the editor input that follows the click.
  const [popoverMounted, setPopoverMounted] = useState(false);
  const closedRef = useRef(false);
  const titleRef = useRef<HTMLSpanElement>(null);
  const hoverTimerRef = useRef<number | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearHoverTimer, [clearHoverTimer]);

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
    opacity: isDragging ? 0 : undefined,
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

  const handleClose = useCallback(() => {
    setIsClosing(true);
    // Safety net: if onAnimationEnd never fires (e.g. the element is hidden
    // or the animation is skipped), fall back to closing after a short delay.
    setTimeout(() => {
      if (!closedRef.current) {
        closedRef.current = true;
        onClose();
      }
    }, 200);
  }, [onClose]);

  const handleAnimationEnd = useCallback(() => {
    if (isClosing && !closedRef.current) {
      closedRef.current = true;
      onClose();
    }
  }, [isClosing, onClose]);

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
              className={`sql-tab${active ? " active" : ""}${tab.kind === "view-data" ? " sql-tab-view-data" : ""}${tab.kind === "er-diagram" ? " sql-tab-er-diagram" : ""}${tab.kind === "query-history" ? " sql-tab-query-history" : ""}${isClosing ? " sql-tab--closing" : ""}`}
              onClick={onActivate}
              aria-selected={active}
              role="tab"
              onAnimationEnd={handleAnimationEnd}
              onMouseEnter={() => {
                clearHoverTimer();
                // Delay the popover decision so a mouseenter caused by
                // a layout shift (clicking + makes the new tab appear
                // under the stationary cursor) doesn't open the popover.
                // Real hovers persist past this delay; layout-shift
                // enters get cancelled by mouseleave when the user
                // moves to the keyboard to type.
                hoverTimerRef.current = window.setTimeout(() => {
                  hoverTimerRef.current = null;
                  const el = titleRef.current;
                  if (el && el.scrollWidth > el.clientWidth) {
                    setPopoverMounted(true);
                    setPopoverOpen(true);
                  }
                }, 200);
              }}
              onMouseLeave={() => {
                clearHoverTimer();
                setPopoverOpen(false);
              }}
            >
              {tab.kind === "view-data" && (
                <Table size={11} className="sql-tab-kind-icon" aria-hidden="true" />
              )}
              {tab.kind === "er-diagram" && (
                <Network size={11} className="sql-tab-kind-icon" aria-hidden="true" />
              )}
              {tab.kind === "query-history" && (
                <History size={11} className="sql-tab-kind-icon" aria-hidden="true" />
              )}
              <span ref={titleRef} className="sql-tab-title">
                {tab.title}
              </span>
              {popoverMounted && (
                <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <Popover.Portal>
                    <Popover.Positioner
                      anchor={titleRef}
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
              )}
              <span
                role="button"
                tabIndex={-1}
                className="sql-tab-close"
                aria-label={`Close ${tab.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClose();
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
              {tab.kind !== "view-data" && tab.kind !== "er-diagram" && tab.kind !== "query-history" && (
                <ContextMenu.Item className="example-item" onClick={openRename}>
                  <div className="ex-title">Rename</div>
                </ContextMenu.Item>
              )}
              {tab.kind !== "er-diagram" && tab.kind !== "query-history" && (
                <ContextMenu.Item className="example-item" onClick={onDuplicate}>
                  <div className="ex-title">Duplicate</div>
                </ContextMenu.Item>
              )}
              <ContextMenu.Item className="example-item" onClick={handleClose}>
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

/** Lightweight clone of a tab rendered inside DragOverlay (no DnD or context menu). */
export function SqlTabDragOverlay({
  tab,
  active,
}: {
  tab: QueryTab;
  active: boolean;
}) {
  return (
    <button
      type="button"
      className={`sql-tab${active ? " active" : ""}${tab.kind === "view-data" ? " sql-tab-view-data" : ""}${tab.kind === "er-diagram" ? " sql-tab-er-diagram" : ""}${tab.kind === "query-history" ? " sql-tab-query-history" : ""}`}
      style={{ opacity: 0.85, cursor: "grabbing" }}
    >
      {tab.kind === "view-data" && (
        <Table size={11} className="sql-tab-kind-icon" aria-hidden="true" />
      )}
      {tab.kind === "er-diagram" && (
        <Network size={11} className="sql-tab-kind-icon" aria-hidden="true" />
      )}
      {tab.kind === "query-history" && (
        <History size={11} className="sql-tab-kind-icon" aria-hidden="true" />
      )}
      <span className="sql-tab-title">{tab.title}</span>
      <span className="sql-tab-close">
        <X size={10} aria-hidden="true" />
      </span>
    </button>
  );
}
