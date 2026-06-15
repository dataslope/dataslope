import { describe, expect, it } from "vitest";
import {
  isDuckDbReadableFile,
  DUCKDB_READABLE_EXTENSIONS,
} from "../app/_components/sql/utils/importUtils";

describe("isDuckDbReadableFile", () => {
  it("accepts every documented base extension", () => {
    for (const ext of DUCKDB_READABLE_EXTENSIONS) {
      expect(isDuckDbReadableFile(`data.${ext}`)).toBe(true);
    }
  });

  it("matches the example file from the playground", () => {
    expect(isDuckDbReadableFile("lending-club-loan-results.parquet")).toBe(true);
  });

  it("looks through a single .gz/.zst compression suffix", () => {
    expect(isDuckDbReadableFile("data.csv.gz")).toBe(true);
    expect(isDuckDbReadableFile("data.json.zst")).toBe(true);
    expect(isDuckDbReadableFile("events.ndjson.gz")).toBe(true);
  });

  it("is case-insensitive on the extension", () => {
    expect(isDuckDbReadableFile("DATA.CSV")).toBe(true);
    expect(isDuckDbReadableFile("Report.Parquet")).toBe(true);
    expect(isDuckDbReadableFile("data.CSV.GZ")).toBe(true);
  });

  it("resolves the extension from the final path segment", () => {
    expect(isDuckDbReadableFile("nested/folder/sales.csv")).toBe(true);
    // A dot in a parent folder must not be mistaken for the file extension.
    expect(isDuckDbReadableFile("v1.0/notes")).toBe(false);
  });

  it("rejects extensions DuckDB can't replacement-scan", () => {
    expect(isDuckDbReadableFile("notes.txt")).toBe(false);
    expect(isDuckDbReadableFile("book.xlsx")).toBe(false);
    expect(isDuckDbReadableFile("backup.duckdb")).toBe(false);
    expect(isDuckDbReadableFile("image.png")).toBe(false);
  });

  it("rejects files with no usable extension", () => {
    expect(isDuckDbReadableFile("README")).toBe(false);
    expect(isDuckDbReadableFile("archive.gz")).toBe(false); // format unknown
    expect(isDuckDbReadableFile("dump.tar.gz")).toBe(false); // tar isn't readable
  });
});
