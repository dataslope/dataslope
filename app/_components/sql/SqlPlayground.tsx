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
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
} from "@dnd-kit/core";
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
import type { Compartment } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  createSqlEditorExtensions,
  makeSqlAutocompletionExtension,
  makeSqlEditorCompartments,
  makeSqlLangExtension,
} from "./shared/editorSetup";
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
  Eye,
  Database,
  FilePlus,
  FileText,
  FileJson,
  GripVertical,
  Hash,
  History,
  Network,
  Pencil,
  Play,
  RotateCcw,
  Settings2,
  Table,
  Trash2,
  TriangleAlert,
  Upload,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { FaInfo } from "react-icons/fa";
import { IoLink } from "react-icons/io5";
import { MdOutlineKey } from "react-icons/md";
import type { RuntimeInfo } from "../types";
import { modifyDialogSignature } from "./types";
import { PLAYGROUNDS } from "../playgrounds";
import {
  LANGUAGE_ICONS as PLAYGROUND_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR as PLAYGROUND_ICON_SIZE_FACTOR,
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
  detectIsMac,
} from "../playgroundShared";
import { SqlSettingsPanel } from "./components/SqlSettingsPanel";
import { SqlSettingsConfirmDialogs } from "./components/SqlSettingsConfirmDialogs";
import { DdlViewerDialog } from "./components/DdlViewerDialog";
import { SwitchDatabaseDialog } from "./components/SwitchDatabaseDialog";
import { ImportBinaryFileDialog } from "./components/ImportBinaryFileDialog";
import { RenameDatabaseDialog } from "./components/RenameDatabaseDialog";
import { SqlEditorToolbar } from "./components/SqlEditorToolbar";
import { findSampleDatabase } from "../runtime/sqliteSamples";
import { sqliteAdapter } from "./sqliteAdapter";
import {
  type ColumnConstraintInfo,
  type ColumnSpec,
  type ForeignKeyInfo,
  type SqliteEngine,
  type TableColumnInfo,
} from "../runtime/sqlite";

const SQLITE_SAMPLE_DATABASES = sqliteAdapter.samples;
import type { QueryExecResult } from "sql.js";
import dynamic from "next/dynamic";

// ErDiagramPane pulls in @xyflow/react and elkjs/lib/elk.bundled.js
// (~hundreds of KB of layout-algorithm code). It only renders when
// the user opens the ER-diagram tab, so defer the chunk until then.
const ErDiagramPane = dynamic(
  () => import("../ErDiagramPane").then((m) => m.ErDiagramPane),
  { ssr: false },
);
import { ToastList } from "./components/ToastList";
import { SqlTabBar } from "./components/SqlTabBar";
import { QueryHistoryPane } from "./components/QueryHistoryPane";
import type { SqlCompletionSchema } from "./sqlCompletion";
import { useSettingsStore } from "./stores/useSettingsStore";
import { usePragmaStore } from "./stores/usePragmaStore";
import { useSqlPlaygroundStore } from "./stores/useSqlPlaygroundStore";
import { useEngineStore } from "./stores/useEngineStore";
import { useTabStore } from "./stores/useTabStore";
import { useDialogStore } from "./stores/useDialogStore";
import { useQueryRunner } from "./hooks/useQueryRunner";
import { useTabManagement } from "./hooks/useTabManagement";
import { pushTabHistory } from "./utils/tabUtils";
import {
  ensurePersistUnloadFlush,
  persistAsync,
} from "./utils/persistedStorage";
import { useSidebarActions } from "./hooks/useSidebarActions";
import { useDatabaseActions } from "./hooks/useDatabaseActions";
import { useQueryHistory } from "./hooks/useQueryHistory";
import { ModifyStructureForm } from "./components/ModifyStructureForm";
import { ResultView } from "./components/ResultView";
import { SchemaItem } from "./components/SchemaItem";
import { SchemaLeafItem } from "./components/SchemaLeafItem";
import { SchemaSection } from "./components/SchemaSection";
import {
  DatabaseSelector,
  type DatabaseSelectorAction,
} from "./components/DatabaseSelector";
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


const PLAYGROUND_ID = sqliteAdapter.playgroundId;

const SQLITE_DB_ACTIONS: readonly DatabaseSelectorAction[] = [
  {
    id: "__new_db__",
    icon: <FilePlus size={14} />,
    label: "New Database",
    description: "Create a blank database",
  },
  {
    id: "__import_sqlite__",
    icon: <Upload size={14} />,
    label: "Import SQLite File",
    description: "Open a .sqlite or .db file",
  },
  {
    id: "__rename_db__",
    icon: <Pencil size={14} />,
    label: "Rename Current Database",
    description: "Change filename and extension",
  },
];

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
  generated: { expression: string; storageType: "VIRTUAL" | "STORED" } | null;
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
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\r\n]*/g, "");
}

/** Returns true when `sql` appears to be a single SELECT or CTE statement
 *  (no multi-statement semicolons, starts with SELECT or WITH). Used to
 *  decide whether lazy LIMIT/OFFSET pagination is applicable.
 *  Pass `noComments` (the result of `stripSqlComments(sql)`) when you have
 *  already stripped comments to avoid redundant work. */
function isSingleSelectSql(sql: string, noComments?: string): boolean {
  const stripped = (noComments ?? stripSqlComments(sql))
    .trim()
    .replace(/;+\s*$/, "");
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
async function applyPragmasToEngine(
  engine: import("../runtime/sqlite").SqliteEngine,
  p: PragmaSettings,
): Promise<void> {
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
      await engine.exec(sql);
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

// ── Import column-comparison helper ─────────────────────────────────────
// Compares the file headers that will be inserted against the column list
// of an existing target table, returning a row-per-column summary used by
// the import dialogs to flag matched / extra / missing columns.
// Sanitizes a raw header/column name to the SQL identifier that the import
// handlers use when building INSERT statements (same regex as the callers).
// Case is preserved so the created column names match the original file.
function sanitizeImportColName(header: string): string {
  return header.trim().replace(/[^a-zA-Z0-9_]/g, "_") || "col";
}

// Case-insensitive variant used only for column-matching comparisons.
// SQLite column lookups are case-insensitive, so we normalise both sides
// before comparing.
function normalizeImportColName(header: string): string {
  return sanitizeImportColName(header).toLowerCase();
}

function computeImportColComparison(
  fileHeaders: string[],
  tableCols: TableColumnInfo[],
): Array<{
  status: "matched" | "extra" | "optional" | "required";
  fileCol: string | null;
  tableCol: string | null;
}> {
  const tableMap = new Map(tableCols.map((c) => [c.name.toLowerCase(), c]));
  const matched = new Set<string>();
  const rows: ReturnType<typeof computeImportColComparison> = [];

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
      // A column can safely be omitted from the import file when it
      // allows NULL, carries a DEFAULT, or is (part of) the primary key
      // (INTEGER PRIMARY KEY columns auto-assign the rowid).
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

// Labels shown in the status column of the column-comparison table inside
// the import dialogs.
const IMPORT_COL_STATUS_LABEL = {
  matched: "✓ Matched",
  extra: "⚠ Not in table",
  optional: "○ Optional",
  required: "✗ Required",
} as const;

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
            className="pragma-reset-btn"
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
  useEffect(() => {
    ensurePersistUnloadFlush();
  }, []);

  // ─── Settings store ──────────────────────────────────────────────────
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

  // ─── Pragma settings ─────────────────────────────────────────────────
  const pragmaSettings = usePragmaStore((s) => s.pragmaSettings);
  const setPragmaSettingsState = usePragmaStore((s) => s.setPragmaSettings);
  const pragmaSettingsRef = useRef<PragmaSettings>(DEFAULT_PRAGMA_SETTINGS);

  // ─── Global page size ────────────────────────────────────────────────
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
  const setGlobalPageSize = useCallback(
    (n: number) => {
      globalPageSizeRef.current = n;
      setGlobalPageSizeState(n);
      try {
        localStorage.setItem(storageKey("page_size"), String(n));
      } catch {
        // ignore quota errors
      }
    },
    [setGlobalPageSizeState],
  );

  // ─── Engine store ────────────────────────────────────────────────────
  const loaded = useEngineStore((s) => s.loaded);
  const setLoaded = useEngineStore((s) => s.setLoaded);
  const statusState = useEngineStore((s) => s.statusState);
  const setStatusState = useEngineStore((s) => s.setStatusState);
  const tables = useEngineStore((s) => s.tables);
  const setTables = useEngineStore((s) => s.setTables);
  const views = useEngineStore((s) => s.views);
  const setViews = useEngineStore((s) => s.setViews);
  const indexes = useEngineStore((s) => s.indexes);
  const setIndexes = useEngineStore((s) => s.setIndexes);
  const triggers = useEngineStore((s) => s.triggers);
  const setTriggers = useEngineStore((s) => s.setTriggers);
  const columnsByEntity = useEngineStore((s) => s.columnsByEntity);
  const setColumnsByEntity = useEngineStore((s) => s.setColumnsByEntity);
  const foreignKeysByEntity = useEngineStore((s) => s.foreignKeysByEntity);
  const setForeignKeysByEntity = useEngineStore(
    (s) => s.setForeignKeysByEntity,
  );
  const constraintsByEntity = useEngineStore((s) => s.constraintsByEntity);
  const setConstraintsByEntity = useEngineStore(
    (s) => s.setConstraintsByEntity,
  );
  const expandedEntities = useEngineStore((s) => s.expandedEntities);
  const setExpandedEntities = useEngineStore((s) => s.setExpandedEntities);
  const tablesSectionExpanded = useEngineStore((s) => s.tablesSectionExpanded);
  const setTablesSectionExpanded = useEngineStore(
    (s) => s.setTablesSectionExpanded,
  );
  const viewsSectionExpanded = useEngineStore((s) => s.viewsSectionExpanded);
  const setViewsSectionExpanded = useEngineStore(
    (s) => s.setViewsSectionExpanded,
  );
  const activeDbId = useEngineStore((s) => s.activeDbId);
  const setActiveDbId = useEngineStore((s) => s.setActiveDbId);
  const customDb = useEngineStore((s) => s.customDb);
  const setCustomDb = useEngineStore((s) => s.setCustomDb);
  const customFilenames = useEngineStore((s) => s.customFilenames);
  const setCustomFilenames = useEngineStore((s) => s.setCustomFilenames);

  // ─── Tab store ───────────────────────────────────────────────────────
  const tabs = useTabStore((s) => s.tabs);
  const setTabs = useTabStore((s) => s.setTabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTabId = useTabStore((s) => s.setActiveTabId);
  const resultsByTab = useTabStore((s) => s.resultsByTab);
  const setResultsByTab = useTabStore((s) => s.setResultsByTab);
  const resultSetExportSnapshot = useTabStore((s) => s.resultSetExportSnapshot);
  const setResultSetExportSnapshot = useTabStore(
    (s) => s.setResultSetExportSnapshot,
  );

  // ─── Dialog store ────────────────────────────────────────────────────
  const settingsOpen = useDialogStore((s) => s.settingsOpen);
  const setSettingsOpen = useDialogStore((s) => s.setSettingsOpen);
  const confirmRestoreOpen = useDialogStore((s) => s.confirmRestoreOpen);
  const setConfirmRestoreOpen = useDialogStore((s) => s.setConfirmRestoreOpen);
  const confirmClearStorageOpen = useDialogStore(
    (s) => s.confirmClearStorageOpen,
  );
  const setConfirmClearStorageOpen = useDialogStore(
    (s) => s.setConfirmClearStorageOpen,
  );
  const confirmCloseTabId = useDialogStore((s) => s.confirmCloseTabId);
  const setConfirmCloseTabId = useDialogStore((s) => s.setConfirmCloseTabId);
  const pendingDbId = useDialogStore((s) => s.pendingDbId);
  const setPendingDbId = useDialogStore((s) => s.setPendingDbId);
  const ddlDialog = useDialogStore((s) => s.ddlDialog);
  const setDdlDialog = useDialogStore((s) => s.setDdlDialog);
  const modifyDialog = useDialogStore((s) => s.modifyDialog);
  const setModifyDialog = useDialogStore((s) => s.setModifyDialog);
  const modifyInvalidColIds = useDialogStore((s) => s.modifyInvalidColIds);
  const setModifyInvalidColIds = useDialogStore(
    (s) => s.setModifyInvalidColIds,
  );
  const modifyStructureTab = useDialogStore((s) => s.modifyStructureTab);
  const setModifyStructureTab = useDialogStore((s) => s.setModifyStructureTab);
  const modifyStructureRefreshKey = useDialogStore(
    (s) => s.modifyStructureRefreshKey,
  );
  const setModifyStructureRefreshKey = useDialogStore(
    (s) => s.setModifyStructureRefreshKey,
  );
  const addRowDialog = useDialogStore((s) => s.addRowDialog);
  const setAddRowDialog = useDialogStore((s) => s.setAddRowDialog);
  const addTableDialog = useDialogStore((s) => s.addTableDialog);
  const setAddTableDialog = useDialogStore((s) => s.setAddTableDialog);
  const addTableInvalidColIds = useDialogStore((s) => s.addTableInvalidColIds);
  const setAddTableInvalidColIds = useDialogStore(
    (s) => s.setAddTableInvalidColIds,
  );
  const truncateConfirm = useDialogStore((s) => s.truncateConfirm);
  const setTruncateConfirm = useDialogStore((s) => s.setTruncateConfirm);
  const pendingDropEntity = useDialogStore((s) => s.pendingDropEntity);
  const setPendingDropEntity = useDialogStore((s) => s.setPendingDropEntity);
  const importSqliteOpen = useDialogStore((s) => s.importSqliteOpen);
  const setImportSqliteOpen = useDialogStore((s) => s.setImportSqliteOpen);
  const importSqliteDragging = useDialogStore((s) => s.importSqliteDragging);
  const setImportSqliteDragging = useDialogStore(
    (s) => s.setImportSqliteDragging,
  );
  const importCsvOpen = useDialogStore((s) => s.importCsvOpen);
  const setImportCsvOpen = useDialogStore((s) => s.setImportCsvOpen);
  const importCsvDragging = useDialogStore((s) => s.importCsvDragging);
  const setImportCsvDragging = useDialogStore((s) => s.setImportCsvDragging);
  const importCsvState = useDialogStore((s) => s.importCsvState);
  const setImportCsvState = useDialogStore((s) => s.setImportCsvState);
  const importJsonOpen = useDialogStore((s) => s.importJsonOpen);
  const setImportJsonOpen = useDialogStore((s) => s.setImportJsonOpen);
  const importJsonDragging = useDialogStore((s) => s.importJsonDragging);
  const setImportJsonDragging = useDialogStore((s) => s.setImportJsonDragging);
  const importJsonState = useDialogStore((s) => s.importJsonState);
  const setImportJsonState = useDialogStore((s) => s.setImportJsonState);
  const importParquetOpen = useDialogStore((s) => s.importParquetOpen);
  const setImportParquetOpen = useDialogStore((s) => s.setImportParquetOpen);
  const importParquetDragging = useDialogStore((s) => s.importParquetDragging);
  const setImportParquetDragging = useDialogStore(
    (s) => s.setImportParquetDragging,
  );
  const importParquetState = useDialogStore((s) => s.importParquetState);
  const setImportParquetState = useDialogStore((s) => s.setImportParquetState);
  const renameDbOpen = useDialogStore((s) => s.renameDbOpen);
  const setRenameDbOpen = useDialogStore((s) => s.setRenameDbOpen);
  const renameDbBaseName = useDialogStore((s) => s.renameDbBaseName);
  const setRenameDbBaseName = useDialogStore((s) => s.setRenameDbBaseName);
  const renameDbExt = useDialogStore((s) => s.renameDbExt);
  const setRenameDbExt = useDialogStore((s) => s.setRenameDbExt);
  const exportNoTabsHover = useDialogStore((s) => s.exportNoTabsHover);
  const setExportNoTabsHover = useDialogStore((s) => s.setExportNoTabsHover);

  // ─── Local state (only items not in any store) ───────────────────────
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading SQLite engine…",
  );
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const [indexesSectionExpanded, setIndexesSectionExpanded] = useState(false);
  const [triggersSectionExpanded, setTriggersSectionExpanded] = useState(false);
  const [hasEditorSelection, setHasEditorSelection] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [formatPopoverOpen, setFormatPopoverOpen] = useState(false);
  const [engineForRender, setEngineForRender] = useState<SqliteEngine | null>(
    null,
  );
  const [quipIndex, setQuipIndex] = useState<number>(0);

  // ─── Derived values ──────────────────────────────────────────────────
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;
  const result = activeTabId ? (resultsByTab[activeTabId] ?? null) : null;
  const loadingFading = loaded && showLoadingOverlay;

  // ─── Refs ────────────────────────────────────────────────────────────
  const engineRef = useRef<SqliteEngine | null>(null);
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const themeCompRef = useRef<Compartment | null>(null);
  const wrapCompRef = useRef<Compartment | null>(null);
  const completionCompRef = useRef<Compartment | null>(null);
  const sqlLangCompRef = useRef<Compartment | null>(null);
  const runRef = useRef<() => void>(() => undefined);
  const runSelectionRef = useRef<(sql: string) => void>(() => undefined);
  const setHasEditorSelectionRef = useRef(setHasEditorSelection);
  const activeTabIdRef = useRef<string>("");
  const tabHistoryRef = useRef<string[]>([]);
  const tabsRef = useRef<QueryTab[]>([]);
  const activeDbIdRef = useRef<string>(activeDbId);
  const panesRef = useRef<HTMLDivElement | null>(null);
  const resultsPaneRef = useRef<HTMLDivElement | null>(null);
  const editorPaneRef = useRef<HTMLDivElement | null>(null);
  const resizerRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const sidebarResizerRef = useRef<HTMLDivElement | null>(null);
  const quipSeedRef = useRef<number>(-1);

  // ─── Ref sync effects ────────────────────────────────────────────────
  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);
  useEffect(() => {
    activeDbIdRef.current = activeDbId;
  }, [activeDbId]);

  // ─── isMac ───────────────────────────────────────────────────────────
  const isMac = useSyncExternalStore(
    () => () => {},
    () => detectIsMac(),
    () => false,
  );

  // ─── Custom hooks ────────────────────────────────────────────────────
  const {
    history: queryHistory,
    addHistoryEntry,
    clearHistory,
  } = useQueryHistory();
  const queryRunnerRefs = {
    engineRef,
    editorRef,
    tabsRef,
    activeTabIdRef,
    activeDbIdRef,
    addHistoryEntry,
  };
  const {
    runSqlForTab,
    handleLoadPage,
    handleLoadMorePage,
    handleFetchAllRows,
    runActiveTab,
    runSelection,
    runCurrentSelection,
    openTabAndRun,
    previewTable,
    handleResultSetExport,
    deleteRowsFromTable,
    updateRowsInTable,
    duplicateRowInTable,
    showToast,
    quoteIdent,
  } = useQueryRunner(queryRunnerRefs);

  const {
    refreshEntityMetadata,
    refreshTableMetadata,
    describeEntity,
    countEntityRows,
    copyEntityName,
    dropEntity,
    dropLeafEntity,
    confirmDrop,
    viewLeafDDL,
    truncateEntity,
    confirmTruncate,
    openModifyStructure,
    submitModifyStructure,
    openAddRow,
    submitAddRow,
    openAddTable,
    submitAddTable,
    viewDDL,
    exportEntityToFormat,
    getEntityRowCount,
    toggleEntityExpanded,
    expandAllEntities,
    collapseAllEntities,
  } = useSidebarActions(
    { engineRef, activeTabIdRef, activeDbIdRef },
    openTabAndRun,
  );

  const {
    addTab,
    openErDiagramTab,
    openQueryHistoryTab,
    closeTab,
    confirmCloseTab,
    renameTab,
    duplicateTab,
    closeOtherTabs,
    closeAllTabs,
    handleTabDragStart,
    handleTabDragEnd,
    resetTabsForCurrentDb,
  } = useTabManagement(
    { editorRef, tabsRef, activeTabIdRef, activeDbIdRef, tabHistoryRef },
    refreshTableMetadata,
  );

  const {
    applyDbLoad,
    performDbSwitch,
    performBlankLoad,
    performImportSqlite,
    requestDbSwitch,
    exportDatabase,
    exportDatabaseToXlsx,
    handleCsvFile,
    submitCsvImport,
    handleJsonFile,
    submitJsonImport,
    handleParquetFile,
    submitParquetImport,
  } = useDatabaseActions({ ...queryRunnerRefs, pragmaSettingsRef });

  // ─── Settings setters (persist to localStorage) ──────────────────────
  const setFontSize = useCallback(
    (n: number) => {
      setFontSizeState(n);
      persistAsync(storageKey("fontsize"), String(n));
    },
    [setFontSizeState],
  );
  const setOutputFontSizeEnabled = useCallback(
    (b: boolean) => {
      setOutputFontSizeEnabledState(b);
      persistAsync(storageKey("outputfontsize_enabled"), String(b));
    },
    [setOutputFontSizeEnabledState],
  );
  const setOutputFontSize = useCallback(
    (n: number) => {
      setOutputFontSizeState(n);
      persistAsync(storageKey("outputfontsize"), String(n));
    },
    [setOutputFontSizeState],
  );
  const setEditorTheme = useCallback(
    (t: string) => {
      setEditorThemeState(t);
      setStoredEditorTheme(t);
    },
    [setEditorThemeState],
  );
  const setWordWrap = useCallback(
    (b: boolean) => {
      setWordWrapState(b);
      persistAsync(storageKey("wordwrap"), String(b));
    },
    [setWordWrapState],
  );
  const setClearBeforeRun = useCallback(
    (b: boolean) => {
      setClearBeforeRunState(b);
      persistAsync(storageKey("clearbeforerun"), String(b));
    },
    [setClearBeforeRunState],
  );

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
        localStorage.setItem(storageKey("pragma_pagesize"), String(p.pageSize));
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
        void applyPragmasToEngine(engineRef.current, p);
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

  const handleFormatCode = useCallback(async () => {
    const view = editorRef.current;
    if (!view) return;
    const code = view.state.doc.toString();
    if (!code.trim()) return;
    setIsFormatting(true);
    try {
      const { format: sqlFormat } = await import("sql-formatter");
      const formatted = sqlFormat(code, { language: "sqlite" });
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: formatted },
      });
    } catch {
      // silently ignore formatting errors (e.g. unparseable SQL)
    } finally {
      setIsFormatting(false);
    }
  }, []);

  // ─── Loading overlay fade-out ────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const id = window.setTimeout(() => setShowLoadingOverlay(false), 400);
    return () => window.clearTimeout(id);
  }, [loaded]);

  // When tabs are closed (or replaced wholesale), drop any result
  // entries whose owning tab no longer exists.
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setResultsByTab((prev) => {
      const ids = new Set(tabs.map((t) => t.id));
      let changed = false;
      const next: typeof prev = {};
      for (const k of Object.keys(prev)) {
        if (ids.has(k)) {
          next[k] = prev[k];
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [tabs, setResultsByTab]);

  // ─── Hydrate persisted settings + db selection on mount ──────────────
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
        localStorage.getItem(storageKey("pragma_journalmode")) ??
        DP.journalMode,
      synchronous:
        localStorage.getItem(storageKey("pragma_synchronous")) ??
        DP.synchronous,
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
    setActiveDbId,
    setTabs,
    setActiveTabId,
  ]);

  // ─── Boot the engine and CodeMirror ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    if (editorHostRef.current && !editorRef.current) {
      const initialTheme =
        getStoredEditorTheme(storageKey("editortheme")) ?? "lucario";
      const initialWordWrap =
        localStorage.getItem(storageKey("wordwrap")) !== "false";
      const compartments = makeSqlEditorCompartments();

      const view = new EditorView({
        doc: "",
        parent: editorHostRef.current,
        extensions: createSqlEditorExtensions({
          dialect: "sqlite",
          compartments,
          initialTheme,
          initialWordWrap,
          onSelectionChange: (hasSelection) => {
            setHasEditorSelectionRef.current(hasSelection);
          },
          onDocChange: (code) => {
            const id = activeTabIdRef.current;
            if (!id) return;
            const next = tabsRef.current.map((t) =>
              t.id === id ? { ...t, code } : t,
            );
            tabsRef.current = next;
            setTabs(next);
            saveTabs(activeDbIdRef.current, next);
          },
          onRunSelection: (text) => runSelectionRef.current(text),
          onRunAll: () => runRef.current(),
        }),
      });

      editorRef.current = view;
      themeCompRef.current = compartments.theme;
      wrapCompRef.current = compartments.wrap;
      completionCompRef.current = compartments.completion;
      sqlLangCompRef.current = compartments.lang;
    }

    (async () => {
      try {
        setLoadingMessage("Loading SQLite engine…");
        const initialSampleId =
          localStorage.getItem(storageKey("db")) ??
          SQLITE_SAMPLE_DATABASES[0].id;
        const engine = await sqliteAdapter.createEngine(initialSampleId);
        if (cancelled) return;
        engineRef.current = engine;
        setEngineForRender(engine);

        // Apply any user-saved pragma settings to the freshly-initialised
        // database. pragmaSettingsRef is already populated from the
        // localStorage hydration effect that runs synchronously on mount.
        await applyPragmasToEngine(engine, pragmaSettingsRef.current);

        const sample = await engine.activeSample();
        setActiveDbId(sample.id);
        const [nextTables, nextViews, nextIndexes, nextTriggers] = await Promise.all([
          engine.listTables(),
          engine.listViews(),
          engine.listIndexes(),
          engine.listTriggers(),
        ]);
        setTables(nextTables);
        setViews(nextViews);
        setIndexes(nextIndexes);
        setTriggers(nextTriggers);

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  useEffect(() => {
    const engine = engineRef.current;
    const view = editorRef.current;
    const sqlComp = sqlLangCompRef.current;
    const completionComp = completionCompRef.current;
    if (!engine || !view || !sqlComp || !completionComp) return;
    let cancelled = false;
    void (async () => {
      const schema: Record<string, string[]> = {};
      const completionSchema: SqlCompletionSchema = { entities: [] };
      for (const name of tables) {
        try {
          schema[name] = (await engine.listColumns(name)).map((c) => c.name);
        } catch {
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
          schema[name] = (await engine.listColumns(name)).map((c) => c.name);
        } catch {
          schema[name] = [];
        }
        completionSchema.entities.push({
          name,
          columns: schema[name],
          kind: "view",
        });
      }
      if (cancelled) return;
      const langExt = await makeSqlLangExtension("sqlite", schema);
      if (cancelled) return;
      view.dispatch({
        effects: [
          sqlComp.reconfigure(langExt),
          completionComp.reconfigure(
            makeSqlAutocompletionExtension(completionSchema, "sqlite"),
          ),
        ],
      });
    })();
    return () => {
      cancelled = true;
    };
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
    // operation. Skip tabs whose editor pane is hidden.
    const tab = tabsRef.current.find((t) => t.id === activeTabId);
    if (
      tab?.kind !== "er-diagram" &&
      tab?.kind !== "view-data" &&
      tab?.kind !== "query-history"
    ) {
      view?.focus();
    }
    // Only rerun when the active tab id changes, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, loaded]);

  // Keep runRef / runSelectionRef in sync with the latest callbacks.
  useEffect(() => {
    runRef.current = () => {
      runActiveTab();
    };
    runSelectionRef.current = (sql: string) => {
      runSelection(sql);
    };
  }, [runActiveTab, runSelection]);

  // Hydrate sidebar collapse state for the active database.
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
  }, [
    activeDbId,
    setTablesSectionExpanded,
    setViewsSectionExpanded,
    setExpandedEntities,
    setColumnsByEntity,
    setForeignKeysByEntity,
  ]);

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

  // PK / FK lookups for the current result's source table.
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

  // Lazy-load (and re-load) metadata for every currently-expanded
  // sidebar entity that has no cached `columnsByEntity` entry.
  // Use `engineForRender` (local state, null on every mount) as the
  // trigger so that returning from another playground re-fetches columns
  // even when the Zustand `loaded` flag was already true.
  useEffect(() => {
    if (expandedEntities.size === 0) return;
    if (!engineForRender) return;
    for (const name of expandedEntities) {
      if (columnsByEntity[name] === undefined) {
        refreshEntityMetadata(name);
      }
    }
  }, [
    expandedEntities,
    columnsByEntity,
    refreshEntityMetadata,
    engineForRender,
  ]);

  // ─── Resizer (vertical, between results panel and editor) ────────────
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
  // view-data or er-diagram mode.
  useEffect(() => {
    const panes = panesRef.current;
    if (!panes) return;
    if (activeTab?.kind === "view-data" || activeTab?.kind === "er-diagram") {
      panes.style.gridTemplateRows = "";
    }
  }, [activeTab?.kind]);

  // ─── Sidebar resizer (horizontal, between sidebar and panes) ─────────
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

  // ─── Loading-screen quip rotator ─────────────────────────────────────
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

  // ─── Computed values ─────────────────────────────────────────────────
  const activeSample = useMemo(() => {
    const base =
      customDb?.id === activeDbId ? customDb : findSampleDatabase(activeDbId);
    const overrideName = customFilenames[activeDbId];
    if (overrideName) return { ...base, filename: overrideName };
    return base;
  }, [activeDbId, customDb, customFilenames]);

  const tabDragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const draggingTab = draggingTabId
    ? tabs.find((t) => t.id === draggingTabId) ?? null
    : null;

  const onTabDragStart = useCallback(
    (event: DragStartEvent) => {
      setDraggingTabId(String(event.active.id));
      handleTabDragStart(event);
    },
    [handleTabDragStart],
  );

  const onTabDragEnd = useCallback(
    (event: Parameters<typeof handleTabDragEnd>[0]) => {
      setDraggingTabId(null);
      handleTabDragEnd(event);
    },
    [handleTabDragEnd],
  );

  const onTabDragCancel = useCallback(() => {
    setDraggingTabId(null);
  }, []);

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

  const resultConstraintInfo = useMemo<
    ColumnConstraintInfo[] | undefined
  >(() => {
    const tableName = result?.sourceTable;
    if (!tableName) return undefined;
    return constraintsByEntity[tableName];
  }, [result, constraintsByEntity]);

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
              <img
                src="/dataslope-logo-blue.svg"
                alt="Dataslope logo"
                className="brand-logo"
              />
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
                  const factor =
                    PLAYGROUND_ICON_SIZE_FACTOR[PLAYGROUND_ID] ?? 1;
                  return Icon ? (
                    <span
                      className="playground-switcher-lang-icon"
                      style={{ color: "var(--text)" }}
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
                    <div className="import-section-label">Database</div>
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
                    <div className="import-section-label">Tables</div>
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
                        <div className="ex-desc">
                          Add table from Parquet file
                        </div>
                      </div>
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
            {tables.length === 0 && loaded ? (
              <Popover.Root
                open={exportNoTabsHover}
                onOpenChange={setExportNoTabsHover}
              >
                <div
                  style={{ cursor: "not-allowed" }}
                  onMouseEnter={() => setExportNoTabsHover(true)}
                  onMouseLeave={() => setExportNoTabsHover(false)}
                  onFocus={() => setExportNoTabsHover(true)}
                  onBlur={() => setExportNoTabsHover(false)}
                  tabIndex={0}
                  role="button"
                  aria-disabled="true"
                  aria-label="Export (create a table to enable)"
                >
                  <Popover.Trigger
                    className="header-btn"
                    disabled
                    style={{ pointerEvents: "none" }}
                    title="Export database"
                    aria-label="Export"
                  >
                    <ArrowDownToLine size={14} aria-hidden="true" />
                    <span className="btn-label">Export DB</span>
                  </Popover.Trigger>
                </div>
                <Popover.Portal>
                  <Popover.Positioner
                    sideOffset={6}
                    align="start"
                    className="sql-export-disabled-positioner"
                  >
                    <Popover.Popup className="bui-popup sql-export-disabled-popup">
                      Create a table to export the database
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>
            ) : (
              <Menu.Root>
                <Menu.Trigger
                  className="header-btn"
                  title="Export database"
                  aria-label="Export"
                  disabled={!loaded}
                >
                  <ArrowDownToLine size={14} aria-hidden="true" />
                  <span className="btn-label">Export DB</span>
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner sideOffset={6} align="start">
                    <Menu.Popup className="bui-popup examples-dropdown export-dropdown">
                      <div className="sql-result-export-group-label">
                        SQLite Database
                      </div>
                      <Menu.Item
                        className="example-item export-item"
                        onClick={exportDatabase}
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
                      >
                        <div className="export-item-text">
                          <div className="ex-title">
                            Excel Workbook
                            <span className="ext-badge">.xlsx</span>
                          </div>
                          <div className="ex-desc">One sheet per table</div>
                        </div>
                      </Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
            )}
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

        <SqlSettingsPanel
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
          onClose={() => setSettingsOpen(false)}
          onRestoreDefaults={() => setConfirmRestoreOpen(true)}
          onClearLocalStorage={() => setConfirmClearStorageOpen(true)}
          resetTabsLabel={`Reset query tabs for ${activeSample.label}`}
          onResetTabs={resetTabsForCurrentDb}
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

        <SwitchDatabaseDialog
          open={pendingDbId !== null}
          onOpenChange={(next) => { if (!next) setPendingDbId(null); }}
          currentDbFilename={activeSample.filename}
          onConfirm={() => {
            if (pendingDbId) performDbSwitch(pendingDbId);
            setPendingDbId(null);
          }}
        />

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

        <SqlSettingsConfirmDialogs
          dialectDisplayName="SQLite"
          restoreOpen={confirmRestoreOpen}
          onRestoreOpenChange={setConfirmRestoreOpen}
          onRestoreConfirm={restoreDefaultSettings}
          clearStorageOpen={confirmClearStorageOpen}
          onClearStorageOpenChange={setConfirmClearStorageOpen}
          onClearStorageConfirm={clearAllLocalStorage}
        />

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
                Drop{" "}
                {pendingDropEntity
                  ? DROP_KIND_LABELS[pendingDropEntity.kind]
                  : ""}
                ?
              </AlertDialog.Title>
              <AlertDialog.Description className="confirm-desc">
                Drop{" "}
                {pendingDropEntity
                  ? DROP_KIND_LABELS[pendingDropEntity.kind].toLowerCase()
                  : ""}{" "}
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

        <ImportBinaryFileDialog
          open={importSqliteOpen}
          dragging={importSqliteDragging}
          onClose={() => setImportSqliteOpen(false)}
          onDraggingChange={setImportSqliteDragging}
          onImport={(data, filename) => performImportSqlite(data, filename)}
          title="Import SQLite File"
          description={
            <>
              Open a local <code>.sqlite</code> or <code>.db</code> file as a
              new in-memory database.
            </>
          }
          warningText={
            <>
              This is a playground environment. Your file will{" "}
              <strong>not</strong> be uploaded or persisted — it is only loaded
              into browser memory and will be gone on reload.
            </>
          }
          dropText="Drop a SQLite file here"
          browseHint="or click to browse — .sqlite, .db"
          accept=".sqlite,.db,.sqlite3"
          inputAriaLabel="Choose SQLite file"
        />

        <RenameDatabaseDialog
          open={renameDbOpen}
          name={renameDbBaseName}
          ext={renameDbExt}
          extensionOptions={[
            { value: ".sqlite", label: ".sqlite (most common)" },
            ".db",
            ".sqlite3",
            ".db3",
          ]}
          onNameChange={setRenameDbBaseName}
          onExtChange={setRenameDbExt}
          onClose={() => setRenameDbOpen(false)}
          description="Choose a new filename for the current database."
          onConfirm={(newFilename) => {
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
        />

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
                            prev
                              ? { ...prev, targetMode: "new", colCompare: null }
                              : null,
                          )
                        }
                      >
                        New table
                      </button>
                      <button
                        type="button"
                        className={`sql-import-mode-btn${importCsvState.targetMode === "existing" ? " active" : ""}`}
                        disabled={tables.length === 0}
                        onClick={() => {
                          void (async () => {
                            const targetTable =
                              importCsvState.targetTable || tables[0] || "";
                            const tableCols =
                              (await engineRef.current?.listColumns(targetTable)) ?? [];
                            setImportCsvState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  targetMode: "existing",
                                  targetTable,
                                  colCompare: computeImportColComparison(
                                    prev.headers,
                                    tableCols,
                                  ),
                                  }
                                : null,
                            );
                          })();
                        }}
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
                            prev
                              ? { ...prev, tableName: e.target.value }
                              : null,
                          )
                        }
                        placeholder="Table name"
                        autoFocus
                      />
                    ) : (
                      <select
                        className="sql-import-target-select"
                        value={importCsvState.targetTable}
                        onChange={(e) => {
                          const newTable = e.target.value;
                          void (async () => {
                            const tableCols =
                              (await engineRef.current?.listColumns(newTable)) ?? [];
                            setImportCsvState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  targetTable: newTable,
                                  colCompare: computeImportColComparison(
                                    prev.headers,
                                    tableCols,
                                  ),
                                  }
                                : null,
                            );
                          })();
                        }}
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
                  {importCsvState.targetMode === "existing" &&
                  importCsvState.colCompare ? (
                    <div className="sql-import-col-compare">
                      <table>
                        <thead>
                          <tr>
                            <th>File column</th>
                            <th>Table column</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importCsvState.colCompare.map((r, i) => (
                            <tr key={i}>
                              <td>{r.fileCol ?? <em>—</em>}</td>
                              <td>{r.tableCol ?? <em>—</em>}</td>
                              <td className={`cmp-${r.status}`}>
                                {IMPORT_COL_STATUS_LABEL[r.status]}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
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
                  )}
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
                    {importCsvState.rows.length > 5 &&
                      importCsvState.targetMode === "new" &&
                      ` · showing first 5`}
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
                Parse a JSON array of objects and import its rows into a new or
                existing table.
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
                            prev
                              ? { ...prev, targetMode: "new", colCompare: null }
                              : null,
                          )
                        }
                      >
                        New table
                      </button>
                      <button
                        type="button"
                        className={`sql-import-mode-btn${importJsonState.targetMode === "existing" ? " active" : ""}`}
                        disabled={tables.length === 0}
                        onClick={() => {
                          void (async () => {
                            const targetTable =
                              importJsonState.targetTable || tables[0] || "";
                            const tableCols =
                              (await engineRef.current?.listColumns(targetTable)) ?? [];
                            setImportJsonState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  targetMode: "existing",
                                  targetTable,
                                  colCompare: computeImportColComparison(
                                    prev.headers,
                                    tableCols,
                                  ),
                                }
                              : null,
                            );
                          })();
                        }}
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
                            prev
                              ? { ...prev, tableName: e.target.value }
                              : null,
                          )
                        }
                        placeholder="Table name"
                        autoFocus
                      />
                    ) : (
                      <select
                        className="sql-import-target-select"
                        value={importJsonState.targetTable}
                        onChange={(e) => {
                          const newTable = e.target.value;
                          void (async () => {
                            const tableCols =
                              (await engineRef.current?.listColumns(newTable)) ?? [];
                            setImportJsonState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  targetTable: newTable,
                                  colCompare: computeImportColComparison(
                                    prev.headers,
                                    tableCols,
                                  ),
                                }
                              : null,
                            );
                          })();
                        }}
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
                  {importJsonState.targetMode === "existing" &&
                  importJsonState.colCompare ? (
                    <div className="sql-import-col-compare">
                      <table>
                        <thead>
                          <tr>
                            <th>File column</th>
                            <th>Table column</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importJsonState.colCompare.map((r, i) => (
                            <tr key={i}>
                              <td>{r.fileCol ?? <em>—</em>}</td>
                              <td>{r.tableCol ?? <em>—</em>}</td>
                              <td className={`cmp-${r.status}`}>
                                {IMPORT_COL_STATUS_LABEL[r.status]}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
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
                  )}
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
                    {importJsonState.rows.length > 5 &&
                      importJsonState.targetMode === "new" &&
                      ` · showing first 5`}
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
              setImportParquetState(null);
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
                Read a Parquet file and add its rows into a new or existing
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
              {!importParquetState ? (
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
                      if (file) handleParquetFile(file);
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
                        className={`sql-import-mode-btn${importParquetState.targetMode === "new" ? " active" : ""}`}
                        onClick={() =>
                          setImportParquetState((prev) =>
                            prev
                              ? { ...prev, targetMode: "new", colCompare: null }
                              : null,
                          )
                        }
                      >
                        New table
                      </button>
                      <button
                        type="button"
                        className={`sql-import-mode-btn${importParquetState.targetMode === "existing" ? " active" : ""}`}
                        disabled={tables.length === 0}
                        onClick={() => {
                          void (async () => {
                            const targetTable =
                              importParquetState.targetTable || tables[0] || "";
                            const tableCols =
                              (await engineRef.current?.listColumns(targetTable)) ?? [];
                            setImportParquetState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  targetMode: "existing",
                                  targetTable,
                                  colCompare: computeImportColComparison(
                                    prev.columns,
                                    tableCols,
                                  ),
                                }
                              : null,
                            );
                          })();
                        }}
                      >
                        Existing table
                      </button>
                    </div>
                    {importParquetState.targetMode === "new" ? (
                      <input
                        id="parquet-table-name"
                        className="sql-rename-input"
                        value={importParquetState.tableName}
                        onChange={(e) =>
                          setImportParquetState((prev) =>
                            prev
                              ? { ...prev, tableName: e.target.value }
                              : null,
                          )
                        }
                        placeholder="Table name"
                        autoFocus
                      />
                    ) : (
                      <select
                        className="sql-import-target-select"
                        value={importParquetState.targetTable}
                        onChange={(e) => {
                          const newTable = e.target.value;
                          void (async () => {
                            const tableCols =
                              (await engineRef.current?.listColumns(newTable)) ?? [];
                            setImportParquetState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  targetTable: newTable,
                                  colCompare: computeImportColComparison(
                                    prev.columns,
                                    tableCols,
                                  ),
                                }
                              : null,
                            );
                          })();
                        }}
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
                  {importParquetState.targetMode === "existing" &&
                  importParquetState.colCompare ? (
                    <div className="sql-import-col-compare">
                      <table>
                        <thead>
                          <tr>
                            <th>File column</th>
                            <th>Table column</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importParquetState.colCompare.map((r, i) => (
                            <tr key={i}>
                              <td>{r.fileCol ?? <em>—</em>}</td>
                              <td>{r.tableCol ?? <em>—</em>}</td>
                              <td className={`cmp-${r.status}`}>
                                {IMPORT_COL_STATUS_LABEL[r.status]}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="sql-import-preview">
                      <table>
                        <thead>
                          <tr>
                            {importParquetState.columns.map((h) => (
                              <th key={h}>{h || "(empty)"}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importParquetState.rows.slice(0, 5).map((row, i) => (
                            <tr key={i}>
                              {row.map((cell, j) => (
                                <td key={j}>
                                  {cell === null ? <em>NULL</em> : String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-dim)",
                      marginBottom: 8,
                    }}
                  >
                    {importParquetState.rows.length} row
                    {importParquetState.rows.length === 1 ? "" : "s"} ·{" "}
                    {importParquetState.columns.length} column
                    {importParquetState.columns.length === 1 ? "" : "s"}
                    {importParquetState.rows.length > 5 &&
                      importParquetState.targetMode === "new" &&
                      ` · showing first 5`}
                  </div>
                </>
              )}
              <div className="confirm-actions" style={{ marginTop: 16 }}>
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                {importParquetState && (
                  <button
                    type="button"
                    className="confirm-btn confirm-btn-primary"
                    onClick={submitParquetImport}
                  >
                    Import
                  </button>
                )}
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        <DdlViewerDialog
          open={ddlDialog !== null}
          onOpenChange={(next) => { if (!next) setDdlDialog(null); }}
          title={ddlDialog?.title ?? ""}
          sql={ddlDialog?.sql ?? ""}
          theme={editorTheme}
          description={
            <>
              Read-only view of the original <code>CREATE</code> statement(s)
              recorded in <code>sqlite_master</code>.
            </>
          }
          onCopied={() => showToast("Copied DDL to clipboard.")}
          onCopyFailed={() => showToast("Couldn't copy to clipboard.", "warn")}
        />

        <Dialog.Root
          open={modifyDialog !== null}
          onOpenChange={(next) => {
            if (!next) {
              setModifyDialog(null);
              setModifyInvalidColIds(new Set());
              setModifyStructureTab("columns");
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop sql-modify-backdrop" />
            <Dialog.Popup className="sql-modify-drawer">
              <header className="sql-modify-drawer-header">
                <div className="sql-modify-drawer-heading">
                  <Dialog.Title className="sql-modify-drawer-title">
                    View/Edit Structure
                  </Dialog.Title>
                  <Dialog.Description className="sql-modify-drawer-subtitle">
                    <Table size={12} className="sql-modify-drawer-entity-icon" aria-hidden="true" />
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
                    setModifyDialog({
                      ...next,
                      originalSignature: modifyDialog!.originalSignature,
                    });
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
                  activeTab={
                    modifyStructureTab as
                      | "columns"
                      | "indexes"
                      | "triggers"
                      | undefined
                  }
                  onTabChange={setModifyStructureTab}
                  refreshKey={modifyStructureRefreshKey}
                />
              )}
              {modifyStructureTab === "columns" && (
                <footer className="sql-modify-drawer-footer">
                  <button
                    type="button"
                    className="confirm-btn confirm-btn-danger sql-modify-drawer-drop"
                    onClick={() => {
                      const name = modifyDialog?.originalName;
                      setModifyDialog(null);
                      setModifyInvalidColIds(new Set());
                      setModifyStructureTab("columns");
                      if (name) dropEntity(name, "table");
                    }}
                  >
                    Drop Table
                  </button>
                  <Dialog.Close className="confirm-btn confirm-btn-secondary">
                    Cancel
                  </Dialog.Close>
                  <button
                    type="button"
                    className="confirm-btn confirm-btn-primary"
                    onClick={submitModifyStructure}
                    disabled={
                      !modifyDialog ||
                      modifyDialogSignature(modifyDialog) ===
                        modifyDialog.originalSignature
                    }
                  >
                    Save
                  </button>
                </footer>
              )}
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
                    {addRowDialog.columns.map((c) => {
                      const hasDefault = c.defaultValue !== null;
                      const placeholder = hasDefault
                        ? `auto (${c.defaultValue})`
                        : c.notNull
                          ? "required"
                          : "NULL if empty";
                      return (
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
                            placeholder={placeholder}
                            aria-label={c.name}
                          />
                        </label>
                      );
                    })}
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
                    setAddTableDialog({
                      ...next,
                      originalSignature: addTableDialog!.originalSignature,
                    });
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
                <DatabaseSelector
                  value={activeDbId}
                  displayFilename={activeSample.filename}
                  samples={SQLITE_SAMPLE_DATABASES}
                  actions={SQLITE_DB_ACTIONS}
                  onChange={(value) => {
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
                        const knownExts = [
                          ".sqlite",
                          ".db",
                          ".sqlite3",
                          ".db3",
                        ];
                        setRenameDbExt(
                          knownExts.includes(ext) ? ext : ".sqlite",
                        );
                      } else {
                        setRenameDbBaseName(cur);
                        setRenameDbExt(".sqlite");
                      }
                      setRenameDbOpen(true);
                      return;
                    }
                    requestDbSwitch(value);
                  }}
                />
              </div>
            </div>

            <div className="sql-tree">
              <SchemaSection
                label="Tables"
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
                label="Views"
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
                label="Indexes"
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
                label="Triggers"
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
                className="sql-sidebar-btn"
                onClick={openErDiagramTab}
                title="View ER Diagram"
                aria-label="View ER Diagram"
              >
                <Network size={13} aria-hidden="true" />
                <span>ER Diagram</span>
              </button>
              <button
                type="button"
                className="sql-sidebar-btn"
                onClick={openQueryHistoryTab}
                title="View Query History"
                aria-label="View Query History"
              >
                <History size={13} aria-hidden="true" />
                <span>History</span>
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
            className={`sql-panes${activeTab?.kind === "view-data" ? " sql-panes--view-data" : ""}${activeTab?.kind === "er-diagram" ? " sql-panes--er-diagram" : ""}${activeTab?.kind === "query-history" ? " sql-panes--query-history" : ""}`}
            ref={panesRef}
          >
            <SqlTabBar
              tabs={tabs}
              activeTabId={activeTabId}
              draggingTab={draggingTab}
              tabDragSensors={tabDragSensors}
              onDragStart={onTabDragStart}
              onDragEnd={onTabDragEnd}
              onDragCancel={onTabDragCancel}
              onTabActivate={(tabId) => {
                const prevId = activeTabIdRef.current;
                if (prevId !== tabId) {
                  tabHistoryRef.current = pushTabHistory(
                    tabHistoryRef.current,
                    prevId,
                    tabId,
                  );
                }
                activeTabIdRef.current = tabId;
                setActiveTabId(tabId);
                // Re-click the already-active tab: focus the editor so
                // typing works immediately without a second click.
                const tab = tabs.find((t) => t.id === tabId);
                if (
                  prevId === tabId &&
                  tab?.kind !== "er-diagram" &&
                  tab?.kind !== "view-data" &&
                  tab?.kind !== "query-history"
                ) {
                  editorRef.current?.focus();
                }
              }}
              onTabClose={closeTab}
              onTabRename={renameTab}
              onTabDuplicate={duplicateTab}
              onTabCloseOthers={closeOtherTabs}
              onTabCloseAll={closeAllTabs}
              onAddTab={addTab}
            />

            <div
              className="sql-editor-pane"
              ref={editorPaneRef}
              style={
                activeTab?.kind === "view-data" ||
                activeTab?.kind === "er-diagram" ||
                activeTab?.kind === "query-history"
                  ? { display: "none" }
                  : undefined
              }
            >
              <div className="editor-wrap" ref={editorHostRef} />
              <div className="sql-editor-corner-actions">
                <Popover.Root
                  open={isFormatting ? false : formatPopoverOpen}
                  onOpenChange={setFormatPopoverOpen}
                >
                  <Popover.Trigger
                    openOnHover
                    delay={150}
                    closeDelay={100}
                    render={(triggerProps) => (
                      <button
                        {...triggerProps}
                        type="button"
                        className="sql-editor-corner-btn"
                        aria-label="Format code"
                        aria-busy={isFormatting}
                        disabled={!loaded || isFormatting}
                        onClick={() => void handleFormatCode()}
                      >
                        {isFormatting ? (
                          <svg
                            viewBox="0 0 13 13"
                            width={13}
                            height={13}
                            className="run-btn-spinner"
                            aria-hidden="true"
                          >
                            <circle
                              cx="6.5"
                              cy="6.5"
                              r="5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeDasharray="15 9"
                            />
                          </svg>
                        ) : (
                          <Wand2 size={13} aria-hidden="true" />
                        )}
                      </button>
                    )}
                  />
                  <Popover.Portal>
                    <Popover.Positioner
                      sideOffset={6}
                      align="center"
                      side="bottom"
                      className="sql-corner-positioner"
                    >
                      <Popover.Popup className="bui-popup sql-corner-popover">
                        Format code
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
                <div className="sql-editor-corner-sep" aria-hidden="true" />
                <Popover.Root>
                  <Popover.Trigger
                    openOnHover
                    delay={150}
                    closeDelay={100}
                    render={(triggerProps) => (
                      <button
                        {...triggerProps}
                        type="button"
                        className="sql-editor-corner-btn"
                        aria-label="View Query History"
                        onClick={openQueryHistoryTab}
                      >
                        <History size={13} aria-hidden="true" />
                      </button>
                    )}
                  />
                  <Popover.Portal>
                    <Popover.Positioner
                      sideOffset={6}
                      align="center"
                      side="bottom"
                      className="sql-corner-positioner"
                    >
                      <Popover.Popup className="bui-popup sql-corner-popover">
                        Query history
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
              </div>
              <SqlEditorToolbar
                loaded={loaded}
                running={statusState === "running"}
                hasEditorSelection={hasEditorSelection}
                isMac={isMac}
                onRunSelection={runCurrentSelection}
                onRunAll={runActiveTab}
              />
            </div>

            <div
              className="sql-resizer"
              ref={resizerRef}
              role="separator"
              aria-orientation="horizontal"
              aria-label="Drag to resize editor and results"
              title="Drag to resize"
              style={
                activeTab?.kind === "view-data" ||
                activeTab?.kind === "er-diagram" ||
                activeTab?.kind === "query-history"
                  ? { display: "none" }
                  : undefined
              }
            />

            <div
              className="sql-results-pane"
              ref={resultsPaneRef}
              style={
                activeTab?.kind === "er-diagram" ||
                activeTab?.kind === "query-history"
                  ? { display: "none" }
                  : undefined
              }
            >
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
                  onLoadMorePage={handleLoadMorePage}
                  onExportSnapshotChange={setResultSetExportSnapshot}
                  onExportResultSet={handleResultSetExport}
                  onOpenQueryTab={(title, sql) => openTabAndRun(title, sql)}
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

            {activeTab?.kind === "query-history" && (
              <div className="sql-er-pane">
                <QueryHistoryPane
                  history={queryHistory}
                  theme={editorTheme}
                  isPostgres={false}
                  onClear={clearHistory}
                  onOpenQueryTab={(title, sql) => openTabAndRun(title, sql)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
