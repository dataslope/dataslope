/**
 * Unit tests for app/_components/opfs/featureDetect.ts
 *
 * Runs in Node (no real browser APIs). We test the detection functions by
 * manipulating global stubs before each case.
 */

import { describe, it, expect, vi } from "vitest";

// Reset module between groups so the module-level globals are re-evaluated.
// We import after setting up stubs in each test instead.

describe("isOpfsSupported", () => {
  it("returns false when navigator is undefined", async () => {
    vi.stubGlobal("navigator", undefined);
    const { isOpfsSupported } = await import("../app/_components/opfs/featureDetect");
    expect(isOpfsSupported()).toBe(false);
  });

  it("returns false when navigator.storage.getDirectory is not a function", async () => {
    vi.stubGlobal("navigator", { storage: { getDirectory: "not-a-function" } });
    const { isOpfsSupported } = await import("../app/_components/opfs/featureDetect");
    expect(isOpfsSupported()).toBe(false);
  });

  it("returns true when navigator.storage.getDirectory is a function", async () => {
    vi.stubGlobal("navigator", {
      storage: { getDirectory: () => Promise.resolve({}) },
    });
    const { isOpfsSupported } = await import("../app/_components/opfs/featureDetect");
    expect(isOpfsSupported()).toBe(true);
  });
});

describe("hasSyncAccessHandles", () => {
  it("returns false when FileSystemFileHandle is undefined", async () => {
    vi.stubGlobal("FileSystemFileHandle", undefined);
    const { hasSyncAccessHandles } = await import(
      "../app/_components/opfs/featureDetect"
    );
    expect(hasSyncAccessHandles()).toBe(false);
  });

  it("returns true when createSyncAccessHandle exists on prototype", async () => {
    class FakeHandle {}
    (FakeHandle.prototype as Record<string, unknown>).createSyncAccessHandle =
      () => {};
    vi.stubGlobal("FileSystemFileHandle", FakeHandle);
    const { hasSyncAccessHandles } = await import(
      "../app/_components/opfs/featureDetect"
    );
    expect(hasSyncAccessHandles()).toBe(true);
  });

  it("returns false when createSyncAccessHandle is absent", async () => {
    class FakeHandle {}
    vi.stubGlobal("FileSystemFileHandle", FakeHandle);
    const { hasSyncAccessHandles } = await import(
      "../app/_components/opfs/featureDetect"
    );
    expect(hasSyncAccessHandles()).toBe(false);
  });
});

describe("hasWebLocks", () => {
  it("returns false when navigator is undefined", async () => {
    vi.stubGlobal("navigator", undefined);
    const { hasWebLocks } = await import("../app/_components/opfs/featureDetect");
    expect(hasWebLocks()).toBe(false);
  });

  it("returns false when navigator.locks is absent", async () => {
    vi.stubGlobal("navigator", {});
    const { hasWebLocks } = await import("../app/_components/opfs/featureDetect");
    expect(hasWebLocks()).toBe(false);
  });

  it("returns true when navigator.locks.request is a function", async () => {
    vi.stubGlobal("navigator", { locks: { request: () => {} } });
    const { hasWebLocks } = await import("../app/_components/opfs/featureDetect");
    expect(hasWebLocks()).toBe(true);
  });
});
