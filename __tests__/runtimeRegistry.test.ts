/**
 * Runtime-registry tests.
 *
 * Covers the boot-progress hub added for the loading-UX work: every
 * caller of `getSharedRuntime` subscribes to the in-flight boot's
 * progress (not just the first caller), late subscribers get the
 * current stage replayed, subscriptions end when the boot settles, and
 * failed boots stay retryable. Fake adapters drive `init` by hand — no
 * real runtimes are constructed.
 */
import { describe, expect, it, vi } from "vitest";

import {
  getSharedRuntime,
  isRuntimeReady,
  RuntimeScope,
} from "../app/_components/runtimeRegistry";
import type { LanguageAdapter, LanguageRuntime } from "../app/_components/types";

type Report = (message: string, fraction?: number) => void;

/** Minimal controllable adapter: exposes the `report` callback handed
 *  to `init` plus resolve/reject handles for the init promise. The
 *  registry only reads `id` and `init`, so the cast is safe. */
function fakeAdapter(id: string) {
  let report: Report = () => {};
  let resolve!: (runtime: LanguageRuntime) => void;
  let reject!: (err: unknown) => void;
  const initSpy = vi.fn((r: Report) => {
    report = r;
    return new Promise<LanguageRuntime>((res, rej) => {
      resolve = res;
      reject = rej;
    });
  });
  const adapter = { id, init: initSpy } as unknown as LanguageAdapter;
  const runtime = {} as LanguageRuntime;
  return {
    adapter,
    initSpy,
    runtime,
    progress: (message: string, fraction?: number) => report(message, fraction),
    finish: () => resolve(runtime),
    fail: (err: unknown) => reject(err),
  };
}

describe("getSharedRuntime boot progress", () => {
  it("delivers stage events to the first caller and dedupes init", async () => {
    const fake = fakeAdapter("test-progress-basic");
    const events: Array<[string, number | undefined]> = [];
    const promise = getSharedRuntime(RuntimeScope.Fumadocs, fake.adapter, (m, f) =>
      events.push([m, f]),
    );
    const again = getSharedRuntime(RuntimeScope.Fumadocs, fake.adapter);
    expect(again).toBe(promise);
    expect(fake.initSpy).toHaveBeenCalledTimes(1);

    fake.progress("Downloading…", 0.1);
    fake.progress("Instantiating…", 0.7);
    expect(events).toEqual([
      ["Downloading…", 0.1],
      ["Instantiating…", 0.7],
    ]);

    expect(isRuntimeReady(RuntimeScope.Fumadocs, fake.adapter.id)).toBe(false);
    fake.finish();
    await expect(promise).resolves.toBe(fake.runtime);
    expect(isRuntimeReady(RuntimeScope.Fumadocs, fake.adapter.id)).toBe(true);
  });

  it("replays the current stage to a subscriber that attaches mid-boot", async () => {
    const fake = fakeAdapter("test-progress-replay");
    void getSharedRuntime(RuntimeScope.Fumadocs, fake.adapter);
    fake.progress("Downloading…", 0.3);

    // A Run click arrives while the silent warm-up boot is in flight.
    const late: Array<[string, number | undefined]> = [];
    const promise = getSharedRuntime(RuntimeScope.Fumadocs, fake.adapter, (m, f) =>
      late.push([m, f]),
    );
    expect(late).toEqual([["Downloading…", 0.3]]);

    fake.progress("Starting…", 0.9);
    expect(late).toEqual([
      ["Downloading…", 0.3],
      ["Starting…", 0.9],
    ]);

    fake.finish();
    await promise;
  });

  it("stops delivering and replaying once the boot settles", async () => {
    const fake = fakeAdapter("test-progress-settle");
    const events: string[] = [];
    const promise = getSharedRuntime(RuntimeScope.Fumadocs, fake.adapter, (m) =>
      events.push(m),
    );
    fake.progress("Stage 1");
    fake.finish();
    await promise;

    // Late stage events from a sloppy adapter go nowhere…
    fake.progress("Stage after ready");
    expect(events).toEqual(["Stage 1"]);

    // …and a post-ready caller gets the runtime without a stale replay.
    const after: string[] = [];
    await getSharedRuntime(RuntimeScope.Fumadocs, fake.adapter, (m) =>
      after.push(m),
    );
    expect(after).toEqual([]);
  });

  it("does not cache failed boots and re-subscribes the retry", async () => {
    const first = fakeAdapter("test-progress-retry");
    const promise = getSharedRuntime(RuntimeScope.Fumadocs, first.adapter);
    first.fail(new Error("network down"));
    await expect(promise).rejects.toThrow("network down");
    expect(isRuntimeReady(RuntimeScope.Fumadocs, first.adapter.id)).toBe(false);

    // The retry triggers a fresh init with a fresh subscriber set.
    const events: string[] = [];
    const retry = getSharedRuntime(RuntimeScope.Fumadocs, first.adapter, (m) =>
      events.push(m),
    );
    expect(first.initSpy).toHaveBeenCalledTimes(2);
    first.progress("Downloading again…");
    expect(events).toEqual(["Downloading again…"]);
    first.finish();
    await expect(retry).resolves.toBe(first.runtime);
  });
});
