import results from "./results.json";

// Every table, row, total and error the video shows, read from results.json:
// what PGlite 0.5.8 (PostgreSQL 18.3) returned for the statements in
// check.mjs, which wrote it from the lessons' own initSql. Every column an
// entity box shows is looked up in information_schema's answer, so a name on
// screen that the schema doesn't have throws here. Pure (no Remotion, no DOM).

export const VIDEO = "db-designing-schemas";

/**
 * Whether public/images/db-designing-schemas/ holds the three watercolors
 * from illustrations.json. Every frame is laid out with room for them either
 * way.
 */
export const ILLUSTRATIONS = true;

/** A value as PGlite hands it back: numeric arrives as a string. */
export type Value = string | number | boolean | null;
/** A cell as the tables draw it. */
export type Cell = string | null;

type Ok = { ok: true; fields: string[]; rows: Record<string, Value>[]; affected: number | null };
type Refused = { ok: false; error: { message: string; code: string; detail: string | null; constraint: string | null } };
type Result = Ok | Refused;
const R = results.results as unknown as Record<string, Result>;

const ok = (k: string): Ok => {
  const r = R[k];
  if (!r?.ok) throw new Error(`results.json: ${k} did not run`);
  return r;
};
const refused = (k: string) => {
  const r = R[k];
  if (!r || r.ok) throw new Error(`results.json: ${k} was not refused`);
  return r.error;
};
const cells = (r: Ok, fields = r.fields): Cell[][] => r.rows.map((row) => fields.map((f) => (row[f] === null ? null : String(row[f]))));

// ── The store's entities (case-study-ecommerce) ─────────────────────────────

export type Column = { name: string; key?: "PK" | "FK" | "UK" | "PK, FK" | "FK, UK" };

/** A UK badge must be a UNIQUE constraint the catalog lists. */
const checkUnique = (table: string, cols: readonly Column[], unique: readonly string[]) => {
  for (const c of cols) if (c.key?.includes("UK") && !unique.includes(`${table}.${c.name}`)) throw new Error(`${table}.${c.name} is not UNIQUE`);
};

/** The columns a box shows, each one checked against the catalog. */
const entity = (table: string, cols: readonly Column[]) => {
  const have = new Set(ok(`columns_${table}`).rows.map((r) => r.column_name as string));
  for (const c of cols) if (!have.has(c.name)) throw new Error(`${table} has no column ${c.name}`);
  checkUnique(table, cols, results.uniqueStore);
  return { name: table, columns: cols };
};

/** The store's six tables. Products leaves out its sku and active flag, and
 *  orders its timestamp: neither is part of the argument. */
export const STORE = {
  // email and a category's name are UNIQUE in the lesson's DDL, and UK in its ER diagram.
  customers: entity("customers", [{ name: "id", key: "PK" }, { name: "email", key: "UK" }, { name: "full_name" }]),
  orders: entity("orders", [{ name: "id", key: "PK" }, { name: "customer_id", key: "FK" }, { name: "status" }]),
  orderItems: entity("order_items", [
    { name: "order_id", key: "PK, FK" },
    { name: "product_id", key: "PK, FK" },
    { name: "quantity" },
    { name: "unit_price" },
  ]),
  products: entity("products", [{ name: "id", key: "PK" }, { name: "name" }, { name: "current_price" }]),
  categories: entity("categories", [{ name: "id", key: "PK" }, { name: "name", key: "UK" }]),
  productCategories: entity("product_categories", [
    { name: "product_id", key: "PK, FK" },
    { name: "category_id", key: "PK, FK" },
  ]),
};

/** Every column of every store table, in table order: the one wide table. */
export const WIDE_COLUMNS: readonly { table: string; name: string }[] = (
  ["customers", "orders", "order_items", "products", "categories"] as const
).flatMap((t) => ok(`columns_${t}`).rows.map((r) => ({ table: t, name: r.column_name as string })));

/** The first line of the lesson's own DDL for the store: what typing tables
 *  straight away starts with. */
export const FIRST_DDL_LINE = results.sql.store.split("\n").find((l) => l.startsWith("CREATE TABLE")) as string;

// ── Ana's order: the price charged and the price now ────────────────────────

const lines = ok("lines");
export const CUSTOMER = lines.rows[0].customer as string;
/** First name, as the narration says it. */
export const CUSTOMER_FIRST = CUSTOMER.split(" ")[0];
export const LINE_COLS = ["product", "quantity", "unit_price", "current_price", "line_total"] as const;
export const LINES: readonly (readonly Cell[])[] = cells(lines, [...LINE_COLS]);
/** Column indexes, so the scenes name what they point at. */
export const L = { product: 0, quantity: 1, unitPrice: 2, currentPrice: 3, lineTotal: 4 } as const;
/** The mug's line: two at 10.00, priced 12.00 now. */
export const MUG = LINES.findIndex((r) => (r[L.product] ?? "").includes("Mug"));
export const TOTAL_CHARGED = ok("totalCharged").rows[0].order_total as string;
export const TOTAL_CATALOG = ok("totalCatalog").rows[0].order_total as string;

/** The two tables that hold a price, as stored: order_items' lines of
 *  order 1, and the products they point at. */
export const ITEM_COLS = ["order_id", "product_id", "quantity", "unit_price"] as const;
export const ITEM_ROWS: readonly (readonly Cell[])[] = cells(ok("orderItems"), [...ITEM_COLS]);
export const PRODUCT_COLS = ["id", "name", "current_price"] as const;
export const PRODUCT_ROWS: readonly (readonly Cell[])[] = cells(ok("products"), [...PRODUCT_COLS]);

// ── What Postgres refused ───────────────────────────────────────────────────

export type PgError = { message: string; detail: string | null };
const pg = (k: string): PgError => {
  const e = refused(k);
  return { message: e.message, detail: e.detail };
};
/** The same product on one order twice. */
export const DUPLICATE_LINE = pg("duplicateLine");
/** A line for zero mugs. */
export const ZERO_QUANTITY = pg("zeroQuantity");
/** priority TEXT NOT NULL, added in one step to a table with rows. */
export const ONE_STEP = pg("oneStep");

// ── tasks: a required column in safe steps (evolving-schemas-safely) ───────

export const TASK_COLS = ["id", "title", "status", "priority"] as const;
const tasksBefore = ok("tasksBefore");
export const TASKS: readonly (readonly Cell[])[] = cells(tasksBefore, ["id", "title", "status"]);
/** After the nullable add: every priority is NULL. */
export const AFTER_ADD = cells(ok("afterAdd"), [...TASK_COLS]);
export const AFTER_BACKFILL = cells(ok("afterBackfill"), [...TASK_COLS]);
/** The backfilled value, and how many rows the UPDATE changed. */
export const BACKFILL_VALUE = AFTER_BACKFILL[0][3] as string;
export const BACKFILLED = ok("backfill").affected as number;
/** Rows still missing a priority before it is tightened. */
export const MISSING = Number(ok("verify").rows[0].missing);
/** Whether information_schema calls priority not nullable at the end. */
export const PRIORITY_REQUIRED =
  ok("tasksAfterColumns").rows.find((r) => r.column_name === "priority")?.is_nullable === "NO";
/** That the tightening statements ran. */
ok("tighten");
ok("check");

// ── The task tracker grows (why-schemas-change) ─────────────────────────────

const tracker = new Set(ok("trackerV3").rows.map((r) => r.column_name as string));
const trackerProjects = new Set(ok("trackerV3Projects").rows.map((r) => r.column_name as string));
export const TRACKER = {
  tasks: { name: "tasks", columns: [{ name: "id", key: "PK" }, { name: "title" }, { name: "status" }, { name: "due_on" }, { name: "project_id", key: "FK" }] as Column[] },
  projects: { name: "projects", columns: [{ name: "id", key: "PK" }, { name: "name" }] as Column[] },
};
for (const c of TRACKER.tasks.columns) if (!tracker.has(c.name)) throw new Error(`tracker tasks has no ${c.name}`);
for (const c of TRACKER.projects.columns) if (!trackerProjects.has(c.name)) throw new Error(`projects has no ${c.name}`);

// ── One owner becomes many assignees: expand and contract ───────────────────

const tasksCols = (k: string) => new Set(ok(k).rows.map((r) => r.column_name as string));
const before = tasksCols("assigneesBefore");
const after = tasksCols("assigneesAfter");
ok("expand");
export const MOVED = ok("move").affected as number;
ok("contract");
if (!before.has("owner_id") || after.has("owner_id")) throw new Error("owner_id should be there before and gone after");

export const ASSIGN = {
  users: { name: "users", columns: [{ name: "id", key: "PK" }, { name: "email", key: "UK" }] as Column[] },
  tasks: {
    name: "tasks",
    columns: [{ name: "id", key: "PK" }, { name: "owner_id", key: "FK" }, { name: "title" }] as Column[],
  },
  /** tasks after the contract: what information_schema lists. */
  tasksAfter: { name: "tasks", columns: [{ name: "id", key: "PK" }, { name: "title" }] as Column[] },
  assignees: {
    name: "task_assignees",
    columns: [
      { name: "task_id", key: "PK, FK" },
      { name: "user_id", key: "PK, FK" },
    ] as Column[],
  },
};
for (const c of ASSIGN.tasks.columns) if (!before.has(c.name)) throw new Error(`tasks has no ${c.name}`);
checkUnique("users", ASSIGN.users.columns, results.uniqueAssignees);
for (const c of ASSIGN.tasksAfter.columns) if (!after.has(c.name)) throw new Error(`tasks lost ${c.name}`);
