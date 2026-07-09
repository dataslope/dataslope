/**
 * Route-land warm-up tests (runtime/warmup.ts).
 *
 * The module keeps session-level state (requested set, boot chain), so
 * every test imports a fresh instance via vi.resetModules(). Node has
 * no `window` or `requestIdleCallback`, which conveniently exercises
 * the SSR guard and the setTimeout fallback (driven by fake timers).
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import type { LanguageAdapter, LanguageRuntime } from "../app/_components/types";
import type { RuntimeScope } from "../app/_components/runtimeRegistry";

type WarmupModule = typeof import("../app/_components/runtime/warmup");

async function freshWarmup(): Promise<WarmupModule> {
  vi.resetModules();
  return import("../app/_components/runtime/warmup");
}

const FUMADOCS = "fumadocs" as RuntimeScope;

/** Controllable fake adapter (the registry only reads `id` / `init`). */
function fakeAdapter(id: string, autoResolve = true) {
  let resolve!: (runtime: LanguageRuntime) => void;
  let reject!: (err: unknown) => void;
  const initSpy = vi.fn(() => {
    return new Promise<LanguageRuntime>((res, rej) => {
      resolve = res;
      reject = rej;
      if (autoResolve) res({} as LanguageRuntime);
    });
  });
  return {
    adapter: { id, init: initSpy } as unknown as LanguageAdapter,
    initSpy,
    finish: () => resolve({} as LanguageRuntime),
    fail: (err: unknown) => reject(err),
  };
}

async function flushMicrotasks(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

describe("warmRuntimeOnRouteLand", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("boots the runtime after the idle delay and dedupes repeat requests", async () => {
    vi.stubGlobal("window", {});
    const { warmRuntimeOnRouteLand } = await freshWarmup();
    vi.useFakeTimers();
    const fake = fakeAdapter("warm-dedupe");

    // Three blocks of the same language mount on one page.
    warmRuntimeOnRouteLand(FUMADOCS, fake.adapter);
    warmRuntimeOnRouteLand(FUMADOCS, fake.adapter);
    warmRuntimeOnRouteLand(FUMADOCS, fake.adapter);
    expect(fake.initSpy).not.toHaveBeenCalled(); // idle-deferred

    await vi.advanceTimersByTimeAsync(1600);
    expect(fake.initSpy).toHaveBeenCalledTimes(1);
  });

  it("does nothing without a window (SSR)", async () => {
    const { warmRuntimeOnRouteLand } = await freshWarmup();
    vi.useFakeTimers();
    const fake = fakeAdapter("warm-ssr");
    warmRuntimeOnRouteLand(FUMADOCS, fake.adapter);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fake.initSpy).not.toHaveBeenCalled();
  });

  it("skips the speculative boot when Save-Data is on", async () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", { connection: { saveData: true } });
    const { warmRuntimeOnRouteLand } = await freshWarmup();
    vi.useFakeTimers();
    const fake = fakeAdapter("warm-savedata");
    warmRuntimeOnRouteLand(FUMADOCS, fake.adapter);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fake.initSpy).not.toHaveBeenCalled();
  });

  it("skips the speculative boot on 2g-class connections", async () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", { connection: { effectiveType: "2g" } });
    const { warmRuntimeOnRouteLand } = await freshWarmup();
    vi.useFakeTimers();
    const fake = fakeAdapter("warm-2g");
    warmRuntimeOnRouteLand(FUMADOCS, fake.adapter);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fake.initSpy).not.toHaveBeenCalled();
  });

  it("boots one runtime at a time: the second language waits for the first", async () => {
    vi.stubGlobal("window", {});
    const { warmRuntimeOnRouteLand } = await freshWarmup();
    vi.useFakeTimers();
    const first = fakeAdapter("warm-chain-a", false);
    const second = fakeAdapter("warm-chain-b", false);

    warmRuntimeOnRouteLand(FUMADOCS, first.adapter);
    warmRuntimeOnRouteLand(FUMADOCS, second.adapter);
    await vi.advanceTimersByTimeAsync(1600);

    expect(first.initSpy).toHaveBeenCalledTimes(1);
    expect(second.initSpy).not.toHaveBeenCalled(); // queued behind A

    first.finish();
    await flushMicrotasks();
    expect(second.initSpy).toHaveBeenCalledTimes(1);
  });

  it("a failed first boot still lets the chain continue", async () => {
    vi.stubGlobal("window", {});
    const { warmRuntimeOnRouteLand } = await freshWarmup();
    vi.useFakeTimers();
    const failing = fakeAdapter("warm-fail", false);
    const next = fakeAdapter("warm-after-fail", false);

    warmRuntimeOnRouteLand(FUMADOCS, failing.adapter);
    warmRuntimeOnRouteLand(FUMADOCS, next.adapter);
    await vi.advanceTimersByTimeAsync(1600);
    expect(failing.initSpy).toHaveBeenCalledTimes(1);

    // Reject the first boot, the warm-up swallows the failure (Run /
    // scroll-into-view retry through the registry) and moves on.
    failing.fail(new Error("network down"));
    await flushMicrotasks();
    expect(next.initSpy).toHaveBeenCalledTimes(1);
    next.finish();
  });
});
