import { describe, expect, it } from "vitest";
import {
  computeVisibleTypeGroups,
  withCurrentTypeOption,
} from "../app/_components/sql/utils/columnTypeSelector";

// A representative subset of the real Postgres type groups.
const PG_GROUPS = [
  { label: "Numbers", types: ["smallint", "integer", "bigint", "numeric"] },
  { label: "Text", types: ["text", "varchar", "varchar(255)", "char"] },
  { label: "Date / time", types: ["date", "timestamp"] },
] as const;
const PG_OPTIONS = PG_GROUPS.flatMap((g) => g.types);

describe("computeVisibleTypeGroups", () => {
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

  it("filters to matching types once the user types a new search fragment", () => {
    const groups = computeVisibleTypeGroups(PG_GROUPS, PG_OPTIONS, "var", "text");
    expect(groups).toEqual([{ label: "Text", types: ["varchar", "varchar(255)"] }]);
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
});
