import type { QueryTab } from "../../sqlitePlaygroundTabs";

/**
 * Picks which tab to activate after the tab with `closedId` is removed.
 *
 * Priority:
 *   1. Most-recently-used tab from the history stack that still exists.
 *   2. The tab that occupied the position just before the closed one.
 *   3. The first remaining tab.
 *
 * @param finalTabs   Remaining tabs after the closed tab has been removed.
 * @param closedId    ID of the tab that was just closed.
 * @param originalTabs Tabs array before removal (used for positional fallback).
 * @param history     MRU history stack (oldest → most-recent). Must already
 *                    have `closedId` removed before this call.
 */
export function pickFallbackTab(
  finalTabs: QueryTab[],
  closedId: string,
  originalTabs: QueryTab[],
  history: string[],
): QueryTab {
  const remaining = new Set(finalTabs.map((t) => t.id));

  // Walk the history from most-recent to oldest and take the first hit.
  for (let i = history.length - 1; i >= 0; i--) {
    if (remaining.has(history[i])) {
      return finalTabs.find((t) => t.id === history[i]) ?? finalTabs[0];
    }
  }

  // Positional fallback: the tab just before the closed one.
  const closedIdx = originalTabs.findIndex((t) => t.id === closedId);
  return finalTabs[Math.max(0, closedIdx - 1)] ?? finalTabs[0];
}

/**
 * Updates the MRU history stack when the user switches from one tab to another.
 *
 * - The tab being left (`fromId`) is pushed onto the top of the stack.
 * - Any existing entry for `fromId` is removed first to avoid duplicates.
 * - The tab being entered (`toId`) is removed from the stack (it is now
 *   "current" and should not appear in the history).
 */
export function pushTabHistory(
  history: string[],
  fromId: string,
  toId: string,
): string[] {
  // Remove both ids, then push fromId so the stack stays duplicate-free.
  const filtered = history.filter((id) => id !== fromId && id !== toId);
  return [...filtered, fromId];
}
