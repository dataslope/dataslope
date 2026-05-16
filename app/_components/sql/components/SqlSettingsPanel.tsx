"use client";

import { RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import {
  SettingsPanel,
  type SettingsPanelProps,
} from "../../playgroundShared";

export interface SqlSettingsPanelProps {
  open: boolean;
  fontSize: number;
  setFontSize: (n: number) => void;
  outputFontSizeEnabled: boolean;
  setOutputFontSizeEnabled: (b: boolean) => void;
  outputFontSize: number;
  setOutputFontSize: (n: number) => void;
  editorTheme: string;
  setEditorTheme: (t: string) => void;
  wordWrap: boolean;
  setWordWrap: (b: boolean) => void;
  clearBeforeRun: boolean;
  setClearBeforeRun: (b: boolean) => void;
  language: string;
  onClose: () => void;
  onRestoreDefaults: () => void;
  onClearLocalStorage: () => void;
  /** Text for the "Reset query tabs for …" action button. */
  resetTabsLabel: string;
  /** Called when the user clicks the reset-tabs button. */
  onResetTabs: () => void;
  /** Dialect-specific extra tabs (e.g. Pragmas for SQLite, Database for
   *  Postgres/DuckDB). Forwarded verbatim to SettingsPanel. */
  extraTabs?: SettingsPanelProps["extraTabs"];
}

export function SqlSettingsPanel({
  open,
  fontSize,
  setFontSize,
  outputFontSizeEnabled,
  setOutputFontSizeEnabled,
  outputFontSize,
  setOutputFontSize,
  editorTheme,
  setEditorTheme,
  wordWrap,
  setWordWrap,
  clearBeforeRun,
  setClearBeforeRun,
  language,
  onClose,
  onRestoreDefaults,
  onClearLocalStorage,
  resetTabsLabel,
  onResetTabs,
  extraTabs,
}: SqlSettingsPanelProps) {
  return (
    <SettingsPanel
      open={open}
      fontSize={fontSize}
      setFontSize={setFontSize}
      outputFontSizeEnabled={outputFontSizeEnabled}
      setOutputFontSizeEnabled={setOutputFontSizeEnabled}
      outputFontSize={outputFontSize}
      setOutputFontSize={setOutputFontSize}
      editorTheme={editorTheme}
      setEditorTheme={setEditorTheme}
      wordWrap={wordWrap}
      setWordWrap={setWordWrap}
      clearBeforeRun={clearBeforeRun}
      setClearBeforeRun={setClearBeforeRun}
      language={language}
      showOutputFontSizeControls={false}
      clearBeforeRunLabel="Clear Results Before Running"
      showClearBeforeRunRow={false}
      onClose={onClose}
      onRestoreDefaults={onRestoreDefaults}
      onClearLocalStorage={onClearLocalStorage}
      extraGeneralRows={null}
      extraActionRows={
        <button
          type="button"
          className="settings-action-btn"
          onClick={onResetTabs}
        >
          <RotateCcw size={14} aria-hidden="true" />
          <span>{resetTabsLabel}</span>
        </button>
      }
      extraTabs={extraTabs}
    />
  );
}
