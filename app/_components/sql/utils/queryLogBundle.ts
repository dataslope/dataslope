"use client";

/**
 * Moving the query history and starred queries in and out of a cloud save.
 *
 * Both live in localStorage under playground-global keys, which meant they
 * existed on exactly one device: a member who backed a workspace up and opened
 * it on a laptop found the database and the tabs, and none of the queries they
 * had run or starred.
 *
 * They travel in the bundle's `personal` section, which the cloud backup path
 * asks for explicitly and a share bundle never carries (see
 * `BundleSqlPersonal`). Coming back in they are *merged*, not replaced: the
 * device being restored onto has its own history, and a restore is not a
 * reason to lose it.
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

/**
 * Merge an incoming history into the local one.
 *
 * Deduplicated by entry id, which is a uuid per run, so the same backup
 * restored twice adds nothing the second time. Ties go to the local copy:
 * this device's record of its own run is the more trustworthy one.
 */
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

/**
 * Merge incoming starred queries into the local ones.
 *
 * Deduplicated by SQL rather than by id, because that is the identity the star
 * toggle itself uses: the same query starred on two devices is one star, not
 * two rows that can't both be unstarred.
 */
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

/**
 * Snapshot this device's query log for a bundle, or undefined when there is
 * nothing to carry. Pending writes are flushed first so a query run seconds
 * before the backup is in it.
 */
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

/**
 * Merge a bundle's query log into this device's, and return the merged history
 * so the caller can push it into the live pane (the starred list is re-read
 * from storage whenever the history tab mounts, so it needs no such nudge).
 */
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
