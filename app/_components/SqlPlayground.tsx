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
import { Popover } from "@base-ui-components/react/popover";
import { AlertDialog } from "@base-ui-components/react/alert-dialog";
import { Dialog } from "@base-ui-components/react/dialog";
import { Toast } from "@base-ui-components/react/toast";
import { Select } from "@base-ui-components/react/select";
import { ContextMenu } from "@base-ui-components/react/context-menu";
import { Eraser, Play, Plus, X, Database, Table2, Eye } from "lucide-react";
import { FaInfo } from "react-icons/fa";
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
import { createSqliteEngine, type SqliteEngine } from "./runtime/sqlite";
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
}

function newTabId(): string {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function loadTabs(dbId: string, defaults: QueryTabSeed[]): QueryTab[] {
  if (typeof window === "undefined") {
    return defaults.map((seed) => ({ ...seed, id: newTabId() }));
  }
  try {
    const raw = localStorage.getItem(dbScopedKey(dbId, "tabs"));
    if (raw) {
      const parsed = JSON.parse(raw) as QueryTab[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((t) => ({
          id: typeof t.id === "string" ? t.id : newTabId(),
          title: typeof t.title === "string" ? t.title : "Query",
          code: typeof t.code === "string" ? t.code : "",
        }));
      }
    }
  } catch {
    // Corrupt entry — fall through to defaults.
  }
  return defaults.map((seed) => ({ ...seed, id: newTabId() }));
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
  const clearActiveTabResult = useCallback(() => {
    if (activeTabId) setResultForTab(activeTabId, null);
  }, [activeTabId, setResultForTab]);

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

        // Refresh sidebar tree against whatever sample the engine
        // ended up with (handles the case where `initialSampleId` was
        // unknown and `findSampleDatabase` fell back).
        const sample = engine.activeSample();
        setActiveDbId(sample.id);
        setTables(engine.listTables());
        setViews(engine.listViews());

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

      const newTabs = sample.defaultTabs.map((seed) => ({
        ...seed,
        id: newTabId(),
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
    (tabId: string, sql: string, source: string) => {
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
        setResultForTab(tabId, { sets, elapsedMs, source });
        setStatusState("ready");
        // Refresh sidebar in case the query was DDL (CREATE/DROP).
        setTables(engine.listTables());
        setViews(engine.listViews());
      } catch (err) {
        const elapsedMs = performance.now() - t0;
        const msg = err instanceof Error ? err.message : String(err);
        setResultForTab(tabId, { sets: [], elapsedMs, error: msg, source });
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
    (title: string, sql: string, source?: string) => {
      const tab: QueryTab = { id: newTabId(), title, code: sql };
      const next = [...tabsRef.current, tab];
      tabsRef.current = next;
      activeTabIdRef.current = tab.id;
      setTabs(next);
      saveTabs(activeDbIdRef.current, next);
      setActiveTabId(tab.id);
      const editor = editorRef.current;
      if (editor) editor.setValue(sql);
      runSqlForTab(tab.id, sql, source ?? title);
    },
    [runSqlForTab],
  );

  const quoteIdent = useCallback(
    (name: string) => `"${name.replace(/"/g, '""')}"`,
    [],
  );

  const previewTable = useCallback(
    (name: string, kind: "table" | "view") => {
      // Left-clicking a sidebar entry opens it in a new tab whose title
      // is the entity's name (Update 3). The default query previews the
      // first 200 rows so the user can see data immediately.
      const sql = `SELECT * FROM ${quoteIdent(name)} LIMIT 200;`;
      openTabAndRun(
        name,
        sql,
        `${kind === "view" ? "View" : "Table"}: ${name}`,
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
        showToast(`Dropped ${label} "${name}".`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Drop failed: ${msg}`, "warn");
      }
    },
    [showToast],
  );

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
    const tab: QueryTab = {
      id: newTabId(),
      title: `Query ${nextNum}`,
      code: "-- New query\nSELECT 1;",
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
      // Prompt before closing a tab with non-trivial contents so the
      // user can't accidentally lose work.
      if (target.code.trim().length > 0 && tabs.length > 1) {
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
          : [{ id: newTabId(), title: "Query 1", code: "" }];
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
        : [{ id: newTabId(), title: "Query 1", code: "" }];
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
    const fresh = [{ id: newTabId(), title: "Query 1", code: "" }];
    setTabs(fresh);
    saveTabs(activeDbId, fresh);
    setActiveTabId(fresh[0].id);
    const editor = editorRef.current;
    if (editor) editor.setValue("");
  }, [activeDbId]);

  const resetTabsForCurrentDb = useCallback(() => {
    const sample = findSampleDatabase(activeDbId);
    const fresh = sample.defaultTabs.map((seed) => ({
      ...seed,
      id: newTabId(),
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
  const resizerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const resizer = resizerRef.current;
    const panes = panesRef.current;
    const resultsPane = resultsPaneRef.current;
    if (!resizer || !panes || !resultsPane) return;
    let dragging = false;
    let startY = 0;
    let startFrac = 0;
    const onDown = (e: MouseEvent) => {
      dragging = true;
      startY = e.clientY;
      startFrac = resultsPane.offsetHeight / panes.offsetHeight;
      resizer.classList.add("dragging");
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const frac = Math.min(
        0.85,
        Math.max(0.15, startFrac + (e.clientY - startY) / panes.offsetHeight),
      );
      panes.style.gridTemplateRows = `${frac * 100}% 6px 1fr`;
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
            <a href="/" className="brand-name">Dataslope</a>
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
                <Select.Positioner sideOffset={6} alignItemWithTrigger={false}>
                  <Select.Popup className="bui-select-popup">
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
              <pre className="sql-ddl-code" tabIndex={0}>
                {ddlDialog?.sql ?? ""}
              </pre>
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

        <div className="sql-shell" ref={shellRef}>
          <aside className="sql-sidebar" aria-label="Database explorer">
            <div className="sql-db-selector-wrap">
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

            <div className="sql-tree">
              <div className="sql-tree-section">
                <div className="sql-tree-label">TABLES ({tables.length})</div>
                {tables.map((name) => (
                  <SchemaItem
                    key={`t-${name}`}
                    name={name}
                    kind="table"
                    onPreview={previewTable}
                    onStructure={describeEntity}
                    onCount={countEntityRows}
                    onCopy={copyEntityName}
                    onDrop={dropEntity}
                    onViewDDL={viewDDL}
                  />
                ))}
                {tables.length === 0 && (
                  <div className="sql-tree-empty">No tables.</div>
                )}
              </div>
              <div className="sql-tree-section">
                <div className="sql-tree-label">VIEWS ({views.length})</div>
                {views.map((name) => (
                  <SchemaItem
                    key={`v-${name}`}
                    name={name}
                    kind="view"
                    onPreview={previewTable}
                    onStructure={describeEntity}
                    onCount={countEntityRows}
                    onCopy={copyEntityName}
                    onDrop={dropEntity}
                    onViewDDL={viewDDL}
                  />
                ))}
                {views.length === 0 && (
                  <div className="sql-tree-empty">No views.</div>
                )}
              </div>
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
            <div className="sql-results-pane" ref={resultsPaneRef}>
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
              <div className="sql-results-body">
                <ResultView
                  result={result}
                  loading={!loaded}
                  onClear={clearActiveTabResult}
                />
              </div>
              <DataslopeRunOverlay running={statusState === "running"} />
            </div>

            <div
              className="sql-resizer"
              ref={resizerRef}
              role="separator"
              aria-orientation="horizontal"
              aria-label="Drag to resize results and editor"
              title="Drag to resize"
            />

            <div className="sql-editor-pane">
              <div className="editor-wrap">
                <textarea ref={textareaRef} defaultValue="" />
              </div>
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
  onClear,
}: {
  result: QueryRunResult | null;
  loading: boolean;
  onClear: () => void;
}) {
  // Pagination state lives at the ResultView level (one record per
  // result-set index) so the pagers can be rendered in a footer that
  // sits *outside* the horizontally/vertically scrolling content.
  // Without this lift the pagination bar would scroll with the table —
  // the very behaviour Updates 1 and 2 ask us to remove.
  const [pageStates, setPageStates] = useState<
    Record<number, { pageSize: number; page: number }>
  >({});
  const initialPageSize = useMemo(() => {
    if (typeof window === "undefined") return DEFAULT_PAGE_SIZE;
    const saved = Number(
      localStorage.getItem(`${STORAGE_PREFIX}page_size`) ?? DEFAULT_PAGE_SIZE,
    );
    return PAGE_SIZE_OPTIONS.some((opt) => opt.value === saved)
      ? saved
      : DEFAULT_PAGE_SIZE;
  }, []);

  // Reset pagination whenever a new result lands. Identity-comparing
  // against the result object is sufficient because `setResult` always
  // creates a new object.
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setPageStates({});
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
      <>
        <div className="sql-result-error">
          <div className="sql-result-error-title">Query failed</div>
          <pre className="sql-result-error-body">{result.error}</pre>
        </div>
        <ResultStatusFooter result={result} onClear={onClear} />
      </>
    );
  }
  if (result.sets.length === 0) {
    return (
      <>
        <div className="sql-result-ok">
          Statement executed successfully — no rows returned.
        </div>
        <ResultStatusFooter result={result} onClear={onClear} />
      </>
    );
  }
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
          return (
            <ResultTableBody
              key={idx}
              set={set}
              index={idx}
              visible={visible}
              startIndex={start}
            />
          );
        })}
      </div>
      <div className="sql-result-pagers">
        {result.sets.map((set, idx) => {
          const st = getState(idx);
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
            />
          );
        })}
        <ResultStatusFooter result={result} onClear={onClear} />
      </div>
    </>
  );
}

function ResultStatusFooter({
  result,
  onClear,
}: {
  result: QueryRunResult;
  onClear: () => void;
}) {
  const totalRows = result.sets.reduce((acc, s) => acc + s.values.length, 0);
  return (
    <div className="sql-result-status">
      <span className="sql-result-status-source">{result.source}</span>
      <span className="sql-result-status-meta">
        {result.error ? (
          <span className="sql-result-meta-err">Error</span>
        ) : (
          <span className="sql-result-meta-ok">
            {result.sets.length === 0
              ? "OK"
              : `${totalRows} row${totalRows === 1 ? "" : "s"}`}
          </span>
        )}
        {" · "}
        {(result.elapsedMs / 1000).toFixed(3)}s
      </span>
      <button
        type="button"
        className="clear-btn"
        onClick={onClear}
        title="Clear results"
        aria-label="Clear results"
      >
        <Eraser size={13} aria-hidden="true" />
        <span>Clear</span>
      </button>
    </div>
  );
}

function ResultTableBody({
  set,
  index,
  visible,
  startIndex,
}: {
  set: QueryExecResult;
  index: number;
  visible: QueryExecResult["values"];
  startIndex: number;
}) {
  return (
    <div className="sql-result-set">
      {index > 0 && (
        <div className="sql-result-set-label">Result set #{index + 1}</div>
      )}
      <div className="sql-result-table-wrap">
        <table className="sql-result-table">
          <thead>
            <tr>
              {set.columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, ri) => (
              <tr key={startIndex + ri}>
                {row.map((v, ci) => (
                  <td
                    key={ci}
                    className={v === null ? "sql-cell-null" : undefined}
                  >
                    {formatCellValue(v)}
                  </td>
                ))}
              </tr>
            ))}
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
}: {
  set: QueryExecResult;
  index: number;
  showSetLabel: boolean;
  pageSize: number;
  page: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const totalRows = set.values.length;
  const effective = pageSize > 0 ? pageSize : Math.max(totalRows, 1);
  const totalPages = Math.max(1, Math.ceil(totalRows / effective));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * effective;
  const end = Math.min(totalRows, start + effective);
  const showControls = totalRows > 0 && (pageSize === 0 || totalRows > pageSize);
  if (!showControls && !showSetLabel) return null;

  return (
    <div className="sql-result-pager">
      {showSetLabel && (
        <span className="sql-result-pager-set">
          Set #{index + 1}
        </span>
      )}
      <span className="sql-result-pager-info">
        {totalRows === 0
          ? "0 rows"
          : `Rows ${start + 1}–${end} of ${totalRows}`}
      </span>
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
            <svg viewBox="0 0 12 12" width={9} height={9} aria-hidden="true">
              <polyline
                points="2,4 6,8 10,4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
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
          «
        </button>
        <button
          type="button"
          className="sql-result-pager-btn"
          onClick={() => onPageChange(Math.max(0, safePage - 1))}
          disabled={safePage === 0}
          aria-label="Previous page"
          title="Previous page"
        >
          ‹
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
          ›
        </button>
        <button
          type="button"
          className="sql-result-pager-btn"
          onClick={() => onPageChange(totalPages - 1)}
          disabled={safePage >= totalPages - 1}
          aria-label="Last page"
          title="Last page"
        >
          »
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Schema sidebar item — a tree-row button wrapped in a Base UI
// ContextMenu so right-clicking a table or view exposes the typical
// IDE actions (View Structure, Preview Data, Count Rows, Copy Name,
// Drop). The primary left-click action stays as "preview" so the
// existing fast-path behaviour is preserved.
// ────────────────────────────────────────────────────────────────────────

interface SchemaItemProps {
  name: string;
  kind: "table" | "view";
  onPreview: (name: string, kind: "table" | "view") => void;
  onStructure: (name: string, kind: "table" | "view") => void;
  onCount: (name: string, kind: "table" | "view") => void;
  onCopy: (name: string) => void;
  onDrop: (name: string, kind: "table" | "view") => void;
  onViewDDL: (name: string, kind: "table" | "view") => void;
}

function SchemaItem({
  name,
  kind,
  onPreview,
  onStructure,
  onCount,
  onCopy,
  onDrop,
  onViewDDL,
}: SchemaItemProps) {
  const Icon = kind === "view" ? Eye : Table2;
  // SQL strings mirrored from the engine so the tab contents exactly
  // match what is run against the database.
  const quotedName = `"${name.replace(/"/g, '""')}"`;
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        render={(props) => (
          <button
            type="button"
            {...props}
            className="sql-tree-item"
            onClick={() => onPreview(name, kind)}
            title={`Open ${name} in a new tab (right-click for more)`}
          >
            <Icon size={12} aria-hidden="true" />
            <span>{name}</span>
          </button>
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
              <div className="ex-desc">First 200 rows</div>
            </ContextMenu.Item>
            <ContextMenu.Item
              className="example-item"
              onClick={() => onStructure(name, kind)}
            >
              <div className="ex-title">View Structure</div>
              <div className="ex-desc">PRAGMA table_info({quotedName})</div>
            </ContextMenu.Item>
            <ContextMenu.Item
              className="example-item"
              onClick={() => onCount(name, kind)}
            >
              <div className="ex-title">Count Rows</div>
              <div className="ex-desc">SELECT COUNT(*)</div>
            </ContextMenu.Item>
            <ContextMenu.Item
              className="example-item"
              onClick={() => onViewDDL(name, kind)}
            >
              <div className="ex-title">View DDL</div>
              <div className="ex-desc">CREATE statement</div>
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
                Drop {kind === "view" ? "View" : "Table"}
              </div>
              <div className="ex-desc">In-memory only</div>
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
