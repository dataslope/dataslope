/**
 * Turning a dropped workbook into a database. The script this builds is fed
 * to each playground's existing "load a SQL dump" path, so it has to be valid
 * in all three dialects and survive the things real spreadsheets contain:
 * sheet names that are not identifiers, duplicate headers, apostrophes, and
 * columns whose values disagree with the type inferred for them.
 */
import { describe, expect, it } from "vitest";
import {
  sqlLiteralFor,
  tableNameFromSheet,
  uniqueTableNames,
  workbookToSqlScript,
} from "../app/_components/sql/utils/workbookImport";
import type { XlsxSheet } from "../app/_components/sql/utils/xlsxReader";

function sheet(name: string, headers: string[], rows: string[][]): XlsxSheet {
  return { name, headers, rows };
}

describe("table names", () => {
  it("makes an identifier out of a sheet tab name", () => {
    expect(tableNameFromSheet("Sales")).toBe("Sales");
    expect(tableNameFromSheet("Q1 Sales (2024)")).toBe("Q1_Sales_2024");
    expect(tableNameFromSheet("  spaced  ")).toBe("spaced");
  });

  it("does not start a name with a digit", () => {
    expect(tableNameFromSheet("2024 Sales")).toBe("_2024_Sales");
  });

  it("falls back for a name with nothing usable in it", () => {
    expect(tableNameFromSheet("!!!")).toBe("sheet");
  });

  it("keeps sheets apart when they sanitise to the same name", () => {
    expect(uniqueTableNames(["Q1 Sales", "Q1/Sales", "Q1-Sales"])).toEqual([
      "Q1_Sales",
      "Q1_Sales_2",
      "Q1_Sales_3",
    ]);
  });
});

describe("cell literals", () => {
  it("writes an empty cell as NULL", () => {
    expect(sqlLiteralFor("", "text")).toBe("NULL");
    expect(sqlLiteralFor("   ", "bigint")).toBe("NULL");
  });

  it("writes numbers and booleans unquoted", () => {
    expect(sqlLiteralFor("42", "bigint")).toBe("42");
    expect(sqlLiteralFor("-7", "bigint")).toBe("-7");
    expect(sqlLiteralFor("3.5", "double precision")).toBe("3.5");
    expect(sqlLiteralFor("TRUE", "boolean")).toBe("TRUE");
    expect(sqlLiteralFor("no", "boolean")).toBe("FALSE");
  });

  it("quotes a value that disagrees with its column's type", () => {
    // One stray word in a numeric column must not produce invalid SQL.
    expect(sqlLiteralFor("n/a", "bigint")).toBe("'n/a'");
    expect(sqlLiteralFor("maybe", "boolean")).toBe("'maybe'");
  });

  it("escapes apostrophes", () => {
    expect(sqlLiteralFor("O'Hara", "text")).toBe("'O''Hara'");
  });
});

describe("workbookToSqlScript", () => {
  const workbook = [
    sheet(
      "Sales",
      ["product", "qty", "price"],
      [
        ["Widget", "3", "9.99"],
        ["O'Hara's", "12", "1.5"],
        ["Missing", "", ""],
      ],
    ),
    sheet("Regions", ["region"], [["West"]]),
  ];

  it("creates one table per sheet, typed from the values", () => {
    const { sql, tables } = workbookToSqlScript(workbook, { dialect: "sqlite" });
    expect(tables).toEqual(["Sales", "Regions"]);
    expect(sql).toContain('CREATE TABLE "Sales"');
    expect(sql).toContain('"qty" INTEGER');
    expect(sql).toContain('"price" REAL');
    expect(sql).toContain('"product" TEXT');
    expect(sql).toContain('CREATE TABLE "Regions"');
  });

  it("writes rows as batched INSERTs with escaped values", () => {
    const { sql } = workbookToSqlScript(workbook, { dialect: "postgres" });
    expect(sql).toContain("'O''Hara''s'");
    // The blank row becomes NULLs, not empty strings.
    expect(sql).toContain("('Missing', NULL, NULL)");
    // One INSERT for the sheet, not one per row.
    expect(sql.match(/INSERT INTO "Sales"/g)).toHaveLength(1);
  });

  it("batches large sheets so no single statement grows unbounded", () => {
    const rows = Array.from({ length: 450 }, (_, i) => [`row${i}`]);
    const { sql } = workbookToSqlScript([sheet("Big", ["label"], rows)], {
      dialect: "duckdb",
      rowsPerInsert: 200,
    });
    expect(sql.match(/INSERT INTO "Big"/g)).toHaveLength(3);
  });

  it("keeps duplicate headers as separate columns", () => {
    const { sql } = workbookToSqlScript(
      [sheet("S", ["name", "name"], [["a", "b"]])],
      { dialect: "sqlite" },
    );
    expect(sql).toContain('"name" TEXT');
    expect(sql).toContain('"name_2" TEXT');
  });

  it("skips empty sheets and names them, rather than emitting a table with no columns", () => {
    const { sql, tables, skipped } = workbookToSqlScript(
      [sheet("Data", ["a"], [["1"]]), sheet("Notes", [], [])],
      { dialect: "sqlite" },
    );
    expect(tables).toEqual(["Data"]);
    expect(skipped).toEqual(["Notes"]);
    expect(sql).not.toContain("Notes");
  });
});
