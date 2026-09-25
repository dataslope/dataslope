/**
 * Challenge progress: the merge rules shared by the browser store and the
 * API (lib/challenges/progressSync.ts), and the store's per-learner copies
 * (lib/challenges/progress.ts).
 *
 * The store half pins the two things a shared computer depends on: signing
 * in adopts the guest's progress into the account, and signing out puts the
 * guest copy back on screen, so the next person sees neither the previous
 * learner's verdicts nor their saved code.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  coversProgress,
  mergeProgress,
  mergeProgressMaps,
  sanitizeProgressMap,
} from "../lib/challenges/progressSync";

const blank = { passedSteps: [] as string[], solved: false, attempted: false };

describe("mergeProgress", () => {
  it("unions steps and keeps solved/attempted sticky", () => {
    const a = { passedSteps: ["01"], solved: false, attempted: true };
    const b = { passedSteps: ["02", "01"], solved: true, attempted: false };
    expect(mergeProgress(a, b)).toEqual({
      passedSteps: ["01", "02"],
      solved: true,
      attempted: true,
    });
  });

  it("returns the first record itself when the second adds nothing", () => {
    const a = { passedSteps: ["01", "02"], solved: true, attempted: true };
    expect(mergeProgress(a, blank)).toBe(a);
    expect(coversProgress(a, { ...blank, passedSteps: ["02"] })).toBe(true);
    expect(coversProgress(undefined, blank)).toBe(false);
  });

  it("never lets an upload undo progress", () => {
    const server = { "two-sum": { passedSteps: [], solved: true, attempted: true } };
    const stale = { "two-sum": { ...blank, attempted: true } };
    expect(mergeProgressMaps(server, stale)).toBe(server);
  });
});

describe("sanitizeProgressMap", () => {
  it("drops malformed entries and unknown slugs instead of failing", () => {
    const out = sanitizeProgressMap(
      {
        "two-sum": { passedSteps: ["01", 7, "01", "x"], solved: true, attempted: "yes" },
        "not a slug": { passedSteps: [], solved: true, attempted: true },
        "made-up": { passedSteps: [], solved: true, attempted: true },
        broken: "nope",
      },
      (slug) => slug !== "made-up",
    );
    expect(out).toEqual({
      "two-sum": { passedSteps: ["01"], solved: true, attempted: false },
    });
  });

  it("treats a non-object as empty", () => {
    expect(sanitizeProgressMap(null)).toEqual({});
    expect(sanitizeProgressMap([1, 2])).toEqual({});
  });
});

// ─── The store ─────────────────────────────────────────────────────────

function makeStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  };
}

type Store = typeof import("../lib/challenges/progress");

describe("progress store owners", () => {
  let storage: ReturnType<typeof makeStorage>;
  let fetchMock: ReturnType<typeof vi.fn>;
  let store: Store;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    storage = makeStorage();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", {
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ progress: {} }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    store = await import("../lib/challenges/progress");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("adopts guest progress and code into the account on sign-in", async () => {
    store.markSolved("two-sum");
    store.saveCode("two-sum", "python", "print(1)");

    store.setProgressOwner("user-a");

    expect(store.getProgressOwner()).toBe("user-a");
    expect(store.readProgress("two-sum").solved).toBe(true);
    expect(store.readSavedCode("two-sum", "python")).toBe("print(1)");
    // Moved, not copied: the guest keys are empty now.
    expect(storage.getItem("ds_challenge_progress_v1")).toBeNull();
    expect(storage.getItem("ds_challenge_code_v1")).toBeNull();
  });

  it("hides the account's progress and code once signed out", () => {
    store.setProgressOwner("user-a");
    store.markSolved("two-sum");
    store.saveCode("two-sum", "python", "secret()");

    store.forgetProgressOwner();

    expect(store.getProgressOwner()).toBeNull();
    expect(store.readProgress("two-sum").solved).toBe(false);
    expect(store.readSavedCode("two-sum", "python")).toBeNull();

    // Signing back in brings it back.
    store.setProgressOwner("user-a");
    expect(store.readProgress("two-sum").solved).toBe(true);
    expect(store.readSavedCode("two-sum", "python")).toBe("secret()");
  });

  it("does not hand one account's progress to another", () => {
    store.setProgressOwner("user-a");
    store.markSolved("two-sum");
    store.setProgressOwner("user-b");
    expect(store.readProgress("two-sum").solved).toBe(false);
  });

  it("merges the account copy in and uploads what it lacks", async () => {
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        return new Response(JSON.stringify({ progress: {} }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          progress: {
            "fizz-buzz": { passedSteps: [], solved: true, attempted: true },
          },
        }),
        { status: 200 },
      );
    });
    store.markAttempted("two-sum");

    store.setProgressOwner("user-a");
    await vi.runAllTimersAsync();

    expect(store.readProgress("fizz-buzz").solved).toBe(true);
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(put).toBeDefined();
    const body = JSON.parse(String(put![1]!.body)) as { progress: Record<string, unknown> };
    expect(Object.keys(body.progress)).toEqual(["two-sum"]);
  });

  it("uploads a new verdict while signed in, and nothing as a guest", async () => {
    store.markSolved("guest-only");
    await vi.runAllTimersAsync();
    expect(fetchMock).not.toHaveBeenCalled();

    store.setProgressOwner("user-a");
    await vi.runAllTimersAsync();
    fetchMock.mockClear();

    store.markStepPassed("top-products-by-month", "01", 3);
    await vi.runAllTimersAsync();
    const puts = fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT");
    expect(puts).toHaveLength(1);
    expect(String(puts[0][1]!.body)).toContain("top-products-by-month");
  });

  it("keeps working from the local copy when sync is unavailable", async () => {
    fetchMock.mockImplementation(async () => new Response("{}", { status: 503 }));
    store.setProgressOwner("user-a");
    store.markSolved("two-sum");
    await vi.runAllTimersAsync();
    expect(store.readProgress("two-sum").solved).toBe(true);
  });
});
