"use client";

/**
 * Thin wrapper adapting the SQL playgrounds' `QueryTab` model into
 * `TabDescriptor`s: SQL-specific concerns (kind icons, tab variants,
 * context-menu entries) live here; layout, drag-and-drop, rename and
 * tooltips are delegated to the shared TabBar.
 */

import React, { useEffect, useMemo, useState } from "react";
import { History, Network, Table } from "lucide-react";
import type { QueryTab } from "../../sqlitePlaygroundTabs";
import { TabBar } from "../../tabs/TabBar";
import type { TabContextMenuItem, TabDescriptor } from "../../tabs/tabTypes";

export interface SqlTabBarProps {
  tabs: QueryTab[];
  activeTabId: string;
  onTabActivate: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabRename: (tabId: string, title: string) => void;
  onTabDuplicate: (tabId: string) => void;
  onTabCloseOthers: (tabId: string) => void;
  onTabCloseAll: () => void;
  /** Called with the new tab order after a drag-and-drop reorder. */
  onReorderTabs: (next: QueryTab[]) => void;
  onAddTab: () => void;
  /** Additional non-`QueryTab` descriptors appended to the tab strip
   *  (e.g. the inline Settings tab). */
  extraTabs?: TabDescriptor[];
  /** Called when an `extraTabs` descriptor is closed. */
  onExtraTabClose?: (tabId: string) => void;
}

export function SqlTabBar({
  tabs,
  activeTabId,
  onTabActivate,
  onTabClose,
  onTabRename,
  onTabDuplicate,
  onTabCloseOthers,
  onTabCloseAll,
  onReorderTabs,
  onAddTab,
  extraTabs,
  onExtraTabClose,
}: SqlTabBarProps) {
  // Where the settings (extra) tab sits in the descriptor list, so it can be
  // dragged among the query tabs. Infinity = append at the end.
  const [settingsIdx, setSettingsIdx] = useState<number>(Infinity);

  // Reset to the end when the settings tab is removed.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset synced to the extraTabs prop
    if (!extraTabs || extraTabs.length === 0) setSettingsIdx(Infinity);
  }, [extraTabs]);

  const descriptors = useMemo<TabDescriptor[]>(
    () => {
      const queryDescriptors = tabs.map<TabDescriptor>((tab) => {
        // ER-diagram, view-data, and query-history tabs are transient, so
        // duplicate and rename don't make sense there.
        const isViewData = tab.kind === "view-data";
        const isErDiagram = tab.kind === "er-diagram";
        const isQueryHistory = tab.kind === "query-history";
        const renameable = !(isViewData || isErDiagram || isQueryHistory);
        const duplicatable = !(isErDiagram || isQueryHistory);

        const extras: TabContextMenuItem[] = [];
        if (duplicatable) {
          extras.push({
            key: "duplicate",
            label: "Duplicate",
            onSelect: () => onTabDuplicate(tab.id),
          });
        }
        extras.push({
          key: "close-others",
          label: "Close Others",
          onSelect: () => onTabCloseOthers(tab.id),
        });
        extras.push({
          key: "close-all",
          label: "Close All",
          onSelect: () => onTabCloseAll(),
        });

        let icon: React.ReactNode | undefined;
        if (isViewData) {
          icon = <Table size={11} aria-hidden="true" />;
        } else if (isErDiagram) {
          icon = <Network size={11} aria-hidden="true" />;
        } else if (isQueryHistory) {
          icon = <History size={11} aria-hidden="true" />;
        }

        return {
          id: tab.id,
          kind: tab.kind ?? "code",
          label: tab.title,
          icon,
          closeable: true,
          renameable,
          renameDialogTitle: "Rename query tab",
          renameDialogDescription: "Choose a short name for this query tab.",
          contextMenuItems: extras,
        };
      });

      // Insert the settings (extra) tab at its tracked position.
      const settingsTab = extraTabs && extraTabs.length > 0 ? extraTabs[0] : null;
      if (!settingsTab) return queryDescriptors;

      const insertAt = Math.min(
        Number.isFinite(settingsIdx) ? settingsIdx : queryDescriptors.length,
        queryDescriptors.length,
      );
      const result = [...queryDescriptors];
      result.splice(insertAt, 0, settingsTab);
      return result;
    },
    [tabs, onTabDuplicate, onTabCloseOthers, onTabCloseAll, extraTabs, settingsIdx],
  );

  return (
    <TabBar
      className="sql-tabbar"
      tabs={descriptors}
      activeTabId={activeTabId}
      onSelectTab={onTabActivate}
      onCloseTab={(tabId) => {
        // Route to the QueryTab handler; non-QueryTab entries (Settings)
        // fall through to `onExtraTabClose`.
        const isQueryTab = tabs.some((t) => t.id === tabId);
        if (isQueryTab) onTabClose(tabId);
        else onExtraTabClose?.(tabId);
      }}
      onRenameTab={onTabRename}
      onReorderTabs={(next) => {
        // Track where the settings tab landed so it stays put after the drop.
        const settingsTab = extraTabs?.[0];
        if (settingsTab) {
          const newIdx = next.findIndex((d) => d.id === settingsTab.id);
          if (newIdx >= 0) setSettingsIdx(newIdx);
        }

        // Project the descriptor order back onto QueryTab[] via id lookup;
        // non-QueryTab extras are skipped so reordering only affects the
        // persisted tab list.
        const byId = new Map(tabs.map((t) => [t.id, t]));
        const reordered: QueryTab[] = [];
        for (const d of next) {
          const t = byId.get(d.id);
          if (t) reordered.push(t);
        }
        if (reordered.length === tabs.length) onReorderTabs(reordered);
      }}
      onAddTab={onAddTab}
    />
  );
}
