// Runs every statement the db-keys video shows in PGlite (Postgres in WASM),
// including the ones Postgres refuses, and writes what came back to
// results.json, which data.ts reads. From the repo root, where
// @electric-sql/pglite is installed:
//
//   node video/src/videos/db-keys/check.mjs
//
// Each figure runs in a fresh database built by its own `setup`, then its
// `steps` in order. A step that fails keeps Postgres's own error: message,
// DETAIL, SQLSTATE code and the constraint it names. A step that succeeds
// keeps its rows (for a SELECT) or how many rows it changed.
//
// The tables and rows are the lessons' own
// (content/courses/database-design-postgresql/):
//   - primary-keys.mdx: two customers named Taylor Kim in Portland, ids 101
//     and 102; the "duplicate primary key is rejected" block (customer 1 Ada,
//     then Grace with id 1); the enrollments roster keyed on
//     (student_id, course_id), student 7 in course 42 on 2026-01-15.
//   - natural-vs-surrogate-keys.mdx: countries keyed on 'JP'; users keyed on
//     email, ada@old.example changing to ada@new.example, with an order
//     holding it (the lesson's diagram also has tickets); the
//     surrogate users.user_id = 10; the GENERATED ALWAYS AS IDENTITY block
//     (Ada Lovelace and Grace Hopper) with email UNIQUE.
//   - foreign-keys.mdx: the "foreign key blocks an order for a missing
//     customer" block (customers 1 Ada and 2 Grace, order 101 for customer
//     1, order 102 for customer 99).
//   - referential-integrity.mdx: accounts and invoices ON DELETE RESTRICT
//     (Ada Co, invoice 100 for 250.00); the challenge's posts and comments
//     ON DELETE CASCADE (post 1 'Spam post' with comments 10 and 11, post 2
//     with comment 12); and the lesson's SET NULL example, a support ticket
//     whose assigned employee left, which the lesson describes but gives no
//     rows for: the employee and ticket rows here are the video's own.
//
// Rows the lessons do not give, and the video adds to show a rule at work:
// the order's table for the coffee beans (the lesson draws it as a diagram),
// student 8 and course 43 (so each id repeats in the roster), the student
// and course names, 'US' beside 'JP', Ada's second account for the UNIQUE
// test, and the employee and ticket.
/* global console, URL */
import { PGlite } from "@electric-sql/pglite";
import { writeFileSync } from "node:fs";

/** What a statement returned, or how Postgres refused it. */
async function step(db, sql) {
  try {
    const r = await db.query(sql);
    return {
      sql,
      ok: true,
      fields: r.fields.map((f) => f.name),
      rows: r.rows,
      affectedRows: r.affectedRows ?? 0,
    };
  } catch (e) {
    return {
      sql,
      ok: false,
      error: {
        severity: e.severity,
        code: e.code,
        message: e.message,
        detail: e.detail ?? null,
        constraint: e.constraint ?? null,
        table: e.table ?? null,
        column: e.column ?? null,
      },
    };
  }
}

const FIGURES = {
  // ── Part 1. Primary keys ──────────────────────────────────────────────
  /** A table with no key takes two identical rows without a word. */
  nokey: {
    setup: `CREATE TABLE customers (
  name TEXT,
  city TEXT
);
CREATE TABLE orders (
  item          TEXT,
  customer_name TEXT
);`,
    steps: [
      "INSERT INTO customers VALUES ('Taylor Kim', 'Portland');",
      "INSERT INTO customers VALUES ('Taylor Kim', 'Portland');",
      "SELECT * FROM customers;",
      "INSERT INTO orders VALUES ('coffee beans', 'Taylor Kim');",
      "SELECT * FROM orders;",
      // Which customer owns the order? Matching on the name finds both.
      "SELECT o.item, c.name, c.city FROM orders o JOIN customers c ON c.name = o.customer_name;",
    ],
  },
  /** The lesson's table: the same two Taylors, told apart by a key. */
  taylors: {
    setup: `CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  city        TEXT NOT NULL
);
INSERT INTO customers VALUES
  (101, 'Taylor Kim', 'Portland'),
  (102, 'Taylor Kim', 'Portland');
CREATE TABLE orders (
  item        TEXT,
  customer_id INTEGER REFERENCES customers
);
INSERT INTO orders VALUES ('coffee beans', 101);`,
    steps: [
      "SELECT * FROM customers ORDER BY customer_id;",
      "SELECT * FROM orders;",
      // Matching on the key finds exactly one.
      "SELECT o.item, c.customer_id, c.name FROM orders o JOIN customers c USING (customer_id);",
    ],
  },
  /** primary-keys.mdx, "A duplicate primary key is rejected", and the
   *  second guarantee: a row with no key at all. */
  duplicate: {
    setup: `CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  name        TEXT NOT NULL
);
INSERT INTO customers (customer_id, name)
VALUES (1, 'Ada');`,
    steps: [
      "INSERT INTO customers VALUES (1, 'Grace');",
      "INSERT INTO customers (name) VALUES ('Grace');",
      "SELECT * FROM customers;",
    ],
  },
  /** primary-keys.mdx, "Composite primary keys". */
  composite: {
    setup: `CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  name       TEXT NOT NULL
);
CREATE TABLE courses (
  course_id INTEGER PRIMARY KEY,
  title     TEXT NOT NULL
);
CREATE TABLE enrollments (
  student_id  INTEGER REFERENCES students,
  course_id   INTEGER REFERENCES courses,
  enrolled_on DATE NOT NULL,
  PRIMARY KEY (student_id, course_id)
);
INSERT INTO students VALUES (7, 'Ada'), (8, 'Grace');
INSERT INTO courses VALUES (42, 'Databases'), (43, 'Statistics');`,
    steps: [
      "INSERT INTO enrollments VALUES (7, 42, '2026-01-15');",
      "INSERT INTO enrollments VALUES (7, 43, '2026-01-15');",
      "INSERT INTO enrollments VALUES (8, 42, '2026-01-15');",
      "INSERT INTO enrollments VALUES (7, 42, '2026-01-20');",
      "SELECT student_id, course_id FROM enrollments ORDER BY student_id, course_id;",
    ],
  },

  // ── Part 2. Natural or surrogate ──────────────────────────────────────
  /** natural-vs-surrogate-keys.mdx, "Natural keys: meaningful but
   *  fragile": countries keyed on their code. */
  countries: {
    setup: `CREATE TABLE countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
INSERT INTO countries VALUES ('JP', 'Japan'), ('US', 'United States');`,
    steps: ["SELECT * FROM countries ORDER BY code;"],
  },
  /** A natural key that changes: email as the key, held by orders and
   *  tickets. With no ON UPDATE rule, Postgres refuses the change. */
  natural: {
    setup: `CREATE TABLE users (
  email TEXT PRIMARY KEY,
  name  TEXT NOT NULL
);
CREATE TABLE orders (
  order_id   INTEGER PRIMARY KEY,
  user_email TEXT NOT NULL REFERENCES users
);
INSERT INTO users VALUES ('ada@old.example', 'Ada');
INSERT INTO orders VALUES (1, 'ada@old.example');`,
    steps: [
      "SELECT * FROM users;",
      "SELECT * FROM orders;",
      "UPDATE users\nSET email = 'ada@new.example'\nWHERE email = 'ada@old.example';",
      "SELECT * FROM users;",
    ],
  },
  /** The same change with a surrogate key: the email is an attribute. */
  surrogate: {
    setup: `CREATE TABLE users (
  user_id INTEGER PRIMARY KEY,
  email   TEXT NOT NULL UNIQUE,
  name    TEXT NOT NULL
);
CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  user_id  INTEGER NOT NULL REFERENCES users
);
INSERT INTO users VALUES (10, 'ada@old.example', 'Ada');
INSERT INTO orders VALUES (1, 10);`,
    steps: [
      "SELECT * FROM users;",
      "SELECT * FROM orders;",
      "UPDATE users\nSET email = 'ada@new.example'\nWHERE user_id = 10;",
      "SELECT * FROM users;",
      "SELECT * FROM orders;",
    ],
  },
  /** natural-vs-surrogate-keys.mdx, "PostgreSQL can generate surrogate
   *  keys", then a second account for Ada's email. */
  identity: {
    setup: `CREATE TABLE customers (
  customer_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL
);`,
    steps: [
      "INSERT INTO customers (email, full_name) VALUES\n  ('ada@example.com', 'Ada Lovelace'),\n  ('grace@example.com', 'Grace Hopper');",
      "SELECT * FROM customers ORDER BY customer_id;",
      "INSERT INTO customers (email, full_name) VALUES\n  ('ada@example.com', 'Ada King');",
      "SELECT customer_id, full_name FROM customers ORDER BY customer_id;",
    ],
  },

  // ── Part 3. Foreign keys ──────────────────────────────────────────────
  /** foreign-keys.mdx, "A foreign key blocks an order for a missing
   *  customer". */
  orphan: {
    setup: `CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  name        TEXT NOT NULL
);
CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
  total       NUMERIC NOT NULL
);
INSERT INTO customers (customer_id, name)
VALUES (1, 'Ada'), (2, 'Grace');`,
    steps: [
      "SELECT * FROM customers ORDER BY customer_id;",
      "INSERT INTO orders VALUES (101, 1, 25.00);",
      "INSERT INTO orders VALUES (102, 99, 18.00);",
      "SELECT * FROM orders;",
    ],
  },

  // ── Part 4. Referential integrity ─────────────────────────────────────
  /** referential-integrity.mdx, "ON DELETE CASCADE versus RESTRICT": the
   *  accounts half. */
  restrict: {
    setup: `CREATE TABLE accounts (
  account_id INTEGER PRIMARY KEY,
  name       TEXT NOT NULL
);
CREATE TABLE invoices (
  invoice_id INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE RESTRICT,
  total      NUMERIC NOT NULL
);
INSERT INTO accounts VALUES (1, 'Ada Co');
INSERT INTO invoices VALUES (100, 1, 250.00);`,
    steps: [
      "SELECT * FROM accounts;",
      "SELECT * FROM invoices;",
      "DELETE FROM accounts WHERE account_id = 1;",
      "SELECT * FROM accounts;",
      "SELECT * FROM invoices;",
    ],
  },
  /** referential-integrity.mdx, the drafts half of the same block. */
  drafts: {
    setup: `CREATE TABLE drafts (
  draft_id INTEGER PRIMARY KEY,
  title    TEXT NOT NULL
);
CREATE TABLE draft_comments (
  comment_id INTEGER PRIMARY KEY,
  draft_id   INTEGER NOT NULL REFERENCES drafts(draft_id) ON DELETE CASCADE,
  body       TEXT NOT NULL
);
INSERT INTO drafts VALUES (1, 'Temporary plan');
INSERT INTO draft_comments VALUES (10, 1, 'Needs revision');`,
    steps: ["DELETE FROM drafts WHERE draft_id = 1;", "SELECT * FROM draft_comments;"],
  },
  /** referential-integrity.mdx, "Delete a post and let the cascade clean
   *  up": the challenge's posts and comments, and its solution. */
  cascade: {
    setup: `CREATE TABLE posts (
  id    INTEGER PRIMARY KEY,
  title TEXT NOT NULL
);
CREATE TABLE comments (
  id      INTEGER PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  body    TEXT NOT NULL
);
INSERT INTO posts VALUES
  (1, 'Spam post'),
  (2, 'Keep this post');
INSERT INTO comments VALUES
  (10, 1, 'Spam comment one'),
  (11, 1, 'Spam comment two'),
  (12, 2, 'A real comment');`,
    steps: [
      "SELECT * FROM posts ORDER BY id;",
      "SELECT id, post_id FROM comments ORDER BY id;",
      "DELETE FROM posts WHERE id = 1;",
      "SELECT * FROM posts ORDER BY id;",
      "SELECT id, post_id FROM comments ORDER BY id;",
    ],
  },
  /** referential-integrity.mdx, "SET NULL: the child can survive without a
   *  parent": a ticket whose assigned employee left. */
  setnull: {
    setup: `CREATE TABLE employees (
  employee_id INTEGER PRIMARY KEY,
  name        TEXT NOT NULL
);
CREATE TABLE tickets (
  ticket_id            INTEGER PRIMARY KEY,
  status               TEXT NOT NULL,
  assigned_employee_id INTEGER REFERENCES employees ON DELETE SET NULL
);
INSERT INTO employees VALUES (3, 'Sam');
INSERT INTO tickets VALUES (500, 'open', 3);`,
    steps: [
      "SELECT * FROM employees;",
      "SELECT ticket_id, assigned_employee_id FROM tickets;",
      "DELETE FROM employees WHERE employee_id = 3;",
      "SELECT ticket_id, assigned_employee_id FROM tickets;",
      "SELECT * FROM tickets;",
    ],
  },
  /** The lesson's quick check: SET NULL on a NOT NULL column cannot work. */
  setnullNotNull: {
    setup: `CREATE TABLE employees (
  employee_id INTEGER PRIMARY KEY,
  name        TEXT NOT NULL
);
CREATE TABLE tickets (
  ticket_id            INTEGER PRIMARY KEY,
  status               TEXT NOT NULL,
  assigned_employee_id INTEGER NOT NULL REFERENCES employees ON DELETE SET NULL
);
INSERT INTO employees VALUES (3, 'Sam');
INSERT INTO tickets VALUES (500, 'open', 3);`,
    steps: ["DELETE FROM employees WHERE employee_id = 3;"],
  },
  /** With no ON DELETE at all (NO ACTION), deleting a referenced parent is
   *  refused too: what the plain REFERENCES in foreign-keys.mdx does. */
  noaction: {
    setup: `CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  name        TEXT NOT NULL
);
CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
  total       NUMERIC NOT NULL
);
INSERT INTO customers VALUES (1, 'Ada');
INSERT INTO orders VALUES (101, 1, 25.00);`,
    steps: ["DELETE FROM customers WHERE customer_id = 1;"],
  },
};

let version = "";
const out = { version, figures: {} };
for (const [name, fig] of Object.entries(FIGURES)) {
  const db = new PGlite();
  await db.exec(fig.setup);
  if (!version) version = (await db.query("SELECT version()")).rows[0].version;
  const steps = [];
  for (const sql of fig.steps) steps.push(await step(db, sql));
  out.figures[name] = { setup: fig.setup, steps };
  await db.close();
  console.log(`\n── ${name}`);
  for (const s of steps) {
    const head = s.sql.split("\n")[0];
    if (s.ok) {
      const rows = s.rows.length ? ` ${JSON.stringify(s.rows)}` : "";
      console.log(`  ok  ${head}  (${s.affectedRows} changed)${rows}`);
    } else {
      console.log(`  ERR ${head}\n      ${s.error.code} ${s.error.message}\n      DETAIL: ${s.error.detail}`);
    }
  }
}
out.version = version;
console.log(`\n${version}`);
writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
