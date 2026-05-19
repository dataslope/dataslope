/**
 * Per-playground "active workspace" bootstrap.
 *
 * Each playground (sqlite / postgres / duckdb) needs to resolve a
 * workspace ID before its engine worker spins up, so the engine knows
 * which OPFS directory to persist into. This module provides the small
 * synchronous-ish bridge:
 *
 *   1. Look up the active workspace ID for the playground in
 *      `sessionStorage` (per-tab, so two tabs of the same playground
 *      can independently target different workspaces — required for
 *      Phase 5 multi-tab support).
 *   2. If the stored ID is still in the registry, return it.
 *   3. Otherwise auto-create a default workspace
 *      ("Default <Playground>") and remember its ID in
 *      `sessionStorage`.
 *
 * When OPFS is not supported, the helper still returns a workspace
 * entry so callers have something to wire through to the engine —
 * `createWorkspace` simply records a registry-only entry in that case
 * and the engine falls back to in-memory mode.
 */

import {
  createWorkspace,
  getWorkspaceRegistry,
  openWorkspace,
  type WorkspaceEntry,
} from "./workspace";

const SESSION_KEY_PREFIX = "pg_active_ws_";

const DEFAULT_NAMES: Record<string, string> = {
  sqlite: "Default SQLite Workspace",
  postgres: "Default Postgres Workspace",
  duckdb: "Default DuckDB Workspace",
};

function sessionKey(playgroundId: string): string {
  return `${SESSION_KEY_PREFIX}${playgroundId}`;
}

/** Returns the active workspace ID stored in `sessionStorage` for the
 *  given playground, or `null` when none is set / sessionStorage is
 *  unavailable. */
export function getActiveWorkspaceId(playgroundId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(sessionKey(playgroundId));
  } catch {
    return null;
  }
}

/** Persists the active workspace ID for the given playground into
 *  `sessionStorage`. Silently no-ops outside the browser. */
export function setActiveWorkspaceId(
  playgroundId: string,
  workspaceId: string,
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(sessionKey(playgroundId), workspaceId);
  } catch {
    /* sessionStorage may be unavailable (private mode); ignore. */
  }
}

/**
 * Switches the active workspace for a playground and reloads the page.
 * Uses a reload (rather than tearing down + re-bootstrapping the engine
 * and editor in place) because every workspace switch needs to rebuild
 * the runtime / database state from scratch — a reload is both simpler
 * and indistinguishable from an in-place re-bootstrap from the user's
 * perspective.
 */
export function switchActiveWorkspace(
  playgroundId: string,
  workspaceId: string,
): void {
  setActiveWorkspaceId(playgroundId, workspaceId);
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}

/**
 * Resolve (or create) the active workspace for a playground.
 *
 * Returns the full `WorkspaceEntry` (id, name, createdAt, etc.) so
 * callers can use the id when wiring engines and the name when
 * rendering the workspace switcher.
 */
export async function ensureActiveWorkspace(
  playgroundId: string,
): Promise<WorkspaceEntry> {
  const storedId = getActiveWorkspaceId(playgroundId);
  if (storedId) {
    const registry = getWorkspaceRegistry();
    const entry = registry.find(
      (e) => e.id === storedId && e.playground === playgroundId,
    );
    if (entry) {
      // Touch lastUsedAt and reuse.
      const opened = await openWorkspace(storedId);
      return opened ?? entry;
    }
    // Stale session pointer — fall through to create a fresh one.
  }

  const defaultName = DEFAULT_NAMES[playgroundId] ?? `Default ${playgroundId}`;
  const created = await createWorkspace(defaultName, playgroundId);
  setActiveWorkspaceId(playgroundId, created.id);
  return created;
}
