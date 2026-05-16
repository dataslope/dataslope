"use client";

import React, { useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  type SensorDescriptor,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { QueryTab } from "../../sqlitePlaygroundTabs";
import { SqlTab, SqlTabDragOverlay } from "./SqlTab";

export interface SqlTabBarProps {
  tabs: QueryTab[];
  activeTabId: string;
  draggingTab: QueryTab | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tabDragSensors: SensorDescriptor<any>[];
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel: () => void;
  onTabActivate: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabRename: (tabId: string, title: string) => void;
  onTabDuplicate: (tabId: string) => void;
  onTabCloseOthers: (tabId: string) => void;
  onTabCloseAll: () => void;
  onAddTab: () => void;
}

export function SqlTabBar({
  tabs,
  activeTabId,
  draggingTab,
  tabDragSensors,
  onDragStart,
  onDragEnd,
  onDragCancel,
  onTabActivate,
  onTabClose,
  onTabRename,
  onTabDuplicate,
  onTabCloseOthers,
  onTabCloseAll,
  onAddTab,
}: SqlTabBarProps) {
  const tabIds = useMemo(() => tabs.map((t) => t.id), [tabs]);

  return (
    <div className="sql-tabbar">
      <DndContext
        sensors={tabDragSensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
          <div className="sql-tabs" role="tablist">
            {tabs.map((tab) => (
              <SqlTab
                key={tab.id}
                tab={tab}
                active={tab.id === activeTabId}
                onActivate={() => onTabActivate(tab.id)}
                onClose={() => onTabClose(tab.id)}
                onRename={(title) => onTabRename(tab.id, title)}
                onDuplicate={() => onTabDuplicate(tab.id)}
                onCloseOthers={() => onTabCloseOthers(tab.id)}
                onCloseAll={onTabCloseAll}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {draggingTab ? (
            <SqlTabDragOverlay
              tab={draggingTab}
              active={draggingTab.id === activeTabId}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
      <button
        type="button"
        className="sql-tab-add"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onAddTab}
        aria-label="New query tab"
      >
        <Plus size={12} aria-hidden="true" />
      </button>
    </div>
  );
}
