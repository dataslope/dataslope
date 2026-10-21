// Runs every statement the db-relational-history video shows in PGlite
// (Postgres in WASM) and writes what came back to results.json, which data.ts
// reads. From the repo root, where @electric-sql/pglite is installed:
//
//   node video/src/videos/db-relational-history/check.mjs
//
// The tables and rows are the-relational-revolution lesson's own initSql
// (content/courses/database-design-postgresql/the-relational-revolution.mdx,
// "Connected by value, not by pointer"), unchanged: 24 customers and 30
// orders. The query is that block's starterCode, Ada's orders. The video
// draws customers 1 to 3 and their six orders.
//
// Two statements are the video's own, on the lesson's tables:
//   - CLUSTER rewrites the orders table in a new physical order (by total,
//     largest first), standing in for "the file was reorganized". Each row's
//     ctid (its block and slot on disk) is read before and after, and Ada's
//     query is run again: the rows moved, and the answer did not.
//   - An order for a customer who does not exist, refused by the lesson's
//     REFERENCES customers(id): the closing scene's "it says no".
// version() is the from-ingres-to-postgresql lesson's "Ask the database who
// it is".
/* global console, URL */
import { PGlite } from "@electric-sql/pglite";
import { writeFileSync } from "node:fs";

const SETUP = `CREATE TABLE customers (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  total       NUMERIC NOT NULL
);
INSERT INTO customers VALUES
  (1, 'Ada'),
  (2, 'Grace'),
  (3, 'Linus'),
  (4, 'Mae'),
  (5, 'Rosa'),
  (6, 'Ivan'),
  (7, 'Nadia'),
  (8, 'Omar'),
  (9, 'Priya'),
  (10, 'Quinn'),
  (11, 'Ruth'),
  (12, 'Sam'),
  (13, 'Tariq'),
  (14, 'Uma'),
  (15, 'Viktor'),
  (16, 'Wen'),
  (17, 'Xenia'),
  (18, 'Yusuf'),
  (19, 'Zara'),
  (20, 'Bruno'),
  (21, 'Chidi'),
  (22, 'Dara'),
  (23, 'Elif'),
  (24, 'Farid');
INSERT INTO orders VALUES
  (101, 1, 15.00),
  (102, 2, 44.00),
  (103, 3, 73.00),
  (104, 4, 17.00),
  (105, 5, 46.00),
  (106, 6, 75.00),
  (107, 7, 19.00),
  (108, 8, 48.00),
  (109, 9, 77.00),
  (110, 10, 21.00),
  (111, 11, 50.00),
  (112, 12, 79.00),
  (113, 13, 23.00),
  (114, 14, 52.00),
  (115, 15, 81.00),
  (116, 16, 25.00),
  (117, 17, 54.00),
  (118, 18, 83.00),
  (119, 19, 27.00),
  (120, 20, 56.00),
  (121, 21, 85.00),
  (122, 22, 29.00),
  (123, 23, 58.00),
  (124, 24, 87.00),
  (125, 1, 31.00),
  (126, 2, 60.00),
  (127, 3, 89.00),
  (128, 4, 33.00),
  (129, 5, 62.00),
  (130, 6, 91.00);`;

const db = new PGlite();
await db.exec(SETUP);

const VERSION = "SELECT version();";
const version = (await db.query(VERSION)).rows[0].version;

// The lesson's query, exactly as its starterCode prints it.
const ADA = `-- No pointers, no navigation: rows connect because values match.
SELECT
  o.id AS order_id,
  o.total
FROM
  orders o
  JOIN customers c ON c.id = o.customer_id
WHERE
  c.name = 'Ada';`;

// The same query as the video sets it, four lines without the comment: it
// must return exactly what the lesson's formatting does.
const LISTING = `SELECT o.id AS order_id, o.total
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE c.name = 'Ada';`;

const rows = async (q) => {
  const r = await db.query(q);
  return { fields: r.fields.map((f) => f.name), rows: r.rows };
};

const SHOWN = "WHERE customer_id IN (1, 2, 3)";
const out = { version, setup: SETUP, sql: { version: VERSION }, results: {} };
const run = async (key, q) => {
  out.sql[key] = q;
  out.results[key] = await rows(q);
};

await run("customers", "SELECT id, name FROM customers WHERE id IN (1, 2, 3) ORDER BY id;");
await run("orders", `SELECT id, customer_id, total FROM orders ${SHOWN} ORDER BY id;`);
await run("counts", "SELECT (SELECT count(*) FROM customers) AS customers, (SELECT count(*) FROM orders) AS orders;");
// Where each row sits on disk, in the order a scan meets them.
await run("before", `SELECT ctid::text AS ctid, id, customer_id, total FROM orders ${SHOWN};`);
await run("ada", ADA);
await run("listing", LISTING);

// "Reorganize the file": rewrite orders in a new physical order.
const REORGANIZE = `CREATE INDEX orders_by_total ON orders (total DESC);
CLUSTER orders USING orders_by_total;`;
out.sql.reorganize = REORGANIZE;
await db.exec(REORGANIZE);
await run("after", `SELECT ctid::text AS ctid, id, customer_id, total FROM orders ${SHOWN};`);
await run("adaAgain", ADA);
await run("listingAgain", LISTING);

// A row that breaks a declared rule: no customer 25.
const BAD = "INSERT INTO orders VALUES (131, 25, 40.00);";
out.sql.bad = BAD;
try {
  await db.query(BAD);
  out.badError = null;
} catch (e) {
  out.badError = { message: e.message, code: e.code, detail: e.detail ?? null, constraint: e.constraint ?? null };
}
await run("countAfterBad", "SELECT count(*) AS orders FROM orders;");

// Fig. 6's SQL, set beside the same question in POSTQUEL (which cannot run):
// Ada's orders, by her customer number.
await run("twin", "SELECT * FROM orders WHERE customer_id = 1;");

const key = (r) => JSON.stringify([...r.rows].sort((a, b) => a.order_id - b.order_id));
out.sameAnswer = key(out.results.ada) === key(out.results.adaAgain);
// Same rows in the same order, before and after, in both spellings.
const exact = (k) => JSON.stringify(out.results[k].rows);
out.sameOrder = exact("ada") === exact("adaAgain");
out.listingMatches = exact("listing") === exact("ada") && exact("listingAgain") === exact("adaAgain");
const placeOf = (r) => Object.fromEntries(r.rows.map((x) => [x.id, x.ctid]));
const was = placeOf(out.results.before);
const now = placeOf(out.results.after);
out.moved = Object.keys(was).filter((id) => was[id] !== now[id]).map(Number);

console.log(version);
console.log("counts", out.results.counts.rows[0]);
console.log("before", out.results.before.rows.map((r) => `${r.id}@${r.ctid}`).join(" "));
console.log("after ", out.results.after.rows.map((r) => `${r.id}@${r.ctid}`).join(" "));
console.log("ada   ", JSON.stringify(out.results.ada.rows));
console.log("again ", JSON.stringify(out.results.adaAgain.rows));
console.log("same answer:", out.sameAnswer, "same order:", out.sameOrder, "listing matches:", out.listingMatches, "moved:", out.moved.join(", "));
console.log("bad   ", JSON.stringify(out.badError), "orders after:", out.results.countAfterBad.rows[0].orders);
console.log("twin  ", JSON.stringify(out.results.twin.rows));
writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
