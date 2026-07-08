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
   *  (e.g. the inline Settings tab). Handlers (`onSelectTab`,
   *  `onCloseTab`) on these descriptors fall through to the generic
   *  TabBar; SqlTabBar only uses them for activation/close routing
   *  when the descriptor id doesn't match a `QueryTab`. */
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
  // Track where the settings (extra) tab sits within the full descriptor
  // list so the user can drag it anywhere among the query tabs.
  // Infinity means "append at the end", the natural starting position.
  const [settingsIdx, setSettingsIdx] = useState<number>(Infinity);

  // Reset position to the end whenever the settings tab is removed so
  // that it starts fresh the next time the user opens it.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset synced to the extraTabs prop
    if (!extraTabs || extraTabs.length === 0) setSettingsIdx(Infinity);
  }, [extraTabs]);

  const descriptors = useMemo<TabDescriptor[]>(
    () => {
      const queryDescriptors = tabs.map<TabDescriptor>((tab) => {
        // ER-diagram, view-data, and query-history tabs are transient
        //, duplicate and rename don't make sense. SqlTab used to hide
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
      });

      // Insert the settings (extra) tab at its tracked position so the
      // user can reorder it freely. When there is no extra tab (settings
      // closed) or the position hasn't been set yet, it goes at the end.
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
        // Route close requests to the QueryTab handler when applicable;
        // fall through to `onExtraTabClose` for non-QueryTab entries
        // (e.g. the Settings tab).
        const isQueryTab = tabs.some((t) => t.id === tabId);
        if (isQueryTab) onTabClose(tabId);
        else onExtraTabClose?.(tabId);
      }}
      onRenameTab={onTabRename}
      onReorderTabs={(next) => {
        // Track where the settings tab landed so it stays at its new
        // position after the drop.
        const settingsTab = extraTabs?.[0];
        if (settingsTab) {
          const newIdx = next.findIndex((d) => d.id === settingsTab.id);
          if (newIdx >= 0) setSettingsIdx(newIdx);
        }

        // Project the descriptor order back onto the QueryTab[] model
        //, the descriptors are derived from `tabs`, so we can recover
        // the originals via id lookup. Non-QueryTab `extraTabs` are
        // skipped so reordering only affects the persisted tab list.
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
