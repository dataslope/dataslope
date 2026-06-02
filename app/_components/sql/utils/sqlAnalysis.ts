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

/** A single top-level SQL statement with its offsets in the source string. */
export interface SqlStatementRange {
  /** Trimmed statement text (no surrounding whitespace, no trailing `;`). */
  text: string;
  /** Offset of the statement's first non-whitespace character. */
  from: number;
  /** Offset just past the statement's last non-whitespace character. */
  to: number;
}

/** Split SQL into top-level statements with their source offsets, respecting
 *  string literals (`'…'` with `''` escapes), double-quoted identifiers
 *  (`"…"`), line (`-- …`) and block (`/* … *\/`) comments, and Postgres
 *  dollar-quoted bodies (`$tag$ … $tag$`). Semicolons inside any of those are
 *  ignored; empty / whitespace-only segments are skipped. Used to run just the
 *  statement under the editor cursor. */
export function splitSqlStatements(sql: string): SqlStatementRange[] {
  const out: SqlStatementRange[] = [];
  const len = sql.length;
  let i = 0;
  let segStart = 0;

  const pushSegment = (rawStart: number, rawEnd: number) => {
    let s = rawStart;
    let e = rawEnd;
    while (s < e && /\s/.test(sql[s])) s++;
    while (e > s && /\s/.test(sql[e - 1])) e--;
    if (e > s) out.push({ text: sql.slice(s, e), from: s, to: e });
  };

  while (i < len) {
    const ch = sql[i];
    const next = i + 1 < len ? sql[i + 1] : "";
    if (ch === "-" && next === "-") {
      const eol = sql.indexOf("\n", i);
      i = eol === -1 ? len : eol;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? len : end + 2;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const quote = ch;
      i += 1;
      while (i < len) {
        if (sql[i] === quote) {
          if (sql[i + 1] === quote) {
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    if (ch === "$") {
      // Dollar-quote tags are empty or a valid identifier (never digit-led),
      // so `$1` positional params don't open a quote.
      const m = /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (m) {
        const tag = m[0];
        const close = sql.indexOf(tag, i + tag.length);
        i = close === -1 ? len : close + tag.length;
        continue;
      }
    }
    if (ch === ";") {
      pushSegment(segStart, i);
      i += 1;
      segStart = i;
      continue;
    }
    i += 1;
  }
  pushSegment(segStart, len);
  return out;
}

/** Return the statement containing `cursorPos` (endpoints inclusive). For a
 *  cursor in the whitespace/`;` between statements, returns the last statement
 *  starting at or before it; returns null when there is no statement. */
export function statementAtCursor(
  sql: string,
  cursorPos: number,
): SqlStatementRange | null {
  const stmts = splitSqlStatements(sql);
  if (stmts.length === 0) return null;
  for (const st of stmts) {
    if (cursorPos >= st.from && cursorPos <= st.to) return st;
  }
  let chosen = stmts[0];
  for (const st of stmts) {
    if (st.from <= cursorPos) chosen = st;
    else break;
  }
  return chosen;
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
