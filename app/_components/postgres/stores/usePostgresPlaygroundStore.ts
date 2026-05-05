"use client";

import { create } from "zustand";

export interface PostgresTab {
  id: string;
  title: string;
  sql: string;
}

export interface MockResult {
  columns: string[];
  rows: string[][];
}

interface PostgresConnectionDraft {
  host: string;
  port: string;
  database: string;
  user: string;
  ssl: boolean;
}

interface PostgresPlaygroundState {
  connection: PostgresConnectionDraft;
  connected: boolean;
  tabs: PostgresTab[];
  activeTabId: string;
  result: MockResult | null;
  statusMessage: string;
  setConnectionField: (
    field: keyof PostgresConnectionDraft,
    value: string | boolean,
  ) => void;
  connectMock: () => void;
  disconnectMock: () => void;
  setActiveTab: (id: string) => void;
  setTabSql: (id: string, sql: string) => void;
  addTab: () => void;
  runMockQuery: () => void;
}

const initialTabs: PostgresTab[] = [
  {
    id: "tab-1",
    title: "Query 1",
    sql: "select * from public.customers limit 25;",
  },
];

export const usePostgresPlaygroundStore = create<PostgresPlaygroundState>(
  (set, get) => ({
    connection: {
      host: "localhost",
      port: "5432",
      database: "analytics",
      user: "dataslope",
      ssl: true,
    },
    connected: false,
    tabs: initialTabs,
    activeTabId: initialTabs[0].id,
    result: null,
    statusMessage: "Mock connection ready for future implementation.",
    setConnectionField: (field, value) =>
      set((state) => ({
        connection: { ...state.connection, [field]: value },
      })),
    connectMock: () =>
      set({
        connected: true,
        statusMessage: "Connected to mocked PostgreSQL session.",
      }),
    disconnectMock: () =>
      set({
        connected: false,
        result: null,
        statusMessage: "Disconnected from mocked PostgreSQL session.",
      }),
    setActiveTab: (activeTabId) => set({ activeTabId }),
    setTabSql: (id, sql) =>
      set((state) => ({
        tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, sql } : tab)),
      })),
    addTab: () =>
      set((state) => {
        const nextId = `tab-${state.tabs.length + 1}`;
        return {
          tabs: [
            ...state.tabs,
            { id: nextId, title: `Query ${state.tabs.length + 1}`, sql: "" },
          ],
          activeTabId: nextId,
        };
      }),
    runMockQuery: () => {
      const active = get().tabs.find((tab) => tab.id === get().activeTabId);
      set({
        result: {
          columns: ["id", "name", "plan", "created_at"],
          rows: [
            ["1", "Acme Transit", "enterprise", "2026-05-01"],
            ["2", "Metro Foods", "team", "2026-05-02"],
            ["3", "Northwind Labs", "starter", "2026-05-03"],
          ],
        },
        statusMessage: active?.sql.trim()
          ? "Mock query executed. Real Postgres execution will be wired later."
          : "Mock query executed with placeholder SQL.",
      });
    },
  }),
);
