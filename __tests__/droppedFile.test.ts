/**
 * Recognising a file dropped onto a SQL playground. The drop target accepts
 * anything, so this is what decides which import the confirmation dialog
 * offers — and a wrong answer means an import that fails halfway rather than
 * one that never starts.
 */
import { describe, expect, it } from "vitest";
import {
  fileExtension,
  routeDatabaseFile,
  sniffDroppedFile,
  type DroppedFileKind,
} from "../app/_components/sql/utils/droppedFile";

function bytes(...parts: (string | number[])[]): Uint8Array {
  const out: number[] = [];
  for (const part of parts) {
    if (typeof part === "string") {
      for (const ch of part) out.push(ch.charCodeAt(0));
    } else {
      out.push(...part);
    }
  }
  return new Uint8Array(out);
}

function text(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function kindOf(name: string, head: Uint8Array): DroppedFileKind {
  return sniffDroppedFile(name, head).kind;
}

const SQLITE_HEADER = bytes("SQLite format 3", [0]);
const DUCKDB_HEADER = bytes([1, 2, 3, 4, 5, 6, 7, 8], "DUCK");

describe("fileExtension", () => {
  it("reads the last extension, lower-cased", () => {
    expect(fileExtension("Sales.CSV")).toBe("csv");
    expect(fileExtension("/tmp/dir.name/data.tar.gz")).toBe("gz");
  });

  it("returns none for a bare name or a dotfile", () => {
    expect(fileExtension("README")).toBe("");
    expect(fileExtension(".gitignore")).toBe("");
  });
});

describe("signatures beat extensions", () => {
  it("knows a SQLite image whatever it is called", () => {
    expect(kindOf("mydata.db", SQLITE_HEADER)).toBe("sqlite");
    expect(kindOf("mydata.csv", SQLITE_HEADER)).toBe("sqlite");
    expect(kindOf("no-extension", SQLITE_HEADER)).toBe("sqlite");
  });

  it("knows a DuckDB database by the magic after its checksum", () => {
    expect(kindOf("warehouse.duckdb", DUCKDB_HEADER)).toBe("duckdb");
    expect(kindOf("warehouse.db", DUCKDB_HEADER)).toBe("duckdb");
  });

  it("knows a Parquet file", () => {
    expect(kindOf("part-0.parquet", bytes("PAR1", [21, 0, 21]))).toBe("parquet");
    expect(kindOf("part-0.bin", bytes("PAR1", [21, 0, 21]))).toBe("parquet");
  });

  it("treats a zip as a workbook only when the name says workbook", () => {
    const zip = bytes([0x50, 0x4b, 0x03, 0x04], [20, 0, 6, 0]);
    expect(kindOf("sales.xlsx", zip)).toBe("xlsx");
    expect(kindOf("sales.xlsm", zip)).toBe("xlsx");
    expect(kindOf("photos.zip", zip)).toBe("unknown");
  });
});

describe("text formats", () => {
  it("takes the extension when the bytes carry no signature", () => {
    expect(kindOf("dump.sql", text("CREATE TABLE t (id INTEGER);"))).toBe(
      "sqldump",
    );
    expect(kindOf("rows.csv", text("a,b\n1,2\n"))).toBe("csv");
    expect(kindOf("rows.tsv", text("a\tb\n1\t2\n"))).toBe("csv");
    expect(kindOf("rows.json", text('[{"a":1}]'))).toBe("json");
    expect(kindOf("rows.ndjson", text('{"a":1}\n{"a":2}\n'))).toBe("json");
  });

  it("recognises JSON, SQL and delimited text with no useful extension", () => {
    expect(kindOf("export.txt", text('  [\n  {"a": 1}\n]'))).toBe("json");
    expect(kindOf("export.txt", text('{"a": 1}'))).toBe("json");
    expect(kindOf("export", text("-- chinook dump\nCREATE TABLE t(id);"))).toBe(
      "sqldump",
    );
    expect(kindOf("export.txt", text("id,name,city\n1,Ada,Davis\n2,Bo,Yolo"))).toBe(
      "csv",
    );
    expect(kindOf("export.txt", text("id\tname\n1\tAda\n2\tBo"))).toBe("csv");
  });

  it("does not call a one-line file delimited, having nothing to compare", () => {
    expect(kindOf("mystery.txt", text("id,name,city"))).toBe("unknown");
  });

  it("does not mistake prose that mentions SQL for a dump", () => {
    expect(
      kindOf("notes.txt", text("Today I learned how to create table joins.")),
    ).toBe("unknown");
  });

  it("does not mistake a CSV whose cells mention SQL for a dump", () => {
    const csv = text('id,note\n1,"create table is a DDL statement"\n2,"drop"\n');
    expect(kindOf("notes.txt", csv)).toBe("csv");
  });

  it("keeps ragged rows out of the CSV bucket", () => {
    expect(kindOf("ragged.txt", text("a,b,c\n1,2\n"))).toBe("unknown");
  });

  it("reads a UTF-8 BOM without letting it hide the first character", () => {
    expect(kindOf("bom.txt", text('﻿{"a": 1}'))).toBe("json");
  });
});

describe("binary with no known signature", () => {
  const binary = bytes([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe], "garbage");

  it("is reported as unknown rather than fed to a text importer", () => {
    expect(kindOf("mystery.bin", binary)).toBe("unknown");
    expect(kindOf("mystery.csv", binary)).toBe("unknown");
  });

  it("still honours the extension for formats whose magic it may have missed", () => {
    expect(kindOf("part.parquet", binary)).toBe("parquet");
    expect(kindOf("db.ddb", binary)).toBe("duckdb");
  });
});

describe("certainty", () => {
  it("is certain about a signature or a matching extension", () => {
    expect(sniffDroppedFile("a.db", SQLITE_HEADER).certain).toBe(true);
    expect(sniffDroppedFile("a.csv", text("a,b\n1,2")).certain).toBe(true);
  });

  it("hedges when only the shape of the text suggests an answer", () => {
    expect(sniffDroppedFile("a.txt", text("a,b\n1,2")).certain).toBe(false);
    expect(sniffDroppedFile("a.txt", text('{"a":1}')).certain).toBe(false);
  });
});

// ── Which import an "Import Database" dialog runs ────────────────────────
// Both the SQLite and DuckDB dialogs take a binary image or a SQL dump and
// let the content decide, so a file of the wrong binary format has to be
// turned away with something better than a syntax error from deep inside the
// engine.

describe("routeDatabaseFile", () => {
  it("opens an image the engine can read", () => {
    expect(routeDatabaseFile("sqlite", "a.db", "sqlite")).toEqual({
      action: "image",
    });
    expect(routeDatabaseFile("duckdb", "a.duckdb", "duckdb")).toEqual({
      action: "image",
    });
  });

  it("replays anything textual as a dump", () => {
    for (const kind of ["sqldump", "csv", "json", "unknown"] as const) {
      expect(routeDatabaseFile(kind, "a.sql", "sqlite").action).toBe("dump");
      expect(routeDatabaseFile(kind, "a.sql", "duckdb").action).toBe("dump");
    }
  });

  it("turns away the other engine's database, naming where it opens", () => {
    const toDuck = routeDatabaseFile("sqlite", "chinook.db", "duckdb");
    expect(toDuck.action).toBe("refuse");
    expect(toDuck.action === "refuse" && toDuck.message).toMatch(
      /chinook\.db.*SQLite database.*SQLite playground/,
    );
    const toSqlite = routeDatabaseFile("duckdb", "warehouse.duckdb", "sqlite");
    expect(toSqlite.action === "refuse" && toSqlite.message).toMatch(
      /DuckDB database.*DuckDB playground/,
    );
  });

  it("points a data file at the import that handles it", () => {
    const parquet = routeDatabaseFile("parquet", "part.parquet", "sqlite");
    expect(parquet.action === "refuse" && parquet.message).toMatch(
      /Parquet file.*from Parquet/,
    );
    const workbook = routeDatabaseFile("xlsx", "sales.xlsx", "duckdb");
    expect(workbook.action === "refuse" && workbook.message).toMatch(
      /Excel workbook.*Drop it/,
    );
  });
});
