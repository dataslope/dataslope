/**
 * Tests for app/_components/opfs/activeWorkspace.ts: reopening the workspace
 * this device last used when a new tab has no pointer of its own. The lost
 * per-tab pointer is simulated by clearing sessionStorage while localStorage
 * and OPFS survive.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeOpfsRoot } from "./opfsMock";

const ACTIVE_WS = "../app/_components/opfs/activeWorkspace";

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

function makeStorageStub() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => {
      map.clear();
    },
  };
}

let local: ReturnType<typeof makeStorageStub>;
let session: ReturnType<typeof makeStorageStub>;

/** `heldLocks` stands in for the Web Locks API, listing workspace ids another
 *  live tab currently holds. */
function setupStubs(opts: { heldLocks?: string[] } = {}) {
  local = makeStorageStub();
  session = makeStorageStub();
  const root = makeOpfsRoot();
  const locks = opts.heldLocks
    ? {
        request: () => Promise.resolve(),
        query: () =>
          Promise.resolve({
            held: opts.heldLocks!.map((id) => ({
              name: `playground_workspace_${id}`,
            })),
          }),
      }
    : undefined;
  vi.stubGlobal("navigator", {
    storage: { getDirectory: () => Promise.resolve(root) },
    locks,
  });
  vi.stubGlobal("localStorage", local); // workspace.ts registry uses bare localStorage
  vi.stubGlobal("sessionStorage", session);
  vi.stubGlobal("window", {
    addEventListener: () => {},
    removeEventListener: () => {},
    localStorage: local, // activeWorkspace.ts uses window.localStorage
    sessionStorage: session,
  });
}

beforeEach(() => {
  setupStubs();
  vi.resetModules();
});

// ---------------------------------------------------------------------------
// Resuming the last workspace across sessions
// ---------------------------------------------------------------------------
// The per-tab pointer dies with the tab, so every new tab used to mint a
// fresh draft, orphaning saved workspaces and guests' unsaved databases.
// session.clear() below is that lost pointer; localStorage and OPFS survive.

describe("resuming the last workspace", () => {
  it("reopens a saved workspace in a new session", async () => {
    const aw = await import(ACTIVE_WS);
    const ws1 = await aw.ensureActiveWorkspace("sqlite");
    const saved = aw.saveDraftWorkspace("sqlite", "My Workspace");
    expect(saved?.id).toBe(ws1.id);

    session.clear();
    const ws2 = await aw.ensureActiveWorkspace("sqlite");
    expect(ws2.id).toBe(ws1.id);
    expect(ws2.saved).toBe(true);
    expect(ws2.name).toBe("My Workspace");
  });

  it("reopens an unsaved draft, where a guest's work lives", async () => {
    const aw = await import(ACTIVE_WS);
    const ws1 = await aw.ensureActiveWorkspace("sqlite");
    expect(ws1.saved).toBe(false);

    session.clear();
    const ws2 = await aw.ensureActiveWorkspace("sqlite");
    expect(ws2.id).toBe(ws1.id);
    expect(ws2.saved).toBe(false);
    // Re-adopted as *this* tab's draft, so Save still offers to keep it.
    expect(session.getItem("playground_draft_ws_sqlite")).toContain(ws1.id);
  });

  it("survives repeated sessions", async () => {
    const aw = await import(ACTIVE_WS);
    const ws1 = await aw.ensureActiveWorkspace("sqlite");
    for (let i = 0; i < 3; i += 1) {
      session.clear();
      expect((await aw.ensureActiveWorkspace("sqlite")).id).toBe(ws1.id);
    }
  });

  it("leaves a workspace another tab holds alone, and drafts a new one", async () => {
    const aw = await import(ACTIVE_WS);
    const ws1 = await aw.ensureActiveWorkspace("sqlite");

    // A second tab opens while the first still holds the workspace lock.
    setupStubs({ heldLocks: [ws1.id] });
    local.setItem("playground_last_ws_sqlite", ws1.id);
    vi.resetModules();
    const aw2 = await import(ACTIVE_WS);
    const ws2 = await aw2.ensureActiveWorkspace("sqlite");
    expect(ws2.id).not.toBe(ws1.id);
  });

  it("starts fresh when the remembered workspace's content is gone", async () => {
    const aw = await import(ACTIVE_WS);
    const ws1 = await aw.ensureActiveWorkspace("sqlite");

    // The registry never held this draft, and its OPFS directory is gone
    // (cleared site data, evicted storage), so there is nothing to reopen.
    const { deleteWorkspace } = await import("../app/_components/opfs/workspace");
    await deleteWorkspace(ws1.id);

    session.clear();
    const ws2 = await aw.ensureActiveWorkspace("sqlite");
    expect(ws2.id).not.toBe(ws1.id);
  });

  it("keeps each playground's last workspace separate", async () => {
    const aw = await import(ACTIVE_WS);
    const sqlite = await aw.ensureActiveWorkspace("sqlite");
    const python = await aw.ensureActiveWorkspace("python");
    expect(python.id).not.toBe(sqlite.id);

    session.clear();
    expect((await aw.ensureActiveWorkspace("sqlite")).id).toBe(sqlite.id);
    expect((await aw.ensureActiveWorkspace("python")).id).toBe(python.id);
  });
});
