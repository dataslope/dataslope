import { describe, expect, it } from "vitest";
import {
  splitDuckDbStatements,
  toBindParam,
  parseDuckDbEnumValues,
} from "../app/_components/runtime/duckdb";

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
