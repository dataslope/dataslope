import { CompletionContext } from "@codemirror/autocomplete";
import type { CompletionResult } from "@codemirror/autocomplete";
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import {
  completionAcceptsEnter,
  createSqlCompletionSource,
  type SqlCompletionOptions,
  type SqlCompletionSchema,
} from "../app/_components/sql/sqlCompletion";
import { _internal as ranking, rememberPicked } from "../app/_components/completion/ranking";

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

function makeComplete(
  options: SqlCompletionOptions = {},
  completionSchema: SqlCompletionSchema = schema,
) {
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
    const source = createSqlCompletionSource(completionSchema, options);
    const result = source(new CompletionContext(state, pos, explicit));
    if (result instanceof Promise) {
      throw new Error("SQL completion source should be synchronous");
    }
    return result;
  };
}

const complete = makeComplete();

// What the popup shows for an option. An ambiguous column is matched on its
// bare name (`label`) and shown qualified (`displayLabel`), so the tests read
// the shown text.
function shownLabel(option: { label: string; displayLabel?: string }): string {
  return option.displayLabel ?? option.label;
}

function labels(result: CompletionResult | null): string[] {
  return result?.options.map(shownLabel) ?? [];
}

function findOption(result: CompletionResult | null, label: string) {
  return result?.options.find((option) => shownLabel(option) === label);
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
// pattern: ordering is boost plus the dynamic-section offset. This is the
// order users actually see; raw option order can't catch section inversions.
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
    // qualified labels so they don't collide, and the qualifier is the
    // alias: once a table is aliased its own name no longer resolves.
    expect(labelSet.has("name")).toBe(true);
    expect(labelSet.has("customer_id")).toBe(true);
    expect(labelSet.has("c.id")).toBe(true);
    expect(labelSet.has("o.id")).toBe(true);
    expect(labelSet.has("customers.id")).toBe(false);
    expect(labelSet.has("orders.id")).toBe(false);
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

  it("suggests columns of the target table inside INSERT INTO column list", () => {
    const result = complete("INSERT INTO orders (");
    expect(labels(result)).toEqual(["id", "customer_id", "total"]);
  });

  it("suggests shared bare column names inside USING (...)", () => {
    const result = complete(
      "SELECT * FROM customers JOIN orders USING (",
    );
    // USING takes bare names that exist on both sides, `id` here. The
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

    it("after ORDER, requires BY", () => {
      const result = complete("SELECT * FROM customers ORDER ", true);
      const labelSet = new Set(labels(result));
      expect(labelSet.has("BY")).toBe(true);
      // Restricted slot, other keywords should not appear at all.
      expect(labelSet.has("SELECT")).toBe(false);
      expect(labelSet.has("WHERE")).toBe(false);
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

    it("requires KEY after PRIMARY in a column definition", () => {
      const result = complete("CREATE TABLE t (id INTEGER PRIMARY ", true);
      expect(labels(result)).toEqual(["KEY"]);
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
  });

  describe("schema metadata in suggestions", () => {
    it("shows the owning table for multi-table scopes", () => {
      const result = complete(
        "SELECT * FROM customers JOIN orders ON customers.id = orders.customer_id WHERE ",
      );
      expect(findOption(result, "name")?.detail).toBe("customers · TEXT");
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
      // ILIKE and SIMILAR are Postgres/DuckDB-only, should not appear here.
      expect(labelSet.has("ILIKE")).toBe(false);
      expect(labelSet.has("QUALIFY")).toBe(false);
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

  it("offers ON CONFLICT after INSERT … VALUES (…)", () => {
    const result = completePg(
      "INSERT INTO customers (id, name) VALUES (1, 'a') ",
      true,
    );
    const top = topKeywords(result, 6);
    expect(top).toContain("ON");
    expect(top).toContain("RETURNING");
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

  it("collapses keyword/function duplicates like LIST into one entry", () => {
    const result = completeDdb("SELECT ", true);
    const listEntries = (result?.options ?? []).filter(
      (option) => option.label === "LIST",
    );
    expect(listEntries).toHaveLength(1);
    expect(listEntries[0]?.type).toBe("function");
  });
});

describe("ranking signals layered on the slot boosts", () => {
  const boostOf = (result: CompletionResult | null, label: string) =>
    findOption(result, label)?.boost ?? 0;

  it("offers types after a :: cast in Postgres and DuckDB, not SQLite", () => {
    const pg = makeComplete({ dialect: "postgres" });
    const cast = pg("SELECT total::|", true);
    expect(labels(cast)).toEqual(expect.arrayContaining(["INTEGER", "TEXT", "NUMERIC"]));
    expect(labels(cast)).not.toContain("customers");
    const typed = pg("SELECT total::nu");
    expect(labels(typed)).toContain("NUMERIC");
    const duck = makeComplete({ dialect: "duckdb" })("SELECT total::|", true);
    expect(labels(duck)).toContain("VARCHAR");
    expect(labels(complete("SELECT total::|", true))).not.toContain("INTEGER");
  });

  it("ranks SELECT-list columns first in ORDER BY and offers aliases", () => {
    const doc =
      "SELECT name, SUM(total) AS spent FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY name ORDER BY ";
    const result = complete(doc);
    expect(boostOf(result, "name")).toBeGreaterThan(boostOf(result, "email"));
    const alias = findOption(result, "spent");
    expect(alias).toMatchObject({ type: "property", detail: "alias" });
    expect(renderedLabels(result).slice(0, 2)).toEqual(["spent", "name"]);
  });

  it("withholds aliases where the dialect rejects them", () => {
    const doc = "SELECT name AS who FROM customers GROUP BY ";
    expect(labels(complete(doc))).toContain("who"); // SQLite accepts
    const pg = makeComplete({ dialect: "postgres" });
    expect(labels(pg(doc))).not.toContain("who");
    expect(labels(pg("SELECT name AS who FROM customers ORDER BY "))).toContain("who");
    expect(labels(pg("SELECT name AS who FROM customers GROUP BY name HAVING "))).not.toContain("who");
    expect(labels(complete("SELECT name AS who FROM customers GROUP BY name HAVING "))).toContain("who");
  });

  it("remembers what the reader accepted last", () => {
    ranking.recent.length = 0;
    const before = complete("SELECT * FROM customers WHERE ");
    expect(boostOf(before, "name")).toBe(boostOf(before, "email"));
    rememberPicked("name");
    const after = complete("SELECT * FROM customers WHERE ");
    expect(boostOf(after, "name")).toBeGreaterThan(boostOf(after, "email"));
    ranking.recent.length = 0;
  });

  it("keeps the FK join condition above even a well-used column in the ON slot", () => {
    rememberPicked("customer_id");
    const result = complete(
      "SELECT o.customer_id FROM orders o JOIN customers c ON ",
    );
    expect(renderedLabels(result)[0]).toBe("c.id = o.customer_id");
    ranking.recent.length = 0;
  });
});

// A second schema for the cases the first cannot express: a column two
// tables share, a self-referencing table, and names that only work quoted.
const appSchema: SqlCompletionSchema = {
  schemas: ["public", "pg_catalog", "information_schema", "analytics"],
  entities: [
    {
      name: "users",
      kind: "table",
      columns: [
        { name: "user_id", type: "INTEGER" },
        { name: "name", type: "TEXT" },
        { name: "manager_id", type: "INTEGER" },
      ],
    },
    {
      name: "cards",
      kind: "table",
      columns: [
        { name: "card_id", type: "INTEGER" },
        { name: "user_id", type: "INTEGER" },
        { name: "select", type: "TEXT" },
        { name: "MixedCase", type: "TEXT" },
        { name: "status", type: "TEXT" },
      ],
    },
    { name: "order", kind: "table", columns: ["id", "user", "date"] },
  ],
};

const DIALECTS = ["sqlite", "postgres", "duckdb"] as const;
const app = Object.fromEntries(
  DIALECTS.map((dialect) => [dialect, makeComplete({ dialect }, appSchema)]),
) as Record<(typeof DIALECTS)[number], ReturnType<typeof makeComplete>>;

function applyOf(result: CompletionResult | null, label: string) {
  return findOption(result, label)?.apply;
}

function columnLabels(result: CompletionResult | null): string[] {
  return (result?.options ?? [])
    .filter((option) => option.type === "property")
    .map(shownLabel);
}

function keywordLabels(result: CompletionResult | null): string[] {
  return (result?.options ?? [])
    .filter((option) => option.type === "keyword" || option.type === "function")
    .map((option) => option.label);
}

describe("ambiguous columns are qualified by alias", () => {
  it.each(DIALECTS)("uses the alias, not the table name (%s)", (dialect) => {
    const result = app[dialect](
      "SELECT * FROM cards c JOIN users u ON c.user_id = u.user_id WHERE user|",
    );
    expect(applyOf(result, "u.user_id")).toBe("u.user_id");
    expect(applyOf(result, "c.user_id")).toBe("c.user_id");
    expect(labels(result)).not.toContain("users.user_id");
    expect(labels(result)).not.toContain("cards.user_id");
    // A column only one side has stays bare, and the detail still names
    // the table it comes from.
    expect(applyOf(result, "card_id")).toBe("card_id");
    expect(findOption(result, "u.user_id")?.detail).toBe("users · INTEGER");
  });

  it("keeps the table name when the reference has no alias", () => {
    const result = app.sqlite("SELECT * FROM cards JOIN users WHERE ");
    expect(applyOf(result, "users.user_id")).toBe("users.user_id");
    expect(applyOf(result, "cards.user_id")).toBe("cards.user_id");
  });

  it("offers one entry per alias in a self-join", () => {
    const result = app.sqlite(
      "SELECT * FROM users e JOIN users m ON e.manager_id = m.user_id WHERE ",
    );
    expect(columnLabels(result)).toEqual([
      "e.user_id",
      "e.name",
      "e.manager_id",
      "m.user_id",
      "m.name",
      "m.manager_id",
    ]);
  });

  it("inserts an uppercase alias the way each engine reads it", () => {
    const doc = "SELECT * FROM cards C JOIN users U ON C.user_id = U.user_id WHERE ";
    // SQLite and DuckDB match names case-insensitively: the alias as typed.
    expect(applyOf(app.sqlite(doc), "U.user_id")).toBe("U.user_id");
    expect(applyOf(app.duckdb(doc), "U.user_id")).toBe("U.user_id");
    // Postgres folded the unquoted `U` to `u`; quoting it would name an
    // alias the query never declared.
    expect(applyOf(app.postgres(doc), "u.user_id")).toBe("u.user_id");
    expect(labels(app.postgres(doc))).not.toContain("U.user_id");
  });
});

describe("no completions inside string literals and comments", () => {
  it.each(DIALECTS)("stays quiet inside a string literal (%s)", (dialect) => {
    const complete = app[dialect];
    expect(complete("SELECT * FROM users WHERE name = 'us|")).toBeNull();
    // The editor closes the quote for the reader; still inside.
    expect(complete("SELECT * FROM users WHERE name = 'us|'")).toBeNull();
    // A doubled quote is an escape, not the end of the literal.
    expect(complete("SELECT * FROM users WHERE name = 'it''s us|")).toBeNull();
    // A literal opened on an earlier line.
    expect(complete("SELECT 'first line\nus|")).toBeNull();
  });

  it.each(DIALECTS)("stays quiet inside a comment (%s)", (dialect) => {
    const complete = app[dialect];
    expect(complete("-- sel|")).toBeNull();
    expect(complete("SELECT 1 -- from us|\nFROM users")).toBeNull();
    expect(complete("SELECT 1 /* sel|")).toBeNull();
    expect(complete("SELECT 1 /* sel| */ FROM users")).toBeNull();
    expect(complete("/* a\n   multi-line us|\n*/ SELECT 1")).toBeNull();
  });

  it("stays quiet for an explicit request too", () => {
    expect(app.sqlite("SELECT * FROM users WHERE name = 'us|", true)).toBeNull();
    expect(app.sqlite("-- sel|", true)).toBeNull();
    expect(app.sqlite("SELECT 1 /* |", true)).toBeNull();
  });

  it("completes again once the literal or comment has ended", () => {
    expect(
      columnLabels(app.sqlite("SELECT * FROM users WHERE name = 'us' AND ")),
    ).toContain("user_id");
    expect(
      columnLabels(app.sqlite("SELECT * FROM users WHERE name = 'it''s' AND ")),
    ).toContain("user_id");
    expect(labels(app.sqlite("SELECT 1 /* note */ FROM "))).toContain("users");
    expect(
      columnLabels(app.sqlite("SELECT * FROM users -- note 'quote\nWHERE ")),
    ).toContain("user_id");
  });

  it("treats dollar quoting as a string where the dialect has it", () => {
    expect(app.postgres("SELECT $$ us|", true)).toBeNull();
    expect(app.postgres("SELECT $body$ it's us|", true)).toBeNull();
    expect(app.duckdb("SELECT $$ us|", true)).toBeNull();
    expect(
      columnLabels(app.postgres("SELECT * FROM users WHERE name = $$a$$ AND ")),
    ).toContain("user_id");
    // SQLite reads `$name` as a bind parameter, so this is still code.
    expect(app.sqlite("SELECT $$ us|", true)).not.toBeNull();
  });

  it("still completes inside a double-quoted identifier", () => {
    // Double quotes delimit a name, not a string.
    const result = app.postgres('SELECT "Mi| FROM cards');
    expect(columnLabels(result)).toContain("MixedCase");
    // The opening quote is already typed, so the name goes in without a
    // second pair.
    expect(applyOf(result, "MixedCase")).toBe("MixedCase");
    expect(applyOf(result, "select")).toBe("select");
  });
});

describe("identifiers are quoted when the dialect needs it", () => {
  it.each(DIALECTS)("quotes a reserved word used as a name (%s)", (dialect) => {
    const complete = app[dialect];
    const columns = complete("SELECT | FROM cards");
    expect(applyOf(columns, "select")).toBe('"select"');
    // The label is what the reader matches against; it stays as the name.
    expect(labels(columns)).not.toContain('"select"');
    expect(applyOf(complete("SELECT * FROM "), "order")).toBe('"order"');
    expect(applyOf(complete("SELECT c.| FROM cards c"), "select")).toBe('"select"');
    expect(applyOf(complete("INSERT INTO cards ("), "select")).toBe('"select"');
  });

  it.each(DIALECTS)("leaves ordinary names bare (%s)", (dialect) => {
    const complete = app[dialect];
    const cards = complete("SELECT | FROM cards");
    expect(applyOf(cards, "status")).toBe("status");
    expect(applyOf(cards, "user_id")).toBe("user_id");
    expect(applyOf(complete('SELECT | FROM "order"'), "date")).toBe("date");
    expect(applyOf(complete("SELECT | FROM users"), "name")).toBe("name");
    expect(applyOf(complete("SELECT * FROM "), "users")).toBe("users");
  });

  it("quotes a mixed-case name on Postgres only", () => {
    const doc = "SELECT | FROM cards";
    // Unquoted, Postgres folds it to `mixedcase` and finds no such column.
    expect(applyOf(app.postgres(doc), "MixedCase")).toBe('"MixedCase"');
    // SQLite and DuckDB match names case-insensitively.
    expect(applyOf(app.sqlite(doc), "MixedCase")).toBe("MixedCase");
    expect(applyOf(app.duckdb(doc), "MixedCase")).toBe("MixedCase");
  });

  it("quotes `user` on Postgres, where it means current_user", () => {
    const doc = 'SELECT | FROM "order"';
    expect(applyOf(app.postgres(doc), "user")).toBe('"user"');
    expect(applyOf(app.sqlite(doc), "user")).toBe("user");
    expect(applyOf(app.duckdb(doc), "user")).toBe("user");
  });

  it("quotes inside ambiguous and join-condition suggestions", () => {
    const fkSchema: SqlCompletionSchema = {
      entities: [
        { name: "Orders", kind: "table", columns: ["Id", "user"] },
        {
          name: "items",
          kind: "table",
          columns: ["Id", "order_id"],
          foreignKeys: [{ column: "order_id", refEntity: "Orders", refColumn: "Id" }],
        },
      ],
    };
    const pg = makeComplete({ dialect: "postgres" }, fkSchema);
    const joined = pg('SELECT * FROM "Orders" o JOIN items i ON ');
    expect(applyOf(joined, "i.order_id = o.Id")).toBe('i.order_id = o."Id"');
    expect(applyOf(joined, "o.Id")).toBe('o."Id"');
    const unaliased = pg('SELECT * FROM "Orders" JOIN items ON ');
    expect(applyOf(unaliased, "Orders.Id")).toBe('"Orders"."Id"');
  });

  it("does not quote a name the statement itself declared bare", () => {
    // `Recent` and `Total` are unquoted, so Postgres knows them as `recent`
    // and `total`; quoting the mixed-case spelling would not resolve.
    const pg = app.postgres;
    const cte = pg("WITH Recent AS (SELECT user_id AS Uid FROM users) SELECT * FROM Rec|");
    expect(applyOf(cte, "recent")).toBe("recent");
    const alias = pg("SELECT COUNT(*) AS Total FROM users ORDER BY ");
    expect(applyOf(alias, "total")).toBe("total");
    // Declared quoted, it has to be quoted again.
    const quoted = pg('SELECT COUNT(*) AS "Total" FROM users ORDER BY ');
    expect(applyOf(quoted, "Total")).toBe('"Total"');
    // SQLite keeps the reader's spelling; either case resolves there.
    expect(
      applyOf(
        app.sqlite("WITH Recent AS (SELECT user_id FROM users) SELECT * FROM Rec|"),
        "Recent",
      ),
    ).toBe("Recent");
  });
});

describe("function catalog per dialect", () => {
  const functionsOf = (dialect: (typeof DIALECTS)[number]) =>
    new Set(
      (app[dialect]("SELECT ", true)?.options ?? [])
        .filter((option) => option.type === "function")
        .map((option) => option.label),
    );
  // Absent from duckdb_functions() in duckdb-wasm 1.32.
  const missingInDuckDb = [
    "TO_CHAR",
    "TO_DATE",
    "TO_NUMBER",
    "JSON_AGG",
    "JSONB_AGG",
    "JSON_BUILD_OBJECT",
    "JSONB_BUILD_OBJECT",
    "JSON_OBJECT_AGG",
    "JSONB_OBJECT_AGG",
    "REGEXP_MATCH",
    "INITCAP",
    "LIST_AGG",
  ];

  it("does not offer DuckDB the Postgres functions it lacks", () => {
    const duckdb = functionsOf("duckdb");
    expect(missingInDuckDb.filter((fn) => duckdb.has(fn))).toEqual([]);
  });

  it("keeps the rest of the shared surface for DuckDB", () => {
    const duckdb = functionsOf("duckdb");
    // Syntax-level and window functions are not in that catalog but exist.
    for (const fn of [
      "EXTRACT",
      "CURRENT_DATE",
      "ROW_NUMBER",
      "RANK",
      "LAG",
      "DATE_TRUNC",
      "STRING_AGG",
      "REGEXP_MATCHES",
      "STRFTIME",
      "LIST",
    ]) {
      expect(duckdb.has(fn), fn).toBe(true);
    }
  });

  it("still offers Postgres its own functions", () => {
    const postgres = functionsOf("postgres");
    for (const fn of missingInDuckDb.filter((name) => name !== "LIST_AGG")) {
      expect(postgres.has(fn), fn).toBe(true);
    }
  });

  it("shows STRFTIME with each dialect's argument order", () => {
    expect(findOption(app.sqlite("SELECT ", true), "STRFTIME")?.detail).toBe(
      "(format, timevalue)",
    );
    expect(findOption(app.duckdb("SELECT ", true), "STRFTIME")?.detail).toBe(
      "(timestamp, format)",
    );
  });
});

describe("derived tables and CTEs expose their columns", () => {
  it.each(DIALECTS)("expands * in a CTE body (%s)", (dialect) => {
    const complete = app[dialect];
    expect(
      labels(complete("WITH recent AS (SELECT * FROM users) SELECT r.| FROM recent r")),
    ).toEqual(["*", "user_id", "name", "manager_id"]);
    // Unqualified completion in the outer query sees them too, once: the
    // table inside the CTE is not in the outer query's scope.
    expect(
      columnLabels(complete("WITH recent AS (SELECT * FROM users) SELECT | FROM recent r")),
    ).toEqual(["user_id", "name", "manager_id"]);
  });

  it.each(DIALECTS)("expands * in an aliased subquery (%s)", (dialect) => {
    const complete = app[dialect];
    expect(labels(complete("SELECT s.| FROM (SELECT * FROM users) s"))).toEqual([
      "*",
      "user_id",
      "name",
      "manager_id",
    ]);
    expect(
      columnLabels(complete("SELECT | FROM (SELECT * FROM users) s")),
    ).toEqual(["user_id", "name", "manager_id"]);
  });

  it("reads plain columns, qualified columns and aliases off the SELECT list", () => {
    const result = app.sqlite(
      "SELECT s.| FROM (SELECT u.user_id, name AS who, COUNT(*) n, UPPER(name), c.* FROM users u JOIN cards c ON c.user_id = u.user_id) s",
    );
    // `UPPER(name)` has no name the engines agree on, so it is left out;
    // `c.*` adds the cards columns the list has not already named.
    expect(labels(result)).toEqual([
      "*",
      "user_id",
      "who",
      "n",
      "card_id",
      "select",
      "MixedCase",
      "status",
    ]);
    // A plain column keeps its declared type.
    expect(findOption(result, "user_id")?.detail).toBe("INTEGER");
  });

  it("lets an explicit CTE column list win", () => {
    const doc = "WITH x(a, b) AS (SELECT user_id, name FROM users) SELECT ";
    expect(labels(app.sqlite(`${doc}x.| FROM x`))).toEqual(["*", "a", "b"]);
    expect(columnLabels(app.sqlite(`${doc}| FROM x`))).toEqual(["a", "b"]);
  });

  it("follows one CTE into the next", () => {
    const result = app.sqlite(
      "WITH a AS (SELECT user_id, name FROM users), b AS (SELECT a.*, 1 AS one FROM a) SELECT b.| FROM b",
    );
    expect(labels(result)).toEqual(["*", "user_id", "name", "one"]);
  });

  it("qualifies by the derived table's alias when a join makes a column ambiguous", () => {
    const result = app.sqlite(
      "SELECT * FROM users u JOIN (SELECT user_id, COUNT(*) AS n FROM cards GROUP BY user_id) k ON ",
    );
    expect(columnLabels(result)).toEqual([
      "u.user_id",
      "name",
      "manager_id",
      "k.user_id",
      "n",
    ]);
  });

  it("scopes columns to the SELECT the cursor is in", () => {
    // Inside the CTE body the outer query's tables are not visible.
    expect(
      columnLabels(app.sqlite("WITH r AS (SELECT | FROM users) SELECT * FROM cards")),
    ).toEqual(["user_id", "name", "manager_id"]);
    // A table named only in a subquery does not leak into the outer query.
    expect(
      columnLabels(
        app.sqlite("SELECT | FROM users WHERE user_id IN (SELECT user_id FROM cards)"),
      ),
    ).toEqual(["user_id", "name", "manager_id"]);
    // A correlated subquery does see out, and resolves the outer alias.
    expect(
      labels(
        app.sqlite(
          "SELECT * FROM users u WHERE EXISTS (SELECT 1 FROM cards c WHERE c.user_id = u.|)",
        ),
      ),
    ).toEqual(["*", "user_id", "name", "manager_id"]);
  });

  it("falls back when the SELECT list cannot be read", () => {
    // `*` over a table function: the columns could be anything.
    expect(
      labels(app.duckdb("WITH r AS (SELECT * FROM read_csv('f.csv')) SELECT r.| FROM r")),
    ).toEqual(["*"]);
    // A recursive CTE that only ever selects from itself must not loop.
    expect(
      labels(app.sqlite("WITH RECURSIVE t AS (SELECT * FROM t) SELECT t.| FROM t")),
    ).toEqual(["*"]);
    // Not a SELECT at all, so there is no list to read.
    expect(
      labels(app.sqlite("WITH r AS (VALUES (1, 2)) SELECT r.| FROM r")),
    ).toEqual(["*"]);
  });
});

describe("schema qualifiers list only that schema's tables", () => {
  const tagged: SqlCompletionSchema = {
    schemas: ["public", "analytics", "pg_catalog"],
    entities: [
      { name: "users", kind: "table", columns: ["id"] },
      { name: "events", kind: "table", columns: ["id"], schema: "analytics" },
      { name: "pg_class", kind: "table", columns: ["oid"], schema: "pg_catalog" },
    ],
  };

  it("lists nothing for a system schema the entities are not in", () => {
    expect(app.postgres("SELECT * FROM pg_catalog.|")).toBeNull();
    expect(app.postgres("SELECT * FROM information_schema.|")).toBeNull();
  });

  it("lists untagged entities under the default schema only", () => {
    expect(labels(app.postgres("SELECT * FROM public.|"))).toEqual([
      "users",
      "cards",
      "order",
    ]);
    expect(labels(app.sqlite("SELECT * FROM main.|"))).toEqual([
      "users",
      "cards",
      "order",
    ]);
    expect(labels(app.duckdb("SELECT * FROM main.|"))).toEqual([
      "users",
      "cards",
      "order",
    ]);
    // `public` is not a SQLite or DuckDB schema, `main` not a Postgres one.
    expect(app.sqlite("SELECT * FROM public.|")).toBeNull();
    expect(app.postgres("SELECT * FROM main.|")).toBeNull();
    expect(app.sqlite("SELECT * FROM temp.|")).toBeNull();
  });

  it("uses the entity's own schema when it carries one", () => {
    const pg = makeComplete({ dialect: "postgres" }, tagged);
    expect(labels(pg("SELECT * FROM public.|"))).toEqual(["users"]);
    expect(labels(pg("SELECT * FROM analytics.|"))).toEqual(["events"]);
    expect(labels(pg("SELECT * FROM pg_catalog.|"))).toEqual(["pg_class"]);
  });

  it("does not list a statement's CTEs under a schema", () => {
    expect(
      labels(app.postgres("WITH r AS (SELECT 1) SELECT * FROM public.|")),
    ).toEqual(["users", "cards", "order"]);
  });
});

describe("an empty table slot offers only what can start a table reference", () => {
  it.each(DIALECTS)("offers no trailing-clause keywords after FROM (%s)", (dialect) => {
    const result = app[dialect]("SELECT * FROM ");
    expect(labels(result).slice(0, 3)).toEqual(["users", "cards", "order"]);
    const keywords = keywordLabels(result);
    for (const keyword of ["AS", "JOIN", "WHERE", "ANTI", "ASOF", "SELECT", "COUNT"]) {
      expect(keywords, keyword).not.toContain(keyword);
    }
  });

  it("keeps what can open a reference", () => {
    expect(keywordLabels(app.sqlite("SELECT * FROM "))).toEqual([]);
    expect(keywordLabels(app.postgres("SELECT * FROM "))).toEqual([
      "LATERAL",
      "GENERATE_SERIES",
      "UNNEST",
    ]);
    expect(keywordLabels(app.duckdb("SELECT * FROM "))).toEqual(
      expect.arrayContaining(["LATERAL", "READ_CSV", "READ_PARQUET", "RANGE"]),
    );
  });

  it("applies after JOIN and after a comma in the FROM list too", () => {
    expect(keywordLabels(app.sqlite("SELECT * FROM users u JOIN "))).toEqual([]);
    expect(keywordLabels(app.sqlite("SELECT * FROM users, "))).toEqual([]);
    expect(keywordLabels(app.sqlite("SELECT * FROM us|"))).toEqual([]);
  });

  it("offers a subquery start inside the paren", () => {
    expect(keywordLabels(app.sqlite("SELECT * FROM (", true))).toEqual([
      "SELECT",
      "WITH",
      "VALUES",
    ]);
  });

  it("brings the clause keywords back once a table is written", () => {
    const top = topKeywords(app.duckdb("SELECT * FROM users ", true), 30);
    expect(top).toEqual(
      expect.arrayContaining(["WHERE", "JOIN", "AS", "ANTI", "ASOF"]),
    );
  });
});

describe("an ambiguous column is found by its name, not its qualifier", () => {
  const users = {
    name: "users",
    kind: "table" as const,
    columns: [{ name: "user_id", type: "INTEGER" }, { name: "name", type: "TEXT" }],
  };
  const cards = {
    name: "cards",
    kind: "table" as const,
    columns: [{ name: "card_id", type: "INTEGER" }, { name: "user_id", type: "INTEGER" }],
  };
  const source = makeComplete({ dialect: "postgres" }, { entities: [users, cards] });

  it("matches on the bare column and shows the alias", () => {
    const result = source(
      "SELECT * FROM cards c JOIN users u ON c.user_id = u.user_id WHERE user|",
    );
    const column = result?.options.find((o) => o.displayLabel === "u.user_id");
    // `label` is what CodeMirror filters and ranks on. With the qualifier in
    // it, typing `user` hit `u.user_id` mid-word and a table called `users`
    // outranked the column.
    expect(column?.label).toBe("user_id");
    expect(column?.apply).toBe("u.user_id");
  });
});

describe("what a bare Enter may take", () => {
  const source = makeComplete({ dialect: "postgres" });
  const accepts = (doc: string, label: string) => {
    const option = findOption(source(doc), label);
    expect(option, `${label} should be offered for ${doc}`).toBeDefined();
    return completionAcceptsEnter(option!);
  };

  it("takes columns that are in scope", () => {
    expect(accepts("SELECT na| FROM customers", "name")).toBe(true);
  });

  it("takes the keyword the grammar expects next", () => {
    expect(accepts("SEL|", "SELECT")).toBe(true);
    expect(accepts("SELECT * FRO|", "FROM")).toBe(true);
  });

  it("does not take a loosely matched keyword for a column typed before its FROM", () => {
    // These rewrote what the reader had typed: name -> rename, id -> uuid,
    // value -> values, data -> database.
    expect(accepts("SELECT name|", "RENAME")).toBe(false);
    expect(accepts("SELECT id|", "UUID")).toBe(false);
    expect(accepts("SELECT value|", "VALUES")).toBe(false);
    expect(accepts("SELECT data|", "DATABASE")).toBe(false);
  });

  it("does not take a function while the columns are unknown, and does once they are known", () => {
    expect(accepts("SELECT date|", "DATE_PART")).toBe(false);
    expect(accepts("SELECT cou| FROM customers", "COUNT")).toBe(true);
  });

  it("takes a table only where a table goes", () => {
    expect(accepts("SELECT * FROM cust|", "customers")).toBe(true);
    expect(accepts("SELECT cust|", "customers")).toBe(false);
  });
});

describe("statement shapes that used to lose scope", () => {
  it("keeps a comma-joined table that sits on its own line", () => {
    const oneLine = labels(complete("SELECT  FROM customers c, orders o WHERE o.|"));
    const multiLine = labels(complete("SELECT *\nFROM customers c,\n     orders o\nWHERE o.|"));
    expect(oneLine).toContain("customer_id");
    expect(multiLine).toEqual(oneLine);
  });

  it("reads the outer SELECT list, not a CTE's, for ORDER BY aliases", () => {
    const result = labels(
      complete(
        "WITH big AS (SELECT id AS inner_id, total FROM orders WHERE total > 100)\n" +
          "SELECT total AS amount FROM big ORDER BY ",
      ),
    );
    expect(result).toContain("amount");
    const cteOnly = complete(
      "WITH big AS (SELECT total AS hidden_alias FROM orders)\nSELECT total FROM big ORDER BY ",
    );
    expect(findOption(cteOnly, "hidden_alias")?.detail).not.toBe("alias");
  });
});
