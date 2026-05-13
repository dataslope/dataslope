"use client";

import { useCallback, useState } from "react";
import type { QueryHistoryEntry } from "../types";

function newHistoryId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
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
      setHistory((prev) => {
        const next = [full, ...prev];
        return next.length > 1000 ? next.slice(0, 1000) : next;
      });
    },
    [],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return { history, addHistoryEntry, clearHistory };
}
