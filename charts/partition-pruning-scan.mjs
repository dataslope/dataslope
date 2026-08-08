/**
 * What partition pruning is worth, on the query shape a dashboard actually
 * sends.
 *
 * Warehouse billing is by bytes scanned, so the useful question is not "is the
 * table big?" but "how much of it does the planner have to touch?". On an
 * unpartitioned table the answer is always "all of it", whatever the `WHERE`
 * clause says. Partitioned by day, the planner drops whole files before
 * reading any of them, and the scan is proportional to the window the query
 * asked for.
 *
 * The curve therefore crosses the whole cost range within the first few days,
 * which is where nearly every dashboard query lives. The far right of the
 * chart is where the two designs converge: a query that genuinely reads three
 * years of history gets nothing from partitioning, and that case is the reason
 * "partition everything" is not the answer either.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Gigabytes scanned against the number of days a query filters to, on a table partitioned by day. The unpartitioned line is flat at the full table size; the partitioned line rises from almost nothing and only meets it at the full history.";

const DAYS = 365;
const GB_PER_DAY = 2.4;
const FULL = DAYS * GB_PER_DAY;
const TYPICAL = 7;

const rows = Array.from({ length: DAYS }, (_, i) => {
  const d = i + 1;
  return [
    { key: "No partitioning", d, gb: FULL },
    { key: "Partitioned by day", d, gb: d * GB_PER_DAY },
  ];
}).flat();

const SAVED = FULL / (TYPICAL * GB_PER_DAY);

export const caption = `A year of daily data at ${GB_PER_DAY} GB a day. Without partitions every query reads all ${FULL.toFixed(0)} GB, whatever its \`WHERE\` clause says; partitioned by day, the planner drops the files it does not need before reading them. The ${TYPICAL}-day window behind a typical dashboard tile scans about ${Math.round(SAVED)} times less, and you are billed on exactly that. The two designs only converge on the query that really does read the whole history, which is why the answer is "partition on the column your filters use", not "partition everything".`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 62,
    marginRight: 128,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Days the query filters to", labelAnchor: "center", domain: [0, DAYS], ticks: 6 },
    y: { label: "Gigabytes scanned", domain: [0, FULL * 1.1], ticks: 5 },
    marks: [
      Plot.line(rows.filter((r) => r.key === "No partitioning"), {
        x: "d",
        y: "gb",
        stroke: ACCENT,
        strokeWidth: 2,
      }),
      Plot.line(rows.filter((r) => r.key !== "No partitioning"), {
        x: "d",
        y: "gb",
        stroke: PRIMARY,
        strokeWidth: 2,
      }),
      Plot.ruleX([TYPICAL], { stroke: GUIDE, strokeDasharray: "4 3" }),
      Plot.dot([{}], { x: TYPICAL, y: TYPICAL * GB_PER_DAY, fill: PRIMARY, r: 4 }),
      Plot.text([{}], {
        x: DAYS,
        y: FULL * 0.22,
        text: () => `a ${TYPICAL}-day dashboard query scans\n${(TYPICAL * GB_PER_DAY).toFixed(0)} GB instead of ${FULL.toFixed(0)}`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "end",
        dx: -8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: DAYS,
        y: FULL,
        text: () => "No partitioning",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      // Labelled along its own line rather than at the right edge, where the
      // two series meet and the labels would sit on top of each other.
      Plot.text([{}], {
        x: DAYS * 0.62,
        y: DAYS * 0.62 * GB_PER_DAY,
        text: () => "Partitioned by day",
        fill: PRIMARY,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "end",
        dx: -6,
        dy: -10,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
