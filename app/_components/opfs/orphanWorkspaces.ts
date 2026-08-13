"use client";

/**
 * Recovering workspaces that exist in OPFS but in no list.
 *
 * A workspace starts life as a *draft*: OPFS-backed so edits persist, but kept
 * out of the localStorage registry until the user saves it. Every surface that
 * lists workspaces — the header badge, the /playground index, the dashboard —
 * reads that registry, so a draft the session pointer no longer points at
 * becomes unreachable: still on disk, holding whatever the user typed into it,
 * with nothing in the UI able to open it and nothing to reclaim its space.
 *
 * Resuming the last-used workspace (see `resumeLastWorkspace`) means new
 * orphans are rare, but it does nothing for the ones already stranded. This
 * pass sweeps them up:
 *
 *   - a draft the user actually changed is registered, which is all it takes
 *     for every existing surface to show it, and for the post-sign-in backup
 *     to include it;
 *   - a directory holding nothing at all is deleted;
 *   - anything else is left exactly where it is.
 *
 * That last rule is the important one. "Changed" comes from the dirty latch,
 * which only the code playgrounds set, so a SQL draft always looks unchanged
 * even when it holds a database the user built by hand. Deleting on "not
 * changed" would throw that away, so deletion is gated on the directory being
 * literally empty, which no workspace with work in it ever is.
 */

import {
  deleteWorkspace,
  getWorkspaceRegistry,
  isWorkspaceLockHeld,
  listOpfsWorkspaces,
  registerWorkspace,
  updateWorkspaceRegistry,
  type WorkspaceEntry,
} from "./workspace";
import { isWorkspaceDirty, peekActiveWorkspaceId } from "./activeWorkspace";

export interface OrphanRecovery {
  /** Drafts promoted into the registry, now visible in every list. */
  recovered: WorkspaceEntry[];
  /** Empty directories deleted. */
  reclaimed: number;
  /** Orphans left alone: not known to be changed, but not empty either. */
  skipped: number;
}

const EMPTY: OrphanRecovery = { recovered: [], reclaimed: 0, skipped: 0 };

/**
 * Sweep once. Safe to call on any surface that lists workspaces; it only
 * touches directories that no list and no live tab refers to.
 *
 * `playgroundIds` is the set whose active pointers should be treated as
 * off-limits (each playground's current/last workspace is resumable, not
 * orphaned). Pass every playground the caller knows about.
 */
export async function recoverOrphanWorkspaces(
  playgroundIds: readonly string[],
): Promise<OrphanRecovery> {
  if (typeof window === "undefined") return EMPTY;
  const all = await listOpfsWorkspaces();
  if (all.length === 0) return EMPTY;

  const registered = new Set(getWorkspaceRegistry().map((e) => e.id));
  // The workspace each playground would resume is not an orphan, and is very
  // likely open in another tab right now.
  const active = new Set(
    playgroundIds
      .map((id) => peekActiveWorkspaceId(id))
      .filter((id): id is string => !!id),
  );

  const result: OrphanRecovery = { recovered: [], reclaimed: 0, skipped: 0 };
  for (const ws of all) {
    if (registered.has(ws.id) || active.has(ws.id)) continue;
    // A live tab holding the lock is working in it, whatever the lists say.
    if (await isWorkspaceLockHeld(ws.id)) continue;

    if (isWorkspaceDirty(ws.id)) {
      const entry = registerWorkspace({
        id: ws.id,
        name: ws.name,
        playground: ws.playground,
        createdAt: ws.createdAt,
        lastUsedAt: ws.createdAt,
      });
      // `registerWorkspace` stamps lastUsedAt as now, which is right for a
      // save and wrong here: recovering three forgotten drafts would float
      // them above the workspaces the user really has been using, and the
      // /playground index only shows the five most recent. Put the
      // workspace's own timestamp back.
      const dated = { ...entry, lastUsedAt: ws.createdAt || entry.createdAt };
      updateWorkspaceRegistry(
        getWorkspaceRegistry().map((e) => (e.id === dated.id ? dated : e)),
      );
      result.recovered.push(dated);
    } else if (!ws.hasContent) {
      await deleteWorkspace(ws.id);
      result.reclaimed += 1;
    } else {
      result.skipped += 1;
    }
  }
  return result;
}
