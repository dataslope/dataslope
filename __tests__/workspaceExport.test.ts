/**
 * Finding the workspace an export is for.
 *
 * A playground's first workspace is a draft — open, populated, and absent
 * from the registry until Save. Everything that looked a workspace up in
 * the registry alone therefore denied its existence, which for a language
 * whose projects are multi-file by construction meant there was no way to
 * get the files out at all.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const ACTIVE_WS = "../app/_components/opfs/activeWorkspace";

/** localStorage/sessionStorage stand-in, `length`/`key` included: scanning
 *  for a draft has to enumerate keys, not just read known ones. */
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

beforeEach(() => {
  local = makeStorageStub();
  session = makeStorageStub();
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("sessionStorage", session);
  vi.stubGlobal("window", { localStorage: local, sessionStorage: session });
  vi.resetModules();
});

const draft = {
  id: "ws_mt0g7wfu_4yr1c",
  name: "Default java",
  playground: "java",
  createdAt: 1787165540346,
  lastUsedAt: 1787166615670,
};

describe("findWorkspaceEntry", () => {
  it("finds this tab's unsaved draft", async () => {
    session.setItem("playground_draft_ws_java", JSON.stringify(draft));
    const { findWorkspaceEntry } = await import(ACTIVE_WS);
    expect(findWorkspaceEntry(draft.id)).toEqual(draft);
  });

  it("finds a draft resumed from an earlier session", async () => {
    local.setItem("playground_last_draft_ws_java", JSON.stringify(draft));
    const { findWorkspaceEntry } = await import(ACTIVE_WS);
    expect(findWorkspaceEntry(draft.id)).toEqual(draft);
  });

  it("shrugs off a malformed entry rather than throwing", async () => {
    session.setItem("playground_draft_ws_java", "{not json");
    session.setItem("playground_draft_ws_r", JSON.stringify(draft));
    const { findWorkspaceEntry } = await import(ACTIVE_WS);
    expect(findWorkspaceEntry(draft.id)).toEqual(draft);
  });
});
