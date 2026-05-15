import { describe, expect, it } from "vitest";
import {
  addSqlShellTab,
  loadSqlShellState,
  saveSqlShellState,
  sqlShellStorageKey,
  updateSqlShellTabCode,
  type SqlShellState,
} from "../app/_components/sql/shared/SqlPlaygroundShell";
import type { SqlSample } from "../app/_components/sql/shared/SqlEngineAdapter";

class MemoryStorage {
  private readonly items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

const sample: SqlSample = {
  id: "chinook",
  label: "Chinook",
  filename: "chinook.sql",
  defaultTabs: [
    { title: "Artists", code: "SELECT * FROM artists;" },
    { title: "Albums", code: "SELECT * FROM albums;" },
  ],
};

describe("SqlPlaygroundShell tab persistence", () => {
  it("builds storage keys from adapter prefix and sample id", () => {
    expect(sqlShellStorageKey("pg_sqlite", "chinook")).toBe(
      "pg_sqlite:shell:chinook:tabs",
    );
  });

  it("creates default tabs from sample tab seeds", () => {
    const state = loadSqlShellState(null, "pg_sqlite", sample);

    expect(state.tabs).toHaveLength(2);
    expect(state.activeTabId).toBe(state.tabs[0].id);
    expect(state.tabs[0]).toMatchObject({
      title: "Artists",
      code: "SELECT * FROM artists;",
      pristineCode: "SELECT * FROM artists;",
    });
  });

  it("loads valid persisted tabs and keeps a valid active tab", () => {
    const storage = new MemoryStorage();
    const persisted: SqlShellState = {
      activeTabId: "tab_2",
      tabs: [
        {
          id: "tab_1",
          title: "One",
          code: "SELECT 1;",
          pristineCode: "SELECT 1;",
        },
        {
          id: "tab_2",
          title: "Two",
          code: "SELECT 2;",
          pristineCode: "SELECT 2;",
        },
      ],
    };

    saveSqlShellState(storage, "duckdb", sample.id, persisted);

    expect(loadSqlShellState(storage, "duckdb", sample)).toEqual(persisted);
  });

  it("falls back to the first persisted tab when active tab is stale", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      sqlShellStorageKey("postgres", sample.id),
      JSON.stringify({
        activeTabId: "missing",
        tabs: [{ id: "tab_1", title: "One", code: "SELECT 1;" }],
      }),
    );

    const state = loadSqlShellState(storage, "postgres", sample);

    expect(state.activeTabId).toBe("tab_1");
    expect(state.tabs[0].pristineCode).toBe("SELECT 1;");
  });

  it("adds a new tab and makes it active", () => {
    const state = loadSqlShellState(null, "pg_sqlite", sample);
    const next = addSqlShellTab(state);

    expect(next.tabs).toHaveLength(3);
    expect(next.activeTabId).toBe(next.tabs[2].id);
    expect(next.tabs[2]).toMatchObject({
      title: "Query 3",
      code: "",
      pristineCode: "",
    });
  });

  it("updates the requested tab code without changing pristine code", () => {
    const state = loadSqlShellState(null, "pg_sqlite", sample);
    const next = updateSqlShellTabCode(
      state,
      state.tabs[1].id,
      "SELECT count(*) FROM albums;",
    );

    expect(next.tabs[0].code).toBe("SELECT * FROM artists;");
    expect(next.tabs[1].code).toBe("SELECT count(*) FROM albums;");
    expect(next.tabs[1].pristineCode).toBe("SELECT * FROM albums;");
  });
});
