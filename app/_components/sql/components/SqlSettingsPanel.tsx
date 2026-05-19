"use client";

import { RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import {
  SettingsPanel,
  SettingsPanelContent,
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
  /** Optional — when provided, surfaces a "Clear all local data" action
   *  alongside the localStorage clear. */
  onClearAllLocalData?: () => void;
  /** Text for the "Reset query tabs for …" action button. */
  resetTabsLabel: string;
  /** Called when the user clicks the reset-tabs button. */
  onResetTabs: () => void;
  /** Dialect-specific extra tabs (e.g. Pragmas for SQLite, Database for
   *  Postgres/DuckDB). Forwarded verbatim to SettingsPanel. */
  extraTabs?: SettingsPanelProps["extraTabs"];
}

export function SqlSettingsPanel(props: SqlSettingsPanelProps) {
  const sharedProps = buildSharedProps(props);
  return <SettingsPanel {...sharedProps} />;
}

/** Body-only variant of the SQL settings panel — same controls, no
 *  Dialog wrapper. Used when settings is rendered inline as a tab pane
 *  instead of as a modal dialog. */
export function SqlSettingsPanelContent(
  props: Omit<SqlSettingsPanelProps, "open" | "onClose">,
) {
  // `SettingsPanelContent` doesn't need open/onClose; pass placeholders
  // through buildSharedProps so we can share the shape mapping.
  const shared = buildSharedProps({
    ...props,
    open: true,
    onClose: () => {},
  });
  // SettingsPanelContent's prop type omits open/onClose, so strip them.
  const {
    open: _open,
    onClose: _onClose,
    ...content
  } = shared;
  void _open;
  void _onClose;
  return <SettingsPanelContent {...content} />;
}

function buildSharedProps(props: SqlSettingsPanelProps): SettingsPanelProps {
  const {
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
    onClearAllLocalData,
    resetTabsLabel,
    onResetTabs,
    extraTabs,
  } = props;
  const extraActionRows: ReactNode = (
    <button
      type="button"
      className="settings-action-btn"
      onClick={onResetTabs}
    >
      <RotateCcw size={14} aria-hidden="true" />
      <span>{resetTabsLabel}</span>
    </button>
  );
  return {
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
    showOutputFontSizeControls: false,
    clearBeforeRunLabel: "Clear Results Before Running",
    showClearBeforeRunRow: false,
    onClose,
    onRestoreDefaults,
    onClearLocalStorage,
    onClearAllLocalData,
    extraGeneralRows: null,
    extraActionRows,
    extraTabs,
  };
}

