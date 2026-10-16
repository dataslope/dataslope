// Every row, id and error message the video shows, read from results.json:
// what PGlite 0.5.8 (PostgreSQL 18.3) returned for the statements in
// check.mjs, which wrote it from the lessons' own tables. The entity boxes are
// the lessons' diagrams (cardinality.mdx, reading-er-diagrams.mdx). Pure (no
// Remotion, no DOM).
import results from "./results.json";

export const VIDEO = "db-relationships";

/**
 * Whether public/images/db-relationships/ holds the three watercolors from
 * illustrations.json. Every frame is laid out with room for them either way.
 */
export const ILLUSTRATIONS = true;

/** A value as Postgres returned it, as text; null is SQL NULL. */
export type Cell = string | null;

type Run =
  | { sql: string; ok: true; fields: string[]; rows: Record<string, unknown>[] }
  | { sql: string; ok: false; error: { message: string; detail: string | null; code: string | null; constraint: string | null } };
const RUNS = results.runs as unknown as Record<string, Run>;

const rowsOf = (key: string) => {
  const r = RUNS[key];
  if (!r?.ok) throw new Error(`db-relationships: results.json has no rows for "${key}"`);
  return { cols: r.fields, rows: r.rows.map((row) => r.fields.map((f) => (row[f] === null ? null : String(row[f])))) };
};
const errorOf = (key: string) => {
  const r = RUNS[key];
  if (!r || r.ok) throw new Error(`db-relationships: "${key}" was expected to fail`);
  return { ...r.error, sql: r.sql };
};

// ── Ada, Grace and their orders (cardinality.mdx) ────────────────────────────

export const CUSTOMERS = rowsOf("customers");
export const ORDERS = rowsOf("orders");
/** Which customers row each orders row points at. */
export const POINTS_AT = ORDERS.rows.map((o) => CUSTOMERS.rows.findIndex((c) => c[0] === o[1]));
/** The lesson's count query: name, order_count. */
export const ORDER_COUNT = rowsOf("orderCount");
export const ADA = CUSTOMERS.rows[0];
export const GRACE = CUSTOMERS.rows[1];
/** Ada's orders, as the narration reads them ("one oh one and one oh two"). */
export const ADA_ORDERS = ORDERS.rows.filter((o) => o[1] === ADA[0]).map((o) => o[0] as string);
export const GRACE_ORDERS = ORDERS.rows.filter((o) => o[1] === GRACE[0]).map((o) => o[0] as string);

// ── One badge at most (cardinality.mdx) ──────────────────────────────────────

export const BADGES = rowsOf("badgesBefore");
export const BADGES_AFTER = rowsOf("badgesAfter");
export const SECOND_BADGE = errorOf("secondBadge");
/** The refused row, as the INSERT spells it: (11, 1). */
export const SECOND_BADGE_ROW: readonly Cell[] = /VALUES\s*\((\d+),\s*(\d+)\)/.exec(SECOND_BADGE.sql)!.slice(1, 3);
/** The statement on screen, one line per printed line. */
export const SECOND_BADGE_SQL = ["INSERT INTO badges", `VALUES (${SECOND_BADGE_ROW.join(", ")});`] as const;

// ── The shop, queried through its keys (reading-er-diagrams.mdx) ────────────

export const PATH = rowsOf("path");
/** The foreign keys Postgres lists: one per line of the diagram. */
export const FOREIGN_KEYS = rowsOf("foreignKeys").rows.map(([fromTable, fromColumn, toTable, toColumn]) => ({
  fromTable,
  fromColumn,
  toTable,
  toColumn,
}));

// The narration says these; if new results disagree, fail loudly here.
const expect = (ok: boolean, what: string) => {
  if (!ok) throw new Error(`db-relationships: results.json no longer says ${what}`);
};
expect(ADA[1] === "Ada" && GRACE[1] === "Grace", "the customers are Ada and Grace");
expect(ADA_ORDERS.join() === "101,102" && GRACE_ORDERS.join() === "103", "Ada has 101 and 102, Grace 103");
expect(SECOND_BADGE.code === "23505" && BADGES_AFTER.rows.length === 1, "the second badge is refused");
expect(
  PATH.rows.map((r) => `${r[3]} ${r[4]}`).join() === "Notebook 2,Pen 3",
  "the order holds two notebooks and three pens",
);
expect(FOREIGN_KEYS.length === 3, "three foreign keys");
