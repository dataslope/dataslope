"use client";

import { create } from "zustand";
import { storageKey } from "../../sqlitePlaygroundTabs";

export type ResultSetExportScope = "page" | "all";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 250, 500, 1000] as const;
const DEFAULT_PAGE_SIZE = 50;

function readInitialPageSize(): number {
  if (typeof window === "undefined") return DEFAULT_PAGE_SIZE;
  const saved = Number(localStorage.getItem(storageKey("page_size")));
  return PAGE_SIZE_OPTIONS.includes(saved as (typeof PAGE_SIZE_OPTIONS)[number])
    ? saved
    : DEFAULT_PAGE_SIZE;
}

interface SqlPlaygroundState {
  globalPageSize: number;
  setGlobalPageSize: (pageSize: number) => void;
}

export const useSqlPlaygroundStore = create<SqlPlaygroundState>((set) => ({
  globalPageSize: readInitialPageSize(),
  setGlobalPageSize: (globalPageSize) => set({ globalPageSize }),
}));
