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
  Hash,
  Play,
  Plus,
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
  type QueryTabSeed,
} from "./runtime/sqliteSamples";
import {
  createSqliteEngine,
  type ColumnSpec,
  type ForeignKeyInfo,
  type SqliteEngine,
  type TableColumnInfo,
} from "./runtime/sqlite";
import type { QueryExecResult } from "sql.js";

const PLAYGROUND_ID = "sqlite";
const STORAGE_PREFIX = `pg_${PLAYGROUND_ID}_`;

// localStorage keys are namespaced under `pg_sqlite_` so they collide
// neither with the language playgrounds nor with the upcoming Postgres
// playground.
const storageKey = (k: string) => `${STORAGE_PREFIX}${k}`;
const dbScopedKey = (dbId: string, k: string) =>
  `${STORAGE_PREFIX}db_${dbId}_${k}`;

const RUNTIME_INFO: RuntimeInfo = {
  language: "SQLite",
  version: "3.49",
  engine: "sql.js 1.13",
  engineUrl: "https://sql.js.org/",
  notes:
    "Pure-JS build of SQLite compiled to WebAssembly. Each sample database is rebuilt in memory on every page load.",
};

// ────────────────────────────────────────────────────────────────────────
// Tab persistence
// ────────────────────────────────────────────────────────────────────────

interface QueryTab {
  /** Stable id used as the React key — generated client-side because
   *  tabs can be created at any time. */
  id: string;
  title: string;
  code: string;
  /** Snapshot of `code` at the time the tab was created (e.g. the
   *  initial template, a sidebar preview's SELECT, or a structure
   *  query). The tab is considered "dirty" only when `code !==
   *  pristineCode`, which lets us skip the close-confirmation prompt
   *  for tabs the user never edited. */
  pristineCode: string;
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

function newTabId(): string {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function loadTabs(dbId: string, defaults: QueryTabSeed[]): QueryTab[] {
  if (typeof window === "undefined") {
    return defaults.map((seed) => ({
      ...seed,
      id: newTabId(),
      pristineCode: seed.code,
    }));
  }
  try {
    const raw = localStorage.getItem(dbScopedKey(dbId, "tabs"));
    if (raw) {
      const parsed = JSON.parse(raw) as QueryTab[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((t) => {
          const code = typeof t.code === "string" ? t.code : "";
          return {
            id: typeof t.id === "string" ? t.id : newTabId(),
            title: typeof t.title === "string" ? t.title : "Query",
            code,
            // Older saved tabs predate `pristineCode`; assume the
            // persisted contents are what the user left them at, so
            // treat them as clean by mirroring `code` here.
            pristineCode:
              typeof t.pristineCode === "string" ? t.pristineCode : code,
          };
        });
      }
    }
  } catch {
    // Corrupt entry — fall through to defaults.
  }
  return defaults.map((seed) => ({
    ...seed,
    id: newTabId(),
    pristineCode: seed.code,
  }));
}

function saveTabs(dbId: string, tabs: QueryTab[]): void {
  try {
    localStorage.setItem(dbScopedKey(dbId, "tabs"), JSON.stringify(tabs));
  } catch {
    // Quota exceeded / private mode — silently ignore.
  }
}

function loadActiveTabId(dbId: string, tabs: QueryTab[]): string {
  if (tabs.length === 0) return "";
  if (typeof window === "undefined") return tabs[0].id;
  const saved = localStorage.getItem(dbScopedKey(dbId, "active_tab"));
  if (saved && tabs.some((t) => t.id === saved)) return saved;
  return tabs[0].id;
}

function tabsAreDirty(tabs: QueryTab[], defaults: QueryTabSeed[]): boolean {
  // Dirty = the user added/removed tabs or edited any tab's contents.
  if (tabs.length !== defaults.length) return true;
  for (let i = 0; i < tabs.length; i += 1) {
    if (
      tabs[i].title !== defaults[i].title ||
      tabs[i].code !== defaults[i].code
    ) {
      return true;
    }
  }
  return false;
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
}

type SelectedRowsByResult = Record<number, Set<number>>;
type PendingEditsByResult = Record<number, Map<string, unknown>>;

function formatCellValue(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NaN";
  if (v instanceof Uint8Array) return `BLOB (${v.length} bytes)`;
  return String(v);
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
  const [editorTheme, setEditorThemeState] = useState<string>("dracula");
  const [wordWrap, setWordWrapState] = useState<boolean>(true);
  const [clearBeforeRun, setClearBeforeRunState] = useState<boolean>(false);

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
  const [uniqueColumnsByEntity, setUniqueColumnsByEntity] = useState<
    Record<string, string[]>
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
            getStoredEditorTheme(storageKey("editortheme")) ?? "dracula";
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
  const runSqlForTab = useCallback(
    (tabId: string, sql: string, source: string, sourceTable?: string) => {
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
      try {
        const sets = engine.exec(trimmed);
        const elapsedMs = performance.now() - t0;
        setResultForTab(tabId, { sets, elapsedMs, source, sourceTable });
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
      // title is the entity's name. The default query previews the
      // first 200 rows so the user can see data immediately.
      const sql = `SELECT * FROM ${quoteIdent(name)} LIMIT 200;`;
      openTabAndRun(
        name,
        sql,
        `${kind === "view" ? "View" : "Table"}: ${name}`,
        // Only tables carry a meaningful "source table" for the
        // result-view's PK / FK icon lookups. Views can join multiple
        // tables, so we deliberately omit it.
        kind === "table" ? name : undefined,
      );
    },
    [openTabAndRun, quoteIdent],
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
      const engine = engineRef.current;
      if (!engine) return;
      const label = kind === "view" ? "view" : "table";
      if (typeof window !== "undefined") {
        const ok = window.confirm(
          `Drop ${label} "${name}"? This change is in-memory only and will be undone next page load.`,
        );
        if (!ok) return;
      }
      try {
        engine.dropEntity(name, kind);
        setTables(engine.listTables());
        setViews(engine.listViews());
        setIndexes(engine.listIndexes());
        setTriggers(engine.listTriggers());
        showToast(`Dropped ${label} "${name}".`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Drop failed: ${msg}`, "warn");
      }
    },
    [showToast],
  );

  // Drop / view-DDL helpers for leaf sidebar entries (indexes,
  // triggers). Kept separate from `dropEntity` / `viewDDL` so the
  // existing table/view code paths stay strongly typed against
  // "table" | "view".
  const dropLeafEntity = useCallback(
    (name: string, kind: "index" | "trigger") => {
      const engine = engineRef.current;
      if (!engine) return;
      if (typeof window !== "undefined") {
        const ok = window.confirm(
          `Drop ${kind} "${name}"? This change is in-memory only and will be undone next page load.`,
        );
        if (!ok) return;
      }
      try {
        engine.dropEntity(name, kind);
        setIndexes(engine.listIndexes());
        setTriggers(engine.listTriggers());
        showToast(`Dropped ${kind} "${name}".`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Drop failed: ${msg}`, "warn");
      }
    },
    [showToast],
  );

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
        const sql = `SELECT * FROM ${quoteIdent(tableName)} LIMIT 200;`;
        runSqlForTab(tabId, sql, `Table: ${tableName}`, tableName);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Delete failed: ${msg}`, "warn");
      }
    },
    [quoteIdent, runSqlForTab, showToast],
  );

  // Duplicate a single row in a previewed table. INTEGER PRIMARY KEY
  // columns are omitted so SQLite auto-assigns a new rowid. If the
  // table has any other unique constraints the operation is blocked.
  const duplicateRow = useCallback(
    (tableName: string, columns: string[], rowValues: unknown[]) => {
      const engine = engineRef.current;
      if (!engine) return;
      try {
        const cols = engine.listColumns(tableName);
        const uniqueCols = engine.listUniqueColumns(tableName);
        const pkCols = cols.filter((c) => c.pk > 0);
        const canOmitPk =
          pkCols.length === 1 && /^integer$/i.test(pkCols[0].type);
        const hasOtherUnique = uniqueCols.some(
          (uc) => !pkCols.some((pk) => pk.name === uc),
        );
        if (hasOtherUnique || (pkCols.length > 0 && !canOmitPk)) {
          showToast(
            "Cannot duplicate row: table has unique constraints.",
            "warn",
          );
          return;
        }
        const colNames: string[] = [];
        const values: string[] = [];
        for (let i = 0; i < cols.length; i++) {
          const c = cols[i];
          if (canOmitPk && c.pk > 0 && /^integer$/i.test(c.type)) {
            continue;
          }
          colNames.push(`"${c.name.replace(/"/g, '""')}"`);
          const v = rowValues[i];
          if (v === null || v === undefined) {
            values.push("NULL");
          } else if (typeof v === "number") {
            values.push(String(v));
          } else if (v instanceof Uint8Array) {
            values.push(
              `x'${Array.from(v)
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("")}'`,
            );
          } else {
            values.push(`'${String(v).replace(/'/g, "''")}'`);
          }
        }
        engine.exec(
          `INSERT INTO "${tableName.replace(/"/g, '""')}" (${colNames.join(", ")}) VALUES (${values.join(", ")})`,
        );
        const tabId = activeTabIdRef.current;
        const sql = `SELECT * FROM ${quoteIdent(tableName)} LIMIT 200;`;
        runSqlForTab(tabId, sql, `Table: ${tableName}`, tableName);
        showToast(`Duplicated row in "${tableName}".`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Duplicate failed: ${msg}`, "warn");
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
        const sql = `SELECT * FROM ${quoteIdent(tableName)} LIMIT 200;`;
        runSqlForTab(tabId, sql, `Table: ${tableName}`, tableName);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Update failed: ${msg}`, "warn");
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
      const uniqueCols = engine.listUniqueColumns(name);
      setColumnsByEntity((prev) => ({ ...prev, [name]: cols }));
      setForeignKeysByEntity((prev) => ({ ...prev, [name]: fks }));
      setUniqueColumnsByEntity((prev) => ({ ...prev, [name]: uniqueCols }));
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
      setUniqueColumnsByEntity((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }, []);

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
            ? { table: c.fkTable.trim(), column: c.fkColumn.trim() }
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
                          // eslint-disable-next-line react/no-array-index-key
                          <tr key={i}>
                            {row.map((cell, j) => (
                              // eslint-disable-next-line react/no-array-index-key
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
                          // eslint-disable-next-line react/no-array-index-key
                          <tr key={i}>
                            {row.map((cell, j) => (
                              // eslint-disable-next-line react/no-array-index-key
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
                    Modify structure
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

            <div className="sql-sidebar-footer">{RUNTIME_INFO.engine}</div>
          </aside>

          <div
            className="sql-sidebar-resizer"
            ref={sidebarResizerRef}
            role="separator"
            aria-orientation="vertical"
            aria-label="Drag to resize tables panel"
            title="Drag to resize"
          />

          <div className="sql-panes" ref={panesRef}>
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
                {/* The "new tab" (+) button lives inside the same
                    horizontally-scrolling .sql-tabs container as the
                    tabs themselves so it sits right next to the
                    right-most tab when the strip isn't full. Once
                    the tabs overflow horizontally it scrolls with
                    them and remains reachable at the end of the
                    strip via the existing scroller. */}
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
            </div>

            <div className="sql-editor-pane" ref={editorPaneRef}>
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
            />

            <div className="sql-results-pane" ref={resultsPaneRef}>
              <div className="sql-results-body">
                <ResultView
                  result={result}
                  loading={!loaded}
                  keyHints={resultKeyHints}
                  sourceTable={result?.sourceTable}
                  columnsInfo={
                    result?.sourceTable
                      ? columnsByEntity[result.sourceTable]
                      : undefined
                  }
                  uniqueColumns={
                    result?.sourceTable
                      ? uniqueColumnsByEntity[result.sourceTable]
                      : undefined
                  }
                  showToast={showToast}
                  onDeleteRows={deleteRowsFromTable}
                  onUpdateRows={updateRowsInTable}
                  onDuplicateRow={duplicateRow}
                />
              </div>
              <DataslopeRunOverlay running={statusState === "running"} />
            </div>
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
              className={`sql-tab${active ? " active" : ""}`}
              onClick={onActivate}
              aria-selected={active}
              role="tab"
            >
              <span className="sql-tab-title">{tab.title}</span>
              <button
                type="button"
                className="sql-tab-close"
                aria-label={`Close ${tab.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
              >
                <X size={10} aria-hidden="true" />
              </button>
            </button>
          )}
        />
        <ContextMenu.Portal>
          <ContextMenu.Positioner sideOffset={6}>
            <ContextMenu.Popup className="bui-popup">
              <ContextMenu.Item className="example-item" onClick={openRename}>
                <div className="ex-title">Rename</div>
              </ContextMenu.Item>
              <ContextMenu.Item className="example-item" onClick={onDuplicate}>
                <div className="ex-title">Duplicate</div>
              </ContextMenu.Item>
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
  columnsInfo,
  uniqueColumns,
  showToast,
  onDeleteRows,
  onUpdateRows,
  onDuplicateRow,
}: {
  result: QueryRunResult | null;
  loading: boolean;
  keyHints?: ColumnKeyHints;
  sourceTable?: string;
  columnsInfo?: TableColumnInfo[];
  uniqueColumns?: string[];
  showToast?: (msg: string, kind?: "info" | "warn") => void;
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
    columns: string[],
    rowValues: unknown[],
  ) => void;
}) {
  // Pagination state lives at the ResultView level (one record per
  // result-set index) so the pagers can be rendered in a footer that
  // sits *outside* the horizontally/vertically scrolling content.
  // Without this lift the pagination bar would scroll with the table —
  // the very behaviour Updates 1 and 2 ask us to remove.
  //
  // The page *size* is global (shared across all result sets, tabs and
  // databases) and persisted to localStorage. Only the current *page*
  // number is tracked per result-set index.
  const [globalPageSize, setGlobalPageSize] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_PAGE_SIZE;
    const saved = Number(
      localStorage.getItem(`${STORAGE_PREFIX}page_size`) ?? DEFAULT_PAGE_SIZE,
    );
    return PAGE_SIZE_OPTIONS.some((opt) => opt.value === saved)
      ? saved
      : DEFAULT_PAGE_SIZE;
  });
  const [pageStates, setPageStates] = useState<Record<number, { page: number }>>(
    {},
  );
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
  // Single-row delete triggered from a cell's context menu.
  const [cellDeleteRow, setCellDeleteRow] = useState<{
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

  const setPageSize = useCallback((idx: number, pageSize: number) => {
    setGlobalPageSize(pageSize);
    setPageStates((prev) => ({
      ...prev,
      [idx]: { page: 0 },
    }));
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}page_size`, String(pageSize));
      } catch {
        // ignore quota errors
      }
    }
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
    const pkRows: unknown[][] = [];
    for (const rowIdx of selected) {
      const row = set.values[rowIdx];
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
    pendingEditsByIndex,
    result,
    sourceTable,
    onDeleteRows,
    pkColumnsForSet,
    selectedByIndex,
  ]);

  const performCellDelete = useCallback(() => {
    if (!cellDeleteRow || !result || !sourceTable || !onDeleteRows) {
      setCellDeleteRow(null);
      return;
    }
    const set = result.sets[cellDeleteRow.setIdx];
    if (!set) {
      setCellDeleteRow(null);
      return;
    }
    const pkCols = pkColumnsForSet(set);
    if (!pkCols || pkCols.length === 0) {
      setCellDeleteRow(null);
      return;
    }
    const pkColIndexes = pkCols.map((c) => set.columns.indexOf(c));
    const row = set.values[cellDeleteRow.absoluteRow];
    if (!row) {
      setCellDeleteRow(null);
      return;
    }
    const pkRow = pkColIndexes.map((ci) => row[ci]);
    const nextSelectedByIndex = cloneSelections(selectedByIndex);
    delete nextSelectedByIndex[cellDeleteRow.setIdx];
    const nextPendingEdits = pendingEditsAfterDeletedRows(
      pendingEditsByIndex,
      cellDeleteRow.setIdx,
      new Set([cellDeleteRow.absoluteRow]),
    );
    preserveOnNextResultRef.current = {
      selectedByIndex: nextSelectedByIndex,
      pendingEditsByIndex: nextPendingEdits,
    };
    setCellDeleteRow(null);
    setSelectedByIndex(nextSelectedByIndex);
    setPendingEditsByIndex(nextPendingEdits);
    onDeleteRows(sourceTable, pkCols, [pkRow]);
  }, [
    cellDeleteRow,
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
    return (
      <div className="sql-result-error">
        <div className="sql-result-error-title">Query failed</div>
        <pre className="sql-result-error-body">{result.error}</pre>
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
          const st = getState(idx);
          const totalRows = set.values.length;
          const effective =
            globalPageSize > 0 ? globalPageSize : Math.max(totalRows, 1);
          const totalPages = Math.max(1, Math.ceil(totalRows / effective));
          const safePage = Math.min(st.page, totalPages - 1);
          const start = safePage * effective;
          const visible =
            globalPageSize > 0
              ? set.values.slice(start, start + effective)
              : set.values;
          const pkCols = pkColumnsForSet(set);
          const selected = selectedByIndex[idx];
          const pendingEdits = pendingEditsByIndex[idx];
          return (
            <ResultTableBody
              key={idx}
              set={set}
              index={idx}
              visible={visible}
              startIndex={start}
              keyHints={keyHints}
              deletable={pkCols !== null}
              editable={isEditable}
              selectedRows={selected}
              pendingEdits={pendingEdits}
              activeEditCell={activeEditCellByIndex[idx] ?? null}
              sourceTable={sourceTable}
              columnsInfo={columnsInfo}
              uniqueColumns={uniqueColumns}
              showToast={showToast}
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
              onRequestCellDelete={(absoluteRow) =>
                setCellDeleteRow({ setIdx: idx, absoluteRow })
              }
              onDuplicateRow={onDuplicateRow}
            />
          );
        })}
      </div>
      <div className="sql-result-pagers">
        {result.sets.map((set, idx) => {
          const st = getState(idx);
          const pkCols = pkColumnsForSet(set);
          const selected = selectedByIndex[idx];
          const selectedCount = selected?.size ?? 0;
          const pendingEdits = pendingEditsByIndex[idx];
          const editCount = pendingEdits?.size ?? 0;
          return (
            <ResultPager
              key={idx}
              set={set}
              index={idx}
              showSetLabel={result.sets.length > 1}
              pageSize={globalPageSize}
              page={st.page}
              onPageChange={(p) => setPage(idx, p)}
              onPageSizeChange={(s) => setPageSize(idx, s)}
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
        open={cellDeleteRow !== null}
        onOpenChange={(next) => {
          if (!next) setCellDeleteRow(null);
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
                onClick={performCellDelete}
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

function CellContextMenu({
  children,
  cellValue,
  rowValues,
  columns,
  sourceTable,
  columnsInfo,
  uniqueColumns,
  showToast,
  onDuplicateRow,
  onRequestCellDelete,
}: {
  children: ReactNode;
  cellValue: unknown;
  rowValues: unknown[];
  columns: string[];
  sourceTable?: string;
  columnsInfo?: TableColumnInfo[];
  uniqueColumns?: string[];
  showToast?: (msg: string, kind?: "info" | "warn") => void;
  onDuplicateRow?: (
    tableName: string,
    columns: string[],
    rowValues: unknown[],
  ) => void;
  onRequestCellDelete?: () => void;
}) {
  const handleCopyCell = () => {
    const text = formatCellValue(cellValue);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast?.("Copied cell value to clipboard."))
        .catch(() =>
          showToast?.("Couldn't copy to clipboard.", "warn"),
        );
    } else {
      showToast?.("Clipboard not available in this browser.", "warn");
    }
  };

  const handleCopyRowJson = () => {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < columns.length; i++) {
      obj[columns[i]] = rowValues[i] ?? null;
    }
    const text = JSON.stringify(obj, null, 2);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast?.("Copied row as JSON."))
        .catch(() =>
          showToast?.("Couldn't copy to clipboard.", "warn"),
        );
    } else {
      showToast?.("Clipboard not available in this browser.", "warn");
    }
  };

  const handleCopyRowSql = () => {
    if (!sourceTable) return;
    const colNames = columns.map(
      (c) => `"${c.replace(/"/g, '""')}"`,
    );
    const values = rowValues.map((v) => {
      if (v === null || v === undefined) return "NULL";
      if (typeof v === "number") return String(v);
      if (v instanceof Uint8Array)
        return `x'${Array.from(v)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")}'`;
      return `'${String(v).replace(/'/g, "''")}'`;
    });
    const text = `INSERT INTO "${sourceTable.replace(/"/g, '""')}" (${colNames.join(", ")}) VALUES (${values.join(", ")});`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast?.("Copied row as SQL."))
        .catch(() =>
          showToast?.("Couldn't copy to clipboard.", "warn"),
        );
    } else {
      showToast?.("Clipboard not available in this browser.", "warn");
    }
  };

  const pkCols = columnsInfo?.filter((c) => c.pk > 0) ?? [];
  const canOmitPk =
    pkCols.length === 1 && /^integer$/i.test(pkCols[0].type);
  const hasOtherUnique = (uniqueColumns ?? []).some(
    (uc) => !pkCols.some((pk) => pk.name === uc),
  );
  const canDuplicate =
    sourceTable && !hasOtherUnique && (pkCols.length === 0 || canOmitPk);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        render={(props) => (
          <span {...props} className="sql-cell-trigger">
            {children}
          </span>
        )}
      />
      <ContextMenu.Portal>
        <ContextMenu.Positioner sideOffset={6}>
          <ContextMenu.Popup className="bui-popup examples-dropdown">
            <ContextMenu.Item
              className="example-item"
              onClick={handleCopyCell}
            >
              <div className="ex-title">Copy cell value</div>
            </ContextMenu.Item>
            <ContextMenu.Item
              className="example-item"
              onClick={handleCopyRowJson}
            >
              <div className="ex-title">Copy row as JSON</div>
            </ContextMenu.Item>
            {sourceTable && (
              <ContextMenu.Item
                className="example-item"
                onClick={handleCopyRowSql}
              >
                <div className="ex-title">Copy row as SQL</div>
              </ContextMenu.Item>
            )}
            {canDuplicate ? (
              <ContextMenu.Item
                className="example-item"
                onClick={() =>
                  onDuplicateRow?.(sourceTable, columns, rowValues)
                }
              >
                <div className="ex-title">Duplicate row</div>
              </ContextMenu.Item>
            ) : sourceTable ? (
              <div
                className="example-item"
                style={{ opacity: 0.5, cursor: "not-allowed" }}
              >
                <Popover.Root>
                  <Popover.Trigger
                    openOnHover
                    delay={100}
                    closeDelay={100}
                    render={(props) => (
                      <div {...props} className="ex-title">
                        Duplicate row
                      </div>
                    )}
                  />
                  <Popover.Portal>
                    <Popover.Positioner sideOffset={6}>
                      <Popover.Popup className="bui-popup sql-fk-popover">
                        This table has a unique constraint.
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
              </div>
            ) : null}
            {sourceTable && onRequestCellDelete && (
              <ContextMenu.Item
                className="example-item"
                onClick={onRequestCellDelete}
              >
                <div className="ex-title">Delete row</div>
              </ContextMenu.Item>
            )}
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

function ResultTableBody({
  set,
  index,
  visible,
  startIndex,
  keyHints,
  deletable,
  editable,
  selectedRows,
  pendingEdits,
  activeEditCell,
  sourceTable,
  columnsInfo,
  uniqueColumns,
  showToast,
  onToggleRow,
  onToggleVisible,
  onSetPendingEdit,
  onClearPendingEdit,
  onSetActiveEditCell,
  onRequestCellDelete,
  onDuplicateRow,
}: {
  set: QueryExecResult;
  index: number;
  visible: QueryExecResult["values"];
  startIndex: number;
  keyHints?: ColumnKeyHints;
  deletable: boolean;
  editable: boolean;
  selectedRows?: Set<number>;
  pendingEdits?: Map<string, unknown>;
  activeEditCell: string | null;
  sourceTable?: string;
  columnsInfo?: TableColumnInfo[];
  uniqueColumns?: string[];
  showToast?: (msg: string, kind?: "info" | "warn") => void;
  onToggleRow: (absoluteRow: number) => void;
  onToggleVisible: (absoluteIndices: number[], select: boolean) => void;
  onSetPendingEdit: (cellKey: string, value: unknown) => void;
  onClearPendingEdit: (cellKey: string) => void;
  onSetActiveEditCell: (cellKey: string | null) => void;
  onRequestCellDelete?: (absoluteRow: number) => void;
  onDuplicateRow?: (
    tableName: string,
    columns: string[],
    rowValues: unknown[],
  ) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const visibleAbsoluteIndices = useMemo(
    () => visible.map((_, ri) => startIndex + ri),
    [visible, startIndex],
  );
  const allVisibleSelected =
    deletable &&
    visibleAbsoluteIndices.length > 0 &&
    visibleAbsoluteIndices.every((i) => selectedRows?.has(i));
  const someVisibleSelected =
    deletable &&
    !allVisibleSelected &&
    visibleAbsoluteIndices.some((i) => selectedRows?.has(i));
  const data = useMemo<ResultTableRow[]>(
    () =>
      visible.map((values, ri) => ({
        absoluteRow: startIndex + ri,
        values,
      })),
    [visible, startIndex],
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
                    onToggleVisible(visibleAbsoluteIndices, v === true)
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
      visibleAbsoluteIndices,
    ],
  );
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is required for stable result-table customization.
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
              const checked = selectedRows?.has(absoluteRow) ?? false;
              return (
                <tr
                  key={absoluteRow}
                  className={checked ? "sql-result-row-selected" : undefined}
                >
                  {row.getVisibleCells().map((cell) => {
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
                        onDoubleClick={
                          editable && !isSelect && ci >= 0
                            ? () => onSetActiveEditCell(cellKey)
                            : undefined
                        }
                      >
                        {isSelect ? (
                          flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )
                        ) : (
                          <CellContextMenu
                            cellValue={cell.getValue()}
                            rowValues={row.original.values}
                            columns={set.columns}
                            sourceTable={sourceTable}
                            columnsInfo={columnsInfo}
                            uniqueColumns={uniqueColumns}
                            showToast={showToast}
                            onDuplicateRow={onDuplicateRow}
                            onRequestCellDelete={() =>
                              onRequestCellDelete?.(absoluteRow)
                            }
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </CellContextMenu>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResultPager({
  set,
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
  set: QueryExecResult;
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
  const totalRows = set.values.length;
  const effective = pageSize > 0 ? pageSize : Math.max(totalRows, 1);
  const totalPages = Math.max(1, Math.ceil(totalRows / effective));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * effective;
  const end = Math.min(totalRows, start + effective);

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
        <button
          type="button"
          className="sql-result-pager-btn"
          onClick={() => onPageChange(0)}
          disabled={safePage === 0}
          aria-label="First page"
          title="First page"
        >
          <ChevronsLeft size={13} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="sql-result-pager-btn"
          onClick={() => onPageChange(Math.max(0, safePage - 1))}
          disabled={safePage === 0}
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft size={13} aria-hidden="true" />
        </button>
        <span className="sql-result-pager-page">
          {safePage + 1} / {totalPages}
        </span>
        <button
          type="button"
          className="sql-result-pager-btn"
          onClick={() => onPageChange(Math.min(totalPages - 1, safePage + 1))}
          disabled={safePage >= totalPages - 1}
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight size={13} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="sql-result-pager-btn"
          onClick={() => onPageChange(totalPages - 1)}
          disabled={safePage >= totalPages - 1}
          aria-label="Last page"
          title="Last page"
        >
          <ChevronsRight size={13} aria-hidden="true" />
        </button>
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
    // Use a per-call random suffix instead of `state.columns.length`
    // so users who add → remove → add don't collide with an existing
    // `column_N`. The engine's `rebuildTable` validates uniqueness on
    // save anyway, but a unique default is friendlier.
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
        },
      ],
    });
  };
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
      <div className="sql-modify-columns">
        {state.columns.length > 0 ? (
          <div className="sql-modify-table-wrap">
            <table className="sql-modify-table">
              <thead>
                <tr>
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
                  <th>Actions</th>
                </tr>
              </thead>
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
    <tr className="sql-modify-col-row">
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
              // Auto-increment is only meaningful with a single PK.
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
          // SQLite allows AUTOINCREMENT only on a single-column INTEGER
          // PRIMARY KEY. Disable the toggle otherwise so the user can't
          // craft an invalid spec.
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
      // `nocursor` disables focus while keeping syntax highlighting —
      // the standard CodeMirror v5 way to render a read-only listing.
      readOnly: "nocursor",
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
                <div className="ex-title">Preview Data</div>
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
                  <div className="ex-title">Modify Structure</div>
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
