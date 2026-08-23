import type { QueryExecResult } from "../../runtime/sqlite-wasm";
import type { PendingEditsByResult } from "../types";

/** Compare two SQLite cell values for client-side sorting. NULL sorts
 *  before all other values; numbers compare numerically; everything
 *  else is coerced to string. */
export function compareCellValues(a: unknown, b: unknown): number {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

/** `1 byte` / `2 bytes` — the size badge on a binary cell is user-facing copy,
 *  so it agrees with itself. */
export function formatByteCount(n: number): string {
  return `${n} ${n === 1 ? "byte" : "bytes"}`;
}

export function formatCellValue(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NaN";
  // Real booleans (Postgres/DuckDB) render as `true`/`false`, matching the
  // column's declared type rather than printing an integer for it.
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v instanceof Uint8Array) return `BLOB (${formatByteCount(v.length)})`;
  if (v instanceof Date) return v.toISOString();
  // Array columns (e.g. DuckDB LIST, which arrive as JS arrays) render with
  // brackets so they read as a collection, `[10, 20, 30]` rather than the
  // ambiguous `10,20,30` that `String([])` produces. (Postgres arrays already
  // arrive pre-serialized as JSON text from the adapter.)
  if (Array.isArray(v)) {
    return `[${v.map((item) => formatCellValue(item)).join(", ")}]`;
  }
  return String(v);
}

/** Render a cell for the *grid*, where the row is a single line and runs of
 *  whitespace would otherwise be invisible. `white-space: pre` on the cell
 *  keeps leading/trailing spaces; embedded newlines and tabs become glyphs so
 *  they stay on one line and are visibly different from a plain space. The
 *  untouched value is still what gets copied, edited and exported — only the
 *  on-screen text is substituted, so a `'  a\nb  '` no longer reads as `a b`.
 */
export function formatCellDisplay(v: unknown): string {
  const text = formatCellValue(v);
  return /[\n\r\t]/.test(text)
    ? text.replace(/\r\n|\r|\n/g, "↵").replace(/\t/g, "→")
    : text;
}

/** Format a cell value as a SQL literal suitable for INSERT / SELECT. */
export function formatCellAsSql(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "string") return `'${v.replace(/'/g, "''")}'`;
  if (v instanceof Uint8Array) {
    const hex = Array.from(v)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `x'${hex}'`;
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}

export function parseCellEditValue(raw: string, isNumeric: boolean): unknown {
  // An empty field clears the cell to SQL NULL. The literal text "NULL" is
  // intentionally NOT coerced to NULL: there is an explicit "Set to NULL"
  // context-menu action for that, so typing N-U-L-L stores the string "NULL"
  // (the escape hatch that was previously impossible, see UX-20).
  if (raw === "") return null;
  if (!isNumeric) return raw;
  const n = Number(raw);
  return Number.isFinite(n) ? n : raw;
}

/** Count deleted rows before a row index to calculate its post-delete shift. */
export function countSortedValuesLessThan(
  values: number[],
  target: number,
): number {
  let lo = 0;
  let hi = values.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (values[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Parse a pending-edit key of the form `${absoluteRow}:${columnIndex}`. */
function parseCellKey(cellKey: string): { row: number; col: string } | null {
  const [rowStr, col] = cellKey.split(":");
  const row = Number(rowStr);
  return Number.isInteger(row) ? { row, col } : null;
}

function clonePendingEdits(src: PendingEditsByResult): PendingEditsByResult {
  return Object.fromEntries(
    Object.entries(src).map(([idx, edits]) => [idx, new Map(edits)]),
  ) as PendingEditsByResult;
}

/** Shift pending edit row indices after deletions and remove edits on deleted rows. */
export function pendingEditsAfterDeletedRows(
  src: PendingEditsByResult,
  setIdx: number,
  deletedRows: Set<number>,
): PendingEditsByResult {
  const next = clonePendingEdits(src);
  const edits = next[setIdx];
  if (!edits) return next;
  const sortedDeleted = [...deletedRows].sort((a, b) => a - b);
  const shifted = new Map<string, unknown>();
  for (const [cellKey, value] of edits) {
    const parsed = parseCellKey(cellKey);
    if (!parsed || deletedRows.has(parsed.row)) continue;
    const { row, col } = parsed;
    const shift = countSortedValuesLessThan(sortedDeleted, row);
    shifted.set(`${row - shift}:${col}`, value);
  }
  if (shifted.size > 0) next[setIdx] = shifted;
  else delete next[setIdx];
  return next;
}

/** True for the exact decimal string a 64-bit integer beyond JavaScript's
 *  safe-integer range is carried as. Deliberately narrow: a value inside the
 *  safe range is already a JS number, so a plain digit string there really is
 *  text and stays text. */
function isBigIntegerLiteral(v: string): boolean {
  if (!/^-?\d+$/.test(v)) return false;
  try {
    const n = BigInt(v);
    return (
      n > BigInt(Number.MAX_SAFE_INTEGER) || n < BigInt(Number.MIN_SAFE_INTEGER)
    );
  } catch {
    return false;
  }
}

/** Infer a SQLite-style type label from the runtime JavaScript value. */
export function inferColumnType(
  rows: QueryExecResult["values"],
  colIdx: number,
): string {
  for (const row of rows) {
    const v = row[colIdx];
    if (v === null) continue;
    if (v instanceof Uint8Array) return "BLOB";
    if (typeof v === "boolean") return "BOOLEAN";
    if (typeof v === "bigint") return "INTEGER";
    if (typeof v === "number") return Number.isInteger(v) ? "INTEGER" : "REAL";
    // A 64-bit integer outside the safe-integer range reaches the UI as an
    // exact decimal string (see `coerceValue`), so `9223372036854775807` in an
    // expression column was badged `text` beside a value that is an integer.
    if (typeof v === "string") {
      return isBigIntegerLiteral(v) ? "INTEGER" : "TEXT";
    }
  }
  return "NULL";
}
