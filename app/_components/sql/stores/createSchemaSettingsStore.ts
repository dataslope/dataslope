"use client";

import { create } from "zustand";
import { DEFAULT_PLAYGROUND_SETTINGS } from "../../playgroundShared";

// Shape shared by the DuckDB and Postgres settings stores: the appearance
// toggles plus `showSystemSchemas`. (SQLite has its own store — different
// theme defaults, PRAGMA tab instead of system schemas.)
export interface SchemaSettingsState {
  fontSize: number;
  outputFontSizeEnabled: boolean;
  outputFontSize: number;
  editorTheme: string;
  wordWrap: boolean;
  clearBeforeRun: boolean;
  showSystemSchemas: boolean;
  setFontSize: (fontSize: number) => void;
  setOutputFontSizeEnabled: (enabled: boolean) => void;
  setOutputFontSize: (fontSize: number) => void;
  setEditorTheme: (theme: string) => void;
  setWordWrap: (wordWrap: boolean) => void;
  setClearBeforeRun: (clearBeforeRun: boolean) => void;
  setShowSystemSchemas: (showSystemSchemas: boolean) => void;
}

export function createSchemaSettingsStore() {
  return create<SchemaSettingsState>((set) => ({
    fontSize: DEFAULT_PLAYGROUND_SETTINGS.fontSize,
    outputFontSizeEnabled: DEFAULT_PLAYGROUND_SETTINGS.outputFontSizeEnabled,
    outputFontSize: DEFAULT_PLAYGROUND_SETTINGS.outputFontSize,
    editorTheme: DEFAULT_PLAYGROUND_SETTINGS.editorTheme,
    wordWrap: DEFAULT_PLAYGROUND_SETTINGS.wordWrap,
    clearBeforeRun: DEFAULT_PLAYGROUND_SETTINGS.clearBeforeRun,
    showSystemSchemas: true,
    setFontSize: (fontSize) => set({ fontSize }),
    setOutputFontSizeEnabled: (outputFontSizeEnabled) =>
      set({ outputFontSizeEnabled }),
    setOutputFontSize: (outputFontSize) => set({ outputFontSize }),
    setEditorTheme: (editorTheme) => set({ editorTheme }),
    setWordWrap: (wordWrap) => set({ wordWrap }),
    setClearBeforeRun: (clearBeforeRun) => set({ clearBeforeRun }),
    setShowSystemSchemas: (showSystemSchemas) => set({ showSystemSchemas }),
  }));
}
