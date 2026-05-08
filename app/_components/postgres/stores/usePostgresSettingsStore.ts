"use client";

import { create } from "zustand";
import { DEFAULT_PLAYGROUND_SETTINGS } from "../../playgroundShared";

interface PostgresSettingsState {
  fontSize: number;
  outputFontSizeEnabled: boolean;
  outputFontSize: number;
  editorTheme: string;
  wordWrap: boolean;
  clearBeforeRun: boolean;
  setFontSize: (fontSize: number) => void;
  setOutputFontSizeEnabled: (enabled: boolean) => void;
  setOutputFontSize: (fontSize: number) => void;
  setEditorTheme: (theme: string) => void;
  setWordWrap: (wordWrap: boolean) => void;
  setClearBeforeRun: (clearBeforeRun: boolean) => void;
}

export const usePostgresSettingsStore = create<PostgresSettingsState>((set) => ({
  fontSize: DEFAULT_PLAYGROUND_SETTINGS.fontSize,
  outputFontSizeEnabled: DEFAULT_PLAYGROUND_SETTINGS.outputFontSizeEnabled,
  outputFontSize: DEFAULT_PLAYGROUND_SETTINGS.outputFontSize,
  editorTheme: DEFAULT_PLAYGROUND_SETTINGS.editorTheme,
  wordWrap: DEFAULT_PLAYGROUND_SETTINGS.wordWrap,
  clearBeforeRun: DEFAULT_PLAYGROUND_SETTINGS.clearBeforeRun,
  setFontSize: (fontSize) => set({ fontSize }),
  setOutputFontSizeEnabled: (outputFontSizeEnabled) =>
    set({ outputFontSizeEnabled }),
  setOutputFontSize: (outputFontSize) => set({ outputFontSize }),
  setEditorTheme: (editorTheme) => set({ editorTheme }),
  setWordWrap: (wordWrap) => set({ wordWrap }),
  setClearBeforeRun: (clearBeforeRun) => set({ clearBeforeRun }),
}));
