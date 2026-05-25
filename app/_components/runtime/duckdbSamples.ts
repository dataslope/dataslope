"use client";

import {
  findSqlSampleById,
  type QueryTabSeed,
  type SqlSampleDatabaseBase,
} from "./sqlSamples";

export interface DuckDbSampleDatabase extends SqlSampleDatabaseBase {
  sql: string;
  defaultTabs: QueryTabSeed[];
}

// ─── E-Commerce sample ───────────────────────────────────────────────
// A compact orders/products/customers schema that exercises DuckDB's
// integer-family types, DECIMAL, and DATE. Note: DuckDB-Wasm does not
// currently support STORED generated columns via DDL, so line_total is
// stored as a plain DECIMAL populated at INSERT time.
// Mirrors the structure of the SQLite "credit card transactions" sample
// so users switching playgrounds see familiar shapes.

const ECOMMERCE_SQL = `
CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR,
  country VARCHAR,
  signup_date DATE
);
CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  name VARCHAR NOT NULL,
  category VARCHAR,
  unit_price DECIMAL(10,2),
  in_stock INTEGER DEFAULT 0
);
CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(customer_id),
  order_date DATE,
  status VARCHAR
);
CREATE TABLE order_items (
  order_id INTEGER REFERENCES orders(order_id),
  product_id INTEGER REFERENCES products(product_id),
  quantity INTEGER,
  unit_price DECIMAL(10,2),
  line_total DECIMAL(12,2),
  PRIMARY KEY (order_id, product_id)
);

INSERT INTO customers VALUES
  (1,'Hazel Robinson','hazel@example.com','US','2023-04-12'),
  (2,'Sasha Sadr','sasha@example.com','US','2023-05-03'),
  (3,'Saanvi Lee','saanvi@example.com','US','2023-06-21'),
  (4,'Everlee Clark','everlee@example.com','US','2023-07-08'),
  (5,'Kyle Peterson','kyle@example.com','US','2023-08-15'),
  (6,'Aldo Walker','aldo@example.com','US','2023-09-02'),
  (7,'Mia Torres','mia@example.com','US','2023-10-19'),
  (8,'James Okafor','james@example.com','GB','2023-11-30'),
  (9,'Priya Sharma','priya@example.com','IN','2024-01-04'),
  (10,'Liam Chen','liam@example.com','SG','2024-02-22');
INSERT INTO products VALUES
  (1,'Wireless mouse','Electronics',29.99,150),
  (2,'Mechanical keyboard','Electronics',129.00,42),
  (3,'USB-C cable','Accessories',9.50,800),
  (4,'Notebook','Stationery',4.25,1200),
  (5,'Coffee beans 1kg','Grocery',24.00,60),
  (6,'Travel mug','Kitchen',18.75,210),
  (7,'Desk lamp','Lighting',45.00,90),
  (8,'Backpack','Bags',79.00,55),
  (9,'Wireless headphones','Electronics',199.00,30),
  (10,'Standing desk mat','Office',38.50,75);
INSERT INTO orders VALUES
  (1001,1,'2024-01-05','shipped'),
  (1002,2,'2024-01-09','shipped'),
  (1003,3,'2024-01-12','cancelled'),
  (1004,4,'2024-02-01','shipped'),
  (1005,5,'2024-02-14','pending'),
  (1006,6,'2024-02-18','shipped'),
  (1007,7,'2024-03-02','shipped'),
  (1008,8,'2024-03-17','shipped'),
  (1009,9,'2024-04-04','pending'),
  (1010,10,'2024-04-21','shipped');
INSERT INTO order_items VALUES
  (1001,1,2,29.99,59.98),
  (1001,3,4,9.50,38.00),
  (1002,2,1,129.00,129.00),
  (1002,4,3,4.25,12.75),
  (1003,5,2,24.00,48.00),
  (1004,6,2,18.75,37.50),
  (1004,4,5,4.25,21.25),
  (1005,7,1,45.00,45.00),
  (1006,8,1,79.00,79.00),
  (1006,3,3,9.50,28.50),
  (1007,9,1,199.00,199.00),
  (1008,10,1,38.50,38.50),
  (1008,1,1,29.99,29.99),
  (1009,2,1,129.00,129.00),
  (1010,5,2,24.00,48.00),
  (1010,6,1,18.75,18.75);

CREATE VIEW order_totals AS
  SELECT o.order_id,
         o.order_date,
         c.name AS customer,
         ROUND(SUM(oi.line_total), 2) AS total
  FROM orders o
  JOIN customers c ON c.customer_id = o.customer_id
  JOIN order_items oi ON oi.order_id = o.order_id
  GROUP BY o.order_id, o.order_date, c.name;
`;

const ECOMMERCE_TABS: QueryTabSeed[] = [
  {
    title: "Top customers",
    code: `-- Top customers by lifetime spend\nSELECT c.name,\n       COUNT(DISTINCT o.order_id) AS orders,\n       ROUND(SUM(oi.line_total), 2) AS lifetime_spend\nFROM customers c\nJOIN orders o ON o.customer_id = c.customer_id\nJOIN order_items oi ON oi.order_id = o.order_id\nGROUP BY c.name\nORDER BY lifetime_spend DESC;`,
  },
  {
    title: "Sales by category",
    code: `-- Revenue by product category\nSELECT p.category,\n       SUM(oi.quantity) AS units,\n       ROUND(SUM(oi.line_total), 2) AS revenue\nFROM order_items oi\nJOIN products p ON p.product_id = oi.product_id\nGROUP BY p.category\nORDER BY revenue DESC;`,
  },
  {
    title: "Order totals view",
    code: `SELECT * FROM order_totals\nORDER BY total DESC\nLIMIT 10;`,
  },
];

// ─── Analytics sample showcasing DuckDB-specific features ───────────
// PIVOT, list aggregations, and the UNNEST / STRUCT type system are
// what set DuckDB apart from SQLite/Postgres in the browser. The
// "Analytics" sample seeds a small events table and pre-loads a few
// queries that show off these features.

const ANALYTICS_SQL = `
CREATE TABLE events (
  event_id BIGINT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  event_name VARCHAR NOT NULL,
  event_time TIMESTAMP,
  properties STRUCT(country VARCHAR, device VARCHAR, value DOUBLE)
);

INSERT INTO events VALUES
  (1, 101, 'page_view',  TIMESTAMP '2024-05-01 09:15:00', {'country': 'US', 'device': 'desktop', 'value': 0}),
  (2, 102, 'sign_up',    TIMESTAMP '2024-05-01 09:18:23', {'country': 'CA', 'device': 'mobile',  'value': 0}),
  (3, 101, 'add_to_cart',TIMESTAMP '2024-05-01 09:22:41', {'country': 'US', 'device': 'desktop', 'value': 49.99}),
  (4, 103, 'page_view',  TIMESTAMP '2024-05-01 10:00:00', {'country': 'GB', 'device': 'mobile',  'value': 0}),
  (5, 101, 'purchase',   TIMESTAMP '2024-05-01 10:03:11', {'country': 'US', 'device': 'desktop', 'value': 49.99}),
  (6, 104, 'page_view',  TIMESTAMP '2024-05-01 10:14:55', {'country': 'DE', 'device': 'tablet',  'value': 0}),
  (7, 102, 'page_view',  TIMESTAMP '2024-05-01 10:30:00', {'country': 'CA', 'device': 'mobile',  'value': 0}),
  (8, 102, 'purchase',   TIMESTAMP '2024-05-01 10:42:03', {'country': 'CA', 'device': 'mobile',  'value': 19.50}),
  (9, 103, 'add_to_cart',TIMESTAMP '2024-05-01 11:01:18', {'country': 'GB', 'device': 'mobile',  'value': 12.00}),
  (10,105, 'sign_up',    TIMESTAMP '2024-05-01 11:15:42', {'country': 'AU', 'device': 'desktop', 'value': 0});
`;

const ANALYTICS_TABS: QueryTabSeed[] = [
  {
    title: "Events per country",
    code: `-- Group by a STRUCT field — DuckDB lets you reach into\n-- nested values with dot syntax, no UNNEST required.\nSELECT properties.country AS country,\n       COUNT(*) AS events,\n       SUM(properties.value) AS total_value\nFROM events\nGROUP BY country\nORDER BY events DESC;`,
  },
  {
    title: "PIVOT example",
    code: `-- DuckDB's PIVOT clause turns row data into columns in a\n-- single statement. Pivot purchases by device category.\nPIVOT events\n  ON properties.device\n  USING COUNT(*)\n  GROUP BY event_name\n  ORDER BY event_name;`,
  },
  {
    title: "List aggregation",
    code: `-- Aggregate event names per user into a LIST, then UNNEST\n-- it back so every step is visible.\nWITH user_paths AS (\n  SELECT user_id,\n         LIST(event_name ORDER BY event_time) AS path\n  FROM events\n  GROUP BY user_id\n)\nSELECT user_id, path, len(path) AS step_count\nFROM user_paths\nORDER BY user_id;`,
  },
];

// ─── Parquet demo sample ─────────────────────────────────────────────
// Showcases DuckDB's killer browser feature: querying registered files
// (Parquet/CSV/JSON) directly without an explicit CREATE TABLE step.
// The sample seeds a tiny in-memory CSV via duckdb's `read_csv_auto`.

const PARQUET_DEMO_SQL = `
-- Use DuckDB's "values" syntax to materialize an inline dataset.
-- In a real workflow you'd do:
--     SELECT * FROM read_parquet('uploaded.parquet');
--     SELECT * FROM read_csv_auto('uploaded.csv');
--     SELECT * FROM read_json_auto('uploaded.json');
-- after dragging a file into the playground.
CREATE TABLE measurements AS
SELECT * FROM (VALUES
  ('weather-station-1', DATE '2024-06-01', 21.4, 0.0),
  ('weather-station-1', DATE '2024-06-02', 22.1, 1.2),
  ('weather-station-1', DATE '2024-06-03', 19.8, 5.4),
  ('weather-station-2', DATE '2024-06-01', 18.6, 2.3),
  ('weather-station-2', DATE '2024-06-02', 17.9, 0.0),
  ('weather-station-2', DATE '2024-06-03', 16.4, 8.1),
  ('weather-station-3', DATE '2024-06-01', 24.0, 0.0),
  ('weather-station-3', DATE '2024-06-02', 25.2, 0.0),
  ('weather-station-3', DATE '2024-06-03', 23.7, 0.5)
) AS t(station, day, temp_c, rain_mm);
`;

const PARQUET_DEMO_TABS: QueryTabSeed[] = [
  {
    title: "Remote CSV URL",
    code: `-- Remote HTTP(S) files are fetched through Dataslope's CORS proxy.\n-- You can query them directly with DuckDB's httpfs-backed readers:\nSELECT species,\n       COUNT(*) AS rows,\n       ROUND(AVG(sepal_length), 2) AS avg_sepal_length\nFROM read_csv_auto('https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv')\nGROUP BY species\nORDER BY species;`,
  },
  {
    title: "Read your own files",
    code: `-- Drag a Parquet, CSV, or JSON file onto the playground (Import\n-- → Parquet/CSV/JSON) and DuckDB will register it in the virtual\n-- filesystem. You can then query it directly with read_parquet,\n-- read_csv_auto, or read_json_auto without creating a table:\n--\n--   SELECT * FROM read_parquet('your_file.parquet');\n--   SELECT * FROM read_csv_auto('your_file.csv');\n--   SELECT * FROM read_json_auto('your_file.json');\n--\n-- For now, here is the inline measurements sample:\nSELECT station,\n       AVG(temp_c) AS avg_temp,\n       SUM(rain_mm) AS total_rain\nFROM measurements\nGROUP BY station\nORDER BY station;`,
  },
  {
    title: "EXPLAIN this query",
    code: `-- DuckDB's optimizer surfaces a readable plan. Try EXPLAIN\n-- (or EXPLAIN ANALYZE on real workloads).\nEXPLAIN\nSELECT station, AVG(temp_c)\nFROM measurements\nGROUP BY station;`,
  },
];

export const DUCKDB_SAMPLE_DATABASES: DuckDbSampleDatabase[] = [
  {
    id: "ecommerce",
    label: "E-Commerce",
    filename: "ecommerce.duckdb",
    description: "Customers, products, orders, and a STORED generated column.",
    sql: ECOMMERCE_SQL,
    defaultTabs: ECOMMERCE_TABS,
  },
  {
    id: "analytics",
    label: "Analytics events",
    filename: "analytics.duckdb",
    description:
      "Tiny events table that exercises DuckDB STRUCT, PIVOT, and LIST.",
    sql: ANALYTICS_SQL,
    defaultTabs: ANALYTICS_TABS,
  },
  {
    id: "parquet_demo",
    label: "Parquet / CSV demo",
    filename: "parquet_demo.duckdb",
    description:
      "Inline measurements with examples of read_parquet / read_csv_auto.",
    sql: PARQUET_DEMO_SQL,
    defaultTabs: PARQUET_DEMO_TABS,
  },
];

export const DUCKDB_BLANK_DATABASE: DuckDbSampleDatabase = {
  id: "blank",
  label: "New Database",
  filename: "untitled.duckdb",
  description: "Empty DuckDB database — start from scratch.",
  sql: "",
  defaultTabs: [{ title: "Query 1", code: "" }],
};

export function findDuckDbSampleDatabase(id: string): DuckDbSampleDatabase {
  return findSqlSampleById(id, DUCKDB_SAMPLE_DATABASES, DUCKDB_BLANK_DATABASE);
}
