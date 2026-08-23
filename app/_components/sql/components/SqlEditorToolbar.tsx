"use client";

import { useEffect, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { ChevronDown, ListTree, Play } from "lucide-react";

export interface SqlEditorToolbarProps {
  loaded: boolean;
  running: boolean;
  hasEditorSelection: boolean;
  /** True when the active tab holds more than one statement, enables the
   *  "Run statement at cursor" affordance (and matches the Ctrl/⌘+Enter
   *  keymap, which runs just the statement under the cursor in that case). */
  hasMultipleStatements: boolean;
  isMac: boolean;
  onRunSelection: () => void;
  onRunStatement: () => void;
  onRunAll: () => void;
  /** Show the execution plan (EXPLAIN) for the selection / statement at the
   *  cursor / whole query. */
  onExplain: () => void;
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

/** `Running… 3.2s`. A long query used to show a motionless spinner with no
 *  way to tell a slow query from a hung one; the ticking count is the signal
 *  that work is still happening. Starts counting at half a second so a normal
 *  fast query doesn't flash a number. */
function RunningElapsed() {
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    const startedAt = performance.now();
    const id = window.setInterval(
      () => setElapsedMs(performance.now() - startedAt),
      100,
    );
    return () => window.clearInterval(id);
  }, []);
  if (elapsedMs < 500) return null;
  return (
    <span className="run-btn-elapsed"> {(elapsedMs / 1000).toFixed(1)}s</span>
  );
}

interface RunMenuItem {
  label: string;
  kbd: string;
  onClick: () => void;
}

/** A split button: a primary action plus a chevron menu of related actions
 *  (each with its keyboard shortcut). Used for both "run selection" and "run
 *  statement at cursor" so the two stay visually identical. */
function RunSplit({
  running,
  disabled,
  mainLabel,
  onMain,
  items,
}: {
  running: boolean;
  disabled: boolean;
  mainLabel: string;
  onMain: () => void;
  items: RunMenuItem[];
}) {
  return (
    <div className={`run-btn-split${running ? " running" : ""}`}>
      <button
        type="button"
        className="run-btn-split-main"
        disabled={disabled}
        onClick={onMain}
      >
        {running ? SPINNER : <Play size={10} aria-hidden="true" />}
        {running ? (
          <>
            Running…
            <RunningElapsed />
          </>
        ) : (
          mainLabel
        )}
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
              {items.map((item) => (
                <Menu.Item
                  key={item.label}
                  className="run-split-item"
                  onClick={item.onClick}
                  disabled={disabled}
                >
                  <span className="run-split-item-label">{item.label}</span>
                  <span className="run-split-item-kbd">{item.kbd}</span>
                </Menu.Item>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}

export function SqlEditorToolbar({
  loaded,
  running,
  hasEditorSelection,
  hasMultipleStatements,
  isMac,
  onRunSelection,
  onRunStatement,
  onRunAll,
  onExplain,
}: SqlEditorToolbarProps) {
  const disabled = !loaded || running;
  // ⌘/Ctrl+Enter triggers the *primary* button (shown by the kbd hint to the
  // left); the dropdown's secondary action is always ⌘/Ctrl+Shift+Enter.
  const secondaryKbd = isMac ? "⌘⇧Enter" : "Ctrl+Shift+Enter";

  return (
    <div className="sql-toolbar">
      <div className="sql-toolbar-shortcuts">
        <span
          className="kbd-group"
          title={
            isMac
              ? "Cmd + Enter, run the selection, or all statements"
              : "Ctrl + Enter, run the selection, or all statements"
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
          <RunSplit
            running={running}
            disabled={disabled}
            mainLabel="Run Selection"
            onMain={onRunSelection}
            items={[{ label: "Run All", kbd: secondaryKbd, onClick: onRunAll }]}
          />
        ) : hasMultipleStatements ? (
          <RunSplit
            running={running}
            disabled={disabled}
            mainLabel="Run All"
            onMain={onRunAll}
            items={[
              {
                label: "Run statement at cursor",
                kbd: secondaryKbd,
                onClick: onRunStatement,
              },
            ]}
          />
        ) : (
          <button
            type="button"
            className={`run-btn${running ? " running" : ""}`}
            disabled={disabled}
            onClick={onRunAll}
          >
            {running ? SPINNER : <Play size={10} aria-hidden="true" />}
            {running ? (
              <>
                Running…
                <RunningElapsed />
              </>
            ) : (
              "Run"
            )}
          </button>
        )}
        <button
          type="button"
          className="sql-explain-btn"
          disabled={disabled}
          onClick={onExplain}
          title="Show the execution plan (EXPLAIN) for the current statement"
        >
          <ListTree size={12} aria-hidden="true" />
          Explain
        </button>
      </div>
    </div>
  );
}
