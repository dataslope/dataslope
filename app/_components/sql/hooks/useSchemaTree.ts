"use client";

import { useCallback, useRef, useState } from "react";
import type { ForeignKeyInfo, TableColumnInfo } from "../../runtime/sqlite";

/**
 * Multi-schema sidebar state shared by Postgres and DuckDB (SQLite has no
 * schema namespace). The dialect-specific `refreshSchema` is provided by the
 * caller — it diverges between the two engines — while the hook owns the
 * state and exposes a uniform refreshSchemas / handleSchemaChange API.
 */
export interface UseSchemaTreeOptions {
  /** Lazy reference to the live engine so the hook can call `listSchemas`. */
  engineRef: React.MutableRefObject<{
    listSchemas(includeSystem: boolean): Promise<string[]>;
  } | null>;
  /** Schema name selected when none is set or the previous one is gone
   *  (Postgres: `"public"`, DuckDB: `"main"`). */
  defaultSchema: string;
  /** Whether the schema selector currently shows system schemas. */
  showSystemSchemasRef: React.MutableRefObject<boolean>;
  /** Postgres clears the expanded-entity set when switching schemas;
   *  DuckDB does not. */
  clearEntitiesOnSchemaChange?: boolean;
}

export function useSchemaTree(options: UseSchemaTreeOptions) {
  const { engineRef, defaultSchema, showSystemSchemasRef, clearEntitiesOnSchemaChange = false } =
    options;

  // ─── Entity state ───────────────────────────────────────────────────
  const [tables, setTables] = useState<string[]>([]);
  const [views, setViews] = useState<string[]>([]);
  const [indexes, setIndexes] = useState<string[]>([]);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [columnsByEntity, setColumnsByEntity] = useState<
    Record<string, TableColumnInfo[]>
  >({});
  const [foreignKeysByEntity, setForeignKeysByEntity] = useState<
    Record<string, ForeignKeyInfo[]>
  >({});
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(
    new Set(),
  );
  const [rowCountByTable, setRowCountByTable] = useState<
    Record<string, number>
  >({});

  // ─── Schema state ───────────────────────────────────────────────────
  const [selectedSchema, setSelectedSchema] = useState(defaultSchema);
  const [schemas, setSchemas] = useState<string[]>([defaultSchema]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const selectedSchemaRef = useRef(defaultSchema);

  /**
   * Refresh the list of schemas. Falls back to `defaultSchema` if the
   * currently-selected schema no longer exists.
   */
  const refreshSchemas = useCallback(
    async (refreshSchema: () => Promise<void>) => {
      const engine = engineRef.current;
      if (!engine) return;
      const nextSchemas = await engine.listSchemas(
        showSystemSchemasRef.current,
      );
      setSchemas(nextSchemas);
      if (!nextSchemas.includes(selectedSchemaRef.current)) {
        selectedSchemaRef.current = defaultSchema;
        setSelectedSchema(defaultSchema);
        await refreshSchema();
      }
    },
    [engineRef, showSystemSchemasRef, defaultSchema],
  );

  /**
   * Change the active schema, optionally clear expanded entities
   * (Postgres only), and re-list entities under the new schema.
   */
  const handleSchemaChange = useCallback(
    async (schema: string, refreshSchema: () => Promise<void>) => {
      // Base UI Select fires onValueChange(null) when no item matches
      // the controlled value (e.g. while the schema list is empty
      // during a fetch). Ignore those spurious calls to prevent
      // "null" poisoning selectedSchemaRef.
      if (!schema || schema === "null") return;
      selectedSchemaRef.current = schema;
      setSelectedSchema(schema);
      if (clearEntitiesOnSchemaChange) {
        setExpandedEntities(new Set());
      }
      setSchemaLoading(true);
      try {
        await refreshSchema();
      } finally {
        setSchemaLoading(false);
      }
    },
    [clearEntitiesOnSchemaChange],
  );

  return {
    // entity state
    tables,
    setTables,
    views,
    setViews,
    indexes,
    setIndexes,
    triggers,
    setTriggers,
    columnsByEntity,
    setColumnsByEntity,
    foreignKeysByEntity,
    setForeignKeysByEntity,
    expandedEntities,
    setExpandedEntities,
    rowCountByTable,
    setRowCountByTable,
    // schema state
    selectedSchema,
    setSelectedSchema,
    schemas,
    setSchemas,
    schemaLoading,
    setSchemaLoading,
    selectedSchemaRef,
    // actions
    refreshSchemas,
    handleSchemaChange,
  };
}
