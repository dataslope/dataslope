// Runs every statement the db-entities video shows in PGlite (Postgres in
// WASM), the failing ones included, and writes what came back to
// results.json, which data.ts reads. From the repo root, where
// @electric-sql/pglite is installed:
//
//   node video/src/videos/db-entities/check.mjs
//
// Each figure gets a fresh database built from its own SQL below, so no
// figure's rows leak into another's. The tables and rows are the lessons'
// own (content/courses/database-design-postgresql/):
//
//   - entities: thinking-in-entities.mdx, "Separate entities become separate
//     tables": customers (1 Ada, 2 Grace), products (10 Notebook 8.50,
//     11 Pen 1.25).
//   - orders: attributes-and-domains.mdx, "Types and checks define a
//     column's domain": the same DDL and rows, with the long CHECK line
//     broken in two so it prints as a listing; the starter's own insert
//     (3, 'shipped', 3499, 2025-01-12) and its two suggested failures,
//     'banana' and -5.
//   - loose: the same orders with status left as plain text, holding the four
//     spellings the lesson's prose names ("sent, shipped, SHIP, and done"),
//     and each of them tried against the narrow domain.
//   - name: the lesson's VARCHAR(20) ("claims no name is longer"), tried on
//     one well-known name of twenty-one characters.
//   - phones: the lesson's packed cell '555-1111, 555-2222', searched for one
//     of its numbers, and the same two numbers stored one per row.
//   - erd: entity-relationship-diagrams.mdx, "Turning a simple ER diagram
//     into tables": customers and orders, read back from the catalog so the
//     diagram's columns, types and keys are what Postgres stored; plus the
//     three facts the line's two ends claim.
/* global console, URL */
import { PGlite } from "@electric-sql/pglite";
import { writeFileSync } from "node:fs";

const out = { version: "", figures: {} };

/** A fresh database with `setup` run in it. */
const fresh = async (setup) => {
  const db = new PGlite();
  await db.exec(setup);
  return db;
};

/** A statement's rows, or Postgres's error: message, detail and SQLSTATE. */
const run = async (db, sql) => {
  try {
    const r = await db.query(sql);
    return { ok: true, fields: r.fields.map((f) => f.name), rows: r.rows, affected: r.affectedRows ?? 0 };
  } catch (e) {
    return { ok: false, message: e.message, detail: e.detail ?? null, code: e.code ?? null, constraint: e.constraint ?? null };
  }
};

/** Columns of a table as the catalog has them, in order. */
const columns = async (db, table) =>
  (
    await db.query(
      `SELECT column_name, data_type, is_nullable, character_maximum_length
         FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position`,
      [table],
    )
  ).rows;

/** Its constraints: kind, name, columns, and (for a foreign key) the target. */
const constraints = async (db, table) =>
  (
    await db.query(
      `SELECT c.conname AS name, c.contype AS kind, pg_get_constraintdef(c.oid) AS def,
              ARRAY(SELECT a.attname FROM unnest(c.conkey) k JOIN pg_attribute a
                      ON a.attrelid = c.conrelid AND a.attnum = k ORDER BY a.attnum) AS cols,
              c.confrelid::regclass::text AS ref_table,
              ARRAY(SELECT a.attname FROM unnest(c.confkey) k JOIN pg_attribute a
                      ON a.attrelid = c.confrelid AND a.attnum = k ORDER BY a.attnum) AS ref_cols
         FROM pg_constraint c
        WHERE c.conrelid = $1::regclass
        ORDER BY c.conname`,
      [table],
    )
  ).rows;

// ── Fig. 1 and 2: separate entities, separate tables ─────────────────────────

const ENTITIES_SETUP = `CREATE TABLE customers (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE products (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  price NUMERIC NOT NULL
);
INSERT INTO customers VALUES (1, 'Ada'), (2, 'Grace');
INSERT INTO products VALUES (10, 'Notebook', 8.50), (11, 'Pen', 1.25);`;
{
  const db = await fresh(ENTITIES_SETUP);
  out.version = (await db.query("SELECT version()")).rows[0].version;
  const sql = {
    customers: "SELECT id, name FROM customers ORDER BY id;",
    products: "SELECT id, name, price FROM products ORDER BY id;",
  };
  out.figures.entities = { setup: ENTITIES_SETUP, sql, results: {} };
  for (const [k, q] of Object.entries(sql)) out.figures.entities.results[k] = await run(db, q);
  out.figures.entities.columns = { customers: await columns(db, "customers"), products: await columns(db, "products") };
}

// ── Figs. 3 to 5: attributes, and the domain that narrows them ──────────────

const ORDERS_DDL = `CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  status      TEXT NOT NULL
    CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled')),
  total_cents INTEGER NOT NULL
    CHECK (total_cents >= 0),
  placed_on   DATE NOT NULL
);`;
const ORDERS_ROWS = `INSERT INTO orders VALUES
  (1, 'pending', 2599, DATE '2025-01-10'),
  (2, 'paid',    1200, DATE '2025-01-11');`;
{
  const db = await fresh(`${ORDERS_DDL}\n${ORDERS_ROWS}`);
  const sql = {
    rows: "SELECT * FROM orders ORDER BY id;",
    shipped: "INSERT INTO orders VALUES (3, 'shipped', 3499, DATE '2025-01-12');",
    banana: "INSERT INTO orders VALUES (3, 'banana', 3499, DATE '2025-01-12');",
    negative: "INSERT INTO orders VALUES (3, 'shipped', -5, DATE '2025-01-12');",
  };
  const results = { rows: await run(db, sql.rows) };
  // The two failures first, so each meets the table as the lesson leaves it.
  results.banana = await run(db, sql.banana);
  results.negative = await run(db, sql.negative);
  results.shipped = await run(db, sql.shipped);
  results.after = await run(db, sql.rows);
  out.figures.orders = {
    ddl: ORDERS_DDL,
    rowsSql: ORDERS_ROWS,
    sql,
    results,
    columns: await columns(db, "orders"),
    constraints: await constraints(db, "orders"),
  };
}

// The same orders with status as plain text: anything goes in.
const LOOSE_SETUP = `CREATE TABLE orders (
  id     INTEGER PRIMARY KEY,
  status TEXT NOT NULL
);`;
const SPELLINGS = ["sent", "shipped", "SHIP", "done"];
{
  const db = await fresh(LOOSE_SETUP);
  const inserts = SPELLINGS.map((s, i) => `INSERT INTO orders VALUES (${i + 1}, '${s}');`);
  const results = { inserts: [] };
  for (const q of inserts) results.inserts.push(await run(db, q));
  results.rows = await run(db, "SELECT id, status FROM orders ORDER BY id;");
  results.distinct = await run(db, "SELECT count(DISTINCT status)::int AS n FROM orders;");
  // Each spelling against the narrow domain, each in a fresh copy of the lesson's table.
  results.narrow = [];
  for (const s of SPELLINGS) {
    const strict = await fresh(`${ORDERS_DDL}\n${ORDERS_ROWS}`);
    results.narrow.push({ status: s, ...(await run(strict, `INSERT INTO orders VALUES (3, '${s}', 3499, DATE '2025-01-12');`)) });
  }
  out.figures.loose = { setup: LOOSE_SETUP, spellings: SPELLINGS, inserts, results };
}

// ── Fig. 6: a domain is a claim ──────────────────────────────────────────────

const NAME_SETUP = `CREATE TABLE people (
  id   INTEGER PRIMARY KEY,
  name VARCHAR(20) NOT NULL
);`;
const LONG_NAME = "Johann Sebastian Bach";
{
  const db = await fresh(NAME_SETUP);
  const sql = {
    length: `SELECT char_length('${LONG_NAME}')::int AS n;`,
    insert: `INSERT INTO people VALUES (1, '${LONG_NAME}');`,
  };
  out.figures.name = {
    setup: NAME_SETUP,
    name: LONG_NAME,
    sql,
    results: { length: await run(db, sql.length), insert: await run(db, sql.insert) },
    columns: await columns(db, "people"),
  };
}

// ── Fig. 7: one value per cell ───────────────────────────────────────────────

const PACKED_SETUP = `CREATE TABLE customers (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  phone_numbers TEXT
);
INSERT INTO customers VALUES (1, 'Ada', '555-1111, 555-2222');`;
const SPLIT_SETUP = `CREATE TABLE customer_phones (
  customer_id INTEGER NOT NULL,
  phone       TEXT NOT NULL
);
INSERT INTO customer_phones VALUES (1, '555-1111'), (1, '555-2222');`;
{
  const packed = await fresh(PACKED_SETUP);
  const split = await fresh(SPLIT_SETUP);
  const sql = {
    packed: "SELECT * FROM customers;",
    search: "SELECT name FROM customers WHERE phone_numbers = '555-2222';",
    split: "SELECT * FROM customer_phones;",
    splitSearch: "SELECT customer_id FROM customer_phones WHERE phone = '555-2222';",
  };
  out.figures.phones = {
    packedSetup: PACKED_SETUP,
    splitSetup: SPLIT_SETUP,
    sql,
    results: {
      packed: await run(packed, sql.packed),
      search: await run(packed, sql.search),
      split: await run(split, sql.split),
      splitSearch: await run(split, sql.splitSearch),
    },
  };
}

// ── Fig. 9: the ER diagram, and the tables it stands for ────────────────────

const ERD_SETUP = `CREATE TABLE customers (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);
CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  placed_on   DATE NOT NULL,
  status      TEXT NOT NULL
);
INSERT INTO customers VALUES (1, 'Ada', 'ada@example.com');
INSERT INTO orders VALUES (101, 1, DATE '2025-02-01', 'placed');`;
{
  const db = await fresh(ERD_SETUP);
  const sql = {
    join: `SELECT c.name, o.id AS order_id, o.status
FROM customers c
JOIN orders o ON o.customer_id = c.id;`,
    // The line's two ends, tried: a customer with no orders (zero), a
    // second order for Ada (many), and an order with no customer (each
    // order has exactly one, so this one is refused).
    zero: "INSERT INTO customers VALUES (2, 'Grace', 'grace@example.com');",
    many: "INSERT INTO orders VALUES (102, 1, DATE '2025-02-02', 'placed');",
    none: "INSERT INTO orders VALUES (103, NULL, DATE '2025-02-03', 'placed');",
    stray: "INSERT INTO orders VALUES (104, 9, DATE '2025-02-04', 'placed');",
    perCustomer: `SELECT c.name, count(o.id)::int AS orders
FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.name ORDER BY c.name;`,
  };
  const results = { join: await run(db, sql.join) };
  for (const k of ["zero", "many", "none", "stray", "perCustomer"]) results[k] = await run(db, sql[k]);
  out.figures.erd = {
    setup: ERD_SETUP,
    sql,
    results,
    columns: { customers: await columns(db, "customers"), orders: await columns(db, "orders") },
    constraints: { customers: await constraints(db, "customers"), orders: await constraints(db, "orders") },
  };
}

writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");

// What a reader checks against script.ts.
const f = out.figures;
const err = (r) => (r.ok ? "ok" : `${r.code} ${r.message}${r.detail ? ` | ${r.detail}` : ""}`);
console.log(out.version.split(" on ")[0]);
console.log("customers:", f.entities.results.customers.rows.map((r) => `${r.id} ${r.name}`).join(", "));
console.log("products:", f.entities.results.products.rows.map((r) => `${r.id} ${r.name} ${r.price}`).join(", "));
console.log("orders:", f.orders.columns.map((c) => `${c.column_name} ${c.data_type}`).join(", "));
console.log("banana:", err(f.orders.results.banana));
console.log("negative:", err(f.orders.results.negative));
console.log("shipped:", err(f.orders.results.shipped));
console.log("loose distinct:", f.loose.results.distinct.rows[0].n);
console.log("narrow:", f.loose.results.narrow.map((r) => `${r.status}=${r.ok ? "in" : r.constraint}`).join(", "));
console.log("name length:", f.name.results.length.rows[0].n, "insert:", err(f.name.results.insert));
console.log("packed search rows:", f.phones.results.search.rows.length, "split search rows:", f.phones.results.splitSearch.rows.length);
console.log("join:", JSON.stringify(f.erd.results.join.rows));
console.log("zero:", err(f.erd.results.zero), "many:", err(f.erd.results.many));
console.log("none:", err(f.erd.results.none));
console.log("stray:", err(f.erd.results.stray));
console.log("per customer:", JSON.stringify(f.erd.results.perCustomer.rows));
console.log("erd constraints:", JSON.stringify(f.erd.constraints));
