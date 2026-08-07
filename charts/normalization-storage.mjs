/**
 * What denormalisation actually costs, and what it actually buys, in the two
 * units people trade between.
 *
 * A denormalised orders table repeats the customer's name, address and tier on
 * every row. One customer with a thousand orders stores that thousand times.
 * The bars are bytes; the second panel is the reason anyone accepts it, which
 * is that the normalised design needs a join for the same query.
 *
 * Neither panel wins on its own, which is the point of drawing both: this is a
 * trade rather than a mistake. What makes it a mistake is doing it without
 * measuring, and the sizes here are computed from the row counts and field
 * widths so the trade is at least numerate.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Storage for a million orders under normalised and denormalised designs, beside the query cost of each: the denormalised table is several times larger and needs no join.";

const ORDERS = 1_000_000;
const CUSTOMERS = 40_000;
const ORDER_BYTES = 60;
/** Customer fields repeated on every row when denormalised. */
const CUSTOMER_BYTES = 220;

const DESIGNS = [
  {
    key: "Normalised",
    bytes: ORDERS * ORDER_BYTES + CUSTOMERS * CUSTOMER_BYTES,
    joins: 1,
  },
  {
    key: "Denormalised",
    bytes: ORDERS * (ORDER_BYTES + CUSTOMER_BYTES),
    joins: 0,
  },
];

const RATIO = DESIGNS[1].bytes / DESIGNS[0].bytes;
const COPIES = Math.round(ORDERS / CUSTOMERS);

export const caption =
  `A million orders across ${CUSTOMERS.toLocaleString()} customers means each customer's details are stored about ${COPIES} times when denormalised: ${RATIO.toFixed(1)} times the bytes. What that buys is the join, gone. It is a trade, not a mistake, and it becomes a mistake when the duplicated columns can be updated, because now there are ${COPIES} places for them to disagree.`;

const rows = DESIGNS.map((d) => ({ ...d, mb: d.bytes / 1e6 }));

export function render() {
  return plot({
    height: 300,
    marginTop: 40,
    marginLeft: 118,
    marginRight: 150,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Megabytes stored", labelAnchor: "center", domain: [0, 300], ticks: 4 },
    y: { label: null, domain: rows.map((r) => r.key), padding: 0.42 },
    marks: [
      Plot.barX(rows, {
        y: "key",
        x: "mb",
        fill: (d) => (d.joins === 0 ? ACCENT : PRIMARY),
        fillOpacity: 0.5,
      }),
      Plot.text(rows, {
        y: "key",
        x: "mb",
        text: (d) => `${d.mb.toFixed(0)} MB`,
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text(rows, {
        y: "key",
        x: 300,
        text: (d) => (d.joins === 0 ? "no join needed" : `${d.joins} join per query`),
        fill: MUTED,
        fontSize: 10.5,
        textAnchor: "start",
        dx: 62,
        ...HALO,
      }),
      Plot.text([rows[1]], {
        y: "key",
        x: 0,
        text: () => `each customer's details, ${COPIES} times over`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        dy: 26,
        ...HALO,
      }),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
