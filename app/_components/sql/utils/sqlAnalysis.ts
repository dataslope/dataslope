/** Strip block and line (`-- …`) comments from a SQL string. */
export function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\r\n]*/g, "");
}

/** Returns true when `sql` appears to be a single SELECT or CTE statement
 *  (no multi-statement semicolons, starts with SELECT or WITH). Used to
 *  decide whether lazy LIMIT/OFFSET pagination is applicable.
 *  Pass `noComments` (the result of `stripSqlComments(sql)`) when you have
 *  already stripped comments to avoid redundant work. */
export function isSingleSelectSql(sql: string, noComments?: string): boolean {
  const stripped = (noComments ?? stripSqlComments(sql))
    .trim()
    .replace(/;+\s*$/, "");
  if (stripped.includes(";")) return false;
  return /^(select|with)\s/i.test(stripped);
}

/** If `sql` is a bare single-table `SELECT * FROM <table>` (optionally with
 *  a trailing LIMIT / OFFSET, and nothing else — no WHERE, JOIN, ORDER BY,
 *  GROUP BY, comma-joins, subqueries, or multiple statements), return the
 *  unquoted table name. Used to make a hand-typed full-table preview
 *  editable, exactly like opening the table from the sidebar: because the
 *  row order matches the table's natural order, the result maps 1:1 to the
 *  table and edits identify rows safely. Returns null for anything else.
 *  Pass `noComments` (the result of `stripSqlComments(sql)`) when available. */
export function bareTableSelectSource(
  sql: string,
  noComments?: string,
): string | null {
  const s = (noComments ?? stripSqlComments(sql))
    .trim()
    .replace(/;+\s*$/, "")
    .trim();
  if (!s || s.includes(";")) return null;
  const m = s.match(
    /^select\s+\*\s+from\s+("[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)\s*(?:limit\s+\d+\s*)?(?:offset\s+\d+\s*)?(?:limit\s+\d+\s*)?$/i,
  );
  if (!m) return null;
  const table = m[1];
  return table.startsWith('"') && table.endsWith('"')
    ? table.slice(1, -1)
    : table;
}

/** Returns true when `sql` already contains a LIMIT keyword (after
 *  stripping comments and single-quoted string literals). When true, lazy
 *  pagination is skipped: appending another LIMIT would produce invalid SQL.
 *  Single-quoted strings are stripped first so a value like `'No limit'`
 *  does not trigger a false positive.
 *  Pass `noComments` (the result of `stripSqlComments(sql)`) when you have
 *  already stripped comments to avoid redundant work. */
export function hasLimitClause(sqlOrNoComments: string): boolean {
  const noStrings = sqlOrNoComments.replace(/'(?:''|[^'])*'/g, "''");
  return /\blimit\b/i.test(noStrings);
}
