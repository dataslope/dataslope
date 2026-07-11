"use client";

import { newTabId } from "../../sqlitePlaygroundTabs";
import type { QueryTab } from "../../sqlitePlaygroundTabs";
import { notifyWorkspaceChanged } from "../../workspace/workspaceChanges";

export interface TabStorageUtils {
  dbScopedKey: (dbId: string, k: string) => string;
  loadTabs: (dbId: string, defaults: { title: string; code: string }[]) => QueryTab[];
  saveTabs: (dbId: string, tabs: QueryTab[]) => void;
}

/**
 * Creates tab-storage helpers bound to a specific localStorage namespace.
 * Each SQL dialect uses a distinct prefix so their keys never collide.
 */
export function createTabStorage(storagePrefix: string): TabStorageUtils {
  function dbScopedKey(dbId: string, k: string): string {
    return `${storagePrefix}db_${dbId}_${k}`;
  }

  function loadTabs(
    dbId: string,
    defaults: { title: string; code: string }[],
  ): QueryTab[] {
    const fallback = (): QueryTab[] =>
      defaults.map((seed) => ({
        ...seed,
        id: newTabId(),
        pristineCode: seed.code,
      }));

    if (typeof window === "undefined") return fallback();
    try {
      const raw = localStorage.getItem(dbScopedKey(dbId, "tabs"));
      if (raw) {
        const parsed = JSON.parse(raw) as QueryTab[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((tab) => ({
            id: typeof tab.id === "string" ? tab.id : newTabId(),
            title: typeof tab.title === "string" ? tab.title : "Query",
            code: typeof tab.code === "string" ? tab.code : "",
            pristineCode:
              typeof tab.pristineCode === "string"
                ? tab.pristineCode
                : typeof tab.code === "string"
                  ? tab.code
                  : "",
            kind: tab.kind === "view-data" ? "view-data" : undefined,
          }));
        }
      }
    } catch {
      // Fall back to defaults.
    }
    return fallback();
  }

  function saveTabs(dbId: string, tabs: QueryTab[]): void {
    try {
      localStorage.setItem(
        dbScopedKey(dbId, "tabs"),
        JSON.stringify(
          tabs.filter(
            (tab) => tab.kind !== "er-diagram" && tab.kind !== "query-history",
          ),
        ),
      );
    } catch {
      // Ignore storage quota / private-mode errors.
    }
    // Query edits + post-run tab state both flow through here, so this is the
    // single sink that drives the signed-in cloud auto-sync (Postgres/DuckDB).
    notifyWorkspaceChanged();
  }

  return { dbScopedKey, loadTabs, saveTabs };
}

/** Pure helper: true when tabs differ from the defaults (title, code, or count). */
export function tabsAreDirty(
  tabs: QueryTab[],
  defaults: { title: string; code: string }[],
): boolean {
  if (tabs.length !== defaults.length) return true;
  for (let i = 0; i < tabs.length; i += 1) {
    if (tabs[i].title !== defaults[i].title || tabs[i].code !== defaults[i].code)
      return true;
  }
  return false;
}
