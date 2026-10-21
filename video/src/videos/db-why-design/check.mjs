// Runs every statement the db-why-design video shows in PGlite (Postgres in
// WASM) and writes what came back to results.json, which data.ts reads. From
// the repo root, where @electric-sql/pglite is installed:
//
//   node video/src/videos/db-why-design/check.mjs
//
// Three databases, each built fresh from a lesson's own SQL
// (content/courses/database-design-postgresql/):
//
//   flat     what-is-database-design.mdx, "Watch a shortcut go wrong": its
//            initSql verbatim, then its starterCode (the rushed UPDATE and the
//            GROUP BY that shows two emails for Ada).
//   shop     what-is-database-design.mdx, "The schema shapes everything built
//            on it": its initSql verbatim, then its starterCode (which
//            customers bought a notebook). The three refused rows are the
//            video's own: the three kinds of bad data design-and-data-quality
//            opens on, written against this schema's rules (its UNIQUE email,
//            its CHECK (quantity > 0), its foreign key to customers).
//   library  what-is-database-design.mdx, the library ER diagram, written as
//            DDL with the diagram's columns, keys and links, and read back
//            from the catalog so every entity box on screen is what Postgres
//            built.
//
// Also design-and-data-quality.mdx's own unique-email block (Ana Rivera),
// run verbatim, whose error the video's duplicate-customer row matches in
// kind.
/* global console, URL */
import { PGlite } from "@electric-sql/pglite";
import { writeFileSync } from "node:fs";

const out = { version: "", flat: {}, shop: {}, library: {}, ana: {}, units: {} };

/** A query's rows as arrays, in field order. */
const table = (r) => ({ fields: r.fields.map((f) => f.name), rows: r.rows.map((row) => r.fields.map((f) => row[f.name])) });

/** Run a statement that must fail; return Postgres's own words. */
async function refused(db, sql) {
  try {
    await db.query(sql);
  } catch (e) {
    return {
      sql,
      code: e.code,
      message: e.message,
      detail: e.detail ?? null,
      constraint: e.constraint ?? null,
      table: e.table ?? null,
    };
  }
  throw new Error(`expected an error from: ${sql}`);
}

// ── Flat: the update anomaly ─────────────────────────────────────────────────
{
  const db = new PGlite();
  out.version = (await db.query("SELECT version()")).rows[0].version;
  await db.exec(`CREATE TABLE order_spreadsheet (
  order_id       INTEGER PRIMARY KEY,
  customer_name  TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  product_name   TEXT NOT NULL,
  quantity       INTEGER NOT NULL CHECK (quantity > 0)
);

INSERT INTO order_spreadsheet VALUES
  (101, 'Ada Lovelace', 'ada@old.example', 'Notebook', 2),
  (102, 'Ada Lovelace', 'ada@old.example', 'Pen', 5),
  (103, 'Grace Hopper', 'grace@example.com', 'Notebook', 1);`);
  const SELECT_ALL = "SELECT * FROM order_spreadsheet ORDER BY order_id;";
  const UPDATE = `UPDATE order_spreadsheet
SET customer_email = 'ada@new.example'
WHERE order_id = 101;`;
  const GROUPED = `SELECT
  customer_name,
  customer_email,
  COUNT(*) AS rows_with_that_email
FROM
  order_spreadsheet
GROUP BY
  customer_name,
  customer_email
ORDER BY
  customer_name;`;
  out.flat.before = table(await db.query(SELECT_ALL));
  const u = await db.query(UPDATE);
  out.flat.update = { sql: UPDATE, affectedRows: u.affectedRows };
  out.flat.after = table(await db.query(SELECT_ALL));
  // ORDER BY customer_name alone leaves Ada's two rows in no promised order;
  // the video draws them in the order this run returned.
  out.flat.grouped = { sql: GROUPED, ...table(await db.query(GROUPED)) };
  out.flat.adaEmails = (
    await db.query("SELECT COUNT(DISTINCT customer_email)::int AS n FROM order_spreadsheet WHERE customer_name = 'Ada Lovelace'")
  ).rows[0].n;
  await db.close();
}

// ── Shop: a clean schema, a question, and three refused rows ─────────────────
{
  const db = new PGlite();
  await db.exec(`CREATE TABLE customers (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE products (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  ordered_on  DATE NOT NULL
);

CREATE TABLE order_items (
  order_id   INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (order_id, product_id)
);

INSERT INTO customers VALUES
  (1, 'Ada Lovelace', 'ada@example.com'),
  (2, 'Grace Hopper', 'grace@example.com'),
  (3, 'Katherine Johnson', 'katherine@example.com');

INSERT INTO products VALUES
  (10, 'Notebook'),
  (20, 'Pen'),
  (30, 'Backpack');

INSERT INTO orders VALUES
  (101, 1, DATE '2025-03-01'),
  (102, 2, DATE '2025-03-02'),
  (103, 1, DATE '2025-03-03');

INSERT INTO order_items VALUES
  (101, 10, 2),
  (101, 20, 5),
  (102, 30, 1),
  (103, 10, 1);`);
  const NOTEBOOK = `SELECT DISTINCT
  customers.name,
  customers.email
FROM
  customers
  JOIN orders ON orders.customer_id = customers.id
  JOIN order_items ON order_items.order_id = orders.id
  JOIN products ON products.id = order_items.product_id
WHERE
  products.name = 'Notebook'
ORDER BY
  customers.name;`;
  out.shop.notebook = { sql: NOTEBOOK, ...table(await db.query(NOTEBOOK)) };
  // How many notebook lines sit behind that one name (orders 101 and 103).
  out.shop.notebookLines = table(
    await db.query(`SELECT orders.id AS order_id, customers.name, order_items.quantity
FROM customers
JOIN orders ON orders.customer_id = customers.id
JOIN order_items ON order_items.order_id = orders.id
JOIN products ON products.id = order_items.product_id
WHERE products.name = 'Notebook'
ORDER BY orders.id;`),
  );
  out.shop.columns = {};
  for (const t of ["customers", "orders", "order_items", "products"]) {
    out.shop.columns[t] = (
      await db.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
        [t],
      )
    ).rows;
  }
  out.shop.keys = (
    await db.query(`SELECT tc.table_name, kcu.column_name, tc.constraint_type, tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name AND kcu.table_name = tc.table_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.ordinal_position, tc.constraint_type`)
  ).rows;

  // Every order line, with its customer and product: what each customer
  // bought in this shop (Grace's one order is a backpack, not a notebook).
  out.shop.orderLines = table(
    await db.query(`SELECT orders.id AS order_id, customers.name AS customer, products.name AS product, order_items.quantity
FROM order_items
JOIN orders ON orders.id = order_items.order_id
JOIN customers ON customers.id = orders.customer_id
JOIN products ON products.id = order_items.product_id
ORDER BY orders.id, products.id;`),
  );

  // The three kinds of bad data design-and-data-quality opens on, one row
  // each, against this schema's own rules. Each names its columns, so the
  // listing says which value is the quantity and which the customer.
  out.shop.refused = {
    duplicate: await refused(db, "INSERT INTO customers (id, name, email) VALUES (4, 'Ada L.', 'ada@example.com');"),
    zero: await refused(db, "INSERT INTO order_items (order_id, product_id, quantity) VALUES (102, 10, 0);"),
    orphan: await refused(db, "INSERT INTO orders (id, customer_id, ordered_on) VALUES (104, 99, DATE '2025-03-04');"),
  };
  // Each broken rule as the catalog defines it, for the tag beside each block.
  for (const r of Object.values(out.shop.refused)) {
    r.def = (await db.query("SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1", [r.constraint])).rows[0].def;
  }
  // Nothing got in: the tables hold what they held.
  out.shop.countsAfter = (
    await db.query(`SELECT (SELECT COUNT(*) FROM customers)::int AS customers,
  (SELECT COUNT(*) FROM orders)::int AS orders,
  (SELECT COUNT(*) FROM order_items)::int AS order_items`)
  ).rows[0];
  await db.close();
}

// ── Library: the lesson's ER diagram, built ──────────────────────────────────
{
  const db = new PGlite();
  await db.exec(`CREATE TABLE books (
  id     INTEGER PRIMARY KEY,
  title  TEXT NOT NULL,
  author TEXT NOT NULL
);
CREATE TABLE book_copies (
  id      INTEGER PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id),
  barcode TEXT NOT NULL UNIQUE
);
CREATE TABLE borrowers (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE loans (
  id          INTEGER PRIMARY KEY,
  borrower_id INTEGER NOT NULL REFERENCES borrowers(id),
  copy_id     INTEGER NOT NULL REFERENCES book_copies(id),
  loaned_on   DATE NOT NULL,
  due_on      DATE NOT NULL
);`);
  out.library.columns = {};
  for (const t of ["books", "book_copies", "borrowers", "loans"]) {
    out.library.columns[t] = (
      await db.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
        [t],
      )
    ).rows;
  }
  out.library.keys = (
    await db.query(`SELECT tc.table_name, kcu.column_name, tc.constraint_type, ccu.table_name AS points_at
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name AND kcu.table_name = tc.table_name
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name AND tc.constraint_type = 'FOREIGN KEY'
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.ordinal_position, tc.constraint_type`)
  ).rows;
  await db.close();
}

// ── design-and-data-quality's own unique-email block, verbatim ───────────────
{
  const db = new PGlite();
  await db.exec(`DROP TABLE IF EXISTS customers;

CREATE TABLE customers (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL
);

INSERT INTO customers (email, full_name) VALUES
    ('ana@example.com', 'Ana Rivera');
`);
  out.ana = await refused(
    db,
    `INSERT INTO
  customers (email, full_name)
VALUES
  ('ana@example.com', 'Ana R.');`,
  );
  await db.close();
}

// ── Units: the Mars Climate Orbiter's factor (design-and-data-quality) ───────
// One pound-force second in newton-seconds, from the definitions: a pound is
// exactly 0.45359237 kg, and standard gravity exactly 9.80665 m/s².
out.units.lbfSecondInNewtonSeconds = 0.45359237 * 9.80665;

console.log(out.version);
console.log("update affected", out.flat.update.affectedRows, "row; Ada's emails:", out.flat.adaEmails);
console.log("grouped:", JSON.stringify(out.flat.grouped.rows));
console.log("notebook:", JSON.stringify(out.shop.notebook.rows));
for (const [k, v] of Object.entries(out.shop.refused)) console.log(k, v.code, v.message, "|", v.detail, "|", v.def);
console.log("ana", out.ana.code, out.ana.message, "|", out.ana.detail);
console.log("after:", JSON.stringify(out.shop.countsAfter));
console.log("1 lbf·s =", out.units.lbfSecondInNewtonSeconds, "N·s");
writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
