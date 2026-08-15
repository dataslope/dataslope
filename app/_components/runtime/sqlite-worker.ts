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

/** Install the SAH Pool VFS once per worker. The default pool directory
 *  (".opfs-sahpool") keeps metadata clear of the workspaces/ tree; the
 *  capacity covers several workspaces' DB + journal files (~3 per DB). */
let sahPoolPromise: Promise<unknown> | null = null;
async function ensureSAHPoolVfs(): Promise<boolean> {
  // try/catch: the installer itself throws on browsers without OPFS/SAH.
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
    // Reset so a later call could retry.
    sahPoolPromise = null;
    if (typeof console !== "undefined") {
      console.warn("SQLite OPFS SAH Pool unavailable; falling back to in-memory:", err);
    }
    return false;
  }
}

/** OPFS file path for a workspace. The SAH Pool VFS treats it as an
 *  opaque key; the nested-path form is only for human readability. */
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
    // `skipSeed` stays unset so the engine applies its own first-open
    // detection (see build() in sqlite-core.ts).
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
    // The first loadSampleDatabase already built the engine; re-dispatch
    // would wipe and reseed a possibly-populated OPFS database.
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
