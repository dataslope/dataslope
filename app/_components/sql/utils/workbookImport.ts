/** Turning a spreadsheet into SQL.
 *
 *  A dropped workbook can become either one table (a single sheet, which goes
 *  through the same preview the CSV import uses) or a whole database, one
 *  table per sheet. The second is expressed as a SQL script rather than as
 *  direct engine calls, because every playground already has a tested path
 *  that loads a script into a fresh database — including the progress
 *  reporting and the "restore the old database if it fails" behaviour.
 */

import {
  inferCsvColumnTypes,
  sanitizeImportColName,
  sqliteAffinityFor,
  type InferredColumnType,
} from "./importUtils";
import type { XlsxSheet } from "./xlsxReader";
import type { SqlDialect } from "../sqlCompletion";

/** Identifier quoting, the same in all three dialects. */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/** A sheet name as a SQL identifier: "2024 Sales!" → "_2024_Sales". Leading
 *  digits are prefixed because an unquoted reader (and a person) reads
 *  `2024_Sales` as a number followed by a word. */
export function tableNameFromSheet(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!cleaned) return "sheet";
  return /^\d/.test(cleaned) ? `_${cleaned}` : cleaned;
}

/** Make every name unique, since two sheets can sanitise to the same one
 *  ("Q1 Sales" and "Q1/Sales"). */
export function uniqueTableNames(sheetNames: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return sheetNames.map((raw) => {
    const base = tableNameFromSheet(raw);
    const key = base.toLowerCase();
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

/** The column type each dialect should be given for an inferred type. */
function sqlTypeFor(
  type: InferredColumnType,
  dialect: SqlDialect,
): string {
  if (dialect === "sqlite") return sqliteAffinityFor(type);
  // Postgres spells these natively and DuckDB accepts the same names.
  switch (type) {
    case "bigint":
      return "BIGINT";
    case "double precision":
      return "DOUBLE PRECISION";
    case "boolean":
      return "BOOLEAN";
    case "date":
      return "DATE";
    case "timestamptz":
      return "TIMESTAMPTZ";
    default:
      return "TEXT";
  }
}

const TRUE_TOKENS = new Set(["true", "t", "yes", "y", "1"]);
const FALSE_TOKENS = new Set(["false", "f", "no", "n", "0"]);

/** One cell as a SQL literal. Empty cells become NULL — the same reading the
 *  CSV import gives them — and a value that does not match its column's
 *  inferred type falls back to a quoted string rather than producing a
 *  statement the engine will reject. */
export function sqlLiteralFor(value: string, type: InferredColumnType): string {
  const trimmed = value.trim();
  if (trimmed === "") return "NULL";
  switch (type) {
    case "bigint":
      return /^[+-]?\d+$/.test(trimmed) ? trimmed : quoteLiteral(value);
    case "double precision":
      return Number.isFinite(Number(trimmed)) ? trimmed : quoteLiteral(value);
    case "boolean": {
      const lower = trimmed.toLowerCase();
      if (TRUE_TOKENS.has(lower)) return "TRUE";
      if (FALSE_TOKENS.has(lower)) return "FALSE";
      return quoteLiteral(value);
    }
    default:
      return quoteLiteral(value);
  }
}

export interface WorkbookSqlOptions {
  dialect: SqlDialect;
  /** Rows per INSERT. Batching keeps the script far smaller than one
   *  statement per row without building a statement too long to parse. */
  rowsPerInsert?: number;
}

/**
 * Build a script that recreates a workbook as a database: one table per
 * sheet, typed from the same inference the CSV import uses. Sheets with no
 * usable header row are skipped — an empty sheet is a normal thing for a
 * workbook to contain, and a table with no columns is not.
 */
export function workbookToSqlScript(
  sheets: readonly XlsxSheet[],
  { dialect, rowsPerInsert = 200 }: WorkbookSqlOptions,
): { sql: string; tables: string[]; skipped: string[] } {
  const usable = sheets.filter((s) => s.headers.length > 0);
  const skipped = sheets.filter((s) => s.headers.length === 0).map((s) => s.name);
  const names = uniqueTableNames(usable.map((s) => s.name));
  const lines: string[] = [];
  const tables: string[] = [];

  usable.forEach((sheet, sheetIndex) => {
    const table = names[sheetIndex];
    tables.push(table);
    const columns = sheet.headers.map((header, i) => {
      const cleaned = sanitizeImportColName(header);
      // Two columns can sanitise to the same identifier; the position keeps
      // them apart rather than failing the CREATE.
      const duplicate = sheet.headers
        .slice(0, i)
        .some((other) => sanitizeImportColName(other) === cleaned);
      return duplicate ? `${cleaned}_${i + 1}` : cleaned;
    });
    const types = inferCsvColumnTypes(sheet.headers, sheet.rows);

    lines.push(`-- Sheet: ${sheet.name}`);
    lines.push(
      `CREATE TABLE ${quoteIdent(table)} (\n` +
        columns
          .map((c, i) => `  ${quoteIdent(c)} ${sqlTypeFor(types[i], dialect)}`)
          .join(",\n") +
        `\n);`,
    );

    const colList = columns.map(quoteIdent).join(", ");
    for (let start = 0; start < sheet.rows.length; start += rowsPerInsert) {
      const batch = sheet.rows.slice(start, start + rowsPerInsert);
      const values = batch
        .map(
          (row) =>
            `  (${columns
              .map((_, i) => sqlLiteralFor(row[i] ?? "", types[i]))
              .join(", ")})`,
        )
        .join(",\n");
      lines.push(`INSERT INTO ${quoteIdent(table)} (${colList}) VALUES\n${values};`);
    }
    lines.push("");
  });

  return { sql: lines.join("\n"), tables, skipped };
}
