import type { ReactNode } from "react";

/** Open-ended set of tab kinds. The string fallback lets callers
 *  introduce new kinds (e.g. "terminal") without churning this file. */
export type TabKind =
  | "code"
  | "settings"
  | "er-diagram"
  | "query-history"
  | "view-data"
  | "terminal"
  | (string & {});

/** A single entry rendered in a tab's right-click context menu. The
 *  generic TabBar renders these *after* the built-in Rename / Close
 *  entries (when those are applicable). Callers can suppress the
 *  built-in entries via `hideBuiltinMenuItems`. */
export interface TabContextMenuItem {
  /** Unique within the descriptor. */
  key: string;
  /** Visible label. */
  label: string;
  /** Optional icon rendered alongside the label. */
  icon?: ReactNode;
  /** Click handler. */
  onSelect: () => void;
  /** Rendered with the destructive style. */
  danger?: boolean;
}

export interface TabDescriptor {
  id: string;
  kind: TabKind;
  /** Visible label shown in the tab strip. */
  label: string;
  /** Optional icon rendered left of the label. */
  icon?: ReactNode;
  /** False to hide the close affordance. Defaults to true. */
  closeable?: boolean;
  /** True to allow rename via context menu / dblclick. Defaults to false. */
  renameable?: boolean;
  /** True to pin to the leftmost position (and skip reorder). */
  pinned?: boolean;
  /** Optional title used for the rename dialog ("Rename tab" by
   *  default — SQL playgrounds use "Rename query tab"). */
  renameDialogTitle?: string;
  /** Optional helper text shown under the rename dialog title. */
  renameDialogDescription?: string;
  /** Optional extra context menu items appended after Rename / Close. */
  contextMenuItems?: TabContextMenuItem[];
  /** When true, the built-in Rename / Close entries are NOT rendered
   *  in the context menu — only `contextMenuItems` are. Useful for
   *  kinds that should expose only a subset (e.g. SQL view-data tabs
   *  hide Rename). Built-in entries still fire via the dialog and X
   *  affordances when the underlying flags allow it. */
  hideBuiltinMenuItems?: boolean;
}
