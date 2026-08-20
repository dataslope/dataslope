import { describe, it, expect } from "vitest";
import {
  boxDrawingToAscii,
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

  it("joins single-line multi-column rows with two spaces", () => {
    expect(
      formatExplainResult(
        ["id", "detail_a", "detail_b"],
        [
          [1, "SCAN", "users"],
          [2, null, "orders"],
        ],
      ),
    ).toBe("1  SCAN  users\n2    orders");
  });

  // DuckDB returns (explain_key, explain_value); joining them inline indented
  // only the drawing's first line, so the top of the tree sat 15 columns right
  // of the rest of it. A multi-line cell stacks instead.
  it("stacks a row's cells when one of them is multi-line", () => {
    expect(
      formatExplainResult(
        ["explain_key", "explain_value"],
        [["physical_plan", "HASH_JOIN\n  SEQ_SCAN a\n  SEQ_SCAN b"]],
      ),
    ).toBe("physical_plan\nHASH_JOIN\n  SEQ_SCAN a\n  SEQ_SCAN b");
  });

  // The box-drawing block isn't in the latin subset of the site's monospace
  // face, so the browser draws it from a wider fallback font and the tree
  // shears. ASCII lookalikes render from the same font as the labels.
  it("redraws DuckDB's box-drawing tree in ASCII, keeping it aligned", () => {
    const dashes = "\u2500".repeat(12);
    const plan = [
      `\u250c${dashes}\u2510`,
      "\u2502  SEQ_SCAN  \u2502",
      `\u2514${dashes}\u2518`,
    ].join("\n");
    const out = formatExplainResult(
      ["explain_key", "explain_value"],
      [["physical_plan", plan]],
    );
    expect(out).toBe(
      [
        "physical_plan",
        "+------------+",
        "|  SEQ_SCAN  |",
        "+------------+",
      ].join("\n"),
    );
    // Every line of the drawing is the same width, which is the whole point.
    const drawing = out.split("\n").slice(1);
    expect(new Set(drawing.map((l) => l.length)).size).toBe(1);
  });
});

describe("boxDrawingToAscii", () => {
  it("maps every box-drawing character to one ASCII column", () => {
    // Light, heavy, double and dashed variants of the same three shapes.
    expect(boxDrawingToAscii("\u2500\u2501\u2550\u2504")).toBe("----");
    expect(boxDrawingToAscii("\u2502\u2503\u2551\u2506")).toBe("||||");
    // Corners, tees and the cross.
    expect(
      boxDrawingToAscii(
        "\u250c\u2510\u2514\u2518\u251c\u2524\u252c\u2534\u253c",
      ),
    ).toBe("+++++++++");
  });

  it("never changes a line's length, so columns stay put", () => {
    const line = "\u251c\u2500\u2500 Table: loans \u2500\u2500\u2524";
    expect(boxDrawingToAscii(line)).toHaveLength(line.length);
    expect(boxDrawingToAscii(line)).toBe("+-- Table: loans --+");
  });

  it("leaves plain ASCII plans (SQLite, Postgres) untouched", () => {
    const plan =
      "Seq Scan on users  (cost=0.00..1.10 rows=10)\n  Filter: active";
    expect(boxDrawingToAscii(plan)).toBe(plan);
  });
});
