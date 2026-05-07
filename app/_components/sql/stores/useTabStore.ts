"use client";

import { create } from "zustand";
import type { QueryRunResult, ResultSetExportSnapshot } from "../types";

export type { QueryTab } from "../../sqlitePlaygroundTabs";

interface TabState {
  tabs: import("../../sqlitePlaygroundTabs").QueryTab[];
  activeTabId: string;
  resultsByTab: Record<string, QueryRunResult | null>;
  resultSetExportSnapshot: ResultSetExportSnapshot | null;
  setTabs: (tabs: import("../../sqlitePlaygroundTabs").QueryTab[]) => void;
  setActiveTabId: (id: string) => void;
  setResultsByTab: (
    updater:
      | ((
          prev: Record<string, QueryRunResult | null>,
        ) => Record<string, QueryRunResult | null>)
      | Record<string, QueryRunResult | null>,
  ) => void;
  setResultForTab: (tabId: string, result: QueryRunResult | null) => void;
  setResultSetExportSnapshot: (
    snapshot: ResultSetExportSnapshot | null,
  ) => void;
}

export const useTabStore = create<TabState>((set) => ({
  tabs: [],
  activeTabId: "",
  resultsByTab: {},
  resultSetExportSnapshot: null,
  setTabs: (tabs) => set({ tabs }),
  setActiveTabId: (activeTabId) => set({ activeTabId }),
  setResultsByTab: (updater) =>
    set((state) => ({
      resultsByTab:
        typeof updater === "function" ? updater(state.resultsByTab) : updater,
    })),
  setResultForTab: (tabId, result) =>
    set((state) => ({
      resultsByTab: { ...state.resultsByTab, [tabId]: result },
    })),
  setResultSetExportSnapshot: (resultSetExportSnapshot) =>
    set({ resultSetExportSnapshot }),
}));
