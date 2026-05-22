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

function cacheKey(scope: RuntimeScope, adapterId: string): string {
  return `${scope}:${adapterId}`;
}

/** Returns a promise for the runtime associated with `(scope, adapter)`,
 *  starting initialisation if it has not been started yet. Subsequent
 *  callers with the same `(scope, adapter.id)` pair receive the same
 *  promise (and therefore the same runtime instance once it resolves).
 *
 *  The optional `setLoadingMessage` callback is forwarded to
 *  `adapter.init()` only on the first call within a given scope — once a
 *  runtime is being initialised, later callers attach to the existing
 *  promise without receiving loading progress (they just `await`). */
export function getSharedRuntime(
  scope: RuntimeScope,
  adapter: LanguageAdapter,
  setLoadingMessage: (message: string) => void = () => {},
): Promise<LanguageRuntime> {
  const key = cacheKey(scope, adapter.id);
  const existing = cache.get(key);
  if (existing) return existing;
  const promise = adapter.init(setLoadingMessage).catch((err) => {
    // Don't cache failures — let the next caller retry.
    cache.delete(key);
    throw err;
  });
  cache.set(key, promise);
  return promise;
}
