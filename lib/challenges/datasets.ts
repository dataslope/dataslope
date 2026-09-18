/**
 * Seed databases shared by the SQL challenges.
 *
 * A challenge declares which dataset it wants; the workspace runs that
 * dataset's `initSql` once, in the browser, before the learner's first query.
 * Sharing a handful of datasets across many challenges is what keeps the
 * catalog's total seed small — a learner who solves ten retail challenges
 * downloads one schema, and the engine is already warm.
 *
 * Every dataset is deliberately tiny (tens of rows). The point is that a
 * learner can reason about the answer, and that the expected result of a
 * correct query is small enough to eyeball. `__tests__/challengeSolutions`
 * runs each dataset through node:sqlite, so a typo here fails CI rather than
 * the first learner.
 *
 * Dialect is SQLite for the whole pilot: it is the lightest engine to
 * download, and the only one the offline verifier can execute. Nothing in the
 * types stops a challenge from asking for DuckDB or Postgres later.
 */

import type { SchemaTable } from "./types";

export interface ChallengeDataset {
  /** Schema and rows, executed once before the learner's first query. */
  initSql: string;
  /** What the instructions pane's schema browser shows. */
  schema: SchemaTable[];
}

// ─── Retail: orders, items, products, customers ──────────────────────

const RETAIL_SQL = `
CREATE TABLE products (
  product_id   INTEGER PRIMARY KEY,
  product_name TEXT    NOT NULL,
  category     TEXT    NOT NULL,
  unit_cost    REAL    NOT NULL
);
INSERT INTO products VALUES
  (1, 'Cold Brew Concentrate', 'Coffee', 4.10),
  (2, 'Espresso Beans 250g',   'Coffee', 3.40),
  (3, 'Oat Milk 1L',           'Dairy',  1.20),
  (4, 'Paper Cups 12oz',       'Supplies', 0.08),
  (5, 'Syrup Vanilla 750ml',   'Syrup',  2.75),
  (6, 'Matcha Powder 100g',    'Tea',    6.50),
  (7, 'Ceramic Mug 350ml',     'Supplies', 1.90);

CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  full_name   TEXT NOT NULL,
  city        TEXT NOT NULL,
  signed_up   TEXT NOT NULL
);
INSERT INTO customers VALUES
  (1, 'Maya Chen',   'Portland', '2023-11-02'),
  (2, 'Luis Ortega', 'Austin',   '2023-12-14'),
  (3, 'Priya Nair',  'Portland', '2024-01-05'),
  (4, 'Tom Becker',  'Denver',   '2024-01-19'),
  (5, 'Ana Sousa',   'Austin',   '2024-02-08');

CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
  order_date  TEXT    NOT NULL,
  status      TEXT    NOT NULL
);
INSERT INTO orders VALUES
  (1001, 1, '2024-01-03', 'completed'),
  (1002, 2, '2024-01-07', 'completed'),
  (1003, 3, '2024-01-12', 'completed'),
  (1004, 1, '2024-01-18', 'cancelled'),
  (1005, 4, '2024-01-21', 'completed'),
  (1006, 2, '2024-01-28', 'completed'),
  (1007, 5, '2024-02-02', 'completed'),
  (1008, 3, '2024-02-06', 'completed'),
  (1009, 1, '2024-02-11', 'completed'),
  (1010, 4, '2024-02-15', 'cancelled'),
  (1011, 2, '2024-02-19', 'completed'),
  (1012, 5, '2024-02-24', 'completed'),
  (1013, 3, '2024-03-01', 'completed'),
  (1014, 1, '2024-03-05', 'completed'),
  (1015, 4, '2024-03-09', 'completed'),
  (1016, 2, '2024-03-14', 'completed'),
  (1017, 5, '2024-03-18', 'completed'),
  (1018, 3, '2024-03-22', 'completed');

CREATE TABLE order_items (
  order_id   INTEGER NOT NULL REFERENCES orders(order_id),
  product_id INTEGER NOT NULL REFERENCES products(product_id),
  quantity   INTEGER NOT NULL,
  unit_price REAL    NOT NULL
);
INSERT INTO order_items VALUES
  (1001, 1, 12, 9.50), (1001, 3, 20, 2.40), (1001, 4, 100, 0.15),
  (1002, 2, 8,  7.20), (1002, 5, 4,  5.50),
  (1003, 1, 6,  9.50), (1003, 6, 3, 12.00),
  (1004, 1, 5,  9.50),
  (1005, 3, 30, 2.40), (1005, 4, 200, 0.15),
  (1006, 2, 10, 7.20), (1006, 1, 4,  9.50),
  (1007, 1, 15, 9.50), (1007, 5, 6,  5.50),
  (1008, 2, 12, 7.20), (1008, 3, 25, 2.40),
  (1009, 6, 5, 12.00), (1009, 4, 150, 0.15),
  (1010, 2, 9,  7.20),
  (1011, 1, 10, 9.50), (1011, 2, 6,  7.20),
  (1012, 3, 40, 2.40), (1012, 5, 8,  5.50),
  (1013, 1, 20, 9.50), (1013, 6, 4, 12.00),
  (1014, 2, 14, 7.20), (1014, 4, 120, 0.15),
  (1015, 1, 7,  9.50), (1015, 3, 35, 2.40),
  (1016, 5, 12, 5.50), (1016, 6, 6, 12.00),
  (1017, 2, 16, 7.20), (1017, 1, 9,  9.50),
  (1018, 3, 18, 2.40), (1018, 4, 90, 0.15);
`;

export const RETAIL: ChallengeDataset = {
  initSql: RETAIL_SQL,
  schema: [
    {
      name: "orders",
      rows: "18",
      columns: [
        { name: "order_id", type: "integer", key: "pk" },
        { name: "customer_id", type: "integer", key: "fk" },
        { name: "order_date", type: "text" },
        { name: "status", type: "text" },
      ],
    },
    {
      name: "order_items",
      rows: "35",
      columns: [
        { name: "order_id", type: "integer", key: "fk" },
        { name: "product_id", type: "integer", key: "fk" },
        { name: "quantity", type: "integer" },
        { name: "unit_price", type: "real" },
      ],
    },
    {
      name: "products",
      rows: "7",
      columns: [
        { name: "product_id", type: "integer", key: "pk" },
        { name: "product_name", type: "text" },
        { name: "category", type: "text" },
        { name: "unit_cost", type: "real" },
      ],
    },
    {
      name: "customers",
      rows: "5",
      columns: [
        { name: "customer_id", type: "integer", key: "pk" },
        { name: "full_name", type: "text" },
        { name: "city", type: "text" },
        { name: "signed_up", type: "text" },
      ],
    },
  ],
};

// ─── Employees: a small HR org chart ─────────────────────────────────

const HR_SQL = `
CREATE TABLE departments (
  dept_id   INTEGER PRIMARY KEY,
  dept_name TEXT NOT NULL
);
INSERT INTO departments VALUES
  (1, 'Engineering'), (2, 'Sales'), (3, 'Support'), (4, 'Finance');

CREATE TABLE employees (
  employee_id INTEGER PRIMARY KEY,
  full_name   TEXT    NOT NULL,
  dept_id     INTEGER REFERENCES departments(dept_id),
  manager_id  INTEGER REFERENCES employees(employee_id),
  salary      INTEGER NOT NULL,
  hired_on    TEXT    NOT NULL
);
INSERT INTO employees VALUES
  (1,  'Dana Whitfield', 1, NULL, 185000, '2019-03-04'),
  (2,  'Ravi Shah',      1, 1,    142000, '2020-06-15'),
  (3,  'Kim Alvarez',    1, 1,    138000, '2020-09-01'),
  (4,  'Joel Fontaine',  1, 2,    145000, '2021-02-11'),
  (5,  'Nina Petrova',   1, 2,    119000, '2021-08-23'),
  (6,  'Owen Hart',      2, NULL, 164000, '2019-07-30'),
  (7,  'Sara Lindqvist', 2, 6,    112000, '2021-01-18'),
  (8,  'Marco Bianchi',  2, 6,    108000, '2022-04-04'),
  (9,  'Ivy Chen',       3, 6,     92000, '2022-10-10'),
  (10, 'Peter Osei',     3, 9,     78000, '2023-03-20'),
  (11, 'Lena Fischer',   3, 9,     76000, '2023-05-02'),
  (12, 'Hugo Marsh',     4, NULL, 151000, '2020-01-13'),
  (13, 'Amara Diallo',   4, 12,   104000, '2022-07-25'),
  (14, 'Tariq Aziz',     4, 12,    99000, '2023-09-11');
`;

export const HR: ChallengeDataset = {
  initSql: HR_SQL,
  schema: [
    {
      name: "employees",
      rows: "14",
      columns: [
        { name: "employee_id", type: "integer", key: "pk" },
        { name: "full_name", type: "text" },
        { name: "dept_id", type: "integer", key: "fk" },
        { name: "manager_id", type: "integer", key: "fk" },
        { name: "salary", type: "integer" },
        { name: "hired_on", type: "text" },
      ],
    },
    {
      name: "departments",
      rows: "4",
      columns: [
        { name: "dept_id", type: "integer", key: "pk" },
        { name: "dept_name", type: "text" },
      ],
    },
  ],
};

// ─── Events: a web analytics log ─────────────────────────────────────

const EVENTS_SQL = `
CREATE TABLE events (
  event_id   INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  event_name TEXT    NOT NULL,
  page       TEXT    NOT NULL,
  occurred_at TEXT   NOT NULL
);
INSERT INTO events VALUES
  (1,  1, 'view',   '/pricing', '2024-05-01 09:14:00'),
  (2,  1, 'click',  '/pricing', '2024-05-01 09:15:10'),
  (3,  1, 'signup', '/signup',  '2024-05-01 09:17:42'),
  (4,  2, 'view',   '/',        '2024-05-01 10:02:00'),
  (5,  2, 'view',   '/courses', '2024-05-01 10:03:30'),
  (6,  3, 'view',   '/pricing', '2024-05-01 11:20:00'),
  (7,  3, 'view',   '/',        '2024-05-02 08:05:00'),
  (8,  3, 'click',  '/pricing', '2024-05-02 08:09:00'),
  (9,  4, 'view',   '/courses', '2024-05-02 09:00:00'),
  (10, 4, 'signup', '/signup',  '2024-05-02 09:12:00'),
  (11, 2, 'view',   '/pricing', '2024-05-02 14:40:00'),
  (12, 5, 'view',   '/',        '2024-05-03 07:55:00'),
  (13, 5, 'view',   '/courses', '2024-05-03 07:58:00'),
  (14, 5, 'click',  '/courses', '2024-05-03 08:01:00'),
  (15, 1, 'view',   '/courses', '2024-05-03 18:30:00'),
  (16, 6, 'view',   '/pricing', '2024-05-04 12:00:00'),
  (17, 6, 'click',  '/pricing', '2024-05-04 12:02:00'),
  (18, 6, 'signup', '/signup',  '2024-05-04 12:06:00'),
  (19, 3, 'view',   '/courses', '2024-05-04 16:44:00'),
  (20, 4, 'view',   '/pricing', '2024-05-05 10:10:00');
`;

export const EVENTS: ChallengeDataset = {
  initSql: EVENTS_SQL,
  schema: [
    {
      name: "events",
      rows: "20",
      columns: [
        { name: "event_id", type: "integer", key: "pk" },
        { name: "user_id", type: "integer" },
        { name: "event_name", type: "text" },
        { name: "page", type: "text" },
        { name: "occurred_at", type: "text" },
      ],
    },
  ],
};

// ─── Subscriptions: a small SaaS billing book ────────────────────────
//
// The point of this one is NULL. An open subscription has no `ended_on`
// and an unpaid invoice has no `paid_on`, so "still running" and "still
// owed" are absences rather than flags — which is how billing data
// actually arrives, and what makes `IS NULL`, `COALESCE` and outer joins
// worth drilling.

const SUBSCRIPTIONS_SQL = `
CREATE TABLE plans (
  plan_id       INTEGER PRIMARY KEY,
  plan_name     TEXT    NOT NULL,
  monthly_price REAL    NOT NULL
);
INSERT INTO plans VALUES
  (1, 'Starter',  12.00),
  (2, 'Team',     45.00),
  (3, 'Business', 120.00);

CREATE TABLE accounts (
  account_id INTEGER PRIMARY KEY,
  company    TEXT NOT NULL,
  country    TEXT NOT NULL,
  created_on TEXT NOT NULL
);
INSERT INTO accounts VALUES
  (1,  'Northwind Foods', 'US', '2023-01-15'),
  (2,  'Kestrel Labs',    'US', '2023-02-02'),
  (3,  'Blue Harbor',     'CA', '2023-03-19'),
  (4,  'Umbra Design',    'GB', '2023-04-07'),
  (5,  'Terrafirma',      'DE', '2023-05-23'),
  (6,  'Sable and Co',    'GB', '2023-06-11'),
  (7,  'Pinecrest',       'US', '2023-07-30'),
  (8,  'Lumen Works',     'CA', '2023-08-14'),
  (9,  'Orchard Bay',     'AU', '2023-09-05'),
  (10, 'Vireo Health',    'US', '2023-10-21');

CREATE TABLE subscriptions (
  subscription_id INTEGER PRIMARY KEY,
  account_id      INTEGER NOT NULL REFERENCES accounts(account_id),
  plan_id         INTEGER NOT NULL REFERENCES plans(plan_id),
  started_on      TEXT    NOT NULL,
  ended_on        TEXT
);
INSERT INTO subscriptions VALUES
  (1,  1,  1, '2023-01-20', '2023-07-19'),
  (2,  1,  2, '2023-07-20', NULL),
  (3,  2,  1, '2023-02-05', '2023-02-09'),
  (4,  2,  2, '2023-02-10', NULL),
  (5,  3,  1, '2023-03-25', '2023-09-24'),
  (6,  4,  3, '2023-04-12', NULL),
  (7,  5,  1, '2023-05-25', '2023-05-31'),
  (8,  5,  2, '2023-06-01', '2024-01-31'),
  (9,  6,  1, '2023-06-15', '2023-12-14'),
  (10, 6,  2, '2023-12-15', NULL),
  (11, 7,  1, '2023-08-01', NULL),
  (12, 8,  3, '2023-08-20', NULL),
  (13, 9,  1, '2023-09-10', '2024-02-09'),
  (14, 10, 2, '2023-11-01', NULL);

CREATE TABLE invoices (
  invoice_id INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(account_id),
  issued_on  TEXT    NOT NULL,
  amount     REAL    NOT NULL,
  paid_on    TEXT
);
INSERT INTO invoices VALUES
  (1,  1,  '2024-01-01',  45.00, '2024-01-05'),
  (2,  1,  '2024-02-01',  45.00, '2024-02-03'),
  (3,  1,  '2024-03-01',  45.00, NULL),
  (4,  2,  '2024-01-01',  45.00, '2024-01-02'),
  (5,  2,  '2024-02-01',  45.00, '2024-02-02'),
  (6,  2,  '2024-03-01',  45.00, '2024-03-04'),
  (7,  4,  '2024-01-01', 120.00, '2024-01-15'),
  (8,  4,  '2024-02-01', 120.00, '2024-02-20'),
  (9,  4,  '2024-03-01', 120.00, NULL),
  (10, 5,  '2024-01-01',  45.00, '2024-01-09'),
  (11, 6,  '2024-01-01',  45.00, '2024-01-06'),
  (12, 6,  '2024-02-01',  45.00, '2024-02-08'),
  (13, 6,  '2024-03-01',  45.00, '2024-03-11'),
  (14, 7,  '2024-01-01',  12.00, '2024-01-03'),
  (15, 7,  '2024-02-01',  12.00, NULL),
  (16, 8,  '2024-01-01', 120.00, '2024-01-04'),
  (17, 8,  '2024-02-01', 120.00, '2024-02-05'),
  (18, 9,  '2024-01-01',  12.00, '2024-01-20'),
  (19, 10, '2024-01-01',  45.00, '2024-01-07'),
  (20, 10, '2024-02-01',  45.00, '2024-02-09');
`;

export const SUBSCRIPTIONS: ChallengeDataset = {
  initSql: SUBSCRIPTIONS_SQL,
  schema: [
    {
      name: "accounts",
      rows: "10",
      columns: [
        { name: "account_id", type: "integer", key: "pk" },
        { name: "company", type: "text" },
        { name: "country", type: "text" },
        { name: "created_on", type: "text" },
      ],
    },
    {
      name: "subscriptions",
      rows: "14",
      columns: [
        { name: "subscription_id", type: "integer", key: "pk" },
        { name: "account_id", type: "integer", key: "fk" },
        { name: "plan_id", type: "integer", key: "fk" },
        { name: "started_on", type: "text" },
        { name: "ended_on", type: "text" },
      ],
    },
    {
      name: "invoices",
      rows: "20",
      columns: [
        { name: "invoice_id", type: "integer", key: "pk" },
        { name: "account_id", type: "integer", key: "fk" },
        { name: "issued_on", type: "text" },
        { name: "amount", type: "real" },
        { name: "paid_on", type: "text" },
      ],
    },
    {
      name: "plans",
      rows: "3",
      columns: [
        { name: "plan_id", type: "integer", key: "pk" },
        { name: "plan_name", type: "text" },
        { name: "monthly_price", type: "real" },
      ],
    },
  ],
};

// ─── Library: books, authors and loans ───────────────────────────────
//
// This one exists for the join shapes the other datasets cannot show: a
// book has many authors and an author has many books, so every question
// about either has to go through `book_authors`. One author has written
// nothing and one book has never been borrowed, which is what gives the
// anti-join and set-difference challenges something to find.

const LIBRARY_SQL = `
CREATE TABLE authors (
  author_id   INTEGER PRIMARY KEY,
  author_name TEXT NOT NULL,
  country     TEXT NOT NULL
);
INSERT INTO authors VALUES
  (1, 'Ada Okonjo',      'NG'),
  (2, 'Marcus Lindt',    'SE'),
  (3, 'Yuki Tanabe',     'JP'),
  (4, 'Rosa Delgado',    'MX'),
  (5, 'Ivan Petrov',     'RU'),
  (6, 'Claire Beaumont', 'FR'),
  (7, 'Samuel Reyes',    'PH'),
  (8, 'Nadia Haddad',    'LB');

CREATE TABLE books (
  book_id        INTEGER PRIMARY KEY,
  title          TEXT    NOT NULL,
  published_year INTEGER NOT NULL,
  genre          TEXT    NOT NULL
);
INSERT INTO books VALUES
  (1,  'The Salt Road',               2015, 'Fiction'),
  (2,  'Quiet Machines',              2018, 'Science'),
  (3,  'Northern Lights Field Guide', 2012, 'Nature'),
  (4,  'Winter Harbour',              2019, 'Fiction'),
  (5,  'Small Data',                  2021, 'Science'),
  (6,  'The Paper Garden',            2016, 'Fiction'),
  (7,  'Atlas of Rivers',             2014, 'Nature'),
  (8,  'Signal and Silence',          2020, 'Science'),
  (9,  'Rooms We Left',               2022, 'Fiction'),
  (10, 'Field Notes on Bees',         2017, 'Nature'),
  (11, 'The Long Commute',            2023, 'Fiction'),
  (12, 'Deep Time',                   2013, 'Science');

CREATE TABLE book_authors (
  book_id   INTEGER NOT NULL REFERENCES books(book_id),
  author_id INTEGER NOT NULL REFERENCES authors(author_id)
);
INSERT INTO book_authors VALUES
  (1, 1), (2, 2), (3, 3), (4, 1), (5, 2), (5, 4), (6, 6), (7, 3),
  (7, 5), (8, 2), (9, 6), (10, 3), (11, 7), (12, 5), (12, 2);

CREATE TABLE members (
  member_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  joined_on TEXT NOT NULL
);
INSERT INTO members VALUES
  (1, 'Hana Brennan',    '2023-01-10'),
  (2, 'Omar Sayed',      '2023-02-14'),
  (3, 'Freya Lund',      '2023-03-02'),
  (4, 'Diego Alvarez',   '2023-04-18'),
  (5, 'Mei Zhang',       '2023-05-06'),
  (6, 'Paul Achebe',     '2023-06-21'),
  (7, 'Ingrid Sorensen', '2023-07-09'),
  (8, 'Leo Fontaine',    '2023-08-27');

CREATE TABLE loans (
  loan_id     INTEGER PRIMARY KEY,
  book_id     INTEGER NOT NULL REFERENCES books(book_id),
  member_id   INTEGER NOT NULL REFERENCES members(member_id),
  borrowed_on TEXT    NOT NULL,
  returned_on TEXT
);
INSERT INTO loans VALUES
  (1,  1,  1, '2024-01-03', '2024-01-15'),
  (2,  2,  2, '2024-01-05', '2024-01-30'),
  (3,  3,  3, '2024-01-08', '2024-01-20'),
  (4,  4,  1, '2024-01-12', '2024-01-19'),
  (5,  5,  4, '2024-01-15', NULL),
  (6,  6,  5, '2024-01-18', '2024-02-10'),
  (7,  7,  2, '2024-01-20', '2024-01-28'),
  (8,  1,  6, '2024-01-22', '2024-02-02'),
  (9,  8,  7, '2024-01-25', NULL),
  (10, 9,  3, '2024-01-28', '2024-02-05'),
  (11, 10, 8, '2024-02-01', '2024-02-14'),
  (12, 2,  4, '2024-02-03', '2024-02-11'),
  (13, 12, 5, '2024-02-06', '2024-03-08'),
  (14, 3,  1, '2024-02-09', '2024-02-18'),
  (15, 5,  6, '2024-02-12', '2024-02-25'),
  (16, 4,  7, '2024-02-15', '2024-02-21'),
  (17, 6,  2, '2024-02-18', NULL),
  (18, 7,  8, '2024-02-20', '2024-03-01'),
  (19, 1,  3, '2024-02-23', '2024-03-02'),
  (20, 9,  4, '2024-02-26', '2024-03-05'),
  (21, 8,  5, '2024-03-01', '2024-03-09'),
  (22, 10, 1, '2024-03-04', '2024-03-15'),
  (23, 12, 6, '2024-03-07', NULL),
  (24, 2,  7, '2024-03-10', '2024-03-18'),
  (25, 3,  8, '2024-03-13', '2024-03-21');
`;

export const LIBRARY: ChallengeDataset = {
  initSql: LIBRARY_SQL,
  schema: [
    {
      name: "loans",
      rows: "25",
      columns: [
        { name: "loan_id", type: "integer", key: "pk" },
        { name: "book_id", type: "integer", key: "fk" },
        { name: "member_id", type: "integer", key: "fk" },
        { name: "borrowed_on", type: "text" },
        { name: "returned_on", type: "text" },
      ],
    },
    {
      name: "books",
      rows: "12",
      columns: [
        { name: "book_id", type: "integer", key: "pk" },
        { name: "title", type: "text" },
        { name: "published_year", type: "integer" },
        { name: "genre", type: "text" },
      ],
    },
    {
      name: "book_authors",
      rows: "15",
      columns: [
        { name: "book_id", type: "integer", key: "fk" },
        { name: "author_id", type: "integer", key: "fk" },
      ],
    },
    {
      name: "authors",
      rows: "8",
      columns: [
        { name: "author_id", type: "integer", key: "pk" },
        { name: "author_name", type: "text" },
        { name: "country", type: "text" },
      ],
    },
    {
      name: "members",
      rows: "8",
      columns: [
        { name: "member_id", type: "integer", key: "pk" },
        { name: "full_name", type: "text" },
        { name: "joined_on", type: "text" },
      ],
    },
  ],
};

/** Every dataset, for the offline verifier to sweep. */
export const DATASETS = { RETAIL, HR, EVENTS, SUBSCRIPTIONS, LIBRARY } as const;
