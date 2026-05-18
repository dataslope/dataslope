export type {
  ColumnConstraintInfo,
  ColumnSpec,
  ForeignKeyInfo,
  QueryExecResult,
  QueryExecResultWithTypes,
  SqliteEngine,
  TableColumnInfo,
  TableRebuildSpec,
} from "./sqlite-core";

import type { QueryExecResult } from "./sqlite-wasm";
import type { SqliteSampleMetadata } from "./sqliteSamples";
import type {
  ColumnConstraintInfo,
  ForeignKeyInfo,
  QueryExecResultWithTypes,
  SqliteEngine,
  TableColumnInfo,
} from "./sqlite-core";

type SqliteEngineMethod = keyof SqliteEngine;

type SqliteWorkerRequest = {
  id: number;
  method: SqliteEngineMethod;
  args: unknown[];
};

type SqliteWorkerResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string };

export async function createSqliteEngine(
  initialSampleId: string,
): Promise<SqliteEngine> {
  const worker = new Worker(new URL("./sqlite-worker.ts", import.meta.url));
  let nextId = 0;
  const pending = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (reason?: unknown) => void;
    }
  >();

  worker.addEventListener("message", (ev: MessageEvent<SqliteWorkerResponse>) => {
    const msg = ev.data;
    const callbacks = pending.get(msg.id);
    if (!callbacks) return;
    pending.delete(msg.id);
    if (msg.ok) callbacks.resolve(msg.result);
    else callbacks.reject(new Error(msg.error));
  });

  worker.addEventListener("error", (ev) => {
    const error = new Error(ev.message || "SQLite worker failed");
    for (const callbacks of pending.values()) callbacks.reject(error);
    pending.clear();
  });

  function call(method: SqliteEngineMethod, args: unknown[] = []): Promise<unknown> {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      const transfer =
        method === "loadFromBytes" && args[0] instanceof Uint8Array
          ? [args[0].buffer]
          : [];
      worker.postMessage({ id, method, args } satisfies SqliteWorkerRequest, transfer);
    });
  }

  await call("loadSampleDatabase", [initialSampleId]);

  return {
    loadSampleDatabase: (id) => call("loadSampleDatabase", [id]) as Promise<SqliteSampleMetadata>,
    exec: (sql) => call("exec", [sql]) as Promise<QueryExecResult[]>,
    execAll: (sql) => call("execAll", [sql]) as Promise<(QueryExecResultWithTypes | null)[]>,
    listTables: () => call("listTables") as Promise<string[]>,
    listViews: () => call("listViews") as Promise<string[]>,
    listIndexes: () => call("listIndexes") as Promise<string[]>,
    listTriggers: () => call("listTriggers") as Promise<string[]>,
    previewTable: (name, limit) => call("previewTable", [name, limit]) as Promise<QueryExecResult[]>,
    describeTable: (name) => call("describeTable", [name]) as Promise<QueryExecResult[]>,
    countRows: (name) => call("countRows", [name]) as Promise<QueryExecResult[]>,
    dropEntity: (name, kind) => call("dropEntity", [name, kind]) as Promise<void>,
    truncateTable: (name) => call("truncateTable", [name]) as Promise<void>,
    listColumns: (name) => call("listColumns", [name]) as Promise<TableColumnInfo[]>,
    listForeignKeys: (name) => call("listForeignKeys", [name]) as Promise<ForeignKeyInfo[]>,
    rebuildTable: (spec) => call("rebuildTable", [spec]) as Promise<void>,
    getDDL: (name) => call("getDDL", [name]) as Promise<string>,
    activeSample: () => call("activeSample") as Promise<SqliteSampleMetadata>,
    exportDatabase: () => call("exportDatabase") as Promise<Uint8Array>,
    deleteRows: (tableName, pkColumns, pkRows) =>
      call("deleteRows", [tableName, pkColumns, pkRows]) as Promise<number>,
    updateRows: (tableName, updates) =>
      call("updateRows", [tableName, updates]) as Promise<number>,
    loadBlankDatabase: () => call("loadBlankDatabase") as Promise<SqliteSampleMetadata>,
    loadFromBytes: (bytes, filename) =>
      call("loadFromBytes", [bytes, filename]) as Promise<SqliteSampleMetadata>,
    getColumnConstraintInfo: (tableName) =>
      call("getColumnConstraintInfo", [tableName]) as Promise<ColumnConstraintInfo[]>,
    insertRow: (tableName, columnNames, values) =>
      call("insertRow", [tableName, columnNames, values]) as Promise<void>,
    listTableIndexes: (tableName) => call("listTableIndexes", [tableName]) as Promise<string[]>,
    listTableTriggers: (tableName) => call("listTableTriggers", [tableName]) as Promise<string[]>,
    execPaged: (sql, pageSize, offset) =>
      call("execPaged", [sql, pageSize, offset]) as Promise<{
        result: QueryExecResultWithTypes[];
        totalCount: number;
      }>,
  };
}
