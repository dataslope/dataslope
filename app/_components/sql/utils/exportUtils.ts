"use client";

import type { QueryExecResult } from "../../runtime/sqlite-wasm";
import { ensureParquetWasm } from "./parquetWasm";
import { formatByteCount } from "./cellUtils";
import {
  classifyExportType,
  toCsvValue,
  toExcelCell,
  toJsonValue,
  toSqlLiteral,
  type ExportCellKind,
} from "./valueSerialize";

/** Per-column context an exporter needs to serialize a value faithfully.
 *  Optional throughout: a caller with no type metadata still gets the previous
 *  `String(value)` behaviour, now with binary and boolean handled. */
export interface ResultExportOptions {
  /** Declared SQL type per column, parallel to `columns`. */
  columnTypes?: readonly (string | undefined)[];
  /** INSERT target for the SQL exporter. Defaults to `result_set`. */
  tableName?: string;
}

function kindsFor(
  columns: readonly string[],
  opts: ResultExportOptions | undefined,
): ExportCellKind[] {
  return columns.map((_, i) => classifyExportType(opts?.columnTypes?.[i]));
}

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
  if (v instanceof Uint8Array) return `[BLOB ${formatByteCount(v.length)}]`;
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

/** Quote a CSV field per RFC 4180. `text` is already the serialized value. */
function escapeCsvField(text: string): string {
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportResultToCsv(
  columns: string[],
  rows: QueryExecResult["values"],
  filename: string,
  opts?: ResultExportOptions,
): void {
  const kinds = kindsFor(columns, opts);
  const lines = [
    columns.map((c) => escapeCsvField(c)).join(","),
    ...rows.map((row) =>
      row.map((v, i) => escapeCsvField(toCsvValue(v, kinds[i]))).join(","),
    ),
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
  opts?: ResultExportOptions,
): void {
  const kinds = kindsFor(columns, opts);
  const data = rows.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = toJsonValue(row[i] ?? null, kinds[i]);
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
  opts?: ResultExportOptions,
): void {
  const kinds = kindsFor(columns, opts);
  const table = `"${(opts?.tableName || "result_set").replace(/"/g, '""')}"`;
  const quotedCols = columns
    .map((c) => `"${c.replace(/"/g, '""')}"`)
    .join(", ");
  const lines = rows.map((row) => {
    const vals = row.map((v, i) => toSqlLiteral(v, kinds[i])).join(", ");
    return `INSERT INTO ${table} (${quotedCols}) VALUES (${vals});`;
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
  opts?: ResultExportOptions,
): Promise<void> {
  const [
    { tableToIPC, tableFromArrays, Bool, Utf8, Float64, vectorFromArray },
    { Table: WasmParquetTable, writeParquet },
  ] = await Promise.all([import("apache-arrow"), ensureParquetWasm()]);

  const kinds = kindsFor(columns, opts);
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
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const vals = colArrays[col];
    const nonNull = vals.filter((v) => v !== null);
    if (nonNull.length > 0 && nonNull.every((v) => typeof v === "boolean")) {
      fields[col] = vectorFromArray(vals as (boolean | null)[], new Bool());
    } else if (nonNull.length > 0 && nonNull.every((v) => typeof v === "number")) {
      fields[col] = vectorFromArray(vals as (number | null)[], new Float64());
    } else {
      // Everything else lands as text, but through the shared serializer so a
      // binary column becomes `\xdeadbeef` rather than a decimal byte list.
      fields[col] = vectorFromArray(
        vals.map((v) => (v === null ? null : toCsvValue(v, kinds[i]))),
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
  opts?: ResultExportOptions,
): Promise<void> {
  const mod = await initXlsxWasm();
  const kinds = kindsFor(columns, opts);
  const workbook = new mod.Workbook();
  const worksheet = workbook.addWorksheet();
  worksheet.writeRow(0, 0, columns);
  // Date formats are per-cell in xlsx, but a Format is reusable — build one
  // per distinct number format rather than one per cell.
  const dateFormats = new Map<string, InstanceType<typeof mod.Format>>();
  const dateFormat = (numFmt: string) => {
    let fmt = dateFormats.get(numFmt);
    if (!fmt) {
      fmt = new mod.Format().setNumFormat(numFmt);
      dateFormats.set(numFmt, fmt);
    }
    return fmt;
  };
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    for (let ci = 0; ci < columns.length; ci++) {
      const cell = toExcelCell(row[ci] ?? null, kinds[ci]);
      switch (cell.t) {
        case "blank":
          break;
        case "number":
          worksheet.writeNumber(ri + 1, ci, cell.v);
          break;
        case "boolean":
          worksheet.writeBoolean(ri + 1, ci, cell.v);
          break;
        case "date":
          worksheet.writeDatetimeWithFormat(
            ri + 1,
            ci,
            cell.v,
            dateFormat(cell.numFmt),
          );
          break;
        default:
          worksheet.writeString(ri + 1, ci, cell.v);
      }
    }
  }
  const bytes = workbook.saveToBufferSync();
  triggerDownload(
    new Blob([bytes as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}
