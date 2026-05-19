import type { ReactNode } from "react";

/** Open-ended set of tab kinds. The string fallback lets callers
 *  introduce new kinds (e.g. "terminal") without churning this file. */
export type TabKind =
  | "code"
  | "settings"
  | "er-diagram"
  | "query-history"
  | "terminal"
  | (string & {});

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
}
