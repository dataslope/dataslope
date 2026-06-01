/**
 * Unit tests for app/_components/opfs/workspace.ts
 *
 * Uses an in-memory OPFS mock and a localStorage stub so tests run in Node.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeOpfsRoot } from "./opfsMock";

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

// localStorage stub (simple Map-backed)
const store = new Map<string, string>();
const localStorageStub = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
};

function setupStubs() {
  store.clear();
  const root = makeOpfsRoot();
  vi.stubGlobal("navigator", {
    storage: { getDirectory: () => Promise.resolve(root) },
    locks: undefined, // disable Web Locks in most tests
  });
  vi.stubGlobal("window", { addEventListener: () => {} });
  vi.stubGlobal("localStorage", localStorageStub);
}

beforeEach(() => {
  setupStubs();
  vi.resetModules();
});

// ---------------------------------------------------------------------------
// newWorkspaceId
// ---------------------------------------------------------------------------

describe("newWorkspaceId", () => {
  it("starts with ws_", async () => {
    const { newWorkspaceId } = await import(
      "../app/_components/opfs/workspace"
    );
    expect(newWorkspaceId()).toMatch(/^ws_/);
  });

  it("generates unique IDs", async () => {
    const { newWorkspaceId } = await import(
      "../app/_components/opfs/workspace"
    );
    const ids = new Set(Array.from({ length: 20 }, () => newWorkspaceId()));
    expect(ids.size).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// getWorkspaceRegistry / updateWorkspaceRegistry
// ---------------------------------------------------------------------------

describe("registry", () => {
  it("returns empty array when nothing is stored", async () => {
    const { getWorkspaceRegistry } = await import(
      "../app/_components/opfs/workspace"
    );
    expect(getWorkspaceRegistry()).toEqual([]);
  });

  it("roundtrips entries through localStorage", async () => {
    const { getWorkspaceRegistry, updateWorkspaceRegistry } = await import(
      "../app/_components/opfs/workspace"
    );
    const entry = {
      id: "ws_test",
      name: "Test",
      playground: "sqlite",
      createdAt: 1000,
      lastUsedAt: 1000,
    };
    updateWorkspaceRegistry([entry]);
    expect(getWorkspaceRegistry()).toEqual([entry]);
  });

  it("ignores corrupt JSON", async () => {
    store.set("playground_workspaces", "NOT JSON");
    const { getWorkspaceRegistry } = await import(
      "../app/_components/opfs/workspace"
    );
    expect(getWorkspaceRegistry()).toEqual([]);
  });

  it("filters out invalid entries", async () => {
    store.set(
      "playground_workspaces",
      JSON.stringify([
        { id: "good", name: "G", playground: "py", createdAt: 1, lastUsedAt: 1 },
        { id: 42, name: "bad" }, // missing required fields
      ]),
    );
    const { getWorkspaceRegistry } = await import(
      "../app/_components/opfs/workspace"
    );
    const result = getWorkspaceRegistry();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("good");
  });

  it("migrates the legacy pg_workspaces key forward", async () => {
    // Pre-#409 builds stored the registry under `pg_workspaces`; the
    // current key is `playground_workspaces`. Reading the registry should
    // surface the legacy entries and copy them onto the new key so the
    // migration only happens once.
    store.set(
      "pg_workspaces",
      JSON.stringify([
        { id: "old", name: "Old", playground: "sqlite", createdAt: 2, lastUsedAt: 9 },
        { id: 7, name: "bad" }, // invalid — must be filtered out
      ]),
    );
    const { getWorkspaceRegistry } = await import(
      "../app/_components/opfs/workspace"
    );
    const result = getWorkspaceRegistry();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("old");
    // Migrated forward onto the current key (only the valid entry).
    const migrated = JSON.parse(store.get("playground_workspaces") ?? "[]");
    expect(migrated).toHaveLength(1);
    expect(migrated[0].id).toBe("old");
  });

  it("prefers the current key over the legacy key", async () => {
    store.set(
      "playground_workspaces",
      JSON.stringify([
        { id: "current", name: "C", playground: "duckdb", createdAt: 5, lastUsedAt: 5 },
      ]),
    );
    store.set(
      "pg_workspaces",
      JSON.stringify([
        { id: "stale", name: "S", playground: "sqlite", createdAt: 1, lastUsedAt: 1 },
      ]),
    );
    const { getWorkspaceRegistry } = await import(
      "../app/_components/opfs/workspace"
    );
    const result = getWorkspaceRegistry();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("current");
  });
});

// ---------------------------------------------------------------------------
// createWorkspace
// ---------------------------------------------------------------------------

describe("createWorkspace", () => {
  it("returns a WorkspaceEntry with correct fields", async () => {
    const { createWorkspace } = await import(
      "../app/_components/opfs/workspace"
    );
    const entry = await createWorkspace("My Project", "sqlite");
    expect(entry.id).toMatch(/^ws_/);
    expect(entry.name).toBe("My Project");
    expect(entry.playground).toBe("sqlite");
    expect(typeof entry.createdAt).toBe("number");
    expect(typeof entry.lastUsedAt).toBe("number");
    expect(entry.createdAt).toBe(entry.lastUsedAt);
  });

  it("adds the entry to the registry", async () => {
    const { createWorkspace, getWorkspaceRegistry } = await import(
      "../app/_components/opfs/workspace"
    );
    const entry = await createWorkspace("Proj", "python");
    const registry = getWorkspaceRegistry();
    expect(registry).toHaveLength(1);
    expect(registry[0].id).toBe(entry.id);
  });

  it("accumulates multiple workspaces", async () => {
    const { createWorkspace, getWorkspaceRegistry } = await import(
      "../app/_components/opfs/workspace"
    );
    await createWorkspace("A", "sqlite");
    await createWorkspace("B", "python");
    expect(getWorkspaceRegistry()).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// openWorkspace
// ---------------------------------------------------------------------------

describe("openWorkspace", () => {
  it("returns null for an unknown id", async () => {
    const { openWorkspace } = await import("../app/_components/opfs/workspace");
    expect(await openWorkspace("does_not_exist")).toBeNull();
  });

  it("returns the entry and updates lastUsedAt", async () => {
    const { createWorkspace, openWorkspace } = await import(
      "../app/_components/opfs/workspace"
    );
    const created = await createWorkspace("WS", "javascript");
    // Advance time slightly
    await new Promise((r) => setTimeout(r, 2));
    const opened = await openWorkspace(created.id);
    expect(opened).not.toBeNull();
    expect(opened!.id).toBe(created.id);
    expect(opened!.lastUsedAt).toBeGreaterThanOrEqual(created.lastUsedAt);
  });

  it("persists the updated lastUsedAt in the registry", async () => {
    const { createWorkspace, openWorkspace, getWorkspaceRegistry } =
      await import("../app/_components/opfs/workspace");
    const created = await createWorkspace("WS", "typescript");
    await openWorkspace(created.id);
    const reg = getWorkspaceRegistry();
    expect(reg[0].lastUsedAt).toBeGreaterThanOrEqual(created.lastUsedAt);
  });
});

// ---------------------------------------------------------------------------
// deleteWorkspace
// ---------------------------------------------------------------------------

describe("deleteWorkspace", () => {
  it("removes the entry from the registry", async () => {
    const { createWorkspace, deleteWorkspace, getWorkspaceRegistry } =
      await import("../app/_components/opfs/workspace");
    const ws = await createWorkspace("Delete me", "python");
    await deleteWorkspace(ws.id);
    expect(getWorkspaceRegistry()).toHaveLength(0);
  });

  it("is safe when workspace does not exist", async () => {
    const { deleteWorkspace } = await import("../app/_components/opfs/workspace");
    await expect(deleteWorkspace("nonexistent_id")).resolves.toBeUndefined();
  });

  it("preserves other workspaces", async () => {
    const { createWorkspace, deleteWorkspace, getWorkspaceRegistry } =
      await import("../app/_components/opfs/workspace");
    const a = await createWorkspace("A", "python");
    const b = await createWorkspace("B", "javascript");
    await deleteWorkspace(a.id);
    const registry = getWorkspaceRegistry();
    expect(registry).toHaveLength(1);
    expect(registry[0].id).toBe(b.id);
  });
});

// ---------------------------------------------------------------------------
// acquireWorkspaceLock
// ---------------------------------------------------------------------------

describe("acquireWorkspaceLock", () => {
  it("returns true when Web Locks API is unavailable", async () => {
    vi.stubGlobal("navigator", {
      storage: { getDirectory: () => Promise.resolve(makeOpfsRoot()) },
      locks: undefined,
    });
    const { acquireWorkspaceLock } = await import(
      "../app/_components/opfs/workspace"
    );
    expect(await acquireWorkspaceLock("ws_test")).toBe(true);
  });

  it("returns true when lock is granted", async () => {
    vi.stubGlobal("navigator", {
      storage: { getDirectory: () => Promise.resolve(makeOpfsRoot()) },
      locks: {
        request: (
          _name: string,
          _opts: object,
          cb: (lock: object) => Promise<void>,
        ) => {
          // Simulate granting the lock (lock object is truthy)
          void cb({});
        },
      },
    });
    const { acquireWorkspaceLock } = await import(
      "../app/_components/opfs/workspace"
    );
    expect(await acquireWorkspaceLock("ws_test")).toBe(true);
  });

  it("returns false when lock is already held by another tab", async () => {
    vi.stubGlobal("navigator", {
      storage: { getDirectory: () => Promise.resolve(makeOpfsRoot()) },
      locks: {
        request: (
          _name: string,
          _opts: object,
          cb: (lock: null) => Promise<void>,
        ) => {
          // Simulate lock being unavailable (lock is null)
          void cb(null);
        },
      },
    });
    const { acquireWorkspaceLock } = await import(
      "../app/_components/opfs/workspace"
    );
    expect(await acquireWorkspaceLock("ws_test")).toBe(false);
  });
});
