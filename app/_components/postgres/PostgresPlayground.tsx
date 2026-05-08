"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { autocompletion, closeBracketsKeymap, completionKeymap, startCompletion, acceptCompletion } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, indentOnInput, indentUnit } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { EditorState, Compartment } from "@codemirror/state";
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { sql as sqlLang, PostgreSQL } from "@codemirror/lang-sql";
import { AlertDialog } from "@base-ui-components/react/alert-dialog";
import { Dialog } from "@base-ui-components/react/dialog";
import { Menu } from "@base-ui-components/react/menu";
import { Popover } from "@base-ui-components/react/popover";
import { Select } from "@base-ui-components/react/select";
import { Toast } from "@base-ui-components/react/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  Database,
  FilePlus,
  FileJson,
  FileText,
  Network,
  Play,
  Plus,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { FaInfo } from "react-icons/fa";
import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import "../playground.css";
import "../sqlPlayground.css";
import { ErDiagramPane } from "../ErDiagramPane";
import {
  LANGUAGE_ICONS as PLAYGROUND_ICONS,
  LANGUAGE_ICON_COLORS as PLAYGROUND_ICON_COLORS,
  LANGUAGE_ICON_SIZE_FACTOR as PLAYGROUND_ICON_SIZE_FACTOR,
} from "../languageIcons";
import { PLAYGROUNDS } from "../playgrounds";
import { themeFor } from "../cmExtensions";
import {
  applyMode,
  applyThemePalette,
  clearThemePalette,
  getStoredEditorTheme,
  setStoredEditorTheme,
} from "../playgroundTheme";
import {
  DEFAULT_PLAYGROUND_SETTINGS,
  RuntimeInfoContent,
  SettingsPanel,
} from "../playgroundShared";
import {
  POSTGRES_SAMPLE_DATABASES,
  POSTGRES_BLANK_DATABASE,
  findPostgresSampleDatabase,
} from "../runtime/postgresSamples";
import {
  createPostgresEngine,
  type PostgresEngine,
} from "../runtime/postgres";
import type { ForeignKeyInfo, TableColumnInfo } from "../runtime/sqlite";
import type { QueryExecResult } from "sql.js";
import type { QueryTab } from "../sqlitePlaygroundTabs";
import { newTabId } from "../sqlitePlaygroundTabs";
import { SqlTab } from "../sql/components/SqlTab";
import { ResultView } from "../sql/components/ResultView";
import { SchemaItem } from "../sql/components/SchemaItem";
import { SchemaLeafItem } from "../sql/components/SchemaLeafItem";
import { SchemaSection } from "../sql/components/SchemaSection";
import { ToastList } from "../sql/components/ToastList";
import {
  exportResultToCsv,
  exportResultToJson,
  exportResultToParquet,
  exportResultToSql,
  exportResultToXlsx,
  toFileSafeName,
} from "../sql/utils/exportUtils";
import { isSingleSelectSql, hasLimitClause, stripSqlComments } from "../sql/utils/sqlAnalysis";
import { computeImportColComparison } from "../sql/utils/importUtils";
import type {
  ColumnKeyHints,
  CsvImportState,
  ImportColComparison,
  JsonImportState,
  ParquetImportState,
  QueryRunResult,
  ResultSetExportScope,
  ResultSetExportSnapshot,
} from "../sql/types";
import type { RuntimeInfo } from "../types";
import { createSqlCompletionSource, type SqlCompletionSchema } from "../sql/sqlCompletion";
import { usePostgresSettingsStore } from "./stores/usePostgresSettingsStore";
import {
  importRowsIntoPostgres,
  parseCsv,
  readParquetFile,
  tableNameFromFilename,
} from "./postgresImport";

const PLAYGROUND_ID = "postgres";
const STORAGE_PREFIX = "pg_postgres_";
const storageKey = (key: string) => `${STORAGE_PREFIX}${key}`;
const dbScopedKey = (dbId: string, key: string) =>
  `${STORAGE_PREFIX}db_${dbId}_${key}`;
const DEFAULT_PAGE_SIZE = 50;

const RUNTIME_INFO: RuntimeInfo = {
  language: "PostgreSQL",
  version: "17",
  engine: "PGlite 0.4",
  engineUrl: "https://pglite.dev/",
  notes:
    "Pure-WASM build of PostgreSQL that runs entirely in your browser. Each sample database is rebuilt in memory on every page load.",
};

const IMPORT_COL_STATUS_LABEL: Record<ImportColComparison["status"], string> = {
  matched: "✓ Matched",
  extra: "⚠ Not in table",
  optional: "○ Optional",
  required: "✗ Required",
};

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function makeTabs(defaults: { title: string; code: string }[]): QueryTab[] {
  return defaults.map((seed) => ({
    ...seed,
    id: newTabId(),
    pristineCode: seed.code,
  }));
}

function loadTabs(dbId: string): QueryTab[] {
  const sample = findPostgresSampleDatabase(dbId);
  if (typeof window === "undefined") return makeTabs(sample.defaultTabs);
  try {
    const raw = localStorage.getItem(dbScopedKey(dbId, "tabs"));
    if (raw) {
      const parsed = JSON.parse(raw) as QueryTab[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((tab) => ({
          id: typeof tab.id === "string" ? tab.id : newTabId(),
          title: typeof tab.title === "string" ? tab.title : "Query",
          code: typeof tab.code === "string" ? tab.code : "",
          pristineCode:
            typeof tab.pristineCode === "string"
              ? tab.pristineCode
              : typeof tab.code === "string"
                ? tab.code
                : "",
          kind: tab.kind === "view-data" ? "view-data" : undefined,
        }));
      }
    }
  } catch {
    // Fall back to defaults.
  }
  return makeTabs(sample.defaultTabs);
}

function saveTabs(dbId: string, tabs: QueryTab[]): void {
  try {
    localStorage.setItem(
      dbScopedKey(dbId, "tabs"),
      JSON.stringify(tabs.filter((tab) => tab.kind !== "er-diagram")),
    );
  } catch {
    // Ignore storage quota / private-mode errors.
  }
}

function tabsAreDirty(tabs: QueryTab[], defaults: { title: string; code: string }[]): boolean {
  if (tabs.length !== defaults.length) return true;
  for (let i = 0; i < tabs.length; i += 1) {
    if (tabs[i].title !== defaults[i].title || tabs[i].code !== defaults[i].code) {
      return true;
    }
  }
  return false;
}

type ImportFlavor = "csv" | "json" | "parquet";

function PostgresPlaygroundInner() {
  const router = useRouter();
  const toastManager = Toast.useToastManager();
  const showToast = useCallback(
    (title: string, kind: "info" | "warn" = "info") => {
      startTransition(() => {
        toastManager.add({ title, data: { kind } });
      });
    },
    [toastManager],
  );

  // ─── Settings store ───────────────────────────────────────────────────
  const fontSize = usePostgresSettingsStore((s) => s.fontSize);
  const setFontSizeState = usePostgresSettingsStore((s) => s.setFontSize);
  const outputFontSizeEnabled = usePostgresSettingsStore(
    (s) => s.outputFontSizeEnabled,
  );
  const setOutputFontSizeEnabledState = usePostgresSettingsStore(
    (s) => s.setOutputFontSizeEnabled,
  );
  const outputFontSize = usePostgresSettingsStore((s) => s.outputFontSize);
  const setOutputFontSizeState = usePostgresSettingsStore(
    (s) => s.setOutputFontSize,
  );
  const editorTheme = usePostgresSettingsStore((s) => s.editorTheme);
  const setEditorThemeState = usePostgresSettingsStore((s) => s.setEditorTheme);
  const wordWrap = usePostgresSettingsStore((s) => s.wordWrap);
  const setWordWrapState = usePostgresSettingsStore((s) => s.setWordWrap);
  const clearBeforeRun = usePostgresSettingsStore((s) => s.clearBeforeRun);
  const setClearBeforeRunState = usePostgresSettingsStore(
    (s) => s.setClearBeforeRun,
  );

  const setFontSize = useCallback(
    (n: number) => {
      setFontSizeState(n);
      try {
        localStorage.setItem(storageKey("fontsize"), String(n));
      } catch {
        /* ignore */
      }
    },
    [setFontSizeState],
  );
  const setOutputFontSizeEnabled = useCallback(
    (b: boolean) => {
      setOutputFontSizeEnabledState(b);
      try {
        localStorage.setItem(storageKey("outputfontsize_enabled"), String(b));
      } catch {
        /* ignore */
      }
    },
    [setOutputFontSizeEnabledState],
  );
  const setOutputFontSize = useCallback(
    (n: number) => {
      setOutputFontSizeState(n);
      try {
        localStorage.setItem(storageKey("outputfontsize"), String(n));
      } catch {
        /* ignore */
      }
    },
    [setOutputFontSizeState],
  );
  const setEditorTheme = useCallback(
    (theme: string) => {
      setEditorThemeState(theme);
      setStoredEditorTheme(theme);
    },
    [setEditorThemeState],
  );
  const setWordWrap = useCallback(
    (b: boolean) => {
      setWordWrapState(b);
      try {
        localStorage.setItem(storageKey("wordwrap"), String(b));
      } catch {
        /* ignore */
      }
    },
    [setWordWrapState],
  );
  const setClearBeforeRun = useCallback(
    (b: boolean) => {
      setClearBeforeRunState(b);
      try {
        localStorage.setItem(storageKey("clearbeforerun"), String(b));
      } catch {
        /* ignore */
      }
    },
    [setClearBeforeRunState],
  );

  // ─── Engine / UI state ───────────────────────────────────────────────
  const initialDbId =
    typeof window === "undefined"
      ? POSTGRES_SAMPLE_DATABASES[0].id
      : localStorage.getItem(storageKey("db")) ?? POSTGRES_SAMPLE_DATABASES[0].id;
  const [activeDbId, setActiveDbId] = useState(initialDbId);
  const [tabs, setTabs] = useState<QueryTab[]>(() => loadTabs(initialDbId));
  const [activeTabId, setActiveTabId] = useState(() => tabs[0]?.id ?? "");
  const [resultsByTab, setResultsByTab] = useState<Record<string, QueryRunResult | null>>({});
  const [loaded, setLoaded] = useState(false);
  const [statusState, setStatusState] = useState<"loading" | "ready" | "running" | "error">("loading");
  const [loadingMessage, setLoadingMessage] = useState("Loading PostgreSQL engine…");
  const [tables, setTables] = useState<string[]>([]);
  const [views, setViews] = useState<string[]>([]);
  const [indexesExpanded, setIndexesExpanded] = useState(true);
  const [viewsExpanded, setViewsExpanded] = useState(true);
  const [tablesExpanded, setTablesExpanded] = useState(true);
  const [triggersExpanded, setTriggersExpanded] = useState(true);
  const [indexes, setIndexes] = useState<string[]>([]);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [columnsByEntity, setColumnsByEntity] = useState<Record<string, TableColumnInfo[]>>({});
  const [foreignKeysByEntity, setForeignKeysByEntity] = useState<Record<string, ForeignKeyInfo[]>>({});
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
  const [globalPageSize, setGlobalPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [resultSetExportSnapshot, setResultSetExportSnapshot] =
    useState<ResultSetExportSnapshot | null>(null);
  const [rowCountByTable, setRowCountByTable] = useState<Record<string, number>>({});

  // ─── Dialog state ─────────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [confirmClearStorageOpen, setConfirmClearStorageOpen] = useState(false);
  const [pendingDbId, setPendingDbId] = useState<string | null>(null);
  const [pendingDropEntity, setPendingDropEntity] = useState<{
    name: string;
    kind: "table" | "view" | "index" | "trigger";
  } | null>(null);

  const [importCsvOpen, setImportCsvOpen] = useState(false);
  const [importCsvDragging, setImportCsvDragging] = useState(false);
  const [importCsvState, setImportCsvState] = useState<CsvImportState | null>(null);
  const [importJsonOpen, setImportJsonOpen] = useState(false);
  const [importJsonDragging, setImportJsonDragging] = useState(false);
  const [importJsonState, setImportJsonState] = useState<JsonImportState | null>(null);
  const [importParquetOpen, setImportParquetOpen] = useState(false);
  const [importParquetDragging, setImportParquetDragging] = useState(false);
  const [importParquetState, setImportParquetState] =
    useState<ParquetImportState | null>(null);

  // ─── Refs ─────────────────────────────────────────────────────────────
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const langCompRef = useRef<Compartment | null>(null);
  const completionCompRef = useRef<Compartment | null>(null);
  const themeCompRef = useRef<Compartment | null>(null);
  const wrapCompRef = useRef<Compartment | null>(null);
  const engineRef = useRef<PostgresEngine | null>(null);
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  const activeDbIdRef = useRef(activeDbId);
  const runningRef = useRef(false);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null;
  const result = activeTab ? resultsByTab[activeTab.id] ?? null : null;
  const activeSample = findPostgresSampleDatabase(activeDbId);
  const tabIds = useMemo(() => tabs.map((tab) => tab.id), [tabs]);
  const tabDragSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const persistTabs = useCallback((nextTabs: QueryTab[], dbId = activeDbIdRef.current) => {
    tabsRef.current = nextTabs;
    setTabs(nextTabs);
    saveTabs(dbId, nextTabs);
  }, []);

  const refreshSchema = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    const [nextTables, nextViews, nextIndexes, nextTriggers] = await Promise.all([
      engine.listTables(),
      engine.listViews(),
      engine.listIndexes(),
      engine.listTriggers(),
    ]);
    const entries = await Promise.all(
      [...nextTables, ...nextViews].map(async (name) => {
        const [colsResult, fksResult, countResult] = await Promise.allSettled([
          engine.listColumns(name),
          engine.listForeignKeys(name),
          engine.exec(`SELECT COUNT(*) FROM ${quoteIdent(name)}`),
        ]);
        const cols = colsResult.status === "fulfilled" ? colsResult.value : [];
        const fks = fksResult.status === "fulfilled" ? fksResult.value : [];
        const count =
          countResult.status === "fulfilled"
            ? Number(countResult.value[0]?.values?.[0]?.[0] ?? 0)
            : 0;
        return [name, cols, fks, count] as const;
      }),
    );
    setTables(nextTables);
    setViews(nextViews);
    setIndexes(nextIndexes);
    setTriggers(nextTriggers);
    setColumnsByEntity(Object.fromEntries(entries.map(([name, cols]) => [name, cols])));
    setForeignKeysByEntity(Object.fromEntries(entries.map(([name, , fks]) => [name, fks])));
    setRowCountByTable(Object.fromEntries(entries.map(([name, , , count]) => [name, count])));
  }, []);

  const runSqlForTab = useCallback(
    async (
      tabId: string,
      sql: string,
      source: string,
      sourceTable?: string,
      page = 0,
      baseSql?: string,
    ) => {
      const engine = engineRef.current;
      if (!engine || runningRef.current) return;
      const trimmed = sql.trim();
      if (!trimmed) {
        showToast("Nothing to run — the query is empty.", "warn");
        return;
      }
      runningRef.current = true;
      setStatusState("running");
      if (clearBeforeRun) {
        setResultsByTab((prev) => ({ ...prev, [tabId]: null }));
      }
      const t0 = performance.now();
      const noComments = stripSqlComments(trimmed);
      const useLazy =
        globalPageSize > 0 &&
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
          const lazy = await engine.execPaged(trimmed, globalPageSize, page * globalPageSize);
          sets = lazy.result;
          lazySql = trimmed.replace(/\s*;+\s*$/, "");
          lazyBaseSql = (baseSql ?? trimmed).replace(/\s*;+\s*$/, "");
          lazyTotalCount = lazy.totalCount;
          lazyPage = page;
          lazyPageSize = globalPageSize;
        } else {
          sets = await engine.exec(trimmed);
        }
        setResultsByTab((prev) => ({
          ...prev,
          [tabId]: {
            sets,
            elapsedMs: performance.now() - t0,
            source,
            sourceTable,
            lazySql,
            lazyBaseSql,
            lazyTotalCount,
            lazyPage,
            lazyPageSize,
          },
        }));
        await refreshSchema();
        setStatusState("ready");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setResultsByTab((prev) => ({
          ...prev,
          [tabId]: {
            sets: [],
            elapsedMs: performance.now() - t0,
            source,
            sourceTable,
            error: message,
          },
        }));
        setStatusState("error");
        window.setTimeout(() => setStatusState("ready"), 3000);
      } finally {
        runningRef.current = false;
      }
    },
    [clearBeforeRun, globalPageSize, refreshSchema, showToast],
  );

  const runActiveTab = useCallback(() => {
    const tab = tabsRef.current.find((candidate) => candidate.id === activeTabIdRef.current);
    if (!tab || tab.kind === "er-diagram") return;
    const sql = editorRef.current?.state.doc.toString() ?? tab.code;
    void runSqlForTab(tab.id, sql, tab.title, tab.kind === "view-data" ? tab.title : undefined);
  }, [runSqlForTab]);
  const runActiveTabRef = useRef(runActiveTab);
  useEffect(() => {
    runActiveTabRef.current = runActiveTab;
  }, [runActiveTab]);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);
  useEffect(() => {
    activeTabIdRef.current = activeTabId;
    try {
      localStorage.setItem(dbScopedKey(activeDbIdRef.current, "active_tab"), activeTabId);
    } catch {
      /* ignore */
    }
  }, [activeTabId]);
  useEffect(() => {
    activeDbIdRef.current = activeDbId;
  }, [activeDbId]);

  // ─── Hydrate persisted settings on mount ─────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    document.title = "PostgreSQL Playground";
    document.body.classList.add("pg-active");
    const D = DEFAULT_PLAYGROUND_SETTINGS;
    const savedSize =
      Number(localStorage.getItem(storageKey("fontsize")) ?? D.fontSize) ||
      D.fontSize;
    const savedOutputFontEnabled =
      localStorage.getItem(storageKey("outputfontsize_enabled")) === "true";
    const savedOutputSize =
      Number(localStorage.getItem(storageKey("outputfontsize")) ?? D.outputFontSize) ||
      D.outputFontSize;
    const savedTheme =
      getStoredEditorTheme(storageKey("editortheme")) ?? D.editorTheme;
    const savedWordWrap =
      localStorage.getItem(storageKey("wordwrap")) !== "false";
    const savedClearBeforeRun =
      localStorage.getItem(storageKey("clearbeforerun")) === "true";

    setFontSizeState(savedSize);
    setOutputFontSizeEnabledState(savedOutputFontEnabled);
    setOutputFontSizeState(savedOutputSize);
    setEditorThemeState(savedTheme);
    setWordWrapState(savedWordWrap);
    setClearBeforeRunState(savedClearBeforeRun);

    applyMode(savedTheme);
    applyThemePalette(savedTheme);
    document.documentElement.style.setProperty("--cm-font-size", `${savedSize}px`);
    document.documentElement.style.setProperty(
      "--output-font-size",
      `${savedOutputFontEnabled ? savedOutputSize : savedSize}px`,
    );

    // Restore the active tab id for this database.
    try {
      const savedActiveTab = localStorage.getItem(
        dbScopedKey(initialDbId, "active_tab"),
      );
      if (savedActiveTab && tabsRef.current.some((tab) => tab.id === savedActiveTab)) {
        setActiveTabId(savedActiveTab);
      }
    } catch {
      /* ignore */
    }

    return () => {
      document.body.classList.remove("pg-active");
      clearThemePalette();
    };
  }, [
    initialDbId,
    setClearBeforeRunState,
    setEditorThemeState,
    setFontSizeState,
    setOutputFontSizeEnabledState,
    setOutputFontSizeState,
    setWordWrapState,
  ]);

  // ─── Editor + engine init ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    if (editorHostRef.current && !editorRef.current) {
      const langComp = new Compartment();
      const completionComp = new Compartment();
      const themeComp = new Compartment();
      const wrapComp = new Compartment();
      const initialTheme =
        getStoredEditorTheme(storageKey("editortheme")) ??
        DEFAULT_PLAYGROUND_SETTINGS.editorTheme;
      const initialWordWrap =
        typeof window === "undefined"
          ? DEFAULT_PLAYGROUND_SETTINGS.wordWrap
          : localStorage.getItem(storageKey("wordwrap")) !== "false";
      const view = new EditorView({
        doc: activeTab?.code ?? "",
        parent: editorHostRef.current,
        extensions: [
          history(),
          drawSelection(),
          dropCursor(),
          EditorState.allowMultipleSelections.of(true),
          indentOnInput(),
          bracketMatching(),
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          crosshairCursor(),
          EditorState.tabSize.of(2),
          indentUnit.of("  "),
          langComp.of(sqlLang({ dialect: PostgreSQL, upperCaseKeywords: false })),
          completionComp.of(autocompletion({ override: [createSqlCompletionSource({ entities: [] })] })),
          themeComp.of(themeFor(initialTheme)),
          wrapComp.of(initialWordWrap ? EditorView.lineWrapping : []),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;
            const id = activeTabIdRef.current;
            const code = update.state.doc.toString();
            const next = tabsRef.current.map((tab) =>
              tab.id === id ? { ...tab, code } : tab,
            );
            persistTabs(next);
          }),
          keymap.of([
            {
              key: "Mod-Enter",
              run: () => {
                runActiveTabRef.current();
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
            ...completionKeymap.filter((b) => b.key !== "Enter"),
            { key: "Tab", run: acceptCompletion },
            indentWithTab,
          ]),
        ],
      });
      editorRef.current = view;
      langCompRef.current = langComp;
      completionCompRef.current = completionComp;
      themeCompRef.current = themeComp;
      wrapCompRef.current = wrapComp;
    }
    (async () => {
      try {
        setLoadingMessage("Loading PostgreSQL engine…");
        const engine = await createPostgresEngine(initialDbId);
        if (cancelled) return;
        engineRef.current = engine;
        await refreshSchema();
        setLoaded(true);
        setStatusState("ready");
      } catch (err) {
        if (cancelled) return;
        setLoadingMessage(`Failed to load: ${err instanceof Error ? err.message : String(err)}`);
        setStatusState("error");
      }
    })();
    return () => {
      cancelled = true;
      editorRef.current?.destroy();
      editorRef.current = null;
      langCompRef.current = null;
      completionCompRef.current = null;
      themeCompRef.current = null;
      wrapCompRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const view = editorRef.current;
    if (!view || !activeTab || activeTab.kind === "er-diagram" || activeTab.kind === "view-data")
      return;
    const current = view.state.doc.toString();
    if (current !== activeTab.code) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: activeTab.code } });
    }
    view.focus();
  }, [activeTabId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply editor theme.
  useEffect(() => {
    const view = editorRef.current;
    if (view && themeCompRef.current) {
      view.dispatch({
        effects: themeCompRef.current.reconfigure(themeFor(editorTheme)),
      });
    }
    applyThemePalette(editorTheme);
    applyMode(editorTheme);
  }, [editorTheme]);

  // Apply word wrap.
  useEffect(() => {
    const view = editorRef.current;
    if (view && wrapCompRef.current) {
      view.dispatch({
        effects: wrapCompRef.current.reconfigure(
          wordWrap ? EditorView.lineWrapping : [],
        ),
      });
    }
  }, [wordWrap]);

  // Apply font size.
  useEffect(() => {
    document.documentElement.style.setProperty("--cm-font-size", `${fontSize}px`);
    editorRef.current?.requestMeasure();
  }, [fontSize]);

  // Apply output font size.
  useEffect(() => {
    const effective = outputFontSizeEnabled ? outputFontSize : fontSize;
    document.documentElement.style.setProperty(
      "--output-font-size",
      `${effective}px`,
    );
  }, [outputFontSizeEnabled, outputFontSize, fontSize]);

  // Keep autocomplete schema in sync with current tables/views.
  useEffect(() => {
    const view = editorRef.current;
    const langComp = langCompRef.current;
    const completionComp = completionCompRef.current;
    if (!view || !langComp || !completionComp) return;
    const schema: Record<string, string[]> = {};
    const completionSchema: SqlCompletionSchema = { entities: [] };
    for (const name of tables) {
      const cols = columnsByEntity[name]?.map((column) => column.name) ?? [];
      schema[name] = cols;
      completionSchema.entities.push({ name, columns: cols, kind: "table" });
    }
    for (const name of views) {
      const cols = columnsByEntity[name]?.map((column) => column.name) ?? [];
      schema[name] = cols;
      completionSchema.entities.push({ name, columns: cols, kind: "view" });
    }
    view.dispatch({
      effects: [
        langComp.reconfigure(sqlLang({ dialect: PostgreSQL, schema, upperCaseKeywords: false })),
        completionComp.reconfigure(
          autocompletion({ override: [createSqlCompletionSource(completionSchema)] }),
        ),
      ],
    });
  }, [tables, views, columnsByEntity]);

  // Drop result entries whose owning tab no longer exists.
  useEffect(() => {
    setResultsByTab((prev) => {
      const ids = new Set(tabs.map((tab) => tab.id));
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
  }, [tabs]);

  // ─── Database switching ──────────────────────────────────────────────
  const performDbSwitch = useCallback(
    async (nextId: string) => {
      const engine = engineRef.current;
      if (!engine || nextId === activeDbIdRef.current) return;
      setStatusState("loading");
      try {
        const sample =
          nextId === POSTGRES_BLANK_DATABASE.id
            ? await engine.loadBlankDatabase()
            : await engine.loadSampleDatabase(nextId);
        setActiveDbId(sample.id);
        try {
          localStorage.setItem(storageKey("db"), sample.id);
        } catch {
          /* ignore */
        }
        const nextTabs = loadTabs(sample.id);
        persistTabs(nextTabs, sample.id);
        // Try to restore active tab id for this DB.
        let nextActive = nextTabs[0]?.id ?? "";
        try {
          const savedActive = localStorage.getItem(
            dbScopedKey(sample.id, "active_tab"),
          );
          if (savedActive && nextTabs.some((tab) => tab.id === savedActive)) {
            nextActive = savedActive;
          }
        } catch {
          /* ignore */
        }
        setActiveTabId(nextActive);
        setResultsByTab({});
        await refreshSchema();
        setStatusState("ready");
        showToast(`Loaded ${sample.filename}.`);
      } catch (err) {
        showToast(`Load failed: ${err instanceof Error ? err.message : String(err)}`, "warn");
        setStatusState("ready");
      }
    },
    [persistTabs, refreshSchema, showToast],
  );

  const requestDbSwitch = useCallback(
    (nextId: string) => {
      if (nextId === activeDbIdRef.current) return;
      const curSample = findPostgresSampleDatabase(activeDbIdRef.current);
      if (tabsAreDirty(tabsRef.current, curSample.defaultTabs)) {
        setPendingDbId(nextId);
        return;
      }
      void performDbSwitch(nextId);
    },
    [performDbSwitch],
  );

  // ─── Tab management ──────────────────────────────────────────────────
  const addTab = useCallback(() => {
    const tab: QueryTab = {
      id: newTabId(),
      title: `Query ${tabsRef.current.length + 1}`,
      code: "",
      pristineCode: "",
    };
    persistTabs([...tabsRef.current, tab]);
    setActiveTabId(tab.id);
  }, [persistTabs]);

  const closeTab = useCallback((id: string) => {
    const next = tabsRef.current.filter((tab) => tab.id !== id);
    const fallback = next[0] ?? {
      id: newTabId(),
      title: "Query 1",
      code: "",
      pristineCode: "",
    };
    const finalTabs = next.length > 0 ? next : [fallback];
    persistTabs(finalTabs);
    if (activeTabIdRef.current === id) setActiveTabId(fallback.id);
    setResultsByTab((prev) => {
      const { [id]: _deleted, ...rest } = prev;
      void _deleted;
      return rest;
    });
  }, [persistTabs]);

  const resetTabsForCurrentDb = useCallback(() => {
    const sample = findPostgresSampleDatabase(activeDbIdRef.current);
    const fresh = makeTabs(sample.defaultTabs);
    persistTabs(fresh);
    setActiveTabId(fresh[0]?.id ?? "");
    setResultsByTab({});
    showToast(`Reset query tabs for ${sample.label}.`);
  }, [persistTabs, showToast]);

  const previewEntity = useCallback(
    (name: string, kind: "table" | "view") => {
      const sql = `SELECT * FROM ${quoteIdent(name)};`;
      const tab: QueryTab = {
        id: newTabId(),
        title: name,
        code: sql,
        pristineCode: sql,
        kind: kind === "table" ? "view-data" : undefined,
      };
      persistTabs([...tabsRef.current, tab]);
      setActiveTabId(tab.id);
      void runSqlForTab(
        tab.id,
        sql,
        `${kind === "table" ? "Table" : "View"}: ${name}`,
        kind === "table" ? name : undefined,
      );
    },
    [persistTabs, runSqlForTab],
  );

  const openErDiagramTab = useCallback(() => {
    const existing = tabsRef.current.find((tab) => tab.kind === "er-diagram");
    if (existing) {
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
    persistTabs([...tabsRef.current, tab]);
    setActiveTabId(tab.id);
  }, [persistTabs]);

  // ─── Settings actions ────────────────────────────────────────────────
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
      /* ignore */
    }
    window.location.reload();
  }, []);

  // ─── Result/sidebar helpers ──────────────────────────────────────────
  const resultKeyHints = useMemo<ColumnKeyHints | undefined>(() => {
    const tableName = result?.sourceTable;
    if (!tableName) return undefined;
    const cols = columnsByEntity[tableName] ?? [];
    const fks = foreignKeysByEntity[tableName] ?? [];
    return {
      pk: new Set(cols.filter((col) => col.pk > 0).map((col) => col.name)),
      fk: new Map(fks.map((fk) => [fk.from, fk])),
    };
  }, [result, columnsByEntity, foreignKeysByEntity]);

  const exportResultSet = useCallback(
    async (format: "csv" | "json" | "sql" | "parquet" | "xlsx", scope: ResultSetExportScope) => {
      if (!result || result.sets.length === 0) return;
      const set = resultSetExportSnapshot
        ? result.sets[resultSetExportSnapshot.setIndex] ?? result.sets[0]
        : result.sets[0];
      const columns = resultSetExportSnapshot?.columns ?? set.columns;
      let rows = scope === "page" && resultSetExportSnapshot
        ? resultSetExportSnapshot.rows
        : resultSetExportSnapshot?.allRows ?? set.values;
      if (scope === "all" && result.lazySql && engineRef.current) {
        rows = (await engineRef.current.exec(result.lazySql))[0]?.values ?? rows;
      }
      const title = activeTab?.title ?? "result_set";
      const filename = `${toFileSafeName(title)}.${format}`;
      if (format === "csv") exportResultToCsv(columns, rows, filename);
      else if (format === "json") exportResultToJson(columns, rows, filename);
      else if (format === "sql") exportResultToSql(columns, rows, filename);
      else if (format === "parquet") await exportResultToParquet(columns, rows, filename);
      else await exportResultToXlsx(columns, rows, filename);
    },
    [activeTab, result, resultSetExportSnapshot],
  );

  const handleLoadPage = useCallback(
    (sql: string, page: number) => {
      const tab = tabsRef.current.find((candidate) => candidate.id === activeTabIdRef.current);
      const curResult = tab ? resultsByTab[tab.id] : null;
      if (!tab) return;
      void runSqlForTab(
        tab.id,
        sql,
        curResult?.source ?? tab.title,
        curResult?.sourceTable,
        page,
        curResult?.lazyBaseSql ?? curResult?.lazySql,
      );
    },
    [resultsByTab, runSqlForTab],
  );

  const copyEntityName = useCallback(
    (name: string) => {
      void navigator.clipboard?.writeText(name);
      showToast(`Copied "${name}".`);
    },
    [showToast],
  );

  const countEntityRows = useCallback(
    (name: string, kind: "table" | "view") => {
      const sql = `SELECT COUNT(*) AS row_count FROM ${quoteIdent(name)};`;
      const tab: QueryTab = { id: newTabId(), title: `Count: ${name}`, code: sql, pristineCode: sql };
      persistTabs([...tabsRef.current, tab]);
      setActiveTabId(tab.id);
      void runSqlForTab(tab.id, sql, `${kind === "view" ? "View row count" : "Row count"}: ${name}`);
    },
    [persistTabs, runSqlForTab],
  );

  const viewDDL = useCallback(
    async (name: string) => {
      const ddl = await engineRef.current?.getDDL(name);
      if (!ddl) return;
      const tab: QueryTab = { id: newTabId(), title: `DDL: ${name}`, code: ddl, pristineCode: ddl };
      persistTabs([...tabsRef.current, tab]);
      setActiveTabId(tab.id);
    },
    [persistTabs],
  );

  const openEntityStructure = useCallback(
    (name: string) => {
      const escapedName = name.replace(/'/g, "''");
      const sql =
        `SELECT\n  column_name AS name,\n  data_type AS type,\n  is_nullable,\n  column_default AS default\nFROM information_schema.columns\nWHERE table_schema = 'public'\n  AND table_name = '${escapedName}'\nORDER BY ordinal_position;`;
      const tab: QueryTab = {
        id: newTabId(),
        title: `Structure: ${name}`,
        code: sql,
        pristineCode: sql,
      };
      persistTabs([...tabsRef.current, tab]);
      setActiveTabId(tab.id);
      void runSqlForTab(tab.id, sql, `Structure: ${name}`);
    },
    [persistTabs, runSqlForTab],
  );

  const requestDropEntity = useCallback(
    (name: string, kind: "table" | "view" | "index" | "trigger") => {
      setPendingDropEntity({ name, kind });
    },
    [],
  );

  const performDropEntity = useCallback(async () => {
    const target = pendingDropEntity;
    if (!target) return;
    setPendingDropEntity(null);
    try {
      await engineRef.current?.dropEntity(target.name, target.kind);
      await refreshSchema();
      showToast(`Dropped ${target.kind} "${target.name}".`);
    } catch (err) {
      showToast(
        `Drop failed: ${err instanceof Error ? err.message : String(err)}`,
        "warn",
      );
    }
  }, [pendingDropEntity, refreshSchema, showToast]);

  const exportEntity = useCallback(
    async (name: string, format: "csv" | "json" | "sql" | "parquet" | "xlsx") => {
      const sets = await engineRef.current?.exec(`SELECT * FROM ${quoteIdent(name)}`);
      const set = sets?.[0];
      if (!set) return;
      const filename = `${toFileSafeName(name)}.${format}`;
      if (format === "csv") exportResultToCsv(set.columns, set.values, filename);
      else if (format === "json") exportResultToJson(set.columns, set.values, filename);
      else if (format === "sql") exportResultToSql(set.columns, set.values, filename);
      else if (format === "parquet") await exportResultToParquet(set.columns, set.values, filename);
      else await exportResultToXlsx(set.columns, set.values, filename);
    },
    [],
  );

  // Row counts are precomputed by `refreshSchema` so this is a synchronous
  // lookup. SchemaItem caches the first non-null result it sees, so we
  // can't hand back a stale 0 while a real count is in flight.
  const fetchEntityRowCount = useCallback(
    (name: string): number => rowCountByTable[name] ?? 0,
    [rowCountByTable],
  );

  // ─── Import handlers ─────────────────────────────────────────────────
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
            colCompare: null,
          });
        } catch (err) {
          showToast(
            `Could not parse CSV: ${err instanceof Error ? err.message : String(err)}`,
            "warn",
          );
        }
      };
      reader.readAsText(file);
    },
    [showToast, tables],
  );

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
            colCompare: null,
          });
        } catch (err) {
          showToast(
            `Could not parse JSON: ${err instanceof Error ? err.message : String(err)}`,
            "warn",
          );
        }
      };
      reader.readAsText(file);
    },
    [showToast, tables],
  );

  const handleParquetFile = useCallback(
    async (file: File) => {
      try {
        showToast("Reading parquet file…");
        const { columns, rows } = await readParquetFile(file);
        if (columns.length === 0) {
          showToast("Parquet file appears to have no columns.", "warn");
          return;
        }
        setImportParquetState({
          tableName: tableNameFromFilename(file.name),
          columns,
          rows,
          targetMode: "new",
          targetTable: tables[0] ?? "",
          colCompare: null,
        });
      } catch (err) {
        showToast(
          `Parquet import failed: ${err instanceof Error ? err.message : String(err)}`,
          "warn",
        );
      }
    },
    [showToast, tables],
  );

  const submitImport = useCallback(
    async (flavor: ImportFlavor) => {
      const engine = engineRef.current;
      if (!engine) return;
      const fileColumns =
        flavor === "csv"
          ? importCsvState?.headers
          : flavor === "json"
            ? importJsonState?.headers
            : importParquetState?.columns;
      const rows: ReadonlyArray<ReadonlyArray<unknown>> | undefined =
        flavor === "csv"
          ? importCsvState?.rows
          : flavor === "json"
            ? importJsonState?.rows
            : importParquetState?.rows;
      const mode =
        flavor === "csv"
          ? importCsvState?.targetMode
          : flavor === "json"
            ? importJsonState?.targetMode
            : importParquetState?.targetMode;
      const target =
        flavor === "csv"
          ? importCsvState?.targetTable
          : flavor === "json"
            ? importJsonState?.targetTable
            : importParquetState?.targetTable;
      const newTableName =
        flavor === "csv"
          ? importCsvState?.tableName
          : flavor === "json"
            ? importJsonState?.tableName
            : importParquetState?.tableName;
      if (!fileColumns || !rows) return;
      const isExisting = mode === "existing" && target;
      const effectiveTable = isExisting ? target! : (newTableName ?? "").trim();
      if (!effectiveTable) {
        showToast("Table name cannot be empty.", "warn");
        return;
      }
      try {
        await importRowsIntoPostgres(engine, effectiveTable, fileColumns, rows, {
          createTable: !isExisting,
        });
        await refreshSchema();
        if (flavor === "csv") {
          setImportCsvOpen(false);
          setImportCsvState(null);
        } else if (flavor === "json") {
          setImportJsonOpen(false);
          setImportJsonState(null);
        } else {
          setImportParquetOpen(false);
          setImportParquetState(null);
        }
        showToast(
          `Imported ${rows.length} row${rows.length === 1 ? "" : "s"} into "${effectiveTable}".`,
        );
      } catch (err) {
        showToast(
          `${flavor.toUpperCase()} import failed: ${err instanceof Error ? err.message : String(err)}`,
          "warn",
        );
      }
    },
    [importCsvState, importJsonState, importParquetState, refreshSchema, showToast],
  );

  return (
    <div className="pg-root">
      {!loaded && (
        <div className={`pyodide-loading${statusState === "error" ? " has-error" : ""}`} role="status" aria-live="polite">
          <div className="loading-hero" aria-hidden="true">
            <div className="loading-hero-track">
              <span className="loading-hero-text">PostgreSQL Playground</span>
              <span className="loading-hero-text">PostgreSQL Playground</span>
              <span className="loading-hero-text">PostgreSQL Playground</span>
            </div>
          </div>
          <div className="loading-bottom">
            <div className="loading-quip">{loadingMessage}</div>
            <div className="loading-bar-wrap"><div className="loading-bar" /></div>
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
            <Link href="/" className="brand-name">Dataslope</Link>
            <Select.Root
              value={PLAYGROUND_ID}
              onValueChange={(value) => {
                const selectedPlayground = PLAYGROUNDS.find((playground) => playground.id === value);
                if (selectedPlayground && selectedPlayground.id !== PLAYGROUND_ID) {
                  router.push(selectedPlayground.href);
                }
              }}
            >
              <Select.Trigger className="playground-switcher" aria-label="Switch playground">
                {(() => {
                  const Icon = PLAYGROUND_ICONS[PLAYGROUND_ID];
                  const color = PLAYGROUND_ICON_COLORS[PLAYGROUND_ID];
                  const factor = PLAYGROUND_ICON_SIZE_FACTOR[PLAYGROUND_ID] ?? 1;
                  return Icon ? (
                    <span className="playground-switcher-lang-icon" style={{ color }} aria-hidden="true">
                      <Icon size={Math.round(16 * factor)} />
                    </span>
                  ) : null;
                })()}
                <Select.Value />
                <Select.Icon className="playground-switcher-icon"><ChevronDown size={12} /></Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner className="pg-lang-switcher-positioner" sideOffset={6} alignItemWithTrigger={false}>
                  <Select.Popup className="bui-select-popup pg-lang-switcher-popup">
                    {PLAYGROUNDS.map((playground) => {
                      const Icon = PLAYGROUND_ICONS[playground.id];
                      const color = PLAYGROUND_ICON_COLORS[playground.id];
                      const factor = PLAYGROUND_ICON_SIZE_FACTOR[playground.id] ?? 1;
                      return (
                        <Select.Item key={playground.id} value={playground.id} className="bui-select-item">
                          {Icon && (
                            <span className="bui-select-item-icon" style={{ color }} aria-hidden="true">
                              <Icon size={Math.round(16 * factor)} />
                            </span>
                          )}
                          <Select.ItemText>{playground.label}</Select.ItemText>
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
                        setImportParquetState(null);
                        setImportParquetOpen(true);
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
                disabled={!result || result.sets.length === 0}
              >
                <ArrowDownToLine size={14} aria-hidden="true" />
                <span className="btn-label">Export Result</span>
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner sideOffset={6} align="end">
                  <Menu.Popup className="bui-popup examples-dropdown export-dropdown">
                    {(["csv", "json", "sql", "parquet", "xlsx"] as const).map((format) => (
                      <Menu.Item
                        key={format}
                        className="example-item export-item"
                        onClick={() => void exportResultSet(format, "all")}
                      >
                        <div className="export-item-text">
                          <div className="ex-title">{format.toUpperCase()} <span className="ext-badge">.{format}</span></div>
                        </div>
                      </Menu.Item>
                    ))}
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
            <button
              type="button"
              className="run-btn"
              disabled={!loaded || statusState === "running"}
              onClick={runActiveTab}
            >
              <Play size={15} aria-hidden="true" />
              <span>{statusState === "running" ? "Running…" : "Run"}</span>
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
                    if (pendingDbId) void performDbSwitch(pendingDbId);
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
          open={pendingDropEntity !== null}
          onOpenChange={(next) => {
            if (!next) setPendingDropEntity(null);
          }}
        >
          <AlertDialog.Portal>
            <AlertDialog.Backdrop className="confirm-backdrop" />
            <AlertDialog.Popup className="confirm-popup">
              <AlertDialog.Title className="confirm-title">
                Drop {pendingDropEntity?.kind ?? "entity"}?
              </AlertDialog.Title>
              <AlertDialog.Description className="confirm-desc">
                This will permanently drop{" "}
                <strong>{pendingDropEntity?.name ?? ""}</strong> from the in-memory
                database. Reload the page to restore the sample.
              </AlertDialog.Description>
              <div className="confirm-actions">
                <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </AlertDialog.Close>
                <AlertDialog.Close
                  className="confirm-btn confirm-btn-danger"
                  onClick={() => void performDropEntity()}
                >
                  Drop
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
                This will reset PostgreSQL&apos;s editor font size, word wrap,
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
                  Restore
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
                Settings, saved queries, and per-database state for every
                Dataslope playground will be erased. This action cannot be
                undone — the page will reload immediately afterwards.
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

        {/* ── Import CSV dialog ── */}
        <ImportDialog
          flavor="csv"
          open={importCsvOpen}
          dragging={importCsvDragging}
          onDraggingChange={setImportCsvDragging}
          onClose={() => {
            setImportCsvOpen(false);
            setImportCsvState(null);
            setImportCsvDragging(false);
          }}
          state={importCsvState}
          onStateChange={(updater) => setImportCsvState((prev) => updater(prev))}
          tables={tables}
          engine={engineRef.current}
          onPickFile={handleCsvFile}
          onSubmit={() => void submitImport("csv")}
          onError={(msg) => showToast(msg, "warn")}
        />

        {/* ── Import JSON dialog ── */}
        <ImportDialog
          flavor="json"
          open={importJsonOpen}
          dragging={importJsonDragging}
          onDraggingChange={setImportJsonDragging}
          onClose={() => {
            setImportJsonOpen(false);
            setImportJsonState(null);
            setImportJsonDragging(false);
          }}
          state={importJsonState}
          onStateChange={(updater) => setImportJsonState((prev) => updater(prev))}
          tables={tables}
          engine={engineRef.current}
          onPickFile={handleJsonFile}
          onSubmit={() => void submitImport("json")}
          onError={(msg) => showToast(msg, "warn")}
        />

        {/* ── Import Parquet dialog ── */}
        <ImportDialog
          flavor="parquet"
          open={importParquetOpen}
          dragging={importParquetDragging}
          onDraggingChange={setImportParquetDragging}
          onClose={() => {
            setImportParquetOpen(false);
            setImportParquetState(null);
            setImportParquetDragging(false);
          }}
          state={importParquetState}
          onStateChange={(updater) => setImportParquetState((prev) => updater(prev))}
          tables={tables}
          engine={engineRef.current}
          onPickFile={(f) => void handleParquetFile(f)}
          onSubmit={() => void submitImport("parquet")}
          onError={(msg) => showToast(msg, "warn")}
        />

        <div className="sql-shell postgres-shell">
          <aside className="sql-sidebar" aria-label="Database explorer">
            <div className="sql-db-selector-wrap">
              <Select.Root
                value={activeDbId}
                onValueChange={(value) => requestDbSwitch(String(value))}
              >
                <Select.Trigger className="sql-db-selector" aria-label="Select sample database">
                  <Database size={14} className="sql-db-selector-icon" aria-hidden="true" />
                  <Select.Value className="sql-db-selector-value">{activeSample.filename}</Select.Value>
                  <Select.Icon className="playground-switcher-icon"><ChevronDown size={12} /></Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner className="sql-db-positioner" sideOffset={6} alignItemWithTrigger={false}>
                    <Select.Popup className="bui-select-popup sql-db-popup">
                      <div className="sql-db-popup-group-label">Sample databases</div>
                      {POSTGRES_SAMPLE_DATABASES.map((sample) => (
                        <Select.Item key={sample.id} value={sample.id} className="bui-select-item sql-db-item">
                          <span className="bui-select-item-icon" aria-hidden="true"><Database size={14} /></span>
                          <span className="sql-db-item-text">
                            <Select.ItemText>{sample.filename}</Select.ItemText>
                            <span className="sql-db-item-desc">{sample.description}</span>
                          </span>
                        </Select.Item>
                      ))}
                      <Select.Item
                        value={POSTGRES_BLANK_DATABASE.id}
                        className="bui-select-item sql-db-item"
                      >
                        <span className="bui-select-item-icon" aria-hidden="true"><FilePlus size={14} /></span>
                        <span className="sql-db-item-text">
                          <Select.ItemText>{POSTGRES_BLANK_DATABASE.label}</Select.ItemText>
                          <span className="sql-db-item-desc">{POSTGRES_BLANK_DATABASE.description}</span>
                        </span>
                      </Select.Item>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </div>
            <div className="sql-tree">
              <SchemaSection
                label="TABLES"
                count={tables.length}
                expanded={tablesExpanded}
                onToggle={() => setTablesExpanded((v) => !v)}
                emptyMessage="No tables."
                allExpanded={tables.length > 0 && tables.every((name) => expandedEntities.has(name))}
                onExpandAll={() => setExpandedEntities(new Set(tables))}
                onCollapseAll={() => setExpandedEntities(new Set())}
              >
                {tables.map((name) => (
                  <SchemaItem
                    key={name}
                    name={name}
                    kind="table"
                    expanded={expandedEntities.has(name)}
                    columns={columnsByEntity[name]}
                    foreignKeys={foreignKeysByEntity[name]}
                    onToggleExpanded={(entity) =>
                      setExpandedEntities((prev) => {
                        const next = new Set(prev);
                        if (next.has(entity)) next.delete(entity);
                        else next.add(entity);
                        return next;
                      })
                    }
                    onPreview={previewEntity}
                    onModifyStructure={openEntityStructure}
                    onCount={countEntityRows}
                    onCopy={copyEntityName}
                    onDrop={requestDropEntity}
                    onViewDDL={(n) => void viewDDL(n)}
                    onExport={(n, f) => void exportEntity(n, f)}
                    onGetRowCount={fetchEntityRowCount}
                  />
                ))}
              </SchemaSection>
              <SchemaSection
                label="VIEWS"
                count={views.length}
                expanded={viewsExpanded}
                onToggle={() => setViewsExpanded((v) => !v)}
                emptyMessage="No views."
              >
                {views.map((name) => (
                  <SchemaItem
                    key={name}
                    name={name}
                    kind="view"
                    expanded={expandedEntities.has(name)}
                    columns={columnsByEntity[name]}
                    foreignKeys={foreignKeysByEntity[name]}
                    onToggleExpanded={(entity) =>
                      setExpandedEntities((prev) => {
                        const next = new Set(prev);
                        if (next.has(entity)) next.delete(entity);
                        else next.add(entity);
                        return next;
                      })
                    }
                    onPreview={previewEntity}
                    onStructure={(n) => openEntityStructure(n)}
                    onCount={countEntityRows}
                    onCopy={copyEntityName}
                    onDrop={requestDropEntity}
                    onViewDDL={(n) => void viewDDL(n)}
                    onExport={(n, f) => void exportEntity(n, f)}
                    onGetRowCount={fetchEntityRowCount}
                  />
                ))}
              </SchemaSection>
              <SchemaSection
                label="INDEXES"
                count={indexes.length}
                expanded={indexesExpanded}
                onToggle={() => setIndexesExpanded((v) => !v)}
                emptyMessage="No indexes."
              >
                {indexes.map((name) => (
                  <SchemaLeafItem
                    key={name}
                    name={name}
                    kind="index"
                    onCopy={copyEntityName}
                    onViewDDL={(n) => void viewDDL(n)}
                    onDrop={requestDropEntity}
                  />
                ))}
              </SchemaSection>
              <SchemaSection
                label="TRIGGERS"
                count={triggers.length}
                expanded={triggersExpanded}
                onToggle={() => setTriggersExpanded((v) => !v)}
                emptyMessage="No triggers."
              >
                {triggers.map((name) => (
                  <SchemaLeafItem
                    key={name}
                    name={name}
                    kind="trigger"
                    onCopy={copyEntityName}
                    onViewDDL={(n) => void viewDDL(n)}
                    onDrop={requestDropEntity}
                  />
                ))}
              </SchemaSection>
            </div>
            <div className="sql-sidebar-footer">
              <button type="button" className="sql-er-btn" onClick={openErDiagramTab}>
                <Network size={13} aria-hidden="true" />
                <span>ER Diagram</span>
              </button>
            </div>
          </aside>
          <div className="sql-sidebar-resizer" role="separator" aria-orientation="vertical" />
          <main
            className={`sql-panes postgres-panes${activeTab?.kind === "view-data" ? " sql-panes--view-data" : ""}${activeTab?.kind === "er-diagram" ? " sql-panes--er-diagram" : ""}`}
          >
            <div className="sql-tabbar">
              <DndContext sensors={tabDragSensors} collisionDetection={closestCenter}>
                <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
                  <div className="sql-tabs" role="tablist">
                    {tabs.map((tab) => (
                      <SqlTab
                        key={tab.id}
                        tab={tab}
                        active={tab.id === activeTabId}
                        onActivate={() => setActiveTabId(tab.id)}
                        onClose={() => closeTab(tab.id)}
                        onRename={(title) =>
                          persistTabs(
                            tabsRef.current.map((candidate) =>
                              candidate.id === tab.id ? { ...candidate, title } : candidate,
                            ),
                          )
                        }
                        onDuplicate={() => {
                          const dup = { ...tab, id: newTabId(), title: `${tab.title} copy` };
                          persistTabs([...tabsRef.current, dup]);
                          setActiveTabId(dup.id);
                        }}
                        onCloseOthers={() => persistTabs([tab])}
                        onCloseAll={() => {
                          const fresh = { id: newTabId(), title: "Query 1", code: "", pristineCode: "" };
                          persistTabs([fresh]);
                          setActiveTabId(fresh.id);
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <button type="button" className="sql-tab-add" onClick={addTab} aria-label="New query tab">
                <Plus size={12} aria-hidden="true" />
              </button>
            </div>
            <div
              className="sql-editor-pane"
              style={
                activeTab?.kind === "view-data" || activeTab?.kind === "er-diagram"
                  ? { display: "none" }
                  : undefined
              }
            >
              <div className="editor-wrap" ref={editorHostRef} />
              <div className="sql-toolbar">
                <button
                  type="button"
                  className={`run-btn${statusState === "running" ? " running" : ""}`}
                  disabled={!loaded || statusState === "running"}
                  onClick={runActiveTab}
                >
                  <Play size={10} aria-hidden="true" />
                  {statusState === "running" ? "Running…" : "Run"}
                </button>
              </div>
            </div>
            {activeTab?.kind === "er-diagram" ? (
              <ErDiagramPane
                tables={tables}
                columnsByEntity={columnsByEntity}
                foreignKeysByEntity={foreignKeysByEntity}
                onPreview={previewEntity}
                onModifyStructure={openEntityStructure}
                onCount={countEntityRows}
                onCopy={copyEntityName}
                onDrop={requestDropEntity}
                onViewDDL={(name) => void viewDDL(name)}
                onExport={(name, format) => void exportEntity(name, format)}
                onGetRowCount={fetchEntityRowCount}
              />
            ) : (
              <Fragment>
                <div className="sql-resizer" role="separator" aria-orientation="horizontal" />
                <section className="sql-results-pane">
                  <ResultView
                    result={result}
                    loading={statusState === "running"}
                    keyHints={resultKeyHints}
                    sourceTable={result?.sourceTable}
                    globalPageSize={globalPageSize}
                    onSetGlobalPageSize={setGlobalPageSize}
                    onLoadPage={handleLoadPage}
                    onExportSnapshotChange={setResultSetExportSnapshot}
                    onExportResultSet={(format, scope) => void exportResultSet(format, scope)}
                  />
                </section>
              </Fragment>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// ─── Import dialog component (CSV / JSON / Parquet) ─────────────────────

interface ImportDialogProps<S extends CsvImportState | JsonImportState | ParquetImportState> {
  flavor: ImportFlavor;
  open: boolean;
  dragging: boolean;
  onDraggingChange: (dragging: boolean) => void;
  onClose: () => void;
  state: S | null;
  onStateChange: (updater: (prev: S | null) => S | null) => void;
  tables: string[];
  engine: PostgresEngine | null;
  onPickFile: (file: File) => void;
  onSubmit: () => void;
  onError: (message: string) => void;
}

function ImportDialog<
  S extends CsvImportState | JsonImportState | ParquetImportState,
>({
  flavor,
  open,
  dragging,
  onDraggingChange,
  onClose,
  state,
  onStateChange,
  tables,
  engine,
  onPickFile,
  onSubmit,
  onError,
}: ImportDialogProps<S>) {
  const flavorConfig = useMemo(() => {
    if (flavor === "csv") {
      return {
        title: "Import CSV File",
        description: "Parse a CSV file and import its rows into a new or existing table.",
        accept: ".csv,text/csv",
        dropLabel: "Drop a CSV file here",
        dropHint: "or click to browse — .csv",
        Icon: FileText,
      };
    }
    if (flavor === "json") {
      return {
        title: "Import JSON File",
        description: "Parse a JSON array of objects and import its rows into a new or existing table.",
        accept: ".json,application/json",
        dropLabel: "Drop a JSON file here",
        dropHint: "or click to browse — .json (array of objects)",
        Icon: FileJson,
      };
    }
    return {
      title: "Import Parquet File",
      description: "Read a Parquet file and add its rows into a new or existing table.",
      accept: ".parquet,application/octet-stream",
      dropLabel: "Drop a Parquet file here",
      dropHint: "or click to browse — .parquet",
      Icon: Database,
    };
  }, [flavor]);

  const fileColumns = state
    ? flavor === "parquet"
      ? (state as ParquetImportState).columns
      : (state as CsvImportState | JsonImportState).headers
    : [];
  const previewRows = state
    ? flavor === "parquet"
      ? (state as ParquetImportState).rows
      : (state as CsvImportState | JsonImportState).rows
    : [];

  const setTargetMode = (mode: "new" | "existing") => {
    onStateChange((prev) => {
      if (!prev) return prev;
      if (mode === "new") {
        return { ...prev, targetMode: "new", colCompare: null } as S;
      }
      const targetTable = prev.targetTable || tables[0] || "";
      return { ...prev, targetMode: "existing", targetTable, colCompare: null } as S;
    });
    if (mode === "existing" && engine) {
      const target = state?.targetTable || tables[0] || "";
      if (target) {
        void (async () => {
          try {
            const cols = await engine.listColumns(target);
            onStateChange((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                targetMode: "existing",
                targetTable: target,
                colCompare: computeImportColComparison(fileColumns, cols),
              } as S;
            });
          } catch (err) {
            onStateChange((prev) => (prev ? ({ ...prev, colCompare: null } as S) : prev));
            onError(
              `Could not load columns for "${target}": ${
                err instanceof Error ? err.message : String(err)
              }`,
            );
          }
        })();
      }
    }
  };

  const setTargetTable = (newTable: string) => {
    if (!engine) return;
    onStateChange((prev) => (prev ? ({ ...prev, targetTable: newTable } as S) : prev));
    void (async () => {
      try {
        const cols = await engine.listColumns(newTable);
        onStateChange((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            targetTable: newTable,
            colCompare: computeImportColComparison(fileColumns, cols),
          } as S;
        });
      } catch (err) {
        onStateChange((prev) => (prev ? ({ ...prev, colCompare: null } as S) : prev));
        onError(
          `Could not load columns for "${newTable}": ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    })();
  };

  const setNewTableName = (value: string) => {
    onStateChange((prev) => (prev ? ({ ...prev, tableName: value } as S) : prev));
  };

  const Icon = flavorConfig.Icon;

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup sql-import-popup">
          <Dialog.Title className="confirm-title">{flavorConfig.title}</Dialog.Title>
          <Dialog.Description className="confirm-desc">
            {flavorConfig.description}
          </Dialog.Description>
          <div className="sql-import-warning">
            <TriangleAlert size={14} className="sql-import-warning-icon" aria-hidden="true" />
            <span>
              This is a playground — your data is only held in browser memory and
              will not be persisted on reload.
            </span>
          </div>
          {!state ? (
            <div
              className={`sql-dropzone${dragging ? " dragging" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                onDraggingChange(true);
              }}
              onDragLeave={() => onDraggingChange(false)}
              onDrop={(e) => {
                e.preventDefault();
                onDraggingChange(false);
                const file = e.dataTransfer.files[0];
                if (file) onPickFile(file);
              }}
            >
              <Icon size={28} className="sql-dropzone-icon" aria-hidden="true" />
              <span>{flavorConfig.dropLabel}</span>
              <span className="sql-dropzone-hint">{flavorConfig.dropHint}</span>
              <input
                type="file"
                accept={flavorConfig.accept}
                aria-label={`Choose ${flavor} file`}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onPickFile(file);
                  e.target.value = "";
                }}
              />
            </div>
          ) : (
            <Fragment>
              <div className="sql-import-target-row">
                <div className="sql-import-mode-btns">
                  <button
                    type="button"
                    className={`sql-import-mode-btn${state.targetMode === "new" ? " active" : ""}`}
                    onClick={() => setTargetMode("new")}
                  >
                    New table
                  </button>
                  <button
                    type="button"
                    className={`sql-import-mode-btn${state.targetMode === "existing" ? " active" : ""}`}
                    disabled={tables.length === 0}
                    onClick={() => setTargetMode("existing")}
                  >
                    Existing table
                  </button>
                </div>
                {state.targetMode === "new" ? (
                  <input
                    className="sql-rename-input"
                    value={state.tableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    placeholder="Table name"
                    autoFocus
                  />
                ) : (
                  <select
                    className="sql-import-target-select"
                    value={state.targetTable}
                    onChange={(e) => setTargetTable(e.target.value)}
                    autoFocus
                  >
                    {tables.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                )}
              </div>
              {state.targetMode === "existing" && state.colCompare ? (
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
                      {state.colCompare.map((r, i) => (
                        <tr key={i}>
                          <td>{r.fileCol ?? <em>—</em>}</td>
                          <td>{r.tableCol ?? <em>—</em>}</td>
                          <td className={`cmp-${r.status}`}>{IMPORT_COL_STATUS_LABEL[r.status]}</td>
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
                        {fileColumns.map((h) => (
                          <th key={h}>{h || "(empty)"}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j}>
                              {cell === null || cell === undefined || cell === ""
                                ? <em>NULL</em>
                                : String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 8 }}>
                {previewRows.length} row{previewRows.length === 1 ? "" : "s"} ·{" "}
                {fileColumns.length} column{fileColumns.length === 1 ? "" : "s"}
                {previewRows.length > 5 && state.targetMode === "new" && " · showing first 5"}
              </div>
            </Fragment>
          )}
          <div className="confirm-actions" style={{ marginTop: 16 }}>
            <Dialog.Close className="confirm-btn confirm-btn-secondary">
              Cancel
            </Dialog.Close>
            {state && (
              <button
                type="button"
                className="confirm-btn confirm-btn-primary"
                onClick={onSubmit}
              >
                Import
              </button>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function PostgresPlayground() {
  return (
    <Toast.Provider timeout={2400}>
      <PostgresPlaygroundInner />
      <Toast.Portal>
        <Toast.Viewport className="toast-viewport">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
