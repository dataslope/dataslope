import results from "./results.json" with { type: "json" };

// Every plan, count, size, error and table the video shows, read from
// results.json: what the site's Postgres (PGlite, PostgreSQL 18) returned for
// the statements in check.mjs, which wrote it. Pure (no Remotion, no DOM).

export const VIDEO = "be-databases";

/**
 * Whether public/images/be-databases/ holds the watercolors from
 * illustrations.json. Phase 2 sets it once they are generated; every frame
 * is laid out with room for them either way.
 */
export const ILLUSTRATIONS = true;

type Value = string | null;
type Step = { sql: string; ok: boolean; columns?: string[]; rows?: Value[][]; error?: string };
type Figure = { setup: string; steps: Record<string, Step>; version: string };
const FIGURES = results.figures as unknown as Record<string, Figure>;

const step = (figure: string, id: string): Step => {
  const s = FIGURES[figure]?.steps[id];
  if (!s) throw new Error(`results.json has no step ${id} in ${figure}`);
  return s;
};

/** A step that must have run. */
const ran = (figure: string, id: string): Step => {
  const s = step(figure, id);
  if (!s.ok) throw new Error(`${figure}.${id} failed: ${s.error}`);
  return s;
};

/** A step that must have failed, and the error Postgres printed. */
const refused = (figure: string, id: string): string => {
  const s = step(figure, id);
  if (s.ok || !s.error) throw new Error(`${figure}.${id} was meant to fail, and ran`);
  return s.error;
};

export type Table = { cols: string[]; rows: string[][] };

/** A result, as rows of printed cells in its column order. */
const table = (figure: string, id: string): Table => {
  const s = ran(figure, id);
  return { cols: s.columns ?? [], rows: (s.rows ?? []).map((r) => r.map((v) => (v === null ? "null" : v))) };
};

/** One cell of a one-row result, as a number. */
const scalar = (figure: string, id: string, col?: string) => {
  const t = table(figure, id);
  return Number(t.rows[0][col ? t.cols.indexOf(col) : 0]);
};

/** One cell of a one-row result, as printed. */
const cell = (figure: string, id: string, col?: string) => {
  const t = table(figure, id);
  return t.rows[0][col ? t.cols.indexOf(col) : 0];
};

/** A statement as it is printed: its SQL, one string per line (a step that
 *  failed on purpose has its statement too). */
const lines = (figure: string, id: string) => step(figure, id).sql.split("\n");

/**
 * A plan as Postgres printed it, one string per line, with each node's
 * "cost=…" and "width=…" trimmed (its estimated rows kept), and the
 * "Planning:" block dropped (the planner's own catalog reads). Nothing else
 * is changed.
 */
const plan = (figure: string, id: string): string[] => {
  const out = table(figure, id).rows.map((r) => r[0].replace(/cost=\S+ /, "").replace(/ width=\d+/, ""));
  const planning = out.findIndex((l) => l === "Planning:");
  return planning < 0 ? out : out.slice(0, planning);
};

/** The statement a plan was made from, as the listing prints it: EXPLAIN
 *  ANALYZE over the query (the run's other options only drop lines). */
const explained = (figure: string, id: string) => ["EXPLAIN ANALYZE", ...lines(figure, id).slice(1)];

/** The number after `key=` (or `key: `) on the plan line that holds `on`. */
export const planNumber = (planLines: readonly string[], on: string, key: string) => {
  const line = planLines.find((l) => l.includes(on));
  const m = line?.match(new RegExp(`${key}[=:]\\s*([\\d.]+)`));
  if (!m) throw new Error(`no ${key} on the plan line holding ${JSON.stringify(on)}`);
  return Number(m[1]);
};

/** The pages a plan node touched: its "Buffers:" line's hit plus read (the
 *  split between them is the cache's; the sum is the work). */
const pagesTouched = (planLines: readonly string[], afterNode: string) => {
  const at = planLines.findIndex((l) => l.includes(afterNode));
  const line = planLines.slice(at).find((l) => l.trim().startsWith("Buffers:"));
  if (at < 0 || !line) throw new Error(`no Buffers line under ${JSON.stringify(afterNode)}`);
  const n = (k: string) => Number(line.match(new RegExp(`${k}=(\\d+)`))?.[1] ?? 0);
  return n("hit") + n("read");
};

/** "1,000,000". */
export const thousands = (n: number) => n.toLocaleString("en-US");

/** A numeric cell as dollars: "304.00". */
const dollars = (v: string) => Number(v).toFixed(2);

export const VERSION = FIGURES.index.version;

// ── Opening ─────────────────────────────────────────────────────────────────

export const OPENING = {
  users: scalar("index", "rows"),
  orders: scalar("composite", "customers", "orders"),
  customers: scalar("composite", "customers", "customers"),
  perCustomer: scalar("composite", "customers", "each"),
  version: VERSION,
};

// ── 2. What an index is ─────────────────────────────────────────────────────

const seqPlan = plan("index", "seq");
const btreePlan = plan("index", "btree");
export const INDEX = {
  query: lines("index", "seq").slice(1),
  /** The users table, in 8 kB pages. */
  pages: scalar("index", "table", "pages"),
  size: cell("index", "table", "size"),
  seqPlan,
  /** Every page of the table, for one row. */
  seqPages: pagesTouched(seqPlan, "Seq Scan"),
  removed: planNumber(seqPlan, "Rows Removed", "Filter"),
  create: lines("index", "create").slice(0, 1),
  /** The B-tree's height: bt_metap's root level plus one. */
  levels: scalar("index", "levels"),
  indexPages: scalar("index", "indexPages", "pages"),
  btreePlan,
  /** Three index pages on the way down, one table page. */
  btreePages: pagesTouched(btreePlan, "Index Scan"),
  hashEqPlan: plan("index", "hashEq"),
  hashRangeQuery: lines("index", "hashRange").slice(1),
  hashRangePlan: plan("index", "hashRange"),
};

// ── 3. When an index hurts ──────────────────────────────────────────────────

const sizes = table("hurt", "sizes");
const sizeOf = (relation: string) => {
  const row = sizes.rows.find((r) => r[0] === relation);
  if (!row) throw new Error(`no size for ${relation}`);
  return { pretty: row[1], bytes: Number(row[2]), mb: Number(row[2]) / 2 ** 20 };
};
const indexNames = ["users_email_idx", "users_pkey", "users_active_idx"];
export const HURT = {
  active: scalar("hurt", "active"),
  activeQuery: lines("hurt", "activePlan").slice(1),
  activePlan: plan("hurt", "activePlan"),
  table: sizeOf("users"),
  /** The users table's three indexes, largest first. */
  indexes: indexNames.map((name) => ({ name, ...sizeOf(name) })),
  indexesBytes: indexNames.reduce((sum, name) => sum + sizeOf(name).bytes, 0),
  walNone: planNumber(plan("hurt", "walNone"), "WAL", "records"),
  walThree: planNumber(plan("hurt", "walThree"), "WAL", "records"),
};
if (HURT.indexesBytes <= HURT.table.bytes) throw new Error("the narration says the three indexes outweigh the table");

// ── 4. Composite indexes ────────────────────────────────────────────────────

const latestPlan = plan("composite", "latestPlan");
const reversePlan = plan("composite", "reversePlan");
const skipPlan = plan("composite", "skipPlan");
export const COMPOSITE = {
  create: lines("composite", "create").slice(0, 2),
  query: explained("composite", "latestPlan"),
  latest: table("composite", "latest"),
  latestPlan,
  latestPages: pagesTouched(latestPlan, "Limit"),
  /** No Sort node: the index hands the rows over in order. */
  sorted: !latestPlan.some((l) => l.includes("Sort")),
  dayQuery: explained("composite", "dayPlan"),
  dayCount: scalar("composite", "dayCount"),
  dayPlan: plan("composite", "dayPlan"),
  reverse: lines("composite", "reverse").slice(1, 3),
  reversePlan,
  reversePages: pagesTouched(reversePlan, "Limit"),
  skip: lines("composite", "skip").slice(1, 3),
  skipPlan,
  skipSearches: planNumber(skipPlan, "Index Searches", "Index Searches"),
  skipHeapFetches: planNumber(skipPlan, "Heap Fetches", "Heap Fetches"),
};
if (!COMPOSITE.sorted) throw new Error("the narration says the latest orders need no sort");

// ── 5. Reading a plan ───────────────────────────────────────────────────────

const fnPlan = plan("plan", "fnPlan");
const rangePlan = plan("plan", "rangePlan");
export const PLAN = {
  fn: explained("plan", "fnPlan"),
  fnPlan,
  fnEstimate: planNumber(fnPlan, "Seq Scan", "rows"),
  fnActual: planNumber(fnPlan, "Seq Scan", "actual rows"),
  fnRemoved: planNumber(fnPlan, "Rows Removed", "Filter"),
  range: explained("plan", "rangePlan"),
  rangePlan,
  rangeEstimate: planNumber(rangePlan, "Index Only Scan", "rows"),
  rangeActual: planNumber(rangePlan, "Index Only Scan", "actual rows"),
  count: scalar("plan", "fn"),
};
if (PLAN.rangeEstimate !== PLAN.rangeActual) throw new Error("the narration says the range's estimate is exactly right");

// ── 6. A join that inflates a sum ───────────────────────────────────────────

const byName = (t: Table, name: string, col: string) => {
  const row = t.rows.find((r) => r[0] === name);
  if (!row) throw new Error(`no row for ${name}`);
  return row[t.cols.indexOf(col)];
};
const inflated = table("joins", "inflated");
const fixed = table("joins", "fixed");
export const FANOUT = {
  orders: scalar("joins", "counts", "orders"),
  total: dollars(cell("joins", "total")),
  joinedRows: scalar("joins", "itemRows"),
  inflatedQuery: lines("joins", "inflated"),
  inflated: { cols: inflated.cols, rows: inflated.rows.map(([n, r, i]) => [n, dollars(r), i]) },
  inflatedTotal: dollars(cell("joins", "inflatedTotal")),
  fixedQuery: lines("joins", "fixed"),
  fixed: { cols: fixed.cols, rows: fixed.rows.map(([n, r, i]) => [n, dollars(r), i]) },
  fixedTotal: dollars(cell("joins", "fixedTotal")),
  /** Sara: two orders, three items each. */
  sara: { right: dollars(byName(fixed, "Sara", "revenue")), wrong: dollars(byName(inflated, "Sara", "revenue")), items: Number(byName(fixed, "Sara", "items")) },
};
if (FANOUT.fixedTotal !== FANOUT.total) throw new Error("the fixed query must give back the orders' own total");

// ── 7. A transaction ────────────────────────────────────────────────────────

export const TXN = {
  before: table("txn", "before"),
  debit: lines("txn", "debit"),
  debited: table("txn", "debit"),
  record: lines("txn", "record"),
  recordError: refused("txn", "record"),
  afterError: refused("txn", "afterError"),
  after: table("txn", "after"),
};

// ── 8, 9. Isolation ─────────────────────────────────────────────────────────

const readAt = (id: string) => ({ level: cell("isolation", id, "level"), balance: Number(cell("isolation", id, "balance")) });
export const ISOLATION = {
  /** Postgres's default level, from SHOW. */
  default: cell("isolation", "default"),
  other: lines("isolation", "other"),
  /** The other transaction's uncommitted balance, read off its UPDATE, and
   *  what each level read while it was parked. */
  uncommitted: Number(ran("isolation", "other").sql.match(/SET balance = (\d+)/)![1]),
  reads: ["readUncommitted", "readCommitted", "repeatableRead", "serializable"].map(readAt),
  afterCommit: scalar("isolation", "after"),
};
if (ISOLATION.reads.some((r) => r.balance !== 100)) throw new Error("the narration says every level read 100");
if (ISOLATION.afterCommit !== ISOLATION.uncommitted) throw new Error("the other transaction's write must land once committed");

// ── 10. Pessimistic and optimistic locking ──────────────────────────────────

const row = (figure: string, id: string) => {
  const t = table(figure, id);
  return t.rows.length ? Object.fromEntries(t.cols.map((c, i) => [c, Number(t.rows[0][i])])) : null;
};
export const LOCK = {
  holder: lines("locking", "holder"),
  nowait: lines("locking", "refused"),
  refused: refused("locking", "refused"),
  otherRow: row("locking", "otherRow"),
  granted: row("locking", "granted"),
  write: lines("locking", "writeA"),
  readA: row("locking", "readA"),
  writeB: row("locking", "writeB"),
  /** A's write, expecting version 3 after B made it 4: no row comes back. */
  writeA: row("locking", "writeA"),
  rereadA: row("locking", "rereadA"),
  retryA: row("locking", "retryA"),
};
if (LOCK.writeA !== null) throw new Error("the narration says the stale write changes nothing");

// ── 11. Deadlocks ───────────────────────────────────────────────────────────

export const DEADLOCK = {
  /** deadlock_timeout, from SHOW: how long Postgres waits before it looks
   *  for a cycle. The cycle itself is drawn (PGlite is one connection). */
  timeout: cell("isolation", "deadlockTimeout"),
};

// ── Quick ───────────────────────────────────────────────────────────────────

const coverBefore = plan("cover", "before");
const coverAfter = plan("cover", "after");
export const RAPID = {
  joins: {
    inner: scalar("joins", "inner"),
    left: scalar("joins", "left"),
    customers: scalar("joins", "counts", "customers"),
    /** The customers with no orders, in id order. */
    none: table("joins", "none").rows.map((r) => r[0]),
  },
  /** Postgres's indexes on accounts and transfers: the primary keys only. */
  keys: table("txn", "indexes"),
  cover: {
    include: lines("cover", "include").slice(0, 2),
    query: explained("cover", "after"),
    before: coverBefore,
    heapBlocks: planNumber(coverBefore, "Heap Blocks", "exact"),
    after: coverAfter,
    heapFetches: planNumber(coverAfter, "Heap Fetches", "Heap Fetches"),
    spend: cell("cover", "spend"),
  },
};
if (RAPID.joins.left - RAPID.joins.inner !== RAPID.joins.none.length) throw new Error("left minus inner must be the customers with no orders");

// ── What the narration says aloud ───────────────────────────────────────────
// Every number spoken in script.ts, against the run it comes from, so a
// rerun of check.mjs that moves one fails here before a scene shows it.
{
  const said: [string, boolean][] = [
    ["a million users, a million orders", OPENING.users === 1_000_000 && OPENING.orders === 1_000_000],
    ["seven thousand three hundred sixty pages, to keep one row", INDEX.seqPages === 7360 && INDEX.pages === 7360 && INDEX.removed === 999_999],
    ["three levels deep, four pages", INDEX.levels === 3 && INDEX.btreePages === 4],
    ["half the users are active", HURT.active === OPENING.users / 2],
    ["ten thousand log records, and forty thousand with three", Math.round(HURT.walNone / 1000) === 10 && Math.round(HURT.walThree / 1000) === 40],
    ["thirteen pages", COMPOSITE.latestPages === 13],
    ["over eighteen hundred pages", COMPOSITE.reversePages > 1800 && COMPOSITE.reversePages < 1900],
    ["five index searches, never touched the table", COMPOSITE.skipSearches === 5 && COMPOSITE.skipHeapFetches === 0],
    ["expected five thousand, found two thousand seven hundred thirty-two, nearly a million thrown away", PLAN.fnEstimate === 5000 && PLAN.fnActual === 2732 && PLAN.fnRemoved > 990_000],
    ["twenty-four orders, forty-eight rows, the revenue more than doubles", FANOUT.orders === 24 && FANOUT.joinedRows === 48 && Number(FANOUT.inflatedTotal) > 2 * Number(FANOUT.total)],
    ["three hundred four dollars becomes nine hundred twelve, both orders three items", FANOUT.sara.right === "304.00" && FANOUT.sara.wrong === "912.00" && FANOUT.sara.items === 6],
    ["account one to seventy, then a hundred again", TXN.debited.rows[0][1] === "70" && TXN.after.rows[0][1] === "100"],
    ["version three, then four", LOCK.readA?.version === 3 && LOCK.writeB?.version === 4],
    ["one second, its deadlock timeout", DEADLOCK.timeout === "1s"],
    ["inner twenty-four, left thirty, six who never ordered", RAPID.joins.inner === 24 && RAPID.joins.left === 30 && RAPID.joins.none.length === 6],
  ];
  const wrong = said.filter(([, ok]) => !ok).map(([what]) => what);
  if (wrong.length) throw new Error(`the narration no longer matches the run: ${wrong.join("; ")}`);
}
