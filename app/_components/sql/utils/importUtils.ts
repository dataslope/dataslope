import type { QueryExecResult, SqlValue } from "../../runtime/sqlite-wasm-adapter";
import type { TableColumnInfo } from "../../runtime/sqlite";
import type { ImportColComparison } from "../types";
import { ensureParquetWasm } from "./parquetWasm";

/** Parse CSV text into headers and rows. Used by every SQL playground
 *  (sqlite, postgres, duckdb) so all three import flows behave
 *  identically. Quoted fields, escaped double-quotes, and short rows
 *  are handled per RFC 4180; trailing empty lines are skipped. */
export function parseCsv(text: string): {
  headers: string[];
  rows: string[][];
} {
  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            cur += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    fields.push(cur);
    return fields;
  };
  const lines = text.split(/\r?\n/);
  const nonEmpty = lines.filter((l) => l.trim() !== "");
  if (nonEmpty.length === 0) return { headers: [], rows: [] };
  const headers = parseLine(nonEmpty[0]);
  const rows = nonEmpty.slice(1).map((l) => {
    const vals = parseLine(l);
    while (vals.length < headers.length) vals.push("");
    return vals.slice(0, headers.length);
  });
  return { headers, rows };
}

/** Derive a SQL-safe table name from a filename, stripping the
 *  extension and collapsing non-identifier runs to underscores. */
export function tableNameFromFilename(filename: string): string {
  const base = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  return base || "imported_table";
}

/** Read a Parquet file and materialise it into the same column/row
 *  shape parseCsv returns, so callers can hand the result off to a
 *  shared import preview component. */
export async function readParquetFile(
  file: File,
): Promise<{ columns: string[]; rows: QueryExecResult["values"] }> {
  const mod = await ensureParquetWasm();
  const { tableFromIPC } = await import("apache-arrow");
  const bytes = await file.arrayBuffer();
  const wasmTable = mod.readParquet(new Uint8Array(bytes));
  const ipcBytes = wasmTable.intoIPCStream();
  const arrowTable = tableFromIPC(ipcBytes);
  const columns = arrowTable.schema.fields.map((f) => f.name);
  const rows: QueryExecResult["values"] = [];
  for (const batch of arrowTable.batches) {
    for (let r = 0; r < batch.numRows; r++) {
      const row: SqlValue[] = [];
      for (let c = 0; c < columns.length; c++) {
        const val = batch.getChildAt(c)?.get(r);
        row.push(val === undefined ? null : (val as SqlValue));
      }
      rows.push(row);
    }
  }
  return { columns, rows };
}

/** Sanitizes a raw header/column name to the SQL identifier used when
 *  building INSERT statements. Case is preserved so the created column
 *  names match the original file. */
export function sanitizeImportColName(header: string): string {
  return header.trim().replace(/[^a-zA-Z0-9_]/g, "_") || "col";
}

/** Case-insensitive variant used only for column-matching comparisons.
 *  SQLite column lookups are case-insensitive, so we normalize both sides
 *  before comparing. */
export function normalizeImportColName(header: string): string {
  return sanitizeImportColName(header).toLowerCase();
}

export function computeImportColComparison(
  fileHeaders: string[],
  tableCols: TableColumnInfo[],
): ImportColComparison[] {
  const tableMap = new Map(tableCols.map((c) => [c.name.toLowerCase(), c]));
  const matched = new Set<string>();
  const rows: ImportColComparison[] = [];

  for (const h of fileHeaders) {
    const key = normalizeImportColName(h);
    const col = tableMap.get(key);
    if (col) {
      rows.push({ status: "matched", fileCol: h, tableCol: col.name });
      matched.add(key);
    } else {
      rows.push({ status: "extra", fileCol: h, tableCol: null });
    }
  }

  for (const col of tableCols) {
    if (!matched.has(col.name.toLowerCase())) {
      const isOptional =
        !col.notNull || col.defaultValue !== null || col.pk > 0;
      rows.push({
        status: isOptional ? "optional" : "required",
        fileCol: null,
        tableCol: col.name,
      });
    }
  }

  return rows;
}
