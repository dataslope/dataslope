"use client";

/**
 * "Open a copy" from the workspace-conflict overlay.
 *
 * A workspace can only run in one tab at a time: PGlite (and the SQLite /
 * DuckDB workers) take an exclusive OPFS access handle, and a second tab
 * opening the same directory doesn't race, it deadlocks the boot. So the
 * second tab has to do something else, and until now its only options were to
 * start an empty workspace or to go away, both of which lose the thing the
 * user was actually trying to reach: this data, in this tab.
 *
 * Copying gives them that. The duplicate is a real workspace of its own, so
 * both tabs work, neither waits on the other, and nothing is overwritten.
 *
 * Two things worth knowing about the copy:
 *
 *   - it is taken while the other tab has the database open, so a copy made
 *     mid-write can be incomplete. Nothing here can prevent that without the
 *     holding tab's cooperation; what it does mean is that the copy might
 *     fail to open, which surfaces as the playground's ordinary engine-boot
 *     error rather than as silent corruption;
 *   - the tab list lives in localStorage rather than in the workspace
 *     directory, so it is copied separately (`copyScopedKeys`). Without that
 *     the copy would open on default tabs beside a database full of the
 *     user's work.
 */

import {
  duplicateWorkspace,
  readOpfsWorkspaceMeta,
  type WorkspaceEntry,
} from "./workspace";
import { switchActiveWorkspace } from "./activeWorkspace";

export interface CopyConflictedWorkspaceOptions {
  playgroundId: string;
  /** The workspace this tab wanted and another tab is holding. */
  sourceId: string;
  /** Its name, when the caller already has it (the header shows it). */
  sourceName?: string;
  /** Duplicates the playground's workspace-scoped localStorage keys. */
  copyScopedKeys?: (fromWorkspaceId: string, toWorkspaceId: string) => number;
}

/** `"<name> (copy)"`, and `"<name> (copy 2)"` on a name already ending that
 *  way, so copying a copy doesn't produce "(copy) (copy)". */
export function copyNameFor(name: string): string {
  const match = name.match(/^(.*) \(copy(?: (\d+))?\)$/);
  if (!match) return `${name} (copy)`;
  const next = match[2] ? Number(match[2]) + 1 : 2;
  return `${match[1]} (copy ${next})`;
}

/**
 * Duplicate the conflicted workspace and make the copy this tab's active one.
 * Resolves to the new entry, or null when there was nothing to copy (no OPFS,
 * or the directory is gone).
 *
 * On success this navigates: `switchActiveWorkspace` reloads so the engine
 * boots against the copy from a clean slate, exactly as it does for an
 * ordinary workspace switch.
 */
export async function copyConflictedWorkspace({
  playgroundId,
  sourceId,
  sourceName,
  copyScopedKeys,
}: CopyConflictedWorkspaceOptions): Promise<WorkspaceEntry | null> {
  const name =
    sourceName ?? (await readOpfsWorkspaceMeta(sourceId))?.name ?? "Workspace";
  const copy = await duplicateWorkspace(sourceId, copyNameFor(name));
  if (!copy) return null;
  copyScopedKeys?.(sourceId, copy.id);
  switchActiveWorkspace(playgroundId, copy.id);
  return copy;
}
