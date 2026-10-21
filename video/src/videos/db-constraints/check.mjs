// Runs every statement the db-constraints video shows in PGlite (Postgres in
// WASM), including the ones Postgres refuses, and writes what came back to
// results.json, which data.ts reads. From the repo root, where
// @electric-sql/pglite is installed:
//
//   node video/src/videos/db-constraints/check.mjs
//
// Each figure runs in a fresh database built from its own SETUP, so the ids a
// SERIAL hands out (and a failing row's DETAIL line) are exactly what a reader
// gets running the lesson's block once. The tables and rows are the lessons'
// own (content/courses/database-design-postgresql/):
//
//   what-are-constraints   products, the 'Broken price' at -3.00
//   choosing-data-types    order_items and 'many'; money_demo's 0.1 + 0.2
//   not-null-and-defaults  accounts, email NOT NULL, status DEFAULT 'active'
//   unique-constraints     accounts with UNIQUE email; enrollments' pair;
//                          users and profiles (the one-to-one ERD)
//   check-constraints      products with a status CHECK, 'banana'; events'
//                          'Backwards conference'; NOT NULL beside CHECK
//   why-normalization      orders_flat and the rushed update, for the bridge
//
// Four things are the video's own, each marked below: enrollments' two extra
// rows (1, 20) and (2, 10), which show the lesson's claim that each value may
// repeat on its own; the profiles rows, which run the lesson's one-to-one
// ERD; the price left out of a CHECK-only column, which runs the lesson's
// "a NULL expression may be unknown rather than false"; and the same insert
// against NOT NULL as well.
/* global console, URL */
import { PGlite } from "@electric-sql/pglite";
import { writeFileSync } from "node:fs";

/** A statement's outcome: its rows, or Postgres's error as it reports it. */
async function run(db, sql) {
  try {
    const r = await db.query(sql);
    return {
      ok: true,
      command: r.command ?? null,
      affectedRows: r.affectedRows ?? 0,
      fields: r.fields.map((f) => f.name),
      rows: r.rows,
    };
  } catch (e) {
    return {
      ok: false,
      error: {
        severity: e.severity,
        code: e.code,
        message: e.message,
        detail: e.detail ?? null,
        table: e.table ?? null,
        column: e.column ?? null,
        constraint: e.constraint ?? null,
      },
    };
  }
}

/** A fresh database, its setup, then each statement in order. */
async function figure(setup, statements) {
  const db = new PGlite();
  await db.exec(setup);
  const out = { setup: setup.trim(), steps: {} };
  for (const [k, sql] of Object.entries(statements)) out.steps[k] = { sql, ...(await run(db, sql)) };
  await db.close();
  return out;
}

const version = await (async () => {
  const db = new PGlite();
  const v = (await db.query("SELECT version()")).rows[0].version;
  await db.close();
  return v;
})();

const FIGURES = {
  // what-are-constraints, "Watch a constraint reject bad data".
  price: await figure(
    `
CREATE TABLE products (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0)
);
INSERT INTO products (name, price) VALUES ('Notebook', 4.50);`,
    {
      bad: "INSERT INTO products (name, price) VALUES ('Broken price', -3.00);",
      after: "SELECT id, name, price FROM products;",
    },
  ),

  // choosing-data-types, "Watch a type reject bad input".
  type: await figure(
    `
CREATE TABLE order_items (
  id       SERIAL PRIMARY KEY,
  sku      TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);
INSERT INTO order_items (sku, quantity) VALUES ('PEN-1', 3);`,
    {
      bad: "INSERT INTO order_items (sku, quantity) VALUES ('BOOK-1', 'many');",
      after: "SELECT id, sku, quantity FROM order_items;",
    },
  ),

  // choosing-data-types, "Why not float for money?".
  money: await figure(
    `
CREATE TABLE money_demo (
  id SERIAL PRIMARY KEY,
  exact_amount NUMERIC,
  approximate_amount DOUBLE PRECISION
);
INSERT INTO money_demo (exact_amount, approximate_amount)
VALUES (0.1 + 0.2, 0.1::double precision + 0.2::double precision);`,
    {
      compare: `SELECT
  exact_amount,
  approximate_amount,
  exact_amount = 0.3 AS numeric_is_exact,
  approximate_amount = 0.3::double precision AS float_equals_point_three
FROM money_demo;`,
      // The float as Postgres prints it in text, every digit.
      text: "SELECT exact_amount::text AS exact, approximate_amount::text AS approximate FROM money_demo;",
    },
  ),

  // not-null-and-defaults, "Watch NOT NULL and DEFAULT work".
  notNull: await figure(
    `
CREATE TABLE accounts (
  id     SERIAL PRIMARY KEY,
  email  TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);`,
    {
      fills: "INSERT INTO accounts (email) VALUES ('ada@example.com');",
      missing: "INSERT INTO accounts (status) VALUES ('active');",
      after: "SELECT id, email, status FROM accounts;",
    },
  ),

  // unique-constraints, "Watch a duplicate get rejected".
  unique: await figure(
    `
CREATE TABLE accounts (
  id       SERIAL PRIMARY KEY,
  email    TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE
);
INSERT INTO accounts (email, username)
VALUES ('ada@example.com', 'ada');`,
    {
      dup: "INSERT INTO accounts (email, username) VALUES ('ada@example.com', 'ada_2');",
      after: "SELECT id, email, username FROM accounts;",
    },
  ),

  // unique-constraints, "Composite UNIQUE". The two extra rows are the
  // video's own: the same student in another course, another student in the
  // same course, both accepted.
  pair: await figure(
    `
CREATE TABLE enrollments (
  student_id INTEGER NOT NULL,
  course_id  INTEGER NOT NULL,
  enrolled_on DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (student_id, course_id)
);
INSERT INTO enrollments (student_id, course_id) VALUES (1, 10);`,
    {
      otherCourse: "INSERT INTO enrollments (student_id, course_id) VALUES (1, 20);",
      otherStudent: "INSERT INTO enrollments (student_id, course_id) VALUES (2, 10);",
      dup: "INSERT INTO enrollments (student_id, course_id) VALUES (1, 10);",
      // enrolled_on is today's date, so it is left out of what is shown.
      after: "SELECT student_id, course_id FROM enrollments ORDER BY student_id, course_id;",
    },
  ),

  // unique-constraints, "One-to-one relationships and natural keys": the
  // lesson's ERD, run (the video's own rows).
  oneToOne: await figure(
    `
CREATE TABLE users (
  id    SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE
);
CREATE TABLE profiles (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL UNIQUE REFERENCES users (id),
  display_name TEXT NOT NULL
);
INSERT INTO users (email) VALUES ('ada@example.com');
INSERT INTO profiles (user_id, display_name) VALUES (1, 'Ada');`,
    {
      second: "INSERT INTO profiles (user_id, display_name) VALUES (1, 'Ada again');",
      after: "SELECT id, user_id, display_name FROM profiles ORDER BY id;",
    },
  ),

  // check-constraints, "Watch CHECK reject bad values": each bad insert
  // against a fresh copy, as a reader runs one at a time.
  status: await figure(
    `
CREATE TABLE products (
  id     SERIAL PRIMARY KEY,
  name   TEXT NOT NULL,
  price  NUMERIC NOT NULL CHECK (price >= 0),
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'archived'))
);
INSERT INTO products (name, price, status)
VALUES ('Notebook', 4.50, 'active');`,
    {
      banana: "INSERT INTO products (name, price, status) VALUES ('Mystery item', 5.00, 'banana');",
      after: "SELECT id, name, price, status FROM products;",
    },
  ),

  // check-constraints, "CHECK with multiple columns".
  dates: await figure(
    `
CREATE TABLE events (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  CHECK (end_date > start_date)
);`,
    {
      backwards: "INSERT INTO events (name, start_date, end_date) VALUES ('Backwards conference', '2026-06-10', '2026-06-08');",
      after: "SELECT * FROM events;",
    },
  ),

  // check-constraints, "A note about NULL and CHECK": a CHECK alone lets a
  // missing price through (the video's own run of the lesson's claim)...
  checkOnly: await figure(
    `
CREATE TABLE products (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL,
  price NUMERIC CHECK (price >= 0)
);
INSERT INTO products (name, price) VALUES ('Notebook', 4.50);`,
    {
      unknown: "SELECT NULL::numeric >= 0 AS test;",
      noPrice: "INSERT INTO products (name) VALUES ('Pen');",
      after: "SELECT id, name, price FROM products ORDER BY id;",
    },
  ),
  // ...and NOT NULL beside it does not: the lesson's preferred
  // `price NUMERIC NOT NULL CHECK (price >= 0)`.
  checkAndNotNull: await figure(
    `
CREATE TABLE products (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0)
);
INSERT INTO products (name, price) VALUES ('Notebook', 4.50);`,
    {
      noPrice: "INSERT INTO products (name) VALUES ('Pen');",
      after: "SELECT id, name, price FROM products ORDER BY id;",
    },
  ),

  // why-normalization's flat table, for the bridge: every write succeeds,
  // and the one fact stored twice disagrees with itself.
  flat: await figure(
    `
CREATE TABLE orders_flat (
  order_id       INTEGER PRIMARY KEY,
  product_name   TEXT NOT NULL,
  customer_name  TEXT NOT NULL,
  customer_email TEXT NOT NULL
);
INSERT INTO orders_flat VALUES
  (1, 'Notebook', 'Ada',   'ada@old.test'),
  (2, 'Pencil',   'Ada',   'ada@old.test'),
  (3, 'Notebook', 'Grace', 'grace@test.test');`,
    {
      before: "SELECT * FROM orders_flat ORDER BY order_id;",
      update: "UPDATE orders_flat SET customer_email = 'ada@new.test' WHERE order_id = 1;",
      after: "SELECT * FROM orders_flat ORDER BY order_id;",
      emails: "SELECT count(DISTINCT customer_email) AS emails FROM orders_flat WHERE customer_name = 'Ada';",
    },
  ),
};

const out = { version, figures: FIGURES };
writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");

// Echo every outcome, for checking against script.ts.
console.log(version.split(" on ")[0]);
for (const [name, f] of Object.entries(FIGURES)) {
  for (const [k, s] of Object.entries(f.steps)) {
    const what = s.ok
      ? `${s.command} ${s.affectedRows}${s.rows.length ? ` ${JSON.stringify(s.rows)}` : ""}`
      : `ERROR ${s.error.code} ${s.error.message}${s.error.detail ? ` | ${s.error.detail}` : ""}`;
    console.log(`${name}.${k}: ${what}`);
  }
}
