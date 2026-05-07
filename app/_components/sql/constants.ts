/** SQLite type-affinity options exposed by the Modify Structure drawer. */
export const COLUMN_TYPES = [
  "INTEGER",
  "REAL",
  "TEXT",
  "BLOB",
  "NUMERIC",
  "BOOLEAN",
  "DATETIME",
] as const;

/** Allowed ON DELETE / ON UPDATE actions for foreign-key columns. */
export const FK_ACTIONS = [
  "NO ACTION",
  "RESTRICT",
  "CASCADE",
  "SET NULL",
  "SET DEFAULT",
] as const;

export const DROP_KIND_LABELS: Record<
  "table" | "view" | "index" | "trigger",
  string
> = { table: "Table", view: "View", index: "Index", trigger: "Trigger" };

/** Labels shown in the status column of the column-comparison table inside
 *  the import dialogs. */
export const IMPORT_COL_STATUS_LABEL = {
  matched: "✓ Matched",
  extra: "⚠ Not in table",
  optional: "○ Optional",
  required: "✗ Required",
} as const;

/** Delay before treating a sidebar-row click as a single click. */
export const SINGLE_CLICK_DELAY_MS = 220;
