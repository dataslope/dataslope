/**
 * The post-sign-in sweep that uploads a browser's local code workspaces.
 *
 * Shared by the /playground index and the dashboard so it runs wherever the
 * user lands first. SQL workspaces are excluded: their bundle carries a
 * database image only a live engine can produce.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { WorkspaceEntry } from "../app/_components/opfs/workspace";

const BACKUP = "../app/_components/cloud/backupLocalWorkspaces";

const entry = (id: string, playground: string): WorkspaceEntry => ({
  id,
  name: id,
  playground,
  createdAt: 1,
  lastUsedAt: 1,
});

const saved: string[] = [];
const built: string[] = [];
let buildResult: unknown = { kind: "code" };
let saveError: Error | null = null;

beforeEach(() => {
  saved.length = 0;
  built.length = 0;
  buildResult = { kind: "code" };
  saveError = null;
  vi.resetModules();
  vi.doMock("../app/_components/cloud/backupFromOpfs", () => ({
    buildCodeBundleFromOpfs: async (_pg: string, id: string) => {
      built.push(id);
      return buildResult;
    },
  }));
  vi.doMock("../app/_components/cloud/cloudApi", () => ({
    saveCloudWorkspace: async (id: string) => {
      if (saveError) throw saveError;
      saved.push(id);
    },
  }));
});

describe("pendingBackupCandidates", () => {
  it("takes local code workspaces with no cloud copy", async () => {
    const { pendingBackupCandidates } = await import(BACKUP);
    const candidates = pendingBackupCandidates(
      [
        entry("a", "python"),
        entry("b", "python"),
        entry("c", "sqlite"),
        entry("d", "postgres"),
      ],
      new Set(["b"]),
    );
    expect(candidates.map((e: WorkspaceEntry) => e.id)).toEqual(["a"]);
  });
});

describe("backupLocalWorkspaces", () => {
  it("uploads each candidate and reports progress", async () => {
    const { backupLocalWorkspaces } = await import(BACKUP);
    const progress: (number | null)[] = [];
    const uploaded = await backupLocalWorkspaces({
      entries: [entry("a", "python"), entry("b", "javascript")],
      cloudIds: new Set<string>(),
      onProgress: (p: { done: number } | null) => progress.push(p?.done ?? null),
    });
    expect(uploaded).toBe(2);
    expect(saved).toEqual(["a", "b"]);
    expect(progress).toEqual([0, 1, 2]);
  });

  it("skips a workspace with nothing to rebuild from, without failing the sweep", async () => {
    buildResult = null;
    const { backupLocalWorkspaces } = await import(BACKUP);
    const uploaded = await backupLocalWorkspaces({
      entries: [entry("a", "python")],
      cloudIds: new Set<string>(),
    });
    expect(built).toEqual(["a"]);
    expect(saved).toEqual([]);
    expect(uploaded).toBe(1);
  });

  it("stops at the first failure and reports it once", async () => {
    saveError = new Error("Over quota");
    const errors: string[] = [];
    const { backupLocalWorkspaces } = await import(BACKUP);
    const uploaded = await backupLocalWorkspaces({
      entries: [entry("a", "python"), entry("b", "python")],
      cloudIds: new Set<string>(),
      onError: (m: string) => errors.push(m),
    });
    expect(uploaded).toBe(0);
    expect(built).toEqual(["a"]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("Over quota");
  });

  it("stops when the caller unmounts", async () => {
    const { backupLocalWorkspaces } = await import(BACKUP);
    let calls = 0;
    const uploaded = await backupLocalWorkspaces({
      entries: [entry("a", "python"), entry("b", "python")],
      cloudIds: new Set<string>(),
      // Cancelled after the first upload's post-check.
      isCancelled: () => ++calls > 2,
    });
    expect(uploaded).toBe(1);
    expect(saved).toEqual(["a"]);
  });

  it("does nothing when everything is already backed up", async () => {
    const { backupLocalWorkspaces } = await import(BACKUP);
    const uploaded = await backupLocalWorkspaces({
      entries: [entry("a", "python")],
      cloudIds: new Set(["a"]),
    });
    expect(uploaded).toBe(0);
    expect(built).toEqual([]);
  });
});
