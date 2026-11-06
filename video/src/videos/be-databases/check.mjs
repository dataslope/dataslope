// Runs every statement the be-databases video shows on the site's Postgres
// engine (PGlite 0.5.8, PostgreSQL 18, through scripts/lib/sql-engines.mjs,
// the engine the Postgres lessons grade with) and writes what came back to
// results.json, which data.ts reads. From the repo root:
//
//   node video/src/videos/be-databases/check.mjs
//
// Two figures need a PGlite started with options sql-engines.mjs does not
// pass, so they open the same package directly (same version, same engine):
//   - "index" loads PGlite's pageinspect extension, to read the B-tree's
//     height (bt_metap) rather than infer it from a page count;
//   - "isolation" and "locking" set max_prepared_transactions, so another
//     transaction can be parked with PREPARE TRANSACTION (two-phase commit):
//     uncommitted, still holding its row locks, while this session reads.
//     PGlite is one connection, so that is how a second, uncommitted
//     transaction exists here at all.
// What one connection cannot run, and the video draws instead: two sessions
// interleaving (a non-repeatable read, a phantom, a deadlock). A statement
// that would wait for a lock is never issued, because PGlite has no timer to
// end the wait (lock_timeout never fires): it would hang. NOWAIT asks without
// waiting, which is what "locking" does.
//
// The tables are the video's own, built by generate_series from fixed
// expressions (no random draws), so every run returns the same plans, counts
// and sizes:
//   users      1,000,000 rows: an email each, is_active true on every other.
//   orders     1,000,000 rows: customer_id cycles 1..50,000 by a stride of
//              7919 (20 orders a customer, spread across the table),
//              created_at climbs through 2024, four statuses, an amount.
//   accounts   two accounts of 100 (transactions, isolation, locking).
//   customers, orders (the page's)   the page's own 24 and 24 rows, from its
//              join blocks, with order_items of the video's own (1 to 3 per
//              order) for the fan-out.
// Each figure runs in a fresh database. Plans are EXPLAIN (ANALYZE, TIMING
// OFF, SUMMARY OFF), with BUFFERS where a page count is read off them; data.ts
// trims each node's "cost=…" and "width=…". No timing is recorded:
// milliseconds in WebAssembly are not a server's.
/* global console, process, URL */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const lib = (p) => new URL(`../../../../${p}`, import.meta.url).href;
const { createEngine } = await import(lib("scripts/lib/sql-engines.mjs"));
const { PGlite } = await import(lib("node_modules/@electric-sql/pglite/dist/index.js"));
const { pageinspect } = await import(lib("node_modules/@electric-sql/pglite/dist/contrib/pageinspect.js"));

/** A value as psql prints it. */
const shown = (v) => (v === null || v === undefined ? null : v instanceof Date ? v.toISOString().replace("T", " ").replace(/\.000Z$/, "") : String(v));

/** sql-engines' engine interface over a PGlite opened with options. */
async function pgliteWith(options) {
  const db = await PGlite.create(options);
  return {
    async exec(sql) {
      const results = await db.exec(sql);
      return results.map((r) => ({
        columns: (r.fields ?? []).map((f) => f.name),
        values: (r.rows ?? []).map((row) => (r.fields ?? []).map((f) => row[f.name])),
        affected: r.affectedRows ?? 0,
      }));
    },
    destroy: () => db.close(),
  };
}

/** Runs `sql` one statement at a time (VACUUM refuses the implicit
 *  transaction of a multi-statement string), and keeps the last result that
 *  has columns, so "BEGIN; SELECT …; COMMIT" reports its SELECT. */
async function runAll(engine, sql) {
  let shownResult = null;
  for (const stmt of sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
    const results = await engine.exec(stmt);
    for (const r of results) if (r.columns?.length) shownResult = r;
  }
  return shownResult;
}

/** A figure: its setup, then each step in order, in one database, so a step
 *  can change what the next one sees (a BEGIN stays open across steps). */
async function pgFigure(setup, steps, open = () => createEngine("postgres")) {
  const engine = await open();
  await runAll(engine, setup);
  const out = {};
  for (const [id, sql] of Object.entries(steps)) {
    try {
      const r = await runAll(engine, sql);
      out[id] = r ? { sql, ok: true, columns: r.columns, rows: r.values.map((row) => row.map(shown)) } : { sql, ok: true, columns: [], rows: [] };
    } catch (e) {
      out[id] = { sql, ok: false, error: `ERROR: ${String(e.message).split("\n")[0]}` };
    }
  }
  const v = await runAll(engine, "SELECT version() AS v");
  await engine.destroy();
  return { setup, steps: out, version: String(v.values[0][0]).split(" (")[0] };
}

const EXPLAIN = "EXPLAIN (ANALYZE, TIMING OFF, BUFFERS OFF, SUMMARY OFF)";
const EXPLAIN_BUFFERS = "EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY OFF)";

/** ANALYZE samples rows at random; a statistics target of 10,000 samples up
 *  to 3,000,000 rows, more than any table here holds, so it reads every row
 *  and the estimates are the same on every run. */
const EXACT_STATS = "SET default_statistics_target = 10000";

const USERS = `${EXACT_STATS};
CREATE TABLE users AS
SELECT g AS id, 'user' || g || '@example.com' AS email, (g % 2 = 0) AS is_active
FROM generate_series(1, 1000000) g;
ALTER TABLE users ADD PRIMARY KEY (id);
VACUUM ANALYZE users`;

const ORDERS = `${EXACT_STATS};
CREATE TABLE orders AS
SELECT g AS id,
  (1 + (g::bigint * 7919) % 50000)::int AS customer_id,
  TIMESTAMP '2024-01-01' + (g - 1) * INTERVAL '31.62 seconds' AS created_at,
  (ARRAY['pending', 'paid', 'shipped', 'returned'])[1 + g % 4] AS status,
  round(5 + ((g * 37) % 9500) / 100.0, 2) AS amount
FROM generate_series(1, 1000000) g;
ALTER TABLE orders ADD PRIMARY KEY (id);
VACUUM ANALYZE orders`;

const BY_EMAIL = "SELECT * FROM users\nWHERE email = 'user42@example.com';";
const pages = (rel) => `SELECT pg_relation_size('${rel}') / current_setting('block_size')::int AS pages,\n  pg_size_pretty(pg_relation_size('${rel}')) AS size;`;

const results = { figures: {} };

// ── 2. An index: one email in a million, with and without a B-tree ─────────
results.figures.index = await pgFigure(
  `${USERS};\nCREATE EXTENSION pageinspect`,
  {
    rows: "SELECT COUNT(*) AS users FROM users;",
    table: pages("users"),
    seq: `${EXPLAIN_BUFFERS}\n${BY_EMAIL}`,
    create: "CREATE INDEX users_email_idx ON users (email);\nANALYZE users;",
    // The root's level counts from the leaves (0), so the tree has level + 1
    // levels: the pages a lookup reads on its way down.
    levels: "SELECT level + 1 AS levels FROM bt_metap('users_email_idx');",
    indexPages: pages("users_email_idx"),
    btree: `${EXPLAIN_BUFFERS}\n${BY_EMAIL}`,
    // A hash index on the same column, with the B-tree gone: equality uses
    // it; a range cannot, and the plan falls back to reading the table.
    hash: "CREATE INDEX users_email_hash ON users USING hash (email);\nDROP INDEX users_email_idx;\nANALYZE users;",
    hashEq: `${EXPLAIN}\n${BY_EMAIL}`,
    hashRange: `${EXPLAIN}\nSELECT * FROM users\nWHERE email BETWEEN 'user42@' AND 'user43@';`,
  },
  () => pgliteWith({ extensions: { pageinspect } }),
);

// ── 3. When an index hurts: half the rows match, and every write pays ──────
const INSERT_10K = (t) =>
  `EXPLAIN (ANALYZE, WAL, COSTS OFF, TIMING OFF, BUFFERS OFF, SUMMARY OFF)\nINSERT INTO ${t}\nSELECT g, 'new' || g || '@example.com', true, now()\nFROM generate_series(1, 10000) g;`;
results.figures.hurt = await pgFigure(USERS, {
  create: "CREATE INDEX users_active_idx ON users (is_active);\nANALYZE users;",
  active: "SELECT COUNT(*) AS active FROM users WHERE is_active;",
  activePlan: `${EXPLAIN}\nSELECT * FROM users\nWHERE is_active;`,
  emailIndex: "CREATE INDEX users_email_idx ON users (email);",
  sizes:
    "SELECT relname AS relation, pg_size_pretty(pg_relation_size(oid)) AS size, pg_relation_size(oid) AS bytes\nFROM pg_class\nWHERE relname IN ('users', 'users_pkey', 'users_email_idx', 'users_active_idx')\nORDER BY bytes DESC;",
  writeTables:
    "CREATE TABLE no_index (id int, email text, is_active boolean, created_at timestamptz);\nCREATE TABLE three_indexes (id int, email text, is_active boolean, created_at timestamptz);\nCREATE INDEX ON three_indexes (id);\nCREATE INDEX ON three_indexes (email);\nCREATE INDEX ON three_indexes (created_at);",
  walNone: INSERT_10K("no_index"),
  walThree: INSERT_10K("three_indexes"),
});

// ── 4. A composite index: order matters, and Postgres 18 can skip ──────────
const LATEST = "SELECT id, created_at, amount FROM orders\nWHERE customer_id = 42\nORDER BY created_at DESC\nLIMIT 10;";
const ONE_DAY = "SELECT COUNT(*) FROM orders\nWHERE created_at >= '2024-12-31';";
results.figures.composite = await pgFigure(ORDERS, {
  customers: "SELECT COUNT(DISTINCT customer_id) AS customers, COUNT(*) / COUNT(DISTINCT customer_id) AS each FROM orders;",
  create: "CREATE INDEX orders_customer_created_idx\n  ON orders (customer_id, created_at);\nANALYZE orders;",
  latest: LATEST,
  latestPlan: `${EXPLAIN}\n${LATEST}`,
  dayCount: ONE_DAY,
  dayPlan: `${EXPLAIN}\n${ONE_DAY}`,
  // The same two columns, the other way round.
  reverse: "DROP INDEX orders_customer_created_idx;\nCREATE INDEX orders_created_customer_idx\n  ON orders (created_at, customer_id);\nANALYZE orders;",
  reversePlan: `${EXPLAIN}\n${LATEST}`,
  // A leading column with four values: Postgres 18's skip scan searches the
  // index once per status instead of reading the table.
  skip: "DROP INDEX orders_created_customer_idx;\nCREATE INDEX orders_status_created_idx\n  ON orders (status, created_at);\nANALYZE orders;",
  skipPlan: `${EXPLAIN}\n${ONE_DAY}`,
});

// ── 5. Reading a plan: a function on the column, and the rewrite ───────────
const FN_DAY = "SELECT COUNT(*) FROM orders\nWHERE created_at::date = DATE '2024-06-01';";
const RANGE_DAY = "SELECT COUNT(*) FROM orders\nWHERE created_at >= '2024-06-01'\n  AND created_at <  '2024-06-02';";
results.figures.plan = await pgFigure(ORDERS, {
  create: "CREATE INDEX orders_created_idx ON orders (created_at);\nANALYZE orders;",
  fn: FN_DAY,
  fnPlan: `${EXPLAIN}\n${FN_DAY}`,
  range: RANGE_DAY,
  rangePlan: `${EXPLAIN}\n${RANGE_DAY}`,
});

// ── 6. A transaction: a transfer whose second step fails ──────────────────
const ACCOUNTS = "CREATE TABLE accounts (id int PRIMARY KEY, balance numeric NOT NULL CHECK (balance >= 0));\nINSERT INTO accounts VALUES (1, 100), (2, 100)";
results.figures.txn = await pgFigure(
  `${ACCOUNTS};\nCREATE TABLE transfers (\n  id serial PRIMARY KEY,\n  from_id int NOT NULL REFERENCES accounts,\n  to_id int NOT NULL REFERENCES accounts,\n  amount numeric NOT NULL)`,
  {
    before: "SELECT id, balance FROM accounts ORDER BY id;",
    begin: "BEGIN;",
    debit: "UPDATE accounts SET balance = balance - 30 WHERE id = 1\nRETURNING id, balance;",
    // Account 99 does not exist, so the foreign key refuses the row.
    record: "INSERT INTO transfers (from_id, to_id, amount)\nVALUES (1, 99, 30);",
    afterError: "SELECT balance FROM accounts WHERE id = 1;",
    rollback: "ROLLBACK;",
    after: "SELECT id, balance FROM accounts ORDER BY id;",
    // Postgres indexes a primary key, never a foreign key's column.
    indexes: "SELECT tablename, indexname FROM pg_indexes\nWHERE tablename IN ('accounts', 'transfers')\nORDER BY tablename, indexname;",
  },
);

// ── 7, 8. Isolation: another transaction's uncommitted change ─────────────
const TWO_PC = () => pgliteWith({ postgresqlconf: ["max_prepared_transactions = 4"] });
const READ_AT = (level) =>
  `BEGIN ISOLATION LEVEL ${level};\nSELECT current_setting('transaction_isolation') AS level, balance\nFROM accounts WHERE id = 1;\nCOMMIT;`;
results.figures.isolation = await pgFigure(
  ACCOUNTS,
  {
    default: "SHOW default_transaction_isolation;",
    deadlockTimeout: "SHOW deadlock_timeout;",
    // The other transaction: changes the balance to 50 and is parked,
    // uncommitted.
    other: "BEGIN;\nUPDATE accounts SET balance = 50 WHERE id = 1;\nPREPARE TRANSACTION 'other';",
    parked: "SELECT gid FROM pg_prepared_xacts;",
    readUncommitted: READ_AT("READ UNCOMMITTED"),
    readCommitted: READ_AT("READ COMMITTED"),
    repeatableRead: READ_AT("REPEATABLE READ"),
    serializable: READ_AT("SERIALIZABLE"),
    commit: "COMMIT PREPARED 'other';",
    after: "SELECT balance FROM accounts WHERE id = 1;",
  },
  TWO_PC,
);

// ── 9. Pessimistic and optimistic locking ──────────────────────────────────
results.figures.locking = await pgFigure(
  `${ACCOUNTS};\nCREATE TABLE items (id int PRIMARY KEY, stock int NOT NULL, version int NOT NULL);\nINSERT INTO items VALUES (1, 5, 3)`,
  {
    // Pessimistic: another transaction locks account 1 and is parked.
    holder: "BEGIN;\nSELECT * FROM accounts WHERE id = 1 FOR UPDATE;\nPREPARE TRANSACTION 'holder';",
    refused: "SELECT * FROM accounts WHERE id = 1\nFOR UPDATE NOWAIT;",
    otherRow: "SELECT * FROM accounts WHERE id = 2\nFOR UPDATE NOWAIT;",
    release: "COMMIT PREPARED 'holder';",
    granted: "SELECT * FROM accounts WHERE id = 1\nFOR UPDATE NOWAIT;",
    // Optimistic: two clients read version 3; each statement commits on its
    // own, in this order.
    readA: "SELECT stock, version FROM items WHERE id = 1;",
    writeB: "UPDATE items SET stock = stock - 1, version = version + 1\nWHERE id = 1 AND version = 3\nRETURNING stock, version;",
    writeA: "UPDATE items SET stock = stock - 1, version = version + 1\nWHERE id = 1 AND version = 3\nRETURNING stock, version;",
    rereadA: "SELECT stock, version FROM items WHERE id = 1;",
    retryA: "UPDATE items SET stock = stock - 1, version = version + 1\nWHERE id = 1 AND version = 4\nRETURNING stock, version;",
  },
  TWO_PC,
);

// ── 11, 12. The page's customers and orders: join types, and the fan-out ──
// The page's two join blocks share this initSql (databases.mdx), run here on
// Postgres; order_items is the video's own: 1 + order_id % 3 items an order.
const PAGE_TABLES = `CREATE TABLE customers AS SELECT * FROM (VALUES
  (1, 'Ava'), (2, 'Ben'), (3, 'Cy'), (4, 'Di'),
  (5, 'Eve'), (6, 'Finn'), (7, 'Gus'), (8, 'Hana'),
  (9, 'Iris'), (10, 'Jonas'), (11, 'Kira'), (12, 'Leo'),
  (13, 'Mona'), (14, 'Nils'), (15, 'Otto'), (16, 'Pia'),
  (17, 'Quinn'), (18, 'Rui'), (19, 'Sara'), (20, 'Theo'),
  (21, 'Ulla'), (22, 'Vik'), (23, 'Wanda'), (24, 'Yara')
) AS t(id, name);
CREATE TABLE orders AS SELECT * FROM (VALUES
  (101, 1, 120.0), (102, 1, 40.0), (103, 2, 80.0), (104, 3, 55.0),
  (105, 5, 210.0), (106, 6, 75.5), (107, 7, 160.0), (108, 9, 95.25),
  (109, 10, 130.0), (110, 11, 68.0), (111, 13, 245.0), (112, 14, 52.75),
  (113, 15, 188.0), (114, 17, 110.5), (115, 18, 84.0), (116, 19, 199.0),
  (117, 21, 66.25), (118, 22, 142.0), (119, 23, 91.75), (120, 5, 58.0),
  (121, 13, 77.5), (122, 19, 105.0), (123, 2, 33.0), (124, 3, 175.0)
) AS t(order_id, customer_id, amount);
CREATE TABLE order_items AS
SELECT o.order_id, n AS line
FROM orders o, generate_series(1, 1 + o.order_id % 3) n`;

const INFLATED =
  "SELECT c.name, SUM(o.amount) AS revenue, COUNT(*) AS items\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nJOIN order_items i ON i.order_id = o.order_id\nGROUP BY c.name\nORDER BY c.name;";
const FIXED =
  "WITH items AS (\n  SELECT order_id, COUNT(*) AS items\n  FROM order_items GROUP BY order_id\n)\nSELECT c.name, SUM(o.amount) AS revenue, SUM(i.items) AS items\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nJOIN items i ON i.order_id = o.order_id\nGROUP BY c.name\nORDER BY c.name;";
results.figures.joins = await pgFigure(PAGE_TABLES, {
  counts: "SELECT (SELECT COUNT(*) FROM customers) AS customers, (SELECT COUNT(*) FROM orders) AS orders;",
  inner: "SELECT COUNT(*) AS rows FROM customers c\nJOIN orders o ON o.customer_id = c.id;",
  left: "SELECT COUNT(*) AS rows FROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id;",
  none: "SELECT c.name FROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nWHERE o.order_id IS NULL\nORDER BY c.id;",
  // The page's LEFT JOIN block says "Cy has no orders".
  cy: "SELECT c.name, COUNT(o.order_id) AS orders FROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nWHERE c.name = 'Cy'\nGROUP BY c.name;",
  total: "SELECT SUM(amount) AS revenue FROM orders;",
  itemRows: "SELECT COUNT(*) AS rows FROM orders o\nJOIN order_items i ON i.order_id = o.order_id;",
  inflated: INFLATED,
  inflatedTotal: `SELECT SUM(revenue) AS revenue FROM (${INFLATED.replace(/\nORDER BY c.name;$/, "")}) t;`,
  fixed: FIXED,
  fixedTotal: `SELECT SUM(revenue) AS revenue FROM (${FIXED.replace(/\nORDER BY c.name;$/, "")}) t;`,
});

// ── 16. A covering index ───────────────────────────────────────────────────
const SPEND = "SELECT SUM(amount) FROM orders\nWHERE customer_id = 42;";
results.figures.cover = await pgFigure(ORDERS, {
  plain: "CREATE INDEX orders_customer_idx ON orders (customer_id);\nANALYZE orders;",
  before: `${EXPLAIN}\n${SPEND}`,
  include: "CREATE INDEX orders_customer_amount_idx\n  ON orders (customer_id) INCLUDE (amount);\nVACUUM ANALYZE orders;",
  after: `${EXPLAIN}\n${SPEND}`,
  spend: SPEND,
});

const out = new URL("./results.json", import.meta.url);
writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);
const failed = Object.entries(results.figures).flatMap(([f, fig]) =>
  Object.entries(fig.steps)
    .filter(([, s]) => !s.ok)
    .map(([id, s]) => `${f}.${id}: ${s.error}`),
);
console.log(`wrote ${fileURLToPath(out)} (${results.figures.index.version})`);
// Three steps fail on purpose: the foreign key, the aborted transaction after
// it, and NOWAIT on a locked row. Anything else is a broken step.
const EXPECTED = ["txn.record", "txn.afterError", "locking.refused"];
const unexpected = failed.filter((f) => !EXPECTED.includes(f.split(":")[0]));
console.log(failed.length ? `errors (expected ones marked):\n  ${failed.map((f) => (EXPECTED.includes(f.split(":")[0]) ? `[expected] ${f}` : f)).join("\n  ")}` : "no errors");
if (unexpected.length) process.exitCode = 1;
