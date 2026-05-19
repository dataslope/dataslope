"use client";

/**
 * Thin wrapper around the generic playground `TabBar` that adapts the
 * SQL playgrounds' `QueryTab` model into `TabDescriptor`s. We keep
 * SQL-specific concerns (kind icons, the query-history / ER-diagram /
 * view-data tab variants, the Duplicate / Close Others / Close All
 * context-menu entries) here while delegating layout, drag-and-drop,
 * inline rename, and tooltip behaviour to the shared TabBar.
 *
 * Replaces the legacy stand-alone implementation in `SqlTab.tsx` +
 * `SqlTabBar.tsx`. See `agent-outputs/20260518-1306-...` plan item
 * "Refactor `SqlTabBar` onto the generic `TabBar`".
 */

import React, { useMemo } from "react";
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
}: SqlTabBarProps) {
  const descriptors = useMemo<TabDescriptor[]>(
    () =>
      tabs.map((tab) => {
        // ER-diagram, view-data, and query-history tabs are transient
        // — duplicate and rename don't make sense. SqlTab used to hide
        // these entries selectively; we mirror that via per-descriptor
        // flags here so the wider TabBar contract stays uniform.
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
      }),
    [tabs, onTabDuplicate, onTabCloseOthers, onTabCloseAll],
  );

  return (
    <TabBar
      className="sql-tabbar"
      tabs={descriptors}
      activeTabId={activeTabId}
      onSelectTab={onTabActivate}
      onCloseTab={onTabClose}
      onRenameTab={onTabRename}
      onReorderTabs={(next) => {
        // Project the descriptor order back onto the QueryTab[] model
        // — the descriptors are derived from `tabs`, so we can recover
        // the originals via id lookup.
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
