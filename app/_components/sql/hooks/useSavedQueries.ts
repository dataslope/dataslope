"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SavedQuery } from "../types";
import { persistAsync } from "../utils/persistedStorage";

/** Cap on saved queries kept (and persisted). */
const MAX_SAVED = 200;

function newSavedId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Read and shape-validate persisted saved queries. Returns [] on SSR,
 *  missing/corrupt data, or when no key is provided. */
function loadPersisted(storageKey: string | undefined): SavedQuery[] {
  if (!storageKey || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is SavedQuery =>
        !!e &&
        typeof e === "object" &&
        typeof (e as SavedQuery).id === "string" &&
        typeof (e as SavedQuery).sql === "string",
    );
  } catch {
    return [];
  }
}

export interface UseSavedQueriesResult {
  saved: SavedQuery[];
  /** Set of saved SQL strings for O(1) "is this saved?" lookups. */
  savedSqlSet: Set<string>;
  /** Toggle a query's saved state, keyed by exact SQL: saves it if not
   *  already saved, otherwise removes the matching saved entry. */
  toggleSaved: (entry: { sql: string; source: string }) => void;
  /** Remove a saved query by id. */
  removeSaved: (id: string) => void;
}

/**
 * Saved-query ("starred") store. When `storageKey` is provided the (capped)
 * list is persisted to localStorage and restored on the next load; without a
 * key it behaves as a plain in-memory store. The list is loaded via a lazy
 * initializer — it only renders inside the (lazily-shown) History pane, so a
 * differing server/client value causes no hydration mismatch (mirrors
 * `useQueryHistory`).
 */
export function useSavedQueries(storageKey?: string): UseSavedQueriesResult {
  const [saved, setSaved] = useState<SavedQuery[]>(() =>
    loadPersisted(storageKey),
  );

  // Persist on every change (including down to an empty list, so removing the
  // last saved query sticks). persistAsync is idle-deferred, so the redundant
  // write of the just-loaded value on mount is cheap.
  useEffect(() => {
    if (!storageKey) return;
    persistAsync(storageKey, JSON.stringify(saved.slice(0, MAX_SAVED)));
  }, [saved, storageKey]);

  const toggleSaved = useCallback((entry: { sql: string; source: string }) => {
    const sql = entry.sql.trim();
    if (!sql) return;
    setSaved((prev) => {
      if (prev.some((s) => s.sql === sql)) {
        return prev.filter((s) => s.sql !== sql);
      }
      const next: SavedQuery = {
        id: newSavedId(),
        sql,
        source: entry.source,
        savedAt: Date.now(),
      };
      const list = [next, ...prev];
      return list.length > MAX_SAVED ? list.slice(0, MAX_SAVED) : list;
    });
  }, []);

  const removeSaved = useCallback((id: string) => {
    setSaved((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const savedSqlSet = useMemo(
    () => new Set(saved.map((s) => s.sql)),
    [saved],
  );

  return { saved, savedSqlSet, toggleSaved, removeSaved };
}
