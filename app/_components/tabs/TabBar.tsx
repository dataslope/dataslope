"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { ContextMenu } from "@base-ui/react/context-menu";
import { Popover } from "@base-ui/react/popover";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS as DndCSS } from "@dnd-kit/utilities";
import { Plus, X } from "lucide-react";
import type { TabDescriptor } from "./tabTypes";

export interface TabBarProps {
  tabs: TabDescriptor[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab?: (id: string) => void;
  onAddTab?: () => void;
  onRenameTab?: (id: string, newLabel: string) => void;
  /** Receives the post-drop tab order; providing it mounts the DnD contexts
   *  for drag-to-reorder. `undefined` keeps the bar non-draggable (cheaper). */
  onReorderTabs?: (nextTabs: TabDescriptor[]) => void;
  /** Optional className appended to the root tabbar element. */
  className?: string;
}

/** Generic tab strip: renders only the strip and "+" button; the host
 *  renders the active tab's content. */
export function TabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onAddTab,
  onRenameTab,
  onReorderTabs,
  className,
}: TabBarProps) {
  const cls = ["playground-tabbar", className].filter(Boolean).join(" ");
  const sortable = !!onReorderTabs;

  // Keep the active tab visible in the scrollable strip (new tab opened,
  // or activation from elsewhere).
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(
      `[data-tab-id="${(window.CSS?.escape ?? ((s: string) => s))(activeTabId)}"]`,
    );
    el?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [activeTabId, tabs.length]);

  const strip = (
    <div className="playground-tabs" role="tablist" ref={stripRef}>
      {tabs.map((tab) => (
        <TabItem
          key={tab.id}
          tab={tab}
          active={tab.id === activeTabId}
          sortable={sortable}
          onSelect={() => onSelectTab(tab.id)}
          onClose={onCloseTab ? () => onCloseTab(tab.id) : undefined}
          onRename={
            onRenameTab
              ? (label) => onRenameTab(tab.id, label)
              : undefined
          }
        />
      ))}
    </div>
  );

  return (
    <div className={cls}>
      {sortable ? (
        <DndStrip
          tabs={tabs}
          activeTabId={activeTabId}
          onReorderTabs={onReorderTabs!}
          onSelectTab={onSelectTab}
        >
          {strip}
        </DndStrip>
      ) : (
        strip
      )}
      {onAddTab && (
        <button
          type="button"
          className="playground-tab-add"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onAddTab}
          aria-label="New tab"
        >
          {/* Heavier than the lucide default so a 12px glyph still reads as
              a control rather than a hairline. */}
          <Plus size={12} strokeWidth={2.75} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

interface DndStripProps {
  tabs: TabDescriptor[];
  activeTabId: string;
  onReorderTabs: (next: TabDescriptor[]) => void;
  onSelectTab: (id: string) => void;
  children: React.ReactNode;
}

function DndStrip({
  tabs,
  activeTabId,
  onReorderTabs,
  onSelectTab,
  children,
}: DndStripProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const tabIds = useMemo(() => tabs.map((t) => t.id), [tabs]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggingTab = useMemo(
    () => (draggingId ? tabs.find((t) => t.id === draggingId) ?? null : null),
    [draggingId, tabs],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      setDraggingId(id);
      // Mirror VSCode: dragging a tab also activates it, on drag start so
      // the editor switches as soon as the tab is picked up.
      if (id !== activeTabId) onSelectTab(id);
    },
    [activeTabId, onSelectTab],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const from = tabs.findIndex((t) => t.id === active.id);
      const to = tabs.findIndex((t) => t.id === over.id);
      if (from === -1 || to === -1) return;
      onReorderTabs(arrayMove(tabs, from, to));
    },
    [onReorderTabs, tabs],
  );

  const handleDragCancel = useCallback(() => setDraggingId(null), []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
        {children}
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {draggingTab ? (
          <TabOverlay
            tab={draggingTab}
            active={draggingTab.id === activeTabId}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface TabItemProps {
  tab: TabDescriptor;
  active: boolean;
  sortable: boolean;
  onSelect: () => void;
  onClose?: () => void;
  onRename?: (label: string) => void;
}

const TabItem = memo(function TabItem({
  tab,
  active,
  sortable,
  onSelect,
  onClose,
  onRename,
}: TabItemProps) {
  const closeable = tab.closeable !== false;
  const renameable = tab.renameable === true && !!onRename;
  const hideBuiltins = tab.hideBuiltinMenuItems === true;
  const extraItems = tab.contextMenuItems ?? [];

  const [renameOpen, setRenameOpen] = useState(false);
  const [draftLabel, setDraftLabel] = useState(tab.label);
  const [isClosing, setIsClosing] = useState(false);
  const closedRef = useRef(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Truncation tooltip: overflowing labels show full text in a popover
  // after a short hover delay.
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipMounted, setTooltipMounted] = useState(false);
  const titleRef = useRef<HTMLSpanElement>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);
  useEffect(() => clearHoverTimer, [clearHoverTimer]);

  // useSortable must be called unconditionally; when `sortable` is false its
  // props/refs just aren't applied.
  const sortableState = useSortable({ id: tab.id, disabled: !sortable });
  const dragStyle: React.CSSProperties = sortable
    ? {
        transform: DndCSS.Transform.toString(sortableState.transform),
        transition: sortableState.transition,
        opacity: sortableState.isDragging ? 0 : undefined,
        zIndex: sortableState.isDragging ? 10 : undefined,
      }
    : {};

  const openRename = useCallback(() => {
    if (!renameable) return;
    setDraftLabel(tab.label);
    setRenameOpen(true);
  }, [renameable, tab.label]);

  const submitRename = useCallback(() => {
    if (onRename) onRename(draftLabel.trim() || tab.label);
    setRenameOpen(false);
  }, [draftLabel, onRename, tab.label]);

  const handleClose = useCallback(() => {
    if (!onClose) return;
    setIsClosing(true);
    setTimeout(() => {
      if (!closedRef.current) {
        closedRef.current = true;
        onClose();
      }
    }, 200);
  }, [onClose]);

  const handleAnimationEnd = useCallback(() => {
    if (isClosing && !closedRef.current && onClose) {
      closedRef.current = true;
      onClose();
    }
  }, [isClosing, onClose]);

  // Reset closing flag when tab id changes (e.g. component reused).
  useEffect(() => {
    closedRef.current = false;
  }, [tab.id]);

  // Focus the rename input on open and select the full label or just the
  // stem. The Dialog mounts asynchronously — wait one frame so the input is
  // in the DOM.
  useEffect(() => {
    if (!renameOpen) return;
    const id = window.requestAnimationFrame(() => {
      const el = renameInputRef.current;
      if (!el) return;
      el.focus();
      const value = el.value;
      if (tab.renameSelectsStem) {
        const dot = value.lastIndexOf(".");
        const end = dot > 0 ? dot : value.length;
        el.setSelectionRange(0, end);
      } else {
        el.select();
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [renameOpen, tab.renameSelectsStem]);

  const showBuiltinRename = !hideBuiltins && renameable;
  const showBuiltinClose = !hideBuiltins && closeable;
  const hasMenu = showBuiltinRename || showBuiltinClose || extraItems.length > 0;

  return (
    <>
      {renameable && (
        <Dialog.Root open={renameOpen} onOpenChange={setRenameOpen}>
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop" />
            <Dialog.Popup className="confirm-popup sql-rename-popup">
              <Dialog.Title className="confirm-title">
                {tab.renameDialogTitle ?? "Rename tab"}
              </Dialog.Title>
              <Dialog.Description className="confirm-desc">
                {tab.renameDialogDescription ??
                  "Choose a name for this tab."}
              </Dialog.Description>
              <form
                className="sql-rename-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitRename();
                }}
              >
                <input
                  ref={renameInputRef}
                  className="sql-rename-input"
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
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
      )}

      <ContextMenu.Root>
        <ContextMenu.Trigger
          render={(props) => (
            <button
              type="button"
              {...props}
              {...(sortable ? sortableState.attributes : {})}
              {...(sortable ? sortableState.listeners : {})}
              ref={sortable ? sortableState.setNodeRef : undefined}
              style={dragStyle}
              className={`playground-tab${active ? " active" : ""} playground-tab--kind-${tab.kind}${isClosing ? " playground-tab--closing" : ""}`}
              onClick={onSelect}
              onDoubleClick={openRename}
              onAnimationEnd={handleAnimationEnd}
              aria-selected={active}
              role="tab"
              data-tab-id={tab.id}
              onMouseEnter={() => {
                clearHoverTimer();
                hoverTimerRef.current = window.setTimeout(() => {
                  hoverTimerRef.current = null;
                  const el = titleRef.current;
                  if (el && el.scrollWidth > el.clientWidth) {
                    setTooltipMounted(true);
                    setTooltipOpen(true);
                  }
                }, 200);
              }}
              onMouseLeave={() => {
                clearHoverTimer();
                setTooltipOpen(false);
              }}
            >
              {tab.icon && (
                <span className="playground-tab-icon" aria-hidden="true">
                  {tab.icon}
                </span>
              )}
              <span ref={titleRef} className="playground-tab-title">
                {tab.label}
              </span>
              {tooltipMounted && (
                <Popover.Root open={tooltipOpen} onOpenChange={setTooltipOpen}>
                  <Popover.Portal>
                    <Popover.Positioner
                      anchor={titleRef}
                      side="top"
                      sideOffset={6}
                      align="center"
                      className="playground-tab-name-positioner"
                    >
                      <Popover.Popup className="bui-popup playground-tab-name-popover">
                        {tab.label}
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
              )}
              {closeable && (
                <span
                  role="button"
                  tabIndex={-1}
                  className="playground-tab-close"
                  aria-label={`Close ${tab.label}`}
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
              )}
            </button>
          )}
        />
        {hasMenu && (
          <ContextMenu.Portal>
            <ContextMenu.Positioner sideOffset={6}>
              <ContextMenu.Popup className="bui-popup">
                {showBuiltinRename && (
                  <ContextMenu.Item
                    className="example-item"
                    onClick={openRename}
                  >
                    <div className="ex-title">Rename</div>
                  </ContextMenu.Item>
                )}
                {showBuiltinClose && (
                  <ContextMenu.Item
                    className="example-item"
                    onClick={handleClose}
                  >
                    <div className="ex-title">Close</div>
                  </ContextMenu.Item>
                )}
                {extraItems.map((item) => (
                  <ContextMenu.Item
                    key={item.key}
                    className={`example-item${item.danger ? " example-item-danger" : ""}`}
                    onClick={item.onSelect}
                  >
                    <div className="ex-title">
                      {item.icon}
                      {item.icon ? " " : null}
                      {item.label}
                    </div>
                  </ContextMenu.Item>
                ))}
              </ContextMenu.Popup>
            </ContextMenu.Positioner>
          </ContextMenu.Portal>
        )}
      </ContextMenu.Root>
    </>
  );
});

/** Lightweight clone rendered inside `DragOverlay` while a tab is dragged. */
function TabOverlay({
  tab,
  active,
}: {
  tab: TabDescriptor;
  active: boolean;
}) {
  return (
    <button
      type="button"
      className={`playground-tab${active ? " active" : ""} playground-tab--kind-${tab.kind}`}
      style={{ opacity: 0.85, cursor: "grabbing" }}
    >
      {tab.icon && (
        <span className="playground-tab-icon" aria-hidden="true">
          {tab.icon}
        </span>
      )}
      <span className="playground-tab-title">{tab.label}</span>
      <span className="playground-tab-close">
        <X size={10} aria-hidden="true" />
      </span>
    </button>
  );
}
