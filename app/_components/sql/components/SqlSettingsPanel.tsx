"use client";

import { RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import {
  SettingsPanelContent,
  type SettingsPanelProps,
} from "../../playgroundShared";

export interface SqlSettingsPanelProps {
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
  onRestoreDefaults: () => void;
  onClearLocalStorage: () => void;
  /** Optional, when provided, surfaces a "Clear all local data" action
   *  alongside the localStorage clear. */
  onClearAllLocalData?: () => void;
  /** Text for the "Reset query tabs for …" action button. */
  resetTabsLabel: string;
  /** Called when the user clicks the reset-tabs button. */
  onResetTabs: () => void;
  /** Dialect-specific extra tabs (e.g. Pragmas for SQLite, Database for
   *  Postgres/DuckDB). Forwarded verbatim to SettingsPanelContent. */
  extraTabs?: SettingsPanelProps["extraTabs"];
  /** Close the Settings tab, forwarded to SettingsPanelContent, which
   *  renders the ✕ button at the right end of the settings tab bar. */
  onClose?: () => void;
}

/** Body-only SQL settings panel, same controls shared by SQLite,
 *  Postgres, and DuckDB. Rendered inline inside a tab pane in every SQL
 *  playground (the dialog form has been retired). */
export function SqlSettingsPanelContent(props: SqlSettingsPanelProps) {
  const {
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
    onRestoreDefaults,
    onClearLocalStorage,
    onClearAllLocalData,
    resetTabsLabel,
    onResetTabs,
    extraTabs,
    onClose,
  } = props;
  const extraActionRows: ReactNode = (
    <button
      type="button"
      className="settings-action-btn"
      onClick={onResetTabs}
    >
      <span className="settings-action-icon" aria-hidden="true">
        <RotateCcw size={14} />
      </span>
      <span className="settings-action-label">{resetTabsLabel}</span>
    </button>
  );
  return (
    <SettingsPanelContent
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
      onRestoreDefaults={onRestoreDefaults}
      onClearLocalStorage={onClearLocalStorage}
      onClearAllLocalData={onClearAllLocalData}
      extraGeneralRows={null}
      extraActionRows={extraActionRows}
      extraTabs={extraTabs}
      onClose={onClose}
    />
  );
}
