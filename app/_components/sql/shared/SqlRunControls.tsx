"use client";

import { Menu } from "@base-ui-components/react/menu";
import { ChevronDown, Play } from "lucide-react";

export type SqlRunStatus = "idle" | "loading" | "running" | "success" | "error";

export interface SqlRunControlsProps {
  statusState: SqlRunStatus | string;
  hasSelection: boolean;
  loaded: boolean;
  isMac: boolean;
  onRun: () => void;
  onRunSelection: () => void;
}

function RunSpinner() {
  return (
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
}

export function SqlRunControls({
  statusState,
  hasSelection,
  loaded,
  isMac,
  onRun,
  onRunSelection,
}: SqlRunControlsProps) {
  const running = statusState === "running";
  const disabled = !loaded || running;

  if (hasSelection) {
    return (
      <div className={`run-btn-split${running ? " running" : ""}`}>
        <button
          type="button"
          className="run-btn-split-main"
          disabled={disabled}
          onClick={onRunSelection}
        >
          {running ? <RunSpinner /> : <Play size={10} aria-hidden="true" />}
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
                  onClick={onRun}
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
    );
  }

  return (
    <button
      type="button"
      className={`run-btn${running ? " running" : ""}`}
      disabled={disabled}
      onClick={onRun}
    >
      {running ? <RunSpinner /> : <Play size={10} aria-hidden="true" />}
      {running ? "Running…" : "Run"}
    </button>
  );
}
