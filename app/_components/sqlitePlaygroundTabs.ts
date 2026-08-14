"use client";

import type { QueryTabSeed } from "./runtime/sqliteSamples";
import { createTabScope } from "./sql/shared/tabScope";

const STORAGE_PREFIX = "playground_sqlite_";

// Keys are namespaced so they don't collide with other playgrounds.
export const storageKey = (k: string) => `${STORAGE_PREFIX}${k}`;

// Per-database keys are also scoped to the active workspace, so two workspaces
// built from the same sample database keep their own tabs (see createTabScope).
const tabScope = createTabScope(STORAGE_PREFIX, "sqlite");
export const dbScopedKey = (dbId: string, k: string) =>
  tabScope.scopedKey(dbId, k);
export const setTabWorkspaceScope = tabScope.setWorkspaceScope;
export const copyTabWorkspaceKeys = tabScope.copyScopedKeys;

export interface QueryTab {
  /** Stable client-generated id, used as the React key. */
  id: string;
  title: string;
  code: string;
  /** Snapshot of `code` at tab creation. Dirty = `code !== pristineCode`,
   *  which skips the close-confirmation for tabs the user never edited. */
  pristineCode: string;
  /** Special tab types: "view-data" (table preview, no editor, auto-runs),
   *  "er-diagram", "query-history". */
  kind?: "view-data" | "er-diagram" | "query-history";
}

export function newTabId(): string {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function loadTabs(dbId: string, defaults: QueryTabSeed[]): QueryTab[] {
  if (typeof window === "undefined") {
    return defaults.map((seed) => ({
      ...seed,
      id: newTabId(),
      pristineCode: seed.code,
    }));
  }
  try {
    const raw = localStorage.getItem(dbScopedKey(dbId, "tabs"));
    if (raw) {
      const parsed = JSON.parse(raw) as QueryTab[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((t) => {
          const code = typeof t.code === "string" ? t.code : "";
          return {
            id: typeof t.id === "string" ? t.id : newTabId(),
            title: typeof t.title === "string" ? t.title : "Query",
            code,
            // Tabs saved before `pristineCode` existed are treated as clean.
            pristineCode:
              typeof t.pristineCode === "string" ? t.pristineCode : code,
            // Keep "view-data" tabs as data views; transient kinds are
            // filtered out by saveTabs and never round-trip.
            kind: t.kind === "view-data" ? "view-data" : undefined,
          };
        });
      }
    }
  } catch {
    // Corrupt entry, fall through to defaults.
  }
  return defaults.map((seed) => ({
    ...seed,
    id: newTabId(),
    pristineCode: seed.code,
  }));
}

export function saveTabs(dbId: string, tabs: QueryTab[]): void {
  try {
    // ER-diagram and query-history tabs are transient; never persist them.
    const persistable = tabs.filter((t) => t.kind !== "er-diagram" && t.kind !== "query-history");
    localStorage.setItem(dbScopedKey(dbId, "tabs"), JSON.stringify(persistable));
  } catch {
    // Quota exceeded / private mode, silently ignore.
  }
}

export function loadActiveTabId(dbId: string, tabs: QueryTab[]): string {
  if (tabs.length === 0) return "";
  if (typeof window === "undefined") return tabs[0].id;
  const saved = localStorage.getItem(dbScopedKey(dbId, "active_tab"));
  if (saved && tabs.some((t) => t.id === saved)) return saved;
  return tabs[0].id;
}

export function tabsAreDirty(
  tabs: QueryTab[],
  defaults: QueryTabSeed[],
): boolean {
  // Dirty = the user added/removed tabs or edited any tab's contents.
  if (tabs.length !== defaults.length) return true;
  for (let i = 0; i < tabs.length; i += 1) {
    if (
      tabs[i].title !== defaults[i].title ||
      tabs[i].code !== defaults[i].code
    ) {
      return true;
    }
  }
  return false;
}
