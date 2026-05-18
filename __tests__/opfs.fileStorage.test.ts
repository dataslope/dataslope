/**
 * Unit tests for app/_components/opfs/fileStorage.ts
 *
 * Uses an in-memory OPFS mock so tests run in Node.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeOpfsRoot } from "./opfsMock";

function setupStubs() {
  const root = makeOpfsRoot();
  vi.stubGlobal("navigator", {
    storage: { getDirectory: () => Promise.resolve(root) },
  });
  vi.stubGlobal("window", { addEventListener: () => {} });
}

beforeEach(() => {
  setupStubs();
  vi.resetModules();
});

describe("writeFile + readFile", () => {
  it("writes a file and reads back the same content", async () => {
    const { writeFile, readFile, flushFileWrites } = await import(
      "../app/_components/opfs/fileStorage"
    );
    writeFile("ws_1", "file_a", "hello world");
    await flushFileWrites();
    const result = await readFile("ws_1", "file_a");
    expect(result).toBe("hello world");
  });

  it("returns null for a non-existent file", async () => {
    const { readFile } = await import("../app/_components/opfs/fileStorage");
    expect(await readFile("ws_missing", "no_file")).toBeNull();
  });

  it("overwrites with the latest write when called multiple times for same key", async () => {
    const { writeFile, readFile, flushFileWrites } = await import(
      "../app/_components/opfs/fileStorage"
    );
    writeFile("ws_1", "file_b", "first");
    writeFile("ws_1", "file_b", "second");
    writeFile("ws_1", "file_b", "third");
    await flushFileWrites();
    expect(await readFile("ws_1", "file_b")).toBe("third");
  });

  it("handles empty string content", async () => {
    const { writeFile, readFile, flushFileWrites } = await import(
      "../app/_components/opfs/fileStorage"
    );
    writeFile("ws_1", "empty", "");
    await flushFileWrites();
    expect(await readFile("ws_1", "empty")).toBe("");
  });

  it("isolates files across different workspaces", async () => {
    const { writeFile, readFile, flushFileWrites } = await import(
      "../app/_components/opfs/fileStorage"
    );
    writeFile("ws_A", "shared_name", "content A");
    writeFile("ws_B", "shared_name", "content B");
    await flushFileWrites();
    expect(await readFile("ws_A", "shared_name")).toBe("content A");
    expect(await readFile("ws_B", "shared_name")).toBe("content B");
  });
});

describe("deleteFile", () => {
  it("removes a file so it is no longer readable", async () => {
    const { writeFile, readFile, deleteFile, flushFileWrites } = await import(
      "../app/_components/opfs/fileStorage"
    );
    writeFile("ws_1", "del_me", "data");
    await flushFileWrites();
    await deleteFile("ws_1", "del_me");
    expect(await readFile("ws_1", "del_me")).toBeNull();
  });

  it("cancels a pending write for the same key", async () => {
    const { writeFile, readFile, deleteFile, flushFileWrites } = await import(
      "../app/_components/opfs/fileStorage"
    );
    // Queue a write then immediately delete — the write should be cancelled.
    writeFile("ws_1", "cancel_me", "should not appear");
    await deleteFile("ws_1", "cancel_me");
    await flushFileWrites();
    expect(await readFile("ws_1", "cancel_me")).toBeNull();
  });

  it("is safe when file does not exist", async () => {
    const { deleteFile } = await import("../app/_components/opfs/fileStorage");
    await expect(deleteFile("ws_ghost", "ghost_file")).resolves.toBeUndefined();
  });
});

describe("listFiles", () => {
  it("returns an empty array for a new workspace", async () => {
    const { listFiles } = await import("../app/_components/opfs/fileStorage");
    expect(await listFiles("ws_empty")).toEqual([]);
  });

  it("returns names of written files after flush", async () => {
    const { writeFile, listFiles, flushFileWrites } = await import(
      "../app/_components/opfs/fileStorage"
    );
    writeFile("ws_list", "f1.py", "a");
    writeFile("ws_list", "f2.py", "b");
    await flushFileWrites();
    const files = await listFiles("ws_list");
    expect(files).toHaveLength(2);
    expect(files).toContain("f1.py");
    expect(files).toContain("f2.py");
  });
});

describe("OPFS unavailable fallback", () => {
  it("readFile returns null when OPFS is not supported", async () => {
    vi.stubGlobal("navigator", {}); // no storage.getDirectory
    const { readFile } = await import("../app/_components/opfs/fileStorage");
    expect(await readFile("ws_1", "file_a")).toBeNull();
  });

  it("writeFile + flushFileWrites do not throw when OPFS is not supported", async () => {
    vi.stubGlobal("navigator", {});
    const { writeFile, flushFileWrites } = await import(
      "../app/_components/opfs/fileStorage"
    );
    writeFile("ws_1", "file_a", "content");
    await expect(flushFileWrites()).resolves.toBeUndefined();
  });
});
