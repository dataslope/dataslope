"use client";

import React, { useCallback, useRef, useState } from "react";
import { Dialog } from "@base-ui-components/react/dialog";
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
  const [isClosing, setIsClosing] = useState(false);
  const closedRef = useRef(false);

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
              className={`sql-tab${active ? " active" : ""}${tab.kind === "view-data" ? " sql-tab-view-data" : ""}${tab.kind === "er-diagram" ? " sql-tab-er-diagram" : ""}${tab.kind === "query-history" ? " sql-tab-query-history" : ""}${isClosing ? " sql-tab--closing" : ""}`}
              onClick={onActivate}
              aria-selected={active}
              role="tab"
              onAnimationEnd={handleAnimationEnd}
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
              <span className="sql-tab-title">
                {tab.title}
              </span>
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
