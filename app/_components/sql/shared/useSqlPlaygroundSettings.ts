"use client";

import { useEffect } from "react";
import {
  applyMode,
  applyThemePalette,
  getStoredEditorTheme,
} from "../../playgroundTheme";

export interface SqlPlaygroundSettingsState {
  fontSize: number;
  wordWrap: boolean;
  clearBeforeRun: boolean;
  editorTheme: string;
}

export interface SqlPlaygroundSettingsSetters {
  setFontSize: (value: number) => void;
  setWordWrap: (value: boolean) => void;
  setClearBeforeRun: (value: boolean) => void;
  setEditorTheme: (value: string) => void;
}

function boolFromStorage(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === "1" || raw === "true";
}

function numberFromStorage(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = Number(window.localStorage.getItem(key));
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export function hydrateSqlPlaygroundSettings(
  storagePrefix: string,
  fallback: SqlPlaygroundSettingsState,
): SqlPlaygroundSettingsState {
  return {
    fontSize: numberFromStorage(`${storagePrefix}font_size`, fallback.fontSize),
    wordWrap: boolFromStorage(`${storagePrefix}word_wrap`, fallback.wordWrap),
    clearBeforeRun: boolFromStorage(
      `${storagePrefix}clear_before_run`,
      fallback.clearBeforeRun,
    ),
    editorTheme:
      getStoredEditorTheme(`${storagePrefix}editor_theme`) ??
      fallback.editorTheme,
  };
}

export function useSqlPlaygroundSettingsHydration(
  storagePrefix: string,
  fallback: SqlPlaygroundSettingsState,
  setters: SqlPlaygroundSettingsSetters,
) {
  const { fontSize, wordWrap, clearBeforeRun, editorTheme } = fallback;
  const { setFontSize, setWordWrap, setClearBeforeRun, setEditorTheme } =
    setters;

  useEffect(() => {
    const hydrated = hydrateSqlPlaygroundSettings(storagePrefix, {
      fontSize,
      wordWrap,
      clearBeforeRun,
      editorTheme,
    });
    setFontSize(hydrated.fontSize);
    setWordWrap(hydrated.wordWrap);
    setClearBeforeRun(hydrated.clearBeforeRun);
    setEditorTheme(hydrated.editorTheme);
    applyThemePalette(hydrated.editorTheme);
    applyMode(hydrated.editorTheme);
  }, [
    clearBeforeRun,
    editorTheme,
    fontSize,
    setClearBeforeRun,
    setEditorTheme,
    setFontSize,
    setWordWrap,
    storagePrefix,
    wordWrap,
  ]);
}
