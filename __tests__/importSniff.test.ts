import { describe, expect, it } from "vitest";
import { isSqliteBinary } from "../app/_components/sql/utils/importUtils";

/** The 16-byte magic header every SQLite database file starts with. */
const MAGIC = new Uint8Array([
  ...Array.from("SQLite format 3", (c) => c.charCodeAt(0)),
  0,
]);

describe("isSqliteBinary", () => {
  it("accepts a buffer starting with the SQLite magic header", () => {
    expect(isSqliteBinary(MAGIC)).toBe(true);
    // Real files have a full header page after the magic.
    const withPage = new Uint8Array(4096);
    withPage.set(MAGIC, 0);
    expect(isSqliteBinary(withPage)).toBe(true);
  });

  it("rejects SQL dump text, even when it mentions SQLite", () => {
    const dump = new TextEncoder().encode(
      "-- SQLite format 3 dump\nCREATE TABLE t (id INTEGER);\n",
    );
    expect(isSqliteBinary(dump)).toBe(false);
  });

  it("requires the trailing NUL of the magic header", () => {
    const noNul = new TextEncoder().encode("SQLite format 3 ");
    expect(isSqliteBinary(noNul)).toBe(false);
  });

  it("rejects buffers shorter than the magic header", () => {
    expect(isSqliteBinary(new Uint8Array(0))).toBe(false);
    expect(isSqliteBinary(MAGIC.slice(0, 15))).toBe(false);
  });
});
