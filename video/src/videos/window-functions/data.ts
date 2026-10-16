// Every value the video shows. Run, not typed: check.mjs runs the SQL in
// queries.ts in PGlite 0.5.8 (PostgreSQL 18.3), asserts each claim the
// narration makes, and writes what Postgres returned to results.json, every
// value as Postgres's own text. The tables on screen are those rows, and the
// listings are queries.ts, so the code printed is the code that was run.
//
//   node src/videos/window-functions/check.mjs     (from video/)

import { GROUP_SQL, OVER_SQL, PAYOFF_SQL, QUERIES, type QueryName, ROWS_SQL } from "./queries";
import results from "./results.json";

export const VIDEO = "window-functions";

/**
 * Whether public/images/window-functions/ holds the two watercolors from
 * illustrations.json. Set to true only once `npm run illustrations --
 * window-functions` has written both WebPs. Every frame is laid out with room
 * for them either way.
 */
export const ILLUSTRATIONS = true;

export type Result = { columns: string[]; rows: string[][] };

const result = (name: QueryName): Result => {
  const r = results[name];
  // A listing edited without re-running check.mjs would print a table that
  // no longer belongs to it, so a stale results.json stops the render.
  if (r.sql !== QUERIES[name].join("\n")) {
    throw new Error(`results.json is stale for "${name}": run check.mjs again`);
  }
  return { columns: r.columns, rows: r.rows };
};

/** Fig. 1: region, day, amount. */
export const TABLE = result("rows");
/** Fig. 2: region, total. */
export const GROUPED = result("group");
/** Fig. 3: region, day, amount, region_total. */
export const WINDOWED = result("over");
/** Fig. 4: region, day, amount, pct, running_total. */
export const PAYOFF = result("payoff");

export { GROUP_SQL, OVER_SQL, PAYOFF_SQL, ROWS_SQL };

export type Region = "North" | "South";
export const regionOf = (row: readonly string[]) => row[0] as Region;

/** Row indexes of each region in the six-row tables (ordered by region, day). */
export const PARTITIONS = (["North", "South"] as const).map((region) => {
  const idx = TABLE.rows.flatMap((r, i) => (r[0] === region ? [i] : []));
  return { region, first: idx[0], last: idx[idx.length - 1] };
});
export const partitionOf = (i: number) => PARTITIONS.find((p) => i >= p.first && i <= p.last) ?? PARTITIONS[0];

/** Each region's total, as GROUP BY printed it. */
export const TOTAL = Object.fromEntries(GROUPED.rows.map((r) => [r[0], r[1]])) as Record<Region, string>;
/** Which GROUP BY row each region folded into. */
export const GROUP_ROW = Object.fromEntries(GROUPED.rows.map((r, i) => [r[0], i])) as Record<Region, number>;
/** The amounts each total folded together, in table order. */
export const PARTS: Record<Region, string[]> = {
  North: TABLE.rows.filter((r) => r[0] === "North").map((r) => r[2]),
  South: TABLE.rows.filter((r) => r[0] === "South").map((r) => r[2]),
};

/** The first North sale and its share of North: "about a third". */
export const FIRST = { amount: PAYOFF.rows[0][2], pct: PAYOFF.rows[0][3], total: TOTAL.North };
