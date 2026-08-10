"use client";

// Schema snapshot for the learn-route SQL surfaces (`SqlCodeBlock`,
// `SqlChallengeCard`) — the data behind the header's tools menu:
// the ER diagram, the DDL viewer, and the Excel export's sheet list.
//
// The full playgrounds read this from their engines' dedicated
// introspection APIs (`listColumns`, `listForeignKeys`, `getDDL`). The
// inline cards hold nothing but a generic `exec(sql)` handle, exactly
// as `schemaIntrospect.ts` found for autocompletion, so everything here
// is derived from plain SQL against the three dialects' catalogs.
//
// Failures are contained per section: a dialect that cannot answer the
// foreign-key query still yields tables and columns, and the diagram
// simply draws no edges.

import type {
  ForeignKeyInfo,
  TableColumnInfo,
} from "../runtime/sqlite-core";
import type { SqlDialect } from "../sql/sqlCompletion";

interface ResultShape {
  columns: string[];
  values: unknown[][];
}

export type SqlExec = (sql: string) => Promise<ResultShape[]>;

export interface SqlSchemaSnapshot {
  /** Base tables in the default schema, alphabetical. */
  tables: string[];
  /** Views in the default schema, alphabetical. */
  views: string[];
  columnsByEntity: Record<string, TableColumnInfo[]>;
  foreignKeysByEntity: Record<string, ForeignKeyInfo[]>;
}

export const EMPTY_SNAPSHOT: SqlSchemaSnapshot = {
  tables: [],
  views: [],
  columnsByEntity: {},
  foreignKeysByEntity: {},
};

/** Rows of the last result set that has columns, keyed by column name. */
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
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
// Postgres reports booleans as `true`/`false`, DuckDB as `true`, SQLite's
// pragmas as 1/0, and information_schema's nullability as "YES"/"NO".
const bool = (v: unknown): boolean =>
  v === true || v === 1 || /^(1|t|true|yes)$/i.test(str(v));

export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Single-quote a string for embedding in a catalog query's WHERE. */
function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function defaultSchemaOf(dialect: SqlDialect): string {
  return dialect === "postgres" ? "public" : "main";
}

// ─── Entity list ─────────────────────────────────────────────────────

function entitiesSql(dialect: SqlDialect): string {
  if (dialect === "sqlite") {
    return `SELECT name AS entity, type AS kind
            FROM sqlite_master
            WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'
            ORDER BY name;`;
  }
  const schema = quoteLiteral(defaultSchemaOf(dialect));
  return `SELECT table_name AS entity,
                 CASE table_type WHEN 'VIEW' THEN 'view' ELSE 'table' END AS kind
          FROM information_schema.tables
          WHERE table_schema = ${schema}
          ORDER BY table_name;`;
}

// ─── Columns ─────────────────────────────────────────────────────────

function columnsSql(dialect: SqlDialect): string {
  if (dialect === "sqlite") {
    // `pragma_table_info` reaches views as well as tables, and carries
    // the pk ordinal the ER node needs for its key glyphs.
    return `SELECT m.name AS entity, p.cid AS cid, p.name AS col, p.type AS coltype,
                   p."notnull" AS notnull, p.dflt_value AS dflt, p.pk AS pk
            FROM sqlite_master m
            JOIN pragma_table_info(m.name) p
            WHERE m.type IN ('table', 'view') AND m.name NOT LIKE 'sqlite_%'
            ORDER BY m.name, p.cid;`;
  }
  const schema = quoteLiteral(defaultSchemaOf(dialect));
  // The primary-key ordinal comes from a left join onto the PK
  // constraint's key_column_usage rows, which both PGlite and duckdb-wasm
  // expose; `pk` stays 0 when a column isn't part of one.
  return `SELECT c.table_name AS entity, c.ordinal_position AS cid,
                 c.column_name AS col, c.data_type AS coltype,
                 c.is_nullable AS nullable, c.column_default AS dflt,
                 COALESCE(k.ordinal_position, 0) AS pk
          FROM information_schema.columns c
          LEFT JOIN (
            SELECT kcu.table_name, kcu.column_name, kcu.ordinal_position
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
              AND tc.table_schema = ${schema}
          ) k ON k.table_name = c.table_name AND k.column_name = c.column_name
          WHERE c.table_schema = ${schema}
          ORDER BY c.table_name, c.ordinal_position;`;
}

// A dialect whose catalog refuses the PK join still has usable columns,
// so the introspection retries without it before giving up.
function columnsFallbackSql(dialect: SqlDialect): string | null {
  if (dialect === "sqlite") return null;
  const schema = quoteLiteral(defaultSchemaOf(dialect));
  return `SELECT table_name AS entity, ordinal_position AS cid,
                 column_name AS col, data_type AS coltype,
                 is_nullable AS nullable, column_default AS dflt, 0 AS pk
          FROM information_schema.columns
          WHERE table_schema = ${schema}
          ORDER BY table_name, ordinal_position;`;
}

// ─── Foreign keys ────────────────────────────────────────────────────

// DuckDB's constraint views don't expose FK column pairs reliably across
// versions (the same gap `schemaIntrospect.ts` works around), so its ER
// diagram draws tables without edges rather than wrong ones.
function foreignKeysSql(dialect: SqlDialect): string | null {
  if (dialect === "sqlite") {
    return `SELECT m.name AS entity, f."from" AS col, f."table" AS ref_table,
                   f."to" AS ref_col, f.on_delete AS on_delete, f.on_update AS on_update
            FROM sqlite_master m
            JOIN pragma_foreign_key_list(m.name) f
            WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%';`;
  }
  if (dialect === "postgres") {
    return `SELECT tc.table_name AS entity, kcu.column_name AS col,
                   ccu.table_name AS ref_table, ccu.column_name AS ref_col,
                   rc.delete_rule AS on_delete, rc.update_rule AS on_update
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
              ON tc.constraint_name = ccu.constraint_name
             AND tc.table_schema = ccu.table_schema
            JOIN information_schema.referential_constraints rc
              ON rc.constraint_name = tc.constraint_name
             AND rc.constraint_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';`;
  }
  return null;
}

/** Read tables, views, columns and foreign keys for the card's database.
 *  Never throws — a catalog the engine can't answer yields an empty
 *  section rather than failing the whole snapshot. */
export async function readSqlSchemaSnapshot(
  exec: SqlExec,
  dialect: SqlDialect,
): Promise<SqlSchemaSnapshot> {
  const tables: string[] = [];
  const views: string[] = [];
  try {
    for (const row of rowsOf(await exec(entitiesSql(dialect)))) {
      const name = str(row.entity);
      if (!name) continue;
      (str(row.kind) === "view" ? views : tables).push(name);
    }
  } catch {
    return EMPTY_SNAPSHOT;
  }

  const columnsByEntity: Record<string, TableColumnInfo[]> = {};
  let columnRows: Record<string, unknown>[] = [];
  try {
    columnRows = rowsOf(await exec(columnsSql(dialect)));
  } catch {
    const fallback = columnsFallbackSql(dialect);
    if (fallback) {
      try {
        columnRows = rowsOf(await exec(fallback));
      } catch {
        columnRows = [];
      }
    }
  }
  for (const row of columnRows) {
    const entity = str(row.entity);
    const col = str(row.col);
    if (!entity || !col) continue;
    (columnsByEntity[entity] ??= []).push({
      cid: num(row.cid),
      name: col,
      type: str(row.coltype),
      // SQLite reports the constraint directly; information_schema
      // reports the inverse ("YES" when the column *is* nullable).
      notNull:
        dialect === "sqlite" ? bool(row.notnull) : str(row.nullable).toUpperCase() === "NO",
      defaultValue: row.dflt == null ? null : str(row.dflt),
      pk: num(row.pk),
      generated: null,
    });
  }

  const foreignKeysByEntity: Record<string, ForeignKeyInfo[]> = {};
  const fkSql = foreignKeysSql(dialect);
  if (fkSql) {
    try {
      for (const row of rowsOf(await exec(fkSql))) {
        const entity = str(row.entity);
        const from = str(row.col);
        const table = str(row.ref_table);
        const to = str(row.ref_col);
        if (!entity || !from || !table || !to) continue;
        (foreignKeysByEntity[entity] ??= []).push({
          from,
          table,
          to,
          onDelete: str(row.on_delete) || "NO ACTION",
          onUpdate: str(row.on_update) || "NO ACTION",
        });
      }
    } catch {
      // Edge metadata only; the diagram still draws every table.
    }
  }

  return { tables, views, columnsByEntity, foreignKeysByEntity };
}

// ─── DDL ─────────────────────────────────────────────────────────────

/** The `CREATE` statements for one entity.
 *
 *  SQLite and DuckDB store the original text in their catalogs, so they
 *  hand back what the lesson's own setup SQL wrote. Postgres keeps no
 *  such text, so its table DDL is reconstructed from the snapshot the
 *  same way `runtime/postgres.ts` reconstructs it for the playground. */
export async function readEntityDdl(
  exec: SqlExec,
  dialect: SqlDialect,
  entity: string,
  snapshot: SqlSchemaSnapshot,
): Promise<string> {
  const name = quoteLiteral(entity);
  if (dialect === "sqlite") {
    const rows = rowsOf(
      await exec(`SELECT sql FROM sqlite_master WHERE name = ${name} AND sql IS NOT NULL;`),
    );
    const sql = rows.length > 0 ? str(rows[0].sql) : "";
    return sql ? `${sql.trimEnd().replace(/;$/, "")};` : "";
  }
  if (dialect === "duckdb") {
    const rows = rowsOf(
      await exec(
        `SELECT sql FROM duckdb_tables() WHERE table_name = ${name}
         UNION ALL
         SELECT sql FROM duckdb_views() WHERE view_name = ${name};`,
      ),
    );
    const sql = rows.length > 0 ? str(rows[0].sql) : "";
    if (sql) return `${sql.trimEnd().replace(/;$/, "")};`;
    return buildCreateTableDdl(dialect, entity, snapshot);
  }

  // Postgres: views come back verbatim from pg_views; tables are rebuilt.
  if (snapshot.views.includes(entity)) {
    try {
      const rows = rowsOf(
        await exec(`SELECT definition FROM pg_views WHERE viewname = ${name} AND schemaname = 'public';`),
      );
      const def = rows.length > 0 ? str(rows[0].definition) : "";
      if (def) return `CREATE VIEW ${quoteIdent(entity)} AS\n${def.trim()}`;
    } catch {
      // Fall through to the reconstructed form.
    }
  }
  return buildCreateTableDdl(dialect, entity, snapshot);
}

/** Reconstruct a `CREATE TABLE` from the snapshot's columns, primary key
 *  and foreign keys. Used for Postgres (which stores no DDL text) and as
 *  the fallback anywhere a catalog lookup comes back empty. */
export function buildCreateTableDdl(
  dialect: SqlDialect,
  entity: string,
  snapshot: SqlSchemaSnapshot,
): string {
  const cols = snapshot.columnsByEntity[entity] ?? [];
  if (cols.length === 0) return "";
  const lines = cols.map((col) => {
    const parts = [quoteIdent(col.name)];
    if (col.type) parts.push(col.type);
    if (col.notNull) parts.push("NOT NULL");
    if (col.defaultValue) parts.push(`DEFAULT ${col.defaultValue}`);
    return `  ${parts.join(" ")}`;
  });
  const pk = cols.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk);
  if (pk.length > 0) {
    lines.push(`  PRIMARY KEY (${pk.map((c) => quoteIdent(c.name)).join(", ")})`);
  }
  for (const fk of snapshot.foreignKeysByEntity[entity] ?? []) {
    lines.push(
      `  FOREIGN KEY (${quoteIdent(fk.from)}) REFERENCES ${quoteIdent(fk.table)}(${quoteIdent(fk.to)})`,
    );
  }
  const qualified =
    dialect === "postgres"
      ? `${quoteIdent("public")}.${quoteIdent(entity)}`
      : quoteIdent(entity);
  return `CREATE TABLE ${qualified} (\n${lines.join(",\n")}\n);`;
}

/** Every entity's DDL, in table-then-view order, joined into one
 *  document — what the "View DDL" dialog shows for the whole database. */
export async function readSchemaDdl(
  exec: SqlExec,
  dialect: SqlDialect,
  snapshot: SqlSchemaSnapshot,
): Promise<string> {
  const chunks: string[] = [];
  for (const entity of [...snapshot.tables, ...snapshot.views]) {
    let ddl = "";
    try {
      ddl = await readEntityDdl(exec, dialect, entity, snapshot);
    } catch {
      ddl = buildCreateTableDdl(dialect, entity, snapshot);
    }
    if (ddl.trim()) chunks.push(ddl.trim());
  }
  return chunks.join("\n\n");
}
