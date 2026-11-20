import { describe, expect, it } from "vitest";
import {
  cleanEngineError,
  getEngineErrorHint,
} from "@/app/_components/sql/utils/engineErrors";

describe("cleanEngineError", () => {
  it("drops sqlite-wasm's result-code prefix", () => {
    expect(
      cleanEngineError(
        "SQLITE_ERROR: sqlite3 result code 1: no such table: no_such_table",
      ),
    ).toBe("no such table: no_such_table");
    expect(
      cleanEngineError(
        "SQLITE_CONSTRAINT_UNIQUE: sqlite3 result code 2067: UNIQUE constraint failed: t.x",
      ),
    ).toBe("UNIQUE constraint failed: t.x");
  });

  it("leaves other engines' messages alone", () => {
    const pg = 'relation "no_such_table" does not exist';
    expect(cleanEngineError(pg)).toBe(pg);
  });
});

describe("getEngineErrorHint", () => {
  // The same mistake, as each engine reports it. SQLite's came with the
  // prefix and DuckDB's without quotes, so only Postgres ever got a hint.
  const missingTable = [
    ["SQLite", "SQLITE_ERROR: sqlite3 result code 1: no such table: no_such_table"],
    [
      "DuckDB",
      'Catalog Error: Table with name no_such_table does not exist!\nDid you mean "pg_tables"?\n\nLINE 1: SELECT * FROM no_such_table\n                      ^',
    ],
    ["PostgreSQL", 'relation "no_such_table" does not exist'],
  ] as const;

  it.each(missingTable)("explains a missing table on %s", (_engine, error) => {
    expect(getEngineErrorHint(error)).toBe(
      'Table or view "no_such_table" does not exist. Check the Tables pane for the ones that do.',
    );
  });

  const missingColumn = [
    ["SQLite", "SQLITE_ERROR: sqlite3 result code 1: no such column: nme"],
    [
      "DuckDB",
      'Binder Error: Referenced column "nme" not found in FROM clause!\nCandidate bindings: "name"',
    ],
    ["PostgreSQL", 'column "nme" does not exist'],
  ] as const;

  it.each(missingColumn)("explains a missing column on %s", (_engine, error) => {
    expect(getEngineErrorHint(error)).toMatch(/^Column "nme" was not found\./);
  });

  it("returns null when there is nothing to add", () => {
    expect(getEngineErrorHint("out of memory")).toBeNull();
  });
});
