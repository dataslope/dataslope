import { describe, expect, it } from "vitest";
import {
  parseResultFilter,
  rowMatchesResultFilter,
  filterResultRowIndices,
  canClientFilterResult,
  buildResultFilterWhere,
} from "../app/_components/sql/utils/resultFilter";

const COLS = ["id", "name", "email", "active"];

describe("parseResultFilter", () => {
  it("scopes to a column when the prefix names a real column", () => {
    expect(parseResultFilter("name:alice", COLS)).toEqual({
      column: "name",
      term: "alice",
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
});

describe("filterResultRowIndices", () => {
  const values = [
    [1, "Alice", "alice@x.com", true],
    [2, "Bob", "bob@y.com", false],
    [3, "Carol", "carol@x.com", true],
    [4, null, "dave@z.com", true],
  ];

  it("returns indices into the ORIGINAL array (so edits/selection stay correct)", () => {
    expect(filterResultRowIndices(values, COLS, "carol")).toEqual([2]);
  });
});

describe("canClientFilterResult", () => {
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
});

describe("buildResultFilterWhere", () => {
  it("returns null for a blank term (caller queries without WHERE)", () => {
    expect(buildResultFilterWhere(COLS, "", "sqlite")).toBeNull();
    expect(buildResultFilterWhere(COLS, "   ", "postgres")).toBeNull();
    // A column scope with an empty term ("name:") also has no term.
    expect(buildResultFilterWhere(COLS, "name:", "sqlite")).toBeNull();
  });

  it("uses ILIKE for Postgres and DuckDB", () => {
    expect(buildResultFilterWhere(["name"], "bob", "postgres")).toBe(
      `CAST("name" AS TEXT) ILIKE '%bob%' ESCAPE '\\'`,
    );
    expect(buildResultFilterWhere(["name"], "bob", "duckdb")).toBe(
      `CAST("name" AS TEXT) ILIKE '%bob%' ESCAPE '\\'`,
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
