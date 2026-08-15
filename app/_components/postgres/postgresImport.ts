"use client";

import { sanitizeImportColName } from "../sql/utils/importUtils";
import type { PostgresEngine } from "../runtime/postgres";

export {
  parseCsv,
  inferCsvColumnTypes,
  tableNameFromFilename,
  readParquetFile,
} from "../sql/utils/importUtils";

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Postgres types the import flow is allowed to create. An allowlist, not
 *  free text: the value reaches `CREATE TABLE` unquoted, and a column type is
 *  not a place to accept arbitrary input. */
const IMPORT_COLUMN_TYPES = new Set([
  "text",
  "bigint",
  "integer",
  "double precision",
  "numeric",
  "boolean",
  "date",
  "timestamptz",
  "timestamp",
  "uuid",
  "jsonb",
]);

function importColumnType(type: string | undefined): string {
  const t = (type ?? "").trim().toLowerCase();
  return IMPORT_COLUMN_TYPES.has(t) ? t : "text";
}

/** Insert a batch of rows into a (new or existing) Postgres table.
 *  When `createTable` is true the table is created first, using
 *  `options.columnTypes` (inferred from the file, `text` when absent).
 *  Each row is sent through PGlite's parameterised query API, which
 *  handles binary, null and quoting safely. */
export async function importRowsIntoPostgres(
  engine: PostgresEngine,
  tableName: string,
  fileColumns: string[],
  rows: ReadonlyArray<ReadonlyArray<unknown>>,
  options: { createTable: boolean; columnTypes?: readonly string[] },
): Promise<void> {
  const sanitized = fileColumns.map((h) => sanitizeImportColName(h));
  const tableIdent = quoteIdent(tableName);
  const colIdents = sanitized.map(quoteIdent).join(", ");

  const placeholders = sanitized.map((_, i) => `$${i + 1}`).join(", ");
  const insertSql = `INSERT INTO ${tableIdent} (${colIdents}) VALUES (${placeholders})`;

  const insertAll = async () => {
    if (rows.length === 0) return;
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
  };

  if (!options.createTable) {
    await insertAll();
    return;
  }

  const createWith = async (types: readonly string[] | undefined) => {
    const colDefs = sanitized
      .map((c, i) => `${quoteIdent(c)} ${importColumnType(types?.[i])}`)
      .join(", ");
    await engine.exec(`CREATE TABLE ${tableIdent} (${colDefs})`);
  };

  const typed = options.columnTypes?.some((t) => importColumnType(t) !== "text");
  await createWith(options.columnTypes);
  try {
    await insertAll();
  } catch (err) {
    // Inference is a convenience, never a reason for the import to fail: a
    // value the sample didn't cover (or a type the user overrode) falls back
    // to the all-text table the import produced before inference existed.
    if (!typed) throw err;
    await engine.exec(`DROP TABLE IF EXISTS ${tableIdent}`);
    await createWith(undefined);
    await insertAll();
  }
}
