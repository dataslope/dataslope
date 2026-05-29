"use client";

import type { QueryTabSeed } from "./runtime/sqliteSamples";

const STORAGE_PREFIX = "playground_sqlite_";

// localStorage keys are namespaced under `playground_sqlite_` so they collide
// neither with the language playgrounds nor with the upcoming Postgres
// playground.
export const storageKey = (k: string) => `${STORAGE_PREFIX}${k}`;
export const dbScopedKey = (dbId: string, k: string) =>
  `${STORAGE_PREFIX}db_${dbId}_${k}`;

export interface QueryTab {
  /** Stable id used as the React key — generated client-side because
   *  tabs can be created at any time. */
  id: string;
  title: string;
  code: string;
  /** Snapshot of `code` at the time the tab was created (e.g. the
   *  initial template, a sidebar preview's SELECT, or a structure
   *  query). The tab is considered "dirty" only when `code !==
   *  pristineCode`, which lets us skip the close-confirmation prompt
   *  for tabs the user never edited. */
  pristineCode: string;
  /** When "view-data", this tab was opened via the "View Data" sidebar
   *  action for a table. These tabs display the table icon, hide the
   *  SQL editor pane, and auto-run the preview query.
   *  When "er-diagram", this tab shows an Entity-Relationship Diagram
   *  of the current database schema.
   *  When "query-history", this tab shows the full query execution log. */
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
            // Older saved tabs predate `pristineCode`; assume the
            // persisted contents are what the user left them at, so
            // treat them as clean by mirroring `code` here.
            pristineCode:
              typeof t.pristineCode === "string" ? t.pristineCode : code,
          };
        });
      }
    }
  } catch {
    // Corrupt entry — fall through to defaults.
  }
  return defaults.map((seed) => ({
    ...seed,
    id: newTabId(),
    pristineCode: seed.code,
  }));
}

export function saveTabs(dbId: string, tabs: QueryTab[]): void {
  try {
    // ER diagram and query-history tabs are transient — never persist them
    // so they don't reappear after a page reload or database switch.
    const persistable = tabs.filter((t) => t.kind !== "er-diagram" && t.kind !== "query-history");
    localStorage.setItem(dbScopedKey(dbId, "tabs"), JSON.stringify(persistable));
  } catch {
    // Quota exceeded / private mode — silently ignore.
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
