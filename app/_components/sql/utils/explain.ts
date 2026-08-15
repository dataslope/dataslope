// Pure helpers for the "Explain" action (show a query's execution plan),
// shared by the SQLite / Postgres / DuckDB playgrounds. Kept free of React /
// engine imports so the SQL generation and plan formatting are unit-testable.

import type { SqlDialectId } from "./ddl";

/** Optional EXPLAIN modifiers. Postgres only: `ANALYZE` *runs* the statement
 *  to report real timings and row counts, and `BUFFERS` adds shared-buffer
 *  hit/read counts (which needs ANALYZE to mean anything). */
export interface ExplainOptions {
  analyze?: boolean;
  buffers?: boolean;
}

/** Build the engine-appropriate EXPLAIN statement for `sql`.
 *
 *  - SQLite: plain `EXPLAIN` returns VM bytecode, so we use the
 *    human-readable `EXPLAIN QUERY PLAN`.
 *  - Postgres / DuckDB: plain `EXPLAIN` by default, which *plans* the
 *    statement without executing it, so it's safe even for DML. Postgres also
 *    accepts `ANALYZE` / `BUFFERS` via `opts` — those do execute the
 *    statement, so the caller is responsible for warning about that.
 *
 *  A trailing `;` is tolerated, and an already-`EXPLAIN`-prefixed statement is
 *  passed through unchanged so the user can't double-wrap it. */
export function buildExplainSql(
  dialect: SqlDialectId,
  sql: string,
  opts: ExplainOptions = {},
): string {
  const stmt = sql.trim().replace(/;+\s*$/, "").trim();
  if (/^explain\b/i.test(stmt)) return stmt;
  if (dialect === "sqlite") return `EXPLAIN QUERY PLAN ${stmt}`;
  if (dialect === "postgres") {
    const flags: string[] = [];
    if (opts.analyze) flags.push("ANALYZE");
    // BUFFERS without ANALYZE is accepted but reports nothing useful, so it
    // implies ANALYZE rather than silently producing an empty section.
    if (opts.buffers) {
      if (!opts.analyze) flags.push("ANALYZE");
      flags.push("BUFFERS");
    }
    if (flags.length > 0) return `EXPLAIN (${flags.join(", ")}) ${stmt}`;
  }
  return `EXPLAIN ${stmt}`;
}

/** Format the rows an EXPLAIN query returns into readable plan text for the
 *  plan viewer's `<pre>`.
 *
 *  The shape differs per engine: Postgres returns a single `QUERY PLAN` text
 *  column (one plan line per row); SQLite `EXPLAIN QUERY PLAN` returns
 *  `(id, parent, notused, detail)`; DuckDB returns the plan (an ASCII tree) in
 *  its column(s). When a `detail` column is present (SQLite) we show just that;
 *  otherwise each row's non-null cells are joined, then rows by newlines,
 *  which renders all three readably (DuckDB's embedded newlines included). */
export function formatExplainResult(
  columns: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<unknown>>,
): string {
  if (rows.length === 0) return "(no plan returned)";
  const detailIdx = columns.findIndex((c) => c.toLowerCase() === "detail");
  if (detailIdx >= 0) {
    return rows.map((r) => String(r[detailIdx] ?? "")).join("\n");
  }
  return rows
    .map((row) =>
      row
        .map((cell) =>
          cell === null || cell === undefined ? "" : String(cell),
        )
        .join("  ")
        .trimEnd(),
    )
    .join("\n");
}
