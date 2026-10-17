// Runs every statement the db-normalization video shows in PGlite (Postgres
// in WASM), including the ones Postgres refuses, and writes what came back to
// results.json, which data.ts reads. From the repo root, where
// @electric-sql/pglite is installed:
//
//   node video/src/videos/db-normalization/check.mjs [path/to/northwind_postgres.sql]
//
// Each figure starts from a fresh database built from its lesson's own DDL and
// rows (content/courses/database-design-postgresql/):
//
//   flat     why-normalization.mdx, "An update anomaly in a flat table"
//   split    why-normalization.mdx's cure (its erDiagram: customers,
//            products, orders), filled with the same three orders
//   phones   first-normal-form.mdx: its students example (Ada with
//            555-1000 and 555-2200 in one cell, Grace with 555-1100), as a
//            list cell, as numbered columns, and in the lesson's own
//            students / student_phones DDL
//   items    second-normal-form.mdx: order_items_bad's three rows, and the
//            lesson's split into products and order_items
//   city     third-normal-form.mdx: orders_bad, and the lesson's 3NF design
//   summary  denormalization.mdx, "A small derived summary table"
//   northwind  denormalization.mdx, "Catalog price now vs. price actually
//            charged", run against the lesson's own remoteInitSql
//            (dataslope/datasets postgres/northwind_postgres.sql, at the
//            DATASETS_REF the site pins), which this script fetches unless
//            a local copy is passed.
//
// A few statements are the video's own, each demonstrating a sentence of a
// lesson: a product inserted before anyone orders it, Grace's order deleted,
// Ada's phone listed twice, a fourth phone number, and a line item added to
// an order after its day was summarized.
/* global console, process, URL, fetch */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, writeFileSync } from "node:fs";

const DATASETS_REF = "f7f08485960fe4a774359a43d1eb50a84514daf2";
const NORTHWIND_URL = `https://raw.githubusercontent.com/dataslope/datasets/${DATASETS_REF}/postgres/northwind_postgres.sql`;

/** A value as psql prints it: a date as YYYY-MM-DD (PGlite parses dates into
 *  JS Dates at UTC midnight), everything else as its text. */
const text = (v) => (v === null ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v));

/** Postgres's answer to one statement: rows, or the error it raised. */
async function run(db, sql) {
  try {
    const res = await db.query(sql);
    return {
      ok: true,
      fields: res.fields.map((f) => f.name),
      // Every value as Postgres prints it (text), so the screen shows exactly that.
      rows: res.rows.map((r) => res.fields.map((f) => text(r[f.name]))),
      affected: res.affectedRows ?? 0,
    };
  } catch (e) {
    return { ok: false, code: e.code, message: e.message, detail: e.detail ?? null };
  }
}

/** A fresh database built from one figure's setup. */
async function fresh(setup) {
  const db = new PGlite();
  await db.exec("SET DateStyle = ISO;");
  await db.exec(setup);
  return db;
}

const out = { sql: {}, results: {} };
const show = async (db, key, sql) => {
  out.sql[key] = sql;
  out.results[key] = await run(db, sql);
  return out.results[key];
};

// ── Part 1. One wide table (why-normalization) ───────────────────────────────

const FLAT = `
CREATE TABLE orders_flat (
  order_id       INTEGER PRIMARY KEY,
  customer_name  TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  product_name   TEXT NOT NULL,
  product_price  NUMERIC NOT NULL
);
INSERT INTO orders_flat VALUES
  (1, 'Ada',   'ada@old.test',   'Notebook', 8.00),
  (2, 'Ada',   'ada@old.test',   'Pencil',   1.50),
  (3, 'Grace', 'grace@test.test', 'Notebook', 8.00);`;

{
  const db = await fresh(FLAT);
  out.version = (await db.query("SELECT version()")).rows[0].version;
  await show(db, "flat", "SELECT * FROM orders_flat ORDER BY order_id;");
  // The constraints every row satisfies.
  await show(
    db,
    "flatConstraints",
    `SELECT conname, contype FROM pg_constraint WHERE conrelid = 'orders_flat'::regclass ORDER BY conname;`,
  );
  await show(
    db,
    "flatNotNull",
    `SELECT attname FROM pg_attribute WHERE attrelid = 'orders_flat'::regclass AND attnum > 0 AND attnotnull ORDER BY attnum;`,
  );
  await show(db, "update", "UPDATE orders_flat\nSET customer_email = 'ada@new.test'\nWHERE order_id = 1;");
  await show(
    db,
    "emails",
    `SELECT customer_name, customer_email, COUNT(*) AS rows_with_that_email
FROM orders_flat
GROUP BY customer_name, customer_email
ORDER BY customer_name, customer_email;`,
  );
  // The other two anomalies, on the same table after that update.
  await show(db, "flatAfterUpdate", "SELECT * FROM orders_flat ORDER BY order_id;");
  await show(db, "insertProduct", "INSERT INTO orders_flat (product_name, product_price)\nVALUES ('Mug', 6.00);");
  await show(db, "deleteGrace", "DELETE FROM orders_flat\nWHERE order_id = 3;");
  await show(db, "lookupGrace", "SELECT customer_email\nFROM orders_flat\nWHERE customer_name = 'Grace';");
}

// ── Part 1. The cure: each fact one home ─────────────────────────────────────

const SPLIT = `
CREATE TABLE customers (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  email TEXT NOT NULL
);
CREATE TABLE products (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  price NUMERIC NOT NULL
);
CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  product_id  INTEGER NOT NULL REFERENCES products(id)
);
INSERT INTO customers VALUES (1, 'Ada', 'ada@old.test'), (2, 'Grace', 'grace@test.test');
INSERT INTO products VALUES (1, 'Notebook', 8.00), (2, 'Pencil', 1.50);
INSERT INTO orders VALUES (1, 1, 1), (2, 1, 2), (3, 2, 1);`;

{
  const db = await fresh(SPLIT);
  await show(db, "splitCustomers", "SELECT * FROM customers ORDER BY id;");
  await show(db, "splitProducts", "SELECT * FROM products ORDER BY id;");
  await show(db, "splitOrders", "SELECT * FROM orders ORDER BY id;");
  await show(db, "adaEmailRows", "SELECT COUNT(*) AS rows FROM customers WHERE email = 'ada@old.test';");
  await show(db, "splitUpdate", "UPDATE customers SET email = 'ada@new.test' WHERE id = 1;");
  await show(db, "splitInsertProduct", "INSERT INTO products VALUES (3, 'Mug', 6.00);");
  await show(db, "splitDeleteGrace", "DELETE FROM orders WHERE id = 3;");
  await show(db, "splitGraceKept", "SELECT email FROM customers WHERE name = 'Grace';");
  await show(
    db,
    "splitJoin",
    `SELECT o.id AS order_id, c.name, c.email, p.name AS product, p.price
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN products p ON p.id = o.product_id
ORDER BY o.id;`,
  );
}

// ── Part 2. First normal form (first-normal-form) ───────────────────────────

{
  const db = await fresh(`
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  phones     TEXT
);
INSERT INTO students VALUES
  (1, 'Ada',   '555-1000, 555-2200'),
  (2, 'Grace', '555-1100');`);
  await show(db, "listCell", "SELECT * FROM students ORDER BY student_id;");
  await show(db, "listSearch", "SELECT name FROM students\nWHERE phones = '555-2200';");
  await show(db, "listTwice", "UPDATE students SET phones = '555-1000, 555-2200, 555-1000' WHERE student_id = 1;");
}
{
  const db = await fresh(`
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  phone1     TEXT,
  phone2     TEXT,
  phone3     TEXT
);
INSERT INTO students VALUES (1, 'Ada', '555-1000', '555-2200', NULL);`);
  await show(db, "columns", "SELECT * FROM students ORDER BY student_id;");
  await show(
    db,
    "fourth",
    "INSERT INTO students VALUES (2, 'Grace', '555-1100', '555-2300', '555-3400', '555-3500');",
  );
}
{
  const db = await fresh(`
CREATE TABLE students (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE student_phones (
  id           INTEGER PRIMARY KEY,
  student_id   INTEGER NOT NULL REFERENCES students(id),
  phone_number TEXT NOT NULL,
  UNIQUE (student_id, phone_number)
);
INSERT INTO students VALUES (1, 'Ada'), (2, 'Grace'), (3, 'Linus');
INSERT INTO student_phones VALUES
  (101, 1, '555-1000'),
  (102, 1, '555-2200'),
  (103, 2, '555-1100');`);
  await show(db, "childStudents", "SELECT * FROM students ORDER BY id;");
  await show(db, "childPhones", "SELECT * FROM student_phones ORDER BY id;");
  await show(
    db,
    "childSearch",
    `SELECT s.name
FROM students s
JOIN student_phones p ON p.student_id = s.id
WHERE p.phone_number = '555-2200';`,
  );
  await show(
    db,
    "childCounts",
    `SELECT s.name, COUNT(p.id) AS phones
FROM students s
LEFT JOIN student_phones p ON p.student_id = s.id
GROUP BY s.id, s.name
ORDER BY s.id;`,
  );
  await show(db, "childTwice", "INSERT INTO student_phones\nVALUES (104, 1, '555-1000');");
}

// ── Part 3. Second normal form (second-normal-form) ─────────────────────────

{
  const db = await fresh(`
CREATE TABLE order_items_bad (
  order_id     INTEGER NOT NULL,
  product_id   INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  quantity     INTEGER NOT NULL,
  PRIMARY KEY (order_id, product_id)
);
INSERT INTO order_items_bad VALUES
  (100, 10, 'Notebook', 2),
  (100, 20, 'Pencil',   5),
  (101, 10, 'Notebook', 1);`);
  await show(db, "itemsBad", "SELECT * FROM order_items_bad ORDER BY order_id, product_id;");
  await show(db, "itemsRename", "UPDATE order_items_bad\nSET product_name = 'Field Notebook'\nWHERE product_id = 10;");
  await show(db, "itemsBadAfter", "SELECT * FROM order_items_bad ORDER BY order_id, product_id;");
}
{
  const db = await fresh(`
CREATE TABLE orders (
  id         INTEGER PRIMARY KEY,
  order_date DATE NOT NULL
);
CREATE TABLE products (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE order_items (
  order_id   INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (order_id, product_id)
);
INSERT INTO orders VALUES (100, DATE '2026-01-10'), (101, DATE '2026-01-11');
INSERT INTO products VALUES (10, 'Notebook'), (20, 'Pencil');
INSERT INTO order_items VALUES (100, 10, 2), (100, 20, 5), (101, 10, 1);`);
  await show(db, "itemsProducts", "SELECT * FROM products ORDER BY id;");
  await show(db, "itemsGood", "SELECT * FROM order_items ORDER BY order_id, product_id;");
  await show(db, "itemsGoodRename", "UPDATE products\nSET name = 'Field Notebook'\nWHERE id = 10;");
  await show(
    db,
    "itemsJoin",
    `SELECT oi.order_id, p.name AS product_name, oi.quantity
FROM order_items oi
JOIN products p ON p.id = oi.product_id
ORDER BY oi.order_id, p.name;`,
  );
}

// ── Part 4. Third normal form (third-normal-form) ───────────────────────────

{
  const db = await fresh(`
CREATE TABLE orders_bad (
  order_id      INTEGER PRIMARY KEY,
  customer_id   INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  customer_city TEXT NOT NULL
);
INSERT INTO orders_bad VALUES
  (100, 1, 'Ada',   'London'),
  (101, 1, 'Ada',   'London'),
  (102, 2, 'Grace', 'Baltimore');`);
  await show(db, "cityBad", "SELECT * FROM orders_bad ORDER BY order_id;");
  await show(db, "cityUpdate", "UPDATE orders_bad\nSET customer_city = 'Oxford'\nWHERE order_id = 100;");
  await show(
    db,
    "cityTwo",
    `SELECT customer_id, customer_name, customer_city, COUNT(*) AS rows
FROM orders_bad
GROUP BY customer_id, customer_name, customer_city
ORDER BY customer_id, customer_city;`,
  );
}
{
  const db = await fresh(`
CREATE TABLE customers (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL
);
CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  order_date  DATE NOT NULL
);
INSERT INTO customers VALUES (1, 'Ada', 'London'), (2, 'Grace', 'Baltimore');
INSERT INTO orders VALUES
  (100, 1, DATE '2026-01-10'),
  (101, 1, DATE '2026-01-11'),
  (102, 2, DATE '2026-01-12');`);
  await show(db, "cityCustomers", "SELECT * FROM customers ORDER BY id;");
  await show(db, "cityOrders", "SELECT * FROM orders ORDER BY id;");
  await show(db, "cityGoodUpdate", "UPDATE customers\nSET city = 'Oxford'\nWHERE id = 1;");
  await show(
    db,
    "cityJoin",
    `SELECT o.id AS order_id, c.name, c.city, o.order_date
FROM orders o
JOIN customers c ON c.id = o.customer_id
ORDER BY o.id;`,
  );
}

// ── Part 5. Denormalization (denormalization) ───────────────────────────────

{
  const db = await fresh(`
CREATE TABLE orders (
  id         INTEGER PRIMARY KEY,
  order_date DATE NOT NULL
);
CREATE TABLE order_items (
  id       INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  amount   NUMERIC NOT NULL CHECK (amount >= 0)
);
INSERT INTO orders VALUES
  (1, DATE '2026-01-10'),
  (2, DATE '2026-01-10'),
  (3, DATE '2026-01-11');
INSERT INTO order_items VALUES
  (101, 1, 20.00),
  (102, 1, 5.00),
  (103, 2, 7.50),
  (104, 3, 12.00);
CREATE TABLE daily_sales_summary (
  sales_date DATE PRIMARY KEY,
  order_count INTEGER NOT NULL,
  total_amount NUMERIC NOT NULL
);`);
  await show(db, "sumOrders", "SELECT * FROM orders ORDER BY id;");
  await show(db, "sumItems", "SELECT * FROM order_items ORDER BY id;");
  await show(
    db,
    "sumBuild",
    `INSERT INTO daily_sales_summary (sales_date, order_count, total_amount)
SELECT o.order_date, COUNT(DISTINCT o.id) AS order_count, SUM(oi.amount) AS total_amount
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.order_date;`,
  );
  await show(db, "summary", "SELECT * FROM daily_sales_summary ORDER BY sales_date;");
  // The video's own change: a line added to order 3 after its day was summarized.
  await show(db, "sumLate", "INSERT INTO order_items\nVALUES (105, 3, 4.00);");
  await show(
    db,
    "sumStale",
    `SELECT s.sales_date, s.total_amount AS stored, SUM(oi.amount) AS live
FROM daily_sales_summary s
JOIN orders o ON o.order_date = s.sales_date
JOIN order_items oi ON oi.order_id = o.id
GROUP BY s.sales_date, s.total_amount
ORDER BY s.sales_date;`,
  );
}

// ── Part 5. Northwind's two prices (denormalization) ────────────────────────

{
  const local = process.argv[2];
  const raw = local ? readFileSync(local, "utf8") : await (await fetch(NORTHWIND_URL)).text();
  // As the site does (preparePostgresScriptForPglite): drop psql meta-commands
  // and CREATE/DROP DATABASE, which PGlite can't run.
  const script = raw
    .split("\n")
    .filter((line) => {
      const t = line.trimStart();
      return !t.startsWith("\\") && !/^(CREATE|DROP)\s+DATABASE\b/i.test(t);
    })
    .join("\n");
  const db = new PGlite();
  await db.exec(script);
  await show(
    db,
    "northwind",
    `SELECT
  p.product_name,
  p.unit_price AS catalog_price_now,
  od.unit_price AS price_charged,
  COUNT(*) AS order_lines
FROM
  order_details od
  JOIN products p ON p.product_id = od.product_id
WHERE
  od.unit_price <> p.unit_price
GROUP BY
  p.product_name,
  p.unit_price,
  od.unit_price
ORDER BY
  p.product_name
LIMIT
  12;`,
  );
  await show(
    db,
    "northwindCounts",
    `SELECT COUNT(*) AS lines,
  COUNT(*) FILTER (WHERE od.unit_price <> p.unit_price) AS disagree,
  COUNT(*) FILTER (WHERE od.unit_price < p.unit_price) AS charged_less,
  COUNT(DISTINCT od.product_id) FILTER (WHERE od.unit_price <> p.unit_price) AS products
FROM order_details od
JOIN products p ON p.product_id = od.product_id;`,
  );
}

// Echo what the narration leans on, for checking against script.ts.
const r = out.results;
const line = (k) => (r[k].ok ? `${k}: ${JSON.stringify(r[k].rows)} (${r[k].affected} affected)` : `${k}: ERROR ${r[k].code} ${r[k].message} | ${r[k].detail}`);
console.log(out.version);
for (const k of Object.keys(r)) console.log(line(k));
writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
