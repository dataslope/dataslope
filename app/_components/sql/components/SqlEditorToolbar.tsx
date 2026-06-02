"use client";

import { Menu } from "@base-ui-components/react/menu";
import { ChevronDown, Play } from "lucide-react";

export interface SqlEditorToolbarProps {
  loaded: boolean;
  running: boolean;
  hasEditorSelection: boolean;
  isMac: boolean;
  onRunSelection: () => void;
  onRunAll: () => void;
}

const SPINNER = (
  <svg viewBox="0 0 12 12" className="run-btn-spinner">
    <circle
      cx="6"
      cy="6"
      r="4.5"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeDasharray="14 8"
    />
  </svg>
);

export function SqlEditorToolbar({
  loaded,
  running,
  hasEditorSelection,
  isMac,
  onRunSelection,
  onRunAll,
}: SqlEditorToolbarProps) {
  const disabled = !loaded || running;

  return (
    <div className="sql-toolbar">
      <div className="sql-toolbar-shortcuts">
        <span
          className="kbd-group"
          title={
            isMac
              ? "Cmd + Enter — run selection, the statement at the cursor, or all"
              : "Ctrl + Enter — run selection, the statement at the cursor, or all"
          }
        >
          <kbd className="kbd">{isMac ? "⌘" : "Ctrl"}</kbd>
          <span className="kbd-plus" aria-hidden="true">
            +
          </span>
          <kbd className="kbd">Enter</kbd>
        </span>
      </div>
      <div className="sql-toolbar-actions">
        {hasEditorSelection ? (
          <div className={`run-btn-split${running ? " running" : ""}`}>
            <button
              type="button"
              className="run-btn-split-main"
              disabled={disabled}
              onClick={onRunSelection}
            >
              {running ? SPINNER : <Play size={10} aria-hidden="true" />}
              {running ? "Running…" : "Run Selection"}
            </button>
            <span className="run-btn-split-divider" aria-hidden="true" />
            <Menu.Root>
              <Menu.Trigger
                className="run-btn-split-chevron"
                disabled={disabled}
                aria-label="Run options"
              >
                <ChevronDown size={11} aria-hidden="true" />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner sideOffset={6} align="end">
                  <Menu.Popup className="bui-popup run-split-dropdown">
                    <Menu.Item
                      className="run-split-item"
                      onClick={onRunSelection}
                      disabled={disabled}
                    >
                      <span className="run-split-item-label">Run Selection</span>
                      <span className="run-split-item-kbd">
                        {isMac ? "⌘Enter" : "Ctrl+Enter"}
                      </span>
                    </Menu.Item>
                    <Menu.Item
                      className="run-split-item"
                      onClick={onRunAll}
                      disabled={disabled}
                    >
                      <span className="run-split-item-label">Run All</span>
                      <span className="run-split-item-kbd">
                        {isMac ? "⌘⇧Enter" : "Ctrl+Shift+Enter"}
                      </span>
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </div>
        ) : (
          <button
            type="button"
            className={`run-btn${running ? " running" : ""}`}
            disabled={disabled}
            onClick={onRunAll}
          >
            {running ? SPINNER : <Play size={10} aria-hidden="true" />}
            {running ? "Running…" : "Run"}
          </button>
        )}
      </div>
    </div>
  );
}
