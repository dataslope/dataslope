import { describe, it, expect } from "vitest";
import {
  buildCreateIndexSql,
  suggestIndexName,
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
  it("builds a single-column index with IF NOT EXISTS by default", () => {
    expect(
      buildCreateIndexSql({
        indexName: "idx_users_email",
        table: "users",
        columns: ["email"],
      }),
    ).toBe(
      'CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");',
    );
  });

  it("supports composite columns, preserving order", () => {
    expect(
      buildCreateIndexSql({
        indexName: "idx_o_cust_date",
        table: "orders",
        columns: ["customer_id", "ordered_at"],
      }),
    ).toBe(
      'CREATE INDEX IF NOT EXISTS "idx_o_cust_date" ON "orders" ("customer_id", "ordered_at");',
    );
  });

  it("emits UNIQUE when requested", () => {
    expect(
      buildCreateIndexSql({
        indexName: "uq_users_email",
        table: "users",
        columns: ["email"],
        unique: true,
      }),
    ).toBe(
      'CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_email" ON "users" ("email");',
    );
  });

  it("omits IF NOT EXISTS when disabled", () => {
    expect(
      buildCreateIndexSql({
        indexName: "idx_x",
        table: "t",
        columns: ["c"],
        ifNotExists: false,
      }),
    ).toBe('CREATE INDEX "idx_x" ON "t" ("c");');
  });

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

  it("trims whitespace and drops blank columns", () => {
    expect(
      buildCreateIndexSql({
        indexName: "  idx  ",
        table: "  t  ",
        columns: ["a", "  ", "b"],
        ifNotExists: false,
      }),
    ).toBe('CREATE INDEX "idx" ON "t" ("a", "b");');
  });

  it("throws on missing name / table / columns", () => {
    expect(() =>
      buildCreateIndexSql({ indexName: "", table: "t", columns: ["c"] }),
    ).toThrow(/name is required/i);
    expect(() =>
      buildCreateIndexSql({ indexName: "i", table: "", columns: ["c"] }),
    ).toThrow(/table is required/i);
    expect(() =>
      buildCreateIndexSql({ indexName: "i", table: "t", columns: [] }),
    ).toThrow(/at least one column/i);
    expect(() =>
      buildCreateIndexSql({ indexName: "i", table: "t", columns: ["  "] }),
    ).toThrow(/at least one column/i);
  });
});

describe("suggestIndexName", () => {
  it("joins prefix, table and columns", () => {
    expect(suggestIndexName("users", ["email"])).toBe("idx_users_email");
    expect(suggestIndexName("orders", ["customer_id", "ordered_at"])).toBe(
      "idx_orders_customer_id_ordered_at",
    );
  });

  it("uses a uq_ prefix for unique indexes", () => {
    expect(suggestIndexName("users", ["email"], true)).toBe("uq_users_email");
  });

  it("lower-cases and sanitizes non-identifier characters", () => {
    expect(suggestIndexName("My Table", ["First Name"])).toBe(
      "idx_my_table_first_name",
    );
  });

  it("falls back when nothing usable is provided", () => {
    expect(suggestIndexName("", [])).toBe("idx_index");
    expect(suggestIndexName("!!!", ["@@@"], true)).toBe("uq_index");
  });

  it("caps very long composite names", () => {
    const name = suggestIndexName(
      "a_very_long_table_name_indeed",
      ["another_quite_long_column_name", "and_yet_another_long_one"],
    );
    expect(name.length).toBeLessThanOrEqual(60);
  });
});

describe("buildCreateViewSql", () => {
  it("builds a plain CREATE VIEW", () => {
    expect(
      buildCreateViewSql({
        viewName: "active_users",
        selectBody: "SELECT * FROM users WHERE active",
        dialect: "postgres",
      }),
    ).toBe(
      'CREATE VIEW "active_users" AS\nSELECT * FROM users WHERE active;',
    );
  });

  it("strips a trailing semicolon from the body", () => {
    expect(
      buildCreateViewSql({
        viewName: "v",
        selectBody: "SELECT 1;",
        dialect: "duckdb",
      }),
    ).toBe('CREATE VIEW "v" AS\nSELECT 1;');
  });

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

  it("does not add OR REPLACE on SQLite when not requested", () => {
    expect(
      buildCreateViewSql({
        viewName: "v",
        selectBody: "SELECT 1",
        dialect: "sqlite",
      }),
    ).toBe('CREATE VIEW "v" AS\nSELECT 1;');
  });

  it("escapes the view name", () => {
    expect(
      buildCreateViewSql({
        viewName: 'we"ird',
        selectBody: "SELECT 1",
        dialect: "postgres",
      }),
    ).toBe('CREATE VIEW "we""ird" AS\nSELECT 1;');
  });

  it("throws on missing name or body", () => {
    expect(() =>
      buildCreateViewSql({ viewName: "", selectBody: "SELECT 1", dialect: "sqlite" }),
    ).toThrow(/name is required/i);
    expect(() =>
      buildCreateViewSql({ viewName: "v", selectBody: "   ", dialect: "sqlite" }),
    ).toThrow(/SELECT statement is required/i);
  });
});

describe("looksLikeViewBody", () => {
  it("accepts SELECT and WITH statements (any leading whitespace/case)", () => {
    expect(looksLikeViewBody("SELECT 1")).toBe(true);
    expect(looksLikeViewBody("  select * from t")).toBe(true);
    expect(looksLikeViewBody("\n  WITH x AS (SELECT 1) SELECT * FROM x")).toBe(
      true,
    );
  });

  it("rejects non-query text", () => {
    expect(looksLikeViewBody("")).toBe(false);
    expect(looksLikeViewBody("UPDATE t SET x = 1")).toBe(false);
    expect(looksLikeViewBody("-- a comment")).toBe(false);
  });
});
