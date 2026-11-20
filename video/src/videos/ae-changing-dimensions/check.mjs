// Runs every statement the ae-changing-dimensions video shows on the site's
// Postgres engine (PGlite, PostgreSQL 18), the engine the Analytics Engineer
// dimensional-modeling page's blocks run in the reader's browser
// (<SqlCodeBlock dialect="postgres">), and writes what came back to
// results.json, which data.ts reads. From the repo root:
//
//   node video/src/videos/ae-changing-dimensions/check.mjs
//
// Each figure runs in a fresh database built by its own setup, as the page
// gives every block its own engine (video/scripts/lib/pg-figure.mjs); its
// steps run in order in that database, so an UPDATE in one step is seen by
// the next. Values are printed the way psql prints them: a numeric at its
// scale, a DATE as "2024-01-01", a NULL as null, and a statement that
// returns no rows as its "rows affected".
//
// The SCD tables are the page's own (content/interview/analytics-engineer/
// dimensional-modeling.mdx, "What is SCD Type 2, and how is it
// implemented?"): its initSql verbatim, dim_customer (24 versions of 15
// customers, with valid_from, valid_to and is_current) and 24 orders, and
// its point-in-time join and is_current read as the page writes them.
// Customer 42, Acme Corp, is the one the page follows: East until
// 2023-06-14, West from 2023-06-15; order 5001 (2022-05-10, 1,200.00) and
// order 5002 (2024-02-20, 850.00).
//
// Reused, so the two series agree: the late-arriving dimension figure is
// de-modeling-history's "late" (its three staged orders, 200.00, 500.00 and
// 410.00, and the inner-join load that keeps 700.00 of 1,110.00), with the
// dimension rows for customers 42 and 99 taken from this page instead of
// that one; the mini-dimension count is de-modeling-history's (five age
// bands by four income tiers). check.mjs compares both with that video's
// results.json and stops if they disagree.
//
// Everything else is the video's own small table, marked so below and in
// script.ts. dbt does not run here: the snapshot is drawn, not measured.
/* global console, URL */
import { readFileSync, writeFileSync } from "node:fs";

import { figure } from "../../../scripts/lib/pg-figure.mjs";

const results = { figures: {} };
const F = results.figures;

// ── The page's Type 2 block ─────────────────────────────────────────────────

/** The page's initSql, verbatim but for its comment header. */
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

/** The page's point-in-time join, as its starterCode writes it (without
 *  its comment line). */
const PAGE_JOIN = `SELECT
    f.order_id,
    c.region       AS region_at_order_time,
    f.amount
FROM fact_orders f
JOIN dim_customer c
    ON  c.customer_id = f.customer_id
    AND f.order_date BETWEEN c.valid_from AND c.valid_to
ORDER BY f.order_id;`;

/** The page's "present state" read, without its comments. */
const PAGE_CURRENT = `SELECT
    customer_sk,
    customer_id,
    customer_name,
    region,
    valid_from,
    valid_to,
    is_current
FROM dim_customer
WHERE is_current = TRUE;`;

/** Revenue by region for orders placed in 2022, through a given join. */
const REGIONS_2022 = (join) => `SELECT c.region, SUM(f.amount) AS revenue
FROM fact_orders f
${join}
WHERE f.order_date BETWEEN DATE '2022-01-01' AND DATE '2022-12-31'
GROUP BY c.region
ORDER BY c.region;`;
const PIT = "JOIN dim_customer c\n  ON  c.customer_id = f.customer_id\n  AND f.order_date BETWEEN c.valid_from AND c.valid_to";

// Questions 1 and 2 (and the hook): Type 1 against Type 2 on the page's
// table. Type 1 is the page's table as an overwrite leaves it: one row per
// customer, the current values (the video's own derivation; the page gives
// no Type 1 table).
F.scd = await figure(PAGE_SCD, {
  orders42: "SELECT order_id, order_date, amount\nFROM fact_orders\nWHERE customer_id = 42\nORDER BY order_id;",
  rows42:
    "SELECT customer_sk, region, valid_from, valid_to, is_current\nFROM dim_customer\nWHERE customer_id = 42\nORDER BY valid_from;",
  // Type 2, the page's read.
  page: PAGE_JOIN,
  // Every order matches exactly one version.
  matched:
    "SELECT COUNT(*) AS matched, COUNT(DISTINCT f.order_id) AS orders\nFROM fact_orders f\nJOIN dim_customer c\n  ON  c.customer_id = f.customer_id\n  AND f.order_date BETWEEN c.valid_from AND c.valid_to;",
  // Each version starts the day after the one before it ends: no overlap, no gap.
  seams:
    "SELECT COUNT(*) AS seams,\n  COUNT(*) FILTER (WHERE next_from <> valid_to + 1) AS bad_seams\nFROM (\n  SELECT valid_to, LEAD(valid_from) OVER (PARTITION BY customer_id ORDER BY valid_from) AS next_from\n  FROM dim_customer\n) s WHERE next_from IS NOT NULL;",
  current: PAGE_CURRENT,
  currentCount: "SELECT COUNT(*) AS current_rows, COUNT(DISTINCT customer_id) AS customers\nFROM dim_customer WHERE is_current;",
  versions: "SELECT COUNT(*) AS rows, COUNT(DISTINCT customer_id) AS customers,\n  COUNT(DISTINCT customer_id) FILTER (WHERE NOT is_current) AS customers_who_changed\nFROM dim_customer;",
  // The trap: the natural key alone, with no date and no is_current.
  natural:
    "SELECT COUNT(*) AS rows, SUM(f.amount) AS revenue\nFROM fact_orders f\nJOIN dim_customer c ON c.customer_id = f.customer_id;",
  truth: "SELECT COUNT(*) AS rows, SUM(amount) AS revenue FROM fact_orders;",
  // Revenue by region for 2022, as it was (Type 2)...
  t2Regions2022: REGIONS_2022(PIT),
  // ...and as a Type 1 dimension reports it: one row per customer, overwritten.
  t1Build: "CREATE TABLE dim_customer_t1 AS\nSELECT customer_id, customer_name, region\nFROM dim_customer\nWHERE is_current;",
  t1Rows42: "SELECT customer_id, customer_name, region\nFROM dim_customer_t1\nWHERE customer_id = 42;",
  t1Orders42:
    "SELECT f.order_id, f.order_date, c.region, f.amount\nFROM fact_orders f\nJOIN dim_customer_t1 c ON c.customer_id = f.customer_id\nWHERE f.customer_id = 42\nORDER BY f.order_id;",
  t1Regions2022: REGIONS_2022("JOIN dim_customer_t1 c ON c.customer_id = f.customer_id"),
  // Question 6: order 5001 arriving late, looked up two ways.
  lateCurrent:
    "SELECT customer_sk, region\nFROM dim_customer\nWHERE customer_id = 42\n  AND is_current;",
  latePit:
    "SELECT customer_sk, region\nFROM dim_customer\nWHERE customer_id = 42\n  AND DATE '2022-05-10' BETWEEN valid_from AND valid_to;",
});

// Question 1, "t1-mix": a Type 1 column inside the page's Type 2 table. The
// video's own typo, "Acme Crop" on both of customer 42's versions, fixed by
// one UPDATE on the natural key: both rows change, the region history stays.
F.t1mix = await figure(
  `${PAGE_SCD}
UPDATE dim_customer SET customer_name = 'Acme Crop' WHERE customer_id = 42;`,
  {
    before: "SELECT customer_sk, customer_name, region\nFROM dim_customer\nWHERE customer_id = 42\nORDER BY valid_from;",
    fix: "UPDATE dim_customer\nSET customer_name = 'Acme Corp'\nWHERE customer_id = 42;",
    after: "SELECT customer_sk, customer_name, region\nFROM dim_customer\nWHERE customer_id = 42\nORDER BY valid_from;",
  },
);

// Question 2: how a Type 2 change is applied. Customer 42 before the move
// (the page's table with the West version taken out and East open-ended and
// current again), then the two statements, run with the page's dates and
// the page's new key. The table that results is the page's, row for row.
F.type2 = await figure(
  `${PAGE_SCD}
CREATE TABLE page_dim AS SELECT * FROM dim_customer;
DELETE FROM dim_customer WHERE customer_sk = 1002;
UPDATE dim_customer SET valid_to = DATE '9999-12-31', is_current = TRUE WHERE customer_sk = 1001;`,
  {
    before: "SELECT customer_sk, region, valid_from, valid_to, is_current\nFROM dim_customer\nWHERE customer_id = 42;",
    close: "UPDATE dim_customer\nSET valid_to = DATE '2023-06-14',\n    is_current = FALSE\nWHERE customer_id = 42 AND is_current;",
    insert:
      "INSERT INTO dim_customer VALUES\n  (1002, 42, 'Acme Corp', 'West',\n   DATE '2023-06-15', DATE '9999-12-31', TRUE);",
    after:
      "SELECT customer_sk, region, valid_from, valid_to, is_current\nFROM dim_customer\nWHERE customer_id = 42\nORDER BY valid_from;",
    // Rows in one table and not the other, both ways round: 0.
    samePage:
      "SELECT COUNT(*) AS differ FROM (\n  (SELECT * FROM dim_customer EXCEPT ALL SELECT * FROM page_dim)\n  UNION ALL\n  (SELECT * FROM page_dim EXCEPT ALL SELECT * FROM dim_customer)\n) x;",
  },
);

// Question 2, the cost: the page's own chart (charts/scd2-row-growth.mjs),
// computed from the chart's stated model, not measured on any warehouse:
// 50,000 customers, 4% of them changing a tracked attribute each month.
F.growth = await figure("SELECT 1;", {
  model: `SELECT 50000 AS customers, 0.04 AS monthly_change, 36 AS months,
  ROUND(50000 * (1 + 0.04 * 36)) AS type2_rows,
  ROUND((1 + 0.04 * 36)::numeric, 2) AS times`,
});

// Question 3: Type 3 on customer 42 (the video's own table, with the page's
// region and prev_region): the move to the West, then a second move, to the
// North (the video's own).
F.type3 = await figure(
  "CREATE TABLE dim_customer_t3 (customer_id INTEGER, customer_name VARCHAR, region VARCHAR, prev_region VARCHAR);\nINSERT INTO dim_customer_t3 VALUES (42, 'Acme Corp', 'East', NULL);",
  {
    before: "SELECT customer_id, region, prev_region FROM dim_customer_t3;",
    move: "UPDATE dim_customer_t3\nSET prev_region = region, region = 'West'\nWHERE customer_id = 42;",
    after: "SELECT customer_id, region, prev_region FROM dim_customer_t3;",
    again: "UPDATE dim_customer_t3\nSET prev_region = region, region = 'North'\nWHERE customer_id = 42;",
    twice: "SELECT customer_id, region, prev_region FROM dim_customer_t3;",
  },
);

// ── Question 5. A late-arriving dimension record ────────────────────────────
// de-modeling-history's three staged orders (customer 77 is not in the
// dimension yet), against this page's rows for customers 42 and 99. The
// page's answer: an unknown member, then a correction job that re-keys the
// fact once the customer lands; never drop the fact. Customer 77's key, 1025,
// is the next after the page's 1024; its region is the video's own.
F.late = await figure(
  `CREATE TABLE dim_customer (customer_sk INTEGER, customer_id INTEGER, customer_name VARCHAR, region VARCHAR);
INSERT INTO dim_customer VALUES
  (-1,   NULL, 'Unknown',   'Unknown'),
  (1002, 42,   'Acme Corp', 'West'),
  (1003, 99,   'Globex',    'North');
CREATE TABLE staged_orders (order_id INTEGER, customer_id INTEGER, amount DECIMAL(10,2));
INSERT INTO staged_orders VALUES
  (201, 42, 200.00), (202, 99, 500.00), (203, 77, 410.00);`,
  {
    staged: "SELECT order_id, customer_id, amount FROM staged_orders ORDER BY order_id;",
    // The dimension the load looks keys up in: the unknown member, 42 and 99.
    dim: "SELECT customer_sk, customer_id, region FROM dim_customer ORDER BY customer_sk;",
    // The trap: the key lookup as an inner join.
    load: "SELECT o.order_id, d.customer_sk, o.amount\nFROM staged_orders o\nJOIN dim_customer d\n  ON d.customer_id = o.customer_id\nORDER BY o.order_id;",
    loadSum:
      "SELECT SUM(o.amount) AS loaded,\n  (SELECT SUM(amount) FROM staged_orders) AS staged\nFROM staged_orders o\nJOIN dim_customer d ON d.customer_id = o.customer_id;",
    // The fix: every fact loads; a missing customer gets the unknown member,
    // and the fact keeps the customer's own ID for the correction.
    loadUnknown:
      "CREATE TABLE fact_orders AS\nSELECT o.order_id, o.customer_id,\n       COALESCE(d.customer_sk, -1) AS customer_sk,\n       o.amount\nFROM staged_orders o\nLEFT JOIN dim_customer d\n  ON d.customer_id = o.customer_id;",
    facts: "SELECT order_id, customer_id, customer_sk, amount FROM fact_orders ORDER BY order_id;",
    factsSum: "SELECT SUM(amount) AS loaded FROM fact_orders;",
    reportBefore:
      "SELECT d.region, SUM(f.amount) AS revenue\nFROM fact_orders f\nJOIN dim_customer d USING (customer_sk)\nGROUP BY d.region\nORDER BY d.region;",
    // Customer 77 lands.
    arrive: "INSERT INTO dim_customer VALUES (1025, 77, 'Bluth Co', 'South');",
    dimAfter: "SELECT customer_sk, customer_id, region FROM dim_customer ORDER BY customer_sk;",
    // The correction job: re-key the facts still on the unknown member.
    correct:
      "UPDATE fact_orders f\nSET customer_sk = d.customer_sk\nFROM dim_customer d\nWHERE f.customer_sk = -1\n  AND d.customer_id = f.customer_id;",
    factsAfter: "SELECT order_id, customer_id, customer_sk, amount FROM fact_orders ORDER BY order_id;",
    reportAfter:
      "SELECT d.region, SUM(f.amount) AS revenue\nFROM fact_orders f\nJOIN dim_customer d USING (customer_sk)\nGROUP BY d.region\nORDER BY d.region;",
    stillUnknown: "SELECT COUNT(*) AS on_unknown FROM fact_orders WHERE customer_sk = -1;",
  },
);

// ── Question 7. A slowly changing measure (the video's own order) ───────────
// Order 7001 was posted at 900.00 on 2024-03-01; on 2024-04-02 it turns
// out to have been 800.00. A ledger of postings keeps the correction as two
// new rows; a copy of the same fact is corrected in place, for contrast.
F.measure = await figure(
  `CREATE TABLE fact_sales (order_id INTEGER, amount DECIMAL(10,2), posted_on DATE, entry VARCHAR);
INSERT INTO fact_sales VALUES (7001, 900.00, DATE '2024-03-01', 'original');
CREATE TABLE fact_sales_overwritten AS SELECT * FROM fact_sales;`,
  {
    before: "SELECT order_id, amount, posted_on, entry FROM fact_sales;",
    marchReport: "SELECT SUM(amount) AS march_revenue\nFROM fact_sales\nWHERE posted_on <= DATE '2024-03-31';",
    reverse:
      "INSERT INTO fact_sales VALUES\n  (7001, -900.00, DATE '2024-04-02', 'reversal'),\n  (7001,  800.00, DATE '2024-04-02', 'correction');",
    rows: "SELECT order_id, amount, posted_on, entry FROM fact_sales ORDER BY posted_on, amount;",
    today: "SELECT SUM(amount) AS revenue FROM fact_sales WHERE order_id = 7001;",
    // March's report, rerun after the correction: the published number.
    marchRerun: "SELECT SUM(amount) AS march_revenue\nFROM fact_sales\nWHERE posted_on <= DATE '2024-03-31';",
    // The same correction made in place, and March's report rerun on it.
    overwrite: "UPDATE fact_sales_overwritten\nSET amount = 800.00\nWHERE order_id = 7001;",
    marchOverwritten: "SELECT SUM(amount) AS march_revenue\nFROM fact_sales_overwritten\nWHERE posted_on <= DATE '2024-03-31';",
  },
);

// ── Question 9. A mini-dimension (de-modeling-history's count) ──────────────
F.mini = await figure("SELECT 1;", {
  mini:
    "SELECT COUNT(*) AS mini_rows\nFROM (VALUES ('18-24'), ('25-34'), ('35-49'), ('50-64'), ('65+')) a(age_band),\n     (VALUES ('low'), ('middle'), ('high'), ('top')) i(income_tier);",
});

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
const de = JSON.parse(readFileSync(new URL("../de-modeling-history/results.json", import.meta.url), "utf8")).figures;
expect("staged orders against de-modeling-history", F.late.steps.staged.rows, de.late.steps.staged.rows);
expect("inner-join load against de-modeling-history", F.late.steps.loadSum.rows, de.late.steps.loadSum.rows);
expect("mini-dimension against de-modeling-history", F.mini.steps.mini.rows, de.rapid.steps.mini.rows);

const byRegion = (rows) => Object.fromEntries(rows.map((r) => [r[0], r[1]]));
const t2 = byRegion(one("scd", "t2Regions2022"));
const t1 = byRegion(one("scd", "t1Regions2022"));

// What the narration says, by beat (script.ts).
expect("hook: Acme's 2022 order", one("scd", "orders42")[0], ["5001", "2022-05-10", "1200.00"]);
expect("t1: one row, West", one("scd", "t1Rows42"), [["42", "Acme Corp", "West"]]);
expect("t1-history: both orders West", one("scd", "t1Orders42").map((r) => r[2]), ["West", "West"]);
expect("t1-history: East's 2022 revenue drops by 1,200", (Number(t2.East) - Number(t1.East)).toFixed(2), "1200.00");
expect("t2-rows: East closes 2023-06-14, West opens 2023-06-15", one("scd", "rows42").map((r) => [r[0], r[1], r[2], r[3], r[4]]), [
  ["1001", "East", "2020-01-01", "2023-06-14", "false"],
  ["1002", "West", "2023-06-15", "9999-12-31", "true"],
]);
expect("t2-join: 5001 East, 5002 West", one("scd", "page").filter((r) => r[0] === "5001" || r[0] === "5002").map((r) => r[1]), ["East", "West"]);
expect("t2-join: all 24 match exactly one", one("scd", "matched"), [["24", "24"]]);
expect("t2-join: no overlap, no gap", one("scd", "seams")[0][1], "0");
expect("t2-load: the two statements rebuild the page's table", one("type2", "samePage"), [["0"]]);
expect("t2-load: one row each", [one("type2", "close"), one("type2", "insert")], [[["1"]], [["1"]]]);
expect("t2-current: 15 rows, one per customer", one("scd", "currentCount"), [["15", "15"]]);
const nat = one("scd", "natural")[0];
const truth = one("scd", "truth")[0];
expect("t2-trap: the truth", truth, ["24", "17930.00"]);
expect("t2-trap: the natural-key join", nat, ["44", "31580.00"]);
expect("t1-history: every region's 2022 total changes", ["East", "North", "South", "West"].filter((r) => t1[r] !== t2[r]).length, 4);
expect("t2-cost: the page's chart", one("growth", "model")[0].slice(3), ["122000", "2.44"]);
expect("late-drop: 700 of 1,110", one("late", "loadSum"), [["700.00", "1110.00"]]);
expect("late-fix: all 1,110 load", one("late", "factsSum"), [["1110.00"]]);
expect("late-correct: one row re-keyed, none left", [one("late", "correct"), one("late", "stillUnknown")], [[["1"]], [["0"]]]);
expect("late-fact: current lookup", one("scd", "lateCurrent"), [["1002", "West"]]);
expect("late-fact: point-in-time lookup", one("scd", "latePit"), [["1001", "East"]]);
expect("measure: March said 900", one("measure", "marchReport"), [["900.00"]]);
expect("measure-reverse: today 800", one("measure", "today"), [["800.00"]]);
expect("measure-why: March rerun still 900", one("measure", "marchRerun"), [["900.00"]]);
expect("measure-why: overwritten, March says 800", one("measure", "marchOverwritten"), [["800.00"]]);
expect("r-t3: West, previous East", one("type3", "after"), [["42", "West", "East"]]);
expect("r-t3: after a second move, East is gone", one("type3", "twice"), [["42", "North", "West"]]);
expect("t1-mix: the name fixed on both versions", [one("t1mix", "fix"), one("t1mix", "after").map((r) => [r[1], r[2]])], [[["2"]], [["Acme Corp", "East"], ["Acme Corp", "West"]]]);
expect("r-mini: twenty rows", one("mini", "mini"), [["20"]]);

const out = {
  natural: nat,
  truth,
  t2Regions2022: t2,
  t1Regions2022: t1,
  versions: one("scd", "versions"),
  growth: one("growth", "model"),
  lateFacts: one("late", "facts"),
  lateAfter: [one("late", "factsAfter"), one("late", "reportAfter")],
  measureRows: one("measure", "rows"),
};
for (const [k, v] of Object.entries(out)) console.log(`${k}: ${JSON.stringify(v)}`);

writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify(results, null, 2) + "\n");
console.log(`wrote results.json (${F.scd.version}): ${Object.keys(F).join(", ")}`);
