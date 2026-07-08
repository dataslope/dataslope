import { describe, expect, it } from "vitest";
import {
  parseResultFilter,
  rowMatchesResultFilter,
  filterResultRowIndices,
  canClientFilterResult,
  buildResultFilterWhere,
  dialectFromEngineLabel,
} from "../app/_components/sql/utils/resultFilter";

const COLS = ["id", "name", "email", "active"];

describe("parseResultFilter", () => {
  it("returns an empty filter for blank input", () => {
    expect(parseResultFilter("", COLS)).toEqual({ column: null, term: "" });
    expect(parseResultFilter("   ", COLS)).toEqual({ column: null, term: "" });
  });

  it("treats plain text as an any-column term (lower-cased)", () => {
    expect(parseResultFilter("Alice", COLS)).toEqual({
      column: null,
      term: "alice",
    });
  });

  it("scopes to a column when the prefix names a real column", () => {
    expect(parseResultFilter("name:alice", COLS)).toEqual({
      column: "name",
      term: "alice",
    });
  });

  it("matches the column name case-insensitively", () => {
    expect(parseResultFilter("Email:foo@bar", COLS)).toEqual({
      column: "email",
      term: "foo@bar",
    });
  });

  it("trims whitespace around the prefix and term", () => {
    expect(parseResultFilter("  name :  Bob  ", COLS)).toEqual({
      column: "name",
      term: "bob",
    });
  });

  it("keeps a column scope with an empty term (mid-typing 'name:')", () => {
    expect(parseResultFilter("name:", COLS)).toEqual({
      column: "name",
      term: "",
    });
  });

  it("does NOT scope when the prefix is not a real column", () => {
    expect(parseResultFilter("note:hello", COLS)).toEqual({
      column: null,
      term: "note:hello",
    });
  });

  it("treats a value containing a colon (e.g. a time) as a whole term", () => {
    // The token before the colon ("12") isn't a valid identifier start, so the
    // whole thing is a term, the user can search for "12:30".
    expect(parseResultFilter("12:30", COLS)).toEqual({
      column: null,
      term: "12:30",
    });
  });
});

describe("rowMatchesResultFilter", () => {
  const parsed = (raw: string) => parseResultFilter(raw, COLS);

  it("matches an empty term against every row", () => {
    expect(rowMatchesResultFilter([1, "Alice"], COLS, parsed(""))).toBe(true);
    expect(rowMatchesResultFilter([1, "Alice"], COLS, parsed("name:"))).toBe(
      true,
    );
  });

  it("matches a substring in any column (case-insensitive)", () => {
    const row = [1, "Alice", "alice@x.com", true];
    expect(rowMatchesResultFilter(row, COLS, parsed("ALI"))).toBe(true);
    expect(rowMatchesResultFilter(row, COLS, parsed("x.com"))).toBe(true);
    expect(rowMatchesResultFilter(row, COLS, parsed("zzz"))).toBe(false);
  });

  it("matches numbers by their displayed text", () => {
    const row = [42, "Bob"];
    expect(rowMatchesResultFilter(row, COLS, parsed("42"))).toBe(true);
    expect(rowMatchesResultFilter(row, COLS, parsed("4"))).toBe(true);
  });

  it("respects a column scope", () => {
    const row = [1, "Alice", "bob@x.com", true];
    // "bob" is in email, not name → name-scoped search misses it.
    expect(rowMatchesResultFilter(row, COLS, parsed("name:bob"))).toBe(false);
    expect(rowMatchesResultFilter(row, COLS, parsed("email:bob"))).toBe(true);
  });

  it("matches NULL cells against the literal 'null'", () => {
    const row = [1, null, "x@y.com", false];
    expect(rowMatchesResultFilter(row, COLS, parsed("null"))).toBe(true);
    expect(rowMatchesResultFilter(row, COLS, parsed("name:null"))).toBe(true);
  });

  it("matches the displayed text of arrays and blobs", () => {
    // DuckDB LIST arrives as a JS array → formatCellValue renders "[10, 20, 30]".
    expect(rowMatchesResultFilter([[10, 20, 30]], ["nums"], parsed("20"))).toBe(
      true,
    );
    // A Uint8Array renders as "BLOB (n bytes)".
    expect(
      rowMatchesResultFilter([new Uint8Array([1, 2, 3])], ["data"], parsed("blob")),
    ).toBe(true);
  });

  it("matches booleans by their displayed text", () => {
    expect(rowMatchesResultFilter([true], ["active"], parsed("true"))).toBe(
      true,
    );
    expect(rowMatchesResultFilter([false], ["active"], parsed("true"))).toBe(
      false,
    );
  });
});

describe("filterResultRowIndices", () => {
  const values = [
    [1, "Alice", "alice@x.com", true],
    [2, "Bob", "bob@y.com", false],
    [3, "Carol", "carol@x.com", true],
    [4, null, "dave@z.com", true],
  ];

  it("returns every index for a blank query", () => {
    expect(filterResultRowIndices(values, COLS, "")).toEqual([0, 1, 2, 3]);
    expect(filterResultRowIndices(values, COLS, "   ")).toEqual([0, 1, 2, 3]);
  });

  it("returns matching indices in original order", () => {
    // "@x.com" appears in rows 0 and 2.
    expect(filterResultRowIndices(values, COLS, "@x.com")).toEqual([0, 2]);
  });

  it("returns indices into the ORIGINAL array (so edits/selection stay correct)", () => {
    expect(filterResultRowIndices(values, COLS, "carol")).toEqual([2]);
  });

  it("supports column-scoped queries", () => {
    expect(filterResultRowIndices(values, COLS, "name:bo")).toEqual([1]);
    // "x" appears in two emails but the name column has none.
    expect(filterResultRowIndices(values, COLS, "name:x")).toEqual([]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterResultRowIndices(values, COLS, "nonexistent")).toEqual([]);
  });

  it("finds NULL rows via 'null'", () => {
    expect(filterResultRowIndices(values, COLS, "name:null")).toEqual([3]);
  });
});

describe("canClientFilterResult", () => {
  it("is always true for a materialized (non-lazy) result", () => {
    expect(
      canClientFilterResult({
        isLazy: false,
        loadedRows: 10,
        totalRows: 9999,
        startIdx: 320,
      }),
    ).toBe(true);
  });

  it("is true for a lazy result that fit in a single page (all rows loaded)", () => {
    // e.g. 30-row table with the default page size of 50.
    expect(
      canClientFilterResult({
        isLazy: true,
        loadedRows: 30,
        totalRows: 30,
        startIdx: 0,
      }),
    ).toBe(true);
  });

  it("is false for a partially-loaded lazy result (more rows on the server)", () => {
    expect(
      canClientFilterResult({
        isLazy: true,
        loadedRows: 50,
        totalRows: 200,
        startIdx: 0,
      }),
    ).toBe(false);
  });

  it("is false for a lazy result paged past the first page", () => {
    // A later page is loaded, filtering it would only see that window.
    expect(
      canClientFilterResult({
        isLazy: true,
        loadedRows: 50,
        totalRows: 50,
        startIdx: 50,
      }),
    ).toBe(false);
  });

  it("is true for a fully-loaded 'All'/infinite lazy result", () => {
    expect(
      canClientFilterResult({
        isLazy: true,
        loadedRows: 500,
        totalRows: 500,
        startIdx: 0,
      }),
    ).toBe(true);
  });
});

describe("dialectFromEngineLabel", () => {
  it("maps engine labels to dialects (default SQLite)", () => {
    expect(dialectFromEngineLabel("PostgreSQL")).toBe("postgres");
    expect(dialectFromEngineLabel("DuckDB")).toBe("duckdb");
    expect(dialectFromEngineLabel("SQLite")).toBe("sqlite");
    expect(dialectFromEngineLabel(undefined)).toBe("sqlite");
    expect(dialectFromEngineLabel("something else")).toBe("sqlite");
  });
});

describe("buildResultFilterWhere", () => {
  it("returns null for a blank term (caller queries without WHERE)", () => {
    expect(buildResultFilterWhere(COLS, "", "sqlite")).toBeNull();
    expect(buildResultFilterWhere(COLS, "   ", "postgres")).toBeNull();
    // A column scope with an empty term ("name:") also has no term.
    expect(buildResultFilterWhere(COLS, "name:", "sqlite")).toBeNull();
  });

  it("ORs a case-insensitive substring across every column (SQLite → LIKE)", () => {
    const where = buildResultFilterWhere(COLS, "ali", "sqlite");
    expect(where).toBe(
      `(CAST("id" AS TEXT) LIKE '%ali%' ESCAPE '\\' OR ` +
        `CAST("name" AS TEXT) LIKE '%ali%' ESCAPE '\\' OR ` +
        `CAST("email" AS TEXT) LIKE '%ali%' ESCAPE '\\' OR ` +
        `CAST("active" AS TEXT) LIKE '%ali%' ESCAPE '\\')`,
    );
  });

  it("uses ILIKE for Postgres and DuckDB", () => {
    expect(buildResultFilterWhere(["name"], "bob", "postgres")).toBe(
      `CAST("name" AS TEXT) ILIKE '%bob%' ESCAPE '\\'`,
    );
    expect(buildResultFilterWhere(["name"], "bob", "duckdb")).toBe(
      `CAST("name" AS TEXT) ILIKE '%bob%' ESCAPE '\\'`,
    );
  });

  it("scopes to a single column for column:term (no OR wrapper)", () => {
    expect(buildResultFilterWhere(COLS, "name:alice", "sqlite")).toBe(
      `CAST("name" AS TEXT) LIKE '%alice%' ESCAPE '\\'`,
    );
  });

  it("escapes LIKE wildcards so they match literally", () => {
    // 50% → the % is escaped (matched literally), not a wildcard.
    expect(buildResultFilterWhere(["amount"], "50%", "sqlite")).toBe(
      `CAST("amount" AS TEXT) LIKE '%50\\%%' ESCAPE '\\'`,
    );
    // underscore is also a LIKE wildcard.
    expect(buildResultFilterWhere(["code"], "a_b", "sqlite")).toBe(
      `CAST("code" AS TEXT) LIKE '%a\\_b%' ESCAPE '\\'`,
    );
  });

  it("is injection-safe: single quotes are doubled, kept inside the literal", () => {
    const where = buildResultFilterWhere(
      ["name"],
      "'; DROP TABLE users; --",
      "sqlite",
    );
    // The whole payload stays inside one string literal (quote doubled), so it
    // can't break out into executable SQL.
    expect(where).toBe(
      `CAST("name" AS TEXT) LIKE '%''; drop table users; --%' ESCAPE '\\'`,
    );
  });

  it("quotes identifiers (defends against odd column names)", () => {
    expect(buildResultFilterWhere(['we"ird'], "x", "postgres")).toBe(
      `CAST("we""ird" AS TEXT) ILIKE '%x%' ESCAPE '\\'`,
    );
  });
});
