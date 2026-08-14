"use client";

/**
 * Workspace scoping for the SQL playgrounds' localStorage keys
 * (`<prefix>ws_<workspaceId>_db_<dbId>_<k>`): two workspaces built from the
 * same sample must not share tab keys. The scope resolves lazily because the
 * playgrounds read tabs in a `useState` initializer, before the async
 * workspace bootstrap resolves; when the bootstrap lands elsewhere it calls
 * `setWorkspaceScope`, which reports the change so the caller re-reads.
 */

import { peekActiveWorkspaceId } from "../../opfs/activeWorkspace";
import type { QueryTab } from "../../sqlitePlaygroundTabs";

export interface TabScope {
  /** localStorage key for `k`, scoped to the active workspace and database. */
  scopedKey: (dbId: string, k: string) => string;
  /** Point the scope at a resolved workspace. True when that differs from
   *  the scope keys were being built under, i.e. re-read what was read. */
  setWorkspaceScope: (workspaceId: string) => boolean;
  /** Copy one workspace's tab keys onto another's (workspace duplication —
   *  the OPFS copy carries the database, not these keys). Returns the count. */
  copyScopedKeys: (fromWorkspaceId: string, toWorkspaceId: string) => number;
}

/** `undefined` means "not resolved yet", `null` means "resolved, and there is
 *  no workspace to scope to" (a first-ever visit, before the bootstrap
 *  creates one). */
type Scope = string | null | undefined;

export function createTabScope(
  storagePrefix: string,
  playgroundId: string,
): TabScope {
  let scope: Scope;

  /**
   * Copy pre-scoping keys under the first workspace this device resolves, so
   * the deploy that introduced scoping doesn't reset everyone's tabs. The
   * originals stay in place so a rollback destroys nothing.
   */
  function migrateUnscopedKeys(workspaceId: string): void {
    if (typeof window === "undefined") return;
    const marker = `${storagePrefix}ws_scoped`;
    try {
      if (window.localStorage.getItem(marker)) return;
      const legacyPrefix = `${storagePrefix}db_`;
      const legacyKeys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(legacyPrefix)) legacyKeys.push(key);
      }
      for (const key of legacyKeys) {
        const value = window.localStorage.getItem(key);
        if (value === null) continue;
        const suffix = key.slice(storagePrefix.length);
        window.localStorage.setItem(
          `${storagePrefix}ws_${workspaceId}_${suffix}`,
          value,
        );
      }
      window.localStorage.setItem(marker, "1");
    } catch {
      /* quota / private mode: fall back to the defaults, nothing is lost. */
    }
  }

  function resolveScope(): string | null {
    if (scope === undefined) {
      scope = peekActiveWorkspaceId(playgroundId);
      if (scope) migrateUnscopedKeys(scope);
    }
    return scope;
  }

  return {
    scopedKey(dbId, k) {
      const workspaceId = resolveScope();
      // No workspace yet: use the pre-scoping key so a first read still finds
      // what the device already had; the bootstrap re-scopes moments later.
      return workspaceId
        ? `${storagePrefix}ws_${workspaceId}_db_${dbId}_${k}`
        : `${storagePrefix}db_${dbId}_${k}`;
    },
    setWorkspaceScope(workspaceId) {
      const previous = resolveScope();
      if (previous === workspaceId) return false;
      scope = workspaceId;
      migrateUnscopedKeys(workspaceId);
      return true;
    },
    copyScopedKeys(fromWorkspaceId, toWorkspaceId) {
      if (typeof window === "undefined") return 0;
      if (fromWorkspaceId === toWorkspaceId) return 0;
      const fromPrefix = `${storagePrefix}ws_${fromWorkspaceId}_`;
      const toPrefix = `${storagePrefix}ws_${toWorkspaceId}_`;
      try {
        // Collected first: writing while walking `key(i)` would shift the
        // indices out from under the loop.
        const keys: string[] = [];
        for (let i = 0; i < window.localStorage.length; i += 1) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith(fromPrefix)) keys.push(key);
        }
        let copied = 0;
        for (const key of keys) {
          const value = window.localStorage.getItem(key);
          if (value === null) continue;
          window.localStorage.setItem(
            `${toPrefix}${key.slice(fromPrefix.length)}`,
            value,
          );
          copied += 1;
        }
        return copied;
      } catch {
        // Quota / private mode: the copy opens on default tabs, which is a
        // smaller loss than failing the copy itself.
        return 0;
      }
    },
  };
}

/**
 * Move a playground onto its resolved workspace's tab keys; null when the
 * peeked scope was already right. Otherwise the on-screen tabs belong to a
 * different workspace, so they are re-read under the right keys — safe during
 * boot because the pane is still behind the loading overlay. Returns the
 * tabs to show plus which one to activate.
 */
export function tabsForAdoptedScope(opts: {
  setWorkspaceScope: (workspaceId: string) => boolean;
  workspaceId: string;
  /** Read the tab list under the (now current) scope, defaults included. */
  readTabs: () => QueryTab[];
  /** Read the persisted active tab id under the (now current) scope. */
  readActiveTabId: () => string | null;
}): { tabs: QueryTab[]; activeTabId: string } | null {
  if (!opts.setWorkspaceScope(opts.workspaceId)) return null;
  const tabs = opts.readTabs();
  const remembered = opts.readActiveTabId();
  const activeTabId =
    remembered && tabs.some((tab) => tab.id === remembered)
      ? remembered
      : (tabs[0]?.id ?? "");
  return { tabs, activeTabId };
}
