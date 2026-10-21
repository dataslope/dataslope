// Runs every statement the db-relationships video (Database Design Unit 3)
// shows in PGlite (Postgres in WASM) and writes what came back, errors
// included, to results.json, which data.ts reads. From the repo root, where
// @electric-sql/pglite is installed:
//
//   node video/src/videos/db-relationships/check.mjs
//
// Each database is built from a lesson's own initSql, unchanged
// (content/courses/database-design-postgresql/):
//   - shop:  cardinality.mdx, "One customer can have many orders": Ada and
//            Grace, and orders 101 and 102 (Ada's) and 103 (Grace's), the same
//            rows what-are-relationships.mdx draws in "A relationship connects
//            rows".
//   - wide:  what-are-relationships.mdx, "A relationship lets a query cross
//            tables", run only to check its rows against that drawing (they
//            disagree: see the report in script.ts).
//   - badges: cardinality.mdx, "Uniqueness turns many into at-most-one".
//   - devices: cardinality.mdx's diagram (employees ||--o{ devices), which has
//            no SQL in the lesson: two devices sharing employee 1.
//   - model: reading-er-diagrams.mdx, "Querying through the diagram".
/* global console, URL */
import { PGlite } from "@electric-sql/pglite";
import { writeFileSync } from "node:fs";

const out = { version: "", runs: {} };

/** Runs `sql` and records its rows, or the error Postgres raised. */
async function run(db, key, sql) {
  try {
    const r = await db.query(sql);
    out.runs[key] = { sql, ok: true, fields: r.fields.map((f) => f.name), rows: r.rows, affected: r.affectedRows ?? 0 };
  } catch (e) {
    out.runs[key] = {
      sql,
      ok: false,
      error: { message: e.message, detail: e.detail ?? null, code: e.code ?? null, constraint: e.constraint ?? null },
    };
  }
  return out.runs[key];
}

// ── shop: one customer, many orders (cardinality.mdx) ────────────────────────
{
  const db = new PGlite();
  out.version = (await db.query("SELECT version()")).rows[0].version;
  await db.exec(`CREATE TABLE customers (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id)
);
INSERT INTO customers VALUES (1, 'Ada'), (2, 'Grace');
INSERT INTO orders VALUES (101, 1), (102, 1), (103, 2);`);
  await run(db, "customers", "SELECT id, name FROM customers ORDER BY id;");
  await run(db, "orders", "SELECT id, customer_id FROM orders ORDER BY id;");
  // The lesson's own query: how many orders each customer has.
  await run(
    db,
    "orderCount",
    `SELECT
  c.name,
  COUNT(o.id) AS order_count
FROM
  customers c
  LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY
  c.id,
  c.name
ORDER BY
  c.id;`,
  );
  // What the video says of the other direction: an order has exactly one
  // customer, so it can't be stored without one, or with one that isn't there.
  await run(db, "orderWithoutCustomer", "INSERT INTO orders VALUES (104, NULL);");
  await run(db, "orderWithMissingCustomer", "INSERT INTO orders VALUES (104, 3);");
  await db.close();
}

// ── wide: the 24-customer block of what-are-relationships.mdx ────────────────
{
  const db = new PGlite();
  const names = [
    "Ada", "Grace", "Linus", "Mae", "Rosa", "Ivan", "Nadia", "Omar", "Priya", "Quinn", "Ruth", "Sam",
    "Tariq", "Uma", "Viktor", "Wen", "Xenia", "Yusuf", "Zara", "Bruno", "Chidi", "Dara", "Elif", "Farid",
  ];
  const orders = Array.from({ length: 30 }, (_, i) => {
    const id = 101 + i;
    const customer = (i % 24) + 1;
    const day = String(i + 1).padStart(2, "0");
    return `(${id}, ${customer}, DATE '2025-03-${day}')`;
  });
  await db.exec(`CREATE TABLE customers (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  placed_on   DATE NOT NULL
);
INSERT INTO customers VALUES ${names.map((n, i) => `(${i + 1}, '${n}')`).join(", ")};
INSERT INTO orders VALUES ${orders.join(", ")};`);
  await run(
    db,
    "wideFirstOrders",
    "SELECT c.name, o.id AS order_id FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.id IN (101, 102, 103) ORDER BY o.id;",
  );
  await run(
    db,
    "wideAda",
    "SELECT c.name, o.id AS order_id FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.name = 'Ada' ORDER BY o.id;",
  );
  await db.close();
}

// ── badges: uniqueness turns many into at-most-one (cardinality.mdx) ────────
{
  const db = new PGlite();
  await db.exec(`CREATE TABLE employees (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE badges (
  id          INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL UNIQUE REFERENCES employees(id)
);
INSERT INTO employees VALUES (1, 'Ada');
INSERT INTO badges VALUES (10, 1);`);
  await run(db, "employees", "SELECT id, name FROM employees ORDER BY id;");
  await run(db, "badgesBefore", "SELECT id, employee_id FROM badges ORDER BY id;");
  // The lesson's starter: a second badge for Ada.
  await run(db, "secondBadge", "INSERT INTO badges VALUES (11, 1);");
  await run(db, "badgesAfter", "SELECT * FROM badges;");
  await db.close();
}

// ── devices: the many end of the same diagram (cardinality.mdx) ──────────────
// The lesson draws employees ||--o{ devices but gives it no SQL, so this is
// built to the diagram's columns: a plain foreign key, no UNIQUE, and two of
// Ada's devices to show rows sharing her id.
{
  const db = new PGlite();
  await db.exec(`CREATE TABLE employees (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE devices (
  id          INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id)
);
INSERT INTO employees VALUES (1, 'Ada');`);
  await run(db, "devicesInsert", "INSERT INTO devices VALUES (20, 1), (21, 1);");
  await run(db, "devices", "SELECT id, employee_id FROM devices ORDER BY id;");
  await db.close();
}

// ── model: the shop diagram, queried through its keys (reading-er-diagrams) ──
{
  const db = new PGlite();
  await db.exec(`CREATE TABLE customers (
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
CREATE TABLE products (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  price NUMERIC NOT NULL
);
CREATE TABLE order_items (
  order_id    INTEGER NOT NULL REFERENCES orders(id),
  line_number INTEGER NOT NULL,
  product_id  INTEGER NOT NULL REFERENCES products(id),
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (order_id, line_number)
);
INSERT INTO customers VALUES (1, 'Ada', 'ada@example.com');
INSERT INTO orders VALUES (101, 1, DATE '2025-04-01', 'placed');
INSERT INTO products VALUES (10, 'Notebook', 8.50), (11, 'Pen', 1.25);
INSERT INTO order_items VALUES (101, 1, 10, 2), (101, 2, 11, 3);`);
  // The lesson's query, as printed.
  await run(
    db,
    "path",
    `SELECT
  c.name AS customer,
  o.id AS order_id,
  oi.line_number,
  p.name AS product,
  oi.quantity
FROM
  customers c
  JOIN orders o ON o.customer_id = c.id
  JOIN order_items oi ON oi.order_id = o.id
  JOIN products p ON p.id = oi.product_id
ORDER BY
  o.id,
  oi.line_number;`,
  );
  // The foreign keys the diagram's lines stand for, as Postgres lists them.
  await run(
    db,
    "foreignKeys",
    `SELECT conrelid::regclass::text AS from_table,
       a.attname AS from_column,
       confrelid::regclass::text AS to_table,
       af.attname AS to_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = c.confkey[1]
WHERE c.contype = 'f'
ORDER BY from_table, from_column;`,
  );
  // "One order contains one or many order items": the keys alone don't hold
  // the minimum of one. An order with no lines is accepted.
  await run(db, "emptyOrder", "INSERT INTO orders VALUES (102, 1, DATE '2025-04-02', 'placed');");
  await db.close();
}

for (const [k, r] of Object.entries(out.runs)) {
  console.log(`${k}: ${r.ok ? JSON.stringify(r.rows) : `ERROR ${r.error.code} ${r.error.message} | ${r.error.detail}`}`);
}
console.log(out.version);
writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
