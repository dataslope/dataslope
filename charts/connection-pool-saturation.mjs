/**
 * Why adding connections stops helping, and then starts hurting.
 *
 * Throughput against pool size for a database with a fixed number of cores.
 * Up to about the core count each new connection is a new thing actually
 * executing. Past it, connections queue for the same CPUs and contend for the
 * same locks, so throughput flattens and then declines while latency climbs on
 * every one of them.
 *
 * This is the shape behind the advice that surprises people most: a pool of
 * ten often beats a pool of a hundred, and the fix for a saturated database is
 * usually a smaller pool rather than a larger one.
 *
 * The curve is a simple contention model (useful work rises to the core count,
 * then a coordination cost grows with the queue) rather than a benchmark, and
 * the caption says so. The peak is found by scanning it.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Throughput against connection-pool size for a database with sixteen cores: rising to a peak near the core count, then declining as connections contend, while latency climbs throughout.";

const CORES = 16;
const SIZES = Array.from({ length: 40 }, (_, i) => (i + 1) * 5);

const rows = SIZES.map((n) => {
  const executing = Math.min(n, CORES);
  // Coordination cost grows with the number of connections beyond the cores.
  const contention = 1 + 0.012 * Math.max(0, n - CORES);
  const throughput = executing / contention;
  return { n, throughput, latency: n / throughput };
});

const PEAK = rows.reduce((best, r) => (r.throughput > best.throughput ? r : best), rows[0]);
const BIG = rows.at(-1);
const LOSS = ((PEAK.throughput - BIG.throughput) / PEAK.throughput) * 100;

export const caption =
  `Only ${CORES} things can actually run at once. Up to there, each connection is real parallelism; past it they queue for the same cores and contend for the same locks. Throughput peaks around ${PEAK.n} and is ${LOSS.toFixed(0)}% lower at ${BIG.n}, while latency climbs the whole way. This is a contention model rather than a benchmark, but it is the shape behind the advice: the fix for a saturated database is usually a smaller pool.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 32,
    marginLeft: 30,
    marginRight: 96,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Connections in the pool", labelAnchor: "center", domain: [0, 200], ticks: 5 },
    y: { label: "Relative throughput", domain: [0, CORES * 1.15], ticks: 5 },
    marks: [
      Plot.areaY(rows, { x: "n", y: "throughput", fill: PRIMARY, fillOpacity: 0.13 }),
      Plot.line(rows, { x: "n", y: "throughput", stroke: PRIMARY, strokeWidth: 2 }),
      Plot.ruleX([CORES], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.dot([PEAK], { x: "n", y: "throughput", fill: ACCENT, r: 5 }),
      Plot.text([PEAK], {
        x: "n",
        y: "throughput",
        text: (d) => `peak at ${d.n} connections`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 10,
        dy: -10,
        ...HALO,
      }),
      Plot.text([{}], {
        x: CORES,
        y: 2,
        text: () => `${CORES} cores`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 6,
        ...HALO,
      }),
      Plot.text([BIG], {
        x: "n",
        y: "throughput",
        text: () => `${LOSS.toFixed(0)}% below the peak,\nfor 4x the connections`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        dy: -24,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
