/**
 * Why cache invalidation is hard, as one picture: the two things a TTL controls
 * move in opposite directions and there is no setting that makes both small.
 *
 * A cached entry lives for its TTL. Lengthen it and fewer reads have to go to
 * the database — but the entry has longer to be overtaken by a write, so more
 * reads are served something that is no longer true. Shorten it and the reverse.
 * The interview answer is usually given as a sentence ("too long and users see
 * stale data, too short and you lose the cache's benefit"); the sentence hides
 * that the *best case* is still bad, and the crossing point is where that shows.
 *
 * Both curves are shares of reads, which is what lets them share one axis. The
 * arithmetic is the standard back-of-the-envelope pair:
 *
 *   • one fetch per TTL window, so misses = 1 / (1 + reads × TTL);
 *   • writes arriving as a Poisson process, so the expected share of an entry's
 *     life spent stale is 1 − (1 − e^(−wT)) / (wT), which reads uniformly over
 *     that life sample.
 *
 * Neither is a measurement, and the caption says so. The shape is the claim,
 * not the decimals: one curve falls, the other rises, and where they meet is
 * the least bad a single TTL can do.
 */
import { linspace, Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Two curves against cache TTL on a logarithmic axis, both as a share of reads. The share of reads that miss the cache falls steeply as the TTL lengthens; the share served a value a write has already replaced climbs. They cross at about fifteen seconds, where both are around six per cent.";

/** Reads per second per key, and writes per second per key: a warm-ish key
 *  read about once a second and updated about every two minutes. */
const READS = 1;
const WRITES = 1 / 120;

const misses = (ttl) => 1 / (1 + READS * ttl);
const stale = (ttl) => 1 - (1 - Math.exp(-WRITES * ttl)) / (WRITES * ttl);

const TTLS = linspace(Math.log(1), Math.log(600), 160).map(Math.exp);
const rows = TTLS.map((ttl) => ({ ttl, miss: misses(ttl), stale: stale(ttl) }));

/** Where the two curves cross: the TTL at which the larger of the two failures
 *  is as small as a single TTL can make it. */
const CROSS = rows.reduce((best, r) =>
  Math.abs(r.miss - r.stale) < Math.abs(best.miss - best.stale) ? r : best,
);

const pct = (v) => `${(v * 100).toFixed(0)}%`;

export const caption = `Cache misses and stale reads against the TTL, for a key read about once a second and updated about every two minutes. They cross at roughly ${CROSS.ttl.toFixed(0)} seconds, and even there about ${pct(CROSS.miss)} of reads still go to the database and about ${pct(CROSS.stale)} come back out of date.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 30,
    marginLeft: 62,
    marginRight: 146,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      type: "log",
      label: "How long the cache holds a value (seconds)",
      labelAnchor: "center",
      domain: [1, 600],
      ticks: [1, 5, 30, 60, 300, 600],
      tickFormat: (d) => (d >= 60 ? `${d / 60} min` : `${d}s`),
    },
    y: {
      label: "Share of reads",
      domain: [0, 1],
      ticks: 5,
      tickFormat: (d) => `${Math.round(d * 100)}%`,
    },
    marks: [
      Plot.line(rows, { x: "ttl", y: "miss", stroke: PRIMARY, strokeWidth: 2, clip: true }),
      Plot.line(rows, { x: "ttl", y: "stale", stroke: ACCENT, strokeWidth: 2, clip: true }),
      Plot.ruleX([CROSS.ttl], { stroke: GUIDE, strokeWidth: 1.25, strokeDasharray: "4,3" }),
      Plot.dot([CROSS], { x: "ttl", y: "miss", fill: GUIDE, r: 4 }),
      Plot.text([CROSS], {
        x: "ttl",
        y: "miss",
        text: (d) =>
          `the best a single TTL can do:\nabout ${pct(d.miss)} of reads missing\nand ${pct(d.stale)} of them stale`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 12,
        dy: -166,
        ...HALO,
      }),
      Plot.text([rows.at(-1)], {
        x: "ttl",
        y: "stale",
        text: () => "reads answered with\na value a write has\nalready replaced",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([rows[0]], {
        x: "ttl",
        y: "miss",
        text: () => "reads that miss\nand hit the database",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        dy: -18,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
