"use client";

// Live schema introspection for the inline learn-page SQL surfaces
// (`SqlCodeBlock`, `SqlChallengeCard`). The full SQL playgrounds build
// their completion schemas from their engines' dedicated introspection
// APIs; the inline blocks only hold a generic `exec(sql)` handle, so
// this helper derives the same two schema shapes from plain SQL:
//
//   - `completion` — the rich `SqlCompletionSchema` consumed by the
//     bespoke engine in `sqlCompletion.ts` (columns with types, FKs
//     for join suggestions);
//   - `langSchema` — the flat `Record<table, columns>` handed to
//     `@codemirror/lang-sql`'s built-in schema completion.
//
// Everything is best-effort: introspection failures resolve to an
// empty schema (keyword completion still works) rather than throwing.

import type {
  SqlCompletionEntity,
  SqlCompletionSchema,
  SqlDialect,
  SqlForeignKeyMeta,
} from "../sqlCompletion";

interface ResultShape {
  columns: string[];
  values: unknown[][];
}

export type SqlExec = (sql: string) => Promise<ResultShape[]>;

export interface IntrospectedSchemas {
  completion: SqlCompletionSchema;
  langSchema: Record<string, string[]>;
}

export const EMPTY_SCHEMAS: IntrospectedSchemas = {
  completion: { entities: [] },
  langSchema: {},
};

/** Rows of the last result set with columns, keyed by column name. */
function rowsOf(results: ResultShape[]): Record<string, unknown>[] {
  let last: ResultShape | null = null;
  for (const r of results) {
    if (r.columns.length > 0) last = r;
  }
  if (!last) return [];
  const { columns, values } = last;
  return values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((c, i) => {
      obj[c] = row[i];
    });
    return obj;
  });
}

const str = (v: unknown): string => (v == null ? "" : String(v));

// Column listings per dialect: rows of (tbl, col, coltype, kind) in
// definition order. SQLite reaches tables *and* views through the
// pragma table-valued functions; DuckDB and Postgres go through
// information_schema (PGlite and duckdb-wasm both support it).
function columnsSql(dialect: SqlDialect): string {
  if (dialect === "sqlite") {
    return `
      SELECT m.name AS tbl, p.name AS col, p.type AS coltype,
             CASE m.type WHEN 'view' THEN 'view' ELSE 'table' END AS kind
      FROM sqlite_master m
      JOIN pragma_table_info(m.name) p
      WHERE m.type IN ('table', 'view') AND m.name NOT LIKE 'sqlite_%'
      ORDER BY m.name, p.cid;`;
  }
  const schema = dialect === "postgres" ? "public" : "main";
  return `
    SELECT c.table_name AS tbl, c.column_name AS col, c.data_type AS coltype,
           CASE t.table_type WHEN 'VIEW' THEN 'view' ELSE 'table' END AS kind
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = '${schema}'
    ORDER BY c.table_name, c.ordinal_position;`;
}

// Foreign keys per dialect: rows of (tbl, col, ref_table, ref_col).
// DuckDB's information_schema constraint views don't expose FK column
// pairs reliably across versions, so FKs are skipped there — join
// suggestions simply fall back to matching column names.
function foreignKeysSql(dialect: SqlDialect): string | null {
  if (dialect === "sqlite") {
    return `
      SELECT m.name AS tbl, f."from" AS col, f."table" AS ref_table, f."to" AS ref_col
      FROM sqlite_master m
      JOIN pragma_foreign_key_list(m.name) f
      WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%';`;
  }
  if (dialect === "postgres") {
    return `
      SELECT tc.table_name AS tbl, kcu.column_name AS col,
             ccu.table_name AS ref_table, ccu.column_name AS ref_col
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
       AND tc.table_schema = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';`;
  }
  return null;
}

/** Build both completion schema shapes for the current database state.
 *  Never throws — failures resolve to `EMPTY_SCHEMAS`. */
export async function introspectSqlSchemas(
  exec: SqlExec,
  dialect: SqlDialect,
): Promise<IntrospectedSchemas> {
  let columnRows: Record<string, unknown>[];
  try {
    columnRows = rowsOf(await exec(columnsSql(dialect)));
  } catch {
    return EMPTY_SCHEMAS;
  }

  const entities = new Map<string, SqlCompletionEntity>();
  const langSchema: Record<string, string[]> = {};
  for (const row of columnRows) {
    const tbl = str(row.tbl);
    const col = str(row.col);
    if (!tbl || !col) continue;
    let entity = entities.get(tbl);
    if (!entity) {
      entity = {
        name: tbl,
        columns: [],
        kind: str(row.kind) === "view" ? "view" : "table",
      };
      entities.set(tbl, entity);
      langSchema[tbl] = [];
    }
    entity.columns.push({ name: col, type: str(row.coltype) || undefined });
    langSchema[tbl].push(col);
  }

  const fkSql = foreignKeysSql(dialect);
  if (fkSql) {
    try {
      for (const row of rowsOf(await exec(fkSql))) {
        const entity = entities.get(str(row.tbl));
        if (!entity) continue;
        const fk: SqlForeignKeyMeta = {
          column: str(row.col),
          refEntity: str(row.ref_table),
          refColumn: str(row.ref_col),
        };
        if (!fk.column || !fk.refEntity || !fk.refColumn) continue;
        (entity.foreignKeys ??= []).push(fk);
      }
    } catch {
      // FK metadata is a ranking nicety — carry on without it.
    }
  }

  return {
    completion: {
      entities: [...entities.values()],
      schemas: [dialect === "postgres" ? "public" : "main"],
    },
    langSchema,
  };
}
