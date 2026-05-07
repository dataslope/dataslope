"use client";

import { create } from "zustand";
import type {
  TableColumnInfo,
  ForeignKeyInfo,
  ColumnConstraintInfo,
} from "../../runtime/sqlite";
import type { SqliteSampleDatabase } from "../../runtime/sqliteSamples";
import { SQLITE_SAMPLE_DATABASES } from "../../runtime/sqliteSamples";
import { storageKey } from "../../sqlitePlaygroundTabs";

function readInitialActiveDbId(): string {
  if (typeof window === "undefined") return SQLITE_SAMPLE_DATABASES[0].id;
  return localStorage.getItem(storageKey("db")) ?? SQLITE_SAMPLE_DATABASES[0].id;
}

interface EngineState {
  loaded: boolean;
  statusState: "loading" | "ready" | "running" | "error";
  tables: string[];
  views: string[];
  indexes: string[];
  triggers: string[];
  columnsByEntity: Record<string, TableColumnInfo[]>;
  foreignKeysByEntity: Record<string, ForeignKeyInfo[]>;
  constraintsByEntity: Record<string, ColumnConstraintInfo[]>;
  expandedEntities: Set<string>;
  tablesSectionExpanded: boolean;
  viewsSectionExpanded: boolean;
  activeDbId: string;
  customDb: SqliteSampleDatabase | null;
  customFilenames: Record<string, string>;
  // Setters
  setLoaded: (loaded: boolean) => void;
  setStatusState: (status: "loading" | "ready" | "running" | "error") => void;
  setTables: (tables: string[]) => void;
  setViews: (views: string[]) => void;
  setIndexes: (indexes: string[]) => void;
  setTriggers: (triggers: string[]) => void;
  setColumnsByEntity: (
    updater:
      | ((prev: Record<string, TableColumnInfo[]>) => Record<string, TableColumnInfo[]>)
      | Record<string, TableColumnInfo[]>,
  ) => void;
  setForeignKeysByEntity: (
    updater:
      | ((prev: Record<string, ForeignKeyInfo[]>) => Record<string, ForeignKeyInfo[]>)
      | Record<string, ForeignKeyInfo[]>,
  ) => void;
  setConstraintsByEntity: (
    updater:
      | ((prev: Record<string, ColumnConstraintInfo[]>) => Record<string, ColumnConstraintInfo[]>)
      | Record<string, ColumnConstraintInfo[]>,
  ) => void;
  setExpandedEntities: (
    updater: ((prev: Set<string>) => Set<string>) | Set<string>,
  ) => void;
  setTablesSectionExpanded: (
    expanded: boolean | ((prev: boolean) => boolean),
  ) => void;
  setViewsSectionExpanded: (
    expanded: boolean | ((prev: boolean) => boolean),
  ) => void;
  setActiveDbId: (id: string) => void;
  setCustomDb: (
    db:
      | SqliteSampleDatabase
      | null
      | ((prev: SqliteSampleDatabase | null) => SqliteSampleDatabase | null),
  ) => void;
  setCustomFilenames: (
    updater:
      | ((prev: Record<string, string>) => Record<string, string>)
      | Record<string, string>,
  ) => void;
}

export const useEngineStore = create<EngineState>((set) => ({
  loaded: false,
  statusState: "loading",
  tables: [],
  views: [],
  indexes: [],
  triggers: [],
  columnsByEntity: {},
  foreignKeysByEntity: {},
  constraintsByEntity: {},
  expandedEntities: new Set(),
  tablesSectionExpanded: true,
  viewsSectionExpanded: true,
  activeDbId: readInitialActiveDbId(),
  customDb: null,
  customFilenames: {},
  setLoaded: (loaded) => set({ loaded }),
  setStatusState: (statusState) => set({ statusState }),
  setTables: (tables) => set({ tables }),
  setViews: (views) => set({ views }),
  setIndexes: (indexes) => set({ indexes }),
  setTriggers: (triggers) => set({ triggers }),
  setColumnsByEntity: (updater) =>
    set((state) => ({
      columnsByEntity:
        typeof updater === "function" ? updater(state.columnsByEntity) : updater,
    })),
  setForeignKeysByEntity: (updater) =>
    set((state) => ({
      foreignKeysByEntity:
        typeof updater === "function" ? updater(state.foreignKeysByEntity) : updater,
    })),
  setConstraintsByEntity: (updater) =>
    set((state) => ({
      constraintsByEntity:
        typeof updater === "function"
          ? updater(state.constraintsByEntity)
          : updater,
    })),
  setExpandedEntities: (updater) =>
    set((state) => ({
      expandedEntities:
        typeof updater === "function" ? updater(state.expandedEntities) : updater,
    })),
  setTablesSectionExpanded: (expanded) =>
    set((state) => ({
      tablesSectionExpanded:
        typeof expanded === "function"
          ? expanded(state.tablesSectionExpanded)
          : expanded,
    })),
  setViewsSectionExpanded: (expanded) =>
    set((state) => ({
      viewsSectionExpanded:
        typeof expanded === "function"
          ? expanded(state.viewsSectionExpanded)
          : expanded,
    })),
  setActiveDbId: (activeDbId) => set({ activeDbId }),
  setCustomDb: (updater) =>
    set((state) => ({
      customDb:
        typeof updater === "function" ? updater(state.customDb) : updater,
    })),
  setCustomFilenames: (updater) =>
    set((state) => ({
      customFilenames:
        typeof updater === "function" ? updater(state.customFilenames) : updater,
    })),
}));
