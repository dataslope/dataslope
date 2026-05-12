"use client";

import { useCallback } from "react";
import { startTransition } from "react";
import { Toast } from "@base-ui-components/react/toast";
import type { EditorView } from "@codemirror/view";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { QueryTab } from "../../sqlitePlaygroundTabs";
import { newTabId, saveTabs } from "../../sqlitePlaygroundTabs";
import { findSampleDatabase } from "../../runtime/sqliteSamples";
import { replaceDoc } from "../utils/editorUtils";
import { pickFallbackTab, pushTabHistory } from "../utils/tabUtils";
import { useEngineStore } from "../stores/useEngineStore";
import { useTabStore } from "../stores/useTabStore";
import { useDialogStore } from "../stores/useDialogStore";

export interface TabManagementRefs {
  editorRef: React.MutableRefObject<EditorView | null>;
  tabsRef: React.MutableRefObject<QueryTab[]>;
  activeTabIdRef: React.MutableRefObject<string>;
  activeDbIdRef: React.MutableRefObject<string>;
  /** MRU history stack (oldest → most-recent), never includes the current tab. */
  tabHistoryRef: React.MutableRefObject<string[]>;
}

export function useTabManagement(
  refs: TabManagementRefs,
  refreshTableMetadata: () => void,
) {
  const { editorRef, tabsRef, activeTabIdRef, activeDbIdRef, tabHistoryRef } = refs;

  const toastManager = Toast.useToastManager();
  const showToast = useCallback(
    (msg: string, kind: "info" | "warn" = "info") => {
      startTransition(() => {
        toastManager.add({ title: msg, data: { kind } });
      });
    },
    [toastManager],
  );

  const setTabs = useTabStore((s) => s.setTabs);
  const setActiveTabId = useTabStore((s) => s.setActiveTabId);
  const setResultsByTab = useTabStore((s) => s.setResultsByTab);
  const activeDbId = useEngineStore((s) => s.activeDbId);
  const customDb = useEngineStore((s) => s.customDb);
  const setConfirmCloseTabId = useDialogStore((s) => s.setConfirmCloseTabId);
  const confirmCloseTabId = useDialogStore((s) => s.confirmCloseTabId);

  const addTab = useCallback(() => {
    const nextNum = tabsRef.current.length + 1;
    const initialCode = "";
    const tab: QueryTab = {
      id: newTabId(),
      title: `Query ${nextNum}`,
      code: initialCode,
      pristineCode: initialCode,
    };
    const next = [...tabsRef.current, tab];
    tabsRef.current = next;
    setTabs(next);
    saveTabs(activeDbIdRef.current, next);
    tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, activeTabIdRef.current, tab.id);
    activeTabIdRef.current = tab.id;
    setActiveTabId(tab.id);
    window.setTimeout(() => editorRef.current?.focus(), 0);
  }, [tabsRef, activeDbIdRef, activeTabIdRef, tabHistoryRef, editorRef, setTabs, setActiveTabId]);

  const openErDiagramTab = useCallback(() => {
    refreshTableMetadata();
    const currentTabs = tabsRef.current;
    const currentActiveTabId = activeTabIdRef.current;
    const currentActiveDbId = activeDbIdRef.current;
    const existing = currentTabs.find((t) => t.kind === "er-diagram");
    if (existing) {
      if (existing.id === currentActiveTabId) {
        const next = currentTabs.filter((t) => t.id !== existing.id);
        const finalTabs =
          next.length > 0
            ? next
            : [{ id: newTabId(), title: "Query 1", code: "", pristineCode: "" }];
        tabsRef.current = finalTabs;
        setTabs(finalTabs);
        saveTabs(currentActiveDbId, finalTabs);
        activeTabIdRef.current = finalTabs[0].id;
        setActiveTabId(finalTabs[0].id);
        return;
      }
      tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, currentActiveTabId, existing.id);
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
    const next = [...currentTabs, tab];
    tabsRef.current = next;
    setTabs(next);
    saveTabs(currentActiveDbId, next);
    tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, currentActiveTabId, tab.id);
    activeTabIdRef.current = tab.id;
    setActiveTabId(tab.id);
  }, [refreshTableMetadata, tabsRef, activeTabIdRef, activeDbIdRef, tabHistoryRef, setTabs, setActiveTabId]);

  const openQueryHistoryTab = useCallback(() => {
    const currentTabs = tabsRef.current;
    const currentActiveTabId = activeTabIdRef.current;
    const currentActiveDbId = activeDbIdRef.current;
    const existing = currentTabs.find((t) => t.kind === "query-history");
    if (existing) {
      if (existing.id === currentActiveTabId) {
        // Clicking while already active: close it.
        const next = currentTabs.filter((t) => t.id !== existing.id);
        const finalTabs =
          next.length > 0
            ? next
            : [{ id: newTabId(), title: "Query 1", code: "", pristineCode: "" }];
        tabsRef.current = finalTabs;
        setTabs(finalTabs);
        saveTabs(currentActiveDbId, finalTabs);
        activeTabIdRef.current = finalTabs[0].id;
        setActiveTabId(finalTabs[0].id);
        return;
      }
      tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, currentActiveTabId, existing.id);
      activeTabIdRef.current = existing.id;
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
    const next = [...currentTabs, tab];
    tabsRef.current = next;
    setTabs(next);
    saveTabs(currentActiveDbId, next);
    tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, currentActiveTabId, tab.id);
    activeTabIdRef.current = tab.id;
    setActiveTabId(tab.id);
  }, [tabsRef, activeTabIdRef, activeDbIdRef, tabHistoryRef, setTabs, setActiveTabId]);

  const closeTab = useCallback(
    (id: string) => {
      const currentTabs = tabsRef.current;
      const target = currentTabs.find((t) => t.id === id);
      if (!target) return;
      const isDirty = target.code !== target.pristineCode;
      if (isDirty && currentTabs.length > 1) {
        setConfirmCloseTabId(id);
        return;
      }
      const next = currentTabs.filter((t) => t.id !== id);
      const finalTabs =
        next.length > 0
          ? next
          : [{ id: newTabId(), title: "Query 1", code: "", pristineCode: "" }];
      tabsRef.current = finalTabs;
      setTabs(finalTabs);
      saveTabs(activeDbIdRef.current, finalTabs);
      // Prune closed tab from history before selecting fallback.
      tabHistoryRef.current = tabHistoryRef.current.filter((hid) => hid !== id);
      if (activeTabIdRef.current === id) {
        const fallback = pickFallbackTab(finalTabs, id, currentTabs, tabHistoryRef.current);
        activeTabIdRef.current = fallback.id;
        setActiveTabId(fallback.id);
      }
    },
    [tabsRef, activeTabIdRef, activeDbIdRef, tabHistoryRef, setTabs, setActiveTabId, setConfirmCloseTabId],
  );

  const confirmCloseTab = useCallback(() => {
    const id = confirmCloseTabId;
    if (!id) return;
    setConfirmCloseTabId(null);
    const currentTabs = tabsRef.current;
    const next = currentTabs.filter((t) => t.id !== id);
    const finalTabs =
      next.length > 0
        ? next
        : [{ id: newTabId(), title: "Query 1", code: "", pristineCode: "" }];
    tabsRef.current = finalTabs;
    setTabs(finalTabs);
    saveTabs(activeDbIdRef.current, finalTabs);
    // Prune closed tab from history before selecting fallback.
    tabHistoryRef.current = tabHistoryRef.current.filter((hid) => hid !== id);
    if (activeTabIdRef.current === id) {
      const fallback = pickFallbackTab(finalTabs, id, currentTabs, tabHistoryRef.current);
      activeTabIdRef.current = fallback.id;
      setActiveTabId(fallback.id);
    }
  }, [confirmCloseTabId, tabsRef, activeTabIdRef, activeDbIdRef, tabHistoryRef, setTabs, setActiveTabId, setConfirmCloseTabId]);

  const renameTab = useCallback(
    (id: string, newTitle: string) => {
      const trimmed = newTitle.trim();
      if (!trimmed) return;
      const next = tabsRef.current.map((t) =>
        t.id === id ? { ...t, title: trimmed } : t,
      );
      tabsRef.current = next;
      setTabs(next);
      saveTabs(activeDbIdRef.current, next);
    },
    [tabsRef, activeDbIdRef, setTabs],
  );

  const duplicateTab = useCallback(
    (id: string) => {
      const currentTabs = tabsRef.current;
      const idx = currentTabs.findIndex((t) => t.id === id);
      if (idx < 0) return;
      const source = currentTabs[idx];
      const copy: QueryTab = {
        ...source,
        id: newTabId(),
        title: `${source.title} Copy`,
        pristineCode: source.code,
      };
      const next = [...currentTabs.slice(0, idx + 1), copy, ...currentTabs.slice(idx + 1)];
      tabsRef.current = next;
      setTabs(next);
      saveTabs(activeDbIdRef.current, next);
      tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, activeTabIdRef.current, copy.id);
      activeTabIdRef.current = copy.id;
      setActiveTabId(copy.id);
    },
    [tabsRef, activeDbIdRef, activeTabIdRef, tabHistoryRef, setTabs, setActiveTabId],
  );

  const closeOtherTabs = useCallback(
    (id: string) => {
      const target = tabsRef.current.find((t) => t.id === id);
      if (!target) return;
      const next = [target];
      tabsRef.current = next;
      setTabs(next);
      saveTabs(activeDbIdRef.current, next);
      tabHistoryRef.current = [];
      activeTabIdRef.current = target.id;
      setActiveTabId(target.id);
    },
    [tabsRef, activeDbIdRef, activeTabIdRef, tabHistoryRef, setTabs, setActiveTabId],
  );

  const closeAllTabs = useCallback(() => {
    const fresh = [
      { id: newTabId(), title: "Query 1", code: "", pristineCode: "" },
    ];
    tabsRef.current = fresh;
    activeTabIdRef.current = fresh[0].id;
    tabHistoryRef.current = [];
    setTabs(fresh);
    saveTabs(activeDbIdRef.current, fresh);
    setActiveTabId(fresh[0].id);
    setResultsByTab({});
    const view = editorRef.current;
    if (view) replaceDoc(view, "");
    window.setTimeout(() => editorRef.current?.focus(), 0);
  }, [tabsRef, activeTabIdRef, activeDbIdRef, tabHistoryRef, editorRef, setTabs, setActiveTabId, setResultsByTab]);

  const handleTabDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      activeTabIdRef.current = id;
      setActiveTabId(id);
    },
    [activeTabIdRef, setActiveTabId],
  );

  const handleTabDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const currentTabs = tabsRef.current;
      const oldIndex = currentTabs.findIndex((t) => t.id === active.id);
      const newIndex = currentTabs.findIndex((t) => t.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const next = arrayMove(currentTabs, oldIndex, newIndex);
      tabsRef.current = next;
      setTabs(next);
      saveTabs(activeDbIdRef.current, next);
    },
    [tabsRef, activeDbIdRef, setTabs],
  );

  const resetTabsForCurrentDb = useCallback(() => {
    const sample =
      customDb?.id === activeDbId ? customDb : findSampleDatabase(activeDbId);
    const fresh = sample.defaultTabs.map((seed) => ({
      ...seed,
      id: newTabId(),
      pristineCode: seed.code,
    }));
    tabsRef.current = fresh;
    activeTabIdRef.current = fresh[0].id;
    tabHistoryRef.current = [];
    setTabs(fresh);
    saveTabs(activeDbId, fresh);
    setActiveTabId(fresh[0].id);
    setResultsByTab({});
    const view = editorRef.current;
    if (view) replaceDoc(view, fresh[0].code);
    showToast("Query tabs reset to defaults.");
  }, [
    activeDbId,
    customDb,
    tabsRef,
    activeTabIdRef,
    tabHistoryRef,
    editorRef,
    setTabs,
    setActiveTabId,
    setResultsByTab,
    showToast,
  ]);

  return {
    addTab,
    openErDiagramTab,
    openQueryHistoryTab,
    closeTab,
    confirmCloseTab,
    renameTab,
    duplicateTab,
    closeOtherTabs,
    closeAllTabs,
    handleTabDragStart,
    handleTabDragEnd,
    resetTabsForCurrentDb,
  };
}
