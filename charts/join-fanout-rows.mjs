/**
 * Why a join can return more rows than either table has: the output is the
 * product of the matches, not the sum of the inputs.
 *
 * Ten thousand orders joined to a table where each order matches k rows. At
 * k = 1 the result is the orders. At k = 8 it is eight times that, and any
 * SUM over it is eight times too large, which is the classic fan-out bug: the
 * query runs, returns plausible numbers, and every aggregate is wrong.
 *
 * The second line is the reason people miss it: the row count grows linearly
 * and looks unremarkable, while the *error* in the total is the same multiple.
 * A result set of eighty thousand rows does not look wrong.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Result rows and the resulting error in a SUM, against how many rows each order matches in the joined table. Both rise linearly, so an eight-fold overcount looks like an ordinary result set.";

const ORDERS = 10_000;
const MATCHES = [1, 2, 3, 4, 5, 6, 7, 8];
const TRUE_TOTAL = 250_000;

const rows = MATCHES.map((k) => ({
  k,
  out: ORDERS * k,
  reported: TRUE_TOTAL * k,
}));

const WORST = rows.at(-1);

export const caption =
  `A join multiplies. With ${ORDERS.toLocaleString()} orders and ${WORST.k} matching rows each, the result is ${WORST.out.toLocaleString()} rows and every SUM over it is ${WORST.k} times the truth: ${WORST.reported.toLocaleString()} instead of ${TRUE_TOTAL.toLocaleString()}. Nothing errors, nothing looks odd, and the total is wrong. Count your rows before and after a join, every time.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 34,
    marginLeft: 74,
    marginRight: 118,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      label: "Matching rows per order",
      labelAnchor: "center",
      domain: [1, MATCHES.at(-1)],
      ticks: MATCHES.length,
    },
    y: {
      label: "Rows in the result",
      domain: [0, WORST.out * 1.12],
      ticks: 5,
      tickFormat: (d) => `${d / 1000}k`,
    },
    marks: [
      Plot.areaY(rows, { x: "k", y: "out", fill: PRIMARY, fillOpacity: 0.14 }),
      Plot.line(rows, { x: "k", y: "out", stroke: PRIMARY, strokeWidth: 2 }),
      Plot.dot(rows, { x: "k", y: "out", fill: PRIMARY, r: 3 }),
      Plot.ruleY([ORDERS], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text([{}], {
        x: 1,
        y: ORDERS,
        text: () => `${ORDERS.toLocaleString()} orders, the honest count`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dy: -10,
        ...HALO,
      }),
      // Only the middle of the range: at k = 2 the label lands on the axis and
      // the reference line, and at k = 8 it duplicates the end callout.
      Plot.text(rows.filter((r) => r.k === 4 || r.k === 6), {
        x: "k",
        y: "out",
        text: (d) => `SUM is ${d.k}x too big`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "end",
        dx: -10,
        dy: -10,
        ...HALO,
      }),
      Plot.text([WORST], {
        x: "k",
        y: "out",
        text: (d) => `${d.out.toLocaleString()} rows\nfrom ${ORDERS.toLocaleString()}`,
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
