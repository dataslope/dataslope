"use client";

/**
 * Workspace scoping for the SQL playgrounds' localStorage keys
 * (`<prefix>ws_<workspaceId>_db_<dbId>_<k>`): two workspaces built from the
 * same sample must not share tab keys. The scope resolves lazily because the
 * playgrounds read tabs in a `useState` initializer, before the async
 * workspace bootstrap resolves; when the bootstrap lands elsewhere it calls
 * `setWorkspaceScope`, which reports the change so the caller re-reads.
 *
 * The database a workspace holds is scoped the same way
 * (`<prefix>ws_<workspaceId>_active_db`). It used to be one device-wide
 * `<prefix>db` key, so opening a workspace paired its data with whichever
 * database was chosen last anywhere on the device: the wrong label, and the
 * tabs of a database the workspace does not contain.
 *
 * So is the name the user gave that database (an imported file's name, or a
 * rename), at `<prefix>ws_<workspaceId>_db_<dbId>_filename`. SQLite kept these
 * in one device-wide map and DuckDB not at all; Postgres had one device-wide
 * key. Each playground hands its pre-scoping storage over as
 * `legacyDbFilenames`, read until a workspace claims it.
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
  /** The database id the active workspace holds, else the device-wide id that
   *  predates per-workspace selection (a workspace never opened since, or a
   *  new one), else null. */
  readActiveDbId: () => string | null;
  /** Record the database `workspaceId` (default: the active workspace) holds.
   *  Also kept as the device-wide id, which is what a brand-new workspace
   *  starts from. */
  writeActiveDbId: (dbId: string, workspaceId?: string) => void;
  /** The name the user gave database `dbId` in the active workspace, else
   *  null (it goes by its own filename). Falls back to the device-wide name
   *  that predates scoping until a workspace claims it. */
  readDbFilename: (dbId: string) => string | null;
  /** `readDbFilename`, except that a name found only in the device-wide
   *  storage moves into the active workspace and leaves that storage, so no
   *  other workspace inherits it. Call once the workspace has resolved. */
  claimDbFilename: (dbId: string) => string | null;
  /** Record the name of `dbId` for `workspaceId` (default: the active one);
   *  null records that it has none, which also stops the device-wide
   *  fallback from naming it. */
  writeDbFilename: (
    dbId: string,
    filename: string | null,
    workspaceId?: string,
  ) => void;
}

/** Where a playground kept database names before they were scoped. */
export interface LegacyDbFilenames {
  read: (dbId: string) => string | null;
  forget: (dbId: string) => void;
}

/** `undefined` means "not resolved yet", `null` means "resolved, and there is
 *  no workspace to scope to" (a first-ever visit, before the bootstrap
 *  creates one). */
type Scope = string | null | undefined;

export function createTabScope(
  storagePrefix: string,
  playgroundId: string,
  options: { legacyDbFilenames?: LegacyDbFilenames } = {},
): TabScope {
  let scope: Scope;
  const legacyDbFilenames = options.legacyDbFilenames;

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

  const legacyActiveDbKey = `${storagePrefix}db`;
  const activeDbKey = (workspaceId: string) =>
    `${storagePrefix}ws_${workspaceId}_active_db`;
  const dbFilenameKey = (dbId: string, workspaceId: string | null) =>
    workspaceId
      ? `${storagePrefix}ws_${workspaceId}_db_${dbId}_filename`
      : `${storagePrefix}db_${dbId}_filename`;

  /** The workspace's own record: a name, "" for "none", null for no record. */
  function scopedDbFilename(dbId: string): string | null {
    try {
      return window.localStorage.getItem(dbFilenameKey(dbId, resolveScope()));
    } catch {
      return null;
    }
  }

  function readLegacyDbFilename(dbId: string): string | null {
    try {
      return legacyDbFilenames?.read(dbId) || null;
    } catch {
      return null;
    }
  }

  function writeDbFilename(
    dbId: string,
    filename: string | null,
    workspaceId?: string,
  ): void {
    if (typeof window === "undefined") return;
    const target = workspaceId ?? resolveScope();
    try {
      window.localStorage.setItem(dbFilenameKey(dbId, target), filename ?? "");
    } catch {
      /* quota / private mode: the label reverts to the filename on reload. */
    }
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
    readActiveDbId() {
      if (typeof window === "undefined") return null;
      const workspaceId = resolveScope();
      try {
        return (
          (workspaceId
            ? window.localStorage.getItem(activeDbKey(workspaceId))
            : null) ?? window.localStorage.getItem(legacyActiveDbKey)
        );
      } catch {
        return null;
      }
    },
    writeActiveDbId(dbId, workspaceId) {
      if (typeof window === "undefined") return;
      const target = workspaceId ?? resolveScope();
      try {
        if (target) window.localStorage.setItem(activeDbKey(target), dbId);
        window.localStorage.setItem(legacyActiveDbKey, dbId);
      } catch {
        /* quota / private mode: the next boot falls back to the default. */
      }
    },
    readDbFilename(dbId) {
      if (typeof window === "undefined") return null;
      const own = scopedDbFilename(dbId);
      if (own !== null) return own || null;
      return readLegacyDbFilename(dbId);
    },
    claimDbFilename(dbId) {
      if (typeof window === "undefined") return null;
      const own = scopedDbFilename(dbId);
      if (own !== null) return own || null;
      const legacy = readLegacyDbFilename(dbId);
      if (legacy === null || !resolveScope()) return legacy;
      writeDbFilename(dbId, legacy);
      try {
        legacyDbFilenames?.forget(dbId);
      } catch {
        /* the copy is made; a leftover original only costs a fallback. */
      }
      return legacy;
    },
    writeDbFilename,
  };
}

/**
 * Move a playground onto its resolved workspace: its tab keys and the
 * database it holds. Both were guessed before the bootstrap resolved (the tab
 * scope from the workspace pointer, the database from that guess), so when
 * either turns out wrong the tabs are re-read for the right pair (safe during
 * boot, because the pane is still behind the loading overlay). Null when the
 * guess was right on both counts; otherwise the database to boot, the tabs to
 * show and which one to activate.
 */
export function stateForAdoptedWorkspace(opts: {
  setWorkspaceScope: (workspaceId: string) => boolean;
  workspaceId: string;
  /** The database the on-screen tabs were read for. */
  currentDbId: string;
  /** The database the (now current) workspace holds, already validated. */
  readDbId: () => string;
  /** Read the tab list for `dbId` under the current scope, defaults included. */
  readTabs: (dbId: string) => QueryTab[];
  /** Read the persisted active tab id for `dbId` under the current scope. */
  readActiveTabId: (dbId: string) => string | null;
}): { dbId: string; tabs: QueryTab[]; activeTabId: string } | null {
  const scopeMoved = opts.setWorkspaceScope(opts.workspaceId);
  const dbId = opts.readDbId();
  if (!scopeMoved && dbId === opts.currentDbId) return null;
  const tabs = opts.readTabs(dbId);
  const remembered = opts.readActiveTabId(dbId);
  const activeTabId =
    remembered && tabs.some((tab) => tab.id === remembered)
      ? remembered
      : (tabs[0]?.id ?? "");
  return { dbId, tabs, activeTabId };
}
