"use client";

import { create } from "zustand";

export const DEFAULT_PRAGMA_SETTINGS = {
  foreignKeys: true,
  journalMode: "delete",
  synchronous: "full",
  pageSize: 4096,
  automaticIndex: true,
  caseSensitiveLike: false,
};

export type PragmaSettings = typeof DEFAULT_PRAGMA_SETTINGS;

interface PragmaState {
  pragmaSettings: PragmaSettings;
  setPragmaSettings: (settings: PragmaSettings) => void;
}

export const usePragmaStore = create<PragmaState>((set) => ({
  pragmaSettings: DEFAULT_PRAGMA_SETTINGS,
  setPragmaSettings: (pragmaSettings) => set({ pragmaSettings }),
}));
