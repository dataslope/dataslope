import { describe, expect, it } from "vitest";
import {
  arrowTypeToSqlName,
  splitDuckDbStatements,
  toBindParam,
  parseDuckDbEnumValues,
  toDuckDbListLiteral,
} from "../app/_components/runtime/duckdb";

describe("arrowTypeToSqlName (result-header type labels)", () => {
  it("maps integer widths to DuckDB names", () => {
    expect(arrowTypeToSqlName("Int8")).toBe("TINYINT");
    expect(arrowTypeToSqlName("Int16")).toBe("SMALLINT");
    expect(arrowTypeToSqlName("Int32")).toBe("INTEGER");
    expect(arrowTypeToSqlName("Int64")).toBe("BIGINT");
    expect(arrowTypeToSqlName("Uint64")).toBe("UBIGINT");
  });

  it("maps floats, strings, booleans and binary", () => {
    expect(arrowTypeToSqlName("Float32")).toBe("FLOAT");
    expect(arrowTypeToSqlName("Float64")).toBe("DOUBLE");
    expect(arrowTypeToSqlName("Utf8")).toBe("VARCHAR");
    expect(arrowTypeToSqlName("LargeUtf8")).toBe("VARCHAR");
    expect(arrowTypeToSqlName("Bool")).toBe("BOOLEAN");
    expect(arrowTypeToSqlName("Binary")).toBe("BLOB");
    expect(arrowTypeToSqlName("FixedSizeBinary[16]")).toBe("BLOB");
  });

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

  it("maps enum dictionaries and nested containers", () => {
    expect(arrowTypeToSqlName("Dictionary<Int8, Utf8>")).toBe("ENUM");
    expect(arrowTypeToSqlName("Struct<{a:Int32, b:Utf8}>")).toBe("STRUCT");
    expect(arrowTypeToSqlName("Map<{key:Utf8, value:Int32}>")).toBe("MAP");
  });

  it("passes unknown notations through unchanged", () => {
    expect(arrowTypeToSqlName("SomeFutureType<X>")).toBe("SomeFutureType<X>");
  });
});

describe("splitDuckDbStatements", () => {
  it("splits simple statements on `;`", () => {
    expect(splitDuckDbStatements("SELECT 1; SELECT 2;")).toEqual([
      "SELECT 1",
      "SELECT 2",
    ]);
  });

  it("returns the whole input when there is no trailing semicolon", () => {
    expect(splitDuckDbStatements("SELECT 1")).toEqual(["SELECT 1"]);
  });

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

describe("toBindParam (UX-17 prepared-statement binding)", () => {
  it("passes scalars and bigint through unchanged", () => {
    expect(toBindParam("O'Brien")).toBe("O'Brien"); // no manual escaping needed
    expect(toBindParam(42)).toBe(42);
    expect(toBindParam(0)).toBe(0);
    expect(toBindParam(true)).toBe(true);
    expect(toBindParam(123n)).toBe(123n);
  });

  it("maps null/undefined to null", () => {
    expect(toBindParam(null)).toBeNull();
    expect(toBindParam(undefined)).toBeNull();
  });

  it("sends Date as an ISO string", () => {
    expect(toBindParam(new Date("2024-03-15T14:30:00.000Z"))).toBe(
      "2024-03-15T14:30:00.000Z",
    );
  });

  it("falls back to a string form for other objects/arrays", () => {
    expect(toBindParam([1, 2, 3])).toBe("1,2,3");
  });
});

describe("toDuckDbListLiteral", () => {
  it("serializes a numeric list", () => {
    expect(toDuckDbListLiteral([10, 20, 30])).toBe("[10, 20, 30]");
  });

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

  it("produces an empty list literal", () => {
    expect(toDuckDbListLiteral([])).toBe("[]");
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

  it("parses a single-label enum", () => {
    expect(parseDuckDbEnumValues("ENUM('only')")).toEqual(["only"]);
  });

  it("is case-insensitive on the ENUM keyword", () => {
    expect(parseDuckDbEnumValues("enum('a','b')")).toEqual(["a", "b"]);
  });

  it("tolerates irregular whitespace", () => {
    expect(parseDuckDbEnumValues("ENUM(  'a' ,  'b'  )")).toEqual(["a", "b"]);
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

  it("returns null for empty / missing input", () => {
    expect(parseDuckDbEnumValues("")).toBeNull();
    expect(parseDuckDbEnumValues(null)).toBeNull();
    expect(parseDuckDbEnumValues(undefined)).toBeNull();
    expect(parseDuckDbEnumValues("ENUM()")).toBeNull();
  });
});
