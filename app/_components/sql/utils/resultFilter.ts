/** Pure helpers for the result-grid in-grid filter ("find in results").
 *
 *  The filter is a *view* over an already-materialized result set: it narrows
 *  which rows the grid displays and paginates, matching the text the user sees
 *  in each cell (via `formatCellValue`). It never touches the database, so it
 *  is engine-independent and behaves identically for SQLite, Postgres and
 *  DuckDB, and it leaves the export paths (which operate on the full result)
 *  untouched.
 *
 *  Matching is a case-insensitive substring test. A leading `column:` prefix
 *, where `column` names a real column in the result, scopes the match to
 *  that single column; otherwise the term is matched against every column.
 *  Because the prefix only activates when it names an existing column, a value
 *  that merely contains a colon (a `12:30` time, or free text like `note: hi`
 *  when there is no `note` column) is treated as a plain whole-string term and
 *  is never silently swallowed. */

import { formatCellValue } from "./cellUtils";

export interface ParsedResultFilter {
  /** Lower-cased column name to scope the match to, or `null` to match any
   *  column. */
  column: string | null;
  /** Lower-cased search term. An empty term means "match everything". */
  term: string;
}

// A column prefix is an identifier (letter/underscore start) followed by a
// colon. The term after the colon may contain anything, including more colons.
const COLUMN_PREFIX = /^([A-Za-z_][\w$]*)\s*:\s*([\s\S]*)$/;

/** Parse the raw filter text into a column scope (if it names a real column)
 *  and a search term. */
export function parseResultFilter(
  raw: string,
  columnNames: readonly string[],
): ParsedResultFilter {
  const trimmed = raw.trim();
  if (!trimmed) return { column: null, term: "" };
  const m = COLUMN_PREFIX.exec(trimmed);
  if (m) {
    const col = m[1].toLowerCase();
    if (columnNames.some((c) => c.toLowerCase() === col)) {
      return { column: col, term: m[2].trim().toLowerCase() };
    }
  }
  return { column: null, term: trimmed.toLowerCase() };
}

/** Does a single row match the parsed filter? A blank term matches every row
 *  (so the grid doesn't flash empty while the user is still typing, e.g. right
 *  after "name:"). */
export function rowMatchesResultFilter(
  row: readonly unknown[],
  columnNames: readonly string[],
  parsed: ParsedResultFilter,
): boolean {
  if (!parsed.term) return true;
  if (parsed.column !== null) {
    const col = parsed.column;
    const ci = columnNames.findIndex((c) => c.toLowerCase() === col);
    if (ci < 0) return true;
    return formatCellValue(row[ci]).toLowerCase().includes(parsed.term);
  }
  for (let i = 0; i < row.length; i++) {
    if (formatCellValue(row[i]).toLowerCase().includes(parsed.term)) {
      return true;
    }
  }
  return false;
}

/** Return the indices (into `values`) of the rows that match `raw`, preserving
 *  the original order. A blank query returns every index. */
export function filterResultRowIndices(
  values: readonly (readonly unknown[])[],
  columnNames: readonly string[],
  raw: string,
): number[] {
  const parsed = parseResultFilter(raw, columnNames);
  const out: number[] = [];
  if (!parsed.term) {
    for (let i = 0; i < values.length; i++) out.push(i);
    return out;
  }
  for (let i = 0; i < values.length; i++) {
    if (rowMatchesResultFilter(values[i], columnNames, parsed)) out.push(i);
  }
  return out;
}

/** Whether the in-grid (client-side) filter can be offered for a result set,
 *  i.e. the *whole* result is already in memory, so filtering its rows is
 *  complete and correct.
 *
 *  Always true for a materialized (non-lazy) result. For an engine-paged
 *  "lazy" result it is true only when the loaded rows cover the entire result
 *  starting at offset 0: a single page that happened to fit the whole result
 *  (rows ≤ the page size), or an "All"/infinite result that has been fully
 *  loaded. A partially-loaded lazy result returns false, filtering only the
 *  loaded window would mislead the user; covering it needs a SQL `WHERE`
 *  pushdown (a separate change). */
export function canClientFilterResult(params: {
  isLazy: boolean;
  loadedRows: number;
  totalRows: number;
  startIdx: number;
}): boolean {
  const { isLazy, loadedRows, totalRows, startIdx } = params;
  if (!isLazy) return true;
  return startIdx === 0 && loadedRows >= totalRows;
}

// ────────────────────────────────────────────────────────────────────────
// Server-side filter pushdown (for engine-paged / "lazy" results)
//
// When the whole result isn't in memory, filtering it client-side would only
// see the loaded window. Instead, like DBeaver, we wrap the original query
// as a subquery and push the filter down as a native SQL predicate, re-paged
// through the engine so infinite scroll is preserved. The match is a
// case-insensitive substring per column (LIKE on SQLite, ILIKE on Postgres /
// DuckDB), with the same `column:term` scoping as the client-side filter.
// ────────────────────────────────────────────────────────────────────────

export type SqlDialect = "sqlite" | "postgres" | "duckdb";

/** Map the human-readable engine label shown in the UI to a SQL dialect. */
export function dialectFromEngineLabel(label: string | undefined): SqlDialect {
  const l = (label ?? "").toLowerCase();
  if (l.includes("postgres")) return "postgres";
  if (l.includes("duck")) return "duckdb";
  return "sqlite";
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Escape the LIKE metacharacters (`\`, `%`, `_`) in a search term so they are
 *  matched literally; the caller wraps the result in `%…%` and adds
 *  `ESCAPE '\'`. */
function escapeLikeTerm(term: string): string {
  return term.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/** Render a JS string as a single-quoted SQL string literal (doubling embedded
 *  single quotes). Together with `escapeLikeTerm` this keeps arbitrary user
 *  text injection-safe when inlined into the generated SQL. */
function sqlStringLiteral(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

/** Build a SQL boolean condition (without a leading `WHERE`) that reproduces
 *  the in-grid filter as a server-side predicate, for pushing down into an
 *  engine-paged query. Returns `null` when the filter has no term (the caller
 *  should query without a `WHERE`).
 *
 *  - Case-insensitive substring per column via `LIKE` (SQLite, ASCII
 *    case-insensitive) or `ILIKE` (Postgres, DuckDB), against `CAST(col AS …)`
 *    so non-text columns are searchable too.
 *  - A leading `column:term` (when `column` names a real result column) scopes
 *    the match to that one column; otherwise the term is matched against every
 *    column with `OR`.
 *  - The term is escaped for both the SQL string literal and `LIKE` wildcards
 *    (`ESCAPE '\'`), so arbitrary text, quotes, `%`, `_`, is literal and
 *    injection-safe. */
export function buildResultFilterWhere(
  columnNames: readonly string[],
  raw: string,
  dialect: SqlDialect,
): string | null {
  const parsed = parseResultFilter(raw, columnNames);
  if (!parsed.term) return null;

  const targets =
    parsed.column !== null
      ? columnNames.filter((c) => c.toLowerCase() === parsed.column)
      : [...columnNames];
  if (targets.length === 0) return null;

  const op = dialect === "sqlite" ? "LIKE" : "ILIKE";
  // SQLite has no boolean type and `CAST(x AS TEXT)`; Postgres/DuckDB accept
  // `CAST(x AS TEXT)` too (TEXT/VARCHAR are interchangeable here).
  const castType = "TEXT";
  const pattern = sqlStringLiteral(`%${escapeLikeTerm(parsed.term)}%`);
  const conds = targets.map(
    (c) => `CAST(${quoteIdent(c)} AS ${castType}) ${op} ${pattern} ESCAPE '\\'`,
  );
  return conds.length === 1 ? conds[0] : `(${conds.join(" OR ")})`;
}

