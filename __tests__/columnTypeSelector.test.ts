import { describe, expect, it } from "vitest";
import {
  computeVisibleTypeGroups,
  withCurrentTypeOption,
} from "../app/_components/sql/utils/columnTypeSelector";

// Representative subsets of the real Postgres / DuckDB type groups.
const PG_GROUPS = [
  { label: "Numbers", types: ["smallint", "integer", "bigint", "numeric"] },
  { label: "Text", types: ["text", "varchar", "varchar(255)", "char"] },
  { label: "Date / time", types: ["date", "timestamp"] },
] as const;
const PG_OPTIONS = PG_GROUPS.flatMap((g) => g.types);

const DUCKDB_GROUPS = [
  { label: "Numbers", types: ["INTEGER", "BIGINT", "DECIMAL(18,3)"] },
  { label: "Text", types: ["VARCHAR", "VARCHAR(255)", "TEXT"] },
] as const;
const DUCKDB_OPTIONS = DUCKDB_GROUPS.flatMap((g) => g.types);

describe("computeVisibleTypeGroups", () => {
  it("shows every group when the input is empty", () => {
    const groups = computeVisibleTypeGroups(PG_GROUPS, PG_OPTIONS, "", "text");
    expect(groups.map((g) => g.label)).toEqual([
      "Numbers",
      "Text",
      "Date / time",
    ]);
    expect(groups.flatMap((g) => g.types)).toEqual(PG_OPTIONS);
  });

  it("shows every group for a committed Postgres type absent from the list (character varying)", () => {
    // Regression: opening the picker for `categories.category_name` used to
    // show "No matching built-in types" instead of the full list.
    const groups = computeVisibleTypeGroups(
      PG_GROUPS,
      PG_OPTIONS,
      "character varying(15)",
      "character varying(15)",
    );
    expect(groups.flatMap((g) => g.types)).toEqual(PG_OPTIONS);
  });

  it("shows every group for a parameterized committed type (varchar(15))", () => {
    const groups = computeVisibleTypeGroups(
      PG_GROUPS,
      PG_OPTIONS,
      "varchar(15)",
      "varchar(15)",
    );
    expect(groups.flatMap((g) => g.types)).toEqual(PG_OPTIONS);
  });

  it("shows every group for a committed DuckDB type absent from the list (DECIMAL(10,2))", () => {
    const groups = computeVisibleTypeGroups(
      DUCKDB_GROUPS,
      DUCKDB_OPTIONS,
      "DECIMAL(10,2)",
      "DECIMAL(10,2)",
    );
    expect(groups.flatMap((g) => g.types)).toEqual(DUCKDB_OPTIONS);
  });

  it("normalizes case and whitespace when comparing to the committed value", () => {
    const groups = computeVisibleTypeGroups(
      PG_GROUPS,
      PG_OPTIONS,
      "  Character Varying(15) ",
      "character varying(15)",
    );
    expect(groups.flatMap((g) => g.types)).toEqual(PG_OPTIONS);
  });

  it("filters to matching types once the user types a new search fragment", () => {
    const groups = computeVisibleTypeGroups(PG_GROUPS, PG_OPTIONS, "var", "text");
    expect(groups).toEqual([{ label: "Text", types: ["varchar", "varchar(255)"] }]);
  });

  it("returns no groups when the fragment matches nothing (genuine no-match)", () => {
    expect(computeVisibleTypeGroups(PG_GROUPS, PG_OPTIONS, "zzz", "text")).toEqual(
      [],
    );
  });

  it("still shows every group when a complete known type is typed", () => {
    const groups = computeVisibleTypeGroups(
      PG_GROUPS,
      PG_OPTIONS,
      "integer",
      "text",
    );
    expect(groups.flatMap((g) => g.types)).toEqual(PG_OPTIONS);
  });
});

describe("withCurrentTypeOption", () => {
  const SQLITE_TYPES = [
    "INTEGER",
    "REAL",
    "TEXT",
    "BLOB",
    "NUMERIC",
    "BOOLEAN",
    "DATETIME",
  ];

  it("leaves the list unchanged for a built-in type", () => {
    expect(withCurrentTypeOption(SQLITE_TYPES, "INTEGER")).toEqual(SQLITE_TYPES);
  });

  it("ignores surrounding whitespace when matching a built-in type", () => {
    expect(withCurrentTypeOption(SQLITE_TYPES, "  TEXT  ")).toEqual(SQLITE_TYPES);
  });

  it("prepends a custom declared type so it stays selectable", () => {
    expect(withCurrentTypeOption(SQLITE_TYPES, "VARCHAR(15)")).toEqual([
      "VARCHAR(15)",
      ...SQLITE_TYPES,
    ]);
  });

  it("prepends a case-mismatched type (native select needs an exact match)", () => {
    expect(withCurrentTypeOption(SQLITE_TYPES, "integer")).toEqual([
      "integer",
      ...SQLITE_TYPES,
    ]);
  });

  it("leaves the list unchanged for an empty type", () => {
    expect(withCurrentTypeOption(SQLITE_TYPES, "")).toEqual(SQLITE_TYPES);
  });
});
