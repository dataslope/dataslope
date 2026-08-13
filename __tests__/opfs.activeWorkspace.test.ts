/**
 * Unit tests for app/_components/opfs/activeWorkspace.ts — focused on the
 * sign-in resume handoff that keeps a guest's unsaved playground work across
 * signing in / signing up.
 *
 * Uses the in-memory OPFS mock plus per-tab (sessionStorage) and durable
 * (localStorage) storage stubs so the "lost per-tab pointer" scenario can be
 * simulated by clearing sessionStorage while localStorage + OPFS survive.
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

/** `opfs: false` drops `navigator.storage.getDirectory`, so isOpfsSupported()
 *  reports false (an environment where content can't be persisted).
 *  `heldLocks` stands in for the Web Locks API, listing workspace ids another
 *  live tab currently holds. */
function setupStubs(opts: { opfs?: boolean; heldLocks?: string[] } = {}) {
  const opfs = opts.opfs ?? true;
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
  vi.stubGlobal(
    "navigator",
    opfs
      ? { storage: { getDirectory: () => Promise.resolve(root) }, locks }
      : { locks },
  );
  vi.stubGlobal("localStorage", local); // workspace.ts registry uses bare localStorage
  vi.stubGlobal("sessionStorage", session);
  vi.stubGlobal("window", {
    addEventListener: () => {},
    removeEventListener: () => {},
    localStorage: local, // activeWorkspace.ts uses window.localStorage
    sessionStorage: session,
  });
}

/**
 * Forget the durable "workspace this device last opened" pointer, leaving the
 * sign-in stash as the only way back. Stands in for a device that has never
 * opened this playground, or one whose site data was cleared. The tests below
 * that isolate the *stash* need this, because without it the durable resume
 * would answer first and they'd pass for the wrong reason.
 */
function clearDeviceResume(playgroundId: string) {
  local.removeItem(`playground_last_ws_${playgroundId}`);
  local.removeItem(`playground_last_draft_ws_${playgroundId}`);
}

beforeEach(() => {
  setupStubs();
  vi.resetModules();
});

// ---------------------------------------------------------------------------
// Resume handoff
// ---------------------------------------------------------------------------

describe("sign-in resume handoff", () => {
  it("resumes the stashed draft after the per-tab pointer is lost", async () => {
    const aw = await import(ACTIVE_WS);
    const ws1 = await aw.ensureActiveWorkspace("sqlite");
    expect(ws1.saved).toBe(false);

    // User clicks "Sign in": stash, then the auth round trip drops this tab's
    // sessionStorage (fresh tab / re-mounted embed).
    aw.stashActiveWorkspaceForResume("sqlite");
    session.clear();

    const ws2 = await aw.ensureActiveWorkspace("sqlite");
    expect(ws2.id).toBe(ws1.id);
    expect(ws2.saved).toBe(false);
  });

  it("resumes a saved workspace, preserving its saved flag", async () => {
    const aw = await import(ACTIVE_WS);
    const ws1 = await aw.ensureActiveWorkspace("sqlite");
    const saved = aw.saveDraftWorkspace("sqlite", "My Workspace");
    expect(saved?.id).toBe(ws1.id);

    aw.stashActiveWorkspaceForResume("sqlite");
    session.clear();

    const ws2 = await aw.ensureActiveWorkspace("sqlite");
    expect(ws2.id).toBe(ws1.id);
    expect(ws2.saved).toBe(true);
  });

  it("is single-use: the stash cannot resume a second bootstrap", async () => {
    const aw = await import(ACTIVE_WS);
    const ws1 = await aw.ensureActiveWorkspace("sqlite");
    aw.stashActiveWorkspaceForResume("sqlite");

    session.clear();
    const ws2 = await aw.ensureActiveWorkspace("sqlite");
    expect(ws2.id).toBe(ws1.id); // resumed

    session.clear();
    clearDeviceResume("sqlite");
    const ws3 = await aw.ensureActiveWorkspace("sqlite");
    expect(ws3.id).not.toBe(ws1.id); // stash already consumed → new draft
    expect(local.getItem("playground_signin_resume")).toBeNull();
  });

  it("ignores a stash for a different playground", async () => {
    const aw = await import(ACTIVE_WS);
    const sqlite = await aw.ensureActiveWorkspace("sqlite");
    aw.stashActiveWorkspaceForResume("sqlite");
    session.clear();

    // Opening a *different* playground must not adopt sqlite's workspace.
    const python = await aw.ensureActiveWorkspace("python");
    expect(python.id).not.toBe(sqlite.id);
  });

  it("ignores an expired stash", async () => {
    const aw = await import(ACTIVE_WS);
    const ws1 = await aw.ensureActiveWorkspace("sqlite");
    aw.stashActiveWorkspaceForResume("sqlite");

    // Age the stash beyond the 24h TTL.
    const raw = JSON.parse(local.getItem("playground_signin_resume")!);
    raw.ts = Date.now() - 25 * 60 * 60 * 1000;
    local.setItem("playground_signin_resume", JSON.stringify(raw));

    session.clear();
    clearDeviceResume("sqlite");
    const ws2 = await aw.ensureActiveWorkspace("sqlite");
    expect(ws2.id).not.toBe(ws1.id);
  });

  it("does not stash when OPFS is unavailable (nothing to resume)", async () => {
    setupStubs({ opfs: false });
    vi.resetModules();
    const aw = await import(ACTIVE_WS);
    await aw.ensureActiveWorkspace("python");
    aw.stashActiveWorkspaceForResume("python");
    expect(local.getItem("playground_signin_resume")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Resuming the last workspace across sessions
// ---------------------------------------------------------------------------
// The per-tab pointer dies with the tab, so every new tab (and every visit
// after the browser closes) used to mint a fresh draft: a member's saved
// workspace went unselected, and a guest's unsaved database was left in OPFS
// with nothing in the UI pointing at it. `session.clear()` below is that lost
// per-tab pointer; localStorage and OPFS survive it, as they do in a browser.

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

// ---------------------------------------------------------------------------
// Persistence assessment (drives the confirmation dialog)
// ---------------------------------------------------------------------------

describe("guestWorkNeedsSignInWarning", () => {
  it("is false when there is no active workspace", async () => {
    const aw = await import(ACTIVE_WS);
    expect(aw.guestWorkNeedsSignInWarning("python")).toBe(false);
  });

  it("is false when the active workspace can be persisted", async () => {
    const aw = await import(ACTIVE_WS);
    await aw.ensureActiveWorkspace("python");
    expect(aw.canPersistGuestWork()).toBe(true);
    expect(aw.guestWorkNeedsSignInWarning("python")).toBe(false);
  });

  it("is true when the active workspace cannot be persisted (no OPFS)", async () => {
    setupStubs({ opfs: false });
    vi.resetModules();
    const aw = await import(ACTIVE_WS);
    await aw.ensureActiveWorkspace("python");
    expect(aw.canPersistGuestWork()).toBe(false);
    expect(aw.guestWorkNeedsSignInWarning("python")).toBe(true);
  });
});
