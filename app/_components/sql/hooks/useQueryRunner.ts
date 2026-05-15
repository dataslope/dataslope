"use client";

import { useCallback, useEffect, useRef } from "react";
import { startTransition } from "react";
import { Toast } from "@base-ui-components/react/toast";
import type { EditorView } from "@codemirror/view";
import type { QueryExecResult } from "sql.js";
import type { SqliteEngine } from "../../runtime/sqlite";
import type { QueryTab } from "../../sqlitePlaygroundTabs";
import {
  newTabId,
  saveTabs,
} from "../../sqlitePlaygroundTabs";
import { replaceDoc } from "../utils/editorUtils";
import {
  stripSqlComments,
  isSingleSelectSql,
  hasLimitClause,
} from "../utils/sqlAnalysis";
import {
  exportResultToCsv,
  exportResultToJson,
  exportResultToSql,
  exportResultToParquet,
  exportResultToXlsx,
  toFileSafeName,
} from "../utils/exportUtils";
import { useEngineStore } from "../stores/useEngineStore";
import { useTabStore } from "../stores/useTabStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import { useSqlPlaygroundStore } from "../stores/useSqlPlaygroundStore";
import type { ResultSetExportScope, QueryHistoryEntry } from "../types";

const INFINITE_SCROLL_PAGE_SIZE = 500;

export interface SqlPlaygroundRefs {
  engineRef: React.MutableRefObject<SqliteEngine | null>;
  editorRef: React.MutableRefObject<EditorView | null>;
  tabsRef: React.MutableRefObject<QueryTab[]>;
  activeTabIdRef: React.MutableRefObject<string>;
  activeDbIdRef: React.MutableRefObject<string>;
  addHistoryEntry: (entry: Omit<QueryHistoryEntry, "id">) => void;
}

export function useQueryRunner(refs: SqlPlaygroundRefs) {
  const { engineRef, editorRef, tabsRef, activeTabIdRef, activeDbIdRef, addHistoryEntry } = refs;

  const toastManager = Toast.useToastManager();
  const showToast = useCallback(
    (msg: string, kind: "info" | "warn" = "info") => {
      startTransition(() => {
        toastManager.add({ title: msg, data: { kind } });
      });
    },
    [toastManager],
  );

  const clearBeforeRun = useSettingsStore((s) => s.clearBeforeRun);
  const globalPageSize = useSqlPlaygroundStore((s) => s.globalPageSize);
  // Ref kept in sync so runSqlForTab can read synchronously without stale closures.
  const globalPageSizeRef = useRef(globalPageSize);
  useEffect(() => {
    globalPageSizeRef.current = globalPageSize;
  }, [globalPageSize]);

  const setStatusState = useEngineStore((s) => s.setStatusState);
  const setTables = useEngineStore((s) => s.setTables);
  const setViews = useEngineStore((s) => s.setViews);
  const setIndexes = useEngineStore((s) => s.setIndexes);
  const setTriggers = useEngineStore((s) => s.setTriggers);
  const setColumnsByEntity = useEngineStore((s) => s.setColumnsByEntity);
  const setForeignKeysByEntity = useEngineStore((s) => s.setForeignKeysByEntity);
  const setExpandedEntities = useEngineStore((s) => s.setExpandedEntities);

  const setResultForTab = useTabStore((s) => s.setResultForTab);
  const setResultsByTab = useTabStore((s) => s.setResultsByTab);
  const setTabs = useTabStore((s) => s.setTabs);
  const setActiveTabId = useTabStore((s) => s.setActiveTabId);

  const quoteIdent = useCallback(
    (name: string) => `"${name.replace(/"/g, '""')}"`,
    [],
  );

  const runSqlForTab = useCallback(
    (
      tabId: string,
      sql: string,
      source: string,
      sourceTable?: string,
      page = 0,
      baseSql?: string,
      explicitPageSize?: number,
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
      const currentPageSize =
        explicitPageSize !== undefined ? explicitPageSize : globalPageSizeRef.current;
      const noComments = stripSqlComments(trimmed);
      const useLazy =
        isSingleSelectSql(trimmed, noComments) && !hasLimitClause(noComments);
      const lazyPageSizeForRun =
        currentPageSize > 0 ? currentPageSize : INFINITE_SCROLL_PAGE_SIZE;
      void (async () => {
      try {
        let sets: (QueryExecResult | null)[];
        let lazySql: string | undefined;
        let lazyBaseSql: string | undefined;
        let lazyTotalCount: number | undefined;
        let lazyPage: number | undefined;
        let lazyPageSize: number | undefined;
        if (useLazy) {
          const { result: lazySets, totalCount } = await engine.execPaged(
            trimmed,
            lazyPageSizeForRun,
            page * lazyPageSizeForRun,
          );
          sets = lazySets;
          lazySql = trimmed.replace(/\s*;+\s*$/, "");
          lazyBaseSql = (baseSql ?? trimmed).replace(/\s*;+\s*$/, "");
          lazyTotalCount = totalCount;
          lazyPage = page;
          lazyPageSize = lazyPageSizeForRun;
        } else {
          sets = await engine.execAll(trimmed);
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
          lazyInfinite: currentPageSize === 0 && useLazy,
        });
        addHistoryEntry({
          sql: trimmed,
          source,
          executedAt: Date.now(),
          elapsedMs,
          success: true,
        });
        setStatusState("ready");
        const [newTables, newViews, newIndexes, newTriggers] = await Promise.all([
          engine.listTables(),
          engine.listViews(),
          engine.listIndexes(),
          engine.listTriggers(),
        ]);
        setTables(newTables);
        setViews(newViews);
        setIndexes(newIndexes);
        setTriggers(newTriggers);
        const newEntitySet = new Set([...newTables, ...newViews]);
        // Only purge column / FK data for entities that were actually
        // dropped. Clearing everything on every run causes all expanded
        // schema items to show "Loading…" and re-fetch their columns,
        // which produces a visible blink in the sidebar.
        setColumnsByEntity((prev) => {
          const dropped = Object.keys(prev).filter((n) => !newEntitySet.has(n));
          if (dropped.length === 0) return prev;
          const next = { ...prev };
          for (const d of dropped) delete next[d];
          return next;
        });
        setForeignKeysByEntity((prev) => {
          const dropped = Object.keys(prev).filter((n) => !newEntitySet.has(n));
          if (dropped.length === 0) return prev;
          const next = { ...prev };
          for (const d of dropped) delete next[d];
          return next;
        });
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
        addHistoryEntry({
          sql: trimmed,
          source,
          executedAt: Date.now(),
          elapsedMs,
          success: false,
          error: msg,
        });
        setStatusState("error");
        window.setTimeout(() => setStatusState("ready"), 3000);
      }
      })();
    },
    [
      clearBeforeRun,
      showToast,
      addHistoryEntry,
      setResultForTab,
      setStatusState,
      setTables,
      setViews,
      setIndexes,
      setTriggers,
      setColumnsByEntity,
      setForeignKeysByEntity,
      setExpandedEntities,
      setResultsByTab,
      engineRef,
    ],
  );

  const handleLoadPage = useCallback(
    (sql: string, page: number, explicitPageSize?: number) => {
      const tabId = activeTabIdRef.current;
      const curResult = useTabStore.getState().resultsByTab[tabId];
      runSqlForTab(
        tabId,
        sql,
        curResult?.source ?? sql,
        curResult?.sourceTable,
        page,
        curResult?.lazyBaseSql ?? curResult?.lazySql,
        explicitPageSize,
      );
    },
    [runSqlForTab, activeTabIdRef],
  );

  const handleLoadMorePage = useCallback(
    (sql: string, page: number) => {
      const engine = engineRef.current;
      if (!engine) return;
      const tabId = activeTabIdRef.current;
      const curResult = useTabStore.getState().resultsByTab[tabId];
      if (!curResult?.lazySql || !curResult.lazyInfinite) return;
      const pageSize = curResult.lazyPageSize ?? INFINITE_SCROLL_PAGE_SIZE;
      const offset = page * pageSize;
      const currentSet = curResult.sets[0];
      if (!currentSet || currentSet.values.length !== offset) return;
      void (async () => {
      try {
        const { result: nextSets, totalCount } = await engine.execPaged(
          sql,
          pageSize,
          offset,
        );
        const nextSet = nextSets[0];
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
              lazyTotalCount: totalCount,
            },
          };
        });
      } catch {
        // Keep the already-loaded rows visible if the next chunk fails.
      }
      })();
    },
    [activeTabIdRef, engineRef, setResultsByTab],
  );

  const handleFetchAllRows = useCallback(
    async (sql: string): Promise<QueryExecResult["values"]> => {
      const engine = engineRef.current;
      if (!engine) return [];
      try {
        const results = await engine.exec(sql);
        return results[0]?.values ?? [];
      } catch {
        return [];
      }
    },
    [engineRef],
  );

  const runActiveTab = useCallback(() => {
    const id = activeTabIdRef.current;
    const tab = tabsRef.current.find((t) => t.id === id);
    if (!tab) return;
    const code = editorRef.current?.state.doc.toString() ?? tab.code;
    runSqlForTab(tab.id, code, tab.title);
  }, [runSqlForTab, activeTabIdRef, tabsRef, editorRef]);

  const runSelection = useCallback(
    (sql: string) => {
      const id = activeTabIdRef.current;
      const tab = tabsRef.current.find((t) => t.id === id);
      if (!tab) return;
      runSqlForTab(tab.id, sql, tab.title);
    },
    [runSqlForTab, activeTabIdRef, tabsRef],
  );

  const runCurrentSelection = useCallback(() => {
    const view = editorRef.current;
    if (!view) return;
    const sel = view.state.selection.main;
    if (sel.empty) return;
    const selected = view.state.sliceDoc(sel.from, sel.to);
    runSelection(selected);
  }, [runSelection, editorRef]);

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
    [runSqlForTab, tabsRef, activeTabIdRef, activeDbIdRef, editorRef, setTabs, setActiveTabId],
  );

  const previewTable = useCallback(
    (name: string, kind: "table" | "view") => {
      const sql = `SELECT * FROM ${quoteIdent(name)};`;
      if (kind === "table") {
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
        openTabAndRun(name, sql, `View: ${name}`, undefined);
      }
    },
    [openTabAndRun, quoteIdent, runSqlForTab, tabsRef, activeTabIdRef, activeDbIdRef, editorRef, setTabs, setActiveTabId],
  );

  const handleResultSetExport = useCallback(
    (format: "csv" | "json" | "sql" | "parquet" | "xlsx", scope: ResultSetExportScope) => {
      void (async () => {
      const { resultsByTab, resultSetExportSnapshot, tabs, activeTabId } = useTabStore.getState();
      const result = activeTabId ? (resultsByTab[activeTabId] ?? null) : null;
      if (!result || result.sets.length === 0) return;
      const set =
        resultSetExportSnapshot
          ? (result.sets[resultSetExportSnapshot.setIndex] ?? result.sets.find((s) => s !== null))
          : result.sets.find((s) => s !== null);
      if (!set) return;
      const columns = resultSetExportSnapshot?.columns ?? set.columns;
      let rows: QueryExecResult["values"];
      if (scope === "page" && resultSetExportSnapshot) {
        rows = resultSetExportSnapshot.rows;
      } else if (
        result.lazySql !== undefined &&
        (resultSetExportSnapshot?.setIndex ?? 0) === 0
      ) {
        rows = await handleFetchAllRows(result.lazySql);
      } else if (resultSetExportSnapshot) {
        rows = resultSetExportSnapshot.allRows;
      } else {
        rows = set.values;
      }
      const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;
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
      })();
    },
    [handleFetchAllRows, showToast],
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
      void (async () => {
      try {
        const deleted = await engine.deleteRows(tableName, pkColumns, pkRows);
        showToast(
          `Deleted ${deleted} row${deleted === 1 ? "" : "s"} from "${tableName}".`,
        );
        const sql = `SELECT * FROM ${quoteIdent(tableName)};`;
        runSqlForTab(tabId, sql, `Table: ${tableName}`, tableName);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Delete failed: ${msg}`, "warn");
      }
      })();
    },
    [quoteIdent, runSqlForTab, showToast, engineRef, activeTabIdRef],
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
      void (async () => {
      try {
        const count = await engine.updateRows(tableName, updates);
        showToast(
          `Updated ${count} cell${count === 1 ? "" : "s"} in "${tableName}".`,
        );
        const sql = refetchSql
          ? `${refetchSql};`
          : `SELECT * FROM ${quoteIdent(tableName)};`;
        runSqlForTab(tabId, sql, `Table: ${tableName}`, tableName, 0, refetchBaseSql);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Update failed: ${msg}`, "warn");
      }
      })();
    },
    [quoteIdent, runSqlForTab, showToast, engineRef, activeTabIdRef],
  );

  const duplicateRowInTable = useCallback(
    (tableName: string, columnNames: string[], values: unknown[]) => {
      const engine = engineRef.current;
      if (!engine) return;
      const tabId = activeTabIdRef.current;
      void (async () => {
      try {
        await engine.insertRow(tableName, columnNames, values);
        showToast(`Duplicated row in "${tableName}".`);
        const sql = `SELECT * FROM ${quoteIdent(tableName)};`;
        runSqlForTab(tabId, sql, `Table: ${tableName}`, tableName);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Duplicate failed: ${msg}`, "warn");
      }
      })();
    },
    [quoteIdent, runSqlForTab, showToast, engineRef, activeTabIdRef],
  );

  return {
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
  };
}
