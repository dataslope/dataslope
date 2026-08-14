/**
 * Recovering workspaces that exist in OPFS but in no list: drafts stay out of
 * the registry until saved, so a draft the session pointer dropped was
 * unreachable with its contents still on disk. Hardest-pinned rule: what the
 * pass refuses to delete — only code playgrounds set the dirty latch, so a
 * SQL draft always looks unchanged even when it holds a hand-built database.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeOpfsRoot } from "./opfsMock";

const ORPHANS = "../app/_components/opfs/orphanWorkspaces";
const WORKSPACE = "../app/_components/opfs/workspace";

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

function setupStubs() {
  local = makeStorageStub();
  session = makeStorageStub();
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
  });
}

beforeEach(() => {
  setupStubs();
  vi.resetModules();
});

/** A draft: OPFS-backed, absent from the registry. */
async function makeDraft(name: string, playground: string) {
  const { createWorkspace } = await import(WORKSPACE);
  return createWorkspace(name, playground, { register: false });
}

/** Give a workspace a stored file, so it isn't an empty shell. */
async function writeSomething(workspaceId: string) {
  const { writeFile, flushFileWrites } = await import(
    "../app/_components/opfs/fileStorage"
  );
  writeFile(workspaceId, "f1", "print('hi')");
  await flushFileWrites();
}

describe("recoverOrphanWorkspaces", () => {
  it("registers a changed draft, so every list can show it", async () => {
    const { markWorkspaceDirty } = await import(
      "../app/_components/opfs/activeWorkspace"
    );
    const { getWorkspaceRegistry } = await import(WORKSPACE);
    const draft = await makeDraft("Default Python Workspace", "python");
    await writeSomething(draft.id);
    markWorkspaceDirty(draft.id);
    expect(getWorkspaceRegistry()).toHaveLength(0);

    const { recoverOrphanWorkspaces } = await import(ORPHANS);
    const result = await recoverOrphanWorkspaces(["python"]);

    expect(result.recovered.map((e: { id: string }) => e.id)).toEqual([draft.id]);
    const registry = getWorkspaceRegistry();
    expect(registry).toHaveLength(1);
    expect(registry[0].name).toBe("Default Python Workspace");
    expect(registry[0].playground).toBe("python");
    // Recovered, not just used: it keeps its own timestamp instead of
    // floating to the top of the "recent workspaces" list.
    expect(registry[0].lastUsedAt).toBe(draft.createdAt);
  });

  it("deletes an empty shell", async () => {
    const { workspaceExistsInOpfs } = await import(WORKSPACE);
    const draft = await makeDraft("Default R Workspace", "r");

    const { recoverOrphanWorkspaces } = await import(ORPHANS);
    const result = await recoverOrphanWorkspaces(["r"]);

    expect(result.reclaimed).toBe(1);
    expect(await workspaceExistsInOpfs(draft.id)).toBe(false);
  });

  it("leaves an unchanged draft that holds content alone", async () => {
    // A SQL draft: never marked dirty (only code playgrounds set the latch),
    // but its database is real work.
    const { workspaceExistsInOpfs, getWorkspaceRegistry } = await import(
      WORKSPACE
    );
    const draft = await makeDraft("Default Postgres Workspace", "postgres");
    await writeSomething(draft.id);

    const { recoverOrphanWorkspaces } = await import(ORPHANS);
    const result = await recoverOrphanWorkspaces(["postgres"]);

    expect(result).toMatchObject({ reclaimed: 0, skipped: 1 });
    expect(result.recovered).toHaveLength(0);
    expect(await workspaceExistsInOpfs(draft.id)).toBe(true);
    expect(getWorkspaceRegistry()).toHaveLength(0);
  });

  it("ignores the workspace a playground would resume", async () => {
    const { markWorkspaceDirty, setActiveWorkspaceId } = await import(
      "../app/_components/opfs/activeWorkspace"
    );
    const { getWorkspaceRegistry } = await import(WORKSPACE);
    const draft = await makeDraft("Default Python Workspace", "python");
    await writeSomething(draft.id);
    markWorkspaceDirty(draft.id);
    // This is the live draft, not an orphan: it stays a draft so its Save
    // affordance keeps working.
    setActiveWorkspaceId("python", draft.id);

    const { recoverOrphanWorkspaces } = await import(ORPHANS);
    const result = await recoverOrphanWorkspaces(["python"]);

    expect(result.recovered).toHaveLength(0);
    expect(getWorkspaceRegistry()).toHaveLength(0);
  });

  it("ignores workspaces that are already registered", async () => {
    const { createWorkspace, getWorkspaceRegistry } = await import(WORKSPACE);
    const saved = await createWorkspace("Saved", "javascript");
    await writeSomething(saved.id);

    const { recoverOrphanWorkspaces } = await import(ORPHANS);
    const result = await recoverOrphanWorkspaces(["javascript"]);

    expect(result).toMatchObject({ reclaimed: 0, skipped: 0 });
    expect(getWorkspaceRegistry()).toHaveLength(1);
  });

  it("does nothing when OPFS holds no workspaces", async () => {
    const { recoverOrphanWorkspaces } = await import(ORPHANS);
    expect(await recoverOrphanWorkspaces(["python"])).toMatchObject({
      reclaimed: 0,
      skipped: 0,
    });
  });
});

describe("listOpfsWorkspaces", () => {
  it("reports drafts and saved workspaces alike, with their content flag", async () => {
    const { createWorkspace, listOpfsWorkspaces } = await import(WORKSPACE);
    const saved = await createWorkspace("Saved", "python");
    const draft = await createWorkspace("Draft", "python", { register: false });
    await writeSomething(draft.id);

    const listed: { id: string; name: string; hasContent: boolean }[] =
      await listOpfsWorkspaces();
    const byId = new Map(listed.map((w) => [w.id, w] as const));
    expect(byId.get(saved.id)?.hasContent).toBe(false);
    expect(byId.get(draft.id)?.hasContent).toBe(true);
    expect(byId.get(draft.id)?.name).toBe("Draft");
  });
});
