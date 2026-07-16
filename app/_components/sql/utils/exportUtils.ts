"use client";

import type { QueryExecResult } from "../../runtime/sqlite-wasm";
import { ensureParquetWasm } from "./parquetWasm";

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Convert a SQLite cell value to an ExcelData-compatible type. */
export function toExcelData(v: unknown): string | number | boolean | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v;
  if (v instanceof Uint8Array) return `[BLOB ${v.length} bytes]`;
  return String(v);
}

let _xlsxWasmInit: Promise<typeof import("wasm-xlsxwriter/web")> | null = null;

export async function initXlsxWasm(): Promise<
  typeof import("wasm-xlsxwriter/web")
> {
  if (!_xlsxWasmInit) {
    _xlsxWasmInit = (async () => {
      const mod = await import("wasm-xlsxwriter/web");
      await mod.default(
        "https://cdn.jsdelivr.net/npm/wasm-xlsxwriter@0.13.0/web/wasm_xlsxwriter_bg.wasm",
      );
      return mod;
    })();
  }
  return _xlsxWasmInit;
}

export function toFileSafeName(title: string): string {
  return title.replace(/[/\\:*?"<>|\x00-\x1f]/g, "_").trim() || "result_set";
}

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (
    s.includes(",") ||
    s.includes("\n") ||
    s.includes("\r") ||
    s.includes('"')
  ) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportResultToCsv(
  columns: string[],
  rows: QueryExecResult["values"],
  filename: string,
): void {
  const lines = [
    columns.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  triggerDownload(
    new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" }),
    filename,
  );
}

export function exportResultToJson(
  columns: string[],
  rows: QueryExecResult["values"],
  filename: string,
): void {
  const data = rows.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i] ?? null;
    });
    return obj;
  });
  triggerDownload(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    filename,
  );
}

export function exportResultToSql(
  columns: string[],
  rows: QueryExecResult["values"],
  filename: string,
): void {
  const quotedCols = columns
    .map((c) => `"${c.replace(/"/g, '""')}"`)
    .join(", ");
  const lines = rows.map((row) => {
    const vals = row
      .map((v) => {
        if (v === null || v === undefined) return "NULL";
        if (typeof v === "number") return String(v);
        return `'${String(v).replace(/'/g, "''")}'`;
      })
      .join(", ");
    return `INSERT INTO result_set (${quotedCols}) VALUES (${vals});`;
  });
  triggerDownload(
    new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }),
    filename,
  );
}

export async function exportResultToParquet(
  columns: string[],
  rows: QueryExecResult["values"],
  filename: string,
): Promise<void> {
  const [
    { tableToIPC, tableFromArrays, Utf8, Float64, vectorFromArray },
    { Table: WasmParquetTable, writeParquet },
  ] = await Promise.all([import("apache-arrow"), ensureParquetWasm()]);

  const colArrays: Record<string, unknown[]> = {};
  for (const col of columns) colArrays[col] = [];
  for (const row of rows) {
    for (let i = 0; i < columns.length; i++) {
      const v = row[i];
      colArrays[columns[i]].push(v === undefined ? null : v);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fields: Record<string, any> = {};
  for (const col of columns) {
    const vals = colArrays[col];
    const isNumeric = vals.every((v) => v === null || typeof v === "number");
    if (isNumeric) {
      fields[col] = vectorFromArray(vals as (number | null)[], new Float64());
    } else {
      fields[col] = vectorFromArray(
        vals.map((v) => (v === null ? null : String(v))),
        new Utf8(),
      );
    }
  }

  const arrowTable = tableFromArrays(
    fields as Parameters<typeof tableFromArrays>[0],
  );
  const ipcBytes = tableToIPC(arrowTable, "stream");
  const wasmTable = WasmParquetTable.fromIPCStream(ipcBytes);
  const parquetBytes = writeParquet(wasmTable);
  triggerDownload(
    new Blob([parquetBytes as BlobPart], { type: "application/octet-stream" }),
    filename,
  );
}

/**
 * Export columns + rows to a single-sheet Excel (.xlsx) file.
 * The first row is the header row.
 */
export async function exportResultToXlsx(
  columns: string[],
  rows: QueryExecResult["values"],
  filename: string,
): Promise<void> {
  const mod = await initXlsxWasm();
  const workbook = new mod.Workbook();
  const worksheet = workbook.addWorksheet();
  worksheet.writeRow(0, 0, columns);
  for (let ri = 0; ri < rows.length; ri++) {
    worksheet.writeRow(ri + 1, 0, rows[ri].map(toExcelData));
  }
  const bytes = workbook.saveToBufferSync();
  triggerDownload(
    new Blob([bytes as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}
