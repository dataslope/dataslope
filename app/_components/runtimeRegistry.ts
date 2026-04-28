// Per-adapter shared runtime registry.
//
// The full Playground component creates its own runtime instance via
// `adapter.init()` because each playground page is dedicated to one
// language. The new learning-page UX is different: a single page can
// embed multiple `CodeBlock`s for the same language (e.g. five Python
// snippets side-by-side), and we don't want to spin up five Pyodide
// workers / CheerpJ instances / WebR runtimes on the same page.
//
// This module memoises the `init()` promise per adapter id so all
// `CodeBlock`s targeting the same adapter share one underlying runtime
// (and one set of mutable globals — like a notebook). It also lets us
// reuse the in-flight init across blocks that mount nearly
// simultaneously.

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
