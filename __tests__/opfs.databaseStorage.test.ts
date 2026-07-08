/**
 * Unit tests for app/_components/opfs/databaseStorage.ts
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

describe("writeDatabase + readDatabase", () => {
  it("writes a Uint8Array and reads it back", async () => {
    const { writeDatabase, readDatabase, flushDatabaseWrites } = await import(
      "../app/_components/opfs/databaseStorage"
    );
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    writeDatabase("ws_1", "sqlite.db", data);
    await flushDatabaseWrites();
    const result = await readDatabase("ws_1", "sqlite.db");
    expect(result).not.toBeNull();
    expect(Array.from(result!)).toEqual([1, 2, 3, 4, 5]);
  });

  it("returns null for a non-existent database", async () => {
    const { readDatabase } = await import(
      "../app/_components/opfs/databaseStorage"
    );
    expect(await readDatabase("ws_missing", "sqlite.db")).toBeNull();
  });

  it("coalesces multiple writes, only the last is persisted", async () => {
    const { writeDatabase, readDatabase, flushDatabaseWrites } = await import(
      "../app/_components/opfs/databaseStorage"
    );
    writeDatabase("ws_1", "sqlite.db", new Uint8Array([10, 20]));
    writeDatabase("ws_1", "sqlite.db", new Uint8Array([30, 40]));
    writeDatabase("ws_1", "sqlite.db", new Uint8Array([50, 60]));
    await flushDatabaseWrites();
    const result = await readDatabase("ws_1", "sqlite.db");
    expect(Array.from(result!)).toEqual([50, 60]);
  });

  it("isolates databases across different workspaces", async () => {
    const { writeDatabase, readDatabase, flushDatabaseWrites } = await import(
      "../app/_components/opfs/databaseStorage"
    );
    const dataA = new Uint8Array([1, 1, 1]);
    const dataB = new Uint8Array([2, 2, 2]);
    writeDatabase("ws_A", "sqlite.db", dataA);
    writeDatabase("ws_B", "sqlite.db", dataB);
    await flushDatabaseWrites();
    expect(Array.from((await readDatabase("ws_A", "sqlite.db"))!)).toEqual([
      1, 1, 1,
    ]);
    expect(Array.from((await readDatabase("ws_B", "sqlite.db"))!)).toEqual([
      2, 2, 2,
    ]);
  });

  it("supports multiple named databases within the same workspace", async () => {
    const { writeDatabase, readDatabase, flushDatabaseWrites } = await import(
      "../app/_components/opfs/databaseStorage"
    );
    writeDatabase("ws_1", "a.db", new Uint8Array([0xaa]));
    writeDatabase("ws_1", "b.db", new Uint8Array([0xbb]));
    await flushDatabaseWrites();
    expect(Array.from((await readDatabase("ws_1", "a.db"))!)).toEqual([0xaa]);
    expect(Array.from((await readDatabase("ws_1", "b.db"))!)).toEqual([0xbb]);
  });
});

describe("OPFS unavailable fallback", () => {
  it("readDatabase returns null when OPFS is not supported", async () => {
    vi.stubGlobal("navigator", {});
    const { readDatabase } = await import(
      "../app/_components/opfs/databaseStorage"
    );
    expect(await readDatabase("ws_1", "sqlite.db")).toBeNull();
  });

  it("writeDatabase + flushDatabaseWrites do not throw when OPFS is not supported", async () => {
    vi.stubGlobal("navigator", {});
    const { writeDatabase, flushDatabaseWrites } = await import(
      "../app/_components/opfs/databaseStorage"
    );
    writeDatabase("ws_1", "sqlite.db", new Uint8Array([1, 2, 3]));
    await expect(flushDatabaseWrites()).resolves.toBeUndefined();
  });
});
