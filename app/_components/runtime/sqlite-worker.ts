import { createSqliteEngineInProcess, type SqliteEngineOpenOptions } from "./sqlite-core";
import { loadSqlite3 } from "./sqlite-wasm";

type SqliteWorkerInitArgs = [
  initialSampleId: string,
  workspaceId?: string | null,
];

type SqliteWorkerRequest = {
  id: number;
  method: string;
  args: unknown[];
};

type SqliteWorkerResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string };

let enginePromise: ReturnType<typeof createSqliteEngineInProcess> | null = null;

/** Install the SAH Pool VFS once per worker.  The pool's `directory`
 *  defaults to `".opfs-sahpool"`, which keeps its metadata files clear
 *  of the user-facing `workspaces/` tree.  The capacity is sized to
 *  comfortably cover a handful of workspaces' database + journal files
 *  in the same worker (worst case ~3 files per DB). */
let sahPoolPromise: Promise<unknown> | null = null;
async function ensureSAHPoolVfs(): Promise<boolean> {
  // OPFS / SAH access handles are required.  Both checks are inside a
  // try/catch because the SAH Pool installer itself throws on
  // browsers that lack the feature.
  try {
    if (typeof navigator === "undefined" || !("storage" in navigator)) {
      return false;
    }
    if (!sahPoolPromise) {
      sahPoolPromise = (async () => {
        const sqlite3 = await loadSqlite3();
        const installer = (
          sqlite3 as unknown as {
            installOpfsSAHPoolVfs?: (opts: {
              initialCapacity?: number;
            }) => Promise<unknown>;
          }
        ).installOpfsSAHPoolVfs;
        if (typeof installer !== "function") {
          throw new Error("SAH Pool VFS is not available in this sqlite-wasm build");
        }
        return installer({ initialCapacity: 12 });
      })();
    }
    await sahPoolPromise;
    return true;
  } catch (err) {
    // Reset so a later worker call could in principle retry, though in
    // practice OPFS support does not change at runtime.
    sahPoolPromise = null;
    if (typeof console !== "undefined") {
      console.warn("SQLite OPFS SAH Pool unavailable; falling back to in-memory:", err);
    }
    return false;
  }
}

/** Compute the OPFS file path used by the SAH Pool VFS for a given
 *  workspace.  The SAH Pool VFS treats this string as an opaque key
 *  inside its own pool directory, so the leading-slash + nested-path
 *  form is purely for human readability when inspecting OPFS.  */
function workspaceDbFilename(workspaceId: string): string {
  return `/workspaces/${workspaceId}/sqlite.db`;
}

async function resolveOpenOptions(
  workspaceId: string | null | undefined,
): Promise<SqliteEngineOpenOptions> {
  if (!workspaceId) return {};
  const ok = await ensureSAHPoolVfs();
  if (!ok) return {};
  return {
    filename: workspaceDbFilename(workspaceId),
    vfs: "opfs-sahpool",
    // The sample seed must only run on the first open of a brand-new
    // database file. `sqlite-core` decides this by inspecting
    // sqlite_master after the file is opened (see `build()` in
    // sqlite-core.ts); we keep `skipSeed` unset here so the engine
    // applies its own first-open detection.
  };
}

self.addEventListener("message", async (ev: MessageEvent<SqliteWorkerRequest>) => {
  const { id, method, args } = ev.data;
  try {
    const firstCall = !enginePromise;
    if (firstCall) {
      if (method !== "loadSampleDatabase" || typeof args[0] !== "string") {
        throw new Error("SQLite worker has not been initialised");
      }
      const [initialSampleId, workspaceId] = args as SqliteWorkerInitArgs;
      const openOptions = await resolveOpenOptions(workspaceId);
      enginePromise = createSqliteEngineInProcess(initialSampleId, openOptions);
    }
    const engine = await enginePromise!;
    // The first `loadSampleDatabase` call already built the engine
    // against the requested sample. Re-dispatching it would wipe and
    // reseed the (possibly already-populated) OPFS database, so we
    // short-circuit and return the active sample metadata directly.
    if (firstCall && method === "loadSampleDatabase") {
      const result = engine.activeSample();
      self.postMessage(
        { id, ok: true, result } satisfies SqliteWorkerResponse,
      );
      return;
    }
    const fn = engine[method as keyof typeof engine];
    if (typeof fn !== "function") throw new Error(`Unknown SQLite worker method: ${method}`);
    const result = await (fn as (...fnArgs: unknown[]) => unknown)(...args);
    const transfer =
      result instanceof Uint8Array
        ? [result.buffer]
        : [];
    self.postMessage({ id, ok: true, result } satisfies SqliteWorkerResponse, transfer);
  } catch (err) {
    self.postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    } satisfies SqliteWorkerResponse);
  }
});
