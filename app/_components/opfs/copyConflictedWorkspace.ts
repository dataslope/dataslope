"use client";

/**
 * "Open a copy" from the workspace-conflict overlay. A workspace can only run
 * in one tab (engines take an exclusive OPFS access handle; a second open
 * deadlocks the boot), so the second tab gets a real duplicate instead.
 * Caveats: the copy is taken while the other tab has the database open, so a
 * mid-write copy can fail to open (ordinary engine-boot error, not silent
 * corruption); and the tab list lives in localStorage, so it is copied
 * separately via `copyScopedKeys`.
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
 * Duplicates the conflicted workspace and makes the copy this tab's active
 * one. Null when there was nothing to copy. On success this navigates
 * (`switchActiveWorkspace` reloads).
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
