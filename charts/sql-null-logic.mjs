/**
 * SQL's three-valued logic as the truth table it is, because every NULL bug
 * comes from expecting two values and getting three.
 *
 * The grid is AND and OR over TRUE, FALSE and UNKNOWN. The rows people get
 * wrong are the ones where UNKNOWN does not propagate: FALSE AND UNKNOWN is
 * FALSE, and TRUE OR UNKNOWN is TRUE, because in those cases the other operand
 * already decides it. Everywhere else UNKNOWN wins, and a WHERE clause that
 * evaluates to UNKNOWN does not match, which is why `WHERE x <> 'a'` silently
 * drops the NULL rows.
 *
 * The table is the standard's, not an interpretation of it.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "AND and OR truth tables over TRUE, FALSE and UNKNOWN. UNKNOWN propagates through most combinations, except where the other operand already decides the result.";

const VALUES = ["TRUE", "UNKNOWN", "FALSE"];

const and = (a, b) =>
  a === "FALSE" || b === "FALSE" ? "FALSE" : a === "UNKNOWN" || b === "UNKNOWN" ? "UNKNOWN" : "TRUE";
const or = (a, b) =>
  a === "TRUE" || b === "TRUE" ? "TRUE" : a === "UNKNOWN" || b === "UNKNOWN" ? "UNKNOWN" : "FALSE";

const cells = ["AND", "OR"].flatMap((op) =>
  VALUES.flatMap((a) =>
    VALUES.map((b) => ({
      op,
      a,
      b,
      result: op === "AND" ? and(a, b) : or(a, b),
    })),
  ),
);

/** The two cells where UNKNOWN does not win, which are the ones worth knowing. */
const DECIDED = cells.filter((c) => c.a === "UNKNOWN" && c.result !== "UNKNOWN").length;

export const caption =
  `A comparison with NULL is UNKNOWN, not FALSE, and a WHERE clause keeps only rows that are TRUE. That is the whole bug: \`WHERE status <> 'archived'\` drops every row where status is NULL, because UNKNOWN is not TRUE. UNKNOWN propagates everywhere except the ${DECIDED} cells where the other operand already settles it, which is why \`IS NULL\` exists as separate syntax.`;

const colorFor = (r) =>
  r === "UNKNOWN" ? ACCENT : r === "TRUE" ? SERIES[2] : MUTED;

export function render() {
  return plot({
    height: 300,
    marginTop: 40,
    marginLeft: 84,
    marginBottom: 34,
    ariaLabel: title,
    fx: { label: null, domain: ["AND", "OR"] },
    x: { label: null, domain: VALUES, axis: "top", padding: 0.07 },
    y: { label: null, domain: VALUES, padding: 0.07 },
    marks: [
      Plot.cell(cells, {
        x: "b",
        y: "a",
        fx: "op",
        fill: (d) => colorFor(d.result),
        fillOpacity: 0.28,
      }),
      Plot.text(cells, {
        x: "b",
        y: "a",
        fx: "op",
        text: (d) => (d.result === "UNKNOWN" ? "UNKNOWN" : d.result),
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        ...HALO,
      }),
    ],
  });
}
