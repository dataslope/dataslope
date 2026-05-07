import { CompletionContext } from "@codemirror/autocomplete";
import type { CompletionResult } from "@codemirror/autocomplete";
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import {
  createSqlCompletionSource,
  type SqlCompletionSchema,
} from "../app/_components/sql/sqlCompletion";

const schema: SqlCompletionSchema = {
  entities: [
    {
      name: "customers",
      kind: "table",
      columns: ["id", "name", "email"],
    },
    {
      name: "orders",
      kind: "table",
      columns: ["id", "customer_id", "total"],
    },
    {
      name: "recent_orders",
      kind: "view",
      columns: ["order_id", "total"],
    },
  ],
};

function complete(doc: string, explicit = false): CompletionResult | null {
  const state = EditorState.create({ doc });
  const source = createSqlCompletionSource(schema);
  const result = source(new CompletionContext(state, doc.length, explicit));
  if (result instanceof Promise) {
    throw new Error("SQL completion source should be synchronous");
  }
  return result;
}

function labels(result: CompletionResult | null): string[] {
  return result?.options.map((option) => option.label) ?? [];
}

function findOption(result: CompletionResult | null, label: string) {
  return result?.options.find((option) => option.label === label);
}

describe("SQLite SQL completion source", () => {
  it("suggests tables after FROM", () => {
    const result = complete("SELECT * FROM ");
    expect(labels(result).slice(0, 3)).toEqual([
      "customers",
      "orders",
      "recent_orders",
    ]);
    expect(result?.validFor).toBeInstanceOf(RegExp);
  });

  it("suggests scoped columns after WHERE", () => {
    const result = complete("SELECT * FROM customers WHERE ");
    expect(labels(result)).toContain("name");
    expect(labels(result)).toContain("email");
    expect(labels(result)).not.toContain("customer_id");
  });

  it("suggests alias-qualified columns after dot", () => {
    const result = complete("SELECT * FROM customers c WHERE c.");
    expect(labels(result)).toEqual(["id", "name", "email"]);
  });

  it("falls back to SQL keywords for general prefixes", () => {
    const result = complete("SEL");
    expect(labels(result)).toContain("SELECT");
    expect(result?.from).toBe(0);
  });

  it("suggests keywords (not tables) after a referenced table", () => {
    const result = complete("SELECT * FROM customers ");
    const labelSet = new Set(labels(result));
    expect(labelSet.has("WHERE")).toBe(true);
    expect(labelSet.has("JOIN")).toBe(true);
    // Tables can still appear as low-priority extras, but the top-ranked
    // suggestions must be keywords — tables should never crowd out the
    // expected next-clause keywords here.
    const top = result?.options
      .slice()
      .sort((a, b) => (b.boost ?? 0) - (a.boost ?? 0))
      .slice(0, 5)
      .map((option) => option.label);
    expect(top).toContain("WHERE");
  });

  it("suggests tables after a comma in the FROM clause", () => {
    const result = complete("SELECT * FROM customers, ");
    expect(labels(result).slice(0, 3)).toEqual([
      "customers",
      "orders",
      "recent_orders",
    ]);
  });

  it("suggests scoped columns from multiple referenced tables", () => {
    const result = complete(
      "SELECT * FROM customers c JOIN orders o ON ",
    );
    const labelSet = new Set(labels(result));
    // Both sides of the JOIN are in scope. Ambiguous columns (id) get
    // qualified labels so they don't collide.
    expect(labelSet.has("name")).toBe(true);
    expect(labelSet.has("customer_id")).toBe(true);
    expect(labelSet.has("customers.id")).toBe(true);
    expect(labelSet.has("orders.id")).toBe(true);
  });

  it("places the cursor inside parens for function completions", () => {
    const result = complete("SELECT COUN");
    const opt = findOption(result, "COUNT");
    expect(opt).toBeDefined();
    // snippetCompletion produces a function-style apply rather than a
    // plain string; that's how we know the cursor will land inside ().
    expect(typeof opt?.apply).toBe("function");
  });

  it("suggests CTE names after FROM", () => {
    const result = complete(
      "WITH active AS (SELECT * FROM customers WHERE name IS NOT NULL) SELECT * FROM ",
    );
    expect(labels(result)).toContain("active");
  });

  it("resolves CTE columns after a qualifier when declared in WITH cte(cols)", () => {
    const result = complete(
      "WITH summary(total_count, latest) AS (SELECT 1, 2) SELECT summary.",
    );
    expect(labels(result)).toEqual(["total_count", "latest"]);
  });

  it("does not suggest existing tables in CREATE TABLE name slot", () => {
    const result = complete("CREATE TABLE ", true);
    const labelList = labels(result);
    expect(labelList).not.toContain("customers");
    expect(labelList).not.toContain("orders");
  });

  it("suggests columns of the target table inside INSERT INTO column list", () => {
    const result = complete("INSERT INTO orders (");
    expect(labels(result)).toEqual(["id", "customer_id", "total"]);
  });

  it("suggests columns inside USING (...)", () => {
    const result = complete(
      "SELECT * FROM customers JOIN orders USING (",
    );
    const labelSet = new Set(labels(result));
    // USING columns must be present in both joined tables. Even without
    // a strict intersection filter, the suggestions should still include
    // columns from the referenced tables.
    expect(labelSet.has("customers.id")).toBe(true);
    expect(labelSet.has("orders.id")).toBe(true);
  });

  it("does not suggest columns when no FROM clause provides scope", () => {
    const result = complete("SELECT ");
    const labelList = labels(result);
    expect(labelList).not.toContain("name");
    expect(labelList).not.toContain("email");
    // But keywords like DISTINCT and tables remain available.
    expect(labelList).toContain("DISTINCT");
  });

  function topKeywords(
    result: CompletionResult | null,
    n = 8,
  ): string[] {
    return (result?.options ?? [])
      .filter((option) => option.type === "keyword")
      .slice()
      .sort((a, b) => (b.boost ?? 0) - (a.boost ?? 0))
      .slice(0, n)
      .map((option) => option.label);
  }

  describe("context-aware keyword ranking", () => {
    it("ranks statement-starter keywords first at start of buffer", () => {
      const result = complete("", true);
      const top = topKeywords(result, 6);
      expect(top).toContain("SELECT");
      expect(top).toContain("INSERT");
      expect(top).toContain("WITH");
      // Mid-clause keywords should not crowd the top.
      expect(top).not.toContain("WHERE");
    });

    it("ranks FROM after a SELECT list", () => {
      const result = complete("SELECT id ", true);
      const top = topKeywords(result, 6);
      expect(top).toContain("FROM");
    });

    it("ranks JOIN/WHERE/GROUP/ORDER after a FROM table reference", () => {
      const result = complete("SELECT * FROM customers ", true);
      const top = topKeywords(result, 10);
      expect(top).toContain("WHERE");
      expect(top).toContain("JOIN");
      expect(top).toContain("GROUP");
      expect(top).toContain("ORDER");
      // Statement starters should be downranked here.
      expect(top).not.toContain("CREATE");
      expect(top).not.toContain("INSERT");
    });

    it("ranks ON/USING right after a JOIN target", () => {
      const result = complete("SELECT * FROM customers JOIN orders ", true);
      const top = topKeywords(result, 8);
      expect(top).toContain("ON");
      expect(top).toContain("USING");
    });

    it("ranks AND/OR/IS/LIKE/IN inside WHERE after an identifier", () => {
      const result = complete("SELECT * FROM customers WHERE name ", true);
      const top = topKeywords(result, 10);
      expect(top).toContain("AND");
      expect(top).toContain("OR");
      expect(top).toContain("IS");
      expect(top).toContain("LIKE");
      expect(top).toContain("IN");
    });

    it("limits CREATE keyword to TABLE/VIEW/INDEX/TRIGGER family", () => {
      const result = complete("CREATE ", true);
      const top = topKeywords(result, 10);
      expect(top).toContain("TABLE");
      expect(top).toContain("VIEW");
      expect(top).toContain("INDEX");
      expect(top).toContain("TRIGGER");
      expect(top).toContain("UNIQUE");
      expect(top).toContain("TEMP");
    });

    it("after ORDER, requires BY", () => {
      const result = complete("SELECT * FROM customers ORDER ", true);
      const labelSet = new Set(labels(result));
      expect(labelSet.has("BY")).toBe(true);
      // Restricted slot — other keywords should not appear at all.
      expect(labelSet.has("SELECT")).toBe(false);
      expect(labelSet.has("WHERE")).toBe(false);
    });

    it("offers OFFSET after LIMIT <n>", () => {
      const result = complete("SELECT * FROM customers LIMIT ", true);
      const top = topKeywords(result, 5);
      expect(top).toContain("OFFSET");
    });

    it("offers ALL/SELECT after UNION", () => {
      const result = complete(
        "SELECT * FROM customers UNION ",
        true,
      );
      const top = topKeywords(result, 5);
      expect(top).toContain("ALL");
      expect(top).toContain("SELECT");
    });

    it("only offers IF/NOT/EXISTS in CREATE TABLE name slot", () => {
      const result = complete("CREATE TABLE ", true);
      const labelList = labels(result);
      // Restricted to the name-slot keyword set.
      expect(labelList.sort()).toEqual(["EXISTS", "IF", "NOT"]);
    });
  });
});
