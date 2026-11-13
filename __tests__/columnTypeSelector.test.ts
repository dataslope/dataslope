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

  it("puts the best match first, because Enter takes the first row", () => {
    // Typing `int` listed `smallint` first, and Enter committed it.
    const typed = computeVisibleTypeGroups(PG_GROUPS, PG_OPTIONS, "int", "text");
    expect(typed[0].types[0]).toBe("integer");
    expect(typed[0].types).toEqual(["integer", "smallint", "bigint"]);
  });

  it("keeps filtering when a complete built-in type has been typed", () => {
    // An exact match used to bring the whole list back, with its first row
    // (not the typed type) highlighted.
    const groups = computeVisibleTypeGroups(PG_GROUPS, PG_OPTIONS, "TEXT", "integer");
    expect(groups).toEqual([{ label: "Text", types: ["text"] }]);
    const partial = computeVisibleTypeGroups(PG_GROUPS, PG_OPTIONS, "varchar", "integer");
    expect(partial[0].types[0]).toBe("varchar");
  });

  it("orders groups by their best match", () => {
    const groups = computeVisibleTypeGroups(PG_GROUPS, PG_OPTIONS, "t", "integer");
    // `text` and `timestamp` start with the fragment; the number types only
    // contain it.
    expect(groups.map((g) => g.label)).toEqual(["Text", "Date / time", "Numbers"]);
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
