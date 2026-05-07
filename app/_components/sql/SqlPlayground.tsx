"use client";

// Browser-based SQLite playground. Boots sql.js, renders the schema in
// a left sidebar (Tables/Views), and gives the user a multi-tab SQL
// editor whose results land in a top results panel.
//
// Differs from `Playground.tsx` (which wraps a single REPL-style
// adapter) in three significant ways:
//   1. The engine is persistent across runs and tabs — only the
//      database-selector causes a teardown/rebuild.
//   2. The editor is multi-tab, with per-database persistence so
//      switching databases doesn't blow away your work in the others.
//   3. The "output" is a tabular result panel, not a stream of
//      heterogeneous cells.
//
// All shared chrome (Settings dialog, runtime-info popover, run-overlay
// animation, themes) is reused from `playgroundShared`/`playgroundTheme`
// so this playground retints in lockstep with every other one when the
// user picks a different editor theme.

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS as DndCSS } from "@dnd-kit/utilities";
import React, {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import "../playground.css";
import "../sqlPlayground.css";
import { EditorState, Compartment } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers as lineNumbersExt,
  highlightActiveLineGutter,
  highlightActiveLine,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  tooltips,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  indentOnInput,
  indentUnit,
} from "@codemirror/language";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  startCompletion,
  acceptCompletion,
} from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { sql as sqlLang, SQLite } from "@codemirror/lang-sql";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Popover } from "@base-ui-components/react/popover";
import { AlertDialog } from "@base-ui-components/react/alert-dialog";
import { Dialog } from "@base-ui-components/react/dialog";
import { Tabs } from "@base-ui-components/react/tabs";
import { Toast } from "@base-ui-components/react/toast";
import { Select } from "@base-ui-components/react/select";
import { Checkbox } from "@base-ui-components/react/checkbox";
import { Menu } from "@base-ui-components/react/menu";
import { ContextMenu } from "@base-ui-components/react/context-menu";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUp,
  ChevronUp,
  CircleHelp,
  Clock,
  Eye,
  Database,
  FilePlus,
  FileText,
  FileJson,
  GripVertical,
  Hash,
  Network,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Table,
  Trash2,
  TriangleAlert,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { FaInfo } from "react-icons/fa";
import { IoLink } from "react-icons/io5";
import { MdOutlineKey } from "react-icons/md";
import type { RuntimeInfo } from "../types";
import { PLAYGROUNDS } from "../playgrounds";
import {
  LANGUAGE_ICONS as PLAYGROUND_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR as PLAYGROUND_ICON_SIZE_FACTOR,
  LANGUAGE_ICON_COLORS as PLAYGROUND_ICON_COLORS,
} from "../languageIcons";
import {
  applyMode,
  applyThemePalette,
  clearThemePalette,
  getStoredEditorTheme,
  LIGHT_THEMES,
  setStoredEditorTheme,
} from "../playgroundTheme";
import {
  DEFAULT_PLAYGROUND_SETTINGS,
  DataslopeRunOverlay,
  LOADING_QUIPS,
  RuntimeInfoContent,
  SettingsPanel,
  detectIsMac,
} from "../playgroundShared";
import {
  SQLITE_SAMPLE_DATABASES,
  findSampleDatabase,
} from "../runtime/sqliteSamples";
import {
  createSqliteEngine,
  type ColumnConstraintInfo,
  type ColumnSpec,
  type ForeignKeyInfo,
  type SqliteEngine,
  type TableColumnInfo,
} from "../runtime/sqlite";
import type { QueryExecResult, SqlValue } from "sql.js";
import { ErDiagramPane } from "../ErDiagramPane";
import { ToastList } from "./components/ToastList";
import { SqlTab } from "./components/SqlTab";
import {
  createSqlCompletionSource,
  type SqlCompletionSchema,
} from "./sqlCompletion";
import { useSettingsStore } from "./stores/useSettingsStore";
import { usePragmaStore } from "./stores/usePragmaStore";
import { useSqlPlaygroundStore } from "./stores/useSqlPlaygroundStore";
import {
  dbScopedKey,
  loadActiveTabId,
  loadTabs,
  newTabId,
  saveTabs,
  storageKey,
  tabsAreDirty,
  type QueryTab,
} from "../sqlitePlaygroundTabs";
import { themeFor } from "../cmExtensions";
// Replace the entire editor document — the v6 idiom for what v5 called
// `editor.setValue(s)`. Centralised so the call sites that swap tab
// contents all read the same.
function replaceDoc(view: EditorView, value: string): void {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: value },
  });
}

// CodeMirror's default is 100ms; 75ms keeps local schema suggestions feeling
// immediate while still coalescing rapid typing before recomputing completions.
const AUTOCOMPLETE_DELAY_MS = 75;

function sqlAutocompletion(schema: SqlCompletionSchema) {
  const source = createSqlCompletionSource(schema);
  return autocompletion({
    activateOnTyping: true,
    activateOnTypingDelay: AUTOCOMPLETE_DELAY_MS,
    closeOnBlur: true,
    override: [source],
  });
}

const PLAYGROUND_ID = "sqlite";

const DROP_KIND_LABELS: Record<"table" | "view" | "index" | "trigger", string> =
  { table: "Table", view: "View", index: "Index", trigger: "Trigger" };

const RUNTIME_INFO: RuntimeInfo = {
  language: "SQLite",
  version: "3.49",
  engine: "sql.js 1.13",
  engineUrl: "https://sql.js.org/",
  notes:
    "Pure-JS build of SQLite compiled to WebAssembly. Each sample database is rebuilt in memory on every page load.",
};

// ────────────────────────────────────────────────────────────────────────
// SQLite error hint helper — maps common engine error strings to short
// plain-English suggestions that appear beneath the raw error message.
// ────────────────────────────────────────────────────────────────────────

function getSqliteErrorHint(error: string): string | null {
  const nearMatch = error.match(/^near "(.+)": syntax error$/i);
  if (nearMatch) {
    return `Unexpected token "${nearMatch[1]}". Check for typos in SQL keywords or extra characters.`;
  }
  const noTableMatch = error.match(/^no such table: (.+)$/i);
  if (noTableMatch) {
    return `Table "${noTableMatch[1]}" does not exist. Check the Tables pane for available tables.`;
  }
  const noColumnMatch = error.match(/^no such column: (.+)$/i);
  if (noColumnMatch) {
    return `Column "${noColumnMatch[1]}" was not found. Verify column names with View Structure.`;
  }
  const uniqueMatch = error.match(/^UNIQUE constraint failed: (.+)$/i);
  if (uniqueMatch) {
    return `Duplicate value violates the UNIQUE constraint on "${uniqueMatch[1]}".`;
  }
  const notNullMatch = error.match(/^NOT NULL constraint failed: (.+)$/i);
  if (notNullMatch) {
    return `"${notNullMatch[1]}" requires a non-NULL value.`;
  }
  if (/^FOREIGN KEY constraint failed$/i.test(error)) {
    return "The value does not exist in the referenced table.";
  }
  const ambiguousMatch = error.match(/^ambiguous column name: (.+)$/i);
  if (ambiguousMatch) {
    return `Column "${ambiguousMatch[1]}" is ambiguous. Use table-qualified names, e.g. table.column.`;
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────
// CSV export helper
// ────────────────────────────────────────────────────────────────────────

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes("\n") || s.includes("\r") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toFileSafeName(title: string): string {
  return title.replace(/[/\\:*?"<>|\x00-\x1f]/g, "_").trim() || "result_set";
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function exportResultToCsv(
  columns: string[],
  rows: QueryExecResult["values"],
  filename: string,
): void {
  const lines = [
    columns.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  triggerDownload(
    new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" }),
    filename,
  );
}

function exportResultToJson(
  columns: string[],
  rows: QueryExecResult["values"],
  filename: string,
): void {
  const data = rows.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i] ?? null;
    });
    return obj;
  });
  triggerDownload(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    filename,
  );
}

function exportResultToSql(
  columns: string[],
  rows: QueryExecResult["values"],
  filename: string,
): void {
  const quotedCols = columns
    .map((c) => `"${c.replace(/"/g, '""')}"`)
    .join(", ");
  const lines = rows.map((row) => {
    const vals = row
      .map((v) => {
        if (v === null || v === undefined) return "NULL";
        if (typeof v === "number") return String(v);
        return `'${String(v).replace(/'/g, "''")}'`;
      })
      .join(", ");
    return `INSERT INTO result_set (${quotedCols}) VALUES (${vals});`;
  });
  triggerDownload(
    new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }),
    filename,
  );
}

// ─── Parquet helpers ─────────────────────────────────────────────────────
//
// Loaded lazily on first use via dynamic imports so the WASM binary is
// not bundled into the initial page chunk. The WASM is fetched from the
// jsDelivr CDN, loaded once, and cached thereafter.

let _parquetWasmInit: Promise<typeof import("parquet-wasm/esm")> | null = null;

async function initParquetWasm(): Promise<typeof import("parquet-wasm/esm")> {
  if (!_parquetWasmInit) {
    _parquetWasmInit = (async () => {
      const mod = await import("parquet-wasm/esm");
      await mod.default("https://cdn.jsdelivr.net/npm/parquet-wasm@0.7.1/esm/parquet_wasm_bg.wasm");
      return mod;
    })();
  }
  return _parquetWasmInit;
}

async function exportResultToParquet(
  columns: string[],
  rows: QueryExecResult["values"],
  filename: string,
): Promise<void> {
  const [{ tableToIPC, tableFromArrays, Utf8, Float64, vectorFromArray }, { Table: WasmParquetTable, writeParquet }] = await Promise.all([
    import("apache-arrow"),
    initParquetWasm(),
  ]);

  // Build per-column value arrays, preserving nulls.
  const colArrays: Record<string, unknown[]> = {};
  for (const col of columns) colArrays[col] = [];
  for (const row of rows) {
    for (let i = 0; i < columns.length; i++) {
      const v = row[i];
      colArrays[columns[i]].push(v === undefined ? null : v);
    }
  }

  // Detect column types: if every non-null value is a number treat as
  // Float64, otherwise treat as Utf8 (string).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fields: Record<string, any> = {};
  for (const col of columns) {
    const vals = colArrays[col];
    const isNumeric = vals.every((v) => v === null || typeof v === "number");
    if (isNumeric) {
      fields[col] = vectorFromArray(vals as (number | null)[], new Float64());
    } else {
      fields[col] = vectorFromArray(
        vals.map((v) => (v === null ? null : String(v))),
        new Utf8(),
      );
    }
  }

  const arrowTable = tableFromArrays(fields as Parameters<typeof tableFromArrays>[0]);
  const ipcBytes = tableToIPC(arrowTable, "stream");
  const wasmTable = WasmParquetTable.fromIPCStream(ipcBytes);
  const parquetBytes = writeParquet(wasmTable);
  triggerDownload(
    new Blob([parquetBytes], { type: "application/octet-stream" }),
    filename,
  );
}

async function importParquetFile(
  file: File,
): Promise<{ columns: string[]; rows: QueryExecResult["values"] }> {
  const [{ tableFromIPC }, mod] = await Promise.all([
    import("apache-arrow"),
    initParquetWasm(),
  ]);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const wasmTable = mod.readParquet(bytes);
  const arrowTable = tableFromIPC(wasmTable.intoIPCStream());

  const columns = arrowTable.schema.fields.map((f) => f.name);
  // Pre-build column index map to avoid O(n) findIndex inside the row loop.
  const colIndexMap = new Map(columns.map((name, i) => [name, i]));
  const colVectors = columns.map((_, i) => arrowTable.getChildAt(i));
  const rows: QueryExecResult["values"] = [];
  for (let r = 0; r < arrowTable.numRows; r++) {
    const row: QueryExecResult["values"][number] = [];
    for (let c = 0; c < columns.length; c++) {
      const val = colVectors[colIndexMap.get(columns[c])!]?.get(r);
      row.push((val === undefined ? null : val) as SqlValue);
    }
    rows.push(row);
  }
  return { columns, rows };
}

// ─── XLSX helpers (wasm-xlsxwriter) ─────────────────────────────────────────
//
// Loaded lazily on first use via dynamic imports so the WASM binary is
// not bundled into the initial page chunk. The WASM is fetched from the
// jsDelivr CDN, loaded once, and cached thereafter.

let _xlsxWasmInit: Promise<typeof import("wasm-xlsxwriter/web")> | null = null;

async function initXlsxWasm(): Promise<typeof import("wasm-xlsxwriter/web")> {
  if (!_xlsxWasmInit) {
    _xlsxWasmInit = (async () => {
      const mod = await import("wasm-xlsxwriter/web");
      await mod.default("https://cdn.jsdelivr.net/npm/wasm-xlsxwriter@0.13.0/web/wasm_xlsxwriter_bg.wasm");
      return mod;
    })();
  }
  return _xlsxWasmInit;
}

/** Convert a SQLite cell value to an ExcelData-compatible type. */
function toExcelData(v: unknown): string | number | boolean | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v;
  if (v instanceof Uint8Array) return `[BLOB ${v.length} bytes]`;
  return String(v);
}

/**
 * Export columns + rows to a single-sheet Excel (.xlsx) file.
 * The first row is the header row.
 */
async function exportResultToXlsx(
  columns: string[],
  rows: QueryExecResult["values"],
  filename: string,
): Promise<void> {
  const mod = await initXlsxWasm();
  const workbook = new mod.Workbook();
  const worksheet = workbook.addWorksheet();
  // Header row
  worksheet.writeRow(0, 0, columns);
  // Data rows
  for (let ri = 0; ri < rows.length; ri++) {
    worksheet.writeRow(ri + 1, 0, rows[ri].map(toExcelData));
  }
  const bytes = workbook.saveToBufferSync();
  triggerDownload(
    new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}

// ────────────────────────────────────────────────────────────────────────
// Modify Structure drawer
// ────────────────────────────────────────────────────────────────────────

/** SQLite type-affinity options exposed by the Modify Structure drawer.
 *  These cover the five storage classes plus a few common aliases. The
 *  selected value is passed through to the engine's `rebuildTable`,
 *  which validates it against an identifier-shaped allowlist before
 *  inlining. */
const COLUMN_TYPES = [
  "INTEGER",
  "REAL",
  "TEXT",
  "BLOB",
  "NUMERIC",
  "BOOLEAN",
  "DATETIME",
] as const;

/** Allowed ON DELETE / ON UPDATE actions for foreign-key columns. */
const FK_ACTIONS = [
  "NO ACTION",
  "RESTRICT",
  "CASCADE",
  "SET NULL",
  "SET DEFAULT",
] as const;

/** Editable representation of one column inside the Modify Structure
 *  drawer. We keep `originalName` separately so the engine knows which
 *  column to copy from when applying a rename. `id` is a stable, local
 *  identifier so React's reconciliation matches rows correctly even
 *  while the user renames or reorders them. */
interface ModifyColumnDraft {
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
}

function newDraftId(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Hints used by the result-view header to render PK / FK icons next
 *  to columns sourced from a known table. Computed by the parent
 *  whenever the current tab's result was produced by a sidebar
 *  preview, and threaded through `ResultView` → `ResultTableBody`. */
interface ColumnKeyHints {
  pk: Set<string>;
  fk: Map<string, ForeignKeyInfo>;
}

interface ResultTableRow {
  absoluteRow: number;
  values: QueryExecResult["values"][number];
}

// ────────────────────────────────────────────────────────────────────────
// Result formatting
// ────────────────────────────────────────────────────────────────────────

/** Infer a SQLite-style type label from the runtime JavaScript value.
 *  Scans the column's values to find the first non-null entry so that
 *  all-null columns fall back to "NULL" rather than silently showing
 *  nothing. Returns "INTEGER", "REAL", "TEXT", "BLOB", or "NULL". */
function inferColumnType(
  rows: QueryExecResult["values"],
  colIdx: number,
): string {
  for (const row of rows) {
    const v = row[colIdx];
    if (v === null) continue;
    if (v instanceof Uint8Array) return "BLOB";
    if (typeof v === "number") return Number.isInteger(v) ? "INTEGER" : "REAL";
    if (typeof v === "string") return "TEXT";
  }
  return "NULL";
}

interface QueryRunResult {
  /** The result sets returned by sql.js (one per SELECT-like statement). */
  sets: QueryExecResult[];
  /** Time the run took in milliseconds. */
  elapsedMs: number;
  /** Optional error message if the run failed mid-way. */
  error?: string;
  /** Optional source label shown above the result panel — either the
   *  active tab's title or, for sidebar previews, the table name. */
  source: string;
  /** When the result came from a sidebar preview, the underlying
   *  table name. The result view uses this to look up PK / FK
   *  metadata so it can render key icons next to those headers. We
   *  intentionally only set this for previews — arbitrary user SQL has
   *  no single "source table" so we don't try to guess. */
  sourceTable?: string;
  /** When lazy SQL pagination is active: the original trimmed SQL that
   *  produced this result. Stored so page-navigation can re-run it
   *  with a different LIMIT/OFFSET without requiring the caller to pass
   *  it again. Undefined when the result was produced with all rows
   *  loaded into memory (non-lazy mode). */
  lazySql?: string;
  /** When lazy SQL pagination is active: the original SQL before any
   *  ORDER BY clauses were appended for UI sorting. Preserved so that
   *  clearing a column sort reverts to the base query. */
  lazyBaseSql?: string;
  /** When lazy SQL pagination is active: total row count across all
   *  pages, from a COUNT(*) wrapper executed at query time. Used by
   *  the pagination footer to display accurate totals without loading
   *  all rows into memory. */
  lazyTotalCount?: number;
  /** When lazy SQL pagination is active: 0-based index of the page
   *  whose rows are stored in `sets`. */
  lazyPage?: number;
  /** When lazy SQL pagination is active: the page size (rows per page)
   *  that was used to fetch this result. Stored separately from the
   *  global setting so that delete/edit row-index calculations remain
   *  correct even if the user changes the page size between the query
   *  run and the action. */
  lazyPageSize?: number;
}

type ResultSetExportScope = "page" | "all";

interface ResultSetExportSnapshot {
  setIndex: number;
  columns: string[];
  allRows: QueryExecResult["values"];
  rows: QueryExecResult["values"];
  totalRows: number;
  pageSize: number;
  currentPage: number;
}

type SelectedRowsByResult = Record<number, Set<number>>;
type PendingEditsByResult = Record<number, Map<string, unknown>>;

/** Quote a SQLite identifier with double-quotes, escaping embedded
 *  double-quotes per the SQL standard. Used for column and table names
 *  wherever SQL is generated by string concatenation. */
function quoteIdentSql(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Parse a React Table column id of the form `col-${ci}-${name}` back
 *  into its column index and original column name. */
function parseColumnId(id: string): { ci: number; name: string } | null {
  const match = id.match(/^col-(\d+)-(.+)$/);
  if (!match) return null;
  return { ci: Number(match[1]), name: match[2] };
}

/** Compare two SQLite cell values for client-side sorting. NULL sorts
 *  before all other values; numbers compare numerically; everything
 *  else is coerced to string. */
function compareCellValues(a: unknown, b: unknown): number {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function formatCellValue(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NaN";
  if (v instanceof Uint8Array) return `BLOB (${v.length} bytes)`;
  return String(v);
}

/** Format a cell value as a SQL literal suitable for INSERT / SELECT. */
function formatCellAsSql(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "string") return `'${v.replace(/'/g, "''")}'`;
  if (v instanceof Uint8Array) {
    const hex = Array.from(v)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `x'${hex}'`;
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}

function parseCellEditValue(raw: string, isNumeric: boolean): unknown {
  if (raw === "" || raw === "NULL") return null;
  if (!isNumeric) return raw;
  const n = Number(raw);
  // Keep as string if it doesn't parse cleanly so the user can see what
  // they typed rather than silently coercing to NaN or 0.
  return Number.isFinite(n) ? n : raw;
}

function cloneSelections(src: SelectedRowsByResult): SelectedRowsByResult {
  return Object.fromEntries(
    Object.entries(src).map(([idx, rows]) => [idx, new Set(rows)]),
  ) as SelectedRowsByResult;
}

function clonePendingEdits(src: PendingEditsByResult): PendingEditsByResult {
  return Object.fromEntries(
    Object.entries(src).map(([idx, edits]) => [idx, new Map(edits)]),
  ) as PendingEditsByResult;
}

/** Parse a pending-edit key of the form `${absoluteRow}:${columnIndex}`. */
function parseCellKey(cellKey: string): { row: number; col: string } | null {
  const [rowStr, col] = cellKey.split(":");
  const row = Number(rowStr);
  return Number.isInteger(row) ? { row, col } : null;
}

// ────────────────────────────────────────────────────────────────────────
// SQL analysis helpers used for lazy (server-side) pagination decisions.
// ────────────────────────────────────────────────────────────────────────

/** Strip block (`/* … *\/`) and line (`-- …`) comments from a SQL string. */
function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\r\n]*/g, "");
}

/** Returns true when `sql` appears to be a single SELECT or CTE statement
 *  (no multi-statement semicolons, starts with SELECT or WITH). Used to
 *  decide whether lazy LIMIT/OFFSET pagination is applicable.
 *  Pass `noComments` (the result of `stripSqlComments(sql)`) when you have
 *  already stripped comments to avoid redundant work. */
function isSingleSelectSql(sql: string, noComments?: string): boolean {
  const stripped = (noComments ?? stripSqlComments(sql)).trim().replace(/;+\s*$/, "");
  if (stripped.includes(";")) return false;
  return /^(select|with)\s/i.test(stripped);
}

/** Returns true when `sql` already contains a LIMIT keyword (after
 *  stripping comments and single-quoted string literals). When true, lazy
 *  pagination is skipped: appending another LIMIT would produce invalid SQL.
 *  Single-quoted strings are stripped first so a value like `'No limit'`
 *  does not trigger a false positive.
 *  Pass `noComments` (the result of `stripSqlComments(sql)`) when you have
 *  already stripped comments to avoid redundant work. */
function hasLimitClause(sqlOrNoComments: string): boolean {
  const noStrings = sqlOrNoComments.replace(/'(?:''|[^'])*'/g, "''");
  return /\blimit\b/i.test(noStrings);
}

/** Count deleted rows before a row index to calculate its post-delete shift. */
function countSortedValuesLessThan(values: number[], target: number): number {
  let lo = 0;
  let hi = values.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (values[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Shift pending edit row indices after deletions and remove edits on deleted rows. */
function pendingEditsAfterDeletedRows(
  src: PendingEditsByResult,
  setIdx: number,
  deletedRows: Set<number>,
): PendingEditsByResult {
  const next = clonePendingEdits(src);
  const edits = next[setIdx];
  if (!edits) return next;
  const sortedDeleted = [...deletedRows].sort((a, b) => a - b);
  const shifted = new Map<string, unknown>();
  for (const [cellKey, value] of edits) {
    const parsed = parseCellKey(cellKey);
    if (!parsed || deletedRows.has(parsed.row)) continue;
    const { row, col } = parsed;
    const shift = countSortedValuesLessThan(sortedDeleted, row);
    shifted.set(`${row - shift}:${col}`, value);
  }
  if (shifted.size > 0) next[setIdx] = shifted;
  else delete next[setIdx];
  return next;
}

// ────────────────────────────────────────────────────────────────────────
// Pagination defaults — shared globally across all result sets, tabs
// and databases. The "All" option (value = 0) renders every row at
// once and hides the page navigator. The chosen size is persisted to
// localStorage so the user's preference survives reloads.
// ────────────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: 250, label: "250" },
  { value: 500, label: "500" },
  { value: 0, label: "All" },
];


// ─── Pragma settings ─────────────────────────────────────────────────────

/** SQLite pragma defaults that the playground starts with when no saved
 *  preferences are found. `foreignKeys` is ON here because the engine
 *  already enables it via `PRAGMA foreign_keys = ON` in `build()`. */
const DEFAULT_PRAGMA_SETTINGS = {
  foreignKeys: true,
  journalMode: "delete",
  synchronous: "full",
  pageSize: 4096,
  automaticIndex: true,
  caseSensitiveLike: false,
} as const;

type PragmaSettings = {
  foreignKeys: boolean;
  journalMode: string;
  synchronous: string;
  pageSize: number;
  automaticIndex: boolean;
  caseSensitiveLike: boolean;
};

/** Minimum and maximum valid SQLite page sizes. */
const PRAGMA_PAGE_SIZE_MIN = 512;
const PRAGMA_PAGE_SIZE_MAX = 65536;

/** Maps the human-readable `synchronous` setting names to their
 *  PRAGMA integer values. Kept at module level to avoid re-creating
 *  the object on every `applyPragmasToEngine` call. */
const PRAGMA_SYNC_MAP: Record<string, string> = {
  off: "0",
  normal: "1",
  full: "2",
};

/** Apply a set of pragma settings to an already-initialised SQLite engine.
 *  Called once after the engine boots and again whenever the user saves
 *  changes in the Pragmas settings tab. Errors are swallowed so a single
 *  unsupported pragma (e.g. page_size on an existing database) does not
 *  prevent the other pragmas from being applied. */
function applyPragmasToEngine(
  engine: import("../runtime/sqlite").SqliteEngine,
  p: PragmaSettings,
): void {
  const statements: string[] = [
    `PRAGMA foreign_keys = ${p.foreignKeys ? "ON" : "OFF"}`,
    `PRAGMA journal_mode = ${p.journalMode}`,
    `PRAGMA synchronous = ${PRAGMA_SYNC_MAP[p.synchronous] ?? "2"}`,
    `PRAGMA page_size = ${Math.max(PRAGMA_PAGE_SIZE_MIN, Math.min(PRAGMA_PAGE_SIZE_MAX, p.pageSize))}`,
    `PRAGMA automatic_index = ${p.automaticIndex ? "ON" : "OFF"}`,
    `PRAGMA case_sensitive_like = ${p.caseSensitiveLike ? "ON" : "OFF"}`,
  ];
  for (const sql of statements) {
    try {
      engine.exec(sql);
    } catch {
      // Silently ignore unsupported pragmas (e.g. page_size on a non-empty db).
    }
  }
}

/** Delay before treating a sidebar-row click as a single click. The
 *  schema rows distinguish single-click (toggle expand) from
 *  double-click (preview) by deferring the toggle for slightly less
 *  than the OS-typical double-click threshold (≤ 250ms). The 220ms
 *  window ensures click2 of a double-click always arrives before the
 *  timer fires, so dblclick can reliably cancel the pending toggle. */
const SINGLE_CLICK_DELAY_MS = 220;

// ────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────

export default function SqlPlayground() {
  return (
    <Toast.Provider timeout={2400}>
      <SqlPlaygroundInner />
      <Toast.Portal>
        <Toast.Viewport className="toast-viewport">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

// ─── Pragma descriptions shown in each row's info popover ────────────────────

const PRAGMA_DESCRIPTIONS: Record<keyof PragmaSettings, string> = {
  foreignKeys:
    "Enforces referential integrity for foreign key constraints. When ON, SQLite raises an error on inserts or updates that would violate a declared FOREIGN KEY relationship.",
  journalMode:
    "Controls how the rollback journal file is managed after a commit. DELETE (default) removes the journal each time. WAL (Write-Ahead Log) allows concurrent reads while a write is in progress.",
  synchronous:
    "Controls how aggressively SQLite syncs data to disk. FULL (default) is safest; NORMAL reduces sync calls; OFF skips syncing entirely and is fastest but risks corruption on an OS crash.",
  pageSize:
    "Size in bytes of each page in the database file. Must be a power of 2 between 512 and 65536. Can only be changed before the first table is created in a new database.",
  automaticIndex:
    "When ON (default), SQLite may automatically create temporary indexes during query planning to speed up full-table scans. Disabling reduces memory overhead at the cost of potentially slower queries.",
  caseSensitiveLike:
    "When ON, the LIKE operator distinguishes uppercase and lowercase ASCII letters. By default (OFF), LIKE is case-insensitive for ASCII characters.",
};

function PragmaInfoButton({ pragma }: { pragma: keyof PragmaSettings }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        className="pragma-info-btn"
        aria-label="More info"
        openOnHover
        delay={80}
        closeDelay={120}
      >
        <CircleHelp size={13} aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          className="pragma-info-positioner"
          sideOffset={6}
          align="start"
        >
          <Popover.Popup className="bui-popup pragma-info-popup">
            <p className="pragma-info-text">{PRAGMA_DESCRIPTIONS[pragma]}</p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ─── Column header popovers in the modify-table drawer ───────────────────────

const COLUMN_HEADER_DESCRIPTIONS: Record<string, string> = {
  type: "The SQLite data type for this column, such as INTEGER, TEXT, REAL, or BLOB.",
  notNull:
    "When checked, every row must have a value in this column. NULL values are not allowed.",
  primary:
    "When checked, this column is the primary key used to uniquely identify each row.",
  unique: "When checked, no two rows can have the same value in this column.",
  autoIncrement:
    "When checked, SQLite automatically assigns an incrementing integer value for each new row.",
  defaultValue:
    "The value automatically used for this column when no value is provided during insertion.",
  fkTable: "The table that this column references as a foreign key.",
  fkColumn:
    "The column in the referenced table that this foreign key column maps to.",
  onDelete:
    "The action to perform when the referenced row in the foreign table is deleted.",
  onUpdate:
    "The action to perform when the referenced value in the foreign table is updated.",
};

function ColumnHeaderPopover({ pragma }: { pragma: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        className="sql-col-header-info"
        aria-label="More info"
        openOnHover
        delay={80}
        closeDelay={120}
      >
        <CircleHelp size={11} aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          className="sql-col-header-positioner"
          sideOffset={6}
          align="center"
        >
          <Popover.Popup className="bui-popup sql-col-header-popup">
            <p className="sql-col-header-text">
              {COLUMN_HEADER_DESCRIPTIONS[pragma]}
            </p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ─── Pragma settings tab ─────────────────────────────────────────────────────

function PragmaSettingsTab({
  savedPragmas,
  onSave,
}: {
  savedPragmas: PragmaSettings;
  onSave: (p: PragmaSettings) => void;
}) {
  const [draft, setDraft] = useState<PragmaSettings>({ ...savedPragmas });

  const hasChanges =
    draft.foreignKeys !== savedPragmas.foreignKeys ||
    draft.journalMode !== savedPragmas.journalMode ||
    draft.synchronous !== savedPragmas.synchronous ||
    draft.pageSize !== savedPragmas.pageSize ||
    draft.automaticIndex !== savedPragmas.automaticIndex ||
    draft.caseSensitiveLike !== savedPragmas.caseSensitiveLike;

  return (
    <Tabs.Panel value="pragmas" className="settings-panel-pane">
      <div className="settings-body pragma-settings-body">
        {/* Foreign keys */}
        <div className="pragma-row">
          <div className="pragma-label-wrap">
            <span className="pragma-label">Foreign Keys</span>
            <PragmaInfoButton pragma="foreignKeys" />
          </div>
          <label className="setting-checkbox-row pragma-checkbox-row">
            <input
              type="checkbox"
              checked={draft.foreignKeys}
              onChange={(e) =>
                setDraft((d) => ({ ...d, foreignKeys: e.target.checked }))
              }
            />
            <span className="pragma-checkbox-label">
              {draft.foreignKeys ? "Enabled" : "Disabled"}
            </span>
          </label>
        </div>

        {/* Journal mode */}
        <div className="pragma-row">
          <div className="pragma-label-wrap">
            <span className="pragma-label">Journal Mode</span>
            <PragmaInfoButton pragma="journalMode" />
          </div>
          <div className="pragma-select-wrap">
            <select
              className="pragma-select"
              value={draft.journalMode}
              onChange={(e) =>
                setDraft((d) => ({ ...d, journalMode: e.target.value }))
              }
            >
              <option value="delete">Delete</option>
              <option value="truncate">Truncate</option>
              <option value="persist">Persist</option>
              <option value="memory">Memory</option>
              <option value="wal">WAL</option>
              <option value="off">Off</option>
            </select>
          </div>
        </div>

        {/* Synchronous */}
        <div className="pragma-row">
          <div className="pragma-label-wrap">
            <span className="pragma-label">Synchronous</span>
            <PragmaInfoButton pragma="synchronous" />
          </div>
          <div className="pragma-select-wrap">
            <select
              className="pragma-select"
              value={draft.synchronous}
              onChange={(e) =>
                setDraft((d) => ({ ...d, synchronous: e.target.value }))
              }
            >
              <option value="off">Off</option>
              <option value="normal">Normal</option>
              <option value="full">Full</option>
            </select>
          </div>
        </div>

        {/* Page size */}
        <div className="pragma-row">
          <div className="pragma-label-wrap">
            <span className="pragma-label">Page Size (bytes)</span>
            <PragmaInfoButton pragma="pageSize" />
          </div>
          <div className="pragma-select-wrap">
            <select
              className="pragma-select"
              value={draft.pageSize}
              onChange={(e) =>
                setDraft((d) => ({ ...d, pageSize: Number(e.target.value) }))
              }
            >
              <option value={512}>512</option>
              <option value={1024}>1024</option>
              <option value={2048}>2048</option>
              <option value={4096}>4096</option>
              <option value={8192}>8192</option>
              <option value={16384}>16384</option>
              <option value={32768}>32768</option>
              <option value={65536}>65536</option>
            </select>
          </div>
        </div>

        {/* Automatic index */}
        <div className="pragma-row">
          <div className="pragma-label-wrap">
            <span className="pragma-label">Automatic Index</span>
            <PragmaInfoButton pragma="automaticIndex" />
          </div>
          <label className="setting-checkbox-row pragma-checkbox-row">
            <input
              type="checkbox"
              checked={draft.automaticIndex}
              onChange={(e) =>
                setDraft((d) => ({ ...d, automaticIndex: e.target.checked }))
              }
            />
            <span className="pragma-checkbox-label">
              {draft.automaticIndex ? "Enabled" : "Disabled"}
            </span>
          </label>
        </div>

        {/* Case sensitive LIKE */}
        <div className="pragma-row">
          <div className="pragma-label-wrap">
            <span className="pragma-label">Case Sensitive LIKE</span>
            <PragmaInfoButton pragma="caseSensitiveLike" />
          </div>
          <label className="setting-checkbox-row pragma-checkbox-row">
            <input
              type="checkbox"
              checked={draft.caseSensitiveLike}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  caseSensitiveLike: e.target.checked,
                }))
              }
            />
            <span className="pragma-checkbox-label">
              {draft.caseSensitiveLike ? "Enabled" : "Disabled"}
            </span>
          </label>
        </div>

        {/* Bottom actions */}
        <div className="pragma-actions">
          <button
            type="button"
            className="settings-action-btn"
            onClick={() => setDraft({ ...DEFAULT_PRAGMA_SETTINGS })}
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>Reset to defaults</span>
          </button>
          <button
            type="button"
            className="pragma-save-btn"
            disabled={!hasChanges}
            onClick={() => onSave(draft)}
          >
            Save
          </button>
        </div>
      </div>
    </Tabs.Panel>
  );
}

function SqlPlaygroundInner() {
  const router = useRouter();

  // ─── Settings state (Zustand-backed) ───────────────────────────────
  const fontSize = useSettingsStore((s) => s.fontSize);
  const setFontSizeState = useSettingsStore((s) => s.setFontSize);
  const outputFontSizeEnabled = useSettingsStore(
    (s) => s.outputFontSizeEnabled,
  );
  const setOutputFontSizeEnabledState = useSettingsStore(
    (s) => s.setOutputFontSizeEnabled,
  );
  const outputFontSize = useSettingsStore((s) => s.outputFontSize);
  const setOutputFontSizeState = useSettingsStore((s) => s.setOutputFontSize);
  const editorTheme = useSettingsStore((s) => s.editorTheme);
  const setEditorThemeState = useSettingsStore((s) => s.setEditorTheme);
  const wordWrap = useSettingsStore((s) => s.wordWrap);
  const setWordWrapState = useSettingsStore((s) => s.setWordWrap);
  const clearBeforeRun = useSettingsStore((s) => s.clearBeforeRun);
  const setClearBeforeRunState = useSettingsStore((s) => s.setClearBeforeRun);
  const [resultSetExportSnapshot, setResultSetExportSnapshot] =
    useState<ResultSetExportSnapshot | null>(null);

  // ─── Pragma settings ────────────────────────────────────────────────
  const pragmaSettings = usePragmaStore((s) => s.pragmaSettings);
  const setPragmaSettingsState = usePragmaStore((s) => s.setPragmaSettings);
  // Ref kept in sync so applyPragmasToEngine can always read the latest
  // saved values even when called from async engine-init callbacks.
  const pragmaSettingsRef = useRef<PragmaSettings>(DEFAULT_PRAGMA_SETTINGS);

  // ─── Global page size ────────────────────────────────────────────────
  // Lifted from ResultView so that runSqlForTab can read the current
  // value synchronously (via a ref) when deciding whether to apply lazy
  // LIMIT/OFFSET pagination. A matching ref is kept in sync so the
  // callback closure always sees the latest value even if the state
  // update hasn't flushed yet.
  const globalPageSize = useSqlPlaygroundStore((s) => s.globalPageSize);
  const setGlobalPageSizeState = useSqlPlaygroundStore(
    (s) => s.setGlobalPageSize,
  );
  const globalPageSizeRef = useRef(globalPageSize);
  useEffect(() => {
    globalPageSizeRef.current = globalPageSize;
  }, [globalPageSize]);
  useEffect(() => {
    pragmaSettingsRef.current = pragmaSettings;
  }, [pragmaSettings]);
  const setGlobalPageSize = useCallback((n: number) => {
    // Update the ref synchronously so any callback that reads it in the
    // same event loop tick (e.g. onLoadPage right after onSetGlobalPageSize)
    // sees the new value before the React state flush.
    globalPageSizeRef.current = n;
    setGlobalPageSizeState(n);
    try {
      localStorage.setItem(storageKey("page_size"), String(n));
    } catch {
      // ignore quota errors
    }
  }, [setGlobalPageSizeState]);

  // ─── UI state ───────────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [confirmClearStorageOpen, setConfirmClearStorageOpen] = useState(false);
  const [confirmCloseTabId, setConfirmCloseTabId] = useState<string | null>(
    null,
  );
  const [pendingDbId, setPendingDbId] = useState<string | null>(null);
  // DDL viewer dialog state. We keep both the title (entity name) and
  // the DDL string so the dialog can stay open while the underlying
  // sidebar list mutates from a concurrent DROP.
  const [ddlDialog, setDdlDialog] = useState<{
    title: string;
    sql: string;
  } | null>(null);
  // Modify Structure drawer state. `null` = closed; an object holds the
  // editable form spec for the table currently being modified.
  const [modifyDialog, setModifyDialog] = useState<{
    originalName: string;
    newName: string;
    columns: ModifyColumnDraft[];
  } | null>(null);
  const [modifyInvalidColIds, setModifyInvalidColIds] = useState<Set<string>>(new Set());
  // Add Row drawer state.
  const [addRowDialog, setAddRowDialog] = useState<{
    tableName: string;
    columns: TableColumnInfo[];
    values: Record<string, string>;
    addAnother: boolean;
  } | null>(null);
  // Add Table drawer state — shares the ModifyStructureState shape so
  // the same ModifyStructureForm can be reused.
  const [addTableDialog, setAddTableDialog] = useState<{
    originalName: string;
    newName: string;
    columns: ModifyColumnDraft[];
  } | null>(null);
  const [addTableInvalidColIds, setAddTableInvalidColIds] = useState<Set<string>>(new Set());
  // Truncate confirmation dialog state.
  const [truncateConfirm, setTruncateConfirm] = useState<string | null>(null);
  // Drop entity confirmation dialog state.
  const [pendingDropEntity, setPendingDropEntity] = useState<{
    name: string;
    kind: "table" | "view" | "index" | "trigger";
  } | null>(null);
  // Import dialogs state.
  const [importSqliteOpen, setImportSqliteOpen] = useState(false);
  const [importSqliteDragging, setImportSqliteDragging] = useState(false);
  // CSV import: once a file is parsed, we store headers + preview rows
  // alongside the derived table name so the user can review before committing.
  // `targetMode` controls whether to create a new table or append to an
  // existing one; `targetTable` holds the selected existing table name.
  type CsvImportState = {
    tableName: string;
    headers: string[];
    rows: string[][];
    rawText: string;
    targetMode: "new" | "existing";
    targetTable: string;
  };
  const [importCsvOpen, setImportCsvOpen] = useState(false);
  const [importCsvDragging, setImportCsvDragging] = useState(false);
  const [importCsvState, setImportCsvState] = useState<CsvImportState | null>(
    null,
  );
  // JSON import: same shape — headers are object keys, rows are values.
  type JsonImportState = {
    tableName: string;
    headers: string[];
    rows: string[][];
    rawText: string;
    targetMode: "new" | "existing";
    targetTable: string;
  };
  const [importJsonOpen, setImportJsonOpen] = useState(false);
  const [importJsonDragging, setImportJsonDragging] = useState(false);
  const [importJsonState, setImportJsonState] =
    useState<JsonImportState | null>(null);
  // Parquet import state.
  const [importParquetOpen, setImportParquetOpen] = useState(false);
  const [importParquetDragging, setImportParquetDragging] = useState(false);
  // When `activeDbId` doesn't match any entry in SQLITE_SAMPLE_DATABASES
  // (blank or imported), we store a synthetic descriptor here so the UI
  // (selector display, `activeSample`, `resetTabsForCurrentDb`) can still
  // refer to it by id without touching `findSampleDatabase`.
  const [customDb, setCustomDb] = useState<
    import("../runtime/sqliteSamples").SqliteSampleDatabase | null
  >(null);
  // Rename-database dialog state. Stores the user's in-progress input
  // separately from the committed name so the dialog can be cancelled
  // cleanly.
  const [renameDbOpen, setRenameDbOpen] = useState(false);
  const [renameDbBaseName, setRenameDbBaseName] = useState("");
  const [renameDbExt, setRenameDbExt] = useState(".sqlite");
  // Per-database filename overrides.  Keyed by db id; takes precedence
  // over the built-in `SqliteSampleDatabase.filename` for display.
  const [customFilenames, setCustomFilenames] = useState<Record<string, string>>({});
  const toastManager = Toast.useToastManager();
  const showToast = useCallback(
    (msg: string, kind: "info" | "warn" = "info") => {
      startTransition(() => {
        toastManager.add({ title: msg, data: { kind } });
      });
    },
    [toastManager],
  );

  const isMac = useSyncExternalStore(
    () => () => {},
    () => detectIsMac(),
    () => false,
  );

  // ─── Engine state ───────────────────────────────────────────────────
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading SQLite engine…",
  );
  const [loaded, setLoaded] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const loadingFading = loaded && showLoadingOverlay;
  useEffect(() => {
    if (!loaded) return;
    const id = window.setTimeout(() => setShowLoadingOverlay(false), 400);
    return () => window.clearTimeout(id);
  }, [loaded]);
  const [statusState, setStatusState] = useState<
    "loading" | "ready" | "running" | "error"
  >("loading");
  const engineRef = useRef<SqliteEngine | null>(null);

  // Active sample database. We render the selector + sidebar from this.
  const [activeDbId, setActiveDbId] = useState<string>(
    SQLITE_SAMPLE_DATABASES[0].id,
  );
  const [tables, setTables] = useState<string[]>([]);
  const [views, setViews] = useState<string[]>([]);
  const [indexes, setIndexes] = useState<string[]>([]);
  const [triggers, setTriggers] = useState<string[]>([]);
  // Per-entity column cache, populated lazily when the user expands a
  // sidebar row. Keyed by entity name. Refreshed any time the engine
  // performs DDL (covers Modify Structure / Truncate / Drop). Using a
  // plain object keyed by name keeps render simple and lets us merge
  // updates incrementally without invalidating unrelated entries.
  const [columnsByEntity, setColumnsByEntity] = useState<
    Record<string, TableColumnInfo[]>
  >({});
  const [foreignKeysByEntity, setForeignKeysByEntity] = useState<
    Record<string, ForeignKeyInfo[]>
  >({});
  const [constraintsByEntity, setConstraintsByEntity] = useState<
    Record<string, ColumnConstraintInfo[]>
  >({});
  // Sidebar expansion state. Persisted per-database under the same
  // `pg_sqlite_db_<id>_…` namespace as the editor tabs so it survives
  // reloads and database switches.
  const [tablesSectionExpanded, setTablesSectionExpanded] = useState(true);
  const [viewsSectionExpanded, setViewsSectionExpanded] = useState(true);
  const [indexesSectionExpanded, setIndexesSectionExpanded] = useState(false);
  const [triggersSectionExpanded, setTriggersSectionExpanded] = useState(false);
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(
    () => new Set<string>(),
  );

  // Active editor tabs for the active database.
  const [tabs, setTabs] = useState<QueryTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  // DnD sensors for tab reordering — uses the same PointerSensor from
  // @dnd-kit/core as ModifyStructureForm's column reordering, with a
  // small distance threshold so a plain click still activates the tab.
  const tabDragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  // Memoize tab id list so SortableContext doesn't receive a new array
  // on every render unrelated to tab reordering.
  const tabIds = useMemo(() => tabs.map((t) => t.id), [tabs]);

  // The most recent query result, keyed by tab id so each tab keeps
  // its own result set when the user switches between tabs.
  const [resultsByTab, setResultsByTab] = useState<
    Record<string, QueryRunResult>
  >({});
  const result = activeTabId ? (resultsByTab[activeTabId] ?? null) : null;
  // Keep a ref so handleLoadPage (a stable callback) can read the
  // latest results without needing to close over the state directly.
  const resultsByTabRef = useRef(resultsByTab);
  useEffect(() => {
    resultsByTabRef.current = resultsByTab;
  }, [resultsByTab]);

  // (PK / FK key-hint computation lives further down — after
  //  `refreshEntityMetadata` is declared — so we can reference it here.)

  const setResultForTab = useCallback(
    (tabId: string, next: QueryRunResult | null) => {
      setResultsByTab((prev) => {
        if (next === null) {
          if (!(tabId in prev)) return prev;
          const copy = { ...prev };
          delete copy[tabId];
          return copy;
        }
        return { ...prev, [tabId]: next };
      });
    },
    [],
  );

  // When tabs are closed (or replaced wholesale), drop any result
  // entries whose owning tab no longer exists. Without this the
  // `resultsByTab` record would grow without bound across long
  // sessions of opening/closing query tabs.
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setResultsByTab((prev) => {
      const ids = new Set(tabs.map((t) => t.id));
      let changed = false;
      const next: Record<string, QueryRunResult> = {};
      for (const k of Object.keys(prev)) {
        if (ids.has(k)) {
          next[k] = prev[k];
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [tabs]);

  // ─── CodeMirror ─────────────────────────────────────────────────────
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const themeCompRef = useRef<Compartment | null>(null);
  const wrapCompRef = useRef<Compartment | null>(null);
  const completionCompRef = useRef<Compartment | null>(null);
  // SQL language extension is rebuilt with a fresh schema whenever
  // tables/views change so the autocomplete popup stays in sync with
  // DDL the user runs in the editor.
  const sqlLangCompRef = useRef<Compartment | null>(null);
  // Render-time view of `engineRef`. Set once the engine boot effect
  // resolves so child components (e.g. ModifyStructureForm) can call
  // engine helpers without breaking the React refs rule.
  const [engineForRender, setEngineForRender] = useState<SqliteEngine | null>(
    null,
  );
  // Latest run handler in a ref so the editor's keymap can call it
  // without being re-bound on every render.
  const runRef = useRef<() => void>(() => undefined);
  // Handler to run a specific SQL string (used for "run selection").
  const runSelectionRef = useRef<(sql: string) => void>(() => undefined);
  // Whether the editor currently has a non-empty text selection. Used
  // to swap the Run button between "Run" (no selection) and a split
  // "Run Selection | ▾" (selection active) affordance.
  const [hasEditorSelection, setHasEditorSelection] = useState(false);
  const setHasEditorSelectionRef = useRef(setHasEditorSelection);
  // Tab change requests from the editor's onChange need access to the
  // latest active tab id. Keep a ref so we don't re-create the editor
  // every time the user switches tabs.
  const activeTabIdRef = useRef<string>("");
  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);
  const tabsRef = useRef<QueryTab[]>([]);
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);
  const activeDbIdRef = useRef<string>(activeDbId);
  useEffect(() => {
    activeDbIdRef.current = activeDbId;
  }, [activeDbId]);

  // ─── Hydrate persisted settings + db selection on mount ─────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    document.title = "SQLite Playground";
    document.body.classList.add("pg-active");

    const D = DEFAULT_PLAYGROUND_SETTINGS;
    const savedSize =
      Number(localStorage.getItem(storageKey("fontsize")) ?? D.fontSize) ||
      D.fontSize;
    const savedTheme =
      getStoredEditorTheme(storageKey("editortheme")) ?? D.editorTheme;
    const savedWordWrap =
      localStorage.getItem(storageKey("wordwrap")) !== "false";
    const savedClearBeforeRun =
      localStorage.getItem(storageKey("clearbeforerun")) === "true";
    const savedDb =
      localStorage.getItem(storageKey("db")) ?? SQLITE_SAMPLE_DATABASES[0].id;

    // ─── Hydrate pragma settings ─────────────────────────────────────
    const DP = DEFAULT_PRAGMA_SETTINGS;
    const savedPragmas: PragmaSettings = {
      foreignKeys:
        localStorage.getItem(storageKey("pragma_foreignkeys")) !== "false",
      journalMode:
        localStorage.getItem(storageKey("pragma_journalmode")) ?? DP.journalMode,
      synchronous:
        localStorage.getItem(storageKey("pragma_synchronous")) ?? DP.synchronous,
      pageSize: (() => {
        const raw = Number(localStorage.getItem(storageKey("pragma_pagesize")));
        return raw >= PRAGMA_PAGE_SIZE_MIN && raw <= PRAGMA_PAGE_SIZE_MAX
          ? raw
          : DP.pageSize;
      })(),
      automaticIndex:
        localStorage.getItem(storageKey("pragma_automaticindex")) !== "false",
      caseSensitiveLike:
        localStorage.getItem(storageKey("pragma_casesensitivelike")) === "true",
    };

    /* eslint-disable react-hooks/set-state-in-effect */
    setFontSizeState(savedSize);
    setOutputFontSizeEnabledState(false);
    setOutputFontSizeState(D.outputFontSize);
    setEditorThemeState(savedTheme);
    setWordWrapState(savedWordWrap);
    setClearBeforeRunState(savedClearBeforeRun);
    setPragmaSettingsState(savedPragmas);
    pragmaSettingsRef.current = savedPragmas;
    const initialSample = findSampleDatabase(savedDb);
    setActiveDbId(initialSample.id);
    const initialTabs = loadTabs(initialSample.id, initialSample.defaultTabs);
    setTabs(initialTabs);
    setActiveTabId(loadActiveTabId(initialSample.id, initialTabs));
    /* eslint-enable react-hooks/set-state-in-effect */

    applyMode(savedTheme);
    applyThemePalette(savedTheme);
    document.documentElement.style.setProperty(
      "--cm-font-size",
      `${savedSize}px`,
    );
    document.documentElement.style.setProperty(
      "--output-font-size",
      `${D.outputFontSize}px`,
    );

    return () => {
      document.body.classList.remove("pg-active");
      clearThemePalette();
    };
  }, [
    setClearBeforeRunState,
    setEditorThemeState,
    setFontSizeState,
    setOutputFontSizeEnabledState,
    setOutputFontSizeState,
    setPragmaSettingsState,
    setWordWrapState,
  ]);

  // ─── Boot the engine and CodeMirror ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    if (editorHostRef.current && !editorRef.current) {
      const initialTheme =
        getStoredEditorTheme(storageKey("editortheme")) ?? "lucario";
      const initialWordWrap =
        localStorage.getItem(storageKey("wordwrap")) !== "false";

      const themeComp = new Compartment();
      const wrapComp = new Compartment();
      const completionComp = new Compartment();
      const sqlLangComp = new Compartment();

      // Persist whichever tab is currently active. Tab id + tab list are
      // read from refs so this listener doesn't need to be re-bound when
      // either changes.
      const persistListener = EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        const id = activeTabIdRef.current;
        if (!id) return;
        const value = update.state.doc.toString();
        const next = tabsRef.current.map((t) =>
          t.id === id ? { ...t, code: value } : t,
        );
        tabsRef.current = next;
        setTabs(next);
        saveTabs(activeDbIdRef.current, next);
      });

      // Track whether the editor has an active text selection so the
      // Run button can switch between "Run" and "Run Selection" modes.
      const selectionListener = EditorView.updateListener.of((update) => {
        if (!update.selectionSet && !update.docChanged) return;
        const sel = update.state.selection.main;
        setHasEditorSelectionRef.current(!sel.empty);
      });

      const view = new EditorView({
        doc: "",
        parent: editorHostRef.current,
        extensions: [
          history(),
          drawSelection(),
          dropCursor(),
          EditorState.allowMultipleSelections.of(true),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          lineNumbersExt(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          rectangularSelection(),
          crosshairCursor(),
          EditorState.tabSize.of(2),
          indentUnit.of("  "),
          completionComp.of(
            sqlAutocompletion({ entities: [] }),
          ),
          tooltips({ parent: document.body }),
          keymap.of([
            {
              // Run selection if text is selected, otherwise run all.
              key: "Mod-Enter",
              run: (v) => {
                const sel = v.state.selection.main;
                if (!sel.empty) {
                  const selected = v.state.sliceDoc(sel.from, sel.to);
                  runSelectionRef.current(selected);
                } else {
                  runRef.current();
                }
                return true;
              },
            },
            {
              // Always run all queries (ignores any selection).
              key: "Mod-Shift-Enter",
              run: () => {
                runRef.current();
                return true;
              },
            },
            {
              key: "Ctrl-Space",
              run: (v) => {
                startCompletion(v);
                return true;
              },
            },
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            // Remove Enter from the default completion keymap so that Enter
            // always inserts a newline. Tab accepts the active completion
            // instead, falling through to indentWithTab when no completion
            // is shown.
            ...completionKeymap.filter((b) => b.key !== "Enter"),
            { key: "Tab", run: acceptCompletion },
            indentWithTab,
          ]),
          // Initial language config — the schema-aware variant is swapped
          // in via `sqlLangComp.reconfigure(...)` once the engine reports
          // its tables.
          sqlLangComp.of(sqlLang({ dialect: SQLite, upperCaseKeywords: false })),
          themeComp.of(themeFor(initialTheme)),
          wrapComp.of(initialWordWrap ? EditorView.lineWrapping : []),
          persistListener,
          selectionListener,
        ],
      });

      editorRef.current = view;
      themeCompRef.current = themeComp;
      wrapCompRef.current = wrapComp;
      completionCompRef.current = completionComp;
      sqlLangCompRef.current = sqlLangComp;
    }

    (async () => {
      try {
        setLoadingMessage("Loading SQLite engine…");
        const initialSampleId =
          localStorage.getItem(storageKey("db")) ??
          SQLITE_SAMPLE_DATABASES[0].id;
        const engine = await createSqliteEngine(initialSampleId);
        if (cancelled) return;
        engineRef.current = engine;
        setEngineForRender(engine);

        // Apply any user-saved pragma settings to the freshly-initialised
        // database. pragmaSettingsRef is already populated from the
        // localStorage hydration effect that runs synchronously on mount.
        applyPragmasToEngine(engine, pragmaSettingsRef.current);

        const sample = engine.activeSample();
        setActiveDbId(sample.id);
        setTables(engine.listTables());
        setViews(engine.listViews());
        setIndexes(engine.listIndexes());
        setTriggers(engine.listTriggers());

        // Initialise the editor with the active tab's contents.
        const view = editorRef.current;
        if (view) {
          const t = tabsRef.current.find(
            (x) => x.id === activeTabIdRef.current,
          );
          view.dispatch({
            changes: {
              from: 0,
              to: view.state.doc.length,
              insert: t?.code ?? "",
            },
          });
        }

        setLoaded(true);
        setStatusState("ready");
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setLoadingMessage(`Failed to load: ${msg}`);
        setStatusState("error");
      }
    })();
    return () => {
      cancelled = true;
      editorRef.current?.destroy();
      editorRef.current = null;
      themeCompRef.current = null;
      wrapCompRef.current = null;
      completionCompRef.current = null;
      sqlLangCompRef.current = null;
    };
  }, []);

  // Push editor-theme changes into CodeMirror after init.
  useEffect(() => {
    if (editorRef.current && themeCompRef.current) {
      editorRef.current.dispatch({
        effects: themeCompRef.current.reconfigure(themeFor(editorTheme)),
      });
    }
    applyThemePalette(editorTheme);
    applyMode(editorTheme);
  }, [editorTheme]);

  useEffect(() => {
    if (editorRef.current && wrapCompRef.current) {
      editorRef.current.dispatch({
        effects: wrapCompRef.current.reconfigure(
          wordWrap ? EditorView.lineWrapping : [],
        ),
      });
    }
  }, [wordWrap]);

  // Keep autocomplete schema in sync with the current database tables/views.
  // `@codemirror/lang-sql`'s `schema` option produces context-aware
  // completion for `<table>.<col>` style references; we rebuild it
  // whenever tables/views change so DDL executed in the editor
  // (CREATE TABLE, ALTER TABLE, …) is immediately reflected in
  // autocomplete suggestions.
  useEffect(() => {
    const engine = engineRef.current;
    const view = editorRef.current;
    const sqlComp = sqlLangCompRef.current;
    const completionComp = completionCompRef.current;
    if (!engine || !view || !sqlComp || !completionComp) return;
    const schema: Record<string, string[]> = {};
    const completionSchema: SqlCompletionSchema = { entities: [] };
    for (const name of tables) {
      try {
        schema[name] = engine.listColumns(name).map((c) => c.name);
      } catch {
        // A table might have been dropped right before this effect runs
        // (e.g. a view that depended on the dropped table remains in the
        // views list but PRAGMA table_info on it now throws). Fall back
        // to an empty column list so autocomplete degrades gracefully
        // rather than crashing the page.
        schema[name] = [];
      }
      completionSchema.entities.push({
        name,
        columns: schema[name],
        kind: "table",
      });
    }
    for (const name of views) {
      try {
        schema[name] = engine.listColumns(name).map((c) => c.name);
      } catch {
        // Same rationale as above — a view referencing a dropped table
        // causes PRAGMA table_info to throw; treat it as empty columns.
        schema[name] = [];
      }
      completionSchema.entities.push({
        name,
        columns: schema[name],
        kind: "view",
      });
    }
    view.dispatch({
      effects: [
        sqlComp.reconfigure(
          sqlLang({ dialect: SQLite, schema, upperCaseKeywords: false }),
        ),
        completionComp.reconfigure(
          sqlAutocompletion(completionSchema),
        ),
      ],
    });
  }, [tables, views]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--cm-font-size",
      `${fontSize}px`,
    );
    editorRef.current?.requestMeasure();
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--output-font-size",
      `${DEFAULT_PLAYGROUND_SETTINGS.outputFontSize}px`,
    );
  }, []);

  // Swap the editor's contents whenever the active tab id changes.
  useEffect(() => {
    if (!loaded) return;
    const view = editorRef.current;
    if (!view || !activeTab) return;
    if (view.state.doc.toString() !== activeTab.code) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: activeTab.code,
        },
      });
    }
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          dbScopedKey(activeDbId, "active_tab"),
          activeTabId,
        );
      } catch {
        // Ignore quota errors.
      }
    }
    // Focus the editor so the user can type immediately after any tab
    // operation (activate, create, reorder, close, close-all).
    // Skip "er-diagram" / "view-data" tabs whose editor pane is hidden.
    const tab = tabsRef.current.find((t) => t.id === activeTabId);
    if (tab?.kind !== "er-diagram" && tab?.kind !== "view-data") {
      view?.focus();
    }
    // Only rerun when the active tab id changes, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, loaded]);

  // ─── Settings setters (persist to localStorage) ─────────────────────
  const setFontSize = useCallback((n: number) => {
    setFontSizeState(n);
    localStorage.setItem(storageKey("fontsize"), String(n));
  }, [setFontSizeState]);
  const setOutputFontSizeEnabled = useCallback((b: boolean) => {
    setOutputFontSizeEnabledState(b);
    localStorage.setItem(storageKey("outputfontsize_enabled"), String(b));
  }, [setOutputFontSizeEnabledState]);
  const setOutputFontSize = useCallback((n: number) => {
    setOutputFontSizeState(n);
    localStorage.setItem(storageKey("outputfontsize"), String(n));
  }, [setOutputFontSizeState]);
  const setEditorTheme = useCallback((t: string) => {
    setEditorThemeState(t);
    setStoredEditorTheme(t);
  }, [setEditorThemeState]);
  const setWordWrap = useCallback((b: boolean) => {
    setWordWrapState(b);
    localStorage.setItem(storageKey("wordwrap"), String(b));
  }, [setWordWrapState]);
  const setClearBeforeRun = useCallback((b: boolean) => {
    setClearBeforeRunState(b);
    localStorage.setItem(storageKey("clearbeforerun"), String(b));
  }, [setClearBeforeRunState]);

  const savePragmaSettings = useCallback(
    (p: PragmaSettings) => {
      setPragmaSettingsState(p);
      pragmaSettingsRef.current = p;
      try {
        localStorage.setItem(
          storageKey("pragma_foreignkeys"),
          String(p.foreignKeys),
        );
        localStorage.setItem(storageKey("pragma_journalmode"), p.journalMode);
        localStorage.setItem(storageKey("pragma_synchronous"), p.synchronous);
        localStorage.setItem(
          storageKey("pragma_pagesize"),
          String(p.pageSize),
        );
        localStorage.setItem(
          storageKey("pragma_automaticindex"),
          String(p.automaticIndex),
        );
        localStorage.setItem(
          storageKey("pragma_casesensitivelike"),
          String(p.caseSensitiveLike),
        );
      } catch {
        // ignore quota errors
      }
      if (engineRef.current) {
        applyPragmasToEngine(engineRef.current, p);
      }
      showToast("Pragma settings saved.");
    },
    [setPragmaSettingsState, showToast],
  );

  const restoreDefaultSettings = useCallback(() => {
    const D = DEFAULT_PLAYGROUND_SETTINGS;
    setFontSize(D.fontSize);
    setOutputFontSize(D.outputFontSize);
    setOutputFontSizeEnabled(D.outputFontSizeEnabled);
    setEditorTheme(D.editorTheme);
    setWordWrap(D.wordWrap);
    setClearBeforeRun(D.clearBeforeRun);
    showToast("Default settings restored.");
  }, [
    setFontSize,
    setOutputFontSize,
    setOutputFontSizeEnabled,
    setEditorTheme,
    setWordWrap,
    setClearBeforeRun,
    showToast,
  ]);

  const clearAllLocalStorage = useCallback(() => {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  }, []);

  // ─── Database switching ─────────────────────────────────────────────
  // Shared helper that performs the actual switch. Handles both sample
  // databases (via `engine.loadSampleDatabase`) and the two custom paths
  // (blank + imported, via the overloaded form below).
  const applyDbLoad = useCallback(
    (sample: import("../runtime/sqliteSamples").SqliteSampleDatabase) => {
      const engine = engineRef.current;
      if (!engine) return;
      saveTabs(activeDbIdRef.current, tabsRef.current);

      // Track custom (blank / imported) databases in state so the UI
      // can look them up without touching SQLITE_SAMPLE_DATABASES.
      const isCustom = !SQLITE_SAMPLE_DATABASES.some((s) => s.id === sample.id);
      setCustomDb(isCustom ? sample : null);
      setActiveDbId(sample.id);
      try {
        // Only persist built-in sample IDs to localStorage — blank and
        // imported databases do not survive a reload anyway.
        if (!isCustom) {
          localStorage.setItem(storageKey("db"), sample.id);
        }
      } catch {
        // ignore
      }
      // Re-apply pragma settings after the new database is loaded because
      // `loadSampleDatabase` / `loadBlankDatabase` rebuild the db from
      // scratch (clearing any previously applied pragmas).
      applyPragmasToEngine(engine, pragmaSettingsRef.current);
      setTables(engine.listTables());
      setViews(engine.listViews());
      setIndexes(engine.listIndexes());
      setTriggers(engine.listTriggers());
      // Reset cached column/foreign-key metadata — data from the old
      // database would be stale for the newly loaded one. The sidebar
      // will re-fetch these lazily on first expand.
      setColumnsByEntity({});
      setForeignKeysByEntity({});

      const newTabs = sample.defaultTabs.map((seed) => ({
        ...seed,
        id: newTabId(),
        pristineCode: seed.code,
      }));
      // Update the mutable refs synchronously BEFORE calling setState so
      // that the CodeMirror `change` listener (which reads them via
      // closures) always sees the new tabs when it fires during
      // `editor.setValue()` below. Updating state first would let a
      // stale closure write back incorrect tab data.
      tabsRef.current = newTabs;
      activeTabIdRef.current = newTabs[0].id;
      setTabs(newTabs);
      saveTabs(sample.id, newTabs);
      setActiveTabId(newTabs[0].id);
      const view = editorRef.current;
      if (view) replaceDoc(view, newTabs[0].code);
      setResultsByTab({});
    },
    [],
  );

  const performDbSwitch = useCallback(
    (nextId: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      const sample = engine.loadSampleDatabase(nextId);
      applyDbLoad(sample);
      showToast(`Loaded ${sample.filename}.`);
    },
    [applyDbLoad, showToast],
  );

  const performBlankLoad = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const sample = engine.loadBlankDatabase();
    // Clear any filename override that was set for the blank db id by a
    // previous "Rename Database" action.  Without this, a subsequent blank
    // database would inherit the old custom name (e.g. "test.sqlite")
    // instead of resetting to "blank.sqlite".
    setCustomFilenames((prev) => {
      if (!(sample.id in prev)) return prev;
      const next = { ...prev };
      delete next[sample.id];
      return next;
    });
    applyDbLoad(sample);
    showToast("Created blank database.");
  }, [applyDbLoad, showToast]);

  const performImportSqlite = useCallback(
    (bytes: Uint8Array, filename: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      try {
        const sample = engine.loadFromBytes(bytes, filename);
        applyDbLoad(sample);
        setImportSqliteOpen(false);
        showToast(`Imported ${filename}.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Import failed: ${msg}`, "warn");
      }
    },
    [applyDbLoad, showToast],
  );

  const requestDbSwitch = useCallback(
    (nextId: string) => {
      if (nextId === activeDbId) return;
      const curSample =
        customDb?.id === activeDbId ? customDb : findSampleDatabase(activeDbId);
      // Only prompt when the *current* db has unsaved edits relative to
      // its defaults. Switching to and from clean defaults should be
      // friction-free.
      if (tabsAreDirty(tabsRef.current, curSample.defaultTabs)) {
        setPendingDbId(nextId);
        return;
      }
      performDbSwitch(nextId);
    },
    [activeDbId, customDb, performDbSwitch],
  );

  // ─── Run / preview ──────────────────────────────────────────────────
  // Runs a SQL string and stores the result against `tabId`. Returns
  // void; the result is read from `resultsByTab[tabId]`. We capture the
  // tab id explicitly so concurrent runs (e.g. the user clicks several
  // sidebar tables in quick succession) can't clobber one another's
  // results.
  //
  // When `page` is provided and the SQL is an eligible single SELECT
  // without a LIMIT clause, the query is executed with LIMIT/OFFSET so
  // only the requested page's rows are loaded into memory. The total
  // row count is obtained via a separate COUNT(*) wrapper query and
  // stored on the result for the pagination footer.
  const runSqlForTab = useCallback(
    (
      tabId: string,
      sql: string,
      source: string,
      sourceTable?: string,
      page = 0,
      baseSql?: string,
    ) => {
      const engine = engineRef.current;
      if (!engine) return;
      const trimmed = sql.trim();
      if (!trimmed) {
        showToast("Nothing to run — the query is empty.", "warn");
        return;
      }
      setStatusState("running");
      if (clearBeforeRun) setResultForTab(tabId, null);
      const t0 = performance.now();
      const currentPageSize = globalPageSizeRef.current;
      // Apply lazy pagination only for single SELECT/CTE statements that
      // don't already contain a LIMIT clause, and only when "All" is not
      // selected (pageSize === 0 means load everything).
      // Strip comments once and reuse for both checks.
      const noComments = stripSqlComments(trimmed);
      const useLazy =
        currentPageSize > 0 &&
        isSingleSelectSql(trimmed, noComments) &&
        !hasLimitClause(noComments);
      try {
        let sets: QueryExecResult[];
        let lazySql: string | undefined;
        let lazyBaseSql: string | undefined;
        let lazyTotalCount: number | undefined;
        let lazyPage: number | undefined;
        let lazyPageSize: number | undefined;
        if (useLazy) {
          const { result: lazySets, totalCount } = engine.execPaged(
            trimmed,
            currentPageSize,
            page * currentPageSize,
          );
          sets = lazySets;
          lazySql = trimmed.replace(/\s*;+\s*$/, "");
          lazyBaseSql = (baseSql ?? trimmed).replace(/\s*;+\s*$/, "");
          lazyTotalCount = totalCount;
          lazyPage = page;
          lazyPageSize = currentPageSize;
        } else {
          sets = engine.exec(trimmed);
        }
        const elapsedMs = performance.now() - t0;
        setResultForTab(tabId, {
          sets,
          elapsedMs,
          source,
          sourceTable,
          lazySql,
          lazyBaseSql,
          lazyTotalCount,
          lazyPage,
          lazyPageSize,
        });
        setStatusState("ready");
        // Refresh sidebar in case the query was DDL (CREATE/DROP).
        const newTables = engine.listTables();
        const newViews = engine.listViews();
        setTables(newTables);
        setViews(newViews);
        setIndexes(engine.listIndexes());
        setTriggers(engine.listTriggers());
        // Drop cached column metadata wholesale — the safest assumption
        // after arbitrary user SQL is that anything could have changed.
        setColumnsByEntity({});
        setForeignKeysByEntity({});
        // Remove any expanded sidebar entities or result tabs that
        // reference tables / views that no longer exist (e.g. after a
        // manual DROP TABLE query). This prevents the metadata-reload
        // effect from calling listColumns() on dropped entities.
        const newEntitySet = new Set([...newTables, ...newViews]);
        setExpandedEntities((prev) => {
          const dropped = [...prev].filter((n) => !newEntitySet.has(n));
          if (dropped.length === 0) return prev;
          const next = new Set(prev);
          for (const d of dropped) next.delete(d);
          return next;
        });
        setResultsByTab((prev) => {
          const entries = Object.entries(prev);
          const hasDropped = entries.some(
            ([, r]) => r?.sourceTable && !newEntitySet.has(r.sourceTable),
          );
          if (!hasDropped) return prev;
          const next = { ...prev };
          for (const [tId, r] of entries) {
            if (r?.sourceTable && !newEntitySet.has(r.sourceTable)) {
              delete next[tId];
            }
          }
          return next;
        });
      } catch (err) {
        const elapsedMs = performance.now() - t0;
        const msg = err instanceof Error ? err.message : String(err);
        setResultForTab(tabId, {
          sets: [],
          elapsedMs,
          error: msg,
          source,
          sourceTable,
        });
        setStatusState("error");
        window.setTimeout(() => setStatusState("ready"), 3000);
      }
    },
    [clearBeforeRun, showToast, setResultForTab],
  );

  // Re-run a lazy-paginated result for a different page or page size.
  // Reads the current result's source / sourceTable from the ref so
  // the callback itself stays stable across renders.
  const handleLoadPage = useCallback(
    (sql: string, page: number) => {
      const tabId = activeTabIdRef.current;
      const curResult = resultsByTabRef.current[tabId];
      runSqlForTab(
        tabId,
        sql,
        curResult?.source ?? sql,
        curResult?.sourceTable,
        page,
        curResult?.lazyBaseSql ?? curResult?.lazySql,
      );
    },
    [runSqlForTab],
  );

  const handleFetchAllRows = useCallback(
    (sql: string): QueryExecResult["values"] => {
      const engine = engineRef.current;
      if (!engine) return [];
      try {
        const results = engine.exec(sql);
        return results[0]?.values ?? [];
      } catch {
        return [];
      }
    },
    [],
  );

  const runActiveTab = useCallback(() => {
    const id = activeTabIdRef.current;
    const tab = tabsRef.current.find((t) => t.id === id);
    if (!tab) return;
    const code = editorRef.current?.state.doc.toString() ?? tab.code;
    runSqlForTab(tab.id, code, tab.title);
  }, [runSqlForTab]);

  // Run a specific SQL string (used for "run selection").
  const runSelection = useCallback(
    (sql: string) => {
      const id = activeTabIdRef.current;
      const tab = tabsRef.current.find((t) => t.id === id);
      if (!tab) return;
      runSqlForTab(tab.id, sql, tab.title);
    },
    [runSqlForTab],
  );

  // Read the current editor selection and run it. Called by the "Run
  // Selection" split-button and its dropdown menu item.
  const runCurrentSelection = useCallback(() => {
    const view = editorRef.current;
    if (!view) return;
    const sel = view.state.selection.main;
    if (sel.empty) return;
    const selected = view.state.sliceDoc(sel.from, sel.to);
    runSelection(selected);
  }, [runSelection]);

  useEffect(() => {
    runRef.current = () => {
      runActiveTab();
    };
    runSelectionRef.current = (sql: string) => {
      runSelection(sql);
    };
  }, [runActiveTab, runSelection]);

  // Creates a new tab named `title` with `sql` as its contents, makes it
  // active, and runs the SQL against the engine so the results land in
  // the new tab. Used by every sidebar action (left-click preview,
  // context-menu Preview/Structure/Count) so each invocation produces a
  // distinct tab whose state is preserved when the user switches tabs.
  const openTabAndRun = useCallback(
    (title: string, sql: string, source?: string, sourceTable?: string) => {
      const tab: QueryTab = {
        id: newTabId(),
        title,
        code: sql,
        pristineCode: sql,
      };
      const next = [...tabsRef.current, tab];
      tabsRef.current = next;
      activeTabIdRef.current = tab.id;
      setTabs(next);
      saveTabs(activeDbIdRef.current, next);
      setActiveTabId(tab.id);
      const view = editorRef.current;
      if (view) replaceDoc(view, sql);
      runSqlForTab(tab.id, sql, source ?? title, sourceTable);
    },
    [runSqlForTab],
  );

  const quoteIdent = useCallback(
    (name: string) => `"${name.replace(/"/g, '""')}"`,
    [],
  );

  const previewTable = useCallback(
    (name: string, kind: "table" | "view") => {
      // Double-clicking a sidebar entry opens it in a new tab whose
      // title is the entity's name. Lazy LIMIT/OFFSET pagination in
      // runSqlForTab will automatically limit the initial fetch to the
      // current page size, so we don't hard-code a row cap here.
      const sql = `SELECT * FROM ${quoteIdent(name)};`;
      if (kind === "table") {
        // For tables, open a "view-data" tab that hides the editor pane.
        const tab: QueryTab = {
          id: newTabId(),
          title: name,
          code: sql,
          pristineCode: sql,
          kind: "view-data",
        };
        const next = [...tabsRef.current, tab];
        tabsRef.current = next;
        activeTabIdRef.current = tab.id;
        setTabs(next);
        saveTabs(activeDbIdRef.current, next);
        setActiveTabId(tab.id);
        const view = editorRef.current;
        if (view) replaceDoc(view, sql);
        runSqlForTab(tab.id, sql, `Table: ${name}`, name);
      } else {
        openTabAndRun(
          name,
          sql,
          `View: ${name}`,
          undefined,
        );
      }
    },
    [openTabAndRun, quoteIdent, runSqlForTab],
  );

  // ─── Sidebar context-menu actions ───────────────────────────────────
  // Each handler creates a new tab and runs the matching SQL into it
  // so the action's results stay attached to that tab — switching back
  // to it later restores both the SQL and the rendered result.
  const describeEntity = useCallback(
    (name: string, kind: "table" | "view") => {
      const label = kind === "view" ? "View structure" : "Structure";
      openTabAndRun(
        `Structure: ${name}`,
        `PRAGMA table_info(${quoteIdent(name)});`,
        `${label}: ${name}`,
      );
    },
    [openTabAndRun, quoteIdent],
  );

  const countEntityRows = useCallback(
    (name: string, kind: "table" | "view") => {
      const label = kind === "view" ? "View row count" : "Row count";
      openTabAndRun(
        `Count: ${name}`,
        `SELECT COUNT(*) AS row_count FROM ${quoteIdent(name)};`,
        `${label}: ${name}`,
      );
    },
    [openTabAndRun, quoteIdent],
  );

  const copyEntityName = useCallback(
    (name: string) => {
      // Best-effort: clipboard API requires a secure context, so fall
      // through silently in environments where it is unavailable.
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard
          .writeText(name)
          .then(() => showToast(`Copied "${name}".`))
          .catch(() => showToast("Couldn't copy to clipboard.", "warn"));
      } else {
        showToast("Clipboard not available in this browser.", "warn");
      }
    },
    [showToast],
  );

  const dropEntity = useCallback(
    (name: string, kind: "table" | "view") => {
      setPendingDropEntity({ name, kind });
    },
    [],
  );

  // Drop / view-DDL helpers for leaf sidebar entries (indexes,
  // triggers). Kept separate from `dropEntity` / `viewDDL` so the
  // existing table/view code paths stay strongly typed against
  // "table" | "view".
  const dropLeafEntity = useCallback(
    (name: string, kind: "index" | "trigger") => {
      setPendingDropEntity({ name, kind });
    },
    [],
  );

  const confirmDrop = useCallback(() => {
    const pending = pendingDropEntity;
    if (!pending) return;
    const engine = engineRef.current;
    if (!engine) return;
    const { name, kind } = pending;
    try {
      engine.dropEntity(name, kind);
      setTables(engine.listTables());
      setViews(engine.listViews());
      setIndexes(engine.listIndexes());
      setTriggers(engine.listTriggers());
      // For tables and views, clear any stale result tabs and sidebar
      // metadata that reference the dropped entity — this prevents the
      // autocomplete / metadata-reload effects from trying to call
      // listColumns() on a table that no longer exists.
      if (kind === "table" || kind === "view") {
        setResultsByTab((prev) => {
          const next = { ...prev };
          for (const tabId of Object.keys(next)) {
            if (next[tabId]?.sourceTable === name) {
              delete next[tabId];
            }
          }
          return next;
        });
        setExpandedEntities((prev) => {
          if (!prev.has(name)) return prev;
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
        setColumnsByEntity((prev) => {
          if (!(name in prev)) return prev;
          const { [name]: _, ...rest } = prev;
          return rest;
        });
        setForeignKeysByEntity((prev) => {
          if (!(name in prev)) return prev;
          const { [name]: _, ...rest } = prev;
          return rest;
        });
        setConstraintsByEntity((prev) => {
          if (!(name in prev)) return prev;
          const { [name]: _, ...rest } = prev;
          return rest;
        });
      }
      const label = DROP_KIND_LABELS[kind].toLowerCase();
      showToast(`Dropped ${label} "${name}".`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Drop failed: ${msg}`, "warn");
    }
    setPendingDropEntity(null);
  }, [pendingDropEntity, showToast]);

  const viewLeafDDL = useCallback(
    (name: string, kind: "index" | "trigger") => {
      const engine = engineRef.current;
      if (!engine) return;
      try {
        const sql = engine.getDDL(name);
        if (!sql.trim()) {
          showToast(`No DDL recorded for ${kind} "${name}".`, "warn");
          return;
        }
        setDdlDialog({ title: name, sql });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Couldn't read DDL: ${msg}`, "warn");
      }
    },
    [showToast],
  );

  // Hydrate sidebar collapse state for the active database. Saved
  // under the same `pg_sqlite_db_<id>_…` namespace as the editor tabs
  // so it survives reloads and (independently) database switches.
  useEffect(() => {
    if (typeof window === "undefined") return;
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const rawSections = localStorage.getItem(
        dbScopedKey(activeDbId, "sections_expanded"),
      );
      if (rawSections) {
        const parsed = JSON.parse(rawSections) as {
          tables?: boolean;
          views?: boolean;
        };
        setTablesSectionExpanded(parsed.tables !== false);
        setViewsSectionExpanded(parsed.views !== false);
      } else {
        setTablesSectionExpanded(true);
        setViewsSectionExpanded(true);
      }
      const rawExpanded = localStorage.getItem(
        dbScopedKey(activeDbId, "expanded_entities"),
      );
      if (rawExpanded) {
        const parsed = JSON.parse(rawExpanded) as string[];
        if (Array.isArray(parsed)) {
          setExpandedEntities(
            new Set(parsed.filter((s) => typeof s === "string")),
          );
        } else {
          setExpandedEntities(new Set());
        }
      } else {
        setExpandedEntities(new Set());
      }
    } catch {
      setExpandedEntities(new Set());
    }
    // Cached metadata is per-database, so wipe it when the DB changes.
    setColumnsByEntity({});
    setForeignKeysByEntity({});
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeDbId]);

  // Persist section collapse state whenever it changes.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        dbScopedKey(activeDbId, "sections_expanded"),
        JSON.stringify({
          tables: tablesSectionExpanded,
          views: viewsSectionExpanded,
        }),
      );
    } catch {
      // ignore quota errors
    }
  }, [activeDbId, tablesSectionExpanded, viewsSectionExpanded]);

  const truncateEntity = useCallback((name: string) => {
    setTruncateConfirm(name);
  }, []);

  const confirmTruncate = useCallback(() => {
    const engine = engineRef.current;
    const name = truncateConfirm;
    if (!engine || !name) return;
    try {
      engine.truncateTable(name);
      showToast(`Truncated table "${name}".`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Truncate failed: ${msg}`, "warn");
    } finally {
      setTruncateConfirm(null);
    }
  }, [truncateConfirm, showToast]);

  // ─── Export ────────────────────────────────────────────────────────
  // Serialise the in-memory database to a SQLite file image and trigger
  // a browser download. The filename mirrors the active sample's
  // canonical filename (e.g. `chinook.sqlite`) so users round-trip the
  // file naturally.
  const exportDatabase = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    try {
      const bytes = engine.exportDatabase();
      const filename =
        activeSample.filename && /\.sqlite$/i.test(activeSample.filename)
          ? activeSample.filename
          : `${activeSample.id || "database"}.sqlite`;
      // `Uint8Array.slice()` returns a new typed array backed by a
      // *fresh* ArrayBuffer, so the Blob owns its own copy of the
      // bytes. sql.js may reuse its internal buffer on the next
      // `exec()`, which would otherwise corrupt the in-flight blob.
      const blob = new Blob([bytes.slice()], {
        type: "application/vnd.sqlite3",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Defer revocation so the click navigation always observes a
      // valid URL — Safari in particular is racy here.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(`Exported ${filename}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Export failed: ${msg}`, "warn");
    }
  }, [activeSample, showToast]);

  // ─── Export entire database to Excel ─────────────────────────────
  // Creates a multi-sheet .xlsx workbook with one sheet per table.
  const exportDatabaseToXlsx = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const baseName = activeSample.id || "database";
    const filename = `${baseName}.xlsx`;
    // Collect table list at call time (synchronously), then kick off async work.
    const tableList = [...tables];
    (async () => {
      try {
        const mod = await initXlsxWasm();
        const workbook = new mod.Workbook();
        let sheetCount = 0;
        for (const tableName of tableList) {
          const sets = engine.exec(`SELECT * FROM ${quoteIdent(tableName)}`);
          if (!sets || sets.length === 0) continue;
          const { columns, values: rows } = sets[0];
          // Excel sheet names are limited to 31 characters.
          const sheetName = tableName.length > 31 ? tableName.slice(0, 31) : tableName;
          const worksheet = workbook.addWorksheet();
          worksheet.setName(sheetName);
          worksheet.writeRow(0, 0, columns);
          for (let ri = 0; ri < rows.length; ri++) {
            worksheet.writeRow(ri + 1, 0, rows[ri].map(toExcelData));
          }
          sheetCount++;
        }
        if (sheetCount === 0) {
          showToast("No tables to export.", "warn");
          return;
        }
        const bytes = workbook.saveToBufferSync();
        triggerDownload(
          new Blob([bytes], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
          filename,
        );
        showToast(`Exported ${filename}.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Export failed: ${msg}`, "warn");
      }
    })();
  }, [tables, quoteIdent, showToast, activeSample]);

  // ─── Result set export ────────────────────────────────────────────────────
  // Exports the first result set's rows in the chosen format and scope.
  // Called from the export button in the result pager (inside ResultView).
  // `scope` is passed in from the pager's local state.
  const handleResultSetExport = useCallback(
    (format: "csv" | "json" | "sql" | "parquet" | "xlsx", scope: ResultSetExportScope) => {
      if (!result || result.sets.length === 0) return;
      const set =
        result.sets[resultSetExportSnapshot?.setIndex ?? 0] ?? result.sets[0];
      const columns = resultSetExportSnapshot?.columns ?? set.columns;
      let rows: QueryExecResult["values"];
      if (scope === "page" && resultSetExportSnapshot) {
        rows = resultSetExportSnapshot.rows;
      } else if (
        result.lazySql !== undefined &&
        (resultSetExportSnapshot?.setIndex ?? 0) === 0
      ) {
        rows = handleFetchAllRows(result.lazySql);
      } else if (resultSetExportSnapshot) {
        rows = resultSetExportSnapshot.allRows;
      } else {
        rows = set.values;
      }
      const title = activeTab?.title ?? "result_set";
      const rowCount = rows.length;
      const rowLabel = `${rowCount} row${rowCount === 1 ? "" : "s"}`;
      const scopeLabel = scope === "page" ? "current page" : "all rows";
      const filename = `${toFileSafeName(title)} (${scopeLabel}, ${rowLabel}).${format}`;
      if (format === "csv") {
        exportResultToCsv(columns, rows, filename);
      } else if (format === "json") {
        exportResultToJson(columns, rows, filename);
      } else if (format === "parquet") {
        exportResultToParquet(columns, rows, filename).catch((err) =>
          showToast(`Export failed: ${err instanceof Error ? err.message : String(err)}`, "warn"),
        );
      } else if (format === "xlsx") {
        exportResultToXlsx(columns, rows, filename).catch((err) =>
          showToast(`Export failed: ${err instanceof Error ? err.message : String(err)}`, "warn"),
        );
      } else {
        exportResultToSql(columns, rows, filename);
      }
    },
    [
      result,
      activeTab,
      handleFetchAllRows,
      resultSetExportSnapshot,
      showToast,
    ],
  );

  // ─── CSV import ───────────────────────────────────────────────────
  // Handles double-quoted fields and escaped double-quotes (`""`).
  const parseCsv = useCallback(
    (text: string): { headers: string[]; rows: string[][] } => {
      const parseLine = (line: string): string[] => {
        const fields: string[] = [];
        let cur = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (inQuotes) {
            if (ch === '"') {
              if (i + 1 < line.length && line[i + 1] === '"') {
                // Two consecutive double-quotes inside a quoted field
                // represent a literal `"`. Skip the second quote by
                // manually advancing `i` — the loop's own `i++` then
                // moves past the escaped pair correctly.
                cur += '"';
                i += 1; // intentionally skip second quote of escaped pair
              } else {
                inQuotes = false;
              }
            } else {
              cur += ch;
            }
          } else if (ch === '"') {
            inQuotes = true;
          } else if (ch === ",") {
            fields.push(cur);
            cur = "";
          } else {
            cur += ch;
          }
        }
        fields.push(cur);
        return fields;
      };

      const lines = text.split(/\r?\n/);
      const nonEmpty = lines.filter((l) => l.trim() !== "");
      if (nonEmpty.length === 0) return { headers: [], rows: [] };
      const headers = parseLine(nonEmpty[0]);
      const rows = nonEmpty.slice(1).map((l) => {
        const vals = parseLine(l);
        // Pad or truncate each row to match the header count.
        while (vals.length < headers.length) vals.push("");
        return vals.slice(0, headers.length);
      });
      return { headers, rows };
    },
    [],
  );

  // Derive a safe SQL identifier from a filename (strip extension, replace
  // non-identifier chars). Falls back to `imported_table` when empty.
  const tableNameFromFilename = useCallback((filename: string): string => {
    const base = filename
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/_+/g, "_");
    return base || "imported_table";
  }, []);

  const handleCsvFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const { headers, rows } = parseCsv(text);
          if (headers.length === 0) {
            showToast("CSV file appears to be empty.", "warn");
            return;
          }
          setImportCsvState({
            tableName: tableNameFromFilename(file.name),
            headers,
            rows,
            rawText: text,
            targetMode: "new",
            targetTable: tables[0] ?? "",
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          showToast(`Could not parse CSV: ${msg}`, "warn");
        }
      };
      reader.readAsText(file);
    },
    [parseCsv, tableNameFromFilename, showToast, tables],
  );

  const submitCsvImport = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !importCsvState) return;
    const { headers, rows, targetMode, targetTable, tableName } = importCsvState;
    // Use the snapshot targetTable if set; fall back to the first live table
    // in case the table list changed while the dialog was open.
    const resolvedTarget = targetTable || tables[0] || "";
    const isExisting = targetMode === "existing" && resolvedTarget;
    const effectiveTable = isExisting ? resolvedTarget : tableName.trim();
    if (!effectiveTable) {
      showToast("Table name cannot be empty.", "warn");
      return;
    }
    try {
      // Sanitize header names to safe SQL identifiers — each is
      // double-quote–escaped and used only as a column-name token,
      // not as a general string value, so the quoting is safe.
      const safeCols = headers.map((h) => {
        const s = h.trim().replace(/[^a-zA-Z0-9_]/g, "_") || "col";
        return `"${s.replace(/"/g, '""')}"`;
      });
      const tableIdent = `"${effectiveTable.replace(/"/g, '""')}"`;
      if (!isExisting) {
        engine.exec(
          `CREATE TABLE ${tableIdent} (${safeCols.map((c) => `${c} TEXT`).join(", ")})`,
        );
      }
      // Wrap all inserts in a single transaction so the import is
      // atomic: either all rows land or none do (on error, ROLLBACK
      // restores the empty table).
      engine.exec("BEGIN");
      try {
        for (const row of rows) {
          // Values are stored as TEXT. Empty CSV fields become SQL NULL;
          // non-empty fields are single-quote–escaped string literals
          // (`''` is the standard SQL escape for a literal single quote).
          const vals = row
            .map((v) => (v === "" ? "NULL" : `'${v.replace(/'/g, "''")}'`))
            .join(", ");
          if (isExisting) {
            engine.exec(
              `INSERT INTO ${tableIdent} (${safeCols.join(", ")}) VALUES (${vals})`,
            );
          } else {
            engine.exec(`INSERT INTO ${tableIdent} VALUES (${vals})`);
          }
        }
        engine.exec("COMMIT");
      } catch (insertErr) {
        try {
          engine.exec("ROLLBACK");
        } catch {
          // Ignore rollback failure.
        }
        throw insertErr;
      }
      setTables(engine.listTables());
      setImportCsvOpen(false);
      setImportCsvState(null);
      showToast(
        `Imported ${rows.length} row${rows.length === 1 ? "" : "s"} into "${effectiveTable}".`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`CSV import failed: ${msg}`, "warn");
    }
  }, [importCsvState, tables, showToast]);

  // ─── JSON import ──────────────────────────────────────────────────
  const handleJsonFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsed = JSON.parse(text) as unknown;
          if (!Array.isArray(parsed)) {
            showToast(
              "JSON must be an array of objects (e.g. [{...}, {...}]).",
              "warn",
            );
            return;
          }
          if (parsed.length === 0) {
            showToast("JSON array is empty.", "warn");
            return;
          }
          // Collect all keys from all objects for robustness.
          const keySet = new Set<string>();
          for (const obj of parsed) {
            if (obj && typeof obj === "object" && !Array.isArray(obj)) {
              for (const k of Object.keys(obj as Record<string, unknown>)) {
                keySet.add(k);
              }
            }
          }
          const headers = Array.from(keySet);
          if (headers.length === 0) {
            showToast("JSON objects appear to have no keys.", "warn");
            return;
          }
          const rows = parsed.map((obj) => {
            const record = obj as Record<string, unknown>;
            return headers.map((h) => {
              const v = record[h];
              if (v === null || v === undefined) return "";
              if (typeof v === "object") return JSON.stringify(v);
              return String(v);
            });
          });
          setImportJsonState({
            tableName: tableNameFromFilename(file.name),
            headers,
            rows,
            rawText: text,
            targetMode: "new",
            targetTable: tables[0] ?? "",
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          showToast(`Could not parse JSON: ${msg}`, "warn");
        }
      };
      reader.readAsText(file);
    },
    [tableNameFromFilename, showToast, tables],
  );

  const submitJsonImport = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !importJsonState) return;
    const { headers, rows, targetMode, targetTable, tableName } = importJsonState;
    const resolvedTarget = targetTable || tables[0] || "";
    const isExisting = targetMode === "existing" && resolvedTarget;
    const effectiveTable = isExisting ? resolvedTarget : tableName.trim();
    if (!effectiveTable) {
      showToast("Table name cannot be empty.", "warn");
      return;
    }
    try {
      const safeCols = headers.map((h) => {
        const s = h.trim().replace(/[^a-zA-Z0-9_]/g, "_") || "col";
        return `"${s.replace(/"/g, '""')}"`;
      });
      const tableIdent = `"${effectiveTable.replace(/"/g, '""')}"`;
      if (!isExisting) {
        engine.exec(
          `CREATE TABLE ${tableIdent} (${safeCols.map((c) => `${c} TEXT`).join(", ")})`,
        );
      }
      // Wrap all inserts in a single transaction for atomicity and
      // performance — a ROLLBACK on error leaves no partial table data.
      engine.exec("BEGIN");
      try {
        for (const row of rows) {
          const vals = row
            .map((v) => (v === "" ? "NULL" : `'${v.replace(/'/g, "''")}'`))
            .join(", ");
          if (isExisting) {
            engine.exec(
              `INSERT INTO ${tableIdent} (${safeCols.join(", ")}) VALUES (${vals})`,
            );
          } else {
            engine.exec(`INSERT INTO ${tableIdent} VALUES (${vals})`);
          }
        }
        engine.exec("COMMIT");
      } catch (insertErr) {
        try {
          engine.exec("ROLLBACK");
        } catch {
          // Ignore rollback failure.
        }
        throw insertErr;
      }
      setTables(engine.listTables());
      setImportJsonOpen(false);
      setImportJsonState(null);
      showToast(
        `Imported ${rows.length} row${rows.length === 1 ? "" : "s"} into "${effectiveTable}".`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`JSON import failed: ${msg}`, "warn");
    }
  }, [importJsonState, tables, showToast]);

  // ─── Parquet import ───────────────────────────────────────────────
  const handleParquetFile = useCallback(
    async (file: File) => {
      const engine = engineRef.current;
      if (!engine) return;
      try {
        showToast("Reading parquet file…");
        const { columns, rows } = await importParquetFile(file);
        if (columns.length === 0) {
          showToast("Parquet file appears to have no columns.", "warn");
          return;
        }
        const tableName = tableNameFromFilename(file.name);
        const safeCols = columns.map((h) => {
          const s = h.trim().replace(/[^a-zA-Z0-9_]/g, "_") || "col";
          return `"${s.replace(/"/g, '""')}"`;
        });
        const tableIdent = `"${tableName.replace(/"/g, '""')}"`;
        engine.exec(
          `CREATE TABLE ${tableIdent} (${safeCols.map((c) => `${c} TEXT`).join(", ")})`,
        );
        engine.exec("BEGIN");
        try {
          for (const row of rows) {
            const vals = row
              .map((v) =>
                v === null || v === undefined
                  ? "NULL"
                  : `'${String(v).replace(/'/g, "''")}'`,
              )
              .join(", ");
            engine.exec(`INSERT INTO ${tableIdent} VALUES (${vals})`);
          }
          engine.exec("COMMIT");
        } catch (insertErr) {
          try {
            engine.exec("ROLLBACK");
          } catch {
            // Ignore rollback failure.
          }
          throw insertErr;
        }
        setTables(engine.listTables());
        setImportParquetOpen(false);
        showToast(
          `Imported ${rows.length} row${rows.length === 1 ? "" : "s"} into "${tableName}".`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Parquet import failed: ${msg}`, "warn");
      }
    },
    [tableNameFromFilename, showToast],
  );
  // Called from the result table when the user confirms deletion of one
  // or more selected rows from a previewed table. We rely on the
  // table's primary key to safely identify which rows to remove —
  // callers must pass the ordered PK column names along with the PK
  // values for each row. Re-runs the original preview afterwards so
  // the visible result reflects the updated table.
  const deleteRowsFromTable = useCallback(
    (
      tableName: string,
      pkColumns: string[],
      pkRows: ReadonlyArray<ReadonlyArray<unknown>>,
    ) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (pkColumns.length === 0 || pkRows.length === 0) return;
      const tabId = activeTabIdRef.current;
      try {
        const deleted = engine.deleteRows(tableName, pkColumns, pkRows);
        showToast(
          `Deleted ${deleted} row${deleted === 1 ? "" : "s"} from "${tableName}".`,
        );
        // Re-run the same preview the result was originally produced
        // from so the table refreshes in place.
        const sql = `SELECT * FROM ${quoteIdent(tableName)};`;
        runSqlForTab(tabId, sql, `Table: ${tableName}`, tableName);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Delete failed: ${msg}`, "warn");
      }
    },
    [quoteIdent, runSqlForTab, showToast],
  );

  // Persist a batch of single-cell edits. Called when the user clicks
  // "Update N cells" from an editable table preview. Uses row index
  // (not PK) to identify rows, so works for any table. Re-runs the
  // original preview afterwards so the result reflects the changes.
  const updateRowsInTable = useCallback(
    (
      tableName: string,
      updates: ReadonlyArray<{
        rowIndex: number;
        column: string;
        value: unknown;
      }>,
    ) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (updates.length === 0) return;
      const tabId = activeTabIdRef.current;
      try {
        const count = engine.updateRows(tableName, updates);
        showToast(
          `Updated ${count} cell${count === 1 ? "" : "s"} in "${tableName}".`,
        );
        const sql = `SELECT * FROM ${quoteIdent(tableName)};`;
        runSqlForTab(tabId, sql, `Table: ${tableName}`, tableName);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Update failed: ${msg}`, "warn");
      }
    },
    [quoteIdent, runSqlForTab, showToast],
  );

  // Duplicate a row by inserting a copy of it. Columns that are
  // auto-increment PKs are omitted so SQLite assigns a new value
  // automatically. Re-runs the preview afterwards.
  const duplicateRowInTable = useCallback(
    (
      tableName: string,
      columnNames: string[],
      values: unknown[],
    ) => {
      const engine = engineRef.current;
      if (!engine) return;
      const tabId = activeTabIdRef.current;
      try {
        engine.insertRow(tableName, columnNames, values);
        showToast(`Duplicated row in "${tableName}".`);
        const sql = `SELECT * FROM ${quoteIdent(tableName)};`;
        runSqlForTab(tabId, sql, `Table: ${tableName}`, tableName);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Duplicate failed: ${msg}`, "warn");
      }
    },
    [quoteIdent, runSqlForTab, showToast],
  );

  // Refresh cached column / FK info for a single entity. Called when
  // the sidebar row is expanded for the first time, after DDL changes,
  // and when the Modify Structure drawer reloads. Failures are
  // swallowed (and the entry cleared) so a transient PRAGMA error
  // can't keep stale rows on screen.
  const refreshEntityMetadata = useCallback((name: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    try {
      const cols = engine.listColumns(name);
      const fks = engine.listForeignKeys(name);
      setColumnsByEntity((prev) => ({ ...prev, [name]: cols }));
      setForeignKeysByEntity((prev) => ({ ...prev, [name]: fks }));
      // Constraint info is only meaningful for tables (not views), but
      // we call it unconditionally and let the engine return an empty
      // array for views — that keeps the call site simple.
      try {
        const constraints = engine.getColumnConstraintInfo(name);
        setConstraintsByEntity((prev) => ({ ...prev, [name]: constraints }));
      } catch {
        setConstraintsByEntity((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      }
    } catch {
      setColumnsByEntity((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      setForeignKeysByEntity((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      setConstraintsByEntity((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }, []);

  const refreshTableMetadata = useCallback(() => {
    for (const tableName of tables) {
      refreshEntityMetadata(tableName);
    }
  }, [tables, refreshEntityMetadata]);

  // PK / FK lookups for the current result's source table — only set
  // when the result came from a sidebar preview (`previewTable`
  // populates `sourceTable`). Computed here so the deeply-nested
  // `ResultTableBody` doesn't have to know about the engine. We
  // hydrate `columnsByEntity` / `foreignKeysByEntity` lazily so the
  // first preview of a not-yet-expanded table still gets icons.
  useEffect(() => {
    if (!result?.sourceTable) return;
    if (
      columnsByEntity[result.sourceTable] === undefined ||
      foreignKeysByEntity[result.sourceTable] === undefined
    ) {
      refreshEntityMetadata(result.sourceTable);
    }
  }, [result, columnsByEntity, foreignKeysByEntity, refreshEntityMetadata]);

  useEffect(() => {
    if (activeTab?.kind !== "er-diagram") return;
    refreshTableMetadata();
  }, [activeTab?.kind, tables, refreshTableMetadata]);

  const resultKeyHints = useMemo<ColumnKeyHints | undefined>(() => {
    const tableName = result?.sourceTable;
    if (!tableName) return undefined;
    const cols = columnsByEntity[tableName];
    const fks = foreignKeysByEntity[tableName];
    if (!cols && !fks) return undefined;
    const pk = new Set<string>();
    for (const c of cols ?? []) {
      if (c.pk > 0) pk.add(c.name);
    }
    const fkByName = new Map<string, ForeignKeyInfo>();
    for (const fk of fks ?? []) fkByName.set(fk.from, fk);
    return { pk, fk: fkByName };
  }, [result, columnsByEntity, foreignKeysByEntity]);

  const resultConstraintInfo = useMemo<ColumnConstraintInfo[] | undefined>(() => {
    const tableName = result?.sourceTable;
    if (!tableName) return undefined;
    return constraintsByEntity[tableName];
  }, [result, constraintsByEntity]);

  const toggleEntityExpanded = useCallback((name: string) => {
    setExpandedEntities((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      // Persist the (now-mutated) set so it survives reloads.
      try {
        localStorage.setItem(
          dbScopedKey(activeDbIdRef.current, "expanded_entities"),
          JSON.stringify(Array.from(next)),
        );
      } catch {
        // ignore quota errors
      }
      return next;
    });
    // Metadata loading is handled by a dedicated effect that watches
    // `expandedEntities` and `columnsByEntity` — keeping the side
    // effect outside the state updater is what guarantees the row's
    // column list reappears after `runSqlForTab` wipes the cache
    // (e.g. after a sidebar preview), instead of getting stuck on
    // "Loading…" until the user collapses and re-expands the row.
  }, []);

  const expandAllEntities = useCallback((names: string[]) => {
    setExpandedEntities((prev) => {
      const next = new Set(prev);
      for (const n of names) next.add(n);
      return next;
    });
  }, []);

  const collapseAllEntities = useCallback((names: string[]) => {
    setExpandedEntities((prev) => {
      const next = new Set(prev);
      for (const n of names) next.delete(n);
      return next;
    });
  }, []);

  // Lazy-load (and re-load) metadata for every currently-expanded
  // sidebar entity that has no cached `columnsByEntity` entry. This
  // is the single source of truth for "which expanded rows still need
  // their PRAGMA results fetched", so it correctly recovers when the
  // cache is wiped wholesale by `runSqlForTab` or a database switch.
  // We also depend on `loaded` so that when the user navigates away
  // and back (which remounts the component and re-runs engine init),
  // the expanded rows hydrated from localStorage get their column
  // lists re-fetched as soon as the engine becomes available — instead
  // of staying stuck on "Loading…" until the user collapses and
  // re-expands them.
  useEffect(() => {
    if (expandedEntities.size === 0) return;
    if (!loaded || !engineRef.current) return;
    for (const name of expandedEntities) {
      if (columnsByEntity[name] === undefined) {
        refreshEntityMetadata(name);
      }
    }
  }, [expandedEntities, columnsByEntity, refreshEntityMetadata, loaded]);

  // Modify Structure: prime the drawer from the current column / FK
  // info for `name` and open it. Each draft column gets a fresh local
  // id so React can track it across edits.
  const openModifyStructure = useCallback(
    (name: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      try {
        const cols = engine.listColumns(name);
        const fks = engine.listForeignKeys(name);
        const fkByCol = new Map<string, ForeignKeyInfo>();
        for (const fk of fks) fkByCol.set(fk.from, fk);
        // sql.js exposes `INTEGER PRIMARY KEY AUTOINCREMENT` only via
        // the original DDL — `PRAGMA table_info` collapses it to
        // `pk = 1`. We re-parse the DDL to detect the AUTOINCREMENT
        // marker so the drawer pre-selects the right checkbox.
        const ddl = engine.getDDL(name);
        const autoIncMatch =
          /\bautoincrement\b/i.test(ddl) && cols.some((c) => c.pk === 1);
        const drafts: ModifyColumnDraft[] = cols.map((c) => {
          const fk = fkByCol.get(c.name);
          return {
            id: newDraftId(),
            originalName: c.name,
            name: c.name,
            type: c.type || "TEXT",
            notNull: c.notNull,
            primaryKey: c.pk > 0,
            autoIncrement:
              autoIncMatch && c.pk === 1 && /^integer$/i.test(c.type ?? ""),
            unique: false,
            defaultValue: c.defaultValue ?? "",
            fkTable: fk?.table ?? "",
            fkColumn: fk?.to ?? "",
            fkOnDelete: fk?.onDelete ?? "NO ACTION",
            fkOnUpdate: fk?.onUpdate ?? "NO ACTION",
          };
        });
        setModifyDialog({
          originalName: name,
          newName: name,
          columns: drafts,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Couldn't load structure: ${msg}`, "warn");
      }
    },
    [showToast],
  );

  const submitModifyStructure = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !modifyDialog) return;
    const trimmedName = modifyDialog.newName.trim();
    if (!trimmedName) {
      showToast("Table name cannot be empty.", "warn");
      return;
    }
    const blankCols = modifyDialog.columns.filter((c) => !c.name.trim());
    if (blankCols.length > 0) {
      showToast("Column names cannot be empty.", "warn");
      setModifyInvalidColIds(new Set(blankCols.map((c) => c.id)));
      return;
    }
    const spec = {
      originalName: modifyDialog.originalName,
      newName: trimmedName,
      columns: modifyDialog.columns.map<ColumnSpec>((c) => ({
        name: c.name.trim(),
        type: c.type,
        notNull: c.notNull,
        primaryKey: c.primaryKey,
        autoIncrement: c.autoIncrement,
        unique: c.unique,
        defaultValue: c.defaultValue.trim() || undefined,
        foreignKey:
          c.fkTable && c.fkColumn
            ? {
                table: c.fkTable.trim(),
                column: c.fkColumn.trim(),
                onDelete: c.fkOnDelete || "NO ACTION",
                onUpdate: c.fkOnUpdate || "NO ACTION",
              }
            : undefined,
        originalName: c.originalName ?? undefined,
      })),
    };
    try {
      engine.rebuildTable(spec);
      setTables(engine.listTables());
      setViews(engine.listViews());
      setIndexes(engine.listIndexes());
      setTriggers(engine.listTriggers());
      // Refresh cached metadata for the (possibly renamed) table so
      // expanded rows show the new column list immediately.
      refreshEntityMetadata(trimmedName);
      // Update the expanded-set if the table was renamed so the user
      // doesn't lose their expansion state.
      if (trimmedName !== modifyDialog.originalName) {
        setExpandedEntities((prev) => {
          if (!prev.has(modifyDialog.originalName)) return prev;
          const next = new Set(prev);
          next.delete(modifyDialog.originalName);
          next.add(trimmedName);
          return next;
        });
      }
      setModifyDialog(null);
      setModifyInvalidColIds(new Set());
      showToast(`Updated table "${trimmedName}".`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Save failed: ${msg}`, "warn");
    }
  }, [modifyDialog, refreshEntityMetadata, showToast]);

  const openAddRow = useCallback(
    (name: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      try {
        const cols = engine.listColumns(name);
        const initValues: Record<string, string> = {};
        for (const c of cols) initValues[c.name] = "";
        setAddRowDialog({
          tableName: name,
          columns: cols,
          values: initValues,
          addAnother: false,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Couldn't load columns: ${msg}`, "warn");
      }
    },
    [showToast],
  );

  const submitAddRow = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !addRowDialog) return;
    const { tableName, columns, values, addAnother } = addRowDialog;
    const colNames = columns
      .map((c) => `"${c.name.replace(/"/g, '""')}"`)
      .join(", ");
    const colValues = columns
      .map((c) => {
        const v = values[c.name] ?? "";
        if (v === "") return "NULL";
        return `'${v.replace(/'/g, "''")}'`;
      })
      .join(", ");
    try {
      engine.exec(
        `INSERT INTO "${tableName.replace(/"/g, '""')}" (${colNames}) VALUES (${colValues})`,
      );
      showToast(`Row added to "${tableName}".`);
      if (addAnother) {
        const newValues: Record<string, string> = {};
        for (const c of columns) newValues[c.name] = "";
        setAddRowDialog((prev) =>
          prev ? { ...prev, values: newValues } : null,
        );
      } else {
        setAddRowDialog(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Insert failed: ${msg}`, "warn");
    }
  }, [addRowDialog, showToast]);

  const openAddTable = useCallback(() => {
    setAddTableDialog({
      originalName: "",
      newName: "new_table",
      columns: [
        {
          id: newDraftId(),
          originalName: null,
          name: "id",
          type: "INTEGER",
          notNull: false,
          primaryKey: true,
          autoIncrement: true,
          unique: false,
          defaultValue: "",
          fkTable: "",
          fkColumn: "",
          fkOnDelete: "NO ACTION",
          fkOnUpdate: "NO ACTION",
        },
      ],
    });
  }, []);

  const submitAddTable = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !addTableDialog) return;
    const trimmedName = addTableDialog.newName.trim();
    if (!trimmedName) {
      showToast("Table name cannot be empty.", "warn");
      return;
    }
    const cols = addTableDialog.columns;
    const blankCols = cols.filter((c) => !c.name.trim());
    if (blankCols.length > 0) {
      showToast("Column names cannot be empty.", "warn");
      setAddTableInvalidColIds(new Set(blankCols.map((c) => c.id)));
      return;
    }
    const colDefs = cols.map((c) => {
      const parts: string[] = [
        `"${c.name.trim().replace(/"/g, '""')}" ${c.type}`,
      ];
      if (c.notNull) parts.push("NOT NULL");
      if (c.primaryKey) {
        parts.push("PRIMARY KEY");
        if (c.autoIncrement) parts.push("AUTOINCREMENT");
      }
      if (c.unique && !c.primaryKey) parts.push("UNIQUE");
      if (c.defaultValue.trim()) parts.push(`DEFAULT ${c.defaultValue.trim()}`);
      return parts.join(" ");
    });
    const fkConstraints = cols
      .filter((c) => c.fkTable && c.fkColumn)
      .map(
        (c) =>
          `FOREIGN KEY ("${c.name.trim().replace(/"/g, '""')}") REFERENCES "${c.fkTable}"("${c.fkColumn}")`,
      );
    const allDefs = [...colDefs, ...fkConstraints].join(", ");
    const sql = `CREATE TABLE "${trimmedName.replace(/"/g, '""')}" (${allDefs})`;
    try {
      engine.exec(sql);
      setTables(engine.listTables());
      setAddTableDialog(null);
      setAddTableInvalidColIds(new Set());
      showToast(`Created table "${trimmedName}".`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Create failed: ${msg}`, "warn");
    }
  }, [addTableDialog, showToast]);

  const viewDDL = useCallback(
    (name: string, kind: "table" | "view") => {
      const engine = engineRef.current;
      if (!engine) return;
      try {
        const sql = engine.getDDL(name);
        if (!sql.trim()) {
          showToast(
            `No DDL recorded for ${kind === "view" ? "view" : "table"} "${name}".`,
            "warn",
          );
          return;
        }
        setDdlDialog({ title: name, sql });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Couldn't read DDL: ${msg}`, "warn");
      }
    },
    [showToast],
  );

  // ─── Export table / view to CSV ──────────────────────────────────

  // ─── Export table / view to any format ───────────────────────────
  const exportEntityToFormat = useCallback(
    (name: string, format: "csv" | "json" | "sql" | "parquet" | "xlsx") => {
      const engine = engineRef.current;
      if (!engine) return;
      try {
        const sets = engine.exec(`SELECT * FROM ${quoteIdent(name)}`);
        if (!sets || sets.length === 0) {
          showToast(`"${name}" is empty — no data to export.`, "warn");
          return;
        }
        const { columns, values: rows } = sets[0];
        const filename = `${name}.${format}`;
        if (format === "csv") {
          exportResultToCsv(columns, rows, filename);
          showToast(`Exported ${filename}.`);
        } else if (format === "json") {
          exportResultToJson(columns, rows, filename);
          showToast(`Exported ${filename}.`);
        } else if (format === "parquet") {
          exportResultToParquet(columns, rows, filename)
            .then(() => showToast(`Exported ${filename}.`))
            .catch((err) => showToast(`Export failed: ${err instanceof Error ? err.message : String(err)}`, "warn"));
        } else if (format === "xlsx") {
          exportResultToXlsx(columns, rows, filename)
            .then(() => showToast(`Exported ${filename}.`))
            .catch((err) => showToast(`Export failed: ${err instanceof Error ? err.message : String(err)}`, "warn"));
        } else {
          exportResultToSql(columns, rows, filename);
          showToast(`Exported ${filename}.`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Export failed: ${msg}`, "warn");
      }
    },
    [quoteIdent, showToast],
  );

  // ─── Get row count for a table / view ────────────────────────────
  const getEntityRowCount = useCallback(
    (name: string): number => {
      const engine = engineRef.current;
      if (!engine) return 0;
      try {
        const sets = engine.exec(`SELECT COUNT(*) FROM ${quoteIdent(name)}`);
        if (!sets || sets.length === 0 || sets[0].values.length === 0) return 0;
        return Number(sets[0].values[0][0]) || 0;
      } catch {
        return 0;
      }
    },
    [quoteIdent],
  );

  // ─── Tab actions ────────────────────────────────────────────────────
  const addTab = useCallback(() => {
    const nextNum = tabs.length + 1;
    const initialCode = "-- New query\nSELECT 1;";
    const tab: QueryTab = {
      id: newTabId(),
      title: `Query ${nextNum}`,
      code: initialCode,
      pristineCode: initialCode,
    };
    const next = [...tabs, tab];
    setTabs(next);
    saveTabs(activeDbId, next);
    activeTabIdRef.current = tab.id;
    setActiveTabId(tab.id);
  }, [tabs, activeDbId]);

  const openErDiagramTab = useCallback(() => {
    // Always refresh all table metadata before showing the ERD. The
    // result table hydrates metadata lazily for the viewed table, and
    // this keeps revisiting the ERD from rendering with stale partial
    // column caches.
    refreshTableMetadata();
    const existing = tabs.find((t) => t.kind === "er-diagram");
    if (existing) {
      // If the ER Diagram tab is already the active tab, close it (toggle).
      if (existing.id === activeTabId) {
        const next = tabs.filter((t) => t.id !== existing.id);
        const finalTabs =
          next.length > 0
            ? next
            : [{ id: newTabId(), title: "Query 1", code: "-- New query\nSELECT 1;", pristineCode: "-- New query\nSELECT 1;" }];
        setTabs(finalTabs);
        saveTabs(activeDbId, finalTabs);
        activeTabIdRef.current = finalTabs[0].id;
        setActiveTabId(finalTabs[0].id);
        return;
      }
      // Otherwise switch to it.
      activeTabIdRef.current = existing.id;
      setActiveTabId(existing.id);
      return;
    }
    const tab: QueryTab = {
      id: newTabId(),
      title: "ER Diagram",
      code: "",
      pristineCode: "",
      kind: "er-diagram",
    };
    const next = [...tabs, tab];
    setTabs(next);
    saveTabs(activeDbId, next);
    activeTabIdRef.current = tab.id;
    setActiveTabId(tab.id);
  }, [tabs, activeTabId, activeDbId, refreshTableMetadata]);

  const closeTab = useCallback(
    (id: string) => {
      const target = tabs.find((t) => t.id === id);
      if (!target) return;
      // Prompt before closing a tab the user has actually edited so
      // they can't accidentally lose work. Tabs that still match their
      // pristine seed (e.g. a sidebar preview the user double-clicked
      // but never modified) close silently.
      const isDirty = target.code !== target.pristineCode;
      if (isDirty && tabs.length > 1) {
        setConfirmCloseTabId(id);
        return;
      }
      const next = tabs.filter((t) => t.id !== id);
      // Always keep at least one tab; if the user closes the last one
      // we synthesise a fresh empty one rather than leaving the editor
      // in an unrecoverable state.
      const finalTabs =
        next.length > 0
          ? next
          : [
              {
                id: newTabId(),
                title: "Query 1",
                code: "-- New query\nSELECT 1;",
                pristineCode: "-- New query\nSELECT 1;",
              },
            ];
      setTabs(finalTabs);
      saveTabs(activeDbId, finalTabs);
      if (activeTabId === id) {
        activeTabIdRef.current = finalTabs[0].id;
        setActiveTabId(finalTabs[0].id);
      }
    },
    [tabs, activeTabId, activeDbId],
  );

  const confirmCloseTab = useCallback(() => {
    const id = confirmCloseTabId;
    if (!id) return;
    setConfirmCloseTabId(null);
    const next = tabs.filter((t) => t.id !== id);
    const finalTabs =
      next.length > 0
        ? next
        : [
            {
              id: newTabId(),
              title: "Query 1",
              code: "-- New query\nSELECT 1;",
              pristineCode: "-- New query\nSELECT 1;",
            },
          ];
    setTabs(finalTabs);
    saveTabs(activeDbId, finalTabs);
    if (activeTabId === id) {
      activeTabIdRef.current = finalTabs[0].id;
      setActiveTabId(finalTabs[0].id);
    }
  }, [confirmCloseTabId, tabs, activeTabId, activeDbId]);

  const renameTab = useCallback(
    (id: string, newTitle: string) => {
      const trimmed = newTitle.trim();
      if (!trimmed) return;
      const next = tabs.map((t) =>
        t.id === id ? { ...t, title: trimmed } : t,
      );
      setTabs(next);
      saveTabs(activeDbId, next);
    },
    [tabs, activeDbId],
  );

  const duplicateTab = useCallback(
    (id: string) => {
      const idx = tabs.findIndex((t) => t.id === id);
      if (idx < 0) return;
      const source = tabs[idx];
      const copy: QueryTab = {
        ...source,
        id: newTabId(),
        title: `${source.title} Copy`,
        // Duplicates start out matching their initial contents, so the
        // user can dismiss them without a confirmation prompt unless
        // they actually edit the copy.
        pristineCode: source.code,
      };
      const next = [...tabs.slice(0, idx + 1), copy, ...tabs.slice(idx + 1)];
      setTabs(next);
      saveTabs(activeDbId, next);
      activeTabIdRef.current = copy.id;
      setActiveTabId(copy.id);
    },
    [tabs, activeDbId],
  );

  const closeOtherTabs = useCallback(
    (id: string) => {
      const target = tabs.find((t) => t.id === id);
      if (!target) return;
      const next = [target];
      setTabs(next);
      saveTabs(activeDbId, next);
      activeTabIdRef.current = target.id;
      setActiveTabId(target.id);
    },
    [tabs, activeDbId],
  );

  const closeAllTabs = useCallback(() => {
    const fresh = [
      { id: newTabId(), title: "Query 1", code: "-- New query\nSELECT 1;", pristineCode: "-- New query\nSELECT 1;" },
    ];
    // Order matters: synchronously update the refs the editor's
    // `change` listener reads from BEFORE we call `editor.setValue`.
    // Otherwise the listener fires with stale `tabsRef`/`activeTabIdRef`
    // values, computes a "next" tabs array against the OLD tabs, and
    // calls setTabs with that — overwriting the fresh single tab we
    // just committed. The visible symptom is that the first "Close All"
    // only clears the editor and result set; the user has to invoke it
    // a second time before the actual tab list collapses.
    tabsRef.current = fresh;
    activeTabIdRef.current = fresh[0].id;
    setTabs(fresh);
    saveTabs(activeDbId, fresh);
    setActiveTabId(fresh[0].id);
    setResultsByTab({});
    const view = editorRef.current;
    if (view) replaceDoc(view, "");
  }, [activeDbId]);

  const handleTabDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      activeTabIdRef.current = id;
      setActiveTabId(id);
    },
    [],
  );

  const handleTabDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = tabs.findIndex((t) => t.id === active.id);
      const newIndex = tabs.findIndex((t) => t.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const next = arrayMove(tabs, oldIndex, newIndex);
      tabsRef.current = next;
      setTabs(next);
      saveTabs(activeDbId, next);
    },
    [tabs, activeDbId],
  );

  const resetTabsForCurrentDb = useCallback(() => {
    const sample =
      customDb?.id === activeDbId ? customDb : findSampleDatabase(activeDbId);
    const fresh = sample.defaultTabs.map((seed) => ({
      ...seed,
      id: newTabId(),
      pristineCode: seed.code,
    }));
    // Order matters: synchronously update the refs the editor's
    // `change` listener reads from BEFORE we call `editor.setValue`.
    // Otherwise the listener fires with stale `tabsRef`/`activeTabIdRef`
    // values, computes a "next" tabs array against the OLD tabs, and
    // calls setTabs with that — overwriting the fresh tabs we just
    // committed and leaving the user with the previous tab list (with
    // only its first entry's code clobbered). This was the exact
    // symptom reported in Update 4.
    tabsRef.current = fresh;
    activeTabIdRef.current = fresh[0].id;
    setTabs(fresh);
    saveTabs(activeDbId, fresh);
    setActiveTabId(fresh[0].id);
    setResultsByTab({});
    const view = editorRef.current;
    if (view) replaceDoc(view, fresh[0].code);
    showToast("Query tabs reset to defaults.");
  }, [activeDbId, customDb, showToast]);

  // ─── Resizer (vertical, between results panel and editor) ───────────
  const panesRef = useRef<HTMLDivElement | null>(null);
  const resultsPaneRef = useRef<HTMLDivElement | null>(null);
  const editorPaneRef = useRef<HTMLDivElement | null>(null);
  const resizerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const resizer = resizerRef.current;
    const panes = panesRef.current;
    const editorPane = editorPaneRef.current;
    const resultsPane = resultsPaneRef.current;
    if (!resizer || !panes || !editorPane || !resultsPane) return;
    let dragging = false;
    let startY = 0;
    let startEditorH = 0;
    let startResultsH = 0;
    const onDown = (e: MouseEvent) => {
      dragging = true;
      startY = e.clientY;
      startEditorH = editorPane.offsetHeight;
      startResultsH = resultsPane.offsetHeight;
      resizer.classList.add("dragging");
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      // Editor and results share the available track underneath the
      // tab strip — divide that region by the dragged ratio so the
      // tabbar's auto-sized row stays untouched.
      const total = startEditorH + startResultsH;
      if (total <= 0) return;
      const dy = e.clientY - startY;
      const editorH = Math.min(
        total - Math.round(total * 0.15),
        Math.max(Math.round(total * 0.15), startEditorH + dy),
      );
      const editorFrac = editorH / total;
      panes.style.gridTemplateRows = `auto minmax(0, ${editorFrac}fr) 6px minmax(0, ${1 - editorFrac}fr)`;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      resizer.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    resizer.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      resizer.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Clear any inline gridTemplateRows set by the resizer when entering
  // view-data or er-diagram mode, so the CSS class can take effect
  // (inline styles otherwise win over class rules).
  useEffect(() => {
    const panes = panesRef.current;
    if (!panes) return;
    if (activeTab?.kind === "view-data" || activeTab?.kind === "er-diagram") {
      panes.style.gridTemplateRows = "";
    }
  }, [activeTab?.kind]);

  // ─── Sidebar resizer (horizontal, between sidebar and panes) ────────
  // The sidebar width is persisted as a CSS custom property on the
  // `.sql-shell` element and mirrored to localStorage so it survives
  // reloads. We clamp into a sane range so the user can't accidentally
  // hide the sidebar entirely or push the editor off-screen.
  const shellRef = useRef<HTMLDivElement | null>(null);
  const sidebarResizerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const shell = shellRef.current;
    const resizer = sidebarResizerRef.current;
    if (!shell || !resizer) return;
    // Hydrate from localStorage on mount.
    try {
      const saved = Number(localStorage.getItem(storageKey("sidebar_w")));
      if (Number.isFinite(saved) && saved >= 160 && saved <= 600) {
        shell.style.setProperty("--sql-sidebar-width", `${saved}px`);
      }
    } catch {
      // ignore
    }
    let dragging = false;
    let startX = 0;
    let startW = 0;
    const onDown = (e: MouseEvent) => {
      dragging = true;
      startX = e.clientX;
      // Read the actual rendered width rather than the CSS variable so
      // the first drag from the default value doesn't snap.
      const sidebar = shell.firstElementChild as HTMLElement | null;
      startW = sidebar?.offsetWidth ?? 240;
      resizer.classList.add("dragging");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const shellWidth = shell.offsetWidth;
      const maxW = Math.max(200, Math.min(600, shellWidth - 320));
      const next = Math.max(160, Math.min(maxW, startW + (e.clientX - startX)));
      shell.style.setProperty("--sql-sidebar-width", `${next}px`);
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      resizer.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      const sidebar = shell.firstElementChild as HTMLElement | null;
      const w = sidebar?.offsetWidth;
      if (w) {
        try {
          localStorage.setItem(storageKey("sidebar_w"), String(w));
        } catch {
          // ignore
        }
      }
    };
    resizer.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      resizer.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // ─── Loading-screen quip rotator ────────────────────────────────────
  const [quipIndex, setQuipIndex] = useState<number>(0);
  const quipSeedRef = useRef<number>(-1);
  useEffect(() => {
    if (quipSeedRef.current < 0) {
      quipSeedRef.current = Math.floor(Math.random() * LOADING_QUIPS.length);
    }
  }, []);
  useEffect(() => {
    if (loaded || statusState === "error") return;
    let tick = 0;
    const id = window.setInterval(() => {
      tick += 1;
      setQuipIndex(
        tick === 1
          ? Math.max(0, quipSeedRef.current)
          : (prev) => (prev + 1) % LOADING_QUIPS.length,
      );
    }, 2200);
    return () => window.clearInterval(id);
  }, [loaded, statusState]);

  const activeSample = useMemo(() => {
    const base =
      customDb?.id === activeDbId ? customDb : findSampleDatabase(activeDbId);
    const overrideName = customFilenames[activeDbId];
    if (overrideName) return { ...base, filename: overrideName };
    return base;
  }, [activeDbId, customDb, customFilenames]);

  return (
    <div className="pg-root">
      {showLoadingOverlay && (
        <div
          className={`pyodide-loading${
            statusState === "error" ? " has-error" : ""
          }${loadingFading ? " hidden" : ""}`}
          role="status"
          aria-live="polite"
        >
          <div className="loading-hero" aria-hidden="true">
            <div className="loading-hero-track">
              <span className="loading-hero-text">SQLite Playground</span>
              <span className="loading-hero-text">SQLite Playground</span>
              <span className="loading-hero-text">SQLite Playground</span>
              <span className="loading-hero-text">SQLite Playground</span>
            </div>
          </div>
          <div className="loading-bottom">
            <div className="loading-quip">
              {statusState === "error"
                ? loadingMessage
                : LOADING_QUIPS[quipIndex]}
            </div>
            <div className="loading-bar-wrap">
              <div className="loading-bar" />
            </div>
          </div>
        </div>
      )}

      <div className="pg-app">
        <header className="pg-header">
          <div className="logo">
            <Link href="/" aria-label="Dataslope home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/dataslope-logo-blue.svg" alt="Dataslope logo" className="brand-logo" />
            </Link>
            <Link href="/" className="brand-name">
              Dataslope
            </Link>
            <Select.Root
              value={PLAYGROUND_ID}
              onValueChange={(value) => {
                const next = PLAYGROUNDS.find((p) => p.id === value);
                if (next && next.id !== PLAYGROUND_ID) router.push(next.href);
              }}
            >
              <Select.Trigger
                className="playground-switcher"
                aria-label="Switch playground"
              >
                {(() => {
                  const Icon = PLAYGROUND_ICONS[PLAYGROUND_ID];
                  const color = PLAYGROUND_ICON_COLORS[PLAYGROUND_ID];
                  const factor =
                    PLAYGROUND_ICON_SIZE_FACTOR[PLAYGROUND_ID] ?? 1;
                  return Icon ? (
                    <span
                      className="playground-switcher-lang-icon"
                      style={{ color }}
                      aria-hidden="true"
                    >
                      <Icon size={Math.round(16 * factor)} />
                    </span>
                  ) : null;
                })()}
                <Select.Value />
                <Select.Icon className="playground-switcher-icon">
                  <svg viewBox="0 0 12 12" width={10} height={10}>
                    <polyline
                      points="2,4 6,8 10,4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner
                  className="pg-lang-switcher-positioner"
                  sideOffset={6}
                  alignItemWithTrigger={false}
                >
                  <Select.Popup className="bui-select-popup pg-lang-switcher-popup">
                    {PLAYGROUNDS.map((p) => {
                      const Icon = PLAYGROUND_ICONS[p.id];
                      const color = PLAYGROUND_ICON_COLORS[p.id];
                      const factor = PLAYGROUND_ICON_SIZE_FACTOR[p.id] ?? 1;
                      return (
                        <Select.Item
                          key={p.id}
                          value={p.id}
                          className="bui-select-item"
                        >
                          {Icon && (
                            <span
                              className="bui-select-item-icon"
                              style={{ color }}
                              aria-hidden="true"
                            >
                              <Icon size={Math.round(16 * factor)} />
                            </span>
                          )}
                          <Select.ItemText>{p.label}</Select.ItemText>
                        </Select.Item>
                      );
                    })}
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </div>
          <div className="header-sep" />
          <div className="header-actions desktop-only">
            <Menu.Root>
              <Menu.Trigger
                className="header-btn"
                title="Import data"
                aria-label="Import"
                disabled={!loaded}
              >
                <ArrowUpFromLine size={14} aria-hidden="true" />
                <span className="btn-label">Import</span>
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner sideOffset={6} align="start">
                  <Menu.Popup className="bui-popup examples-dropdown export-dropdown">
                    <Menu.Item
                      className="example-item export-item"
                      onClick={() => setImportSqliteOpen(true)}
                    >
                      <div className="export-item-text">
                        <div className="ex-title">
                          from SQLite
                          <span className="ext-badge">.sqlite</span>
                        </div>
                        <div className="ex-desc">
                          Replace database from .sqlite file
                        </div>
                      </div>
                    </Menu.Item>
                    <Menu.Item
                      className="example-item export-item"
                      onClick={() => {
                        setImportCsvState(null);
                        setImportCsvOpen(true);
                      }}
                    >
                      <div className="export-item-text">
                        <div className="ex-title">
                          from CSV
                          <span className="ext-badge">.csv</span>
                        </div>
                        <div className="ex-desc">Add table from CSV file</div>
                      </div>
                    </Menu.Item>
                    <Menu.Item
                      className="example-item export-item"
                      onClick={() => {
                        setImportJsonState(null);
                        setImportJsonOpen(true);
                      }}
                    >
                      <div className="export-item-text">
                        <div className="ex-title">
                          from JSON
                          <span className="ext-badge">.json</span>
                        </div>
                        <div className="ex-desc">Add table from JSON array</div>
                      </div>
                    </Menu.Item>
                    <Menu.Item
                      className="example-item export-item"
                      onClick={() => {
                        setImportParquetOpen(true);
                        setImportParquetDragging(false);
                      }}
                    >
                      <div className="export-item-text">
                        <div className="ex-title">
                          from Parquet
                          <span className="ext-badge">.parquet</span>
                        </div>
                        <div className="ex-desc">Add table from Parquet file</div>
                      </div>
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
            <Menu.Root>
              <Menu.Trigger
                className="header-btn"
                title="Export database"
                aria-label="Export"
                disabled={!loaded}
              >
                <ArrowDownToLine size={14} aria-hidden="true" />
                <span className="btn-label">Export</span>
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner sideOffset={6} align="start">
                  <Menu.Popup className="bui-popup examples-dropdown export-dropdown">
                    <div className="sql-result-export-group-label">SQLite Database</div>
                    <Menu.Item
                      className="example-item export-item"
                      onClick={exportDatabase}
                      disabled={tables.length === 0}
                    >
                      <div className="export-item-text">
                        <div className="ex-title">
                          SQLite File
                          <span className="ext-badge">.sqlite</span>
                        </div>
                        <div className="ex-desc">Download as .sqlite</div>
                      </div>
                    </Menu.Item>
                    <Menu.Item
                      className="example-item export-item"
                      onClick={exportDatabaseToXlsx}
                      disabled={tables.length === 0}
                    >
                      <div className="export-item-text">
                        <div className="ex-title">
                          Excel Workbook
                          <span className="ext-badge">.xlsx</span>
                        </div>
                        <div className="ex-desc">One sheet per table</div>
                      </div>
                    </Menu.Item>
                    {tables.length === 0 && (
                      <div className="sql-export-info-msg">
                        Create a table to export the database
                      </div>
                    )}
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
            <Popover.Root>
              <Popover.Trigger
                className="header-btn icon-only"
                title="Runtime info"
                aria-label="Runtime info"
              >
                <FaInfo size={13} aria-hidden="true" />
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner sideOffset={6} align="end">
                  <Popover.Popup className="bui-popup info-popover">
                    <RuntimeInfoContent info={RUNTIME_INFO} />
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
            <button
              type="button"
              className="header-btn icon-only"
              onClick={() => {
                setSettingsOpen(true);
              }}
              title="Settings"
              aria-label="Settings"
            >
              <svg
                className="stroke-icon"
                viewBox="0 0 24 24"
                width={15}
                height={15}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </header>

        <SettingsPanel
          open={settingsOpen}
          fontSize={fontSize}
          setFontSize={setFontSize}
          outputFontSizeEnabled={outputFontSizeEnabled}
          setOutputFontSizeEnabled={setOutputFontSizeEnabled}
          outputFontSize={outputFontSize}
          setOutputFontSize={setOutputFontSize}
          editorTheme={editorTheme}
          setEditorTheme={setEditorTheme}
          wordWrap={wordWrap}
          setWordWrap={setWordWrap}
          clearBeforeRun={clearBeforeRun}
          setClearBeforeRun={setClearBeforeRun}
          language={PLAYGROUND_ID}
          showOutputFontSizeControls={false}
          clearBeforeRunLabel="Clear Results Before Running"
          onClose={() => setSettingsOpen(false)}
          onRestoreDefaults={() => setConfirmRestoreOpen(true)}
          onClearLocalStorage={() => setConfirmClearStorageOpen(true)}
          extraGeneralRows={
            <>
              <div className="setting-row">
                <button
                  type="button"
                  className="settings-action-btn"
                  onClick={resetTabsForCurrentDb}
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  <span>Reset query tabs for {activeSample.label}</span>
                </button>
              </div>
            </>
          }
          extraTabs={[
            {
              value: "pragmas",
              trigger: (
                <>
                  <Settings2 size={14} aria-hidden="true" />
                  <span className="settings-tab-label">Pragmas</span>
                </>
              ),
              panel: (
                <PragmaSettingsTab
                  key={settingsOpen ? "open" : "closed"}
                  savedPragmas={pragmaSettings}
                  onSave={savePragmaSettings}
                />
              ),
            },
          ]}
        />

        <AlertDialog.Root
          open={pendingDbId !== null}
          onOpenChange={(next) => {
            if (!next) setPendingDbId(null);
          }}
        >
          <AlertDialog.Portal>
            <AlertDialog.Backdrop className="confirm-backdrop" />
            <AlertDialog.Popup className="confirm-popup">
              <AlertDialog.Title className="confirm-title">
                Switch databases?
              </AlertDialog.Title>
              <AlertDialog.Description className="confirm-desc">
                You have unsaved edits in the query tabs for{" "}
                <strong>{activeSample.filename}</strong>. They will be saved and
                restored when you switch back, but loading another database will
                replace what&rsquo;s currently in the editor.
              </AlertDialog.Description>
              <div className="confirm-actions">
                <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </AlertDialog.Close>
                <AlertDialog.Close
                  className="confirm-btn confirm-btn-danger"
                  onClick={() => {
                    if (pendingDbId) performDbSwitch(pendingDbId);
                    setPendingDbId(null);
                  }}
                >
                  Switch database
                </AlertDialog.Close>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>

        <AlertDialog.Root
          open={confirmCloseTabId !== null}
          onOpenChange={(next) => {
            if (!next) setConfirmCloseTabId(null);
          }}
        >
          <AlertDialog.Portal>
            <AlertDialog.Backdrop className="confirm-backdrop" />
            <AlertDialog.Popup className="confirm-popup">
              <AlertDialog.Title className="confirm-title">
                Close this tab?
              </AlertDialog.Title>
              <AlertDialog.Description className="confirm-desc">
                The query in this tab will be discarded. This can&rsquo;t be
                undone.
              </AlertDialog.Description>
              <div className="confirm-actions">
                <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </AlertDialog.Close>
                <AlertDialog.Close
                  className="confirm-btn confirm-btn-danger"
                  onClick={confirmCloseTab}
                >
                  Discard &amp; close
                </AlertDialog.Close>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>

        <AlertDialog.Root
          open={confirmRestoreOpen}
          onOpenChange={setConfirmRestoreOpen}
        >
          <AlertDialog.Portal>
            <AlertDialog.Backdrop className="confirm-backdrop" />
            <AlertDialog.Popup className="confirm-popup">
              <AlertDialog.Title className="confirm-title">
                Restore default settings?
              </AlertDialog.Title>
              <AlertDialog.Description className="confirm-desc">
                This will reset SQLite&apos;s editor font size, word wrap,
                run/result preferences, and the shared editor theme to their
                built-in defaults. Your saved queries are not affected.
              </AlertDialog.Description>
              <div className="confirm-actions">
                <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </AlertDialog.Close>
                <AlertDialog.Close
                  className="confirm-btn confirm-btn-danger"
                  onClick={() => {
                    restoreDefaultSettings();
                    setConfirmRestoreOpen(false);
                  }}
                >
                  Restore defaults
                </AlertDialog.Close>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>

        <AlertDialog.Root
          open={confirmClearStorageOpen}
          onOpenChange={setConfirmClearStorageOpen}
        >
          <AlertDialog.Portal>
            <AlertDialog.Backdrop className="confirm-backdrop" />
            <AlertDialog.Popup className="confirm-popup">
              <AlertDialog.Title className="confirm-title">
                Clear all localStorage data?
              </AlertDialog.Title>
              <AlertDialog.Description className="confirm-desc">
                This will permanently delete every saved setting and query
                across <strong>all playgrounds</strong>. The page will reload
                immediately. This can&rsquo;t be undone.
              </AlertDialog.Description>
              <div className="confirm-actions">
                <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </AlertDialog.Close>
                <AlertDialog.Close
                  className="confirm-btn confirm-btn-danger"
                  onClick={clearAllLocalStorage}
                >
                  Clear &amp; reload
                </AlertDialog.Close>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>

        <AlertDialog.Root
          open={truncateConfirm !== null}
          onOpenChange={(next) => {
            if (!next) setTruncateConfirm(null);
          }}
        >
          <AlertDialog.Portal>
            <AlertDialog.Backdrop className="confirm-backdrop" />
            <AlertDialog.Popup className="confirm-popup">
              <AlertDialog.Title className="confirm-title">
                Truncate table?
              </AlertDialog.Title>
              <AlertDialog.Description className="confirm-desc">
                Truncate table <strong>{truncateConfirm}</strong>? This deletes
                every row but keeps the schema. The change is in-memory only and
                will be undone next page load.
              </AlertDialog.Description>
              <div className="confirm-actions">
                <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </AlertDialog.Close>
                <AlertDialog.Close
                  className="confirm-btn confirm-btn-danger"
                  onClick={confirmTruncate}
                >
                  Truncate
                </AlertDialog.Close>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>

        {/* ── Drop entity confirmation dialog ── */}
        <AlertDialog.Root
          open={pendingDropEntity !== null}
          onOpenChange={(next) => {
            if (!next) setPendingDropEntity(null);
          }}
        >
          <AlertDialog.Portal>
            <AlertDialog.Backdrop className="confirm-backdrop" />
            <AlertDialog.Popup className="confirm-popup">
              <AlertDialog.Title className="confirm-title">
                Drop {pendingDropEntity ? DROP_KIND_LABELS[pendingDropEntity.kind] : ""}?
              </AlertDialog.Title>
              <AlertDialog.Description className="confirm-desc">
                Drop {pendingDropEntity ? DROP_KIND_LABELS[pendingDropEntity.kind].toLowerCase() : ""}{" "}
                <strong>{pendingDropEntity?.name}</strong>? This change is
                in-memory only and will be undone next page load.
              </AlertDialog.Description>
              <div className="confirm-actions">
                <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </AlertDialog.Close>
                <AlertDialog.Close
                  className="confirm-btn confirm-btn-danger"
                  onClick={confirmDrop}
                >
                  Drop
                </AlertDialog.Close>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>

        {/* ── Import SQLite dialog ── */}
        <Dialog.Root
          open={importSqliteOpen}
          onOpenChange={(next) => {
            if (!next) {
              setImportSqliteOpen(false);
              setImportSqliteDragging(false);
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop" />
            <Dialog.Popup className="confirm-popup sql-import-popup">
              <Dialog.Title className="confirm-title">
                Import SQLite File
              </Dialog.Title>
              <Dialog.Description className="confirm-desc">
                Open a local <code>.sqlite</code> or <code>.db</code> file as a
                new in-memory database.
              </Dialog.Description>
              <div className="sql-import-warning">
                <TriangleAlert
                  size={14}
                  className="sql-import-warning-icon"
                  aria-hidden="true"
                />
                <span>
                  This is a playground environment. Your file will{" "}
                  <strong>not</strong> be uploaded or persisted — it is only
                  loaded into browser memory and will be gone on reload.
                </span>
              </div>
              <div
                className={`sql-dropzone${importSqliteDragging ? " dragging" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setImportSqliteDragging(true);
                }}
                onDragLeave={() => setImportSqliteDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setImportSqliteDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const buf = ev.target?.result as ArrayBuffer | null;
                    if (!buf) return;
                    performImportSqlite(new Uint8Array(buf), file.name);
                  };
                  reader.readAsArrayBuffer(file);
                }}
              >
                <Upload
                  size={28}
                  className="sql-dropzone-icon"
                  aria-hidden="true"
                />
                <span>Drop a SQLite file here</span>
                <span className="sql-dropzone-hint">
                  or click to browse — .sqlite, .db
                </span>
                <input
                  type="file"
                  accept=".sqlite,.db,.sqlite3"
                  aria-label="Choose SQLite file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const buf = ev.target?.result as ArrayBuffer | null;
                      if (!buf) return;
                      performImportSqlite(new Uint8Array(buf), file.name);
                    };
                    reader.readAsArrayBuffer(file);
                    // Reset the input so the same file can be re-selected.
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="confirm-actions" style={{ marginTop: 16 }}>
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        {/* ── Rename Database dialog ── */}
        <Dialog.Root
          open={renameDbOpen}
          onOpenChange={(next) => {
            if (!next) setRenameDbOpen(false);
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop" />
            <Dialog.Popup className="confirm-popup sql-rename-db-popup">
              <Dialog.Title className="confirm-title">
                Rename Database
              </Dialog.Title>
              <Dialog.Description className="confirm-desc">
                Choose a new filename for the current database.
              </Dialog.Description>
              <div className="sql-rename-db-form">
                <div className="sql-rename-db-name-row">
                  <input
                    className="sql-rename-input sql-rename-db-name-input"
                    value={renameDbBaseName}
                    onChange={(e) => setRenameDbBaseName(e.target.value)}
                    placeholder="database name"
                    aria-label="Database name"
                    autoFocus
                  />
                  <select
                    className="sql-rename-db-ext-select"
                    value={renameDbExt}
                    onChange={(e) => setRenameDbExt(e.target.value)}
                    aria-label="File extension"
                  >
                    <option value=".sqlite">.sqlite (most common)</option>
                    <option value=".db">.db</option>
                    <option value=".sqlite3">.sqlite3</option>
                    <option value=".db3">.db3</option>
                  </select>
                </div>
              </div>
              <div className="confirm-actions">
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                <button
                  type="button"
                  className="confirm-btn confirm-btn-primary"
                  disabled={!renameDbBaseName.trim()}
                  onClick={() => {
                    const newFilename = `${renameDbBaseName.trim()}${renameDbExt}`;
                    setCustomFilenames((prev) => ({
                      ...prev,
                      [activeDbId]: newFilename,
                    }));
                    if (customDb?.id === activeDbId) {
                      setCustomDb((prev) =>
                        prev ? { ...prev, filename: newFilename } : prev,
                      );
                    }
                    showToast(`Renamed to "${newFilename}".`);
                    setRenameDbOpen(false);
                  }}
                >
                  Rename
                </button>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        {/* ── Import CSV dialog ── */}
        <Dialog.Root
          open={importCsvOpen}
          onOpenChange={(next) => {
            if (!next) {
              setImportCsvOpen(false);
              setImportCsvState(null);
              setImportCsvDragging(false);
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop" />
            <Dialog.Popup className="confirm-popup sql-import-popup">
              <Dialog.Title className="confirm-title">
                Import CSV File
              </Dialog.Title>
              <Dialog.Description className="confirm-desc">
                Parse a CSV file and import its rows into a new or existing
                table.
              </Dialog.Description>
              <div className="sql-import-warning">
                <TriangleAlert
                  size={14}
                  className="sql-import-warning-icon"
                  aria-hidden="true"
                />
                <span>
                  This is a playground — your data is only held in browser
                  memory and will not be persisted on reload.
                </span>
              </div>
              {!importCsvState ? (
                <div
                  className={`sql-dropzone${importCsvDragging ? " dragging" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setImportCsvDragging(true);
                  }}
                  onDragLeave={() => setImportCsvDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setImportCsvDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleCsvFile(file);
                  }}
                >
                  <FileText
                    size={28}
                    className="sql-dropzone-icon"
                    aria-hidden="true"
                  />
                  <span>Drop a CSV file here</span>
                  <span className="sql-dropzone-hint">
                    or click to browse — .csv
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    aria-label="Choose CSV file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCsvFile(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              ) : (
                <>
                  <div className="sql-import-target-row">
                    <div className="sql-import-mode-btns">
                      <button
                        type="button"
                        className={`sql-import-mode-btn${importCsvState.targetMode === "new" ? " active" : ""}`}
                        onClick={() =>
                          setImportCsvState((prev) =>
                            prev ? { ...prev, targetMode: "new" } : null,
                          )
                        }
                      >
                        New table
                      </button>
                      <button
                        type="button"
                        className={`sql-import-mode-btn${importCsvState.targetMode === "existing" ? " active" : ""}`}
                        disabled={tables.length === 0}
                        onClick={() =>
                          setImportCsvState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  targetMode: "existing",
                                  targetTable: prev.targetTable || tables[0] || "",
                                }
                              : null,
                          )
                        }
                      >
                        Existing table
                      </button>
                    </div>
                    {importCsvState.targetMode === "new" ? (
                      <input
                        id="csv-table-name"
                        className="sql-rename-input"
                        value={importCsvState.tableName}
                        onChange={(e) =>
                          setImportCsvState((prev) =>
                            prev ? { ...prev, tableName: e.target.value } : null,
                          )
                        }
                        placeholder="Table name"
                        autoFocus
                      />
                    ) : (
                      <select
                        className="pragma-select"
                        value={importCsvState.targetTable}
                        onChange={(e) =>
                          setImportCsvState((prev) =>
                            prev
                              ? { ...prev, targetTable: e.target.value }
                              : null,
                          )
                        }
                        autoFocus
                      >
                        {tables.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="sql-import-preview">
                    <table>
                      <thead>
                        <tr>
                          {importCsvState.headers.map((h) => (
                            <th key={h}>{h || "(empty)"}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importCsvState.rows.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            {row.map((cell, j) => (
                              <td key={j}>{cell || <em>NULL</em>}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-dim)",
                      marginBottom: 8,
                    }}
                  >
                    {importCsvState.rows.length} row
                    {importCsvState.rows.length === 1 ? "" : "s"} ·{" "}
                    {importCsvState.headers.length} column
                    {importCsvState.headers.length === 1 ? "" : "s"}
                    {importCsvState.rows.length > 5 && ` · showing first 5`}
                  </div>
                </>
              )}
              <div className="confirm-actions" style={{ marginTop: 16 }}>
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                {importCsvState && (
                  <button
                    type="button"
                    className="confirm-btn confirm-btn-primary"
                    onClick={submitCsvImport}
                  >
                    Import
                  </button>
                )}
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        {/* ── Import JSON dialog ── */}
        <Dialog.Root
          open={importJsonOpen}
          onOpenChange={(next) => {
            if (!next) {
              setImportJsonOpen(false);
              setImportJsonState(null);
              setImportJsonDragging(false);
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop" />
            <Dialog.Popup className="confirm-popup sql-import-popup">
              <Dialog.Title className="confirm-title">
                Import JSON File
              </Dialog.Title>
              <Dialog.Description className="confirm-desc">
                Parse a JSON array of objects and import its rows into a new
                or existing table.
              </Dialog.Description>
              <div className="sql-import-warning">
                <TriangleAlert
                  size={14}
                  className="sql-import-warning-icon"
                  aria-hidden="true"
                />
                <span>
                  This is a playground — your data is only held in browser
                  memory and will not be persisted on reload.
                </span>
              </div>
              {!importJsonState ? (
                <div
                  className={`sql-dropzone${importJsonDragging ? " dragging" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setImportJsonDragging(true);
                  }}
                  onDragLeave={() => setImportJsonDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setImportJsonDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleJsonFile(file);
                  }}
                >
                  <FileJson
                    size={28}
                    className="sql-dropzone-icon"
                    aria-hidden="true"
                  />
                  <span>Drop a JSON file here</span>
                  <span className="sql-dropzone-hint">
                    or click to browse — .json (array of objects)
                  </span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    aria-label="Choose JSON file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleJsonFile(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              ) : (
                <>
                  <div className="sql-import-target-row">
                    <div className="sql-import-mode-btns">
                      <button
                        type="button"
                        className={`sql-import-mode-btn${importJsonState.targetMode === "new" ? " active" : ""}`}
                        onClick={() =>
                          setImportJsonState((prev) =>
                            prev ? { ...prev, targetMode: "new" } : null,
                          )
                        }
                      >
                        New table
                      </button>
                      <button
                        type="button"
                        className={`sql-import-mode-btn${importJsonState.targetMode === "existing" ? " active" : ""}`}
                        disabled={tables.length === 0}
                        onClick={() =>
                          setImportJsonState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  targetMode: "existing",
                                  targetTable: prev.targetTable || tables[0] || "",
                                }
                              : null,
                          )
                        }
                      >
                        Existing table
                      </button>
                    </div>
                    {importJsonState.targetMode === "new" ? (
                      <input
                        id="json-table-name"
                        className="sql-rename-input"
                        value={importJsonState.tableName}
                        onChange={(e) =>
                          setImportJsonState((prev) =>
                            prev ? { ...prev, tableName: e.target.value } : null,
                          )
                        }
                        placeholder="Table name"
                        autoFocus
                      />
                    ) : (
                      <select
                        className="pragma-select"
                        value={importJsonState.targetTable}
                        onChange={(e) =>
                          setImportJsonState((prev) =>
                            prev
                              ? { ...prev, targetTable: e.target.value }
                              : null,
                          )
                        }
                        autoFocus
                      >
                        {tables.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="sql-import-preview">
                    <table>
                      <thead>
                        <tr>
                          {importJsonState.headers.map((h) => (
                            <th key={h}>{h || "(empty)"}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importJsonState.rows.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            {row.map((cell, j) => (
                              <td key={j}>{cell || <em>NULL</em>}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-dim)",
                      marginBottom: 8,
                    }}
                  >
                    {importJsonState.rows.length} row
                    {importJsonState.rows.length === 1 ? "" : "s"} ·{" "}
                    {importJsonState.headers.length} column
                    {importJsonState.headers.length === 1 ? "" : "s"}
                    {importJsonState.rows.length > 5 && ` · showing first 5`}
                  </div>
                </>
              )}
              <div className="confirm-actions" style={{ marginTop: 16 }}>
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                {importJsonState && (
                  <button
                    type="button"
                    className="confirm-btn confirm-btn-primary"
                    onClick={submitJsonImport}
                  >
                    Import
                  </button>
                )}
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        {/* ── Import Parquet dialog ── */}
        <Dialog.Root
          open={importParquetOpen}
          onOpenChange={(next) => {
            if (!next) {
              setImportParquetOpen(false);
              setImportParquetDragging(false);
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop" />
            <Dialog.Popup className="confirm-popup sql-import-popup">
              <Dialog.Title className="confirm-title">
                Import Parquet File
              </Dialog.Title>
              <Dialog.Description className="confirm-desc">
                Read a Parquet file and add its rows as a new table. Column
                types are inferred from the file schema.
              </Dialog.Description>
              <div className="sql-import-warning">
                <TriangleAlert
                  size={14}
                  className="sql-import-warning-icon"
                  aria-hidden="true"
                />
                <span>
                  This is a playground — your data is only held in browser
                  memory and will not be persisted on reload.
                </span>
              </div>
              <div
                className={`sql-dropzone${importParquetDragging ? " dragging" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setImportParquetDragging(true);
                }}
                onDragLeave={() => setImportParquetDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setImportParquetDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleParquetFile(file);
                }}
              >
                <Database
                  size={28}
                  className="sql-dropzone-icon"
                  aria-hidden="true"
                />
                <span>Drop a Parquet file here</span>
                <span className="sql-dropzone-hint">
                  or click to browse — .parquet
                </span>
                <input
                  type="file"
                  accept=".parquet,application/octet-stream"
                  aria-label="Choose Parquet file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleParquetFile(file);
                      setImportParquetOpen(false);
                    }
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="confirm-actions" style={{ marginTop: 16 }}>
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        <Dialog.Root
          open={ddlDialog !== null}
          onOpenChange={(next) => {
            if (!next) setDdlDialog(null);
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop" />
            <Dialog.Popup className="confirm-popup sql-ddl-popup">
              <Dialog.Title className="confirm-title">
                DDL: {ddlDialog?.title ?? ""}
              </Dialog.Title>
              <Dialog.Description className="confirm-desc">
                Read-only view of the original <code>CREATE</code> statement(s)
                recorded in
                <code> sqlite_master</code>.
              </Dialog.Description>
              <DdlViewer
                sql={ddlDialog?.sql ?? ""}
                theme={editorTheme}
              />
              <div className="confirm-actions">
                <button
                  type="button"
                  className="confirm-btn confirm-btn-secondary"
                  onClick={() => {
                    if (
                      ddlDialog &&
                      typeof navigator !== "undefined" &&
                      navigator.clipboard
                    ) {
                      navigator.clipboard
                        .writeText(ddlDialog.sql)
                        .then(() => showToast("Copied DDL to clipboard."))
                        .catch(() =>
                          showToast("Couldn't copy to clipboard.", "warn"),
                        );
                    }
                  }}
                >
                  Copy
                </button>
                <Dialog.Close className="confirm-btn confirm-btn-primary">
                  Close
                </Dialog.Close>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        <Dialog.Root
          open={modifyDialog !== null}
          onOpenChange={(next) => {
            if (!next) {
              setModifyDialog(null);
              setModifyInvalidColIds(new Set());
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop sql-modify-backdrop" />
            <Dialog.Popup className="sql-modify-drawer">
              <header className="sql-modify-drawer-header">
                <div className="sql-modify-drawer-heading">
                  <Dialog.Title className="sql-modify-drawer-title">
                    View structure
                  </Dialog.Title>
                  <Dialog.Description className="sql-modify-drawer-subtitle">
                    {modifyDialog?.originalName ?? ""}
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  className="sql-modify-drawer-close"
                  aria-label="Close"
                >
                  <X size={16} aria-hidden="true" />
                </Dialog.Close>
              </header>
              {modifyDialog && (
                <ModifyStructureForm
                  state={modifyDialog}
                  onChange={(next) => {
                    setModifyDialog(next);
                    if (modifyInvalidColIds.size > 0) {
                      setModifyInvalidColIds((prev) => {
                        const updated = new Set(prev);
                        for (const col of next.columns) {
                          if (col.name.trim()) updated.delete(col.id);
                        }
                        return updated;
                      });
                    }
                  }}
                  invalidColumnIds={modifyInvalidColIds}
                  knownTables={tables}
                  engine={engineForRender}
                  onDropLeaf={dropLeafEntity}
                  theme={editorTheme}
                />
              )}
              <footer className="sql-modify-drawer-footer">
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                <button
                  type="button"
                  className="confirm-btn confirm-btn-primary"
                  onClick={submitModifyStructure}
                  disabled={!modifyDialog}
                >
                  Save
                </button>
              </footer>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        {/* ── Add Row drawer ── */}
        <Dialog.Root
          open={addRowDialog !== null}
          onOpenChange={(next) => {
            if (!next) setAddRowDialog(null);
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop sql-modify-backdrop" />
            <Dialog.Popup className="sql-modify-drawer">
              <header className="sql-modify-drawer-header">
                <div className="sql-modify-drawer-heading">
                  <Dialog.Title className="sql-modify-drawer-title">
                    Add Row
                  </Dialog.Title>
                  <Dialog.Description className="sql-modify-drawer-subtitle">
                    {addRowDialog?.tableName ?? ""}
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  className="sql-modify-drawer-close"
                  aria-label="Close"
                >
                  <X size={16} aria-hidden="true" />
                </Dialog.Close>
              </header>
              {addRowDialog && (
                <div className="sql-modify-body">
                  <div className="sql-add-row-fields">
                    {addRowDialog.columns.map((c) => (
                      <label key={c.name} className="sql-add-row-field">
                        <span className="sql-add-row-field-label">
                          <span className="sql-add-row-field-name">
                            {c.name}
                          </span>
                          <span className="sql-add-row-field-type">
                            {c.type || "—"}
                          </span>
                        </span>
                        <input
                          className="sql-rename-input"
                          value={addRowDialog.values[c.name] ?? ""}
                          onChange={(e) =>
                            setAddRowDialog((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    values: {
                                      ...prev.values,
                                      [c.name]: e.target.value,
                                    },
                                  }
                                : null,
                            )
                          }
                          placeholder={c.notNull ? "required" : "NULL if empty"}
                          aria-label={c.name}
                        />
                      </label>
                    ))}
                  </div>
                  <label className="sql-add-row-another">
                    <input
                      type="checkbox"
                      checked={addRowDialog.addAnother}
                      onChange={(e) =>
                        setAddRowDialog((prev) =>
                          prev
                            ? { ...prev, addAnother: e.target.checked }
                            : null,
                        )
                      }
                    />
                    Keep open to add another row
                  </label>
                </div>
              )}
              <footer className="sql-modify-drawer-footer">
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                <button
                  type="button"
                  className="confirm-btn confirm-btn-primary"
                  onClick={submitAddRow}
                  disabled={!addRowDialog}
                >
                  Add Row
                </button>
              </footer>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        {/* ── Add Table drawer ── */}
        <Dialog.Root
          open={addTableDialog !== null}
          onOpenChange={(next) => {
            if (!next) {
              setAddTableDialog(null);
              setAddTableInvalidColIds(new Set());
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop sql-modify-backdrop" />
            <Dialog.Popup className="sql-modify-drawer">
              <header className="sql-modify-drawer-header">
                <div className="sql-modify-drawer-heading">
                  <Dialog.Title className="sql-modify-drawer-title">
                    Add Table
                  </Dialog.Title>
                  <Dialog.Description className="sql-modify-drawer-subtitle">
                    Create a new table
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  className="sql-modify-drawer-close"
                  aria-label="Close"
                >
                  <X size={16} aria-hidden="true" />
                </Dialog.Close>
              </header>
              {addTableDialog && (
                <ModifyStructureForm
                  state={addTableDialog}
                  onChange={(next) => {
                    setAddTableDialog(next);
                    if (addTableInvalidColIds.size > 0) {
                      setAddTableInvalidColIds((prev) => {
                        const updated = new Set(prev);
                        for (const col of next.columns) {
                          if (col.name.trim()) updated.delete(col.id);
                        }
                        return updated;
                      });
                    }
                  }}
                  invalidColumnIds={addTableInvalidColIds}
                  knownTables={tables}
                  engine={engineForRender}
                />
              )}
              <footer className="sql-modify-drawer-footer">
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                <button
                  type="button"
                  className="confirm-btn confirm-btn-primary"
                  onClick={submitAddTable}
                  disabled={!addTableDialog}
                >
                  Create Table
                </button>
              </footer>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        <div className="sql-shell" ref={shellRef}>
          <aside className="sql-sidebar" aria-label="Database explorer">
            <div className="sql-db-selector-wrap">
              <div className="sql-db-selector-row">
                <Select.Root
                  value={activeDbId}
                  onValueChange={(value) => {
                    if (value === "__new_db__") {
                      performBlankLoad();
                      return;
                    }
                    if (value === "__import_sqlite__") {
                      setImportSqliteOpen(true);
                      return;
                    }
                    if (value === "__rename_db__") {
                      // Pre-populate with current filename (strip extension).
                      const cur = activeSample.filename;
                      const dotIdx = cur.lastIndexOf(".");
                      if (dotIdx > 0) {
                        setRenameDbBaseName(cur.slice(0, dotIdx));
                        const ext = cur.slice(dotIdx);
                        const knownExts = [".sqlite", ".db", ".sqlite3", ".db3"];
                        setRenameDbExt(knownExts.includes(ext) ? ext : ".sqlite");
                      } else {
                        setRenameDbBaseName(cur);
                        setRenameDbExt(".sqlite");
                      }
                      setRenameDbOpen(true);
                      return;
                    }
                    requestDbSwitch(String(value));
                  }}
                >
                  <Select.Trigger
                    className="sql-db-selector"
                    aria-label="Select sample database"
                  >
                    <Database
                      size={14}
                      className="sql-db-selector-icon"
                      aria-hidden="true"
                    />
                    <Select.Value className="sql-db-selector-value">
                      {activeSample.filename}
                    </Select.Value>
                    <Select.Icon className="playground-switcher-icon">
                      <svg viewBox="0 0 12 12" width={10} height={10}>
                        <polyline
                          points="2,4 6,8 10,4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner
                      className="sql-db-positioner"
                      sideOffset={6}
                      alignItemWithTrigger={false}
                    >
                      <Select.Popup className="bui-select-popup sql-db-popup">
                        <Select.Item
                          value="__new_db__"
                          className="bui-select-item sql-db-item"
                        >
                          <span
                            className="bui-select-item-icon"
                            aria-hidden="true"
                          >
                            <FilePlus size={14} />
                          </span>
                          <span className="sql-db-item-text">
                            <Select.ItemText>New Database</Select.ItemText>
                            <span className="sql-db-item-desc">
                              Create a blank database
                            </span>
                          </span>
                        </Select.Item>
                        <Select.Item
                          value="__import_sqlite__"
                          className="bui-select-item sql-db-item"
                        >
                          <span
                            className="bui-select-item-icon"
                            aria-hidden="true"
                          >
                            <Upload size={14} />
                          </span>
                          <span className="sql-db-item-text">
                            <Select.ItemText>
                              Import SQLite File
                            </Select.ItemText>
                            <span className="sql-db-item-desc">
                              Open a .sqlite or .db file
                            </span>
                          </span>
                        </Select.Item>
                        <Select.Item
                          value="__rename_db__"
                          className="bui-select-item sql-db-item"
                        >
                          <span
                            className="bui-select-item-icon"
                            aria-hidden="true"
                          >
                            <Pencil size={14} />
                          </span>
                          <span className="sql-db-item-text">
                            <Select.ItemText>
                              Rename Current Database
                            </Select.ItemText>
                            <span className="sql-db-item-desc">
                              Change filename and extension
                            </span>
                          </span>
                        </Select.Item>
                        <div
                          role="separator"
                          aria-orientation="horizontal"
                          className="sql-db-popup-sep"
                        />
                        <div className="sql-db-popup-group-label">
                          Sample databases
                        </div>
                        {SQLITE_SAMPLE_DATABASES.map((s) => (
                          <Select.Item
                            key={s.id}
                            value={s.id}
                            className="bui-select-item sql-db-item"
                          >
                            <span
                              className="bui-select-item-icon"
                              aria-hidden="true"
                            >
                              <Database size={14} />
                            </span>
                            <span className="sql-db-item-text">
                              <Select.ItemText>{s.filename}</Select.ItemText>
                              <span className="sql-db-item-desc">
                                {s.description}
                              </span>
                            </span>
                          </Select.Item>
                        ))}
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select.Root>
              </div>
            </div>

            <div className="sql-tree">
              <SchemaSection
                label="TABLES"
                count={tables.length}
                expanded={tablesSectionExpanded}
                onToggle={() => setTablesSectionExpanded((v) => !v)}
                emptyMessage="No tables."
                onAdd={openAddTable}
                allExpanded={
                  tables.length > 0 &&
                  tables.every((n) => expandedEntities.has(n))
                }
                onExpandAll={() => {
                  setTablesSectionExpanded(true);
                  expandAllEntities(tables);
                }}
                onCollapseAll={() => {
                  setTablesSectionExpanded(false);
                  collapseAllEntities(tables);
                }}
              >
                {tables.map((name) => (
                  <SchemaItem
                    key={`t-${name}`}
                    name={name}
                    kind="table"
                    expanded={expandedEntities.has(name)}
                    columns={columnsByEntity[name]}
                    foreignKeys={foreignKeysByEntity[name]}
                    onToggleExpanded={toggleEntityExpanded}
                    onPreview={previewTable}
                    onModifyStructure={openModifyStructure}
                    onAddRow={openAddRow}
                    onCount={countEntityRows}
                    onCopy={copyEntityName}
                    onTruncate={truncateEntity}
                    onDrop={dropEntity}
                    onViewDDL={viewDDL}
                    onExport={exportEntityToFormat}
                    onGetRowCount={getEntityRowCount}
                  />
                ))}
              </SchemaSection>
              <SchemaSection
                label="VIEWS"
                count={views.length}
                expanded={viewsSectionExpanded}
                onToggle={() => setViewsSectionExpanded((v) => !v)}
                emptyMessage="No views."
                allExpanded={
                  views.length > 0 &&
                  views.every((n) => expandedEntities.has(n))
                }
                onExpandAll={() => {
                  setViewsSectionExpanded(true);
                  expandAllEntities(views);
                }}
                onCollapseAll={() => {
                  setViewsSectionExpanded(false);
                  collapseAllEntities(views);
                }}
              >
                {views.map((name) => (
                  <SchemaItem
                    key={`v-${name}`}
                    name={name}
                    kind="view"
                    expanded={expandedEntities.has(name)}
                    columns={columnsByEntity[name]}
                    foreignKeys={foreignKeysByEntity[name]}
                    onToggleExpanded={toggleEntityExpanded}
                    onPreview={previewTable}
                    onStructure={describeEntity}
                    onCount={countEntityRows}
                    onCopy={copyEntityName}
                    onDrop={dropEntity}
                    onViewDDL={viewDDL}
                    onExport={exportEntityToFormat}
                    onGetRowCount={getEntityRowCount}
                  />
                ))}
              </SchemaSection>
              <SchemaSection
                label="INDEXES"
                count={indexes.length}
                expanded={indexesSectionExpanded}
                onToggle={() => setIndexesSectionExpanded((v) => !v)}
                emptyMessage="No indexes."
              >
                {indexes.map((name) => (
                  <SchemaLeafItem
                    key={`i-${name}`}
                    name={name}
                    kind="index"
                    onCopy={copyEntityName}
                    onViewDDL={viewLeafDDL}
                    onDrop={dropLeafEntity}
                  />
                ))}
              </SchemaSection>
              <SchemaSection
                label="TRIGGERS"
                count={triggers.length}
                expanded={triggersSectionExpanded}
                onToggle={() => setTriggersSectionExpanded((v) => !v)}
                emptyMessage="No triggers."
              >
                {triggers.map((name) => (
                  <SchemaLeafItem
                    key={`tr-${name}`}
                    name={name}
                    kind="trigger"
                    onCopy={copyEntityName}
                    onViewDDL={viewLeafDDL}
                    onDrop={dropLeafEntity}
                  />
                ))}
              </SchemaSection>
            </div>

            <div className="sql-sidebar-footer">
              <button
                type="button"
                className="sql-er-btn"
                onClick={openErDiagramTab}
                title="View ER Diagram"
                aria-label="View ER Diagram"
              >
                <Network size={13} aria-hidden="true" />
                <span>ER Diagram</span>
              </button>
            </div>
          </aside>

          <div
            className="sql-sidebar-resizer"
            ref={sidebarResizerRef}
            role="separator"
            aria-orientation="vertical"
            aria-label="Drag to resize tables panel"
            title="Drag to resize"
          />

          <div
            className={`sql-panes${activeTab?.kind === "view-data" ? " sql-panes--view-data" : ""}${activeTab?.kind === "er-diagram" ? " sql-panes--er-diagram" : ""}`}
            ref={panesRef}
          >
            <div className="sql-tabbar">
              <DndContext
                sensors={tabDragSensors}
                collisionDetection={closestCenter}
                onDragStart={handleTabDragStart}
                onDragEnd={handleTabDragEnd}
              >
                <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
                  <div className="sql-tabs" role="tablist">
                    {tabs.map((t) => (
                      <SqlTab
                        key={t.id}
                        tab={t}
                        active={t.id === activeTabId}
                        onActivate={() => {
                          const prevId = activeTabIdRef.current;
                          activeTabIdRef.current = t.id;
                          setActiveTabId(t.id);
                          // When the user re-clicks the already-active tab the
                          // useEffect that focuses the editor won't re-run
                          // (activeTabId hasn't changed).  Focus it explicitly
                          // so typing works immediately without a second click.
                          if (
                            prevId === t.id &&
                            t.kind !== "er-diagram" &&
                            t.kind !== "view-data"
                          ) {
                            editorRef.current?.focus();
                          }
                        }}
                        onClose={() => closeTab(t.id)}
                        onRename={(name) => renameTab(t.id, name)}
                        onDuplicate={() => duplicateTab(t.id)}
                        onCloseOthers={() => closeOtherTabs(t.id)}
                        onCloseAll={closeAllTabs}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              {/* The "new tab" (+) button sits outside the scrollable
                  .sql-tabs container so it remains pinned at the right
                  edge of the tab bar when tabs overflow horizontally.
                  When the strip isn't full it naturally appears next
                  to the last tab because both are flex children of
                  .sql-tabbar. */}
              <button
                type="button"
                className="sql-tab-add"
                onClick={addTab}
                title="New query tab"
                aria-label="New query tab"
              >
                <Plus size={12} aria-hidden="true" />
              </button>
            </div>

            <div className="sql-editor-pane" ref={editorPaneRef} style={activeTab?.kind === "view-data" || activeTab?.kind === "er-diagram" ? { display: "none" } : undefined}>
              <div className="editor-wrap" ref={editorHostRef} />
              {result && statusState !== "running" && (
                <div
                  className={`sql-editor-elapsed${result.error ? " sql-editor-elapsed-err" : ""}`}
                  title="Last execution time"
                  aria-label="Last execution time"
                >
                  <Clock size={11} aria-hidden="true" />
                  <span>{(result.elapsedMs / 1000).toFixed(3)}s</span>
                </div>
              )}
              <div className="sql-toolbar">
                <div className="sql-toolbar-shortcuts">
                  <span
                    className="kbd-group"
                    title={isMac ? "Cmd + Enter — run selection or all" : "Ctrl + Enter — run selection or all"}
                  >
                    <kbd className="kbd">{isMac ? "⌘" : "Ctrl"}</kbd>
                    <span className="kbd-plus" aria-hidden="true">
                      +
                    </span>
                    <kbd className="kbd">Enter</kbd>
                  </span>
                </div>
                {hasEditorSelection ? (
                  <div className={`run-btn-split${statusState === "running" ? " running" : ""}`}>
                    <button
                      type="button"
                      className="run-btn-split-main"
                      disabled={!loaded || statusState === "running"}
                      onClick={runCurrentSelection}
                    >
                      {statusState === "running" ? (
                        <svg viewBox="0 0 12 12" className="run-btn-spinner">
                          <circle
                            cx="6"
                            cy="6"
                            r="4.5"
                            fill="none"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeDasharray="14 8"
                          />
                        </svg>
                      ) : (
                        <Play size={10} aria-hidden="true" />
                      )}
                      {statusState === "running" ? "Running…" : "Run Selection"}
                    </button>
                    <span className="run-btn-split-divider" aria-hidden="true" />
                    <Menu.Root>
                      <Menu.Trigger
                        className="run-btn-split-chevron"
                        disabled={!loaded || statusState === "running"}
                        aria-label="Run options"
                      >
                        <ChevronDown size={11} aria-hidden="true" />
                      </Menu.Trigger>
                      <Menu.Portal>
                        <Menu.Positioner sideOffset={6} align="end">
                          <Menu.Popup className="bui-popup run-split-dropdown">
                            <Menu.Item
                              className="run-split-item"
                              onClick={runCurrentSelection}
                              disabled={!loaded || statusState === "running"}
                            >
                              <span className="run-split-item-label">Run Selection</span>
                              <span className="run-split-item-kbd">{isMac ? "⌘Enter" : "Ctrl+Enter"}</span>
                            </Menu.Item>
                            <Menu.Item
                              className="run-split-item"
                              onClick={runActiveTab}
                              disabled={!loaded || statusState === "running"}
                            >
                              <span className="run-split-item-label">Run All</span>
                              <span className="run-split-item-kbd">{isMac ? "⌘⇧Enter" : "Ctrl+Shift+Enter"}</span>
                            </Menu.Item>
                          </Menu.Popup>
                        </Menu.Positioner>
                      </Menu.Portal>
                    </Menu.Root>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`run-btn${statusState === "running" ? " running" : ""}`}
                    disabled={!loaded || statusState === "running"}
                    onClick={runActiveTab}
                  >
                    {statusState === "running" ? (
                      <svg viewBox="0 0 12 12" className="run-btn-spinner">
                        <circle
                          cx="6"
                          cy="6"
                          r="4.5"
                          fill="none"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeDasharray="14 8"
                        />
                      </svg>
                    ) : (
                      <Play size={10} aria-hidden="true" />
                    )}
                    {statusState === "running" ? "Running…" : "Run"}
                  </button>
                )}
              </div>
            </div>

            <div
              className="sql-resizer"
              ref={resizerRef}
              role="separator"
              aria-orientation="horizontal"
              aria-label="Drag to resize editor and results"
              title="Drag to resize"
              style={activeTab?.kind === "view-data" || activeTab?.kind === "er-diagram" ? { display: "none" } : undefined}
            />

            <div className="sql-results-pane" ref={resultsPaneRef} style={activeTab?.kind === "er-diagram" ? { display: "none" } : undefined}>
              <div className="sql-results-body">
                <ResultView
                  result={result}
                  loading={!loaded}
                  keyHints={resultKeyHints}
                  sourceTable={result?.sourceTable}
                  constraintInfo={resultConstraintInfo}
                  onDeleteRows={deleteRowsFromTable}
                  onUpdateRows={updateRowsInTable}
                  onDuplicateRow={duplicateRowInTable}
                  globalPageSize={globalPageSize}
                  onSetGlobalPageSize={setGlobalPageSize}
                  onLoadPage={handleLoadPage}
                  onExportSnapshotChange={setResultSetExportSnapshot}
                  onExportResultSet={handleResultSetExport}
                />
              </div>
              <DataslopeRunOverlay running={statusState === "running"} />
            </div>

            {activeTab?.kind === "er-diagram" && (
              <div className="sql-er-pane">
                <ErDiagramPane
                  tables={tables}
                  columnsByEntity={columnsByEntity}
                  foreignKeysByEntity={foreignKeysByEntity}
                  isDark={!LIGHT_THEMES.has(editorTheme)}
                  onPreview={previewTable}
                  onModifyStructure={openModifyStructure}
                  onAddRow={openAddRow}
                  onCount={countEntityRows}
                  onCopy={copyEntityName}
                  onTruncate={truncateEntity}
                  onDrop={dropEntity}
                  onViewDDL={viewDDL}
                  onExport={exportEntityToFormat}
                  onGetRowCount={getEntityRowCount}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Result comparison — used to decide whether the fade animation should play.
// The animation is only shown when the new result is identical to the previous
// one (same columns, same rows, same values in the same order), so a rerun
// of a query that returns the same data provides visual feedback that the
// query actually ran without the table appearing to "jump".
// ────────────────────────────────────────────────────────────────────────────

function sqlValueEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  // Uint8Array BLOBs: compare byte by byte
  if (a instanceof Uint8Array && b instanceof Uint8Array) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  return false;
}

function queryResultsIdentical(
  a: QueryRunResult | null,
  b: QueryRunResult | null,
): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  if (a.sets.length !== b.sets.length) return false;
  for (let i = 0; i < a.sets.length; i++) {
    const sa = a.sets[i];
    const sb = b.sets[i];
    if (sa.columns.length !== sb.columns.length) return false;
    if (!sa.columns.every((col, j) => col === sb.columns[j])) return false;
    if (sa.values.length !== sb.values.length) return false;
    for (let r = 0; r < sa.values.length; r++) {
      const ra = sa.values[r];
      const rb = sb.values[r];
      if (ra.length !== rb.length) return false;
      for (let c = 0; c < ra.length; c++) {
        if (!sqlValueEqual(ra[c], rb[c])) return false;
      }
    }
  }
  return true;
}

function ResultView({
  result,
  loading,
  keyHints,
  sourceTable,
  constraintInfo,
  onDeleteRows,
  onUpdateRows,
  onDuplicateRow,
  globalPageSize,
  onSetGlobalPageSize,
  onLoadPage,
  onExportSnapshotChange,
  onExportResultSet,
}: {
  result: QueryRunResult | null;
  loading: boolean;
  keyHints?: ColumnKeyHints;
  sourceTable?: string;
  constraintInfo?: ColumnConstraintInfo[];
  onDeleteRows?: (
    tableName: string,
    pkColumns: string[],
    pkRows: ReadonlyArray<ReadonlyArray<unknown>>,
  ) => void;
  onUpdateRows?: (
    tableName: string,
    updates: ReadonlyArray<{
      rowIndex: number;
      column: string;
      value: unknown;
    }>,
  ) => void;
  onDuplicateRow?: (
    tableName: string,
    columnNames: string[],
    values: unknown[],
  ) => void;
  /** Current page size (shared globally, lifted from this component). */
  globalPageSize: number;
  /** Setter for globalPageSize — persists to localStorage and updates the ref. */
  onSetGlobalPageSize: (n: number) => void;
  /** Called when the user navigates to a different page in lazy mode. */
  onLoadPage: (sql: string, page: number) => void;
  /** Reports the first result set's currently visible page for export scope. */
  onExportSnapshotChange?: (snapshot: ResultSetExportSnapshot | null) => void;
  /** Called when the user triggers a result-set export from the pager. */
  onExportResultSet?: (format: "csv" | "json" | "sql" | "parquet" | "xlsx", scope: ResultSetExportScope) => void;
}) {
  // Export scope — page vs all rows. Local to ResultView, surfaced by the
  // export button in the pager. Defaults to "all".
  const [resultSetExportScope, setResultSetExportScope] =
    useState<ResultSetExportScope>("all");
  // Pagination state lives at the ResultView level (one record per
  // result-set index) so the pagers can be rendered in a footer that
  // sits *outside* the horizontally/vertically scrolling content.
  // Without this lift the pagination bar would scroll with the table —
  // the very behaviour Updates 1 and 2 ask us to remove.
  //
  // The page *size* is global (shared across all result sets, tabs and
  // databases), lifted to SqlPlaygroundInner and persisted to localStorage
  // there. Only the current *page* number is tracked per result-set index
  // for non-lazy results; lazy results store the page on the result object.
  const [pageStates, setPageStates] = useState<Record<number, { page: number }>>(
    {},
  );
  // Column-sorting state per result-set index. Lifted from ResultTableBody
  // so sorting can be applied to the entire result set (not just the
  // current page) and so page navigation in lazy mode can append ORDER BY.
  const [sortingByIndex, setSortingByIndex] = useState<
    Record<number, SortingState>
  >({});
  // Selection state — set of *absolute* row indices into `set.values`
  // (not page-local) so selections survive page navigation. Keyed by
  // result-set index. Only populated for sets that are deletable.
  const [selectedByIndex, setSelectedByIndex] =
    useState<SelectedRowsByResult>({});
  // Per-result-set pending cell edits. Key is `${absoluteRow}:${colIdx}`,
  // value is the new value the user typed. Keyed by result-set index so
  // each set tracks its edits independently.
  const [pendingEditsByIndex, setPendingEditsByIndex] =
    useState<PendingEditsByResult>({});
  // Whether a cell within a given result set is currently being actively
  // edited (i.e. the user has double-clicked it). We track the "active
  // editing cell" key per set so we can blur it on commit.
  const [activeEditCellByIndex, setActiveEditCellByIndex] = useState<
    Record<number, string | null>
  >({});
  // Pending delete confirmation — captures the set index whose
  // selected rows are about to be deleted. `null` means the dialog is
  // closed.
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  // Single-row delete from context menu — tracks which row is pending
  // confirmation. Separate from `pendingDelete` (multi-row) so the two
  // flows don't interfere.
  const [pendingDeleteSingleRow, setPendingDeleteSingleRow] = useState<{
    setIdx: number;
    absoluteRow: number;
  } | null>(null);
  // Update/delete actions re-run the preview and produce a fresh result
  // object. Populate this ref immediately before those callbacks so the
  // result-reset effect can carry over unrelated unsaved UI state once,
  // then clear it for ordinary query runs.
  const preserveOnNextResultRef = useRef<{
    selectedByIndex: SelectedRowsByResult;
    pendingEditsByIndex: PendingEditsByResult;
  } | null>(null);

  // Active result-set tab index for multi-set results.
  const [activeSetIdx, setActiveSetIdx] = useState<number>(0);
  // Ref to the flash wrapper div — used to replay the CSS animation on
  // each new result without unmounting the component tree.
  const flashWrapperRef = useRef<HTMLDivElement>(null);
  // Tracks the previous result so we can compare data identity before
  // deciding whether to play the fade animation.
  const prevResultRef = useRef<QueryRunResult | null>(null);

  // Reset pagination + transient actions whenever a new result lands.
  // Table-edit actions refresh the result in place, so they can opt into
  // preserving the unsaved state that belongs to the other action.
  // Identity-comparing against the result object is sufficient because
  // `setResult` always creates a new object.
  useEffect(() => {
    const preserved = preserveOnNextResultRef.current;
    preserveOnNextResultRef.current = null;
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setPageStates({});
    setSelectedByIndex(preserved?.selectedByIndex ?? {});
    setPendingDelete(null);
    setPendingDeleteSingleRow(null);
    setPendingEditsByIndex(preserved?.pendingEditsByIndex ?? {});
    setActiveEditCellByIndex({});
    setActiveSetIdx(0);
    // Only replay the fade animation when the new result data is identical to
    // the previous one (same columns, rows, and values in the same order).
    // For a genuinely different result the table content changes visibly, so
    // the animation would be distracting rather than informative.
    const el = flashWrapperRef.current;
    if (el) {
      const identical = queryResultsIdentical(result, prevResultRef.current);
      prevResultRef.current = result;
      el.classList.remove("sql-result-flash-anim");
      if (identical && result !== null) {
        void el.offsetWidth; // force reflow — resets animation timeline
        el.classList.add("sql-result-flash-anim");
      }
    } else {
      prevResultRef.current = result;
    }
  }, [result]);

  const getState = useCallback(
    (idx: number) => pageStates[idx] ?? { page: 0 },
    [pageStates],
  );

  const setPage = useCallback((idx: number, page: number) => {
    setPageStates((prev) => {
      const cur = prev[idx] ?? { page: 0 };
      return { ...prev, [idx]: { ...cur, page } };
    });
  }, []);

  // Per-set deletability check. Requires a single-table preview with
  // all PK columns present (needed to identify which rows to DELETE).
  const pkColumnsForSet = useCallback(
    (set: QueryExecResult): string[] | null => {
      if (!sourceTable || !onDeleteRows) return null;
      const pk = keyHints?.pk;
      if (!pk || pk.size === 0) return null;
      const ordered: string[] = [];
      for (const col of set.columns) {
        if (pk.has(col)) ordered.push(col);
      }
      // Need every PK column present in the result.
      if (ordered.length !== pk.size) return null;
      return ordered;
    },
    [sourceTable, onDeleteRows, keyHints],
  );

  // A set is editable whenever we have a source table and an update
  // handler. No PK is required — rows are identified by row index.
  const isEditable = !!(sourceTable && onUpdateRows);

  const toggleRowSelected = useCallback(
    (setIdx: number, absoluteRow: number) => {
      setSelectedByIndex((prev) => {
        const cur = new Set(prev[setIdx] ?? []);
        if (cur.has(absoluteRow)) cur.delete(absoluteRow);
        else cur.add(absoluteRow);
        return { ...prev, [setIdx]: cur };
      });
    },
    [],
  );

  const setVisibleSelection = useCallback(
    (setIdx: number, visibleAbsoluteIndices: number[], select: boolean) => {
      setSelectedByIndex((prev) => {
        const cur = new Set(prev[setIdx] ?? []);
        if (select) {
          for (const i of visibleAbsoluteIndices) cur.add(i);
        } else {
          for (const i of visibleAbsoluteIndices) cur.delete(i);
        }
        return { ...prev, [setIdx]: cur };
      });
    },
    [],
  );

  const setPendingEdit = useCallback(
    (setIdx: number, cellKey: string, value: unknown) => {
      setPendingEditsByIndex((prev) => {
        const cur = new Map(prev[setIdx] ?? []);
        cur.set(cellKey, value);
        return { ...prev, [setIdx]: cur };
      });
    },
    [],
  );

  const clearPendingEdit = useCallback(
    (setIdx: number, cellKey: string) => {
      setPendingEditsByIndex((prev) => {
        const cur = new Map(prev[setIdx] ?? []);
        cur.delete(cellKey);
        if (cur.size === 0) {
          const next = { ...prev };
          delete next[setIdx];
          return next;
        }
        return { ...prev, [setIdx]: cur };
      });
    },
    [],
  );

  const setActiveEditCell = useCallback(
    (setIdx: number, cellKey: string | null) => {
      setActiveEditCellByIndex((prev) => ({ ...prev, [setIdx]: cellKey }));
    },
    [],
  );

  const commitEdits = useCallback(
    (setIdx: number, set: QueryExecResult) => {
      if (!sourceTable || !onUpdateRows) return;
      const edits = pendingEditsByIndex[setIdx];
      if (!edits || edits.size === 0) return;
      const updates: Array<{
        rowIndex: number;
        column: string;
        value: unknown;
      }> = [];
      for (const [cellKey, value] of edits) {
        const [rowStr, colStr] = cellKey.split(":");
        const absoluteRow = Number(rowStr);
        const colIdx = Number(colStr);
        const colName = set.columns[colIdx];
        if (!colName) continue;
        updates.push({ rowIndex: absoluteRow, column: colName, value });
      }
      if (updates.length === 0) return;
      const nextPendingEdits = clonePendingEdits(pendingEditsByIndex);
      delete nextPendingEdits[setIdx];
      preserveOnNextResultRef.current = {
        selectedByIndex: cloneSelections(selectedByIndex),
        pendingEditsByIndex: nextPendingEdits,
      };
      // Clear committed edits before calling the callback so the result
      // refresh starts with a clean slate for only the committed cells.
      setPendingEditsByIndex(nextPendingEdits);
      setActiveEditCellByIndex((prev) => ({ ...prev, [setIdx]: null }));
      onUpdateRows(sourceTable, updates);
    },
    [
      sourceTable,
      onUpdateRows,
      pendingEditsByIndex,
      selectedByIndex,
    ],
  );

  const requestDelete = useCallback((setIdx: number) => {
    setPendingDelete(setIdx);
  }, []);

  const performDelete = useCallback(() => {
    if (pendingDelete === null || !result || !sourceTable || !onDeleteRows) {
      setPendingDelete(null);
      return;
    }
    const set = result.sets[pendingDelete];
    if (!set) {
      setPendingDelete(null);
      return;
    }
    const pkCols = pkColumnsForSet(set);
    if (!pkCols || pkCols.length === 0) {
      setPendingDelete(null);
      return;
    }
    const pkColIndexes = pkCols.map((c) => set.columns.indexOf(c));
    const selected = selectedByIndex[pendingDelete];
    if (!selected || selected.size === 0) {
      setPendingDelete(null);
      return;
    }
    // In lazy mode, set.values holds only the current page, so absolute
    // row indices must be adjusted by the page offset before indexing.
    // Use the page size stored on the result (not the current global setting)
    // so the calculation is correct even if the user changed the page size
    // between loading the result and triggering the delete.
    const lazyOffset =
      result.lazySql !== undefined && result.lazyPage !== undefined
        ? result.lazyPage * (result.lazyPageSize ?? globalPageSize)
        : 0;
    const pkRows: unknown[][] = [];
    for (const rowIdx of selected) {
      const row = set.values[rowIdx - lazyOffset];
      if (!row) continue;
      pkRows.push(pkColIndexes.map((ci) => row[ci]));
    }
    const selectedRows = new Set(selected);
    const nextSelectedByIndex = cloneSelections(selectedByIndex);
    delete nextSelectedByIndex[pendingDelete];
    const nextPendingEdits = pendingEditsAfterDeletedRows(
      pendingEditsByIndex,
      pendingDelete,
      selectedRows,
    );
    preserveOnNextResultRef.current = {
      selectedByIndex: nextSelectedByIndex,
      pendingEditsByIndex: nextPendingEdits,
    };
    setPendingDelete(null);
    setSelectedByIndex(nextSelectedByIndex);
    setPendingEditsByIndex(nextPendingEdits);
    onDeleteRows(sourceTable, pkCols, pkRows);
  }, [
    pendingDelete,
    globalPageSize,
    pendingEditsByIndex,
    result,
    sourceTable,
    onDeleteRows,
    pkColumnsForSet,
    selectedByIndex,
  ]);

  // Single-row delete from the context menu. Shows a confirmation
  // dialog; on confirm, extracts PK values for that row and calls
  // `onDeleteRows` with a single-element `pkRows` array.
  const requestDeleteSingleRow = useCallback(
    (setIdx: number, absoluteRow: number) => {
      setPendingDeleteSingleRow({ setIdx, absoluteRow });
    },
    [],
  );

  const performDeleteSingleRow = useCallback(() => {
    if (
      pendingDeleteSingleRow === null ||
      !result ||
      !sourceTable ||
      !onDeleteRows
    ) {
      setPendingDeleteSingleRow(null);
      return;
    }
    const { setIdx, absoluteRow } = pendingDeleteSingleRow;
    const set = result.sets[setIdx];
    if (!set) {
      setPendingDeleteSingleRow(null);
      return;
    }
    const pkCols = pkColumnsForSet(set);
    if (!pkCols || pkCols.length === 0) {
      setPendingDeleteSingleRow(null);
      return;
    }
    // In lazy mode, set.values holds only the current page's rows; adjust
    // the absolute row index by the page offset before indexing into it.
    // Use the page size stored on the result (not the current global setting)
    // to remain correct even if the user changed the page size setting after
    // loading this result.
    const lazyOffset =
      result.lazySql !== undefined && result.lazyPage !== undefined
        ? result.lazyPage * (result.lazyPageSize ?? globalPageSize)
        : 0;
    const row = set.values[absoluteRow - lazyOffset];
    if (!row) {
      setPendingDeleteSingleRow(null);
      return;
    }
    const pkColIndexes = pkCols.map((c) => set.columns.indexOf(c));
    const pkValues = pkColIndexes.map((ci) => row[ci]);
    const deletedRows = new Set([absoluteRow]);
    const nextPendingEdits = pendingEditsAfterDeletedRows(
      pendingEditsByIndex,
      setIdx,
      deletedRows,
    );
    preserveOnNextResultRef.current = {
      selectedByIndex: cloneSelections(selectedByIndex),
      pendingEditsByIndex: nextPendingEdits,
    };
    setPendingDeleteSingleRow(null);
    setPendingEditsByIndex(nextPendingEdits);
    onDeleteRows(sourceTable, pkCols, [pkValues]);
  }, [
    pendingDeleteSingleRow,
    globalPageSize,
    pendingEditsByIndex,
    result,
    sourceTable,
    onDeleteRows,
    pkColumnsForSet,
    selectedByIndex,
  ]);

  useEffect(() => {
    if (!onExportSnapshotChange) return;
    if (!result || result.error || result.sets.length === 0) {
      onExportSnapshotChange(null);
      return;
    }
    const setIndex = Math.max(0, Math.min(activeSetIdx, result.sets.length - 1));
    const set = result.sets[setIndex];
    if (!set) {
      onExportSnapshotChange(null);
      return;
    }
    const isLazy = result.lazySql !== undefined && setIndex === 0;
    const effective =
      globalPageSize > 0
        ? globalPageSize
        : Math.max(
            isLazy ? (result.lazyTotalCount ?? set.values.length) : set.values.length,
            1,
          );
    if (isLazy) {
      onExportSnapshotChange({
        setIndex,
        columns: set.columns,
        allRows: set.values,
        rows: set.values,
        totalRows: result.lazyTotalCount ?? set.values.length,
        pageSize: effective,
        currentPage: result.lazyPage ?? 0,
      });
      return;
    }
    const sorting = sortingByIndex[setIndex] ?? [];
    const st = getState(setIndex);
    let rows = set.values;
    if (sorting.length > 0) {
      const parsed = parseColumnId(sorting[0].id);
      if (parsed) {
        rows = [...set.values].sort((a, b) => {
          const cmp = compareCellValues(a[parsed.ci], b[parsed.ci]);
          return sorting[0].desc ? -cmp : cmp;
        });
      }
    }
    const totalRows = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / effective));
    const currentPage = Math.min(st.page, totalPages - 1);
    const start = currentPage * effective;
    const visibleRows =
      globalPageSize > 0 ? rows.slice(start, start + effective) : rows;
    onExportSnapshotChange({
      setIndex,
      columns: set.columns,
      allRows: rows,
      rows: visibleRows,
      totalRows,
      pageSize: effective,
      currentPage,
    });
  }, [
    result,
    globalPageSize,
    activeSetIdx,
    sortingByIndex,
    getState,
    onExportSnapshotChange,
  ]);

  if (loading) {
    return (
      <div className="welcome">
        <div className="welcome-icon">⌬</div>
        <h3>Loading SQLite engine…</h3>
      </div>
    );
  }
  if (!result) {
    return (
      <div className="welcome">
        <div className="welcome-icon">⌬</div>
        <h3>Run a query to see results</h3>
        <p>
          Press <kbd className="kbd">Run</kbd> or use the keyboard shortcut to
          execute the active tab. Double-click any table or view in the sidebar to open
          it in a new tab.
        </p>
      </div>
    );
  }
  if (result.error) {
    const hint = getSqliteErrorHint(result.error);
    return (
      <div className="sql-result-error">
        <div className="sql-result-error-title">Query failed</div>
        <pre className="sql-result-error-body">{result.error}</pre>
        {hint && <div className="sql-result-error-hint">{hint}</div>}
      </div>
    );
  }
  if (result.sets.length === 0) {
    return (
      <div className="sql-result-ok">
        Statement executed successfully — no rows returned.
      </div>
    );
  }
  const pendingCount =
    pendingDelete !== null ? (selectedByIndex[pendingDelete]?.size ?? 0) : 0;

  // Clamp activeSetIdx in case a new result has fewer sets.
  const safeSetIdx = Math.max(0, Math.min(activeSetIdx, result.sets.length - 1));

  // ── Compute rendering data for the currently-visible result set ──
  const computeSetRenderData = (idx: number) => {
    const set = result.sets[idx];
    if (!set) return null;
    const isLazy = result.lazySql !== undefined && idx === 0;
    const sorting = sortingByIndex[idx] ?? [];
    let totalRows: number;
    let currentPage: number;
    let startIdx: number;
    let visibleRows: QueryExecResult["values"];
    let originalIndices: number[];
    if (isLazy) {
      const effective =
        globalPageSize > 0
          ? globalPageSize
          : Math.max(result.lazyTotalCount ?? 0, 1);
      totalRows = result.lazyTotalCount ?? set.values.length;
      currentPage = result.lazyPage ?? 0;
      startIdx = currentPage * effective;
      visibleRows = set.values;
      originalIndices = set.values.map((_, ri) => startIdx + ri);
    } else {
      const st = getState(idx);
      totalRows = set.values.length;
      const effective =
        globalPageSize > 0 ? globalPageSize : Math.max(totalRows, 1);
      const totalPages = Math.max(1, Math.ceil(totalRows / effective));
      currentPage = Math.min(st.page, totalPages - 1);
      startIdx = currentPage * effective;
      const indexed = set.values.map((values, i) => ({
        values,
        originalIndex: i,
      }));
      let sortedIndexed = indexed;
      if (sorting.length > 0) {
        const parsed = parseColumnId(sorting[0].id);
        if (parsed) {
          sortedIndexed = [...indexed].sort((a, b) => {
            const cmp = compareCellValues(
              a.values[parsed.ci],
              b.values[parsed.ci],
            );
            return sorting[0].desc ? -cmp : cmp;
          });
        }
      }
      const visibleIndexed =
        globalPageSize > 0
          ? sortedIndexed.slice(startIdx, startIdx + effective)
          : sortedIndexed;
      visibleRows = visibleIndexed.map((item) => item.values);
      originalIndices = visibleIndexed.map((item) => item.originalIndex);
    }
    return { set, isLazy, sorting, totalRows, currentPage, startIdx, visibleRows, originalIndices };
  };

  const activeSetData = computeSetRenderData(safeSetIdx);

  return (
    <>
      {result.sets.length > 1 && (
        <div className="sql-result-set-tabs" role="tablist" aria-label="Result sets">
          {result.sets.map((_, idx) => (
            <button
              key={idx}
              type="button"
              role="tab"
              aria-selected={safeSetIdx === idx}
              aria-label={`Result set ${idx + 1} of ${result.sets.length}`}
              className={`sql-result-set-tab${safeSetIdx === idx ? " active" : ""}`}
              onClick={() => setActiveSetIdx(idx)}
            >
              Set {idx + 1}
            </button>
          ))}
        </div>
      )}
      <div ref={flashWrapperRef} className="sql-result-flash-wrapper sql-result-flash-anim">
        <div className="sql-result-sets">
          {activeSetData && (() => {
            const idx = safeSetIdx;
            const { set, isLazy, sorting, visibleRows, originalIndices } = activeSetData;
            const pkCols = pkColumnsForSet(set);
            const selected = selectedByIndex[idx];
            const pendingEdits = pendingEditsByIndex[idx];
            const handleSortingChange = (
              newSorting: SortingState | ((old: SortingState) => SortingState),
            ) => {
              const resolved =
                typeof newSorting === "function"
                  ? newSorting(sorting)
                  : newSorting;
              setSortingByIndex((prev) => ({ ...prev, [idx]: resolved }));
              setPageStates((prev) => ({ ...prev, [idx]: { page: 0 } }));
              if (isLazy) {
                const baseSql = result.lazyBaseSql ?? result.lazySql ?? "";
                if (resolved.length > 0) {
                  const parsed = parseColumnId(resolved[0].id);
                  if (parsed) {
                    const sortedSql = `${baseSql} ORDER BY ${quoteIdentSql(parsed.name)} ${resolved[0].desc ? "DESC" : "ASC"}`;
                    onLoadPage(sortedSql, 0);
                  }
                } else {
                  onLoadPage(baseSql, 0);
                }
              }
            };
            return (
              <ResultTableBody
                key={idx}
                set={set}
                visible={visibleRows}
                originalIndices={originalIndices}
                sorting={sorting}
                onSortingChange={handleSortingChange}
                keyHints={keyHints}
                deletable={pkCols !== null}
                editable={isEditable}
                sourceTable={sourceTable}
                constraintInfo={constraintInfo}
                selectedRows={selected}
                pendingEdits={pendingEdits}
                activeEditCell={activeEditCellByIndex[idx] ?? null}
                onToggleRow={(absoluteRow) => toggleRowSelected(idx, absoluteRow)}
                onToggleVisible={(absoluteIndices, select) =>
                  setVisibleSelection(idx, absoluteIndices, select)
                }
                onSetPendingEdit={(cellKey, value) =>
                  setPendingEdit(idx, cellKey, value)
                }
                onClearPendingEdit={(cellKey) =>
                  clearPendingEdit(idx, cellKey)
                }
                onSetActiveEditCell={(cellKey) =>
                  setActiveEditCell(idx, cellKey)
                }
                onDeleteSingleRow={
                  pkCols !== null
                    ? (absoluteRow) =>
                        requestDeleteSingleRow(idx, absoluteRow)
                    : undefined
                }
                onDuplicateRow={
                  sourceTable && onDuplicateRow
                    ? (columnNames, values) =>
                        onDuplicateRow(sourceTable, columnNames, values)
                    : undefined
                }
              />
            );
          })()}
        </div>
      </div>
      <div className="sql-result-pagers">
        {activeSetData && (() => {
          const idx = safeSetIdx;
          const { set, isLazy, sorting, totalRows, currentPage } = activeSetData;
          let handlePageChange: (p: number) => void;
          let handlePageSizeChange: (s: number) => void;
          if (isLazy) {
            const baseSql = result.lazyBaseSql ?? result.lazySql ?? "";
            let effectiveLazySql = baseSql;
            if (sorting.length > 0) {
              const parsed = parseColumnId(sorting[0].id);
              if (parsed) {
                effectiveLazySql = `${baseSql} ORDER BY ${quoteIdentSql(parsed.name)} ${sorting[0].desc ? "DESC" : "ASC"}`;
              }
            }
            handlePageChange = (p: number) => onLoadPage(effectiveLazySql, p);
            handlePageSizeChange = (s: number) => {
              onSetGlobalPageSize(s);
              onLoadPage(effectiveLazySql, 0);
            };
          } else {
            handlePageChange = (p: number) => setPage(idx, p);
            handlePageSizeChange = (s: number) => {
              onSetGlobalPageSize(s);
              setPage(idx, 0);
            };
          }
          const pkCols = pkColumnsForSet(set);
          const selected = selectedByIndex[idx];
          const selectedCount = selected?.size ?? 0;
          const pendingEdits = pendingEditsByIndex[idx];
          const editCount = pendingEdits?.size ?? 0;
          // Compute paging info needed for the scope selector in the export menu.
          const effectivePageSize = globalPageSize > 0 ? globalPageSize : Math.max(totalRows, 1);
          const hasMultiplePages = globalPageSize > 0 && totalRows > effectivePageSize;
          const safePage = Math.min(currentPage, Math.max(0, Math.ceil(totalRows / effectivePageSize) - 1));
          const pageStart = safePage * effectivePageSize;
          const currentPageRows = Math.min(totalRows - pageStart, effectivePageSize);
          return (
            <>
              <ResultPager
                key={idx}
                totalRows={totalRows}
                index={idx}
                showSetLabel={false}
                pageSize={globalPageSize}
                page={currentPage}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                deletable={pkCols !== null}
                editable={isEditable}
                editCount={editCount}
                selectedCount={selectedCount}
                onRequestDelete={() => requestDelete(idx)}
                // eslint-disable-next-line react-hooks/refs
                onCommitEdits={() => commitEdits(idx, set)}
              >
                {onExportResultSet && (
                  <Menu.Root>
                    <Menu.Trigger
                      className="sql-result-export-btn"
                      title="Export result set"
                      aria-label="Export result set"
                    >
                      <ArrowDownToLine size={13} aria-hidden="true" />
                    </Menu.Trigger>
                    <Menu.Portal>
                      <Menu.Positioner sideOffset={6} align="end" side="top">
                        <Menu.Popup className="bui-popup examples-dropdown export-dropdown">
                          {hasMultiplePages && (
                            <div className="sql-result-export-scope-options">
                              <label
                                className="sql-result-export-scope-option"
                                data-checked={resultSetExportScope === "page" ? "" : undefined}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  className="scope-radio-input"
                                  type="radio"
                                  name="sql-result-export-scope-pager"
                                  checked={resultSetExportScope === "page"}
                                  onChange={() => setResultSetExportScope("page")}
                                />
                                <span className="scope-radio-ring">
                                  {resultSetExportScope === "page" && (
                                    <span className="scope-radio-dot" />
                                  )}
                                </span>
                                <span>Current page ({currentPageRows} rows)</span>
                              </label>
                              <label
                                className="sql-result-export-scope-option"
                                data-checked={resultSetExportScope === "all" ? "" : undefined}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  className="scope-radio-input"
                                  type="radio"
                                  name="sql-result-export-scope-pager"
                                  checked={resultSetExportScope === "all"}
                                  onChange={() => setResultSetExportScope("all")}
                                />
                                <span className="scope-radio-ring">
                                  {resultSetExportScope === "all" && (
                                    <span className="scope-radio-dot" />
                                  )}
                                </span>
                                <span>All rows ({totalRows.toLocaleString()})</span>
                              </label>
                            </div>
                          )}
                          <Menu.Item
                            className="example-item export-item"
                            onClick={() => onExportResultSet("csv", resultSetExportScope)}
                          >
                            <div className="export-item-text">
                              <div className="ex-title">CSV <span className="ext-badge">.csv</span></div>
                              <div className="ex-desc">Comma-separated values</div>
                            </div>
                          </Menu.Item>
                          <Menu.Item
                            className="example-item export-item"
                            onClick={() => onExportResultSet("json", resultSetExportScope)}
                          >
                            <div className="export-item-text">
                              <div className="ex-title">JSON <span className="ext-badge">.json</span></div>
                              <div className="ex-desc">Array of row objects</div>
                            </div>
                          </Menu.Item>
                          <Menu.Item
                            className="example-item export-item"
                            onClick={() => onExportResultSet("sql", resultSetExportScope)}
                          >
                            <div className="export-item-text">
                              <div className="ex-title">SQL <span className="ext-badge">.sql</span></div>
                              <div className="ex-desc">INSERT statements</div>
                            </div>
                          </Menu.Item>
                          <Menu.Item
                            className="example-item export-item"
                            onClick={() => onExportResultSet("parquet", resultSetExportScope)}
                          >
                            <div className="export-item-text">
                              <div className="ex-title">Parquet <span className="ext-badge">.parquet</span></div>
                              <div className="ex-desc">Apache Parquet binary</div>
                            </div>
                          </Menu.Item>
                          <Menu.Item
                            className="example-item export-item"
                            onClick={() => onExportResultSet("xlsx", resultSetExportScope)}
                          >
                            <div className="export-item-text">
                              <div className="ex-title">Excel <span className="ext-badge">.xlsx</span></div>
                              <div className="ex-desc">Excel workbook (single sheet)</div>
                            </div>
                          </Menu.Item>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                )}
              </ResultPager>
            </>
          );
        })()}
      </div>
      <AlertDialog.Root
        open={pendingDelete !== null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="confirm-backdrop" />
          <AlertDialog.Popup className="confirm-popup">
            <AlertDialog.Title className="confirm-title">
              Delete {pendingCount} row{pendingCount === 1 ? "" : "s"}?
            </AlertDialog.Title>
            <AlertDialog.Description className="confirm-desc">
              {pendingCount} row{pendingCount === 1 ? "" : "s"} will be
              permanently deleted from{" "}
              <strong>{sourceTable ?? "this table"}</strong>. The change is
              in-memory only and will be undone next page load, but cannot be
              reversed within this session.
            </AlertDialog.Description>
            <div className="confirm-actions">
              <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
                Cancel
              </AlertDialog.Close>
              <AlertDialog.Close
                className="confirm-btn confirm-btn-danger"
                onClick={performDelete}
              >
                Delete row{pendingCount === 1 ? "" : "s"}
              </AlertDialog.Close>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      <AlertDialog.Root
        open={pendingDeleteSingleRow !== null}
        onOpenChange={(next) => {
          if (!next) setPendingDeleteSingleRow(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="confirm-backdrop" />
          <AlertDialog.Popup className="confirm-popup">
            <AlertDialog.Title className="confirm-title">
              Delete this row?
            </AlertDialog.Title>
            <AlertDialog.Description className="confirm-desc">
              This row will be permanently deleted from{" "}
              <strong>{sourceTable ?? "this table"}</strong>. The change is
              in-memory only and will be undone next page load, but cannot be
              reversed within this session.
            </AlertDialog.Description>
            <div className="confirm-actions">
              <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
                Cancel
              </AlertDialog.Close>
              <AlertDialog.Close
                className="confirm-btn confirm-btn-danger"
                onClick={performDeleteSingleRow}
              >
                Delete row
              </AlertDialog.Close>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}

function ResultTableBody({
  set,
  visible,
  originalIndices,
  sorting,
  onSortingChange,
  keyHints,
  deletable,
  editable,
  sourceTable,
  constraintInfo,
  selectedRows,
  pendingEdits,
  activeEditCell,
  onToggleRow,
  onToggleVisible,
  onSetPendingEdit,
  onClearPendingEdit,
  onSetActiveEditCell,
  onDeleteSingleRow,
  onDuplicateRow,
}: {
  set: QueryExecResult;
  visible: QueryExecResult["values"];
  originalIndices: number[];
  sorting: SortingState;
  onSortingChange: (updater: SortingState | ((old: SortingState) => SortingState)) => void;
  keyHints?: ColumnKeyHints;
  deletable: boolean;
  editable: boolean;
  sourceTable?: string;
  constraintInfo?: ColumnConstraintInfo[];
  selectedRows?: Set<number>;
  pendingEdits?: Map<string, unknown>;
  activeEditCell: string | null;
  onToggleRow: (absoluteRow: number) => void;
  onToggleVisible: (absoluteIndices: number[], select: boolean) => void;
  onSetPendingEdit: (cellKey: string, value: unknown) => void;
  onClearPendingEdit: (cellKey: string) => void;
  onSetActiveEditCell: (cellKey: string | null) => void;
  onDeleteSingleRow?: (absoluteRow: number) => void;
  onDuplicateRow?: (columnNames: string[], values: unknown[]) => void;
}) {
  // Tracks which cell was right-clicked so that `Copy cell value` in
  // the context menu knows which column to read. Updated via
  // onContextMenu on each <td> before the popup opens.
  const rightClickedCellRef = useRef<{
    colIdx: number;
    value: unknown;
  } | null>(null);

  // State for the "Edit in modal" dialog — tracks which cell is being
  // edited in the larger text-area modal.
  const [modalEditCell, setModalEditCell] = useState<{
    cellKey: string;
    colName: string;
    value: string;
  } | null>(null);

  // React Table may pass an updater function to onSortingChange (e.g.
  // from the toggle handler). We resolve it to the next state before
  // forwarding to the parent so the parent always receives a plain
  // SortingState object.
  const handleSortingChange = useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      onSortingChange(next);
    },
    [onSortingChange, sorting],
  );

  // Determine whether rows in this result set can be duplicated.
  // Duplication is possible when the only unique/PK constraints are
  // auto-increment (their value is auto-assigned by SQLite so the
  // column can be omitted from the INSERT). Any non-auto-increment PK
  // or explicit UNIQUE column prevents duplication because inserting a
  // copy would produce a duplicate value and violate the constraint.
  const { canDuplicate, uniqueConstraintReason } = useMemo(() => {
    if (!onDuplicateRow) {
      return { canDuplicate: false, uniqueConstraintReason: "" };
    }
    if (!constraintInfo || constraintInfo.length === 0) {
      // No constraint info yet (lazy-loaded) — optimistically allow.
      return { canDuplicate: true, uniqueConstraintReason: "" };
    }
    const blocking = constraintInfo.filter(
      (c) => (c.isPrimaryKey && !c.isAutoIncrement) || c.isUnique,
    );
    if (blocking.length > 0) {
      const names = blocking.map((c) => c.name).join(", ");
      return {
        canDuplicate: false,
        uniqueConstraintReason: `Column${blocking.length > 1 ? "s" : ""} with unique constraint${blocking.length > 1 ? "s" : ""}: ${names}`,
      };
    }
    return { canDuplicate: true, uniqueConstraintReason: "" };
  }, [onDuplicateRow, constraintInfo]);

  const allVisibleSelected =
    deletable &&
    originalIndices.length > 0 &&
    originalIndices.every((i) => selectedRows?.has(i));
  const someVisibleSelected =
    deletable &&
    !allVisibleSelected &&
    originalIndices.some((i) => selectedRows?.has(i));
  const data = useMemo<ResultTableRow[]>(
    () =>
      visible.map((values, ri) => ({
        absoluteRow: originalIndices[ri],
        values,
      })),
    [visible, originalIndices],
  );

  const columns = useMemo<ColumnDef<ResultTableRow>[]>(
    () => [
      ...(deletable
        ? [
            {
              id: "select",
              enableSorting: false,
              header: () => (
                <Checkbox.Root
                  className="sql-result-row-checkbox"
                  checked={allVisibleSelected}
                  indeterminate={someVisibleSelected}
                  onCheckedChange={(v) =>
                    onToggleVisible(originalIndices, v === true)
                  }
                  aria-label={
                    allVisibleSelected
                      ? "Deselect all visible rows"
                      : "Select all visible rows"
                  }
                >
                  <Checkbox.Indicator className="sql-result-row-checkbox-ind">
                    {allVisibleSelected ? "✓" : "–"}
                  </Checkbox.Indicator>
                </Checkbox.Root>
              ),
              cell: ({ row }: { row: { original: ResultTableRow } }) => {
                const absoluteRow = row.original.absoluteRow;
                const checked = selectedRows?.has(absoluteRow) ?? false;
                return (
                  <Checkbox.Root
                    className="sql-result-row-checkbox"
                    checked={checked}
                    onCheckedChange={() => onToggleRow(absoluteRow)}
                    aria-label={
                      checked
                        ? `Deselect row ${absoluteRow + 1}`
                        : `Select row ${absoluteRow + 1}`
                    }
                  >
                    <Checkbox.Indicator className="sql-result-row-checkbox-ind">
                      ✓
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                );
              },
            } satisfies ColumnDef<ResultTableRow>,
          ]
        : []),
      ...set.columns.map(
        (c, ci) =>
          ({
            id: `col-${ci}-${c}`,
            accessorFn: (row) => row.values[ci],
            // Store ci in meta so the td renderer can look it up without
            // fragile string-splitting on the column id.
            meta: { ci },
            header: ({ column }) => {
              const isPk = keyHints?.pk.has(c) ?? false;
              const fk = keyHints?.fk.get(c);
              const sorted = column.getIsSorted();
              const colType = inferColumnType(set.values, ci);
              return (
                <button
                  type="button"
                  className="sql-result-th-btn"
                  onClick={column.getToggleSortingHandler()}
                  title={
                    sorted === "asc"
                      ? "Sorted ascending — click to sort descending"
                      : sorted === "desc"
                        ? "Sorted descending — click to clear sort"
                        : "Click to sort ascending"
                  }
                >
                  <span className="sql-result-th-top">
                    <span className="sql-result-th-label">
                      {isPk && (
                        <Popover.Root>
                          <Popover.Trigger
                            openOnHover
                            delay={150}
                            closeDelay={100}
                            render={(triggerProps) => (
                              <span {...triggerProps} className="sql-result-th-key-trigger">
                                <MdOutlineKey
                                  size={12}
                                  className="sql-result-th-pk"
                                  aria-label="Primary key"
                                />
                              </span>
                            )}
                          />
                          <Popover.Portal>
                            <Popover.Positioner
                              sideOffset={6}
                              side="top"
                              className="sql-key-icon-popover-positioner"
                            >
                              <Popover.Popup className="bui-popup sql-key-icon-popover">
                                <MdOutlineKey size={11} className="sql-key-icon-popover-icon" aria-hidden="true" />
                                <span>Primary key</span>
                              </Popover.Popup>
                            </Popover.Positioner>
                          </Popover.Portal>
                        </Popover.Root>
                      )}
                      {fk && (
                        <Popover.Root>
                          <Popover.Trigger
                            openOnHover
                            delay={150}
                            closeDelay={100}
                            render={(triggerProps) => (
                              <span {...triggerProps} className="sql-result-th-key-trigger">
                                <IoLink
                                  size={12}
                                  className="sql-result-th-fk"
                                  aria-label={`Foreign key → ${fk.table}.${fk.to}`}
                                />
                              </span>
                            )}
                          />
                          <Popover.Portal>
                            <Popover.Positioner
                              sideOffset={6}
                              side="top"
                              className="sql-key-icon-popover-positioner"
                            >
                              <Popover.Popup className="bui-popup sql-key-icon-popover">
                                <IoLink size={12} className="sql-key-icon-popover-icon" aria-hidden="true" />
                                <span>Foreign key</span>
                              </Popover.Popup>
                            </Popover.Positioner>
                          </Popover.Portal>
                        </Popover.Root>
                      )}
                      <span>{c}</span>
                    </span>
                    <span
                      className={
                        sorted
                          ? "sql-result-th-chevron sql-result-th-chevron-active"
                          : "sql-result-th-chevron"
                      }
                      aria-hidden="true"
                    >
                      {sorted === "asc" ? (
                        <ChevronUp size={11} />
                      ) : (
                        <ChevronDown size={11} />
                      )}
                    </span>
                  </span>
                  <span className="sql-result-th-type">{colType}</span>
                </button>
              );
            },
            cell: (info) => {
              if (!editable) {
                return formatCellValue(info.getValue());
              }
              const absoluteRow = info.row.original.absoluteRow;
              const cellKey = `${absoluteRow}:${ci}`;
              const isActiveEdit = activeEditCell === cellKey;
              const hasPendingEdit = pendingEdits?.has(cellKey) ?? false;
              const pendingValue = pendingEdits?.get(cellKey);
              const rawValue = info.getValue();
              // Detect numeric affinity from the current cell value.
              const isNumeric =
                rawValue !== null && typeof rawValue === "number";
              if (isActiveEdit) {
                const editVal =
                  hasPendingEdit
                    ? String(pendingValue ?? "")
                    : formatCellValue(rawValue);
                return (
                  <input
                    className="sql-cell-input"
                    defaultValue={editVal}
                    autoFocus
                    type="text"
                    inputMode={isNumeric ? "decimal" : undefined}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const newVal = parseCellEditValue(raw, isNumeric);
                      // Only record a pending edit when the value actually
                      // differs from the original DB value. If the user
                      // reverted a previous edit back to the original, clear it.
                      if (newVal !== rawValue) {
                        onSetPendingEdit(cellKey, newVal);
                      } else if (hasPendingEdit) {
                        onClearPendingEdit(cellKey);
                      }
                    }}
                    onBlur={() => {
                      onSetActiveEditCell(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        (e.currentTarget as HTMLInputElement).blur();
                      } else if (e.key === "Escape") {
                        onSetActiveEditCell(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                  />
                );
              }
              return (
                <span
                  className={
                    hasPendingEdit
                      ? "sql-cell-edited"
                      : rawValue === null
                        ? "sql-cell-null"
                        : undefined
                  }
                  title={editable ? "Double-click to edit" : undefined}
                >
                  {hasPendingEdit
                    ? formatCellValue(pendingValue)
                    : formatCellValue(rawValue)}
                </span>
              );
            },
          }) satisfies ColumnDef<ResultTableRow>,
      ),
    ],
    [
      activeEditCell,
      allVisibleSelected,
      deletable,
      editable,
      keyHints,
      onClearPendingEdit,
      onSetActiveEditCell,
      onSetPendingEdit,
      onToggleRow,
      onToggleVisible,
      pendingEdits,
      selectedRows,
      set.columns,
      set.values,
      someVisibleSelected,
      originalIndices,
    ],
  );
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is required for stable result-table customization.
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
  });
  return (
    <div className="sql-result-set">
      <div className="sql-result-table-wrap">
        <table className="sql-result-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={
                      header.column.id === "select"
                        ? "sql-result-th-select"
                        : header.column.getIsSorted()
                          ? "sql-result-th-sorted"
                          : undefined
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const absoluteRow = row.original.absoluteRow;
              const rowValues = row.original.values;
              const checked = selectedRows?.has(absoluteRow) ?? false;
              const cells = row.getVisibleCells().map((cell) => {
                const isSelect = cell.column.id === "select";
                const rawVal = isSelect ? undefined : cell.getValue();
                // Retrieve the column index from the column's meta,
                // which is stored there at column-definition time to
                // avoid fragile string-splitting on the column id.
                const ci = isSelect
                  ? -1
                  : ((cell.column.columnDef.meta as { ci: number } | undefined)?.ci ?? -1);
                const cellKey = `${absoluteRow}:${ci}`;
                const hasPendingEdit =
                  !isSelect && ci >= 0 && (pendingEdits?.has(cellKey) ?? false);
                return (
                  <td
                    key={cell.id}
                    className={
                      isSelect
                        ? "sql-result-td-select"
                        : hasPendingEdit
                          ? "sql-cell-edited-td"
                          : rawVal === null
                            ? "sql-cell-null"
                            : undefined
                    }
                    onContextMenu={
                      !isSelect && ci >= 0
                        ? () => {
                            rightClickedCellRef.current = {
                              colIdx: ci,
                              value: rawVal,
                            };
                          }
                        : undefined
                    }
                    onDoubleClick={
                      editable && !isSelect && ci >= 0
                        ? () => onSetActiveEditCell(cellKey)
                        : undefined
                    }
                  >
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext(),
                    )}
                  </td>
                );
              });
              return (
                <ContextMenu.Root key={absoluteRow}>
                  <ContextMenu.Trigger
                    render={(props) => (
                      <tr
                        {...props}
                        className={
                          checked ? "sql-result-row-selected" : undefined
                        }
                      >
                        {cells}
                      </tr>
                    )}
                  />
                  <ContextMenu.Portal>
                    <ContextMenu.Positioner sideOffset={4}>
                      <ContextMenu.Popup className="bui-popup examples-dropdown sql-row-context-menu">
                        <ContextMenu.Item
                          className="example-item"
                          onClick={() => {
                            const cell = rightClickedCellRef.current;
                            const text =
                              cell !== null
                                ? formatCellValue(cell.value)
                                : "";
                            navigator.clipboard
                              .writeText(text)
                              .catch(() => undefined);
                          }}
                        >
                          <div className="ex-title">Copy cell value</div>
                        </ContextMenu.Item>
                        {editable && (
                          <ContextMenu.Item
                            className="example-item"
                            onClick={() => {
                              const cell = rightClickedCellRef.current;
                              if (cell === null || cell.colIdx < 0) return;
                              const colName = set.columns[cell.colIdx] ?? "";
                              const cellKey = `${absoluteRow}:${cell.colIdx}`;
                              const current = pendingEdits?.has(cellKey)
                                ? String(pendingEdits.get(cellKey) ?? "")
                                : formatCellValue(cell.value);
                              setModalEditCell({ cellKey, colName, value: current });
                            }}
                          >
                            <div className="ex-title">Edit cell in modal</div>
                          </ContextMenu.Item>
                        )}
                        <ContextMenu.Item
                          className="example-item"
                          onClick={() => {
                            const obj = Object.fromEntries(
                              set.columns.map((c, i) => [c, rowValues[i]]),
                            );
                            navigator.clipboard
                              .writeText(JSON.stringify(obj, null, 2))
                              .catch(() => undefined);
                          }}
                        >
                          <div className="ex-title">Copy row as JSON</div>
                        </ContextMenu.Item>
                        {sourceTable && (
                          <ContextMenu.Item
                            className="example-item"
                            onClick={() => {
                              const cols = set.columns
                                .map((c) => quoteIdentSql(c))
                                .join(", ");
                              const vals = rowValues
                                .map((v) => formatCellAsSql(v))
                                .join(", ");
                              const sql = `INSERT INTO ${quoteIdentSql(sourceTable)} (${cols}) VALUES (${vals});`;
                              navigator.clipboard
                                .writeText(sql)
                                .catch(() => undefined);
                            }}
                          >
                            <div className="ex-title">Copy row as SQL</div>
                          </ContextMenu.Item>
                        )}
                        {onDuplicateRow &&
                          (canDuplicate ? (
                            <ContextMenu.Item
                              className="example-item"
                              onClick={() => {
                                // Build the column/value list excluding
                                // auto-increment PK columns so SQLite
                                // assigns the next sequence value.
                                const autoIncCols = new Set(
                                  (constraintInfo ?? [])
                                    .filter((c) => c.isAutoIncrement)
                                    .map((c) => c.name),
                                );
                                const cols: string[] = [];
                                const vals: unknown[] = [];
                                set.columns.forEach((c, i) => {
                                  if (!autoIncCols.has(c)) {
                                    cols.push(c);
                                    vals.push(rowValues[i]);
                                  }
                                });
                                onDuplicateRow(cols, vals);
                              }}
                            >
                              <div className="ex-title">Duplicate row</div>
                            </ContextMenu.Item>
                          ) : (
                            <Popover.Root>
                              <Popover.Trigger
                                openOnHover
                                delay={200}
                                closeDelay={100}
                                className="example-item sql-ctx-disabled"
                                render={<div />}
                                aria-disabled="true"
                              >
                                <div className="ex-title">Duplicate row</div>
                              </Popover.Trigger>
                              <Popover.Portal>
                                <Popover.Positioner
                                  side="right"
                                  sideOffset={8}
                                >
                                  <Popover.Popup className="bui-popup sql-unique-popover">
                                    {uniqueConstraintReason ||
                                      "Cannot duplicate: unique constraint"}
                                  </Popover.Popup>
                                </Popover.Positioner>
                              </Popover.Portal>
                            </Popover.Root>
                          ))}
                        {onDeleteSingleRow && (
                          <ContextMenu.Item
                            className="example-item sql-ctx-danger"
                            onClick={() => onDeleteSingleRow(absoluteRow)}
                          >
                            <div className="ex-title">Delete row</div>
                          </ContextMenu.Item>
                        )}
                      </ContextMenu.Popup>
                    </ContextMenu.Positioner>
                  </ContextMenu.Portal>
                </ContextMenu.Root>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Edit-in-modal dialog */}
      <Dialog.Root open={modalEditCell !== null} onOpenChange={(open) => { if (!open) setModalEditCell(null); }}>
        <Dialog.Portal>
          <Dialog.Backdrop className="confirm-backdrop" />
          <Dialog.Popup className="confirm-popup sql-cell-modal-popup">
            <Dialog.Title className="confirm-title">
              Edit cell
            </Dialog.Title>
            {modalEditCell && (
              <Dialog.Description className="confirm-desc">
                Column: <strong>{modalEditCell.colName}</strong>
              </Dialog.Description>
            )}
            {modalEditCell && (
              <form
                className="sql-cell-modal-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  onSetPendingEdit(modalEditCell.cellKey, modalEditCell.value);
                  setModalEditCell(null);
                }}
              >
                <textarea
                  className="sql-cell-modal-textarea"
                  value={modalEditCell.value}
                  onChange={(e) => setModalEditCell({ ...modalEditCell, value: e.target.value })}
                  autoFocus
                  rows={8}
                />
                <div className="confirm-actions">
                  <Dialog.Close className="confirm-btn confirm-btn-secondary">
                    Cancel
                  </Dialog.Close>
                  <button type="submit" className="confirm-btn confirm-btn-primary">
                    Apply
                  </button>
                </div>
              </form>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function ResultPager({
  totalRows,
  index,
  showSetLabel,
  pageSize,
  page,
  onPageChange,
  onPageSizeChange,
  deletable,
  editable,
  editCount,
  selectedCount,
  onRequestDelete,
  onCommitEdits,
  children,
}: {
  /** Total number of rows across all pages. For lazy results this is the
   *  COUNT(*) from the engine; for non-lazy results it is set.values.length. */
  totalRows: number;
  index: number;
  showSetLabel: boolean;
  pageSize: number;
  page: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  deletable: boolean;
  editable: boolean;
  editCount: number;
  selectedCount: number;
  onRequestDelete: () => void;
  onCommitEdits: () => void;
  children?: React.ReactNode;
}) {
  const effective = pageSize > 0 ? pageSize : Math.max(totalRows, 1);
  const totalPages = Math.max(1, Math.ceil(totalRows / effective));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * effective;
  const end = Math.min(totalRows, start + effective);

  // Controlled input for direct page navigation.
  const [pageInput, setPageInput] = useState(String(safePage + 1));
  // Keep the input in sync when the page changes from outside (e.g. prev/next)
  // using the "derive state during render" pattern (avoids a cascading effect).
  const [prevSafePage, setPrevSafePage] = useState(safePage);
  if (prevSafePage !== safePage) {
    setPrevSafePage(safePage);
    setPageInput(String(safePage + 1));
  }

  const commitPageInput = () => {
    const n = parseInt(pageInput, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= totalPages) {
      onPageChange(n - 1);
    } else {
      setPageInput(String(safePage + 1));
    }
  };

  return (
    <div className="sql-result-pager">
      {showSetLabel && (
        <span className="sql-result-pager-set">Set #{index + 1}</span>
      )}
      <span className="sql-result-pager-info">
        {editable && editCount > 0 ? (
          <>
            {editCount} cell{editCount === 1 ? "" : "s"} edited
          </>
        ) : deletable && selectedCount > 0 ? (
          <>
            {selectedCount} row{selectedCount === 1 ? "" : "s"} selected
          </>
        ) : totalRows === 0 ? (
          "0 rows"
        ) : (
          <>
            Rows {start + 1}–{end} of{" "}
            <strong className="sql-result-pager-total">{totalRows}</strong>
          </>
        )}
      </span>
      {editable && editCount > 0 && (
        <button
          type="button"
          className="sql-edit-commit-btn"
          onClick={onCommitEdits}
        >
          Update {editCount} cell{editCount === 1 ? "" : "s"}…
        </button>
      )}
      {deletable && selectedCount > 0 && (
        <button
          type="button"
          className="sql-result-selection-delete"
          onClick={onRequestDelete}
        >
          <Trash2 size={12} aria-hidden="true" />
          <span>Delete selected</span>
        </button>
      )}
      <div className="sql-result-pager-size">
        <span>Rows per page</span>
        <Select.Root
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <Select.Trigger
            className="sql-result-pager-size-trigger"
            aria-label="Rows per page"
          >
            <Select.Value>
              {PAGE_SIZE_OPTIONS.find((opt) => opt.value === pageSize)?.label ??
                String(pageSize)}
            </Select.Value>
            <ChevronDown size={10} aria-hidden="true" />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner sideOffset={4} alignItemWithTrigger={false}>
              <Select.Popup className="bui-select-popup">
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <Select.Item
                    key={opt.value}
                    value={String(opt.value)}
                    className="bui-select-item"
                  >
                    <Select.ItemText>{opt.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </div>
      <div className="sql-result-pager-controls">
        {safePage > 0 && (
          <button
            type="button"
            className="sql-result-pager-btn"
            onClick={() => onPageChange(0)}
            aria-label="First page"
            title="First page"
          >
            <ChevronsLeft size={13} aria-hidden="true" />
          </button>
        )}
        {safePage > 0 && (
          <button
            type="button"
            className="sql-result-pager-btn"
            onClick={() => onPageChange(Math.max(0, safePage - 1))}
            aria-label="Previous page"
            title="Previous page"
          >
            <ChevronLeft size={13} aria-hidden="true" />
          </button>
        )}
        <span className="sql-result-pager-page">
          <input
            className="sql-result-pager-page-input"
            type="number"
            min={1}
            max={totalPages}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={commitPageInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitPageInput();
              else if (e.key === "Escape") setPageInput(String(safePage + 1));
            }}
            aria-label="Page number"
          />
          {" / "}{totalPages}
        </span>
        {safePage < totalPages - 1 && (
          <button
            type="button"
            className="sql-result-pager-btn"
            onClick={() => onPageChange(Math.min(totalPages - 1, safePage + 1))}
            aria-label="Next page"
            title="Next page"
          >
            <ChevronRight size={13} aria-hidden="true" />
          </button>
        )}
        {safePage < totalPages - 1 && (
          <button
            type="button"
            className="sql-result-pager-btn"
            onClick={() => onPageChange(totalPages - 1)}
            aria-label="Last page"
            title="Last page"
          >
            <ChevronsRight size={13} aria-hidden="true" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// ModifyStructureForm — body of the "Modify Structure" drawer. Keeps
// every column field controlled (name, type, default, flags, foreign
// key) while delegating persistence and the actual rebuild to the
// parent's `submitModifyStructure`.
// ────────────────────────────────────────────────────────────────────────

interface ModifyStructureState {
  originalName: string;
  newName: string;
  columns: ModifyColumnDraft[];
}

function ModifyStructureForm({
  state,
  onChange,
  invalidColumnIds,
  knownTables,
  engine,
  onDropLeaf,
  theme,
}: {
  state: ModifyStructureState;
  onChange: (next: ModifyStructureState) => void;
  invalidColumnIds?: Set<string>;
  knownTables: string[];
  engine: SqliteEngine | null;
  /** Called when the user clicks the drop button on an index/trigger item. */
  onDropLeaf?: (name: string, kind: "index" | "trigger") => void;
  /** Editor theme forwarded to inline DdlViewer blocks. */
  theme?: string;
}) {
  const [activeTab, setActiveTab] = useState<"columns" | "indexes" | "triggers">("columns");
  const [isDragging, setIsDragging] = useState(false);
  // Tracks which index/trigger items are expanded to show DDL inline.
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  // Caches DDL strings fetched from the engine keyed by entity name.
  const [itemDdls, setItemDdls] = useState<Record<string, string>>({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Toggle inline DDL visibility for an index/trigger item. On first
  // expansion the DDL is fetched from the engine and cached.
  const toggleStructItem = (name: string, kind: "index" | "trigger") => {
    const isExpanded = expandedItems.has(name);
    if (!isExpanded && !(name in itemDdls) && engine) {
      try {
        const sql = engine.getDDL(name);
        setItemDdls((prev) => ({ ...prev, [name]: sql }));
      } catch {
        // getDDL can throw if the entity was just dropped; store an
        // empty string so the UI shows the "no DDL" fallback message.
        setItemDdls((prev) => ({ ...prev, [name]: "" }));
      }
    }
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (isExpanded) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const updateColumn = (id: string, patch: Partial<ModifyColumnDraft>) => {
    onChange({
      ...state,
      columns: state.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  };
  const removeColumn = (id: string) => {
    onChange({
      ...state,
      columns: state.columns.filter((c) => c.id !== id),
    });
  };
  const addColumn = () => {
    onChange({
      ...state,
      columns: [
        ...state.columns,
        {
          id: newDraftId(),
          originalName: null,
          name: "",
          type: "TEXT",
          notNull: false,
          primaryKey: false,
          autoIncrement: false,
          unique: false,
          defaultValue: "",
          fkTable: "",
          fkColumn: "",
          fkOnDelete: "NO ACTION",
          fkOnUpdate: "NO ACTION",
        },
      ],
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = state.columns.findIndex((c) => c.id === active.id);
    const newIndex = state.columns.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange({ ...state, columns: arrayMove(state.columns, oldIndex, newIndex) });
  };

  // Lazy-load indexes and triggers for the Indexes/Triggers tabs.
  const tableIndexes = useMemo(() => {
    if (!engine || !state.originalName) return [] as string[];
    try {
      return engine.listTableIndexes(state.originalName);
    } catch {
      return [] as string[];
    }
  }, [engine, state.originalName]);

  const tableTriggers = useMemo(() => {
    if (!engine || !state.originalName) return [] as string[];
    try {
      return engine.listTableTriggers(state.originalName);
    } catch {
      return [] as string[];
    }
  }, [engine, state.originalName]);

  return (
    <div className="sql-modify-body">
      <label className="sql-modify-field">
        <span className="sql-modify-field-label">Table name</span>
        <input
          className="sql-rename-input"
          value={state.newName}
          onChange={(e) => onChange({ ...state, newName: e.target.value })}
        />
      </label>

      {/* Tab strip */}
      <div className="sql-struct-tabs">
        <button
          type="button"
          className={`sql-struct-tab${activeTab === "columns" ? " active" : ""}`}
          onClick={() => setActiveTab("columns")}
        >
          Columns
          <span className="sql-struct-tab-count">{state.columns.length}</span>
        </button>
        <button
          type="button"
          className={`sql-struct-tab${activeTab === "indexes" ? " active" : ""}`}
          onClick={() => setActiveTab("indexes")}
        >
          Indexes
          <span className="sql-struct-tab-count">{tableIndexes.length}</span>
        </button>
        <button
          type="button"
          className={`sql-struct-tab${activeTab === "triggers" ? " active" : ""}`}
          onClick={() => setActiveTab("triggers")}
        >
          Triggers
          <span className="sql-struct-tab-count">{tableTriggers.length}</span>
        </button>
      </div>

      {activeTab === "columns" && (
        <>
          <div className="sql-modify-columns">
            {state.columns.length > 0 ? (
              <div
                className="sql-modify-table-wrap"
                style={isDragging ? { overflowX: "hidden" } : undefined}
              >
                <table className="sql-modify-table">
                  <thead>
                    <tr>
                      <th className="sql-modify-th-drag" />
                      <th>Name</th>
                      <th style={{ minWidth: "90px" }}>
                        Type <ColumnHeaderPopover pragma="type" />
                      </th>
                      <th>
                        Not null <ColumnHeaderPopover pragma="notNull" />
                      </th>
                      <th>
                        Primary <ColumnHeaderPopover pragma="primary" />
                      </th>
                      <th>
                        Unique <ColumnHeaderPopover pragma="unique" />
                      </th>
                      <th>
                        Auto-
                        <br />
                        increment{" "}
                        <ColumnHeaderPopover pragma="autoIncrement" />
                      </th>
                      <th>
                        Default value{" "}
                        <ColumnHeaderPopover pragma="defaultValue" />
                      </th>
                      <th>
                        FK table <ColumnHeaderPopover pragma="fkTable" />
                      </th>
                      <th>
                        FK column <ColumnHeaderPopover pragma="fkColumn" />
                      </th>
                      <th>
                        On delete <ColumnHeaderPopover pragma="onDelete" />
                      </th>
                      <th>
                        On update <ColumnHeaderPopover pragma="onUpdate" />
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={state.columns.map((c) => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <tbody>
                        {state.columns.map((col) => (
                          <ModifyColumnRow
                            key={col.id}
                            col={col}
                            onChange={(patch) => updateColumn(col.id, patch)}
                            onRemove={() => removeColumn(col.id)}
                            hasNameError={invalidColumnIds?.has(col.id) ?? false}
                            knownTables={knownTables}
                            engine={engine}
                          />
                        ))}
                      </tbody>
                    </SortableContext>
                  </DndContext>
                </table>
              </div>
            ) : (
              <div className="sql-modify-empty">No columns. Add one below.</div>
            )}
          </div>
          <button
            type="button"
            className="confirm-btn confirm-btn-secondary sql-modify-add"
            onClick={addColumn}
          >
            <Plus size={12} aria-hidden="true" /> Add column
          </button>
        </>
      )}

      {activeTab === "indexes" && (
        <div className="sql-struct-list">
          {tableIndexes.length === 0 ? (
            <div className="sql-modify-empty">No user-defined indexes.</div>
          ) : (
            tableIndexes.map((name) => {
              const isOpen = expandedItems.has(name);
              const ddl = itemDdls[name] ?? "";
              return (
                <div key={name} className={`sql-struct-list-item sql-struct-list-item-toggle${isOpen ? " is-open" : ""}`}>
                  <div className="sql-struct-list-header">
                    <button
                      type="button"
                      className="sql-struct-list-row"
                      onClick={() => toggleStructItem(name, "index")}
                      aria-expanded={isOpen}
                    >
                      <Hash size={12} className="sql-struct-list-icon" aria-hidden="true" />
                      <span className="sql-struct-list-name">{name}</span>
                      <span className="sql-struct-list-chevron" aria-hidden="true">
                        {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      </span>
                    </button>
                    {onDropLeaf && (
                      <button
                        type="button"
                        className="sql-struct-list-drop"
                        onClick={() => onDropLeaf(name, "index")}
                        title={`Drop index ${name}`}
                        aria-label={`Drop index ${name}`}
                      >
                        <Trash2 size={11} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  {isOpen && (
                    <div className="sql-struct-list-ddl">
                      {ddl.trim() ? (
                        <DdlViewer sql={ddl} theme={theme ?? "default"} />
                      ) : (
                        <div className="sql-modify-empty">No DDL recorded for this index.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "triggers" && (
        <div className="sql-struct-list">
          {tableTriggers.length === 0 ? (
            <div className="sql-modify-empty">No triggers.</div>
          ) : (
            tableTriggers.map((name) => {
              const isOpen = expandedItems.has(name);
              const ddl = itemDdls[name] ?? "";
              return (
                <div key={name} className={`sql-struct-list-item sql-struct-list-item-toggle${isOpen ? " is-open" : ""}`}>
                  <div className="sql-struct-list-header">
                    <button
                      type="button"
                      className="sql-struct-list-row"
                      onClick={() => toggleStructItem(name, "trigger")}
                      aria-expanded={isOpen}
                    >
                      <Zap size={12} className="sql-struct-list-icon" aria-hidden="true" />
                      <span className="sql-struct-list-name">{name}</span>
                      <span className="sql-struct-list-chevron" aria-hidden="true">
                        {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      </span>
                    </button>
                    {onDropLeaf && (
                      <button
                        type="button"
                        className="sql-struct-list-drop"
                        onClick={() => onDropLeaf(name, "trigger")}
                        title={`Drop trigger ${name}`}
                        aria-label={`Drop trigger ${name}`}
                      >
                        <Trash2 size={11} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  {isOpen && (
                    <div className="sql-struct-list-ddl">
                      {ddl.trim() ? (
                        <DdlViewer sql={ddl} theme={theme ?? "default"} />
                      ) : (
                        <div className="sql-modify-empty">No DDL recorded for this trigger.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function ModifyColumnRow({
  col,
  onChange,
  onRemove,
  hasNameError,
  knownTables,
  engine,
}: {
  col: ModifyColumnDraft;
  onChange: (patch: Partial<ModifyColumnDraft>) => void;
  onRemove: () => void;
  hasNameError?: boolean;
  knownTables: string[];
  engine: SqliteEngine | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: col.id });

  const style: React.CSSProperties = {
    transform: DndCSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    position: isDragging ? "relative" : undefined,
    zIndex: isDragging ? 1 : undefined,
  };

  // Look up the columns of the FK target table on demand so the
  // user gets a constrained dropdown rather than a free-text field.
  const fkTargetColumns = useMemo(() => {
    if (!engine || !col.fkTable) return [] as TableColumnInfo[];
    try {
      return engine.listColumns(col.fkTable);
    } catch {
      return [] as TableColumnInfo[];
    }
  }, [engine, col.fkTable]);
  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="sql-modify-col-row"
      {...attributes}
    >
      <td className="sql-modify-drag-cell">
        <span
          className="sql-modify-drag-handle"
          title="Drag to reorder"
          {...listeners}
        >
          <GripVertical size={14} aria-hidden="true" />
        </span>
      </td>
      <td>
        <label className="sql-modify-cell-field">
          <input
            className={`sql-rename-input sql-modify-col-name${hasNameError ? " sql-modify-col-name-error" : ""}`}
            value={col.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="column name"
            aria-label="Column name"
          />
        </label>
      </td>
      <td>
        <label className="sql-modify-cell-field">
          <select
            className="sql-modify-col-type sql-modify-col-type-select"
            value={col.type}
            onChange={(e) => onChange({ type: e.target.value })}
            aria-label="Column type"
          >
            {COLUMN_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </td>
      <td>
        <ColumnFlag
          checked={col.notNull}
          onChange={(v) => onChange({ notNull: v })}
          label="Not null"
          showLabel={false}
        />
      </td>
      <td>
        <ColumnFlag
          checked={col.primaryKey}
          onChange={(v) =>
            onChange({
              primaryKey: v,
              autoIncrement: v ? col.autoIncrement : false,
            })
          }
          label="Primary key"
          showLabel={false}
        />
      </td>
      <td>
        <ColumnFlag
          checked={col.unique}
          onChange={(v) => onChange({ unique: v })}
          label="Unique"
          showLabel={false}
        />
      </td>
      <td>
        <ColumnFlag
          checked={col.autoIncrement}
          onChange={(v) => onChange({ autoIncrement: v })}
          label="Auto-increment"
          showLabel={false}
          disabled={!col.primaryKey || !/^integer$/i.test(col.type)}
        />
      </td>
      <td>
        <label className="sql-modify-cell-field">
          <input
            className="sql-rename-input sql-modify-col-default"
            value={col.defaultValue}
            onChange={(e) => onChange({ defaultValue: e.target.value })}
            placeholder="e.g. 'foo' or 0"
            aria-label="Default value"
          />
        </label>
      </td>
      <td>
        <label className="sql-modify-cell-field">
          <select
            className="sql-modify-col-type sql-modify-fk-table"
            value={col.fkTable}
            onChange={(e) =>
              onChange({ fkTable: e.target.value, fkColumn: "" })
            }
            aria-label="Foreign key target table"
          >
            <option value="">(none)</option>
            {knownTables.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </td>
      <td>
        <label className="sql-modify-cell-field">
          <select
            className="sql-modify-col-type sql-modify-fk-column"
            value={col.fkColumn}
            onChange={(e) => onChange({ fkColumn: e.target.value })}
            aria-label="Foreign key target column"
            disabled={!col.fkTable}
          >
            <option value="">(column)</option>
            {fkTargetColumns.map((c) => (
              <option key={c.cid} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </td>
      <td>
        <label className="sql-modify-cell-field">
          <select
            className="sql-modify-col-type sql-modify-fk-cascade"
            value={col.fkOnDelete}
            onChange={(e) => onChange({ fkOnDelete: e.target.value })}
            aria-label="On delete cascade action"
            disabled={!col.fkTable}
          >
            {FK_ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
      </td>
      <td>
        <label className="sql-modify-cell-field">
          <select
            className="sql-modify-col-type sql-modify-fk-cascade"
            value={col.fkOnUpdate}
            onChange={(e) => onChange({ fkOnUpdate: e.target.value })}
            aria-label="On update cascade action"
            disabled={!col.fkTable}
          >
            {FK_ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
      </td>
      <td>
        <button
          type="button"
          className="sql-modify-col-remove"
          onClick={onRemove}
          aria-label={`Remove column ${col.name || "unnamed column"}`}
          title="Remove column"
        >
          <Trash2 size={13} aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

function ColumnFlag({
  checked,
  onChange,
  label,
  disabled,
  showLabel = true,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  showLabel?: boolean;
}) {
  return (
    <label className={`sql-modify-flag${disabled ? " is-disabled" : ""}`}>
      <Checkbox.Root
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        disabled={disabled}
        className="sql-modify-flag-box"
        aria-label={label}
        title={label}
      >
        <Checkbox.Indicator className="sql-modify-flag-ind">
          ✓
        </Checkbox.Indicator>
      </Checkbox.Root>
      {showLabel && <span>{label}</span>}
    </label>
  );
}

// ────────────────────────────────────────────────────────────────────────
// DdlViewer — read-only EditorView mounted inside the View DDL dialog so
// the SQL is syntax-highlighted and the user can scroll / select with
// their keyboard.
// ────────────────────────────────────────────────────────────────────────

function DdlViewer({
  sql,
  theme,
}: {
  sql: string;
  theme: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompRef = useRef<Compartment | null>(null);

  useEffect(() => {
    if (!hostRef.current || viewRef.current) return;
    const themeComp = new Compartment();
    const view = new EditorView({
      doc: sql,
      parent: hostRef.current,
      extensions: [
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        drawSelection(),
        lineNumbersExt(),
        EditorState.tabSize.of(2),
        indentUnit.of("  "),
        // Wrap long lines to prevent horizontal scroll in the View DDL popup.
        EditorView.lineWrapping,
        sqlLang({ dialect: SQLite, upperCaseKeywords: false }),
        themeComp.of(themeFor(theme)),
      ],
    });
    viewRef.current = view;
    themeCompRef.current = themeComp;
    return () => {
      view.destroy();
      viewRef.current = null;
      themeCompRef.current = null;
    };
    // sql / theme updates are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== sql) {
      replaceDoc(view, sql);
    }
  }, [sql]);

  useEffect(() => {
    if (viewRef.current && themeCompRef.current) {
      viewRef.current.dispatch({
        effects: themeCompRef.current.reconfigure(themeFor(theme)),
      });
    }
  }, [theme]);

  return <div className="sql-ddl-code-wrap" ref={hostRef} />;
}

// ────────────────────────────────────────────────────────────────────────
// Schema sidebar item — a tree-row button wrapped in a Base UI
// ContextMenu so right-clicking a table or view exposes the typical
// IDE actions (Modify Structure / View Structure, Preview Data,
// Count Rows, Copy Name, Truncate, Drop). Single-click toggles the
// row's expanded state which reveals the column list; double-click
// opens the entity in a new query tab.
// ────────────────────────────────────────────────────────────────────────

interface SchemaSectionProps {
  label: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  emptyMessage: string;
  children?: ReactNode;
  onAdd?: () => void;
  /** When provided, shows an Expand All / Collapse All icon button.
   *  `allExpanded` drives which icon is shown; the button calls
   *  `onCollapseAll` when true, `onExpandAll` when false. */
  allExpanded?: boolean;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

function SchemaSection({
  label,
  count,
  expanded,
  onToggle,
  emptyMessage,
  children,
  onAdd,
  allExpanded,
  onExpandAll,
  onCollapseAll,
}: SchemaSectionProps) {
  const showExpandCollapse = count > 0 && (onExpandAll || onCollapseAll);
  const toggleHint = expanded
    ? `Collapse ${label.toLowerCase()}`
    : `Expand ${label.toLowerCase()}`;
  const expandCollapseHint = allExpanded
    ? `Collapse all ${label.toLowerCase()}`
    : `Expand all ${label.toLowerCase()}`;
  const addHint = `Add ${label.toLowerCase().replace(/s$/, "")}`;
  return (
    <div className="sql-tree-section">
      <div className="sql-tree-section-header">
        <Popover.Root>
          <Popover.Trigger
            openOnHover
            delay={120}
            closeDelay={80}
            render={(props) => (
              <button
                type="button"
                {...props}
                className="sql-tree-section-toggle"
                onClick={onToggle}
                aria-expanded={expanded}
              >
                <span className="sql-tree-chevron" aria-hidden="true">
                  {expanded ? (
                    <ChevronDown size={11} />
                  ) : (
                    <ChevronRight size={11} />
                  )}
                </span>
                <span className="sql-tree-label">
                  {label} ({count})
                </span>
              </button>
            )}
          />
          <Popover.Portal>
            <Popover.Positioner
              className="sql-tree-popover-positioner"
              sideOffset={6}
              align="start"
            >
              <Popover.Popup className="bui-popup sql-tree-popover">
                {toggleHint}
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
        {showExpandCollapse && (
          <Popover.Root>
            <Popover.Trigger
              openOnHover
              delay={120}
              closeDelay={80}
              render={(props) => (
                <button
                  type="button"
                  {...props}
                  className="sql-tree-section-add"
                  onClick={allExpanded ? onCollapseAll : onExpandAll}
                  aria-label={expandCollapseHint}
                >
                  {allExpanded ? (
                    <ChevronsUp size={11} aria-hidden="true" />
                  ) : (
                    <ChevronsDown size={11} aria-hidden="true" />
                  )}
                </button>
              )}
            />
            <Popover.Portal>
              <Popover.Positioner
                className="sql-tree-popover-positioner"
                sideOffset={6}
                align="start"
              >
                <Popover.Popup className="bui-popup sql-tree-popover">
                  {expandCollapseHint}
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        )}
        {onAdd && (
          <Popover.Root>
            <Popover.Trigger
              openOnHover
              delay={120}
              closeDelay={80}
              render={(props) => (
                <button
                  type="button"
                  {...props}
                  className="sql-tree-section-add"
                  onClick={onAdd}
                  aria-label={addHint}
                >
                  <Plus size={11} aria-hidden="true" />
                </button>
              )}
            />
            <Popover.Portal>
              <Popover.Positioner
                className="sql-tree-popover-positioner"
                sideOffset={6}
                align="start"
              >
                <Popover.Popup className="bui-popup sql-tree-popover">
                  {addHint}
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        )}
      </div>
      {expanded && (
        <div className="sql-tree-section-body">
          {count === 0 ? (
            onAdd ? (
              <button
                type="button"
                className="sql-tree-create-btn"
                onClick={onAdd}
              >
                <Table size={12} aria-hidden="true" />
                <span>Create a {label.toLowerCase().replace(/s$/, "")}</span>
              </button>
            ) : (
              <div className="sql-tree-empty">{emptyMessage}</div>
            )
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}

interface SchemaItemProps {
  name: string;
  kind: "table" | "view";
  expanded: boolean;
  columns: TableColumnInfo[] | undefined;
  foreignKeys: ForeignKeyInfo[] | undefined;
  onToggleExpanded: (name: string) => void;
  onPreview: (name: string, kind: "table" | "view") => void;
  /** Tables open the Modify Structure drawer; views still use the
   *  read-only "View Structure" PRAGMA path because their structure
   *  is derived from their CREATE VIEW statement, not editable. */
  onModifyStructure?: (name: string) => void;
  onStructure?: (name: string, kind: "table" | "view") => void;
  /** Tables only — opens the Add Row drawer. */
  onAddRow?: (name: string) => void;
  onCount: (name: string, kind: "table" | "view") => void;
  onCopy: (name: string) => void;
  /** Tables only — Truncate is meaningless on a view. */
  onTruncate?: (name: string) => void;
  onDrop: (name: string, kind: "table" | "view") => void;
  onViewDDL: (name: string, kind: "table" | "view") => void;
  onExport: (name: string, format: "csv" | "json" | "sql" | "parquet" | "xlsx") => void;
  onGetRowCount: (name: string) => number;
}

function SchemaItem({
  name,
  kind,
  expanded,
  columns,
  foreignKeys,
  onToggleExpanded,
  onPreview,
  onModifyStructure,
  onStructure,
  onAddRow,
  onCount,
  onCopy,
  onTruncate,
  onDrop,
  onViewDDL,
  onExport,
  onGetRowCount,
}: SchemaItemProps) {
  const [exportRowCount, setExportRowCount] = useState<number | null>(null);
  const ensureRowCount = useCallback(() => {
    if (exportRowCount === null) {
      setExportRowCount(onGetRowCount(name));
    }
  }, [exportRowCount, onGetRowCount, name]);

  // Hover-to-open state for the Export submenu.
  const [exportOpen, setExportOpen] = useState(false);
  const exportCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleExportPointerEnter = useCallback(() => {
    if (exportCloseTimer.current) {
      clearTimeout(exportCloseTimer.current);
      exportCloseTimer.current = null;
    }
    ensureRowCount();
    setExportOpen(true);
  }, [ensureRowCount]);
  const handleExportPointerLeave = useCallback(() => {
    exportCloseTimer.current = setTimeout(() => setExportOpen(false), 120);
  }, []);
  const Icon = kind === "view" ? Eye : Table;
  const pkCount = useMemo(
    () => (columns ?? []).filter((c) => c.pk > 0).length,
    [columns],
  );
  const fkByCol = useMemo(() => {
    const m = new Map<string, ForeignKeyInfo>();
    for (const fk of foreignKeys ?? []) m.set(fk.from, fk);
    return m;
  }, [foreignKeys]);
  // Click vs. double-click disambiguation. The native browser fires a
  // `click` event for each press inside a double-click, so without a
  // delay a double-click would also toggle the row's expanded state
  // (which the user explicitly does not want). We defer the toggle by
  // a short window; if a `dblclick` arrives in that window we cancel
  // the pending toggle and run `onPreview` instead. The 220ms window
  // sits a hair under the OS-typical double-click threshold (≤ 250ms)
  // so the single-click path still feels snappy.
  const clickTimerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (clickTimerRef.current !== null) {
        window.clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
    };
  }, []);
  const handleSingleClick = useCallback(() => {
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
    }
    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = null;
      onToggleExpanded(name);
    }, SINGLE_CLICK_DELAY_MS);
  }, [name, onToggleExpanded]);
  const handleDoubleClick = useCallback(() => {
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    onPreview(name, kind);
  }, [name, kind, onPreview]);
  const itemHint = `Double-click to preview, click to ${expanded ? "collapse" : "expand"}`;
  return (
    <div className="sql-tree-entity">
      <ContextMenu.Root>
        <ContextMenu.Trigger
          render={(props) => (
            <div {...props} className="sql-tree-entity-trigger">
              <Popover.Root>
                <Popover.Trigger
                  openOnHover
                  delay={180}
                  closeDelay={80}
                  render={(triggerProps) => (
                    <button
                      type="button"
                      {...triggerProps}
                      className="sql-tree-item"
                      onClick={handleSingleClick}
                      onDoubleClick={handleDoubleClick}
                      aria-expanded={expanded}
                    >
                      <span className="sql-tree-chevron" aria-hidden="true">
                        {expanded ? (
                          <ChevronDown size={11} />
                        ) : (
                          <ChevronRight size={11} />
                        )}
                      </span>
                      <Icon size={12} aria-hidden="true" />
                      <span className="sql-tree-item-name">{name}</span>
                    </button>
                  )}
                />
                <Popover.Portal>
                  <Popover.Positioner
                    className="sql-tree-popover-positioner"
                    sideOffset={6}
                    side="right"
                    align="start"
                  >
                    <Popover.Popup className="bui-popup sql-tree-popover">
                      <span className="sql-tree-popover-name">
                        <Icon size={12} aria-hidden="true" />
                        <strong>{name}</strong>
                      </span>
                      <span>{itemHint}</span>
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>
              {expanded && (
                <ul className="sql-tree-columns" role="list">
                  {columns === undefined ? (
                    <li className="sql-tree-column-loading">Loading…</li>
                  ) : columns.length === 0 ? (
                    <li className="sql-tree-column-loading">No columns.</li>
                  ) : (
                    columns.map((c) => {
                      const fk = fkByCol.get(c.name);
                      return (
                        <li key={c.cid} className="sql-tree-column">
                          <span className="sql-tree-column-icons">
                            {c.pk > 0 && (
                              <Popover.Root>
                                <Popover.Trigger
                                  openOnHover
                                  delay={150}
                                  closeDelay={100}
                                  className="sql-tree-column-pk"
                                  aria-label={pkCount > 1 ? "Composite primary key" : "Primary key"}
                                >
                                  <MdOutlineKey size={11} aria-hidden="true" />
                                </Popover.Trigger>
                                <Popover.Portal>
                                  <Popover.Positioner
                                    sideOffset={6}
                                    side="right"
                                    className="sql-key-icon-popover-positioner"
                                  >
                                    <Popover.Popup className="bui-popup sql-key-icon-popover">
                                      <MdOutlineKey size={11} className="sql-key-icon-popover-icon" aria-hidden="true" />
                                      <span>{pkCount > 1 ? "Composite primary key" : "Primary key"}</span>
                                    </Popover.Popup>
                                  </Popover.Positioner>
                                </Popover.Portal>
                              </Popover.Root>
                            )}
                            {fk && (
                              <Popover.Root>
                                <Popover.Trigger
                                  openOnHover
                                  delay={150}
                                  closeDelay={100}
                                  className="sql-tree-column-fk"
                                  aria-label={`Foreign key → ${fk.table}.${fk.to}`}
                                >
                                  <IoLink size={12} aria-hidden="true" />
                                </Popover.Trigger>
                                <Popover.Portal>
                                  <Popover.Positioner
                                    sideOffset={6}
                                    side="right"
                                    className="sql-key-icon-popover-positioner"
                                  >
                                    <Popover.Popup className="bui-popup sql-key-icon-popover">
                                      <IoLink size={12} className="sql-key-icon-popover-icon" aria-hidden="true" />
                                      <span>Foreign key</span>
                                    </Popover.Popup>
                                  </Popover.Positioner>
                                </Popover.Portal>
                              </Popover.Root>
                            )}
                          </span>
                          <span className="sql-tree-column-name">{c.name}</span>
                          <span className="sql-tree-column-type">
                            {c.type || "—"}
                          </span>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}
            </div>
          )}
        />
        <ContextMenu.Portal>
          <ContextMenu.Positioner sideOffset={6}>
            <ContextMenu.Popup className="bui-popup examples-dropdown">
              <div className="ctx-table-name">
                <Icon size={12} className="ctx-name-icon" aria-hidden="true" />
                {name}
              </div>
              <ContextMenu.Item
                className="example-item"
                onClick={() => onPreview(name, kind)}
              >
                <div className="ex-title">View Data</div>
              </ContextMenu.Item>
              {kind === "table" && onAddRow && (
                <ContextMenu.Item
                  className="example-item"
                  onClick={() => onAddRow(name)}
                >
                  <div className="ex-title">Add Row</div>
                </ContextMenu.Item>
              )}
              {kind === "table" && onModifyStructure ? (
                <ContextMenu.Item
                  className="example-item"
                  onClick={() => onModifyStructure(name)}
                >
                  <div className="ex-title">View Structure</div>
                </ContextMenu.Item>
              ) : (
                onStructure && (
                  <ContextMenu.Item
                    className="example-item"
                    onClick={() => onStructure(name, kind)}
                  >
                    <div className="ex-title">View Structure</div>
                  </ContextMenu.Item>
                )
              )}
              <ContextMenu.Item
                className="example-item"
                onClick={() => onCount(name, kind)}
              >
                <div className="ex-title">Count Rows</div>
              </ContextMenu.Item>
              <ContextMenu.Item
                className="example-item"
                onClick={() => onViewDDL(name, kind)}
              >
                <div className="ex-title">View DDL</div>
              </ContextMenu.Item>
              <ContextMenu.Item
                className="example-item"
                onClick={() => onCopy(name)}
              >
                <div className="ex-title">Copy Name</div>
              </ContextMenu.Item>
              <Menu.Root open={exportOpen} onOpenChange={setExportOpen}>
                <Menu.Trigger
                  className="example-item ctx-export-trigger ctx-export-trigger-bordered"
                  onPointerEnter={handleExportPointerEnter}
                  onPointerLeave={handleExportPointerLeave}
                >
                  <div className="ex-title ctx-export-title">
                    Export
                    <ChevronRight size={10} className="ctx-export-arrow" />
                  </div>
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner side="right" align="start" sideOffset={4}>
                    <Menu.Popup
                      className="bui-popup examples-dropdown export-dropdown"
                      onPointerEnter={handleExportPointerEnter}
                      onPointerLeave={handleExportPointerLeave}
                    >
                      {exportRowCount !== null && (
                        <div className="sql-result-export-group-label">
                          {exportRowCount.toLocaleString()} rows
                        </div>
                      )}
                      <Menu.Item
                        className="example-item export-item"
                        onClick={() => onExport(name, "csv")}
                      >
                        <div className="export-item-text">
                          <div className="ex-title">CSV <span className="ext-badge">.csv</span></div>
                          <div className="ex-desc">Comma-separated values</div>
                        </div>
                      </Menu.Item>
                      <Menu.Item
                        className="example-item export-item"
                        onClick={() => onExport(name, "json")}
                      >
                        <div className="export-item-text">
                          <div className="ex-title">JSON <span className="ext-badge">.json</span></div>
                          <div className="ex-desc">Array of row objects</div>
                        </div>
                      </Menu.Item>
                      <Menu.Item
                        className="example-item export-item"
                        onClick={() => onExport(name, "sql")}
                      >
                        <div className="export-item-text">
                          <div className="ex-title">SQL <span className="ext-badge">.sql</span></div>
                          <div className="ex-desc">INSERT statements</div>
                        </div>
                      </Menu.Item>
                      <Menu.Item
                        className="example-item export-item"
                        onClick={() => onExport(name, "parquet")}
                      >
                        <div className="export-item-text">
                          <div className="ex-title">Parquet <span className="ext-badge">.parquet</span></div>
                          <div className="ex-desc">Apache Parquet binary</div>
                        </div>
                      </Menu.Item>
                      <Menu.Item
                        className="example-item export-item"
                        onClick={() => onExport(name, "xlsx")}
                      >
                        <div className="export-item-text">
                          <div className="ex-title">Excel <span className="ext-badge">.xlsx</span></div>
                          <div className="ex-desc">Excel workbook (single sheet)</div>
                        </div>
                      </Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
              {kind === "table" && onTruncate && (
                <ContextMenu.Item
                  className="example-item"
                  onClick={() => onTruncate(name)}
                >
                  <div className="ex-title">Truncate</div>
                </ContextMenu.Item>
              )}
              <ContextMenu.Item
                className="example-item"
                onClick={() => onDrop(name, kind)}
              >
                <div className="ex-title">
                  Drop {kind === "view" ? "View" : "Table"}
                </div>
              </ContextMenu.Item>
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// SchemaLeafItem — sidebar row for indexes and triggers. These have
// no per-column metadata so the row is non-expandable; the row is just
// a name + context menu (View DDL / Copy Name / Drop).
// ────────────────────────────────────────────────────────────────────────

interface SchemaLeafItemProps {
  name: string;
  kind: "index" | "trigger";
  onCopy: (name: string) => void;
  onViewDDL: (name: string, kind: "index" | "trigger") => void;
  onDrop: (name: string, kind: "index" | "trigger") => void;
}

function SchemaLeafItem({
  name,
  kind,
  onCopy,
  onViewDDL,
  onDrop,
}: SchemaLeafItemProps) {
  const Icon = kind === "index" ? Hash : Zap;
  const itemHint = `View DDL for ${kind} ${name}`;
  return (
    <div className="sql-tree-entity">
      <ContextMenu.Root>
        <ContextMenu.Trigger
          render={(props) => (
            <div {...props} className="sql-tree-entity-trigger">
              <Popover.Root>
                <Popover.Trigger
                  openOnHover
                  delay={180}
                  closeDelay={80}
                  render={(triggerProps) => (
                    <button
                      type="button"
                      {...triggerProps}
                      className="sql-tree-item sql-tree-item-leaf"
                      onClick={() => onViewDDL(name, kind)}
                    >
                      <span className="sql-tree-chevron" aria-hidden="true" />
                      <Icon size={12} aria-hidden="true" />
                      <span className="sql-tree-item-name">{name}</span>
                    </button>
                  )}
                />
                <Popover.Portal>
                  <Popover.Positioner
                    className="sql-tree-popover-positioner"
                    sideOffset={6}
                    side="right"
                    align="start"
                  >
                    <Popover.Popup className="bui-popup sql-tree-popover">
                      <strong>{name}</strong>
                      <span>{itemHint}</span>
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>
            </div>
          )}
        />
        <ContextMenu.Portal>
          <ContextMenu.Positioner sideOffset={6}>
            <ContextMenu.Popup className="bui-popup examples-dropdown">
              <ContextMenu.Item
                className="example-item"
                onClick={() => onViewDDL(name, kind)}
              >
                <div className="ex-title">View DDL</div>
              </ContextMenu.Item>
              <ContextMenu.Item
                className="example-item"
                onClick={() => onCopy(name)}
              >
                <div className="ex-title">Copy Name</div>
              </ContextMenu.Item>
              <ContextMenu.Item
                className="example-item"
                onClick={() => onDrop(name, kind)}
              >
                <div className="ex-title">
                  Drop {kind === "index" ? "Index" : "Trigger"}
                </div>
              </ContextMenu.Item>
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>
    </div>
  );
}
