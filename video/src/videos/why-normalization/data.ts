// Every table, statement and message the video shows. Each figure was run in
// PGlite (Postgres 17 in WASM) from a fresh database built by its SETUP, and
// every table here is exactly what that run returned, column order included.
// Pure (no Remotion, no DOM), so the check script can import it and compare.
//
// The data is the lesson's shop (content/courses/database-design-postgresql/
// why-normalization.mdx): orders 1 and 2 are Ada's, order 3 is Grace's, and the
// rushed update changes order 1 only. The price column is left out, so the
// fix needs two tables rather than the lesson's three. The customer columns
// sit at the right of the flat table, so the split peels them off that side.

export const VIDEO = "why-normalization";

/**
 * Whether public/images/why-normalization/ holds the two watercolors from
 * illustrations.json. Every frame is laid out with room for them either way;
 * set this to true once `npm run illustrations -- why-normalization` has
 * written both WebPs.
 */
export const ILLUSTRATIONS = false;

/** A value as Postgres returned it; null is SQL NULL. */
export type Cell = string | null;

// The flat table: Figs. 1 to 4, each from a fresh copy of these three rows.

export const FLAT_SETUP = `
CREATE TABLE orders_flat (
  order_id       INTEGER PRIMARY KEY,
  product_name   TEXT NOT NULL,
  customer_name  TEXT NOT NULL,
  customer_email TEXT NOT NULL
);
INSERT INTO orders_flat VALUES
  (1, 'Notebook', 'Ada',   'ada@old.test'),
  (2, 'Pencil',   'Ada',   'ada@old.test'),
  (3, 'Notebook', 'Grace', 'grace@test.test');
`;

export const FLAT_COLS = ["order_id", "product_name", "customer_name", "customer_email"] as const;
/** `SELECT * FROM orders_flat ORDER BY order_id` */
export const FLAT_SELECT = "SELECT * FROM orders_flat ORDER BY order_id";
export const FLAT_ROWS: readonly (readonly Cell[])[] = [
  ["1", "Notebook", "Ada", "ada@old.test"],
  ["2", "Pencil", "Ada", "ada@old.test"],
  ["3", "Notebook", "Grace", "grace@test.test"],
];
/** Column indexes, so the scenes name what they point at. */
export const F = { id: 0, product: 1, name: 2, email: 3 } as const;

// Fig. 2: the update anomaly.
export const UPDATE_SQL = ["UPDATE orders_flat", "SET customer_email = 'ada@new.test'", "WHERE order_id = 1;"] as const;
/** The command tag Postgres answers with. */
export const UPDATE_TAG = "UPDATE 1";
export const UPDATED_EMAIL = "ada@new.test";
export const FLAT_AFTER_UPDATE: readonly (readonly Cell[])[] = [
  ["1", "Notebook", "Ada", "ada@new.test"],
  ["2", "Pencil", "Ada", "ada@old.test"],
  ["3", "Notebook", "Grace", "grace@test.test"],
];

// Fig. 3: the insertion anomaly.
export const INSERT_SQL = [
  "INSERT INTO orders_flat",
  "  (customer_name, customer_email)",
  "VALUES ('Alan', 'alan@test.test');",
] as const;
export const INSERT_ERROR = {
  message: 'null value in column "order_id" of relation "orders_flat" violates not-null constraint',
  detail: "Failing row contains (null, null, Alan, alan@test.test).",
} as const;
/** The failing row, as the DETAIL line spells it out. */
export const INSERT_FAILING_ROW: readonly Cell[] = [null, null, "Alan", "alan@test.test"];

// Fig. 4: the deletion anomaly.
export const DELETE_SQL = ["DELETE FROM orders_flat", "WHERE order_id = 3;"] as const;
export const LOOKUP_SQL = ["SELECT customer_email", "FROM orders_flat", "WHERE customer_name = 'Grace';"] as const;
export const LOOKUP_COLS = ["customer_email"] as const;
export const LOOKUP_ROWS: readonly (readonly Cell[])[] = [];
export const FLAT_AFTER_DELETE: readonly (readonly Cell[])[] = FLAT_ROWS.slice(0, 2);

// Figs. 5 and 6: the same facts, one home each.

export const SPLIT_SETUP = `
CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL
);
CREATE TABLE orders (
  order_id     INTEGER PRIMARY KEY,
  product_name TEXT NOT NULL,
  customer_id  INTEGER NOT NULL REFERENCES customers
);
INSERT INTO customers VALUES
  (1, 'Ada',   'ada@old.test'),
  (2, 'Grace', 'grace@test.test');
INSERT INTO orders VALUES
  (1, 'Notebook', 1),
  (2, 'Pencil',   1),
  (3, 'Notebook', 2);
`;

export const CUSTOMER_COLS = ["customer_id", "name", "email"] as const;
export const CUSTOMERS_SELECT = "SELECT * FROM customers ORDER BY customer_id";
export const CUSTOMERS: readonly (readonly Cell[])[] = [
  ["1", "Ada", "ada@old.test"],
  ["2", "Grace", "grace@test.test"],
];
export const C = { id: 0, name: 1, email: 2 } as const;

export const ORDER_COLS = ["order_id", "product_name", "customer_id"] as const;
export const ORDERS_SELECT = "SELECT * FROM orders ORDER BY order_id";
export const ORDERS: readonly (readonly Cell[])[] = [
  ["1", "Notebook", "1"],
  ["2", "Pencil", "1"],
  ["3", "Notebook", "2"],
];
export const O = { id: 0, product: 1, customer: 2 } as const;
/** Which customers row each orders row points at. */
export const POINTS_AT = ORDERS.map((o) => CUSTOMERS.findIndex((c) => c[C.id] === o[O.customer]));

/** The three changes again, one statement each, run in this order. */
export const FIX_SQL = [
  "UPDATE customers SET email = 'ada@new.test' WHERE customer_id = 1;",
  "INSERT INTO customers VALUES (3, 'Alan', 'alan@test.test');",
  "DELETE FROM orders WHERE order_id = 3;",
] as const;
/** Rows each statement changed, as Postgres reports them. */
export const FIX_ROWS_CHANGED = [1, 1, 1] as const;
export const CUSTOMERS_AFTER: readonly (readonly Cell[])[] = [
  ["1", "Ada", "ada@new.test"],
  ["2", "Grace", "grace@test.test"],
  ["3", "Alan", "alan@test.test"],
];
export const ORDERS_AFTER: readonly (readonly Cell[])[] = ORDERS.slice(0, 2);

// Fig. 6: a join rebuilds the wide view, after the three changes.
export const JOIN_SQL = [
  "SELECT order_id, product_name, name, email",
  "FROM orders",
  "JOIN customers USING (customer_id)",
  "ORDER BY order_id;",
] as const;
export const JOIN_COLS = ["order_id", "product_name", "name", "email"] as const;
export const JOIN_ROWS: readonly (readonly Cell[])[] = [
  ["1", "Notebook", "Ada", "ada@new.test"],
  ["2", "Pencil", "Ada", "ada@new.test"],
];
export const J = { id: 0, product: 1, name: 2, email: 3 } as const;
