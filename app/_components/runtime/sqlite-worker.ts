import { createSqliteEngineInProcess } from "./sqlite-core";

type SqliteWorkerRequest = {
  id: number;
  method: string;
  args: unknown[];
};

type SqliteWorkerResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string };

let enginePromise: ReturnType<typeof createSqliteEngineInProcess> | null = null;

self.addEventListener("message", async (ev: MessageEvent<SqliteWorkerRequest>) => {
  const { id, method, args } = ev.data;
  try {
    if (!enginePromise) {
      if (method !== "loadSampleDatabase" || typeof args[0] !== "string") {
        throw new Error("SQLite worker has not been initialised");
      }
      enginePromise = createSqliteEngineInProcess(args[0]);
    }
    const engine = await enginePromise;
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
