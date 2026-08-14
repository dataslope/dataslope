import type { QueryTab } from "../../sqlitePlaygroundTabs";

/**
 * Picks which tab to activate after `closedId` is removed. Priority: MRU
 * history hit → the tab just before the closed one → the first remaining
 * tab. `history` must already have `closedId` removed.
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
 * Update the MRU stack on a tab switch: push `fromId` (deduplicated) and
 * drop `toId`, which is now current and must not appear in history.
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
