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

/** Removes the last top-level ORDER BY clause (and everything after it up
 *  to, but not including, any trailing LIMIT/OFFSET) from a SQL string so
 *  that a different ORDER BY can be appended safely.
 *
 *  "Top-level" means the clause is not nested inside parentheses,
 *  single-quoted string literals, or double-quoted identifiers.  ORDER BY
 *  clauses that appear inside subqueries (i.e. inside parentheses) are left
 *  untouched.
 *
 *  Returns the original string unchanged when no top-level ORDER BY is
 *  found. */
export function stripTopLevelOrderBy(sql: string): string {
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let orderByPos = -1;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    if (inSingle) {
      if (ch === "'") {
        if (sql[i + 1] === "'") i++; // '' escape inside single-quoted string
        else inSingle = false;
      }
      continue;
    }
    if (inDouble) {
      if (ch === '"') {
        if (sql[i + 1] === '"') i++; // "" escape inside double-quoted identifier
        else inDouble = false;
      }
      continue;
    }

    if (ch === "'") { inSingle = true; continue; }
    if (ch === '"') { inDouble = true; continue; }
    if (ch === "(") { depth++; continue; }
    if (ch === ")") { depth--; continue; }

    if (depth === 0 && /^ORDER\s+BY\b/i.test(sql.slice(i))) {
      orderByPos = i;
      // Continue scanning — we want the last top-level ORDER BY occurrence.
    }
  }

  if (orderByPos === -1) return sql;
  return sql.slice(0, orderByPos).trimEnd();
}
