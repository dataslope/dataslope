"use client";

import { createPostgresEngine } from "../runtime/postgres";
import {
  findPostgresSampleDatabase,
  POSTGRES_BLANK_DATABASE,
  POSTGRES_SAMPLE_DATABASES,
} from "../runtime/postgresSamples";
import type {
  SqlColumnInfo,
  SqlEngineAdapter,
  SqlEngineHandle,
  SqlForeignKeyInfo,
} from "../sql/shared/SqlEngineAdapter";

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export function createPostgresAdapter(): SqlEngineAdapter {
  return {
    dialect: "postgres",
    displayName: "PostgreSQL",
    storagePrefix: "pgplayground_",
    defaultPageSize: 50,
    supportsSchemas: true,
    supportsPragmas: false,
    createEngine: async (sampleId) => {
      const engine = await createPostgresEngine(sampleId);
      return {
        exec: (sql) => engine.exec(sql),
        execParams: (sql, params) => engine.execParams(sql, [...params]),
        listTables: (schema) => engine.listTables(schema),
        listViews: (schema) => engine.listViews(schema),
        listIndexes: (schema) => engine.listIndexes(schema),
        listTriggers: (schema) => engine.listTriggers(schema),
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
        destroy: () => engine.close(),
      } satisfies SqlEngineHandle;
    },
    listSamples: () => [...POSTGRES_SAMPLE_DATABASES, POSTGRES_BLANK_DATABASE],
    findSample: findPostgresSampleDatabase,
    quoteIdent,
  };
}
