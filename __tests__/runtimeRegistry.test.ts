/**
 * Runtime-registry tests.
 *
 * Covers the boot-progress hub added for the loading-UX work: every
 * caller of `getSharedRuntime` subscribes to the in-flight boot's
 * progress (not just the first caller), late subscribers get the
 * current stage replayed, subscriptions end when the boot settles, and
 * failed boots stay retryable. Fake adapters drive `init` by hand, no
 * real runtimes are constructed.
 */
import { describe, expect, it, vi } from "vitest";

import {
  getSharedRuntime,
  isRuntimeReady,
  MAX_RUNTIMES_PER_SCOPE,
  onRuntimeEvicted,
  retainRuntime,
  RuntimeScope,
} from "../app/_components/runtimeRegistry";
import type { LanguageAdapter, LanguageRuntime } from "../app/_components/types";

type Report = (message: string, fraction?: number) => void;

/** Minimal controllable adapter: exposes the `report` callback handed
 *  to `init` plus resolve/reject handles for the init promise. The
 *  registry only reads `id` and `init`, so the cast is safe. When
 *  `disposable`, the runtime carries a `dispose` spy (making it an
 *  eviction candidate, see the eviction suite below). */
function fakeAdapter(id: string, opts: { disposable?: boolean } = {}) {
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
  const dispose = vi.fn();
  const runtime = (
    opts.disposable ? { dispose } : {}
  ) as unknown as LanguageRuntime;
  return {
    adapter,
    initSpy,
    runtime,
    dispose,
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

describe("runtime eviction", () => {
  // The registry treats scope as an opaque string, so each test runs in
  // its own private scope, module-level registry state can't bleed
  // between tests.
  let scopeSeq = 0;
  const freshScope = () => `evict-test-${++scopeSeq}` as RuntimeScope;

  /** Boot `fake` in `scope` to completion. */
  async function boot(scope: RuntimeScope, fake: ReturnType<typeof fakeAdapter>) {
    const promise = getSharedRuntime(scope, fake.adapter);
    fake.finish();
    await promise;
  }

  it("disposes the least-recently-used runtime beyond the per-scope cap", async () => {
    const scope = freshScope();
    const fakes = Array.from({ length: MAX_RUNTIMES_PER_SCOPE + 1 }, (_, i) =>
      fakeAdapter(`evict-lru-${i}`, { disposable: true }),
    );
    for (const fake of fakes) await boot(scope, fake);

    // The first-booted (least recently used) runtime is torn down…
    expect(fakes[0].dispose).toHaveBeenCalledTimes(1);
    expect(isRuntimeReady(scope, fakes[0].adapter.id)).toBe(false);
    // …while everything within the cap survives.
    for (const fake of fakes.slice(1)) {
      expect(fake.dispose).not.toHaveBeenCalled();
      expect(isRuntimeReady(scope, fake.adapter.id)).toBe(true);
    }

    // Requesting the evicted language again cold-boots a fresh runtime.
    void getSharedRuntime(scope, fakes[0].adapter);
    expect(fakes[0].initSpy).toHaveBeenCalledTimes(2);
    fakes[0].finish();
  });

  it("never evicts a retained runtime (and evicts the next LRU instead)", async () => {
    const scope = freshScope();
    const pinned = fakeAdapter("evict-pinned", { disposable: true });
    const middle = fakeAdapter("evict-middle", { disposable: true });
    const last = fakeAdapter("evict-last", { disposable: true });

    const release = retainRuntime(scope, pinned.adapter.id);
    await boot(scope, pinned);
    await boot(scope, middle);
    await boot(scope, last); // over the cap of 2

    // `pinned` is older than `middle` but has a live claim, so `middle`
    // is the one torn down.
    expect(pinned.dispose).not.toHaveBeenCalled();
    expect(isRuntimeReady(scope, pinned.adapter.id)).toBe(true);
    expect(middle.dispose).toHaveBeenCalledTimes(1);
    expect(isRuntimeReady(scope, middle.adapter.id)).toBe(false);

    release();
    // Releasing twice is a no-op, not a double-decrement.
    release();
  });

  it("leaves runtimes without a dispose hook alone", async () => {
    const scope = freshScope();
    const fakes = Array.from({ length: MAX_RUNTIMES_PER_SCOPE + 2 }, (_, i) =>
      fakeAdapter(`evict-nodispose-${i}`), // no dispose hook
    );
    for (const fake of fakes) await boot(scope, fake);

    // Evicting them couldn't free anything, so all stay resident.
    for (const fake of fakes) {
      expect(isRuntimeReady(scope, fake.adapter.id)).toBe(true);
      expect(fake.initSpy).toHaveBeenCalledTimes(1);
    }
  });

  it("notifies eviction listeners with the scope and adapter id", async () => {
    const scope = freshScope();
    const events: Array<[RuntimeScope, string]> = [];
    const unsubscribe = onRuntimeEvicted((s, id) => events.push([s, id]));

    const fakes = Array.from({ length: MAX_RUNTIMES_PER_SCOPE + 1 }, (_, i) =>
      fakeAdapter(`evict-notify-${i}`, { disposable: true }),
    );
    for (const fake of fakes) await boot(scope, fake);

    expect(events).toEqual([[scope, fakes[0].adapter.id]]);
    unsubscribe();
  });
});
