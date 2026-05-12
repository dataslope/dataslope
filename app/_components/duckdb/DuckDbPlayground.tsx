"use client";

import {
  autocompletion,
  closeBracketsKeymap,
  completionKeymap,
  startCompletion,
  acceptCompletion,
} from "@codemirror/autocomplete";
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
import { sql as sqlLang, StandardSQL } from "@codemirror/lang-sql";
import { AlertDialog } from "@base-ui-components/react/alert-dialog";
import { Dialog } from "@base-ui-components/react/dialog";
import { Menu } from "@base-ui-components/react/menu";
import { Toast } from "@base-ui-components/react/toast";
import { Select } from "@base-ui-components/react/select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ChevronDown,
  Database,
  FilePlus,
  History,
  Network,
  Play,
  Plus,
  RotateCcw,
  Table,
  Trash2,
  TriangleAlert,
  X,
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
  useSyncExternalStore,
} from "react";
import { flushSync } from "react-dom";
import "../playground.css";
import "../sqlPlayground.css";
import { ErDiagramPane } from "../ErDiagramPane";
import {
  LANGUAGE_ICONS as PLAYGROUND_ICONS,
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
  DataslopeRunOverlay,
  DEFAULT_PLAYGROUND_SETTINGS,
  RuntimeInfoContent,
  SettingsPanel,
  detectIsMac,
  type SettingsPanelProps,
} from "../playgroundShared";
import {
  DUCKDB_SAMPLE_DATABASES,
  DUCKDB_BLANK_DATABASE,
  findDuckDbSampleDatabase,
} from "../runtime/duckdbSamples";
import { createDuckDbEngine, type DuckDbEngine } from "../runtime/duckdb";
import type {
  ForeignKeyInfo,
  TableColumnInfo,
  ColumnConstraintInfo,
} from "../runtime/sqlite";
import type { QueryExecResult } from "sql.js";
import type { QueryTab } from "../sqlitePlaygroundTabs";
import { newTabId } from "../sqlitePlaygroundTabs";
import { SqlTab, type SqlTabProps } from "../sql/components/SqlTab";
import { ResultView } from "../sql/components/ResultView";
import {
  SchemaItem,
  type SchemaItemProps,
} from "../sql/components/SchemaItem";
import {
  SchemaLeafItem,
  type SchemaLeafItemProps,
} from "../sql/components/SchemaLeafItem";
import {
  SchemaSection,
  type SchemaSectionProps,
} from "../sql/components/SchemaSection";
import { ToastList } from "../sql/components/ToastList";
import { DdlViewer } from "../sql/components/DdlViewer";
import { QueryHistoryPane } from "../sql/components/QueryHistoryPane";
import { useQueryHistory } from "../sql/hooks/useQueryHistory";
import {
  exportResultToCsv,
  exportResultToJson,
  exportResultToParquet,
  exportResultToSql,
  exportResultToXlsx,
  initXlsxWasm,
  toExcelData,
  toFileSafeName,
  triggerDownload,
} from "../sql/utils/exportUtils";
import {
  isSingleSelectSql,
  hasLimitClause,
  stripSqlComments,
} from "../sql/utils/sqlAnalysis";
import { pickFallbackTab, pushTabHistory } from "../sql/utils/tabUtils";
import type {
  AddRowDialogState,
  ColumnKeyHints,
  QueryRunResult,
  ResultSetExportScope,
  ResultSetExportSnapshot,
} from "../sql/types";
import type { RuntimeInfo } from "../types";
import {
  createSqlCompletionSource,
  type SqlCompletionSchema,
} from "../sql/sqlCompletion";
import { useDuckDbSettingsStore } from "./stores/useDuckDbSettingsStore";

const PLAYGROUND_ID = "duckdb";
const STORAGE_PREFIX = "duckdb_";
const INFINITE_SCROLL_PAGE_SIZE = 500;

const storageKey = (key: string) => `${STORAGE_PREFIX}${key}`;
const dbScopedKey = (dbId: string, key: string) =>
  `${STORAGE_PREFIX}db_${dbId}_${key}`;
const DEFAULT_PAGE_SIZE = 50;

const RUNTIME_INFO: RuntimeInfo = {
  language: "DuckDB",
  version: "1.2",
  engine: "duckdb-wasm 1.28",
  engineUrl: "https://duckdb.org/docs/api/wasm/overview.html",
  notes:
    "Pure-WASM build of DuckDB that runs entirely in your browser. Each sample database is rebuilt in memory on every page load.",
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
  const sample = findDuckDbSampleDatabase(dbId);
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
      JSON.stringify(
        tabs.filter(
          (tab) => tab.kind !== "er-diagram" && tab.kind !== "query-history",
        ),
      ),
    );
  } catch {
    // Ignore storage quota / private-mode errors.
  }
}

function tabsAreDirty(
  tabs: QueryTab[],
  defaults: { title: string; code: string }[],
): boolean {
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

function DuckDbPlaygroundInner() {
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
  const fontSize = useDuckDbSettingsStore((s) => s.fontSize);
  const setFontSizeState = useDuckDbSettingsStore((s) => s.setFontSize);
  const outputFontSizeEnabled = useDuckDbSettingsStore(
    (s) => s.outputFontSizeEnabled,
  );
  const setOutputFontSizeEnabledState = useDuckDbSettingsStore(
    (s) => s.setOutputFontSizeEnabled,
  );
  const outputFontSize = useDuckDbSettingsStore((s) => s.outputFontSize);
  const setOutputFontSizeState = useDuckDbSettingsStore(
    (s) => s.setOutputFontSize,
  );
  const editorTheme = useDuckDbSettingsStore((s) => s.editorTheme);
  const setEditorThemeState = useDuckDbSettingsStore((s) => s.setEditorTheme);
  const wordWrap = useDuckDbSettingsStore((s) => s.wordWrap);
  const setWordWrapState = useDuckDbSettingsStore((s) => s.setWordWrap);
  const clearBeforeRun = useDuckDbSettingsStore((s) => s.clearBeforeRun);
  const setClearBeforeRunState = useDuckDbSettingsStore(
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
      ? DUCKDB_SAMPLE_DATABASES[0].id
      : (localStorage.getItem(storageKey("db")) ??
        DUCKDB_SAMPLE_DATABASES[0].id);
  const [activeDbId, setActiveDbId] = useState(initialDbId);
  const [tabs, setTabs] = useState<QueryTab[]>(() => loadTabs(initialDbId));
  const [activeTabId, setActiveTabId] = useState(() => tabs[0]?.id ?? "");
  const [resultsByTab, setResultsByTab] = useState<
    Record<string, QueryRunResult | null>
  >({});
  const [loaded, setLoaded] = useState(false);
  const [statusState, setStatusState] = useState<
    "loading" | "ready" | "running" | "error"
  >("loading");
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading DuckDB engine…",
  );
  const [tables, setTables] = useState<string[]>([]);
  const [views, setViews] = useState<string[]>([]);
  const [indexesExpanded, setIndexesExpanded] = useState(true);
  const [viewsExpanded, setViewsExpanded] = useState(true);
  const [tablesExpanded, setTablesExpanded] = useState(true);
  const [indexes, setIndexes] = useState<string[]>([]);
  const [columnsByEntity, setColumnsByEntity] = useState<
    Record<string, TableColumnInfo[]>
  >({});
  const [foreignKeysByEntity, setForeignKeysByEntity] = useState<
    Record<string, ForeignKeyInfo[]>
  >({});
  const [entityExpanded, setEntityExpanded] = useState<Set<string>>(
    new Set(),
  );
  const [globalPageSize, setGlobalPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [resultSetExportSnapshot, setResultSetExportSnapshot] =
    useState<ResultSetExportSnapshot | null>(null);
  const [rowCountByTable, setRowCountByTable] = useState<
    Record<string, number>
  >({});

  // ─── Query history ────────────────────────────────────────────────────
  const {
    history: queryHistory,
    addHistoryEntry,
    clearHistory,
  } = useQueryHistory();

  // ─── Dialog state ─────────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingDbId, setPendingDbId] = useState<string | null>(null);
  const [pendingDropEntity, setPendingDropEntity] = useState<{
    name: string;
    kind: "table" | "view" | "index";
  } | null>(null);
  const [pendingTruncate, setPendingTruncate] = useState<string | null>(null);
  const [ddlDialog, setDdlDialog] = useState<{
    title: string;
    sql: string;
  } | null>(null);

  const [addRowDialog, setAddRowDialog] = useState<AddRowDialogState | null>(null);

  // ─── Refs ─────────────────────────────────────────────────────────────
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const langCompRef = useRef<Compartment | null>(null);
  const completionCompRef = useRef<Compartment | null>(null);
  const themeCompRef = useRef<Compartment | null>(null);
  const wrapCompRef = useRef<Compartment | null>(null);
  const engineRef = useRef<DuckDbEngine | null>(null);
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  const tabHistoryRef = useRef<string[]>([]);
  const activeDbIdRef = useRef(activeDbId);
  const runningRef = useRef(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const sidebarResizerRef = useRef<HTMLDivElement | null>(null);
  const panesRef = useRef<HTMLDivElement | null>(null);
  const editorPaneRef = useRef<HTMLDivElement | null>(null);
  const resultsPaneRef = useRef<HTMLDivElement | null>(null);
  const resizerRef = useRef<HTMLDivElement | null>(null);

  // ─── Selection tracking ───────────────────────────────────────────────
  const setHasEditorSelectionRef = useRef<React.Dispatch<React.SetStateAction<boolean>> | null>(null);
  const isMac = useSyncExternalStore(
    () => () => {},
    () => detectIsMac(),
    () => false,
  );
  const runActiveTabRef = useRef<() => void>(() => undefined);
  const runSelectionRef = useRef<(sql: string) => void>(() => undefined);

  const activeTab =
    tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null;
  const result = activeTab ? (resultsByTab[activeTab.id] ?? null) : null;
  const activeSample = findDuckDbSampleDatabase(activeDbId);

  const persistTabs = useCallback(
    (nextTabs: QueryTab[], dbId = activeDbIdRef.current) => {
      tabsRef.current = nextTabs;
      setTabs(nextTabs);
      saveTabs(dbId, nextTabs);
    },
    [],
  );

  const refreshSchema = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    const [nextTables, nextViews, nextIndexes] = await Promise.all([
      engine.listTables(),
      engine.listViews(),
      engine.listIndexes(),
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
    setColumnsByEntity(
      Object.fromEntries(entries.map(([name, cols]) => [name, cols])),
    );
    setForeignKeysByEntity(
      Object.fromEntries(entries.map(([name, , fks]) => [name, fks])),
    );
    setRowCountByTable(
      Object.fromEntries(entries.map(([name, , , count]) => [name, count])),
    );
  }, []);

  const runSqlForTab = useCallback(
    async (
      tabId: string,
      sql: string,
      source: string,
      sourceTable?: string,
      page = 0,
      baseSql?: string,
      explicitPageSize?: number,
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
        isSingleSelectSql(trimmed, noComments) && !hasLimitClause(noComments);
      const effectivePageSize =
        explicitPageSize !== undefined ? explicitPageSize : globalPageSize;
      const lazyPageSizeForRun =
        effectivePageSize > 0 ? effectivePageSize : INFINITE_SCROLL_PAGE_SIZE;
      try {
        let sets: (QueryExecResult | null)[];
        let lazySql: string | undefined;
        let lazyBaseSql: string | undefined;
        let lazyTotalCount: number | undefined;
        let lazyPage: number | undefined;
        let lazyPageSize: number | undefined;
        if (useLazy) {
          const lazy = await engine.execPaged(
            trimmed,
            lazyPageSizeForRun,
            page * lazyPageSizeForRun,
          );
          sets = lazy.result;
          lazySql = trimmed.replace(/\s*;+\s*$/, "");
          lazyBaseSql = (baseSql ?? trimmed).replace(/\s*;+\s*$/, "");
          lazyTotalCount = lazy.totalCount;
          lazyPage = page;
          lazyPageSize = lazyPageSizeForRun;
        } else {
          sets = await engine.exec(trimmed);
        }
        const elapsedMs = performance.now() - t0;
        setResultsByTab((prev) => ({
          ...prev,
          [tabId]: {
            sets,
            elapsedMs,
            source,
            sourceTable,
            lazySql,
            lazyBaseSql,
            lazyTotalCount,
            lazyPage,
            lazyPageSize,
            lazyInfinite: effectivePageSize === 0 && useLazy,
          },
        }));
        addHistoryEntry({
          sql: trimmed,
          source,
          executedAt: Date.now(),
          elapsedMs,
          success: true,
        });
        await refreshSchema();
        setStatusState("ready");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const elapsedMs = performance.now() - t0;
        setResultsByTab((prev) => ({
          ...prev,
          [tabId]: {
            sets: [],
            elapsedMs,
            source,
            sourceTable,
            error: message,
          },
        }));
        addHistoryEntry({
          sql: trimmed,
          source,
          executedAt: Date.now(),
          elapsedMs,
          success: false,
          error: message,
        });
        setStatusState("error");
        window.setTimeout(() => setStatusState("ready"), 3000);
      } finally {
        runningRef.current = false;
      }
    },
    [clearBeforeRun, globalPageSize, refreshSchema, showToast, addHistoryEntry],
  );

  const runActiveTab = useCallback(() => {
    const tab = tabsRef.current.find(
      (candidate) => candidate.id === activeTabIdRef.current,
    );
    if (!tab || tab.kind === "er-diagram" || tab.kind === "query-history")
      return;
    const sql = editorRef.current?.state.doc.toString() ?? tab.code;
    void runSqlForTab(
      tab.id,
      sql,
      tab.title,
      tab.kind === "view-data" ? tab.title : undefined,
    );
  }, [runSqlForTab]);

  const runCurrentSelection = useCallback(() => {
    const view = editorRef.current;
    if (!view) return;
    const sel = view.state.selection.main;
    if (sel.empty) return;
    const selected = view.state.sliceDoc(sel.from, sel.to);
    const tab = tabsRef.current.find(
      (candidate) => candidate.id === activeTabIdRef.current,
    );
    if (!tab) return;
    void runSqlForTab(tab.id, selected, tab.title);
  }, [runSqlForTab]);

  useEffect(() => {
    runActiveTabRef.current = runActiveTab;
    runSelectionRef.current = (sql: string) => {
      const tab = tabsRef.current.find(
        (candidate) => candidate.id === activeTabIdRef.current,
      );
      if (!tab) return;
      void runSqlForTab(tab.id, sql, tab.title);
    };
  }, [runActiveTab, runSqlForTab]);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);
  useEffect(() => {
    activeTabIdRef.current = activeTabId;
    try {
      localStorage.setItem(
        dbScopedKey(activeDbIdRef.current, "active_tab"),
        activeTabId,
      );
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
    document.title = "DuckDB Playground";
    document.body.classList.add("pg-active");
    const D = DEFAULT_PLAYGROUND_SETTINGS;
    const savedSize =
      Number(localStorage.getItem(storageKey("fontsize")) ?? D.fontSize) ||
      D.fontSize;
    const savedOutputFontEnabled =
      localStorage.getItem(storageKey("outputfontsize_enabled")) === "true";
    const savedOutputSize =
      Number(
        localStorage.getItem(storageKey("outputfontsize")) ?? D.outputFontSize,
      ) || D.outputFontSize;
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
    document.documentElement.style.setProperty(
      "--cm-font-size",
      `${savedSize}px`,
    );
    document.documentElement.style.setProperty(
      "--output-font-size",
      `${savedOutputFontEnabled ? savedOutputSize : savedSize}px`,
    );

    try {
      const savedActiveTab = localStorage.getItem(
        dbScopedKey(initialDbId, "active_tab"),
      );
      if (
        savedActiveTab &&
        tabsRef.current.some((tab) => tab.id === savedActiveTab)
      ) {
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
          langComp.of(
            sqlLang({ dialect: StandardSQL, upperCaseKeywords: false }),
          ),
          completionComp.of(
            autocompletion({
              override: [createSqlCompletionSource({ entities: [] })],
            }),
          ),
          themeComp.of(themeFor(initialTheme)),
          wrapComp.of(initialWordWrap ? EditorView.lineWrapping : []),
          EditorView.updateListener.of((update) => {
            if (update.selectionSet) {
              const sel = update.state.selection.main;
              setHasEditorSelectionRef.current?.(!sel.empty);
            }
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
              run: (v) => {
                const sel = v.state.selection.main;
                if (!sel.empty) {
                  const selected = v.state.sliceDoc(sel.from, sel.to);
                  runSelectionRef.current(selected);
                } else {
                  runActiveTabRef.current();
                }
                return true;
              },
            },
            {
              key: "Mod-Shift-Enter",
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
        setLoadingMessage("Loading DuckDB engine…");
        const engine = await createDuckDbEngine(initialDbId);
        if (cancelled) return;
        engineRef.current = engine;
        await refreshSchema();
        setLoaded(true);
        setStatusState("ready");
      } catch (err) {
        if (cancelled) return;
        setLoadingMessage(
          `Failed to load: ${err instanceof Error ? err.message : String(err)}`,
        );
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
    if (
      !view ||
      !activeTab ||
      activeTab.kind === "er-diagram" ||
      activeTab.kind === "view-data" ||
      activeTab.kind === "query-history"
    )
      return;
    const current = view.state.doc.toString();
    if (current !== activeTab.code) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: activeTab.code },
      });
    }
    view.focus();
  }, [activeTabId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--cm-font-size",
      `${fontSize}px`,
    );
    editorRef.current?.requestMeasure();
  }, [fontSize]);

  useEffect(() => {
    const effective = outputFontSizeEnabled ? outputFontSize : fontSize;
    document.documentElement.style.setProperty(
      "--output-font-size",
      `${effective}px`,
    );
  }, [outputFontSizeEnabled, outputFontSize, fontSize]);

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
        langComp.reconfigure(
          sqlLang({ dialect: StandardSQL, schema, upperCaseKeywords: false }),
        ),
        completionComp.reconfigure(
          autocompletion({
            override: [createSqlCompletionSource(completionSchema)],
          }),
        ),
      ],
    });
  }, [tables, views, columnsByEntity]);

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
          nextId === DUCKDB_BLANK_DATABASE.id
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
        tabHistoryRef.current = [];
        setActiveTabId(nextActive);
        setResultsByTab({});
        await refreshSchema();
        setStatusState("ready");
        showToast(`Loaded ${sample.filename}.`);
      } catch (err) {
        showToast(
          `Load failed: ${err instanceof Error ? err.message : String(err)}`,
          "warn",
        );
        setStatusState("ready");
      }
    },
    [persistTabs, refreshSchema, showToast],
  );

  const requestDbSwitch = useCallback(
    (nextId: string) => {
      if (nextId === activeDbIdRef.current) return;
      const curSample = findDuckDbSampleDatabase(activeDbIdRef.current);
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
    tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, activeTabIdRef.current, tab.id);
    const next = [...tabsRef.current, tab];
    tabsRef.current = next;
    activeTabIdRef.current = tab.id;
    flushSync(() => {
      setTabs(next);
      setActiveTabId(tab.id);
    });
    editorRef.current?.focus();
    saveTabs(activeDbIdRef.current, next);
  }, []);

  const openTabAndRun = useCallback(
    (title: string, sql: string) => {
      const tab: QueryTab = {
        id: newTabId(),
        title,
        code: sql,
        pristineCode: sql,
      };
      tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, activeTabIdRef.current, tab.id);
      persistTabs([...tabsRef.current, tab]);
      setActiveTabId(tab.id);
      void runSqlForTab(tab.id, sql, title);
    },
    [persistTabs, runSqlForTab],
  );

  const closeTab = useCallback(
    (id: string) => {
      const currentTabs = tabsRef.current;
      const next = currentTabs.filter((tab) => tab.id !== id);
      const finalTabs =
        next.length > 0
          ? next
          : [{ id: newTabId(), title: "Query 1", code: "", pristineCode: "" }];
      persistTabs(finalTabs);
      tabHistoryRef.current = tabHistoryRef.current.filter((hid) => hid !== id);
      if (activeTabIdRef.current === id) {
        const fallback = pickFallbackTab(finalTabs, id, currentTabs, tabHistoryRef.current);
        setActiveTabId(fallback.id);
      }
      setResultsByTab((prev) => {
        const { [id]: _deleted, ...rest } = prev;
        void _deleted;
        return rest;
      });
    },
    [persistTabs],
  );

  const resetTabsForCurrentDb = useCallback(() => {
    const sample = findDuckDbSampleDatabase(activeDbIdRef.current);
    const fresh = makeTabs(sample.defaultTabs);
    tabHistoryRef.current = [];
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
      tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, activeTabIdRef.current, tab.id);
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
    const currentTabs = tabsRef.current;
    const currentActiveTabId = activeTabIdRef.current;
    const existing = currentTabs.find((tab) => tab.kind === "er-diagram");
    if (existing) {
      if (existing.id === currentActiveTabId) {
        const next = currentTabs.filter((t) => t.id !== existing.id);
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
        persistTabs(finalTabs);
        setActiveTabId(finalTabs[0].id);
        return;
      }
      tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, currentActiveTabId, existing.id);
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
    tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, currentActiveTabId, tab.id);
    persistTabs([...currentTabs, tab]);
    setActiveTabId(tab.id);
  }, [persistTabs]);

  const openQueryHistoryTab = useCallback(() => {
    const currentTabs = tabsRef.current;
    const currentActiveTabId = activeTabIdRef.current;
    const existing = currentTabs.find((tab) => tab.kind === "query-history");
    if (existing) {
      if (existing.id === currentActiveTabId) {
        const next = currentTabs.filter((t) => t.id !== existing.id);
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
        persistTabs(finalTabs);
        setActiveTabId(finalTabs[0].id);
        return;
      }
      tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, currentActiveTabId, existing.id);
      setActiveTabId(existing.id);
      return;
    }
    const tab: QueryTab = {
      id: newTabId(),
      title: "Query History",
      code: "",
      pristineCode: "",
      kind: "query-history",
    };
    tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, currentActiveTabId, tab.id);
    persistTabs([...currentTabs, tab]);
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
  const resultKeyHints: ColumnKeyHints | undefined = useMemo(() => {
    const tableName = result?.sourceTable;
    if (!tableName) return undefined;
    const cols = columnsByEntity[tableName] ?? [];
    const fks = foreignKeysByEntity[tableName] ?? [];
    return {
      pk: new Set(cols.filter((col) => col.pk > 0).map((col) => col.name)),
      fk: new Map(fks.map((fk) => [fk.from, fk])),
    };
  }, [result, columnsByEntity, foreignKeysByEntity]);

  const loadPageHandler = useCallback(
    (sql: string, page: number, explicitPageSize?: number) => {
      const tab = tabsRef.current.find(
        (candidate) => candidate.id === activeTabIdRef.current,
      );
      const curResult = tab ? resultsByTab[tab.id] : null;
      if (!tab) return;
      void runSqlForTab(
        tab.id,
        sql,
        curResult?.source ?? tab.title,
        curResult?.sourceTable,
        page,
        curResult?.lazyBaseSql ?? curResult?.lazySql,
        explicitPageSize,
      );
    },
    [resultsByTab, runSqlForTab],
  );

  const loadMorePageHandler = useCallback(
    async (sql: string, page: number) => {
      const engine = engineRef.current;
      if (!engine || runningRef.current) return;
      const tabId = activeTabIdRef.current;
      const curResult = resultsByTab[tabId];
      if (!curResult?.lazySql || !curResult.lazyInfinite) return;
      const pageSize = curResult.lazyPageSize ?? INFINITE_SCROLL_PAGE_SIZE;
      const offset = page * pageSize;
      const currentSet = curResult.sets[0];
      if (!currentSet || currentSet.values.length !== offset) return;
      runningRef.current = true;
      try {
        const lazy = await engine.execPaged(sql, pageSize, offset);
        const nextSet = lazy.result[0];
        if (!nextSet || nextSet.values.length === 0) return;
        setResultsByTab((prev) => {
          const latest = prev[tabId];
          const latestSet = latest?.sets[0];
          if (
            !latest?.lazyInfinite ||
            !latestSet ||
            latestSet.values.length !== offset
          ) {
            return prev;
          }
          return {
            ...prev,
            [tabId]: {
              ...latest,
              sets: [
                {
                  ...latestSet,
                  values: [...latestSet.values, ...nextSet.values],
                },
                ...latest.sets.slice(1),
              ],
              lazyTotalCount: lazy.totalCount,
            },
          };
        });
      } catch {
        // Keep already-loaded rows if next chunk fails.
      } finally {
        runningRef.current = false;
      }
    },
    [resultsByTab],
  );

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
      void engine.deleteRows(tableName, pkColumns, pkRows).then((deleted) => {
        showToast(
          `Deleted ${deleted} row${deleted === 1 ? "" : "s"} from "${tableName}".`,
        );
        const sql = `SELECT * FROM ${quoteIdent(tableName)};`;
        void runSqlForTab(tabId, sql, `Table: ${tableName}`, tableName);
      }).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Failed to delete rows from "${tableName}": ${msg}`, "warn");
      });
    },
    [runSqlForTab, showToast],
  );

  const updateRowsInTable = useCallback(
    (
      tableName: string,
      updates: ReadonlyArray<{
        rowIndex: number;
        column: string;
        value: unknown;
      }>,
      refetchSql?: string,
      refetchBaseSql?: string,
    ) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (updates.length === 0) return;
      const tabId = activeTabIdRef.current;
      void engine.updateRows(tableName, updates).then((count) => {
        showToast(
          `Updated ${count} cell${count === 1 ? "" : "s"} in "${tableName}".`,
        );
        if (refetchSql) {
          void runSqlForTab(tabId, `${refetchSql};`, `Table: ${tableName}`, tableName, 0, refetchBaseSql ?? refetchSql);
        } else {
          const pkCols = (columnsByEntity[tableName] ?? [])
            .filter((col) => col.pk > 0)
            .sort((a, b) => a.pk - b.pk)
            .map((col) => quoteIdent(col.name));
          const orderBy = pkCols.length > 0 ? ` ORDER BY ${pkCols.join(", ")}` : "";
          const baseSql = `SELECT * FROM ${quoteIdent(tableName)}`;
          const sql = `${baseSql}${orderBy};`;
          void runSqlForTab(tabId, sql, `Table: ${tableName}`, tableName, 0, baseSql);
        }
      }).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Failed to update cells in "${tableName}": ${msg}`, "warn");
      });
    },
    [runSqlForTab, showToast, columnsByEntity],
  );

  const openAddRow = useCallback(
    async (name: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      try {
        const cols = await engine.listColumns(name);
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

  const submitAddRow = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || !addRowDialog) return;
    const { tableName, columns, values, addAnother } = addRowDialog;
    const columnNames = columns.map((c) => c.name);
    const rowValues = columns.map((c) => {
      const v = values[c.name] ?? "";
      return v === "" ? null : v;
    });
    try {
      await engine.insertRow(tableName, columnNames, rowValues);
      showToast(`Row added to "${tableName}".`);
      if (addAnother) {
        const newValues: Record<string, string> = {};
        for (const c of columns) newValues[c.name] = "";
        setAddRowDialog({ ...addRowDialog, values: newValues });
      } else {
        setAddRowDialog(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Insert failed: ${msg}`, "warn");
    }
  }, [addRowDialog, showToast]);

  const toggleEntityExpanded = useCallback((name: string) => {
    setEntityExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const copyEntityName = useCallback(
    (name: string) => {
      void navigator.clipboard?.writeText(name);
      showToast(`Copied "${name}".`);
    },
    [showToast],
  );

  const countEntityRows = useCallback(
    (name: string, _kind: "table" | "view") => {
      const sql = `SELECT COUNT(*) AS row_count FROM ${quoteIdent(name)};`;
      const tab: QueryTab = {
        id: newTabId(),
        title: `Count: ${name}`,
        code: sql,
        pristineCode: sql,
      };
      persistTabs([...tabsRef.current, tab]);
      setActiveTabId(tab.id);
      void runSqlForTab(tab.id, sql, `Row count: ${name}`);
    },
    [persistTabs, runSqlForTab],
  );

  const viewDDL = useCallback(
    async (name: string) => {
      try {
        const ddl = await engineRef.current?.getDDL(name);
        if (!ddl?.trim()) {
          showToast(`No DDL found for "${name}".`, "warn");
          return;
        }
        setDdlDialog({ title: name, sql: ddl });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Couldn't read DDL: ${msg}`, "warn");
      }
    },
    [showToast],
  );

  const requestDropEntity = useCallback(
    (name: string, kind: "table" | "view" | "index") => {
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

  const truncateEntity = useCallback((name: string) => {
    setPendingTruncate(name);
  }, []);

  const confirmTruncate = useCallback(async () => {
    const name = pendingTruncate;
    if (!name) return;
    setPendingTruncate(null);
    try {
      await engineRef.current?.truncateTable(name);
      showToast(`Truncated table "${name}".`);
    } catch (err) {
      showToast(
        `Truncate failed: ${err instanceof Error ? err.message : String(err)}`,
        "warn",
      );
    }
  }, [pendingTruncate, showToast]);

  const exportEntity = useCallback(
    async (
      name: string,
      format: "csv" | "json" | "sql" | "parquet" | "xlsx",
    ) => {
      const sets = await engineRef.current?.exec(
        `SELECT * FROM ${quoteIdent(name)}`,
      );
      const set = sets?.[0];
      if (!set) return;
      const filename = `${toFileSafeName(name)}.${format}`;
      if (format === "csv")
        exportResultToCsv(set.columns, set.values, filename);
      else if (format === "json")
        exportResultToJson(set.columns, set.values, filename);
      else if (format === "sql")
        exportResultToSql(set.columns, set.values, filename);
      else if (format === "parquet")
        await exportResultToParquet(set.columns, set.values, filename);
      else await exportResultToXlsx(set.columns, set.values, filename);
    },
    [],
  );

  const fetchEntityRowCount = useCallback(
    (name: string): number => rowCountByTable[name] ?? 0,
    [rowCountByTable],
  );

  const exportDuckDbDatabase = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || tables.length === 0) return;
    try {
      const lines: string[] = [
        `-- DuckDB dump`,
        `-- Generated by Dataslope\n`,
      ];
      for (const tableName of tables) {
        const ddl = await engine.getDDL(tableName);
        if (ddl) {
          lines.push(`${ddl}\n`);
        }
        const sets = await engine.exec(
          `SELECT * FROM ${quoteIdent(tableName)}`,
        );
        const set = sets?.[0];
        if (!set) continue;
        const { columns, values: rows } = set;
        const quotedCols = columns.map((c) => quoteIdent(c)).join(", ");
        for (const row of rows) {
          const vals = row
            .map((v) => {
              if (v === null || v === undefined) return "NULL";
              if (typeof v === "number") return String(v);
              return `'${String(v).replace(/'/g, "''")}'`;
            })
            .join(", ");
          lines.push(
            `INSERT INTO ${quoteIdent(tableName)} (${quotedCols}) VALUES (${vals});`,
          );
        }
        lines.push("");
      }
      const sql = lines.join("\n");
      const baseName =
        activeSample.filename.replace(/\.[^.]+$/, "") || "database";
      const filename = `${baseName}.sql`;
      triggerDownload(
        new Blob([sql], { type: "text/plain;charset=utf-8" }),
        filename,
      );
      showToast(`Exported ${filename}.`);
    } catch (err) {
      showToast(
        `Export failed: ${err instanceof Error ? err.message : String(err)}`,
        "warn",
      );
    }
  }, [tables, activeSample, showToast]);

  const exportDuckDbDatabaseToXlsx = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || tables.length === 0) return;
    const baseName =
      activeSample.filename.replace(/\.[^.]+$/, "") || "database";
    const filename = `${baseName}.xlsx`;
    try {
      const mod = await initXlsxWasm();
      const workbook = new mod.Workbook();
      let sheetCount = 0;
      for (const tableName of tables) {
        const sets = await engine.exec(
          `SELECT * FROM ${quoteIdent(tableName)}`,
        );
        const set = sets?.[0];
        if (!set) continue;
        const { columns, values: rows } = set;
        const sheetName =
          tableName.length > 31 ? tableName.slice(0, 31) : tableName;
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
      showToast(
        `Export failed: ${err instanceof Error ? err.message : String(err)}`,
        "warn",
      );
    }
  }, [tables, activeSample, showToast]);

  const exportResultSet = useCallback(
    async (
      format: "csv" | "json" | "sql" | "parquet" | "xlsx",
      scope: ResultSetExportScope,
    ) => {
      if (!result || result.sets.length === 0) return;
      const set = resultSetExportSnapshot
        ? (result.sets[resultSetExportSnapshot.setIndex] ?? result.sets.find((s) => s !== null))
        : result.sets.find((s) => s !== null);
      if (!set) return;
      const columns = resultSetExportSnapshot?.columns ?? set.columns;
      let rows =
        scope === "page" && resultSetExportSnapshot
          ? resultSetExportSnapshot.rows
          : (resultSetExportSnapshot?.allRows ?? set.values);
      if (scope === "all" && result.lazySql && engineRef.current) {
        rows =
          ((await engineRef.current.exec(result.lazySql)).find((s) => s !== null))?.values ?? rows;
      }
      const title = activeTab?.title ?? "result_set";
      const filename = `${toFileSafeName(title)}.${format}`;
      if (format === "csv") exportResultToCsv(columns, rows, filename);
      else if (format === "json") exportResultToJson(columns, rows, filename);
      else if (format === "sql") exportResultToSql(columns, rows, filename);
      else if (format === "parquet")
        await exportResultToParquet(columns, rows, filename);
      else await exportResultToXlsx(columns, rows, filename);
    },
    [activeTab, result, resultSetExportSnapshot],
  );

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

  useEffect(() => {
    const panes = panesRef.current;
    if (!panes) return;
    if (activeTab?.kind === "view-data" || activeTab?.kind === "er-diagram") {
      panes.style.gridTemplateRows = "";
    }
  }, [activeTab?.kind]);

  // ─── Sidebar resizer ────────────────────────────────────────────────
  useEffect(() => {
    const shell = shellRef.current;
    const resizer = sidebarResizerRef.current;
    if (!shell || !resizer) return;
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

  const activeTabIsEr = activeTab?.kind === "er-diagram";
  const activeTabIsHistory = activeTab?.kind === "query-history";
  const constraintInfo = useMemo(() => {
    if (!result?.sourceTable) return undefined;
    return columnsByEntity[result.sourceTable]?.map((col) => ({
      name: col.name,
      isPrimaryKey: col.pk > 0,
      isAutoIncrement: col.defaultValue?.includes("IDENTITY") ?? false,
      isUnique: false,
    }));
  }, [result?.sourceTable, columnsByEntity]);

  return (
    <div className="pg-root">
      {!loaded && (
        <div
          className={`pyodide-loading${statusState === "error" ? " has-error" : ""}`}
          role="status"
          aria-live="polite"
        >
          <div className="loading-hero" aria-hidden="true">
            <div className="loading-hero-track">
              <span className="loading-hero-text">DuckDB Playground</span>
              <span className="loading-hero-text">DuckDB Playground</span>
              <span className="loading-hero-text">DuckDB Playground</span>
            </div>
          </div>
          <div className="loading-bottom">
            <div className="loading-quip">{loadingMessage}</div>
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
                const p = PLAYGROUNDS.find((x) => x.id === value);
                if (p && p.id !== PLAYGROUND_ID) {
                  router.push(p.href);
                }
              }}
            >
              <Select.Trigger className="bui-select-trigger playground-select-trigger">
                <Select.Value />
                <ChevronDown size={16} />
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner>
                  <Select.Popup className="bui-select-popup">
                    {PLAYGROUNDS.map((pg) => (
                      <Select.Item key={pg.id} value={pg.id} className="bui-select-item">
                        {pg.label}
                      </Select.Item>
                    ))}
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </div>
          <div className="pg-header-controls">
            <span className="pg-header-item pg-db-select-container">
              <Database size={14} />
              <select
                className="pg-db-select"
                value={activeDbId}
                onChange={(e) => requestDbSwitch(e.target.value)}
              >
                <optgroup label="Samples">
                  {DUCKDB_SAMPLE_DATABASES.map((sample) => (
                    <option key={sample.id} value={sample.id}>
                      {sample.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Utilities">
                  <option value={DUCKDB_BLANK_DATABASE.id}>New Database</option>
                </optgroup>
              </select>
            </span>
            <Select.Root
              value=""
              onValueChange={(value) => {
                if (value === "export-db") void exportDuckDbDatabase();
                else if (value === "export-xlsx") void exportDuckDbDatabaseToXlsx();
              }}
            >
              <Select.Trigger className="bui-select-trigger pg-header-item pg-export-btn">
                <ArrowDownToLine size={14} />
                <span>Export DB</span>
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner>
                  <Select.Popup className="bui-select-popup">
                    <Select.Item value="export-db" className="bui-select-item">Export as SQL</Select.Item>
                    <Select.Item value="export-xlsx" className="bui-select-item">Export as XLSX</Select.Item>
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
            <button
              type="button"
              className="pg-header-item"
              onClick={resetTabsForCurrentDb}
              title="Reset query tabs"
            >
              <RotateCcw size={14} />
            </button>
            <button
              type="button"
              className="pg-header-item"
              onClick={() => setSettingsOpen(true)}
              title="Settings"
            >
              <FaInfo size={16} />
            </button>
          </div>
        </header>
        <div className="pg-app-inner" ref={shellRef}>
          <div className="pg-sidebar">
            <div className="pg-sidebar-inner">
              <SchemaSection
                label="Tables"
                count={tables.length}
                expanded={tablesExpanded}
                onToggle={() => setTablesExpanded((p) => !p)}
                emptyMessage="No tables"
              >
                {tables.map((name) => (
                  <SchemaItem
                    key={name}
                    name={name}
                    kind="table"
                    expanded={entityExpanded.has(name)}
                    columns={columnsByEntity[name]}
                    foreignKeys={foreignKeysByEntity[name]}
                    onToggleExpanded={toggleEntityExpanded}
                    onPreview={previewEntity}
                    onCount={countEntityRows}
                    onCopy={copyEntityName}
                    onDrop={(n, k) => requestDropEntity(n, k)}
                    onViewDDL={(_name: string, _kind: string) => void viewDDL(_name)}
                    onExport={exportEntity}
                    onGetRowCount={fetchEntityRowCount}
                    onTruncate={truncateEntity}
                    onAddRow={(n) => void openAddRow(n)}
                  />
                ))}
              </SchemaSection>
              <SchemaSection
                label="Views"
                count={views.length}
                expanded={viewsExpanded}
                onToggle={() => setViewsExpanded((p) => !p)}
                emptyMessage="No views"
              >
                {views.map((name) => (
                  <SchemaItem
                    key={name}
                    name={name}
                    kind="view"
                    expanded={false}
                    columns={columnsByEntity[name]}
                    foreignKeys={foreignKeysByEntity[name]}
                    onToggleExpanded={() => {}}
                    onPreview={previewEntity}
                    onCount={countEntityRows}
                    onCopy={copyEntityName}
                    onDrop={(n, k) => requestDropEntity(n, k)}
                    onViewDDL={(_name: string, _kind: string) => void viewDDL(_name)}
                    onExport={(name, fmt) => void exportEntity(name, fmt)}
                    onGetRowCount={() => 0}
                  />
                ))}
              </SchemaSection>
              <SchemaSection
                label="Indexes"
                count={indexes.length}
                expanded={indexesExpanded}
                onToggle={() => setIndexesExpanded((p) => !p)}
                emptyMessage="No indexes"
              >
                {indexes.map((name) => (
                  <SchemaLeafItem
                    key={name}
                    name={name}
                    kind="index"
                    onCopy={copyEntityName}
                    onViewDDL={(_name: string) => void viewDDL(_name)}
                    onDrop={(_name: string) => requestDropEntity(_name, "index")}
                  />
                ))}
              </SchemaSection>
              <div className="pg-sidebar-actions">
                <button
                  type="button"
                  className="pg-sidebar-action"
                  onClick={openErDiagramTab}
                >
                  <Network size={14} /> <span>ER Diagram</span>
                </button>
                <button
                  type="button"
                  className="pg-sidebar-action"
                  onClick={openQueryHistoryTab}
                >
                  <History size={14} /> <span>Query History</span>
                </button>
              </div>
            </div>
          </div>
          <div className="pg-sidebar-resizer" ref={sidebarResizerRef} />
          <div className="pg-panes" ref={panesRef}>
            <div className="pg-tab-bar">
              <div className="pg-tab-list">
                {tabs.map((tab) => (
                  <SqlTab
                    key={tab.id}
                    tab={tab}
                    active={tab.id === activeTabId}
                    onActivate={() => {
                      if (tab.id !== activeTabIdRef.current) {
                        tabHistoryRef.current = pushTabHistory(
                          tabHistoryRef.current,
                          activeTabIdRef.current,
                          tab.id,
                        );
                        setActiveTabId(tab.id);
                      }
                    }}
                    onClose={() => closeTab(tab.id)}
                    onRename={() => {}}
                    onDuplicate={() => {}}
                    onCloseOthers={() => {}}
                    onCloseAll={() => {}}
                  />
                ))}
                <button
                  type="button"
                  className="pg-tab-add"
                  onClick={addTab}
                  title="New query tab"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <div ref={editorPaneRef} className="pg-editor-pane">
              {activeTabIsEr ? (
                <ErDiagramPane
                  tables={tables}
                  columnsByEntity={columnsByEntity}
                  foreignKeysByEntity={foreignKeysByEntity}
                />
              ) : activeTabIsHistory ? (
                <QueryHistoryPane
                  history={queryHistory}
                  theme={editorTheme}
                  onClear={clearHistory}
                />
              ) : (
                <div className="pg-editor" ref={editorHostRef} />
              )}
              <DataslopeRunOverlay running={statusState === "running"} />
            </div>
            <div className="pg-resizer" ref={resizerRef} />
            <div ref={resultsPaneRef} className="pg-results-pane">
              <ResultView
                result={result}
                loading={statusState === "running"}
                keyHints={resultKeyHints as ColumnKeyHints | undefined}
                sourceTable={result?.sourceTable}
                constraintInfo={constraintInfo}
                onDeleteRows={
                  result?.sourceTable ? deleteRowsFromTable : undefined
                }
                onUpdateRows={
                  result?.sourceTable ? updateRowsInTable : undefined
                }
                globalPageSize={globalPageSize}
                onSetGlobalPageSize={setGlobalPageSize}
                onLoadPage={loadPageHandler}
                onLoadMorePage={loadMorePageHandler}
                onExportSnapshotChange={setResultSetExportSnapshot}
                onExportResultSet={exportResultSet}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Dialogs ─────────────────────────────────────────────────── */}
      <ToastList />

      <Dialog.Root open={settingsOpen} onOpenChange={setSettingsOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="bui-backdrop" />
          <Dialog.Popup className="bui-dialog">
            <Dialog.Title className="bui-dialog-title">
              DuckDB Playground Settings
            </Dialog.Title>
            <Dialog.Description className="bui-dialog-desc">
              Configure editor appearance and query behaviour.
            </Dialog.Description>
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
              language="sqlite"
              onClose={() => setSettingsOpen(false)}
              onRestoreDefaults={restoreDefaultSettings}
              onClearLocalStorage={clearAllLocalStorage}
            />
            <div className="bui-dialog-actions">
              <Dialog.Close className="bui-button bui-button-secondary">
                Close
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {ddlDialog && (
        <Dialog.Root open onOpenChange={() => setDdlDialog(null)}>
          <Dialog.Portal>
            <Dialog.Backdrop className="bui-backdrop" />
            <Dialog.Popup className="bui-dialog bui-dialog-wide">
              <Dialog.Title className="bui-dialog-title">
                DDL: {ddlDialog.title}
              </Dialog.Title>
              <DdlViewer
                sql={ddlDialog.sql}
                theme={editorTheme}
              />
              <div className="bui-dialog-actions">
                <Dialog.Close className="bui-button bui-button-secondary">
                  Close
                </Dialog.Close>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {addRowDialog && (
        <Dialog.Root
          open
          onOpenChange={(open) => {
            if (!open) setAddRowDialog(null);
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="bui-backdrop" />
            <Dialog.Popup className="bui-dialog">
              <Dialog.Title className="bui-dialog-title">
                Add Row to {addRowDialog.tableName}
              </Dialog.Title>
              <div className="pg-add-row-form">
                {addRowDialog.columns.map((col) => (
                  <label key={col.name} className="pg-add-row-field">
                    <span>{col.name}</span>
                    <input
                      value={addRowDialog.values[col.name] ?? ""}
                      onChange={(e) =>
                        setAddRowDialog({
                          ...addRowDialog,
                          values: {
                            ...addRowDialog.values,
                            [col.name]: e.target.value,
                          },
                        })
                      }
                      placeholder={col.type}
                    />
                  </label>
                ))}
              </div>
              <div className="bui-dialog-actions">
                <Dialog.Close className="bui-button bui-button-secondary">
                  Cancel
                </Dialog.Close>
                <button
                  type="button"
                  className="bui-button bui-button-primary"
                  onClick={submitAddRow}
                >
                  Add Row
                </button>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
}

export default function DuckDbPlayground() {
  return <DuckDbPlaygroundInner />;
}
