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
