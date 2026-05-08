"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { autocompletion } from "@codemirror/autocomplete";
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
import { Menu } from "@base-ui-components/react/menu";
import { Select } from "@base-ui-components/react/select";
import { Toast } from "@base-ui-components/react/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ChevronDown,
  Database,
  FileText,
  Network,
  Play,
  Plus,
  Table,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
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
  POSTGRES_SAMPLE_DATABASES,
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
import type {
  ColumnKeyHints,
  QueryRunResult,
  ResultSetExportScope,
  ResultSetExportSnapshot,
} from "../sql/types";
import { createSqlCompletionSource, type SqlCompletionSchema } from "../sql/sqlCompletion";

const PLAYGROUND_ID = "postgres";
const STORAGE_PREFIX = "pg_postgres_";
const storageKey = (key: string) => `${STORAGE_PREFIX}${key}`;
const dbScopedKey = (dbId: string, key: string) => `${STORAGE_PREFIX}db_${dbId}_${key}`;
const DEFAULT_PAGE_SIZE = 50;

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
    // Ignore storage quota/private-mode errors.
  }
}

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
  const [indexes, setIndexes] = useState<string[]>([]);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [columnsByEntity, setColumnsByEntity] = useState<Record<string, TableColumnInfo[]>>({});
  const [foreignKeysByEntity, setForeignKeysByEntity] = useState<Record<string, ForeignKeyInfo[]>>({});
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
  const [globalPageSize, setGlobalPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [resultSetExportSnapshot, setResultSetExportSnapshot] =
    useState<ResultSetExportSnapshot | null>(null);

  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const langCompRef = useRef<Compartment | null>(null);
  const completionCompRef = useRef<Compartment | null>(null);
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
        try {
          const [cols, fks] = await Promise.all([
            engine.listColumns(name),
            engine.listForeignKeys(name),
          ]);
          return [name, cols, fks] as const;
        } catch {
          return [name, [] as TableColumnInfo[], [] as ForeignKeyInfo[]] as const;
        }
      }),
    );
    setTables(nextTables);
    setViews(nextViews);
    setIndexes(nextIndexes);
    setTriggers(nextTriggers);
    setColumnsByEntity(Object.fromEntries(entries.map(([name, cols]) => [name, cols])));
    setForeignKeysByEntity(Object.fromEntries(entries.map(([name, , fks]) => [name, fks])));
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
        window.setTimeout(() => setStatusState("ready"), 2500);
      } finally {
        runningRef.current = false;
      }
    },
    [globalPageSize, refreshSchema, showToast],
  );

  const runActiveTab = useCallback(() => {
    const tab = tabsRef.current.find((candidate) => candidate.id === activeTabIdRef.current);
    if (!tab || tab.kind === "er-diagram") return;
    const sql = editorRef.current?.state.doc.toString() ?? tab.code;
    void runSqlForTab(tab.id, sql, tab.title, tab.kind === "view-data" ? tab.title : undefined);
  }, [runSqlForTab]);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);
  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);
  useEffect(() => {
    activeDbIdRef.current = activeDbId;
  }, [activeDbId]);

  useEffect(() => {
    document.title = "PostgreSQL Playground";
    document.body.classList.add("pg-active");
    return () => document.body.classList.remove("pg-active");
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (editorHostRef.current && !editorRef.current) {
      const langComp = new Compartment();
      const completionComp = new Compartment();
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
          themeFor("lucario"),
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
                runActiveTab();
                return true;
              },
            },
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            indentWithTab,
          ]),
        ],
      });
      editorRef.current = view;
      langCompRef.current = langComp;
      completionCompRef.current = completionComp;
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
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const view = editorRef.current;
    if (!view || !activeTab || activeTab.kind === "er-diagram") return;
    const current = view.state.doc.toString();
    if (current !== activeTab.code) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: activeTab.code } });
    }
    view.focus();
  }, [activeTabId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const switchDatabase = useCallback(
    async (nextId: string) => {
      const engine = engineRef.current;
      if (!engine || nextId === activeDbId) return;
      setStatusState("loading");
      try {
        const sample = await engine.loadSampleDatabase(nextId);
        setActiveDbId(sample.id);
        localStorage.setItem(storageKey("db"), sample.id);
        const nextTabs = loadTabs(sample.id);
        persistTabs(nextTabs, sample.id);
        setActiveTabId(nextTabs[0]?.id ?? "");
        setResultsByTab({});
        await refreshSchema();
        setStatusState("ready");
        showToast(`Loaded ${sample.filename}.`);
      } catch (err) {
        showToast(`Load failed: ${err instanceof Error ? err.message : String(err)}`, "warn");
        setStatusState("ready");
      }
    },
    [activeDbId, persistTabs, refreshSchema, showToast],
  );

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
      const { [id]: deletedResult, ...rest } = prev;
      void deletedResult;
      return rest;
    });
  }, [persistTabs]);

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
      void runSqlForTab(tab.id, sql, `${kind === "table" ? "Table" : "View"}: ${name}`, kind === "table" ? name : undefined);
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
      void runSqlForTab(tab.id, sql, curResult?.source ?? tab.title, curResult?.sourceTable, page, curResult?.lazyBaseSql ?? curResult?.lazySql);
    },
    [resultsByTab, runSqlForTab],
  );

  const copyEntityName = useCallback((name: string) => {
    void navigator.clipboard?.writeText(name);
    showToast(`Copied "${name}".`);
  }, [showToast]);

  const countEntityRows = useCallback((name: string, kind: "table" | "view") => {
    const sql = `SELECT COUNT(*) AS row_count FROM ${quoteIdent(name)};`;
    const tab: QueryTab = { id: newTabId(), title: `Count: ${name}`, code: sql, pristineCode: sql };
    persistTabs([...tabsRef.current, tab]);
    setActiveTabId(tab.id);
    void runSqlForTab(tab.id, sql, `${kind === "view" ? "View row count" : "Row count"}: ${name}`);
  }, [persistTabs, runSqlForTab]);

  const viewDDL = useCallback(async (name: string) => {
    const ddl = await engineRef.current?.getDDL(name);
    if (!ddl) return;
    const tab: QueryTab = { id: newTabId(), title: `DDL: ${name}`, code: ddl, pristineCode: ddl };
    persistTabs([...tabsRef.current, tab]);
    setActiveTabId(tab.id);
  }, [persistTabs]);

  const dropEntity = useCallback(async (name: string, kind: "table" | "view") => {
    if (!window.confirm(`Drop ${kind} "${name}"?`)) return;
    await engineRef.current?.dropEntity(name, kind);
    await refreshSchema();
    showToast(`Dropped ${kind} "${name}".`);
  }, [refreshSchema, showToast]);

  const exportEntity = useCallback(async (name: string, format: "csv" | "json" | "sql" | "parquet" | "xlsx") => {
    const sets = await engineRef.current?.exec(`SELECT * FROM ${quoteIdent(name)}`);
    const set = sets?.[0];
    if (!set) return;
    const filename = `${toFileSafeName(name)}.${format}`;
    if (format === "csv") exportResultToCsv(set.columns, set.values, filename);
    else if (format === "json") exportResultToJson(set.columns, set.values, filename);
    else if (format === "sql") exportResultToSql(set.columns, set.values, filename);
    else if (format === "parquet") await exportResultToParquet(set.columns, set.values, filename);
    else await exportResultToXlsx(set.columns, set.values, filename);
  }, []);

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
                const next = PLAYGROUNDS.find((playground) => playground.id === value);
                if (next && next.id !== PLAYGROUND_ID) router.push(next.href);
              }}
            >
              <Select.Trigger className="playground-switcher" aria-label="Switch playground">
                {(() => {
                  const Icon = PLAYGROUND_ICONS[PLAYGROUND_ID];
                  const color = PLAYGROUND_ICON_COLORS[PLAYGROUND_ID];
                  const factor = PLAYGROUND_ICON_SIZE_FACTOR[PLAYGROUND_ID] ?? 1;
                  return Icon ? <span className="playground-switcher-lang-icon" style={{ color }} aria-hidden="true"><Icon size={Math.round(16 * factor)} /></span> : null;
                })()}
                <Select.Value />
                <Select.Icon className="playground-switcher-icon"><ChevronDown size={12} /></Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner className="pg-lang-switcher-positioner" sideOffset={6} alignItemWithTrigger={false}>
                  <Select.Popup className="bui-select-popup pg-lang-switcher-popup">
                    {PLAYGROUNDS.map((playground) => (
                      <Select.Item key={playground.id} value={playground.id} className="bui-select-item">
                        <Select.ItemText>{playground.label}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </div>
          <div className="header-sep" />
          <div className="header-actions desktop-only">
            <Menu.Root>
              <Menu.Trigger className="header-btn" disabled={!result || result.sets.length === 0}>
                <ArrowDownToLine size={14} aria-hidden="true" />
                <span className="btn-label">Export Result</span>
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner sideOffset={6} align="end">
                  <Menu.Popup className="bui-popup examples-dropdown export-dropdown">
                    {(["csv", "json", "sql", "parquet", "xlsx"] as const).map((format) => (
                      <Menu.Item key={format} className="example-item export-item" onClick={() => void exportResultSet(format, "all")}>
                        <div className="export-item-text">
                          <div className="ex-title">{format.toUpperCase()} <span className="ext-badge">.{format}</span></div>
                        </div>
                      </Menu.Item>
                    ))}
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
            <button type="button" className="run-btn" disabled={!loaded || statusState === "running"} onClick={runActiveTab}>
              <Play size={15} aria-hidden="true" />
              <span>{statusState === "running" ? "Running…" : "Run"}</span>
            </button>
          </div>
        </header>

        <div className="sql-shell postgres-shell">
          <aside className="sql-sidebar" aria-label="Database explorer">
            <div className="sql-db-selector-wrap">
              <Select.Root value={activeDbId} onValueChange={(value) => void switchDatabase(String(value))}>
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
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </div>
            <div className="sql-tree">
              <SchemaSection label="TABLES" count={tables.length} expanded={tablesExpanded} onToggle={() => setTablesExpanded((v) => !v)} emptyMessage="No tables." allExpanded={tables.length > 0 && tables.every((name) => expandedEntities.has(name))} onExpandAll={() => setExpandedEntities(new Set(tables))} onCollapseAll={() => setExpandedEntities(new Set())}>
                {tables.map((name) => (
                  <SchemaItem key={name} name={name} kind="table" expanded={expandedEntities.has(name)} columns={columnsByEntity[name]} foreignKeys={foreignKeysByEntity[name]} onToggleExpanded={(entity) => setExpandedEntities((prev) => {
                    const next = new Set(prev);
                    if (next.has(entity)) next.delete(entity);
                    else next.add(entity);
                    return next;
                  })} onPreview={previewEntity} onCount={countEntityRows} onCopy={copyEntityName} onDrop={dropEntity} onViewDDL={(n) => void viewDDL(n)} onExport={(n, f) => void exportEntity(n, f)} onGetRowCount={() => 0} />
                ))}
              </SchemaSection>
              <SchemaSection label="VIEWS" count={views.length} expanded={viewsExpanded} onToggle={() => setViewsExpanded((v) => !v)} emptyMessage="No views.">
                {views.map((name) => (
                  <SchemaItem key={name} name={name} kind="view" expanded={expandedEntities.has(name)} columns={columnsByEntity[name]} foreignKeys={foreignKeysByEntity[name]} onToggleExpanded={(entity) => setExpandedEntities((prev) => {
                    const next = new Set(prev);
                    if (next.has(entity)) next.delete(entity);
                    else next.add(entity);
                    return next;
                  })} onPreview={previewEntity} onCount={countEntityRows} onCopy={copyEntityName} onDrop={dropEntity} onViewDDL={(n) => void viewDDL(n)} onExport={(n, f) => void exportEntity(n, f)} onGetRowCount={() => 0} />
                ))}
              </SchemaSection>
              <SchemaSection label="INDEXES" count={indexes.length} expanded={indexesExpanded} onToggle={() => setIndexesExpanded((v) => !v)} emptyMessage="No indexes.">
                {indexes.map((name) => <div key={name} className="schema-leaf"><Table size={12} />{name}</div>)}
              </SchemaSection>
              <SchemaSection label="TRIGGERS" count={triggers.length} expanded={true} onToggle={() => undefined} emptyMessage="No triggers.">
                {triggers.map((name) => <div key={name} className="schema-leaf"><FileText size={12} />{name}</div>)}
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
          <main className={`sql-panes postgres-panes${activeTab?.kind === "view-data" ? " sql-panes--view-data" : ""}${activeTab?.kind === "er-diagram" ? " sql-panes--er-diagram" : ""}`}>
            <div className="sql-tabbar">
              <DndContext sensors={tabDragSensors} collisionDetection={closestCenter}>
                <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
                  <div className="sql-tabs" role="tablist">
                    {tabs.map((tab) => (
                      <SqlTab key={tab.id} tab={tab} active={tab.id === activeTabId} onActivate={() => setActiveTabId(tab.id)} onClose={() => closeTab(tab.id)} onRename={(title) => persistTabs(tabsRef.current.map((candidate) => candidate.id === tab.id ? { ...candidate, title } : candidate))} onDuplicate={() => {
                        const dup = { ...tab, id: newTabId(), title: `${tab.title} copy` };
                        persistTabs([...tabsRef.current, dup]);
                        setActiveTabId(dup.id);
                      }} onCloseOthers={() => persistTabs([tab])} onCloseAll={() => {
                        const fresh = { id: newTabId(), title: "Query 1", code: "", pristineCode: "" };
                        persistTabs([fresh]);
                        setActiveTabId(fresh.id);
                      }} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <button type="button" className="sql-tab-add" onClick={addTab} aria-label="New query tab">
                <Plus size={12} aria-hidden="true" />
              </button>
            </div>
            <div className="sql-editor-pane" style={activeTab?.kind === "view-data" || activeTab?.kind === "er-diagram" ? { display: "none" } : undefined}>
              <div className="editor-wrap" ref={editorHostRef} />
              <div className="sql-toolbar">
                <button type="button" className={`run-btn${statusState === "running" ? " running" : ""}`} disabled={!loaded || statusState === "running"} onClick={runActiveTab}>
                  <Play size={10} aria-hidden="true" />
                  {statusState === "running" ? "Running…" : "Run"}
                </button>
              </div>
            </div>
            {activeTab?.kind === "er-diagram" ? (
              <ErDiagramPane tables={tables} columnsByEntity={columnsByEntity} foreignKeysByEntity={foreignKeysByEntity} onPreview={previewEntity} onCount={countEntityRows} onCopy={copyEntityName} onDrop={dropEntity} onViewDDL={(name) => void viewDDL(name)} onExport={(name, format) => void exportEntity(name, format)} onGetRowCount={() => 0} />
            ) : (
              <>
                <div className="sql-resizer" role="separator" aria-orientation="horizontal" />
                <section className="sql-results-pane">
                  <ResultView result={result} loading={statusState === "running"} keyHints={resultKeyHints} sourceTable={result?.sourceTable} globalPageSize={globalPageSize} onSetGlobalPageSize={setGlobalPageSize} onLoadPage={handleLoadPage} onExportSnapshotChange={setResultSetExportSnapshot} onExportResultSet={(format, scope) => void exportResultSet(format, scope)} />
                </section>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
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
