// Validation and DDL for the SQLite structure editor.
//
// The Postgres and DuckDB editors have always checked a table definition
// before sending it; the SQLite one sent everything and let the engine
// object. That left the reader with raw driver text ("sqlite3 result code 1:
// near ")": syntax error" for a table with no columns) and, worse, with one
// case SQLite does not object to at all: a foreign key with a target table
// and no column was silently left out of the CREATE statement.
//
// Pure functions, so the same answers drive the inline message, the disabled
// Save button, the live preview and the submit, and can be unit-tested.

import type { ModifyColumnDraft, ModifyDialogState } from "../types";
import { FK_ACTIONS } from "../constants";
import { quoteIdent } from "./ddl";

export interface StructureValidation {
  /** Human-readable problems, most fundamental first. */
  errors: string[];
  /** Columns to outline. */
  invalidColumnIds: Set<string>;
  isValid: boolean;
}

export function validateSqliteStructure(
  state: Pick<ModifyDialogState, "newName" | "columns" | "originalName">,
  existingNames: readonly string[],
): StructureValidation {
  const errors: string[] = [];
  const invalidColumnIds = new Set<string>();
  const name = state.newName.trim();

  if (!name) {
    errors.push("Table name cannot be empty.");
  } else {
    const taken = existingNames.some(
      (other) =>
        other.toLowerCase() === name.toLowerCase() &&
        other.toLowerCase() !== (state.originalName ?? "").toLowerCase(),
    );
    if (taken) errors.push(`A table or view named "${name}" already exists.`);
  }

  // Generated columns keep the name they were created with; the form cannot
  // blank or rename them, so only ordinary columns are checked for that.
  if (state.columns.length === 0) {
    errors.push("A table must have at least one column.");
  } else if (state.columns.every((col) => col.generated)) {
    errors.push("A table needs at least one column that is not generated.");
  }

  const seen = new Map<string, string>();
  let blankReported = false;
  for (const col of state.columns) {
    const colName = col.name.trim();
    const label = colName || "Unnamed column";
    if (!colName) {
      if (!blankReported) errors.push("Column names cannot be empty.");
      blankReported = true;
      invalidColumnIds.add(col.id);
      continue;
    }
    const key = colName.toLowerCase();
    const first = seen.get(key);
    if (first !== undefined) {
      errors.push(`Duplicate column name "${colName}".`);
      invalidColumnIds.add(col.id);
      invalidColumnIds.add(first);
    } else {
      seen.set(key, col.id);
    }
    if (col.generated) continue;
    // Half a foreign key used to be dropped from the DDL without comment.
    if (Boolean(col.fkTable) !== Boolean(col.fkColumn)) {
      errors.push(`"${label}" has an incomplete foreign key: pick the column it references.`);
      invalidColumnIds.add(col.id);
    }
    if (col.autoIncrement && !(col.primaryKey && /^integer$/i.test(col.type.trim()))) {
      errors.push(`"${label}" must be an INTEGER primary key to auto-increment.`);
      invalidColumnIds.add(col.id);
    }
  }

  const autoIncrementCols = state.columns.filter((c) => c.autoIncrement);
  const pkCols = state.columns.filter((c) => c.primaryKey);
  if (autoIncrementCols.length > 0 && pkCols.length > 1) {
    errors.push("AUTOINCREMENT needs a single-column primary key.");
    for (const col of autoIncrementCols) invalidColumnIds.add(col.id);
  }

  return { errors, invalidColumnIds, isValid: errors.length === 0 };
}

function fkAction(action: string): string {
  return (FK_ACTIONS as readonly string[]).includes(action) ? action : "NO ACTION";
}

function columnDef(col: ModifyColumnDraft, inlinePrimaryKey: boolean): string {
  const parts = [quoteIdent(col.name.trim() || "column"), col.type.trim() || "TEXT"];
  if (col.generated) {
    parts.push(
      `GENERATED ALWAYS AS (${col.generated.expression}) ${col.generated.storageType}`,
    );
    return parts.join(" ");
  }
  if (col.notNull) parts.push("NOT NULL");
  if (col.primaryKey && inlinePrimaryKey) {
    parts.push("PRIMARY KEY");
    if (col.autoIncrement) parts.push("AUTOINCREMENT");
  }
  if (col.unique && !col.primaryKey) parts.push("UNIQUE");
  if (col.defaultValue.trim()) parts.push(`DEFAULT ${col.defaultValue.trim()}`);
  return parts.join(" ");
}

/** The `CREATE TABLE` statement for a new table. `pretty` puts one column
 *  per line for the preview; the statement is the same either way. */
export function buildSqliteCreateTableSql(
  state: Pick<ModifyDialogState, "newName" | "columns">,
  options: { pretty?: boolean } = {},
): string {
  const cols = state.columns;
  const pkCols = cols.filter((c) => c.primaryKey && !c.generated);
  // One key column is declared inline (the only place AUTOINCREMENT is
  // legal); several need a table-level constraint.
  const inlinePk = pkCols.length <= 1;
  const defs = cols.map((c) => columnDef(c, inlinePk));
  if (!inlinePk) {
    defs.push(
      `PRIMARY KEY (${pkCols.map((c) => quoteIdent(c.name.trim())).join(", ")})`,
    );
  }
  for (const c of cols) {
    if (c.generated || !c.fkTable || !c.fkColumn) continue;
    defs.push(
      `FOREIGN KEY (${quoteIdent(c.name.trim())}) REFERENCES ${quoteIdent(c.fkTable)}(${quoteIdent(c.fkColumn)})` +
        ` ON DELETE ${fkAction(c.fkOnDelete)} ON UPDATE ${fkAction(c.fkOnUpdate)}`,
    );
  }
  const name = quoteIdent(state.newName.trim() || "new_table");
  return options.pretty
    ? `CREATE TABLE ${name} (\n${defs.map((d) => `  ${d}`).join(",\n")}\n);`
    : `CREATE TABLE ${name} (${defs.join(", ")})`;
}
