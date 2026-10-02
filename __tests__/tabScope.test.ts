/**
 * Workspace scoping for the SQL playgrounds' tab keys. Bug pinned: two
 * workspaces built from the same sample database shared one tabs key, so one
 * rewrote the other's. Boot ordering matters: tabs are read before the async
 * workspace bootstrap resolves, so the scope is a lazy guess corrected by
 * setWorkspaceScope when the bootstrap lands somewhere else.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const TAB_SCOPE = "../app/_components/sql/shared/tabScope";
const PREFIX = "playground_postgres_";

/** Storage stub with the parts of the Storage API the migration walks
 *  (`length` / `key(i)`), not just get/set. */
function makeStorageStub() {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    snapshot: () => Object.fromEntries(map),
  };
}

let local: ReturnType<typeof makeStorageStub>;
let session: ReturnType<typeof makeStorageStub>;

function setupStubs() {
  local = makeStorageStub();
  session = makeStorageStub();
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("sessionStorage", session);
  vi.stubGlobal("navigator", { locks: undefined });
  vi.stubGlobal("window", { localStorage: local, sessionStorage: session });
}

beforeEach(() => {
  setupStubs();
  vi.resetModules();
});

describe("createTabScope", () => {
  it("scopes keys to the workspace this tab points at", async () => {
    session.setItem("playground_active_ws_postgres", "ws_1");
    const { createTabScope } = await import(TAB_SCOPE);
    const scope = createTabScope(PREFIX, "postgres");
    expect(scope.scopedKey("chinook", "tabs")).toBe(
      "playground_postgres_ws_ws_1_db_chinook_tabs",
    );
  });

  it("gives two workspaces on one sample database separate keys", async () => {
    const { createTabScope } = await import(TAB_SCOPE);
    const first = createTabScope(PREFIX, "postgres");
    first.setWorkspaceScope("ws_1");
    const second = createTabScope(PREFIX, "postgres");
    second.setWorkspaceScope("ws_2");
    expect(first.scopedKey("chinook", "tabs")).not.toBe(
      second.scopedKey("chinook", "tabs"),
    );
  });

  it("falls back to the pre-scoping key until a workspace is known", async () => {
    const { createTabScope } = await import(TAB_SCOPE);
    const scope = createTabScope(PREFIX, "postgres");
    expect(scope.scopedKey("chinook", "tabs")).toBe(
      "playground_postgres_db_chinook_tabs",
    );
  });

  it("reports whether the bootstrap moved the scope", async () => {
    session.setItem("playground_active_ws_postgres", "ws_1");
    const { createTabScope } = await import(TAB_SCOPE);
    const scope = createTabScope(PREFIX, "postgres");
    // The bootstrap resolved the workspace this tab already pointed at.
    expect(scope.setWorkspaceScope("ws_1")).toBe(false);
    // It resolved a different one (a fresh draft, or another tab held ws_1).
    expect(scope.setWorkspaceScope("ws_2")).toBe(true);
    expect(scope.scopedKey("chinook", "tabs")).toContain("ws_ws_2");
  });

  it("resumes the workspace this device last used, not just this tab", async () => {
    local.setItem("playground_last_ws_postgres", "ws_7");
    const { createTabScope } = await import(TAB_SCOPE);
    const scope = createTabScope(PREFIX, "postgres");
    expect(scope.scopedKey("chinook", "tabs")).toContain("ws_ws_7");
  });
});

describe("migrating pre-scoping keys", () => {
  it("copies them under the first workspace resolved, keeping the originals", async () => {
    local.setItem("playground_postgres_db_chinook_tabs", '[{"id":"t1"}]');
    local.setItem("playground_postgres_db_chinook_active_tab", "t1");
    // Another playground's keys, and a non-database key, must not move.
    local.setItem("playground_sqlite_db_chinook_tabs", "[]");
    local.setItem("playground_postgres_fontsize", "14");

    const { createTabScope } = await import(TAB_SCOPE);
    createTabScope(PREFIX, "postgres").setWorkspaceScope("ws_1");

    expect(local.getItem("playground_postgres_ws_ws_1_db_chinook_tabs")).toBe(
      '[{"id":"t1"}]',
    );
    expect(
      local.getItem("playground_postgres_ws_ws_1_db_chinook_active_tab"),
    ).toBe("t1");
    // Left in place, so rolling the change back loses nothing.
    expect(local.getItem("playground_postgres_db_chinook_tabs")).toBe(
      '[{"id":"t1"}]',
    );
    expect(local.getItem("playground_sqlite_ws_ws_1_db_chinook_tabs")).toBeNull();
    expect(local.getItem("playground_postgres_ws_ws_1_fontsize")).toBeNull();
  });

  it("runs once, so a second workspace doesn't inherit the first's tabs", async () => {
    local.setItem("playground_postgres_db_chinook_tabs", '[{"id":"t1"}]');
    const { createTabScope } = await import(TAB_SCOPE);
    createTabScope(PREFIX, "postgres").setWorkspaceScope("ws_1");
    createTabScope(PREFIX, "postgres").setWorkspaceScope("ws_2");

    expect(local.getItem("playground_postgres_ws_ws_1_db_chinook_tabs")).toBe(
      '[{"id":"t1"}]',
    );
    expect(
      local.getItem("playground_postgres_ws_ws_2_db_chinook_tabs"),
    ).toBeNull();
  });
});

describe("the database a workspace holds", () => {
  it("is recorded per workspace, not once for the whole device", async () => {
    const { createTabScope } = await import(TAB_SCOPE);
    const scope = createTabScope(PREFIX, "postgres");
    scope.setWorkspaceScope("ws_1");
    scope.writeActiveDbId("chinook");
    scope.setWorkspaceScope("ws_2");
    scope.writeActiveDbId("northwind");

    scope.setWorkspaceScope("ws_1");
    expect(scope.readActiveDbId()).toBe("chinook");
    scope.setWorkspaceScope("ws_2");
    expect(scope.readActiveDbId()).toBe("northwind");
  });

  it("falls back to the device-wide id for a workspace with no record", async () => {
    // Every workspace opened before the scoping, and every new one.
    local.setItem("playground_postgres_db", "chinook");
    const { createTabScope } = await import(TAB_SCOPE);
    const scope = createTabScope(PREFIX, "postgres");
    scope.setWorkspaceScope("ws_old");
    expect(scope.readActiveDbId()).toBe("chinook");
  });

  it("can be recorded for a workspace other than the active one", async () => {
    // "Open in new workspace": the choice belongs to the workspace about to
    // open, and must not move the one this tab is leaving.
    const { createTabScope } = await import(TAB_SCOPE);
    const scope = createTabScope(PREFIX, "postgres");
    scope.setWorkspaceScope("ws_1");
    scope.writeActiveDbId("chinook");
    scope.writeActiveDbId("__blank__", "ws_new");

    expect(scope.readActiveDbId()).toBe("chinook");
    scope.setWorkspaceScope("ws_new");
    expect(scope.readActiveDbId()).toBe("__blank__");
  });

  it("travels with a workspace's other keys when it is copied", async () => {
    const { createTabScope } = await import(TAB_SCOPE);
    const scope = createTabScope(PREFIX, "postgres");
    scope.writeActiveDbId("chinook", "ws_1");
    scope.copyScopedKeys("ws_1", "ws_copy");
    expect(local.getItem("playground_postgres_ws_ws_copy_active_db")).toBe(
      "chinook",
    );
  });
});

describe("stateForAdoptedWorkspace", () => {
  const tab = (id: string) => ({
    id,
    title: id,
    code: "",
    pristineCode: "",
  });

  it("does nothing when the guessed workspace and database were right", async () => {
    const { stateForAdoptedWorkspace } = await import(TAB_SCOPE);
    expect(
      stateForAdoptedWorkspace({
        setWorkspaceScope: () => false,
        workspaceId: "ws_1",
        currentDbId: "chinook",
        readDbId: () => "chinook",
        readTabs: () => [tab("t1")],
        readActiveTabId: () => "t1",
      }),
    ).toBeNull();
  });

  it("re-reads the tabs when the bootstrap moved the scope", async () => {
    const { stateForAdoptedWorkspace } = await import(TAB_SCOPE);
    const adopted = stateForAdoptedWorkspace({
      setWorkspaceScope: () => true,
      workspaceId: "ws_2",
      currentDbId: "chinook",
      readDbId: () => "chinook",
      readTabs: () => [tab("a"), tab("b")],
      readActiveTabId: () => "b",
    });
    expect(adopted?.dbId).toBe("chinook");
    expect(adopted?.tabs.map((t: { id: string }) => t.id)).toEqual(["a", "b"]);
    expect(adopted?.activeTabId).toBe("b");
  });

  it("re-reads the tabs for the workspace's own database", async () => {
    // Same workspace, but the tabs on screen were read for the database
    // last chosen elsewhere: they belong to a database this one does not hold.
    const { stateForAdoptedWorkspace } = await import(TAB_SCOPE);
    const readFor: string[] = [];
    const adopted = stateForAdoptedWorkspace({
      setWorkspaceScope: () => false,
      workspaceId: "ws_1",
      currentDbId: "northwind",
      readDbId: () => "__blank__",
      readTabs: (dbId: string) => {
        readFor.push(dbId);
        return [tab("q1")];
      },
      readActiveTabId: () => null,
    });
    expect(readFor).toEqual(["__blank__"]);
    expect(adopted?.dbId).toBe("__blank__");
    expect(adopted?.activeTabId).toBe("q1");
  });

  it("reads the database under the adopted scope, not the guessed one", async () => {
    const { createTabScope, stateForAdoptedWorkspace } = await import(TAB_SCOPE);
    session.setItem("playground_active_ws_postgres", "ws_guess");
    const scope = createTabScope(PREFIX, "postgres");
    scope.writeActiveDbId("northwind", "ws_guess");
    scope.writeActiveDbId("chinook", "ws_real");
    expect(scope.readActiveDbId()).toBe("northwind");

    const adopted = stateForAdoptedWorkspace({
      setWorkspaceScope: scope.setWorkspaceScope,
      workspaceId: "ws_real",
      currentDbId: "northwind",
      readDbId: () => scope.readActiveDbId() ?? "",
      readTabs: () => [tab("a")],
      readActiveTabId: () => null,
    });
    expect(adopted?.dbId).toBe("chinook");
  });

  it("falls back to the first tab when the remembered one is from elsewhere", async () => {
    const { stateForAdoptedWorkspace } = await import(TAB_SCOPE);
    const adopted = stateForAdoptedWorkspace({
      setWorkspaceScope: () => true,
      workspaceId: "ws_2",
      currentDbId: "chinook",
      readDbId: () => "chinook",
      readTabs: () => [tab("a")],
      readActiveTabId: () => "some-other-workspaces-tab",
    });
    expect(adopted?.activeTabId).toBe("a");
  });
});
