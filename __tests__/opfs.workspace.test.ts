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
// getWorkspaceRegistry / updateWorkspaceRegistry
// ---------------------------------------------------------------------------

describe("registry", () => {
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
    // Legacy `pg_workspaces` entries must surface and be copied onto the
    // current key so the migration happens once.
    store.set(
      "pg_workspaces",
      JSON.stringify([
        { id: "old", name: "Old", playground: "sqlite", createdAt: 2, lastUsedAt: 9 },
        { id: 7, name: "bad" }, // invalid, must be filtered out
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
// deleteWorkspace
// ---------------------------------------------------------------------------

describe("deleteWorkspace", () => {
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

/**
 * Minimal Web Locks stub with exclusive, queued requests: a held name waits
 * until the holder releases, or rejects when the request's AbortSignal fires —
 * how the real API surfaces the grace-window timeout and unmount cancellation.
 */
function makeLocksStub() {
  const held = new Set<string>();
  const waiters = new Map<string, Array<() => void>>();

  function request(
    name: string,
    opts: { signal?: AbortSignal },
    cb: (lock: unknown) => Promise<unknown> | unknown,
  ): Promise<unknown> {
    const grant = (): Promise<unknown> => {
      held.add(name);
      return Promise.resolve(cb({})).finally(() => {
        held.delete(name);
        waiters.get(name)?.shift()?.();
      });
    };
    if (!held.has(name)) return grant();
    // Held: queue until release, or reject if this request aborts first.
    return new Promise((resolve, reject) => {
      const onGrant = () => {
        opts.signal?.removeEventListener("abort", onAbort);
        resolve(grant());
      };
      const onAbort = () => {
        const queue = waiters.get(name);
        const i = queue?.indexOf(onGrant) ?? -1;
        if (queue && i >= 0) queue.splice(i, 1);
        reject(new Error("AbortError"));
      };
      if (opts.signal?.aborted) return onAbort();
      opts.signal?.addEventListener("abort", onAbort);
      const queue = waiters.get(name) ?? [];
      queue.push(onGrant);
      waiters.set(name, queue);
    });
  }

  return { request };
}

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

  it("returns false when another live tab holds the lock past the grace window", async () => {
    const locks = makeLocksStub();
    // Another tab holds the lock indefinitely (its callback never settles).
    void locks.request(
      "playground_workspace_ws_test",
      {},
      () => new Promise<void>(() => {}),
    );
    vi.stubGlobal("navigator", {
      storage: { getDirectory: () => Promise.resolve(makeOpfsRoot()) },
      locks,
    });
    const { acquireWorkspaceLock } = await import(
      "../app/_components/opfs/workspace"
    );
    expect(await acquireWorkspaceLock("ws_test", { graceMs: 25 })).toBe(false);
  });

  it("releases the lock when the caller aborts, so a remount can re-acquire", async () => {
    // Regression: back/forward false-conflict — the first mount must hand the
    // lock to the next mount, not hold it for the document's life.
    vi.stubGlobal("navigator", {
      storage: { getDirectory: () => Promise.resolve(makeOpfsRoot()) },
      locks: makeLocksStub(),
    });
    const { acquireWorkspaceLock } = await import(
      "../app/_components/opfs/workspace"
    );

    // First mount acquires and holds the lock.
    const first = new AbortController();
    expect(
      await acquireWorkspaceLock("ws_test", { signal: first.signal }),
    ).toBe(true);

    // Second mount queues behind it; releasing the first (unmount) grants it.
    const second = new AbortController();
    const secondResult = acquireWorkspaceLock("ws_test", {
      signal: second.signal,
      graceMs: 1000,
    });
    first.abort();
    expect(await secondResult).toBe(true);
  });
});
