"use client";

import { createSqliteEngine } from "../runtime/sqlite";
import {
  findSampleDatabase,
  SQLITE_SAMPLE_DATABASES,
} from "../runtime/sqliteSamples";
import type {
  SqlColumnInfo,
  SqlEngineAdapter,
  SqlEngineHandle,
  SqlForeignKeyInfo,
} from "./shared/SqlEngineAdapter";

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export function createSqliteAdapter(): SqlEngineAdapter {
  return {
    dialect: "sqlite",
    displayName: "SQLite",
    storagePrefix: "pg_sqlite_",
    defaultPageSize: 50,
    supportsSchemas: false,
    supportsPragmas: true,
    createEngine: async (sampleId) => {
      const engine = await createSqliteEngine(sampleId);
      return {
        exec: (sql) => engine.execAll(sql),
        listTables: () => engine.listTables(),
        listViews: () => engine.listViews(),
        listIndexes: () => engine.listIndexes(),
        listTriggers: () => engine.listTriggers(),
        listColumns: async (name) =>
          (await engine.listColumns(name)).map(
            (column): SqlColumnInfo => ({
              name: column.name,
              type: column.type,
              notNull: column.notNull,
              defaultValue: column.defaultValue,
              pk: column.pk,
            }),
          ),
        listForeignKeys: async (name) =>
          (await engine.listForeignKeys(name)).map(
            (fk): SqlForeignKeyInfo => ({
              from: fk.from,
              to_table: fk.table,
              to_column: fk.to,
              on_delete: fk.onDelete,
              on_update: fk.onUpdate,
            }),
          ),
        destroy: () => {
          // The current SQLite worker facade has no close primitive.
        },
      } satisfies SqlEngineHandle;
    },
    listSamples: () => SQLITE_SAMPLE_DATABASES,
    findSample: findSampleDatabase,
    quoteIdent,
  };
}
