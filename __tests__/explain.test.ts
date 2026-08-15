import { describe, it, expect } from "vitest";
import {
  buildExplainSql,
  formatExplainResult,
} from "../app/_components/sql/utils/explain";

describe("buildExplainSql", () => {
  it("uses EXPLAIN QUERY PLAN for SQLite", () => {
    expect(buildExplainSql("sqlite", "SELECT * FROM t")).toBe(
      "EXPLAIN QUERY PLAN SELECT * FROM t",
    );
  });

  it("uses plain EXPLAIN for Postgres and DuckDB", () => {
    expect(buildExplainSql("postgres", "SELECT * FROM t")).toBe(
      "EXPLAIN SELECT * FROM t",
    );
    expect(buildExplainSql("duckdb", "SELECT * FROM t")).toBe(
      "EXPLAIN SELECT * FROM t",
    );
  });

  it("strips a trailing semicolon", () => {
    expect(buildExplainSql("postgres", "SELECT 1;  ")).toBe("EXPLAIN SELECT 1");
    expect(buildExplainSql("sqlite", "SELECT 1;;")).toBe(
      "EXPLAIN QUERY PLAN SELECT 1",
    );
  });

  it("does not double-wrap an already-EXPLAIN statement", () => {
    expect(buildExplainSql("postgres", "EXPLAIN SELECT 1")).toBe(
      "EXPLAIN SELECT 1",
    );
    expect(buildExplainSql("sqlite", "explain query plan select 1")).toBe(
      "explain query plan select 1",
    );
  });

  // DS-31: ANALYZE / BUFFERS, Postgres only.
  it("adds the Postgres ANALYZE and BUFFERS options", () => {
    expect(buildExplainSql("postgres", "SELECT 1", { analyze: true })).toBe(
      "EXPLAIN (ANALYZE) SELECT 1",
    );
    expect(
      buildExplainSql("postgres", "SELECT 1", { analyze: true, buffers: true }),
    ).toBe("EXPLAIN (ANALYZE, BUFFERS) SELECT 1");
  });

  it("implies ANALYZE when only BUFFERS is asked for", () => {
    // BUFFERS alone is accepted by Postgres but reports nothing.
    expect(buildExplainSql("postgres", "SELECT 1", { buffers: true })).toBe(
      "EXPLAIN (ANALYZE, BUFFERS) SELECT 1",
    );
  });

  it("ignores the options for engines that have no equivalent", () => {
    expect(buildExplainSql("sqlite", "SELECT 1", { analyze: true })).toBe(
      "EXPLAIN QUERY PLAN SELECT 1",
    );
    expect(buildExplainSql("duckdb", "SELECT 1", { analyze: true })).toBe(
      "EXPLAIN SELECT 1",
    );
  });

  it("falls back to plain EXPLAIN with no options set", () => {
    expect(buildExplainSql("postgres", "SELECT 1", {})).toBe("EXPLAIN SELECT 1");
  });
});

describe("formatExplainResult", () => {
  it("returns a placeholder when there are no rows", () => {
    expect(formatExplainResult(["QUERY PLAN"], [])).toBe("(no plan returned)");
  });

  it("joins a Postgres single-column plan line-per-row", () => {
    expect(
      formatExplainResult(
        ["QUERY PLAN"],
        [["Seq Scan on users  (cost=0.00..1.10 rows=10)"], ["  Filter: active"]],
      ),
    ).toBe("Seq Scan on users  (cost=0.00..1.10 rows=10)\n  Filter: active");
  });

  it("shows just the `detail` column for SQLite EXPLAIN QUERY PLAN", () => {
    expect(
      formatExplainResult(
        ["id", "parent", "notused", "detail"],
        [
          [2, 0, 0, "SCAN users"],
          [3, 0, 0, "USE TEMP B-TREE FOR ORDER BY"],
        ],
      ),
    ).toBe("SCAN users\nUSE TEMP B-TREE FOR ORDER BY");
  });

  it("joins multi-column rows when there's no detail column", () => {
    expect(
      formatExplainResult(
        ["explain_key", "explain_value"],
        [["physical_plan", "HASH_JOIN\n  SEQ_SCAN a\n  SEQ_SCAN b"]],
      ),
    ).toBe("physical_plan  HASH_JOIN\n  SEQ_SCAN a\n  SEQ_SCAN b");
  });
});
