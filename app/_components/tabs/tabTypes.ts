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

/** Entry in a tab's right-click context menu, rendered after the built-in
 *  Rename / Close entries (suppress those via `hideBuiltinMenuItems`). */
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
  /** Title for the rename dialog ("Rename tab" by default). */
  renameDialogTitle?: string;
  /** Optional helper text shown under the rename dialog title. */
  renameDialogDescription?: string;
  /** Optional extra context menu items appended after Rename / Close. */
  contextMenuItems?: TabContextMenuItem[];
  /** Hide the built-in Rename / Close context-menu entries (only
   *  `contextMenuItems` render); the dialog and X affordances still work. */
  hideBuiltinMenuItems?: boolean;
  /** Rename dialog selects only the stem (before the last `.`) so typing
   *  replaces the basename without nuking the extension. Default false:
   *  whole label selected. */
  renameSelectsStem?: boolean;
}
