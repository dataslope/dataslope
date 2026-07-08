"use client";

/**
 * Nuclear "Clear all local data" helper. Wipes every browser-side storage
 * surface this app touches:
 *   - localStorage (settings, manifests, examples, workspace registry)
 *   - sessionStorage (per-session toast suppression flags, etc.)
 *   - OPFS (workspaces/, including code files, uploaded data files, and
 *     persisted SQLite / PGlite / DuckDB databases)
 *   - IndexedDB (best-effort, used by some pyodide / DuckDB-WASM caches)
 *   - Cache Storage (best-effort, service worker caches if present)
 *
 * Each step is independently best-effort: a failure in one surface (e.g.
 * private mode disables OPFS) does not abort the others. After all surfaces
 * have been visited, the caller should reload the page so freshly-mounted
 * components can re-bootstrap from a clean state.
 */

import { isOpfsSupported } from "../opfs/featureDetect";

async function clearOpfs(): Promise<void> {
  if (!isOpfsSupported()) return;
  try {
    const root = await navigator.storage.getDirectory();
    // Walk the top level and remove every entry recursively. We can't
    // delete the root itself, only its children, so this is the
    // closest we get to "wipe OPFS".
    const entries = root as unknown as {
      entries(): AsyncIterable<[string, FileSystemHandle]>;
    };
    for await (const [name] of entries.entries()) {
      try {
        await root.removeEntry(name, { recursive: true });
      } catch {
        // Skip handles we can't remove (e.g. locked by an open SyncAccessHandle
        // in another tab). The remaining entries still get cleared.
      }
    }
  } catch {
    /* OPFS access denied or unavailable, nothing more to do. */
  }
}

async function clearIndexedDb(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    // `databases()` is unsupported in Firefox / Safari; in that case the
    // catch falls through and we just leave IDB alone.
    const dbs = await (indexedDB as unknown as {
      databases?: () => Promise<{ name?: string }[]>;
    }).databases?.();
    if (!dbs) return;
    await Promise.allSettled(
      dbs
        .filter((d) => typeof d.name === "string" && d.name.length > 0)
        .map(
          (d) =>
            new Promise<void>((resolve) => {
              const req = indexedDB.deleteDatabase(d.name as string);
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
              req.onblocked = () => resolve();
            }),
        ),
    );
  } catch {
    /* ignore */
  }
}

async function clearCacheStorage(): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const keys = await caches.keys();
    await Promise.allSettled(keys.map((k) => caches.delete(k)));
  } catch {
    /* ignore */
  }
}

/** Clears every local storage surface used by the app. Returns when
 *  every best-effort pass has run, does NOT reload the page itself
 *  (the caller decides whether to reload). */
export async function clearAllLocalData(): Promise<void> {
  try {
    localStorage.clear();
  } catch {
    /* private mode, ignore */
  }
  try {
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
  await Promise.all([clearOpfs(), clearIndexedDb(), clearCacheStorage()]);
}
