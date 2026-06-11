import { CompletionContext } from "@codemirror/autocomplete";
import type { CompletionResult } from "@codemirror/autocomplete";
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import {
  createSqlCompletionSource,
  type SqlCompletionOptions,
  type SqlCompletionSchema,
} from "../app/_components/sql/sqlCompletion";

const schema: SqlCompletionSchema = {
  entities: [
    {
      name: "customers",
      kind: "table",
      columns: [
        { name: "id", type: "INTEGER" },
        { name: "name", type: "TEXT" },
        { name: "email", type: "TEXT" },
      ],
    },
    {
      name: "orders",
      kind: "table",
      columns: [
        { name: "id", type: "INTEGER" },
        { name: "customer_id", type: "INTEGER" },
        { name: "total", type: "REAL" },
      ],
      foreignKeys: [
        { column: "customer_id", refEntity: "customers", refColumn: "id" },
      ],
    },
    {
      name: "recent_orders",
      kind: "view",
      // Plain-string columns stay supported for callers without type info.
      columns: ["order_id", "total"],
    },
  ],
};

function makeComplete(options: SqlCompletionOptions = {}) {
  // A `|` in the doc marks the cursor; without one the cursor sits at
  // the end. This lets tests cover the IDE-critical "editing in the
  // middle of a statement" scenarios.
  return (docWithCursor: string, explicit = false): CompletionResult | null => {
    const marker = docWithCursor.indexOf("|");
    const doc =
      marker === -1
        ? docWithCursor
        : docWithCursor.slice(0, marker) + docWithCursor.slice(marker + 1);
    const pos = marker === -1 ? doc.length : marker;
    const state = EditorState.create({ doc });
    const source = createSqlCompletionSource(schema, options);
    const result = source(new CompletionContext(state, pos, explicit));
    if (result instanceof Promise) {
      throw new Error("SQL completion source should be synchronous");
    }
    return result;
  };
}

const complete = makeComplete();

function labels(result: CompletionResult | null): string[] {
  return result?.options.map((option) => option.label) ?? [];
}

function findOption(result: CompletionResult | null, label: string) {
  return result?.options.find((option) => option.label === label);
}

function topKeywords(result: CompletionResult | null, n = 8): string[] {
  return (result?.options ?? [])
    .filter((option) => option.type === "keyword")
    .slice()
    .sort((a, b) => (b.boost ?? 0) - (a.boost ?? 0))
    .slice(0, n)
    .map((option) => option.label);
}

// Replicates @codemirror/autocomplete's sortOptions for an empty typed
// pattern: every option's fuzzy score is equal, so ordering is boost plus
// the dynamic-section offset (sections sort by their best-scoring option).
// This is the order users actually see in the dropdown — assertions on raw
// `options` order or plain boosts can't catch section-level inversions.
function renderedLabels(result: CompletionResult | null): string[] {
  const options = result?.options ?? [];
  const sectionBest = new Map<string, number>();
  for (const option of options) {
    const section = option.section;
    const name =
      typeof section === "string" ? section : (section?.name ?? "");
    const score = option.boost ?? 0;
    sectionBest.set(name, Math.max(sectionBest.get(name) ?? -Infinity, score));
  }
  const orderedSections = [...sectionBest.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .map(([name]) => name);
  const offset = new Map(
    orderedSections.map((name, index) => [name, -100000 * (index + 1)]),
  );
  return options
    .slice()
    .sort((a, b) => {
      const sectionOf = (option: (typeof options)[number]) => {
        const section = option.section;
        return typeof section === "string" ? section : (section?.name ?? "");
      };
      const scoreA = (a.boost ?? 0) + (offset.get(sectionOf(a)) ?? 0);
      const scoreB = (b.boost ?? 0) + (offset.get(sectionOf(b)) ?? 0);
      return scoreB - scoreA || (a.label < b.label ? -1 : 1);
    })
    .map((option) => option.label);
}

describe("SQLite SQL completion source", () => {
  it("suggests tables after FROM", () => {
    const result = complete("SELECT * FROM ");
    expect(labels(result).slice(0, 3)).toEqual([
      "customers",
      "orders",
      "recent_orders",
    ]);
  });

  it("suggests scoped columns after WHERE", () => {
    const result = complete("SELECT * FROM customers WHERE ");
    expect(labels(result)).toContain("name");
    expect(labels(result)).toContain("email");
    expect(labels(result)).not.toContain("customer_id");
  });

  it("suggests alias-qualified columns after dot", () => {
    const result = complete("SELECT * FROM customers c WHERE c.");
    expect(labels(result)).toEqual(["*", "id", "name", "email"]);
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
      "SELECT * FROM customers c JOIN orders o WHERE ",
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
    expect(labels(result)).toEqual(["*", "total_count", "latest"]);
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

  it("suggests shared bare column names inside USING (...)", () => {
    const result = complete(
      "SELECT * FROM customers JOIN orders USING (",
    );
    // USING takes bare names that exist on both sides — `id` here. The
    // shared column ranks above single-side columns; dotted names would
    // be invalid in this slot and must not appear.
    const idOption = findOption(result, "id");
    expect(idOption).toBeDefined();
    const nameOption = findOption(result, "name");
    expect((idOption?.boost ?? 0) > (nameOption?.boost ?? 0)).toBe(true);
    expect(labels(result)).not.toContain("customers.id");
  });

  it("does not suggest columns when no FROM clause provides scope", () => {
    const result = complete("SELECT ");
    const labelList = labels(result);
    expect(labelList).not.toContain("name");
    expect(labelList).not.toContain("email");
    // But keywords like DISTINCT and tables remain available.
    expect(labelList).toContain("DISTINCT");
  });

  describe("rendered dropdown order (boost + dynamic sections)", () => {
    it("renders columns above keywords and tables in a WHERE slot", () => {
      const rendered = renderedLabels(
        complete("SELECT * FROM customers WHERE "),
      );
      expect(rendered.indexOf("name")).toBeLessThan(rendered.indexOf("NOT"));
      expect(rendered.indexOf("name")).toBeLessThan(
        rendered.indexOf("customers"),
      );
    });

    it("renders next-clause keywords above tables after a FROM reference", () => {
      const rendered = renderedLabels(
        complete("SELECT * FROM customers ", true),
      );
      expect(rendered.indexOf("WHERE")).toBeLessThan(
        rendered.indexOf("customers"),
      );
      expect(rendered.indexOf("JOIN")).toBeLessThan(
        rendered.indexOf("orders"),
      );
    });

    it("renders tables above keywords after FROM", () => {
      const rendered = renderedLabels(complete("SELECT * FROM "));
      expect(rendered.indexOf("customers")).toBeLessThan(
        rendered.indexOf("SELECT"),
      );
    });

    it("renders the FK join condition first in the ON slot", () => {
      const rendered = renderedLabels(
        complete("SELECT * FROM customers c JOIN orders o ON "),
      );
      expect(rendered[0]).toBe("o.customer_id = c.id");
    });
  });

  describe("full-statement awareness (cursor mid-statement)", () => {
    it("suggests columns in the SELECT list when FROM appears after the cursor", () => {
      const result = complete("SELECT | FROM customers");
      const labelSet = new Set(labels(result));
      expect(labelSet.has("name")).toBe(true);
      expect(labelSet.has("email")).toBe(true);
    });

    it("resolves alias-qualified columns when the alias is declared after the cursor", () => {
      const result = complete("SELECT c.| FROM customers c");
      expect(labels(result)).toEqual(["*", "id", "name", "email"]);
    });

    it("scopes columns to the statement under the cursor in multi-statement docs", () => {
      const result = complete(
        "SELECT * FROM orders; SELECT | FROM customers; SELECT 1",
      );
      const labelSet = new Set(labels(result));
      expect(labelSet.has("name")).toBe(true);
      expect(labelSet.has("customer_id")).toBe(false);
    });
  });

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

    it("ranks FROM right after SELECT *", () => {
      const result = complete("SELECT * ", true);
      const top = topKeywords(result, 3);
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

    it("treats string literals as complete operands", () => {
      const result = complete(
        "SELECT * FROM customers WHERE name = 'Alice' ",
        true,
      );
      const top = topKeywords(result, 8);
      expect(top).toContain("AND");
      expect(top).toContain("OR");
    });

    it("treats decimal numbers as complete operands", () => {
      const result = complete(
        "SELECT * FROM orders WHERE total > 1.5 ",
        true,
      );
      const top = topKeywords(result, 8);
      expect(top).toContain("AND");
      expect(top).toContain("OR");
    });

    it("still offers OFFSET after LIMIT <n>", () => {
      const result = complete("SELECT * FROM customers LIMIT 10 ", true);
      const labelSet = new Set(labels(result));
      expect(labelSet.has("OFFSET")).toBe(true);
      expect(labelSet.has("WHERE")).toBe(false);
    });

    it("suggests JOIN after a join modifier", () => {
      const result = complete("SELECT * FROM customers LEFT ", true);
      const labelSet = new Set(labels(result));
      expect(labelSet.has("JOIN")).toBe(true);
      expect(labelSet.has("WHERE")).toBe(false);
    });

    it("suggests THEN after an open CASE WHEN condition", () => {
      const result = complete(
        "SELECT CASE WHEN total > 10 ",
        true,
      );
      const top = topKeywords(result, 8);
      expect(top).toContain("THEN");
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

    it("offers OFFSET after LIMIT", () => {
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

  describe("keyword casing follows typed case", () => {
    it("inserts lowercase keywords for lowercase prefixes", () => {
      const result = complete("sel");
      expect(findOption(result, "SELECT")?.apply).toBe("select");
    });

    it("inserts uppercase keywords for uppercase prefixes", () => {
      const result = complete("SEL");
      // No apply override — the uppercase label itself is inserted.
      expect(findOption(result, "SELECT")?.apply).toBeUndefined();
    });

    it("re-queries when the casing style changes mid-word", () => {
      const result = complete("sel");
      const validFor = result?.validFor;
      expect(typeof validFor).toBe("function");
      if (typeof validFor === "function") {
        const valid = validFor as (
          text: string,
          from: number,
          to: number,
          state: EditorState,
        ) => boolean;
        const state = EditorState.create({ doc: "sel" });
        expect(valid("sele", 0, 4, state)).toBe(true);
        expect(valid("SELE", 0, 4, state)).toBe(false);
      }
    });
  });

  describe("JOIN intelligence", () => {
    it("suggests a complete FK join condition after ON", () => {
      const result = complete(
        "SELECT * FROM customers c JOIN orders o ON ",
      );
      const condition = findOption(result, "o.customer_id = c.id");
      expect(condition).toBeDefined();
      // The ready-made condition outranks plain column suggestions.
      const column = findOption(result, "name");
      expect((condition?.boost ?? 0) > (column?.boost ?? 0)).toBe(true);
    });

    it("suggests the reversed FK condition when joining the parent table", () => {
      const result = complete(
        "SELECT * FROM orders o JOIN customers c ON ",
      );
      expect(findOption(result, "c.id = o.customer_id")).toBeDefined();
    });

    it("uses table names in conditions when no aliases are declared", () => {
      const result = complete(
        "SELECT * FROM customers JOIN orders ON ",
      );
      expect(
        findOption(result, "orders.customer_id = customers.id"),
      ).toBeDefined();
    });

    it("ranks FK-related tables first after JOIN", () => {
      const result = complete("SELECT * FROM customers JOIN ");
      const orders = findOption(result, "orders");
      const view = findOption(result, "recent_orders");
      expect((orders?.boost ?? 0) > (view?.boost ?? 0)).toBe(true);
    });
  });

  describe("DDL-aware completion", () => {
    it("suggests data types after a column name in CREATE TABLE", () => {
      const result = complete("CREATE TABLE t (id ", true);
      const labelList = labels(result);
      expect(labelList).toContain("INTEGER");
      expect(labelList).toContain("TEXT");
      // No tables / statement keywords inside a column definition.
      expect(labelList).not.toContain("customers");
      expect(labelList).not.toContain("SELECT");
    });

    it("suggests constraints after a column type", () => {
      const result = complete("CREATE TABLE t (id INTEGER ", true);
      const top = topKeywords(result, 8);
      expect(top).toContain("PRIMARY");
      expect(top).toContain("NOT");
      expect(labels(result)).not.toContain("SELECT");
    });

    it("requires KEY after PRIMARY in a column definition", () => {
      const result = complete("CREATE TABLE t (id INTEGER PRIMARY ", true);
      expect(labels(result)).toEqual(["KEY"]);
    });

    it("suggests existing tables after REFERENCES", () => {
      const result = complete(
        "CREATE TABLE t (customer_id INTEGER REFERENCES ",
        true,
      );
      expect(labels(result)).toContain("customers");
    });

    it("suggests the parent table's columns inside REFERENCES (...)", () => {
      const result = complete(
        "CREATE TABLE t (customer_id INTEGER REFERENCES customers(",
        true,
      );
      expect(labels(result)).toEqual(["id", "name", "email"]);
    });

    it("stays quiet inside nested parens like DECIMAL(10, …", () => {
      const result = complete("CREATE TABLE t (price DECIMAL(10, ", true);
      expect(result).toBeNull();
    });

    it("suggests tables after CREATE INDEX … ON", () => {
      const result = complete("CREATE INDEX idx ON ", true);
      expect(labels(result)).toContain("customers");
    });

    it("suggests the indexed table's columns inside CREATE INDEX … ON t (", () => {
      const result = complete("CREATE INDEX idx ON customers (", true);
      expect(labels(result)).toEqual(["id", "name", "email"]);
    });

    it("suggests existing columns after ALTER TABLE … DROP COLUMN", () => {
      const result = complete("ALTER TABLE customers DROP COLUMN ", true);
      const labelSet = new Set(labels(result));
      expect(labelSet.has("name")).toBe(true);
      expect(labelSet.has("email")).toBe(true);
    });
  });

  describe("schema metadata in suggestions", () => {
    it("shows column types in the detail", () => {
      const result = complete("SELECT * FROM customers WHERE ");
      expect(findOption(result, "name")?.detail).toBe("TEXT");
    });

    it("shows the owning table for multi-table scopes", () => {
      const result = complete(
        "SELECT * FROM customers JOIN orders ON customers.id = orders.customer_id WHERE ",
      );
      expect(findOption(result, "name")?.detail).toBe("customers · TEXT");
    });

    it("attaches a column-list preview to table suggestions", () => {
      const result = complete("SELECT * FROM ");
      const info = findOption(result, "customers")?.info;
      expect(typeof info).toBe("string");
      expect(info).toContain("id INTEGER");
    });

    it("completes tables after the main. schema qualifier", () => {
      const result = complete("SELECT * FROM main.");
      expect(labels(result)).toContain("customers");
    });

    it("resolves columns for schema-qualified table references", () => {
      const result = complete("SELECT * FROM main.customers WHERE ");
      expect(labels(result)).toContain("name");
    });
  });

  describe("dialect catalog filtering (SQLite)", () => {
    it("exposes SQLite-only keywords like PRAGMA and GLOB", () => {
      const result = complete("", true);
      const labelSet = new Set(labels(result));
      expect(labelSet.has("PRAGMA")).toBe(true);
      expect(labelSet.has("GLOB")).toBe(true);
      expect(labelSet.has("REGEXP")).toBe(true);
      // ILIKE and SIMILAR are Postgres/DuckDB-only — should not appear here.
      expect(labelSet.has("ILIKE")).toBe(false);
      expect(labelSet.has("QUALIFY")).toBe(false);
    });

    it("includes STRFTIME function for SQLite", () => {
      const result = complete("SELECT ", true);
      expect(labels(result)).toContain("STRFTIME");
    });

    it("includes SQLite window functions and GROUP_CONCAT", () => {
      const result = complete("SELECT ", true);
      const labelSet = new Set(labels(result));
      expect(labelSet.has("ROW_NUMBER")).toBe(true);
      expect(labelSet.has("GROUP_CONCAT")).toBe(true);
    });
  });
});

describe("PostgreSQL SQL completion source", () => {
  const completePg = makeComplete({ dialect: "postgres" });

  it("offers ILIKE/SIMILAR after WHERE col and hides GLOB", () => {
    const result = completePg("SELECT * FROM customers WHERE name ", true);
    const labelSet = new Set(labels(result));
    expect(labelSet.has("ILIKE")).toBe(true);
    expect(labelSet.has("SIMILAR")).toBe(true);
    expect(labelSet.has("LIKE")).toBe(true);
    // SQLite-only operators must not leak into Postgres completion.
    expect(labelSet.has("GLOB")).toBe(false);
    expect(labelSet.has("REGEXP")).toBe(false);
  });

  it("does not surface SQLite-only keywords", () => {
    const result = completePg("", true);
    const labelSet = new Set(labels(result));
    expect(labelSet.has("PRAGMA")).toBe(false);
    expect(labelSet.has("AUTOINCREMENT")).toBe(false);
  });

  it("offers RETURNING/FROM after UPDATE clause", () => {
    const result = completePg("UPDATE customers SET name = 'x' ", true);
    const top = topKeywords(result, 10);
    expect(top).toContain("WHERE");
    expect(top).toContain("RETURNING");
    expect(top).toContain("FROM");
  });

  it("offers ON CONFLICT after INSERT … VALUES (…)", () => {
    const result = completePg(
      "INSERT INTO customers (id, name) VALUES (1, 'a') ",
      true,
    );
    const top = topKeywords(result, 6);
    expect(top).toContain("ON");
    expect(top).toContain("RETURNING");
  });

  it("offers Postgres-flavored statement starters", () => {
    const result = completePg("", true);
    const top = topKeywords(result, 12);
    expect(top).toContain("SELECT");
    // Secondary set should include TRUNCATE/GRANT/REVOKE for Postgres.
    const labelSet = new Set(labels(result));
    expect(labelSet.has("TRUNCATE")).toBe(true);
    expect(labelSet.has("GRANT")).toBe(true);
  });

  it("offers Postgres functions like NOW and GENERATE_SERIES", () => {
    const result = completePg("SELECT ", true);
    const labelSet = new Set(labels(result));
    expect(labelSet.has("NOW")).toBe(true);
    expect(labelSet.has("GENERATE_SERIES")).toBe(true);
    expect(labelSet.has("ARRAY_AGG")).toBe(true);
    // SQLite-specific functions should not appear.
    expect(labelSet.has("STRFTIME")).toBe(false);
  });

  it("includes LATERAL as a secondary join modifier after a table", () => {
    const result = completePg("SELECT * FROM customers ", true);
    const labelSet = new Set(labels(result));
    expect(labelSet.has("LATERAL")).toBe(true);
  });

  it("still completes table/column references correctly", () => {
    const result = completePg("SELECT * FROM customers c WHERE c.");
    expect(labels(result)).toEqual(["*", "id", "name", "email"]);
  });

  it("completes tables after the public. schema qualifier", () => {
    const result = completePg("SELECT * FROM public.");
    expect(labels(result)).toContain("customers");
  });

  it("offers Postgres data types in CREATE TABLE column definitions", () => {
    const result = completePg("CREATE TABLE t (id ", true);
    const labelList = labels(result);
    expect(labelList).toContain("SERIAL");
    expect(labelList).toContain("TIMESTAMPTZ");
    expect(labelList).not.toContain("AUTOINCREMENT");
  });
});

describe("DuckDB SQL completion source", () => {
  const completeDdb = makeComplete({ dialect: "duckdb" });

  it("offers QUALIFY after GROUP BY/ORDER BY", () => {
    const result = completeDdb(
      "SELECT * FROM customers GROUP BY name ",
      true,
    );
    const labelSet = new Set(labels(result));
    expect(labelSet.has("QUALIFY")).toBe(true);
    expect(labelSet.has("HAVING")).toBe(true);
  });

  it("treats QUALIFY like HAVING for column scope", () => {
    const result = completeDdb("SELECT * FROM customers QUALIFY ");
    const labelSet = new Set(labels(result));
    expect(labelSet.has("name")).toBe(true);
    expect(labelSet.has("email")).toBe(true);
  });

  it("offers SEMI/ANTI/ASOF as join modifiers after a table", () => {
    const result = completeDdb("SELECT * FROM customers ", true);
    const labelSet = new Set(labels(result));
    expect(labelSet.has("SEMI")).toBe(true);
    expect(labelSet.has("ANTI")).toBe(true);
    expect(labelSet.has("ASOF")).toBe(true);
  });

  it("offers DuckDB-flavored statement starters", () => {
    const result = completeDdb("", true);
    const labelSet = new Set(labels(result));
    expect(labelSet.has("PIVOT")).toBe(true);
    expect(labelSet.has("UNPIVOT")).toBe(true);
    expect(labelSet.has("DESCRIBE")).toBe(true);
    expect(labelSet.has("SUMMARIZE")).toBe(true);
  });

  it("exposes DuckDB-specific keywords like EXCLUDE and MACRO", () => {
    const result = completeDdb("", true);
    const labelSet = new Set(labels(result));
    expect(labelSet.has("EXCLUDE")).toBe(true);
    expect(labelSet.has("MACRO")).toBe(true);
  });

  it("offers DuckDB functions like list_agg and arg_max", () => {
    const result = completeDdb("SELECT ", true);
    const labelSet = new Set(labels(result));
    expect(labelSet.has("LIST_AGG")).toBe(true);
    expect(labelSet.has("ARG_MAX")).toBe(true);
    expect(labelSet.has("QUANTILE")).toBe(true);
    // SQLite-only functions absent.
    expect(labelSet.has("JULIANDAY")).toBe(false);
  });

  it("collapses keyword/function duplicates like LIST into one entry", () => {
    const result = completeDdb("SELECT ", true);
    const listEntries = (result?.options ?? []).filter(
      (option) => option.label === "LIST",
    );
    expect(listEntries).toHaveLength(1);
    expect(listEntries[0]?.type).toBe("function");
  });

  it("uses ILIKE/SIMILAR for the after-NOT operator menu", () => {
    const result = completeDdb(
      "SELECT * FROM customers WHERE name NOT ",
      true,
    );
    const top = topKeywords(result, 12);
    expect(top).toContain("ILIKE");
    expect(top).toContain("SIMILAR");
    expect(top).not.toContain("GLOB");
  });

  it("offers CREATE OR REPLACE flavors for CREATE", () => {
    const result = completeDdb("CREATE ", true);
    const top = topKeywords(result, 12);
    expect(top).toContain("TABLE");
    expect(top).toContain("VIEW");
    expect(top).toContain("OR");
    expect(top).toContain("REPLACE");
    expect(top).toContain("MATERIALIZED");
  });
});
