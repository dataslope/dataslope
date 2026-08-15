"use client";

/**
 * Recovers workspaces that exist in OPFS but in no list (drafts the session
 * pointer no longer reaches): a changed draft is registered, a literally
 * empty directory is deleted, anything else is left alone. That last rule
 * matters — the dirty latch is only set by code playgrounds, so a SQL draft
 * always looks unchanged even when it holds a hand-built database; deleting
 * on "not changed" would throw it away.
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
 * Sweeps once, touching only directories no list and no live tab refers to.
 * `playgroundIds`: every playground whose active pointer is off-limits
 * (resumable, not orphaned) — pass all the caller knows about.
 */
export async function recoverOrphanWorkspaces(
  playgroundIds: readonly string[],
): Promise<OrphanRecovery> {
  if (typeof window === "undefined") return EMPTY;
  const all = await listOpfsWorkspaces();
  if (all.length === 0) return EMPTY;

  const registered = new Set(getWorkspaceRegistry().map((e) => e.id));
  // The workspace each playground would resume is not an orphan.
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
      // `registerWorkspace` stamps lastUsedAt as now, which would float
      // forgotten drafts above genuinely recent workspaces; restore the
      // workspace's own timestamp.
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
