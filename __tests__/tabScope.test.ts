/**
 * Workspace scoping for the SQL playgrounds' tab keys.
 *
 * The bug being pinned: two workspaces built from the same sample database
 * shared one `..._db_<dbId>_tabs` key, so opening the second showed the
 * first's tabs and editing them there rewrote the first's.
 *
 * The interesting part is the boot ordering. Tabs are read before the async
 * workspace bootstrap resolves, so the scope is a lazy guess from the same
 * pointers the bootstrap consults, corrected afterwards by `setWorkspaceScope`
 * when the bootstrap lands somewhere else.
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

describe("tabsForAdoptedScope", () => {
  const tab = (id: string) => ({
    id,
    title: id,
    code: "",
    pristineCode: "",
  });

  it("does nothing when the scope was already right", async () => {
    const { tabsForAdoptedScope } = await import(TAB_SCOPE);
    expect(
      tabsForAdoptedScope({
        setWorkspaceScope: () => false,
        workspaceId: "ws_1",
        readTabs: () => [tab("t1")],
        readActiveTabId: () => "t1",
      }),
    ).toBeNull();
  });

  it("re-reads the tabs when the bootstrap moved the scope", async () => {
    const { tabsForAdoptedScope } = await import(TAB_SCOPE);
    const adopted = tabsForAdoptedScope({
      setWorkspaceScope: () => true,
      workspaceId: "ws_2",
      readTabs: () => [tab("a"), tab("b")],
      readActiveTabId: () => "b",
    });
    expect(adopted?.tabs.map((t: { id: string }) => t.id)).toEqual(["a", "b"]);
    expect(adopted?.activeTabId).toBe("b");
  });

  it("falls back to the first tab when the remembered one is from elsewhere", async () => {
    const { tabsForAdoptedScope } = await import(TAB_SCOPE);
    const adopted = tabsForAdoptedScope({
      setWorkspaceScope: () => true,
      workspaceId: "ws_2",
      readTabs: () => [tab("a")],
      readActiveTabId: () => "some-other-workspaces-tab",
    });
    expect(adopted?.activeTabId).toBe("a");
  });
});
