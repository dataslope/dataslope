import { describe, expect, it } from "vitest";
import {
  acceptsEmptyString,
  blankMeaning,
  missingRequired,
} from "@/app/_components/sql/components/AddRowDialog";
import type { TableColumnInfo } from "@/app/_components/runtime/sqlite";

function col(over: Partial<TableColumnInfo> & { name: string }): TableColumnInfo {
  return {
    cid: 0,
    type: "integer",
    notNull: false,
    defaultValue: null,
    pk: 0,
    generated: null,
    ...over,
  };
}

// `cards.card_id`: a plain `integer PRIMARY KEY` with no default.
const intKey = col({ name: "card_id", type: "integer", pk: 1, notNull: true });

describe("blankMeaning", () => {
  it("treats a lone INTEGER PRIMARY KEY as SQLite's rowid alias", () => {
    expect(blankMeaning(intKey, "sqlite", [intKey])).toBe("rowid");
  });

  // The bug: Postgres and DuckDB were told "auto (next rowid)" and then
  // failed the NOT NULL check when the field was left blank.
  it.each(["postgres", "duckdb"] as const)(
    "makes a plain integer key required on %s",
    (dialect) => {
      expect(blankMeaning(intKey, dialect, [intKey])).toBe("required");
    },
  );

  it("is not a rowid alias when the key spans two columns", () => {
    const a = col({ name: "a", type: "INTEGER", pk: 1 });
    const b = col({ name: "b", type: "INTEGER", pk: 2 });
    expect(blankMeaning(a, "sqlite", [a, b])).not.toBe("rowid");
  });

  it("is not a rowid alias unless the declared type is exactly INTEGER", () => {
    const k = col({ name: "id", type: "INT", pk: 1 });
    expect(blankMeaning(k, "sqlite", [k])).not.toBe("rowid");
  });

  it("lets an identity column fill itself in", () => {
    const k = col({ name: "id", pk: 1, notNull: true, identity: true });
    expect(blankMeaning(k, "postgres", [k])).toBe("identity");
  });

  it("lets a sequence default fill itself in", () => {
    const k = col({
      name: "id",
      pk: 1,
      notNull: true,
      defaultValue: "nextval('customers_id_seq')",
    });
    expect(blankMeaning(k, "duckdb", [k])).toBe("default");
  });

  it("sends NULL for a nullable column without a default", () => {
    const c = col({ name: "note", type: "text" });
    expect(blankMeaning(c, "postgres", [c])).toBe("null");
  });
});

describe("missingRequired", () => {
  const name = col({ name: "name", type: "varchar", notNull: true });
  const state = (values: Record<string, string>) => ({
    tableName: "t",
    columns: [intKey, name],
    values,
    addAnother: false,
  });

  it("lists blank required fields in column order", () => {
    expect(missingRequired(state({}), "postgres")).toEqual(["card_id", "name"]);
  });

  it("does not hold back SQLite's rowid alias", () => {
    expect(missingRequired(state({}), "sqlite")).toEqual(["name"]);
  });

  it("is empty once every required field has a value", () => {
    expect(
      missingRequired(state({ card_id: "21", name: "x" }), "duckdb"),
    ).toEqual([]);
  });
});

describe("acceptsEmptyString", () => {
  it.each([
    ["text", true],
    ["character varying(40)", true],
    ["VARCHAR", true],
    ["integer", false],
    ["date", false],
    ["boolean", false],
    ["numeric(10,2)", false],
  ])("%s → %s on postgres", (type, expected) => {
    expect(acceptsEmptyString(col({ name: "c", type }), "postgres")).toBe(expected);
  });

  it("accepts a type-less SQLite column", () => {
    expect(acceptsEmptyString(col({ name: "c", type: "" }), "sqlite")).toBe(true);
  });
});
