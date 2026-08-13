"use client";

import { useCallback, useEffect, useState } from "react";
import type { QueryHistoryEntry } from "../types";
import { persistAsync } from "../utils/persistedStorage";

/** Hard cap on entries kept in memory. */
const MAX_IN_MEMORY = 1000;
/** Smaller cap on entries written to localStorage to keep the payload light. */
const MAX_PERSISTED = 200;

function newHistoryId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Read and shape-validate persisted history for `storageKey`. Returns an
 *  empty array on SSR, missing/corrupt data, or when no key is provided. */
function loadPersisted(storageKey: string | undefined): QueryHistoryEntry[] {
  if (!storageKey || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is QueryHistoryEntry =>
        !!e &&
        typeof e === "object" &&
        typeof (e as QueryHistoryEntry).id === "string" &&
        typeof (e as QueryHistoryEntry).sql === "string",
    );
  } catch {
    return [];
  }
}

export interface UseQueryHistoryResult {
  history: QueryHistoryEntry[];
  addHistoryEntry: (entry: Omit<QueryHistoryEntry, "id">) => void;
  clearHistory: () => void;
  /** Swap in a history built elsewhere, used when a cloud save's log is
   *  merged into this device's (see `restoreQueryLog`). The merge has already
   *  written localStorage, so this only brings the live pane in line. */
  replaceHistory: (entries: QueryHistoryEntry[]) => void;
}

/**
 * Query history store. When `storageKey` is provided the (capped) history is
 * persisted to localStorage and restored on the next load; without a key it
 * behaves as a plain in-memory store. History is loaded in an effect (not the
 * initial render) to avoid an SSR/client hydration mismatch.
 */
export function useQueryHistory(storageKey?: string): UseQueryHistoryResult {
  // Lazy initializer restores persisted history on the client (returns [] on
  // the server). The history list is only rendered once the user opens the
  // Query History tab, so a differing server/client value causes no
  // hydration mismatch.
  const [history, setHistory] = useState<QueryHistoryEntry[]>(() =>
    loadPersisted(storageKey),
  );

  // Persist on change. Skip the empty state so the initial mount never
  // overwrites saved history with "[]"; clearHistory persists "[]" instead.
  useEffect(() => {
    if (!storageKey || history.length === 0) return;
    persistAsync(storageKey, JSON.stringify(history.slice(0, MAX_PERSISTED)));
  }, [history, storageKey]);

  const addHistoryEntry = useCallback(
    (entry: Omit<QueryHistoryEntry, "id">) => {
      const full: QueryHistoryEntry = { ...entry, id: newHistoryId() };
      setHistory((prev) => {
        const next = [full, ...prev];
        return next.length > MAX_IN_MEMORY ? next.slice(0, MAX_IN_MEMORY) : next;
      });
    },
    [],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (storageKey) persistAsync(storageKey, "[]");
  }, [storageKey]);

  const replaceHistory = useCallback((entries: QueryHistoryEntry[]) => {
    setHistory(entries.slice(0, MAX_IN_MEMORY));
  }, []);

  return { history, addHistoryEntry, clearHistory, replaceHistory };
}
