/**
 * What Type 2 history actually costs, drawn against Type 1 over three years.
 *
 * A Type 1 dimension overwrites, so its row count is the entity count and
 * never moves. A Type 2 dimension appends a version whenever a tracked
 * attribute changes, so its row count is the entity count *plus every change
 * that has ever happened*, and it climbs for as long as the warehouse runs.
 *
 * The interview answer is usually "Type 2 keeps history", which is true and
 * skips the consequence: a dimension that grows without bound, every query
 * against it needing either `WHERE is_current` or a join on the validity
 * window, and a join key that is the surrogate key rather than the business
 * key. The slope is set by the churn rate, which is the number worth asking
 * about in the interview and the one nobody has.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Row counts of a customer dimension over thirty-six months under Type 1 and Type 2. The Type 1 line is flat at the entity count while the Type 2 line climbs steadily as every attribute change appends a version.";

const CUSTOMERS = 50_000;
const MONTHS = 36;
/** Share of customers whose tracked attributes change in a month. */
const CHURN = 0.04;

const rows = Array.from({ length: MONTHS + 1 }, (_, m) => [
  { key: "Type 1 (overwrite)", m, rows: CUSTOMERS },
  { key: "Type 2 (versioned)", m, rows: Math.round(CUSTOMERS * (1 + CHURN * m)) },
]).flat();

const FINAL = rows.at(-1).rows;
const RATIO = FINAL / CUSTOMERS;

export const caption = `A ${CUSTOMERS.toLocaleString()}-customer dimension where ${(CHURN * 100).toFixed(0)}% of rows change in a month. Type 1 overwrites, so its row count is the customer count forever. Type 2 appends a version per change, so after three years it holds ${FINAL.toLocaleString()} rows, ${RATIO.toFixed(1)} times as many, and every query against it has to say which version it means: \`WHERE is_current\` for today, a join on the validity window for a point in time.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 62,
    marginRight: 138,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Months since launch", labelAnchor: "center", domain: [0, MONTHS], ticks: 6 },
    y: {
      label: "Rows in the dimension",
      domain: [0, FINAL * 1.08],
      ticks: 5,
      tickFormat: (d) => `${Math.round(d / 1000)}k`,
    },
    marks: [
      Plot.line(rows, {
        x: "m",
        y: "rows",
        z: "key",
        stroke: (d) => (d.key.startsWith("Type 2") ? ACCENT : PRIMARY),
        strokeWidth: 2,
      }),
      Plot.text(
        [rows.at(-1), rows.at(-2)],
        {
          x: MONTHS,
          y: "rows",
          text: "key",
          fill: (d) => (d.key.startsWith("Type 2") ? ACCENT : PRIMARY),
          fontSize: 11,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),
      Plot.text([{}], {
        x: MONTHS * 0.5,
        y: CUSTOMERS * 0.72,
        text: () => "history is not free storage,\nit is a grain change",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
