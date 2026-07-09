/** Ordering helper for SQL-dump export.
 *
 *  A dump that emits `CREATE TABLE` with *inline* `FOREIGN KEY … REFERENCES`
 *  constraints (as the Postgres and DuckDB exporters do) only re-imports if
 *  every referenced table is created before the table that references it.
 *  Emitting tables in catalog/alphabetical order breaks this, e.g. `cards`
 *  references `users`, but sorts first, so the import fails with
 *  `relation "users" does not exist`.
 *
 *  This does a depth-first topological sort so each table is emitted after the
 *  tables it depends on. On a dependency cycle (which inline FKs cannot express
 *  anyway) it breaks the back-edge and falls back to input order for the cycle
 *  members rather than looping. Pure + dependency-free for easy unit testing. */
export function topoSortByForeignKeys(
  tables: readonly string[],
  referencedTables: (table: string) => readonly string[],
): string[] {
  const present = new Set(tables);
  const visited = new Set<string>();
  const onStack = new Set<string>();
  const out: string[] = [];

  const visit = (table: string) => {
    if (visited.has(table) || onStack.has(table)) return;
    onStack.add(table);
    for (const dep of referencedTables(table)) {
      // Ignore self-references and FKs to tables outside this dump.
      if (dep !== table && present.has(dep)) visit(dep);
    }
    onStack.delete(table);
    visited.add(table);
    out.push(table);
  };

  for (const table of tables) visit(table);
  return out;
}

/** Format a single cell value as a SQL literal for a dump's INSERT, using the
 *  column's declared type so the literal re-imports cleanly.
 *
 *  The adapters flatten some values in a way that's fine for display but wrong
 *  as a raw literal, most importantly booleans are coerced to `0`/`1`, which
 *  Postgres rejects for a `boolean` column ("expression is of type integer").
 *  Booleans are therefore emitted as `TRUE`/`FALSE` based on the column type;
 *  numbers pass through; binary becomes a `'\x…'` hex literal; everything else
 *  is single-quoted with `'` doubled. */
export function formatSqlDumpValue(
  value: unknown,
  columnType: string | undefined,
): string {
  if (value === null || value === undefined) return "NULL";
  const t = (columnType ?? "").toLowerCase();
  if (/\bbool/.test(t) || t === "boolean") {
    const truthy =
      value === true ||
      value === 1 ||
      value === "1" ||
      value === "true" ||
      value === "t";
    return truthy ? "TRUE" : "FALSE";
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  if (value instanceof Uint8Array) {
    const hex = Array.from(value)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `'\\x${hex}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}
