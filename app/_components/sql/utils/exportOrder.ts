/** Depth-first topological sort for SQL-dump export: a dump with inline
 *  `FOREIGN KEY … REFERENCES` constraints only re-imports if every
 *  referenced table is created first ("relation … does not exist"
 *  otherwise). On a cycle it breaks the back-edge and falls back to input
 *  order rather than looping. */
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

/** Format a cell value as a SQL literal for a dump's INSERT, using the
 *  column's declared type. Booleans are emitted as TRUE/FALSE — the
 *  adapters coerce them to 0/1, which Postgres rejects for a `boolean`
 *  column; numbers pass through; binary becomes a `'\x…'` hex literal;
 *  everything else is single-quoted with `'` doubled. */
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
