import { describe, expect, it } from "vitest";
import { createDuckDbAdapter } from "../app/_components/duckdb/duckdbAdapter";
import { createPostgresAdapter } from "../app/_components/postgres/postgresAdapter";
import { createBlankSqlSample, findSqlSample } from "../app/_components/runtime/sqlSamples";
import { createSqliteAdapter } from "../app/_components/sql/sqliteAdapter";

describe("shared SQL sample helpers", () => {
  const samples = [
    {
      id: "one",
      label: "One",
      filename: "one.db",
      description: "First",
      defaultTabs: [{ title: "Query 1", code: "SELECT 1;" }],
    },
    {
      id: "two",
      label: "Two",
      filename: "two.db",
      description: "Second",
      defaultTabs: [{ title: "Query 1", code: "SELECT 2;" }],
    },
  ];

  it("finds samples by id and falls back to the first sample", () => {
    expect(findSqlSample(samples, null, "two").id).toBe("two");
    expect(findSqlSample(samples, null, "missing").id).toBe("one");
  });

  it("returns the blank sample before searching the regular catalog", () => {
    const blank = createBlankSqlSample({
      id: "blank",
      label: "Blank",
      filename: "untitled.db",
      description: "Empty",
    });

    expect(findSqlSample(samples, blank, "blank")).toBe(blank);
    expect(blank.defaultTabs).toEqual([{ title: "Query 1", code: "" }]);
  });
});

describe("SQL engine adapters", () => {
  it("exposes dialect identity and storage prefixes", () => {
    expect(createSqliteAdapter()).toMatchObject({
      dialect: "sqlite",
      displayName: "SQLite",
      storagePrefix: "pg_sqlite_",
      supportsSchemas: false,
      supportsPragmas: true,
    });
    expect(createPostgresAdapter()).toMatchObject({
      dialect: "postgres",
      displayName: "PostgreSQL",
      storagePrefix: "pgplayground_",
      supportsSchemas: true,
      supportsPragmas: false,
    });
    expect(createDuckDbAdapter()).toMatchObject({
      dialect: "duckdb",
      displayName: "DuckDB",
      storagePrefix: "duckdb_",
      supportsSchemas: true,
      supportsPragmas: false,
    });
  });

  it("quotes identifiers by doubling embedded quotes", () => {
    expect(createSqliteAdapter().quoteIdent('a"b')).toBe('"a""b"');
    expect(createPostgresAdapter().quoteIdent('a"b')).toBe('"a""b"');
    expect(createDuckDbAdapter().quoteIdent('a"b')).toBe('"a""b"');
  });

  it("includes blank samples for engines that support creating databases", () => {
    expect(createPostgresAdapter().findSample("blank")?.filename).toBe(
      "untitled.pg",
    );
    expect(createDuckDbAdapter().findSample("blank")?.filename).toBe(
      "untitled.duckdb",
    );
  });
});
