"use client";

/**
 * "Clear all local data": wipes localStorage, sessionStorage, OPFS,
 * IndexedDB, and Cache Storage. Each step is independently best-effort so a
 * failure in one surface doesn't abort the others. The caller should reload
 * afterwards so components re-bootstrap clean.
 */

import { isOpfsSupported } from "../opfs/featureDetect";

async function clearOpfs(): Promise<void> {
  if (!isOpfsSupported()) return;
  try {
    const root = await navigator.storage.getDirectory();
    // The root itself can't be deleted, only its children.
    const entries = root as unknown as {
      entries(): AsyncIterable<[string, FileSystemHandle]>;
    };
    for await (const [name] of entries.entries()) {
      try {
        await root.removeEntry(name, { recursive: true });
      } catch {
        // Skip handles locked by another tab; the rest still clear.
      }
    }
  } catch {
    /* OPFS access denied or unavailable, nothing more to do. */
  }
}

async function clearIndexedDb(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    // `databases()` is unsupported in Firefox/Safari; IDB is left alone there.
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

/** Clears every local storage surface. Does NOT reload the page itself. */
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
