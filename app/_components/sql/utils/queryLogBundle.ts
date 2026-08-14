"use client";

/**
 * Moves the query history and starred queries in and out of a cloud save.
 * They travel in the bundle's `personal` section, which only the cloud
 * backup path asks for — a share bundle never carries it. Restores are
 * *merged*, not replaced: the target device keeps its own history.
 */

import type {
  BundleSqlPersonal,
  BundleQueryHistoryEntry,
  BundleSavedQuery,
} from "@/lib/workspaces/types";
import { BUNDLE_MAX_LOG_ENTRIES } from "@/lib/workspaces/types";
import type { QueryHistoryEntry, SavedQuery } from "../types";
import { flushPersistedStorage, persistAsync } from "./persistedStorage";

export interface QueryLogKeys {
  history: string;
  saved: string;
}

function readList<T>(key: string, isEntry: (value: unknown) => boolean): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry) as T[];
  } catch {
    return [];
  }
}

function isHistoryEntry(value: unknown): boolean {
  const e = value as QueryHistoryEntry;
  return (
    !!e && typeof e === "object" && typeof e.id === "string" && typeof e.sql === "string"
  );
}

function isSavedQuery(value: unknown): boolean {
  const e = value as SavedQuery;
  return (
    !!e && typeof e === "object" && typeof e.id === "string" && typeof e.sql === "string"
  );
}

/** Merge an incoming history into the local one. Deduplicated by entry id
 *  (a uuid per run) so a twice-restored backup adds nothing; ties go to the
 *  local copy. */
export function mergeHistory(
  local: readonly QueryHistoryEntry[],
  incoming: readonly BundleQueryHistoryEntry[],
): QueryHistoryEntry[] {
  const byId = new Map<string, QueryHistoryEntry>();
  for (const entry of incoming) byId.set(entry.id, entry as QueryHistoryEntry);
  for (const entry of local) byId.set(entry.id, entry);
  return [...byId.values()]
    .sort((a, b) => (b.executedAt ?? 0) - (a.executedAt ?? 0))
    .slice(0, BUNDLE_MAX_LOG_ENTRIES);
}

/** Merge incoming starred queries into the local ones. Deduplicated by SQL,
 *  not id — the identity the star toggle itself uses, so the same query
 *  starred on two devices is one star. */
export function mergeSaved(
  local: readonly SavedQuery[],
  incoming: readonly BundleSavedQuery[],
): SavedQuery[] {
  const bySql = new Map<string, SavedQuery>();
  for (const entry of incoming) bySql.set(entry.sql, entry as SavedQuery);
  for (const entry of local) bySql.set(entry.sql, entry);
  return [...bySql.values()]
    .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0))
    .slice(0, BUNDLE_MAX_LOG_ENTRIES);
}

/** Snapshot this device's query log for a bundle (undefined when empty).
 *  Pending writes are flushed first so a just-run query is included. */
export function readQueryLog(keys: QueryLogKeys): BundleSqlPersonal | undefined {
  if (typeof window === "undefined") return undefined;
  flushPersistedStorage();
  const history = readList<QueryHistoryEntry>(keys.history, isHistoryEntry).slice(
    0,
    BUNDLE_MAX_LOG_ENTRIES,
  );
  const saved = readList<SavedQuery>(keys.saved, isSavedQuery).slice(
    0,
    BUNDLE_MAX_LOG_ENTRIES,
  );
  if (history.length === 0 && saved.length === 0) return undefined;
  return { history, saved };
}

/** Merge a bundle's query log into this device's, returning the merged
 *  history for the live pane (the starred list is re-read from storage on
 *  history-tab mount, so it needs no nudge). */
export function restoreQueryLog(
  personal: BundleSqlPersonal | undefined,
  keys: QueryLogKeys,
): { history: QueryHistoryEntry[] } | null {
  if (!personal || typeof window === "undefined") return null;
  const incomingHistory = personal.history ?? [];
  const incomingSaved = personal.saved ?? [];
  if (incomingHistory.length === 0 && incomingSaved.length === 0) return null;

  const history = mergeHistory(
    readList<QueryHistoryEntry>(keys.history, isHistoryEntry),
    incomingHistory,
  );
  const saved = mergeSaved(
    readList<SavedQuery>(keys.saved, isSavedQuery),
    incomingSaved,
  );
  persistAsync(keys.history, JSON.stringify(history));
  persistAsync(keys.saved, JSON.stringify(saved));
  return { history };
}
