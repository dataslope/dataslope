"use client";

import type { QueryTabSeed } from "./sqliteSamples";

export interface DuckDbSampleDatabase {
  id: string;
  label: string;
  filename: string;
  description: string;
  sql: string;
  defaultTabs: QueryTabSeed[];
}

const ECOMMERCE_SQL = `
CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  name VARCHAR,
  email VARCHAR UNIQUE,
  city VARCHAR,
  signup_date DATE
);
CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  name VARCHAR,
  category VARCHAR,
  price DECIMAL(10,2)
);
CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(customer_id),
  order_date DATE,
  status VARCHAR
);
CREATE TABLE order_items (
  order_item_id INTEGER PRIMARY KEY,
  order_id INTEGER REFERENCES orders(order_id),
  product_id INTEGER REFERENCES products(product_id),
  quantity INTEGER,
  unit_price DECIMAL(10,2),
  line_total DECIMAL(10,2)
);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

INSERT INTO customers VALUES
  (1, 'Hazel Robinson', 'hazel@example.com', 'La Verne', '2022-01-12'),
  (2, 'Sasha Sadr', 'sasha@example.com', 'New York', '2022-03-04'),
  (3, 'Priya Sharma', 'priya@example.com', 'Seattle', '2023-02-18'),
  (4, 'Liam Chen', 'liam@example.com', 'Boston', '2023-06-29');
INSERT INTO products VALUES
  (1, 'Laptop Stand', 'Office', 39.99),
  (2, 'Mechanical Keyboard', 'Office', 129.50),
  (3, 'Coffee Beans', 'Grocery', 16.25),
  (4, 'Trail Backpack', 'Outdoors', 84.00);
INSERT INTO orders VALUES
  (1, 1, '2024-01-05', 'shipped'),
  (2, 2, '2024-01-09', 'paid'),
  (3, 1, '2024-02-11', 'paid'),
  (4, 3, '2024-03-03', 'refunded');
INSERT INTO order_items VALUES
  (1, 1, 1, 2, 39.99, 79.98),
  (2, 1, 3, 1, 16.25, 16.25),
  (3, 2, 2, 1, 129.50, 129.50),
  (4, 3, 4, 1, 84.00, 84.00),
  (5, 4, 3, 4, 16.25, 65.00);
`;

export const DUCKDB_BLANK_DATABASE: DuckDbSampleDatabase = {
  id: "blank",
  label: "Blank database",
  filename: "blank.duckdb",
  description: "Start with an empty in-memory DuckDB database.",
  sql: "",
  defaultTabs: [
    { title: "Query 1", code: "-- DuckDB runs entirely in your browser.\nSELECT version() AS duckdb_version;" },
  ],
};

export const DUCKDB_SAMPLE_DATABASES: DuckDbSampleDatabase[] = [
  {
    id: "ecommerce",
    label: "E-Commerce",
    filename: "ecommerce.duckdb",
    description: "A small orders/products/customers database adapted for DuckDB types.",
    sql: ECOMMERCE_SQL,
    defaultTabs: [
      {
        title: "Revenue by category",
        code: `SELECT p.category, SUM(oi.line_total) AS revenue\nFROM order_items oi\nJOIN products p USING (product_id)\nGROUP BY p.category\nORDER BY revenue DESC;`,
      },
      {
        title: "Nested data",
        code: `SELECT customer_id, name, {'city': city, 'email': email} AS profile\nFROM customers\nORDER BY customer_id;`,
      },
    ],
  },
  {
    id: "duckdb-settings",
    label: "DuckDB Settings",
    filename: "duckdb-settings.duckdb",
    description: "Explore DuckDB's runtime settings and catalog functions.",
    sql: "",
    defaultTabs: [
      { title: "Settings", code: "SELECT name, value, description FROM duckdb_settings() ORDER BY name;" },
      { title: "Catalog", code: "SELECT table_name, estimated_size, column_count FROM duckdb_tables() ORDER BY table_name;" },
    ],
  },
  DUCKDB_BLANK_DATABASE,
];

export function findDuckDbSampleDatabase(id: string): DuckDbSampleDatabase {
  return DUCKDB_SAMPLE_DATABASES.find((db) => db.id === id) ?? DUCKDB_SAMPLE_DATABASES[0];
}
