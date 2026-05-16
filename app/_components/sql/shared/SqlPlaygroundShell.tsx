"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { EditorView } from "@codemirror/view";
import type { Compartment } from "@codemirror/state";
import { Select } from "@base-ui-components/react/select";
import { Toast } from "@base-ui-components/react/toast";
import { Database, ChevronDown, ChevronRight, Hash, Settings2 } from "lucide-react";
import { IoLink } from "react-icons/io5";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "../../playground.css";
import "../../sqlPlayground.css";
import type { SqlEngineAdapter, SqlEngineHandle, SqlColumnInfo, SqlForeignKeyInfo, SqlSample } from "./SqlEngineAdapter";
import {
  createSqlEditorExtensions,
  makeSqlEditorCompartments,
} from "./editorSetup";
import { SqlRunControls } from "./SqlRunControls";
import { useSqlPlaygroundSettingsHydration } from "./useSqlPlaygroundSettings";
import { ResultView } from "../components/ResultView";
import { SchemaSection } from "../components/SchemaSection";
import type { QueryRunResult } from "../types";
import {
  DEFAULT_PLAYGROUND_SETTINGS,
  DataslopeRunOverlay,
  detectIsMac,
  SettingsPanel,
} from "../../playgroundShared";
import {
  applyMode,
  applyThemePalette,
  clearThemePalette,
  LIGHT_THEMES,
  setStoredEditorTheme,
} from "../../playgroundTheme";
import { ToastList } from "../components/ToastList";
import { PLAYGROUNDS } from "../../playgrounds";
import {
  LANGUAGE_ICONS as PLAYGROUND_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR as PLAYGROUND_ICON_SIZE_FACTOR,
} from "../../languageIcons";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SqlShellTab {
  id: string;
  title: string;
  code: string;
  pristineCode: string;
}

export interface SqlShellState {
  tabs: SqlShellTab[];
  activeTabId: string;
}

export interface SqlPlaygroundShellProps {
  adapter: SqlEngineAdapter;
  sampleId?: string;
}

// ─── Storage helpers (kept for external use in tests etc.) ───────────────────

interface ShellStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const DEFAULT_SQL = "-- Start writing SQL here\nSELECT 1;";

export function createSqlShellTabId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `shell_${crypto.randomUUID()}`;
  }
  return `shell_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function sqlShellStorageKey(storagePrefix: string, sampleId: string): string {
  return `${storagePrefix}:shell:${sampleId}:tabs`;
}

export function defaultSqlShellTabs(sample: SqlSample): SqlShellTab[] {
  const seeds = sample.defaultTabs?.length
    ? sample.defaultTabs
    : [{ title: "Query 1", code: DEFAULT_SQL }];

  return seeds.map((seed) => ({
    id: createSqlShellTabId(),
    title: seed.title,
    code: seed.code,
    pristineCode: seed.code,
  }));
}

function normalizeTabs(value: unknown): SqlShellTab[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const tabs = value.flatMap((tab): SqlShellTab[] => {
    if (typeof tab !== "object" || tab === null) return [];
    const candidate = tab as Partial<SqlShellTab>;
    if (
      typeof candidate.id !== "string" ||
      typeof candidate.title !== "string" ||
      typeof candidate.code !== "string"
    ) return [];
    return [{
      id: candidate.id,
      title: candidate.title,
      code: candidate.code,
      pristineCode:
        typeof candidate.pristineCode === "string"
          ? candidate.pristineCode
          : candidate.code,
    }];
  });
  return tabs.length > 0 ? tabs : null;
}

export function loadSqlShellState(
  storage: ShellStorage | null,
  storagePrefix: string,
  sample: SqlSample,
): SqlShellState {
  const key = sqlShellStorageKey(storagePrefix, sample.id);
  if (storage) {
    try {
      const raw = storage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SqlShellState>;
        const tabs = normalizeTabs(parsed.tabs);
        const activeTabId =
          typeof parsed.activeTabId === "string" ? parsed.activeTabId : "";
        if (tabs) {
          return {
            tabs,
            activeTabId: tabs.some((t) => t.id === activeTabId)
              ? activeTabId
              : tabs[0].id,
          };
        }
      }
    } catch {
      // Corrupt persisted state – fall through to defaults.
    }
  }
  const tabs = defaultSqlShellTabs(sample);
  return { tabs, activeTabId: tabs[0].id };
}

export function saveSqlShellState(
  storage: ShellStorage | null,
  storagePrefix: string,
  sampleId: string,
  state: SqlShellState,
): void {
  if (!storage) return;
  try {
    storage.setItem(sqlShellStorageKey(storagePrefix, sampleId), JSON.stringify(state));
  } catch {
    // Quota exceeded / private mode.
  }
}

export function addSqlShellTab(state: SqlShellState): SqlShellState {
  const nextTabNumber = state.tabs.length + 1;
  const nextTab: SqlShellTab = {
    id: createSqlShellTabId(),
    title: `Query ${nextTabNumber}`,
    code: "",
    pristineCode: "",
  };
  return { tabs: [...state.tabs, nextTab], activeTabId: nextTab.id };
}

export function updateSqlShellTabCode(
  state: SqlShellState,
  tabId: string,
  code: string,
): SqlShellState {
  return {
    ...state,
    tabs: state.tabs.map((tab) =>
      tab.id === tabId ? { ...tab, code } : tab,
    ),
  };
}

function getBrowserStorage(): ShellStorage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

// ─── Schema sidebar ───────────────────────────────────────────────────────────

function SchemaColumnList({
  name,
  columns,
  foreignKeys,
}: {
  name: string;
  columns: SqlColumnInfo[] | undefined;
  foreignKeys: SqlForeignKeyInfo[] | undefined;
}) {
  if (!columns) {
    return (
      <ul className="sql-tree-columns" aria-label={`Columns of ${name}`}>
        <li className="sql-tree-column" style={{ opacity: 0.5 }}>Loading…</li>
      </ul>
    );
  }
  if (columns.length === 0) {
    return (
      <ul className="sql-tree-columns" aria-label={`Columns of ${name}`}>
        <li className="sql-tree-column" style={{ opacity: 0.5 }}>No columns</li>
      </ul>
    );
  }
  const fkMap = new Map<string, SqlForeignKeyInfo>();
  for (const fk of foreignKeys ?? []) {
    fkMap.set(fk.from, fk);
  }
  return (
    <ul className="sql-tree-columns" aria-label={`Columns of ${name}`}>
      {columns.map((col) => {
        const isPk = (col.pk ?? 0) > 0;
        const fk = fkMap.get(col.name);
        return (
          <li key={col.name} className="sql-tree-column">
            <span className="sql-tree-column-icons">
              {isPk && (
                <span className="sql-tree-column-pk" title="Primary key">
                  <Hash size={9} aria-label="Primary key" />
                </span>
              )}
              {fk && !isPk && (
                <span className="sql-tree-column-fk" title={`Foreign key → ${fk.to_table}.${fk.to_column}`}>
                  <IoLink size={9} aria-label="Foreign key" />
                </span>
              )}
            </span>
            <span className="sql-tree-column-name">{col.name}</span>
            {col.type && (
              <span className="sql-tree-column-type" style={{ opacity: 0.55, fontSize: 10 }}>
                {col.type}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function SchemaEntityRow({
  name,
  kind,
  expanded,
  columns,
  foreignKeys,
  onToggle,
  onPreview,
}: {
  name: string;
  kind: "table" | "view";
  expanded: boolean;
  columns: SqlColumnInfo[] | undefined;
  foreignKeys: SqlForeignKeyInfo[] | undefined;
  onToggle: () => void;
  onPreview: (name: string, kind: "table" | "view") => void;
}) {
  return (
    <div className="sql-tree-entity">
      <div className="sql-tree-item-row">
        <button
          type="button"
          className="sql-tree-entity-trigger sql-tree-item"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          <span className="sql-tree-chevron" aria-hidden="true">
            {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </span>
          {kind === "table" ? (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" style={{ flexShrink: 0 }}>
              <rect x="1" y="1" width="12" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <line x1="1" y1="4.5" x2="13" y2="4.5" stroke="currentColor" strokeWidth="1.2" />
              <line x1="5" y1="4.5" x2="5" y2="13" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" style={{ flexShrink: 0 }}>
              <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="7" cy="7" r="2" fill="currentColor" opacity="0.5" />
            </svg>
          )}
          <span className="sql-tree-item-name">{name}</span>
        </button>
        <button
          type="button"
          className="sql-tree-entity-action-btn"
          title={`Preview ${name}`}
          onClick={() => onPreview(name, kind)}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-label="Preview" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
      {expanded && (
        <SchemaColumnList name={name} columns={columns} foreignKeys={foreignKeys} />
      )}
    </div>
  );
}

// ─── Main shell ───────────────────────────────────────────────────────────────

function SqlPlaygroundShellInner({ adapter, sampleId }: SqlPlaygroundShellProps) {
  const router = useRouter();
  const samples = useMemo(() => adapter.listSamples(), [adapter]);
  const isMac = useMemo(() => detectIsMac(), []);

  // ─── Active sample ────────────────────────────────────────────────
  const [activeSampleId, setActiveSampleId] = useState<string>(() => {
    if (sampleId) {
      const found = adapter.findSample(sampleId);
      if (found) return found.id;
    }
    return samples[0]?.id ?? "blank";
  });

  const activeSample = useMemo(
    () => adapter.findSample(activeSampleId) ?? samples[0] ?? { id: "blank", label: adapter.displayName, filename: "" },
    [adapter, activeSampleId, samples],
  );

  const storage = getBrowserStorage();

  // ─── Tab state ────────────────────────────────────────────────────
  const [shellState, setShellState] = useState<SqlShellState>(() =>
    loadSqlShellState(storage, adapter.storagePrefix, activeSample),
  );

  const activeTab = shellState.tabs.find((t) => t.id === shellState.activeTabId);

  const persistState = useCallback(
    (next: SqlShellState) => {
      saveSqlShellState(storage, adapter.storagePrefix, activeSampleId, next);
      return next;
    },
    [adapter.storagePrefix, activeSampleId, storage],
  );

  // ─── Engine / status state ────────────────────────────────────────
  type Status = "booting" | "ready" | "running" | "error";
  const [status, setStatus] = useState<Status>("booting");
  const [loaded, setLoaded] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading engine…");

  const engineRef = useRef<SqlEngineHandle | null>(null);
  const activeTabIdRef = useRef<string>(shellState.activeTabId);
  const activeSampleIdRef = useRef<string>(activeSampleId);
  useEffect(() => { activeSampleIdRef.current = activeSampleId; }, [activeSampleId]);

  // Keep ref in sync
  useEffect(() => {
    activeTabIdRef.current = shellState.activeTabId;
  }, [shellState.activeTabId]);

  // ─── Schema state ─────────────────────────────────────────────────
  const [tables, setTables] = useState<string[]>([]);
  const [views, setViews] = useState<string[]>([]);
  const [columnsByEntity, setColumnsByEntity] = useState<Record<string, SqlColumnInfo[]>>({});
  const [fksByEntity, setFksByEntity] = useState<Record<string, SqlForeignKeyInfo[]>>({});
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
  const [tablesSectionExpanded, setTablesSectionExpanded] = useState(true);
  const [viewsSectionExpanded, setViewsSectionExpanded] = useState(true);

  // ─── Results state ────────────────────────────────────────────────
  const [resultsByTab, setResultsByTab] = useState<Record<string, QueryRunResult | null>>({});
  const [globalPageSize, setGlobalPageSize] = useState(50);
  const [hasSelection, setHasSelection] = useState(false);

  const result = activeTab ? (resultsByTab[activeTab.id] ?? null) : null;

  // ─── Settings ─────────────────────────────────────────────────────
  const [fontSize, setFontSize] = useState<number>(DEFAULT_PLAYGROUND_SETTINGS.fontSize);
  const [wordWrap, setWordWrap] = useState<boolean>(DEFAULT_PLAYGROUND_SETTINGS.wordWrap);
  const [clearBeforeRun, setClearBeforeRun] = useState<boolean>(DEFAULT_PLAYGROUND_SETTINGS.clearBeforeRun);
  const [editorTheme, setEditorTheme] = useState<string>(DEFAULT_PLAYGROUND_SETTINGS.editorTheme);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSetEditorTheme = useCallback((t: string) => {
    setEditorTheme(t);
    setStoredEditorTheme(t);
  }, []);

  const handleRestoreDefaults = useCallback(() => {
    setFontSize(DEFAULT_PLAYGROUND_SETTINGS.fontSize);
    setWordWrap(DEFAULT_PLAYGROUND_SETTINGS.wordWrap);
    setClearBeforeRun(DEFAULT_PLAYGROUND_SETTINGS.clearBeforeRun);
    handleSetEditorTheme(DEFAULT_PLAYGROUND_SETTINGS.editorTheme);
  }, [handleSetEditorTheme]);

  const clearBeforeRunRef = useRef(clearBeforeRun);
  useEffect(() => { clearBeforeRunRef.current = clearBeforeRun; }, [clearBeforeRun]);

  useSqlPlaygroundSettingsHydration(
    adapter.storagePrefix,
    { fontSize, wordWrap, clearBeforeRun, editorTheme },
    { setFontSize, setWordWrap, setClearBeforeRun, setEditorTheme },
  );

  // ─── Editor refs ──────────────────────────────────────────────────
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const themeCompRef = useRef<Compartment | null>(null);
  const wrapCompRef = useRef<Compartment | null>(null);
  const completionCompRef = useRef<Compartment | null>(null);
  const runRef = useRef<() => void>(() => undefined);
  const runSelectionRef = useRef<(sql: string) => void>(() => undefined);
  const shellStateRef = useRef<SqlShellState>(shellState);
  useEffect(() => { shellStateRef.current = shellState; }, [shellState]);

  // ─── Toast helper ─────────────────────────────────────────────────
  const toastManager = Toast.useToastManager();
  const showToast = useCallback(
    (msg: string) => {
      toastManager.add({ title: msg, data: { kind: "info" } });
    },
    [toastManager],
  );

  // ─── Schema refresh ───────────────────────────────────────────────
  const refreshSchema = useCallback(async (engine: SqlEngineHandle) => {
    const [newTables, newViews] = await Promise.all([
      engine.listTables(),
      engine.listViews(),
    ]);
    setTables(newTables);
    setViews(newViews);
    // Purge column cache for dropped entities.
    const entitySet = new Set([...newTables, ...newViews]);
    setColumnsByEntity((prev) => {
      const dropped = Object.keys(prev).filter((n) => !entitySet.has(n));
      if (dropped.length === 0) return prev;
      const next = { ...prev };
      for (const d of dropped) delete next[d];
      return next;
    });
    setFksByEntity((prev) => {
      const dropped = Object.keys(prev).filter((n) => !entitySet.has(n));
      if (dropped.length === 0) return prev;
      const next = { ...prev };
      for (const d of dropped) delete next[d];
      return next;
    });
  }, []);

  // ─── Mount editor once ────────────────────────────────────────────
  useEffect(() => {
    if (!editorHostRef.current || editorRef.current) return;

    const compartments = makeSqlEditorCompartments();
    themeCompRef.current = compartments.theme;
    wrapCompRef.current = compartments.wrap;
    completionCompRef.current = compartments.completion;

    const view = new EditorView({
      doc: activeTab?.code ?? "",
      parent: editorHostRef.current,
      extensions: createSqlEditorExtensions({
        dialect: adapter.dialect,
        compartments,
        initialTheme: editorTheme,
        initialWordWrap: wordWrap,
        onSelectionChange: setHasSelection,
        onDocChange: (code) => {
          const tabId = activeTabIdRef.current;
          const sampleId = activeSampleIdRef.current;
          setShellState((prev) => {
            const next = updateSqlShellTabCode(prev, tabId, code);
            // Defer persistence to an idle callback so typing stays snappy.
            if (typeof requestIdleCallback !== "undefined") {
              requestIdleCallback(() => {
                saveSqlShellState(storage, adapter.storagePrefix, sampleId, next);
              });
            } else {
              saveSqlShellState(storage, adapter.storagePrefix, sampleId, next);
            }
            return next;
          });
        },
        onRunSelection: (sql) => runSelectionRef.current(sql),
        onRunAll: () => runRef.current(),
      }),
    });

    editorRef.current = view;
    return () => {
      view.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Boot / reload engine when sample changes ─────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setStatus("booting");
    setLoadingMessage(`Loading ${adapter.displayName} engine…`);
    setTables([]);
    setViews([]);
    setColumnsByEntity({});
    setFksByEntity({});
    setExpandedEntities(new Set());

    const prevEngine = engineRef.current;
    engineRef.current = null;
    if (prevEngine) prevEngine.destroy();

    (async () => {
      try {
        const engine = await adapter.createEngine(activeSampleId);
        if (cancelled) { engine.destroy(); return; }
        engineRef.current = engine;

        if (adapter.afterEngineCreated) {
          await adapter.afterEngineCreated(engine);
        }

        await refreshSchema(engine);

        // Load tab state for this sample and sync editor.
        const newState = loadSqlShellState(storage, adapter.storagePrefix, activeSample);
        setShellState(newState);
        activeTabIdRef.current = newState.activeTabId;

        const tab = newState.tabs.find((t) => t.id === newState.activeTabId);
        const view = editorRef.current;
        if (view) {
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: tab?.code ?? "" },
          });
        }

        setLoaded(true);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setLoadingMessage(`Failed to load: ${msg}`);
        setStatus("error");
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSampleId]);

  // Cleanup engine on unmount.
  useEffect(() => {
    return () => { engineRef.current?.destroy(); };
  }, []);

  // ─── Theme / wrap reconfigure ─────────────────────────────────────
  useEffect(() => {
    const view = editorRef.current;
    const comp = themeCompRef.current;
    if (!view || !comp) return;
    import("../../cmExtensions").then(({ themeFor }) => {
      view.dispatch({ effects: comp.reconfigure(themeFor(editorTheme)) });
    });
    applyThemePalette(editorTheme);
    applyMode(editorTheme);
  }, [editorTheme]);

  useEffect(() => {
    const view = editorRef.current;
    const comp = wrapCompRef.current;
    if (!view || !comp) return;
    view.dispatch({ effects: comp.reconfigure(wordWrap ? EditorView.lineWrapping : []) });
  }, [wordWrap]);

  useEffect(() => {
    return () => { clearThemePalette(); };
  }, []);

  // ─── Sync editor when active tab changes ─────────────────────────
  useEffect(() => {
    const view = editorRef.current;
    if (!view || !activeTab) return;
    const editorDoc = view.state.doc.toString();
    if (editorDoc !== activeTab.code) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: activeTab.code },
      });
    }
    view.focus();
  }, [activeTab?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Query runner ─────────────────────────────────────────────────
  const runSql = useCallback(
    (sql: string, tabId: string, source: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      const trimmed = sql.trim();
      if (!trimmed) return;

      if (clearBeforeRunRef.current) {
        setResultsByTab((prev) => ({ ...prev, [tabId]: null }));
      }
      setStatus("running");
      const t0 = performance.now();

      void (async () => {
        try {
          const sets = await engine.exec(trimmed);
          const elapsedMs = performance.now() - t0;
          setResultsByTab((prev) => ({
            ...prev,
            [tabId]: { sets, elapsedMs, source },
          }));
          await refreshSchema(engine);
          const MIN_MS = 300;
          const wait = MIN_MS - (performance.now() - t0);
          if (wait > 0) await new Promise((r) => setTimeout(r, wait));
          setStatus("ready");
        } catch (err) {
          const elapsedMs = performance.now() - t0;
          const msg = err instanceof Error ? err.message : String(err);
          setResultsByTab((prev) => ({
            ...prev,
            [tabId]: { sets: [], elapsedMs, error: msg, source },
          }));
          setStatus("error");
          window.setTimeout(() => setStatus("ready"), 3000);
        }
      })();
    },
    [refreshSchema],
  );

  const runActiveTab = useCallback(() => {
    const id = activeTabIdRef.current;
    const state = shellStateRef.current;
    const tab = state.tabs.find((t) => t.id === id);
    if (!tab) return;
    const sql = editorRef.current?.state.doc.toString() ?? tab.code;
    runSql(sql, tab.id, tab.title);
  }, [runSql]);

  const runSelection = useCallback(
    (sql: string) => {
      const id = activeTabIdRef.current;
      const state = shellStateRef.current;
      const tab = state.tabs.find((t) => t.id === id);
      if (!tab) return;
      runSql(sql, tab.id, tab.title);
    },
    [runSql],
  );

  // Keep stable refs so the CodeMirror keymap callbacks never go stale.
  useEffect(() => { runRef.current = runActiveTab; }, [runActiveTab]);
  useEffect(() => { runSelectionRef.current = runSelection; }, [runSelection]);

  // ─── Tab management ───────────────────────────────────────────────
  const handleAddTab = useCallback(() => {
    setShellState((prev) => persistState(addSqlShellTab(prev)));
  }, [persistState]);

  const handleActivateTab = useCallback(
    (tabId: string) => {
      setShellState((prev) => {
        const next = { ...prev, activeTabId: tabId };
        return persistState(next);
      });
      activeTabIdRef.current = tabId;
    },
    [persistState],
  );

  const handleCloseTab = useCallback(
    (tabId: string) => {
      setShellState((prev) => {
        if (prev.tabs.length <= 1) return prev;
        const idx = prev.tabs.findIndex((t) => t.id === tabId);
        const nextTabs = prev.tabs.filter((t) => t.id !== tabId);
        const nextActiveId =
          prev.activeTabId === tabId
            ? (nextTabs[Math.max(0, idx - 1)]?.id ?? nextTabs[0]?.id ?? "")
            : prev.activeTabId;
        return persistState({ tabs: nextTabs, activeTabId: nextActiveId });
      });
    },
    [persistState],
  );

  // ─── Schema: lazy column load ─────────────────────────────────────
  const handleToggleEntity = useCallback(
    (name: string) => {
      setExpandedEntities((prev) => {
        const next = new Set(prev);
        if (next.has(name)) {
          next.delete(name);
        } else {
          next.add(name);
          // Lazy load columns if not yet cached.
          if (!columnsByEntity[name]) {
            const engine = engineRef.current;
            if (engine) {
              void (async () => {
                const [cols, fks] = await Promise.all([
                  engine.listColumns(name),
                  engine.listForeignKeys(name),
                ]);
                setColumnsByEntity((p) => ({ ...p, [name]: cols }));
                setFksByEntity((p) => ({ ...p, [name]: fks }));
              })();
            }
          }
        }
        return next;
      });
    },
    [columnsByEntity],
  );

  // ─── Preview table ────────────────────────────────────────────────
  const previewTable = useCallback(
    (name: string, kind: "table" | "view") => {
      const sql = `SELECT * FROM ${adapter.quoteIdent(name)};`;
      const newTab: SqlShellTab = {
        id: createSqlShellTabId(),
        title: name,
        code: sql,
        pristineCode: sql,
      };
      setShellState((prev) => {
        const next = persistState({
          tabs: [...prev.tabs, newTab],
          activeTabId: newTab.id,
        });
        return next;
      });
      activeTabIdRef.current = newTab.id;
      const view = editorRef.current;
      if (view) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: sql },
        });
      }
      runSql(sql, newTab.id, `${kind === "table" ? "Table" : "View"}: ${name}`);
    },
    [adapter, persistState, runSql],
  );

  // ─── Open tab and run ─────────────────────────────────────────────
  const openTabAndRun = useCallback(
    (title: string, sql: string) => {
      const newTab: SqlShellTab = {
        id: createSqlShellTabId(),
        title,
        code: sql,
        pristineCode: sql,
      };
      setShellState((prev) => persistState({ tabs: [...prev.tabs, newTab], activeTabId: newTab.id }));
      activeTabIdRef.current = newTab.id;
      const view = editorRef.current;
      if (view) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: sql },
        });
      }
      runSql(sql, newTab.id, title);
    },
    [persistState, runSql],
  );

  // ─── Sample switch ────────────────────────────────────────────────
  const handleSampleSelect = useCallback(
    (value: string | null) => {
      if (!value || value === activeSampleId) return;
      // Persist current tab state before leaving.
      saveSqlShellState(storage, adapter.storagePrefix, activeSampleId, shellStateRef.current);
      setResultsByTab({});
      setActiveSampleId(value);
    },
    [activeSampleId, adapter.storagePrefix, storage],
  );

  // ─── Render ───────────────────────────────────────────────────────
  const isDark = !LIGHT_THEMES.has(editorTheme);

  const playgroundId = adapter.dialect === "postgres" ? "postgres" : adapter.dialect === "duckdb" ? "duckdb" : "sqlite";

  return (
    <div className="pg-app" style={{ fontSize }}>
      {/* ─── Top navigation bar ─── */}
      <header className="pg-header">
        <div className="logo">
          <Link href="/" aria-label="Dataslope home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/dataslope-logo-blue.svg" alt="Dataslope logo" className="brand-logo" />
          </Link>
          <Link href="/" className="brand-name">Dataslope</Link>
          <Select.Root
            value={playgroundId}
            onValueChange={(value) => {
              if (!value) return;
              const next = PLAYGROUNDS.find((p) => p.id === value);
              if (next && next.id !== playgroundId) router.push(next.href);
            }}
          >
            <Select.Trigger className="playground-switcher" aria-label="Switch playground">
              {(() => {
                const Icon = PLAYGROUND_ICONS[playgroundId];
                const factor = PLAYGROUND_ICON_SIZE_FACTOR[playgroundId] ?? 1;
                return Icon ? (
                  <span className="playground-switcher-lang-icon" style={{ color: "var(--text)" }} aria-hidden="true">
                    <Icon size={Math.round(16 * factor)} />
                  </span>
                ) : null;
              })()}
              <Select.Value />
              <Select.Icon className="playground-switcher-icon">
                <svg viewBox="0 0 12 12" width={10} height={10}>
                  <polyline points="2,4 6,8 10,4" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner className="pg-lang-switcher-positioner" sideOffset={6} alignItemWithTrigger={false}>
                <Select.Popup className="bui-select-popup pg-lang-switcher-popup">
                  {PLAYGROUNDS.map((p) => {
                    const Icon = PLAYGROUND_ICONS[p.id];
                    const factor = PLAYGROUND_ICON_SIZE_FACTOR[p.id] ?? 1;
                    return (
                      <Select.Item key={p.id} value={p.id} className="bui-select-item">
                        {Icon && (
                          <span className="bui-select-item-icon" aria-hidden="true">
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
        <div className="header-actions">
          <button
            type="button"
            className="header-btn"
            title="Settings"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 size={14} aria-hidden="true" />
            <span className="btn-label">Settings</span>
          </button>
        </div>
      </header>

      {/* ─── Settings panel ─── */}
      <SettingsPanel
        open={settingsOpen}
        fontSize={fontSize}
        setFontSize={setFontSize}
        outputFontSizeEnabled={false}
        setOutputFontSizeEnabled={() => undefined}
        outputFontSize={DEFAULT_PLAYGROUND_SETTINGS.fontSize}
        setOutputFontSize={() => undefined}
        showOutputFontSizeControls={false}
        editorTheme={editorTheme}
        setEditorTheme={handleSetEditorTheme}
        wordWrap={wordWrap}
        setWordWrap={setWordWrap}
        clearBeforeRun={clearBeforeRun}
        setClearBeforeRun={setClearBeforeRun}
        showClearBeforeRunRow={false}
        language={playgroundId}
        onClose={() => setSettingsOpen(false)}
        onRestoreDefaults={handleRestoreDefaults}
        onClearLocalStorage={() => {
          try { localStorage.clear(); } catch { /* ignore */ }
        }}
      />

    <div
      className="sql-shell"
      aria-label={`${adapter.displayName} SQL playground`}
    >
      {/* Sidebar */}
      <aside className="sql-sidebar">
        <div className="sql-db-selector-wrap">
          <div className="sql-db-selector-row">
            <Select.Root value={activeSampleId} onValueChange={handleSampleSelect}>
              <Select.Trigger className="sql-db-selector" aria-label="Select database">
                <Database size={13} aria-hidden="true" className="sql-db-selector-icon" />
                <Select.Value className="sql-db-selector-value">
                  {activeSample.filename || activeSample.label}
                </Select.Value>
                <Select.Icon className="playground-switcher-icon">
                  <svg viewBox="0 0 12 12" width={10} height={10}>
                    <polyline points="2,4 6,8 10,4" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner className="sql-db-positioner" sideOffset={6} alignItemWithTrigger={false}>
                  <Select.Popup className="bui-select-popup sql-db-popup">
                    <div className="sql-db-popup-group-label">Sample databases</div>
                    {samples.map((s) => (
                      <Select.Item key={s.id} value={s.id} className="bui-select-item sql-db-item">
                        <span className="bui-select-item-icon" aria-hidden="true">
                          <Database size={14} />
                        </span>
                        <span className="sql-db-item-text">
                          <Select.ItemText>{s.filename || s.label}</Select.ItemText>
                          {s.description && (
                            <span className="sql-db-item-desc">{s.description}</span>
                          )}
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
          {!loaded && (
            <div className="sql-tree-loading-overlay" aria-live="polite">
              <span className="sql-tree-loading-label">{loadingMessage}</span>
            </div>
          )}
          <SchemaSection
            label="Tables"
            count={tables.length}
            expanded={tablesSectionExpanded}
            onToggle={() => setTablesSectionExpanded((v) => !v)}
            emptyMessage="No tables."
          >
            {tables.map((name) => (
              <SchemaEntityRow
                key={name}
                name={name}
                kind="table"
                expanded={expandedEntities.has(name)}
                columns={columnsByEntity[name]}
                foreignKeys={fksByEntity[name]}
                onToggle={() => handleToggleEntity(name)}
                onPreview={previewTable}
              />
            ))}
          </SchemaSection>
          <SchemaSection
            label="Views"
            count={views.length}
            expanded={viewsSectionExpanded}
            onToggle={() => setViewsSectionExpanded((v) => !v)}
            emptyMessage="No views."
          >
            {views.map((name) => (
              <SchemaEntityRow
                key={name}
                name={name}
                kind="view"
                expanded={expandedEntities.has(name)}
                columns={columnsByEntity[name]}
                foreignKeys={fksByEntity[name]}
                onToggle={() => handleToggleEntity(name)}
                onPreview={previewTable}
              />
            ))}
          </SchemaSection>
        </div>

        {adapter.extraSettingsItems && (
          <div className="sql-sidebar-footer">
            {adapter.extraSettingsItems}
          </div>
        )}
      </aside>

      <div className="sql-sidebar-resizer" role="separator" aria-orientation="vertical" aria-label="Drag to resize" />

      {/* Main panes */}
      <div className="sql-panes">
        {/* Tab bar */}
        <div className="sql-tabbar">
          <div className="sql-tabs" role="tablist">
            {shellState.tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={tab.id === shellState.activeTabId}
                className={`sql-tab${tab.id === shellState.activeTabId ? " sql-tab--active" : ""}`}
                onClick={() => handleActivateTab(tab.id)}
              >
                <span className="sql-tab-title">{tab.title}</span>
                {shellState.tabs.length > 1 && (
                  <span
                    className="sql-tab-close"
                    role="button"
                    aria-label={`Close ${tab.title}`}
                    onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id); }}
                  >
                    ×
                  </span>
                )}
              </button>
            ))}
            <button
              type="button"
              className="sql-tab-add"
              onClick={handleAddTab}
              aria-label="Add query tab"
              title="Add query tab"
            >
              +
            </button>
          </div>

          {/* Toolbar */}
          <div className="sql-toolbar">
            <div className="sql-toolbar-hint">
              <kbd className="kbd">{isMac ? "⌘" : "Ctrl"}</kbd>
              <span className="kbd-plus" aria-hidden="true">+</span>
              <kbd className="kbd">Enter</kbd>
            </div>
            <div className="sql-toolbar-actions">
              <SqlRunControls
                statusState={status}
                hasSelection={hasSelection}
                loaded={loaded}
                isMac={isMac}
                onRun={runActiveTab}
                onRunSelection={() => {
                  const view = editorRef.current;
                  if (!view) return;
                  const sel = view.state.selection.main;
                  if (sel.empty) return;
                  runSelection(view.state.sliceDoc(sel.from, sel.to));
                }}
              />
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="sql-editor-pane">
          <div className="sql-editor-wrap" ref={editorHostRef} />
        </div>

        <div className="sql-resizer" role="separator" aria-orientation="horizontal" aria-label="Drag to resize editor and results" />

        {/* Results */}
        <div className="sql-results-pane">
          <div className="sql-results-body">
            <ResultView
              result={result}
              loading={!loaded}
              loadingLabel={`Loading ${adapter.displayName} engine…`}
              globalPageSize={globalPageSize}
              onSetGlobalPageSize={setGlobalPageSize}
              onLoadPage={(sql, page, explicitPageSize) => {
                const id = activeTabIdRef.current;
                const tab = shellStateRef.current.tabs.find((t) => t.id === id);
                if (!tab) return;
                runSql(sql, tab.id, tab.title);
              }}
              onOpenQueryTab={openTabAndRun}
            />
          </div>
          <DataslopeRunOverlay running={status === "running"} />
        </div>
      </div>
    </div>
    </div>
  );
}

export function SqlPlaygroundShell(props: SqlPlaygroundShellProps) {
  return (
    <Toast.Provider timeout={2400}>
      <SqlPlaygroundShellInner {...props} />
      <Toast.Portal>
        <Toast.Viewport className="toast-viewport">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
