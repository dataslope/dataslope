import type {
  ColumnConstraintInfo,
  ForeignKeyInfo,
  TableColumnInfo,
} from "../runtime/sqlite";
import type { QueryExecResult } from "../runtime/sqlite-wasm";

export type { ColumnConstraintInfo, ForeignKeyInfo, TableColumnInfo, QueryExecResult };

/** The result object stored per tab. */
export interface QueryRunResult {
  /** One entry per executed statement: a `QueryExecResult` when it produced
   *  a result set (possibly zero rows), `null` when it ran but produced none
   *  (INSERT, CREATE TABLE, …). */
  sets: (QueryExecResult | null)[];
  /** Time the run took in milliseconds. */
  elapsedMs: number;
  /** Error message if the run failed mid-way. */
  error?: string;
  /** Source label shown above the result panel (tab title or table name). */
  source: string;
  /** Underlying table name for a sidebar preview; drives PK / FK metadata
   *  lookup for the header key icons. */
  sourceTable?: string;
  /** Per-result-set editable source table, aligned with `sets`; null when a
   *  statement isn't an editable `SELECT * FROM <table>`. */
  sourceTables?: (string | null)[];
  /** Lazy pagination: the original trimmed SQL that produced this result. */
  lazySql?: string;
  /** Lazy pagination: the SQL before any UI-sort ORDER BY was appended. */
  lazyBaseSql?: string;
  /** Lazy pagination: total row count across all pages. */
  lazyTotalCount?: number;
  /** Lazy pagination: 0-based index of the page stored in `sets`. */
  lazyPage?: number;
  /** Lazy pagination: page size used to fetch this result. */
  lazyPageSize?: number;
  /** True while incrementally loading all rows for the virtualized "All" view. */
  lazyInfinite?: boolean;
  /** Exact (semicolon-stripped) SQL that produced this result; re-runs the
   *  same query after an inline edit when there is no `lazyBaseSql`. Also
   *  shown in the error panel, since "Run selection" makes it differ from the
   *  editor's contents. */
  querySql?: string;
  /** Rows affected per executed statement, aligned with `sets`; null for a
   *  statement that reports no count. Drives the "N rows affected" line after
   *  an INSERT / UPDATE / DELETE. */
  affectedRows?: (number | null)[];
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
  /** Columns that cannot be edited (e.g. generated columns); the grid marks
   *  them read-only so an edit can't start that would fail at commit. */
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

/** Stable JSON string of every user-editable ModifyDialogState field;
 *  comparing against `originalSignature` reliably detects changes. */
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
  /** Column types for a "New table" import, one per header: inferred from the
   *  file's values and overridable per column in the preview. Absent (or an
   *  entry of `"text"`) means the column is created as text. */
  columnTypes?: string[];
}

export interface JsonImportState {
  tableName: string;
  headers: string[];
  rows: string[][];
  rawText: string;
  targetMode: "new" | "existing";
  targetTable: string;
  colCompare: ImportColComparison[] | null;
  columnTypes?: string[];
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
  /** Columns whose blank input means the empty string rather than NULL (or
   *  the column default). A blank field is otherwise ambiguous, which left
   *  `''` — a real, distinct value for a text column — unreachable. */
  emptyAsText?: Record<string, boolean>;
}

/** A single entry in the query execution history. */
export interface QueryHistoryEntry {
  id: string;
  /** The executed SQL (trimmed). */
  sql: string;
  /** Source label, e.g. tab title or "Table: x". */
  source: string;
  /** Unix timestamp (ms). */
  executedAt: number;
  elapsedMs: number;
  success: boolean;
  error?: string;
}

/** A query the user has explicitly saved ("starred") so it survives a
 *  history clear. */
export interface SavedQuery {
  id: string;
  /** The saved SQL (trimmed). */
  sql: string;
  /** Source label carried over from the history entry / tab. */
  source: string;
  /** Unix timestamp (ms). */
  savedAt: number;
}
