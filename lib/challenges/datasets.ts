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

/** Every dataset, for the offline verifier to sweep. */
export const DATASETS = { RETAIL, HR, EVENTS } as const;
