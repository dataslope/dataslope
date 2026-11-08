// Runs a video's figures on the site's Postgres engine: PGlite (PostgreSQL 18)
// through the repo root's scripts/lib/sql-engines.mjs, the engine the
// interview pages' SQL blocks run in the reader's browser and the one
// check-sql-blocks grades them with.
//
// `figure(setup, steps)` is a drop-in for the DuckDB `figure()` the SQL
// videos' check.mjs files were written around, and returns the same shape:
//
//   { setup, steps: { [id]: { sql, ok, columns, rows } | { sql, ok: false, error } }, version }
//
// so data.ts and the scenes read it unchanged. What differs is what Postgres
// says, which is the point:
//   - a value is printed as psql prints it: a numeric at its own scale
//     ("840.75", and an unrounded AVG with all of Postgres's digits), a date
//     as "2024-01-01", a timestamp to the second (a timestamptz with psql's
//     "+00"), a NULL as null, a boolean as true/false;
//   - an error is "ERROR: <message>", Postgres's first line, so a data.ts
//     that splits an error at its first ": " gets the kind "ERROR";
//   - a statement that returns no rows (an INSERT, a DELETE) reports
//     { columns: ["rows affected"], rows: [[n]] }, since Postgres heads no
//     column for it.
//
// Each step is one statement. Setup and steps run in one database, so a step
// sees what the steps before it changed (a DELETE, then a SELECT of what
// remains), as the DuckDB harness did.
/* global URL, console */
const lib = (p) => new URL(`../../../${p}`, import.meta.url).href;
const { createEngine } = await import(lib("scripts/lib/sql-engines.mjs"));

const two = (n) => String(n).padStart(2, "0");

/** A value as psql prints it. PGlite hands back a date as UTC midnight and a
 *  timestamp without time zone in local time, so each is read back with the
 *  getters that undo that. */
export function shown(value, typeId) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    if (typeId === 1082) return value.toISOString().slice(0, 10);
    // timestamptz: PGlite's session is in GMT, so psql prints "+00".
    if (typeId === 1184) return `${value.toISOString().slice(0, 19).replace("T", " ")}+00`;
    const d = value;
    return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
  }
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

/** Splits a script at the statement ends the check.mjs files write: a
 *  semicolon at the end of a line. */
export const statements = (sql) =>
  sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

/** Opens PGlite directly, to read field type ids (sql-engines' exec drops
 *  them). Same package and version as createEngine("postgres"). */
async function open() {
  const { PGlite } = await import(lib("node_modules/@electric-sql/pglite/dist/index.js"));
  return PGlite.create();
}

/** Runs one statement and reports it the way the DuckDB harness did. Rows
 *  come back as arrays, not objects: Postgres heads COUNT(*), COUNT(1) and
 *  COUNT(col) all "count", and rows keyed by name would give all three
 *  columns the last one's value. */
async function run(db, sql) {
  const r = await db.query(sql, [], { rowMode: "array" });
  const fields = r.fields ?? [];
  if (fields.length === 0) {
    return { columns: ["rows affected"], rows: [[r.affectedRows ?? 0]] };
  }
  return {
    columns: fields.map((f) => f.name),
    rows: (r.rows ?? []).map((row) => fields.map((f, i) => shown(row[i], f.dataTypeID))),
  };
}

/** A numeric printed with more than four decimal places: an unrounded AVG or
 *  ratio. Postgres gives one sixteen or twenty places where DuckDB's double
 *  printed "80", and the wider column then runs into whatever sits beside
 *  the table (da-sql's per-customer averages slid under the listing next to
 *  them). Warned about rather than refused, since a figure may mean to show
 *  one; round it in the SQL otherwise. */
const LONG_DECIMAL = /^-?\d+\.\d{5,}$/;
const longDecimals = (rows) => rows.flat().filter((v) => typeof v === "string" && LONG_DECIMAL.test(v));

export async function figure(setup, steps) {
  const db = await open();
  for (const stmt of statements(setup)) await db.exec(stmt);
  const out = {};
  for (const [id, sql] of Object.entries(steps)) {
    try {
      const r = await run(db, sql);
      const long = longDecimals(r.rows);
      if (long.length) {
        console.warn(`pg-figure: ${id} prints ${long[0]}${long.length > 1 ? ` (+${long.length - 1} more)` : ""}: round it in the SQL, or check the table's width on screen`);
      }
      out[id] = { sql, ok: true, ...r };
    } catch (e) {
      out[id] = { sql, ok: false, error: `ERROR: ${String(e.message).split("\n")[0]}` };
    }
  }
  const v = await db.query("SELECT version() AS v");
  await db.close();
  return { setup, steps: out, version: postgresVersion(v.rows[0].v) };
}

/** "PostgreSQL 18.0 on wasm32…" -> "PostgreSQL 18.0". */
export const postgresVersion = (v) => String(v).split(" on ")[0];

export { createEngine };
