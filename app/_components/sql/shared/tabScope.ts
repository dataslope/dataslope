"use client";

/**
 * Workspace scoping for the SQL playgrounds' localStorage keys.
 *
 * Tab state (the tab list, which tab was active, which schema sections were
 * expanded) used to be keyed by *sample database* id alone:
 *
 *     playground_postgres_db_credit_card_transactions_tabs
 *
 * A workspace, though, is a database of its own — its own OPFS directory, its
 * own contents — and two workspaces built from the same sample shared that one
 * key. Opening the second workspace showed the first one's tabs, and editing
 * them there rewrote the first one's, which for a saved workspace meant losing
 * work the user never touched. Keys are now scoped by workspace as well:
 *
 *     playground_postgres_ws_<workspaceId>_db_credit_card_transactions_tabs
 *
 * The scope is resolved lazily rather than passed in, because the playgrounds
 * read their tabs in a `useState` initializer, before the async workspace
 * bootstrap has resolved. `peekActiveWorkspaceId` answers from the same
 * pointers `ensureActiveWorkspace` consults, so it is right whenever there is
 * a workspace to resume; when the bootstrap ends up somewhere else (it minted
 * a fresh draft, or another tab held the remembered one) it calls
 * `setWorkspaceScope`, which reports the change so the caller can re-read.
 */

import { peekActiveWorkspaceId } from "../../opfs/activeWorkspace";
import type { QueryTab } from "../../sqlitePlaygroundTabs";

export interface TabScope {
  /** localStorage key for `k`, scoped to the active workspace and database. */
  scopedKey: (dbId: string, k: string) => string;
  /** Point the scope at a resolved workspace. Returns true when that differs
   *  from the scope keys were being built under, i.e. anything already read
   *  came from the wrong workspace and should be read again. */
  setWorkspaceScope: (workspaceId: string) => boolean;
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
   * Copy pre-scoping keys under the first workspace this device resolves.
   *
   * Without this, everyone's tabs would silently reset to the defaults on the
   * deploy that introduced scoping. Whichever workspace resolves first claims
   * them, which is the one the device last had open, so the tabs land where
   * the user last saw them; every other workspace starts from defaults, which
   * is what it should have had all along.
   *
   * The originals are left in place rather than moved. They cost a few
   * kilobytes and are never read again, and keeping them means this migration
   * destroys nothing if it ever has to be rolled back.
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
      // No workspace yet: the pre-scoping key, so a first read still finds
      // whatever this device already had. The bootstrap calls
      // `setWorkspaceScope` moments later and the caller re-reads.
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
  };
}

/**
 * Move a playground onto its resolved workspace's tab keys, and report what it
 * should be showing if that moved.
 *
 * Called once the bootstrap resolves, and a no-op (null) in the common case
 * where the peeked scope was already right. When it isn't — a first-ever
 * visit, or a fresh draft because another tab held the remembered workspace —
 * the tabs on screen belong to a different workspace, so they are read again
 * under the right keys. Doing this during boot is safe: the pane is behind the
 * loading overlay, so there is nothing of the user's to lose.
 *
 * Returns the tabs to show plus which one to activate, leaving the caller to
 * apply them with its own state setters.
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
