"use client";

import { create } from "zustand";
import { DEFAULT_PLAYGROUND_SETTINGS } from "../../playgroundShared";

// DuckDB settings store. Mirrors `usePostgresSettingsStore`: the
// general appearance settings (font size, theme, word wrap, clear
// before run) are universal. The DuckDB playground intentionally has
// no SQLite-style PRAGMA tab — DuckDB exposes runtime knobs through
// SET statements (`SET threads = N`, `SET memory_limit = '512MB'`,
// `SET TimeZone = 'UTC'`) that users can run from any query tab.

interface DuckDbSettingsState {
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

export const useDuckDbSettingsStore = create<DuckDbSettingsState>((set) => ({
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
