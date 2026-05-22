// Per-adapter shared runtime registry.
//
// Every surface that runs user code against a language adapter —
// `<CodeBlock>`, `<ChallengeCard>`, and the full `<Playground>` — goes
// through this registry. The first surface to need (say) the Python
// adapter triggers `adapter.init()`; every subsequent surface for the
// same adapter id, on the same page or on a later page during the same
// SPA session, attaches to the cached promise and reuses the runtime
// that already finished loading.
//
// Concretely this means: spinning up Pyodide / CheerpJ / WebR / the
// almostnode worker only happens once per session. Navigating between
// the learn-route MDX pages and `/playground/<lang>` is essentially
// free — the heavy WASM payload stays in memory.
//
// Sharing the runtime does NOT share user state across surfaces —
// every adapter resets its global scope at the start of each `run()`
// (Python wipes `globals()`, R wipes `.GlobalEnv`, JS/TS execute in a
// fresh function scope, the compiled languages recompile from scratch).
// So each block always executes against freshly-initialised globals
// even though the underlying runtime instance is shared. Side-effects
// the language can't roll back (micropip installs, monkey-patched
// modules, files staged into the in-memory FS) DO persist — which is
// the right tradeoff for typical learn / playground use, and matches
// how the playground already worked within its own session.

import type { LanguageAdapter, LanguageRuntime } from "./types";

const cache = new Map<string, Promise<LanguageRuntime>>();

/** Returns a promise for the runtime associated with `adapter`, starting
 *  initialisation if it has not been started yet. Subsequent callers for
 *  the same adapter id receive the same promise (and therefore the same
 *  runtime instance once it resolves).
 *
 *  The optional `setLoadingMessage` callback is forwarded to
 *  `adapter.init()` only on the first call — once a runtime is being
 *  initialised, later callers attach to the existing promise without
 *  receiving loading progress (they just `await` the result). */
export function getSharedRuntime(
  adapter: LanguageAdapter,
  setLoadingMessage: (message: string) => void = () => {},
): Promise<LanguageRuntime> {
  const existing = cache.get(adapter.id);
  if (existing) return existing;
  const promise = adapter.init(setLoadingMessage).catch((err) => {
    // Don't cache failures — let the next caller retry.
    cache.delete(adapter.id);
    throw err;
  });
  cache.set(adapter.id, promise);
  return promise;
}
