/** Pure helpers for the in-grid result filter: a view over an
 *  already-materialized result, matching the displayed cell text
 *  (case-insensitive substring); never touches the database. A leading
 *  `column:` prefix scopes the match, but only when it names a real column —
 *  so a value that merely contains a colon (`12:30`) is never swallowed. */

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
 *  so the grid doesn't flash empty mid-typing (e.g. right after "name:"). */
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

/** Whether the client-side filter can be offered: the *whole* result must be
 *  in memory. Always true for materialized results; for a lazy result only
 *  when the loaded rows cover everything from offset 0. A partially-loaded
 *  result returns false — filtering only the loaded window would mislead. */
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

// Server-side filter pushdown for engine-paged results: wrap the original
// query as a subquery with a native SQL predicate (LIKE / ILIKE), re-paged
// through the engine so infinite scroll is preserved. Same `column:term`
// scoping as the client-side filter.

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

/** Escape LIKE metacharacters (`\`, `%`, `_`) so they match literally; the
 *  caller wraps the result in `%…%` and adds `ESCAPE '\'`. */
function escapeLikeTerm(term: string): string {
  return term.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/** Single-quoted SQL string literal (doubling embedded quotes); with
 *  `escapeLikeTerm` this keeps arbitrary user text injection-safe. */
function sqlStringLiteral(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

/** SQL boolean condition (no leading `WHERE`) reproducing the in-grid filter
 *  server-side; `null` when the filter has no term. Uses LIKE/ILIKE against
 *  `CAST(col AS TEXT)` so non-text columns are searchable. The term is
 *  escaped for both the string literal and LIKE wildcards (`ESCAPE '\'`), so
 *  arbitrary text — quotes, `%`, `_` — stays literal and injection-safe. */
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

