/**
 * The N+1, priced in the thing that actually costs: round trips.
 *
 * Fetching a list and then looping over it to fetch each row's children issues
 * one query for the list and one per row. Every one of those is a network
 * round trip, and a round trip to a database in the same data centre is around
 * half a millisecond, so the wall-clock cost is the count times the latency
 * and has almost nothing to do with how fast the queries themselves are. This
 * is why an N+1 profiles as "the database is slow" while every individual
 * query in the log looks fine.
 *
 * A join or a batched `IN (…)` is one round trip whatever the row count, so it
 * is a horizontal line. The chart is drawn in milliseconds because that is the
 * unit the problem is felt in: at 200 rows the N+1 has spent a tenth of a
 * second doing nothing but waiting.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Wall-clock time against the number of parent rows, for a query per row against a single join. The per-row line climbs steadily into hundreds of milliseconds while the join stays flat at a few.";

/** Round trip to a database in the same data centre. */
const RTT_MS = 0.55;
const QUERY_MS = 0.4;
const AT = 200;

const rows = Array.from({ length: 51 }, (_, i) => {
  const n = i * 10;
  return [
    { key: "One query per row (N+1)", n, ms: (n + 1) * (RTT_MS + QUERY_MS) },
    { key: "One join, or one batched IN", n, ms: RTT_MS + QUERY_MS + n * 0.004 },
  ];
}).flat();

const nPlusOne = (n) => (n + 1) * (RTT_MS + QUERY_MS);

export const caption = `Every query in the loop is a network round trip, about half a millisecond inside one data centre, so the cost is the *count* times the latency and barely depends on how fast the queries are. At ${AT} rows that is ${nPlusOne(AT).toFixed(0)} ms of mostly waiting against about ${(RTT_MS + QUERY_MS + AT * 0.004).toFixed(1)} ms for a single join. It is also why an N+1 reads as "the database is slow" in a profile while every individual query in the log looks perfectly healthy.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 62,
    marginRight: 176,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Parent rows fetched", labelAnchor: "center", domain: [0, 500], ticks: 6 },
    y: { label: "Milliseconds", domain: [0, 500], ticks: 5 },
    marks: [
      Plot.line(rows.filter((d) => d.key.startsWith("One query")), {
        x: "n",
        y: "ms",
        stroke: ACCENT,
        strokeWidth: 2,
      }),
      Plot.line(rows.filter((d) => !d.key.startsWith("One query")), {
        x: "n",
        y: "ms",
        stroke: PRIMARY,
        strokeWidth: 2,
      }),
      Plot.ruleX([AT], { stroke: GUIDE, strokeDasharray: "4 3" }),
      Plot.dot([{}], { x: AT, y: nPlusOne(AT), fill: ACCENT, r: 4 }),
      Plot.text([{}], {
        x: 500,
        y: nPlusOne(500),
        text: () => "One query per row\n(the N+1)",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 500,
        y: 3,
        text: () => "One join, or one\nbatched IN (…)",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: AT,
        y: nPlusOne(AT),
        text: () => `${AT} rows: ${nPlusOne(AT).toFixed(0)} ms,\nalmost all of it waiting`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "end",
        dx: -12,
        dy: -8,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
