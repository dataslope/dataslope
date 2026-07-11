import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  WorkspaceSyncEngine,
  type SyncEngineState,
} from "@/app/_components/workspace/workspaceSyncEngine";

const DEBOUNCE = 100;
const SETTLE = 1000;

function makeEngine(
  overrides: Partial<{
    sync: () => Promise<boolean | void>;
    isOnline: () => boolean;
  }> = {},
) {
  const states: SyncEngineState[] = [];
  const online = { value: true };
  const sync = overrides.sync ?? vi.fn().mockResolvedValue(undefined);
  const engine = new WorkspaceSyncEngine({
    debounceMs: DEBOUNCE,
    settleMs: SETTLE,
    isOnline: overrides.isOnline ?? (() => online.value),
    isNetworkError: (err) => err instanceof Error && err.message === "network",
    onState: (s) => states.push(s),
    sync,
  });
  return { engine, states, sync, online };
}

const lastPhase = (states: SyncEngineState[]) =>
  states.length ? states[states.length - 1].phase : "idle";

/** Pass the settle window so subsequent change pulses are honored. */
async function settle(engine: WorkspaceSyncEngine) {
  engine.activate();
  await vi.advanceTimersByTimeAsync(SETTLE);
}

describe("WorkspaceSyncEngine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("ignores change pulses inside the settle window", async () => {
    const { engine, sync } = makeEngine();
    engine.activate();
    engine.notifyChange(); // immediately, still settling
    await vi.advanceTimersByTimeAsync(DEBOUNCE + 10);
    expect(sync).not.toHaveBeenCalled();
  });

  it("debounces a post-settle change and backs up once", async () => {
    const { engine, sync, states } = makeEngine();
    await settle(engine);
    engine.notifyChange();
    expect(lastPhase(states)).toBe("pending");
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(sync).toHaveBeenCalledTimes(1);
    expect(lastPhase(states)).toBe("saved");
    expect(states.at(-1)?.lastSyncedAt).not.toBeNull();
  });

  it("coalesces a burst of changes into a single backup", async () => {
    const { engine, sync } = makeEngine();
    await settle(engine);
    engine.notifyChange();
    await vi.advanceTimersByTimeAsync(DEBOUNCE - 20);
    engine.notifyChange();
    await vi.advanceTimersByTimeAsync(DEBOUNCE - 20);
    engine.notifyChange();
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("holds the change while offline and retries on reconnect", async () => {
    const { engine, sync, states, online } = makeEngine();
    await settle(engine);
    online.value = false;
    engine.notifyChange();
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(sync).not.toHaveBeenCalled();
    expect(lastPhase(states)).toBe("offline");

    online.value = true;
    engine.handleOnline();
    await vi.advanceTimersByTimeAsync(0);
    expect(sync).toHaveBeenCalledTimes(1);
    expect(lastPhase(states)).toBe("saved");
  });

  it("treats a network rejection as transient and retries", async () => {
    const sync = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(undefined);
    const { engine, states } = makeEngine({ sync });
    await settle(engine);
    engine.notifyChange();
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(lastPhase(states)).toBe("offline");

    engine.handleOnline();
    await vi.advanceTimersByTimeAsync(0);
    expect(sync).toHaveBeenCalledTimes(2);
    expect(lastPhase(states)).toBe("saved");
  });

  it("surfaces a terminal rejection as an error and stops", async () => {
    const sync = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(new Error("quota exceeded"));
    const { engine, states } = makeEngine({ sync });
    await settle(engine);
    engine.notifyChange();
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(lastPhase(states)).toBe("error");
    expect(states.at(-1)?.error).toBe("quota exceeded");

    // A terminal error does not auto-retry on reconnect.
    engine.handleOnline();
    await vi.advanceTimersByTimeAsync(0);
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("requestSync bypasses the settle window but keeps the debounce", async () => {
    const { engine, sync, states } = makeEngine();
    engine.activate(); // settle window open
    engine.requestSync();
    expect(lastPhase(states)).toBe("pending");
    await vi.advanceTimersByTimeAsync(DEBOUNCE - 10);
    expect(sync).not.toHaveBeenCalled(); // still debouncing
    await vi.advanceTimersByTimeAsync(10);
    expect(sync).toHaveBeenCalledTimes(1);
    expect(lastPhase(states)).toBe("saved");
  });

  it("retries after a debounce when sync reports not-ready (false)", async () => {
    const sync = vi
      .fn<() => Promise<boolean | void>>()
      .mockResolvedValueOnce(false) // playground still booting
      .mockResolvedValueOnce(undefined);
    const { engine, states } = makeEngine({ sync });
    engine.activate();
    engine.requestSync();
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(sync).toHaveBeenCalledTimes(1);
    expect(lastPhase(states)).toBe("pending"); // held, not errored

    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(sync).toHaveBeenCalledTimes(2);
    expect(lastPhase(states)).toBe("saved");
  });

  it("resets to idle and re-opens the settle window on activate", async () => {
    const { engine, sync, states } = makeEngine();
    await settle(engine);
    engine.notifyChange();
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(lastPhase(states)).toBe("saved");

    // Switching workspaces: back to idle, and a fresh pulse is settle-gated.
    engine.activate();
    expect(lastPhase(states)).toBe("idle");
    engine.notifyChange();
    await vi.advanceTimersByTimeAsync(DEBOUNCE + 10);
    expect(sync).toHaveBeenCalledTimes(1); // no second backup
  });
});
