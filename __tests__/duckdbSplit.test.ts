import { describe, expect, it } from "vitest";
import { splitDuckDbStatements } from "../app/_components/runtime/duckdb";

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
