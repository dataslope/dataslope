"use client";

import type { QueryExecResult, SqlValue } from "sql.js";
import { sanitizeImportColName } from "../sql/utils/importUtils";
import type { PostgresEngine } from "../runtime/postgres";

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Parse a CSV text into headers and rows. Mirrors the SQLite playground's
 *  parser so the two import flows behave identically. */
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

/** Lazy-loaded parquet decoder shared with the SQLite import path. The
 *  WASM binary is fetched from jsDelivr on first use and cached. */
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

/** Insert a batch of rows into a (new or existing) Postgres table.
 *  When `createTable` is true a TEXT-typed table is created first.
 *  Each row is sent through PGlite's parameterised query API, which
 *  handles binary, null and quoting safely. */
export async function importRowsIntoPostgres(
  engine: PostgresEngine,
  tableName: string,
  fileColumns: string[],
  rows: ReadonlyArray<ReadonlyArray<unknown>>,
  options: { createTable: boolean },
): Promise<void> {
  const sanitized = fileColumns.map((h) => sanitizeImportColName(h));
  const tableIdent = quoteIdent(tableName);
  const colIdents = sanitized.map(quoteIdent).join(", ");

  if (options.createTable) {
    const colDefs = sanitized.map((c) => `${quoteIdent(c)} TEXT`).join(", ");
    await engine.exec(`CREATE TABLE ${tableIdent} (${colDefs})`);
  }

  if (rows.length === 0) return;

  const placeholders = sanitized
    .map((_, i) => `$${i + 1}`)
    .join(", ");
  const insertSql = `INSERT INTO ${tableIdent} (${colIdents}) VALUES (${placeholders})`;

  await engine.exec("BEGIN");
  try {
    for (const row of rows) {
      const params = sanitized.map((_, i) => {
        const v = row[i];
        if (v === undefined || v === "") return null;
        if (v === null) return null;
        if (typeof v === "bigint") return Number(v);
        return v as unknown;
      });
      await engine.execParams(insertSql, params);
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
