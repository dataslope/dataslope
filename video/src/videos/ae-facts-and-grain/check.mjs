// Runs every statement the ae-facts-and-grain video shows on the site's
// Postgres engine (PGlite, PostgreSQL 18), the engine the Analytics Engineer
// dimensional-modeling page's blocks run in the reader's browser
// (<SqlCodeBlock dialect="postgres">), and writes what came back to
// results.json, which data.ts reads. From the repo root:
//
//   node video/src/videos/ae-facts-and-grain/check.mjs
//
// Each figure runs in a fresh database built by its own setup, as the page
// gives every block its own engine (video/scripts/lib/pg-figure.mjs); its
// steps run in order in that database, so a step sees what the steps before
// it changed. Values are printed the way psql prints them: a numeric at its
// scale, a DATE as "2024-01-01", a NULL as null, and a statement that
// returns no rows as its "rows affected".
//
// The page's own blocks (content/interview/analytics-engineer/
// dimensional-modeling.mdx) run as the page gives them:
//   - "star": the star-schema block under "Star vs snowflake?" (Question 1);
//   - "challenge": the "Revenue by category" challenge, its initSql and its
//     solutionSql (Questions 3 and 19);
//   - "keys": the SCD Type 2 block under "What is SCD Type 2" (Question 4's
//     customer 42, and the page's md5 surrogate query on it);
//   - "role": the role-playing block (Question 8);
//   - "bridge": the bridge-table block (Question 9);
//   - "factless": the page's factless-fact query, run as written on the
//     video's own coverage rows (the page gives the query and no table).
// Reused, so the two series show the same rows (the same statements re-run
// here, then compared with the Data Engineer video's results.json, and the
// run stops if they disagree):
//   - "lines": de-dimensional-modeling's order 1001, a 5.00 shipping fee on
//     each of three lines (Question 2, the same question there);
//   - "account", "visits": de-dimensional-modeling's month-end balances and
//     two days of visits (Question 6, the same question there; Questions 10
//     and 11 read the same balances and loan application).
// Everything else is the video's own small table, marked so below and in
// script.ts.
/* global console, URL */
import { readFileSync, writeFileSync } from "node:fs";

import { figure } from "../../../scripts/lib/pg-figure.mjs";

const results = { figures: {} };
const F = results.figures;

// ── The page's own blocks ───────────────────────────────────────────────────

// Question 1. The star-schema block, its initSql verbatim.
const PAGE_STAR = `CREATE TABLE dim_date AS SELECT * FROM (VALUES
  (1, DATE '2024-01-15'), (2, DATE '2024-01-16'), (3, DATE '2024-01-17'),
  (4, DATE '2024-01-18'), (5, DATE '2024-01-19'), (6, DATE '2024-01-20')
) AS t(date_sk, full_date);

CREATE TABLE dim_product AS SELECT * FROM (VALUES
  (10, 'Electronics'), (11, 'Books'), (12, 'Home'),
  (13, 'Garden'), (14, 'Toys'), (15, 'Sports')
) AS t(product_sk, category);

CREATE TABLE fact_orders AS SELECT * FROM (VALUES
  (1001, 1, 10, 299.99), (1002, 1, 11, 19.99), (1003, 2, 10, 499.00),
  (1004, 3, 12, 89.50),  (1005, 2, 11, 14.99), (1006, 1, 13, 65.00),
  (1007, 2, 14, 35.00),  (1008, 3, 15, 120.00), (1009, 4, 10, 189.99),
  (1010, 4, 11, 27.50),  (1011, 4, 12, 210.00), (1012, 5, 13, 92.50),
  (1013, 5, 14, 62.25),  (1014, 5, 15, 145.00), (1015, 6, 10, 550.00),
  (1016, 6, 11, 39.75),  (1017, 6, 12, 165.30), (1018, 1, 14, 48.00),
  (1019, 2, 13, 73.60),  (1020, 3, 10, 315.75), (1021, 4, 15, 88.40),
  (1022, 5, 11, 18.25),  (1023, 6, 13, 145.00), (1024, 3, 14, 54.90)
) AS t(order_id, order_date_sk, product_sk, amount);`;
/** The page's star read, without its comment line. */
const STAR_READ = `SELECT
    d.full_date,
    p.category,
    SUM(f.amount) AS revenue
FROM fact_orders f
JOIN dim_date    d ON d.date_sk    = f.order_date_sk
JOIN dim_product p ON p.product_sk = f.product_sk
GROUP BY d.full_date, p.category
ORDER BY d.full_date, p.category;`;
F.star = await figure(PAGE_STAR, {
  facts: "SELECT order_id, order_date_sk, product_sk, amount\nFROM fact_orders\nORDER BY order_id\nLIMIT 4;",
  counts:
    "SELECT (SELECT COUNT(*) FROM fact_orders) AS orders,\n  (SELECT COUNT(*) FROM dim_date) AS dates,\n  (SELECT COUNT(*) FROM dim_product) AS products;",
  page: STAR_READ,
  // How many rows the read returns, and that it keeps every dollar.
  pageRows: `SELECT COUNT(*) AS rows, SUM(revenue) AS revenue FROM (${STAR_READ.replace(/;$/, "")}) r;`,
  total: "SELECT SUM(amount) AS revenue FROM fact_orders;",
});

// Questions 3 and 19. The challenge's tables, its initSql verbatim: twelve
// products in six categories, so the category text repeats in a star (three
// Books rows), and twenty-four orders.
const PAGE_CHALLENGE = `CREATE TABLE dim_product AS SELECT * FROM (VALUES
  (1, 'Books'), (2, 'Books'), (3, 'Electronics'), (4, 'Home'),
  (5, 'Books'), (6, 'Electronics'), (7, 'Home'), (8, 'Garden'),
  (9, 'Garden'), (10, 'Toys'), (11, 'Toys'), (12, 'Sports')
) AS t(product_id, category);

CREATE TABLE fact_orders AS SELECT * FROM (VALUES
  (1001, 1, 20.00),  (1002, 2, 15.00),  (1003, 3, 200.00),
  (1004, 3, 150.00), (1005, 4, 60.00),  (1006, 1, 25.00),
  (1007, 5, 32.50),  (1008, 6, 480.00), (1009, 7, 120.00),
  (1010, 8, 65.00),  (1011, 9, 92.50),  (1012, 10, 35.00),
  (1013, 11, 62.25), (1014, 12, 145.00), (1015, 2, 18.25),
  (1016, 3, 315.75), (1017, 4, 210.00), (1018, 5, 27.00),
  (1019, 6, 199.99), (1020, 7, 88.40),  (1021, 8, 145.00),
  (1022, 10, 48.00), (1023, 11, 55.50), (1024, 12, 73.60)
) AS t(order_id, product_id, amount);`;
/** The challenge's solutionSql, as the page gives it. */
const SOLUTION = `SELECT
  p.category,
  SUM(f.amount) AS revenue
FROM fact_orders f
JOIN dim_product p ON p.product_id = f.product_id
GROUP BY p.category
ORDER BY revenue DESC;`;
/** The same mart over the snowflaked product dimension (the video's own
 *  split): one more join for the same six rows. */
const SNOW_READ = `SELECT
  c.category,
  SUM(f.amount) AS revenue
FROM fact_orders f
JOIN dim_product_sf p  ON p.product_id  = f.product_id
JOIN dim_category   c  ON c.category_id = p.category_id
GROUP BY c.category
ORDER BY revenue DESC;`;
F.challenge = await figure(PAGE_CHALLENGE, {
  products: "SELECT product_id, category FROM dim_product ORDER BY product_id;",
  booksRows: "SELECT COUNT(*) AS books_rows FROM dim_product WHERE category = 'Books';",
  counts: "SELECT (SELECT COUNT(*) FROM fact_orders) AS orders,\n  (SELECT COUNT(*) FROM dim_product) AS products,\n  (SELECT COUNT(DISTINCT category) FROM dim_product) AS categories;",
  solution: SOLUTION,
  total: "SELECT SUM(amount) AS revenue FROM fact_orders;",
  // Snowflake the product dimension: category moves out to its own table.
  splitCategory:
    "CREATE TABLE dim_category AS\nSELECT ROW_NUMBER() OVER (ORDER BY category) AS category_id, category\nFROM (SELECT DISTINCT category FROM dim_product) c;",
  splitProduct:
    "CREATE TABLE dim_product_sf AS\nSELECT p.product_id, c.category_id\nFROM dim_product p\nJOIN dim_category c USING (category);",
  categories: "SELECT category_id, category FROM dim_category ORDER BY category_id;",
  productsSf: "SELECT product_id, category_id FROM dim_product_sf ORDER BY product_id;",
  snow: SNOW_READ,
  // Rows one read returns that the other does not, both ways round.
  differ: `SELECT COUNT(*) AS differ FROM (
  (SELECT * FROM (${SOLUTION.replace(/;$/, "")}) a EXCEPT ALL SELECT * FROM (${SNOW_READ.replace(/;$/, "")}) b)
  UNION ALL
  (SELECT * FROM (${SNOW_READ.replace(/;$/, "")}) b EXCEPT ALL SELECT * FROM (${SOLUTION.replace(/;$/, "")}) a)
) x;`,
});

// Question 4. The page's SCD Type 2 block, its initSql verbatim (without its
// comment header): customer 42, Acme Corp, East through 2023-06-14 and West
// from 2023-06-15, keys 1001 and 1002.
const PAGE_SCD = `CREATE TABLE dim_customer AS SELECT * FROM (VALUES
  (1001, 42, 'Acme Corp', 'East', DATE '2020-01-01', DATE '2023-06-14', FALSE),
  (1002, 42, 'Acme Corp', 'West', DATE '2023-06-15', DATE '9999-12-31', TRUE),
  (1003, 99, 'Globex', 'North', DATE '2021-03-01', DATE '9999-12-31', TRUE),
  (1004, 17, 'Initech', 'South', DATE '2019-04-01', DATE '2022-08-31', FALSE),
  (1005, 17, 'Initech', 'East', DATE '2022-09-01', DATE '9999-12-31', TRUE),
  (1006, 23, 'Umbrella', 'West', DATE '2020-06-15', DATE '2023-01-31', FALSE),
  (1007, 23, 'Umbrella', 'North', DATE '2023-02-01', DATE '9999-12-31', TRUE),
  (1008, 31, 'Hooli', 'East', DATE '2021-01-01', DATE '9999-12-31', TRUE),
  (1009, 55, 'Stark Ind', 'South', DATE '2018-03-01', DATE '2021-11-30', FALSE),
  (1010, 55, 'Stark Ind', 'West', DATE '2021-12-01', DATE '2023-09-30', FALSE),
  (1011, 55, 'Stark Ind', 'North', DATE '2023-10-01', DATE '9999-12-31', TRUE),
  (1012, 68, 'Wayne Ent', 'East', DATE '2020-02-01', DATE '9999-12-31', TRUE),
  (1013, 74, 'Cyberdyne', 'West', DATE '2019-09-01', DATE '2022-04-30', FALSE),
  (1014, 74, 'Cyberdyne', 'South', DATE '2022-05-01', DATE '9999-12-31', TRUE),
  (1015, 86, 'Tyrell Corp', 'North', DATE '2021-07-01', DATE '9999-12-31', TRUE),
  (1016, 91, 'Soylent', 'South', DATE '2020-10-01', DATE '2023-03-31', FALSE),
  (1017, 91, 'Soylent', 'East', DATE '2023-04-01', DATE '9999-12-31', TRUE),
  (1018, 12, 'Massive Dyn', 'West', DATE '2019-01-01', DATE '9999-12-31', TRUE),
  (1019, 28, 'Aperture', 'North', DATE '2021-05-01', DATE '2022-12-31', FALSE),
  (1020, 28, 'Aperture', 'South', DATE '2023-01-01', DATE '9999-12-31', TRUE),
  (1021, 39, 'Vandelay', 'East', DATE '2020-08-01', DATE '9999-12-31', TRUE),
  (1022, 47, 'Duff Beer', 'West', DATE '2018-11-01', DATE '2021-06-30', FALSE),
  (1023, 47, 'Duff Beer', 'North', DATE '2021-07-01', DATE '9999-12-31', TRUE),
  (1024, 63, 'Gringotts', 'South', DATE '2022-02-01', DATE '9999-12-31', TRUE)
) AS t(customer_sk, customer_id, customer_name, region, valid_from, valid_to, is_current);

CREATE TABLE fact_orders AS SELECT * FROM (VALUES
  (5001, 42, DATE '2022-05-10', 1200.00), (5002, 42, DATE '2024-02-20', 850.00),
  (5003, 99, DATE '2023-11-01', 320.00),  (5004, 17, DATE '2021-07-14', 640.00),
  (5005, 17, DATE '2023-03-08', 415.00),  (5006, 23, DATE '2022-04-19', 980.00),
  (5007, 23, DATE '2023-08-22', 275.00),  (5008, 31, DATE '2022-10-05', 1530.00),
  (5009, 55, DATE '2020-06-11', 720.00),  (5010, 55, DATE '2022-09-27', 460.00),
  (5011, 55, DATE '2024-01-16', 1105.00), (5012, 68, DATE '2023-05-30', 385.00),
  (5013, 74, DATE '2021-03-24', 890.00),  (5014, 74, DATE '2023-12-09', 540.00),
  (5015, 86, DATE '2022-11-18', 1250.00), (5016, 91, DATE '2021-12-02', 305.00),
  (5017, 91, DATE '2024-03-15', 770.00),  (5018, 12, DATE '2022-06-07', 1420.00),
  (5019, 28, DATE '2022-03-21', 195.00),  (5020, 28, DATE '2023-09-13', 660.00),
  (5021, 39, DATE '2023-02-26', 1080.00), (5022, 47, DATE '2020-09-04', 425.00),
  (5023, 47, DATE '2023-06-17', 935.00),  (5024, 63, DATE '2023-10-28', 580.00)
) AS t(order_id, customer_id, order_date, amount);`;
F.keys = await figure(PAGE_SCD, {
  // One natural key, two rows: the surrogate is what tells them apart.
  versions: "SELECT customer_sk, customer_id, customer_name, region\nFROM dim_customer\nWHERE customer_id = 42\nORDER BY valid_from;",
  // The same two rows with the dates each version is valid between, as the
  // video draws them (Question 4, "sk").
  validity:
    "SELECT customer_sk, customer_id, region, valid_from, valid_to\nFROM dim_customer\nWHERE customer_id = 42\nORDER BY valid_from;",
  // The surrogate each of customer 42's orders resolves to, by the page's
  // own point-in-time join.
  orders: `SELECT f.order_id, f.order_date, c.customer_sk, c.region
FROM fact_orders f
JOIN dim_customer c
    ON  c.customer_id = f.customer_id
    AND f.order_date BETWEEN c.valid_from AND c.valid_to
WHERE f.customer_id = 42
ORDER BY f.order_id;`,
  repeats: "SELECT COUNT(*) AS rows, COUNT(DISTINCT customer_id) AS customers\nFROM dim_customer;",
  // The page's hash surrogate query reads stg_customers, which the page never
  // builds; here it is the dimension's current rows, one per customer.
  staging:
    "CREATE TABLE stg_customers AS\nSELECT customer_id, customer_name, region\nFROM dim_customer WHERE is_current;",
  hash: `SELECT
    md5(customer_id::TEXT)  AS customer_sk,  -- surrogate
    customer_id,                              -- natural key
    customer_name,
    region
FROM stg_customers
WHERE customer_id = 42;`,
});

// Question 8. The role-playing block, its initSql verbatim.
const PAGE_ROLE = `CREATE TABLE dim_date AS SELECT * FROM (VALUES
  (1, DATE '2024-03-01'), (2, DATE '2024-03-03'), (3, DATE '2024-03-07'),
  (4, DATE '2024-03-10'), (5, DATE '2024-03-12'), (6, DATE '2024-03-15'),
  (7, DATE '2024-03-17'), (8, DATE '2024-03-19'), (9, DATE '2024-03-21'),
  (10, DATE '2024-03-24'), (11, DATE '2024-03-26'), (12, DATE '2024-03-28'),
  (13, DATE '2024-03-30'), (14, DATE '2024-04-02'), (15, DATE '2024-04-04'),
  (16, DATE '2024-04-06'), (17, DATE '2024-04-09'), (18, DATE '2024-04-11'),
  (19, DATE '2024-04-13'), (20, DATE '2024-04-16'), (21, DATE '2024-04-18'),
  (22, DATE '2024-04-20'), (23, DATE '2024-04-23'), (24, DATE '2024-04-25'),
  (25, DATE '2024-04-27'), (26, DATE '2024-04-30')
) AS t(date_sk, full_date);

CREATE TABLE fact_orders AS SELECT * FROM (VALUES
  (101, 1, 2, 3),    (102, 3, 4, 5),    (103, 4, 5, 6),
  (104, 2, 3, 5),    (105, 5, 6, 8),    (106, 6, 7, 9),
  (107, 7, 9, 10),   (108, 8, 9, 11),   (109, 9, 10, 12),
  (110, 10, 12, 13), (111, 11, 12, 14), (112, 12, 13, 15),
  (113, 13, 14, 16), (114, 14, 15, 17), (115, 15, 17, 18),
  (116, 16, 17, 19), (117, 17, 18, 20), (118, 18, 20, 21),
  (119, 19, 20, 22), (120, 20, 21, 23), (121, 21, 23, 24),
  (122, 22, 23, 25), (123, 23, 24, 26), (124, 24, 25, 26)
) AS t(order_id, order_date_sk, ship_date_sk, delivery_date_sk);`;
const ROLE_READ = `SELECT
    o.order_id,
    od.full_date   AS order_date,
    sd.full_date   AS ship_date,
    dd.full_date   AS delivery_date
FROM fact_orders o
JOIN dim_date od ON od.date_sk = o.order_date_sk
JOIN dim_date sd ON sd.date_sk = o.ship_date_sk
JOIN dim_date dd ON dd.date_sk = o.delivery_date_sk
ORDER BY o.order_id;`;
F.role = await figure(PAGE_ROLE, {
  facts: "SELECT order_id, order_date_sk, ship_date_sk, delivery_date_sk\nFROM fact_orders\nORDER BY order_id\nLIMIT 3;",
  page: ROLE_READ,
  // A question that needs two roles in one row: days from order to
  // delivery, and the slowest order.
  days: `SELECT ROUND(AVG(dd.full_date - od.full_date), 1) AS avg_days,
  MIN(dd.full_date - od.full_date) AS fewest,
  MAX(dd.full_date - od.full_date) AS most
FROM fact_orders o
JOIN dim_date od ON od.date_sk = o.order_date_sk
JOIN dim_date dd ON dd.date_sk = o.delivery_date_sk;`,
  // One role as its own view, its columns named for the role.
  view: "CREATE VIEW dim_ship_date AS\nSELECT date_sk AS ship_date_sk, full_date AS ship_date\nFROM dim_date;",
  viewRead:
    "SELECT o.order_id, s.ship_date\nFROM fact_orders o\nJOIN dim_ship_date s USING (ship_date_sk)\nORDER BY o.order_id\nLIMIT 3;",
});

// Question 9. The bridge-table block, its initSql verbatim.
const PAGE_BRIDGE = `CREATE TABLE dim_promotion AS SELECT * FROM (VALUES
  (1, 'Summer Sale'), (2, 'Loyalty 10%'), (3, 'Flash Deal'),
  (4, 'Free Shipping'), (5, 'Bundle Discount'), (6, 'Referral Credit')
) AS t(promotion_sk, promotion_name);

CREATE TABLE fact_orders AS SELECT * FROM (VALUES
  (201, 1001, 500.00), (202, 1002, 200.00), (203, 1003, 350.00),
  (204, 1004, 275.00), (205, 1005, 620.00), (206, 1006, 145.00),
  (207, 1007, 890.00), (208, 1008, 310.00), (209, 1009, 465.00),
  (210, 1010, 180.00), (211, 1011, 725.00), (212, 1012, 240.00)
) AS t(order_sk, order_id, amount);

CREATE TABLE bridge_order_promotion AS SELECT * FROM (VALUES
  (201, 1, 0.6), (201, 2, 0.4), (202, 1, 1.0), (203, 3, 1.0),
  (204, 2, 0.5), (204, 4, 0.5), (205, 1, 0.7), (205, 5, 0.3),
  (206, 4, 1.0), (207, 2, 0.4), (207, 3, 0.3), (207, 6, 0.3),
  (208, 5, 1.0), (209, 1, 0.5), (209, 6, 0.5), (210, 3, 1.0),
  (211, 2, 0.25), (211, 4, 0.25), (211, 5, 0.25), (211, 6, 0.25),
  (212, 1, 0.8), (212, 3, 0.2), (203, 6, 0.0), (202, 4, 0.0)
) AS t(order_sk, promotion_sk, weight_factor);`;
const BRIDGE_READ = `SELECT
    f.order_id,
    p.promotion_name,
    f.amount * b.weight_factor AS allocated_amount
FROM fact_orders f
JOIN bridge_order_promotion b  ON b.order_sk    = f.order_sk
JOIN dim_promotion          p  ON p.promotion_sk = b.promotion_sk
ORDER BY f.order_id, p.promotion_name;`;
F.bridge = await figure(PAGE_BRIDGE, {
  counts:
    "SELECT (SELECT COUNT(*) FROM fact_orders) AS orders,\n  (SELECT COUNT(*) FROM bridge_order_promotion) AS bridge_rows,\n  (SELECT COUNT(*) FROM dim_promotion) AS promotions;",
  order201: "SELECT order_sk, order_id, amount FROM fact_orders WHERE order_sk = 201;",
  bridge201: "SELECT order_sk, promotion_sk, weight_factor\nFROM bridge_order_promotion\nWHERE order_sk = 201\nORDER BY promotion_sk;",
  page: BRIDGE_READ,
  pageRows: `SELECT COUNT(*) AS rows FROM (${BRIDGE_READ.replace(/;$/, "")}) r;`,
  total: "SELECT SUM(amount) AS revenue FROM fact_orders;",
  // The trap: join through the bridge and sum the amount, unweighted.
  fanout:
    "SELECT SUM(f.amount) AS revenue\nFROM fact_orders f\nJOIN bridge_order_promotion b ON b.order_sk = f.order_sk;",
  // The page's read, summed: the weights put every dollar back once.
  weighted:
    "SELECT SUM(f.amount * b.weight_factor) AS revenue\nFROM fact_orders f\nJOIN bridge_order_promotion b ON b.order_sk = f.order_sk;",
  weightSums:
    "SELECT COUNT(*) AS orders,\n  COUNT(*) FILTER (WHERE weights <> 1) AS not_one\nFROM (SELECT order_sk, SUM(weight_factor) AS weights\n      FROM bridge_order_promotion GROUP BY order_sk) w;",
  // Per promotion: what it touched (unweighted) against what it is credited.
  byPromotion: `SELECT p.promotion_name,
  SUM(f.amount) AS touched,
  SUM(f.amount * b.weight_factor) AS allocated
FROM fact_orders f
JOIN bridge_order_promotion b ON b.order_sk    = f.order_sk
JOIN dim_promotion          p ON p.promotion_sk = b.promotion_sk
GROUP BY p.promotion_name
ORDER BY allocated DESC;`,
});

// Question 12. The factless-fact query, COUNT(*) against COUNT(DISTINCT), on the video's
// own coverage rows: store 5 promotes product 1 all week, product 2 on three
// days and product 3 on one; store 6 promotes product 1 on two days; and one
// row falls the day after the week.
F.factless = await figure(
  `CREATE TABLE dim_date AS
SELECT ROW_NUMBER() OVER (ORDER BY d)::int AS date_sk, d::date AS full_date
FROM generate_series(DATE '2024-01-01', DATE '2024-01-08', INTERVAL '1 day') d;
CREATE TABLE fact_promotion_coverage (date_sk INTEGER, store_sk INTEGER, product_sk INTEGER);
INSERT INTO fact_promotion_coverage
SELECT date_sk, 5, 1 FROM dim_date WHERE full_date <= DATE '2024-01-07';
INSERT INTO fact_promotion_coverage VALUES
  (2, 5, 2), (3, 5, 2), (4, 5, 2),
  (6, 5, 3),
  (1, 6, 1), (2, 6, 1),
  (8, 5, 3);`,
  {
    rows: "SELECT COUNT(*) AS coverage_rows FROM fact_promotion_coverage;",
    store5: `SELECT pc.product_sk, COUNT(*) AS days
FROM fact_promotion_coverage pc
JOIN dim_date d ON d.date_sk = pc.date_sk
WHERE pc.store_sk = 5
  AND d.full_date BETWEEN '2024-01-01' AND '2024-01-07'
GROUP BY pc.product_sk
ORDER BY pc.product_sk;`,
    // COUNT(*), as the page wrote it before 2026-11-20: product-days, not products.
    page: `SELECT COUNT(*) AS promoted_products
FROM fact_promotion_coverage pc
JOIN dim_date d ON d.date_sk = pc.date_sk
WHERE pc.store_sk = 5
  AND d.full_date BETWEEN '2024-01-01' AND '2024-01-07';`,
    // What its comment asks for: distinct products.
    distinct: `SELECT COUNT(DISTINCT pc.product_sk) AS promoted_products
FROM fact_promotion_coverage pc
JOIN dim_date d ON d.date_sk = pc.date_sk
WHERE pc.store_sk = 5
  AND d.full_date BETWEEN '2024-01-01' AND '2024-01-07';`,
  },
);

// ── Reused from de-dimensional-modeling, re-run here ────────────────────────

// Question 2. A fact declared at one row per order line, given a column that
// belongs to the whole order (de-dimensional-modeling's "lines", verbatim).
F.lines = await figure(
  `CREATE TABLE fact_order_lines (
  order_id     INTEGER,
  line         INTEGER,
  product      VARCHAR,
  quantity     INTEGER,
  amount       DECIMAL(10,2),
  shipping_fee DECIMAL(10,2)
);
INSERT INTO fact_order_lines VALUES
  (1001, 1, 'Notebook', 2, 16.00, 5.00),
  (1001, 2, 'Pen',      3,  4.50, 5.00),
  (1001, 3, 'Mug',      1, 12.00, 5.00);`,
  {
    rows: "SELECT * FROM fact_order_lines ORDER BY order_id, line;",
    totals: "SELECT SUM(quantity) AS quantity, SUM(amount) AS amount, SUM(shipping_fee) AS shipping_fee FROM fact_order_lines;",
    orders: `SELECT order_id, MAX(shipping_fee) AS shipping_fee
FROM fact_order_lines GROUP BY order_id;`,
    // The video's own step: the other home for the fee, split across the
    // lines by amount, so the shares add back to the order's five dollars.
    split: `SELECT line, product,
  ROUND(shipping_fee * amount / SUM(amount) OVER (PARTITION BY order_id), 2) AS fee_share
FROM fact_order_lines
ORDER BY line;`,
  },
);

// Questions 6, 10 and 11. Two accounts' transactions over a quarter, the
// month-end balances built from them (a periodic snapshot), and a loan
// application (an accumulating snapshot): de-dimensional-modeling's
// "account", verbatim, with one step of its own ("benFebruary").
const ACCOUNT_SETUP = `CREATE TABLE fact_transactions (
  txn_date DATE,
  account  VARCHAR,
  amount   DECIMAL(10,2)
);
INSERT INTO fact_transactions VALUES
  (DATE '2024-01-05', 'Ada', 1000.00),
  (DATE '2024-01-09', 'Ben',  500.00),
  (DATE '2024-02-03', 'Ada',  300.00),
  (DATE '2024-02-20', 'Ada', -100.00),
  (DATE '2024-03-12', 'Ada', -300.00),
  (DATE '2024-03-18', 'Ben',  200.00);
CREATE TABLE fact_balance AS
SELECT m.month_end, a.account,
       SUM(t.amount) AS balance
FROM (VALUES (DATE '2024-01-31'), (DATE '2024-02-29'), (DATE '2024-03-31')) m(month_end)
CROSS JOIN (SELECT DISTINCT account FROM fact_transactions) a
JOIN fact_transactions t
  ON t.account = a.account AND t.txn_date <= m.month_end
GROUP BY m.month_end, a.account;
CREATE TABLE fact_loan_application (
  application_id INTEGER,
  applied        DATE,
  approved       DATE,
  funded         DATE
);
INSERT INTO fact_loan_application VALUES (7, DATE '2024-03-04', NULL, NULL);`;
F.account = await figure(ACCOUNT_SETUP, {
  transactions: "SELECT txn_date, account, amount FROM fact_transactions ORDER BY txn_date;",
  balance: "SELECT month_end, account, balance FROM fact_balance ORDER BY month_end, account;",
  acrossAccounts: "SELECT SUM(balance) AS balance FROM fact_balance WHERE month_end = DATE '2024-03-31';",
  overTime: "SELECT SUM(balance) AS balance FROM fact_balance;",
  monthEnds: "SELECT month_end, SUM(balance) AS balance FROM fact_balance GROUP BY month_end ORDER BY month_end;",
  closing: `SELECT DISTINCT ON (account) account, balance AS closing
FROM fact_balance
ORDER BY account, month_end DESC;`,
  closingTotal: `SELECT SUM(closing) AS balance FROM (
  SELECT DISTINCT ON (account) balance AS closing
  FROM fact_balance ORDER BY account, month_end DESC);`,
  // Question 11, the video's own step: Ben made no transaction in February,
  // and the snapshot still has his February balance.
  benFebruary: `SELECT
  (SELECT COUNT(*) FROM fact_transactions
    WHERE account = 'Ben' AND txn_date BETWEEN DATE '2024-02-01' AND DATE '2024-02-29') AS ben_feb_transactions,
  (SELECT balance FROM fact_balance
    WHERE account = 'Ben' AND month_end = DATE '2024-02-29') AS ben_feb_balance;`,
  approve: "UPDATE fact_loan_application SET approved = DATE '2024-03-11' WHERE application_id = 7;",
  fund: "UPDATE fact_loan_application SET funded = DATE '2024-03-20' WHERE application_id = 7;",
  funded: "SELECT * FROM fact_loan_application;",
  stages: `SELECT approved - applied AS days_to_approve,
       funded - approved AS days_to_fund
FROM fact_loan_application;`,
});

// Question 6, non-additive: distinct users per day, and over both days
// (de-dimensional-modeling's "visits", verbatim).
F.visits = await figure(
  `CREATE TABLE visits (day VARCHAR, user_name VARCHAR);
INSERT INTO visits VALUES
  ('Mon', 'Ada'), ('Mon', 'Ben'), ('Mon', 'Cy'),
  ('Tue', 'Ben'), ('Tue', 'Cy'),  ('Tue', 'Di');`,
  {
    perDay: "SELECT day, COUNT(DISTINCT user_name) AS users FROM visits GROUP BY day ORDER BY day;",
    both: "SELECT COUNT(DISTINCT user_name) AS users FROM visits;",
  },
);

// ── The video's own tables ──────────────────────────────────────────────────

// Question 5. A hash key against an integer handed out by row_number(), the
// page's two queries, on the video's own three staged customers (names from
// the page's dimension). The integers are recomputed on every rebuild, so a
// new customer with a lower ID shifts every key after it, and a fact stored
// with yesterday's key joins to someone else.
const HASH_KEYS = `SELECT md5(customer_id::TEXT) AS customer_sk, customer_id, customer_name
FROM stg_customers`;
const ROW_NUMBER_KEYS = `SELECT row_number() OVER (ORDER BY customer_id) AS customer_sk,
       customer_id, customer_name
FROM stg_customers`;
F.hashSeq = await figure(
  `CREATE TABLE stg_customers (customer_id INTEGER, customer_name VARCHAR);
INSERT INTO stg_customers VALUES (17, 'Initech'), (23, 'Umbrella'), (42, 'Acme Corp');`,
  {
    seqBefore: `${ROW_NUMBER_KEYS}\nORDER BY customer_id;`,
    hashBefore: `${HASH_KEYS}\nORDER BY customer_id;`,
    // Monday's build: the dimension, and an order for Acme loaded with the
    // key Acme had that day.
    buildMonday: `CREATE TABLE dim_customer AS\n${ROW_NUMBER_KEYS};`,
    loadOrder:
      "CREATE TABLE fact_orders AS\nSELECT 5002 AS order_id, d.customer_sk, 850.00 AS amount\nFROM dim_customer d WHERE d.customer_id = 42;",
    factMonday: "SELECT order_id, customer_sk, amount FROM fact_orders;",
    // Tuesday: Massive Dyn, customer 12, arrives, and the dimension is rebuilt.
    arrive: "INSERT INTO stg_customers VALUES (12, 'Massive Dyn');",
    rebuild: `DROP TABLE dim_customer;`,
    buildTuesday: `CREATE TABLE dim_customer AS\n${ROW_NUMBER_KEYS};`,
    seqAfter: "SELECT customer_sk, customer_id, customer_name FROM dim_customer ORDER BY customer_id;",
    // Monday's order, read through Tuesday's dimension.
    misread:
      "SELECT f.order_id, d.customer_name, f.amount\nFROM fact_orders f\nJOIN dim_customer d ON d.customer_sk = f.customer_sk;",
    hashAfter: `${HASH_KEYS}\nORDER BY customer_id;`,
  },
);

// Question 5, size: 100,000 keys as Postgres stores them, and the primary-key
// index each builds. md5 returns text, 32 hex characters.
F.keySize = await figure(
  `CREATE TABLE int_keys (customer_sk bigint PRIMARY KEY);
INSERT INTO int_keys SELECT g FROM generate_series(1, 100000) g;
CREATE TABLE md5_keys (customer_sk text PRIMARY KEY);
INSERT INTO md5_keys SELECT md5(g::text) FROM generate_series(1, 100000) g;`,
  {
    bytes: "SELECT pg_column_size(42::bigint) AS bigint_bytes,\n  pg_column_size(md5('42')) AS md5_bytes,\n  length(md5('42')) AS md5_chars;",
    index:
      "SELECT pg_relation_size('int_keys_pkey') AS integer_index,\n  pg_relation_size('md5_keys_pkey') AS md5_index,\n  ROUND(pg_relation_size('md5_keys_pkey')::numeric / pg_relation_size('int_keys_pkey'), 2) AS ratio;",
    pretty:
      "SELECT pg_size_pretty(pg_relation_size('int_keys_pkey')) AS integer_index,\n  pg_size_pretty(pg_relation_size('md5_keys_pkey')) AS md5_index;",
  },
);

// Question 7. Margin stored as a ratio on each order, against the additive
// parts it came from (the video's own two orders, in the page's column
// names: gross_revenue and cost_of_goods_sold).
F.ratio = await figure(
  `CREATE TABLE fact_orders (
  order_id           INTEGER,
  gross_revenue      DECIMAL(10,2),
  cost_of_goods_sold DECIMAL(10,2),
  margin_pct         DECIMAL(5,1)
);
INSERT INTO fact_orders VALUES
  (1, 100.00,  50.00, 50.0),
  (2, 900.00, 810.00, 10.0);`,
  {
    rows: "SELECT * FROM fact_orders ORDER BY order_id;",
    summed: "SELECT SUM(margin_pct) AS summed_margin FROM fact_orders;",
    averaged: "SELECT AVG(margin_pct)::numeric(5,1) AS average_margin FROM fact_orders;",
    fromParts: `SELECT ROUND(100 * (SUM(gross_revenue) - SUM(cost_of_goods_sold))
             / SUM(gross_revenue), 1) AS margin_pct
FROM fact_orders;`,
    // Each stored ratio still matches its own row: the error is only in the roll-up.
    perRow: "SELECT order_id, ROUND(100 * (gross_revenue - cost_of_goods_sold) / gross_revenue, 1) AS margin_pct\nFROM fact_orders ORDER BY order_id;",
  },
);

// Question 13. A degenerate dimension: the page's query, run as written on
// the video's own three order lines.
F.degenerate = await figure(
  `CREATE TABLE fact_order_lines (order_number VARCHAR, product VARCHAR, line_amount DECIMAL(10,2));
INSERT INTO fact_order_lines VALUES
  ('SO-1001', 'kettle', 40.00), ('SO-1001', 'mugs', 18.00),
  ('SO-1002', 'teapot', 35.00);`,
  {
    lines: "SELECT order_number, product, line_amount FROM fact_order_lines;",
    page: `SELECT
    order_number,               -- degenerate dimension, grouping only
    SUM(line_amount) AS total
FROM fact_order_lines
GROUP BY order_number
ORDER BY order_number;`,
  },
);

// Question 14. A junk dimension over the page's three flags: every
// combination is a row.
F.junk = await figure("SELECT 1;", {
  build: `CREATE TABLE dim_order_flags AS
SELECT ROW_NUMBER() OVER (ORDER BY is_promo, is_gift_wrap, is_expedited) AS flags_sk,
       is_promo, is_gift_wrap, is_expedited
FROM (VALUES (false), (true)) a(is_promo),
     (VALUES (false), (true)) b(is_gift_wrap),
     (VALUES (false), (true)) c(is_expedited);`,
  rows: "SELECT * FROM dim_order_flags ORDER BY flags_sk;",
  count: "SELECT COUNT(*) AS junk_rows FROM dim_order_flags;",
});

// Question 15. A date dimension for 2024, generated with the page's typical
// columns that a date function can compute; is_holiday comes from a list,
// because no function knows the business's holidays (the video's own two).
F.dateDim = await figure("SELECT 1;", {
  build: `CREATE TABLE dim_date AS
SELECT
  to_char(d, 'YYYYMMDD')::int          AS date_sk,
  d::date                              AS full_date,
  EXTRACT(YEAR FROM d)::int            AS year,
  EXTRACT(QUARTER FROM d)::int         AS quarter,
  EXTRACT(MONTH FROM d)::int           AS month,
  to_char(d, 'FMMonth')                AS month_name,
  EXTRACT(WEEK FROM d)::int            AS week_of_year,
  EXTRACT(ISODOW FROM d)::int          AS day_of_week,
  to_char(d, 'FMDay')                  AS day_name,
  EXTRACT(ISODOW FROM d) IN (6, 7)     AS is_weekend,
  d::date IN (DATE '2024-07-04', DATE '2024-12-25') AS is_holiday
FROM generate_series(DATE '2024-01-01', DATE '2024-12-31', INTERVAL '1 day') d;`,
  count: "SELECT COUNT(*) AS days, COUNT(*) FILTER (WHERE is_weekend) AS weekend_days FROM dim_date;",
  row: "SELECT * FROM dim_date WHERE full_date = DATE '2024-07-04';",
});

// Question 20. A bank's customers and accounts through a bridge (the video's
// own: a joint account, half each, and one in Ada's name alone), against a
// balance fact at one month-end, in the page's column names.
F.bank = await figure(
  `CREATE TABLE dim_customer (customer_sk INTEGER, customer_name VARCHAR);
INSERT INTO dim_customer VALUES (1, 'Ada'), (2, 'Ben');
CREATE TABLE fact_account_balance (account_sk INTEGER, month_end DATE, balance DECIMAL(10,2));
INSERT INTO fact_account_balance VALUES
  (10, DATE '2024-03-31', 1000.00),
  (11, DATE '2024-03-31',  400.00);
CREATE TABLE bridge_customer_account (account_sk INTEGER, customer_sk INTEGER, ownership_pct DECIMAL(4,2));
INSERT INTO bridge_customer_account VALUES (10, 1, 0.50), (10, 2, 0.50), (11, 1, 1.00);`,
  {
    bank: "SELECT SUM(balance) AS balance FROM fact_account_balance;",
    // The bridge's rows, each owner's share, as the video draws them.
    bridge: "SELECT account_sk, customer_sk, ownership_pct\nFROM bridge_customer_account\nORDER BY account_sk, customer_sk;",
    balances: "SELECT account_sk, balance FROM fact_account_balance ORDER BY account_sk;",
    unweighted: `SELECT c.customer_name, SUM(f.balance) AS balance
FROM fact_account_balance f
JOIN bridge_customer_account b ON b.account_sk = f.account_sk
JOIN dim_customer c            ON c.customer_sk = b.customer_sk
GROUP BY c.customer_name ORDER BY c.customer_name;`,
    unweightedTotal: `SELECT SUM(f.balance) AS balance
FROM fact_account_balance f
JOIN bridge_customer_account b ON b.account_sk = f.account_sk;`,
    weighted: `SELECT c.customer_name, SUM(f.balance * b.ownership_pct)::numeric(10,2) AS balance
FROM fact_account_balance f
JOIN bridge_customer_account b ON b.account_sk = f.account_sk
JOIN dim_customer c            ON c.customer_sk = b.customer_sk
GROUP BY c.customer_name ORDER BY c.customer_name;`,
    weightedTotal: `SELECT SUM(f.balance * b.ownership_pct)::numeric(10,2) AS balance
FROM fact_account_balance f
JOIN bridge_customer_account b ON b.account_sk = f.account_sk;`,
  },
);

// ── Checks: what the narration says has to be what came back ───────────────

/** A step's rows, each value as text (null stays null), as data.ts reads them. */
const one = (fig, step) => {
  const s = F[fig].steps[step];
  if (!s.ok) throw new Error(`${fig}.${step} failed: ${s.error}`);
  return s.rows.map((r) => r.map((v) => (v === null ? null : String(v))));
};
const expect = (what, got, want) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
for (const [fig, f] of Object.entries(F)) for (const [id, s] of Object.entries(f.steps)) if (!s.ok) throw new Error(`${fig}.${id}: ${s.error}`);

// The reused figures agree with the Data Engineer video's own results.json.
const de = JSON.parse(readFileSync(new URL("../de-dimensional-modeling/results.json", import.meta.url), "utf8")).figures;
for (const [fig, steps] of [
  ["lines", ["rows", "totals", "orders"]],
  ["account", ["balance", "acrossAccounts", "overTime", "monthEnds", "closing", "closingTotal", "funded", "stages"]],
  ["visits", ["perDay", "both"]],
]) {
  for (const s of steps) expect(`${fig}.${s} against de-dimensional-modeling`, F[fig].steps[s].rows, de[fig].steps[s].rows);
}

// What the narration says, by beat (script.ts).
expect("facts: the page's star", one("star", "counts"), [["24", "6", "6"]]);
expect("facts: the star read keeps every order", one("star", "pageRows")[0][0], "24");
expect("grain-test: the fee summed", one("lines", "totals")[0][2], "15.00");
expect("grain-fix: at order grain", one("lines", "orders"), [["1001", "5.00"]]);
expect("grain-fix: the split adds back to five", one("lines", "split").reduce((s, r) => s + Number(r[2]), 0).toFixed(2), "5.00");
expect("star: twelve products, Books three times", [one("challenge", "counts")[0][1], one("challenge", "booksRows")[0][0]], ["12", "3"]);
expect("snow: six categories, the same six rows", [one("challenge", "categories").length, one("challenge", "solution").length, one("challenge", "differ")[0][0]], [6, 6, "0"]);
expect("sk-versions: 42's two keys", one("keys", "versions").map((r) => [r[0], r[3]]), [["1001", "East"], ["1002", "West"]]);
expect("sk-versions: each order's version", one("keys", "orders").map((r) => [r[0], r[1].slice(0, 4), r[2]]), [["5001", "2022", "1001"], ["5002", "2024", "1002"]]);
expect("hash: md5 of 42", one("keys", "hash")[0][0], "a1d0c6e83f027327d8461063f4ac58a6");
expect("hash: the same after the rebuild", one("hashSeq", "hashAfter").find((r) => r[1] === "42")[0], "a1d0c6e83f027327d8461063f4ac58a6");
expect("hash-size: integers under a third of the hashes", Number(one("keySize", "index")[0][0]) / Number(one("keySize", "index")[0][1]) < 1 / 3, true);
expect("hash-trap: Acme is 3 on Monday", one("hashSeq", "seqBefore").find((r) => r[1] === "42")[0], "3");
expect("hash-trap: Acme is 4 on Tuesday", one("hashSeq", "seqAfter").find((r) => r[1] === "42")[0], "4");
expect("hash-trap: Monday's order reads as Umbrella's", one("hashSeq", "misread"), [["5002", "Umbrella", "850.00"]]);
expect("semi: across accounts", one("account", "acrossAccounts"), [["1600.00"]]);
expect("semi: over time", one("account", "overTime"), [["4800.00"]]);
expect("semi-fix: the closing balance", one("account", "closingTotal"), [["1600.00"]]);
expect("nonadd: three, three, four", [one("visits", "perDay").map((r) => r[1]), one("visits", "both")[0][0]], [["3", "3"], "4"]);
expect("ratio: fifty and ten", one("ratio", "rows").map((r) => r[3]), ["50.0", "10.0"]);
expect("ratio-sum: sixty, thirty, fourteen", [one("ratio", "summed")[0][0], one("ratio", "averaged")[0][0], one("ratio", "fromParts")[0][0]], ["60.0", "30.0", "14.0"]);
expect("ratio-sum: nine-tenths of the revenue", Number(one("ratio", "rows")[1][1]) / one("ratio", "rows").reduce((s, r) => s + Number(r[1]), 0), 0.9);
expect("role-join: order 101", one("role", "page")[0], ["101", "2024-03-01", "2024-03-03", "2024-03-07"]);
expect("role-why: 6.7 days on average, 9 at most", one("role", "days"), [["6.7", "5", "9"]]);
expect("bridge-pairs: 24 pairs, 12 orders", one("bridge", "counts"), [["12", "24", "6"]]);
expect("bridge-fan: 4,900 reported as 11,505", [one("bridge", "total")[0][0], one("bridge", "fanout")[0][0]], ["4900.00", "11505.00"]);
expect("bridge-weight: weights add to one", one("bridge", "weightSums"), [["12", "0"]]);
expect("bridge-weight: exactly 4,900", Number(one("bridge", "weighted")[0][0]), 4900);
expect("r-types: the loan's milestones", one("account", "stages"), [["7", "9"]]);
expect("r-periodic: Ben's February", one("account", "benFebruary"), [["0", "500.00"]]);
expect("r-factless: eleven rows, three products", [one("factless", "page")[0][0], one("factless", "distinct")[0][0]], ["11", "3"]);
expect("r-junk: eight rows", one("junk", "count"), [["8"]]);
expect("r-date: 366 days in 2024", one("dateDim", "count")[0][0], "366");
expect("r-agg: 24 orders into six categories", [one("challenge", "counts")[0][0], one("challenge", "solution").length], ["24", 6]);
expect("r-bank: unweighted counts the joint account twice", [one("bank", "bank")[0][0], one("bank", "unweightedTotal")[0][0]], ["1400.00", "2400.00"]);
expect("r-bank: weighted adds back to the bank", [one("bank", "weighted"), one("bank", "weightedTotal")[0][0]], [[["Ada", "900.00"], ["Ben", "500.00"]], "1400.00"]);

const out = {
  // 1. The page's star.
  starCounts: one("star", "counts"),
  starRows: one("star", "pageRows"),
  // 2. The grain.
  shippingSum: one("lines", "totals")[0][2],
  split: one("lines", "split"),
  // 3. Star against snowflake: the same six rows, one join more.
  booksRows: one("challenge", "booksRows"),
  categories: one("challenge", "counts"),
  snowDiffer: one("challenge", "differ"),
  // 4. Customer 42's two keys, and the order each one carries.
  versions: one("keys", "versions"),
  keyedOrders: one("keys", "orders").map((r) => [r[0], r[2], r[3]]),
  md5: one("keys", "hash")[0][0],
  // 5. The renumbered keys, and the sizes.
  seqBefore: one("hashSeq", "seqBefore"),
  seqAfter: one("hashSeq", "seqAfter"),
  misread: one("hashSeq", "misread"),
  hashSame: JSON.stringify(one("hashSeq", "hashBefore").find((r) => r[1] === "42")) === JSON.stringify(one("hashSeq", "hashAfter").find((r) => r[1] === "42")),
  keyBytes: one("keySize", "bytes"),
  keyIndex: one("keySize", "index"),
  // 6. Additivity (Data Engineer Part 3's numbers).
  acrossAccounts: one("account", "acrossAccounts"),
  overTime: one("account", "overTime"),
  distinct: [one("visits", "perDay"), one("visits", "both")],
  // 7. Ratios.
  ratio: [one("ratio", "summed"), one("ratio", "averaged"), one("ratio", "fromParts")],
  // 8. Role-playing.
  role101: one("role", "page")[0],
  roleDays: one("role", "days"),
  // 9. The bridge.
  bridgeCounts: one("bridge", "counts"),
  bridgeTotals: [one("bridge", "total"), one("bridge", "fanout"), one("bridge", "weighted")],
  weightSums: one("bridge", "weightSums"),
  byPromotion: one("bridge", "byPromotion"),
  // Rapid round.
  benFebruary: one("account", "benFebruary"),
  stages: one("account", "stages"),
  factless: [one("factless", "page"), one("factless", "distinct"), one("factless", "store5")],
  degenerate: one("degenerate", "page"),
  junk: one("junk", "count"),
  dateDim: [one("dateDim", "count"), one("dateDim", "row")],
  mart: [one("challenge", "solution"), one("challenge", "total")],
  bank: [one("bank", "bank"), one("bank", "unweightedTotal"), one("bank", "weighted"), one("bank", "weightedTotal")],
};
for (const [k, v] of Object.entries(out)) console.log(`${k}: ${JSON.stringify(v)}`);

writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify(results, null, 2) + "\n");
console.log(`wrote results.json (${F.star.version}): ${Object.keys(F).join(", ")}`);
