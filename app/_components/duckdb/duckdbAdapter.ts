"use client";

import { createDuckDbEngine } from "../runtime/duckdb";
import {
  DUCKDB_BLANK_DATABASE,
  DUCKDB_SAMPLE_DATABASES,
  findDuckDbSampleDatabase,
} from "../runtime/duckdbSamples";
import type {
  SqlColumnInfo,
  SqlEngineAdapter,
  SqlEngineHandle,
  SqlForeignKeyInfo,
} from "../sql/shared/SqlEngineAdapter";

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export function createDuckDbAdapter(): SqlEngineAdapter {
  return {
    dialect: "duckdb",
    displayName: "DuckDB",
    storagePrefix: "duckdb_",
    defaultPageSize: 50,
    supportsSchemas: true,
    supportsPragmas: false,
    createEngine: async (sampleId) => {
      const engine = await createDuckDbEngine(sampleId);
      return {
        exec: (sql) => engine.exec(sql),
        execParams: (sql, params) => engine.execParams(sql, [...params]),
        listTables: (schema) => engine.listTables(schema),
        listViews: (schema) => engine.listViews(schema),
        listIndexes: (schema) => engine.listIndexes(schema),
        listTriggers: () => engine.listTriggers(),
        listSchemas: (showSystem) => engine.listSchemas(showSystem),
        listColumns: async (name, schema) =>
          (await engine.listColumns(name, schema)).map(
            (column): SqlColumnInfo => ({
              name: column.name,
              type: column.type,
              notNull: column.notNull,
              defaultValue: column.defaultValue,
              pk: column.pk,
            }),
          ),
        listForeignKeys: async (name, schema) =>
          (await engine.listForeignKeys(name, schema)).map(
            (fk): SqlForeignKeyInfo => ({
              from: fk.from,
              to_table: fk.table,
              to_column: fk.to,
              on_delete: fk.onDelete,
              on_update: fk.onUpdate,
            }),
          ),
        destroy: () => engine.destroy(),
      } satisfies SqlEngineHandle;
    },
    listSamples: () => [...DUCKDB_SAMPLE_DATABASES, DUCKDB_BLANK_DATABASE],
    findSample: findDuckDbSampleDatabase,
    quoteIdent,
  };
}
