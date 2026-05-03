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
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS as DndCSS } from "@dnd-kit/utilities";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import "./playground.css";
import "./sqlPlayground.css";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/theme/monokai.css";
import "codemirror/theme/material-darker.css";
import "codemirror/theme/material-palenight.css";
import "codemirror/theme/nord.css";
import "codemirror/theme/tomorrow-night-eighties.css";
import "codemirror/theme/solarized.css";
import "codemirror/theme/eclipse.css";
import "codemirror/theme/mdn-like.css";
import "codemirror/theme/ayu-mirage.css";
import "codemirror/theme/gruvbox-dark.css";
import "codemirror/theme/oceanic-next.css";
import "codemirror/theme/panda-syntax.css";
import "codemirror/theme/darcula.css";
import "codemirror/theme/zenburn.css";
import "codemirror/theme/lucario.css";
import "codemirror/theme/idea.css";
import "codemirror/theme/base16-light.css";
import "codemirror/addon/hint/show-hint.css";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Popover } from "@base-ui-components/react/popover";
import { AlertDialog } from "@base-ui-components/react/alert-dialog";
import { Dialog } from "@base-ui-components/react/dialog";
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
  Clock,
  Eye,
  Database,
  FilePlus,
  FileText,
  FileJson,
  GripVertical,
  Hash,
  Network,
  Play,
  Plus,
  RotateCcw,
  Table2,
  Trash2,
  TriangleAlert,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { FaInfo } from "react-icons/fa";
import { IoLink } from "react-icons/io5";
import { MdOutlineKey } from "react-icons/md";
import type { CodeMirrorAPI, CodeMirrorEditor } from "./runtime/globals";
import type { RuntimeInfo } from "./types";
import { PLAYGROUNDS } from "./playgrounds";
import {
  LANGUAGE_ICONS as PLAYGROUND_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR as PLAYGROUND_ICON_SIZE_FACTOR,
  LANGUAGE_ICON_COLORS as PLAYGROUND_ICON_COLORS,
} from "./languageIcons";
import {
  applyMode,
  applyThemePalette,
  clearThemePalette,
  getStoredEditorTheme,
  LIGHT_THEMES,
  setStoredEditorTheme,
} from "./playgroundTheme";
import {
  DEFAULT_PLAYGROUND_SETTINGS,
  DataslopeRunOverlay,
  LOADING_QUIPS,
  RuntimeInfoContent,
  SettingsPanel,
  detectIsMac,
} from "./playgroundShared";
import {
  SQLITE_SAMPLE_DATABASES,
  findSampleDatabase,
} from "./runtime/sqliteSamples";
import {
  createSqliteEngine,
  type ColumnConstraintInfo,
  type ColumnSpec,
  type ForeignKeyInfo,
  type SqliteEngine,
  type TableColumnInfo,
} from "./runtime/sqlite";
import type { QueryExecResult } from "sql.js";
import { ErDiagramPane } from "./ErDiagramPane";
import {
  dbScopedKey,
  loadActiveTabId,
  loadTabs,
  newTabId,
  saveTabs,
  storageKey,
  tabsAreDirty,
  type QueryTab,
} from "./sqlitePlaygroundTabs";

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

const DEFAULT_PAGE_SIZE = 50;

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

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className={`toast toast-${toast.data?.kind ?? "info"}`}
    >
      <Toast.Content className="toast-content">
        <Toast.Title className="toast-title">{toast.title}</Toast.Title>
        {toast.description && (
          <Toast.Description className="toast-desc">
            {toast.description}
          </Toast.Description>
        )}
        <Toast.Close className="toast-close" aria-label="Dismiss">
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ));
}

function SqlPlaygroundInner() {
  const router = useRouter();

  // ─── Settings state (mirrors PlaygroundInner) ───────────────────────
  const [fontSize, setFontSizeState] = useState<number>(13);
  const [outputFontSizeEnabled, setOutputFontSizeEnabledState] =
    useState<boolean>(false);
  const [outputFontSize, setOutputFontSizeState] = useState<number>(13);
  const [editorTheme, setEditorThemeState] = useState<string>("lucario");
  const [wordWrap, setWordWrapState] = useState<boolean>(true);
  const [clearBeforeRun, setClearBeforeRunState] = useState<boolean>(false);

  // ─── Global page size ────────────────────────────────────────────────
  // Lifted from ResultView so that runSqlForTab can read the current
  // value synchronously (via a ref) when deciding whether to apply lazy
  // LIMIT/OFFSET pagination. A matching ref is kept in sync so the
  // callback closure always sees the latest value even if the state
  // update hasn't flushed yet.
  const [globalPageSize, setGlobalPageSizeState] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_PAGE_SIZE;
    const saved = Number(
      localStorage.getItem(storageKey("page_size")) ?? DEFAULT_PAGE_SIZE,
    );
    return PAGE_SIZE_OPTIONS.some((opt) => opt.value === saved)
      ? saved
      : DEFAULT_PAGE_SIZE;
  });
  const globalPageSizeRef = useRef(globalPageSize);
  useEffect(() => {
    globalPageSizeRef.current = globalPageSize;
  }, [globalPageSize]);
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
  }, []);

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
  type CsvImportState = {
    tableName: string;
    headers: string[];
    rows: string[][];
    rawText: string;
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
  };
  const [importJsonOpen, setImportJsonOpen] = useState(false);
  const [importJsonDragging, setImportJsonDragging] = useState(false);
  const [importJsonState, setImportJsonState] =
    useState<JsonImportState | null>(null);
  // When `activeDbId` doesn't match any entry in SQLITE_SAMPLE_DATABASES
  // (blank or imported), we store a synthetic descriptor here so the UI
  // (selector display, `activeSample`, `resetTabsForCurrentDb`) can still
  // refer to it by id without touching `findSampleDatabase`.
  const [customDb, setCustomDb] = useState<
    import("./runtime/sqliteSamples").SqliteSampleDatabase | null
  >(null);
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editorRef = useRef<CodeMirrorEditor | null>(null);
  // CodeMirror module reference, populated alongside the main editor
  // boot. Kept in a ref so dialogs that mount their own read-only
  // editors (DDL viewer) can re-use the already-loaded module without
  // a second async import. Mirrored into state for use during render
  // (see `cmApi`), since React forbids reading `ref.current` directly
  // during render.
  const codeMirrorApiRef = useRef<CodeMirrorAPI | null>(null);
  const [cmApi, setCmApi] = useState<CodeMirrorAPI | null>(null);
  // Render-time view of `engineRef`. Set once the engine boot effect
  // resolves so child components (e.g. ModifyStructureForm) can call
  // engine helpers without breaking the React refs rule.
  const [engineForRender, setEngineForRender] = useState<SqliteEngine | null>(
    null,
  );
  // Latest run handler in a ref so the editor's keymap can call it
  // without being re-bound on every render.
  const runRef = useRef<() => void>(() => undefined);
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
    const savedOutputEnabled =
      localStorage.getItem(storageKey("outputfontsize_enabled")) === "true";
    const savedOutputSize =
      Number(localStorage.getItem(storageKey("outputfontsize")) ?? savedSize) ||
      savedSize;
    const savedWordWrap =
      localStorage.getItem(storageKey("wordwrap")) !== "false";
    const savedClearBeforeRun =
      localStorage.getItem(storageKey("clearbeforerun")) === "true";
    const savedDb =
      localStorage.getItem(storageKey("db")) ?? SQLITE_SAMPLE_DATABASES[0].id;

    /* eslint-disable react-hooks/set-state-in-effect */
    setFontSizeState(savedSize);
    setOutputFontSizeEnabledState(savedOutputEnabled);
    setOutputFontSizeState(savedOutputSize);
    setEditorThemeState(savedTheme);
    setWordWrapState(savedWordWrap);
    setClearBeforeRunState(savedClearBeforeRun);
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
      `${savedOutputEnabled ? savedOutputSize : savedSize}px`,
    );

    return () => {
      document.body.classList.remove("pg-active");
      clearThemePalette();
    };
  }, []);

  // ─── Boot the engine and CodeMirror ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingMessage("Loading CodeMirror…");
        const codeMirrorMod = await import("codemirror");
        await Promise.all([
          import("codemirror/mode/sql/sql"),
          import("codemirror/addon/edit/closebrackets"),
          import("codemirror/addon/edit/matchbrackets"),
          import("codemirror/addon/comment/comment"),
          import("codemirror/addon/hint/show-hint"),
          import("codemirror/addon/hint/sql-hint"),
          import("codemirror/keymap/sublime"),
        ]);
        if (cancelled) return;

        const CM = (codeMirrorMod.default ??
          codeMirrorMod) as unknown as CodeMirrorAPI;
        codeMirrorApiRef.current = CM;
        // CodeMirror's runtime export is function-like; wrap it so React
        // stores it as a value instead of treating it as a state updater.
        setCmApi(() => CM);
        if (textareaRef.current && !editorRef.current) {
          const initialTheme =
            getStoredEditorTheme(storageKey("editortheme")) ?? "lucario";
          const initialWordWrap =
            localStorage.getItem(storageKey("wordwrap")) !== "false";
          const editor = CM.fromTextArea(textareaRef.current, {
            mode: "text/x-sqlite",
            theme: initialTheme,
            lineNumbers: true,
            indentUnit: 2,
            tabSize: 2,
            indentWithTabs: false,
            keyMap: "sublime",
            autoCloseBrackets: true,
            matchBrackets: true,
            lineWrapping: initialWordWrap,
            extraKeys: {
              "Cmd-Enter": () => runRef.current(),
              "Ctrl-Enter": () => runRef.current(),
              "Ctrl-Space": "autocomplete",
            },
          });
          editor.setSize("100%", "100%");
          editorRef.current = editor;

          // Persist whichever tab is currently active. We pull the latest
          // tab id and tab list out of refs so this listener doesn't need
          // to be re-bound every time either changes.
          editor.on("change", ((cm: CodeMirrorEditor) => {
            const id = activeTabIdRef.current;
            if (!id) return;
            const next = tabsRef.current.map((t) =>
              t.id === id ? { ...t, code: cm.getValue() } : t,
            );
            tabsRef.current = next;
            setTabs(next);
            saveTabs(activeDbIdRef.current, next);
          }) as (...args: unknown[]) => void);
        }

        setLoadingMessage("Loading SQLite engine…");
        const initialSampleId =
          localStorage.getItem(storageKey("db")) ??
          SQLITE_SAMPLE_DATABASES[0].id;
        const engine = await createSqliteEngine(initialSampleId);
        if (cancelled) return;
        engineRef.current = engine;
        setEngineForRender(engine);

        // Refresh sidebar tree against whatever sample the engine
        // ended up with (handles the case where `initialSampleId` was
        // unknown and `findSampleDatabase` fell back).
        const sample = engine.activeSample();
        setActiveDbId(sample.id);
        setTables(engine.listTables());
        setViews(engine.listViews());
        setIndexes(engine.listIndexes());
        setTriggers(engine.listTriggers());

        // Initialise the editor with the active tab's contents.
        const editor = editorRef.current;
        if (editor) {
          const t = tabsRef.current.find(
            (x) => x.id === activeTabIdRef.current,
          );
          editor.setValue(t?.code ?? "");
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
    };
  }, []);

  // Push editor-theme changes into CodeMirror after init.
  useEffect(() => {
    editorRef.current?.setOption("theme", editorTheme);
    applyThemePalette(editorTheme);
    applyMode(editorTheme);
  }, [editorTheme]);

  useEffect(() => {
    editorRef.current?.setOption("lineWrapping", wordWrap);
  }, [wordWrap]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--cm-font-size",
      `${fontSize}px`,
    );
    editorRef.current?.refresh();
  }, [fontSize]);

  useEffect(() => {
    const effective = outputFontSizeEnabled ? outputFontSize : fontSize;
    document.documentElement.style.setProperty(
      "--output-font-size",
      `${effective}px`,
    );
  }, [outputFontSizeEnabled, outputFontSize, fontSize]);

  // Swap the editor's contents whenever the active tab id changes.
  useEffect(() => {
    if (!loaded) return;
    const editor = editorRef.current;
    if (!editor || !activeTab) return;
    if (editor.getValue() !== activeTab.code) {
      editor.setValue(activeTab.code);
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
    // Only rerun when the active tab id changes, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, loaded]);

  // ─── Settings setters (persist to localStorage) ─────────────────────
  const setFontSize = useCallback((n: number) => {
    setFontSizeState(n);
    localStorage.setItem(storageKey("fontsize"), String(n));
  }, []);
  const setOutputFontSizeEnabled = useCallback((b: boolean) => {
    setOutputFontSizeEnabledState(b);
    localStorage.setItem(storageKey("outputfontsize_enabled"), String(b));
  }, []);
  const setOutputFontSize = useCallback((n: number) => {
    setOutputFontSizeState(n);
    localStorage.setItem(storageKey("outputfontsize"), String(n));
  }, []);
  const setEditorTheme = useCallback((t: string) => {
    setEditorThemeState(t);
    setStoredEditorTheme(t);
  }, []);
  const setWordWrap = useCallback((b: boolean) => {
    setWordWrapState(b);
    localStorage.setItem(storageKey("wordwrap"), String(b));
  }, []);
  const setClearBeforeRun = useCallback((b: boolean) => {
    setClearBeforeRunState(b);
    localStorage.setItem(storageKey("clearbeforerun"), String(b));
  }, []);

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
    (sample: import("./runtime/sqliteSamples").SqliteSampleDatabase) => {
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
      const editor = editorRef.current;
      if (editor) editor.setValue(newTabs[0].code);
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
        setTables(engine.listTables());
        setViews(engine.listViews());
        setIndexes(engine.listIndexes());
        setTriggers(engine.listTriggers());
        // Drop cached column metadata wholesale — the safest assumption
        // after arbitrary user SQL is that anything could have changed.
        setColumnsByEntity({});
        setForeignKeysByEntity({});
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

  const runActiveTab = useCallback(() => {
    const id = activeTabIdRef.current;
    const tab = tabsRef.current.find((t) => t.id === id);
    if (!tab) return;
    const code = editorRef.current?.getValue() ?? tab.code;
    runSqlForTab(tab.id, code, tab.title);
  }, [runSqlForTab]);

  useEffect(() => {
    runRef.current = () => {
      runActiveTab();
    };
  }, [runActiveTab]);

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
      const editor = editorRef.current;
      if (editor) editor.setValue(sql);
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
        const editor = editorRef.current;
        if (editor) editor.setValue(sql);
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
      const sample = engine.activeSample();
      const filename =
        sample.filename && /\.sqlite$/i.test(sample.filename)
          ? sample.filename
          : `${sample.id || "database"}.sqlite`;
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
  }, [showToast]);

  // ─── CSV import ───────────────────────────────────────────────────
  // Parses a CSV string into a headers array and an array of value rows.
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
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          showToast(`Could not parse CSV: ${msg}`, "warn");
        }
      };
      reader.readAsText(file);
    },
    [parseCsv, tableNameFromFilename, showToast],
  );

  const submitCsvImport = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !importCsvState) return;
    const { tableName, headers, rows } = importCsvState;
    const trimmed = tableName.trim();
    if (!trimmed) {
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
      const tableIdent = `"${trimmed.replace(/"/g, '""')}"`;
      engine.exec(
        `CREATE TABLE ${tableIdent} (${safeCols.map((c) => `${c} TEXT`).join(", ")})`,
      );
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
      setImportCsvOpen(false);
      setImportCsvState(null);
      showToast(
        `Imported ${rows.length} row${rows.length === 1 ? "" : "s"} into "${trimmed}".`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`CSV import failed: ${msg}`, "warn");
    }
  }, [importCsvState, showToast]);

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
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          showToast(`Could not parse JSON: ${msg}`, "warn");
        }
      };
      reader.readAsText(file);
    },
    [tableNameFromFilename, showToast],
  );

  const submitJsonImport = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !importJsonState) return;
    const { tableName, headers, rows } = importJsonState;
    const trimmed = tableName.trim();
    if (!trimmed) {
      showToast("Table name cannot be empty.", "warn");
      return;
    }
    try {
      const safeCols = headers.map((h) => {
        const s = h.trim().replace(/[^a-zA-Z0-9_]/g, "_") || "col";
        return `"${s.replace(/"/g, '""')}"`;
      });
      const tableIdent = `"${trimmed.replace(/"/g, '""')}"`;
      engine.exec(
        `CREATE TABLE ${tableIdent} (${safeCols.map((c) => `${c} TEXT`).join(", ")})`,
      );
      // Wrap all inserts in a single transaction for atomicity and
      // performance — a ROLLBACK on error leaves no partial table data.
      engine.exec("BEGIN");
      try {
        for (const row of rows) {
          const vals = row
            .map((v) => (v === "" ? "NULL" : `'${v.replace(/'/g, "''")}'`))
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
      setImportJsonOpen(false);
      setImportJsonState(null);
      showToast(
        `Imported ${rows.length} row${rows.length === 1 ? "" : "s"} into "${trimmed}".`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`JSON import failed: ${msg}`, "warn");
    }
  }, [importJsonState, showToast]);

  // ─── Delete selected rows ─────────────────────────────────────────
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
  const exportEntityToCsv = useCallback(
    (name: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      try {
        const sets = engine.exec(`SELECT * FROM ${quoteIdent(name)}`);
        if (!sets || sets.length === 0 || sets[0].values.length === 0) {
          showToast(`"${name}" is empty — no data to export.`, "warn");
          return;
        }
        const { columns, values } = sets[0];
        const csvRows = [
          columns.map(escapeCsvCell).join(","),
          ...values.map((row) => row.map(escapeCsvCell).join(",")),
        ];
        const csv = csvRows.join("\r\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${name}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Revoke after the browser has had a chance to start the download.
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast(`Exported ${name}.csv.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Export failed: ${msg}`, "warn");
      }
    },
    [quoteIdent, showToast],
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
    // If an ER diagram tab is already open, just switch to it.
    const existing = tabs.find((t) => t.kind === "er-diagram");
    if (existing) {
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
  }, [tabs, activeDbId, refreshTableMetadata]);

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
                code: "",
                pristineCode: "",
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
              code: "",
              pristineCode: "",
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
      { id: newTabId(), title: "Query 1", code: "", pristineCode: "" },
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
    const editor = editorRef.current;
    if (editor) editor.setValue("");
  }, [activeDbId]);

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
    const editor = editorRef.current;
    if (editor) editor.setValue(fresh[0].code);
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

  const activeSample = useMemo(
    () =>
      customDb?.id === activeDbId ? customDb : findSampleDatabase(activeDbId),
    [activeDbId, customDb],
  );

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
              <img src="/dataslope-blue@4x.png" alt="Dataslope logo" className="brand-logo" />
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
                      <span className="ext-badge">.sqlite</span>
                      <div className="export-item-text">
                        <div className="ex-title">from SQLite</div>
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
                      <span className="ext-badge">.csv</span>
                      <div className="export-item-text">
                        <div className="ex-title">from CSV</div>
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
                      <span className="ext-badge">.json</span>
                      <div className="export-item-text">
                        <div className="ex-title">from JSON</div>
                        <div className="ex-desc">Add table from JSON array</div>
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
                    <Menu.Item
                      className="example-item export-item"
                      onClick={exportDatabase}
                    >
                      <span className="ext-badge">.sqlite</span>
                      <div className="export-item-text">
                        <div className="ex-title">SQLite Database</div>
                        <div className="ex-desc">Download as .sqlite</div>
                      </div>
                    </Menu.Item>
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
              onClick={() => setSettingsOpen(true)}
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
          outputFontSizeLabel="Use Different Font Size for Results"
          clearBeforeRunLabel="Clear Results Before Running"
          onClose={() => setSettingsOpen(false)}
          onRestoreDefaults={() => setConfirmRestoreOpen(true)}
          onClearLocalStorage={() => setConfirmClearStorageOpen(true)}
          extraGeneralRows={
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
          }
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
                Parse a CSV file and add it as a new table in the current
                database.
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
                  <div className="sql-import-table-name-row">
                    <label htmlFor="csv-table-name">Table name:</label>
                    <input
                      id="csv-table-name"
                      className="sql-rename-input"
                      value={importCsvState.tableName}
                      onChange={(e) =>
                        setImportCsvState((prev) =>
                          prev ? { ...prev, tableName: e.target.value } : null,
                        )
                      }
                      autoFocus
                    />
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
                Parse a JSON array of objects and add it as a new table in the
                current database.
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
                  <div className="sql-import-table-name-row">
                    <label htmlFor="json-table-name">Table name:</label>
                    <input
                      id="json-table-name"
                      className="sql-rename-input"
                      value={importJsonState.tableName}
                      onChange={(e) =>
                        setImportJsonState((prev) =>
                          prev ? { ...prev, tableName: e.target.value } : null,
                        )
                      }
                      autoFocus
                    />
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
                cmApi={cmApi}
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
            if (!next) setModifyDialog(null);
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
                  onChange={setModifyDialog}
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
            if (!next) setAddTableDialog(null);
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
                  onChange={setAddTableDialog}
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
                    onExportCsv={exportEntityToCsv}
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
                    onExportCsv={exportEntityToCsv}
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
              <div className="sql-tabs" role="tablist">
                {tabs.map((t) => (
                  <SqlTab
                    key={t.id}
                    tab={t}
                    active={t.id === activeTabId}
                    onActivate={() => {
                      activeTabIdRef.current = t.id;
                      setActiveTabId(t.id);
                    }}
                    onClose={() => closeTab(t.id)}
                    onRename={(name) => renameTab(t.id, name)}
                    onDuplicate={() => duplicateTab(t.id)}
                    onCloseOthers={() => closeOtherTabs(t.id)}
                    onCloseAll={closeAllTabs}
                  />
                ))}
              </div>
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
              <div className="editor-wrap">
                <textarea ref={textareaRef} defaultValue="" />
              </div>
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
                <span
                  className="kbd-group"
                  title={isMac ? "Cmd + Enter" : "Ctrl + Enter"}
                >
                  <kbd className="kbd">{isMac ? "⌘" : "Ctrl"}</kbd>
                  <span className="kbd-plus" aria-hidden="true">
                    +
                  </span>
                  <kbd className="kbd">Enter</kbd>
                </span>
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
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SqlTabProps {
  tab: QueryTab;
  active: boolean;
  onActivate: () => void;
  onClose: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onCloseOthers: () => void;
  onCloseAll: () => void;
}

function SqlTab({
  tab,
  active,
  onActivate,
  onClose,
  onRename,
  onDuplicate,
  onCloseOthers,
  onCloseAll,
}: SqlTabProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState(tab.title);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const titleRef = useRef<HTMLSpanElement>(null);

  const openRename = useCallback(() => {
    setDraftTitle(tab.title);
    setRenameOpen(true);
  }, [tab.title]);

  const submitRename = useCallback(() => {
    onRename(draftTitle);
    setRenameOpen(false);
  }, [draftTitle, onRename]);

  return (
    <>
      <Dialog.Root open={renameOpen} onOpenChange={setRenameOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="confirm-backdrop" />
          <Dialog.Popup className="confirm-popup sql-rename-popup">
            <Dialog.Title className="confirm-title">
              Rename query tab
            </Dialog.Title>
            <Dialog.Description className="confirm-desc">
              Choose a short name for this query tab.
            </Dialog.Description>
            <form
              className="sql-rename-form"
              onSubmit={(e) => {
                e.preventDefault();
                submitRename();
              }}
            >
              <input
                className="sql-rename-input"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                autoFocus
              />
              <div className="confirm-actions">
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                <button
                  type="submit"
                  className="confirm-btn confirm-btn-primary"
                >
                  Rename
                </button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <ContextMenu.Root>
        <ContextMenu.Trigger
          render={(props) => (
            <button
              type="button"
              {...props}
              className={`sql-tab${active ? " active" : ""}${tab.kind === "view-data" ? " sql-tab-view-data" : ""}${tab.kind === "er-diagram" ? " sql-tab-er-diagram" : ""}`}
              onClick={onActivate}
              aria-selected={active}
              role="tab"
              onMouseEnter={() => {
                const el = titleRef.current;
                if (el && el.scrollWidth > el.clientWidth) {
                  setPopoverOpen(true);
                }
              }}
              onMouseLeave={() => setPopoverOpen(false)}
            >
              {tab.kind === "view-data" && (
                <Table2 size={11} className="sql-tab-kind-icon" aria-hidden="true" />
              )}
              {tab.kind === "er-diagram" && (
                <Network size={11} className="sql-tab-kind-icon" aria-hidden="true" />
              )}
              <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
                <Popover.Trigger
                  nativeButton={false}
                  render={<span ref={titleRef} className="sql-tab-title" />}
                >
                  {tab.title}
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Positioner
                    side="top"
                    sideOffset={6}
                    align="center"
                    className="sql-tab-name-positioner"
                  >
                    <Popover.Popup className="bui-popup sql-tab-name-popover">
                      {tab.title}
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>
              <span
                role="button"
                tabIndex={-1}
                className="sql-tab-close"
                aria-label={`Close ${tab.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                  }
                }}
              >
                <X size={10} aria-hidden="true" />
              </span>
            </button>
          )}
        />
        <ContextMenu.Portal>
          <ContextMenu.Positioner sideOffset={6}>
            <ContextMenu.Popup className="bui-popup">
              {tab.kind !== "view-data" && tab.kind !== "er-diagram" && (
                <ContextMenu.Item className="example-item" onClick={openRename}>
                  <div className="ex-title">Rename</div>
                </ContextMenu.Item>
              )}
              {tab.kind !== "er-diagram" && (
                <ContextMenu.Item className="example-item" onClick={onDuplicate}>
                  <div className="ex-title">Duplicate</div>
                </ContextMenu.Item>
              )}
              <ContextMenu.Item className="example-item" onClick={onClose}>
                <div className="ex-title">Close</div>
              </ContextMenu.Item>
              <ContextMenu.Item
                className="example-item"
                onClick={onCloseOthers}
              >
                <div className="ex-title">Close Others</div>
              </ContextMenu.Item>
              <ContextMenu.Item className="example-item" onClick={onCloseAll}>
                <div className="ex-title">Close All</div>
              </ContextMenu.Item>
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>
    </>
  );
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
}) {
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
          execute the active tab. Click any table or view in the sidebar to open
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
  return (
    <>
      <div className="sql-result-sets">
        {result.sets.map((set, idx) => {
          // ── Lazy vs. non-lazy page computation ────────────────────────
          // For lazy results (single SELECT wrapped with execPaged), the
          // set already contains only the current page's rows.  For
          // non-lazy results (multi-statement, LIMIT clause, or "All"
          // mode), we slice client-side as before.
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
            // Apply client-side sorting to the full result set before slicing,
            // keeping track of each row's original index so selection / edits
            // still target the correct absolute row.
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
            // Reset to page 0 whenever sort changes.
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
              index={idx}
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
        })}
      </div>
      <div className="sql-result-pagers">
        {result.sets.map((set, idx) => {
          const isLazy = result.lazySql !== undefined && idx === 0;
          const sorting = sortingByIndex[idx] ?? [];
          let totalRows: number;
          let currentPage: number;
          let handlePageChange: (p: number) => void;
          let handlePageSizeChange: (s: number) => void;
          if (isLazy) {
            totalRows = result.lazyTotalCount ?? set.values.length;
            currentPage = result.lazyPage ?? 0;
            const baseSql = result.lazyBaseSql ?? result.lazySql ?? "";
            let effectiveLazySql = baseSql;
            if (sorting.length > 0) {
              const parsed = parseColumnId(sorting[0].id);
              if (parsed) {
                effectiveLazySql = `${baseSql} ORDER BY ${quoteIdentSql(parsed.name)} ${sorting[0].desc ? "DESC" : "ASC"}`;
              }
            }
            handlePageChange = (p: number) =>
              onLoadPage(effectiveLazySql, p);
            handlePageSizeChange = (s: number) => {
              onSetGlobalPageSize(s);
              // For "All" (s === 0), onLoadPage triggers a non-lazy full load.
              onLoadPage(effectiveLazySql, 0);
            };
          } else {
            const st = getState(idx);
            totalRows = set.values.length;
            currentPage = st.page;
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
          return (
            <ResultPager
              key={idx}
              totalRows={totalRows}
              index={idx}
              showSetLabel={result.sets.length > 1}
              pageSize={globalPageSize}
              page={currentPage}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              deletable={pkCols !== null}
              editable={isEditable}
              editCount={editCount}
              selectedCount={selectedCount}
              onRequestDelete={() => requestDelete(idx)}
              onCommitEdits={() => commitEdits(idx, set)}
            />
          );
        })}
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
  index,
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
  index: number;
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
                  <span className="sql-result-th-label">
                    {isPk && (
                      <MdOutlineKey
                        size={12}
                        className="sql-result-th-pk"
                        aria-label="Primary key"
                      />
                    )}
                    {fk && (
                      <IoLink
                        size={12}
                        className="sql-result-th-fk"
                        aria-label={`Foreign key → ${fk.table}.${fk.to}`}
                      />
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
      {index > 0 && (
        <div className="sql-result-set-label">Result set #{index + 1}</div>
      )}
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
  knownTables,
  engine,
}: {
  state: ModifyStructureState;
  onChange: (next: ModifyStructureState) => void;
  knownTables: string[];
  engine: SqliteEngine | null;
}) {
  const [activeTab, setActiveTab] = useState<"columns" | "indexes" | "triggers">("columns");
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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
    const suffix = Math.random().toString(36).slice(2, 6);
    onChange({
      ...state,
      columns: [
        ...state.columns,
        {
          id: newDraftId(),
          originalName: null,
          name: `column_${suffix}`,
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
                      <th style={{ minWidth: "90px" }}>Type</th>
                      <th>Not null</th>
                      <th>Primary</th>
                      <th>Unique</th>
                      <th>
                        Auto-
                        <br />
                        increment
                      </th>
                      <th>Default value</th>
                      <th>FK table</th>
                      <th>FK column</th>
                      <th>On delete</th>
                      <th>On update</th>
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
            tableIndexes.map((name) => (
              <div key={name} className="sql-struct-list-item">
                <Hash size={12} className="sql-struct-list-icon" aria-hidden="true" />
                <span className="sql-struct-list-name">{name}</span>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "triggers" && (
        <div className="sql-struct-list">
          {tableTriggers.length === 0 ? (
            <div className="sql-modify-empty">No triggers.</div>
          ) : (
            tableTriggers.map((name) => (
              <div key={name} className="sql-struct-list-item">
                <Zap size={12} className="sql-struct-list-icon" aria-hidden="true" />
                <span className="sql-struct-list-name">{name}</span>
              </div>
            ))
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
  knownTables,
  engine,
}: {
  col: ModifyColumnDraft;
  onChange: (patch: Partial<ModifyColumnDraft>) => void;
  onRemove: () => void;
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
            className="sql-rename-input sql-modify-col-name"
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
// DdlViewer — read-only CodeMirror instance used inside the View DDL
// dialog so the SQL is syntax-highlighted and the user can scroll /
// select with their keyboard. Re-uses the already-loaded CodeMirror
// module (`cmApi`) instead of re-importing it.
// ────────────────────────────────────────────────────────────────────────

function DdlViewer({
  sql,
  cmApi,
  theme,
}: {
  sql: string;
  cmApi: CodeMirrorAPI | null;
  theme: string;
}) {
  const hostRef = useRef<HTMLTextAreaElement | null>(null);
  const editorRef = useRef<CodeMirrorEditor | null>(null);

  useEffect(() => {
    if (!cmApi || !hostRef.current || editorRef.current) return;
    const cm = cmApi.fromTextArea(hostRef.current, {
      mode: "text/x-sqlite",
      theme,
      lineNumbers: true,
      indentUnit: 2,
      tabSize: 2,
      // `readOnly: true` keeps the cursor active (unlike "nocursor") so
      // Ctrl-A / Cmd-A selects all text within the editor rather than
      // falling through to the browser's page-level select-all.
      readOnly: true,
      lineWrapping: false,
    });
    cm.setValue(sql);
    cm.setSize("100%", "100%");
    editorRef.current = cm;
    return () => {
      try {
        editorRef.current?.toTextArea?.();
      } catch {
        // ignore teardown errors
      }
      editorRef.current = null;
    };
    // We only want this to run once per mount — sql / theme updates
    // are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmApi]);

  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== sql) {
      editorRef.current.setValue(sql);
    }
  }, [sql]);

  useEffect(() => {
    editorRef.current?.setOption("theme", theme);
  }, [theme]);

  return (
    <div className="sql-ddl-code-wrap">
      <textarea ref={hostRef} defaultValue={sql} readOnly />
    </div>
  );
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
  return (
    <div className="sql-tree-section">
      <div className="sql-tree-section-header">
        <button
          type="button"
          className="sql-tree-section-toggle"
          onClick={onToggle}
          aria-expanded={expanded}
          title={
            expanded
              ? `Collapse ${label.toLowerCase()}`
              : `Expand ${label.toLowerCase()}`
          }
        >
          <span className="sql-tree-chevron" aria-hidden="true">
            {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </span>
          <span className="sql-tree-label">
            {label} ({count})
          </span>
        </button>
        {showExpandCollapse && (
          <button
            type="button"
            className="sql-tree-section-add"
            onClick={allExpanded ? onCollapseAll : onExpandAll}
            title={
              allExpanded
                ? `Collapse all ${label.toLowerCase()}`
                : `Expand all ${label.toLowerCase()}`
            }
            aria-label={
              allExpanded
                ? `Collapse all ${label.toLowerCase()}`
                : `Expand all ${label.toLowerCase()}`
            }
          >
            {allExpanded ? (
              <ChevronsUp size={11} aria-hidden="true" />
            ) : (
              <ChevronsDown size={11} aria-hidden="true" />
            )}
          </button>
        )}
        {onAdd && (
          <button
            type="button"
            className="sql-tree-section-add"
            onClick={onAdd}
            title={`Add ${label.toLowerCase().replace(/s$/, "")}`}
            aria-label={`Add ${label.toLowerCase().replace(/s$/, "")}`}
          >
            <Plus size={11} aria-hidden="true" />
          </button>
        )}
      </div>
      {expanded && (
        <div className="sql-tree-section-body">
          {count === 0 ? (
            <div className="sql-tree-empty">{emptyMessage}</div>
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
  onExportCsv: (name: string) => void;
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
  onExportCsv,
}: SchemaItemProps) {
  const Icon = kind === "view" ? Eye : Table2;
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
  return (
    <div className="sql-tree-entity">
      <ContextMenu.Root>
        <ContextMenu.Trigger
          render={(props) => (
            <div {...props} className="sql-tree-entity-trigger">
              <button
                type="button"
                className="sql-tree-item"
                onClick={handleSingleClick}
                onDoubleClick={handleDoubleClick}
                title={`Double-click to preview, click to ${expanded ? "collapse" : "expand"}`}
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
                              <MdOutlineKey
                                size={11}
                                className="sql-tree-column-pk"
                                aria-hidden="true"
                              />
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
                                  >
                                    <Popover.Popup className="bui-popup sql-fk-popover">
                                      → {fk.table}.{fk.to}
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
              <ContextMenu.Item
                className="example-item"
                onClick={() => onExportCsv(name)}
              >
                <div className="ex-title">Export to CSV</div>
              </ContextMenu.Item>
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
  return (
    <div className="sql-tree-entity">
      <ContextMenu.Root>
        <ContextMenu.Trigger
          render={(props) => (
            <button
              type="button"
              {...props}
              className="sql-tree-item sql-tree-item-leaf"
              onClick={() => onViewDDL(name, kind)}
              title={`View DDL for ${kind} ${name}`}
            >
              <span className="sql-tree-chevron" aria-hidden="true" />
              <Icon size={12} aria-hidden="true" />
              <span className="sql-tree-item-name">{name}</span>
            </button>
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
