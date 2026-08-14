// Per-(scope, adapter) shared runtime registry. Scopes (Fumadocs = /learn
// blocks, Playground) are isolated partitions so side effects can't leak
// between surfaces; within a scope, the first caller triggers `adapter.init()`
// and later callers attach to the cached promise. Adapters reset language
// globals at the start of each run, but side effects the language can't roll
// back (installs, staged files) persist within the scope.
//
// Eviction: at most `MAX_RUNTIMES_PER_SCOPE` *disposable* runtimes per scope;
// the least-recently-used beyond that are `dispose()`d. Runtimes pinned via
// `retainRuntime` (a surface is mounted) are never evicted; runtimes that
// can't free their resources (no `dispose` hook, CheerpJ's page-level JVM,
// .NET) are never evicted and don't count against the cap — dropping their
// entry would leak the old VM and boot a new one. An evicted language simply
// cold-boots on next use, served from the browser's HTTP cache.

import type { LanguageAdapter, LanguageRuntime } from "./types";

/** Independent runtime partitions; a `pip install` in `<Playground>` cannot
 *  affect what a `<ChallengeCard>` on /learn observes. */
export const RuntimeScope = {
  Fumadocs: "fumadocs",
  Playground: "playground",
} as const;
export type RuntimeScope = (typeof RuntimeScope)[keyof typeof RuntimeScope];

const cache = new Map<string, Promise<LanguageRuntime>>();
// Keys whose init promise has resolved — lets the UI distinguish cold boots
// from warm ones.
const ready = new Set<string>();

// ─── Eviction state ────────────────────────────────────────────────────

/** Max *disposable* resolved runtimes per scope. Two keeps an A↔B language
 *  flip cheap; retained runtimes don't count, so the real total can exceed it. */
export const MAX_RUNTIMES_PER_SCOPE = 2;

// Resolved runtime per key, so eviction can reach `dispose()`.
const resolved = new Map<string, LanguageRuntime>();
// Live claims per key, while > 0 the runtime is not an eviction candidate.
const retainCounts = new Map<string, number>();
// LRU bookkeeping: a monotonically increasing sequence stamped on access.
let useSeq = 0;
const lastUsed = new Map<string, number>();

type EvictionListener = (scope: RuntimeScope, adapterId: string) => void;
const evictionListeners = new Set<EvictionListener>();

/** Subscribe to runtime evictions (e.g. to reset warm-up dedupe state).
 *  Returns an unsubscribe function. */
export function onRuntimeEvicted(listener: EvictionListener): () => void {
  evictionListeners.add(listener);
  return () => evictionListeners.delete(listener);
}

/** Pin `(scope, adapter)` against eviction while a surface is mounted.
 *  Returns an idempotent release function, ideal as a `useEffect` cleanup. */
export function retainRuntime(
  scope: RuntimeScope,
  adapterId: string,
): () => void {
  const key = cacheKey(scope, adapterId);
  retainCounts.set(key, (retainCounts.get(key) ?? 0) + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const next = (retainCounts.get(key) ?? 1) - 1;
    if (next <= 0) retainCounts.delete(key);
    else retainCounts.set(key, next);
  };
}

/** Drop LRU disposable runtimes of `scope` down to the cap. Only resolved,
 *  unretained runtimes with `dispose` are candidates; `keepKey` never is. */
function evictExcessRuntimes(scope: RuntimeScope, keepKey: string): void {
  const scopePrefix = `${scope}:`;
  const disposableKeys = [...resolved.keys()].filter(
    (key) =>
      key.startsWith(scopePrefix) &&
      typeof resolved.get(key)?.dispose === "function",
  );
  let excess = disposableKeys.length - MAX_RUNTIMES_PER_SCOPE;
  if (excess <= 0) return;

  const candidates = disposableKeys
    .filter((key) => key !== keepKey && !retainCounts.has(key))
    .sort((a, b) => (lastUsed.get(a) ?? 0) - (lastUsed.get(b) ?? 0));
  for (const key of candidates) {
    if (excess <= 0) break;
    const runtime = resolved.get(key);
    cache.delete(key);
    ready.delete(key);
    resolved.delete(key);
    lastUsed.delete(key);
    try {
      void runtime?.dispose?.();
    } catch {
      // Best-effort teardown; the entry is gone either way.
    }
    const adapterId = key.slice(scopePrefix.length);
    for (const listener of [...evictionListeners]) listener(scope, adapterId);
    excess--;
  }
}

/** Boot-progress report: stage line plus optional overall fraction (0..1). */
export type BootProgressListener = (message: string, fraction?: number) => void;

// Every progress callback is subscribed for the whole boot, not just the
// first caller's: boots usually start from a silent warm-up, so a Run-click
// subscriber arriving mid-boot must still get stage events. `lastProgress`
// replays the current stage to late subscribers.
const progressListeners = new Map<string, Set<BootProgressListener>>();
const lastProgress = new Map<string, { message: string; fraction?: number }>();

function cacheKey(scope: RuntimeScope, adapterId: string): string {
  return `${scope}:${adapterId}`;
}

function subscribeProgress(key: string, listener: BootProgressListener): void {
  let set = progressListeners.get(key);
  if (!set) {
    set = new Set();
    progressListeners.set(key, set);
  }
  set.add(listener);
  const last = lastProgress.get(key);
  if (last) listener(last.message, last.fraction);
}

function emitProgress(key: string, message: string, fraction?: number): void {
  lastProgress.set(key, { message, fraction });
  const set = progressListeners.get(key);
  if (!set) return;
  for (const listener of [...set]) listener(message, fraction);
}

// Drop listeners + replay snapshot once init settles so per-Run-click
// subscriber closures don't accumulate.
function settleProgress(key: string): void {
  progressListeners.delete(key);
  lastProgress.delete(key);
}

// One `runtime-boot:<scope>:<adapter>` Performance measure per first init.
// Best-effort — never let instrumentation break a boot.
function markBoot(key: string, promise: Promise<unknown>): void {
  try {
    if (typeof performance === "undefined" || !performance.mark) return;
    const start = `runtime-boot:${key}:start`;
    performance.mark(start);
    void promise.then(
      () => {
        const end = `runtime-boot:${key}:end`;
        performance.mark(end);
        performance.measure(`runtime-boot:${key}`, start, end);
      },
      () => {},
    );
  } catch {
    /* instrumentation is best-effort */
  }
}

/** Whether the `(scope, adapter)` runtime has finished initialising and is
 *  ready to run code with no download/instantiation wait. */
export function isRuntimeReady(scope: RuntimeScope, adapterId: string): boolean {
  return ready.has(cacheKey(scope, adapterId));
}

/** Promise for the `(scope, adapter)` runtime, starting init if needed;
 *  same-key callers share the promise. `onProgress` subscribes to the
 *  in-flight boot's stage events (current stage replayed on subscribe)
 *  until the boot settles. */
export function getSharedRuntime(
  scope: RuntimeScope,
  adapter: LanguageAdapter,
  onProgress?: BootProgressListener,
): Promise<LanguageRuntime> {
  const key = cacheKey(scope, adapter.id);
  lastUsed.set(key, ++useSeq);
  const existing = cache.get(key);
  if (existing) {
    if (onProgress && !ready.has(key)) subscribeProgress(key, onProgress);
    return existing;
  }
  if (onProgress) subscribeProgress(key, onProgress);
  const promise = adapter
    .init((message, fraction) => emitProgress(key, message, fraction))
    .then(
      (runtime) => {
        // A stale boot whose cache entry was dropped (evicted mid-boot or
        // superseded) must not resurrect registry state: dispose it, but
        // still hand the caller the runtime they were promised.
        if (cache.get(key) !== promise) {
          try {
            void runtime.dispose?.();
          } catch {
            /* best-effort */
          }
          return runtime;
        }
        ready.add(key);
        resolved.set(key, runtime);
        settleProgress(key);
        evictExcessRuntimes(scope, key);
        return runtime;
      },
      (err) => {
        // Don't cache failures, let the next caller retry.
        if (cache.get(key) === promise) cache.delete(key);
        settleProgress(key);
        throw err;
      },
    );
  markBoot(key, promise);
  cache.set(key, promise);
  return promise;
}
