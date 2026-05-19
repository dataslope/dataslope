"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui-components/react/dialog";
import { ContextMenu } from "@base-ui-components/react/context-menu";
import { Plus, X } from "lucide-react";
import type { TabDescriptor } from "./tabTypes";

export interface TabBarProps {
  tabs: TabDescriptor[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab?: (id: string) => void;
  onAddTab?: () => void;
  onRenameTab?: (id: string, newLabel: string) => void;
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
  className,
}: TabBarProps) {
  const cls = ["pg-tabbar", className].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      <div className="pg-tabs" role="tablist">
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            active={tab.id === activeTabId}
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

interface TabItemProps {
  tab: TabDescriptor;
  active: boolean;
  onSelect: () => void;
  onClose?: () => void;
  onRename?: (label: string) => void;
}

const TabItem = memo(function TabItem({
  tab,
  active,
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
