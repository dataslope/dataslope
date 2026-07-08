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

export function formatCellValue(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NaN";
  if (v instanceof Uint8Array) return `BLOB (${v.length} bytes)`;
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

/** Infer a SQLite-style type label from the runtime JavaScript value. */
export function inferColumnType(
  rows: QueryExecResult["values"],
  colIdx: number,
): string {
  for (const row of rows) {
    const v = row[colIdx];
    if (v === null) continue;
    if (v instanceof Uint8Array) return "BLOB";
    if (typeof v === "number") return Number.isInteger(v) ? "INTEGER" : "REAL";
    if (typeof v === "string") return "TEXT";
  }
  return "NULL";
}
