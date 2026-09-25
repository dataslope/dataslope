/** Recognising a file dropped onto a SQL playground.
 *
 *  The playgrounds accept a whole family of files — a SQLite image, a SQL
 *  dump, a DuckDB database, CSV/TSV, JSON, Parquet, an Excel workbook — and
 *  what should happen next differs for each. Extensions alone are not enough
 *  to decide: people rename `.db` onto dumps, export `.txt` that is really
 *  CSV, and the existing "Import Database" dialog already sniffs content
 *  rather than trusting the name. So the first bytes decide wherever a format
 *  has a signature, and the extension only breaks ties between the text
 *  formats, which have none.
 */

import { isSqliteBinary } from "./importUtils";

/** What a dropped file turns out to be. `unknown` is a real answer: the
 *  dialog says so rather than guessing and failing halfway through an
 *  import. */
export type DroppedFileKind =
  | "sqlite"
  | "duckdb"
  | "sqldump"
  | "csv"
  | "json"
  | "parquet"
  | "xlsx"
  | "unknown";

/** Bytes needed to recognise every signature below. The drop handler reads
 *  only this much before classifying, so a 2 GB file is not pulled into
 *  memory just to find out what it is. */
export const SNIFF_BYTES = 4096;

const PARQUET_MAGIC = "PAR1";
const ZIP_MAGIC = [0x50, 0x4b]; // "PK", the local file header of any zip
const DUCKDB_MAGIC = "DUCK";

/** Lower-case extension without the dot, or "" when there is none. */
function fileExtension(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? filename;
  const dot = base.lastIndexOf(".");
  return dot <= 0 ? "" : base.slice(dot + 1).toLowerCase();
}

function startsWith(bytes: Uint8Array, text: string, offset = 0): boolean {
  if (bytes.length < offset + text.length) return false;
  for (let i = 0; i < text.length; i++) {
    if (bytes[offset + i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

/** DuckDB writes an 8-byte checksum before its `DUCK` magic, so the magic
 *  sits at offset 8; older//future layouts putting it first are accepted
 *  too, since a false positive there is not reachable by another format. */
function isDuckDbBinary(bytes: Uint8Array): boolean {
  return startsWith(bytes, DUCKDB_MAGIC, 8) || startsWith(bytes, DUCKDB_MAGIC);
}

function isZip(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 2 && bytes[0] === ZIP_MAGIC[0] && bytes[1] === ZIP_MAGIC[1]
  );
}

/** Decode the sniff window as UTF-8, tolerating a cut multi-byte sequence at
 *  the end (the window is a byte count, not a character boundary). */
function decodeHead(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

/** A byte that no text file has: NUL, or a C0 control that is not tab,
 *  newline or carriage return. Binary formats without a signature land here
 *  rather than being mistaken for a dump. */
function looksBinary(bytes: Uint8Array): boolean {
  const window = bytes.subarray(0, 512);
  for (const b of window) {
    if (b === 0) return true;
    if (b < 0x09 || (b > 0x0d && b < 0x20)) return true;
  }
  return false;
}

/** Statements that only a SQL script contains. Deliberately anchored to the
 *  start of a line so a CSV cell mentioning "create table" does not match. */
const SQL_STATEMENT = /^\s*(--|\/\*|(CREATE|INSERT|PRAGMA|BEGIN|ALTER|DROP|SET|COPY|ATTACH|WITH|SELECT)\b)/im;

/** Split a CSV/TSV-ish first line on a delimiter, respecting quotes just
 *  enough to count fields. */
function fieldCount(line: string, delimiter: string): number {
  let count = 1;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') i += 1;
      else inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      count += 1;
    }
  }
  return count;
}

/** Does this text read as delimiter-separated rows: a first line with
 *  several fields, and a second line with the same count? */
function looksDelimited(text: string, delimiter: string): boolean {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return false;
  const first = fieldCount(lines[0], delimiter);
  if (first < 2) return false;
  return fieldCount(lines[1], delimiter) === first;
}

export interface DroppedFileSniff {
  kind: DroppedFileKind;
  /** True when the bytes carry a format signature, false when the answer
   *  came from the extension or the shape of the text. The dialog uses this
   *  to hedge its wording ("looks like a CSV file"). */
  certain: boolean;
}

/**
 * Classify a dropped file from its name and its first {@link SNIFF_BYTES}
 * bytes. Signatures win over extensions; the text formats, which have no
 * signature, fall back to the extension and then to the shape of the text.
 */
export function sniffDroppedFile(
  filename: string,
  head: Uint8Array,
): DroppedFileSniff {
  // ── Signatures ──
  if (isSqliteBinary(head)) return { kind: "sqlite", certain: true };
  if (isDuckDbBinary(head)) return { kind: "duckdb", certain: true };
  if (startsWith(head, PARQUET_MAGIC)) return { kind: "parquet", certain: true };

  const ext = fileExtension(filename);
  if (isZip(head)) {
    // Every OOXML workbook is a zip; so is a .zip of anything else, which
    // this playground has nothing to do with.
    const workbook = ext === "xlsx" || ext === "xlsm" || ext === "xltx";
    return { kind: workbook ? "xlsx" : "unknown", certain: workbook };
  }

  // A binary with no signature we know: say so rather than feeding random
  // bytes to a text importer.
  if (looksBinary(head)) {
    // Extensions are still worth honouring for formats whose signature is
    // not in the first bytes (e.g. an .xlsx the browser handed us truncated).
    if (ext === "parquet") return { kind: "parquet", certain: false };
    if (ext === "duckdb" || ext === "ddb") return { kind: "duckdb", certain: false };
    return { kind: "unknown", certain: false };
  }

  // ── Text formats ──
  const text = decodeHead(head);
  const trimmed = text.replace(/^﻿/, "").trimStart();

  switch (ext) {
    case "sql":
      return { kind: "sqldump", certain: true };
    case "csv":
      return { kind: "csv", certain: true };
    case "tsv":
      return { kind: "csv", certain: true };
    case "json":
    case "ndjson":
    case "jsonl":
      return { kind: "json", certain: true };
    default:
      break;
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return { kind: "json", certain: false };
  }
  if (SQL_STATEMENT.test(trimmed)) return { kind: "sqldump", certain: false };
  if (looksDelimited(text, ",") || looksDelimited(text, "\t")) {
    return { kind: "csv", certain: false };
  }
  return { kind: "unknown", certain: false };
}

/** Human name for a kind, for dialog copy. */
export const DROPPED_KIND_LABELS: Record<DroppedFileKind, string> = {
  sqlite: "SQLite database",
  duckdb: "DuckDB database",
  sqldump: "SQL dump",
  csv: "CSV file",
  json: "JSON file",
  parquet: "Parquet file",
  xlsx: "Excel workbook",
  unknown: "file",
};

/** Read the first {@link SNIFF_BYTES} of a file. Reading a slice rather than
 *  the whole file keeps a multi-gigabyte drop cheap until the user has said
 *  what to do with it. */
export async function readSniffHead(file: File): Promise<Uint8Array> {
  const slice = file.slice(0, SNIFF_BYTES);
  return new Uint8Array(await slice.arrayBuffer());
}

/** What an "Import Database" dialog should do with the file it was given.
 *  Both the SQLite and DuckDB dialogs accept a binary image *or* a SQL dump
 *  and let the content decide, so both ask this. */
export type DatabaseFileRoute =
  | { action: "image" }
  | { action: "dump" }
  | { action: "refuse"; message: string };

/** The engines that can open a binary database image, and the playground
 *  that reads each one. */
const IMAGE_ENGINES: Record<"sqlite" | "duckdb", string> = {
  sqlite: "SQLite",
  duckdb: "DuckDB",
};

/**
 * Decide how an imported database file should be read by `engine`. A file of
 * the wrong binary format is refused with a sentence naming where it does
 * open: without this it went down the dump path and failed on whatever its
 * bytes happened to decode to, which reads as a corrupt file rather than the
 * wrong one.
 */
export function routeDatabaseFile(
  kind: DroppedFileKind,
  filename: string,
  engine: "sqlite" | "duckdb",
): DatabaseFileRoute {
  if (kind === engine) return { action: "image" };
  if (kind === "sqlite" || kind === "duckdb") {
    return {
      action: "refuse",
      message: `"${filename}" is a ${DROPPED_KIND_LABELS[kind]}. Open it in the ${IMAGE_ENGINES[kind]} playground, or export it as a .sql dump.`,
    };
  }
  if (kind === "parquet") {
    return {
      action: "refuse",
      message: `"${filename}" is a Parquet file. Import it with Import data → from Parquet.`,
    };
  }
  if (kind === "xlsx") {
    return {
      action: "refuse",
      message: `"${filename}" is an Excel workbook. Drop it on the playground to import a worksheet.`,
    };
  }
  // CSV and JSON are legible as text, so they reach the dump path and fail
  // with the engine's own syntax error, which names the offending line. That
  // is more useful than a guess about what the file was meant to be.
  return { action: "dump" };
}
