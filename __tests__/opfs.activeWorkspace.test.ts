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
 *  reports false (an environment where content can't be persisted). */
function setupStubs(opts: { opfs?: boolean } = {}) {
  const opfs = opts.opfs ?? true;
  local = makeStorageStub();
  session = makeStorageStub();
  const root = makeOpfsRoot();
  vi.stubGlobal(
    "navigator",
    opfs
      ? { storage: { getDirectory: () => Promise.resolve(root) }, locks: undefined }
      : { locks: undefined },
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

  it("is single-use: a second lost-session bootstrap starts a fresh draft", async () => {
    const aw = await import(ACTIVE_WS);
    const ws1 = await aw.ensureActiveWorkspace("sqlite");
    aw.stashActiveWorkspaceForResume("sqlite");

    session.clear();
    const ws2 = await aw.ensureActiveWorkspace("sqlite");
    expect(ws2.id).toBe(ws1.id); // resumed

    session.clear();
    const ws3 = await aw.ensureActiveWorkspace("sqlite");
    expect(ws3.id).not.toBe(ws1.id); // stash already consumed → new draft
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
