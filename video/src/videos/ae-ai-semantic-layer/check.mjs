// Runs every statement the ae-ai-semantic-layer video shows on the site's
// Postgres engine (PGlite, PostgreSQL 18, through
// video/scripts/lib/pg-figure.mjs over the package scripts/lib/sql-engines.mjs
// loads), the engine the AI & the semantic layer page's block runs in the
// reader's browser, and writes what came back to results.json, which data.ts
// reads. From the repo root:
//
//   node video/src/videos/ae-ai-semantic-layer/check.mjs
//
// What runs, and where each number comes from:
//
// - Question 1: the page's block, read out of the page
//   (content/interview/analytics-engineer/ai-and-the-semantic-layer.mdx)
//   and run as written: its two tables, and its query's three readings of
//   "revenue".
// - Question 2: the governed definition as SQL a semantic layer would
//   compile it to, written by the video (no semantic layer runs here), on
//   the page's tables.
// - Question 3: the page's YAML, read out of the page. Its three tests run
//   as the SQL dbt's generic tests compile to (the shape of dbt's unique,
//   not_null and accepted_values macros), on fct_orders, built from the
//   page's orders. Its description encoded twice: as written, and without
//   its last three words.
// - Question 4: three answers to "what was net revenue?", the video's own
//   SQL on the page's tables, each run, then scored three ways.
// - Question 5: the video's own seven orders, loaded incrementally by the
//   model an assistant wrote and by the reviewed one, each compiled as dbt
//   compiles it with is_incremental() true, and applied the way dbt
//   applies a batch: appended with no unique_key, merged (or deleted and
//   re-inserted) with one. Each apply runs in a fresh database.
// - The close: the track's practice, counted in content/.
//
// Then it fails (exit 1) if the page stops saying what the narration quotes
// from it, or a beat stops saying, in words, a number computed here.
/* global console, process, URL */
import { readFileSync, writeFileSync } from "node:fs";

import { figure } from "../../../scripts/lib/pg-figure.mjs";

const dir = new URL("../../../../content/interview/analytics-engineer/", import.meta.url);
const read = (file) => readFileSync(new URL(file, dir), "utf8");
const PAGE = "ai-and-the-semantic-layer.mdx";
const page = read(PAGE);
const problems = [];

/** The one match of `re` in the page, or a stop. */
const only = (re, what) => {
  const all = [...page.matchAll(re)];
  if (all.length !== 1) throw new Error(`expected the page's one ${what}, found ${all.length}`);
  return all[0][1];
};

// ── The page's block and YAML, out of the page ──────────────────────────────
const INIT = only(/initSql=\{`([\s\S]*?)`\}/g, "initSql");
const QUERY = only(/starterCode=\{`([\s\S]*?)`\}/g, "starterCode");
const YAML = only(/```yaml\n([\s\S]*?)```/g, "YAML block").trimEnd();

/** One step's rows, or a stop if it failed. */
const rowsOf = (fig, id) => {
  const s = fig.steps[id];
  if (!s?.ok) throw new Error(`${id} failed: ${s?.error ?? "no such step"}`);
  return s.rows;
};
const num = (v) => Number(v);

// ── 1. Three readings of "revenue" ──────────────────────────────────────────
const t2s = await figure(INIT, {
  customers: "SELECT customer_id, is_test\nFROM customers\nORDER BY customer_id;",
  orders: "SELECT order_id, customer_id, amount, status\nFROM orders\nORDER BY order_id;",
  query: QUERY,
  counts:
    "SELECT (SELECT COUNT(*) FROM orders) AS orders,\n  (SELECT COUNT(*) FROM customers) AS customers,\n  (SELECT COUNT(*) FROM customers WHERE is_test) AS test_accounts;",
});
const [every, completed, governed] = rowsOf(t2s, "query")[0].map(num);
const [nOrders, nCustomers, nTest] = rowsOf(t2s, "counts")[0].map(num);

// ── 2. The governed metric, as a layer would compile it ─────────────────────
/** The video's own SQL for net_revenue: the page's governed reading, written
 *  as a WHERE rather than a FILTER. Not any product's output. */
const COMPILED = `SELECT SUM(o.amount) AS net_revenue
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
WHERE o.status = 'completed'
  AND NOT c.is_test;`;
const sem = await figure(INIT, { compiled: COMPILED });
const compiledNet = num(rowsOf(sem, "compiled")[0][0]);

// ── 3. The YAML's tests, and its description as an input ────────────────────
const acceptedLine = YAML.match(/values:\s*\[([^\]]+)\]/);
if (!acceptedLine) throw new Error("the YAML has no accepted_values list");
const ACCEPTED = acceptedLine[1].split(",").map((v) => v.trim());
const inList = ACCEPTED.map((v) => `'${v}'`).join(", ");
const DESCRIPTION = "which excludes refunded and cancelled orders and test accounts.";
const CUT = "and test accounts";
const TESTS = {
  unique:
    "SELECT order_id AS unique_field, COUNT(*) AS n_records\nFROM fct_orders\nWHERE order_id IS NOT NULL\nGROUP BY order_id\nHAVING COUNT(*) > 1;",
  not_null: "SELECT order_id\nFROM fct_orders\nWHERE order_id IS NULL;",
  accepted_values: `WITH all_values AS (\n  SELECT status AS value_field, COUNT(*) AS n_records\n  FROM fct_orders\n  GROUP BY status\n)\nSELECT * FROM all_values\nWHERE value_field NOT IN (${inList});`,
};
const ready = await figure(`${INIT}\nCREATE TABLE fct_orders AS SELECT * FROM orders;`, {
  statuses: "SELECT DISTINCT status FROM fct_orders ORDER BY status;",
  ...TESTS,
  // "excludes refunded and cancelled orders and test accounts", encoded.
  asWritten: `SELECT SUM(o.amount) AS net_revenue\nFROM fct_orders o\nJOIN customers c USING (customer_id)\nWHERE o.status NOT IN ('refunded', 'cancelled')\n  AND NOT c.is_test;`,
  // The same, without its last three words.
  cut: "SELECT SUM(amount) AS net_revenue\nFROM fct_orders\nWHERE status NOT IN ('refunded', 'cancelled');",
});
const failing = Object.fromEntries(Object.keys(TESTS).map((t) => [t, rowsOf(ready, t).length]));
const statuses = rowsOf(ready, "statuses").map((r) => r[0]);
const describedAsWritten = num(rowsOf(ready, "asWritten")[0][0]);
const describedCut = num(rowsOf(ready, "cut")[0][0]);

// ── 4. Three answers, scored three ways ─────────────────────────────────────
const CANDIDATES = [
  { id: "A", label: "The reference", sql: COMPILED },
  {
    id: "B",
    label: "A different join and aliases",
    sql: "SELECT SUM(ord.amount) AS revenue\nFROM customers cust\nJOIN orders ord\n  ON ord.customer_id = cust.customer_id\n AND ord.status = 'completed'\nWHERE cust.is_test = FALSE;",
  },
  { id: "C", label: "Completed orders only", sql: "SELECT SUM(amount) AS net_revenue\nFROM orders\nWHERE status = 'completed';" },
];
const evalFig = await figure(INIT, Object.fromEntries(CANDIDATES.map((c) => [c.id, c.sql])));
const norm = (sql) => sql.replace(/\s+/g, " ").trim().toLowerCase();
const ref = CANDIDATES[0];
const scored = CANDIDATES.map((c) => {
  const s = evalFig.steps[c.id];
  return {
    id: c.id,
    label: c.label,
    sql: c.sql,
    result: s.ok ? s.rows : null,
    sameText: norm(c.sql) === norm(ref.sql),
    runs: s.ok,
    sameResult: s.ok && JSON.stringify(s.rows) === JSON.stringify(evalFig.steps[ref.id].rows),
  };
});

// ── 5. The model an assistant wrote, and the reviewed one ───────────────────
/** As the assistant wrote it: a hard-coded schema, no unique_key, and a
 *  filter on the newest date loaded. */
const MODEL_AS_WRITTEN = `{{ config(materialized='incremental') }}

select order_id, order_date, amount
from analytics.raw_orders
{% if is_incremental() %}
where order_date > (select max(order_date) from {{ this }})
{% endif %}`;
/** As reviewed: source(), a unique_key, and a three-day lookback. */
const LOOKBACK_DAYS = 3;
const MODEL_REVIEWED = `{{ config(materialized='incremental', unique_key='order_id') }}

select order_id, order_date, amount
from {{ source('shop', 'orders') }}
{% if is_incremental() %}
where order_date > (select max(order_date) - interval '${LOOKBACK_DAYS} days' from {{ this }})
{% endif %}`;
/** The model's select as dbt compiles it on an incremental run: the config
 *  line gone, is_incremental() true, {{ this }} the built table, and the
 *  source the schema it is configured to (here the same table the assistant
 *  hard-coded, as it would be in production). */
const compile = (model) =>
  model
    .replace(/^\{\{ config\([^)]*\) \}\}\n\n/, "")
    .replace(/\{% if is_incremental\(\) %\}\n|\{% endif %\}/g, "")
    .replace("{{ source('shop', 'orders') }}", "analytics.raw_orders")
    .replace("{{ this }}", "fct_orders")
    .trimEnd();
/** Five orders built on the first run (October 30 to November 3), then two
 *  more land: order 6, dated November 4, and order 7, dated November 1,
 *  which arrives late. */
const RAW = `CREATE SCHEMA analytics;
CREATE TABLE analytics.raw_orders (order_id integer, order_date date, amount numeric(10,2));
INSERT INTO analytics.raw_orders VALUES
  (1, DATE '2026-10-30', 40.00), (2, DATE '2026-10-31', 25.00),
  (3, DATE '2026-11-01', 60.00), (4, DATE '2026-11-02', 35.00),
  (5, DATE '2026-11-03', 50.00);
CREATE TABLE fct_orders AS SELECT order_id, order_date, amount FROM analytics.raw_orders;
INSERT INTO analytics.raw_orders VALUES
  (6, DATE '2026-11-04', 45.00), (7, DATE '2026-11-01', 30.00);`;
const LATE_ID = 7;
const COUNTS = "SELECT COUNT(*) AS rows, COUNT(DISTINCT order_id) AS orders\nFROM fct_orders;";
const MISSING = "SELECT order_id FROM analytics.raw_orders\nEXCEPT\nSELECT order_id FROM fct_orders\nORDER BY order_id;";
const REPEATS = "SELECT order_id, COUNT(*) AS copies\nFROM fct_orders\nGROUP BY order_id\nHAVING COUNT(*) > 1\nORDER BY order_id;";
const batchOf = (model) => `CREATE TEMP TABLE batch AS\n${compile(model)};`;
const loads = {
  // The assistant's filter, appended.
  strict: await figure(RAW, {
    before: "SELECT MAX(order_date) AS newest, COUNT(*) AS rows FROM fct_orders;",
    late: `SELECT order_date FROM analytics.raw_orders WHERE order_id = ${LATE_ID};`,
    batch: batchOf(MODEL_AS_WRITTEN),
    selected: "SELECT order_id FROM batch ORDER BY order_id;",
    apply: "INSERT INTO fct_orders SELECT * FROM batch;",
    counts: COUNTS,
    missing: MISSING,
  }),
  // The lookback with no unique_key: dbt appends.
  append: await figure(RAW, {
    batch: batchOf(MODEL_REVIEWED),
    selected: "SELECT order_id FROM batch ORDER BY order_id;",
    reread: "SELECT COUNT(*) AS already_loaded\nFROM batch\nWHERE order_id IN (SELECT order_id FROM fct_orders);",
    apply: "INSERT INTO fct_orders SELECT * FROM batch;",
    counts: COUNTS,
    repeats: REPEATS,
    missing: MISSING,
  }),
  // The lookback with unique_key = order_id, applied with MERGE.
  merge: await figure(RAW, {
    batch: batchOf(MODEL_REVIEWED),
    apply:
      "MERGE INTO fct_orders t\nUSING batch s ON t.order_id = s.order_id\nWHEN MATCHED THEN UPDATE SET order_date = s.order_date, amount = s.amount\nWHEN NOT MATCHED THEN INSERT VALUES (s.order_id, s.order_date, s.amount);",
    counts: COUNTS,
    repeats: REPEATS,
    missing: MISSING,
  }),
  // The same, applied as delete then insert.
  deleteInsert: await figure(RAW, {
    batch: batchOf(MODEL_REVIEWED),
    delete: "DELETE FROM fct_orders WHERE order_id IN (SELECT order_id FROM batch);",
    apply: "INSERT INTO fct_orders SELECT * FROM batch;",
    counts: COUNTS,
    missing: MISSING,
  }),
};
const [newest, firstBuilt] = rowsOf(loads.strict, "before")[0];
const lateDate = rowsOf(loads.strict, "late")[0][0];
const daysLate = (Date.parse(newest) - Date.parse(lateDate)) / 86_400_000;
const countsOf = (k) => rowsOf(loads[k], "counts")[0].map(num);
const allOrders = firstBuilt + 2;

// ── The close: the track's practice ─────────────────────────────────────────
const count = (text, re) => (text.match(re) ?? []).length;
const tag = (name) => new RegExp(`<${name}\\b`, "g");
const topics = JSON.parse(read("meta.json")).pages.filter((p) => !["index", "multiple-choice-questions"].includes(p));
const practice = {
  topicPages: topics.length,
  conceptCheckPages: topics.filter((p) => count(read(`${p}.mdx`), tag("MultipleChoice")) > 0).length,
  challengePages: topics.filter((p) => count(read(`${p}.mdx`), tag("ChallengeCard")) + count(read(`${p}.mdx`), tag("SqlChallengeCard")) > 0).length,
  bank: count(read("multiple-choice-questions.mdx"), tag("MultipleChoice")),
};

// ── results.json ────────────────────────────────────────────────────────────
const results = {
  version: t2s.version,
  readings: {
    initSql: INIT,
    query: QUERY,
    customers: { columns: t2s.steps.customers.columns, rows: rowsOf(t2s, "customers") },
    orders: { columns: t2s.steps.orders.columns, rows: rowsOf(t2s, "orders") },
    result: { columns: t2s.steps.query.columns, rows: rowsOf(t2s, "query") },
    every,
    completed,
    governed,
    ratio: Math.round((every / governed) * 10) / 10,
    orderCount: nOrders,
    customerCount: nCustomers,
    testAccounts: nTest,
  },
  compiled: { sql: COMPILED, netRevenue: compiledNet },
  ready: {
    yaml: YAML,
    accepted: ACCEPTED,
    statuses,
    tests: Object.fromEntries(Object.entries(TESTS).map(([t, sql]) => [t, { sql, failing: failing[t] }])),
    description: DESCRIPTION,
    cut: CUT,
    asWritten: { sql: ready.steps.asWritten.sql, netRevenue: describedAsWritten },
    withoutCut: { sql: ready.steps.cut.sql, netRevenue: describedCut },
  },
  eval: { question: "What was net revenue?", candidates: scored },
  review: {
    asWritten: MODEL_AS_WRITTEN,
    reviewed: MODEL_REVIEWED,
    compiledAsWritten: compile(MODEL_AS_WRITTEN),
    compiledReviewed: compile(MODEL_REVIEWED),
    lookbackDays: LOOKBACK_DAYS,
    raw: RAW,
    firstBuilt,
    newestLoaded: newest,
    lateId: LATE_ID,
    lateDate,
    daysLate,
    allOrders,
    strict: { selected: rowsOf(loads.strict, "selected").map((r) => r[0]), rows: countsOf("strict")[0], missing: rowsOf(loads.strict, "missing").map((r) => r[0]) },
    append: {
      selected: rowsOf(loads.append, "selected").map((r) => r[0]),
      reread: num(rowsOf(loads.append, "reread")[0][0]),
      rows: countsOf("append")[0],
      orders: countsOf("append")[1],
      repeats: rowsOf(loads.append, "repeats").map((r) => r[0]),
    },
    merge: { rows: countsOf("merge")[0], orders: countsOf("merge")[1], sql: loads.merge.steps.apply.sql },
    deleteInsert: { rows: countsOf("deleteInsert")[0], orders: countsOf("deleteInsert")[1] },
  },
  practice,
};
writeFileSync(new URL("./results.json", import.meta.url), `${JSON.stringify(results, null, 2)}\n`);
console.log(
  JSON.stringify({
    version: results.version,
    readings: [every, completed, governed, results.readings.ratio],
    compiled: compiledNet,
    tests: failing,
    statuses,
    described: [describedAsWritten, describedCut],
    eval: scored.map((c) => [c.id, c.result?.[0]?.[0], c.sameText, c.runs, c.sameResult]),
    review: { newest, lateDate, daysLate, strict: results.review.strict, append: results.review.append, merge: results.review.merge, deleteInsert: results.review.deleteInsert },
    practice,
  }),
);

// ── What the numbers have to be, for the story to hold ──────────────────────
const expect = (ok, what) => {
  if (!ok) problems.push(what);
};
expect(every / governed > 3, `the readings are not more than three times apart (${every} / ${governed})`);
expect(compiledNet === governed, "the compiled metric is not the page's governed reading");
expect(describedAsWritten === governed, "the description as written does not encode the governed reading");
expect(describedCut === completed, "the cut description does not give the completed reading");
expect(Object.values(failing).every((n) => n === 0), "a test on fct_orders fails");
expect(statuses.join() === [...ACCEPTED].sort().join(), "the statuses are not exactly the accepted values");
expect(scored.map((c) => [c.sameText, c.runs, c.sameResult].join()).join("|") === "true,true,true|false,true,true|false,true,false", "the eval grid changed");
expect(results.review.strict.missing.join() === String(LATE_ID), "the strict filter does not miss exactly the late order");
expect(results.review.append.orders === allOrders && results.review.merge.rows === allOrders && results.review.deleteInsert.rows === allOrders, "the loads do not hold every order");
expect(results.review.append.rows === allOrders + results.review.append.reread, "the append's extra rows are not the re-read ones");

// ── What the narration quotes, still on the page ────────────────────────────
const quotes = [
  "### Why does text-to-SQL over raw tables give confident wrong answers?",
  "### What does a semantic layer change for an AI assistant?",
  '### What makes a dbt project "AI-ready"?',
  "### How do you evaluate a natural-language analytics assistant?",
  "### How do AI assistants connect to the warehouse and to governed metrics?",
  "### How do you review a dbt model an assistant wrote?",
  // hook
  "the new part is that a model\nreads them, takes them literally, and answers thousands of questions nobody\nreviews.",
  // 1
  "the hard part of most business questions is not SQL syntax; it is\nknowing the definitions the SQL has to encode.",
  "gross or net of\nrefunds? Cancelled orders? Test accounts? Which of three similarly named\ntables? Which join path, and does it fan out?",
  "The three answers differ by a factor of more than three",
  "not an error, but a fluent, plausible, wrong\nnumber.",
  // 2
  "It moves the definitions out of the guess and into code.",
  "**choosing a metric, dimensions, filters, and a time grain**",
  "the finance report all\n  compute \"net revenue\" the same way.",
  '("no metric matches"), not an invented query. A refusal is far cheaper than a\n  wrong number in a board deck.',
  "fall back to text-to-SQL, clearly labeled, for exploratory ones.",
  "Say the metric is not defined, and offer the closest governed metrics or a labeled exploratory query.",
  "which is metric drift by design.",
  // 3
  "with less tolerance for\ngaps, because a model will not ask",
  "public marts only",
  "so an answer can say \"as of\" and the\n  assistant can refuse to answer from stale data.",
  "documentation becomes an input, so a wrong description now\nproduces wrong answers",
  "review them like code.",
  "Access boundaries remove the option entirely, which beats hoping the model chooses well.",
  // 4
  "compare **result sets** (execution accuracy),\n   not query strings.",
  "Measure the refusal rate on those as carefully as\n   accuracy on the rest.",
  "an average hides the\n   category that fails every time.",
  "the\n   semantic layer, the prompt, or the underlying LLM.",
  "Many different queries are correct; string comparison would mark right answers wrong.",
  "The dangerous failures run fine and return the wrong number.",
  // 5
  "The checklist you would use for a junior colleague",
  "which break across environments and hide lineage.",
  "handles late-arriving\n  rows (a lookback window), and a `unique_key` so reruns update rather than\n  duplicate.",
  "Assistants are good at producing a second, slightly\n  different definition of a number the business already has.",
  "tests that would fail\n  without the change.",
  // 6
  "Through the same interfaces BI tools use",
  "The Model Context Protocol (MCP) has become a common way to expose",
  "dbt Labs publishes an MCP server",
  "never a superuser service account.",
  "a model can\n  write an expensive cross join as easily as a cheap lookup.",
  "for audit and\n  for growing the eval set.",
];
for (const q of quotes) if (!page.includes(q)) problems.push(`${PAGE} no longer says: ${q}`);
if (!YAML.includes(`One row per order. For revenue, use the net_revenue metric,\n      ${DESCRIPTION}`)) problems.push("the YAML's description changed");
if (!DESCRIPTION.endsWith(`${CUT}.`)) problems.push("the cut is not the description's last words");

// ── The numbers the narration says in words ─────────────────────────────────
const { script } = await import(new URL("./script.ts", import.meta.url).href);
const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const below100 = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ""));
const said = (n) => (n < 100 ? below100(n) : `a hundred${n % 100 ? ` and ${below100(n % 100)}` : ""}`);
/** Money as it is said: 1450 "fourteen hundred fifty", 440 "four hundred
 *  forty". Whole amounts only. */
const money = (n) => {
  if (!Number.isInteger(n) || n < 100 || n >= 10000) throw new Error(`no words for ${n}`);
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return `${below100(hundreds)} hundred${rest ? ` ${below100(rest)}` : ""}`;
};
const text = (id) => {
  const b = script.beats.find((x) => x.id === id);
  if (!b) throw new Error(`script.ts has no beat "${id}"`);
  return b.text.toLowerCase();
};
const r = results.review;
const claims = [
  ["t2s-rows", `${below100(nOrders)} orders from ${below100(nCustomers)} customers`],
  ["t2s-rows", nTest === 1 ? "one customer is a test account" : "(not one test account)"],
  ["t2s-run", `${money(every)} dollars`],
  ["t2s-run", money(completed)],
  ["t2s-run", money(governed)],
  ["t2s-valid", `more than ${below100(Math.floor(every / governed))} times the smallest`],
  ["sem-same", money(compiledNet)],
  ["ready-tests", statuses.length === 3 ? "completed, refunded and cancelled" : "(the statuses changed)"],
  ["ready-input", CUT],
  ["ready-input", money(describedCut)],
  ["eval-run", `three answers`],
  ["eval-run", `also returns ${money(scored[1].result[0][0] * 1)}`],
  ["eval-run", money(Number(scored[2].result[0][0]))],
  ["review-pair", `${below100(daysLate)} days before the newest row loaded`],
  ["review-pair", `${below100(r.lookbackDays)}-day lookback`],
  ["review-pair", `reads ${below100(r.append.reread)} orders it already loaded`],
  ["review-pair", `${below100(r.append.rows)} rows for ${below100(r.append.orders)} orders`],
  ["review-pair", `with the key, ${below100(r.merge.rows)}`],
  ["review-dup", `${money(completed)}, next to the governed ${money(governed)}`],
  ["close-practice", practice.conceptCheckPages === practice.topicPages ? "every topic page has concept checks" : "(not every page has concept checks)"],
  ["close-practice", `${below100(practice.challengePages)} have challenges`],
  ["close-practice", `${said(practice.bank)} multiple-choice questions`],
  ["close-practice", "that closes the series"],
];
for (const [id, phrase] of claims) if (!text(id).includes(phrase)) problems.push(`script.ts "${id}" no longer says "${phrase}"`);
// The series ends here: no beat points at a next part.
if (script.beats.some((b) => /\bnext:/i.test(b.text))) problems.push("the last part of the series has a Next: line");

for (const p of problems) console.error(p);
if (problems.length) process.exit(1);
console.error(`ok: ${results.version}; readings ${every} / ${completed} / ${governed}; loads ${r.strict.rows}, ${r.append.rows}, ${r.merge.rows}`);
