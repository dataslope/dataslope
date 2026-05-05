"use client";

import { create } from "zustand";

interface PostgresSettingsState {
  fontSize: number;
  theme: string;
  wordWrap: boolean;
  setFontSize: (fontSize: number) => void;
  setTheme: (theme: string) => void;
  setWordWrap: (wordWrap: boolean) => void;
}

export const usePostgresSettingsStore = create<PostgresSettingsState>((set) => ({
  fontSize: 14,
  theme: "lucario",
  wordWrap: true,
  setFontSize: (fontSize) => set({ fontSize }),
  setTheme: (theme) => set({ theme }),
  setWordWrap: (wordWrap) => set({ wordWrap }),
}));
