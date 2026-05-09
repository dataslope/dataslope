"use client";

import { useCallback, useState } from "react";
import type { QueryHistoryEntry } from "../types";

let historyEntryCounter = 0;

function newHistoryId(): string {
  historyEntryCounter += 1;
  return `h_${Date.now().toString(36)}_${historyEntryCounter}`;
}

export interface UseQueryHistoryResult {
  history: QueryHistoryEntry[];
  addHistoryEntry: (entry: Omit<QueryHistoryEntry, "id">) => void;
  clearHistory: () => void;
}

export function useQueryHistory(): UseQueryHistoryResult {
  const [history, setHistory] = useState<QueryHistoryEntry[]>([]);

  const addHistoryEntry = useCallback(
    (entry: Omit<QueryHistoryEntry, "id">) => {
      const full: QueryHistoryEntry = { ...entry, id: newHistoryId() };
      setHistory((prev) => [full, ...prev]);
    },
    [],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return { history, addHistoryEntry, clearHistory };
}
