/**
 * "Open a copy" from the workspace-conflict overlay: a workspace runs in one
 * tab at a time (exclusive OPFS access handle), and copying gives the second
 * tab the same data in its own workspace. More than duplicateWorkspace: the
 * source is usually an unsaved draft (absent from the registry), and the tab
 * list lives in localStorage, so it is carried across separately.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeOpfsRoot } from "./opfsMock";

const COPY = "../app/_components/opfs/copyConflictedWorkspace";
const WORKSPACE = "../app/_components/opfs/workspace";
const TAB_SCOPE = "../app/_components/sql/shared/tabScope";

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
  };
}

let local: ReturnType<typeof makeStorageStub>;
let session: ReturnType<typeof makeStorageStub>;
let reloads = 0;

beforeEach(() => {
  local = makeStorageStub();
  session = makeStorageStub();
  reloads = 0;
  const root = makeOpfsRoot();
  vi.stubGlobal("navigator", {
    storage: { getDirectory: () => Promise.resolve(root) },
    locks: undefined,
  });
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("sessionStorage", session);
  vi.stubGlobal("window", {
    addEventListener: () => {},
    removeEventListener: () => {},
    localStorage: local,
    sessionStorage: session,
    // switchActiveWorkspace reloads so the engine boots against the copy.
    location: {
      reload: () => {
        reloads += 1;
      },
    },
  });
  vi.resetModules();
});

async function writeSomething(workspaceId: string, content = "SELECT 1;") {
  const { writeFile, flushFileWrites } = await import(
    "../app/_components/opfs/fileStorage"
  );
  writeFile(workspaceId, "f1", content);
  await flushFileWrites();
}

describe("copyNameFor", () => {
  it("names the copy after the original", async () => {
    const { copyNameFor } = await import(COPY);
    expect(copyNameFor("Default Postgres Workspace")).toBe(
      "Default Postgres Workspace (copy)",
    );
  });

  it("counts up instead of stacking suffixes", async () => {
    const { copyNameFor } = await import(COPY);
    expect(copyNameFor("Sales (copy)")).toBe("Sales (copy 2)");
    expect(copyNameFor("Sales (copy 2)")).toBe("Sales (copy 3)");
  });
});

describe("copyConflictedWorkspace", () => {
  it("copies an unsaved draft, which is the usual conflicted workspace", async () => {
    const { createWorkspace, getWorkspaceRegistry } = await import(WORKSPACE);
    const draft = await createWorkspace("Default Postgres Workspace", "postgres", {
      register: false,
    });
    await writeSomething(draft.id);

    const { copyConflictedWorkspace } = await import(COPY);
    const copy = await copyConflictedWorkspace({
      playgroundId: "postgres",
      sourceId: draft.id,
      sourceName: "Default Postgres Workspace",
    });

    expect(copy).not.toBeNull();
    expect(copy!.id).not.toBe(draft.id);
    expect(copy!.name).toBe("Default Postgres Workspace (copy)");
    // The copy is a workspace in its own right, so it is listed and keepable.
    expect(getWorkspaceRegistry().map((e: { id: string }) => e.id)).toEqual([
      copy!.id,
    ]);
    // And this tab is pointed at it, with a reload to boot the engine there.
    expect(session.getItem("playground_active_ws_postgres")).toBe(copy!.id);
    expect(reloads).toBe(1);
  });

  it("copies the database contents, not just the entry", async () => {
    const { createWorkspace } = await import(WORKSPACE);
    const { readFile } = await import("../app/_components/opfs/fileStorage");
    const draft = await createWorkspace("W", "sqlite", { register: false });
    await writeSomething(draft.id, "CREATE TABLE t (id int);");

    const { copyConflictedWorkspace } = await import(COPY);
    const copy = await copyConflictedWorkspace({
      playgroundId: "sqlite",
      sourceId: draft.id,
    });

    expect(await readFile(copy!.id, "f1")).toBe("CREATE TABLE t (id int);");
  });

  it("carries the tabs across, which live outside the workspace directory", async () => {
    const { createWorkspace } = await import(WORKSPACE);
    const { createTabScope } = await import(TAB_SCOPE);
    const draft = await createWorkspace("W", "postgres", { register: false });
    await writeSomething(draft.id);
    const scope = createTabScope("playground_postgres_", "postgres");
    scope.setWorkspaceScope(draft.id);
    local.setItem(scope.scopedKey("chinook", "tabs"), '[{"id":"t1"}]');
    local.setItem(scope.scopedKey("chinook", "active_tab"), "t1");

    const { copyConflictedWorkspace } = await import(COPY);
    const copy = await copyConflictedWorkspace({
      playgroundId: "postgres",
      sourceId: draft.id,
      copyScopedKeys: scope.copyScopedKeys,
    });

    expect(
      local.getItem(`playground_postgres_ws_${copy!.id}_db_chinook_tabs`),
    ).toBe('[{"id":"t1"}]');
    expect(
      local.getItem(`playground_postgres_ws_${copy!.id}_db_chinook_active_tab`),
    ).toBe("t1");
    // The original is untouched: the other tab is still using it.
    expect(
      local.getItem(`playground_postgres_ws_${draft.id}_db_chinook_tabs`),
    ).toBe('[{"id":"t1"}]');
  });

  it("reports nothing to copy when the workspace's files are gone", async () => {
    const { copyConflictedWorkspace } = await import(COPY);
    expect(
      await copyConflictedWorkspace({
        playgroundId: "postgres",
        sourceId: "ws_missing",
      }),
    ).toBeNull();
    // No navigation on failure, so the overlay can say what happened.
    expect(reloads).toBe(0);
  });
});

describe("copyScopedKeys", () => {
  it("copies nothing when the source and target are the same workspace", async () => {
    const { createTabScope } = await import(TAB_SCOPE);
    const scope = createTabScope("playground_sqlite_", "sqlite");
    scope.setWorkspaceScope("ws_1");
    local.setItem(scope.scopedKey("chinook", "tabs"), "[]");
    expect(scope.copyScopedKeys("ws_1", "ws_1")).toBe(0);
  });

  it("leaves other workspaces' and other playgrounds' keys alone", async () => {
    const { createTabScope } = await import(TAB_SCOPE);
    const scope = createTabScope("playground_sqlite_", "sqlite");
    local.setItem("playground_sqlite_ws_ws_1_db_chinook_tabs", "[1]");
    local.setItem("playground_sqlite_ws_ws_9_db_chinook_tabs", "[9]");
    local.setItem("playground_postgres_ws_ws_1_db_chinook_tabs", "[pg]");

    expect(scope.copyScopedKeys("ws_1", "ws_2")).toBe(1);
    expect(local.getItem("playground_sqlite_ws_ws_2_db_chinook_tabs")).toBe("[1]");
    expect(local.getItem("playground_postgres_ws_ws_2_db_chinook_tabs")).toBeNull();
    expect(local.getItem("playground_sqlite_ws_ws_9_db_chinook_tabs")).toBe("[9]");
  });
});
