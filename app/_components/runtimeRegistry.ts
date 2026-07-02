// Per-(scope, adapter) shared runtime registry.
//
// Surfaces that run user code against a language adapter resolve their
// runtime through this registry. The registry is partitioned into
// independent "scopes" so that side effects can't leak between
// unrelated user surfaces:
//
//   - `RuntimeScope.Fumadocs` — every `<CodeBlock>` and
//     `<ChallengeCard>` rendered on the /learn route shares one
//     runtime per language. Navigating between learn pages preserves
//     that runtime.
//   - `RuntimeScope.Playground` — the full `<Playground>` keeps its
//     own runtime instance, isolated from anything the learn route
//     might have installed, monkey-patched, or staged into the VFS.
//
// Within each scope, the first caller to need (say) the Python adapter
// triggers `adapter.init()`; every subsequent caller in the same scope,
// on the same page or on a later page during the same SPA session,
// attaches to the cached promise.
//
// Crossing scopes still triggers a fresh `init()`, but the heavy WASM
// payload (Pyodide, WebR, CheerpJ, the almostnode worker) is served
// from the browser's HTTP cache on every load after the first, so the
// cross-scope cost is mostly WASM instantiation rather than a network
// round-trip.
//
// Sharing the runtime does NOT share user state within a scope either —
// every adapter resets its global scope at the start of each `run()`
// (Python wipes `globals()`, R wipes `.GlobalEnv`, JS/TS execute in a
// fresh function scope, the compiled languages recompile from scratch).
// So each block always executes against freshly-initialised globals
// even though the underlying runtime instance is shared. Side-effects
// the language can't roll back (micropip installs, monkey-patched
// modules, files staged into the in-memory FS) persist within a scope,
// which is the right tradeoff for typical learn / playground use.
//
// ─── Eviction ───────────────────────────────────────────────────────────
// Caching runtimes for the whole SPA session used to be unbounded:
// flipping the home hero's language picker (or reading learn pages in
// several languages) stacked a WASM VM per language — Pyodide alone is
// hundreds of MB. The registry now keeps at most
// `MAX_RUNTIMES_PER_SCOPE` *disposable* runtimes per scope and evicts
// the least-recently-used beyond that, calling `runtime.dispose()` so
// the backing worker/WASM heap is actually freed. Two guard rails:
//
//   - Surfaces pin the runtime they're rendered around via
//     `retainRuntime` while mounted, so a runtime is never torn down
//     under a block that could still Run against it. Only unretained
//     runtimes (all their blocks unmounted) are eviction candidates.
//   - Runtimes that can't free their resources (no `dispose` hook —
//     CheerpJ's page-level JVM, the .NET runtime) are never evicted:
//     dropping the cache entry would leak the old VM *and* boot a new
//     one on the next request. They don't count against the cap.
//
// An evicted language simply cold-boots again on next use, served from
// the browser's HTTP cache.

import type { LanguageAdapter, LanguageRuntime } from "./types";

/** Independent runtime partitions. Surfaces in different scopes get
 *  different runtime instances even when targeting the same adapter,
 *  so e.g. a `pip install` inside `<Playground>` cannot affect what a
 *  `<ChallengeCard>` on /learn observes. */
export const RuntimeScope = {
  Fumadocs: "fumadocs",
  Playground: "playground",
} as const;
export type RuntimeScope = (typeof RuntimeScope)[keyof typeof RuntimeScope];

const cache = new Map<string, Promise<LanguageRuntime>>();
// Keys whose init promise has resolved — lets callers tell a cold start
// (runtime still downloading) from a warm one (already initialised) so the
// UI can show "first run only" boot copy without lying on later runs.
const ready = new Set<string>();

// ─── Eviction state (see the module docs above) ────────────────────────

/** Maximum number of *disposable* resolved runtimes kept per scope. Two
 *  keeps an A↔B language flip cheap while a third language evicts the
 *  oldest. Retained runtimes are never evicted, so the real count can
 *  exceed this while many blocks are mounted. */
export const MAX_RUNTIMES_PER_SCOPE = 2;

// Resolved runtime per key, so eviction can reach `dispose()`.
const resolved = new Map<string, LanguageRuntime>();
// Live claims per key — while > 0 the runtime is not an eviction candidate.
const retainCounts = new Map<string, number>();
// LRU bookkeeping: a monotonically increasing sequence stamped on access.
let useSeq = 0;
const lastUsed = new Map<string, number>();

type EvictionListener = (scope: RuntimeScope, adapterId: string) => void;
const evictionListeners = new Set<EvictionListener>();

/** Subscribe to runtime evictions (e.g. so the route-land warm-up can
 *  forget its "already warmed" dedupe for the evicted language). Returns
 *  an unsubscribe function. */
export function onRuntimeEvicted(listener: EvictionListener): () => void {
  evictionListeners.add(listener);
  return () => evictionListeners.delete(listener);
}

/** Pin `(scope, adapter)` while a surface that runs against it is mounted,
 *  making it ineligible for eviction. Returns a release function (safe to
 *  call more than once) — ideal as a `useEffect` cleanup. */
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

/** Drop the least-recently-used disposable runtimes of `scope` until at
 *  most `MAX_RUNTIMES_PER_SCOPE` remain. Runs whenever a boot resolves.
 *  Only resolved, unretained runtimes that implement `dispose` are
 *  candidates; `keepKey` (the runtime that just resolved) never is. */
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
      // Best-effort teardown — the entry is gone either way, so the next
      // request boots fresh.
    }
    const adapterId = key.slice(scopePrefix.length);
    for (const listener of [...evictionListeners]) listener(scope, adapterId);
    excess--;
  }
}

/** Boot-progress report: a human-readable stage line plus an optional
 *  coarse overall fraction (0..1) — see `LanguageAdapter.init`. */
export type BootProgressListener = (message: string, fraction?: number) => void;

// Every caller of `getSharedRuntime` that passes a progress callback is
// subscribed for the duration of the boot — not just the first caller.
// This matters because boots usually start from a silent warm-up
// (route land / scroll-into-view) and the user only *sees* progress if
// the Run-click subscriber that arrives mid-boot still receives stage
// events. `lastProgress` replays the current stage to late subscribers
// so their UI starts at the right point instead of a stale default.
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

// Listeners are only useful while a boot is in flight; drop them (and
// the replay snapshot) once init settles so per-Run-click subscriber
// closures don't accumulate across a session.
function settleProgress(key: string): void {
  progressListeners.delete(key);
  lastProgress.delete(key);
}

// Cold-boot timing via the Performance API (visible in DevTools and
// collectable later): one `runtime-boot:<scope>:<adapter>` measure per
// first init. Best-effort — never let instrumentation break a boot.
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

/** Returns a promise for the runtime associated with `(scope, adapter)`,
 *  starting initialisation if it has not been started yet. Subsequent
 *  callers with the same `(scope, adapter.id)` pair receive the same
 *  promise (and therefore the same runtime instance once it resolves).
 *
 *  Every caller's optional `onProgress` callback is subscribed to the
 *  in-flight boot's stage events (with the current stage replayed on
 *  subscribe), so a caller that attaches mid-boot — e.g. a Run click
 *  while a warm-up download is in progress — still renders live
 *  progress. Subscriptions end when the boot settles. */
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
        // A stale boot whose cache entry was already dropped (evicted
        // mid-boot, or superseded after a failure) must not resurrect
        // registry state — free it and hand the caller the runtime
        // they were promised anyway.
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
        // Don't cache failures — let the next caller retry.
        if (cache.get(key) === promise) cache.delete(key);
        settleProgress(key);
        throw err;
      },
    );
  markBoot(key, promise);
  cache.set(key, promise);
  return promise;
}
