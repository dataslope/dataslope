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
});
