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
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  ArrowDownToLine,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Eye,
  Database,
  Hash,
  Play,
  Plus,
  Table2,
  Trash2,
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

function formatCellValue(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NaN";
  if (v instanceof Uint8Array) return `BLOB (${v.length} bytes)`;
  return String(v);
}

// ────────────────────────────────────────────────────────────────────────
// Pagination defaults — applied per result set. The "All" option
// (value = 0) renders every row at once and hides the page navigator.
// The chosen size is persisted across reloads so the user's preference
// survives navigation between databases and tabs.
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
  const [confirmClearStorageOpen, setConfirmClearStorageOpen] =
    useState(false);
  const [confirmCloseTabId, setConfirmCloseTabId] = useState<string | null>(
    null,
  );
  const [pendingDbId, setPendingDbId] = useState<string | null>(null);
  // DDL viewer dialog state. We keep both the title (entity name) and
  // the DDL string so the dialog can stay open while the underlying
  // sidebar list mutates from a concurrent DROP.
  const [ddlDialog, setDdlDialog] = useState<
    { title: string; sql: string } | null
  >(null);
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
  const result = activeTabId ? resultsByTab[activeTabId] ?? null : null;

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
      Number(
        localStorage.getItem(storageKey("outputfontsize")) ?? savedSize,
      ) || savedSize;
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
  const performDbSwitch = useCallback(
    (nextId: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      // Persist whatever was in the editor for the *outgoing* db before
      // we tear it down, so a switch never silently loses an in-flight
      // edit.
      saveTabs(activeDbIdRef.current, tabsRef.current);

      const sample = engine.loadSampleDatabase(nextId);
      setActiveDbId(sample.id);
      try {
        localStorage.setItem(storageKey("db"), sample.id);
      } catch {
        // ignore
      }
      setTables(engine.listTables());
      setViews(engine.listViews());
      setIndexes(engine.listIndexes());
      setTriggers(engine.listTriggers());

      const newTabs = sample.defaultTabs.map((seed) => ({
        ...seed,
        id: newTabId(),
        pristineCode: seed.code,
      }));
      setTabs(newTabs);
      tabsRef.current = newTabs;
      saveTabs(sample.id, newTabs);
      const newActive = newTabs[0].id;
      setActiveTabId(newActive);
      const editor = editorRef.current;
      if (editor) editor.setValue(newTabs[0].code);
      setResultsByTab({});
      showToast(`Loaded ${sample.filename}.`);
    },
    [showToast],
  );

  const requestDbSwitch = useCallback(
    (nextId: string) => {
      if (nextId === activeDbId) return;
      const sample = findSampleDatabase(activeDbId);
      // Only prompt when the *current* db has unsaved edits relative to
      // its defaults. Switching to and from clean defaults should be
      // friction-free.
      if (tabsAreDirty(tabsRef.current, sample.defaultTabs)) {
        setPendingDbId(nextId);
        return;
      }
      performDbSwitch(nextId);
    },
    [activeDbId, performDbSwitch],
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
          setExpandedEntities(new Set(parsed.filter((s) => typeof s === "string")));
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

  const truncateEntity = useCallback(
    (name: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (typeof window !== "undefined") {
        const ok = window.confirm(
          `Truncate table "${name}"? This deletes every row but keeps the schema. The change is in-memory only and will be undone next page load.`,
        );
        if (!ok) return;
      }
      try {
        engine.truncateTable(name);
        showToast(`Truncated table "${name}".`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Truncate failed: ${msg}`, "warn");
      }
    },
    [showToast],
  );

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
      const blob = new Blob([bytes.slice()], { type: "application/vnd.sqlite3" });
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
  }, [
    result,
    columnsByEntity,
    foreignKeysByEntity,
    refreshEntityMetadata,
  ]);

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

  const toggleEntityExpanded = useCallback(
    (name: string) => {
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
    },
    [],
  );

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
        foreignKey: c.fkTable && c.fkColumn
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
        setAddRowDialog({ tableName: name, columns: cols, values: initValues, addAnother: false });
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
        setAddRowDialog((prev) => (prev ? { ...prev, values: newValues } : null));
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
    const sample = findSampleDatabase(activeDbId);
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
  }, [activeDbId, showToast]);

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
      const next = Math.max(
        160,
        Math.min(maxW, startW + (e.clientX - startX)),
      );
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
    () => findSampleDatabase(activeDbId),
    [activeDbId],
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
            <Link href="/" className="brand-name">Dataslope</Link>
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
                <strong>{activeSample.filename}</strong>. They will be saved
                and restored when you switch back, but loading another
                database will replace what&rsquo;s currently in the editor.
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
                Read-only view of the original{" "}
                <code>CREATE</code> statement(s) recorded in
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
                          showToast(
                            "Couldn't copy to clipboard.",
                            "warn",
                          ),
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
                          <span className="sql-add-row-field-name">{c.name}</span>
                          <span className="sql-add-row-field-type">{c.type || "—"}</span>
                        </span>
                        <input
                          className="sql-rename-input"
                          value={addRowDialog.values[c.name] ?? ""}
                          onChange={(e) =>
                            setAddRowDialog((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    values: { ...prev.values, [c.name]: e.target.value },
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
                          prev ? { ...prev, addAnother: e.target.checked } : null,
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
                  onValueChange={(value) => requestDbSwitch(String(value))}
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
                    <Select.Positioner sideOffset={6} alignItemWithTrigger={false}>
                      <Select.Popup className="bui-select-popup sql-db-popup">
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

            <div className="sql-sidebar-footer">
              {RUNTIME_INFO.engine}
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

          <div className="sql-panes" ref={panesRef}>
            <div className="sql-tabbar">
              <div className="sql-tabs" role="tablist">
                {tabs.map((t) => (
                  <SqlTab
                    key={t.id}
                    tab={t}
                    active={t.id === activeTabId}
                    onActivate={() => setActiveTabId(t.id)}
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
                  onDeleteRows={deleteRowsFromTable}
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
            <Dialog.Title className="confirm-title">Rename query tab</Dialog.Title>
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
                <button type="submit" className="confirm-btn confirm-btn-primary">
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
              <ContextMenu.Item className="example-item" onClick={onCloseOthers}>
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
  onDeleteRows,
}: {
  result: QueryRunResult | null;
  loading: boolean;
  keyHints?: ColumnKeyHints;
  sourceTable?: string;
  onDeleteRows?: (
    tableName: string,
    pkColumns: string[],
    pkRows: ReadonlyArray<ReadonlyArray<unknown>>,
  ) => void;
}) {
  // Pagination state lives at the ResultView level (one record per
  // result-set index) so the pagers can be rendered in a footer that
  // sits *outside* the horizontally/vertically scrolling content.
  // Without this lift the pagination bar would scroll with the table —
  // the very behaviour Updates 1 and 2 ask us to remove.
  const [pageStates, setPageStates] = useState<
    Record<number, { pageSize: number; page: number }>
  >({});
  // Selection state — set of *absolute* row indices into `set.values`
  // (not page-local) so selections survive page navigation. Keyed by
  // result-set index. Only populated for sets that are deletable.
  const [selectedByIndex, setSelectedByIndex] = useState<
    Record<number, Set<number>>
  >({});
  // Pending delete confirmation — captures the set index whose
  // selected rows are about to be deleted. `null` means the dialog is
  // closed.
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const initialPageSize = useMemo(() => {
    if (typeof window === "undefined") return DEFAULT_PAGE_SIZE;
    const saved = Number(
      localStorage.getItem(`${STORAGE_PREFIX}page_size`) ?? DEFAULT_PAGE_SIZE,
    );
    return PAGE_SIZE_OPTIONS.some((opt) => opt.value === saved)
      ? saved
      : DEFAULT_PAGE_SIZE;
  }, []);

  // Reset pagination + selection whenever a new result lands.
  // Identity-comparing against the result object is sufficient because
  // `setResult` always creates a new object.
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setPageStates({});
    setSelectedByIndex({});
    setPendingDelete(null);
  }, [result]);

  const getState = useCallback(
    (idx: number) =>
      pageStates[idx] ?? { pageSize: initialPageSize, page: 0 },
    [pageStates, initialPageSize],
  );

  const setPage = useCallback((idx: number, page: number) => {
    setPageStates((prev) => {
      const cur = prev[idx] ?? { pageSize: initialPageSize, page: 0 };
      return { ...prev, [idx]: { ...cur, page } };
    });
  }, [initialPageSize]);

  const setPageSize = useCallback((idx: number, pageSize: number) => {
    setPageStates((prev) => ({
      ...prev,
      [idx]: { pageSize, page: 0 },
    }));
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}page_size`, String(pageSize));
      } catch {
        // ignore quota errors
      }
    }
  }, []);

  // Per-set "is this set deletable" decision. A set is deletable when:
  //   - the result came from a single-table preview (sourceTable set),
  //   - we have primary-key column metadata for that table, and
  //   - every PK column appears in the set's column list (so we can
  //     identify each row by its PK values without guesswork).
  // Returns the ordered list of PK column names for the set (drawn
  // from the *set's* column order so the caller can index into rows
  // directly), or `null` when not deletable.
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
    setPendingDelete(null);
    onDeleteRows(sourceTable, pkCols, pkRows);
  }, [
    pendingDelete,
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
          execute the active tab. Click any table or view in the sidebar to
          open it in a new tab.
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
    pendingDelete !== null
      ? selectedByIndex[pendingDelete]?.size ?? 0
      : 0;
  return (
    <>
      <div className="sql-result-sets">
        {result.sets.map((set, idx) => {
          const st = getState(idx);
          const totalRows = set.values.length;
          const effective =
            st.pageSize > 0 ? st.pageSize : Math.max(totalRows, 1);
          const totalPages = Math.max(1, Math.ceil(totalRows / effective));
          const safePage = Math.min(st.page, totalPages - 1);
          const start = safePage * effective;
          const visible =
            st.pageSize > 0
              ? set.values.slice(start, start + effective)
              : set.values;
          const pkCols = pkColumnsForSet(set);
          const selected = selectedByIndex[idx];
          return (
            <ResultTableBody
              key={idx}
              set={set}
              index={idx}
              visible={visible}
              startIndex={start}
              keyHints={keyHints}
              deletable={pkCols !== null}
              selectedRows={selected}
              onToggleRow={(absoluteRow) =>
                toggleRowSelected(idx, absoluteRow)
              }
              onToggleVisible={(absoluteIndices, select) =>
                setVisibleSelection(idx, absoluteIndices, select)
              }
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
          return (
            <ResultPager
              key={idx}
              set={set}
              index={idx}
              showSetLabel={result.sets.length > 1}
              pageSize={st.pageSize}
              page={st.page}
              onPageChange={(p) => setPage(idx, p)}
              onPageSizeChange={(s) => setPageSize(idx, s)}
              deletable={pkCols !== null}
              selectedCount={selectedCount}
              onRequestDelete={() => requestDelete(idx)}
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
              <strong>{sourceTable ?? "this table"}</strong>
              . The change is in-memory only and will be undone next page
              load, but cannot be reversed within this session.
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
    </>
  );
}

function ResultTableBody({
  set,
  index,
  visible,
  startIndex,
  keyHints,
  deletable,
  selectedRows,
  onToggleRow,
  onToggleVisible,
}: {
  set: QueryExecResult;
  index: number;
  visible: QueryExecResult["values"];
  startIndex: number;
  keyHints?: ColumnKeyHints;
  deletable: boolean;
  selectedRows?: Set<number>;
  onToggleRow: (absoluteRow: number) => void;
  onToggleVisible: (absoluteIndices: number[], select: boolean) => void;
}) {
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
              cell: ({ row }) => {
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
            header: () => {
              const isPk = keyHints?.pk.has(c) ?? false;
              const fk = keyHints?.fk.get(c);
              return (
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
                      size={10}
                      className="sql-result-th-fk"
                      aria-label={`Foreign key → ${fk.table}.${fk.to}`}
                    />
                  )}
                  <span>{c}</span>
                </span>
              );
            },
            cell: (info) => formatCellValue(info.getValue()),
          }) satisfies ColumnDef<ResultTableRow>,
      ),
    ],
    [
      allVisibleSelected,
      deletable,
      keyHints,
      onToggleRow,
      onToggleVisible,
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
    getCoreRowModel: getCoreRowModel(),
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
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={
                        cell.column.id === "select"
                          ? "sql-result-td-select"
                          : cell.getValue() === null
                            ? "sql-cell-null"
                            : undefined
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
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
  selectedCount,
  onRequestDelete,
}: {
  set: QueryExecResult;
  index: number;
  showSetLabel: boolean;
  pageSize: number;
  page: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  deletable: boolean;
  selectedCount: number;
  onRequestDelete: () => void;
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
        <span className="sql-result-pager-set">
          Set #{index + 1}
        </span>
      )}
      <span className="sql-result-pager-info">
        {deletable && selectedCount > 0 ? (
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
          onClick={() =>
            onPageChange(Math.min(totalPages - 1, safePage + 1))
          }
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
      columns: state.columns.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
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
                  <th>Auto-<br/>increment</th>
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
    <label
      className={`sql-modify-flag${disabled ? " is-disabled" : ""}`}
    >
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
}

function SchemaSection({
  label,
  count,
  expanded,
  onToggle,
  emptyMessage,
  children,
  onAdd,
}: SchemaSectionProps) {
  return (
    <div className="sql-tree-section">
      <div className="sql-tree-section-header">
        <button
          type="button"
          className="sql-tree-section-toggle"
          onClick={onToggle}
          aria-expanded={expanded}
          title={expanded ? `Collapse ${label.toLowerCase()}` : `Expand ${label.toLowerCase()}`}
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
                          <span
                            className="sql-tree-column-icons"
                            aria-hidden="true"
                          >
                            {c.pk > 0 && (
                              <MdOutlineKey
                                size={14}
                                className="sql-tree-column-pk"
                              />
                            )}
                            {fk && (
                              <IoLink
                                size={9}
                                className="sql-tree-column-fk"
                              />
                            )}
                          </span>
                          <span className="sql-tree-column-name">{c.name}</span>
                          <span className="sql-tree-column-type">
                            {c.type || "—"}
                          </span>
                          {fk && (
                            <span
                              className="sql-tree-column-fkref"
                              title={`Foreign key → ${fk.table}.${fk.to}`}
                            >
                              → {fk.table}.{fk.to}
                            </span>
                          )}
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
