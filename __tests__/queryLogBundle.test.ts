/**
 * Carrying the query history and starred queries in a cloud save.
 *
 * Both lived in one browser's localStorage, so a member who opened a backed-up
 * workspace on a second device found the database and the tabs and none of the
 * queries they had run or starred. They now travel in the bundle's `personal`
 * section.
 *
 * Two properties matter more than the plumbing: the merge must not cost the
 * receiving device its own history, and `personal` must never reach a share
 * bundle, which is a copy handed to whoever has the link.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  BUNDLE_MAX_LOG_ENTRIES,
  validateBundle,
  type WorkspaceBundle,
} from "../lib/workspaces/types";

const QUERY_LOG = "../app/_components/sql/utils/queryLogBundle";
const KEYS = {
  history: "playground_postgres_query_history",
  saved: "playground_postgres_saved_queries",
};

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

beforeEach(() => {
  local = makeStorageStub();
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("window", { localStorage: local });
  vi.resetModules();
});

const run = (id: string, at: number, sql = `SELECT ${id};`) => ({
  id,
  sql,
  source: "Query 1",
  executedAt: at,
  elapsedMs: 1,
  success: true,
});

const star = (id: string, sql: string, at: number) => ({
  id,
  sql,
  source: "Query 1",
  savedAt: at,
});

describe("mergeHistory", () => {
  it("keeps both sides, newest first", async () => {
    const { mergeHistory } = await import(QUERY_LOG);
    const merged = mergeHistory([run("a", 300)], [run("b", 100), run("c", 200)]);
    expect(merged.map((e: { id: string }) => e.id)).toEqual(["a", "c", "b"]);
  });

  it("is idempotent, so restoring the same backup twice adds nothing", async () => {
    const { mergeHistory } = await import(QUERY_LOG);
    const incoming = [run("a", 1), run("b", 2)];
    const once = mergeHistory([], incoming);
    expect(mergeHistory(once, incoming)).toHaveLength(2);
  });

  it("prefers this device's own record of a run it shares an id with", async () => {
    const { mergeHistory } = await import(QUERY_LOG);
    const mine = { ...run("a", 300), source: "mine" };
    const merged = mergeHistory([mine], [{ ...run("a", 300), source: "theirs" }]);
    expect(merged[0].source).toBe("mine");
  });

  it("caps the result", async () => {
    const { mergeHistory } = await import(QUERY_LOG);
    const many = Array.from({ length: 400 }, (_, i) => run(`i${i}`, i));
    expect(mergeHistory([], many)).toHaveLength(BUNDLE_MAX_LOG_ENTRIES);
  });
});

describe("mergeSaved", () => {
  it("treats the same SQL starred on two devices as one star", async () => {
    const { mergeSaved } = await import(QUERY_LOG);
    const merged = mergeSaved(
      [star("s1", "SELECT 1;", 100)],
      [star("s2", "SELECT 1;", 200), star("s3", "SELECT 2;", 300)],
    );
    expect(merged).toHaveLength(2);
    expect(merged.filter((s: { sql: string }) => s.sql === "SELECT 1;")).toHaveLength(1);
  });
});

describe("reading and restoring", () => {
  it("reads nothing when the device has no log", async () => {
    const { readQueryLog } = await import(QUERY_LOG);
    expect(readQueryLog(KEYS)).toBeUndefined();
  });

  it("round-trips a device's log through a bundle", async () => {
    const { readQueryLog, restoreQueryLog } = await import(QUERY_LOG);
    local.setItem(KEYS.history, JSON.stringify([run("a", 100)]));
    local.setItem(KEYS.saved, JSON.stringify([star("s1", "SELECT 1;", 100)]));
    const personal = readQueryLog(KEYS);
    expect(personal?.history).toHaveLength(1);

    // A second device with a history of its own.
    local.clear();
    local.setItem(KEYS.history, JSON.stringify([run("b", 200)]));
    const restored = restoreQueryLog(personal, KEYS);

    expect(restored?.history.map((e: { id: string }) => e.id)).toEqual(["b", "a"]);
    const { flushPersistedStorage } = await import(
      "../app/_components/sql/utils/persistedStorage"
    );
    flushPersistedStorage();
    expect(JSON.parse(local.getItem(KEYS.saved)!)).toHaveLength(1);
  });

  it("does nothing for a bundle that carries no log", async () => {
    const { restoreQueryLog } = await import(QUERY_LOG);
    expect(restoreQueryLog(undefined, KEYS)).toBeNull();
    expect(restoreQueryLog({}, KEYS)).toBeNull();
    expect(restoreQueryLog({ history: [], saved: [] }, KEYS)).toBeNull();
  });
});

describe("validateBundle, personal section", () => {
  const bundle = (personal?: unknown): unknown =>
    ({
      version: 2,
      kind: "sql",
      playground: "sqlite",
      name: "W",
      exportedAt: 1,
      sql: {
        dialect: "sqlite",
        dbFormat: "sqlite-image",
        dbBytes: 0,
        tabs: [],
        personal,
      },
    }) as unknown as WorkspaceBundle;

  it("accepts a bundle with no personal section", () => {
    expect(validateBundle(bundle())).not.toBeNull();
  });

  it("accepts a well-formed one", () => {
    expect(
      validateBundle(bundle({ history: [run("a", 1)], saved: [star("s", "S;", 1)] })),
    ).not.toBeNull();
  });

  it("rejects junk, which is written straight into the reader's own history", () => {
    expect(validateBundle(bundle("nope"))).toBeNull();
    expect(validateBundle(bundle({ history: "nope" }))).toBeNull();
    expect(validateBundle(bundle({ history: [{ id: "a" }] }))).toBeNull();
    expect(validateBundle(bundle({ saved: [{ id: "s", sql: "S;" }] }))).toBeNull();
    expect(
      validateBundle(
        bundle({ history: Array.from({ length: 201 }, (_, i) => run(`i${i}`, i)) }),
      ),
    ).toBeNull();
  });
});
