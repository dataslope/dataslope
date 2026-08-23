/**
 * Export paths that used to disagree with each other.
 *
 * A playground's first workspace is a draft — open, populated, and absent
 * from the registry until Save. Everything that looked a workspace up in
 * the registry alone therefore denied its existence, which for a language
 * whose projects are multi-file by construction meant there was no way to
 * get the files out at all.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { mimeTypeForFilename } from "../app/_components/exportMime";
import type { ExportFormat, LanguageAdapter } from "../app/_components/types";

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
  it("finds a saved workspace", async () => {
    const saved = { ...draft, id: "ws_saved" };
    local.setItem("playground_workspaces", JSON.stringify([saved]));
    const { findWorkspaceEntry } = await import(ACTIVE_WS);
    expect(findWorkspaceEntry("ws_saved")).toEqual(saved);
  });

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

  it("does not confuse one playground's draft with another's", async () => {
    session.setItem("playground_draft_ws_c", JSON.stringify(draft));
    session.setItem(
      "playground_draft_ws_java",
      JSON.stringify({ ...draft, id: "ws_java" }),
    );
    const { findWorkspaceEntry } = await import(ACTIVE_WS);
    expect(findWorkspaceEntry("ws_java")?.id).toBe("ws_java");
  });

  it("is null for an id nothing knows about", async () => {
    const { findWorkspaceEntry } = await import(ACTIVE_WS);
    expect(findWorkspaceEntry("ws_nowhere")).toBeNull();
  });

  it("shrugs off a malformed entry rather than throwing", async () => {
    session.setItem("playground_draft_ws_java", "{not json");
    session.setItem("playground_draft_ws_r", JSON.stringify(draft));
    const { findWorkspaceEntry } = await import(ACTIVE_WS);
    expect(findWorkspaceEntry(draft.id)).toEqual(draft);
  });
});

describe("mimeTypeForFilename", () => {
  function adapterWith(
    exportFormats: ExportFormat[],
    exportFormatsForFile?: (filename: string) => ExportFormat[] | undefined,
  ) {
    return { exportFormats, exportFormatsForFile } as LanguageAdapter;
  }

  const java = adapterWith([
    {
      extension: "java",
      label: "Java source (.java)",
      mimeType: "text/x-java-source",
    },
  ]);

  it("gives the Files rail the type the Export menu gives", () => {
    expect(mimeTypeForFilename(java, "Main.java")).toBe("text/x-java-source");
  });

  it("matches the extension case-insensitively", () => {
    expect(mimeTypeForFilename(java, "Main.JAVA")).toBe("text/x-java-source");
  });

  it("falls back to plain text for a file the adapter has no format for", () => {
    expect(mimeTypeForFilename(java, "stdin.txt")).toBe("text/plain");
    expect(mimeTypeForFilename(java, "README")).toBe("text/plain");
  });

  it("prefers the per-file formats of a mixed-language workspace", () => {
    const web = adapterWith(
      [{ extension: "html", label: "HTML", mimeType: "text/html" }],
      (filename) =>
        filename.endsWith(".css")
          ? [{ extension: "css", label: "CSS", mimeType: "text/css" }]
          : undefined,
    );
    expect(mimeTypeForFilename(web, "styles.css")).toBe("text/css");
    expect(mimeTypeForFilename(web, "index.html")).toBe("text/html");
  });
});
