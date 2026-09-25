import { describe, expect, it } from "vitest";
import {
  arrowTypeToSqlName,
  splitDuckDbStatements,
  parseDuckDbEnumValues,
  toDuckDbListLiteral,
} from "../app/_components/runtime/duckdb";

describe("arrowTypeToSqlName (result-header type labels)", () => {
  it("converts Arrow decimal notation to DECIMAL(p,s)", () => {
    expect(arrowTypeToSqlName("Decimal[38e+2]")).toBe("DECIMAL(38,2)");
    expect(arrowTypeToSqlName("Decimal[18e0]")).toBe("DECIMAL(18,0)");
    expect(arrowTypeToSqlName("Decimal[10e+5]")).toBe("DECIMAL(10,5)");
  });

  it("maps temporal types, distinguishing timestamptz", () => {
    expect(arrowTypeToSqlName("Date32<DAY>")).toBe("DATE");
    expect(arrowTypeToSqlName("Date64<MILLISECOND>")).toBe("DATE");
    expect(arrowTypeToSqlName("Time64<MICROSECOND>")).toBe("TIME");
    expect(arrowTypeToSqlName("Timestamp<MICROSECOND>")).toBe("TIMESTAMP");
    expect(arrowTypeToSqlName("Timestamp<MICROSECOND, UTC>")).toBe(
      "TIMESTAMP WITH TIME ZONE",
    );
    expect(arrowTypeToSqlName("Interval<MONTH_DAY_NANO>")).toBe("INTERVAL");
  });

  it("maps lists to []-suffixed element types, recursively", () => {
    expect(arrowTypeToSqlName("List<Int32>")).toBe("INTEGER[]");
    expect(arrowTypeToSqlName("List<Utf8>")).toBe("VARCHAR[]");
    expect(arrowTypeToSqlName("List<List<Int64>>")).toBe("BIGINT[][]");
    expect(arrowTypeToSqlName("FixedSizeList[4]<Float64>")).toBe("DOUBLE[]");
  });
});

describe("splitDuckDbStatements", () => {
  it("ignores empty statements between semicolons", () => {
    expect(splitDuckDbStatements(";;SELECT 1;;;SELECT 2;;")).toEqual([
      "SELECT 1",
      "SELECT 2",
    ]);
  });

  it("does not split inside single-quoted strings", () => {
    expect(
      splitDuckDbStatements("SELECT 'a;b'; SELECT 'c'';d'"),
    ).toEqual(["SELECT 'a;b'", "SELECT 'c'';d'"]);
  });

  it("does not split inside double-quoted identifiers", () => {
    expect(
      splitDuckDbStatements('SELECT "weird;name" FROM t; SELECT 1'),
    ).toEqual(['SELECT "weird;name" FROM t', "SELECT 1"]);
  });

  it("does not split inside line comments", () => {
    expect(
      splitDuckDbStatements("SELECT 1 -- comment; still comment\n; SELECT 2"),
    ).toEqual([
      "SELECT 1 -- comment; still comment",
      "SELECT 2",
    ]);
  });

  it("does not split inside block comments", () => {
    expect(
      splitDuckDbStatements("SELECT 1 /* a;b */; SELECT 2"),
    ).toEqual(["SELECT 1 /* a;b */", "SELECT 2"]);
  });

  it("does not split inside dollar-quoted bodies", () => {
    expect(
      splitDuckDbStatements("SELECT $tag$one; two$tag$ AS s; SELECT 2"),
    ).toEqual([
      "SELECT $tag$one; two$tag$ AS s",
      "SELECT 2",
    ]);
  });
});

describe("toDuckDbListLiteral", () => {
  it("single-quotes and escapes string elements", () => {
    expect(toDuckDbListLiteral(["a", "b"])).toBe("['a', 'b']");
    expect(toDuckDbListLiteral(["O'Brien"])).toBe("['O''Brien']");
  });

  it("inlines booleans, bigints and NULL bare", () => {
    expect(toDuckDbListLiteral([true, false])).toBe("[TRUE, FALSE]");
    expect(toDuckDbListLiteral([1n, 2n])).toBe("[1, 2]");
    expect(toDuckDbListLiteral([1, null, 3])).toBe("[1, NULL, 3]");
  });

  it("recurses into nested arrays", () => {
    expect(
      toDuckDbListLiteral([
        [1, 2],
        [3, 4],
      ]),
    ).toBe("[[1, 2], [3, 4]]");
  });
});

describe("parseDuckDbEnumValues", () => {
  it("parses a multi-label enum definition", () => {
    expect(parseDuckDbEnumValues("ENUM('sad', 'ok', 'happy')")).toEqual([
      "sad",
      "ok",
      "happy",
    ]);
  });

  it("unescapes doubled single quotes in a label", () => {
    expect(parseDuckDbEnumValues("ENUM('O''Brien', 'b')")).toEqual([
      "O'Brien",
      "b",
    ]);
  });

  it("returns null for non-enum type strings", () => {
    expect(parseDuckDbEnumValues("INTEGER")).toBeNull();
    expect(parseDuckDbEnumValues("VARCHAR")).toBeNull();
    expect(parseDuckDbEnumValues("STRUCT(a INT)")).toBeNull();
  });
});
