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
 *  — where `column` names a real column in the result — scopes the match to
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
