// CREATE TABLE rendering for the Postgres playground.
//
// Kept apart from postgres.ts so the structure drawer can show the statement
// it is about to run without statically importing the engine module (and the
// sample databases that come with it). The drawer's preview and the engine's
// `createTable` call the same function, so the two cannot disagree.

import type { ColumnSpec } from "./sqlite-core";

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

const FK_ACTIONS = new Set(["NO ACTION", "RESTRICT", "CASCADE", "SET NULL", "SET DEFAULT"]);

export function normalizeFkAction(action: string | undefined): string {
  const normalized = (action || "NO ACTION").trim().toUpperCase();
  return FK_ACTIONS.has(normalized) ? normalized : "NO ACTION";
}

export function renderPgType(col: ColumnSpec): string {
  const type = (col.type || "text").trim();
  if (col.autoIncrement) {
    if (/^big(serial|int)$/i.test(type)) return "bigserial";
    if (/^small(serial|int)$/i.test(type)) return "smallserial";
    return "serial";
  }
  return type;
}

export function renderPgColumnDef(col: ColumnSpec): string {
  const name = quoteIdent(col.name);
  const type = renderPgType(col);
  if (col.generated) {
    return `${name} ${type} GENERATED ALWAYS AS (${col.generated.expression}) STORED`;
  }
  const parts = [name, type];
  if (col.notNull) parts.push("NOT NULL");
  if (col.unique && !col.primaryKey) parts.push("UNIQUE");
  if (col.defaultValue && !col.autoIncrement) parts.push(`DEFAULT ${col.defaultValue}`);
  return parts.join(" ");
}

export function renderPgCreateTable(
  schema: string,
  name: string,
  columns: ColumnSpec[],
): string {
  const defs = columns.map((col) => `  ${renderPgColumnDef(col)}`);
  const pk = columns.filter((col) => col.primaryKey);
  if (pk.length > 0) {
    defs.push(`  PRIMARY KEY (${pk.map((col) => quoteIdent(col.name)).join(", ")})`);
  }
  for (const col of columns) {
    if (!col.foreignKey?.table || !col.foreignKey.column) continue;
    defs.push(
      [
        `  FOREIGN KEY (${quoteIdent(col.name)}) REFERENCES ${quoteIdent(col.foreignKey.table)}(${quoteIdent(col.foreignKey.column)})`,
        `ON DELETE ${normalizeFkAction(col.foreignKey.onDelete)}`,
        `ON UPDATE ${normalizeFkAction(col.foreignKey.onUpdate)}`,
      ].join(" "),
    );
  }
  return `CREATE TABLE ${quoteIdent(schema)}.${quoteIdent(name)} (\n${defs.join(",\n")}\n)`;
}

/** The statement the Add Table drawer will run, for its live preview.
 *  Tolerates a half-filled form: unnamed columns are left out, as
 *  `createTable` leaves them out. */
export function previewPgCreateTable(
  schema: string,
  name: string,
  columns: ColumnSpec[],
): string {
  const named = columns
    .filter((col) => col.name.trim())
    .map((col) => ({ ...col, name: col.name.trim(), type: (col.type || "text").trim() }));
  return `${renderPgCreateTable(schema, name.trim() || "new_table", named)};`;
}
