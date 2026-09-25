import { describe, it, expect } from "vitest";
import {
  buildCreateIndexSql,
  buildCreateViewSql,
  looksLikeViewBody,
  quoteIdent,
} from "../app/_components/sql/utils/ddl";

describe("quoteIdent", () => {
  it("double-quotes and escapes embedded quotes", () => {
    expect(quoteIdent("users")).toBe('"users"');
    expect(quoteIdent('we"ird')).toBe('"we""ird"');
  });
});

describe("buildCreateIndexSql", () => {
  it("escapes identifiers in names, tables and columns", () => {
    expect(
      buildCreateIndexSql({
        indexName: 'we"ird',
        table: 'ta"ble',
        columns: ['co"l'],
        ifNotExists: false,
      }),
    ).toBe('CREATE INDEX "we""ird" ON "ta""ble" ("co""l");');
  });
});

describe("buildCreateViewSql", () => {
  it("uses CREATE OR REPLACE VIEW for Postgres and DuckDB", () => {
    expect(
      buildCreateViewSql({
        viewName: "v",
        selectBody: "SELECT 1",
        dialect: "postgres",
        orReplace: true,
      }),
    ).toBe('CREATE OR REPLACE VIEW "v" AS\nSELECT 1;');
    expect(
      buildCreateViewSql({
        viewName: "v",
        selectBody: "SELECT 1",
        dialect: "duckdb",
        orReplace: true,
      }),
    ).toBe('CREATE OR REPLACE VIEW "v" AS\nSELECT 1;');
  });

  it("emulates OR REPLACE on SQLite with DROP + CREATE", () => {
    expect(
      buildCreateViewSql({
        viewName: "v",
        selectBody: "SELECT 1",
        dialect: "sqlite",
        orReplace: true,
      }),
    ).toBe('DROP VIEW IF EXISTS "v";\nCREATE VIEW "v" AS\nSELECT 1;');
  });
});

describe("looksLikeViewBody", () => {
  it("rejects non-query text", () => {
    expect(looksLikeViewBody("")).toBe(false);
    expect(looksLikeViewBody("UPDATE t SET x = 1")).toBe(false);
    expect(looksLikeViewBody("-- a comment")).toBe(false);
  });
});
