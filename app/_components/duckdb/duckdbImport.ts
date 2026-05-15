"use client";

import { sanitizeImportColName } from "../sql/utils/importUtils";
import type { DuckDbEngine } from "../runtime/duckdb";

export { parseCsv, tableNameFromFilename, readParquetFile } from "../sql/utils/importUtils";

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
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
