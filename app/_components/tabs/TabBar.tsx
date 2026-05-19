"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@base-ui-components/react/dialog";
import { ContextMenu } from "@base-ui-components/react/context-menu";
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
  /**
   * Optional handler that receives the post-drop tab order. When
   * provided, the bar mounts a `DndContext` + horizontal
   * `SortableContext` so users can drag tabs to reorder them. Pass
   * `undefined` to keep the bar non-draggable (cheaper render path).
   */
  onReorderTabs?: (nextTabs: TabDescriptor[]) => void;
  /** Optional className appended to the root tabbar element. */
  className?: string;
}

/**
 * Generic, content-agnostic tab strip. The bar renders only the strip
 * and "+" button — the surrounding component is responsible for
 * rendering the active tab's content.
 */
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
  const cls = ["pg-tabbar", className].filter(Boolean).join(" ");
  const sortable = !!onReorderTabs;

  const strip = (
    <div className="pg-tabs" role="tablist">
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
        >
          {strip}
        </DndStrip>
      ) : (
        strip
      )}
      {onAddTab && (
        <button
          type="button"
          className="pg-tab-add"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onAddTab}
          aria-label="New tab"
        >
          <Plus size={12} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

interface DndStripProps {
  tabs: TabDescriptor[];
  activeTabId: string;
  onReorderTabs: (next: TabDescriptor[]) => void;
  children: React.ReactNode;
}

function DndStrip({
  tabs,
  activeTabId,
  onReorderTabs,
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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDraggingId(String(event.active.id));
  }, []);

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

  const [renameOpen, setRenameOpen] = useState(false);
  const [draftLabel, setDraftLabel] = useState(tab.label);
  const [isClosing, setIsClosing] = useState(false);
  const closedRef = useRef(false);

  // useSortable must be called unconditionally; when `sortable` is
  // false we just don't apply its props/refs, so the tab renders as a
  // static button.
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

  return (
    <>
      {renameable && (
        <Dialog.Root open={renameOpen} onOpenChange={setRenameOpen}>
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop" />
            <Dialog.Popup className="confirm-popup sql-rename-popup">
              <Dialog.Title className="confirm-title">Rename tab</Dialog.Title>
              <Dialog.Description className="confirm-desc">
                Choose a name for this tab.
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
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
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
              className={`pg-tab${active ? " active" : ""} pg-tab--kind-${tab.kind}${isClosing ? " pg-tab--closing" : ""}`}
              onClick={onSelect}
              onDoubleClick={openRename}
              onAnimationEnd={handleAnimationEnd}
              aria-selected={active}
              role="tab"
              data-tab-id={tab.id}
            >
              {tab.icon && (
                <span className="pg-tab-icon" aria-hidden="true">
                  {tab.icon}
                </span>
              )}
              <span className="pg-tab-title">{tab.label}</span>
              {closeable && (
                <span
                  role="button"
                  tabIndex={-1}
                  className="pg-tab-close"
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
        <ContextMenu.Portal>
          <ContextMenu.Positioner sideOffset={6}>
            <ContextMenu.Popup className="bui-popup">
              {renameable && (
                <ContextMenu.Item
                  className="example-item"
                  onClick={openRename}
                >
                  <div className="ex-title">Rename</div>
                </ContextMenu.Item>
              )}
              {closeable && (
                <ContextMenu.Item
                  className="example-item"
                  onClick={handleClose}
                >
                  <div className="ex-title">Close</div>
                </ContextMenu.Item>
              )}
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>
    </>
  );
});

/** Lightweight clone rendered inside `DragOverlay` while a tab is
 *  being dragged. No interactive affordances — DnD-kit handles the
 *  drop animation. */
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
      className={`pg-tab${active ? " active" : ""} pg-tab--kind-${tab.kind}`}
      style={{ opacity: 0.85, cursor: "grabbing" }}
    >
      {tab.icon && (
        <span className="pg-tab-icon" aria-hidden="true">
          {tab.icon}
        </span>
      )}
      <span className="pg-tab-title">{tab.label}</span>
      <span className="pg-tab-close">
        <X size={10} aria-hidden="true" />
      </span>
    </button>
  );
}
