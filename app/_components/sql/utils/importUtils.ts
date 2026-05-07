import type { TableColumnInfo } from "../../runtime/sqlite";
import type { ImportColComparison } from "../types";

/** Sanitizes a raw header/column name to the SQL identifier used when
 *  building INSERT statements. Case is preserved so the created column
 *  names match the original file. */
export function sanitizeImportColName(header: string): string {
  return header.trim().replace(/[^a-zA-Z0-9_]/g, "_") || "col";
}

/** Case-insensitive variant used only for column-matching comparisons.
 *  SQLite column lookups are case-insensitive, so we normalise both sides
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
