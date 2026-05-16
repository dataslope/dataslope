"use client";

import { useCallback } from "react";
import { flushSync } from "react-dom";
import type { EditorView } from "@codemirror/view";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { QueryTab } from "../../sqlitePlaygroundTabs";
import { newTabId } from "../../sqlitePlaygroundTabs";
import type { QueryRunResult } from "../types";
import { pickFallbackTab, pushTabHistory } from "../utils/tabUtils";

/**
 * Tab-management hook shared by Postgres and DuckDB playgrounds.
 *
 * Implements the identical addTab / closeTab / openTabAndRun /
 * handleTabDrag* / resetTabsForCurrentDb / openErDiagramTab /
 * openQueryHistoryTab logic from both playgrounds.
 *
 * The hook stays free of save-strategy knowledge: callers pass in
 * `persistTabs` (sync for Postgres, debounced for DuckDB) and
 * `saveTabsImmediate` (used by `addTab`, which the existing
 * playgrounds save synchronously even when persistTabs is debounced).
 *
 * SQLite has its own equivalent in `useTabManagement.ts` because it
 * predates this shared hook and is wired to Zustand stores instead
 * of plain React state setters.
 */
export interface SqlTabManagementOptions {
  /** Ref tracking the latest tabs array (kept in sync by the caller). */
  tabsRef: React.MutableRefObject<QueryTab[]>;
  /** Ref tracking the active tab id (kept in sync by the caller). */
  activeTabIdRef: React.MutableRefObject<string>;
  /** Ref tracking the active database id (kept in sync by the caller). */
  activeDbIdRef: React.MutableRefObject<string>;
  /** MRU tab-history stack (oldest → most-recent). */
  tabHistoryRef: React.MutableRefObject<string[]>;
  /** CodeMirror editor view ref. */
  editorRef: React.MutableRefObject<EditorView | null>;

  /** React setter for the tab list. */
  setTabs: React.Dispatch<React.SetStateAction<QueryTab[]>>;
  /** React setter for the active tab id. */
  setActiveTabId: React.Dispatch<React.SetStateAction<string>>;
  /** React setter for the per-tab results map. */
  setResultsByTab: React.Dispatch<
    React.SetStateAction<Record<string, QueryRunResult | null>>
  >;
  /** React setter for the currently-dragging tab id. */
  setDraggingTabId: React.Dispatch<React.SetStateAction<string | null>>;

  /**
   * Persist tabs (and update tabsRef / setTabs). Postgres passes a
   * synchronous wrapper, DuckDB passes its 500 ms-debounced version.
   */
  persistTabs: (nextTabs: QueryTab[], dbId?: string) => void;
  /**
   * Direct synchronous saveTabs from `createTabStorage(prefix)`. Used
   * by `addTab` so a freshly created (empty) tab is on disk before
   * the next keystroke fires the debounced persist.
   */
  saveTabsImmediate: (dbId: string, tabs: QueryTab[]) => void;

  /** Resolve a sample database by id (dialect-specific). */
  findSampleDatabase: (id: string) => {
    label: string;
    defaultTabs: { title: string; code: string }[];
  };

  /** Toast helper. */
  showToast: (msg: string, kind?: "info" | "warn") => void;

  /** Run SQL in a specific tab (used by openTabAndRun). */
  runSqlForTab: (tabId: string, sql: string, source: string) => Promise<void>;
}

export function useSqlTabManagement(options: SqlTabManagementOptions) {
  const {
    tabsRef,
    activeTabIdRef,
    activeDbIdRef,
    tabHistoryRef,
    editorRef,
    setTabs,
    setActiveTabId,
    setResultsByTab,
    setDraggingTabId,
    persistTabs,
    saveTabsImmediate,
    findSampleDatabase,
    showToast,
    runSqlForTab,
  } = options;

  const addTab = useCallback(() => {
    const tab: QueryTab = {
      id: newTabId(),
      title: `Query ${tabsRef.current.length + 1}`,
      code: "",
      pristineCode: "",
    };
    tabHistoryRef.current = pushTabHistory(
      tabHistoryRef.current,
      activeTabIdRef.current,
      tab.id,
    );
    const next = [...tabsRef.current, tab];
    tabsRef.current = next;
    activeTabIdRef.current = tab.id;
    flushSync(() => {
      setTabs(next);
      setActiveTabId(tab.id);
    });
    editorRef.current?.focus();
    saveTabsImmediate(activeDbIdRef.current, next);
  }, [
    tabsRef,
    activeTabIdRef,
    activeDbIdRef,
    tabHistoryRef,
    editorRef,
    setTabs,
    setActiveTabId,
    saveTabsImmediate,
  ]);

  const openTabAndRun = useCallback(
    (title: string, sql: string) => {
      const tab: QueryTab = {
        id: newTabId(),
        title,
        code: sql,
        pristineCode: sql,
      };
      tabHistoryRef.current = pushTabHistory(
        tabHistoryRef.current,
        activeTabIdRef.current,
        tab.id,
      );
      persistTabs([...tabsRef.current, tab]);
      setActiveTabId(tab.id);
      void runSqlForTab(tab.id, sql, title);
    },
    [
      tabsRef,
      activeTabIdRef,
      tabHistoryRef,
      persistTabs,
      setActiveTabId,
      runSqlForTab,
    ],
  );

  const closeTab = useCallback(
    (id: string) => {
      const currentTabs = tabsRef.current;
      const next = currentTabs.filter((tab) => tab.id !== id);
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
      // Prune closed tab from history before selecting fallback.
      tabHistoryRef.current = tabHistoryRef.current.filter(
        (hid) => hid !== id,
      );
      if (activeTabIdRef.current === id) {
        const fallback = pickFallbackTab(
          finalTabs,
          id,
          currentTabs,
          tabHistoryRef.current,
        );
        setActiveTabId(fallback.id);
      }
      setResultsByTab((prev) => {
        const { [id]: _deleted, ...rest } = prev;
        void _deleted;
        return rest;
      });
    },
    [
      tabsRef,
      activeTabIdRef,
      tabHistoryRef,
      persistTabs,
      setActiveTabId,
      setResultsByTab,
    ],
  );

  const resetTabsForCurrentDb = useCallback(() => {
    const sample = findSampleDatabase(activeDbIdRef.current);
    const fresh = sample.defaultTabs.map((seed) => ({
      ...seed,
      id: newTabId(),
      pristineCode: seed.code,
    }));
    tabHistoryRef.current = [];
    persistTabs(fresh);
    setActiveTabId(fresh[0]?.id ?? "");
    setResultsByTab({});
    showToast(`Reset query tabs for ${sample.label}.`);
  }, [
    activeDbIdRef,
    tabHistoryRef,
    findSampleDatabase,
    persistTabs,
    setActiveTabId,
    setResultsByTab,
    showToast,
  ]);

  const handleTabDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      setDraggingTabId(id);
      setActiveTabId(id);
    },
    [setDraggingTabId, setActiveTabId],
  );

  const handleTabDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingTabId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const current = tabsRef.current;
      const oldIndex = current.findIndex((t) => t.id === active.id);
      const newIndex = current.findIndex((t) => t.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      persistTabs(arrayMove(current, oldIndex, newIndex));
    },
    [tabsRef, persistTabs, setDraggingTabId],
  );

  const handleTabDragCancel = useCallback(() => {
    setDraggingTabId(null);
  }, [setDraggingTabId]);

  const openSpecialTab = useCallback(
    (kind: "er-diagram" | "query-history", title: string) => {
      const currentTabs = tabsRef.current;
      const currentActiveTabId = activeTabIdRef.current;
      const existing = currentTabs.find((tab) => tab.kind === kind);
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
        tabHistoryRef.current = pushTabHistory(
          tabHistoryRef.current,
          currentActiveTabId,
          existing.id,
        );
        setActiveTabId(existing.id);
        return;
      }
      const tab: QueryTab = {
        id: newTabId(),
        title,
        code: "",
        pristineCode: "",
        kind,
      };
      tabHistoryRef.current = pushTabHistory(
        tabHistoryRef.current,
        currentActiveTabId,
        tab.id,
      );
      persistTabs([...currentTabs, tab]);
      setActiveTabId(tab.id);
    },
    [tabsRef, activeTabIdRef, tabHistoryRef, persistTabs, setActiveTabId],
  );

  const openErDiagramTab = useCallback(
    () => openSpecialTab("er-diagram", "ER Diagram"),
    [openSpecialTab],
  );

  const openQueryHistoryTab = useCallback(
    () => openSpecialTab("query-history", "Query History"),
    [openSpecialTab],
  );

  return {
    addTab,
    openTabAndRun,
    closeTab,
    resetTabsForCurrentDb,
    handleTabDragStart,
    handleTabDragEnd,
    handleTabDragCancel,
    openErDiagramTab,
    openQueryHistoryTab,
  };
}
