"use client";

import { sanitizeImportColName } from "../sql/utils/importUtils";
import type { PostgresEngine } from "../runtime/postgres";

export { parseCsv, tableNameFromFilename, readParquetFile } from "../sql/utils/importUtils";

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
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
