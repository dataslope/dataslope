"use client";

import { create } from "zustand";
import { DEFAULT_PLAYGROUND_SETTINGS } from "../../playgroundShared";

interface SqlSettingsState {
  fontSize: number;
  outputFontSizeEnabled: boolean;
  outputFontSize: number;
  editorTheme: string;
  wordWrap: boolean;
  clearBeforeRun: boolean;
  aiAutocompleteEnabled: boolean;
  setFontSize: (fontSize: number) => void;
  setOutputFontSizeEnabled: (enabled: boolean) => void;
  setOutputFontSize: (fontSize: number) => void;
  setEditorTheme: (theme: string) => void;
  setWordWrap: (wordWrap: boolean) => void;
  setClearBeforeRun: (clearBeforeRun: boolean) => void;
  setAiAutocompleteEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SqlSettingsState>((set) => ({
  fontSize: DEFAULT_PLAYGROUND_SETTINGS.fontSize,
  outputFontSizeEnabled: false,
  outputFontSize: 13,
  editorTheme: "lucario",
  wordWrap: true,
  clearBeforeRun: false,
  aiAutocompleteEnabled: false,
  setFontSize: (fontSize) => set({ fontSize }),
  setOutputFontSizeEnabled: (outputFontSizeEnabled) =>
    set({ outputFontSizeEnabled }),
  setOutputFontSize: (outputFontSize) => set({ outputFontSize }),
  setEditorTheme: (editorTheme) => set({ editorTheme }),
  setWordWrap: (wordWrap) => set({ wordWrap }),
  setClearBeforeRun: (clearBeforeRun) => set({ clearBeforeRun }),
  setAiAutocompleteEnabled: (aiAutocompleteEnabled) =>
    set({ aiAutocompleteEnabled }),
}));
