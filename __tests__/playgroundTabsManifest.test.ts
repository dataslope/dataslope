// Workspace file-manifest persistence (app/_components/playgroundTabs.ts),
// focused on the open-tab list: the tab strip shows a SUBSET of the
// workspace files, so the manifest round-trips which tabs are open and
// loadManifest must sanitize whatever a stale/legacy manifest contains.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  loadManifest,
  saveManifest,
  type PlaygroundFile,
} from "../app/_components/playgroundTabs";

const FILES: PlaygroundFile[] = [
  { id: "a", filename: "main.tsx", pristineFilename: "main.tsx" },
  { id: "b", filename: "App.tsx", pristineFilename: "App.tsx" },
  { id: "c", filename: "styles.css", pristineFilename: "styles.css" },
];

const KEY = "playground_files_react_ws1";

let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("manifest openTabIds", () => {
  it("round-trips the open-tab list", () => {
    saveManifest("react", "ws1", FILES, "b", ["a", "b"]);
    const loaded = loadManifest("react", "ws1");
    expect(loaded?.openTabIds).toEqual(["a", "b"]);
    expect(loaded?.files.map((f) => f.id)).toEqual(["a", "b", "c"]);
    expect(loaded?.activeFileId).toBe("b");
  });

  it("defaults to all files open for legacy manifests without the field", () => {
    store.set(KEY, JSON.stringify({ files: FILES, activeFileId: "a" }));
    const loaded = loadManifest("react", "ws1");
    expect(loaded?.openTabIds).toEqual(["a", "b", "c"]);
  });

  it("drops unknown ids, de-duplicates, and always includes the active file", () => {
    store.set(
      KEY,
      JSON.stringify({
        files: FILES,
        activeFileId: "c",
        openTabIds: ["a", "a", "ghost", 42, "b"],
      }),
    );
    const loaded = loadManifest("react", "ws1");
    expect(loaded?.openTabIds).toEqual(["a", "b", "c"]);
  });

  it("treats an empty open-tab list as all-open", () => {
    store.set(
      KEY,
      JSON.stringify({ files: FILES, activeFileId: "a", openTabIds: [] }),
    );
    expect(loadManifest("react", "ws1")?.openTabIds).toEqual(["a", "b", "c"]);
  });
});
