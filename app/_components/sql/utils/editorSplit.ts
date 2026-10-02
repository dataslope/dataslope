// The editor/results split of a query tab, as the fraction of the two panes'
// combined height that the editor takes. One value is shared by every query
// tab of a playground and persisted per engine, like the sidebar width.
//
// It reaches the layout as two custom properties on `.sql-panes` rather than
// as an inline `grid-template-rows`. An inline track list outranks the
// stylesheet, so it had to be wiped whenever a table view or an ER diagram
// took over the panes, and returning to the query tab then found the
// default split. The tab modifiers (`sql-panes--view-data`, …) and the
// mobile layout each set their own `grid-template-rows` and simply ignore the
// properties, so the split survives them untouched.

import type { CSSProperties } from "react";

/** Neither pane may be dragged below this share of the combined height. */
export const MIN_EDITOR_FRACTION = 0.15;
export const MAX_EDITOR_FRACTION = 1 - MIN_EDITOR_FRACTION;

/** localStorage key suffix, passed through each playground's `storageKey`. */
export const EDITOR_SPLIT_STORAGE_SUFFIX = "editor_split";

export function clampEditorFraction(fraction: number): number {
  return Math.min(MAX_EDITOR_FRACTION, Math.max(MIN_EDITOR_FRACTION, fraction));
}

/** Parse a persisted split. Anything that is not a finite number inside the
 *  draggable range is treated as absent, so the stylesheet default applies. */
export function parseEditorFraction(raw: string | null): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n < MIN_EDITOR_FRACTION || n > MAX_EDITOR_FRACTION) return null;
  return n;
}

export function readEditorFraction(key: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    return parseEditorFraction(localStorage.getItem(key));
  } catch {
    return null;
  }
}

/** The custom properties `.sql-panes` reads its two pane tracks from. */
export function editorSplitProperties(fraction: number): Record<string, string> {
  return {
    "--sql-editor-fr": `${fraction}fr`,
    "--sql-results-fr": `${1 - fraction}fr`,
  };
}

export function editorSplitStyle(fraction: number | null): CSSProperties | undefined {
  if (fraction == null) return undefined;
  return editorSplitProperties(fraction) as CSSProperties;
}
