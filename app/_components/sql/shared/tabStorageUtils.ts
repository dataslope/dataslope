"use client";

import { newTabId } from "../../sqlitePlaygroundTabs";
import type { QueryTab } from "../../sqlitePlaygroundTabs";
import { createTabScope, type LegacyDbFilenames } from "./tabScope";

export interface TabStorageUtils {
  dbScopedKey: (dbId: string, k: string) => string;
  loadTabs: (
    dbId: string,
    defaults: { title: string; code: string; kind?: "view-data" }[],
  ) => QueryTab[];
  saveTabs: (dbId: string, tabs: QueryTab[]) => void;
  /** Fresh tabs from `defaults`, ignoring anything saved. */
  seedTabs: (
    defaults: { title: string; code: string; kind?: "view-data" }[],
  ) => QueryTab[];
  /** The persisted active tab for `dbId` if it is one of `tabs`, else the
   *  first tab. */
  loadActiveTabId: (dbId: string, tabs: QueryTab[]) => string;
  /** See `createTabScope`: called once the workspace bootstrap resolves. True
   *  when the scope moved, meaning tabs must be read again. */
  setWorkspaceScope: (workspaceId: string) => boolean;
  /** See `createTabScope`: carries a workspace's tabs onto a duplicate. */
  copyScopedKeys: (fromWorkspaceId: string, toWorkspaceId: string) => number;
  /** See `createTabScope`: the database the active workspace holds. */
  readActiveDbId: () => string | null;
  /** See `createTabScope`: records the database a workspace holds. */
  writeActiveDbId: (dbId: string, workspaceId?: string) => void;
  /** See `createTabScope`: the name the user gave a workspace's database. */
  readDbFilename: (dbId: string) => string | null;
  /** See `createTabScope`: `readDbFilename`, taking over a pre-scoping name. */
  claimDbFilename: (dbId: string) => string | null;
  /** See `createTabScope`: records (or with null, clears) that name. */
  writeDbFilename: (
    dbId: string,
    filename: string | null,
    workspaceId?: string,
  ) => void;
}

/**
 * Creates tab-storage helpers bound to a specific localStorage namespace.
 * Each SQL dialect uses a distinct prefix so their keys never collide, and
 * within a prefix every key is scoped to the active workspace.
 */
export function createTabStorage(
  storagePrefix: string,
  playgroundId: string,
  options: { legacyDbFilenames?: LegacyDbFilenames } = {},
): TabStorageUtils {
  const scope = createTabScope(storagePrefix, playgroundId, options);

  function dbScopedKey(dbId: string, k: string): string {
    return scope.scopedKey(dbId, k);
  }

  function seedTabs(
    defaults: { title: string; code: string; kind?: "view-data" }[],
  ): QueryTab[] {
    return defaults.map((seed) => ({
      ...seed,
      id: newTabId(),
      pristineCode: seed.code,
    }));
  }

  function loadTabs(
    dbId: string,
    defaults: { title: string; code: string; kind?: "view-data" }[],
  ): QueryTab[] {
    const fallback = (): QueryTab[] => seedTabs(defaults);

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
  }

  function loadActiveTabId(dbId: string, tabs: QueryTab[]): string {
    try {
      const saved = localStorage.getItem(dbScopedKey(dbId, "active_tab"));
      if (saved && tabs.some((tab) => tab.id === saved)) return saved;
    } catch {
      // Fall back to the first tab.
    }
    return tabs[0]?.id ?? "";
  }

  return {
    dbScopedKey,
    loadTabs,
    saveTabs,
    seedTabs,
    loadActiveTabId,
    setWorkspaceScope: scope.setWorkspaceScope,
    copyScopedKeys: scope.copyScopedKeys,
    readActiveDbId: scope.readActiveDbId,
    writeActiveDbId: scope.writeActiveDbId,
    readDbFilename: scope.readDbFilename,
    claimDbFilename: scope.claimDbFilename,
    writeDbFilename: scope.writeDbFilename,
  };
}
