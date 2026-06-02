import { describe, expect, it } from "vitest";
import {
  bareTableSelectSource,
  bareTableSelectSources,
  orderEditedStatementByPk,
  splitSqlStatements,
  statementAtCursor,
} from "../app/_components/sql/utils/sqlAnalysis";

describe("splitSqlStatements", () => {
  it("splits top-level statements and trims them", () => {
    const sql = "SELECT 1;\n  SELECT 2 ;\nSELECT 3";
    expect(splitSqlStatements(sql).map((s) => s.text)).toEqual([
      "SELECT 1",
      "SELECT 2",
      "SELECT 3",
    ]);
  });

  it("reports accurate offsets into the source", () => {
    const sql = "  SELECT 1; SELECT 22";
    const ranges = splitSqlStatements(sql);
    expect(ranges).toHaveLength(2);
    expect(sql.slice(ranges[0].from, ranges[0].to)).toBe("SELECT 1");
    expect(sql.slice(ranges[1].from, ranges[1].to)).toBe("SELECT 22");
  });

  it("ignores semicolons inside strings and identifiers", () => {
    const sql = `SELECT ';'; SELECT "a;b" FROM t`;
    expect(splitSqlStatements(sql).map((s) => s.text)).toEqual([
      "SELECT ';'",
      `SELECT "a;b" FROM t`,
    ]);
  });

  it("ignores semicolons inside line and block comments", () => {
    const sql = "SELECT 1 -- a; b\n; /* c; d */ SELECT 2";
    expect(splitSqlStatements(sql).map((s) => s.text)).toEqual([
      "SELECT 1 -- a; b",
      "/* c; d */ SELECT 2",
    ]);
  });

  it("ignores semicolons inside dollar-quoted bodies but not $1 params", () => {
    const sql = "SELECT $tag$ a; b $tag$; SELECT $1";
    expect(splitSqlStatements(sql).map((s) => s.text)).toEqual([
      "SELECT $tag$ a; b $tag$",
      "SELECT $1",
    ]);
  });

  it("skips empty segments and a trailing semicolon", () => {
    expect(splitSqlStatements(";;SELECT 1;;").map((s) => s.text)).toEqual([
      "SELECT 1",
    ]);
    expect(splitSqlStatements("   ")).toEqual([]);
  });
});

describe("statementAtCursor", () => {
  const sql = "SELECT 1;\nSELECT 2;\nSELECT 3;";
  // offsets: "SELECT 1" 0-8, ";" 8, "\n" 9, "SELECT 2" 10-18, ";" 18 ...

  it("returns the statement the cursor sits inside", () => {
    expect(statementAtCursor(sql, 0)?.text).toBe("SELECT 1");
    expect(statementAtCursor(sql, 13)?.text).toBe("SELECT 2"); // inside "SELECT 2"
    expect(statementAtCursor(sql, sql.indexOf("3"))?.text).toBe("SELECT 3");
  });

  it("picks the preceding statement when the cursor is in a gap", () => {
    // Cursor right after the first ";" (position 9, the newline).
    expect(statementAtCursor(sql, 9)?.text).toBe("SELECT 1");
  });

  it("returns null for whitespace-only or empty SQL", () => {
    expect(statementAtCursor("   \n  ", 2)).toBeNull();
    expect(statementAtCursor("", 0)).toBeNull();
  });
});

describe("bareTableSelectSources", () => {
  const isTable = (name: string) =>
    ["users", "cards", "orders"].includes(name);

  it("detects an editable table per statement, aligned with sets", () => {
    expect(
      bareTableSelectSources(
        "SELECT * FROM users LIMIT 10;\nSELECT * FROM cards;",
        isTable,
      ),
    ).toEqual(["users", "cards"]);
  });

  it("yields null for non-bare or non-table statements (positional alignment)", () => {
    // count(*) and an INSERT are not editable `SELECT *`s, but they keep their
    // slot so the array still lines up with the engine's per-statement sets.
    expect(
      bareTableSelectSources(
        "SELECT * FROM users;\nSELECT count(*) FROM cards;\nINSERT INTO orders DEFAULT VALUES;\nSELECT * FROM orders;",
        isTable,
      ),
    ).toEqual(["users", null, null, "orders"]);
  });

  it("ignores leading comments and views / unknown tables", () => {
    expect(
      bareTableSelectSources(
        "-- preview\nSELECT * FROM users;\nSELECT * FROM some_view;",
        isTable,
      ),
    ).toEqual(["users", null]);
  });

  it("handles a single statement", () => {
    expect(bareTableSelectSources("SELECT * FROM cards", isTable)).toEqual([
      "cards",
    ]);
    expect(bareTableSelectSources("SELECT 1", isTable)).toEqual([null]);
  });
});

describe("bareTableSelectSource with ORDER BY", () => {
  it("still detects an editable table when a full-table select is ordered", () => {
    expect(bareTableSelectSource("SELECT * FROM cards ORDER BY card_id")).toBe(
      "cards",
    );
    expect(
      bareTableSelectSource('SELECT * FROM "users" ORDER BY "user_id" LIMIT 10'),
    ).toBe("users");
    expect(
      bareTableSelectSource("SELECT * FROM cards ORDER BY card_id DESC, card_type"),
    ).toBe("cards");
  });

  it("still rejects non-full-table selects", () => {
    expect(bareTableSelectSource("SELECT * FROM users WHERE id = 1")).toBeNull();
    expect(bareTableSelectSource("SELECT * FROM a JOIN b ON a.id = b.id")).toBeNull();
  });
});

describe("orderEditedStatementByPk", () => {
  it("orders just the edited statement of a multi-statement query by its PK", () => {
    expect(
      orderEditedStatementByPk(
        "SELECT * FROM users LIMIT 10;\nSELECT * FROM cards",
        1,
        ["card_id"],
      ),
    ).toBe(
      'SELECT * FROM users LIMIT 10;\nSELECT * FROM cards ORDER BY "card_id"',
    );
  });

  it("supports composite primary keys", () => {
    expect(
      orderEditedStatementByPk("SELECT * FROM order_items", 0, [
        "order_id",
        "product_id",
      ]),
    ).toBe('SELECT * FROM order_items ORDER BY "order_id", "product_id"');
  });

  it("leaves a LIMIT/OFFSET statement untouched (its row window is arbitrary)", () => {
    // Ordering would change *which* rows the LIMIT shows, so it's left as-is.
    const sql = "SELECT * FROM users LIMIT 10;\nSELECT * FROM cards";
    expect(orderEditedStatementByPk(sql, 0, ["user_id"])).toBe(sql);
    const off = "SELECT * FROM cards OFFSET 5";
    expect(orderEditedStatementByPk(off, 0, ["card_id"])).toBe(off);
  });

  it("is a no-op when the statement already has an ORDER BY (no double-order)", () => {
    const sql = "SELECT * FROM cards ORDER BY card_id";
    expect(orderEditedStatementByPk(sql, 0, ["card_id"])).toBe(sql);
  });

  it("is a no-op for non-bare statements or a missing PK", () => {
    const join = "SELECT * FROM a JOIN b ON a.id = b.id";
    expect(orderEditedStatementByPk(join, 0, ["id"])).toBe(join);
    expect(orderEditedStatementByPk("SELECT * FROM cards", 0, [])).toBe(
      "SELECT * FROM cards",
    );
    expect(orderEditedStatementByPk("SELECT * FROM cards", 5, ["card_id"])).toBe(
      "SELECT * FROM cards",
    );
  });
});
