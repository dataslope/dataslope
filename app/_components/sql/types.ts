import type {
  ColumnConstraintInfo,
  ForeignKeyInfo,
  TableColumnInfo,
} from "../runtime/sqlite";
import type { QueryExecResult } from "../runtime/sqlite-wasm";

export type { ColumnConstraintInfo, ForeignKeyInfo, TableColumnInfo, QueryExecResult };

/** The result object stored per tab. */
export interface QueryRunResult {
  /**
   * One entry per SQL statement that was executed.
   * – `QueryExecResult` means the statement produced a result set (may have
   *   zero rows if the SELECT matched nothing).
   * – `null` means the statement ran successfully but produced no result set
   *   (e.g. INSERT, UPDATE, CREATE TABLE, …).
   */
  sets: (QueryExecResult | null)[];
  /** Time the run took in milliseconds. */
  elapsedMs: number;
  /** Optional error message if the run failed mid-way. */
  error?: string;
  /** Optional source label shown above the result panel, either the
   *  active tab's title or, for sidebar previews, the table name. */
  source: string;
  /** When the result came from a sidebar preview, the underlying
   *  table name. The result view uses this to look up PK / FK
   *  metadata so it can render key icons next to those headers. */
  sourceTable?: string;
  /** Per-result-set editable source table, aligned with `sets` (one entry per
   *  executed statement; null when that statement isn't an editable
   *  `SELECT * FROM <table>`). Lets each tab of a multi-statement run be edited
   *  against its own table. */
  sourceTables?: (string | null)[];
  /** When lazy SQL pagination is active: the original trimmed SQL that
   *  produced this result. */
  lazySql?: string;
  /** When lazy SQL pagination is active: the original SQL before any
   *  ORDER BY clauses were appended for UI sorting. */
  lazyBaseSql?: string;
  /** When lazy SQL pagination is active: total row count across all pages. */
  lazyTotalCount?: number;
  /** When lazy SQL pagination is active: 0-based index of the page
   *  whose rows are stored in `sets`. */
  lazyPage?: number;
  /** When lazy SQL pagination is active: the page size (rows per page)
   *  that was used to fetch this result. */
  lazyPageSize?: number;
  /** True when the result is incrementally loading all rows for the
   *  virtualized "All" result view. */
  lazyInfinite?: boolean;
  /** The exact (semicolon-stripped) SQL that produced this result. Used to
   *  re-run the *same* query after an inline edit, preserving any `LIMIT`/
   *  shape, for materialized results that have no `lazyBaseSql` to re-page. */
  querySql?: string;
}

export interface ResultTableRow {
  absoluteRow: number;
  values: QueryExecResult["values"][number];
}

/** Hints used by the result-view header to render PK / FK icons next
 *  to columns sourced from a known table. */
export interface ColumnKeyHints {
  pk: Set<string>;
  fk: Map<string, ForeignKeyInfo>;
  /** Columns that cannot be edited (e.g. generated/computed columns). The
   *  result grid marks them read-only so an edit can't be started that would
   *  only fail at commit time. */
  readOnly?: Set<string>;
  /** Enum-typed columns → their allowed labels (in declaration order). The
   *  result grid renders an inline dropdown instead of a free-text editor. */
  enums?: Map<string, string[]>;
}

export type ResultSetExportScope = "page" | "all";

export interface ResultSetExportSnapshot {
  setIndex: number;
  columns: string[];
  allRows: QueryExecResult["values"];
  rows: QueryExecResult["values"];
  totalRows: number;
  pageSize: number;
  currentPage: number;
}

export type SelectedRowsByResult = Record<number, Set<number>>;
export type PendingEditsByResult = Record<number, Map<string, unknown>>;

/** Editable representation of one column inside the Modify Structure drawer. */
export interface ModifyColumnDraft {
  id: string;
  originalName: string | null;
  name: string;
  type: string;
  notNull: boolean;
  primaryKey: boolean;
  autoIncrement: boolean;
  unique: boolean;
  defaultValue: string;
  fkTable: string;
  fkColumn: string;
  fkOnDelete: string;
  fkOnUpdate: string;
  /** When this column is a generated column, holds the expression and
   *  storage type. `null` for ordinary columns. */
  generated: { expression: string; storageType: "VIRTUAL" | "STORED" } | null;
}

export interface ModifyDialogState {
  originalName: string;
  newName: string;
  columns: ModifyColumnDraft[];
  /** Serialised snapshot of the dialog at open-time; compare with
   *  `modifyDialogSignature` to decide whether anything has changed.
   *  An empty string means the dialog is for a brand-new table and is
   *  always considered dirty. */
  originalSignature: string;
}

/** Produces a stable JSON string that captures every user-editable field
 *  of a ModifyDialogState (table name + column definitions).  Two calls
 *  with logically identical states produce the same string, so comparing
 *  the result against `originalSignature` reliably detects changes. */
export function modifyDialogSignature(
  state: Pick<ModifyDialogState, "newName" | "columns">,
): string {
  return JSON.stringify({
    name: state.newName.trim(),
    columns: state.columns.map((c) => ({
      originalName: c.originalName,
      name: c.name.trim(),
      type: c.type,
      notNull: c.notNull,
      primaryKey: c.primaryKey,
      autoIncrement: c.autoIncrement,
      unique: c.unique,
      defaultValue: c.defaultValue.trim(),
      fkTable: c.fkTable,
      fkColumn: c.fkColumn,
      fkOnDelete: c.fkOnDelete || "NO ACTION",
      fkOnUpdate: c.fkOnUpdate || "NO ACTION",
      generated: c.generated
        ? { expression: c.generated.expression.trim(), storageType: c.generated.storageType }
        : null,
    })),
  });
}

export interface ImportColComparison {
  status: "matched" | "extra" | "optional" | "required";
  fileCol: string | null;
  tableCol: string | null;
}

export interface CsvImportState {
  tableName: string;
  headers: string[];
  rows: string[][];
  rawText: string;
  targetMode: "new" | "existing";
  targetTable: string;
  colCompare: ImportColComparison[] | null;
}

export interface JsonImportState {
  tableName: string;
  headers: string[];
  rows: string[][];
  rawText: string;
  targetMode: "new" | "existing";
  targetTable: string;
  colCompare: ImportColComparison[] | null;
}

export interface ParquetImportState {
  tableName: string;
  columns: string[];
  rows: QueryExecResult["values"];
  targetMode: "new" | "existing";
  targetTable: string;
  colCompare: ImportColComparison[] | null;
}

export interface AddRowDialogState {
  tableName: string;
  columns: TableColumnInfo[];
  values: Record<string, string>;
  addAnother: boolean;
}

/** A single entry in the query execution history. */
export interface QueryHistoryEntry {
  /** Unique identifier for the entry. */
  id: string;
  /** The SQL that was executed (trimmed). */
  sql: string;
  /** Source label, e.g. tab title or "Table: x". */
  source: string;
  /** Unix timestamp (ms) when the query was executed. */
  executedAt: number;
  /** Elapsed execution time in milliseconds. */
  elapsedMs: number;
  /** True if the query succeeded, false if it threw an error. */
  success: boolean;
  /** Error message if the query failed. */
  error?: string;
}

/** A query the user has explicitly saved ("starred") so it survives a
 *  history clear and is surfaced in its own list. */
export interface SavedQuery {
  /** Unique identifier for the saved entry. */
  id: string;
  /** The saved SQL (trimmed). */
  sql: string;
  /** Source label carried over from the history entry / tab. */
  source: string;
  /** Unix timestamp (ms) when the query was saved. */
  savedAt: number;
}
