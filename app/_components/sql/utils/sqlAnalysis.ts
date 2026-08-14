/** Strip block and line (`-- …`) comments from a SQL string. */
export function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\r\n]*/g, "");
}

/** True when `sql` is a single SELECT/WITH statement (no multi-statement
 *  semicolons); decides whether lazy LIMIT/OFFSET pagination applies. Pass
 *  `noComments` when comments are already stripped. */
export function isSingleSelectSql(sql: string, noComments?: string): boolean {
  const stripped = (noComments ?? stripSqlComments(sql))
    .trim()
    .replace(/;+\s*$/, "");
  if (stripped.includes(";")) return false;
  return /^(select|with)\s/i.test(stripped);
}

/** If `sql` is a bare `SELECT * FROM <table>` (optional trailing ORDER BY /
 *  LIMIT / OFFSET, nothing else), return the unquoted table name; else null.
 *  Such a result maps 1:1 to the table, so a hand-typed full-table preview
 *  can be made editable and edits identify rows safely. */
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
    /^select\s+\*\s+from\s+("[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)\s*(?:order\s+by\s+[\w\s",.]+?\s*)?(?:limit\s+\d+\s*)?(?:offset\s+\d+\s*)?(?:limit\s+\d+\s*)?$/i,
  );
  if (!m) return null;
  const table = m[1];
  return table.startsWith('"') && table.endsWith('"')
    ? table.slice(1, -1)
    : table;
}

/** Per-statement source table, positionally aligned with the `sets` array a
 *  multi-statement run produces: the bare-selected table name when a
 *  statement is an editable `SELECT * FROM <table>` (per `isTable`), else
 *  null. Lets each result-set tab be edited against its own table. */
export function bareTableSelectSources(
  sql: string,
  isTable: (name: string) => boolean,
): (string | null)[] {
  return splitSqlStatements(sql).map((stmt) => {
    const table = bareTableSelectSource(stmt.text);
    return table && isTable(table) ? table : null;
  });
}

/** Rebuild a (possibly multi-statement) query so the statement at `stmtIndex`
 *  is ordered by its primary key, leaving the other statements verbatim. Used
 *  after an inline cell edit so the edited row keeps its place instead of
 *  jumping to the bottom, Postgres and DuckDB move an updated row to the end of
 *  the heap under MVCC, so an unordered re-fetch surfaces it last.
 *
 *  Only a bare `SELECT * FROM <table>` with no existing ORDER BY *and no
 *  LIMIT/OFFSET* is rewritten: appending `ORDER BY <pk>` then returns the same
 *  rows in a stable order. A LIMIT/OFFSET query is left untouched, ordering it
 *  would change *which* rows the window shows (the chosen rows are arbitrary
 *  without an ORDER BY), so that's left as the engine returns it. The rewrite
 *  stays a bare select (ORDER BY included), so the set is still detected as
 *  editable on re-fetch. */
export function orderEditedStatementByPk(
  querySql: string,
  stmtIndex: number,
  pkCols: string[],
): string {
  const stmts = splitSqlStatements(querySql);
  if (stmtIndex < 0 || stmtIndex >= stmts.length || pkCols.length === 0) {
    return querySql;
  }
  const statement = stmts[stmtIndex].text;
  if (!bareTableSelectSource(statement)) return querySql;
  const noComments = stripSqlComments(statement);
  if (/\b(?:order\s+by|limit|offset)\b/i.test(noComments)) return querySql;
  const orderBy = pkCols.map((c) => `"${c.replace(/"/g, '""')}"`).join(", ");
  const ordered = `${statement.trim()} ORDER BY ${orderBy}`;
  return stmts.map((s, i) => (i === stmtIndex ? ordered : s.text)).join(";\n");
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
