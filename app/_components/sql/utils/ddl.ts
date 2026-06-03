// Pure, dialect-aware builders for the "Create Index" / "Create View"
// schema-tree actions shared by the SQLite, Postgres and DuckDB
// playgrounds. Kept free of React / engine imports so the SQL
// generation can be exhaustively unit-tested in isolation.

export type SqlDialectId = "sqlite" | "postgres" | "duckdb";

/** Double-quote an identifier, escaping any embedded double quotes.
 *  All three engines accept standard double-quoted identifiers. */
export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export interface CreateIndexOptions {
  indexName: string;
  table: string;
  /** Columns to index, in the order they should appear in the index. */
  columns: readonly string[];
  unique?: boolean;
  /** Emit `IF NOT EXISTS` so re-running is a no-op instead of an error.
   *  Defaults to `true`. */
  ifNotExists?: boolean;
}

/** Build a `CREATE [UNIQUE] INDEX [IF NOT EXISTS] "name" ON "table"
 *  ("c1", "c2")` statement. The syntax is identical across SQLite,
 *  PostgreSQL and DuckDB, so no dialect argument is needed. */
export function buildCreateIndexSql(opts: CreateIndexOptions): string {
  const name = opts.indexName.trim();
  const table = opts.table.trim();
  const columns = opts.columns.map((c) => c.trim()).filter(Boolean);
  if (!name) throw new Error("Index name is required.");
  if (!table) throw new Error("A table is required.");
  if (columns.length === 0) throw new Error("Select at least one column.");
  const unique = opts.unique ? "UNIQUE " : "";
  const ifNotExists = opts.ifNotExists === false ? "" : "IF NOT EXISTS ";
  const cols = columns.map(quoteIdent).join(", ");
  return `CREATE ${unique}INDEX ${ifNotExists}${quoteIdent(name)} ON ${quoteIdent(table)} (${cols});`;
}

/** Suggest a conventional index name from the table + columns, e.g.
 *  `idx_users_email` or (for a unique index) `uq_users_email`. Names are
 *  lower-cased, non-identifier characters collapse to `_`, and the
 *  result is length-capped so a many-column composite stays readable. */
export function suggestIndexName(
  table: string,
  columns: readonly string[],
  unique = false,
): string {
  const sanitize = (part: string): string =>
    part
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");
  const prefix = unique ? "uq" : "idx";
  const meaningful = [sanitize(table), ...columns.map(sanitize)].filter(Boolean);
  if (meaningful.length === 0) return `${prefix}_index`;
  return [prefix, ...meaningful].join("_").replace(/_+/g, "_").slice(0, 60);
}

export interface CreateViewOptions {
  viewName: string;
  /** The `SELECT …` body of the view (a trailing `;` is tolerated). */
  selectBody: string;
  dialect: SqlDialectId;
  /** Replace an existing view of the same name. Postgres and DuckDB use
   *  `CREATE OR REPLACE VIEW`; SQLite has no such form, so it is
   *  emulated with `DROP VIEW IF EXISTS` followed by `CREATE VIEW`. */
  orReplace?: boolean;
}

/** Build a `CREATE [OR REPLACE] VIEW "name" AS <select>` statement,
 *  handling the SQLite/Postgres/DuckDB divergence around replacement. */
export function buildCreateViewSql(opts: CreateViewOptions): string {
  const name = opts.viewName.trim();
  const body = opts.selectBody.trim().replace(/;\s*$/, "").trim();
  if (!name) throw new Error("View name is required.");
  if (!body) throw new Error("The view's SELECT statement is required.");
  if (opts.orReplace) {
    if (opts.dialect === "sqlite") {
      // SQLite has no CREATE OR REPLACE VIEW; emulate it.
      return `DROP VIEW IF EXISTS ${quoteIdent(name)};\nCREATE VIEW ${quoteIdent(name)} AS\n${body};`;
    }
    return `CREATE OR REPLACE VIEW ${quoteIdent(name)} AS\n${body};`;
  }
  return `CREATE VIEW ${quoteIdent(name)} AS\n${body};`;
}

/** Heuristic: does this text look like a statement a view can wrap
 *  (`SELECT …` or a `WITH …` CTE)? Used to decide whether to prefill the
 *  Create View body from the active editor. */
export function looksLikeViewBody(text: string): boolean {
  return /^\s*(select|with)\b/i.test(text);
}
