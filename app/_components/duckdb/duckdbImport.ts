"use client";

import type { QueryExecResult, SqlValue } from "sql.js";
import { sanitizeImportColName } from "../sql/utils/importUtils";
import type { DuckDbEngine } from "../runtime/duckdb";

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Parse CSV text into headers and rows. Mirrors the SQLite/Postgres
 *  parsers byte-for-byte so the import preview behaves identically
 *  across all three playgrounds. */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
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

export function tableNameFromFilename(filename: string): string {
  const base = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  return base || "imported_table";
}

let _parquetWasmInit:
  | Promise<typeof import("parquet-wasm/esm")>
  | null = null;
async function initParquetWasm(): Promise<typeof import("parquet-wasm/esm")> {
  if (!_parquetWasmInit) {
    _parquetWasmInit = (async () => {
      const m = await import("parquet-wasm/esm");
      await m.default(
        "https://cdn.jsdelivr.net/npm/parquet-wasm@0.7.1/esm/parquet_wasm_bg.wasm",
      );
      return m;
    })();
  }
  return _parquetWasmInit;
}

export async function readParquetFile(
  file: File,
): Promise<{ columns: string[]; rows: QueryExecResult["values"] }> {
  const mod = await initParquetWasm();
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

/** Insert a batch of rows into a (new or existing) DuckDB table.
 *  When `createTable` is true a VARCHAR-typed table is created first.
 *  All values are inlined as quoted literals so we don't pay the
 *  per-row prepared-statement round-trip cost (DuckDB-Wasm doesn't
 *  expose a parameter-binding API in its public ESM surface). */
export async function importRowsIntoDuckDb(
  engine: DuckDbEngine,
  tableName: string,
  fileColumns: string[],
  rows: ReadonlyArray<ReadonlyArray<unknown>>,
  options: { createTable: boolean },
): Promise<void> {
  const sanitized = fileColumns.map((h) => sanitizeImportColName(h));
  const tableIdent = quoteIdent(tableName);
  const colIdents = sanitized.map(quoteIdent).join(", ");

  if (options.createTable) {
    const colDefs = sanitized.map((c) => `${quoteIdent(c)} VARCHAR`).join(", ");
    await engine.exec(`CREATE TABLE ${tableIdent} (${colDefs})`);
  }

  if (rows.length === 0) return;

  const literalize = (v: unknown): string => {
    if (v === undefined || v === "" || v === null) return "NULL";
    if (typeof v === "number") {
      return Number.isFinite(v) ? String(v) : "NULL";
    }
    if (typeof v === "bigint") return v.toString();
    if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
    if (v instanceof Date) return `'${v.toISOString()}'`;
    return `'${String(v).replace(/'/g, "''")}'`;
  };

  // Batch inserts in chunks to keep statement size manageable while
  // still avoiding O(n) round-trips. 500 rows per INSERT keeps each
  // statement well under DuckDB's defaults.
  const BATCH = 500;
  await engine.exec("BEGIN TRANSACTION");
  try {
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const valuesSql = chunk
        .map(
          (row) =>
            `(${sanitized.map((_, j) => literalize(row[j])).join(", ")})`,
        )
        .join(",\n  ");
      await engine.exec(
        `INSERT INTO ${tableIdent} (${colIdents}) VALUES\n  ${valuesSql}`,
      );
    }
    await engine.exec("COMMIT");
  } catch (err) {
    try {
      await engine.exec("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw err;
  }
}
