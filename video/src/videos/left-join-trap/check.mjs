// Runs every query the left-join-trap video shows in PGlite (Postgres in
// WASM) and writes what came back to results.json, which data.ts reads. From
// the repo root, where @electric-sql/pglite is installed:
//
//   node video/src/videos/left-join-trap/check.mjs
//
// The tables are the first four customers of the outer-joins lesson's own
// initSql (content/courses/intro-sql-postgres/outer-joins.mdx) and every one
// of their orders from it, with the lesson's ids and amounts unchanged.
/* global console, URL */
import { PGlite } from "@electric-sql/pglite";
import { writeFileSync } from "node:fs";

const db = new PGlite();
await db.exec(`
CREATE TABLE customers (
  id   INTEGER PRIMARY KEY,
  name TEXT
);
CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER,
  amount      NUMERIC
);
INSERT INTO customers (id, name) VALUES
  (1,'Ada'), (2,'Grace'), (3,'Linus'), (4,'Mae');
INSERT INTO orders (id, customer_id, amount) VALUES
  (101,1,42), (102,1,18), (103,2,99), (104,2,15), (130,1,57);
`);

const version = (await db.query("SELECT version()")).rows[0].version;

const QUERIES = {
  customers: "SELECT id, name FROM customers ORDER BY id;",
  orders: "SELECT id, customer_id, amount FROM orders ORDER BY id;",
  left: `SELECT c.name, o.id AS order_id, o.amount
FROM customers c
LEFT JOIN orders o
  ON o.customer_id = c.id
ORDER BY c.name, o.id;`,
  where: `SELECT c.name, o.id AS order_id, o.amount
FROM customers c
LEFT JOIN orders o
  ON o.customer_id = c.id
WHERE o.amount > 50
ORDER BY c.name, o.id;`,
  on: `SELECT c.name, o.id AS order_id, o.amount
FROM customers c
LEFT JOIN orders o
  ON o.customer_id = c.id
  AND o.amount > 50
ORDER BY c.name, o.id;`,
  inner: `SELECT c.name, o.id AS order_id, o.amount
FROM customers c
JOIN orders o
  ON o.customer_id = c.id
WHERE o.amount > 50
ORDER BY c.name, o.id;`,
  // What WHERE sees on each row of the left join: the condition's value.
  test: `SELECT c.name, o.id AS order_id, o.amount, o.amount > 50 AS "o.amount > 50"
FROM customers c
LEFT JOIN orders o
  ON o.customer_id = c.id
ORDER BY c.name, o.id;`,
  nullGt: "SELECT NULL::numeric > 50 AS v;",
  whereNull: "SELECT 'kept' AS r WHERE NULL::boolean;",
  whereFalse: "SELECT 'kept' AS r WHERE false;",
  whereTrue: "SELECT 'kept' AS r WHERE true;",
};

const out = { version, sql: QUERIES, results: {} };
for (const [k, q] of Object.entries(QUERIES)) {
  const r = await db.query(q);
  out.results[k] = { fields: r.fields.map((f) => f.name), rows: r.rows };
}
const same = JSON.stringify(out.results.where.rows) === JSON.stringify(out.results.inner.rows);
out.whereEqualsInner = same;
console.log(`${version}\nwhere = inner: ${same}`);
writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
